/**
 * components/ContextVisualization.tsx
 *
 * /context 可视化：按类别（系统提示、工具、MCP、记忆、技能、消息、空闲）显示估算 token 占用的格子图与明细树。
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/components/ContextVisualization.tsx
 * pieces: chunk-5xgkngpb.js (1), chunk-qt8k81nz.js (27)
 * attribution: fingerprint 10, file-local 2, layout 7, callgraph-fingerprint 8, placement 1
 * (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.
 */
import { randomUUID } from "crypto";
import { HostScoped } from "../utils/hostScoped.js";
import {
  jsxProd_default,
  jsxProd_default_2,
  Fragment,
} from "../../vendor/react/cjs/react-jsx-dev-runtime.react-server.production.js";
import { Text, Box } from "../ink/components/Text.js";
import { TreeConnectors } from "./design-system/TreeConnectors.js";
import { formatTokens, formatTokenEstimate } from "../utils/format.js";
import { getDisplayPath } from "../utils/file.js";
import { CLAUDE_AI_SYNC_LABEL } from "../utils/settings/commandSyncNames.js";
import { getSourceDisplayName } from "../utils/settings/constants.js";
import { useMemoCache } from "../../vendor/react/compiler-runtime.js";
import { plural } from "../utils/stringUtils.js";
import { contextOverflowNotice } from "../commands/context/context-noninteractive.js";
import { MEMO_CACHE_SENTINEL } from "../../runtime/bun-runtime.js";
import { getPublicModelDisplayName } from "../utils/model/modelDisplay.js";
import { generateContextSuggestions } from "../utils/contextSuggestions.js";
import { ContextSuggestions } from "./ContextSuggestions.js";
import { deferInit } from "../../runtime/deferred-init.js";

