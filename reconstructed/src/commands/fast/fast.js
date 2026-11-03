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
import { FAST_TOGGLE_NOT_APPLIED, savedFastModeToggle } from "../config/configShorthand.js";
import { logError } from "../../utils/log.js";
import { toError, errorMessage } from "../../utils/errors.js";
import { w } from "../../../vendor/react/compiler-runtime.js";
import { useRegisterOverlay } from "../../context/overlayContext.js";
import { useAppState, useSetAppState, useAppStateSession, useAppStoreDirect } from "../../state/AppState.js";
import { useNotifications } from "../../context/notifications.js";
import { y, P } from "../../../vendor/react/cjs/react.production.js";
import { MEMO_CACHE_SENTINEL } from "../../../runtime/bun-runtime.js";
import {
  getFastModeRuntimeState,
  supportsFastMode,
  defaultOpusAlias,
  defaultOpusLabel,
  prefetchFastModeStatus,
  isFastModeEnabled,
  getFastModeUnavailableMessage,
  getFastModeUnavailableReasonCode,
  clearFastModeCooldown,
  clearFastRejectedFallbackModels,
  hasSessionIngressAuthForFastMode,
  syncFastModeFlag,
  isFastModeSettingOn,
  isFastModeOrgPending,
  isFastModeActive,
  reportFastModeToggle,
} from "../../utils/fastMode.js";
import { getMainLoopModel, isOpus5FamilyModel } from "../../utils/model/model.js";
import { getCanonicalName } from "../../utils/model/canonicalModelName.js";
import {
  parseUserSpecifiedModel,
  getPublicModelDisplayName,
  isOpus1mMergeEnabled,
} from "../../utils/model/modelDisplay.js";
import { formatModelPricing, getFastModeCosts } from "../../utils/modelCost.js";
import { isOpus48Model } from "../../utils/model/promptBundles.js";
import {
  serializeModelSwitch,
  useMainLoopModel_2,
  hasPreModelSwitchHook,
  recordSwitchIfChanged,
} from "../../utils/model/modelSwitchHooks.js";
import { isRemoteControlChannelAvailable, getRemoteCaps } from "../../remote/remoteMode.js";
import { isBridgeOrTransport } from "../../cli/transportState.js";
import { logEvent } from "../../services/analytics/index.js";
import { lit as lit_2, fromEnum } from "../../services/analytics/safeMetadata.js";
import {
  sanitizeHookText,
  runPreModelSwitchHooks,
  preModelSwitchBlockedMessage,
} from "../model/modelSwitch.js";
import { getFastIconString, FastIcon } from "../../components/FastIcon.js";
import { FAST_MODE_ON_TEXT, MODEL_SET_TO_INFIX, toInlineCode } from "../model/modelMessages.js";
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
import { withDeadline } from "../../utils/sleep.js";
import { getDefaultMainLoopModelSetting } from "../../utils/model/planModeModel.js";
import {
  getIsNonInteractiveSession,
  setFlagSettingsInline,
  getFlagSettingsInline,
  setMainLoopModelOverride,
} from "../../bootstrap/state.js";
import { applySessionSettingsPatch } from "../../state/applySessionSettingsPatch.js";
import { isBridgeEnvironment } from "../../utils/remoteEnvironment.js";
import { settingsChangeDetector } from "../../utils/settings/changeDetector.js";
import { invalidateCommandNames } from "../../utils/settings/commandSyncNames.js";
import { logForDebugging } from "../../utils/debug.js";
import { ControlRequestTimeoutError } from "../../remote/controlRequestErrors.js";
import { updateSettingsForSource } from "../../utils/settings/settings.js";
import { getFeatureValue_CACHED_MAY_BE_STALE } from "../../services/analytics/growthbook.js";
import { isBilledAsExtraUsage } from "../../utils/extraUsage.js";

