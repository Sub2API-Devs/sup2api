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
import { Vpe } from "../../../vendor/ignore/index.js";
import { fromEnum, lit } from "../analytics/safeMetadata.js";
import { DoctorLazy } from "../../cli/handlers/util.js";
import { o, Ue, u, U, A, E } from "../../../vendor/zod/v4/classic/schemas.js";
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
function Yie(e) {
  return isDiskless() && !(isStorageV5Enabled() && e !== void 0);
}
//@ chunk-82kqcve8.js:8501-8520 placement
var Kt = Re(Vpe(), 1);
//@ chunk-82kqcve8.js:8828-8975 placement
function isPathAbsoluteSameOrigin(e) {
  if (!e.startsWith("/")) return !1;
  try {
    return new URL(e, "https://sentinel.invalid").origin === "https://sentinel.invalid";
  } catch {
    return !1;
  }
}
/**
 * 由记忆库路径的最后一段派生挂载名（非 [A-Za-z0-9_-] 替换为 -），为空或 ./.. 时抛错。
 */
//@ chunk-82kqcve8.js:8975-9260 placement
function deriveMountName(e) {
  let replaced = e.replace(/\/+$/, ""),
    sliced = replaced.slice(replaced.lastIndexOf("/") + 1);
  if (sliced === "") throw Error(`cannot derive mount name from path: ${e}`);
  let replaced_2 = sliced.replace(/[^A-Za-z0-9_-]/g, "-");
  if (replaced_2 === "" || replaced_2 === "." || replaced_2 === "..")
    throw Error(`derived mount name is not a valid path segment: ${sliced}`);
  return replaced_2;
}
//@ chunk-82kqcve8.js:9260-9467 placement
var MOUNT_NAME_RULE_MESSAGE = "mount must match /^[A-Za-z0-9_-]+$/",
  STORE_KIND_LABELS = [
    "public_projects",
    "silo",
    "channel",
    "team-shared",
    "space-shared",
    "project",
    "slack",
    "dm",
  ],
  STORE_KIND_PREFIXES = [
    ["project_", "project_*"],
    ["silo_", "silo_*"],
    ["slack_", "slack_*"],
  ];
/**
 * 把记忆存储种类映射为遥测值：精确匹配或按前缀匹配，否则为 other。
 */
//@ chunk-82kqcve8.js:9467-9592 placement
function getStoreKindTelemetry(e) {
  let found = STORE_KIND_LABELS.find((s) => s === e);
  if (found) return fromEnum(found);
  let found_2 = STORE_KIND_PREFIXES.find(([s]) => e.startsWith(s));
  return found_2 ? fromEnum(found_2[1]) : lit("other");
}
/**
 * CLAUDE_MEMORY_STORES 条目的 schema：路径或 {path, mode, scope, mount, promptIndex, skillsDirs(末段须为 skills), promptIndexMaxBytes}。
 */
