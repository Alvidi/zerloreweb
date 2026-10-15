/**
 * Diagramas del reglamento.
 *
 * Se inyectan como SVG en línea dentro del markdown (ver getRulesAssetPlaceholders
 * en Reglamento.jsx), así que se editan aquí mismo cuando cambie una regla: no hay
 * que reexportar ninguna imagen.
 *
 * Reglas de la casa:
 * - Todo lo que se dibuja tiene que estar en el reglamento. Si el texto no lo dice,
 *   el diagrama no lo inventa.
 * - Vista cenital y peanas como círculos: el juego es agnóstico de miniaturas.
 * - Un caso por fila, a todo lo ancho. El viewBox mide lo que mide la columna de
 *   lectura, así que una unidad del dibujo es un píxel en pantalla y el texto se
 *   lee al tamaño al que se escribe.
 * - Los colores van como atributos, no por CSS, porque html2canvas serializa el SVG
 *   para el PDF y perdería cualquier hoja de estilos externa.
 */

const W = 760

const C = {
  act: '#d6be84',    // unidad activa / atacante
  enemy: '#c06b5e',  // rival
  ally: '#6f9fd8',   // aliada
  ok: '#7fbf6a',
  ko: '#c9584f',
  ink: '#e8e6e1',
  soft: '#a7b0c0',
  dim: '#e6c983',
}

const DEFS = `
  <pattern id="zl-grid" width="24" height="24" patternUnits="userSpaceOnUse">
    <path d="M24 0H0V24" fill="none" stroke="rgba(255,255,255,.05)"/>
  </pattern>
  <pattern id="zl-hatch" width="7" height="7" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
    <line x1="0" y1="0" x2="0" y2="7" stroke="rgba(255,255,255,.2)" stroke-width="3"/>
  </pattern>
  <marker id="zl-dim" viewBox="0 0 10 10" refX="5" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
    <path d="M0 0 L10 5 L0 10 z" fill="${C.dim}"/>
  </marker>
  <marker id="zl-shot" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
    <path d="M0 0 L10 5 L0 10 z" fill="${C.ink}"/>
  </marker>`

/** Peana vista desde arriba. */
const base = (x, y, color, r = 17) => `<g transform="translate(${x},${y})">
  <circle r="${r}" fill="#1b1d25" stroke="${color}" stroke-width="2.5"/>
  <circle r="${(r * 0.32).toFixed(1)}" fill="${color}"/></g>`

/** Posición de salida de un movimiento: la peana antes de moverse. */
const ghost = (x, y, r = 17) =>
  `<circle cx="${x}" cy="${y}" r="${r}" fill="none" stroke="${C.soft}" stroke-width="1.6" stroke-dasharray="4 4"/>`

const cap = (x, y, txt, color) =>
  `<text class="zl-mini" x="${x}" y="${y}" text-anchor="middle" fill="${color}">${txt}</text>`

/** Cota: nunca una flecha sin la medida escrita al lado. */
const dim = (x1, y1, x2, y2, txt, dy = -10) => `
  <line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="${C.dim}" stroke-width="1.2"
        stroke-dasharray="4 4" marker-start="url(#zl-dim)" marker-end="url(#zl-dim)"/>
  <text class="zl-dim" x="${(x1 + x2) / 2}" y="${(y1 + y2) / 2 + dy}" text-anchor="middle">${txt}</text>`

const wall = (x, y, w, h) =>
  `<rect x="${x}" y="${y}" width="${w}" height="${h}" fill="url(#zl-hatch)" stroke="rgba(255,255,255,.28)"/>`

const cross = (x, y, r = 11) => `
  <line x1="${x - r}" y1="${y - r}" x2="${x + r}" y2="${y + r}" stroke="${C.ko}" stroke-width="3"/>
  <line x1="${x + r}" y1="${y - r}" x2="${x - r}" y2="${y + r}" stroke="${C.ko}" stroke-width="3"/>`

/**
 * Una fila = un caso. Insignia y título arriba a la izquierda, dibujo debajo y la
 * explicación a la derecha. En vertical cada caso ocupa todo el ancho y se lee.
 */
const row = (y, h, { tone = 'plain', ok = null, num = null, title = '', lines = [], draw = '' }) => {
  const fill = tone === 'ok' ? 'rgba(127,191,106,.05)' : tone === 'ko' ? 'rgba(201,88,79,.05)' : 'rgba(255,255,255,.025)'
  const stroke = tone === 'ok' ? 'rgba(127,191,106,.28)' : tone === 'ko' ? 'rgba(201,88,79,.28)' : 'rgba(255,255,255,.08)'
  const col = ok === true ? C.ok : ok === false ? C.ko : C.act
  const badge = num !== null
    ? step(34, y + 30, num)
    : ok === null ? '' : `
    <circle cx="34" cy="${y + 30}" r="14" fill="${ok ? '#1d2a19' : '#2a1a18'}" stroke="${col}" stroke-width="2"/>
    <text class="zl-mini" x="34" y="${y + 35}" text-anchor="middle" fill="${col}">${ok ? 'SÍ' : 'NO'}</text>`
  const titleX = num === null && ok === null ? 22 : 58
  return `
    <rect x="0" y="${y}" width="${W}" height="${h}" rx="10" fill="${fill}" stroke="${stroke}"/>
    ${badge}
    <text class="zl-lab" x="${titleX}" y="${y + 36}" fill="${col}">${title}</text>
    ${lines.map((l, i) => `<text class="${l.cls || 'zl-body'}" x="400" y="${y + (draw ? 76 : 32) + i * 26}"${l.fill ? ` fill="${l.fill}"` : ''}>${l.t}</text>`).join('')}
    ${draw}`
}


/** Insignia numerada para secuencias reales (paso 1, 2, 3...). */
const step = (x, y, n) => `
  <circle cx="${x}" cy="${y}" r="14" fill="#231f14" stroke="${C.act}" stroke-width="2"/>
  <text class="zl-mini" x="${x}" y="${y + 5}" text-anchor="middle" fill="${C.act}">${n}</text>`

/** Pastilla con una etiqueta: valores, estados, fases. */
const chip = (x, y, w, txt, color = C.act, h = 34) => `
  <rect x="${x}" y="${y}" width="${w}" height="${h}" rx="8" fill="rgba(255,255,255,.04)" stroke="${color}"/>
  <text class="zl-lab" x="${x + w / 2}" y="${y + h / 2 + 5}" text-anchor="middle" fill="${color}">${txt}</text>`

/** Vista de perfil: solo para lo que pasa en altura. */
const ground = (x1, x2, y) =>
  `<line x1="${x1}" y1="${y}" x2="${x2}" y2="${y}" stroke="rgba(255,255,255,.25)" stroke-width="2"/>`

const pawn = (x, y, color, h = 26) => `
  <rect x="${x - 9}" y="${y - h}" width="18" height="${h}" rx="6" fill="#1b1d25" stroke="${color}" stroke-width="2.5"/>
  <circle cx="${x}" cy="${y - h + 7}" r="3.2" fill="${color}"/>`

/** Banda corta: etiqueta y texto en la misma línea, sin dibujo. */
/**
 * Banda corta: etiqueta y texto en la misma línea. El texto arranca en x=250 y
 * solo le quedan ~510 unidades hasta el borde, así que si no cabe se parte en
 * dos renglones en vez de salirse del viewBox y verse cortado.
 */
const NOTE_TEXT_X = 250
const NOTE_MAX_CHARS = 62

