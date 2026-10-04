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
        const response=await page.goto(route,{waitUntil:'networkidle'})
        expect(response?.status()).toBeLessThan(400)
        await expect(page.locator('body')).toBeVisible()
        const overflow=await page.evaluate(()=>document.documentElement.scrollWidth-window.innerWidth)
        expect(overflow).toBeLessThanOrEqual(2)
      })
    }
    test('Temuan OPD remains PIN protected',async({page})=>{
      await page.goto('/temuan-opd',{waitUntil:'networkidle'})
      await expect(page).toHaveURL(/\/login\?next=/)
      await expect(page.getByText('Masukkan PIN Admin')).toBeVisible()
    })
  })
}
