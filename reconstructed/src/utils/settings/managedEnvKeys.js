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
import { ge } from "../identity.js";
import { PROVIDER_ENV_FLAGS } from "../model/modelIds.js";
import { aJt, AWS_CREDENTIAL_ENV_VARS } from "../managedEnvConstants.js";
import { isEnvTruthy } from "../envUtils.js";
import { getPlatform } from "../platform.js";

//@ chunk-dcmhvw5a.js:414034-414077 placement
function GC(e, n) {
  return e == null ? !0 : zn(e, n);
}
//@ chunk-dcmhvw5a.js:414077-414087 placement
var cp = GC;
//@ chunk-dcmhvw5a.js:414199-414233 placement
var up = ge(new Set(), (e) => e.clear());
//@ chunk-dcmhvw5a.js:414233-414259 placement
function hao(e) {
  up.add(e);
}
//@ chunk-dcmhvw5a.js:414259-414319 placement
function Ebr() {
  return ["keys", "hook"].filter((e) => up.has(e));
}
/**
 * 各模型族对应的默认模型环境变量。
 */
//@ chunk-dcmhvw5a.js:414319-415380 placement
var MODEL_ENV_KEYS = {
    opus: "ANTHROPIC_DEFAULT_OPUS_MODEL",
    sonnet: "ANTHROPIC_DEFAULT_SONNET_MODEL",
    haiku: "ANTHROPIC_DEFAULT_HAIKU_MODEL",
    fable: "ANTHROPIC_DEFAULT_FABLE_MODEL",
  },
  VC = [
    "ANTHROPIC_BEDROCK_BASE_URL",
    "ANTHROPIC_BEDROCK_MANTLE_BASE_URL",
    "ANTHROPIC_VERTEX_BASE_URL",
    "ANTHROPIC_FOUNDRY_BASE_URL",
  ],
  pp = [
    ...PROVIDER_ENV_FLAGS,
    "AWS_REGION",
    "AWS_PROFILE",
    ...VC,
    "AWS_BEARER_TOKEN_BEDROCK",
    ...aJt,
    "ANTHROPIC_VERTEX_PROJECT_ID",
    "CLOUD_ML_REGION",
    "ANTHROPIC_FOUNDRY_RESOURCE",
  ],
  KN = [
    ...pp,
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
  ],
  gp = [
    ...PROVIDER_ENV_FLAGS,
    "AWS_BEARER_TOKEN_BEDROCK",
    "AWS_REGION",
    "AWS_DEFAULT_REGION",
    "AWS_PROFILE",
    "CLOUD_ML_REGION",
    "ANTHROPIC_SMALL_FAST_MODEL_AWS_REGION",
    "ANTHROPIC_VERTEX_PROJECT_ID",
    "ANTHROPIC_BEDROCK_SERVICE_TIER",
  ],
  mp = [
    ...pp,
    "ANTHROPIC_BEDROCK_SERVICE_TIER",
    ...Object.values(MODEL_ENV_KEYS),
    "ANTHROPIC_SMALL_FAST_MODEL",
    "ANTHROPIC_SMALL_FAST_MODEL_AWS_REGION",
    "ANTHROPIC_CUSTOM_HEADERS",
  ];
/**
 * 各提供商 base URL 环境变量。
 */
//@ chunk-dcmhvw5a.js:415380-415775 placement
var PROVIDER_BASE_URL_KEYS = [
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
  ],
  JC = new Set(["AWS_ENDPOINT_URL_BEDROCK_RUNTIME", "AWS_ENDPOINT_URL_BEDROCK", "AWS_ENDPOINT_URL"]);
