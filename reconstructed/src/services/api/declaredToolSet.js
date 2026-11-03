/**
 * services/api/declaredToolSet.ts
 *
 * 2.1.316 新增："已声明工具集"：请求中声明的工具在会话内保持稳定（压缩时丢弃、从记录恢复、late tool additions、inline tools 回退）
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-a76knw89.js (58)
 * attribution: placement 58
 */
import { STRUCTUREDOUTPUT } from "../../tools/SyntheticOutputTool/SyntheticOutputTool.js";
import {
  getStickyBetas,
  isToolChangeHeaderRefused,
  isInlineToolsRefused,
  markToolChangeHeaderRefused,
  markBetaHeaderRefused,
  markInlineToolsRefused,
  markToolChangeUnsupportedModel,
} from "../../bootstrap/state.js";
import { MSe, describeToolAvailability, qYr } from "../mcp/mcpToolAvailability.js";
import { mcpInfoFromString, getMcpPrefix } from "../mcp/mcpStringUtils.js";
import { compareToolsByName, getAllBaseToolsFromRegistry, toolMatchesName } from "../../Tool.js";
import { me, ye, TOOL_DEFINITION_FLAG_KEYS, fVt } from "./toolDefinitionShape.js";
import { TOOL_SEARCH_TOOL_NAME } from "../../tools/ToolSearchTool/prompt.js";
import { getDenyRuleIndex } from "../../utils/permissions/permissions.js";
import { logError } from "../../utils/log.js";
import { toError } from "../../utils/errors.js";
import { hasComplianceTaint } from "../policyLimits/complianceTaints.js";
import { PDt, dLn, lT, Lp, eB, Xg, Mbs } from "../../bootstrap/stateSlices.js";
import { logEvent } from "../analytics/index.js";
import { WAITFORMCPSERVERS } from "../../tools/WaitForMcpServersTool/WaitForMcpServersTool.js";
import { qS, l$e } from "./deferredToolsState.js";
import {
  isToolDroppedByDenyRules,
  isToolOmittedByLaunchToolList,
  isOutsideLaunchToolList,
  codeExecutionToolNames,
} from "../../utils/permissions/filterToolsByDenyRules.js";
import { isCodeExecutionTool } from "../mcp/redactMcpErrors.js";
import { getFeatureValue_CACHED_MAY_BE_STALE } from "../analytics/growthbook.js";
import { modelTakesToolAdditions, Lb, LO, tb } from "../../utils/betas.js";
import { Kpr, isInlineToolsEnabled } from "../analytics/growthbookGates.js";
import { getCanonicalName } from "../../utils/model/canonicalModelName.js";
import { logForDebugging } from "../../utils/debug.js";
import { logFeatureSad } from "../analytics/featureTelemetry.js";

/**
 * 取对象上的 cache_control（没有为 undefined）。旧版名 stripCacheControl 为错配。
 */
//@ chunk-a76knw89.js:8006-8070 placement = stripCacheControl (1)
function getCacheControl(items) {
  return "cache_control" in items ? items.cache_control : void 0;
}
/**
 * 去掉对象的 cache_control 字段。
 */
//@ chunk-a76knw89.js:8070-8157 placement = stripCacheControl (1)
function stripCacheControl(items) {
  if (!("cache_control" in items)) return items;
  let { cache_control: cache_control, ...o } = items;
  return o;
}
/**
 * 会话已声明工具名集合（含仅记录的条目与顺序）。
 */
