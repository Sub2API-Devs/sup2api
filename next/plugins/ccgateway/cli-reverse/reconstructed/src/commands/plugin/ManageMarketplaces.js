/**
 * commands/plugin/ManageMarketplaces.tsx
 *
 * 管理已添加的插件市场
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/commands/plugin/ManageMarketplaces.tsx
 * pieces: chunk-vrb44rx7.js (8)
 * attribution: placement 4, fingerprint 2, layout 2
 */
import { basename } from "path";
import {
  OFFICIAL_MARKETPLACE_DISPLAY,
  isOfficialMarketplaceSpelling,
  isOfficialMarketplaceName_2,
  removedMarketplaceMessage,
  blockedPluginsNotice,
  marketplaceEntryGoneText,
  formatPluginDirectoryBlockedMessage,
  officialMarketplaceBlockedText,
  OFFICIAL_MARKETPLACE_NAME,
  isPluginDirectorySource,
} from "../../utils/plugins/officialMarketplaceNames.js";
import { useTheme_2 } from "../../components/design-system/ThemeProvider.js";
import { useActivePlugins } from "../../state/AppState.js";
import {
  useState,
  useRef,
  useEffect,
  useMemo,
  init_react_production,
} from "../../../vendor/react/cjs/react.production.js";
import { useClock } from "../../ink/components/ClockContext.js";
import {
  loadKnownMarketplacesWithDeclared,
  removeMarketplaceWithReservedSiblings,
  refreshMarketplaceDeduped,
  getPluginDirectoryState,
  setPluginDirectoryEnabled,
  setMarketplaceAutoUpdate,
  getDeclaredMarketplaces,
} from "../../utils/plugins/marketplaceManager.js";
import { loadAllPlugins } from "../../utils/plugins/pluginLoader.js";
import { getInstalledPlugins } from "../../utils/plugins/installedPluginsManager.js";
import {
  loadMarketplacesWithErrors,
  formatMarketplaceLoadingErrors,
  formatPluginId,
  getMarketplaceSourceDisplay,
} from "../../utils/plugins/marketplaceHelpers.js";
import {
  listClaudeAiMarketplaces,
  filterUnaddedClaudeAiMarketplaces,
  readClaudeAiMarketplaceRegistry,
  formatGitSourceSpec,
  addClaudeAiMarketplace,
  listedAsSuffix,
  formatMarketplaceScopeLabel,
  noCliNameLabel,
  formatClaudeAiMarketplaceLabel,
} from "../../utils/plugins/claudeAiMarketplaces.js";
import { count } from "../../utils/collections.js";
import { listReservedNameRefusals } from "../../utils/plugins/marketplaceSources.js";
import { isPluginDirectoryModeOn } from "../../utils/plugins/pluginGates.js";
import { quotedPrintable, printableMessage, printableName } from "../../utils/printableName.js";
import { logEvent } from "../../services/analytics/index.js";
import { marketplaceForTelemetry } from "../../utils/telemetry/pluginTelemetry.js";
import { isOfficialMarketplaceName_3, findPluginName } from "../../utils/plugins/pluginIdentifier.js";
import { refreshPluginCaches } from "../../utils/plugins/cacheUtils.js";
import {
  stripInvisibleKeepEmoji,
  stripInvisibleKeepNewlines,
} from "../../utils/settings/marketplaceSettingsAliases.js";
import { figures_default } from "../../../vendor/@inquirer/figures/dist/esm/index.js";
import { pluginDirectoryPolicyBlockHint } from "../../utils/plugins/marketplacePolicy.js";
import { updateSettingsForSourceWithTransform } from "../../utils/settings/settings.js";
import { CommandSourceError } from "../../utils/plugins/commandSource.js";
import { logForDebugging } from "../../utils/debug.js";
import { errorMessage } from "../../utils/errors.js";
import {
  updatePluginsInMarketplaces,
  notifyPluginsAutoUpdated,
} from "../../utils/plugins/pluginAutoupdate.js";
import { displayMarketplaceName, escapedDisplayText } from "../../utils/plugins/pluginDisplayMetadata.js";
import {
  formatMarketplaceUpdateSummary,
  marketplaceUpdateIcon,
} from "../../utils/plugins/marketplaceErrors.js";
import { isSafeCliArg, runCommandHint } from "../../utils/worktreeResumeHint.js";
import { plural } from "../../utils/stringUtils.js";
import {
  jsxProd_default_2,
  jsxProd_default,
  Fragment,
} from "../../../vendor/react/cjs/react-jsx-dev-runtime.react-server.production.js";
import { Text, Box } from "../../ink/components/Text.js";
import { shouldSkipPluginAutoupdate } from "../../utils/config.js";
import { logDirectoryToggle } from "../../utils/plugins/pluginDirectoryTelemetry.js";
import { useKeybinding } from "../../keybindings/useKeybinding.js";
import { MessageActionsKeybindings } from "../../components/messageActions.js";
import { lit } from "../../services/analytics/safeMetadata.js";
import { TwoColumnRow } from "../../components/CustomSelect/select.js";
import { Byline } from "../../components/design-system/Byline.js";
import { ConfigurableShortcutHint } from "../../components/ConfigurableShortcutHint.js";
import { FocusColumn } from "../../components/design-system/FocusColumn.js";
import { ErrorText } from "../../components/ErrorText.js";
import { BulletRow } from "../../components/design-system/BulletRow.js";
import { PluginActionSelect } from "./pluginDetailsHelpers.js";
import {
  AUTOUPDATE_SETTING_SOURCES_TEXT,
  getMarketplaceAutoUpdate,
} from "../../utils/plugins/marketplaceAutoUpdate.js";
import { useMemoCache } from "../../../vendor/react/compiler-runtime.js";
import { KeyboardShortcutHint } from "../../components/design-system/KeyboardShortcutHint.js";
import { commandSourceSession } from "../../utils/plugins/commandSourceErrors.js";
import { isMarketplaceAutoUpdate, ANTHROPIC_PLUGIN_DIRECTORY } from "../../utils/plugins/schemas.js";
import { deferInit } from "../../../runtime/deferred-init.js";

