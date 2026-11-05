/**
 * commands/plugin/PluginSettings.tsx
 *
 * /plugin 主界面：发现、已安装、市场、错误等标签页的容器与导航
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/commands/plugin/PluginSettings.tsx
 * pieces: chunk-0yw3taqg.js (1), chunk-5s0qaz1x.js (2), chunk-j6tt9nsa.js (3), chunk-wb51jffc.js (53)
 * attribution: fingerprint 16, affinity 4, placement 4, sole-consumer 14, file-local 3, layout 17, callgraph-fingerprint 1
 * (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.
 */
import { logError } from "../../utils/log.js";
import {
  init_react_production,
  useRef,
  useEffect,
  useState,
} from "../../../vendor/react/cjs/react.production.js";
import { useMemoCache } from "../../../vendor/react/compiler-runtime.js";
import { stripInvisibleChars } from "../../utils/sanitization.js";
import { MEMO_CACHE_SENTINEL } from "../../../runtime/bun-runtime.js";
import {
  jsxProd_default,
  jsxProd_default_2,
  Fragment,
} from "../../../vendor/react/cjs/react-jsx-dev-runtime.react-server.production.js";
import { Text, Box } from "../../ink/components/Text.js";
import { FocusColumn } from "../../components/design-system/FocusColumn.js";
import { Dialog } from "../../components/design-system/Dialog.js";
import { NEEDS_CONFIG_NOTE, activatePluginsAfterInstall } from "./activatePluginsAfterInstall.js";
import { useTheme_2 } from "../../components/design-system/ThemeProvider.js";
import {
  stripInvisibleKeepEmoji,
  stripInvisibleKeepNewlines,
} from "../../utils/settings/marketplaceSettingsAliases.js";
import { WorkerBadge } from "../../components/permissions/WorkerBadge.js";
import { installPluginOp } from "../../services/plugins/pluginOperations.js";
import { figures_default } from "../../../vendor/@inquirer/figures/dist/esm/index.js";
import { errorMessage } from "../../utils/errors.js";
import { escapedDisplayText, displayMarketplaceName } from "../../utils/plugins/pluginDisplayMetadata.js";
import { stripInvisibleChars as stripInvisibleChars_2 } from "../../utils/invisibleChars.js";
import {
  isPluginDirectoryUnavailableFailure,
  loadMarketplacesWithErrors,
} from "../../utils/plugins/marketplaceHelpers.js";
import {
  isOfficialMarketplaceName_2,
  OFFICIAL_MARKETPLACE_NAME,
  OFFICIAL_MARKETPLACE_DISPLAY,
  isOfficialMarketplaceSpelling,
  marketplaceDisplayName,
  removedMarketplaceMessage,
  blockedPluginsNotice,
  marketplaceEntryGoneText,
} from "../../utils/plugins/officialMarketplaceNames.js";
import { countWhere } from "../../utils/collections.js";
import {
  loadKnownMarketplacesWithDeclared,
  getMarketplaceDeclaringSource,
  removeMarketplaceWithReservedSiblings,
} from "../../utils/plugins/marketplaceManager.js";
import {
  listClaudeAiMarketplaces,
  filterUnaddedClaudeAiMarketplaces,
  formatGitSourceSpec,
  accountMarketplaceLabel,
  formatMarketplaceScopeLabel,
  noCliNameLabel,
} from "../../utils/plugins/claudeAiMarketplaces.js";
import { useAppState, useSetAppState, useActivePlugins, useMcpConnections } from "../../state/AppState.js";
import { getInstalledPlugins, formatFirstKnownVersion } from "../../utils/plugins/installedPluginsManager.js";
import { getPluginEditableScopes, editableScopeOf } from "../../utils/plugins/pluginStartupCheck.js";
import { firstLineOf, nfcLower } from "../../utils/stringUtils.js";
import { escapeXml_2 as escapeXml } from "../../utils/confusables.js";
import { printableName, quotedPrintable, printableMessage } from "../../utils/printableName.js";
import { StatusRow } from "../../components/Settings/Status.js";
import {
  getSettingsForSourceForUpkeep,
  getSettingsForSource,
  updateSettingsForSourceWithTransform,
} from "../../utils/settings/settings.js";
import { pluginDirectoryPolicyBlock } from "../../utils/plugins/marketplacePolicy.js";
import { isReservedMarketplaceName, pluginManifestPathSchemas } from "../../utils/plugins/schemas.js";
import {
  marketplaceOf,
  marketplaceSuffix,
  splitPluginId,
  isOfficialMarketplaceName_3,
  parseNpmPluginId,
} from "../../utils/plugins/pluginIdentifier.js";
import { formatSkillErrorMessage } from "./skillHealth.js";
import { getErrorGuidanceText } from "./PluginErrors.js";
import { findInstalledEntry } from "../../services/plugins/pluginTag.js";
import { pluginWarningText, pluginWarningFixText } from "../../utils/plugins/pluginComponentConflicts.js";
import { usePluginWarnings, activeModNames, loadedModsSnapshot, ManagePlugins } from "./ManagePlugins.js";
import { useKeybinding, useGlobalExitKeybindings } from "../../keybindings/useKeybinding.js";
import { refreshPluginCaches } from "../../utils/plugins/cacheUtils.js";
import { isPluginDirectoryModeOn, lanternPrismEnabled } from "../../utils/plugins/pluginGates.js";
import { logEvent } from "../../services/analytics/index.js";
import { marketplaceForTelemetry } from "../../utils/telemetry/pluginTelemetry.js";
import { MessageActionsKeybindings } from "../../components/messageActions.js";
import { normalizeCaseForComparison_2 } from "../../utils/permissions/filesystem.js";
import { HintText } from "../../components/design-system/HintText.js";
import { ConfigurableShortcutHint } from "../../components/ConfigurableShortcutHint.js";
import { TwoColumnRow } from "../../components/CustomSelect/select.js";
import { Byline } from "../../components/design-system/Byline.js";
import { neutralizeInboundTags } from "../../utils/sessionPeers.js";
import { useSessionOrUndefined } from "../../context/session.js";
import { setPromptValueFor } from "../../state/promptInputStore.js";
import { parseSlashCommand } from "../../utils/slashCommandParsing.js";
import { parsePluginArgs } from "./parseArgs.js";
import { import_sortedIndex_2 } from "../../../vendor/lodash-es/_inlinedHelpers.js";
import { getFeatureValue_CACHED_MAY_BE_STALE } from "../../services/analytics/growthbook.js";
import { PluginDetailsStore } from "./PluginDetails.js";
import { useStoreSelector } from "../../hooks/useStoreSelector.js";
import {
  logSkillDoctor,
  isPluginMenuCloseReloadEnabled,
  schedulePluginMenuReload,
  PLUGIN_CHANGES_DEFERRED_NOTICE,
  SkillDoctorConfirm,
} from "./SkillDoctor.js";
import { ValidatePlugin } from "./ValidatePlugin.js";
import { PluginEvalRunner } from "./PluginEval.js";
import { PluginTagFlow } from "./PluginTag.js";
import { AddMarketplace } from "./AddMarketplace.js";
import { Tab, Tabs } from "../../components/design-system/Tabs.js";
import { BrowseMarketplace } from "./BrowseMarketplace.js";
import { DiscoverPluginsScreen } from "./DiscoverPluginsScreen.js";
import { ManageMarketplaces } from "./ManageMarketplaces.js";
import { Pane } from "../../components/design-system/Pane.js";
import { deferInit } from "../../../runtime/deferred-init.js";

//@ chunk-5s0qaz1x.js:14063-14242 fingerprint (2.1.88 match: getPluginNameFromError, 0.923)
function getPluginNameFromError(error) {
  if ("pluginId" in error && error.pluginId) return error.pluginId;
  if ("plugin" in error && error.plugin) return error.plugin;
  let index = error.source.lastIndexOf("@");
  if (index > 0) return error.source.slice(0, index);
  return;
}
//@ chunk-5s0qaz1x.js:14242-14351 affinity
/**
 * 判断插件错误是否只是自动更新的提示类（延后条目辅助或被策略关闭），不算真正的加载失败。
 */
function isAutoupdateInfoError(info) {
  return info.type === "autoupdate-deferred-entry-helper" || info.type === "autoupdate-disabled-by-policy";
}
//@ chunk-0yw3taqg.js:666371-666462 fingerprint (2.1.88 match: _temp1, 0.765)
function initialPluginRefreshState(prev) {
  let snapshot = {
    needsRefresh: false,
  };
  prev()
    .then((needsRefresh) => {
      snapshot.needsRefresh = needsRefresh;
    })
    .catch(logError);
  return snapshot;
}
//@ chunk-j6tt9nsa.js:42533-42537 placement
// deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
deferInit("chunk-j6tt9nsa.js:42533", () => {
  init_react_production();
});
//@ chunk-j6tt9nsa.js:42537-42541 placement
// deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
deferInit("chunk-j6tt9nsa.js:42537", () => {
  init_react_production();
});
//@ chunk-j6tt9nsa.js:42541-42582 fingerprint (2.1.88 match: _temp2, 0.665)
function selectPluginCommands(s) {
  return s.plugins.commands;
}
//@ chunk-wb51jffc.js:101745-103104 placement
/**
 * y/n 确认运行命令的对话框
 */
function ConfirmCommandDialog(props) {
  let $ = useMemoCache(19);
  let { command, onConfirm, onCancel } = props;
  let runningRef = useRef(false);
  let onConfirmOnce;
  if ($[0] !== onCancel) {
    onConfirmOnce = function onConfirmOnce() {
      if (runningRef.current) {
        return;
      }
      runningRef.current = true;
      onCancel();
    };
    $[0] = onCancel;
    $[1] = onConfirmOnce;
  } else onConfirmOnce = $[1];
  let confirm = onConfirmOnce;
  let handleKeyDown;
  if ($[2] !== confirm || $[3] !== onConfirm) {
    handleKeyDown = function handleKeyDown(event) {
      if (event.ctrl || event.meta) {
        return;
      }
      if (event.key === "y" || event.key === "Y") {
        event.preventDefault();
        if (runningRef.current) {
          return;
        }
        runningRef.current = true;
        onConfirm();
      } else if (event.key === "n" || event.key === "N") {
        event.preventDefault();
        confirm();
      }
    };
    $[2] = confirm;
    $[3] = onConfirm;
    $[4] = handleKeyDown;
  } else handleKeyDown = $[4];
  let onKeyDown = handleKeyDown;
  let content;
  if ($[5] !== command) {
    content = stripInvisibleChars(command, " ").trim().split(/\s+/).join(" ");
    $[5] = command;
    $[6] = content;
  } else content = $[6];
  let children = content;
  let statusLine;
  if ($[7] === MEMO_CACHE_SENTINEL) {
    statusLine = jsxProd_default(Text, {
      bold: true,
      children: "y",
    });
    $[7] = statusLine;
  } else statusLine = $[7];
  let inputGuide;
  if ($[8] === MEMO_CACHE_SENTINEL) {
    inputGuide = jsxProd_default_2(Text, {
      children: [
        "Press ",
        statusLine,
        " to run or ",
        jsxProd_default(Text, {
          bold: true,
          children: "n",
        }),
        " to cancel",
      ],
    });
    $[8] = inputGuide;
  } else inputGuide = $[8];
  let hint;
  if ($[9] === MEMO_CACHE_SENTINEL) {
    hint = jsxProd_default(Text, {
      children: "This command came from a link:",
    });
    $[9] = hint;
  } else hint = $[9];
  let footer;
  if ($[10] !== children) {
    footer = jsxProd_default_2(Text, {
      children: [
        "  ",
        jsxProd_default(Text, {
          bold: true,
          children,
        }),
      ],
    });
    $[10] = children;
    $[11] = footer;
  } else footer = $[11];
  let body;
  if ($[12] === MEMO_CACHE_SENTINEL) {
    body = jsxProd_default(Box, {
      marginTop: 1,
      children: jsxProd_default(Text, {
        dimColor: true,
        children: "Nothing runs until you answer. Only run commands from links you trust.",
      }),
    });
    $[12] = body;
  } else body = $[12];
  let children_2;
  if ($[13] !== onKeyDown || $[14] !== footer) {
    children_2 = jsxProd_default_2(FocusColumn, {
      onKeyDown,
      children: [hint, footer, body],
    });
    $[13] = onKeyDown;
    $[14] = footer;
    $[15] = children_2;
  } else children_2 = $[15];
  let detailRows;
  if ($[16] !== confirm || $[17] !== children_2) {
    detailRows = jsxProd_default(Dialog, {
      title: "Run this command?",
      color: "suggestion",
      onCancel: confirm,
      inputGuide,
      children: children_2,
    });
    $[16] = confirm;
    $[17] = children_2;
    $[18] = detailRows;
  } else detailRows = $[18];
  return detailRows;
}
//@ chunk-wb51jffc.js:103104-103108 placement
// deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
deferInit("chunk-wb51jffc.js:103104", () => {
  init_react_production();
});
//@ chunk-wb51jffc.js:217549-217553 sole-consumer
// deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
deferInit("chunk-wb51jffc.js:217549", () => {
  init_react_production();
});
//@ chunk-wb51jffc.js:217553-217782 sole-consumer
var USER = "user";
var PLUGIN_SETTINGS_ACTION_TEXTS = {
  activated: " Plugin is now active.",
  "needs-config": ` Plugin is now active.${NEEDS_CONFIG_NOTE}`,
  "load-failed": " The plugin couldn't be loaded \u2014 see /plugin for details.",
  "reload-required": " Run /reload-plugins to apply.",
};
//@ chunk-wb51jffc.js:217782-218108 sole-consumer
/**
 * 挂载时执行一次插件安装（installAndReport），显示"Installing …"进度，完成后把结果文字交给 onComplete。
 */
