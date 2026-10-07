import { useEffect, useState } from 'react'

// Recorte de la imagen que va en la ventana de arte de la ficha. Lo usan tanto
// el generador de ejércitos como el Coliseo, así que vive aquí y no en la página.
export const MAX_UNIT_IMAGE_SIDE = 1600
export const IMAGE_CROP_ASPECT_RATIO = 736 / 416   // ventana de arte de ficha2.png
export const IMAGE_CROP_VIEWPORT_WIDTH = 360
export const IMAGE_CROP_VIEWPORT_HEIGHT = Math.round(IMAGE_CROP_VIEWPORT_WIDTH / IMAGE_CROP_ASPECT_RATIO)

export const readFileAsDataUrl = (file) =>
  new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(typeof reader.result === 'string' ? reader.result : '')
    reader.onerror = reject
    reader.readAsDataURL(file)
  })

export const loadImageFromDataUrl = (dataUrl) =>
  new Promise((resolve, reject) => {
    const image = new Image()
    image.onload = () => resolve(image)
    image.onerror = reject
    image.crossOrigin = 'anonymous'
    image.src = dataUrl
  })

const clampCropOffsets = ({ offsetX, offsetY, zoom, imageWidth, imageHeight }) => {
  if (!imageWidth || !imageHeight) return { offsetX: 0, offsetY: 0 }

  const baseScale = Math.max(IMAGE_CROP_VIEWPORT_WIDTH / imageWidth, IMAGE_CROP_VIEWPORT_HEIGHT / imageHeight)
  const maxOffsetX = Math.max(0, (imageWidth * baseScale * zoom - IMAGE_CROP_VIEWPORT_WIDTH) / 2)
  const maxOffsetY = Math.max(0, (imageHeight * baseScale * zoom - IMAGE_CROP_VIEWPORT_HEIGHT) / 2)

  return {
    offsetX: Math.min(maxOffsetX, Math.max(-maxOffsetX, offsetX)),
    offsetY: Math.min(maxOffsetY, Math.max(-maxOffsetY, offsetY)),
  }
}

export const createCroppedImageDataUrl = async (sourceDataUrl, cropState) => {
  const image = await loadImageFromDataUrl(sourceDataUrl)
  const imageWidth = image.naturalWidth || image.width || 1
  const imageHeight = image.naturalHeight || image.height || 1
  const baseScale = Math.max(IMAGE_CROP_VIEWPORT_WIDTH / imageWidth, IMAGE_CROP_VIEWPORT_HEIGHT / imageHeight)
  const scale = baseScale * cropState.zoom
  const outputWidth = MAX_UNIT_IMAGE_SIDE
  const outputHeight = Math.round(outputWidth / IMAGE_CROP_ASPECT_RATIO)
  const outputScale = outputWidth / IMAGE_CROP_VIEWPORT_WIDTH
  const drawWidth = imageWidth * scale * outputScale
  const drawHeight = imageHeight * scale * outputScale

  const canvas = document.createElement('canvas')
  canvas.width = outputWidth
  canvas.height = outputHeight
  const ctx = canvas.getContext('2d')
  if (!ctx) throw new Error('Canvas context unavailable')

  ctx.imageSmoothingEnabled = true
  ctx.imageSmoothingQuality = 'high'
  ctx.clearRect(0, 0, outputWidth, outputHeight)
  ctx.drawImage(
    image,
    (outputWidth - drawWidth) / 2 + cropState.offsetX * outputScale,
    (outputHeight - drawHeight) / 2 + cropState.offsetY * outputScale,
    drawWidth,
    drawHeight,
  )

  return canvas.toDataURL('image/png')
}

/**
 * Estado del recorte. `onApply(targetId, dataUrl)` recibe el resultado, así que
 * cada página decide dónde guardar la imagen.
 */
export function useImageCrop(onApply) {
  const [draft, setDraft] = useState(null)

  useEffect(() => {
    if (typeof document === 'undefined') return undefined
    const previousOverflow = document.body.style.overflow
    if (draft) document.body.style.overflow = 'hidden'
    return () => { document.body.style.overflow = previousOverflow }
  }, [draft])

  const startFromFileInput = (targetId, name, event) => {
    const file = event.target.files?.[0]
    if (!file) return
    readFileAsDataUrl(file)
      .then(async (sourceDataUrl) => {
        if (!sourceDataUrl) return
        const image = await loadImageFromDataUrl(sourceDataUrl)
        setDraft({
          targetId,
          name,
          sourceDataUrl,
          imageWidth: image.naturalWidth || image.width || 1,
          imageHeight: image.naturalHeight || image.height || 1,
          zoom: 1,
          offsetX: 0,
          offsetY: 0,
        })
      })
      .catch(() => {})
    event.target.value = ''
  }

  const setZoom = (nextZoom) => {
    setDraft((prev) => {
      if (!prev) return prev
      const zoom = Math.min(3, Math.max(1, Number(nextZoom) || 1))
      return { ...prev, zoom, ...clampCropOffsets({ ...prev, zoom }) }
    })
  }

  const handlePointerDown = (event) => {
    if (!draft) return
    event.preventDefault()
    const startX = event.clientX
    const startY = event.clientY
    const startOffsetX = draft.offsetX
    const startOffsetY = draft.offsetY

    const handlePointerMove = (moveEvent) => {
      setDraft((prev) => {
        if (!prev) return prev
        return {
          ...prev,
          ...clampCropOffsets({
            offsetX: startOffsetX + (moveEvent.clientX - startX),
            offsetY: startOffsetY + (moveEvent.clientY - startY),
            zoom: prev.zoom,
            imageWidth: prev.imageWidth,
            imageHeight: prev.imageHeight,
          }),
        }
      })
    }

    const handlePointerUp = () => {
      window.removeEventListener('pointermove', handlePointerMove)
      window.removeEventListener('pointerup', handlePointerUp)
    }

    window.addEventListener('pointermove', handlePointerMove)
    window.addEventListener('pointerup', handlePointerUp)
  }

  const confirm = () => {
    if (!draft) return
    createCroppedImageDataUrl(draft.sourceDataUrl, draft)
      .then((result) => {
        onApply(draft.targetId, result)
        setDraft(null)
      })
      .catch(() => {})
  }

  const cancel = () => setDraft(null)

  return { draft, startFromFileInput, setZoom, handlePointerDown, confirm, cancel }
}
