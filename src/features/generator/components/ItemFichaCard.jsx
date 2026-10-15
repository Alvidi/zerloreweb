import { forwardRef, useId, useImperativeHandle, useRef } from 'react'
import { CLASS_COLORS, unitIconMarkup } from '../../cards/unitIcons.js'
import {
  CARD_H, CARD_W, CREAM, FONT, GOLD, GOLD_HI, INK_SOFT, NIGHT, PANEL, PAPER,
  cham, fitSize, layoutTextBlocks, octo, rasterizeCardSvg, useCardFonts,
} from '../../cards/cardKit.js'
import zeroloreLogo from '../../../images/zeroloreLogo.svg'

// ─── Geometría (lienzo de 1536 × 1024): anverso a la izquierda, reverso a la derecha ─
const FRONT = { x: 16, y: 14, w: 744, h: 996 }
const BACK = { x: 776, y: 14, w: 744, h: 996 }
const BODY = { x: 34, y: 240, w: 708, h: 752, c: 22 }
// "EQUIPAMIENTO" y el Momento son más largos que un rol: pastillas más anchas que en la ficha de unidad.
const PILL_TAG = { x: 36, w: 240 }
const PILL_MOMENTO = { x: 284, w: 252 }

function Txt({ x, y, size, family = FONT.label, weight = 700, fill = CREAM, anchor = 'middle', ls = 0, children }) {
  return (
    <text x={x} y={y} fontSize={size} fontFamily={family} fontWeight={weight} fill={fill} textAnchor={anchor} letterSpacing={ls}>
      {children}
    </text>
  )
}

/**
 * Carta de equipamiento. Mismas piezas que la ficha de unidad: cabecera con el
 * icono y el nombre, pastillas (tipo y Momento), Valor y un panel claro con lo
 * que hace la carta.
 */
