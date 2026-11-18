/**
 * @fileoverview Resolve HEX + AXF + memory for the hex viewer (session or sibling bundle).
 */

const fs = require('fs');
const path = require('path');
const { loadHexFile } = require('./hex-memory');
const { loadDwarfIndex } = require('../dwarf/dwarf-index');

/**
 * @typedef {object} HexFirmwareContext
 * @property {import('./hex-memory').HexMemory} memory
 * @property {import('../dwarf/dwarf-index').DwarfIndex | null} dwarf
 * @property {string | null} axfPath
 * @property {boolean} fromSession
 */

/**
 * @param {string} hexPath
 * @param {{ getSession: () => { hexPath?: string; axfPath?: string; memory?: import('./hex-memory').HexMemory; dwarf?: import('../dwarf/dwarf-index').DwarfIndex } | null }} session
 * @returns {HexFirmwareContext}
 */
function resolveHexFirmware(hexPath, session) {
  const resolvedHex = path.resolve(hexPath);
  const cur = session.getSession();
  if (
    cur?.hexPath &&
    path.resolve(cur.hexPath) === resolvedHex &&
    cur.memory &&
    cur.dwarf &&
    cur.axfPath
  ) {
    return {
      memory: cur.memory,
      dwarf: cur.dwarf,
      axfPath: cur.axfPath,
      fromSession: true,
    };
  }

  const memory = loadHexFile(hexPath);
  const dir = path.dirname(hexPath);
  for (const name of ['firmware.axf', 'project.axf']) {
    const axfPath = path.join(dir, name);
    if (fs.existsSync(axfPath)) {
      return {
        memory,
        dwarf: loadDwarfIndex(axfPath),
        axfPath,
        fromSession: false,
      };
    }
  }

  const parent = path.dirname(dir);
  for (const name of ['firmware.axf', 'project.axf']) {
    const axfPath = path.join(parent, name);
    if (fs.existsSync(axfPath)) {
      return {
        memory,
        dwarf: loadDwarfIndex(axfPath),
        axfPath,
        fromSession: false,
      };
    }
  }

  return {
    memory,
    dwarf: null,
    axfPath: null,
    fromSession: false,
  };
}

module.exports = {
  resolveHexFirmware,
};