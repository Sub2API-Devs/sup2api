/**
 * components/mcp/MCPToolDetailView.tsx
 *
 * MCP 工具详情：描述、参数 schema、只读/破坏性标注。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/components/mcp/MCPToolDetailView.tsx
 * pieces: chunk-vrb44rx7.js (4)
 * attribution: callgraph-fingerprint 1, placement 1, layout 1, fingerprint 1
 */
import { useMemoCache } from "../../../vendor/react/compiler-runtime.js";
import {
  jsxProd_default,
  jsxProd_default_2,
  Fragment,
} from "../../../vendor/react/cjs/react-jsx-dev-runtime.react-server.production.js";
import { ConfigurableShortcutHint } from "../ConfigurableShortcutHint.js";
import { Text, Box } from "../../ink/components/Text.js";
import { init_react_production, useState, useEffect } from "../../../vendor/react/cjs/react.production.js";
import { getMcpDisplayName, extractMcpToolDisplayName } from "../../services/mcp/mcpStringUtils.js";
import { toolTimeoutForServer } from "../../services/mcp/mcpTimeouts.js";
import { isDeferredTool } from "../../tools/ToolSearchTool/prompt.js";
import { MEMO_CACHE_SENTINEL } from "../../../runtime/bun-runtime.js";
import { truncateWithCount } from "../../utils/stringUtils.js";
import { BulletRow } from "../design-system/BulletRow.js";
import { ParenHint } from "../diff/DiffDetailView.js";
import { Dialog } from "../design-system/Dialog.js";
import { deferInit } from "../../../runtime/deferred-init.js";

//@ chunk-vrb44rx7.js:26449-26810 callgraph-fingerprint (2.1.88 match: _temp, 0.594)
/**
 * 返回提示：等待二次按键时“再按一次返回”，否则显示 Esc 返回快捷键。
 */
