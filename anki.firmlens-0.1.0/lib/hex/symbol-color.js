/**
 * @fileoverview Stable symbol colors for hex viewer byte highlights.
 */

/**
 * @param {string} name
 */
function symbolHue(name) {
  let h = 0;
  for (let i = 0; i < name.length; i += 1) {
    h = (h * 33 + name.charCodeAt(i)) % 360;
  }
  return h;
}

/**
 * @param {string} name
 * @returns {string}
 */
function symbolByteStyle(name) {
  const h = symbolHue(name);
  return `background: hsla(${h}, 50%, 40%, 0.35); box-shadow: inset 0 0 0 1px hsla(${h}, 60%, 55%, 0.45);`;
}

/**
 * @param {string} name
 * @returns {string}
 */
function symbolGutterStyle(name) {
  const h = symbolHue(name);
  return `border-left: 3px solid hsl(${h}, 55%, 55%);`;
}

module.exports = {
  symbolByteStyle,
  symbolGutterStyle,
  symbolHue,
};