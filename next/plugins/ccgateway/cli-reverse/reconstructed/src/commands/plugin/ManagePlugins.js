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
import * as pathModule from "path";
import { join } from "path";
import * as fsPromisesModule from "fs/promises";
import { getClaudeConfigDir, isSafeMode, getSafeModeExitHint } from "../../utils/envUtils.js";
import {
  logComponentReadError,
  readFileHead,
  MAX_PLUGIN_INVENTORY_FILE_BYTES,
  getPluginInventory,
} from "../../utils/plugins/pluginInventory.js";
import { parseFrontmatter } from "../../utils/frontmatterParser.js";
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
import {
  init_react_production,
  useMemo,
  useState,
  useEffect,
  useRef,
  useCallback,
  useEffectEvent,
} from "../../../vendor/react/cjs/react.production.js";
import { getPluginRegistry } from "../../utils/plugins/pluginLoadState.js";
import { stripInvisibleChars as stripInvisibleChars_2 } from "../../utils/invisibleChars.js";
import {
  subscribe_2,
  uiRenderModule,
} from "../../components/permissions/AskUserQuestionPermissionRequest/uiRenderHook.js";
import { useStoreSelector } from "../../hooks/useStoreSelector.js";
import { useMemoCache } from "../../../vendor/react/compiler-runtime.js";
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
import { AuthShortcutHint, InstalledItemRow } from "./UnifiedInstalledCell.js";
import { replaceControlChars } from "../../utils/resultError.js";
import { deferInit } from "../../../runtime/deferred-init.js";

//@ chunk-6zvphrsz.js:2539-2575 fingerprint (2.1.88 match: filterManagedDisabledPlugins, 1)
function filterManagedDisabledPlugins() {
  return join(getClaudeConfigDir(), "local");
}
//@ chunk-k9mgeeff.js:4312-4636 fingerprint (2.1.88 match: getBaseFileNames, 0.759)
async function getBaseFileNames(dirPath) {
  let entries = [];
  let seen = new Set();
  for (let name of dirPath) {
    if (!name) continue;
    let stat;
    try {
      stat = await fsPromisesModule.readdir(name, {
        withFileTypes: true,
      });
    } catch (error) {
      logComponentReadError(name, error);
      continue;
    }
    for (let entry of stat)
      if (entry.isFile() && entry.name.endsWith(".md")) {
        let joined = pathModule.join(name, entry.name);
        let resolved = pathModule.resolve(joined);
        if (seen.has(resolved)) continue;
        seen.add(resolved);
        entries.push({
          name: pathModule.basename(entry.name, ".md"),
          path: joined,
        });
      }
  }
  return entries;
}
//@ chunk-k9mgeeff.js:4636-5291 fingerprint (2.1.88 match: getSkillDirNames, 0.844)
async function getSkillDirNames(skillsDir, name) {
  let skillNames = [];
  let seen = new Set();
  let collect = (name, dirName) => {
    let resolved = pathModule.resolve(dirName);
    if (seen.has(resolved)) return;
    seen.add(resolved);
    skillNames.push({
      name,
      path: dirName,
    });
  };
  for (let entry of skillsDir) {
    if (!entry) continue;
    try {
      let path = pathModule.join(entry, "SKILL.md");
      if ((await fsPromisesModule.stat(path)).isFile()) {
        let skillName = "";
        try {
          let fileHead = await readFileHead(path, MAX_PLUGIN_INVENTORY_FILE_BYTES);
          let { frontmatter } = parseFrontmatter(fileHead, path);
          let frontmatterName = typeof frontmatter.name === "string" ? frontmatter.name.trim() : "";
          skillName = frontmatterName.startsWith(`${name}:`)
            ? frontmatterName.slice(name.length + 1)
            : frontmatterName;
        } catch {}
        collect(skillName || pathModule.basename(entry), entry);
        continue;
      }
    } catch {}
    let entries;
    try {
      entries = await fsPromisesModule.readdir(entry, {
        withFileTypes: true,
      });
    } catch (error) {
      logComponentReadError(entry, error);
      continue;
    }
    for (let dirEntry of entries) {
      if (!dirEntry.isDirectory() && !dirEntry.isSymbolicLink()) continue;
      let dirName = pathModule.join(entry, dirEntry.name);
      try {
        if ((await fsPromisesModule.stat(pathModule.join(dirName, "SKILL.md"))).isFile())
          collect(dirEntry.name, dirName);
      } catch {}
    }
  }
  return skillNames;
}
//@ chunk-vrb44rx7.js:146689-146757 affinity
function isListNavItem(row) {
  return row?.kind === "item" || row?.kind === "disabled-header";
}
//@ chunk-vrb44rx7.js:146757-146893 placement (2.1.88 match: _temp2, 0.306)
/**
 * 判断插件操作是否因插件未安装（或未在该作用域安装）而失败，且该插件不在已知列表中。
 */
