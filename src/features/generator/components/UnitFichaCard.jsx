import { forwardRef, useId, useImperativeHandle, useRef } from 'react'
import { getAbilityDescription, getAbilityLabel } from '../../../utils/abilities.js'
import { resolveUnitSpecialtyDescription } from '../../../utils/unitSpecialties.js'
import { getUnitClassToken } from '../unitTypeBadges.js'
import { getCardPalette, unitIconMarkup } from '../../cards/unitIcons.js'
import {
  CARD_H, CARD_ICONS, CARD_W, FONT, INK, INK_SOFT, NIGHT, PANEL, PAPER,
  bottomRounded, cham, fitSize, layoutTextBlocks, measureText, octo, rasterizeCardSvg, useCardFonts, wrapText,
} from '../../cards/cardKit.js'

// ─── Geometría (lienzo de 1536 × 1024) ────────────────────────────────────
const LEFT = { x: 16, y: 14, w: 744, h: 996 }
const RIGHT = { x: 784, y: 14, w: 738, h: 996 }
const ART = { x: 34, y: 168, w: 706, h: 476, c: 22 }
const STATS = { x: 34, y: 656, w: 706, h: 120, c: 18 }
const ABILITY = { x: 18, y: 792, w: 740, h: 216 }
const WEAPON_TOP = 36
const WEAPON_GAP = 24
const WEAPON_HEIGHT = 928

const STAT_CELLS = [
  { key: 'movimiento', label: 'Mov' },
  { key: 'vidas', label: 'Vidas' },
  { key: 'defensa', label: 'Defensa' },
  { key: 'escuadra', label: 'Escuadra' },
]

const SHOOTING_COLUMNS = [
  { key: 'ataques', label: 'Ataques', x: 824, w: 221 },
  { key: 'alcance', label: 'Alcance', x: 1045, w: 221 },
  { key: 'precision', label: 'Precisión', x: 1266, w: 222 },
]
const MELEE_COLUMNS = [
  { key: 'ataques', label: 'Ataques', x: 824, w: 332 },
  { key: 'precision', label: 'Precisión', x: 1156, w: 332 },
]
const TABLE_X0 = SHOOTING_COLUMNS[0].x
const TABLE_X1 = SHOOTING_COLUMNS.at(-1).x + SHOOTING_COLUMNS.at(-1).w
const TABLE_H = 108
const TABLE_HEAD_H = 32
const NOTES_W = TABLE_X1 - TABLE_X0 - 56

const DASH = '—'

const show = (value) => {
  if (value === null || value === undefined) return DASH
  const text = String(value).trim()
  return text && text !== '-' ? text : DASH
}

/** Escuadra: un número, o un guion si la unidad no puede formar escuadra. */
const formatEscuadra = (escuadra) => (Number(escuadra) > 0 ? String(Number(escuadra)) : DASH)

const abilityList = (weapon) =>
  (Array.isArray(weapon?.habilidades_arma) ? weapon.habilidades_arma : []).filter(Boolean)

/** "Héroe, Especial" → ['Héroe', 'Especial']; "Soldado" → ['Soldado']. */
const splitRol = (rol) => String(rol || '').split(',').map((part) => part.trim()).filter(Boolean)

/* ── Piezas ─────────────────────────────────────────────────────────────── */

function Txt({ x, y, size, family = FONT.label, weight = 700, fill = '#f2f0eb', anchor = 'middle', ls = 0, children }) {
  return (
    <text x={x} y={y} fontSize={size} fontFamily={family} fontWeight={weight} fill={fill} textAnchor={anchor} letterSpacing={ls}>
      {children}
    </text>
  )
}

/** Cabecera de sección: insignia octogonal y banda negra con punta. */
function SectionBanner({ cy, label, icon, palette }) {
  const text = label.toUpperCase()
  const width = measureText(text, { size: 30, family: FONT.label, weight: 700, ls: 1.2 })
  const x0 = 862
  const x1 = 894 + width + 26
  return (
    <g>
      <path d={`M${x0} ${cy - 23}H${x1}L${x1 + 22} ${cy}L${x1} ${cy + 23}H${x0}Z`} fill="#121216" stroke={palette.border} strokeWidth="1.6" />
      <Txt x={894} y={cy + 10} size={30} anchor="start" ls={1.2}>{text}</Txt>
      <polygon points={octo(850, cy, 38)} fill="#121216" stroke={palette.border} strokeWidth="2.5" />
      <g transform={`translate(832 ${cy - 18}) scale(${36 / 32})`} fill={palette.highlight}>
        <path d={CARD_ICONS[icon]} fillRule="evenodd" />
      </g>
    </g>
  )
}

