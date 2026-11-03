/**
 * services/orgMemory/memoryStores.ts
 *
 * CLAUDE_MEMORY_STORES 解析与校验（2.1.316 新增）
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-82kqcve8.js (17)
 * attribution: placement 17
 */
import { isDiskless } from "../../bootstrap/state.js";
import { isStorageV5Enabled } from "../../utils/hoverRest.js";
import { Re } from "../../../runtime/bun-runtime.js";
import { require_ignore } from "../../../vendor/ignore/index.js";
import { fromEnum, lit } from "../analytics/safeMetadata.js";
import { DoctorLazy } from "../../cli/handlers/util.js";
import { string, union, u, _enum, array, E } from "../../../vendor/zod/v4/classic/schemas.js";
import { env } from "../../utils/env.js";
import { jsonParse } from "../../utils/slowOperations.js";
import { logForDebugging } from "../../utils/debug.js";
import { hasMemoryApiOverride } from "../../utils/teleport/api.js";
import { isFirstPartyAnthropicBaseUrl } from "../../utils/model/providers.js";
import { isClaudeAISubscriber, hasStoredOAuthToken, hasOAuthScope } from "../../utils/auth.js";
import { CLAUDE_AI_INFERENCE_SCOPE, CLAUDE_AI_PROFILE_SCOPE } from "../../constants/oauth.js";
import {
  isPolicyVerdictUnobtainable,
  isPrincipalSeenUnderHipaa,
  isPolicyVerdictAbsent,
  isPolicyAllowed,
} from "../policyLimits/policyEvidence.js";
import { isSafeMode } from "../../utils/envUtils.js";
import { getFeatureValue_CACHED_MAY_BE_STALE } from "../analytics/growthbook.js";
import { getSessionIngressAuthToken } from "../../utils/sessionIngressAuth.js";

//@ chunk-82kqcve8.js:8454-8501 placement
/**
 * 是否为无盘会话且没有 v5 存储状态。
 */
function isDisklessWithoutState(e) {
  return isDiskless() && !(isStorageV5Enabled() && e !== undefined);
}
//@ chunk-82kqcve8.js:8501-8520 placement
/**
 * 懒加载记忆库环境变量解析模块。
 */
var memoryStoresEnvModule = Re(require_ignore(), 1);
//@ chunk-82kqcve8.js:8828-8975 placement
function isPathAbsoluteSameOrigin(e) {
  if (!e.startsWith("/")) return false;
  try {
    return new URL(e, "https://sentinel.invalid").origin === "https://sentinel.invalid";
  } catch {
    return false;
  }
}
//@ chunk-82kqcve8.js:8975-9260 placement
/**
 * 由记忆库路径的最后一段派生挂载名（非 [A-Za-z0-9_-] 替换为 -），为空或 ./.. 时抛错。
 */
function deriveMountName(path) {
  let replaced = path.replace(/\/+$/, "");
  let sliced = replaced.slice(replaced.lastIndexOf("/") + 1);
  if (sliced === "") throw Error(`cannot derive mount name from path: ${path}`);
  let replaced_2 = sliced.replace(/[^A-Za-z0-9_-]/g, "-");
  if (replaced_2 === "" || replaced_2 === "." || replaced_2 === "..")
    throw Error(`derived mount name is not a valid path segment: ${sliced}`);
  return replaced_2;
}
//@ chunk-82kqcve8.js:9260-9467 placement
var MOUNT_NAME_RULE_MESSAGE = "mount must match /^[A-Za-z0-9_-]+$/";
var STORE_KIND_LABELS = [
  "public_projects",
  "silo",
  "channel",
  "team-shared",
  "space-shared",
  "project",
  "slack",
  "dm",
];
var STORE_KIND_PREFIXES = [
  ["project_", "project_*"],
  ["silo_", "silo_*"],
  ["slack_", "slack_*"],
];
//@ chunk-82kqcve8.js:9467-9592 placement
/**
 * 把记忆存储种类映射为遥测值：精确匹配或按前缀匹配，否则为 other。
 */
