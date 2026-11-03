/**
 * tools/ArtifactTool/actions/liveEdit.ts
 *
 * 2.1.316 新增：实时编辑动作
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-8wvtd8sr.js (1)
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

//@ chunk-8wvtd8sr.js:127228-129561 placement
/**
 * live-edit 动作：Ds 为可选的 live-edit 实现模块（本构建可能为 null）；Ju 为动作处理器（权限、校验、分类器输入、描述、摘要、调用），Qu 为结果渲染。
 */
var liveEditModule = null;
var ARTIFACT_LIVE_EDIT_ACTION_HANDLER = {
  actions: ["live-edit"],
  async checkPermissions(e, n, s) {
    if (n.action === "live-edit") {
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
        n,
        s,
        {
          planConsentMustDeny,
          getToolPermissionContext,
        },
        artifactLivePathsSchemaOpen(),
      );
    }
    return throwUnroutedArtifactAction("liveEdit.checkPermissions", n);
  },
  async validateInput(e, n) {
    let { action, url } = n;
    if (action === "live-edit") {
      if (!liveEditModule)
        return {
          result: false,
          message: "live-edit is not available in this build",
          errorCode: 9,
        };
      let h = url !== undefined ? urlSubPathError(url) : undefined;
      if (h !== undefined) return h;
      return liveEditModule.validateLiveEditInput(n, url, artifactLivePathsSchemaOpen());
    }
    return throwUnroutedArtifactAction("liveEdit.validateInput", n);
  },
  toAutoClassifierInput(e) {
    if (e?.action === "live-edit")
      return liveEditModule
        ? liveEditModule.classifyLiveEdit(e, artifactLivePathsSchemaOpen())
        : "live-edit artifact";
    return throwUnroutedArtifactAction("liveEdit.toAutoClassifierInput", e);
  },
  async description(e, n) {
    if (n?.action === "live-edit") {
      let s = typeof n.url === "string" ? parseArtifactUrl(n.url) : null;
      let r = s !== null ? getShareEntry(s.slug) : undefined;
      return `Apply live edits to an already-published artifact page \u2014 the changes go live immediately (${shareAudienceSentence(r)}).`;
    }
    return throwUnroutedArtifactAction("liveEdit.description", n);
  },
  getToolUseSummary(e) {
    if (e?.action === "live-edit") {
      let n = liveEditModule ? liveEditModule.liveOpsFrom(e) : undefined;
      let s = typeof e.url === "string" ? parseArtifactUrl(e.url) : null;
      let r = s !== null ? getShareEntry(s.slug) : undefined;
      let h = shareAudienceMark(r);
      return n === undefined
        ? `apply live edits to a published artifact${h}`
        : `apply live edits to a published artifact (${n.length} ${plural(n.length, "op")})${h}`;
    }
    return throwUnroutedArtifactAction("liveEdit.getToolUseSummary", e);
  },
  async call(e, n, s, r) {
    if (n.action === "live-edit") {
      if (!liveEditModule)
        throw new ArtifactInputError("live-edit is not available in this build", "live_edit_unavailable");
      if (carriesAnyDecisionPin(n))
        throw new ArtifactInputError(
          "`action` no longer names what was approved \u2014 this input was approved as another Artifact action, not this live-edit; nothing was sent; retry so it is checked again",
          "live_edit_target_changed",
        );
      let h = await liveEditModule.runLiveEditAction(
        n,
        s.abortController.signal,
        s,
        artifactLivePathsSchemaOpen(),
        r?.requestId,
      );
      {
        let y = n.url ? parseArtifactUrl(n.url) : null;
        if (y) s.setArtifactContractTarget(y.slug, undefined);
      }
      return h;
    }
    return throwUnroutedArtifactAction("liveEdit.call", n);
  },
};
var LIVE_EDIT_RESULT_MAPPERS = {
  liveEdit(e, toolUseId) {
    if ("liveEdit" in e) {
      let s = liveEditSourceSchema().safeParse(e);
      return {
        tool_use_id: toolUseId,
        type: "tool_result",
        content: !s.success
          ? "This record of a live edit is unreadable \u2014 fetch the artifact url for the document as it stands."
          : liveEditModule
            ? liveEditModule.mapLiveEditResultContent(s.data.liveEdit)
            : "Live edit landed.",
      };
    }
    return throwUnroutedArtifactAction("liveEdit.liveEdit", e);
  },
};
export { ARTIFACT_LIVE_EDIT_ACTION_HANDLER, LIVE_EDIT_RESULT_MAPPERS };