//@ chunk-5xgkngpb.js:3597685-3597744 fingerprint (2.1.88 match: groupBySource, 0.692)
var groupBySource; // deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
deferInit("chunk-5xgkngpb.js:3597685", () => {
  groupBySource = new HostScoped(() => ({
    tokens: new WeakMap(),
    next: 0,
    host: randomUUID(),
  }));
});
//@ chunk-qt8k81nz.js:18488-18576 fingerprint (2.1.88 match: _temp, 1)
function isTokenCategory(cat) {
  return (
    cat.tokens > 0 && cat.name !== "Free space" && cat.name !== AUTOCOMPACT_BUFFER_CATEGORY && !cat.isDeferred
  );
}
//@ chunk-qt8k81nz.js:18576-18638 fingerprint (2.1.88 match: _temp2, 1)
function isDeferredMcpCategory(cat) {
  return cat.isDeferred && cat.name.includes("MCP");
}
//@ chunk-qt8k81nz.js:18638-18673 file-local
function isMessagesCategory(cat) {
  return cat.name === AUTOCOMPACT_BUFFER_CATEGORY;
}
//@ chunk-qt8k81nz.js:18673-18934 fingerprint (2.1.88 match: _temp4, 1)
function renderGridSquare(square, colIndex) {
  if (square.categoryName === "Free space") {
    return jsxProd_default(
      Text,
      {
        dimColor: true,
        children: "\u26F6 ",
      },
      colIndex,
    );
  }
  if (square.categoryName === AUTOCOMPACT_BUFFER_CATEGORY) {
    return jsxProd_default(
      Text,
      {
        color: square.color,
        children: "\u26DD ",
      },
      colIndex,
    );
  }
  return jsxProd_default(
    Text,
    {
      color: square.color,
      children: square.squareFullness >= 0.7 ? "\u26C1 " : "\u26C0 ",
    },
    colIndex,
  );
}
//@ chunk-qt8k81nz.js:18934-19024 fingerprint (2.1.88 match: _temp5, 1)
function renderGridRow(row, rowIndex) {
  return jsxProd_default(
    Box,
    {
      flexDirection: "row",
      marginLeft: -1,
      children: row.map(renderGridSquare),
    },
    rowIndex,
  );
}
//@ chunk-qt8k81nz.js:19024-19070 fingerprint (2.1.88 match: _temp8, 1)
function isFreeSpaceCategory(c_0) {
  return c_0.name === "Free space";
}
//@ chunk-qt8k81nz.js:19070-19116 layout (2.1.88 match: _temp8, 1)
function isFreeSpaceCategory_2(c_0) {
  return c_0.name === "Free space";
}
//@ chunk-qt8k81nz.js:19116-19162 layout (2.1.88 match: _temp8, 1)
function isFreeSpaceCategory_3(c_0) {
  return c_0.name === "Free space";
}
//@ chunk-qt8k81nz.js:19162-19201 callgraph-fingerprint (2.1.88 match: _temp1, 1)
function addTokens(tool, i) {
  return tool + i.tokens;
}
//@ chunk-qt8k81nz.js:19201-19236 fingerprint (2.1.88 match: _temp18, 1)
function isLoadedTool(t_4) {
  return t_4.isLoaded;
}
//@ chunk-qt8k81nz.js:19236-19271 layout (2.1.88 match: _temp18, 1)
function isLoadedTool_2(t_4) {
  return t_4.isLoaded;
}
//@ chunk-qt8k81nz.js:19271-19410 callgraph-fingerprint (2.1.88 match: _temp20, 0.333)
function renderMcpToolRow(section, i_5) {
  return jsxProd_default(
    TreeConnectors.Node,
    {
      children: jsxProd_default_2(Text, {
        children: [
          section.name,
          ":",
          " ",
          jsxProd_default_2(Text, {
            dimColor: true,
            children: [formatTokens(section.tokens), " tokens"],
          }),
        ],
      }),
    },
    i_5,
  );
}
//@ chunk-qt8k81nz.js:19410-19445 layout (2.1.88 match: _temp18, 1)
function isUnloadedTool(t_4) {
  return !t_4.isLoaded;
}
//@ chunk-qt8k81nz.js:19445-19480 layout (2.1.88 match: _temp18, 1)
function isUnloadedTool_2(t_4) {
  return !t_4.isLoaded;
}
//@ chunk-qt8k81nz.js:19480-19551 placement (2.1.88 match: createYogaLayoutNode, 1)
function renderNamedNode(node, key) {
  return jsxProd_default(
    TreeConnectors.Node,
    {
      dimColor: true,
      children: node.name,
    },
    key,
  );
}
//@ chunk-qt8k81nz.js:19551-19690 callgraph-fingerprint (2.1.88 match: _temp27, 0.279)
function renderMcpToolDetailRow(attachment, i_10) {
  return jsxProd_default(
    TreeConnectors.Node,
    {
      children: jsxProd_default_2(Text, {
        children: [
          attachment.name,
          ":",
          " ",
          jsxProd_default_2(Text, {
            dimColor: true,
            children: [formatTokens(attachment.tokens), " tokens"],
          }),
        ],
      }),
    },
    i_10,
  );
}
//@ chunk-qt8k81nz.js:19690-19729 callgraph-fingerprint (2.1.88 match: _temp13, 1)
function addTokens_2(tool_1, i_1) {
  return tool_1 + i_1.tokens;
}
//@ chunk-qt8k81nz.js:19729-19873 fingerprint (2.1.88 match: _temp21, 0.492)
function renderAgentRow(agent, i_6) {
  return jsxProd_default(
    TreeConnectors.Node,
    {
      children: jsxProd_default_2(Text, {
        children: [
          agent.agentType,
          ":",
          " ",
          jsxProd_default_2(Text, {
            dimColor: true,
            children: [formatTokens(agent.tokens), " tokens"],
          }),
        ],
      }),
    },
    i_6,
  );
}
//@ chunk-qt8k81nz.js:19873-20038 callgraph-fingerprint (2.1.88 match: _temp22, 0.346)
function renderAgentSourceGroup(t0) {
  let [sourceDisplay, sourceAgents] = t0;
  return jsxProd_default_2(
    Box,
    {
      flexDirection: "column",
      marginTop: 1,
      children: [
        jsxProd_default(Text, {
          dimColor: true,
          children: sourceDisplay,
        }),
        jsxProd_default(TreeConnectors, {
          variant: "tree",
          children: sourceAgents.map(renderAgentRow),
        }),
      ],
    },
    sourceDisplay,
  );
}
//@ chunk-qt8k81nz.js:20038-20077 callgraph-fingerprint (2.1.88 match: _temp14, 1)
function addTokens_3(tool_2, i_2) {
  return tool_2 + i_2.tokens;
}
//@ chunk-qt8k81nz.js:20077-20220 callgraph-fingerprint (2.1.88 match: _temp23, 0.333)
function renderMemoryFileRow(file, i_7) {
  return jsxProd_default(
    TreeConnectors.Node,
    {
      children: jsxProd_default_2(Text, {
        children: [
          getDisplayPath(file.path),
          ":",
          " ",
          jsxProd_default_2(Text, {
            dimColor: true,
            children: [formatTokens(file.tokens), " tokens"],
          }),
        ],
      }),
    },
    i_7,
  );
}
//@ chunk-qt8k81nz.js:20220-20359 file-local
function renderSkillRow(skill, i_8) {
  return jsxProd_default(
    TreeConnectors.Node,
    {
      children: jsxProd_default_2(Text, {
        children: [
          skill.name,
          ":",
          " ",
          jsxProd_default_2(Text, {
            dimColor: true,
            children: [formatTokenEstimate(skill.tokens), " tokens"],
          }),
        ],
      }),
    },
    i_8,
  );
}
//@ chunk-qt8k81nz.js:20359-20524 layout
function renderSkillSourceGroup(entry) {
  let [sourceName, rows] = entry;
  return jsxProd_default_2(
    Box,
    {
      flexDirection: "column",
      marginTop: 1,
      children: [
        jsxProd_default(Text, {
          dimColor: true,
          children: sourceName,
        }),
        jsxProd_default(TreeConnectors, {
          variant: "tree",
          children: rows.map(renderSkillRow),
        }),
      ],
    },
    sourceName,
  );
}
//@ chunk-qt8k81nz.js:20524-20612 fingerprint (2.1.88 match: SOURCE_DISPLAY_ORDER, 0.816)
var AUTOCOMPACT_BUFFER_CATEGORY = "Autocompact buffer";
var CATEGORY_DISPLAY_ORDER = [
  "Project",
  "User",
  CLAUDE_AI_SYNC_LABEL,
  "Managed",
  "Plugin",
  "MCP",
  "Built-in",
];
//@ chunk-qt8k81nz.js:20612-21054 callgraph-fingerprint (2.1.88 match: _temp16, 0.386)
/**
 * 按来源显示名（插件来源附插件名）分组并按 token 降序排序，组顺序按预设来源顺序，插件子组按名称排序，其余追加在后。
 */
