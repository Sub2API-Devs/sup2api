/**
 * commands/plugin/PluginSettings.tsx
 *
 * /plugin 主界面：发现、已安装、市场、错误等标签页的容器与导航
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/commands/plugin/PluginSettings.tsx
 * pieces: chunk-9h8dr0qb.js (3), chunk-e6aww6q8.js (1), chunk-f3qhjfah.js (2), chunk-tyg7f3ek.js (1), chunk-vrb44rx7.js (53)
 * attribution: placement 4, fingerprint 17, affinity 4, sole-consumer 14, file-local 3, layout 17, callgraph-fingerprint 1
 */
import { w } from "../../../vendor/react/compiler-runtime.js";
import { R, init_react_production, P, y } from "../../../vendor/react/cjs/react.production.js";
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
import { count, uniq } from "../../utils/collections.js";
import {
  loadKnownMarketplacesWithDeclared,
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
import { HintText } from "../../components/design-system/HintText.js";
import { ConfigurableShortcutHint } from "../../components/ConfigurableShortcutHint.js";
import { TwoColumnRow } from "../../components/CustomSelect/select.js";
import { Byline } from "../../components/design-system/Byline.js";
import { neutralizeInboundTags } from "../../utils/sessionPeers.js";
import { useSessionOrUndefined } from "../../context/session.js";
import { setPromptValueFor } from "../../state/promptInputStore.js";
import { parseSlashCommand } from "../../utils/slashCommandParsing.js";
import { parsePluginArgs } from "./parseArgs.js";
import { En } from "../../../vendor/lodash-es/_inlinedHelpers.js";
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
import { logError } from "../../utils/log.js";

//@ chunk-vrb44rx7.js:101922-103281 placement
/**
 * y/n 确认运行命令的对话框
 */
function ConfirmCommandDialog(props) {
  let T = w(19);
  let { command, onConfirm, onCancel } = props;
  let x = R(false);
  let D;
  if (T[0] !== onCancel) {
    D = function U() {
      if (x.current) {
        return;
      }
      x.current = true;
      onCancel();
    };
    T[0] = onCancel;
    T[1] = D;
  } else D = T[1];
  let U = D;
  let L;
  if (T[2] !== U || T[3] !== onConfirm) {
    L = function K(event) {
      if (event.ctrl || event.meta) {
        return;
      }
      if (event.key === "y" || event.key === "Y") {
        event.preventDefault();
        if (x.current) {
          return;
        }
        x.current = true;
        onConfirm();
      } else if (event.key === "n" || event.key === "N") {
        event.preventDefault();
        U();
      }
    };
    T[2] = U;
    T[3] = onConfirm;
    T[4] = L;
  } else L = T[4];
  let onKeyDown = L;
  let V;
  if (T[5] !== command) {
    V = stripInvisibleChars(command, " ").trim().split(/\s+/).join(" ");
    T[5] = command;
    T[6] = V;
  } else V = T[6];
  let children = V;
  let _;
  if (T[7] === MEMO_CACHE_SENTINEL) {
    _ = jsxProd_default(Text, {
      bold: true,
      children: "y",
    });
    T[7] = _;
  } else _ = T[7];
  let inputGuide;
  if (T[8] === MEMO_CACHE_SENTINEL) {
    inputGuide = jsxProd_default_2(Text, {
      children: [
        "Press ",
        _,
        " to run or ",
        jsxProd_default(Text, {
          bold: true,
          children: "n",
        }),
        " to cancel",
      ],
    });
    T[8] = inputGuide;
  } else inputGuide = T[8];
  let pe;
  if (T[9] === MEMO_CACHE_SENTINEL) {
    pe = jsxProd_default(Text, {
      children: "This command came from a link:",
    });
    T[9] = pe;
  } else pe = T[9];
  let fe;
  if (T[10] !== children) {
    fe = jsxProd_default_2(Text, {
      children: [
        "  ",
        jsxProd_default(Text, {
          bold: true,
          children,
        }),
      ],
    });
    T[10] = children;
    T[11] = fe;
  } else fe = T[11];
  let me;
  if (T[12] === MEMO_CACHE_SENTINEL) {
    me = jsxProd_default(Box, {
      marginTop: 1,
      children: jsxProd_default(Text, {
        dimColor: true,
        children: "Nothing runs until you answer. Only run commands from links you trust.",
      }),
    });
    T[12] = me;
  } else me = T[12];
  let children_2;
  if (T[13] !== onKeyDown || T[14] !== fe) {
    children_2 = jsxProd_default_2(FocusColumn, {
      onKeyDown,
      children: [pe, fe, me],
    });
    T[13] = onKeyDown;
    T[14] = fe;
    T[15] = children_2;
  } else children_2 = T[15];
  let he;
  if (T[16] !== U || T[17] !== children_2) {
    he = jsxProd_default(Dialog, {
      title: "Run this command?",
      color: "suggestion",
      onCancel: U,
      inputGuide,
      children: children_2,
    });
    T[16] = U;
    T[17] = children_2;
    T[18] = he;
  } else he = T[18];
  return he;
}
//@ chunk-vrb44rx7.js:103281-103285 placement
init_react_production();
//@ chunk-vrb44rx7.js:217501-217505 sole-consumer
init_react_production();
//@ chunk-vrb44rx7.js:217505-217734 sole-consumer
var USER = "user";
var PLUGIN_SETTINGS_ACTION_TEXTS = {
  activated: " Plugin is now active.",
  "needs-config": ` Plugin is now active.${NEEDS_CONFIG_NOTE}`,
  "load-failed": " The plugin couldn't be loaded \u2014 see /plugin for details.",
  "reload-required": " Run /reload-plugins to apply.",
};
//@ chunk-vrb44rx7.js:217734-218060 sole-consumer
/**
 * 挂载时执行一次插件安装（installAndReport），显示"Installing …"进度，完成后把结果文字交给 onComplete。
 */
function PluginInstallRunner({ spec, onComplete, onInstallComplete }) {
  let { storageV5 } = useTheme_2();
  let x = R({
    onComplete,
    onInstallComplete,
  });
  let T = R(false);
  x.current = {
    onComplete,
    onInstallComplete,
  };
  P(() => {
    if (T.current) return;
    T.current = true;
    installPluginAndReport(spec, storageV5, x.current).then((D) =>
      x.current.onComplete(stripInvisibleKeepEmoji(D)),
    );
  }, [spec, storageV5]);
  return jsxProd_default(WorkerBadge, {
    message: stripInvisibleKeepEmoji(`Installing ${spec}\u2026`),
  });
}
//@ chunk-vrb44rx7.js:218060-218336 sole-consumer
async function installPluginAndReport(spec, storageV5, { onInstallComplete }) {
  try {
    let C = await installPluginOp(spec, USER, {}, storageV5);
    if (!C.success) return `${figures_default.cross} ${C.message}`;
    let { pluginId } = C;
    let D =
      PLUGIN_SETTINGS_ACTION_TEXTS[
        onInstallComplete !== undefined && pluginId !== undefined
          ? await onInstallComplete([pluginId])
          : "reload-required"
      ];
    return `${figures_default.tick} ${C.message}.${D}`;
  } catch (error) {
    return `${figures_default.cross} ${errorMessage(error)}`;
  }
}
//@ chunk-vrb44rx7.js:218336-218362 sole-consumer
function nullOnError() {
  return null;
}
//@ chunk-vrb44rx7.js:218362-218406 sole-consumer
function bulletLine(he) {
  return `  \u2022 ${escapedDisplayText(he)}`;
}
//@ chunk-vrb44rx7.js:218406-218447 sole-consumer
function selectPluginErrors(Ke) {
  return Ke.plugins.errors;
}
//@ chunk-vrb44rx7.js:218447-218489 sole-consumer
function selectEnabledPlugins(Et) {
  return Et.plugins.enabled;
}
//@ chunk-vrb44rx7.js:218489-218532 sole-consumer
function selectDisabledPlugins(He) {
  return He.plugins.disabled;
}
//@ chunk-vrb44rx7.js:218532-218565 sole-consumer
function pluginSource(ct) {
  return ct.source;
}
//@ chunk-vrb44rx7.js:218565-218620 sole-consumer
function selectWorkerPluginInventory(D) {
  return D.workerInventory?.plugins ?? null;
}
//@ chunk-vrb44rx7.js:218620-218648 sole-consumer
function escapeDisplayName(U) {
  return stripInvisibleChars_2(U);
}
//@ chunk-vrb44rx7.js:218648-218689 sole-consumer
function selectPluginErrors_2(_n) {
  return _n.plugins.errors;
}
//@ chunk-vrb44rx7.js:218689-218731 sole-consumer
function selectEnabledPlugins_2(jn) {
  return jn.plugins.enabled;
}
//@ chunk-vrb44rx7.js:218731-218774 affinity
function selectDisabledPlugins_2(Ro) {
  return Ro.plugins.disabled;
}
//@ chunk-vrb44rx7.js:218774-218827 fingerprint = _temp3 (1)
function selectInstallationStatus(s_0) {
  return s_0.plugins.installationStatus;
}
//@ chunk-vrb44rx7.js:218827-218871 file-local
function isFailedMarketplace(m) {
  return m.status === "failed";
}
//@ chunk-vrb44rx7.js:218871-218902 file-local
function marketplaceName(m_0) {
  return m_0.name;
}
//@ chunk-vrb44rx7.js:218902-218942 file-local
function decrementNonNegative(prev) {
  return Math.max(0, prev - 1);
}
//@ chunk-vrb44rx7.js:218942-218986 layout
function isOfficialDirUnavailableFailure(m_0) {
  return isPluginDirectoryUnavailableFailure(m_0) && isOfficialMarketplaceName_2(m_0.name);
}
//@ chunk-vrb44rx7.js:218986-219017 layout
function failureName(m_0) {
  return m_0.name;
}
//@ chunk-vrb44rx7.js:219017-219046 layout
function emptySet() {
  return new Set();
}
//@ chunk-vrb44rx7.js:219046-219077 layout
function isRealPluginError(ja) {
  return !isAutoupdateInfoError(ja);
}
//@ chunk-vrb44rx7.js:219077-219223 fingerprint = _temp0 (1)
function countPluginErrors(s) {
  let count_2 = count(s.plugins.errors, isRealPluginError);
  for (const m of s.plugins.installationStatus.marketplaces) {
    if (m.status === "failed") count_2++;
  }
  return count_2;
}
//@ chunk-vrb44rx7.js:219223-220291 fingerprint = MarketplaceList (0.411)
function MarketplaceList(props) {
  let C = w(5);
  let { onComplete } = props;
  let { storageV5 } = useTheme_2();
  let x;
  let T;
  if (C[0] !== onComplete || C[1] !== storageV5) {
    x = () => {
      let loadList = async function loadList() {
        let knownMarketplacesWithDeclared = await loadKnownMarketplacesWithDeclared(storageV5);
        let names = Object.keys(knownMarketplacesWithDeclared);
        let L = await listClaudeAiMarketplaces().catch(nullOnError);
        let { available, hosted } = filterUnaddedClaudeAiMarketplaces(L, knownMarketplacesWithDeclared);
        let browseOnly = L?.browseOnly ?? [];
        if (names.length === 0 && available.length === 0 && hosted.length === 0 && browseOnly.length === 0)
          onComplete("No marketplaces configured");
        else {
          let B =
            names.length > 0
              ? ["Configured marketplaces:", ...names.map(bulletLine)]
              : ["No marketplaces configured"];
          if (available.length > 0 || hosted.length > 0 || browseOnly.length > 0) B.push("From claude.ai:");
          for (const _ of available)
            B.push(
              `  \u2022 ${stripInvisibleKeepEmoji(escapedDisplayText(_.name))} (available from claude.ai${_.scope ? `, ${_.scope}` : ""} \u2014 not added) \xB7 ${stripInvisibleKeepEmoji(formatGitSourceSpec(_.source))}`,
            );
          for (const J of hosted)
            B.push(
              `  \u2022 ${stripInvisibleKeepEmoji(accountMarketplaceLabel(J))} \u2014 hosted on claude.ai, ${formatMarketplaceScopeLabel(J.scope)} \xB7 not added`,
            );
          for (const pe of browseOnly)
            B.push(`  \u2022 ${stripInvisibleKeepEmoji(noCliNameLabel(pe))} (browse on claude.ai)`);
          onComplete(
            B.join(`
`),
          );
        }
      };
      loadList().catch((err) => onComplete(`Error loading marketplaces: ${errorMessage(err)}`));
    };
    T = [onComplete, storageV5];
    C[0] = onComplete;
    C[1] = storageV5;
    C[2] = x;
    C[3] = T;
  } else {
    x = C[2];
    T = C[3];
  }
  P(x, T);
  let ne;
  if (C[4] === MEMO_CACHE_SENTINEL) {
    ne = jsxProd_default(Text, {
      children: "Loading marketplaces...",
    });
    C[4] = ne;
  } else ne = C[4];
  return ne;
}
//@ chunk-vrb44rx7.js:220291-221458 layout
/**
 * 文本模式列出已安装插件（/plugin list）：每个安装范围一行，标记 enabled/disabled/failed to load，需要 /reload-plugins 时附提示；可按 enabled/disabled 过滤。
 */
function PluginListPrinter(props) {
  let D = w(8);
  let { onComplete, filter } = props;
  let appState = useAppState(selectPluginErrors);
  let appState_2 = useAppState(selectEnabledPlugins);
  let appState_3 = useAppState(selectDisabledPlugins);
  let U;
  let L;
  if (
    D[0] !== appState_2 ||
    D[1] !== filter ||
    D[2] !== appState_3 ||
    D[3] !== appState ||
    D[4] !== onComplete
  ) {
    U = () => {
      let installedPlugins = getInstalledPlugins();
      let sorted = Object.keys(installedPlugins.plugins).sort();
      if (sorted.length === 0) {
        onComplete("No plugins installed. Use `/plugin install` to install a plugin.");
        return;
      }
      let pluginEditableScopes = getPluginEditableScopes();
      let B = new Set(appState_2.map(pluginSource));
      let _ = ["Installed plugins:"];
      let J = 0;
      for (const pe of sorted) {
        let fe = firstLineOf(pe, "@");
        let me = pluginEditableScopes.has(pe);
        if (filter !== undefined && (filter === "enabled") !== me) {
          continue;
        }
        let any = appState.some(
          (ne) => !isAutoupdateInfoError(ne) && (ne.source === pe || ("plugin" in ne && ne.plugin === fe)),
        );
        let W = any
          ? `${figures_default.cross} failed to load`
          : me
            ? `${figures_default.tick} enabled`
            : `${figures_default.cross} disabled`;
        let Oe = !any && me !== B.has(pe) ? " \u2014 run /reload-plugins to apply" : "";
        let version = (appState_2.find((rt) => rt.source === pe) ?? appState_3.find((et) => et.source === pe))
          ?.manifest.version;
        for (const ae of installedPlugins.plugins[pe] ?? []) {
          let Se = formatFirstKnownVersion(ae.version, version);
          let kt = Se ? `${escapeXml(printableName(Se, 100))}, ${ae.scope}` : ae.scope;
          _.push(`  \u2022 ${pe} (${kt}) ${W}${Oe}`);
          J++;
        }
      }
      if (J === 0) {
        onComplete(`No ${filter} plugins.`);
        return;
      }
      onComplete(
        _.join(`
`),
      );
    };
    L = [onComplete, appState, appState_2, appState_3, filter];
    D[0] = appState_2;
    D[1] = filter;
    D[2] = appState_3;
    D[3] = appState;
    D[4] = onComplete;
    D[5] = U;
    D[6] = L;
  } else {
    U = D[5];
    L = D[6];
  }
  P(U, L);
  let Tt;
  if (D[7] === MEMO_CACHE_SENTINEL) {
    Tt = jsxProd_default(Text, {
      children: "Loading plugins...",
    });
    D[7] = Tt;
  } else Tt = D[7];
  return Tt;
}
//@ chunk-vrb44rx7.js:221458-221484 layout
function nullComponent() {
  return null;
}
//@ chunk-vrb44rx7.js:221484-221668 layout
function SkillsMovedNotice() {
  let i = w(1);
  let h;
  if (i[0] === MEMO_CACHE_SENTINEL) {
    h = jsxProd_default(Box, {
      marginTop: 1,
      children: jsxProd_default(StatusRow, {
        status: "info",
        children: "Skills are now managed here under the Skills section.",
      }),
    });
    i[0] = h;
  } else h = i[0];
  return h;
}
//@ chunk-vrb44rx7.js:221668-222519 layout
/**
 * 云会话下显示"云会话已加载哪些插件"及"这里的改动影响本机与之后的云会话"的说明。
 */
function CloudSessionPluginsNotice() {
  let h = w(7);
  let appState = useAppState(selectWorkerPluginInventory);
  let children;
  if (h[0] !== appState) {
    children =
      appState === null
        ? "The cloud session hasn't reported which plugins it loaded (it does at the start of each turn)."
        : appState.length === 0
          ? "The cloud session loaded no plugins."
          : `The cloud session loaded: ${appState.map(escapeDisplayName).join(", ")}.`;
    h[0] = appState;
    h[1] = children;
  } else children = h[1];
  let C;
  if (h[2] !== children) {
    C = jsxProd_default(StatusRow, {
      status: "info",
      children,
    });
    h[2] = children;
    h[3] = C;
  } else C = h[3];
  let x;
  if (h[4] === MEMO_CACHE_SENTINEL) {
    x = jsxProd_default(Text, {
      dimColor: true,
      wrap: "wrap-trim",
      children:
        "Changes here update this machine's plugins and future cloud sessions (/cloud-plugins decides whether they are sent), and reach a running cloud session only when this machine next attaches to it (or on your first Yes in /cloud-plugins); /reload-plugins re-reads the running session's own.",
    });
    h[4] = x;
  } else x = h[4];
  let T;
  if (h[5] !== C) {
    T = jsxProd_default_2(Box, {
      marginTop: 1,
      flexDirection: "column",
      children: [C, x],
    });
    h[5] = C;
    h[6] = T;
  } else T = h[6];
  return T;
}
//@ chunk-vrb44rx7.js:222519-222734 layout
function SkillDoctorMovedNotice() {
  let i = w(1);
  let h;
  if (i[0] === MEMO_CACHE_SENTINEL) {
    h = jsxProd_default(Box, {
      marginTop: 1,
      children: jsxProd_default(StatusRow, {
        status: "info",
        children: "/skill-doctor moved \u2014 skill usage and context costs now live in this Stats tab.",
      }),
    });
    i[0] = h;
  } else h = i[0];
  return h;
}
//@ chunk-vrb44rx7.js:222734-223036 fingerprint = getExtraMarketplaceSourceInfo (0.954)
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
    if (removeExtraMarketplace(getSettingsForSourceForUpkeep(source), name))
      editableSources.push({
        source,
        scope,
      });
  let settings = Boolean(removeExtraMarketplace(getSettingsForSource("policySettings"), name));
  return {
    editableSources,
    isInPolicy: settings,
  };
}
//@ chunk-vrb44rx7.js:223036-223111 layout
function hasAutoUpdateSetting(i) {
  return i?.extraKnownMarketplaces?.[OFFICIAL_MARKETPLACE_NAME]?.autoUpdate !== undefined;
}
//@ chunk-vrb44rx7.js:223111-223525 layout
/**
 * 决定删除某个市场时的动作：在 extraKnownMarketplaces 里时删设置项（官方市场可保留已启用插件），只在托管策略里时提示 managed-only，官方市场否则跳转到对应页，其他走常规市场删除。
 */