const splitNoteText = (text) => {
  const value = String(text || '')
  if (value.length <= NOTE_MAX_CHARS) return [value]

  const words = value.split(' ')
  const lines = ['', '']
  let index = 0
  words.forEach((word) => {
    const candidate = lines[index] ? `${lines[index]} ${word}` : word
    if (index === 0 && candidate.length > NOTE_MAX_CHARS) index = 1
    lines[index] = lines[index] ? `${lines[index]} ${word}` : word
  })
  return lines.filter(Boolean)
}

const note = (y, title, text) => {
  const lines = splitNoteText(text)
  const firstY = lines.length > 1 ? y + 23 : y + 32
  return `
  <rect x="0" y="${y}" width="${W}" height="52" rx="10" fill="rgba(255,255,255,.025)" stroke="rgba(255,255,255,.08)"/>
  <text class="zl-lab" x="22" y="${y + 32}">${title}</text>
  ${lines.map((line, index) => `<text class="zl-body" x="${NOTE_TEXT_X}" y="${firstY + index * 19}">${line}</text>`).join('')}`
}

/**
 * El markdown corta un bloque HTML en cuanto encuentra una línea en blanco, así que
 * el SVG se emite en una sola línea. Arriba se escribe con saltos para poder leerlo.
 */
const oneLine = (html) => html.replace(/\s*\n\s*/g, ' ').trim()

const figure = (title, alt, height, body) => oneLine(`<figure class="rules-diagram">
<svg viewBox="0 0 ${W} ${height}" role="img" aria-label="${alt}">
  <defs>${DEFS}</defs>
  <rect width="${W}" height="${height}" fill="url(#zl-grid)"/>
  ${body}
</svg>
<figcaption>${title}</figcaption>
</figure>`)

const head = (title, sub) => `
  <text class="zl-step" x="0" y="24">${title}</text>
  <text class="zl-body" x="0" y="52" fill="${C.soft}">${sub}</text>`

/* ── Coherencia de escuadra ─────────────────────────────────────────────────
   "cada miniatura de una escuadra debe mantenerse a 1" o menos de al menos otra
   miniatura de la misma escuadra... en línea, en cuña o agrupada."            */
