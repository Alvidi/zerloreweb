import { createContext, useContext, useEffect, useMemo, useState } from 'react'
import { translations } from './translations.js'

const I18nContext = createContext(null)

const STORAGE_KEY = 'zerolore_lang'
const DEFAULT_LANG = 'en'

function getInitialLanguage() {
  const saved = localStorage.getItem(STORAGE_KEY)
  if (saved === 'es' || saved === 'en') return saved
  return DEFAULT_LANG
}

function getByPath(obj, path) {
  return path.split('.').reduce((current, segment) => {
    if (!current || typeof current !== 'object') return undefined
    return current[segment]
  }, obj)
}

export function I18nProvider({ children }) {
  const [lang, setLang] = useState(getInitialLanguage)

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, lang)
    document.documentElement.lang = lang
  }, [lang])

  const value = useMemo(() => {
    const t = (path) => {
      const currentPack = translations[lang] ?? translations[DEFAULT_LANG]
      const defaultPack = translations[DEFAULT_LANG]
      return getByPath(currentPack, path) ?? getByPath(defaultPack, path) ?? path
    }

    return { lang, setLang, t }
  }, [lang])

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>
}

export function useI18n() {
  const ctx = useContext(I18nContext)
  if (!ctx) {
    throw new Error('useI18n must be used inside I18nProvider')
  }
  return ctx
}
