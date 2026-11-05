/**
 * commands/plugin/SkillDoctor.tsx
 *
 * 2.1.316 新增：技能体检（cli_skill_doctor）：本会话加载的技能、最近未使用的插件、技能用量
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * new in 2.1.318 (2.1.88 has no file at this path)
 * pieces: chunk-wb51jffc.js (16)
 * attribution: placement 16
 */
import {
  loadInstalledPlugins,
  hasFailedInstalledPluginsRead,
  hasInstallationForCurrentProject,
} from "../../utils/plugins/installedPluginsManager.js";
import { findPluginName, pluginNamesEqual } from "../../utils/plugins/pluginIdentifier.js";
import { getPluginEditableScopes } from "../../utils/plugins/pluginStartupCheck.js";
import { INLINE_PLUGIN_MARKETPLACE, SKILLS_DIR, SYNCED } from "../../utils/telemetry/pluginTelemetry.js";
import { getFeatureValue_CACHED_MAY_BE_STALE } from "../../services/analytics/growthbook.js";
import { getMainQueryRunning } from "../../bootstrap/state.js";
import { logEvent } from "../../services/analytics/index.js";
import { fromEnum } from "../../services/analytics/safeMetadata.js";
import { logFeatureOk, logFeatureSad, logFeatureBad } from "../../services/analytics/featureTelemetry.js";
import {
  init_react_production,
  useState,
  suspenseTypeExport,
  use,
} from "../../../vendor/react/cjs/react.production.js";
import { printablePluginName } from "../../components/ManagedSettingsSecurityDialog/utils.js";
import {
  jsxProd_default_2,
  jsxProd_default,
} from "../../../vendor/react/cjs/react-jsx-dev-runtime.react-server.production.js";
import { Text, Box } from "../../ink/components/Text.js";
import {
  runSkillDoctor,
  SkillDoctorStageError,
  formatSkillUsageTable,
  padEndToWidth,
  padStartToWidth,
} from "../skill-doctor/skillDoctor.js";
import { logError } from "../../utils/log.js";
import { errorMessage } from "../../utils/errors.js";
import { useMemoCache } from "../../../vendor/react/compiler-runtime.js";
import { isSkillDoctorScanAllowed } from "../../services/usageInsights/transcriptScan.js";
import { MEMO_CACHE_SENTINEL } from "../../../runtime/bun-runtime.js";
import { useKeybinding } from "../../keybindings/useKeybinding.js";
import { normalizeCaseForComparison_2 } from "../../utils/permissions/filesystem.js";
import { plural } from "../../utils/stringUtils.js";
import { figures_default } from "../../../vendor/@inquirer/figures/dist/esm/index.js";
import { deferInit } from "../../../runtime/deferred-init.js";

//@ chunk-wb51jffc.js:204919-205093 placement
/**
 * 插件在当前项目没有安装记录、也不在任何可编辑设置范围里时返回 [插件名]，否则返回空数组（安装表读不到也返回空）。
 */
async function listUnscopedPluginForProject(pluginName, storageV5) {
  let installedPlugins = await loadInstalledPlugins(storageV5);
  if (hasFailedInstalledPluginsRead(installedPlugins)) return [];
  let plugins = installedPlugins.plugins;
  let resolvedName = findPluginName(Object.keys(plugins), pluginName) ?? pluginName;
  let installedForProject = hasInstallationForCurrentProject(plugins[resolvedName] ?? []);
  let any = [...getPluginEditableScopes().keys()].some((key) => pluginNamesEqual(key, pluginName));
  return installedForProject || any ? [] : [pluginName];
}
//@ chunk-wb51jffc.js:205093-205555 placement
function formatCopyNotLoaded(marketplace) {
  switch (marketplace) {
    case INLINE_PLUGIN_MARKETPLACE:
      return "This --plugin-dir copy did not load (see above); nothing is running from it. Fix or drop the directory; edits take effect after /reload-plugins.";
    case SKILLS_DIR:
      return "This skills-directory copy did not load (see above) \u2014 fix, delete or rename the directory; edits take effect after /reload-plugins.";
    case SYNCED:
      return "This claude.ai copy did not load (see above) \u2014 remove or rename the plugin on claude.ai to clear it.";
  }
}
//@ chunk-wb51jffc.js:205555-205701 placement
/**
 * 插件菜单关闭时的提示文案、默认开关值，以及读取 tengu_plugin_menu_close_reload 开关的函数（关闭插件菜单时是否自动排队 /reload-plugins）。
 */