//@ chunk-18hwfzwa.js:514768-514804 callgraph-fingerprint = _temp2 (1)
function selectFastMode(s_0) {
  return s_0.fastMode;
}
//@ chunk-18hwfzwa.js:514804-514851 layout
function fastToggleNotAppliedIfUnset(dr) {
  return dr === undefined ? undefined : FAST_TOGGLE_NOT_APPLIED;
}
//@ chunk-18hwfzwa.js:514851-514894 layout
function dropNotAppliedResult(or) {
  return or === FAST_TOGGLE_NOT_APPLIED ? undefined : or;
}
//@ chunk-18hwfzwa.js:514894-514937 layout
function withFastModeOff(prev) {
  return {
    ...prev,
    fastMode: false,
  };
}
//@ chunk-18hwfzwa.js:514937-514970 layout
function logErrorOnly(Qn) {
  return logError(toError(Qn));
}
//@ chunk-18hwfzwa.js:514970-514997 layout
function negate_3(ur) {
  return !ur;
}
//@ chunk-18hwfzwa.js:514997-515039 layout
function newAbortController() {
  return new AbortController();
}
//@ chunk-18hwfzwa.js:515039-519401 facade-exports = FastModePicker (0.729)
function FastModePicker(props) {
  let It = w(23);
  let { onDone, unavailableReason, storageV5 } = props;
  useRegisterOverlay("fast-mode-picker");
  let model = useAppState(selectFastMode);
  let setAppState = useSetAppState();
  let appStateSession = useAppStateSession();
  let setAppState_2 = useAppStoreDirect();
  let { addNotification } = useNotifications();
  let [applyColor, ze] = y(model ?? false);
  let [Xe, rt] = y(false);
  let [kt, At] = y(null);
  let Ot;
  if (It[0] === MEMO_CACHE_SENTINEL) {
    Ot = getFastModeRuntimeState();
    It[0] = Ot;
  } else Ot = It[0];
  let runtimeState = Ot;
  let Dt = runtimeState.status === "cooldown";
  let Lt = unavailableReason !== null;
  let mainLoopModel = getMainLoopModel();
  let canonicalName = getCanonicalName(
    supportsFastMode(mainLoopModel) ? mainLoopModel : parseUserSpecifiedModel(defaultOpusAlias()),
  );
  let fastIcon = formatModelPricing(getFastModeCosts(canonicalName));
  let so = isOpus48Model(canonicalName) || isOpus5FamilyModel(canonicalName);
  let Wo = function Wo() {
    if (Lt || Xe) {
      return;
    }
    if (applyColor) {
      let abortController = new AbortController();
      At(abortController);
      rt(true);
      let ao = false;
      co(() =>
        serializeModelSwitch(appStateSession, () =>
          confirmFastModeSwitch(appStateSession, setAppState_2.getState, abortController.signal).then(
            async (bo) => {
              if (abortController.signal.aborted) {
                return FAST_TOGGLE_NOT_APPLIED;
              }
              if (bo.refusal !== undefined) {
                return bo.refusal;
              }
              At(null);
              ao = true;
              return (await Ao(bo.vetted, bo.messages)) === undefined ? undefined : FAST_TOGGLE_NOT_APPLIED;
            },
          ),
        ),
      )
        .then((Bo) => {
          if (abortController.signal.aborted) {
            return;
          }
          if (Bo !== undefined) {
            rt(false);
            onDone(Bo, {
              display: "system",
            });
          }
        })
        .catch((error) => {
          rt(false);
          if (abortController.signal.aborted) {
            return;
          }
          logError(toError(error));
          onDone(
            ao
              ? "Fast mode was not changed: applying it failed"
              : "Fast mode was not changed: the PreModelSwitch check failed",
            {
              display: "system",
            },
          );
        });
      return;
    }
    rt(true);
    co(() => serializeModelSwitch(appStateSession, () => Ao()).then(fastToggleNotAppliedIfUnset))
      .then((Ho) => {
        if (Ho !== undefined) {
          rt(false);
          onDone(Ho, {
            display: "system",
          });
        }
      })
      .catch((error) => {
        rt(false);
        logError(toError(error));
        onDone("Fast mode was not changed: applying it failed", {
          display: "system",
        });
      });
  };
  function co(mn) {
    return isRemoteControlChannelAvailable()
      ? mn().then(dropNotAppliedResult)
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
          mn,
          () => isBridgeOrTransport(appStateSession),
        );
  }
  function Ao(vetted, messages) {
    let vo = vetted === undefined ? UNVETTED_FAST_MODE_RESULT : vetted;
    let Yo = messages === undefined ? [] : messages;
    let kn = getFastModeSwitchModel(setAppState_2.getState()) !== undefined;
    let Fn = applyFastModeToWorkspace(appStateSession, applyColor, setAppState, undefined, storageV5, vo);
    logEvent("tengu_fast_mode_toggled", {
      enabled: applyColor,
      source: lit_2("picker"),
      remote: isRemoteControlChannelAvailable(),
    });
    let bn =
      Yo.length > 0
        ? `
${Yo.map(sanitizeHookText).join(`
`)}`
        : "";
    let Go = applyColor
      ? `${getFastIconString(applyColor)} ${FAST_MODE_ON_TEXT}${kn ? `${MODEL_SET_TO_INFIX}${toInlineCode(defaultOpusLabel())}` : ""} \xB7 ${fastIcon}${bn}`
      : "Fast mode OFF";
    let hn = applyColor ? opus48FastModeDeprecationNotice(canonicalName) : null;
    if (!isRemoteControlChannelAvailable()) {
      if (!applyColor) setAppState(withFastModeOff);
      return Fn.then((Mn) => {
        rt(false);
        if (Mn === undefined && hn) addNotification(hn);
        onDone(Mn === undefined ? Go : describeWorkspaceFastModeFailure(Mn, applyColor));
        return Mn;
      });
    }
    rt(true);
    return Fn.then((Xo) => {
      rt(false);
      if (Xo === undefined && hn) addNotification(hn);
      onDone(Xo === undefined ? Go : describeWorkspaceFastModeFailure(Xo, applyColor));
      return Xo;
    });
  }
  let Sn;
  if (
    It[1] !== model ||
    It[2] !== Lt ||
    It[3] !== onDone ||
    It[4] !== appStateSession ||
    It[5] !== setAppState ||
    It[6] !== storageV5
  ) {
    Sn = function handleCancel() {
      if (Lt) {
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
    It[1] = model;
    It[2] = Lt;
    It[3] = onDone;
    It[4] = appStateSession;
    It[5] = setAppState;
    It[6] = storageV5;
    It[7] = Sn;
  } else Sn = It[7];
  let handleCancel = Sn;
  let _o;
  if (It[8] !== Lt) {
    _o = function handleToggle() {
      if (Lt) {
        return;
      }
      ze(negate_3);
    };
    It[8] = Lt;
    It[9] = _o;
  } else _o = It[9];
  let handleToggle = _o;
  let Dn;
  if (It[10] === MEMO_CACHE_SENTINEL) {
    Dn = {
      context: "Confirmation",
    };
    It[10] = Dn;
  } else Dn = It[10];
  MessageActionsKeybindings(
    {
      "confirm:yes": Wo,
      "confirm:nextField": handleToggle,
      "confirm:next": handleToggle,
      "confirm:previous": handleToggle,
      "confirm:cycleMode": handleToggle,
      "confirm:toggle": handleToggle,
    },
    Dn,
  );
  let wn;
  if (It[11] === MEMO_CACHE_SENTINEL) {
    wn = jsxProd_default(FastIcon, {
      cooldown: Dt,
    });
    It[11] = wn;
  } else wn = It[11];
  let title = jsxProd_default_2(Text, {
    children: [wn, " Fast mode", so && " (research preview)"],
  });
  if (Xe) {
    if (kt !== null) {
      let Kn;
      if (It[12] !== kt || It[13] !== onDone) {
        Kn = jsxProd_default(PromptDialog, {
          message: "Running PreModelSwitch hooks\u2026",
          onCancel: () => {
            kt.abort();
            At(null);
            rt(false);
            onDone(FAST_MODE_CANCELLED_TEXT, {
              display: "system",
            });
          },
        });
        It[12] = kt;
        It[13] = onDone;
        It[14] = Kn;
      } else Kn = It[14];
      return Kn;
    }
    const children = isRemoteControlChannelAvailable()
      ? "Waiting for the workspace\u2026"
      : "Applying fast mode\u2026";
    let Wn;
    if (It[15] === MEMO_CACHE_SENTINEL) {
      Wn = jsxProd_default(Text, {
        dimColor: true,
        children,
      });
      It[15] = Wn;
    } else Wn = It[15];
    return Wn;
  }
  const subtitle = `High-speed mode for ${getPublicModelDisplayName(canonicalName) ?? "Opus"}. Draws from usage credits at a higher rate. Separate rate limits apply.`;
  let inputGuide;
  if (It[16] !== Lt) {
    inputGuide = Lt
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
    It[16] = Lt;
    It[17] = inputGuide;
  } else inputGuide = It[17];
  let Fr;
  if (It[18] !== applyColor || It[19] !== fastIcon || It[20] !== unavailableReason) {
    Fr = unavailableReason
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
            Dt &&
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
    It[18] = applyColor;
    It[19] = fastIcon;
    It[20] = unavailableReason;
    It[21] = Fr;
  } else Fr = It[21];
  let Zn;
  if (It[22] === MEMO_CACHE_SENTINEL) {
    Zn = jsxProd_default(LearnMoreLink, {
      url: "https://code.claude.com/docs/en/fast-mode",
    });
    It[22] = Zn;
  } else Zn = It[22];
  return jsxProd_default_2(Dialog, {
    title,
    subtitle,
    onCancel: handleCancel,
    color: "fastMode",
    inputGuide,
    children: [Fr, Zn],
  });
}
//@ chunk-18hwfzwa.js:519401-520970 layout
/**
 * /fast 切换中的进度界面：可取消阶段显示“Turning fast mode on/off…”，应用阶段显示等待工作区。
 */
function FastModeToggleProgress(props) {
  let rt = w(27);
  let { enable, session, getAppState, setAppState, storageV5, credentials, onQueryEvent, onDone } = props;
  let [abortController] = y(newAbortController);
  let [phase, setPhase] = y("cancellable");
  let kt;
  if (
    rt[0] !== abortController.signal ||
    rt[1] !== credentials ||
    rt[2] !== enable ||
    rt[3] !== getAppState ||
    rt[4] !== onDone ||
    rt[5] !== onQueryEvent ||
    rt[6] !== session ||
    rt[7] !== setAppState ||
    rt[8] !== storageV5
  ) {
    kt = () => {
      let At = true;
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
          if (At) setPhase("applying");
        },
        (It, Ot) =>
          savedFastModeToggle(
            It,
            {
              getAppState,
              setAppState,
              session,
              storageV5,
              options: {
                mcpClients: [],
              },
            },
            Ot,
            () => isBridgeOrTransport(session),
          ),
        onQueryEvent,
      ).then(
        (Et) => {
          if (At && Et !== FAST_MODE_CANCELLED_TEXT) onDone(Et);
        },
        (error) => {
          if (At)
            onDone(sanitizeHookText(errorMessage(error)), {
              display: "system",
            });
        },
      );
      return () => {
        At = false;
      };
    };
    rt[0] = abortController.signal;
    rt[1] = credentials;
    rt[2] = enable;
    rt[3] = getAppState;
    rt[4] = onDone;
    rt[5] = onQueryEvent;
    rt[6] = session;
    rt[7] = setAppState;
    rt[8] = storageV5;
    rt[9] = kt;
  } else kt = rt[9];
  let Lt;
  if (
    rt[10] !== abortController ||
    rt[11] !== credentials ||
    rt[12] !== enable ||
    rt[13] !== getAppState ||
    rt[14] !== onDone ||
    rt[15] !== onQueryEvent ||
    rt[16] !== session ||
    rt[17] !== setAppState ||
    rt[18] !== storageV5
  ) {
    Lt = [
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
    rt[10] = abortController;
    rt[11] = credentials;
    rt[12] = enable;
    rt[13] = getAppState;
    rt[14] = onDone;
    rt[15] = onQueryEvent;
    rt[16] = session;
    rt[17] = setAppState;
    rt[18] = storageV5;
    rt[19] = Lt;
  } else Lt = rt[19];
  switch ((P(kt, Lt), phase)) {
    case "cancelled": {
      return null;
    }
    case "applying": {
      const children = isRemoteControlChannelAvailable()
        ? "Waiting for the workspace\u2026"
        : "Applying fast mode\u2026";
      let Xt;
      if (rt[20] === MEMO_CACHE_SENTINEL) {
        Xt = jsxProd_default(Text, {
          dimColor: true,
          children,
        });
        rt[20] = Xt;
      } else Xt = rt[20];
      return Xt;
    }
    case "cancellable": {
      const message = enable ? "Turning fast mode on\u2026" : "Turning fast mode off\u2026";
      let onCancel;
      if (rt[21] !== abortController || rt[22] !== onDone) {
        onCancel = () => {
          abortController.abort();
          setPhase("cancelled");
          onDone(FAST_MODE_CANCELLED_TEXT, {
            display: "system",
          });
        };
        rt[21] = abortController;
        rt[22] = onDone;
        rt[23] = onCancel;
      } else onCancel = rt[23];
      let io;
      if (rt[24] !== message || rt[25] !== onCancel) {
        io = jsxProd_default(PromptDialog, {
          message,
          onCancel,
        });
        rt[24] = message;
        rt[25] = onCancel;
        rt[26] = io;
      } else io = rt[26];
      return io;
    }
  }
}
//@ chunk-18hwfzwa.js:520970-521487 facade-exports = call (0.791)
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
function getFastModeSwitchModel(n) {
  if (
    supportsFastMode(
      useMainLoopModel_2({
        ...n,
        toolPermissionContext: {
          mode: "default",
        },
      }),
    )
  )
    return;
  let e = defaultOpusAlias();
  return parseUserSpecifiedModel(e) === parseUserSpecifiedModel(getDefaultMainLoopModelSetting()) ? null : e;
}
//@ chunk-1n1kvmcz.js:1429-1779 placement
async function confirmFastModeSwitch(n, e, signal) {
  let fastModeSwitchModel = getFastModeSwitchModel(e());
  if (fastModeSwitchModel === undefined || isRemoteControlChannelAvailable() || !hasPreModelSwitchHook(n))
    return {
      vetted: UNVETTED_FAST_MODE_RESULT,
      messages: [],
    };
  let s = await runPreModelSwitchHooks(n, e, fastModeSwitchModel, "command", {
    signal,
  });
  if (s.decision === "proceed")
    return {
      vetted: {
        target: fastModeSwitchModel,
      },
      messages: s.messages,
    };
  return {
    refusal: preModelSwitchBlockedMessage(
      fastModeSwitchModel,
      s.decision === "ask"
        ? `${s.reason ?? "confirmation required"} (use /model to switch, then /fast)`
        : s.reason,
      s.messages,
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
function describeWorkspaceFastModeFailure(remote, e) {
  let o = e ? "enabled" : "disabled";
  switch (remote.kind) {
    case "timeout":
      return `No response from the workspace \u2014 fast mode may still have been ${o} there`;
    case "stale":
      return `Fast mode was not ${o}: the model changed while PreModelSwitch hooks ran; try again`;
    case "refused":
      return `Fast mode was not ${o} on the workspace: ${remote.reason}`;
  }
}
//@ chunk-1n1kvmcz.js:2144-3163 placement
function applyFastModeToWorkspace(
  appStateSession,
  e,
  setAppState,
  i = true,
  storageV5,
  m = UNVETTED_FAST_MODE_RESULT,
) {
  clearFastModeCooldown();
  if (e) clearFastRejectedFallbackModels();
  let k = () => {
    if (i && !getIsNonInteractiveSession()) return;
    setFlagSettingsInline({
      ...(getFlagSettingsInline() ?? {}),
      fastMode: e,
    });
  };
  let M = () => {
    applySessionSettingsPatch(
      {
        fastMode: e,
      },
      setAppState,
    );
    if (e) {
      let r = false;
      let u = null;
      setAppState((l) => {
        let fastModeSwitchModel = getFastModeSwitchModel(l);
        if (fastModeSwitchModel === undefined) return l;
        if (!("unvetted" in m) && m.target !== fastModeSwitchModel) return l;
        recordSwitchIfChanged(appStateSession, l, fastModeSwitchModel, "command");
        r = true;
        u = fastModeSwitchModel;
        return {
          ...l,
          mainLoopModel: fastModeSwitchModel,
          mainLoopModelForSession: null,
        };
      });
      if (r && hasSessionIngressAuthForFastMode()) setMainLoopModelOverride(u);
    }
    if (!i)
      if (!isBridgeEnvironment() && hasSessionIngressAuthForFastMode())
        settingsChangeDetector.notifyChange("flagSettings");
      else invalidateCommandNames();
  };
  if (isRemoteControlChannelAvailable()) {
    k();
    let r = getRemoteCaps()?.sendControlRequest({
      subtype: "apply_flag_settings",
      settings: {
        fastMode: e ? true : null,
        ...(e && {
          model: defaultOpusAlias(),
        }),
      },
    });
    if (!r) {
      M();
      return Promise.resolve(undefined);
    }
    return r.then(
      () => {
        M();
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
  if (e && !("unvetted" in m)) {
    let r = false;
    setAppState((u) => {
      let fastModeSwitchModel = getFastModeSwitchModel(u);
      r = fastModeSwitchModel !== undefined && fastModeSwitchModel !== m.target;
      return u;
    });
    if (r)
      return Promise.resolve({
        kind: "stale",
      });
  }
  k();
  syncFastModeFlag(e, storageV5);
  if (i)
    updateSettingsForSource(
      "userSettings",
      {
        fastMode: e ? true : undefined,
      },
      undefined,
      storageV5,
    );
  M();
  return Promise.resolve(undefined);
}
//@ chunk-1n1kvmcz.js:3163-3567 placement
function opus48FastModeDeprecationNotice(canonicalName) {
  if (!isOpus48Model(canonicalName)) return null;
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
  e,
  getAppState,
  setAppState,
  s,
  m = true,
  storageV5,
  M,
  signal,
  u,
  l,
  onQueryEvent,
) {
  let _ = () =>
    serializeModelSwitch(session, async () => {
      if (M) await withDeadline(M(), FAST_MODE_PREFETCH_TIMEOUT_MS);
      if (signal?.aborted)
        return {
          kind: "refused",
          refusal: FAST_MODE_CANCELLED_TEXT,
        };
      let fastModeUnavailableMessage = getFastModeUnavailableMessage(undefined, {
        sessionOptIn: !m && !isBridgeEnvironment() && hasSessionIngressAuthForFastMode(),
        sessionOnly: !m || getIsNonInteractiveSession(),
      });
      if (fastModeUnavailableMessage && e)
        return {
          kind: "refused",
          refusal: `Fast mode unavailable: ${fastModeUnavailableMessage}`,
        };
      let y = UNVETTED_FAST_MODE_RESULT;
      let hookMessages = [];
      if (e) {
        let p = await confirmFastModeSwitch(session, getAppState, signal);
        if (signal?.aborted)
          return {
            kind: "refused",
            refusal: FAST_MODE_CANCELLED_TEXT,
          };
        if (p.refusal !== undefined)
          return {
            kind: "refused",
            refusal: p.refusal,
          };
        y = p.vetted;
        hookMessages = p.messages;
      }
      let willPromote = e && getFastModeSwitchModel(getAppState()) !== undefined;
      u?.();
      return {
        kind: "applied",
        remote: await applyFastModeToWorkspace(session, e, setAppState, m, storageV5, y),
        willPromote,
        hookMessages,
      };
    });
  let S = {};
  let P =
    m && l !== undefined && !isRemoteControlChannelAvailable()
      ? await l(e, async () => {
          S.outcome = await _();
          if (S.outcome.kind === "refused") return S.outcome.refusal;
          return S.outcome.remote === undefined
            ? undefined
            : describeWorkspaceFastModeFailure(S.outcome.remote, e);
        })
      : undefined;
  let f = S.outcome ?? (P === undefined ? await _() : undefined);
  if (f === undefined) return signal?.aborted ? FAST_MODE_CANCELLED_TEXT : (P ?? "Fast mode was not changed");
  if (f.kind === "refused") return f.refusal;
  if (f.remote !== undefined) return describeWorkspaceFastModeFailure(f.remote, e);
  logEvent("tengu_fast_mode_toggled", {
    enabled: e,
    source: fromEnum(s),
    remote: isRemoteControlChannelAvailable(),
  });
  if (e) {
    let fastIconString = getFastIconString(true);
    let y = f.willPromote ? `${MODEL_SET_TO_INFIX}${toInlineCode(defaultOpusLabel())}` : "";
    let mainLoopModel = getMainLoopModel();
    let canonicalName = getCanonicalName(
      supportsFastMode(mainLoopModel) ? mainLoopModel : parseUserSpecifiedModel(defaultOpusAlias()),
    );
    let O = formatModelPricing(getFastModeCosts(canonicalName));
    let p = opus48FastModeDeprecationNotice(canonicalName);
    if (p)
      onQueryEvent?.({
        type: "notification",
        notification: p,
      });
    let E = m ? "" : " (this session only)";
    let T =
      f.hookMessages.length > 0
        ? `
${f.hookMessages.map(sanitizeHookText).join(`
`)}`
        : "";
    return `${fastIconString} ${FAST_MODE_ON_TEXT}${y} \xB7 ${O}${E}${T}`;
  } else return `Fast mode OFF${m ? "" : " (this session only)"}`;
}
//@ chunk-d1cgs5na.js:1502-1699 placement
function formatFastModeSuffix(e, isFastMode, model, a) {
  let n = isFastModeEnabled();
  let l = n && isFastMode && (!e || a?.announceKeptOn === true);
  let r = n && !!e && !isFastMode;
  return (
    (l ? " \xB7 Fast mode ON" : "") +
    (isBilledAsExtraUsage(model, isFastMode, isOpus1mMergeEnabled())
      ? " \xB7 Draws from usage credits"
      : "") +
    (r ? " \xB7 Fast mode OFF" : "")
  );
}
//@ chunk-d1cgs5na.js:1699-1834 fingerprint = handleFastModeShortcut (0.484)
function handleFastModeShortcut(enable, getAppState, setAppState) {
  if (!!enable === getAppState) return null;
  return getAppState
    ? `Fast mode ON${isBilledAsExtraUsage(setAppState, true, isOpus1mMergeEnabled()) ? " \xB7 Draws from usage credits" : ""}`
    : "Fast mode OFF";
}
//@ chunk-aepeg2w5.js:357680-357806 fingerprint = _temp3 (0.717)
/**
 * 按设置重算 fastMode 写回应用状态，开启时预取快速模式状态。
 */
function refreshFastModeFromSettings(e, n, r) {
  n((s) => {
    let h = isFastModeSettingOn(s.settings);
    return s.fastMode === h
      ? s
      : {
          ...s,
          fastMode: h,
        };
  });
  if (isFastModeOrgPending(e().fastMode === true)) prefetchFastModeStatus(r);
}
//@ chunk-ag5x7vhf.js:112894-112980 fingerprint = _temp (0.398)
function unknownModelWindowModel(s) {
  return s.setupIssues.unknownModelWindowWarning ? s.mainLoopModel : null;
}
//@ chunk-jbv0t0w5.js:37202-37589 fingerprint = applyFastMode (0.495)
function applyFastMode(enable, setAppState) {
  let o;
  let r;
  setAppState((prev) => {
    let d = enable.overrideValue ?? enable.forSessionValue ?? enable.appStateModel;
    let i = isFastModeEnabled() ? isFastModeActive(d, prev.fastMode) : !!prev.fastMode;
    o = prev.fastMode;
    r = i;
    return prev.mainLoopModel === enable.appStateModel &&
      prev.mainLoopModelForSession === enable.forSessionValue &&
      i === !!prev.fastMode
      ? prev
      : {
          ...prev,
          mainLoopModel: enable.appStateModel,
          mainLoopModelForSession: enable.forSessionValue,
          fastMode: i,
        };
  });
  if (r !== undefined) reportFastModeToggle(o, r);
  setMainLoopModelOverride(enable.overrideValue);
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
};
