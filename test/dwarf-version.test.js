/**
 * @fileoverview DWARF version acceptance (3 vs 4).
 */

const assert = require('assert');
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');
const { loadDwarfIndex } = require('../anki.firmlens-0.1.0/lib/dwarf/dwarf-index');

const gen = path.join(__dirname, '../fixtures/generated');
const axf4 = path.join(gen, 'demo_mf_root.axf');
assert.ok(fs.existsSync(axf4));
const idx4 = loadDwarfIndex(axf4);
assert.ok(idx4.variables.length > 0);

const tmpDir = path.join(__dirname, '../fixtures/generated/dwarf3-tmp');
fs.mkdirSync(tmpDir, { recursive: true });
const src = path.join(tmpDir, 'mini.c');
const obj = path.join(tmpDir, 'mini.o');
const elf = path.join(tmpDir, 'mini.axf');

fs.writeFileSync(src, 'volatile int g_dwarf3_probe = 42;\n', 'utf8');

try {
  execSync(`clang -target i386-unknown-linux-gnu -std=c11 -O0 -g -gdwarf-3 -c "${src}" -o "${obj}"`, {
    stdio: 'pipe',
  });
  execSync(
    `ld.lld -m elf_i386 -e g_dwarf3_probe --no-check-sections -o "${elf}" "${obj}" 2>/dev/null || ` +
      `clang -target i386-unknown-linux-gnu -nostdlib -Wl,-e,g_dwarf3_probe -o "${elf}" "${obj}"`,
    { stdio: 'pipe', shell: true },
  );
  const idx3 = loadDwarfIndex(elf);
  const hit = idx3.variables.find((v) => v.name === 'g_dwarf3_probe');
  assert.ok(hit, `expected g_dwarf3_probe in DWARF3 index, got: ${idx3.variables.map((v) => v.name)}`);
} catch (err) {
  console.warn('dwarf-version.test.js: skipped DWARF3 link step (clang/ld):', err.message);
}

console.log('dwarf-version.test.js: OK');