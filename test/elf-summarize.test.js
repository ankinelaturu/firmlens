/**
 * @fileoverview AXF summarize (inspector data).
 */

const assert = require('assert');
const path = require('path');
const { summarizeAxf } = require('../anki.firmlens-0.1.0/lib/elf/summarize-axf');
const { scanDwarfCompileUnitVersions, summarizeDwarfVersions } = require('../anki.firmlens-0.1.0/lib/elf/scan-dwarf-versions');
const { loadElfSections } = require('../anki.firmlens-0.1.0/lib/elf/sections');

const axf = path.join(__dirname, '../fixtures/generated/demo_mf_root.axf');

const s = summarizeAxf(axf);
assert.ok(s.elfHeadline.includes('ARM') || s.elfHeadline.includes('x86'));
assert.ok(s.hasDebugInfo);
assert.ok(s.compileUnitCount > 0);
assert.ok(s.globalCount != null && s.globalCount > 0);
assert.ok(s.globals.some((g) => g.name === 'mf_root'));

const elf = loadElfSections(axf);
const info = elf.sections.get('.debug_info');
assert.ok(info);
const vers = scanDwarfCompileUnitVersions(info);
assert.ok(vers.includes(4));
assert.ok(summarizeDwarfVersions(vers).label.includes('DWARF 4'));

console.log('elf-summarize.test.js: OK');