/**
 * commands/plugin/ManagePlugins.tsx
 *
 * /plugin 已安装页：插件、MCP 服务器与技能的统一列表
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/commands/plugin/ManagePlugins.tsx
 * pieces: chunk-6zvphrsz.js (1), chunk-k9mgeeff.js (2), chunk-vrb44rx7.js (36)
 * attribution: fingerprint 5, affinity 1, placement 26, layout 6, sole-consumer 1
 */
import * as fsPromisesModule from "fs/promises";
import * as pathModule from "path";
import { join } from "path";
import {
  pluginNamesEqual,
  pluginDisplayKey,
  splitPluginId,
  marketplaceOf,
  parsePluginIdentifier,
  marketplaceSuffix,
  normalizePluginId,
  normalizeReservedMarketplaceCase,
  isRequiredPlugin,
  isOfficialMarketplace,
  findPluginName,
} from "../../utils/plugins/pluginIdentifier.js";
import { count, uniq } from "../../utils/collections.js";
import { stripSyncedSkillPrefix } from "../../skills/syncedSkills.js";
import { init_react_production, Q, y, P, R, ce, Oo } from "../../../vendor/react/cjs/react.production.js";
import { getPluginRegistry } from "../../utils/plugins/pluginLoadState.js";
import { stripInvisibleChars as stripInvisibleChars_2 } from "../../utils/invisibleChars.js";
import {
  subscribe_2,
  uiRenderModule,
} from "../../components/permissions/AskUserQuestionPermissionRequest/uiRenderHook.js";
import { useStoreSelector } from "../../hooks/useStoreSelector.js";
import { w } from "../../../vendor/react/compiler-runtime.js";
import { plural, capitalize } from "../../utils/stringUtils.js";
import {
  jsxProd_default_2,
  jsxProd_default,
  Fragment,
} from "../../../vendor/react/cjs/react-jsx-dev-runtime.react-server.production.js";
import { Text, Box } from "../../ink/components/Text.js";
import { Byline } from "../../components/design-system/Byline.js";
import { useAppState, useActivePlugins } from "../../state/AppState.js";
import { collectPassedOverHooks } from "../../utils/plugins/functionHooks/hookPatterns.js";
import { isPluginDirectoryModeOn, lanternPrismEnabled } from "../../utils/plugins/pluginGates.js";
import { pluginTelemetryFields } from "../../utils/telemetry/pluginTelemetryName.js";
import { policyEnabledPluginNameSet } from "../../utils/plugins/pluginPolicy.js";
import { fromEnum } from "../../services/analytics/safeMetadata.js";
import { logEvent } from "../../services/analytics/index.js";
import { logError } from "../../utils/log.js";
import { withTelemetryMessage, toError, errorMessage } from "../../utils/errors.js";
import { BulletRow } from "../../components/design-system/BulletRow.js";
import {
  printableLabel,
  printableName,
  quotedPrintable,
  printableMessage,
} from "../../utils/printableName.js";
import {
  OFFICIAL_MARKETPLACE_NAME,
  OFFICIAL_MARKETPLACE_DISPLAY,
} from "../../utils/plugins/officialMarketplaceNames.js";
import {
  displayPluginId,
  findPluginInSettings_2,
  getReplaceUnavailableReason,
  describeReplaceUnavailable,
  isPluginEffectivelyEnabled,
  getPluginInstallationFromV2,
  isInstallableScope,
  MANAGED_PLUGIN_DISABLE_MESSAGE,
  enablePluginOp,
  disablePluginOp,
  isPluginEnabledAtProjectScope,
  uninstallPluginOp,
  updatePluginOp,
  requiredPluginMessage,
  managedPluginRefusal,
  flagSettingsEnabledNote,
  installPluginOp,
  describeKeptDataDir,
} from "../../services/plugins/pluginOperations.js";
import { getOriginalCwd } from "../../bootstrap/state.js";
import {
  isInstallationRelevantToCurrentProject,
  getInstalledPlugins,
  loadInstalledPlugins,
  hasFailedInstalledPluginsRead,
  hasInstallationForCurrentProject,
} from "../../utils/plugins/installedPluginsManager.js";
import {
  isSettingSourceEnabled,
  getSettingSourceName,
  EDITABLE_SETTING_SOURCES,
} from "../../utils/settings/constants.js";
import {
  getSettingsForSource,
  getSettings_DEPRECATED,
  updateSettingsForSource,
  getSettingsForSourceForUpkeep,
  updateSettingsForSourceWithTransform,
} from "../../utils/settings/settings.js";
import {
  ownLookup,
  skillOverrideWithSource,
  bareSkillName,
  isNotProtoKey,
} from "../../utils/commandPredicates.js";
import {
  getPluginInventory,
  logComponentReadError,
  readFileHead,
  MAX_PLUGIN_INVENTORY_FILE_BYTES,
} from "../../utils/plugins/pluginInventory.js";
import {
  getPluginDirectoryState,
  getMarketplace,
  loadKnownMarketplacesSafe,
  getPluginByIdCacheOnly,
  redactUrlCredentials,
} from "../../utils/plugins/marketplaceManager.js";
import { MEMO_CACHE_SENTINEL, EARLY_RETURN_SENTINEL } from "../../../runtime/bun-runtime.js";
import { COMPONENT_LABELS, PluginActionSelect } from "./pluginDetailsHelpers.js";
import { pluginManifestPathSchemas, ANTHROPIC_PLUGIN_DIRECTORY } from "../../utils/plugins/schemas.js";
import { isPluginBlockedByPolicy } from "../../utils/plugins/marketplacePolicy.js";
import { figures_default } from "../../../vendor/@inquirer/figures/dist/esm/index.js";
import { useTheme_2 } from "../../components/design-system/ThemeProvider.js";
import {
  getFlaggedPlugins,
  markFlaggedPluginsSeen,
  removeFlaggedPlugin,
} from "../../utils/plugins/pluginFlagging.js";
import {
  useSkillHealthData,
  watchSkillHealthInvalidation,
  readMarketplaceJsonContent,
  formatSkillErrorMessage,
} from "./skillHealth.js";
import { useTerminalFocus } from "../../ink/hooks/use-terminal-focus.js";
import { useHasScrollViewport, useScrollViewportSize } from "../../components/ScrollViewportContext.js";
import { useTerminalSize } from "../../hooks/useTerminalSize.js";
import { useSearchInput } from "../../hooks/useSearchInput.js";
import { usePinnedConsentRecord, PluginHeadersHelperWarning } from "./PluginDetails.js";
import { getEnabledPluginsBySource, enabledPluginsEqual } from "../../utils/plugins/pluginSettingsSources.js";
import {
  findOfficialMarketplaceAlternative,
  findOtherProjectInstalls,
  describeOtherMarketplaceInstall,
} from "../../utils/plugins/installResultMessages.js";
import { describeOtherMarketplaceInstalls } from "../../utils/plugins/pluginDependencies.js";
import { isMarketplaceGone } from "../../utils/plugins/marketplaceNames.js";
import {
  canReplaceOfficialInstalls,
  installFromOtherMarketplace,
  truncateMarketplaceLabel,
  displayableGitHeadName,
} from "../../utils/plugins/crossMarketplaceInstall.js";
import { logForDebugging } from "../../utils/debug.js";
import {
  wouldTargetKeepOwnPluginOptions,
  marketplaceSource,
  loadPluginOptions,
  savePluginOptions as savePluginOptions_2,
} from "../../utils/plugins/pluginOptionsStorage.js";
import { useMcpToggleEnabled } from "../../services/mcp/MCPConnectionManager.js";
import { useKeybinding } from "../../keybindings/useKeybinding.js";
import { isUnconfiguredFailure, isArtifacts404Failure } from "../../services/mcp/redactMcpErrors.js";
import {
  stripInvisibleKeepEmoji,
  stripInvisibleKeepNewlines,
} from "../../utils/settings/marketplaceSettingsAliases.js";
import { isAutoupdateInfoError } from "./PluginSettings.js";
import { matchesPluginSource, isOrphanPlugin } from "../../services/plugins/pluginTag.js";
import { formatLastPrompt, renderSkillListingFootprint } from "./pluginUsageStats.js";
import { getPluginEditableScopes, editableScopeOf } from "../../utils/plugins/pluginStartupCheck.js";
import { getEverConnectedClaudeAiMcpSet } from "../../services/mcp/claudeai.js";
import { SKILLS_DIR, buildPluginEventFieldsFromId } from "../../utils/telemetry/pluginTelemetry.js";
import { getGlobalConfig, saveGlobalConfig } from "../../utils/config.js";
import { getCommandName } from "../../commands.js";
import { CLAUDE_AI_SYNC_LABEL } from "../../utils/settings/commandSyncNames.js";
import { roughTokenCountEstimation } from "../../services/tokenEstimation.js";
import { getOwn } from "../../utils/objectSafety.js";
import { computeDisusedPlugins, getPluginDaysSinceUse } from "../../services/tips/pluginDisuseTip.js";
import { logFeatureOk } from "../../services/analytics/featureTelemetry.js";
import { getSourceTitle } from "../../components/skills/SkillsMenu.js";
import { describeMcpServerOrigin } from "../../services/mcp/mcpServerOrigin.js";
import { usePagination } from "./usePagination.js";
import { isMcpbSource, loadMcpbFile } from "../../utils/plugins/mcpbHandler.js";
import { jsonParse } from "../../utils/slowOperations.js";
import { stripBom } from "../../utils/json.js";
import { isStorageV5Enabled } from "../../utils/hoverRest.js";
import { loadAllPlugins } from "../../utils/plugins/pluginLoader.js";
import { getPluginDataDirSize, pluginDataDirPath } from "../../utils/plugins/pluginDirectories.js";
import { refreshPluginCaches } from "../../utils/plugins/cacheUtils.js";
import {
  getPluginDisplayName,
  trimmedOrUndefined,
  sanitizePluginManifestForDisplay,
} from "../../components/ManagedSettingsSecurityDialog/utils.js";
import { listUnscopedPluginForProject, formatCopyNotLoaded } from "./SkillDoctor.js";
import { formatMcpOperationFailure } from "../../components/mcp/utils/reconnectHelpers.js";
import { MessageActionsKeybindings } from "../../components/messageActions.js";
import { openValidatedUrlSucceeded } from "../../utils/browser.js";
import { mergePluginErrors } from "../../utils/plugins/refresh.js";
import { installationAtTarget } from "../../utils/plugins/dependencyResolver.js";
import { HintText } from "../../components/design-system/HintText.js";
import { ConfigurableShortcutHint } from "../../components/ConfigurableShortcutHint.js";
import { PluginOptionsFlow, PluginOptionsDialogLoader } from "./PluginOptionsFlow.js";
import { PluginOptionsDialog } from "./PluginOptionsDialog.js";
import { displayMarketplaceName } from "../../utils/plugins/pluginDisplayMetadata.js";
import { TwoColumnRow, SelectRow } from "../../components/CustomSelect/select.js";
import { FocusColumn } from "../../components/design-system/FocusColumn.js";
import { ErrorText } from "../../components/ErrorText.js";
import { KeyboardShortcutHint } from "../../components/design-system/KeyboardShortcutHint.js";
import { getErrorGuidanceText } from "./PluginErrors.js";
import { pluginWarningText, pluginWarningFixText } from "../../utils/plugins/pluginComponentConflicts.js";
import { isSyncedMarketplacePlugin } from "../../utils/permissions/permissionRulePayload.js";
import { OrderedListWithItem } from "../../components/CustomSelect/selectTable.js";
import { StatusIcon } from "../../components/design-system/StatusIcon.js";
import { filterToolsByServer } from "../../services/mcp/utils.js";
import { MCPStdioServerMenu } from "../../components/mcp/MCPStdioServerMenu.js";
import { RemoteServerMenuLoader, MCPToolListView } from "../../components/mcp/MCPToolListView.js";
import { MCPToolDetailView } from "../../components/mcp/MCPToolDetailView.js";
import { SearchBox } from "../../components/SearchBox.js";
import { isSafeMode, getSafeModeExitHint, getClaudeConfigDir } from "../../utils/envUtils.js";
import { AuthShortcutHint, InstalledItemRow } from "./UnifiedInstalledCell.js";
import { replaceControlChars } from "../../utils/resultError.js";
import { parseFrontmatter } from "../../utils/frontmatterParser.js";

//@ chunk-vrb44rx7.js:146689-146757 affinity
function isListNavItem(i) {
  return i?.kind === "item" || i?.kind === "disabled-header";
}
//@ chunk-vrb44rx7.js:146757-146893 placement = _temp2 (0.306)
/**
 * 判断插件操作是否因插件未安装（或未在该作用域安装）而失败，且该插件不在已知列表中。
 */
function isUninstalledPluginFailure(i, h, editableSources) {
  return (
    !i.success &&
    (i.failureCode === "not_installed" || i.failureCode === "not_installed_at_scope") &&
    !editableSources.some((C) => pluginNamesEqual(C, h))
  );
}
//@ chunk-vrb44rx7.js:146893-147114 placement
function needsAttention(i) {
  switch (i.type) {
    case "plugin":
      return i.isEnabled && i.errorCount > 0;
    case "failed-plugin":
    case "flagged-plugin":
      return true;
    case "mcp":
      return (i.status === "needs-auth" || i.status === "failed") && !isNeverConnectedMcpFailure(i);
    case "skill":
      return false;
  }
}
//@ chunk-vrb44rx7.js:147114-147168 placement
var SKILL_STATE_CYCLE = ["on", "name-only", "user-invocable-only", "off"];
//@ chunk-vrb44rx7.js:147168-147351 placement
function nextSkillOverrideState(override, lockSource) {
  if (lockSource === "policy" || lockSource === "flag" || lockSource === "reserved-name") return override;
  if (lockSource === "author") return override === "off" ? "user-invocable-only" : "off";
  let index = SKILL_STATE_CYCLE.indexOf(override);
  return SKILL_STATE_CYCLE[(index + 1) % SKILL_STATE_CYCLE.length];
}
//@ chunk-vrb44rx7.js:147351-147482 placement
function isInstalledItemDisabled(i) {
  return (
    (i.type === "plugin" && !i.isEnabled) ||
    (i.type === "mcp" && i.status === "disabled") ||
    (i.type === "skill" && i.override === "off")
  );
}
//@ chunk-vrb44rx7.js:147482-147589 placement
function isNeverConnectedMcpFailure(i) {
  return (
    i.type === "mcp" && (i.status === "needs-auth" || i.status === "failed") && i.everConnected === false
  );
}
//@ chunk-vrb44rx7.js:147589-149317 placement
function buildInstalledSections(
  unifiedItems,
  { searchQuery, favoriteIds, showDisabled, disusedDays, keepInPlaceIds },
) {
  if (searchQuery) {
    let lower = searchQuery.toLowerCase();
    return unifiedItems
      .filter(
        (J) =>
          J.name.toLowerCase().includes(lower) ||
          ("displayName" in J && J.displayName?.toLowerCase().includes(lower)) ||
          ("description" in J && J.description?.toLowerCase().includes(lower)),
      )
      .map((item) => ({
        kind: "item",
        section: "main",
        item,
      }));
  }
  let D = [];
  let U = new Map();
  for (let _ of unifiedItems)
    if (_.type === "plugin")
      U.set(_.id, {
        name: _.name,
        displayName: _.displayName,
      });
  let L = null;
  let A = (_, J) => {
    let pe = L?.section !== _;
    if (pe) {
      if (D.length > 0 && D.at(-1)?.kind !== "disabled-header")
        D.push({
          kind: "spacer",
        });
      if (_ === "attention" || _ === "favorites" || _ === "disused")
        D.push({
          kind: "section-header",
          section: _,
        });
    }
    if ((_ === "main" || _ === "disabled") && (pe || L?.item.scope !== J.scope)) {
      if (!pe)
        D.push({
          kind: "spacer",
        });
      D.push({
        kind: "scope-header",
        scope: J.scope,
      });
    }
    let fe =
      !pe &&
      J.type === "mcp" &&
      J.parentId !== undefined &&
      ((L?.item.type === "plugin" && L.item.id === J.parentId) ||
        (L?.item.type === "mcp" && L.item.indented && L.item.parentId === J.parentId));
    let item =
      J.type === "mcp" && J.indented && !fe
        ? {
            ...J,
            indented: false,
            liftedFrom: J.parentId === undefined ? undefined : U.get(J.parentId),
          }
        : J;
    D.push({
      kind: "item",
      section: _,
      item,
    });
    L = {
      section: _,
      item,
    };
  };
  let K = new Set();
  for (let _ of unifiedItems)
    if (needsAttention(_)) {
      A("attention", _);
      K.add(_.id);
    }
  for (let _ of unifiedItems)
    if (favoriteIds.has(_.id) && !K.has(_.id)) {
      A("favorites", _);
      K.add(_.id);
    }
  if (disusedDays && disusedDays.size > 0) {
    for (let _ of unifiedItems)
      if (_.type === "plugin" && _.isEnabled && disusedDays.has(_.id) && !K.has(_.id)) {
        A("disused", {
          ..._,
          unusedDays: disusedDays.get(_.id),
        });
        K.add(_.id);
      }
  }
  let V = (_) => (isInstalledItemDisabled(_) || isNeverConnectedMcpFailure(_)) && !keepInPlaceIds?.has(_.id);
  for (let _ of unifiedItems) if (!V(_) && !K.has(_.id)) A("main", _);
  let filtered = unifiedItems.filter(V);
  if (filtered.length > 0) {
    if (D.length > 0)
      D.push({
        kind: "spacer",
      });
    D.push({
      kind: "disabled-header",
      disabledCount: count(filtered, isInstalledItemDisabled),
      unusedConnectorCount: count(filtered, isNeverConnectedMcpFailure),
    });
    if (showDisabled) for (let _ of filtered) A("disabled", _);
  }
  return D;
}
//@ chunk-vrb44rx7.js:149317-149436 placement
function getSkillItemKey(i) {
  return i.loadedFrom === "syncedSkills"
    ? `synced-skill:${i.source}:${i.name}`
    : `skill:${i.source}:${i.name}`;
}
//@ chunk-vrb44rx7.js:149436-149471 placement
var SYNCED_SKILL = "synced-skill:";
var SKILL = "skill:";
//@ chunk-vrb44rx7.js:149471-149608 placement
function getSyncedSkillAliasKeys(i) {
  if (!i.startsWith(SYNCED_SKILL)) return [];
  let sliced = i.slice(SYNCED_SKILL.length);
  let k = sliced.indexOf(":") + 1;
  let C = sliced.slice(0, k) + stripSyncedSkillPrefix(sliced.slice(k));
  return [SYNCED_SKILL + C, SKILL + C];
}
//@ chunk-vrb44rx7.js:149608-149863 placement
function expandSyncedSkillSelection(i, h) {
  let k = new Set();
  let C = [];
  for (let T of h) {
    let skillItemKey = getSkillItemKey(T);
    if (T.loadedFrom === "syncedSkills") C.push(skillItemKey);
    else k.add(skillItemKey);
  }
  let x = null;
  for (let T of C) {
    if (i.has(T)) continue;
    for (let D of getSyncedSkillAliasKeys(T))
      if (i.has(D) && !k.has(D)) {
        x ??= new Set(i);
        x.add(T);
        break;
      }
  }
  return x ?? i;
}
//@ chunk-vrb44rx7.js:149863-150050 placement
function toggleSkillKeySelection(i, h, filteredItems) {
  let C = expandSyncedSkillSelection(i, filteredItems);
  let x = new Set(i);
  if (!C.has(h)) {
    x.add(h);
    return x;
  }
  x.delete(h);
  for (let T of getSyncedSkillAliasKeys(h))
    if (!filteredItems.some((D) => D.loadedFrom !== "syncedSkills" && getSkillItemKey(D) === T)) x.delete(T);
  return x;
}
//@ chunk-vrb44rx7.js:150050-150054 placement
init_react_production();
//@ chunk-vrb44rx7.js:150054-150177 placement
var Vd = Object.freeze({
  subscribe: (i) => getPluginRegistry().hooksLeftOutByNameChanged.subscribe(i),
  getSnapshot: () => getPluginRegistry().hooksLeftOutByName,
});
//@ chunk-vrb44rx7.js:150177-150205 placement
function escapeDisplayText(A) {
  return stripInvisibleChars_2(A);
}
//@ chunk-vrb44rx7.js:150205-150845 placement
/**
 * 插件管理页读取已加载模块的 store：ca 给出活动 mod 名列表，ua 为快照。
 */
