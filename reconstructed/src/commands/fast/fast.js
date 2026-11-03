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
import { useAppState, useSetAppState, useAppStateSession, Cr } from "../../state/AppState.js";
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
import { xit } from "../../utils/model/promptBundles.js";
import { serializeModelSwitch, useMainLoopModel_2, WZ, zE } from "../../utils/model/modelSwitchHooks.js";
import { ml, Jn } from "../../remote/remoteMode.js";
import { isBridgeOrTransport } from "../../cli/transportState.js";
import { logEvent } from "../../services/analytics/index.js";
import { lit as lit_2, fromEnum } from "../../services/analytics/safeMetadata.js";
import { Nf, runPreModelSwitchHooks, preModelSwitchBlockedMessage } from "../model/modelSwitch.js";
import { getFastIconString, FastIcon } from "../../components/FastIcon.js";
import { FAST_MODE_ON_TEXT, MODEL_SET_TO_INFIX, toInlineCode } from "../model/modelMessages.js";
import { MessageActionsKeybindings } from "../../components/messageActions.js";
import { e, r, Fragment } from "../../../vendor/react/cjs/react-jsx-dev-runtime.react-server.production.js";
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
import { vS } from "../../utils/remoteEnvironment.js";
import { settingsChangeDetector } from "../../utils/settings/changeDetector.js";
import { or } from "../../utils/settings/commandSyncNames.js";
import { logForDebugging } from "../../utils/debug.js";
import { ControlRequestTimeoutError } from "../../remote/controlRequestErrors.js";
import { updateSettingsForSource } from "../../utils/settings/settings.js";
import { getFeatureValue_CACHED_MAY_BE_STALE } from "../../services/analytics/growthbook.js";
import { isBilledAsExtraUsage } from "../../utils/extraUsage.js";

