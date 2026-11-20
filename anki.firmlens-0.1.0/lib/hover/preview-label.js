/**
 * @fileoverview Inlay hint label for snapshot inspect affordance.
 */

/** Hex / memory grid (U+25A6). */
const MEMORY_INSPECT_GLYPH = '▦';

/**
 * Shown after resolvable globals — click opens the FirmLens hover.
 */
function inlayInspectLabel() {
  return `:${MEMORY_INSPECT_GLYPH}inspect`;
}

module.exports = {
  inlayInspectLabel,
  MEMORY_INSPECT_GLYPH,
};