'use client'

import { useEffect, useRef } from 'react'

export function DashboardCursor() {
  const ringRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const finePointer = window.matchMedia('(pointer: fine) and (hover: hover)')
    if (!finePointer.matches) return

    const ring = ringRef.current
    if (!ring) return

    const onMove = (event: MouseEvent) => {
      // Keep the halo locked to the browser cursor hotspot.
      // Smoothness comes from hover/size transitions, not positional lag.
      ring.style.transform = `translate3d(${event.clientX}px,${event.clientY}px,0)`
      document.documentElement.classList.add('dashboard-pointer-live')
    }

    const onWindowLeave = () => {
      document.documentElement.classList.remove('dashboard-pointer-live')
      ring.classList.remove('is-active')
    }

    const targets = Array.from(document.querySelectorAll<HTMLElement>(
      '.dashboard-cursor-zone a,.dashboard-cursor-zone button,.dashboard-cursor-zone .stat-card,.dashboard-cursor-zone .panel'
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