//@ chunk-18hwfzwa.js:514768-514804 callgraph-fingerprint = _temp2 (1)
function BKt(s_0) {
  return s_0.fastMode;
}
//@ chunk-18hwfzwa.js:514804-514851 layout
function HKt(dr) {
  return dr === void 0 ? void 0 : FAST_TOGGLE_NOT_APPLIED;
}
//@ chunk-18hwfzwa.js:514851-514894 layout
function UKt(or) {
  return or === FAST_TOGGLE_NOT_APPLIED ? void 0 : or;
}
//@ chunk-18hwfzwa.js:514894-514937 layout
function WKt(pr) {
  return { ...pr, fastMode: !1 };
}
//@ chunk-18hwfzwa.js:514937-514970 layout
function jKt(Qn) {
  return logError(toError(Qn));
}
//@ chunk-18hwfzwa.js:514970-514997 layout
function qKt(ur) {
  return !ur;
}
//@ chunk-18hwfzwa.js:514997-515039 layout
function $Kt() {
  return new AbortController();
}
//@ chunk-18hwfzwa.js:515039-519401 facade-exports = FastModePicker (0.729)
function FastModePicker(t0) {
  let It = w(23),
    { onDone: onDone, unavailableReason: unavailableReason, storageV5: storageV5 } = t0;
  useRegisterOverlay("fast-mode-picker");
  let model = useAppState(BKt),
    ke = useSetAppState(),
    Re = useAppStateSession(),
    setAppState = Cr(),
    { addNotification: addNotification } = useNotifications(),
    [We, ze] = y(model ?? !1),
    [Xe, rt] = y(!1),
    [kt, At] = y(null),
    Ot;
  if (It[0] === MEMO_CACHE_SENTINEL) ((Ot = getFastModeRuntimeState()), (It[0] = Ot));
  else Ot = It[0];
  let Et = Ot,
    Dt = Et.status === "cooldown",
    Lt = unavailableReason !== null,
    oo = getMainLoopModel(),
    Xt = getCanonicalName(supportsFastMode(oo) ? oo : parseUserSpecifiedModel(defaultOpusAlias())),
    fastIcon = formatModelPricing(getFastModeCosts(Xt)),
    so = xit(Xt) || isOpus5FamilyModel(Xt),
    Wo = function Wo() {
      if (Lt || Xe) {
        return;
      }
      if (We) {
        let abortController = new AbortController();
        (At(abortController), rt(!0));
        let ao = !1;
        co(() =>
          serializeModelSwitch(Re, () =>
            confirmFastModeSwitch(Re, setAppState.getState, abortController.signal).then(async (bo) => {
              if (abortController.signal.aborted) {
                return FAST_TOGGLE_NOT_APPLIED;
              }
              if (bo.refusal !== void 0) {
                return bo.refusal;
              }
              return (
                At(null),
                (ao = !0),
                (await Ao(bo.vetted, bo.messages)) === void 0 ? void 0 : FAST_TOGGLE_NOT_APPLIED
              );
            }),
          ),
        )
          .then((Bo) => {
            if (abortController.signal.aborted) {
              return;
            }
            if (Bo !== void 0) (rt(!1), onDone(Bo, { display: "system" }));
          })
          .catch((Ro) => {
            if ((rt(!1), abortController.signal.aborted)) {
              return;
            }
            (logError(toError(Ro)),
              onDone(
                ao
                  ? "Fast mode was not changed: applying it failed"
                  : "Fast mode was not changed: the PreModelSwitch check failed",
                { display: "system" },
              ));
          });
        return;
      }
      (rt(!0),
        co(() => serializeModelSwitch(Re, () => Ao()).then(HKt))
          .then((Ho) => {
            if (Ho !== void 0) (rt(!1), onDone(Ho, { display: "system" }));
          })
          .catch((Io) => {
            (rt(!1),
              logError(toError(Io)),
              onDone("Fast mode was not changed: applying it failed", { display: "system" }));
          }));
    };
  function co(mn) {
    return ml()
      ? mn().then(UKt)
      : savedFastModeToggle(
          We,
          {
            getAppState: setAppState.getState,
            setAppState: ke,
            session: Re,
            storageV5: storageV5,
            options: { mcpClients: [] },
          },
          mn,
          () => isBridgeOrTransport(Re),
        );
  }
  function Ao(Cn, No) {
    let vo = Cn === void 0 ? Zan : Cn;
    let Yo = No === void 0 ? [] : No;
    let kn = getFastModeSwitchModel(setAppState.getState()) !== void 0;
    let Fn = applyFastModeToWorkspace(Re, We, ke, void 0, storageV5, vo);
    logEvent("tengu_fast_mode_toggled", { enabled: We, source: lit_2("picker"), remote: ml() });
    let bn =
      Yo.length > 0
        ? `
${Yo.map(Nf).join(`
`)}`
        : "";
    let Go = We
      ? `${getFastIconString(We)} ${FAST_MODE_ON_TEXT}${kn ? `${MODEL_SET_TO_INFIX}${toInlineCode(defaultOpusLabel())}` : ""} \xB7 ${fastIcon}${bn}`
      : "Fast mode OFF";
    let hn = We ? opus48FastModeDeprecationNotice(Xt) : null;
    if (!ml()) {
      if (!We) ke(WKt);
      return Fn.then((Mn) => {
        if ((rt(!1), Mn === void 0 && hn)) addNotification(hn);
        return (onDone(Mn === void 0 ? Go : describeWorkspaceFastModeFailure(Mn, We)), Mn);
      });
    }
    return (
      rt(!0),
      Fn.then((Xo) => {
        if ((rt(!1), Xo === void 0 && hn)) addNotification(hn);
        return (onDone(Xo === void 0 ? Go : describeWorkspaceFastModeFailure(Xo, We)), Xo);
      })
    );
  }
  let Sn;
  if (
    It[1] !== model ||
    It[2] !== Lt ||
    It[3] !== onDone ||
    It[4] !== Re ||
    It[5] !== ke ||
    It[6] !== storageV5
  )
    ((Sn = function on() {
      if (Lt) {
        if (model)
          serializeModelSwitch(Re, () => applyFastModeToWorkspace(Re, !1, ke, void 0, storageV5)).catch(jKt);
        onDone("Fast mode OFF", { display: "system" });
        return;
      }
      let $n = model ? `${getFastIconString()} Kept Fast mode ON` : "Kept Fast mode OFF";
      onDone($n, { display: "system" });
    }),
      (It[1] = model),
      (It[2] = Lt),
      (It[3] = onDone),
      (It[4] = Re),
      (It[5] = ke),
      (It[6] = storageV5),
      (It[7] = Sn));
  else Sn = It[7];
  let on = Sn,
    _o;
  if (It[8] !== Lt)
    ((_o = function cn() {
      if (Lt) {
        return;
      }
      ze(qKt);
    }),
      (It[8] = Lt),
      (It[9] = _o));
  else _o = It[9];
  let cn = _o,
    Dn;
  if (It[10] === MEMO_CACHE_SENTINEL) ((Dn = { context: "Confirmation" }), (It[10] = Dn));
  else Dn = It[10];
  MessageActionsKeybindings(
    {
      "confirm:yes": Wo,
      "confirm:nextField": cn,
      "confirm:next": cn,
      "confirm:previous": cn,
      "confirm:cycleMode": cn,
      "confirm:toggle": cn,
    },
    Dn,
  );
  let wn;
  if (It[11] === MEMO_CACHE_SENTINEL) ((wn = e(FastIcon, { cooldown: Dt })), (It[11] = wn));
  else wn = It[11];
  let mr = r(Text, { children: [wn, " Fast mode", so && " (research preview)"] });
  if (Xe) {
    if (kt !== null) {
      let Kn;
      if (It[12] !== kt || It[13] !== onDone)
        ((Kn = e(PromptDialog, {
          message: "Running PreModelSwitch hooks\u2026",
          onCancel: () => {
            (kt.abort(), At(null), rt(!1), onDone(dze, { display: "system" }));
          },
        })),
          (It[12] = kt),
          (It[13] = onDone),
          (It[14] = Kn));
      else Kn = It[14];
      return Kn;
    }
    const Kn = ml() ? "Waiting for the workspace\u2026" : "Applying fast mode\u2026";
    let Wn;
    if (It[15] === MEMO_CACHE_SENTINEL) ((Wn = e(Text, { dimColor: !0, children: Kn })), (It[15] = Wn));
    else Wn = It[15];
    return Wn;
  }
  const Kn = `High-speed mode for ${getPublicModelDisplayName(Xt) ?? "Opus"}. Draws from usage credits at a higher rate. Separate rate limits apply.`;
  let Wn;
  if (It[16] !== Lt)
    ((Wn = Lt
      ? e(KeyboardShortcutHint, { chord: "escape", action: "cancel" })
      : r(Byline, {
          children: [
            e(KeyboardShortcutHint, { chord: "space", action: "toggle" }),
            e(KeyboardShortcutHint, { chord: "enter", action: "confirm" }),
            e(KeyboardShortcutHint, { chord: "escape", action: "cancel" }),
          ],
        })),
      (It[16] = Lt),
      (It[17] = Wn));
  else Wn = It[17];
  let Fr;
  if (It[18] !== We || It[19] !== fastIcon || It[20] !== unavailableReason)
    ((Fr = unavailableReason
      ? e(Box, { marginLeft: 2, children: e(ErrorText, { error: unavailableReason }) })
      : r(Fragment, {
          children: [
            e(Box, {
              flexDirection: "column",
              gap: 0,
              marginLeft: 2,
              children: r(Box, {
                flexDirection: "row",
                gap: 2,
                children: [
                  e(Text, { bold: !0, children: "Fast mode" }),
                  e(Text, { color: We ? "fastMode" : void 0, bold: We, children: We ? "ON " : "OFF" }),
                  e(Text, { dimColor: !0, children: fastIcon }),
                ],
              }),
            }),
            Dt &&
              Et.status === "cooldown" &&
              e(Box, {
                marginLeft: 2,
                children: r(Text, {
                  color: "warning",
                  children: [
                    Et.reason === "overloaded"
                      ? "Fast mode overloaded and is temporarily unavailable"
                      : "You've hit your fast limit",
                    " \xB7 resets in ",
                    formatDuration(Et.resetAt - Date.now(), { hideTrailingZeros: !0 }),
                  ],
                }),
              }),
          ],
        })),
      (It[18] = We),
      (It[19] = fastIcon),
      (It[20] = unavailableReason),
      (It[21] = Fr));
  else Fr = It[21];
  let Zn;
  if (It[22] === MEMO_CACHE_SENTINEL)
    ((Zn = e(LearnMoreLink, { url: "https://code.claude.com/docs/en/fast-mode" })), (It[22] = Zn));
  else Zn = It[22];
  return r(Dialog, {
    title: mr,
    subtitle: Kn,
    onCancel: on,
    color: "fastMode",
    inputGuide: Wn,
    children: [Fr, Zn],
  });
}
/**
 * /fast 切换中的进度界面：可取消阶段显示“Turning fast mode on/off…”，应用阶段显示等待工作区。
 */
