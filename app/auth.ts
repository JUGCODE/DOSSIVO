// Server-side application identity boundary. The deployed provider remains Sites.
// Never derive userId from contact email, request JSON, cookies or query strings.
import { getChatGPTUser, chatGPTSignInPath, chatGPTSignOutPath } from './chatgpt-auth';
import { redirect } from 'next/navigation';
export type ApplicationUser = {
  userId: string;
  displayName: string;
  email: string;
  fullName: string | null;
};
export async function getCurrentUser(): Promise<ApplicationUser | null> {
  const user = await getChatGPTUser();
  if (!user) return null;
  // Preserve the existing stable actor ID byte-for-byte. This is not an email lookup.
  return {userId:user.userId, displayName:user.displayName, email:user.email, fullName:user.fullName};
}
export async function requireCurrentUser(returnTo: string): Promise<ApplicationUser> {
  const user = await getCurrentUser();
  if (user) return user;
  redirect(signInPath(returnTo));
}
export function signInPath(returnTo: string): string { return chatGPTSignInPath(returnTo); }
export function signOutPath(returnTo = '/'): string { return chatGPTSignOutPath(returnTo); }
