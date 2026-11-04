/**
 * utils/settings/managedEnvKeys.ts
 *
 * 2.1.316 新增：各模型族对应的默认模型环境变量；有上限的编辑距离等。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-dcmhvw5a.js (14)
 * attribution: placement 14
 */
import { hasPathAlias } from "../../../vendor/@mermaid-js/parser/dist/chunks/mermaid-parser.esm.min/chunk-L2OVAXIS.mjs";
import { identity as identity_2 } from "../identity.js";
import { PROVIDER_ENV_FLAGS } from "../model/modelIds.js";
import { SKIP_AUTH_ENV_VARS, AWS_CREDENTIAL_ENV_VARS } from "../managedEnvConstants.js";
import { isEnvTruthy } from "../envUtils.js";
import { getPlatform } from "../platform.js";
import { deferInit } from "../../../runtime/deferred-init.js";

//@ chunk-dcmhvw5a.js:414034-414077 placement
function matchesManagedKey(a, b) {
  return a == null ? true : hasPathAlias(a, b);
}
//@ chunk-dcmhvw5a.js:414077-414087 placement
/**
 * matchesManagedKey_2：上者的别名。
 */
var matchesManagedKey_2 = matchesManagedKey;
//@ chunk-dcmhvw5a.js:414199-414233 placement
var loadedManagedKeyGroups; // deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
deferInit("chunk-dcmhvw5a.js:414199", () => {
  loadedManagedKeyGroups = identity_2(new Set(), (groups) => groups.clear());
});
//@ chunk-dcmhvw5a.js:414233-414259 placement
/**
 * markManagedKeyGroup：记录托管键分组已加载。
 */
function markManagedKeyGroup(group) {
  loadedManagedKeyGroups.add(group);
}
//@ chunk-dcmhvw5a.js:414259-414319 placement
/**
 * loadedManagedKeyGroupsList：已加载的托管键分组列表。
 */
function loadedManagedKeyGroupsList() {
  return ["keys", "hook"].filter((group) => loadedManagedKeyGroups.has(group));
}
//@ chunk-dcmhvw5a.js:414319-415380 placement
/**
 * 各模型族对应的默认模型环境变量。
 */
var MODEL_ENV_KEYS_2; // deferred: uses PROVIDER_ENV_FLAGS (../model/modelIds.js) of its import cycle while loading; runs once the cycle is complete
var MODEL_ENV_KEYS;
var PROVIDER_BASE_URL_ENV_KEYS;
var BEDROCK_REGION_ENV_KEYS;
var AWS_ENDPOINT_ENV_KEYS;
var PROVIDER_REGION_ENV_KEYS;
deferInit("chunk-dcmhvw5a.js:414319", () => {
  MODEL_ENV_KEYS_2 = {
    opus: "ANTHROPIC_DEFAULT_OPUS_MODEL",
    sonnet: "ANTHROPIC_DEFAULT_SONNET_MODEL",
    haiku: "ANTHROPIC_DEFAULT_HAIKU_MODEL",
    fable: "ANTHROPIC_DEFAULT_FABLE_MODEL",
  };
  MODEL_ENV_KEYS = [
    "ANTHROPIC_BEDROCK_BASE_URL",
    "ANTHROPIC_BEDROCK_MANTLE_BASE_URL",
    "ANTHROPIC_VERTEX_BASE_URL",
    "ANTHROPIC_FOUNDRY_BASE_URL",
  ];
  PROVIDER_BASE_URL_ENV_KEYS = [
    ...PROVIDER_ENV_FLAGS,
    "AWS_REGION",
    "AWS_PROFILE",
    ...MODEL_ENV_KEYS,
    "AWS_BEARER_TOKEN_BEDROCK",
    ...SKIP_AUTH_ENV_VARS,
    "ANTHROPIC_VERTEX_PROJECT_ID",
    "CLOUD_ML_REGION",
    "ANTHROPIC_FOUNDRY_RESOURCE",
  ];
  BEDROCK_REGION_ENV_KEYS = [
    ...PROVIDER_BASE_URL_ENV_KEYS,
    "AWS_ENDPOINT_URL_BEDROCK_RUNTIME",
    "AWS_ENDPOINT_URL_BEDROCK",
    "AWS_ENDPOINT_URL",
    "AWS_ENDPOINT_URL_STS",
    "AWS_ENDPOINT_URL_SSO",
    "AWS_ENDPOINT_URL_SSO_OIDC",
    "AWS_ENDPOINT_URL_SIGNIN",
    "ANTHROPIC_BEDROCK_REGION_PREFIX",
    "AWS_CONFIG_FILE",
    ...AWS_CREDENTIAL_ENV_VARS,
  ];
  AWS_ENDPOINT_ENV_KEYS = [
    ...PROVIDER_ENV_FLAGS,
    "AWS_BEARER_TOKEN_BEDROCK",
    "AWS_REGION",
    "AWS_DEFAULT_REGION",
    "AWS_PROFILE",
    "CLOUD_ML_REGION",
    "ANTHROPIC_SMALL_FAST_MODEL_AWS_REGION",
    "ANTHROPIC_VERTEX_PROJECT_ID",
    "ANTHROPIC_BEDROCK_SERVICE_TIER",
  ];
  PROVIDER_REGION_ENV_KEYS = [
    ...PROVIDER_BASE_URL_ENV_KEYS,
    "ANTHROPIC_BEDROCK_SERVICE_TIER",
    ...Object.values(MODEL_ENV_KEYS_2),
    "ANTHROPIC_SMALL_FAST_MODEL",
    "ANTHROPIC_SMALL_FAST_MODEL_AWS_REGION",
    "ANTHROPIC_CUSTOM_HEADERS",
  ];
});
//@ chunk-dcmhvw5a.js:415380-415775 placement
/**
 * 各提供商 base URL 环境变量。
 */
