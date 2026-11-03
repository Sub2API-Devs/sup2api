/**
 * tools/ArtifactTool/actions/pin.ts
 *
 * 2.1.316 新增：pin 动作
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-8wvtd8sr.js (7)
 * attribution: placement 7
 */
import { getLiveState } from "../../../services/liveReplica/liveReplica.js";
import {
  probeAnswered,
  getShareEntry,
  foldShareProbe,
  ownedByUser,
  isSomeoneElses,
  ownershipClassifierMark,
  otherOrgClassifierMark,
} from "../../../services/artifacts/shareEntries.js";
import { probeArtifactAccess } from "../../../services/artifacts/audience.js";
import { artifactCardTitleFor } from "../permissions/ownershipConsent.js";
import {
  CONSENT_ASK_TAG,
  PLAN_CONSENT_ASK_TAG,
  ARTIFACT_DISPLAY_TARGET_TAG,
  consentPin,
  consentTargetChanged,
  carriesAnyDecisionPin,
} from "../permissions/consentStamps.js";
import { parseArtifactUrl, ArtifactInputError } from "../constants.js";
import { warmShareEntry } from "../../../services/artifacts/shareEntryWarm.js";
import {
  denyOtherOrgArtifact,
  hasPinAction,
  parseArtifactUrlOrThrow,
} from "../permissions/artifactPermissionRules.js";
import { isStrictHumanTurn } from "../../../utils/turnOrigin.js";
import { PLAN_MODE_KEEPS_FLAG_OFF_WRITE_ASKS } from "../artifactAccessClasses.js";
import {
  getToolPermissionContext,
  planConsentMustDeny,
  consentAskCanReachUser,
} from "../../../utils/permissions/toolPermissionContext.js";
import { coworkConsentMustDeny } from "../permissions/readConsent.js";
import {
  artifactCardTitle,
  classifierArtifactTargetFor,
  canonicalArtifactTargetFor,
  safePublishUrl,
} from "../artifactUrls.js";
import { pinCardLede } from "../promptText.js";
import { parseSessionArtifactUrl } from "../../../services/artifacts/orgScope.js";
import { urlSubPathError } from "../permissions/dbWriteInputs.js";
import {
  isRelayUnavailableForPins,
  PIN_UNAVAILABLE_IN_CLOUD,
  setArtifactPinned,
} from "../../../services/artifacts/artifactShare.js";
import { throwUnroutedArtifactAction, sweepScalarField } from "../../../services/artifacts/artifactPeople.js";
import { pinSourceSchema } from "../../../services/artifacts/publishSource.js";

//@ chunk-8wvtd8sr.js:132361-132406 placement
function isPinAction(action) {
  return action === "pin" || action === "unpin";
}
//@ chunk-8wvtd8sr.js:132406-132458 placement
function isOwnPublishedArtifact(slug) {
  return getLiveState().ownPublishedSlugs.has(slug);
}
//@ chunk-8wvtd8sr.js:132458-132470 placement
var PIN_TITLE_FETCH_TIMEOUT_MS = 3000;
//@ chunk-8wvtd8sr.js:132470-132800 placement
async function fetchPinnedArtifactTitle(artifactUrlOrThrow, n) {
  if (probeAnswered(getShareEntry(artifactUrlOrThrow.slug), n.toolUseId)) return;
  let issuedAt = Date.now();
  let r = await probeArtifactAccess(
    artifactUrlOrThrow,
    AbortSignal.any([n.abortController.signal, AbortSignal.timeout(PIN_TITLE_FETCH_TIMEOUT_MS)]),
    n.credentials,
  ).catch(() => null);
  if (r === null || r.err !== null) return;
  foldShareProbe(artifactUrlOrThrow.slug, r, {
    consumedByCheck: false,
    toolUseId: n.toolUseId,
    issuedAt,
    debugLabel: "pin",
  });
  return artifactCardTitleFor(artifactUrlOrThrow, n).title;
}
//@ chunk-8wvtd8sr.js:132800-132958 placement = validateSafeCommandSubstitution (0.388)
function allowPinAction(e, reason, s) {
  return {
    behavior: "allow",
    updatedInput: {
      ...e,
      [CONSENT_ASK_TAG]: false,
      [PLAN_CONSENT_ASK_TAG]: false,
      [ARTIFACT_DISPLAY_TARGET_TAG]: undefined,
      ...(s !== undefined && consentPin("pin", s)),
    },
    decisionReason: {
      type: "other",
      reason,
    },
  };
}
//@ chunk-8wvtd8sr.js:132958-136752 placement
/**
 * （切分错误，Artifact 工具）pin/unpin 动作处理器：校验只带 url、权限（自己发布的/自己的直接允许，别人的需确认）、调用 pin 接口并返回标题。
 */
