import { useEffect, useRef, useState } from 'react'

export default function CustomSelect({ value, onChange, options, disabled = false, t }) {
  const rootRef = useRef(null)
  const [open, setOpen] = useState(false)
  const selected = options.find((option) => option.value === value) || options[0]

  useEffect(() => {
    if (!open) return undefined
    const handlePointerDown = (event) => {
      if (rootRef.current && !rootRef.current.contains(event.target)) {
        setOpen(false)
      }
    }
    const handleEscape = (event) => {
      if (event.key === 'Escape') {
        setOpen(false)
      }
    }
    document.addEventListener('pointerdown', handlePointerDown)
    document.addEventListener('keydown', handleEscape)
    return () => {
      document.removeEventListener('pointerdown', handlePointerDown)
      document.removeEventListener('keydown', handleEscape)
    }
  }, [open])

  const handleSelect = (next) => {
    onChange(next)
    setOpen(false)
  }

  return (
    <div className={`custom-select${open ? ' open' : ''}${disabled ? ' disabled' : ''}`} ref={rootRef}>
      <button
        type="button"
        className="custom-select-trigger"
        onClick={() => setOpen((prev) => !prev)}
        disabled={disabled || options.length === 0}
      >
        <span>{selected?.label || t('generator.select')}</span>
      </button>
      {open && options.length > 0 && (
        <div className="custom-select-menu" role="listbox">
          {options.map((option) => (
            <button
              key={option.value}
              type="button"
              className={`custom-select-option${option.value === value ? ' active' : ''}${option.disabled ? ' disabled' : ''}`}
              onClick={() => {
                if (option.disabled) return
                handleSelect(option.value)
              }}
              role="option"
              aria-selected={option.value === value}
              disabled={option.disabled}
            >
              {option.label}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
