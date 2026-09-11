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
const note = (y, title, text) => `
  <rect x="0" y="${y}" width="${W}" height="52" rx="10" fill="rgba(255,255,255,.025)" stroke="rgba(255,255,255,.08)"/>
  <text class="zl-lab" x="22" y="${y + 32}">${title}</text>
  <text class="zl-body" x="250" y="${y + 32}">${text}</text>`

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
  'Coherencia de escuadra en Gran Batalla',
  'Formaciones válidas de una escuadra y un caso con la cadena rota',
  664,
  `
  ${head('Coherencia de escuadra · Gran Batalla', 'Cada miniatura debe estar a 1" o menos de al menos otra de la misma escuadra.')}

  ${row(76, 124, {
    tone: 'ok', ok: true, title: 'En línea',
    lines: [{ t: 'Mientras cada eslabón mida 1" o menos,' }, { t: 'la cadena aguanta.' }],
    draw: `${[0, 1, 2, 3].map((i) => base(70 + i * 48, 148, C.ally)).join('')}
      ${[0, 1, 2].map((i) => `<line x1="${87 + i * 48}" y1="148" x2="${101 + i * 48}" y2="148" stroke="${C.ally}" stroke-width="1.6" stroke-dasharray="3 3"/>`).join('')}
      <text class="zl-dim" x="142" y="185" text-anchor="middle">cada enlace ≤ 1"</text>`,
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
  })}`,
)

/* ── Línea de visión ────────────────────────────────────────────────────────
   "tiene línea de visión si puede verse cualquier parte de la miniatura objetivo";
   "si una miniatura (aliada o enemiga) o un elemento de escenografía bloquea
   completamente la visión, el objetivo no puede ser atacado a distancia."     */
const lineOfSight = figure(
  'Línea de visión: visible, bloqueada por escenografía y bloqueada por otra miniatura',
  'Tres casos de línea de visión',
  520,
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
    tone: 'ko', ok: false, title: 'La tapa la escenografía',
    lines: [{ t: 'No se ve ninguna parte del objetivo.' }, { t: 'No puede ser atacado.', cls: 'zl-lab', fill: C.ko }],
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
  })}`,
)

/* ── Cargar ─────────────────────────────────────────────────────────────────
   "Si el movimiento le permite alcanzar al objetivo, coloca la miniatura en
   contacto de peana y lanza 1D6: con 3+ ... con 1 o 2 ... retira la miniatura
   hasta 1" del objetivo, sin trabar y sin atacar."
   El ejemplo de Movimiento 5" + Velocidad +2" y enemigo a 6" es el del reglamento. */
const charge = figure(
  'La acción Cargar y su tirada de 1D6',
  'Secuencia de la acción Cargar con sus dos resultados',
  530,
  `
  ${head('Cargar', 'Consume 2 acciones. Se mueve hasta Movimiento + Velocidad hacia el objetivo.')}

  ${row(76, 140, {
    tone: 'plain', ok: null, title: '1 · Declara y mueve',
    lines: [{ t: 'Movimiento 5" + Velocidad +2" = 7"' }, { t: 'Alcanza el contacto de peana.', cls: 'zl-lab' }],
    draw: `${base(66, 170, C.act)}${cap(66, 204, 'Activa', C.act)}
      ${base(320, 170, C.enemy)}${cap(320, 204, 'Objetivo', C.enemy)}
      <line x1="85" y1="170" x2="300" y2="170" stroke="${C.act}" stroke-width="2.5" marker-end="url(#zl-shot)"/>
      ${dim(66, 136, 320, 136, 'Objetivo a 6"')}`,
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
  })}`,
)

/* ── Cobertura ──────────────────────────────────────────────────────────────
   "la unidad debe estar con su peana en contacto directo con el elemento";
   "Si el atacante tiene línea de visión limpia a la unidad completa ... no hay
   cobertura, aunque la unidad esté en contacto físico con dicho elemento."    */
