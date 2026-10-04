import { UserRole } from '@/types/enums'

/** Where each role's screens start. Notification links point inside these areas. */
export const ROLE_HOME: Record<UserRole, string> = {
  [UserRole.Boarder]: '/boarder',
  [UserRole.Owner]: '/owner',
  [UserRole.Caretaker]: '/caretaker',
  [UserRole.PlatformAdmin]: '/admin',
}

export function homeFor(role: UserRole | null | undefined): string {
  return role ? ROLE_HOME[role] : ROLE_HOME[UserRole.Boarder]
}
