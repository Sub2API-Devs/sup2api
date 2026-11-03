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
import { zn } from "../../../vendor/@mermaid-js/parser/dist/chunks/mermaid-parser.esm.min/chunk-L2OVAXIS.mjs";
import { identity as identity_2 } from "../identity.js";
import { PROVIDER_ENV_FLAGS } from "../model/modelIds.js";
import { SKIP_AUTH_ENV_VARS, AWS_CREDENTIAL_ENV_VARS } from "../managedEnvConstants.js";
import { isEnvTruthy } from "../envUtils.js";
import { getPlatform } from "../platform.js";

//@ chunk-dcmhvw5a.js:414034-414077 placement
function matchesManagedKey(e, n) {
  return e == null ? true : zn(e, n);
}
//@ chunk-dcmhvw5a.js:414077-414087 placement
/**
 * matchesManagedKey_2：上者的别名。
 */
var matchesManagedKey_2 = matchesManagedKey;
//@ chunk-dcmhvw5a.js:414199-414233 placement
var loadedManagedKeyGroups = identity_2(new Set(), (e) => e.clear());
//@ chunk-dcmhvw5a.js:414233-414259 placement
/**
 * markManagedKeyGroup：记录托管键分组已加载。
 */
function markManagedKeyGroup(e) {
  loadedManagedKeyGroups.add(e);
}
//@ chunk-dcmhvw5a.js:414259-414319 placement
/**
 * loadedManagedKeyGroupsList：已加载的托管键分组列表。
 */
function loadedManagedKeyGroupsList() {
  return ["keys", "hook"].filter((e) => loadedManagedKeyGroups.has(e));
}
//@ chunk-dcmhvw5a.js:414319-415380 placement
/**
 * 各模型族对应的默认模型环境变量。
 */
var MODEL_ENV_KEYS_2 = {
  opus: "ANTHROPIC_DEFAULT_OPUS_MODEL",
  sonnet: "ANTHROPIC_DEFAULT_SONNET_MODEL",
  haiku: "ANTHROPIC_DEFAULT_HAIKU_MODEL",
  fable: "ANTHROPIC_DEFAULT_FABLE_MODEL",
};
var MODEL_ENV_KEYS = [
  "ANTHROPIC_BEDROCK_BASE_URL",
  "ANTHROPIC_BEDROCK_MANTLE_BASE_URL",
  "ANTHROPIC_VERTEX_BASE_URL",
  "ANTHROPIC_FOUNDRY_BASE_URL",
];
var PROVIDER_BASE_URL_ENV_KEYS = [
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
var BEDROCK_REGION_ENV_KEYS = [
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
var AWS_ENDPOINT_ENV_KEYS = [
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
var PROVIDER_REGION_ENV_KEYS = [
  ...PROVIDER_BASE_URL_ENV_KEYS,
  "ANTHROPIC_BEDROCK_SERVICE_TIER",
  ...Object.values(MODEL_ENV_KEYS_2),
  "ANTHROPIC_SMALL_FAST_MODEL",
  "ANTHROPIC_SMALL_FAST_MODEL_AWS_REGION",
  "ANTHROPIC_CUSTOM_HEADERS",
];
//@ chunk-dcmhvw5a.js:415380-415775 placement
/**
 * 各提供商 base URL 环境变量。
 */
var PROVIDER_BASE_URL_KEYS_2 = [
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
var PROVIDER_BASE_URL_KEYS = new Set([
  "AWS_ENDPOINT_URL_BEDROCK_RUNTIME",
  "AWS_ENDPOINT_URL_BEDROCK",
  "AWS_ENDPOINT_URL",
]);
//@ chunk-dcmhvw5a.js:415775-416049 placement
function setsProviderEnv(env, env_2) {
  let r = new Set([...PROVIDER_ENV_FLAGS, "CLAUDE_CODE_USE_GATEWAY"]);
  let s = new Set([...PROVIDER_BASE_URL_KEYS_2, "ANTHROPIC_BASE_URL"]);
  let a = env_2?.CLAUDE_CODE_USE_BEDROCK === "1";
  return Object.entries(env ?? {}).some(([key, value]) => {
    let upper = key.toUpperCase();
    return (
      (r.has(upper) && isEnvTruthy(value)) ||
      (s.has(upper) && value.trim() !== "" && (a || !PROVIDER_BASE_URL_KEYS.has(upper)))
    );
  });
}
//@ chunk-dcmhvw5a.js:416049-416110 placement
var RETRYABLE_UNAVAILABLE_ERRNOS = new Set(["EBUSY", "EMFILE", "ENFILE", "EAGAIN", "EINTR"]);
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
function isUnavailableError(e) {
  return e.code === "Unavailable" || ("telemetryCode" in e && isUnavailableErrorCode(e.telemetryCode));
}
//@ chunk-dcmhvw5a.js:416283-416534 placement
/**
 * 找出拼写相近的名字。
 */
function similarNames(e, n, r) {
  let a = new Set();
  let c = [];
  for (let g of n) {
    if (a.has(g)) continue;
    a.add(g);
    if (Math.abs(g.length - e.length) > 2) continue;
    let m = boundedEditDistance(e, g, 2);
    if (m <= 2)
      c.push({
        name: g,
        distance: m,
      });
  }
  return c
    .sort((g, m) => g.distance - m.distance)
    .slice(0, r)
    .map((g) => g.name);
}
//@ chunk-dcmhvw5a.js:416534-416732 placement
/**
 * 按编辑距离建议最接近的名字。
 */
function suggestClosestName(e, n, { maxEditDistance: r = 1 } = {}) {
  let flattened = n.flatMap((g) => [g.name, ...(g.aliases ?? [])]);
  let a;
  let c = r + 1;
  for (let g of flattened) {
    if (Math.abs(g.length - e.length) > r) continue;
    let m = boundedEditDistance(e, g, r);
    if (m < c) {
      c = m;
      a = g;
    }
  }
  return a;
}
//@ chunk-dcmhvw5a.js:416732-417298 placement
/**
 * 有上限的编辑距离。
 */
function boundedEditDistance(e, n, r) {
  if (e === n) return 0;
  let s = e.length;
  let a = n.length;
  let c = r + 1;
  if (Math.abs(s - a) > r) return c;
  let g = new Int32Array(a + 2).fill(c);
  let m = new Int32Array(a + 2).fill(c);
  let f = new Int32Array(a + 2).fill(c);
  for (let j = 0; j <= Math.min(a, r); j++) m[j] = j;
  for (let j = 1; j <= s; j++) {
    let max = Math.max(1, j - r);
    let min = Math.min(a, j + r);
    f[max - 1] = max === 1 ? Math.min(j, c) : c;
    let S = f[max - 1];
    for (let C = max; C <= min; C++) {
      let min = Math.min(m[C] + 1, f[C - 1] + 1, m[C - 1] + (e[j - 1] === n[C - 1] ? 0 : 1), c);
      if (j > 1 && C > 1 && e[j - 1] === n[C - 2] && e[j - 2] === n[C - 1]) min = Math.min(min, g[C - 2] + 1);
      f[C] = min;
      S = Math.min(S, min);
    }
    f[min + 1] = c;
    if (S > r) return c;
    [g, m, f] = [m, f, g];
  }
  return m[a];
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