/** Cada arma conserva sus habilidades, incluso si otra arma también las tiene. */
const weaponNotes = (weapon) => [...new Set(abilityList(weapon))].map((ability) => ({
  title: getAbilityLabel(ability),
  text: getAbilityDescription(ability),
}))

const notesHeight = (notes) => notes.reduce((height, note, index) => {
  const lines = wrapText(note.text, NOTES_W, { size: 24, family: FONT.body, weight: 400 })
  return height + (index ? 18 : 0) + 24 * 1.08 * 1.1 + (lines.length ? 10 : 0) + lines.length * 24 * 1.36
}, 0)

/** Reparte el espacio por contenido; un arma ausente solo necesita una línea. */
const weaponSectionHeights = (shooting, melee) => {
  if (!shooting && !melee) return [156, 156]
  if (!shooting) return [156, WEAPON_HEIGHT - 156]
  if (!melee) return [WEAPON_HEIGHT - 156, 156]
  const shootingText = Math.max(48, notesHeight(weaponNotes(shooting)))
  const meleeText = Math.max(48, notesHeight(weaponNotes(melee)))
  const shootingHeight = Math.round(236 + (WEAPON_HEIGHT - 472) * shootingText / (shootingText + meleeText))
  return [shootingHeight, WEAPON_HEIGHT - shootingHeight]
}

/** Tabla y explicaciones dentro del mismo marco, debajo de su tipo de ataque. */
function WeaponSection({ y, height, label, icon, weapon, columns, palette }) {
  const tableY = y + 88
  const notes = weaponNotes(weapon)
  const layout = layoutTextBlocks(notes, {
    x: TABLE_X0 + 28, y: tableY + TABLE_H + 22,
    w: NOTES_W, h: height - 88 - TABLE_H - 44,
  }, { maxBody: 24, minBody: 14, titleRatio: 1.08, blockGap: 18, verticalAlign: 'center' })

  return (
    <g>
      <SectionBanner cy={y + 38} label={label} icon={icon} palette={palette} />
      <path d={cham(TABLE_X0, tableY, TABLE_X1 - TABLE_X0, height - 88, 8)} fill="#fbfaf7" stroke={palette.onPaper} strokeWidth="1.6" />
      {weapon ? (
        <g>
          <path d={`M${TABLE_X0 + 8} ${tableY}H${TABLE_X1 - 8}L${TABLE_X1} ${tableY + 8}V${tableY + TABLE_HEAD_H}H${TABLE_X0}V${tableY + 8}Z`} fill="#121216" />
          {columns.map((column, index) => {
            const cx = column.x + column.w / 2
            const value = show(weapon[column.key])
            const size = fitSize(value, column.w - 20, { max: 42, min: 18, family: FONT.title, weight: 700 })
            return (
              <g key={column.key}>
                {index > 0 ? <line x1={column.x} y1={tableY} x2={column.x} y2={tableY + TABLE_H} stroke={palette.onPaper} strokeWidth="1.2" /> : null}
                <Txt x={cx} y={tableY + 23} size={20} ls={1}>{column.label.toUpperCase()}</Txt>
                <Txt x={cx} y={tableY + TABLE_HEAD_H + (TABLE_H - TABLE_HEAD_H) / 2 + size * 0.36} size={size} family={FONT.title} fill={INK}>{value}</Txt>
              </g>
            )
          })}
          <line x1={TABLE_X0} y1={tableY + TABLE_H} x2={TABLE_X1} y2={tableY + TABLE_H} stroke={palette.onPaper} strokeWidth="1.2" />
          {notes.length
            ? <TextBlocks layout={layout} dividerX={[TABLE_X0 + 80, TABLE_X1 - 80]} palette={palette} />
            : <Txt x={(TABLE_X0 + TABLE_X1) / 2} y={tableY + TABLE_H + (height - 88 - TABLE_H) / 2 + 8} size={23} family={FONT.body} weight={400} fill={INK_SOFT}>Sin habilidades de arma.</Txt>}
        </g>
      ) : <Txt x={(TABLE_X0 + TABLE_X1) / 2} y={tableY + 42} size={24} family={FONT.body} weight={400} fill={INK_SOFT}>{`Sin ataque de ${label.toLowerCase()}.`}</Txt>}
    </g>
  )
}

