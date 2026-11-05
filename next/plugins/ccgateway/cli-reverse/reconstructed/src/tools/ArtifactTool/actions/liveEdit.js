/**
 * tools/ArtifactTool/actions/liveEdit.ts
 *
 * 2.1.316 新增：实时编辑动作
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * new in 2.1.318 (2.1.88 has no file at this path)
 * pieces: chunk-xzmy9dn4.js (1)
 * attribution: placement 1
 */
import {
  planConsentMustDeny,
  getToolPermissionContext,
} from "../../../utils/permissions/toolPermissionContext.js";
import { artifactLivePathsSchemaOpen } from "../../../services/artifacts/artifactToolSchema.js";
import { throwUnroutedArtifactAction } from "../../../services/artifacts/artifactPeople.js";
import { urlSubPathError } from "../permissions/dbWriteInputs.js";
import { parseArtifactUrl, ArtifactInputError } from "../constants.js";
import {
  getShareEntry,
  shareAudienceSentence,
  shareAudienceMark,
} from "../../../services/artifacts/shareEntries.js";
import { plural } from "../../../utils/stringUtils.js";
import { carriesAnyDecisionPin } from "../permissions/consentStamps.js";
import { liveEditSourceSchema } from "../../../services/artifacts/publishSource.js";

//@ chunk-xzmy9dn4.js:128085-130418 placement
/**
 * live-edit 动作：Ds 为可选的 live-edit 实现模块（本构建可能为 null）；Ju 为动作处理器（权限、校验、分类器输入、描述、摘要、调用），Qu 为结果渲染。
 */
var liveEditModule = null;
var ARTIFACT_LIVE_EDIT_ACTION_HANDLER = {
  actions: ["live-edit"],
  async checkPermissions(tool, input, context) {
    if (input.action === "live-edit") {
      if (!liveEditModule)
        return {
          behavior: "deny",
          message: "live-edit is not available in this build",
          decisionReason: {
            type: "other",
            reason: "not available",
          },
        };
      return await liveEditModule.checkLiveEditPermissions(
        input,
        context,
        {
          planConsentMustDeny,
          getToolPermissionContext,
        },
        artifactLivePathsSchemaOpen(),
      );
    }
    return throwUnroutedArtifactAction("liveEdit.checkPermissions", input);
  },
  async validateInput(tool, input) {
    let { action, url } = input;
    if (action === "live-edit") {
      if (!liveEditModule)
        return {
          result: false,
          message: "live-edit is not available in this build",
          errorCode: 9,
        };
      let urlError = url !== undefined ? urlSubPathError(url) : undefined;
      if (urlError !== undefined) return urlError;
      return liveEditModule.validateLiveEditInput(input, url, artifactLivePathsSchemaOpen());
    }
    return throwUnroutedArtifactAction("liveEdit.validateInput", input);
  },
  toAutoClassifierInput(input) {
    if (input?.action === "live-edit")
      return liveEditModule
        ? liveEditModule.classifyLiveEdit(input, artifactLivePathsSchemaOpen())
        : "live-edit artifact";
    return throwUnroutedArtifactAction("liveEdit.toAutoClassifierInput", input);
  },
  async description(tool, input) {
    if (input?.action === "live-edit") {
      let artifactUrl = typeof input.url === "string" ? parseArtifactUrl(input.url) : null;
      let shareEntry = artifactUrl !== null ? getShareEntry(artifactUrl.slug) : undefined;
      return `Apply live edits to an already-published artifact page \u2014 the changes go live immediately (${shareAudienceSentence(shareEntry)}).`;
    }
    return throwUnroutedArtifactAction("liveEdit.description", input);
  },
  getToolUseSummary(input) {
    if (input?.action === "live-edit") {
      let liveOps = liveEditModule ? liveEditModule.liveOpsFrom(input) : undefined;
      let artifactUrl = typeof input.url === "string" ? parseArtifactUrl(input.url) : null;
      let shareEntry = artifactUrl !== null ? getShareEntry(artifactUrl.slug) : undefined;
      let audienceMark = shareAudienceMark(shareEntry);
      return liveOps === undefined
        ? `apply live edits to a published artifact${audienceMark}`
        : `apply live edits to a published artifact (${liveOps.length} ${plural(liveOps.length, "op")})${audienceMark}`;
    }
    return throwUnroutedArtifactAction("liveEdit.getToolUseSummary", input);
  },
  async call(tool, input, context, options) {
    if (input.action === "live-edit") {
      if (!liveEditModule)
        throw new ArtifactInputError("live-edit is not available in this build", "live_edit_unavailable");
      if (carriesAnyDecisionPin(input))
        throw new ArtifactInputError(
          "`action` no longer names what was approved \u2014 this input was approved as another Artifact action, not this live-edit; nothing was sent; retry so it is checked again",
          "live_edit_target_changed",
        );
      let result = await liveEditModule.runLiveEditAction(
        input,
        context.abortController.signal,
        context,
        artifactLivePathsSchemaOpen(),
        options?.requestId,
      );
      {
        let artifactUrl = input.url ? parseArtifactUrl(input.url) : null;
        if (artifactUrl) context.setArtifactContractTarget(artifactUrl.slug, undefined);
      }
      return result;
    }
    return throwUnroutedArtifactAction("liveEdit.call", input);
  },
};
var LIVE_EDIT_RESULT_MAPPERS = {
  liveEdit(result, toolUseId) {
    if ("liveEdit" in result) {
      let parsed = liveEditSourceSchema().safeParse(result);
      return {
        tool_use_id: toolUseId,
        type: "tool_result",
        content: !parsed.success
          ? "This record of a live edit is unreadable \u2014 fetch the artifact url for the document as it stands."
          : liveEditModule
            ? liveEditModule.mapLiveEditResultContent(parsed.data.liveEdit)
            : "Live edit landed.",
      };
    }
    return throwUnroutedArtifactAction("liveEdit.liveEdit", result);
  },
};
export { ARTIFACT_LIVE_EDIT_ACTION_HANDLER, LIVE_EDIT_RESULT_MAPPERS };
