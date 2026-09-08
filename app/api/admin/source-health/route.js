import { checkAdminPasscode } from '../../../../lib/admin-auth.js';
import { NextResponse } from 'next/server';
import { getAdminDb } from '../../../../lib/firebaseAdmin.js';
export const dynamic = 'force-dynamic';

const USEFUL = {
  startups: ['detail', 'save', 'apply', 'company'],
  eateries: ['place_open', 'save', 'directions', 'call', 'stamp'],
  hub: ['layer_click', 'about_view', 'series_support', 'share'],
};

export async function GET(req) {
  if (!checkAdminPasscode(req)) return new NextResponse(null, { status: 401 });
  const db = await getAdminDb();
  if (!db) return NextResponse.json({ boards: [], enabled: false, funnel: {}, byProduct: {} });

  const productFilter = new URL(req.url).searchParams.get('product'); // startups | eateries | all
  const [boards, usage, sessions, seriesSnap] = await Promise.all([
    db.collection('board_status').get(),
    db.collection('background_usage').doc(new Date().toISOString().slice(0, 10)).get(),
    db.collection('engagement_sessions').where('started', '>=', Date.now() - 28 * 86400000).get(),
    db.doc('series_support/mapping-hyd').get().catch(() => null),
  ]);
  const seriesSupport = {
    count: seriesSnap?.exists ? Number(seriesSnap.data()?.count || 0) : 0,
  };

  const funnel = {};
  const byProduct = { startups: { landings: 0, useful: 0, apply: 0, sessions: 0 }, eateries: { landings: 0, useful: 0, apply: 0, sessions: 0 }, hub: { landings: 0, useful: 0, apply: 0, sessions: 0 } };

  for (const doc of sessions.docs) {
    const s = doc.data();
    if (s.events?.landing === undefined) continue;
    const product = s.product === 'eateries' ? 'eateries' : s.product === 'hub' ? 'hub' : 'startups';

    const usefulKeys = USEFUL[product] || USEFUL.startups;
    const isUseful = usefulKeys.some((e) => s.events[e] !== undefined);
    // apply for startups; directions/call as "exit" intent for eateries shown in apply column as convert
    const convert = product === 'eateries'
      ? (s.events.directions !== undefined || s.events.call !== undefined)
      : product === 'hub'
        ? (s.events.layer_click !== undefined || s.events.series_support !== undefined)
        : s.events.apply !== undefined;

    // Tab badges always show the full series — filter must not zero other products.
    const bp = byProduct[product];
    bp.sessions++;
    bp.landings++;
    if (isUseful) bp.useful++;
    if (convert) bp.apply++;

    if (productFilter && productFilter !== 'all' && productFilter !== product) continue;

    const key = [product, s.variant, s.device, s.source].join('/');
    const f = funnel[key] || { landings: 0, useful: 0, apply: 0, product };
    f.landings++;
    if (isUseful) f.useful++;
    if (convert) f.apply++;
    funnel[key] = f;
  }

  return NextResponse.json({
    boards: boards.docs.map((d) => {
      const b = d.data();
      return {
        boardId: b.boardId,
        lastSuccessAt: b.lastSuccessAt || null,
        overdue: !b.nextCheckAt || b.nextCheckAt < Date.now(),
        failures: b.failures || 0,
        error: b.error || null,
        activeJobs: b.activeJobs || 0,
        changes: b.changes || 0,
        durationMs: b.durationMs || null,
      };
    }),
    usage: usage.data() || {},
    funnel,
    byProduct,
    seriesSupport,
  });
}