var ARTIFACT_PIN_ACTION_HANDLER = {
  actions: ["pin", "unpin"],
  async checkPermissions(e, n, s) {
    if (n.action === "unpin")
      return allowPinAction(n, "Removing an artifact from the user's own pinned list");
    let r = typeof n.url === "string" ? parseArtifactUrl(n.url) : null;
    if (r === null)
      return {
        behavior: "deny",
        message:
          'This is not an artifact url Claude can pin. Use the artifact url from the publish result or action "list".',
        decisionReason: {
          type: "safetyCheck",
          reason: "Unparseable artifact url \u2014 the pin cannot be addressed",
          classifierApprovable: false,
        },
      };
    if (isOwnPublishedArtifact(r.slug))
      return allowPinAction(n, "Pinning an artifact this session published", r);
    await warmShareEntry(r, s, "pin");
    let h = denyOtherOrgArtifact(r, "Nothing was pinned");
    if (h !== null) return h;
    let shareEntry = getShareEntry(r.slug);
    if (ownedByUser(shareEntry)) return allowPinAction(n, "Pinning the user's own artifact", r);
    if (
      isStrictHumanTurn(s.messages) &&
      !(PLAN_MODE_KEEPS_FLAG_OFF_WRITE_ASKS && getToolPermissionContext(s).mode === "plan")
    )
      return {
        behavior: "allow",
        updatedInput: {
          ...n,
          [CONSENT_ASK_TAG]: false,
          [PLAN_CONSENT_ASK_TAG]: false,
          [ARTIFACT_DISPLAY_TARGET_TAG]: artifactCardTitleFor(r, s),
          ...consentPin("pin", r),
        },
        decisionReason: {
          type: "other",
          reason: "Pinning someone else's artifact to the user's own list",
        },
      };
    if (planConsentMustDeny(s) || coworkConsentMustDeny(s))
      return {
        behavior: "deny",
        message:
          "Pinning an artifact the user did not make here needs their OK, and no one can answer the prompt in this session \u2014 tell the user they can pin it from the artifact's menu; do not retry here.",
        decisionReason: {
          type: "safetyCheck",
          reason: "Pinning someone else's artifact requires a live consent surface",
          classifierApprovable: false,
        },
      };
    let p = artifactCardTitleFor(r, s);
    let w = artifactCardTitle(p.title);
    let A = pinCardLede(w ? `"${w}"` : p.url);
    let S = isSomeoneElses(shareEntry) ? " (someone else's artifact)" : " (ownership couldn't be confirmed)";
    return {
      behavior: "ask",
      message: A,
      updatedInput: {
        ...n,
        [CONSENT_ASK_TAG]: consentAskCanReachUser(s),
        [PLAN_CONSENT_ASK_TAG]: getToolPermissionContext(s).mode === "plan",
        [ARTIFACT_DISPLAY_TARGET_TAG]: p,
        ...consentPin("pin", r),
      },
      suppressAlwaysAllowRule: true,
      decisionReason: {
        type: "other",
        reason: `${A}${S}`,
      },
      localDisplayOnly: true,
    };
  },
  async validateInput(e, n) {
    let { action, url } = n;
    let filtered = Object.keys(n).filter((key) => key !== "action" && key !== "url" && n[key] !== undefined);
    if (filtered.length > 0)
      return {
        result: false,
        message: `action "${action}" takes only \`url\` \u2014 remove ${filtered.join(", ")}.`,
        errorCode: 8,
      };
    if (url === undefined)
      return {
        result: false,
        message: `action "${action}" requires \`url\` \u2014 the artifact's claude.ai URL (the publish result has it; action: "list" shows earlier ones).`,
        errorCode: 7,
      };
    let sessionArtifactUrl = parseSessionArtifactUrl(url);
    if (!sessionArtifactUrl.ok)
      return {
        result: false,
        message: sessionArtifactUrl.message,
        errorCode: sessionArtifactUrl.errorCode,
      };
    let p = urlSubPathError(url, "; a pin names the whole artifact");
    if (p !== undefined) return p;
    if (isRelayUnavailableForPins())
      return {
        result: false,
        message: PIN_UNAVAILABLE_IN_CLOUD,
        errorCode: 8,
      };
    return {
      result: true,
    };
  },
  async call(e, n, s) {
    if (!isPinAction(n.action)) return throwUnroutedArtifactAction("pin.call", n);
    if (!hasPinAction())
      throw new ArtifactInputError(`action "${n.action}" is not available in this session`, "pin_schema_off");
    let artifactUrlOrThrow = parseArtifactUrlOrThrow(n.url);
    let h = n.action === "pin";
    if (h ? consentTargetChanged(n, "pin", artifactUrlOrThrow.slug) : carriesAnyDecisionPin(n))
      throw new ArtifactInputError(
        `\`action\` or \`url\` no longer names the ${h ? "pin" : "unpin"} that was approved \u2014 nothing was changed; retry so it is checked again`,
        "pin_target_changed",
      );
    let y = await setArtifactPinned(artifactUrlOrThrow.slug, h, s.credentials, {
      source: "tool",
      signal: s.abortController.signal,
    });
    if (y.err !== null) throw new ArtifactInputError(y.err, `pin_${y.reason}`);
    let p = artifactCardTitleFor(artifactUrlOrThrow, s);
    let w = p.title ?? (await fetchPinnedArtifactTitle(artifactUrlOrThrow, s));
    return {
      data: {
        pin: {
          action: n.action,
          url: p.url,
          pinned: h,
          ...(w !== undefined && {
            title: w,
          }),
        },
      },
    };
  },
  toAutoClassifierInput(e) {
    let n = typeof e?.url === "string" ? parseArtifactUrl(e.url) : null;
    let s = n !== null ? getShareEntry(n.slug) : undefined;
    let r = classifierArtifactTargetFor(e?.url, "(no artifact url)");
    return e?.action === "unpin"
      ? `remove an artifact from the user's own pinned list (private to the user, reversible)${ownershipClassifierMark(s)}${otherOrgClassifierMark(s)} \u2192 ${r}`
      : `add an artifact to the user's own pinned list in their claude.ai sidebar (private to the user, reversible; changes nothing about who can see it)${ownershipClassifierMark(s)}${otherOrgClassifierMark(s)} \u2192 ${r}`;
  },
  async description(e, n) {
    let s = typeof n?.url === "string" ? parseArtifactUrl(n.url) : null;
    let r = artifactCardTitle(s !== null ? getShareEntry(s.slug)?.title : undefined);
    let h = r ? `"${r}"` : canonicalArtifactTargetFor(n?.url, "(unrecognized address)");
    return n?.action === "unpin"
      ? `Remove ${h} from the user's pinned artifacts`
      : `Pin ${h} to the user's sidebar`;
  },
  getToolUseSummary(e) {
    return e?.action === "unpin"
      ? "remove an artifact from the user's pinned list"
      : "pin an artifact to the user's sidebar";
  },
};
//@ chunk-8wvtd8sr.js:136752-137407 placement
/**
 * 把 pin/unpin 动作结果转换成 tool_result：记录不可读时提示用 list 查看当前 pin 状态，否则说明已 pin 或取消 pin 的 Artifact 标题与 url。
 */
function mapPinResult(e, toolUseId) {
  if (!("pin" in e)) return throwUnroutedArtifactAction("pin.mapResult", e);
  if (!pinSourceSchema().safeParse(e).success)
    return {
      tool_use_id: toolUseId,
      type: "tool_result",
      content:
        'This record of a pin or unpin is unreadable \u2014 action "list" shows which artifacts are pinned now.',
    };
  let { pinned, url, title } = e.pin;
  let titleSuffix = typeof title === "string" && title !== "" ? ` "${sweepScalarField(title, 300)}"` : "";
  return {
    tool_use_id: toolUseId,
    type: "tool_result",
    content: pinned
      ? `Pinned the artifact${titleSuffix} (${safePublishUrl(url)}) to the user's sidebar on claude.ai; it shows there the next time the sidebar loads. Unpin it with action "unpin" if the user changes their mind.`
      : `Unpinned the artifact${titleSuffix} (${safePublishUrl(url)}); it no longer appears in the user's pinned list.`,
  };
}
export { ARTIFACT_PIN_ACTION_HANDLER, mapPinResult };