const cover = figure(
  'Cuándo hay cobertura y cuándo no',
  'Tres casos de cobertura',
  520,
  `
  ${head('Cobertura', 'Hacen falta dos cosas: peana en contacto con el elemento y que el elemento se interponga.')}

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
    tone: 'ko', ok: false, title: 'Tiro limpio',
    lines: [
      { t: 'Ve la unidad completa sin que el elemento' },
      { t: 'se interponga: no hay cobertura.' },
    ],
    draw: `${base(66, 452, C.act)}${cap(66, 486, 'Atacante', C.act)}
      ${base(300, 452, C.enemy)}${cap(300, 416, 'Objetivo', C.enemy)}
      ${wall(319, 432, 22, 40)}
      <line x1="83" y1="452" x2="280" y2="452" stroke="${C.ink}" stroke-width="1.8" marker-end="url(#zl-shot)"/>`,
  })}`,
)

/* ── Control de un puesto de mando ──────────────────────────────────────────
   "el control lo obtiene el jugador cuyas unidades sumen más valor total";
   "Las unidades ... en combate cuerpo a cuerpo dentro de un puesto de mando no
   cuentan para el cálculo"; "En caso de empate, el puesto permanece bajo el
   control de quien lo tuviera."                                              */
const commandPost = figure(
  'Cómo se decide el control de un puesto de mando',
  'Cálculo del control de un puesto de mando por Valor',
  400,
  `
  ${head('Control de un puesto de mando · al final del turno', 'Lo controla quien sume más Valor en él.')}

  <rect x="0" y="76" width="${W}" height="256" rx="10" fill="rgba(255,255,255,.025)" stroke="rgba(255,255,255,.08)"/>
  <text class="zl-mini" x="186" y="108" text-anchor="middle" fill="${C.dim}">Puesto de mando</text>
  <circle cx="186" cy="210" r="78" fill="rgba(230,201,131,.05)" stroke="${C.dim}" stroke-width="1.5" stroke-dasharray="6 5"/>
  ${base(186, 145, C.ally)}<text class="zl-val" x="220" y="140">2</text>
  ${base(118, 246, C.ally)}<text class="zl-val" x="82" y="274">4</text>
  ${base(264, 163, C.enemy)}<text class="zl-val" x="298" y="158">3</text>
  ${base(186, 262, C.ally, 14)}${base(218, 262, C.enemy, 14)}
  <circle cx="202" cy="262" r="6" fill="none" stroke="${C.soft}" stroke-width="1.6"/>
  ${cap(202, 308, 'No cuentan · trabadas en CaC', C.soft)}

  <rect x="396" y="112" width="196" height="54" rx="8" fill="rgba(111,159,216,.1)" stroke="${C.ally}"/>
  <circle cx="422" cy="139" r="9" fill="${C.ally}"/>
  <text class="zl-body" x="442" y="136">2 + 4</text>
  <text class="zl-val" x="570" y="148" text-anchor="end" font-size="26" fill="${C.ally}">6</text>

  <rect x="396" y="180" width="196" height="54" rx="8" fill="rgba(192,107,94,.1)" stroke="${C.enemy}"/>
  <circle cx="422" cy="207" r="9" fill="${C.enemy}"/>
  <text class="zl-body" x="442" y="204">3</text>
  <text class="zl-val" x="570" y="216" text-anchor="end" font-size="26" fill="${C.enemy}">3</text>

  <circle cx="630" cy="139" r="14" fill="#1d2a19" stroke="${C.ok}" stroke-width="2"/>
  <text class="zl-mini" x="630" y="144" text-anchor="middle" fill="${C.ok}">SÍ</text>
  <text class="zl-lab" x="654" y="145" fill="${C.ok}">Controla</text>
  <text class="zl-lab" x="654" y="167" fill="${C.ok}">el azul</text>

  <text class="zl-body" x="396" y="272">En caso de empate, el puesto sigue</text>
  <text class="zl-body" x="396" y="298">bajo el control de quien lo tuviera.</text>`,
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
   "1. Fase de Iniciativa, 2. Fase de Activaciones, 3. Fin de Turno ... comienza
   un nuevo turno empezando de nuevo por la Fase de Iniciativa."              */
const turnStructure = figure(
  'Las tres fases de un turno',
  'Flujo del turno: iniciativa, activaciones y fin de turno',
  456,
  `
  ${head('Estructura del turno', 'Cada turno sigue siempre las mismas tres fases.')}

  ${row(76, 96, {
    num: '1', title: 'Fase de Iniciativa',
    lines: [{ t: 'Cada jugador tira 1D6; el más alto actúa' }, { t: 'primero. También se despliega desde Reserva.' }],
  })}

  ${row(184, 96, {
    num: '2', title: 'Fase de Activaciones',
    lines: [{ t: 'Alternan activaciones, una unidad cada vez.' }, { t: 'Cada unidad dispone de hasta 2 acciones.' }],
  })}

  ${row(292, 96, {
    num: '3', title: 'Fin de Turno',
    lines: [{ t: 'Cuando todas las unidades se han activado.' }, { t: 'Se resuelven efectos y se cuentan puntos.' }],
  })}

  <path d="M${W - 30} 392 L${W - 30} 414 L12 414 L12 124" fill="none" stroke="${C.dim}" stroke-width="1.4"
        stroke-dasharray="5 4" marker-end="url(#zl-dim)"/>
  <text class="zl-dim" x="${W / 2}" y="438" text-anchor="middle">y vuelve a empezar</text>`,
)

/* ── Token de activación ────────────────────────────────────────────────────
   "cara naranja = activada, cara gris = sin activar"; "Una vez activada, no puede
   volver a activarse durante ese turno"; "Al inicio de cada turno se voltean todos
   los tokens a la cara gris."                                                */
const activation = figure(
  'El token de activación',
  'Cómo se marca que una unidad ya se ha activado',
  300,
  `
  ${head('Activar una unidad', 'Hasta 2 acciones. Una vez activada, no vuelve a activarse en ese turno.')}

  ${row(76, 132, {
    tone: 'plain', ok: null, title: 'El token lleva la cuenta',
    lines: [
      { t: 'Cara gris: aún no se ha activado.' },
      { t: 'Cara naranja: ya lo hizo, no repite turno.' },
    ],
    draw: `<circle cx="110" cy="158" r="26" fill="#1b1d25" stroke="${C.soft}" stroke-width="2.5"/>
      ${cap(110, 200, 'Sin activar', C.soft)}
      <line x1="150" y1="158" x2="196" y2="158" stroke="${C.act}" stroke-width="2" marker-end="url(#zl-shot)"/>
      <circle cx="240" cy="158" r="26" fill="#2a1f10" stroke="#e08b2d" stroke-width="2.5"/>
      ${cap(240, 200, 'Activada', '#e08b2d')}`,
  })}

  ${note(220, 'Al empezar el turno', 'Se voltean todos los tokens a la cara gris.')}`,
)

/* ── Secuencia de ataque a distancia ────────────────────────────────────────
   Los cinco pasos, literales del reglamento.                                 */
const rangedSequence = figure(
  'La secuencia de un ataque a distancia',
  'Los cinco pasos de un ataque a distancia',
  400,
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
  <text class="zl-body" x="456" y="266">si el impacto fue crítico.</text>`,
)

/* ── Trepar y Vuelo ─────────────────────────────────────────────────────────
   "mover hasta tocar la base del obstáculo con su peana. A continuación, se mide
   la altura vertical que desea escalar, consumiendo movimiento"; "Las unidades con
   Vuelo pueden subir obstáculos de manera diagonal"; "Los Vehículos no pueden
   subir... Los Monstruos sí, siempre que quepan físicamente en el espacio."   */
const climbing = figure(
  'Trepar obstáculos y la habilidad Vuelo',
  'Vista de perfil de una unidad trepando y de otra con Vuelo',
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
    tone: 'plain', ok: null, title: 'Vuelo',
    lines: [{ t: 'Sube en diagonal, sin tocar la base primero.' }],
    draw: `${ground(40, 360, 340)}
      <rect x="200" y="276" width="110" height="64" fill="url(#zl-hatch)" stroke="rgba(255,255,255,.28)"/>
      ${pawn(90, 340, C.ally)}
      <line x1="106" y1="326" x2="236" y2="270" stroke="${C.ally}" stroke-width="2" marker-end="url(#zl-shot)"/>
      ${pawn(260, 276, C.ally)}`,
  })}

  ${note(368, 'Vehículos y Monstruos', 'Los Vehículos no suben. Los Monstruos sí, si caben.')}`,
)

/* ── Unidades trabadas y Destrabarse ────────────────────────────────────────
   "Mientras siga trabada, una unidad solo puede usar las acciones Atacar cuerpo a
   cuerpo o Destrabarse"; "Con 4+ deja de estar trabada... Con 1, 2 o 3 pierde
   todas sus acciones y su activación termina."                               */
const lockedUnits = figure(
  'Unidades trabadas y la acción Destrabarse',
  'Qué puede hacer una unidad trabada y cómo se destraba',
  480,
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
    tone: 'ok', ok: true, title: 'Destrabarse con 4+',
    lines: [{ t: 'Deja de estar trabada y usa su acción restante' }, { t: 'con normalidad, a más de 1" de todo enemigo.' }],
    draw: `${base(100, 280, C.act)}${base(230, 280, C.enemy)}
      <line x1="119" y1="280" x2="208" y2="280" stroke="${C.ok}" stroke-width="2"
            stroke-dasharray="5 4" marker-start="url(#zl-shot)"/>
      ${cap(164, 318, 'se separa', C.ok)}`,
  })}

  ${row(348, 118, {
    tone: 'ko', ok: false, title: 'Destrabarse con 1, 2 o 3',
    lines: [{ t: 'No se libera: pierde todas sus acciones' }, { t: 'y su activación termina de inmediato.' }],
    draw: `${base(140, 416, C.act)}${base(174, 416, C.enemy)}
      <circle cx="157" cy="416" r="7" fill="none" stroke="${C.ko}" stroke-width="2"/>
      ${cap(157, 456, 'sigue trabada', C.ko)}`,
  })}`,
)

/* ── Combate cuerpo a cuerpo en escuadras ───────────────────────────────────
   "En cuanto una miniatura de la escuadra entra en contacto de peana con una unidad
   enemiga, la escuadra entera se considera trabada y todas sus miniaturas participan";
   "al realizar un ataque cuerpo a cuerpo debe elegir una única escuadra objetivo". */
const squadMelee = figure(
  'Combate cuerpo a cuerpo en escuadras',
  'Una miniatura en contacto traba a toda la escuadra',
  400,
  `
  ${head('Cuerpo a cuerpo en escuadras · Gran Batalla', 'Basta con que una miniatura toque al enemigo.')}

  ${row(76, 150, {
    tone: 'plain', ok: null, title: 'Traba la escuadra entera',
    lines: [
      { t: 'Con una sola miniatura en contacto, todas' },
      { t: 'participan y atacan de forma conjunta.' },
    ],
    draw: `${base(100, 130, C.ally)}${base(100, 172, C.ally)}${base(140, 151, C.ally)}
      ${base(180, 151, C.ally)}
      ${base(214, 151, C.enemy)}
      <circle cx="197" cy="151" r="7" fill="none" stroke="${C.soft}" stroke-width="2"/>
      ${cap(140, 208, 'Toda la escuadra combate', C.ally)}`,
  })}

  ${row(238, 136, {
    tone: 'plain', ok: null, title: 'Un solo objetivo',
    lines: [{ t: 'Aunque toque a varias escuadras enemigas,' }, { t: 'debe elegir una única como objetivo.' }],
    draw: `${base(120, 322, C.ally)}
      ${base(154, 300, C.enemy)}${base(154, 346, C.enemy)}
      <line x1="140" y1="312" x2="146" y2="306" stroke="${C.act}" stroke-width="2.5" marker-end="url(#zl-shot)"/>
      ${cap(228, 305, 'elige este', C.act)}`,
  })}`,
)

/* ── Vehículos y Monstruos trabados ─────────────────────────────────────────
   "pueden usar sus acciones con libertad: Disparar, Atacar cuerpo a cuerpo, o
   cualquier combinación"; "pueden ser atacadas a distancia aunque estén trabadas". */
const vehicleMelee = figure(
  'Vehículos y Monstruos en combate cuerpo a cuerpo',
  'Excepciones de Vehículos y Monstruos al estar trabados',
  380,
  `
  ${head('Vehículos y Monstruos trabados', 'No quedan bloqueados como el resto de unidades.')}

  ${row(76, 132, {
    tone: 'ok', ok: true, title: 'Siguen usando sus acciones',
    lines: [{ t: 'Disparar, Atacar cuerpo a cuerpo o cualquier' }, { t: 'combinación. El jugador decide.' }],
    draw: `${base(110, 158, C.act, 24)}${base(154, 158, C.enemy)}
      <circle cx="133" cy="158" r="7" fill="none" stroke="${C.soft}" stroke-width="2"/>
      <line x1="140" y1="176" x2="330" y2="196" stroke="${C.ink}" stroke-width="1.8" marker-end="url(#zl-shot)"/>
      ${cap(110, 200, 'Vehículo', C.act)}`,
  })}

  ${row(220, 132, {
    tone: 'ko', ok: false, title: 'Y pueden ser disparados',
    lines: [{ t: 'Es la excepción: el resto de unidades trabadas' }, { t: 'no pueden ser atacadas a distancia.' }],
    draw: `${base(110, 302, C.act, 24)}${base(154, 302, C.enemy)}
      <circle cx="133" cy="302" r="7" fill="none" stroke="${C.soft}" stroke-width="2"/>
      ${base(320, 264, C.enemy)}
      <line x1="303" y1="272" x2="140" y2="292" stroke="${C.ko}" stroke-width="1.8" marker-end="url(#zl-shot)"/>
      ${cap(110, 344, 'Vehículo', C.act)}`,
  })}`,
)

/* ── Resolución del combate cuerpo a cuerpo ─────────────────────────────────
   "Los resultados de 1 y 2 se consideran fallos. Un resultado de 6 es un impacto
   crítico"; el defensor tira Salvación por impacto; los no bloqueados infligen el
   daño base o crítico. El CaC no usa Precisión: por eso va aparte del disparo.  */
const meleeSequence = figure(
  'La secuencia de un ataque cuerpo a cuerpo',
  'Los cuatro pasos de un ataque cuerpo a cuerpo',
  480,
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
  })}`,
)

