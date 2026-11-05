/**
 * services/orgMemory/memoryStores.ts
 *
 * CLAUDE_MEMORY_STORES 解析与校验（2.1.316 新增）
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * new in 2.1.318 (2.1.88 has no file at this path)
 * pieces: chunk-a2q0x549.js (16), chunk-exfmq47h.js (1)
 * attribution: placement 17
 * (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.
 */
import { isDiskless } from "../../bootstrap/state.js";
import { isStorageV5Enabled } from "../../utils/hoverRest.js";
import { __toESM } from "../../../runtime/bun-runtime.js";
import { require_ignore } from "../../../vendor/ignore/index.js";
import { fromEnum, lit } from "../analytics/safeMetadata.js";
import { DoctorLazy } from "../../cli/handlers/util.js";
import {
  stringSchema,
  union,
  objectSchema,
  _enum,
  array,
  numberSchema,
} from "../../../vendor/zod/v4/classic/schemas.js";
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
import { deferInit } from "../../../runtime/deferred-init.js";

//@ chunk-exfmq47h.js:72102-72148 placement
/**
 * 是否为无盘会话且没有 v5 存储状态。
 */
function isDisklessWithoutState(storageV5) {
  return isDiskless() && !(isStorageV5Enabled() && storageV5 !== undefined);
}
//@ chunk-a2q0x549.js:8577-8596 placement
/**
 * 懒加载记忆库环境变量解析模块。
 */
var memoryStoresEnvModule; // deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
deferInit("chunk-a2q0x549.js:8577", () => {
  memoryStoresEnvModule = __toESM(require_ignore(), 1);
});
//@ chunk-a2q0x549.js:8904-9051 placement
function isPathAbsoluteSameOrigin(path) {
  if (!path.startsWith("/")) return false;
  try {
    return new URL(path, "https://sentinel.invalid").origin === "https://sentinel.invalid";
  } catch {
    return false;
  }
}
//@ chunk-a2q0x549.js:9051-9336 placement
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
//@ chunk-a2q0x549.js:9336-9543 placement
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
//@ chunk-a2q0x549.js:9543-9668 placement
/**
 * 把记忆存储种类映射为遥测值：精确匹配或按前缀匹配，否则为 other。
 */
function getStoreKindTelemetry(mountName) {
  let found = STORE_KIND_LABELS.find((label) => label === mountName);
  if (found) return fromEnum(found);
  let found_2 = STORE_KIND_PREFIXES.find(([prefixEntry]) => mountName.startsWith(prefixEntry));
  return found_2 ? fromEnum(found_2[1]) : lit("other");
}
//@ chunk-a2q0x549.js:9668-10285 placement
/**
 * CLAUDE_MEMORY_STORES 条目的 schema：路径或 {path, mode, scope, mount, promptIndex, skillsDirs(末段须为 skills), promptIndexMaxBytes}。
 */
var storePathSchema; // deferred: uses DoctorLazy (../../cli/handlers/util.js) of its import cycle while loading; runs once the cycle is complete
var MAX_SKILLS_DIRS;
var relativeSegmentsSchema;
var memoryStoreEntrySchema;
deferInit("chunk-a2q0x549.js:9668", () => {
  storePathSchema = DoctorLazy(() =>
    stringSchema().min(1).refine(isPathAbsoluteSameOrigin, {
      message: "path must be path-absolute and must not override the host",
    }),
  );
  MAX_SKILLS_DIRS = 10;
  relativeSegmentsSchema = DoctorLazy(() =>
    stringSchema().min(1).refine(isValidRelativeSegments, {
      message: "segments must match [A-Za-z0-9._-]+ and must not be . or ..",
    }),
  );
  memoryStoreEntrySchema = DoctorLazy(() =>
    union([
      storePathSchema(),
      objectSchema({
        path: storePathSchema(),
        mode: _enum(["rw", "ro"]).default("rw"),
        scope: _enum(["user", "team"]).default("team"),
        mount: stringSchema()
          .min(1)
          .refine((mountName) => /^[A-Za-z0-9_-]+$/.test(mountName), {
            message: MOUNT_NAME_RULE_MESSAGE,
          })
          .optional(),
        promptIndex: relativeSegmentsSchema().optional(),
        skillsDirs: array(
          relativeSegmentsSchema().refine((relativePath) => relativePath.split("/").at(-1) === "skills", {
            message: "the last segment must be 'skills'",
          }),
        )
          .max(MAX_SKILLS_DIRS)
          .optional(),
        promptIndexMaxBytes: numberSchema().int().positive().optional(),
      }),
    ]),
  );
});
//@ chunk-a2q0x549.js:10285-10405 placement
/**
 * 相对路径各段是否只含安全字符且不是 . 或 ..。
 */