var PLUGIN_CHANGES_DEFERRED_NOTICE =
  "Plugin changes apply when the current response finishes (/reload-plugins is queued).";
var CLOSE_RELOAD_DEFAULT = true;
var isPluginMenuCloseReloadEnabled = () =>
  getFeatureValue_CACHED_MAY_BE_STALE("tengu_plugin_menu_close_reload", CLOSE_RELOAD_DEFAULT);
//@ chunk-wb51jffc.js:205701-205878 placement
/**
 * 插件状态需要刷新时决定 reload 方式：主查询运行中为 deferred、否则 queued，并打点；不需要刷新返回 none。
 */
function schedulePluginMenuReload(activePlugins, isQueryRunning = getMainQueryRunning) {
  if (!activePlugins.get().needsRefresh) return "none";
  let mode = isQueryRunning() ? "deferred" : "queued";
  logEvent("tengu_plugin_menu_auto_reload", {
    outcome: fromEnum(mode),
  });
  logFeatureOk("plugin_menu_auto_reload");
  return mode;
}
//@ chunk-wb51jffc.js:205878-205882 placement
// deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
deferInit("chunk-wb51jffc.js:205878", () => {
  init_react_production();
});
//@ chunk-wb51jffc.js:205882-205950 placement
function unusedPluginLabel(plugin) {
  return plugin.pluginKey === undefined ? plugin.source : printablePluginName(plugin.pluginKey);
}
//@ chunk-wb51jffc.js:205950-205989 placement
function wasUsed(plugin) {
  return plugin.usageCount > 0;
}
//@ chunk-wb51jffc.js:205989-206161 placement
function formatLastUsed(plugin) {
  return jsxProd_default_2(
    Text,
    {
      children: [
        "  ",
        jsxProd_default(Text, {
          color: "warning",
          children: printablePluginName(plugin.name),
        }),
        jsxProd_default(Text, {
          dimColor: true,
          children: `  last used ${plugin.daysSinceLastUse} days ago`,
        }),
      ],
    },
    plugin.pluginId,
  );
}
//@ chunk-wb51jffc.js:206161-206535 placement
function logSkillDoctor(options) {
  return runSkillDoctor(options).then(
    (item) => {
      if (item.rows.length === 0) logFeatureSad("cli_skill_doctor", "no_user_skills");
      else if (item.weekTokensNote !== null) logFeatureSad("cli_skill_doctor", "scan_policy_denied");
      else logFeatureOk("cli_skill_doctor");
      return {
        ok: true,
        report: item,
      };
    },
    (error) => {
      let cause = error instanceof SkillDoctorStageError ? error.cause : error;
      logError(cause);
      logFeatureBad(
        "cli_skill_doctor",
        error instanceof SkillDoctorStageError ? error.featureErrorCode : "render_failed",
      );
      return {
        ok: false,
        message: errorMessage(cause),
      };
    },
  );
}
//@ chunk-wb51jffc.js:206535-207238 placement
function SkillDoctorConfirm(props) {
  let $ = useMemoCache(11);
  let { getReport, onExit } = props;
  let readReport;
  if ($[0] !== getReport) {
    readReport = () => getReport();
    $[0] = getReport;
    $[1] = readReport;
  } else readReport = $[1];
  let [report] = useState(readReport);
  let [scanAllowed] = useState(isSkillDoctorScanAllowed);
  let confirmKeybinds;
  if ($[2] === MEMO_CACHE_SENTINEL) {
    confirmKeybinds = {
      context: "Confirmation",
    };
    $[2] = confirmKeybinds;
  } else confirmKeybinds = $[2];
  useKeybinding("confirm:no", onExit, confirmKeybinds);
  let content;
  if ($[3] === MEMO_CACHE_SENTINEL) {
    content = jsxProd_default(Text, {
      bold: true,
      children: "Skills loaded this session",
    });
    $[3] = content;
  } else content = $[3];
  const children = scanAllowed.allowed ? "Scanning local sessions\u2026" : "Computing skill usage\u2026";
  let statusLine;
  if ($[4] !== children) {
    statusLine = jsxProd_default_2(Box, {
      flexDirection: "column",
      children: [
        content,
        jsxProd_default(Box, {
          marginTop: 1,
          children: jsxProd_default(Text, {
            dimColor: true,
            children,
          }),
        }),
      ],
    });
    $[4] = children;
    $[5] = statusLine;
  } else statusLine = $[5];
  let fallback = statusLine;
  let children_2;
  if ($[6] !== report) {
    children_2 = jsxProd_default(SkillUsageView, {
      reportPromise: report,
    });
    $[6] = report;
    $[7] = children_2;
  } else children_2 = $[7];
  let footer;
  if ($[8] !== fallback || $[9] !== children_2) {
    footer = jsxProd_default(suspenseTypeExport, {
      fallback,
      children: children_2,
    });
    $[8] = fallback;
    $[9] = children_2;
    $[10] = footer;
  } else footer = $[10];
  return footer;
}
//@ chunk-wb51jffc.js:207238-208959 placement
/**
 * 计算并展示技能用量（扫描本地会话），失败时提示 --debug。
 */
