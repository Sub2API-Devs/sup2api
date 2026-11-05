/**
 * services/artifacts/attestation.ts
 *
 * 2.1.316 新增：artifact 证明（attestation）类型判断与标签
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * new in 2.1.318 (2.1.88 has no file at this path)
 * pieces: chunk-m0ks5273.js (5)
 * attribution: placement 5
 */
import { getLiveState } from "../liveReplica/liveReplica.js";

//@ chunk-m0ks5273.js:20504-20572 placement
function getAttestationKind(read) {
  return getLiveState().attestedTypeArtifacts.get(read)?.mark?.kind;
}
//@ chunk-m0ks5273.js:20572-20610 placement
function isAttestedArtifact(read) {
  return getAttestationKind(read) !== undefined;
}
//@ chunk-m0ks5273.js:20610-21041 placement
function describeAttestationKind(read) {
  switch (read) {
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
//@ chunk-m0ks5273.js:21041-21115 placement
function formatAttestationTag(slug) {
  let read = getAttestationKind(slug);
  return read === undefined ? "" : ` [attested: ${describeAttestationKind(read)}]`;
}
//@ chunk-m0ks5273.js:21115-21129 placement
var ATTESTATION_KIND_TTL_MS = 600000;
export {
  formatAttestationTag,
  getAttestationKind,
  describeAttestationKind,
  isAttestedArtifact,
  ATTESTATION_KIND_TTL_MS,
};