/* ── Modificadores ──────────────────────────────────────────────────────────
   "+1 al valor de Precisión: el número necesario sube — es peor para el atacante";
   "-1 ... es una ventaja"; "ninguna unidad puede llegar a necesitar más de 6+";
   "Un resultado de 1 siempre falla la salvación. Un resultado de 6 siempre impacta." */
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

  ${note(348, 'Topes', 'Nunca más de 6+. El 1 siempre falla; el 6 siempre impacta.')}`,
)

/* ── Ventaja de Clase ───────────────────────────────────────────────────────
   "cuando una unidad ataca a una clase sobre la que tiene ventaja y el ataque
   inflige daño, suma +1 al daño total final del ataque. Se aplica igual en
   Escaramuza y en Gran Batalla."                                             */
const classAdvantage = figure(
  'Cómo se aplica la Ventaja de Clase',
  'La ventaja de clase suma +1 al daño total del ataque',
  330,
  `
  ${head('Ventaja de Clase', 'Cada clase tiene su presa: mira la columna Fuerte contra en Tipos de unidad.')}

  ${row(76, 132, {
    tone: 'ok', ok: true, title: 'El ataque ya ha hecho daño',
    lines: [
      { t: 'Solo entonces se suma.' },
      { t: '+1 al daño total final del ataque.', cls: 'zl-lab', fill: C.ok },
    ],
    draw: `${base(70, 158, C.act)}${cap(70, 192, 'Atacante', C.act)}
      ${base(230, 158, C.enemy)}${cap(230, 192, 'Su presa', C.enemy)}
      <line x1="88" y1="158" x2="210" y2="158" stroke="${C.ink}" stroke-width="1.8" marker-end="url(#zl-shot)"/>
      <text class="zl-dim" x="149" y="146" text-anchor="middle">daño + 1</text>`,
  })}

  ${note(220, 'Una sola vez', 'Al daño total del ataque, no a cada impacto.')}

  ${note(284, 'Los Héroes', 'No tienen ventaja de clase sobre nadie.')}`,
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
  lockedUnitsDiagram: lockedUnits,
  squadMeleeDiagram: squadMelee,
  vehicleMeleeDiagram: vehicleMelee,
  meleeSequenceDiagram: meleeSequence,
  modifiersDiagram: modifiers,
  classAdvantageDiagram: classAdvantage,
}
