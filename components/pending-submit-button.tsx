'use client'

import type { ButtonHTMLAttributes, ReactNode } from 'react'
import { useFormStatus } from 'react-dom'

type Props = ButtonHTMLAttributes<HTMLButtonElement> & {
  children: ReactNode
  pendingLabel?: string
}

export function PendingSubmitButton({
  children,
  pendingLabel = 'Menyimpan…',
  className,
  disabled,
  ...props
}: Props) {
  const { pending } = useFormStatus()

  return (
    <button
      {...props}
      type={props.type ?? 'submit'}
      className={`${className ?? ''}${pending ? ' is-pending' : ''}`.trim()}
      disabled={disabled || pending}
      aria-busy={pending}
    >
      {pending ? <><span className="button-spinner" aria-hidden />{pendingLabel}</> : children}
    </button>
  )
}
