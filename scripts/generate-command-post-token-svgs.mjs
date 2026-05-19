import { mkdirSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const outputDir = join(__dirname, '..', 'src', 'images', 'tokens')

const tokens = [
  { size: 3, color: 'neutral', label: 'command-post-3-neutral' },
  { size: 3, color: 'red', label: 'command-post-3-red' },
  { size: 3, color: 'blue', label: 'command-post-3-blue' },
  { size: 3, color: 'green', label: 'command-post-3-green' },
  { size: 3, color: 'yellow', label: 'command-post-3-yellow' },
  { size: 6, color: 'neutral', label: 'command-post-6-neutral' },
  { size: 6, color: 'red', label: 'command-post-6-red' },
  { size: 6, color: 'blue', label: 'command-post-6-blue' },
  { size: 6, color: 'green', label: 'command-post-6-green' },
  { size: 6, color: 'yellow', label: 'command-post-6-yellow' },
]

const palettes = {
  neutral: {
    accent: '#aab0bc',
    outerGlow: '#d4d8e0',
    dashed: '#bcc2cb',
    centerFill: '#161b26',
  },
  red: {
    accent: '#db4e4e',
    outerGlow: '#ffcccc',
    dashed: '#ffb6b6',
    centerFill: '#2c1212',
  },
  blue: {
    accent: '#569aff',
    outerGlow: '#bddfff',
    dashed: '#aad4ff',
    centerFill: '#121c30',
  },
  green: {
    accent: '#49be6a',
    outerGlow: '#c6f6d2',
    dashed: '#aae8bb',
    centerFill: '#102618',
  },
  yellow: {
    accent: '#deb23f',
    outerGlow: '#ffecae',
    dashed: '#f6d886',
    centerFill: '#2c2210',
  },
}

const renderToken = ({ size, color }) => {
  const palette = palettes[color]
  const physicalSize = `${size}in`
  const center = 500
  const radius = 455

  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="${physicalSize}" height="${physicalSize}" viewBox="0 0 1000 1000" role="img" aria-label="${size} inch command post token ${color}">
  <metadata>
    token-type: command-post;
    token-diameter-in: ${size};
    token-color: ${color};
  </metadata>
  <defs>
    <radialGradient id="base" cx="50%" cy="42%" r="62%">
      <stop offset="0%" stop-color="${palette.accent}" stop-opacity="0.3"/>
      <stop offset="52%" stop-color="#1a202c" stop-opacity="0.42"/>
      <stop offset="100%" stop-color="#0a0c12"/>
    </radialGradient>
    <filter id="shadow" x="-10%" y="-10%" width="120%" height="120%">
      <feDropShadow dx="0" dy="8" stdDeviation="10" flood-color="#000000" flood-opacity="0.28"/>
    </filter>
  </defs>
  <circle cx="${center}" cy="${center}" r="${radius}" fill="url(#base)" stroke="${palette.accent}" stroke-width="42" filter="url(#shadow)"/>
  <circle cx="${center}" cy="${center}" r="390" fill="none" stroke="${palette.outerGlow}" stroke-width="14" opacity="0.85"/>
  <circle cx="${center}" cy="${center}" r="300" fill="none" stroke="${palette.dashed}" stroke-width="10" stroke-dasharray="24 32" opacity="0.8"/>
  <circle cx="${center}" cy="${center}" r="218" fill="${palette.centerFill}"/>
  <g transform="translate(250 346)" fill="#f5f1e3">
    <path d="M74 169h84l84-58 84 58h84L242 40 74 169Zm78 31h180v38H152v-38Zm-44 78h268v44H108v-44Z"/>
  </g>
</svg>
`
}

mkdirSync(outputDir, { recursive: true })

for (const token of tokens) {
  writeFileSync(join(outputDir, `${token.label}.svg`), renderToken(token))
}

console.log(`Generated ${tokens.length} command post token SVGs in ${outputDir}`)
