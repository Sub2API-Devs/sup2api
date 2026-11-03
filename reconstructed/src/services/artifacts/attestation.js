/**
 * services/artifacts/attestation.ts
 *
 * 2.1.316 新增：artifact 证明（attestation）类型判断与标签
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-jv307fw4.js (5)
 * attribution: placement 5
 */
import { getLiveState } from "../liveReplica/liveReplica.js";

//@ chunk-jv307fw4.js:20487-20555 placement
function getAttestationKind(e) {
  return getLiveState().attestedTypeArtifacts.get(e)?.mark?.kind;
}
//@ chunk-jv307fw4.js:20555-20593 placement
function isAttestedArtifact(e) {
  return getAttestationKind(e) !== undefined;
}
//@ chunk-jv307fw4.js:20593-21024 placement
function describeAttestationKind(e) {
  switch (e) {
    case "first_party_type":
      return "a published first-party Artifact type";
    case "org_pinned_instance":
      return "an Artifact the organization's admins pinned for its type (its design system or template)";
    case "pipeline_instance":
      return "a template the organization's publishing pipeline owns";
    case "template_instance":
      return "a design system (an Artifact made from a template Artifact type) in the user's organization";
  }
}
//@ chunk-jv307fw4.js:21024-21098 placement
function formatAttestationTag(slug) {
  let attestationKind = getAttestationKind(slug);
  return attestationKind === undefined ? "" : ` [attested: ${describeAttestationKind(attestationKind)}]`;
}
//@ chunk-jv307fw4.js:21098-21112 placement
var ATTESTATION_KIND_TTL_MS = 600000;
export {
  getAttestationKind,
  formatAttestationTag,
  describeAttestationKind,
  ATTESTATION_KIND_TTL_MS,
  isAttestedArtifact,
};
