const slugifyHeading = (value) =>
  String(value || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^\w\s-]+/g, '')
    .trim()
    .replace(/\s+/g, '_')

export const parseHomeContent = (raw) => {
  const content = {
    hero: {},
    pillars: {},
    toolkit: {},
    join: {},
  }

  let currentSection = null
  let currentItem = null
  let currentField = null
  let buffer = []

  const flushBuffer = () => {
    const value = buffer.join('\n').trim()
    buffer = []
    if (!value || !currentSection || !currentField) return

    if (currentSection === 'pillars' && currentItem) {
      if (!content.pillars[currentItem]) content.pillars[currentItem] = {}
      content.pillars[currentItem][currentField] = value
      return
    }

    if (!content[currentSection]) content[currentSection] = {}
    content[currentSection][currentField] = value
  }

  String(raw || '')
    .split(/\r?\n/)
    .forEach((line) => {
      const headingMatch = line.match(/^(#{2,4})\s+(.+?)\s*$/)
      if (!headingMatch) {
        buffer.push(line)
        return
      }

      flushBuffer()

      const level = headingMatch[1].length
      const key = slugifyHeading(headingMatch[2])

      if (level === 2) {
        currentSection = key
        currentItem = null
        currentField = null
        return
      }

      if (level === 3) {
        if (currentSection === 'pillars') {
          currentItem = key
          currentField = null
          return
        }

        currentField = key
        return
      }

      if (level === 4) {
        currentField = key
      }
    })

  flushBuffer()

  return content
}
