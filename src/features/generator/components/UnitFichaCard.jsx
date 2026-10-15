import { forwardRef, useId, useImperativeHandle, useRef } from 'react'
import { getAbilityDescription, getAbilityLabel } from '../../../utils/abilities.js'
import { resolveUnitSpecialtyDescription } from '../../../utils/unitSpecialties.js'
import { getUnitClassToken } from '../unitTypeBadges.js'
import { CLASS_COLORS, unitIconMarkup } from '../../cards/unitIcons.js'
import {
  CARD_H, CARD_ICONS, CARD_W, CREAM, FONT, GOLD, GOLD_HI, INK, INK_SOFT, NIGHT, PANEL, PAPER,
  bottomRounded, cham, fitSize, layoutTextBlocks, measureText, octo, rasterizeCardSvg, useCardFonts,
} from '../../cards/cardKit.js'

// ─── Geometría (lienzo de 1536 × 1024) ────────────────────────────────────
const LEFT = { x: 16, y: 14, w: 744, h: 996 }
const RIGHT = { x: 784, y: 14, w: 738, h: 996 }
const ART = { x: 34, y: 240, w: 706, h: 404, c: 22 }
const STATS = { x: 34, y: 656, w: 706, h: 120, c: 18 }
const ABILITY = { x: 18, y: 792, w: 740, h: 216 }
const NOTES = { x: 812, y: 546, w: 684, h: 438 }

const STAT_CELLS = [
  { key: 'movimiento', label: 'Mov' },
  { key: 'vidas', label: 'Vidas' },
  { key: 'defensa', label: 'Defensa' },
  { key: 'escuadra', label: 'Escuadra' },
]

const WEAPON_COLUMNS = [
  { key: 'ataques', label: 'Ataques', x: 824, w: 140 },
  { key: 'alcance', label: 'Alcance', x: 964, w: 140 },
  { key: 'precision', label: 'Precisión', x: 1104, w: 150 },
  { key: 'habilidades', label: 'Habilidades', x: 1254, w: 234 },
]
const TABLE_X0 = WEAPON_COLUMNS[0].x
const TABLE_X1 = WEAPON_COLUMNS.at(-1).x + WEAPON_COLUMNS.at(-1).w
const TABLE_H = 122
const TABLE_HEAD_H = 32

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

function Txt({ x, y, size, family = FONT.label, weight = 700, fill = CREAM, anchor = 'middle', ls = 0, children }) {
  return (
    <text x={x} y={y} fontSize={size} fontFamily={family} fontWeight={weight} fill={fill} textAnchor={anchor} letterSpacing={ls}>
      {children}
    </text>
  )
}

/** Pastilla con esquinas cortadas y su texto encogido para que quepa. */
function Pill({ x, w, label, color }) {
  const text = String(label || '').toUpperCase()
  const size = text ? fitSize(text, w - 20, { max: 26, min: 14, family: FONT.title, weight: 700, ls: 2.5 }) : 0
  return (
    <g>
      <path d={cham(x, 172, w, 50, 12)} fill={PANEL} stroke={GOLD} strokeWidth="2" />
      {text ? <Txt x={x + w / 2} y={197 + size * 0.36} size={size} family={FONT.title} fill={color} ls={2.5}>{text}</Txt> : null}
    </g>
  )
}

/** Cabecera de sección: insignia octogonal y banda negra con punta. */
function SectionBanner({ cy, label, icon }) {
  const text = label.toUpperCase()
  const width = measureText(text, { size: 30, family: FONT.label, weight: 700, ls: 1.2 })
  const x0 = 862
  const x1 = 894 + width + 26
  return (
    <g>
      <path d={`M${x0} ${cy - 23}H${x1}L${x1 + 22} ${cy}L${x1} ${cy + 23}H${x0}Z`} fill="#121216" stroke={GOLD} strokeWidth="1.6" />
      <Txt x={894} y={cy + 10} size={30} anchor="start" ls={1.2}>{text}</Txt>
      <polygon points={octo(850, cy, 38)} fill="#121216" stroke={GOLD} strokeWidth="2.5" />
      <g transform={`translate(832 ${cy - 18}) scale(${36 / 32})`} fill={GOLD_HI}>
        <path d={CARD_ICONS[icon]} fillRule="evenodd" />
      </g>
    </g>
  )
}

