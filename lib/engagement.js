export const EVENTS=['landing','results','detail','save','apply','company','alert_confirmed','map_error'];
export function safeEvent(input) {
  if(!EVENTS.includes(input?.event)|| !/^[a-f0-9-]{36}$/.test(input?.session||'')) return null;
  return {event:input.event,session:input.session,variant:['new','control'].includes(input.variant)?input.variant:'new',
    device:['phone','tablet','desktop'].includes(input.device)?input.device:'desktop',
    source:['direct','search','social','other'].includes(input.source)?input.source:'other'};
}
