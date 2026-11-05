import { BridgeError, canonicalJson } from "./paci-bridge-core.js";

/** Explicit projection of a fixed, digest-checked DOSSIVO preparation snapshot. */
export function snapshotView(manifest, digest) {
  const content = manifest?.records?.[0]?.record?.content;
  if (manifest?.format !== "dossivo-paci-dossier/0.1" || manifest.synthetic_demo !== true
    || !content || !content.scope || !Array.isArray(content.facts) || !Array.isArray(content.open_gaps)) {
    throw new BridgeError("INVALID_SNAPSHOT", "The saved preparation format is unsupported", 409);
  }
  for (const entries of [content.facts, content.open_gaps]) {
    const refs = entries.map((item) => item.local_ref);
    if (refs.some((ref) => typeof ref !== "string" || !ref) || new Set(refs).size !== refs.length) {
      throw new BridgeError("AMBIGUOUS_SNAPSHOT", "The saved preparation has ambiguous local references", 409);
    }
  }
  return {
    id: manifest.dossier_id, case_version: manifest.case_version, created_at: manifest.created_at,
    local_content_sha256: digest, digest_check: "MATCHED_LOCAL_CONTENT", verification: "UNVERIFIED",
    registration_status: "PENDING", proof_package: null, synthetic_demo: true,
    scope: structuredClone(content.scope), facts: structuredClone(content.facts), gaps: structuredClone(content.open_gaps),
  };
}

export function compareSnapshotViews(before, after) {
  const changes = [];
  const add = (group, ref, field, left, right) => {
    const a = left ?? null, b = right ?? null;
    if (canonicalJson(a) !== canonicalJson(b)) changes.push({ group, ref, field, before: a, after: b, kind: a === null ? "ADDED" : b === null ? "REMOVED" : "CHANGED" });
  };
  for (const field of ["organization", "product", "facility", "market", "period", "ruleSet"]) add("scope", field, field, before.scope[field], after.scope[field]);
  for (const [group, fields] of [["facts", ["label", "value", "source_label", "confirmed_by_company"]], ["gaps", ["title", "status"]]]) {
    const left = new Map(before[group].map((item) => [item.local_ref, item]));
    const right = new Map(after[group].map((item) => [item.local_ref, item]));
    for (const ref of [...new Set([...left.keys(), ...right.keys()])].sort()) {
      if (!left.has(ref) || !right.has(ref)) add(group, ref, "record", left.get(ref), right.get(ref));
      else for (const field of fields) add(group, ref, field, left.get(ref)[field], right.get(ref)[field]);
    }
  }
  return {
    format: "dossivo-snapshot-comparison/0.1", synthetic_demo: true, before, after, changes,
    summary: { added: changes.filter((item) => item.kind === "ADDED").length, removed: changes.filter((item) => item.kind === "REMOVED").length, changed: changes.filter((item) => item.kind === "CHANGED").length },
    verification: "UNVERIFIED", proof_package: null,
  };
}
