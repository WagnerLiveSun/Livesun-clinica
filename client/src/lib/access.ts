type PortalUser = { role?: string | null } | null | undefined;

export function canLoadClientPortal(user: PortalUser, loading: boolean) {
  if (loading || !user) return false;
  return user.role === "cliente" || user.role === "user";
}
