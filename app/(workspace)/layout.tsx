import { AppShell } from '@/components/app-shell'
import { getAuthContext } from '@/lib/auth'
export default async function WorkspaceLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  const { user } = await getAuthContext()
  return <AppShell adminMode={Boolean(user)}>{children}</AppShell>
}