function getStoreKindTelemetry(mountName) {
  let found = STORE_KIND_LABELS.find((s) => s === mountName);
  if (found) return fromEnum(found);
  let found_2 = STORE_KIND_PREFIXES.find(([s]) => mountName.startsWith(s));
  return found_2 ? fromEnum(found_2[1]) : lit("other");
}
//@ chunk-82kqcve8.js:9592-10209 placement
/**
 * CLAUDE_MEMORY_STORES 条目的 schema：路径或 {path, mode, scope, mount, promptIndex, skillsDirs(末段须为 skills), promptIndexMaxBytes}。
 */
var storePathSchema = DoctorLazy(() =>
  string().min(1).refine(isPathAbsoluteSameOrigin, {
    message: "path must be path-absolute and must not override the host",
  }),
);
var MAX_SKILLS_DIRS = 10;
var relativeSegmentsSchema = DoctorLazy(() =>
  string().min(1).refine(isValidRelativeSegments, {
    message: "segments must match [A-Za-z0-9._-]+ and must not be . or ..",
  }),
);
var memoryStoreEntrySchema = DoctorLazy(() =>
  union([
    storePathSchema(),
    u({
      path: storePathSchema(),
      mode: _enum(["rw", "ro"]).default("rw"),
      scope: _enum(["user", "team"]).default("team"),
      mount: string()
        .min(1)
        .refine((e) => /^[A-Za-z0-9_-]+$/.test(e), {
          message: MOUNT_NAME_RULE_MESSAGE,
        })
        .optional(),
      promptIndex: relativeSegmentsSchema().optional(),
      skillsDirs: array(
        relativeSegmentsSchema().refine((e) => e.split("/").at(-1) === "skills", {
          message: "the last segment must be 'skills'",
        }),
      )
        .max(MAX_SKILLS_DIRS)
        .optional(),
      promptIndexMaxBytes: E().int().positive().optional(),
    }),
  ]),
);
//@ chunk-82kqcve8.js:10209-10329 placement
/**
 * 相对路径各段是否只含安全字符且不是 . 或 ..。
 */
function isValidRelativeSegments(e) {
  if (e.length === 0) return false;
  return e.split("/").every((r) => /^[A-Za-z0-9._-]+$/.test(r) && r !== "." && r !== "..");
}
//@ chunk-82kqcve8.js:10329-10551 placement
/**
 * 解析 CLAUDE_MEMORY_STORES 环境变量（多 store 记忆同步配置），未设置返回 null。
 */
function parseMemoryStoresEnv() {
  let CLAUDE_MEMORY_STORES = env.CLAUDE_MEMORY_STORES;
  if (!CLAUDE_MEMORY_STORES) return null;
  let n;
  try {
    n = jsonParse(CLAUDE_MEMORY_STORES);
  } catch (error) {
    throw Error(
      `CLAUDE_MEMORY_STORES is not valid JSON: ${error instanceof Error ? error.message : String(error)}`,
    );
  }
  return validateMemoryStores(n, "CLAUDE_MEMORY_STORES");
}
//@ chunk-82kqcve8.js:10551-11364 placement
function validateMemoryStores(e, n) {
  let r = array(memoryStoreEntrySchema()).safeParse(e);
  if (!r.success) throw Error(`${n} failed validation: ${r.error.message}`);
  let s = [];
  let h = new Set();
  let y = false;
  for (let w of r.data) {
    let S =
      typeof w === "string"
        ? {
            path: w,
            mode: "rw",
            scope: "team",
          }
        : w;
    let R = S.mount ?? deriveMountName(S.path);
    if (h.has(R)) throw Error(`${n} has duplicate mount: ${R}`);
    h.add(R);
    if (S.scope === "user") {
      if (y) throw Error(`${n} has more than one scope:"user" entry`);
      y = true;
    }
    s.push({
      path: S.path,
      mode: S.mode,
      scope: S.scope,
      mount: R,
      ...(S.promptIndex !== undefined && {
        promptIndex: S.promptIndex,
      }),
      ...(S.promptIndexMaxBytes !== undefined && {
        promptIndexMaxBytes: S.promptIndexMaxBytes,
      }),
      ...(S.skillsDirs !== undefined &&
        S.skillsDirs.length > 0 && {
          skillsDirs: S.skillsDirs,
        }),
    });
  }
  if (s.length === 0) return null;
  logForDebugging(
    `memory-stores: parsed ${s.length} store(s): ` + s.map((w) => `${w.mount}(${w.mode})`).join(", "),
    {
      level: "debug",
    },
  );
  return s;
}
//@ chunk-82kqcve8.js:11364-11415 placement
/**
 * 尝试解析 CLAUDE_MEMORY_STORES。
 */
