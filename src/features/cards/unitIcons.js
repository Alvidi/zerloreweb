/**
 * Iconos de clase, en vectorial.
 *
 * Lienzo de 120 × 120. Todo son rellenos, no trazos, para que el grosor no cambie
 * al escalar y el PDF lo pinte igual que la pantalla. Marco, alas y galón son
 * comunes a todas las clases; solo cambia el emblema del centro.
 *
 * Reglas de encaje: el extremo interior de las alas está en x=40 y los emblemas
 * no pasan de x=44 ni de x=76 entre y=44 e y=85, así que siempre quedan 4
 * unidades de aire entre ala y emblema. El galón empieza en y=85.
 */

// Mismos colores que las variables --class-* de index.css.
export const CLASS_COLORS = {
  milicia: '#8a8a8a',
  alimanas: '#5fb3a1',
  hostigadores: '#9c86b6',
  infantes: '#3167b8',
  bastion: '#bf9e7c',
  paladin: '#7a95dd',
  explorador: '#7ca134',
  asaltante: '#f57aa4',
  monstruo: '#d41d1e',
  'vehiculo-ligero': '#fd7902',
  'vehiculo-pesado': '#c8a983',
  titan: '#808ed0',
  artilleria: '#96592c',
  'armas-pesadas': '#56c4fb',
  capitan: '#68a080',
  soporte: '#e05050',
  psiquico: '#ae4afb',
  heroe: '#e90c86',
  equipamiento: '#f1c636',
}

// Marco: cuadrado con esquinas a 45° y muescas en el centro de cada lado.
const FRAME = `<path fill-rule="evenodd" d="M18 4H102L116 18V102L102 116H18L4 102V18Z M20.5 9H99.5L111 20.5V99.5L99.5 111H20.5L9 99.5V20.5Z"/>
  <path d="M46 9H74L70 13H50Z"/><path d="M46 111H74L70 107H50Z"/>
  <path d="M9 46V74L13 70V50Z"/><path d="M111 46V74L107 70V50Z"/>`

const WING_LEFT = '<path d="M17 44L40 61V71L19.5 55.5Z"/><path d="M21 61L40 75V84.5L23.5 72Z"/>'
const WINGS = `${WING_LEFT}<g transform="translate(120 0) scale(-1 1)">${WING_LEFT}</g>`
const CHEVRON = '<path d="M46 85L60 95L74 85V92.5L60 102.5L46 92.5Z"/>'

/** Máscara para recortar huecos dentro de un emblema. */
const mask = (id, holes) => `<mask id="${id}"><rect width="120" height="120" fill="#fff"/><g fill="#000">${holes}</g></mask>`

/**
 * Sombrea la mitad derecha de una forma (el efecto de luz de la Milicia y el
 * Explorador): la misma forma, en negro translúcido, recortada a x ≥ 60.
 */
const shadeRight = (id, d) => `<clipPath id="${id}-half"><rect x="60" y="0" width="60" height="120"/></clipPath>
  <path clip-path="url(#${id}-half)" d="${d}" fill="#000" fill-opacity=".22"/>`

/** Estrella de puntas alternas (radios alternos). */
const star = (cx, cy, radii, points) => {
  const pts = []
  for (let i = 0; i < points * 2; i += 1) {
    const r = radii[i % radii.length]
    const a = -Math.PI / 2 + (Math.PI * i) / points
    pts.push(`${(cx + r * Math.cos(a)).toFixed(2)} ${(cy + r * Math.sin(a)).toFixed(2)}`)
  }
  return `M${pts.join('L')}Z`
}

/** Rueda dentada (equipamiento). */
const gear = (cx, cy, rOuter, rInner, teeth) => {
  const pts = []
  for (let i = 0; i < teeth * 2; i += 1) {
    const r = i % 2 === 0 ? rOuter : rInner
    const a0 = (Math.PI * 2 * i) / (teeth * 2) - Math.PI / (teeth * 2) * 0.55
    const a1 = (Math.PI * 2 * i) / (teeth * 2) + Math.PI / (teeth * 2) * 0.55
    pts.push(`${(cx + r * Math.cos(a0)).toFixed(2)} ${(cy + r * Math.sin(a0)).toFixed(2)}`)
    pts.push(`${(cx + r * Math.cos(a1)).toFixed(2)} ${(cy + r * Math.sin(a1)).toFixed(2)}`)
  }
  return `M${pts.join('L')}Z`
}

/** Anillo (corona circular) como un único trazado par-impar. */
const ring = (cx, cy, r, w) =>
  `M${cx - r} ${cy}a${r} ${r} 0 1 0 ${r * 2} 0a${r} ${r} 0 1 0 ${-r * 2} 0Z M${cx - r + w} ${cy}a${r - w} ${r - w} 0 1 1 ${(r - w) * 2} 0a${r - w} ${r - w} 0 1 1 ${-(r - w) * 2} 0Z`