var PROVIDER_BASE_URL_KEYS_2; // deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
var PROVIDER_BASE_URL_KEYS;
deferInit("chunk-dcmhvw5a.js:415380", () => {
  PROVIDER_BASE_URL_KEYS_2 = [
    "ANTHROPIC_BEDROCK_BASE_URL",
    "ANTHROPIC_BEDROCK_MANTLE_BASE_URL",
    "ANTHROPIC_AWS_BASE_URL",
    "ANTHROPIC_VERTEX_BASE_URL",
    "ANTHROPIC_GOOGLE_CLOUD_BASE_URL",
    "ANTHROPIC_FOUNDRY_BASE_URL",
    "ANTHROPIC_FOUNDRY_RESOURCE",
    "AWS_ENDPOINT_URL_BEDROCK_RUNTIME",
    "AWS_ENDPOINT_URL_BEDROCK",
    "AWS_ENDPOINT_URL",
  ];
  PROVIDER_BASE_URL_KEYS = new Set([
    "AWS_ENDPOINT_URL_BEDROCK_RUNTIME",
    "AWS_ENDPOINT_URL_BEDROCK",
    "AWS_ENDPOINT_URL",
  ]);
});
//@ chunk-dcmhvw5a.js:415775-416049 placement
function setsProviderEnv(env, env_2) {
  let flags = new Set([...PROVIDER_ENV_FLAGS, "CLAUDE_CODE_USE_GATEWAY"]);
  let urlKeys = new Set([...PROVIDER_BASE_URL_KEYS_2, "ANTHROPIC_BASE_URL"]);
  let bedrock = env_2?.CLAUDE_CODE_USE_BEDROCK === "1";
  return Object.entries(env ?? {}).some(([key, value]) => {
    let upper = key.toUpperCase();
    return (
      (flags.has(upper) && isEnvTruthy(value)) ||
      (urlKeys.has(upper) && value.trim() !== "" && (bedrock || !PROVIDER_BASE_URL_KEYS.has(upper)))
    );
  });
}
//@ chunk-dcmhvw5a.js:416049-416110 placement
var RETRYABLE_UNAVAILABLE_ERRNOS; // deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
deferInit("chunk-dcmhvw5a.js:416049", () => {
  RETRYABLE_UNAVAILABLE_ERRNOS = new Set(["EBUSY", "EMFILE", "ENFILE", "EAGAIN", "EINTR"]);
});
//@ chunk-dcmhvw5a.js:416110-416195 placement
/**
 * 错误码是否表示不可用。
 */
