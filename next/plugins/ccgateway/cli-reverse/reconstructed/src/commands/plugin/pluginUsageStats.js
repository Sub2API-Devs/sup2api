/**
 * commands/plugin/pluginUsageStats.tsx
 *
 * 2.1.316 新增：插件/技能的用量与技能列表占用（tok/turn）展示
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * new in 2.1.318 (2.1.88 has no file at this path)
 * pieces: chunk-wb51jffc.js (12)
 * attribution: placement 12
 */
import { isOfficialMarketplace, parsePluginIdentifier } from "../../utils/plugins/pluginIdentifier.js";
import { quotedPrintable } from "../../utils/printableName.js";
import { init_react_production } from "../../../vendor/react/cjs/react.production.js";
import {
  jsxProd_default_2,
  jsxProd_default,
} from "../../../vendor/react/cjs/react-jsx-dev-runtime.react-server.production.js";
import { Box, Text } from "../../ink/components/Text.js";
import { plural } from "../../utils/stringUtils.js";
import { memoryAge } from "../../memdir/memoryAge.js";
import { getGlobalConfig } from "../../utils/config.js";
import { getOwn } from "../../utils/objectSafety.js";
import { useMemoCache } from "../../../vendor/react/compiler-runtime.js";
import { useAppState } from "../../state/AppState.js";
import { pluginSkillBudgetUsage } from "../../utils/plugins/pluginSkillBudget.js";
import { bytesPerTokenForModel } from "../../utils/model/modelDisplay.js";
import { MEMO_CACHE_SENTINEL } from "../../../runtime/bun-runtime.js";
import { figures_default } from "../../../vendor/@inquirer/figures/dist/esm/index.js";
import { deferInit } from "../../../runtime/deferred-init.js";

//@ chunk-wb51jffc.js:138258-138353 placement
function formatDisableOrUninstall(error) {
  return `${isOfficialMarketplace(parsePluginIdentifier(error.source).marketplace) ? "disable" : "uninstall"} "${quotedPrintable(error.plugin)}"`;
}
//@ chunk-wb51jffc.js:138353-138357 placement
// deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
deferInit("chunk-wb51jffc.js:138353", () => {
  init_react_production();
});
//@ chunk-wb51jffc.js:138357-138400 placement
function selectPluginCommands(state) {
  return state.plugins.commands;
}
//@ chunk-wb51jffc.js:138400-138439 placement
function selectMcpCommands(state) {
  return state.mcp.commands;
}
//@ chunk-wb51jffc.js:138439-138479 placement
function selectMainLoopModel(state) {
  return state.mainLoopModel;
}
//@ chunk-wb51jffc.js:138479-138677 placement
function renderSkillTokenRow(row) {
  return jsxProd_default_2(
    Box,
    {
      flexDirection: "row",
      children: [
        jsxProd_default(Box, {
          width: 32,
          children: jsxProd_default_2(Text, {
            dimColor: true,
            children: ["/", row.name],
          }),
        }),
        jsxProd_default_2(Text, {
          dimColor: true,
          children: ["~", row.approxTokens, " tok/turn"],
        }),
      ],
    },
    row.name,
  );
}
//@ chunk-wb51jffc.js:138677-138709 placement
function isUsed(entry) {
  return entry.count > 0;
}
//@ chunk-wb51jffc.js:138709-138957 placement
function renderSkillUsageRow(row) {
  return jsxProd_default_2(
    Box,
    {
      flexDirection: "row",
      children: [
        jsxProd_default(Box, {
          width: 32,
          children: jsxProd_default_2(Text, {
            dimColor: true,
            children: ["/", row.name],
          }),
        }),
        jsxProd_default_2(Text, {
          dimColor: true,
          children: [
            row.count,
            " ",
            plural(row.count, "use"),
            row.lastUsedAt !== null ? ` \xB7 last ${memoryAge(row.lastUsedAt)}` : "",
          ],
        }),
      ],
    },
    row.name,
  );
}
//@ chunk-wb51jffc.js:138957-139352 placement
function formatLastPrompt(name, commands) {
  let skillUsage = getGlobalConfig().skillUsage ?? {};
  let rows = [];
  for (let command of commands) {
    if (command.type !== "prompt" || command.pluginInfo?.pluginManifest.name !== name) continue;
    let row =
      getOwn(skillUsage, command.name) ??
      (command.unqualifiedName != null ? getOwn(skillUsage, command.unqualifiedName) : undefined);
    rows.push({
      name: command.name,
      count: row?.usageCount ?? 0,
      lastUsedAt: row?.lastUsedAt ?? null,
    });
  }
  rows.sort((a, b) => b.count - a.count);
  return {
    skills: rows,
    totalCount: rows.reduce((acc, row) => acc + row.count, 0),
    skillCount: rows.length,
  };
}
//@ chunk-wb51jffc.js:139489-140973 placement
/**
 * 显示插件技能描述占系统提示词的 token（每轮）。
 */
