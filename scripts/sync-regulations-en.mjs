#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';

function parseArgs(argv) {
  const args = {};
  for (let i = 0; i < argv.length; i += 1) {
    const key = argv[i];
    if (!key.startsWith('--')) continue;
    const value = argv[i + 1] && !argv[i + 1].startsWith('--') ? argv[i + 1] : true;
    args[key.slice(2)] = value;
    if (value !== true) i += 1;
  }
  return args;
}

function listDataFiles() {
  const dataDir = path.resolve('src/data');
  if (!fs.existsSync(dataDir)) {
    throw new Error(`No existe ${dataDir}`);
  }
  const out = [];
  const stack = [dataDir];
  while (stack.length) {
    const current = stack.pop();
    for (const entry of fs.readdirSync(current, { withFileTypes: true })) {
      const fullPath = path.join(current, entry.name);
      if (entry.isDirectory()) {
        stack.push(fullPath);
      } else if (entry.isFile() && entry.name.endsWith('.html')) {
        out.push(fullPath);
      }
    }
  }
  return out;
}

function pickLatest(files, predicate) {
  const filtered = files.filter(predicate);
  if (!filtered.length) return null;
  return filtered
    .map((file) => ({ file, mtime: fs.statSync(file).mtimeMs }))
    .sort((a, b) => b.mtime - a.mtime)[0].file;
}

function getRulebookKind(filePath) {
  const name = path.basename(filePath).normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
  if (/(juego\s*rapido|quick[\s_-]*play|quick\s*game)/i.test(name)) return 'quick';
  if (/(avanzado|advanced)/i.test(name)) return 'advanced';
  return null;
}

function deriveOutputPath(esPath) {
  const englishDir = path.resolve('src/data/english');
  const kind = getRulebookKind(esPath);
  if (kind === 'quick') {
    return path.join(englishDir, 'ZEROLORE_QUICK_PLAY_RULEBOOK_EN.html');
  }
  if (kind === 'advanced') {
    return path.join(englishDir, 'ZEROLORE_ADVANCED_RULEBOOK_EN.html');
  }

  const dir = path.resolve(path.dirname(esPath));
  const base = path.basename(esPath, '.html');
  const translated = base
    .replace(/REGLAMENTO/g, 'REGULATIONS')
    .replace(/Reglamento/g, 'Regulations')
    .replace(/reglamento/g, 'regulations')
    .replace(/avanzado/g, 'advanced')
    .replace(/Avanzado/g, 'Advanced');
  return path.join(dir, `${translated}.en.html`);
}

function stripTags(html) {
  return html
    .replace(/<[^>]+>/g, '')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/\s+/g, ' ')
    .trim();
}

function escapeHtml(text) {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function collectIdBlocks(html) {
  const map = new Map();
  const re = /<(h1|h2|h3|p|li)\b([^>]*\sid="([^"]+)"[^>]*)>([\s\S]*?)<\/\1>/g;
  let match;
  while ((match = re.exec(html)) !== null) {
    const [, tag, attrs, id, inner] = match;
    map.set(id, { tag, attrs, inner });
  }
  return map;
}

function collectHeadingTextById(html) {
  const map = new Map();
  const re = /<(h1|h2|h3)\b[^>]*\sid="([^"]+)"[^>]*>([\s\S]*?)<\/\1>/g;
  let match;
  while ((match = re.exec(html)) !== null) {
    const [, , id, inner] = match;
    map.set(id, stripTags(inner));
  }
  return map;
}

function replaceTitleAndPageTitle(outHtml, templateHtml) {
  let html = outHtml;
  const templateTitle = templateHtml.match(/<title>([\s\S]*?)<\/title>/i);
  if (templateTitle) {
    html = html.replace(/<title>[\s\S]*?<\/title>/i, `<title>${templateTitle[1]}</title>`);
  }

  const templatePageTitle = templateHtml.match(/(<h1\b[^>]*class="[^"]*page-title[^"]*"[^>]*>)([\s\S]*?)(<\/h1>)/i);
  if (templatePageTitle) {
    html = html.replace(
      /(<h1\b[^>]*class="[^"]*page-title[^"]*"[^>]*>)([\s\S]*?)(<\/h1>)/i,
      `$1${templatePageTitle[2]}$3`,
    );
  }

  return html;
}

