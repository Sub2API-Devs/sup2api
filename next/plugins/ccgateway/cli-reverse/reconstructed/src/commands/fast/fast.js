/**
 * commands/fast/fast.tsx
 *
 * 并入旧版已有路径：/fast 命令（快速模式切换、Opus 4.8 快速模式下线提示）。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/commands/fast/fast.tsx
 * pieces: chunk-18hwfzwa.js (10), chunk-1n1kvmcz.js (8), chunk-aepeg2w5.js (1), chunk-ag5x7vhf.js (1), chunk-d1cgs5na.js (2), chunk-jbv0t0w5.js (1)
 * attribution: callgraph-fingerprint 1, layout 7, facade-exports 2, placement 9, fingerprint 4
 */
import {
  isFastModeSettingOn,
  isFastModeOrgPending,
  prefetchFastModeStatus,
  isFastModeEnabled,
  isFastModeActive,
  reportFastModeToggle,
  supportsFastMode,
  defaultOpusAlias,
  clearFastModeCooldown,
  clearFastRejectedFallbackModels,
  hasSessionIngressAuthForFastMode,
  syncFastModeFlag,
  getFastModeUnavailableMessage,
  defaultOpusLabel,
  getFastModeRuntimeState,
  getFastModeUnavailableReasonCode,
} from "../../utils/fastMode.js";
import {
  setMainLoopModelOverride,
  getIsNonInteractiveSession,
  setFlagSettingsInline,
  getFlagSettingsInline,
} from "../../bootstrap/state.js";
import { isBilledAsExtraUsage } from "../../utils/extraUsage.js";
import {
  isOpus1mMergeEnabled,
  parseUserSpecifiedModel,
  getPublicModelDisplayName,
} from "../../utils/model/modelDisplay.js";
import {
  useMainLoopModel_2,
  hasPreModelSwitchHook,
  recordSwitchIfChanged,
  serializeModelSwitch,
} from "../../utils/model/modelSwitchHooks.js";
import { getDefaultMainLoopModelSetting } from "../../utils/model/planModeModel.js";
import { isRemoteControlChannelAvailable, getRemoteCaps } from "../../remote/remoteMode.js";
import {
  runPreModelSwitchHooks,
  preModelSwitchBlockedMessage,
  sanitizeHookText,
} from "../model/modelSwitch.js";
import { applySessionSettingsPatch } from "../../state/applySessionSettingsPatch.js";
import { isBridgeEnvironment } from "../../utils/remoteEnvironment.js";
import { settingsChangeDetector } from "../../utils/settings/changeDetector.js";
import { invalidateCommandNames } from "../../utils/settings/commandSyncNames.js";
import { logForDebugging } from "../../utils/debug.js";
import { errorMessage, toError } from "../../utils/errors.js";
import { ControlRequestTimeoutError } from "../../remote/controlRequestErrors.js";
import { updateSettingsForSource } from "../../utils/settings/settings.js";
import { isOpus48Model } from "../../utils/model/promptBundles.js";
import { getFeatureValue_CACHED_MAY_BE_STALE } from "../../services/analytics/growthbook.js";
import { withDeadline } from "../../utils/sleep.js";
import { logEvent } from "../../services/analytics/index.js";
import { fromEnum, lit as lit_2 } from "../../services/analytics/safeMetadata.js";
import { getFastIconString, FastIcon } from "../../components/FastIcon.js";
import { MODEL_SET_TO_INFIX, toInlineCode, FAST_MODE_ON_TEXT } from "../model/modelMessages.js";
import { getMainLoopModel, isOpus5FamilyModel } from "../../utils/model/model.js";
import { getCanonicalName } from "../../utils/model/canonicalModelName.js";
import { formatModelPricing, getFastModeCosts } from "../../utils/modelCost.js";
import { FAST_TOGGLE_NOT_APPLIED, savedFastModeToggle } from "../config/configShorthand.js";
import { logError } from "../../utils/log.js";
import { useMemoCache } from "../../../vendor/react/compiler-runtime.js";
import { useRegisterOverlay } from "../../context/overlayContext.js";
import { useAppState, useSetAppState, useAppStateSession, useAppStoreDirect } from "../../state/AppState.js";
import { useNotifications } from "../../context/notifications.js";
import { useState, useEffect } from "../../../vendor/react/cjs/react.production.js";
import { MEMO_CACHE_SENTINEL } from "../../../runtime/bun-runtime.js";
import { isBridgeOrTransport } from "../../cli/transportState.js";
import { MessageActionsKeybindings } from "../../components/messageActions.js";
import {
  jsxProd_default,
  jsxProd_default_2,
  Fragment,
} from "../../../vendor/react/cjs/react-jsx-dev-runtime.react-server.production.js";
import { Text, Box } from "../../ink/components/Text.js";
import { PromptDialog } from "../../components/hooks/PromptDialog.js";
import { KeyboardShortcutHint } from "../../components/design-system/KeyboardShortcutHint.js";
import { Byline } from "../../components/design-system/Byline.js";
import { ErrorText } from "../../components/ErrorText.js";
import { formatDuration } from "../../utils/format.js";
import { LearnMoreLink } from "../../components/LearnMoreLink.js";
import { Dialog } from "../../components/design-system/Dialog.js";

