/**
 * utils/attributionProject.ts
 *
 * 归因 Project 解析（2.1.316 新增）
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-m3nv29vw.js (5)
 * attribution: placement 5
 */
import { isCcsTenant, getIsNonInteractiveSession, getOriginalCwdOrNull } from "../bootstrap/state.js";
import {
  hasInferenceScope,
  isSubscriberAttributionEligible,
  ATTRIBUTION_PROJECT_ID_RE,
} from "../constants/system.js";
import { isAnthropicAuthEnabled, hasOAuthScope } from "./auth.js";
import { CLAUDE_AI_INFERENCE_SCOPE } from "../constants/oauth.js";
import { logForDebugging } from "./debug.js";
import { logFeatureBad, logFeatureSad, logFeatureOk } from "../services/analytics/featureTelemetry.js";
import { logError } from "./log.js";
import { withTelemetryMessage, toError } from "./errors.js";
import { env } from "./env.js";
import { getEnabledSettingSources, REPO_DIR_SETTING_SOURCES } from "./settings/constants.js";
import { projectSettingsAliasesUserSettings, getSettingsForSource } from "./settings/settings.js";
import { isPathTrusted, checkHasTrustDialogAccepted } from "./config.js";
import { identity } from "./identity.js";

//@ chunk-m3nv29vw.js:655-789 placement
/**
 * 非 CCS 租户且订阅用户符合归因条件时，解析归因 Project。
 */
function getSubscriberAttributionProject() {
  if (!isCcsTenant()) {
    let isSubscriber = hasInferenceScope({
      anthropicAuthEnabled: isAnthropicAuthEnabled(),
      oauthScopes: hasOAuthScope(CLAUDE_AI_INFERENCE_SCOPE) ? [CLAUDE_AI_INFERENCE_SCOPE] : [],
    });
    if (
      isSubscriberAttributionEligible({
        isSubscriber,
      })
    )
      return resolveAttributionProject();
  }
  return;
}
//@ chunk-m3nv29vw.js:789-1462 placement
function parseAttributionProject() {
  try {
    let subscriberAttributionProject = getSubscriberAttributionProject();
    let n =
      subscriberAttributionProject === undefined
        ? NOT_SENT_LABEL
        : `${subscriberAttributionProject.project?.taggedId}|${subscriberAttributionProject.project?.source}|${subscriberAttributionProject.ignored.join(",")}`;
    if (subscriberAttributionProject !== undefined && n !== lastAttributionState.last) {
      let { project, ignored } = subscriberAttributionProject;
      if (ignored.length > 0) {
        logForDebugging(
          `Attribution Project: ignored a value that names no Project (from ${ignored.join(", ")})`,
          {
            level: "warn",
          },
        );
        if (project === undefined) logFeatureBad("attribution_project", "not_a_project_id");
        else logFeatureSad("attribution_project", "not_a_project_id");
      } else if (project !== undefined) logFeatureOk("attribution_project");
      if (project !== undefined)
        logForDebugging(`Attribution Project: ${project.taggedId} (from ${project.source})`);
    }
    lastAttributionState.last = n;
    return subscriberAttributionProject?.project;
  } catch (error) {
    if (lastAttributionState.last !== FAILED_LABEL) {
      lastAttributionState.last = FAILED_LABEL;
      logFeatureBad("attribution_project", "resolution_failed");
      logError(withTelemetryMessage(toError(error), "attribution Project resolution failed"));
    }
    return;
  }
}
//@ chunk-m3nv29vw.js:1462-2486 placement
function resolveAttributionProject() {
  let e = [];
  let CLAUDE_CODE_ATTRIBUTION_PROJECT = env.CLAUDE_CODE_ATTRIBUTION_PROJECT;
  if (CLAUDE_CODE_ATTRIBUTION_PROJECT !== undefined && CLAUDE_CODE_ATTRIBUTION_PROJECT.trim() !== "") {
    let r = normalizeAttributionProjectId(CLAUDE_CODE_ATTRIBUTION_PROJECT);
    if (r !== undefined)
      return {
        project: {
          taggedId: r,
          source: "harness",
        },
        written: CLAUDE_CODE_ATTRIBUTION_PROJECT.trim(),
        ignored: e,
      };
    e.push("harness");
  }
  let enabledSettingSources = getEnabledSettingSources();
  let u = enabledSettingSources.includes("userSettings") && projectSettingsAliasesUserSettings();
  let c;
  let d = null;
  for (let k = enabledSettingSources.length - 1; k >= 0; k--) {
    let s = enabledSettingSources[k];
    if (s === "projectSettings" && u) continue;
    if (getSettingsForSource(s)?.attributionProject === undefined) continue;
    if (REPO_DIR_SETTING_SOURCES.has(s)) {
      if (c === undefined)
        if (getIsNonInteractiveSession()) {
          let originalCwdOrNull = getOriginalCwdOrNull();
          c = originalCwdOrNull !== null && isPathTrusted(originalCwdOrNull);
        } else c = checkHasTrustDialogAccepted();
      if (!c) continue;
    }
    d = s;
    break;
  }
  let attributionProject = d === null ? undefined : getSettingsForSource(d)?.attributionProject;
  if (d !== null && typeof attributionProject === "string" && attributionProject.trim() !== "") {
    let r = SETTING_SOURCE_LABELS[d];
    let s = normalizeAttributionProjectId(attributionProject);
    if (s !== undefined)
      return {
        project: {
          taggedId: s,
          source: r,
        },
        written: attributionProject.trim(),
        ignored: e,
      };
    e.push(r);
  }
  let attributionProjectPolicy = getSettingsForSource("policySettings")?.attributionProjectPolicy;
  let j =
    typeof attributionProjectPolicy === "object" &&
    attributionProjectPolicy !== null &&
    "default" in attributionProjectPolicy
      ? attributionProjectPolicy.default
      : undefined;
  if (typeof j === "string" && j.trim() !== "") {
    let r = normalizeAttributionProjectId(j);
    if (r !== undefined)
      return {
        project: {
          taggedId: r,
          source: "admin_default",
        },
        written: j.trim(),
        ignored: e,
      };
    e.push("admin_default");
  }
  return {
    project: undefined,
    written: undefined,
    ignored: e,
  };
}
//@ chunk-m3nv29vw.js:2486-2766 placement
/**
 * 把 UUID 转为 claude_proj_01<base58> 形式的项目 ID（或校验已是该形式）。与插件无关，见 lead 建议。
 */