function PluginInstallRunner({ spec, onComplete, onInstallComplete }) {
  let { storageV5 } = useTheme_2();
  let callbacks = useRef({
    onComplete,
    onInstallComplete,
  });
  let busy = useRef(false);
  callbacks.current = {
    onComplete,
    onInstallComplete,
  };
  useEffect(() => {
    if (busy.current) return;
    busy.current = true;
    installPluginAndReport(spec, storageV5, callbacks.current).then((result) =>
      callbacks.current.onComplete(stripInvisibleKeepEmoji(result)),
    );
  }, [spec, storageV5]);
  return jsxProd_default(WorkerBadge, {
    message: stripInvisibleKeepEmoji(`Installing ${spec}\u2026`),
  });
}
//@ chunk-wb51jffc.js:218108-218384 sole-consumer
async function installPluginAndReport(spec, storageV5, { onInstallComplete }) {
  try {
    let installed = await installPluginOp(spec, USER, {}, storageV5);
    if (!installed.success) return `${figures_default.cross} ${installed.message}`;
    let { pluginId } = installed;
    let actionText =
      PLUGIN_SETTINGS_ACTION_TEXTS[
        onInstallComplete !== undefined && pluginId !== undefined
          ? await onInstallComplete([pluginId])
          : "reload-required"
      ];
    return `${figures_default.tick} ${installed.message}.${actionText}`;
  } catch (error) {
    return `${figures_default.cross} ${errorMessage(error)}`;
  }
}
//@ chunk-wb51jffc.js:218384-218410 sole-consumer
function nullOnError() {
  return null;
}
//@ chunk-wb51jffc.js:218410-218454 sole-consumer
function bulletLine(line) {
  return `  \u2022 ${escapedDisplayText(line)}`;
}
//@ chunk-wb51jffc.js:218454-218495 sole-consumer
function selectPluginErrors(state) {
  return state.plugins.errors;
}
//@ chunk-wb51jffc.js:218495-218537 sole-consumer
function selectEnabledPlugins(state) {
  return state.plugins.enabled;
}
//@ chunk-wb51jffc.js:218537-218580 sole-consumer
function selectDisabledPlugins(state) {
  return state.plugins.disabled;
}
//@ chunk-wb51jffc.js:218580-218613 sole-consumer
function pluginSource(plugin) {
  return plugin.source;
}
//@ chunk-wb51jffc.js:218613-218668 sole-consumer
function selectWorkerPluginInventory(state) {
  return state.workerInventory?.plugins ?? null;
}
//@ chunk-wb51jffc.js:218668-218696 sole-consumer
function escapeDisplayName(name) {
  return stripInvisibleChars_2(name);
}
//@ chunk-wb51jffc.js:218696-218737 sole-consumer
function selectPluginErrors_2(state) {
  return state.plugins.errors;
}
//@ chunk-wb51jffc.js:218737-218779 sole-consumer
function selectEnabledPlugins_2(state) {
  return state.plugins.enabled;
}
//@ chunk-wb51jffc.js:218779-218822 affinity
function selectDisabledPlugins_2(state) {
  return state.plugins.disabled;
}
//@ chunk-wb51jffc.js:218822-218875 fingerprint (2.1.88 match: _temp3, 1)
function selectInstallationStatus(s_0) {
  return s_0.plugins.installationStatus;
}
//@ chunk-wb51jffc.js:218875-218919 file-local
function isFailedMarketplace(m) {
  return m.status === "failed";
}
//@ chunk-wb51jffc.js:218919-218950 file-local
function marketplaceName(m_0) {
  return m_0.name;
}
//@ chunk-wb51jffc.js:218950-218990 file-local
function decrementNonNegative(prev) {
  return Math.max(0, prev - 1);
}
//@ chunk-wb51jffc.js:218990-219034 layout
function isOfficialDirUnavailableFailure(m_0) {
  return isPluginDirectoryUnavailableFailure(m_0) && isOfficialMarketplaceName_2(m_0.name);
}
//@ chunk-wb51jffc.js:219034-219065 layout
function failureName(m_0) {
  return m_0.name;
}
//@ chunk-wb51jffc.js:219065-219094 layout
function emptySet() {
  return new Set();
}
//@ chunk-wb51jffc.js:219094-219125 layout
function isRealPluginError(error) {
  return !isAutoupdateInfoError(error);
}
//@ chunk-wb51jffc.js:219125-219271 fingerprint (2.1.88 match: _temp0, 1)
function countPluginErrors(s) {
  let count = countWhere(s.plugins.errors, isRealPluginError);
  for (const m of s.plugins.installationStatus.marketplaces) {
    if (m.status === "failed") count++;
  }
  return count;
}
//@ chunk-wb51jffc.js:219271-220339 fingerprint (2.1.88 match: MarketplaceList, 0.411)
function MarketplaceList(props) {
  let $ = useMemoCache(5);
  let { onComplete } = props;
  let { storageV5 } = useTheme_2();
  let printList;
  let printDeps;
  if ($[0] !== onComplete || $[1] !== storageV5) {
    printList = () => {
      let loadList = async function loadList() {
        let knownMarketplacesWithDeclared = await loadKnownMarketplacesWithDeclared(storageV5);
        let names = Object.keys(knownMarketplacesWithDeclared);
        let claudeAiList = await listClaudeAiMarketplaces().catch(nullOnError);
        let { available, hosted } = filterUnaddedClaudeAiMarketplaces(
          claudeAiList,
          knownMarketplacesWithDeclared,
        );
        let browseOnly = claudeAiList?.browseOnly ?? [];
        if (names.length === 0 && available.length === 0 && hosted.length === 0 && browseOnly.length === 0)
          onComplete("No marketplaces configured");
        else {
          let lines =
            names.length > 0
              ? ["Configured marketplaces:", ...names.map(bulletLine)]
              : ["No marketplaces configured"];
          if (available.length > 0 || hosted.length > 0 || browseOnly.length > 0)
            lines.push("From claude.ai:");
          for (const marketplace of available)
            lines.push(
              `  \u2022 ${stripInvisibleKeepEmoji(escapedDisplayText(marketplace.name))} (available from claude.ai${marketplace.scope ? `, ${marketplace.scope}` : ""} \u2014 not added) \xB7 ${stripInvisibleKeepEmoji(formatGitSourceSpec(marketplace.source))}`,
            );
          for (const marketplace of hosted)
            lines.push(
              `  \u2022 ${stripInvisibleKeepEmoji(accountMarketplaceLabel(marketplace))} \u2014 hosted on claude.ai, ${formatMarketplaceScopeLabel(marketplace.scope)} \xB7 not added`,
            );
          for (const marketplace of browseOnly)
            lines.push(
              `  \u2022 ${stripInvisibleKeepEmoji(noCliNameLabel(marketplace))} (browse on claude.ai)`,
            );
          onComplete(
            lines.join(`
`),
          );
        }
      };
      loadList().catch((err) => onComplete(`Error loading marketplaces: ${errorMessage(err)}`));
    };
    printDeps = [onComplete, storageV5];
    $[0] = onComplete;
    $[1] = storageV5;
    $[2] = printList;
    $[3] = printDeps;
  } else {
    printList = $[2];
    printDeps = $[3];
  }
  useEffect(printList, printDeps);
  let footer;
  if ($[4] === MEMO_CACHE_SENTINEL) {
    footer = jsxProd_default(Text, {
      children: "Loading marketplaces...",
    });
    $[4] = footer;
  } else footer = $[4];
  return footer;
}
//@ chunk-wb51jffc.js:220339-221506 layout
/**
 * 文本模式列出已安装插件（/plugin list）：每个安装范围一行，标记 enabled/disabled/failed to load，需要 /reload-plugins 时附提示；可按 enabled/disabled 过滤。
 */
function PluginListPrinter(props) {
  let $ = useMemoCache(8);
  let { onComplete, filter } = props;
  let appState = useAppState(selectPluginErrors);
  let appState_2 = useAppState(selectEnabledPlugins);
  let appState_3 = useAppState(selectDisabledPlugins);
  let printList;
  let printDeps;
  if (
    $[0] !== appState_2 ||
    $[1] !== filter ||
    $[2] !== appState_3 ||
    $[3] !== appState ||
    $[4] !== onComplete
  ) {
    printList = () => {
      let installedPlugins = getInstalledPlugins();
      let sorted = Object.keys(installedPlugins.plugins).sort();
      if (sorted.length === 0) {
        onComplete("No plugins installed. Use `/plugin install` to install a plugin.");
        return;
      }
      let pluginEditableScopes = getPluginEditableScopes();
      let enabledSources = new Set(appState_2.map(pluginSource));
      let lines = ["Installed plugins:"];
      let shownCount = 0;
      for (const pluginName of sorted) {
        let bareName = firstLineOf(pluginName, "@");
        let isEnabled = pluginEditableScopes.has(pluginName);
        if (filter !== undefined && (filter === "enabled") !== isEnabled) {
          continue;
        }
        let any = appState.some(
          (error) =>
            !isAutoupdateInfoError(error) &&
            (error.source === pluginName || ("plugin" in error && error.plugin === bareName)),
        );
        let statusText = any
          ? `${figures_default.cross} failed to load`
          : isEnabled
            ? `${figures_default.tick} enabled`
            : `${figures_default.cross} disabled`;
        let reloadSuffix =
          !any && isEnabled !== enabledSources.has(pluginName) ? " \u2014 run /reload-plugins to apply" : "";
        let version = (
          appState_2.find((entry) => entry.source === pluginName) ??
          appState_3.find((entry) => entry.source === pluginName)
        )?.manifest.version;
        for (const install of installedPlugins.plugins[pluginName] ?? []) {
          let versionText = formatFirstKnownVersion(install.version, version);
          let scopeText = versionText
            ? `${escapeXml(printableName(versionText, 100))}, ${install.scope}`
            : install.scope;
          lines.push(`  \u2022 ${pluginName} (${scopeText}) ${statusText}${reloadSuffix}`);
          shownCount++;
        }
      }
      if (shownCount === 0) {
        onComplete(`No ${filter} plugins.`);
        return;
      }
      onComplete(
        lines.join(`
`),
      );
    };
    printDeps = [onComplete, appState, appState_2, appState_3, filter];
    $[0] = appState_2;
    $[1] = filter;
    $[2] = appState_3;
    $[3] = appState;
    $[4] = onComplete;
    $[5] = printList;
    $[6] = printDeps;
  } else {
    printList = $[5];
    printDeps = $[6];
  }
  useEffect(printList, printDeps);
  let footer;
  if ($[7] === MEMO_CACHE_SENTINEL) {
    footer = jsxProd_default(Text, {
      children: "Loading plugins...",
    });
    $[7] = footer;
  } else footer = $[7];
  return footer;
}
//@ chunk-wb51jffc.js:221506-221532 layout
function nullComponent() {
  return null;
}
//@ chunk-wb51jffc.js:221532-221716 layout
function SkillsMovedNotice() {
  let $ = useMemoCache(1);
  let content;
  if ($[0] === MEMO_CACHE_SENTINEL) {
    content = jsxProd_default(Box, {
      marginTop: 1,
      children: jsxProd_default(StatusRow, {
        status: "info",
        children: "Skills are now managed here under the Skills section.",
      }),
    });
    $[0] = content;
  } else content = $[0];
  return content;
}
//@ chunk-wb51jffc.js:221716-222567 layout
/**
 * 云会话下显示"云会话已加载哪些插件"及"这里的改动影响本机与之后的云会话"的说明。
 */
