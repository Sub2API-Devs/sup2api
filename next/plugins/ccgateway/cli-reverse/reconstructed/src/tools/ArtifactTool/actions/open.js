/**
 * tools/ArtifactTool/actions/open.ts
 *
 * 2.1.316 新增：open 动作
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * new in 2.1.318 (2.1.88 has no file at this path)
 * pieces: chunk-xzmy9dn4.js (1)
 * attribution: placement 1
 * (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.
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

//@ chunk-xzmy9dn4.js:130418-133218 placement
/**
 * open 动作：不可用提示、动作处理器与结果渲染。
 */
var OPEN_UNAVAILABLE_MESSAGE = "open is not available in this session.";
var NOTHING_WAS_OPENED = "Nothing was opened.";
var ARTIFACT_OPEN_ACTION_HANDLER = {
  actions: ["open"],
  async checkPermissions(tool, input) {
    if (input.action === "open") {
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
        updatedInput: input,
        decisionReason: {
          type: "other",
          reason: "Showing the user an existing artifact is a read-only action",
        },
      };
    }
    return throwUnroutedArtifactAction("open.checkPermissions", input);
  },
  async validateInput(tool, input) {
    if (input.action === "open") {
      if (!hasOpenAction())
        return {
          result: false,
          message: OPEN_UNAVAILABLE_MESSAGE,
          errorCode: 8,
        };
      return validateArtifactPathInput("open", input, input.url);
    }
    return throwUnroutedArtifactAction("open.validateInput", input);
  },
  toAutoClassifierInput(input) {
    if (input?.action === "open")
      return `show the user artifact \u2192 ${classifierArtifactTargetFor(input.url, "(no artifact url)")} (read-only, changes nothing)`;
    return throwUnroutedArtifactAction("open.toAutoClassifierInput", input);
  },
  async description(tool, input) {
    if (input?.action === "open")
      return `Show the user the artifact ${canonicalArtifactTargetFor(input.url, "(no artifact url)")} \u2014 opens it where they view artifacts; read-only.`;
    return throwUnroutedArtifactAction("open.description", input);
  },
  getToolUseSummary(input) {
    if (input?.action === "open") return "open artifact for the user (read-only)";
    return throwUnroutedArtifactAction("open.getToolUseSummary", input);
  },
  async call(tool, input, context) {
    if (input.action === "open") {
      if (!hasOpenAction()) throw new ArtifactInputError(OPEN_UNAVAILABLE_MESSAGE, "open_gate_closed");
      let target = parseArtifactUrlOrThrow(input.url);
      let viewerUrl = artifactViewerUrlFor(target);
      let liveState = getLiveState();
      let epochs = {
        account: liveState.accountEpoch,
        conversation: liveState.conversationEpoch,
      };
      let probe = await probeArtifactForOpen(
        target,
        "artifact_open",
        context.abortController.signal,
        context.credentials,
      );
      if (!probe.ok)
        switch (probe.reason) {
          case "never_published":
            throw new ArtifactInputError(
              `Nothing has been published at ${viewerUrl} yet, so there is no page to open. ${NOTHING_WAS_OPENED}`,
              "open_not_found",
            );
          case "not_found":
            throw new ArtifactInputError(
              `No Artifact at ${viewerUrl} that the user can see \u2014 it may have been deleted, or it has not been shared with them. ${NOTHING_WAS_OPENED}`,
              "open_not_found",
            );
          case "other_org":
            throw new ArtifactInputError(
              `${viewerUrl}: ${probe.err}. ${NOTHING_WAS_OPENED}`,
              "open_other_org",
            );
          case "public_outside_org":
            logFeatureBad("artifact_open", "public_outside_org");
            throw new ArtifactInputError(
              `${viewerUrl} is a public Artifact from outside the user's organization, and open shows only artifacts in their organization or shared with them \u2014 give the user the link instead. ${NOTHING_WAS_OPENED}`,
              "open_public_outside_org",
            );
          case "failed":
            throw new ArtifactInputError(
              `Could not confirm the Artifact at ${viewerUrl} (${probe.err}). ${NOTHING_WAS_OPENED}`,
              `open_${probe.errorCode}`,
            );
        }
      let { title } = probe;
      let sameScope =
        liveState.accountEpoch === epochs.account && liveState.conversationEpoch === epochs.conversation;
      if (sameScope) {
        let artifactFrame = openArtifactFrame(context, target, title);
        autoOpenArtifactPreview(
          context,
          derivePublishContext(context).hasInteractiveUI && context.agentId === undefined,
          {
            slug: target.slug,
            url: viewerUrl,
          },
          artifactFrame.alreadyShown && !artifactFrame.lastOpenFailed,
          (succeeded) => markFrameOpenOutcome(context, artifactFrame.rowKey, succeeded),
        );
      }
      logFeatureOk("artifact_open", {
        same_scope: sameScope,
      });
      return {
        data: {
          opened: true,
          url: viewerUrl,
          artifact_id: target.slug,
          ...(title !== undefined && {
            title,
          }),
          ...ownedField(sameScope ? probe.owned : undefined),
        },
      };
    }
    return throwUnroutedArtifactAction("open.call", input);
  },
};
var ARTIFACT_OPEN_RESULT_RENDERERS = {
  opened(result, toolUseId) {
    if ("opened" in result)
      return {
        tool_use_id: toolUseId,
        type: "tool_result",
        content: `Opened the Artifact at ${canonicalArtifactTargetFor(result.url, "(unrecognized address)")} for the user. Nothing was published or changed.`,
      };
    return throwUnroutedArtifactAction("open.opened", result);
  },
};
export { ARTIFACT_OPEN_ACTION_HANDLER, ARTIFACT_OPEN_RESULT_RENDERERS };
