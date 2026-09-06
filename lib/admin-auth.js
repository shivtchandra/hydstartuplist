/**
 * Server-only admin passcode. Prefer ADMIN_PASSCODE (Vercel Secret).
 * Falls back to NEXT_PUBLIC_ADMIN_PASSCODE for older deploys.
 */
export function getAdminPasscode() {
  return (
    process.env.ADMIN_PASSCODE ||
    process.env.NEXT_PUBLIC_ADMIN_PASSCODE ||
    ""
  );
}

export function checkAdminPasscode(req) {
  const expected = getAdminPasscode();
  const got = req.headers.get("x-admin-passcode") || "";
  return !!expected && got === expected;
}