function CloudSessionPluginsNotice() {
  let $ = useMemoCache(7);
  let appState = useAppState(selectWorkerPluginInventory);
  let children;
  if ($[0] !== appState) {
    children =
      appState === null
        ? "The cloud session hasn't reported which plugins it loaded (it does at the start of each turn)."
        : appState.length === 0
          ? "The cloud session loaded no plugins."
          : `The cloud session loaded: ${appState.map(escapeDisplayName).join(", ")}.`;
    $[0] = appState;
    $[1] = children;
  } else children = $[1];
  let content;
  if ($[2] !== children) {
    content = jsxProd_default(StatusRow, {
      status: "info",
      children,
    });
    $[2] = children;
    $[3] = content;
  } else content = $[3];
  let status;
  if ($[4] === MEMO_CACHE_SENTINEL) {
    status = jsxProd_default(Text, {
      dimColor: true,
      wrap: "wrap-trim",
      children:
        "Changes here update this machine's plugins and future cloud sessions (/cloud-plugins decides whether they are sent), and reach a running cloud session only when this machine next attaches to it (or on your first Yes in /cloud-plugins); /reload-plugins re-reads the running session's own.",
    });
    $[4] = status;
  } else status = $[4];
  let footer;
  if ($[5] !== content) {
    footer = jsxProd_default_2(Box, {
      marginTop: 1,
      flexDirection: "column",
      children: [content, status],
    });
    $[5] = content;
    $[6] = footer;
  } else footer = $[6];
  return footer;
}
//@ chunk-wb51jffc.js:222567-222782 layout
function SkillDoctorMovedNotice() {
  let $ = useMemoCache(1);
  let content;
  if ($[0] === MEMO_CACHE_SENTINEL) {
    content = jsxProd_default(Box, {
      marginTop: 1,
      children: jsxProd_default(StatusRow, {
        status: "info",
        children: "/skill-doctor moved \u2014 skill usage and context costs now live in this Stats tab.",
      }),
    });
    $[0] = content;
  } else content = $[0];
  return content;
}
//@ chunk-wb51jffc.js:222782-223084 fingerprint (2.1.88 match: getExtraMarketplaceSourceInfo, 0.954)
function getExtraMarketplaceSourceInfo(name) {
  let editableSources = [];
  let sourcesToCheck = [
    {
      source: "userSettings",
      scope: "user",
    },
    {
      source: "projectSettings",
      scope: "project",
    },
    {
      source: "localSettings",
      scope: "local",
    },
  ];
  for (let { source, scope } of sourcesToCheck)
    if (getMarketplaceDeclaringSource(getSettingsForSourceForUpkeep(source), name))
      editableSources.push({
        source,
        scope,
      });
  let settings = Boolean(getMarketplaceDeclaringSource(getSettingsForSource("policySettings"), name));
  return {
    editableSources,
    isInPolicy: settings,
  };
}
//@ chunk-wb51jffc.js:223084-223159 layout
function hasAutoUpdateSetting(entry) {
  return entry?.extraKnownMarketplaces?.[OFFICIAL_MARKETPLACE_NAME]?.autoUpdate !== undefined;
}
//@ chunk-wb51jffc.js:223159-223573 layout
/**
 * 决定删除某个市场时的动作：在 extraKnownMarketplaces 里时删设置项（官方市场可保留已启用插件），只在托管策略里时提示 managed-only，官方市场否则跳转到对应页，其他走常规市场删除。
 */
function planMarketplaceRemoval(name, sources, force = false) {
  let { editableSources, isInPolicy } = getExtraMarketplaceSourceInfo(name);
  if (name === OFFICIAL_MARKETPLACE_NAME) {
    let filtered = editableSources.filter(
      ({ source }) =>
        !(source === "userSettings" && hasAutoUpdateSetting(getSettingsForSourceForUpkeep(source))),
    );
    if (force && filtered.length > 0)
      return {
        kind: "remove-extra-marketplace",
        name,
        sources: filtered,
        keepEnabledPlugins: true,
      };
    if (force && isInPolicy)
      return {
        kind: "managed-only",
        name,
      };
    return navigateToOfficialMarketplace(sources);
  }
  if (editableSources.length > 0)
    return {
      kind: "remove-extra-marketplace",
      name,
      sources: editableSources,
    };
  if (isInPolicy)
    return {
      kind: "managed-only",
      name,
    };
  return buildMarketplaceAction(name);
}
//@ chunk-wb51jffc.js:223573-223707 layout
function joinScopeNames(sources) {
  let mapped = sources.map((source) => source.scope);
  return mapped.length > 1
    ? `${mapped.slice(0, -1).join(", ")}${mapped.length > 2 ? "," : ""} and ${mapped.at(-1)}`
    : (mapped[0] ?? "");
}
//@ chunk-wb51jffc.js:223707-224990 layout
/**
 * 生成删除市场前的确认文案：删除 extraKnownMarketplaces 设置项，或删除 known_marketplaces.json 条目并卸载其插件；官方市场与拼写相近的官方市场有额外说明。
 */
function describeMarketplaceRemoval(action, marketplaceNames) {
  if (action.kind === "remove-extra-marketplace") {
    let quotedName = quotedPrintable(action.name);
    return action.keepEnabledPlugins
      ? `Remove "${quotedName}" from extraKnownMarketplaces in ${joinScopeNames(action.sources)} settings? The built-in ${OFFICIAL_MARKETPLACE_DISPLAY} and its plugins are not changed.`
      : `Remove "${quotedName}" from extraKnownMarketplaces in ${joinScopeNames(action.sources)} settings? Its plugins are also removed from enabledPlugins there.`;
  }
  let quotedNames = marketplaceNames.map((marketplaceName) => `"${quotedPrintable(marketplaceName)}"`);
  let includesOfficial = marketplaceNames.includes(OFFICIAL_MARKETPLACE_NAME);
  let nonOfficialNames = quotedNames.filter(
    (quotedName, name) => !(includesOfficial && marketplaceNames[name] === OFFICIAL_MARKETPLACE_NAME),
  );
  let sentences = [
    quotedNames.length > 1
      ? `Remove the known_marketplaces.json entries named ${quotedNames.join(" and ")}?`
      : `Remove the known_marketplaces.json entry named ${quotedNames[0] ?? ""}?`,
  ];
  if (nonOfficialNames.length > 0)
    sentences.push(
      `Plugins installed from ${nonOfficialNames.join(" and ")} are uninstalled, and ${nonOfficialNames.length > 1 ? "their" : "its"} extraKnownMarketplaces and enabledPlugins entries in your user, project, and local settings are removed too.`,
    );
  if (includesOfficial)
    sentences.push(
      `Nothing installed from "${OFFICIAL_MARKETPLACE_NAME}" is uninstalled. Its extraKnownMarketplaces entries in your user, project, and local settings are removed too, except the one in user settings that sets autoUpdate.`,
    );
  if (marketplaceNames.some(isOfficialMarketplaceSpelling))
    sentences.push(
      `Installed ${OFFICIAL_MARKETPLACE_DISPLAY} plugins not at a commit it lists may have come from ${quotedNames.length > 1 ? "these entries" : "this entry"}, so they are turned off (all of them, if its cached list can't be read). The ${OFFICIAL_MARKETPLACE_DISPLAY} itself stays as it is.`,
    );
  return sentences.join(" ");
}
//@ chunk-wb51jffc.js:224990-225131 fingerprint (2.1.88 match: buildMarketplaceAction, 0.604)
function buildMarketplaceAction(name) {
  return {
    kind: "navigate",
    tab: "marketplaces",
    viewState: {
      type: "manage-marketplaces",
      targetMarketplace: name,
      action: "confirm-remove",
    },
  };
}
//@ chunk-wb51jffc.js:225131-225386 layout
function navigateToOfficialMarketplace(entry) {
  if (pluginDirectoryPolicyBlock() !== null && entry !== undefined)
    return {
      kind: "navigate",
      tab: "installed",
      viewState: {
        type: "manage-plugins",
        targetPlugin: entry,
        targetMarketplace: OFFICIAL_MARKETPLACE_NAME,
      },
    };
  return {
    kind: "navigate",
    tab: "marketplaces",
    viewState: {
      type: "manage-marketplaces",
      targetMarketplace: OFFICIAL_MARKETPLACE_NAME,
    },
  };
}
//@ chunk-wb51jffc.js:225386-225672 fingerprint (2.1.88 match: buildPluginAction, 0.87)
function buildPluginAction(installedEntry, { resolveByUninstall }) {
  return {
    kind: "navigate",
    tab: "installed",
    viewState: {
      type: "manage-plugins",
      targetPlugin: installedEntry.name,
      ...(installedEntry.marketplace !== undefined && {
        targetMarketplace: installedEntry.marketplace,
      }),
      ...(resolveByUninstall &&
        installedEntry.marketplace !== undefined &&
        (!isReservedMarketplaceName(installedEntry.marketplace) ||
          installedEntry.marketplace === pluginManifestPathSchemas) && {
          action: "uninstall",
        }),
    },
  };
}
//@ chunk-wb51jffc.js:225672-225738 fingerprint (2.1.88 match: TRANSIENT_ERROR_TYPES, 1)
var TRANSIENT_ERROR_TYPES; // deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
deferInit("chunk-wb51jffc.js:225672", () => {
  TRANSIENT_ERROR_TYPES = new Set(["git-auth-failed", "git-timeout", "network-error"]);
});
//@ chunk-wb51jffc.js:225738-225871 fingerprint (2.1.88 match: _temp7, 1)
function isMarketplaceError(e_1) {
  return (
    e_1.type === "marketplace-not-found" ||
    e_1.type === "marketplace-load-failed" ||
    e_1.type === "marketplace-blocked-by-policy"
  );
}
//@ chunk-wb51jffc.js:225871-226039 callgraph-fingerprint (2.1.88 match: _temp6, 0.65)
function isTransientPluginError(e_0) {
  if (TRANSIENT_ERROR_TYPES.has(e_0.type)) return true;
  if (e_0.type === "marketplace-load-failed" && e_0.reason === "cache-miss") return true;
  if (e_0.type === "marketplace-not-found") return true;
  return false;
}
//@ chunk-wb51jffc.js:226039-226376 layout
/**
 * 从插件错误的 source 解析出插件名与市场：返回规范化 key、显示标签、可编辑范围、是否有名字。
 */
