/**
 * @fileoverview HEX / MAP / metadata siblings next to an AXF path (inspect-only hints).
 */

const path = require('path');
const { firstExistingFile, firstBySuffix } = require('../session/deploy-bundle');

/**
 * @typedef {object} AxfSiblingBundle
 * @property {string} axfPath
 * @property {string | null} hexPath
 * @property {string | null} mapPath
 * @property {string | null} metadataPath
 */

/**
 * @param {string} axfPath
 * @returns {AxfSiblingBundle}
 */
function siblingBundleForAxf(axfPath) {
  const dir = path.dirname(axfPath);
  const hexPath =
    firstExistingFile(dir, ['snapshot.hex', 'project_snapshot.hex']) ||
    firstBySuffix(dir, ['.hex']);
  const mapPath =
    firstExistingFile(dir, ['firmware.map', 'project.map']) || firstBySuffix(dir, ['.map']);
  const metadataPath = firstExistingFile(dir, ['metadata.json', 'metadata.example.json']);
  return {
    axfPath,
    hexPath,
    mapPath,
    metadataPath,
  };
}

module.exports = {
  siblingBundleForAxf,
};