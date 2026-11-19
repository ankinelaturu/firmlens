const test = require('node:test');
const assert = require('node:assert/strict');
const { buildSymbolHueMap, hueDistance } = require('../anki.firmlens-0.1.0/lib/hex/symbol-color');

test('adjacent symbol runs get hues at least 48° apart', () => {
  /** @type {import('../anki.firmlens-0.1.0/lib/hex/symbol-intervals').SymbolInterval[]} */
  const intervals = [
    { name: 'alpha', start: 0x100, end: 0x104, typeLabel: 'u32', declLine: 1, declFile: 'a.c' },
    { name: 'beta', start: 0x104, end: 0x108, typeLabel: 'u32', declLine: 2, declFile: 'a.c' },
    { name: 'gamma', start: 0x108, end: 0x10c, typeLabel: 'u32', declLine: 3, declFile: 'a.c' },
  ];
  const hues = buildSymbolHueMap(intervals);
  const dAB = hueDistance(hues.get('alpha'), hues.get('beta'));
  const dBC = hueDistance(hues.get('beta'), hues.get('gamma'));
  assert.ok(dAB >= 48, `alpha/beta hues too close: ${dAB}°`);
  assert.ok(dBC >= 48, `beta/gamma hues too close: ${dBC}°`);
});

test('similar hash names still separate when touching', () => {
  /** @type {import('../anki.firmlens-0.1.0/lib/hex/symbol-intervals').SymbolInterval[]} */
  const intervals = [
    { name: 'g_counter', start: 0x200, end: 0x204, typeLabel: 'u32', declLine: 1, declFile: 'b.c' },
    { name: 'g_counter_copy', start: 0x204, end: 0x208, typeLabel: 'u32', declLine: 2, declFile: 'b.c' },
  ];
  const hues = buildSymbolHueMap(intervals);
  const d = hueDistance(hues.get('g_counter'), hues.get('g_counter_copy'));
  assert.ok(d >= 48, `touching globals too close: ${d}°`);
});