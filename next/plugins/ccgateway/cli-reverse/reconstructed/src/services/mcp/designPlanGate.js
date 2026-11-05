/**
 * services/mcp/designPlanGate.ts
 *
 * 2.1.316 新增。设计计划（plan_token）门控。
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * new in 2.1.318 (2.1.88 has no file at this path)
 * pieces: chunk-d57g06xv.js (42)
 * attribution: placement 37, layout 5
 */
import { randomBytes } from "crypto";
import { DoctorLazy } from "../../cli/handlers/util.js";
import { objectSchema, stringSchema, array } from "../../../vendor/zod/v4/classic/schemas.js";
import { normalizeFullWidthSpace } from "../../utils/stringUtils.js";
import { jsonStringify, jsonParse } from "../../utils/slowOperations.js";
import { deferInit } from "../../../runtime/deferred-init.js";

//@ chunk-d57g06xv.js:339-682 placement
/**
 * Design 工具的会话状态：会话 id、初始化与发现请求、目录哈希、已批准计划、项目授权与重新确认、计划存储与同意缓存。
 */
class DesignGateState {
  cachedSessionId = null;
  initialized = false;
  initializeInFlight = null;
  discoverInFlight = null;
  servedCatalogHashes = new Map();
  approvedPlans = new Map();
  verifiedProjectGrants = new Set();
  recardAllProjects = false;
  recardProjects = new Set();
  grantIneligibleProjects = new Set();
  planStore = new Map();
  consentCache = null;
  consentFetch = null;
  consentCacheGeneration = 0;
  grantsFetch = null;
}
//@ chunk-d57g06xv.js:719-843 placement
var designPlanSchema; // deferred: uses DoctorLazy (../../cli/handlers/util.js) of its import cycle while loading; runs once the cycle is complete
var PLAN_TOKEN_REGEX;
deferInit("chunk-d57g06xv.js:719", () => {
  designPlanSchema = DoctorLazy(() =>
    objectSchema({
      projectId: stringSchema(),
      writes: array(stringSchema()),
      deletes: array(stringSchema()),
      localDir: stringSchema().optional(),
    }),
  );
  PLAN_TOKEN_REGEX = /^plan_[a-z0-9]{1,16}_[a-f0-9]{12}$/;
});
//@ chunk-d57g06xv.js:843-970 placement
function newPlanToken(projectId) {
  let projectSlug =
    projectId
      .toLowerCase()
      .replace(/[^a-z0-9]/g, "")
      .slice(0, 16) || "anon";
  let str = randomBytes(6).toString("hex");
  return `plan_${projectSlug}_${str}`;
}
//@ chunk-d57g06xv.js:970-1063 placement
/**
 * 规范化计划路径（反斜杠转 /、去掉空段与 .）。
 */
