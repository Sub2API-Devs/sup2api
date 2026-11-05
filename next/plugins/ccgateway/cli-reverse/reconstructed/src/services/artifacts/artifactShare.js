/**
 * services/artifacts/artifactShare.ts
 *
 * 2.1.316 新增：Artifact 置顶（pin/unpin）、共享（org/people/公开，经云中继）与版本列表
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * new in 2.1.318 (2.1.88 has no file at this path)
 * pieces: chunk-fgpd7qrh.js (34)
 * attribution: placement 34
 * (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.
 */
import { isRemoteManagedEnvironment } from "../../utils/remoteEnvironment.js";
import { env } from "../../utils/env.js";
import { isActingAsBot } from "../ccrAgentProxy/agentProxy.js";
import {
  frameVerbRelayActive,
  frameApi,
  threwOnRelayLeg,
  wireOfThrow,
  wireOf,
  CCR_CREDENTIAL_REFUSED_PREFIX,
  fromUpstream,
  SHARING_RELAY_FAMILY,
} from "./frameRelay.js";
import { lit, fromEnum } from "../analytics/safeMetadata.js";
import { buildFrameHeaders, formatFrameErrorBody, SAFE_ERROR_CODE_RE } from "./frameApi.js";
import { isCancel } from "../../../vendor/axios/dist/esm/axios.js";
import { logFeatureBad, logFeatureSad, logFeatureOk } from "../analytics/featureTelemetry.js";
import { describeArtifactAuthFailure } from "./frameFlags.js";
import { logForDebugging } from "../../utils/debug.js";
import { getGatewayAccountInfoAsync } from "../../utils/gatewayCredential.js";
import { apiClient } from "../routines/routinesApi.js";
import { isPlainObject } from "../../utils/isPlainObject.js";
import { _maxSize } from "../../../vendor/zod/v4/core/api.js";
import { VERSION_LABEL_MAX, scrubServerLine } from "../../tools/ArtifactTool/artifactUrls.js";
import { countCodePoints } from "../../utils/stringUtils.js";
import {
  stringSchema,
  objectSchema,
  array,
  booleanSchema,
  unknown,
  record,
} from "../../../vendor/zod/v4/classic/schemas.js";
import { getFeatureValue_CACHED_MAY_BE_STALE } from "../analytics/growthbook.js";
import { DoctorLazy } from "../../cli/handlers/util.js";
import { VER_SHAPE } from "./ownPublishes.js";
import { normalizeCaseForComparison_2 } from "../../utils/permissions/filesystem.js";
import { countWhere } from "../../utils/collections.js";
import { deferInit } from "../../../runtime/deferred-init.js";

//@ chunk-fgpd7qrh.js:1956-2071 placement
function isArtifactPinEnabled() {
  let remote = isRemoteManagedEnvironment();
  if (env.CLAUDE_CODE_REMOTE && !remote) return false;
  return (env.CLAUDE_CODE_ARTIFACT_PIN ?? true) && !(remote && isActingAsBot());
}
//@ chunk-fgpd7qrh.js:2071-2260 placement
/**
 * 云会话里还不能置顶 artifact 时返回给模型的说明（没有改动、不要重试、用户可在 claude.ai 菜单里操作）。
 */
var PIN_UNAVAILABLE_IN_CLOUD =
  "Pinning artifacts isn't available in this cloud session yet, so nothing changed; do not retry here. The user can pin or unpin it themselves from the artifact's menu on claude.ai.";
//@ chunk-fgpd7qrh.js:2260-2294 placement
/**
 * 导出函数 `isRelayUnavailableForPins`：返回 mn() && !frameVerbRelayActive()。
 */
function isRelayUnavailableForPins() {
  return isRemoteManagedEnvironment() && !frameVerbRelayActive();
}
//@ chunk-fgpd7qrh.js:2294-2381 placement
var RELAY_UNAVAILABLE_RESULT = {
  ok: false,
  reason: "relay-unavailable",
  status: 0,
  route: "relay",
  fromFrame: false,
};
var MAX_PINS_RESPONSE_BYTES = 65536;
//@ chunk-fgpd7qrh.js:2381-2503 placement
function getShareEventProps(share, grant, wire) {
  return {
    source: share.source === "tool" ? lit("tool") : lit("dialog"),
    route: grant === "relay" ? lit("relay") : lit("direct"),
    wire,
  };
}
//@ chunk-fgpd7qrh.js:2503-4581 placement
/**
 * 置顶/取消置顶 Artifact（/api/frame/favorite/），云会话走中继。
 */