function isValidRelativeSegments(segments) {
  if (segments.length === 0) return false;
  return segments
    .split("/")
    .every((segment) => /^[A-Za-z0-9._-]+$/.test(segment) && segment !== "." && segment !== "..");
}
//@ chunk-a2q0x549.js:10405-10627 placement
/**
 * 解析 CLAUDE_MEMORY_STORES 环境变量（多 store 记忆同步配置），未设置返回 null。
 */
function parseMemoryStoresEnv() {
  let CLAUDE_MEMORY_STORES = env.CLAUDE_MEMORY_STORES;
  if (!CLAUDE_MEMORY_STORES) return null;
  let parsed;
  try {
    parsed = jsonParse(CLAUDE_MEMORY_STORES);
  } catch (error) {
    throw Error(
      `CLAUDE_MEMORY_STORES is not valid JSON: ${error instanceof Error ? error.message : String(error)}`,
    );
  }
  return validateMemoryStores(parsed, "CLAUDE_MEMORY_STORES");
}
//@ chunk-a2q0x549.js:10627-11440 placement
function validateMemoryStores(raw, label) {
  let parsed = array(memoryStoreEntrySchema()).safeParse(raw);
  if (!parsed.success) throw Error(`${label} failed validation: ${parsed.error.message}`);
  let stores = [];
  let seenMounts = new Set();
  let sawUserScope = false;
  for (let entry of parsed.data) {
    let store =
      typeof entry === "string"
        ? {
            path: entry,
            mode: "rw",
            scope: "team",
          }
        : entry;
    let mount = store.mount ?? deriveMountName(store.path);
    if (seenMounts.has(mount)) throw Error(`${label} has duplicate mount: ${mount}`);
    seenMounts.add(mount);
    if (store.scope === "user") {
      if (sawUserScope) throw Error(`${label} has more than one scope:"user" entry`);
      sawUserScope = true;
    }
    stores.push({
      path: store.path,
      mode: store.mode,
      scope: store.scope,
      mount,
      ...(store.promptIndex !== undefined && {
        promptIndex: store.promptIndex,
      }),
      ...(store.promptIndexMaxBytes !== undefined && {
        promptIndexMaxBytes: store.promptIndexMaxBytes,
      }),
      ...(store.skillsDirs !== undefined &&
        store.skillsDirs.length > 0 && {
          skillsDirs: store.skillsDirs,
        }),
    });
  }
  if (stores.length === 0) return null;
  logForDebugging(
    `memory-stores: parsed ${stores.length} store(s): ` +
      stores.map((store) => `${store.mount}(${store.mode})`).join(", "),
    {
      level: "debug",
    },
  );
  return stores;
}
//@ chunk-a2q0x549.js:11440-11491 placement
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
//@ chunk-a2q0x549.js:11491-11526 placement
/**
 * 当前没有认证阻塞。
 */
function hasNoAuthBlocker() {
  return getOrgMemoryAuthBlocker() === undefined;
}
//@ chunk-a2q0x549.js:11526-11681 placement
function getOrgMemoryAuthBlocker() {
  if (hasMemoryApiOverride()) return;
  if (!isFirstPartyAnthropicBaseUrl()) return "base_url";
  if (!isClaudeAISubscriber()) return "not_claude_ai";
  if (!hasStoredOAuthToken()) return "no_token";
  if (!(hasOAuthScope(CLAUDE_AI_INFERENCE_SCOPE) && hasOAuthScope(CLAUDE_AI_PROFILE_SCOPE))) return "scope";
  return;
}
//@ chunk-a2q0x549.js:11681-11826 placement
function getOrgMemoryPolicyState() {
  if (!isOrgMemoryEligible_2()) return "closed";
  if (isPolicyVerdictUnobtainable()) {
    if (isPrincipalSeenUnderHipaa()) return "closed";
  } else if (isPolicyVerdictAbsent()) return "held";
  return isPolicyAllowed("allow_memory_sync") ? "open" : "closed";
}
//@ chunk-a2q0x549.js:11826-11861 placement
/**
 * 组织记忆策略是否为 open。
 */
function isOrgMemoryPolicyOpen() {
  return getOrgMemoryPolicyState() === "open";
}
//@ chunk-a2q0x549.js:11861-11893 placement
/**
 * 组织记忆是否可用（资格满足且无策略结论）。
 */
function isOrgMemoryEligible() {
  return isOrgMemoryEligible_2() && isPolicyVerdictAbsent();
}
//@ chunk-a2q0x549.js:11893-12111 placement
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
  tryParseMemoryStoresEnv,
  isDisklessWithoutState,
  isValidRelativeSegments,
  getStoreKindTelemetry,
  parseMemoryStoresEnv,
  isOrgMemoryPolicyOpen,
  validateMemoryStores,
  getOrgMemoryPolicyState,
  isOrgMemoryEligible,
};