function describePluginErrorTarget(error, marketplace, pluginName) {
  let marketplaceName = marketplaceOf(error.source);
  let marketplace_2 = "marketplace" in error ? error.marketplace : undefined;
  let resolvedName =
    marketplace ??
    (marketplaceName || marketplaceSuffix(error.source) !== undefined
      ? splitPluginId(error.source).name
      : undefined);
  let label = marketplaceName ?? marketplace_2 ?? marketplaceSuffix(error.source);
  return {
    key: resolvedName === undefined ? undefined : nfcLower(label ? `${resolvedName}@${label}` : resolvedName),
    label:
      resolvedName === undefined
        ? error.source
        : label
          ? `${resolvedName} @ ${displayMarketplaceName(label)}`
          : resolvedName,
    scope:
      editableScopeOf(pluginName, error.source) ??
      (resolvedName !== undefined && marketplaceName
        ? editableScopeOf(pluginName, `${resolvedName}@${marketplaceName}`)
        : undefined),
    named: resolvedName !== undefined,
  };
}
//@ chunk-wb51jffc.js:226376-228456 fingerprint (2.1.88 match: buildErrorRows, 0.788)
function buildErrorRows(
  failedMarketplaces,
  extraMarketplaceErrors,
  pluginLoadingErrors,
  otherErrors,
  brokenInstalledMarketplaces,
  transientErrors,
  pluginWarnings,
  pluginName,
  pluginId,
) {
  let rows = [];
  for (let error of transientErrors) {
    let pluginName = "pluginId" in error ? error.pluginId : "plugin" in error ? error.plugin : undefined;
    rows.push({
      label: pluginName ?? error.source,
      message: formatSkillErrorMessage(error),
      guidance: getErrorGuidanceText(error) ?? "Restart to retry loading plugins",
      action: {
        kind: "none",
      },
    });
  }
  let shownMarketplaceNames = new Set();
  for (let m of failedMarketplaces) {
    shownMarketplaceNames.add(m.name);
    let action = planMarketplaceRemoval(m.name, undefined, true);
    let sourceInfo = getExtraMarketplaceSourceInfo(m.name);
    let scope = sourceInfo.isInPolicy ? "managed" : sourceInfo.editableSources[0]?.scope;
    rows.push({
      label: displayMarketplaceName(m.name),
      message: m.error ?? "Installation failed",
      guidance:
        action.kind === "managed-only" ? "Managed by your organization \u2014 contact your admin" : undefined,
      action,
      scope,
    });
  }
  for (let e of extraMarketplaceErrors) {
    let marketplace = "marketplace" in e ? e.marketplace : e.source;
    if (shownMarketplaceNames.has(marketplace)) continue;
    shownMarketplaceNames.add(marketplace);
    let action = planMarketplaceRemoval(marketplace, "plugin" in e ? e.plugin : undefined);
    let sourceInfo = getExtraMarketplaceSourceInfo(marketplace);
    let scope = sourceInfo.isInPolicy ? "managed" : sourceInfo.editableSources[0]?.scope;
    rows.push({
      label: displayMarketplaceName(marketplace),
      message: formatSkillErrorMessage(e),
      guidance:
        action.kind === "managed-only"
          ? "Managed by your organization \u2014 contact your admin"
          : getErrorGuidanceText(e),
      action,
      scope,
    });
  }
  for (let brokenInstalledMarketplace of brokenInstalledMarketplaces) {
    let sourceInfo = isPluginDirectoryUnavailableFailure(brokenInstalledMarketplace);
    if (!sourceInfo && shownMarketplaceNames.has(brokenInstalledMarketplace.name)) continue;
    if (!sourceInfo) shownMarketplaceNames.add(brokenInstalledMarketplace.name);
    let resolvedName = sourceInfo
      ? brokenInstalledMarketplace.name
      : marketplaceDisplayName(brokenInstalledMarketplace.name);
    let isOfficialWithoutSource = false;
    isOfficialWithoutSource = brokenInstalledMarketplace.name === OFFICIAL_MARKETPLACE_NAME && !sourceInfo;
    rows.push({
      label:
        resolvedName === brokenInstalledMarketplace.name
          ? displayMarketplaceName(brokenInstalledMarketplace.name)
          : resolvedName,
      message: brokenInstalledMarketplace.error,
      ...(isOfficialWithoutSource && {
        guidance:
          "Reopen /plugin later to try again. Enter opens it in Marketplaces, where you can update it now or turn it off.",
      }),
      action: isOfficialWithoutSource
        ? navigateToOfficialMarketplace()
        : sourceInfo
          ? {
              kind: "remove-ignored-name-entries",
              name: brokenInstalledMarketplace.name,
            }
          : buildMarketplaceAction(brokenInstalledMarketplace.name),
    });
  }
  let shownPluginNames = new Set();
  for (let error of pluginLoadingErrors) {
    let pluginName_2 = describePluginErrorTarget(error, getPluginNameFromError(error), pluginName);
    if (pluginName_2.key !== undefined && shownPluginNames.has(pluginName_2.key)) continue;
    if (pluginName_2.key !== undefined) shownPluginNames.add(pluginName_2.key);
    let pluginName_3 = isAutoupdateInfoError(error);
    rows.push({
      label: pluginName_2.label,
      message: formatSkillErrorMessage(error),
      guidance: getErrorGuidanceText(error),
      action:
        pluginName_2.named && !pluginName_3
          ? buildPluginAction(findInstalledEntry(error, pluginId), {
              resolveByUninstall: true,
            })
          : {
              kind: "none",
            },
      isAdvisory: pluginName_3 || undefined,
      scope: pluginName_2.scope,
    });
  }
  for (let error of otherErrors)
    rows.push({
      label: error.source,
      message: formatSkillErrorMessage(error),
      guidance: getErrorGuidanceText(error),
      action: {
        kind: "none",
      },
    });
  for (let warning of pluginWarnings) {
    let target = describePluginErrorTarget(
      warning,
      "plugin" in warning ? warning.plugin : undefined,
      pluginName,
    );
    let key = target.key ?? nfcLower(warning.source);
    let pluginState =
      warning.type === "mcpb-needs-config"
        ? `${warning.type}:${key}:${warning.serverName}`
        : "plugin" in warning
          ? key
          : `${warning.type}:${key}`;
    if (shownPluginNames.has(pluginState)) continue;
    shownPluginNames.add(pluginState);
    rows.push({
      label: target.label,
      message: pluginWarningText(warning),
      guidance: pluginWarningFixText(warning),
      action:
        warning.type === "mcpb-needs-config" && target.named
          ? buildPluginAction(findInstalledEntry(warning, pluginId), {
              resolveByUninstall: false,
            })
          : {
              kind: "none",
            },
      scope: target.scope,
      isAdvisory: true,
    });
  }
  return rows;
}
//@ chunk-wb51jffc.js:228456-228851 layout (2.1.88 match: saveMarketplaceToSettings, 0.841)
/**
 * 界面里把多个市场批量写回各自设置源的 extraKnownMarketplaces（可删除）。
 */
