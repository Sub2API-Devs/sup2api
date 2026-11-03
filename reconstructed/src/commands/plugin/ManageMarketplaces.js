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
  ubr,
  formatPluginDirectoryBlockedMessage,
  EPi,
  OFFICIAL_MARKETPLACE_NAME,
  isPluginDirectorySource,
} from "../../utils/plugins/officialMarketplaceNames.js";
import { Me } from "../../components/design-system/ThemeProvider.js";
import { useActivePlugins } from "../../state/AppState.js";
import { y, R, P, Q, j } from "../../../vendor/react/cjs/react.production.js";
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
  hBr,
  formatMarketplaceScopeLabel,
  Qbt,
  formatClaudeAiMarketplaceLabel,
} from "../../utils/plugins/claudeAiMarketplaces.js";
import { count } from "../../utils/collections.js";
import { listReservedNameRefusals } from "../../utils/plugins/marketplaceSources.js";
import { QE } from "../../utils/plugins/pluginGates.js";
import { quotedPrintable, printableMessage, printableName } from "../../utils/printableName.js";
import { logEvent } from "../../services/analytics/index.js";
import { r$e } from "../../utils/telemetry/pluginTelemetry.js";
import { isOfficialMarketplaceName_3, findPluginName } from "../../utils/plugins/pluginIdentifier.js";
import { ic } from "../../utils/plugins/cacheUtils.js";
import {
  stripInvisibleKeepEmoji,
  stripInvisibleKeepNewlines,
} from "../../utils/settings/marketplaceSettingsAliases.js";
import { re } from "../../../vendor/@inquirer/figures/dist/esm/index.js";
import { pluginDirectoryPolicyBlockHint } from "../../utils/plugins/marketplacePolicy.js";
import { updateSettingsForSourceWithTransform } from "../../utils/settings/settings.js";
import { Bd } from "../../utils/plugins/commandSource.js";
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
import { r, e, Fragment } from "../../../vendor/react/cjs/react-jsx-dev-runtime.react-server.production.js";
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
import { dgn, getMarketplaceAutoUpdate } from "../../utils/plugins/marketplaceAutoUpdate.js";
import { w } from "../../../vendor/react/compiler-runtime.js";
import { KeyboardShortcutHint } from "../../components/design-system/KeyboardShortcutHint.js";
import { kk } from "../../utils/plugins/commandSourceErrors.js";
import { isMarketplaceAutoUpdate, ANTHROPIC_PLUGIN_DIRECTORY } from "../../utils/plugins/schemas.js";