function tryParseMemoryStoresEnv() {
  try {
    return parseMemoryStoresEnv();
  } catch {
    return null;
  }
}
//@ chunk-82kqcve8.js:11415-11450 placement
/**
 * 当前没有认证阻塞。
 */
function hasNoAuthBlocker() {
  return getOrgMemoryAuthBlocker() === undefined;
}
//@ chunk-82kqcve8.js:11450-11605 placement
function getOrgMemoryAuthBlocker() {
  if (hasMemoryApiOverride()) return;
  if (!isFirstPartyAnthropicBaseUrl()) return "base_url";
  if (!isClaudeAISubscriber()) return "not_claude_ai";
  if (!hasStoredOAuthToken()) return "no_token";
  if (!(hasOAuthScope(CLAUDE_AI_INFERENCE_SCOPE) && hasOAuthScope(CLAUDE_AI_PROFILE_SCOPE))) return "scope";
  return;
}
//@ chunk-82kqcve8.js:11605-11750 placement
function getOrgMemoryPolicyState() {
  if (!isOrgMemoryEligible_2()) return "closed";
  if (isPolicyVerdictUnobtainable()) {
    if (isPrincipalSeenUnderHipaa()) return "closed";
  } else if (isPolicyVerdictAbsent()) return "held";
  return isPolicyAllowed("allow_memory_sync") ? "open" : "closed";
}
//@ chunk-82kqcve8.js:11750-11785 placement
/**
 * 组织记忆策略是否为 open。
 */
function isOrgMemoryPolicyOpen() {
  return getOrgMemoryPolicyState() === "open";
}
//@ chunk-82kqcve8.js:11785-11817 placement
/**
 * 组织记忆是否可用（资格满足且无策略结论）。
 */
function isOrgMemoryEligible() {
  return isOrgMemoryEligible_2() && isPolicyVerdictAbsent();
}
//@ chunk-82kqcve8.js:11817-12035 placement
/**
 * 组织记忆是否可用：未被环境变量/安全模式禁用、tengu_haze_glass 开启、未配置 CLAUDE_MEMORY_STORES、无会话入口令牌，且为订阅用户或有记忆 API 覆盖。
 */
function isOrgMemoryEligible_2() {
  if (env.CLAUDE_CODE_DISABLE_ORG_MEMORY) return false;
  if (isSafeMode()) return false;
  if (!getFeatureValue_CACHED_MAY_BE_STALE("tengu_haze_glass", false)) return false;
  if (process.env.CLAUDE_MEMORY_STORES?.trim()) return false;
  if (getSessionIngressAuthToken() !== null) return false;
  return hasNoAuthBlocker() && (isClaudeAISubscriber() || hasMemoryApiOverride());
}
export {
  memoryStoresEnvModule,
  isDisklessWithoutState,
  isOrgMemoryPolicyOpen,
  validateMemoryStores,
  isValidRelativeSegments,
  getOrgMemoryPolicyState,
  isOrgMemoryEligible,
  parseMemoryStoresEnv,
  tryParseMemoryStoresEnv,
  getStoreKindTelemetry,
};