async function setArtifactPinned(
  slug,
  slugArg,
  credentials,
  options = {
    source: "dialog",
  },
) {
  let url = `/api/frame/favorite/${encodeURIComponent(slug)}`;
  let requestOptions = {
    refreshOAuth: true,
    headers: buildFrameHeaders(),
    timeout: 15000,
    maxContentLength: MAX_PINS_RESPONSE_BYTES,
    signal: options.signal,
    credentials,
  };
  let verb = slugArg ? "pin" : "unpin";
  let result;
  try {
    result = isRelayUnavailableForPins()
      ? RELAY_UNAVAILABLE_RESULT
      : slugArg
        ? await frameApi.postRelayOnly(url, undefined, requestOptions)
        : await frameApi.deleteRelayOnly(url, requestOptions);
  } catch (error) {
    if (isCancel(error)) throw error;
    let relayThrew = threwOnRelayLeg(error);
    logFeatureBad(
      "artifact_pin",
      "request_error",
      getShareEventProps(options, relayThrew ? "relay" : "direct", wireOfThrow(error)),
    );
    return {
      err: relayThrew
        ? `Couldn't confirm the ${verb} (the cloud relay gave no answer) \u2014 check with action "list" before retrying.`
        : `Couldn't ${verb} the artifact (network error)`,
      reason: "request_error",
    };
  }
  let shareEventProps = getShareEventProps(options, result.route, wireOf(result));
  if (!result.ok) {
    if (result.reason === "relay-unavailable" || result.reason === "relay-not-served") {
      logFeatureBad("artifact_pin", result.reason.replace(/-/g, "_"), shareEventProps);
      return {
        err: PIN_UNAVAILABLE_IN_CLOUD,
        reason: "unavailable",
      };
    }
    logFeatureBad("artifact_pin", result.reason, shareEventProps);
    return {
      err:
        result.reason === "no-auth"
          ? describeArtifactAuthFailure(result.detail)
          : `Artifact ${verb} unavailable: ${result.reason}`,
      reason: "unavailable",
    };
  }
  if (!result.fromFrame && (result.status < 200 || result.status >= 300)) {
    logFeatureBad("artifact_pin", "relay_error", shareEventProps);
    return {
      err: `Couldn't confirm the ${verb} (the cloud relay failed: HTTP ${result.status}) \u2014 check with action "list" before retrying.`,
      reason: "http_failed",
    };
  }
  if (result.status === 404) {
    logFeatureSad("artifact_pin", "not_found", shareEventProps);
    return {
      err: `Couldn't ${verb} the artifact \u2014 it may be gone or not readable by the user, or pinning isn't available yet for this account`,
      reason: "not_found",
    };
  }
  if (
    result.status === 403 &&
    typeof result.data === "string" &&
    result.data.trim().startsWith(CCR_CREDENTIAL_REFUSED_PREFIX)
  ) {
    logFeatureBad("artifact_pin", "ccr_credential_refused", shareEventProps);
    return {
      err: PIN_UNAVAILABLE_IN_CLOUD,
      reason: "unavailable",
    };
  }
  if (result.status < 200 || result.status >= 300) {
    logFeatureBad("artifact_pin", "http_failed", shareEventProps);
    return {
      err: `Couldn't ${verb} the artifact (HTTP ${result.status})`,
      reason: "http_failed",
    };
  }
  if (result.route === "relay" && !fromUpstream(result)) {
    logFeatureBad("artifact_pin", "ok_foreign", shareEventProps);
    return {
      err: `Couldn't confirm the ${verb}: the answer (HTTP ${result.status}) was not the Artifact service's own \u2014 check with action "list" before retrying.`,
      reason: "http_failed",
    };
  }
  logFeatureOk("artifact_pin", shareEventProps);
  if (slugArg && result.route === "direct")
    fetchOrgShareSettings(credentials).catch((error) =>
      logForDebugging(
        `markAccountHasPins failed: ${error instanceof Error ? error.message : String(error)}`,
        {
          level: "error",
        },
      ),
    );
  return {
    err: null,
  };
}
//@ chunk-fgpd7qrh.js:4581-4625 placement
var ACCOUNT_SETTINGS_PATH = "/api/oauth/account/settings";
var MAX_ORG_PINS = 100;
//@ chunk-fgpd7qrh.js:4625-5108 placement
async function fetchOrgShareSettings(credentials) {
  let organizationUuid = (await getGatewayAccountInfoAsync(credentials))?.organizationUuid;
  if (!organizationUuid) return;
  let requestOptions = {
    auth: "claude-ai-oauth",
    timeout: 1e4,
    maxContentLength: MAX_PINS_RESPONSE_BYTES,
    credentials,
  };
  let response = await apiClient.get(ACCOUNT_SETTINGS_PATH, requestOptions);
  if (!response.ok) return;
  let data = isPlainObject(response.data) ? response.data : {};
  let artifactPinsByOrg = isPlainObject(data.artifact_pins_by_org) ? data.artifact_pins_by_org : {};
  if (artifactPinsByOrg[organizationUuid] === true) return;
  let out = {};
  for (let [key, value] of Object.entries(artifactPinsByOrg))
    if (typeof value === "boolean" && key !== organizationUuid) out[key] = value;
  let sliced = Object.entries(out).slice(0, MAX_ORG_PINS - 1);
  await apiClient.patch(
    ACCOUNT_SETTINGS_PATH,
    {
      artifact_pins_by_org: {
        ...Object.fromEntries(sliced),
        [organizationUuid]: true,
      },
    },
    requestOptions,
  );
}
//@ chunk-fgpd7qrh.js:5108-5331 placement
/**
 * 版本标签字段的 schema：按 Unicode 码点（而非 UTF-16 长度）检查最大长度，超长时报 too_big。
 */
