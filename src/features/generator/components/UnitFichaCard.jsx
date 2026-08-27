import { forwardRef, useEffect, useImperativeHandle, useLayoutEffect, useRef } from 'react'
import { getAbilityDescription, getAbilityLabel } from '../../../utils/abilities.js'
import { resolveUnitSpecialtyDescription } from '../../../utils/unitSpecialties.js'
import { getUnitClassBadgeSrc, getUnitClassToken } from '../unitTypeBadges.js'
import { getVentajaClase } from '../catalogUtils.js'

import fichaTemplate from '../../../images/fichas/ficha2.png'

// ─── Geometría medida sobre ficha2.png (1536×1024) ────────────────────────
// Tarjeta izquierda
//   Banda hexagonal (nombre)      y=16-153
//   Cajas clase / rol             y=174-219   clase x=41-228 · rol x=243-448
//   Octógono VALOR                x=672-740   y=174-219
//   Ventana de arte               x=35-735    y=240-647
//   Barra de stats                y=651-776   separadores x=32/169/306/456/598/739
//   Panel blanco habilidad        x=20-752    y=792-1009
// Tarjeta derecha
//   Tabla DISPARO  cabecera y=124-155 · fila y=156-247
//   Tabla CaC      cabecera y=352-383 · fila y=384-475
//   Caja HABILIDADES DE ARMA      x=811-1498  y=540-993
//   Columnas: ATAQUES 824-961 · ALCANCE 962-1089 · PRECISIÓN 1090-1218
//             DAÑO 1219-1346 · HABILIDADES 1347-1488
const CARD_W = 1536
const CARD_H = 1024

const LAYOUT = {
  classIcon: { x: 40, y: 36, w: 104, h: 104 },
  name: { x: 158, y: 42, w: 482, h: 96 },
  clase: { x: 45, y: 178, w: 180, h: 38 },
  rol: { x: 247, y: 178, w: 198, h: 38 },
  valor: { x: 674, y: 178, w: 64, h: 38 },
  image: { x: 20, y: 232, w: 736, h: 416 },
  ability: { x: 38, y: 812, w: 692, h: 182 },
  shooting: { y: 158, h: 88 },
  melee: { y: 386, h: 88 },
  weaponAbilities: { x: 822, y: 588, w: 660, h: 394 },
}

const STAT_CELLS = [
  { key: 'movimiento', x: 32, w: 137 },
  { key: 'vidas', x: 170, w: 136 },
  { key: 'salvacion', x: 307, w: 149 },
  { key: 'velocidad', x: 457, w: 141 },
  { key: 'escuadra', x: 599, w: 140 },
]
const STAT_VALUE_Y = 706
const STAT_VALUE_H = 62

const WEAPON_COLUMNS = [
  { key: 'ataques', x: 824, w: 137 },
  { key: 'distancia', x: 962, w: 127 },
  { key: 'precision', x: 1090, w: 128 },
  { key: 'danio', x: 1219, w: 127 },
  { key: 'habilidades', x: 1347, w: 141 },
]

const text = (value, fallback = '-') => {
  if (value === null || value === undefined) return fallback
  const normalized = String(value).trim()
  return normalized || fallback
}

const formatDanio = (weapon) => {
  if (!weapon) return '-'
  const d = text(weapon.danio, '')
  const c = text(weapon.danio_critico, '')
  if (!d && !c) return '-'
  if (!c) return d
  return `${d} / ${c}`
}

/**
 * La casilla de Escuadra muestra siempre el mínimo/máximo del perfil, sin
 * depender del modo ni del ejército: así una ficha impresa sirve igual para
 * Escaramuza y para Gran Batalla, y no hay que descargarla dos veces.
 */
const formatEscuadra = (escuadra) => {
  const min = escuadra?.min
  const max = escuadra?.max
  if (!min && !max) return '-'
  if (min === max) return String(min)
  return `${min}/${max}`
}

const abilityList = (weapon) =>
  (Array.isArray(weapon?.habilidades_arma) ? weapon.habilidades_arma : []).filter(Boolean)

