'use client'

import { useEffect, useRef } from 'react'

export function DashboardCursor() {
  const dotRef = useRef<HTMLDivElement>(null)
  const ringRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const finePointer = window.matchMedia('(pointer: fine) and (hover: hover)')
    if (!finePointer.matches) return

    let targetX = window.innerWidth / 2
    let targetY = window.innerHeight / 2
    let ringX = targetX
    let ringY = targetY
    let frame = 0

    const dot = dotRef.current
    const ring = ringRef.current
    if (!dot || !ring) return

    const onMove = (event: MouseEvent) => {
      targetX = event.clientX
      targetY = event.clientY
      dot.style.transform = `translate3d(${targetX}px,${targetY}px,0)`
      document.documentElement.classList.add('dashboard-pointer-live')
    }

    const animate = () => {
      ringX += (targetX - ringX) * 0.17
      ringY += (targetY - ringY) * 0.17
      ring.style.transform = `translate3d(${ringX}px,${ringY}px,0)`
      frame = requestAnimationFrame(animate)
    }

    const targets = Array.from(document.querySelectorAll<HTMLElement>(
      '.dashboard-cursor-zone a,.dashboard-cursor-zone button,.dashboard-cursor-zone .stat-card,.dashboard-cursor-zone .panel'
    ))

    const enter = (event: Event) => {
      ring.classList.add('is-active')
      const element = event.currentTarget as HTMLElement
      element.classList.add('cursor-target-active')
    }
    const leave = (event: Event) => {
      ring.classList.remove('is-active')
      const element = event.currentTarget as HTMLElement
      element.classList.remove('cursor-target-active')
    }

    targets.forEach((target) => {
      target.addEventListener('mouseenter', enter)
      target.addEventListener('mouseleave', leave)
    })
    window.addEventListener('mousemove', onMove, { passive: true })
    frame = requestAnimationFrame(animate)

    return () => {
      cancelAnimationFrame(frame)
      window.removeEventListener('mousemove', onMove)
      targets.forEach((target) => {
        target.removeEventListener('mouseenter', enter)
        target.removeEventListener('mouseleave', leave)
        target.classList.remove('cursor-target-active')
      })
      document.documentElement.classList.remove('dashboard-pointer-live')
    }
  }, [])

  return <>
    <div ref={ringRef} className="dashboard-cursor-ring" aria-hidden />
    <div ref={dotRef} className="dashboard-cursor-dot" aria-hidden />
  </>
}
