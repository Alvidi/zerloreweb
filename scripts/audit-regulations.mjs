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
  return fs
    .readdirSync(dataDir)
    .filter((f) => f.endsWith('.html'))
    .map((f) => path.join(dataDir, f));
}

function pickLatest(files, predicate) {
  const filtered = files.filter(predicate);
  if (!filtered.length) return null;
  return filtered
    .map((file) => ({ file, mtime: fs.statSync(file).mtimeMs }))
    .sort((a, b) => b.mtime - a.mtime)[0].file;
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

function extractNodes(html) {
  const nodes = [];
  const re = /<(h1|h2|h3|p|li)\b[^>]*\sid="([^"]+)"[^>]*>([\s\S]*?)<\/\1>/g;
  let match;
  while ((match = re.exec(html)) !== null) {
    const [, tag, id, inner] = match;
    nodes.push({ tag, id, text: stripTags(inner) });
  }
  return nodes;
}

function tocIds(html) {
  const nav = html.match(/<nav[^>]*class="[^"]*table_of_contents[^"]*"[\s\S]*?<\/nav>/);
  if (!nav) return [];
  const out = [];
  const re = /<a\b[^>]*href="#([^"]+)"[^>]*>/g;
  let match;
  while ((match = re.exec(nav[0])) !== null) {
    out.push(match[1]);
  }
  return out;
}

function run() {
  const args = parseArgs(process.argv.slice(2));
  const threshold = Number(args.threshold ?? 0.72);
  const files = listDataFiles();

  const esPath = args.es
    ? path.resolve(args.es)
    : pickLatest(files, (file) => /REGLAMENTO/i.test(path.basename(file)) && !/\.en\.html$/i.test(file));
  const enPath = args.en
    ? path.resolve(args.en)
    : pickLatest(files, (file) => /REGULATIONS/i.test(path.basename(file)) && /\.en\.html$/i.test(file));

  if (!esPath || !fs.existsSync(esPath)) throw new Error('No se encontró ES. Usa --es');
  if (!enPath || !fs.existsSync(enPath)) throw new Error('No se encontró EN. Usa --en');

  const esHtml = fs.readFileSync(esPath, 'utf8');
  const enHtml = fs.readFileSync(enPath, 'utf8');
  const esNodes = extractNodes(esHtml);
  const enNodes = extractNodes(enHtml);
  const esById = new Map(esNodes.map((n) => [n.id, n]));
  const enById = new Map(enNodes.map((n) => [n.id, n]));

  const missingInEn = [];
  const missingInEs = [];
  const emptyInEn = [];
  const shortCandidates = [];

  for (const [id, esNode] of esById) {
    const enNode = enById.get(id);
    if (!enNode) {
      missingInEn.push(id);
      continue;
    }
    if (esNode.text && !enNode.text) {
      emptyInEn.push(id);
      continue;
    }

    if (esNode.text.length >= 60) {
      const ratio = enNode.text.length / Math.max(1, esNode.text.length);
      if (ratio < threshold) {
        shortCandidates.push({ id, tag: esNode.tag, es: esNode.text.length, en: enNode.text.length, ratio: Number(ratio.toFixed(2)) });
      }
    }
  }

  for (const id of enById.keys()) {
    if (!esById.has(id)) missingInEs.push(id);
  }

  const esToc = tocIds(esHtml);
  const enToc = tocIds(enHtml);
  const esTocSet = new Set(esToc);
  const enTocSet = new Set(enToc);
  const tocMissingInEn = esToc.filter((id) => !enTocSet.has(id));
  const tocMissingInEs = enToc.filter((id) => !esTocSet.has(id));

  const esChars = esNodes.reduce((sum, n) => sum + n.text.length, 0);
  const enChars = enNodes.reduce((sum, n) => sum + n.text.length, 0);

  console.log('audit-regulations report');
  console.log(`es: ${esPath}`);
  console.log(`en: ${enPath}`);
  console.log('---');
  console.log(`nodes_es=${esNodes.length} nodes_en=${enNodes.length}`);
  console.log(`ids_es=${esById.size} ids_en=${enById.size}`);
  console.log(`missing_in_en=${missingInEn.length}`);
  console.log(`missing_in_es=${missingInEs.length}`);
  console.log(`empty_in_en_where_es_has_text=${emptyInEn.length}`);
  console.log(`toc_es=${esToc.length} toc_en=${enToc.length}`);
  console.log(`toc_ids_missing_in_en=${tocMissingInEn.length}`);
  console.log(`toc_ids_missing_in_es=${tocMissingInEs.length}`);
  console.log(`char_ratio_en_vs_es=${(enChars / Math.max(1, esChars)).toFixed(3)}`);
  console.log(`short_text_candidates_ratio_lt_${threshold}=${shortCandidates.length}`);

  if (shortCandidates.length) {
    console.log('short_candidates_sample:');
    for (const c of shortCandidates.slice(0, 12)) {
      console.log(`- ${c.id} [${c.tag}] es=${c.es} en=${c.en} ratio=${c.ratio}`);
    }
  }

  if (missingInEn.length || missingInEs.length || emptyInEn.length || tocMissingInEn.length || tocMissingInEs.length) {
    process.exitCode = 2;
  }
}

run();