function saveMarketplaceToSettings(name, sources, storageV5, force = false) {
  for (let { source } of sources)
    updateSettingsForSourceWithTransform(
      source,
      (prev) => {
        if (!prev) return null;
        let next = {};
        let existing =
          force &&
          source === "userSettings" &&
          name === OFFICIAL_MARKETPLACE_NAME &&
          hasAutoUpdateSetting(prev);
        if (getMarketplaceDeclaringSource(prev, name) && !existing)
          next.extraKnownMarketplaces = {
            ...prev.extraKnownMarketplaces,
            [name]: undefined,
          };
        if (prev.enabledPlugins && !force) {
          let label = `@${name}`;
          let changed = false;
          let current = {
            ...prev.enabledPlugins,
          };
          for (let key in current)
            if (key.endsWith(label)) {
              current[key] = undefined;
              changed = true;
            }
          if (changed) next.enabledPlugins = current;
        }
        return Object.keys(next).length > 0 ? next : null;
      },
      undefined,
      storageV5,
    );
}
//@ chunk-wb51jffc.js:228851-235732 fingerprint (2.1.88 match: ErrorsTabContent, 0.612)
function ErrorsTabContent(props) {
  let $ = useMemoCache(59);
  let { setViewState, setActiveTab, markPluginsChanged } = props;
  let { storageV5, credentials } = useTheme_2();
  let errors = useAppState(selectPluginErrors_2);
  let pluginWarnings = usePluginWarnings();
  let installationStatus = useAppState(selectEnabledPlugins_2);
  let appState = useAppState(selectDisabledPlugins_2);
  let installationStatus_2 = useAppState(selectInstallationStatus);
  let setAppState = useSetAppState();
  let activePlugins = useActivePlugins();
  let [selectedIndex, setSelectedIndex] = useState(0);
  let [statusMessage, setStatusMessage] = useState(null);
  let [action, confirmAction] = useState(null);
  let removingRef = useRef(false);
  let errorRows;
  if ($[0] === MEMO_CACHE_SENTINEL) {
    errorRows = [];
    $[0] = errorRows;
  } else errorRows = $[0];
  let [errorRows_2, setErrorRows] = useState(errorRows);
  let loadErrors;
  let loadDeps;
  if ($[1] !== storageV5) {
    loadErrors = () => {
      (async () => {
        try {
          let config = await loadKnownMarketplacesWithDeclared(storageV5);
          let { failures } = await loadMarketplacesWithErrors(config, storageV5);
          setErrorRows(failures);
        } catch {}
      })();
    };
    loadDeps = [storageV5];
    $[1] = storageV5;
    $[2] = loadErrors;
    $[3] = loadDeps;
  } else {
    loadErrors = $[2];
    loadDeps = $[3];
  }
  useEffect(loadErrors, loadDeps);
  let failedMarketplaces = installationStatus_2.marketplaces.filter(isFailedMarketplace);
  let failedMarketplaceNames = new Set(failedMarketplaces.map(marketplaceName));
  let transientErrors = [];
  let extraMarketplaceErrors = [];
  let pluginLoadingErrors = [];
  let otherErrors = [];
  for (const error of errors) {
    if (isTransientPluginError(error)) transientErrors.push(error);
    else if (isMarketplaceError(error)) {
      if (!failedMarketplaceNames.has(error.marketplace)) extraMarketplaceErrors.push(error);
    } else if (getPluginNameFromError(error) !== undefined) pluginLoadingErrors.push(error);
    else otherErrors.push(error);
  }
  let errorRows_3 = buildErrorRows(
    failedMarketplaces,
    extraMarketplaceErrors,
    pluginLoadingErrors,
    otherErrors,
    errorRows_2,
    transientErrors,
    pluginWarnings,
    getPluginEditableScopes(),
    [...installationStatus, ...appState],
  );
  let cancelAction;
  if ($[4] !== action || $[5] !== setViewState) {
    cancelAction = () => {
      if (action !== null) {
        confirmAction(null);
        return;
      }
      setViewState({
        type: "menu",
      });
    };
    $[4] = action;
    $[5] = setViewState;
    $[6] = cancelAction;
  } else cancelAction = $[6];
  let confirmKeybinds;
  if ($[7] === MEMO_CACHE_SENTINEL) {
    confirmKeybinds = {
      context: "Confirmation",
    };
    $[7] = confirmKeybinds;
  } else confirmKeybinds = $[7];
  useKeybinding("confirm:no", cancelAction, confirmKeybinds);
  let removeExtraMarketplace;
  if ($[8] !== credentials || $[9] !== markPluginsChanged || $[10] !== setAppState || $[11] !== storageV5) {
    removeExtraMarketplace = (entry) => {
      let scopes = joinScopeNames(entry.sources);
      saveMarketplaceToSettings(entry.name, entry.sources, storageV5, entry.keepEnabledPlugins === true);
      refreshPluginCaches(storageV5, credentials);
      let keepEnabled = entry.keepEnabledPlugins === true;
      setAppState((prev) => ({
        ...prev,
        plugins: {
          ...prev.plugins,
          errors: prev.plugins.errors.filter(
            (e_2) => keepEnabled || !("marketplace" in e_2 && e_2.marketplace === entry.name),
          ),
          installationStatus: {
            ...prev.plugins.installationStatus,
            marketplaces: prev.plugins.installationStatus.marketplaces.filter(
              (m_1) => m_1.name !== entry.name,
            ),
          },
        },
      }));
      setStatusMessage(
        keepEnabled
          ? `${figures_default.tick} Removed "${quotedPrintable(entry.name)}" from extraKnownMarketplaces in ${scopes} settings. The built-in ${OFFICIAL_MARKETPLACE_DISPLAY} and its plugins are not changed.`
          : `${figures_default.tick} Removed "${quotedPrintable(entry.name)}" and its enabledPlugins entries from ${scopes} settings`,
      );
      markPluginsChanged();
    };
    $[8] = credentials;
    $[9] = markPluginsChanged;
    $[10] = setAppState;
    $[11] = storageV5;
    $[12] = removeExtraMarketplace;
  } else removeExtraMarketplace = $[12];
  let removeExtra = removeExtraMarketplace;
  let removeInstalled;
  if (
    $[13] !== activePlugins ||
    $[14] !== credentials ||
    $[15] !== markPluginsChanged ||
    $[16] !== storageV5
  ) {
    removeInstalled = (e_2) => {
      (async () => {
        let wasRemoving = false;
        if (isOfficialMarketplaceSpelling(e_2.name)) {
          if (removingRef.current) {
            return;
          }
          removingRef.current = true;
          wasRemoving = true;
        }
        try {
          let result = await removeMarketplaceWithReservedSiblings(
            e_2.name,
            undefined,
            storageV5,
            credentials,
            {
              onlyIgnoredNameEntries: true,
            },
          );
          let message = `${figures_default.tick} Removed marketplace "${quotedPrintable(e_2.name)}"`;
          let removedNames = [e_2.name];
          let hasRemovedNames = result.kind !== "plugin-directory-built-in";
          let removedPluginIds = [];
          if (result.kind !== "plugin-directory-built-in") removedPluginIds = result.removedPluginIds;
          if (result.kind === "ignored-plugin-directory-name-entry-removed") {
            let directoryMode = isPluginDirectoryModeOn();
            let mapped = result.removedNames.map((m_1) => removedMarketplaceMessage(m_1, directoryMode));
            message = `${figures_default.tick} ${mapped.join(" ")}`;
            let blockedNotice = blockedPluginsNotice(result.disabledPluginIds, result.disabledReason);
            if (blockedNotice !== null) message = `${message} ${blockedNotice}`;
            removedNames = [e_2.name, ...result.removedNames];
            hasRemovedNames = result.removedNames.length > 0;
            if (!hasRemovedNames) message = `${figures_default.tick} ${marketplaceEntryGoneText(e_2.name)}`;
          }
          if (hasRemovedNames)
            logEvent("tengu_marketplace_removed", {
              marketplace_name: marketplaceForTelemetry(e_2.name),
              _PROTO_marketplace_name: e_2.name,
              is_official_marketplace: isOfficialMarketplaceName_3(e_2.name),
            });
          refreshPluginCaches(storageV5, credentials);
          let isDirectoryEntry = result.kind === "ignored-plugin-directory-name-entry-removed";
          setErrorRows((prev) =>
            prev.filter(
              (row) =>
                !removedNames.includes(row.name) ||
                (isDirectoryEntry && !isPluginDirectoryUnavailableFailure(row)),
            ),
          );
          activePlugins.removeErrorsOf(removedPluginIds);
          setStatusMessage(message);
          markPluginsChanged();
        } catch (error) {
          let caught = error;
          setStatusMessage(`Failed to remove "${quotedPrintable(e_2.name)}": ${printableMessage(caught)}`);
        }
        if (wasRemoving) removingRef.current = false;
      })();
    };
    $[13] = activePlugins;
    $[14] = credentials;
    $[15] = markPluginsChanged;
    $[16] = storageV5;
    $[17] = removeInstalled;
  } else removeInstalled = $[17];
  let removeWithSiblings = removeInstalled;
  let acceptRow = () => {
    let row = errorRows_3[selectedIndex];
    if (!row) {
      return;
    }
    let { action } = row;
    je: switch (action.kind) {
      case "navigate": {
        setActiveTab(action.tab);
        setViewState(action.viewState);
        break je;
      }
      case "remove-extra-marketplace": {
        confirmAction(action);
        break je;
      }
      case "remove-ignored-name-entries": {
        confirmAction(action);
        break je;
      }
      case "managed-only": {
        break je;
      }
      case "none":
    }
  };
  let selectPrevious;
  if ($[18] === MEMO_CACHE_SENTINEL) {
    selectPrevious = () => setSelectedIndex(decrementNonNegative);
    $[18] = selectPrevious;
  } else selectPrevious = $[18];
  const isActive = errorRows_3.length > 0 && !action;
  let selectKeybinds;
  if ($[19] !== isActive) {
    selectKeybinds = {
      context: "Select",
      isActive,
    };
    $[19] = isActive;
    $[20] = selectKeybinds;
  } else selectKeybinds = $[20];
  MessageActionsKeybindings(
    {
      "select:previous": selectPrevious,
      "select:next": () => setSelectedIndex((prev) => Math.min(errorRows_3.length - 1, prev + 1)),
      "select:accept": acceptRow,
    },
    selectKeybinds,
  );
  let namesForAction;
  if ($[21] !== errorRows_2) {
    namesForAction = (row) =>
      row.kind === "remove-ignored-name-entries" && isOfficialMarketplaceName_2(row.name)
        ? normalizeCaseForComparison_2([
            row.name,
            ...errorRows_2.filter(isOfficialDirUnavailableFailure).map(failureName),
          ])
        : [row.name];
    $[21] = errorRows_2;
    $[22] = namesForAction;
  } else namesForAction = $[22];
  let actionNames = namesForAction;
  let handleKeyDown;
  if ($[23] !== action || $[24] !== removeExtra || $[25] !== removeWithSiblings) {
    handleKeyDown = function handleKeyDown(prev_2) {
      if (prev_2.ctrl || prev_2.meta || action === null) {
        return;
      }
      if (prev_2.key === "up" || prev_2.key === "down") {
        prev_2.preventDefault();
        return;
      }
      if (prev_2.key === "y" || prev_2.key === "Y") {
        prev_2.preventDefault();
        let pendingAction = action;
        confirmAction(null);
        if (pendingAction.kind === "remove-extra-marketplace") removeExtra(pendingAction);
        else removeWithSiblings(pendingAction);
      } else if (prev_2.key === "n" || prev_2.key === "N") {
        prev_2.preventDefault();
        confirmAction(null);
      }
    };
    $[23] = action;
    $[24] = removeExtra;
    $[25] = removeWithSiblings;
    $[26] = handleKeyDown;
  } else handleKeyDown = $[26];
  let onKeyDown = handleKeyDown;
  if (errorRows_3.length === 0 && action !== null) confirmAction(null);
  let clampedIndex = Math.min(selectedIndex, Math.max(0, errorRows_3.length - 1));
  if (clampedIndex !== selectedIndex) setSelectedIndex(clampedIndex);
  let selectedAction = errorRows_3[clampedIndex]?.action;
  let canConfirm = selectedAction && selectedAction.kind !== "none" && selectedAction.kind !== "managed-only";
  if (errorRows_3.length === 0) {
    let iconBox;
    if ($[27] === MEMO_CACHE_SENTINEL) {
      iconBox = jsxProd_default(Box, {
        marginLeft: 1,
        children: jsxProd_default(HintText, {
          children: "No plugin errors",
        }),
      });
      $[27] = iconBox;
    } else iconBox = $[27];
    let statusLine;
    if ($[28] !== statusMessage) {
      statusLine =
        statusMessage &&
        jsxProd_default(Box, {
          marginTop: 1,
          marginLeft: 1,
          children: jsxProd_default(Text, {
            color: "claude",
            children: stripInvisibleKeepEmoji(statusMessage),
          }),
        });
      $[28] = statusMessage;
      $[29] = statusLine;
    } else statusLine = $[29];
    let spacerBox;
    if ($[30] === MEMO_CACHE_SENTINEL) {
      spacerBox = jsxProd_default(Box, {
        marginTop: 1,
        children: jsxProd_default(Text, {
          dimColor: true,
          italic: true,
          children: jsxProd_default(ConfigurableShortcutHint, {
            action: "confirm:no",
            context: "Confirmation",
            fallback: "Esc",
            description: "go back",
          }),
        }),
      });
      $[30] = spacerBox;
    } else spacerBox = $[30];
    let headerBox;
    if ($[31] !== statusLine) {
      headerBox = jsxProd_default_2(Box, {
        flexDirection: "column",
        children: [iconBox, statusLine, spacerBox],
      });
      $[31] = statusLine;
      $[32] = headerBox;
    } else headerBox = $[32];
    return headerBox;
  }
  const BoxComponent = Box;
  const flexDirection = "column";
  const gap = 1;
  let renderRow;
  if ($[33] !== clampedIndex || $[34] !== action) {
    renderRow = (row, idx) => {
      let isActiveRow = idx === clampedIndex;
      let color = row.isAdvisory ? "warning" : "error";
      let rowText = isActiveRow
        ? figures_default.pointer
        : row.isAdvisory
          ? figures_default.triangleUpOutline
          : figures_default.cross;
      return jsxProd_default_2(
        TwoColumnRow,
        {
          active: isActiveRow && !action,
          marginLeft: 1,
          flexDirection: "column",
          children: [
            jsxProd_default_2(Text, {
              children: [
                jsxProd_default_2(Text, {
                  "aria-hidden": isActiveRow,
                  color: isActiveRow ? "suggestion" : color,
                  children: [rowText, " "],
                }),
                jsxProd_default(Text, {
                  bold: isActiveRow,
                  children: stripInvisibleKeepEmoji(row.label),
                }),
                row.scope &&
                  jsxProd_default_2(Text, {
                    dimColor: true,
                    children: [" (", row.scope, ")"],
                  }),
              ],
            }),
            jsxProd_default(Box, {
              marginLeft: 3,
              children: jsxProd_default(Text, {
                color,
                wrap: "wrap-trim",
                children: stripInvisibleKeepNewlines(row.message),
              }),
            }),
            row.guidance &&
              jsxProd_default(Box, {
                marginLeft: 3,
                children: jsxProd_default(Text, {
                  dimColor: true,
                  italic: true,
                  wrap: "wrap-trim",
                  children: stripInvisibleKeepNewlines(row.guidance),
                }),
              }),
          ],
        },
        idx,
      );
    };
    $[33] = clampedIndex;
    $[34] = action;
    $[35] = renderRow;
  } else renderRow = $[35];
  const mapped = errorRows_3.map(renderRow);
  let footerBox;
  if ($[36] !== onKeyDown || $[37] !== action || $[38] !== actionNames) {
    footerBox =
      action &&
      jsxProd_default(FocusColumn, {
        onKeyDown,
        children: jsxProd_default(TwoColumnRow, {
          active: true,
          marginLeft: 1,
          children: jsxProd_default_2(Text, {
            color: "warning",
            wrap: "wrap-trim",
            children: [
              describeMarketplaceRemoval(action, actionNames(action)),
              " ",
              "Press ",
              jsxProd_default(Text, {
                bold: true,
                children: "y",
              }),
              " to remove or ",
              jsxProd_default(Text, {
                bold: true,
                children: "n",
              }),
              " to keep",
              " ",
              actionNames(action).length > 1 ? "them" : "it",
              ".",
            ],
          }),
        }),
      });
    $[36] = onKeyDown;
    $[37] = action;
    $[38] = actionNames;
    $[39] = footerBox;
  } else footerBox = $[39];
  let detailsBox;
  if ($[40] !== statusMessage) {
    detailsBox =
      statusMessage &&
      jsxProd_default(Box, {
        marginLeft: 1,
        children: jsxProd_default(Text, {
          color: "claude",
          children: stripInvisibleKeepEmoji(statusMessage),
        }),
      });
    $[40] = statusMessage;
    $[41] = detailsBox;
  } else detailsBox = $[41];
  let iconLine;
  if ($[42] !== action) {
    iconLine =
      !action &&
      jsxProd_default(ConfigurableShortcutHint, {
        action: "select:previous",
        context: "Select",
        fallback: "\u2191",
        description: "navigate",
      });
    $[42] = action;
    $[43] = iconLine;
  } else iconLine = $[43];
  let statusLine;
  if ($[44] !== canConfirm || $[45] !== action) {
    statusLine =
      canConfirm &&
      !action &&
      jsxProd_default(ConfigurableShortcutHint, {
        action: "select:accept",
        context: "Select",
        fallback: "Enter",
        description: "resolve",
      });
    $[44] = canConfirm;
    $[45] = action;
    $[46] = statusLine;
  } else statusLine = $[46];
  const description = action ? (actionNames(action).length > 1 ? "keep them" : "keep it") : "go back";
  let shortcutHint;
  if ($[47] !== description) {
    shortcutHint = jsxProd_default(ConfigurableShortcutHint, {
      action: "confirm:no",
      context: "Confirmation",
      fallback: "Esc",
      description,
    });
    $[47] = description;
    $[48] = shortcutHint;
  } else shortcutHint = $[48];
  let hintBox;
  if ($[49] !== iconLine || $[50] !== statusLine || $[51] !== shortcutHint) {
    hintBox = jsxProd_default(Box, {
      children: jsxProd_default(Text, {
        dimColor: true,
        italic: true,
        children: jsxProd_default_2(Byline, {
          children: [iconLine, statusLine, shortcutHint],
        }),
      }),
    });
    $[49] = iconLine;
    $[50] = statusLine;
    $[51] = shortcutHint;
    $[52] = hintBox;
  } else hintBox = $[52];
  let panel;
  if (
    $[53] !== BoxComponent ||
    $[54] !== mapped ||
    $[55] !== footerBox ||
    $[56] !== detailsBox ||
    $[57] !== hintBox
  ) {
    panel = jsxProd_default_2(BoxComponent, {
      flexDirection,
      gap,
      children: [mapped, footerBox, detailsBox, hintBox],
    });
    $[53] = BoxComponent;
    $[54] = mapped;
    $[55] = footerBox;
    $[56] = detailsBox;
    $[57] = hintBox;
    $[58] = panel;
  } else panel = $[58];
  return panel;
}
//@ chunk-wb51jffc.js:235732-237597 fingerprint (2.1.88 match: getInitialViewState, 0.746)
function getInitialViewState(parsedCommand, fromLinkPrefill) {
  switch (parsedCommand.type) {
    case "help":
      return {
        type: "help",
      };
    case "validate":
      return {
        type: "validate",
        path: parsedCommand.path,
      };
    case "eval":
      return {
        type: "eval",
        target: parsedCommand.target,
      };
    case "tag":
      return {
        type: "tag",
        path: parsedCommand.path,
        push: parsedCommand.push,
        dryRun: parsedCommand.dryRun,
        force: parsedCommand.force,
        unknownFlag: parsedCommand.unknownFlag,
      };
    case "install":
      if (
        parsedCommand.marketplace !== undefined &&
        parsedCommand.plugin !== undefined &&
        parseNpmPluginId(`${parsedCommand.plugin}@${parsedCommand.marketplace}`) !== null
      )
        return {
          type: "npm-install",
          spec: `${parsedCommand.plugin}@${parsedCommand.marketplace}`,
        };
      if (parsedCommand.marketplace)
        return {
          type: "browse-marketplace",
          targetMarketplace: parsedCommand.marketplace,
          targetPlugin: parsedCommand.plugin,
        };
      if (parsedCommand.plugin)
        return {
          type: "discover-plugins",
          targetPlugin: parsedCommand.plugin,
        };
      return {
        type: "discover-plugins",
      };
    case "usage-error":
      return {
        type: "menu",
      };
    case "install-from-source":
      return {
        type: "add-marketplace",
        initialValue: parsedCommand.marketplaceSource,
        confirmAdd: {
          plugin: parsedCommand.plugin,
          linkOrigin: fromLinkPrefill,
        },
      };
    case "manage":
      return {
        type: "manage-plugins",
      };
    case "stats":
      return {
        type: "stats",
      };
    case "directory":
      return {
        type: "discover-plugins",
        marketplace: OFFICIAL_MARKETPLACE_NAME,
        searchQuery: parsedCommand.query,
      };
    case "uninstall":
      return {
        type: "manage-plugins",
        targetPlugin: parsedCommand.plugin,
        action: "uninstall",
      };
    case "enable":
      return {
        type: "manage-plugins",
        targetPlugin: parsedCommand.plugin,
        action: "enable",
      };
    case "disable":
      return {
        type: "manage-plugins",
        targetPlugin: parsedCommand.plugin,
        action: "disable",
      };
    case "configure":
      return {
        type: "manage-plugins",
        targetPlugin: parsedCommand.plugin,
        action: "configure",
      };
    case "list":
      return {
        type: "plugin-list",
        filter: parsedCommand.filter,
      };
    case "marketplace":
      if (parsedCommand.action === "list")
        return {
          type: "marketplace-list",
        };
      if (parsedCommand.action === "add")
        return parsedCommand.target && fromLinkPrefill
          ? {
              type: "add-marketplace",
              initialValue: parsedCommand.target,
              confirmAdd: {
                linkOrigin: true,
              },
            }
          : {
              type: "add-marketplace",
              initialValue: parsedCommand.target,
            };
      if (parsedCommand.action === "remove")
        return {
          type: "manage-marketplaces",
          targetMarketplace: parsedCommand.target,
          action: "remove",
        };
      if (parsedCommand.action === "update")
        return {
          type: "manage-marketplaces",
          targetMarketplace: parsedCommand.target,
          action: "update",
        };
      return {
        type: "menu",
      };
    case "menu":
    default:
      return {
        type: "discover-plugins",
      };
  }
}
//@ chunk-wb51jffc.js:237597-237765 fingerprint (2.1.88 match: getInitialTab, 0.909)
function getInitialTab(viewState) {
  if (viewState.type === "manage-plugins") return "installed";
  if (viewState.type === "stats") return "stats";
  if (viewState.type === "manage-marketplaces") return "marketplaces";
  return "discover";
}
//@ chunk-wb51jffc.js:237765-239259 layout
/**
 * PluginCommand：/plugin 的根组件（解析参数后渲染 PluginSettings）。
 */
