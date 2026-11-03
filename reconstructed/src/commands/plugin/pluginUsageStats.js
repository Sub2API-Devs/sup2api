/**
 * commands/plugin/pluginUsageStats.tsx
 *
 * 2.1.316 新增：插件/技能的用量与技能列表占用（tok/turn）展示
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-vrb44rx7.js (12)
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
import { w } from "../../../vendor/react/compiler-runtime.js";
import { useAppState } from "../../state/AppState.js";
import { pluginSkillBudgetUsage } from "../../utils/plugins/pluginSkillBudget.js";
import { bytesPerTokenForModel } from "../../utils/model/modelDisplay.js";
import { MEMO_CACHE_SENTINEL } from "../../../runtime/bun-runtime.js";
import { figures_default } from "../../../vendor/@inquirer/figures/dist/esm/index.js";

//@ chunk-vrb44rx7.js:138059-138154 placement
function formatDisableOrUninstall(error) {
  return `${isOfficialMarketplace(parsePluginIdentifier(error.source).marketplace) ? "disable" : "uninstall"} "${quotedPrintable(error.plugin)}"`;
}
//@ chunk-vrb44rx7.js:138154-138158 placement
init_react_production();
//@ chunk-vrb44rx7.js:138158-138201 placement
function selectPluginCommands(pe) {
  return pe.plugins.commands;
}
//@ chunk-vrb44rx7.js:138201-138240 placement
function selectMcpCommands(fe) {
  return fe.mcp.commands;
}
//@ chunk-vrb44rx7.js:138240-138280 placement
function selectMainLoopModel(me) {
  return me.mainLoopModel;
}
//@ chunk-vrb44rx7.js:138280-138478 placement
function renderSkillTokenRow(ne) {
  return jsxProd_default_2(
    Box,
    {
      flexDirection: "row",
      children: [
        jsxProd_default(Box, {
          width: 32,
          children: jsxProd_default_2(Text, {
            dimColor: true,
            children: ["/", ne.name],
          }),
        }),
        jsxProd_default_2(Text, {
          dimColor: true,
          children: ["~", ne.approxTokens, " tok/turn"],
        }),
      ],
    },
    ne.name,
  );
}
//@ chunk-vrb44rx7.js:138478-138510 placement
function isUsed(A) {
  return A.count > 0;
}
//@ chunk-vrb44rx7.js:138510-138758 placement
function renderSkillUsageRow(K) {
  return jsxProd_default_2(
    Box,
    {
      flexDirection: "row",
      children: [
        jsxProd_default(Box, {
          width: 32,
          children: jsxProd_default_2(Text, {
            dimColor: true,
            children: ["/", K.name],
          }),
        }),
        jsxProd_default_2(Text, {
          dimColor: true,
          children: [
            K.count,
            " ",
            plural(K.count, "use"),
            K.lastUsedAt !== null ? ` \xB7 last ${memoryAge(K.lastUsedAt)}` : "",
          ],
        }),
      ],
    },
    K.name,
  );
}
//@ chunk-vrb44rx7.js:138758-139153 placement
function formatLastPrompt(name, commands) {
  let skillUsage = getGlobalConfig().skillUsage ?? {};
  let C = [];
  for (let x of commands) {
    if (x.type !== "prompt" || x.pluginInfo?.pluginManifest.name !== name) continue;
    let T =
      getOwn(skillUsage, x.name) ??
      (x.unqualifiedName != null ? getOwn(skillUsage, x.unqualifiedName) : undefined);
    C.push({
      name: x.name,
      count: T?.usageCount ?? 0,
      lastUsedAt: T?.lastUsedAt ?? null,
    });
  }
  C.sort((x, T) => T.count - x.count);
  return {
    skills: C,
    totalCount: C.reduce((acc, T) => acc + T.count, 0),
    skillCount: C.length,
  };
}
//@ chunk-vrb44rx7.js:139290-140774 placement
/**
 * 显示插件技能描述占系统提示词的 token（每轮）。
 */
