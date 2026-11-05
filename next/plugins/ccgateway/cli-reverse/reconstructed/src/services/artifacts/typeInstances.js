/**
 * services/artifacts/typeInstances.ts
 *
 * 2.1.316 新增：artifact 类型实例
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * new in 2.1.318 (2.1.88 has no file at this path)
 * pieces: chunk-m0ks5273.js (5)
 * attribution: placement 5
 */
import { issuedUnderDepartedAccount } from "./shareEntries.js";
import { getLiveState } from "../liveReplica/liveReplica.js";
import { DoctorLazy } from "../../cli/handlers/util.js";
import { objectSchema, booleanSchema } from "../../../vendor/zod/v4/classic/schemas.js";
import { ARTIFACT_SLUG_RE } from "../../tools/ArtifactTool/constants.js";
import { deferInit } from "../../../runtime/deferred-init.js";

//@ chunk-m0ks5273.js:19377-19535 placement
/**
 * 类型实例的归属类别（组织置顶、流水线、模板）与优先级表（第一方类型最高）。
 */
var REVOCABLE_INSTANCE_KINDS = ["org_pinned_instance", "pipeline_instance", "template_instance"];
var ATTESTATION_KIND_RANK = {
  first_party_type: 0,
  org_pinned_instance: 1,
  pipeline_instance: 2,
  template_instance: 3,
};
//@ chunk-m0ks5273.js:19535-19782 placement
/**
 * 记录某 artifact 的类型归属标记（第一方类型/组织置顶/流水线/模板）：忽略离开账号签发的、早于撤销时间的；按签发时间与优先级保留最强的标记。
 */
function markAttestation(slug, typeKey, ver) {
  if (issuedUnderDepartedAccount(ver)) return;
  let { attestedTypeArtifacts } = getLiveState();
  let entry = attestedTypeArtifacts.get(slug) ?? {};
  let revokedAt = entry.revokedAt?.[typeKey];
  if (revokedAt !== undefined && ver <= revokedAt) return;
  let mark = entry.mark;
  if (
    mark === undefined ||
    ver > mark.issuedAt ||
    (ver === mark.issuedAt && ATTESTATION_KIND_RANK[typeKey] < ATTESTATION_KIND_RANK[mark.kind])
  )
    attestedTypeArtifacts.set(slug, {
      ...entry,
      mark: {
        kind: typeKey,
        issuedAt: ver,
      },
    });
}
//@ chunk-m0ks5273.js:19782-20037 placement
/**
 * 撤销某 artifact 的若干归属类别：记录各类别的撤销时间，若当前标记属于被撤销类别且不晚于撤销时间则移除。
 */
function revokeAttestations(slug, kinds, issuedAt) {
  if (issuedUnderDepartedAccount(issuedAt)) return;
  let { attestedTypeArtifacts } = getLiveState();
  let record = attestedTypeArtifacts.get(slug) ?? {};
  let revokedAt = {
    ...record.revokedAt,
  };
  for (let kind of kinds) revokedAt[kind] = Math.max(revokedAt[kind] ?? issuedAt, issuedAt);
  let mark = record.mark;
  let keptMark =
    mark !== undefined && !(kinds.includes(mark.kind) && mark.issuedAt <= issuedAt) ? mark : undefined;
  attestedTypeArtifacts.set(slug, {
    ...(keptMark && {
      mark: keptMark,
    }),
    revokedAt,
  });
}
//@ chunk-m0ks5273.js:20037-20140 placement
var TYPE_ATTESTATION_SCHEMA; // deferred: uses DoctorLazy (../../cli/handlers/util.js) of its import cycle while loading; runs once the cycle is complete
deferInit("chunk-m0ks5273.js:20037", () => {
  TYPE_ATTESTATION_SCHEMA = DoctorLazy(() =>
    objectSchema({
      firstPartyType: booleanSchema().optional(),
      typeFirstParty: booleanSchema().optional(),
      template: booleanSchema().optional(),
    }),
  );
});
//@ chunk-m0ks5273.js:20140-20504 placement
/**
 * 根据 boot 返回的归属信息更新标记：firstPartyType 标记 artifact 自身为第一方类型；typeFirstParty 时标记其类型为第一方，并按 template 标记或撤销模板实例（外部 artifact 不标记自身）。
 */
function applyTypeAttestation(slug, typeFacts, facts, ver, options) {
  if (typeFacts === undefined) return;
  let parsed = TYPE_ATTESTATION_SCHEMA().safeParse(typeFacts);
  if (!parsed.success) return;
  let data = parsed.data;
  let external = options.external;
  if (data.firstPartyType === true) {
    if (!external) markAttestation(slug, "first_party_type", ver);
    return;
  }
  if (data.typeFirstParty !== true) return;
  if (facts !== undefined && ARTIFACT_SLUG_RE.test(facts)) markAttestation(facts, "first_party_type", ver);
  if (external) return;
  if (data.template === true) markAttestation(slug, "template_instance", ver);
  else revokeAttestations(slug, ["template_instance"], ver);
}
export { markAttestation, revokeAttestations, REVOCABLE_INSTANCE_KINDS, applyTypeAttestation };
