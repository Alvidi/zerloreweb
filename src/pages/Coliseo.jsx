import { useEffect, useMemo, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { useI18n } from '../i18n/I18nContext.jsx'
import heroesData from '../data/coliseo/heroes.json'
import objetosData from '../data/items/objetos.json'
import UnitFichaCard from '../features/generator/components/UnitFichaCard.jsx'
import ItemFichaCard from '../features/generator/components/ItemFichaCard.jsx'
import ImageCropModal from '../features/generator/components/ImageCropModal.jsx'
import FitTitle from '../features/generator/components/FitTitle.jsx'
import { useImageCrop } from '../features/generator/imageCrop.js'
import { getUnitClassBadgeSrc, getUnitClassToken } from '../features/generator/unitTypeBadges.js'
import itemIcon from '../images/units_icons/equipamiento.png'

const HEROES = heroesData.heroes

/** Entrada plana que consume la ficha, igual que la de una unidad. */
const buildHeroEntry = (heroe) => ({
  kind: 'heroe',
  unidadId: heroe.icono,
  nombre: heroe.nombre,
  clase: heroe.nombre,
  habilidad: heroe.habilidad,
  habilidadDescripcion: heroe.habilidad_descripcion,
  perfil: heroe.perfil,
  fuerteContra: [],
  armas: heroe.armas,
})

function Coliseo() {
  const { t } = useI18n()
  const [heroImages, setHeroImages] = useState({})
  const [openFicha, setOpenFicha] = useState(null)        // { kind, id }
  const [printJob, setPrintJob] = useState(null)          // 'todos' | 'objetos' | hero id | null
  const stageRef = useRef(null)
  const cardRefs = useRef(new Map())

  const imageCrop = useImageCrop((heroId, imageDataUrl) =>
    setHeroImages((prev) => ({ ...prev, [heroId]: imageDataUrl })),
  )

  const items = objetosData.objetos

  const printHeroes = useMemo(() => {
    if (!printJob || printJob === 'objetos') return []
    if (printJob === 'todos') return HEROES
    return HEROES.filter((heroe) => heroe.id === printJob)
  }, [printJob])

  const printItems = useMemo(() => (printJob === 'objetos' ? items : []), [printJob, items])

  const previewFicha = useMemo(() => {
    if (!openFicha) return null
    if (openFicha.kind === 'heroe') {
      const heroe = HEROES.find((candidate) => candidate.id === openFicha.id)
      return heroe ? { kind: 'heroe', heroe } : null
    }
    const item = items.find((candidate) => candidate.id === openFicha.id)
    return item ? { kind: 'objeto', item } : null
  }, [openFicha, items])

  useEffect(() => {
    if (typeof document === 'undefined') return undefined
    const previousOverflow = document.body.style.overflow
    if (openFicha) document.body.style.overflow = 'hidden'
    return () => { document.body.style.overflow = previousOverflow }
  }, [openFicha])

  // ── Exportación a PDF ─────────────────────────────────────────────────
  useEffect(() => {
    if (!printJob || !stageRef.current) return undefined
    let cancelled = false

    const render = async () => {
      await new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)))
      if (document.fonts?.ready) await document.fonts.ready

      const canvases = []
      for (const ficha of [...printHeroes, ...printItems]) {
        const canvas = await cardRefs.current.get(ficha.id)?.captureAsCanvas?.()
        if (canvas) canvases.push(canvas)
      }
      if (cancelled || !canvases.length) { if (!cancelled) setPrintJob(null); return }

      const { jsPDF } = await import('jspdf')
      // Mismo formato que las unidades: giradas, 4 por folio A4 vertical.
      const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4', compress: true })
      const PW = doc.internal.pageSize.getWidth()
      const PH = doc.internal.pageSize.getHeight()
      const cols = 2
      const rows = 2
      const gap = 4
      const margin = 8
      const slotW = Math.min((PW - margin * 2 - gap) / cols, (PH - margin * 2 - gap) / rows / 1.5)
      const slotH = slotW * 1.5
      const marginX = (PW - cols * slotW - gap) / 2
      const marginY = (PH - rows * slotH - gap) / 2

      canvases.forEach((canvas, index) => {
        const page = Math.floor(index / (cols * rows))
        const slot = index % (cols * rows)
        if (slot === 0 && page > 0) doc.addPage()
        const x = marginX + (slot % cols) * (slotW + gap)
        const y = marginY + Math.floor(slot / cols) * (slotH + gap)
        // La ficha es apaisada: se gira para que cuatro llenen el folio.
        doc.addImage(canvas.toDataURL('image/jpeg', 0.92), 'JPEG', x, y, slotW, slotH, undefined, 'FAST', -90)
      })

      const fileName = printJob === 'todos'
        ? 'zerolore-heroes.pdf'
        : printJob === 'objetos'
          ? 'zerolore-coliseo-equipamiento.pdf'
          : `zerolore-heroe-${printJob}.pdf`
      doc.save(fileName)
      if (!cancelled) setPrintJob(null)
    }

    render().catch((error) => {
      console.error('[coliseo] Hero PDF export failed', error)
      if (!cancelled) setPrintJob(null)
    })

    return () => { cancelled = true }
  }, [printJob, printHeroes, printItems])

  return (
    <section className="section">
      <div className="section-head reveal">
        <p className="eyebrow">{t('nav.coliseo')}</p>
        <h2>{t('coliseo.title')}</h2>
        <p>{t('coliseo.subtitle')}</p>
      </div>

      <div className="generator reveal">
        <div className="generator-panel">
          <div className="generator-subsection generator-listing-field">
            <div className="unit-list-section">
              <div className="unit-list-section-head">
                <p className="unit-list-section-label">{t('coliseo.heroes')}</p>
                <button
                  type="button"
                  className="unit-list-section-download"
                  onClick={() => setPrintJob('todos')}
                  disabled={Boolean(printJob)}
                  aria-busy={printJob === 'todos' ? 'true' : 'false'}
                >
                  {printJob === 'todos' ? t('generator.preparingPdf') : t('coliseo.downloadHeroes')}
                </button>
              </div>

              <div className="unit-list">
                {HEROES.map((heroe) => (
                  <article className="unit-card" key={heroe.id}>
                    <div className="unit-card-header">
                      <div className="unit-card-summary">
                        <span className="unit-card-thumb-wrap" aria-hidden="true">
                          <span className="unit-card-thumb-frame">
                            <span className="unit-card-thumb-canvas">
                              {heroImages[heroe.id] ? (
                                <img className="unit-card-thumb" src={heroImages[heroe.id]} alt="" />
                              ) : getUnitClassBadgeSrc(heroe.icono) ? (
                                <img className="unit-card-thumb fallback" src={getUnitClassBadgeSrc(heroe.icono)} alt="" />
                              ) : null}
                            </span>
                          </span>
                        </span>
                        <div className="unit-card-heading">
                          <FitTitle className={`unit-card-type unit-card-type-title unit-type-${getUnitClassToken(heroe.icono)}`}>
                            {heroe.nombre}
                          </FitTitle>
                          <div className="unit-card-specialty">{heroe.habilidad}</div>
                        </div>
                      </div>
                      <div className="unit-card-header-actions">
                        <button
                          type="button"
                          className="ghost small"
                          onClick={() => setOpenFicha({ kind: 'heroe', id: heroe.id })}
                        >
                          {t('generator.viewCard')}
                        </button>
                        <label className="ghost small coliseo-image-button">
                          {heroImages[heroe.id] ? t('generator.changeImage') : t('generator.addImage')}
                          <input
                            type="file"
                            accept="image/*"
                            onChange={(event) => imageCrop.startFromFileInput(heroe.id, heroe.nombre, event)}
                          />
                        </label>
                        <button
                          type="button"
                          className="unit-list-section-download coliseo-pick-button"
                          onClick={() => setPrintJob(heroe.id)}
                          disabled={Boolean(printJob)}
                          aria-busy={printJob === heroe.id ? 'true' : 'false'}
                        >
                          {printJob === heroe.id ? t('generator.preparingPdf') : t('coliseo.pickHero')}
                        </button>
                      </div>
                    </div>
                    <p className="unit-card-blurb">{heroe.descripcion}</p>
                  </article>
                ))}
              </div>
            </div>

            <hr className="generator-items-divider" />

            <div className="unit-list-section">
              <div className="unit-list-section-head">
                <p className="unit-list-section-label">{t('rules.modeItems')}</p>
                <button
                  type="button"
                  className="unit-list-section-download"
                  onClick={() => setPrintJob('objetos')}
                  disabled={Boolean(printJob)}
                  aria-busy={printJob === 'objetos' ? 'true' : 'false'}
                >
                  {printJob === 'objetos' ? t('generator.preparingPdf') : t('generator.downloadItems')}
                </button>
              </div>
              <div className="unit-list">
                {items.map((item) => (
                  <article className="unit-card" key={item.id}>
                    <div className="unit-card-header">
                      <div className="unit-card-summary">
                        <span className="unit-card-thumb-wrap" aria-hidden="true">
                          <span className="unit-card-thumb-frame">
                            <span className="unit-card-thumb-canvas">
                              <img className="unit-card-thumb fallback" src={itemIcon} alt="" />
                            </span>
                          </span>
                        </span>
                        <div className="unit-card-heading">
                          <div className="unit-card-title-row">
                            <FitTitle as="h4" maxFontSize={16} minFontSize={10}>{item.nombre}</FitTitle>
                          </div>
                          <div className="unit-card-type unit-type-equipment">{t('rules.modeItems')}</div>
                        </div>
                      </div>
                      <div className="unit-card-header-actions">
                        <button
                          type="button"
                          className="ghost small"
                          onClick={() => setOpenFicha({ kind: 'objeto', id: item.id })}
                        >
                          {t('generator.viewCard')}
                        </button>
                      </div>
                    </div>
                    {item.descripcion ? <p className="unit-card-blurb is-item">{item.descripcion}</p> : null}
                  </article>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Escenario oculto del que se capturan las fichas para el PDF */}
      {printJob ? (
        <div className="army-print-stage" ref={stageRef} aria-hidden="true">
          {printHeroes.map((heroe) => (
            <UnitFichaCard
              key={heroe.id}
              ref={(instance) => {
                if (instance) cardRefs.current.set(heroe.id, instance)
                else cardRefs.current.delete(heroe.id)
              }}
              entry={buildHeroEntry(heroe)}
              imageDataUrl={heroImages[heroe.id] || ''}
            />
          ))}
          {printItems.map((item) => (
            <ItemFichaCard
              key={item.id}
              ref={(instance) => {
                if (instance) cardRefs.current.set(item.id, instance)
                else cardRefs.current.delete(item.id)
              }}
              item={item}
              hideValue
            />
          ))}
        </div>
      ) : null}

      <ImageCropModal crop={imageCrop} />

      {previewFicha && typeof document !== 'undefined' ? createPortal(
        <div
          className="unit-preview-modal"
          role="dialog"
          aria-modal="true"
          onClick={() => setOpenFicha(null)}
        >
          <div className="unit-preview-modal-inner" onClick={(event) => event.stopPropagation()}>
            <div className="unit-preview-modal-bar">
              <div className="unit-preview-modal-actions">
                <button
                  type="button"
                  className="ghost small"
                  onClick={() => setOpenFicha(null)}
                  aria-label={t('generator.close')}
                >✕</button>
              </div>
            </div>
            <div className="unit-preview-modal-card">
              {previewFicha.kind === 'heroe' ? (
                <UnitFichaCard
                  entry={buildHeroEntry(previewFicha.heroe)}
                  imageDataUrl={heroImages[previewFicha.heroe.id] || ''}
                />
              ) : (
                <ItemFichaCard item={previewFicha.item} hideValue />
              )}
            </div>
          </div>
        </div>,
        document.body,
      ) : null}
    </section>
  )
}

export default Coliseo
