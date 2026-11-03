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
var OPEN_UNAVAILABLE_MESSAGE = "open is not available in this session.",
  So = "Nothing was opened.",
  Zu = {
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
              classifierApprovable: !1,
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
        if (!hasOpenAction()) return { result: !1, message: OPEN_UNAVAILABLE_MESSAGE, errorCode: 8 };
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
        let r = parseArtifactUrlOrThrow(n.url),
          h = artifactViewerUrlFor(r),
          y = getLiveState(),
          p = { account: y.accountEpoch, conversation: y.conversationEpoch },
          w = await probeArtifactForOpen(r, "artifact_open", s.abortController.signal, s.credentials);
        if (!w.ok)
          switch (w.reason) {
            case "never_published":
              throw new ArtifactInputError(
                `Nothing has been published at ${h} yet, so there is no page to open. ${So}`,
                "open_not_found",
              );
            case "not_found":
              throw new ArtifactInputError(
                `No Artifact at ${h} that the user can see \u2014 it may have been deleted, or it has not been shared with them. ${So}`,
                "open_not_found",
              );
            case "other_org":
              throw new ArtifactInputError(`${h}: ${w.err}. ${So}`, "open_other_org");
            case "public_outside_org":
              throw (
                logFeatureBad("artifact_open", "public_outside_org"),
                new ArtifactInputError(
                  `${h} is a public Artifact from outside the user's organization, and open shows only artifacts in their organization or shared with them \u2014 give the user the link instead. ${So}`,
                  "open_public_outside_org",
                )
              );
            case "failed":
              throw new ArtifactInputError(
                `Could not confirm the Artifact at ${h} (${w.err}). ${So}`,
                `open_${w.errorCode}`,
              );
          }
        let { title: title } = w,
          S = y.accountEpoch === p.account && y.conversationEpoch === p.conversation;
        if (S) {
          let R = openArtifactFrame(s, r, title);
          autoOpenArtifactPreview(
            s,
            derivePublishContext(s).hasInteractiveUI && s.agentId === void 0,
            { slug: r.slug, url: h },
            R.alreadyShown && !R.lastOpenFailed,
            (T) => markFrameOpenOutcome(s, R.rowKey, T),
          );
        }
        return (
          logFeatureOk("artifact_open", { same_scope: S }),
          {
            data: {
              opened: !0,
              url: h,
              artifact_id: r.slug,
              ...(title !== void 0 && { title: title }),
              ...ownedField(S ? w.owned : void 0),
            },
          }
        );
      }
      return throwUnroutedArtifactAction("open.call", n);
    },
  },
  ef = {
    opened(e, n) {
      if ("opened" in e)
        return {
          tool_use_id: n,
          type: "tool_result",
          content: `Opened the Artifact at ${canonicalArtifactTargetFor(e.url, "(unrecognized address)")} for the user. Nothing was published or changed.`,
        };
      return throwUnroutedArtifactAction("open.opened", e);
    },
  };

export { Zu, ef };
