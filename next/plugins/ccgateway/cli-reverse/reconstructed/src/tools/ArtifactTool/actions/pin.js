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
async function fetchPinnedArtifactTitle(artifactUrlOrThrow, context) {
  if (probeAnswered(getShareEntry(artifactUrlOrThrow.slug), context.toolUseId)) return;
  let issuedAt = Date.now();
  let probe = await probeArtifactAccess(
    artifactUrlOrThrow,
    AbortSignal.any([context.abortController.signal, AbortSignal.timeout(PIN_TITLE_FETCH_TIMEOUT_MS)]),
    context.credentials,
  ).catch(() => null);
  if (probe === null || probe.err !== null) return;
  foldShareProbe(artifactUrlOrThrow.slug, probe, {
    consumedByCheck: false,
    toolUseId: context.toolUseId,
    issuedAt,
    debugLabel: "pin",
  });
  return artifactCardTitleFor(artifactUrlOrThrow, context).title;
}
//@ chunk-8wvtd8sr.js:132800-132958 placement = validateSafeCommandSubstitution (0.388)
function allowPinAction(input, reason, target) {
  return {
    behavior: "allow",
    updatedInput: {
      ...input,
      [CONSENT_ASK_TAG]: false,
      [PLAN_CONSENT_ASK_TAG]: false,
      [ARTIFACT_DISPLAY_TARGET_TAG]: undefined,
      ...(target !== undefined && consentPin("pin", target)),
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
  async checkPermissions(tool, input, context) {
    if (input.action === "unpin")
      return allowPinAction(input, "Removing an artifact from the user's own pinned list");
    let artifactUrl = typeof input.url === "string" ? parseArtifactUrl(input.url) : null;
    if (artifactUrl === null)
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
    if (isOwnPublishedArtifact(artifactUrl.slug))
      return allowPinAction(input, "Pinning an artifact this session published", artifactUrl);
    await warmShareEntry(artifactUrl, context, "pin");
    let outsideOrgDenial = denyOtherOrgArtifact(artifactUrl, "Nothing was pinned");
    if (outsideOrgDenial !== null) return outsideOrgDenial;
    let shareEntry = getShareEntry(artifactUrl.slug);
    if (ownedByUser(shareEntry)) return allowPinAction(input, "Pinning the user's own artifact", artifactUrl);
    if (
      isStrictHumanTurn(context.messages) &&
      !(PLAN_MODE_KEEPS_FLAG_OFF_WRITE_ASKS && getToolPermissionContext(context).mode === "plan")
    )
      return {
        behavior: "allow",
        updatedInput: {
          ...input,
          [CONSENT_ASK_TAG]: false,
          [PLAN_CONSENT_ASK_TAG]: false,
          [ARTIFACT_DISPLAY_TARGET_TAG]: artifactCardTitleFor(artifactUrl, context),
          ...consentPin("pin", artifactUrl),
        },
        decisionReason: {
          type: "other",
          reason: "Pinning someone else's artifact to the user's own list",
        },
      };
    if (planConsentMustDeny(context) || coworkConsentMustDeny(context))
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
    let cardTitleInfo = artifactCardTitleFor(artifactUrl, context);
    let cardTitleText = artifactCardTitle(cardTitleInfo.title);
    let lede = pinCardLede(cardTitleText ? `"${cardTitleText}"` : cardTitleInfo.url);
    let ownershipNote = isSomeoneElses(shareEntry)
      ? " (someone else's artifact)"
      : " (ownership couldn't be confirmed)";
    return {
      behavior: "ask",
      message: lede,
      updatedInput: {
        ...input,
        [CONSENT_ASK_TAG]: consentAskCanReachUser(context),
        [PLAN_CONSENT_ASK_TAG]: getToolPermissionContext(context).mode === "plan",
        [ARTIFACT_DISPLAY_TARGET_TAG]: cardTitleInfo,
        ...consentPin("pin", artifactUrl),
      },
      suppressAlwaysAllowRule: true,
      decisionReason: {
        type: "other",
        reason: `${lede}${ownershipNote}`,
      },
      localDisplayOnly: true,
    };
  },
  async validateInput(tool, input) {
    let { action, url } = input;
    let filtered = Object.keys(input).filter(
      (key) => key !== "action" && key !== "url" && input[key] !== undefined,
    );
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
    let urlError = urlSubPathError(url, "; a pin names the whole artifact");
    if (urlError !== undefined) return urlError;
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
  async call(tool, input, context) {
    if (!isPinAction(input.action)) return throwUnroutedArtifactAction("pin.call", input);
    if (!hasPinAction())
      throw new ArtifactInputError(
        `action "${input.action}" is not available in this session`,
        "pin_schema_off",
      );
    let artifactUrlOrThrow = parseArtifactUrlOrThrow(input.url);
    let shouldPin = input.action === "pin";
    if (
      shouldPin ? consentTargetChanged(input, "pin", artifactUrlOrThrow.slug) : carriesAnyDecisionPin(input)
    )
      throw new ArtifactInputError(
        `\`action\` or \`url\` no longer names the ${shouldPin ? "pin" : "unpin"} that was approved \u2014 nothing was changed; retry so it is checked again`,
        "pin_target_changed",
      );
    let pinResult = await setArtifactPinned(artifactUrlOrThrow.slug, shouldPin, context.credentials, {
      source: "tool",
      signal: context.abortController.signal,
    });
    if (pinResult.err !== null) throw new ArtifactInputError(pinResult.err, `pin_${pinResult.reason}`);
    let cardTitleInfo = artifactCardTitleFor(artifactUrlOrThrow, context);
    let title = cardTitleInfo.title ?? (await fetchPinnedArtifactTitle(artifactUrlOrThrow, context));
    return {
      data: {
        pin: {
          action: input.action,
          url: cardTitleInfo.url,
          pinned: shouldPin,
          ...(title !== undefined && {
            title,
          }),
        },
      },
    };
  },
  toAutoClassifierInput(input) {
    let artifactUrl = typeof input?.url === "string" ? parseArtifactUrl(input.url) : null;
    let shareEntry = artifactUrl !== null ? getShareEntry(artifactUrl.slug) : undefined;
    let target = classifierArtifactTargetFor(input?.url, "(no artifact url)");
    return input?.action === "unpin"
      ? `remove an artifact from the user's own pinned list (private to the user, reversible)${ownershipClassifierMark(shareEntry)}${otherOrgClassifierMark(shareEntry)} \u2192 ${target}`
      : `add an artifact to the user's own pinned list in their claude.ai sidebar (private to the user, reversible; changes nothing about who can see it)${ownershipClassifierMark(shareEntry)}${otherOrgClassifierMark(shareEntry)} \u2192 ${target}`;
  },
  async description(tool, input) {
    let artifactUrl = typeof input?.url === "string" ? parseArtifactUrl(input.url) : null;
    let cardTitle = artifactCardTitle(
      artifactUrl !== null ? getShareEntry(artifactUrl.slug)?.title : undefined,
    );
    let titleText = cardTitle
      ? `"${cardTitle}"`
      : canonicalArtifactTargetFor(input?.url, "(unrecognized address)");
    return input?.action === "unpin"
      ? `Remove ${titleText} from the user's pinned artifacts`
      : `Pin ${titleText} to the user's sidebar`;
  },
  getToolUseSummary(input) {
    return input?.action === "unpin"
      ? "remove an artifact from the user's pinned list"
      : "pin an artifact to the user's sidebar";
  },
};
//@ chunk-8wvtd8sr.js:136752-137407 placement
/**
 * 把 pin/unpin 动作结果转换成 tool_result：记录不可读时提示用 list 查看当前 pin 状态，否则说明已 pin 或取消 pin 的 Artifact 标题与 url。
 */
function mapPinResult(result, toolUseId) {
  if (!("pin" in result)) return throwUnroutedArtifactAction("pin.mapResult", result);
  if (!pinSourceSchema().safeParse(result).success)
    return {
      tool_use_id: toolUseId,
      type: "tool_result",
      content:
        'This record of a pin or unpin is unreadable \u2014 action "list" shows which artifacts are pinned now.',
    };
  let { pinned, url, title } = result.pin;
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
