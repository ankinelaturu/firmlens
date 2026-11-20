/**
 * @fileoverview Inlay hint label for snapshot inspect affordance.
 */

/** Byte lanes / memory strip (U+25A4). */
const MEMORY_INSPECT_GLYPH = '▤';

/**
 * Shown after resolvable globals — click opens the FirmLens hover.
 */
function inlayInspectLabel() {
  return `${MEMORY_INSPECT_GLYPH}inspect`;
}

module.exports = {
  inlayInspectLabel,
  MEMORY_INSPECT_GLYPH,
};