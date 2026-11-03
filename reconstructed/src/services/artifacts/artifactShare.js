/**
 * services/artifacts/artifactShare.ts
 *
 * 2.1.316 新增：Artifact 置顶（pin/unpin）、共享（org/people/公开，经云中继）与版本列表
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-easqy8j1.js (34)
 * attribution: placement 34
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
import { string, u, array, M, unknown, record } from "../../../vendor/zod/v4/classic/schemas.js";
import { getFeatureValue_CACHED_MAY_BE_STALE } from "../analytics/growthbook.js";
import { DoctorLazy } from "../../cli/handlers/util.js";
import { VER_SHAPE } from "./ownPublishes.js";
import { uniq, count } from "../../utils/collections.js";

//@ chunk-easqy8j1.js:1957-2072 placement
function isArtifactPinEnabled() {
  let e = isRemoteManagedEnvironment();
  if (env.CLAUDE_CODE_REMOTE && !e) return false;
  return (env.CLAUDE_CODE_ARTIFACT_PIN ?? true) && !(e && isActingAsBot());
}
//@ chunk-easqy8j1.js:2072-2261 placement
/**
 * 云会话里还不能置顶 artifact 时返回给模型的说明（没有改动、不要重试、用户可在 claude.ai 菜单里操作）。
 */
var PIN_UNAVAILABLE_IN_CLOUD =
  "Pinning artifacts isn't available in this cloud session yet, so nothing changed; do not retry here. The user can pin or unpin it themselves from the artifact's menu on claude.ai.";
//@ chunk-easqy8j1.js:2261-2295 placement
/**
 * 导出函数 `isRelayUnavailableForPins`：返回 mn() && !frameVerbRelayActive()。
 */
function isRelayUnavailableForPins() {
  return isRemoteManagedEnvironment() && !frameVerbRelayActive();
}
//@ chunk-easqy8j1.js:2295-2382 placement
var RELAY_UNAVAILABLE_RESULT = {
  ok: false,
  reason: "relay-unavailable",
  status: 0,
  route: "relay",
  fromFrame: false,
};
var MAX_PINS_RESPONSE_BYTES = 65536;
//@ chunk-easqy8j1.js:2382-2504 placement
function getShareEventProps(e, a, wire) {
  return {
    source: e.source === "tool" ? lit("tool") : lit("dialog"),
    route: a === "relay" ? lit("relay") : lit("direct"),
    wire,
  };
}
//@ chunk-easqy8j1.js:2504-4582 placement
/**
 * 置顶/取消置顶 Artifact（/api/frame/favorite/），云会话走中继。
 */