function versionLabelSchema() {
  let maxSize = _maxSize(VERSION_LABEL_MAX);
  maxSize._zod.check = (check) => {
    let value = check.value;
    if (typeof value !== "string" || countCodePoints(value) <= VERSION_LABEL_MAX) return;
    check.issues.push({
      origin: "string",
      code: "too_big",
      maximum: VERSION_LABEL_MAX,
      inclusive: true,
      input: value,
      inst: maxSize,
      continue: true,
    });
  };
  return stringSchema().check(maxSize);
}
//@ chunk-fgpd7qrh.js:5331-5457 placement
/**
 * Artifact 删除是否开启：远程环境下仅特定条件允许；否则看 CLAUDE_CODE_ARTIFACT_DELETE，未设置时看 tengu_cobalt_plinth_alder 开关。
 */
function isArtifactDeleteEnabled() {
  if (env.CLAUDE_CODE_REMOTE && !isRemoteManagedEnvironment()) return false;
  return (
    env.CLAUDE_CODE_ARTIFACT_DELETE ?? getFeatureValue_CACHED_MAY_BE_STALE("tengu_cobalt_plinth_alder", false)
  );
}
//@ chunk-fgpd7qrh.js:5457-5503 placement
var ORG_READ_MODES = ["org", "people"];
var ORG_ACCESS_MODES = ["view", "comment"];
//@ chunk-fgpd7qrh.js:5503-5550 placement
/**
 * 导出函数 `isOrgReadMode`：参数 e，返回 e === "org" || e === "people"。
 */
function isOrgReadMode(mode) {
  return mode === "org" || mode === "people";
}
//@ chunk-fgpd7qrh.js:5550-5599 placement
/**
 * 导出函数 `isOrgAccessMode`：参数 e，返回 e === "view" || e === "comment"。
 */
function isOrgAccessMode(mode) {
  return mode === "view" || mode === "comment";
}
//@ chunk-fgpd7qrh.js:5599-5678 placement
/**
 * 导出常量或表 `MAX_SHARE_TARGETS`：值为 50, Le = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/。
 */
var MAX_SHARE_TARGETS = 50;
var UUID_HEX_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;
//@ chunk-fgpd7qrh.js:5678-5783 placement
/**
 * 把输入去空白、转小写，符合格式时返回，否则 null（用于共享对象）。
 */
function normalizeShareEmail(userUuid) {
  if (typeof userUuid !== "string") return null;
  let lower = userUuid.trim().toLowerCase();
  return UUID_HEX_RE.test(lower) ? lower : null;
}
//@ chunk-fgpd7qrh.js:5783-6240 placement
/**
 * 共享授权（share grant）schema：读/写授权、评论者与查看者、组织只读级别、owner 与版本等字段。
 */
var ShareGrantSchema; // deferred: uses DoctorLazy (../../cli/handlers/util.js) of its import cycle while loading; runs once the cycle is complete
var shareGrantResponseSchema;
deferInit("chunk-fgpd7qrh.js:5783", () => {
  ShareGrantSchema = DoctorLazy(() =>
    objectSchema({
      mode: stringSchema(),
      users: array(stringSchema()).optional(),
      groups: array(stringSchema()).optional(),
    }),
  );
  shareGrantResponseSchema = DoctorLazy(() =>
    objectSchema({
      read: ShareGrantSchema(),
      write: ShareGrantSchema().optional(),
      commenters: array(stringSchema()).optional(),
      viewers: array(stringSchema()).optional(),
      commentersEnabled: booleanSchema().optional(),
      viewersEnabled: booleanSchema().optional(),
      orgReadLevel: stringSchema().optional(),
      orgViewEnabled: booleanSchema().optional(),
      assignableReadModes: array(stringSchema()).optional(),
      readModeFrozen: booleanSchema().optional(),
      shared: unknown().optional(),
      owner_account: stringSchema().optional(),
      owner_org: stringSchema().optional(),
      version: stringSchema(),
    }),
  );
});
//@ chunk-fgpd7qrh.js:6240-6303 placement
function orgReadLevelFor(role) {
  return role.orgReadLevel === "view" ? "view" : "comment";
}
//@ chunk-fgpd7qrh.js:6303-6392 placement
function sharedHashOrUndefined(hash) {
  let { shared } = hash;
  return typeof shared === "string" && (shared === "" || VER_SHAPE.test(shared)) ? shared : undefined;
}
//@ chunk-fgpd7qrh.js:6392-6654 placement
/**
 * 无法从对话里把整个组织设为只读访问时的说明（没有改动，并给出替代做法）。
 */
var ORG_VIEW_ONLY_UNSUPPORTED =
  "View-only access for the whole organization can't be set from chat; nothing was changed. Share with the organization without `access` (it keeps the artifact's current organization access), or the person sets view-only from the Share menu on claude.ai.";
//@ chunk-fgpd7qrh.js:6654-10299 placement
/**
 * 判断能否修改 Artifact 的共享范围（冻结、组织只读等），返回 refuse/proceed。
 */
