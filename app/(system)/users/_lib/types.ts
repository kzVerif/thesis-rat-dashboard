export type UserStatus = "ACTIVE" | "DISABLED" | "LOCKED";

export type User = {
  id: string;
  username: string;
  email: string | null;
  display_name: string | null;
  role_id: string;
  role: string;
  status: UserStatus;
  failed_login_attempts: number;
  locked_until: string | null;
  last_login_at: string | null;
  password_changed_at: string | null;
  created_at: string;
  updated_at: string;
};

export type UserInput = {
  username: string;
  email: string | null;
  display_name: string | null;
  role_id: string;
  status: UserStatus;
  password?: string;
};

export type UsersResponse = { users: User[] };
export type CreateUserResponse = { message: string; id: string };
export type RoleOption = {
  id: string;
  name: string;
  description: string | null;
};
export type RolesResponse = { roles: RoleOption[] };
export type UserActionResult<T = undefined> =
  | { ok: true; data: T }
  | { ok: false; error: string };
