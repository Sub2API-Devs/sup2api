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
import { init_react_production } from "../../../vendor/react/cjs/react.production.js";
import { w } from "../../../vendor/react/compiler-runtime.js";
import {
  jsxProd_default,
  jsxProd_default_2,
} from "../../../vendor/react/cjs/react-jsx-dev-runtime.react-server.production.js";
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
init_react_production();
//@ chunk-4xzsbgqr.js:613-1011 sole-consumer
/**
 * 粗体标题、状态图标和可选说明的一行。
 */
function StatusLine(props) {
  let a = w(10);
  let { title, status, detail } = props;
  let p;
  if (a[0] !== title) {
    p = jsxProd_default(Text, {
      bold: true,
      children: title,
    });
    a[0] = title;
    a[1] = p;
  } else p = a[1];
  let i;
  if (a[2] !== status) {
    i = jsxProd_default(StatusIcon, {
      status,
    });
    a[2] = status;
    a[3] = i;
  } else i = a[3];
  let m;
  if (a[4] !== detail) {
    m = detail
      ? jsxProd_default_2(Text, {
          dimColor: true,
          children: [" \xB7 ", detail],
        })
      : null;
    a[4] = detail;
    a[5] = m;
  } else m = a[5];
  let g;
  if (a[6] !== p || a[7] !== i || a[8] !== m) {
    g = jsxProd_default_2(Text, {
      children: [p, " ", i, m],
    });
    a[6] = p;
    a[7] = i;
    a[8] = m;
    a[9] = g;
  } else g = a[9];
  return g;
}
//@ chunk-4xzsbgqr.js:1011-1042 sole-consumer
function warningFile(jr) {
  return jr.file;
}
//@ chunk-4xzsbgqr.js:1042-1076 sole-consumer
function isNonAgentScope(f) {
  return !isManagedConfigScope(f.scope);
}
//@ chunk-4xzsbgqr.js:1076-1189 sole-consumer
/**
 * 某作用域的服务器（含未展开变量的显示版本）。
 */
function scopeServersSnapshot(y) {
  return {
    scope: y.scope,
    servers: y.config.servers,
    displayServers: getMcpConfigsByScope(y.scope, {
      expandVars: false,
    }).servers,
  };
}
//@ chunk-4xzsbgqr.js:1189-1231 affinity
function isApprovedServer(V) {
  return getEffectiveProjectMcpServerStatus(V) === "approved";
}
//@ chunk-4xzsbgqr.js:1231-1298 fingerprint = _temp3 (1)
function hasFatalError(t0) {
  let { config } = t0;
  return filterErrors(config.errors, "fatal").length > 0;
}
//@ chunk-4xzsbgqr.js:1298-1367 file-local
function hasWarningError(t0) {
  let { config } = t0;
  return filterErrors(config.errors, "warning").length > 0;
}
//@ chunk-4xzsbgqr.js:1367-1495 fingerprint = _temp5 (1)
/**
 * 渲染一个作用域的配置错误与警告。
 */
function renderScopeErrors(t0) {
  let { scope, config } = t0;
  return jsxProd_default(
    McpConfigErrorSection,
    {
      scope,
      parsingErrors: filterErrors(config.errors, "fatal"),
      warnings: filterErrors(config.errors, "warning"),
    },
    scope,
  );
}
//@ chunk-4xzsbgqr.js:1495-1677 layout
/**
 * 冲突提示节点（消息与建议）。
 */