function BackHint(exitState) {
  let $ = useMemoCache(5);
  let { exitState: exitState_2 } = exitState;
  let children;
  if ($[0] !== exitState_2.keyName || $[1] !== exitState_2.pending) {
    children = exitState_2.pending
      ? `Press ${exitState_2.keyName} again to go back`
      : jsxProd_default(ConfigurableShortcutHint, {
          action: "confirm:no",
          context: "Confirmation",
          fallback: "Esc",
          description: "back",
        });
    $[0] = exitState_2.keyName;
    $[1] = exitState_2.pending;
    $[2] = children;
  } else children = $[2];
  let hint;
  if ($[3] !== children) {
    hint = jsxProd_default(Text, {
      dimColor: true,
      italic: true,
      children,
    });
    $[3] = children;
    $[4] = hint;
  } else hint = $[4];
  return hint;
}
//@ chunk-vrb44rx7.js:30172-30176 placement
// deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
deferInit("chunk-vrb44rx7.js:30172", () => {
  init_react_production();
});
//@ chunk-vrb44rx7.js:30176-30195 layout
var TOOL_DETAIL_REFRESH_MS = 1000;
var TOOL_DETAIL_MIN_MS = 200;
//@ chunk-vrb44rx7.js:30195-33767 fingerprint (2.1.88 match: MCPToolDetailView, 0.553)
function MCPToolDetailView(props) {
  let $ = useMemoCache(50);
  let { tool, server, onBack } = props;
  let [toolDescription, setToolDescription] = useState("");
  let t1;
  let toolName;
  if ($[0] !== server.name || $[1] !== tool) {
    toolName = getMcpDisplayName(tool.name, server.name);
    let fullDisplayName = tool.userFacingName ? tool.userFacingName({}) : toolName;
    t1 = extractMcpToolDisplayName(fullDisplayName);
    $[0] = server.name;
    $[1] = tool;
    $[2] = t1;
    $[3] = toolName;
  } else {
    t1 = $[2];
    toolName = $[3];
  }
  let displayName = t1;
  let t2;
  if ($[4] !== tool) {
    t2 = tool.isReadOnly?.({}) ?? false;
    $[4] = tool;
    $[5] = t2;
  } else t2 = $[5];
  let isReadOnly = t2;
  let t3;
  if ($[6] !== tool) {
    t3 = tool.isDestructive?.({}) ?? false;
    $[6] = tool;
    $[7] = t3;
  } else t3 = $[7];
  let isDestructive = t3;
  let t4;
  if ($[8] !== tool) {
    t4 = tool.isOpenWorld?.({}) ?? false;
    $[8] = tool;
    $[9] = t4;
  } else t4 = $[9];
  let isOpenWorld = t4;
  let descriptionLimit = toolTimeoutForServer(server.config);
  let deferredLimit;
  if ($[10] !== server.config || $[11] !== tool) {
    deferredLimit = toolTimeoutForServer(server.config, isDeferredTool(tool));
    $[10] = server.config;
    $[11] = tool;
    $[12] = deferredLimit;
  } else deferredLimit = $[12];
  let deferredLimit_2 = deferredLimit;
  let t5;
  let descDeps;
  if ($[13] !== tool) {
    t5 = () => {
      let loadDescription = async function loadDescription() {
        try {
          let desc = await tool.description(
            {},
            {
              isNonInteractiveSession: false,
              toolPermissionContext: {
                mode: "default",
                additionalWorkingDirectories: new Map(),
                alwaysAllowRules: {},
                alwaysDenyRules: {},
                alwaysAskRules: {},
                isBypassPermissionsModeAvailable: false,
                mcpPermissionModeOverrides: {},
              },
              tools: [],
            },
          );
          setToolDescription(desc);
        } catch {
          setToolDescription("Failed to load description");
        }
      };
      loadDescription();
    };
    descDeps = [tool];
    $[13] = tool;
    $[14] = t5;
    $[15] = descDeps;
  } else {
    t5 = $[14];
    descDeps = $[15];
  }
  useEffect(t5, descDeps);
  let readOnlyTag;
  if ($[16] !== isReadOnly) {
    readOnlyTag =
      isReadOnly &&
      jsxProd_default(Text, {
        color: "success",
        children: " [read-only]",
      });
    $[16] = isReadOnly;
    $[17] = readOnlyTag;
  } else readOnlyTag = $[17];
  let destructiveTag;
  if ($[18] !== isDestructive) {
    destructiveTag =
      isDestructive &&
      jsxProd_default(Text, {
        color: "error",
        children: " [destructive]",
      });
    $[18] = isDestructive;
    $[19] = destructiveTag;
  } else destructiveTag = $[19];
  let openWorldTag;
  if ($[20] !== isOpenWorld) {
    openWorldTag =
      isOpenWorld &&
      jsxProd_default(Text, {
        dimColor: true,
        children: " [open-world]",
      });
    $[20] = isOpenWorld;
    $[21] = openWorldTag;
  } else openWorldTag = $[21];
  let t10;
  if ($[22] !== displayName || $[23] !== openWorldTag || $[24] !== readOnlyTag || $[25] !== destructiveTag) {
    t10 = jsxProd_default_2(Fragment, {
      children: [displayName, readOnlyTag, destructiveTag, openWorldTag],
    });
    $[22] = displayName;
    $[23] = openWorldTag;
    $[24] = readOnlyTag;
    $[25] = destructiveTag;
    $[26] = t10;
  } else t10 = $[26];
  let titleContent = t10;
  const subtitle = server.name;
  let inputGuide;
  if ($[27] === MEMO_CACHE_SENTINEL) {
    inputGuide = jsxProd_default(ConfigurableShortcutHint, {
      action: "confirm:no",
      context: "Confirmation",
      fallback: "Esc",
      description: "go back",
    });
    $[27] = inputGuide;
  } else inputGuide = $[27];
  let nameLabel;
  if ($[28] === MEMO_CACHE_SENTINEL) {
    nameLabel = jsxProd_default(Text, {
      bold: true,
      children: "Tool name: ",
    });
    $[28] = nameLabel;
  } else nameLabel = $[28];
  let t12;
  if ($[29] !== toolName) {
    t12 = jsxProd_default_2(Box, {
      children: [
        nameLabel,
        jsxProd_default(Text, {
          dimColor: true,
          children: toolName,
        }),
      ],
    });
    $[29] = toolName;
    $[30] = t12;
  } else t12 = $[30];
  let t13;
  if ($[31] === MEMO_CACHE_SENTINEL) {
    t13 = jsxProd_default(Text, {
      bold: true,
      children: "Full name: ",
    });
    $[31] = t13;
  } else t13 = $[31];
  let t14;
  if ($[32] !== tool.name) {
    t14 = jsxProd_default_2(Box, {
      children: [
        t13,
        jsxProd_default(Text, {
          dimColor: true,
          children: tool.name,
        }),
      ],
    });
    $[32] = tool.name;
    $[33] = t14;
  } else t14 = $[33];
  let t15;
  if ($[34] !== deferredLimit_2 || $[35] !== descriptionLimit || $[36] !== toolDescription) {
    t15 =
      toolDescription &&
      jsxProd_default_2(Box, {
        flexDirection: "column",
        marginTop: 1,
        children: [
          jsxProd_default(Text, {
            bold: true,
            children: "Description:",
          }),
          jsxProd_default(Text, {
            wrap: "wrap",
            children: truncateWithCount(toolDescription, Math.min(TOOL_DETAIL_REFRESH_MS, descriptionLimit)),
          }),
          toolDescription.length > descriptionLimit &&
            jsxProd_default_2(Text, {
              dimColor: true,
              children: [
                "The model receives only about the first ",
                descriptionLimit,
                " ",
                "characters",
                deferredLimit_2 > descriptionLimit &&
                  `, or ${deferredLimit_2} once the model loads the tool through tool search`,
                ".",
              ],
            }),
        ],
      });
    $[34] = deferredLimit_2;
    $[35] = descriptionLimit;
    $[36] = toolDescription;
    $[37] = t15;
  } else t15 = $[37];
  let t16;
  if ($[38] !== tool.inputJSONSchema) {
    t16 =
      tool.inputJSONSchema &&
      tool.inputJSONSchema.properties &&
      Object.keys(tool.inputJSONSchema.properties).length > 0 &&
      jsxProd_default_2(Box, {
        flexDirection: "column",
        marginTop: 1,
        children: [
          jsxProd_default(Text, {
            bold: true,
            children: "Parameters:",
          }),
          jsxProd_default(Box, {
            marginLeft: 2,
            flexDirection: "column",
            children: Object.entries(tool.inputJSONSchema.properties).map((t17) => {
              let [key, value] = t17;
              let isRequired = tool.inputJSONSchema?.required?.includes(key);
              return jsxProd_default_2(
                BulletRow,
                {
                  children: [
                    key,
                    jsxProd_default(ParenHint, {
                      when: isRequired ?? false,
                      children: "required",
                    }),
                    ":",
                    " ",
                    jsxProd_default(Text, {
                      dimColor: true,
                      children:
                        typeof value === "object" && value && "type" in value
                          ? String(value.type)
                          : "unknown",
                    }),
                    typeof value === "object" &&
                      value &&
                      "description" in value &&
                      jsxProd_default_2(Text, {
                        dimColor: true,
                        children: [" - ", truncateWithCount(String(value.description), TOOL_DETAIL_MIN_MS)],
                      }),
                  ],
                },
                key,
              );
            }),
          }),
        ],
      });
    $[38] = tool.inputJSONSchema;
    $[39] = t16;
  } else t16 = $[39];
  let children;
  if ($[40] !== t12 || $[41] !== t14 || $[42] !== t15 || $[43] !== t16) {
    children = jsxProd_default_2(Box, {
      flexDirection: "column",
      children: [t12, t14, t15, t16],
    });
    $[40] = t12;
    $[41] = t14;
    $[42] = t15;
    $[43] = t16;
    $[44] = children;
  } else children = $[44];
  let t18;
  if ($[45] !== onBack || $[46] !== server.name || $[47] !== children || $[48] !== titleContent) {
    t18 = jsxProd_default(Dialog, {
      title: titleContent,
      subtitle,
      onCancel: onBack,
      inputGuide,
      children,
    });
    $[45] = onBack;
    $[46] = server.name;
    $[47] = children;
    $[48] = titleContent;
    $[49] = t18;
  } else t18 = $[49];
  return t18;
}
export { MCPToolDetailView, BackHint };