//@ chunk-a76knw89.js:43836-44543 placement
class DeclaredToolSet {
  names;
  recordedOnly;
  recordOrder;
  #e;
  constructor(e, n = { only: new Map(), order: [] }) {
    ((this.names = n.names ?? [...e.map((o) => o.name), ...n.only.keys()]),
      (this.recordedOnly = n.only),
      (this.recordOrder = n.order),
      (this.#e = new Map(e.map((o) => [o.name, o]))));
  }
  has(e) {
    return this.#e.has(e) || this.recordedOnly.has(e);
  }
  keeps(e) {
    return this.has(e) && e !== STRUCTUREDOUTPUT;
  }
  toolFor(e) {
    return this.#e.get(e);
  }
  without(e) {
    return new DeclaredToolSet(
      [...this.#e.values()].filter((n) => !e.has(n.name)),
      {
        only: new Map([...this.recordedOnly].filter(([n]) => !e.has(n))),
        order: this.recordOrder.filter((n) => !e.has(n)),
        names: this.names.filter((n) => !e.has(n)),
      },
    );
  }
  sourceFor(e) {
    let n = this.#e.get(e),
      o = this.recordedOnly.get(e)?.server;
    if (n !== void 0 || o === void 0) return n;
    return getToolNameForPermissionCheck(e, o);
  }
}
//@ chunk-a76knw89.js:44543-44574 placement
function OYo(e) {
  return e ?? getStickyBetas();
}
//@ chunk-a76knw89.js:44574-44645 placement
function DSe(e) {
  let declaredTools = e.declaredTools;
  return declaredTools instanceof DeclaredToolSet ? declaredTools : void 0;
}
//@ chunk-a76knw89.js:44645-44717 placement
function kbn(e) {
  let noChannelTools = e.noChannelTools;
  return noChannelTools instanceof DeclaredToolSet ? noChannelTools : void 0;
}
/**
 * 缓存"无通道工具"计算结果：强制刷新时清空，未开启且未缓存时跳过。
 */
//@ chunk-a76knw89.js:44717-44856 placement
function cacheNoChannelTools(e, n, o) {
  if (n) {
    e.noChannelTools = void 0;
    return;
  }
  if (e.noChannelTools === void 0 && !MSe()) return;
  let r = o();
  return ((e.noChannelTools = r), r);
}
//@ chunk-a76knw89.js:44856-45338 placement
function buildDeclaredToolSet(e, n, o) {
  let r = new Set([...n, ...e].map((y) => y.name)),
    c = new Map([...(o ?? [])].filter(([y]) => !r.has(y)));
  if (c.size === 0) return new DeclaredToolSet(e);
  let s = (y) => y.isMcp === !0 || mcpInfoFromString(y.name) !== null,
    index = e.findIndex(s),
    p = (y, b) =>
      !s(y) && ((y.name === STRUCTUREDOUTPUT && b === e.length - 1) || (index !== -1 && b > index)),
    sorted = [...e.filter(s).map((y) => y.name), ...c.keys()].sort((y, b) =>
      compareToolsByName({ name: y }, { name: b }),
    ),
    T = [
      ...e.filter((y, b) => !s(y) && !p(y, b)).map((y) => y.name),
      ...sorted,
      ...e.filter(p).map((y) => y.name),
    ];
  return new DeclaredToolSet(e, { only: c, order: T, names: T });
}
/**
 * 工具定义比对时关心的键（name/description/input_schema/type 及附加键）。旧版名 buildDiffableContent 为错配；使用方在 chunk-a76knw89 的记录工具比较里。
 */
//@ chunk-a76knw89.js:45338-45405 placement = buildDiffableContent (0.675)
var TOOL_DIFF_KEYS = new Set(["name", "description", "input_schema", "type", ...me]);
//@ chunk-a76knw89.js:45405-46082 placement
async function markReconnectingServers(
  {
    recordedToolDescriptions: recordedToolDescriptions,
    recordedToolServers: recordedToolServers,
    recordedToolEntries: recordedToolEntries,
    mcpClients: mcpClients = [],
    getToolPermissionContext: getToolPermissionContext,
  },
  s,
  u,
) {
  if (recordedToolDescriptions === void 0 || recordedToolDescriptions.has(TOOL_SEARCH_TOOL_NAME) || !MSe())
    return;
  let p = new Set(s.map((k) => k.name)),
    h = [];
  for (let k of recordedToolDescriptions.keys()) {
    let S = recordedToolEntries?.get(k),
      x = recordedToolServers?.get(k);
    if (
      !p.has(k) &&
      u?.has(k) !== !0 &&
      S !== void 0 &&
      x !== void 0 &&
      k.startsWith(getMcpPrefix(x)) &&
      S.name === k &&
      /^[a-zA-Z0-9_-]+$/.test(k) &&
      Object.keys(S).every((w) => TOOL_DIFF_KEYS.has(w))
    )
      h.push({ name: k, entry: S, server: x });
  }
  if (h.length === 0) return;
  let T = await getToolPermissionContext(),
    y = new Map(),
    b;
  for (let { name: k, entry: entry, server: server } of h)
    try {
      if (
        ((b ??= getDenyRuleIndex(T)),
        describeToolAvailability(k, mcpClients, T, getToolNameForPermissionCheck(k, server), b).kind ===
          "reconnecting")
      )
        y.set(k, { entry: entry, server: server });
    } catch (error) {
      logError(toError(error));
    }
  return y.size === 0 ? void 0 : y;
}
//@ chunk-a76knw89.js:46082-46611 placement
async function isHipaaRestricted(
  e,
  n,
  { mcpClients: mcpClients, getPermissionContext: getPermissionContext, byValue: byValue },
) {
  let s = hasDeclaredToolSet(e, n, !0);
  if (s.length === 0) return { kept: e, unread: 0 };
  let u = hasComplianceTaint("hipaa"),
    p = (S) => u && !Re(S, e.sourceFor(S)?.mcpInfo?.serverName),
    h = (S) => byValue?.has(S) === !0 || p(S),
    T;
  try {
    T = await getPermissionContext();
  } catch (error) {
    logError(toError(error));
    let x = new Set(s.filter(h));
    return { kept: x.size === 0 ? e : e.without(x), unread: 0 };
  }
  let y = 0,
    b,
    k = new Set(
      s.filter((S) => {
        if (h(S)) return !0;
        try {
          return (
            (b ??= getDenyRuleIndex(T)),
            qYr(describeToolAvailability(S, mcpClients, T, e.sourceFor(S), b))
          );
        } catch (error) {
          return (logError(toError(error)), y++, !0);
        }
      }),
    );
  return { kept: k.size === 0 ? e : e.without(k), unread: y };
}
//@ chunk-a76knw89.js:46611-46689 placement
function Cqe(e) {
  if (e.agentId && !e.stickyBetas) return;
  return OYo(e.stickyBetas);
}
//@ chunk-a76knw89.js:46689-46750 placement
function Hrt(e) {
  let n = Cqe(e);
  return n === void 0 ? void 0 : DSe(n);
}
//@ chunk-a76knw89.js:46750-46811 placement
function Tbn(e) {
  let n = Cqe(e);
  return n === void 0 ? void 0 : kbn(n);
}
//@ chunk-a76knw89.js:46811-46909 placement
function soi(e, n) {
  if ((PDt(e), e.declaredTools !== void 0 || !MSe())) return !1;
  return (dLn(e, new DeclaredToolSet(n)), !0);
}
/**
 * 决定本次请求的已声明工具（启动时省略、开关关闭等原因）。
 */
//@ chunk-a76knw89.js:46909-47914 placement
function planDeclaredTools(e, n, { servers: o, entries: r } = Ro, c) {
  let s = new Map(n.map((O) => [O.name, O])),
    u,
    p = () => ((u ??= getAllBaseToolsFromRegistry() ?? null), u ?? void 0),
    h = (O) => {
      let M = p()?.find((I) => toolMatchesName(I, O))?.underlyingV1ToolName;
      return M === void 0 ? void 0 : s.get(M);
    },
    T = new Map(),
    y = new Map(),
    b = 0,
    k = 0,
    S = 0,
    x = (O) => {
      return;
    },
    w = [...e];
  for (let O of w) {
    let M = s.get(O) ?? x(O) ?? h(O);
    if (M === void 0) {
      let P = r?.get(O),
        j = o?.get(O);
      if (P === void 0 || isPinnedUpfrontTool(O, j, p())) continue;
      if (isUndeclarableTool(O, j, p(), n)) y.set(O, { entry: P, server: j });
      else {
        let G = describeDeclaredToolsSkipReason(O, p(), c);
        if (G === "launch_omitted") (y.set(O, { entry: P, server: j }), S++);
        else if (G === "gate_off") {
          if ((y.set(O, { entry: P, server: j }), b++, So(O, p()))) k++;
        }
      }
      continue;
    }
    T.set(M.name, M);
    let I = M.underlyingV1ToolName === void 0 ? void 0 : s.get(M.underlyingV1ToolName);
    if (I !== void 0) T.set(I.name, I);
  }
  for (let O of n) if (O.underlyingV1ToolName !== void 0 && T.has(O.underlyingV1ToolName)) T.set(O.name, O);
  for (let O of T.keys()) y.delete(O);
  return T.size === 0 && y.size === 0
    ? void 0
    : {
        held: new DeclaredToolSet(
          n.filter((O) => T.has(O.name)),
          { only: y, order: w },
        ),
        recorded: w.length,
        gateOff: b,
        needsUser: k,
        launchOmitted: S,
      };
}
/**
 * 从记录恢复或首次决定已声明工具集（tengu_declared_tool_set_from_record）。
 */
//@ chunk-a76knw89.js:47914-48419 placement
function resolveDeclaredToolSet(e, n, o, { latch: latch, permissionContext: permissionContext }) {
  let s = DSe(e);
  if (s !== void 0 || e.declaredToolsDecided) return s;
  if (latch) PDt(e);
  if (e.declaredTools !== void 0 || !MSe()) return;
  let u = n(),
    p = u === void 0 ? void 0 : planDeclaredTools(u.names, o, u, permissionContext);
  if (p === void 0 || !latch) return p?.held;
  return (
    dLn(e, p.held),
    logEvent("tengu_declared_tool_set_from_record", {
      recorded: p.recorded,
      held: p.held.names.length - p.held.recordedOnly.size,
      heldByName: p.held.recordedOnly.size,
      heldGateOff: p.gateOff,
      heldNeedsUser: p.needsUser,
      heldLaunchOmitted: p.launchOmitted,
    }),
    p.held
  );
}
//@ chunk-a76knw89.js:48419-48969 placement
function updateDeclaredToolSet(e, n) {
  if (n === void 0) return { tools: e, redeclared: [] };
  let o = new Set(e.map((u) => u.name)),
    r = (u) => (o.has(u) || !n.keeps(u) ? void 0 : n.toolFor(u));
  if (n.names.every((u) => r(u) === void 0)) return { tools: e, redeclared: [] };
  let c = [...e],
    s = [];
  return (
    n.names.forEach((u, p) => {
      let h = r(u);
      if (!h) return;
      let T = -1;
      for (let y = p - 1; y >= 0 && T === -1; y--) {
        let b = n.names[y];
        T = c.findIndex((k) => k.name === b);
      }
      if (T !== -1) c.splice(T + 1, 0, h);
      else {
        let index = c.findIndex((b) => n.has(b.name));
        c.splice(index === -1 ? 0 : index, 0, h);
      }
      (o.add(u), s.push(u));
    }),
    s.length === 0 ? { tools: e, redeclared: s } : { tools: c, redeclared: s }
  );
}
//@ chunk-a76knw89.js:48969-49057 placement
function _nr(e, n) {
  let turnDeniedTools = n.turnDeniedTools;
  return updateDeclaredToolSet(e, turnDeniedTools instanceof DeclaredToolSet ? turnDeniedTools : void 0)
    .tools;
}
//@ chunk-a76knw89.js:49057-49249 placement
function logDeclaredToolsDroppedAtCompaction(e, n) {
  let o = DSe(e);
  if (o === void 0 || n.length === 0) return;
  ((e.declaredTools = o.without(new Set(n))),
    logEvent("tengu_declared_tools_dropped_at_compaction", { dropped: n.length, noDeferredChannel: !1 }));
}
//@ chunk-a76knw89.js:49249-49317 placement
function aoi(e, n) {
  let o = e === void 0 ? void 0 : kbn(e);
  return hasDeclaredToolSet(o, n, !0);
}
//@ chunk-a76knw89.js:49317-49510 placement
function logDeclaredToolsDroppedAtCompaction2(e, n) {
  let o = kbn(e);
  if (o === void 0 || n.length === 0) return;
  ((e.noChannelTools = o.without(new Set(n))),
    logEvent("tengu_declared_tools_dropped_at_compaction", { dropped: n.length, noDeferredChannel: !0 }));
}
//@ chunk-a76knw89.js:49510-49712 placement
function hasDeclaredToolSet(e, n, o) {
  if (e === void 0) return [];
  let r = new Set(n.map((c) => c.name));
  return e.names.filter((c) => {
    if (r.has(c) || !e.keeps(c)) return !1;
    let s = e.sourceFor(c)?.mcpInfo;
    return o || !Re(c, s?.serverName);
  });
}
//@ chunk-a76knw89.js:49712-49751 placement
var Ro = { servers: void 0, entries: void 0 };
//@ chunk-a76knw89.js:49751-49918 placement
function isUndeclarableTool(e, n, o, r) {
  if (e === STRUCTUREDOUTPUT) return !1;
  if (n !== void 0) return !0;
  if (mcpInfoFromString(e) !== null) return !1;
  if (e === WAITFORMCPSERVERS && !r.some((c) => toolMatchesName(c, TOOL_SEARCH_TOOL_NAME))) return !0;
  return o !== void 0 && qS(o, e) === void 0;
}
//@ chunk-a76knw89.js:49918-50326 placement
function describeDeclaredToolsSkipReason(e, n, o) {
  if (o === void 0 || n === void 0) return;
  if (e === STRUCTUREDOUTPUT || e === WAITFORMCPSERVERS || mcpInfoFromString(e) !== null) return;
  let found = n.find((c) => c.name === e);
  if (found === void 0 || found.isMcp === !0) return;
  if (!Co() || hasComplianceTaint("hipaa")) return;
  if (isToolDroppedByDenyRules(o, found))
    return isToolOmittedByLaunchToolList(o, found) ? "launch_omitted" : void 0;
  if (isOutsideLaunchToolList(o, found))
    return o.builtInToolsDisabled === !0 ||
      (o.restricted === !0 &&
        isCodeExecutionTool(codeExecutionToolNames([found]), new Set()).includes(found.name))
      ? void 0
      : "launch_omitted";
  if (found.isEnabled()) return;
  return "gate_off";
}
//@ chunk-a76knw89.js:50326-50409 placement
function So(e, n) {
  return n?.find((o) => o.name === e)?.requiresUserInteraction?.() === !0;
}
//@ chunk-a76knw89.js:50409-50441 placement
var TENGU_GLEAMING_CUPCAKE = "tengu_gleaming_cupcake";
//@ chunk-a76knw89.js:50441-50471 placement
function Co() {
  return getFeatureValue_CACHED_MAY_BE_STALE(TENGU_GLEAMING_CUPCAKE, !0);
}
//@ chunk-a76knw89.js:50471-50500 placement
var TENGU_JOYFUL_ANCHOR = "tengu_joyful_anchor";
//@ chunk-a76knw89.js:50500-50698 placement
function isPinnedUpfrontTool(e, n, o) {
  if (Re(e, n)) return !1;
  let r = getFeatureValue_CACHED_MAY_BE_STALE(TENGU_JOYFUL_ANCHOR, null);
  if (!Array.isArray(r) || r.length === 0) return !1;
  let c = o?.find((s) => toolMatchesName(s, e));
  return r.some((s) => typeof s === "string" && (s === e || (c !== void 0 && toolMatchesName(c, s))));
}
//@ chunk-a76knw89.js:50698-50803 placement = getToolNameForPermissionCheck (1)
function getToolNameForPermissionCheck(e, n) {
  let o = getMcpPrefix(n);
  return { mcpInfo: { serverName: n, toolName: e.startsWith(o) ? e.slice(o.length) : e } };
}
//@ chunk-a76knw89.js:50803-50852 placement
function Re(e, n) {
  return n !== void 0 || mcpInfoFromString(e) !== null;
}
//@ chunk-a76knw89.js:50852-51486 placement
function computeLateToolAdditions(
  e,
  n,
  {
    pool: pool,
    keptDeferred: keptDeferred,
    keepMcp: keepMcp,
    requestCarriesStructuredOutputs: requestCarriesStructuredOutputs,
    requestDeclaresSearchCitations: requestDeclaresSearchCitations,
    recordedEntries: recordedEntries,
  },
) {
  let h = new Set(
    isLateToolAdditionsEnabled(n, { pool: pool, keptDeferred: keptDeferred, keepMcp: keepMcp }),
  );
  if (h.size === 0) return [];
  let T = new Set(e.map(mergeClients_2)),
    recordOrder = n.recordOrder,
    b = { strict: requestCarriesStructuredOutputs, eager: ye(e), citations: requestDeclaresSearchCitations },
    k = [];
  return (
    recordOrder.forEach((S, x) => {
      let w = n.recordedOnly.get(S);
      if (w === void 0 || T.has(S) || !h.has(S)) return;
      let O = recordedEntries?.get(S) ?? w.entry,
        M = -1;
      for (let I = x - 1; I >= 0 && M === -1; I--) {
        let P = recordOrder[I];
        if (T.has(P)) M = e.findIndex((j) => mergeClients_2(j) === P) + 1;
      }
      if (M === -1) {
        let I = new Set(recordOrder),
          index = e.findIndex((j) => I.has(mergeClients_2(j) ?? ""));
        M = index === -1 ? 0 : index;
      }
      (e.splice(M, 0, TOOL_DEFINITION_FLAG_KEYS(O, b)), T.add(S), k.push(S));
    }),
    k
  );
}
//@ chunk-a76knw89.js:51486-51695 placement
function isLateToolAdditionsEnabled(e, { pool: pool, keptDeferred: keptDeferred, keepMcp: keepMcp }) {
  let c = new Set([...pool.map((s) => s.name), ...keptDeferred]);
  return e.recordOrder.filter((s) => {
    let u = e.recordedOnly.get(s);
    return u !== void 0 && !c.has(s) && (keepMcp || !Re(s, u.server));
  });
}
//@ chunk-a76knw89.js:51695-51767 placement = mergeClients (1)
function mergeClients_2(e) {
  return "name" in e && typeof e.name === "string" ? e.name : void 0;
}
//@ chunk-a76knw89.js:51767-51795 placement
function coi() {
  return l$e();
}
//@ chunk-a76knw89.js:51795-51885 placement
function uoi(e) {
  let n = new Set();
  for (let o of e) {
    let r = mergeClients_2(o);
    if (r !== void 0) n.add(r);
  }
  return n;
}
//@ chunk-a76knw89.js:51885-52282 placement
function logDeclaredToolSetHeld(e) {
  if (e.deferredLate === 0 && e.redeclared === 0 && e.fromRecord === 0 && e.unclassifiedDepartures === 0)
    return;
  logEvent("tengu_declared_tool_set_held", {
    deferredLate: e.deferredLate,
    redeclared: e.redeclared,
    fromRecord: e.fromRecord,
    ...(e.queryDepth !== void 0 && { queryDepth: e.queryDepth }),
    toolSearchAbsent: e.toolSearchAbsent,
    noDeferredChannel: e.noDeferredChannel,
    unclassifiedDepartures: e.unclassifiedDepartures,
  });
}
//@ chunk-a76knw89.js:52282-52321 placement
function ae(e, n) {
  return Nrt(e) && modelTakesToolAdditions(n);
}
//@ chunk-a76knw89.js:52321-52361 placement
function Nrt(e) {
  return lT(e, Lb) && !we(e);
}
//@ chunk-a76knw89.js:52361-52407 placement
function we(e) {
  return Lp(e, LO) || isToolChangeHeaderRefused() || !l$e();
}
//@ chunk-a76knw89.js:52407-52476 placement
function d$e(e, n) {
  return (lT(e, Lb) || (Kpr() && !Lp(e, Lb))) && !we(e) && modelTakesToolAdditions(n);
}
//@ chunk-a76knw89.js:52476-52517 placement
function poi(e, n) {
  return Snr(e) && ae(e, n);
}
//@ chunk-a76knw89.js:52517-52565 placement
function Snr(e) {
  return lT(e, tb) && !isInlineToolsRefused() && Nrt(e);
}
/**
 * 判断能否以内联方式追加工具（未被拒绝、相关 beta 可用）。
 */
//@ chunk-a76knw89.js:52565-52672 placement
function canInlineToolAdditions(e, n) {
  if (isInlineToolsRefused() || Lp(e, tb)) return !1;
  if (lT(e, tb)) return d$e(e, n);
  return !lT(e, Lb) && isInlineToolsEnabled() && d$e(e, n);
}
/**
 * 判断是否需要宣布延迟加载的工具：ToolSearch 被过滤掉、通道可用且有延迟工具或工具池会刷新。
 */
//@ chunk-a76knw89.js:52672-52817 placement
function shouldAnnounceDeferredTools(
  e,
  n,
  {
    toolSearchToolFilteredOut: toolSearchToolFilteredOut,
    toolPoolRefreshes: toolPoolRefreshes,
    aheadOfRequest: aheadOfRequest,
  },
) {
  return (
    toolSearchToolFilteredOut &&
    (aheadOfRequest ? d$e(e, n) : ae(e, n)) &&
    (DSe(e) !== void 0 || (toolPoolRefreshes && MSe()))
  );
}
/**
 * 根据工具追加通道是否可用，调整请求的 beta 列表（增删工具追加与内联工具 beta），并必要时登记不可用状态。
 */
//@ chunk-a76knw89.js:52817-53137 placement
function adjustToolBetas(betas, betaList, model) {
  let r = !lT(betas, Lb);
  if (betaList.includes(Lb) && !we(betas)) {
    if ((eB(betas, Lb), r && betaList.includes(tb) && !isInlineToolsRefused() && !Lp(betas, tb)))
      eB(betas, tb);
  }
  let c = ae(betas, model),
    s = c && Snr(betas),
    u = betaList;
  if (c && !u.includes(Lb)) u = [...u, Lb];
  if (!c && u.includes(Lb)) u = u.filter((p) => p !== Lb);
  if (s && !u.includes(tb)) u = [...u, tb];
  if (!s && u.includes(tb)) u = u.filter((p) => p !== tb);
  return u;
}
/**
 * 按模型是否支持工具追加，生成包含或去掉相关 beta 的列表。
 */
//@ chunk-a76knw89.js:53137-53329 placement
function toolAdditionBetas(e, n, o, r) {
  if (ae(e, o) && modelTakesToolAdditions(r)) {
    let c = n.includes(Lb) ? n : [...n, Lb],
      s = Snr(e);
    if (s && !c.includes(tb)) return [...c, tb];
    return s ? c : c.filter((u) => u !== tb);
  }
  return n.filter((c) => c !== Lb && c !== tb);
}
/**
 * 重试换用不支持工具追加的模型时，描述哪些内容被移动（advisor 条目、延迟条目、宣布块），无移动返回 undefined。
 */
//@ chunk-a76knw89.js:53329-53628 placement
function describeToolAdditionMoves(
  e,
  n,
  {
    mintModel: mintModel,
    retryModel: retryModel,
    advisorEntryMoved: advisorEntryMoved,
    deferredEntriesMoved: deferredEntriesMoved,
    hasDeferredChannel: hasDeferredChannel,
  },
) {
  try {
    if (!ae(e, mintModel) || modelTakesToolAdditions(retryModel)) return;
    let p = {
      advisor_entry: advisorEntryMoved,
      deferred_entries: deferredEntriesMoved,
      announcement_blocks: hasDeferredChannel && n.some((h) => findDeferredToolsDelta(e, h)),
    };
    return Object.values(p).some(Boolean) ? p : void 0;
  } catch (error) {
    logError(toError(error));
    return;
  }
}
//@ chunk-a76knw89.js:53628-53903 placement
function findDeferredToolsDelta(e, n) {
  if (
    n.type !== "attachment" ||
    n.attachment.type !== "deferred_tools_delta" ||
    e.nameOnlyAnnouncements.has(n.uuid)
  )
    return !1;
  let surfacedNames = n.attachment.surfacedNames;
  return (
    Array.isArray(surfacedNames) &&
    surfacedNames.some((r) => typeof r === "string" && (e.surfacedOnWire.has(r) || e.definedByValue.has(r)))
  );
}
//@ chunk-a76knw89.js:53903-54256 placement
function findLatestApiSystemDelta(e, n, o, r, c = new Set()) {
  if (!r) return;
  let s = !Nrt(e);
  for (let u of n) {
    if (
      u.type !== "attachment" ||
      u.attachment.type !== "deferred_tools_delta" ||
      e.nameOnlyAnnouncements.has(u.uuid)
    )
      continue;
    let surfacedNames = u.attachment.surfacedNames;
    if (
      Array.isArray(surfacedNames) &&
      surfacedNames.length > 0 &&
      (s || surfacedNames.some((h) => typeof h !== "string" || (!o.has(h) && !c.has(h))))
    )
      e.nameOnlyAnnouncements.add(u.uuid);
  }
}
/**
 * 决定延迟工具通过 ToolSearch 宣告还是按值内联到 tools[]。
 */
//@ chunk-a76knw89.js:54256-55109 placement
function surfaceDeferredTools(
  e,
  n,
  o,
  {
    useToolSearch: useToolSearch,
    toolSearchAbsent: toolSearchAbsent,
    blocksEligible: blocksEligible,
    byValueNames: byValueNames = new Set(),
    byValueStaysOut: byValueStaysOut,
  },
) {
  if (!useToolSearch && !toolSearchAbsent) return;
  if (!blocksEligible) {
    if (!Nrt(e)) (e.surfacedOnWire.clear(), e.definedByValue.clear());
    else if (byValueStaysOut) e.definedByValue.clear();
    return;
  }
  (e.surfacedOnWire.clear(), e.definedByValue.clear());
  let h = new Set();
  for (let T of o)
    if (T.type === "api_system") {
      for (let y of T.toolRemovals ?? []) e.definedByValue.delete(y);
      for (let y of T.toolAdditions ?? [])
        if (fVt(T.toolDefinitions, y) !== void 0) (h.add(y), e.definedByValue.add(y));
        else e.surfacedOnWire.add(y);
    }
  if (toolSearchAbsent) return;
  for (let T of n) {
    if (
      T.type !== "attachment" ||
      T.attachment.type !== "deferred_tools_delta" ||
      e.nameOnlyAnnouncements.has(T.uuid)
    )
      continue;
    let surfacedNames = T.attachment.surfacedNames;
    if (
      Array.isArray(surfacedNames) &&
      surfacedNames.some(
        (b) => typeof b === "string" && !e.surfacedOnWire.has(b) && !h.has(b) && !byValueNames.has(b),
      )
    )
      e.nameOnlyAnnouncements.add(T.uuid);
  }
}
//@ chunk-a76knw89.js:55109-55563 placement
function classifyToolAdditionRejection(e, n, o, r) {
  if ((NYo(e), n === "header_rejected" || n === "block_type_unknown")) {
    if ((markToolChangeHeaderRefused(), n === "header_rejected")) {
      if ((markBetaHeaderRefused(Lb), r)) (markInlineToolsRefused(), markBetaHeaderRefused(tb));
    }
  } else if (n === "model_unsupported") markToolChangeUnsupportedModel(getCanonicalName(o));
  (logForDebugging(
    `[late-tool-additions] tool_addition rejected (${n}) \u2014 falling back to the ToolSearch announcement (or to inline tools where there is no ToolSearch), sticky-rejecting the beta until /clear or /compact`,
    { level: "warn" },
  ),
    logFeatureSad("mcp_late_tool_additions", `rejected_${n}`));
}
//@ chunk-a76knw89.js:55563-55631 placement
function NYo(e) {
  if (lT(e, Lb)) Xg(e, Lb);
  (yn(e), e.surfacedOnWire.clear());
}
//@ chunk-a76knw89.js:55631-55693 placement
function yn(e) {
  if (lT(e, tb)) Mbs(e, tb);
  e.definedByValue.clear();
}
/**
 * inline tools 被 API 拒绝（头被拒、平台不支持）时回退到在 tools[] 中声明。
 */
//@ chunk-a76knw89.js:55693-56095 placement
function handleInlineToolsRejection(e, n) {
  if ((yn(e), n === "header_rejected" || n === "unsupported_on_platform")) {
    if ((markInlineToolsRefused(), n === "header_rejected")) markBetaHeaderRefused(tb);
  }
  (logForDebugging(
    `[inline-tools] tool_definition rejected (${n}) \u2014 falling back to declaring late tools in tools[] and showing them by reference, off for the rest of this conversation (carried through a compaction; /clear starts afresh)`,
    { level: "warn" },
  ),
    logFeatureSad("mcp_inline_tools", `rejected_${n}`));
}
//@ chunk-a76knw89.js:56095-56486 placement
function buildToolRemovalBlocks(e, n, o, r = [], c = {}) {
  let s = [
    ...(e ? [{ type: "text", text: e }] : []),
    ...r.map((u) => ({ type: "tool_removal", tool: { type: "tool_reference", name: u } })),
    ...n.map((u) => {
      let p = fVt(c, u);
      return p === void 0
        ? { type: "tool_addition", tool: { type: "tool_reference", name: u } }
        : { type: "tool_addition", tool: { type: "tool_definition", definition: p } };
    }),
  ];
  if (o !== void 0 && s.length > 0) s.push({ ...s.pop(), cache_control: o });
  return s;
}

export {
  DeclaredToolSet,
  DSe,
  resolveDeclaredToolSet,
  _nr,
  Nrt,
  Snr,
  OYo,
  adjustToolBetas,
  shouldAnnounceDeferredTools,
  poi,
  coi,
  updateDeclaredToolSet,
  kbn,
  isHipaaRestricted,
  isLateToolAdditionsEnabled,
  soi,
  markReconnectingServers,
  cacheNoChannelTools,
  buildDeclaredToolSet,
  computeLateToolAdditions,
  logDeclaredToolSetHeld,
  toolAdditionBetas,
  describeToolAdditionMoves,
  findLatestApiSystemDelta,
  uoi,
  surfaceDeferredTools,
  handleInlineToolsRejection,
  classifyToolAdditionRejection,
  NYo,
  buildToolRemovalBlocks,
  getCacheControl,
  stripCacheControl,
  d$e,
  Cqe,
  aoi,
  logDeclaredToolsDroppedAtCompaction,
  logDeclaredToolsDroppedAtCompaction2,
  Hrt,
  Tbn,
  hasDeclaredToolSet,
  canInlineToolAdditions,
};