//@ chunk-vrb44rx7.js:103318-103453 placement
var BUILTIN_MARKETPLACE_OFF_NOTICE; // deferred: uses OFFICIAL_MARKETPLACE_DISPLAY (../../utils/plugins/officialMarketplaceNames.js) of its import cycle while loading; runs once the cycle is complete
deferInit("chunk-vrb44rx7.js:103318", () => {
  BUILTIN_MARKETPLACE_OFF_NOTICE = `${OFFICIAL_MARKETPLACE_DISPLAY} is off. Plugins you installed from it stay installed and keep updating. Turn it back on in /plugin \u2192 Marketplaces.`;
});
//@ chunk-vrb44rx7.js:103453-122462 fingerprint (2.1.88 match: ManageMarketplaces, 0.48)
function ManageMarketplaces({
  setViewState,
  error,
  setError,
  setResult,
  exitState,
  onManageComplete,
  targetMarketplace,
  action,
}) {
  let { storageV5, credentials } = useTheme_2();
  let activePlugins = useActivePlugins();
  let [marketplaceStates, setMarketplaceStates] = useState([]);
  let [marketplaces, setMarketplaces] = useState([]);
  let [sectionStates, setSectionStates] = useState({
    available: [],
    hosted: [],
    browseOnly: [],
  });
  let [prev, setPrev] = useState(null);
  let hasAttemptedAutoAction = useRef(null);
  let [loading, setLoading] = useState(true);
  let [selectedIndex, setSelectedIndex] = useState(0);
  let [busy, setBusy] = useState(false);
  let [processError, setProcessError] = useState(null);
  let [successMessage, setSuccessMessage] = useState(null);
  let [progressMessage, setProgressMessage] = useState(null);
  let [internalView, setInternalView] = useState("list");
  let [selectedMarketplace, setSelectedMarketplace] = useState(null);
  let [detailsMenuIndex, setDetailsMenuIndex] = useState("browse");
  let detailBusy = useRef(false);
  let clock = useClock();
  let pendingAction = useRef(undefined);
  let officialHintShown = useRef(true);
  let cancelledRef = useRef(false);
  useEffect(
    () => () => {
      officialHintShown.current = false;
      pendingAction.current?.();
    },
    [],
  );
  useEffect(() => {
    async function loadMarketplaces() {
      try {
        let knownMarketplaces = await loadKnownMarketplacesWithDeclared(storageV5);
        let { enabled, disabled } = await loadAllPlugins(storageV5, credentials);
        let allPlugins = [...enabled, ...disabled];
        setMarketplaces(Object.keys(getInstalledPlugins().plugins));
        let { marketplaces, failures } = await loadMarketplacesWithErrors(knownMarketplaces, storageV5);
        let claudeAiMarketplaces = await listClaudeAiMarketplaces(credentials).catch(() => null);
        hasAttemptedAutoAction.current = claudeAiMarketplaces;
        setSectionStates({
          ...filterUnaddedClaudeAiMarketplaces(claudeAiMarketplaces, knownMarketplaces),
          browseOnly: claudeAiMarketplaces?.browseOnly ?? [],
        });
        let rows = await withOfficialMarketplaceRow(
          buildMarketplaceRows(marketplaces, failures, allPlugins, await readClaudeAiMarketplaceRegistry()),
          knownMarketplaces,
        );
        setMarketplaceStates(rows);
        let successCount = count(marketplaces, (m) => m.data !== null);
        let errorResult = formatMarketplaceLoadingErrors(failures, successCount);
        if (errorResult)
          if (
            errorResult.type === "warning" ||
            (targetMarketplace !== undefined && action !== "remove" && action !== "update")
          )
            setProcessError(errorResult.message);
          else throw Error(errorResult.message);
        if (targetMarketplace && !detailBusy.current && !error) {
          detailBusy.current = true;
          let blockedAction =
            action === "remove" && isOfficialMarketplaceSpelling(targetMarketplace)
              ? listReservedNameRefusals(knownMarketplaces).filter(({ name }) =>
                  isOfficialMarketplaceName_2(targetMarketplace)
                    ? isOfficialMarketplaceName_2(name)
                    : name === targetMarketplace,
                )
              : [];
          let targetIndex = rows.findIndex(
            (marketplace) =>
              marketplace.name === targetMarketplace ||
              (marketplace.builtIn !== undefined && isOfficialMarketplaceName_2(targetMarketplace)),
          );
          if (blockedAction.length > 0) {
            let removed = await removeMarketplaceWithReservedSiblings(
              targetMarketplace,
              undefined,
              storageV5,
              credentials,
              {
                onlyIgnoredNameEntries: true,
              },
            );
            let failedNames = [];
            let anyFailed = false;
            if (removed.kind === "ignored-plugin-directory-name-entry-removed") {
              anyFailed = removed.removedNames.length > 0;
              for (let removedName of removed.removedNames)
                failedNames.push(removedMarketplaceMessage(removedName, isPluginDirectoryModeOn()));
              let blockedNotice = blockedPluginsNotice(removed.disabledPluginIds, removed.disabledReason);
              if (blockedNotice !== null) failedNames.push(blockedNotice);
              activePlugins.removeErrorsOf(removed.removedPluginIds);
              if (!anyFailed) failedNames.push(marketplaceEntryGoneText(targetMarketplace));
            } else if (removed.kind === "removed") {
              anyFailed = true;
              failedNames.push(`Removed marketplace "${quotedPrintable(targetMarketplace)}"`);
              activePlugins.removeErrorsOf(removed.removedPluginIds);
            }
            if (anyFailed)
              logEvent("tengu_marketplace_removed", {
                marketplace_name: marketplaceForTelemetry(targetMarketplace),
                _PROTO_marketplace_name: targetMarketplace,
                is_official_marketplace: isOfficialMarketplaceName_3(targetMarketplace),
              });
            refreshPluginCaches(storageV5, credentials);
            setResult(stripInvisibleKeepEmoji(`${figures_default.tick} ${failedNames.join(" ")}`));
            await onManageComplete();
            setViewState({
              type: "menu",
            });
          } else if (targetIndex >= 0) {
            let targetRow = rows[targetIndex];
            if (targetRow?.builtIn === "blocked" && action !== undefined && action !== "confirm-remove") {
              setSelectedIndex(targetIndex + 1);
              {
                let policyHint = pluginDirectoryPolicyBlockHint();
                if (action === "remove") setProcessError(formatPluginDirectoryBlockedMessage(policyHint));
                else setProcessError(officialMarketplaceBlockedText(policyHint));
              }
            } else if (targetRow?.builtIn === "blocked") {
              let officialLabel = `@${OFFICIAL_MARKETPLACE_NAME}`;
              let found = Object.keys(getInstalledPlugins().plugins).find((key) =>
                key.endsWith(officialLabel),
              );
              if (found) {
                setViewState({
                  type: "manage-plugins",
                  targetPlugin: found.slice(0, -officialLabel.length),
                  targetMarketplace: OFFICIAL_MARKETPLACE_NAME,
                });
                return;
              }
              setSelectedIndex(targetIndex + 1);
            } else if (action === "confirm-remove" && targetRow) {
              setSelectedIndex(targetIndex + 1);
              setSelectedMarketplace(targetRow);
              pendingAction.current?.();
              setInternalView(targetRow.builtIn ? "details" : "confirm-remove");
            } else if (action === "remove" && targetRow?.builtIn) {
              setSelectedIndex(targetIndex + 1);
              buildDetailsMenuOptions(false);
            } else if (action) {
              setSelectedIndex(targetIndex + 1);
              let states = rows.map((state, idx) =>
                idx === targetIndex
                  ? {
                      ...state,
                      pendingUpdate: action === "update",
                      pendingRemove: action === "remove",
                    }
                  : state,
              );
              setMarketplaceStates(states);
              applyChanges(states);
            } else if (targetRow) {
              setSelectedIndex(targetIndex + 1);
              setSelectedMarketplace(targetRow);
              pendingAction.current?.();
              setInternalView("details");
            }
          } else setError(`Marketplace not found: ${targetMarketplace}`);
        }
      } catch (err) {
        let errorText = printableMessage(err);
        setError(errorText);
        setProcessError(errorText);
      } finally {
        setLoading(false);
      }
    }
    loadMarketplaces();
  }, [targetMarketplace, action, error]);
  let hasPendingChanges = () => marketplaceStates.some((state) => state.pendingUpdate || state.pendingRemove);
  let getPendingCounts = () => {
    let updateCount = count(marketplaceStates, (state) => state.pendingUpdate);
    let removeCount = count(marketplaceStates, (state) => state.pendingRemove);
    return {
      updateCount,
      removeCount,
    };
  };
  let applyChanges = async (states) => {
    if (cancelledRef.current) return;
    cancelledRef.current = true;
    let statesToProcess = states || marketplaceStates;
    let wasInDetailsView = internalView === "details";
    setBusy(true);
    setProcessError(null);
    setSuccessMessage(null);
    setProgressMessage(null);
    try {
      let updatedCount = 0;
      let removedCount = 0;
      let lastError = null;
      let policyRefused = [];
      let failedPlugins = [];
      let refreshedMarketplaces = new Set();
      for (let state of statesToProcess) {
        if (state.pendingRemove) {
          if (state.installedPlugins.length > 0)
            await updateSettingsForSourceWithTransform(
              "userSettings",
              (sectionState) => {
                let newEnabledPlugins = {
                  ...sectionState?.enabledPlugins,
                };
                for (let plugin of state.installedPlugins) {
                  let pluginId = formatPluginId(plugin.name, state.name);
                  newEnabledPlugins[pluginId] = false;
                }
                return {
                  enabledPlugins: newEnabledPlugins,
                };
              },
              undefined,
              storageV5,
            );
          let removedState = await removeMarketplaceWithReservedSiblings(
            state.name,
            undefined,
            storageV5,
            credentials,
          );
          removedCount++;
          if (removedState.kind !== "plugin-directory-built-in")
            activePlugins.removeErrorsOf(removedState.removedPluginIds);
          if (removedState.kind === "ignored-plugin-directory-name-entry-removed") {
            let removedNotice = blockedPluginsNotice(
              removedState.disabledPluginIds,
              removedState.disabledReason,
            );
            lastError = removedNotice === null ? null : stripInvisibleKeepEmoji(removedNotice);
          }
          logEvent("tengu_marketplace_removed", {
            marketplace_name: marketplaceForTelemetry(state.name),
            _PROTO_marketplace_name: state.name,
            is_official_marketplace: isOfficialMarketplaceName_3(state.name),
            plugins_uninstalled: state.installedPlugins.length,
          });
          continue;
        }
        if (state.pendingUpdate) {
          try {
            await refreshMarketplaceDeduped(state.name, storageV5, (message) => {
              setProgressMessage(message);
            });
          } catch (error) {
            if (error instanceof CommandSourceError) {
              policyRefused.push(state.name);
              logForDebugging(
                `Marketplace ${state.name} not updated (managed policy): ${errorMessage(error)}`,
              );
              continue;
            }
            failedPlugins.push(state.name);
            logForDebugging(`Marketplace ${state.name} could not be refreshed: ${errorMessage(error)}`, {
              level: "warn",
            });
            continue;
          }
          updatedCount++;
          refreshedMarketplaces.add(state.name.toLowerCase());
          logEvent("tengu_marketplace_updated", {
            marketplace_name: marketplaceForTelemetry(state.name),
            _PROTO_marketplace_name: state.name,
            is_official_marketplace: isOfficialMarketplaceName_3(state.name),
          });
        }
      }
      let updatedPluginCount = 0;
      let deferredPluginCount = 0;
      let policyBlockedPluginCount = 0;
      let blockedByPinner = 0;
      let failedCount = 0;
      let failedNames = [];
      let failedStates = [];
      if (refreshedMarketplaces.size > 0) {
        let { updated, blocked, updateFailedCount, commandSourceSkipped } = await updatePluginsInMarketplaces(
          refreshedMarketplaces,
          new Set(),
          {
            skipCommandSources: true,
          },
          storageV5,
        );
        updatedPluginCount = updated.length;
        failedStates = commandSourceSkipped;
        deferredPluginCount = count(blocked, (entry) => entry.type === "autoupdate-deferred-entry-helper");
        policyBlockedPluginCount = count(blocked, (entry) => entry.type === "autoupdate-disabled-by-policy");
        blockedByPinner = count(blocked, (entry) => entry.type === "autoupdate-blocked-by-pinner");
        failedCount = updateFailedCount;
        let filtered = blocked.filter(
          (entry) =>
            entry.type !== "autoupdate-deferred-entry-helper" &&
            entry.type !== "autoupdate-disabled-by-policy" &&
            entry.type !== "autoupdate-blocked-by-pinner",
        );
        if (filtered.length > 0 || updated.length > 0)
          notifyPluginsAutoUpdated(updated, filtered, [], {
            announce: false,
          });
        failedNames = filtered.flatMap((entry) =>
          "plugin" in entry && typeof entry.plugin === "string" ? [entry.plugin] : [],
        );
      }
      refreshPluginCaches(storageV5, credentials);
      await onManageComplete();
      if (!officialHintShown.current) return;
      let updatedPluginIds = await loadKnownMarketplacesWithDeclared(storageV5);
      let { enabled, disabled } = await loadAllPlugins(storageV5, credentials);
      if (!officialHintShown.current) return;
      let allPlugins = [...enabled, ...disabled];
      let { marketplaces, failures } = await loadMarketplacesWithErrors(updatedPluginIds, storageV5);
      if (!officialHintShown.current) return;
      setSectionStates((plugin) => ({
        ...plugin,
        ...filterUnaddedClaudeAiMarketplaces(hasAttemptedAutoAction.current, updatedPluginIds),
      }));
      let refreshedRows = await withOfficialMarketplaceRow(
        buildMarketplaceRows(marketplaces, failures, allPlugins, await readClaudeAiMarketplaceRegistry()),
        updatedPluginIds,
      );
      setMarketplaceStates(refreshedRows);
      setSelectedIndex((plugin) => Math.min(plugin, refreshedRows.length));
      if (wasInDetailsView && selectedMarketplace) {
        let updatedMarketplace = refreshedRows.find((row) => row.name === selectedMarketplace.name);
        if (updatedMarketplace) setSelectedMarketplace(updatedMarketplace);
      }
      let refreshedFailedNames = [];
      let label = wasInDetailsView ? displayMarketplaceName : escapedDisplayText;
      if (
        updatedCount > 0 ||
        policyRefused.length > 0 ||
        failedPlugins.length > 0 ||
        blockedByPinner > 0 ||
        failedCount > 0
      )
        refreshedFailedNames.push(
          formatMarketplaceUpdateSummary({
            updatedCount,
            updatedPluginCount,
            deferredPluginCount,
            policyBlockedPluginCount,
            policyRefusedMarketplaces: policyRefused.map((name) => label(name)),
            failedMarketplaces: failedPlugins.map((name) => label(name)),
            pinnedPluginCount: blockedByPinner,
            failedPluginCount: failedCount,
            failedPluginNames: failedNames.map((name) => label(name)),
          }),
        );
      if (failedStates.length > 0) {
        let failedStateCount = failedStates.length;
        let hasSeveralFailed = failedStateCount > 1;
        let firstFailedName = failedStates.find(isSafeCliArg) ?? "";
        let successMsg = `${hasSeveralFailed ? "(and the others) " : ""}to review (add --scope for a project/local install)`;
        let fallback = `review and update ${hasSeveralFailed ? "each" : "it"} individually from the command line`;
        refreshedFailedNames.push(
          `${failedStateCount} command-sourced ${plural(failedStateCount, "plugin")} not updated here \u2014 ${runCommandHint(
            "plugin update",
            firstFailedName,
            {
              tail: successMsg,
              fallback,
            },
          )}`,
        );
      }
      if (removedCount > 0)
        refreshedFailedNames.push(`Removed ${removedCount} ${plural(removedCount, "marketplace")}`);
      if (refreshedFailedNames.length > 0) {
        let statusLine = `${
          marketplaceUpdateIcon({
            failedCount: failedPlugins.length + failedCount,
            updatedCount: updatedCount + removedCount,
            policyRefusedCount: policyRefused.length,
          }) ?? figures_default.warning
        } ${refreshedFailedNames.join(", ")}`;
        let statusWithPrefix = lastError === null ? statusLine : `${lastError} ${statusLine}`;
        if (wasInDetailsView) setSuccessMessage(statusWithPrefix);
        else {
          if (!officialHintShown.current) return;
          setResult(statusWithPrefix);
          pendingAction.current?.();
          pendingAction.current = clock.setTimeout(
            () =>
              setViewState({
                type: "menu",
              }),
            2000,
          );
        }
      } else if (!wasInDetailsView) {
        if (!officialHintShown.current) return;
        setViewState({
          type: "menu",
        });
      }
    } catch (err) {
      let errorMsg = printableMessage(err);
      if (!officialHintShown.current) return;
      setProcessError(errorMsg);
      setError(errorMsg);
    } finally {
      cancelledRef.current = false;
      if (officialHintShown.current) {
        setBusy(false);
        setProgressMessage(null);
      }
    }
  };
  let confirmRemove = async () => {
    if (!selectedMarketplace) return;
    let newStates = marketplaceStates.map((state) =>
      state.name === selectedMarketplace.name
        ? {
            ...state,
            pendingRemove: true,
          }
        : state,
    );
    setMarketplaceStates(newStates);
    await applyChanges(newStates);
  };
  let options = useMemo(() => {
    if (!selectedMarketplace) return [];
    if (selectedMarketplace.builtIn === "off")
      return [
        {
          label: "Turn on",
          value: "turn-on",
        },
      ];
    let options = [
      {
        label: `Browse plugins (${selectedMarketplace.pluginCount ?? 0})`,
        value: "browse",
      },
      {
        label: selectedMarketplace.lastUpdated
          ? jsxProd_default_2(Text, {
              children: [
                "Update marketplace",
                jsxProd_default(Text, {
                  dimColor: true,
                  children: ` (last updated ${new Date(selectedMarketplace.lastUpdated).toLocaleDateString()})`,
                }),
              ],
            })
          : "Update marketplace",
        value: "update",
      },
    ];
    if (selectedMarketplace.builtIn === "on") {
      options.push({
        label: jsxProd_default_2(Text, {
          children: [
            "Turn off",
            jsxProd_default(Text, {
              dimColor: true,
              children: " (plugins installed from it stay installed)",
            }),
          ],
        }),
        value: "turn-off",
      });
      return options;
    }
    if (!shouldSkipPluginAutoupdate())
      options.push({
        label: selectedMarketplace.autoUpdate ? "Disable auto-update" : "Enable auto-update",
        value: "toggle-auto-update",
      });
    options.push({
      label: "Remove marketplace",
      value: "remove",
    });
    return options;
  }, [selectedMarketplace]);
  let detailOpen = useRef(false);
  let buildDetailsMenuOptions = async (marketplace) => {
    if (detailOpen.current) return;
    detailOpen.current = true;
    try {
      let pluginDirectoryState = await getPluginDirectoryState();
      try {
        await setPluginDirectoryEnabled(marketplace);
      } catch (error) {
        if (pluginDirectoryState !== "unavailable")
          logDirectoryToggle({
            enabled: marketplace,
            surface: "ui",
            failure: pluginDirectoryState === "blocked" ? "blocked_by_organization" : "settings_write_failed",
          });
        throw error;
      }
      if ((pluginDirectoryState === "on") !== marketplace)
        logDirectoryToggle({
          enabled: marketplace,
          surface: "ui",
        });
      refreshPluginCaches(storageV5, credentials);
      setResult(
        marketplace
          ? `${OFFICIAL_MARKETPLACE_DISPLAY} is on. Its plugins are back in /plugin \u2192 Discover.`
          : BUILTIN_MARKETPLACE_OFF_NOTICE,
      );
      await onManageComplete();
      setViewState({
        type: "menu",
      });
    } catch (error) {
      setProcessError(printableName(errorMessage(error), 300));
    }
    detailOpen.current = false;
  };
  let handleToggleAutoUpdate = async (marketplace) => {
    let newAutoUpdate = !marketplace.autoUpdate;
    try {
      await setMarketplaceAutoUpdate(marketplace.name, newAutoUpdate, storageV5);
      setMarketplaceStates((prev) =>
        prev.map((state) =>
          state.name === marketplace.name
            ? {
                ...state,
                autoUpdate: newAutoUpdate,
              }
            : state,
        ),
      );
      setSelectedMarketplace((prev) =>
        prev
          ? {
              ...prev,
              autoUpdate: newAutoUpdate,
            }
          : prev,
      );
    } catch (err) {
      setProcessError(printableMessage(err));
    }
  };
  useKeybinding(
    "confirm:no",
    () => {
      pendingAction.current?.();
      setInternalView("list");
      setDetailsMenuIndex("browse");
    },
    {
      context: "Confirmation",
      isActive:
        !busy &&
        (internalView === "details" ||
          internalView === "confirm-remove" ||
          internalView === "confirm-add-claudeai"),
    },
  );
  useKeybinding(
    "confirm:no",
    () => {
      pendingAction.current?.();
      setMarketplaceStates((prev) =>
        prev.map((state) => ({
          ...state,
          pendingUpdate: false,
          pendingRemove: false,
        })),
      );
      setSelectedIndex(0);
    },
    {
      context: "Confirmation",
      isActive: !busy && internalView === "list" && hasPendingChanges(),
    },
  );
  useKeybinding(
    "confirm:no",
    () => {
      setViewState({
        type: "menu",
      });
    },
    {
      context: "Confirmation",
      isActive: !busy && internalView === "list" && !hasPendingChanges(),
    },
  );
  MessageActionsKeybindings(
    {
      "select:previous": () => setSelectedIndex((prev) => Math.max(0, prev - 1)),
      "select:next": () => {
        let totalItems =
          marketplaceStates.length + sectionStates.available.length + sectionStates.hosted.length + 1;
        setSelectedIndex((prev) => Math.min(totalItems - 1, prev + 1));
      },
      "select:accept": () => {
        pendingAction.current?.();
        let listIndex = selectedIndex - 1;
        let availableItem = sectionStates.available[listIndex - marketplaceStates.length];
        let detailsContent =
          sectionStates.hosted[listIndex - marketplaceStates.length - sectionStates.available.length];
        if (selectedIndex === 0)
          setViewState({
            type: "add-marketplace",
          });
        else if (hasPendingChanges()) applyChanges();
        else if (availableItem)
          setViewState({
            type: "add-marketplace",
            claudeAiListing: {
              name: availableItem.name,
              source: formatGitSourceSpec(availableItem.source),
            },
          });
        else if (detailsContent) {
          setPrev(detailsContent);
          setProcessError(null);
          setInternalView("confirm-add-claudeai");
        } else {
          let marketplace = marketplaceStates[listIndex];
          if (marketplace && marketplace.builtIn !== "blocked") {
            setSelectedMarketplace(marketplace);
            setInternalView("details");
            setDetailsMenuIndex(marketplace.builtIn === "off" ? "turn-on" : "browse");
          }
        }
      },
    },
    {
      context: "Select",
      isActive: !busy && internalView === "list",
    },
  );
  function handleConfirmInput(input) {
    if (input.ctrl || input.meta || busy) return;
    let marketplaceIndex = selectedIndex - 1;
    let builtIn = marketplaceStates[marketplaceIndex]?.builtIn;
    if (builtIn === "blocked") return;
    if (builtIn !== undefined && /^[udUD]$/.test(input.key)) {
      let state = marketplaceStates[marketplaceIndex];
      if (state && (builtIn === "off" || input.key === "d" || input.key === "D")) {
        input.preventDefault();
        pendingAction.current?.();
        setSelectedMarketplace(state);
        setInternalView("details");
        setDetailsMenuIndex(builtIn === "off" ? "turn-on" : "turn-off");
        return;
      }
    }
    if ((input.key === "u" || input.key === "U") && marketplaceIndex >= 0) {
      input.preventDefault();
      pendingAction.current?.();
      setMarketplaceStates((prev) =>
        prev.map((state, idx) =>
          idx === marketplaceIndex
            ? {
                ...state,
                pendingUpdate: !state.pendingUpdate,
                pendingRemove: state.pendingUpdate ? state.pendingRemove : false,
              }
            : state,
        ),
      );
    } else if ((input.key === "d" || input.key === "D") && marketplaceIndex >= 0) {
      let marketplace = marketplaceStates[marketplaceIndex];
      if (marketplace) {
        input.preventDefault();
        setSelectedMarketplace(marketplace);
        pendingAction.current?.();
        setInternalView("confirm-remove");
      }
    }
  }
  let onSelect = (prev) => {
    pendingAction.current?.();
    if (!selectedMarketplace) return;
    switch (prev) {
      case "browse":
        setViewState({
          type: "browse-marketplace",
          targetMarketplace: selectedMarketplace.name,
        });
        return;
      case "update": {
        let newStates = marketplaceStates.map((state) =>
          state.name === selectedMarketplace.name
            ? {
                ...state,
                pendingUpdate: true,
              }
            : state,
        );
        setMarketplaceStates(newStates);
        applyChanges(newStates);
        return;
      }
      case "toggle-auto-update":
        handleToggleAutoUpdate(selectedMarketplace);
        return;
      case "remove":
        setInternalView("confirm-remove");
        return;
      case "turn-on":
      case "turn-off":
        buildDetailsMenuOptions(prev === "turn-on");
    }
  };
  function handleKeyDown(event) {
    if (event.ctrl || event.meta || busy) return;
    if (event.key === "y" || event.key === "Y") {
      event.preventDefault();
      pendingAction.current?.();
      confirmRemove();
    } else if (event.key === "n" || event.key === "N") {
      event.preventDefault();
      pendingAction.current?.();
      setInternalView("list");
      setSelectedMarketplace(null);
    }
  }
  function handleMenuInput(input) {
    if (input.ctrl || input.meta || busy) return;
    if ((input.key === "y" || input.key === "Y") && prev) {
      input.preventDefault();
      addMarketplace(prev);
    } else if (input.key === "n" || input.key === "N") {
      input.preventDefault();
      setInternalView("list");
      setPrev(null);
    }
  }
  async function addMarketplace(prev) {
    setBusy(true);
    setProcessError(null);
    try {
      let { name } = await addClaudeAiMarketplace(prev, {
        configured: await loadKnownMarketplacesWithDeclared(storageV5),
        credentials,
      });
      logEvent("tengu_marketplace_added", {
        source_type: lit("claudeai"),
      });
      refreshPluginCaches(storageV5, credentials);
      await onManageComplete();
      if (!officialHintShown.current) return;
      setPrev(null);
      setViewState({
        type: "browse-marketplace",
        targetMarketplace: name,
      });
    } catch (error) {
      if (officialHintShown.current) setProcessError(printableMessage(error));
    } finally {
      if (officialHintShown.current) setBusy(false);
    }
  }
  if (loading)
    return jsxProd_default(Text, {
      children: "Loading marketplaces\u2026",
    });
  if (
    marketplaceStates.length === 0 &&
    sectionStates.available.length === 0 &&
    sectionStates.hosted.length === 0 &&
    sectionStates.browseOnly.length === 0
  )
    return jsxProd_default_2(Box, {
      flexDirection: "column",
      children: [
        jsxProd_default(Box, {
          marginBottom: 1,
          children: jsxProd_default(Text, {
            bold: true,
            children: "Manage marketplaces",
          }),
        }),
        jsxProd_default_2(TwoColumnRow, {
          active: true,
          flexDirection: "row",
          gap: 1,
          children: [
            jsxProd_default_2(Text, {
              color: "suggestion",
              children: [
                jsxProd_default_2(Text, {
                  "aria-hidden": true,
                  children: [figures_default.pointer, " "],
                }),
                "+",
              ],
            }),
            jsxProd_default(Text, {
              bold: true,
              color: "suggestion",
              children: "Add Marketplace",
            }),
          ],
        }),
        jsxProd_default(Box, {
          marginTop: 1,
          children: jsxProd_default(Text, {
            dimColor: true,
            italic: true,
            children: exitState.pending
              ? jsxProd_default_2(Fragment, {
                  children: ["Press ", exitState.keyName, " again to go back"],
                })
              : jsxProd_default_2(Byline, {
                  children: [
                    jsxProd_default(ConfigurableShortcutHint, {
                      action: "select:accept",
                      context: "Select",
                      fallback: "Enter",
                      description: "select",
                    }),
                    jsxProd_default(ConfigurableShortcutHint, {
                      action: "confirm:no",
                      context: "Confirmation",
                      fallback: "Esc",
                      description: "go back",
                    }),
                  ],
                }),
          }),
        }),
      ],
    });
  if (internalView === "confirm-add-claudeai" && prev)
    return jsxProd_default_2(FocusColumn, {
      onKeyDown: handleMenuInput,
      children: [
        jsxProd_default_2(Text, {
          bold: true,
          children: ["Add marketplace ", stripInvisibleKeepEmoji(prev.name), "?"],
        }),
        prev.displayName !== prev.name &&
          jsxProd_default_2(Text, {
            dimColor: true,
            children: [
              stripInvisibleKeepEmoji(listedAsSuffix(prev.name, prev.displayName) ?? ""),
              " ",
              "on claude.ai",
            ],
          }),
        jsxProd_default_2(Box, {
          flexDirection: "column",
          marginTop: 1,
          children: [
            jsxProd_default_2(Text, {
              dimColor: true,
              children: ["Install its plugins with ", "<plugin>", "@", stripInvisibleKeepEmoji(prev.name)],
            }),
            jsxProd_default_2(Text, {
              dimColor: true,
              children: [
                "Hosted on claude.ai for",
                " ",
                prev.scope === "org"
                  ? "your organization"
                  : prev.scope === "account"
                    ? "you (your uploads)"
                    : "your account",
                ". Its plugins install from claude.ai.",
              ],
            }),
            busy &&
              jsxProd_default(Box, {
                marginTop: 1,
                children: jsxProd_default(Text, {
                  color: "claude",
                  children: "Adding marketplace\u2026",
                }),
              }),
            processError &&
              jsxProd_default(Box, {
                marginTop: 1,
                children: jsxProd_default(ErrorText, {
                  error: stripInvisibleKeepNewlines(processError),
                }),
              }),
            !busy &&
              jsxProd_default(Box, {
                marginTop: 1,
                children: jsxProd_default_2(Text, {
                  children: [
                    "Press ",
                    jsxProd_default(Text, {
                      bold: true,
                      children: "y",
                    }),
                    " to add or ",
                    jsxProd_default(Text, {
                      bold: true,
                      children: "n",
                    }),
                    " to cancel",
                  ],
                }),
              }),
          ],
        }),
      ],
    });
  if (internalView === "confirm-remove" && selectedMarketplace) {
    let namePrefix = `@${selectedMarketplace.name}`;
    let filtered = marketplaces.filter((state) => state.endsWith(namePrefix));
    let nameByPluginId = new Map(filtered.map((input) => [input, input.slice(0, -namePrefix.length)]));
    let installedRows = [];
    for (let installedPlugin of selectedMarketplace.installedPlugins) {
      let pluginName = findPluginName(filtered, installedPlugin.source);
      if (pluginName === undefined)
        installedRows.push({
          id: installedPlugin.source,
          name: installedPlugin.name,
        });
      else nameByPluginId.set(pluginName, installedPlugin.name);
    }
    let menuItems = [
      ...[...nameByPluginId].map(([pluginId, name]) => ({
        id: pluginId,
        name,
      })),
      ...installedRows,
    ];
    let menuCount = menuItems.length;
    return jsxProd_default_2(FocusColumn, {
      onKeyDown: handleKeyDown,
      children: [
        jsxProd_default_2(Text, {
          bold: true,
          color: "warning",
          children: [
            "Remove marketplace",
            " ",
            jsxProd_default(Text, {
              italic: true,
              children: stripInvisibleKeepEmoji(getMarketplaceDisplayName(selectedMarketplace)),
            }),
            "?",
          ],
        }),
        jsxProd_default_2(Box, {
          flexDirection: "column",
          children: [
            menuCount > 0 &&
              jsxProd_default(Box, {
                marginTop: 1,
                children: jsxProd_default_2(Text, {
                  color: "warning",
                  children: [
                    "This will also uninstall ",
                    menuCount,
                    " ",
                    plural(menuCount, "plugin"),
                    " from this marketplace:",
                  ],
                }),
              }),
            menuCount > 0 &&
              jsxProd_default(Box, {
                flexDirection: "column",
                marginTop: 1,
                marginLeft: 2,
                children: menuItems.map((plugin) =>
                  jsxProd_default(
                    BulletRow,
                    {
                      children: jsxProd_default(Text, {
                        dimColor: true,
                        children: stripInvisibleKeepEmoji(plugin.name),
                      }),
                    },
                    plugin.id,
                  ),
                ),
              }),
            jsxProd_default(Box, {
              marginTop: 1,
              children: jsxProd_default_2(Text, {
                children: [
                  "Press ",
                  jsxProd_default(Text, {
                    bold: true,
                    children: "y",
                  }),
                  " to confirm or ",
                  jsxProd_default(Text, {
                    bold: true,
                    children: "n",
                  }),
                  " to cancel",
                ],
              }),
            }),
          ],
        }),
      ],
    });
  }
  if (internalView === "details" && selectedMarketplace) {
    let isUpdating = selectedMarketplace.pendingUpdate || busy;
    return jsxProd_default_2(Box, {
      flexDirection: "column",
      children: [
        jsxProd_default(Text, {
          bold: true,
          children: stripInvisibleKeepEmoji(getMarketplaceDisplayName(selectedMarketplace)),
        }),
        jsxProd_default(Text, {
          dimColor: true,
          children: stripInvisibleKeepEmoji(selectedMarketplace.source),
        }),
        selectedMarketplace.note !== undefined &&
          jsxProd_default(Text, {
            color: "warning",
            children: stripInvisibleKeepEmoji(selectedMarketplace.note),
          }),
        jsxProd_default(Box, {
          marginTop: 1,
          children:
            selectedMarketplace.builtIn === "off"
              ? jsxProd_default_2(Text, {
                  children: [
                    "Plugins listed by the ",
                    OFFICIAL_MARKETPLACE_DISPLAY,
                    ", installed at their listed commit. Turn it on to see them in Discover.",
                  ],
                })
              : jsxProd_default_2(Text, {
                  children: [
                    selectedMarketplace.pluginCount || 0,
                    " available",
                    " ",
                    plural(selectedMarketplace.pluginCount || 0, "plugin"),
                    selectedMarketplace.allHiddenByPolicy
                      ? jsxProd_default_2(Text, {
                          dimColor: true,
                          children: [" ", "\xB7 hidden by your organization's policy"],
                        })
                      : null,
                  ],
                }),
        }),
        selectedMarketplace.installedPlugins.length > 0 &&
          jsxProd_default_2(Box, {
            flexDirection: "column",
            marginTop: 1,
            children: [
              jsxProd_default_2(Text, {
                bold: true,
                children: ["Installed plugins (", selectedMarketplace.installedPlugins.length, "):"],
              }),
              jsxProd_default(Box, {
                flexDirection: "column",
                marginLeft: 1,
                children: selectedMarketplace.installedPlugins.map((plugin) =>
                  jsxProd_default_2(
                    BulletRow,
                    {
                      children: [
                        stripInvisibleKeepEmoji(plugin.name),
                        `
`,
                        jsxProd_default(Text, {
                          dimColor: true,
                          children: stripInvisibleKeepNewlines(plugin.manifest.description ?? ""),
                        }),
                      ],
                    },
                    plugin.name,
                  ),
                ),
              }),
            ],
          }),
        isUpdating &&
          jsxProd_default_2(Box, {
            marginTop: 1,
            flexDirection: "column",
            children: [
              jsxProd_default(Text, {
                color: "claude",
                children: "Updating marketplace\u2026",
              }),
              progressMessage &&
                jsxProd_default(Text, {
                  dimColor: true,
                  children: stripInvisibleKeepEmoji(progressMessage),
                }),
            ],
          }),
        !isUpdating &&
          successMessage &&
          jsxProd_default(Box, {
            marginTop: 1,
            children: jsxProd_default(Text, {
              color: "claude",
              children: stripInvisibleKeepEmoji(successMessage),
            }),
          }),
        !isUpdating &&
          processError &&
          jsxProd_default(Box, {
            marginTop: 1,
            children: jsxProd_default(ErrorText, {
              error: stripInvisibleKeepNewlines(processError),
            }),
          }),
        !isUpdating &&
          jsxProd_default(Box, {
            flexDirection: "column",
            marginTop: 1,
            children: jsxProd_default(PluginActionSelect, {
              options,
              onSelect,
              defaultFocusValue: detailsMenuIndex,
              onFocus: setDetailsMenuIndex,
            }),
          }),
        !isUpdating &&
          !shouldSkipPluginAutoupdate() &&
          selectedMarketplace.autoUpdate &&
          jsxProd_default(Box, {
            marginTop: 1,
            children: jsxProd_default(Text, {
              dimColor: true,
              children:
                "Auto-update enabled. Claude Code will automatically update this marketplace and its installed plugins.",
            }),
          }),
        selectedMarketplace.builtIn === "on" &&
        selectedMarketplace.autoUpdateDeclaredOff &&
        !isUpdating &&
        !shouldSkipPluginAutoupdate()
          ? jsxProd_default(Box, {
              marginTop: 1,
              children: jsxProd_default(Text, {
                dimColor: true,
                children: `Auto-update is off: in extraKnownMarketplaces, the entry "${OFFICIAL_MARKETPLACE_NAME}" sets autoUpdate to false. Claude Code reads that entry only from ${AUTOUPDATE_SETTING_SOURCES_TEXT}.`,
              }),
            })
          : null,
        jsxProd_default(Box, {
          marginTop: 1,
          children: jsxProd_default(Text, {
            dimColor: true,
            italic: true,
            children: isUpdating
              ? jsxProd_default(Fragment, {
                  children: "Please wait\u2026",
                })
              : jsxProd_default_2(Byline, {
                  children: [
                    jsxProd_default(ConfigurableShortcutHint, {
                      action: "select:accept",
                      context: "Select",
                      fallback: "Enter",
                      description: "select",
                    }),
                    jsxProd_default(ConfigurableShortcutHint, {
                      action: "confirm:no",
                      context: "Confirmation",
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
  let { updateCount, removeCount } = getPendingCounts();
  return jsxProd_default_2(FocusColumn, {
    onKeyDown: handleConfirmInput,
    children: [
      jsxProd_default(Box, {
        marginBottom: 1,
        children: jsxProd_default(Text, {
          bold: true,
          children: "Manage marketplaces",
        }),
      }),
      jsxProd_default_2(TwoColumnRow, {
        active: selectedIndex === 0,
        flexDirection: "row",
        gap: 1,
        marginBottom: 1,
        children: [
          jsxProd_default_2(Text, {
            color: selectedIndex === 0 ? "suggestion" : undefined,
            children: [
              jsxProd_default_2(Text, {
                "aria-hidden": true,
                children: [selectedIndex === 0 ? figures_default.pointer : " ", " "],
              }),
              "+",
            ],
          }),
          jsxProd_default(Text, {
            bold: true,
            color: selectedIndex === 0 ? "suggestion" : undefined,
            children: "Add Marketplace",
          }),
        ],
      }),
      jsxProd_default_2(Box, {
        flexDirection: "column",
        children: [
          marketplaceStates.map((state, idx) => {
            let isSelected = idx + 1 === selectedIndex;
            let indicators = [];
            if (state.pendingUpdate) indicators.push("UPDATE");
            if (state.pendingRemove) indicators.push("REMOVE");
            return jsxProd_default_2(
              TwoColumnRow,
              {
                active: isSelected,
                flexDirection: "row",
                gap: 1,
                marginBottom: 1,
                children: [
                  jsxProd_default_2(Text, {
                    color: isSelected ? "suggestion" : undefined,
                    children: [
                      jsxProd_default_2(Text, {
                        "aria-hidden": true,
                        children: [isSelected ? figures_default.pointer : " ", " "],
                      }),
                      state.pendingRemove
                        ? figures_default.cross
                        : state.builtIn === "off"
                          ? figures_default.radioOff
                          : state.builtIn === "blocked"
                            ? figures_default.cross
                            : figures_default.bullet,
                    ],
                  }),
                  jsxProd_default_2(Box, {
                    flexDirection: "column",
                    flexGrow: 1,
                    children: [
                      jsxProd_default_2(Box, {
                        flexDirection: "row",
                        gap: 1,
                        children: [
                          jsxProd_default_2(Text, {
                            bold: true,
                            strikethrough: state.pendingRemove,
                            dimColor: state.pendingRemove,
                            children: [
                              state.name === "claude-plugins-official" &&
                                jsxProd_default(Text, {
                                  color: "claude",
                                  children: "\u273B ",
                                }),
                              stripInvisibleKeepEmoji(getMarketplaceDisplayName(state)),
                              state.name === "claude-plugins-official" &&
                                jsxProd_default(Text, {
                                  color: "claude",
                                  children: " \u273B",
                                }),
                            ],
                          }),
                          indicators.length > 0 &&
                            jsxProd_default_2(Text, {
                              color: "warning",
                              children: ["[", indicators.join(", "), "]"],
                            }),
                        ],
                      }),
                      jsxProd_default(Text, {
                        dimColor: true,
                        children: stripInvisibleKeepEmoji(state.source),
                      }),
                      state.note !== undefined &&
                        jsxProd_default(Text, {
                          color: "warning",
                          children: stripInvisibleKeepEmoji(state.note),
                        }),
                      jsxProd_default_2(Text, {
                        dimColor: true,
                        children: [
                          state.pluginCount !== undefined &&
                            jsxProd_default_2(Fragment, {
                              children: [state.pluginCount, " available"],
                            }),
                          state.allHiddenByPolicy
                            ? jsxProd_default(Fragment, {
                                children: " \xB7 hidden by your organization's policy",
                              })
                            : null,
                          state.installedPlugins.length > 0 &&
                            jsxProd_default_2(Fragment, {
                              children: [" \u2022 ", state.installedPlugins.length, " installed"],
                            }),
                          state.lastUpdated &&
                            jsxProd_default_2(Fragment, {
                              children: [
                                " ",
                                "\u2022 Updated",
                                " ",
                                new Date(state.lastUpdated).toLocaleDateString(),
                              ],
                            }),
                        ],
                      }),
                    ],
                  }),
                ],
              },
              state.name,
            );
          }),
          sectionStates.available.map((item, index) => {
            let isSelected = marketplaceStates.length + index + 1 === selectedIndex;
            return jsxProd_default_2(
              TwoColumnRow,
              {
                active: isSelected,
                flexDirection: "row",
                gap: 1,
                marginBottom: 1,
                children: [
                  jsxProd_default_2(Text, {
                    color: isSelected ? "suggestion" : undefined,
                    children: [
                      jsxProd_default_2(Text, {
                        "aria-hidden": true,
                        children: [isSelected ? figures_default.pointer : " ", " "],
                      }),
                      "+",
                    ],
                  }),
                  jsxProd_default_2(Box, {
                    flexDirection: "column",
                    flexGrow: 1,
                    children: [
                      jsxProd_default(Text, {
                        bold: true,
                        children: stripInvisibleKeepEmoji(displayMarketplaceName(item.name)),
                      }),
                      jsxProd_default_2(Text, {
                        dimColor: true,
                        children: [
                          stripInvisibleKeepEmoji(formatGitSourceSpec(item.source)),
                          ` \xB7 available from claude.ai${item.scope ? ` (${item.scope})` : ""}`,
                          !hasPendingChanges() && " \xB7 Enter to add",
                        ],
                      }),
                    ],
                  }),
                ],
              },
              `claudeai:${item.name}`,
            );
          }),
          sectionStates.hosted.map((state, idx) => {
            let browseOnlyRows =
              marketplaceStates.length + sectionStates.available.length + idx + 1 === selectedIndex;
            return jsxProd_default_2(
              TwoColumnRow,
              {
                active: browseOnlyRows,
                flexDirection: "row",
                gap: 1,
                marginBottom: 1,
                children: [
                  jsxProd_default_2(Text, {
                    color: browseOnlyRows ? "suggestion" : undefined,
                    children: [
                      jsxProd_default_2(Text, {
                        "aria-hidden": true,
                        children: [browseOnlyRows ? figures_default.pointer : " ", " "],
                      }),
                      "+",
                    ],
                  }),
                  jsxProd_default_2(Box, {
                    flexDirection: "column",
                    flexGrow: 1,
                    children: [
                      jsxProd_default(Text, {
                        bold: true,
                        children: stripInvisibleKeepEmoji(state.name),
                      }),
                      jsxProd_default_2(Text, {
                        dimColor: true,
                        children: [
                          `hosted on claude.ai (${formatMarketplaceScopeLabel(state.scope)})`,
                          state.displayName !== state.name &&
                            ` \xB7 ${stripInvisibleKeepEmoji(listedAsSuffix(state.name, state.displayName) ?? "")}`,
                          !hasPendingChanges() && " \xB7 Enter to add",
                        ],
                      }),
                    ],
                  }),
                ],
              },
              `claudeai-hosted:${state.marketplaceId}`,
            );
          }),
          sectionStates.browseOnly.map((item) =>
            jsxProd_default(
              Box,
              {
                marginBottom: 1,
                paddingLeft: 4,
                children: jsxProd_default_2(Text, {
                  dimColor: true,
                  children: [stripInvisibleKeepEmoji(noCliNameLabel(item)), " ", "\xB7 browse on claude.ai"],
                }),
              },
              `claudeai-browse:${item.name}`,
            ),
          ),
        ],
      }),
      hasPendingChanges() &&
        jsxProd_default_2(Box, {
          marginTop: 1,
          flexDirection: "column",
          children: [
            jsxProd_default_2(Text, {
              children: [
                jsxProd_default(Text, {
                  bold: true,
                  children: "Pending changes:",
                }),
                " ",
                jsxProd_default(Text, {
                  dimColor: true,
                  children: jsxProd_default(ConfigurableShortcutHint, {
                    action: "select:accept",
                    context: "Select",
                    fallback: "Enter",
                    description: "apply",
                  }),
                }),
              ],
            }),
            updateCount > 0 &&
              jsxProd_default_2(BulletRow, {
                children: ["Update ", updateCount, " ", plural(updateCount, "marketplace")],
              }),
            removeCount > 0 &&
              jsxProd_default_2(BulletRow, {
                color: "warning",
                children: ["Remove ", removeCount, " ", plural(removeCount, "marketplace")],
              }),
          ],
        }),
      busy &&
        jsxProd_default(Box, {
          marginTop: 1,
          children: jsxProd_default(Text, {
            color: "claude",
            children: "Processing changes\u2026",
          }),
        }),
      processError &&
        jsxProd_default(Box, {
          marginTop: 1,
          children: jsxProd_default(ErrorText, {
            error: stripInvisibleKeepNewlines(processError),
          }),
        }),
      jsxProd_default(ManageMarketplacesKeyHints, {
        exitState,
        hasPendingActions: hasPendingChanges(),
        isOnInertRow: marketplaceStates[selectedIndex - 1]?.builtIn === "blocked",
        builtInRow: marketplaceStates[selectedIndex - 1]?.builtIn,
      }),
    ],
  });
}
//@ chunk-vrb44rx7.js:122462-123736 fingerprint (2.1.88 match: ManageMarketplacesKeyHints, 0.783)
function ManageMarketplacesKeyHints(props) {
  let $ = useMemoCache(23);
  let { exitState, hasPendingActions, isOnInertRow, builtInRow } = props;
  if (exitState.pending) {
    let t1;
    if ($[0] !== exitState.keyName) {
      t1 = jsxProd_default(Box, {
        marginTop: 1,
        children: jsxProd_default_2(Text, {
          dimColor: true,
          italic: true,
          children: ["Press ", exitState.keyName, " again to go back"],
        }),
      });
      $[0] = exitState.keyName;
      $[1] = t1;
    } else t1 = $[1];
    return t1;
  }
  let t1;
  if ($[2] !== hasPendingActions) {
    t1 =
      hasPendingActions &&
      jsxProd_default(ConfigurableShortcutHint, {
        action: "select:accept",
        context: "Select",
        fallback: "Enter",
        description: "apply changes",
      });
    $[2] = hasPendingActions;
    $[3] = t1;
  } else t1 = $[3];
  let t2;
  if ($[4] !== hasPendingActions || $[5] !== isOnInertRow) {
    t2 =
      !hasPendingActions &&
      !isOnInertRow &&
      jsxProd_default(ConfigurableShortcutHint, {
        action: "select:accept",
        context: "Select",
        fallback: "Enter",
        description: "select",
      });
    $[4] = hasPendingActions;
    $[5] = isOnInertRow;
    $[6] = t2;
  } else t2 = $[6];
  let t3;
  if ($[7] !== builtInRow || $[8] !== hasPendingActions || $[9] !== isOnInertRow) {
    t3 =
      !hasPendingActions &&
      !isOnInertRow &&
      builtInRow !== "off" &&
      jsxProd_default(KeyboardShortcutHint, {
        chord: "u",
        action: "update",
      });
    $[7] = builtInRow;
    $[8] = hasPendingActions;
    $[9] = isOnInertRow;
    $[10] = t3;
  } else t3 = $[10];
  let t4;
  if ($[11] !== builtInRow || $[12] !== hasPendingActions || $[13] !== isOnInertRow) {
    t4 =
      !hasPendingActions &&
      !isOnInertRow &&
      jsxProd_default(KeyboardShortcutHint, {
        chord: "d",
        action: builtInRow === "on" ? "turn off" : builtInRow === "off" ? "turn on" : "remove",
      });
    $[11] = builtInRow;
    $[12] = hasPendingActions;
    $[13] = isOnInertRow;
    $[14] = t4;
  } else t4 = $[14];
  const description = hasPendingActions ? "cancel" : "go back";
  let t6;
  if ($[15] !== description) {
    t6 = jsxProd_default(ConfigurableShortcutHint, {
      action: "confirm:no",
      context: "Confirmation",
      fallback: "Esc",
      description,
    });
    $[15] = description;
    $[16] = t6;
  } else t6 = $[16];
  let t7;
  if ($[17] !== t1 || $[18] !== t2 || $[19] !== t3 || $[20] !== t4 || $[21] !== t6) {
    t7 = jsxProd_default(Box, {
      marginTop: 1,
      children: jsxProd_default(Text, {
        dimColor: true,
        italic: true,
        children: jsxProd_default_2(Byline, {
          children: [t1, t2, t3, t4, t6],
        }),
      }),
    });
    $[17] = t1;
    $[18] = t2;
    $[19] = t3;
    $[20] = t4;
    $[21] = t6;
    $[22] = t7;
  } else t7 = $[22];
  return t7;
}
//@ chunk-vrb44rx7.js:123736-123791 layout
function getMarketplaceDisplayName(marketplace) {
  return marketplace.builtIn !== undefined
    ? OFFICIAL_MARKETPLACE_DISPLAY
    : displayMarketplaceName(marketplace.name);
}
//@ chunk-vrb44rx7.js:123791-124310 layout
/**
 * 按官方市场可用状态（unavailable/blocked/off/on）在市场列表前插入或修正内置官方市场行：被组织屏蔽或关闭时插入占位行；已添加时标记 builtIn 并在插件全被策略隐藏时加标志。
 */
async function withOfficialMarketplaceRow(marketplaces, knownMarketplaces) {
  {
    let officialStatus = await getPluginDirectoryState();
    if (officialStatus === "unavailable") return marketplaces;
    let officialMarketplace = knownMarketplaces[OFFICIAL_MARKETPLACE_NAME];
    if (officialStatus === "blocked")
      return officialMarketplace && !isPluginDirectorySource(officialMarketplace.source)
        ? marketplaces
        : [
            {
              name: OFFICIAL_MARKETPLACE_NAME,
              source: "Built in \xB7 blocked by your organization",
              installedPlugins: [],
              builtIn: "blocked",
            },
            ...marketplaces,
          ];
    if (officialMarketplace) {
      if (!isPluginDirectorySource(officialMarketplace.source)) return marketplaces;
      let size = commandSourceSession().catalogEntryNames?.size ?? 0;
      return marketplaces.map((marketplace) =>
        marketplace.name === OFFICIAL_MARKETPLACE_NAME
          ? {
              ...marketplace,
              builtIn: "on",
              ...(marketplace.pluginCount === 0 &&
                size > 0 && {
                  allHiddenByPolicy: true,
                }),
            }
          : marketplace,
      );
    }
    return officialStatus === "off"
      ? [
          {
            name: OFFICIAL_MARKETPLACE_NAME,
            source: "Built in \xB7 turned off",
            installedPlugins: [],
            builtIn: "off",
          },
          ...marketplaces,
        ]
      : marketplaces;
  }
  return marketplaces;
}
//@ chunk-vrb44rx7.js:124310-125186 placement
function buildMarketplaceRows(marketplaces, failures, allPlugins, claudeAiMarketplaceRegistry) {
  let declaredMarketplaces = getDeclaredMarketplaces();
  return marketplaces
    .map(({ name: marketplaceName, config, data }) => {
      let filtered = allPlugins.filter((plugin) => plugin.source.endsWith(`@${marketplaceName}`));
      let source = getMarketplaceSourceDisplay(config.source);
      let sourceLabel;
      if (config.source.source === "claudeai") {
        source = formatClaudeAiMarketplaceLabel(claudeAiMarketplaceRegistry[marketplaceName]);
        let claudeAiNote =
          data === null
            ? 0
            : count(filtered, (plugin) => {
                let found = data.plugins.find((plugin_2) => plugin_2.name === plugin.name);
                return (
                  found !== undefined &&
                  typeof found.source === "object" &&
                  found.source.source === "claudeai" &&
                  found.source.version !== "" &&
                  basename(plugin.path).replace(/\.zip$/, "") !== found.source.version
                );
              });
        sourceLabel =
          failures.find((failure) => failure.name === marketplaceName)?.error ??
          (claudeAiNote > 0
            ? `${claudeAiNote} plugin ${plural(claudeAiNote, "update")} available \xB7 update the marketplace to apply`
            : undefined);
      }
      let marketplaceAutoUpdate = getMarketplaceAutoUpdate(marketplaceName, declaredMarketplaces);
      return {
        name: marketplaceName,
        source,
        ...(sourceLabel !== undefined && {
          note: sourceLabel,
        }),
        lastUpdated: config.lastUpdated,
        pluginCount: data?.plugins.length,
        installedPlugins: filtered,
        pendingUpdate: false,
        pendingRemove: false,
        autoUpdate: isMarketplaceAutoUpdate(marketplaceName, config, marketplaceAutoUpdate),
        ...(marketplaceAutoUpdate === false && {
          autoUpdateDeclaredOff: true,
        }),
      };
    })
    .sort((a, b) => {
      if (a.name === ANTHROPIC_PLUGIN_DIRECTORY) return -1;
      if (b.name === ANTHROPIC_PLUGIN_DIRECTORY) return 1;
      return a.name.localeCompare(b.name);
    });
}
//@ chunk-vrb44rx7.js:125186-125190 placement
// deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
deferInit("chunk-vrb44rx7.js:125186", () => {
  init_react_production();
});
//@ chunk-vrb44rx7.js:125190-125194 placement
// deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
deferInit("chunk-vrb44rx7.js:125190", () => {
  init_react_production();
});
export { ManageMarketplaces };
