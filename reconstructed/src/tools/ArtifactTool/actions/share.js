/**
 * tools/ArtifactTool/actions/share.ts
 *
 * 2.1.316 新增：share 动作
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-8wvtd8sr.js (10)
 * attribution: placement 10
 */
import { readUntrustedArrayOrUndefined } from "../../../utils/untrustedArray.js";
import {
  isOrgReadMode,
  isOrgAccessMode,
  normalizeShareEmail,
  MAX_SHARE_TARGETS,
  isRelayUnavailableForSharing,
  CLOUD_SHARE_UNAVAILABLE,
  ORG_VIEW_ONLY_UNSUPPORTED,
  shareArtifact,
} from "../../../services/artifacts/artifactShare.js";
import { uniq } from "../../../utils/collections.js";
import {
  spacedFromClosingQuote,
  withSchemeMarked,
  artifactViewerUrlFor,
  classifierArtifactTargetFor,
  sweepMarkerLookalikes,
  artifactCardTitle,
  canonicalArtifactTargetFor,
  safePublishUrl,
} from "../artifactUrls.js";
import {
  foldForDecisionSurface,
  consentPin,
  ARTIFACT_DISPLAY_TARGET_TAG,
  consentTargetChanged,
  consentPinMatches,
  repliesAskAnsweredByOther,
} from "../permissions/consentStamps.js";
import { plural, stripSuffix, stripPrefix } from "../../../utils/stringUtils.js";
import {
  entryAudience,
  getShareEntry,
  ownershipClassifierMark,
  otherOrgClassifierMark,
  ownershipTag,
  recordShareEcho,
  deriveShareStatus,
} from "../../../services/artifacts/shareEntries.js";
import { throwUnroutedArtifactAction, sweepScalarField } from "../../../services/artifacts/artifactPeople.js";
import {
  hasShareAction,
  artifactSurfaceRefusal,
  denyOtherOrgArtifact,
  parseArtifactUrlOrThrow,
} from "../permissions/artifactPermissionRules.js";
import { getToolPermissionContext } from "../../../utils/permissions/toolPermissionContext.js";
import { parseArtifactUrl, ArtifactInputError } from "../constants.js";
import { warmShareEntry } from "../../../services/artifacts/shareEntryWarm.js";
import { getGatewayAccountInfoAsync } from "../../../utils/gatewayCredential.js";
import { artifactCardTitleFor } from "../permissions/ownershipConsent.js";
import { MAX_SHARE_PEOPLE_HINTS } from "../../../services/artifacts/artifactToolSchema.js";
import { decideByClass, classFactsFor } from "../artifactAccessClasses.js";
import { classifyArtifactConsent } from "../../../services/artifacts/consentClasses.js";
import { urlSubPathError } from "../permissions/dbWriteInputs.js";
import { parseSessionArtifactUrl } from "../../../services/artifacts/orgScope.js";
import { logFeatureSad } from "../../../services/analytics/featureTelemetry.js";
import { sharedSourceSchema } from "../../../services/artifacts/publishSource.js";

//@ chunk-8wvtd8sr.js:235149-235320 placement
var SHARE_UNAVAILABLE_MESSAGE = "share is not available in this session.";
var NOTHING_SHARED = "Nothing was shared.";
var SHARE_MENU_HINT =
  "the person can share it themselves from the Share menu on the artifact's page on claude.ai.";
//@ chunk-8wvtd8sr.js:235320-235582 placement
/**
 * 读取 share 动作输入：共享模式、人员列表、访问级别，以及访问级别是否无法识别。
 */
function readShareInput(e) {
  let n = Reflect.get(e, "mode");
  let s = Reflect.get(e, "access");
  let r = [];
  for (let h of readUntrustedArrayOrUndefined(Reflect.get(e, "people")) ?? [])
    if (typeof h === "string" && h !== "") r.push(h);
  return {
    mode: isOrgReadMode(n) ? n : undefined,
    people: r,
    access: isOrgAccessMode(s) ? s : undefined,
    accessUnrecognised: s !== undefined && !isOrgAccessMode(s),
  };
}
//@ chunk-8wvtd8sr.js:235582-237511 placement
/**
 * 从分享卡片确认后的输入解析分享授权：必须来自卡片（有 user_uuids）、mode 为 org/people、org 不能附带人员、access 合法（people 必须指定 view/comment）、
 * 人员 id 合法且不超过上限；返回 {ok:true, grant:{mode, access, userUuids}} 或 {ok:false, code, message}。
 */
