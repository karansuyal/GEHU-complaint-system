import { cloneElement, useId, useRef, useState } from 'react'
import Icon from './Icon'

// Label + control + hint/error, wired together with real ids so screen readers
// announce the label and tapping the label focuses the input.
export function Field({ label, hint, error, children, className = '', labelExtra }) {
  const id = useId()
  const describedBy = error ? `${id}-err` : hint ? `${id}-hint` : undefined
  return (
    <div className={className}>
      <div className="flex items-center justify-between gap-2">
        <label htmlFor={id} className="field-label">
          {label}
        </label>
        {labelExtra}
      </div>
      {cloneElement(children, { id, 'aria-describedby': describedBy, 'aria-invalid': error ? true : undefined })}
      {error ? (
        <p id={`${id}-err`} role="alert" className="text-xs text-rust-600 mt-1.5">
          {error}
        </p>
      ) : hint ? (
        <p id={`${id}-hint`} className="text-xs text-ink-faint mt-1.5">
          {hint}
        </p>
      ) : null}
    </div>
  )
}

export function PasswordInput({ className = '', ...props }) {
  const [show, setShow] = useState(false)
  return (
    <div className="relative">
      <input
        {...props}
        type={show ? 'text' : 'password'}
        autoCapitalize="none"
        autoCorrect="off"
        spellCheck={false}
        className={`input-field !pr-12 ${className}`}
      />
      <button
        type="button"
        onClick={() => setShow((s) => !s)}
        aria-label={show ? 'Hide password' : 'Show password'}
        aria-pressed={show}
        className="absolute right-1 top-1/2 -translate-y-1/2 h-10 w-10 flex items-center justify-center rounded-md text-ink-faint hover:text-ink hover:bg-stone-100"
      >
        <Icon name={show ? 'eyeOff' : 'eye'} className="h-[18px] w-[18px]" />
      </button>
    </div>
  )
}

export function passwordStrength(pw) {
  let score = 0
  if (pw.length >= 8) score++
  if (pw.length >= 12) score++
  if (/[a-z]/.test(pw) && /[A-Z]/.test(pw)) score++
  if (/\d/.test(pw)) score++
  if (/[^A-Za-z0-9]/.test(pw)) score++
  const level = pw.length === 0 ? 0 : Math.min(4, Math.max(1, score - (pw.length < 8 ? 1 : 0)))
  return { level, label: ['', 'Weak', 'Fair', 'Good', 'Strong'][level] }
}

export function StrengthMeter({ password }) {
  const { level, label } = passwordStrength(password)
  if (!password) return null
  const color = ['', 'bg-rust-500', 'bg-brass-500', 'bg-pine-400', 'bg-pine-500'][level]
  return (
    <div className="mt-2" aria-live="polite">
      <div className="flex gap-1">
        {[1, 2, 3, 4].map((i) => (
          <span key={i} className={`h-1 flex-1 rounded-full transition-colors ${i <= level ? color : 'bg-stone-300'}`} />
        ))}
      </div>
      <p className="text-xs text-ink-faint mt-1">Password strength: {label}</p>
    </div>
  )
}

// Six visual boxes driven by ONE real input. That keeps SMS autofill
// (autocomplete="one-time-code"), paste and the numeric keypad working on
// every phone, which six separate inputs usually break.
export function OtpInput({ value, onChange, disabled, autoFocus = true, length = 6 }) {
  const ref = useRef(null)
  const [focused, setFocused] = useState(false)
  return (
    <div className="relative" onClick={() => ref.current?.focus()}>
      <div className="grid gap-2" style={{ gridTemplateColumns: `repeat(${length}, minmax(0, 1fr))` }} aria-hidden="true">
        {Array.from({ length }).map((_, i) => {
          const active = focused && i === Math.min(value.length, length - 1)
          return (
            <div
              key={i}
              className={`h-14 sm:h-16 rounded-md border bg-surface flex items-center justify-center font-display text-2xl text-ink transition-colors ${
                active ? 'border-pine-400 ring-4 ring-pine-400/15' : 'border-stone-300'
              } ${disabled ? 'opacity-60' : ''}`}
            >
              {value[i] || (active ? <span className="w-px h-6 bg-accent animate-pulse" /> : '')}
            </div>
          )
        })}
      </div>
      <input
        ref={ref}
        value={value}
        onChange={(e) => onChange(e.target.value.replace(/\D/g, '').slice(0, length))}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        inputMode="numeric"
        pattern="[0-9]*"
        autoComplete="one-time-code"
        autoFocus={autoFocus}
        disabled={disabled}
        maxLength={length}
        aria-label={`${length}-digit verification code`}
        className="absolute inset-0 h-full w-full opacity-0 cursor-text"
        style={{ fontSize: 16 }}
      />
    </div>
  )
}