function checkShareChange(live, grant) {
  let refuse = (reason, message) => ({
    kind: "refuse",
    reason,
    message,
  });
  if (live.readModeFrozen === true)
    return refuse(
      "frozen",
      "This artifact's audience can't be changed from here; nothing was shared. The person can manage it from the Share menu on claude.ai.",
    );
  if ((live.owner_account ?? "") === "")
    return refuse(
      "not_human_owned",
      "This artifact has no personal owner (a channel or pipeline made it), so its sharing is not managed this way; nothing was changed.",
    );
  let mode = live.read.mode;
  if (mode !== "" && mode !== "owner" && mode !== "users" && mode !== "org" && mode !== "public")
    return refuse(
      "mode_unrecognised",
      "This artifact is shared in a way this build doesn't recognise, so nothing was changed rather than rewrite an audience it can't read. The person can share it from the Share menu on claude.ai.",
    );
  let isUnshared = mode !== "users" && mode !== "org" && mode !== "public";
  let readUsers = isUnshared ? [] : (live.read.users ?? []);
  let assignableReadModes = live.assignableReadModes;
  if (grant.mode === "org") {
    if (grant.access === "view" && orgReadLevelFor(live) !== "view")
      return refuse("org_view_unavailable", ORG_VIEW_ONLY_UNSUPPORTED);
    if (mode === "public")
      return refuse(
        "already_wider",
        "This artifact is already public \u2014 anyone with the link can open it \u2014 so sharing it with the organization would only narrow that; nothing was changed. Give the person the link.",
      );
    if (mode === "org")
      return {
        kind: "unchanged",
        already: 0,
      };
    if (assignableReadModes !== undefined && !assignableReadModes.includes("org"))
      return refuse(
        "org_not_assignable",
        "Sharing with the whole organization isn't available for this artifact on the person's plan; nothing was changed. Share it with named people instead, or the person can use the Share menu on claude.ai.",
      );
    return {
      kind: "patch",
      body: {
        read: {
          mode: "org",
          users: readUsers,
        },
      },
      added: 0,
      editors: 0,
    };
  }
  let lower = live.owner_account?.toLowerCase();
  let writeUsers = new Set((live.write?.users ?? []).map((user) => user.toLowerCase()));
  let grantUsers = normalizeCaseForComparison_2(
    grant.userUuids.map(normalizeShareEmail).filter((normalized) => normalized !== null),
  );
  if (grantUsers.length === 0)
    return refuse(
      "no_people",
      "No people were confirmed on the approval card, so nothing was shared. The host resolves the people you name to organization members; ask the person to pick them on the card, or to share from the Share menu on claude.ai.",
    );
  let editors = countWhere(grantUsers, (user) => writeUsers.has(user));
  let filtered = grantUsers.filter((user) => user !== lower && !writeUsers.has(user));
  if (filtered.length === 0)
    return refuse(
      "only_owner_or_editors",
      "Everyone confirmed on the card already owns or edits this artifact, so there was nothing to share; tell the person they already have access.",
    );
  if (grant.access === "view" && live.viewersEnabled !== true)
    return refuse(
      "view_tier_unavailable",
      'View-only sharing with named people isn\'t available for this artifact; nothing was changed. `access: "comment"` (they can open and comment) is available.',
    );
  let writeMode = mode === "org" ? "org" : "users";
  if (mode === "public")
    return refuse(
      "already_wider",
      "This artifact is already public \u2014 anyone with the link, including these people, can open it \u2014 so nothing was changed. Give the person the link to send them.",
    );
  if (
    mode !== "users" &&
    mode !== "org" &&
    assignableReadModes !== undefined &&
    !assignableReadModes.includes("users")
  )
    return refuse(
      "users_not_assignable",
      "Sharing with named people isn't available for this artifact on the person's plan; nothing was changed. The person can use the Share menu on claude.ai.",
    );
  let readViewers = isUnshared ? [] : (live.viewers ?? []).map((user) => user.toLowerCase());
  let readCommenters = isUnshared ? [] : (live.commenters ?? []).map((user) => user.toLowerCase());
  let combinedReadUsers = normalizeCaseForComparison_2([
    ...readUsers.map((user) => user.toLowerCase()),
    ...filtered,
  ]);
  let grantViewers;
  let grantCommenters;
  if (grant.access === "view") {
    grantViewers = normalizeCaseForComparison_2([...readViewers, ...filtered]);
    let filtered_2 = readCommenters.filter((user) => !filtered.includes(user));
    grantCommenters = filtered_2.length !== readCommenters.length ? filtered_2 : undefined;
  } else {
    let filtered_2 = readViewers.filter((user) => !filtered.includes(user));
    grantViewers = filtered_2.length !== readViewers.length ? filtered_2 : undefined;
    grantCommenters =
      live.commentersEnabled === true
        ? normalizeCaseForComparison_2([...readCommenters, ...filtered])
        : undefined;
  }
  let isSubset = (subset, superset) =>
    subset !== undefined &&
    subset.length === superset.length &&
    subset.every((user) => superset.includes(user));
  let readSubset = isSubset(
    combinedReadUsers,
    readUsers.map((user) => user.toLowerCase()),
  );
  let viewersSubset = grantViewers === undefined || isSubset(grantViewers, readViewers);
  let commentersSubset = grantCommenters === undefined || isSubset(grantCommenters, readCommenters);
  if (readSubset && viewersSubset && commentersSubset && writeMode === mode)
    return {
      kind: "unchanged",
      already: filtered.length,
    };
  return {
    kind: "patch",
    body: {
      read: {
        mode: writeMode,
        users: combinedReadUsers,
      },
      ...(grantViewers !== undefined &&
        !viewersSubset && {
          viewers: grantViewers,
        }),
      ...(grantCommenters !== undefined &&
        !commentersSubset && {
          commenters: grantCommenters,
        }),
    },
    added: filtered.length,
    editors,
  };
}
//@ chunk-fgpd7qrh.js:10299-10507 placement
var CLOUD_SHARE_UNAVAILABLE =
  "Sharing artifacts from this cloud session isn't available yet, so nothing was changed; do not retry here. The person can share it themselves from the Share menu on the artifact's page on claude.ai.";
