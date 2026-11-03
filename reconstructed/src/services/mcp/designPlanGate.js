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
import { u, o, A } from "../../../vendor/zod/v4/classic/schemas.js";
import { jsonStringify, jsonParse } from "../../utils/slowOperations.js";

/**
 * Design 工具的会话状态：会话 id、初始化与发现请求、目录哈希、已批准计划、项目授权与重新确认、计划存储与同意缓存。
 */
//@ chunk-jp3mzxnv.js:303-646 placement
class DesignGateState {
  cachedSessionId = null;
  initialized = !1;
  initializeInFlight = null;
  discoverInFlight = null;
  servedCatalogHashes = new Map();
  approvedPlans = new Map();
  verifiedProjectGrants = new Set();
  recardAllProjects = !1;
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
    u({ projectId: o(), writes: A(o()), deletes: A(o()), localDir: o().optional() }),
  ),
  PLAN_TOKEN_REGEX = /^plan_[a-z0-9]{1,16}_[a-f0-9]{12}$/;
//@ chunk-jp3mzxnv.js:807-934 placement
function newPlanToken(e) {
  let t =
      e
        .toLowerCase()
        .replace(/[^a-z0-9]/g, "")
        .slice(0, 16) || "anon",
    str = randomBytes(6).toString("hex");
  return `plan_${t}_${str}`;
}
//@ chunk-jp3mzxnv.js:934-1027 placement
function XL(e) {
  return e
    .replace(/\\/g, "/")
    .split("/")
    .filter((t) => t !== "" && t !== ".")
    .join("/");
}
/**
 * 判断设计同步路径是否是保留路径（CLAUDE.md 或 .claude 目录）。
 */
//@ chunk-jp3mzxnv.js:1027-1161 placement
function isReservedDesignPath(e) {
  let lower = XL(e).toLowerCase();
  return (
    lower === "claude.md" ||
    lower.startsWith("claude.md/") ||
    lower === ".claude" ||
    lower.startsWith(".claude/")
  );
}
//@ chunk-jp3mzxnv.js:1161-1198 placement
function WBt(e) {
  return /[*?]/.test(e);
}
//@ chunk-jp3mzxnv.js:1198-1214 placement
var h = 3,
  GBt = 256;
/**
 * 把 glob 模式转换为正则（** 跨目录、* 与 ? 不跨 /），通配符数量有上限。
 */
//@ chunk-jp3mzxnv.js:1214-1613 placement
function globToRegExp(e) {
  let t = "",
    n = 0,
    s = 0,
    r = () => {
      if (++s > h) throw Error(`glob "${e}" exceeds ${h} '*'/'**' wildcards`);
    };
  while (n < e.length) {
    let charAt = e.charAt(n);
    if (charAt === "*" && e.charAt(n + 1) === "*")
      if ((r(), e.charAt(n + 2) === "/")) ((t += "(?:.*/)?"), (n += 3));
      else ((t += ".*"), (n += 2));
    else if (charAt === "*") (r(), (t += "[^/]*"), (n += 1));
    else if (charAt === "?") ((t += "[^/]"), (n += 1));
    else if (/[.+^$|()[\]{}\\]/.test(charAt)) ((t += "\\" + charAt), (n += 1));
    else ((t += charAt), (n += 1));
  }
  return new RegExp(`^${t}$`);
}
/**
 * 判断路径是否匹配给定的路径或 glob 列表（拒绝含 .. 或 NUL 的路径）。
 */
//@ chunk-jp3mzxnv.js:1613-1849 placement
function pathMatchesAny(e, t) {
  let n = XL(e);
  if (!n) return !1;
  if (n.length > GBt) return !1;
  if (n.split("/").includes("..") || n.includes("\x00")) return !1;
  for (let s of t) {
    let r = XL(s);
    if (WBt(r))
      try {
        if (globToRegExp(r).test(n)) return !0;
      } catch {}
    else if (r === n) return !0;
  }
  return !1;
}
/**
 * 登记设计同步计划（规范化写入与删除路径并校验 glob），返回计划键。
 */
