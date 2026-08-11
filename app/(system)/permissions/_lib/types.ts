export const ADMINISTRATOR_ROLE_ID = "be808ed9-e820-46a8-a0d9-b3d1dd2defa1";

export type Permission = {
  id: string;
  code: string;
  description: string | null;
  created_at: string;
};

export type Role = {
  id: string;
  name: string;
  description: string | null;
  permission_ids: string[];
  permissions: string[];
  created_at: string;
  updated_at: string;
};

export type RoleInput = {
  name: string;
  description: string | null;
  permission_ids: string[];
};

export type ActionResult<T = undefined> =
  | { ok: true; data: T }
  | { ok: false; error: string };
