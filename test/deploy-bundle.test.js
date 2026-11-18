/**
 * @fileoverview deploy/ bundle path resolution.
 */

const path = require('path');
const fs = require('fs');
const assert = require('assert');
const { resolveDeployBundleAt } = require('../anki.firmlens-0.1.0/lib/session/deploy-bundle');

const root = path.join(__dirname, '..');
const gen = path.join(root, 'fixtures/generated');

const hit = resolveDeployBundleAt(root, ['deploy', 'build']);
if (fs.existsSync(path.join(root, 'deploy/snapshot.hex'))) {
  assert.ok(hit, 'expected deploy/ bundle');
  assert.ok(hit.hexPath.endsWith('snapshot.hex'));
  assert.ok(hit.axfPath.endsWith('firmware.axf'));
} else {
  const scratch = path.join(root, 'deploy');
  fs.mkdirSync(scratch, { recursive: true });
  fs.copyFileSync(path.join(gen, 'project_snapshot.hex'), path.join(scratch, 'snapshot.hex'));
  fs.copyFileSync(path.join(gen, 'project.axf'), path.join(scratch, 'firmware.axf'));
  const hit2 = resolveDeployBundleAt(root, ['deploy']);
  assert.ok(hit2?.hexPath.includes('deploy'));
}

console.log('deploy-bundle.test.js: OK');