function PluginCommand(props) {
  let $ = useMemoCache(21);
  let { onComplete } = props;
  let finish;
  if ($[0] !== onComplete) {
    finish = (...args) => {
      let resultArgs = args;
      if (typeof resultArgs[0] === "string") resultArgs[0] = neutralizeInboundTags(resultArgs[0]);
      onComplete(...resultArgs);
    };
    $[0] = onComplete;
    $[1] = finish;
  } else finish = $[1];
  let finishSafe = finish;
  let sessionOrUndefined = useSessionOrUndefined();
  let prepared;
  if ($[2] !== props.args || $[3] !== sessionOrUndefined) {
    prepared = () => {
      let prompt = sessionOrUndefined ? setPromptValueFor(sessionOrUndefined) : null;
      if (prompt === null) {
        return null;
      }
      let args = parseSlashCommand(prompt)?.args;
      let pluginArgs = parsePluginArgs(props.args);
      if (args === undefined || !import_sortedIndex_2(parsePluginArgs(args), pluginArgs)) {
        return null;
      }
      let installLinkOff =
        pluginArgs.type === "install-from-source" &&
        !getFeatureValue_CACHED_MAY_BE_STALE("tengu_amber_tollgate", false);
      return {
        command: prompt,
        held: !isReadOnlyPluginCommand(pluginArgs),
        installLinkOff,
      };
    };
    $[2] = props.args;
    $[3] = sessionOrUndefined;
    $[4] = prepared;
  } else prepared = $[4];
  let [preparedState] = useState(prepared);
  let [refreshing, setRefreshing] = useState(false);
  let notice = preparedState?.installLinkOff
    ? "Plugin install links are turned off. To install, type /plugin install yourself."
    : preparedState?.held === true && !/^[\x20-\x7e]*$/.test(preparedState.command)
      ? "The command from the link has characters that can't be shown faithfully, so it didn't run. To run it, type it yourself."
      : null;
  let content;
  let footer;
  if ($[5] !== finishSafe || $[6] !== notice) {
    content = () => {
      if (notice !== null) finishSafe(notice);
    };
    footer = [notice, finishSafe];
    $[5] = finishSafe;
    $[6] = notice;
    $[7] = content;
    $[8] = footer;
  } else {
    content = $[7];
    footer = $[8];
  }
  useEffect(content, footer);
  if (notice !== null) {
    return null;
  }
  if (preparedState?.held && !refreshing) {
    let onConfirm;
    if ($[9] === MEMO_CACHE_SENTINEL) {
      onConfirm = () => setRefreshing(true);
      $[9] = onConfirm;
    } else onConfirm = $[9];
    let onCancel;
    if ($[10] !== finishSafe) {
      onCancel = () => finishSafe("Cancelled. The command from the link didn't run.");
      $[10] = finishSafe;
      $[11] = onCancel;
    } else onCancel = $[11];
    let body;
    if ($[12] !== preparedState.command || $[13] !== onCancel) {
      body = jsxProd_default(ConfirmCommandDialog, {
        command: preparedState.command,
        onConfirm,
        onCancel,
      });
      $[12] = preparedState.command;
      $[13] = onCancel;
      $[14] = body;
    } else body = $[14];
    return body;
  }
  let props_2;
  if ($[15] !== finishSafe || $[16] !== props) {
    props_2 = {
      ...props,
      onComplete: finishSafe,
    };
    $[15] = finishSafe;
    $[16] = props;
    $[17] = props_2;
  } else props_2 = $[17];
  const fromLinkPrefill = preparedState !== null;
  let statusLine;
  if ($[18] !== props_2 || $[19] !== fromLinkPrefill) {
    statusLine = jsxProd_default(PluginSettings, {
      props: props_2,
      fromLinkPrefill,
    });
    $[18] = props_2;
    $[19] = fromLinkPrefill;
    $[20] = statusLine;
  } else statusLine = $[20];
  return statusLine;
}
//@ chunk-wb51jffc.js:239259-250561 fingerprint (2.1.88 match: PluginSettings, 0.63)
function PluginSettings(props) {
  let $ = useMemoCache(147);
  let { props: props_2, fromLinkPrefill } = props;
  let {
    onComplete,
    args,
    showMcpRedirectMessage,
    showSkillsRedirectMessage,
    showSkillDoctorRedirectMessage,
    getSessionContext,
    getSkillStatsInputs,
    commands,
    getReloadCacheImpactOptions,
    cloudSession,
  } = props_2;
  let parsedCommand;
  let viewState;
  if ($[0] !== args || $[1] !== fromLinkPrefill) {
    parsedCommand = parsePluginArgs(args);
    viewState = getInitialViewState(parsedCommand, fromLinkPrefill);
    $[0] = args;
    $[1] = fromLinkPrefill;
    $[2] = parsedCommand;
    $[3] = viewState;
  } else {
    parsedCommand = $[2];
    viewState = $[3];
  }
  let viewState_2 = viewState;
  let store;
  if ($[4] !== viewState_2 || $[5] !== parsedCommand.message || $[6] !== parsedCommand.type) {
    store = () => {
      let detailsStore = new PluginDetailsStore(viewState_2);
      if (parsedCommand.type === "usage-error") detailsStore.setResult(parsedCommand.message);
      return detailsStore;
    };
    $[4] = viewState_2;
    $[5] = parsedCommand.message;
    $[6] = parsedCommand.type;
    $[7] = store;
  } else store = $[7];
  let [storeRef] = useState(store);
  let { viewState: viewState_3, result, error } = useStoreSelector(storeRef);
  let { setViewState, setResult, setError } = storeRef;
  let [loaded] = useState(emptySet);
  let lastRef = useRef(null);
  let editor;
  if ($[8] !== getSkillStatsInputs) {
    editor = () => {
      if (lastRef.current === null) {
        if (!getSkillStatsInputs) {
          throw Error("Stats tab rendered without getSkillStatsInputs");
        }
        lastRef.current = logSkillDoctor(getSkillStatsInputs());
      }
      return lastRef.current;
    };
    $[8] = getSkillStatsInputs;
    $[9] = editor;
  } else editor = $[9];
  let getReport = editor;
  let statusLine;
  if ($[10] !== viewState_2) {
    statusLine = getInitialTab(viewState_2);
    $[10] = viewState_2;
    $[11] = statusLine;
  } else statusLine = $[11];
  let [activeTab, setActiveTab] = useState(statusLine);
  let [inputValue, setInputValue] = useState(
    viewState_3.type === "add-marketplace" ? viewState_3.initialValue || "" : "",
  );
  let [cursorOffset, setCursorOffset] = useState(0);
  let [autoOpenAdd, setAutoOpenAdd] = useState(
    viewState_2.type === "add-marketplace" &&
      !!viewState_2.initialValue &&
      viewState_2.confirmAdd === undefined,
  );
  let handleStoreChange;
  if ($[12] !== setViewState) {
    handleStoreChange = (next) => {
      if (next.type === "add-marketplace") {
        let initialValue = next.initialValue ?? "";
        setInputValue(initialValue);
        setCursorOffset(initialValue.length);
        setAutoOpenAdd(false);
      }
      setViewState(next);
    };
    $[12] = setViewState;
    $[13] = handleStoreChange;
  } else handleStoreChange = $[13];
  let setViewState_2 = handleStoreChange;
  let [childSearchActive, setChildSearchActive] = useState(false);
  let setAppState = activeModNames();
  let activePlugins = useActivePlugins();
  let mcpConnections = useMcpConnections();
  let { storageV5 } = useTheme_2();
  let pluginErrorCount = useAppState(countPluginErrors);
  let errorsTabTitle = pluginErrorCount > 0 ? `Errors (${pluginErrorCount})` : "Errors";
  let cliMode =
    parsedCommand.type === "marketplace" &&
    parsedCommand.action === "add" &&
    parsedCommand.target !== undefined;
  let prevState;
  if ($[14] !== getSkillStatsInputs) {
    prevState = getSkillStatsInputs !== undefined && lanternPrismEnabled();
    $[14] = getSkillStatsInputs;
    $[15] = prevState;
  } else prevState = $[15];
  let previousViewState = prevState;
  let searching = useRef(false);
  let searchMode;
  if ($[16] !== activePlugins) {
    searchMode = () => {
      searching.current = true;
      activePlugins.markNeedsRefresh();
    };
    $[16] = activePlugins;
    $[17] = searchMode;
  } else searchMode = $[17];
  let isSearchMode = searchMode;
  let tab;
  if ($[18] !== getReloadCacheImpactOptions) {
    tab = getReloadCacheImpactOptions !== undefined && isPluginMenuCloseReloadEnabled();
    $[18] = getReloadCacheImpactOptions;
    $[19] = tab;
  } else tab = $[19];
  let selectedTab = tab;
  let reloading = useRef(false);
  let reloadStatus;
  if ($[20] !== activePlugins || $[21] !== selectedTab || $[22] !== onComplete) {
    reloadStatus = (tabId) => {
      if (reloading.current) {
        return;
      }
      reloading.current = true;
      let reloadPlan = selectedTab && searching.current ? schedulePluginMenuReload(activePlugins) : "none";
      if (reloadPlan === "none") {
        onComplete(tabId);
        return;
      }
      onComplete(reloadPlan === "deferred" ? firstNonEmpty(tabId, PLUGIN_CHANGES_DEFERRED_NOTICE) : tabId, {
        nextInput: "/reload-plugins",
        submitNextInput: true,
      });
    };
    $[20] = activePlugins;
    $[21] = selectedTab;
    $[22] = onComplete;
    $[23] = reloadStatus;
  } else reloadStatus = $[23];
  let statusValue = reloadStatus;
  let exitState = useGlobalExitKeybindings(statusValue);
  let reloadAfterChange;
  if (
    $[24] !== activePlugins ||
    $[25] !== getReloadCacheImpactOptions ||
    $[26] !== isSearchMode ||
    $[27] !== mcpConnections ||
    $[28] !== storageV5
  ) {
    reloadAfterChange = async (event) => {
      if (!getReloadCacheImpactOptions) {
        isSearchMode();
        return "reload-required";
      }
      searching.current = true;
      return activatePluginsAfterInstall(
        () => ({
          ...getReloadCacheImpactOptions(),
          mcpClients: mcpConnections.get().clients,
          storageV5,
        }),
        activePlugins,
        event,
        storageV5,
      );
    };
    $[24] = activePlugins;
    $[25] = getReloadCacheImpactOptions;
    $[26] = isSearchMode;
    $[27] = mcpConnections;
    $[28] = storageV5;
    $[29] = reloadAfterChange;
  } else reloadAfterChange = $[29];
  let onInstallComplete = reloadAfterChange;
  let content;
  if ($[30] !== storeRef) {
    content = (tabId) => {
      let tab = tabId;
      Pt: switch ((setActiveTab(tab), storeRef.setError(null), tab)) {
        case "discover": {
          storeRef.setViewState({
            type: "discover-plugins",
          });
          break Pt;
        }
        case "installed": {
          storeRef.setViewState({
            type: "manage-plugins",
          });
          break Pt;
        }
        case "marketplaces": {
          storeRef.setViewState({
            type: "manage-marketplaces",
          });
          break Pt;
        }
        case "errors": {
          break Pt;
        }
        case "stats":
      }
    };
    $[30] = storeRef;
    $[31] = content;
  } else content = $[31];
  let onTabChange = content;
  let t5;
  let t6;
  if ($[32] !== statusValue || $[33] !== result || $[34] !== viewState_3.type) {
    t5 = () => {
      if (viewState_3.type === "menu" && !result) statusValue();
    };
    t6 = [viewState_3.type, result, statusValue];
    $[32] = statusValue;
    $[33] = result;
    $[34] = viewState_3.type;
    $[35] = t5;
    $[36] = t6;
  } else {
    t5 = $[35];
    t6 = $[36];
  }
  useEffect(t5, t6);
  let typeRef = useRef(viewState_3.type);
  let body;
  let footer;
  if ($[37] !== viewState_3.type) {
    body = () => {
      if (viewState_3.type === typeRef.current) {
        return;
      }
      typeRef.current = viewState_3.type;
      let viewMap = {
        "browse-marketplace": "discover",
        "manage-plugins": "installed",
        "manage-marketplaces": "marketplaces",
      }[viewState_3.type];
      if (viewMap) setActiveTab(viewMap);
    };
    footer = [viewState_3.type];
    $[37] = viewState_3.type;
    $[38] = body;
    $[39] = footer;
  } else {
    body = $[38];
    footer = $[39];
  }
  useEffect(body, footer);
  let t9;
  if ($[40] !== storeRef) {
    t9 = () => {
      setActiveTab("marketplaces");
      storeRef.setViewState({
        type: "manage-marketplaces",
      });
      setInputValue("");
      storeRef.setError(null);
    };
    $[40] = storeRef;
    $[41] = t9;
  } else t9 = $[41];
  let handleAddMarketplaceEscape = t9;
  const isActive = viewState_3.type === "add-marketplace" && viewState_3.confirmAdd === undefined;
  let t11;
  if ($[42] !== isActive) {
    t11 = {
      context: "Settings",
      isActive,
    };
    $[42] = isActive;
    $[43] = t11;
  } else t11 = $[43];
  useKeybinding("confirm:no", handleAddMarketplaceEscape, t11);
  let t12;
  let t13;
  if ($[44] !== statusValue || $[45] !== result) {
    t12 = () => {
      if (result) statusValue(result);
    };
    t13 = [result, statusValue];
    $[44] = statusValue;
    $[45] = result;
    $[46] = t12;
    $[47] = t13;
  } else {
    t12 = $[46];
    t13 = $[47];
  }
  useEffect(t12, t13);
  let t14;
  let t15;
  if ($[48] !== onComplete || $[49] !== viewState_3.type) {
    t14 = () => {
      if (viewState_3.type === "help") onComplete();
    };
    t15 = [viewState_3.type, onComplete];
    $[48] = onComplete;
    $[49] = viewState_3.type;
    $[50] = t14;
    $[51] = t15;
  } else {
    t14 = $[50];
    t15 = $[51];
  }
  useEffect(t14, t15);
  if (viewState_3.type === "help") {
    let t16;
    if ($[52] === MEMO_CACHE_SENTINEL) {
      t16 = jsxProd_default_2(Box, {
        flexDirection: "column",
        children: [
          jsxProd_default(Text, {
            bold: true,
            children: "Plugin Command Usage:",
          }),
          jsxProd_default(Text, {
            children: " ",
          }),
          jsxProd_default(Text, {
            dimColor: true,
            children: "Installation:",
          }),
          jsxProd_default(Text, {
            children: " /plugin install - Browse and install plugins",
          }),
          jsxProd_default_2(Text, {
            children: [" ", "/plugin install <marketplace> - Install from specific marketplace"],
          }),
          jsxProd_default(Text, {
            children: " /plugin install <plugin> - Install specific plugin",
          }),
          jsxProd_default_2(Text, {
            children: [" ", "/plugin install <plugin>@<market> - Install plugin from marketplace"],
          }),
          jsxProd_default_2(Text, {
            children: [
              " ",
              "/plugin install <plugin> --marketplace <source> - Install plugin from a marketplace source, adding it first",
            ],
          }),
          jsxProd_default(Text, {
            children: " ",
          }),
          jsxProd_default(Text, {
            dimColor: true,
            children: "Management:",
          }),
          jsxProd_default_2(Text, {
            children: [" ", "/plugin list [--enabled|--disabled] - List installed plugins"],
          }),
          jsxProd_default(Text, {
            children: " /plugin manage - Manage installed plugins",
          }),
          lanternPrismEnabled() &&
            jsxProd_default(Text, {
              children: " /plugin stats - Show skill usage and context costs",
            }),
          isPluginDirectoryModeOn()
            ? jsxProd_default_2(Text, {
                children: [" ", "/plugin directory [query] - Search the Anthropic Directory in Discover"],
              })
            : null,
          jsxProd_default(Text, {
            children: " /plugin enable <plugin> - Enable a plugin",
          }),
          jsxProd_default(Text, {
            children: " /plugin disable <plugin> - Disable a plugin",
          }),
          jsxProd_default(Text, {
            children: " /plugin configure <plugin> - Set userConfig options",
          }),
          jsxProd_default(Text, {
            children: " /plugin uninstall <plugin> - Uninstall a plugin",
          }),
          jsxProd_default(Text, {
            children: " ",
          }),
          jsxProd_default(Text, {
            dimColor: true,
            children: "Marketplaces:",
          }),
          jsxProd_default(Text, {
            children: " /plugin marketplace - Marketplace management menu",
          }),
          jsxProd_default(Text, {
            children: " /plugin marketplace add - Add a marketplace",
          }),
          jsxProd_default_2(Text, {
            children: [" ", "/plugin marketplace add <path/url> - Add marketplace directly"],
          }),
          jsxProd_default(Text, {
            children: " /plugin marketplace update - Update marketplaces",
          }),
          jsxProd_default_2(Text, {
            children: [" ", "/plugin marketplace update <name> - Update specific marketplace"],
          }),
          jsxProd_default(Text, {
            children: " /plugin marketplace remove - Remove a marketplace",
          }),
          jsxProd_default_2(Text, {
            children: [" ", "/plugin marketplace remove <name> - Remove specific marketplace"],
          }),
          jsxProd_default(Text, {
            children: " /plugin marketplace list - List all marketplaces",
          }),
          jsxProd_default(Text, {
            children: " ",
          }),
          jsxProd_default(Text, {
            dimColor: true,
            children: "Validation:",
          }),
          jsxProd_default_2(Text, {
            children: [" ", "/plugin validate <path> - Validate a manifest file or directory"],
          }),
          jsxProd_default_2(Text, {
            children: [
              " ",
              "/plugin tag [path] [--push] [--dry-run] [-f] - Create a release tag for the plugin",
            ],
          }),
          jsxProd_default(Text, {
            children: " ",
          }),
          jsxProd_default(Text, {
            dimColor: true,
            children: "Other:",
          }),
          jsxProd_default(Text, {
            children: " /plugin - Main plugin menu",
          }),
          jsxProd_default(Text, {
            children: " /plugin help - Show this help",
          }),
          jsxProd_default(Text, {
            children: " /plugins - Alias for /plugin",
          }),
        ],
      });
      $[52] = t16;
    } else t16 = $[52];
    return t16;
  }
  if (viewState_3.type === "validate") {
    let viewContent;
    if ($[53] !== onComplete || $[54] !== viewState_3.path) {
      viewContent = jsxProd_default(ValidatePlugin, {
        onComplete,
        path: viewState_3.path,
      });
      $[53] = onComplete;
      $[54] = viewState_3.path;
      $[55] = viewContent;
    } else viewContent = $[55];
    return viewContent;
  }
  if (viewState_3.type === "npm-install") {
    let detailBody;
    if ($[56] !== onInstallComplete || $[57] !== onComplete || $[58] !== viewState_3.spec) {
      detailBody = jsxProd_default(PluginInstallRunner, {
        spec: viewState_3.spec,
        onComplete,
        onInstallComplete,
      });
      $[56] = onInstallComplete;
      $[57] = onComplete;
      $[58] = viewState_3.spec;
      $[59] = detailBody;
    } else detailBody = $[59];
    return detailBody;
  }
  if (viewState_3.type === "eval") {
    let menuBody;
    if ($[60] !== onComplete || $[61] !== viewState_3.target) {
      menuBody = jsxProd_default(PluginEvalRunner, {
        onComplete,
        target: viewState_3.target,
      });
      $[60] = onComplete;
      $[61] = viewState_3.target;
      $[62] = menuBody;
    } else menuBody = $[62];
    return menuBody;
  }
  if (viewState_3.type === "tag") {
    let statusBox;
    if (
      $[63] !== onComplete ||
      $[64] !== viewState_3.dryRun ||
      $[65] !== viewState_3.force ||
      $[66] !== viewState_3.path ||
      $[67] !== viewState_3.push ||
      $[68] !== viewState_3.unknownFlag
    ) {
      statusBox = jsxProd_default(PluginTagFlow, {
        onComplete,
        path: viewState_3.path,
        push: viewState_3.push,
        dryRun: viewState_3.dryRun,
        force: viewState_3.force,
        unknownFlag: viewState_3.unknownFlag,
      });
      $[63] = onComplete;
      $[64] = viewState_3.dryRun;
      $[65] = viewState_3.force;
      $[66] = viewState_3.path;
      $[67] = viewState_3.push;
      $[68] = viewState_3.unknownFlag;
      $[69] = statusBox;
    } else statusBox = $[69];
    return statusBox;
  }
  if (viewState_3.type === "marketplace-list") {
    let banner;
    if ($[70] !== onComplete) {
      banner = jsxProd_default(MarketplaceList, {
        onComplete,
      });
      $[70] = onComplete;
      $[71] = banner;
    } else banner = $[71];
    return banner;
  }
  if (viewState_3.type === "plugin-list") {
    let footerRow;
    if ($[72] !== onComplete || $[73] !== viewState_3.filter) {
      footerRow = jsxProd_default(PluginListPrinter, {
        onComplete,
        filter: viewState_3.filter,
      });
      $[72] = onComplete;
      $[73] = viewState_3.filter;
      $[74] = footerRow;
    } else footerRow = $[74];
    return footerRow;
  }
  if (viewState_3.type === "add-marketplace") {
    let t16;
    if (
      $[75] !== autoOpenAdd ||
      $[76] !== cliMode ||
      $[77] !== cursorOffset ||
      $[78] !== error ||
      $[79] !== inputValue ||
      $[80] !== isSearchMode ||
      $[81] !== result ||
      $[82] !== setError ||
      $[83] !== setResult ||
      $[84] !== setViewState ||
      $[85] !== viewState_3.claudeAiListing ||
      $[86] !== viewState_3.confirmAdd
    ) {
      t16 = jsxProd_default(AddMarketplace, {
        inputValue,
        setInputValue,
        cursorOffset,
        setCursorOffset,
        error,
        setError,
        result,
        setResult,
        setViewState,
        onAddComplete: isSearchMode,
        cliMode,
        autoAdd: autoOpenAdd,
        claudeAiListing: viewState_3.claudeAiListing,
        confirmAdd: viewState_3.confirmAdd,
      });
      $[75] = autoOpenAdd;
      $[76] = cliMode;
      $[77] = cursorOffset;
      $[78] = error;
      $[79] = inputValue;
      $[80] = isSearchMode;
      $[81] = result;
      $[82] = setError;
      $[83] = setResult;
      $[84] = setViewState;
      $[85] = viewState_3.claudeAiListing;
      $[86] = viewState_3.confirmAdd;
      $[87] = t16;
    } else t16 = $[87];
    return t16;
  }
  let mainView;
  if (
    $[88] !== activeTab ||
    $[89] !== cloudSession ||
    $[90] !== showMcpRedirectMessage ||
    $[91] !== showSkillDoctorRedirectMessage ||
    $[92] !== showSkillsRedirectMessage
  ) {
    mainView = cloudSession
      ? jsxProd_default(CloudSessionPluginsNotice, {})
      : showMcpRedirectMessage && activeTab === "installed"
        ? jsxProd_default(nullComponent, {})
        : showSkillsRedirectMessage && activeTab === "installed"
          ? jsxProd_default(SkillsMovedNotice, {})
          : showSkillDoctorRedirectMessage && activeTab === "stats"
            ? jsxProd_default(SkillDoctorMovedNotice, {})
            : undefined;
    $[88] = activeTab;
    $[89] = cloudSession;
    $[90] = showMcpRedirectMessage;
    $[91] = showSkillDoctorRedirectMessage;
    $[92] = showSkillsRedirectMessage;
    $[93] = mainView;
  } else mainView = $[93];
  let renderedView = mainView;
  let banner;
  if ($[94] !== setAppState || $[95] !== renderedView) {
    banner =
      setAppState.length > 0
        ? jsxProd_default_2(Fragment, {
            children: [
              jsxProd_default(loadedModsSnapshot, {
                names: setAppState,
              }),
              renderedView,
            ],
          })
        : renderedView;
    $[94] = setAppState;
    $[95] = renderedView;
    $[96] = banner;
  } else banner = $[96];
  let statusFrame;
  if (
    $[97] !== onInstallComplete ||
    $[98] !== getSessionContext ||
    $[99] !== loaded ||
    $[100] !== storeRef ||
    $[101] !== viewState_3.marketplace ||
    $[102] !== viewState_3.searchQuery ||
    $[103] !== viewState_3.targetMarketplace ||
    $[104] !== viewState_3.targetPlugin ||
    $[105] !== viewState_3.type
  ) {
    statusFrame = jsxProd_default(
      Tab,
      {
        id: "discover",
        title: "Discover",
        children:
          viewState_3.type === "browse-marketplace"
            ? jsxProd_default(BrowseMarketplace, {
                screen: storeRef,
                onInstallComplete,
                onSearchModeChange: setChildSearchActive,
                targetMarketplace: viewState_3.targetMarketplace,
                targetPlugin: viewState_3.targetPlugin,
              })
            : jsxProd_default(DiscoverPluginsScreen, {
                screen: storeRef,
                onInstallComplete,
                onSearchModeChange: setChildSearchActive,
                getSessionContext,
                grantedSuggestions: loaded,
                targetPlugin: viewState_3.type === "discover-plugins" ? viewState_3.targetPlugin : undefined,
                initialMarketplace:
                  viewState_3.type === "discover-plugins" ? viewState_3.marketplace : undefined,
                initialSearchQuery:
                  viewState_3.type === "discover-plugins" ? viewState_3.searchQuery : undefined,
              }),
      },
      "discover",
    );
    $[97] = onInstallComplete;
    $[98] = getSessionContext;
    $[99] = loaded;
    $[100] = storeRef;
    $[101] = viewState_3.marketplace;
    $[102] = viewState_3.searchQuery;
    $[103] = viewState_3.targetMarketplace;
    $[104] = viewState_3.targetPlugin;
    $[105] = viewState_3.type;
    $[106] = statusFrame;
  } else statusFrame = $[106];
  const targetPlugin = viewState_3.type === "manage-plugins" ? viewState_3.targetPlugin : undefined;
  const targetMarketplace = viewState_3.type === "manage-plugins" ? viewState_3.targetMarketplace : undefined;
  const action = viewState_3.type === "manage-plugins" ? viewState_3.action : undefined;
  let footerBox;
  if (
    $[107] !== selectedTab ||
    $[108] !== commands ||
    $[109] !== isSearchMode ||
    $[110] !== setResult ||
    $[111] !== setViewState ||
    $[112] !== targetPlugin ||
    $[113] !== targetMarketplace ||
    $[114] !== action
  ) {
    footerBox = jsxProd_default(
      Tab,
      {
        id: "installed",
        title: "Installed",
        children: jsxProd_default(ManagePlugins, {
          setViewState,
          setResult,
          onManageComplete: isSearchMode,
          changesApplyOnClose: selectedTab,
          onSearchModeChange: setChildSearchActive,
          commands,
          targetPlugin,
          targetMarketplace,
          action,
        }),
      },
      "installed",
    );
    $[107] = selectedTab;
    $[108] = commands;
    $[109] = isSearchMode;
    $[110] = setResult;
    $[111] = setViewState;
    $[112] = targetPlugin;
    $[113] = targetMarketplace;
    $[114] = action;
    $[115] = footerBox;
  } else footerBox = $[115];
  const targetMarketplace_2 =
    viewState_3.type === "manage-marketplaces" ? viewState_3.targetMarketplace : undefined;
  const action_2 = viewState_3.type === "manage-marketplaces" ? viewState_3.action : undefined;
  let hintBox;
  if (
    $[116] !== error ||
    $[117] !== exitState ||
    $[118] !== isSearchMode ||
    $[119] !== setViewState_2 ||
    $[120] !== setError ||
    $[121] !== setResult ||
    $[122] !== targetMarketplace_2 ||
    $[123] !== action_2
  ) {
    hintBox = jsxProd_default(
      Tab,
      {
        id: "marketplaces",
        title: "Marketplaces",
        children: jsxProd_default(ManageMarketplaces, {
          setViewState: setViewState_2,
          error,
          setError,
          setResult,
          exitState,
          onManageComplete: isSearchMode,
          targetMarketplace: targetMarketplace_2,
          action: action_2,
        }),
      },
      "marketplaces",
    );
    $[116] = error;
    $[117] = exitState;
    $[118] = isSearchMode;
    $[119] = setViewState_2;
    $[120] = setError;
    $[121] = setResult;
    $[122] = targetMarketplace_2;
    $[123] = action_2;
    $[124] = hintBox;
  } else hintBox = $[124];
  let children;
  if ($[125] !== isSearchMode || $[126] !== setViewState) {
    children = jsxProd_default(ErrorsTabContent, {
      setViewState,
      setActiveTab,
      markPluginsChanged: isSearchMode,
    });
    $[125] = isSearchMode;
    $[126] = setViewState;
    $[127] = children;
  } else children = $[127];
  let frame;
  if ($[128] !== errorsTabTitle || $[129] !== children) {
    frame = jsxProd_default(
      Tab,
      {
        id: "errors",
        title: errorsTabTitle,
        children,
      },
      "errors",
    );
    $[128] = errorsTabTitle;
    $[129] = children;
    $[130] = frame;
  } else frame = $[130];
  let outer;
  if ($[131] !== getReport || $[132] !== setViewState || $[133] !== previousViewState) {
    outer = previousViewState
      ? [
          jsxProd_default(
            Tab,
            {
              id: "stats",
              title: "Stats",
              children: jsxProd_default(SkillDoctorConfirm, {
                getReport,
                onExit: () =>
                  setViewState({
                    type: "menu",
                  }),
              }),
            },
            "stats",
          ),
        ]
      : [];
    $[131] = getReport;
    $[132] = setViewState;
    $[133] = previousViewState;
    $[134] = outer;
  } else outer = $[134];
  let children_2;
  if (
    $[135] !== statusFrame ||
    $[136] !== footerBox ||
    $[137] !== hintBox ||
    $[138] !== frame ||
    $[139] !== outer
  ) {
    children_2 = [statusFrame, footerBox, hintBox, frame, ...outer];
    $[135] = statusFrame;
    $[136] = footerBox;
    $[137] = hintBox;
    $[138] = frame;
    $[139] = outer;
    $[140] = children_2;
  } else children_2 = $[140];
  let resultBox;
  if (
    $[141] !== activeTab ||
    $[142] !== childSearchActive ||
    $[143] !== onTabChange ||
    $[144] !== banner ||
    $[145] !== children_2
  ) {
    resultBox = jsxProd_default(Pane, {
      color: "suggestion",
      children: jsxProd_default(Tabs, {
        title: "Plugins",
        selectedTab: activeTab,
        onTabChange,
        color: "suggestion",
        disableNavigation: childSearchActive,
        banner,
        children: children_2,
      }),
    });
    $[141] = activeTab;
    $[142] = childSearchActive;
    $[143] = onTabChange;
    $[144] = banner;
    $[145] = children_2;
    $[146] = resultBox;
  } else resultBox = $[146];
  return resultBox;
}
//@ chunk-wb51jffc.js:250561-250656 affinity
function firstNonEmpty(...values) {
  let filtered = values.filter((value) => value !== undefined && value !== "");
  return filtered.length > 0
    ? filtered.join(`
`)
    : undefined;
}
//@ chunk-wb51jffc.js:250656-250826 affinity
function isReadOnlyPluginCommand(pluginArgs) {
  switch (pluginArgs.type) {
    case "help":
    case "list":
    case "menu":
    case "usage-error":
      return true;
    case "marketplace":
      return pluginArgs.action === undefined || pluginArgs.action === "list";
    default:
      return false;
  }
}
export {
  initialPluginRefreshState,
  PluginCommand,
  getPluginNameFromError,
  selectPluginCommands,
  isAutoupdateInfoError,
};
