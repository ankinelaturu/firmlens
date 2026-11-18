/**
 * @fileoverview Snapshot session lifecycle (HEX + AXF paths, generation id).
 */

const vscode = require('vscode');
const path = require('path');
const { loadHexFile } = require('../lib/hex/hex-memory');
const { validateSnapshotLoad } = require('../lib/format/validate-load');
const { loadDwarfIndex } = require('../lib/dwarf/dwarf-index');

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

      const hexPath = hexUris[0].fsPath;
      const axfPath = axfUris[0].fsPath;
      const mapPath = mapUris?.[0]?.fsPath ?? null;

      try {
        const validated = validateSnapshotLoad(hexPath, axfPath, mapPath);
        const memory = loadHexFile(hexPath);
        const dwarf = loadDwarfIndex(axfPath);
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