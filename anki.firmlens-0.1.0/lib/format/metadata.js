/**
 * @fileoverview Optional snapshot metadata sidecar (build id, AXF hash, capture ranges).
 */

const fs = require('fs');
const crypto = require('crypto');

/**
 * @typedef {object} CaptureRange
 * @property {number} start
 * @property {number} end Inclusive end address.
 */

/**
 * @typedef {object} SnapshotMetadata
 * @property {string} [buildId]
 * @property {string} [axfSha256] Lowercase hex SHA-256 of paired AXF file.
 * @property {CaptureRange[]} [captureRanges]
 */

/**
 * @param {string} path
 * @returns {SnapshotMetadata}
 */
function loadMetadataFile(path) {
  const raw = fs.readFileSync(path, 'utf8');
  /** @type {unknown} */
  let data;
  try {
    data = JSON.parse(raw);
  } catch {
    throw new Error('Metadata: invalid JSON.');
  }
  if (!data || typeof data !== 'object') {
    throw new Error('Metadata: expected JSON object.');
  }
  /** @type {SnapshotMetadata} */
  const meta = {};
  const obj = /** @type {Record<string, unknown>} */ (data);
  if (typeof obj.buildId === 'string') meta.buildId = obj.buildId;
  if (typeof obj.axfSha256 === 'string') {
    meta.axfSha256 = obj.axfSha256.toLowerCase();
  }
  if (Array.isArray(obj.captureRanges)) {
    meta.captureRanges = obj.captureRanges
      .map((r) => {
        if (!r || typeof r !== 'object') return null;
        const rr = /** @type {Record<string, unknown>} */ (r);
        const start = Number(rr.start);
        const end = Number(rr.end);
        if (!Number.isFinite(start) || !Number.isFinite(end)) return null;
        return { start, end };
      })
      .filter(Boolean);
  }
  return meta;
}

/**
 * @param {string} axfPath
 */
function sha256File(axfPath) {
  const h = crypto.createHash('sha256');
  h.update(fs.readFileSync(axfPath));
  return h.digest('hex');
}

/**
 * @param {CaptureRange[] | undefined} ranges
 * @param {number} addr
 * @param {number} len
 */
function rangeCoversBytes(ranges, addr, len) {
  if (!ranges?.length) return false;
  for (let i = 0; i < len; i += 1) {
    const a = addr + i;
    let covered = false;
    for (const r of ranges) {
      if (a >= r.start && a <= r.end) covered = true;
    }
    if (!covered) return false;
  }
  return true;
}

/**
 * @param {SnapshotMetadata | null} meta
 * @param {string | null} actualAxfHash
 */
function metadataWarnings(meta, actualAxfHash) {
  /** @type {string[]} */
  const w = [];
  if (!meta) return w;
  if (meta.axfSha256 && actualAxfHash && meta.axfSha256 !== actualAxfHash.toLowerCase()) {
    w.push('Metadata AXF SHA-256 does not match loaded debug image.');
  }
  return w;
}

/**
 * @param {SnapshotMetadata | null} meta
 * @param {boolean} bytesFromCapture
 * @param {string[]} sessionWarnings
 */
function provenanceLines(meta, bytesFromCapture, sessionWarnings) {
  /** @type {string[]} */
  const lines = [];
  if (meta?.buildId) {
    lines.push(`Build: ${meta.buildId}`);
  }
  if (bytesFromCapture) {
    lines.push('Provenance: bytes covered by capture metadata.');
  } else {
    lines.push('Provenance: user-selected pairing.');
  }
  for (const w of sessionWarnings) {
    lines.push(`⚠ ${w}`);
  }
  return lines;
}

module.exports = {
  loadMetadataFile,
  sha256File,
  rangeCoversBytes,
  metadataWarnings,
  provenanceLines,
};