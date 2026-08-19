import { createContext, useContext, useEffect, useMemo } from 'react'
import { translations } from './translations.js'

const I18nContext = createContext(null)

// El proyecto va solo en español hasta que el contenido esté cerrado; se
// mantiene el sistema de i18n en pie para que traducir sea solo añadir el
// paquete de idioma.
const DEFAULT_LANG = 'es'

function getByPath(obj, path) {
  return path.split('.').reduce((current, segment) => {
    if (!current || typeof current !== 'object') return undefined
    return current[segment]
  }, obj)
}

export function I18nProvider({ children }) {
  const lang = DEFAULT_LANG

  useEffect(() => {
    document.documentElement.lang = lang
  }, [lang])

  const value = useMemo(() => {
    const pack = translations[DEFAULT_LANG]
    const t = (path) => getByPath(pack, path) ?? path
    return { lang, t }
  }, [lang])

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>
}

// eslint-disable-next-line react-refresh/only-export-components
export function useI18n() {
  const ctx = useContext(I18nContext)
  if (!ctx) {
    throw new Error('useI18n must be used inside I18nProvider')
  }
  return ctx
}
