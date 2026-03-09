import fs from 'node:fs';
import path from 'node:path';
import { JSDOM } from 'jsdom';

const ROOT = process.cwd();
const DATA_DIR = path.join(ROOT, 'src/data');
const HTML_DIR = path.join(DATA_DIR, 'factions');
const ES_JSON_DIR = path.join(DATA_DIR, 'factions/jsonFaccionesES');
const EN_JSON_DIR = path.join(DATA_DIR, 'factions/jsonFaccionesEN');
const DRY_RUN = process.argv.includes('--dry-run');

const BASES = [
  'alianza',
  'enjambre',
  'federacion',
  'legionarios_crisol',
  'rebeldes',
  'salvajes',
  'tecnocratas',
  'tecnotumbas',
  'vacio',
];

const TITLE_ALIASES = {
  tecnocratas: ['tecnocratras', 'tecnocratas'],
};

const CLASS_CANONICAL = {
  linea: 'Línea',
  elite: 'Élite',
  vehiculo: 'Vehículo',
  heroe: 'Héroe',
  titan: 'Titán',
  monstruo: 'Monstruo',
};

function normalize(value) {
  return String(value || '')
    .replace(/[”″“]/g, '"')
    .replace(/[‐‑‒–—−]/g, '-')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .trim();
}

function normalizeKey(value) {
  return normalize(value).replace(/[^a-z0-9]/g, '');
}

function cleanText(value) {
  return String(value || '')
    .replace(/\u00A0/g, ' ')
    .replace(/[”″“]/g, '"')
    .replace(/[‐‑‒–—−]/g, '-')
    .replace(/\s+/g, ' ')
    .replace(/\s+([,.;:!?\)])/g, '$1')
    .replace(/\(\s+/g, '(')
    .trim();
}

function titleCase(value) {
  return cleanText(value)
    .split(' ')
    .filter(Boolean)
    .map((word) => word[0].toUpperCase() + word.slice(1).toLowerCase())
    .join(' ');
}

function normalizeClassLabel(value) {
  const key = normalize(value).replace(/[^a-z]/g, '');
  return CLASS_CANONICAL[key] || cleanText(value);
}

function normalizeSpecialty(value) {
  const text = cleanText(value);
  if (!text || /^[-–—]$/.test(text)) return '-';
  const idx = text.search(/[A-Za-zÁÉÍÓÚÑáéíóúñ]/);
  if (idx < 0) return text;
  return `${text.slice(0, idx)}${text[idx].toUpperCase()}${text.slice(idx + 1)}`;
}

function antiGroupLabel(value) {
  const key = normalize(value);
  if (key === 'linea' || key === 'line') return 'Línea';
  if (key === 'elite' || key === 'elites') return 'Élite';
  if (key === 'vehiculo' || key === 'vehicle') return 'Vehículo';
  if (key === 'vehiculos' || key === 'vehicles') return 'Vehículos';
  if (key === 'titan' || key === 'titans') return 'Titán';
  if (key === 'monstruo' || key === 'monster') return 'Monstruo';
  if (key === 'monstruos' || key === 'monsters') return 'Monstruos';
  if (key === 'heroe' || key === 'hero') return 'Héroe';
  if (key === 'heroes') return 'Héroes';
  if (key === 'todo' || key === 'all') return 'Todo';
  return titleCase(value);
}