//@ chunk-82kqcve8.js:9592-10209 placement
var storePathSchema = DoctorLazy(() =>
    o()
      .min(1)
      .refine(isPathAbsoluteSameOrigin, {
        message: "path must be path-absolute and must not override the host",
      }),
  ),
  MAX_SKILLS_DIRS = 10,
  relativeSegmentsSchema = DoctorLazy(() =>
    o()
      .min(1)
      .refine(isValidRelativeSegments, {
        message: "segments must match [A-Za-z0-9._-]+ and must not be . or ..",
      }),
  ),
  memoryStoreEntrySchema = DoctorLazy(() =>
    Ue([
      storePathSchema(),
      u({
        path: storePathSchema(),
        mode: U(["rw", "ro"]).default("rw"),
        scope: U(["user", "team"]).default("team"),
        mount: o()
          .min(1)
          .refine((e) => /^[A-Za-z0-9_-]+$/.test(e), { message: MOUNT_NAME_RULE_MESSAGE })
          .optional(),
        promptIndex: relativeSegmentsSchema().optional(),
        skillsDirs: A(
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
/**
 * 相对路径各段是否只含安全字符且不是 . 或 ..。
 */
//@ chunk-82kqcve8.js:10209-10329 placement
function isValidRelativeSegments(e) {
  if (e.length === 0) return !1;
  return e.split("/").every((r) => /^[A-Za-z0-9._-]+$/.test(r) && r !== "." && r !== "..");
}
/**
 * 解析 CLAUDE_MEMORY_STORES 环境变量（多 store 记忆同步配置），未设置返回 null。
 */
//@ chunk-82kqcve8.js:10329-10551 placement
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
  let safeParse = A(memoryStoreEntrySchema()).safeParse(e);
  if (!safeParse.success) throw Error(`${n} failed validation: ${safeParse.error.message}`);
  let s = [],
    h = new Set(),
    y = !1;
  for (let w of safeParse.data) {
    let S = typeof w === "string" ? { path: w, mode: "rw", scope: "team" } : w,
      R = S.mount ?? deriveMountName(S.path);
    if (h.has(R)) throw Error(`${n} has duplicate mount: ${R}`);
    if ((h.add(R), S.scope === "user")) {
      if (y) throw Error(`${n} has more than one scope:"user" entry`);
      y = !0;
    }
    s.push({
      path: S.path,
      mode: S.mode,
      scope: S.scope,
      mount: R,
      ...(S.promptIndex !== void 0 && { promptIndex: S.promptIndex }),
      ...(S.promptIndexMaxBytes !== void 0 && { promptIndexMaxBytes: S.promptIndexMaxBytes }),
      ...(S.skillsDirs !== void 0 && S.skillsDirs.length > 0 && { skillsDirs: S.skillsDirs }),
    });
  }
  if (s.length === 0) return null;
  return (
    logForDebugging(
      `memory-stores: parsed ${s.length} store(s): ` + s.map((w) => `${w.mount}(${w.mode})`).join(", "),
      { level: "debug" },
    ),
    s
  );
}
//@ chunk-82kqcve8.js:11364-11415 placement
function jEn() {
  try {
    return parseMemoryStoresEnv();
  } catch {
    return null;
  }
}
//@ chunk-82kqcve8.js:11415-11450 placement
function ys() {
  return getOrgMemoryAuthBlocker() === void 0;
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
  if (!isOrgMemoryEligible()) return "closed";
  if (isPolicyVerdictUnobtainable()) {
    if (isPrincipalSeenUnderHipaa()) return "closed";
  } else if (isPolicyVerdictAbsent()) return "held";
  return isPolicyAllowed("allow_memory_sync") ? "open" : "closed";
}
//@ chunk-82kqcve8.js:11750-11785 placement
function Dn() {
  return getOrgMemoryPolicyState() === "open";
}
//@ chunk-82kqcve8.js:11785-11817 placement
function _r() {
  return isOrgMemoryEligible() && isPolicyVerdictAbsent();
}
/**
 * 组织记忆是否可用：未被环境变量/安全模式禁用、tengu_haze_glass 开启、未配置 CLAUDE_MEMORY_STORES、无会话入口令牌，且为订阅用户或有记忆 API 覆盖。
 */
//@ chunk-82kqcve8.js:11817-12035 placement
function isOrgMemoryEligible() {
  if (env.CLAUDE_CODE_DISABLE_ORG_MEMORY) return !1;
  if (isSafeMode()) return !1;
  if (!getFeatureValue_CACHED_MAY_BE_STALE("tengu_haze_glass", !1)) return !1;
  if (process.env.CLAUDE_MEMORY_STORES?.trim()) return !1;
  if (getSessionIngressAuthToken() !== null) return !1;
  return ys() && (isClaudeAISubscriber() || hasMemoryApiOverride());
}

export {
  Kt,
  Yie,
  Dn,
  validateMemoryStores,
  isValidRelativeSegments,
  getOrgMemoryPolicyState,
  _r,
  parseMemoryStoresEnv,
  jEn,
  getStoreKindTelemetry,
};