//@ chunk-18hwfzwa.js:519401-520970 layout
function FastModeToggleProgress(h) {
  let rt = w(27),
    {
      enable: enable,
      session: session,
      getAppState: getAppState,
      setAppState: setAppState,
      storageV5: storageV5,
      credentials: credentials,
      onQueryEvent: onQueryEvent,
      onDone: onDone,
    } = h,
    [abortController] = y($Kt),
    [phase, setPhase] = y("cancellable"),
    kt;
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
  )
    ((kt = () => {
      let At = !0;
      return (
        toggleFastMode(
          session,
          enable,
          getAppState,
          setAppState,
          "shortcut",
          void 0,
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
                getAppState: getAppState,
                setAppState: setAppState,
                session: session,
                storageV5: storageV5,
                options: { mcpClients: [] },
              },
              Ot,
              () => isBridgeOrTransport(session),
            ),
          onQueryEvent,
        ).then(
          (Et) => {
            if (At && Et !== dze) onDone(Et);
          },
          (Dt) => {
            if (At) onDone(Nf(errorMessage(Dt)), { display: "system" });
          },
        ),
        () => {
          At = !1;
        }
      );
    }),
      (rt[0] = abortController.signal),
      (rt[1] = credentials),
      (rt[2] = enable),
      (rt[3] = getAppState),
      (rt[4] = onDone),
      (rt[5] = onQueryEvent),
      (rt[6] = session),
      (rt[7] = setAppState),
      (rt[8] = storageV5),
      (rt[9] = kt));
  else kt = rt[9];
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
  )
    ((Lt = [
      abortController,
      session,
      getAppState,
      setAppState,
      storageV5,
      credentials,
      enable,
      onQueryEvent,
      onDone,
    ]),
      (rt[10] = abortController),
      (rt[11] = credentials),
      (rt[12] = enable),
      (rt[13] = getAppState),
      (rt[14] = onDone),
      (rt[15] = onQueryEvent),
      (rt[16] = session),
      (rt[17] = setAppState),
      (rt[18] = storageV5),
      (rt[19] = Lt));
  else Lt = rt[19];
  switch ((P(kt, Lt), phase)) {
    case "cancelled": {
      return null;
    }
    case "applying": {
      const oo = ml() ? "Waiting for the workspace\u2026" : "Applying fast mode\u2026";
      let Xt;
      if (rt[20] === MEMO_CACHE_SENTINEL) ((Xt = e(Text, { dimColor: !0, children: oo })), (rt[20] = Xt));
      else Xt = rt[20];
      return Xt;
    }
    case "cancellable": {
      const oo = enable ? "Turning fast mode on\u2026" : "Turning fast mode off\u2026";
      let Xt;
      if (rt[21] !== abortController || rt[22] !== onDone)
        ((Xt = () => {
          (abortController.abort(), setPhase("cancelled"), onDone(dze, { display: "system" }));
        }),
          (rt[21] = abortController),
          (rt[22] = onDone),
          (rt[23] = Xt));
      else Xt = rt[23];
      let io;
      if (rt[24] !== oo || rt[25] !== Xt)
        ((io = e(PromptDialog, { message: oo, onCancel: Xt })), (rt[24] = oo), (rt[25] = Xt), (rt[26] = io));
      else io = rt[26];
      return io;
    }
  }
}
//@ chunk-18hwfzwa.js:520970-521487 facade-exports = call (0.791)
async function call_3(onDone, context, args) {
  if (!isFastModeEnabled())
    return (onDone(getFastModeUnavailableMessage() ?? "Fast mode is not available"), null);
  let arg = args?.trim().toLowerCase();
  if (arg === "on" || arg === "off")
    return e(FastModeToggleProgress, {
      enable: arg === "on",
      session: context.session,
      getAppState: context.getAppState,
      setAppState: context.setAppState,
      storageV5: context.storageV5,
      credentials: context.credentials,
      onQueryEvent: context.onQueryEvent,
      onDone: onDone,
    });
  await withDeadline(prefetchFastModeStatus(context.storageV5, context.credentials), DIo);
  let unavailableReason = getFastModeUnavailableMessage();
  return (
    logEvent("tengu_fast_mode_picker_shown", {
      unavailable_reason: fromEnum(getFastModeUnavailableReasonCode() ?? ""),
    }),
    e(FastModePicker, { onDone: onDone, unavailableReason: unavailableReason, storageV5: context.storageV5 })
  );
}
//@ chunk-1n1kvmcz.js:1254-1305 placement
var DIo = 8000,
  dze = "Fast mode unchanged (cancelled)";