function resolveShareGrant(input) {
  let userUuids = readUntrustedArrayOrUndefined(Reflect.get(input, "user_uuids"));
  if (userUuids === undefined)
    return {
      ok: false,
      code: "share_no_card",
      message: `Nothing was shared: this approval did not come from the share card, where the person picks who gets access. Do not retry the share in this session; ${SHARE_MENU_HINT}`,
    };
  let { mode, access, accessUnrecognised } = readShareInput(input);
  if (mode === undefined)
    return {
      ok: false,
      code: "share_missing_mode",
      message:
        'The confirmed share names no recognised `mode` ("org" or "people"), so nothing was shared; retry so the card is shown again.',
    };
  if (mode === "org" && userUuids.length > 0)
    return {
      ok: false,
      code: "share_org_with_people",
      message: `Nothing was shared: the answer from the share card chose the whole organization but also listed specific people, so it is unclear who the person meant. Retry the same share once so the card is shown again; if this happens again, ${SHARE_MENU_HINT}`,
    };
  if (accessUnrecognised)
    return {
      ok: false,
      code: "share_bad_access",
      message:
        'The confirmed share carries an `access` this build does not recognise (only "view" or "comment"), so nothing was shared rather than guess a tier; retry so the card is shown again.',
    };
  if (mode === "people" && access === undefined)
    return {
      ok: false,
      code: "share_missing_access",
      message:
        'The confirmed people share carries no `access` tier ("view" or "comment"), so nothing was shared rather than default to the wider one; retry so the card is shown again.',
    };
  let accountIds = [];
  for (let userUuid of userUuids) {
    let A = normalizeShareEmail(userUuid);
    if (A === null)
      return {
        ok: false,
        code: "share_people_invalid",
        message:
          "The host confirmed a person in a form this build cannot pass on (not an account id), so nothing was shared rather than leave someone out; the person can share from the Share menu on claude.ai.",
      };
    accountIds.push(A);
  }
  let uniqueIds = uniq(accountIds);
  if (uniqueIds.length > MAX_SHARE_TARGETS)
    return {
      ok: false,
      code: "share_people_too_many",
      message: `The card confirmed ${uniqueIds.length} people and one share names at most ${MAX_SHARE_TARGETS}, so nothing was shared rather than leave some out; share with the organization instead, or in smaller groups.`,
    };
  return {
    ok: true,
    grant: {
      mode,
      access: access ?? "comment",
      userUuids: uniqueIds,
    },
  };
}
//@ chunk-8wvtd8sr.js:237511-237570 placement
/**
 * 把 view/comment 访问级别转成人类可读标签。
 */
function shareAccessLabel(e) {
  return e === "view" ? "view only" : "can comment";
}
//@ chunk-8wvtd8sr.js:237570-237647 placement
/**
 * 把名称处理成可展示标签（去方案标记、压空白，空则 ?）。
 */
function sanitizedDisplayLabel(e, n) {
  return (
    spacedFromClosingQuote(withSchemeMarked(foldForDecisionSurface(e, n)).replace(/ {2,}/g, " ").trim()) ||
    "?"
  );
}
//@ chunk-8wvtd8sr.js:237647-237882 placement
/**
 * 描述共享对象中指名的人员（最多列 5 个，其余计数）。
 */
