/**
 * components/mcp/McpParsingWarnings.tsx
 *
 * MCP 配置解析告警（按 user/project/local/managed 作用域的诊断）。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/components/mcp/McpParsingWarnings.tsx
 * pieces: chunk-4xzsbgqr.js (14)
 * attribution: sole-consumer 5, affinity 1, fingerprint 5, file-local 2, layout 1
 */
import { j } from "../../../vendor/react/cjs/react.production.js";
import { w } from "../../../vendor/react/compiler-runtime.js";
import { e, r } from "../../../vendor/react/cjs/react-jsx-dev-runtime.react-server.production.js";
import { Text, Box, Link } from "../../ink/components/Text.js";
import { StatusIcon } from "../design-system/StatusIcon.js";
import { isManagedConfigScope } from "../../services/mcp/types.js";
import {
  getMcpConfigsByScope,
  getMcpScopeConflicts,
  doesEnterpriseMcpConfigExist,
} from "../../services/mcp/config.js";
import {
  getEffectiveProjectMcpServerStatus,
  describeMcpConfigFilePath,
  getScopeLabel,
} from "../../services/mcp/utils.js";
import { TreeConnectors } from "../design-system/TreeConnectors.js";
import { replaceControlChars } from "../../utils/resultError.js";
import { MEMO_CACHE_SENTINEL } from "../../../runtime/bun-runtime.js";
import { isRestrictedToPluginOnly } from "../../utils/settings/pluginOnlyPolicy.js";

//@ chunk-4xzsbgqr.js:609-613 sole-consumer
j();
/**
 * 粗体标题、状态图标和可选说明的一行。
 */
//@ chunk-4xzsbgqr.js:613-1011 sole-consumer
function StatusLine(l) {
  let a = w(10),
    { title: title, status: status, detail: detail } = l,
    p;
  if (a[0] !== title) ((p = e(Text, { bold: !0, children: title })), (a[0] = title), (a[1] = p));
  else p = a[1];
  let i;
  if (a[2] !== status) ((i = e(StatusIcon, { status: status })), (a[2] = status), (a[3] = i));
  else i = a[3];
  let m;
  if (a[4] !== detail)
    ((m = detail ? r(Text, { dimColor: !0, children: [" \xB7 ", detail] }) : null),
      (a[4] = detail),
      (a[5] = m));
  else m = a[5];
  let g;
  if (a[6] !== p || a[7] !== i || a[8] !== m)
    ((g = r(Text, { children: [p, " ", i, m] })), (a[6] = p), (a[7] = i), (a[8] = m), (a[9] = g));
  else g = a[9];
  return g;
}
//@ chunk-4xzsbgqr.js:1011-1042 sole-consumer
function Rr(jr) {
  return jr.file;
}
//@ chunk-4xzsbgqr.js:1042-1076 sole-consumer
function Wr(f) {
  return !isManagedConfigScope(f.scope);
}
/**
 * 某作用域的服务器（含未展开变量的显示版本）。
 */
//@ chunk-4xzsbgqr.js:1076-1189 sole-consumer
function scopeServersSnapshot(y) {
  return {
    scope: y.scope,
    servers: y.config.servers,
    displayServers: getMcpConfigsByScope(y.scope, { expandVars: !1 }).servers,
  };
}
//@ chunk-4xzsbgqr.js:1189-1231 affinity
function $r(V) {
  return getEffectiveProjectMcpServerStatus(V) === "approved";
}
//@ chunk-4xzsbgqr.js:1231-1298 fingerprint = _temp3 (1)
function kr(t0) {
  let { config: config } = t0;
  return filterErrors(config.errors, "fatal").length > 0;
}
//@ chunk-4xzsbgqr.js:1298-1367 file-local
function Tr(t0) {
  let { config: config_0 } = t0;
  return filterErrors(config_0.errors, "warning").length > 0;
}
/**
 * 渲染一个作用域的配置错误与警告。
 */
//@ chunk-4xzsbgqr.js:1367-1495 fingerprint = _temp5 (1)
function renderScopeErrors(t0) {
  let { scope: scope, config: config_1 } = t0;
  return e(
    McpConfigErrorSection,
    {
      scope: scope,
      parsingErrors: filterErrors(config_1.errors, "fatal"),
      warnings: filterErrors(config_1.errors, "warning"),
    },
    scope,
  );
}
/**
 * 冲突提示节点（消息与建议）。
 */
