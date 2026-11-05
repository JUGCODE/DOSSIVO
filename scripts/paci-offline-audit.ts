/**
 * Known-defect reproduction for the supplied paci-core 0.1 offline verifier.
 * Exit 0 means the UNSAFE baseline was reproduced, not that security passed.
 * Run manually; do not include this script in the normal application test gate.
 * Every tampered proof is checked with the genuine operator key pinned beforehand.
 */
import assert from 'node:assert/strict';
import { existsSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const args = process.argv.slice(2);
if (args.includes('--help') || args.includes('-h')) {
  console.log(`Usage: node --experimental-strip-types scripts/paci-offline-audit.ts [core-directory]
Core directory: positional argument, then PACI_CORE_PATH, then ../alignment_review/paci-core beside this repository.
All probes pin the genuine operator key; they do not trust a replacement key from the proof package.
Exit 0 reproduces known UNSAFE behavior. Exit 1 means the baseline changed or a probe failed; review the evidence.
This is an opt-in audit probe, not a security acceptance test.`);
  process.exit(0);
}
if (args.length > 1) throw new Error('Pass at most one core-directory argument. Use --help for usage.');
const [nodeMajor, nodeMinor] = process.versions.node.split('.').map(Number);
if (nodeMajor < 22 || (nodeMajor === 22 && nodeMinor < 6)) {
  throw new Error('Node >= 22.6 is required. For Node 22, run with --experimental-strip-types.');
}
const scriptDirectory = dirname(fileURLToPath(import.meta.url));
const coreDirectory = resolve(args[0] || process.env.PACI_CORE_PATH || resolve(scriptDirectory, '../../alignment_review/paci-core'));
for (const file of ['engine.ts', 'verify.ts', 'crypto.ts']) {
  if (!existsSync(join(coreDirectory, 'src', file))) {
    throw new Error(`paci-core src/${file} not found in ${coreDirectory}; pass a core-directory or set PACI_CORE_PATH.`);
  }
}
const [{ PaciEngine }, { verifyProofPackage }, { canonical }] = await Promise.all([
  import(pathToFileURL(join(coreDirectory, 'src/engine.ts')).href),
  import(pathToFileURL(join(coreDirectory, 'src/verify.ts')).href),
  import(pathToFileURL(join(coreDirectory, 'src/crypto.ts')).href),
]);

console.log(JSON.stringify({ mode: 'KNOWN_UNSAFE_BASELINE', coreDirectory, node: process.versions.node,
  meaning: 'Assertions intentionally demonstrate verifier defects. Success is not security acceptance.' }));
let reproduced = 0;
let changedOrFailed = 0;
function probe(name: string, expectedSafeBehavior: string, run: () => unknown): void {
  try {
    const result = run();
    reproduced++;
    console.log(JSON.stringify({ status: 'KNOWN_DEFECT_REPRODUCED', probe: name, expectedSafeBehavior, observed: result }));
  } catch (error) {
    changedOrFailed++;
    console.error(JSON.stringify({ status: 'BASELINE_CHANGED_OR_PROBE_FAILED', probe: name, expectedSafeBehavior,
      error: error instanceof Error ? error.message : String(error),
      note: 'This may indicate a fix, an API change, or an execution error. Review it; do not count it as automatic security acceptance.' }));
  }
}
const clone = <T,>(value: T): T => structuredClone(value);

const e = new PaciEngine();
e.registerTenant('t', 'cn', ['alice']);
const ctx = { actor_id: 'alice', tenant_id: 't' };
const r = e.registerRecord(ctx, {
  kind: 'MATERIAL', source: 'SELF_REPORTED', visibility: 'PUBLIC',
  content: { secret: 'synthetic original data' }, summary: { claim: 'not independently verified' },
}, 'm1');
const pkg = e.exportProofPackage({ actor_id: 'anon' }, [{ record_id: r.record_id }]);

// The trust anchor comes from the genuine engine, not from a modified package.
// Never substitute or replace this key inside a probe.
const opts = { pinnedKeyPem: e.log('cn').publicKeyPem };
const valid = verifyProofPackage(pkg, opts);
assert.equal(valid.ok, true, 'The unmodified fixture must verify before any attack probe.');
assert.equal(valid.key_pinned, true, 'The positive control must use the genuine pinned operator key.');
console.log(JSON.stringify({ control: 'UNMODIFIED_PACKAGE', ok: valid.ok, key_pinned: valid.key_pinned }));

probe('A: substituted record identity and version',
  'Reject a package whose outer record identity or version differs from the signed log leaf.', () => {
    const mismatched = clone(pkg);
    mismatched.entries[0].record_id = 'rec_invented';
    mismatched.entries[0].version = 999;
    const identity = verifyProofPackage(mismatched, opts);
    assert.equal(identity.ok, true);
    assert.equal(identity.key_pinned, true);
    assert.equal(identity.entries[0].record_id, 'rec_invented');
    assert.equal(identity.entries[0].version, 999);
    return identity;
  });

probe('B: altered disclosed summary with its salt removed',
  'Reject an altered or incomplete disclosed SUMMARY; missing proof material must not count as verified content.', () => {
    const missingSalt = clone(pkg);
    delete missingSalt.entries[0].disclosed.summary_salt;
    missingSalt.entries[0].disclosed.summary = { claim: 'independently certified; no labour violations' };
    const disclosure = verifyProofPackage(missingSalt, opts);
    assert.equal(disclosure.ok, true);
    assert.equal(disclosure.key_pinned, true);
    assert.equal(disclosure.entries[0].summary_matches, null);
    assert.equal(missingSalt.entries[0].disclosed.level, 'SUMMARY');
    return disclosure;
  });

probe('C: fabricated independent witness and anchor flags',
  'Reject unsupported witness claims or retain the explicit unverified-witness limitation; do not trust unsigned booleans.', () => {
    const witnessed = clone(pkg);
    witnessed.checkpoint.witnessed = true;
    witnessed.checkpoint.anchored = true;
    witnessed.notices = [];
    const trust = verifyProofPackage(witnessed, opts);
    assert.equal(trust.ok, true);
    assert.equal(trust.key_pinned, true);
    assert.deepEqual(trust.warnings, []);
    return trust;
  });

probe('D: changed own __proto__ field omitted by canonicalization',
  'Preserve all supported JSON fields in commitments, or reject unsupported fields consistently; changed committed content must fail.', () => {
    const before = JSON.parse('{"rows":42,"__proto__":{"approved":false}}');
    const after = JSON.parse('{"rows":42,"__proto__":{"approved":true}}');
    assert.equal(canonical(before), canonical(after));
    assert.notEqual(JSON.stringify(before), JSON.stringify(after));
    const rr = e.registerRecord(ctx, { kind: 'MATERIAL', source: 'SELF_REPORTED', content: before }, 'm2');
    const full = clone(e.exportProofPackage(ctx, [{ record_id: rr.record_id }]));
    full.entries[0].disclosed.committed_body.content['__proto__'].approved = true;
    const collision = verifyProofPackage(full, opts);
    assert.equal(collision.ok, true);
    assert.equal(collision.key_pinned, true);
    assert.equal(collision.entries[0].content_matches, true);
    return collision;
  });

probe('E: negative inclusion index',
  'Reject a negative, non-integer, or otherwise out-of-range leaf index before checking its proof.', () => {
    const negativeIndex = clone(pkg);
    negativeIndex.entries[0].leaf_index = -1;
    const result = verifyProofPackage(negativeIndex, opts);
    assert.equal(result.ok, true);
    assert.equal(result.key_pinned, true);
    return { leaf_index: negativeIndex.entries[0].leaf_index, verification: result };
  });

console.log(JSON.stringify({ probes: 5, reproduced, changedOrFailed,
  meaning: 'Reproduced means the known unsafe baseline remains present; this is not an acceptance gate.' }));
if (changedOrFailed) process.exitCode = 1;
