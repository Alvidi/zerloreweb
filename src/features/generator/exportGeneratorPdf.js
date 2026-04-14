import { getAbilityDescription, getAbilityLabel } from '../../utils/abilities.js'
import { getWeaponAbilityId, WEAPON_ABILITY_IDS } from '../../utils/weaponAbilities.js'
import zeroLoreLogoToken from '../../images/zeroloreLogoToken.png'
import {
  buildArmyUnitDisplayNames,
  factionImages,
  getUnitTypeToken,
} from './generatorUtils.js'

const loadImageAsDataUrl = (src) =>
  new Promise((resolve, reject) => {
    const img = new Image()
    img.crossOrigin = 'anonymous'
    img.onload = () => {
      const canvas = document.createElement('canvas')
      canvas.width = img.width
      canvas.height = img.height
      const ctx = canvas.getContext('2d')
      ctx.drawImage(img, 0, 0)
      resolve(canvas.toDataURL('image/png'))
    }
    img.onerror = reject
    img.src = src
  })

const loadMonochromeImageAsDataUrl = (src, color = '#000000', options = {}) =>
  new Promise((resolve, reject) => {
    const { rasterSizePx } = options
    const img = new Image()
    img.crossOrigin = 'anonymous'
    img.onload = () => {
      const sourceWidth = Math.max(1, Math.round(img.naturalWidth || img.width || 1))
      const sourceHeight = Math.max(1, Math.round(img.naturalHeight || img.height || 1))
      const maxSourceSide = Math.max(sourceWidth, sourceHeight)
      const scale = rasterSizePx && maxSourceSide > 0 ? rasterSizePx / maxSourceSide : 1
      const outputWidth = Math.max(1, Math.round(sourceWidth * scale))
      const outputHeight = Math.max(1, Math.round(sourceHeight * scale))
      const canvas = document.createElement('canvas')
      canvas.width = outputWidth
      canvas.height = outputHeight
      const ctx = canvas.getContext('2d')
      ctx.clearRect(0, 0, outputWidth, outputHeight)
      ctx.imageSmoothingEnabled = true
      ctx.imageSmoothingQuality = 'high'
      ctx.drawImage(img, 0, 0, outputWidth, outputHeight)
      ctx.globalCompositeOperation = 'source-in'
      ctx.fillStyle = color
      ctx.fillRect(0, 0, outputWidth, outputHeight)
      ctx.globalCompositeOperation = 'source-over'
      resolve(canvas.toDataURL('image/png'))
    }
    img.onerror = reject
    img.src = src
  })

const getDataUrlImageFormat = (value) => {
  if (String(value || '').startsWith('data:image/jpeg') || String(value || '').startsWith('data:image/jpg')) {
    return 'JPEG'
  }
  return 'PNG'
}

const getPdfEraLabel = (era, t) => {
  const token = String(era?.token || '').toLowerCase()
  if (token === 'future') return t('generator.future')
  if (token === 'past') return t('generator.past')
  return String(era?.label || '').trim()
}

const cleanPassiveGroupName = (value) => String(value || '').replace(/^\s*\d+\.\s*/, '').trim()
const isPdfVisibleWeaponAbility = (ability) => getWeaponAbilityId(ability) !== WEAPON_ABILITY_IDS.limitedAmmo