function describeNamedPeople(e) {
  if (e.length === 0) return "people it did not name";
  let joined = e
    .slice(0, 5)
    .map((r) => `"${sanitizedDisplayLabel(r, 60)}"`)
    .join(", ");
  let s = e.length > 5 ? ` and ${e.length - 5} more` : "";
  return `${e.length} ${plural(e.length, "person", "people")} it named (${joined}${s})`;
}
//@ chunk-8wvtd8sr.js:237882-238055 placement
function describeCurrentAudience(shareEntry) {
  if (shareEntry === undefined || shareEntry.probeFailed)
    return "its current audience could not be confirmed";
  return shareEntry.mode === "owner"
    ? "currently private"
    : `currently shared with ${entryAudience(shareEntry)}`;
}
//@ chunk-8wvtd8sr.js:238055-238194 placement
function describeShareTarget(mode, people, access, r) {
  if (mode === "org")
    return r ? `everyone at ${sanitizedDisplayLabel(r, 80)}` : "everyone in the person's organization";
  return `${describeNamedPeople(people)} (${shareAccessLabel(access)})`;
}
//@ chunk-8wvtd8sr.js:238194-247705 placement
var ARTIFACT_SHARE_ACTION_HANDLER = {
  actions: ["share"],
  async checkPermissions(e, n, s) {
    if (n.action !== "share") return throwUnroutedArtifactAction("share.checkPermissions", n);
    if (!hasShareAction())
      return {
        behavior: "deny",
        message: SHARE_UNAVAILABLE_MESSAGE,
        decisionReason: {
          type: "safetyCheck",
          reason: "Share gate closed at schema freeze",
          classifierApprovable: false,
        },
      };
    let r = () => {
      switch (getToolPermissionContext(s).mode === "dontAsk" ? "no_surface" : artifactSurfaceRefusal(s)) {
        case "plan":
          return {
            behavior: "deny",
            message:
              "Artifacts cannot be shared from plan mode. Finish planning first; do not retry this share while in plan mode.",
            decisionReason: {
              type: "safetyCheck",
              reason: "Plan mode does not share Artifacts",
              classifierApprovable: false,
            },
          };
        case "cowork_no_surface":
        case "no_surface":
          return {
            behavior: "deny",
            message: `Sharing an Artifact needs the person's confirmation on a card, and no one can answer it in this session, so nothing was shared. Do not retry the share in this session; ${SHARE_MENU_HINT}`,
            decisionReason: {
              type: "safetyCheck",
              reason: "Artifact shares require a live human confirmation surface",
              classifierApprovable: false,
            },
          };
        case null:
          return null;
      }
    };
    let h = r();
    if (h !== null) return h;
    let y = typeof n.url === "string" ? parseArtifactUrl(n.url) : null;
    if (y === null)
      return {
        behavior: "deny",
        message: `This is not an Artifact url Claude can share. Use the Artifact's claude.ai link from the publish result or action "list".`,
        decisionReason: {
          type: "safetyCheck",
          reason: "Unparseable Artifact url \u2014 the share cannot be addressed or probed for ownership",
          classifierApprovable: false,
        },
      };
    if (isRelayUnavailableForSharing())
      return {
        behavior: "deny",
        message: CLOUD_SHARE_UNAVAILABLE,
        decisionReason: {
          type: "safetyCheck",
          reason: "This cloud session cannot share Artifacts right now",
          classifierApprovable: false,
        },
      };
    await warmShareEntry(y, s, "share");
    let p = denyOtherOrgArtifact(y, stripSuffix(NOTHING_SHARED, "."));
    if (p !== null) return p;
    let w = r();
    if (w !== null) return w;
    let shareEntry = getShareEntry(y.slug);
    let S = artifactViewerUrlFor(y);
    if (shareEntry !== undefined && !shareEntry.probeFailed && shareEntry.mode === "agent_scoped")
      return {
        behavior: "deny",
        message: `The Artifact at ${S} belongs to a channel's Claude, not a person, so its audience isn't managed this way. ${NOTHING_SHARED}`,
        decisionReason: {
          type: "safetyCheck",
          reason: "A Claude-owned Artifact is not shared through this action",
          classifierApprovable: false,
        },
      };
    let role = shareEntry?.probeFailed ? undefined : shareEntry?.role;
    if (role !== "owner") {
      let we = shareEntry?.probeFailed === true && shareEntry.probeErrorCode === "boot_404";
      let Ie =
        role !== undefined ||
        (shareEntry !== undefined && !shareEntry.probeFailed && shareEntry.mode === "public");
      return {
        behavior: "deny",
        message: we
          ? `There is no Artifact at ${S} \u2014 it may have been deleted, the link is wrong, or it isn't one the person can see. ${NOTHING_SHARED}`
          : Ie
            ? `The person can ${role === "writer" ? "edit" : role === "commenter" ? "comment on" : role === "reader" ? "read" : "view"} but does not own the Artifact at ${S}; only its owner can share it from here. ${NOTHING_SHARED} Tell the person to ask its owner${role === "writer" ? ", or to use the Share menu on claude.ai if their organization lets editors share" : ""}.`
            : `Couldn't confirm that the person owns the Artifact at ${S}, so nothing was shared. Retry once; if it still fails, ${SHARE_MENU_HINT}`,
        decisionReason: {
          type: "safetyCheck",
          reason: we
            ? "No Artifact at that url that the person can see"
            : Ie
              ? "Only an Artifact's owner can share it from chat"
              : "Artifact ownership could not be confirmed before a share",
          classifierApprovable: false,
        },
      };
    }
    let { mode, people, access, accessUnrecognised } = readShareInput(n);
    if (accessUnrecognised)
      return {
        behavior: "deny",
        message:
          '`access` must be "view" or "comment"; nothing was shared. Retry with one of those, or omit it.',
        decisionReason: {
          type: "safetyCheck",
          reason: "Unrecognised share access tier",
          classifierApprovable: false,
        },
      };
    if (shareEntry !== undefined && shareEntry.mode === "public")
      return {
        behavior: "deny",
        message: `The Artifact at ${S} is already public \u2014 anyone with the link can open it \u2014 so there is nothing more to share from here; give the person the link to pass along. ${NOTHING_SHARED}`,
        decisionReason: {
          type: "other",
          reason: "Artifact already reaches a wider audience than the share asks for",
        },
      };
    let organizationName = (await getGatewayAccountInfoAsync(s.credentials))?.organizationName ?? undefined;
    let x = artifactCardTitleFor(y, s);
    let q = describeShareTarget(mode, people, access, organizationName);
    let re = describeCurrentAudience(shareEntry);
    let mapped = people.slice(0, MAX_SHARE_PEOPLE_HINTS).map((person) => sanitizedDisplayLabel(person, 200));
    let input = {
      action: "share",
      url: artifactViewerUrlFor(y),
      ...(mode !== undefined && {
        mode,
      }),
      ...(mode === "people" && {
        access: access ?? "comment",
      }),
      ...(mapped.length > 0 && {
        people: mapped,
      }),
      ...consentPin("share", y),
      [ARTIFACT_DISPLAY_TARGET_TAG]: x,
    };
    return decideByClass({
      ruling: classifyArtifactConsent(classFactsFor("change_access", y, s)),
      input,
      context: s,
      slug: y.slug,
      display: x,
      action: "share",
      note: `Proposed: ${q}; ${re}. The card lets you change it.`,
    });
  },
  async validateInput(e, n) {
    if (n.action !== "share") return throwUnroutedArtifactAction("share.validateInput", n);
    if (!hasShareAction())
      return {
        result: false,
        message: SHARE_UNAVAILABLE_MESSAGE,
        errorCode: 8,
      };
    let s = ["action", "url", "mode", "people", "access"];
    let filtered = Object.keys(n).filter((key) => !s.includes(key) && Reflect.get(n, key) !== undefined);
    if (filtered.length > 0)
      return {
        result: false,
        message: `action "share" takes only \`url\`, \`mode\`, \`people\` and \`access\` \u2014 remove ${filtered.join(", ")}.${filtered.includes("user_uuids") ? " People are named in `people` as the person described them; the host resolves them, never the model." : ""}`,
        errorCode: 8,
      };
    if (n.url === undefined)
      return {
        result: false,
        message:
          'action "share" requires `url` \u2014 the artifact\'s claude.ai URL (the publish result has it; action "list" shows earlier ones).',
        errorCode: 7,
      };
    let h = urlSubPathError(n.url, "; a share names the whole artifact");
    if (h !== undefined) return h;
    let sessionArtifactUrl = parseSessionArtifactUrl(n.url);
    if (!sessionArtifactUrl.ok)
      return {
        result: false,
        message: sessionArtifactUrl.message,
        errorCode: sessionArtifactUrl.errorCode,
      };
    let p = Reflect.get(n, "mode");
    if (!isOrgReadMode(p))
      return {
        result: false,
        message:
          'action "share" requires `mode`: "org" (everyone in the person\'s organization) or "people" (named organization members, listed in `people`). Public sharing and people outside the organization are not available here \u2014 the person does that from the Share menu on claude.ai.',
        errorCode: 7,
      };
    let w = Reflect.get(n, "access");
    if (w !== undefined && !isOrgAccessMode(w))
      return {
        result: false,
        message:
          '`access` must be "view" or "comment" (the default); edit access is not granted through this action.',
        errorCode: 8,
      };
    let { people } = readShareInput(n);
    if (p === "people" && people.length === 0)
      return {
        result: false,
        message:
          'mode "people" requires `people` \u2014 the names or work emails of the organization members to share with, as the person described them (1 or more). For everyone in the organization use mode "org".',
        errorCode: 7,
      };
    if (p === "org" && people.length > 0)
      return {
        result: false,
        message:
          'mode "org" shares with everyone in the organization and takes no `people`; remove it, or use mode "people" to share with just those people.',
        errorCode: 8,
      };
    if (p === "org" && w === "view")
      return {
        result: false,
        message: ORG_VIEW_ONLY_UNSUPPORTED,
        errorCode: 8,
      };
    if (isRelayUnavailableForSharing())
      return {
        result: false,
        message: CLOUD_SHARE_UNAVAILABLE,
        errorCode: 8,
      };
    return {
      result: true,
    };
  },
  toAutoClassifierInput(e) {
    if (e?.action !== "share") return throwUnroutedArtifactAction("share.toAutoClassifierInput", e);
    let n = typeof e.url === "string" ? parseArtifactUrl(e.url) : null;
    let s = n !== null ? getShareEntry(n.slug) : undefined;
    let r = classifierArtifactTargetFor(e.url, "(no artifact url)");
    try {
      let { mode, people, access } = readShareInput(e);
      let w =
        mode === "org"
          ? "everyone in the user's organization"
          : mode === "people"
            ? describeNamedPeople(people.map(sweepMarkerLookalikes)).replace(/^(\d+ \w+) it named/, "$1")
            : "(no mode)";
      let A = mode === "people" ? `${shareAccessLabel(access)}; ` : "";
      return `change who can open an artifact: share with ${w} (${A}never public, never outside the organization; the user confirms on a card)${ownershipClassifierMark(s)}${otherOrgClassifierMark(s)} \u2192 ${r}`;
    } catch {
      return `change who can open an artifact${ownershipClassifierMark(s)}${otherOrgClassifierMark(s)} \u2192 ${r}`;
    }
  },
  async description(e, n) {
    if (n?.action !== "share") return throwUnroutedArtifactAction("share.description", n);
    let s = typeof n.url === "string" ? parseArtifactUrl(n.url) : null;
    let r = s !== null ? getShareEntry(s.slug) : undefined;
    let h = artifactCardTitle(r?.title);
    let y = h ? `"${h}"` : canonicalArtifactTargetFor(n.url, "(unrecognized address)");
    let { mode, people, access } = readShareInput(n);
    return `Share ${y}${ownershipTag(r)} with ${describeShareTarget(mode, people, access, undefined)} \u2014 the person confirms and may change the audience; never public`;
  },
  getToolUseSummary(e) {
    if (e?.action !== "share") return throwUnroutedArtifactAction("share.getToolUseSummary", e);
    let n = typeof e.url === "string" ? parseArtifactUrl(e.url) : null;
    let s = n !== null ? getShareEntry(n.slug) : undefined;
    let { mode, people, access } = readShareInput(e);
    return `share an artifact${ownershipTag(s)} with ${describeShareTarget(mode, people, access, undefined)}`;
  },
  async call(e, n, s) {
    if (n.action !== "share") return throwUnroutedArtifactAction("share.call", n);
    if (artifactSurfaceRefusal(s) !== null) {
      logFeatureSad("artifact_share", "consent_gone");
      throw new ArtifactInputError(
        `Sharing an Artifact needs the person's confirmation and this session no longer has a way to ask \u2014 nothing was shared; do not retry the share in this session. Instead, ${SHARE_MENU_HINT}`,
        "share_consent_gone",
      );
    }
    if (!hasShareAction()) throw new ArtifactInputError(SHARE_UNAVAILABLE_MESSAGE, "share_schema_off");
    let artifactUrlOrThrow = parseArtifactUrlOrThrow(n.url);
    if (consentTargetChanged(n, "share", artifactUrlOrThrow.slug)) {
      logFeatureSad("artifact_share", "target_changed");
      throw new ArtifactInputError(
        "`url` no longer names the Artifact whose share was confirmed \u2014 nothing was shared; retry so it is checked again.",
        "share_target_changed",
      );
    }
    if (!consentPinMatches(n, "share", artifactUrlOrThrow.slug)) {
      logFeatureSad("artifact_share", "unconfirmed");
      throw new ArtifactInputError(
        "This share was not confirmed by the person, so nothing was shared; retry so the confirmation card is shown.",
        "share_unconfirmed",
      );
    }
    if (repliesAskAnsweredByOther(s)) {
      logFeatureSad("artifact_share", "not_person");
      throw new ArtifactInputError(
        `Only the person can approve a share, and this one was answered by something else (a hook or rule), so nothing was shared; do not retry it here. ${SHARE_MENU_HINT}`,
        "share_not_person",
      );
    }
    let shareGrant = resolveShareGrant(n);
    if (!shareGrant.ok) {
      logFeatureSad("artifact_share", stripPrefix(shareGrant.code, "share_"));
      throw new ArtifactInputError(shareGrant.message, shareGrant.code);
    }
    let grant = shareGrant.grant;
    if (grant.mode === "people" && grant.userUuids.length === 0) {
      logFeatureSad("artifact_share", "people_unresolved");
      throw new ArtifactInputError(
        `No people were confirmed on the card, so nothing was shared. This host must resolve the people you name to organization members and the person picks them on the card; if it cannot, ${SHARE_MENU_HINT} Do not guess identifiers or retry with different names unless the person gives them.`,
        "share_people_unresolved",
      );
    }
    let gatewayAccountInfo = await getGatewayAccountInfoAsync(s.credentials);
    let w = await shareArtifact({
      slug: artifactUrlOrThrow.slug,
      org: gatewayAccountInfo?.organizationUuid,
      grant,
      toolUseId: s.toolUseId,
      credentials: s.credentials,
      signal: s.abortController.signal,
    });
    if (w.err !== null) throw new ArtifactInputError(w.err, `share_${w.reason}`);
    recordShareEcho(artifactUrlOrThrow.slug, deriveShareStatus(w.readMode, w.shared));
    let A = artifactCardTitleFor(artifactUrlOrThrow, s);
    return {
      data: {
        shared: {
          url: A.url,
          mode: w.mode,
          access: w.access,
          read_mode: w.readMode,
          added: w.added,
          ...(w.editors > 0 && {
            editors: w.editors,
          }),
          ...(w.unchanged && {
            unchanged: true,
          }),
          ...(typeof gatewayAccountInfo?.organizationName === "string" && {
            org_name: gatewayAccountInfo.organizationName,
          }),
          ...(A.title !== undefined && {
            title: A.title,
          }),
        },
      },
    };
  },
};
//@ chunk-8wvtd8sr.js:247705-249767 placement
/**
 * 把分享结果映射为 tool_result 文案：组织分享（是否已共享、组织名、访问级别）或指定人员分享（新增人数、编辑者保持不变、邀请邮件），记录不可读时给出说明。
 */
