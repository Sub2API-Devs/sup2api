/**
 * services/artifacts/openArtifact.ts
 *
 * 2.1.316 新增：打开 Artifact 前检查可访问性（未发布、其他组织、公开外部）及说明
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-nfdb9b3q.js (3)
 * attribution: placement 3
 */
import { fetchArtifactBootWithProbe } from "./boot.js";
import { cbt, B5 } from "./orgScope.js";
import { sanitizeDisplayTitle } from "../../utils/textNormalize.js";
import { ownedVerdict, deriveShareRole } from "./shareEntries.js";

/**
 * 打开 artifact 前探测其 boot：区分从未发布/未找到、其他组织、其他失败、组织外公开；成功时返回标题与是否本人所有。
 */
//@ chunk-nfdb9b3q.js:310-869 placement
async function probeArtifactForOpen(target, feature, signal, credentials) {
  let boot = await fetchArtifactBootWithProbe(target, feature, signal, {
    gatePublicRead: !1,
    credentials: credentials,
  });
  if (boot.err !== null) {
    if (boot.errorCode === "boot_404") return { ok: !1, reason: cbt(boot) ? "never_published" : "not_found" };
    if (B5(boot)) return { ok: !1, reason: "other_org", err: boot.err };
    return { ok: !1, reason: "failed", err: boot.err, errorCode: boot.errorCode };
  }
  if (boot.assetToken === void 0) return { ok: !1, reason: "public_outside_org" };
  let r = typeof boot.data.title === "string" ? boot.data.title : void 0,
    o = r !== void 0 ? (sanitizeDisplayTitle(r) ?? void 0) : void 0,
    n = ownedVerdict({ role: deriveShareRole(boot.data.perm?.role) });
  return { ok: !0, ...(o !== void 0 && { title: o }), ...(n !== void 0 && { owned: n }) };
}
//@ chunk-nfdb9b3q.js:869-883 placement
var Bjn = 15000;
/**
 * 把打开 artifact 失败的原因转成给用户的提示（组织外公开、其他组织、从未发布、未找到、检查失败可重试）。
 */
//@ chunk-nfdb9b3q.js:883-1518 placement
function describeOpenFailure(result) {
  switch (result.reason) {
    case "public_outside_org":
      return "Couldn't open that artifact. It's public and from outside your organization.";
    case "other_org":
      return "Couldn't open that artifact. It's in another of your organizations.";
    case "never_published":
      return "Couldn't open that artifact. Nothing has been published to it yet.";
    case "not_found":
      return "Couldn't open that artifact. It may have been deleted, or it isn't shared with you.";
    case "failed":
      return result.errorCode === void 0 || result.errorCode === "boot_request_error"
        ? "Couldn't check that artifact, so it wasn't opened. Try again."
        : "Couldn't check that artifact, so it wasn't opened.";
  }
}

export { probeArtifactForOpen, Bjn, describeOpenFailure };
