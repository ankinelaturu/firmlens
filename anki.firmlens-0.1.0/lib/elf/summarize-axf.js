/**
 * @fileoverview Read-only summary of an AXF/ELF for the FirmLens inspector.
 */

const { readFileHead } = require('../format/read-head');
const { sniffElf } = require('../format/sniff');
const { loadElfSections } = require('./sections');
const { scanDwarfCompileUnitVersions, summarizeDwarfVersions } = require('./scan-dwarf-versions');
const { loadDwarfIndex } = require('../dwarf/dwarf-index');
const { siblingBundleForAxf } = require('./sibling-bundle');
const { sha256File, loadMetadataFile, metadataWarnings } = require('../format/metadata');
const { loadGnuMapSymbols, mapCorroborationWarnings } = require('../format/map-symbols');
const { basename } = require('../dwarf/dwarf-index');

const ET_EXEC = 2;
const ET_DYN = 3;
const ET_REL = 1;
const EM_ARM = 40;

/**
 * @param {number} eType
 */
function elfTypeLabel(eType) {
  if (eType === ET_EXEC) return 'executable';
  if (eType === ET_DYN) return 'shared object';
  if (eType === ET_REL) return 'relocatable';
  return `type ${eType}`;
}

/**
 * @param {number} eMachine
 */
function machineLabel(eMachine) {
  if (eMachine === EM_ARM) return 'ARM';
  if (eMachine === 3) return 'x86';
  return `0x${eMachine.toString(16)}`;
}

/**
 * @typedef {object} AxfSectionRow
 * @property {string} name
 * @property {number} size
 * @property {boolean} debug
 */

/**
 * @typedef {object} AxfGlobalRow
 * @property {string} name
 * @property {string} address
 * @property {string} typeName
 * @property {string} decl
 */

/**
 * @typedef {object} AxfSummary
 * @property {string} fileName
 * @property {string} filePath
 * @property {string} sha256
 * @property {import('../format/sniff').ElfSniff} elf
 * @property {string} elfHeadline
 * @property {string[]} warnings
 * @property {AxfSectionRow[]} sections
 * @property {boolean} hasDebugInfo
 * @property {string} dwarfVersionLabel
 * @property {Record<string, number>} dwarfVersionCounts
 * @property {number} compileUnitCount
 * @property {number | null} globalCount
 * @property {string | null} dwarfError
 * @property {AxfGlobalRow[]} globals
 * @property {import('./sibling-bundle').AxfSiblingBundle} siblings
 * @property {string[]} bundleNotes
 * @property {string[]} mapWarnings
 */

/**
 * @param {string} axfPath
 * @param {{ maxGlobals?: number }} [opts]
 * @returns {AxfSummary}
 */
function summarizeAxf(axfPath, opts = {}) {
  const maxGlobals = opts.maxGlobals ?? 400;
  const fileName = basename(axfPath) || axfPath;
  const head = readFileHead(axfPath, 64);
  const elfSniff = sniffElf(head.buffer);
  if (!elfSniff) {
    throw new Error('Not an ELF debug image.');
  }

  const elfImg = loadElfSections(axfPath);
  const sha256 = sha256File(axfPath);
  /** @type {string[]} */
  const warnings = [...elfSniff.warnings];

  /** @type {AxfSectionRow[]} */
  const sections = [];
  for (const [name, buf] of elfImg.sections.entries()) {
    sections.push({
      name,
      size: buf.length,
      debug: name.startsWith('.debug') || name === '.ARM.attributes',
    });
  }
  sections.sort((a, b) => a.name.localeCompare(b.name));

  const info = elfImg.sections.get('.debug_info');
  const hasDebugInfo = Boolean(info?.length);
  let dwarfVersionLabel = 'no .debug_info';
  let dwarfVersionCounts = {};
  let compileUnitCount = 0;
  if (info?.length) {
    const versions = scanDwarfCompileUnitVersions(info);
    const summary = summarizeDwarfVersions(versions);
    dwarfVersionLabel = summary.label;
    dwarfVersionCounts = summary.versionCounts;
    compileUnitCount = summary.compileUnitCount;
    if (versions.some((v) => v < 2 || v > 5)) {
      warnings.push('Some compile units use DWARF versions FirmLens may not fully parse.');
    }
  } else {
    warnings.push('ELF has no .debug_info — FirmLens cannot index globals.');
  }

  /** @type {number | null} */
  let globalCount = null;
  /** @type {string | null} */
  let dwarfError = null;
  /** @type {AxfGlobalRow[]} */
  const globals = [];
  /** @type {import('../dwarf/dwarf-index').DwarfIndex | null} */
  let dwarfIndex = null;
  if (hasDebugInfo) {
    try {
      dwarfIndex = loadDwarfIndex(axfPath);
      globalCount = dwarfIndex.variables.length;
      const slice = dwarfIndex.variables
        .slice()
        .sort((a, b) => a.address - b.address || a.name.localeCompare(b.name))
        .slice(0, maxGlobals);
      for (const v of slice) {
        const typeName = v.type?.typeName || v.type?.kind || '?';
        const declFile = basename(String(v.declFile || ''));
        const decl = v.declLine ? `${declFile}:${v.declLine}` : declFile || '—';
        globals.push({
          name: v.name,
          address: `0x${v.address.toString(16)}`,
          typeName,
          decl,
        });
      }
      if (dwarfIndex.variables.length > maxGlobals) {
        warnings.push(`Globals table shows first ${maxGlobals} of ${dwarfIndex.variables.length} symbols.`);
      }
    } catch (err) {
      dwarfError = err instanceof Error ? err.message : String(err);
      warnings.push(`DWARF index failed: ${dwarfError}`);
    }
  }

  const siblings = siblingBundleForAxf(axfPath);
  /** @type {string[]} */
  const bundleNotes = [];
  if (!siblings.hexPath) {
    bundleNotes.push('No Intel HEX sibling in this folder — load snapshot will ask for HEX or use Load Snapshot.');
  }
  if (siblings.metadataPath) {
    try {
      const meta = loadMetadataFile(siblings.metadataPath);
      bundleNotes.push(...metadataWarnings(meta, sha256).map((w) => `Metadata: ${w}`));
    } catch (err) {
      bundleNotes.push(`Metadata: ${err instanceof Error ? err.message : String(err)}`);
    }
  }

  /** @type {string[]} */
  const mapWarnings = [];
  if (siblings.mapPath && dwarfIndex) {
    try {
      const mapSyms = loadGnuMapSymbols(siblings.mapPath);
      mapWarnings.push(...mapCorroborationWarnings(dwarfIndex, mapSyms));
    } catch {
      bundleNotes.push('MAP present but could not run GNU map corroboration.');
    }
  }

  const elfHeadline = `${elfSniff.wordSize}-bit ${elfSniff.endian === 'le' ? 'little-endian' : 'big-endian'} ${machineLabel(elfSniff.eMachine)} ${elfTypeLabel(elfSniff.eType)}`;

  return {
    fileName,
    filePath: axfPath,
    sha256,
    elf: elfSniff,
    elfHeadline,
    warnings,
    sections,
    hasDebugInfo,
    dwarfVersionLabel,
    dwarfVersionCounts,
    compileUnitCount,
    globalCount,
    dwarfError,
    globals,
    siblings,
    bundleNotes,
    mapWarnings,
  };
}

module.exports = {
  summarizeAxf,
  elfTypeLabel,
  machineLabel,
};