/** Tabla de un arma: cabecera negra y una fila de valores. */
function WeaponTable({ y, weapon }) {
  const habilidades = weapon ? abilityList(weapon).map((ability) => getAbilityLabel(ability)) : []
  const values = {
    ataques: weapon ? show(weapon.ataques) : DASH,
    alcance: weapon ? show(weapon.alcance) : DASH,
    precision: weapon ? show(weapon.precision) : DASH,
  }
  return (
    <g>
      <path d={cham(TABLE_X0, y, TABLE_X1 - TABLE_X0, TABLE_H, 6)} fill="#fbfaf7" stroke={GOLD} strokeWidth="1.6" />
      <path d={`M${TABLE_X0 + 6} ${y}H${TABLE_X1 - 6}L${TABLE_X1} ${y + 6}V${y + TABLE_HEAD_H}H${TABLE_X0}V${y + 6}Z`} fill="#121216" />
      {WEAPON_COLUMNS.map((column, index) => {
        const cx = column.x + column.w / 2
        const bodyTop = y + TABLE_HEAD_H
        const bodyH = TABLE_H - TABLE_HEAD_H
        let cell
        if (column.key === 'habilidades' && habilidades.length) {
          const lines = habilidades
          const size = Math.min(...lines.map((line) => fitSize(line, column.w - 20, { max: 22, min: 13, family: FONT.body, weight: 600 })))
          const lh = size * 1.25
          const top = bodyTop + (bodyH - lines.length * lh) / 2
          cell = lines.map((line, lineIndex) => (
            <Txt key={line} x={cx} y={top + lineIndex * lh + size * 0.95} size={size} family={FONT.body} weight={600} fill={INK}>{line}</Txt>
          ))
        } else {
          const value = values[column.key] || DASH
          const size = fitSize(value, column.w - 20, { max: 40, min: 18, family: FONT.title, weight: 700 })
          cell = <Txt x={cx} y={bodyTop + bodyH / 2 + size * 0.36} size={size} family={FONT.title} fill={INK}>{value}</Txt>
        }
        return (
          <g key={column.key}>
            {index > 0 ? <line x1={column.x} y1={y} x2={column.x} y2={y + TABLE_H} stroke={GOLD} strokeWidth="1.2" /> : null}
            <Txt x={cx} y={y + 23} size={19} ls={1}>{column.label.toUpperCase()}</Txt>
            {cell}
          </g>
        )
      })}
    </g>
  )
}

