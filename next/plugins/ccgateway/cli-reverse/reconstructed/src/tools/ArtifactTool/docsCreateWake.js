/**
 * tools/ArtifactTool/docsCreateWake.ts
 *
 * 2.1.316 新增。包装 Claude Docs 的 artifact create，使新建文档能挂上评论唤醒（tengu_breezy_acorn）。
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * new in 2.1.318 (2.1.88 has no file at this path)
 * pieces: chunk-tkc81w8s.js (4)
 * attribution: placement 4
 * (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.
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
import { needsDocsConnectorFixup } from "../../services/mcp/claudeDocsLinks.js";
import { getToolPermissionContext } from "../../utils/permissions/toolPermissionContext.js";
import { isPlainObject } from "../../utils/isPlainObject.js";
import { logFeatureSad, logFeatureOk, logFeatureBad } from "../../services/analytics/featureTelemetry.js";
import { isArtifactToolEnabled } from "../../services/artifacts/artifactToolGates.js";
import { lazyWritersSlot } from "./actionNames.js";
import { isArtifactsAvailable } from "../../services/artifacts/artifactAvailability.js";
import { logError } from "../../utils/log.js";

//@ chunk-tkc81w8s.js:815-862 placement
/**
 * 是否启用 docs 创建后的唤醒（读灰度开关）。
 */
function isDocsCreateWakeOn() {
  return getFeatureValue_CACHED_MAY_BE_STALE("tengu_breezy_acorn", true);
}
//@ chunk-tkc81w8s.js:862-968 placement
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
//@ chunk-tkc81w8s.js:968-1206 placement
function docsCreatedSlugOf(result) {
  let text = [...iterateTextContent(result)].at(-1);
  if (text === undefined || !hasFramePayload(text)) return null;
  let parsed = docsCreateWakePayloadSchema().safeParse(safeParseJSON(getFirstLine(text), false));
  if (!parsed.success) return null;
  let { created, frame } = parsed.data;
  return frame.slug === created.minted.slice(created.minted.lastIndexOf("/") + 1) ? frame.slug : null;
}
//@ chunk-tkc81w8s.js:1206-2525 placement
/**
 * 包住 Artifact 工具调用：标记 docsConnector、在 plan 模式下记 planDoc、创建后按 epoch 回填 doc id 并触发评论唤醒。
 */
function wrapClaudeDocsCreateWake(tool) {
  if (tool.mcpInfo !== undefined)
    tool.mcpInfo = {
      ...tool.mcpInfo,
      docsConnector: true,
    };
  if (!env.CLAUDE_CODE_REMOTE || tool.mcpInfo?.toolName !== BATCH) return;
  let originalCall = tool.call;
  tool.call = async (input, context, options, extra, callback, signal) => {
    let { accountEpoch, conversationEpoch } = getLiveState();
    let planDoc =
      needsDocsConnectorFixup(tool, input, context) &&
      getToolPermissionContext(context).mode === "plan" &&
      isPlainObject(input.container) &&
      isPlainObject(input.container.create) &&
      typeof input.container.create.name === "string"
        ? {
            id: undefined,
            title: input.container.create.name,
          }
        : undefined;
    if (planDoc !== undefined)
      context.setToolPermissionContext((permissionState) =>
        permissionState.mode === "plan" && permissionState.planDoc === undefined
          ? {
              ...permissionState,
              planDoc,
            }
          : permissionState,
      );
    let result = await originalCall
      .call(tool, input, context, options, extra, callback, signal)
      .catch((error) => {
        if (planDoc !== undefined) logFeatureSad("plan_doc", "not_created");
        throw error;
      });
    try {
      if (!isPlainObject(input.container) || !("create" in input.container)) return result;
      let liveState = getLiveState();
      let createdSlug = docsCreatedSlugOf(result.data);
      if (planDoc !== undefined && createdSlug === null) logFeatureSad("plan_doc", "not_created");
      if (
        createdSlug === null ||
        liveState.accountEpoch !== accountEpoch ||
        liveState.conversationEpoch !== conversationEpoch
      )
        return result;
      if (planDoc !== undefined) {
        context.setToolPermissionContext((permissionState) =>
          permissionState.planDoc === planDoc
            ? {
                ...permissionState,
                planDoc: {
                  ...planDoc,
                  id: createdSlug,
                },
              }
            : permissionState,
        );
        logFeatureOk("plan_doc");
      }
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
      let armResult = docsCreateCommentWakeSlot.arm?.(context, createdSlug);
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
