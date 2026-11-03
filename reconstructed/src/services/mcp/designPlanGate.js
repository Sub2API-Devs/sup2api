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
import { u, string, array } from "../../../vendor/zod/v4/classic/schemas.js";
import { jsonStringify, jsonParse } from "../../utils/slowOperations.js";

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
var designPlanSchema = DoctorLazy(() =>
  u({
    projectId: string(),
    writes: array(string()),
    deletes: array(string()),
    localDir: string().optional(),
  }),
);
var PLAN_TOKEN_REGEX = /^plan_[a-z0-9]{1,16}_[a-f0-9]{12}$/;
//@ chunk-jp3mzxnv.js:807-934 placement
function newPlanToken(projectId) {
  let t =
    projectId
      .toLowerCase()
      .replace(/[^a-z0-9]/g, "")
      .slice(0, 16) || "anon";
  let str = randomBytes(6).toString("hex");
  return `plan_${t}_${str}`;
}
//@ chunk-jp3mzxnv.js:934-1027 placement
/**
 * 规范化计划路径（反斜杠转 /、去掉空段与 .）。
 */
function normalizePlanPath(e) {
  return e
    .replace(/\\/g, "/")
    .split("/")
    .filter((t) => t !== "" && t !== ".")
    .join("/");
}
//@ chunk-jp3mzxnv.js:1027-1161 placement
/**
 * 判断设计同步路径是否是保留路径（CLAUDE.md 或 .claude 目录）。
 */