/**
 * 当前模型不支持快速模式时返回要切换到的 Opus 别名（与默认模型相同则返回 null）。
 */
//@ chunk-1n1kvmcz.js:1305-1429 placement
function getFastModeSwitchModel(n) {
  if (supportsFastMode(useMainLoopModel_2({ ...n, toolPermissionContext: { mode: "default" } }))) return;
  let e = defaultOpusAlias();
  return parseUserSpecifiedModel(e) === parseUserSpecifiedModel(getDefaultMainLoopModelSetting()) ? null : e;
}
//@ chunk-1n1kvmcz.js:1429-1779 placement
async function confirmFastModeSwitch(n, e, o) {
  let i = getFastModeSwitchModel(e());
  if (i === void 0 || ml() || !WZ(n)) return { vetted: Zan, messages: [] };
  let s = await runPreModelSwitchHooks(n, e, i, "command", { signal: o });
  if (s.decision === "proceed") return { vetted: { target: i }, messages: s.messages };
  return {
    refusal: preModelSwitchBlockedMessage(
      i,
      s.decision === "ask"
        ? `${s.reason ?? "confirmation required"} (use /model to switch, then /fast)`
        : s.reason,
      s.messages,
    ),
  };
}
//@ chunk-1n1kvmcz.js:1779-1801 placement
var Zan = { unvetted: !0 };
/**
 * 工作区快速模式切换失败（timeout/stale/refused）的提示文本。
 */