//@ chunk-aepeg2w5.js:357680-357806 fingerprint (2.1.88 match: _temp3, 0.717)
/**
 * 按设置重算 fastMode 写回应用状态，开启时预取快速模式状态。
 */
function refreshFastModeFromSettings(session, setState, options) {
  setState((prev) => {
    let isOn = isFastModeSettingOn(prev.settings);
    return prev.fastMode === isOn
      ? prev
      : {
          ...prev,
          fastMode: isOn,
        };
  });
  if (isFastModeOrgPending(session().fastMode === true)) prefetchFastModeStatus(options);
}
//@ chunk-jbv0t0w5.js:37202-37589 fingerprint (2.1.88 match: applyFastMode, 0.495)
function applyFastMode(enable, setAppState) {
  let enabled;
  let reason;
  setAppState((prev) => {
    let requestedModel = enable.overrideValue ?? enable.forSessionValue ?? enable.appStateModel;
    let isActive = isFastModeEnabled() ? isFastModeActive(requestedModel, prev.fastMode) : !!prev.fastMode;
    enabled = prev.fastMode;
    reason = isActive;
    return prev.mainLoopModel === enable.appStateModel &&
      prev.mainLoopModelForSession === enable.forSessionValue &&
      isActive === !!prev.fastMode
      ? prev
      : {
          ...prev,
          mainLoopModel: enable.appStateModel,
          mainLoopModelForSession: enable.forSessionValue,
          fastMode: isActive,
        };
  });
  if (reason !== undefined) reportFastModeToggle(enabled, reason);
  setMainLoopModelOverride(enable.overrideValue);
}
//@ chunk-d1cgs5na.js:1502-1699 placement
function formatFastModeSuffix(previousModel, isFastMode, model, options) {
  let fastModeOn = isFastModeEnabled();
  let announceKept = fastModeOn && isFastMode && (!previousModel || options?.announceKeptOn === true);
  let announceOff = fastModeOn && !!previousModel && !isFastMode;
  return (
    (announceKept ? " \xB7 Fast mode ON" : "") +
    (isBilledAsExtraUsage(model, isFastMode, isOpus1mMergeEnabled())
      ? " \xB7 Draws from usage credits"
      : "") +
    (announceOff ? " \xB7 Fast mode OFF" : "")
  );
}
//@ chunk-d1cgs5na.js:1699-1834 fingerprint (2.1.88 match: handleFastModeShortcut, 0.484)
function handleFastModeShortcut(enable, getAppState, setAppState) {
  if (!!enable === getAppState) return null;
  return getAppState
    ? `Fast mode ON${isBilledAsExtraUsage(setAppState, true, isOpus1mMergeEnabled()) ? " \xB7 Draws from usage credits" : ""}`
    : "Fast mode OFF";
}
//@ chunk-1n1kvmcz.js:1254-1305 placement
/**
 * 快速模式预取超时 8000ms，以及"Fast mode unchanged (cancelled)"的取消文案。
 */
var FAST_MODE_PREFETCH_TIMEOUT_MS = 8000;
var FAST_MODE_CANCELLED_TEXT = "Fast mode unchanged (cancelled)";
//@ chunk-1n1kvmcz.js:1305-1429 placement
/**
 * 当前模型不支持快速模式时返回要切换到的 Opus 别名（与默认模型相同则返回 null）。
 */
function getFastModeSwitchModel(state) {
  if (
    supportsFastMode(
      useMainLoopModel_2({
        ...state,
        toolPermissionContext: {
          mode: "default",
        },
      }),
    )
  )
    return;
  let fallbackModel = defaultOpusAlias();
  return parseUserSpecifiedModel(fallbackModel) === parseUserSpecifiedModel(getDefaultMainLoopModelSetting())
    ? null
    : fallbackModel;
}
//@ chunk-1n1kvmcz.js:1429-1779 placement
async function confirmFastModeSwitch(state, model, signal) {
  let fastModeSwitchModel = getFastModeSwitchModel(model());
  if (fastModeSwitchModel === undefined || isRemoteControlChannelAvailable() || !hasPreModelSwitchHook(state))
    return {
      vetted: UNVETTED_FAST_MODE_RESULT,
      messages: [],
    };
  let hookResult = await runPreModelSwitchHooks(state, model, fastModeSwitchModel, "command", {
    signal,
  });
  if (hookResult.decision === "proceed")
    return {
      vetted: {
        target: fastModeSwitchModel,
      },
      messages: hookResult.messages,
    };
  return {
    refusal: preModelSwitchBlockedMessage(
      fastModeSwitchModel,
      hookResult.decision === "ask"
        ? `${hookResult.reason ?? "confirmation required"} (use /model to switch, then /fast)`
        : hookResult.reason,
      hookResult.messages,
    ),
  };
}
//@ chunk-1n1kvmcz.js:1779-1801 placement
/**
 * 未经校验的快速模式结果 {unvetted:true}，作为工作区切换的默认值。
 */
