export type UserRole = 'basic' | 'admin' | 'guest';

export type User = {
  id: string;
  displayName: string;
  email: string;
  hasCompletedOnboarding: boolean;
  photoURL: string;
  role: UserRole;
  createdAt: Date;
  lastActive: Date;
};
