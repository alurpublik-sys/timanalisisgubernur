'use client'

import { useEffect, useRef } from 'react'

export function DashboardCursor() {
  const ringRef = useRef<HTMLDivElement>(null)
  const frameRef = useRef<number | null>(null)
  const pointRef = useRef({ x: 0, y: 0, target: null as Element | null })

  useEffect(() => {
    const finePointer = window.matchMedia('(pointer: fine) and (hover: hover)')
    if (!finePointer.matches) return

    const ring = ringRef.current
    if (!ring) return

    const onMove = (event: MouseEvent) => {
      pointRef.current = {
        x: event.clientX,
        y: event.clientY,
        target: event.target instanceof Element ? event.target : null,
      }
      if (frameRef.current !== null) return
      frameRef.current = window.requestAnimationFrame(() => {
        frameRef.current = null
        const { x, y, target } = pointRef.current
        ring.style.transform = `translate3d(${x}px,${y}px,0)`
        if (target?.closest('.dashboard-cursor-zone')) document.documentElement.classList.add('dashboard-pointer-live')
        else {
          document.documentElement.classList.remove('dashboard-pointer-live')
          ring.classList.remove('is-active')
        }
      })
    }

    const onWindowLeave = () => {
      document.documentElement.classList.remove('dashboard-pointer-live')
      ring.classList.remove('is-active')
    }

    const targets = Array.from(document.querySelectorAll<HTMLElement>(
      '.dashboard-cursor-zone .stat-card,.dashboard-cursor-zone .hero-actions a,.dashboard-cursor-zone .quick-link-grid a,.dashboard-cursor-zone .knowledge-dashboard-item,.dashboard-cursor-zone .panel-head>a'
    ))

    const enter = (event: Event) => {
      ring.classList.add('is-active')
      ;(event.currentTarget as HTMLElement).classList.add('cursor-target-active')
    }

    const leave = (event: Event) => {
      ring.classList.remove('is-active')
      ;(event.currentTarget as HTMLElement).classList.remove('cursor-target-active')
    }

    targets.forEach((target) => {
      target.addEventListener('mouseenter', enter)
      target.addEventListener('mouseleave', leave)
    })

    window.addEventListener('mousemove', onMove, { passive: true })
    document.documentElement.addEventListener('mouseleave', onWindowLeave)

    return () => {
      window.removeEventListener('mousemove', onMove)
      document.documentElement.removeEventListener('mouseleave', onWindowLeave)
      if (frameRef.current !== null) window.cancelAnimationFrame(frameRef.current)
      targets.forEach((target) => {
        target.removeEventListener('mouseenter', enter)
        target.removeEventListener('mouseleave', leave)
        target.classList.remove('cursor-target-active')
      })
      document.documentElement.classList.remove('dashboard-pointer-live')
    }
  }, [])

  return <div ref={ringRef} className="dashboard-cursor-ring" aria-hidden />
}