// ─── Ajuste automático de tamaño de fuente ────────────────────────────────
const useAutoFit = ({ maxFontSize, minFontSize = 8, step = 0.5, fitKey = '', rect }) => {
  const ref = useRef(null)
  const fitRef = useRef(null)

  /*
   * Las cajas no llevan alto fijo: se reduce el cuerpo de letra hasta que el
   * contenido cabe en el alto previsto y después se recoloca la caja para que
   * quede centrada en ese hueco.
   *
   * Con alto fijo el contenido no llena la caja y hay que centrarlo: el
   * navegador y html2canvas reparten ese sobrante de forma distinta, y por eso
   * el PDF salía descuadrado. Al ajustar el alto al contenido no queda sobrante
   * que repartir y ambos coinciden.
   */
  useLayoutEffect(() => {
    const node = ref.current
    if (!node || typeof window === 'undefined') return undefined

    let frameId = 0

    const fitNow = () => {
      const el = ref.current
      if (!el) return

      let size = maxFontSize
      el.style.fontSize = `${size}px`
      el.style.top = `${rect.y}px`

      while (
        size > minFontSize
        && (el.scrollWidth > el.clientWidth || el.offsetHeight > rect.h)
      ) {
        size = Math.max(minFontSize, size - step)
        el.style.fontSize = `${size}px`
      }

      const contentHeight = el.offsetHeight
      el.style.top = `${Math.round(rect.y + Math.max(0, (rect.h - contentHeight) / 2))}px`
    }

    const scheduleFit = () => {
      window.cancelAnimationFrame(frameId)
      frameId = window.requestAnimationFrame(fitNow)
    }

    fitRef.current = fitNow
    fitNow()

    // Las fuentes llegan de forma asíncrona y cambian los anchos del texto, así
    // que hay que reajustar cuando terminan de cargar. `ready` no basta: una
    // fuente solo se descarga al usarse y puede resolverse después.
    document.fonts?.ready?.then(fitNow).catch(() => {})
    document.fonts?.addEventListener?.('loadingdone', scheduleFit)

    const observer = new ResizeObserver(scheduleFit)
    observer.observe(node)
    return () => {
      window.cancelAnimationFrame(frameId)
      document.fonts?.removeEventListener?.('loadingdone', scheduleFit)
      observer.disconnect()
    }
  }, [fitKey, maxFontSize, minFontSize, step, rect.x, rect.y, rect.w, rect.h])

  // Y se reaplica en cada render, porque React puede repintar la caja sin que
  // cambie ninguna dependencia y dejarla sin ajustar justo antes de capturarla.
  useLayoutEffect(() => {
    fitRef.current?.()
  })

  return ref
}

function FitBox({ className, rect, children, maxFontSize, minFontSize = 8, fitKey = '' }) {
  const ref = useAutoFit({ maxFontSize, minFontSize, fitKey, rect })
  // Alto, posición vertical y cuerpo de letra los gobierna useAutoFit.
  return (
    <div ref={ref} className={className} style={{ left: rect.x, top: rect.y, width: rect.w }}>
      {children}
    </div>
  )
}

const box = (rect) => ({ left: rect.x, top: rect.y, width: rect.w, height: rect.h })

function WeaponRow({ weapon, y, h, fuerteContra = [], ventajaBonus = 1 }) {
  if (!weapon) return null
  const values = {
    ataques: text(weapon.ataques),
    distancia: text(weapon.distancia),
    precision: text(weapon.precision),
    danio: formatDanio(weapon),
    habilidades: abilityList(weapon).map((a) => getAbilityLabel(a)).join('\n') || '-',
  }

  // La ventaja de clase se lee en la propia columna de Daño, debajo del valor:
  // es donde se aplica, así que es donde hay que verla al resolver el ataque.
  const bonus = fuerteContra.length ? `+${ventajaBonus} ${fuerteContra.join(', ')}` : ''

  return WEAPON_COLUMNS.map((column) => (
    <FitBox
      key={`${y}-${column.key}`}
      className={`ficha2-cell ficha2-cell-${column.key}`}
      rect={{ x: column.x, y, w: column.w, h }}
      maxFontSize={column.key === 'habilidades' ? 20 : 30}
      minFontSize={column.key === 'habilidades' ? 6 : 9}
      fitKey={column.key === 'danio' ? `${values.danio}|${bonus}` : values[column.key]}
    >
      {values[column.key]}
      {column.key === 'danio' && bonus ? (
        <span className="ficha2-cell-bonus">{bonus}</span>
      ) : null}
    </FitBox>
  ))
}

