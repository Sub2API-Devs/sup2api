/**
 * services/mcp/designPlanGate.ts
 *
 * 2.1.316 新增。设计计划（plan_token）门控。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-jp3mzxnv.js (37)
 * attribution: placement 37
 */
import { randomBytes } from "crypto";
import { DoctorLazy } from "../../cli/handlers/util.js";
import { objectSchema, stringSchema, array } from "../../../vendor/zod/v4/classic/schemas.js";
import { jsonStringify, jsonParse } from "../../utils/slowOperations.js";
import { deferInit } from "../../../runtime/deferred-init.js";

//@ chunk-jp3mzxnv.js:303-646 placement
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
//@ chunk-jp3mzxnv.js:683-807 placement
var designPlanSchema; // deferred: uses DoctorLazy (../../cli/handlers/util.js) of its import cycle while loading; runs once the cycle is complete
var PLAN_TOKEN_REGEX;
deferInit("chunk-jp3mzxnv.js:683", () => {
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
//@ chunk-jp3mzxnv.js:807-934 placement
function newPlanToken(projectId) {
  let projectSlug =
    projectId
      .toLowerCase()
      .replace(/[^a-z0-9]/g, "")
      .slice(0, 16) || "anon";
  let str = randomBytes(6).toString("hex");
  return `plan_${projectSlug}_${str}`;
}
//@ chunk-jp3mzxnv.js:934-1027 placement
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
//@ chunk-jp3mzxnv.js:1027-1161 placement
/**
 * 判断设计同步路径是否是保留路径（CLAUDE.md 或 .claude 目录）。
 */
function isReservedDesignPath(path) {
  let lower = normalizePlanPath(path).toLowerCase();
  return (
    lower === "claude.md" ||
    lower.startsWith("claude.md/") ||
    lower === ".claude" ||
    lower.startsWith(".claude/")
  );
}
//@ chunk-jp3mzxnv.js:1161-1198 placement
/**
 * 判断模式里是否含 * 或 ? 通配符。
 */
function hasGlobChars(path) {
  return /[*?]/.test(path);
}
//@ chunk-jp3mzxnv.js:1198-1214 placement
/**
 * 计划路径的最大字符数（256）。
 */
var MAX_GLOB_WILDCARDS = 3;
var MAX_PLAN_PATH_CHARS = 256;
//@ chunk-jp3mzxnv.js:1214-1613 placement
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
//@ chunk-jp3mzxnv.js:1613-1849 placement
/**
 * 判断路径是否匹配给定的路径或 glob 列表（拒绝含 .. 或 NUL 的路径）。
 */
function pathMatchesAny(path, patterns) {
  let normalized = normalizePlanPath(path);
  if (!normalized) return false;
  if (normalized.length > MAX_PLAN_PATH_CHARS) return false;
  if (normalized.split("/").includes("..") || normalized.includes("\x00")) return false;
  for (let pattern of patterns) {
    let normalizedPattern = normalizePlanPath(pattern);
    if (hasGlobChars(normalizedPattern))
      try {
        if (globToRegExp(normalizedPattern).test(normalized)) return true;
      } catch {}
    else if (normalizedPattern === normalized) return true;
  }
  return false;
}
//@ chunk-jp3mzxnv.js:1849-2204 placement
/**
 * 登记设计同步计划（规范化写入与删除路径并校验 glob），返回计划键。
 */
function registerDesignPlan(session, plan) {
  let normalizedPlan = {
    projectId: plan.projectId,
    writes: plan.writes.map(normalizePlanPath),
    deletes: plan.deletes.map(normalizePlanPath),
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
//@ chunk-jp3mzxnv.js:2204-2280 placement
/**
 * 按令牌取已登记的计划（令牌格式不符返回 null）。
 */
function getPlanByToken(session, token) {
  if (!PLAN_TOKEN_REGEX.test(token)) return null;
  return session.planStore.get(token) ?? null;
}
//@ chunk-jp3mzxnv.js:2280-2363 placement
/**
 * 规范化项目/计划 id（小写、去 urn:uuid: 前缀与标点）。
 */
function normalizeUuid(uuid) {
  return uuid
    .toLowerCase()
    .replace(/^urn:uuid:/, "")
    .replace(/[{}-]/g, "");
}
//@ chunk-jp3mzxnv.js:2363-2399 placement
/**
 * 清空计划存储。
 */
function clearPlanStore(state) {
  state.planStore.clear();
}
//@ chunk-jp3mzxnv.js:2399-2499 placement
/**
 * 清除某个项目的所有设计同步计划。
 */
function clearPlansForProject(session, projectId) {
  let normalizedId = normalizeUuid(projectId);
  for (let [token, plan] of session.planStore)
    if (normalizeUuid(plan.projectId) === normalizedId) session.planStore.delete(token);
}
//@ chunk-jp3mzxnv.js:2499-2668 placement
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
//@ chunk-jp3mzxnv.js:2668-2699 placement
/**
 * 判断路径是否含不安全字符。
 */
function hasUnsafePathChars(path) {
  return UNSAFE_PATH_CHAR_REGEX.test(path);
}
//@ chunk-jp3mzxnv.js:2699-2913 placement
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
//@ chunk-jp3mzxnv.js:2913-3184 placement
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
//@ chunk-jp3mzxnv.js:3184-3241 placement
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
//@ chunk-jp3mzxnv.js:3241-3311 placement
/**
 * 需要重新铸币的成员管理类方法集合。
 */
var MEMBERSHIP_METHODS; // deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
deferInit("chunk-jp3mzxnv.js:3241", () => {
  MEMBERSHIP_METHODS = new Set(["update_sharing", "add_member", "update_member_role"]);
});
//@ chunk-jp3mzxnv.js:3311-3419 placement
/**
 * 清除某个项目的已批准设计计划。
 */
function clearApprovedPlans(session, projectId) {
  let normalizedId = normalizeUuid(projectId);
  for (let [token, plan] of session.approvedPlans)
    if (normalizeUuid(plan.projectId) === normalizedId) session.approvedPlans.delete(token);
}
//@ chunk-jp3mzxnv.js:3419-3459 placement
/**
 * 清空所有已批准计划。
 */
function clearApprovedPlansAll(state) {
  state.approvedPlans.clear();
}
//@ chunk-jp3mzxnv.js:3459-3552 placement
/**
 * 标记项目已在云端验证过授权。
 */
function markProjectGrantVerified(session, projectId) {
  if (typeof projectId !== "string" || projectId.length === 0) return;
  session.verifiedProjectGrants.add(projectId);
}
//@ chunk-jp3mzxnv.js:3552-3608 placement
/**
 * 项目是否已验证过授权。
 */
function isProjectGrantVerified(session, projectId) {
  return session.verifiedProjectGrants.has(projectId);
}
//@ chunk-jp3mzxnv.js:3608-3720 placement
/**
 * 清除某个项目的已验证授权。
 */
function clearVerifiedProjectGrant(session, projectId) {
  let normalizedId = normalizeUuid(projectId);
  for (let verifiedProjectGrant of session.verifiedProjectGrants)
    if (normalizeUuid(verifiedProjectGrant) === normalizedId)
      session.verifiedProjectGrants.delete(verifiedProjectGrant);
}
//@ chunk-jp3mzxnv.js:3720-3793 placement
/**
 * 项目是否在需要重新铸币的集合里。
 */
function isRecardProject(session, projectId) {
  return session.recardAllProjects || session.recardProjects.has(normalizeUuid(projectId));
}
//@ chunk-jp3mzxnv.js:3793-3882 placement
/**
 * 标记项目需要重新铸币。
 */
function markRecardProject(session, projectId) {
  if (typeof projectId !== "string" || projectId.length === 0) return;
  session.recardProjects.add(normalizeUuid(projectId));
}
//@ chunk-jp3mzxnv.js:3882-3953 placement
/**
 * 清空所有授权并标记全部项目需重新铸币。
 */
function resetGrants(state) {
  state.verifiedProjectGrants.clear();
  state.recardAllProjects = true;
}
//@ chunk-jp3mzxnv.js:3953-4051 placement
/**
 * 标记项目无法获得授权。
 */
function markGrantIneligibleProject(session, projectId) {
  if (typeof projectId !== "string" || projectId.length === 0) return;
  session.grantIneligibleProjects.add(normalizeUuid(projectId));
}
//@ chunk-jp3mzxnv.js:4051-4112 placement
/**
 * 项目是否无法获得授权。
 */
function isGrantIneligibleProject(session, projectId) {
  return session.grantIneligibleProjects.has(normalizeUuid(projectId));
}
//@ chunk-jp3mzxnv.js:4112-4594 placement
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
//@ chunk-jp3mzxnv.js:4594-5312 placement
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
//@ chunk-jp3mzxnv.js:5312-5352 placement
/**
 * 判断操作是否属于受计划令牌约束的目标。
 */
function isPlanGatedTarget(operation) {
  return Object.hasOwn(designPlanTargets, operation);
}
//@ chunk-jp3mzxnv.js:5352-5772 placement
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
//@ chunk-jp3mzxnv.js:5772-6253 placement
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
//@ chunk-jp3mzxnv.js:6253-7034 placement
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
//@ chunk-jp3mzxnv.js:7034-7334 placement
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
  MAX_PLAN_PATH_CHARS_2,
  DesignGateState,
  checkPlanGatedTargets,
  projectsFitOnCard,
  checkDesignPlanToken,
  isRecardProject,
  isProjectGrantVerified,
  markProjectGrantVerified,
  isGrantIneligibleProject,
  clearApprovedPlans,
  MEMBERSHIP_METHODS,
  clearPlansForProject,
  clearVerifiedProjectGrant,
  markRecardProject,
  readPlanTokenFromResult,
  approveDesignPlan,
  clearApprovedPlansAll,
  resetGrants,
  clearPlanStore,
  markGrantIneligibleProject,
  normalizePlanPath,
  hasGlobChars,
  MAX_PLAN_PATH_CHARS,
  registerDesignPlan,
  getPlanByToken,
  isReservedDesignPath,
  pathMatchesAny,
};
