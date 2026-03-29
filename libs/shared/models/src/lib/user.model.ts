export interface User {
  id: number;
  githubId: number;
  username: string;
  avatarUrl: string | null;
}

export interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
}
