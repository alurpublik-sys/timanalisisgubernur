'use client'

import { useEffect, useRef } from 'react'

const INTERACTIVE = [
  'a',
  'button',
  'summary',
  '[role="button"]',
  '.stat-card',
  '.panel-head>a',
  '.finding-card',
  '.knowledge-dashboard-item',
  '.premium-reference-card',
  '.visit-mobile-card',
  '.media-mobile-card',
  '.sidebar nav a',
].join(',')

export function CursorFollower() {
  const ringRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const finePointer = window.matchMedia('(pointer:fine) and (hover:hover)')
    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)')
    if (!finePointer.matches || reducedMotion.matches) return

    const ring = ringRef.current
    if (!ring) return

    let mouseX = -100
    let mouseY = -100
    let currentX = -100
    let currentY = -100
    let raf = 0
    let visible = false
    let motionTarget: HTMLElement | null = null

    const render = () => {
      currentX += (mouseX - currentX) * 0.18
      currentY += (mouseY - currentY) * 0.18
      ring.style.transform = `translate3d(${currentX}px,${currentY}px,0) translate(-50%,-50%)`
      raf = window.requestAnimationFrame(render)
    }

    const onMove = (event: MouseEvent) => {
      mouseX = event.clientX
      mouseY = event.clientY
      if (!visible) {
        visible = true
        ring.classList.add('is-visible')
        currentX = mouseX
        currentY = mouseY
      }
      const target = event.target instanceof Element ? event.target : null
      ring.classList.toggle('is-interactive', Boolean(target?.closest(INTERACTIVE)))
      ring.classList.toggle('is-sidebar', Boolean(target?.closest('.sidebar,.mobile-shell-header,.mobile-drawer')))
      ring.classList.toggle('is-form', Boolean(target?.closest('input,select,textarea,[contenteditable="true"]')))

      const nextMotionTarget = target?.closest<HTMLElement>(
        '.stat-card,.finding-card,.knowledge-dashboard-item,.premium-reference-card,.reference-library-card,.command-priority-card,.quick-link-grid a,.visit-source-item,.media-mobile-card,.team-profile-card'
      ) ?? null
      if (motionTarget !== nextMotionTarget) {
        motionTarget?.classList.remove('motion-hover')
        motionTarget = nextMotionTarget
        motionTarget?.classList.add('motion-hover')
      }
      if (motionTarget) {
        const rect = motionTarget.getBoundingClientRect()
        motionTarget.style.setProperty('--pointer-x', `${event.clientX - rect.left}px`)
        motionTarget.style.setProperty('--pointer-y', `${event.clientY - rect.top}px`)
      }
    }

    const onLeave = () => {
      visible = false
      ring.classList.remove('is-visible','is-interactive','is-sidebar','is-form')
      motionTarget?.classList.remove('motion-hover')
      motionTarget = null
    }

    window.addEventListener('mousemove', onMove, { passive: true })
    document.documentElement.addEventListener('mouseleave', onLeave)
    raf = window.requestAnimationFrame(render)

    return () => {
      window.removeEventListener('mousemove', onMove)
      document.documentElement.removeEventListener('mouseleave', onLeave)
      window.cancelAnimationFrame(raf)
      motionTarget?.classList.remove('motion-hover')
    }
  }, [])

  return <div ref={ringRef} className="global-cursor-follower" aria-hidden />
}