var loadedModulesStore = {
  subscribe: subscribe_2,
  getSnapshot: () => getPluginRegistry().loadedModules,
};
var activeModNames = () => uiRenderModule.activeModNames(useStoreSelector(loadedModulesStore));
var loadedModsSnapshot = (props) => {
  let C = w(12);
  let { names } = props;
  const k = names.length;
  let x;
  if (C[0] !== names.length) {
    x = plural(names.length, "mod");
    C[0] = names.length;
    C[1] = x;
  } else x = C[1];
  let T;
  if (C[2] !== names.length || C[3] !== x) {
    T = jsxProd_default_2(Text, {
      children: [k, " ", x, " active"],
    });
    C[2] = names.length;
    C[3] = x;
    C[4] = T;
  } else T = C[4];
  let children;
  if (C[5] !== names) {
    children = names.map(escapeDisplayText).join(", ");
    C[5] = names;
    C[6] = children;
  } else children = C[6];
  let U;
  if (C[7] !== children) {
    U = jsxProd_default(Text, {
      children,
    });
    C[7] = children;
    C[8] = U;
  } else U = C[8];
  let L;
  if (C[9] !== T || C[10] !== U) {
    L = jsxProd_default(Box, {
      marginTop: 1,
      children: jsxProd_default(Text, {
        dimColor: true,
        wrap: "truncate-end",
        children: jsxProd_default_2(Byline, {
          children: [T, U],
        }),
      }),
    });
    C[9] = T;
    C[10] = U;
    C[11] = L;
  } else L = C[11];
  return L;
};
//@ chunk-vrb44rx7.js:150845-150954 placement
/**
 * 汇总插件相关警告：AppState 里的插件加载警告、冻结/已加载模块存储里的警告，作为一个记忆化数组返回。
 */
function usePluginWarnings() {
  let i = useAppState((C) => C.plugins.warnings);
  let storeSelector = useStoreSelector(Vd);
  let storeSelector_2 = useStoreSelector(loadedModulesStore);
  return Q(
    () => [...i, ...storeSelector, ...collectPassedOverHooks(storeSelector_2)],
    [i, storeSelector, storeSelector_2],
  );
}
//@ chunk-vrb44rx7.js:150954-151419 placement
async function logPluginToggleScreen({ operation, pluginId, scope, savedKept, storageV5 }) {
  try {
    if (!isPluginDirectoryModeOn()) return;
    let T = {
      ...(await pluginTelemetryFields(pluginId, policyEnabledPluginNameSet(), storageV5)),
      ...(scope !== undefined && {
        scope: fromEnum(scope),
      }),
    };
    switch (operation) {
      case "uninstall":
        logEvent("tengu_plugin_uninstalled_screen", {
          ...T,
          ...(savedKept && {
            saved_kept: true,
          }),
        });
        return;
      case "enable":
        logEvent("tengu_plugin_enabled_screen", T);
        return;
      case "disable":
        logEvent("tengu_plugin_disabled_screen", T);
        return;
    }
  } catch (error) {
    logError(
      withTelemetryMessage(
        toError(error),
        "/plugin: logging an uninstall, enable or disable made on the screen threw",
      ),
    );
  }
}
//@ chunk-vrb44rx7.js:151419-151526 placement
function renderComponentLabelRow(i) {
  let [Oe, rt] = i;
  return jsxProd_default(
    BulletRow,
    {
      children: jsxProd_default_2(Text, {
        dimColor: true,
        children: [Oe, ": ", rt.join(", ")],
      }),
    },
    Oe,
  );
}
//@ chunk-vrb44rx7.js:151526-151577 placement
function pluginDisplayLabel(i) {
  return printableLabel(printableName(i, 120)) || "this plugin";
}
//@ chunk-vrb44rx7.js:151577-151628 placement
function marketplaceLabel(marketplace) {
  return marketplace === OFFICIAL_MARKETPLACE_NAME
    ? `the ${OFFICIAL_MARKETPLACE_DISPLAY}`
    : quotedPrintable(marketplace, 120);
}
//@ chunk-vrb44rx7.js:151628-152748 placement
function formatToggleConsequence({
  newId,
  openedId,
  oldInText,
  others,
  alsoInstalledElsewhere,
  targetKeepsOwn,
  removesSavedData,
}) {
  {
    let U = new Intl.ListFormat("en", {
      type: "conjunction",
    });
    let L = (_) => U.format(_.map((J) => displayPluginId(J)));
    let filtered = others.filter((other) => !alsoInstalledElsewhere.has(other.pluginId));
    let filtered_2 = [openedId, ...others.map((other) => other.pluginId)].filter((_) =>
      alsoInstalledElsewhere.has(_),
    );
    let V =
      filtered_2.length === 0
        ? ""
        : ` ${capitalize(L(filtered_2))} ${filtered_2.length === 1 ? "is" : "are"} also installed for another project: the settings saved for ${filtered_2.length === 1 ? "it" : "them"} are kept while ${filtered_2.length === 1 ? "it stays" : "they stay"} installed there.`;
    if (targetKeepsOwn) {
      let _ = alsoInstalledElsewhere.has(openedId) ? [] : [openedId];
      let J =
        removesSavedData && filtered.length > 0
          ? [
              ..._.map((pe) => `the settings saved for ${displayPluginId(pe)}`),
              `the settings and saved data for ${L(filtered.map((pe) => pe.pluginId))}`,
            ].join(" and ")
          : _.length + filtered.length === 0
            ? ""
            : `settings saved for ${L([..._, ...filtered.map((pe) => pe.pluginId)])}`;
      return `${capitalize(displayPluginId(newId))} already has its own settings${J === "" ? "" : `; ${J} are removed`}.${V}`;
    }
    if (others.length === 0) return `Your plugin settings carry over.${V}`;
    let B =
      filtered.length === 0
        ? ""
        : `; ${removesSavedData ? "settings and saved data for" : "settings saved for"} ${U.format(filtered.map((_) => _.marketplaceInText))} are removed`;
    return `Settings carry over from ${oldInText}${B}.${V}`;
  }
  return "";
}
//@ chunk-vrb44rx7.js:152748-152856 placement
function findScopedInstallation(i, scope) {
  let k = i?.filter((C) => C.scope === scope) ?? [];
  return k.find((C) => C.projectPath === getOriginalCwd()) ?? k.find(isInstallationRelevantToCurrentProject);
}
//@ chunk-vrb44rx7.js:152856-152994 placement
function describePluginVersionPin(pluginId, gitCommitSha) {
  let k = shortCommitSha(gitCommitSha);
  if (!k) return "tracks the marketplace's latest";
  return pluginId.endsWith(`@${OFFICIAL_MARKETPLACE_NAME}`) ? `pinned commit ${k}` : `commit ${k}`;
}
//@ chunk-vrb44rx7.js:152994-153076 placement
function shortCommitSha(i) {
  return i !== undefined && /^[0-9a-f]{7,40}$/i.test(i) ? i.slice(0, 7) : undefined;
}
//@ chunk-vrb44rx7.js:153076-153226 placement = isClaudeAISubscriber (0.692)
function getUncoveredPluginScopes(replaced, scope, pluginId) {
  let C = new Set([
    scope,
    ...(getInstalledPlugins().plugins[pluginId] ?? [])
      .filter(isInstallationRelevantToCurrentProject)
      .map((x) => x.scope),
  ]);
  return uniq(replaced.flatMap((x) => x.scopes)).filter((x) => !C.has(x));
}
//@ chunk-vrb44rx7.js:153226-153280 layout
var SKILL_STATE_CYCLE_2 = ["on", "name-only", "user-invocable-only", "off"];
//@ chunk-vrb44rx7.js:153280-153620 layout
/**
 * 比较技能覆盖新值与 settings（local/project/user）里已生效的值；相同返回 undefined（无需写入），否则返回新值。作者锁定的技能默认值是 user-invocable-only。
 */
function diffSkillOverrideFromSettings(i, h) {
  let k = (A) => (isSettingSourceEnabled(A) ? getSettingsForSource(A)?.skillOverrides : undefined);
  let C = k("localSettings");
  let x = k("projectSettings");
  let T = k("userSettings");
  let D = (A) => ownLookup(x, A) ?? ownLookup(T, A);
  let U =
    D(i.cmdName) ??
    (i.unqualifiedName != null ? (ownLookup(C, i.unqualifiedName) ?? D(i.unqualifiedName)) : undefined);
  let L = i.lockSource === "author" ? (U === "off" ? "off" : "user-invocable-only") : (U ?? "on");
  return h === L ? undefined : h;
}
//@ chunk-vrb44rx7.js:153620-153912 layout
function formatPluginScopeLabel(scope) {
  switch (scope) {
    case "flagged":
      return "Flagged";
    case "project":
      return "Project";
    case "local":
      return "Local";
    case "user":
      return "User";
    case "enterprise":
      return "Enterprise";
    case "managed":
      return "Managed";
    case "builtin":
    case "dynamic":
      return "Built-in";
    case "skills":
      return "Skills";
    default:
      return scope;
  }
}
//@ chunk-vrb44rx7.js:153912-155189 layout
/**
 * 异步加载插件清单并渲染"Installed components"列表；市场已关闭/不可用时显示说明，加载失败时显示错误。
 */
function PluginInstalledComponents(props) {
  let A = w(13);
  let { plugin, marketplace } = props;
  let [C, x] = y(null);
  let [T, D] = y(null);
  let [U, L] = y(null);
  let K;
  let V;
  if (A[0] !== marketplace || A[1] !== plugin) {
    K = () => {
      let B = false;
      getPluginInventory(plugin, marketplace)
        .then((pluginInventory) => {
          if (!B) x(pluginInventory);
        })
        .catch(async (error) => {
          let pe = marketplace === OFFICIAL_MARKETPLACE_NAME ? await getPluginDirectoryState() : null;
          if (B) {
            return;
          }
          if (pe === "off" || pe === "unavailable") {
            L(pe);
            return;
          }
          D((error instanceof Error && printableMessage(error)) || "Failed to load components");
        });
      return () => {
        B = true;
      };
    };
    V = [plugin, marketplace];
    A[0] = marketplace;
    A[1] = plugin;
    A[2] = K;
    A[3] = V;
  } else {
    K = A[2];
    V = A[3];
  }
  P(K, V);
  if (U) {
    const fe = U === "off" ? "is turned off." : "isn't available in this session.";
    let me;
    if (A[4] !== fe) {
      me = jsxProd_default(Box, {
        marginBottom: 1,
        children: jsxProd_default_2(Text, {
          dimColor: true,
          children: ["Components are not shown because this plugin's marketplace", " ", fe],
        }),
      });
      A[4] = fe;
      A[5] = me;
    } else me = A[5];
    return me;
  }
  if (T) {
    let fe;
    if (A[6] === MEMO_CACHE_SENTINEL) {
      fe = jsxProd_default(Text, {
        bold: true,
        children: "Components:",
      });
      A[6] = fe;
    } else fe = A[6];
    let me;
    if (A[7] !== T) {
      me = jsxProd_default_2(Box, {
        flexDirection: "column",
        marginBottom: 1,
        children: [
          fe,
          jsxProd_default_2(Text, {
            dimColor: true,
            children: ["Error: ", T],
          }),
        ],
      });
      A[7] = T;
      A[8] = me;
    } else me = A[8];
    return me;
  }
  if (!C) {
    return null;
  }
  let fe;
  let me;
  if (A[9] !== C) {
    me = EARLY_RETURN_SENTINEL;
    he: {
      let ne = COMPONENT_LABELS(C);
      if (ne.length === 0) {
        me = null;
        break he;
      }
      let W;
      if (A[12] === MEMO_CACHE_SENTINEL) {
        W = jsxProd_default(Text, {
          bold: true,
          children: "Installed components:",
        });
        A[12] = W;
      } else W = A[12];
      fe = jsxProd_default_2(Box, {
        flexDirection: "column",
        marginBottom: 1,
        children: [W, ne.map(renderComponentLabelRow)],
      });
    }
    A[9] = C;
    A[10] = fe;
    A[11] = me;
  } else {
    fe = A[10];
    me = A[11];
  }
  if (me !== EARLY_RETURN_SENTINEL) return me;
  return fe;
}
//@ chunk-vrb44rx7.js:155189-155429 fingerprint = checkIfLocalPlugin (1)
async function checkIfLocalPlugin(pluginName, marketplaceName, storageV5) {
  if (marketplaceName === pluginManifestPathSchemas) return null;
  let entry = (await getMarketplace(marketplaceName, storageV5))?.plugins.find(
    (plugin) => plugin.name === pluginName,
  );
  if (entry && typeof entry.source === "string")
    return `Local plugins cannot be updated remotely. To update, modify the source at: ${entry.source}`;
  return null;
}
//@ chunk-vrb44rx7.js:155429-155480 layout
function dropPolicyBlockedPlugins(i) {
  return i.filter((h) => !isPluginBlockedByPolicy(h.source));
}
//@ chunk-vrb44rx7.js:155480-156237 layout
/**
 * 渲染一组带颜色的插件消息（错误/警告）：标题"N 个 noun:"，每条消息下可带缩进的指导语。
 */