export async function exportGeneratorPdf({
  armyUnits,
  armyFaction,
  totalValue,
  gameMode,
  t,
  lang,
}) {
  if (!armyUnits.length) return
  const [{ jsPDF }, { default: html2canvas }] = await Promise.all([
    import('jspdf'),
    import('html2canvas'),
  ])
  const doc = new jsPDF({ unit: 'mm', format: 'a4' })
  const pageWidth = doc.internal.pageSize.getWidth()
  const pageHeight = doc.internal.pageSize.getHeight()
  const margin = 12
  const usableWidth = pageWidth - margin * 2
  const pdfUnitDisplayNames = buildArmyUnitDisplayNames(armyUnits)
  const selectedPassiveGroup = armyFaction?.selectedPassiveGroup || null
  const passiveGroupTitle = cleanPassiveGroupName(selectedPassiveGroup?.nombre || '')
  const passiveAbilities = selectedPassiveGroup?.habilidades?.length
    ? selectedPassiveGroup.habilidades
    : armyFaction?.habilidades_faccion || []
  let y = margin

  const ensureSpace = (height) => {
    if (y + height > pageHeight - margin) {
      doc.addPage()
      y = margin
    }
  }

  const getLineHeight = (fontSize, multiplier = 1.2) => {
    doc.setFontSize(fontSize)
    return doc.getTextDimensions('Mg').h * multiplier
  }

  const drawSectionTitle = (text, bold = false) => {
    ensureSpace(10)
    doc.setFontSize(12)
    doc.setTextColor(20)
    doc.setFont(bold ? 'helvetica' : 'helvetica', bold ? 'bold' : 'normal')
    doc.text(text, margin, y)
    doc.setFont('helvetica', 'normal')
    y += 6
    doc.setDrawColor(200)
    doc.line(margin, y, pageWidth - margin, y)
    y += 4
  }

  const drawTextBlock = (text, fontSize = 9, width = usableWidth) => {
    doc.setFontSize(fontSize)
    doc.setTextColor(40)
    const lines = doc.splitTextToSize(text, width)
    const lineHeight = getLineHeight(fontSize)
    lines.forEach((line) => {
      ensureSpace(lineHeight)
      doc.text(line, margin, y)
      y += lineHeight
    })
  }

  const drawBulletItem = (title, description, fontSize = 9) => {
    const lineHeight = getLineHeight(fontSize)
    ensureSpace(lineHeight)
    doc.setFontSize(fontSize)
    doc.setTextColor(40)
    doc.setFont('helvetica', 'bold')
    doc.text(`• ${title}`, margin, y)
    doc.setFont('helvetica', 'normal')
    y += lineHeight
    if (!description) return
    const lines = doc.splitTextToSize(description, usableWidth - 6)
    lines.forEach((line) => {
      ensureSpace(lineHeight)
      doc.text(line, margin + 6, y)
      y += lineHeight
    })
  }

  const drawTable = ({
    columns,
    rows,
    columnWidths,
    compact = false,
    headerFill = [240, 246, 255],
    rowFill = [252, 252, 252],
  }) => {
    const baseRowHeight = compact ? 5.2 : 6.5
    const headerHeight = compact ? 5.5 : 6.8
    ensureSpace(headerHeight + 4)
    let x = margin
    doc.setFillColor(...headerFill)
    doc.rect(margin, y, usableWidth, headerHeight, 'F')
    doc.setDrawColor(210)
    doc.rect(margin, y, usableWidth, headerHeight)
    doc.setFontSize(compact ? 7.6 : 8.4)
    doc.setTextColor(20)
    columns.forEach((label, idx) => {
      const width = columnWidths[idx]
      doc.text(label, x + 2, y + (compact ? 3.9 : 4.5))
      x += width
    })
    y += headerHeight

    rows.forEach((row, rowIndex) => {
      const rowLines = row.map((cell, idx) => {
        const width = columnWidths[idx] - 4
        const text = String(cell ?? '–')
        doc.setFontSize(compact ? 7.8 : 8.6)
        return doc.splitTextToSize(text, width)
      })
      const lineHeight = getLineHeight(compact ? 7.8 : 8.6, 1.1)
      const rowHeight = Math.max(baseRowHeight, Math.max(...rowLines.map((lines) => lines.length)) * lineHeight + 1)
      ensureSpace(rowHeight + 2)
      doc.setDrawColor(225)
      if (rowIndex % 2 === 0) {
        doc.setFillColor(...rowFill)
        doc.rect(margin, y, usableWidth, rowHeight, 'F')
      }
      doc.rect(margin, y, usableWidth, rowHeight)
      let cx = margin
      row.forEach((cell, idx) => {
        const width = columnWidths[idx]
        const lines = rowLines[idx]
        doc.setFontSize(compact ? 7.8 : 8.6)
        doc.setTextColor(40)
        lines.forEach((line, lineIndex) => {
          doc.text(line, cx + 2, y + 4 + lineIndex * lineHeight, { maxWidth: width - 4 })
        })
        cx += width
      })
      y += rowHeight
    })

    y += 4
  }

  const drawStatsTable = (unit) => {
    const columnWidths = [18, 18, 18, 18, 26, usableWidth - (18 + 18 + 18 + 18 + 26)]
    const headerHeight = 7
    const baseRowHeight = 6.5
    const especialidad = String(unit.base.especialidad || '-')
    doc.setFontSize(8.5)
    const specialLines = doc.splitTextToSize(especialidad, columnWidths[5] - 4)
    const rowHeight = Math.max(baseRowHeight, specialLines.length * 4.2 + 2)

    ensureSpace(headerHeight + rowHeight + 6)
    let x = margin
    doc.setFillColor(240, 246, 255)
    doc.rect(margin, y, usableWidth, headerHeight, 'F')
    doc.setDrawColor(210)
    doc.rect(margin, y, usableWidth, headerHeight)
    doc.setFontSize(8)
    doc.setTextColor(20)
    const columns = [t('generator.mov'), t('generator.vidas'), t('generator.salv'), t('generator.vel'), t('generator.squadLabel'), t('generator.specialty')]
    columns.forEach((label, idx) => {
      const width = columnWidths[idx]
      doc.text(label, x + 2, y + 4.5)
      x += width
    })
    y += headerHeight

    ensureSpace(rowHeight + 2)
    doc.setDrawColor(225)
    doc.rect(margin, y, usableWidth, rowHeight)
    doc.setFontSize(8.5)
    doc.setTextColor(40)
    let cx = margin
    const cells = [
      unit.base.movimiento,
      unit.base.vidas,
      unit.base.salvacion,
      unit.base.velocidad,
      unit.squadSize || 1,
      specialLines,
    ]
    cells.forEach((cell, idx) => {
      const width = columnWidths[idx]
      if (idx === 5 && Array.isArray(cell)) {
        cell.forEach((line, lineIndex) => {
          doc.text(line, cx + 2, y + 4.6 + lineIndex * 4.2, { maxWidth: width - 4 })
        })
      } else {
        doc.text(String(cell ?? '-'), cx + 2, y + 4.6, { maxWidth: width - 4 })
      }
      cx += width
    })
    y += rowHeight + 4
  }

  const drawSubheader = (text, fill) => {
    ensureSpace(7)
    doc.setFillColor(...fill)
    doc.rect(margin, y, usableWidth, 6.5, 'F')
    doc.setFontSize(9.5)
    doc.setTextColor(20)
    doc.text(text, margin + 2, y + 4.6)
    y += 7.5
  }

  const getWrappedLines = (text, width, fontSize = 9) => {
    doc.setFontSize(fontSize)
    return doc.splitTextToSize(String(text || '—'), width)
  }

  const drawWrappedLines = ({
    lines,
    x,
    startY,
    fontSize = 9,
    color = 40,
    style = 'normal',
    lineMultiplier = 1.15,
  }) => {
    doc.setFont('helvetica', style)
    doc.setFontSize(fontSize)
    doc.setTextColor(color)
    const lineHeight = getLineHeight(fontSize, lineMultiplier)
    lines.forEach((line, index) => {
      doc.text(line, x, startY + index * lineHeight)
    })
    doc.setFont('helvetica', 'normal')
    return lineHeight * Math.max(lines.length, 1)
  }

  const drawPdfUnitTypeIcon = (x, centerY, type, size = 4.2) => {
    const token = getUnitTypeToken(type)
    const half = size / 2
    const left = x
    const top = centerY - half

    doc.setDrawColor(35)
    doc.setFillColor(35, 35, 35)
    doc.setLineWidth(0.35)

    if (token === 'line') {
      doc.rect(left + size * 0.18, top + size * 0.34, size * 0.64, size * 0.42)
      doc.line(left + size * 0.32, top + size * 0.34, left + size * 0.32, top + size * 0.12)
      doc.line(left + size * 0.68, top + size * 0.34, left + size * 0.68, top + size * 0.12)
      doc.line(left + size * 0.3, top + size * 0.12, left + size * 0.7, top + size * 0.12)
      return
    }
    if (token === 'elite') {
      doc.line(left + half, top, left + size, centerY)
      doc.line(left + size, centerY, left + half, top + size)
      doc.line(left + half, top + size, left, centerY)
      doc.line(left, centerY, left + half, top)
      return
    }
    if (token === 'vehicle') {
      doc.rect(left + size * 0.12, top + size * 0.28, size * 0.76, size * 0.34)
      doc.circle(left + size * 0.28, top + size * 0.78, size * 0.09, 'F')
      doc.circle(left + size * 0.72, top + size * 0.78, size * 0.09, 'F')
      return
    }
    if (token === 'monster') {
      doc.line(left + size * 0.12, top + size * 0.82, left + size * 0.32, top + size * 0.28)
      doc.line(left + size * 0.32, top + size * 0.28, left + size * 0.5, top + size * 0.62)
      doc.line(left + size * 0.5, top + size * 0.62, left + size * 0.7, top + size * 0.18)
      doc.line(left + size * 0.7, top + size * 0.18, left + size * 0.88, top + size * 0.5)
      return
    }
    if (token === 'hero') {
      doc.line(left + size * 0.1, top + size * 0.7, left + size * 0.3, top + size * 0.2)
      doc.line(left + size * 0.3, top + size * 0.2, left + size * 0.5, top + size * 0.55)
      doc.line(left + size * 0.5, top + size * 0.55, left + size * 0.7, top + size * 0.2)
      doc.line(left + size * 0.7, top + size * 0.2, left + size * 0.9, top + size * 0.7)
      doc.line(left + size * 0.24, top + size * 0.84, left + size * 0.76, top + size * 0.84)
      return
    }
    if (token === 'titan') {
      doc.rect(left + size * 0.28, top + size * 0.08, size * 0.44, size * 0.8)
      doc.line(left + size * 0.4, top + size * 0.3, left + size * 0.6, top + size * 0.3)
      doc.line(left + size * 0.4, top + size * 0.5, left + size * 0.6, top + size * 0.5)
      doc.line(left + size * 0.4, top + size * 0.7, left + size * 0.6, top + size * 0.7)
      return
    }

    doc.circle(left + half, centerY, size * 0.28)
  }

  const logoSource = armyFaction?.id ? factionImages[armyFaction.id] : null
  const logoDataUrl = logoSource ? await loadImageAsDataUrl(logoSource).catch(() => null) : null
  const blackZeroLoreLogoDataUrl = await loadMonochromeImageAsDataUrl(zeroLoreLogoToken, '#000000', { rasterSizePx: 1400 }).catch(() => null)

  const writeFooter = () => {
    const totalPages = doc.getNumberOfPages()
    for (let page = 1; page <= totalPages; page += 1) {
      doc.setPage(page)
      doc.setFontSize(8)
      doc.setTextColor(90)
      doc.text(`${armyFaction?.nombre || t('generator.currentArmy')} – ${armyFaction?.nombre || t('generator.faction')}`, margin, pageHeight - 6)
      doc.text(`${t('generator.page')} ${page} / ${totalPages}`, pageWidth - margin - 25, pageHeight - 6)
    }
  }

  // Main body copied intact from Generador.jsx exportPdf to preserve layout behavior.
  if (gameMode === 'escaramuza' || gameMode === 'escuadra') {
    const isSquadPdf = gameMode === 'escuadra'
    const lineColor = [46, 46, 46]
    const softFill = [248, 248, 248]
    const accentFill = [238, 238, 238]

    if (blackZeroLoreLogoDataUrl) {
      const brandNode = document.createElement('div')
      brandNode.style.position = 'fixed'
      brandNode.style.left = '-9999px'
      brandNode.style.top = '0'
      brandNode.style.display = 'inline-flex'
      brandNode.style.alignItems = 'flex-end'
      brandNode.style.gap = '8px'
      brandNode.style.padding = '6px 12px 10px 0'
      brandNode.style.boxSizing = 'border-box'
      brandNode.style.width = 'max-content'
      brandNode.style.whiteSpace = 'nowrap'
      brandNode.style.background = 'transparent'
      brandNode.style.color = '#111111'
      brandNode.style.fontFamily = '"Cinzel", Georgia, serif'
      brandNode.style.fontSize = '26px'
      brandNode.style.fontWeight = '700'
      brandNode.style.letterSpacing = '0.1em'
      brandNode.style.lineHeight = '1.08'

      const brandLogo = document.createElement('img')
      brandLogo.src = blackZeroLoreLogoDataUrl
      brandLogo.alt = 'ZeroLore'
      brandLogo.style.width = '22px'
      brandLogo.style.height = '22px'
      brandLogo.style.objectFit = 'contain'
      brandLogo.style.display = 'block'
      brandLogo.style.marginBottom = '1px'

      const brandText = document.createElement('span')
      brandText.textContent = 'ZEROLORE'
      brandText.style.display = 'block'

      brandNode.appendChild(brandLogo)
      brandNode.appendChild(brandText)
      document.body.appendChild(brandNode)

      try {
        if (document.fonts?.ready) {
          await document.fonts.ready
        }
        const brandCanvas = await html2canvas(brandNode, {
          backgroundColor: null,
          scale: 4,
          useCORS: true,
          logging: false,
        })
        const brandDataUrl = brandCanvas.toDataURL('image/png')
        const brandW = 40
        const brandH = (brandCanvas.height / brandCanvas.width) * brandW
        doc.addImage(brandDataUrl, 'PNG', margin, y - 1.2, brandW, brandH)
        y += brandH + 2.2
      } finally {
        brandNode.remove()
      }
    } else {
      doc.setFont('helvetica', 'bold')
      doc.setFontSize(13)
      doc.setTextColor(20)
      doc.text('ZEROLORE', margin, y)
      y += 3.5
    }
    doc.setDrawColor(...lineColor)
    doc.line(margin, y, pageWidth - margin, y)
    y += 5

    const headerHeight = 19
    ensureSpace(headerHeight + 4)
    doc.setDrawColor(...lineColor)
    doc.rect(margin, y, usableWidth, headerHeight)
    if (logoDataUrl) {
      doc.addImage(logoDataUrl, 'PNG', margin + 2.5, y + 2.5, 14, 14)
    }
    const factionTextX = margin + (logoDataUrl ? 20 : 4)
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(15)
    doc.setTextColor(20)
    doc.text(armyFaction?.nombre || t('generator.noFaction'), factionTextX, y + 7.2)
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(8.8)
    doc.setTextColor(90)
    doc.text(`${t('generator.roster')} · ${isSquadPdf ? t('generator.squad') : t('generator.skirmish')}`, factionTextX, y + 13)
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(9)
    doc.setTextColor(70)
    doc.text(`${t('generator.totalValue')}`, pageWidth - margin - 4, y + 7, { align: 'right' })
    doc.setFontSize(16)
    doc.setTextColor(20)
    doc.text(String(totalValue), pageWidth - margin - 4, y + 13.4, { align: 'right' })
    y += headerHeight + 6

    if (passiveAbilities.length) {
      const passiveTitleHeight = 7
      const passiveGroupLabel = passiveGroupTitle
        ? getWrappedLines(passiveGroupTitle, usableWidth - 10, 8.6)
        : []
      const passiveBlocks = passiveAbilities.slice(0, 6).map((habilidad) => {
        const title = getWrappedLines(habilidad.nombre || t('generator.passives'), usableWidth - 10, 9)
        const body = getWrappedLines(habilidad.descripcion || '—', usableWidth - 14, 8.4)
        return { title, body }
      })
      const passiveHeight =
        passiveTitleHeight +
        (passiveGroupLabel.length
          ? getLineHeight(8.6, 1.12) * Math.max(passiveGroupLabel.length, 1) + 3
          : 0) +
        passiveBlocks.reduce((total, block) => {
          const titleHeight = getLineHeight(9, 1.12) * Math.max(block.title.length, 1)
          const bodyHeight = getLineHeight(8.4, 1.18) * Math.max(block.body.length, 1)
          return total + titleHeight + bodyHeight + 3
        }, 4)

      ensureSpace(passiveHeight + 4)
      doc.setDrawColor(...lineColor)
      doc.rect(margin, y, usableWidth, passiveHeight)
      doc.setFillColor(...softFill)
      doc.rect(margin, y, usableWidth, passiveTitleHeight, 'F')
      doc.setFont('helvetica', 'bold')
      doc.setFontSize(9.5)
      doc.setTextColor(20)
      doc.text(t('generator.selectedPassiveSet'), margin + 3, y + 4.8)

      let passiveY = y + passiveTitleHeight + 4
      if (passiveGroupLabel.length) {
        drawWrappedLines({ lines: passiveGroupLabel, x: margin + 4, startY: passiveY, fontSize: 8.6, color: 45, style: 'bold', lineMultiplier: 1.12 })
        passiveY += getLineHeight(8.6, 1.12) * Math.max(passiveGroupLabel.length, 1) + 3
      }
      passiveBlocks.forEach((block) => {
        drawWrappedLines({ lines: block.title, x: margin + 4, startY: passiveY, fontSize: 9, color: 25, style: 'bold', lineMultiplier: 1.1 })
        passiveY += getLineHeight(9, 1.1) * Math.max(block.title.length, 1)
        drawWrappedLines({ lines: block.body, x: margin + 7, startY: passiveY, fontSize: 8.4, color: 55, style: 'normal', lineMultiplier: 1.18 })
        passiveY += getLineHeight(8.4, 1.18) * Math.max(block.body.length, 1) + 3
      })

      y += passiveHeight + 6
    }

    armyUnits.forEach((unit) => {
      const displayName = pdfUnitDisplayNames.get(unit.uid) || unit.base.nombre
      const cardPadding = 4
      const hasUnitImage = Boolean(unit.imageDataUrl)
      const unitImageSize = 14
      const cardHeaderHeight = 19
      const leftWidth = usableWidth * 0.59
      const rightWidth = usableWidth - leftWidth
      const leftInnerWidth = leftWidth - cardPadding * 2
      const rightInnerWidth = rightWidth - cardPadding * 2
      const specialTitleHeight = 5
      const statsHeight = 12
      const specialLabel = getWrappedLines(`${t('generator.specialty')}:`, leftInnerWidth, 8.4)
      const specialText = getWrappedLines(
        unit.base.especialidad && unit.base.especialidad !== '-' ? unit.base.especialidad : '—',
        leftInnerWidth,
        8.6,
      )

      const buildGroupedWeaponEntries = (loadouts, listKey, slotLabel) => {
        const counts = new Map()
        const weaponsByName = new Map()
        loadouts.forEach((loadout) => {
          const value = loadout[listKey]
          const list = Array.isArray(value) ? value : value ? [value] : []
          list.forEach((weapon) => {
            const name = weapon?.nombre || '—'
            counts.set(name, (counts.get(name) || 0) + 1)
            if (weapon && !weaponsByName.has(name)) {
              weaponsByName.set(name, weapon)
            }
          })
        })
        return Array.from(counts.entries())
          .map(([name, count]) => {
            const weapon = weaponsByName.get(name)
            if (!weapon) return null
            return { ...weapon, baseNombre: weapon.nombre, nombre: `${weapon.nombre} - ${count} ${t('generator.units').toLowerCase()}`, slotLabel }
          })
          .filter(Boolean)
      }

      const weaponEntries = isSquadPdf && unit.perMiniLoadouts?.length
        ? [
            ...buildGroupedWeaponEntries(unit.perMiniLoadouts, 'shooting', t('generator.shooting')),
            ...buildGroupedWeaponEntries(unit.perMiniLoadouts, 'melee', t('generator.melee')),
          ]
        : [
            ...unit.shooting.map((weapon) => ({ ...weapon, slotLabel: t('generator.shooting') })),
            ...(unit.melee ? [{ ...unit.melee, slotLabel: t('generator.melee') }] : []),
          ]

      const uniqueWeaponAbilities = Array.from(
        weaponEntries.reduce((map, weapon) => {
          ;(weapon.habilidades || []).filter((ability) => ability && isPdfVisibleWeaponAbility(ability)).forEach((ability) => {
            const current = map.get(ability) || {
              raw: ability,
              label: getAbilityLabel(ability, lang),
              description: getAbilityDescription(ability, lang),
              weaponNames: [],
            }
            const weaponName = weapon.baseNombre || weapon.nombre
            if (!current.weaponNames.includes(weaponName)) {
              current.weaponNames.push(weaponName)
            }
            map.set(ability, current)
          })
          return map
        }, new Map()).values(),
      ).filter((item) => item.label)

      const weaponSkillsLabel = getWrappedLines(`${t('generator.weaponSkills')}:`, leftInnerWidth, 8.2)
      const weaponAbilityBlocks = uniqueWeaponAbilities.map((item) => ({
        labelLines: getWrappedLines(`${item.label} (${item.weaponNames.join(', ')})`, leftInnerWidth, 8.1),
        descriptionLines: getWrappedLines(item.description || t('generator.pendingDescription'), leftInnerWidth - 3, 7.8),
      }))

      const weaponHeights = weaponEntries.map((weapon) => {
        doc.setFont('helvetica', 'bold')
        doc.setFontSize(8.6)
        const slotLabelWidth = doc.getTextWidth(`${weapon.slotLabel}: `) + 1.4
        const nameLines = getWrappedLines(weapon.nombre, Math.max(rightInnerWidth - slotLabelWidth, 24), 8.6)
        const abilityText = (weapon.habilidades || [])
          .filter((ability) => isPdfVisibleWeaponAbility(ability))
          .map((ability) => getAbilityLabel(ability, lang))
          .filter(Boolean)
          .join(', ') || '—'
        const abilityLines = getWrappedLines(abilityText, rightInnerWidth, 7.6)
        const abilityBoxHeight = getLineHeight(7.6, 1.15) * Math.max(abilityLines.length, 1) + 4
        return {
          weapon,
          slotLabelWidth,
          nameLines,
          abilityLines,
          abilityBoxHeight,
          height: getLineHeight(8.6, 1.1) * Math.max(nameLines.length, 1) + 10.5 + abilityBoxHeight + 5,
        }
      })

      const weaponAbilitiesHeight = uniqueWeaponAbilities.length
        ? 5 + getLineHeight(8.2, 1.1) * Math.max(weaponSkillsLabel.length, 1) +
          weaponAbilityBlocks.reduce((total, block) => {
            const labelHeight = getLineHeight(8.1, 1.08) * Math.max(block.labelLines.length, 1)
            const descriptionHeight = getLineHeight(7.8, 1.14) * Math.max(block.descriptionLines.length, 1)
            return total + labelHeight + descriptionHeight + 2.6
          }, 3)
        : 0

      const leftContentHeight =
        statsHeight +
        specialTitleHeight +
        getLineHeight(8.4, 1.1) * Math.max(specialLabel.length, 1) +
        getLineHeight(8.6, 1.16) * Math.max(specialText.length, 1) +
        5 +
        weaponAbilitiesHeight

      const rightContentHeight = weaponHeights.length
        ? weaponHeights.reduce((total, entry) => total + entry.height, 0)
        : getLineHeight(8.2, 1.15) + 2

      const bodyHeight = Math.max(leftContentHeight, rightContentHeight) + cardPadding * 2
      const cardHeight = cardHeaderHeight + bodyHeight
      ensureSpace(cardHeight + 5)

      const cardTop = y
      const bodyTop = cardTop + cardHeaderHeight
      const splitX = margin + leftWidth

      doc.setDrawColor(...lineColor)
      doc.rect(margin, cardTop, usableWidth, cardHeight)
      doc.setFillColor(...accentFill)
      doc.rect(margin, cardTop, usableWidth, cardHeaderHeight, 'F')
      doc.line(splitX, cardTop + cardHeaderHeight, splitX, cardTop + cardHeight)

      const factionMetaY = cardTop + 4.9
      const titleY = cardTop + 9.6
      const imageX = margin + 2.6
      const imageY = cardTop + 2
      doc.setFillColor(255, 255, 255)
      doc.setDrawColor(205)
      doc.roundedRect(imageX, imageY, unitImageSize, unitImageSize, 1.2, 1.2, 'FD')
      if (hasUnitImage) {
        try {
          doc.addImage(unit.imageDataUrl, getDataUrlImageFormat(unit.imageDataUrl), imageX + 0.4, imageY + 0.4, unitImageSize - 0.8, unitImageSize - 0.8)
        } catch {
          drawPdfUnitTypeIcon(imageX + 4.7, imageY + unitImageSize / 2, unit.base.tipo, 5.6)
        }
      } else {
        drawPdfUnitTypeIcon(imageX + 4.7, imageY + unitImageSize / 2, unit.base.tipo, 5.6)
      }
      const titleStartX = imageX + unitImageSize + 3
      if (logoDataUrl) {
        doc.addImage(logoDataUrl, 'PNG', titleStartX, factionMetaY - 2.7, 3.8, 3.8)
      }
      doc.setFont('helvetica', 'bold')
      doc.setFontSize(6.4)
      doc.setTextColor(95)
      doc.text(armyFaction?.nombre || t('generator.noFaction'), titleStartX + (logoDataUrl ? 5.2 : 0), factionMetaY)
      doc.setFont('helvetica', 'bold')
      doc.setFontSize(10.8)
      doc.setTextColor(20)
      const unitNameX = titleStartX
      doc.text(displayName, unitNameX, titleY)
      doc.setFont('helvetica', 'normal')
      doc.setFontSize(8.8)
      doc.setTextColor(85)
      const eraLabels = (Array.isArray(unit.base.eras) ? unit.base.eras : [])
        .map((era) => getPdfEraLabel(era, t))
        .filter(Boolean)
      const unitMetaText = eraLabels.length ? `${unit.base.tipo} · ${eraLabels.join(' · ')}` : unit.base.tipo
      const unitMetaLines = doc.splitTextToSize(unitMetaText, Math.max(splitX - unitNameX - 3, 24))
      doc.text(unitMetaLines, unitNameX, titleY + 4.1)
      doc.setFont('helvetica', 'bold')
      doc.setFontSize(9)
      doc.setTextColor(55)
      doc.text(`${unit.total} ${t('generator.valueUnit')}`, pageWidth - margin - 3, cardTop + 8, { align: 'right' })

      const statLabels = isSquadPdf
        ? [t('generator.mov'), t('generator.vidas'), t('generator.salv'), t('generator.vel'), t('generator.squadLabel')]
        : [t('generator.mov'), t('generator.vidas'), t('generator.salv'), t('generator.vel')]
      const statValues = isSquadPdf
        ? [unit.base.movimiento, unit.base.vidas, unit.base.salvacion, unit.base.velocidad, String(unit.squadSize || 1)]
        : [unit.base.movimiento, unit.base.vidas, unit.base.salvacion, unit.base.velocidad]
      const statCellWidth = leftInnerWidth / statLabels.length
      const statsTop = bodyTop + cardPadding
      statLabels.forEach((label, index) => {
        const statX = margin + cardPadding + index * statCellWidth
        doc.setFillColor(...softFill)
        doc.rect(statX, statsTop, statCellWidth, statsHeight, 'F')
        doc.setDrawColor(215)
        doc.rect(statX, statsTop, statCellWidth, statsHeight)
        doc.setFont('helvetica', 'bold')
        doc.setFontSize(7.1)
        doc.setTextColor(90)
        doc.text(label, statX + 2, statsTop + 3.3)
        doc.setFont('helvetica', 'bold')
        doc.setFontSize(9.7)
        doc.setTextColor(20)
        doc.text(String(statValues[index] ?? '—'), statX + 2, statsTop + 8.5)
      })

      let leftY = statsTop + statsHeight + 5
      drawWrappedLines({ lines: specialLabel, x: margin + cardPadding, startY: leftY, fontSize: 8.4, color: 50, style: 'bold', lineMultiplier: 1.1 })
      leftY += getLineHeight(8.4, 1.1) * Math.max(specialLabel.length, 1) + 1
      drawWrappedLines({ lines: specialText, x: margin + cardPadding, startY: leftY, fontSize: 8.6, color: 45, style: 'normal', lineMultiplier: 1.16 })
      leftY += getLineHeight(8.6, 1.16) * Math.max(specialText.length, 1)

      if (uniqueWeaponAbilities.length) {
        leftY += 3.5
        doc.setDrawColor(218)
        doc.line(margin + cardPadding, leftY, margin + leftWidth - cardPadding, leftY)
        leftY += 4
        drawWrappedLines({ lines: weaponSkillsLabel, x: margin + cardPadding, startY: leftY, fontSize: 8.2, color: 50, style: 'bold', lineMultiplier: 1.1 })
        leftY += getLineHeight(8.2, 1.1) * Math.max(weaponSkillsLabel.length, 1) + 1.8

        weaponAbilityBlocks.forEach((block) => {
          drawWrappedLines({ lines: block.labelLines, x: margin + cardPadding, startY: leftY, fontSize: 8.1, color: 25, style: 'bold', lineMultiplier: 1.08 })
          leftY += getLineHeight(8.1, 1.08) * Math.max(block.labelLines.length, 1)
          drawWrappedLines({ lines: block.descriptionLines, x: margin + cardPadding + 3, startY: leftY, fontSize: 7.8, color: 75, style: 'normal', lineMultiplier: 1.14 })
          leftY += getLineHeight(7.8, 1.14) * Math.max(block.descriptionLines.length, 1) + 2.6
        })
      }

      let rightY = bodyTop + cardPadding
      if (!weaponHeights.length) {
        drawWrappedLines({ lines: [t('generator.noWeaponsAvailable')], x: splitX + cardPadding, startY: rightY + 2, fontSize: 8.2, color: 70, style: 'normal', lineMultiplier: 1.15 })
      } else {
        weaponHeights.forEach((entry, index) => {
          const sectionTop = index > 0 ? rightY + 2.2 : rightY
          const statBoxTop = sectionTop + 3
          const statLabelsCompact = [t('generator.weaponAtq'), t('generator.weaponDist'), t('generator.weaponImp'), t('generator.weaponDamage'), t('generator.weaponCrit')]
          const statValuesCompact = [entry.weapon.ataques || '–', entry.weapon.distancia || '–', entry.weapon.impactos || '–', entry.weapon.danio || '–', entry.weapon.danio_critico || '–']
          const weaponStatHeight = 10.5
          const weaponCellWidth = rightInnerWidth / statLabelsCompact.length
          const previousEntry = weaponHeights[index - 1]
          const showDivider = index > 0 && previousEntry?.weapon?.slotLabel !== entry.weapon.slotLabel
          if (showDivider) {
            doc.setDrawColor(222)
            doc.line(splitX, rightY, margin + usableWidth, rightY)
          }
          const labelX = splitX + cardPadding
          const labelColor = entry.weapon.slotLabel === t('generator.shooting') ? [184, 61, 34] : [198, 124, 24]
          doc.setFont('helvetica', 'bold')
          doc.setFontSize(8.6)
          doc.setTextColor(...labelColor)
          doc.text(`${entry.weapon.slotLabel}:`, labelX, sectionTop + 2.2)
          drawWrappedLines({ lines: entry.nameLines, x: labelX + entry.slotLabelWidth, startY: sectionTop + 2.2, fontSize: 8.6, color: 20, style: 'bold', lineMultiplier: 1.1 })
          rightY = sectionTop + getLineHeight(8.6, 1.1) * Math.max(entry.nameLines.length, 1)

          statLabelsCompact.forEach((label, cellIndex) => {
            const cellX = splitX + cardPadding + cellIndex * weaponCellWidth
            doc.setFillColor(...softFill)
            doc.rect(cellX, statBoxTop, weaponCellWidth, weaponStatHeight, 'F')
            doc.setDrawColor(215)
            doc.rect(cellX, statBoxTop, weaponCellWidth, weaponStatHeight)
            doc.setFont('helvetica', 'bold')
            doc.setFontSize(6.8)
            doc.setTextColor(90)
            doc.text(label, cellX + 1.3, statBoxTop + 3.1)
            doc.setFont('helvetica', 'bold')
            doc.setFontSize(8.8)
            doc.setTextColor(20)
            doc.text(String(statValuesCompact[cellIndex]), cellX + 1.3, statBoxTop + 8.1)
          })
          rightY = statBoxTop + weaponStatHeight
          const abilityBoxTop = rightY
          doc.setFillColor(251, 251, 251)
          doc.rect(splitX + cardPadding, abilityBoxTop, rightInnerWidth, entry.abilityBoxHeight, 'F')
          doc.setDrawColor(215)
          doc.rect(splitX + cardPadding, abilityBoxTop, rightInnerWidth, entry.abilityBoxHeight)
          drawWrappedLines({ lines: entry.abilityLines, x: splitX + cardPadding + 1.3, startY: abilityBoxTop + 3.1, fontSize: 7.6, color: 85, style: 'normal', lineMultiplier: 1.15 })
          rightY = abilityBoxTop + entry.abilityBoxHeight + 3.2
        })
      }
      y += cardHeight + 5
    })

    writeFooter()
    doc.save(`zerolore_${armyFaction?.nombre || 'ejercito'}.pdf`)
    return
  }

  if (logoDataUrl) {
    doc.addImage(logoDataUrl, 'PNG', margin, y - 2, 16, 16)
  }
  doc.setFontSize(18)
  doc.setTextColor(10)
  const headerX = margin + (logoDataUrl ? 20 : 0)
  const headerText = `${t('generator.roster')} – ${armyFaction?.nombre || t('generator.currentArmy')}`
  doc.text(headerText, headerX, y + 6)
  y += 12
  doc.setFontSize(10)
  doc.setTextColor(50)
  if (logoDataUrl) {
    y = Math.max(y, margin + 18)
  }
  const headerMeta = `${t('generator.faction')}: ${armyFaction?.nombre || '—'} | ${t('generator.totalValue')}: ${totalValue}`
  const metaLines = doc.splitTextToSize(headerMeta, usableWidth)
  const metaLineHeight = getLineHeight(10)
  metaLines.forEach((line) => {
    ensureSpace(metaLineHeight)
    doc.text(line, headerX, y)
    y += metaLineHeight
  })
  y += 2
  if (passiveAbilities.length) {
    drawSectionTitle(t('generator.selectedPassiveSet'), true)
    if (passiveGroupTitle) {
      drawTextBlock(passiveGroupTitle, 9.4)
      y += 1
    }
    passiveAbilities.slice(0, 6).forEach((habilidad) => {
      drawBulletItem(habilidad.nombre, habilidad.descripcion, 9)
    })
    y += 2
  }

  drawSectionTitle(t('generator.units'))

  armyUnits.forEach((unit, unitIndex) => {
    const displayName = pdfUnitDisplayNames.get(unit.uid) || unit.base.nombre
    ensureSpace(50)
    if (y > pageHeight - margin - 60) {
      doc.addPage()
      y = margin
    }
    y += 2
    doc.setFontSize(13)
    doc.setTextColor(20)
    const isSquad = gameMode === 'escuadra' && unit.squadSize > 1
    const squadLabel = isSquad ? `${t('generator.squadLabel')} ${unitIndex + 1}: ` : ''
    const squadCount = isSquad ? ` x${unit.squadSize || 1}` : ''
    doc.text(`${squadLabel}${displayName}${squadCount} (${unit.base.tipo})`, margin, y)
    doc.setFontSize(9.5)
    doc.setTextColor(60)
    doc.text(`${unit.total} ${t('generator.valueUnit')}`, pageWidth - margin - 25, y)
    y += 6

    drawStatsTable(unit)

    const buildGroupedWeapons = (loadouts, listKey) => {
      const counts = new Map()
      const weaponsByName = new Map()
      loadouts.forEach((loadout) => {
        const value = loadout[listKey]
        const list = Array.isArray(value) ? value : value ? [value] : []
        list.forEach((weapon) => {
          const name = weapon?.nombre || '–'
          counts.set(name, (counts.get(name) || 0) + 1)
          if (weapon && !weaponsByName.has(name)) {
            weaponsByName.set(name, weapon)
          }
        })
      })
      return Array.from(counts.entries()).map(([name, count]) => ({
        name,
        count,
        weapon: weaponsByName.get(name) || null,
      }))
    }

    const drawWeaponTable = (title, weapons) => {
      if (!weapons.length) {
        drawSubheader(title, [255, 240, 244])
        drawTextBlock(t('generator.noWeaponsAvailable'), 8.6)
        y += 2
        return
      }
      drawSubheader(title, [255, 240, 244])
      drawTable({
        columns: [t('generator.weapon'), t('generator.weaponAtq'), t('generator.weaponDist'), t('generator.weaponImp'), `${t('generator.weaponDamage')} / ${t('generator.weaponCrit')}`, t('generator.weaponSkills'), t('generator.weaponValue')],
        rows: weapons.map((weapon) => [
          weapon.nombre,
          weapon.ataques,
          weapon.distancia || '–',
          weapon.impactos || '–',
          `${weapon.danio} / ${weapon.danio_critico}`,
          (weapon.habilidades || [])
            .filter((ability) => ability && isPdfVisibleWeaponAbility(ability))
            .join(', ')
            .slice(0, 120),
          weapon.valor_extra ?? 0,
        ]),
        columnWidths: [usableWidth * 0.3, 14, 16, 14, 24, usableWidth * 0.24, usableWidth * 0.1],
        compact: true,
        headerFill: [232, 239, 250],
        rowFill: [252, 252, 252],
      })
    }

    if (unit.shooting.length || unit.melee) {
      if (isSquad && unit.perMiniLoadouts?.length) {
        const shootingGroups = buildGroupedWeapons(unit.perMiniLoadouts, 'shooting')
        const meleeGroups = buildGroupedWeapons(unit.perMiniLoadouts, 'melee')
        const shootingRows = shootingGroups.map((group) => {
          const weapon = group.weapon
          if (!weapon) return null
          return { ...weapon, nombre: `${weapon.nombre} x${group.count}` }
        }).filter(Boolean)
        const meleeRows = meleeGroups.map((group) => {
          const weapon = group.weapon
          if (!weapon) return null
          return { ...weapon, nombre: `${weapon.nombre} x${group.count}` }
        }).filter(Boolean)
        drawWeaponTable(t('generator.shooting').toUpperCase(), shootingRows)
        if (meleeRows.length) drawWeaponTable(t('generator.melee').toUpperCase(), meleeRows)
      } else {
        drawWeaponTable(t('generator.shooting').toUpperCase(), unit.shooting)
        if (unit.melee) drawWeaponTable(t('generator.melee').toUpperCase(), [unit.melee])
      }
    }
    y += 4
  })

  ensureSpace(10)
  doc.setFontSize(12)
  doc.setTextColor(20)
  doc.text(`${t('generator.totalValue')}: ${totalValue} ${t('generator.valueUnit')}`, margin, y)

  writeFooter()
  doc.save(`zerolore_${armyFaction?.nombre || 'ejercito'}.pdf`)
}