function normalizeAttributionProjectId(e) {
  let trimmed = e.trim();
  if (UUID_RE.test(trimmed)) {
    let u = BigInt(`0x${trimmed.replaceAll("-", "")}`);
    let c = "";
    while (u > 0n) {
      c = BASE58_ALPHABET[Number(u % 58n)] + c;
      u /= 58n;
    }
    return `claude_proj_01${c.padStart(PROJECT_ID_SUFFIX_LENGTH, BASE58_ALPHABET[0])}`;
  }
  if (!ATTRIBUTION_PROJECT_ID_RE.test(trimmed)) return;
  let o = 0n;
  for (let u of trimmed.slice(-PROJECT_ID_SUFFIX_LENGTH)) o = o * 58n + BigInt(BASE58_ALPHABET.indexOf(u));
  return o <= MAX_UINT128 ? trimmed : undefined;
}
//@ chunk-m3nv29vw.js:2766-3104 placement = SETTING_SOURCE_TO_SCOPE (0.811)
/**
 * 归因 Project 的常量：设置来源标签、UUID 正则、base58 字母表与编码长度、128 位上限、状态文字与上次结果缓存。
 */
var SETTING_SOURCE_LABELS = {
  userSettings: "user",
  projectSettings: "project",
  localSettings: "local",
  flagSettings: "flag",
  policySettings: "managed",
};
var UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
var BASE58_ALPHABET = "123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz";
var PROJECT_ID_SUFFIX_LENGTH = 22;
var MAX_UINT128 = (1n << 128n) - 1n;
var NOT_SENT_LABEL = "not sent";
var FAILED_LABEL = "failed";
var lastAttributionState = identity(
  {
    last: undefined,
  },
  (e) => {
    e.last = undefined;
  },
);
export { parseAttributionProject, getSubscriberAttributionProject };