function PluginMessageList(props) {
  let T = w(15);
  let { entries, color, noun } = props;
  if (entries.length === 0) {
    return null;
  }
  const x = entries.length;
  let D;
  if (T[0] !== entries.length || T[1] !== noun) {
    D = plural(entries.length, noun);
    T[0] = entries.length;
    T[1] = noun;
    T[2] = D;
  } else D = T[2];
  let U;
  if (T[3] !== color || T[4] !== entries.length || T[5] !== D) {
    U = jsxProd_default_2(Text, {
      bold: true,
      color,
      children: [x, " ", D, ":"],
    });
    T[3] = color;
    T[4] = entries.length;
    T[5] = D;
    T[6] = U;
  } else U = T[6];
  let L;
  if (T[7] !== color || T[8] !== entries) {
    let A;
    if (T[10] !== color) {
      A = (K, i_0) =>
        jsxProd_default_2(
          Box,
          {
            flexDirection: "column",
            marginLeft: 2,
            children: [
              jsxProd_default(Text, {
                color,
                children: K.message,
              }),
              K.guidance &&
                jsxProd_default_2(Text, {
                  dimColor: true,
                  italic: true,
                  children: [figures_default.arrowRight, " ", K.guidance],
                }),
            ],
          },
          i_0,
        );
      T[10] = color;
      T[11] = A;
    } else A = T[11];
    L = entries.map(A);
    T[7] = color;
    T[8] = entries;
    T[9] = L;
  } else L = T[9];
  let A;
  if (T[12] !== U || T[13] !== L) {
    A = jsxProd_default_2(Box, {
      flexDirection: "column",
      children: [U, L],
    });
    T[12] = U;
    T[13] = L;
    T[14] = A;
  } else A = T[14];
  return A;
}
//@ chunk-vrb44rx7.js:156237-204832 fingerprint = ManagePlugins (0.484)
function ManagePlugins({
  setViewState,
  setResult,
  onManageComplete,
  changesApplyOnClose,
  onSearchModeChange,
  targetPlugin,
  targetMarketplace,
  action,
  commands,
}) {
  let { storageV5, credentials } = useTheme_2();
  let mcpClients = useAppState((E) => E.mcp.clients);
  let mcpTools = useAppState((s_0) => s_0.mcp.tools);
  let pluginErrors = useAppState((s_1) => s_1.plugins.errors);
  let flaggedPlugins = useActivePlugins();
  let pluginWarnings = usePluginWarnings();
  let flaggedPlugins_2 = getFlaggedPlugins();
  let skillHealthData = useSkillHealthData();
  let [ne, he] = y(false);
  let W = () => he(false);
  let isTerminalFocused = useTerminalFocus();
  let isTerminalFocused_2 = useHasScrollViewport();
  let { rows, columns } = useScrollViewportSize(useTerminalSize());
  let [viewState, setViewState_2] = y("plugin-list");
  let {
    query: searchQuery,
    setQuery: setSearchQuery,
    cursorOffset: searchCursorOffset,
    setCursorOffset,
    handleKeyDown,
    handlePaste,
  } = useSearchInput({
    isActive: viewState === "plugin-list" && ne,
    onExit: W,
    onExitUp: W,
  });
  let Ct = ne && searchQuery !== "";
  P(() => {
    onSearchModeChange(Ct);
  }, [Ct, onSearchModeChange]);
  P(() => () => onSearchModeChange(false), [onSearchModeChange]);
  let [selectedPlugin, setSelectedPlugin] = y(null);
  let at = Q(
    () => (selectedPlugin ? findPluginInSettings_2(selectedPlugin.plugin.source) : null),
    [selectedPlugin],
  );
  let hasAutoNavigated = usePinnedConsentRecord(at);
  let [an, Yt] = y(0);
  let [marketplaces, setMarketplaces] = y([]);
  let [pluginStates, setPluginStates] = y([]);
  let nn = watchSkillHealthInvalidation(getEnabledPluginsBySource, enabledPluginsEqual);
  let [loading, setLoading] = y(true);
  let [yt, Ut] = y(0);
  let [on, rn] = y(() => new Set());
  let [mn, xn] = y(new Map());
  let [Ln, Mn] = y(null);
  let [fn, Be] = y(null);
  let [jt, le] = y({
    state: "working",
  });
  let pendingAutoActionRef = R(false);
  P(() => {
    Mn(null);
    Be(null);
    le({
      state: "working",
    });
    let scope = selectedPlugin?.scope;
    if (!at || (scope !== "user" && scope !== "local")) return;
    let X = false;
    (async () => {
      {
        let officialMarketplaceAlternative = await findOfficialMarketplaceAlternative(at, storageV5);
        if (X) return;
        Mn(officialMarketplaceAlternative ?? null);
        if (officialMarketplaceAlternative === undefined) return;
        let [knownMarketplaces, pluginByIdCacheOnly] = await Promise.all([
          loadKnownMarketplacesSafe(storageV5),
          getPluginByIdCacheOnly(officialMarketplaceAlternative.pluginId, storageV5),
        ]);
        if (X) return;
        if (pluginByIdCacheOnly === null) {
          le({
            state: "failed",
          });
          return;
        }
        let Re = await describeOtherMarketplaceInstalls(
          officialMarketplaceAlternative.pluginId,
          pluginByIdCacheOnly.entry,
          knownMarketplaces,
          storageV5,
        );
        let otherProjectInstalls = await findOtherProjectInstalls(
          officialMarketplaceAlternative.pluginId,
          pluginByIdCacheOnly.entry,
          knownMarketplaces,
          storageV5,
        );
        let inOtherProjects = scope === "user" ? otherProjectInstalls : [];
        let removesSavedData = (
          await Promise.all(Re.filter((it) => it.pluginId !== at).map((it) => isMarketplaceGone(it.pluginId)))
        ).some((it) => !it);
        if (X) return;
        if (!Re.some((it) => it.pluginId === at)) {
          le({
            state: "failed",
          });
          return;
        }
        let toggleMcpServer = getReplaceUnavailableReason();
        if (toggleMcpServer !== undefined) Be(describeReplaceUnavailable(toggleMcpServer, "ui"));
        else if (
          Re.some((it) => !it.replaceable) ||
          !canReplaceOfficialInstalls(officialMarketplaceAlternative.pluginId, Re)
        )
          Be(
            installFromOtherMarketplace(
              officialMarketplaceAlternative.pluginId,
              pluginByIdCacheOnly.entry.name,
              Re,
              "ui",
            ),
          );
        le({
          state: "known",
          removesSavedData,
          listedName: pluginByIdCacheOnly.entry.name,
          replaced: Re,
          inOtherProjects,
          alsoInstalledElsewhere: otherProjectInstalls.map(
            (otherProjectInstall) => otherProjectInstall.pluginId,
          ),
        });
      }
    })().catch((error) => {
      if (!X)
        le({
          state: "failed",
        });
      logForDebugging(`Switch offer for ${at} could not be worked out: ${errorMessage(error)}`, {
        level: "warn",
      });
    });
    return () => {
      X = true;
    };
  }, [at, selectedPlugin?.scope, storageV5]);
  let [Ue, dt] = y(undefined);
  let pluginId =
    typeof viewState === "object" && viewState.type === "confirm-switch-copy"
      ? viewState.copy.pluginId
      : undefined;
  P(() => {
    dt(undefined);
    {
      if (!at || pluginId === undefined || fn !== null) return;
      let E = false;
      wouldTargetKeepOwnPluginOptions(at, pluginId).then(
        (X) => {
          if (!E) dt(X);
        },
        (error) => {
          if (!E) dt("unknown");
          logForDebugging(
            `Could not work out what switching ${at} to ${pluginId} would do with its settings: ${errorMessage(error)}`,
            {
              level: "warn",
            },
          );
        },
      );
      return () => {
        E = true;
      };
    }
  }, [at, pluginId, fn]);
  let [wt, We] = y(false);
  let Ce = R(false);
  let [Ve, ke] = y(null);
  let [ht, Jt] = y(null);
  let [qt, xt] = y(0);
  let _t = ce(
    (E, X = []) => {
      flaggedPlugins.removeErrorsOf(X);
      Jt(E);
      We(false);
      setSelectedPlugin(null);
      setViewState_2("plugin-list");
      xt((ee) => ee + 1);
      onManageComplete();
    },
    [onManageComplete, flaggedPlugins],
  );
  let Mt = changesApplyOnClose ? "Applies when you close this menu." : "Run /reload-plugins to apply.";
  let hn = R(new Set());
  let Nt = ce((E) => {
    hn.current.add(E);
    E.finally(() => hn.current.delete(E));
  }, []);
  let Fn = R(false);
  let sn = R(new Set());
  let Rn = R(new Set());
  let pendingAutoActionRef_2 = R(undefined);
  let mcpToggleEnabled = useMcpToggleEnabled();
  let handleBack = ce(() => {
    if (viewState === "plugin-details") {
      setViewState_2("plugin-list");
      setSelectedPlugin(null);
      ke(null);
    } else if (typeof viewState === "object" && viewState.type === "failed-plugin-details") {
      setViewState_2("plugin-list");
      ke(null);
    } else if (viewState === "configuring") {
      setViewState_2("plugin-details");
      setConfigNeeded(null);
    } else if (viewState === "plugin-usage") setViewState_2("plugin-details");
    else if (typeof viewState === "object" && viewState.type === "plugin-options")
      _t(`Plugin enabled. Configuration skipped. ${Mt}`);
    else if (typeof viewState === "object" && viewState.type === "configuring-options")
      setResult("Configuration cancelled.");
    else if (typeof viewState === "object" && viewState.type === "flagged-detail") {
      setViewState_2("plugin-list");
      ke(null);
    } else if (typeof viewState === "object" && viewState.type === "mcp-detail") {
      setViewState_2("plugin-list");
      ke(null);
    } else if (typeof viewState === "object" && viewState.type === "skill-detail") {
      setViewState_2("plugin-list");
      ke(null);
    } else if (typeof viewState === "object" && viewState.type === "mcp-tools")
      setViewState_2({
        type: "mcp-detail",
        client: viewState.client,
      });
    else if (typeof viewState === "object" && viewState.type === "mcp-tool-detail")
      setViewState_2({
        type: "mcp-tools",
        client: viewState.client,
      });
    else {
      let E = hn.current;
      if (E.size > 0) {
        Promise.allSettled(E).then(() =>
          setViewState({
            type: "menu",
          }),
        );
        return;
      }
      setViewState({
        type: "menu",
      });
    }
  }, [viewState, setViewState, setResult, _t, Mt]);
  useKeybinding("confirm:no", handleBack, {
    context: "Settings",
    isActive:
      (viewState !== "plugin-list" || !ne) &&
      viewState !== "confirm-project-uninstall" &&
      !(
        typeof viewState === "object" &&
        (viewState.type === "confirm-data-cleanup" || viewState.type === "confirm-switch-copy")
      ),
  });
  let getMcpStatus = (client) => {
    if (client.type === "connected") return "connected";
    if (client.type === "cached") return "cached";
    if (client.type === "disabled") return "disabled";
    if (client.type === "pending") return "pending";
    if (client.type === "needs-auth") return "needs-auth";
    if (isUnconfiguredFailure(client)) return "unconfigured";
    return "failed";
  };
  let unifiedItems = Q(() => {
    let mergedSettings = getSettings_DEPRECATED();
    let pluginMcpMap = new Map();
    for (let client of mcpClients)
      if (client.name.startsWith("plugin:")) {
        let parts = client.name.split(":");
        if (parts.length >= 3) {
          let pluginName = parts[1];
          let serverName = parts.slice(2).join(":");
          let existing = pluginMcpMap.get(pluginName) || [];
          existing.push({
            displayName: stripInvisibleKeepEmoji(serverName),
            client,
          });
          pluginMcpMap.set(pluginName, existing);
        }
      }
    let ee = new Set();
    let ge = [];
    let ye = nn;
    for (let state of pluginStates) {
      let pluginInSettings = findPluginInSettings_2(state.plugin.source);
      let tn = mn.get(pluginInSettings);
      let Gt =
        tn !== undefined
          ? tn === "will-disable"
          : isPluginEffectivelyEnabled(pluginInSettings, state.plugin, ye);
      let errors = pluginErrors.filter(
        (pluginError) =>
          !isAutoupdateInfoError(pluginError) &&
          matchesPluginSource(pluginError, pluginInSettings, state.plugin.name),
      );
      for (let error of errors) ee.add(error);
      let originalScope = state.plugin.isBuiltin ? "builtin" : state.scope || "user";
      let zt =
        commands && lanternPrismEnabled()
          ? formatLastPrompt(state.plugin.manifest.name, commands)
          : undefined;
      ge.push({
        item: {
          type: "plugin",
          id: pluginInSettings,
          name: state.plugin.name,
          displayName: state.plugin.manifest.displayName,
          description: state.plugin.manifest.description,
          marketplace: state.marketplace,
          scope: originalScope,
          isEnabled: Gt,
          errorCount: errors.length,
          errors,
          plugin: state.plugin,
          pendingEnable: state.pendingEnable,
          pendingUpdate: state.pendingUpdate,
          pendingToggle: tn,
          activity: zt
            ? {
                skillCount: zt.skillCount,
                totalCount: zt.totalCount,
              }
            : undefined,
        },
        originalScope,
        childMcps: Gt ? pluginMcpMap.get(pluginDisplayKey(state.plugin.name, state.plugin.source)) || [] : [],
      });
    }
    let orphanErrorsBySource = new Map();
    for (let error of pluginErrors) {
      if (isAutoupdateInfoError(error)) continue;
      let Bt = isOrphanPlugin(error);
      if (!Bt && ee.has(error)) continue;
      let tn = Bt ? `orphan:${error.source}` : error.source;
      let Gt = orphanErrorsBySource.get(tn) || [];
      Gt.push(error);
      orphanErrorsBySource.set(tn, Gt);
    }
    let pluginScopes = getPluginEditableScopes();
    let failedPluginItems = [];
    for (let [Fe, errors] of orphanErrorsBySource) {
      let tn = Fe.startsWith("orphan:") ? Fe.slice(7) : Fe;
      if (tn in flaggedPlugins_2) continue;
      let parsed = splitPluginId(tn);
      let pluginName = parsed.name || tn;
      let marketplace = parsed.marketplace || marketplaceOf(tn) || "unknown";
      let rawScope = editableScopeOf(pluginScopes, tn);
      let scope = rawScope === "flag" || rawScope === undefined ? "user" : rawScope;
      failedPluginItems.push({
        type: "failed-plugin",
        id: Fe,
        name: pluginName,
        marketplace,
        scope,
        errorCount: errors.length,
        errors,
      });
    }
    let standaloneMcps = [];
    let everConnectedClaudeAiMcpSet = getEverConnectedClaudeAiMcpSet();
    for (let client of mcpClients) {
      if (client.name === "ide" || isArtifacts404Failure(client)) continue;
      if (client.name.startsWith("plugin:")) continue;
      standaloneMcps.push({
        type: "mcp",
        id: `mcp:${client.name}`,
        name: client.name,
        description: undefined,
        scope: client.config.scope,
        status: getMcpStatus(client),
        client,
        everConnected:
          client.config.type === "claudeai-proxy" ? everConnectedClaudeAiMcpSet.has(client.name) : undefined,
      });
    }
    let it = [];
    if (commands) {
      let Fe = new Set(
        pluginStates
          .filter((pluginState) => pluginState.marketplace === SKILLS_DIR)
          .map((pluginState) => pluginState.plugin.name),
      );
      let skillUsage = getGlobalConfig().skillUsage ?? {};
      let now = Date.now();
      let skillOverrides = mergedSettings.skillOverrides;
      for (let command of commands) {
        if (
          command.type !== "prompt" ||
          command.hiddenBehindPlugin !== undefined ||
          (command.loadedFrom !== "skills" &&
            command.loadedFrom !== "syncedSkills" &&
            command.loadedFrom !== "commands_DEPRECATED")
        )
          continue;
        let commandName = getCommandName(command);
        if (Fe.has(command.name) || (command.loadedFrom !== "syncedSkills" && Fe.has(commandName))) continue;
        let zt = skillOverrideWithSource(command);
        let Dn = bareSkillName(command);
        let Uo = ownLookup(skillOverrides, command.name) ?? ownLookup(skillOverrides, Dn);
        let pr;
        let Ci;
        if (zt) {
          pr = zt.source === "policySettings" ? "policy" : "flag";
          Ci = zt.value;
        } else if (!isNotProtoKey(command.name)) {
          pr = "reserved-name";
          Ci = command.disableModelInvocation ? "user-invocable-only" : "on";
        } else if (command.disableModelInvocation) {
          pr = "author";
          Ci = Uo === "off" ? "off" : "user-invocable-only";
        } else Ci = Uo ?? "on";
        it.push({
          type: "skill",
          id: getSkillItemKey(command),
          cmdName: command.name,
          unqualifiedName: Dn,
          name: commandName,
          description: command.description,
          scope: "skills",
          source:
            command.loadedFrom === "syncedSkills"
              ? CLAUDE_AI_SYNC_LABEL
              : getSettingSourceName(command.source),
          override: Ci,
          whenToUse: command.whenToUse,
          skillRoot: command.skillRoot,
          allowedTools: command.allowedTools,
          lockSource: pr,
          tokenEstimate: roughTokenCountEstimation(
            [command.name, command.description, command.whenToUse].filter(Boolean).join(" "),
          ),
          usage: (() => {
            let Ga = getOwn(skillUsage, command.name) ?? (Dn != null ? getOwn(skillUsage, Dn) : undefined);
            return Ga
              ? {
                  count: Ga.usageCount,
                  daysSinceUse: Math.max(0, Math.floor((now - Ga.lastUsedAt) / 86400000)),
                }
              : undefined;
          })(),
        });
      }
    }
    let scopeOrder = {
      flagged: -1,
      project: 0,
      local: 1,
      user: 2,
      enterprise: 3,
      managed: 4,
      dynamic: 5,
      builtin: 6,
      skills: 7,
    };
    let unified = [];
    let itemsByScope = new Map();
    for (let { item, originalScope, childMcps } of ge) {
      let scope = item.scope;
      if (!itemsByScope.has(scope)) itemsByScope.set(scope, []);
      itemsByScope.get(scope).push(item);
      for (let { displayName, client } of childMcps) {
        let displayScope = originalScope === "builtin" ? "user" : originalScope;
        if (!itemsByScope.has(displayScope)) itemsByScope.set(displayScope, []);
        itemsByScope.get(displayScope).push({
          type: "mcp",
          id: `mcp:${client.name}`,
          name: displayName,
          description: undefined,
          scope: displayScope,
          status: getMcpStatus(client),
          client,
          indented: true,
          parentId: item.id,
        });
      }
    }
    for (let mcp of standaloneMcps) {
      let scope = mcp.scope;
      if (!itemsByScope.has(scope)) itemsByScope.set(scope, []);
      itemsByScope.get(scope).push(mcp);
    }
    if (it.length > 0) itemsByScope.set("skills", it);
    for (let failedPlugin of failedPluginItems) {
      let scope = failedPlugin.scope;
      if (!itemsByScope.has(scope)) itemsByScope.set(scope, []);
      itemsByScope.get(scope).push(failedPlugin);
    }
    for (let [pluginId, entry] of Object.entries(flaggedPlugins_2)) {
      let parsed = parsePluginIdentifier(pluginId);
      let pluginName = parsed.name || pluginId;
      let marketplace = parsed.marketplace || "unknown";
      if (!itemsByScope.has("flagged")) itemsByScope.set("flagged", []);
      itemsByScope.get("flagged").push({
        type: "flagged-plugin",
        id: pluginId,
        name: pluginName,
        marketplace,
        scope: "flagged",
        reason: "delisted",
        text: "Removed from marketplace",
        flaggedAt: entry.flaggedAt,
      });
    }
    let sortedScopes = [...itemsByScope.keys()].sort(
      (Fe, Bt) => (scopeOrder[Fe] ?? 99) - (scopeOrder[Bt] ?? 99),
    );
    for (let scope of sortedScopes) {
      let items = itemsByScope.get(scope);
      let tn = [];
      let Gt = [];
      let standaloneMcpsInScope = [];
      let i = 0;
      while (i < items.length) {
        let item = items[i];
        if (item.type === "plugin" || item.type === "failed-plugin" || item.type === "flagged-plugin") {
          let group = [item];
          i++;
          let nextItem = items[i];
          while (nextItem?.type === "mcp" && nextItem.indented) {
            group.push(nextItem);
            i++;
            nextItem = items[i];
          }
          tn.push(group);
        } else if (item.type === "mcp" && !item.indented) {
          Gt.push(item);
          i++;
        } else if (item.type === "skill") {
          standaloneMcpsInScope.push(item);
          i++;
        } else i++;
      }
      tn.sort((a_0, b_0) => a_0[0].name.localeCompare(b_0[0].name));
      Gt.sort((a_1, b_1) => a_1.name.localeCompare(b_1.name));
      standaloneMcpsInScope.sort((zt, Dn) => zt.name.localeCompare(Dn.name));
      for (let group_0 of tn) unified.push(...group_0);
      unified.push(...Gt);
      unified.push(...standaloneMcpsInScope);
    }
    return unified;
  }, [pluginStates, mcpClients, pluginErrors, mn, flaggedPlugins_2, commands, yt, nn]);
  let flaggedIds = Q(
    () => unifiedItems.filter((item) => item.type === "flagged-plugin").map((item) => item.id),
    [unifiedItems],
  );
  P(() => {
    if (flaggedIds.length > 0) markFlaggedPluginsSeen(flaggedIds, storageV5);
  }, [flaggedIds, storageV5]);
  let [de, Ge] = y(() => new Set((getGlobalConfig().favoritePlugins ?? []).map(findPluginInSettings_2)));
  let filteredItems = Q(
    () =>
      (commands ?? []).flatMap((E) =>
        E.type === "prompt"
          ? [
              {
                name: E.name,
                source: E.source,
                loadedFrom: E.loadedFrom,
              },
            ]
          : [],
      ),
    [commands],
  );
  let mt = Q(() => expandSyncedSkillSelection(de, filteredItems), [de, filteredItems]);
  let en = ce(
    (E) => {
      Ge((X) => {
        let ee = toggleSkillKeySelection(X, E, filteredItems);
        saveGlobalConfig(
          (ge) => ({
            ...ge,
            favoritePlugins: [...ee],
          }),
          storageV5,
        );
        return ee;
      });
    },
    [filteredItems, storageV5],
  );
  let [Pt, kn] = y(false);
  let [bn, Hn] = y(() => new Map());
  P(() => {
    let E = false;
    computeDisusedPlugins().then((disusedPlugins) => {
      if (E || disusedPlugins.length === 0) return;
      Hn(
        new Map(
          disusedPlugins.map((disusedPlugin) => [
            findPluginInSettings_2(disusedPlugin.pluginId),
            disusedPlugin.daysSinceLastUse,
          ]),
        ),
      );
    });
    return () => {
      E = true;
    };
  }, []);
  let wn = ce(
    (E, X) => {
      if (X === null || !bn.has(X)) return;
      logFeatureOk("cli_plugin_disuse_review");
      logEvent("tengu_plugin_disuse_review_action", {
        action: fromEnum(E),
        ...buildPluginEventFieldsFromId(X),
      });
      Hn((ee) => {
        if (!ee.has(X)) return ee;
        let ge = new Map(ee);
        ge.delete(X);
        return ge;
      });
    },
    [bn],
  );
  let Ft = Q(
    () =>
      buildInstalledSections(unifiedItems, {
        searchQuery,
        favoriteIds: mt,
        showDisabled: Pt,
        disusedDays: bn,
        keepInPlaceIds: on,
      }),
    [unifiedItems, searchQuery, mt, Pt, bn, on],
  );
  let nameWidth = Q(
    () =>
      getSourceTitle({
        items: unifiedItems,
        healthByPluginName: skillHealthData,
        columns,
      }),
    [unifiedItems, skillHealthData, columns],
  );
  let ao = Q(() => {
    let flattened = Ft.flatMap((X) => (X.kind === "item" && X.section === "attention" ? [X.item] : []));
    return flattened.every((X) => X.type === "mcp" && X.status === "needs-auth") ? flattened.length : 0;
  }, [Ft]);
  let Yn = ce(
    (E, X) => {
      let ee = X === -1 ? Math.min(E, Ft.length - 1) : E;
      for (let ge = ee; ge >= 0 && ge < Ft.length; ge += X) if (isListNavItem(Ft[ge])) return ge;
      return -1;
    },
    [Ft],
  );
  let [_n, jn] = y(0);
  let Ro = R(null);
  P(() => {
    if (Ft.length === 0) return;
    let E = Ro.current;
    if (E) {
      Ro.current = null;
      let index = Ft.findIndex((ee) => ee.kind === "item" && ee.section === E.section && ee.item.id === E.id);
      if (index === -1) index = Ft.findIndex((item_5) => item_5.kind === "item" && item_5.item.id === E.id);
      if (index !== -1) {
        jn(index);
        return;
      }
    }
    if (!isListNavItem(Ft[_n])) {
      let X = Yn(_n, 1);
      let ee = Yn(_n, -1);
      jn(X !== -1 ? X : ee !== -1 ? ee : 0);
    }
  }, [Ft, _n, Yn]);
  let Si = isTerminalFocused_2 ? Math.max(8, rows - 10) : 8;
  let firstSelectableIndex = Q(() => Math.max(0, Ft.findIndex(isListNavItem)), [Ft]);
  let client = typeof viewState === "object" && "client" in viewState ? viewState.client : undefined;
  let Xo = Q(() => (client ? describeMcpServerOrigin(client.name, client.config) : undefined), [client]);
  let pagination = usePagination({
    totalItems: Ft.length,
    selectedIndex: _n,
    maxVisible: Si,
    firstSelectableIndex,
    onScroll: (E) =>
      jn((X) => {
        let min = Math.min(E + Si, Ft.length);
        if (X >= E && X < min) return X;
        let ge = (Re) => (Re >= E && Re < min ? Re : -1);
        let ye = X < E ? ge(Yn(E, 1)) : ge(Yn(min - 1, -1));
        return ye === -1 ? X : ye;
      }),
  });
  let [$c, Ac] = y();
  let [configNeeded, setConfigNeeded] = y(null);
  let [_isLoadingConfig, setIsLoadingConfig] = y(false);
  let [selectedPluginHasMcpb, setSelectedPluginHasMcpb] = y(false);
  P(() => {
    if (!selectedPlugin) {
      setSelectedPluginHasMcpb(false);
      return;
    }
    async function detectMcpb() {
      let mcpServersSpec = selectedPlugin.plugin.manifest.mcpServers;
      let hasMcpb = false;
      if (mcpServersSpec)
        hasMcpb =
          (typeof mcpServersSpec === "string" && isMcpbSource(mcpServersSpec)) ||
          (Array.isArray(mcpServersSpec) &&
            mcpServersSpec.some((s_2) => typeof s_2 === "string" && isMcpbSource(s_2)));
      if (!hasMcpb)
        try {
          let marketplaceJsonContent = await readMarketplaceJsonContent(storageV5, selectedPlugin.plugin);
          let marketplace = jsonParse(stripBom(marketplaceJsonContent));
          let bt = parsePluginIdentifier(selectedPlugin.plugin.source).name;
          let entry = marketplace.plugins?.find(
            (plugin) => plugin.name === bt || plugin.name === selectedPlugin.plugin.name,
          );
          if (entry?.mcpServers) {
            let spec = entry.mcpServers;
            hasMcpb =
              (typeof spec === "string" && isMcpbSource(spec)) ||
              (Array.isArray(spec) && spec.some((s_3) => typeof s_3 === "string" && isMcpbSource(s_3)));
          }
        } catch (err) {
          logForDebugging(`Failed to read raw marketplace.json: ${err}`);
        }
      if (!X) setSelectedPluginHasMcpb(hasMcpb);
    }
    let X = false;
    detectMcpb();
    return isStorageV5Enabled() && storageV5 !== undefined
      ? () => {
          X = true;
        }
      : undefined;
  }, [selectedPlugin, storageV5]);
  P(() => {
    let E = qt > 0;
    async function loadInstalledPlugins() {
      if (!E) setLoading(true);
      try {
        let { enabled, disabled } = await loadAllPlugins(storageV5, credentials);
        let allPlugins = dropPolicyBlockedPlugins([...enabled, ...disabled]);
        let pluginsByMarketplace = {};
        for (let plugin of allPlugins) {
          let marketplace = marketplaceSuffix(plugin.source) ?? "local";
          if (!pluginsByMarketplace[marketplace]) pluginsByMarketplace[marketplace] = [];
          pluginsByMarketplace[marketplace].push(plugin);
        }
        let marketplaceInfos = [];
        let enabledPluginsBySource = getEnabledPluginsBySource();
        for (let [name, plugins] of Object.entries(pluginsByMarketplace)) {
          let enabledCount = count(plugins, (Xt) => {
            let pluginInSettings = findPluginInSettings_2(Xt.source);
            return isPluginEffectivelyEnabled(pluginInSettings, Xt, enabledPluginsBySource);
          });
          let disabledCount = plugins.length - enabledCount;
          marketplaceInfos.push({
            name,
            installedPlugins: plugins,
            enabledCount,
            disabledCount,
          });
        }
        marketplaceInfos.sort((st, it) => {
          if (st.name === ANTHROPIC_PLUGIN_DIRECTORY) return -1;
          if (it.name === ANTHROPIC_PLUGIN_DIRECTORY) return 1;
          return st.name.localeCompare(it.name);
        });
        setMarketplaces(marketplaceInfos);
        let allStates = [];
        for (let marketplace of marketplaceInfos)
          for (let plugin of marketplace.installedPlugins) {
            let scope = plugin.isBuiltin
              ? "builtin"
              : (plugin.scope ?? getPluginInstallationFromV2(plugin.source).scope);
            allStates.push({
              plugin,
              marketplace: marketplace.name,
              scope,
              pendingEnable: undefined,
              pendingUpdate: false,
            });
          }
        setPluginStates(allStates);
        if (!E) jn(0);
      } finally {
        setLoading(false);
      }
    }
    loadInstalledPlugins();
  }, [qt, storageV5, credentials]);
  P(() => {
    if (Fn.current) return;
    let E = marketplaces.length > 0 || unifiedItems.some((unified) => unified.type === "failed-plugin");
    if (targetPlugin && E && !loading) {
      let { name: X, marketplace: targetMktFromId } =
        targetMarketplace !== undefined
          ? {
              name: targetPlugin,
              marketplace: undefined,
            }
          : parsePluginIdentifier(normalizePluginId(targetPlugin));
      let ge = targetMarketplace ?? targetMktFromId;
      let ye = ge === undefined ? undefined : normalizeReservedMarketplaceCase(ge);
      let marketplacesToSearch = ye ? marketplaces.filter((m) => m.name === ye) : marketplaces;
      for (let marketplace of marketplacesToSearch) {
        let plugin = marketplace.installedPlugins.find(
          (p_0) =>
            pluginNamesEqual(p_0.name, X) || pluginNamesEqual(parsePluginIdentifier(p_0.source).name, X),
        );
        if (plugin) {
          let scope = plugin.scope ?? getPluginInstallationFromV2(plugin.source).scope;
          let pluginState = {
            plugin,
            marketplace: marketplace.name,
            scope,
            pendingEnable: undefined,
            pendingUpdate: false,
          };
          setSelectedPlugin(pluginState);
          setViewState_2("plugin-details");
          pendingAutoActionRef_2.current = action;
          Fn.current = true;
          return;
        }
      }
      let failedItem = unifiedItems.find(
        (item) =>
          item.type === "failed-plugin" && pluginNamesEqual(item.name, X) && (!ye || item.marketplace === ye),
      );
      if (failedItem && failedItem.type === "failed-plugin") {
        setViewState_2({
          type: "failed-plugin-details",
          plugin: {
            id: failedItem.id,
            name: failedItem.name,
            marketplace: failedItem.marketplace,
            errors: failedItem.errors,
            scope: failedItem.scope,
          },
        });
        Fn.current = true;
      }
      if (!Fn.current && action) {
        Fn.current = true;
        setResult(`Plugin "${targetPlugin}" is not installed in this project`);
      }
    }
  }, [targetPlugin, targetMarketplace, marketplaces, loading, unifiedItems, action, setResult]);
  let handleSingleOperation = async (operation) => {
    if (Ce.current) return;
    if (!selectedPlugin) return;
    let pluginScope = selectedPlugin.scope || "user";
    let isBuiltin = pluginScope === "builtin";
    if (isBuiltin && (operation === "update" || operation === "uninstall")) {
      ke("Built-in plugins cannot be updated or uninstalled.");
      return;
    }
    if (!isBuiltin && !isInstallableScope(pluginScope) && operation !== "update") {
      ke(MANAGED_PLUGIN_DISABLE_MESSAGE);
      return;
    }
    Ce.current = true;
    We(true);
    ke(null);
    try {
      let pluginId = at;
      let ye;
      let Re;
      let bt;
      switch (operation) {
        case "enable": {
          let enableResult = await enablePluginOp(pluginId, undefined, storageV5);
          if (!enableResult.success) throw Error(enableResult.message);
          logPluginToggleScreen({
            operation: "enable",
            pluginId: enableResult.pluginId || pluginId,
            scope: enableResult.scope,
            storageV5,
          });
          break;
        }
        case "disable": {
          let disableResult = await disablePluginOp(pluginId, undefined, storageV5);
          if (!disableResult.success) throw Error(disableResult.message);
          logPluginToggleScreen({
            operation: "disable",
            pluginId: disableResult.pluginId || pluginId,
            scope: disableResult.scope,
            storageV5,
          });
          ye = disableResult.reverseDependents;
          break;
        }
        case "uninstall": {
          if (isBuiltin) break;
          if (!isInstallableScope(pluginScope)) break;
          if (isPluginEnabledAtProjectScope(pluginId)) {
            We(false);
            setViewState_2("confirm-project-uninstall");
            return;
          }
          let installs = getInstalledPlugins().plugins[pluginId];
          let Xt = !installs || installs.length <= 1 ? await getPluginDataDirSize(pluginId) : null;
          if (Xt) {
            We(false);
            setViewState_2({
              type: "confirm-data-cleanup",
              size: Xt,
            });
            return;
          }
          let Vt = await uninstallPluginOp(pluginId, pluginScope, undefined, storageV5);
          if (!Vt.success) throw Error(Vt.message);
          logPluginToggleScreen({
            operation: "uninstall",
            pluginId: Vt.pluginId || pluginId,
            scope: Vt.scope || pluginScope,
            savedKept: Vt.savedKept !== undefined,
            storageV5,
          });
          ye = Vt.reverseDependents;
          Re = Vt.directoryNameNote;
          bt = [Vt.savedKept?.note, Vt.olderLocalSettingsSkippedNote]
            .filter((Fe) => Fe !== undefined)
            .join(" ");
          break;
        }
        case "update": {
          if (isBuiltin) break;
          let De = await updatePluginOp(
            pluginId,
            pluginScope,
            {
              explicit: true,
              consentedEntryHelper: hasAutoNavigated.pinned(),
            },
            storageV5,
          );
          switch (De.outcome) {
            case "failed":
              if (
                De.failureCode === "entry_helper_unshown" ||
                De.failureCode === "entry_helper_changed" ||
                De.failureCode === "entry_archive_url_changed"
              )
                Yt((cn) => cn + 1);
              throw Error(De.message);
            case "up_to_date":
            case "skipped":
              setResult(De.message);
              await onManageComplete();
              setViewState({
                type: "menu",
              });
              return;
            case "updated":
              break;
          }
          break;
        }
      }
      refreshPluginCaches(storageV5, credentials);
      xn((De) => {
        if (!De.has(pluginId)) return De;
        let cn = new Map(De);
        cn.delete(pluginId);
        return cn;
      });
      if (operation === "disable" || operation === "uninstall") wn(operation, at);
      let enabledAfter = isPluginEffectivelyEnabled(
        pluginId,
        selectedPlugin.plugin,
        getEnabledPluginsBySource(),
      );
      if (operation !== "uninstall" && operation !== "update" && enabledAfter) {
        We(false);
        setViewState_2({
          type: "plugin-options",
        });
        return;
      }
      let operationName =
        operation === "enable"
          ? "Enabled"
          : operation === "disable"
            ? "Disabled"
            : operation === "update"
              ? "Updated"
              : "Uninstalled";
      let st = ye && ye.length > 0 ? ` \xB7 required by ${ye.join(", ")}` : "";
      let message = `${figures_default.tick} ${operationName} ${getPluginDisplayName(selectedPlugin.plugin)}${st}.${Re === undefined ? "" : ` ${stripInvisibleKeepEmoji(Re)}`}${bt === undefined || bt === "" ? "" : ` ${stripInvisibleKeepEmoji(bt)}`}`;
      if (operation === "update") {
        setResult(message);
        await onManageComplete();
        setViewState({
          type: "menu",
        });
      } else
        _t(
          `${message} ${Mt}`,
          operation === "uninstall" ? await listUnscopedPluginForProject(pluginId, storageV5) : [],
        );
    } catch (error) {
      We(false);
      let errorMessage = error instanceof Error ? error.message : String(error);
      ke(`Failed to ${operation}: ${errorMessage}`);
      logForDebugging(`Failed to ${operation} plugin: ${errorMessage}`, {
        level: "error",
      });
    } finally {
      Ce.current = false;
    }
  };
  let handleSingleOperationRef = Oo(handleSingleOperation);
  P(() => {
    if (viewState === "plugin-details" && selectedPlugin && pendingAutoActionRef_2.current) {
      let pending = pendingAutoActionRef_2.current;
      pendingAutoActionRef_2.current = undefined;
      if (pending === "configure") {
        let userConfig = selectedPlugin.plugin.manifest.userConfig;
        if (userConfig && Object.keys(userConfig).length > 0)
          setViewState_2({
            type: "configuring-options",
            schema: userConfig,
          });
        else
          setResult(`Plugin "${marketplaceSource(selectedPlugin.plugin)}" declares no userConfig options.`);
        return;
      }
      handleSingleOperationRef(pending);
    }
  }, [viewState, selectedPlugin, setResult]);
  let handleToggle = ce(async () => {
    let E = Ft[_n];
    if (!isListNavItem(E)) return;
    if (E.kind === "disabled-header") {
      kn((ee) => !ee);
      return;
    }
    let item = E.item;
    if (item.type === "flagged-plugin") return;
    if (item.type === "plugin") {
      let id = item.id;
      let currentPending = mn.get(id);
      let ye = isPluginEffectivelyEnabled(id, item.plugin, nn);
      let pluginScope = item.scope;
      let bt = pluginScope === "builtin";
      if (isRequiredPlugin(id, item.plugin.installationPreference)) {
        ke(requiredPluginMessage(id));
        return;
      }
      if (bt || isInstallableScope(pluginScope)) {
        if (Rn.current.has(id)) return;
        Rn.current.add(id);
        rn((tt) => new Set(tt).add(id));
        let newPending = new Map(mn);
        if (currentPending) {
          newPending.delete(id);
          ke(null);
          let tt = (async () => {
            try {
              let st =
                currentPending === "will-disable"
                  ? await enablePluginOp(id, undefined, storageV5)
                  : await disablePluginOp(id, undefined, storageV5);
              if (!st.success && !st.alreadyInGoalState) {
                xn((it) => {
                  let De = new Map(it);
                  De.set(id, currentPending);
                  return De;
                });
                ke(st.message);
                return;
              }
              if (st.success)
                logPluginToggleScreen({
                  operation: currentPending === "will-disable" ? "enable" : "disable",
                  pluginId: st.pluginId || id,
                  scope: st.scope,
                  storageV5,
                });
              refreshPluginCaches(storageV5, credentials);
            } catch (err_0) {
              xn((it) => {
                let De = new Map(it);
                De.set(id, currentPending);
                return De;
              });
              ke(`Failed to reverse the toggle: ${errorMessage(err_0)}`);
              logError(
                withTelemetryMessage(toError(err_0), "/plugin: reversing a pending toggle on the list threw"),
              );
            } finally {
              Rn.current.delete(id);
            }
          })();
          Nt(tt);
        } else {
          newPending.set(id, ye ? "will-disable" : "will-enable");
          ke(null);
          let tt = (async () => {
            try {
              let st = ye
                ? await disablePluginOp(id, undefined, storageV5)
                : await enablePluginOp(id, undefined, storageV5);
              if (!st.success) {
                xn((it) => {
                  let De = new Map(it);
                  De.delete(id);
                  return De;
                });
                ke(st.message);
                return;
              }
              logPluginToggleScreen({
                operation: ye ? "disable" : "enable",
                pluginId: st.pluginId || id,
                scope: st.scope,
                storageV5,
              });
              refreshPluginCaches(storageV5, credentials);
              onManageComplete();
              if (ye) wn("disable", id);
            } catch (err_1) {
              xn((it) => {
                let De = new Map(it);
                De.delete(id);
                return De;
              });
              ke(`Failed to toggle: ${errorMessage(err_1)}`);
              logError(withTelemetryMessage(toError(err_1), "/plugin: toggling a plugin on the list threw"));
            } finally {
              Rn.current.delete(id);
            }
          })();
          Nt(tt);
        }
        xn(newPending);
      }
    } else if (item.type === "mcp") {
      ke(null);
      let ee = item.client.type !== "disabled" ? "disable" : "enable";
      mcpToggleEnabled(item.client.name).catch((error) => {
        ke(
          formatMcpOperationFailure(error, item.client.name, ee, {
            config: item.client.config,
            persistsOffBox: false,
          }),
        );
      });
    } else if (item.type === "skill") {
      if (sn.current.has(item.id)) return;
      let ee = nextSkillOverrideState(item.override, item.lockSource);
      if (ee === item.override) return;
      sn.current.add(item.id);
      rn((ye) => new Set(ye).add(item.id));
      let { error } = await updateSettingsForSource(
        "localSettings",
        {
          skillOverrides: {
            [item.cmdName]: diffSkillOverrideFromSettings(item, ee),
          },
        },
        undefined,
        storageV5,
      );
      sn.current.delete(item.id);
      if (error) {
        ke(error.message);
        return;
      }
      Ut((ye) => ye + 1);
    }
  }, [_n, Ft, mn, pluginStates, mcpToggleEnabled, wn, onManageComplete, Nt, storageV5, credentials, nn]);
  let handleAccept = ce(() => {
    let E = Ft[_n];
    if (!isListNavItem(E)) return;
    if (E.kind === "disabled-header") {
      kn((ee) => !ee);
      return;
    }
    let item = E.item;
    if (item.type === "plugin") {
      let state = pluginStates.find((s_4) => s_4.plugin.source === item.plugin.source);
      if (state) {
        setSelectedPlugin(state);
        setViewState_2("plugin-details");
        Ac(undefined);
        ke(null);
        Jt(null);
      }
    } else if (item.type === "flagged-plugin") {
      setViewState_2({
        type: "flagged-detail",
        plugin: {
          id: item.id,
          name: item.name,
          marketplace: item.marketplace,
          reason: item.reason,
          text: item.text,
          flaggedAt: item.flaggedAt,
        },
      });
      ke(null);
    } else if (item.type === "failed-plugin") {
      setViewState_2({
        type: "failed-plugin-details",
        plugin: {
          id: item.id,
          name: item.name,
          marketplace: item.marketplace,
          errors: item.errors,
          scope: item.scope,
        },
      });
      ke(null);
    } else if (item.type === "mcp") {
      setViewState_2({
        type: "mcp-detail",
        client: item.client,
      });
      ke(null);
    } else if (item.type === "skill") {
      setViewState_2({
        type: "skill-detail",
        skill: item,
      });
      ke(null);
    }
  }, [_n, Ft, pluginStates]);
  MessageActionsKeybindings(
    {
      "select:previous": () => {
        let E = Yn(_n - 1, -1);
        if (E === -1) {
          if (!loading && unifiedItems.length > 0) he(true);
        } else pagination.handleSelectionChange(E, jn);
      },
      "select:next": () => {
        let E = Yn(_n + 1, 1);
        if (E !== -1) pagination.handleSelectionChange(E, jn);
      },
      "select:accept": handleAccept,
    },
    {
      context: "Select",
      isActive: viewState === "plugin-list" && !ne,
    },
  );
  let Gm = ce(() => {
    let E = Ft[_n];
    if (E?.kind !== "item") return false;
    Ro.current = {
      section: E.section,
      id: E.item.id,
    };
    en(E.item.id);
  }, [Ft, _n, en]);
  MessageActionsKeybindings(
    {
      "plugin:toggle": handleToggle,
      "plugin:favorite": Gm,
    },
    {
      context: "Plugin",
      isActive: viewState === "plugin-list" && !ne,
    },
  );
  let handleFlaggedDismiss = ce(() => {
    if (typeof viewState !== "object" || viewState.type !== "flagged-detail") return;
    removeFlaggedPlugin(viewState.plugin.id, storageV5);
    setViewState_2("plugin-list");
  }, [viewState, storageV5]);
  MessageActionsKeybindings(
    {
      "select:accept": handleFlaggedDismiss,
    },
    {
      context: "Select",
      isActive: typeof viewState === "object" && viewState.type === "flagged-detail",
    },
  );
  let Bc = Q(() => {
    if (viewState !== "plugin-details" || !selectedPlugin) return [];
    let E = at;
    let X = isPluginEffectivelyEnabled(E, selectedPlugin.plugin, nn);
    let ee = selectedPlugin.marketplace === "builtin";
    let ge = isOfficialMarketplace(selectedPlugin.marketplace);
    let ye = [];
    if (!isRequiredPlugin(E, selectedPlugin.plugin.installationPreference))
      ye.push({
        value: "toggle-enabled",
        label: X ? "Disable plugin" : "Enable plugin",
        action: () => void handleSingleOperation(X ? "disable" : "enable"),
      });
    ye.push({
      value: "favorite",
      label: mt.has(E) ? "Remove from favorites" : "Add to favorites",
      action: () => en(E),
    });
    if (!ee && !ge) {
      ye.push({
        value: "mark-for-update",
        label: selectedPlugin.pendingUpdate ? "Unmark for update" : "Mark for update",
        action: async () => {
          try {
            let localError = await checkIfLocalPlugin(
              parsePluginIdentifier(E).name,
              selectedPlugin.marketplace,
              storageV5,
            );
            if (localError) {
              ke(localError);
              return;
            }
            let newStates = [...pluginStates];
            let index = newStates.findIndex((s_5) => s_5.plugin.source === selectedPlugin.plugin.source);
            if (index !== -1) {
              newStates[index].pendingUpdate = !selectedPlugin.pendingUpdate;
              setPluginStates(newStates);
              setSelectedPlugin({
                ...selectedPlugin,
                pendingUpdate: !selectedPlugin.pendingUpdate,
              });
            }
          } catch (error) {
            ke(error instanceof Error ? error.message : "Failed to check plugin update availability");
          }
        },
      });
      if (selectedPluginHasMcpb)
        ye.push({
          value: "configure",
          label: "Configure",
          action: async () => {
            setIsLoadingConfig(true);
            try {
              let mcpServersSpec = selectedPlugin.plugin.manifest.mcpServers;
              let mcpbPath = null;
              if (typeof mcpServersSpec === "string" && isMcpbSource(mcpServersSpec))
                mcpbPath = mcpServersSpec;
              else if (Array.isArray(mcpServersSpec)) {
                for (let spec of mcpServersSpec)
                  if (typeof spec === "string" && isMcpbSource(spec)) {
                    mcpbPath = spec;
                    break;
                  }
              }
              if (!mcpbPath) {
                ke("No MCPB file found in plugin");
                setIsLoadingConfig(false);
                return;
              }
              let pluginId = at;
              let result = await loadMcpbFile(
                mcpbPath,
                selectedPlugin.plugin.path,
                pluginId,
                undefined,
                undefined,
                true,
                storageV5,
              );
              if ("status" in result && result.status === "needs-config") {
                setConfigNeeded(result);
                setViewState_2("configuring");
              } else ke("Failed to load MCPB for configuration");
            } catch (err) {
              let errorMsg = errorMessage(err);
              ke(`Failed to load configuration: ${errorMsg}`);
            } finally {
              setIsLoadingConfig(false);
            }
          },
        });
      ye.push({
        value: "update",
        label: jsxProd_default(Text, {
          color: "suggestion",
          children: "Update now",
        }),
        action: () => void handleSingleOperation("update"),
      });
      ye.push({
        value: "uninstall",
        label: jsxProd_default(Text, {
          color: "error",
          children: "Uninstall",
        }),
        action: () => void handleSingleOperation("uninstall"),
      });
    }
    if (
      selectedPlugin.plugin.manifest.userConfig &&
      Object.keys(selectedPlugin.plugin.manifest.userConfig).length > 0
    )
      ye.push({
        value: "configure-options",
        label: "Configure options",
        action: () => {
          setViewState_2({
            type: "configuring-options",
            schema: selectedPlugin.plugin.manifest.userConfig,
          });
        },
      });
    let Re = redactUrlCredentials(selectedPlugin.plugin.manifest.homepage);
    if (Re)
      ye.push({
        value: "homepage",
        label: "Open homepage",
        action: () => void openValidatedUrlSucceeded(Re),
      });
    let bt = redactUrlCredentials(selectedPlugin.plugin.manifest.repository);
    if (bt)
      ye.push({
        value: "repository",
        label: "View repository",
        action: () => void openValidatedUrlSucceeded(bt),
      });
    if (lanternPrismEnabled())
      ye.push({
        value: "usage",
        label: "Usage",
        action: () => setViewState_2("plugin-usage"),
      });
    if (Ln && !ee && !ge) {
      let $e = Ln;
      ye.push({
        value: "switch-copy",
        label: `Switch to ${truncateMarketplaceLabel($e.marketplace)}`,
        action: () => {
          ke(null);
          setViewState_2({
            type: "confirm-switch-copy",
            copy: $e,
          });
        },
      });
    }
    ye.push({
      value: "back",
      label: "Back to plugin list",
      action: () => {
        setViewState_2("plugin-list");
        setSelectedPlugin(null);
        ke(null);
      },
    });
    return ye;
  }, [viewState, selectedPlugin, selectedPluginHasMcpb, pluginStates, mt, en, storageV5, nn, Ln]);
  MessageActionsKeybindings(
    {
      "select:accept": () => {
        if (typeof viewState === "object" && viewState.type === "failed-plugin-details")
          (async () => {
            We(true);
            ke(null);
            let pluginId_7 = viewState.plugin.id;
            let pluginScope_1 = viewState.plugin.scope;
            let ee = await uninstallPluginOp(
              pluginId_7,
              isInstallableScope(pluginScope_1) ? pluginScope_1 : "user",
              false,
              storageV5,
              {
                settingsStillOn: "remove-anyway",
              },
            );
            if (ee.success && ee.pluginId)
              logPluginToggleScreen({
                operation: "uninstall",
                pluginId: ee.pluginId,
                scope: ee.scope || (isInstallableScope(pluginScope_1) ? pluginScope_1 : "user"),
                savedKept: ee.savedKept !== undefined,
                storageV5,
              });
            let success = ee.success;
            let ye = 0;
            let Re;
            if (!success) {
              for (let De of EDITABLE_SETTING_SOURCES) {
                let settingsForSourceForUpkeep = getSettingsForSourceForUpkeep(De);
                let pluginName = findPluginName(
                  Object.keys(settingsForSourceForUpkeep?.enabledPlugins ?? {}),
                  pluginId_7,
                );
                if (pluginName !== undefined) {
                  let { error } = await updateSettingsForSourceWithTransform(
                    De,
                    (Fe) => ({
                      enabledPlugins: {
                        ...Fe?.enabledPlugins,
                        [pluginName]: undefined,
                      },
                    }),
                    undefined,
                    storageV5,
                  );
                  if (error) {
                    Re = error;
                    break;
                  }
                  ye++;
                  success = true;
                }
              }
              refreshPluginCaches(storageV5, credentials);
            }
            if (Re) {
              if (ye > 0) onManageComplete();
              We(false);
              ke(
                ye > 0
                  ? `Removed ${stripInvisibleKeepEmoji(viewState.plugin.name)} from ${ye} ${plural(ye, "settings file")}. Failed to write another: ${Re.message}`
                  : `Failed to write settings: ${Re.message}`,
              );
              return;
            }
            let installedPlugins = await loadInstalledPlugins(storageV5);
            let $e = hasFailedInstalledPluginsRead(installedPlugins)
              ? getInstalledPlugins()
              : installedPlugins;
            let editableSources = [
              ...Object.entries($e.plugins).flatMap(([key, value]) =>
                hasInstallationForCurrentProject(value) ? [key] : [],
              ),
              ...EDITABLE_SETTING_SOURCES.flatMap((De) =>
                Object.keys(getSettingsForSourceForUpkeep(De)?.enabledPlugins ?? {}),
              ),
              ...getPluginEditableScopes().keys(),
            ];
            let any = editableSources.some((editableSource) => pluginNamesEqual(editableSource, pluginId_7));
            let it =
              !success &&
              !mergePluginErrors(pluginId_7) &&
              !viewState.plugin.errors.some(isOrphanPlugin) &&
              isUninstalledPluginFailure(ee, pluginId_7, editableSources);
            if (success || it) {
              let De = stripInvisibleKeepEmoji(viewState.plugin.name);
              let cn = ee.success
                ? `${stripInvisibleKeepEmoji(ee.message)} \xB7 data preserved`
                : success
                  ? `Removed ${De} from settings`
                  : `Removed ${De} from the list. It is not installed.`;
              _t(
                `${figures_default.tick} ${cn}`,
                ee.success
                  ? await listUnscopedPluginForProject(pluginId_7, storageV5)
                  : any
                    ? []
                    : [pluginId_7],
              );
            } else {
              We(false);
              ke(stripInvisibleKeepEmoji(ee.message));
            }
          })().catch((error) => {
            We(false);
            ke(stripInvisibleKeepEmoji(errorMessage(error)));
          });
      },
    },
    {
      context: "Select",
      isActive:
        typeof viewState === "object" &&
        viewState.type === "failed-plugin-details" &&
        viewState.plugin.scope !== "managed" &&
        !isOfficialMarketplace(viewState.plugin.marketplace),
    },
  );
  function Ym(event) {
    if (event.ctrl || event.meta || wt) return;
    if (!selectedPlugin) return;
    let X = at;
    if (event.key === "y" || event.key === "Y" || event.key === "return") {
      event.preventDefault();
      if (managedPluginRefusal(X) !== undefined) return;
      We(true);
      ke(null);
      (async () => {
        try {
          let { error } = await updateSettingsForSourceWithTransform(
            "localSettings",
            (ge) => ({
              enabledPlugins: {
                ...ge?.enabledPlugins,
                [X]: false,
              },
            }),
            undefined,
            storageV5,
          );
          if (error) {
            We(false);
            ke(`Failed to write settings: ${error.message}`);
            return;
          }
          logPluginToggleScreen({
            operation: "disable",
            pluginId: X,
            scope: "local",
            storageV5,
          });
          refreshPluginCaches(storageV5, credentials);
          wn("disable", X);
          _t(
            `${figures_default.tick} Disabled ${getPluginDisplayName(selectedPlugin.plugin)} in .claude/settings.local.json${flagSettingsEnabledNote(X)}. ${Mt}`,
          );
        } catch (error) {
          We(false);
          ke(errorMessage(error));
        }
      })();
    } else if (event.key === "u" || event.key === "U") {
      event.preventDefault();
      We(true);
      ke(null);
      (async () => {
        try {
          let originalCwd = getOriginalCwd();
          let ge =
            installationAtTarget(getInstalledPlugins().plugins[X], "project", originalCwd) !== undefined;
          let ye;
          if (ge) {
            let Re = await uninstallPluginOp(X, "project", false, storageV5);
            if (!Re.success) {
              We(false);
              ke(Re.message);
              return;
            }
            logPluginToggleScreen({
              operation: "uninstall",
              pluginId: Re.pluginId || X,
              scope: Re.scope || "project",
              savedKept: Re.savedKept !== undefined,
              storageV5,
            });
            ye = Re.message;
          } else {
            let { error } = await updateSettingsForSourceWithTransform(
              "projectSettings",
              (bt) => {
                let settings = bt?.enabledPlugins ?? {};
                let tt = findPluginName(Object.keys(settings), X) ?? X;
                return {
                  enabledPlugins: {
                    ...settings,
                    [tt]: undefined,
                  },
                };
              },
              undefined,
              storageV5,
            );
            if (error) {
              We(false);
              ke(`Failed to write settings: ${error.message}`);
              return;
            }
            ye = `Removed ${getPluginDisplayName(selectedPlugin.plugin)} from .claude/settings.json`;
          }
          refreshPluginCaches(storageV5, credentials);
          wn("uninstall", X);
          _t(`${figures_default.tick} ${ye}. ${Mt}`, await listUnscopedPluginForProject(X, storageV5));
        } catch (error) {
          We(false);
          ke(errorMessage(error));
        }
      })();
    } else if (event.key === "n" || event.key === "N" || event.key === "escape") {
      event.preventDefault();
      setViewState_2("plugin-details");
      ke(null);
    }
  }
  function Ha(event) {
    {
      if (event.ctrl || event.meta || wt || pendingAutoActionRef.current) return;
      if (!selectedPlugin || typeof viewState !== "object" || viewState.type !== "confirm-switch-copy")
        return;
      let scope = selectedPlugin.scope;
      let copy = viewState.copy;
      let ge = at;
      let settings = getPluginDisplayName(selectedPlugin.plugin);
      if (event.key === "y" || event.key === "Y") {
        event.preventDefault();
        if (
          (scope !== "user" && scope !== "local") ||
          fn !== null ||
          jt.state !== "known" ||
          typeof Ue !== "boolean"
        )
          return;
        let replaceOnlyPluginIds = [
          ...(ge === null ? [] : [ge]),
          ...jt.replaced.map(($e) => $e.pluginId).filter(($e) => $e !== ge),
        ];
        let uncoveredPluginScopes = getUncoveredPluginScopes(jt.replaced, scope, copy.pluginId);
        pendingAutoActionRef.current = true;
        We(true);
        ke(null);
        (async () => {
          try {
            let $e = await installPluginOp(
              copy.pluginId,
              scope,
              {
                replaceInstalledCopy: true,
                replaceOnlyPluginIds,
                surface: "installed_switch",
                ...(ge !== null && {
                  carrySettingsFrom: ge,
                }),
              },
              storageV5,
            );
            if (!$e.success) {
              We(false);
              ke(stripInvisibleKeepEmoji($e.message));
              return;
            }
            refreshPluginCaches(storageV5, credentials);
            let keptDataDir = $e.switched?.keptDataDir;
            let st = new Intl.ListFormat("en", {
              type: "conjunction",
            });
            let settingsRemovedFrom = $e.switched?.settingsRemovedFrom ?? [];
            let savedDataRemovedFrom = $e.switched?.savedDataRemovedFrom ?? [];
            let filtered = settingsRemovedFrom.filter((Gt) => savedDataRemovedFrom.includes(Gt));
            let filtered_2 = settingsRemovedFrom.filter((Gt) => !savedDataRemovedFrom.includes(Gt));
            let filtered_3 = savedDataRemovedFrom.filter((Gt) => !settingsRemovedFrom.includes(Gt));
            let Fe = (Gt) => st.format(Gt.map((item) => displayPluginId(item)));
            let Bt = st.format([
              ...(filtered.length > 0 ? [`the settings and saved data for ${Fe(filtered)}`] : []),
              ...(filtered_2.length > 0 ? [`the settings saved for ${Fe(filtered_2)}`] : []),
              ...(filtered_3.length > 0 ? [`the saved data of ${Fe(filtered_3)}`] : []),
            ]);
            let filtered_4 = uncoveredPluginScopes.filter(
              (uncoveredPluginScope) => !$e.switched?.oldCopyStillRecordedAt?.includes(uncoveredPluginScope),
            );
            _t(
              $e.switched && !$e.switched.messageSaysMore
                ? `${figures_default.tick} Switched ${pluginDisplayLabel(settings)} to ${truncateMarketplaceLabel(copy.marketplace)}${
                    $e.switched.replaced.length > 1
                      ? ` from ${new Intl.ListFormat("en", {
                          type: "conjunction",
                        }).format(
                          $e.switched.replaced.map((Gt) =>
                            truncateMarketplaceLabel(parsePluginIdentifier(Gt).marketplace ?? ""),
                          ),
                        )}`
                      : ""
                  }.${$e.switched.keptOwnSettings ? ` ${capitalize(displayPluginId(copy.pluginId))} kept its own settings${Bt === "" ? "" : `, and ${Bt} were removed`}.` : Bt === "" ? "" : ` ${capitalize(Bt)} were removed.`}${$e.switched.stayedDisabled ? " It stays disabled, as before." : ""}${
                    filtered_4.length === 0
                      ? ""
                      : ` It is no longer installed at ${new Intl.ListFormat("en", {
                          type: "conjunction",
                        }).format(filtered_4)} scope.`
                  }${keptDataDir === undefined ? "" : ` ${describeKeptDataDir(keptDataDir, copy.pluginId)}.`} ${Mt}`
                : `${figures_default.tick} ${stripInvisibleKeepEmoji($e.message)}${
                    $e.switched
                      ? `.${
                          filtered_4.length === 0
                            ? ""
                            : ` It is no longer installed at ${new Intl.ListFormat("en", {
                                type: "conjunction",
                              }).format(filtered_4)} scope.`
                        } ${Mt}`
                      : ""
                  }`,
              (
                await Promise.all(
                  ($e.switched?.replaced ?? (ge === null ? [] : [ge])).map((Gt) =>
                    listUnscopedPluginForProject(Gt, storageV5),
                  ),
                )
              ).flat(),
            );
          } catch (error) {
            We(false);
            ke(stripInvisibleKeepEmoji(errorMessage(error)));
          } finally {
            pendingAutoActionRef.current = false;
          }
        })();
      } else if (event.key === "n" || event.key === "N" || event.key === "escape") {
        event.preventDefault();
        setViewState_2("plugin-details");
        ke(null);
      }
    }
  }
  function qm(event) {
    if (event.ctrl || event.meta || wt) return;
    if (!selectedPlugin) return;
    let X = at;
    let pluginScope = selectedPlugin.scope;
    if (!pluginScope || pluginScope === "builtin" || !isInstallableScope(pluginScope)) return;
    let doUninstall = async (deleteDataDir) => {
      We(true);
      ke(null);
      try {
        let Re = await uninstallPluginOp(X, pluginScope, deleteDataDir, storageV5);
        if (!Re.success) throw Error(Re.message);
        logPluginToggleScreen({
          operation: "uninstall",
          pluginId: Re.pluginId || X,
          scope: Re.scope || pluginScope,
          savedKept: Re.savedKept !== undefined,
          storageV5,
        });
        refreshPluginCaches(storageV5, credentials);
        wn("uninstall", X);
        let suffix = (Re.dataDirKept ?? !deleteDataDir) ? " \xB7 data preserved" : "";
        _t(
          `${figures_default.tick} ${Re.message}${suffix}`,
          await listUnscopedPluginForProject(X, storageV5),
        );
      } catch (e_0) {
        We(false);
        ke(e_0 instanceof Error ? e_0.message : String(e_0));
      }
    };
    if (event.key === "y" || event.key === "Y") {
      event.preventDefault();
      doUninstall(true);
    } else if (event.key === "n" || event.key === "N") {
      event.preventDefault();
      doUninstall(false);
    } else if (event.key === "escape") {
      event.preventDefault();
      setViewState_2("plugin-details");
      ke(null);
    }
  }
  P(() => {
    jn(0);
  }, [searchQuery]);
  function Wm(event) {
    if (ne) {
      handleKeyDown(event);
      return;
    }
    if (event.ctrl || event.meta) return;
    if (event.key === "/") {
      event.preventDefault();
      he(true);
      setSearchQuery("");
      jn(0);
    } else if (event.key.length === 1 && event.key !== " ") {
      event.preventDefault();
      he(true);
      setSearchQuery(event.key);
      jn(0);
    }
  }
  function finish(msg) {
    if (ne) {
      handlePaste(msg);
      return;
    }
    let trimmed = (msg.text.split(/\r\n|\r|\n/, 2)[0] ?? "").trim();
    if (!trimmed) return;
    msg.preventDefault();
    he(true);
    setSearchQuery(trimmed);
    jn(0);
  }
  if (loading)
    return jsxProd_default(Text, {
      children: "Loading installed plugins\u2026",
    });
  if (unifiedItems.length === 0)
    return jsxProd_default_2(Box, {
      flexDirection: "column",
      children: [
        jsxProd_default(Box, {
          marginBottom: 1,
          children: jsxProd_default(Text, {
            bold: true,
            children: "Manage plugins",
          }),
        }),
        ht &&
          jsxProd_default(Box, {
            marginBottom: 1,
            paddingLeft: 2,
            children: jsxProd_default(Text, {
              color: "success",
              children: stripInvisibleKeepNewlines(ht),
            }),
          }),
        jsxProd_default(HintText, {
          children: "No plugins or MCP servers installed.",
        }),
        jsxProd_default(Box, {
          marginTop: 1,
          children: jsxProd_default(Text, {
            dimColor: true,
            children: jsxProd_default(ConfigurableShortcutHint, {
              action: "confirm:no",
              context: "Settings",
              fallback: "Esc",
              description: "go back",
            }),
          }),
        }),
      ],
    });
  if (typeof viewState === "object" && viewState.type === "plugin-options" && selectedPlugin) {
    let pluginId = at;
    return jsxProd_default(PluginOptionsFlow, {
      plugin: selectedPlugin.plugin,
      pluginId,
      onDone: (X, detail, ge) => {
        let pluginDisplayName = getPluginDisplayName(selectedPlugin.plugin);
        switch (X) {
          case "configured":
          case "skipped":
            _t(
              X === "configured" && ge
                ? `${figures_default.tick} Enabled and configured ${pluginDisplayName}. ${Mt}`
                : `${figures_default.tick} Enabled ${pluginDisplayName}. ${Mt}`,
            );
            break;
          case "error":
          case "read-error":
            ke(
              X === "error"
                ? `Failed to save configuration: ${detail}`
                : `Configuration not applied: could not read the saved options (${detail})`,
            );
            We(false);
            xt((Re) => Re + 1);
            setViewState_2("plugin-details");
            onManageComplete();
            break;
        }
      },
    });
  }
  if (typeof viewState === "object" && viewState.type === "configuring-options" && selectedPlugin) {
    let pluginId = at;
    return jsxProd_default(
      PluginOptionsDialogLoader,
      {
        title: `Configure ${getPluginDisplayName(selectedPlugin.plugin)}`,
        subtitle: "Plugin options",
        configSchema: viewState.schema,
        load: () => loadPluginOptions(pluginId, credentials),
        onSave: async (values) => {
          try {
            await savePluginOptions_2(pluginId, values, viewState.schema, storageV5);
            refreshPluginCaches(storageV5, credentials);
            let ee = Object.keys(values).length > 0;
            if (ee) onManageComplete();
            setResult(ee ? "Configuration saved." : "No configuration changes.");
          } catch (err) {
            ke(`Failed to save configuration: ${errorMessage(err)}`);
          }
          setViewState_2("plugin-details");
        },
        onCancel: () => setViewState_2("plugin-details"),
      },
      pluginId,
    );
  }
  if (viewState === "configuring" && configNeeded && selectedPlugin) {
    let onCancel = function () {
      setConfigNeeded(null);
      setViewState_2("plugin-details");
    };
    let E = at;
    async function handleSave(config) {
      if (!configNeeded || !selectedPlugin) return;
      try {
        let mcpServersSpec = selectedPlugin.plugin.manifest.mcpServers;
        let mcpbPath = null;
        if (typeof mcpServersSpec === "string" && isMcpbSource(mcpServersSpec)) mcpbPath = mcpServersSpec;
        else if (Array.isArray(mcpServersSpec)) {
          for (let spec of mcpServersSpec)
            if (typeof spec === "string" && isMcpbSource(spec)) {
              mcpbPath = spec;
              break;
            }
        }
        if (!mcpbPath) {
          ke("No MCPB file found");
          setViewState_2("plugin-details");
          return;
        }
        await loadMcpbFile(mcpbPath, selectedPlugin.plugin.path, E, undefined, config, undefined, storageV5);
        ke(null);
        setConfigNeeded(null);
        setViewState_2("plugin-details");
        onManageComplete();
        setResult("Configuration saved.");
      } catch (err) {
        let errorMsg = errorMessage(err);
        ke(`Failed to save configuration: ${errorMsg}`);
        setViewState_2("plugin-details");
      }
    }
    return jsxProd_default(PluginOptionsDialog, {
      title: `Configure ${trimmedOrUndefined(configNeeded.manifest.display_name) ?? configNeeded.manifest.name}`,
      subtitle: `Plugin: ${getPluginDisplayName(selectedPlugin.plugin)}`,
      configSchema: configNeeded.configSchema,
      initialValues: configNeeded.existingConfig,
      onSave: handleSave,
      onCancel,
    });
  }
  if (typeof viewState === "object" && viewState.type === "flagged-detail") {
    let fp = viewState.plugin;
    return jsxProd_default_2(Box, {
      flexDirection: "column",
      children: [
        jsxProd_default(Box, {
          children: jsxProd_default_2(Text, {
            bold: true,
            children: [
              stripInvisibleKeepEmoji(fp.name),
              " @",
              " ",
              stripInvisibleKeepEmoji(displayMarketplaceName(fp.marketplace)),
            ],
          }),
        }),
        jsxProd_default_2(Box, {
          marginBottom: 1,
          children: [
            jsxProd_default(Text, {
              dimColor: true,
              children: "Status: ",
            }),
            jsxProd_default(Text, {
              color: "error",
              children: "Removed",
            }),
          ],
        }),
        jsxProd_default_2(Box, {
          marginBottom: 1,
          flexDirection: "column",
          children: [
            jsxProd_default_2(Text, {
              color: "error",
              children: ["Removed from marketplace \xB7 reason: ", fp.reason],
            }),
            jsxProd_default(Text, {
              children: fp.text,
            }),
            jsxProd_default_2(Text, {
              dimColor: true,
              children: ["Flagged on ", new Date(fp.flaggedAt).toLocaleDateString()],
            }),
          ],
        }),
        jsxProd_default(Box, {
          marginTop: 1,
          flexDirection: "column",
          children: jsxProd_default_2(TwoColumnRow, {
            active: true,
            children: [
              jsxProd_default_2(Text, {
                "aria-hidden": true,
                children: [figures_default.pointer, " "],
              }),
              jsxProd_default(Text, {
                color: "suggestion",
                children: "Dismiss",
              }),
            ],
          }),
        }),
        jsxProd_default_2(Byline, {
          children: [
            jsxProd_default(ConfigurableShortcutHint, {
              action: "select:accept",
              context: "Select",
              fallback: "Enter",
              description: "dismiss",
            }),
            jsxProd_default(ConfigurableShortcutHint, {
              action: "confirm:no",
              context: "Settings",
              fallback: "Esc",
              description: "go back",
            }),
          ],
        }),
      ],
    });
  }
  if (viewState === "plugin-usage" && selectedPlugin)
    return jsxProd_default(renderSkillListingFootprint, {
      plugin: selectedPlugin.plugin,
    });
  if (viewState === "confirm-project-uninstall" && selectedPlugin) {
    let message = managedPluginRefusal(at)?.message;
    return jsxProd_default_2(FocusColumn, {
      onKeyDown: Ym,
      children: [
        jsxProd_default_2(Text, {
          bold: true,
          color: "warning",
          children: [
            getPluginDisplayName(selectedPlugin.plugin),
            " is enabled in .claude/settings.json (shared with your team)",
          ],
        }),
        message === undefined
          ? jsxProd_default_2(Box, {
              marginTop: 1,
              flexDirection: "column",
              children: [
                jsxProd_default(Text, {
                  children: "Disable it just for you in .claude/settings.local.json?",
                }),
                jsxProd_default(Text, {
                  dimColor: true,
                  children: "The plugin stays installed for the project; only your local override changes.",
                }),
              ],
            })
          : jsxProd_default(Box, {
              marginTop: 1,
              children: jsxProd_default(Text, {
                children: message,
              }),
            }),
        Ve &&
          jsxProd_default(Box, {
            marginTop: 1,
            children: jsxProd_default(ErrorText, {
              error: stripInvisibleKeepNewlines(Ve),
            }),
          }),
        jsxProd_default(Box, {
          marginTop: 1,
          children: wt
            ? jsxProd_default(Text, {
                dimColor: true,
                children: "Processing\u2026",
              })
            : jsxProd_default_2(Byline, {
                children: [
                  message === undefined &&
                    jsxProd_default(KeyboardShortcutHint, {
                      chord: "y",
                      action: "disable for me",
                      bold: true,
                    }),
                  jsxProd_default(KeyboardShortcutHint, {
                    chord: "u",
                    action: "uninstall for everyone",
                    bold: true,
                  }),
                  jsxProd_default(KeyboardShortcutHint, {
                    chord: "escape",
                    action: "cancel",
                    bold: true,
                    format: {
                      keyCase: "lower",
                    },
                  }),
                ],
              }),
        }),
      ],
    });
  }
  if (typeof viewState === "object" && viewState.type === "confirm-switch-copy" && selectedPlugin) {
    let copy = viewState.copy;
    let X = getInstalledPlugins().plugins[at ?? ""];
    let gitCommitSha = findScopedInstallation(X, selectedPlugin.scope)?.gitCommitSha;
    let ge = truncateMarketplaceLabel(copy.marketplace);
    let ye = pluginDisplayLabel(getPluginDisplayName(selectedPlugin.plugin));
    let filteredPluginErrors = (jt.state === "known" ? jt.replaced : []).filter((e_1) => e_1.pluginId !== at);
    let bt = new Intl.ListFormat("en", {
      type: "conjunction",
    });
    let mapped = filteredPluginErrors.map((filteredPluginError) =>
      marketplaceLabel(parsePluginIdentifier(filteredPluginError.pluginId).marketplace ?? ""),
    );
    let tt = marketplaceLabel(copy.marketplace);
    let st = marketplaceLabel(selectedPlugin.marketplace);
    let scope = selectedPlugin.scope ?? "user";
    let De = jt.state === "known" ? getUncoveredPluginScopes(jt.replaced, scope, copy.pluginId) : [];
    let cn =
      jt.state !== "known" || De.length === 0
        ? ""
        : `The switch uninstalls ${bt.format(
            jt.replaced
              .filter((Vt) => Vt.scopes.some((scope_2) => scope_2 !== scope))
              .toSorted((error_3, i_0) => Number(i_0.pluginId === at) - Number(error_3.pluginId === at))
              .map((Vt) => `${displayPluginId(Vt.pluginId)} at ${bt.format(Vt.scopes)} scope`),
          )}, and installs the new copy at ${scope} scope, so the plugin is no longer installed at ${bt.format(De)} scope.`;
    let Xt =
      jt.state === "known"
        ? describeOtherMarketplaceInstall(copy.pluginId, jt.listedName, jt.inOtherProjects)
        : "";
    if (fn !== null)
      return jsxProd_default_2(FocusColumn, {
        onKeyDown: Ha,
        children: [
          jsxProd_default_2(Text, {
            bold: true,
            children: [capitalize(ye), " can't be switched to ", ge, " ", "from here"],
          }),
          jsxProd_default(Box, {
            marginTop: 1,
            children: jsxProd_default(Text, {
              children: stripInvisibleKeepEmoji(fn),
            }),
          }),
          jsxProd_default(Box, {
            marginTop: 1,
            children: jsxProd_default(Byline, {
              children: jsxProd_default(KeyboardShortcutHint, {
                chord: "escape",
                action: "go back",
                bold: true,
              }),
            }),
          }),
        ],
      });
    if (jt.state !== "known" || typeof Ue !== "boolean")
      return jsxProd_default_2(FocusColumn, {
        onKeyDown: Ha,
        children: [
          jsxProd_default_2(Text, {
            bold: true,
            children: ["Switch ", ye, " to ", ge, "?"],
          }),
          jsxProd_default(Box, {
            marginTop: 1,
            children:
              jt.state === "working"
                ? jsxProd_default(Text, {
                    dimColor: true,
                    children: "Working out what will be replaced\u2026",
                  })
                : jt.state === "failed"
                  ? jsxProd_default(Text, {
                      children:
                        "Could not work out what would be replaced, so nothing was changed. Go back and open the plugin again to retry.",
                    })
                  : Ue === undefined
                    ? jsxProd_default(Text, {
                        dimColor: true,
                        children: "Working out what the switch will do\u2026",
                      })
                    : jsxProd_default(Text, {
                        children:
                          "Could not work out what the switch would do with your saved plugin settings, so nothing was changed. Try again.",
                      }),
          }),
          jsxProd_default(Box, {
            marginTop: 1,
            children: jsxProd_default(Byline, {
              children: jsxProd_default(KeyboardShortcutHint, {
                chord: "escape",
                action: "go back",
                bold: true,
              }),
            }),
          }),
        ],
      });
    return jsxProd_default_2(FocusColumn, {
      onKeyDown: Ha,
      children: [
        jsxProd_default_2(Text, {
          bold: true,
          children: ["Switch ", ye, " to ", ge, "?"],
        }),
        jsxProd_default_2(Box, {
          marginTop: 1,
          flexDirection: "column",
          children: [
            jsxProd_default_2(Text, {
              children: [
                "Now:   ",
                displayPluginId(at ?? ""),
                " \xB7",
                " ",
                describePluginVersionPin(at ?? "", gitCommitSha),
              ],
            }),
            filteredPluginErrors.map((filteredPluginError) =>
              jsxProd_default_2(
                Text,
                {
                  children: [
                    "Now:   ",
                    displayPluginId(filteredPluginError.pluginId),
                    " \xB7",
                    " ",
                    describePluginVersionPin(filteredPluginError.pluginId, filteredPluginError.gitCommitSha),
                  ],
                },
                filteredPluginError.pluginId,
              ),
            ),
            jsxProd_default_2(Text, {
              children: [
                "After: ",
                displayPluginId(copy.pluginId),
                " \xB7",
                " ",
                describePluginVersionPin(copy.pluginId, copy.sha),
              ],
            }),
            jsxProd_default_2(Text, {
              dimColor: true,
              children: [
                "Installs it from ",
                tt,
                " and uninstalls the",
                " ",
                filteredPluginErrors.length === 0 ? "one" : "ones",
                " from",
                " ",
                bt.format([st, ...mapped]),
                ".",
                " ",
                selectedPlugin.marketplace === OFFICIAL_MARKETPLACE_NAME
                  ? `The code can differ: the Anthropic Directory installs the commit it lists, and ${tt} installs the commit it pins, or its latest, which can be older or newer than what you have.`
                  : "The code can differ: the Anthropic Directory installs the commit it lists, which can be older or newer than what you have.",
                " ",
                "Updates then come from ",
                tt,
                ".",
                " ",
                formatToggleConsequence({
                  newId: copy.pluginId,
                  openedId: at ?? "",
                  oldInText: st,
                  others: filteredPluginErrors.map((item_9, index_0) => ({
                    pluginId: item_9.pluginId,
                    marketplaceInText: mapped[index_0] ?? "",
                  })),
                  alsoInstalledElsewhere: new Set(jt.alsoInstalledElsewhere),
                  targetKeepsOwn: Ue,
                  removesSavedData: jt.removesSavedData,
                }),
              ],
            }),
          ],
        }),
        cn !== "" &&
          jsxProd_default(Box, {
            marginTop: 1,
            children: jsxProd_default(Text, {
              children: stripInvisibleKeepEmoji(cn),
            }),
          }),
        Xt !== "" &&
          jsxProd_default(Box, {
            marginTop: 1,
            children: jsxProd_default(Text, {
              children: stripInvisibleKeepEmoji(Xt),
            }),
          }),
        Ve &&
          jsxProd_default(Box, {
            marginTop: 1,
            children: jsxProd_default(ErrorText, {
              error: Ve,
            }),
          }),
        jsxProd_default(Box, {
          marginTop: 1,
          children: wt
            ? jsxProd_default(Text, {
                dimColor: true,
                children: "Switching\u2026",
              })
            : jsxProd_default_2(Byline, {
                children: [
                  jsxProd_default(KeyboardShortcutHint, {
                    chord: "y",
                    action: "switch",
                    bold: true,
                  }),
                  jsxProd_default(KeyboardShortcutHint, {
                    chord: ["n", "escape"],
                    action: "cancel",
                    bold: true,
                  }),
                ],
              }),
        }),
      ],
    });
  }
  if (typeof viewState === "object" && viewState.type === "confirm-data-cleanup" && selectedPlugin)
    return jsxProd_default_2(FocusColumn, {
      onKeyDown: qm,
      children: [
        jsxProd_default_2(Text, {
          bold: true,
          children: [
            getPluginDisplayName(selectedPlugin.plugin),
            " has",
            " ",
            viewState.size.human,
            " of persistent data",
          ],
        }),
        jsxProd_default_2(Box, {
          marginTop: 1,
          flexDirection: "column",
          children: [
            jsxProd_default(Text, {
              children: "Delete it along with the plugin?",
            }),
            jsxProd_default(Text, {
              dimColor: true,
              children: pluginDataDirPath(at),
            }),
          ],
        }),
        Ve &&
          jsxProd_default(Box, {
            marginTop: 1,
            children: jsxProd_default(ErrorText, {
              error: stripInvisibleKeepNewlines(Ve),
            }),
          }),
        jsxProd_default(Box, {
          marginTop: 1,
          children: wt
            ? jsxProd_default(Text, {
                dimColor: true,
                children: "Uninstalling\u2026",
              })
            : jsxProd_default_2(Byline, {
                children: [
                  jsxProd_default(KeyboardShortcutHint, {
                    chord: "y",
                    action: "delete",
                    bold: true,
                  }),
                  jsxProd_default(KeyboardShortcutHint, {
                    chord: "n",
                    action: "keep",
                    bold: true,
                  }),
                  jsxProd_default(KeyboardShortcutHint, {
                    chord: "escape",
                    action: "cancel",
                    bold: true,
                    format: {
                      keyCase: "lower",
                    },
                  }),
                ],
              }),
        }),
      ],
    });
  if (viewState === "plugin-details" && selectedPlugin) {
    let E = at;
    let X = isPluginEffectivelyEnabled(E, selectedPlugin.plugin, nn);
    let filtered = pluginErrors.filter((pluginError) =>
      matchesPluginSource(pluginError, E, selectedPlugin.plugin.name),
    );
    let mapped = filtered
      .filter((De) => !isAutoupdateInfoError(De))
      .map((De) => ({
        message: formatSkillErrorMessage(De),
        guidance: getErrorGuidanceText(De),
      }));
    let ye = [
      ...filtered.filter(isAutoupdateInfoError).map((De) => ({
        message: formatSkillErrorMessage(De),
        guidance: getErrorGuidanceText(De),
      })),
      ...pluginWarnings
        .filter((pluginWarning) => matchesPluginSource(pluginWarning, E, selectedPlugin.plugin.name))
        .map((pluginWarning) => ({
          message: pluginWarningText(pluginWarning),
          guidance: pluginWarningFixText(pluginWarning),
        })),
    ];
    let pluginDaysSinceUse = getPluginDaysSinceUse(selectedPlugin.plugin.repository);
    let pluginErrorsSection =
      mapped.length === 0 && ye.length === 0
        ? null
        : jsxProd_default_2(Box, {
            flexDirection: "column",
            marginBottom: 1,
            children: [
              jsxProd_default(PluginMessageList, {
                entries: mapped,
                color: "error",
                noun: "error",
              }),
              jsxProd_default(PluginMessageList, {
                entries: ye,
                color: "warning",
                noun: "note",
              }),
            ],
          });
    let $e = sanitizePluginManifestForDisplay(selectedPlugin.plugin.manifest);
    let gitCommitSha =
      selectedPlugin.marketplace === OFFICIAL_MARKETPLACE_NAME
        ? findScopedInstallation(getInstalledPlugins().plugins[E], selectedPlugin.scope)?.gitCommitSha
        : undefined;
    let st = shortCommitSha(gitCommitSha);
    let it = st ? displayableGitHeadName($e.version) : $e.version;
    return jsxProd_default_2(Box, {
      flexDirection: "column",
      children: [
        jsxProd_default(Box, {
          children: jsxProd_default_2(Text, {
            bold: true,
            children: [
              getPluginDisplayName(selectedPlugin.plugin),
              " @",
              " ",
              isSyncedMarketplacePlugin(E)
                ? CLAUDE_AI_SYNC_LABEL
                : stripInvisibleKeepEmoji(displayMarketplaceName(selectedPlugin.marketplace)),
            ],
          }),
        }),
        jsxProd_default_2(Box, {
          children: [
            jsxProd_default(Text, {
              dimColor: true,
              children: "Scope: ",
            }),
            jsxProd_default(Text, {
              children: selectedPlugin.scope || "user",
            }),
          ],
        }),
        it &&
          jsxProd_default_2(Box, {
            children: [
              jsxProd_default(Text, {
                dimColor: true,
                children: "Version: ",
              }),
              jsxProd_default_2(Text, {
                children: [it, st ? ` \xB7 installed at commit ${st}` : ""],
              }),
            ],
          }),
        !it && st
          ? jsxProd_default_2(Box, {
              children: [
                jsxProd_default(Text, {
                  dimColor: true,
                  children: "Installed at commit: ",
                }),
                jsxProd_default(Text, {
                  children: st,
                }),
              ],
            })
          : null,
        $e.description &&
          jsxProd_default(Box, {
            marginBottom: 1,
            children: jsxProd_default(Text, {
              children: $e.description,
            }),
          }),
        $e.author &&
          jsxProd_default_2(Box, {
            children: [
              jsxProd_default(Text, {
                dimColor: true,
                children: "Author: ",
              }),
              jsxProd_default(Text, {
                children: $e.author.name,
              }),
            ],
          }),
        jsxProd_default_2(Box, {
          marginBottom: 1,
          children: [
            jsxProd_default(Text, {
              dimColor: true,
              children: "Status: ",
            }),
            jsxProd_default(Text, {
              color: X ? "success" : "warning",
              children: X ? "Enabled" : "Disabled",
            }),
            isRequiredPlugin(E, selectedPlugin.plugin.installationPreference) &&
              jsxProd_default(Text, {
                dimColor: true,
                children: " \xB7 Required by your org",
              }),
            selectedPlugin.pendingUpdate &&
              jsxProd_default(Text, {
                color: "suggestion",
                children: " \xB7 Marked for update",
              }),
            pluginDaysSinceUse !== null &&
              jsxProd_default_2(Text, {
                dimColor: true,
                children: [
                  " ",
                  "\xB7 Last used:",
                  " ",
                  pluginDaysSinceUse === 0
                    ? "today"
                    : `${pluginDaysSinceUse} ${plural(pluginDaysSinceUse, "day")} ago`,
                ],
              }),
          ],
        }),
        at &&
          jsxProd_default(
            PluginHeadersHelperWarning,
            {
              pluginId: at,
              verb: "Updating",
              onShown: hasAutoNavigated.record,
            },
            an,
          ),
        jsxProd_default(PluginInstalledComponents, {
          plugin: selectedPlugin.plugin,
          marketplace: selectedPlugin.marketplace,
        }),
        pluginErrorsSection,
        jsxProd_default(Box, {
          marginTop: 1,
          flexDirection: "column",
          children: jsxProd_default(PluginActionSelect, {
            options: Bc,
            onSelect: (De) => Bc.find((cn) => cn.value === De)?.action(),
            selectionDisabled: wt,
            defaultFocusValue: $c,
            onFocus: Ac,
          }),
        }),
        wt &&
          jsxProd_default(Box, {
            marginTop: 1,
            children: jsxProd_default(Text, {
              children: "Processing\u2026",
            }),
          }),
        Ve &&
          jsxProd_default(Box, {
            marginTop: 1,
            children: jsxProd_default(ErrorText, {
              error: stripInvisibleKeepNewlines(Ve),
            }),
          }),
        jsxProd_default(Box, {
          marginTop: 1,
          children: jsxProd_default(Text, {
            dimColor: true,
            italic: true,
            children: jsxProd_default_2(Byline, {
              children: [
                jsxProd_default(ConfigurableShortcutHint, {
                  action: "select:previous",
                  context: "Select",
                  fallback: "\u2191",
                  description: "navigate",
                }),
                jsxProd_default(ConfigurableShortcutHint, {
                  action: "select:accept",
                  context: "Select",
                  fallback: "Enter",
                  description: "select",
                }),
                jsxProd_default(ConfigurableShortcutHint, {
                  action: "confirm:no",
                  context: "Settings",
                  fallback: "Esc",
                  description: "go back",
                }),
              ],
            }),
          }),
        }),
      ],
    });
  }
  if (typeof viewState === "object" && viewState.type === "failed-plugin-details") {
    let failedPlugin = viewState.plugin;
    let firstError = failedPlugin.errors[0];
    let children = firstError ? formatSkillErrorMessage(firstError) : "Failed to load";
    return jsxProd_default_2(Box, {
      flexDirection: "column",
      children: [
        jsxProd_default_2(Text, {
          children: [
            jsxProd_default(Text, {
              bold: true,
              children: stripInvisibleKeepEmoji(failedPlugin.name),
            }),
            jsxProd_default_2(Text, {
              dimColor: true,
              children: [
                " ",
                "@",
                " ",
                stripInvisibleKeepEmoji(displayMarketplaceName(failedPlugin.marketplace)),
              ],
            }),
            jsxProd_default_2(Text, {
              dimColor: true,
              children: [" (", failedPlugin.scope, ")"],
            }),
          ],
        }),
        jsxProd_default(Text, {
          color: "error",
          children,
        }),
        failedPlugin.scope === "managed"
          ? jsxProd_default(Box, {
              marginTop: 1,
              children: jsxProd_default(Text, {
                dimColor: true,
                children: "Managed by your organization \u2014 contact your admin",
              }),
            })
          : isOfficialMarketplace(failedPlugin.marketplace)
            ? null
            : jsxProd_default_2(TwoColumnRow, {
                active: true,
                marginTop: 1,
                children: [
                  jsxProd_default_2(Text, {
                    "aria-hidden": true,
                    color: "suggestion",
                    children: [figures_default.pointer, " "],
                  }),
                  jsxProd_default(Text, {
                    bold: true,
                    children: "Remove",
                  }),
                ],
              }),
        wt &&
          jsxProd_default(Text, {
            children: "Processing\u2026",
          }),
        jsxProd_default(ErrorText, {
          error: Ve && stripInvisibleKeepNewlines(Ve),
        }),
        isOfficialMarketplace(failedPlugin.marketplace) &&
          jsxProd_default(Box, {
            marginTop: 1,
            children: jsxProd_default(Text, {
              dimColor: true,
              children: formatCopyNotLoaded(failedPlugin.marketplace),
            }),
          }),
        jsxProd_default(Box, {
          marginTop: 1,
          children: jsxProd_default(Text, {
            dimColor: true,
            italic: true,
            children: jsxProd_default_2(Byline, {
              children: [
                failedPlugin.scope !== "managed" &&
                  !isOfficialMarketplace(failedPlugin.marketplace) &&
                  jsxProd_default(ConfigurableShortcutHint, {
                    action: "select:accept",
                    context: "Select",
                    fallback: "Enter",
                    description: "remove",
                  }),
                jsxProd_default(ConfigurableShortcutHint, {
                  action: "confirm:no",
                  context: "Settings",
                  fallback: "Esc",
                  description: "go back",
                }),
              ],
            }),
          }),
        }),
      ],
    });
  }
  if (typeof viewState === "object" && viewState.type === "skill-detail") {
    let skill = viewState.skill;
    let X = [skill.override, ...SKILL_STATE_CYCLE_2.filter((ge) => ge !== skill.override)];
    let ee = async (ge) => {
      if (ge === skill.override) return;
      let { error } = await updateSettingsForSource(
        "localSettings",
        {
          skillOverrides: {
            [skill.cmdName]: diffSkillOverrideFromSettings(skill, ge),
          },
        },
        undefined,
        storageV5,
      );
      if (error) {
        ke(error.message);
        return;
      }
      rn((Re) => new Set(Re).add(skill.id));
      Ut((Re) => Re + 1);
      setViewState_2({
        type: "skill-detail",
        skill: {
          ...skill,
          override: ge,
        },
      });
    };
    return jsxProd_default_2(Box, {
      flexDirection: "column",
      gap: 1,
      children: [
        jsxProd_default(Text, {
          bold: true,
          children: skill.name,
        }),
        skill.description &&
          jsxProd_default(Text, {
            dimColor: true,
            children: skill.description,
          }),
        skill.whenToUse &&
          jsxProd_default_2(Text, {
            dimColor: true,
            children: ["When to use: ", skill.whenToUse],
          }),
        jsxProd_default_2(Text, {
          dimColor: true,
          children: ["Source: ", skill.source, " \xB7 ~", skill.tokenEstimate, " tokens"],
        }),
        jsxProd_default_2(Text, {
          dimColor: true,
          children: [
            "Usage:",
            " ",
            skill.usage
              ? `${skill.usage.count}\xD7 \xB7 last used ${skill.usage.daysSinceUse === 0 ? "today" : `${skill.usage.daysSinceUse}d ago`}`
              : "never invoked",
          ],
        }),
        skill.allowedTools &&
          skill.allowedTools.length > 0 &&
          jsxProd_default_2(Text, {
            dimColor: true,
            children: ["Allowed tools: ", joinedToolNames(skill.allowedTools)],
          }),
        skill.skillRoot &&
          jsxProd_default_2(Text, {
            dimColor: true,
            children: ["Path: ", skill.skillRoot],
          }),
        skill.lockSource === "policy" || skill.lockSource === "flag"
          ? jsxProd_default_2(Text, {
              dimColor: true,
              children: ["State: ", skill.override, " (locked by ", skill.lockSource, " settings)"],
            })
          : skill.lockSource === "reserved-name"
            ? jsxProd_default_2(Text, {
                dimColor: true,
                children: [
                  "State: ",
                  skill.override,
                  " (can't be changed here \u2014 settings can't store an entry named ",
                  skill.cmdName,
                  "; rename the skill's folder or command file to configure it)",
                ],
              })
            : jsxProd_default_2(Box, {
                flexDirection: "column",
                children: [
                  jsxProd_default_2(Text, {
                    children: [
                      "State:",
                      skill.lockSource === "author" &&
                        jsxProd_default_2(Text, {
                          dimColor: true,
                          children: [" ", "(on/name-only locked by frontmatter disable-model-invocation)"],
                        }),
                    ],
                  }),
                  jsxProd_default(
                    OrderedListWithItem,
                    {
                      visibleCount: 4,
                      onSelect: (ge) => {
                        let ye = X[ge];
                        if (skill.lockSource === "author" && ye !== "off") {
                          ee("user-invocable-only");
                          return;
                        }
                        ee(ye);
                      },
                      children: X.map((ge) => {
                        let ye =
                          skill.lockSource === "author" && ge !== "user-invocable-only" && ge !== "off";
                        return jsxProd_default(
                          OrderedListWithItem.Item,
                          {
                            label: ge,
                            icon:
                              ge === skill.override
                                ? jsxProd_default(StatusIcon, {
                                    status: "success",
                                    "aria-label": "current:",
                                  })
                                : jsxProd_default(StatusIcon, {
                                    status: "pending",
                                    "aria-label": "",
                                  }),
                            meta: ye ? ["locked"] : [],
                          },
                          ge,
                        );
                      }),
                    },
                    skill.override,
                  ),
                ],
              }),
        jsxProd_default_2(Byline, {
          children: [
            jsxProd_default(KeyboardShortcutHint, {
              chord: "Enter",
              action: "set state",
            }),
            jsxProd_default(Text, {
              dimColor: true,
              children: " \xB7 ",
            }),
            jsxProd_default(KeyboardShortcutHint, {
              chord: "Esc",
              action: "go back",
            }),
          ],
        }),
      ],
    });
  }
  if (typeof viewState === "object" && viewState.type === "mcp-detail") {
    let client = viewState.client;
    let serverToolsCount = filterToolsByServer(mcpTools, client.name).length;
    let handleMcpViewTools = () => {
      setViewState_2({
        type: "mcp-tools",
        client,
      });
    };
    let handleMcpCancel = () => {
      setViewState_2("plugin-list");
    };
    let handleMcpComplete = (result) => {
      if (result) setResult(result);
      setViewState_2("plugin-list");
    };
    let scope = client.config.scope;
    let configType = client.config.type ?? "stdio";
    let displayEndpoint = Xo ?? describeMcpServerOrigin(client.name, client.config);
    if (configType === "stdio") {
      let server = {
        name: client.name,
        client,
        scope,
        displayEndpoint,
        transport: "stdio",
        config: client.config,
      };
      return jsxProd_default(MCPStdioServerMenu, {
        server,
        serverToolsCount,
        onViewTools: handleMcpViewTools,
        onCancel: handleMcpCancel,
        onComplete: handleMcpComplete,
        borderless: true,
      });
    } else if (configType === "sse") {
      let server = {
        name: client.name,
        client,
        scope,
        displayEndpoint,
        transport: "sse",
        isAuthenticated: undefined,
        config: client.config,
      };
      return jsxProd_default(RemoteServerMenuLoader, {
        server,
        serverToolsCount,
        onViewTools: handleMcpViewTools,
        onCancel: handleMcpCancel,
        onComplete: handleMcpComplete,
        borderless: true,
      });
    } else if (configType === "http") {
      let server = {
        name: client.name,
        client,
        scope,
        displayEndpoint,
        transport: "http",
        isAuthenticated: undefined,
        config: client.config,
      };
      return jsxProd_default(RemoteServerMenuLoader, {
        server,
        serverToolsCount,
        onViewTools: handleMcpViewTools,
        onCancel: handleMcpCancel,
        onComplete: handleMcpComplete,
        borderless: true,
      });
    } else if (configType === "claudeai-proxy") {
      let server = {
        name: client.name,
        client,
        scope,
        displayEndpoint,
        transport: "claudeai-proxy",
        isAuthenticated: undefined,
        config: client.config,
      };
      return jsxProd_default(RemoteServerMenuLoader, {
        server,
        serverToolsCount,
        onViewTools: handleMcpViewTools,
        onCancel: handleMcpCancel,
        onComplete: handleMcpComplete,
        borderless: true,
      });
    }
    return jsxProd_default_2(Box, {
      flexDirection: "column",
      paddingX: 1,
      children: [
        jsxProd_default_2(Text, {
          color: "warning",
          children: ["No details view for ", client.name, " (transport: ", configType, ")."],
        }),
        jsxProd_default(Byline, {
          children: jsxProd_default(ConfigurableShortcutHint, {
            action: "confirm:no",
            context: "Settings",
            fallback: "Esc",
            description: "go back",
          }),
        }),
      ],
    });
  }
  if (typeof viewState === "object" && viewState.type === "mcp-tools") {
    let client = viewState.client;
    let scope = client.config.scope;
    let configType = client.config.type ?? "stdio";
    let displayEndpoint = Xo ?? describeMcpServerOrigin(client.name, client.config);
    let server;
    if (configType === "stdio")
      server = {
        name: client.name,
        client,
        scope,
        displayEndpoint,
        transport: "stdio",
        config: client.config,
      };
    else if (configType === "sse")
      server = {
        name: client.name,
        client,
        scope,
        displayEndpoint,
        transport: "sse",
        isAuthenticated: undefined,
        config: client.config,
      };
    else if (configType === "http")
      server = {
        name: client.name,
        client,
        scope,
        displayEndpoint,
        transport: "http",
        isAuthenticated: undefined,
        config: client.config,
      };
    else
      server = {
        name: client.name,
        client,
        scope,
        displayEndpoint,
        transport: "claudeai-proxy",
        isAuthenticated: undefined,
        config: client.config,
      };
    return jsxProd_default(MCPToolListView, {
      server,
      onSelectTool: (tool) => {
        setViewState_2({
          type: "mcp-tool-detail",
          client,
          tool,
        });
      },
      onBack: () =>
        setViewState_2({
          type: "mcp-detail",
          client,
        }),
    });
  }
  if (typeof viewState === "object" && viewState.type === "mcp-tool-detail") {
    let { client, tool } = viewState;
    let scope = client.config.scope;
    let configType = client.config.type ?? "stdio";
    let displayEndpoint = Xo ?? describeMcpServerOrigin(client.name, client.config);
    let server;
    if (configType === "stdio")
      server = {
        name: client.name,
        client,
        scope,
        displayEndpoint,
        transport: "stdio",
        config: client.config,
      };
    else if (configType === "sse")
      server = {
        name: client.name,
        client,
        scope,
        displayEndpoint,
        transport: "sse",
        isAuthenticated: undefined,
        config: client.config,
      };
    else if (configType === "http")
      server = {
        name: client.name,
        client,
        scope,
        displayEndpoint,
        transport: "http",
        isAuthenticated: undefined,
        config: client.config,
      };
    else
      server = {
        name: client.name,
        client,
        scope,
        displayEndpoint,
        transport: "claudeai-proxy",
        isAuthenticated: undefined,
        config: client.config,
      };
    return jsxProd_default(MCPToolDetailView, {
      tool,
      server,
      onBack: () =>
        setViewState_2({
          type: "mcp-tools",
          client,
        }),
    });
  }
  let visibleItems = pagination.getVisibleItems(Ft);
  return jsxProd_default_2(Box, {
    flexDirection: "column",
    width: "100%",
    tabIndex: 0,
    autoFocus: true,
    onKeyDown: Wm,
    onPaste: finish,
    children: [
      jsxProd_default(Box, {
        marginBottom: 1,
        flexDirection: "column",
        children: jsxProd_default(SearchBox, {
          query: searchQuery,
          isFocused: ne,
          isTerminalFocused,
          cursorOffset: searchCursorOffset,
          onCursorOffsetChange: setCursorOffset,
          onFocus: () => he(true),
        }),
      }),
      isSafeMode() &&
        jsxProd_default(Box, {
          marginBottom: 1,
          paddingLeft: 2,
          children: jsxProd_default_2(Text, {
            color: "warning",
            children: [
              "Safe mode: installed plugins are disabled this session \u2014 changes to them save but won't load until safe mode is off; built-in plugins are unaffected. ",
              capitalize(getSafeModeExitHint()),
              " to re-enable.",
            ],
          }),
        }),
      ht &&
        jsxProd_default(Box, {
          marginBottom: 1,
          paddingLeft: 2,
          children: jsxProd_default(Text, {
            color: "success",
            children: stripInvisibleKeepNewlines(ht),
          }),
        }),
      Ft.length === 0 &&
        searchQuery &&
        jsxProd_default(Box, {
          marginBottom: 1,
          children: jsxProd_default_2(HintText, {
            children: ['No items match "', searchQuery, '"'],
          }),
        }),
      jsxProd_default_2(Box, {
        flexDirection: "column",
        onWheel: pagination.onWheel,
        children: [
          pagination.scrollPosition.canScrollUp &&
            jsxProd_default(Box, {
              children: jsxProd_default_2(Text, {
                dimColor: true,
                children: [" ", figures_default.arrowUp, " more above"],
              }),
            }),
          jsxProd_default(SelectRow, {
            bar: pagination.bar,
            children: visibleItems.map((item_10, visibleIndex) => {
              let actualIndex = pagination.toActualIndex(visibleIndex);
              let ge = actualIndex === _n && !ne;
              switch (item_10.kind) {
                case "spacer":
                  return jsxProd_default(
                    Box,
                    {
                      height: 1,
                    },
                    `spacer:${actualIndex}`,
                  );
                case "section-header":
                  return jsxProd_default(
                    Box,
                    {
                      paddingLeft: 2,
                      children: jsxProd_default_2(Text, {
                        wrap: "truncate-end",
                        children: [
                          jsxProd_default(Text, {
                            dimColor: item_10.section !== "attention",
                            color: item_10.section === "attention" ? "warning" : undefined,
                            bold: true,
                            children:
                              item_10.section === "attention"
                                ? "Needs attention"
                                : item_10.section === "disused"
                                  ? "Not used recently"
                                  : "Favorites",
                          }),
                          item_10.section === "attention" &&
                            ao > 0 &&
                            jsxProd_default_2(Text, {
                              color: "warning",
                              children: [
                                " ",
                                "\xB7 ",
                                ao,
                                " to sign in \xB7",
                                " ",
                                jsxProd_default(AuthShortcutHint, {}),
                              ],
                            }),
                        ],
                      }),
                    },
                    `section:${item_10.section}`,
                  );
                case "scope-header":
                  return jsxProd_default(
                    Box,
                    {
                      paddingLeft: 2,
                      children: jsxProd_default(Text, {
                        dimColor: true,
                        bold: true,
                        children: formatPluginScopeLabel(item_10.scope),
                      }),
                    },
                    `scope:${actualIndex}`,
                  );
                case "disabled-header":
                  return jsxProd_default(
                    TwoColumnRow,
                    {
                      active: ge,
                      paddingLeft: 2,
                      children: jsxProd_default_2(Text, {
                        color: ge ? "suggestion" : undefined,
                        children: [
                          jsxProd_default(Text, {
                            "aria-hidden": true,
                            children: ge ? `${figures_default.pointer} ` : "  ",
                          }),
                          Pt ? figures_default.arrowDown : figures_default.arrowRight,
                          " ",
                          "Show",
                          item_10.disabledCount > 0 &&
                            jsxProd_default_2(Fragment, {
                              children: [
                                " ",
                                "disabled ",
                                jsxProd_default_2(Text, {
                                  dimColor: true,
                                  children: ["(", item_10.disabledCount, ")"],
                                }),
                              ],
                            }),
                          item_10.disabledCount > 0 && item_10.unusedConnectorCount > 0 && " \xB7",
                          item_10.unusedConnectorCount > 0 &&
                            jsxProd_default_2(Fragment, {
                              children: [
                                " ",
                                "unused claude.ai connectors",
                                " ",
                                jsxProd_default_2(Text, {
                                  dimColor: true,
                                  children: ["(", item_10.unusedConnectorCount, ")"],
                                }),
                              ],
                            }),
                        ],
                      }),
                    },
                    "section:disabled",
                  );
                case "item":
                  return jsxProd_default(
                    InstalledItemRow,
                    {
                      item: item_10.item,
                      isSelected: ge,
                      health:
                        item_10.item.type === "plugin" ? skillHealthData?.get(item_10.item.name) : undefined,
                      nameWidth,
                      statusHoisted: ao > 0 && item_10.section === "attention",
                    },
                    `${item_10.section}:${item_10.item.id}`,
                  );
              }
            }),
          }),
          pagination.scrollPosition.canScrollDown &&
            jsxProd_default(Box, {
              children: jsxProd_default_2(Text, {
                dimColor: true,
                children: [" ", figures_default.arrowDown, " more below"],
              }),
            }),
        ],
      }),
      jsxProd_default(Box, {
        marginTop: 1,
        marginLeft: 1,
        children: jsxProd_default(Text, {
          dimColor: true,
          italic: true,
          children: jsxProd_default_2(Byline, {
            children: [
              jsxProd_default(Text, {
                children: "Type to search",
              }),
              jsxProd_default(ConfigurableShortcutHint, {
                action: "plugin:toggle",
                context: "Plugin",
                fallback: "Space",
                description: "toggle",
              }),
              jsxProd_default(ConfigurableShortcutHint, {
                action: "plugin:favorite",
                context: "Plugin",
                fallback: "f",
                description: "favorite",
              }),
              jsxProd_default(ConfigurableShortcutHint, {
                action: "select:accept",
                context: "Select",
                fallback: "Enter",
                description: "view",
              }),
              jsxProd_default(ConfigurableShortcutHint, {
                action: "confirm:no",
                context: "Settings",
                fallback: "Esc",
                description: "go back",
              }),
            ],
          }),
        }),
      }),
      Ve &&
        jsxProd_default(Box, {
          marginTop: 1,
          marginLeft: 1,
          children: jsxProd_default(ErrorText, {
            error: stripInvisibleKeepNewlines(Ve),
          }),
        }),
      mn.size > 0 &&
        jsxProd_default(Box, {
          marginLeft: 1,
          children: jsxProd_default(Text, {
            dimColor: true,
            italic: true,
            children: changesApplyOnClose
              ? "Changes apply when you close this menu"
              : "Run /reload-plugins to apply changes",
          }),
        }),
    ],
  });
}
//@ chunk-vrb44rx7.js:204832-204871 sole-consumer
function joinedToolNames(allowedTools) {
  return replaceControlChars(allowedTools.join(", "));
}
//@ chunk-k9mgeeff.js:4312-4636 fingerprint = getBaseFileNames (0.759)
async function getBaseFileNames(dirPath) {
  let e = [];
  let r = new Set();
  for (let s of dirPath) {
    if (!s) continue;
    let m;
    try {
      m = await fsPromisesModule.readdir(s, {
        withFileTypes: true,
      });
    } catch (error) {
      logComponentReadError(s, error);
      continue;
    }
    for (let o of m)
      if (o.isFile() && o.name.endsWith(".md")) {
        let joined = pathModule.join(s, o.name);
        let resolved = pathModule.resolve(joined);
        if (r.has(resolved)) continue;
        r.add(resolved);
        e.push({
          name: pathModule.basename(o.name, ".md"),
          path: joined,
        });
      }
  }
  return e;
}
//@ chunk-k9mgeeff.js:4636-5291 fingerprint = getSkillDirNames (0.844)
async function getSkillDirNames(n, name) {
  let skillNames = [];
  let s = new Set();
  let m = (name, c) => {
    let resolved = pathModule.resolve(c);
    if (s.has(resolved)) return;
    s.add(resolved);
    skillNames.push({
      name,
      path: c,
    });
  };
  for (let entry of n) {
    if (!entry) continue;
    try {
      let joined = pathModule.join(entry, "SKILL.md");
      if ((await fsPromisesModule.stat(joined)).isFile()) {
        let y = "";
        try {
          let fileHead = await readFileHead(joined, MAX_PLUGIN_INVENTORY_FILE_BYTES);
          let { frontmatter } = parseFrontmatter(fileHead, joined);
          let g = typeof frontmatter.name === "string" ? frontmatter.name.trim() : "";
          y = g.startsWith(`${name}:`) ? g.slice(name.length + 1) : g;
        } catch {}
        m(y || pathModule.basename(entry), entry);
        continue;
      }
    } catch {}
    let c;
    try {
      c = await fsPromisesModule.readdir(entry, {
        withFileTypes: true,
      });
    } catch (error) {
      logComponentReadError(entry, error);
      continue;
    }
    for (let a of c) {
      if (!a.isDirectory() && !a.isSymbolicLink()) continue;
      let joined = pathModule.join(entry, a.name);
      try {
        if ((await fsPromisesModule.stat(pathModule.join(joined, "SKILL.md"))).isFile()) m(a.name, joined);
      } catch {}
    }
  }
  return skillNames;
}
//@ chunk-6zvphrsz.js:2539-2575 fingerprint = filterManagedDisabledPlugins (1)
function filterManagedDisabledPlugins() {
  return join(getClaudeConfigDir(), "local");
}
export {
  filterManagedDisabledPlugins,
  usePluginWarnings,
  activeModNames,
  loadedModsSnapshot,
  ManagePlugins,
  getBaseFileNames,
  getSkillDirNames,
};