//@ chunk-fgpd7qrh.js:10507-10544 placement
/**
 * 导出函数 `isRelayUnavailableForSharing`：返回 mn() && !frameVerbRelayActive(SHARING_RELAY_FAMILY)。
 */
function isRelayUnavailableForSharing() {
  return isRemoteManagedEnvironment() && !frameVerbRelayActive(SHARING_RELAY_FAMILY);
}
//@ chunk-fgpd7qrh.js:10544-10632 placement
var RELAY_UNAVAILABLE_SHARING_RESULT = {
  ok: false,
  reason: "relay-unavailable",
  status: 0,
  route: "relay",
  fromFrame: false,
};
var MAX_SHARE_RESPONSE_BYTES = 524288;
//@ chunk-fgpd7qrh.js:10632-10717 placement
function shareRouteFacts(share) {
  return {
    route: share.route === "relay" ? lit("relay") : lit("direct"),
    mode: fromEnum(share.mode),
  };
}
//@ chunk-fgpd7qrh.js:10717-10830 placement
function getPermissionPath(slug, orgUuid) {
  let query = orgUuid ? `?org=${encodeURIComponent(orgUuid)}` : "";
  return `/api/frame/perm/${encodeURIComponent(slug)}${query}`;
}
//@ chunk-fgpd7qrh.js:10830-10896 placement
var X_CCR_RELAY_TOOL_USE_ID = "X-Ccr-Relay-Tool-Use-Id";
var X_CCR_RELAY_APPROVED_INTENT = "X-Ccr-Relay-Approved-Intent";
//@ chunk-fgpd7qrh.js:10896-11115 placement
function encodeSharePeople(grant) {
  let body =
    grant.mode === "org"
      ? {
          mode: "org",
          user_uuids: [],
        }
      : {
          mode: "people",
          access: grant.access,
          user_uuids: normalizeCaseForComparison_2(
            grant.userUuids.map(normalizeShareEmail).filter((email) => email !== null),
          ),
        };
  return Buffer.from(JSON.stringify(body), "utf8").toString("base64url");
}
//@ chunk-fgpd7qrh.js:11115-12533 placement
function describeShareTargetMissing(error, options) {
  let serverLine = scrubServerLine(formatFrameErrorBody(error.data), 300);
  if (error.status === 404)
    return {
      err: "No artifact at that url whose sharing the person can change \u2014 it may be gone, not theirs (only its owner can share it from here), or not visible to them. Nothing was changed.",
      reason: "not_found",
      status: 404,
    };
  if (error.status === 403) {
    if (serverLine.startsWith(CCR_CREDENTIAL_REFUSED_PREFIX))
      return {
        err: CLOUD_SHARE_UNAVAILABLE,
        reason: "unavailable",
        status: 403,
      };
    return {
      err: `The person isn't allowed to change this artifact's sharing from here${serverLine ? ` (${serverLine})` : ""}; nothing was changed. Only its owner can, within what their organization allows \u2014 and a cloud session without network access only for artifacts it created. The person can use the Share menu on claude.ai.`,
      reason: "not_permitted",
      status: 403,
    };
  }
  if (error.status === 412)
    return {
      err: "This artifact's sharing changed while the approval was open, so nothing was applied over it; retry once so the current settings are read again.",
      reason: "changed_meanwhile",
      status: 412,
    };
  if (error.status === 409 || error.status === 400 || error.status === 422)
    return {
      err: `The artifact service refused this ${options === "write" ? "sharing change" : "read"}${serverLine ? `: ${serverLine}` : ` (HTTP ${error.status})`}. Nothing was changed.`,
      reason: "refused",
      status: error.status,
    };
  return {
    err:
      error.status >= 500
        ? `Couldn't ${options === "write" ? "apply the share" : "read the artifact's sharing"} (HTTP ${error.status}); retry once.`
        : `Couldn't ${options === "write" ? "apply the share" : "read the artifact's sharing"} (HTTP ${error.status}).`,
    reason: "http_failed",
    status: error.status,
  };
}
//@ chunk-fgpd7qrh.js:12533-17218 placement
/**
 * 执行 artifact_share：经中继或直接调用接口修改共享（约 4.7 KB）。
 */