//@ chunk-1n1kvmcz.js:1801-2144 placement
function describeWorkspaceFastModeFailure(n, e) {
  let o = e ? "enabled" : "disabled";
  switch (n.kind) {
    case "timeout":
      return `No response from the workspace \u2014 fast mode may still have been ${o} there`;
    case "stale":
      return `Fast mode was not ${o}: the model changed while PreModelSwitch hooks ran; try again`;
    case "refused":
      return `Fast mode was not ${o} on the workspace: ${n.reason}`;
  }
}
//@ chunk-1n1kvmcz.js:2144-3163 placement
function applyFastModeToWorkspace(n, e, o, i = !0, s, m = Zan) {
  if ((clearFastModeCooldown(), e)) clearFastRejectedFallbackModels();
  let k = () => {
      if (i && !getIsNonInteractiveSession()) return;
      setFlagSettingsInline({ ...(getFlagSettingsInline() ?? {}), fastMode: e });
    },
    M = () => {
      if ((applySessionSettingsPatch({ fastMode: e }, o), e)) {
        let r = !1,
          u = null;
        if (
          (o((l) => {
            let g = getFastModeSwitchModel(l);
            if (g === void 0) return l;
            if (!("unvetted" in m) && m.target !== g) return l;
            return (
              zE(n, l, g, "command"),
              (r = !0),
              (u = g),
              { ...l, mainLoopModel: g, mainLoopModelForSession: null }
            );
          }),
          r && hasSessionIngressAuthForFastMode())
        )
          setMainLoopModelOverride(u);
      }
      if (!i)
        if (!vS() && hasSessionIngressAuthForFastMode()) settingsChangeDetector.notifyChange("flagSettings");
        else or();
    };
  if (ml()) {
    k();
    let r = Jn()?.sendControlRequest({
      subtype: "apply_flag_settings",
      settings: { fastMode: e ? !0 : null, ...(e && { model: defaultOpusAlias() }) },
    });
    if (!r) return (M(), Promise.resolve(void 0));
    return r.then(
      () => {
        M();
        return;
      },
      (u) => (
        logForDebugging(`fast mode: workspace did not accept apply_flag_settings: ${errorMessage(u)}`, {
          level: "error",
        }),
        u instanceof ControlRequestTimeoutError
          ? { kind: "timeout" }
          : { kind: "refused", reason: Nf(errorMessage(u)) }
      ),
    );
  }
  if (e && !("unvetted" in m)) {
    let r = !1;
    if (
      (o((u) => {
        let l = getFastModeSwitchModel(u);
        return ((r = l !== void 0 && l !== m.target), u);
      }),
      r)
    )
      return Promise.resolve({ kind: "stale" });
  }
  if ((k(), syncFastModeFlag(e, s), i))
    updateSettingsForSource("userSettings", { fastMode: e ? !0 : void 0 }, void 0, s);
  return (M(), Promise.resolve(void 0));
}
//@ chunk-1n1kvmcz.js:3163-3567 placement
function opus48FastModeDeprecationNotice(n) {
  if (!xit(n)) return null;
  let e = getFeatureValue_CACHED_MAY_BE_STALE("tengu_sunset_penguin_opus48", "2026-11-30"),
    parse = Date.parse(e);
  if (Number.isNaN(parse) || Date.now() >= parse) return null;
  return {
    key: "opus48-fast-mode-deprecation",
    text: `Opus 4.8 fast mode is deprecated and will be removed on ${new Date(parse).toLocaleDateString("en-US", { month: "short", day: "numeric", timeZone: "UTC" })}`,
    priority: "immediate",
    requeueOnPreempt: !0,
    color: "warning",
  };
}
//@ chunk-1n1kvmcz.js:3567-4963 placement
async function toggleFastMode(n, e, o, i, s, m = !0, k, M, r, u, l, g) {
  let _ = () =>
      serializeModelSwitch(n, async () => {
        if (M) await withDeadline(M(), DIo);
        if (r?.aborted) return { kind: "refused", refusal: dze };
        let F = getFastModeUnavailableMessage(void 0, {
          sessionOptIn: !m && !vS() && hasSessionIngressAuthForFastMode(),
          sessionOnly: !m || getIsNonInteractiveSession(),
        });
        if (F && e) return { kind: "refused", refusal: `Fast mode unavailable: ${F}` };
        let y = Zan,
          h = [];
        if (e) {
          let p = await confirmFastModeSwitch(n, o, r);
          if (r?.aborted) return { kind: "refused", refusal: dze };
          if (p.refusal !== void 0) return { kind: "refused", refusal: p.refusal };
          ((y = p.vetted), (h = p.messages));
        }
        let w = e && getFastModeSwitchModel(o()) !== void 0;
        return (
          u?.(),
          {
            kind: "applied",
            remote: await applyFastModeToWorkspace(n, e, i, m, k, y),
            willPromote: w,
            hookMessages: h,
          }
        );
      }),
    S = {},
    P =
      m && l !== void 0 && !ml()
        ? await l(e, async () => {
            if (((S.outcome = await _()), S.outcome.kind === "refused")) return S.outcome.refusal;
            return S.outcome.remote === void 0
              ? void 0
              : describeWorkspaceFastModeFailure(S.outcome.remote, e);
          })
        : void 0,
    f = S.outcome ?? (P === void 0 ? await _() : void 0);
  if (f === void 0) return r?.aborted ? dze : (P ?? "Fast mode was not changed");
  if (f.kind === "refused") return f.refusal;
  if (f.remote !== void 0) return describeWorkspaceFastModeFailure(f.remote, e);
  if ((logEvent("tengu_fast_mode_toggled", { enabled: e, source: fromEnum(s), remote: ml() }), e)) {
    let F = getFastIconString(!0),
      y = f.willPromote ? `${MODEL_SET_TO_INFIX}${toInlineCode(defaultOpusLabel())}` : "",
      h = getMainLoopModel(),
      w = getCanonicalName(supportsFastMode(h) ? h : parseUserSpecifiedModel(defaultOpusAlias())),
      O = formatModelPricing(getFastModeCosts(w)),
      p = opus48FastModeDeprecationNotice(w);
    if (p) g?.({ type: "notification", notification: p });
    let E = m ? "" : " (this session only)",
      T =
        f.hookMessages.length > 0
          ? `
${f.hookMessages.map(Nf).join(`
`)}`
          : "";
    return `${F} ${FAST_MODE_ON_TEXT}${y} \xB7 ${O}${E}${T}`;
  } else return `Fast mode OFF${m ? "" : " (this session only)"}`;
}
//@ chunk-d1cgs5na.js:1502-1699 placement
function formatFastModeSuffix(e, o, s, a) {
  let n = isFastModeEnabled(),
    l = n && o && (!e || a?.announceKeptOn === !0),
    r = n && !!e && !o;
  return (
    (l ? " \xB7 Fast mode ON" : "") +
    (isBilledAsExtraUsage(s, o, isOpus1mMergeEnabled()) ? " \xB7 Draws from usage credits" : "") +
    (r ? " \xB7 Fast mode OFF" : "")
  );
}
//@ chunk-d1cgs5na.js:1699-1834 fingerprint = handleFastModeShortcut (0.484)
function handleFastModeShortcut(enable, getAppState, setAppState) {
  if (!!enable === getAppState) return null;
  return getAppState
    ? `Fast mode ON${isBilledAsExtraUsage(setAppState, !0, isOpus1mMergeEnabled()) ? " \xB7 Draws from usage credits" : ""}`
    : "Fast mode OFF";
}
/**
 * 按设置重算 fastMode 写回应用状态，开启时预取快速模式状态。
 */
