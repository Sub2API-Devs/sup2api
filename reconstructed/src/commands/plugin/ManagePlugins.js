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
import { join, join as join_2, join as join_3 } from "path";
import {
  pluginNamesEqual,
  pluginDisplayKey,
  splitPluginId,
  marketplaceOf,
  parsePluginIdentifier,
  marketplaceSuffix,
  normalizePluginId,
  mJt,
  isRequiredPlugin,
  isOfficialMarketplace,
  findPluginName,
} from "../../utils/plugins/pluginIdentifier.js";
import { count, uniq } from "../../utils/collections.js";
import { stripSyncedSkillPrefix } from "../../skills/syncedSkills.js";
import { j, Q, y, P, R, ce, Oo } from "../../../vendor/react/cjs/react.production.js";
import { getPluginRegistry } from "../../utils/plugins/pluginLoadState.js";
import { hr } from "../../utils/invisibleChars.js";
import {
  subscribe_2,
  uiRenderModule,
} from "../../components/permissions/AskUserQuestionPermissionRequest/uiRenderHook.js";
import { useStoreSelector } from "../../hooks/useStoreSelector.js";
import { w } from "../../../vendor/react/compiler-runtime.js";
import { plural, capitalize } from "../../utils/stringUtils.js";
import { r, e, Fragment } from "../../../vendor/react/cjs/react-jsx-dev-runtime.react-server.production.js";
import { Text, Box } from "../../ink/components/Text.js";
import { Byline } from "../../components/design-system/Byline.js";
import { useAppState, useActivePlugins } from "../../state/AppState.js";
import { collectPassedOverHooks } from "../../utils/plugins/functionHooks/hookPatterns.js";
import { QE, jF } from "../../utils/plugins/pluginGates.js";
import { pluginTelemetryFields } from "../../utils/telemetry/pluginTelemetryName.js";
import { af } from "../../utils/plugins/pluginPolicy.js";
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
  PF,
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
import { BC, skillOverrideWithSource, bareSkillName, DCe } from "../../utils/commandPredicates.js";
import {
  getPluginInventory,
  logComponentReadError,
  readFileHead,
  v,
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
import { NPM, ANTHROPIC_PLUGIN_DIRECTORY } from "../../utils/plugins/schemas.js";
import { isPluginBlockedByPolicy } from "../../utils/plugins/marketplacePolicy.js";
import { re } from "../../../vendor/@inquirer/figures/dist/esm/index.js";
import { Me } from "../../components/design-system/ThemeProvider.js";
import {
  getFlaggedPlugins,
  markFlaggedPluginsSeen,
  removeFlaggedPlugin,
} from "../../utils/plugins/pluginFlagging.js";
import { useSkillHealthData, wd, readMarketplaceJsonContent, Io } from "./skillHealth.js";
import { useTerminalFocus } from "../../ink/hooks/use-terminal-focus.js";
import { Tl, useScrollViewportSize } from "../../components/ScrollViewportContext.js";
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
  Amn,
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
import { YM, r1 } from "../../services/mcp/redactMcpErrors.js";
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
import { Wo } from "../../utils/json.js";
import { isStorageV5Enabled } from "../../utils/hoverRest.js";
import { loadAllPlugins } from "../../utils/plugins/pluginLoader.js";
import { getPluginDataDirSize, pluginDataDirPath } from "../../utils/plugins/pluginDirectories.js";
import { ic } from "../../utils/plugins/cacheUtils.js";
import {
  getPluginDisplayName,
  Tct,
  sanitizePluginManifestForDisplay,
} from "../../components/ManagedSettingsSecurityDialog/utils.js";
import { listUnscopedPluginForProject, formatCopyNotLoaded } from "./SkillDoctor.js";
import { formatMcpOperationFailure } from "../../components/mcp/utils/reconnectHelpers.js";
import { MessageActionsKeybindings } from "../../components/messageActions.js";
import { fi } from "../../utils/browser.js";
import { mergePluginErrors } from "../../utils/plugins/refresh.js";
import { qP } from "../../utils/plugins/dependencyResolver.js";
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
import { i3 } from "../../utils/permissions/permissionRulePayload.js";
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
function di(i) {
  return i?.kind === "item" || i?.kind === "disabled-header";
}
/**
 * 判断插件操作是否因插件未安装（或未在该作用域安装）而失败，且该插件不在已知列表中。
 */
//@ chunk-vrb44rx7.js:146757-146893 placement = _temp2 (0.306)
function isUninstalledPluginFailure(i, h, k) {
  return (
    !i.success &&
    (i.failureCode === "not_installed" || i.failureCode === "not_installed_at_scope") &&
    !k.some((C) => pluginNamesEqual(C, h))
  );
}
//@ chunk-vrb44rx7.js:146893-147114 placement
function needsAttention(i) {
  switch (i.type) {
    case "plugin":
      return i.isEnabled && i.errorCount > 0;
    case "failed-plugin":
    case "flagged-plugin":
      return !0;
    case "mcp":
      return (i.status === "needs-auth" || i.status === "failed") && !isNeverConnectedMcpFailure(i);
    case "skill":
      return !1;
  }
}
//@ chunk-vrb44rx7.js:147114-147168 placement
var ns = ["on", "name-only", "user-invocable-only", "off"];
//@ chunk-vrb44rx7.js:147168-147351 placement
function nextSkillOverrideState(i, h) {
  if (h === "policy" || h === "flag" || h === "reserved-name") return i;
  if (h === "author") return i === "off" ? "user-invocable-only" : "off";
  let index = ns.indexOf(i);
  return ns[(index + 1) % ns.length];
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
  return i.type === "mcp" && (i.status === "needs-auth" || i.status === "failed") && i.everConnected === !1;
}
//@ chunk-vrb44rx7.js:147589-149317 placement
function buildInstalledSections(
  i,
  {
    searchQuery: searchQuery,
    favoriteIds: favoriteIds,
    showDisabled: showDisabled,
    disusedDays: disusedDays,
    keepInPlaceIds: keepInPlaceIds,
  },
) {
  if (searchQuery) {
    let lower = searchQuery.toLowerCase();
    return i
      .filter(
        (J) =>
          J.name.toLowerCase().includes(lower) ||
          ("displayName" in J && J.displayName?.toLowerCase().includes(lower)) ||
          ("description" in J && J.description?.toLowerCase().includes(lower)),
      )
      .map((J) => ({ kind: "item", section: "main", item: J }));
  }
  let D = [],
    U = new Map();
  for (let _ of i) if (_.type === "plugin") U.set(_.id, { name: _.name, displayName: _.displayName });
  let L = null,
    A = (_, J) => {
      let pe = L?.section !== _;
      if (pe) {
        if (D.length > 0 && D.at(-1)?.kind !== "disabled-header") D.push({ kind: "spacer" });
        if (_ === "attention" || _ === "favorites" || _ === "disused")
          D.push({ kind: "section-header", section: _ });
      }
      if ((_ === "main" || _ === "disabled") && (pe || L?.item.scope !== J.scope)) {
        if (!pe) D.push({ kind: "spacer" });
        D.push({ kind: "scope-header", scope: J.scope });
      }
      let fe =
          !pe &&
          J.type === "mcp" &&
          J.parentId !== void 0 &&
          ((L?.item.type === "plugin" && L.item.id === J.parentId) ||
            (L?.item.type === "mcp" && L.item.indented && L.item.parentId === J.parentId)),
        me =
          J.type === "mcp" && J.indented && !fe
            ? { ...J, indented: !1, liftedFrom: J.parentId === void 0 ? void 0 : U.get(J.parentId) }
            : J;
      (D.push({ kind: "item", section: _, item: me }), (L = { section: _, item: me }));
    },
    K = new Set();
  for (let _ of i) if (needsAttention(_)) (A("attention", _), K.add(_.id));
  for (let _ of i) if (favoriteIds.has(_.id) && !K.has(_.id)) (A("favorites", _), K.add(_.id));
  if (disusedDays && disusedDays.size > 0) {
    for (let _ of i)
      if (_.type === "plugin" && _.isEnabled && disusedDays.has(_.id) && !K.has(_.id))
        (A("disused", { ..._, unusedDays: disusedDays.get(_.id) }), K.add(_.id));
  }
  let V = (_) => (isInstalledItemDisabled(_) || isNeverConnectedMcpFailure(_)) && !keepInPlaceIds?.has(_.id);
  for (let _ of i) if (!V(_) && !K.has(_.id)) A("main", _);
  let filtered = i.filter(V);
  if (filtered.length > 0) {
    if (D.length > 0) D.push({ kind: "spacer" });
    if (
      (D.push({
        kind: "disabled-header",
        disabledCount: count(filtered, isInstalledItemDisabled),
        unusedConnectorCount: count(filtered, isNeverConnectedMcpFailure),
      }),
      showDisabled)
    )
      for (let _ of filtered) A("disabled", _);
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
var SYNCED_SKILL = "synced-skill:",
  SKILL = "skill:";
//@ chunk-vrb44rx7.js:149471-149608 placement
function getSyncedSkillAliasKeys(i) {
  if (!i.startsWith(SYNCED_SKILL)) return [];
  let sliced = i.slice(SYNCED_SKILL.length),
    k = sliced.indexOf(":") + 1,
    C = sliced.slice(0, k) + stripSyncedSkillPrefix(sliced.slice(k));
  return [SYNCED_SKILL + C, SKILL + C];
}
//@ chunk-vrb44rx7.js:149608-149863 placement
function expandSyncedSkillSelection(i, h) {
  let k = new Set(),
    C = [];
  for (let T of h) {
    let D = getSkillItemKey(T);
    if (T.loadedFrom === "syncedSkills") C.push(D);
    else k.add(D);
  }
  let x = null;
  for (let T of C) {
    if (i.has(T)) continue;
    for (let D of getSyncedSkillAliasKeys(T))
      if (i.has(D) && !k.has(D)) {
        ((x ??= new Set(i)), x.add(T));
        break;
      }
  }
  return x ?? i;
}
//@ chunk-vrb44rx7.js:149863-150050 placement
function toggleSkillKeySelection(i, h, k) {
  let C = expandSyncedSkillSelection(i, k),
    x = new Set(i);
  if (!C.has(h)) return (x.add(h), x);
  x.delete(h);
  for (let T of getSyncedSkillAliasKeys(h))
    if (!k.some((D) => D.loadedFrom !== "syncedSkills" && getSkillItemKey(D) === T)) x.delete(T);
  return x;
}
//@ chunk-vrb44rx7.js:150050-150054 placement
j();
//@ chunk-vrb44rx7.js:150054-150177 placement
var freeze = Object.freeze({
  subscribe: (i) => getPluginRegistry().hooksLeftOutByNameChanged.subscribe(i),
  getSnapshot: () => getPluginRegistry().hooksLeftOutByName,
});
//@ chunk-vrb44rx7.js:150177-150205 placement
function _y(A) {
  return hr(A);
}
//@ chunk-vrb44rx7.js:150205-150845 placement
var loadedModulesStore = { subscribe: subscribe_2, getSnapshot: () => getPluginRegistry().loadedModules },
  ca = () => uiRenderModule.activeModNames(useStoreSelector(loadedModulesStore)),
  ua = (i) => {
    let C = w(12),
      { names: names } = i;
    const k = names.length;
    let x;
    if (C[0] !== names.length) ((x = plural(names.length, "mod")), (C[0] = names.length), (C[1] = x));
    else x = C[1];
    let T;
    if (C[2] !== names.length || C[3] !== x)
      ((T = r(Text, { children: [k, " ", x, " active"] })), (C[2] = names.length), (C[3] = x), (C[4] = T));
    else T = C[4];
    let D;
    if (C[5] !== names) ((D = names.map(_y).join(", ")), (C[5] = names), (C[6] = D));
    else D = C[6];
    let U;
    if (C[7] !== D) ((U = e(Text, { children: D })), (C[7] = D), (C[8] = U));
    else U = C[8];
    let L;
    if (C[9] !== T || C[10] !== U)
      ((L = e(Box, {
        marginTop: 1,
        children: e(Text, { dimColor: !0, wrap: "truncate-end", children: r(Byline, { children: [T, U] }) }),
      })),
        (C[9] = T),
        (C[10] = U),
        (C[11] = L));
    else L = C[11];
    return L;
  };
/**
 * 汇总插件相关警告：AppState 里的插件加载警告、冻结/已加载模块存储里的警告，作为一个记忆化数组返回。
 */
//@ chunk-vrb44rx7.js:150845-150954 placement
function usePluginWarnings() {
  let i = useAppState((C) => C.plugins.warnings),
    h = useStoreSelector(freeze),
    k = useStoreSelector(loadedModulesStore);
  return Q(() => [...i, ...h, ...collectPassedOverHooks(k)], [i, h, k]);
}
//@ chunk-vrb44rx7.js:150954-151419 placement
async function logPluginToggleScreen({
  operation: operation,
  pluginId: pluginId,
  scope: scope,
  savedKept: savedKept,
  storageV5: storageV5,
}) {
  try {
    if (!QE()) return;
    let T = {
      ...(await pluginTelemetryFields(pluginId, af(), storageV5)),
      ...(scope !== void 0 && { scope: fromEnum(scope) }),
    };
    switch (operation) {
      case "uninstall":
        logEvent("tengu_plugin_uninstalled_screen", { ...T, ...(savedKept && { saved_kept: !0 }) });
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
  return e(BulletRow, { children: r(Text, { dimColor: !0, children: [Oe, ": ", rt.join(", ")] }) }, Oe);
}
//@ chunk-vrb44rx7.js:151526-151577 placement
function Gd(i) {
  return printableLabel(printableName(i, 120)) || "this plugin";
}
//@ chunk-vrb44rx7.js:151577-151628 placement
function ls(i) {
  return i === OFFICIAL_MARKETPLACE_NAME ? `the ${OFFICIAL_MARKETPLACE_DISPLAY}` : quotedPrintable(i, 120);
}
//@ chunk-vrb44rx7.js:151628-152748 placement
function formatToggleConsequence({
  newId: newId,
  openedId: openedId,
  oldInText: oldInText,
  others: others,
  alsoInstalledElsewhere: alsoInstalledElsewhere,
  targetKeepsOwn: targetKeepsOwn,
  removesSavedData: removesSavedData,
}) {
  {
    let U = new Intl.ListFormat("en", { type: "conjunction" }),
      L = (_) => U.format(_.map((J) => displayPluginId(J))),
      filtered = others.filter((_) => !alsoInstalledElsewhere.has(_.pluginId)),
      filtered_2 = [openedId, ...others.map((_) => _.pluginId)].filter((_) => alsoInstalledElsewhere.has(_)),
      V =
        filtered_2.length === 0
          ? ""
          : ` ${capitalize(L(filtered_2))} ${filtered_2.length === 1 ? "is" : "are"} also installed for another project: the settings saved for ${filtered_2.length === 1 ? "it" : "them"} are kept while ${filtered_2.length === 1 ? "it stays" : "they stay"} installed there.`;
    if (targetKeepsOwn) {
      let _ = alsoInstalledElsewhere.has(openedId) ? [] : [openedId],
        J =
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
function findScopedInstallation(i, h) {
  let k = i?.filter((C) => C.scope === h) ?? [];
  return k.find((C) => C.projectPath === getOriginalCwd()) ?? k.find(isInstallationRelevantToCurrentProject);
}
//@ chunk-vrb44rx7.js:152856-152994 placement
function describePluginVersionPin(i, h) {
  let k = op(h);
  if (!k) return "tracks the marketplace's latest";
  return i.endsWith(`@${OFFICIAL_MARKETPLACE_NAME}`) ? `pinned commit ${k}` : `commit ${k}`;
}
//@ chunk-vrb44rx7.js:152994-153076 placement
function op(i) {
  return i !== void 0 && /^[0-9a-f]{7,40}$/i.test(i) ? i.slice(0, 7) : void 0;
}
//@ chunk-vrb44rx7.js:153076-153226 placement = isClaudeAISubscriber (0.692)
function getUncoveredPluginScopes(i, h, k) {
  let C = new Set([
    h,
    ...(getInstalledPlugins().plugins[k] ?? [])
      .filter(isInstallationRelevantToCurrentProject)
      .map((x) => x.scope),
  ]);
  return uniq(i.flatMap((x) => x.scopes)).filter((x) => !C.has(x));
}
//@ chunk-vrb44rx7.js:153226-153280 layout
var Oy = ["on", "name-only", "user-invocable-only", "off"];
/**
 * 比较技能覆盖新值与 settings（local/project/user）里已生效的值；相同返回 undefined（无需写入），否则返回新值。作者锁定的技能默认值是 user-invocable-only。
 */
//@ chunk-vrb44rx7.js:153280-153620 layout
function diffSkillOverrideFromSettings(i, h) {
  let k = (A) => (isSettingSourceEnabled(A) ? getSettingsForSource(A)?.skillOverrides : void 0),
    C = k("localSettings"),
    x = k("projectSettings"),
    T = k("userSettings"),
    D = (A) => BC(x, A) ?? BC(T, A),
    U =
      D(i.cmdName) ??
      (i.unqualifiedName != null ? (BC(C, i.unqualifiedName) ?? D(i.unqualifiedName)) : void 0),
    L = i.lockSource === "author" ? (U === "off" ? "off" : "user-invocable-only") : (U ?? "on");
  return h === L ? void 0 : h;
}
//@ chunk-vrb44rx7.js:153620-153912 layout
function formatPluginScopeLabel(i) {
  switch (i) {
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
      return i;
  }
}
/**
 * 异步加载插件清单并渲染"Installed components"列表；市场已关闭/不可用时显示说明，加载失败时显示错误。
 */
//@ chunk-vrb44rx7.js:153912-155189 layout
function PluginInstalledComponents(props) {
  let A = w(13),
    { plugin: plugin, marketplace: marketplace } = props,
    [C, x] = y(null),
    [T, D] = y(null),
    [U, L] = y(null),
    K,
    V;
  if (A[0] !== marketplace || A[1] !== plugin)
    ((K = () => {
      let B = !1;
      return (
        getPluginInventory(plugin, marketplace)
          .then((_) => {
            if (!B) x(_);
          })
          .catch(async (J) => {
            let pe = marketplace === OFFICIAL_MARKETPLACE_NAME ? await getPluginDirectoryState() : null;
            if (B) {
              return;
            }
            if (pe === "off" || pe === "unavailable") {
              L(pe);
              return;
            }
            D((J instanceof Error && printableMessage(J)) || "Failed to load components");
          }),
        () => {
          B = !0;
        }
      );
    }),
      (V = [plugin, marketplace]),
      (A[0] = marketplace),
      (A[1] = plugin),
      (A[2] = K),
      (A[3] = V));
  else ((K = A[2]), (V = A[3]));
  if ((P(K, V), U)) {
    const fe = U === "off" ? "is turned off." : "isn't available in this session.";
    let me;
    if (A[4] !== fe)
      ((me = e(Box, {
        marginBottom: 1,
        children: r(Text, {
          dimColor: !0,
          children: ["Components are not shown because this plugin's marketplace", " ", fe],
        }),
      })),
        (A[4] = fe),
        (A[5] = me));
    else me = A[5];
    return me;
  }
  if (T) {
    let fe;
    if (A[6] === MEMO_CACHE_SENTINEL) ((fe = e(Text, { bold: !0, children: "Components:" })), (A[6] = fe));
    else fe = A[6];
    let me;
    if (A[7] !== T)
      ((me = r(Box, {
        flexDirection: "column",
        marginBottom: 1,
        children: [fe, r(Text, { dimColor: !0, children: ["Error: ", T] })],
      })),
        (A[7] = T),
        (A[8] = me));
    else me = A[8];
    return me;
  }
  if (!C) {
    return null;
  }
  let fe, me;
  if (A[9] !== C) {
    me = EARLY_RETURN_SENTINEL;
    he: {
      let ne = COMPONENT_LABELS(C);
      if (ne.length === 0) {
        me = null;
        break he;
      }
      let W;
      if (A[12] === MEMO_CACHE_SENTINEL)
        ((W = e(Text, { bold: !0, children: "Installed components:" })), (A[12] = W));
      else W = A[12];
      fe = r(Box, {
        flexDirection: "column",
        marginBottom: 1,
        children: [W, ne.map(renderComponentLabelRow)],
      });
    }
    ((A[9] = C), (A[10] = fe), (A[11] = me));
  } else ((fe = A[10]), (me = A[11]));
  if (me !== EARLY_RETURN_SENTINEL) return me;
  return fe;
}
//@ chunk-vrb44rx7.js:155189-155429 fingerprint = checkIfLocalPlugin (1)
async function checkIfLocalPlugin(i, h, k) {
  if (h === NPM) return null;
  let entry = (await getMarketplace(h, k))?.plugins.find((T) => T.name === i);
  if (entry && typeof entry.source === "string")
    return `Local plugins cannot be updated remotely. To update, modify the source at: ${entry.source}`;
  return null;
}
//@ chunk-vrb44rx7.js:155429-155480 layout
function qy(i) {
  return i.filter((h) => !isPluginBlockedByPolicy(h.source));
}
/**
 * 渲染一组带颜色的插件消息（错误/警告）：标题"N 个 noun:"，每条消息下可带缩进的指导语。
 */
//@ chunk-vrb44rx7.js:155480-156237 layout
function PluginMessageList(props) {
  let T = w(15),
    { entries: entries, color: color, noun: noun } = props;
  if (entries.length === 0) {
    return null;
  }
  const x = entries.length;
  let D;
  if (T[0] !== entries.length || T[1] !== noun)
    ((D = plural(entries.length, noun)), (T[0] = entries.length), (T[1] = noun), (T[2] = D));
  else D = T[2];
  let U;
  if (T[3] !== color || T[4] !== entries.length || T[5] !== D)
    ((U = r(Text, { bold: !0, color: color, children: [x, " ", D, ":"] })),
      (T[3] = color),
      (T[4] = entries.length),
      (T[5] = D),
      (T[6] = U));
  else U = T[6];
  let L;
  if (T[7] !== color || T[8] !== entries) {
    let A;
    if (T[10] !== color)
      ((A = (K, V) =>
        r(
          Box,
          {
            flexDirection: "column",
            marginLeft: 2,
            children: [
              e(Text, { color: color, children: K.message }),
              K.guidance && r(Text, { dimColor: !0, italic: !0, children: [re.arrowRight, " ", K.guidance] }),
            ],
          },
          V,
        )),
        (T[10] = color),
        (T[11] = A));
    else A = T[11];
    L = entries.map(A);
    ((T[7] = color), (T[8] = entries), (T[9] = L));
  } else L = T[9];
  let A;
  if (T[12] !== U || T[13] !== L)
    ((A = r(Box, { flexDirection: "column", children: [U, L] })), (T[12] = U), (T[13] = L), (T[14] = A));
  else A = T[14];
  return A;
}
//@ chunk-vrb44rx7.js:156237-204832 fingerprint = ManagePlugins (0.484)
function ManagePlugins({
  setViewState: setViewState,
  setResult: setResult,
  onManageComplete: onManageComplete,
  changesApplyOnClose: changesApplyOnClose,
  onSearchModeChange: onSearchModeChange,
  targetPlugin: targetPlugin,
  targetMarketplace: targetMarketplace,
  action: action,
  commands: commands,
}) {
  let { storageV5: storageV5, credentials: credentials } = Me(),
    mcpClients = useAppState((E) => E.mcp.clients),
    mcpTools = useAppState((s_0) => s_0.mcp.tools),
    pluginErrors = useAppState((s_1) => s_1.plugins.errors),
    flaggedPlugins = useActivePlugins(),
    pe = usePluginWarnings(),
    fe = getFlaggedPlugins(),
    me = useSkillHealthData(),
    [ne, he] = y(!1),
    W = () => he(!1),
    Oe = useTerminalFocus(),
    isTerminalFocused = Tl(),
    { rows: rows, columns: columns } = useScrollViewportSize(useTerminalSize()),
    [ae, Se] = y("plugin-list"),
    {
      query: searchQuery,
      setQuery: setSearchQuery,
      cursorOffset: searchCursorOffset,
      setCursorOffset: setCursorOffset,
      handleKeyDown: handleKeyDown,
      handlePaste: handlePaste,
    } = useSearchInput({ isActive: ae === "plugin-list" && ne, onExit: W, onExitUp: W }),
    Ct = ne && searchQuery !== "";
  (P(() => {
    onSearchModeChange(Ct);
  }, [Ct, onSearchModeChange]),
    P(() => () => onSearchModeChange(!1), [onSearchModeChange]));
  let [oe, ft] = y(null),
    at = Q(() => (oe ? findPluginInSettings_2(oe.plugin.source) : null), [oe]),
    hasAutoNavigated = usePinnedConsentRecord(at),
    [an, Yt] = y(0),
    [_e, qe] = y([]),
    [vt, Lt] = y([]),
    nn = wd(getEnabledPluginsBySource, enabledPluginsEqual),
    [$t, ln] = y(!0),
    [yt, Ut] = y(0),
    [on, rn] = y(() => new Set()),
    [mn, xn] = y(new Map()),
    [Ln, Mn] = y(null),
    [fn, Be] = y(null),
    [jt, le] = y({ state: "working" }),
    pendingAutoActionRef = R(!1);
  P(() => {
    (Mn(null), Be(null), le({ state: "working" }));
    let E = oe?.scope;
    if (!at || (E !== "user" && E !== "local")) return;
    let X = !1;
    return (
      (async () => {
        {
          let ee = await findOfficialMarketplaceAlternative(at, storageV5);
          if (X) return;
          if ((Mn(ee ?? null), ee === void 0)) return;
          let [ge, ye] = await Promise.all([
            loadKnownMarketplacesSafe(storageV5),
            getPluginByIdCacheOnly(ee.pluginId, storageV5),
          ]);
          if (X) return;
          if (ye === null) {
            le({ state: "failed" });
            return;
          }
          let Re = await describeOtherMarketplaceInstalls(ee.pluginId, ye.entry, ge, storageV5),
            bt = await findOtherProjectInstalls(ee.pluginId, ye.entry, ge, storageV5),
            $e = E === "user" ? bt : [],
            any = (
              await Promise.all(
                Re.filter((it) => it.pluginId !== at).map((it) => isMarketplaceGone(it.pluginId)),
              )
            ).some((it) => !it);
          if (X) return;
          if (!Re.some((it) => it.pluginId === at)) {
            le({ state: "failed" });
            return;
          }
          let toggleMcpServer = getReplaceUnavailableReason();
          if (toggleMcpServer !== void 0) Be(describeReplaceUnavailable(toggleMcpServer, "ui"));
          else if (Re.some((it) => !it.replaceable) || !canReplaceOfficialInstalls(ee.pluginId, Re))
            Be(installFromOtherMarketplace(ee.pluginId, ye.entry.name, Re, "ui"));
          le({
            state: "known",
            removesSavedData: any,
            listedName: ye.entry.name,
            replaced: Re,
            inOtherProjects: $e,
            alsoInstalledElsewhere: bt.map((it) => it.pluginId),
          });
        }
      })().catch((ee) => {
        if (!X) le({ state: "failed" });
        logForDebugging(`Switch offer for ${at} could not be worked out: ${errorMessage(ee)}`, {
          level: "warn",
        });
      }),
      () => {
        X = !0;
      }
    );
  }, [at, oe?.scope, storageV5]);
  let [Ue, dt] = y(void 0),
    Dt = typeof ae === "object" && ae.type === "confirm-switch-copy" ? ae.copy.pluginId : void 0;
  P(() => {
    dt(void 0);
    {
      if (!at || Dt === void 0 || fn !== null) return;
      let E = !1;
      return (
        wouldTargetKeepOwnPluginOptions(at, Dt).then(
          (X) => {
            if (!E) dt(X);
          },
          (X) => {
            if (!E) dt("unknown");
            logForDebugging(
              `Could not work out what switching ${at} to ${Dt} would do with its settings: ${errorMessage(X)}`,
              { level: "warn" },
            );
          },
        ),
        () => {
          E = !0;
        }
      );
    }
  }, [at, Dt, fn]);
  let [wt, We] = y(!1),
    Ce = R(!1),
    [Ve, ke] = y(null),
    [ht, Jt] = y(null),
    [qt, xt] = y(0),
    _t = ce(
      (E, X = []) => {
        (flaggedPlugins.removeErrorsOf(X),
          Jt(E),
          We(!1),
          ft(null),
          Se("plugin-list"),
          xt((ee) => ee + 1),
          onManageComplete());
      },
      [onManageComplete, flaggedPlugins],
    ),
    Mt = changesApplyOnClose ? "Applies when you close this menu." : "Run /reload-plugins to apply.",
    hn = R(new Set()),
    Nt = ce((E) => {
      (hn.current.add(E), E.finally(() => hn.current.delete(E)));
    }, []),
    Fn = R(!1),
    sn = R(new Set()),
    Rn = R(new Set()),
    Un = R(void 0),
    An = useMcpToggleEnabled(),
    Bn = ce(() => {
      if (ae === "plugin-details") (Se("plugin-list"), ft(null), ke(null));
      else if (typeof ae === "object" && ae.type === "failed-plugin-details") (Se("plugin-list"), ke(null));
      else if (ae === "configuring") (Se("plugin-details"), cr(null));
      else if (ae === "plugin-usage") Se("plugin-details");
      else if (typeof ae === "object" && ae.type === "plugin-options")
        _t(`Plugin enabled. Configuration skipped. ${Mt}`);
      else if (typeof ae === "object" && ae.type === "configuring-options")
        setResult("Configuration cancelled.");
      else if (typeof ae === "object" && ae.type === "flagged-detail") (Se("plugin-list"), ke(null));
      else if (typeof ae === "object" && ae.type === "mcp-detail") (Se("plugin-list"), ke(null));
      else if (typeof ae === "object" && ae.type === "skill-detail") (Se("plugin-list"), ke(null));
      else if (typeof ae === "object" && ae.type === "mcp-tools")
        Se({ type: "mcp-detail", client: ae.client });
      else if (typeof ae === "object" && ae.type === "mcp-tool-detail")
        Se({ type: "mcp-tools", client: ae.client });
      else {
        let E = hn.current;
        if (E.size > 0) {
          Promise.allSettled(E).then(() => setViewState({ type: "menu" }));
          return;
        }
        setViewState({ type: "menu" });
      }
    }, [ae, setViewState, setResult, _t, Mt]);
  useKeybinding("confirm:no", Bn, {
    context: "Settings",
    isActive:
      (ae !== "plugin-list" || !ne) &&
      ae !== "confirm-project-uninstall" &&
      !(typeof ae === "object" && (ae.type === "confirm-data-cleanup" || ae.type === "confirm-switch-copy")),
  });
  let getMcpStatus = (client) => {
      if (client.type === "connected") return "connected";
      if (client.type === "cached") return "cached";
      if (client.type === "disabled") return "disabled";
      if (client.type === "pending") return "pending";
      if (client.type === "needs-auth") return "needs-auth";
      if (YM(client)) return "unconfigured";
      return "failed";
    },
    unifiedItems = Q(() => {
      let mergedSettings = getSettings_DEPRECATED(),
        pluginMcpMap = new Map();
      for (let client_0 of mcpClients)
        if (client_0.name.startsWith("plugin:")) {
          let parts = client_0.name.split(":");
          if (parts.length >= 3) {
            let tn = parts[1],
              serverName = parts.slice(2).join(":"),
              Rt = pluginMcpMap.get(tn) || [];
            (Rt.push({ displayName: stripInvisibleKeepEmoji(serverName), client: client_0 }),
              pluginMcpMap.set(tn, Rt));
          }
        }
      let ee = new Set(),
        ge = [],
        ye = nn;
      for (let state of vt) {
        let Bt = findPluginInSettings_2(state.plugin.source),
          tn = mn.get(Bt),
          Gt = tn !== void 0 ? tn === "will-disable" : isPluginEffectivelyEnabled(Bt, state.plugin, ye),
          errors = pluginErrors.filter(
            (Dn) => !isAutoupdateInfoError(Dn) && matchesPluginSource(Dn, Bt, state.plugin.name),
          );
        for (let Dn of errors) ee.add(Dn);
        let Sn = state.plugin.isBuiltin ? "builtin" : state.scope || "user",
          zt = commands && jF() ? formatLastPrompt(state.plugin.manifest.name, commands) : void 0;
        ge.push({
          item: {
            type: "plugin",
            id: Bt,
            name: state.plugin.name,
            displayName: state.plugin.manifest.displayName,
            description: state.plugin.manifest.description,
            marketplace: state.marketplace,
            scope: Sn,
            isEnabled: Gt,
            errorCount: errors.length,
            errors: errors,
            plugin: state.plugin,
            pendingEnable: state.pendingEnable,
            pendingUpdate: state.pendingUpdate,
            pendingToggle: tn,
            activity: zt ? { skillCount: zt.skillCount, totalCount: zt.totalCount } : void 0,
          },
          originalScope: Sn,
          childMcps: Gt
            ? pluginMcpMap.get(pluginDisplayKey(state.plugin.name, state.plugin.source)) || []
            : [],
        });
      }
      let orphanErrorsBySource = new Map();
      for (let error of pluginErrors) {
        if (isAutoupdateInfoError(error)) continue;
        let Bt = isOrphanPlugin(error);
        if (!Bt && ee.has(error)) continue;
        let tn = Bt ? `orphan:${error.source}` : error.source,
          Gt = orphanErrorsBySource.get(tn) || [];
        (Gt.push(error), orphanErrorsBySource.set(tn, Gt));
      }
      let pluginScopes = getPluginEditableScopes(),
        $e = [];
      for (let [Fe, Bt] of orphanErrorsBySource) {
        let tn = Fe.startsWith("orphan:") ? Fe.slice(7) : Fe;
        if (tn in fe) continue;
        let parsed = splitPluginId(tn),
          Rt = parsed.name || tn,
          Sn = parsed.marketplace || marketplaceOf(tn) || "unknown",
          zt = editableScopeOf(pluginScopes, tn),
          Dn = zt === "flag" || zt === void 0 ? "user" : zt;
        $e.push({
          type: "failed-plugin",
          id: Fe,
          name: Rt,
          marketplace: Sn,
          scope: Dn,
          errorCount: Bt.length,
          errors: Bt,
        });
      }
      let tt = [],
        st = getEverConnectedClaudeAiMcpSet();
      for (let client_1 of mcpClients) {
        if (client_1.name === "ide" || r1(client_1)) continue;
        if (client_1.name.startsWith("plugin:")) continue;
        tt.push({
          type: "mcp",
          id: `mcp:${client_1.name}`,
          name: client_1.name,
          description: void 0,
          scope: client_1.config.scope,
          status: getMcpStatus(client_1),
          client: client_1,
          everConnected: client_1.config.type === "claudeai-proxy" ? st.has(client_1.name) : void 0,
        });
      }
      let it = [];
      if (commands) {
        let Fe = new Set(vt.filter((Rt) => Rt.marketplace === SKILLS_DIR).map((Rt) => Rt.plugin.name)),
          Bt = getGlobalConfig().skillUsage ?? {},
          now = Date.now(),
          skillOverrides = mergedSettings.skillOverrides;
        for (let Rt of commands) {
          if (
            Rt.type !== "prompt" ||
            Rt.hiddenBehindPlugin !== void 0 ||
            (Rt.loadedFrom !== "skills" &&
              Rt.loadedFrom !== "syncedSkills" &&
              Rt.loadedFrom !== "commands_DEPRECATED")
          )
            continue;
          let Sn = getCommandName(Rt);
          if (Fe.has(Rt.name) || (Rt.loadedFrom !== "syncedSkills" && Fe.has(Sn))) continue;
          let zt = skillOverrideWithSource(Rt),
            Dn = bareSkillName(Rt),
            Uo = BC(skillOverrides, Rt.name) ?? BC(skillOverrides, Dn),
            pr,
            Ci;
          if (zt) ((pr = zt.source === "policySettings" ? "policy" : "flag"), (Ci = zt.value));
          else if (!DCe(Rt.name))
            ((pr = "reserved-name"), (Ci = Rt.disableModelInvocation ? "user-invocable-only" : "on"));
          else if (Rt.disableModelInvocation)
            ((pr = "author"), (Ci = Uo === "off" ? "off" : "user-invocable-only"));
          else Ci = Uo ?? "on";
          it.push({
            type: "skill",
            id: getSkillItemKey(Rt),
            cmdName: Rt.name,
            unqualifiedName: Dn,
            name: Sn,
            description: Rt.description,
            scope: "skills",
            source: Rt.loadedFrom === "syncedSkills" ? CLAUDE_AI_SYNC_LABEL : getSettingSourceName(Rt.source),
            override: Ci,
            whenToUse: Rt.whenToUse,
            skillRoot: Rt.skillRoot,
            allowedTools: Rt.allowedTools,
            lockSource: pr,
            tokenEstimate: roughTokenCountEstimation(
              [Rt.name, Rt.description, Rt.whenToUse].filter(Boolean).join(" "),
            ),
            usage: (() => {
              let Ga = getOwn(Bt, Rt.name) ?? (Dn != null ? getOwn(Bt, Dn) : void 0);
              return Ga
                ? {
                    count: Ga.usageCount,
                    daysSinceUse: Math.max(0, Math.floor((now - Ga.lastUsedAt) / 86400000)),
                  }
                : void 0;
            })(),
          });
        }
      }
      let De = {
          flagged: -1,
          project: 0,
          local: 1,
          user: 2,
          enterprise: 3,
          managed: 4,
          dynamic: 5,
          builtin: 6,
          skills: 7,
        },
        cn = [],
        itemsByScope = new Map();
      for (let { item: item_1, originalScope: originalScope_0, childMcps: childMcps } of ge) {
        let scope_0 = item_1.scope;
        if (!itemsByScope.has(scope_0)) itemsByScope.set(scope_0, []);
        itemsByScope.get(scope_0).push(item_1);
        for (let { displayName: displayName, client: client_2 } of childMcps) {
          let zt = originalScope_0 === "builtin" ? "user" : originalScope_0;
          if (!itemsByScope.has(zt)) itemsByScope.set(zt, []);
          itemsByScope
            .get(zt)
            .push({
              type: "mcp",
              id: `mcp:${client_2.name}`,
              name: displayName,
              description: void 0,
              scope: zt,
              status: getMcpStatus(client_2),
              client: client_2,
              indented: !0,
              parentId: item_1.id,
            });
        }
      }
      for (let mcp of tt) {
        let scope_1 = mcp.scope;
        if (!itemsByScope.has(scope_1)) itemsByScope.set(scope_1, []);
        itemsByScope.get(scope_1).push(mcp);
      }
      if (it.length > 0) itemsByScope.set("skills", it);
      for (let failedPlugin of $e) {
        let scope_2 = failedPlugin.scope;
        if (!itemsByScope.has(scope_2)) itemsByScope.set(scope_2, []);
        itemsByScope.get(scope_2).push(failedPlugin);
      }
      for (let [Fe, Bt] of Object.entries(fe)) {
        let parsed_0 = parsePluginIdentifier(Fe),
          Gt = parsed_0.name || Fe,
          Rt = parsed_0.marketplace || "unknown";
        if (!itemsByScope.has("flagged")) itemsByScope.set("flagged", []);
        itemsByScope
          .get("flagged")
          .push({
            type: "flagged-plugin",
            id: Fe,
            name: Gt,
            marketplace: Rt,
            scope: "flagged",
            reason: "delisted",
            text: "Removed from marketplace",
            flaggedAt: Bt.flaggedAt,
          });
      }
      let sortedScopes = [...itemsByScope.keys()].sort((Fe, Bt) => (De[Fe] ?? 99) - (De[Bt] ?? 99));
      for (let scope_3 of sortedScopes) {
        let items = itemsByScope.get(scope_3),
          tn = [],
          Gt = [],
          Rt = [],
          Sn = 0;
        while (Sn < items.length) {
          let zt = items[Sn];
          if (zt.type === "plugin" || zt.type === "failed-plugin" || zt.type === "flagged-plugin") {
            let group = [zt];
            Sn++;
            let Uo = items[Sn];
            while (Uo?.type === "mcp" && Uo.indented) (group.push(Uo), Sn++, (Uo = items[Sn]));
            tn.push(group);
          } else if (zt.type === "mcp" && !zt.indented) (Gt.push(zt), Sn++);
          else if (zt.type === "skill") (Rt.push(zt), Sn++);
          else Sn++;
        }
        (tn.sort((a_0, b_0) => a_0[0].name.localeCompare(b_0[0].name)),
          Gt.sort((a_1, b_1) => a_1.name.localeCompare(b_1.name)),
          Rt.sort((zt, Dn) => zt.name.localeCompare(Dn.name)));
        for (let group_0 of tn) cn.push(...group_0);
        (cn.push(...Gt), cn.push(...Rt));
      }
      return cn;
    }, [vt, mcpClients, pluginErrors, mn, fe, commands, yt, nn]),
    flaggedIds = Q(
      () => unifiedItems.filter((item_3) => item_3.type === "flagged-plugin").map((item_4) => item_4.id),
      [unifiedItems],
    );
  P(() => {
    if (flaggedIds.length > 0) markFlaggedPluginsSeen(flaggedIds, storageV5);
  }, [flaggedIds, storageV5]);
  let [de, Ge] = y(() => new Set((getGlobalConfig().favoritePlugins ?? []).map(findPluginInSettings_2))),
    filteredItems = Q(
      () =>
        (commands ?? []).flatMap((E) =>
          E.type === "prompt" ? [{ name: E.name, source: E.source, loadedFrom: E.loadedFrom }] : [],
        ),
      [commands],
    ),
    mt = Q(() => expandSyncedSkillSelection(de, filteredItems), [de, filteredItems]),
    en = ce(
      (E) => {
        Ge((X) => {
          let ee = toggleSkillKeySelection(X, E, filteredItems);
          return (saveGlobalConfig((ge) => ({ ...ge, favoritePlugins: [...ee] }), storageV5), ee);
        });
      },
      [filteredItems, storageV5],
    ),
    [Pt, kn] = y(!1),
    [bn, Hn] = y(() => new Map());
  P(() => {
    let E = !1;
    return (
      computeDisusedPlugins().then((X) => {
        if (E || X.length === 0) return;
        Hn(new Map(X.map((ee) => [findPluginInSettings_2(ee.pluginId), ee.daysSinceLastUse])));
      }),
      () => {
        E = !0;
      }
    );
  }, []);
  let wn = ce(
      (E, X) => {
        if (X === null || !bn.has(X)) return;
        (logFeatureOk("cli_plugin_disuse_review"),
          logEvent("tengu_plugin_disuse_review_action", {
            action: fromEnum(E),
            ...buildPluginEventFieldsFromId(X),
          }),
          Hn((ee) => {
            if (!ee.has(X)) return ee;
            let ge = new Map(ee);
            return (ge.delete(X), ge);
          }));
      },
      [bn],
    ),
    Ft = Q(
      () =>
        buildInstalledSections(unifiedItems, {
          searchQuery: searchQuery,
          favoriteIds: mt,
          showDisabled: Pt,
          disusedDays: bn,
          keepInPlaceIds: on,
        }),
      [unifiedItems, searchQuery, mt, Pt, bn, on],
    ),
    po = Q(
      () => getSourceTitle({ items: unifiedItems, healthByPluginName: me, columns: columns }),
      [unifiedItems, me, columns],
    ),
    ao = Q(() => {
      let flattened = Ft.flatMap((X) => (X.kind === "item" && X.section === "attention" ? [X.item] : []));
      return flattened.every((X) => X.type === "mcp" && X.status === "needs-auth") ? flattened.length : 0;
    }, [Ft]),
    Yn = ce(
      (E, X) => {
        let ee = X === -1 ? Math.min(E, Ft.length - 1) : E;
        for (let ge = ee; ge >= 0 && ge < Ft.length; ge += X) if (di(Ft[ge])) return ge;
        return -1;
      },
      [Ft],
    ),
    [_n, jn] = y(0),
    Ro = R(null);
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
    if (!di(Ft[_n])) {
      let X = Yn(_n, 1),
        ee = Yn(_n, -1);
      jn(X !== -1 ? X : ee !== -1 ? ee : 0);
    }
  }, [Ft, _n, Yn]);
  let Si = isTerminalFocused ? Math.max(8, rows - 10) : 8,
    ja = Q(() => Math.max(0, Ft.findIndex(di)), [Ft]),
    Fo = typeof ae === "object" && "client" in ae ? ae.client : void 0,
    Xo = Q(() => (Fo ? describeMcpServerOrigin(Fo.name, Fo.config) : void 0), [Fo]),
    pagination = usePagination({
      totalItems: Ft.length,
      selectedIndex: _n,
      maxVisible: Si,
      firstSelectableIndex: ja,
      onScroll: (E) =>
        jn((X) => {
          let min = Math.min(E + Si, Ft.length);
          if (X >= E && X < min) return X;
          let ge = (Re) => (Re >= E && Re < min ? Re : -1),
            ye = X < E ? ge(Yn(E, 1)) : ge(Yn(min - 1, -1));
          return ye === -1 ? X : ye;
        }),
    }),
    [$c, Ac] = y(),
    [Jo, cr] = y(null),
    [_v, Va] = y(!1),
    [Nc, _c] = y(!1);
  (P(() => {
    if (!oe) {
      _c(!1);
      return;
    }
    async function detectMcpb() {
      let mcpServersSpec = oe.plugin.manifest.mcpServers,
        ge = !1;
      if (mcpServersSpec)
        ge =
          (typeof mcpServersSpec === "string" && isMcpbSource(mcpServersSpec)) ||
          (Array.isArray(mcpServersSpec) &&
            mcpServersSpec.some((s_2) => typeof s_2 === "string" && isMcpbSource(s_2)));
      if (!ge)
        try {
          let ye = await readMarketplaceJsonContent(storageV5, oe.plugin),
            marketplace_1 = jsonParse(Wo(ye)),
            bt = parsePluginIdentifier(oe.plugin.source).name,
            entry_0 = marketplace_1.plugins?.find((tt) => tt.name === bt || tt.name === oe.plugin.name);
          if (entry_0?.mcpServers) {
            let spec = entry_0.mcpServers;
            ge =
              (typeof spec === "string" && isMcpbSource(spec)) ||
              (Array.isArray(spec) && spec.some((s_3) => typeof s_3 === "string" && isMcpbSource(s_3)));
          }
        } catch (err) {
          logForDebugging(`Failed to read raw marketplace.json: ${err}`);
        }
      if (!X) _c(ge);
    }
    let X = !1;
    return (
      detectMcpb(),
      isStorageV5Enabled() && storageV5 !== void 0
        ? () => {
            X = !0;
          }
        : void 0
    );
  }, [oe, storageV5]),
    P(() => {
      let E = qt > 0;
      async function loadInstalledPlugins() {
        if (!E) ln(!0);
        try {
          let { enabled: enabled, disabled: disabled } = await loadAllPlugins(storageV5, credentials),
            allPlugins = qy([...enabled, ...disabled]),
            pluginsByMarketplace = {};
          for (let plugin of allPlugins) {
            let it = marketplaceSuffix(plugin.source) ?? "local";
            if (!pluginsByMarketplace[it]) pluginsByMarketplace[it] = [];
            pluginsByMarketplace[it].push(plugin);
          }
          let bt = [],
            $e = getEnabledPluginsBySource();
          for (let [st, it] of Object.entries(pluginsByMarketplace)) {
            let enabledCount = count(it, (Xt) => {
                let Vt = findPluginInSettings_2(Xt.source);
                return isPluginEffectivelyEnabled(Vt, Xt, $e);
              }),
              cn = it.length - enabledCount;
            bt.push({ name: st, installedPlugins: it, enabledCount: enabledCount, disabledCount: cn });
          }
          (bt.sort((st, it) => {
            if (st.name === ANTHROPIC_PLUGIN_DIRECTORY) return -1;
            if (it.name === ANTHROPIC_PLUGIN_DIRECTORY) return 1;
            return st.name.localeCompare(it.name);
          }),
            qe(bt));
          let tt = [];
          for (let marketplace of bt)
            for (let plugin of marketplace.installedPlugins) {
              let De = plugin.isBuiltin
                ? "builtin"
                : (plugin.scope ?? getPluginInstallationFromV2(plugin.source).scope);
              tt.push({
                plugin: plugin,
                marketplace: marketplace.name,
                scope: De,
                pendingEnable: void 0,
                pendingUpdate: !1,
              });
            }
          if ((Lt(tt), !E)) jn(0);
        } finally {
          ln(!1);
        }
      }
      loadInstalledPlugins();
    }, [qt, storageV5, credentials]),
    P(() => {
      if (Fn.current) return;
      let E = _e.length > 0 || unifiedItems.some((X) => X.type === "failed-plugin");
      if (targetPlugin && E && !$t) {
        let { name: X, marketplace: marketplace } =
            targetMarketplace !== void 0
              ? { name: targetPlugin, marketplace: void 0 }
              : parsePluginIdentifier(normalizePluginId(targetPlugin)),
          ge = targetMarketplace ?? marketplace,
          ye = ge === void 0 ? void 0 : mJt(ge),
          Re = ye ? _e.filter(($e) => $e.name === ye) : _e;
        for (let marketplace_2 of Re) {
          let plugin = marketplace_2.installedPlugins.find(
            (p_0) =>
              pluginNamesEqual(p_0.name, X) || pluginNamesEqual(parsePluginIdentifier(p_0.source).name, X),
          );
          if (plugin) {
            let st = plugin.scope ?? getPluginInstallationFromV2(plugin.source).scope,
              pluginState = {
                plugin: plugin,
                marketplace: marketplace_2.name,
                scope: st,
                pendingEnable: void 0,
                pendingUpdate: !1,
              };
            (ft(pluginState), Se("plugin-details"), (Un.current = action), (Fn.current = !0));
            return;
          }
        }
        let failedItem = unifiedItems.find(
          (item_6) =>
            item_6.type === "failed-plugin" &&
            pluginNamesEqual(item_6.name, X) &&
            (!ye || item_6.marketplace === ye),
        );
        if (failedItem && failedItem.type === "failed-plugin")
          (Se({
            type: "failed-plugin-details",
            plugin: {
              id: failedItem.id,
              name: failedItem.name,
              marketplace: failedItem.marketplace,
              errors: failedItem.errors,
              scope: failedItem.scope,
            },
          }),
            (Fn.current = !0));
        if (!Fn.current && action)
          ((Fn.current = !0), setResult(`Plugin "${targetPlugin}" is not installed in this project`));
      }
    }, [targetPlugin, targetMarketplace, _e, $t, unifiedItems, action, setResult]));
  let handleSingleOperation = async (operation) => {
      if (Ce.current) return;
      if (!oe) return;
      let X = oe.scope || "user",
        ee = X === "builtin";
      if (ee && (operation === "update" || operation === "uninstall")) {
        ke("Built-in plugins cannot be updated or uninstalled.");
        return;
      }
      if (!ee && !isInstallableScope(X) && operation !== "update") {
        ke(MANAGED_PLUGIN_DISABLE_MESSAGE);
        return;
      }
      ((Ce.current = !0), We(!0), ke(null));
      try {
        let ge = at,
          ye,
          Re,
          bt;
        switch (operation) {
          case "enable": {
            let De = await enablePluginOp(ge, void 0, storageV5);
            if (!De.success) throw Error(De.message);
            logPluginToggleScreen({
              operation: "enable",
              pluginId: De.pluginId || ge,
              scope: De.scope,
              storageV5: storageV5,
            });
            break;
          }
          case "disable": {
            let De = await disablePluginOp(ge, void 0, storageV5);
            if (!De.success) throw Error(De.message);
            (logPluginToggleScreen({
              operation: "disable",
              pluginId: De.pluginId || ge,
              scope: De.scope,
              storageV5: storageV5,
            }),
              (ye = De.reverseDependents));
            break;
          }
          case "uninstall": {
            if (ee) break;
            if (!isInstallableScope(X)) break;
            if (isPluginEnabledAtProjectScope(ge)) {
              (We(!1), Se("confirm-project-uninstall"));
              return;
            }
            let De = getInstalledPlugins().plugins[ge],
              Xt = !De || De.length <= 1 ? await getPluginDataDirSize(ge) : null;
            if (Xt) {
              (We(!1), Se({ type: "confirm-data-cleanup", size: Xt }));
              return;
            }
            let Vt = await uninstallPluginOp(ge, X, void 0, storageV5);
            if (!Vt.success) throw Error(Vt.message);
            (logPluginToggleScreen({
              operation: "uninstall",
              pluginId: Vt.pluginId || ge,
              scope: Vt.scope || X,
              savedKept: Vt.savedKept !== void 0,
              storageV5: storageV5,
            }),
              (ye = Vt.reverseDependents),
              (Re = Vt.directoryNameNote),
              (bt = [Vt.savedKept?.note, Vt.olderLocalSettingsSkippedNote]
                .filter((Fe) => Fe !== void 0)
                .join(" ")));
            break;
          }
          case "update": {
            if (ee) break;
            let De = await updatePluginOp(
              ge,
              X,
              { explicit: !0, consentedEntryHelper: hasAutoNavigated.pinned() },
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
                (setResult(De.message), await onManageComplete(), setViewState({ type: "menu" }));
                return;
              case "updated":
                break;
            }
            break;
          }
        }
        if (
          (ic(storageV5, credentials),
          xn((De) => {
            if (!De.has(ge)) return De;
            let cn = new Map(De);
            return (cn.delete(ge), cn);
          }),
          operation === "disable" || operation === "uninstall")
        )
          wn(operation, at);
        let $e = isPluginEffectivelyEnabled(ge, oe.plugin, getEnabledPluginsBySource());
        if (operation !== "uninstall" && operation !== "update" && $e) {
          (We(!1), Se({ type: "plugin-options" }));
          return;
        }
        let tt =
            operation === "enable"
              ? "Enabled"
              : operation === "disable"
                ? "Disabled"
                : operation === "update"
                  ? "Updated"
                  : "Uninstalled",
          st = ye && ye.length > 0 ? ` \xB7 required by ${ye.join(", ")}` : "",
          message = `${re.tick} ${tt} ${getPluginDisplayName(oe.plugin)}${st}.${Re === void 0 ? "" : ` ${stripInvisibleKeepEmoji(Re)}`}${bt === void 0 || bt === "" ? "" : ` ${stripInvisibleKeepEmoji(bt)}`}`;
        if (operation === "update")
          (setResult(message), await onManageComplete(), setViewState({ type: "menu" }));
        else
          _t(
            `${message} ${Mt}`,
            operation === "uninstall" ? await listUnscopedPluginForProject(ge, storageV5) : [],
          );
      } catch (error_0) {
        We(!1);
        let ye = error_0 instanceof Error ? error_0.message : String(error_0);
        (ke(`Failed to ${operation}: ${ye}`),
          logForDebugging(`Failed to ${operation} plugin: ${ye}`, { level: "error" }));
      } finally {
        Ce.current = !1;
      }
    },
    handleSingleOperationRef = Oo(handleSingleOperation);
  P(() => {
    if (ae === "plugin-details" && oe && Un.current) {
      let pending = Un.current;
      if (((Un.current = void 0), pending === "configure")) {
        let userConfig = oe.plugin.manifest.userConfig;
        if (userConfig && Object.keys(userConfig).length > 0)
          Se({ type: "configuring-options", schema: userConfig });
        else setResult(`Plugin "${marketplaceSource(oe.plugin)}" declares no userConfig options.`);
        return;
      }
      handleSingleOperationRef(pending);
    }
  }, [ae, oe, setResult]);
  let jm = ce(async () => {
      let E = Ft[_n];
      if (!di(E)) return;
      if (E.kind === "disabled-header") {
        kn((ee) => !ee);
        return;
      }
      let item = E.item;
      if (item.type === "flagged-plugin") return;
      if (item.type === "plugin") {
        let id = item.id,
          currentPending = mn.get(id),
          ye = isPluginEffectivelyEnabled(id, item.plugin, nn),
          pluginScope_0 = item.scope,
          bt = pluginScope_0 === "builtin";
        if (isRequiredPlugin(id, item.plugin.installationPreference)) {
          ke(requiredPluginMessage(id));
          return;
        }
        if (bt || isInstallableScope(pluginScope_0)) {
          if (Rn.current.has(id)) return;
          (Rn.current.add(id), rn((tt) => new Set(tt).add(id)));
          let newPending = new Map(mn);
          if (currentPending) {
            (newPending.delete(id), ke(null));
            let tt = (async () => {
              try {
                let st =
                  currentPending === "will-disable"
                    ? await enablePluginOp(id, void 0, storageV5)
                    : await disablePluginOp(id, void 0, storageV5);
                if (!st.success && !st.alreadyInGoalState) {
                  (xn((it) => {
                    let De = new Map(it);
                    return (De.set(id, currentPending), De);
                  }),
                    ke(st.message));
                  return;
                }
                if (st.success)
                  logPluginToggleScreen({
                    operation: currentPending === "will-disable" ? "enable" : "disable",
                    pluginId: st.pluginId || id,
                    scope: st.scope,
                    storageV5: storageV5,
                  });
                ic(storageV5, credentials);
              } catch (err_0) {
                (xn((it) => {
                  let De = new Map(it);
                  return (De.set(id, currentPending), De);
                }),
                  ke(`Failed to reverse the toggle: ${errorMessage(err_0)}`),
                  logError(
                    withTelemetryMessage(
                      toError(err_0),
                      "/plugin: reversing a pending toggle on the list threw",
                    ),
                  ));
              } finally {
                Rn.current.delete(id);
              }
            })();
            Nt(tt);
          } else {
            (newPending.set(id, ye ? "will-disable" : "will-enable"), ke(null));
            let tt = (async () => {
              try {
                let st = ye
                  ? await disablePluginOp(id, void 0, storageV5)
                  : await enablePluginOp(id, void 0, storageV5);
                if (!st.success) {
                  (xn((it) => {
                    let De = new Map(it);
                    return (De.delete(id), De);
                  }),
                    ke(st.message));
                  return;
                }
                if (
                  (logPluginToggleScreen({
                    operation: ye ? "disable" : "enable",
                    pluginId: st.pluginId || id,
                    scope: st.scope,
                    storageV5: storageV5,
                  }),
                  ic(storageV5, credentials),
                  onManageComplete(),
                  ye)
                )
                  wn("disable", id);
              } catch (err_1) {
                (xn((it) => {
                  let De = new Map(it);
                  return (De.delete(id), De);
                }),
                  ke(`Failed to toggle: ${errorMessage(err_1)}`),
                  logError(
                    withTelemetryMessage(toError(err_1), "/plugin: toggling a plugin on the list threw"),
                  ));
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
        An(item.client.name).catch((ge) => {
          ke(
            formatMcpOperationFailure(ge, item.client.name, ee, {
              config: item.client.config,
              persistsOffBox: !1,
            }),
          );
        });
      } else if (item.type === "skill") {
        if (sn.current.has(item.id)) return;
        let ee = nextSkillOverrideState(item.override, item.lockSource);
        if (ee === item.override) return;
        (sn.current.add(item.id), rn((ye) => new Set(ye).add(item.id)));
        let { error: error } = await updateSettingsForSource(
          "localSettings",
          { skillOverrides: { [item.cmdName]: diffSkillOverrideFromSettings(item, ee) } },
          void 0,
          storageV5,
        );
        if ((sn.current.delete(item.id), error)) {
          ke(error.message);
          return;
        }
        Ut((ye) => ye + 1);
      }
    }, [_n, Ft, mn, vt, An, wn, onManageComplete, Nt, storageV5, credentials, nn]),
    Hm = ce(() => {
      let E = Ft[_n];
      if (!di(E)) return;
      if (E.kind === "disabled-header") {
        kn((ee) => !ee);
        return;
      }
      let item = E.item;
      if (item.type === "plugin") {
        let state_0 = vt.find((s_4) => s_4.plugin.source === item.plugin.source);
        if (state_0) (ft(state_0), Se("plugin-details"), Ac(void 0), ke(null), Jt(null));
      } else if (item.type === "flagged-plugin")
        (Se({
          type: "flagged-detail",
          plugin: {
            id: item.id,
            name: item.name,
            marketplace: item.marketplace,
            reason: item.reason,
            text: item.text,
            flaggedAt: item.flaggedAt,
          },
        }),
          ke(null));
      else if (item.type === "failed-plugin")
        (Se({
          type: "failed-plugin-details",
          plugin: {
            id: item.id,
            name: item.name,
            marketplace: item.marketplace,
            errors: item.errors,
            scope: item.scope,
          },
        }),
          ke(null));
      else if (item.type === "mcp") (Se({ type: "mcp-detail", client: item.client }), ke(null));
      else if (item.type === "skill") (Se({ type: "skill-detail", skill: item }), ke(null));
    }, [_n, Ft, vt]);
  MessageActionsKeybindings(
    {
      "select:previous": () => {
        let E = Yn(_n - 1, -1);
        if (E === -1) {
          if (!$t && unifiedItems.length > 0) he(!0);
        } else pagination.handleSelectionChange(E, jn);
      },
      "select:next": () => {
        let E = Yn(_n + 1, 1);
        if (E !== -1) pagination.handleSelectionChange(E, jn);
      },
      "select:accept": Hm,
    },
    { context: "Select", isActive: ae === "plugin-list" && !ne },
  );
  let Gm = ce(() => {
    let E = Ft[_n];
    if (E?.kind !== "item") return !1;
    ((Ro.current = { section: E.section, id: E.item.id }), en(E.item.id));
  }, [Ft, _n, en]);
  MessageActionsKeybindings(
    { "plugin:toggle": jm, "plugin:favorite": Gm },
    { context: "Plugin", isActive: ae === "plugin-list" && !ne },
  );
  let Km = ce(() => {
    if (typeof ae !== "object" || ae.type !== "flagged-detail") return;
    (removeFlaggedPlugin(ae.plugin.id, storageV5), Se("plugin-list"));
  }, [ae, storageV5]);
  MessageActionsKeybindings(
    { "select:accept": Km },
    { context: "Select", isActive: typeof ae === "object" && ae.type === "flagged-detail" },
  );
  let Bc = Q(() => {
    if (ae !== "plugin-details" || !oe) return [];
    let E = at,
      X = isPluginEffectivelyEnabled(E, oe.plugin, nn),
      ee = oe.marketplace === "builtin",
      ge = isOfficialMarketplace(oe.marketplace),
      ye = [];
    if (!isRequiredPlugin(E, oe.plugin.installationPreference))
      ye.push({
        value: "toggle-enabled",
        label: X ? "Disable plugin" : "Enable plugin",
        action: () => void handleSingleOperation(X ? "disable" : "enable"),
      });
    if (
      (ye.push({
        value: "favorite",
        label: mt.has(E) ? "Remove from favorites" : "Add to favorites",
        action: () => en(E),
      }),
      !ee && !ge)
    ) {
      if (
        (ye.push({
          value: "mark-for-update",
          label: oe.pendingUpdate ? "Unmark for update" : "Mark for update",
          action: async () => {
            try {
              let $e = await checkIfLocalPlugin(parsePluginIdentifier(E).name, oe.marketplace, storageV5);
              if ($e) {
                ke($e);
                return;
              }
              let newStates = [...vt],
                index = newStates.findIndex((s_5) => s_5.plugin.source === oe.plugin.source);
              if (index !== -1)
                ((newStates[index].pendingUpdate = !oe.pendingUpdate),
                  Lt(newStates),
                  ft({ ...oe, pendingUpdate: !oe.pendingUpdate }));
            } catch (error_1) {
              ke(error_1 instanceof Error ? error_1.message : "Failed to check plugin update availability");
            }
          },
        }),
        Nc)
      )
        ye.push({
          value: "configure",
          label: "Configure",
          action: async () => {
            Va(!0);
            try {
              let mcpServersSpec_0 = oe.plugin.manifest.mcpServers,
                mcpbPath = null;
              if (typeof mcpServersSpec_0 === "string" && isMcpbSource(mcpServersSpec_0))
                mcpbPath = mcpServersSpec_0;
              else if (Array.isArray(mcpServersSpec_0)) {
                for (let spec_0 of mcpServersSpec_0)
                  if (typeof spec_0 === "string" && isMcpbSource(spec_0)) {
                    mcpbPath = spec_0;
                    break;
                  }
              }
              if (!mcpbPath) {
                (ke("No MCPB file found in plugin"), Va(!1));
                return;
              }
              let st = at,
                it = await loadMcpbFile(mcpbPath, oe.plugin.path, st, void 0, void 0, !0, storageV5);
              if ("status" in it && it.status === "needs-config") (cr(it), Se("configuring"));
              else ke("Failed to load MCPB for configuration");
            } catch (err_2) {
              let errorMsg = errorMessage(err_2);
              ke(`Failed to load configuration: ${errorMsg}`);
            } finally {
              Va(!1);
            }
          },
        });
      (ye.push({
        value: "update",
        label: e(Text, { color: "suggestion", children: "Update now" }),
        action: () => void handleSingleOperation("update"),
      }),
        ye.push({
          value: "uninstall",
          label: e(Text, { color: "error", children: "Uninstall" }),
          action: () => void handleSingleOperation("uninstall"),
        }));
    }
    if (oe.plugin.manifest.userConfig && Object.keys(oe.plugin.manifest.userConfig).length > 0)
      ye.push({
        value: "configure-options",
        label: "Configure options",
        action: () => {
          Se({ type: "configuring-options", schema: oe.plugin.manifest.userConfig });
        },
      });
    let Re = redactUrlCredentials(oe.plugin.manifest.homepage);
    if (Re) ye.push({ value: "homepage", label: "Open homepage", action: () => void fi(Re) });
    let bt = redactUrlCredentials(oe.plugin.manifest.repository);
    if (bt) ye.push({ value: "repository", label: "View repository", action: () => void fi(bt) });
    if (jF()) ye.push({ value: "usage", label: "Usage", action: () => Se("plugin-usage") });
    if (Ln && !ee && !ge) {
      let $e = Ln;
      ye.push({
        value: "switch-copy",
        label: `Switch to ${Amn($e.marketplace)}`,
        action: () => {
          (ke(null), Se({ type: "confirm-switch-copy", copy: $e }));
        },
      });
    }
    return (
      ye.push({
        value: "back",
        label: "Back to plugin list",
        action: () => {
          (Se("plugin-list"), ft(null), ke(null));
        },
      }),
      ye
    );
  }, [ae, oe, Nc, vt, mt, en, storageV5, nn, Ln]);
  MessageActionsKeybindings(
    {
      "select:accept": () => {
        if (typeof ae === "object" && ae.type === "failed-plugin-details")
          (async () => {
            (We(!0), ke(null));
            let pluginId_7 = ae.plugin.id,
              pluginScope_1 = ae.plugin.scope,
              ee = await uninstallPluginOp(
                pluginId_7,
                isInstallableScope(pluginScope_1) ? pluginScope_1 : "user",
                !1,
                storageV5,
                { settingsStillOn: "remove-anyway" },
              );
            if (ee.success && ee.pluginId)
              logPluginToggleScreen({
                operation: "uninstall",
                pluginId: ee.pluginId,
                scope: ee.scope || (isInstallableScope(pluginScope_1) ? pluginScope_1 : "user"),
                savedKept: ee.savedKept !== void 0,
                storageV5: storageV5,
              });
            let success = ee.success,
              ye = 0,
              Re;
            if (!success) {
              for (let De of EDITABLE_SETTING_SOURCES) {
                let cn = getSettingsForSourceForUpkeep(De),
                  Xt = findPluginName(Object.keys(cn?.enabledPlugins ?? {}), pluginId_7);
                if (Xt !== void 0) {
                  let { error: error } = await updateSettingsForSourceWithTransform(
                    De,
                    (Fe) => ({ enabledPlugins: { ...Fe?.enabledPlugins, [Xt]: void 0 } }),
                    void 0,
                    storageV5,
                  );
                  if (error) {
                    Re = error;
                    break;
                  }
                  (ye++, (success = !0));
                }
              }
              ic(storageV5, credentials);
            }
            if (Re) {
              if (ye > 0) onManageComplete();
              (We(!1),
                ke(
                  ye > 0
                    ? `Removed ${stripInvisibleKeepEmoji(ae.plugin.name)} from ${ye} ${plural(ye, "settings file")}. Failed to write another: ${Re.message}`
                    : `Failed to write settings: ${Re.message}`,
                ));
              return;
            }
            let bt = await loadInstalledPlugins(storageV5),
              $e = PF(bt) ? getInstalledPlugins() : bt,
              editableSources = [
                ...Object.entries($e.plugins).flatMap(([De, cn]) =>
                  hasInstallationForCurrentProject(cn) ? [De] : [],
                ),
                ...EDITABLE_SETTING_SOURCES.flatMap((De) =>
                  Object.keys(getSettingsForSourceForUpkeep(De)?.enabledPlugins ?? {}),
                ),
                ...getPluginEditableScopes().keys(),
              ],
              any = editableSources.some((De) => pluginNamesEqual(De, pluginId_7)),
              it =
                !success &&
                !mergePluginErrors(pluginId_7) &&
                !ae.plugin.errors.some(isOrphanPlugin) &&
                isUninstalledPluginFailure(ee, pluginId_7, editableSources);
            if (success || it) {
              let De = stripInvisibleKeepEmoji(ae.plugin.name),
                cn = ee.success
                  ? `${stripInvisibleKeepEmoji(ee.message)} \xB7 data preserved`
                  : success
                    ? `Removed ${De} from settings`
                    : `Removed ${De} from the list. It is not installed.`;
              _t(
                `${re.tick} ${cn}`,
                ee.success
                  ? await listUnscopedPluginForProject(pluginId_7, storageV5)
                  : any
                    ? []
                    : [pluginId_7],
              );
            } else (We(!1), ke(stripInvisibleKeepEmoji(ee.message)));
          })().catch((E) => {
            (We(!1), ke(stripInvisibleKeepEmoji(errorMessage(E))));
          });
      },
    },
    {
      context: "Select",
      isActive:
        typeof ae === "object" &&
        ae.type === "failed-plugin-details" &&
        ae.plugin.scope !== "managed" &&
        !isOfficialMarketplace(ae.plugin.marketplace),
    },
  );
  function Ym(E) {
    if (E.ctrl || E.meta || wt) return;
    if (!oe) return;
    let X = at;
    if (E.key === "y" || E.key === "Y" || E.key === "return") {
      if ((E.preventDefault(), managedPluginRefusal(X) !== void 0)) return;
      (We(!0),
        ke(null),
        (async () => {
          try {
            let { error: error } = await updateSettingsForSourceWithTransform(
              "localSettings",
              (ge) => ({ enabledPlugins: { ...ge?.enabledPlugins, [X]: !1 } }),
              void 0,
              storageV5,
            );
            if (error) {
              (We(!1), ke(`Failed to write settings: ${error.message}`));
              return;
            }
            (logPluginToggleScreen({
              operation: "disable",
              pluginId: X,
              scope: "local",
              storageV5: storageV5,
            }),
              ic(storageV5, credentials),
              wn("disable", X),
              _t(
                `${re.tick} Disabled ${getPluginDisplayName(oe.plugin)} in .claude/settings.local.json${flagSettingsEnabledNote(X)}. ${Mt}`,
              ));
          } catch (error) {
            (We(!1), ke(errorMessage(error)));
          }
        })());
    } else if (E.key === "u" || E.key === "U")
      (E.preventDefault(),
        We(!0),
        ke(null),
        (async () => {
          try {
            let ee = getOriginalCwd(),
              ge = qP(getInstalledPlugins().plugins[X], "project", ee) !== void 0,
              ye;
            if (ge) {
              let Re = await uninstallPluginOp(X, "project", !1, storageV5);
              if (!Re.success) {
                (We(!1), ke(Re.message));
                return;
              }
              (logPluginToggleScreen({
                operation: "uninstall",
                pluginId: Re.pluginId || X,
                scope: Re.scope || "project",
                savedKept: Re.savedKept !== void 0,
                storageV5: storageV5,
              }),
                (ye = Re.message));
            } else {
              let { error: error } = await updateSettingsForSourceWithTransform(
                "projectSettings",
                (bt) => {
                  let $e = bt?.enabledPlugins ?? {},
                    tt = findPluginName(Object.keys($e), X) ?? X;
                  return { enabledPlugins: { ...$e, [tt]: void 0 } };
                },
                void 0,
                storageV5,
              );
              if (error) {
                (We(!1), ke(`Failed to write settings: ${error.message}`));
                return;
              }
              ye = `Removed ${getPluginDisplayName(oe.plugin)} from .claude/settings.json`;
            }
            (ic(storageV5, credentials),
              wn("uninstall", X),
              _t(`${re.tick} ${ye}. ${Mt}`, await listUnscopedPluginForProject(X, storageV5)));
          } catch (error) {
            (We(!1), ke(errorMessage(error)));
          }
        })());
    else if (E.key === "n" || E.key === "N" || E.key === "escape")
      (E.preventDefault(), Se("plugin-details"), ke(null));
  }
  function Ha(E) {
    {
      if (E.ctrl || E.meta || wt || pendingAutoActionRef.current) return;
      if (!oe || typeof ae !== "object" || ae.type !== "confirm-switch-copy") return;
      let scope = oe.scope,
        copy = ae.copy,
        ge = at,
        settings = getPluginDisplayName(oe.plugin);
      if (E.key === "y" || E.key === "Y") {
        if (
          (E.preventDefault(),
          (scope !== "user" && scope !== "local") ||
            fn !== null ||
            jt.state !== "known" ||
            typeof Ue !== "boolean")
        )
          return;
        let Re = [
            ...(ge === null ? [] : [ge]),
            ...jt.replaced.map(($e) => $e.pluginId).filter(($e) => $e !== ge),
          ],
          bt = getUncoveredPluginScopes(jt.replaced, scope, copy.pluginId);
        ((pendingAutoActionRef.current = !0),
          We(!0),
          ke(null),
          (async () => {
            try {
              let $e = await installPluginOp(
                copy.pluginId,
                scope,
                {
                  replaceInstalledCopy: !0,
                  replaceOnlyPluginIds: Re,
                  surface: "installed_switch",
                  ...(ge !== null && { carrySettingsFrom: ge }),
                },
                storageV5,
              );
              if (!$e.success) {
                (We(!1), ke(stripInvisibleKeepEmoji($e.message)));
                return;
              }
              ic(storageV5, credentials);
              let tt = $e.switched?.keptDataDir,
                st = new Intl.ListFormat("en", { type: "conjunction" }),
                it = $e.switched?.settingsRemovedFrom ?? [],
                De = $e.switched?.savedDataRemovedFrom ?? [],
                filtered = it.filter((Gt) => De.includes(Gt)),
                filtered_2 = it.filter((Gt) => !De.includes(Gt)),
                filtered_3 = De.filter((Gt) => !it.includes(Gt)),
                Fe = (Gt) => st.format(Gt.map((Rt) => displayPluginId(Rt))),
                format = st.format([
                  ...(filtered.length > 0 ? [`the settings and saved data for ${Fe(filtered)}`] : []),
                  ...(filtered_2.length > 0 ? [`the settings saved for ${Fe(filtered_2)}`] : []),
                  ...(filtered_3.length > 0 ? [`the saved data of ${Fe(filtered_3)}`] : []),
                ]),
                filtered_4 = bt.filter((Gt) => !$e.switched?.oldCopyStillRecordedAt?.includes(Gt));
              _t(
                $e.switched && !$e.switched.messageSaysMore
                  ? `${re.tick} Switched ${Gd(settings)} to ${Amn(copy.marketplace)}${$e.switched.replaced.length > 1 ? ` from ${new Intl.ListFormat("en", { type: "conjunction" }).format($e.switched.replaced.map((Gt) => Amn(parsePluginIdentifier(Gt).marketplace ?? "")))}` : ""}.${$e.switched.keptOwnSettings ? ` ${capitalize(displayPluginId(copy.pluginId))} kept its own settings${format === "" ? "" : `, and ${format} were removed`}.` : format === "" ? "" : ` ${capitalize(format)} were removed.`}${$e.switched.stayedDisabled ? " It stays disabled, as before." : ""}${filtered_4.length === 0 ? "" : ` It is no longer installed at ${new Intl.ListFormat("en", { type: "conjunction" }).format(filtered_4)} scope.`}${tt === void 0 ? "" : ` ${describeKeptDataDir(tt, copy.pluginId)}.`} ${Mt}`
                  : `${re.tick} ${stripInvisibleKeepEmoji($e.message)}${$e.switched ? `.${filtered_4.length === 0 ? "" : ` It is no longer installed at ${new Intl.ListFormat("en", { type: "conjunction" }).format(filtered_4)} scope.`} ${Mt}` : ""}`,
                (
                  await Promise.all(
                    ($e.switched?.replaced ?? (ge === null ? [] : [ge])).map((Gt) =>
                      listUnscopedPluginForProject(Gt, storageV5),
                    ),
                  )
                ).flat(),
              );
            } catch (error) {
              (We(!1), ke(stripInvisibleKeepEmoji(errorMessage(error))));
            } finally {
              pendingAutoActionRef.current = !1;
            }
          })());
      } else if (E.key === "n" || E.key === "N" || E.key === "escape")
        (E.preventDefault(), Se("plugin-details"), ke(null));
    }
  }
  function qm(E) {
    if (E.ctrl || E.meta || wt) return;
    if (!oe) return;
    let X = at,
      pluginScope_2 = oe.scope;
    if (!pluginScope_2 || pluginScope_2 === "builtin" || !isInstallableScope(pluginScope_2)) return;
    let doUninstall = async (deleteDataDir) => {
      (We(!0), ke(null));
      try {
        let Re = await uninstallPluginOp(X, pluginScope_2, deleteDataDir, storageV5);
        if (!Re.success) throw Error(Re.message);
        (logPluginToggleScreen({
          operation: "uninstall",
          pluginId: Re.pluginId || X,
          scope: Re.scope || pluginScope_2,
          savedKept: Re.savedKept !== void 0,
          storageV5: storageV5,
        }),
          ic(storageV5, credentials),
          wn("uninstall", X));
        let bt = (Re.dataDirKept ?? !deleteDataDir) ? " \xB7 data preserved" : "";
        _t(`${re.tick} ${Re.message}${bt}`, await listUnscopedPluginForProject(X, storageV5));
      } catch (e_0) {
        (We(!1), ke(e_0 instanceof Error ? e_0.message : String(e_0)));
      }
    };
    if (E.key === "y" || E.key === "Y") (E.preventDefault(), doUninstall(!0));
    else if (E.key === "n" || E.key === "N") (E.preventDefault(), doUninstall(!1));
    else if (E.key === "escape") (E.preventDefault(), Se("plugin-details"), ke(null));
  }
  P(() => {
    jn(0);
  }, [searchQuery]);
  function Wm(E) {
    if (ne) {
      handleKeyDown(E);
      return;
    }
    if (E.ctrl || E.meta) return;
    if (E.key === "/") (E.preventDefault(), he(!0), setSearchQuery(""), jn(0));
    else if (E.key.length === 1 && E.key !== " ") (E.preventDefault(), he(!0), setSearchQuery(E.key), jn(0));
  }
  function finish(msg) {
    if (ne) {
      handlePaste(msg);
      return;
    }
    let trimmed = (msg.text.split(/\r\n|\r|\n/, 2)[0] ?? "").trim();
    if (!trimmed) return;
    (msg.preventDefault(), he(!0), setSearchQuery(trimmed), jn(0));
  }
  if ($t) return e(Text, { children: "Loading installed plugins\u2026" });
  if (unifiedItems.length === 0)
    return r(Box, {
      flexDirection: "column",
      children: [
        e(Box, { marginBottom: 1, children: e(Text, { bold: !0, children: "Manage plugins" }) }),
        ht &&
          e(Box, {
            marginBottom: 1,
            paddingLeft: 2,
            children: e(Text, { color: "success", children: stripInvisibleKeepNewlines(ht) }),
          }),
        e(HintText, { children: "No plugins or MCP servers installed." }),
        e(Box, {
          marginTop: 1,
          children: e(Text, {
            dimColor: !0,
            children: e(ConfigurableShortcutHint, {
              action: "confirm:no",
              context: "Settings",
              fallback: "Esc",
              description: "go back",
            }),
          }),
        }),
      ],
    });
  if (typeof ae === "object" && ae.type === "plugin-options" && oe) {
    let E = at;
    return e(PluginOptionsFlow, {
      plugin: oe.plugin,
      pluginId: E,
      onDone: (X, ee, ge) => {
        let ye = getPluginDisplayName(oe.plugin);
        switch (X) {
          case "configured":
          case "skipped":
            _t(
              X === "configured" && ge
                ? `${re.tick} Enabled and configured ${ye}. ${Mt}`
                : `${re.tick} Enabled ${ye}. ${Mt}`,
            );
            break;
          case "error":
          case "read-error":
            (ke(
              X === "error"
                ? `Failed to save configuration: ${ee}`
                : `Configuration not applied: could not read the saved options (${ee})`,
            ),
              We(!1),
              xt((Re) => Re + 1),
              Se("plugin-details"),
              onManageComplete());
            break;
        }
      },
    });
  }
  if (typeof ae === "object" && ae.type === "configuring-options" && oe) {
    let E = at;
    return e(
      PluginOptionsDialogLoader,
      {
        title: `Configure ${getPluginDisplayName(oe.plugin)}`,
        subtitle: "Plugin options",
        configSchema: ae.schema,
        load: () => loadPluginOptions(E, credentials),
        onSave: async (values) => {
          try {
            (await savePluginOptions_2(E, values, ae.schema, storageV5), ic(storageV5, credentials));
            let ee = Object.keys(values).length > 0;
            if (ee) onManageComplete();
            setResult(ee ? "Configuration saved." : "No configuration changes.");
          } catch (err_3) {
            ke(`Failed to save configuration: ${errorMessage(err_3)}`);
          }
          Se("plugin-details");
        },
        onCancel: () => Se("plugin-details"),
      },
      E,
    );
  }
  if (ae === "configuring" && Jo && oe) {
    let ee = function () {
        (cr(null), Se("plugin-details"));
      },
      E = at;
    async function handleSave(config) {
      if (!Jo || !oe) return;
      try {
        let mcpServersSpec_1 = oe.plugin.manifest.mcpServers,
          mcpbPath_0 = null;
        if (typeof mcpServersSpec_1 === "string" && isMcpbSource(mcpServersSpec_1))
          mcpbPath_0 = mcpServersSpec_1;
        else if (Array.isArray(mcpServersSpec_1)) {
          for (let spec_1 of mcpServersSpec_1)
            if (typeof spec_1 === "string" && isMcpbSource(spec_1)) {
              mcpbPath_0 = spec_1;
              break;
            }
        }
        if (!mcpbPath_0) {
          (ke("No MCPB file found"), Se("plugin-details"));
          return;
        }
        (await loadMcpbFile(mcpbPath_0, oe.plugin.path, E, void 0, config, void 0, storageV5),
          ke(null),
          cr(null),
          Se("plugin-details"),
          onManageComplete(),
          setResult("Configuration saved."));
      } catch (err_4) {
        let errorMsg_0 = errorMessage(err_4);
        (ke(`Failed to save configuration: ${errorMsg_0}`), Se("plugin-details"));
      }
    }
    return e(PluginOptionsDialog, {
      title: `Configure ${Tct(Jo.manifest.display_name) ?? Jo.manifest.name}`,
      subtitle: `Plugin: ${getPluginDisplayName(oe.plugin)}`,
      configSchema: Jo.configSchema,
      initialValues: Jo.existingConfig,
      onSave: handleSave,
      onCancel: ee,
    });
  }
  if (typeof ae === "object" && ae.type === "flagged-detail") {
    let fp = ae.plugin;
    return r(Box, {
      flexDirection: "column",
      children: [
        e(Box, {
          children: r(Text, {
            bold: !0,
            children: [
              stripInvisibleKeepEmoji(fp.name),
              " @",
              " ",
              stripInvisibleKeepEmoji(displayMarketplaceName(fp.marketplace)),
            ],
          }),
        }),
        r(Box, {
          marginBottom: 1,
          children: [
            e(Text, { dimColor: !0, children: "Status: " }),
            e(Text, { color: "error", children: "Removed" }),
          ],
        }),
        r(Box, {
          marginBottom: 1,
          flexDirection: "column",
          children: [
            r(Text, { color: "error", children: ["Removed from marketplace \xB7 reason: ", fp.reason] }),
            e(Text, { children: fp.text }),
            r(Text, { dimColor: !0, children: ["Flagged on ", new Date(fp.flaggedAt).toLocaleDateString()] }),
          ],
        }),
        e(Box, {
          marginTop: 1,
          flexDirection: "column",
          children: r(TwoColumnRow, {
            active: !0,
            children: [
              r(Text, { "aria-hidden": !0, children: [re.pointer, " "] }),
              e(Text, { color: "suggestion", children: "Dismiss" }),
            ],
          }),
        }),
        r(Byline, {
          children: [
            e(ConfigurableShortcutHint, {
              action: "select:accept",
              context: "Select",
              fallback: "Enter",
              description: "dismiss",
            }),
            e(ConfigurableShortcutHint, {
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
  if (ae === "plugin-usage" && oe) return e(renderSkillListingFootprint, { plugin: oe.plugin });
  if (ae === "confirm-project-uninstall" && oe) {
    let E = managedPluginRefusal(at)?.message;
    return r(FocusColumn, {
      onKeyDown: Ym,
      children: [
        r(Text, {
          bold: !0,
          color: "warning",
          children: [
            getPluginDisplayName(oe.plugin),
            " is enabled in .claude/settings.json (shared with your team)",
          ],
        }),
        E === void 0
          ? r(Box, {
              marginTop: 1,
              flexDirection: "column",
              children: [
                e(Text, { children: "Disable it just for you in .claude/settings.local.json?" }),
                e(Text, {
                  dimColor: !0,
                  children: "The plugin stays installed for the project; only your local override changes.",
                }),
              ],
            })
          : e(Box, { marginTop: 1, children: e(Text, { children: E }) }),
        Ve && e(Box, { marginTop: 1, children: e(ErrorText, { error: stripInvisibleKeepNewlines(Ve) }) }),
        e(Box, {
          marginTop: 1,
          children: wt
            ? e(Text, { dimColor: !0, children: "Processing\u2026" })
            : r(Byline, {
                children: [
                  E === void 0 && e(KeyboardShortcutHint, { chord: "y", action: "disable for me", bold: !0 }),
                  e(KeyboardShortcutHint, { chord: "u", action: "uninstall for everyone", bold: !0 }),
                  e(KeyboardShortcutHint, {
                    chord: "escape",
                    action: "cancel",
                    bold: !0,
                    format: { keyCase: "lower" },
                  }),
                ],
              }),
        }),
      ],
    });
  }
  if (typeof ae === "object" && ae.type === "confirm-switch-copy" && oe) {
    let copy = ae.copy,
      X = getInstalledPlugins().plugins[at ?? ""],
      ee = findScopedInstallation(X, oe.scope)?.gitCommitSha,
      ge = Amn(copy.marketplace),
      ye = Gd(getPluginDisplayName(oe.plugin)),
      filteredPluginErrors = (jt.state === "known" ? jt.replaced : []).filter((e_1) => e_1.pluginId !== at),
      bt = new Intl.ListFormat("en", { type: "conjunction" }),
      mapped = filteredPluginErrors.map((Vt) => ls(parsePluginIdentifier(Vt.pluginId).marketplace ?? "")),
      tt = ls(copy.marketplace),
      st = ls(oe.marketplace),
      it = oe.scope ?? "user",
      De = jt.state === "known" ? getUncoveredPluginScopes(jt.replaced, it, copy.pluginId) : [],
      cn =
        jt.state !== "known" || De.length === 0
          ? ""
          : `The switch uninstalls ${bt.format(
              jt.replaced
                .filter((Vt) => Vt.scopes.some((scope) => scope !== it))
                .toSorted((error_3, i_0) => Number(i_0.pluginId === at) - Number(error_3.pluginId === at))
                .map((Vt) => `${displayPluginId(Vt.pluginId)} at ${bt.format(Vt.scopes)} scope`),
            )}, and installs the new copy at ${it} scope, so the plugin is no longer installed at ${bt.format(De)} scope.`,
      Xt =
        jt.state === "known"
          ? describeOtherMarketplaceInstall(copy.pluginId, jt.listedName, jt.inOtherProjects)
          : "";
    if (fn !== null)
      return r(FocusColumn, {
        onKeyDown: Ha,
        children: [
          r(Text, { bold: !0, children: [capitalize(ye), " can't be switched to ", ge, " ", "from here"] }),
          e(Box, { marginTop: 1, children: e(Text, { children: stripInvisibleKeepEmoji(fn) }) }),
          e(Box, {
            marginTop: 1,
            children: e(Byline, {
              children: e(KeyboardShortcutHint, { chord: "escape", action: "go back", bold: !0 }),
            }),
          }),
        ],
      });
    if (jt.state !== "known" || typeof Ue !== "boolean")
      return r(FocusColumn, {
        onKeyDown: Ha,
        children: [
          r(Text, { bold: !0, children: ["Switch ", ye, " to ", ge, "?"] }),
          e(Box, {
            marginTop: 1,
            children:
              jt.state === "working"
                ? e(Text, { dimColor: !0, children: "Working out what will be replaced\u2026" })
                : jt.state === "failed"
                  ? e(Text, {
                      children:
                        "Could not work out what would be replaced, so nothing was changed. Go back and open the plugin again to retry.",
                    })
                  : Ue === void 0
                    ? e(Text, { dimColor: !0, children: "Working out what the switch will do\u2026" })
                    : e(Text, {
                        children:
                          "Could not work out what the switch would do with your saved plugin settings, so nothing was changed. Try again.",
                      }),
          }),
          e(Box, {
            marginTop: 1,
            children: e(Byline, {
              children: e(KeyboardShortcutHint, { chord: "escape", action: "go back", bold: !0 }),
            }),
          }),
        ],
      });
    return r(FocusColumn, {
      onKeyDown: Ha,
      children: [
        r(Text, { bold: !0, children: ["Switch ", ye, " to ", ge, "?"] }),
        r(Box, {
          marginTop: 1,
          flexDirection: "column",
          children: [
            r(Text, {
              children: [
                "Now:   ",
                displayPluginId(at ?? ""),
                " \xB7",
                " ",
                describePluginVersionPin(at ?? "", ee),
              ],
            }),
            filteredPluginErrors.map((Vt) =>
              r(
                Text,
                {
                  children: [
                    "Now:   ",
                    displayPluginId(Vt.pluginId),
                    " \xB7",
                    " ",
                    describePluginVersionPin(Vt.pluginId, Vt.gitCommitSha),
                  ],
                },
                Vt.pluginId,
              ),
            ),
            r(Text, {
              children: [
                "After: ",
                displayPluginId(copy.pluginId),
                " \xB7",
                " ",
                describePluginVersionPin(copy.pluginId, copy.sha),
              ],
            }),
            r(Text, {
              dimColor: !0,
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
                oe.marketplace === OFFICIAL_MARKETPLACE_NAME
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
        cn !== "" && e(Box, { marginTop: 1, children: e(Text, { children: stripInvisibleKeepEmoji(cn) }) }),
        Xt !== "" && e(Box, { marginTop: 1, children: e(Text, { children: stripInvisibleKeepEmoji(Xt) }) }),
        Ve && e(Box, { marginTop: 1, children: e(ErrorText, { error: Ve }) }),
        e(Box, {
          marginTop: 1,
          children: wt
            ? e(Text, { dimColor: !0, children: "Switching\u2026" })
            : r(Byline, {
                children: [
                  e(KeyboardShortcutHint, { chord: "y", action: "switch", bold: !0 }),
                  e(KeyboardShortcutHint, { chord: ["n", "escape"], action: "cancel", bold: !0 }),
                ],
              }),
        }),
      ],
    });
  }
  if (typeof ae === "object" && ae.type === "confirm-data-cleanup" && oe)
    return r(FocusColumn, {
      onKeyDown: qm,
      children: [
        r(Text, {
          bold: !0,
          children: [getPluginDisplayName(oe.plugin), " has", " ", ae.size.human, " of persistent data"],
        }),
        r(Box, {
          marginTop: 1,
          flexDirection: "column",
          children: [
            e(Text, { children: "Delete it along with the plugin?" }),
            e(Text, { dimColor: !0, children: pluginDataDirPath(at) }),
          ],
        }),
        Ve && e(Box, { marginTop: 1, children: e(ErrorText, { error: stripInvisibleKeepNewlines(Ve) }) }),
        e(Box, {
          marginTop: 1,
          children: wt
            ? e(Text, { dimColor: !0, children: "Uninstalling\u2026" })
            : r(Byline, {
                children: [
                  e(KeyboardShortcutHint, { chord: "y", action: "delete", bold: !0 }),
                  e(KeyboardShortcutHint, { chord: "n", action: "keep", bold: !0 }),
                  e(KeyboardShortcutHint, {
                    chord: "escape",
                    action: "cancel",
                    bold: !0,
                    format: { keyCase: "lower" },
                  }),
                ],
              }),
        }),
      ],
    });
  if (ae === "plugin-details" && oe) {
    let E = at,
      X = isPluginEffectivelyEnabled(E, oe.plugin, nn),
      filtered = pluginErrors.filter((De) => matchesPluginSource(De, E, oe.plugin.name)),
      mapped = filtered
        .filter((De) => !isAutoupdateInfoError(De))
        .map((De) => ({ message: Io(De), guidance: getErrorGuidanceText(De) })),
      ye = [
        ...filtered
          .filter(isAutoupdateInfoError)
          .map((De) => ({ message: Io(De), guidance: getErrorGuidanceText(De) })),
        ...pe
          .filter((De) => matchesPluginSource(De, E, oe.plugin.name))
          .map((De) => ({ message: pluginWarningText(De), guidance: pluginWarningFixText(De) })),
      ],
      Re = getPluginDaysSinceUse(oe.plugin.repository),
      bt =
        mapped.length === 0 && ye.length === 0
          ? null
          : r(Box, {
              flexDirection: "column",
              marginBottom: 1,
              children: [
                e(PluginMessageList, { entries: mapped, color: "error", noun: "error" }),
                e(PluginMessageList, { entries: ye, color: "warning", noun: "note" }),
              ],
            }),
      $e = sanitizePluginManifestForDisplay(oe.plugin.manifest),
      tt =
        oe.marketplace === OFFICIAL_MARKETPLACE_NAME
          ? findScopedInstallation(getInstalledPlugins().plugins[E], oe.scope)?.gitCommitSha
          : void 0,
      st = op(tt),
      it = st ? displayableGitHeadName($e.version) : $e.version;
    return r(Box, {
      flexDirection: "column",
      children: [
        e(Box, {
          children: r(Text, {
            bold: !0,
            children: [
              getPluginDisplayName(oe.plugin),
              " @",
              " ",
              i3(E) ? CLAUDE_AI_SYNC_LABEL : stripInvisibleKeepEmoji(displayMarketplaceName(oe.marketplace)),
            ],
          }),
        }),
        r(Box, {
          children: [
            e(Text, { dimColor: !0, children: "Scope: " }),
            e(Text, { children: oe.scope || "user" }),
          ],
        }),
        it &&
          r(Box, {
            children: [
              e(Text, { dimColor: !0, children: "Version: " }),
              r(Text, { children: [it, st ? ` \xB7 installed at commit ${st}` : ""] }),
            ],
          }),
        !it && st
          ? r(Box, {
              children: [
                e(Text, { dimColor: !0, children: "Installed at commit: " }),
                e(Text, { children: st }),
              ],
            })
          : null,
        $e.description && e(Box, { marginBottom: 1, children: e(Text, { children: $e.description }) }),
        $e.author &&
          r(Box, {
            children: [
              e(Text, { dimColor: !0, children: "Author: " }),
              e(Text, { children: $e.author.name }),
            ],
          }),
        r(Box, {
          marginBottom: 1,
          children: [
            e(Text, { dimColor: !0, children: "Status: " }),
            e(Text, { color: X ? "success" : "warning", children: X ? "Enabled" : "Disabled" }),
            isRequiredPlugin(E, oe.plugin.installationPreference) &&
              e(Text, { dimColor: !0, children: " \xB7 Required by your org" }),
            oe.pendingUpdate && e(Text, { color: "suggestion", children: " \xB7 Marked for update" }),
            Re !== null &&
              r(Text, {
                dimColor: !0,
                children: [
                  " ",
                  "\xB7 Last used:",
                  " ",
                  Re === 0 ? "today" : `${Re} ${plural(Re, "day")} ago`,
                ],
              }),
          ],
        }),
        at &&
          e(
            PluginHeadersHelperWarning,
            { pluginId: at, verb: "Updating", onShown: hasAutoNavigated.record },
            an,
          ),
        e(PluginInstalledComponents, { plugin: oe.plugin, marketplace: oe.marketplace }),
        bt,
        e(Box, {
          marginTop: 1,
          flexDirection: "column",
          children: e(PluginActionSelect, {
            options: Bc,
            onSelect: (De) => Bc.find((cn) => cn.value === De)?.action(),
            selectionDisabled: wt,
            defaultFocusValue: $c,
            onFocus: Ac,
          }),
        }),
        wt && e(Box, { marginTop: 1, children: e(Text, { children: "Processing\u2026" }) }),
        Ve && e(Box, { marginTop: 1, children: e(ErrorText, { error: stripInvisibleKeepNewlines(Ve) }) }),
        e(Box, {
          marginTop: 1,
          children: e(Text, {
            dimColor: !0,
            italic: !0,
            children: r(Byline, {
              children: [
                e(ConfigurableShortcutHint, {
                  action: "select:previous",
                  context: "Select",
                  fallback: "\u2191",
                  description: "navigate",
                }),
                e(ConfigurableShortcutHint, {
                  action: "select:accept",
                  context: "Select",
                  fallback: "Enter",
                  description: "select",
                }),
                e(ConfigurableShortcutHint, {
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
  if (typeof ae === "object" && ae.type === "failed-plugin-details") {
    let failedPlugin_0 = ae.plugin,
      X = failedPlugin_0.errors[0],
      ee = X ? Io(X) : "Failed to load";
    return r(Box, {
      flexDirection: "column",
      children: [
        r(Text, {
          children: [
            e(Text, { bold: !0, children: stripInvisibleKeepEmoji(failedPlugin_0.name) }),
            r(Text, {
              dimColor: !0,
              children: [
                " ",
                "@",
                " ",
                stripInvisibleKeepEmoji(displayMarketplaceName(failedPlugin_0.marketplace)),
              ],
            }),
            r(Text, { dimColor: !0, children: [" (", failedPlugin_0.scope, ")"] }),
          ],
        }),
        e(Text, { color: "error", children: ee }),
        failedPlugin_0.scope === "managed"
          ? e(Box, {
              marginTop: 1,
              children: e(Text, {
                dimColor: !0,
                children: "Managed by your organization \u2014 contact your admin",
              }),
            })
          : isOfficialMarketplace(failedPlugin_0.marketplace)
            ? null
            : r(TwoColumnRow, {
                active: !0,
                marginTop: 1,
                children: [
                  r(Text, { "aria-hidden": !0, color: "suggestion", children: [re.pointer, " "] }),
                  e(Text, { bold: !0, children: "Remove" }),
                ],
              }),
        wt && e(Text, { children: "Processing\u2026" }),
        e(ErrorText, { error: Ve && stripInvisibleKeepNewlines(Ve) }),
        isOfficialMarketplace(failedPlugin_0.marketplace) &&
          e(Box, {
            marginTop: 1,
            children: e(Text, { dimColor: !0, children: formatCopyNotLoaded(failedPlugin_0.marketplace) }),
          }),
        e(Box, {
          marginTop: 1,
          children: e(Text, {
            dimColor: !0,
            italic: !0,
            children: r(Byline, {
              children: [
                failedPlugin_0.scope !== "managed" &&
                  !isOfficialMarketplace(failedPlugin_0.marketplace) &&
                  e(ConfigurableShortcutHint, {
                    action: "select:accept",
                    context: "Select",
                    fallback: "Enter",
                    description: "remove",
                  }),
                e(ConfigurableShortcutHint, {
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
  if (typeof ae === "object" && ae.type === "skill-detail") {
    let skill = ae.skill,
      X = [skill.override, ...Oy.filter((ge) => ge !== skill.override)],
      ee = async (ge) => {
        if (ge === skill.override) return;
        let { error: error } = await updateSettingsForSource(
          "localSettings",
          { skillOverrides: { [skill.cmdName]: diffSkillOverrideFromSettings(skill, ge) } },
          void 0,
          storageV5,
        );
        if (error) {
          ke(error.message);
          return;
        }
        (rn((Re) => new Set(Re).add(skill.id)),
          Ut((Re) => Re + 1),
          Se({ type: "skill-detail", skill: { ...skill, override: ge } }));
      };
    return r(Box, {
      flexDirection: "column",
      gap: 1,
      children: [
        e(Text, { bold: !0, children: skill.name }),
        skill.description && e(Text, { dimColor: !0, children: skill.description }),
        skill.whenToUse && r(Text, { dimColor: !0, children: ["When to use: ", skill.whenToUse] }),
        r(Text, {
          dimColor: !0,
          children: ["Source: ", skill.source, " \xB7 ~", skill.tokenEstimate, " tokens"],
        }),
        r(Text, {
          dimColor: !0,
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
          r(Text, { dimColor: !0, children: ["Allowed tools: ", Qy(skill.allowedTools)] }),
        skill.skillRoot && r(Text, { dimColor: !0, children: ["Path: ", skill.skillRoot] }),
        skill.lockSource === "policy" || skill.lockSource === "flag"
          ? r(Text, {
              dimColor: !0,
              children: ["State: ", skill.override, " (locked by ", skill.lockSource, " settings)"],
            })
          : skill.lockSource === "reserved-name"
            ? r(Text, {
                dimColor: !0,
                children: [
                  "State: ",
                  skill.override,
                  " (can't be changed here \u2014 settings can't store an entry named ",
                  skill.cmdName,
                  "; rename the skill's folder or command file to configure it)",
                ],
              })
            : r(Box, {
                flexDirection: "column",
                children: [
                  r(Text, {
                    children: [
                      "State:",
                      skill.lockSource === "author" &&
                        r(Text, {
                          dimColor: !0,
                          children: [" ", "(on/name-only locked by frontmatter disable-model-invocation)"],
                        }),
                    ],
                  }),
                  e(
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
                        return e(
                          OrderedListWithItem.Item,
                          {
                            label: ge,
                            icon:
                              ge === skill.override
                                ? e(StatusIcon, { status: "success", "aria-label": "current:" })
                                : e(StatusIcon, { status: "pending", "aria-label": "" }),
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
        r(Byline, {
          children: [
            e(KeyboardShortcutHint, { chord: "Enter", action: "set state" }),
            e(Text, { dimColor: !0, children: " \xB7 " }),
            e(KeyboardShortcutHint, { chord: "Esc", action: "go back" }),
          ],
        }),
      ],
    });
  }
  if (typeof ae === "object" && ae.type === "mcp-detail") {
    let client_3 = ae.client,
      serverToolsCount = filterToolsByServer(mcpTools, client_3.name).length,
      handleMcpViewTools = () => {
        Se({ type: "mcp-tools", client: client_3 });
      },
      handleMcpCancel = () => {
        Se("plugin-list");
      },
      handleMcpComplete = (result_4) => {
        if (result_4) setResult(result_4);
        Se("plugin-list");
      },
      scope_5 = client_3.config.scope,
      bt = client_3.config.type ?? "stdio",
      $e = Xo ?? describeMcpServerOrigin(client_3.name, client_3.config);
    if (bt === "stdio") {
      let tt = {
        name: client_3.name,
        client: client_3,
        scope: scope_5,
        displayEndpoint: $e,
        transport: "stdio",
        config: client_3.config,
      };
      return e(MCPStdioServerMenu, {
        server: tt,
        serverToolsCount: serverToolsCount,
        onViewTools: handleMcpViewTools,
        onCancel: handleMcpCancel,
        onComplete: handleMcpComplete,
        borderless: !0,
      });
    } else if (bt === "sse") {
      let tt = {
        name: client_3.name,
        client: client_3,
        scope: scope_5,
        displayEndpoint: $e,
        transport: "sse",
        isAuthenticated: void 0,
        config: client_3.config,
      };
      return e(RemoteServerMenuLoader, {
        server: tt,
        serverToolsCount: serverToolsCount,
        onViewTools: handleMcpViewTools,
        onCancel: handleMcpCancel,
        onComplete: handleMcpComplete,
        borderless: !0,
      });
    } else if (bt === "http") {
      let tt = {
        name: client_3.name,
        client: client_3,
        scope: scope_5,
        displayEndpoint: $e,
        transport: "http",
        isAuthenticated: void 0,
        config: client_3.config,
      };
      return e(RemoteServerMenuLoader, {
        server: tt,
        serverToolsCount: serverToolsCount,
        onViewTools: handleMcpViewTools,
        onCancel: handleMcpCancel,
        onComplete: handleMcpComplete,
        borderless: !0,
      });
    } else if (bt === "claudeai-proxy") {
      let tt = {
        name: client_3.name,
        client: client_3,
        scope: scope_5,
        displayEndpoint: $e,
        transport: "claudeai-proxy",
        isAuthenticated: void 0,
        config: client_3.config,
      };
      return e(RemoteServerMenuLoader, {
        server: tt,
        serverToolsCount: serverToolsCount,
        onViewTools: handleMcpViewTools,
        onCancel: handleMcpCancel,
        onComplete: handleMcpComplete,
        borderless: !0,
      });
    }
    return r(Box, {
      flexDirection: "column",
      paddingX: 1,
      children: [
        r(Text, {
          color: "warning",
          children: ["No details view for ", client_3.name, " (transport: ", bt, ")."],
        }),
        e(Byline, {
          children: e(ConfigurableShortcutHint, {
            action: "confirm:no",
            context: "Settings",
            fallback: "Esc",
            description: "go back",
          }),
        }),
      ],
    });
  }
  if (typeof ae === "object" && ae.type === "mcp-tools") {
    let client_4 = ae.client,
      scope_6 = client_4.config.scope,
      ee = client_4.config.type ?? "stdio",
      ge = Xo ?? describeMcpServerOrigin(client_4.name, client_4.config),
      ye;
    if (ee === "stdio")
      ye = {
        name: client_4.name,
        client: client_4,
        scope: scope_6,
        displayEndpoint: ge,
        transport: "stdio",
        config: client_4.config,
      };
    else if (ee === "sse")
      ye = {
        name: client_4.name,
        client: client_4,
        scope: scope_6,
        displayEndpoint: ge,
        transport: "sse",
        isAuthenticated: void 0,
        config: client_4.config,
      };
    else if (ee === "http")
      ye = {
        name: client_4.name,
        client: client_4,
        scope: scope_6,
        displayEndpoint: ge,
        transport: "http",
        isAuthenticated: void 0,
        config: client_4.config,
      };
    else
      ye = {
        name: client_4.name,
        client: client_4,
        scope: scope_6,
        displayEndpoint: ge,
        transport: "claudeai-proxy",
        isAuthenticated: void 0,
        config: client_4.config,
      };
    return e(MCPToolListView, {
      server: ye,
      onSelectTool: (tool) => {
        Se({ type: "mcp-tool-detail", client: client_4, tool: tool });
      },
      onBack: () => Se({ type: "mcp-detail", client: client_4 }),
    });
  }
  if (typeof ae === "object" && ae.type === "mcp-tool-detail") {
    let { client: client_5, tool: tool_0 } = ae,
      scope_7 = client_5.config.scope,
      ge = client_5.config.type ?? "stdio",
      ye = Xo ?? describeMcpServerOrigin(client_5.name, client_5.config),
      Re;
    if (ge === "stdio")
      Re = {
        name: client_5.name,
        client: client_5,
        scope: scope_7,
        displayEndpoint: ye,
        transport: "stdio",
        config: client_5.config,
      };
    else if (ge === "sse")
      Re = {
        name: client_5.name,
        client: client_5,
        scope: scope_7,
        displayEndpoint: ye,
        transport: "sse",
        isAuthenticated: void 0,
        config: client_5.config,
      };
    else if (ge === "http")
      Re = {
        name: client_5.name,
        client: client_5,
        scope: scope_7,
        displayEndpoint: ye,
        transport: "http",
        isAuthenticated: void 0,
        config: client_5.config,
      };
    else
      Re = {
        name: client_5.name,
        client: client_5,
        scope: scope_7,
        displayEndpoint: ye,
        transport: "claudeai-proxy",
        isAuthenticated: void 0,
        config: client_5.config,
      };
    return e(MCPToolDetailView, {
      tool: tool_0,
      server: Re,
      onBack: () => Se({ type: "mcp-tools", client: client_5 }),
    });
  }
  let visibleItems = pagination.getVisibleItems(Ft);
  return r(Box, {
    flexDirection: "column",
    width: "100%",
    tabIndex: 0,
    autoFocus: !0,
    onKeyDown: Wm,
    onPaste: finish,
    children: [
      e(Box, {
        marginBottom: 1,
        flexDirection: "column",
        children: e(SearchBox, {
          query: searchQuery,
          isFocused: ne,
          isTerminalFocused: Oe,
          cursorOffset: searchCursorOffset,
          onCursorOffsetChange: setCursorOffset,
          onFocus: () => he(!0),
        }),
      }),
      isSafeMode() &&
        e(Box, {
          marginBottom: 1,
          paddingLeft: 2,
          children: r(Text, {
            color: "warning",
            children: [
              "Safe mode: installed plugins are disabled this session \u2014 changes to them save but won't load until safe mode is off; built-in plugins are unaffected. ",
              capitalize(getSafeModeExitHint()),
              " to re-enable.",
            ],
          }),
        }),
      ht &&
        e(Box, {
          marginBottom: 1,
          paddingLeft: 2,
          children: e(Text, { color: "success", children: stripInvisibleKeepNewlines(ht) }),
        }),
      Ft.length === 0 &&
        searchQuery &&
        e(Box, {
          marginBottom: 1,
          children: r(HintText, { children: ['No items match "', searchQuery, '"'] }),
        }),
      r(Box, {
        flexDirection: "column",
        onWheel: pagination.onWheel,
        children: [
          pagination.scrollPosition.canScrollUp &&
            e(Box, { children: r(Text, { dimColor: !0, children: [" ", re.arrowUp, " more above"] }) }),
          e(SelectRow, {
            bar: pagination.bar,
            children: visibleItems.map((item_10, visibleIndex) => {
              let actualIndex = pagination.toActualIndex(visibleIndex),
                ge = actualIndex === _n && !ne;
              switch (item_10.kind) {
                case "spacer":
                  return e(Box, { height: 1 }, `spacer:${actualIndex}`);
                case "section-header":
                  return e(
                    Box,
                    {
                      paddingLeft: 2,
                      children: r(Text, {
                        wrap: "truncate-end",
                        children: [
                          e(Text, {
                            dimColor: item_10.section !== "attention",
                            color: item_10.section === "attention" ? "warning" : void 0,
                            bold: !0,
                            children:
                              item_10.section === "attention"
                                ? "Needs attention"
                                : item_10.section === "disused"
                                  ? "Not used recently"
                                  : "Favorites",
                          }),
                          item_10.section === "attention" &&
                            ao > 0 &&
                            r(Text, {
                              color: "warning",
                              children: [" ", "\xB7 ", ao, " to sign in \xB7", " ", e(AuthShortcutHint, {})],
                            }),
                        ],
                      }),
                    },
                    `section:${item_10.section}`,
                  );
                case "scope-header":
                  return e(
                    Box,
                    {
                      paddingLeft: 2,
                      children: e(Text, {
                        dimColor: !0,
                        bold: !0,
                        children: formatPluginScopeLabel(item_10.scope),
                      }),
                    },
                    `scope:${actualIndex}`,
                  );
                case "disabled-header":
                  return e(
                    TwoColumnRow,
                    {
                      active: ge,
                      paddingLeft: 2,
                      children: r(Text, {
                        color: ge ? "suggestion" : void 0,
                        children: [
                          e(Text, { "aria-hidden": !0, children: ge ? `${re.pointer} ` : "  " }),
                          Pt ? re.arrowDown : re.arrowRight,
                          " ",
                          "Show",
                          item_10.disabledCount > 0 &&
                            r(Fragment, {
                              children: [
                                " ",
                                "disabled ",
                                r(Text, { dimColor: !0, children: ["(", item_10.disabledCount, ")"] }),
                              ],
                            }),
                          item_10.disabledCount > 0 && item_10.unusedConnectorCount > 0 && " \xB7",
                          item_10.unusedConnectorCount > 0 &&
                            r(Fragment, {
                              children: [
                                " ",
                                "unused claude.ai connectors",
                                " ",
                                r(Text, { dimColor: !0, children: ["(", item_10.unusedConnectorCount, ")"] }),
                              ],
                            }),
                        ],
                      }),
                    },
                    "section:disabled",
                  );
                case "item":
                  return e(
                    InstalledItemRow,
                    {
                      item: item_10.item,
                      isSelected: ge,
                      health: item_10.item.type === "plugin" ? me?.get(item_10.item.name) : void 0,
                      nameWidth: po,
                      statusHoisted: ao > 0 && item_10.section === "attention",
                    },
                    `${item_10.section}:${item_10.item.id}`,
                  );
              }
            }),
          }),
          pagination.scrollPosition.canScrollDown &&
            e(Box, { children: r(Text, { dimColor: !0, children: [" ", re.arrowDown, " more below"] }) }),
        ],
      }),
      e(Box, {
        marginTop: 1,
        marginLeft: 1,
        children: e(Text, {
          dimColor: !0,
          italic: !0,
          children: r(Byline, {
            children: [
              e(Text, { children: "Type to search" }),
              e(ConfigurableShortcutHint, {
                action: "plugin:toggle",
                context: "Plugin",
                fallback: "Space",
                description: "toggle",
              }),
              e(ConfigurableShortcutHint, {
                action: "plugin:favorite",
                context: "Plugin",
                fallback: "f",
                description: "favorite",
              }),
              e(ConfigurableShortcutHint, {
                action: "select:accept",
                context: "Select",
                fallback: "Enter",
                description: "view",
              }),
              e(ConfigurableShortcutHint, {
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
        e(Box, {
          marginTop: 1,
          marginLeft: 1,
          children: e(ErrorText, { error: stripInvisibleKeepNewlines(Ve) }),
        }),
      mn.size > 0 &&
        e(Box, {
          marginLeft: 1,
          children: e(Text, {
            dimColor: !0,
            italic: !0,
            children: changesApplyOnClose
              ? "Changes apply when you close this menu"
              : "Run /reload-plugins to apply changes",
          }),
        }),
    ],
  });
}
//@ chunk-vrb44rx7.js:204832-204871 sole-consumer
function Qy(i) {
  return replaceControlChars(i.join(", "));
}
//@ chunk-k9mgeeff.js:4312-4636 fingerprint = getBaseFileNames (0.759)
async function getBaseFileNames(dirPath) {
  let e = [],
    r = new Set();
  for (let s of dirPath) {
    if (!s) continue;
    let m;
    try {
      m = await fsPromisesModule.readdir(s, { withFileTypes: !0 });
    } catch (error) {
      logComponentReadError(s, error);
      continue;
    }
    for (let o of m)
      if (o.isFile() && o.name.endsWith(".md")) {
        let joined = pathModule.join(s, o.name),
          resolved = pathModule.resolve(joined);
        if (r.has(resolved)) continue;
        (r.add(resolved), e.push({ name: pathModule.basename(o.name, ".md"), path: joined }));
      }
  }
  return e;
}
//@ chunk-k9mgeeff.js:4636-5291 fingerprint = getSkillDirNames (0.844)
async function getSkillDirNames(n, e) {
  let skillNames = [],
    s = new Set(),
    m = (o, c) => {
      let resolved = pathModule.resolve(c);
      if (s.has(resolved)) return;
      (s.add(resolved), skillNames.push({ name: o, path: c }));
    };
  for (let entry of n) {
    if (!entry) continue;
    try {
      let joined = pathModule.join(entry, "SKILL.md");
      if ((await fsPromisesModule.stat(joined)).isFile()) {
        let y = "";
        try {
          let i = await readFileHead(joined, v),
            { frontmatter: frontmatter } = parseFrontmatter(i, joined),
            g = typeof frontmatter.name === "string" ? frontmatter.name.trim() : "";
          y = g.startsWith(`${e}:`) ? g.slice(e.length + 1) : g;
        } catch {}
        m(y || pathModule.basename(entry), entry);
        continue;
      }
    } catch {}
    let c;
    try {
      c = await fsPromisesModule.readdir(entry, { withFileTypes: !0 });
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
  return join_3(getClaudeConfigDir(), "local");
}

export {
  filterManagedDisabledPlugins,
  usePluginWarnings,
  ca,
  ua,
  ManagePlugins,
  getBaseFileNames,
  getSkillDirNames,
};