//@ chunk-vrb44rx7.js:103318-103453 placement
var BUILTIN_MARKETPLACE_OFF_NOTICE = `${OFFICIAL_MARKETPLACE_DISPLAY} is off. Plugins you installed from it stay installed and keep updating. Turn it back on in /plugin \u2192 Marketplaces.`;
//@ chunk-vrb44rx7.js:103453-122462 fingerprint = ManageMarketplaces (0.48)
function ManageMarketplaces({
  setViewState: setViewState,
  error: error,
  setError: setError,
  setResult: setResult,
  exitState: exitState,
  onManageComplete: onManageComplete,
  targetMarketplace: targetMarketplace,
  action: action,
}) {
  let { storageV5: storageV5, credentials: credentials } = Me(),
    K = useActivePlugins(),
    [V, B] = y([]),
    [_, J] = y([]),
    [pe, fe] = y({ available: [], hosted: [], browseOnly: [] }),
    [me, ne] = y(null),
    hasAttemptedAutoAction = R(null),
    [W, Oe] = y(!0),
    [rt, et] = y(0),
    [je, ae] = y(!1),
    [Se, kt] = y(null),
    [Tt, Ke] = y(null),
    [Et, He] = y(null),
    [ct, Ct] = y("list"),
    [oe, ft] = y(null),
    [at, Ot] = y("browse"),
    an = R(!1),
    Yt = useClock(),
    _e = R(void 0),
    qe = R(!0),
    vt = R(!1);
  (P(
    () => () => {
      ((qe.current = !1), _e.current?.());
    },
    [],
  ),
    P(() => {
      async function loadMarketplaces() {
        try {
          let Te = await loadKnownMarketplacesWithDeclared(storageV5),
            { enabled: enabled, disabled: disabled } = await loadAllPlugins(storageV5, credentials),
            allPlugins = [...enabled, ...disabled];
          J(Object.keys(getInstalledPlugins().plugins));
          let { marketplaces: marketplaces, failures: failures } = await loadMarketplacesWithErrors(
              Te,
              storageV5,
            ),
            Ce = await listClaudeAiMarketplaces(credentials).catch(() => null);
          ((hasAttemptedAutoAction.current = Ce),
            fe({ ...filterUnaddedClaudeAiMarketplaces(Ce, Te), browseOnly: Ce?.browseOnly ?? [] }));
          let Ve = await withOfficialMarketplaceRow(
            buildMarketplaceRows(marketplaces, failures, allPlugins, await readClaudeAiMarketplaceRegistry()),
            Te,
          );
          B(Ve);
          let successCount = count(marketplaces, (Jt) => Jt.data !== null),
            errorResult = formatMarketplaceLoadingErrors(failures, successCount);
          if (errorResult)
            if (
              errorResult.type === "warning" ||
              (targetMarketplace !== void 0 && action !== "remove" && action !== "update")
            )
              kt(errorResult.message);
            else throw Error(errorResult.message);
          if (targetMarketplace && !an.current && !error) {
            an.current = !0;
            let Jt =
                action === "remove" && isOfficialMarketplaceSpelling(targetMarketplace)
                  ? listReservedNameRefusals(Te).filter(({ name: xt }) =>
                      isOfficialMarketplaceName_2(targetMarketplace)
                        ? isOfficialMarketplaceName_2(xt)
                        : xt === targetMarketplace,
                    )
                  : [],
              targetIndex = Ve.findIndex(
                (xt) =>
                  xt.name === targetMarketplace ||
                  (xt.builtIn !== void 0 && isOfficialMarketplaceName_2(targetMarketplace)),
              );
            if (Jt.length > 0) {
              let xt = await removeMarketplaceWithReservedSiblings(
                  targetMarketplace,
                  void 0,
                  storageV5,
                  credentials,
                  { onlyIgnoredNameEntries: !0 },
                ),
                _t = [],
                Mt = !1;
              if (xt.kind === "ignored-plugin-directory-name-entry-removed") {
                Mt = xt.removedNames.length > 0;
                for (let removedName of xt.removedNames)
                  _t.push(removedMarketplaceMessage(removedName, QE()));
                let hn = blockedPluginsNotice(xt.disabledPluginIds, xt.disabledReason);
                if (hn !== null) _t.push(hn);
                if ((K.removeErrorsOf(xt.removedPluginIds), !Mt)) _t.push(ubr(targetMarketplace));
              } else if (xt.kind === "removed")
                ((Mt = !0),
                  _t.push(`Removed marketplace "${quotedPrintable(targetMarketplace)}"`),
                  K.removeErrorsOf(xt.removedPluginIds));
              if (Mt)
                logEvent("tengu_marketplace_removed", {
                  marketplace_name: r$e(targetMarketplace),
                  _PROTO_marketplace_name: targetMarketplace,
                  is_official_marketplace: isOfficialMarketplaceName_3(targetMarketplace),
                });
              (ic(storageV5, credentials),
                setResult(stripInvisibleKeepEmoji(`${re.tick} ${_t.join(" ")}`)),
                await onManageComplete(),
                setViewState({ type: "menu" }));
            } else if (targetIndex >= 0) {
              let xt = Ve[targetIndex];
              if (xt?.builtIn === "blocked" && action !== void 0 && action !== "confirm-remove") {
                et(targetIndex + 1);
                {
                  let _t = pluginDirectoryPolicyBlockHint();
                  if (action === "remove") kt(formatPluginDirectoryBlockedMessage(_t));
                  else kt(EPi(_t));
                }
              } else if (xt?.builtIn === "blocked") {
                let _t = `@${OFFICIAL_MARKETPLACE_NAME}`,
                  found = Object.keys(getInstalledPlugins().plugins).find((hn) => hn.endsWith(_t));
                if (found) {
                  setViewState({
                    type: "manage-plugins",
                    targetPlugin: found.slice(0, -_t.length),
                    targetMarketplace: OFFICIAL_MARKETPLACE_NAME,
                  });
                  return;
                }
                et(targetIndex + 1);
              } else if (action === "confirm-remove" && xt)
                (et(targetIndex + 1), ft(xt), _e.current?.(), Ct(xt.builtIn ? "details" : "confirm-remove"));
              else if (action === "remove" && xt?.builtIn) (et(targetIndex + 1), buildDetailsMenuOptions(!1));
              else if (action) {
                et(targetIndex + 1);
                let mapped = Ve.map((Mt, hn) =>
                  hn === targetIndex
                    ? { ...Mt, pendingUpdate: action === "update", pendingRemove: action === "remove" }
                    : Mt,
                );
                (B(mapped), applyChanges(mapped));
              } else if (xt) (et(targetIndex + 1), ft(xt), _e.current?.(), Ct("details"));
            } else setError(`Marketplace not found: ${targetMarketplace}`);
          }
        } catch (err) {
          let Ue = printableMessage(err);
          (setError(Ue), kt(Ue));
        } finally {
          Oe(!1);
        }
      }
      loadMarketplaces();
    }, [targetMarketplace, action, error]));
  let hasPendingChanges = () => V.some((state) => state.pendingUpdate || state.pendingRemove),
    getPendingCounts = () => {
      let updateCount = count(V, (Ue) => Ue.pendingUpdate),
        removeCount = count(V, (Ue) => Ue.pendingRemove);
      return { updateCount: updateCount, removeCount: removeCount };
    },
    applyChanges = async (states) => {
      if (vt.current) return;
      vt.current = !0;
      let Te = states || V,
        Ue = ct === "details";
      (ae(!0), kt(null), Ke(null), He(null));
      try {
        let dt = 0,
          Dt = 0,
          wt = null,
          We = [],
          Ce = [],
          refreshedMarketplaces = new Set();
        for (let state of Te) {
          if (state.pendingRemove) {
            if (state.installedPlugins.length > 0)
              await updateSettingsForSourceWithTransform(
                "userSettings",
                (de) => {
                  let newEnabledPlugins = { ...de?.enabledPlugins };
                  for (let plugin of state.installedPlugins) {
                    let pluginId = formatPluginId(plugin.name, state.name);
                    newEnabledPlugins[pluginId] = !1;
                  }
                  return { enabledPlugins: newEnabledPlugins };
                },
                void 0,
                storageV5,
              );
            let At = await removeMarketplaceWithReservedSiblings(state.name, void 0, storageV5, credentials);
            if ((Dt++, At.kind !== "plugin-directory-built-in")) K.removeErrorsOf(At.removedPluginIds);
            if (At.kind === "ignored-plugin-directory-name-entry-removed") {
              let de = blockedPluginsNotice(At.disabledPluginIds, At.disabledReason);
              wt = de === null ? null : stripInvisibleKeepEmoji(de);
            }
            logEvent("tengu_marketplace_removed", {
              marketplace_name: r$e(state.name),
              _PROTO_marketplace_name: state.name,
              is_official_marketplace: isOfficialMarketplaceName_3(state.name),
              plugins_uninstalled: state.installedPlugins.length,
            });
            continue;
          }
          if (state.pendingUpdate) {
            try {
              await refreshMarketplaceDeduped(state.name, storageV5, (message) => {
                He(message);
              });
            } catch (error) {
              if (error instanceof Bd) {
                (We.push(state.name),
                  logForDebugging(
                    `Marketplace ${state.name} not updated (managed policy): ${errorMessage(error)}`,
                  ));
                continue;
              }
              (Ce.push(state.name),
                logForDebugging(`Marketplace ${state.name} could not be refreshed: ${errorMessage(error)}`, {
                  level: "warn",
                }));
              continue;
            }
            (dt++,
              refreshedMarketplaces.add(state.name.toLowerCase()),
              logEvent("tengu_marketplace_updated", {
                marketplace_name: r$e(state.name),
                _PROTO_marketplace_name: state.name,
                is_official_marketplace: isOfficialMarketplaceName_3(state.name),
              }));
          }
        }
        let ke = 0,
          ht = 0,
          Jt = 0,
          qt = 0,
          xt = 0,
          _t = [],
          Mt = [];
        if (refreshedMarketplaces.size > 0) {
          let {
            updated: updated,
            blocked: blocked,
            updateFailedCount: updateFailedCount,
            commandSourceSkipped: commandSourceSkipped,
          } = await updatePluginsInMarketplaces(
            refreshedMarketplaces,
            new Set(),
            { skipCommandSources: !0 },
            storageV5,
          );
          ((ke = updated.length),
            (Mt = commandSourceSkipped),
            (ht = count(blocked, (mt) => mt.type === "autoupdate-deferred-entry-helper")),
            (Jt = count(blocked, (mt) => mt.type === "autoupdate-disabled-by-policy")),
            (qt = count(blocked, (mt) => mt.type === "autoupdate-blocked-by-pinner")),
            (xt = updateFailedCount));
          let filtered = blocked.filter(
            (mt) =>
              mt.type !== "autoupdate-deferred-entry-helper" &&
              mt.type !== "autoupdate-disabled-by-policy" &&
              mt.type !== "autoupdate-blocked-by-pinner",
          );
          if (filtered.length > 0 || updated.length > 0)
            notifyPluginsAutoUpdated(updated, filtered, [], { announce: !1 });
          _t = filtered.flatMap((mt) => ("plugin" in mt && typeof mt.plugin === "string" ? [mt.plugin] : []));
        }
        if ((ic(storageV5, credentials), await onManageComplete(), !qe.current)) return;
        let updatedPluginIds = await loadKnownMarketplacesWithDeclared(storageV5),
          { enabled: enabled, disabled: disabled } = await loadAllPlugins(storageV5, credentials);
        if (!qe.current) return;
        let allPlugins = [...enabled, ...disabled],
          { marketplaces: marketplaces, failures: failures } = await loadMarketplacesWithErrors(
            updatedPluginIds,
            storageV5,
          );
        if (!qe.current) return;
        fe((ze) => ({
          ...ze,
          ...filterUnaddedClaudeAiMarketplaces(hasAttemptedAutoAction.current, updatedPluginIds),
        }));
        let An = await withOfficialMarketplaceRow(
          buildMarketplaceRows(marketplaces, failures, allPlugins, await readClaudeAiMarketplaceRegistry()),
          updatedPluginIds,
        );
        if ((B(An), et((plugin) => Math.min(plugin, An.length)), Ue && oe)) {
          let updatedMarketplace = An.find((At) => At.name === oe.name);
          if (updatedMarketplace) ft(updatedMarketplace);
        }
        let Bn = [],
          Tn = Ue ? displayMarketplaceName : escapedDisplayText;
        if (dt > 0 || We.length > 0 || Ce.length > 0 || qt > 0 || xt > 0)
          Bn.push(
            formatMarketplaceUpdateSummary({
              updatedCount: dt,
              updatedPluginCount: ke,
              deferredPluginCount: ht,
              policyBlockedPluginCount: Jt,
              policyRefusedMarketplaces: We.map((ze) => Tn(ze)),
              failedMarketplaces: Ce.map((ze) => Tn(ze)),
              pinnedPluginCount: qt,
              failedPluginCount: xt,
              failedPluginNames: _t.map((ze) => Tn(ze)),
            }),
          );
        if (Mt.length > 0) {
          let ze = Mt.length,
            At = ze > 1,
            de = Mt.find(isSafeCliArg) ?? "",
            successMsg = `${At ? "(and the others) " : ""}to review (add --scope for a project/local install)`,
            Ne = `review and update ${At ? "each" : "it"} individually from the command line`;
          Bn.push(
            `${ze} command-sourced ${plural(ze, "plugin")} not updated here \u2014 ${runCommandHint("plugin update", de, { tail: successMsg, fallback: Ne })}`,
          );
        }
        if (Dt > 0) Bn.push(`Removed ${Dt} ${plural(Dt, "marketplace")}`);
        if (Bn.length > 0) {
          let At = `${marketplaceUpdateIcon({ failedCount: Ce.length + xt, updatedCount: dt + Dt, policyRefusedCount: We.length }) ?? re.warning} ${Bn.join(", ")}`,
            de = wt === null ? At : `${wt} ${At}`;
          if (Ue) Ke(de);
          else {
            if (!qe.current) return;
            (setResult(de),
              _e.current?.(),
              (_e.current = Yt.setTimeout(() => setViewState({ type: "menu" }), 2000)));
          }
        } else if (!Ue) {
          if (!qe.current) return;
          setViewState({ type: "menu" });
        }
      } catch (err) {
        let errorMsg = printableMessage(err);
        if (!qe.current) return;
        (kt(errorMsg), setError(errorMsg));
      } finally {
        if (((vt.current = !1), qe.current)) (ae(!1), He(null));
      }
    },
    confirmRemove = async () => {
      if (!oe) return;
      let newStates = V.map((state) => (state.name === oe.name ? { ...state, pendingRemove: !0 } : state));
      (B(newStates), await applyChanges(newStates));
    },
    yt = Q(() => {
      if (!oe) return [];
      if (oe.builtIn === "off") return [{ label: "Turn on", value: "turn-on" }];
      let le = [
        { label: `Browse plugins (${oe.pluginCount ?? 0})`, value: "browse" },
        {
          label: oe.lastUpdated
            ? r(Text, {
                children: [
                  "Update marketplace",
                  e(Text, {
                    dimColor: !0,
                    children: ` (last updated ${new Date(oe.lastUpdated).toLocaleDateString()})`,
                  }),
                ],
              })
            : "Update marketplace",
          value: "update",
        },
      ];
      if (oe.builtIn === "on")
        return (
          le.push({
            label: r(Text, {
              children: [
                "Turn off",
                e(Text, { dimColor: !0, children: " (plugins installed from it stay installed)" }),
              ],
            }),
            value: "turn-off",
          }),
          le
        );
      if (!shouldSkipPluginAutoupdate())
        le.push({
          label: oe.autoUpdate ? "Disable auto-update" : "Enable auto-update",
          value: "toggle-auto-update",
        });
      return (le.push({ label: "Remove marketplace", value: "remove" }), le);
    }, [oe]),
    Ut = R(!1),
    buildDetailsMenuOptions = async (marketplace) => {
      if (Ut.current) return;
      Ut.current = !0;
      try {
        let Te = await getPluginDirectoryState();
        try {
          await setPluginDirectoryEnabled(marketplace);
        } catch (error) {
          if (Te !== "unavailable")
            logDirectoryToggle({
              enabled: marketplace,
              surface: "ui",
              failure: Te === "blocked" ? "blocked_by_organization" : "settings_write_failed",
            });
          throw error;
        }
        if ((Te === "on") !== marketplace) logDirectoryToggle({ enabled: marketplace, surface: "ui" });
        (ic(storageV5, credentials),
          setResult(
            marketplace
              ? `${OFFICIAL_MARKETPLACE_DISPLAY} is on. Its plugins are back in /plugin \u2192 Discover.`
              : BUILTIN_MARKETPLACE_OFF_NOTICE,
          ),
          await onManageComplete(),
          setViewState({ type: "menu" }));
      } catch (error) {
        kt(printableName(errorMessage(error), 300));
      }
      Ut.current = !1;
    },
    handleToggleAutoUpdate = async (marketplace) => {
      let newAutoUpdate = !marketplace.autoUpdate;
      try {
        (await setMarketplaceAutoUpdate(marketplace.name, newAutoUpdate, storageV5),
          B((prev) =>
            prev.map((state) =>
              state.name === marketplace.name ? { ...state, autoUpdate: newAutoUpdate } : state,
            ),
          ),
          ft((prev) => (prev ? { ...prev, autoUpdate: newAutoUpdate } : prev)));
      } catch (err) {
        kt(printableMessage(err));
      }
    };
  (useKeybinding(
    "confirm:no",
    () => {
      (_e.current?.(), Ct("list"), Ot("browse"));
    },
    {
      context: "Confirmation",
      isActive: !je && (ct === "details" || ct === "confirm-remove" || ct === "confirm-add-claudeai"),
    },
  ),
    useKeybinding(
      "confirm:no",
      () => {
        (_e.current?.(),
          B((prev) => prev.map((state) => ({ ...state, pendingUpdate: !1, pendingRemove: !1 }))),
          et(0));
      },
      { context: "Confirmation", isActive: !je && ct === "list" && hasPendingChanges() },
    ),
    useKeybinding(
      "confirm:no",
      () => {
        setViewState({ type: "menu" });
      },
      { context: "Confirmation", isActive: !je && ct === "list" && !hasPendingChanges() },
    ),
    MessageActionsKeybindings(
      {
        "select:previous": () => et((prev) => Math.max(0, prev - 1)),
        "select:next": () => {
          let le = V.length + pe.available.length + pe.hosted.length + 1;
          et((prev) => Math.min(le - 1, prev + 1));
        },
        "select:accept": () => {
          _e.current?.();
          let le = rt - 1,
            Te = pe.available[le - V.length],
            Ue = pe.hosted[le - V.length - pe.available.length];
          if (rt === 0) setViewState({ type: "add-marketplace" });
          else if (hasPendingChanges()) applyChanges();
          else if (Te)
            setViewState({
              type: "add-marketplace",
              claudeAiListing: { name: Te.name, source: formatGitSourceSpec(Te.source) },
            });
          else if (Ue) (ne(Ue), kt(null), Ct("confirm-add-claudeai"));
          else {
            let dt = V[le];
            if (dt && dt.builtIn !== "blocked")
              (ft(dt), Ct("details"), Ot(dt.builtIn === "off" ? "turn-on" : "browse"));
          }
        },
      },
      { context: "Select", isActive: !je && ct === "list" },
    ));
  function mn(input) {
    if (input.ctrl || input.meta || je) return;
    let Te = rt - 1,
      Ue = V[Te]?.builtIn;
    if (Ue === "blocked") return;
    if (Ue !== void 0 && /^[udUD]$/.test(input.key)) {
      let dt = V[Te];
      if (dt && (Ue === "off" || input.key === "d" || input.key === "D")) {
        (input.preventDefault(),
          _e.current?.(),
          ft(dt),
          Ct("details"),
          Ot(Ue === "off" ? "turn-on" : "turn-off"));
        return;
      }
    }
    if ((input.key === "u" || input.key === "U") && Te >= 0)
      (input.preventDefault(),
        _e.current?.(),
        B((prev) =>
          prev.map((state, idx) =>
            idx === Te
              ? {
                  ...state,
                  pendingUpdate: !state.pendingUpdate,
                  pendingRemove: state.pendingUpdate ? state.pendingRemove : !1,
                }
              : state,
          ),
        ));
    else if ((input.key === "d" || input.key === "D") && Te >= 0) {
      let dt = V[Te];
      if (dt) (input.preventDefault(), ft(dt), _e.current?.(), Ct("confirm-remove"));
    }
  }
  let xn = (prev) => {
    if ((_e.current?.(), !oe)) return;
    switch (prev) {
      case "browse":
        setViewState({ type: "browse-marketplace", targetMarketplace: oe.name });
        return;
      case "update": {
        let mapped = V.map((Ue) => (Ue.name === oe.name ? { ...Ue, pendingUpdate: !0 } : Ue));
        (B(mapped), applyChanges(mapped));
        return;
      }
      case "toggle-auto-update":
        handleToggleAutoUpdate(oe);
        return;
      case "remove":
        Ct("confirm-remove");
        return;
      case "turn-on":
      case "turn-off":
        buildDetailsMenuOptions(prev === "turn-on");
    }
  };
  function Ln(le) {
    if (le.ctrl || le.meta || je) return;
    if (le.key === "y" || le.key === "Y") (le.preventDefault(), _e.current?.(), confirmRemove());
    else if (le.key === "n" || le.key === "N") (le.preventDefault(), _e.current?.(), Ct("list"), ft(null));
  }
  function Mn(le) {
    if (le.ctrl || le.meta || je) return;
    if ((le.key === "y" || le.key === "Y") && me) (le.preventDefault(), fn(me));
    else if (le.key === "n" || le.key === "N") (le.preventDefault(), Ct("list"), ne(null));
  }
  async function fn(prev) {
    (ae(!0), kt(null));
    try {
      let { name: Te } = await addClaudeAiMarketplace(prev, {
        configured: await loadKnownMarketplacesWithDeclared(storageV5),
        credentials: credentials,
      });
      if (
        (logEvent("tengu_marketplace_added", { source_type: lit("claudeai") }),
        ic(storageV5, credentials),
        await onManageComplete(),
        !qe.current)
      )
        return;
      (ne(null), setViewState({ type: "browse-marketplace", targetMarketplace: Te }));
    } catch (error) {
      if (qe.current) kt(printableMessage(error));
    } finally {
      if (qe.current) ae(!1);
    }
  }
  if (W) return e(Text, { children: "Loading marketplaces\u2026" });
  if (V.length === 0 && pe.available.length === 0 && pe.hosted.length === 0 && pe.browseOnly.length === 0)
    return r(Box, {
      flexDirection: "column",
      children: [
        e(Box, { marginBottom: 1, children: e(Text, { bold: !0, children: "Manage marketplaces" }) }),
        r(TwoColumnRow, {
          active: !0,
          flexDirection: "row",
          gap: 1,
          children: [
            r(Text, {
              color: "suggestion",
              children: [r(Text, { "aria-hidden": !0, children: [re.pointer, " "] }), "+"],
            }),
            e(Text, { bold: !0, color: "suggestion", children: "Add Marketplace" }),
          ],
        }),
        e(Box, {
          marginTop: 1,
          children: e(Text, {
            dimColor: !0,
            italic: !0,
            children: exitState.pending
              ? r(Fragment, { children: ["Press ", exitState.keyName, " again to go back"] })
              : r(Byline, {
                  children: [
                    e(ConfigurableShortcutHint, {
                      action: "select:accept",
                      context: "Select",
                      fallback: "Enter",
                      description: "select",
                    }),
                    e(ConfigurableShortcutHint, {
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
  if (ct === "confirm-add-claudeai" && me)
    return r(FocusColumn, {
      onKeyDown: Mn,
      children: [
        r(Text, { bold: !0, children: ["Add marketplace ", stripInvisibleKeepEmoji(me.name), "?"] }),
        me.displayName !== me.name &&
          r(Text, {
            dimColor: !0,
            children: [stripInvisibleKeepEmoji(hBr(me.name, me.displayName) ?? ""), " ", "on claude.ai"],
          }),
        r(Box, {
          flexDirection: "column",
          marginTop: 1,
          children: [
            r(Text, {
              dimColor: !0,
              children: ["Install its plugins with ", "<plugin>", "@", stripInvisibleKeepEmoji(me.name)],
            }),
            r(Text, {
              dimColor: !0,
              children: [
                "Hosted on claude.ai for",
                " ",
                me.scope === "org"
                  ? "your organization"
                  : me.scope === "account"
                    ? "you (your uploads)"
                    : "your account",
                ". Its plugins install from claude.ai.",
              ],
            }),
            je &&
              e(Box, {
                marginTop: 1,
                children: e(Text, { color: "claude", children: "Adding marketplace\u2026" }),
              }),
            Se && e(Box, { marginTop: 1, children: e(ErrorText, { error: stripInvisibleKeepNewlines(Se) }) }),
            !je &&
              e(Box, {
                marginTop: 1,
                children: r(Text, {
                  children: [
                    "Press ",
                    e(Text, { bold: !0, children: "y" }),
                    " to add or ",
                    e(Text, { bold: !0, children: "n" }),
                    " to cancel",
                  ],
                }),
              }),
          ],
        }),
      ],
    });
  if (ct === "confirm-remove" && oe) {
    let le = `@${oe.name}`,
      filtered = _.filter((state) => state.endsWith(le)),
      Ue = new Map(filtered.map((input) => [input, input.slice(0, -le.length)])),
      dt = [];
    for (let installedPlugin of oe.installedPlugins) {
      let Ce = findPluginName(filtered, installedPlugin.source);
      if (Ce === void 0) dt.push({ id: installedPlugin.source, name: installedPlugin.name });
      else Ue.set(Ce, installedPlugin.name);
    }
    let Dt = [...[...Ue].map(([We, Ce]) => ({ id: We, name: Ce })), ...dt],
      wt = Dt.length;
    return r(FocusColumn, {
      onKeyDown: Ln,
      children: [
        r(Text, {
          bold: !0,
          color: "warning",
          children: [
            "Remove marketplace",
            " ",
            e(Text, { italic: !0, children: stripInvisibleKeepEmoji(getMarketplaceDisplayName(oe)) }),
            "?",
          ],
        }),
        r(Box, {
          flexDirection: "column",
          children: [
            wt > 0 &&
              e(Box, {
                marginTop: 1,
                children: r(Text, {
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
              e(Box, {
                flexDirection: "column",
                marginTop: 1,
                marginLeft: 2,
                children: Dt.map((plugin) =>
                  e(
                    BulletRow,
                    { children: e(Text, { dimColor: !0, children: stripInvisibleKeepEmoji(plugin.name) }) },
                    plugin.id,
                  ),
                ),
              }),
            e(Box, {
              marginTop: 1,
              children: r(Text, {
                children: [
                  "Press ",
                  e(Text, { bold: !0, children: "y" }),
                  " to confirm or ",
                  e(Text, { bold: !0, children: "n" }),
                  " to cancel",
                ],
              }),
            }),
          ],
        }),
      ],
    });
  }
  if (ct === "details" && oe) {
    let le = oe.pendingUpdate || je;
    return r(Box, {
      flexDirection: "column",
      children: [
        e(Text, { bold: !0, children: stripInvisibleKeepEmoji(getMarketplaceDisplayName(oe)) }),
        e(Text, { dimColor: !0, children: stripInvisibleKeepEmoji(oe.source) }),
        oe.note !== void 0 && e(Text, { color: "warning", children: stripInvisibleKeepEmoji(oe.note) }),
        e(Box, {
          marginTop: 1,
          children:
            oe.builtIn === "off"
              ? r(Text, {
                  children: [
                    "Plugins listed by the ",
                    OFFICIAL_MARKETPLACE_DISPLAY,
                    ", installed at their listed commit. Turn it on to see them in Discover.",
                  ],
                })
              : r(Text, {
                  children: [
                    oe.pluginCount || 0,
                    " available",
                    " ",
                    plural(oe.pluginCount || 0, "plugin"),
                    oe.allHiddenByPolicy
                      ? r(Text, {
                          dimColor: !0,
                          children: [" ", "\xB7 hidden by your organization's policy"],
                        })
                      : null,
                  ],
                }),
        }),
        oe.installedPlugins.length > 0 &&
          r(Box, {
            flexDirection: "column",
            marginTop: 1,
            children: [
              r(Text, { bold: !0, children: ["Installed plugins (", oe.installedPlugins.length, "):"] }),
              e(Box, {
                flexDirection: "column",
                marginLeft: 1,
                children: oe.installedPlugins.map((plugin) =>
                  r(
                    BulletRow,
                    {
                      children: [
                        stripInvisibleKeepEmoji(plugin.name),
                        `
`,
                        e(Text, {
                          dimColor: !0,
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
        le &&
          r(Box, {
            marginTop: 1,
            flexDirection: "column",
            children: [
              e(Text, { color: "claude", children: "Updating marketplace\u2026" }),
              Et && e(Text, { dimColor: !0, children: stripInvisibleKeepEmoji(Et) }),
            ],
          }),
        !le &&
          Tt &&
          e(Box, {
            marginTop: 1,
            children: e(Text, { color: "claude", children: stripInvisibleKeepEmoji(Tt) }),
          }),
        !le &&
          Se &&
          e(Box, { marginTop: 1, children: e(ErrorText, { error: stripInvisibleKeepNewlines(Se) }) }),
        !le &&
          e(Box, {
            flexDirection: "column",
            marginTop: 1,
            children: e(PluginActionSelect, {
              options: yt,
              onSelect: xn,
              defaultFocusValue: at,
              onFocus: Ot,
            }),
          }),
        !le &&
          !shouldSkipPluginAutoupdate() &&
          oe.autoUpdate &&
          e(Box, {
            marginTop: 1,
            children: e(Text, {
              dimColor: !0,
              children:
                "Auto-update enabled. Claude Code will automatically update this marketplace and its installed plugins.",
            }),
          }),
        oe.builtIn === "on" && oe.autoUpdateDeclaredOff && !le && !shouldSkipPluginAutoupdate()
          ? e(Box, {
              marginTop: 1,
              children: e(Text, {
                dimColor: !0,
                children: `Auto-update is off: in extraKnownMarketplaces, the entry "${OFFICIAL_MARKETPLACE_NAME}" sets autoUpdate to false. Claude Code reads that entry only from ${dgn}.`,
              }),
            })
          : null,
        e(Box, {
          marginTop: 1,
          children: e(Text, {
            dimColor: !0,
            italic: !0,
            children: le
              ? e(Fragment, { children: "Please wait\u2026" })
              : r(Byline, {
                  children: [
                    e(ConfigurableShortcutHint, {
                      action: "select:accept",
                      context: "Select",
                      fallback: "Enter",
                      description: "select",
                    }),
                    e(ConfigurableShortcutHint, {
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
  let { updateCount: updateCount, removeCount: removeCount } = getPendingCounts();
  return r(FocusColumn, {
    onKeyDown: mn,
    children: [
      e(Box, { marginBottom: 1, children: e(Text, { bold: !0, children: "Manage marketplaces" }) }),
      r(TwoColumnRow, {
        active: rt === 0,
        flexDirection: "row",
        gap: 1,
        marginBottom: 1,
        children: [
          r(Text, {
            color: rt === 0 ? "suggestion" : void 0,
            children: [r(Text, { "aria-hidden": !0, children: [rt === 0 ? re.pointer : " ", " "] }), "+"],
          }),
          e(Text, { bold: !0, color: rt === 0 ? "suggestion" : void 0, children: "Add Marketplace" }),
        ],
      }),
      r(Box, {
        flexDirection: "column",
        children: [
          V.map((option, idx) => {
            let Ue = idx + 1 === rt,
              dt = [];
            if (option.pendingUpdate) dt.push("UPDATE");
            if (option.pendingRemove) dt.push("REMOVE");
            return r(
              TwoColumnRow,
              {
                active: Ue,
                flexDirection: "row",
                gap: 1,
                marginBottom: 1,
                children: [
                  r(Text, {
                    color: Ue ? "suggestion" : void 0,
                    children: [
                      r(Text, { "aria-hidden": !0, children: [Ue ? re.pointer : " ", " "] }),
                      option.pendingRemove
                        ? re.cross
                        : option.builtIn === "off"
                          ? re.radioOff
                          : option.builtIn === "blocked"
                            ? re.cross
                            : re.bullet,
                    ],
                  }),
                  r(Box, {
                    flexDirection: "column",
                    flexGrow: 1,
                    children: [
                      r(Box, {
                        flexDirection: "row",
                        gap: 1,
                        children: [
                          r(Text, {
                            bold: !0,
                            strikethrough: option.pendingRemove,
                            dimColor: option.pendingRemove,
                            children: [
                              option.name === "claude-plugins-official" &&
                                e(Text, { color: "claude", children: "\u273B " }),
                              stripInvisibleKeepEmoji(getMarketplaceDisplayName(option)),
                              option.name === "claude-plugins-official" &&
                                e(Text, { color: "claude", children: " \u273B" }),
                            ],
                          }),
                          dt.length > 0 && r(Text, { color: "warning", children: ["[", dt.join(", "), "]"] }),
                        ],
                      }),
                      e(Text, { dimColor: !0, children: stripInvisibleKeepEmoji(option.source) }),
                      option.note !== void 0 &&
                        e(Text, { color: "warning", children: stripInvisibleKeepEmoji(option.note) }),
                      r(Text, {
                        dimColor: !0,
                        children: [
                          option.pluginCount !== void 0 &&
                            r(Fragment, { children: [option.pluginCount, " available"] }),
                          option.allHiddenByPolicy
                            ? e(Fragment, { children: " \xB7 hidden by your organization's policy" })
                            : null,
                          option.installedPlugins.length > 0 &&
                            r(Fragment, {
                              children: [" \u2022 ", option.installedPlugins.length, " installed"],
                            }),
                          option.lastUpdated &&
                            r(Fragment, {
                              children: [
                                " ",
                                "\u2022 Updated",
                                " ",
                                new Date(option.lastUpdated).toLocaleDateString(),
                              ],
                            }),
                        ],
                      }),
                    ],
                  }),
                ],
              },
              option.name,
            );
          }),
          pe.available.map((le, Te) => {
            let Ue = V.length + Te + 1 === rt;
            return r(
              TwoColumnRow,
              {
                active: Ue,
                flexDirection: "row",
                gap: 1,
                marginBottom: 1,
                children: [
                  r(Text, {
                    color: Ue ? "suggestion" : void 0,
                    children: [r(Text, { "aria-hidden": !0, children: [Ue ? re.pointer : " ", " "] }), "+"],
                  }),
                  r(Box, {
                    flexDirection: "column",
                    flexGrow: 1,
                    children: [
                      e(Text, {
                        bold: !0,
                        children: stripInvisibleKeepEmoji(displayMarketplaceName(le.name)),
                      }),
                      r(Text, {
                        dimColor: !0,
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
            let Ue = V.length + pe.available.length + idx + 1 === rt;
            return r(
              TwoColumnRow,
              {
                active: Ue,
                flexDirection: "row",
                gap: 1,
                marginBottom: 1,
                children: [
                  r(Text, {
                    color: Ue ? "suggestion" : void 0,
                    children: [r(Text, { "aria-hidden": !0, children: [Ue ? re.pointer : " ", " "] }), "+"],
                  }),
                  r(Box, {
                    flexDirection: "column",
                    flexGrow: 1,
                    children: [
                      e(Text, { bold: !0, children: stripInvisibleKeepEmoji(state.name) }),
                      r(Text, {
                        dimColor: !0,
                        children: [
                          `hosted on claude.ai (${formatMarketplaceScopeLabel(state.scope)})`,
                          state.displayName !== state.name &&
                            ` \xB7 ${stripInvisibleKeepEmoji(hBr(state.name, state.displayName) ?? "")}`,
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
            e(
              Box,
              {
                marginBottom: 1,
                paddingLeft: 4,
                children: r(Text, {
                  dimColor: !0,
                  children: [stripInvisibleKeepEmoji(Qbt(le)), " ", "\xB7 browse on claude.ai"],
                }),
              },
              `claudeai-browse:${le.name}`,
            ),
          ),
        ],
      }),
      hasPendingChanges() &&
        r(Box, {
          marginTop: 1,
          flexDirection: "column",
          children: [
            r(Text, {
              children: [
                e(Text, { bold: !0, children: "Pending changes:" }),
                " ",
                e(Text, {
                  dimColor: !0,
                  children: e(ConfigurableShortcutHint, {
                    action: "select:accept",
                    context: "Select",
                    fallback: "Enter",
                    description: "apply",
                  }),
                }),
              ],
            }),
            updateCount > 0 &&
              r(BulletRow, { children: ["Update ", updateCount, " ", plural(updateCount, "marketplace")] }),
            removeCount > 0 &&
              r(BulletRow, {
                color: "warning",
                children: ["Remove ", removeCount, " ", plural(removeCount, "marketplace")],
              }),
          ],
        }),
      je &&
        e(Box, {
          marginTop: 1,
          children: e(Text, { color: "claude", children: "Processing changes\u2026" }),
        }),
      Se && e(Box, { marginTop: 1, children: e(ErrorText, { error: stripInvisibleKeepNewlines(Se) }) }),
      e(ManageMarketplacesKeyHints, {
        exitState: exitState,
        hasPendingActions: hasPendingChanges(),
        isOnInertRow: V[rt - 1]?.builtIn === "blocked",
        builtInRow: V[rt - 1]?.builtIn,
      }),
    ],
  });
}
//@ chunk-vrb44rx7.js:122462-123736 fingerprint = ManageMarketplacesKeyHints (0.783)
function ManageMarketplacesKeyHints(t0) {
  let T = w(23),
    {
      exitState: exitState,
      hasPendingActions: hasPendingActions,
      isOnInertRow: isOnInertRow,
      builtInRow: builtInRow,
    } = t0;
  if (exitState.pending) {
    let D;
    if (T[0] !== exitState.keyName)
      ((D = e(Box, {
        marginTop: 1,
        children: r(Text, {
          dimColor: !0,
          italic: !0,
          children: ["Press ", exitState.keyName, " again to go back"],
        }),
      })),
        (T[0] = exitState.keyName),
        (T[1] = D));
    else D = T[1];
    return D;
  }
  let D;
  if (T[2] !== hasPendingActions)
    ((D =
      hasPendingActions &&
      e(ConfigurableShortcutHint, {
        action: "select:accept",
        context: "Select",
        fallback: "Enter",
        description: "apply changes",
      })),
      (T[2] = hasPendingActions),
      (T[3] = D));
  else D = T[3];
  let U;
  if (T[4] !== hasPendingActions || T[5] !== isOnInertRow)
    ((U =
      !hasPendingActions &&
      !isOnInertRow &&
      e(ConfigurableShortcutHint, {
        action: "select:accept",
        context: "Select",
        fallback: "Enter",
        description: "select",
      })),
      (T[4] = hasPendingActions),
      (T[5] = isOnInertRow),
      (T[6] = U));
  else U = T[6];
  let L;
  if (T[7] !== builtInRow || T[8] !== hasPendingActions || T[9] !== isOnInertRow)
    ((L =
      !hasPendingActions &&
      !isOnInertRow &&
      builtInRow !== "off" &&
      e(KeyboardShortcutHint, { chord: "u", action: "update" })),
      (T[7] = builtInRow),
      (T[8] = hasPendingActions),
      (T[9] = isOnInertRow),
      (T[10] = L));
  else L = T[10];
  let A;
  if (T[11] !== builtInRow || T[12] !== hasPendingActions || T[13] !== isOnInertRow)
    ((A =
      !hasPendingActions &&
      !isOnInertRow &&
      e(KeyboardShortcutHint, {
        chord: "d",
        action: builtInRow === "on" ? "turn off" : builtInRow === "off" ? "turn on" : "remove",
      })),
      (T[11] = builtInRow),
      (T[12] = hasPendingActions),
      (T[13] = isOnInertRow),
      (T[14] = A));
  else A = T[14];
  const t5 = hasPendingActions ? "cancel" : "go back";
  let V;
  if (T[15] !== t5)
    ((V = e(ConfigurableShortcutHint, {
      action: "confirm:no",
      context: "Confirmation",
      fallback: "Esc",
      description: t5,
    })),
      (T[15] = t5),
      (T[16] = V));
  else V = T[16];
  let B;
  if (T[17] !== D || T[18] !== U || T[19] !== L || T[20] !== A || T[21] !== V)
    ((B = e(Box, {
      marginTop: 1,
      children: e(Text, { dimColor: !0, italic: !0, children: r(Byline, { children: [D, U, L, A, V] }) }),
    })),
      (T[17] = D),
      (T[18] = U),
      (T[19] = L),
      (T[20] = A),
      (T[21] = V),
      (T[22] = B));
  else B = T[22];
  return B;
}
//@ chunk-vrb44rx7.js:123736-123791 layout
function getMarketplaceDisplayName(i) {
  return i.builtIn !== void 0 ? OFFICIAL_MARKETPLACE_DISPLAY : displayMarketplaceName(i.name);
}
/**
 * 按官方市场可用状态（unavailable/blocked/off/on）在市场列表前插入或修正内置官方市场行：被组织屏蔽或关闭时插入占位行；已添加时标记 builtIn 并在插件全被策略隐藏时加标志。
 */
//@ chunk-vrb44rx7.js:123791-124310 layout
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
      let x = kk().catalogEntryNames?.size ?? 0;
      return marketplaces.map((T) =>
        T.name === OFFICIAL_MARKETPLACE_NAME
          ? { ...T, builtIn: "on", ...(T.pluginCount === 0 && x > 0 && { allHiddenByPolicy: !0 }) }
          : T,
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
function buildMarketplaceRows(i, h, k, C) {
  let x = getDeclaredMarketplaces();
  return i
    .map(({ name: D, config: config, data: L }) => {
      let filtered = k.filter((_) => _.source.endsWith(`@${D}`)),
        K = getMarketplaceSourceDisplay(config.source),
        V;
      if (config.source.source === "claudeai") {
        K = formatClaudeAiMarketplaceLabel(C[D]);
        let _ =
          L === null
            ? 0
            : count(filtered, (J) => {
                let found = L.plugins.find((plugin) => plugin.name === J.name);
                return (
                  found !== void 0 &&
                  typeof found.source === "object" &&
                  found.source.source === "claudeai" &&
                  found.source.version !== "" &&
                  basename(J.path).replace(/\.zip$/, "") !== found.source.version
                );
              });
        V =
          h.find((J) => J.name === D)?.error ??
          (_ > 0
            ? `${_} plugin ${plural(_, "update")} available \xB7 update the marketplace to apply`
            : void 0);
      }
      let B = getMarketplaceAutoUpdate(D, x);
      return {
        name: D,
        source: K,
        ...(V !== void 0 && { note: V }),
        lastUpdated: config.lastUpdated,
        pluginCount: L?.plugins.length,
        installedPlugins: filtered,
        pendingUpdate: !1,
        pendingRemove: !1,
        autoUpdate: isMarketplaceAutoUpdate(D, config, B),
        ...(B === !1 && { autoUpdateDeclaredOff: !0 }),
      };
    })
    .sort((D, U) => {
      if (D.name === ANTHROPIC_PLUGIN_DIRECTORY) return -1;
      if (U.name === ANTHROPIC_PLUGIN_DIRECTORY) return 1;
      return D.name.localeCompare(U.name);
    });
}
//@ chunk-vrb44rx7.js:125186-125190 placement
j();
//@ chunk-vrb44rx7.js:125190-125194 placement
j();

export { ManageMarketplaces };
