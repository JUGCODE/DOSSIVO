import { getCurrentUser } from './auth';
import { Workbench } from './workbench';

export const dynamic = 'force-dynamic';

export default async function Home({ language = 'zh' }: { language?: 'zh' | 'en' | 'it' }) {
  const user = await getCurrentUser();
  const guest = language === 'zh' ? '访客' : language === 'it' ? 'Visitatore' : 'Guest';
  const name = user ? user.fullName ?? user.email.split('@')[0] : guest;
  return <Workbench userName={name} initialLanguage={language} />;
}