function normalizePlanPath(path) {
  return path
    .replace(/\\/g, "/")
    .split("/")
    .filter((segment) => segment !== "" && segment !== ".")
    .join("/");
}
//@ chunk-d57g06xv.js:1063-1308 layout
var FULLWIDTH_MAP_PAIRS = [
  [/[\u2018\u2019\u201A\u201B\u2039\u203A]/g, "'"],
  [/[\u201C\u201D\u201E\u201F\u00AB\u00BB]/g, '"'],
  [/[\u2013\u2014]/g, "-"],
  [/\u2026/g, "..."],
  [/[\u00A0\u2000-\u200A\u202F\u205F\u3000]/g, " "],
  [/[\u200B-\u200F\u2028\u2029\u00AD\uFEFF#?]/g, ""],
];
//@ chunk-d57g06xv.js:1308-1456 layout
function planPathKey(planPath) {
  let parts = normalizePlanPath(normalizeFullWidthSpace(planPath)).split("/");
  let reduced = FULLWIDTH_MAP_PAIRS.reduce(
    (acc, [pattern, replacement]) => acc.replace(pattern, replacement),
    parts.pop() ?? "",
  );
  return reduced === "" || reduced === "." || reduced === ".." ? "" : [...parts, reduced].join("/");
}
//@ chunk-d57g06xv.js:1456-1499 placement
/**
 * 判断设计同步路径是否是保留路径（CLAUDE.md 或 .claude 目录）。
 */
function isReservedDesignPath(path) {
  return isClaudeMdPath(normalizePlanPath(path)) || isClaudeMdPath(planPathKey(path));
}
//@ chunk-d57g06xv.js:1499-1627 layout
function isClaudeMdPath(path) {
  let lower = path.toLowerCase();
  return (
    lower === "claude.md" ||
    lower.startsWith("claude.md/") ||
    lower === ".claude" ||
    lower.startsWith(".claude/")
  );
}
//@ chunk-d57g06xv.js:1627-1664 placement
/**
 * 判断模式里是否含 * 或 ? 通配符。
 */
function hasGlobChars(path) {
  return /[*?]/.test(path);
}
//@ chunk-d57g06xv.js:1664-1810 layout
function collisionOf(paths) {
  let byStored = new Map();
  for (let path of paths.map(normalizePlanPath)) {
    let stored = planPathKey(path);
    let firstTyped = byStored.get(stored);
    if (firstTyped !== undefined && firstTyped !== path)
      return {
        stored,
        typed: [firstTyped, path],
      };
    byStored.set(stored, path);
  }
  return;
}
//@ chunk-d57g06xv.js:1810-1861 layout
function normalizePattern(pattern) {
  let normalized = normalizePlanPath(pattern);
  return hasGlobChars(normalized) ? normalized : planPathKey(normalized);
}
//@ chunk-d57g06xv.js:1861-1877 placement
/**
 * 计划路径的最大字符数（256）。
 */
var MAX_GLOB_WILDCARDS = 3;
var MAX_PLAN_PATH_CHARS = 256;
//@ chunk-d57g06xv.js:1877-2276 placement
/**
 * 把 glob 模式转换为正则（** 跨目录、* 与 ? 不跨 /），通配符数量有上限。
 */
function globToRegExp(pattern) {
  let source = "";
  let index = 0;
  let wildcardCount = 0;
  let countWildcard = () => {
    if (++wildcardCount > MAX_GLOB_WILDCARDS)
      throw Error(`glob "${pattern}" exceeds ${MAX_GLOB_WILDCARDS} '*'/'**' wildcards`);
  };
  while (index < pattern.length) {
    let char = pattern.charAt(index);
    if (char === "*" && pattern.charAt(index + 1) === "*") {
      countWildcard();
      if (pattern.charAt(index + 2) === "/") {
        source += "(?:.*/)?";
        index += 3;
      } else {
        source += ".*";
        index += 2;
      }
    } else if (char === "*") {
      countWildcard();
      source += "[^/]*";
      index += 1;
    } else if (char === "?") {
      source += "[^/]";
      index += 1;
    } else if (/[.+^$|()[\]{}\\]/.test(char)) {
      source += "\\" + char;
      index += 1;
    } else {
      source += char;
      index += 1;
    }
  }
  return new RegExp(`^${source}$`);
}
//@ chunk-d57g06xv.js:2276-2514 placement
/**
 * 判断路径是否匹配给定的路径或 glob 列表（拒绝含 .. 或 NUL 的路径）。
 */
function pathMatchesAny(path, patterns) {
  let normalized = planPathKey(path);
  if (!normalized) return false;
  if (normalized.length > MAX_PLAN_PATH_CHARS) return false;
  if (normalized.split("/").includes("..") || normalized.includes("\x00")) return false;
  for (let pattern of patterns) {
    let normalizedPattern = normalizePattern(pattern);
    if (hasGlobChars(normalizedPattern))
      try {
        if (globToRegExp(normalizedPattern).test(normalized)) return true;
      } catch {}
    else if (normalizedPattern === normalized) return true;
  }
  return false;
}
//@ chunk-d57g06xv.js:2514-2871 placement
/**
 * 登记设计同步计划（规范化写入与删除路径并校验 glob），返回计划键。
 */
function registerDesignPlan(session, plan) {
  let normalizedPlan = {
    projectId: plan.projectId,
    writes: plan.writes.map(normalizePattern),
    deletes: plan.deletes.map(normalizePattern),
    ...(plan.localDir !== undefined && {
      localDir: plan.localDir,
    }),
  };
  let parseResult = designPlanSchema().safeParse(normalizedPlan);
  if (!parseResult.success) throw Error("registerPlan: plan failed shape validation");
  for (let pattern of [...parseResult.data.writes, ...parseResult.data.deletes])
    if (hasGlobChars(pattern)) globToRegExp(pattern);
  let planToken = newPlanToken(plan.projectId);
  session.planStore.set(planToken, parseResult.data);
  return planToken;
}
//@ chunk-d57g06xv.js:2871-2947 placement
/**
 * 按令牌取已登记的计划（令牌格式不符返回 null）。
 */
function getPlanByToken(session, token) {
  if (!PLAN_TOKEN_REGEX.test(token)) return null;
  return session.planStore.get(token) ?? null;
}
//@ chunk-d57g06xv.js:2947-3030 placement
/**
 * 规范化项目/计划 id（小写、去 urn:uuid: 前缀与标点）。
 */
function normalizeUuid(uuid) {
  return uuid
    .toLowerCase()
    .replace(/^urn:uuid:/, "")
    .replace(/[{}-]/g, "");
}
//@ chunk-d57g06xv.js:3030-3066 placement
/**
 * 清空计划存储。
 */
function clearPlanStore(state) {
  state.planStore.clear();
}
//@ chunk-d57g06xv.js:3066-3166 placement
/**
 * 清除某个项目的所有设计同步计划。
 */
function clearPlansForProject(session, projectId) {
  let normalizedId = normalizeUuid(projectId);
  for (let [token, plan] of session.planStore)
    if (normalizeUuid(plan.projectId) === normalizedId) session.planStore.delete(token);
}
//@ chunk-d57g06xv.js:3166-3335 placement
/**
 * 设计计划相关上限：批准有效期、卡片可列项目数与名称长度、卡片字符预算、目标路径数，以及路径中不允许的字符。
 */
var PLAN_APPROVAL_TTL_MS = 900000;
var MAX_PLAN_PATHS = 20;
var MAX_PLAN_PATH_CHARS_2 = 80;
var MAX_PLAN_CARD_CHARS = 2000;
var MAX_TARGET_PATHS = 256;
var UNSAFE_PATH_CHAR_REGEX =
  /[\x00-\x1f\x7f-\x9f#?,:[\]\u00AD\u061C\u200B-\u200F\u2026\u2028\u2029\u202A-\u202E\u2066-\u2069\uFEFF\uFF0C\uFF1A\uFF3B\uFF3D]/;
//@ chunk-d57g06xv.js:3335-3366 placement
/**
 * 判断路径是否含不安全字符。
 */
function hasUnsafePathChars(path) {
  return UNSAFE_PATH_CHAR_REGEX.test(path);
}
//@ chunk-d57g06xv.js:3366-3580 placement
function planFitsOnCard(paths, paths_2) {
  if (paths.length > MAX_PLAN_PATHS || paths_2.length > MAX_PLAN_PATHS) return false;
  for (let path of [...paths, ...paths_2])
    if (path.length > MAX_PLAN_PATH_CHARS_2 || hasUnsafePathChars(path)) return false;
  let pathListCost = (paths) =>
    paths.length === 0
      ? 0
      : 32 + paths.reduce((acc, path) => acc + path.length, 0) + 2 * Math.max(0, paths.length - 1);
  return 240 + pathListCost(paths) + pathListCost(paths_2) <= MAX_PLAN_CARD_CHARS;
}
//@ chunk-d57g06xv.js:3580-3851 placement
/**
 * 判断项目名列表能否放进批准卡片（数量、名称长度、非法字符与总字符预算）。
 */
function projectsFitOnCard(targets) {
  if (targets === undefined || targets.length === 0 || targets.length > MAX_PLAN_PATHS) return false;
  for (let target of targets)
    if ((jsonStringify(target)?.length ?? 1 / 0) > MAX_PLAN_PATH_CHARS_2 || hasUnsafePathChars(target))
      return false;
  let max = Math.max(0, Math.min(200, Math.floor(1800 / targets.length) - 95));
  let perTargetCost = 44 + (max > 0 ? max + 3 : 0);
  return (
    272 +
      targets.reduce((acc, target) => acc + target.length + perTargetCost, 0) +
      2 * Math.max(0, targets.length - 1) <=
    MAX_PLAN_CARD_CHARS
  );
}
//@ chunk-d57g06xv.js:3851-3908 placement
/**
 * 判断项目 id 是否合法（非空、长度与字符都合适）。
 */
function isValidProjectId(projectId) {
  return (
    projectId.length > 0 &&
    jsonStringify(projectId).length <= MAX_PLAN_PATH_CHARS_2 &&
    !hasUnsafePathChars(projectId)
  );
}
//@ chunk-d57g06xv.js:3908-3978 placement
/**
 * 需要重新铸币的成员管理类方法集合。
 */
var MEMBERSHIP_METHODS; // deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
deferInit("chunk-d57g06xv.js:3908", () => {
  MEMBERSHIP_METHODS = new Set(["update_sharing", "add_member", "update_member_role"]);
});
//@ chunk-d57g06xv.js:3978-4086 placement
/**
 * 清除某个项目的已批准设计计划。
 */
function clearApprovedPlans(session, projectId) {
  let normalizedId = normalizeUuid(projectId);
  for (let [token, plan] of session.approvedPlans)
    if (normalizeUuid(plan.projectId) === normalizedId) session.approvedPlans.delete(token);
}
//@ chunk-d57g06xv.js:4086-4126 placement
/**
 * 清空所有已批准计划。
 */
function clearApprovedPlansAll(state) {
  state.approvedPlans.clear();
}
//@ chunk-d57g06xv.js:4126-4219 placement
/**
 * 标记项目已在云端验证过授权。
 */
function markProjectGrantVerified(session, projectId) {
  if (typeof projectId !== "string" || projectId.length === 0) return;
  session.verifiedProjectGrants.add(projectId);
}
//@ chunk-d57g06xv.js:4219-4275 placement
/**
 * 项目是否已验证过授权。
 */
function isProjectGrantVerified(session, projectId) {
  return session.verifiedProjectGrants.has(projectId);
}
//@ chunk-d57g06xv.js:4275-4387 placement
/**
 * 清除某个项目的已验证授权。
 */
function clearVerifiedProjectGrant(session, projectId) {
  let normalizedId = normalizeUuid(projectId);
  for (let verifiedProjectGrant of session.verifiedProjectGrants)
    if (normalizeUuid(verifiedProjectGrant) === normalizedId)
      session.verifiedProjectGrants.delete(verifiedProjectGrant);
}
//@ chunk-d57g06xv.js:4387-4460 placement
/**
 * 项目是否在需要重新铸币的集合里。
 */
function isRecardProject(session, projectId) {
  return session.recardAllProjects || session.recardProjects.has(normalizeUuid(projectId));
}
//@ chunk-d57g06xv.js:4460-4549 placement
/**
 * 标记项目需要重新铸币。
 */
function markRecardProject(session, projectId) {
  if (typeof projectId !== "string" || projectId.length === 0) return;
  session.recardProjects.add(normalizeUuid(projectId));
}
//@ chunk-d57g06xv.js:4549-4620 placement
/**
 * 清空所有授权并标记全部项目需重新铸币。
 */
function resetGrants(state) {
  state.verifiedProjectGrants.clear();
  state.recardAllProjects = true;
}
//@ chunk-d57g06xv.js:4620-4718 placement
/**
 * 标记项目无法获得授权。
 */
function markGrantIneligibleProject(session, projectId) {
  if (typeof projectId !== "string" || projectId.length === 0) return;
  session.grantIneligibleProjects.add(normalizeUuid(projectId));
}
//@ chunk-d57g06xv.js:4718-4779 placement
/**
 * 项目是否无法获得授权。
 */
function isGrantIneligibleProject(session, projectId) {
  return session.grantIneligibleProjects.has(normalizeUuid(projectId));
}
//@ chunk-d57g06xv.js:4779-5261 placement
/**
 * 记录一个已批准的设计计划令牌：同项目旧批准先清除；项目 id、写/删路径在卡片上可完整显示才接受；过期时间取服务端时间与本地 15 分钟上限的较小者。
 */
function approveDesignPlan(session, token, plan, now = Date.now()) {
  if (typeof token !== "string" || token.length === 0) return false;
  clearApprovedPlans(session, plan.projectId);
  if (!isValidProjectId(plan.projectId) || !planFitsOnCard(plan.writes, plan.deletes)) return false;
  let serverExpiresAtMs = plan.serverExpiresAtMs;
  if (typeof serverExpiresAtMs === "number" && !Number.isFinite(serverExpiresAtMs)) return false;
  if (typeof serverExpiresAtMs === "number" && Number.isFinite(serverExpiresAtMs) && serverExpiresAtMs <= now)
    return false;
  session.approvedPlans.set(token, {
    projectId: plan.projectId,
    writes: new Set(plan.writes.map(normalizePlanPath)),
    deletes: new Set(plan.deletes.map(normalizePlanPath)),
    expiresAt:
      typeof serverExpiresAtMs === "number" && Number.isFinite(serverExpiresAtMs)
        ? Math.min(serverExpiresAtMs, now + PLAN_APPROVAL_TTL_MS)
        : now + PLAN_APPROVAL_TTL_MS,
  });
  return true;
}
//@ chunk-d57g06xv.js:5261-5979 placement
var designPlanTargets = {
  write_files: (input) => {
    let files = input.files;
    if (!Array.isArray(files)) return null;
    let paths = [];
    for (let file of files) {
      let path = file?.path;
      if (typeof path !== "string") return null;
      paths.push(path);
    }
    return {
      targets: paths,
      set: "writes",
    };
  },
  delete_files: (input) => {
    if (input.paths !== undefined && input.files !== undefined) return null;
    let paths = [];
    if (Array.isArray(input.paths)) {
      for (let path of input.paths) {
        if (typeof path !== "string") return null;
        paths.push(path);
      }
      return {
        targets: paths,
        set: "deletes",
      };
    }
    if (Array.isArray(input.files)) {
      for (let file of input.files) {
        let path = file?.path;
        if (typeof path !== "string") return null;
        paths.push(path);
      }
      return {
        targets: paths,
        set: "deletes",
      };
    }
    return null;
  },
  create_support_js: (input) => {
    let path = input.path;
    if (path === undefined || path === "")
      return {
        targets: ["support.js"],
        set: "writes",
      };
    if (typeof path !== "string") return null;
    return {
      targets: [path],
      set: "writes",
    };
  },
};
//@ chunk-d57g06xv.js:5979-6019 placement
/**
 * 判断操作是否属于受计划令牌约束的目标。
 */
function isPlanGatedTarget(operation) {
  return Object.hasOwn(designPlanTargets, operation);
}
//@ chunk-d57g06xv.js:6019-6439 placement
/**
 * 检查设计同步目标路径的问题：非法字符、保留路径或段、无法规范化。
 */
function designPathProblem(path) {
  if (hasUnsafePathChars(path)) return `rejected character in path: ${path}`;
  if (isReservedDesignPath(path)) return `reserved path: ${path}`;
  if (
    normalizePlanPath(path)
      .toLowerCase()
      .split("/")
      .some((segment) => {
        let replaced = segment.replace(/[\s.]+$/, "").replace(/^\s+/, "");
        return replaced === "claude.md" || replaced === ".claude" || /~\d/.test(replaced);
      })
  )
    return `reserved segment: ${path}`;
  let normalized = normalizePlanPath(path);
  if (
    !normalized ||
    normalized.split("/").some((segment) => /^\s*\.\.[\s.]*$/.test(segment)) ||
    normalized.includes("\x00")
  )
    return `path does not normalize: ${path}`;
  return null;
}
//@ chunk-d57g06xv.js:6439-6920 placement
/**
 * 检查设计操作的目标路径是否可走计划批准：操作受计划约束、目标可枚举、数量不超限且路径都合法，否则需要询问。
 */
function checkPlanGatedTargets(operation, input) {
  let extractor = isPlanGatedTarget(operation) ? designPlanTargets[operation] : undefined;
  if (!extractor || !input)
    return {
      outcome: "ask",
      reason: "not a plan-gated operation",
    };
  let extracted = extractor(input);
  if (!extracted)
    return {
      outcome: "ask",
      reason: "target paths unenumerable",
    };
  let { targets, set: targetSet } = extracted;
  if (targets.length === 0)
    return {
      outcome: "ask",
      reason: "no target paths",
      targets,
    };
  if (targets.length > MAX_TARGET_PATHS)
    return {
      outcome: "ask",
      reason: `more than ${MAX_TARGET_PATHS} target paths`,
      targets,
    };
  for (let target of targets) {
    let problem = designPathProblem(target);
    if (problem !== null)
      return {
        outcome: "ask",
        reason: problem,
        targets,
      };
  }
  return {
    outcome: "pass",
    targets,
    set: targetSet,
  };
}
//@ chunk-d57g06xv.js:6920-7701 placement
function checkDesignPlanToken(session, operation, input, now = Date.now()) {
  if (!isPlanGatedTarget(operation) || !input)
    return {
      outcome: "ask",
      reason: "not a plan-gated operation",
    };
  let { plan_token: planToken, project_id: projectId } = input;
  if (typeof planToken !== "string" || typeof projectId !== "string")
    return {
      outcome: "ask",
      reason: "missing plan_token or project_id",
    };
  let approved = session.approvedPlans.get(planToken);
  if (!approved)
    return {
      outcome: "ask",
      reason: "plan_token not approved in this process",
    };
  if (now >= approved.expiresAt) {
    session.approvedPlans.delete(planToken);
    return {
      outcome: "ask",
      reason: "approved plan expired",
    };
  }
  if (approved.projectId !== projectId)
    return {
      outcome: "ask",
      reason: "plan_token is for a different project",
    };
  let targetCheck = checkPlanGatedTargets(operation, input);
  if (targetCheck.outcome !== "pass")
    return {
      outcome: "ask",
      reason: targetCheck.reason,
    };
  let approvedPaths = targetCheck.set === "writes" ? approved.writes : approved.deletes;
  for (let target of targetCheck.targets)
    if (!approvedPaths.has(normalizePlanPath(target)))
      return {
        outcome: "ask",
        reason: `path not in approved plan: ${target}`,
      };
  return {
    outcome: "allow",
  };
}
//@ chunk-d57g06xv.js:7701-8001 placement
/**
 * 从工具结果文本中解析计划令牌与过期时间。
 */
function readPlanTokenFromResult(content) {
  for (let block of content)
    if (block?.type === "text" && typeof block.text === "string")
      try {
        let parsed = jsonParse(block.text);
        let planToken = parsed.plan_token;
        if (typeof planToken !== "string" || planToken.length === 0) return null;
        let expiresAt = parsed.expires_at;
        let expiresAtMs =
          typeof expiresAt === "number" && Number.isFinite(expiresAt * 1000) ? expiresAt * 1000 : null;
        return {
          token: planToken,
          expiresAtMs,
        };
      } catch {
        return null;
      }
  return null;
}
export {
  MEMBERSHIP_METHODS,
  clearApprovedPlans,
  clearPlansForProject,
  clearVerifiedProjectGrant,
  markRecardProject,
  DesignGateState,
  MAX_PLAN_PATH_CHARS_2,
  checkPlanGatedTargets,
  projectsFitOnCard,
  checkDesignPlanToken,
  isRecardProject,
  isProjectGrantVerified,
  markProjectGrantVerified,
  isGrantIneligibleProject,
  readPlanTokenFromResult,
  approveDesignPlan,
  clearApprovedPlansAll,
  resetGrants,
  clearPlanStore,
  markGrantIneligibleProject,
  normalizePattern,
  hasGlobChars,
  MAX_PLAN_PATH_CHARS,
  normalizePlanPath,
  planPathKey,
  collisionOf,
  registerDesignPlan,
  getPlanByToken,
  isReservedDesignPath,
  pathMatchesAny,
};