//@ chunk-jp3mzxnv.js:1849-2204 placement
function registerDesignPlan(e, t) {
  let n = {
      projectId: t.projectId,
      writes: t.writes.map(XL),
      deletes: t.deletes.map(XL),
      ...(t.localDir !== void 0 && { localDir: t.localDir }),
    },
    safeParse = designPlanSchema().safeParse(n);
  if (!safeParse.success) throw Error("registerPlan: plan failed shape validation");
  for (let i of [...safeParse.data.writes, ...safeParse.data.deletes]) if (WBt(i)) globToRegExp(i);
  let r = newPlanToken(t.projectId);
  return (e.planStore.set(r, safeParse.data), r);
}
//@ chunk-jp3mzxnv.js:2204-2280 placement
function EYn(e, t) {
  if (!PLAN_TOKEN_REGEX.test(t)) return null;
  return e.planStore.get(t) ?? null;
}
//@ chunk-jp3mzxnv.js:2280-2363 placement
function a(e) {
  return e
    .toLowerCase()
    .replace(/^urn:uuid:/, "")
    .replace(/[{}-]/g, "");
}
//@ chunk-jp3mzxnv.js:2363-2399 placement
function bzs(e) {
  e.planStore.clear();
}
/**
 * 清除某个项目的所有设计同步计划。
 */
//@ chunk-jp3mzxnv.js:2399-2499 placement
function clearPlansForProject(e, t) {
  let n = a(t);
  for (let [s, r] of e.planStore) if (a(r.projectId) === n) e.planStore.delete(s);
}
/**
 * 设计计划相关上限：批准有效期、卡片可列项目数与名称长度、卡片字符预算、目标路径数，以及路径中不允许的字符。
 */