function normalizeAbilityLabel(raw) {
  const text = cleanText(raw);
  if (!text || /^[-–—]$/.test(text)) return '';
  const key = normalize(text);

  const antiMatch = text.match(/^anti\s*([+-]?\s*\d+\+?)?\s*(?:\(([^)]+)\))?$/i);
  if (antiMatch) {
    let num = (antiMatch[1] || '').replace(/\s+/g, '');
    if (/^\+\d+$/.test(num)) num = `${num.slice(1)}+`;
    else if (/^\d+$/.test(num)) num = `${num}+`;
    const groups = (antiMatch[2] || '')
      .split(/[/,]/)
      .map((part) => part.trim())
      .filter(Boolean)
      .map(antiGroupLabel);
    const groupPart = groups.length ? ` (${groups.join('/')})` : '';
    return `Anti${num ? ` ${num}` : ''}${groupPart}`;
  }

  if (key === 'directo' || key === 'direct') return 'Directo';
  if (key === 'pistolero' || key === 'gunslinger') return 'Pistolero';
  if (key === 'pesada' || key === 'heavy') return 'Pesada';
  if (key === 'explosiva' || key === 'explosive') return 'Explosiva';
  if (key === 'precision') return 'Precisión';
  if (key === 'guerrilla') return 'Guerrilla';
  if (key === 'inestable' || key === 'unstable') return 'Inestable';
  if (key === 'impactos encadenados' || key === 'chained impacts') return 'Impactos encadenados';
  if (key === 'ignora coberturas' || key === 'ignora cobertura') return 'Ignora coberturas';
  if (key === 'disparo parabolico' || key === 'indirect fire' || key === 'parabolic shot') return 'Disparo parabólico';

  if (key.startsWith('ataque rapido')) {
    const num = text.match(/[+-]\s*\d+/);
    return num ? `Ataque rápido ${num[0].replace(/\s+/g, '')}` : 'Ataque rápido';
  }
  if (key.startsWith('asaltante')) {
    const num = text.match(/[+-]\s*\d+/);
    return num ? `Asaltante ${num[0].replace(/\s+/g, '')}` : 'Asaltante';
  }
  if (key.startsWith('ataque critico')) {
    const num = text.match(/[+-]\s*\d+/);
    return num ? `Ataque crítico (${num[0].replace(/\s+/g, '')})` : 'Ataque crítico';
  }
  if (key.startsWith('municion limitada') || key.startsWith('limited ammo')) {
    const num = text.match(/\d+/);
    return num ? `Munición limitada (${num[0]})` : 'Munición limitada';
  }

  return text[0].toUpperCase() + text.slice(1);
}

function toNumber(value, fallback = 0) {
  const m = cleanText(value).match(/-?\d+/);
  if (!m) return fallback;
  const n = Number.parseInt(m[0], 10);
  return Number.isFinite(n) ? n : fallback;
}

function normalizeSigned(value, fallback = '-') {
  const text = cleanText(value);
  if (!text || /^[-–—]$/.test(text)) return fallback;
  const plus = text.match(/(\d+)\s*\+/);
  if (plus) return `+${plus[1]}`;
  const signed = text.match(/[+-]\s*\d+/);
  if (signed) return signed[0].replace(/\s+/g, '');
  const num = text.match(/\d+/);
  return num ? `+${num[0]}` : fallback;
}

