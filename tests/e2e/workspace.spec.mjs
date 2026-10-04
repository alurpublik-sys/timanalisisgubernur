import { test, expect } from '@playwright/test'
const routes=['/dashboard','/kunjungan','/renstra-opd','/media-monitor','/berani','/referensi-konten','/tim-analisis']
const viewports=[
  {name:'mobile-390',width:390,height:844},
  {name:'tablet-820',width:820,height:1180},
  {name:'desktop-1440',width:1440,height:1000},
]
for(const viewport of viewports){
  test.describe(viewport.name,()=>{
    test.use({viewport:{width:viewport.width,height:viewport.height}})
    for(const route of routes){
      test(`${route} renders without horizontal overflow`,async({page})=>{
        const response=await page.goto(route,{waitUntil:'domcontentloaded'})
        expect(response?.status()).toBeLessThan(400)
        await expect(page.locator('body')).toBeVisible({timeout:10_000})
        const overflow=await page.evaluate(()=>document.documentElement.scrollWidth-window.innerWidth)
        expect(overflow).toBeLessThanOrEqual(2)
      })
    }
    test('Temuan OPD remains PIN protected',async({page})=>{
      await page.goto('/temuan-opd',{waitUntil:'domcontentloaded'})
      await expect(page).toHaveURL(/\/login\?next=/)
      await expect(page.getByText('Masukkan PIN Admin')).toBeVisible()
    })
  })
}


test.describe('premium workspace interactions', () => {
  test('desktop keeps the native cursor and renders cursor follower separately', async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 1000 })
    await page.goto('/dashboard', { waitUntil: 'domcontentloaded' })
    const cursorValue = await page.locator('.dashboard-cursor-zone').evaluate((node) => getComputedStyle(node).cursor)
    expect(cursorValue).not.toContain('url(')
    await expect(page.locator('.global-cursor-follower')).toHaveCount(1)
    await expect(page.locator('.desktop-sidebar')).toBeVisible()
  })

  test('390 portrait uses an app-like drawer without overlapping the page', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 })
    await page.goto('/dashboard', { waitUntil: 'domcontentloaded' })
    await expect(page.locator('.desktop-sidebar')).toBeHidden()
    await expect(page.locator('.mobile-shell-header')).toBeVisible()
    await page.locator('.mobile-menu-trigger').click()
    await expect(page.locator('.mobile-drawer')).toBeVisible()
    const drawerBox = await page.locator('.mobile-drawer').boundingBox()
    expect(drawerBox?.width || 9999).toBeLessThanOrEqual(370)
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth)
    expect(overflow).toBeLessThanOrEqual(2)
  })

  test('820 portrait also uses mobile shell instead of a cramped sidebar rail', async ({ page }) => {
    await page.setViewportSize({ width: 820, height: 1180 })
    await page.goto('/dashboard', { waitUntil: 'domcontentloaded' })
    await expect(page.locator('.desktop-sidebar')).toBeHidden()
    await expect(page.locator('.mobile-shell-header')).toBeVisible()
  })
})


test.describe('final visual polish', () => {
  test('BERANI hero keeps statistics free from decorative arcs and cards use the briefing visual language', async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 1000 })
    await page.goto('/berani', { waitUntil: 'domcontentloaded' })
    const heroAfter = await page.locator('.knowledge-hero').evaluate((node) => getComputedStyle(node, '::after').display)
    expect(heroAfter).toBe('none')
    const card = page.locator('.berani-card').first()
    await expect(card).toBeVisible()
    const cardRadius = await card.evaluate((node) => getComputedStyle(node).borderRadius)
    expect(cardRadius).toBe('19px')
    const accentWidth = await card.evaluate((node) => getComputedStyle(node, '::before').width)
    expect(accentWidth).toBe('3px')
    await card.hover()
    await expect(card).toHaveClass(/motion-hover/)
  })

  test('reference cards use the same clean premium surface and remain readable', async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 1000 })
    await page.goto('/referensi-konten', { waitUntil: 'domcontentloaded' })
    const card = page.locator('.reference-library-card').first()
    await expect(card).toBeVisible()
    const radius = await card.evaluate((node) => getComputedStyle(node).borderRadius)
    expect(radius).toBe('19px')
    const accentWidth = await card.evaluate((node) => getComputedStyle(node, '::before').width)
    expect(accentWidth).toBe('3px')
  })

  test('desktop sidebar primary menu labels stay high contrast', async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 1000 })
    await page.goto('/dashboard', { waitUntil: 'domcontentloaded' })
    const color = await page.locator('.desktop-sidebar nav a').nth(1).evaluate((node) => getComputedStyle(node).color)
    const rgb = color.match(/\d+(?:\.\d+)?/g)?.slice(0, 3).map(Number) || [0, 0, 0]
    const brightness = (rgb[0] + rgb[1] + rgb[2]) / 3
    expect(brightness).toBeGreaterThan(190)
  })
})
