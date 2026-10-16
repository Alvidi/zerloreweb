import { forwardRef, useId, useImperativeHandle, useRef } from 'react'
import { getCardPalette, unitIconMarkup } from '../../cards/unitIcons.js'
import {
  CARD_H, CARD_W, FONT, INK_SOFT, NIGHT, PANEL, PAPER,
  cham, fitSize, layoutTextBlocks, rasterizeCardSvg, useCardFonts,
} from '../../cards/cardKit.js'
import zeroloreLogo from '../../../images/zeroloreLogo.svg'

// ─── Geometría (lienzo de 1536 × 1024): anverso a la izquierda, reverso a la derecha ─
const FRONT = { x: 16, y: 14, w: 744, h: 996 }
const BACK = { x: 776, y: 14, w: 744, h: 996 }
const BODY = { x: 34, y: 168, w: 708, h: 824, c: 22 }

function Txt({ x, y, size, family = FONT.label, weight = 700, fill = '#f2f0eb', anchor = 'middle', ls = 0, children }) {
  return (
    <text x={x} y={y} fontSize={size} fontFamily={family} fontWeight={weight} fill={fill} textAnchor={anchor} letterSpacing={ls}>
      {children}
    </text>
  )
}

/**
 * Carta de equipamiento: cabecera compacta como las unidades, coste en rombo
 * y un panel claro con el momento de uso y el efecto. Conserva el reverso y la
 * exportación mediante el mismo SVG de la vista previa.
 */
const ItemFichaCard = forwardRef(function ItemFichaCard({ item, hideValue = false }, ref) {
  const svgRef = useRef(null)
  const uid = useId().replace(/[^a-zA-Z0-9]/g, '')
  useCardFonts()

  useImperativeHandle(ref, () => ({
    captureAsCanvas: () => rasterizeCardSvg(svgRef.current, { width: CARD_W, height: CARD_H, scale: 2 }),
  }), [])

  if (!item) return null

  const palette = getCardPalette('equipamiento')
  const name = String(item.nombre || '').toUpperCase()
  const nameSize = fitSize(name, 458, { max: 58, min: 20, family: FONT.title, weight: 700, ls: 2 })
  const momento = String(item.accion || '').trim().toUpperCase()
  const momentoSize = fitSize(momento, BODY.w - 112, { max: 34, min: 18, family: FONT.label, weight: 700, ls: 1.2 })
  const valor = hideValue || item.valor === null || item.valor === undefined ? '—' : String(item.valor)
  const valorSize = fitSize(valor, 56, { max: 42, min: 18, family: FONT.title, weight: 700 })
  const momentHeight = momento ? 154 : 0

  const description = layoutTextBlocks(
    [{ title: '', text: item.descripcion }],
    { x: BODY.x + 56, y: BODY.y + momentHeight + 44, w: BODY.w - 112, h: BODY.h - momentHeight - 100 },
    { maxBody: 42, minBody: 16, lineHeight: 1.4, verticalAlign: 'start' },
  )

  // Centra el momento y el efecto como un único bloque, conservando su separación.
  const descriptionHeight = description.items.reduce((height, line) => height + line.size * 1.4, 0)
  const contentOffset = Math.max(0, (BODY.h - 88 - momentHeight - descriptionHeight) / 2)

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
          <rect x={FRONT.x} y={FRONT.y} width={FRONT.w} height="141" fill={palette.header} />
          <rect x={FRONT.x} y={FRONT.y} width={FRONT.w} height="141" fill={`url(#${hex})`} />
          <rect x={FRONT.x} y={FRONT.y} width={FRONT.w} height="141" fill={`url(#${fade})`} />
        </g>
        <line x1={FRONT.x} y1="155" x2={FRONT.x + FRONT.w} y2="155" stroke={palette.border} strokeWidth="2.5" />

        <path d={cham(38, 34, 108, 108, 12)} fill={PANEL} stroke={palette.border} strokeWidth="2" />
        <g transform="translate(40 36) scale(0.8667)" dangerouslySetInnerHTML={{ __html: unitIconMarkup('equipamiento', { frame: false, color: palette.highlight, idPrefix: `h${uid}` }) }} />
        <Txt x={162} y={86} size={nameSize} family={FONT.title} fill={palette.highlight} anchor="start" ls={2}>{name}</Txt>
        <Txt x={164} y={126} size={27} fill={palette.highlight} anchor="start" ls={2.5}>EQUIPAMIENTO</Txt>
        <g aria-label={`Valor: ${valor}`}>
          <title>{`Valor: ${valor}`}</title>
          <polygon points="694,34 748,88 694,142 640,88" fill={PANEL} stroke={palette.border} strokeWidth="2.5" />
          <Txt x={694} y={88 + valorSize * 0.36} size={valorSize} family={FONT.title}>{valor}</Txt>
        </g>

        {/* Panel con lo que hace la carta */}
        <path d={cham(BODY.x, BODY.y, BODY.w, BODY.h, BODY.c)} fill={PAPER} stroke={palette.border} strokeWidth="2.2" />
        {momento ? (
          <g>
            <Txt x={BODY.x + BODY.w / 2} y={BODY.y + contentOffset + 64} size={22} fill={palette.onPaper} ls={2.5}>MOMENTO</Txt>
            <Txt x={BODY.x + BODY.w / 2} y={BODY.y + contentOffset + 116} size={momentoSize} fill={INK_SOFT} ls={1.2}>{momento}</Txt>
            <line x1={BODY.x + 56} y1={BODY.y + contentOffset + momentHeight} x2={BODY.x + BODY.w - 56} y2={BODY.y + contentOffset + momentHeight} stroke={palette.onPaper} strokeWidth="1.4" />
          </g>
        ) : null}
        {description.items.map((line, index) => (
          <Txt key={index} x={line.x} y={line.y + contentOffset} size={line.size} family={FONT.body} weight={400} fill={INK_SOFT}>{line.text}</Txt>
        ))}

        <rect x={FRONT.x} y={FRONT.y} width={FRONT.w} height={FRONT.h} rx="26" fill="none" stroke={palette.border} strokeWidth="3" />

        {/* ═════ Reverso ═════ */}
        <rect x={BACK.x} y={BACK.y} width={BACK.w} height={BACK.h} rx="26" fill={NIGHT} />
        <rect x={BACK.x} y={BACK.y} width={BACK.w} height={BACK.h} rx="26" fill={`url(#${hex})`} />
        <path d={cham(BACK.x + 26, BACK.y + 26, BACK.w - 52, BACK.h - 52, 26)} fill="none" stroke={palette.border} strokeWidth="2" />
        <image href={zeroloreLogo} x={BACK.x + 112} y={BACK.y + BACK.h / 2 - 162} width={BACK.w - 224} height="324" preserveAspectRatio="xMidYMid meet" />
        <rect x={BACK.x} y={BACK.y} width={BACK.w} height={BACK.h} rx="26" fill="none" stroke={palette.border} strokeWidth="3" />
      </svg>
    </div>
  )
})

export default ItemFichaCard
