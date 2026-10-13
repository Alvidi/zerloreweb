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

/** Pastilla con una etiqueta: acciones, estados, fases. */
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

  ${note(512, 'Dos excepciones', 'Fuego indirecto (Artillería) y Poder mental (Psíquico) atacan sin línea de visión.')}`,
)

/* ── Cargar ─────────────────────────────────────────────────────────────────
   "Si el movimiento le permite alcanzar al objetivo, coloca la miniatura en
   contacto de peana y lanza 1D6: con 3+ ... con 1 o 2 ... retira la miniatura
   hasta 1" del objetivo, sin trabar y sin atacar."
   El ejemplo del Choque (Movimiento 5" + Velocidad +4") con el enemigo a 6" es
   el del reglamento.                                                          */
const charge = figure(
  'La acción Cargar y su tirada de 1D6',
  'Secuencia de la acción Cargar con sus dos resultados',
  530,
  `
  ${head('Cargar', 'Consume 2 acciones. Se mueve hasta Movimiento + Velocidad hacia el objetivo.')}

  ${row(76, 140, {
    tone: 'plain', ok: null, title: '1 · Declara y mueve',
    lines: [{ t: 'Movimiento 5" + Velocidad +4" = 9"' }, { t: 'Alcanza el contacto de peana.', cls: 'zl-lab' }],
    draw: `${base(66, 178, C.act)}${cap(66, 210, 'Activa', C.act)}
      ${base(320, 178, C.enemy)}${cap(320, 210, 'Objetivo', C.enemy)}
      <line x1="85" y1="178" x2="300" y2="178" stroke="${C.act}" stroke-width="2.5" marker-end="url(#zl-shot)"/>
      ${dim(66, 146, 320, 146, 'Objetivo a 6"')}`,
  })}

  ${row(228, 132, {
    tone: 'ok', ok: true, title: '3+ · la carga prende',
    lines: [{ t: 'Ambas quedan trabadas y la atacante hace' }, { t: '1 ataque cuerpo a cuerpo gratis.', cls: 'zl-lab', fill: C.ok }],
    draw: `${base(160, 306, C.act)}${base(194, 306, C.enemy)}
      <circle cx="177" cy="306" r="7" fill="none" stroke="${C.ok}" stroke-width="2"/>
      ${cap(177, 344, 'Trabados', C.ok)}`,
  })}

  ${row(372, 132, {
    tone: 'ko', ok: false, title: '1 o 2 · la carga se frena',
    lines: [{ t: 'Retírala hasta 1" del objetivo. No traba,' }, { t: 'no ataca y su activación termina.', cls: 'zl-lab', fill: C.ko }],
    draw: `${base(130, 450, C.act)}${base(240, 450, C.enemy)}
      ${dim(149, 450, 221, 450, '1"', -12)}
      ${cap(185, 488, 'Sin trabar', C.ko)}`,
  })}

