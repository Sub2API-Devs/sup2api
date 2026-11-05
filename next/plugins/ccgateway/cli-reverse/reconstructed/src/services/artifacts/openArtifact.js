/**
 * services/artifacts/openArtifact.ts
 *
 * 2.1.316 新增：打开 Artifact 前检查可访问性（未发布、其他组织、公开外部）及说明
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * new in 2.1.318 (2.1.88 has no file at this path)
 * pieces: chunk-b7m46xj6.js (3)
 * attribution: placement 3
 * (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.
 */
import { fetchBoot } from "./boot.js";
import { isArtifactNeverPublished, isArtifactInOtherOrg } from "./orgScope.js";
import { sanitizeDisplayTitle } from "../../utils/textNormalize.js";
import { ownedVerdict, deriveShareRole } from "./shareEntries.js";

//@ chunk-b7m46xj6.js:310-869 placement
/**
 * 打开 artifact 前探测其 boot：区分从未发布/未找到、其他组织、其他失败、组织外公开；成功时返回标题与是否本人所有。
 */
async function probeArtifactForOpen(target, feature, signal, credentials) {
  let boot = await fetchBoot(target, feature, signal, {
    gatePublicRead: false,
    credentials,
  });
  if (boot.err !== null) {
    if (boot.errorCode === "boot_404")
      return {
        ok: false,
        reason: isArtifactNeverPublished(boot) ? "never_published" : "not_found",
      };
    if (isArtifactInOtherOrg(boot))
      return {
        ok: false,
        reason: "other_org",
        err: boot.err,
      };
    return {
      ok: false,
      reason: "failed",
      err: boot.err,
      errorCode: boot.errorCode,
    };
  }
  if (boot.assetToken === undefined)
    return {
      ok: false,
      reason: "public_outside_org",
    };
  let title = typeof boot.data.title === "string" ? boot.data.title : undefined;
  let safeTitle = title !== undefined ? (sanitizeDisplayTitle(title) ?? undefined) : undefined;
  let owned = ownedVerdict({
    role: deriveShareRole(boot.data.perm?.role),
  });
  return {
    ok: true,
    ...(safeTitle !== undefined && {
      title: safeTitle,
    }),
    ...(owned !== undefined && {
      owned,
    }),
  };
}
//@ chunk-b7m46xj6.js:869-883 placement
/**
 * 导出常量或表 `OPEN_PROBE_TIMEOUT_MS`：值为 15000。
 */
var OPEN_PROBE_TIMEOUT_MS = 15000;
//@ chunk-b7m46xj6.js:883-1518 placement
/**
 * 把打开 artifact 失败的原因转成给用户的提示（组织外公开、其他组织、从未发布、未找到、检查失败可重试）。
 */
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
      return result.errorCode === undefined || result.errorCode === "boot_request_error"
        ? "Couldn't check that artifact, so it wasn't opened. Try again."
        : "Couldn't check that artifact, so it wasn't opened.";
  }
}
export { probeArtifactForOpen, OPEN_PROBE_TIMEOUT_MS, describeOpenFailure };
