/**
 * @fileoverview Snapshot session lifecycle (HEX + AXF paths, generation id).
 */

const vscode = require('vscode');
const path = require('path');
const { loadHexFile } = require('../lib/hex/hex-memory');
const { validateSnapshotLoad } = require('../lib/format/validate-load');
const { loadDwarfIndex } = require('../lib/dwarf/dwarf-index');
const { loadMetadataFile, sha256File, metadataWarnings } = require('../lib/format/metadata');
const { loadGnuMapSymbols, mapCorroborationWarnings } = require('../lib/format/map-symbols');

/**
 * @typedef {object} SnapshotSession
 * @property {number} loadGeneration Incremented on each successful load.
 * @property {string} snapshotLabel Display name (HEX basename).
 * @property {string} hexPath Absolute path to HEX file.
 * @property {string} axfPath Absolute path to debug image (ELF / .axf / .out).
 * @property {string[]} loadWarnings Non-fatal format notes from sniffing.
 * @property {import('../lib/hex/hex-memory').HexMemory} memory Parsed sparse snapshot.
 * @property {import('../lib/dwarf/dwarf-index').DwarfIndex} dwarf DWARF index from debug image.
 * @property {string | null} mapPath Optional MAP path if user selected one.
 * @property {import('../lib/format/metadata').SnapshotMetadata | null} metadata Optional sidecar JSON.
 * @property {string | null} axfSha256 SHA-256 of loaded AXF.
 * @property {string[]} sessionWarnings Corroboration / metadata warnings shown in hovers.
 */

/**
 * @typedef {object} SessionSummary
 * @property {boolean} active
 * @property {string} label
 */

/**
 * @param {vscode.ExtensionContext} context
 */
function createSessionManager(context) {
  /** @type {SnapshotSession | null} */
  let current = null;
  /** @type {number} */
  let loadGeneration = 0;
  /** @type {vscode.EventEmitter<void>} */
  const onChangeEmitter = new vscode.EventEmitter();

  return {
    onDidChange: onChangeEmitter.event,
    getGeneration: () => loadGeneration,
    /** @returns {SnapshotSession | null} */
    getSession: () => current,
    /** @returns {SessionSummary} */
    getSummary: () => ({
      active: current !== null,
      label: current ? current.snapshotLabel : 'no session',
    }),
    /** @returns {Promise<boolean>} */
    async loadSnapshot() {
      const hexUris = await vscode.window.showOpenDialog({
        canSelectMany: false,
        openLabel: 'Select Intel HEX snapshot',
        filters: { 'Intel HEX': ['hex'], 'All': ['*'] },
      });
      if (!hexUris?.length) {
        return false;
      }

      const axfUris = await vscode.window.showOpenDialog({
        canSelectMany: false,
        openLabel: 'Select debug image (ELF)',
        filters: { 'ELF / AXF': ['axf', 'elf', 'out'], 'All': ['*'] },
      });
      if (!axfUris?.length) {
        return false;
      }

      const mapUris = await vscode.window.showOpenDialog({
        canSelectMany: false,
        openLabel: 'Optional MAP file (skip to continue)',
        filters: { 'Linker map': ['map'], 'All': ['*'] },
      });

      const metaUris = await vscode.window.showOpenDialog({
        canSelectMany: false,
        openLabel: 'Optional metadata JSON (skip to continue)',
        filters: { JSON: ['json'], All: ['*'] },
      });

      const hexPath = hexUris[0].fsPath;
      const axfPath = axfUris[0].fsPath;
      const mapPath = mapUris?.[0]?.fsPath ?? null;
      const metaPath = metaUris?.[0]?.fsPath ?? null;

      try {
        const validated = validateSnapshotLoad(hexPath, axfPath, mapPath);
        const memory = loadHexFile(hexPath);
        const dwarf = loadDwarfIndex(axfPath);
        const axfSha256 = sha256File(axfPath);
        /** @type {import('../lib/format/metadata').SnapshotMetadata | null} */
        const metadata = metaPath ? loadMetadataFile(metaPath) : null;
        /** @type {string[]} */
        const sessionWarnings = [...validated.warnings, ...metadataWarnings(metadata, axfSha256)];
        if (mapPath && validated.map?.kind === 'map-gnu') {
          const mapSyms = loadGnuMapSymbols(mapPath);
          sessionWarnings.push(...mapCorroborationWarnings(dwarf, mapSyms));
        }
        loadGeneration += 1;
        /** @type {SnapshotSession} */
        const next = {
          loadGeneration,
          snapshotLabel: path.basename(hexPath),
          hexPath,
          axfPath,
          memory,
          dwarf,
          mapPath,
          metadata,
          axfSha256,
          sessionWarnings,
          loadWarnings: validated.warnings,
        };
        current = next;
        onChangeEmitter.fire();
        let message = `FirmLens: loaded ${next.snapshotLabel} (${dwarf.variables.length} DWARF globals).`;
        if (validated.warnings.length > 0) {
          message += ` Note: ${validated.warnings[0]}`;
          if (validated.warnings.length > 1) {
            console.warn('[FirmLens] load warnings:', validated.warnings);
          }
        }
        vscode.window.showInformationMessage(message);
        return true;
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        vscode.window.showErrorMessage(`FirmLens: load failed — ${message}`);
        return false;
      }
    },
    clearSnapshot() {
      if (!current) {
        vscode.window.showInformationMessage('FirmLens: no active session.');
        return;
      }
      current = null;
      onChangeEmitter.fire();
      vscode.window.showInformationMessage('FirmLens: session cleared.');
    },
  };
}

module.exports = {
  createSessionManager,
};