/** Textos ya colocados por layoutTextBlocks. */
function TextBlocks({ layout, titleFill = INK, bodyFill = INK_SOFT, dividerX, palette }) {
  return (
    <g>
      {layout.dividers.map((y) => (
        <line key={`d-${y}`} x1={dividerX[0]} y1={y} x2={dividerX[1]} y2={y} stroke={palette.onPaper} strokeWidth="1.4" />
      ))}
      {layout.items.map((item, index) => (item.kind === 'title'
        ? <Txt key={index} x={item.x} y={item.y} size={item.size} family={FONT.title} fill={titleFill} ls={2}>{item.text}</Txt>
        : <Txt key={index} x={item.x} y={item.y} size={item.size} family={FONT.body} weight={400} fill={bodyFill}>{item.text}</Txt>))}
    </g>
  )
}

/* ── Ficha ──────────────────────────────────────────────────────────────── */

const UnitFichaCard = forwardRef(function UnitFichaCard({ entry, imageDataUrl, onImageClick }, ref) {
  const svgRef = useRef(null)
  const uid = useId().replace(/[^a-zA-Z0-9]/g, '')
  // Solo hace falta para volver a maquetar cuando llegan las fuentes.
  useCardFonts()

  useImperativeHandle(ref, () => ({
    captureAsCanvas: () => rasterizeCardSvg(svgRef.current, { width: CARD_W, height: CARD_H, scale: 2 }),
  }), [])

  if (!entry) return null

  const perfil = entry.perfil || {}
  const melee = entry.armas?.cuerpo_a_cuerpo || null
  const shooting = entry.armas?.disparo || null
  const token = getUnitClassToken(entry.unidadId)
  const palette = getCardPalette(token)
  const roles = splitRol(entry.rol)

  const statValues = {
    movimiento: show(perfil.movimiento),
    vidas: show(perfil.vidas),
    defensa: show(perfil.defensa),
    escuadra: formatEscuadra(perfil.escuadra),
  }

  // Los Héroes traen la redacción de su habilidad en el propio perfil.
  const abilityName = entry.habilidad || ''
  const abilityDescription = entry.kind === 'heroe'
    ? entry.habilidadDescripcion
    : resolveUnitSpecialtyDescription(entry.habilidad)

  const [shootingHeight, meleeHeight] = weaponSectionHeights(shooting, melee)

  const name = String(entry.nombre || '').toUpperCase()
  // El nombre y los roles reservan el hueco del coste a la derecha.
  const nameSize = fitSize(name, 458, { max: 58, min: 20, family: FONT.title, weight: 700, ls: 2 })
  const roleLabel = roles.join(' · ').toUpperCase()
  const roleSize = fitSize(roleLabel, 458, { max: 27, min: 16, family: FONT.label, weight: 700, ls: 2.5 })
  const cost = show(perfil.valor)
  const costSize = fitSize(cost, 56, { max: 42, min: 18, family: FONT.title, weight: 700 })

  const abilityLayout = layoutTextBlocks(
    abilityName || abilityDescription ? [{ title: abilityName, text: abilityDescription }] : [],
    { x: ABILITY.x + 40, y: ABILITY.y + 22, w: ABILITY.w - 80, h: ABILITY.h - 44 },
    { maxBody: 25, minBody: 13, titleRatio: 1.12 },
  )

  // Etiquetas de la barra de estadísticas: todas al mismo tamaño, el de la más larga.
  const cellW = STATS.w / STAT_CELLS.length
  const labelSize = Math.min(...STAT_CELLS.map((cell) =>
    fitSize(cell.label.toUpperCase(), cellW - 18 - 37, { max: 22, min: 14, family: FONT.label, weight: 700, ls: 1 })))

  const clipArt = `art-${uid}`
  const clipLeft = `left-${uid}`
  const hex = `hex-${uid}`
  const fade = `fade-${uid}`
  const artFade = `artfade-${uid}`

  return (
    <div className="ficha-wrapper ficha-wrapper-svg">
      <svg ref={svgRef} viewBox={`0 0 ${CARD_W} ${CARD_H}`} xmlns="http://www.w3.org/2000/svg" role="img" aria-label={entry.nombre}>
        <defs>
          <pattern id={hex} width="30" height="51.96" patternUnits="userSpaceOnUse" patternTransform="scale(.9)">
            <path d="M15 0 L30 8.66 V25.98 L15 34.64 L0 25.98 V8.66Z M15 34.64 V51.96 M0 25.98 L-15 34.64 M30 25.98 L45 34.64"
              fill="none" stroke="rgba(255,255,255,.075)" strokeWidth="1.6" />
          </pattern>
          <linearGradient id={fade} x1="0" y1="0" x2="1" y2="1">
            <stop offset="0" stopColor="#000" stopOpacity="0" />
            <stop offset="1" stopColor="#000" stopOpacity=".75" />
          </linearGradient>
          <linearGradient id={artFade} x1="0" y1="0" x2="0" y2="1">
            <stop offset=".62" stopColor="#000" stopOpacity="0" />
            <stop offset="1" stopColor="#000" stopOpacity=".55" />
          </linearGradient>
          <clipPath id={clipLeft}><rect x={LEFT.x} y={LEFT.y} width={LEFT.w} height={LEFT.h} rx="26" /></clipPath>
          <clipPath id={clipArt}><path d={cham(ART.x, ART.y, ART.w, ART.h, ART.c)} /></clipPath>
        </defs>

        {/* ═════ Cara izquierda ═════ */}
        <rect x={LEFT.x} y={LEFT.y} width={LEFT.w} height={LEFT.h} rx="26" fill={NIGHT} />
        <g clipPath={`url(#${clipLeft})`}>
          <rect x={LEFT.x} y={LEFT.y} width={LEFT.w} height="141" fill={palette.header} />
          <rect x={LEFT.x} y={LEFT.y} width={LEFT.w} height="141" fill={`url(#${hex})`} />
          <rect x={LEFT.x} y={LEFT.y} width={LEFT.w} height="141" fill={`url(#${fade})`} />
        </g>
        <line x1={LEFT.x} y1="155" x2={LEFT.x + LEFT.w} y2="155" stroke={palette.border} strokeWidth="2.5" />

        {/* Cabecera compacta: icono, nombre, roles y coste. */}
        <path d={cham(38, 34, 108, 108, 12)} fill={PANEL} stroke={palette.border} strokeWidth="2" />
        <g transform="translate(40 36) scale(0.8667)" dangerouslySetInnerHTML={{ __html: unitIconMarkup(token, { frame: false, color: palette.highlight, idPrefix: `h${uid}` }) }} />
        <Txt x={162} y={roleLabel ? 86 : 90 + nameSize * 0.36} size={nameSize} family={FONT.title} fill={palette.highlight} anchor="start" ls={2}>{name}</Txt>
        {roleLabel ? <Txt x={164} y={126} size={roleSize} fill={palette.highlight} anchor="start" ls={2.5}>{roleLabel}</Txt> : null}

        <g aria-label={`Valor: ${cost}`}>
          <title>{`Valor: ${cost}`}</title>
          <polygon points="694,34 748,88 694,142 640,88" fill={PANEL} stroke={palette.border} strokeWidth="2.5" />
          <Txt x={694} y={88 + costSize * 0.36} size={costSize} family={FONT.title}>{cost}</Txt>
        </g>

        {/* Imagen: recortada con la forma del marco, que va siempre encima */}
        <path d={cham(ART.x, ART.y, ART.w, ART.h, ART.c)} fill="#050506" />
        {imageDataUrl ? (
          <g clipPath={`url(#${clipArt})`}>
            <image href={imageDataUrl} x={ART.x} y={ART.y} width={ART.w} height={ART.h} preserveAspectRatio="xMidYMid slice" />
            <rect x={ART.x} y={ART.y} width={ART.w} height={ART.h} fill={`url(#${artFade})`} />
          </g>
        ) : (
          <g
            className={onImageClick ? 'ficha-svg-placeholder' : undefined}
            onClick={onImageClick}
            role={onImageClick ? 'button' : undefined}
            tabIndex={onImageClick ? 0 : undefined}
            onKeyDown={onImageClick ? (event) => { if (event.key === 'Enter' || event.key === ' ') onImageClick() } : undefined}
          >
            <rect x={ART.x} y={ART.y} width={ART.w} height={ART.h} fill="transparent" />
            <g transform={`translate(${ART.x + ART.w / 2 - 75} ${ART.y + ART.h / 2 - 75 - (onImageClick ? 26 : 0)}) scale(1.25)`} opacity=".7"
              dangerouslySetInnerHTML={{ __html: unitIconMarkup(token, { color: palette.highlight, idPrefix: `p${uid}` }) }} />
            {onImageClick ? (
              <g data-export="skip">
                <Txt x={ART.x + ART.w / 2} y={ART.y + ART.h / 2 + 100} size={30} family={FONT.title} fill="#a4a6ad" ls={3}>AÑADIR IMAGEN</Txt>
              </g>
            ) : null}
          </g>
        )}
        <path d={cham(ART.x, ART.y, ART.w, ART.h, ART.c)} fill="none" stroke={palette.border} strokeWidth="2.2" />
        {[ART.x - 2, ART.x + ART.w - 6].map((sideX) => Array.from({ length: 6 }, (_, i) => (
          <rect key={`${sideX}-${i}`} x={sideX} y={ART.y + ART.h / 2 - 50 + i * 18} width="8" height="10" fill={palette.border} opacity=".85" />
        )))}

        {/* Estadísticas */}
        <path d={cham(STATS.x, STATS.y, STATS.w, STATS.h, STATS.c)} fill={PANEL} stroke={palette.border} strokeWidth="2.2" />
        {STAT_CELLS.map((cell, index) => {
          const cx = STATS.x + cellW * index + cellW / 2
          const label = cell.label.toUpperCase()
          const labelW = measureText(label, { size: labelSize, family: FONT.label, weight: 700, ls: 1 })
          const left = cx - (28 + 9 + labelW) / 2
          const value = statValues[cell.key]
          const valueSize = fitSize(value, cellW - 20, { max: 46, min: 20, family: FONT.title, weight: 700 })
          return (
            <g key={cell.key}>
              {index > 0 ? <line x1={STATS.x + cellW * index} y1={STATS.y + 14} x2={STATS.x + cellW * index} y2={STATS.y + STATS.h - 14} stroke={palette.border} strokeWidth="1.6" /> : null}
              <g transform={`translate(${left} ${STATS.y + 14}) scale(${28 / 32})`} fill={palette.highlight}>
                <path d={CARD_ICONS[cell.key]} />
              </g>
              <Txt x={left + 37} y={STATS.y + 36} size={labelSize} anchor="start" ls={1}>{label}</Txt>
              <Txt x={cx} y={STATS.y + 100} size={valueSize} family={FONT.title}>{value}</Txt>
            </g>
          )
        })}

        {/* Habilidad de unidad */}
        <path d={bottomRounded(ABILITY.x, ABILITY.y, ABILITY.w, ABILITY.h, 24)} fill={PAPER} />
        <path d={`M${ABILITY.x} ${ABILITY.y}H${ABILITY.x + 40}L${ABILITY.x} ${ABILITY.y + 40}Z M${ABILITY.x + ABILITY.w} ${ABILITY.y}H${ABILITY.x + ABILITY.w - 40}L${ABILITY.x + ABILITY.w} ${ABILITY.y + 40}Z`} fill={palette.border} />
        <TextBlocks layout={abilityLayout} dividerX={[0, 0]} palette={palette} />

        <rect x={LEFT.x} y={LEFT.y} width={LEFT.w} height={LEFT.h} rx="26" fill="none" stroke={palette.border} strokeWidth="3" />

        {/* ═════ Cara derecha ═════ */}
        <rect x={RIGHT.x} y={RIGHT.y} width={RIGHT.w} height={RIGHT.h} rx="26" fill={PAPER} stroke={NIGHT} strokeWidth="6" />
        <rect x={RIGHT.x + 5} y={RIGHT.y + 5} width={RIGHT.w - 10} height={RIGHT.h - 10} rx="22" fill="none" stroke={palette.onPaper} strokeWidth="1.5" />

        <WeaponSection y={WEAPON_TOP} height={shootingHeight} label="Disparo" icon="disparo" weapon={shooting} columns={SHOOTING_COLUMNS} palette={palette} />
        <WeaponSection y={WEAPON_TOP + shootingHeight + WEAPON_GAP} height={meleeHeight} label="Cuerpo a cuerpo" icon="cac" weapon={melee} columns={MELEE_COLUMNS} palette={palette} />
      </svg>
    </div>
  )
})

export default UnitFichaCard
