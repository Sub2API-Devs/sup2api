/**
 * components/mcp/McpParsingWarnings.tsx
 *
 * MCP 配置解析告警（按 user/project/local/managed 作用域的诊断）。
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/components/mcp/McpParsingWarnings.tsx
 * pieces: chunk-d994c611.js (14)
 * attribution: sole-consumer 6, fingerprint 5, file-local 2, layout 1
 * (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.
 */
import { init_react_production } from "../../../vendor/react/cjs/react.production.js";
import { useMemoCache } from "../../../vendor/react/compiler-runtime.js";
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
import { deferInit } from "../../../runtime/deferred-init.js";

//@ chunk-d994c611.js:609-613 sole-consumer
// deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
deferInit("chunk-d994c611.js:609", () => {
  init_react_production();
});
//@ chunk-d994c611.js:613-888 sole-consumer
/**
 * 粗体标题、状态图标和可选说明的一行。
 */
function StatusLine(props) {
  let $ = useMemoCache(7);
  let { title, status } = props;
  let titleText;
  if ($[0] !== title) {
    titleText = jsxProd_default(Text, {
      bold: true,
      children: title,
    });
    $[0] = title;
    $[1] = titleText;
  } else titleText = $[1];
  let icon;
  if ($[2] !== status) {
    icon = jsxProd_default(StatusIcon, {
      status,
    });
    $[2] = status;
    $[3] = icon;
  } else icon = $[3];
  let line;
  if ($[4] !== titleText || $[5] !== icon) {
    line = jsxProd_default_2(Text, {
      children: [titleText, " ", icon],
    });
    $[4] = titleText;
    $[5] = icon;
    $[6] = line;
  } else line = $[6];
  return line;
}
//@ chunk-d994c611.js:888-919 sole-consumer
function warningFile(warning) {
  return warning.file;
}
//@ chunk-d994c611.js:919-953 sole-consumer
function isNonAgentScope(warning) {
  return !isManagedConfigScope(warning.scope);
}
//@ chunk-d994c611.js:953-1066 sole-consumer
/**
 * 某作用域的服务器（含未展开变量的显示版本）。
 */
function scopeServersSnapshot(warning) {
  return {
    scope: warning.scope,
    servers: warning.config.servers,
    displayServers: getMcpConfigsByScope(warning.scope, {
      expandVars: false,
    }).servers,
  };
}
//@ chunk-d994c611.js:1066-1108 sole-consumer
function isApprovedServer(server) {
  return getEffectiveProjectMcpServerStatus(server) === "approved";
}
//@ chunk-d994c611.js:1108-1175 fingerprint (2.1.88 match: _temp3, 1)
function hasFatalError(t0) {
  let { config } = t0;
  return filterErrors(config.errors, "fatal").length > 0;
}
//@ chunk-d994c611.js:1175-1244 file-local
function hasWarningError(t0) {
  let { config } = t0;
  return filterErrors(config.errors, "warning").length > 0;
}
//@ chunk-d994c611.js:1244-1372 fingerprint (2.1.88 match: _temp5, 1)
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
//@ chunk-d994c611.js:1372-1554 layout
/**
 * 冲突提示节点（消息与建议）。
 */
