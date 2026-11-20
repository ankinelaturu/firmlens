/**
 * @fileoverview Intel HEX line classification (comments, records).
 */

/**
 * @param {string} trimmed
 */
function isIntelHexCommentLine(trimmed) {
  if (!trimmed) {
    return false;
  }
  return trimmed.startsWith(';') || trimmed.startsWith('#');
}

/**
 * First `:…` record line, skipping blanks and `;` / `#` comments.
 *
 * @param {string} text
 * @returns {string | null}
 */
function firstIntelHexRecordLine(text) {
  for (const raw of text.split(/\r?\n/)) {
    const line = raw.trim();
    if (!line || isIntelHexCommentLine(line)) {
      continue;
    }
    if (line.startsWith(':')) {
      return line;
    }
    return null;
  }
  return null;
}

/**
 * @param {string} trimmed
 */
function isIntelHexRecordLine(trimmed) {
  return Boolean(trimmed && trimmed.startsWith(':'));
}

module.exports = {
  isIntelHexCommentLine,
  isIntelHexRecordLine,
  firstIntelHexRecordLine,
};