`,
)

/* ── Cobertura ──────────────────────────────────────────────────────────────
   Escenografía de cobertura: "la peana en contacto con el elemento, y este tiene
   que quedar entre ella y el atacante"; "una escuadra se beneficia si la mitad
   o más de sus integrantes están en ella".                                   */
const cover = figure(
  'Cuándo hay cobertura y cuándo no',
  'Tres casos de cobertura',
  704,
  `
  ${head('Escenografía de cobertura', 'Hacen falta dos cosas: peana en contacto con el elemento y que el elemento se interponga.')}

  ${row(76, 132, {
    tone: 'ok', ok: true, title: 'Hay cobertura',
    lines: [
      { t: 'Salvación 4+ → 3+ a distancia.', cls: 'zl-lab', fill: C.ok },
      { t: 'En CaC, el atacante falla con 1, 2 o 3.' },
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

  ${note(512, 'Quién no la tiene', 'Poder mental la ignora. Vehículos, Monstruos, Artillería y Titanes nunca la tienen.')}

  ${note(576, 'Escuadras', 'Tienen cobertura si la mitad o más de sus integrantes están en ella.')}

  ${note(640, 'Atrincherado', 'El Tirador en cobertura mejora en 1 la Precisión de sus disparos.')}`,
)

/* ── Control de un puesto de mando ──────────────────────────────────────────
   "el control lo obtiene el jugador cuyas unidades sumen más valor total";
   "Las unidades ... en combate cuerpo a cuerpo dentro de un puesto de mando no
   cuentan para el cálculo"; "En caso de empate, el puesto permanece bajo el
   control de quien lo tuviera."                                              */
const commandPost = figure(
  'Cómo se decide el control de un puesto de mando',
  'Qué cuenta como estar dentro y cálculo del control por Valor',
  600,
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
      ${base(258, 322, C.enemy)}<text class="zl-val" x="290" y="317">3</text>
      ${base(186, 414, C.ally, 14)}${base(218, 414, C.enemy, 14)}
      <circle cx="202" cy="414" r="6" fill="none" stroke="${C.soft}" stroke-width="1.6"/>
      ${cap(202, 452, 'Trabadas · no cuentan', C.soft)}`,
  })}

  ${note(480, 'No aportan Valor', 'Vehículos, Monstruos, Artillería y Titanes, aunque estén encima.')}

  ${note(544, 'Empate', 'El puesto sigue bajo el control de quien lo tuviera.')}`,
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
   "Al comienzo de la partida, cada jugador tira 1D6... Ese orden se mantiene
   durante toda la partida"; "cada jugador juega su fase: activa todas sus
   unidades"; al final del turno se calcula el control y llega el despliegue. */
const turnStructure = figure(
  'Cómo fluye un turno',
  'Orden de juego, fase de cada jugador, fin del turno y fase de despliegue',
  564,
  `
  ${head('Estructura del turno', 'Cada jugador juega su fase entera; al final del turno entran refuerzos.')}

  ${row(76, 96, {
    num: '1', title: 'Quién empieza',
    lines: [{ t: 'Al inicio de la partida se tira 1D6: el' }, { t: 'más alto juega primero toda la partida.' }],
  })}

  ${row(184, 96, {
    num: '2', title: 'Fase de cada jugador',
    lines: [{ t: 'Activa todas sus unidades, una tras otra.' }, { t: 'Después le toca al rival.' }],
  })}

  ${row(292, 96, {
    num: '3', title: 'Fin del turno',
    lines: [{ t: 'Efectos de fin de turno, control de los' }, { t: 'puestos de mando y puntos.' }],
  })}

  ${row(400, 96, {
    num: '4', title: 'Fase de despliegue',
    lines: [{ t: 'Una unidad desde la Reserva por cada' }, { t: 'puesto de mando que controles.' }],
  })}

  <path d="M${W - 30} 500 L${W - 30} 522 L12 522 L12 232" fill="none" stroke="${C.dim}" stroke-width="1.4"
        stroke-dasharray="5 4" marker-end="url(#zl-dim)"/>
  <text class="zl-dim" x="${W / 2}" y="546" text-anchor="middle">siguiente turno, de nuevo desde la fase de cada jugador</text>`,
)
/* ── Activar una unidad ─────────────────────────────────────────────────────
   "Una unidad activada no puede volver a activarse ese turno. Para llevar el
   control, se puede marcar con cualquier elemento."                          */
const activation = figure(
  'Cómo marcar una unidad activada',
  'Cómo se marca que una unidad ya se ha activado',
  300,
  `
  ${head('Activar una unidad', 'Hasta 2 acciones. Una vez activada, no vuelve a activarse en ese turno.')}

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

/* ── Secuencia de ataque a distancia ────────────────────────────────────────
   Los cinco pasos, literales del reglamento.                                 */
const rangedSequence = figure(
  'La secuencia de un ataque a distancia',
  'Los cinco pasos de un ataque a distancia',
  404,
  `
  ${head('Secuencia de ataque a distancia', 'Siempre en este orden.')}

  <rect x="0" y="76" width="${W}" height="250" rx="10" fill="rgba(255,255,255,.025)" stroke="rgba(255,255,255,.08)"/>

  ${step(48, 112, '1')}<text class="zl-lab" x="74" y="117">Elegir objetivo</text>
  <text class="zl-body" x="74" y="142">Visible y dentro del alcance del arma.</text>

  ${step(48, 172, '2')}<text class="zl-lab" x="74" y="177">Determinar ataques</text>
  <text class="zl-body" x="74" y="202">Tantos dados como Ataques tenga el arma.</text>

  ${step(48, 232, '3')}<text class="zl-lab" x="74" y="237">Tirada de Precisión</text>
  <text class="zl-body" x="74" y="262">Iguala o supera la Precisión. Un 6 es crítico.</text>

  ${step(430, 112, '4')}<text class="zl-lab" x="456" y="117">Tirada de Salvación</text>
  <text class="zl-body" x="456" y="142">La tira el defensor, un dado</text>
  <text class="zl-body" x="456" y="166">por impacto recibido.</text>

  ${step(430, 212, '5')}<text class="zl-lab" x="456" y="217">Aplicar daño</text>
  <text class="zl-body" x="456" y="242">Daño base, o daño crítico</text>
  <text class="zl-body" x="456" y="266">si el impacto fue crítico.</text>

  ${note(340, 'Habilidades que la cambian', 'Directo se salta el paso 3, Disparo certero suma un dado y Golpe crítico anula el 4.')}`,
)

/* ── Trepar ─────────────────────────────────────────────────────────────────
   "mover hasta tocar la base del obstáculo con su peana. A continuación, se mide
   la altura vertical que desea escalar, consumiendo movimiento"; "Los Vehículos
   no pueden subir... Los Monstruos sí, siempre que quepan físicamente."       */
/* ── Acciones de una unidad ─────────────────────────────────────────────────
   "dispone de 2 acciones"; "una misma acción no puede repetirse durante la
   misma activación"; "una acción de coste 2 consume toda la activación".     */
const actions = figure(
  'Cómo se gastan las 2 acciones',
  'Combinaciones válidas de acciones en una activación',
  462,
  `
  ${head('Economía de acciones', 'Cada activación da 2 acciones. Se gastan de una en una.')}

  ${row(76, 110, {
    tone: 'ok', ok: true, title: 'Dos acciones de coste 1',
    lines: [{ t: 'Moverse y luego Disparar, sin penalización.' }],
    draw: `${chip(40, 122, 130, 'Moverse · 1', C.act)}
      <text class="zl-lab" x="184" y="144" text-anchor="middle" fill="${C.soft}">+</text>
      ${chip(198, 122, 130, 'Disparar · 1', C.act)}`,
  })}

  ${row(198, 110, {
    tone: 'plain', ok: null, title: 'Una acción de coste 2',
    lines: [{ t: 'Correr, Cargar, Atacar CaC y Destrabarse' }, { t: 'se comen la activación entera.' }],
    draw: `${chip(40, 244, 288, 'Correr · 2 acciones', C.dim)}
      ${cap(184, 302, 'no queda nada más que hacer', C.soft)}`,
  })}

  ${row(320, 110, {
    tone: 'ko', ok: false, title: 'La misma acción dos veces',
    lines: [{ t: 'No se puede repetir una acción en la' }, { t: 'misma activación.' }],
    draw: `${chip(40, 366, 130, 'Moverse · 1', C.soft)}
      <text class="zl-lab" x="184" y="388" text-anchor="middle" fill="${C.soft}">+</text>
      ${chip(198, 366, 130, 'Moverse · 1', C.soft)}
      ${cross(263, 383, 13)}`,
  })}`,
)

/* ── Daño en escuadra ───────────────────────────────────────────────────────
   "el jugador poseedor decide qué miniatura recibe el daño... todo el daño se
   aplica a esa miniatura hasta que es eliminada"; el sobrante pasa a otra.   */
const squadDamage = figure(
  'Cómo se reparte el daño en una escuadra',
  'Todo el daño va a una miniatura hasta eliminarla, y el sobrante pasa a otra',
  488,
  `
  ${head('Daño en una escuadra', 'El daño no se reparte: se concentra en la miniatura que elijas.')}

  ${row(76, 150, {
    tone: 'plain', ok: null, title: 'Elige quién lo recibe',
    lines: [
      { t: 'El dueño de la escuadra elige la miniatura' },
      { t: 'y todo el daño del ataque va contra ella.' },
    ],
    draw: `${[60, 100, 140, 180, 220].map((x) => base(x, 172, C.ally, 15)).join('')}
      <line x1="100" y1="124" x2="100" y2="152" stroke="${C.ko}" stroke-width="2.2" marker-end="url(#zl-shot)"/>
      ${cap(100, 210, 'todo el daño aquí', C.ko)}`,
  })}

  ${row(238, 150, {
    tone: 'plain', ok: null, title: 'Si cae y sobra daño',
    lines: [
      { t: 'Solo entonces se elige otra miniatura,' },
      { t: 'y el daño restante continúa en ella.' },
    ],
    draw: `${[60, 100, 140, 180, 220].map((x) => base(x, 334, C.ally, 15)).join('')}
      ${cross(100, 334, 12)}
      <line x1="118" y1="334" x2="140" y2="334" stroke="${C.ko}" stroke-width="2" marker-end="url(#zl-shot)"/>
      ${cap(150, 372, 'el resto pasa aquí', C.ko)}`,
  })}

  ${note(416, 'Un único total', 'Todo el daño del ataque se suma y se asigna de una en una.')}`,
)

/* ── Fase de despliegue ─────────────────────────────────────────────────────
   "Al final de cada turno, una vez calculado el control de los puestos... una
   sola unidad por cada puesto de mando que controle"; "si no está trabado, el
   Capitán puede recibir una miniatura de su tipo"; "se activan a partir del
   turno siguiente".                                                           */
const deploymentPhase = figure(
  'Cómo entran los refuerzos',
  'Despliegue por puestos de mando y por Capitanes, al final del turno',
  520,
  `
  ${head('Fase de despliegue', 'Al final del turno, ya calculado el control, entran unidades desde la Reserva.')}

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
      { t: 'Si no está trabado, el Capitán recibe una' },
      { t: 'miniatura de su tipo en su escuadra.' },
    ],
    draw: `${base(96, 300, C.act)}${cap(96, 338, 'Capitán', C.act)}
      ${base(146, 300, C.ally, 14)}${base(180, 300, C.ally, 14)}
      ${base(230, 300, C.ally, 14)}
      <line x1="200" y1="300" x2="216" y2="300" stroke="${C.ok}" stroke-width="1.8" marker-end="url(#zl-shot)"/>
      ${cap(230, 338, 'se suma', C.ok)}`,
  })}

  ${note(392, 'Actúan el turno siguiente', 'Las unidades que entran ahora no se activan hasta el próximo turno.')}

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
      { t: 'Movimiento, Velocidad, Vidas, Salvación' },
      { t: 'y armas: es un integrante más.' },
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

/* ── Implacable ─────────────────────────────────────────────────────────────
   "Puede volver a tirar los dados que no hayan impactado."; en disparo son los
   que no superan la Precisión y en CaC los 1 y 2.                            */
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

  ${note(372, 'Disparo y cuerpo a cuerpo', 'Vale en los dos: los que no superan la Precisión y los que fallan en CaC.')}`,
)

/* ── Desbordante ────────────────────────────────────────────────────────────
   "Si este ataque destruye a la unidad objetivo y sobra daño, el atacante puede
   aplicar ese sobrante a otra unidad enemiga a 3" o menos de la última
   miniatura eliminada del objetivo."                                          */
const overflow = figure(
  'Cómo funciona un arma Desbordante',
  'El daño que sobra al destruir al objetivo puede pasar a otra unidad enemiga cercana',
  490,
  `
  ${head('Desbordante', 'El daño que sobra al destruir al objetivo no se pierde.')}

  ${row(76, 118, {
    num: '1', title: 'Destruye al objetivo',
    lines: [{ t: 'Le quedaban 2 Vidas y recibe 5 de daño:' }, { t: 'cae y sobran 3.' }],
    draw: `${base(130, 148, C.enemy)}${cross(130, 148, 12)}
      <line x1="40" y1="148" x2="108" y2="148" stroke="${C.ink}" stroke-width="1.8" marker-end="url(#zl-shot)"/>
      ${cap(130, 186, 'sobran 3', C.ko)}`,
  })}

  ${row(208, 206, {
    num: '2', title: 'El sobrante salta',
    lines: [
      { t: 'Puedes aplicarlo a otra unidad enemiga' },
      { t: 'a 3" o menos de la última miniatura' },
      { t: 'eliminada del objetivo.' },
    ],
    draw: `<circle cx="150" cy="318" r="64" fill="rgba(201,88,79,.06)" stroke="${C.ko}" stroke-width="1.5" stroke-dasharray="6 5"/>
      ${base(150, 318, C.enemy)}${cross(150, 318, 11)}
      ${dim(86, 318, 150, 318, '3"', -8)}
      ${base(182, 272, C.enemy, 14)}
      <line x1="160" y1="302" x2="173" y2="285" stroke="${C.ko}" stroke-width="2" marker-end="url(#zl-shot)"/>
      ${cap(250, 276, 'recibe los 3', C.ko)}
      ${base(300, 318, C.enemy, 14)}
      ${cap(300, 352, 'más lejos: no', C.soft)}
      ${cap(150, 402, 'última eliminada', C.soft)}`,
  })}

  ${note(426, 'Solo si sobra', 'Si el objetivo no cae, o cae justo, el ataque no desborda.')}`,
)

const climbing = figure(
  'Trepar obstáculos y la habilidad Brinco',
  'Vista de perfil de una unidad trepando y de otra con Brinco',
  440,
  `
  ${head('Trepar · vista de perfil', 'El movimiento se gasta en horizontal y también en vertical.')}

  ${row(76, 150, {
    tone: 'plain', ok: null, title: 'Trepar',
    lines: [
      { t: '1 · Mueve hasta tocar la base con la peana.' },
      { t: '2 · Mide la altura y réstala del movimiento.' },
    ],
    draw: `${ground(40, 360, 200)}
      <rect x="170" y="130" width="120" height="70" fill="url(#zl-hatch)" stroke="rgba(255,255,255,.28)"/>
      ${pawn(80, 200, C.act)}
      <line x1="96" y1="192" x2="160" y2="192" stroke="${C.act}" stroke-width="2" marker-end="url(#zl-shot)"/>
      ${dim(166, 200, 166, 130, 'altura', 0)}
      ${pawn(230, 130, C.act)}`,
  })}

  ${row(238, 118, {
    tone: 'plain', ok: null, title: 'Brinco',
    lines: [{ t: 'El Asaltante sube en diagonal, sin tocar la' }, { t: 'base del obstáculo primero.' }],
    draw: `${ground(40, 360, 340)}
      <rect x="200" y="276" width="110" height="64" fill="url(#zl-hatch)" stroke="rgba(255,255,255,.28)"/>
      ${pawn(90, 340, C.ally)}
      <line x1="106" y1="326" x2="236" y2="270" stroke="${C.ally}" stroke-width="2" marker-end="url(#zl-shot)"/>
      ${pawn(260, 276, C.ally)}`,
  })}

  ${note(368, 'Vehículos y Monstruos', 'Los Vehículos no suben. Los Monstruos sí, si caben.')}`,
)

/* ── Unidades trabadas y Destrabarse ────────────────────────────────────────
   "Mientras siga trabada, una unidad solo puede Atacar cuerpo a cuerpo o
   Destrabarse"; "Con 3+ deja de estar trabada y puede moverse gratis hasta su
   Movimiento... Con 1 o 2 no consigue liberarse"; "si no existe una posición
   válida... permanece trabada".                                               */
const lockedUnits = figure(
  'Unidades trabadas y la acción Destrabarse',
  'Qué puede hacer una unidad trabada y cómo se destraba',
  544,
  `
  ${head('Unidades trabadas', 'En contacto de peana quedan trabadas hasta que una caiga o consiga Destrabarse.')}

  ${row(76, 124, {
    tone: 'plain', ok: null, title: 'Solo dos acciones disponibles',
    lines: [{ t: 'Nada de Moverse, Correr ni Disparar' }, { t: 'mientras siga trabada.' }],
    draw: `${base(90, 150, C.act)}${base(124, 150, C.enemy)}
      <circle cx="107" cy="150" r="7" fill="none" stroke="${C.soft}" stroke-width="2"/>
      ${chip(170, 122, 130, 'Atacar CaC', C.act)}
      ${chip(170, 164, 130, 'Destrabarse', C.act)}`,
  })}

  ${row(212, 118, {
    tone: 'ok', ok: true, title: 'Destrabarse con 3+',
    lines: [{ t: 'Se libera y se mueve gratis hasta su' }, { t: 'Movimiento, a más de 1" de todo enemigo.' }],
    draw: `${base(100, 280, C.act)}${base(230, 280, C.enemy)}
      <line x1="119" y1="280" x2="208" y2="280" stroke="${C.ok}" stroke-width="2"
            stroke-dasharray="5 4" marker-start="url(#zl-shot)"/>
      ${cap(164, 318, 'se separa', C.ok)}`,
  })}

  ${row(348, 118, {
    tone: 'ko', ok: false, title: 'Destrabarse con 1 o 2',
    lines: [{ t: 'No se libera y su activación termina.' }, { t: 'Destrabarse ya gastó las 2 acciones.' }],
    draw: `${base(140, 416, C.act)}${base(174, 416, C.enemy)}
      <circle cx="157" cy="416" r="7" fill="none" stroke="${C.ko}" stroke-width="2"/>
      ${cap(157, 456, 'sigue trabada', C.ko)}`,
  })}

  ${note(480, 'Sin sitio libre', 'Si no hay posición válida a más de 1" de todo enemigo, sigue trabada.')}`,
)

/* ── Cómo se entra en cuerpo a cuerpo ───────────────────────────────────────
   "La única forma de entrar en combate cuerpo a cuerpo es mediante una carga";
   "fuera de una carga, ninguna unidad puede acercarse a menos de 1\"".        */
const meleeEngagement = figure(
  'La única forma de trabar es cargando',
  'Solo una carga lleva al contacto; moviéndote no puedes acercarte a menos de una pulgada',
  380,
  `
  ${head('Cómo se entra en cuerpo a cuerpo', 'Al contacto solo se llega cargando.')}

  ${row(76, 132, {
    tone: 'ok', ok: true, title: 'Cargando',
    lines: [
      { t: 'La carga lleva al contacto físico: ambas' },
      { t: 'quedan trabadas hasta Destrabarse.' },
    ],
    draw: `${base(120, 152, C.act)}${base(154, 152, C.enemy)}
      <circle cx="137" cy="152" r="7" fill="none" stroke="${C.ok}" stroke-width="2"/>
      ${cap(137, 192, 'peana con peana', C.ok)}`,
  })}

  ${row(220, 136, {
    tone: 'ko', ok: false, title: 'Moviéndote',
    lines: [
      { t: 'Fuera de una carga no puedes acercarte' },
      { t: 'a menos de 1" de una unidad enemiga.' },
    ],
    draw: `${base(105, 296, C.act)}${base(185, 296, C.enemy)}
      ${dim(122, 296, 168, 296, '1" como mínimo', -12)}
      ${cap(145, 336, 'nunca llegas a tocarla', C.soft)}`,
  })}`,
)

/* ── Superioridad ───────────────────────────────────────────────────────────
   "Solo puede cargar contra otro Titán, y solo otro Titán puede trabarlo. Si le
   carga una unidad de otro tipo, esa unidad resuelve su carga y su ataque con
   normalidad y a continuación se retira 1\" del Titán."                        */
const titanMelee = figure(
  'Superioridad: el Titán y el cuerpo a cuerpo',
  'Solo carga y se traba con otro Titán; al resto les deja atacar y los aparta',
  448,
  `
  ${head('Superioridad', 'Un Titán solo carga contra otro Titán, y solo otro Titán puede trabarlo.')}

  ${row(76, 132, {
    tone: 'ok', ok: true, title: 'Titán contra Titán',
    lines: [{ t: 'Es la única carga que puede declarar, y la' }, { t: 'única que lo deja trabado.' }],
    draw: `${base(118, 150, C.act, 22)}${base(166, 150, C.enemy, 22)}
      <circle cx="142" cy="150" r="8" fill="none" stroke="${C.ok}" stroke-width="2"/>
      ${cap(142, 194, 'trabados', C.ok)}`,
  })}

  ${row(220, 136, {
    tone: 'plain', ok: null, title: 'Le carga otra unidad',
    lines: [
      { t: 'Resuelve su carga y su ataque con normalidad' },
      { t: 'y después se retira 1" del Titán.' },
      { t: 'Nadie queda trabado.' },
    ],
    draw: `${base(104, 296, C.enemy, 14)}${base(196, 296, C.act, 22)}
      <line x1="120" y1="296" x2="168" y2="296" stroke="${C.enemy}" stroke-width="2" marker-end="url(#zl-shot)"/>
      ${dim(118, 332, 170, 332, 'se retira 1"', -10)}
      ${cap(62, 300, 'carga', C.enemy)}`,
  })}

  ${note(372, 'Nunca trabado', 'Como no queda trabado, sigue usando sus acciones y sigue a tiro.')}`,
)

/* ── Atacar con una escuadra ────────────────────────────────────────────────
   "todos sus integrantes, Capitán incluido, suman sus dados en un solo ataque
   contra el mismo objetivo. A distancia, solo aportan dados los integrantes que
   tengan línea de visión y alcance. Si una carga alcanza a un integrante y tiene
   éxito, toda la escuadra queda trabada".                                     */
const squadAttack = figure(
  'Cómo ataca una escuadra',
  'Todos los integrantes suman sus dados en un solo ataque',
  450,
  `
  ${head('Atacar con una escuadra', 'Todos los integrantes, Capitán incluido, atacan juntos.')}

  ${row(76, 150, {
    tone: 'plain', ok: null, title: 'Traba la escuadra entera',
    lines: [
      { t: 'Si una carga alcanza a un integrante y' },
      { t: 'tiene éxito, toda la escuadra queda trabada.' },
    ],
    draw: `${base(100, 130, C.ally)}${base(100, 172, C.ally)}${base(140, 151, C.ally)}
      ${base(180, 151, C.ally)}
      ${base(214, 151, C.enemy)}
      <circle cx="197" cy="151" r="7" fill="none" stroke="${C.soft}" stroke-width="2"/>
      ${cap(140, 208, 'Toda la escuadra combate', C.ally)}`,
  })}

  ${row(238, 136, {
    tone: 'plain', ok: null, title: 'Un solo ataque',
    lines: [{ t: 'Todos suman sus dados en un único ataque' }, { t: 'contra el mismo objetivo.' }],
    draw: `${base(80, 296, C.ally, 14)}${base(80, 340, C.ally, 14)}${base(114, 318, C.act, 14)}
      <line x1="132" y1="318" x2="228" y2="318" stroke="${C.act}" stroke-width="2.5" marker-end="url(#zl-shot)"/>
      ${base(250, 318, C.enemy)}
      ${cap(97, 362, 'Capitán incluido', C.act)}`,
  })}

  ${note(386, 'A distancia', 'Solo aportan dados los integrantes con línea de visión y alcance.')}`,
)

/* ── Mover una escuadra ─────────────────────────────────────────────────────
   "La escuadra se mueve desde el Capitán: primero se mueve él y después el resto
   se coloca a su alrededor, en coherencia. Ninguna miniatura puede quedar más
   lejos de lo que le permitiría su propio movimiento."                       */
const squadMovement = figure(
  'Cómo se mueve una escuadra',
  'Primero el Capitán y después el resto de miniaturas a su alrededor',
  440,
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
  })}`,
)

/* ── Disparar a Vehículos y Monstruos trabados ─────────────────────────────
   "La excepción son los Vehículos y Monstruos, que sí pueden ser atacados a
   distancia aunque estén trabados."                                           */
const vehicleMelee = figure(
  'Disparar a unidades trabadas',
  'Quién puede recibir disparos mientras está en combate cuerpo a cuerpo',
  440,
  `
  ${head('Disparar a unidades trabadas', 'Las unidades en combate están a salvo del fuego externo… con una excepción.')}

  ${row(76, 134, {
    tone: 'ko', ok: false, title: 'Regla general',
    lines: [{ t: 'Una unidad trabada no puede ser atacada' }, { t: 'a distancia desde fuera del combate.' }],
    draw: `${base(100, 152, C.ally)}${base(144, 152, C.enemy)}
      <circle cx="122" cy="152" r="7" fill="none" stroke="${C.soft}" stroke-width="2"/>
      ${base(300, 122, C.enemy, 14)}
      <line x1="284" y1="128" x2="176" y2="146" stroke="${C.ko}" stroke-width="1.8" stroke-dasharray="5 4"/>
      ${cross(230, 138, 9)}
      ${cap(122, 194, 'trabadas', C.soft)}`,
  })}

  ${row(222, 134, {
    tone: 'ok', ok: true, title: 'Vehículos y Monstruos',
    lines: [{ t: 'Son la excepción: sí pueden ser atacados' }, { t: 'a distancia aunque estén trabados.' }],
    draw: `${base(104, 298, C.act, 24)}${base(152, 298, C.enemy)}
      <circle cx="129" cy="298" r="7" fill="none" stroke="${C.soft}" stroke-width="2"/>
      ${base(300, 266, C.enemy, 14)}
      <line x1="284" y1="272" x2="180" y2="290" stroke="${C.ok}" stroke-width="1.8" marker-end="url(#zl-shot)"/>
      ${cap(104, 344, 'Vehículo o Monstruo', C.act)}`,
  })}

  ${note(368, 'Y al revés', 'Con Fuego de apoyo, el Vehículo pesado sí puede Disparar estando trabado.')}`,
)

/* ── Resolución del combate cuerpo a cuerpo ─────────────────────────────────
   "Los resultados de 1 y 2 se consideran fallos. Un resultado de 6 es un impacto
   crítico"; el defensor tira Salvación por impacto; los no bloqueados infligen el
   daño base o crítico. El CaC no usa Precisión: por eso va aparte del disparo.  */
const meleeSequence = figure(
  'La secuencia de un ataque cuerpo a cuerpo',
  'Los cuatro pasos de un ataque cuerpo a cuerpo',
  536,
  `
  ${head('Secuencia de combate cuerpo a cuerpo', 'Ojo: aquí no se usa Precisión. Los 1 y los 2 fallan siempre.')}

  ${row(76, 76, {
    num: '1', title: 'Lanza los Ataques',
    lines: [{ t: 'Los dados del arma de cuerpo a cuerpo.' }],
  })}

  ${row(164, 120, {
    num: '2', title: 'Lee los dados',
    lines: [{ t: '1 y 2 fallan · 3, 4 y 5 impactan · 6 crítico' }, { t: 'No interviene la Precisión del arma.' }],
    draw: `${[1, 2].map((n, i) => `
      <rect x="${86 + i * 42}" y="212" width="34" height="34" rx="7" fill="#2a1a18" stroke="${C.ko}"/>
      <text class="zl-val" x="${103 + i * 42}" y="235" text-anchor="middle" fill="${C.ko}">${n}</text>`).join('')}
      ${[3, 4, 5].map((n, i) => `
      <rect x="${180 + i * 42}" y="212" width="34" height="34" rx="7" fill="#1d2a19" stroke="${C.ok}"/>
      <text class="zl-val" x="${197 + i * 42}" y="235" text-anchor="middle" fill="${C.ok}">${n}</text>`).join('')}
      <rect x="316" y="212" width="34" height="34" rx="7" fill="#231f14" stroke="${C.act}"/>
      <text class="zl-val" x="333" y="235" text-anchor="middle" fill="${C.act}">6</text>`,
  })}

  ${row(296, 76, {
    num: '3', title: 'El defensor salva',
    lines: [{ t: 'Un dado de Salvación por impacto recibido.' }],
  })}

  ${row(384, 76, {
    num: '4', title: 'Aplica el daño',
    lines: [{ t: 'Daño base, o crítico si el impacto lo fue.' }],
  })}

  ${note(472, 'Habilidades que la cambian', 'Implacable repite los fallos del paso 2 y Golpe crítico anula el 3 en los críticos.')}`,
)

/* ── Modificadores ──────────────────────────────────────────────────────────
   "+1 al valor de Precisión: el número necesario sube — es peor para el atacante";
   "-1 ... es una ventaja"; "lo peor que puede quedar es 6+: un 6 siempre
   funciona. Y... lo mejor que puede quedar es 2+: un 1 siempre falla."        */
const modifiers = figure(
  'Cómo funcionan los modificadores',
  'Escala de 3+, 4+ y 5+ y dirección de los modificadores',
  428,
  `
  ${head('Modificadores', 'Un +1 sube el número que necesitas: es peor. Un -1 lo baja: es mejor.')}

  ${row(76, 120, {
    tone: 'plain', ok: null, title: 'Qué significa 4+',
    lines: [{ t: 'El resultado mínimo que necesitas en 1D6.' }, { t: 'Con 4+ aciertas con 4, 5 y 6: la mitad.' }],
    draw: `${[1, 2, 3].map((n, i) => `
      <rect x="${60 + i * 40}" y="140" width="32" height="32" rx="7" fill="#22242c" stroke="rgba(255,255,255,.18)"/>
      <text class="zl-val" x="${76 + i * 40}" y="162" text-anchor="middle" fill="${C.soft}">${n}</text>`).join('')}
      ${[4, 5, 6].map((n, i) => `
      <rect x="${188 + i * 40}" y="140" width="32" height="32" rx="7" fill="#1d2a19" stroke="${C.ok}"/>
      <text class="zl-val" x="${204 + i * 40}" y="162" text-anchor="middle" fill="${C.ok}">${n}</text>`).join('')}
      ${cap(160, 194, '4+ · tres de cada seis', C.soft)}`,
  })}

  ${row(208, 128, {
    tone: 'plain', ok: null, title: 'La dirección engaña',
    lines: [{ t: 'El +1 y el -1 mueven el número, no la suerte.' }, { t: 'Igual para Precisión y para Salvación.' }],
    draw: `${chip(56, 254, 74, '3+', C.ok)}
      <line x1="140" y1="271" x2="172" y2="271" stroke="${C.ok}" stroke-width="2" marker-start="url(#zl-shot)"/>
      ${chip(178, 254, 74, '4+', C.act)}
      <line x1="262" y1="271" x2="294" y2="271" stroke="${C.ko}" stroke-width="2" marker-end="url(#zl-shot)"/>
      ${chip(300, 254, 74, '5+', C.ko)}
      <text class="zl-dim" x="93" y="312" text-anchor="middle" fill="${C.ok}">−1 · mejor</text>
      <text class="zl-dim" x="337" y="312" text-anchor="middle" fill="${C.ko}">+1 · peor</text>`,
  })}

  ${note(348, 'Topes', 'Lo peor es 6+ y lo mejor 2+: un 6 siempre funciona y un 1 siempre falla.')}`,
)

export const RULES_DIAGRAMS = {
  squadCoherenceDiagram: squadCoherence,
  lineOfSightDiagram: lineOfSight,
  chargeDiagram: charge,
  coverDiagram: cover,
  commandPostDiagram: commandPost,
  measurementDiagram: measurement,
  turnStructureDiagram: turnStructure,
  activationDiagram: activation,
  rangedSequenceDiagram: rangedSequence,
  climbingDiagram: climbing,
  actionsDiagram: actions,
  squadDamageDiagram: squadDamage,
  squadMovementDiagram: squadMovement,
  deploymentPhaseDiagram: deploymentPhase,
  captainSquadDiagram: captainSquad,
  titanMeleeDiagram: titanMelee,
  overflowDiagram: overflow,
  relentlessDiagram: relentless,
  meleeEngagementDiagram: meleeEngagement,
  lockedUnitsDiagram: lockedUnits,
  squadAttackDiagram: squadAttack,
  vehicleMeleeDiagram: vehicleMelee,
  meleeSequenceDiagram: meleeSequence,
  modifiersDiagram: modifiers,
}
