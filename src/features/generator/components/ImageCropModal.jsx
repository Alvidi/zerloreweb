import { createPortal } from 'react-dom'
import { useI18n } from '../../../i18n/I18nContext.jsx'
import { IMAGE_CROP_VIEWPORT_HEIGHT, IMAGE_CROP_VIEWPORT_WIDTH } from '../imageCrop.js'

function ImageCropModal({ crop }) {
  const { t } = useI18n()
  const { draft } = crop
  if (!draft || typeof document === 'undefined') return null

  const baseScale = Math.max(
    IMAGE_CROP_VIEWPORT_WIDTH / draft.imageWidth,
    IMAGE_CROP_VIEWPORT_HEIGHT / draft.imageHeight,
  )

  return createPortal(
    <div className="unit-modal" role="dialog" aria-modal="true" onClick={crop.cancel}>
      <div className="unit-modal-card image-crop-modal-card" onClick={(event) => event.stopPropagation()}>
        <div className="unit-modal-header">
          <div>
            <p className="eyebrow">{draft.name}</p>
            <h3>{t('generator.cropImageTitle')}</h3>
            <p className="unit-modal-subtitle">{t('generator.cropImageHint')}</p>
          </div>
          <button type="button" className="ghost small" onClick={crop.cancel}>{t('generator.close')}</button>
        </div>
        <div className="unit-modal-body image-crop-modal-body">
          <div
            className="image-crop-stage"
            onPointerDown={crop.handlePointerDown}
            role="presentation"
            style={{ width: `${IMAGE_CROP_VIEWPORT_WIDTH}px`, height: `${IMAGE_CROP_VIEWPORT_HEIGHT}px` }}
          >
            <img
              src={draft.sourceDataUrl}
              alt={draft.name}
              className="image-crop-stage-image"
              draggable="false"
              style={{
                width: `${draft.imageWidth}px`,
                height: `${draft.imageHeight}px`,
                transform: `translate(calc(-50% + ${draft.offsetX}px), calc(-50% + ${draft.offsetY}px)) scale(${baseScale * draft.zoom})`,
              }}
            />
            <div className="image-crop-frame" aria-hidden="true" />
          </div>
          <label className="field image-crop-zoom-field">
            <span>{t('generator.zoom')}</span>
            <input
              type="range"
              min="1"
              max="3"
              step="0.01"
              value={draft.zoom}
              onChange={(event) => crop.setZoom(event.target.value)}
            />
          </label>
          <div className="image-crop-actions">
            <button type="button" className="ghost small" onClick={crop.cancel}>{t('generator.cancel')}</button>
            <button type="button" className="primary" onClick={crop.confirm}>{t('generator.confirmCropImage')}</button>
          </div>
        </div>
      </div>
    </div>,
    document.body,
  )
}

export default ImageCropModal