async function setArtifactPinned(
  slug,
  a,
  credentials,
  s = {
    source: "dialog",
  },
) {
  let y = `/api/frame/favorite/${encodeURIComponent(slug)}`;
  let C = {
    refreshOAuth: true,
    headers: buildFrameHeaders(),
    timeout: 15000,
    maxContentLength: MAX_PINS_RESPONSE_BYTES,
    signal: s.signal,
    credentials,
  };
  let x = a ? "pin" : "unpin";
  let n;
  try {
    n = isRelayUnavailableForPins()
      ? RELAY_UNAVAILABLE_RESULT
      : a
        ? await frameApi.postRelayOnly(y, undefined, C)
        : await frameApi.deleteRelayOnly(y, C);
  } catch (error) {
    if (isCancel(error)) throw error;
    let h = threwOnRelayLeg(error);
    logFeatureBad(
      "artifact_pin",
      "request_error",
      getShareEventProps(s, h ? "relay" : "direct", wireOfThrow(error)),
    );
    return {
      err: h
        ? `Couldn't confirm the ${x} (the cloud relay gave no answer) \u2014 check with action "list" before retrying.`
        : `Couldn't ${x} the artifact (network error)`,
      reason: "request_error",
    };
  }
  let shareEventProps = getShareEventProps(s, n.route, wireOf(n));
  if (!n.ok) {
    if (n.reason === "relay-unavailable" || n.reason === "relay-not-served") {
      logFeatureBad("artifact_pin", n.reason.replace(/-/g, "_"), shareEventProps);
      return {
        err: PIN_UNAVAILABLE_IN_CLOUD,
        reason: "unavailable",
      };
    }
    logFeatureBad("artifact_pin", n.reason, shareEventProps);
    return {
      err:
        n.reason === "no-auth"
          ? describeArtifactAuthFailure(n.detail)
          : `Artifact ${x} unavailable: ${n.reason}`,
      reason: "unavailable",
    };
  }
  if (!n.fromFrame && (n.status < 200 || n.status >= 300)) {
    logFeatureBad("artifact_pin", "relay_error", shareEventProps);
    return {
      err: `Couldn't confirm the ${x} (the cloud relay failed: HTTP ${n.status}) \u2014 check with action "list" before retrying.`,
      reason: "http_failed",
    };
  }
  if (n.status === 404) {
    logFeatureSad("artifact_pin", "not_found", shareEventProps);
    return {
      err: `Couldn't ${x} the artifact \u2014 it may be gone or not readable by the user, or pinning isn't available yet for this account`,
      reason: "not_found",
    };
  }
  if (
    n.status === 403 &&
    typeof n.data === "string" &&
    n.data.trim().startsWith(CCR_CREDENTIAL_REFUSED_PREFIX)
  ) {
    logFeatureBad("artifact_pin", "ccr_credential_refused", shareEventProps);
    return {
      err: PIN_UNAVAILABLE_IN_CLOUD,
      reason: "unavailable",
    };
  }
  if (n.status < 200 || n.status >= 300) {
    logFeatureBad("artifact_pin", "http_failed", shareEventProps);
    return {
      err: `Couldn't ${x} the artifact (HTTP ${n.status})`,
      reason: "http_failed",
    };
  }
  if (n.route === "relay" && !fromUpstream(n)) {
    logFeatureBad("artifact_pin", "ok_foreign", shareEventProps);
    return {
      err: `Couldn't confirm the ${x}: the answer (HTTP ${n.status}) was not the Artifact service's own \u2014 check with action "list" before retrying.`,
      reason: "http_failed",
    };
  }
  logFeatureOk("artifact_pin", shareEventProps);
  if (a && n.route === "direct")
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
//@ chunk-easqy8j1.js:4582-4626 placement
var ACCOUNT_SETTINGS_PATH = "/api/oauth/account/settings";
var MAX_ORG_PINS = 100;
//@ chunk-easqy8j1.js:4626-5109 placement
async function fetchOrgShareSettings(e) {
  let organizationUuid = (await getGatewayAccountInfoAsync(e))?.organizationUuid;
  if (!organizationUuid) return;
  let r = {
    auth: "claude-ai-oauth",
    timeout: 1e4,
    maxContentLength: MAX_PINS_RESPONSE_BYTES,
    credentials: e,
  };
  let s = await apiClient.get(ACCOUNT_SETTINGS_PATH, r);
  if (!s.ok) return;
  let y = isPlainObject(s.data) ? s.data : {};
  let artifactPinsByOrg = isPlainObject(y.artifact_pins_by_org) ? y.artifact_pins_by_org : {};
  if (artifactPinsByOrg[organizationUuid] === true) return;
  let x = {};
  for (let [key, value] of Object.entries(artifactPinsByOrg))
    if (typeof value === "boolean" && key !== organizationUuid) x[key] = value;
  let sliced = Object.entries(x).slice(0, MAX_ORG_PINS - 1);
  await apiClient.patch(
    ACCOUNT_SETTINGS_PATH,
    {
      artifact_pins_by_org: {
        ...Object.fromEntries(sliced),
        [organizationUuid]: true,
      },
    },
    r,
  );
}
//@ chunk-easqy8j1.js:5109-5332 placement
/**
 * 版本标签字段的 schema：按 Unicode 码点（而非 UTF-16 长度）检查最大长度，超长时报 too_big。
 */
function versionLabelSchema() {
  let e = _maxSize(VERSION_LABEL_MAX);
  e._zod.check = (a) => {
    let r = a.value;
    if (typeof r !== "string" || countCodePoints(r) <= VERSION_LABEL_MAX) return;
    a.issues.push({
      origin: "string",
      code: "too_big",
      maximum: VERSION_LABEL_MAX,
      inclusive: true,
      input: r,
      inst: e,
      continue: true,
    });
  };
  return string().check(e);
}
//@ chunk-easqy8j1.js:5332-5458 placement
/**
 * Artifact 删除是否开启：远程环境下仅特定条件允许；否则看 CLAUDE_CODE_ARTIFACT_DELETE，未设置时看 tengu_cobalt_plinth_alder 开关。
 */
function isArtifactDeleteEnabled() {
  if (env.CLAUDE_CODE_REMOTE && !isRemoteManagedEnvironment()) return false;
  return (
    env.CLAUDE_CODE_ARTIFACT_DELETE ?? getFeatureValue_CACHED_MAY_BE_STALE("tengu_cobalt_plinth_alder", false)
  );
}
//@ chunk-easqy8j1.js:5458-5504 placement
var ORG_READ_MODES = ["org", "people"];
var ORG_ACCESS_MODES = ["view", "comment"];
//@ chunk-easqy8j1.js:5504-5551 placement
/**
 * 导出函数 `isOrgReadMode`：参数 e，返回 e === "org" || e === "people"。
 */
function isOrgReadMode(e) {
  return e === "org" || e === "people";
}
//@ chunk-easqy8j1.js:5551-5600 placement
/**
 * 导出函数 `isOrgAccessMode`：参数 e，返回 e === "view" || e === "comment"。
 */
function isOrgAccessMode(e) {
  return e === "view" || e === "comment";
}
//@ chunk-easqy8j1.js:5600-5679 placement
/**
 * 导出常量或表 `MAX_SHARE_TARGETS`：值为 50, Le = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/。
 */
var MAX_SHARE_TARGETS = 50;
var UUID_HEX_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;
//@ chunk-easqy8j1.js:5679-5784 placement
/**
 * 把输入去空白、转小写，符合格式时返回，否则 null（用于共享对象）。
 */
function normalizeShareEmail(userUuid) {
  if (typeof userUuid !== "string") return null;
  let lower = userUuid.trim().toLowerCase();
  return UUID_HEX_RE.test(lower) ? lower : null;
}
//@ chunk-easqy8j1.js:5784-6241 placement
/**
 * 共享授权（share grant）schema：读/写授权、评论者与查看者、组织只读级别、owner 与版本等字段。
 */
var ShareGrantSchema = DoctorLazy(() =>
  u({
    mode: string(),
    users: array(string()).optional(),
    groups: array(string()).optional(),
  }),
);
var shareGrantResponseSchema = DoctorLazy(() =>
  u({
    read: ShareGrantSchema(),
    write: ShareGrantSchema().optional(),
    commenters: array(string()).optional(),
    viewers: array(string()).optional(),
    commentersEnabled: M().optional(),
    viewersEnabled: M().optional(),
    orgReadLevel: string().optional(),
    orgViewEnabled: M().optional(),
    assignableReadModes: array(string()).optional(),
    readModeFrozen: M().optional(),
    shared: unknown().optional(),
    owner_account: string().optional(),
    owner_org: string().optional(),
    version: string(),
  }),
);
//@ chunk-easqy8j1.js:6241-6304 placement
function orgReadLevelFor(e) {
  return e.orgReadLevel === "view" ? "view" : "comment";
}
//@ chunk-easqy8j1.js:6304-6393 placement
function sharedHashOrUndefined(e) {
  let { shared } = e;
  return typeof shared === "string" && (shared === "" || VER_SHAPE.test(shared)) ? shared : undefined;
}
//@ chunk-easqy8j1.js:6393-6655 placement
/**
 * 无法从对话里把整个组织设为只读访问时的说明（没有改动，并给出替代做法）。
 */
var ORG_VIEW_ONLY_UNSUPPORTED =
  "View-only access for the whole organization can't be set from chat; nothing was changed. Share with the organization without `access` (it keeps the artifact's current organization access), or the person sets view-only from the Share menu on claude.ai.";
//@ chunk-easqy8j1.js:6655-10300 placement
/**
 * 判断能否修改 Artifact 的共享范围（冻结、组织只读等），返回 refuse/proceed。
 */
function checkShareChange(e, grant) {
  let r = (reason, message) => ({
    kind: "refuse",
    reason,
    message,
  });
  if (e.readModeFrozen === true)
    return r(
      "frozen",
      "This artifact's audience can't be changed from here; nothing was shared. The person can manage it from the Share menu on claude.ai.",
    );
  if ((e.owner_account ?? "") === "")
    return r(
      "not_human_owned",
      "This artifact has no personal owner (a channel or pipeline made it), so its sharing is not managed this way; nothing was changed.",
    );
  let mode = e.read.mode;
  if (mode !== "" && mode !== "owner" && mode !== "users" && mode !== "org" && mode !== "public")
    return r(
      "mode_unrecognised",
      "This artifact is shared in a way this build doesn't recognise, so nothing was changed rather than rewrite an audience it can't read. The person can share it from the Share menu on claude.ai.",
    );
  let y = mode !== "users" && mode !== "org" && mode !== "public";
  let C = y ? [] : (e.read.users ?? []);
  let assignableReadModes = e.assignableReadModes;
  if (grant.mode === "org") {
    if (grant.access === "view" && orgReadLevelFor(e) !== "view")
      return r("org_view_unavailable", ORG_VIEW_ONLY_UNSUPPORTED);
    if (mode === "public")
      return r(
        "already_wider",
        "This artifact is already public \u2014 anyone with the link can open it \u2014 so sharing it with the organization would only narrow that; nothing was changed. Give the person the link.",
      );
    if (mode === "org")
      return {
        kind: "unchanged",
        already: 0,
      };
    if (assignableReadModes !== undefined && !assignableReadModes.includes("org"))
      return r(
        "org_not_assignable",
        "Sharing with the whole organization isn't available for this artifact on the person's plan; nothing was changed. Share it with named people instead, or the person can use the Share menu on claude.ai.",
      );
    return {
      kind: "patch",
      body: {
        read: {
          mode: "org",
          users: C,
        },
      },
      added: 0,
      editors: 0,
    };
  }
  let lower = e.owner_account?.toLowerCase();
  let R = new Set((e.write?.users ?? []).map((k) => k.toLowerCase()));
  let S = uniq(grant.userUuids.map(normalizeShareEmail).filter((k) => k !== null));
  if (S.length === 0)
    return r(
      "no_people",
      "No people were confirmed on the approval card, so nothing was shared. The host resolves the people you name to organization members; ask the person to pick them on the card, or to share from the Share menu on claude.ai.",
    );
  let editors = count(S, (k) => R.has(k));
  let filtered = S.filter((k) => k !== lower && !R.has(k));
  if (filtered.length === 0)
    return r(
      "only_owner_or_editors",
      "Everyone confirmed on the card already owns or edits this artifact, so there was nothing to share; tell the person they already have access.",
    );
  if (grant.access === "view" && e.viewersEnabled !== true)
    return r(
      "view_tier_unavailable",
      'View-only sharing with named people isn\'t available for this artifact; nothing was changed. `access: "comment"` (they can open and comment) is available.',
    );
  let z = mode === "org" ? "org" : "users";
  if (mode === "public")
    return r(
      "already_wider",
      "This artifact is already public \u2014 anyone with the link, including these people, can open it \u2014 so nothing was changed. Give the person the link to send them.",
    );
  if (
    mode !== "users" &&
    mode !== "org" &&
    assignableReadModes !== undefined &&
    !assignableReadModes.includes("users")
  )
    return r(
      "users_not_assignable",
      "Sharing with named people isn't available for this artifact on the person's plan; nothing was changed. The person can use the Share menu on claude.ai.",
    );
  let L = y ? [] : (e.viewers ?? []).map((k) => k.toLowerCase());
  let I = y ? [] : (e.commenters ?? []).map((k) => k.toLowerCase());
  let O = uniq([...C.map((k) => k.toLowerCase()), ...filtered]);
  let w;
  let P;
  if (grant.access === "view") {
    w = uniq([...L, ...filtered]);
    let filtered_2 = I.filter((j) => !filtered.includes(j));
    P = filtered_2.length !== I.length ? filtered_2 : undefined;
  } else {
    let filtered_2 = L.filter((j) => !filtered.includes(j));
    w = filtered_2.length !== L.length ? filtered_2 : undefined;
    P = e.commentersEnabled === true ? uniq([...I, ...filtered]) : undefined;
  }
  let V = (k, j) => k !== undefined && k.length === j.length && k.every((J) => j.includes(J));
  let W = V(
    O,
    C.map((k) => k.toLowerCase()),
  );
  let Y = w === undefined || V(w, L);
  let q = P === undefined || V(P, I);
  if (W && Y && q && z === mode)
    return {
      kind: "unchanged",
      already: filtered.length,
    };
  return {
    kind: "patch",
    body: {
      read: {
        mode: z,
        users: O,
      },
      ...(w !== undefined &&
        !Y && {
          viewers: w,
        }),
      ...(P !== undefined &&
        !q && {
          commenters: P,
        }),
    },
    added: filtered.length,
    editors,
  };
}
//@ chunk-easqy8j1.js:10300-10508 placement
var CLOUD_SHARE_UNAVAILABLE =
  "Sharing artifacts from this cloud session isn't available yet, so nothing was changed; do not retry here. The person can share it themselves from the Share menu on the artifact's page on claude.ai.";
//@ chunk-easqy8j1.js:10508-10545 placement
/**
 * 导出函数 `isRelayUnavailableForSharing`：返回 mn() && !frameVerbRelayActive(SHARING_RELAY_FAMILY)。
 */
function isRelayUnavailableForSharing() {
  return isRemoteManagedEnvironment() && !frameVerbRelayActive(SHARING_RELAY_FAMILY);
}
//@ chunk-easqy8j1.js:10545-10633 placement
var RELAY_UNAVAILABLE_SHARING_RESULT = {
  ok: false,
  reason: "relay-unavailable",
  status: 0,
  route: "relay",
  fromFrame: false,
};
var MAX_SHARE_RESPONSE_BYTES = 524288;
//@ chunk-easqy8j1.js:10633-10718 placement
function shareRouteFacts(e) {
  return {
    route: e.route === "relay" ? lit("relay") : lit("direct"),
    mode: fromEnum(e.mode),
  };
}
//@ chunk-easqy8j1.js:10718-10831 placement
function getPermissionPath(slug, a) {
  let r = a ? `?org=${encodeURIComponent(a)}` : "";
  return `/api/frame/perm/${encodeURIComponent(slug)}${r}`;
}
//@ chunk-easqy8j1.js:10831-10897 placement
var X_CCR_RELAY_TOOL_USE_ID = "X-Ccr-Relay-Tool-Use-Id";
var X_CCR_RELAY_APPROVED_INTENT = "X-Ccr-Relay-Approved-Intent";
//@ chunk-easqy8j1.js:10897-11116 placement
function encodeSharePeople(grant) {
  let a =
    grant.mode === "org"
      ? {
          mode: "org",
          user_uuids: [],
        }
      : {
          mode: "people",
          access: grant.access,
          user_uuids: uniq(grant.userUuids.map(normalizeShareEmail).filter((r) => r !== null)),
        };
  return Buffer.from(JSON.stringify(a), "utf8").toString("base64url");
}
//@ chunk-easqy8j1.js:11116-12534 placement
function describeShareTargetMissing(e, a) {
  let r = scrubServerLine(formatFrameErrorBody(e.data), 300);
  if (e.status === 404)
    return {
      err: "No artifact at that url whose sharing the person can change \u2014 it may be gone, not theirs (only its owner can share it from here), or not visible to them. Nothing was changed.",
      reason: "not_found",
      status: 404,
    };
  if (e.status === 403) {
    if (r.startsWith(CCR_CREDENTIAL_REFUSED_PREFIX))
      return {
        err: CLOUD_SHARE_UNAVAILABLE,
        reason: "unavailable",
        status: 403,
      };
    return {
      err: `The person isn't allowed to change this artifact's sharing from here${r ? ` (${r})` : ""}; nothing was changed. Only its owner can, within what their organization allows \u2014 and a cloud session without network access only for artifacts it created. The person can use the Share menu on claude.ai.`,
      reason: "not_permitted",
      status: 403,
    };
  }
  if (e.status === 412)
    return {
      err: "This artifact's sharing changed while the approval was open, so nothing was applied over it; retry once so the current settings are read again.",
      reason: "changed_meanwhile",
      status: 412,
    };
  if (e.status === 409 || e.status === 400 || e.status === 422)
    return {
      err: `The artifact service refused this ${a === "write" ? "sharing change" : "read"}${r ? `: ${r}` : ` (HTTP ${e.status})`}. Nothing was changed.`,
      reason: "refused",
      status: e.status,
    };
  return {
    err:
      e.status >= 500
        ? `Couldn't ${a === "write" ? "apply the share" : "read the artifact's sharing"} (HTTP ${e.status}); retry once.`
        : `Couldn't ${a === "write" ? "apply the share" : "read the artifact's sharing"} (HTTP ${e.status}).`,
    reason: "http_failed",
    status: e.status,
  };
}
//@ chunk-easqy8j1.js:12534-17219 placement
/**
 * 执行 artifact_share：经中继或直接调用接口修改共享（约 4.7 KB）。
 */
async function shareArtifact(e) {
  let { slug, org, grant, toolUseId, credentials, signal } = e;
  let permissionPath = getPermissionPath(slug, isRemoteManagedEnvironment() ? undefined : org);
  let R = {
    refreshOAuth: true,
    timeout: 15000,
    maxContentLength: MAX_SHARE_RESPONSE_BYTES,
    signal,
    credentials,
  };
  let S = {};
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
    S[X_CCR_RELAY_TOOL_USE_ID] = toolUseId;
    S[X_CCR_RELAY_APPROVED_INTENT] = encodeSharePeople(grant);
  }
  let h;
  try {
    h = isRelayUnavailableForSharing()
      ? RELAY_UNAVAILABLE_SHARING_RESULT
      : await frameApi.getRelayOnly(permissionPath, {
          ...R,
          headers: {
            ...buildFrameHeaders(),
            ...S,
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
  if (!h.ok) {
    if (h.reason === "relay-unavailable" || h.reason === "relay-not-served") {
      logFeatureBad("artifact_share", h.reason.replace(/-/g, "_"), {
        mode: fromEnum(grant.mode),
      });
      return {
        err: CLOUD_SHARE_UNAVAILABLE,
        reason: "unavailable",
      };
    }
    logFeatureBad("artifact_share", h.reason, {
      mode: fromEnum(grant.mode),
    });
    return {
      err:
        h.reason === "no-auth"
          ? describeArtifactAuthFailure(h.detail)
          : `Artifact sharing unavailable: ${h.reason}`,
      reason: "unavailable",
    };
  }
  let d = shareRouteFacts({
    route: h.route,
    mode: grant.mode,
  });
  if (!h.fromFrame && (h.status < 200 || h.status >= 300)) {
    logFeatureBad("artifact_share", "read_relay_error", {
      ...d,
      status: h.status,
    });
    return {
      err: `Couldn't read the artifact's sharing settings (the cloud relay failed: HTTP ${h.status}); nothing was changed.`,
      reason: "http_failed",
      status: h.status,
    };
  }
  if (h.status < 200 || h.status >= 300) {
    let P = describeShareTargetMissing(h, "read");
    logFeatureSad("artifact_share", `read_${P.reason}`, {
      ...d,
      status: P.status,
    });
    return P;
  }
  if (h.route === "relay" && !fromUpstream(h)) {
    logFeatureBad("artifact_share", "read_ok_foreign", {
      ...d,
      status: h.status,
    });
    return {
      err: `Couldn't read the artifact's sharing settings: the answer (HTTP ${h.status}) was not the artifact service's own; nothing was changed. Retry once.`,
      reason: "http_failed",
      status: h.status,
    };
  }
  let z = shareGrantResponseSchema().safeParse(h.data);
  if (!z.success) {
    logFeatureBad("artifact_share", "read_malformed", d);
    return {
      err: "The artifact's sharing settings came back in a shape this build doesn't understand; nothing was changed. The person can share it from the Share menu on claude.ai.",
      reason: "malformed",
    };
  }
  let L = checkShareChange(z.data, grant);
  if (L.kind === "refuse") {
    logFeatureSad("artifact_share", `plan_${L.reason}`, d);
    return {
      err: L.message,
      reason: "refused",
    };
  }
  let I = (P) => (grant.mode === "org" ? orgReadLevelFor(P) : grant.access);
  if (L.kind === "unchanged") {
    logFeatureOk("artifact_share", {
      ...d,
      unchanged: true,
    });
    return {
      err: null,
      mode: grant.mode,
      access: I(z.data),
      readMode: z.data.read.mode,
      shared: sharedHashOrUndefined(z.data),
      added: L.already,
      editors: 0,
      unchanged: true,
      route: h.route,
    };
  }
  let O;
  try {
    O = isRelayUnavailableForSharing()
      ? RELAY_UNAVAILABLE_SHARING_RESULT
      : await frameApi.patchRelayOnly(permissionPath, L.body, {
          ...R,
          headers: {
            ...buildFrameHeaders(),
            "Content-Type": "application/json",
            "If-Match": z.data.version,
            ...S,
          },
        });
  } catch (error) {
    if (isCancel(error) || signal?.aborted) throw error;
    let V = threwOnRelayLeg(error);
    logFeatureBad("artifact_share", "write_request_error", {
      route: V ? lit("relay") : lit("direct"),
      mode: fromEnum(grant.mode),
    });
    return {
      err: V
        ? "Couldn't confirm the share (the cloud relay gave no answer) \u2014 it may have gone through; read the artifact before telling the person or trying again."
        : "Couldn't apply the share (network error); nothing was confirmed changed.",
      reason: "request_error",
    };
  }
  if (!O.ok) {
    if (O.reason === "relay-unavailable" || O.reason === "relay-not-served") {
      logFeatureBad("artifact_share", O.reason.replace(/-/g, "_"), d);
      return {
        err: CLOUD_SHARE_UNAVAILABLE,
        reason: "unavailable",
      };
    }
    logFeatureBad("artifact_share", O.reason, d);
    return {
      err:
        O.reason === "no-auth"
          ? describeArtifactAuthFailure(O.detail)
          : `Artifact sharing unavailable: ${O.reason}`,
      reason: "unavailable",
    };
  }
  if (O.gatewayPolicy === "unapproved") {
    logFeatureSad("artifact_share", "write_relay_unapproved", d);
    return {
      err: "The cloud session's gateway did not accept this share as approved by the person, so nothing was changed. Retry once so the confirmation card is shown again; if it still fails, the person can share it themselves from the Share menu on the artifact's page on claude.ai.",
      reason: "not_permitted",
      status: 403,
    };
  }
  if (!O.fromFrame && (O.status < 200 || O.status >= 300)) {
    logFeatureBad("artifact_share", "write_relay_error", {
      ...d,
      status: O.status,
    });
    return {
      err: `Couldn't confirm the share (the cloud relay failed: HTTP ${O.status}) \u2014 it may have gone through; read the artifact before telling the person or trying again.`,
      reason: "http_failed",
      status: O.status,
    };
  }
  if (O.status < 200 || O.status >= 300) {
    let P = describeShareTargetMissing(O, "write");
    logFeatureSad("artifact_share", `write_${P.reason}`, {
      ...d,
      status: P.status,
    });
    return P;
  }
  if (O.route === "relay" && !fromUpstream(O)) {
    logFeatureBad("artifact_share", "ok_foreign", {
      ...d,
      status: O.status,
    });
    return {
      err: `Couldn't confirm the share: the answer (HTTP ${O.status}) was not the artifact service's own; read the artifact before telling the person it is shared.`,
      reason: "http_failed",
      status: O.status,
    };
  }
  let w = shareGrantResponseSchema().safeParse(O.data);
  logFeatureOk("artifact_share", {
    ...d,
    added: L.added,
    editors: L.editors,
  });
  return {
    err: null,
    mode: grant.mode,
    access: I(w.success ? w.data : z.data),
    readMode: w.success ? w.data.read.mode : L.body.read.mode,
    shared: sharedHashOrUndefined(w.success ? w.data : z.data),
    added: L.added,
    editors: L.editors,
    unchanged: false,
    route: O.route,
  };
}
//@ chunk-easqy8j1.js:17219-17272 placement
function artifactVersionsEnv() {
  return env.CLAUDE_CODE_ARTIFACT_VERSIONS;
}
//@ chunk-easqy8j1.js:17272-17578 placement
/**
 * 版本列表请求的大小/数量上限、RFC 3339 时间格式正则，以及版本元数据与版本历史响应的 schema。
 */
var VERSIONS_MAX_BYTES = 524288;
var VERSIONS_MAX_COUNT = 100;
var RFC3339_RE = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d+)?(Z|[+-]\d{2}:\d{2})$/;
var VERSION_META_SCHEMA = DoctorLazy(() =>
  u({
    created_at: string().regex(RFC3339_RE).optional().catch(undefined),
  }),
);
var VERSION_HISTORY_SCHEMA = DoctorLazy(() =>
  u({
    live: string().optional().catch(undefined),
    history: array(string()),
    versions: record(string(), unknown()).nullish().catch(undefined),
    degraded: M().optional().catch(undefined),
  }),
);
//@ chunk-easqy8j1.js:17578-19435 placement
/**
 * 列出 Artifact 的版本（/api/frame/versions/）。
 */
async function listArtifactVersions(slug, a) {
  let { signal, credentials } = a;
  let y;
  try {
    y = await frameApi.get(`/api/frame/versions/${encodeURIComponent(slug)}`, {
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
  if (!y.ok) {
    logFeatureBad("artifact_versions_list", "not_ok");
    return {
      err:
        y.reason === "no-auth"
          ? describeArtifactAuthFailure(y.detail)
          : `listing versions unavailable: ${y.reason}`,
      reason: "not_ok",
    };
  }
  if (!y.fromFrame) {
    logFeatureBad("artifact_versions_list", "relay_error");
    return {
      err: `listing versions failed (relay HTTP ${y.status})`,
      reason: "relay_error",
    };
  }
  if (y.status === 403 || y.status === 404) {
    logFeatureBad("artifact_versions_list", "not_owner");
    return {
      err: "listing versions failed: only an artifact's owner can list its versions, and this session's account does not own an artifact at that URL.",
      reason: "not_owner",
    };
  }
  if (y.status < 200 || y.status >= 300) {
    let z = y.status >= 500 ? "http_5xx" : "http_4xx";
    logFeatureBad("artifact_versions_list", z);
    return {
      err: `listing versions failed (HTTP ${y.status})`,
      reason: z,
    };
  }
  let C = VERSION_HISTORY_SCHEMA().safeParse(y.data);
  if (!C.success) {
    logFeatureBad("artifact_versions_list", "malformed_body");
    return {
      err: "listing versions failed: malformed response",
      reason: "malformed_body",
    };
  }
  let { live, history, versions, degraded } = C.data;
  let h = history.length > VERSIONS_MAX_COUNT && {
    cut: true,
  };
  let d = [];
  for (let z of history.slice(0, VERSIONS_MAX_COUNT)) {
    if (!SAFE_ERROR_CODE_RE.test(z)) continue;
    let L = VERSION_META_SCHEMA().safeParse(versions?.[z]);
    let createdAt = L.success ? L.data.created_at : undefined;
    d.push({
      id: z,
      ...(createdAt !== undefined && {
        createdAt,
      }),
      ...(z === live && {
        current: true,
      }),
    });
  }
  if (history.length > 0 && d.length === 0) {
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
      rows: d,
      degraded: true,
      ...h,
    };
  }
  logFeatureOk("artifact_versions_list");
  return {
    err: null,
    rows: d,
    ...h,
  };
}
//@ chunk-easqy8j1.js:19435-19527 placement
function isArtifactOpenActionEnabled() {
  return (
    env.CLAUDE_CODE_ARTIFACT_OPEN_ACTION ??
    getFeatureValue_CACHED_MAY_BE_STALE("tengu_cobalt_plinth_willow", false)
  );
}
//@ chunk-easqy8j1.js:19527-19583 placement
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
  listArtifactVersions,
  RFC3339_RE,
  isRelayUnavailableForPins,
  PIN_UNAVAILABLE_IN_CLOUD,
  setArtifactPinned,
  isOrgReadMode,
  isOrgAccessMode,
  normalizeShareEmail,
  MAX_SHARE_TARGETS,
  isRelayUnavailableForSharing,
  CLOUD_SHARE_UNAVAILABLE,
  ORG_VIEW_ONLY_UNSUPPORTED,
  shareArtifact,
  ORG_READ_MODES,
  ORG_ACCESS_MODES,
  isArtifactDeleteEnabled,
  isArtifactOpenActionEnabled,
  artifactVersionsEnv,
};