function renderShareResult(e, toolUseId) {
  if (!("shared" in e)) return throwUnroutedArtifactAction("share.mapResult", e);
  if (!sharedSourceSchema().safeParse(e).success)
    return {
      tool_use_id: toolUseId,
      type: "tool_result",
      content:
        'This record of a share is unreadable \u2014 whether the audience changed is unknown; action "read" on the artifact says who can open it now.',
    };
  let shared = e.shared;
  let r = safePublishUrl(shared.url);
  let h =
    typeof shared.title === "string" && shared.title !== ""
      ? ` "${sweepScalarField(shared.title, 300)}"`
      : "";
  let y =
    typeof shared.org_name === "string" && shared.org_name !== ""
      ? `everyone at ${sweepScalarField(shared.org_name, 200)}`
      : "everyone in the person's organization";
  let p = shared.access === "view" ? "can open it (view only)" : "can open and comment on it";
  let w =
    typeof shared.editors === "number" && shared.editors > 0
      ? ` ${shared.editors} of the people named already edit it and were left as they are.`
      : "";
  if (shared.mode === "org") {
    let content = shared.unchanged
      ? `Already shared: ${y} ${p} \u2014 the artifact${h} (${r}) was already open to the organization, so nothing changed. Nobody is notified by an organization share; give the person the link to pass along.`
      : `Shared the artifact${h} (${r}) with ${y}: they ${p} (the artifact's organization access level; the person changes it from the Share menu). Nobody is notified by an organization share; give the person the link to post or send. They can change or undo this from the Share menu on the artifact's page.`;
    return {
      tool_use_id: toolUseId,
      type: "tool_result",
      content,
    };
  }
  let added = typeof shared.added === "number" ? shared.added : 0;
  let S = `${added} ${plural(added, "person", "people")} the person confirmed on the card`;
  let R = shared.read_mode === "org" ? " (it also stays open to the organization, as before)" : "";
  let content = shared.unchanged
    ? `Already shared: the ${S} could already open the artifact${h} (${r}) with that access, so nothing changed and no one was emailed.${w} Give the person the link to pass along.`
    : `Shared the artifact${h} (${r}) with ${S}: they ${p}${R}, and each gets claude.ai's usual invite email.${w} The card, not your \`people\` hints, decided who they are \u2014 do not name individuals as shared-with unless the person confirms who they picked. They can change or undo this from the Share menu on the artifact's page.`;
  return {
    tool_use_id: toolUseId,
    type: "tool_result",
    content,
  };
}
export {
  ARTIFACT_SHARE_ACTION_HANDLER,
  renderShareResult,
  sanitizedDisplayLabel,
  readShareInput,
  describeNamedPeople,
};