//@ chunk-4xzsbgqr.js:1495-1677 layout
function renderConflictNode(D, X) {
  return r(
    TreeConnectors.Group,
    {
      children: [
        e(TreeConnectors.Node, { color: "warning", children: replaceControlChars(D.message) }),
        D.suggestion && e(TreeConnectors.Node, { dimColor: !0, children: replaceControlChars(D.suggestion) }),
      ],
    },
    `conflict-${X}`,
  );
}
//@ chunk-4xzsbgqr.js:1677-4246 fingerprint = McpConfigErrorSection (0.412)
function McpConfigErrorSection(t0) {
  let $ = w(56),
    { scope: scope, parsingErrors: parsingErrors, warnings: warnings } = t0,
    a = parsingErrors.length > 0,
    p = warnings.length > 0;
  if (!a && !p) {
    return null;
  }
  let m, g, d, f, y, V, T, L, A, R;
  if ($[0] !== a || $[1] !== p || $[2] !== parsingErrors || $[3] !== scope || $[4] !== warnings) {
    let D = describeMcpConfigFilePath(scope);
    let X = new Set([...parsingErrors, ...warnings].map(Rr).filter(Boolean));
    f = X.size === 1 ? [...X][0] : D;
    d = Box;
    L = "column";
    A = 1;
    let h;
    if ($[15] !== a || $[16] !== p)
      ((h =
        (a || p) &&
        r(Text, {
          color: a ? "error" : "warning",
          children: ["[", a ? "Failed to parse" : "Contains warnings", "]", " "],
        })),
        ($[15] = a),
        ($[16] = p),
        ($[17] = h));
    else h = $[17];
    let v;
    if ($[18] !== scope) ((v = getScopeLabel(scope)), ($[18] = scope), ($[19] = v));
    else v = $[19];
    let N;
    if ($[20] !== v) ((N = e(Text, { children: v })), ($[20] = v), ($[21] = N));
    else N = $[21];
    if ($[22] !== h || $[23] !== N)
      ((R = r(Box, { children: [h, N] })), ($[22] = h), ($[23] = N), ($[24] = R));
    else R = $[24];
    g = Box;
    if ($[25] === MEMO_CACHE_SENTINEL) ((T = e(Text, { dimColor: !0, children: "Location: " })), ($[25] = T));
    else T = $[25];
    m = Text;
    y = !0;
    V = replaceControlChars(f);
    (($[0] = a),
      ($[1] = p),
      ($[2] = parsingErrors),
      ($[3] = scope),
      ($[4] = warnings),
      ($[5] = m),
      ($[6] = g),
      ($[7] = d),
      ($[8] = f),
      ($[9] = y),
      ($[10] = V),
      ($[11] = T),
      ($[12] = L),
      ($[13] = A),
      ($[14] = R));
  } else
    ((m = $[5]),
      (g = $[6]),
      (d = $[7]),
      (f = $[8]),
      (y = $[9]),
      (V = $[10]),
      (T = $[11]),
      (L = $[12]),
      (A = $[13]),
      (R = $[14]));
  let h;
  if ($[26] !== m || $[27] !== y || $[28] !== V)
    ((h = e(m, { dimColor: y, children: V })), ($[26] = m), ($[27] = y), ($[28] = V), ($[29] = h));
  else h = $[29];
  let v;
  if ($[30] !== g || $[31] !== T || $[32] !== h)
    ((v = r(g, { children: [T, h] })), ($[30] = g), ($[31] = T), ($[32] = h), ($[33] = v));
  else v = $[33];
  let N;
  if ($[34] !== f || $[35] !== parsingErrors || $[36] !== scope) {
    let W;
    if ($[38] !== f || $[39] !== scope)
      ((W = (E, Lr) => {
        let ar = E.mcpErrorMetadata?.serverName;
        let cr = E.file !== f ? E.file : void 0;
        return r(
          TreeConnectors.Group,
          {
            children: [
              e(TreeConnectors.Node, {
                children: r(Text, {
                  children: [
                    e(Text, { color: "error", children: "[Error]" }),
                    r(Text, {
                      dimColor: !0,
                      children: [
                        " ",
                        cr && `(${replaceControlChars(cr)}) `,
                        ar && `[${replaceControlChars(ar)}] `,
                        E.path && E.path !== "" ? `${replaceControlChars(E.path)}: ` : "",
                        replaceControlChars(E.message),
                      ],
                    }),
                  ],
                }),
              }),
              scope === "enterprise" &&
                E.suggestion &&
                e(TreeConnectors.Node, { dimColor: !0, children: replaceControlChars(E.suggestion) }),
            ],
          },
          `error-${Lr}`,
        );
      }),
        ($[38] = f),
        ($[39] = scope),
        ($[40] = W));
    else W = $[40];
    N = parsingErrors.map(W);
    (($[34] = f), ($[35] = parsingErrors), ($[36] = scope), ($[37] = N));
  } else N = $[37];
  let W;
  if ($[41] !== f || $[42] !== warnings) {
    let x;
    if ($[44] !== f)
      ((x = (k, br) => {
        let pr = k.mcpErrorMetadata?.serverName;
        let gr = k.file !== f ? k.file : void 0;
        return e(
          TreeConnectors.Node,
          {
            children: r(Text, {
              children: [
                e(Text, { color: "warning", children: "[Warning]" }),
                r(Text, {
                  dimColor: !0,
                  children: [
                    " ",
                    gr && `(${replaceControlChars(gr)}) `,
                    pr && `[${replaceControlChars(pr)}] `,
                    k.path && k.path !== "" ? `${replaceControlChars(k.path)}: ` : "",
                    replaceControlChars(k.message),
                  ],
                }),
              ],
            }),
          },
          `warning-${br}`,
        );
      }),
        ($[44] = f),
        ($[45] = x));
    else x = $[45];
    W = warnings.map(x);
    (($[41] = f), ($[42] = warnings), ($[43] = W));
  } else W = $[43];
  let x;
  if ($[46] !== W || $[47] !== N)
    ((x = e(Box, { marginLeft: 1, children: r(TreeConnectors, { variant: "tree", children: [N, W] }) })),
      ($[46] = W),
      ($[47] = N),
      ($[48] = x));
  else x = $[48];
  let fr;
  if ($[49] !== d || $[50] !== x || $[51] !== L || $[52] !== A || $[53] !== R || $[54] !== v)
    ((fr = r(d, { flexDirection: L, marginTop: A, children: [R, v, x] })),
      ($[49] = d),
      ($[50] = x),
      ($[51] = L),
      ($[52] = A),
      ($[53] = R),
      ($[54] = v),
      ($[55] = fr));
  else fr = $[55];
  return fr;
}
//@ chunk-4xzsbgqr.js:4246-5320 fingerprint = McpParsingWarnings (0.411)
function McpParsingWarnings() {
  let $ = w(3),
    o;
  if ($[0] === MEMO_CACHE_SENTINEL) {
    let c = [
      { scope: "user", config: getMcpConfigsByScope("user") },
      { scope: "project", config: getMcpConfigsByScope("project") },
      { scope: "local", config: getMcpConfigsByScope("local") },
      { scope: "managed", config: getMcpConfigsByScope("managed") },
      { scope: "enterprise", config: getMcpConfigsByScope("enterprise") },
    ];
    let t = getMcpScopeConflicts(c.filter(Wr).map(scopeServersSnapshot));
    o = {
      scopes: filterShadowedWarnings(c, {
        enterpriseActive: doesEnterpriseMcpConfigExist(),
        mcpLocked: isRestrictedToPluginOnly("mcp"),
        isProjectServerApproved: $r,
      }),
      conflicts: t,
    };
    $[0] = o;
  } else o = $[0];
  let { scopes: scopes, conflicts: conflicts } = o,
    hasParsingErrors = scopes.some(kr),
    m = conflicts.length > 0 || scopes.some(Tr);
  if (!hasParsingErrors && !m) {
    return null;
  }
  let g;
  if ($[1] === MEMO_CACHE_SENTINEL)
    ((g = e(StatusLine, { title: "MCP config diagnostics", status: hasParsingErrors ? "error" : "warning" })),
      ($[1] = g));
  else g = $[1];
  let d;
  if ($[2] === MEMO_CACHE_SENTINEL)
    ((d = r(Box, {
      flexDirection: "column",
      marginTop: 1,
      marginBottom: 1,
      children: [
        g,
        e(Box, {
          marginTop: 1,
          children: r(Text, {
            dimColor: !0,
            children: [
              "For help configuring MCP servers, see:",
              " ",
              e(Link, {
                url: "https://code.claude.com/docs/en/mcp",
                children: "https://code.claude.com/docs/en/mcp",
              }),
            ],
          }),
        }),
        scopes.map(renderScopeErrors),
        conflicts.length > 0 &&
          r(Box, {
            flexDirection: "column",
            marginTop: 1,
            children: [
              e(Text, { color: "warning", children: "[Conflicting scopes]" }),
              e(TreeConnectors, { variant: "tree", children: conflicts.map(renderConflictNode) }),
            ],
          }),
      ],
    })),
      ($[2] = d));
  else d = $[2];
  return d;
}
//@ chunk-4xzsbgqr.js:5320-5391 fingerprint = filterErrors (1)
function filterErrors(errors, severity) {
  return errors.filter((c) => c.mcpErrorMetadata?.severity === severity);
}
/**
 * 去掉会被后面作用域覆盖的服务器警告；企业/锁定时非托管作用域的警告全部隐藏。
 */
//@ chunk-4xzsbgqr.js:5391-5838 file-local
function filterShadowedWarnings(warning, i_0) {
  let c = (t, a) => {
    if (!(a in t.config.servers)) return !1;
    if (t.scope === "project") return i_0.isProjectServerApproved(a);
    return !0;
  };
  return warning.map((t, a) => {
    let p = !isManagedConfigScope(t.scope) && (i_0.enterpriseActive || i_0.mcpLocked),
      sliced = warning.slice(a + 1),
      m = (g) => sliced.some((d) => c(d, g));
    return {
      ...t,
      config: {
        ...t.config,
        errors: t.config.errors.filter((error) => {
          if (error.mcpErrorMetadata?.severity !== "warning") return !0;
          if (p) return !1;
          let serverName = error.mcpErrorMetadata.serverName;
          return !serverName || !m(serverName);
        }),
      },
    };
  });
}

export { McpParsingWarnings };