function renderConflictNode(conflict, index) {
  return jsxProd_default_2(
    TreeConnectors.Group,
    {
      children: [
        jsxProd_default(TreeConnectors.Node, {
          color: "warning",
          children: replaceControlChars(conflict.message),
        }),
        conflict.suggestion &&
          jsxProd_default(TreeConnectors.Node, {
            dimColor: true,
            children: replaceControlChars(conflict.suggestion),
          }),
      ],
    },
    `conflict-${index}`,
  );
}
//@ chunk-d994c611.js:1554-4123 fingerprint (2.1.88 match: McpConfigErrorSection, 0.414)
function McpConfigErrorSection(props) {
  let $ = useMemoCache(56);
  let { scope, parsingErrors, warnings } = props;
  let hasErrors = parsingErrors.length > 0;
  let hasWarnings = warnings.length > 0;
  if (!hasErrors && !hasWarnings) {
    return null;
  }
  let textComponent;
  let locationBox;
  let containerBox;
  let locationPath;
  let dimColor;
  let children;
  let locationLabel;
  let flexDirection;
  let marginTop;
  let headerRow;
  if (
    $[0] !== hasErrors ||
    $[1] !== hasWarnings ||
    $[2] !== parsingErrors ||
    $[3] !== scope ||
    $[4] !== warnings
  ) {
    let defaultPath = describeMcpConfigFilePath(scope);
    let filePaths = new Set([...parsingErrors, ...warnings].map(warningFile).filter(Boolean));
    locationPath = filePaths.size === 1 ? [...filePaths][0] : defaultPath;
    containerBox = Box;
    flexDirection = "column";
    marginTop = 1;
    let statusTag;
    if ($[15] !== hasErrors || $[16] !== hasWarnings) {
      statusTag =
        (hasErrors || hasWarnings) &&
        jsxProd_default_2(Text, {
          color: hasErrors ? "error" : "warning",
          children: ["[", hasErrors ? "Failed to parse" : "Contains warnings", "]", " "],
        });
      $[15] = hasErrors;
      $[16] = hasWarnings;
      $[17] = statusTag;
    } else statusTag = $[17];
    let children_2;
    if ($[18] !== scope) {
      children_2 = getScopeLabel(scope);
      $[18] = scope;
      $[19] = children_2;
    } else children_2 = $[19];
    let scopeLabel;
    if ($[20] !== children_2) {
      scopeLabel = jsxProd_default(Text, {
        children: children_2,
      });
      $[20] = children_2;
      $[21] = scopeLabel;
    } else scopeLabel = $[21];
    if ($[22] !== statusTag || $[23] !== scopeLabel) {
      headerRow = jsxProd_default_2(Box, {
        children: [statusTag, scopeLabel],
      });
      $[22] = statusTag;
      $[23] = scopeLabel;
      $[24] = headerRow;
    } else headerRow = $[24];
    locationBox = Box;
    if ($[25] === MEMO_CACHE_SENTINEL) {
      locationLabel = jsxProd_default(Text, {
        dimColor: true,
        children: "Location: ",
      });
      $[25] = locationLabel;
    } else locationLabel = $[25];
    textComponent = Text;
    dimColor = true;
    children = replaceControlChars(locationPath);
    $[0] = hasErrors;
    $[1] = hasWarnings;
    $[2] = parsingErrors;
    $[3] = scope;
    $[4] = warnings;
    $[5] = textComponent;
    $[6] = locationBox;
    $[7] = containerBox;
    $[8] = locationPath;
    $[9] = dimColor;
    $[10] = children;
    $[11] = locationLabel;
    $[12] = flexDirection;
    $[13] = marginTop;
    $[14] = headerRow;
  } else {
    textComponent = $[5];
    locationBox = $[6];
    containerBox = $[7];
    locationPath = $[8];
    dimColor = $[9];
    children = $[10];
    locationLabel = $[11];
    flexDirection = $[12];
    marginTop = $[13];
    headerRow = $[14];
  }
  let locationText;
  if ($[26] !== textComponent || $[27] !== dimColor || $[28] !== children) {
    locationText = jsxProd_default(textComponent, {
      dimColor,
      children,
    });
    $[26] = textComponent;
    $[27] = dimColor;
    $[28] = children;
    $[29] = locationText;
  } else locationText = $[29];
  let locationRow;
  if ($[30] !== locationBox || $[31] !== locationLabel || $[32] !== locationText) {
    locationRow = jsxProd_default_2(locationBox, {
      children: [locationLabel, locationText],
    });
    $[30] = locationBox;
    $[31] = locationLabel;
    $[32] = locationText;
    $[33] = locationRow;
  } else locationRow = $[33];
  let errorNodes;
  if ($[34] !== locationPath || $[35] !== parsingErrors || $[36] !== scope) {
    let renderError;
    if ($[38] !== locationPath || $[39] !== scope) {
      renderError = (warning, index) => {
        let serverName = warning.mcpErrorMetadata?.serverName;
        let file = warning.file !== locationPath ? warning.file : undefined;
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
                        warning.path && warning.path !== "" ? `${replaceControlChars(warning.path)}: ` : "",
                        replaceControlChars(warning.message),
                      ],
                    }),
                  ],
                }),
              }),
              scope === "enterprise" &&
                warning.suggestion &&
                jsxProd_default(TreeConnectors.Node, {
                  dimColor: true,
                  children: replaceControlChars(warning.suggestion),
                }),
            ],
          },
          `error-${index}`,
        );
      };
      $[38] = locationPath;
      $[39] = scope;
      $[40] = renderError;
    } else renderError = $[40];
    errorNodes = parsingErrors.map(renderError);
    $[34] = locationPath;
    $[35] = parsingErrors;
    $[36] = scope;
    $[37] = errorNodes;
  } else errorNodes = $[37];
  let warningNodes;
  if ($[41] !== locationPath || $[42] !== warnings) {
    let renderWarning;
    if ($[44] !== locationPath) {
      renderWarning = (warning, index) => {
        let serverName = warning.mcpErrorMetadata?.serverName;
        let file = warning.file !== locationPath ? warning.file : undefined;
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
                    warning.path && warning.path !== "" ? `${replaceControlChars(warning.path)}: ` : "",
                    replaceControlChars(warning.message),
                  ],
                }),
              ],
            }),
          },
          `warning-${index}`,
        );
      };
      $[44] = locationPath;
      $[45] = renderWarning;
    } else renderWarning = $[45];
    warningNodes = warnings.map(renderWarning);
    $[41] = locationPath;
    $[42] = warnings;
    $[43] = warningNodes;
  } else warningNodes = $[43];
  let treeBox;
  if ($[46] !== warningNodes || $[47] !== errorNodes) {
    treeBox = jsxProd_default(Box, {
      marginLeft: 1,
      children: jsxProd_default_2(TreeConnectors, {
        variant: "tree",
        children: [errorNodes, warningNodes],
      }),
    });
    $[46] = warningNodes;
    $[47] = errorNodes;
    $[48] = treeBox;
  } else treeBox = $[48];
  let section;
  if (
    $[49] !== containerBox ||
    $[50] !== treeBox ||
    $[51] !== flexDirection ||
    $[52] !== marginTop ||
    $[53] !== headerRow ||
    $[54] !== locationRow
  ) {
    section = jsxProd_default_2(containerBox, {
      flexDirection,
      marginTop,
      children: [headerRow, locationRow, treeBox],
    });
    $[49] = containerBox;
    $[50] = treeBox;
    $[51] = flexDirection;
    $[52] = marginTop;
    $[53] = headerRow;
    $[54] = locationRow;
    $[55] = section;
  } else section = $[55];
  return section;
}
//@ chunk-d994c611.js:4123-5197 fingerprint (2.1.88 match: McpParsingWarnings, 0.41)
function McpParsingWarnings() {
  let $ = useMemoCache(3);
  let diagnostics;
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
    diagnostics = {
      scopes: filterShadowedWarnings(warning, {
        enterpriseActive: doesEnterpriseMcpConfigExist(),
        mcpLocked: isRestrictedToPluginOnly("mcp"),
        isProjectServerApproved: isApprovedServer,
      }),
      conflicts,
    };
    $[0] = diagnostics;
  } else diagnostics = $[0];
  let { scopes, conflicts } = diagnostics;
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
//@ chunk-d994c611.js:5197-5268 fingerprint (2.1.88 match: filterErrors, 1)
function filterErrors(errors, severity) {
  return errors.filter((e) => e.mcpErrorMetadata?.severity === severity);
}
//@ chunk-d994c611.js:5268-5715 file-local
/**
 * 去掉会被后面作用域覆盖的服务器警告；企业/锁定时非托管作用域的警告全部隐藏。
 */
function filterShadowedWarnings(warning, i_0) {
  let isShadowed = (entry, serverName) => {
    if (!(serverName in entry.config.servers)) return false;
    if (entry.scope === "project") return i_0.isProjectServerApproved(serverName);
    return true;
  };
  return warning.map((scopeEntry, scopeIndex) => {
    let shadowedByPolicy = !isManagedConfigScope(scopeEntry.scope) && (i_0.enterpriseActive || i_0.mcpLocked);
    let sliced = warning.slice(scopeIndex + 1);
    let shadowedLater = (serverName) => sliced.some((laterEntry) => isShadowed(laterEntry, serverName));
    return {
      ...scopeEntry,
      config: {
        ...scopeEntry.config,
        errors: scopeEntry.config.errors.filter((error) => {
          if (error.mcpErrorMetadata?.severity !== "warning") return true;
          if (shadowedByPolicy) return false;
          let serverName = error.mcpErrorMetadata.serverName;
          return !serverName || !shadowedLater(serverName);
        }),
      },
    };
  });
}
export { McpParsingWarnings };