function renderSkillListingFootprint(props) {
  let $ = useMemoCache(20);
  let { plugin } = props;
  let appState = useAppState(selectPluginCommands);
  let appState_2 = useAppState(selectMcpCommands);
  let appState_3 = useAppState(selectMainLoopModel);
  let budget;
  if ($[0] !== appState_2 || $[1] !== appState_3 || $[2] !== plugin.manifest.name || $[3] !== appState) {
    const byPlugin = pluginSkillBudgetUsage(
      [...appState, ...appState_2],
      bytesPerTokenForModel(appState_3 ?? undefined),
    ).byPlugin;
    let matchPlugin;
    if ($[5] !== plugin.manifest.name) {
      matchPlugin = (entry) => entry.pluginName === plugin.manifest.name;
      $[5] = plugin.manifest.name;
      $[6] = matchPlugin;
    } else matchPlugin = $[6];
    budget = byPlugin.find(matchPlugin);
    $[0] = appState_2;
    $[1] = appState_3;
    $[2] = plugin.manifest.name;
    $[3] = appState;
    $[4] = budget;
  } else budget = $[4];
  let usage = budget;
  let titleLine;
  if ($[7] !== plugin.manifest.name) {
    titleLine = jsxProd_default_2(Text, {
      bold: true,
      children: [plugin.manifest.name, " \xB7 Usage"],
    });
    $[7] = plugin.manifest.name;
    $[8] = titleLine;
  } else titleLine = $[8];
  let content;
  let footer;
  if ($[9] === MEMO_CACHE_SENTINEL) {
    content = jsxProd_default(Text, {
      bold: true,
      children: "Skill-listing footprint",
    });
    footer = jsxProd_default(Text, {
      dimColor: true,
      wrap: "wrap",
      children:
        "What this plugin's skill descriptions add to the system prompt (cached input after the first turn). Agents and MCP tools not yet counted.",
    });
    $[9] = content;
    $[10] = footer;
  } else {
    content = $[9];
    footer = $[10];
  }
  let statusLine;
  if ($[11] !== usage) {
    statusLine = jsxProd_default_2(Box, {
      flexDirection: "column",
      children: [
        content,
        footer,
        usage && usage.skills.length > 0
          ? jsxProd_default_2(Box, {
              flexDirection: "column",
              marginTop: 1,
              children: [
                usage.skills.map(renderSkillTokenRow),
                jsxProd_default_2(Box, {
                  flexDirection: "row",
                  marginTop: 1,
                  children: [
                    jsxProd_default(Box, {
                      width: 32,
                      children: jsxProd_default(Text, {
                        children: "Total",
                      }),
                    }),
                    jsxProd_default_2(Text, {
                      children: [
                        usage.skillCount,
                        " ",
                        plural(usage.skillCount, "skill"),
                        " \xB7 ~",
                        usage.approxTokens,
                        " tok/turn",
                      ],
                    }),
                  ],
                }),
              ],
            })
          : jsxProd_default(Text, {
              dimColor: true,
              children: "No model-invocable skills loaded for this plugin",
            }),
      ],
    });
    $[11] = usage;
    $[12] = statusLine;
  } else statusLine = $[12];
  let hintLine;
  if ($[13] !== plugin || $[14] !== appState) {
    hintLine = jsxProd_default(renderSkillActivity, {
      plugin,
      commands: appState,
    });
    $[13] = plugin;
    $[14] = appState;
    $[15] = hintLine;
  } else hintLine = $[15];
  let footerBox;
  if ($[16] !== titleLine || $[17] !== statusLine || $[18] !== hintLine) {
    footerBox = jsxProd_default_2(Box, {
      flexDirection: "column",
      gap: 1,
      children: [titleLine, statusLine, hintLine],
    });
    $[16] = titleLine;
    $[17] = statusLine;
    $[18] = hintLine;
    $[19] = footerBox;
  } else footerBox = $[19];
  return footerBox;
}
//@ chunk-wb51jffc.js:140973-141885 placement
function renderSkillActivity(props) {
  let $ = useMemoCache(9);
  let { plugin, commands } = props;
  let content;
  if ($[0] !== commands || $[1] !== plugin.manifest.name) {
    content = formatLastPrompt(plugin.manifest.name, commands);
    $[0] = commands;
    $[1] = plugin.manifest.name;
    $[2] = content;
  } else content = $[2];
  let rendered = content;
  let status;
  let footer;
  if ($[3] === MEMO_CACHE_SENTINEL) {
    status = jsxProd_default(Text, {
      bold: true,
      children: "Activity",
    });
    footer = jsxProd_default(Text, {
      dimColor: true,
      wrap: "wrap",
      children: "Skill invocations on this machine. See /usage for cost attribution.",
    });
    $[3] = status;
    $[4] = footer;
  } else {
    status = $[3];
    footer = $[4];
  }
  let details;
  if ($[5] !== rendered.skillCount || $[6] !== rendered.skills || $[7] !== rendered.totalCount) {
    details = jsxProd_default_2(Box, {
      flexDirection: "column",
      children: [
        status,
        footer,
        rendered.totalCount === 0
          ? jsxProd_default(Text, {
              dimColor: true,
              children: "No activity yet",
            })
          : jsxProd_default_2(Box, {
              flexDirection: "column",
              marginTop: 1,
              children: [
                rendered.skills.filter(isUsed).map(renderSkillUsageRow),
                jsxProd_default_2(Box, {
                  flexDirection: "row",
                  marginTop: 1,
                  children: [
                    jsxProd_default(Box, {
                      width: 32,
                      children: jsxProd_default(Text, {
                        children: "Total",
                      }),
                    }),
                    jsxProd_default_2(Text, {
                      children: [
                        rendered.totalCount,
                        " ",
                        plural(rendered.totalCount, "use"),
                        " across",
                        " ",
                        rendered.skillCount,
                        " ",
                        plural(rendered.skillCount, "skill"),
                      ],
                    }),
                  ],
                }),
              ],
            }),
      ],
    });
    $[5] = rendered.skillCount;
    $[6] = rendered.skills;
    $[7] = rendered.totalCount;
    $[8] = details;
  } else details = $[8];
  return details;
}
//@ chunk-wb51jffc.js:141885-142187 placement
/**
 * 技能状态图标与列宽常量：on/name-only/user-only/off 的图标与色调、安装列 6 列、标题列上下限 44/12、左右预留 20/16。
 */
