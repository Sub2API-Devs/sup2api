/**
 * utils/attributionProject.ts
 *
 * 归因 Project 解析（2.1.316 新增）
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * new in 2.1.318 (2.1.88 has no file at this path)
 * pieces: chunk-x5s1qnh1.js (6)
 * attribution: affinity 1, placement 5
 * (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.
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
import { deferInit } from "../../runtime/deferred-init.js";

//@ chunk-x5s1qnh1.js:697-738 affinity
function currentAttributionProject() {
  return getSubscriberAttributionProject() ? resolveAttributionProject() : undefined;
}
//@ chunk-x5s1qnh1.js:738-867 placement
/**
 * 非 CCS 租户且订阅用户符合归因条件时，解析归因 Project。
 */
function getSubscriberAttributionProject() {
  if (!isCcsTenant()) {
    let isSubscriber = hasInferenceScope({
      anthropicAuthEnabled: isAnthropicAuthEnabled(),
      oauthScopes: hasOAuthScope(CLAUDE_AI_INFERENCE_SCOPE) ? [CLAUDE_AI_INFERENCE_SCOPE] : [],
    });
    return isSubscriberAttributionEligible({
      isSubscriber,
    });
  }
  return false;
}
//@ chunk-x5s1qnh1.js:867-1540 placement
function parseAttributionProject() {
  try {
    let resolved = currentAttributionProject();
    let resolvedLabel =
      resolved === undefined
        ? NOT_SENT_LABEL
        : `${resolved.project?.taggedId}|${resolved.project?.source}|${resolved.ignored.join(",")}`;
    if (resolved !== undefined && resolvedLabel !== lastAttributionState.last) {
      let { project, ignored } = resolved;
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
    lastAttributionState.last = resolvedLabel;
    return resolved?.project;
  } catch (error) {
    if (lastAttributionState.last !== FAILED_LABEL) {
      lastAttributionState.last = FAILED_LABEL;
      logFeatureBad("attribution_project", "resolution_failed");
      logError(withTelemetryMessage(toError(error), "attribution Project resolution failed"));
    }
    return;
  }
}
//@ chunk-x5s1qnh1.js:1540-2572 placement
function resolveAttributionProject() {
  let ignoredSources = [];
  let CLAUDE_CODE_ATTRIBUTION_PROJECT = env.CLAUDE_CODE_ATTRIBUTION_PROJECT;
  if (CLAUDE_CODE_ATTRIBUTION_PROJECT !== undefined && CLAUDE_CODE_ATTRIBUTION_PROJECT.trim() !== "") {
    let taggedId = normalizeAttributionProjectId(CLAUDE_CODE_ATTRIBUTION_PROJECT);
    if (taggedId !== undefined)
      return {
        project: {
          taggedId,
          source: "harness",
        },
        written: CLAUDE_CODE_ATTRIBUTION_PROJECT.trim(),
        ignored: ignoredSources,
      };
    ignoredSources.push("harness");
  }
  let enabledSettingSources = getEnabledSettingSources();
  let projectAliasesUser =
    enabledSettingSources.includes("userSettings") && projectSettingsAliasesUserSettings();
  let repoTrusted;
  let chosenSource = null;
  for (let k = enabledSettingSources.length - 1; k >= 0; k--) {
    let source = enabledSettingSources[k];
    if (source === "projectSettings" && projectAliasesUser) continue;
    if (getSettingsForSource(source)?.attributionProject === undefined) continue;
    if (REPO_DIR_SETTING_SOURCES.has(source)) {
      if (repoTrusted === undefined)
        if (getIsNonInteractiveSession()) {
          let originalCwdOrNull = getOriginalCwdOrNull();
          repoTrusted = originalCwdOrNull !== null && isPathTrusted(originalCwdOrNull);
        } else repoTrusted = checkHasTrustDialogAccepted();
      if (!repoTrusted) continue;
    }
    chosenSource = source;
    break;
  }
  let attributionProject =
    chosenSource === null ? undefined : getSettingsForSource(chosenSource)?.attributionProject;
  if (chosenSource !== null && typeof attributionProject === "string" && attributionProject.trim() !== "") {
    let sourceLabel = SETTING_SOURCE_LABELS[chosenSource];
    let taggedId = normalizeAttributionProjectId(attributionProject);
    if (taggedId !== undefined)
      return {
        project: {
          taggedId,
          source: sourceLabel,
        },
        written: attributionProject.trim(),
        ignored: ignoredSources,
      };
    ignoredSources.push(sourceLabel);
  }
  let attributionProjectPolicy = getSettingsForSource("policySettings")?.attributionProjectPolicy;
  let policyDefault =
    typeof attributionProjectPolicy === "object" &&
    attributionProjectPolicy !== null &&
    "default" in attributionProjectPolicy
      ? attributionProjectPolicy.default
      : undefined;
  if (typeof policyDefault === "string" && policyDefault.trim() !== "") {
    let taggedId = normalizeAttributionProjectId(policyDefault);
    if (taggedId !== undefined)
      return {
        project: {
          taggedId,
          source: "admin_default",
        },
        written: policyDefault.trim(),
        ignored: ignoredSources,
      };
    ignoredSources.push("admin_default");
  }
  return {
    project: undefined,
    written: undefined,
    ignored: ignoredSources,
  };
}
//@ chunk-x5s1qnh1.js:2572-2854 placement
/**
 * 把 UUID 转为 claude_proj_01<base58> 形式的项目 ID（或校验已是该形式）。与插件无关，见 lead 建议。
 */
function normalizeAttributionProjectId(rawId) {
  let trimmed = rawId.trim();
  if (UUID_RE.test(trimmed)) {
    let value = BigInt(`0x${trimmed.replaceAll("-", "")}`);
    let encoded = "";
    while (value > 0n) {
      encoded = BASE58_ALPHABET[Number(value % 58n)] + encoded;
      value /= 58n;
    }
    return `claude_proj_01${encoded.padStart(PROJECT_ID_SUFFIX_LENGTH, BASE58_ALPHABET[0])}`;
  }
  if (!ATTRIBUTION_PROJECT_ID_RE.test(trimmed)) return;
  let value = 0n;
  for (let char of trimmed.slice(-PROJECT_ID_SUFFIX_LENGTH))
    value = value * 58n + BigInt(BASE58_ALPHABET.indexOf(char));
  return value <= MAX_UINT128 ? trimmed : undefined;
}
//@ chunk-x5s1qnh1.js:3710-4048 placement (2.1.88 match: SETTING_SOURCE_TO_SCOPE, 0.812)
/**
 * 归因 Project 的常量：设置来源标签、UUID 正则、base58 字母表与编码长度、128 位上限、状态文字与上次结果缓存。
 */
var SETTING_SOURCE_LABELS; // deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
var UUID_RE;
var BASE58_ALPHABET;
var PROJECT_ID_SUFFIX_LENGTH;
var MAX_UINT128;
var NOT_SENT_LABEL;
var FAILED_LABEL;
var lastAttributionState;
deferInit("chunk-x5s1qnh1.js:3710", () => {
  SETTING_SOURCE_LABELS = {
    userSettings: "user",
    projectSettings: "project",
    localSettings: "local",
    flagSettings: "flag",
    policySettings: "managed",
  };
  UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  BASE58_ALPHABET = "123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz";
  PROJECT_ID_SUFFIX_LENGTH = 22;
  MAX_UINT128 = (1n << 128n) - 1n;
  NOT_SENT_LABEL = "not sent";
  FAILED_LABEL = "failed";
  lastAttributionState = identity(
    {
      last: undefined,
    },
    (state) => {
      state.last = undefined;
    },
  );
});
export {
  parseAttributionProject,
  currentAttributionProject,
  getSubscriberAttributionProject,
  resolveAttributionProject,
  normalizeAttributionProjectId,
};
