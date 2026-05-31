import './globals.css';
import AppShell from '@/components/AppShell';
import { getServerUser } from '@/lib/serverAuth';

export const metadata = {
  title: 'Spendix',
  description: 'Personal finance tracker — budgets, transactions, insights.',
  icons: { icon: '/favicon.png' },
};

// Decode the session cookie server-side so the initial HTML already knows
// whether someone is signed in. AuthContext receives this as a prop and
// skips the /api/auth/me round-trip we used to do on every mount.
export default async function RootLayout({ children }) {
  const user = await getServerUser();
  const initialUser = user
    ? { name: user.name, email: user.email }
    : null;
  return (
    <html
      lang='en'
      data-bs-theme='dark'
      data-scroll-behavior='smooth'
    >
      <body>
        <AppShell initialUser={initialUser}>{children}</AppShell>
      </body>
    </html>
  );
}