function isUninstalledPluginFailure(pluginId, name, editableSources) {
  return (
    !pluginId.success &&
    (pluginId.failureCode === "not_installed" || pluginId.failureCode === "not_installed_at_scope") &&
    !editableSources.some((source) => pluginNamesEqual(source, name))
  );
}
//@ chunk-vrb44rx7.js:146893-147114 placement
function needsAttention(item) {
  switch (item.type) {
    case "plugin":
      return item.isEnabled && item.errorCount > 0;
    case "failed-plugin":
    case "flagged-plugin":
      return true;
    case "mcp":
      return (item.status === "needs-auth" || item.status === "failed") && !isNeverConnectedMcpFailure(item);
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
function isInstalledItemDisabled(item) {
  return (
    (item.type === "plugin" && !item.isEnabled) ||
    (item.type === "mcp" && item.status === "disabled") ||
    (item.type === "skill" && item.override === "off")
  );
}
//@ chunk-vrb44rx7.js:147482-147589 placement
function isNeverConnectedMcpFailure(item) {
  return (
    item.type === "mcp" &&
    (item.status === "needs-auth" || item.status === "failed") &&
    item.everConnected === false
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
        (section) =>
          section.name.toLowerCase().includes(lower) ||
          ("displayName" in section && section.displayName?.toLowerCase().includes(lower)) ||
          ("description" in section && section.description?.toLowerCase().includes(lower)),
      )
      .map((item) => ({
        kind: "item",
        section: "main",
        item,
      }));
  }
  let groups = [];
  let groupBySection = new Map();
  for (let item of unifiedItems)
    if (item.type === "plugin")
      groupBySection.set(item.id, {
        name: item.name,
        displayName: item.displayName,
      });
  let currentGroup = null;
  let add = (section, item) => {
    let startsGroup = currentGroup?.section !== section;
    if (startsGroup) {
      if (groups.length > 0 && groups.at(-1)?.kind !== "disabled-header")
        groups.push({
          kind: "spacer",
        });
      if (section === "attention" || section === "favorites" || section === "disused")
        groups.push({
          kind: "section-header",
          section,
        });
    }
    if (
      (section === "main" || section === "disabled") &&
      (startsGroup || currentGroup?.item.scope !== item.scope)
    ) {
      if (!startsGroup)
        groups.push({
          kind: "spacer",
        });
      groups.push({
        kind: "scope-header",
        scope: item.scope,
      });
    }
    let group =
      !startsGroup &&
      item.type === "mcp" &&
      item.parentId !== undefined &&
      ((currentGroup?.item.type === "plugin" && currentGroup.item.id === item.parentId) ||
        (currentGroup?.item.type === "mcp" &&
          currentGroup.item.indented &&
          currentGroup.item.parentId === item.parentId));
    let item_2 =
      item.type === "mcp" && item.indented && !group
        ? {
            ...item,
            indented: false,
            liftedFrom: item.parentId === undefined ? undefined : groupBySection.get(item.parentId),
          }
        : item;
    groups.push({
      kind: "item",
      section,
      item: item_2,
    });
    currentGroup = {
      section,
      item: item_2,
    };
  };
  let seenIds = new Set();
  for (let item of unifiedItems)
    if (needsAttention(item)) {
      add("attention", item);
      seenIds.add(item.id);
    }
  for (let item of unifiedItems)
    if (favoriteIds.has(item.id) && !seenIds.has(item.id)) {
      add("favorites", item);
      seenIds.add(item.id);
    }
  if (disusedDays && disusedDays.size > 0) {
    for (let item of unifiedItems)
      if (item.type === "plugin" && item.isEnabled && disusedDays.has(item.id) && !seenIds.has(item.id)) {
        add("disused", {
          ...item,
          unusedDays: disusedDays.get(item.id),
        });
        seenIds.add(item.id);
      }
  }
  let isDuplicate = (id) =>
    (isInstalledItemDisabled(id) || isNeverConnectedMcpFailure(id)) && !keepInPlaceIds?.has(id.id);
  for (let item of unifiedItems) if (!isDuplicate(item) && !seenIds.has(item.id)) add("main", item);
  let filtered = unifiedItems.filter(isDuplicate);
  if (filtered.length > 0) {
    if (groups.length > 0)
      groups.push({
        kind: "spacer",
      });
    groups.push({
      kind: "disabled-header",
      disabledCount: count(filtered, isInstalledItemDisabled),
      unusedConnectorCount: count(filtered, isNeverConnectedMcpFailure),
    });
    if (showDisabled) for (let item of filtered) add("disabled", item);
  }
  return groups;
}
//@ chunk-vrb44rx7.js:149317-149436 placement
function getSkillItemKey(item) {
  return item.loadedFrom === "syncedSkills"
    ? `synced-skill:${item.source}:${item.name}`
    : `skill:${item.source}:${item.name}`;
}
//@ chunk-vrb44rx7.js:149436-149471 placement
var SYNCED_SKILL = "synced-skill:";
var SKILL = "skill:";
//@ chunk-vrb44rx7.js:149471-149608 placement
function getSyncedSkillAliasKeys(item) {
  if (!item.startsWith(SYNCED_SKILL)) return [];
  let sliced = item.slice(SYNCED_SKILL.length);
  let colonIndex = sliced.indexOf(":") + 1;
  let aliasKey = sliced.slice(0, colonIndex) + stripSyncedSkillPrefix(sliced.slice(colonIndex));
  return [SYNCED_SKILL + aliasKey, SKILL + aliasKey];
}
//@ chunk-vrb44rx7.js:149608-149863 placement
function expandSyncedSkillSelection(selected, items) {
  let expanded = new Set();
  let visited = [];
  for (let item of items) {
    let skillItemKey = getSkillItemKey(item);
    if (item.loadedFrom === "syncedSkills") visited.push(skillItemKey);
    else expanded.add(skillItemKey);
  }
  let match = null;
  for (let key of visited) {
    if (selected.has(key)) continue;
    for (let aliasKey of getSyncedSkillAliasKeys(key))
      if (selected.has(aliasKey) && !expanded.has(aliasKey)) {
        match ??= new Set(selected);
        match.add(key);
        break;
      }
  }
  return match ?? selected;
}
//@ chunk-vrb44rx7.js:149863-150050 placement
function toggleSkillKeySelection(selectedKeys, item, filteredItems) {
  let expanded = expandSyncedSkillSelection(selectedKeys, filteredItems);
  let nextSelection = new Set(selectedKeys);
  if (!expanded.has(item)) {
    nextSelection.add(item);
    return nextSelection;
  }
  nextSelection.delete(item);
  for (let aliasKey of getSyncedSkillAliasKeys(item))
    if (
      !filteredItems.some((item) => item.loadedFrom !== "syncedSkills" && getSkillItemKey(item) === aliasKey)
    )
      nextSelection.delete(aliasKey);
  return nextSelection;
}
//@ chunk-vrb44rx7.js:150050-150054 placement
// deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
deferInit("chunk-vrb44rx7.js:150050", () => {
  init_react_production();
});
//@ chunk-vrb44rx7.js:150054-150177 placement
var hooksLeftOutStore; // deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
deferInit("chunk-vrb44rx7.js:150054", () => {
  hooksLeftOutStore = Object.freeze({
    subscribe: (listener) => getPluginRegistry().hooksLeftOutByNameChanged.subscribe(listener),
    getSnapshot: () => getPluginRegistry().hooksLeftOutByName,
  });
});
//@ chunk-vrb44rx7.js:150177-150205 placement
function escapeDisplayText(text) {
  return stripInvisibleChars_2(text);
}
//@ chunk-vrb44rx7.js:150205-150845 placement
/**
 * 插件管理页读取已加载模块的 store：ca 给出活动 mod 名列表，ua 为快照。
 */
var loadedModulesStore; // deferred: uses subscribe_2 (../../components/permissions/AskUserQuestionPermissionRequest/uiRenderHook.js) of its import cycle while loading; runs once the cycle is complete
var activeModNames;
var loadedModsSnapshot;
deferInit("chunk-vrb44rx7.js:150205", () => {
  loadedModulesStore = {
    subscribe: subscribe_2,
    getSnapshot: () => getPluginRegistry().loadedModules,
  };
  activeModNames = () => uiRenderModule.activeModNames(useStoreSelector(loadedModulesStore));
  loadedModsSnapshot = (props) => {
    let $ = useMemoCache(12);
    let { names } = props;
    const count = names.length;
    let label;
    if ($[0] !== names.length) {
      label = plural(names.length, "mod");
      $[0] = names.length;
      $[1] = label;
    } else label = $[1];
    let heading;
    if ($[2] !== names.length || $[3] !== label) {
      heading = jsxProd_default_2(Text, {
        children: [count, " ", label, " active"],
      });
      $[2] = names.length;
      $[3] = label;
      $[4] = heading;
    } else heading = $[4];
    let children;
    if ($[5] !== names) {
      children = names.map(escapeDisplayText).join(", ");
      $[5] = names;
      $[6] = children;
    } else children = $[6];
    let listText;
    if ($[7] !== children) {
      listText = jsxProd_default(Text, {
        children,
      });
      $[7] = children;
      $[8] = listText;
    } else listText = $[8];
    let box;
    if ($[9] !== heading || $[10] !== listText) {
      box = jsxProd_default(Box, {
        marginTop: 1,
        children: jsxProd_default(Text, {
          dimColor: true,
          wrap: "truncate-end",
          children: jsxProd_default_2(Byline, {
            children: [heading, listText],
          }),
        }),
      });
      $[9] = heading;
      $[10] = listText;
      $[11] = box;
    } else box = $[11];
    return box;
  };
});
//@ chunk-vrb44rx7.js:150845-150954 placement
/**
 * 汇总插件相关警告：AppState 里的插件加载警告、冻结/已加载模块存储里的警告，作为一个记忆化数组返回。
 */
function usePluginWarnings() {
  let warnings = useAppState((state) => state.plugins.warnings);
  let storeSelector = useStoreSelector(hooksLeftOutStore);
  let storeSelector_2 = useStoreSelector(loadedModulesStore);
  return useMemo(
    () => [...warnings, ...storeSelector, ...collectPassedOverHooks(storeSelector_2)],
    [warnings, storeSelector, storeSelector_2],
  );
}
//@ chunk-vrb44rx7.js:150954-151419 placement
async function logPluginToggleScreen({ operation, pluginId, scope, savedKept, storageV5 }) {
  try {
    if (!isPluginDirectoryModeOn()) return;
    let fields = {
      ...(await pluginTelemetryFields(pluginId, policyEnabledPluginNameSet(), storageV5)),
      ...(scope !== undefined && {
        scope: fromEnum(scope),
      }),
    };
    switch (operation) {
      case "uninstall":
        logEvent("tengu_plugin_uninstalled_screen", {
          ...fields,
          ...(savedKept && {
            saved_kept: true,
          }),
        });
        return;
      case "enable":
        logEvent("tengu_plugin_enabled_screen", fields);
        return;
      case "disable":
        logEvent("tengu_plugin_disabled_screen", fields);
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
function renderComponentLabelRow(entry) {
  let [label, names] = entry;
  return jsxProd_default(
    BulletRow,
    {
      children: jsxProd_default_2(Text, {
        dimColor: true,
        children: [label, ": ", names.join(", ")],
      }),
    },
    label,
  );
}
//@ chunk-vrb44rx7.js:151526-151577 placement
function pluginDisplayLabel(plugin) {
  return printableLabel(printableName(plugin, 120)) || "this plugin";
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
    let listFormat = new Intl.ListFormat("en", {
      type: "conjunction",
    });
    let formatIds = (ids) => listFormat.format(ids.map((id) => displayPluginId(id)));
    let filtered = others.filter((other) => !alsoInstalledElsewhere.has(other.pluginId));
    let filtered_2 = [openedId, ...others.map((other) => other.pluginId)].filter((id) =>
      alsoInstalledElsewhere.has(id),
    );
    let leadText =
      filtered_2.length === 0
        ? ""
        : ` ${capitalize(formatIds(filtered_2))} ${filtered_2.length === 1 ? "is" : "are"} also installed for another project: the settings saved for ${filtered_2.length === 1 ? "it" : "them"} are kept while ${filtered_2.length === 1 ? "it stays" : "they stay"} installed there.`;
    if (targetKeepsOwn) {
      let openedIds = alsoInstalledElsewhere.has(openedId) ? [] : [openedId];
      let trailText =
        removesSavedData && filtered.length > 0
          ? [
              ...openedIds.map((id) => `the settings saved for ${displayPluginId(id)}`),
              `the settings and saved data for ${formatIds(filtered.map((other) => other.pluginId))}`,
            ].join(" and ")
          : openedIds.length + filtered.length === 0
            ? ""
            : `settings saved for ${formatIds([...openedIds, ...filtered.map((other) => other.pluginId)])}`;
      return `${capitalize(displayPluginId(newId))} already has its own settings${trailText === "" ? "" : `; ${trailText} are removed`}.${leadText}`;
    }
    if (others.length === 0) return `Your plugin settings carry over.${leadText}`;
    let removedText =
      filtered.length === 0
        ? ""
        : `; ${removesSavedData ? "settings and saved data for" : "settings saved for"} ${listFormat.format(filtered.map((other) => other.marketplaceInText))} are removed`;
    return `Settings carry over from ${oldInText}${removedText}.${leadText}`;
  }
  return "";
}
//@ chunk-vrb44rx7.js:152748-152856 placement
function findScopedInstallation(installations, scope) {
  let scoped = installations?.filter((installation) => installation.scope === scope) ?? [];
  return (
    scoped.find((installation) => installation.projectPath === getOriginalCwd()) ??
    scoped.find(isInstallationRelevantToCurrentProject)
  );
}
//@ chunk-vrb44rx7.js:152856-152994 placement
function describePluginVersionPin(pluginId, gitCommitSha) {
  let shortSha = shortCommitSha(gitCommitSha);
  if (!shortSha) return "tracks the marketplace's latest";
  return pluginId.endsWith(`@${OFFICIAL_MARKETPLACE_NAME}`)
    ? `pinned commit ${shortSha}`
    : `commit ${shortSha}`;
}
//@ chunk-vrb44rx7.js:152994-153076 placement
function shortCommitSha(sha) {
  return sha !== undefined && /^[0-9a-f]{7,40}$/i.test(sha) ? sha.slice(0, 7) : undefined;
}
//@ chunk-vrb44rx7.js:153076-153226 placement (2.1.88 match: isClaudeAISubscriber, 0.692)
function getUncoveredPluginScopes(replaced, scope, pluginId) {
  let knownScopes = new Set([
    scope,
    ...(getInstalledPlugins().plugins[pluginId] ?? [])
      .filter(isInstallationRelevantToCurrentProject)
      .map((installation) => installation.scope),
  ]);
  return uniq(replaced.flatMap((installation) => installation.scopes)).filter(
    (scope) => !knownScopes.has(scope),
  );
}
//@ chunk-vrb44rx7.js:153226-153280 layout
var SKILL_STATE_CYCLE_2 = ["on", "name-only", "user-invocable-only", "off"];
//@ chunk-vrb44rx7.js:153280-153620 layout
/**
 * 比较技能覆盖新值与 settings（local/project/user）里已生效的值；相同返回 undefined（无需写入），否则返回新值。作者锁定的技能默认值是 user-invocable-only。
 */
function diffSkillOverrideFromSettings(item, value) {
  let lookup = (source) =>
    isSettingSourceEnabled(source) ? getSettingsForSource(source)?.skillOverrides : undefined;
  let fromLocal = lookup("localSettings");
  let fromProject = lookup("projectSettings");
  let fromUser = lookup("userSettings");
  let ownEntry = (id) => ownLookup(fromProject, id) ?? ownLookup(fromUser, id);
  let entry =
    ownEntry(item.cmdName) ??
    (item.unqualifiedName != null
      ? (ownLookup(fromLocal, item.unqualifiedName) ?? ownEntry(item.unqualifiedName))
      : undefined);
  let removalPatch =
    item.lockSource === "author" ? (entry === "off" ? "off" : "user-invocable-only") : (entry ?? "on");
  return value === removalPatch ? undefined : value;
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
  let $ = useMemoCache(13);
  let { plugin, marketplace } = props;
  let [details, setDetails] = useState(null);
  let [dirState, setDirState] = useState(null);
  let [sessionState, setSessionState] = useState(null);
  let content;
  let footer;
  if ($[0] !== marketplace || $[1] !== plugin) {
    content = () => {
      let loading = false;
      getPluginInventory(plugin, marketplace)
        .then((pluginInventory) => {
          if (!loading) setDetails(pluginInventory);
        })
        .catch(async (error) => {
          let directoryState =
            marketplace === OFFICIAL_MARKETPLACE_NAME ? await getPluginDirectoryState() : null;
          if (loading) {
            return;
          }
          if (directoryState === "off" || directoryState === "unavailable") {
            setSessionState(directoryState);
            return;
          }
          setDirState((error instanceof Error && printableMessage(error)) || "Failed to load components");
        });
      return () => {
        loading = true;
      };
    };
    footer = [plugin, marketplace];
    $[0] = marketplace;
    $[1] = plugin;
    $[2] = content;
    $[3] = footer;
  } else {
    content = $[2];
    footer = $[3];
  }
  useEffect(content, footer);
  if (sessionState) {
    const unavailableSuffix = sessionState === "off" ? "is turned off." : "isn't available in this session.";
    let statusLine;
    if ($[4] !== unavailableSuffix) {
      statusLine = jsxProd_default(Box, {
        marginBottom: 1,
        children: jsxProd_default_2(Text, {
          dimColor: true,
          children: ["Components are not shown because this plugin's marketplace", " ", unavailableSuffix],
        }),
      });
      $[4] = unavailableSuffix;
      $[5] = statusLine;
    } else statusLine = $[5];
    return statusLine;
  }
  if (dirState) {
    let detailBox;
    if ($[6] === MEMO_CACHE_SENTINEL) {
      detailBox = jsxProd_default(Text, {
        bold: true,
        children: "Components:",
      });
      $[6] = detailBox;
    } else detailBox = $[6];
    let footerBox;
    if ($[7] !== dirState) {
      footerBox = jsxProd_default_2(Box, {
        flexDirection: "column",
        marginBottom: 1,
        children: [
          detailBox,
          jsxProd_default_2(Text, {
            dimColor: true,
            children: ["Error: ", dirState],
          }),
        ],
      });
      $[7] = dirState;
      $[8] = footerBox;
    } else footerBox = $[8];
    return footerBox;
  }
  if (!details) {
    return null;
  }
  let componentRows;
  let hintRows;
  if ($[9] !== details) {
    hintRows = EARLY_RETURN_SENTINEL;
    he: {
      let componentLabels = COMPONENT_LABELS(details);
      if (componentLabels.length === 0) {
        hintRows = null;
        break he;
      }
      let footer;
      if ($[12] === MEMO_CACHE_SENTINEL) {
        footer = jsxProd_default(Text, {
          bold: true,
          children: "Installed components:",
        });
        $[12] = footer;
      } else footer = $[12];
      componentRows = jsxProd_default_2(Box, {
        flexDirection: "column",
        marginBottom: 1,
        children: [footer, componentLabels.map(renderComponentLabelRow)],
      });
    }
    $[9] = details;
    $[10] = componentRows;
    $[11] = hintRows;
  } else {
    componentRows = $[10];
    hintRows = $[11];
  }
  if (hintRows !== EARLY_RETURN_SENTINEL) return hintRows;
  return componentRows;
}
//@ chunk-vrb44rx7.js:155189-155429 fingerprint (2.1.88 match: checkIfLocalPlugin, 1)
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
function dropPolicyBlockedPlugins(plugins) {
  return plugins.filter((plugin) => !isPluginBlockedByPolicy(plugin.source));
}
//@ chunk-vrb44rx7.js:155480-156237 layout
/**
 * 渲染一组带颜色的插件消息（错误/警告）：标题"N 个 noun:"，每条消息下可带缩进的指导语。
 */
function PluginMessageList(props) {
  let $ = useMemoCache(15);
  let { entries, color, noun } = props;
  if (entries.length === 0) {
    return null;
  }
  const count = entries.length;
  let content;
  if ($[0] !== entries.length || $[1] !== noun) {
    content = plural(entries.length, noun);
    $[0] = entries.length;
    $[1] = noun;
    $[2] = content;
  } else content = $[2];
  let heading;
  if ($[3] !== color || $[4] !== entries.length || $[5] !== content) {
    heading = jsxProd_default_2(Text, {
      bold: true,
      color,
      children: [count, " ", content, ":"],
    });
    $[3] = color;
    $[4] = entries.length;
    $[5] = content;
    $[6] = heading;
  } else heading = $[6];
  let footer;
  if ($[7] !== color || $[8] !== entries) {
    let renderRow;
    if ($[10] !== color) {
      renderRow = (entry, i_0) =>
        jsxProd_default_2(
          Box,
          {
            flexDirection: "column",
            marginLeft: 2,
            children: [
              jsxProd_default(Text, {
                color,
                children: entry.message,
              }),
              entry.guidance &&
                jsxProd_default_2(Text, {
                  dimColor: true,
                  italic: true,
                  children: [figures_default.arrowRight, " ", entry.guidance],
                }),
            ],
          },
          i_0,
        );
      $[10] = color;
      $[11] = renderRow;
    } else renderRow = $[11];
    footer = entries.map(renderRow);
    $[7] = color;
    $[8] = entries;
    $[9] = footer;
  } else footer = $[9];
  let status;
  if ($[12] !== heading || $[13] !== footer) {
    status = jsxProd_default_2(Box, {
      flexDirection: "column",
      children: [heading, footer],
    });
    $[12] = heading;
    $[13] = footer;
    $[14] = status;
  } else status = $[14];
  return status;
}
//@ chunk-vrb44rx7.js:156237-204832 fingerprint (2.1.88 match: ManagePlugins, 0.484)
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
  let mcpClients = useAppState((state) => state.mcp.clients);
  let mcpTools = useAppState((s_0) => s_0.mcp.tools);
  let pluginErrors = useAppState((s_1) => s_1.plugins.errors);
  let flaggedPlugins = useActivePlugins();
  let pluginWarnings = usePluginWarnings();
  let flaggedPlugins_2 = getFlaggedPlugins();
  let skillHealthData = useSkillHealthData();
  let [isSearchMode, setIsSearchMode] = useState(false);
  let exitSearch = () => setIsSearchMode(false);
  let isTerminalFocused = useTerminalFocus();
  let isTerminalFocused_2 = useHasScrollViewport();
  let { rows, columns } = useScrollViewportSize(useTerminalSize());
  let [viewState, setViewState_2] = useState("plugin-list");
  let {
    query: searchQuery,
    setQuery: setSearchQuery,
    cursorOffset: searchCursorOffset,
    setCursorOffset,
    handleKeyDown,
    handlePaste,
  } = useSearchInput({
    isActive: viewState === "plugin-list" && isSearchMode,
    onExit: exitSearch,
    onExitUp: exitSearch,
  });
  let searchActive = isSearchMode && searchQuery !== "";
  useEffect(() => {
    onSearchModeChange(searchActive);
  }, [searchActive, onSearchModeChange]);
  useEffect(() => () => onSearchModeChange(false), [onSearchModeChange]);
  let [selectedPlugin, setSelectedPlugin] = useState(null);
  let selectedSource = useMemo(
    () => (selectedPlugin ? findPluginInSettings_2(selectedPlugin.plugin.source) : null),
    [selectedPlugin],
  );
  let hasAutoNavigated = usePinnedConsentRecord(selectedSource);
  let [listTick, setListTick] = useState(0);
  let [marketplaces, setMarketplaces] = useState([]);
  let [pluginStates, setPluginStates] = useState([]);
  let watchUnsubscribe = watchSkillHealthInvalidation(getEnabledPluginsBySource, enabledPluginsEqual);
  let [loading, setLoading] = useState(true);
  let [refreshTick, setRefreshTick] = useState(0);
  let [keepInPlaceIds, setKeepInPlaceIds] = useState(() => new Set());
  let [pendingToggles, setPendingToggles] = useState(new Map());
  let [officialAlt, setOfficialAlt] = useState(null);
  let [replaceInfo, setReplaceInfo] = useState(null);
  let [switchState, setSwitchState] = useState({
    state: "working",
  });
  let pendingAutoActionRef = useRef(false);
  useEffect(() => {
    setOfficialAlt(null);
    setReplaceInfo(null);
    setSwitchState({
      state: "working",
    });
    let scope = selectedPlugin?.scope;
    if (!selectedSource || (scope !== "user" && scope !== "local")) return;
    let cancelled = false;
    (async () => {
      {
        let officialMarketplaceAlternative = await findOfficialMarketplaceAlternative(
          selectedSource,
          storageV5,
        );
        if (cancelled) return;
        setOfficialAlt(officialMarketplaceAlternative ?? null);
        if (officialMarketplaceAlternative === undefined) return;
        let [knownMarketplaces, pluginByIdCacheOnly] = await Promise.all([
          loadKnownMarketplacesSafe(storageV5),
          getPluginByIdCacheOnly(officialMarketplaceAlternative.pluginId, storageV5),
        ]);
        if (cancelled) return;
        if (pluginByIdCacheOnly === null) {
          setSwitchState({
            state: "failed",
          });
          return;
        }
        let otherInstalls = await describeOtherMarketplaceInstalls(
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
          await Promise.all(
            otherInstalls
              .filter((install) => install.pluginId !== selectedSource)
              .map((install) => isMarketplaceGone(install.pluginId)),
          )
        ).some((install) => !install);
        if (cancelled) return;
        if (!otherInstalls.some((install) => install.pluginId === selectedSource)) {
          setSwitchState({
            state: "failed",
          });
          return;
        }
        let toggleMcpServer = getReplaceUnavailableReason();
        if (toggleMcpServer !== undefined) setReplaceInfo(describeReplaceUnavailable(toggleMcpServer, "ui"));
        else if (
          otherInstalls.some((install) => !install.replaceable) ||
          !canReplaceOfficialInstalls(officialMarketplaceAlternative.pluginId, otherInstalls)
        )
          setReplaceInfo(
            installFromOtherMarketplace(
              officialMarketplaceAlternative.pluginId,
              pluginByIdCacheOnly.entry.name,
              otherInstalls,
              "ui",
            ),
          );
        setSwitchState({
          state: "known",
          removesSavedData,
          listedName: pluginByIdCacheOnly.entry.name,
          replaced: otherInstalls,
          inOtherProjects,
          alsoInstalledElsewhere: otherProjectInstalls.map(
            (otherProjectInstall) => otherProjectInstall.pluginId,
          ),
        });
      }
    })().catch((error) => {
      if (!cancelled)
        setSwitchState({
          state: "failed",
        });
      logForDebugging(`Switch offer for ${selectedSource} could not be worked out: ${errorMessage(error)}`, {
        level: "warn",
      });
    });
    return () => {
      cancelled = true;
    };
  }, [selectedSource, selectedPlugin?.scope, storageV5]);
  let [switchPlan, setSwitchPlan] = useState(undefined);
  let pluginId =
    typeof viewState === "object" && viewState.type === "confirm-switch-copy"
      ? viewState.copy.pluginId
      : undefined;
  useEffect(() => {
    setSwitchPlan(undefined);
    {
      if (!selectedSource || pluginId === undefined || replaceInfo !== null) return;
      let cancelled = false;
      wouldTargetKeepOwnPluginOptions(selectedSource, pluginId).then(
        (plan) => {
          if (!cancelled) setSwitchPlan(plan);
        },
        (error) => {
          if (!cancelled) setSwitchPlan("unknown");
          logForDebugging(
            `Could not work out what switching ${selectedSource} to ${pluginId} would do with its settings: ${errorMessage(error)}`,
            {
              level: "warn",
            },
          );
        },
      );
      return () => {
        cancelled = true;
      };
    }
  }, [selectedSource, pluginId, replaceInfo]);
  let [isLoading, setIsLoading] = useState(false);
  let busy = useRef(false);
  let [error, setError] = useState(null);
  let [notice, setNotice] = useState(null);
  let [reloadKey, setReloadKey] = useState(0);
  let showNotice = useCallback(
    (text, clearedErrorIds = []) => {
      flaggedPlugins.removeErrorsOf(clearedErrorIds);
      setNotice(text);
      setIsLoading(false);
      setSelectedPlugin(null);
      setViewState_2("plugin-list");
      setReloadKey((n) => n + 1);
      onManageComplete();
    },
    [onManageComplete, flaggedPlugins],
  );
  let applyHint = changesApplyOnClose ? "Applies when you close this menu." : "Run /reload-plugins to apply.";
  let inFlight = useRef(new Set());
  let trackInFlight = useCallback((promise) => {
    inFlight.current.add(promise);
    promise.finally(() => inFlight.current.delete(promise));
  }, []);
  let autoNavDone = useRef(false);
  let selectedKeys = useRef(new Set());
  let selectedForInstall = useRef(new Set());
  let pendingAutoActionRef_2 = useRef(undefined);
  let mcpToggleEnabled = useMcpToggleEnabled();
  let handleBack = useCallback(() => {
    if (viewState === "plugin-details") {
      setViewState_2("plugin-list");
      setSelectedPlugin(null);
      setError(null);
    } else if (typeof viewState === "object" && viewState.type === "failed-plugin-details") {
      setViewState_2("plugin-list");
      setError(null);
    } else if (viewState === "configuring") {
      setViewState_2("plugin-details");
      setConfigNeeded(null);
    } else if (viewState === "plugin-usage") setViewState_2("plugin-details");
    else if (typeof viewState === "object" && viewState.type === "plugin-options")
      showNotice(`Plugin enabled. Configuration skipped. ${applyHint}`);
    else if (typeof viewState === "object" && viewState.type === "configuring-options")
      setResult("Configuration cancelled.");
    else if (typeof viewState === "object" && viewState.type === "flagged-detail") {
      setViewState_2("plugin-list");
      setError(null);
    } else if (typeof viewState === "object" && viewState.type === "mcp-detail") {
      setViewState_2("plugin-list");
      setError(null);
    } else if (typeof viewState === "object" && viewState.type === "skill-detail") {
      setViewState_2("plugin-list");
      setError(null);
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
      let pending = inFlight.current;
      if (pending.size > 0) {
        Promise.allSettled(pending).then(() =>
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
  }, [viewState, setViewState, setResult, showNotice, applyHint]);
  useKeybinding("confirm:no", handleBack, {
    context: "Settings",
    isActive:
      (viewState !== "plugin-list" || !isSearchMode) &&
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
  let unifiedItems = useMemo(() => {
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
    let errorSet = new Set();
    let items = [];
    let enabledBySource = watchUnsubscribe;
    for (let state of pluginStates) {
      let pluginInSettings = findPluginInSettings_2(state.plugin.source);
      let pendingToggle = pendingToggles.get(pluginInSettings);
      let isEnabled =
        pendingToggle !== undefined
          ? pendingToggle === "will-disable"
          : isPluginEffectivelyEnabled(pluginInSettings, state.plugin, enabledBySource);
      let errors = pluginErrors.filter(
        (pluginError) =>
          !isAutoupdateInfoError(pluginError) &&
          matchesPluginSource(pluginError, pluginInSettings, state.plugin.name),
      );
      for (let error of errors) errorSet.add(error);
      let originalScope = state.plugin.isBuiltin ? "builtin" : state.scope || "user";
      let activity =
        commands && lanternPrismEnabled()
          ? formatLastPrompt(state.plugin.manifest.name, commands)
          : undefined;
      items.push({
        item: {
          type: "plugin",
          id: pluginInSettings,
          name: state.plugin.name,
          displayName: state.plugin.manifest.displayName,
          description: state.plugin.manifest.description,
          marketplace: state.marketplace,
          scope: originalScope,
          isEnabled,
          errorCount: errors.length,
          errors,
          plugin: state.plugin,
          pendingEnable: state.pendingEnable,
          pendingUpdate: state.pendingUpdate,
          pendingToggle,
          activity: activity
            ? {
                skillCount: activity.skillCount,
                totalCount: activity.totalCount,
              }
            : undefined,
        },
        originalScope,
        childMcps: isEnabled
          ? pluginMcpMap.get(pluginDisplayKey(state.plugin.name, state.plugin.source)) || []
          : [],
      });
    }
    let orphanErrorsBySource = new Map();
    for (let error of pluginErrors) {
      if (isAutoupdateInfoError(error)) continue;
      let isOrphan = isOrphanPlugin(error);
      if (!isOrphan && errorSet.has(error)) continue;
      let groupKey = isOrphan ? `orphan:${error.source}` : error.source;
      let group = orphanErrorsBySource.get(groupKey) || [];
      group.push(error);
      orphanErrorsBySource.set(groupKey, group);
    }
    let pluginScopes = getPluginEditableScopes();
    let failedPluginItems = [];
    for (let [groupKey, errors] of orphanErrorsBySource) {
      let source = groupKey.startsWith("orphan:") ? groupKey.slice(7) : groupKey;
      if (source in flaggedPlugins_2) continue;
      let parsed = splitPluginId(source);
      let pluginName = parsed.name || source;
      let marketplace = parsed.marketplace || marketplaceOf(source) || "unknown";
      let rawScope = editableScopeOf(pluginScopes, source);
      let scope = rawScope === "flag" || rawScope === undefined ? "user" : rawScope;
      failedPluginItems.push({
        type: "failed-plugin",
        id: groupKey,
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
    let skillItems = [];
    if (commands) {
      let commandNames = new Set(
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
        if (
          commandNames.has(command.name) ||
          (command.loadedFrom !== "syncedSkills" && commandNames.has(commandName))
        )
          continue;
        let override = skillOverrideWithSource(command);
        let bareName = bareSkillName(command);
        let overrideValue = ownLookup(skillOverrides, command.name) ?? ownLookup(skillOverrides, bareName);
        let lockSource;
        let value;
        if (override) {
          lockSource = override.source === "policySettings" ? "policy" : "flag";
          value = override.value;
        } else if (!isNotProtoKey(command.name)) {
          lockSource = "reserved-name";
          value = command.disableModelInvocation ? "user-invocable-only" : "on";
        } else if (command.disableModelInvocation) {
          lockSource = "author";
          value = overrideValue === "off" ? "off" : "user-invocable-only";
        } else value = overrideValue ?? "on";
        skillItems.push({
          type: "skill",
          id: getSkillItemKey(command),
          cmdName: command.name,
          unqualifiedName: bareName,
          name: commandName,
          description: command.description,
          scope: "skills",
          source:
            command.loadedFrom === "syncedSkills"
              ? CLAUDE_AI_SYNC_LABEL
              : getSettingSourceName(command.source),
          override: value,
          whenToUse: command.whenToUse,
          skillRoot: command.skillRoot,
          allowedTools: command.allowedTools,
          lockSource,
          tokenEstimate: roughTokenCountEstimation(
            [command.name, command.description, command.whenToUse].filter(Boolean).join(" "),
          ),
          usage: (() => {
            let usage =
              getOwn(skillUsage, command.name) ??
              (bareName != null ? getOwn(skillUsage, bareName) : undefined);
            return usage
              ? {
                  count: usage.usageCount,
                  daysSinceUse: Math.max(0, Math.floor((now - usage.lastUsedAt) / 86400000)),
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
    for (let { item, originalScope, childMcps } of items) {
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
    if (skillItems.length > 0) itemsByScope.set("skills", skillItems);
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
    let sortedScopes = [...itemsByScope.keys()].sort((a, b) => (scopeOrder[a] ?? 99) - (scopeOrder[b] ?? 99));
    for (let scope of sortedScopes) {
      let items = itemsByScope.get(scope);
      let groups = [];
      let standaloneMcps = [];
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
          groups.push(group);
        } else if (item.type === "mcp" && !item.indented) {
          standaloneMcps.push(item);
          i++;
        } else if (item.type === "skill") {
          standaloneMcpsInScope.push(item);
          i++;
        } else i++;
      }
      groups.sort((a_0, b_0) => a_0[0].name.localeCompare(b_0[0].name));
      standaloneMcps.sort((a_1, b_1) => a_1.name.localeCompare(b_1.name));
      standaloneMcpsInScope.sort((a, b) => a.name.localeCompare(b.name));
      for (let group_0 of groups) unified.push(...group_0);
      unified.push(...standaloneMcps);
      unified.push(...standaloneMcpsInScope);
    }
    return unified;
  }, [
    pluginStates,
    mcpClients,
    pluginErrors,
    pendingToggles,
    flaggedPlugins_2,
    commands,
    refreshTick,
    watchUnsubscribe,
  ]);
  let flaggedIds = useMemo(
    () => unifiedItems.filter((item) => item.type === "flagged-plugin").map((item) => item.id),
    [unifiedItems],
  );
  useEffect(() => {
    if (flaggedIds.length > 0) markFlaggedPluginsSeen(flaggedIds, storageV5);
  }, [flaggedIds, storageV5]);
  let [favorites, setFavorites] = useState(
    () => new Set((getGlobalConfig().favoritePlugins ?? []).map(findPluginInSettings_2)),
  );
  let filteredItems = useMemo(
    () =>
      (commands ?? []).flatMap((command) =>
        command.type === "prompt"
          ? [
              {
                name: command.name,
                source: command.source,
                loadedFrom: command.loadedFrom,
              },
            ]
          : [],
      ),
    [commands],
  );
  let favoriteIds = useMemo(
    () => expandSyncedSkillSelection(favorites, filteredItems),
    [favorites, filteredItems],
  );
  let toggleFavorite = useCallback(
    (pluginId) => {
      setFavorites((prev) => {
        let next = toggleSkillKeySelection(prev, pluginId, filteredItems);
        saveGlobalConfig(
          (state) => ({
            ...state,
            favoritePlugins: [...next],
          }),
          storageV5,
        );
        return next;
      });
    },
    [filteredItems, storageV5],
  );
  let [showDisabled, setShowDisabled] = useState(false);
  let [disusedDays, setDisusedDays] = useState(() => new Map());
  useEffect(() => {
    let shownOnce = false;
    computeDisusedPlugins().then((disusedPlugins) => {
      if (shownOnce || disusedPlugins.length === 0) return;
      setDisusedDays(
        new Map(
          disusedPlugins.map((disusedPlugin) => [
            findPluginInSettings_2(disusedPlugin.pluginId),
            disusedPlugin.daysSinceLastUse,
          ]),
        ),
      );
    });
    return () => {
      shownOnce = true;
    };
  }, []);
  let recordDisusedShown = useCallback(
    (action, pluginId) => {
      if (pluginId === null || !disusedDays.has(pluginId)) return;
      logFeatureOk("cli_plugin_disuse_review");
      logEvent("tengu_plugin_disuse_review_action", {
        action: fromEnum(action),
        ...buildPluginEventFieldsFromId(pluginId),
      });
      setDisusedDays((map) => {
        if (!map.has(pluginId)) return map;
        let next = new Map(map);
        next.delete(pluginId);
        return next;
      });
    },
    [disusedDays],
  );
  let displayRows = useMemo(
    () =>
      buildInstalledSections(unifiedItems, {
        searchQuery,
        favoriteIds,
        showDisabled,
        disusedDays,
        keepInPlaceIds,
      }),
    [unifiedItems, searchQuery, favoriteIds, showDisabled, disusedDays, keepInPlaceIds],
  );
  let nameWidth = useMemo(
    () =>
      getSourceTitle({
        items: unifiedItems,
        healthByPluginName: skillHealthData,
        columns,
      }),
    [unifiedItems, skillHealthData, columns],
  );
  let attentionRows = useMemo(() => {
    let flattened = displayRows.flatMap((row) =>
      row.kind === "item" && row.section === "attention" ? [row.item] : [],
    );
    return flattened.every((row) => row.type === "mcp" && row.status === "needs-auth") ? flattened.length : 0;
  }, [displayRows]);
  let stepSelection = useCallback(
    (index, delta) => {
      let next = delta === -1 ? Math.min(index, displayRows.length - 1) : index;
      for (let cursor = next; cursor >= 0 && cursor < displayRows.length; cursor += delta)
        if (isListNavItem(displayRows[cursor])) return cursor;
      return -1;
    },
    [displayRows],
  );
  let [selectedIndex, setSelectedIndex] = useState(0);
  let pendingFocus = useRef(null);
  useEffect(() => {
    if (displayRows.length === 0) return;
    let focus = pendingFocus.current;
    if (focus) {
      pendingFocus.current = null;
      let index = displayRows.findIndex(
        (row) => row.kind === "item" && row.section === focus.section && row.item.id === focus.id,
      );
      if (index === -1)
        index = displayRows.findIndex((item_5) => item_5.kind === "item" && item_5.item.id === focus.id);
      if (index !== -1) {
        setSelectedIndex(index);
        return;
      }
    }
    if (!isListNavItem(displayRows[selectedIndex])) {
      let forward = stepSelection(selectedIndex, 1);
      let backward = stepSelection(selectedIndex, -1);
      setSelectedIndex(forward !== -1 ? forward : backward !== -1 ? backward : 0);
    }
  }, [displayRows, selectedIndex, stepSelection]);
  let maxVisible = isTerminalFocused_2 ? Math.max(8, rows - 10) : 8;
  let firstSelectableIndex = useMemo(() => Math.max(0, displayRows.findIndex(isListNavItem)), [displayRows]);
  let client = typeof viewState === "object" && "client" in viewState ? viewState.client : undefined;
  let origin = useMemo(
    () => (client ? describeMcpServerOrigin(client.name, client.config) : undefined),
    [client],
  );
  let pagination = usePagination({
    totalItems: displayRows.length,
    selectedIndex,
    maxVisible,
    firstSelectableIndex,
    onScroll: (index) =>
      setSelectedIndex((current) => {
        let min = Math.min(index + maxVisible, displayRows.length);
        if (current >= index && current < min) return current;
        let isInRange = (candidate) => (candidate >= index && candidate < min ? candidate : -1);
        let chosen =
          current < index ? isInRange(stepSelection(index, 1)) : isInRange(stepSelection(min - 1, -1));
        return chosen === -1 ? current : chosen;
      }),
  });
  let [selectedClient, setClient] = useState();
  let [configNeeded, setConfigNeeded] = useState(null);
  let [_isLoadingConfig, setIsLoadingConfig] = useState(false);
  let [selectedPluginHasMcpb, setSelectedPluginHasMcpb] = useState(false);
  useEffect(() => {
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
          let pluginName = parsePluginIdentifier(selectedPlugin.plugin.source).name;
          let entry = marketplace.plugins?.find(
            (plugin) => plugin.name === pluginName || plugin.name === selectedPlugin.plugin.name,
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
      if (!cancelled) setSelectedPluginHasMcpb(hasMcpb);
    }
    let cancelled = false;
    detectMcpb();
    return isStorageV5Enabled() && storageV5 !== undefined
      ? () => {
          cancelled = true;
        }
      : undefined;
  }, [selectedPlugin, storageV5]);
  useEffect(() => {
    let alreadyLoading = reloadKey > 0;
    async function loadInstalledPlugins() {
      if (!alreadyLoading) setLoading(true);
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
          let enabledCount = count(plugins, (plugin) => {
            let pluginInSettings = findPluginInSettings_2(plugin.source);
            return isPluginEffectivelyEnabled(pluginInSettings, plugin, enabledPluginsBySource);
          });
          let disabledCount = plugins.length - enabledCount;
          marketplaceInfos.push({
            name,
            installedPlugins: plugins,
            enabledCount,
            disabledCount,
          });
        }
        marketplaceInfos.sort((a, b) => {
          if (a.name === ANTHROPIC_PLUGIN_DIRECTORY) return -1;
          if (b.name === ANTHROPIC_PLUGIN_DIRECTORY) return 1;
          return a.name.localeCompare(b.name);
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
        if (!alreadyLoading) setSelectedIndex(0);
      } finally {
        setLoading(false);
      }
    }
    loadInstalledPlugins();
  }, [reloadKey, storageV5, credentials]);
  useEffect(() => {
    if (autoNavDone.current) return;
    let loadedState =
      marketplaces.length > 0 || unifiedItems.some((unified) => unified.type === "failed-plugin");
    if (targetPlugin && loadedState && !loading) {
      let { name: targetName, marketplace: targetMktFromId } =
        targetMarketplace !== undefined
          ? {
              name: targetPlugin,
              marketplace: undefined,
            }
          : parsePluginIdentifier(normalizePluginId(targetPlugin));
      let marketplaceName = targetMarketplace ?? targetMktFromId;
      let normalizedMarketplace =
        marketplaceName === undefined ? undefined : normalizeReservedMarketplaceCase(marketplaceName);
      let marketplacesToSearch = normalizedMarketplace
        ? marketplaces.filter((m) => m.name === normalizedMarketplace)
        : marketplaces;
      for (let marketplace of marketplacesToSearch) {
        let plugin = marketplace.installedPlugins.find(
          (p_0) =>
            pluginNamesEqual(p_0.name, targetName) ||
            pluginNamesEqual(parsePluginIdentifier(p_0.source).name, targetName),
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
          autoNavDone.current = true;
          return;
        }
      }
      let failedItem = unifiedItems.find(
        (item) =>
          item.type === "failed-plugin" &&
          pluginNamesEqual(item.name, targetName) &&
          (!normalizedMarketplace || item.marketplace === normalizedMarketplace),
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
        autoNavDone.current = true;
      }
      if (!autoNavDone.current && action) {
        autoNavDone.current = true;
        setResult(`Plugin "${targetPlugin}" is not installed in this project`);
      }
    }
  }, [targetPlugin, targetMarketplace, marketplaces, loading, unifiedItems, action, setResult]);
  let handleSingleOperation = async (operation) => {
    if (busy.current) return;
    if (!selectedPlugin) return;
    let pluginScope = selectedPlugin.scope || "user";
    let isBuiltin = pluginScope === "builtin";
    if (isBuiltin && (operation === "update" || operation === "uninstall")) {
      setError("Built-in plugins cannot be updated or uninstalled.");
      return;
    }
    if (!isBuiltin && !isInstallableScope(pluginScope) && operation !== "update") {
      setError(MANAGED_PLUGIN_DISABLE_MESSAGE);
      return;
    }
    busy.current = true;
    setIsLoading(true);
    setError(null);
    try {
      let pluginId = selectedSource;
      let reverseDependents;
      let directoryNote;
      let savedNotes;
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
          reverseDependents = disableResult.reverseDependents;
          break;
        }
        case "uninstall": {
          if (isBuiltin) break;
          if (!isInstallableScope(pluginScope)) break;
          if (isPluginEnabledAtProjectScope(pluginId)) {
            setIsLoading(false);
            setViewState_2("confirm-project-uninstall");
            return;
          }
          let installs = getInstalledPlugins().plugins[pluginId];
          let dataDirSize = !installs || installs.length <= 1 ? await getPluginDataDirSize(pluginId) : null;
          if (dataDirSize) {
            setIsLoading(false);
            setViewState_2({
              type: "confirm-data-cleanup",
              size: dataDirSize,
            });
            return;
          }
          let uninstalled = await uninstallPluginOp(pluginId, pluginScope, undefined, storageV5);
          if (!uninstalled.success) throw Error(uninstalled.message);
          logPluginToggleScreen({
            operation: "uninstall",
            pluginId: uninstalled.pluginId || pluginId,
            scope: uninstalled.scope || pluginScope,
            savedKept: uninstalled.savedKept !== undefined,
            storageV5,
          });
          reverseDependents = uninstalled.reverseDependents;
          directoryNote = uninstalled.directoryNameNote;
          savedNotes = [uninstalled.savedKept?.note, uninstalled.olderLocalSettingsSkippedNote]
            .filter((note) => note !== undefined)
            .join(" ");
          break;
        }
        case "update": {
          if (isBuiltin) break;
          let updated = await updatePluginOp(
            pluginId,
            pluginScope,
            {
              explicit: true,
              consentedEntryHelper: hasAutoNavigated.pinned(),
            },
            storageV5,
          );
          switch (updated.outcome) {
            case "failed":
              if (
                updated.failureCode === "entry_helper_unshown" ||
                updated.failureCode === "entry_helper_changed" ||
                updated.failureCode === "entry_archive_url_changed"
              )
                setListTick((n) => n + 1);
              throw Error(updated.message);
            case "up_to_date":
            case "skipped":
              setResult(updated.message);
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
      setPendingToggles((map) => {
        if (!map.has(pluginId)) return map;
        let next = new Map(map);
        next.delete(pluginId);
        return next;
      });
      if (operation === "disable" || operation === "uninstall") recordDisusedShown(operation, selectedSource);
      let enabledAfter = isPluginEffectivelyEnabled(
        pluginId,
        selectedPlugin.plugin,
        getEnabledPluginsBySource(),
      );
      if (operation !== "uninstall" && operation !== "update" && enabledAfter) {
        setIsLoading(false);
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
      let dependencySuffix =
        reverseDependents && reverseDependents.length > 0
          ? ` \xB7 required by ${reverseDependents.join(", ")}`
          : "";
      let message = `${figures_default.tick} ${operationName} ${getPluginDisplayName(selectedPlugin.plugin)}${dependencySuffix}.${directoryNote === undefined ? "" : ` ${stripInvisibleKeepEmoji(directoryNote)}`}${savedNotes === undefined || savedNotes === "" ? "" : ` ${stripInvisibleKeepEmoji(savedNotes)}`}`;
      if (operation === "update") {
        setResult(message);
        await onManageComplete();
        setViewState({
          type: "menu",
        });
      } else
        showNotice(
          `${message} ${applyHint}`,
          operation === "uninstall" ? await listUnscopedPluginForProject(pluginId, storageV5) : [],
        );
    } catch (error) {
      setIsLoading(false);
      let errorMessage = error instanceof Error ? error.message : String(error);
      setError(`Failed to ${operation}: ${errorMessage}`);
      logForDebugging(`Failed to ${operation} plugin: ${errorMessage}`, {
        level: "error",
      });
    } finally {
      busy.current = false;
    }
  };
  let handleSingleOperationRef = useEffectEvent(handleSingleOperation);
  useEffect(() => {
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
  let handleToggle = useCallback(async () => {
    let row = displayRows[selectedIndex];
    if (!isListNavItem(row)) return;
    if (row.kind === "disabled-header") {
      setShowDisabled((show) => !show);
      return;
    }
    let item = row.item;
    if (item.type === "flagged-plugin") return;
    if (item.type === "plugin") {
      let id = item.id;
      let currentPending = pendingToggles.get(id);
      let isEnabled = isPluginEffectivelyEnabled(id, item.plugin, watchUnsubscribe);
      let pluginScope = item.scope;
      let isBuiltin = pluginScope === "builtin";
      if (isRequiredPlugin(id, item.plugin.installationPreference)) {
        setError(requiredPluginMessage(id));
        return;
      }
      if (isBuiltin || isInstallableScope(pluginScope)) {
        if (selectedForInstall.current.has(id)) return;
        selectedForInstall.current.add(id);
        setKeepInPlaceIds((set) => new Set(set).add(id));
        let newPending = new Map(pendingToggles);
        if (currentPending) {
          newPending.delete(id);
          setError(null);
          let revertToggle = (async () => {
            try {
              let disableResult =
                currentPending === "will-disable"
                  ? await enablePluginOp(id, undefined, storageV5)
                  : await disablePluginOp(id, undefined, storageV5);
              if (!disableResult.success && !disableResult.alreadyInGoalState) {
                setPendingToggles((map) => {
                  let next = new Map(map);
                  next.set(id, currentPending);
                  return next;
                });
                setError(disableResult.message);
                return;
              }
              if (disableResult.success)
                logPluginToggleScreen({
                  operation: currentPending === "will-disable" ? "enable" : "disable",
                  pluginId: disableResult.pluginId || id,
                  scope: disableResult.scope,
                  storageV5,
                });
              refreshPluginCaches(storageV5, credentials);
            } catch (err_0) {
              setPendingToggles((map) => {
                let next = new Map(map);
                next.set(id, currentPending);
                return next;
              });
              setError(`Failed to reverse the toggle: ${errorMessage(err_0)}`);
              logError(
                withTelemetryMessage(toError(err_0), "/plugin: reversing a pending toggle on the list threw"),
              );
            } finally {
              selectedForInstall.current.delete(id);
            }
          })();
          trackInFlight(revertToggle);
        } else {
          newPending.set(id, isEnabled ? "will-disable" : "will-enable");
          setError(null);
          let applyToggle = (async () => {
            try {
              let toggleResult = isEnabled
                ? await disablePluginOp(id, undefined, storageV5)
                : await enablePluginOp(id, undefined, storageV5);
              if (!toggleResult.success) {
                setPendingToggles((map) => {
                  let next = new Map(map);
                  next.delete(id);
                  return next;
                });
                setError(toggleResult.message);
                return;
              }
              logPluginToggleScreen({
                operation: isEnabled ? "disable" : "enable",
                pluginId: toggleResult.pluginId || id,
                scope: toggleResult.scope,
                storageV5,
              });
              refreshPluginCaches(storageV5, credentials);
              onManageComplete();
              if (isEnabled) recordDisusedShown("disable", id);
            } catch (err_1) {
              setPendingToggles((map) => {
                let next = new Map(map);
                next.delete(id);
                return next;
              });
              setError(`Failed to toggle: ${errorMessage(err_1)}`);
              logError(withTelemetryMessage(toError(err_1), "/plugin: toggling a plugin on the list threw"));
            } finally {
              selectedForInstall.current.delete(id);
            }
          })();
          trackInFlight(applyToggle);
        }
        setPendingToggles(newPending);
      }
    } else if (item.type === "mcp") {
      setError(null);
      let mcpOperation = item.client.type !== "disabled" ? "disable" : "enable";
      mcpToggleEnabled(item.client.name).catch((error) => {
        setError(
          formatMcpOperationFailure(error, item.client.name, mcpOperation, {
            config: item.client.config,
            persistsOffBox: false,
          }),
        );
      });
    } else if (item.type === "skill") {
      if (selectedKeys.current.has(item.id)) return;
      let nextOverride = nextSkillOverrideState(item.override, item.lockSource);
      if (nextOverride === item.override) return;
      selectedKeys.current.add(item.id);
      setKeepInPlaceIds((set) => new Set(set).add(item.id));
      let { error } = await updateSettingsForSource(
        "localSettings",
        {
          skillOverrides: {
            [item.cmdName]: diffSkillOverrideFromSettings(item, nextOverride),
          },
        },
        undefined,
        storageV5,
      );
      selectedKeys.current.delete(item.id);
      if (error) {
        setError(error.message);
        return;
      }
      setRefreshTick((n) => n + 1);
    }
  }, [
    selectedIndex,
    displayRows,
    pendingToggles,
    pluginStates,
    mcpToggleEnabled,
    recordDisusedShown,
    onManageComplete,
    trackInFlight,
    storageV5,
    credentials,
    watchUnsubscribe,
  ]);
  let handleAccept = useCallback(() => {
    let row = displayRows[selectedIndex];
    if (!isListNavItem(row)) return;
    if (row.kind === "disabled-header") {
      setShowDisabled((show) => !show);
      return;
    }
    let item = row.item;
    if (item.type === "plugin") {
      let state = pluginStates.find((s_4) => s_4.plugin.source === item.plugin.source);
      if (state) {
        setSelectedPlugin(state);
        setViewState_2("plugin-details");
        setClient(undefined);
        setError(null);
        setNotice(null);
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
      setError(null);
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
      setError(null);
    } else if (item.type === "mcp") {
      setViewState_2({
        type: "mcp-detail",
        client: item.client,
      });
      setError(null);
    } else if (item.type === "skill") {
      setViewState_2({
        type: "skill-detail",
        skill: item,
      });
      setError(null);
    }
  }, [selectedIndex, displayRows, pluginStates]);
  MessageActionsKeybindings(
    {
      "select:previous": () => {
        let previousRow = stepSelection(selectedIndex - 1, -1);
        if (previousRow === -1) {
          if (!loading && unifiedItems.length > 0) setIsSearchMode(true);
        } else pagination.handleSelectionChange(previousRow, setSelectedIndex);
      },
      "select:next": () => {
        let nextRow = stepSelection(selectedIndex + 1, 1);
        if (nextRow !== -1) pagination.handleSelectionChange(nextRow, setSelectedIndex);
      },
      "select:accept": handleAccept,
    },
    {
      context: "Select",
      isActive: viewState === "plugin-list" && !isSearchMode,
    },
  );
  let toggleFavoriteCurrent = useCallback(() => {
    let row = displayRows[selectedIndex];
    if (row?.kind !== "item") return false;
    pendingFocus.current = {
      section: row.section,
      id: row.item.id,
    };
    toggleFavorite(row.item.id);
  }, [displayRows, selectedIndex, toggleFavorite]);
  MessageActionsKeybindings(
    {
      "plugin:toggle": handleToggle,
      "plugin:favorite": toggleFavoriteCurrent,
    },
    {
      context: "Plugin",
      isActive: viewState === "plugin-list" && !isSearchMode,
    },
  );
  let handleFlaggedDismiss = useCallback(() => {
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
  let detailsMenu = useMemo(() => {
    if (viewState !== "plugin-details" || !selectedPlugin) return [];
    let pluginId = selectedSource;
    let isEnabled = isPluginEffectivelyEnabled(pluginId, selectedPlugin.plugin, watchUnsubscribe);
    let isBuiltin = selectedPlugin.marketplace === "builtin";
    let isOfficial = isOfficialMarketplace(selectedPlugin.marketplace);
    let options = [];
    if (!isRequiredPlugin(pluginId, selectedPlugin.plugin.installationPreference))
      options.push({
        value: "toggle-enabled",
        label: isEnabled ? "Disable plugin" : "Enable plugin",
        action: () => void handleSingleOperation(isEnabled ? "disable" : "enable"),
      });
    options.push({
      value: "favorite",
      label: favoriteIds.has(pluginId) ? "Remove from favorites" : "Add to favorites",
      action: () => toggleFavorite(pluginId),
    });
    if (!isBuiltin && !isOfficial) {
      options.push({
        value: "mark-for-update",
        label: selectedPlugin.pendingUpdate ? "Unmark for update" : "Mark for update",
        action: async () => {
          try {
            let localError = await checkIfLocalPlugin(
              parsePluginIdentifier(pluginId).name,
              selectedPlugin.marketplace,
              storageV5,
            );
            if (localError) {
              setError(localError);
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
            setError(error instanceof Error ? error.message : "Failed to check plugin update availability");
          }
        },
      });
      if (selectedPluginHasMcpb)
        options.push({
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
                setError("No MCPB file found in plugin");
                setIsLoadingConfig(false);
                return;
              }
              let pluginId = selectedSource;
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
              } else setError("Failed to load MCPB for configuration");
            } catch (err) {
              let errorMsg = errorMessage(err);
              setError(`Failed to load configuration: ${errorMsg}`);
            } finally {
              setIsLoadingConfig(false);
            }
          },
        });
      options.push({
        value: "update",
        label: jsxProd_default(Text, {
          color: "suggestion",
          children: "Update now",
        }),
        action: () => void handleSingleOperation("update"),
      });
      options.push({
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
      options.push({
        value: "configure-options",
        label: "Configure options",
        action: () => {
          setViewState_2({
            type: "configuring-options",
            schema: selectedPlugin.plugin.manifest.userConfig,
          });
        },
      });
    let homepage = redactUrlCredentials(selectedPlugin.plugin.manifest.homepage);
    if (homepage)
      options.push({
        value: "homepage",
        label: "Open homepage",
        action: () => void openValidatedUrlSucceeded(homepage),
      });
    let repository = redactUrlCredentials(selectedPlugin.plugin.manifest.repository);
    if (repository)
      options.push({
        value: "repository",
        label: "View repository",
        action: () => void openValidatedUrlSucceeded(repository),
      });
    if (lanternPrismEnabled())
      options.push({
        value: "usage",
        label: "Usage",
        action: () => setViewState_2("plugin-usage"),
      });
    if (officialAlt && !isBuiltin && !isOfficial) {
      let officialAltSource = officialAlt;
      options.push({
        value: "switch-copy",
        label: `Switch to ${truncateMarketplaceLabel(officialAltSource.marketplace)}`,
        action: () => {
          setError(null);
          setViewState_2({
            type: "confirm-switch-copy",
            copy: officialAltSource,
          });
        },
      });
    }
    options.push({
      value: "back",
      label: "Back to plugin list",
      action: () => {
        setViewState_2("plugin-list");
        setSelectedPlugin(null);
        setError(null);
      },
    });
    return options;
  }, [
    viewState,
    selectedPlugin,
    selectedPluginHasMcpb,
    pluginStates,
    favoriteIds,
    toggleFavorite,
    storageV5,
    watchUnsubscribe,
    officialAlt,
  ]);
  MessageActionsKeybindings(
    {
      "select:accept": () => {
        if (typeof viewState === "object" && viewState.type === "failed-plugin-details")
          (async () => {
            setIsLoading(true);
            setError(null);
            let pluginId_7 = viewState.plugin.id;
            let pluginScope_1 = viewState.plugin.scope;
            let uninstallResult = await uninstallPluginOp(
              pluginId_7,
              isInstallableScope(pluginScope_1) ? pluginScope_1 : "user",
              false,
              storageV5,
              {
                settingsStillOn: "remove-anyway",
              },
            );
            if (uninstallResult.success && uninstallResult.pluginId)
              logPluginToggleScreen({
                operation: "uninstall",
                pluginId: uninstallResult.pluginId,
                scope: uninstallResult.scope || (isInstallableScope(pluginScope_1) ? pluginScope_1 : "user"),
                savedKept: uninstallResult.savedKept !== undefined,
                storageV5,
              });
            let success = uninstallResult.success;
            let failedSkips = 0;
            let failureMessage;
            if (!success) {
              for (let source of EDITABLE_SETTING_SOURCES) {
                let settingsForSourceForUpkeep = getSettingsForSourceForUpkeep(source);
                let pluginName = findPluginName(
                  Object.keys(settingsForSourceForUpkeep?.enabledPlugins ?? {}),
                  pluginId_7,
                );
                if (pluginName !== undefined) {
                  let { error } = await updateSettingsForSourceWithTransform(
                    source,
                    (entry) => ({
                      enabledPlugins: {
                        ...entry?.enabledPlugins,
                        [pluginName]: undefined,
                      },
                    }),
                    undefined,
                    storageV5,
                  );
                  if (error) {
                    failureMessage = error;
                    break;
                  }
                  failedSkips++;
                  success = true;
                }
              }
              refreshPluginCaches(storageV5, credentials);
            }
            if (failureMessage) {
              if (failedSkips > 0) onManageComplete();
              setIsLoading(false);
              setError(
                failedSkips > 0
                  ? `Removed ${stripInvisibleKeepEmoji(viewState.plugin.name)} from ${failedSkips} ${plural(failedSkips, "settings file")}. Failed to write another: ${failureMessage.message}`
                  : `Failed to write settings: ${failureMessage.message}`,
              );
              return;
            }
            let installedPlugins = await loadInstalledPlugins(storageV5);
            let installedState = hasFailedInstalledPluginsRead(installedPlugins)
              ? getInstalledPlugins()
              : installedPlugins;
            let editableSources = [
              ...Object.entries(installedState.plugins).flatMap(([key, value]) =>
                hasInstallationForCurrentProject(value) ? [key] : [],
              ),
              ...EDITABLE_SETTING_SOURCES.flatMap((source) =>
                Object.keys(getSettingsForSourceForUpkeep(source)?.enabledPlugins ?? {}),
              ),
              ...getPluginEditableScopes().keys(),
            ];
            let any = editableSources.some((editableSource) => pluginNamesEqual(editableSource, pluginId_7));
            let partial =
              !success &&
              !mergePluginErrors(pluginId_7) &&
              !viewState.plugin.errors.some(isOrphanPlugin) &&
              isUninstalledPluginFailure(uninstallResult, pluginId_7, editableSources);
            if (success || partial) {
              let targetName = stripInvisibleKeepEmoji(viewState.plugin.name);
              let uninstallOk = uninstallResult.success
                ? `${stripInvisibleKeepEmoji(uninstallResult.message)} \xB7 data preserved`
                : success
                  ? `Removed ${targetName} from settings`
                  : `Removed ${targetName} from the list. It is not installed.`;
              showNotice(
                `${figures_default.tick} ${uninstallOk}`,
                uninstallResult.success
                  ? await listUnscopedPluginForProject(pluginId_7, storageV5)
                  : any
                    ? []
                    : [pluginId_7],
              );
            } else {
              setIsLoading(false);
              setError(stripInvisibleKeepEmoji(uninstallResult.message));
            }
          })().catch((error) => {
            setIsLoading(false);
            setError(stripInvisibleKeepEmoji(errorMessage(error)));
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
  function handleConfirmKey(event) {
    if (event.ctrl || event.meta || isLoading) return;
    if (!selectedPlugin) return;
    let pluginId = selectedSource;
    if (event.key === "y" || event.key === "Y" || event.key === "return") {
      event.preventDefault();
      if (managedPluginRefusal(pluginId) !== undefined) return;
      setIsLoading(true);
      setError(null);
      (async () => {
        try {
          let { error } = await updateSettingsForSourceWithTransform(
            "localSettings",
            (settings) => ({
              enabledPlugins: {
                ...settings?.enabledPlugins,
                [pluginId]: false,
              },
            }),
            undefined,
            storageV5,
          );
          if (error) {
            setIsLoading(false);
            setError(`Failed to write settings: ${error.message}`);
            return;
          }
          logPluginToggleScreen({
            operation: "disable",
            pluginId,
            scope: "local",
            storageV5,
          });
          refreshPluginCaches(storageV5, credentials);
          recordDisusedShown("disable", pluginId);
          showNotice(
            `${figures_default.tick} Disabled ${getPluginDisplayName(selectedPlugin.plugin)} in .claude/settings.local.json${flagSettingsEnabledNote(pluginId)}. ${applyHint}`,
          );
        } catch (error) {
          setIsLoading(false);
          setError(errorMessage(error));
        }
      })();
    } else if (event.key === "u" || event.key === "U") {
      event.preventDefault();
      setIsLoading(true);
      setError(null);
      (async () => {
        try {
          let originalCwd = getOriginalCwd();
          let installedAtProject =
            installationAtTarget(getInstalledPlugins().plugins[pluginId], "project", originalCwd) !==
            undefined;
          let removedMessage;
          if (installedAtProject) {
            let uninstallProject = await uninstallPluginOp(pluginId, "project", false, storageV5);
            if (!uninstallProject.success) {
              setIsLoading(false);
              setError(uninstallProject.message);
              return;
            }
            logPluginToggleScreen({
              operation: "uninstall",
              pluginId: uninstallProject.pluginId || pluginId,
              scope: uninstallProject.scope || "project",
              savedKept: uninstallProject.savedKept !== undefined,
              storageV5,
            });
            removedMessage = uninstallProject.message;
          } else {
            let { error } = await updateSettingsForSourceWithTransform(
              "projectSettings",
              (settings) => {
                let settings_2 = settings?.enabledPlugins ?? {};
                let resolvedName = findPluginName(Object.keys(settings_2), pluginId) ?? pluginId;
                return {
                  enabledPlugins: {
                    ...settings_2,
                    [resolvedName]: undefined,
                  },
                };
              },
              undefined,
              storageV5,
            );
            if (error) {
              setIsLoading(false);
              setError(`Failed to write settings: ${error.message}`);
              return;
            }
            removedMessage = `Removed ${getPluginDisplayName(selectedPlugin.plugin)} from .claude/settings.json`;
          }
          refreshPluginCaches(storageV5, credentials);
          recordDisusedShown("uninstall", pluginId);
          showNotice(
            `${figures_default.tick} ${removedMessage}. ${applyHint}`,
            await listUnscopedPluginForProject(pluginId, storageV5),
          );
        } catch (error) {
          setIsLoading(false);
          setError(errorMessage(error));
        }
      })();
    } else if (event.key === "n" || event.key === "N" || event.key === "escape") {
      event.preventDefault();
      setViewState_2("plugin-details");
      setError(null);
    }
  }
  function handleSwitchKey(event) {
    {
      if (event.ctrl || event.meta || isLoading || pendingAutoActionRef.current) return;
      if (!selectedPlugin || typeof viewState !== "object" || viewState.type !== "confirm-switch-copy")
        return;
      let scope = selectedPlugin.scope;
      let copy = viewState.copy;
      let pluginId = selectedSource;
      let settings = getPluginDisplayName(selectedPlugin.plugin);
      if (event.key === "y" || event.key === "Y") {
        event.preventDefault();
        if (
          (scope !== "user" && scope !== "local") ||
          replaceInfo !== null ||
          switchState.state !== "known" ||
          typeof switchPlan !== "boolean"
        )
          return;
        let replaceOnlyPluginIds = [
          ...(pluginId === null ? [] : [pluginId]),
          ...switchState.replaced
            .map((entry) => entry.pluginId)
            .filter((replacedPluginId) => replacedPluginId !== pluginId),
        ];
        let uncoveredPluginScopes = getUncoveredPluginScopes(switchState.replaced, scope, copy.pluginId);
        pendingAutoActionRef.current = true;
        setIsLoading(true);
        setError(null);
        (async () => {
          try {
            let installResult = await installPluginOp(
              copy.pluginId,
              scope,
              {
                replaceInstalledCopy: true,
                replaceOnlyPluginIds,
                surface: "installed_switch",
                ...(pluginId !== null && {
                  carrySettingsFrom: pluginId,
                }),
              },
              storageV5,
            );
            if (!installResult.success) {
              setIsLoading(false);
              setError(stripInvisibleKeepEmoji(installResult.message));
              return;
            }
            refreshPluginCaches(storageV5, credentials);
            let keptDataDir = installResult.switched?.keptDataDir;
            let listFormat = new Intl.ListFormat("en", {
              type: "conjunction",
            });
            let settingsRemovedFrom = installResult.switched?.settingsRemovedFrom ?? [];
            let savedDataRemovedFrom = installResult.switched?.savedDataRemovedFrom ?? [];
            let scopes = settingsRemovedFrom.filter((scope) => savedDataRemovedFrom.includes(scope));
            let scopes_2 = settingsRemovedFrom.filter((scope) => !savedDataRemovedFrom.includes(scope));
            let scopes_3 = savedDataRemovedFrom.filter((scope) => !settingsRemovedFrom.includes(scope));
            let formatScopes = (scopes) => listFormat.format(scopes.map((item) => displayPluginId(item)));
            let removedScopesText = listFormat.format([
              ...(scopes.length > 0 ? [`the settings and saved data for ${formatScopes(scopes)}`] : []),
              ...(scopes_2.length > 0 ? [`the settings saved for ${formatScopes(scopes_2)}`] : []),
              ...(scopes_3.length > 0 ? [`the saved data of ${formatScopes(scopes_3)}`] : []),
            ]);
            let filtered = uncoveredPluginScopes.filter(
              (uncoveredPluginScope) =>
                !installResult.switched?.oldCopyStillRecordedAt?.includes(uncoveredPluginScope),
            );
            showNotice(
              installResult.switched && !installResult.switched.messageSaysMore
                ? `${figures_default.tick} Switched ${pluginDisplayLabel(settings)} to ${truncateMarketplaceLabel(copy.marketplace)}${
                    installResult.switched.replaced.length > 1
                      ? ` from ${new Intl.ListFormat("en", {
                          type: "conjunction",
                        }).format(
                          installResult.switched.replaced.map((source) =>
                            truncateMarketplaceLabel(parsePluginIdentifier(source).marketplace ?? ""),
                          ),
                        )}`
                      : ""
                  }.${installResult.switched.keptOwnSettings ? ` ${capitalize(displayPluginId(copy.pluginId))} kept its own settings${removedScopesText === "" ? "" : `, and ${removedScopesText} were removed`}.` : removedScopesText === "" ? "" : ` ${capitalize(removedScopesText)} were removed.`}${installResult.switched.stayedDisabled ? " It stays disabled, as before." : ""}${
                    filtered.length === 0
                      ? ""
                      : ` It is no longer installed at ${new Intl.ListFormat("en", {
                          type: "conjunction",
                        }).format(filtered)} scope.`
                  }${keptDataDir === undefined ? "" : ` ${describeKeptDataDir(keptDataDir, copy.pluginId)}.`} ${applyHint}`
                : `${figures_default.tick} ${stripInvisibleKeepEmoji(installResult.message)}${
                    installResult.switched
                      ? `.${
                          filtered.length === 0
                            ? ""
                            : ` It is no longer installed at ${new Intl.ListFormat("en", {
                                type: "conjunction",
                              }).format(filtered)} scope.`
                        } ${applyHint}`
                      : ""
                  }`,
              (
                await Promise.all(
                  (installResult.switched?.replaced ?? (pluginId === null ? [] : [pluginId])).map(
                    (pluginId) => listUnscopedPluginForProject(pluginId, storageV5),
                  ),
                )
              ).flat(),
            );
          } catch (error) {
            setIsLoading(false);
            setError(stripInvisibleKeepEmoji(errorMessage(error)));
          } finally {
            pendingAutoActionRef.current = false;
          }
        })();
      } else if (event.key === "n" || event.key === "N" || event.key === "escape") {
        event.preventDefault();
        setViewState_2("plugin-details");
        setError(null);
      }
    }
  }
  function handleUninstallKey(event) {
    if (event.ctrl || event.meta || isLoading) return;
    if (!selectedPlugin) return;
    let pluginId = selectedSource;
    let pluginScope = selectedPlugin.scope;
    if (!pluginScope || pluginScope === "builtin" || !isInstallableScope(pluginScope)) return;
    let doUninstall = async (deleteDataDir) => {
      setIsLoading(true);
      setError(null);
      try {
        let uninstallResult = await uninstallPluginOp(pluginId, pluginScope, deleteDataDir, storageV5);
        if (!uninstallResult.success) throw Error(uninstallResult.message);
        logPluginToggleScreen({
          operation: "uninstall",
          pluginId: uninstallResult.pluginId || pluginId,
          scope: uninstallResult.scope || pluginScope,
          savedKept: uninstallResult.savedKept !== undefined,
          storageV5,
        });
        refreshPluginCaches(storageV5, credentials);
        recordDisusedShown("uninstall", pluginId);
        let suffix = (uninstallResult.dataDirKept ?? !deleteDataDir) ? " \xB7 data preserved" : "";
        showNotice(
          `${figures_default.tick} ${uninstallResult.message}${suffix}`,
          await listUnscopedPluginForProject(pluginId, storageV5),
        );
      } catch (e_0) {
        setIsLoading(false);
        setError(e_0 instanceof Error ? e_0.message : String(e_0));
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
      setError(null);
    }
  }
  useEffect(() => {
    setSelectedIndex(0);
  }, [searchQuery]);
  function handleCleanupKey(event) {
    if (isSearchMode) {
      handleKeyDown(event);
      return;
    }
    if (event.ctrl || event.meta) return;
    if (event.key === "/") {
      event.preventDefault();
      setIsSearchMode(true);
      setSearchQuery("");
      setSelectedIndex(0);
    } else if (event.key.length === 1 && event.key !== " ") {
      event.preventDefault();
      setIsSearchMode(true);
      setSearchQuery(event.key);
      setSelectedIndex(0);
    }
  }
  function finish(msg) {
    if (isSearchMode) {
      handlePaste(msg);
      return;
    }
    let trimmed = (msg.text.split(/\r\n|\r|\n/, 2)[0] ?? "").trim();
    if (!trimmed) return;
    msg.preventDefault();
    setIsSearchMode(true);
    setSearchQuery(trimmed);
    setSelectedIndex(0);
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
        notice &&
          jsxProd_default(Box, {
            marginBottom: 1,
            paddingLeft: 2,
            children: jsxProd_default(Text, {
              color: "success",
              children: stripInvisibleKeepNewlines(notice),
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
    let pluginId = selectedSource;
    return jsxProd_default(PluginOptionsFlow, {
      plugin: selectedPlugin.plugin,
      pluginId,
      onDone: (outcome, detail, outcomeDetail) => {
        let pluginDisplayName = getPluginDisplayName(selectedPlugin.plugin);
        switch (outcome) {
          case "configured":
          case "skipped":
            showNotice(
              outcome === "configured" && outcomeDetail
                ? `${figures_default.tick} Enabled and configured ${pluginDisplayName}. ${applyHint}`
                : `${figures_default.tick} Enabled ${pluginDisplayName}. ${applyHint}`,
            );
            break;
          case "error":
          case "read-error":
            setError(
              outcome === "error"
                ? `Failed to save configuration: ${detail}`
                : `Configuration not applied: could not read the saved options (${detail})`,
            );
            setIsLoading(false);
            setReloadKey((n) => n + 1);
            setViewState_2("plugin-details");
            onManageComplete();
            break;
        }
      },
    });
  }
  if (typeof viewState === "object" && viewState.type === "configuring-options" && selectedPlugin) {
    let pluginId = selectedSource;
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
            let hasValues = Object.keys(values).length > 0;
            if (hasValues) onManageComplete();
            setResult(hasValues ? "Configuration saved." : "No configuration changes.");
          } catch (err) {
            setError(`Failed to save configuration: ${errorMessage(err)}`);
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
    let pluginId = selectedSource;
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
          setError("No MCPB file found");
          setViewState_2("plugin-details");
          return;
        }
        await loadMcpbFile(
          mcpbPath,
          selectedPlugin.plugin.path,
          pluginId,
          undefined,
          config,
          undefined,
          storageV5,
        );
        setError(null);
        setConfigNeeded(null);
        setViewState_2("plugin-details");
        onManageComplete();
        setResult("Configuration saved.");
      } catch (err) {
        let errorMsg = errorMessage(err);
        setError(`Failed to save configuration: ${errorMsg}`);
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
    let message = managedPluginRefusal(selectedSource)?.message;
    return jsxProd_default_2(FocusColumn, {
      onKeyDown: handleConfirmKey,
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
        error &&
          jsxProd_default(Box, {
            marginTop: 1,
            children: jsxProd_default(ErrorText, {
              error: stripInvisibleKeepNewlines(error),
            }),
          }),
        jsxProd_default(Box, {
          marginTop: 1,
          children: isLoading
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
    let installations = getInstalledPlugins().plugins[selectedSource ?? ""];
    let gitCommitSha = findScopedInstallation(installations, selectedPlugin.scope)?.gitCommitSha;
    let marketplaceLabel_2 = truncateMarketplaceLabel(copy.marketplace);
    let displayName = pluginDisplayLabel(getPluginDisplayName(selectedPlugin.plugin));
    let filteredPluginErrors = (switchState.state === "known" ? switchState.replaced : []).filter(
      (e_1) => e_1.pluginId !== selectedSource,
    );
    let listFormat = new Intl.ListFormat("en", {
      type: "conjunction",
    });
    let mapped = filteredPluginErrors.map((filteredPluginError) =>
      marketplaceLabel(parsePluginIdentifier(filteredPluginError.pluginId).marketplace ?? ""),
    );
    let copyMarketplaceLabel = marketplaceLabel(copy.marketplace);
    let currentMarketplaceLabel = marketplaceLabel(selectedPlugin.marketplace);
    let scope = selectedPlugin.scope ?? "user";
    let scopeList =
      switchState.state === "known"
        ? getUncoveredPluginScopes(switchState.replaced, scope, copy.pluginId)
        : [];
    let filtered =
      switchState.state !== "known" || scopeList.length === 0
        ? ""
        : `The switch uninstalls ${listFormat.format(
            switchState.replaced
              .filter((entry) => entry.scopes.some((scope_2) => scope_2 !== scope))
              .toSorted(
                (error_3, i_0) =>
                  Number(i_0.pluginId === selectedSource) - Number(error_3.pluginId === selectedSource),
              )
              .map(
                (entry) => `${displayPluginId(entry.pluginId)} at ${listFormat.format(entry.scopes)} scope`,
              ),
          )}, and installs the new copy at ${scope} scope, so the plugin is no longer installed at ${listFormat.format(scopeList)} scope.`;
    let errorRows =
      switchState.state === "known"
        ? describeOtherMarketplaceInstall(copy.pluginId, switchState.listedName, switchState.inOtherProjects)
        : "";
    if (replaceInfo !== null)
      return jsxProd_default_2(FocusColumn, {
        onKeyDown: handleSwitchKey,
        children: [
          jsxProd_default_2(Text, {
            bold: true,
            children: [
              capitalize(displayName),
              " can't be switched to ",
              marketplaceLabel_2,
              " ",
              "from here",
            ],
          }),
          jsxProd_default(Box, {
            marginTop: 1,
            children: jsxProd_default(Text, {
              children: stripInvisibleKeepEmoji(replaceInfo),
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
    if (switchState.state !== "known" || typeof switchPlan !== "boolean")
      return jsxProd_default_2(FocusColumn, {
        onKeyDown: handleSwitchKey,
        children: [
          jsxProd_default_2(Text, {
            bold: true,
            children: ["Switch ", displayName, " to ", marketplaceLabel_2, "?"],
          }),
          jsxProd_default(Box, {
            marginTop: 1,
            children:
              switchState.state === "working"
                ? jsxProd_default(Text, {
                    dimColor: true,
                    children: "Working out what will be replaced\u2026",
                  })
                : switchState.state === "failed"
                  ? jsxProd_default(Text, {
                      children:
                        "Could not work out what would be replaced, so nothing was changed. Go back and open the plugin again to retry.",
                    })
                  : switchPlan === undefined
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
      onKeyDown: handleSwitchKey,
      children: [
        jsxProd_default_2(Text, {
          bold: true,
          children: ["Switch ", displayName, " to ", marketplaceLabel_2, "?"],
        }),
        jsxProd_default_2(Box, {
          marginTop: 1,
          flexDirection: "column",
          children: [
            jsxProd_default_2(Text, {
              children: [
                "Now:   ",
                displayPluginId(selectedSource ?? ""),
                " \xB7",
                " ",
                describePluginVersionPin(selectedSource ?? "", gitCommitSha),
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
                copyMarketplaceLabel,
                " and uninstalls the",
                " ",
                filteredPluginErrors.length === 0 ? "one" : "ones",
                " from",
                " ",
                listFormat.format([currentMarketplaceLabel, ...mapped]),
                ".",
                " ",
                selectedPlugin.marketplace === OFFICIAL_MARKETPLACE_NAME
                  ? `The code can differ: the Anthropic Directory installs the commit it lists, and ${copyMarketplaceLabel} installs the commit it pins, or its latest, which can be older or newer than what you have.`
                  : "The code can differ: the Anthropic Directory installs the commit it lists, which can be older or newer than what you have.",
                " ",
                "Updates then come from ",
                copyMarketplaceLabel,
                ".",
                " ",
                formatToggleConsequence({
                  newId: copy.pluginId,
                  openedId: selectedSource ?? "",
                  oldInText: currentMarketplaceLabel,
                  others: filteredPluginErrors.map((item_9, index_0) => ({
                    pluginId: item_9.pluginId,
                    marketplaceInText: mapped[index_0] ?? "",
                  })),
                  alsoInstalledElsewhere: new Set(switchState.alsoInstalledElsewhere),
                  targetKeepsOwn: switchPlan,
                  removesSavedData: switchState.removesSavedData,
                }),
              ],
            }),
          ],
        }),
        filtered !== "" &&
          jsxProd_default(Box, {
            marginTop: 1,
            children: jsxProd_default(Text, {
              children: stripInvisibleKeepEmoji(filtered),
            }),
          }),
        errorRows !== "" &&
          jsxProd_default(Box, {
            marginTop: 1,
            children: jsxProd_default(Text, {
              children: stripInvisibleKeepEmoji(errorRows),
            }),
          }),
        error &&
          jsxProd_default(Box, {
            marginTop: 1,
            children: jsxProd_default(ErrorText, {
              error,
            }),
          }),
        jsxProd_default(Box, {
          marginTop: 1,
          children: isLoading
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
      onKeyDown: handleUninstallKey,
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
              children: pluginDataDirPath(selectedSource),
            }),
          ],
        }),
        error &&
          jsxProd_default(Box, {
            marginTop: 1,
            children: jsxProd_default(ErrorText, {
              error: stripInvisibleKeepNewlines(error),
            }),
          }),
        jsxProd_default(Box, {
          marginTop: 1,
          children: isLoading
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
    let pluginId = selectedSource;
    let isEnabled = isPluginEffectivelyEnabled(pluginId, selectedPlugin.plugin, watchUnsubscribe);
    let filtered = pluginErrors.filter((pluginError) =>
      matchesPluginSource(pluginError, pluginId, selectedPlugin.plugin.name),
    );
    let mapped = filtered
      .filter((error) => !isAutoupdateInfoError(error))
      .map((error) => ({
        message: formatSkillErrorMessage(error),
        guidance: getErrorGuidanceText(error),
      }));
    let errorRows = [
      ...filtered.filter(isAutoupdateInfoError).map((error) => ({
        message: formatSkillErrorMessage(error),
        guidance: getErrorGuidanceText(error),
      })),
      ...pluginWarnings
        .filter((pluginWarning) => matchesPluginSource(pluginWarning, pluginId, selectedPlugin.plugin.name))
        .map((pluginWarning) => ({
          message: pluginWarningText(pluginWarning),
          guidance: pluginWarningFixText(pluginWarning),
        })),
    ];
    let pluginDaysSinceUse = getPluginDaysSinceUse(selectedPlugin.plugin.repository);
    let pluginErrorsSection =
      mapped.length === 0 && errorRows.length === 0
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
                entries: errorRows,
                color: "warning",
                noun: "note",
              }),
            ],
          });
    let manifest = sanitizePluginManifestForDisplay(selectedPlugin.plugin.manifest);
    let gitCommitSha =
      selectedPlugin.marketplace === OFFICIAL_MARKETPLACE_NAME
        ? findScopedInstallation(getInstalledPlugins().plugins[pluginId], selectedPlugin.scope)?.gitCommitSha
        : undefined;
    let shortSha = shortCommitSha(gitCommitSha);
    let versionLabel = shortSha ? displayableGitHeadName(manifest.version) : manifest.version;
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
              isSyncedMarketplacePlugin(pluginId)
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
        versionLabel &&
          jsxProd_default_2(Box, {
            children: [
              jsxProd_default(Text, {
                dimColor: true,
                children: "Version: ",
              }),
              jsxProd_default_2(Text, {
                children: [versionLabel, shortSha ? ` \xB7 installed at commit ${shortSha}` : ""],
              }),
            ],
          }),
        !versionLabel && shortSha
          ? jsxProd_default_2(Box, {
              children: [
                jsxProd_default(Text, {
                  dimColor: true,
                  children: "Installed at commit: ",
                }),
                jsxProd_default(Text, {
                  children: shortSha,
                }),
              ],
            })
          : null,
        manifest.description &&
          jsxProd_default(Box, {
            marginBottom: 1,
            children: jsxProd_default(Text, {
              children: manifest.description,
            }),
          }),
        manifest.author &&
          jsxProd_default_2(Box, {
            children: [
              jsxProd_default(Text, {
                dimColor: true,
                children: "Author: ",
              }),
              jsxProd_default(Text, {
                children: manifest.author.name,
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
              color: isEnabled ? "success" : "warning",
              children: isEnabled ? "Enabled" : "Disabled",
            }),
            isRequiredPlugin(pluginId, selectedPlugin.plugin.installationPreference) &&
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
        selectedSource &&
          jsxProd_default(
            PluginHeadersHelperWarning,
            {
              pluginId: selectedSource,
              verb: "Updating",
              onShown: hasAutoNavigated.record,
            },
            listTick,
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
            options: detailsMenu,
            onSelect: (value) => detailsMenu.find((option) => option.value === value)?.action(),
            selectionDisabled: isLoading,
            defaultFocusValue: selectedClient,
            onFocus: setClient,
          }),
        }),
        isLoading &&
          jsxProd_default(Box, {
            marginTop: 1,
            children: jsxProd_default(Text, {
              children: "Processing\u2026",
            }),
          }),
        error &&
          jsxProd_default(Box, {
            marginTop: 1,
            children: jsxProd_default(ErrorText, {
              error: stripInvisibleKeepNewlines(error),
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
        isLoading &&
          jsxProd_default(Text, {
            children: "Processing\u2026",
          }),
        jsxProd_default(ErrorText, {
          error: error && stripInvisibleKeepNewlines(error),
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
    let states = [skill.override, ...SKILL_STATE_CYCLE_2.filter((state) => state !== skill.override)];
    let setSkillState = async (nextState) => {
      if (nextState === skill.override) return;
      let { error } = await updateSettingsForSource(
        "localSettings",
        {
          skillOverrides: {
            [skill.cmdName]: diffSkillOverrideFromSettings(skill, nextState),
          },
        },
        undefined,
        storageV5,
      );
      if (error) {
        setError(error.message);
        return;
      }
      setKeepInPlaceIds((set) => new Set(set).add(skill.id));
      setRefreshTick((n) => n + 1);
      setViewState_2({
        type: "skill-detail",
        skill: {
          ...skill,
          override: nextState,
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
                      onSelect: (index) => {
                        let nextState = states[index];
                        if (skill.lockSource === "author" && nextState !== "off") {
                          setSkillState("user-invocable-only");
                          return;
                        }
                        setSkillState(nextState);
                      },
                      children: states.map((state) => {
                        let isAuthorLocked =
                          skill.lockSource === "author" && state !== "user-invocable-only" && state !== "off";
                        return jsxProd_default(
                          OrderedListWithItem.Item,
                          {
                            label: state,
                            icon:
                              state === skill.override
                                ? jsxProd_default(StatusIcon, {
                                    status: "success",
                                    "aria-label": "current:",
                                  })
                                : jsxProd_default(StatusIcon, {
                                    status: "pending",
                                    "aria-label": "",
                                  }),
                            meta: isAuthorLocked ? ["locked"] : [],
                          },
                          state,
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
    let displayEndpoint = origin ?? describeMcpServerOrigin(client.name, client.config);
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
    let displayEndpoint = origin ?? describeMcpServerOrigin(client.name, client.config);
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
    let displayEndpoint = origin ?? describeMcpServerOrigin(client.name, client.config);
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
  let visibleItems = pagination.getVisibleItems(displayRows);
  return jsxProd_default_2(Box, {
    flexDirection: "column",
    width: "100%",
    tabIndex: 0,
    autoFocus: true,
    onKeyDown: handleCleanupKey,
    onPaste: finish,
    children: [
      jsxProd_default(Box, {
        marginBottom: 1,
        flexDirection: "column",
        children: jsxProd_default(SearchBox, {
          query: searchQuery,
          isFocused: isSearchMode,
          isTerminalFocused,
          cursorOffset: searchCursorOffset,
          onCursorOffsetChange: setCursorOffset,
          onFocus: () => setIsSearchMode(true),
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
      notice &&
        jsxProd_default(Box, {
          marginBottom: 1,
          paddingLeft: 2,
          children: jsxProd_default(Text, {
            color: "success",
            children: stripInvisibleKeepNewlines(notice),
          }),
        }),
      displayRows.length === 0 &&
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
              let isCurrentRow = actualIndex === selectedIndex && !isSearchMode;
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
                            attentionRows > 0 &&
                            jsxProd_default_2(Text, {
                              color: "warning",
                              children: [
                                " ",
                                "\xB7 ",
                                attentionRows,
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
                      active: isCurrentRow,
                      paddingLeft: 2,
                      children: jsxProd_default_2(Text, {
                        color: isCurrentRow ? "suggestion" : undefined,
                        children: [
                          jsxProd_default(Text, {
                            "aria-hidden": true,
                            children: isCurrentRow ? `${figures_default.pointer} ` : "  ",
                          }),
                          showDisabled ? figures_default.arrowDown : figures_default.arrowRight,
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
                      isSelected: isCurrentRow,
                      health:
                        item_10.item.type === "plugin" ? skillHealthData?.get(item_10.item.name) : undefined,
                      nameWidth,
                      statusHoisted: attentionRows > 0 && item_10.section === "attention",
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
      error &&
        jsxProd_default(Box, {
          marginTop: 1,
          marginLeft: 1,
          children: jsxProd_default(ErrorText, {
            error: stripInvisibleKeepNewlines(error),
          }),
        }),
      pendingToggles.size > 0 &&
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
export {
  filterManagedDisabledPlugins,
  usePluginWarnings,
  activeModNames,
  loadedModsSnapshot,
  ManagePlugins,
  getBaseFileNames,
  getSkillDirNames,
};