//@ chunk-jp3mzxnv.js:2499-2668 placement
var PLAN_APPROVAL_TTL_MS = 900000,
  MAX_PLAN_PATHS = 20,
  MAX_PLAN_PATH_CHARS = 80,
  MAX_PLAN_CARD_CHARS = 2000,
  MAX_TARGET_PATHS = 256,
  UNSAFE_PATH_CHAR_REGEX =
    /[\x00-\x1f\x7f-\x9f#?,:[\]\u00AD\u061C\u200B-\u200F\u2026\u2028\u2029\u202A-\u202E\u2066-\u2069\uFEFF\uFF0C\uFF1A\uFF3B\uFF3D]/;
//@ chunk-jp3mzxnv.js:2668-2699 placement
function d(e) {
  return UNSAFE_PATH_CHAR_REGEX.test(e);
}
//@ chunk-jp3mzxnv.js:2699-2913 placement
function planFitsOnCard(e, t) {
  if (e.length > MAX_PLAN_PATHS || t.length > MAX_PLAN_PATHS) return !1;
  for (let r of [...e, ...t]) if (r.length > MAX_PLAN_PATH_CHARS || d(r)) return !1;
  let n = (r) =>
    r.length === 0 ? 0 : 32 + r.reduce((i, l) => i + l.length, 0) + 2 * Math.max(0, r.length - 1);
  return 240 + n(e) + n(t) <= MAX_PLAN_CARD_CHARS;
}
/**
 * 判断项目名列表能否放进批准卡片（数量、名称长度、非法字符与总字符预算）。
 */
//@ chunk-jp3mzxnv.js:2913-3184 placement
function projectsFitOnCard(e) {
  if (e === void 0 || e.length === 0 || e.length > MAX_PLAN_PATHS) return !1;
  for (let r of e) if ((jsonStringify(r)?.length ?? 1 / 0) > MAX_PLAN_PATH_CHARS || d(r)) return !1;
  let max = Math.max(0, Math.min(200, Math.floor(1800 / e.length) - 95)),
    n = 44 + (max > 0 ? max + 3 : 0);
  return 272 + e.reduce((r, i) => r + i.length + n, 0) + 2 * Math.max(0, e.length - 1) <= MAX_PLAN_CARD_CHARS;
}
//@ chunk-jp3mzxnv.js:3184-3241 placement
function C(e) {
  return e.length > 0 && jsonStringify(e).length <= MAX_PLAN_PATH_CHARS && !d(e);
}
//@ chunk-jp3mzxnv.js:3241-3311 placement
var $ze = new Set(["update_sharing", "add_member", "update_member_role"]);
/**
 * 清除某个项目的已批准设计计划。
 */
//@ chunk-jp3mzxnv.js:3311-3419 placement
function clearApprovedPlans(e, t) {
  let n = a(t);
  for (let [s, r] of e.approvedPlans) if (a(r.projectId) === n) e.approvedPlans.delete(s);
}
//@ chunk-jp3mzxnv.js:3419-3459 placement
function Szs(e) {
  e.approvedPlans.clear();
}
//@ chunk-jp3mzxnv.js:3459-3552 placement
function Uze(e, t) {
  if (typeof t !== "string" || t.length === 0) return;
  e.verifiedProjectGrants.add(t);
}
//@ chunk-jp3mzxnv.js:3552-3608 placement
function vYn(e, t) {
  return e.verifiedProjectGrants.has(t);
}
/**
 * 清除某个项目的已验证授权。
 */
//@ chunk-jp3mzxnv.js:3608-3720 placement
function clearVerifiedProjectGrant(e, t) {
  let n = a(t);
  for (let verifiedProjectGrant of e.verifiedProjectGrants)
    if (a(verifiedProjectGrant) === n) e.verifiedProjectGrants.delete(verifiedProjectGrant);
}
//@ chunk-jp3mzxnv.js:3720-3793 placement
function qAe(e, t) {
  return e.recardAllProjects || e.recardProjects.has(a(t));
}
//@ chunk-jp3mzxnv.js:3793-3882 placement
function F_t(e, t) {
  if (typeof t !== "string" || t.length === 0) return;
  e.recardProjects.add(a(t));
}
//@ chunk-jp3mzxnv.js:3882-3953 placement
function wzs(e) {
  (e.verifiedProjectGrants.clear(), (e.recardAllProjects = !0));
}
//@ chunk-jp3mzxnv.js:3953-4051 placement
function Ezs(e, t) {
  if (typeof t !== "string" || t.length === 0) return;
  e.grantIneligibleProjects.add(a(t));
}
//@ chunk-jp3mzxnv.js:4051-4112 placement
function vzs(e, t) {
  return e.grantIneligibleProjects.has(a(t));
}
/**
 * 记录一个已批准的设计计划令牌：同项目旧批准先清除；项目 id、写/删路径在卡片上可完整显示才接受；过期时间取服务端时间与本地 15 分钟上限的较小者。
 */
//@ chunk-jp3mzxnv.js:4112-4594 placement
function approveDesignPlan(e, t, n, s = Date.now()) {
  if (typeof t !== "string" || t.length === 0) return !1;
  if ((clearApprovedPlans(e, n.projectId), !C(n.projectId) || !planFitsOnCard(n.writes, n.deletes)))
    return !1;
  let serverExpiresAtMs = n.serverExpiresAtMs;
  if (typeof serverExpiresAtMs === "number" && !Number.isFinite(serverExpiresAtMs)) return !1;
  if (typeof serverExpiresAtMs === "number" && Number.isFinite(serverExpiresAtMs) && serverExpiresAtMs <= s)
    return !1;
  return (
    e.approvedPlans.set(t, {
      projectId: n.projectId,
      writes: new Set(n.writes.map(XL)),
      deletes: new Set(n.deletes.map(XL)),
      expiresAt:
        typeof serverExpiresAtMs === "number" && Number.isFinite(serverExpiresAtMs)
          ? Math.min(serverExpiresAtMs, s + PLAN_APPROVAL_TTL_MS)
          : s + PLAN_APPROVAL_TTL_MS,
    }),
    !0
  );
}
//@ chunk-jp3mzxnv.js:4594-5312 placement
var designPlanTargets = {
  write_files: (e) => {
    let files = e.files;
    if (!Array.isArray(files)) return null;
    let n = [];
    for (let s of files) {
      let r = s?.path;
      if (typeof r !== "string") return null;
      n.push(r);
    }
    return { targets: n, set: "writes" };
  },
  delete_files: (e) => {
    if (e.paths !== void 0 && e.files !== void 0) return null;
    let t = [];
    if (Array.isArray(e.paths)) {
      for (let path of e.paths) {
        if (typeof path !== "string") return null;
        t.push(path);
      }
      return { targets: t, set: "deletes" };
    }
    if (Array.isArray(e.files)) {
      for (let file of e.files) {
        let s = file?.path;
        if (typeof s !== "string") return null;
        t.push(s);
      }
      return { targets: t, set: "deletes" };
    }
    return null;
  },
  create_support_js: (e) => {
    let path = e.path;
    if (path === void 0 || path === "") return { targets: ["support.js"], set: "writes" };
    if (typeof path !== "string") return null;
    return { targets: [path], set: "writes" };
  },
};
//@ chunk-jp3mzxnv.js:5312-5352 placement
function D(e) {
  return Object.hasOwn(designPlanTargets, e);
}
/**
 * 检查设计同步目标路径的问题：非法字符、保留路径或段、无法规范化。
 */
//@ chunk-jp3mzxnv.js:5352-5772 placement
function designPathProblem(e) {
  if (d(e)) return `rejected character in path: ${e}`;
  if (isReservedDesignPath(e)) return `reserved path: ${e}`;
  if (
    XL(e)
      .toLowerCase()
      .split("/")
      .some((n) => {
        let replaced = n.replace(/[\s.]+$/, "").replace(/^\s+/, "");
        return replaced === "claude.md" || replaced === ".claude" || /~\d/.test(replaced);
      })
  )
    return `reserved segment: ${e}`;
  let t = XL(e);
  if (!t || t.split("/").some((n) => /^\s*\.\.[\s.]*$/.test(n)) || t.includes("\x00"))
    return `path does not normalize: ${e}`;
  return null;
}
/**
 * 检查设计操作的目标路径是否可走计划批准：操作受计划约束、目标可枚举、数量不超限且路径都合法，否则需要询问。
 */
//@ chunk-jp3mzxnv.js:5772-6253 placement
function checkPlanGatedTargets(e, t) {
  let n = D(e) ? designPlanTargets[e] : void 0;
  if (!n || !t) return { outcome: "ask", reason: "not a plan-gated operation" };
  let s = n(t);
  if (!s) return { outcome: "ask", reason: "target paths unenumerable" };
  let { targets: targets, set: i } = s;
  if (targets.length === 0) return { outcome: "ask", reason: "no target paths", targets: targets };
  if (targets.length > MAX_TARGET_PATHS)
    return { outcome: "ask", reason: `more than ${MAX_TARGET_PATHS} target paths`, targets: targets };
  for (let l of targets) {
    let c = designPathProblem(l);
    if (c !== null) return { outcome: "ask", reason: c, targets: targets };
  }
  return { outcome: "pass", targets: targets, set: i };
}
//@ chunk-jp3mzxnv.js:6253-7034 placement
function checkDesignPlanToken(e, t, n, s = Date.now()) {
  if (!D(t) || !n) return { outcome: "ask", reason: "not a plan-gated operation" };
  let { plan_token: plan_token, project_id: project_id } = n;
  if (typeof plan_token !== "string" || typeof project_id !== "string")
    return { outcome: "ask", reason: "missing plan_token or project_id" };
  let l = e.approvedPlans.get(plan_token);
  if (!l) return { outcome: "ask", reason: "plan_token not approved in this process" };
  if (s >= l.expiresAt)
    return (e.approvedPlans.delete(plan_token), { outcome: "ask", reason: "approved plan expired" });
  if (l.projectId !== project_id) return { outcome: "ask", reason: "plan_token is for a different project" };
  let c = checkPlanGatedTargets(t, n);
  if (c.outcome !== "pass") return { outcome: "ask", reason: c.reason };
  let w = c.set === "writes" ? l.writes : l.deletes;
  for (let target of c.targets)
    if (!w.has(XL(target))) return { outcome: "ask", reason: `path not in approved plan: ${target}` };
  return { outcome: "allow" };
}
/**
 * 从工具结果文本中解析计划令牌与过期时间。
 */
//@ chunk-jp3mzxnv.js:7034-7334 placement
function readPlanTokenFromResult(e) {
  for (let t of e)
    if (t?.type === "text" && typeof t.text === "string")
      try {
        let n = jsonParse(t.text),
          plan_token = n.plan_token;
        if (typeof plan_token !== "string" || plan_token.length === 0) return null;
        let expires_at = n.expires_at,
          i = typeof expires_at === "number" && Number.isFinite(expires_at * 1000) ? expires_at * 1000 : null;
        return { token: plan_token, expiresAtMs: i };
      } catch {
        return null;
      }
  return null;
}

export {
  MAX_PLAN_PATH_CHARS,
  DesignGateState,
  checkPlanGatedTargets,
  projectsFitOnCard,
  checkDesignPlanToken,
  qAe,
  vYn,
  Uze,
  vzs,
  clearApprovedPlans,
  $ze,
  clearPlansForProject,
  clearVerifiedProjectGrant,
  F_t,
  readPlanTokenFromResult,
  approveDesignPlan,
  Szs,
  wzs,
  bzs,
  Ezs,
  XL,
  WBt,
  GBt,
  registerDesignPlan,
  EYn,
  isReservedDesignPath,
  pathMatchesAny,
};
