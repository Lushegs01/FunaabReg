export type Role = "student" | "lecturer" | "admin" | "super_admin";

export type Permission =
  | "registration.read"
  | "registration.write"
  | "registration.verify"
  | "document.upload"
  | "attendance.write"
  | "result.write"
  | "result.approve"
  | "transcript.generate"
  | "fg_export.create"
  | "audit.read";

const rolePermissions: Record<Role, Permission[]> = {
  student: ["registration.read", "registration.write", "document.upload"],
  lecturer: ["attendance.write", "result.write"],
  admin: [
    "registration.read",
    "registration.verify",
    "attendance.write",
    "result.approve",
    "transcript.generate",
    "fg_export.create",
    "audit.read"
  ],
  super_admin: [
    "registration.read",
    "registration.write",
    "registration.verify",
    "document.upload",
    "attendance.write",
    "result.write",
    "result.approve",
    "transcript.generate",
    "fg_export.create",
    "audit.read"
  ]
};

export function hasPermission(roles: Role[], permission: Permission): boolean {
  return roles.some((role) => rolePermissions[role]?.includes(permission));
}
