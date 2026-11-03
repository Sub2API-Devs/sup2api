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
import { ge } from "./identity.js";

/**
 * 非 CCS 租户且订阅用户符合归因条件时，解析归因 Project。
 */
//@ chunk-m3nv29vw.js:655-789 placement
function getSubscriberAttributionProject() {
  if (!isCcsTenant()) {
    let e = hasInferenceScope({
      anthropicAuthEnabled: isAnthropicAuthEnabled(),
      oauthScopes: hasOAuthScope(CLAUDE_AI_INFERENCE_SCOPE) ? [CLAUDE_AI_INFERENCE_SCOPE] : [],
    });
    if (isSubscriberAttributionEligible({ isSubscriber: e })) return resolveAttributionProject();
  }
  return;
}
//@ chunk-m3nv29vw.js:789-1462 placement
function parseAttributionProject() {
  try {
    let e = getSubscriberAttributionProject(),
      n =
        e === void 0 ? NOT_SENT_LABEL : `${e.project?.taggedId}|${e.project?.source}|${e.ignored.join(",")}`;
    if (e !== void 0 && n !== lastAttributionState.last) {
      let { project: project, ignored: ignored } = e;
      if (ignored.length > 0)
        if (
          (logForDebugging(
            `Attribution Project: ignored a value that names no Project (from ${ignored.join(", ")})`,
            { level: "warn" },
          ),
          project === void 0)
        )
          logFeatureBad("attribution_project", "not_a_project_id");
        else logFeatureSad("attribution_project", "not_a_project_id");
      else if (project !== void 0) logFeatureOk("attribution_project");
      if (project !== void 0)
        logForDebugging(`Attribution Project: ${project.taggedId} (from ${project.source})`);
    }
    return ((lastAttributionState.last = n), e?.project);
  } catch (error) {
    if (lastAttributionState.last !== FAILED_LABEL)
      ((lastAttributionState.last = FAILED_LABEL),
        logFeatureBad("attribution_project", "resolution_failed"),
        logError(withTelemetryMessage(toError(error), "attribution Project resolution failed")));
    return;
  }
}
//@ chunk-m3nv29vw.js:1462-2486 placement
function resolveAttributionProject() {
  let e = [],
    CLAUDE_CODE_ATTRIBUTION_PROJECT = env.CLAUDE_CODE_ATTRIBUTION_PROJECT;
  if (CLAUDE_CODE_ATTRIBUTION_PROJECT !== void 0 && CLAUDE_CODE_ATTRIBUTION_PROJECT.trim() !== "") {
    let r = normalizeAttributionProjectId(CLAUDE_CODE_ATTRIBUTION_PROJECT);
    if (r !== void 0)
      return {
        project: { taggedId: r, source: "harness" },
        written: CLAUDE_CODE_ATTRIBUTION_PROJECT.trim(),
        ignored: e,
      };
    e.push("harness");
  }
  let o = getEnabledSettingSources(),
    u = o.includes("userSettings") && projectSettingsAliasesUserSettings(),
    c,
    d = null;
  for (let r = o.length - 1; r >= 0; r--) {
    let s = o[r];
    if (s === "projectSettings" && u) continue;
    if (getSettingsForSource(s)?.attributionProject === void 0) continue;
    if (REPO_DIR_SETTING_SOURCES.has(s)) {
      if (c === void 0)
        if (getIsNonInteractiveSession()) {
          let _ = getOriginalCwdOrNull();
          c = _ !== null && isPathTrusted(_);
        } else c = checkHasTrustDialogAccepted();
      if (!c) continue;
    }
    d = s;
    break;
  }
  let a = d === null ? void 0 : getSettingsForSource(d)?.attributionProject;
  if (d !== null && typeof a === "string" && a.trim() !== "") {
    let r = SETTING_SOURCE_LABELS[d],
      s = normalizeAttributionProjectId(a);
    if (s !== void 0) return { project: { taggedId: s, source: r }, written: a.trim(), ignored: e };
    e.push(r);
  }
  let p = getSettingsForSource("policySettings")?.attributionProjectPolicy,
    j = typeof p === "object" && p !== null && "default" in p ? p.default : void 0;
  if (typeof j === "string" && j.trim() !== "") {
    let r = normalizeAttributionProjectId(j);
    if (r !== void 0)
      return { project: { taggedId: r, source: "admin_default" }, written: j.trim(), ignored: e };
    e.push("admin_default");
  }
  return { project: void 0, written: void 0, ignored: e };
}
/**
 * 把 UUID 转为 claude_proj_01<base58> 形式的项目 ID（或校验已是该形式）。与插件无关，见 lead 建议。
 */
//@ chunk-m3nv29vw.js:2486-2766 placement
function normalizeAttributionProjectId(e) {
  let trimmed = e.trim();
  if (UUID_RE.test(trimmed)) {
    let u = BigInt(`0x${trimmed.replaceAll("-", "")}`),
      c = "";
    while (u > 0n) ((c = BASE58_ALPHABET[Number(u % 58n)] + c), (u /= 58n));
    return `claude_proj_01${c.padStart(PROJECT_ID_SUFFIX_LENGTH, BASE58_ALPHABET[0])}`;
  }
  if (!ATTRIBUTION_PROJECT_ID_RE.test(trimmed)) return;
  let o = 0n;
  for (let u of trimmed.slice(-PROJECT_ID_SUFFIX_LENGTH)) o = o * 58n + BigInt(BASE58_ALPHABET.indexOf(u));
  return o <= MAX_UINT128 ? trimmed : void 0;
}
/**
 * 归因 Project 的常量：设置来源标签、UUID 正则、base58 字母表与编码长度、128 位上限、状态文字与上次结果缓存。
 */
//@ chunk-m3nv29vw.js:2766-3104 placement = SETTING_SOURCE_TO_SCOPE (0.811)
var SETTING_SOURCE_LABELS = {
    userSettings: "user",
    projectSettings: "project",
    localSettings: "local",
    flagSettings: "flag",
    policySettings: "managed",
  },
  UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i,
  BASE58_ALPHABET = "123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz",
  PROJECT_ID_SUFFIX_LENGTH = 22,
  MAX_UINT128 = (1n << 128n) - 1n,
  NOT_SENT_LABEL = "not sent",
  FAILED_LABEL = "failed",
  lastAttributionState = ge({ last: void 0 }, (e) => {
    e.last = void 0;
  });

export { parseAttributionProject, getSubscriberAttributionProject };
