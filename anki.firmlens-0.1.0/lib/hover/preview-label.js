/**
 * @fileoverview Short inlay-hint labels for snapshot previews.
 */

/**
 * @param {string} snapshotValue
 * @param {number} [maxLen]
 */
function previewInlayLabel(snapshotValue, maxLen = 44) {
  const s = String(snapshotValue ?? '').replace(/\s+/g, ' ').trim();
  if (!s) return 'snap: —';
  if (s.length <= maxLen) return `snap: ${s}`;
  return `snap: ${s.slice(0, Math.max(0, maxLen - 1))}…`;
}

module.exports = {
  previewInlayLabel,
};