function SkillUsageView(props) {
  let $ = useMemoCache(22);
  let { reportPromise } = props;
  let settled = use(reportPromise);
  if (!settled.ok) {
    let errorText;
    if ($[0] !== settled.message) {
      errorText = jsxProd_default_2(Text, {
        dimColor: true,
        wrap: "wrap",
        children: ["Couldn't compute skill usage. Run with --debug for details. (", settled.message, ")"],
      });
      $[0] = settled.message;
      $[1] = errorText;
    } else errorText = $[1];
    return errorText;
  }
  let {
    rows,
    unusedOwned,
    unusedFromPlugins,
    unusedFromMcp,
    unusedSynced,
    unusedMcpServers,
    disusedPlugins,
    weekTokensNote,
  } = settled.report;
  let reportContent;
  if ($[2] === MEMO_CACHE_SENTINEL) {
    reportContent = jsxProd_default(Text, {
      bold: true,
      children: "Skills loaded this session",
    });
    $[2] = reportContent;
  } else reportContent = $[2];
  let statusLine;
  if ($[3] !== rows) {
    statusLine = jsxProd_default(Box, {
      flexDirection: "column",
      marginTop: 1,
      children: jsxProd_default(renderLoadedSkills, {
        rows,
      }),
    });
    $[3] = rows;
    $[4] = statusLine;
  } else statusLine = $[4];
  let footer;
  if ($[5] !== rows.length || $[6] !== weekTokensNote) {
    footer =
      rows.length > 0 &&
      jsxProd_default_2(Box, {
        flexDirection: "column",
        marginTop: 1,
        children: [
          jsxProd_default_2(Text, {
            dimColor: true,
            wrap: "wrap",
            children: [
              "  ",
              "context = this skill's one-line listing in the system prompt, included every turn",
            ],
          }),
          jsxProd_default_2(Text, {
            dimColor: true,
            wrap: "wrap",
            children: [
              "  ",
              "(dash = not in the current listing, costs nothing; full SKILL.md loads only when it runs)",
            ],
          }),
          weekTokensNote === null
            ? jsxProd_default_2(Text, {
                dimColor: true,
                wrap: "wrap",
                children: [
                  "  ",
                  "7d tokens = tokens attributed to the skill over the last 7 days of sessions on this machine",
                ],
              })
            : jsxProd_default_2(Text, {
                dimColor: true,
                wrap: "wrap",
                children: ["  ", "7d tokens: ", weekTokensNote],
              }),
        ],
      });
    $[5] = rows.length;
    $[6] = weekTokensNote;
    $[7] = footer;
  } else footer = $[7];
  let content;
  if (
    $[8] !== rows ||
    $[9] !== unusedFromMcp ||
    $[10] !== unusedFromPlugins ||
    $[11] !== unusedMcpServers ||
    $[12] !== unusedOwned ||
    $[13] !== unusedSynced
  ) {
    content = jsxProd_default(renderSkillRows, {
      rows,
      unusedOwned,
      unusedSynced,
      unusedFromPlugins,
      unusedFromMcp,
      unusedMcpServers,
    });
    $[8] = rows;
    $[9] = unusedFromMcp;
    $[10] = unusedFromPlugins;
    $[11] = unusedMcpServers;
    $[12] = unusedOwned;
    $[13] = unusedSynced;
    $[14] = content;
  } else content = $[14];
  let bodyBox;
  if ($[15] !== disusedPlugins) {
    bodyBox = jsxProd_default(renderUnusedPlugins, {
      disusedPlugins,
    });
    $[15] = disusedPlugins;
    $[16] = bodyBox;
  } else bodyBox = $[16];
  let footerBox;
  if ($[17] !== statusLine || $[18] !== footer || $[19] !== content || $[20] !== bodyBox) {
    footerBox = jsxProd_default_2(Box, {
      flexDirection: "column",
      children: [reportContent, statusLine, footer, content, bodyBox],
    });
    $[17] = statusLine;
    $[18] = footer;
    $[19] = content;
    $[20] = bodyBox;
    $[21] = footerBox;
  } else footerBox = $[21];
  return footerBox;
}
//@ chunk-wb51jffc.js:208959-209869 placement
function renderLoadedSkills(props) {
  let $ = useMemoCache(7);
  let { rows } = props;
  if (rows.length === 0) {
    let content;
    if ($[0] === MEMO_CACHE_SENTINEL) {
      content = jsxProd_default(Text, {
        dimColor: true,
        children: "  (no skills loaded)",
      });
      $[0] = content;
    } else content = $[0];
    return content;
  }
  let footer;
  if ($[1] !== rows) {
    let { cells, widths } = formatSkillUsageTable(rows);
    const skillHeader = padEndToWidth("skill", widths.name);
    const sourceHeader = padEndToWidth("source", widths.source);
    const contextHeader = padStartToWidth("context", widths.context);
    const tokensHeader = padStartToWidth("7d tokens", widths.week);
    const usesColumn = widths.uses + 1;
    let headerRow;
    if ($[3] !== usesColumn) {
      headerRow = padStartToWidth("uses", usesColumn);
      $[3] = usesColumn;
      $[4] = headerRow;
    } else headerRow = $[4];
    const children = `  ${skillHeader}  ${sourceHeader}  ${contextHeader}  ${tokensHeader}  ${headerRow}  last used`;
    let bodyRows;
    if ($[5] !== children) {
      bodyRows = jsxProd_default(Text, {
        dimColor: true,
        children,
      });
      $[5] = children;
      $[6] = bodyRows;
    } else bodyRows = $[6];
    footer = jsxProd_default_2(Box, {
      flexDirection: "column",
      children: [
        bodyRows,
        rows.map((row, index) => {
          let rowCells = cells[index];
          return jsxProd_default_2(
            Text,
            {
              color: row.usageCount === 0 ? "warning" : undefined,
              children: [
                `  ${padEndToWidth(row.name, widths.name)}  `,
                jsxProd_default(Text, {
                  dimColor: true,
                  children: padEndToWidth(row.source, widths.source),
                }),
                `  ${padStartToWidth(rowCells.context, widths.context)}  ${padStartToWidth(rowCells.week, widths.week)}  ${padStartToWidth(String(row.usageCount), widths.uses)}\xD7  ${rowCells.lastUsed}`,
              ],
            },
            `${index}:${row.name}`,
          );
        }),
      ],
    });
    $[1] = rows;
    $[2] = footer;
  } else footer = $[2];
  return footer;
}
//@ chunk-wb51jffc.js:209869-212236 placement
/**
 * 渲染技能用量表（来源、调用次数、最近使用、警告）。
 */
