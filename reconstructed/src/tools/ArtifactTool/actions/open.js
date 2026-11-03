/**
 * tools/ArtifactTool/actions/open.ts
 *
 * 2.1.316 新增：open 动作
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-8wvtd8sr.js (1)
 * attribution: placement 1
 */
import {
  hasOpenAction,
  validateArtifactPathInput,
  parseArtifactUrlOrThrow,
} from "../permissions/artifactPermissionRules.js";
import { throwUnroutedArtifactAction } from "../../../services/artifacts/artifactPeople.js";
import {
  classifierArtifactTargetFor,
  canonicalArtifactTargetFor,
  artifactViewerUrlFor,
  ownedField,
} from "../artifactUrls.js";
import { ArtifactInputError } from "../constants.js";
import { getLiveState } from "../../../services/liveReplica/liveReplica.js";
import { probeArtifactForOpen } from "../../../services/artifacts/openArtifact.js";
import { logFeatureBad, logFeatureOk } from "../../../services/analytics/featureTelemetry.js";
import { openArtifactFrame, markFrameOpenOutcome } from "../permissions/ownershipConsent.js";
import { autoOpenArtifactPreview } from "../../../services/artifacts/autoOpen.js";
import { derivePublishContext } from "../permissions/consentStamps.js";

//@ chunk-8wvtd8sr.js:129561-132361 placement
/**
 * open 动作：不可用提示、动作处理器与结果渲染。
 */
var OPEN_UNAVAILABLE_MESSAGE = "open is not available in this session.";
var NOTHING_WAS_OPENED = "Nothing was opened.";
var ARTIFACT_OPEN_ACTION_HANDLER = {
  actions: ["open"],
  async checkPermissions(e, n) {
    if (n.action === "open") {
      if (!hasOpenAction())
        return {
          behavior: "deny",
          message: OPEN_UNAVAILABLE_MESSAGE,
          decisionReason: {
            type: "safetyCheck",
            reason: "Open gate closed at schema freeze",
            classifierApprovable: false,
          },
        };
      return {
        behavior: "allow",
        updatedInput: n,
        decisionReason: {
          type: "other",
          reason: "Showing the user an existing artifact is a read-only action",
        },
      };
    }
    return throwUnroutedArtifactAction("open.checkPermissions", n);
  },
  async validateInput(e, n) {
    if (n.action === "open") {
      if (!hasOpenAction())
        return {
          result: false,
          message: OPEN_UNAVAILABLE_MESSAGE,
          errorCode: 8,
        };
      return validateArtifactPathInput("open", n, n.url);
    }
    return throwUnroutedArtifactAction("open.validateInput", n);
  },
  toAutoClassifierInput(e) {
    if (e?.action === "open")
      return `show the user artifact \u2192 ${classifierArtifactTargetFor(e.url, "(no artifact url)")} (read-only, changes nothing)`;
    return throwUnroutedArtifactAction("open.toAutoClassifierInput", e);
  },
  async description(e, n) {
    if (n?.action === "open")
      return `Show the user the artifact ${canonicalArtifactTargetFor(n.url, "(no artifact url)")} \u2014 opens it where they view artifacts; read-only.`;
    return throwUnroutedArtifactAction("open.description", n);
  },
  getToolUseSummary(e) {
    if (e?.action === "open") return "open artifact for the user (read-only)";
    return throwUnroutedArtifactAction("open.getToolUseSummary", e);
  },
  async call(e, n, s) {
    if (n.action === "open") {
      if (!hasOpenAction()) throw new ArtifactInputError(OPEN_UNAVAILABLE_MESSAGE, "open_gate_closed");
      let target = parseArtifactUrlOrThrow(n.url);
      let h = artifactViewerUrlFor(target);
      let liveState = getLiveState();
      let p = {
        account: liveState.accountEpoch,
        conversation: liveState.conversationEpoch,
      };
      let w = await probeArtifactForOpen(target, "artifact_open", s.abortController.signal, s.credentials);
      if (!w.ok)
        switch (w.reason) {
          case "never_published":
            throw new ArtifactInputError(
              `Nothing has been published at ${h} yet, so there is no page to open. ${NOTHING_WAS_OPENED}`,
              "open_not_found",
            );
          case "not_found":
            throw new ArtifactInputError(
              `No Artifact at ${h} that the user can see \u2014 it may have been deleted, or it has not been shared with them. ${NOTHING_WAS_OPENED}`,
              "open_not_found",
            );
          case "other_org":
            throw new ArtifactInputError(`${h}: ${w.err}. ${NOTHING_WAS_OPENED}`, "open_other_org");
          case "public_outside_org":
            logFeatureBad("artifact_open", "public_outside_org");
            throw new ArtifactInputError(
              `${h} is a public Artifact from outside the user's organization, and open shows only artifacts in their organization or shared with them \u2014 give the user the link instead. ${NOTHING_WAS_OPENED}`,
              "open_public_outside_org",
            );
          case "failed":
            throw new ArtifactInputError(
              `Could not confirm the Artifact at ${h} (${w.err}). ${NOTHING_WAS_OPENED}`,
              `open_${w.errorCode}`,
            );
        }
      let { title } = w;
      let S = liveState.accountEpoch === p.account && liveState.conversationEpoch === p.conversation;
      if (S) {
        let artifactFrame = openArtifactFrame(s, target, title);
        autoOpenArtifactPreview(
          s,
          derivePublishContext(s).hasInteractiveUI && s.agentId === undefined,
          {
            slug: target.slug,
            url: h,
          },
          artifactFrame.alreadyShown && !artifactFrame.lastOpenFailed,
          (T) => markFrameOpenOutcome(s, artifactFrame.rowKey, T),
        );
      }
      logFeatureOk("artifact_open", {
        same_scope: S,
      });
      return {
        data: {
          opened: true,
          url: h,
          artifact_id: target.slug,
          ...(title !== undefined && {
            title,
          }),
          ...ownedField(S ? w.owned : undefined),
        },
      };
    }
    return throwUnroutedArtifactAction("open.call", n);
  },
};
var ARTIFACT_OPEN_RESULT_RENDERERS = {
  opened(e, toolUseId) {
    if ("opened" in e)
      return {
        tool_use_id: toolUseId,
        type: "tool_result",
        content: `Opened the Artifact at ${canonicalArtifactTargetFor(e.url, "(unrecognized address)")} for the user. Nothing was published or changed.`,
      };
    return throwUnroutedArtifactAction("open.opened", e);
  },
};
export { ARTIFACT_OPEN_ACTION_HANDLER, ARTIFACT_OPEN_RESULT_RENDERERS };