function planMarketplaceRemoval(name, h, k = false) {
  let { editableSources, isInPolicy } = getExtraMarketplaceSourceInfo(name);
  if (name === OFFICIAL_MARKETPLACE_NAME) {
    let filtered = editableSources.filter(
      ({ source }) =>
        !(source === "userSettings" && hasAutoUpdateSetting(getSettingsForSourceForUpkeep(source))),
    );
    if (k && filtered.length > 0)
      return {
        kind: "remove-extra-marketplace",
        name,
        sources: filtered,
        keepEnabledPlugins: true,
      };
    if (k && isInPolicy)
      return {
        kind: "managed-only",
        name,
      };
    return navigateToOfficialMarketplace(h);
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
//@ chunk-vrb44rx7.js:223525-223659 layout
function joinScopeNames(sources) {
  let mapped = sources.map((k) => k.scope);
  return mapped.length > 1
    ? `${mapped.slice(0, -1).join(", ")}${mapped.length > 2 ? "," : ""} and ${mapped.at(-1)}`
    : (mapped[0] ?? "");
}
//@ chunk-vrb44rx7.js:223659-224942 layout
/**
 * 生成删除市场前的确认文案：删除 extraKnownMarketplaces 设置项，或删除 known_marketplaces.json 条目并卸载其插件；官方市场与拼写相近的官方市场有额外说明。
 */
function describeMarketplaceRemoval(action, marketplaceNames) {
  if (action.kind === "remove-extra-marketplace") {
    let D = quotedPrintable(action.name);
    return action.keepEnabledPlugins
      ? `Remove "${D}" from extraKnownMarketplaces in ${joinScopeNames(action.sources)} settings? The built-in ${OFFICIAL_MARKETPLACE_DISPLAY} and its plugins are not changed.`
      : `Remove "${D}" from extraKnownMarketplaces in ${joinScopeNames(action.sources)} settings? Its plugins are also removed from enabledPlugins there.`;
  }
  let quotedNames = marketplaceNames.map((marketplaceName) => `"${quotedPrintable(marketplaceName)}"`);
  let includesOfficial = marketplaceNames.includes(OFFICIAL_MARKETPLACE_NAME);
  let nonOfficialNames = quotedNames.filter(
    (quotedName, U) => !(includesOfficial && marketplaceNames[U] === OFFICIAL_MARKETPLACE_NAME),
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
//@ chunk-vrb44rx7.js:224942-225083 fingerprint = buildMarketplaceAction (0.604)
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
//@ chunk-vrb44rx7.js:225083-225338 layout
function navigateToOfficialMarketplace(i) {
  if (pluginDirectoryPolicyBlock() !== null && i !== undefined)
    return {
      kind: "navigate",
      tab: "installed",
      viewState: {
        type: "manage-plugins",
        targetPlugin: i,
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
//@ chunk-vrb44rx7.js:225338-225624 fingerprint = buildPluginAction (0.87)
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
//@ chunk-vrb44rx7.js:225624-225690 fingerprint = TRANSIENT_ERROR_TYPES (1)
var TRANSIENT_ERROR_TYPES = new Set(["git-auth-failed", "git-timeout", "network-error"]);
//@ chunk-vrb44rx7.js:225690-225823 fingerprint = _temp7 (1)
function isMarketplaceError(e_1) {
  return (
    e_1.type === "marketplace-not-found" ||
    e_1.type === "marketplace-load-failed" ||
    e_1.type === "marketplace-blocked-by-policy"
  );
}
//@ chunk-vrb44rx7.js:225823-225991 callgraph-fingerprint = _temp6 (0.65)
function isTransientPluginError(e_0) {
  if (TRANSIENT_ERROR_TYPES.has(e_0.type)) return true;
  if (e_0.type === "marketplace-load-failed" && e_0.reason === "cache-miss") return true;
  if (e_0.type === "marketplace-not-found") return true;
  return false;
}
//@ chunk-vrb44rx7.js:225991-226328 layout
/**
 * 从插件错误的 source 解析出插件名与市场：返回规范化 key、显示标签、可编辑范围、是否有名字。
 */
function describePluginErrorTarget(i, h, k) {
  let C = marketplaceOf(i.source);
  let marketplace = "marketplace" in i ? i.marketplace : undefined;
  let T = h ?? (C || marketplaceSuffix(i.source) !== undefined ? splitPluginId(i.source).name : undefined);
  let D = C ?? marketplace ?? marketplaceSuffix(i.source);
  return {
    key: T === undefined ? undefined : nfcLower(D ? `${T}@${D}` : T),
    label: T === undefined ? i.source : D ? `${T} @ ${displayMarketplaceName(D)}` : T,
    scope:
      editableScopeOf(k, i.source) ?? (T !== undefined && C ? editableScopeOf(k, `${T}@${C}`) : undefined),
    named: T !== undefined,
  };
}
//@ chunk-vrb44rx7.js:226328-228408 fingerprint = buildErrorRows (0.788)
function buildErrorRows(
  failedMarketplaces,
  extraMarketplaceErrors,
  pluginLoadingErrors,
  otherErrors,
  brokenInstalledMarketplaces,
  transientErrors,
  pluginWarnings,
  pluginEditableScopes,
  L,
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
    let J = sourceInfo
      ? brokenInstalledMarketplace.name
      : marketplaceDisplayName(brokenInstalledMarketplace.name);
    let pe = false;
    pe = brokenInstalledMarketplace.name === OFFICIAL_MARKETPLACE_NAME && !sourceInfo;
    rows.push({
      label:
        J === brokenInstalledMarketplace.name ? displayMarketplaceName(brokenInstalledMarketplace.name) : J,
      message: brokenInstalledMarketplace.error,
      ...(pe && {
        guidance:
          "Reopen /plugin later to try again. Enter opens it in Marketplaces, where you can update it now or turn it off.",
      }),
      action: pe
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
    let pluginName = describePluginErrorTarget(error, getPluginNameFromError(error), pluginEditableScopes);
    if (pluginName.key !== undefined && shownPluginNames.has(pluginName.key)) continue;
    if (pluginName.key !== undefined) shownPluginNames.add(pluginName.key);
    let pluginName_2 = isAutoupdateInfoError(error);
    rows.push({
      label: pluginName.label,
      message: formatSkillErrorMessage(error),
      guidance: getErrorGuidanceText(error),
      action:
        pluginName.named && !pluginName_2
          ? buildPluginAction(findInstalledEntry(error, L), {
              resolveByUninstall: true,
            })
          : {
              kind: "none",
            },
      isAdvisory: pluginName_2 || undefined,
      scope: pluginName.scope,
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
  for (let B of pluginWarnings) {
    let _ = describePluginErrorTarget(B, "plugin" in B ? B.plugin : undefined, pluginEditableScopes);
    let J = _.key ?? nfcLower(B.source);
    let pe =
      B.type === "mcpb-needs-config"
        ? `${B.type}:${J}:${B.serverName}`
        : "plugin" in B
          ? J
          : `${B.type}:${J}`;
    if (shownPluginNames.has(pe)) continue;
    shownPluginNames.add(pe);
    rows.push({
      label: _.label,
      message: pluginWarningText(B),
      guidance: pluginWarningFixText(B),
      action:
        B.type === "mcpb-needs-config" && _.named
          ? buildPluginAction(findInstalledEntry(B, L), {
              resolveByUninstall: false,
            })
          : {
              kind: "none",
            },
      scope: _.scope,
      isAdvisory: true,
    });
  }
  return rows;
}
//@ chunk-vrb44rx7.js:228408-228803 layout = saveMarketplaceToSettings (0.841)
/**
 * 界面里把多个市场批量写回各自设置源的 extraKnownMarketplaces（可删除）。
 */
function saveMarketplaceToSettings(name, sources, storageV5, C = false) {
  for (let { source } of sources)
    updateSettingsForSourceWithTransform(
      source,
      (T) => {
        if (!T) return null;
        let D = {};
        let existing =
          C && source === "userSettings" && name === OFFICIAL_MARKETPLACE_NAME && hasAutoUpdateSetting(T);
        if (removeExtraMarketplace(T, name) && !existing)
          D.extraKnownMarketplaces = {
            ...T.extraKnownMarketplaces,
            [name]: undefined,
          };
        if (T.enabledPlugins && !C) {
          let L = `@${name}`;
          let A = false;
          let current = {
            ...T.enabledPlugins,
          };
          for (let key in current)
            if (key.endsWith(L)) {
              current[key] = undefined;
              A = true;
            }
          if (A) D.enabledPlugins = current;
        }
        return Object.keys(D).length > 0 ? D : null;
      },
      undefined,
      storageV5,
    );
}
//@ chunk-vrb44rx7.js:228803-235684 fingerprint = ErrorsTabContent (0.612)
function ErrorsTabContent(props) {
  let W = w(59);
  let { setViewState, setActiveTab, markPluginsChanged } = props;
  let { storageV5, credentials } = useTheme_2();
  let errors = useAppState(selectPluginErrors_2);
  let pluginWarnings = usePluginWarnings();
  let installationStatus = useAppState(selectEnabledPlugins_2);
  let appState = useAppState(selectDisabledPlugins_2);
  let installationStatus_2 = useAppState(selectInstallationStatus);
  let setAppState = useSetAppState();
  let activePlugins = useActivePlugins();
  let [selectedIndex, setSelectedIndex] = y(0);
  let [pe, fe] = y(null);
  let [action, ne] = y(null);
  let he = R(false);
  let Oe;
  if (W[0] === MEMO_CACHE_SENTINEL) {
    Oe = [];
    W[0] = Oe;
  } else Oe = W[0];
  let [brokenInstalledMarketplaces, et] = y(Oe);
  let je;
  let ae;
  if (W[1] !== storageV5) {
    je = () => {
      (async () => {
        try {
          let config = await loadKnownMarketplacesWithDeclared(storageV5);
          let { failures } = await loadMarketplacesWithErrors(config, storageV5);
          et(failures);
        } catch {}
      })();
    };
    ae = [storageV5];
    W[1] = storageV5;
    W[2] = je;
    W[3] = ae;
  } else {
    je = W[2];
    ae = W[3];
  }
  P(je, ae);
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
  let errorRows = buildErrorRows(
    failedMarketplaces,
    extraMarketplaceErrors,
    pluginLoadingErrors,
    otherErrors,
    brokenInstalledMarketplaces,
    transientErrors,
    pluginWarnings,
    getPluginEditableScopes(),
    [...installationStatus, ...appState],
  );
  let at;
  if (W[4] !== action || W[5] !== setViewState) {
    at = () => {
      if (action !== null) {
        ne(null);
        return;
      }
      setViewState({
        type: "menu",
      });
    };
    W[4] = action;
    W[5] = setViewState;
    W[6] = at;
  } else at = W[6];
  let Ot;
  if (W[7] === MEMO_CACHE_SENTINEL) {
    Ot = {
      context: "Confirmation",
    };
    W[7] = Ot;
  } else Ot = W[7];
  useKeybinding("confirm:no", at, Ot);
  let an;
  if (W[8] !== credentials || W[9] !== markPluginsChanged || W[10] !== setAppState || W[11] !== storageV5) {
    an = (Yt) => {
      let scopes = joinScopeNames(Yt.sources);
      saveMarketplaceToSettings(Yt.name, Yt.sources, storageV5, Yt.keepEnabledPlugins === true);
      refreshPluginCaches(storageV5, credentials);
      let qe = Yt.keepEnabledPlugins === true;
      setAppState((prev) => ({
        ...prev,
        plugins: {
          ...prev.plugins,
          errors: prev.plugins.errors.filter(
            (e_2) => qe || !("marketplace" in e_2 && e_2.marketplace === Yt.name),
          ),
          installationStatus: {
            ...prev.plugins.installationStatus,
            marketplaces: prev.plugins.installationStatus.marketplaces.filter((m_1) => m_1.name !== Yt.name),
          },
        },
      }));
      fe(
        qe
          ? `${figures_default.tick} Removed "${quotedPrintable(Yt.name)}" from extraKnownMarketplaces in ${scopes} settings. The built-in ${OFFICIAL_MARKETPLACE_DISPLAY} and its plugins are not changed.`
          : `${figures_default.tick} Removed "${quotedPrintable(Yt.name)}" and its enabledPlugins entries from ${scopes} settings`,
      );
      markPluginsChanged();
    };
    W[8] = credentials;
    W[9] = markPluginsChanged;
    W[10] = setAppState;
    W[11] = storageV5;
    W[12] = an;
  } else an = W[12];
  let $t = an;
  let ln;
  if (
    W[13] !== activePlugins ||
    W[14] !== credentials ||
    W[15] !== markPluginsChanged ||
    W[16] !== storageV5
  ) {
    ln = (e_2) => {
      (async () => {
        let Ut = false;
        if (isOfficialMarketplaceSpelling(e_2.name)) {
          if (he.current) {
            return;
          }
          he.current = true;
          Ut = true;
        }
        try {
          let rn = await removeMarketplaceWithReservedSiblings(e_2.name, undefined, storageV5, credentials, {
            onlyIgnoredNameEntries: true,
          });
          let mn = `${figures_default.tick} Removed marketplace "${quotedPrintable(e_2.name)}"`;
          let xn = [e_2.name];
          let Ln = rn.kind !== "plugin-directory-built-in";
          let Mn = [];
          if (rn.kind !== "plugin-directory-built-in") Mn = rn.removedPluginIds;
          if (rn.kind === "ignored-plugin-directory-name-entry-removed") {
            let fn = isPluginDirectoryModeOn();
            let mapped = rn.removedNames.map((m_1) => removedMarketplaceMessage(m_1, fn));
            mn = `${figures_default.tick} ${mapped.join(" ")}`;
            let le = blockedPluginsNotice(rn.disabledPluginIds, rn.disabledReason);
            if (le !== null) mn = `${mn} ${le}`;
            xn = [e_2.name, ...rn.removedNames];
            Ln = rn.removedNames.length > 0;
            if (!Ln) mn = `${figures_default.tick} ${marketplaceEntryGoneText(e_2.name)}`;
          }
          if (Ln)
            logEvent("tengu_marketplace_removed", {
              marketplace_name: marketplaceForTelemetry(e_2.name),
              _PROTO_marketplace_name: e_2.name,
              is_official_marketplace: isOfficialMarketplaceName_3(e_2.name),
            });
          refreshPluginCaches(storageV5, credentials);
          let Te = rn.kind === "ignored-plugin-directory-name-entry-removed";
          et((prev) =>
            prev.filter((dt) => !xn.includes(dt.name) || (Te && !isPluginDirectoryUnavailableFailure(dt))),
          );
          activePlugins.removeErrorsOf(Mn);
          fe(mn);
          markPluginsChanged();
        } catch (error) {
          let Dt = error;
          fe(`Failed to remove "${quotedPrintable(e_2.name)}": ${printableMessage(Dt)}`);
        }
        if (Ut) he.current = false;
      })();
    };
    W[13] = activePlugins;
    W[14] = credentials;
    W[15] = markPluginsChanged;
    W[16] = storageV5;
    W[17] = ln;
  } else ln = W[17];
  let wt = ln;
  let ke = () => {
    let We = errorRows[selectedIndex];
    if (!We) {
      return;
    }
    let { action } = We;
    Ve: switch (action.kind) {
      case "navigate": {
        setActiveTab(action.tab);
        setViewState(action.viewState);
        break Ve;
      }
      case "remove-extra-marketplace": {
        ne(action);
        break Ve;
      }
      case "remove-ignored-name-entries": {
        ne(action);
        break Ve;
      }
      case "managed-only": {
        break Ve;
      }
      case "none":
    }
  };
  let on;
  if (W[18] === MEMO_CACHE_SENTINEL) {
    on = () => setSelectedIndex(decrementNonNegative);
    W[18] = on;
  } else on = W[18];
  const isActive = errorRows.length > 0 && !action;
  let qt;
  if (W[19] !== isActive) {
    qt = {
      context: "Select",
      isActive,
    };
    W[19] = isActive;
    W[20] = qt;
  } else qt = W[20];
  MessageActionsKeybindings(
    {
      "select:previous": on,
      "select:next": () => setSelectedIndex((prev) => Math.min(errorRows.length - 1, prev + 1)),
      "select:accept": ke,
    },
    qt,
  );
  let xt;
  if (W[21] !== brokenInstalledMarketplaces) {
    xt = (_t) =>
      _t.kind === "remove-ignored-name-entries" && isOfficialMarketplaceName_2(_t.name)
        ? uniq([
            _t.name,
            ...brokenInstalledMarketplaces.filter(isOfficialDirUnavailableFailure).map(failureName),
          ])
        : [_t.name];
    W[21] = brokenInstalledMarketplaces;
    W[22] = xt;
  } else xt = W[22];
  let Mt = xt;
  let hn;
  if (W[23] !== action || W[24] !== $t || W[25] !== wt) {
    hn = function sn(prev_2) {
      if (prev_2.ctrl || prev_2.meta || action === null) {
        return;
      }
      if (prev_2.key === "up" || prev_2.key === "down") {
        prev_2.preventDefault();
        return;
      }
      if (prev_2.key === "y" || prev_2.key === "Y") {
        prev_2.preventDefault();
        let Fn = action;
        ne(null);
        if (Fn.kind === "remove-extra-marketplace") $t(Fn);
        else wt(Fn);
      } else if (prev_2.key === "n" || prev_2.key === "N") {
        prev_2.preventDefault();
        ne(null);
      }
    };
    W[23] = action;
    W[24] = $t;
    W[25] = wt;
    W[26] = hn;
  } else hn = W[26];
  let onKeyDown = hn;
  if (errorRows.length === 0 && action !== null) ne(null);
  let clampedIndex = Math.min(selectedIndex, Math.max(0, errorRows.length - 1));
  if (clampedIndex !== selectedIndex) setSelectedIndex(clampedIndex);
  let selectedAction = errorRows[clampedIndex]?.action;
  let An = selectedAction && selectedAction.kind !== "none" && selectedAction.kind !== "managed-only";
  if (errorRows.length === 0) {
    let Bn;
    if (W[27] === MEMO_CACHE_SENTINEL) {
      Bn = jsxProd_default(Box, {
        marginLeft: 1,
        children: jsxProd_default(HintText, {
          children: "No plugin errors",
        }),
      });
      W[27] = Bn;
    } else Bn = W[27];
    let Tn;
    if (W[28] !== pe) {
      Tn =
        pe &&
        jsxProd_default(Box, {
          marginTop: 1,
          marginLeft: 1,
          children: jsxProd_default(Text, {
            color: "claude",
            children: stripInvisibleKeepEmoji(pe),
          }),
        });
      W[28] = pe;
      W[29] = Tn;
    } else Tn = W[29];
    let ze;
    if (W[30] === MEMO_CACHE_SENTINEL) {
      ze = jsxProd_default(Box, {
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
      W[30] = ze;
    } else ze = W[30];
    let At;
    if (W[31] !== Tn) {
      At = jsxProd_default_2(Box, {
        flexDirection: "column",
        children: [Bn, Tn, ze],
      });
      W[31] = Tn;
      W[32] = At;
    } else At = W[32];
    return At;
  }
  const de = Box;
  const flexDirection = "column";
  const gap = 1;
  let ze;
  if (W[33] !== clampedIndex || W[34] !== action) {
    ze = (row, idx) => {
      let mt = idx === clampedIndex;
      let en = row.isAdvisory ? "warning" : "error";
      let Pt = mt
        ? figures_default.pointer
        : row.isAdvisory
          ? figures_default.triangleUpOutline
          : figures_default.cross;
      return jsxProd_default_2(
        TwoColumnRow,
        {
          active: mt && !action,
          marginLeft: 1,
          flexDirection: "column",
          children: [
            jsxProd_default_2(Text, {
              children: [
                jsxProd_default_2(Text, {
                  "aria-hidden": mt,
                  color: mt ? "suggestion" : en,
                  children: [Pt, " "],
                }),
                jsxProd_default(Text, {
                  bold: mt,
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
                color: en,
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
    W[33] = clampedIndex;
    W[34] = action;
    W[35] = ze;
  } else ze = W[35];
  const mapped = errorRows.map(ze);
  let kn;
  if (W[36] !== onKeyDown || W[37] !== action || W[38] !== Mt) {
    kn =
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
              describeMarketplaceRemoval(action, Mt(action)),
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
              Mt(action).length > 1 ? "them" : "it",
              ".",
            ],
          }),
        }),
      });
    W[36] = onKeyDown;
    W[37] = action;
    W[38] = Mt;
    W[39] = kn;
  } else kn = W[39];
  let bn;
  if (W[40] !== pe) {
    bn =
      pe &&
      jsxProd_default(Box, {
        marginLeft: 1,
        children: jsxProd_default(Text, {
          color: "claude",
          children: stripInvisibleKeepEmoji(pe),
        }),
      });
    W[40] = pe;
    W[41] = bn;
  } else bn = W[41];
  let Hn;
  if (W[42] !== action) {
    Hn =
      !action &&
      jsxProd_default(ConfigurableShortcutHint, {
        action: "select:previous",
        context: "Select",
        fallback: "\u2191",
        description: "navigate",
      });
    W[42] = action;
    W[43] = Hn;
  } else Hn = W[43];
  let wn;
  if (W[44] !== An || W[45] !== action) {
    wn =
      An &&
      !action &&
      jsxProd_default(ConfigurableShortcutHint, {
        action: "select:accept",
        context: "Select",
        fallback: "Enter",
        description: "resolve",
      });
    W[44] = An;
    W[45] = action;
    W[46] = wn;
  } else wn = W[46];
  const description = action ? (Mt(action).length > 1 ? "keep them" : "keep it") : "go back";
  let po;
  if (W[47] !== description) {
    po = jsxProd_default(ConfigurableShortcutHint, {
      action: "confirm:no",
      context: "Confirmation",
      fallback: "Esc",
      description,
    });
    W[47] = description;
    W[48] = po;
  } else po = W[48];
  let ao;
  if (W[49] !== Hn || W[50] !== wn || W[51] !== po) {
    ao = jsxProd_default(Box, {
      children: jsxProd_default(Text, {
        dimColor: true,
        italic: true,
        children: jsxProd_default_2(Byline, {
          children: [Hn, wn, po],
        }),
      }),
    });
    W[49] = Hn;
    W[50] = wn;
    W[51] = po;
    W[52] = ao;
  } else ao = W[52];
  let Yn;
  if (W[53] !== de || W[54] !== mapped || W[55] !== kn || W[56] !== bn || W[57] !== ao) {
    Yn = jsxProd_default_2(de, {
      flexDirection,
      gap,
      children: [mapped, kn, bn, ao],
    });
    W[53] = de;
    W[54] = mapped;
    W[55] = kn;
    W[56] = bn;
    W[57] = ao;
    W[58] = Yn;
  } else Yn = W[58];
  return Yn;
}
//@ chunk-vrb44rx7.js:235684-237549 fingerprint = getInitialViewState (0.746)
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
//@ chunk-vrb44rx7.js:237549-237717 fingerprint = getInitialTab (0.909)
function getInitialTab(viewState) {
  if (viewState.type === "manage-plugins") return "installed";
  if (viewState.type === "stats") return "stats";
  if (viewState.type === "manage-marketplaces") return "marketplaces";
  return "discover";
}
//@ chunk-vrb44rx7.js:237717-239211 layout
/**
 * PluginCommand：/plugin 的根组件（解析参数后渲染 PluginSettings）。
 */
function PluginCommand(props) {
  let k = w(21);
  let { onComplete } = props;
  let C;
  if (k[0] !== onComplete) {
    C = (...x) => {
      let T = x;
      if (typeof T[0] === "string") T[0] = neutralizeInboundTags(T[0]);
      onComplete(...T);
    };
    k[0] = onComplete;
    k[1] = C;
  } else C = k[1];
  let D = C;
  let sessionOrUndefined = useSessionOrUndefined();
  let x;
  if (k[2] !== props.args || k[3] !== sessionOrUndefined) {
    x = () => {
      let L = sessionOrUndefined ? setPromptValueFor(sessionOrUndefined) : null;
      if (L === null) {
        return null;
      }
      let args = parseSlashCommand(L)?.args;
      let pluginArgs = parsePluginArgs(props.args);
      if (args === undefined || !En(parsePluginArgs(args), pluginArgs)) {
        return null;
      }
      let installLinkOff =
        pluginArgs.type === "install-from-source" &&
        !getFeatureValue_CACHED_MAY_BE_STALE("tengu_amber_tollgate", false);
      return {
        command: L,
        held: !isReadOnlyPluginCommand(pluginArgs),
        installLinkOff,
      };
    };
    k[2] = props.args;
    k[3] = sessionOrUndefined;
    k[4] = x;
  } else x = k[4];
  let [B] = y(x);
  let [_, J] = y(false);
  let pe = B?.installLinkOff
    ? "Plugin install links are turned off. To install, type /plugin install yourself."
    : B?.held === true && !/^[\x20-\x7e]*$/.test(B.command)
      ? "The command from the link has characters that can't be shown faithfully, so it didn't run. To run it, type it yourself."
      : null;
  let fe;
  let me;
  if (k[5] !== D || k[6] !== pe) {
    fe = () => {
      if (pe !== null) D(pe);
    };
    me = [pe, D];
    k[5] = D;
    k[6] = pe;
    k[7] = fe;
    k[8] = me;
  } else {
    fe = k[7];
    me = k[8];
  }
  P(fe, me);
  if (pe !== null) {
    return null;
  }
  if (B?.held && !_) {
    let onConfirm;
    if (k[9] === MEMO_CACHE_SENTINEL) {
      onConfirm = () => J(true);
      k[9] = onConfirm;
    } else onConfirm = k[9];
    let onCancel;
    if (k[10] !== D) {
      onCancel = () => D("Cancelled. The command from the link didn't run.");
      k[10] = D;
      k[11] = onCancel;
    } else onCancel = k[11];
    let W;
    if (k[12] !== B.command || k[13] !== onCancel) {
      W = jsxProd_default(ConfirmCommandDialog, {
        command: B.command,
        onConfirm,
        onCancel,
      });
      k[12] = B.command;
      k[13] = onCancel;
      k[14] = W;
    } else W = k[14];
    return W;
  }
  let props_2;
  if (k[15] !== D || k[16] !== props) {
    props_2 = {
      ...props,
      onComplete: D,
    };
    k[15] = D;
    k[16] = props;
    k[17] = props_2;
  } else props_2 = k[17];
  const fromLinkPrefill = B !== null;
  let W;
  if (k[18] !== props_2 || k[19] !== fromLinkPrefill) {
    W = jsxProd_default(PluginSettings, {
      props: props_2,
      fromLinkPrefill,
    });
    k[18] = props_2;
    k[19] = fromLinkPrefill;
    k[20] = W;
  } else W = k[20];
  return W;
}
//@ chunk-vrb44rx7.js:239211-250512 fingerprint = PluginSettings (0.63)
function PluginSettings(props) {
  let _ = w(147);
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
  let pe;
  if (_[0] !== args || _[1] !== fromLinkPrefill) {
    parsedCommand = parsePluginArgs(args);
    pe = getInitialViewState(parsedCommand, fromLinkPrefill);
    _[0] = args;
    _[1] = fromLinkPrefill;
    _[2] = parsedCommand;
    _[3] = pe;
  } else {
    parsedCommand = _[2];
    pe = _[3];
  }
  let viewState = pe;
  let me;
  if (_[4] !== viewState || _[5] !== parsedCommand.message || _[6] !== parsedCommand.type) {
    me = () => {
      let ne = new PluginDetailsStore(viewState);
      if (parsedCommand.type === "usage-error") ne.setResult(parsedCommand.message);
      return ne;
    };
    _[4] = viewState;
    _[5] = parsedCommand.message;
    _[6] = parsedCommand.type;
    _[7] = me;
  } else me = _[7];
  let [he] = y(me);
  let { viewState: viewState_2, result: Oe, error } = useStoreSelector(he);
  let { setViewState, setResult, setError } = he;
  let [Se] = y(emptySet);
  let kt = R(null);
  let Tt;
  if (_[8] !== getSkillStatsInputs) {
    Tt = () => {
      if (kt.current === null) {
        if (!getSkillStatsInputs) {
          throw Error("Stats tab rendered without getSkillStatsInputs");
        }
        kt.current = logSkillDoctor(getSkillStatsInputs());
      }
      return kt.current;
    };
    _[8] = getSkillStatsInputs;
    _[9] = Tt;
  } else Tt = _[9];
  let getReport = Tt;
  let Et;
  if (_[10] !== viewState) {
    Et = getInitialTab(viewState);
    _[10] = viewState;
    _[11] = Et;
  } else Et = _[11];
  let [activeTab, setActiveTab] = y(Et);
  let [inputValue, setInputValue] = y(
    viewState_2.type === "add-marketplace" ? viewState_2.initialValue || "" : "",
  );
  let [cursorOffset, setCursorOffset] = y(0);
  let [Ot, an] = y(
    viewState.type === "add-marketplace" && !!viewState.initialValue && viewState.confirmAdd === undefined,
  );
  let Yt;
  if (_[12] !== setViewState) {
    Yt = (_e) => {
      if (_e.type === "add-marketplace") {
        let initialValue = _e.initialValue ?? "";
        setInputValue(initialValue);
        setCursorOffset(initialValue.length);
        an(false);
      }
      setViewState(_e);
    };
    _[12] = setViewState;
    _[13] = Yt;
  } else Yt = _[13];
  let setViewState_2 = Yt;
  let [childSearchActive, setChildSearchActive] = y(false);
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
  let xn;
  if (_[14] !== getSkillStatsInputs) {
    xn = getSkillStatsInputs !== undefined && lanternPrismEnabled();
    _[14] = getSkillStatsInputs;
    _[15] = xn;
  } else xn = _[15];
  let Ln = xn;
  let Mn = R(false);
  let fn;
  if (_[16] !== activePlugins) {
    fn = () => {
      Mn.current = true;
      activePlugins.markNeedsRefresh();
    };
    _[16] = activePlugins;
    _[17] = fn;
  } else fn = _[17];
  let Be = fn;
  let jt;
  if (_[18] !== getReloadCacheImpactOptions) {
    jt = getReloadCacheImpactOptions !== undefined && isPluginMenuCloseReloadEnabled();
    _[18] = getReloadCacheImpactOptions;
    _[19] = jt;
  } else jt = _[19];
  let le = jt;
  let Te = R(false);
  let Ue;
  if (_[20] !== activePlugins || _[21] !== le || _[22] !== onComplete) {
    Ue = (tabId) => {
      if (Te.current) {
        return;
      }
      Te.current = true;
      let Dt = le && Mn.current ? schedulePluginMenuReload(activePlugins) : "none";
      if (Dt === "none") {
        onComplete(tabId);
        return;
      }
      onComplete(Dt === "deferred" ? firstNonEmpty(tabId, PLUGIN_CHANGES_DEFERRED_NOTICE) : tabId, {
        nextInput: "/reload-plugins",
        submitNextInput: true,
      });
    };
    _[20] = activePlugins;
    _[21] = le;
    _[22] = onComplete;
    _[23] = Ue;
  } else Ue = _[23];
  let wt = Ue;
  let exitState = useGlobalExitKeybindings(wt);
  let Ce;
  if (
    _[24] !== activePlugins ||
    _[25] !== getReloadCacheImpactOptions ||
    _[26] !== Be ||
    _[27] !== mcpConnections ||
    _[28] !== storageV5
  ) {
    Ce = async (Ve) => {
      if (!getReloadCacheImpactOptions) {
        Be();
        return "reload-required";
      }
      Mn.current = true;
      return activatePluginsAfterInstall(
        () => ({
          ...getReloadCacheImpactOptions(),
          mcpClients: mcpConnections.get().clients,
          storageV5,
        }),
        activePlugins,
        Ve,
        storageV5,
      );
    };
    _[24] = activePlugins;
    _[25] = getReloadCacheImpactOptions;
    _[26] = Be;
    _[27] = mcpConnections;
    _[28] = storageV5;
    _[29] = Ce;
  } else Ce = _[29];
  let onInstallComplete = Ce;
  let ht;
  if (_[30] !== he) {
    ht = (tabId) => {
      let tab = tabId;
      xt: switch ((setActiveTab(tab), he.setError(null), tab)) {
        case "discover": {
          he.setViewState({
            type: "discover-plugins",
          });
          break xt;
        }
        case "installed": {
          he.setViewState({
            type: "manage-plugins",
          });
          break xt;
        }
        case "marketplaces": {
          he.setViewState({
            type: "manage-marketplaces",
          });
          break xt;
        }
        case "errors": {
          break xt;
        }
        case "stats":
      }
    };
    _[30] = he;
    _[31] = ht;
  } else ht = _[31];
  let onTabChange = ht;
  let t5;
  let t6;
  if (_[32] !== wt || _[33] !== Oe || _[34] !== viewState_2.type) {
    t5 = () => {
      if (viewState_2.type === "menu" && !Oe) wt();
    };
    t6 = [viewState_2.type, Oe, wt];
    _[32] = wt;
    _[33] = Oe;
    _[34] = viewState_2.type;
    _[35] = t5;
    _[36] = t6;
  } else {
    t5 = _[35];
    t6 = _[36];
  }
  P(t5, t6);
  let typeRef = R(viewState_2.type);
  let Fn;
  let sn;
  if (_[37] !== viewState_2.type) {
    Fn = () => {
      if (viewState_2.type === typeRef.current) {
        return;
      }
      typeRef.current = viewState_2.type;
      let Rn = {
        "browse-marketplace": "discover",
        "manage-plugins": "installed",
        "manage-marketplaces": "marketplaces",
      }[viewState_2.type];
      if (Rn) setActiveTab(Rn);
    };
    sn = [viewState_2.type];
    _[37] = viewState_2.type;
    _[38] = Fn;
    _[39] = sn;
  } else {
    Fn = _[38];
    sn = _[39];
  }
  P(Fn, sn);
  let t9;
  if (_[40] !== he) {
    t9 = () => {
      setActiveTab("marketplaces");
      he.setViewState({
        type: "manage-marketplaces",
      });
      setInputValue("");
      he.setError(null);
    };
    _[40] = he;
    _[41] = t9;
  } else t9 = _[41];
  let handleAddMarketplaceEscape = t9;
  const isActive = viewState_2.type === "add-marketplace" && viewState_2.confirmAdd === undefined;
  let t11;
  if (_[42] !== isActive) {
    t11 = {
      context: "Settings",
      isActive,
    };
    _[42] = isActive;
    _[43] = t11;
  } else t11 = _[43];
  useKeybinding("confirm:no", handleAddMarketplaceEscape, t11);
  let t12;
  let t13;
  if (_[44] !== wt || _[45] !== Oe) {
    t12 = () => {
      if (Oe) wt(Oe);
    };
    t13 = [Oe, wt];
    _[44] = wt;
    _[45] = Oe;
    _[46] = t12;
    _[47] = t13;
  } else {
    t12 = _[46];
    t13 = _[47];
  }
  P(t12, t13);
  let t14;
  let t15;
  if (_[48] !== onComplete || _[49] !== viewState_2.type) {
    t14 = () => {
      if (viewState_2.type === "help") onComplete();
    };
    t15 = [viewState_2.type, onComplete];
    _[48] = onComplete;
    _[49] = viewState_2.type;
    _[50] = t14;
    _[51] = t15;
  } else {
    t14 = _[50];
    t15 = _[51];
  }
  P(t14, t15);
  if (viewState_2.type === "help") {
    let t16;
    if (_[52] === MEMO_CACHE_SENTINEL) {
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
      _[52] = t16;
    } else t16 = _[52];
    return t16;
  }
  if (viewState_2.type === "validate") {
    let Ne;
    if (_[53] !== onComplete || _[54] !== viewState_2.path) {
      Ne = jsxProd_default(ValidatePlugin, {
        onComplete,
        path: viewState_2.path,
      });
      _[53] = onComplete;
      _[54] = viewState_2.path;
      _[55] = Ne;
    } else Ne = _[55];
    return Ne;
  }
  if (viewState_2.type === "npm-install") {
    let Ne;
    if (_[56] !== onInstallComplete || _[57] !== onComplete || _[58] !== viewState_2.spec) {
      Ne = jsxProd_default(PluginInstallRunner, {
        spec: viewState_2.spec,
        onComplete,
        onInstallComplete,
      });
      _[56] = onInstallComplete;
      _[57] = onComplete;
      _[58] = viewState_2.spec;
      _[59] = Ne;
    } else Ne = _[59];
    return Ne;
  }
  if (viewState_2.type === "eval") {
    let Ne;
    if (_[60] !== onComplete || _[61] !== viewState_2.target) {
      Ne = jsxProd_default(PluginEvalRunner, {
        onComplete,
        target: viewState_2.target,
      });
      _[60] = onComplete;
      _[61] = viewState_2.target;
      _[62] = Ne;
    } else Ne = _[62];
    return Ne;
  }
  if (viewState_2.type === "tag") {
    let Ne;
    if (
      _[63] !== onComplete ||
      _[64] !== viewState_2.dryRun ||
      _[65] !== viewState_2.force ||
      _[66] !== viewState_2.path ||
      _[67] !== viewState_2.push ||
      _[68] !== viewState_2.unknownFlag
    ) {
      Ne = jsxProd_default(PluginTagFlow, {
        onComplete,
        path: viewState_2.path,
        push: viewState_2.push,
        dryRun: viewState_2.dryRun,
        force: viewState_2.force,
        unknownFlag: viewState_2.unknownFlag,
      });
      _[63] = onComplete;
      _[64] = viewState_2.dryRun;
      _[65] = viewState_2.force;
      _[66] = viewState_2.path;
      _[67] = viewState_2.push;
      _[68] = viewState_2.unknownFlag;
      _[69] = Ne;
    } else Ne = _[69];
    return Ne;
  }
  if (viewState_2.type === "marketplace-list") {
    let Ne;
    if (_[70] !== onComplete) {
      Ne = jsxProd_default(MarketplaceList, {
        onComplete,
      });
      _[70] = onComplete;
      _[71] = Ne;
    } else Ne = _[71];
    return Ne;
  }
  if (viewState_2.type === "plugin-list") {
    let Ne;
    if (_[72] !== onComplete || _[73] !== viewState_2.filter) {
      Ne = jsxProd_default(PluginListPrinter, {
        onComplete,
        filter: viewState_2.filter,
      });
      _[72] = onComplete;
      _[73] = viewState_2.filter;
      _[74] = Ne;
    } else Ne = _[74];
    return Ne;
  }
  if (viewState_2.type === "add-marketplace") {
    let t16;
    if (
      _[75] !== Ot ||
      _[76] !== cliMode ||
      _[77] !== cursorOffset ||
      _[78] !== error ||
      _[79] !== inputValue ||
      _[80] !== Be ||
      _[81] !== Oe ||
      _[82] !== setError ||
      _[83] !== setResult ||
      _[84] !== setViewState ||
      _[85] !== viewState_2.claudeAiListing ||
      _[86] !== viewState_2.confirmAdd
    ) {
      t16 = jsxProd_default(AddMarketplace, {
        inputValue,
        setInputValue,
        cursorOffset,
        setCursorOffset,
        error,
        setError,
        result: Oe,
        setResult,
        setViewState,
        onAddComplete: Be,
        cliMode,
        autoAdd: Ot,
        claudeAiListing: viewState_2.claudeAiListing,
        confirmAdd: viewState_2.confirmAdd,
      });
      _[75] = Ot;
      _[76] = cliMode;
      _[77] = cursorOffset;
      _[78] = error;
      _[79] = inputValue;
      _[80] = Be;
      _[81] = Oe;
      _[82] = setError;
      _[83] = setResult;
      _[84] = setViewState;
      _[85] = viewState_2.claudeAiListing;
      _[86] = viewState_2.confirmAdd;
      _[87] = t16;
    } else t16 = _[87];
    return t16;
  }
  let Ne;
  if (
    _[88] !== activeTab ||
    _[89] !== cloudSession ||
    _[90] !== showMcpRedirectMessage ||
    _[91] !== showSkillDoctorRedirectMessage ||
    _[92] !== showSkillsRedirectMessage
  ) {
    Ne = cloudSession
      ? jsxProd_default(CloudSessionPluginsNotice, {})
      : showMcpRedirectMessage && activeTab === "installed"
        ? jsxProd_default(nullComponent, {})
        : showSkillsRedirectMessage && activeTab === "installed"
          ? jsxProd_default(SkillsMovedNotice, {})
          : showSkillDoctorRedirectMessage && activeTab === "stats"
            ? jsxProd_default(SkillDoctorMovedNotice, {})
            : undefined;
    _[88] = activeTab;
    _[89] = cloudSession;
    _[90] = showMcpRedirectMessage;
    _[91] = showSkillDoctorRedirectMessage;
    _[92] = showSkillsRedirectMessage;
    _[93] = Ne;
  } else Ne = _[93];
  let mt = Ne;
  let banner;
  if (_[94] !== setAppState || _[95] !== mt) {
    banner =
      setAppState.length > 0
        ? jsxProd_default_2(Fragment, {
            children: [
              jsxProd_default(loadedModsSnapshot, {
                names: setAppState,
              }),
              mt,
            ],
          })
        : mt;
    _[94] = setAppState;
    _[95] = mt;
    _[96] = banner;
  } else banner = _[96];
  let Pt;
  if (
    _[97] !== onInstallComplete ||
    _[98] !== getSessionContext ||
    _[99] !== Se ||
    _[100] !== he ||
    _[101] !== viewState_2.marketplace ||
    _[102] !== viewState_2.searchQuery ||
    _[103] !== viewState_2.targetMarketplace ||
    _[104] !== viewState_2.targetPlugin ||
    _[105] !== viewState_2.type
  ) {
    Pt = jsxProd_default(
      Tab,
      {
        id: "discover",
        title: "Discover",
        children:
          viewState_2.type === "browse-marketplace"
            ? jsxProd_default(BrowseMarketplace, {
                screen: he,
                onInstallComplete,
                onSearchModeChange: setChildSearchActive,
                targetMarketplace: viewState_2.targetMarketplace,
                targetPlugin: viewState_2.targetPlugin,
              })
            : jsxProd_default(DiscoverPluginsScreen, {
                screen: he,
                onInstallComplete,
                onSearchModeChange: setChildSearchActive,
                getSessionContext,
                grantedSuggestions: Se,
                targetPlugin: viewState_2.type === "discover-plugins" ? viewState_2.targetPlugin : undefined,
                initialMarketplace:
                  viewState_2.type === "discover-plugins" ? viewState_2.marketplace : undefined,
                initialSearchQuery:
                  viewState_2.type === "discover-plugins" ? viewState_2.searchQuery : undefined,
              }),
      },
      "discover",
    );
    _[97] = onInstallComplete;
    _[98] = getSessionContext;
    _[99] = Se;
    _[100] = he;
    _[101] = viewState_2.marketplace;
    _[102] = viewState_2.searchQuery;
    _[103] = viewState_2.targetMarketplace;
    _[104] = viewState_2.targetPlugin;
    _[105] = viewState_2.type;
    _[106] = Pt;
  } else Pt = _[106];
  const targetPlugin = viewState_2.type === "manage-plugins" ? viewState_2.targetPlugin : undefined;
  const targetMarketplace = viewState_2.type === "manage-plugins" ? viewState_2.targetMarketplace : undefined;
  const action = viewState_2.type === "manage-plugins" ? viewState_2.action : undefined;
  let wn;
  if (
    _[107] !== le ||
    _[108] !== commands ||
    _[109] !== Be ||
    _[110] !== setResult ||
    _[111] !== setViewState ||
    _[112] !== targetPlugin ||
    _[113] !== targetMarketplace ||
    _[114] !== action
  ) {
    wn = jsxProd_default(
      Tab,
      {
        id: "installed",
        title: "Installed",
        children: jsxProd_default(ManagePlugins, {
          setViewState,
          setResult,
          onManageComplete: Be,
          changesApplyOnClose: le,
          onSearchModeChange: setChildSearchActive,
          commands,
          targetPlugin,
          targetMarketplace,
          action,
        }),
      },
      "installed",
    );
    _[107] = le;
    _[108] = commands;
    _[109] = Be;
    _[110] = setResult;
    _[111] = setViewState;
    _[112] = targetPlugin;
    _[113] = targetMarketplace;
    _[114] = action;
    _[115] = wn;
  } else wn = _[115];
  const targetMarketplace_2 =
    viewState_2.type === "manage-marketplaces" ? viewState_2.targetMarketplace : undefined;
  const action_2 = viewState_2.type === "manage-marketplaces" ? viewState_2.action : undefined;
  let ao;
  if (
    _[116] !== error ||
    _[117] !== exitState ||
    _[118] !== Be ||
    _[119] !== setViewState_2 ||
    _[120] !== setError ||
    _[121] !== setResult ||
    _[122] !== targetMarketplace_2 ||
    _[123] !== action_2
  ) {
    ao = jsxProd_default(
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
          onManageComplete: Be,
          targetMarketplace: targetMarketplace_2,
          action: action_2,
        }),
      },
      "marketplaces",
    );
    _[116] = error;
    _[117] = exitState;
    _[118] = Be;
    _[119] = setViewState_2;
    _[120] = setError;
    _[121] = setResult;
    _[122] = targetMarketplace_2;
    _[123] = action_2;
    _[124] = ao;
  } else ao = _[124];
  let children;
  if (_[125] !== Be || _[126] !== setViewState) {
    children = jsxProd_default(ErrorsTabContent, {
      setViewState,
      setActiveTab,
      markPluginsChanged: Be,
    });
    _[125] = Be;
    _[126] = setViewState;
    _[127] = children;
  } else children = _[127];
  let _n;
  if (_[128] !== errorsTabTitle || _[129] !== children) {
    _n = jsxProd_default(
      Tab,
      {
        id: "errors",
        title: errorsTabTitle,
        children,
      },
      "errors",
    );
    _[128] = errorsTabTitle;
    _[129] = children;
    _[130] = _n;
  } else _n = _[130];
  let jn;
  if (_[131] !== getReport || _[132] !== setViewState || _[133] !== Ln) {
    jn = Ln
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
    _[131] = getReport;
    _[132] = setViewState;
    _[133] = Ln;
    _[134] = jn;
  } else jn = _[134];
  let children_2;
  if (_[135] !== Pt || _[136] !== wn || _[137] !== ao || _[138] !== _n || _[139] !== jn) {
    children_2 = [Pt, wn, ao, _n, ...jn];
    _[135] = Pt;
    _[136] = wn;
    _[137] = ao;
    _[138] = _n;
    _[139] = jn;
    _[140] = children_2;
  } else children_2 = _[140];
  let Si;
  if (
    _[141] !== activeTab ||
    _[142] !== childSearchActive ||
    _[143] !== onTabChange ||
    _[144] !== banner ||
    _[145] !== children_2
  ) {
    Si = jsxProd_default(Pane, {
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
    _[141] = activeTab;
    _[142] = childSearchActive;
    _[143] = onTabChange;
    _[144] = banner;
    _[145] = children_2;
    _[146] = Si;
  } else Si = _[146];
  return Si;
}
//@ chunk-vrb44rx7.js:250512-250607 affinity
function firstNonEmpty(...i) {
  let filtered = i.filter((k) => k !== undefined && k !== "");
  return filtered.length > 0
    ? filtered.join(`
`)
    : undefined;
}
//@ chunk-vrb44rx7.js:250607-250777 affinity
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
//@ chunk-9h8dr0qb.js:42590-42594 placement
init_react_production();
//@ chunk-9h8dr0qb.js:42594-42598 placement
init_react_production();
//@ chunk-9h8dr0qb.js:42598-42639 fingerprint = _temp2 (0.665)
function selectPluginCommands(s) {
  return s.plugins.commands;
}
//@ chunk-f3qhjfah.js:13962-14141 fingerprint = getPluginNameFromError (0.923)
function getPluginNameFromError(error) {
  if ("pluginId" in error && error.pluginId) return error.pluginId;
  if ("plugin" in error && error.plugin) return error.plugin;
  let index = error.source.lastIndexOf("@");
  if (index > 0) return error.source.slice(0, index);
  return;
}
//@ chunk-f3qhjfah.js:14141-14250 affinity
/**
 * 判断插件错误是否只是自动更新的提示类（延后条目辅助或被策略关闭），不算真正的加载失败。
 */
function isAutoupdateInfoError(e) {
  return e.type === "autoupdate-deferred-entry-helper" || e.type === "autoupdate-disabled-by-policy";
}
//@ chunk-e6aww6q8.js:4236630-4236730 fingerprint = removeExtraMarketplace (0.702)
function removeExtraMarketplace(name, sources) {
  let extraKnownMarketplaces = name?.extraKnownMarketplaces;
  return extraKnownMarketplaces !== undefined && Object.hasOwn(extraKnownMarketplaces, sources)
    ? extraKnownMarketplaces[sources]
    : undefined;
}
//@ chunk-tyg7f3ek.js:624262-624353 fingerprint = _temp1 (0.765)
function initialPluginRefreshState(prev) {
  let n = {
    needsRefresh: false,
  };
  prev()
    .then((needsRefresh) => {
      n.needsRefresh = needsRefresh;
    })
    .catch(logError);
  return n;
}
export {
  initialPluginRefreshState,
  isAutoupdateInfoError,
  selectPluginCommands,
  getPluginNameFromError,
  removeExtraMarketplace,
  PluginCommand,
};
