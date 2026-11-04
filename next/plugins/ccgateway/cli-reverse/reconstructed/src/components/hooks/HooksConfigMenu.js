/**
 * components/hooks/HooksConfigMenu.tsx
 *
 * /hooks 菜单：按事件 → 匹配器 → hook 三级浏览已配置的 hooks（只读，提示编辑 settings.json），区分来源与远程会话可用性。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/components/hooks/HooksConfigMenu.tsx
 * pieces: chunk-bajxb7bf.js (10)
 * attribution: sole-consumer 5, callgraph-fingerprint 1, file-local 2, affinity 1, fingerprint 1
 */
import { getSettings_DEPRECATED, getSettingsForSource } from "../../utils/settings/settings.js";
import { hasAnyPluginHook, SelectHookMode } from "./SelectHookMode.js";
import { useMemoCache } from "../../../vendor/react/compiler-runtime.js";
import { MEMO_CACHE_SENTINEL } from "../../../runtime/bun-runtime.js";
import { useState } from "../../../vendor/react/cjs/react.production.js";
import { useTheme_2 } from "../design-system/ThemeProvider.js";
import { useHost } from "../../context/session.js";
import { getCaps, getOriginalCwd } from "../../bootstrap/state.js";
import { deviceHooksProcessMemories } from "../../utils/hooks/deviceHooks/cloudRegistration.js";
import {
  buildCloudHookRows,
  renderCloudSessionBadge,
  HooksOverview,
  describeWhereHookRuns,
} from "./cloudHooks.js";
import { useSettingsSyncEffect, useAppState, useSessionHooksRegistry } from "../../state/AppState.js";
import {
  getHookEventMetadata,
  groupHooksByEventAndMatcher,
  getSortedMatchersForEvent,
  hooksForSourceAndEvent,
} from "../../utils/hooks/hooksConfigManager.js";
import { useKeybinding } from "../../keybindings/useKeybinding.js";
import { count } from "../../utils/collections.js";
import { plural } from "../../utils/stringUtils.js";
import {
  jsxProd_default,
  jsxProd_default_2,
} from "../../../vendor/react/cjs/react-jsx-dev-runtime.react-server.production.js";
import { KeyboardShortcutHint } from "../design-system/KeyboardShortcutHint.js";
import { ModelSelector } from "../agents/ModelSelector.js";
import { Text, Box } from "../../ink/components/Text.js";
import { hasPolicySettings } from "../../utils/plugins/managedPluginSeating.js";
import { Dialog } from "../design-system/Dialog.js";
import { isSafeMode, getSafeModeExitHint } from "../../utils/envUtils.js";
import { SelectEventMode } from "./SelectEventMode.js";
import { stripInvisibleChars } from "../../utils/invisibleChars.js";
import {
  deviceHooksConsentPath,
  setConsentFromGiven,
  emitConsentChangedSafe,
  writeDeviceHooksConsent,
  readDeviceHooksConsent,
} from "../../utils/hooks/deviceHooks/consent.js";
import { logEvent } from "../../services/analytics/index.js";
import { fromEnum } from "../../services/analytics/safeMetadata.js";
import { SelectMatcherMode } from "./SelectMatcherMode.js";
import { ViewHookMode } from "./ViewHookMode.js";

//@ chunk-bajxb7bf.js:48218-48310 sole-consumer (2.1.88 match: _temp, 1)
function areAllHooksDisabled() {
  return (
    getSettings_DEPRECATED()?.disableAllHooks === true &&
    getSettingsForSource("policySettings")?.disableAllHooks === true
  );
}
//@ chunk-bajxb7bf.js:48310-48380 sole-consumer (2.1.88 match: _temp2, 1)
function areOnlyManagedHooksAllowed() {
  return getSettingsForSource("policySettings")?.allowManagedHooksOnly === true;
}
//@ chunk-bajxb7bf.js:48380-48410 callgraph-fingerprint (2.1.88 match: _temp3, 1)
function selectMcp(s) {
  return s.mcp;
}
//@ chunk-bajxb7bf.js:48410-48441 file-local
function hookName(tool) {
  return tool.name;
}
//@ chunk-bajxb7bf.js:48441-48480 file-local
function sumWithCount(sum, hooks) {
  return sum + hooks.length;
}
//@ chunk-bajxb7bf.js:48563-48613 sole-consumer
function hasPluginHook(hooksByEvent) {
  return Object.values(hooksByEvent).some(hasAnyPluginHook);
}
//@ chunk-bajxb7bf.js:48613-48654 sole-consumer
function isHereHook(hook) {
  return hook.where === "here";
}
//@ chunk-bajxb7bf.js:48654-48696 sole-consumer
function isCloudHook(hook) {
  return hook.where === "cloud";
}
//@ chunk-bajxb7bf.js:48696-48728 affinity
function hookLabel(hook) {
  return hook.label;
}
//@ chunk-bajxb7bf.js:48728-57815 fingerprint (2.1.88 match: HooksConfigMenu, 0.495)
/**
 * /hooks 菜单：选择事件 → 匹配器 → hook → 详情；hooks 来自 user/project/local/policy/插件/会话，远程会话中标注哪些不会运行；只读，提示通过编辑 settings.json 或让 Claude 修改。
 */