//@ chunk-dcmhvw5a.js:415775-416049 placement
function setsProviderEnv(e, n) {
  let r = new Set([...PROVIDER_ENV_FLAGS, "CLAUDE_CODE_USE_GATEWAY"]),
    s = new Set([...PROVIDER_BASE_URL_KEYS, "ANTHROPIC_BASE_URL"]),
    a = n?.CLAUDE_CODE_USE_BEDROCK === "1";
  return Object.entries(e ?? {}).some(([c, g]) => {
    let upper = c.toUpperCase();
    return (r.has(upper) && isEnvTruthy(g)) || (s.has(upper) && g.trim() !== "" && (a || !JC.has(upper)));
  });
}
//@ chunk-dcmhvw5a.js:416049-416110 placement
var XC = new Set(["EBUSY", "EMFILE", "ENFILE", "EAGAIN", "EINTR"]);
/**
 * 错误码是否表示不可用。
 */
//@ chunk-dcmhvw5a.js:416110-416195 placement
function isUnavailableErrorCode(e) {
  if (e === void 0) return !1;
  return XC.has(e) || (e === "EPERM" && getPlatform() === "windows");
}
/**
 * 错误是否表示不可用。
 */
//@ chunk-dcmhvw5a.js:416195-416283 placement
function isUnavailableError(e) {
  return e.code === "Unavailable" || ("telemetryCode" in e && isUnavailableErrorCode(e.telemetryCode));
}
/**
 * 找出拼写相近的名字。
 */
//@ chunk-dcmhvw5a.js:416283-416534 placement
function similarNames(e, n, r) {
  let a = new Set(),
    c = [];
  for (let g of n) {
    if (a.has(g)) continue;
    if ((a.add(g), Math.abs(g.length - e.length) > 2)) continue;
    let m = boundedEditDistance(e, g, 2);
    if (m <= 2) c.push({ name: g, distance: m });
  }
  return c
    .sort((g, m) => g.distance - m.distance)
    .slice(0, r)
    .map((g) => g.name);
}
/**
 * 按编辑距离建议最接近的名字。
 */
//@ chunk-dcmhvw5a.js:416534-416732 placement
function suggestClosestName(e, n, { maxEditDistance: r = 1 } = {}) {
  let flattened = n.flatMap((g) => [g.name, ...(g.aliases ?? [])]),
    a,
    c = r + 1;
  for (let g of flattened) {
    if (Math.abs(g.length - e.length) > r) continue;
    let m = boundedEditDistance(e, g, r);
    if (m < c) ((c = m), (a = g));
  }
  return a;
}
/**
 * 有上限的编辑距离。
 */
//@ chunk-dcmhvw5a.js:416732-417298 placement
function boundedEditDistance(e, n, r) {
  if (e === n) return 0;
  let s = e.length,
    a = n.length,
    c = r + 1;
  if (Math.abs(s - a) > r) return c;
  let fill = new Int32Array(a + 2).fill(c),
    fill_2 = new Int32Array(a + 2).fill(c),
    fill_3 = new Int32Array(a + 2).fill(c);
  for (let h = 0; h <= Math.min(a, r); h++) fill_2[h] = h;
  for (let h = 1; h <= s; h++) {
    let max = Math.max(1, h - r),
      min = Math.min(a, h + r);
    fill_3[max - 1] = max === 1 ? Math.min(h, c) : c;
    let S = fill_3[max - 1];
    for (let C = max; C <= min; C++) {
      let min = Math.min(
        fill_2[C] + 1,
        fill_3[C - 1] + 1,
        fill_2[C - 1] + (e[h - 1] === n[C - 1] ? 0 : 1),
        c,
      );
      if (h > 1 && C > 1 && e[h - 1] === n[C - 2] && e[h - 2] === n[C - 1])
        min = Math.min(min, fill[C - 2] + 1);
      ((fill_3[C] = min), (S = Math.min(S, min)));
    }
    if (((fill_3[min + 1] = c), S > r)) return c;
    [fill, fill_2, fill_3] = [fill_2, fill_3, fill];
  }
  return fill_2[a];
}

export {
  isUnavailableErrorCode,
  isUnavailableError,
  similarNames,
  suggestClosestName,
  boundedEditDistance,
  Ebr,
  hao,
  cp,
  setsProviderEnv,
  mp,
  gp,
};