const EMBLEMS = {
  // Escudo bajo una capucha hexagonal
  milicia: () => `
    <path fill-rule="evenodd" d="M42 50V38L60 26L78 38V50L73 46V40.6L60 32L47 40.6V46Z"/>
    <path d="M60 39L74.5 46V57C74.5 67 68.5 74 60 79C51.5 74 45.5 67 45.5 57V46Z"/>
    <path d="M60 39L74.5 46V57C74.5 67 68.5 74 60 79Z" fill="#000" fill-opacity=".22"/>`,

  // Cartucho: munición de tropa, con una sola franja de rango
  alimanas: (id) => `
    ${mask(id, '<rect x="52" y="62" width="16" height="3"/>')}
    <path mask="url(#${id})" d="M60 24C65.5 29 67 35 67 42V74H53V42C53 35 54.5 29 60 24Z"/>
    <rect x="50.5" y="76" width="19" height="5" rx="1"/>`,

  // Casco con visera en T y cresta
  hostigadores: (id) => `
    ${mask(id, '<path d="M47.5 52L60 58.5L72.5 52V57.5L63 62.5V75H57V62.5L47.5 57.5Z"/><rect x="58.8" y="24" width="2.4" height="26"/>')}
    <path mask="url(#${id})" d="M60 23L71 34L73.5 45L76 49V63L71.5 70.5L60 79L48.5 70.5L44 63V49L46.5 45L49 34Z"/>`,

  // Daga dentro de un hexágono abierto arriba y abajo
  infantes: (id) => `
    ${mask(id, '<rect x="55.5" y="20" width="9" height="12"/><rect x="55.5" y="72" width="9" height="12"/>')}
    <path mask="url(#${id})" fill-rule="evenodd" d="M60 25L76 37V67L60 79L44 67V37Z M60 30.6L71.5 39.2V64.8L60 73.4L48.5 64.8V39.2Z"/>
    <rect x="56" y="33.5" width="8" height="3.6" rx=".8"/>
    <rect x="57.4" y="38.4" width="5.2" height="4.4"/>
    <rect x="57.4" y="44" width="5.2" height="4.4"/>
    <path d="M51.5 50.5H68.5V53.6L66 55.6H54L51.5 53.6Z"/>
    <path d="M55.6 57H64.4L60.7 86H59.3Z"/>
    <path d="M59.6 58H60.4V80H59.6Z" fill="#000" fill-opacity=".35"/>`,

  // Torre almenada: la élite que aguanta el fuego
  bastion: (id) => `
    ${mask(id, '<path d="M55 79V67A5 5 0 0 1 65 67V79Z"/><rect x="58.5" y="47" width="3" height="10" rx="1"/>')}
    <path mask="url(#${id})" d="M44 28H52V34H56V28H64V34H68V28H76V44H73V79H47V44H44Z"/>`,

  // Espada larga con halo tras la empuñadura
  paladin: () => `
    <path fill-rule="evenodd" d="${ring(60, 37, 13, 3)}"/>
    <circle cx="60" cy="25.5" r="3.4"/>
    <rect x="57.6" y="28" width="4.8" height="16"/>
    <path d="M45 44.5H75V49H45Z"/>
    <path d="M55.5 50H64.5V76L60 84L55.5 76Z"/>
    <path d="M59.5 51H60.5V78H59.5Z" fill="#000" fill-opacity=".35"/>`,

  // Rosa de los vientos: llegar el primero a los objetivos
  explorador: () => `
    <path fill-rule="evenodd" d="${ring(60, 54, 14, 2.6)}"/>
    <path d="M60 26L64 50L76 54L64 58L60 82L56 58L44 54L56 50Z"/>
    <path d="M60 26L64 50L60 54Z M76 54L64 58L60 54Z M60 82L56 58L60 54Z M44 54L56 50L60 54Z" fill="#000" fill-opacity=".25"/>`,

  // Flecha hacia arriba con estela: salto y velocidad
  asaltante: () => `
    <path d="M60 25L76 43H67.5V60H52.5V43H44Z"/>
    <path d="M53.5 64H66.5L65 69H55Z"/>
    <path d="M55.5 73H64.5L63 78H57Z"/>`,

  // Cabeza con cuernos: la bestia, sea de leyenda o de otro mundo
  monstruo: (id) => {
    const horns = 'M51 50C45 46 41.5 38 43 26C46.5 34 50 39 56 44Z M69 50C75 46 78.5 38 77 26C73.5 34 70 39 64 44Z'
    const head = 'M50 48H70L66.5 65L60 74L53.5 65Z'
    return `
      ${mask(id, '<path d="M52.5 54L58 56.5V59L52.5 57.5Z"/><path d="M67.5 54L62 56.5V59L67.5 57.5Z"/>')}
      <path d="${horns}"/>
      <path mask="url(#${id})" d="${head}"/>
      ${shadeRight(id, `${horns} ${head}`)}`
  },

  // Rueda con radios
  'vehiculo-ligero': () => `
    <path fill-rule="evenodd" d="${ring(60, 54, 16, 4.6)}"/>
    <circle cx="60" cy="54" r="4.2"/>
    ${[0, 60, 120].map((a) => `<rect x="58.6" y="40" width="2.8" height="28" transform="rotate(${a} 60 54)"/>`).join('')}`,

  // Yunque: lo pesado, en cualquier época
  'vehiculo-pesado': (id) => {
    const anvil = 'M38 37H76V46H66C62.5 49 62 54 64 58L70 60V66H50V60L56 58C58 54 57.5 49 54 46H47C43 45 40 42 38 37Z M48 68H72L75 75H45Z'
    return `<path d="${anvil}"/>${shadeRight(id, anvil)}`
  },

  // Monolito tallado: lo colosal
  titan: (id) => {
    const outer = 'M60 23L73 36V68L60 82L47 68V36Z M60 28.6L69 37.6V66.4L60 76.4L51 66.4V37.6Z'
    const core = 'M60 36L64.5 42V62L60 68L55.5 62V42Z'
    return `<path fill-rule="evenodd" d="${outer}"/><path d="${core}"/>${shadeRight(id, 'M60 23L73 36V68L60 82L47 68V36Z')}`
  },

  // Estallido: fuego que cae de lejos
  artilleria: (id) => {
    const burst = star(60, 54, [19, 7.5, 13, 7.5], 8)
    return `
      ${mask(id, '<circle cx="60" cy="54" r="4.5"/>')}
      <path mask="url(#${id})" d="${burst}"/>
      ${shadeRight(id, burst)}`
  },

  // Andanada: tres puntas a la vez, fuego pesado de cualquier época
  'armas-pesadas': (id) => {
    const spikes = 'M60 23L65.5 36V77H54.5V36Z M49.5 37L54 46.5V77H45V46.5Z M70.5 37L75 46.5V77H66V46.5Z'
    const base = 'M44 79H76V83.5H44Z'
    return `<path d="${spikes} ${base}"/>${shadeRight(id, `${spikes} ${base}`)}`
  },

  // Estandarte colgado de una barra, centrado: el que forma las escuadras
  capitan: (id) => {
    const banner = 'M48 32H72V73L60 64.5L48 73Z'
    return `
      ${mask(id, '<path d="M60 38.5L62 44H67.8L63.1 47.4L64.9 52.9L60 49.5L55.1 52.9L56.9 47.4L52.2 44H58Z"/>')}
      <rect x="45" y="27" width="30" height="4" rx="1"/>
      <circle cx="44" cy="29" r="2.8"/><circle cx="76" cy="29" r="2.8"/>
      <path mask="url(#${id})" d="${banner}"/>
      ${shadeRight(id, banner)}`
  },

  // Cruz de socorro en un anillo
  soporte: () => `
    <path fill-rule="evenodd" d="${ring(60, 54, 16, 3.6)}"/>
    <path d="M56 42H64V50H72V58H64V66H56V58H48V50H56Z"/>`,

  // Ojo con rayos
  psiquico: (id) => `
    ${mask(id, '<circle cx="60" cy="58" r="6.5"/>')}
    <path mask="url(#${id})" d="M44 58Q60 40 76 58Q60 76 44 58Z"/>
    <circle cx="60" cy="58" r="2.8"/>
    <path d="M60 26L62.2 39H57.8Z"/>
    <path d="M46.5 31L54.5 42.5L51.6 44.5Z"/>
    <path d="M73.5 31L68.4 44.5L65.5 42.5Z"/>`,

  // Corona de tres puntas
  heroe: (id) => `
    ${mask(id, '<rect x="46" y="66" width="28" height="2.6"/>')}
    <path mask="url(#${id})" d="M44 45L52.5 58L60 37L67.5 58L76 45L73 74H47Z"/>
    <circle cx="44" cy="42" r="3"/><circle cx="60" cy="33.5" r="3"/><circle cx="76" cy="42" r="3"/>`,

  // Rueda dentada
  equipamiento: (id) => `
    ${mask(id, '<circle cx="60" cy="54" r="6.5"/>')}
    <path mask="url(#${id})" d="${gear(60, 54, 18, 13.5, 8)}"/>`,
}

/**
 * Contenido del icono (sin la etiqueta <svg>), para incrustarlo dentro de otro
 * SVG, como la carta. `idPrefix` evita choques entre máscaras de iconos distintos.
 */
export const unitIconMarkup = (token, { frame = true, color, idPrefix = 'ico' } = {}) => {
  const emblem = EMBLEMS[token]
  if (!emblem) return ''
  const fill = color || CLASS_COLORS[token] || '#c9a35c'
  return `<g fill="${fill}">${frame ? FRAME : ''}${WINGS}${CHEVRON}${emblem(`${idPrefix}-${token}`)}</g>`
}

export const unitIconSvg = (token, options = {}) => {
  const inner = unitIconMarkup(token, options)
  return inner ? `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 120 120">${inner}</svg>` : ''
}

const dataUrlCache = new Map()

/** El icono como data URL, para usarlo en un <img> igual que antes los PNG. */
export const unitIconDataUrl = (token, options = {}) => {
  const key = `${token}|${options.frame !== false}|${options.color || ''}`
  if (!dataUrlCache.has(key)) {
    const svg = unitIconSvg(token, options)
    dataUrlCache.set(key, svg ? `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}` : '')
  }
  return dataUrlCache.get(key)
}
