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
  [/NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY/g, 'public Supabase API key runtime dependency'],
  [/access-pending/g, 'legacy access-pending flow'],
]

for (const file of runtimeFiles) {
  const source = readFileSync(file, 'utf8')
  for (const [pattern, label] of forbiddenPatterns) {
    pattern.lastIndex = 0
    if (pattern.test(source)) failures.push(`${label} found in ${relative(root, file)}`)
  }
}

const serverClient = readFileSync(join(root, 'lib/supabase/server.ts'), 'utf8')
if (!serverClient.includes('SUPABASE_SECRET_KEY')) failures.push('server Supabase client must use SUPABASE_SECRET_KEY')
if (serverClient.includes('NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY')) failures.push('server client must not fall back to a public key')

const envExample = readFileSync(join(root, '.env.example'), 'utf8')
for (const required of ['SUPABASE_SECRET_KEY=', 'ADMIN_PIN=', 'AH_SESSION_SECRET=']) {
  if (!envExample.includes(required)) failures.push(`.env.example missing ${required}`)
}
if (/ADMIN_PIN=\d+/.test(envExample)) failures.push('literal admin PIN must never be committed')

const pkg = JSON.parse(readFileSync(join(root, 'package.json'), 'utf8'))
if (pkg.dependencies?.['@supabase/ssr']) failures.push('@supabase/ssr should not be installed in PIN-only architecture')

for (const actionFile of ['lib/actions/core.ts', 'lib/actions/kinerja.ts', 'lib/actions/settings.ts']) {
  const source = readFileSync(join(root, actionFile), 'utf8')
  if (!source.includes('requireActionUser')) failures.push(`${actionFile} must enforce the signed admin session`)
}

if (failures.length) {
  console.error('PIN-only architecture verification failed:')
  for (const failure of failures) console.error(`- ${failure}`)
  process.exit(1)
}

console.log(`PIN-only architecture verified across ${runtimeFiles.length} runtime files.`)