async function shareArtifact(request) {
  let { slug, org, grant, toolUseId, credentials, signal } = request;
  let permissionPath = getPermissionPath(slug, isRemoteManagedEnvironment() ? undefined : org);
  let writeOptions = {
    refreshOAuth: true,
    timeout: 15000,
    maxContentLength: MAX_SHARE_RESPONSE_BYTES,
    signal,
    credentials,
  };
  let extra = {};
  if (isRemoteManagedEnvironment() && !isRelayUnavailableForSharing()) {
    if (toolUseId === undefined || toolUseId === "") {
      logFeatureBad("artifact_share", "no_tool_use_id", {
        route: lit("relay"),
        mode: fromEnum(grant.mode),
      });
      return {
        err: CLOUD_SHARE_UNAVAILABLE,
        reason: "unavailable",
      };
    }
    extra[X_CCR_RELAY_TOOL_USE_ID] = toolUseId;
    extra[X_CCR_RELAY_APPROVED_INTENT] = encodeSharePeople(grant);
  }
  let readResponse;
  try {
    readResponse = isRelayUnavailableForSharing()
      ? RELAY_UNAVAILABLE_SHARING_RESULT
      : await frameApi.getRelayOnly(permissionPath, {
          ...writeOptions,
          headers: {
            ...buildFrameHeaders(),
            ...extra,
          },
        });
  } catch (error) {
    if (isCancel(error) || signal?.aborted) throw error;
    logFeatureBad("artifact_share", "read_request_error", {
      route: threwOnRelayLeg(error) ? lit("relay") : lit("direct"),
      mode: fromEnum(grant.mode),
    });
    return {
      err: "Couldn't read the artifact's sharing settings (network error); nothing was changed.",
      reason: "request_error",
    };
  }
  if (!readResponse.ok) {
    if (readResponse.reason === "relay-unavailable" || readResponse.reason === "relay-not-served") {
      logFeatureBad("artifact_share", readResponse.reason.replace(/-/g, "_"), {
        mode: fromEnum(grant.mode),
      });
      return {
        err: CLOUD_SHARE_UNAVAILABLE,
        reason: "unavailable",
      };
    }
    logFeatureBad("artifact_share", readResponse.reason, {
      mode: fromEnum(grant.mode),
    });
    return {
      err:
        readResponse.reason === "no-auth"
          ? describeArtifactAuthFailure(readResponse.detail)
          : `Artifact sharing unavailable: ${readResponse.reason}`,
      reason: "unavailable",
    };
  }
  let routeFacts = shareRouteFacts({
    route: readResponse.route,
    mode: grant.mode,
  });
  if (!readResponse.fromFrame && (readResponse.status < 200 || readResponse.status >= 300)) {
    logFeatureBad("artifact_share", "read_relay_error", {
      ...routeFacts,
      status: readResponse.status,
    });
    return {
      err: `Couldn't read the artifact's sharing settings (the cloud relay failed: HTTP ${readResponse.status}); nothing was changed.`,
      reason: "http_failed",
      status: readResponse.status,
    };
  }
  if (readResponse.status < 200 || readResponse.status >= 300) {
    let missing = describeShareTargetMissing(readResponse, "read");
    logFeatureSad("artifact_share", `read_${missing.reason}`, {
      ...routeFacts,
      status: missing.status,
    });
    return missing;
  }
  if (readResponse.route === "relay" && !fromUpstream(readResponse)) {
    logFeatureBad("artifact_share", "read_ok_foreign", {
      ...routeFacts,
      status: readResponse.status,
    });
    return {
      err: `Couldn't read the artifact's sharing settings: the answer (HTTP ${readResponse.status}) was not the artifact service's own; nothing was changed. Retry once.`,
      reason: "http_failed",
      status: readResponse.status,
    };
  }
  let parsed = shareGrantResponseSchema().safeParse(readResponse.data);
  if (!parsed.success) {
    logFeatureBad("artifact_share", "read_malformed", routeFacts);
    return {
      err: "The artifact's sharing settings came back in a shape this build doesn't understand; nothing was changed. The person can share it from the Share menu on claude.ai.",
      reason: "malformed",
    };
  }
  let change = checkShareChange(parsed.data, grant);
  if (change.kind === "refuse") {
    logFeatureSad("artifact_share", `plan_${change.reason}`, routeFacts);
    return {
      err: change.message,
      reason: "refused",
    };
  }
  let accessFor = (orgLevel) => (grant.mode === "org" ? orgReadLevelFor(orgLevel) : grant.access);
  if (change.kind === "unchanged") {
    logFeatureOk("artifact_share", {
      ...routeFacts,
      unchanged: true,
    });
    return {
      err: null,
      mode: grant.mode,
      access: accessFor(parsed.data),
      readMode: parsed.data.read.mode,
      shared: sharedHashOrUndefined(parsed.data),
      added: change.already,
      editors: 0,
      unchanged: true,
      route: readResponse.route,
    };
  }
  let writeResponse;
  try {
    writeResponse = isRelayUnavailableForSharing()
      ? RELAY_UNAVAILABLE_SHARING_RESULT
      : await frameApi.patchRelayOnly(permissionPath, change.body, {
          ...writeOptions,
          headers: {
            ...buildFrameHeaders(),
            "Content-Type": "application/json",
            "If-Match": parsed.data.version,
            ...extra,
          },
        });
  } catch (error) {
    if (isCancel(error) || signal?.aborted) throw error;
    let relayThrew = threwOnRelayLeg(error);
    logFeatureBad("artifact_share", "write_request_error", {
      route: relayThrew ? lit("relay") : lit("direct"),
      mode: fromEnum(grant.mode),
    });
    return {
      err: relayThrew
        ? "Couldn't confirm the share (the cloud relay gave no answer) \u2014 it may have gone through; read the artifact before telling the person or trying again."
        : "Couldn't apply the share (network error); nothing was confirmed changed.",
      reason: "request_error",
    };
  }
  if (!writeResponse.ok) {
    if (writeResponse.reason === "relay-unavailable" || writeResponse.reason === "relay-not-served") {
      logFeatureBad("artifact_share", writeResponse.reason.replace(/-/g, "_"), routeFacts);
      return {
        err: CLOUD_SHARE_UNAVAILABLE,
        reason: "unavailable",
      };
    }
    logFeatureBad("artifact_share", writeResponse.reason, routeFacts);
    return {
      err:
        writeResponse.reason === "no-auth"
          ? describeArtifactAuthFailure(writeResponse.detail)
          : `Artifact sharing unavailable: ${writeResponse.reason}`,
      reason: "unavailable",
    };
  }
  if (writeResponse.gatewayPolicy === "unapproved") {
    logFeatureSad("artifact_share", "write_relay_unapproved", routeFacts);
    return {
      err: "The cloud session's gateway did not accept this share as approved by the person, so nothing was changed. Retry once so the confirmation card is shown again; if it still fails, the person can share it themselves from the Share menu on the artifact's page on claude.ai.",
      reason: "not_permitted",
      status: 403,
    };
  }
  if (!writeResponse.fromFrame && (writeResponse.status < 200 || writeResponse.status >= 300)) {
    logFeatureBad("artifact_share", "write_relay_error", {
      ...routeFacts,
      status: writeResponse.status,
    });
    return {
      err: `Couldn't confirm the share (the cloud relay failed: HTTP ${writeResponse.status}) \u2014 it may have gone through; read the artifact before telling the person or trying again.`,
      reason: "http_failed",
      status: writeResponse.status,
    };
  }
  if (writeResponse.status < 200 || writeResponse.status >= 300) {
    let missing = describeShareTargetMissing(writeResponse, "write");
    logFeatureSad("artifact_share", `write_${missing.reason}`, {
      ...routeFacts,
      status: missing.status,
    });
    return missing;
  }
  if (writeResponse.route === "relay" && !fromUpstream(writeResponse)) {
    logFeatureBad("artifact_share", "ok_foreign", {
      ...routeFacts,
      status: writeResponse.status,
    });
    return {
      err: `Couldn't confirm the share: the answer (HTTP ${writeResponse.status}) was not the artifact service's own; read the artifact before telling the person it is shared.`,
      reason: "http_failed",
      status: writeResponse.status,
    };
  }
  let writeParsed = shareGrantResponseSchema().safeParse(writeResponse.data);
  logFeatureOk("artifact_share", {
    ...routeFacts,
    added: change.added,
    editors: change.editors,
  });
  return {
    err: null,
    mode: grant.mode,
    access: accessFor(writeParsed.success ? writeParsed.data : parsed.data),
    readMode: writeParsed.success ? writeParsed.data.read.mode : change.body.read.mode,
    shared: sharedHashOrUndefined(writeParsed.success ? writeParsed.data : parsed.data),
    added: change.added,
    editors: change.editors,
    unchanged: false,
    route: writeResponse.route,
  };
}
//@ chunk-fgpd7qrh.js:17218-17271 placement
function artifactVersionsEnv() {
  return env.CLAUDE_CODE_ARTIFACT_VERSIONS;
}
//@ chunk-fgpd7qrh.js:17271-17577 placement
/**
 * 版本列表请求的大小/数量上限、RFC 3339 时间格式正则，以及版本元数据与版本历史响应的 schema。
 */