function isReservedDesignPath(e) {
  let lower = normalizePlanPath(e).toLowerCase();
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
function hasGlobChars(e) {
  return /[*?]/.test(e);
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
function globToRegExp(e) {
  let t = "";
  let n = 0;
  let s = 0;
  let r = () => {
    if (++s > MAX_GLOB_WILDCARDS) throw Error(`glob "${e}" exceeds ${MAX_GLOB_WILDCARDS} '*'/'**' wildcards`);
  };
  while (n < e.length) {
    let i = e.charAt(n);
    if (i === "*" && e.charAt(n + 1) === "*") {
      r();
      if (e.charAt(n + 2) === "/") {
        t += "(?:.*/)?";
        n += 3;
      } else {
        t += ".*";
        n += 2;
      }
    } else if (i === "*") {
      r();
      t += "[^/]*";
      n += 1;
    } else if (i === "?") {
      t += "[^/]";
      n += 1;
    } else if (/[.+^$|()[\]{}\\]/.test(i)) {
      t += "\\" + i;
      n += 1;
    } else {
      t += i;
      n += 1;
    }
  }
  return new RegExp(`^${t}$`);
}
//@ chunk-jp3mzxnv.js:1613-1849 placement
/**
 * 判断路径是否匹配给定的路径或 glob 列表（拒绝含 .. 或 NUL 的路径）。
 */
function pathMatchesAny(e, t) {
  let n = normalizePlanPath(e);
  if (!n) return false;
  if (n.length > MAX_PLAN_PATH_CHARS) return false;
  if (n.split("/").includes("..") || n.includes("\x00")) return false;
  for (let s of t) {
    let r = normalizePlanPath(s);
    if (hasGlobChars(r))
      try {
        if (globToRegExp(r).test(n)) return true;
      } catch {}
    else if (r === n) return true;
  }
  return false;
}
//@ chunk-jp3mzxnv.js:1849-2204 placement
/**
 * 登记设计同步计划（规范化写入与删除路径并校验 glob），返回计划键。
 */
function registerDesignPlan(e, t) {
  let n = {
    projectId: t.projectId,
    writes: t.writes.map(normalizePlanPath),
    deletes: t.deletes.map(normalizePlanPath),
    ...(t.localDir !== undefined && {
      localDir: t.localDir,
    }),
  };
  let s = designPlanSchema().safeParse(n);
  if (!s.success) throw Error("registerPlan: plan failed shape validation");
  for (let i of [...s.data.writes, ...s.data.deletes]) if (hasGlobChars(i)) globToRegExp(i);
  let planToken = newPlanToken(t.projectId);
  e.planStore.set(planToken, s.data);
  return planToken;
}
//@ chunk-jp3mzxnv.js:2204-2280 placement
/**
 * 按令牌取已登记的计划（令牌格式不符返回 null）。
 */
function getPlanByToken(e, t) {
  if (!PLAN_TOKEN_REGEX.test(t)) return null;
  return e.planStore.get(t) ?? null;
}
//@ chunk-jp3mzxnv.js:2280-2363 placement
/**
 * 规范化项目/计划 id（小写、去 urn:uuid: 前缀与标点）。
 */
function normalizeUuid(e) {
  return e
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
function clearPlansForProject(e, projectId) {
  let n = normalizeUuid(projectId);
  for (let [s, r] of e.planStore) if (normalizeUuid(r.projectId) === n) e.planStore.delete(s);
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
function hasUnsafePathChars(e) {
  return UNSAFE_PATH_CHAR_REGEX.test(e);
}
//@ chunk-jp3mzxnv.js:2699-2913 placement
function planFitsOnCard(writes, deletes) {
  if (writes.length > MAX_PLAN_PATHS || deletes.length > MAX_PLAN_PATHS) return false;
  for (let r of [...writes, ...deletes])
    if (r.length > MAX_PLAN_PATH_CHARS_2 || hasUnsafePathChars(r)) return false;
  let n = (r) =>
    r.length === 0 ? 0 : 32 + r.reduce((acc, l) => acc + l.length, 0) + 2 * Math.max(0, r.length - 1);
  return 240 + n(writes) + n(deletes) <= MAX_PLAN_CARD_CHARS;
}
//@ chunk-jp3mzxnv.js:2913-3184 placement
/**
 * 判断项目名列表能否放进批准卡片（数量、名称长度、非法字符与总字符预算）。
 */
function projectsFitOnCard(targets) {
  if (targets === undefined || targets.length === 0 || targets.length > MAX_PLAN_PATHS) return false;
  for (let r of targets)
    if ((jsonStringify(r)?.length ?? 1 / 0) > MAX_PLAN_PATH_CHARS_2 || hasUnsafePathChars(r)) return false;
  let max = Math.max(0, Math.min(200, Math.floor(1800 / targets.length) - 95));
  let n = 44 + (max > 0 ? max + 3 : 0);
  return (
    272 + targets.reduce((acc, i) => acc + i.length + n, 0) + 2 * Math.max(0, targets.length - 1) <=
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
var MEMBERSHIP_METHODS = new Set(["update_sharing", "add_member", "update_member_role"]);
//@ chunk-jp3mzxnv.js:3311-3419 placement
/**
 * 清除某个项目的已批准设计计划。
 */
function clearApprovedPlans(e, projectId) {
  let n = normalizeUuid(projectId);
  for (let [s, r] of e.approvedPlans) if (normalizeUuid(r.projectId) === n) e.approvedPlans.delete(s);
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
function markProjectGrantVerified(e, projectId) {
  if (typeof projectId !== "string" || projectId.length === 0) return;
  e.verifiedProjectGrants.add(projectId);
}
//@ chunk-jp3mzxnv.js:3552-3608 placement
/**
 * 项目是否已验证过授权。
 */
function isProjectGrantVerified(e, projectId) {
  return e.verifiedProjectGrants.has(projectId);
}
//@ chunk-jp3mzxnv.js:3608-3720 placement
/**
 * 清除某个项目的已验证授权。
 */
function clearVerifiedProjectGrant(e, projectId) {
  let n = normalizeUuid(projectId);
  for (let verifiedProjectGrant of e.verifiedProjectGrants)
    if (normalizeUuid(verifiedProjectGrant) === n) e.verifiedProjectGrants.delete(verifiedProjectGrant);
}
//@ chunk-jp3mzxnv.js:3720-3793 placement
/**
 * 项目是否在需要重新铸币的集合里。
 */
function isRecardProject(e, projectId) {
  return e.recardAllProjects || e.recardProjects.has(normalizeUuid(projectId));
}
//@ chunk-jp3mzxnv.js:3793-3882 placement
/**
 * 标记项目需要重新铸币。
 */
function markRecardProject(e, projectId) {
  if (typeof projectId !== "string" || projectId.length === 0) return;
  e.recardProjects.add(normalizeUuid(projectId));
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
function markGrantIneligibleProject(e, t) {
  if (typeof t !== "string" || t.length === 0) return;
  e.grantIneligibleProjects.add(normalizeUuid(t));
}
//@ chunk-jp3mzxnv.js:4051-4112 placement
/**
 * 项目是否无法获得授权。
 */
function isGrantIneligibleProject(e, projectId) {
  return e.grantIneligibleProjects.has(normalizeUuid(projectId));
}
//@ chunk-jp3mzxnv.js:4112-4594 placement
/**
 * 记录一个已批准的设计计划令牌：同项目旧批准先清除；项目 id、写/删路径在卡片上可完整显示才接受；过期时间取服务端时间与本地 15 分钟上限的较小者。
 */
function approveDesignPlan(e, token, n, s = Date.now()) {
  if (typeof token !== "string" || token.length === 0) return false;
  clearApprovedPlans(e, n.projectId);
  if (!isValidProjectId(n.projectId) || !planFitsOnCard(n.writes, n.deletes)) return false;
  let serverExpiresAtMs = n.serverExpiresAtMs;
  if (typeof serverExpiresAtMs === "number" && !Number.isFinite(serverExpiresAtMs)) return false;
  if (typeof serverExpiresAtMs === "number" && Number.isFinite(serverExpiresAtMs) && serverExpiresAtMs <= s)
    return false;
  e.approvedPlans.set(token, {
    projectId: n.projectId,
    writes: new Set(n.writes.map(normalizePlanPath)),
    deletes: new Set(n.deletes.map(normalizePlanPath)),
    expiresAt:
      typeof serverExpiresAtMs === "number" && Number.isFinite(serverExpiresAtMs)
        ? Math.min(serverExpiresAtMs, s + PLAN_APPROVAL_TTL_MS)
        : s + PLAN_APPROVAL_TTL_MS,
  });
  return true;
}
//@ chunk-jp3mzxnv.js:4594-5312 placement
var designPlanTargets = {
  write_files: (e) => {
    let files = e.files;
    if (!Array.isArray(files)) return null;
    let n = [];
    for (let file of files) {
      let path = file?.path;
      if (typeof path !== "string") return null;
      n.push(path);
    }
    return {
      targets: n,
      set: "writes",
    };
  },
  delete_files: (e) => {
    if (e.paths !== undefined && e.files !== undefined) return null;
    let t = [];
    if (Array.isArray(e.paths)) {
      for (let path of e.paths) {
        if (typeof path !== "string") return null;
        t.push(path);
      }
      return {
        targets: t,
        set: "deletes",
      };
    }
    if (Array.isArray(e.files)) {
      for (let file of e.files) {
        let path = file?.path;
        if (typeof path !== "string") return null;
        t.push(path);
      }
      return {
        targets: t,
        set: "deletes",
      };
    }
    return null;
  },
  create_support_js: (e) => {
    let path = e.path;
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
function isPlanGatedTarget(e) {
  return Object.hasOwn(designPlanTargets, e);
}
//@ chunk-jp3mzxnv.js:5352-5772 placement
/**
 * 检查设计同步目标路径的问题：非法字符、保留路径或段、无法规范化。
 */
function designPathProblem(target) {
  if (hasUnsafePathChars(target)) return `rejected character in path: ${target}`;
  if (isReservedDesignPath(target)) return `reserved path: ${target}`;
  if (
    normalizePlanPath(target)
      .toLowerCase()
      .split("/")
      .some((n) => {
        let replaced = n.replace(/[\s.]+$/, "").replace(/^\s+/, "");
        return replaced === "claude.md" || replaced === ".claude" || /~\d/.test(replaced);
      })
  )
    return `reserved segment: ${target}`;
  let t = normalizePlanPath(target);
  if (!t || t.split("/").some((n) => /^\s*\.\.[\s.]*$/.test(n)) || t.includes("\x00"))
    return `path does not normalize: ${target}`;
  return null;
}
//@ chunk-jp3mzxnv.js:5772-6253 placement
/**
 * 检查设计操作的目标路径是否可走计划批准：操作受计划约束、目标可枚举、数量不超限且路径都合法，否则需要询问。
 */
function checkPlanGatedTargets(operation, t) {
  let n = isPlanGatedTarget(operation) ? designPlanTargets[operation] : undefined;
  if (!n || !t)
    return {
      outcome: "ask",
      reason: "not a plan-gated operation",
    };
  let s = n(t);
  if (!s)
    return {
      outcome: "ask",
      reason: "target paths unenumerable",
    };
  let { targets, set: i } = s;
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
    let c = designPathProblem(target);
    if (c !== null)
      return {
        outcome: "ask",
        reason: c,
        targets,
      };
  }
  return {
    outcome: "pass",
    targets,
    set: i,
  };
}
//@ chunk-jp3mzxnv.js:6253-7034 placement
function checkDesignPlanToken(e, operation, n, s = Date.now()) {
  if (!isPlanGatedTarget(operation) || !n)
    return {
      outcome: "ask",
      reason: "not a plan-gated operation",
    };
  let { plan_token: planToken, project_id: projectId } = n;
  if (typeof planToken !== "string" || typeof projectId !== "string")
    return {
      outcome: "ask",
      reason: "missing plan_token or project_id",
    };
  let l = e.approvedPlans.get(planToken);
  if (!l)
    return {
      outcome: "ask",
      reason: "plan_token not approved in this process",
    };
  if (s >= l.expiresAt) {
    e.approvedPlans.delete(planToken);
    return {
      outcome: "ask",
      reason: "approved plan expired",
    };
  }
  if (l.projectId !== projectId)
    return {
      outcome: "ask",
      reason: "plan_token is for a different project",
    };
  let c = checkPlanGatedTargets(operation, n);
  if (c.outcome !== "pass")
    return {
      outcome: "ask",
      reason: c.reason,
    };
  let w = c.set === "writes" ? l.writes : l.deletes;
  for (let target of c.targets)
    if (!w.has(normalizePlanPath(target)))
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
  for (let t of content)
    if (t?.type === "text" && typeof t.text === "string")
      try {
        let n = jsonParse(t.text);
        let planToken = n.plan_token;
        if (typeof planToken !== "string" || planToken.length === 0) return null;
        let expiresAt = n.expires_at;
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
