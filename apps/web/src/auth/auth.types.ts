export interface AuthUser {
  id: string;
  email: string;
}

export interface AuthState {
  user: AuthUser | null;
  loading: boolean; // true while the initial session is being restored
  error: string | null;
}