var UNVETTED_FAST_MODE_RESULT = {
  unvetted: true,
};
//@ chunk-1n1kvmcz.js:1801-2144 placement
/**
 * 工作区快速模式切换失败（timeout/stale/refused）的提示文本。
 */
function describeWorkspaceFastModeFailure(failure, isFastMode) {
  let stateLabel = isFastMode ? "enabled" : "disabled";
  switch (failure.kind) {
    case "timeout":
      return `No response from the workspace \u2014 fast mode may still have been ${stateLabel} there`;
    case "stale":
      return `Fast mode was not ${stateLabel}: the model changed while PreModelSwitch hooks ran; try again`;
    case "refused":
      return `Fast mode was not ${stateLabel} on the workspace: ${failure.reason}`;
  }
}
//@ chunk-1n1kvmcz.js:2144-3163 placement
function applyFastModeToWorkspace(
  fastSession,
  state,
  setAppState,
  confirm = true,
  storageV5,
  initial = UNVETTED_FAST_MODE_RESULT,
) {
  clearFastModeCooldown();
  if (state) clearFastRejectedFallbackModels();
  let apply = () => {
    if (confirm && !getIsNonInteractiveSession()) return;
    setFlagSettingsInline({
      ...(getFlagSettingsInline() ?? {}),
      fastMode: state,
    });
  };
  let runSwitch = () => {
    applySessionSettingsPatch(
      {
        fastMode: state,
      },
      setAppState,
    );
    if (state) {
      let failed = false;
      let result = null;
      setAppState((state) => {
        let fastModeSwitchModel = getFastModeSwitchModel(state);
        if (fastModeSwitchModel === undefined) return state;
        if (!("unvetted" in initial) && initial.target !== fastModeSwitchModel) return state;
        recordSwitchIfChanged(fastSession, state, fastModeSwitchModel, "command");
        failed = true;
        result = fastModeSwitchModel;
        return {
          ...state,
          mainLoopModel: fastModeSwitchModel,
          mainLoopModelForSession: null,
        };
      });
      if (failed && hasSessionIngressAuthForFastMode()) setMainLoopModelOverride(result);
    }
    if (!confirm)
      if (!isBridgeEnvironment() && hasSessionIngressAuthForFastMode())
        settingsChangeDetector.notifyChange("flagSettings");
      else invalidateCommandNames();
  };
  if (isRemoteControlChannelAvailable()) {
    apply();
    let request = getRemoteCaps()?.sendControlRequest({
      subtype: "apply_flag_settings",
      settings: {
        fastMode: state ? true : null,
        ...(state && {
          model: defaultOpusAlias(),
        }),
      },
    });
    if (!request) {
      runSwitch();
      return Promise.resolve(undefined);
    }
    return request.then(
      () => {
        runSwitch();
        return;
      },
      (error) => {
        logForDebugging(`fast mode: workspace did not accept apply_flag_settings: ${errorMessage(error)}`, {
          level: "error",
        });
        return error instanceof ControlRequestTimeoutError
          ? {
              kind: "timeout",
            }
          : {
              kind: "refused",
              reason: sanitizeHookText(errorMessage(error)),
            };
      },
    );
  }
  if (state && !("unvetted" in initial)) {
    let failed = false;
    setAppState((state) => {
      let fastModeSwitchModel = getFastModeSwitchModel(state);
      failed = fastModeSwitchModel !== undefined && fastModeSwitchModel !== initial.target;
      return state;
    });
    if (failed)
      return Promise.resolve({
        kind: "stale",
      });
  }
  apply();
  syncFastModeFlag(state, storageV5);
  if (confirm)
    updateSettingsForSource(
      "userSettings",
      {
        fastMode: state ? true : undefined,
      },
      undefined,
      storageV5,
    );
  runSwitch();
  return Promise.resolve(undefined);
}
//@ chunk-1n1kvmcz.js:3163-3567 placement
function opus48FastModeDeprecationNotice(model) {
  if (!isOpus48Model(model)) return null;
  let featureValue_CACHED_MAY_BE_STALE = getFeatureValue_CACHED_MAY_BE_STALE(
    "tengu_sunset_penguin_opus48",
    "2026-11-30",
  );
  let timestamp = Date.parse(featureValue_CACHED_MAY_BE_STALE);
  if (Number.isNaN(timestamp) || Date.now() >= timestamp) return null;
  return {
    key: "opus48-fast-mode-deprecation",
    text: `Opus 4.8 fast mode is deprecated and will be removed on ${new Date(timestamp).toLocaleDateString(
      "en-US",
      {
        month: "short",
        day: "numeric",
        timeZone: "UTC",
      },
    )}`,
    priority: "immediate",
    requeueOnPreempt: true,
    color: "warning",
  };
}
//@ chunk-1n1kvmcz.js:3567-4963 placement
async function toggleFastMode(
  session,
  fastSession,
  model,
  setAppState,
  updateAppState,
  persist = true,
  storageV5,
  storage,
  signal,
  onApplied,
  options,
  onQueryEvent,
) {
  let runConfirm = () =>
    serializeModelSwitch(session, async () => {
      if (storage) await withDeadline(storage(), FAST_MODE_PREFETCH_TIMEOUT_MS);
      if (signal?.aborted)
        return {
          kind: "refused",
          refusal: FAST_MODE_CANCELLED_TEXT,
        };
      let fastModeUnavailableMessage = getFastModeUnavailableMessage(undefined, {
        sessionOptIn: !persist && !isBridgeEnvironment() && hasSessionIngressAuthForFastMode(),
        sessionOnly: !persist || getIsNonInteractiveSession(),
      });
      if (fastModeUnavailableMessage && fastSession)
        return {
          kind: "refused",
          refusal: `Fast mode unavailable: ${fastModeUnavailableMessage}`,
        };
      let vetted = UNVETTED_FAST_MODE_RESULT;
      let hookMessages = [];
      if (fastSession) {
        let confirmed = await confirmFastModeSwitch(session, model, signal);
        if (signal?.aborted)
          return {
            kind: "refused",
            refusal: FAST_MODE_CANCELLED_TEXT,
          };
        if (confirmed.refusal !== undefined)
          return {
            kind: "refused",
            refusal: confirmed.refusal,
          };
        vetted = confirmed.vetted;
        hookMessages = confirmed.messages;
      }
      let willPromote = fastSession && getFastModeSwitchModel(model()) !== undefined;
      onApplied?.();
      return {
        kind: "applied",
        remote: await applyFastModeToWorkspace(session, fastSession, setAppState, persist, storageV5, vetted),
        willPromote,
        hookMessages,
      };
    });
  let state = {};
  let precomputed =
    persist && options !== undefined && !isRemoteControlChannelAvailable()
      ? await options(fastSession, async () => {
          state.outcome = await runConfirm();
          if (state.outcome.kind === "refused") return state.outcome.refusal;
          return state.outcome.remote === undefined
            ? undefined
            : describeWorkspaceFastModeFailure(state.outcome.remote, fastSession);
        })
      : undefined;
  let outcome = state.outcome ?? (precomputed === undefined ? await runConfirm() : undefined);
  if (outcome === undefined)
    return signal?.aborted ? FAST_MODE_CANCELLED_TEXT : (precomputed ?? "Fast mode was not changed");
  if (outcome.kind === "refused") return outcome.refusal;
  if (outcome.remote !== undefined) return describeWorkspaceFastModeFailure(outcome.remote, fastSession);
  logEvent("tengu_fast_mode_toggled", {
    enabled: fastSession,
    source: fromEnum(updateAppState),
    remote: isRemoteControlChannelAvailable(),
  });
  if (fastSession) {
    let fastIconString = getFastIconString(true);
    let promoteText = outcome.willPromote ? `${MODEL_SET_TO_INFIX}${toInlineCode(defaultOpusLabel())}` : "";
    let mainLoopModel = getMainLoopModel();
    let canonicalName = getCanonicalName(
      supportsFastMode(mainLoopModel) ? mainLoopModel : parseUserSpecifiedModel(defaultOpusAlias()),
    );
    let pricing = formatModelPricing(getFastModeCosts(canonicalName));
    let deprecationNote = opus48FastModeDeprecationNotice(canonicalName);
    if (deprecationNote)
      onQueryEvent?.({
        type: "notification",
        notification: deprecationNote,
      });
    let sessionSuffix = persist ? "" : " (this session only)";
    let content =
      outcome.hookMessages.length > 0
        ? `
${outcome.hookMessages.map(sanitizeHookText).join(`
`)}`
        : "";
    return `${fastIconString} ${FAST_MODE_ON_TEXT}${promoteText} \xB7 ${pricing}${sessionSuffix}${content}`;
  } else return `Fast mode OFF${persist ? "" : " (this session only)"}`;
}
//@ chunk-ag5x7vhf.js:112894-112980 fingerprint (2.1.88 match: _temp, 0.398)
function unknownModelWindowModel(s) {
  return s.setupIssues.unknownModelWindowWarning ? s.mainLoopModel : null;
}
//@ chunk-18hwfzwa.js:514768-514804 callgraph-fingerprint (2.1.88 match: _temp2, 1)
function selectFastMode(s_0) {
  return s_0.fastMode;
}
//@ chunk-18hwfzwa.js:514804-514851 layout
function fastToggleNotAppliedIfUnset(result) {
  return result === undefined ? undefined : FAST_TOGGLE_NOT_APPLIED;
}
//@ chunk-18hwfzwa.js:514851-514894 layout
function dropNotAppliedResult(result) {
  return result === FAST_TOGGLE_NOT_APPLIED ? undefined : result;
}
//@ chunk-18hwfzwa.js:514894-514937 layout
function withFastModeOff(prev) {
  return {
    ...prev,
    fastMode: false,
  };
}
//@ chunk-18hwfzwa.js:514937-514970 layout
function logErrorOnly(error) {
  return logError(toError(error));
}
//@ chunk-18hwfzwa.js:514970-514997 layout
function negate_3(value) {
  return !value;
}
//@ chunk-18hwfzwa.js:514997-515039 layout
function newAbortController() {
  return new AbortController();
}
//@ chunk-18hwfzwa.js:515039-519401 facade-exports (2.1.88 match: FastModePicker, 0.729)
function FastModePicker(props) {
  let $ = useMemoCache(23);
  let { onDone, unavailableReason, storageV5 } = props;
  useRegisterOverlay("fast-mode-picker");
  let model = useAppState(selectFastMode);
  let setAppState = useSetAppState();
  let appStateSession = useAppStateSession();
  let setAppState_2 = useAppStoreDirect();
  let { addNotification } = useNotifications();
  let [applyColor, setApplyColor] = useState(model ?? false);
  let [busy, setBusy] = useState(false);
  let [error, setError] = useState(null);
  let content;
  if ($[0] === MEMO_CACHE_SENTINEL) {
    content = getFastModeRuntimeState();
    $[0] = content;
  } else content = $[0];
  let runtimeState = content;
  let onCooldown = runtimeState.status === "cooldown";
  let isUnavailable = unavailableReason !== null;
  let mainLoopModel = getMainLoopModel();
  let canonicalName = getCanonicalName(
    supportsFastMode(mainLoopModel) ? mainLoopModel : parseUserSpecifiedModel(defaultOpusAlias()),
  );
  let fastIcon = formatModelPricing(getFastModeCosts(canonicalName));
  let needsConsent = isOpus48Model(canonicalName) || isOpus5FamilyModel(canonicalName);
  let handleToggle = function handleToggle() {
    if (isUnavailable || busy) {
      return;
    }
    if (applyColor) {
      let abortController = new AbortController();
      setError(abortController);
      setBusy(true);
      let failed = false;
      serialize(() =>
        serializeModelSwitch(appStateSession, () =>
          confirmFastModeSwitch(appStateSession, setAppState_2.getState, abortController.signal).then(
            async (confirmation) => {
              if (abortController.signal.aborted) {
                return FAST_TOGGLE_NOT_APPLIED;
              }
              if (confirmation.refusal !== undefined) {
                return confirmation.refusal;
              }
              setError(null);
              failed = true;
              return (await apply(confirmation.vetted, confirmation.messages)) === undefined
                ? undefined
                : FAST_TOGGLE_NOT_APPLIED;
            },
          ),
        ),
      )
        .then((applied) => {
          if (abortController.signal.aborted) {
            return;
          }
          if (applied !== undefined) {
            setBusy(false);
            onDone(applied, {
              display: "system",
            });
          }
        })
        .catch((error) => {
          setBusy(false);
          if (abortController.signal.aborted) {
            return;
          }
          logError(toError(error));
          onDone(
            failed
              ? "Fast mode was not changed: applying it failed"
              : "Fast mode was not changed: the PreModelSwitch check failed",
            {
              display: "system",
            },
          );
        });
      return;
    }
    setBusy(true);
    serialize(() => serializeModelSwitch(appStateSession, () => apply()).then(fastToggleNotAppliedIfUnset))
      .then((done) => {
        if (done !== undefined) {
          setBusy(false);
          onDone(done, {
            display: "system",
          });
        }
      })
      .catch((error) => {
        setBusy(false);
        logError(toError(error));
        onDone("Fast mode was not changed: applying it failed", {
          display: "system",
        });
      });
  };
  function serialize(applyJob) {
    return isRemoteControlChannelAvailable()
      ? applyJob().then(dropNotAppliedResult)
      : savedFastModeToggle(
          applyColor,
          {
            getAppState: setAppState_2.getState,
            setAppState,
            session: appStateSession,
            storageV5,
            options: {
              mcpClients: [],
            },
          },
          applyJob,
          () => isBridgeOrTransport(appStateSession),
        );
  }
  function apply(vetted, messages) {
    let vettedResult = vetted === undefined ? UNVETTED_FAST_MODE_RESULT : vetted;
    let hookMessages = messages === undefined ? [] : messages;
    let canSwitch = getFastModeSwitchModel(setAppState_2.getState()) !== undefined;
    let workspaceApply = applyFastModeToWorkspace(
      appStateSession,
      applyColor,
      setAppState,
      undefined,
      storageV5,
      vettedResult,
    );
    logEvent("tengu_fast_mode_toggled", {
      enabled: applyColor,
      source: lit_2("picker"),
      remote: isRemoteControlChannelAvailable(),
    });
    let notice =
      hookMessages.length > 0
        ? `
${hookMessages.map(sanitizeHookText).join(`
`)}`
        : "";
    let prefix = applyColor
      ? `${getFastIconString(applyColor)} ${FAST_MODE_ON_TEXT}${canSwitch ? `${MODEL_SET_TO_INFIX}${toInlineCode(defaultOpusLabel())}` : ""} \xB7 ${fastIcon}${notice}`
      : "Fast mode OFF";
    let deprecationNote = applyColor ? opus48FastModeDeprecationNotice(canonicalName) : null;
    if (!isRemoteControlChannelAvailable()) {
      if (!applyColor) setAppState(withFastModeOff);
      return workspaceApply.then((result) => {
        setBusy(false);
        if (result === undefined && deprecationNote) addNotification(deprecationNote);
        onDone(result === undefined ? prefix : describeWorkspaceFastModeFailure(result, applyColor));
        return result;
      });
    }
    setBusy(true);
    return workspaceApply.then((fallback) => {
      setBusy(false);
      if (fallback === undefined && deprecationNote) addNotification(deprecationNote);
      onDone(fallback === undefined ? prefix : describeWorkspaceFastModeFailure(fallback, applyColor));
      return fallback;
    });
  }
  let panelContent;
  if (
    $[1] !== model ||
    $[2] !== isUnavailable ||
    $[3] !== onDone ||
    $[4] !== appStateSession ||
    $[5] !== setAppState ||
    $[6] !== storageV5
  ) {
    panelContent = function handleCancel() {
      if (isUnavailable) {
        if (model)
          serializeModelSwitch(appStateSession, () =>
            applyFastModeToWorkspace(appStateSession, false, setAppState, undefined, storageV5),
          ).catch(logErrorOnly);
        onDone("Fast mode OFF", {
          display: "system",
        });
        return;
      }
      let message = model ? `${getFastIconString()} Kept Fast mode ON` : "Kept Fast mode OFF";
      onDone(message, {
        display: "system",
      });
    };
    $[1] = model;
    $[2] = isUnavailable;
    $[3] = onDone;
    $[4] = appStateSession;
    $[5] = setAppState;
    $[6] = storageV5;
    $[7] = panelContent;
  } else panelContent = $[7];
  let handleCancel = panelContent;
  let footer;
  if ($[8] !== isUnavailable) {
    footer = function handleToggle() {
      if (isUnavailable) {
        return;
      }
      setApplyColor(negate_3);
    };
    $[8] = isUnavailable;
    $[9] = footer;
  } else footer = $[9];
  let handleToggle_2 = footer;
  let statusLine;
  if ($[10] === MEMO_CACHE_SENTINEL) {
    statusLine = {
      context: "Confirmation",
    };
    $[10] = statusLine;
  } else statusLine = $[10];
  MessageActionsKeybindings(
    {
      "confirm:yes": handleToggle,
      "confirm:nextField": handleToggle_2,
      "confirm:next": handleToggle_2,
      "confirm:previous": handleToggle_2,
      "confirm:cycleMode": handleToggle_2,
      "confirm:toggle": handleToggle_2,
    },
    statusLine,
  );
  let body;
  if ($[11] === MEMO_CACHE_SENTINEL) {
    body = jsxProd_default(FastIcon, {
      cooldown: onCooldown,
    });
    $[11] = body;
  } else body = $[11];
  let title = jsxProd_default_2(Text, {
    children: [body, " Fast mode", needsConsent && " (research preview)"],
  });
  if (busy) {
    if (error !== null) {
      let hint;
      if ($[12] !== error || $[13] !== onDone) {
        hint = jsxProd_default(PromptDialog, {
          message: "Running PreModelSwitch hooks\u2026",
          onCancel: () => {
            error.abort();
            setError(null);
            setBusy(false);
            onDone(FAST_MODE_CANCELLED_TEXT, {
              display: "system",
            });
          },
        });
        $[12] = error;
        $[13] = onDone;
        $[14] = hint;
      } else hint = $[14];
      return hint;
    }
    const children = isRemoteControlChannelAvailable()
      ? "Waiting for the workspace\u2026"
      : "Applying fast mode\u2026";
    let details;
    if ($[15] === MEMO_CACHE_SENTINEL) {
      details = jsxProd_default(Text, {
        dimColor: true,
        children,
      });
      $[15] = details;
    } else details = $[15];
    return details;
  }
  const subtitle = `High-speed mode for ${getPublicModelDisplayName(canonicalName) ?? "Opus"}. Draws from usage credits at a higher rate. Separate rate limits apply.`;
  let inputGuide;
  if ($[16] !== isUnavailable) {
    inputGuide = isUnavailable
      ? jsxProd_default(KeyboardShortcutHint, {
          chord: "escape",
          action: "cancel",
        })
      : jsxProd_default_2(Byline, {
          children: [
            jsxProd_default(KeyboardShortcutHint, {
              chord: "space",
              action: "toggle",
            }),
            jsxProd_default(KeyboardShortcutHint, {
              chord: "enter",
              action: "confirm",
            }),
            jsxProd_default(KeyboardShortcutHint, {
              chord: "escape",
              action: "cancel",
            }),
          ],
        });
    $[16] = isUnavailable;
    $[17] = inputGuide;
  } else inputGuide = $[17];
  let footerRow;
  if ($[18] !== applyColor || $[19] !== fastIcon || $[20] !== unavailableReason) {
    footerRow = unavailableReason
      ? jsxProd_default(Box, {
          marginLeft: 2,
          children: jsxProd_default(ErrorText, {
            error: unavailableReason,
          }),
        })
      : jsxProd_default_2(Fragment, {
          children: [
            jsxProd_default(Box, {
              flexDirection: "column",
              gap: 0,
              marginLeft: 2,
              children: jsxProd_default_2(Box, {
                flexDirection: "row",
                gap: 2,
                children: [
                  jsxProd_default(Text, {
                    bold: true,
                    children: "Fast mode",
                  }),
                  jsxProd_default(Text, {
                    color: applyColor ? "fastMode" : undefined,
                    bold: applyColor,
                    children: applyColor ? "ON " : "OFF",
                  }),
                  jsxProd_default(Text, {
                    dimColor: true,
                    children: fastIcon,
                  }),
                ],
              }),
            }),
            onCooldown &&
              runtimeState.status === "cooldown" &&
              jsxProd_default(Box, {
                marginLeft: 2,
                children: jsxProd_default_2(Text, {
                  color: "warning",
                  children: [
                    runtimeState.reason === "overloaded"
                      ? "Fast mode overloaded and is temporarily unavailable"
                      : "You've hit your fast limit",
                    " \xB7 resets in ",
                    formatDuration(runtimeState.resetAt - Date.now(), {
                      hideTrailingZeros: true,
                    }),
                  ],
                }),
              }),
          ],
        });
    $[18] = applyColor;
    $[19] = fastIcon;
    $[20] = unavailableReason;
    $[21] = footerRow;
  } else footerRow = $[21];
  let lastRow;
  if ($[22] === MEMO_CACHE_SENTINEL) {
    lastRow = jsxProd_default(LearnMoreLink, {
      url: "https://code.claude.com/docs/en/fast-mode",
    });
    $[22] = lastRow;
  } else lastRow = $[22];
  return jsxProd_default_2(Dialog, {
    title,
    subtitle,
    onCancel: handleCancel,
    color: "fastMode",
    inputGuide,
    children: [footerRow, lastRow],
  });
}
//@ chunk-18hwfzwa.js:519401-520970 layout
/**
 * /fast 切换中的进度界面：可取消阶段显示“Turning fast mode on/off…”，应用阶段显示等待工作区。
 */