const CAPTURE_MARK = 'data-ficha2-capture'

const CAPTURE_DECOR_BOXES = ['.ficha2-weapon-abilities-divider']

// Texto que va dentro de una caja pero con otro cuerpo de letra.
const CAPTURE_SUBTEXT_BOXES = ['.ficha2-cell-bonus']

const CAPTURE_TEXT_BOXES = [
  '.ficha2-name',
  '.ficha2-tag',
  '.ficha2-valor',
  '.ficha2-stat-value',
  '.ficha2-cell',
  '.ficha2-ability',
  '.ficha2-weapon-abilities',
]

/**
 * Solo afecta a la copia que se rasteriza, no a lo que ves en pantalla.
 *
 * html2canvas coloca cada línea de texto media interlínea más abajo que el
 * navegador (medido: 24 px con interlínea de 47,8; 13 con 28,2; 17 con 34,5).
 * Con cajas ajustadas al contenido eso hacía que en el PDF los títulos largos
 * se salieran de su banda y el valor se saliera del octógono. Aquí se corrige
 * subiendo cada caja esa media interlínea, y se quita el recorte porque el alto
 * que calcula html2canvas para estas cajas tampoco coincide.
 */
const alignTextBoxesForCapture = (liveCard, clonedDoc) => {
  const clonedCard = clonedDoc.querySelector(`[${CAPTURE_MARK}]`)
  if (!liveCard || !clonedCard) return

  CAPTURE_TEXT_BOXES.forEach((selector) => {
    const liveNodes = Array.from(liveCard.querySelectorAll(selector))
    const clonedNodes = Array.from(clonedCard.querySelectorAll(selector))

    liveNodes.forEach((liveNode, index) => {
      const clonedNode = clonedNodes[index]
      if (!clonedNode) return

      const styles = window.getComputedStyle(liveNode)
      const fontSize = parseFloat(styles.fontSize) || 0
      const parsedLineHeight = parseFloat(styles.lineHeight)
      const lineHeight = Number.isFinite(parsedLineHeight) ? parsedLineHeight : fontSize * 1.2
      const top = parseFloat(liveNode.style.top) || 0

      const shift = lineHeight / 2
      clonedNode.style.overflow = 'visible'
      clonedNode.style.height = 'auto'
      clonedNode.style.top = `${top - shift}px`

      // La compensación de arriba está calculada con la interlínea de la caja, pero
      // html2canvas desplaza cada línea según SU propia interlínea. Lo que va dentro
      // con otro cuerpo de letra —o sin texto, como el separador— queda subido de
      // más, así que se le devuelve la diferencia.
      const compensateChild = (liveChild, clonedChild) => {
        if (!clonedChild) return
        let ownHalf = 0
        if (liveChild) {
          const childStyles = window.getComputedStyle(liveChild)
          const childFontSize = parseFloat(childStyles.fontSize) || 0
          const parsedChildLineHeight = parseFloat(childStyles.lineHeight)
          ownHalf = (Number.isFinite(parsedChildLineHeight) ? parsedChildLineHeight : childFontSize * 1.2) / 2
        }
        clonedChild.style.transform = `translateY(${shift - ownHalf}px)`
      }

      // El separador no lleva texto: se le devuelve la compensación entera.
      clonedNode.querySelectorAll(CAPTURE_DECOR_BOXES.join(',')).forEach((decor) => {
        compensateChild(null, decor)
      })

      const liveSubtexts = Array.from(liveNode.querySelectorAll(CAPTURE_SUBTEXT_BOXES.join(',')))
      const clonedSubtexts = Array.from(clonedNode.querySelectorAll(CAPTURE_SUBTEXT_BOXES.join(',')))
      liveSubtexts.forEach((liveChild, childIndex) => {
        compensateChild(liveChild, clonedSubtexts[childIndex])
      })
    })
  })
}