/** Textos ya colocados por layoutTextBlocks. */
function TextBlocks({ layout, titleFill = INK, bodyFill = INK_SOFT, dividerX }) {
  return (
    <g>
      {layout.dividers.map((y) => (
        <line key={`d-${y}`} x1={dividerX[0]} y1={y} x2={dividerX[1]} y2={y} stroke={GOLD} strokeWidth="1.4" />
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
  const classColor = CLASS_COLORS[token] || GOLD_HI
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

  // Habilidades de arma agrupadas por arma (disparo y luego cuerpo a cuerpo).
  const seen = new Set()
  const notes = []
  ;[shooting, melee].forEach((weapon, groupIndex) => {
    let first = true
    abilityList(weapon).forEach((ability) => {
      const label = getAbilityLabel(ability)
      if (seen.has(label)) return
      seen.add(label)
      notes.push({ title: label, text: getAbilityDescription(ability), newGroup: first && groupIndex > 0 && notes.length > 0 })
      first = false
    })
  })

  const name = String(entry.nombre || '').toUpperCase()
  const nameSize = fitSize(name, 520, { max: 64, min: 28, family: FONT.title, weight: 700, ls: 3 })

  const abilityLayout = layoutTextBlocks(
    abilityName || abilityDescription ? [{ title: abilityName, text: abilityDescription }] : [],
    { x: ABILITY.x + 40, y: ABILITY.y + 22, w: ABILITY.w - 80, h: ABILITY.h - 44 },
    { maxBody: 25, minBody: 13, titleRatio: 1.12 },
  )
  const notesLayout = layoutTextBlocks(notes, { x: NOTES.x + 30, y: NOTES.y + 52, w: NOTES.w - 60, h: NOTES.h - 72 }, { maxBody: 23, minBody: 12, titleRatio: 1.08, blockGap: 18 })

  // Etiquetas de la barra de estadísticas: todas al mismo tamaño, el de la más larga.
  const cellW = STATS.w / STAT_CELLS.length
  const labelSize = Math.min(...STAT_CELLS.map((cell) =>
    fitSize(cell.label.toUpperCase(), cellW - 18 - 37, { max: 22, min: 14, family: FONT.label, weight: 700, ls: 1 })))

  const clipArt = `art-${uid}`
  const clipLeft = `left-${uid}`
  const hex = `hex-${uid}`
  const fade = `fade-${uid}`
  const artFade = `artfade-${uid}`

  const firstPill = roles[0] || ''
  const secondPill = roles[1] || ''

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
          <rect x={LEFT.x} y={LEFT.y} width={LEFT.w} height="141" fill="#141418" />
          <rect x={LEFT.x} y={LEFT.y} width={LEFT.w} height="141" fill={`url(#${hex})`} />
          <rect x={LEFT.x} y={LEFT.y} width={LEFT.w} height="141" fill={`url(#${fade})`} />
          <path d={`M${LEFT.x + LEFT.w - 96} 155 L${LEFT.x + LEFT.w} 59 M${LEFT.x + LEFT.w - 70} 155 L${LEFT.x + LEFT.w} 85 M${LEFT.x + LEFT.w - 44} 155 L${LEFT.x + LEFT.w} 111`}
            stroke={GOLD} strokeWidth="5" opacity=".9" />
        </g>
        <line x1={LEFT.x} y1="155" x2={LEFT.x + LEFT.w} y2="155" stroke={GOLD} strokeWidth="2.5" />

        {/* Icono de clase y nombre */}
        <path d={cham(38, 34, 108, 108, 12)} fill={PANEL} stroke={GOLD} strokeWidth="2" />
        <g transform="translate(40 36) scale(0.8667)" dangerouslySetInnerHTML={{ __html: unitIconMarkup(token, { frame: false, idPrefix: `h${uid}` }) }} />
        <Txt x={162} y={90 + nameSize * 0.36} size={nameSize} family={FONT.title} fill={GOLD_HI} anchor="start" ls={3}>{name}</Txt>

        {/* Rol y Valor */}
        <Pill x={40} w={188} label={firstPill} color={firstPill === 'Héroe' ? CLASS_COLORS.heroe : classColor} />
        <Pill x={242} w={206} label={secondPill} color={GOLD_HI} />
        <path d={cham(544, 172, 150, 50, 12)} fill={PANEL} stroke={GOLD} strokeWidth="2" />
        <Txt x={604} y={207} size={28} ls={1.5}>VALOR</Txt>
        <polygon points={octo(706, 197, 40)} fill={NIGHT} stroke={GOLD} strokeWidth="2.5" />
        <Txt x={706} y={197 + fitSize(show(perfil.valor), 52, { max: 38, min: 20, family: FONT.title, weight: 700 }) * 0.36}
          size={fitSize(show(perfil.valor), 52, { max: 38, min: 20, family: FONT.title, weight: 700 })} family={FONT.title}>
          {show(perfil.valor)}
        </Txt>

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
            <g transform={`translate(${ART.x + ART.w / 2 - 75} ${ART.y + 95}) scale(1.25)`} opacity=".55"
              dangerouslySetInnerHTML={{ __html: unitIconMarkup(token, { idPrefix: `p${uid}` }) }} />
            {onImageClick ? (
              <g data-export="skip">
                <Txt x={ART.x + ART.w / 2} y={ART.y + 300} size={30} family={FONT.title} fill="#8d8778" ls={3}>AÑADIR IMAGEN</Txt>
              </g>
            ) : null}
          </g>
        )}
        <path d={cham(ART.x, ART.y, ART.w, ART.h, ART.c)} fill="none" stroke={GOLD} strokeWidth="2.2" />
        {[ART.x - 2, ART.x + ART.w - 6].map((sideX) => Array.from({ length: 6 }, (_, i) => (
          <rect key={`${sideX}-${i}`} x={sideX} y={ART.y + 150 + i * 18} width="8" height="10" fill={GOLD} opacity=".85" />
        )))}

        {/* Estadísticas */}
        <path d={cham(STATS.x, STATS.y, STATS.w, STATS.h, STATS.c)} fill={PANEL} stroke={GOLD} strokeWidth="2.2" />
        {STAT_CELLS.map((cell, index) => {
          const cx = STATS.x + cellW * index + cellW / 2
          const label = cell.label.toUpperCase()
          const labelW = measureText(label, { size: labelSize, family: FONT.label, weight: 700, ls: 1 })
          const left = cx - (28 + 9 + labelW) / 2
          const value = statValues[cell.key]
          const valueSize = fitSize(value, cellW - 20, { max: 46, min: 20, family: FONT.title, weight: 700 })
          return (
            <g key={cell.key}>
              {index > 0 ? <line x1={STATS.x + cellW * index} y1={STATS.y + 14} x2={STATS.x + cellW * index} y2={STATS.y + STATS.h - 14} stroke={GOLD} strokeWidth="1.6" /> : null}
              <g transform={`translate(${left} ${STATS.y + 14}) scale(${28 / 32})`} fill={GOLD_HI}>
                <path d={CARD_ICONS[cell.key]} />
              </g>
              <Txt x={left + 37} y={STATS.y + 36} size={labelSize} anchor="start" ls={1}>{label}</Txt>
              <Txt x={cx} y={STATS.y + 100} size={valueSize} family={FONT.title}>{value}</Txt>
            </g>
          )
        })}

        {/* Habilidad de unidad */}
        <path d={bottomRounded(ABILITY.x, ABILITY.y, ABILITY.w, ABILITY.h, 24)} fill={PAPER} />
        <path d={`M${ABILITY.x} ${ABILITY.y}H${ABILITY.x + 40}L${ABILITY.x} ${ABILITY.y + 40}Z M${ABILITY.x + ABILITY.w} ${ABILITY.y}H${ABILITY.x + ABILITY.w - 40}L${ABILITY.x + ABILITY.w} ${ABILITY.y + 40}Z`} fill={GOLD} />
        <TextBlocks layout={abilityLayout} dividerX={[0, 0]} />

        <rect x={LEFT.x} y={LEFT.y} width={LEFT.w} height={LEFT.h} rx="26" fill="none" stroke={GOLD} strokeWidth="3" />

        {/* ═════ Cara derecha ═════ */}
        <rect x={RIGHT.x} y={RIGHT.y} width={RIGHT.w} height={RIGHT.h} rx="26" fill={PAPER} stroke={NIGHT} strokeWidth="6" />
        <rect x={RIGHT.x + 5} y={RIGHT.y + 5} width={RIGHT.w - 10} height={RIGHT.h - 10} rx="22" fill="none" stroke={GOLD} strokeWidth="1.5" />

        <SectionBanner cy={75} label="Disparo" icon="disparo" />
        <WeaponTable y={125} weapon={shooting} />
        <SectionBanner cy={305} label="Cuerpo a cuerpo" icon="cac" />
        <WeaponTable y={355} weapon={melee} />

        <rect x={NOTES.x} y={NOTES.y} width={NOTES.w} height={NOTES.h} rx="14" fill="none" stroke={GOLD} strokeWidth="1.6" />
        <SectionBanner cy={546} label="Habilidades de arma" icon="habilidades" />
        <TextBlocks layout={notesLayout} dividerX={[NOTES.x + NOTES.w * 0.25, NOTES.x + NOTES.w * 0.75]} />
      </svg>
    </div>
  )
})

export default UnitFichaCard