function FastModeToggleProgress(props) {
  let $ = useMemoCache(27);
  let { enable, session, getAppState, setAppState, storageV5, credentials, onQueryEvent, onDone } = props;
  let [abortController] = useState(newAbortController);
  let [phase, setPhase] = useState("cancellable");
  let content;
  if (
    $[0] !== abortController.signal ||
    $[1] !== credentials ||
    $[2] !== enable ||
    $[3] !== getAppState ||
    $[4] !== onDone ||
    $[5] !== onQueryEvent ||
    $[6] !== session ||
    $[7] !== setAppState ||
    $[8] !== storageV5
  ) {
    content = () => {
      let ready = true;
      toggleFastMode(
        session,
        enable,
        getAppState,
        setAppState,
        "shortcut",
        undefined,
        storageV5,
        () => prefetchFastModeStatus(storageV5, credentials),
        abortController.signal,
        () => {
          if (ready) setPhase("applying");
        },
        (value, args) =>
          savedFastModeToggle(
            value,
            {
              getAppState,
              setAppState,
              session,
              storageV5,
              options: {
                mcpClients: [],
              },
            },
            args,
            () => isBridgeOrTransport(session),
          ),
        onQueryEvent,
      ).then(
        (result) => {
          if (ready && result !== FAST_MODE_CANCELLED_TEXT) onDone(result);
        },
        (error) => {
          if (ready)
            onDone(sanitizeHookText(errorMessage(error)), {
              display: "system",
            });
        },
      );
      return () => {
        ready = false;
      };
    };
    $[0] = abortController.signal;
    $[1] = credentials;
    $[2] = enable;
    $[3] = getAppState;
    $[4] = onDone;
    $[5] = onQueryEvent;
    $[6] = session;
    $[7] = setAppState;
    $[8] = storageV5;
    $[9] = content;
  } else content = $[9];
  let status;
  if (
    $[10] !== abortController ||
    $[11] !== credentials ||
    $[12] !== enable ||
    $[13] !== getAppState ||
    $[14] !== onDone ||
    $[15] !== onQueryEvent ||
    $[16] !== session ||
    $[17] !== setAppState ||
    $[18] !== storageV5
  ) {
    status = [
      abortController,
      session,
      getAppState,
      setAppState,
      storageV5,
      credentials,
      enable,
      onQueryEvent,
      onDone,
    ];
    $[10] = abortController;
    $[11] = credentials;
    $[12] = enable;
    $[13] = getAppState;
    $[14] = onDone;
    $[15] = onQueryEvent;
    $[16] = session;
    $[17] = setAppState;
    $[18] = storageV5;
    $[19] = status;
  } else status = $[19];
  switch ((useEffect(content, status), phase)) {
    case "cancelled": {
      return null;
    }
    case "applying": {
      const children = isRemoteControlChannelAvailable()
        ? "Waiting for the workspace\u2026"
        : "Applying fast mode\u2026";
      let footer;
      if ($[20] === MEMO_CACHE_SENTINEL) {
        footer = jsxProd_default(Text, {
          dimColor: true,
          children,
        });
        $[20] = footer;
      } else footer = $[20];
      return footer;
    }
    case "cancellable": {
      const message = enable ? "Turning fast mode on\u2026" : "Turning fast mode off\u2026";
      let onCancel;
      if ($[21] !== abortController || $[22] !== onDone) {
        onCancel = () => {
          abortController.abort();
          setPhase("cancelled");
          onDone(FAST_MODE_CANCELLED_TEXT, {
            display: "system",
          });
        };
        $[21] = abortController;
        $[22] = onDone;
        $[23] = onCancel;
      } else onCancel = $[23];
      let hint;
      if ($[24] !== message || $[25] !== onCancel) {
        hint = jsxProd_default(PromptDialog, {
          message,
          onCancel,
        });
        $[24] = message;
        $[25] = onCancel;
        $[26] = hint;
      } else hint = $[26];
      return hint;
    }
  }
}
//@ chunk-18hwfzwa.js:520970-521487 facade-exports (2.1.88 match: call, 0.791)
async function call_3(onDone, context, args) {
  if (!isFastModeEnabled()) {
    onDone(getFastModeUnavailableMessage() ?? "Fast mode is not available");
    return null;
  }
  let arg = args?.trim().toLowerCase();
  if (arg === "on" || arg === "off")
    return jsxProd_default(FastModeToggleProgress, {
      enable: arg === "on",
      session: context.session,
      getAppState: context.getAppState,
      setAppState: context.setAppState,
      storageV5: context.storageV5,
      credentials: context.credentials,
      onQueryEvent: context.onQueryEvent,
      onDone,
    });
  await withDeadline(
    prefetchFastModeStatus(context.storageV5, context.credentials),
    FAST_MODE_PREFETCH_TIMEOUT_MS,
  );
  let unavailableReason = getFastModeUnavailableMessage();
  logEvent("tengu_fast_mode_picker_shown", {
    unavailable_reason: fromEnum(getFastModeUnavailableReasonCode() ?? ""),
  });
  return jsxProd_default(FastModePicker, {
    onDone,
    unavailableReason,
    storageV5: context.storageV5,
  });
}
export {
  formatFastModeSuffix,
  FastModePicker,
  handleFastModeShortcut,
  refreshFastModeFromSettings,
  unknownModelWindowModel,
  applyFastMode,
  getFastModeSwitchModel,
  toggleFastMode,
  call_3,
};
