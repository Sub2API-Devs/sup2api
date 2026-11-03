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
import { y, R, P, Q, init_react_production } from "../../../vendor/react/cjs/react.production.js";
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
import { w } from "../../../vendor/react/compiler-runtime.js";
import { KeyboardShortcutHint } from "../../components/design-system/KeyboardShortcutHint.js";
import { commandSourceSession } from "../../utils/plugins/commandSourceErrors.js";
import { isMarketplaceAutoUpdate, ANTHROPIC_PLUGIN_DIRECTORY } from "../../utils/plugins/schemas.js";

//@ chunk-vrb44rx7.js:103318-103453 placement
var BUILTIN_MARKETPLACE_OFF_NOTICE = `${OFFICIAL_MARKETPLACE_DISPLAY} is off. Plugins you installed from it stay installed and keep updating. Turn it back on in /plugin \u2192 Marketplaces.`;
//@ chunk-vrb44rx7.js:103453-122462 fingerprint = ManageMarketplaces (0.48)
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
  let [marketplaceStates, setMarketplaceStates] = y([]);
  let [_, J] = y([]);
  let [pe, fe] = y({
    available: [],
    hosted: [],
    browseOnly: [],
  });
  let [prev, ne] = y(null);
  let hasAttemptedAutoAction = R(null);
  let [loading, setLoading] = y(true);
  let [selectedIndex, setSelectedIndex] = y(0);
  let [je, ae] = y(false);
  let [processError, setProcessError] = y(null);
  let [successMessage, setSuccessMessage] = y(null);
  let [progressMessage, setProgressMessage] = y(null);
  let [internalView, setInternalView] = y("list");
  let [selectedMarketplace, setSelectedMarketplace] = y(null);
  let [detailsMenuIndex, setDetailsMenuIndex] = y("browse");
  let an = R(false);
  let clock = useClock();
  let _e = R(undefined);
  let qe = R(true);
  let vt = R(false);
  P(
    () => () => {
      qe.current = false;
      _e.current?.();
    },
    [],
  );
  P(() => {
    async function loadMarketplaces() {
      try {
        let knownMarketplaces = await loadKnownMarketplacesWithDeclared(storageV5);
        let { enabled, disabled } = await loadAllPlugins(storageV5, credentials);
        let allPlugins = [...enabled, ...disabled];
        J(Object.keys(getInstalledPlugins().plugins));
        let { marketplaces, failures } = await loadMarketplacesWithErrors(knownMarketplaces, storageV5);
        let Ce = await listClaudeAiMarketplaces(credentials).catch(() => null);
        hasAttemptedAutoAction.current = Ce;
        fe({
          ...filterUnaddedClaudeAiMarketplaces(Ce, knownMarketplaces),
          browseOnly: Ce?.browseOnly ?? [],
        });
        let Ve = await withOfficialMarketplaceRow(
          buildMarketplaceRows(marketplaces, failures, allPlugins, await readClaudeAiMarketplaceRegistry()),
          knownMarketplaces,
        );
        setMarketplaceStates(Ve);
        let successCount = count(marketplaces, (m) => m.data !== null);
        let errorResult = formatMarketplaceLoadingErrors(failures, successCount);
        if (errorResult)
          if (
            errorResult.type === "warning" ||
            (targetMarketplace !== undefined && action !== "remove" && action !== "update")
          )
            setProcessError(errorResult.message);
          else throw Error(errorResult.message);
        if (targetMarketplace && !an.current && !error) {
          an.current = true;
          let Jt =
            action === "remove" && isOfficialMarketplaceSpelling(targetMarketplace)
              ? listReservedNameRefusals(knownMarketplaces).filter(({ name: xt }) =>
                  isOfficialMarketplaceName_2(targetMarketplace)
                    ? isOfficialMarketplaceName_2(xt)
                    : xt === targetMarketplace,
                )
              : [];
          let targetIndex = Ve.findIndex(
            (xt) =>
              xt.name === targetMarketplace ||
              (xt.builtIn !== undefined && isOfficialMarketplaceName_2(targetMarketplace)),
          );
          if (Jt.length > 0) {
            let xt = await removeMarketplaceWithReservedSiblings(
              targetMarketplace,
              undefined,
              storageV5,
              credentials,
              {
                onlyIgnoredNameEntries: true,
              },
            );
            let _t = [];
            let Mt = false;
            if (xt.kind === "ignored-plugin-directory-name-entry-removed") {
              Mt = xt.removedNames.length > 0;
              for (let removedName of xt.removedNames)
                _t.push(removedMarketplaceMessage(removedName, isPluginDirectoryModeOn()));
              let hn = blockedPluginsNotice(xt.disabledPluginIds, xt.disabledReason);
              if (hn !== null) _t.push(hn);
              activePlugins.removeErrorsOf(xt.removedPluginIds);
              if (!Mt) _t.push(marketplaceEntryGoneText(targetMarketplace));
            } else if (xt.kind === "removed") {
              Mt = true;
              _t.push(`Removed marketplace "${quotedPrintable(targetMarketplace)}"`);
              activePlugins.removeErrorsOf(xt.removedPluginIds);
            }
            if (Mt)
              logEvent("tengu_marketplace_removed", {
                marketplace_name: marketplaceForTelemetry(targetMarketplace),
                _PROTO_marketplace_name: targetMarketplace,
                is_official_marketplace: isOfficialMarketplaceName_3(targetMarketplace),
              });
            refreshPluginCaches(storageV5, credentials);
            setResult(stripInvisibleKeepEmoji(`${figures_default.tick} ${_t.join(" ")}`));
            await onManageComplete();
            setViewState({
              type: "menu",
            });
          } else if (targetIndex >= 0) {
            let xt = Ve[targetIndex];
            if (xt?.builtIn === "blocked" && action !== undefined && action !== "confirm-remove") {
              setSelectedIndex(targetIndex + 1);
              {
                let _t = pluginDirectoryPolicyBlockHint();
                if (action === "remove") setProcessError(formatPluginDirectoryBlockedMessage(_t));
                else setProcessError(officialMarketplaceBlockedText(_t));
              }
            } else if (xt?.builtIn === "blocked") {
              let _t = `@${OFFICIAL_MARKETPLACE_NAME}`;
              let found = Object.keys(getInstalledPlugins().plugins).find((key) => key.endsWith(_t));
              if (found) {
                setViewState({
                  type: "manage-plugins",
                  targetPlugin: found.slice(0, -_t.length),
                  targetMarketplace: OFFICIAL_MARKETPLACE_NAME,
                });
                return;
              }
              setSelectedIndex(targetIndex + 1);
            } else if (action === "confirm-remove" && xt) {
              setSelectedIndex(targetIndex + 1);
              setSelectedMarketplace(xt);
              _e.current?.();
              setInternalView(xt.builtIn ? "details" : "confirm-remove");
            } else if (action === "remove" && xt?.builtIn) {
              setSelectedIndex(targetIndex + 1);
              buildDetailsMenuOptions(false);
            } else if (action) {
              setSelectedIndex(targetIndex + 1);
              let states = Ve.map((state, idx) =>
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
            } else if (xt) {
              setSelectedIndex(targetIndex + 1);
              setSelectedMarketplace(xt);
              _e.current?.();
              setInternalView("details");
            }
          } else setError(`Marketplace not found: ${targetMarketplace}`);
        }
      } catch (err) {
        let Ue = printableMessage(err);
        setError(Ue);
        setProcessError(Ue);
      } finally {
        setLoading(false);
      }
    }
    loadMarketplaces();
  }, [targetMarketplace, action, error]);
  let hasPendingChanges = () => marketplaceStates.some((state) => state.pendingUpdate || state.pendingRemove);
  let getPendingCounts = () => {
    let updateCount = count(marketplaceStates, (Ue) => Ue.pendingUpdate);
    let removeCount = count(marketplaceStates, (Ue) => Ue.pendingRemove);
    return {
      updateCount,
      removeCount,
    };
  };
  let applyChanges = async (states) => {
    if (vt.current) return;
    vt.current = true;
    let statesToProcess = states || marketplaceStates;
    let wasInDetailsView = internalView === "details";
    ae(true);
    setProcessError(null);
    setSuccessMessage(null);
    setProgressMessage(null);
    try {
      let dt = 0;
      let removedCount = 0;
      let wt = null;
      let We = [];
      let Ce = [];
      let refreshedMarketplaces = new Set();
      for (let state of statesToProcess) {
        if (state.pendingRemove) {
          if (state.installedPlugins.length > 0)
            await updateSettingsForSourceWithTransform(
              "userSettings",
              (de) => {
                let newEnabledPlugins = {
                  ...de?.enabledPlugins,
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
          let At = await removeMarketplaceWithReservedSiblings(state.name, undefined, storageV5, credentials);
          removedCount++;
          if (At.kind !== "plugin-directory-built-in") activePlugins.removeErrorsOf(At.removedPluginIds);
          if (At.kind === "ignored-plugin-directory-name-entry-removed") {
            let de = blockedPluginsNotice(At.disabledPluginIds, At.disabledReason);
            wt = de === null ? null : stripInvisibleKeepEmoji(de);
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
              We.push(state.name);
              logForDebugging(
                `Marketplace ${state.name} not updated (managed policy): ${errorMessage(error)}`,
              );
              continue;
            }
            Ce.push(state.name);
            logForDebugging(`Marketplace ${state.name} could not be refreshed: ${errorMessage(error)}`, {
              level: "warn",
            });
            continue;
          }
          dt++;
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
      let qt = 0;
      let xt = 0;
      let _t = [];
      let Mt = [];
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
        Mt = commandSourceSkipped;
        deferredPluginCount = count(blocked, (mt) => mt.type === "autoupdate-deferred-entry-helper");
        policyBlockedPluginCount = count(blocked, (mt) => mt.type === "autoupdate-disabled-by-policy");
        qt = count(blocked, (mt) => mt.type === "autoupdate-blocked-by-pinner");
        xt = updateFailedCount;
        let filtered = blocked.filter(
          (mt) =>
            mt.type !== "autoupdate-deferred-entry-helper" &&
            mt.type !== "autoupdate-disabled-by-policy" &&
            mt.type !== "autoupdate-blocked-by-pinner",
        );
        if (filtered.length > 0 || updated.length > 0)
          notifyPluginsAutoUpdated(updated, filtered, [], {
            announce: false,
          });
        _t = filtered.flatMap((mt) => ("plugin" in mt && typeof mt.plugin === "string" ? [mt.plugin] : []));
      }
      refreshPluginCaches(storageV5, credentials);
      await onManageComplete();
      if (!qe.current) return;
      let updatedPluginIds = await loadKnownMarketplacesWithDeclared(storageV5);
      let { enabled, disabled } = await loadAllPlugins(storageV5, credentials);
      if (!qe.current) return;
      let allPlugins = [...enabled, ...disabled];
      let { marketplaces, failures } = await loadMarketplacesWithErrors(updatedPluginIds, storageV5);
      if (!qe.current) return;
      fe((plugin) => ({
        ...plugin,
        ...filterUnaddedClaudeAiMarketplaces(hasAttemptedAutoAction.current, updatedPluginIds),
      }));
      let An = await withOfficialMarketplaceRow(
        buildMarketplaceRows(marketplaces, failures, allPlugins, await readClaudeAiMarketplaceRegistry()),
        updatedPluginIds,
      );
      setMarketplaceStates(An);
      setSelectedIndex((plugin) => Math.min(plugin, An.length));
      if (wasInDetailsView && selectedMarketplace) {
        let updatedMarketplace = An.find((At) => At.name === selectedMarketplace.name);
        if (updatedMarketplace) setSelectedMarketplace(updatedMarketplace);
      }
      let Bn = [];
      let Tn = wasInDetailsView ? displayMarketplaceName : escapedDisplayText;
      if (dt > 0 || We.length > 0 || Ce.length > 0 || qt > 0 || xt > 0)
        Bn.push(
          formatMarketplaceUpdateSummary({
            updatedCount: dt,
            updatedPluginCount,
            deferredPluginCount,
            policyBlockedPluginCount,
            policyRefusedMarketplaces: We.map((ze) => Tn(ze)),
            failedMarketplaces: Ce.map((ze) => Tn(ze)),
            pinnedPluginCount: qt,
            failedPluginCount: xt,
            failedPluginNames: _t.map((ze) => Tn(ze)),
          }),
        );
      if (Mt.length > 0) {
        let ze = Mt.length;
        let At = ze > 1;
        let de = Mt.find(isSafeCliArg) ?? "";
        let successMsg = `${At ? "(and the others) " : ""}to review (add --scope for a project/local install)`;
        let fallback = `review and update ${At ? "each" : "it"} individually from the command line`;
        Bn.push(
          `${ze} command-sourced ${plural(ze, "plugin")} not updated here \u2014 ${runCommandHint(
            "plugin update",
            de,
            {
              tail: successMsg,
              fallback,
            },
          )}`,
        );
      }
      if (removedCount > 0) Bn.push(`Removed ${removedCount} ${plural(removedCount, "marketplace")}`);
      if (Bn.length > 0) {
        let At = `${
          marketplaceUpdateIcon({
            failedCount: Ce.length + xt,
            updatedCount: dt + removedCount,
            policyRefusedCount: We.length,
          }) ?? figures_default.warning
        } ${Bn.join(", ")}`;
        let de = wt === null ? At : `${wt} ${At}`;
        if (wasInDetailsView) setSuccessMessage(de);
        else {
          if (!qe.current) return;
          setResult(de);
          _e.current?.();
          _e.current = clock.setTimeout(
            () =>
              setViewState({
                type: "menu",
              }),
            2000,
          );
        }
      } else if (!wasInDetailsView) {
        if (!qe.current) return;
        setViewState({
          type: "menu",
        });
      }
    } catch (err) {
      let errorMsg = printableMessage(err);
      if (!qe.current) return;
      setProcessError(errorMsg);
      setError(errorMsg);
    } finally {
      vt.current = false;
      if (qe.current) {
        ae(false);
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
  let options = Q(() => {
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
  let Ut = R(false);
  let buildDetailsMenuOptions = async (marketplace) => {
    if (Ut.current) return;
    Ut.current = true;
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
    Ut.current = false;
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
      _e.current?.();
      setInternalView("list");
      setDetailsMenuIndex("browse");
    },
    {
      context: "Confirmation",
      isActive:
        !je &&
        (internalView === "details" ||
          internalView === "confirm-remove" ||
          internalView === "confirm-add-claudeai"),
    },
  );
  useKeybinding(
    "confirm:no",
    () => {
      _e.current?.();
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
      isActive: !je && internalView === "list" && hasPendingChanges(),
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
      isActive: !je && internalView === "list" && !hasPendingChanges(),
    },
  );
  MessageActionsKeybindings(
    {
      "select:previous": () => setSelectedIndex((prev) => Math.max(0, prev - 1)),
      "select:next": () => {
        let totalItems = marketplaceStates.length + pe.available.length + pe.hosted.length + 1;
        setSelectedIndex((prev) => Math.min(totalItems - 1, prev + 1));
      },
      "select:accept": () => {
        _e.current?.();
        let le = selectedIndex - 1;
        let Te = pe.available[le - marketplaceStates.length];
        let Ue = pe.hosted[le - marketplaceStates.length - pe.available.length];
        if (selectedIndex === 0)
          setViewState({
            type: "add-marketplace",
          });
        else if (hasPendingChanges()) applyChanges();
        else if (Te)
          setViewState({
            type: "add-marketplace",
            claudeAiListing: {
              name: Te.name,
              source: formatGitSourceSpec(Te.source),
            },
          });
        else if (Ue) {
          ne(Ue);
          setProcessError(null);
          setInternalView("confirm-add-claudeai");
        } else {
          let marketplace = marketplaceStates[le];
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
      isActive: !je && internalView === "list",
    },
  );
  function mn(input) {
    if (input.ctrl || input.meta || je) return;
    let marketplaceIndex = selectedIndex - 1;
    let builtIn = marketplaceStates[marketplaceIndex]?.builtIn;
    if (builtIn === "blocked") return;
    if (builtIn !== undefined && /^[udUD]$/.test(input.key)) {
      let dt = marketplaceStates[marketplaceIndex];
      if (dt && (builtIn === "off" || input.key === "d" || input.key === "D")) {
        input.preventDefault();
        _e.current?.();
        setSelectedMarketplace(dt);
        setInternalView("details");
        setDetailsMenuIndex(builtIn === "off" ? "turn-on" : "turn-off");
        return;
      }
    }
    if ((input.key === "u" || input.key === "U") && marketplaceIndex >= 0) {
      input.preventDefault();
      _e.current?.();
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
        _e.current?.();
        setInternalView("confirm-remove");
      }
    }
  }
  let onSelect = (prev) => {
    _e.current?.();
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
  function Ln(event) {
    if (event.ctrl || event.meta || je) return;
    if (event.key === "y" || event.key === "Y") {
      event.preventDefault();
      _e.current?.();
      confirmRemove();
    } else if (event.key === "n" || event.key === "N") {
      event.preventDefault();
      _e.current?.();
      setInternalView("list");
      setSelectedMarketplace(null);
    }
  }
  function Mn(input) {
    if (input.ctrl || input.meta || je) return;
    if ((input.key === "y" || input.key === "Y") && prev) {
      input.preventDefault();
      fn(prev);
    } else if (input.key === "n" || input.key === "N") {
      input.preventDefault();
      setInternalView("list");
      ne(null);
    }
  }
  async function fn(prev) {
    ae(true);
    setProcessError(null);
    try {
      let { name: Te } = await addClaudeAiMarketplace(prev, {
        configured: await loadKnownMarketplacesWithDeclared(storageV5),
        credentials,
      });
      logEvent("tengu_marketplace_added", {
        source_type: lit("claudeai"),
      });
      refreshPluginCaches(storageV5, credentials);
      await onManageComplete();
      if (!qe.current) return;
      ne(null);
      setViewState({
        type: "browse-marketplace",
        targetMarketplace: Te,
      });
    } catch (error) {
      if (qe.current) setProcessError(printableMessage(error));
    } finally {
      if (qe.current) ae(false);
    }
  }
  if (loading)
    return jsxProd_default(Text, {
      children: "Loading marketplaces\u2026",
    });
  if (
    marketplaceStates.length === 0 &&
    pe.available.length === 0 &&
    pe.hosted.length === 0 &&
    pe.browseOnly.length === 0
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
      onKeyDown: Mn,
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
            je &&
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
            !je &&
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
    let le = `@${selectedMarketplace.name}`;
    let filtered = _.filter((state) => state.endsWith(le));
    let Ue = new Map(filtered.map((input) => [input, input.slice(0, -le.length)]));
    let dt = [];
    for (let installedPlugin of selectedMarketplace.installedPlugins) {
      let pluginName = findPluginName(filtered, installedPlugin.source);
      if (pluginName === undefined)
        dt.push({
          id: installedPlugin.source,
          name: installedPlugin.name,
        });
      else Ue.set(pluginName, installedPlugin.name);
    }
    let Dt = [
      ...[...Ue].map(([We, Ce]) => ({
        id: We,
        name: Ce,
      })),
      ...dt,
    ];
    let wt = Dt.length;
    return jsxProd_default_2(FocusColumn, {
      onKeyDown: Ln,
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
            wt > 0 &&
              jsxProd_default(Box, {
                marginTop: 1,
                children: jsxProd_default_2(Text, {
                  color: "warning",
                  children: [
                    "This will also uninstall ",
                    wt,
                    " ",
                    plural(wt, "plugin"),
                    " from this marketplace:",
                  ],
                }),
              }),
            wt > 0 &&
              jsxProd_default(Box, {
                flexDirection: "column",
                marginTop: 1,
                marginLeft: 2,
                children: Dt.map((plugin) =>
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
    let isUpdating = selectedMarketplace.pendingUpdate || je;
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
    onKeyDown: mn,
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
          pe.available.map((le, Te) => {
            let Ue = marketplaceStates.length + Te + 1 === selectedIndex;
            return jsxProd_default_2(
              TwoColumnRow,
              {
                active: Ue,
                flexDirection: "row",
                gap: 1,
                marginBottom: 1,
                children: [
                  jsxProd_default_2(Text, {
                    color: Ue ? "suggestion" : undefined,
                    children: [
                      jsxProd_default_2(Text, {
                        "aria-hidden": true,
                        children: [Ue ? figures_default.pointer : " ", " "],
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
                        children: stripInvisibleKeepEmoji(displayMarketplaceName(le.name)),
                      }),
                      jsxProd_default_2(Text, {
                        dimColor: true,
                        children: [
                          stripInvisibleKeepEmoji(formatGitSourceSpec(le.source)),
                          ` \xB7 available from claude.ai${le.scope ? ` (${le.scope})` : ""}`,
                          !hasPendingChanges() && " \xB7 Enter to add",
                        ],
                      }),
                    ],
                  }),
                ],
              },
              `claudeai:${le.name}`,
            );
          }),
          pe.hosted.map((state, idx) => {
            let Ue = marketplaceStates.length + pe.available.length + idx + 1 === selectedIndex;
            return jsxProd_default_2(
              TwoColumnRow,
              {
                active: Ue,
                flexDirection: "row",
                gap: 1,
                marginBottom: 1,
                children: [
                  jsxProd_default_2(Text, {
                    color: Ue ? "suggestion" : undefined,
                    children: [
                      jsxProd_default_2(Text, {
                        "aria-hidden": true,
                        children: [Ue ? figures_default.pointer : " ", " "],
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
          pe.browseOnly.map((le) =>
            jsxProd_default(
              Box,
              {
                marginBottom: 1,
                paddingLeft: 4,
                children: jsxProd_default_2(Text, {
                  dimColor: true,
                  children: [stripInvisibleKeepEmoji(noCliNameLabel(le)), " ", "\xB7 browse on claude.ai"],
                }),
              },
              `claudeai-browse:${le.name}`,
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
      je &&
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
//@ chunk-vrb44rx7.js:122462-123736 fingerprint = ManageMarketplacesKeyHints (0.783)
function ManageMarketplacesKeyHints(props) {
  let $ = w(23);
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
function getMarketplaceDisplayName(i) {
  return i.builtIn !== undefined ? OFFICIAL_MARKETPLACE_DISPLAY : displayMarketplaceName(i.name);
}
//@ chunk-vrb44rx7.js:123791-124310 layout
/**
 * 按官方市场可用状态（unavailable/blocked/off/on）在市场列表前插入或修正内置官方市场行：被组织屏蔽或关闭时插入占位行；已添加时标记 builtIn 并在插件全被策略隐藏时加标志。
 */
async function withOfficialMarketplaceRow(marketplaces, knownMarketplaces) {
  {
    let officialStatus = await getPluginDirectoryState();
    if (officialStatus === "unavailable") return marketplaces;
    let C = knownMarketplaces[OFFICIAL_MARKETPLACE_NAME];
    if (officialStatus === "blocked")
      return C && !isPluginDirectorySource(C.source)
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
    if (C) {
      if (!isPluginDirectorySource(C.source)) return marketplaces;
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
    .map(({ name: D, config, data: L }) => {
      let filtered = allPlugins.filter((_) => _.source.endsWith(`@${D}`));
      let source = getMarketplaceSourceDisplay(config.source);
      let V;
      if (config.source.source === "claudeai") {
        source = formatClaudeAiMarketplaceLabel(claudeAiMarketplaceRegistry[D]);
        let _ =
          L === null
            ? 0
            : count(filtered, (J) => {
                let found = L.plugins.find((plugin) => plugin.name === J.name);
                return (
                  found !== undefined &&
                  typeof found.source === "object" &&
                  found.source.source === "claudeai" &&
                  found.source.version !== "" &&
                  basename(J.path).replace(/\.zip$/, "") !== found.source.version
                );
              });
        V =
          failures.find((J) => J.name === D)?.error ??
          (_ > 0
            ? `${_} plugin ${plural(_, "update")} available \xB7 update the marketplace to apply`
            : undefined);
      }
      let marketplaceAutoUpdate = getMarketplaceAutoUpdate(D, declaredMarketplaces);
      return {
        name: D,
        source,
        ...(V !== undefined && {
          note: V,
        }),
        lastUpdated: config.lastUpdated,
        pluginCount: L?.plugins.length,
        installedPlugins: filtered,
        pendingUpdate: false,
        pendingRemove: false,
        autoUpdate: isMarketplaceAutoUpdate(D, config, marketplaceAutoUpdate),
        ...(marketplaceAutoUpdate === false && {
          autoUpdateDeclaredOff: true,
        }),
      };
    })
    .sort((D, U) => {
      if (D.name === ANTHROPIC_PLUGIN_DIRECTORY) return -1;
      if (U.name === ANTHROPIC_PLUGIN_DIRECTORY) return 1;
      return D.name.localeCompare(U.name);
    });
}
//@ chunk-vrb44rx7.js:125186-125190 placement
init_react_production();
//@ chunk-vrb44rx7.js:125190-125194 placement
init_react_production();
export { ManageMarketplaces };