var VERSIONS_MAX_BYTES; // deferred: uses DoctorLazy (../../cli/handlers/util.js) of its import cycle while loading; runs once the cycle is complete
var VERSIONS_MAX_COUNT;
var RFC3339_RE;
var VERSION_META_SCHEMA;
var VERSION_HISTORY_SCHEMA;
deferInit("chunk-fgpd7qrh.js:17271", () => {
  VERSIONS_MAX_BYTES = 524288;
  VERSIONS_MAX_COUNT = 100;
  RFC3339_RE = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d+)?(Z|[+-]\d{2}:\d{2})$/;
  VERSION_META_SCHEMA = DoctorLazy(() =>
    objectSchema({
      created_at: stringSchema().regex(RFC3339_RE).optional().catch(undefined),
    }),
  );
  VERSION_HISTORY_SCHEMA = DoctorLazy(() =>
    objectSchema({
      live: stringSchema().optional().catch(undefined),
      history: array(stringSchema()),
      versions: record(stringSchema(), unknown()).nullish().catch(undefined),
      degraded: booleanSchema().optional().catch(undefined),
    }),
  );
});
//@ chunk-fgpd7qrh.js:17577-19434 placement
/**
 * 列出 Artifact 的版本（/api/frame/versions/）。
 */
async function listArtifactVersions(slug, versionSlug) {
  let { signal, credentials } = versionSlug;
  let response;
  try {
    response = await frameApi.get(`/api/frame/versions/${encodeURIComponent(slug)}`, {
      refreshOAuth: true,
      headers: buildFrameHeaders(),
      timeout: 15000,
      maxContentLength: VERSIONS_MAX_BYTES,
      ...(signal && {
        signal,
      }),
      credentials,
    });
  } catch (error) {
    if (isCancel(error) || signal?.aborted) throw error;
    logFeatureBad("artifact_versions_list", "request_error");
    return {
      err: "listing versions failed (network error)",
      reason: "request_error",
    };
  }
  if (!response.ok) {
    logFeatureBad("artifact_versions_list", "not_ok");
    return {
      err:
        response.reason === "no-auth"
          ? describeArtifactAuthFailure(response.detail)
          : `listing versions unavailable: ${response.reason}`,
      reason: "not_ok",
    };
  }
  if (!response.fromFrame) {
    logFeatureBad("artifact_versions_list", "relay_error");
    return {
      err: `listing versions failed (relay HTTP ${response.status})`,
      reason: "relay_error",
    };
  }
  if (response.status === 403 || response.status === 404) {
    logFeatureBad("artifact_versions_list", "not_owner");
    return {
      err: "listing versions failed: only an artifact's owner can list its versions, and this session's account does not own an artifact at that URL.",
      reason: "not_owner",
    };
  }
  if (response.status < 200 || response.status >= 300) {
    let kind = response.status >= 500 ? "http_5xx" : "http_4xx";
    logFeatureBad("artifact_versions_list", kind);
    return {
      err: `listing versions failed (HTTP ${response.status})`,
      reason: kind,
    };
  }
  let parsed = VERSION_HISTORY_SCHEMA().safeParse(response.data);
  if (!parsed.success) {
    logFeatureBad("artifact_versions_list", "malformed_body");
    return {
      err: "listing versions failed: malformed response",
      reason: "malformed_body",
    };
  }
  let { live, history, versions, degraded } = parsed.data;
  let cut = history.length > VERSIONS_MAX_COUNT && {
    cut: true,
  };
  let out = [];
  for (let id of history.slice(0, VERSIONS_MAX_COUNT)) {
    if (!SAFE_ERROR_CODE_RE.test(id)) continue;
    let parsed2 = VERSION_META_SCHEMA().safeParse(versions?.[id]);
    let createdAt = parsed2.success ? parsed2.data.created_at : undefined;
    out.push({
      id,
      ...(createdAt !== undefined && {
        createdAt,
      }),
      ...(id === live && {
        current: true,
      }),
    });
  }
  if (history.length > 0 && out.length === 0) {
    logFeatureBad("artifact_versions_list", "all_rows_dropped");
    return {
      err: "listing versions failed: response rows were unreadable",
      reason: "all_rows_dropped",
    };
  }
  if (degraded === true || versions == null) {
    logFeatureSad("artifact_versions_list", "ids_only");
    return {
      err: null,
      rows: out,
      degraded: true,
      ...cut,
    };
  }
  logFeatureOk("artifact_versions_list");
  return {
    err: null,
    rows: out,
    ...cut,
  };
}
//@ chunk-fgpd7qrh.js:19434-19526 placement
function isArtifactOpenActionEnabled() {
  return (
    env.CLAUDE_CODE_ARTIFACT_OPEN_ACTION ??
    getFeatureValue_CACHED_MAY_BE_STALE("tengu_cobalt_plinth_willow", false)
  );
}
//@ chunk-fgpd7qrh.js:19526-19582 placement
/**
 * 导出函数 `isArtifactRoomEnabledStub`：返回 null?.isArtifactRoomEnabled() === !0; } export { j9, isArtifactPinEnabled, versionLabelSchema, listArtifactVer…。
 */
function isArtifactRoomEnabledStub() {
  return null?.isArtifactRoomEnabled() === true;
}
export {
  isArtifactRoomEnabledStub,
  isArtifactPinEnabled,
  versionLabelSchema,
  setArtifactPinned,
  ORG_READ_MODES,
  ORG_ACCESS_MODES,
  isArtifactDeleteEnabled,
  isArtifactOpenActionEnabled,
  artifactVersionsEnv,
  listArtifactVersions,
  RFC3339_RE,
  isRelayUnavailableForPins,
  PIN_UNAVAILABLE_IN_CLOUD,
  isOrgReadMode,
  isOrgAccessMode,
  normalizeShareEmail,
  MAX_SHARE_TARGETS,
  isRelayUnavailableForSharing,
  CLOUD_SHARE_UNAVAILABLE,
  ORG_VIEW_ONLY_UNSUPPORTED,
  shareArtifact,
};
