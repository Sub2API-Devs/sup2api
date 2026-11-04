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
import { objectSchema, literal, stringSchema } from "../../../vendor/zod/v4/classic/schemas.js";
import { ARTIFACT_SLUG_RE } from "./constants.js";
import { iterateTextContent, hasFramePayload } from "../../services/mcp/resultContent.js";
import { safeParseJSON } from "../../utils/json.js";
import { getFirstLine } from "../../utils/stringUtils.js";
import { env } from "../../utils/env.js";
import { BATCH } from "../../services/mcp/firstPartyServerIds.js";
import { getLiveState } from "../../services/liveReplica/liveReplica.js";
import { isPlainObject } from "../../utils/isPlainObject.js";
import { logFeatureSad, logFeatureOk, logFeatureBad } from "../../services/analytics/featureTelemetry.js";
import { isArtifactToolEnabled } from "../../services/artifacts/artifactToolGates.js";
import { lazyWritersSlot } from "./actionNames.js";
import { isArtifactsAvailable } from "../../services/artifacts/artifactAvailability.js";
import { logError } from "../../utils/log.js";

//@ chunk-287bzc1g.js:775-822 placement
/**
 * 是否启用 docs 创建后的唤醒（读灰度开关）。
 */
function isDocsCreateWakeOn() {
  return getFeatureValue_CACHED_MAY_BE_STALE("tengu_breezy_acorn", true);
}
//@ chunk-287bzc1g.js:822-928 placement
/**
 * docs 创建唤醒载荷的校验 schema。
 */
var docsCreateCommentWakeSlot = {
  arm: null,
};
var docsCreateWakePayloadSchema = DoctorLazy(() =>
  objectSchema({
    created: objectSchema({
      verdict: literal("allow"),
      minted: stringSchema(),
    }),
    frame: objectSchema({
      slug: stringSchema().regex(ARTIFACT_SLUG_RE),
    }),
  }),
);
//@ chunk-287bzc1g.js:928-1166 placement
function docsCreatedSlugOf(result) {
  let text = [...iterateTextContent(result)].at(-1);
  if (text === undefined || !hasFramePayload(text)) return null;
  let parsed = docsCreateWakePayloadSchema().safeParse(safeParseJSON(getFirstLine(text), false));
  if (!parsed.success) return null;
  let { created, frame } = parsed.data;
  return frame.slug === created.minted.slice(created.minted.lastIndexOf("/") + 1) ? frame.slug : null;
}
//@ chunk-287bzc1g.js:1166-1930 placement
/**
 * 包装 Claude Docs 的 artifact create，使新建文档能挂上评论唤醒（tengu_breezy_acorn）。
 */
function wrapClaudeDocsCreateWake(entry) {
  if (!env.CLAUDE_CODE_REMOTE || entry.mcpInfo?.toolName !== BATCH) return;
  let originalCall = entry.call;
  entry.call = async (input, context, canUseTool, parentMessage, onProgress, options) => {
    let { accountEpoch, conversationEpoch } = getLiveState();
    let result = await originalCall.call(
      entry,
      input,
      context,
      canUseTool,
      parentMessage,
      onProgress,
      options,
    );
    try {
      if (!isPlainObject(input.container) || !("create" in input.container)) return result;
      let liveState = getLiveState();
      let slug = docsCreatedSlugOf(result.data);
      if (
        slug === null ||
        liveState.accountEpoch !== accountEpoch ||
        liveState.conversationEpoch !== conversationEpoch
      )
        return result;
      if (!isDocsCreateWakeOn()) {
        logFeatureSad("artifact_docs_create_wake", "flag_off");
        return result;
      }
      if (!isArtifactToolEnabled()) {
        logFeatureSad("artifact_docs_create_wake", "artifact_tool_off");
        return result;
      }
      if (docsCreateCommentWakeSlot.arm === null) lazyWritersSlot.loadWriters?.();
      if (!isArtifactsAvailable()) {
        logFeatureSad("artifact_docs_create_wake", "comments_off");
        return result;
      }
      let armResult = docsCreateCommentWakeSlot.arm?.(context, slug);
      if (armResult) logFeatureOk("artifact_docs_create_wake");
      else logFeatureSad("artifact_docs_create_wake", armResult === undefined ? "no_wake_arm" : "not_armed");
    } catch (error) {
      logFeatureBad("artifact_docs_create_wake", "threw");
      logError(error);
    }
    return result;
  };
}
export { docsCreateCommentWakeSlot, docsCreatedSlugOf, wrapClaudeDocsCreateWake };