//@ chunk-aepeg2w5.js:357680-357806 fingerprint = _temp3 (0.717)
function refreshFastModeFromSettings(e, n, r) {
  if (
    (n((s) => {
      let h = isFastModeSettingOn(s.settings);
      return s.fastMode === h ? s : { ...s, fastMode: h };
    }),
    isFastModeOrgPending(e().fastMode === !0))
  )
    prefetchFastModeStatus(r);
}
//@ chunk-ag5x7vhf.js:112894-112980 fingerprint = _temp (0.398)
function CE(s) {
  return s.setupIssues.unknownModelWindowWarning ? s.mainLoopModel : null;
}
//@ chunk-jbv0t0w5.js:37202-37589 fingerprint = applyFastMode (0.495)
function applyFastMode(enable, setAppState) {
  let o, r;
  if (
    (setAppState((prev) => {
      let d = enable.overrideValue ?? enable.forSessionValue ?? enable.appStateModel,
        i = isFastModeEnabled() ? isFastModeActive(d, prev.fastMode) : !!prev.fastMode;
      return (
        (o = prev.fastMode),
        (r = i),
        prev.mainLoopModel === enable.appStateModel &&
        prev.mainLoopModelForSession === enable.forSessionValue &&
        i === !!prev.fastMode
          ? prev
          : {
              ...prev,
              mainLoopModel: enable.appStateModel,
              mainLoopModelForSession: enable.forSessionValue,
              fastMode: i,
            }
      );
    }),
    r !== void 0)
  )
    reportFastModeToggle(o, r);
  setMainLoopModelOverride(enable.overrideValue);
}

export {
  formatFastModeSuffix,
  FastModePicker,
  handleFastModeShortcut,
  refreshFastModeFromSettings,
  CE,
  applyFastMode,
  getFastModeSwitchModel,
  toggleFastMode,
};