function renderSkillListingFootprint(props) {
  let T = w(20);
  let { plugin } = props;
  let appState = useAppState(selectPluginCommands);
  let appState_2 = useAppState(selectMcpCommands);
  let appState_3 = useAppState(selectMainLoopModel);
  let D;
  if (T[0] !== appState_2 || T[1] !== appState_3 || T[2] !== plugin.manifest.name || T[3] !== appState) {
    const byPlugin = pluginSkillBudgetUsage(
      [...appState, ...appState_2],
      bytesPerTokenForModel(appState_3 ?? undefined),
    ).byPlugin;
    let L;
    if (T[5] !== plugin.manifest.name) {
      L = (A) => A.pluginName === plugin.manifest.name;
      T[5] = plugin.manifest.name;
      T[6] = L;
    } else L = T[6];
    D = byPlugin.find(L);
    T[0] = appState_2;
    T[1] = appState_3;
    T[2] = plugin.manifest.name;
    T[3] = appState;
    T[4] = D;
  } else D = T[4];
  let K = D;
  let U;
  if (T[7] !== plugin.manifest.name) {
    U = jsxProd_default_2(Text, {
      bold: true,
      children: [plugin.manifest.name, " \xB7 Usage"],
    });
    T[7] = plugin.manifest.name;
    T[8] = U;
  } else U = T[8];
  let L;
  let V;
  if (T[9] === MEMO_CACHE_SENTINEL) {
    L = jsxProd_default(Text, {
      bold: true,
      children: "Skill-listing footprint",
    });
    V = jsxProd_default(Text, {
      dimColor: true,
      wrap: "wrap",
      children:
        "What this plugin's skill descriptions add to the system prompt (cached input after the first turn). Agents and MCP tools not yet counted.",
    });
    T[9] = L;
    T[10] = V;
  } else {
    L = T[9];
    V = T[10];
  }
  let B;
  if (T[11] !== K) {
    B = jsxProd_default_2(Box, {
      flexDirection: "column",
      children: [
        L,
        V,
        K && K.skills.length > 0
          ? jsxProd_default_2(Box, {
              flexDirection: "column",
              marginTop: 1,
              children: [
                K.skills.map(renderSkillTokenRow),
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
                        K.skillCount,
                        " ",
                        plural(K.skillCount, "skill"),
                        " \xB7 ~",
                        K.approxTokens,
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
    T[11] = K;
    T[12] = B;
  } else B = T[12];
  let _;
  if (T[13] !== plugin || T[14] !== appState) {
    _ = jsxProd_default(renderSkillActivity, {
      plugin,
      commands: appState,
    });
    T[13] = plugin;
    T[14] = appState;
    T[15] = _;
  } else _ = T[15];
  let J;
  if (T[16] !== U || T[17] !== B || T[18] !== _) {
    J = jsxProd_default_2(Box, {
      flexDirection: "column",
      gap: 1,
      children: [U, B, _],
    });
    T[16] = U;
    T[17] = B;
    T[18] = _;
    T[19] = J;
  } else J = T[19];
  return J;
}
//@ chunk-vrb44rx7.js:140774-141686 placement
function renderSkillActivity(props) {
  let C = w(9);
  let { plugin, commands } = props;
  let x;
  if (C[0] !== commands || C[1] !== plugin.manifest.name) {
    x = formatLastPrompt(plugin.manifest.name, commands);
    C[0] = commands;
    C[1] = plugin.manifest.name;
    C[2] = x;
  } else x = C[2];
  let T = x;
  let D;
  let U;
  if (C[3] === MEMO_CACHE_SENTINEL) {
    D = jsxProd_default(Text, {
      bold: true,
      children: "Activity",
    });
    U = jsxProd_default(Text, {
      dimColor: true,
      wrap: "wrap",
      children: "Skill invocations on this machine. See /usage for cost attribution.",
    });
    C[3] = D;
    C[4] = U;
  } else {
    D = C[3];
    U = C[4];
  }
  let L;
  if (C[5] !== T.skillCount || C[6] !== T.skills || C[7] !== T.totalCount) {
    L = jsxProd_default_2(Box, {
      flexDirection: "column",
      children: [
        D,
        U,
        T.totalCount === 0
          ? jsxProd_default(Text, {
              dimColor: true,
              children: "No activity yet",
            })
          : jsxProd_default_2(Box, {
              flexDirection: "column",
              marginTop: 1,
              children: [
                T.skills.filter(isUsed).map(renderSkillUsageRow),
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
                        T.totalCount,
                        " ",
                        plural(T.totalCount, "use"),
                        " across",
                        " ",
                        T.skillCount,
                        " ",
                        plural(T.skillCount, "skill"),
                      ],
                    }),
                  ],
                }),
              ],
            }),
      ],
    });
    C[5] = T.skillCount;
    C[6] = T.skills;
    C[7] = T.totalCount;
    C[8] = L;
  } else L = C[8];
  return L;
}
//@ chunk-vrb44rx7.js:141686-141988 placement
/**
 * 技能状态图标与列宽常量：on/name-only/user-only/off 的图标与色调、安装列 6 列、标题列上下限 44/12、左右预留 20/16。
 */
var HEALTH_COLORS = {
  good: "success",
  warn: "warning",
  poor: "error",
};
var SKILL_STATE_GLYPHS = {
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
var INSTALLED_COLUMN_WIDTH = 6;
var MAX_TITLE_COLUMN_WIDTH = 44;
var MIN_TITLE_COLUMN_WIDTH = 12;
var TITLE_COLUMN_RESERVED_LEFT = 20;
var TITLE_COLUMN_RESERVED_RIGHT = 16;
export {
  MAX_TITLE_COLUMN_WIDTH,
  MIN_TITLE_COLUMN_WIDTH,
  TITLE_COLUMN_RESERVED_LEFT,
  TITLE_COLUMN_RESERVED_RIGHT,
  formatLastPrompt,
  renderSkillListingFootprint,
  formatDisableOrUninstall,
  HEALTH_COLORS,
  INSTALLED_COLUMN_WIDTH,
  SKILL_STATE_GLYPHS,
};