function syncTocLabels(html) {
  const headingById = collectHeadingTextById(html);
  return html.replace(
    /(<a\b[^>]*href="#([^"]+)"[^>]*>)([\s\S]*?)(<\/a>)/g,
    (full, open, id, inner, close) => {
      const heading = headingById.get(id);
      if (!heading) return full;
      return `${open}${escapeHtml(heading)}${close}`;
    },
  );
}

function run() {
  const args = parseArgs(process.argv.slice(2));
  const files = listDataFiles();
  const isSpanishRulebook = (file) => /REGLAMENTO/i.test(path.basename(file));
  const isEnglishRulebook = (file) => /(RULEBOOK|REGULATIONS).*(EN)?/i.test(path.basename(file));
  const requestedMode = args.mode === 'quick' || args.mode === 'advanced' ? args.mode : null;

  const esPath = args.es
    ? path.resolve(args.es)
    : pickLatest(
        files,
        (file) => isSpanishRulebook(file) && (!requestedMode || getRulebookKind(file) === requestedMode),
      );
  if (!esPath || !fs.existsSync(esPath)) {
    throw new Error('No se encontró archivo ES. Usa --es "src/data/archivo.html"');
  }
  const rulebookKind = requestedMode || getRulebookKind(esPath);

  const outPath = args.out ? path.resolve(args.out) : deriveOutputPath(esPath);

  let templatePath = args.template
    ? path.resolve(args.template)
    : pickLatest(
        files.filter((f) => path.resolve(f) !== path.resolve(outPath)),
        (file) => isEnglishRulebook(file) && (!rulebookKind || getRulebookKind(file) === rulebookKind),
      );

  if (!templatePath && fs.existsSync(outPath)) {
    templatePath = outPath;
  }

  if (!templatePath || !fs.existsSync(templatePath)) {
    throw new Error('No se encontró EN previo para usar como plantilla. Usa --template "src/data/english/archivo.html"');
  }

  const esHtml = fs.readFileSync(esPath, 'utf8');
  const templateHtml = fs.readFileSync(templatePath, 'utf8');
  const templateById = collectIdBlocks(templateHtml);

  let translatedCount = 0;
  let missingCount = 0;
  const missingIds = [];

  let outHtml = esHtml.replace(
    /<(h1|h2|h3|p|li)\b([^>]*\sid="([^"]+)"[^>]*)>([\s\S]*?)<\/\1>/g,
    (full, tag, attrs, id, inner) => {
      const sourceText = stripTags(inner);
      if (!sourceText) return full;

      const t = templateById.get(id);
      if (!t || !stripTags(t.inner)) {
        missingCount += 1;
        missingIds.push(id);
        return full;
      }

      translatedCount += 1;
      return `<${tag}${attrs}>${t.inner}</${tag}>`;
    },
  );

  outHtml = replaceTitleAndPageTitle(outHtml, templateHtml);
  outHtml = syncTocLabels(outHtml);

  fs.writeFileSync(outPath, outHtml, 'utf8');

  console.log('sync-regulations-en completed');
  console.log(`es:       ${esPath}`);
  console.log(`template: ${templatePath}`);
  console.log(`out:      ${outPath}`);
  console.log(`translated_blocks_by_id: ${translatedCount}`);
  console.log(`missing_blocks_for_review: ${missingCount}`);
  if (missingIds.length) {
    console.log('missing_ids_sample:', missingIds.slice(0, 20).join(', '));
    console.log('note: estos bloques quedaron en español y requieren traducción manual.');
  }
}

run();