const ItemFichaCard = forwardRef(function ItemFichaCard({ item, hideValue = false }, ref) {
  const svgRef = useRef(null)
  const uid = useId().replace(/[^a-zA-Z0-9]/g, '')
  useCardFonts()

  useImperativeHandle(ref, () => ({
    captureAsCanvas: () => rasterizeCardSvg(svgRef.current, { width: CARD_W, height: CARD_H, scale: 2 }),
  }), [])

  if (!item) return null

  const name = String(item.nombre || '').toUpperCase()
  const nameSize = fitSize(name, 520, { max: 64, min: 26, family: FONT.title, weight: 700, ls: 3 })
  const momento = String(item.accion || '').toUpperCase()
  // El Momento va en la fuente estrecha: "EN LUGAR DE DISPARAR" no cabe legible en Cinzel.
  const momentoSize = momento ? fitSize(momento, PILL_MOMENTO.w - 22, { max: 27, min: 14, family: FONT.label, weight: 700, ls: 1.2 }) : 0
  const valor = hideValue || item.valor === null || item.valor === undefined ? '—' : String(item.valor)
  const valorSize = fitSize(valor, 52, { max: 38, min: 20, family: FONT.title, weight: 700 })
  const tagSize = fitSize('EQUIPAMIENTO', PILL_TAG.w - 22, { max: 24, min: 12, family: FONT.title, weight: 700, ls: 2 })

  const description = layoutTextBlocks(
    [{ title: '', text: item.descripcion }],
    { x: BODY.x + 56, y: BODY.y + 250, w: BODY.w - 112, h: BODY.h - 300 },
    { maxBody: 42, minBody: 16, lineHeight: 1.4 },
  )

  const clipFront = `front-${uid}`
  const hex = `hex-${uid}`
  const fade = `fade-${uid}`

  return (
    <div className="ficha-wrapper ficha-wrapper-svg">
      <svg ref={svgRef} viewBox={`0 0 ${CARD_W} ${CARD_H}`} xmlns="http://www.w3.org/2000/svg" role="img" aria-label={item.nombre}>
        <defs>
          <pattern id={hex} width="30" height="51.96" patternUnits="userSpaceOnUse" patternTransform="scale(.9)">
            <path d="M15 0 L30 8.66 V25.98 L15 34.64 L0 25.98 V8.66Z M15 34.64 V51.96 M0 25.98 L-15 34.64 M30 25.98 L45 34.64"
              fill="none" stroke="rgba(255,255,255,.075)" strokeWidth="1.6" />
          </pattern>
          <linearGradient id={fade} x1="0" y1="0" x2="1" y2="1">
            <stop offset="0" stopColor="#000" stopOpacity="0" />
            <stop offset="1" stopColor="#000" stopOpacity=".75" />
          </linearGradient>
          <clipPath id={clipFront}><rect x={FRONT.x} y={FRONT.y} width={FRONT.w} height={FRONT.h} rx="26" /></clipPath>
        </defs>

        {/* ═════ Anverso ═════ */}
        <rect x={FRONT.x} y={FRONT.y} width={FRONT.w} height={FRONT.h} rx="26" fill={NIGHT} />
        <g clipPath={`url(#${clipFront})`}>
          <rect x={FRONT.x} y={FRONT.y} width={FRONT.w} height="141" fill="#141418" />
          <rect x={FRONT.x} y={FRONT.y} width={FRONT.w} height="141" fill={`url(#${hex})`} />
          <rect x={FRONT.x} y={FRONT.y} width={FRONT.w} height="141" fill={`url(#${fade})`} />
          <path d={`M${FRONT.x + FRONT.w - 96} 155 L${FRONT.x + FRONT.w} 59 M${FRONT.x + FRONT.w - 70} 155 L${FRONT.x + FRONT.w} 85 M${FRONT.x + FRONT.w - 44} 155 L${FRONT.x + FRONT.w} 111`}
            stroke={GOLD} strokeWidth="5" opacity=".9" />
        </g>
        <line x1={FRONT.x} y1="155" x2={FRONT.x + FRONT.w} y2="155" stroke={GOLD} strokeWidth="2.5" />

        <path d={cham(38, 34, 108, 108, 12)} fill={PANEL} stroke={GOLD} strokeWidth="2" />
        <g transform="translate(40 36) scale(0.8667)" dangerouslySetInnerHTML={{ __html: unitIconMarkup('equipamiento', { frame: false, idPrefix: `h${uid}` }) }} />
        <Txt x={162} y={90 + nameSize * 0.36} size={nameSize} family={FONT.title} fill={GOLD_HI} anchor="start" ls={3}>{name}</Txt>

        <path d={cham(PILL_TAG.x, 172, PILL_TAG.w, 50, 12)} fill={PANEL} stroke={GOLD} strokeWidth="2" />
        <Txt x={PILL_TAG.x + PILL_TAG.w / 2} y={197 + tagSize * 0.36} size={tagSize} family={FONT.title} fill={CLASS_COLORS.equipamiento} ls={2}>EQUIPAMIENTO</Txt>
        <path d={cham(PILL_MOMENTO.x, 172, PILL_MOMENTO.w, 50, 12)} fill={PANEL} stroke={GOLD} strokeWidth="2" />
        {momento ? <Txt x={PILL_MOMENTO.x + PILL_MOMENTO.w / 2} y={197 + momentoSize * 0.36} size={momentoSize} family={FONT.label} fill={GOLD_HI} ls={1.2}>{momento}</Txt> : null}

        <path d={cham(544, 172, 150, 50, 12)} fill={PANEL} stroke={GOLD} strokeWidth="2" />
        <Txt x={604} y={207} size={28} ls={1.5}>VALOR</Txt>
        <polygon points={octo(706, 197, 40)} fill={NIGHT} stroke={GOLD} strokeWidth="2.5" />
        <Txt x={706} y={197 + valorSize * 0.36} size={valorSize} family={FONT.title}>{valor}</Txt>

        {/* Panel con lo que hace la carta */}
        <path d={cham(BODY.x, BODY.y, BODY.w, BODY.h, BODY.c)} fill={PAPER} stroke={GOLD} strokeWidth="2.2" />
        <g transform={`translate(${BODY.x + BODY.w / 2 - 80} ${BODY.y + 60}) scale(1.3333)`} opacity=".9"
          dangerouslySetInnerHTML={{ __html: unitIconMarkup('equipamiento', { idPrefix: `b${uid}`, color: GOLD }) }} />
        <line x1={BODY.x + BODY.w * 0.3} y1={BODY.y + 244} x2={BODY.x + BODY.w * 0.7} y2={BODY.y + 244} stroke={GOLD} strokeWidth="1.4" />
        {description.items.map((line, index) => (
          <Txt key={index} x={line.x} y={line.y} size={line.size} family={FONT.body} weight={400} fill={INK_SOFT}>{line.text}</Txt>
        ))}

        <rect x={FRONT.x} y={FRONT.y} width={FRONT.w} height={FRONT.h} rx="26" fill="none" stroke={GOLD} strokeWidth="3" />

        {/* ═════ Reverso ═════ */}
        <rect x={BACK.x} y={BACK.y} width={BACK.w} height={BACK.h} rx="26" fill={NIGHT} />
        <rect x={BACK.x} y={BACK.y} width={BACK.w} height={BACK.h} rx="26" fill={`url(#${hex})`} />
        <path d={cham(BACK.x + 26, BACK.y + 26, BACK.w - 52, BACK.h - 52, 26)} fill="none" stroke={GOLD} strokeWidth="2" />
        <image href={zeroloreLogo} x={BACK.x + 112} y={BACK.y + BACK.h / 2 - 162} width={BACK.w - 224} height="324" preserveAspectRatio="xMidYMid meet" />
        <rect x={BACK.x} y={BACK.y} width={BACK.w} height={BACK.h} rx="26" fill="none" stroke={GOLD} strokeWidth="3" />
      </svg>
    </div>
  )
})

export default ItemFichaCard
