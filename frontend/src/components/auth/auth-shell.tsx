import Image from 'next/image'

import { cn } from '@/lib/utils'

export function AuthShell({
  title,
  description,
  children,
  footer,
}: {
  title: string
  description: string
  children: React.ReactNode
  footer?: React.ReactNode
}) {
  return (
    <div className="flex min-h-dvh items-center justify-center bg-bg-page p-0 sm:p-5">
      <div className="w-full max-w-md overflow-hidden rounded-none bg-bg-shell shadow-sm sm:rounded-[32px]">
        <div className="bg-bg-panel-dark px-5 py-8 text-text-primary-inverse sm:px-8">
          <Image
            src="/latest-app-logo.png"
            alt="Chess N Mates crest"
            width={56}
            height={56}
            className="mb-3 h-14 w-auto object-contain"
            priority
          />
          <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-accent-gold">
            Chess-N-Mates
          </p>
          <h1 className="mt-3 text-2xl font-extrabold tracking-tight sm:text-3xl">{title}</h1>
          <p className="mt-2 text-sm text-white/55">{description}</p>
        </div>

        <div className="space-y-5 px-5 py-6 sm:px-8 sm:py-8">{children}</div>

        {footer ? (
          <div className="border-t border-border-subtle px-5 py-4 sm:px-8">{footer}</div>
        ) : null}
      </div>
    </div>
  )
}

export function AuthField({
  label,
  hint,
  children,
  className,
}: {
  label: string
  hint?: string
  children: React.ReactNode
  className?: string
}) {
  return (
    <div className={cn('space-y-2', className)}>
      <label className="block text-[13px] font-semibold text-text-primary">{label}</label>
      {children}
      {hint ? <p className="text-xs text-text-secondary">{hint}</p> : null}
    </div>
  )
}

export function AuthInput(props: React.ComponentProps<'input'>) {
  return (
    <input
      {...props}
      className={cn(
        'h-12 w-full rounded-xl border border-border-subtle bg-bg-panel-light px-4 text-[15px] font-medium text-text-primary outline-none transition-colors placeholder:text-text-secondary/70 focus:border-text-primary/25',
        props.className
      )}
    />
  )
}

export function AuthSegmented<T extends string>({
  value,
  onChange,
  options,
}: {
  value: T
  onChange: (value: T) => void
  options: Array<{ value: T; label: string }>
}) {
  return (
    <div className="grid grid-cols-2 gap-2 rounded-2xl bg-bg-panel-light p-1.5">
      {options.map((option) => {
        const active = option.value === value
        return (
          <button
            key={option.value}
            type="button"
            onClick={() => onChange(option.value)}
            className={cn(
              'rounded-xl px-3 py-2.5 text-sm font-semibold transition-colors',
              active
                ? 'bg-bg-panel-dark text-white'
                : 'text-text-secondary hover:text-text-primary'
            )}
          >
            {option.label}
          </button>
        )
      })}
    </div>
  )
}

export function AuthPrimaryButton({
  children,
  pending,
  ...props
}: React.ComponentProps<'button'> & { pending?: boolean }) {
  return (
    <button
      {...props}
      disabled={props.disabled || pending}
      className={cn(
        'inline-flex h-12 w-full items-center justify-center rounded-xl bg-accent-gold text-sm font-bold text-text-primary transition-opacity disabled:opacity-60',
        props.className
      )}
    >
      {children}
    </button>
  )
}
