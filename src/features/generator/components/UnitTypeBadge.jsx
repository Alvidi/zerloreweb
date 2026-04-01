import { getUnitTypeToken } from '../generatorUtils.js'

export default function UnitTypeBadge({ type }) {
  const token = getUnitTypeToken(type)
  const iconProps = { viewBox: '0 0 24 24', className: 'unit-type-icon', 'aria-hidden': true }

  const renderIcon = () => {
    if (token === 'line') {
      return (
        <svg {...iconProps}>
          <path d="M5 18H19L17 7H7Z" />
          <path d="M9 7V5H15V7" />
        </svg>
      )
    }
    if (token === 'elite') {
      return (
        <svg {...iconProps}>
          <path d="M12 3L16 8L21 12L16 16L12 21L8 16L3 12L8 8Z" />
        </svg>
      )
    }
    if (token === 'vehicle') {
      return (
        <svg {...iconProps}>
          <rect x="4" y="8" width="16" height="8" rx="1" />
          <circle cx="8" cy="17.5" r="1.5" />
          <circle cx="16" cy="17.5" r="1.5" />
        </svg>
      )
    }
    if (token === 'monster') {
      return (
        <svg {...iconProps}>
          <path d="M5 20L8 9L11 15L14 8L17 14L19 6" />
        </svg>
      )
    }
    if (token === 'hero') {
      return (
        <svg {...iconProps}>
          <path d="M4 16L6 8L10 12L12 6L14 12L18 8L20 16Z" />
          <path d="M7 18H17" />
        </svg>
      )
    }
    if (token === 'titan') {
      return (
        <svg {...iconProps}>
          <rect x="7" y="4" width="10" height="16" />
          <path d="M10 8H14" />
          <path d="M10 12H14" />
          <path d="M10 16H14" />
        </svg>
      )
    }
    return (
      <svg {...iconProps}>
        <circle cx="12" cy="12" r="7" />
      </svg>
    )
  }

  return (
    <span className={`unit-type-badge unit-type-${token}`}>
      {renderIcon()}
      <span>{type}</span>
    </span>
  )
}
