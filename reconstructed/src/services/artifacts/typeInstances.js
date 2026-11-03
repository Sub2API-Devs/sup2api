/**
 * services/artifacts/typeInstances.ts
 *
 * 2.1.316 新增：artifact 类型实例
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-jv307fw4.js (5)
 * attribution: placement 5
 */
import { issuedUnderDepartedAccount } from "./shareEntries.js";
import { getLiveState } from "../liveReplica/liveReplica.js";
import { DoctorLazy } from "../../cli/handlers/util.js";
import { u, M } from "../../../vendor/zod/v4/classic/schemas.js";
import { ARTIFACT_SLUG_RE } from "../../tools/ArtifactTool/constants.js";

/**
 * 类型实例的归属类别（组织置顶、流水线、模板）与优先级表（第一方类型最高）。
 */
//@ chunk-jv307fw4.js:19360-19518 placement
var REVOCABLE_INSTANCE_KINDS = ["org_pinned_instance", "pipeline_instance", "template_instance"],
  ATTESTATION_KIND_RANK = {
    first_party_type: 0,
    org_pinned_instance: 1,
    pipeline_instance: 2,
    template_instance: 3,
  };
/**
 * 记录某 artifact 的类型归属标记（第一方类型/组织置顶/流水线/模板）：忽略离开账号签发的、早于撤销时间的；按签发时间与优先级保留最强的标记。
 */
//@ chunk-jv307fw4.js:19518-19765 placement
function markAttestation(e, n, r) {
  if (issuedUnderDepartedAccount(r)) return;
  let { attestedTypeArtifacts: attestedTypeArtifacts } = getLiveState(),
    a = attestedTypeArtifacts.get(e) ?? {},
    l = a.revokedAt?.[n];
  if (l !== void 0 && r <= l) return;
  let mark = a.mark;
  if (
    mark === void 0 ||
    r > mark.issuedAt ||
    (r === mark.issuedAt && ATTESTATION_KIND_RANK[n] < ATTESTATION_KIND_RANK[mark.kind])
  )
    attestedTypeArtifacts.set(e, { ...a, mark: { kind: n, issuedAt: r } });
}
/**
 * 撤销某 artifact 的若干归属类别：记录各类别的撤销时间，若当前标记属于被撤销类别且不晚于撤销时间则移除。
 */
//@ chunk-jv307fw4.js:19765-20020 placement
function revokeAttestations(e, n, r) {
  if (issuedUnderDepartedAccount(r)) return;
  let { attestedTypeArtifacts: attestedTypeArtifacts } = getLiveState(),
    a = attestedTypeArtifacts.get(e) ?? {},
    l = { ...a.revokedAt };
  for (let b of n) l[b] = Math.max(l[b] ?? r, r);
  let mark = a.mark,
    h = mark !== void 0 && !(n.includes(mark.kind) && mark.issuedAt <= r) ? mark : void 0;
  attestedTypeArtifacts.set(e, { ...(h && { mark: h }), revokedAt: l });
}
//@ chunk-jv307fw4.js:20020-20123 placement
var TYPE_ATTESTATION_SCHEMA = DoctorLazy(() =>
  u({ firstPartyType: M().optional(), typeFirstParty: M().optional(), template: M().optional() }),
);
/**
 * 根据 boot 返回的归属信息更新标记：firstPartyType 标记 artifact 自身为第一方类型；typeFirstParty 时标记其类型为第一方，并按 template 标记或撤销模板实例（外部 artifact 不标记自身）。
 */
//@ chunk-jv307fw4.js:20123-20487 placement
function applyTypeAttestation(e, n, r, s, a) {
  if (n === void 0) return;
  let safeParse = TYPE_ATTESTATION_SCHEMA().safeParse(n);
  if (!safeParse.success) return;
  let d = safeParse.data,
    external = a.external;
  if (d.firstPartyType === !0) {
    if (!external) markAttestation(e, "first_party_type", s);
    return;
  }
  if (d.typeFirstParty !== !0) return;
  if (r !== void 0 && ARTIFACT_SLUG_RE.test(r)) markAttestation(r, "first_party_type", s);
  if (external) return;
  if (d.template === !0) markAttestation(e, "template_instance", s);
  else revokeAttestations(e, ["template_instance"], s);
}

export { applyTypeAttestation, markAttestation, revokeAttestations, REVOCABLE_INSTANCE_KINDS };
