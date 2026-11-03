/**
 * tools/ArtifactTool/docsCreateWake.ts
 *
 * 2.1.316 新增。包装 Claude Docs 的 artifact create，使新建文档能挂上评论唤醒（tengu_breezy_acorn）。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-287bzc1g.js (4)
 * attribution: placement 4
 */
import { getFeatureValue_CACHED_MAY_BE_STALE } from "../../services/analytics/growthbook.js";
import { DoctorLazy } from "../../cli/handlers/util.js";
import { u, T, o } from "../../../vendor/zod/v4/classic/schemas.js";
import { ARTIFACT_SLUG_RE } from "./constants.js";
import { iterateTextContent, z6o } from "../../services/mcp/resultContent.js";
import { safeParseJSON } from "../../utils/json.js";
import { getFirstLine } from "../../utils/stringUtils.js";
import { env } from "../../utils/env.js";
import { BATCH } from "../../services/mcp/firstPartyServerIds.js";
import { getLiveState } from "../../services/liveReplica/liveReplica.js";
import { isPlainObject } from "../../utils/isPlainObject.js";
import { logFeatureSad, logFeatureOk, logFeatureBad } from "../../services/analytics/featureTelemetry.js";
import { isArtifactToolEnabled } from "../../services/artifacts/artifactToolGates.js";
import { qSe } from "./actionNames.js";
import { Xb } from "../../services/artifacts/artifactAvailability.js";
import { logError } from "../../utils/log.js";

//@ chunk-287bzc1g.js:775-822 placement
function C() {
  return getFeatureValue_CACHED_MAY_BE_STALE("tengu_breezy_acorn", !0);
}
//@ chunk-287bzc1g.js:822-928 placement
var docsCreateCommentWakeSlot = { arm: null },
  S = DoctorLazy(() =>
    u({ created: u({ verdict: T("allow"), minted: o() }), frame: u({ slug: o().regex(ARTIFACT_SLUG_RE) }) }),
  );
//@ chunk-287bzc1g.js:928-1166 placement
function docsCreatedSlugOf(r) {
  let at = [...iterateTextContent(r)].at(-1);
  if (at === void 0 || !z6o(at)) return null;
  let safeParse = S().safeParse(safeParseJSON(getFirstLine(at), !1));
  if (!safeParse.success) return null;
  let { created: created, frame: frame } = safeParse.data;
  return frame.slug === created.minted.slice(created.minted.lastIndexOf("/") + 1) ? frame.slug : null;
}
/**
 * 包装 Claude Docs 的 artifact create，使新建文档能挂上评论唤醒（tengu_breezy_acorn）。
 */
//@ chunk-287bzc1g.js:1166-1930 placement
function wrapClaudeDocsCreateWake(r) {
  if (!env.CLAUDE_CODE_REMOTE || r.mcpInfo?.toolName !== BATCH) return;
  let a = r.call;
  r.call = async (t, c, n, k, A, E) => {
    let { accountEpoch: accountEpoch, conversationEpoch: conversationEpoch } = getLiveState(),
      e = await a.call(r, t, c, n, k, A, E);
    try {
      if (!isPlainObject(t.container) || !("create" in t.container)) return e;
      let s = getLiveState(),
        _ = docsCreatedSlugOf(e.data);
      if (_ === null || s.accountEpoch !== accountEpoch || s.conversationEpoch !== conversationEpoch)
        return e;
      if (!C()) return (logFeatureSad("artifact_docs_create_wake", "flag_off"), e);
      if (!isArtifactToolEnabled())
        return (logFeatureSad("artifact_docs_create_wake", "artifact_tool_off"), e);
      if (docsCreateCommentWakeSlot.arm === null) qSe.loadWriters?.();
      if (!Xb()) return (logFeatureSad("artifact_docs_create_wake", "comments_off"), e);
      let d = docsCreateCommentWakeSlot.arm?.(c, _);
      if (d) logFeatureOk("artifact_docs_create_wake");
      else logFeatureSad("artifact_docs_create_wake", d === void 0 ? "no_wake_arm" : "not_armed");
    } catch (error) {
      (logFeatureBad("artifact_docs_create_wake", "threw"), logError(error));
    }
    return e;
  };
}

export { docsCreateCommentWakeSlot };