function normalizeMeasure(value, fallback = '-') {
  const text = cleanText(value);
  if (!text || /^[-–—]$/.test(text)) return fallback;
  const m = text.match(/(\d+)\s*["”″]?/);
  return m ? `${m[1]}"` : text;
}

function normalizeAttacks(value) {
  return cleanText(value).toUpperCase().replace(/\s+/g, '');
}

function parseDamagePair(value) {
  const text = cleanText(value);
  const parts = text.split('/').map((part) => cleanText(part).replace(/\s+/g, '').toUpperCase());
  return {
    danio: parts[0] || '1',
    danio_critico: parts[1] || parts[0] || '1',
  };
}

function parseSquadRange(value) {
  const text = cleanText(value);
  const m = text.match(/(\d+)\s*\/\s*(\d+)/);
  if (!m) return null;
  return { min: Number(m[1]), max: Number(m[2]) };
}

function splitAbilities(value) {
  const text = cleanText(value);
  if (!text || /^[-–—]$/.test(text)) return [];

  const out = [];
  let chunk = '';
  let depth = 0;

  for (const char of text) {
    if (char === '(') depth += 1;
    if (char === ')') depth = Math.max(0, depth - 1);
    if (char === ',' && depth === 0) {
      const item = cleanText(chunk);
      if (item) out.push(item);
      chunk = '';
      continue;
    }
    chunk += char;
  }

  const tail = cleanText(chunk);
  if (tail) out.push(tail);

  return out.map(normalizeAbilityLabel).filter(Boolean);
}

function getRowCells(row) {
  return [...row.querySelectorAll('td, th')].map((cell) => cleanText(cell.textContent));
}

function parseWeaponRow(cells, type) {
  const name = cleanText(cells[0]);
  if (!name || /^[-–—]+$/.test(name)) return null;

  if (type === 'disparo') {
    const attacks = normalizeAttacks(cells[1] || '');
    if (!attacks || /^[-–—]+$/.test(attacks)) return null;
    const dmg = parseDamagePair(cells[4] || '');
    return {
      nombre: name,
      ataques: attacks,
      distancia: normalizeMeasure(cells[2] || ''),
      impactos: normalizeSigned(cells[3] || '', '-'),
      danio: dmg.danio,
      danio_critico: dmg.danio_critico,
      habilidades_arma: splitAbilities(cells[5] || ''),
      valor_extra: toNumber(cells[6] || '0', 0),
    };
  }

  const attacks = normalizeAttacks(cells[1] || '');
  if (!attacks || /^[-–—]+$/.test(attacks)) return null;
  const dmg = parseDamagePair(cells[2] || '');
  return {
    nombre: name,
    ataques: attacks,
    distancia: null,
    impactos: null,
    danio: dmg.danio,
    danio_critico: dmg.danio_critico,
    habilidades_arma: splitAbilities(cells[3] || ''),
    valor_extra: toNumber(cells[4] || '0', 0),
  };
}

function findRowIndex(rows, predicate, from = 0) {
  for (let i = from; i < rows.length; i += 1) {
    if (predicate(rows[i], i)) return i;
  }
  return -1;
}

function parseUnitTable(table) {
  const rows = [...table.querySelectorAll('tr')]
    .map(getRowCells)
    .filter((cells) => cells.some((cell) => cell));

  if (!rows.length) return null;
  const unitName = cleanText(rows[0][0] || '');
  if (!unitName) return null;

  const profileHeaderIdx = findRowIndex(rows, (cells) => normalize(cells[0]) === 'clase');
  const shootHeaderIdx = findRowIndex(rows, (cells) => normalize(cells[0]).startsWith('disparo'));
  const meleeHeaderIdx = findRowIndex(rows, (cells, idx) => idx > shootHeaderIdx && normalize(cells[0]).startsWith('cuerpo a'));

  if (profileHeaderIdx < 0 || shootHeaderIdx < 0 || meleeHeaderIdx < 0) return null;

  const profileCells = rows[profileHeaderIdx + 1] || [];
  const squad = parseSquadRange(profileCells[5] || '');
  const profile = {
    clase: normalizeClassLabel(profileCells[0] || ''),
    movimiento: normalizeMeasure(profileCells[1] || ''),
    vidas: toNumber(profileCells[2] || '', 0),
    salvacion: normalizeSigned(profileCells[3] || '', '+6'),
    velocidad: toNumber(profileCells[4] || '', 0),
    escuadra: squad,
    especialidad: normalizeSpecialty(profileCells[6] || '-'),
    valor: toNumber(profileCells[7] || '', 0),
  };

  const disparoRows = rows
    .slice(shootHeaderIdx + 1, meleeHeaderIdx)
    .map((cells) => parseWeaponRow(cells, 'disparo'))
    .filter(Boolean);

  const meleeRows = rows
    .slice(meleeHeaderIdx + 1)
    .map((cells) => parseWeaponRow(cells, 'cuerpo_a_cuerpo'))
    .filter(Boolean);

  return {
    nombre_unidad: unitName,
    clase: profile.clase,
    perfil: profile,
    armas: {
      disparo: disparoRows,
      cuerpo_a_cuerpo: meleeRows,
    },
  };
}

function findSectionHeader(doc, text) {
  const target = normalize(text);
  return [...doc.querySelectorAll('h2, h3')].find((el) => normalize(el.textContent).startsWith(target)) || null;
}

function nextSiblingBlocks(anchor) {
  const wrapper = anchor.closest('div') || anchor;
  const blocks = [];
  let current = wrapper.nextElementSibling;
  while (current) {
    blocks.push(current);
    current = current.nextElementSibling;
  }
  return blocks;
}

function extractStyle(doc) {
  const header = findSectionHeader(doc, 'Estilo de juego');
  if (!header) return '';
  const blocks = nextSiblingBlocks(header);
  for (const block of blocks) {
    const stop = block.querySelector('h2, h3');
    if (stop) break;
    const paragraph = block.querySelector('p');
    if (paragraph) {
      const text = cleanText(paragraph.textContent);
      if (text) return text;
    }
  }
  return '';
}

function extractSkills(doc) {
  const header = findSectionHeader(doc, 'Habilidades de facción');
  if (!header) return [];

  const blocks = nextSiblingBlocks(header);
  const skills = [];
  for (const block of blocks) {
    const nestedHeader = block.querySelector('h2, h3');
    if (nestedHeader && normalize(nestedHeader.textContent).startsWith('unidades')) break;

    const lis = [...block.querySelectorAll('li')];
    for (const li of lis) {
      const raw = cleanText(li.textContent);
      if (!raw) continue;
      const idx = raw.indexOf(':');
      const description = idx >= 0 ? cleanText(raw.slice(idx + 1)) : raw;
      if (description) skills.push(description);
    }
  }

  return skills;
}

function parseFactionHtml(filePath) {
  const raw = fs.readFileSync(filePath, 'utf8');
  const dom = new JSDOM(raw);
  const doc = dom.window.document;
  const title = cleanText(doc.title || path.basename(filePath));
  const style = extractStyle(doc);
  const skills = extractSkills(doc);
  const units = [...doc.querySelectorAll('table.simple-table')].map(parseUnitTable).filter(Boolean);
  return { title, style, skills, units };
}

function createWeapon(weapon, type) {
  return {
    nombre: weapon.nombre,
    ataques: weapon.ataques,
    distancia: type === 'disparo' ? weapon.distancia : null,
    impactos: type === 'disparo' ? weapon.impactos : null,
    danio: weapon.danio,
    danio_critico: weapon.danio_critico,
    habilidades_arma: [...(weapon.habilidades_arma || [])],
    especialidad: '-',
    valor_extra: weapon.valor_extra,
  };
}

function applyUnitParsed(esUnit, parsedUnit) {
  esUnit.clase = parsedUnit.clase;
  esUnit.perfil.movimiento = parsedUnit.perfil.movimiento;
  esUnit.perfil.vidas = parsedUnit.perfil.vidas;
  esUnit.perfil.salvacion = parsedUnit.perfil.salvacion;
  esUnit.perfil.velocidad = parsedUnit.perfil.velocidad;
  if (parsedUnit.perfil.escuadra && esUnit.perfil.escuadra) {
    esUnit.perfil.escuadra.min = parsedUnit.perfil.escuadra.min;
    esUnit.perfil.escuadra.max = parsedUnit.perfil.escuadra.max;
  }
  esUnit.perfil.especialidad = parsedUnit.perfil.especialidad || '-';
  esUnit.perfil.valor = parsedUnit.perfil.valor;

  esUnit.armas.disparo = parsedUnit.armas.disparo.map((weapon) => createWeapon(weapon, 'disparo'));
  esUnit.armas.cuerpo_a_cuerpo = parsedUnit.armas.cuerpo_a_cuerpo.map((weapon) =>
    createWeapon(weapon, 'cuerpo_a_cuerpo'),
  );
}

function syncEnMechanical(esObj, enObj) {
  for (let i = 0; i < Math.min(esObj.unidades.length, enObj.unidades.length); i += 1) {
    const esUnit = esObj.unidades[i];
    const enUnit = enObj.unidades[i];

    enUnit.perfil.movimiento = esUnit.perfil.movimiento;
    enUnit.perfil.vidas = esUnit.perfil.vidas;
    enUnit.perfil.salvacion = esUnit.perfil.salvacion;
    enUnit.perfil.velocidad = esUnit.perfil.velocidad;
    if (enUnit.perfil.escuadra && esUnit.perfil.escuadra) {
      enUnit.perfil.escuadra.min = esUnit.perfil.escuadra.min;
      enUnit.perfil.escuadra.max = esUnit.perfil.escuadra.max;
    }
    enUnit.perfil.valor = esUnit.perfil.valor;

    const syncWeapons = (esWeapons, enWeapons) =>
      esWeapons.map((esWeapon, idx) => {
        const prev = enWeapons[idx] || {};
        return {
          ...prev,
          nombre: prev.nombre || esWeapon.nombre,
          ataques: esWeapon.ataques,
          distancia: esWeapon.distancia,
          impactos: esWeapon.impactos,
          danio: esWeapon.danio,
          danio_critico: esWeapon.danio_critico,
          valor_extra: esWeapon.valor_extra,
          especialidad: prev.especialidad || esWeapon.especialidad || '-',
          habilidades_arma: [...(esWeapon.habilidades_arma || [])],
        };
      });

    enUnit.armas.disparo = syncWeapons(esUnit.armas.disparo || [], enUnit.armas.disparo || []);
    enUnit.armas.cuerpo_a_cuerpo = syncWeapons(esUnit.armas.cuerpo_a_cuerpo || [], enUnit.armas.cuerpo_a_cuerpo || []);
  }
}

function buildHtmlIndex() {
  const files = fs
    .readdirSync(HTML_DIR)
    .filter((file) => file.endsWith('.html'))
    .map((file) => path.join(HTML_DIR, file));

  const out = [];
  for (const filePath of files) {
    const html = fs.readFileSync(filePath, 'utf8');
    const title = cleanText((html.match(/<title>([^<]+)<\/title>/i) || [])[1] || path.basename(filePath));
    out.push({
      title,
      norm: normalize(title),
      filePath,
      fileName: path.basename(filePath),
    });
  }
  return out;
}

function findHtmlForBase(base, factionName, htmlIndex) {
  const exactTargets = [normalize(factionName), ...(TITLE_ALIASES[base] || []).map(normalize)];
  for (const target of exactTargets) {
    const found = htmlIndex.find((item) => item.norm === target);
    if (found) return found;
  }

  const fallback = htmlIndex.find(
    (item) => item.norm.includes(normalize(factionName)) || normalize(factionName).includes(item.norm),
  );
  return fallback || null;
}

function syncFaction(base, htmlIndex) {
  const esPath = path.join(ES_JSON_DIR, `${base}.json`);
  const enPath = path.join(EN_JSON_DIR, `${base}.en.json`);
  const esObj = JSON.parse(fs.readFileSync(esPath, 'utf8'));
  const enObj = JSON.parse(fs.readFileSync(enPath, 'utf8'));
  const htmlMeta = findHtmlForBase(base, esObj.faccion?.nombre || base, htmlIndex);
  const warnings = [];

  if (!htmlMeta) {
    warnings.push('No se encontró HTML para esta facción');
    return { base, html: null, warnings };
  }

  const parsed = parseFactionHtml(htmlMeta.filePath);
  if (parsed.style) {
    esObj.faccion.estilo_juego = parsed.style;
  }

  for (let i = 0; i < Math.min(parsed.skills.length, esObj.faccion.habilidades_faccion.length); i += 1) {
    esObj.faccion.habilidades_faccion[i].descripcion = parsed.skills[i];
  }

  const parsedByName = new Map();
  for (const unit of parsed.units) {
    parsedByName.set(normalize(unit.nombre_unidad), unit);
    parsedByName.set(normalizeKey(unit.nombre_unidad), unit);
  }
  const used = new Set();
  for (let i = 0; i < esObj.unidades.length; i += 1) {
    const esUnit = esObj.unidades[i];
    const exact = parsedByName.get(normalize(esUnit.nombre_unidad)) || parsedByName.get(normalizeKey(esUnit.nombre_unidad));
    let selected = exact || null;

    if (!selected) {
      selected = parsed.units[i] || null;
      if (selected) warnings.push(`Unidad por índice: ${esUnit.nombre_unidad} -> ${selected.nombre_unidad}`);
    }

    if (!selected) {
      warnings.push(`Unidad no encontrada: ${esUnit.nombre_unidad}`);
      continue;
    }

    applyUnitParsed(esUnit, selected);
    used.add(normalize(selected.nombre_unidad));
  }

  for (const parsedUnit of parsed.units) {
    if (!used.has(normalize(parsedUnit.nombre_unidad))) {
      warnings.push(`Unidad nueva no enlazada en JSON: ${parsedUnit.nombre_unidad}`);
    }
  }

  esObj._fuente = htmlMeta.fileName;
  enObj._fuente = htmlMeta.fileName;
  syncEnMechanical(esObj, enObj);

  if (!DRY_RUN) {
    fs.writeFileSync(esPath, `${JSON.stringify(esObj, null, 2)}\n`);
    fs.writeFileSync(enPath, `${JSON.stringify(enObj, null, 2)}\n`);
  }

  return { base, html: htmlMeta.fileName, warnings };
}

function main() {
  const htmlIndex = buildHtmlIndex();
  let totalWarnings = 0;
  for (const base of BASES) {
    const { html, warnings } = syncFaction(base, htmlIndex);
    totalWarnings += warnings.length;
    console.log(`${base}: html=${html || 'N/A'} warnings=${warnings.length}`);
    for (const warning of warnings.slice(0, 10)) {
      console.log(`  - ${warning}`);
    }
    if (warnings.length > 10) {
      console.log(`  ... (${warnings.length - 10} más)`);
    }
  }
  console.log(`TOTAL warnings=${totalWarnings}`);
  if (DRY_RUN) console.log('dry-run: no files written');
}

main();
