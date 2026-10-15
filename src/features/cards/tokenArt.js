/**
 * Tokens de mesa en vectorial, con el mismo lenguaje que las cartas y los
 * iconos: disco oscuro con textura de hexágonos, aro del color del token y un
 * icono de relleno (sin trazos, para que se vea igual a cualquier tamaño).
 *
 * Lienzo de 200 × 200; el token se recorta por el aro exterior (r = 96).
 */

const NIGHT = '#0b0b0e'
const CREAM = '#f3e3bb'

export const TOKEN_COLORS = {
  vidas: '#d9473d',
  blue: '#4f8fe0',
  red: '#d9473d',
  green: '#5cc46a',
  yellow: '#e2b33c',
  gold: '#c9a35c',
  gray: '#9aa0aa',
}

const HEART = 'M16 28 L4.5 16.5 C1 13 1.5 6 8 5.2 C11.5 4.8 14.2 6.8 16 9.4 C17.8 6.8 20.5 4.8 24 5.2 C30.5 6 31 13 27.5 16.5Z'

/** Disco base: fondo, textura, aro de color y aro fino interior con muescas. */
const disc = (id, color, { glow = 0.18 } = {}) => `
  <defs>
    <pattern id="${id}-hex" width="22" height="38.1" patternUnits="userSpaceOnUse">
      <path d="M11 0 L22 6.35 V19.05 L11 25.4 L0 19.05 V6.35Z M11 25.4 V38.1 M0 19.05 L-11 25.4 M22 19.05 L33 25.4"
            fill="none" stroke="rgba(255,255,255,.07)" stroke-width="1.2"/>
    </pattern>
    <radialGradient id="${id}-glow" cx="50%" cy="42%" r="60%">
      <stop offset="0" stop-color="${color}" stop-opacity="${glow}"/>
      <stop offset="1" stop-color="${color}" stop-opacity="0"/>
    </radialGradient>
    <clipPath id="${id}-clip"><circle cx="100" cy="100" r="96"/></clipPath>
  </defs>
  <circle cx="100" cy="100" r="96" fill="${NIGHT}"/>
  <g clip-path="url(#${id}-clip)">
    <rect width="200" height="200" fill="url(#${id}-hex)"/>
    <rect width="200" height="200" fill="url(#${id}-glow)"/>
  </g>
  <circle cx="100" cy="100" r="92" fill="none" stroke="${color}" stroke-width="7"/>
  <circle cx="100" cy="100" r="81" fill="none" stroke="${color}" stroke-opacity=".45" stroke-width="1.6"/>
  ${[0, 90, 180, 270].map((a) => `<rect x="97" y="13" width="6" height="9" rx="1" fill="${color}" transform="rotate(${a} 100 100)"/>`).join('')}`

const svg = (inner) => `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 200">${inner}</svg>`

/** Vidas perdidas: corazón, la cifra y la palabra. */
export const livesTokenSvg = (amount, { id = `vidas-${amount}`, family = 'ZL Cinzel', labelFamily = 'ZL Rajdhani' } = {}) => {
  const color = TOKEN_COLORS.vidas
  const size = String(amount).length > 1 ? 56 : 64
  return svg(`${disc(id, color, { glow: 0.22 })}
    <g transform="translate(84 34) scale(1)" fill="${color}"><path d="${HEART}"/></g>
    <text x="100" y="${118 + size * 0.18}" text-anchor="middle" font-family="${family}" font-weight="700" font-size="${size}" fill="${CREAM}">−${amount}</text>
    <text x="100" y="166" text-anchor="middle" font-family="${labelFamily}" font-weight="700" font-size="17" letter-spacing="2.5" fill="${color}">${amount === 1 ? 'VIDA' : 'VIDAS'}</text>`)
}

/** Conquista: estandarte del equipo, el mismo del icono del Capitán. */
export const conquestTokenSvg = (team, { id = `conq-${team}` } = {}) => {
  const color = TOKEN_COLORS[team] || TOKEN_COLORS.gold
  const banner = 'M74 58H126V136L100 118L74 136Z'
  const star = 'M100 76L104.3 87.8H116.8L106.7 95.1L110.6 107L100 99.6L89.4 107L93.3 95.1L83.2 87.8H95.7Z'
  return svg(`${disc(id, color, { glow: 0.24 })}
    <mask id="${id}-star"><rect width="200" height="200" fill="#fff"/><path d="${star}" fill="#000"/></mask>
    <rect x="66" y="49" width="68" height="7" rx="2" fill="${color}"/>
    <circle cx="64" cy="52.5" r="5" fill="${color}"/><circle cx="136" cy="52.5" r="5" fill="${color}"/>
    <path d="${banner}" fill="${color}" mask="url(#${id}-star)"/>
    <clipPath id="${id}-half"><rect x="100" y="0" width="100" height="200"/></clipPath>
    <path d="${banner}" clip-path="url(#${id}-half)" fill="#000" fill-opacity=".22" mask="url(#${id}-star)"/>`)
}

/**
 * Puesto de mando: el mismo disco oscuro que el resto de tokens, con anillos de
 * medida y el logo de ZeroLore en blanco.
 */
export const commandPostSvg = (team, { id = `post-${team}`, logoHref = '' } = {}) => {
  const color = TOKEN_COLORS[team] || TOKEN_COLORS.gold
  return svg(`${disc(id, color, { glow: 0.2 })}
    <circle cx="100" cy="100" r="58" fill="none" stroke="${color}" stroke-opacity=".35" stroke-width="1.2" stroke-dasharray="4 4"/>
    ${[45, 135, 225, 315].map((a) => `<rect x="98" y="15" width="4" height="7" rx="1" fill="${color}" transform="rotate(${a} 100 100)"/>`).join('')}
    ${logoHref ? `<image href="${logoHref}" x="54" y="73" width="92" height="54" preserveAspectRatio="xMidYMid meet"/>` : ''}`)
}