const UnitFichaCard = forwardRef(function UnitFichaCard(
  { entry, imageDataUrl, gameMode = 'escaramuza', onImageClick },
  ref,
) {
  const wrapperRef = useRef(null)
  const cardRef = useRef(null)

  useImperativeHandle(ref, () => ({
    async captureAsCanvas() {
      const { default: html2canvas } = await import('html2canvas')
      const wrapper = wrapperRef.current
      const card = cardRef.current
      if (!card) return null

      const savedOverflow = wrapper?.style.overflow ?? ''
      const savedHeight = wrapper?.style.height ?? ''
      const savedTransform = card.style.transform

      if (wrapper) {
        wrapper.style.overflow = 'visible'
        wrapper.style.height = `${CARD_H}px`
      }
      card.style.transform = 'none'
      card.setAttribute(CAPTURE_MARK, '')

      await new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)))

      try {
        return await html2canvas(card, {
          width: CARD_W,
          height: CARD_H,
          scale: 2,
          useCORS: true,
          backgroundColor: null,
          logging: false,
          removeContainer: true,
          onclone: (clonedDoc) => alignTextBoxesForCapture(card, clonedDoc),
        })
      } finally {
        if (wrapper) {
          wrapper.style.overflow = savedOverflow
          wrapper.style.height = savedHeight
        }
        card.style.transform = savedTransform
        card.removeAttribute(CAPTURE_MARK)
      }
    },
  }), [])

  useEffect(() => {
    const wrapper = wrapperRef.current
    const card = cardRef.current
    if (!wrapper || !card) return undefined

    const observer = new ResizeObserver(([observed]) => {
      const scale = observed.contentRect.width / CARD_W
      card.style.transform = `scale(${scale})`
      wrapper.style.height = `${CARD_H * scale}px`
    })
    observer.observe(wrapper)
    return () => observer.disconnect()
  }, [])

  if (!entry) return null

  const perfil = entry.perfil || {}
  const melee = entry.armas?.cuerpo_a_cuerpo || null
  const shooting = entry.armas?.disparo || null

  const statValues = {
    movimiento: text(perfil.movimiento),
    vidas: text(perfil.vidas),
    salvacion: text(perfil.salvacion),
    velocidad: text(perfil.velocidad),
    escuadra: formatEscuadra(perfil.escuadra),
  }

  // Los héroes llevan habilidad de Héroe (texto libre); el resto, una
  // habilidad de unidad con nombre y descripción propios.
  const isHero = Boolean(entry.habilidad_faccion)
  // El título de la ficha es el nombre de rol (Infiltrador, Bárbaro…);
  // los héroes llevan el suyo propio.
  const displayName = entry.nombreRol || entry.nombre
  const classBadgeSrc = getUnitClassBadgeSrc(entry.unidadId || 'heroe')

  // Ventaja de clase: daño extra contra las clases sobre las que manda.
  const fuerteContra = Array.isArray(entry.fuerteContra) ? entry.fuerteContra : []
  const ventajaBonus = getVentajaClase(gameMode)

  const abilityName = isHero
    ? 'Habilidad de Héroe'
    : (entry.habilidad || '')
  const abilityDescription = isHero
    ? entry.habilidad_faccion
    : resolveUnitSpecialtyDescription(entry.habilidad)

  // Las habilidades se agrupan por arma: primero las de disparo, luego las de
  // cuerpo a cuerpo, separadas por una línea.
  const buildNotes = (weapon) =>
    abilityList(weapon).reduce((unique, ability) => {
      const label = getAbilityLabel(ability)
      if (unique.some((item) => item.label === label)) return unique
      unique.push({ label, description: getAbilityDescription(ability) })
      return unique
    }, [])

  const weaponAbilityGroups = [
    { key: 'disparo', notes: buildNotes(shooting) },
    { key: 'melee', notes: buildNotes(melee) },
  ].filter((group) => group.notes.length > 0)

  return (
    <div ref={wrapperRef} className="ficha-wrapper">
      <div ref={cardRef} className="ficha2-card" style={{ width: CARD_W, height: CARD_H }}>
        <img className="ficha2-template" src={fichaTemplate} alt="" />

        <div className="ficha2-img-window" style={box(LAYOUT.image)}>
          {imageDataUrl ? (
            <img className="ficha2-unit-img" src={imageDataUrl} alt="" />
          ) : (
            <button type="button" className="ficha2-img-placeholder" onClick={onImageClick}>
              {classBadgeSrc ? (
                <img className="ficha2-img-placeholder-badge" src={classBadgeSrc} alt="" />
              ) : null}
              <span>Añadir imagen</span>
            </button>
          )}
        </div>

        {classBadgeSrc ? (
          <img className="ficha2-class-icon" style={box(LAYOUT.classIcon)} src={classBadgeSrc} alt="" />
        ) : null}

        <FitBox
          className="ficha2-name"
          rect={LAYOUT.name}
          maxFontSize={64}
          minFontSize={18}
          fitKey={displayName}
        >
          {text(displayName, '')}
        </FitBox>

        <FitBox
          className={`ficha2-tag unit-type-${getUnitClassToken(entry.unidadId || 'heroe')}`}
          rect={LAYOUT.clase}
          maxFontSize={26}
          fitKey={entry.clase}
        >
          {text(entry.clase, '')}
        </FitBox>

        <FitBox className="ficha2-tag" rect={LAYOUT.rol} maxFontSize={26} fitKey={entry.rol}>
          {text(entry.rol, '')}
        </FitBox>

        <FitBox className="ficha2-valor" rect={LAYOUT.valor} maxFontSize={34} fitKey={String(perfil.valor)}>
          {text(perfil.valor)}
        </FitBox>

        {STAT_CELLS.map((cell) => (
          <FitBox
            key={cell.key}
            className="ficha2-stat-value"
            rect={{ x: cell.x, y: STAT_VALUE_Y, w: cell.w, h: STAT_VALUE_H }}
            maxFontSize={44}
            minFontSize={14}
            fitKey={statValues[cell.key]}
          >
            {statValues[cell.key]}
          </FitBox>
        ))}

        <FitBox
          className="ficha2-ability"
          rect={LAYOUT.ability}
          maxFontSize={24}
          minFontSize={10}
          fitKey={`${abilityName}|${abilityDescription}`}
        >
          {abilityName ? <strong>{abilityName}</strong> : null}
          {abilityDescription ? <span>{abilityDescription}</span> : null}
        </FitBox>

        <WeaponRow weapon={shooting} y={LAYOUT.shooting.y} h={LAYOUT.shooting.h} fuerteContra={fuerteContra} ventajaBonus={ventajaBonus} />
        <WeaponRow weapon={melee} y={LAYOUT.melee.y} h={LAYOUT.melee.h} fuerteContra={fuerteContra} ventajaBonus={ventajaBonus} />

        <FitBox
          className="ficha2-weapon-abilities"
          rect={LAYOUT.weaponAbilities}
          maxFontSize={22}
          minFontSize={9}
          fitKey={`${fuerteContra.join(',')}|${weaponAbilityGroups.map((group) => group.notes.map((note) => note.label).join(',')).join('|')}`}
        >
          {weaponAbilityGroups.map((group, index) => (
            <div key={group.key} className="ficha2-weapon-abilities-group">
              {index > 0 ? <span className="ficha2-weapon-abilities-divider" aria-hidden="true" /> : null}
              {group.notes.map((note) => (
                <p key={note.label}>
                  <strong>{note.label}</strong>
                  {note.description ? <span>{note.description}</span> : null}
                </p>
              ))}
            </div>
          ))}
        </FitBox>
      </div>
    </div>
  )
})

export default UnitFichaCard