function HooksConfigMenu(props) {
  let $ = useMemoCache(133);
  let { toolNames, onExit } = props;
  let t1;
  if ($[0] === MEMO_CACHE_SENTINEL) {
    t1 = {
      mode: "list",
    };
    $[0] = t1;
  } else t1 = $[0];
  let [modeState, setModeState] = useState(t1);
  let [focusIndex, setFocusIndex] = useState(0);
  let { storageV5 } = useTheme_2();
  let host = useHost();
  let getForwarding;
  if ($[1] !== host) {
    getForwarding = () => {
      let caps = getCaps();
      if (caps.workspace !== "remote") {
        return null;
      }
      return caps.transcriptSource !== "ccr-api"
        ? "remote_host"
        : deviceHooksProcessMemories.of(host).isAttached(getOriginalCwd())
          ? "cloud"
          : "off";
    };
    $[1] = host;
    $[2] = getForwarding;
  } else getForwarding = $[2];
  let [forwarding] = useState(getForwarding);
  let loadSummary;
  if ($[3] !== forwarding || $[4] !== host || $[5] !== storageV5) {
    loadSummary = () => {
      if (forwarding === null) {
        return null;
      }
      let processMemory = deviceHooksProcessMemories.of(host);
      return buildCloudHookRows({
        launchDir: getOriginalCwd(),
        storageV5,
        consentPin: processMemory.consentPin,
        senderMemory: processMemory.senderFor(getOriginalCwd()),
        processMemory,
        forwarding,
      });
    };
    $[3] = forwarding;
    $[4] = host;
    $[5] = storageV5;
    $[6] = loadSummary;
  } else loadSummary = $[6];
  let reloadSummary = loadSummary;
  let [summaryPromise, setSummaryPromise] = useState(reloadSummary);
  let [savedLine, setSavedLine] = useState(null);
  let [allDisabled, setAllDisabled] = useState(areAllHooksDisabled);
  let [restrictedByPolicy, setRestrictedByPolicy] = useState(areOnlyManagedHooksAllowed);
  let t2;
  if ($[7] === MEMO_CACHE_SENTINEL) {
    t2 = (source) => {
      if (source === "policySettings") {
        let policyDisabled = getSettings_DEPRECATED()?.disableAllHooks === true;
        setAllDisabled(policyDisabled && getSettingsForSource("policySettings")?.disableAllHooks === true);
        setRestrictedByPolicy(getSettingsForSource("policySettings")?.allowManagedHooksOnly === true);
      }
    };
    $[7] = t2;
  } else t2 = $[7];
  useSettingsSyncEffect(t2);
  let mode = modeState.mode;
  let selectedEvent = "event" in modeState ? modeState.event : "PreToolUse";
  let selectedMatcher = "matcher" in modeState ? modeState.matcher : null;
  let mcp = useAppState(selectMcp);
  let appStateStore = useSessionHooksRegistry();
  let t3;
  if ($[8] !== mcp.tools || $[9] !== toolNames) {
    t3 = [...toolNames, ...mcp.tools.map(hookName)];
    $[8] = mcp.tools;
    $[9] = toolNames;
    $[10] = t3;
  } else t3 = $[10];
  let toolNames_2 = t3;
  let eventMetadata;
  if ($[11] !== toolNames_2) {
    eventMetadata = getHookEventMetadata(toolNames_2);
    $[11] = toolNames_2;
    $[12] = eventMetadata;
  } else eventMetadata = $[12];
  let eventMetadata_2 = eventMetadata;
  let grouped;
  if ($[13] !== toolNames_2 || $[14] !== appStateStore) {
    grouped = groupHooksByEventAndMatcher(appStateStore, toolNames_2);
    $[13] = toolNames_2;
    $[14] = appStateStore;
    $[15] = grouped;
  } else grouped = $[15];
  let hooksByEventAndMatcher = grouped;
  let t5;
  if ($[16] !== hooksByEventAndMatcher || $[17] !== selectedEvent) {
    t5 = getSortedMatchersForEvent(hooksByEventAndMatcher, selectedEvent);
    $[16] = hooksByEventAndMatcher;
    $[17] = selectedEvent;
    $[18] = t5;
  } else t5 = $[18];
  let sortedMatchersForSelectedEvent = t5;
  let t6;
  if ($[19] !== hooksByEventAndMatcher || $[20] !== selectedEvent || $[21] !== selectedMatcher) {
    t6 = hooksForSourceAndEvent(hooksByEventAndMatcher, selectedEvent, selectedMatcher);
    $[19] = hooksByEventAndMatcher;
    $[20] = selectedEvent;
    $[21] = selectedMatcher;
    $[22] = t6;
  } else t6 = $[22];
  let hooksForSelectedMatcher = t6;
  let dismiss;
  if ($[23] !== onExit) {
    dismiss = () => {
      onExit("Hooks dialog dismissed", {
        display: "system",
      });
    };
    $[23] = onExit;
    $[24] = dismiss;
  } else dismiss = $[24];
  let dismiss_2 = dismiss;
  const isActive = mode === "list";
  let listKeyOpts;
  if ($[25] !== isActive) {
    listKeyOpts = {
      context: "Confirmation",
      isActive,
    };
    $[25] = isActive;
    $[26] = listKeyOpts;
  } else listKeyOpts = $[26];
  useKeybinding("confirm:no", dismiss_2, listKeyOpts);
  let backToList;
  if ($[27] === MEMO_CACHE_SENTINEL) {
    backToList = () => {
      setModeState({
        mode: "list",
      });
    };
    $[27] = backToList;
  } else backToList = $[27];
  const isActive_2 = mode === "select-event";
  let t9;
  if ($[28] !== isActive_2) {
    t9 = {
      context: "Confirmation",
      isActive: isActive_2,
    };
    $[28] = isActive_2;
    $[29] = t9;
  } else t9 = $[29];
  useKeybinding("confirm:no", backToList, t9);
  let t10;
  if ($[30] === MEMO_CACHE_SENTINEL) {
    t10 = () => {
      setModeState({
        mode: "select-event",
      });
    };
    $[30] = t10;
  } else t10 = $[30];
  const isActive_3 = mode === "select-matcher";
  let t12;
  if ($[31] !== isActive_3) {
    t12 = {
      context: "Confirmation",
      isActive: isActive_3,
    };
    $[31] = isActive_3;
    $[32] = t12;
  } else t12 = $[32];
  useKeybinding("confirm:no", t10, t12);
  let t13;
  if ($[33] !== eventMetadata_2 || $[34] !== modeState) {
    t13 = () => {
      if ("event" in modeState) {
        if (eventMetadata_2[modeState.event].matcherMetadata !== undefined)
          setModeState({
            mode: "select-matcher",
            event: modeState.event,
          });
        else
          setModeState({
            mode: "select-event",
          });
      }
    };
    $[33] = eventMetadata_2;
    $[34] = modeState;
    $[35] = t13;
  } else t13 = $[35];
  const isActive_4 = mode === "select-hook";
  let t15;
  if ($[36] !== isActive_4) {
    t15 = {
      context: "Confirmation",
      isActive: isActive_4,
    };
    $[36] = isActive_4;
    $[37] = t15;
  } else t15 = $[37];
  useKeybinding("confirm:no", t13, t15);
  let backFromViewHook;
  if ($[38] !== eventMetadata_2 || $[39] !== modeState) {
    backFromViewHook = () => {
      if (modeState.mode !== "view-hook") {
        return;
      }
      let { event, hook, from } = modeState;
      if (from === "list") {
        setModeState({
          mode: "list",
        });
        return;
      }
      let supportsMatcher = eventMetadata_2[event].matcherMetadata !== undefined;
      setModeState({
        mode: "select-hook",
        event,
        matcher: supportsMatcher ? hook.matcher || "" : "",
      });
    };
    $[38] = eventMetadata_2;
    $[39] = modeState;
    $[40] = backFromViewHook;
  } else backFromViewHook = $[40];
  let backFromViewHook_2 = backFromViewHook;
  const isActive_5 = mode === "view-hook";
  let t18;
  if ($[41] !== isActive_5) {
    t18 = {
      context: "Confirmation",
      isActive: isActive_5,
    };
    $[41] = isActive_5;
    $[42] = t18;
  } else t18 = $[42];
  useKeybinding("confirm:no", backFromViewHook_2, t18);
  let settings;
  if ($[43] === MEMO_CACHE_SENTINEL) {
    settings = getSettings_DEPRECATED();
    $[43] = settings;
  } else settings = $[43];
  let hooksDisabled = settings?.disableAllHooks === true;
  let t20;
  if ($[44] !== hooksByEventAndMatcher) {
    let byEvent = {};
    let total = 0;
    for (const [event, matchers] of Object.entries(hooksByEventAndMatcher)) {
      let eventCount = Object.values(matchers).reduce(sumWithCount, 0);
      byEvent[event] = eventCount;
      total = total + eventCount;
    }
    t20 = {
      hooksByEvent: byEvent,
      totalHooksCount: total,
    };
    $[44] = hooksByEventAndMatcher;
    $[45] = t20;
  } else t20 = $[45];
  let { hooksByEvent, totalHooksCount } = t20;
  let hasPluginHooks = Object.values(hooksByEventAndMatcher).some(hasPluginHook);
  let onDecideCloudHooks;
  if ($[46] !== forwarding || $[47] !== summaryPromise) {
    onDecideCloudHooks =
      summaryPromise === null || forwarding !== "cloud"
        ? undefined
        : () => {
            summaryPromise.then((summary) => {
              if (summary.consent === "off" || summary.consent === "remote_host") {
                return;
              }
              setModeState((state) =>
                state.mode === "cloud-consent" || (state.mode !== "list" && !hooksDisabled)
                  ? state
                  : {
                      mode: "cloud-consent",
                      offer: {
                        forwarded: count(summary.rows, isHereHook),
                        templateNames: summary.rows.filter(isCloudHook).map(hookLabel),
                      },
                      ...((summary.consent === "accepted" || summary.consent === "declined") && {
                        current: summary.consent,
                      }),
                    },
              );
            });
          };
    $[46] = forwarding;
    $[47] = summaryPromise;
    $[48] = onDecideCloudHooks;
  } else onDecideCloudHooks = $[48];
  let onDecideCloudHooks_2 = onDecideCloudHooks;
  if (hooksDisabled && modeState.mode !== "cloud-consent") {
    let disabledLabel = allDisabled ? "disabled by your organization" : "disabled";
    let subtitle;
    if ($[49] !== disabledLabel || $[50] !== totalHooksCount) {
      subtitle =
        totalHooksCount > 0
          ? `${disabledLabel} \xB7 ${totalHooksCount} ${plural(totalHooksCount, "hook")} not running`
          : disabledLabel;
      $[49] = disabledLabel;
      $[50] = totalHooksCount;
      $[51] = subtitle;
    } else subtitle = $[51];
    let inputGuide;
    if ($[52] === MEMO_CACHE_SENTINEL) {
      inputGuide = jsxProd_default(KeyboardShortcutHint, {
        chord: "escape",
        action: "close",
      });
      $[52] = inputGuide;
    } else inputGuide = $[52];
    let cloudBadge;
    if ($[53] !== savedLine || $[54] !== summaryPromise || $[55] !== hasPluginHooks) {
      cloudBadge =
        summaryPromise !== null &&
        jsxProd_default(renderCloudSessionBadge, {
          summaryPromise,
          savedLine: savedLine ?? undefined,
          hasPluginHooks,
        });
      $[53] = savedLine;
      $[54] = summaryPromise;
      $[55] = hasPluginHooks;
      $[56] = cloudBadge;
    } else cloudBadge = $[56];
    let decideSelector;
    if ($[57] !== onDecideCloudHooks_2 || $[58] !== dismiss_2) {
      decideSelector =
        onDecideCloudHooks_2 !== undefined &&
        jsxProd_default(ModelSelector, {
          options: [
            {
              label: jsxProd_default(Text, {
                color: "suggestion",
                children: "Decide whether cloud sessions run this machine's hooks\u2026",
              }),
              value: "decide",
              description: "Saved for this machine; change the answer here any time",
            },
          ],
          hideIndexes: true,
          onChange: () => onDecideCloudHooks_2(),
          onCancel: dismiss_2,
        });
      $[57] = onDecideCloudHooks_2;
      $[58] = dismiss_2;
      $[59] = decideSelector;
    } else decideSelector = $[59];
    let policySuffix;
    if ($[60] !== allDisabled) {
      policySuffix = !allDisabled && hasPolicySettings() && " Hooks set by your organization still run.";
      $[60] = allDisabled;
      $[61] = policySuffix;
    } else policySuffix = $[61];
    let disabledExplainer;
    if ($[62] !== policySuffix) {
      disabledExplainer = jsxProd_default_2(Text, {
        children: [
          "While hooks are disabled no hook command runs, the status line isn't shown, and tools run without hook checks.",
          policySuffix,
        ],
      });
      $[62] = policySuffix;
      $[63] = disabledExplainer;
    } else disabledExplainer = $[63];
    let reenableHint;
    if ($[64] !== allDisabled) {
      reenableHint =
        !allDisabled &&
        jsxProd_default(Text, {
          dimColor: true,
          children: 'To turn hooks back on, remove "disableAllHooks" from settings.json or ask Claude.',
        });
      $[64] = allDisabled;
      $[65] = reenableHint;
    } else reenableHint = $[65];
    let children;
    if (
      $[66] !== cloudBadge ||
      $[67] !== decideSelector ||
      $[68] !== disabledExplainer ||
      $[69] !== reenableHint
    ) {
      children = jsxProd_default_2(Box, {
        flexDirection: "column",
        gap: 1,
        children: [cloudBadge, decideSelector, disabledExplainer, reenableHint],
      });
      $[66] = cloudBadge;
      $[67] = decideSelector;
      $[68] = disabledExplainer;
      $[69] = reenableHint;
      $[70] = children;
    } else children = $[70];
    let t34;
    if ($[71] !== dismiss_2 || $[72] !== subtitle || $[73] !== children) {
      t34 = jsxProd_default(Dialog, {
        title: "Hooks",
        subtitle,
        onCancel: dismiss_2,
        inputGuide,
        children,
      });
      $[71] = dismiss_2;
      $[72] = subtitle;
      $[73] = children;
      $[74] = t34;
    } else t34 = $[74];
    return t34;
  }
  switch (modeState.mode) {
    case "list": {
      let suspendedBySafeMode;
      if ($[75] === MEMO_CACHE_SENTINEL) {
        suspendedBySafeMode = isSafeMode()
          ? {
              exitHint: getSafeModeExitHint(),
              managedHooksStillApply: hasPolicySettings(),
            }
          : undefined;
        $[75] = suspendedBySafeMode;
      } else suspendedBySafeMode = $[75];
      let cloudSessionPanel;
      if ($[76] !== savedLine || $[77] !== summaryPromise || $[78] !== hasPluginHooks) {
        cloudSessionPanel =
          summaryPromise === null
            ? undefined
            : jsxProd_default(renderCloudSessionBadge, {
                summaryPromise,
                savedLine: savedLine ?? undefined,
                hasPluginHooks,
              });
        $[76] = savedLine;
        $[77] = summaryPromise;
        $[78] = hasPluginHooks;
        $[79] = cloudSessionPanel;
      } else cloudSessionPanel = $[79];
      let onSelectHook;
      let onOpenEvents;
      if ($[80] === MEMO_CACHE_SENTINEL) {
        onSelectHook = (hook) => {
          setModeState({
            mode: "view-hook",
            event: hook.event,
            hook,
            from: "list",
          });
        };
        onOpenEvents = () => {
          setModeState({
            mode: "select-event",
          });
        };
        $[80] = onSelectHook;
        $[81] = onOpenEvents;
      } else {
        onSelectHook = $[80];
        onOpenEvents = $[81];
      }
      let overview;
      if (
        $[82] !== onDecideCloudHooks_2 ||
        $[83] !== dismiss_2 ||
        $[84] !== eventMetadata_2 ||
        $[85] !== hooksByEventAndMatcher ||
        $[86] !== focusIndex ||
        $[87] !== restrictedByPolicy ||
        $[88] !== cloudSessionPanel
      ) {
        overview = jsxProd_default(HooksOverview, {
          hookEventMetadata: eventMetadata_2,
          hooksByEventAndMatcher,
          restrictedByPolicy,
          suspendedBySafeMode,
          cloudSessionPanel,
          onDecideCloudHooks: onDecideCloudHooks_2,
          defaultFocusIndex: focusIndex,
          onFocusRow: setFocusIndex,
          onSelectHook,
          onOpenEvents,
          onCancel: dismiss_2,
        });
        $[82] = onDecideCloudHooks_2;
        $[83] = dismiss_2;
        $[84] = eventMetadata_2;
        $[85] = hooksByEventAndMatcher;
        $[86] = focusIndex;
        $[87] = restrictedByPolicy;
        $[88] = cloudSessionPanel;
        $[89] = overview;
      } else overview = $[89];
      return overview;
    }
    case "select-event": {
      let onSelectEvent;
      if ($[90] !== eventMetadata_2) {
        onSelectEvent = (event) => {
          if (eventMetadata_2[event].matcherMetadata !== undefined)
            setModeState({
              mode: "select-matcher",
              event,
            });
          else
            setModeState({
              mode: "select-hook",
              event,
              matcher: "",
            });
        };
        $[90] = eventMetadata_2;
        $[91] = onSelectEvent;
      } else onSelectEvent = $[91];
      let onCancel;
      if ($[92] === MEMO_CACHE_SENTINEL) {
        onCancel = () => {
          setModeState({
            mode: "list",
          });
        };
        $[92] = onCancel;
      } else onCancel = $[92];
      let selectEventView;
      if ($[93] !== eventMetadata_2 || $[94] !== hooksByEvent || $[95] !== onSelectEvent) {
        selectEventView = jsxProd_default(SelectEventMode, {
          hookEventMetadata: eventMetadata_2,
          hooksByEvent,
          onSelectEvent,
          onCancel,
        });
        $[93] = eventMetadata_2;
        $[94] = hooksByEvent;
        $[95] = onSelectEvent;
        $[96] = selectEventView;
      } else selectEventView = $[96];
      return selectEventView;
    }
    case "cloud-consent": {
      const forwarded = modeState.offer.forwarded;
      const templateNames = modeState.offer.templateNames;
      const currentConsent = modeState.current;
      let consentLocation;
      if ($[97] === MEMO_CACHE_SENTINEL) {
        consentLocation = stripInvisibleChars(deviceHooksConsentPath());
        $[97] = consentLocation;
      } else consentLocation = $[97];
      let onDone;
      if ($[98] !== host || $[99] !== reloadSummary || $[100] !== storageV5) {
        onDone = (event_2) => {
          setModeState({
            mode: "list",
          });
          logEvent("tengu_device_hooks_consent", {
            choice: fromEnum(event_2),
          });
          if (event_2 === "not_now") {
            return;
          }
          let processMemory = deviceHooksProcessMemories.of(host);
          setConsentFromGiven(processMemory.consentPin, event_2);
          emitConsentChangedSafe(processMemory.consentAnnounced, event_2);
          writeDeviceHooksConsent(event_2, readDeviceHooksConsent(storageV5)).then((saved) => {
            setSavedLine(
              `${saved ? "Saved" : "For this session only (the answer could not be written to disk)"}: ${event_2 === "accepted" ? "cloud sessions started from this machine may run its hooks" : "this machine's hooks stay on this machine"}.`,
            );
            setSummaryPromise(reloadSummary());
          });
        };
        $[98] = host;
        $[99] = reloadSummary;
        $[100] = storageV5;
        $[101] = onDone;
      } else onDone = $[101];
      let consentDialog;
      if (
        $[102] !== modeState.current ||
        $[103] !== modeState.offer.forwarded ||
        $[104] !== modeState.offer.templateNames ||
        $[105] !== consentLocation ||
        $[106] !== onDone
      ) {
        consentDialog = jsxProd_default(describeWhereHookRuns, {
          forwarded,
          templateNames,
          current: currentConsent,
          consentLocation,
          onDone,
        });
        $[102] = modeState.current;
        $[103] = modeState.offer.forwarded;
        $[104] = modeState.offer.templateNames;
        $[105] = consentLocation;
        $[106] = onDone;
        $[107] = consentDialog;
      } else consentDialog = $[107];
      return consentDialog;
    }
    case "select-matcher": {
      const t21 = eventMetadata_2[modeState.event];
      let onSelect;
      if ($[108] !== modeState.event) {
        onSelect = (matcher) => {
          setModeState({
            mode: "select-hook",
            event: modeState.event,
            matcher,
          });
        };
        $[108] = modeState.event;
        $[109] = onSelect;
      } else onSelect = $[109];
      let onCancel;
      if ($[110] === MEMO_CACHE_SENTINEL) {
        onCancel = () => {
          setModeState({
            mode: "select-event",
          });
        };
        $[110] = onCancel;
      } else onCancel = $[110];
      let t24;
      if (
        $[111] !== hooksByEventAndMatcher ||
        $[112] !== modeState.event ||
        $[113] !== sortedMatchersForSelectedEvent ||
        $[114] !== t21.description ||
        $[115] !== onSelect
      ) {
        t24 = jsxProd_default(SelectMatcherMode, {
          selectedEvent: modeState.event,
          matchersForSelectedEvent: sortedMatchersForSelectedEvent,
          hooksByEventAndMatcher,
          eventDescription: t21.description,
          onSelect,
          onCancel,
        });
        $[111] = hooksByEventAndMatcher;
        $[112] = modeState.event;
        $[113] = sortedMatchersForSelectedEvent;
        $[114] = t21.description;
        $[115] = onSelect;
        $[116] = t24;
      } else t24 = $[116];
      return t24;
    }
    case "select-hook": {
      const hookEventMetadata = eventMetadata_2[modeState.event];
      let onSelect;
      if ($[117] !== modeState.event) {
        onSelect = (hook) => {
          setModeState({
            mode: "view-hook",
            event: modeState.event,
            hook,
            from: "events",
          });
        };
        $[117] = modeState.event;
        $[118] = onSelect;
      } else onSelect = $[118];
      let onCancel;
      if ($[119] !== eventMetadata_2 || $[120] !== modeState.event) {
        onCancel = () => {
          if (eventMetadata_2[modeState.event].matcherMetadata !== undefined)
            setModeState({
              mode: "select-matcher",
              event: modeState.event,
            });
          else
            setModeState({
              mode: "select-event",
            });
        };
        $[119] = eventMetadata_2;
        $[120] = modeState.event;
        $[121] = onCancel;
      } else onCancel = $[121];
      let t24;
      if (
        $[122] !== hooksForSelectedMatcher ||
        $[123] !== modeState.event ||
        $[124] !== modeState.matcher ||
        $[125] !== hookEventMetadata ||
        $[126] !== onSelect ||
        $[127] !== onCancel
      ) {
        t24 = jsxProd_default(SelectHookMode, {
          selectedEvent: modeState.event,
          selectedMatcher: modeState.matcher,
          hooksForSelectedMatcher,
          hookEventMetadata,
          onSelect,
          onCancel,
        });
        $[122] = hooksForSelectedMatcher;
        $[123] = modeState.event;
        $[124] = modeState.matcher;
        $[125] = hookEventMetadata;
        $[126] = onSelect;
        $[127] = onCancel;
        $[128] = t24;
      } else t24 = $[128];
      return t24;
    }
    case "view-hook": {
      const eventSupportsMatcher = eventMetadata_2[modeState.event].matcherMetadata !== undefined;
      let viewHook;
      if ($[129] !== backFromViewHook_2 || $[130] !== modeState.hook || $[131] !== eventSupportsMatcher) {
        viewHook = jsxProd_default(ViewHookMode, {
          selectedHook: modeState.hook,
          eventSupportsMatcher,
          onCancel: backFromViewHook_2,
        });
        $[129] = backFromViewHook_2;
        $[130] = modeState.hook;
        $[131] = eventSupportsMatcher;
        $[132] = viewHook;
      } else viewHook = $[132];
      return viewHook;
    }
  }
}
export { HooksConfigMenu };