function groupBySourceDisplayName(items) {
  let groups = new Map();
  for (let item of items) {
    let key =
      getSourceDisplayName(item.source) +
      (item.pluginName && item.source !== "syncedSkills" ? ` (${item.pluginName})` : "");
    let existing = groups.get(key) || [];
    existing.push(item);
    groups.set(key, existing);
  }
  for (let [key, group] of groups.entries())
    groups.set(
      key,
      group.sort((left, right) => right.tokens - left.tokens),
    );
  let ordered = new Map();
  for (let source of CATEGORY_DISPLAY_ORDER) {
    let group = groups.get(source);
    if (group) ordered.set(source, group);
    let sorted = [...groups.keys()].filter((key) => key.startsWith(source + " (")).sort();
    for (let key of sorted) ordered.set(key, groups.get(key));
  }
  for (let [key, group] of groups) if (!ordered.has(key)) ordered.set(key, group);
  return ordered;
}
//@ chunk-qt8k81nz.js:21054-21411 layout
/**
 * 渲染折叠项摘要：数量加名词复数与 token 数。
 */
function CollapsedCountSummary(props) {
  let $ = useMemoCache(9);
  let { count, noun, tokens } = props;
  let noun_2;
  if ($[0] !== count || $[1] !== noun) {
    noun_2 = plural(count, noun);
    $[0] = count;
    $[1] = noun;
    $[2] = noun_2;
  } else noun_2 = $[2];
  let tokensText;
  if ($[3] !== tokens) {
    tokensText = formatTokens(tokens);
    $[3] = tokens;
    $[4] = tokensText;
  } else tokensText = $[4];
  let node;
  if ($[5] !== count || $[6] !== noun_2 || $[7] !== tokensText) {
    node = jsxProd_default(TreeConnectors, {
      variant: "tree",
      children: jsxProd_default_2(TreeConnectors.Node, {
        dimColor: true,
        children: [count, " ", noun_2, " \xB7 ", tokensText, " tokens"],
      }),
    });
    $[5] = count;
    $[6] = noun_2;
    $[7] = tokensText;
    $[8] = node;
  } else node = $[8];
  return node;
}
//@ chunk-qt8k81nz.js:21411-28320 fingerprint (2.1.88 match: ContextVisualization, 0.421)
/**
 * /context：按类别统计估算 token（系统提示、系统工具、MCP 工具、自定义 agent、记忆文件、技能、消息、自动压缩缓冲、空闲），用彩色格子图与明细树显示。
 */