function renderConflictNode(D, X) {
  return jsxProd_default_2(
    TreeConnectors.Group,
    {
      children: [
        jsxProd_default(TreeConnectors.Node, {
          color: "warning",
          children: replaceControlChars(D.message),
        }),
        D.suggestion &&
          jsxProd_default(TreeConnectors.Node, {
            dimColor: true,
            children: replaceControlChars(D.suggestion),
          }),
      ],
    },
    `conflict-${X}`,
  );
}
//@ chunk-4xzsbgqr.js:1677-4246 fingerprint = McpConfigErrorSection (0.412)
function McpConfigErrorSection(props) {
  let $ = w(56);
  let { scope, parsingErrors, warnings } = props;
  let a = parsingErrors.length > 0;
  let p = warnings.length > 0;
  if (!a && !p) {
    return null;
  }
  let m;
  let g;
  let d;
  let f;
  let dimColor;
  let children;
  let T;
  let flexDirection;
  let marginTop;
  let R;
  if ($[0] !== a || $[1] !== p || $[2] !== parsingErrors || $[3] !== scope || $[4] !== warnings) {
    let D = describeMcpConfigFilePath(scope);
    let X = new Set([...parsingErrors, ...warnings].map(warningFile).filter(Boolean));
    f = X.size === 1 ? [...X][0] : D;
    d = Box;
    flexDirection = "column";
    marginTop = 1;
    let h;
    if ($[15] !== a || $[16] !== p) {
      h =
        (a || p) &&
        jsxProd_default_2(Text, {
          color: a ? "error" : "warning",
          children: ["[", a ? "Failed to parse" : "Contains warnings", "]", " "],
        });
      $[15] = a;
      $[16] = p;
      $[17] = h;
    } else h = $[17];
    let children_2;
    if ($[18] !== scope) {
      children_2 = getScopeLabel(scope);
      $[18] = scope;
      $[19] = children_2;
    } else children_2 = $[19];
    let N;
    if ($[20] !== children_2) {
      N = jsxProd_default(Text, {
        children: children_2,
      });
      $[20] = children_2;
      $[21] = N;
    } else N = $[21];
    if ($[22] !== h || $[23] !== N) {
      R = jsxProd_default_2(Box, {
        children: [h, N],
      });
      $[22] = h;
      $[23] = N;
      $[24] = R;
    } else R = $[24];
    g = Box;
    if ($[25] === MEMO_CACHE_SENTINEL) {
      T = jsxProd_default(Text, {
        dimColor: true,
        children: "Location: ",
      });
      $[25] = T;
    } else T = $[25];
    m = Text;
    dimColor = true;
    children = replaceControlChars(f);
    $[0] = a;
    $[1] = p;
    $[2] = parsingErrors;
    $[3] = scope;
    $[4] = warnings;
    $[5] = m;
    $[6] = g;
    $[7] = d;
    $[8] = f;
    $[9] = dimColor;
    $[10] = children;
    $[11] = T;
    $[12] = flexDirection;
    $[13] = marginTop;
    $[14] = R;
  } else {
    m = $[5];
    g = $[6];
    d = $[7];
    f = $[8];
    dimColor = $[9];
    children = $[10];
    T = $[11];
    flexDirection = $[12];
    marginTop = $[13];
    R = $[14];
  }
  let h;
  if ($[26] !== m || $[27] !== dimColor || $[28] !== children) {
    h = jsxProd_default(m, {
      dimColor,
      children,
    });
    $[26] = m;
    $[27] = dimColor;
    $[28] = children;
    $[29] = h;
  } else h = $[29];
  let v;
  if ($[30] !== g || $[31] !== T || $[32] !== h) {
    v = jsxProd_default_2(g, {
      children: [T, h],
    });
    $[30] = g;
    $[31] = T;
    $[32] = h;
    $[33] = v;
  } else v = $[33];
  let N;
  if ($[34] !== f || $[35] !== parsingErrors || $[36] !== scope) {
    let W;
    if ($[38] !== f || $[39] !== scope) {
      W = (E, Lr) => {
        let serverName = E.mcpErrorMetadata?.serverName;
        let file = E.file !== f ? E.file : undefined;
        return jsxProd_default_2(
          TreeConnectors.Group,
          {
            children: [
              jsxProd_default(TreeConnectors.Node, {
                children: jsxProd_default_2(Text, {
                  children: [
                    jsxProd_default(Text, {
                      color: "error",
                      children: "[Error]",
                    }),
                    jsxProd_default_2(Text, {
                      dimColor: true,
                      children: [
                        " ",
                        file && `(${replaceControlChars(file)}) `,
                        serverName && `[${replaceControlChars(serverName)}] `,
                        E.path && E.path !== "" ? `${replaceControlChars(E.path)}: ` : "",
                        replaceControlChars(E.message),
                      ],
                    }),
                  ],
                }),
              }),
              scope === "enterprise" &&
                E.suggestion &&
                jsxProd_default(TreeConnectors.Node, {
                  dimColor: true,
                  children: replaceControlChars(E.suggestion),
                }),
            ],
          },
          `error-${Lr}`,
        );
      };
      $[38] = f;
      $[39] = scope;
      $[40] = W;
    } else W = $[40];
    N = parsingErrors.map(W);
    $[34] = f;
    $[35] = parsingErrors;
    $[36] = scope;
    $[37] = N;
  } else N = $[37];
  let W;
  if ($[41] !== f || $[42] !== warnings) {
    let x;
    if ($[44] !== f) {
      x = (k, br) => {
        let serverName = k.mcpErrorMetadata?.serverName;
        let file = k.file !== f ? k.file : undefined;
        return jsxProd_default(
          TreeConnectors.Node,
          {
            children: jsxProd_default_2(Text, {
              children: [
                jsxProd_default(Text, {
                  color: "warning",
                  children: "[Warning]",
                }),
                jsxProd_default_2(Text, {
                  dimColor: true,
                  children: [
                    " ",
                    file && `(${replaceControlChars(file)}) `,
                    serverName && `[${replaceControlChars(serverName)}] `,
                    k.path && k.path !== "" ? `${replaceControlChars(k.path)}: ` : "",
                    replaceControlChars(k.message),
                  ],
                }),
              ],
            }),
          },
          `warning-${br}`,
        );
      };
      $[44] = f;
      $[45] = x;
    } else x = $[45];
    W = warnings.map(x);
    $[41] = f;
    $[42] = warnings;
    $[43] = W;
  } else W = $[43];
  let x;
  if ($[46] !== W || $[47] !== N) {
    x = jsxProd_default(Box, {
      marginLeft: 1,
      children: jsxProd_default_2(TreeConnectors, {
        variant: "tree",
        children: [N, W],
      }),
    });
    $[46] = W;
    $[47] = N;
    $[48] = x;
  } else x = $[48];
  let fr;
  if (
    $[49] !== d ||
    $[50] !== x ||
    $[51] !== flexDirection ||
    $[52] !== marginTop ||
    $[53] !== R ||
    $[54] !== v
  ) {
    fr = jsxProd_default_2(d, {
      flexDirection,
      marginTop,
      children: [R, v, x],
    });
    $[49] = d;
    $[50] = x;
    $[51] = flexDirection;
    $[52] = marginTop;
    $[53] = R;
    $[54] = v;
    $[55] = fr;
  } else fr = $[55];
  return fr;
}
//@ chunk-4xzsbgqr.js:4246-5320 fingerprint = McpParsingWarnings (0.411)
function McpParsingWarnings() {
  let $ = w(3);
  let o;
  if ($[0] === MEMO_CACHE_SENTINEL) {
    let warning = [
      {
        scope: "user",
        config: getMcpConfigsByScope("user"),
      },
      {
        scope: "project",
        config: getMcpConfigsByScope("project"),
      },
      {
        scope: "local",
        config: getMcpConfigsByScope("local"),
      },
      {
        scope: "managed",
        config: getMcpConfigsByScope("managed"),
      },
      {
        scope: "enterprise",
        config: getMcpConfigsByScope("enterprise"),
      },
    ];
    let conflicts = getMcpScopeConflicts(warning.filter(isNonAgentScope).map(scopeServersSnapshot));
    o = {
      scopes: filterShadowedWarnings(warning, {
        enterpriseActive: doesEnterpriseMcpConfigExist(),
        mcpLocked: isRestrictedToPluginOnly("mcp"),
        isProjectServerApproved: isApprovedServer,
      }),
      conflicts,
    };
    $[0] = o;
  } else o = $[0];
  let { scopes, conflicts } = o;
  let hasParsingErrors = scopes.some(hasFatalError);
  let hasWarnings = conflicts.length > 0 || scopes.some(hasWarningError);
  if (!hasParsingErrors && !hasWarnings) {
    return null;
  }
  let t4;
  if ($[1] === MEMO_CACHE_SENTINEL) {
    t4 = jsxProd_default(StatusLine, {
      title: "MCP config diagnostics",
      status: hasParsingErrors ? "error" : "warning",
    });
    $[1] = t4;
  } else t4 = $[1];
  let t5;
  if ($[2] === MEMO_CACHE_SENTINEL) {
    t5 = jsxProd_default_2(Box, {
      flexDirection: "column",
      marginTop: 1,
      marginBottom: 1,
      children: [
        t4,
        jsxProd_default(Box, {
          marginTop: 1,
          children: jsxProd_default_2(Text, {
            dimColor: true,
            children: [
              "For help configuring MCP servers, see:",
              " ",
              jsxProd_default(Link, {
                url: "https://code.claude.com/docs/en/mcp",
                children: "https://code.claude.com/docs/en/mcp",
              }),
            ],
          }),
        }),
        scopes.map(renderScopeErrors),
        conflicts.length > 0 &&
          jsxProd_default_2(Box, {
            flexDirection: "column",
            marginTop: 1,
            children: [
              jsxProd_default(Text, {
                color: "warning",
                children: "[Conflicting scopes]",
              }),
              jsxProd_default(TreeConnectors, {
                variant: "tree",
                children: conflicts.map(renderConflictNode),
              }),
            ],
          }),
      ],
    });
    $[2] = t5;
  } else t5 = $[2];
  return t5;
}
//@ chunk-4xzsbgqr.js:5320-5391 fingerprint = filterErrors (1)
function filterErrors(errors, severity) {
  return errors.filter((e) => e.mcpErrorMetadata?.severity === severity);
}
//@ chunk-4xzsbgqr.js:5391-5838 file-local
/**
 * 去掉会被后面作用域覆盖的服务器警告；企业/锁定时非托管作用域的警告全部隐藏。
 */
function filterShadowedWarnings(warning, i_0) {
  let c = (t, a) => {
    if (!(a in t.config.servers)) return false;
    if (t.scope === "project") return i_0.isProjectServerApproved(a);
    return true;
  };
  return warning.map((t, a) => {
    let p = !isManagedConfigScope(t.scope) && (i_0.enterpriseActive || i_0.mcpLocked);
    let sliced = warning.slice(a + 1);
    let m = (serverName) => sliced.some((d) => c(d, serverName));
    return {
      ...t,
      config: {
        ...t.config,
        errors: t.config.errors.filter((error) => {
          if (error.mcpErrorMetadata?.severity !== "warning") return true;
          if (p) return false;
          let serverName = error.mcpErrorMetadata.serverName;
          return !serverName || !m(serverName);
        }),
      },
    };
  });
}
export { McpParsingWarnings };