const squadCoherence = figure(
  'Coherencia de escuadra',
  'Formaciones válidas de una escuadra y un caso con la cadena rota',
  728,
  `
  ${head('Coherencia de escuadra', 'Cada miniatura a 1" o menos de otra, y alguna a 1" o menos del Capitán.')}

  ${row(76, 124, {
    tone: 'ok', ok: true, title: 'En línea',
    lines: [{ t: 'Mientras cada eslabón mida 1" o menos,' }, { t: 'la cadena aguanta.' }],
    draw: `${base(70, 148, C.act)}${[1, 2, 3].map((i) => base(70 + i * 48, 148, C.ally)).join('')}
      ${[0, 1, 2].map((i) => `<line x1="${87 + i * 48}" y1="148" x2="${101 + i * 48}" y2="148" stroke="${C.ally}" stroke-width="1.6" stroke-dasharray="3 3"/>`).join('')}
      ${cap(70, 185, 'Capitán', C.act)}
      <text class="zl-dim" x="180" y="185" text-anchor="middle">cada enlace ≤ 1"</text>`,
  })}

  ${row(212, 136, {
    tone: 'ok', ok: true, title: 'En cuña',
    lines: [{ t: 'La formación es libre: la regla solo' }, { t: 'pide que nadie quede suelto.' }],
    draw: `${base(142, 262, C.ally)}${base(100, 300, C.ally)}${base(184, 300, C.ally)}${base(142, 324, C.ally)}
      <line x1="130" y1="275" x2="115" y2="288" stroke="${C.ally}" stroke-width="1.6" stroke-dasharray="3 3"/>
      <line x1="154" y1="275" x2="169" y2="288" stroke="${C.ally}" stroke-width="1.6" stroke-dasharray="3 3"/>
      <line x1="115" y1="311" x2="128" y2="318" stroke="${C.ally}" stroke-width="1.6" stroke-dasharray="3 3"/>`,
  })}

  ${row(360, 140, {
    tone: 'ok', ok: true, title: 'Agrupada',
    lines: [{ t: 'En línea, en cuña o agrupada:' }, { t: 'las tres valen.' }],
    draw: `${base(150, 424, C.ally)}${base(190, 424, C.ally)}${base(150, 464, C.ally)}${base(190, 464, C.ally)}
      <line x1="167" y1="424" x2="173" y2="424" stroke="${C.ally}" stroke-width="1.6" stroke-dasharray="3 3"/>
      <line x1="150" y1="441" x2="150" y2="447" stroke="${C.ally}" stroke-width="1.6" stroke-dasharray="3 3"/>`,
  })}

  ${row(512, 132, {
    tone: 'ko', ok: false, title: 'Cadena rota',
    lines: [{ t: 'Esa miniatura no está a 1" o menos' }, { t: 'de ninguna otra de su escuadra.' }],
    draw: `${base(200, 580, C.ally)}${base(238, 580, C.ally)}
      <line x1="217" y1="580" x2="221" y2="580" stroke="${C.ally}" stroke-width="1.6" stroke-dasharray="3 3"/>
      ${base(360, 580, C.ally)}
      ${dim(256, 580, 342, 580, 'más de 1"')}`,
  })}

  ${note(660, 'Y el Capitán', 'Al menos una miniatura de la escuadra tiene que estar a 1" o menos de él.')}`,
)

/* ── Línea de visión ────────────────────────────────────────────────────────
   "tiene línea de visión si puede ver cualquier parte de la miniatura objetivo";
   "la escenografía de bloqueo, aunque asome parte de la miniatura, y otra
   miniatura, aliada o enemiga, que tape por completo al objetivo".           */
const lineOfSight = figure(
  'Línea de visión: visible, bloqueada por escenografía y bloqueada por otra miniatura',
  'Tres casos de línea de visión',
  576,
  `
  ${head('Línea de visión', 'Las unidades ven en 360°: la orientación de la miniatura no limita nada.')}

  ${row(76, 132, {
    tone: 'ok', ok: true, title: 'Se ve una parte',
    lines: [{ t: 'Basta con ver cualquier parte del objetivo.' }, { t: 'Puede ser atacado a distancia.', cls: 'zl-lab', fill: C.ok }],
    draw: `${base(66, 158, C.act)}${cap(66, 192, 'Atacante', C.act)}
      ${wall(158, 122, 24, 58)}
      ${base(286, 158, C.enemy)}${cap(286, 192, 'Objetivo', C.enemy)}
      <line x1="83" y1="152" x2="266" y2="144" stroke="${C.ink}" stroke-width="1.8" marker-end="url(#zl-shot)"/>`,
  })}

  ${row(220, 132, {
    tone: 'ko', ok: false, title: 'Escenografía de bloqueo',
    lines: [{ t: 'Corta la visión aunque asome una parte.' }, { t: 'No puede ser atacado.', cls: 'zl-lab', fill: C.ko }],
    draw: `${base(66, 302, C.act)}${cap(66, 336, 'Atacante', C.act)}
      ${wall(158, 262, 32, 84)}
      ${base(300, 302, C.enemy)}${cap(300, 336, 'Objetivo', C.enemy)}
      <line x1="83" y1="302" x2="152" y2="302" stroke="${C.ko}" stroke-width="1.8" stroke-dasharray="5 4"/>
      ${cross(174, 302)}`,
  })}

  ${row(364, 132, {
    tone: 'ko', ok: false, title: 'La tapa otra miniatura',
    lines: [{ t: 'Una miniatura aliada o enemiga que bloquee' }, { t: 'por completo cuenta igual que un muro.' }],
    draw: `${base(66, 446, C.act)}${cap(66, 480, 'Atacante', C.act)}
      ${base(186, 446, C.ally)}${cap(186, 480, 'Aliada', C.ally)}
      ${base(306, 446, C.enemy)}${cap(306, 480, 'Objetivo', C.enemy)}
      <line x1="83" y1="446" x2="162" y2="446" stroke="${C.ko}" stroke-width="1.8" stroke-dasharray="5 4"/>
      ${cross(186, 412, 9)}`,
  })}

  ${note(512, 'Una excepción', 'Fuego indirecto: la Artillería ataca sin línea de visión.')}`,
)

/* ── Cargar ─────────────────────────────────────────────────────────────────
   "elige la unidad enemiga a la que carga y después tira 1D6: puede desplazarse
   hasta su Movimiento + el resultado"; "Si alcanza al objetivo... lo ataca con su
   arma de cuerpo a cuerpo. Si no llega, se queda donde haya llegado"; "Después se
   separa 1" del defensor y su activación termina".
   El ejemplo (Movimiento 5", un 3 en el dado, enemigo a 6") es el del reglamento. */
const charge = figure(
  'Cargar: tirar, llegar, atacar y separarse',
  'Una carga que llega, ataca y se aparta, y otra que se queda corta',
  664,
  `
  ${head('Cargar', 'Elige el objetivo, tira 1D6 y mueve hasta Movimiento + el resultado.')}

  ${row(76, 140, {
    num: '1', title: 'Tira 1D6 y mueve',
    lines: [{ t: 'Movimiento 5" + un 3 en el dado = 8"' }, { t: 'El objetivo está a 6": llega.', cls: 'zl-lab' }],
    draw: `${base(66, 172, C.act)}${cap(66, 208, 'Carga', C.act)}
      ${base(320, 172, C.enemy)}${cap(320, 208, 'Objetivo', C.enemy)}
      <line x1="85" y1="172" x2="300" y2="172" stroke="${C.act}" stroke-width="2.5" marker-end="url(#zl-shot)"/>
      ${dim(66, 142, 320, 142, 'Objetivo a 6"')}`,
  })}

  ${row(228, 132, {
    num: '2', title: 'Llega: ataca',
    lines: [{ t: 'Ataca con su arma cuerpo a cuerpo' }, { t: 'siguiendo la Secuencia de ataque.' }],
    draw: `${base(160, 306, C.act)}${base(194, 306, C.enemy)}
      ${cap(177, 344, 'en contacto', C.act)}`,
  })}

  ${row(372, 132, {
    num: '3', title: 'Se separa 1"',
    lines: [{ t: 'Después se aparta 1" y su activación' }, { t: 'termina. Nadie se queda enganchado.' }],
    draw: `${base(120, 450, C.act)}${base(214, 450, C.enemy)}
      ${dim(137, 450, 197, 450, '1"', -12)}
      ${cap(167, 488, 'combate terminado', C.soft)}`,
  })}

  ${row(516, 132, {
    tone: 'ko', ok: false, title: 'No llega',
    lines: [{ t: 'Se queda donde haya llegado y su' }, { t: 'activación termina, sin atacar.', cls: 'zl-lab', fill: C.ko }],
    draw: `${base(130, 594, C.act)}${base(270, 594, C.enemy)}
      ${dim(149, 594, 251, 594, 'no alcanza', -12)}
      ${cap(130, 632, 'se queda aquí', C.ko)}`,
  })}`,
)
/* ── Cobertura ──────────────────────────────────────────────────────────────
   Escenografía de cobertura: "la peana en contacto con el elemento, y este tiene
   que quedar entre ella y el atacante"; "una escuadra se beneficia si la mitad
   o más de sus integrantes están en ella".                                   */
const cover = figure(
  'Cuándo hay cobertura y cuándo no',
  'Tres casos de cobertura',
  768,
  `
  ${head('Escenografía de cobertura', 'Hacen falta dos cosas: peana en contacto con el elemento y que el elemento se interponga.')}

  ${row(76, 132, {
    tone: 'ok', ok: true, title: 'Hay cobertura',
    lines: [
      { t: 'Defensa 4+ → 3+.', cls: 'zl-lab', fill: C.ok },
      { t: 'A distancia y cuerpo a cuerpo.' },
    ],
    draw: `${base(66, 158, C.act)}${cap(66, 192, 'Atacante', C.act)}
      ${wall(236, 122, 22, 58)}
      ${base(276, 158, C.enemy)}${cap(276, 192, 'Objetivo', C.enemy)}
      <line x1="83" y1="154" x2="254" y2="146" stroke="${C.ink}" stroke-width="1.8" marker-end="url(#zl-shot)"/>`,
  })}

  ${row(220, 132, {
    tone: 'ko', ok: false, title: 'Sin contacto de peana',
    lines: [{ t: 'Si la peana no toca el elemento,' }, { t: 'no hay cobertura.', cls: 'zl-lab', fill: C.ko }],
    draw: `${base(66, 302, C.act)}${cap(66, 336, 'Atacante', C.act)}
      ${wall(190, 266, 22, 58)}
      ${base(306, 302, C.enemy)}${cap(306, 336, 'Objetivo', C.enemy)}
      ${dim(214, 302, 287, 302, 'separada', -12)}`,
  })}

  ${row(364, 132, {
    tone: 'ko', ok: false, title: 'No queda en medio',
    lines: [
      { t: 'Si el elemento no está entre ella y el' },
      { t: 'atacante, no hay cobertura.' },
    ],
    draw: `${base(66, 452, C.act)}${cap(66, 486, 'Atacante', C.act)}
      ${base(300, 452, C.enemy)}${cap(300, 416, 'Objetivo', C.enemy)}
      ${wall(319, 432, 22, 40)}
      <line x1="83" y1="452" x2="280" y2="452" stroke="${C.ink}" stroke-width="1.8" marker-end="url(#zl-shot)"/>`,
  })}

  ${note(512, 'Quién no la tiene', 'Las unidades de rol Pesado y Fuego pesado nunca la tienen.')}

  ${note(576, 'Escuadras', 'Tienen cobertura si la mitad o más de sus integrantes están en ella.')}

  ${note(640, 'Certera', 'Las armas con Certera la ignoran: el objetivo no mejora su Defensa.')}

  ${note(704, 'Atrincherado', 'Los Hostigadores en cobertura mejoran en 1 la Precisión al disparar.')}`,
)

/* ── Control de un puesto de mando ──────────────────────────────────────────
   "Si solo hay unidades de un jugador, lo controla ese jugador. Si hay unidades
   de ambos, lo controla el que sume más Valor"; "Si no hay ninguna unidad, o hay
   empate, el puesto sigue siendo de quien lo tuviera"; Pesado y Fuego pesado no
   aportan Valor.                                                               */
const commandPost = figure(
  'Cómo se decide el control de un puesto de mando',
  'Qué cuenta como estar dentro y cálculo del control por Valor',
  668,
  `
  ${head('Control de un puesto de mando · al final del turno', 'Lo controla quien sume más Valor en él.')}

  ${row(76, 150, {
    tone: 'plain', ok: null, title: 'Qué cuenta como estar dentro',
    lines: [
      { t: 'La mitad o más de la peana en su área.' },
      { t: 'Una escuadra suma a quienes estén dentro.' },
    ],
    draw: `
      <rect x="30" y="120" width="94" height="84" rx="6" fill="rgba(230,201,131,.08)" stroke="none"/>
      <line x1="124" y1="118" x2="124" y2="206" stroke="${C.dim}" stroke-width="1.5" stroke-dasharray="5 4"/>
      ${base(114, 162, C.ally)}
      <circle cx="150" cy="140" r="11" fill="#1d2a19" stroke="${C.ok}" stroke-width="2"/>
      <text class="zl-mini" x="150" y="144" text-anchor="middle" fill="${C.ok}">SÍ</text>
      ${cap(96, 224, 'Mitad o más', C.ok)}

      <rect x="230" y="120" width="94" height="84" rx="6" fill="rgba(230,201,131,.08)" stroke="none"/>
      <line x1="324" y1="118" x2="324" y2="206" stroke="${C.dim}" stroke-width="1.5" stroke-dasharray="5 4"/>
      ${base(336, 162, C.ally)}
      <circle cx="366" cy="140" r="11" fill="#2a1a18" stroke="${C.ko}" stroke-width="2"/>
      <text class="zl-mini" x="366" y="144" text-anchor="middle" fill="${C.ko}">NO</text>
      ${cap(300, 224, 'Menos de la mitad', C.ko)}`,
  })}

  ${row(238, 230, {
    tone: 'plain', ok: null, title: 'Quién suma y quién no',
    lines: [
      { t: 'Suma el Valor de las que estén dentro.' },
      { t: 'Azul 2 + 4 = 6 · Rojo 3 → controla el azul.', cls: 'zl-lab', fill: C.ok },
    ],
    draw: `
      <circle cx="186" cy="362" r="74" fill="rgba(230,201,131,.05)" stroke="${C.dim}" stroke-width="1.5" stroke-dasharray="6 5"/>
      ${base(186, 306, C.ally)}<text class="zl-val" x="218" y="301">2</text>
      ${base(124, 400, C.ally)}<text class="zl-val" x="90" y="428">4</text>
      ${base(258, 322, C.enemy)}<text class="zl-val" x="290" y="317">3</text>`,
  })}

  ${note(480, 'Un solo jugador', 'Si solo hay unidades de un jugador, el puesto es suyo.')}

  ${note(544, 'No aportan Valor', 'Las unidades de rol Pesado y Fuego pesado, aunque estén solas.')}

  ${note(608, 'Empate o vacío', 'El puesto sigue bajo el control de quien lo tuviera.')}`,
)


/* ── Medición de distancias ─────────────────────────────────────────────────
   "desde el punto más cercano de la peana de la unidad que actúa hasta el punto
   más cercano del objetivo"; "pueden medirse en cualquier momento".          */
const measurement = figure(
  'Cómo se miden las distancias',
  'Medición de peana a peana entre los puntos más cercanos',
  300,
  `
  ${head('Medición de distancias', 'Todas las distancias se miden en pulgadas (").')}

  ${row(76, 132, {
    tone: 'plain', ok: null, title: 'De peana a peana',
    lines: [
      { t: 'Del punto más cercano de tu peana al' },
      { t: 'punto más cercano del objetivo.', cls: 'zl-lab' },
    ],
    draw: `${base(90, 158, C.act)}${cap(90, 192, 'Actúa', C.act)}
      ${base(300, 158, C.enemy)}${cap(300, 192, 'Objetivo', C.enemy)}
      ${dim(107, 158, 283, 158, 'se mide esto')}
      <circle cx="107" cy="158" r="3" fill="${C.dim}"/>
      <circle cx="283" cy="158" r="3" fill="${C.dim}"/>`,
  })}

  ${note(220, 'Se puede medir siempre', 'En cualquier momento. Si hay duda, se remide.')}`,
)

/* ── Estructura del turno ───────────────────────────────────────────────────
   "Cada turno empieza con la fase de despliegue... Después, cada jugador juega su
   fase... Cuando todos han jugado su fase, el turno termina"; al final se calcula
   el control de los puestos y se cuentan los puntos.                          */
const turnStructure = figure(
  'Cómo fluye un turno',
  'Fase de despliegue, fase de cada jugador y fin del turno',
  456,
  `
  ${head('Estructura del turno', 'El turno empieza con el despliegue y sigue con la fase de cada jugador.')}

  ${row(76, 96, {
    num: '1', title: 'Fase de despliegue',
    lines: [{ t: 'Una unidad desde la Reserva por cada' }, { t: 'puesto de mando que controles.' }],
  })}

  ${row(184, 96, {
    num: '2', title: 'Fase de cada jugador',
    lines: [{ t: 'Activa todas sus unidades, una tras otra.' }, { t: 'Después le toca al siguiente.' }],
  })}

  ${row(292, 96, {
    num: '3', title: 'Fin del turno',
    lines: [{ t: 'Efectos de fin de turno, control de los' }, { t: 'puestos de mando y puntos.' }],
  })}

  <path d="M${W - 30} 392 L${W - 30} 414 L12 414 L12 124" fill="none" stroke="${C.dim}" stroke-width="1.4"
        stroke-dasharray="5 4" marker-end="url(#zl-dim)"/>
  <text class="zl-dim" x="${W / 2}" y="438" text-anchor="middle">siguiente turno, de nuevo desde la fase de despliegue</text>`,
)
/* ── Activar una unidad ─────────────────────────────────────────────────────
   "Una unidad activada no puede volver a activarse ese turno. Para llevar el
   control, se puede marcar con cualquier elemento."                          */
const activation = figure(
  'Cómo marcar una unidad activada',
  'Cómo se marca que una unidad ya se ha activado',
  300,
  `
  ${head('Activar una unidad', 'Una opción de activación. Después no vuelve a activarse ese turno.')}

  ${row(76, 132, {
    tone: 'plain', ok: null, title: 'Márcala al activarla',
    lines: [
      { t: 'Vale cualquier elemento; por ejemplo, un' },
      { t: 'token que se gira cuando ya ha actuado.' },
    ],
    draw: `<circle cx="110" cy="158" r="26" fill="#1b1d25" stroke="${C.soft}" stroke-width="2.5"/>
      ${cap(110, 200, 'Sin activar', C.soft)}
      <line x1="150" y1="158" x2="196" y2="158" stroke="${C.act}" stroke-width="2" marker-end="url(#zl-shot)"/>
      <circle cx="240" cy="158" r="26" fill="#2a1f10" stroke="#e08b2d" stroke-width="2.5"/>
      ${cap(240, 200, 'Activada', '#e08b2d')}`,
  })}

  ${note(220, 'Una vez por turno', 'Una unidad activada no puede volver a activarse ese turno.')}`,
)

/* ── Secuencia de ataque ────────────────────────────────────────────────────
   "Todo ataque, a distancia o cuerpo a cuerpo, se resuelve igual y siempre en
   este orden": objetivo, dados, Precisión, Defensa y 1 Vida por impacto.     */
const attackSequence = figure(
  'La secuencia de un ataque',
  'Los cinco pasos de cualquier ataque, a distancia o cuerpo a cuerpo',
  680,
  `
  ${head('Secuencia de ataque', 'A distancia y cuerpo a cuerpo, siempre en este orden.')}

  ${row(76, 96, {
    num: '1', title: 'Elegir objetivo',
    lines: [{ t: 'Dentro del Alcance. A distancia, a la vista;' }, { t: 'cuerpo a cuerpo, en contacto tras cargar.' }],
  })}

  ${row(184, 96, {
    num: '2', title: 'Tirar los dados',
    lines: [{ t: 'Tantos como indique el valor de Ataques' }, { t: 'del arma.' }],
  })}

  ${row(292, 96, {
    num: '3', title: 'Impactar',
    lines: [{ t: 'Cada dado que iguale o supere la' }, { t: 'Precisión del arma, impacta.' }],
  })}

  ${row(400, 96, {
    num: '4', title: 'Defensa',
    lines: [{ t: 'Un dado por impacto: con la Defensa o' }, { t: 'más, el defensor lo bloquea.' }],
  })}

  ${row(508, 96, {
    num: '5', title: 'Quitar Vidas',
    lines: [{ t: 'Cada impacto no bloqueado quita' }, { t: '1 Vida.' }],
  })}

  ${note(616, 'Habilidades', 'Directo se salta el paso 3; Golpe crítico y Perforante cambian el 4; Ráfaga, Pesada y Disparo certero suman dados.')}`,
)
/* ── Opciones de activación ─────────────────────────────────────────────────
   "Cada vez que una unidad se activa, elige una de estas tres opciones: Avanzar
   (se mueve hasta su Movimiento y después puede disparar), Correr (tira 1D6 y se
   mueve hasta su Movimiento + el resultado; no puede atacar) y Cargar (elige un
   enemigo, tira 1D6 y se mueve hasta Movimiento + el resultado para atacarlo)". */
const activationOptions = figure(
  'Las tres opciones de activación',
  'Avanzar y disparar, Correr o Cargar',
  568,
  `
  ${head('Opciones de activación', 'Al activarse, la unidad elige una de las tres.')}

  ${row(76, 132, {
    tone: 'plain', ok: null, title: 'Avanzar',
    lines: [{ t: 'Mueve hasta su Movimiento y después' }, { t: 'puede disparar, sin penalización.', cls: 'zl-lab' }],
    draw: `${ghost(56, 158)}
      <line x1="76" y1="158" x2="144" y2="158" stroke="${C.act}" stroke-width="2" marker-end="url(#zl-shot)"/>
      ${base(164, 158, C.act)}${cap(164, 192, 'avanza', C.act)}
      <line x1="183" y1="158" x2="288" y2="158" stroke="${C.ink}" stroke-width="1.8" stroke-dasharray="6 4" marker-end="url(#zl-shot)"/>
      ${base(308, 158, C.enemy)}${cap(308, 192, 'dispara', C.enemy)}`,
  })}

  ${row(220, 132, {
    tone: 'plain', ok: null, title: 'Correr',
    lines: [{ t: 'Tira 1D6 y mueve hasta Movimiento +' }, { t: 'el resultado. No puede atacar.', cls: 'zl-lab', fill: C.ko }],
    draw: `${ghost(56, 302)}
      <line x1="76" y1="302" x2="298" y2="302" stroke="${C.act}" stroke-width="2" marker-end="url(#zl-shot)"/>
      ${base(318, 302, C.act)}
      ${dim(56, 272, 318, 272, 'Movimiento + 1D6')}
      ${cap(318, 336, 'sin atacar', C.ko)}`,
  })}

  ${row(364, 132, {
    tone: 'plain', ok: null, title: 'Cargar',
    lines: [{ t: 'Elige un enemigo, tira 1D6 y mueve hasta' }, { t: 'Movimiento + el resultado para atacarlo.', cls: 'zl-lab' }],
    draw: `${ghost(56, 446)}
      <line x1="76" y1="446" x2="254" y2="446" stroke="${C.act}" stroke-width="2" marker-end="url(#zl-shot)"/>
      ${base(274, 446, C.act)}${base(308, 446, C.enemy)}
      ${dim(56, 416, 274, 416, 'Movimiento + 1D6')}
      ${cap(291, 480, 'ataca cuerpo a cuerpo', C.act)}`,
  })}

  ${note(508, 'Una sola opción', 'Avanzar, Correr o Cargar: la unidad elige una y su activación termina.')}`,
)
/* ── Vidas en escuadras ─────────────────────────────────────────────────────
   "Los impactos no bloqueados de un ataque se suman en un único total, que el
   defensor va asignando: elige una miniatura, le quita Vidas hasta eliminarla y,
   si sobran, elige la siguiente"; "el Capitán es siempre el último".           */
const squadDamage = figure(
  'Cómo se reparten los impactos en una escuadra',
  'Todos los impactos van a una miniatura hasta eliminarla, y los que sobran pasan a otra',
  552,
  `
  ${head('Vidas en una escuadra', 'Los impactos no se reparten: van a la miniatura que elijas.')}

  ${row(76, 150, {
    tone: 'plain', ok: null, title: 'Elige quién los recibe',
    lines: [
      { t: 'El dueño de la escuadra elige la miniatura' },
      { t: 'y le quita Vidas hasta eliminarla.' },
    ],
    draw: `${[60, 100, 140, 180, 220].map((x) => base(x, 172, C.ally, 15)).join('')}
      <line x1="100" y1="124" x2="100" y2="152" stroke="${C.ko}" stroke-width="2.2" marker-end="url(#zl-shot)"/>
      ${cap(100, 210, 'todos los impactos aquí', C.ko)}`,
  })}

  ${row(238, 150, {
    tone: 'plain', ok: null, title: 'Si cae y sobran',
    lines: [
      { t: 'Solo entonces se elige otra miniatura,' },
      { t: 'y los impactos restantes siguen en ella.' },
    ],
    draw: `${[60, 100, 140, 180, 220].map((x) => base(x, 334, C.ally, 15)).join('')}
      ${cross(100, 334, 12)}
      <line x1="118" y1="334" x2="140" y2="334" stroke="${C.ko}" stroke-width="2" marker-end="url(#zl-shot)"/>
      ${cap(150, 372, 'el resto pasa aquí', C.ko)}`,
  })}

  ${note(416, 'Un único total', 'Los impactos no bloqueados se suman y se asignan de una en una.')}

  ${note(480, 'El Capitán', 'Es siempre el último de la escuadra en recibirlos.')}`,
)
/* ── Fase de despliegue ─────────────────────────────────────────────────────
   "Al comienzo de cada turno... una sola unidad por cada puesto de mando que
   controle"; "el Capitán puede recibir una miniatura de su tipo"; "Las unidades
   desplegadas pueden activarse ese mismo turno".                              */
const deploymentPhase = figure(
  'Cómo entran los refuerzos',
  'Despliegue por puestos de mando y por Capitanes, al comienzo del turno',
  520,
  `
  ${head('Fase de despliegue', 'Al comienzo de cada turno entran unidades desde la Reserva.')}

  ${row(76, 140, {
    tone: 'plain', ok: null, title: 'Por puestos de mando',
    lines: [
      { t: 'Una unidad por cada puesto que controles,' },
      { t: 'en contacto con él o dentro de su área.' },
    ],
    draw: `${[70, 160, 250].map((x) => `
      <circle cx="${x}" cy="176" r="19" fill="none" stroke="${C.dim}" stroke-width="1.6" stroke-dasharray="5 4"/>
      <path d="M${x - 6} 170 l12 0 l0 5 l-12 0 z" fill="${C.act}"/>
      ${base(x, 130, C.ally, 14)}
      <line x1="${x}" y1="149" x2="${x}" y2="160" stroke="${C.ok}" stroke-width="1.8" marker-start="url(#zl-shot)"/>`).join('')}
      ${cap(160, 208, '3 puestos → 3 refuerzos', C.soft)}`,
  })}

  ${row(228, 140, {
    tone: 'plain', ok: null, title: 'Por Capitanes',
    lines: [
      { t: 'El Capitán puede recibir una miniatura' },
      { t: 'de su tipo en su escuadra.' },
    ],
    draw: `${base(96, 300, C.act)}${cap(96, 338, 'Capitán', C.act)}
      ${base(146, 300, C.ally, 14)}${base(180, 300, C.ally, 14)}
      ${base(230, 300, C.ally, 14)}
      <line x1="200" y1="300" x2="216" y2="300" stroke="${C.ok}" stroke-width="1.8" marker-end="url(#zl-shot)"/>
      ${cap(230, 338, 'se suma', C.ok)}`,
  })}

  ${note(392, 'Actúan ese mismo turno', 'Las unidades que entran ahora pueden activarse en este turno.')}

  ${note(456, 'Tiene que caber', 'Si no hay hueco libre en contacto, no puede desplegarse ahí.')}`,
)

/* ── Capitanes y escuadras ───────────────────────────────────────────────────
   "cada Capitán puede llevar una escuadra de un único tipo de unidad, con hasta
   el número de miniaturas que indique su valor Escuadra. El Capitán no cuenta";
   "usa el perfil completo de la unidad que acompaña"; "si pierde a todos sus
   integrantes, sigue en juego con el mismo perfil... solo puede recibir
   miniaturas de ese mismo tipo"; "el Capitán es siempre el último".          */
const captainSquad = figure(
  'Cómo se forma una escuadra',
  'Un Capitán acompañado de miniaturas de un mismo tipo',
  548,
  `
  ${head('Capitanes y escuadras', 'Solo un Capitán puede llevar escuadra, y de un único tipo.')}

  ${row(76, 150, {
    tone: 'plain', ok: null, title: 'Capitán + un solo tipo',
    lines: [
      { t: 'Hasta el número de la columna Escuadra.' },
      { t: 'El Capitán no cuenta para ese máximo.' },
    ],
    draw: `${base(80, 150, C.act)}${cap(80, 192, 'Capitán', C.act)}
      ${[136, 170, 204, 238].map((x) => base(x, 150, C.ally, 14)).join('')}
      ${cap(187, 192, 'mismo tipo', C.ally)}`,
  })}

  ${row(238, 130, {
    tone: 'plain', ok: null, title: 'Usa el perfil de su escuadra',
    lines: [
      { t: 'Movimiento, Vidas, Defensa y armas:' },
      { t: 'es un integrante más.' },
    ],
    draw: `${base(100, 306, C.act)}
      ${[144, 178, 212].map((x) => base(x, 306, C.ally, 14)).join('')}
      <line x1="80" y1="340" x2="232" y2="340" stroke="${C.dim}" stroke-width="1.4" stroke-dasharray="4 4"/>
      ${cap(156, 360, 'una sola unidad', C.soft)}`,
  })}

  ${row(380, 104, {
    tone: 'plain', ok: null, title: 'Si pierde a toda la escuadra',
    lines: [
      { t: 'Sigue en juego con el mismo perfil. Por' },
      { t: 'Refuerzos solo recibe ese mismo tipo.' },
    ],
  })}

  ${note(496, 'El último en caer', 'El Capitán es siempre el último en recibir daño.')}`,
)

const die = (x, y, n, tone) => {
  const col = tone === 'ok' ? C.ok : tone === 'ko' ? C.ko : C.act
  const fill = tone === 'ok' ? 'rgba(127,191,106,.12)' : tone === 'ko' ? 'rgba(201,88,79,.12)' : 'rgba(214,190,132,.16)'
  return `<rect x="${x}" y="${y}" width="38" height="38" rx="8" fill="${fill}" stroke="${col}" stroke-width="1.6"/>
    <text class="zl-lab" x="${x + 19}" y="${y + 25}" text-anchor="middle" fill="${col}">${n}</text>`
}

/* ── Ráfaga ─────────────────────────────────────────────────────────────────
   "Cada impacto con un 6 añade 1 dado de ataque más, que se tira en ese momento.
   Si vuelve a salir un 6, se sigue añadiendo."                                 */
const burst = figure(
  'Cómo funciona un arma con Ráfaga',
  'Cada 6 que impacta añade un dado de ataque, y la cadena sigue mientras salgan seises',
  432,
  `
  ${head('Ráfaga', 'Cada 6 que impacta trae un dado de ataque más.')}

  ${row(76, 134, {
    num: '1', title: 'Busca los 6',
    lines: [{ t: 'Cada impacto con un 6 añade 1 dado' }, { t: 'de ataque más. Precisión 4+ en el ejemplo.' }],
    draw: `${die(40, 126, 2, 'ko')}${die(86, 126, 5, 'ok')}${die(132, 126, 6, 'six')}
      <line x1="176" y1="145" x2="214" y2="145" stroke="${C.act}" stroke-width="2" marker-end="url(#zl-shot)"/>
      ${cap(255, 150, '+1 dado', C.act)}`,
  })}

  ${row(224, 134, {
    num: '2', title: 'Tíralo ya',
    lines: [{ t: 'Se tira en ese momento. Si vuelve a' }, { t: 'salir un 6, se sigue añadiendo.' }],
    draw: `${die(40, 274, 6, 'six')}
      <line x1="84" y1="293" x2="114" y2="293" stroke="${C.act}" stroke-width="2" marker-end="url(#zl-shot)"/>
      ${die(120, 274, 4, 'ok')}
      ${cap(80, 338, 'otro 6: otro dado', C.act)}`,
  })}

  ${note(372, 'Disparo y cuerpo a cuerpo', 'Ráfaga sirve en los dos tipos de arma.')}`,
)

/* ── Implacable ─────────────────────────────────────────────────────────────
   "Puede volver a tirar una vez los dados que no hayan impactado": los que no
   superan la Precisión del arma, a distancia o cuerpo a cuerpo.               */
const relentless = figure(
  'Cómo funciona un arma Implacable',
  'Los dados que no impactan se vuelven a tirar una vez',
  420,
  `
  ${head('Implacable', 'Los fallos tienen una segunda oportunidad.')}

  ${row(76, 134, {
    num: '1', title: 'Tira y aparta los fallos',
    lines: [{ t: 'Los que no impactan se recogen; los que' }, { t: 'impactan se quedan como están.' }],
    draw: `${[[1, false], [4, true], [2, false], [6, true], [5, true]].map(([n, ok], i) => `
      <rect x="${40 + i * 46}" y="118" width="38" height="38" rx="8"
            fill="${ok ? 'rgba(127,191,106,.12)' : 'rgba(201,88,79,.12)'}"
            stroke="${ok ? C.ok : C.ko}" stroke-width="1.6"/>
      <text class="zl-lab" x="${59 + i * 46}" y="143" text-anchor="middle" fill="${ok ? C.ok : C.ko}">${n}</text>`).join('')}
      ${cap(105, 182, 'estos dos fallan', C.ko)}`,
  })}

  ${row(224, 134, {
    num: '2', title: 'Vuélvelos a tirar',
    lines: [{ t: 'Solo una vez. Lo que salga ahora es' }, { t: 'definitivo, impacte o no.' }],
    draw: `${[[3, true], [1, false]].map(([n, ok], i) => `
      <rect x="${40 + i * 46}" y="266" width="38" height="38" rx="8"
            fill="${ok ? 'rgba(127,191,106,.12)' : 'rgba(201,88,79,.12)'}"
            stroke="${ok ? C.ok : C.ko}" stroke-width="1.6"/>
      <text class="zl-lab" x="${59 + i * 46}" y="291" text-anchor="middle" fill="${ok ? C.ok : C.ko}">${n}</text>`).join('')}
      ${cap(85, 330, 'uno se salva', C.ok)}`,
  })}

  ${note(372, 'Disparo y cuerpo a cuerpo', 'Vale en los dos: se repiten los dados que no superan la Precisión.')}`,
)

/* ── Pesada ─────────────────────────────────────────────────────────────────
   "Si la unidad no se ha movido en esta activación, el ataque gana +1 dado de
   ataque."; "solo puede ir en armas a distancia".                             */
const heavy = figure(
  'Cómo funciona un arma Pesada',
  'Disparar sin moverse da un dado más; tras moverse se dispara con los dados normales',
  424,
  `
  ${head('Pesada', 'Si dispara sin haberse movido, el ataque gana un dado.')}

  ${row(76, 132, {
    tone: 'ok', ok: true, title: 'Sin moverse',
    lines: [{ t: 'No se ha movido en esta activación:' }, { t: 'el ataque gana +1 dado.', cls: 'zl-lab', fill: C.ok }],
    draw: `${base(66, 158, C.act)}${cap(66, 192, 'quieta', C.act)}
      <line x1="85" y1="158" x2="282" y2="158" stroke="${C.ink}" stroke-width="1.8" stroke-dasharray="6 4" marker-end="url(#zl-shot)"/>
      ${cap(184, 146, '+1 dado', C.ok)}
      ${base(302, 158, C.enemy)}${cap(302, 192, 'Objetivo', C.enemy)}`,
  })}

  ${row(220, 132, {
    tone: 'plain', ok: null, title: 'Tras moverse',
    lines: [{ t: 'Si avanza y después dispara, usa sus' }, { t: 'dados de Ataques normales.' }],
    draw: `${ghost(56, 302)}
      <line x1="76" y1="302" x2="124" y2="302" stroke="${C.act}" stroke-width="2" marker-end="url(#zl-shot)"/>
      ${base(144, 302, C.act)}${cap(144, 336, 'se ha movido', C.soft)}
      <line x1="163" y1="302" x2="282" y2="302" stroke="${C.ink}" stroke-width="1.8" stroke-dasharray="6 4" marker-end="url(#zl-shot)"/>
      ${base(302, 302, C.enemy)}`,
  })}

  ${note(364, 'Solo a distancia', 'Pesada solo puede ir en armas a distancia.')}`,
)

/* ── Trepar ─────────────────────────────────────────────────────────────────
   "mueve hasta tocar la base del obstáculo con su peana y después mide la altura
   que quiere subir, que también consume movimiento. Bajar también consume
   movimiento"; "Algunas unidades pueden trepar en diagonal: miden directamente
   desde donde están hasta el punto al que suben... como Brinco"; "Las unidades
   de rol Pesado y Fuego pesado no pueden trepar".                             */
const climbing = figure(
  'Trepar, trepar en diagonal y bajar',
  'Vista de perfil de dos unidades subiendo al mismo edificio y de otra bajando',
  510,
  `
  ${head('Terreno y obstáculos · vista de perfil', 'El movimiento se gasta en horizontal y también en vertical.')}

  ${row(76, 200, {
    tone: 'plain', ok: null, title: 'Dos formas de subir',
    lines: [
      { t: 'Normal: hasta la base y luego en vertical.', fill: C.act },
      { t: 'En diagonal (Brinco): directo al tejado.', fill: C.ally },
      { t: 'Las dos restan la altura del movimiento.' },
    ],
    draw: `${ground(30, 380, 250)}
      <rect x="170" y="160" width="100" height="90" fill="url(#zl-hatch)" stroke="rgba(255,255,255,.28)"/>
      ${pawn(50, 250, C.act)}
      <line x1="62" y1="242" x2="160" y2="242" stroke="${C.act}" stroke-width="2" marker-end="url(#zl-shot)"/>
      <line x1="164" y1="236" x2="164" y2="168" stroke="${C.act}" stroke-width="2" marker-end="url(#zl-shot)"/>
      ${cap(140, 205, 'sube', C.act)}
      ${pawn(196, 160, C.act)}
      ${pawn(340, 250, C.ally)}
      <line x1="330" y1="228" x2="262" y2="168" stroke="${C.ally}" stroke-width="2" marker-end="url(#zl-shot)"/>
      ${pawn(244, 160, C.ally)}
      ${cap(50, 270, 'normal', C.act)}
      ${cap(340, 270, 'en diagonal', C.ally)}`,
  })}

  ${row(288, 150, {
    tone: 'plain', ok: null, title: 'Bajar',
    lines: [{ t: 'Bajar también consume movimiento,' }, { t: 'igual que subir.' }],
    draw: `${ground(30, 380, 420)}
      <rect x="40" y="340" width="100" height="80" fill="url(#zl-hatch)" stroke="rgba(255,255,255,.28)"/>
      ${pawn(90, 340, C.act)}
      <line x1="102" y1="332" x2="146" y2="332" stroke="${C.act}" stroke-width="2"/>
      <line x1="150" y1="334" x2="150" y2="404" stroke="${C.act}" stroke-width="2" marker-end="url(#zl-shot)"/>
      <line x1="154" y1="412" x2="236" y2="412" stroke="${C.act}" stroke-width="2" marker-end="url(#zl-shot)"/>
      ${cap(178, 380, 'baja', C.act)}
      ${pawn(256, 420, C.act)}`,
  })}

  ${note(450, 'Pesado y Fuego pesado', 'Las unidades de rol Pesado y Fuego pesado no trepan: siempre a nivel de suelo.')}`,
)

/* ── Momento del equipamiento ───────────────────────────────────────────────
   "Fase de despliegue"; "En lugar de disparar: la unidad lo usa al Avanzar, en
   vez de hacer su ataque a distancia"; "Al disparar, Al cargar, Al atacar
   cuerpo a cuerpo o Al atacar: se añade al ataque... Al atacar sirve tanto a
   distancia como cuerpo a cuerpo"; "Al recibir un disparo: ... aunque sea la
   fase del rival". Los ejemplos son cartas de la tabla de Equipamiento.      */
const equipmentTiming = figure(
  'Cuándo se usa cada equipamiento',
  'Los Momentos del equipamiento en el orden en que aparecen durante el turno',
  616,
  `
  ${head('Momento del equipamiento', 'Cada carta indica en qué momento del turno se usa.')}

  ${row(76, 96, {
    num: '1', title: 'Fase de despliegue',
    lines: [{ t: 'Al comienzo del turno, con los refuerzos.' }, { t: 'Ej.: Refuerzos, Vuelta a reserva.', fill: C.soft }],
  })}

  ${row(184, 96, {
    num: '2', title: 'En lugar de disparar',
    lines: [{ t: 'Al Avanzar, la unidad lo usa en vez de' }, { t: 'hacer su ataque a distancia.' }],
  })}

  ${row(292, 96, {
    num: '3', title: 'Al disparar · Al cargar',
    lines: [{ t: 'Se añade al ataque al hacerlo.' }, { t: 'Ej.: Cargador extra, Pica.', fill: C.soft }],
  })}

  ${row(400, 96, {
    num: '4', title: 'Al atacar',
    lines: [{ t: 'Vale a distancia y cuerpo a cuerpo.' }, { t: 'Ej.: Potenciador, Anti-Soldado.', fill: C.soft }],
  })}

  ${row(508, 96, {
    num: '5', title: 'Al recibir un disparo',
    lines: [{ t: 'Cuando te disparan, aunque sea la fase' }, { t: 'del rival. Ej.: Bomba de humo.' }],
  })}`,
)

/* ── Atacar con una escuadra ────────────────────────────────────────────────
   "todos sus integrantes, Capitán incluido, suman sus dados en un solo ataque
   contra el mismo objetivo. A distancia, solo aportan dados los integrantes que
   tengan línea de visión y alcance. Cuando una escuadra carga, basta con que un
   integrante llegue al contacto... Después, toda la escuadra se separa 1".    */
const squadAttack = figure(
  'Cómo ataca una escuadra',
  'Todos los integrantes suman sus dados en un solo ataque',
  514,
  `
  ${head('Atacar con una escuadra', 'Todos los integrantes, Capitán incluido, atacan juntos.')}

  ${row(76, 150, {
    tone: 'plain', ok: null, title: 'Cargar con la escuadra',
    lines: [
      { t: 'Basta con que un integrante llegue al' },
      { t: 'contacto: todos suman sus dados al ataque.' },
    ],
    draw: `${base(100, 138, C.ally)}${base(100, 178, C.ally)}${base(140, 158, C.ally)}
      ${base(180, 158, C.ally)}
      ${base(214, 158, C.enemy)}
      ${cap(140, 214, 'toda la escuadra ataca', C.ally)}`,
  })}

  ${row(238, 136, {
    tone: 'plain', ok: null, title: 'Un solo ataque',
    lines: [{ t: 'Todos suman sus dados en un único ataque' }, { t: 'contra el mismo objetivo.' }],
    draw: `${base(80, 296, C.ally, 14)}${base(80, 340, C.ally, 14)}${base(114, 318, C.act, 14)}
      <line x1="132" y1="318" x2="228" y2="318" stroke="${C.act}" stroke-width="2.5" marker-end="url(#zl-shot)"/>
      ${base(250, 318, C.enemy)}
      ${cap(97, 362, 'Capitán incluido', C.act)}`,
  })}

  ${note(386, 'A distancia', 'Solo aportan dados los integrantes con línea de visión y alcance.')}

  ${note(450, 'Tras la carga', 'Toda la escuadra se separa 1" del defensor.')}`,
)

/* ── Mover una escuadra ─────────────────────────────────────────────────────
   "La escuadra se mueve desde el Capitán: primero se mueve él y después el resto
   se coloca a su alrededor, en coherencia. Ninguna miniatura puede quedar más
   lejos de lo que le permitiría su propio movimiento"; "Al Correr o Cargar, se
   tira un solo dado para toda la escuadra."                                   */
const squadMovement = figure(
  'Cómo se mueve una escuadra',
  'Primero el Capitán y después el resto de miniaturas a su alrededor',
  466,
  `
  ${head('Mover una escuadra', 'La escuadra se mueve desde el Capitán, no miniatura a miniatura.')}

  ${row(76, 150, {
    num: '1', title: 'Mueve el Capitán',
    lines: [
      { t: 'Llévalo hasta su posición final con su' },
      { t: 'Movimiento, que es el de la escuadra.' },
    ],
    draw: `${base(80, 156, C.act)}
      ${[124, 158, 192].map((x) => base(x, 156, C.ally, 14)).join('')}
      <line x1="98" y1="180" x2="250" y2="180" stroke="${C.act}" stroke-width="2" marker-end="url(#zl-shot)"/>
      ${base(268, 156, C.act)}
      ${cap(268, 204, 'posición final', C.act)}`,
  })}

  ${row(238, 150, {
    num: '2', title: 'Coloca el resto alrededor',
    lines: [
      { t: 'Respetando la coherencia, y sin que nadie' },
      { t: 'recorra más de su propio Movimiento.' },
    ],
    draw: `${base(170, 318, C.act)}
      ${[[214, 296], [214, 340], [248, 318]].map(([x, y]) => base(x, y, C.ally, 14)).join('')}
      <circle cx="170" cy="318" r="62" fill="none" stroke="${C.dim}" stroke-width="1.2" stroke-dasharray="5 4"/>
      ${cap(170, 366, 'en coherencia', C.soft)}`,
  })}

  ${note(402, 'Correr o Cargar', 'Se tira un solo dado para toda la escuadra.')}`,
)

/* ── Modificadores ──────────────────────────────────────────────────────────
   "Mejorar en 1 significa que te basta un número menos (de 4+ a 3+), y empeorar
   en 1, que necesitas uno más (de 4+ a 5+)"; "Ningún valor puede quedar mejor
   que 2+ ni peor que 6+".                                                     */
const modifiers = figure(
  'Cómo funcionan los modificadores',
  'Escala de 3+, 4+ y 5+ y qué significa mejorar o empeorar un valor',
  428,
  `
  ${head('Modificadores', 'Mejorar en 1 baja el número que necesitas; empeorar en 1 lo sube.')}

  ${row(76, 120, {
    tone: 'plain', ok: null, title: 'Qué significa 4+',
    lines: [{ t: 'El resultado mínimo que necesitas en 1D6.' }, { t: 'Con 4+ aciertas con 4, 5 y 6.' }],
    draw: `${[1, 2, 3].map((n, i) => `
      <rect x="${60 + i * 40}" y="140" width="32" height="32" rx="7" fill="#22242c" stroke="rgba(255,255,255,.18)"/>
      <text class="zl-val" x="${76 + i * 40}" y="162" text-anchor="middle" fill="${C.soft}">${n}</text>`).join('')}
      ${[4, 5, 6].map((n, i) => `
      <rect x="${188 + i * 40}" y="140" width="32" height="32" rx="7" fill="#1d2a19" stroke="${C.ok}"/>
      <text class="zl-val" x="${204 + i * 40}" y="162" text-anchor="middle" fill="${C.ok}">${n}</text>`).join('')}
      ${cap(160, 194, '4+ · tres de cada seis', C.soft)}`,
  })}

  ${row(208, 128, {
    tone: 'plain', ok: null, title: 'Mejorar y empeorar',
    lines: [{ t: 'Cobertura: mejora en 1 la Defensa.' }, { t: 'Perforante: la empeora en 1.' }],
    draw: `${chip(56, 254, 74, '3+', C.ok)}
      <line x1="140" y1="271" x2="172" y2="271" stroke="${C.ok}" stroke-width="2" marker-start="url(#zl-shot)"/>
      ${chip(178, 254, 74, '4+', C.act)}
      <line x1="262" y1="271" x2="294" y2="271" stroke="${C.ko}" stroke-width="2" marker-end="url(#zl-shot)"/>
      ${chip(300, 254, 74, '5+', C.ko)}
      <text class="zl-dim" x="93" y="312" text-anchor="middle" fill="${C.ok}">mejora 1</text>
      <text class="zl-dim" x="337" y="312" text-anchor="middle" fill="${C.ko}">empeora 1</text>`,
  })}

  ${note(348, 'Límites', 'Nada mejor que 2+ ni peor que 6+: un 1 siempre falla y un 6 siempre funciona.')}`,
)
export const RULES_DIAGRAMS = {
  measurementDiagram: measurement,
  modifiersDiagram: modifiers,
  burstDiagram: burst,
  relentlessDiagram: relentless,
  heavyDiagram: heavy,
  captainSquadDiagram: captainSquad,
  squadCoherenceDiagram: squadCoherence,
  squadMovementDiagram: squadMovement,
  squadAttackDiagram: squadAttack,
  squadDamageDiagram: squadDamage,
  equipmentTimingDiagram: equipmentTiming,
  commandPostDiagram: commandPost,
  turnStructureDiagram: turnStructure,
  deploymentPhaseDiagram: deploymentPhase,
  activationDiagram: activation,
  activationOptionsDiagram: activationOptions,
  climbingDiagram: climbing,
  attackSequenceDiagram: attackSequence,
  lineOfSightDiagram: lineOfSight,
  chargeDiagram: charge,
  coverDiagram: cover,
}