var HEALTH_COLORS; // deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
var SKILL_STATE_GLYPHS;
var INSTALLED_COLUMN_WIDTH;
var MAX_TITLE_COLUMN_WIDTH;
var MIN_TITLE_COLUMN_WIDTH;
var TITLE_COLUMN_RESERVED_LEFT;
var TITLE_COLUMN_RESERVED_RIGHT;
deferInit("chunk-wb51jffc.js:141885", () => {
  HEALTH_COLORS = {
    good: "success",
    warn: "warning",
    poor: "error",
  };
  SKILL_STATE_GLYPHS = {
    on: {
      glyph: figures_default.tick,
      label: "on",
      tone: "success",
    },
    "name-only": {
      glyph: figures_default.bullet,
      label: "name-only",
    },
    "user-invocable-only": {
      glyph: figures_default.circle,
      label: "user-only",
      tone: "warning",
    },
    off: {
      glyph: figures_default.circle,
      label: "off",
      tone: "inactive",
    },
  };
  INSTALLED_COLUMN_WIDTH = 6;
  MAX_TITLE_COLUMN_WIDTH = 44;
  MIN_TITLE_COLUMN_WIDTH = 12;
  TITLE_COLUMN_RESERVED_LEFT = 20;
  TITLE_COLUMN_RESERVED_RIGHT = 16;
});
export {
  MAX_TITLE_COLUMN_WIDTH,
  MIN_TITLE_COLUMN_WIDTH,
  TITLE_COLUMN_RESERVED_LEFT,
  TITLE_COLUMN_RESERVED_RIGHT,
  formatDisableOrUninstall,
  HEALTH_COLORS,
  INSTALLED_COLUMN_WIDTH,
  SKILL_STATE_GLYPHS,
  formatLastPrompt,
  renderSkillListingFootprint,
};