function ContextVisualization(props) {
  let $ = useMemoCache(129);
  let { data, collapseDetailSections } = props;
  let isCollapsed = collapseDetailSections === undefined ? false : collapseDetailSections;
  let {
    categories,
    totalTokens,
    rawMaxTokens,
    autocompactSource,
    percentage,
    gridRows,
    model,
    memoryFiles,
    mcpTools,
    deferredBuiltinTools,
    systemTools,
    systemPromptSections,
    agents,
    skills,
    messageBreakdown,
  } = data;
  let deferredToolsCached;
  if ($[0] !== deferredBuiltinTools) {
    deferredToolsCached = deferredBuiltinTools === undefined ? [] : deferredBuiltinTools;
    $[0] = deferredBuiltinTools;
    $[1] = deferredToolsCached;
  } else deferredToolsCached = $[1];
  let deferredTools = deferredToolsCached;
  let DetailBox;
  let UsageBox;
  let OuterBox;
  let hasDetails;
  let hasDeferredTools;
  let hasDeferredMcp;
  let spaceElement;
  let estimateLabel;
  let categoryRows;
  let freeSpaceRow;
  let autocompactRow;
  let flexDirection;
  let gap;
  let gridElement;
  let flexDirection_2;
  let paddingLeft;
  let titleText;
  let overflowNotice;
  let flexDirection_3;
  let gap_2;
  let flexShrink;
  let modelDisplayName;
  let modelIdText;
  let tokenSummary;
  if (
    $[2] !== agents.length ||
    $[3] !== categories ||
    $[4] !== data ||
    $[5] !== deferredTools.length ||
    $[6] !== gridRows ||
    $[7] !== mcpTools.length ||
    $[8] !== memoryFiles.length ||
    $[9] !== model ||
    $[10] !== percentage ||
    $[11] !== rawMaxTokens ||
    $[12] !== skills?.tokens ||
    $[13] !== totalTokens
  ) {
    let visibleCategories = categories.filter(isTokenCategory);
    let hasDeferredMcpCached;
    if ($[38] !== categories) {
      hasDeferredMcpCached = categories.some(isDeferredMcpCategory);
      $[38] = categories;
      $[39] = hasDeferredMcpCached;
    } else hasDeferredMcpCached = $[39];
    hasDeferredMcp = hasDeferredMcpCached;
    hasDeferredTools = deferredTools.length > 0;
    let autocompactCategory = categories.find(isMessagesCategory);
    let overflowNoticeText;
    if ($[40] !== data) {
      overflowNoticeText = contextOverflowNotice(data);
      $[40] = data;
      $[41] = overflowNoticeText;
    } else overflowNoticeText = $[41];
    let overflowNotice_2 = overflowNoticeText;
    hasDetails =
      mcpTools.length > 0 ||
      agents.length > 0 ||
      memoryFiles.length > 0 ||
      (skills?.tokens ?? 0) > 0 ||
      false;
    OuterBox = Box;
    flexDirection_2 = "column";
    paddingLeft = 1;
    if ($[42] === MEMO_CACHE_SENTINEL) {
      titleText = jsxProd_default(Text, {
        bold: true,
        children: "Context Usage",
      });
      $[42] = titleText;
    } else titleText = $[42];
    if ($[43] !== overflowNotice_2) {
      overflowNotice =
        overflowNotice_2 &&
        jsxProd_default(Text, {
          color: "error",
          wrap: "wrap",
          children: overflowNotice_2,
        });
      $[43] = overflowNotice_2;
      $[44] = overflowNotice;
    } else overflowNotice = $[44];
    UsageBox = Box;
    flexDirection = "row";
    gap = 2;
    let children;
    if ($[45] !== gridRows) {
      children = gridRows.map(renderGridRow);
      $[45] = gridRows;
      $[46] = children;
    } else children = $[46];
    if ($[47] !== children) {
      gridElement = jsxProd_default(Box, {
        flexDirection: "column",
        flexShrink: 0,
        children,
      });
      $[47] = children;
      $[48] = gridElement;
    } else gridElement = $[48];
    DetailBox = Box;
    flexDirection_3 = "column";
    gap_2 = 0;
    flexShrink = 0;
    if ($[49] !== model) {
      modelDisplayName =
        getPublicModelDisplayName(model) &&
        jsxProd_default(Text, {
          children: getPublicModelDisplayName(model),
        });
      $[49] = model;
      $[50] = modelDisplayName;
    } else modelDisplayName = $[50];
    if ($[51] !== model) {
      modelIdText = jsxProd_default(Text, {
        dimColor: true,
        children: model,
      });
      $[51] = model;
      $[52] = modelIdText;
    } else modelIdText = $[52];
    let usedTokensText;
    if ($[53] !== totalTokens) {
      usedTokensText = formatTokens(totalTokens);
      $[53] = totalTokens;
      $[54] = usedTokensText;
    } else usedTokensText = $[54];
    let maxTokensText;
    if ($[55] !== rawMaxTokens) {
      maxTokensText = formatTokens(rawMaxTokens);
      $[55] = rawMaxTokens;
      $[56] = maxTokensText;
    } else maxTokensText = $[56];
    if ($[57] !== percentage || $[58] !== usedTokensText || $[59] !== maxTokensText) {
      tokenSummary = jsxProd_default_2(Text, {
        dimColor: true,
        children: [usedTokensText, "/", maxTokensText, " tokens (", percentage, "%)"],
      });
      $[57] = percentage;
      $[58] = usedTokensText;
      $[59] = maxTokensText;
      $[60] = tokenSummary;
    } else tokenSummary = $[60];
    if ($[61] === MEMO_CACHE_SENTINEL) {
      spaceElement = jsxProd_default(Text, {
        children: " ",
      });
      estimateLabel = jsxProd_default(Text, {
        dimColor: true,
        italic: true,
        children: "Estimated usage by category",
      });
      $[61] = spaceElement;
      $[62] = estimateLabel;
    } else {
      spaceElement = $[61];
      estimateLabel = $[62];
    }
    let renderCategoryRow;
    if ($[63] !== rawMaxTokens) {
      renderCategoryRow = (cat, index) => {
        let tokenDisplay = formatTokens(cat.tokens);
        let percentDisplay = cat.isDeferred ? "N/A" : `${((cat.tokens / rawMaxTokens) * 100).toFixed(1)}%`;
        let isReserved = cat.name === AUTOCOMPACT_BUFFER_CATEGORY;
        let displayName = cat.name;
        let children = cat.isDeferred ? " " : isReserved ? "\u26DD" : "\u26C1";
        return jsxProd_default_2(
          Box,
          {
            children: [
              jsxProd_default(Text, {
                color: cat.color,
                children,
              }),
              jsxProd_default_2(Text, {
                children: [" ", displayName, ": "],
              }),
              jsxProd_default_2(Text, {
                dimColor: true,
                children: [tokenDisplay, " tokens (", percentDisplay, ")"],
              }),
            ],
          },
          index,
        );
      };
      $[63] = rawMaxTokens;
      $[64] = renderCategoryRow;
    } else renderCategoryRow = $[64];
    categoryRows = visibleCategories.map(renderCategoryRow);
    if ($[65] !== categories || $[66] !== rawMaxTokens) {
      freeSpaceRow =
        (categories.find(isFreeSpaceCategory)?.tokens ?? 0) > 0 &&
        jsxProd_default_2(Box, {
          children: [
            jsxProd_default(Text, {
              dimColor: true,
              children: "\u26F6",
            }),
            jsxProd_default(Text, {
              children: " Free space: ",
            }),
            jsxProd_default_2(Text, {
              dimColor: true,
              children: [
                formatTokens(categories.find(isFreeSpaceCategory_2)?.tokens || 0),
                " ",
                "(",
                (((categories.find(isFreeSpaceCategory_3)?.tokens || 0) / rawMaxTokens) * 100).toFixed(1),
                "%)",
              ],
            }),
          ],
        });
      $[65] = categories;
      $[66] = rawMaxTokens;
      $[67] = freeSpaceRow;
    } else freeSpaceRow = $[67];
    autocompactRow =
      autocompactCategory &&
      autocompactCategory.tokens > 0 &&
      jsxProd_default_2(Box, {
        children: [
          jsxProd_default(Text, {
            color: autocompactCategory.color,
            children: "\u26DD",
          }),
          jsxProd_default_2(Text, {
            dimColor: true,
            children: [" ", autocompactCategory.name, ": "],
          }),
          jsxProd_default_2(Text, {
            dimColor: true,
            children: [
              formatTokens(autocompactCategory.tokens),
              " tokens (",
              ((autocompactCategory.tokens / rawMaxTokens) * 100).toFixed(1),
              "%)",
            ],
          }),
        ],
      });
    $[2] = agents.length;
    $[3] = categories;
    $[4] = data;
    $[5] = deferredTools.length;
    $[6] = gridRows;
    $[7] = mcpTools.length;
    $[8] = memoryFiles.length;
    $[9] = model;
    $[10] = percentage;
    $[11] = rawMaxTokens;
    $[12] = skills?.tokens;
    $[13] = totalTokens;
    $[14] = DetailBox;
    $[15] = UsageBox;
    $[16] = OuterBox;
    $[17] = hasDetails;
    $[18] = hasDeferredTools;
    $[19] = hasDeferredMcp;
    $[20] = spaceElement;
    $[21] = estimateLabel;
    $[22] = categoryRows;
    $[23] = freeSpaceRow;
    $[24] = autocompactRow;
    $[25] = flexDirection;
    $[26] = gap;
    $[27] = gridElement;
    $[28] = flexDirection_2;
    $[29] = paddingLeft;
    $[30] = titleText;
    $[31] = overflowNotice;
    $[32] = flexDirection_3;
    $[33] = gap_2;
    $[34] = flexShrink;
    $[35] = modelDisplayName;
    $[36] = modelIdText;
    $[37] = tokenSummary;
  } else {
    DetailBox = $[14];
    UsageBox = $[15];
    OuterBox = $[16];
    hasDetails = $[17];
    hasDeferredTools = $[18];
    hasDeferredMcp = $[19];
    spaceElement = $[20];
    estimateLabel = $[21];
    categoryRows = $[22];
    freeSpaceRow = $[23];
    autocompactRow = $[24];
    flexDirection = $[25];
    gap = $[26];
    gridElement = $[27];
    flexDirection_2 = $[28];
    paddingLeft = $[29];
    titleText = $[30];
    overflowNotice = $[31];
    flexDirection_3 = $[32];
    gap_2 = $[33];
    flexShrink = $[34];
    modelDisplayName = $[35];
    modelIdText = $[36];
    tokenSummary = $[37];
  }
  let rightColumn;
  if (
    $[68] !== DetailBox ||
    $[69] !== spaceElement ||
    $[70] !== estimateLabel ||
    $[71] !== categoryRows ||
    $[72] !== freeSpaceRow ||
    $[73] !== autocompactRow ||
    $[74] !== flexDirection_3 ||
    $[75] !== gap_2 ||
    $[76] !== flexShrink ||
    $[77] !== modelDisplayName ||
    $[78] !== modelIdText ||
    $[79] !== tokenSummary
  ) {
    rightColumn = jsxProd_default_2(DetailBox, {
      flexDirection: flexDirection_3,
      gap: gap_2,
      flexShrink,
      children: [
        modelDisplayName,
        modelIdText,
        tokenSummary,
        spaceElement,
        estimateLabel,
        categoryRows,
        freeSpaceRow,
        autocompactRow,
      ],
    });
    $[68] = DetailBox;
    $[69] = spaceElement;
    $[70] = estimateLabel;
    $[71] = categoryRows;
    $[72] = freeSpaceRow;
    $[73] = autocompactRow;
    $[74] = flexDirection_3;
    $[75] = gap_2;
    $[76] = flexShrink;
    $[77] = modelDisplayName;
    $[78] = modelIdText;
    $[79] = tokenSummary;
    $[80] = rightColumn;
  } else rightColumn = $[80];
  let usageRow;
  if (
    $[81] !== UsageBox ||
    $[82] !== flexDirection ||
    $[83] !== gap ||
    $[84] !== gridElement ||
    $[85] !== rightColumn
  ) {
    usageRow = jsxProd_default_2(UsageBox, {
      flexDirection,
      gap,
      children: [gridElement, rightColumn],
    });
    $[81] = UsageBox;
    $[82] = flexDirection;
    $[83] = gap;
    $[84] = gridElement;
    $[85] = rightColumn;
    $[86] = usageRow;
  } else usageRow = $[86];
  let autocompactRowElement;
  if ($[87] !== autocompactSource || $[88] !== rawMaxTokens) {
    autocompactRowElement =
      autocompactSource !== "auto" &&
      jsxProd_default_2(Box, {
        marginTop: 1,
        children: [
          jsxProd_default(Text, {
            bold: true,
            children: "Auto-compact window: ",
          }),
          jsxProd_default(Text, {
            dimColor: true,
            children:
              autocompactSource === "experiment" || autocompactSource === "clientdata"
                ? `auto (${formatTokens(rawMaxTokens)} tokens)`
                : autocompactSource === "unknown-model"
                  ? `${formatTokens(rawMaxTokens)} tokens (default for an unrecognized model)`
                  : `${formatTokens(rawMaxTokens)} tokens`,
          }),
        ],
      });
    $[87] = autocompactSource;
    $[88] = rawMaxTokens;
    $[89] = autocompactRowElement;
  } else autocompactRowElement = $[89];
  let mcpToolsElement;
  if ($[90] !== isCollapsed || $[91] !== hasDeferredMcp || $[92] !== mcpTools) {
    mcpToolsElement =
      mcpTools.length > 0 &&
      jsxProd_default_2(Box, {
        flexDirection: "column",
        marginTop: 1,
        children: [
          jsxProd_default_2(Box, {
            children: [
              jsxProd_default(Text, {
                bold: true,
                children: "MCP tools",
              }),
              jsxProd_default_2(Text, {
                dimColor: true,
                children: [" ", "\xB7 /mcp", hasDeferredMcp ? " (loaded on-demand)" : ""],
              }),
            ],
          }),
          isCollapsed
            ? jsxProd_default(CollapsedCountSummary, {
                count: mcpTools.length,
                noun: "tool",
                tokens: mcpTools
                  .filter((mcpTool) => !hasDeferredMcp || mcpTool.isLoaded)
                  .reduce(addTokens, 0),
              })
            : jsxProd_default_2(Fragment, {
                children: [
                  mcpTools.some(isLoadedTool) &&
                    jsxProd_default_2(Box, {
                      flexDirection: "column",
                      marginTop: 1,
                      children: [
                        jsxProd_default(Text, {
                          dimColor: true,
                          children: "Loaded",
                        }),
                        jsxProd_default(TreeConnectors, {
                          variant: "tree",
                          children: mcpTools.filter(isLoadedTool_2).map(renderMcpToolRow),
                        }),
                      ],
                    }),
                  hasDeferredMcp &&
                    mcpTools.some(isUnloadedTool) &&
                    jsxProd_default_2(Box, {
                      flexDirection: "column",
                      marginTop: 1,
                      children: [
                        jsxProd_default(Text, {
                          dimColor: true,
                          children: "Available",
                        }),
                        jsxProd_default(TreeConnectors, {
                          variant: "tree",
                          children: mcpTools.filter(isUnloadedTool_2).map(renderNamedNode),
                        }),
                      ],
                    }),
                  !hasDeferredMcp &&
                    jsxProd_default(TreeConnectors, {
                      variant: "tree",
                      children: mcpTools.map(renderMcpToolDetailRow),
                    }),
                ],
              }),
        ],
      });
    $[90] = isCollapsed;
    $[91] = hasDeferredMcp;
    $[92] = mcpTools;
    $[93] = mcpToolsElement;
  } else mcpToolsElement = $[93];
  const systemToolsElement = ((systemTools && systemTools.length > 0) || hasDeferredTools) && false;
  const systemPromptElement = systemPromptSections && systemPromptSections.length > 0 && false;
  let agentsElement;
  if ($[94] !== agents || $[95] !== isCollapsed) {
    agentsElement =
      agents.length > 0 &&
      jsxProd_default_2(Box, {
        flexDirection: "column",
        marginTop: 1,
        children: [
          jsxProd_default_2(Box, {
            children: [
              jsxProd_default(Text, {
                bold: true,
                children: "Custom agents",
              }),
              jsxProd_default(Text, {
                dimColor: true,
                children: " \xB7 .claude/agents/",
              }),
            ],
          }),
          isCollapsed
            ? jsxProd_default(CollapsedCountSummary, {
                count: agents.length,
                noun: "agent",
                tokens: agents.reduce(addTokens_2, 0),
              })
            : Array.from(groupBySourceDisplayName(agents).entries()).map(renderAgentSourceGroup),
        ],
      });
    $[94] = agents;
    $[95] = isCollapsed;
    $[96] = agentsElement;
  } else agentsElement = $[96];
  let memoryFilesElement;
  if ($[97] !== isCollapsed || $[98] !== memoryFiles) {
    memoryFilesElement =
      memoryFiles.length > 0 &&
      jsxProd_default_2(Box, {
        flexDirection: "column",
        marginTop: 1,
        children: [
          jsxProd_default_2(Box, {
            children: [
              jsxProd_default(Text, {
                bold: true,
                children: "Memory files",
              }),
              jsxProd_default(Text, {
                dimColor: true,
                children: " \xB7 /memory",
              }),
            ],
          }),
          isCollapsed
            ? jsxProd_default(CollapsedCountSummary, {
                count: memoryFiles.length,
                noun: "file",
                tokens: memoryFiles.reduce(addTokens_3, 0),
              })
            : jsxProd_default(TreeConnectors, {
                variant: "tree",
                children: memoryFiles.map(renderMemoryFileRow),
              }),
        ],
      });
    $[97] = isCollapsed;
    $[98] = memoryFiles;
    $[99] = memoryFilesElement;
  } else memoryFilesElement = $[99];
  let skillsElement;
  if ($[100] !== isCollapsed || $[101] !== skills) {
    skillsElement =
      skills &&
      skills.tokens > 0 &&
      jsxProd_default_2(Box, {
        flexDirection: "column",
        marginTop: 1,
        children: [
          jsxProd_default_2(Box, {
            children: [
              jsxProd_default(Text, {
                bold: true,
                children: "Skills",
              }),
              jsxProd_default(Text, {
                dimColor: true,
                children: " \xB7 /skills",
              }),
            ],
          }),
          isCollapsed
            ? jsxProd_default(CollapsedCountSummary, {
                count: skills.skillFrontmatter.length,
                noun: "skill",
                tokens: skills.tokens,
              })
            : Array.from(groupBySourceDisplayName(skills.skillFrontmatter).entries()).map(
                renderSkillSourceGroup,
              ),
        ],
      });
    $[100] = isCollapsed;
    $[101] = skills;
    $[102] = skillsElement;
  } else skillsElement = $[102];
  const messageBreakdownElement = messageBreakdown && false;
  let expandHint;
  if ($[103] !== isCollapsed || $[104] !== hasDetails) {
    expandHint =
      isCollapsed &&
      hasDetails &&
      jsxProd_default(Box, {
        marginTop: 1,
        children: jsxProd_default(Text, {
          dimColor: true,
          children: "/context all to expand",
        }),
      });
    $[103] = isCollapsed;
    $[104] = hasDetails;
    $[105] = expandHint;
  } else expandHint = $[105];
  let detailsElement;
  if (
    $[106] !== autocompactRowElement ||
    $[107] !== mcpToolsElement ||
    $[108] !== systemToolsElement ||
    $[109] !== systemPromptElement ||
    $[110] !== agentsElement ||
    $[111] !== memoryFilesElement ||
    $[112] !== skillsElement ||
    $[113] !== messageBreakdownElement ||
    $[114] !== expandHint
  ) {
    detailsElement = jsxProd_default_2(Box, {
      flexDirection: "column",
      marginLeft: -1,
      children: [
        autocompactRowElement,
        mcpToolsElement,
        systemToolsElement,
        systemPromptElement,
        agentsElement,
        memoryFilesElement,
        skillsElement,
        messageBreakdownElement,
        expandHint,
      ],
    });
    $[106] = autocompactRowElement;
    $[107] = mcpToolsElement;
    $[108] = systemToolsElement;
    $[109] = systemPromptElement;
    $[110] = agentsElement;
    $[111] = memoryFilesElement;
    $[112] = skillsElement;
    $[113] = messageBreakdownElement;
    $[114] = expandHint;
    $[115] = detailsElement;
  } else detailsElement = $[115];
  let suggestions;
  if ($[116] !== data) {
    suggestions = generateContextSuggestions(data);
    $[116] = data;
    $[117] = suggestions;
  } else suggestions = $[117];
  let suggestionsElement;
  if ($[118] !== suggestions) {
    suggestionsElement = jsxProd_default(ContextSuggestions, {
      suggestions,
    });
    $[118] = suggestions;
    $[119] = suggestionsElement;
  } else suggestionsElement = $[119];
  let rootElement;
  if (
    $[120] !== OuterBox ||
    $[121] !== flexDirection_2 ||
    $[122] !== paddingLeft ||
    $[123] !== titleText ||
    $[124] !== overflowNotice ||
    $[125] !== usageRow ||
    $[126] !== detailsElement ||
    $[127] !== suggestionsElement
  ) {
    rootElement = jsxProd_default_2(OuterBox, {
      flexDirection: flexDirection_2,
      paddingLeft,
      children: [titleText, overflowNotice, usageRow, detailsElement, suggestionsElement],
    });
    $[120] = OuterBox;
    $[121] = flexDirection_2;
    $[122] = paddingLeft;
    $[123] = titleText;
    $[124] = overflowNotice;
    $[125] = usageRow;
    $[126] = detailsElement;
    $[127] = suggestionsElement;
    $[128] = rootElement;
  } else rootElement = $[128];
  return rootElement;
}
export { groupBySource, ContextVisualization };
