import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs'
import { join, relative } from 'node:path'

const root = process.cwd()
const failures = []

const forbiddenFiles = [
  'app/access-pending/page.tsx',
  'lib/supabase/client.ts',
  'docs/ADMIN_BOOTSTRAP.md',
]
for (const file of forbiddenFiles) {
  if (existsSync(join(root, file))) failures.push(`obsolete Auth artifact still exists: ${file}`)
}

function walk(dir) {
  if (!existsSync(dir)) return []
  return readdirSync(dir).flatMap((name) => {
    const full = join(dir, name)
    return statSync(full).isDirectory() ? walk(full) : [full]
  })
}

const runtimeFiles = [
  ...walk(join(root, 'app')),
  ...walk(join(root, 'components')),
  ...walk(join(root, 'lib')),
  join(root, 'proxy.ts'),
].filter((file) => /\.(ts|tsx|js|mjs)$/.test(file) && existsSync(file))

const forbiddenPatterns = [
  [/signInWithPassword/g, 'Supabase email/password login'],
  [/createBrowserClient/g, 'browser Supabase client'],
  [/\.auth\.(?:getUser|getSession|signIn|signOut|signUp)/g, 'Supabase Auth runtime call'],
  [/access-pending/g, 'legacy access-pending flow'],
  [/SUPABASE_SECRET_KEY/g, 'server Supabase secret-key dependency'],
  [/AH_SESSION_SECRET/g, 'application session secret dependency'],
  [/process\.env\.ADMIN_PIN/g, 'environment-based admin PIN dependency'],
]

for (const file of runtimeFiles) {
  const source = readFileSync(file, 'utf8')
  for (const [pattern, label] of forbiddenPatterns) {
    pattern.lastIndex = 0
    if (pattern.test(source)) failures.push(`${label} found in ${relative(root, file)}`)
  }
}

const serverClient = readFileSync(join(root, 'lib/supabase/server.ts'), 'utf8')
if (!serverClient.includes('NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY')) failures.push('server client must use the Supabase publishable key')
if (!serverClient.includes("headers['x-ah-session']")) failures.push('server client must forward x-ah-session for database RLS')

const auth = readFileSync(join(root, 'lib/auth.ts'), 'utf8')
if (!auth.includes("rpc('ah_admin_session_check')")) failures.push('auth context must validate the database-managed session')

const pinAuth = readFileSync(join(root, 'lib/actions/pin-auth.ts'), 'utf8')
if (!pinAuth.includes("rpc('ah_admin_login'")) failures.push('PIN login must be verified by the database RPC')
if (!pinAuth.includes("rpc('ah_admin_logout')")) failures.push('logout must revoke the database session')

const envExample = readFileSync(join(root, '.env.example'), 'utf8')
for (const required of ['NEXT_PUBLIC_SUPABASE_URL=', 'NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=', 'APP_TIMEZONE=']) {
  if (!envExample.includes(required)) failures.push(`.env.example missing ${required}`)
}
for (const forbidden of ['SUPABASE_SECRET_KEY=', 'ADMIN_PIN=', 'AH_SESSION_SECRET=']) {
  if (envExample.includes(forbidden)) failures.push(`.env.example must not require ${forbidden}`)
}

const pkg = JSON.parse(readFileSync(join(root, 'package.json'), 'utf8'))
if (pkg.dependencies?.['@supabase/ssr']) failures.push('@supabase/ssr should not be installed in PIN-only architecture')

for (const actionFile of ['lib/actions/core.ts', 'lib/actions/kinerja.ts', 'lib/actions/settings.ts']) {
  const source = readFileSync(join(root, actionFile), 'utf8')
  if (!source.includes('requireActionUser')) failures.push(`${actionFile} must enforce the database-validated admin session`)
}

if (failures.length) {
  console.error('PIN-only architecture verification failed:')
  for (const failure of failures) console.error(`- ${failure}`)
  process.exit(1)
}

console.log(`Database-managed PIN architecture verified across ${runtimeFiles.length} runtime files.`)
