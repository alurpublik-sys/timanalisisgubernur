import { existsSync,readFileSync,readdirSync,statSync } from 'node:fs'
import { join,relative } from 'node:path'

const root=process.cwd(),failures=[]
function walk(dir){if(!existsSync(dir))return[];return readdirSync(dir).flatMap((name)=>{const full=join(dir,name);return statSync(full).isDirectory()?walk(full):[full]})}

const runtimeFiles=[...walk(join(root,'app')),...walk(join(root,'components')),...walk(join(root,'lib'))].filter((file)=>/\.(ts|tsx|js|mjs)$/.test(file))

for(const file of runtimeFiles){
  const source=readFileSync(file,'utf8')
  for(const[pattern,label]of[
    [/signInWithPassword/g,'Supabase email/password login'],
    [/\.auth\.(?:getUser|getSession|signIn|signOut|signUp)/g,'Supabase Auth runtime call'],
    [/SUPABASE_SECRET_KEY/g,'server Supabase secret-key dependency'],
    [/process\.env\.ADMIN_PIN/g,'environment PIN dependency'],
    [/Kinerja\s*&\s*Honor/g,'removed Kinerja & Honor label'],
  ]){
    pattern.lastIndex=0
    if(pattern.test(source))failures.push(`${label} found in ${relative(root,file)}`)
  }
}

for(const removed of[
  'app/kinerja/page.tsx','lib/kinerja.ts','lib/actions/kinerja.ts',
  'app/agenda/page.tsx','app/policy-brief/page.tsx','app/isu-strategis/page.tsx'
]) if(existsSync(join(root,removed))) failures.push(`removed feature artifact still exists: ${removed}`)

const shell=readFileSync(join(root,'components/app-shell.tsx'),'utf8')
if(shell.includes('requireUser')) failures.push('AppShell must not force a PIN session on public reading routes')

for(const publicPage of[
  'app/dashboard/page.tsx','app/kunjungan/page.tsx','app/media-monitor/page.tsx',
  'app/berani/page.tsx','app/referensi-konten/page.tsx','app/tim-analisis/page.tsx'
]){
  const source=readFileSync(join(root,publicPage),'utf8')
  if(source.includes("requireUser(")) failures.push(`${publicPage} must remain readable without PIN`)
}

const findings=readFileSync(join(root,'app/temuan-opd/page.tsx'),'utf8')
if(!findings.includes("requireUser('/temuan-opd')")) failures.push('Temuan OPD must require a validated PIN session')

const settings=readFileSync(join(root,'app/pengaturan/page.tsx'),'utf8')
if(!settings.includes('requireUser')) failures.push('Pengaturan must require a validated PIN session')

for(const actionFile of['lib/actions/core.ts','lib/actions/knowledge.ts','lib/actions/content-references.ts','lib/actions/settings.ts','lib/actions/notes.ts']){
  const source=readFileSync(join(root,actionFile),'utf8')
  if(!source.includes('requireActionUser')) failures.push(`${actionFile} must enforce admin PIN for mutations`)
}

const login=readFileSync(join(root,'app/login/route.ts'),'utf8')
if(!login.includes('[0-9]{5,8}')) failures.push('PIN login must accept the configured 5-8 digit format')
if(!login.includes('next')) failures.push('PIN login must return users to the requested protected feature')

const serverClient=readFileSync(join(root,'lib/supabase/server.ts'),'utf8')
if(!serverClient.includes('NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY')) failures.push('Supabase client must use a publishable key')
if(!serverClient.includes("headers['x-ah-session']")) failures.push('Supabase client must forward the PIN session header')

if(failures.length){
  console.error('Strategic team architecture verification failed:')
  for(const failure of failures)console.error(`- ${failure}`)
  process.exit(1)
}
console.log(`Strategic team public-read + PIN-protected-edit architecture verified across ${runtimeFiles.length} runtime files.`)