function isUnavailableErrorCode(errnoCode) {
  if (errnoCode === undefined) return false;
  return (
    RETRYABLE_UNAVAILABLE_ERRNOS.has(errnoCode) || (errnoCode === "EPERM" && getPlatform() === "windows")
  );
}
//@ chunk-dcmhvw5a.js:416195-416283 placement
/**
 * 错误是否表示不可用。
 */
function isUnavailableError(error) {
  return (
    error.code === "Unavailable" || ("telemetryCode" in error && isUnavailableErrorCode(error.telemetryCode))
  );
}
//@ chunk-dcmhvw5a.js:416283-416534 placement
/**
 * 找出拼写相近的名字。
 */
function similarNames(name, names, limit) {
  let seen = new Set();
  let results = [];
  for (let candidateName of names) {
    if (seen.has(candidateName)) continue;
    seen.add(candidateName);
    if (Math.abs(candidateName.length - name.length) > 2) continue;
    let distance = boundedEditDistance(name, candidateName, 2);
    if (distance <= 2)
      results.push({
        name: candidateName,
        distance,
      });
  }
  return results
    .sort((a, b) => a.distance - b.distance)
    .slice(0, limit)
    .map((result) => result.name);
}
//@ chunk-dcmhvw5a.js:416534-416732 placement
/**
 * 按编辑距离建议最接近的名字。
 */
function suggestClosestName(name, candidates, { maxEditDistance = 1 } = {}) {
  let flattened = candidates.flatMap((candidate) => [candidate.name, ...(candidate.aliases ?? [])]);
  let best;
  let bestDistance = maxEditDistance + 1;
  for (let flatName of flattened) {
    if (Math.abs(flatName.length - name.length) > maxEditDistance) continue;
    let distance = boundedEditDistance(name, flatName, maxEditDistance);
    if (distance < bestDistance) {
      bestDistance = distance;
      best = flatName;
    }
  }
  return best;
}
//@ chunk-dcmhvw5a.js:416732-417298 placement
/**
 * 有上限的编辑距离。
 */
function boundedEditDistance(source, target, limit) {
  if (source === target) return 0;
  let aLength = source.length;
  let bLength = target.length;
  let beyond = limit + 1;
  if (Math.abs(aLength - bLength) > limit) return beyond;
  let prevPrev = new Int32Array(bLength + 2).fill(beyond);
  let prev = new Int32Array(bLength + 2).fill(beyond);
  let cur = new Int32Array(bLength + 2).fill(beyond);
  for (let j = 0; j <= Math.min(bLength, limit); j++) prev[j] = j;
  for (let j = 1; j <= aLength; j++) {
    let max = Math.max(1, j - limit);
    let min = Math.min(bLength, j + limit);
    cur[max - 1] = max === 1 ? Math.min(j, beyond) : beyond;
    let rowMin = cur[max - 1];
    for (let col = max; col <= min; col++) {
      let min = Math.min(
        prev[col] + 1,
        cur[col - 1] + 1,
        prev[col - 1] + (source[j - 1] === target[col - 1] ? 0 : 1),
        beyond,
      );
      if (j > 1 && col > 1 && source[j - 1] === target[col - 2] && source[j - 2] === target[col - 1])
        min = Math.min(min, prevPrev[col - 2] + 1);
      cur[col] = min;
      rowMin = Math.min(rowMin, min);
    }
    cur[min + 1] = beyond;
    if (rowMin > limit) return beyond;
    [prevPrev, prev, cur] = [prev, cur, prevPrev];
  }
  return prev[bLength];
}
export {
  isUnavailableErrorCode,
  isUnavailableError,
  similarNames,
  suggestClosestName,
  boundedEditDistance,
  loadedManagedKeyGroupsList,
  markManagedKeyGroup,
  matchesManagedKey_2,
  setsProviderEnv,
  PROVIDER_REGION_ENV_KEYS,
  AWS_ENDPOINT_ENV_KEYS,
};