function renderSkillRows(props) {
  let $ = useMemoCache(33);
  let { rows, unusedOwned, unusedFromPlugins, unusedFromMcp, unusedSynced, unusedMcpServers } = props;
  if (rows.length === 0) {
    return null;
  }
  let setup;
  let conflicts;
  let unused;
  let flexDirection;
  let marginTop;
  let warnings;
  let summary;
  let footer;
  if (
    $[0] !== unusedFromPlugins ||
    $[1] !== unusedMcpServers ||
    $[2] !== unusedOwned.length ||
    $[3] !== unusedSynced.length
  ) {
    let unusedLabels = normalizeCaseForComparison_2(unusedFromPlugins.map(unusedPluginLabel));
    let content;
    if ($[12] !== unusedMcpServers) {
      content = unusedMcpServers.length > 0 ? `, from ${unusedMcpServers.join(", ")}` : "";
      $[12] = unusedMcpServers;
      $[13] = content;
    } else content = $[13];
    conflicts = content;
    unused = unusedMcpServers.length <= 1;
    setup = Box;
    flexDirection = "column";
    marginTop = 1;
    if ($[14] !== unusedOwned.length) {
      warnings =
        unusedOwned.length > 0 &&
        jsxProd_default(Text, {
          color: "warning",
          wrap: "wrap",
          children: `${unusedOwned.length} ${plural(unusedOwned.length, "skill")} loaded but never invoked. Each one adds to the system prompt every turn. Disable in /skills, or remove from .claude/skills.`,
        });
      $[14] = unusedOwned.length;
      $[15] = warnings;
    } else warnings = $[15];
    if ($[16] !== unusedSynced.length) {
      summary =
        unusedSynced.length > 0 &&
        jsxProd_default(Text, {
          color: "warning",
          wrap: "wrap",
          children: `${unusedSynced.length} ${plural(unusedSynced.length, "skill")} synced from claude.ai loaded but never invoked. Each one adds to the system prompt every turn. Disable in /skills, or turn ${unusedSynced.length === 1 ? "it" : "them"} off on claude.ai \u2014 a deleted synced copy is re-downloaded on the next sync.`,
        });
      $[16] = unusedSynced.length;
      $[17] = summary;
    } else summary = $[17];
    footer =
      unusedFromPlugins.length > 0 &&
      jsxProd_default(Text, {
        color: "warning",
        wrap: "wrap",
        children: `${unusedFromPlugins.length} plugin ${plural(unusedFromPlugins.length, "skill")} loaded but never invoked, from ${unusedLabels.join(", ")}. Each one adds to the system prompt every turn. Plugin skills can't be turned off individually \u2014 disable ${unusedLabels.length === 1 ? "the plugin" : "those plugins"} in the Installed tab.`,
      });
    $[0] = unusedFromPlugins;
    $[1] = unusedMcpServers;
    $[2] = unusedOwned.length;
    $[3] = unusedSynced.length;
    $[4] = setup;
    $[5] = conflicts;
    $[6] = unused;
    $[7] = flexDirection;
    $[8] = marginTop;
    $[9] = warnings;
    $[10] = summary;
    $[11] = footer;
  } else {
    setup = $[4];
    conflicts = $[5];
    unused = $[6];
    flexDirection = $[7];
    marginTop = $[8];
    warnings = $[9];
    summary = $[10];
    footer = $[11];
  }
  let statusLine;
  if ($[18] !== conflicts || $[19] !== unused || $[20] !== unusedFromMcp.length) {
    statusLine =
      unusedFromMcp.length > 0 &&
      jsxProd_default(Text, {
        color: "warning",
        wrap: "wrap",
        children: `${unusedFromMcp.length} MCP ${plural(unusedFromMcp.length, "skill")} loaded but never invoked${conflicts}. Each one adds to the system prompt every turn. MCP skills live on the server, not on disk \u2014 turning ${unused ? "that server" : "those servers"} off in /mcp also removes ${unused ? "its" : "their"} tools.`,
      });
    $[18] = conflicts;
    $[19] = unused;
    $[20] = unusedFromMcp.length;
    $[21] = statusLine;
  } else statusLine = $[21];
  let hintLine;
  if ($[22] !== rows) {
    hintLine =
      rows.every(wasUsed) &&
      jsxProd_default(Text, {
        color: "success",
        children: "All loaded skills have been used at least once.",
      });
    $[22] = rows;
    $[23] = hintLine;
  } else hintLine = $[23];
  let footerBox;
  if (
    $[24] !== setup ||
    $[25] !== flexDirection ||
    $[26] !== marginTop ||
    $[27] !== warnings ||
    $[28] !== summary ||
    $[29] !== footer ||
    $[30] !== statusLine ||
    $[31] !== hintLine
  ) {
    footerBox = jsxProd_default_2(setup, {
      flexDirection,
      marginTop,
      children: [warnings, summary, footer, statusLine, hintLine],
    });
    $[24] = setup;
    $[25] = flexDirection;
    $[26] = marginTop;
    $[27] = warnings;
    $[28] = summary;
    $[29] = footer;
    $[30] = statusLine;
    $[31] = hintLine;
    $[32] = footerBox;
  } else footerBox = $[32];
  return footerBox;
}
//@ chunk-wb51jffc.js:212236-212810 placement
function renderUnusedPlugins(props) {
  let $ = useMemoCache(8);
  let { disusedPlugins } = props;
  if (disusedPlugins.length === 0) {
    return null;
  }
  let content;
  if ($[0] === MEMO_CACHE_SENTINEL) {
    content = jsxProd_default(Text, {
      bold: true,
      children: "Plugins not used recently",
    });
    $[0] = content;
  } else content = $[0];
  let children;
  if ($[1] !== disusedPlugins) {
    children = disusedPlugins.map(formatLastUsed);
    $[1] = disusedPlugins;
    $[2] = children;
  } else children = $[2];
  let status;
  if ($[3] !== children) {
    status = jsxProd_default(Box, {
      flexDirection: "column",
      marginTop: 1,
      children,
    });
    $[3] = children;
    $[4] = status;
  } else status = $[4];
  let manageBox;
  if ($[5] === MEMO_CACHE_SENTINEL) {
    manageBox = jsxProd_default(Box, {
      marginTop: 1,
      children: jsxProd_default_2(Text, {
        dimColor: true,
        children: ["  ", "Manage these in the Installed tab"],
      }),
    });
    $[5] = manageBox;
  } else manageBox = $[5];
  let footer;
  if ($[6] !== status) {
    footer = jsxProd_default_2(Box, {
      flexDirection: "column",
      marginTop: 1,
      children: [content, status, manageBox],
    });
    $[6] = status;
    $[7] = footer;
  } else footer = $[7];
  return footer;
}
//@ chunk-wb51jffc.js:212810-212814 placement
// deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
deferInit("chunk-wb51jffc.js:212810", () => {
  init_react_production();
});
//@ chunk-wb51jffc.js:212814-212858 placement
function warningLine(warning) {
  return `${figures_default.warning} ${warning}`;
}
export {
  logSkillDoctor,
  isPluginMenuCloseReloadEnabled,
  schedulePluginMenuReload,
  PLUGIN_CHANGES_DEFERRED_NOTICE,
  SkillDoctorConfirm,
  listUnscopedPluginForProject,
  formatCopyNotLoaded,
  warningLine,
};
