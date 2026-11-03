/**
 * utils/permissions/bypassPermissionsKillswitch.ts
 *
 * auto 模式闸门检查（每宿主一次、模型/fast 变化时重跑）与不可用通知；启动权限模式写入 AppState。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/utils/permissions/bypassPermissionsKillswitch.ts
 * pieces: chunk-18hwfzwa.js (2), chunk-pc1rmcr2.js (5)
 * attribution: fingerprint 3, placement 3, file-local 1
 */
import { HostScoped } from "../hostScoped.js";
import {
  verifyAutoModeGateAccess,
  getAutoModeUnavailableNotification,
  setPermissionModeWithGuards,
} from "./permissionSetup.js";
import { useAppState, useSetAppState, Cr, useAppStateSession } from "../../state/AppState.js";
import { useNotifications } from "../../context/notifications.js";
import { useHost } from "../../context/session.js";
import { R, P } from "../../../vendor/react/cjs/react.production.js";
import { getIsRemoteMode } from "../../bootstrap/state.js";
import { e_o } from "../settings/applySettingsChange.js";
import {
  permissionModeFromString,
  isExternalPermissionMode,
  toExternalPermissionMode,
} from "./PermissionMode.js";

/**
 * 每个宿主一份的 auto 闸门检查状态：claimAutoModeCheck 保证只跑一次，rearm 后下次视为非启动运行。
 */
//@ chunk-pc1rmcr2.js:4026-4253 placement
class AutoModeGateCheckState {
  #e = !1;
  #o = !1;
  get autoModeCheckRan() {
    return this.#e;
  }
  get isLaunchRun() {
    return !this.#o;
  }
  claimAutoModeCheck() {
    if (this.#e) return !1;
    return ((this.#e = !0), !0);
  }
  rearmAutoModeCheck() {
    ((this.#e = !1), (this.#o = !0));
  }
  reset() {
    ((this.#e = !1), (this.#o = !1));
  }
}
//@ chunk-pc1rmcr2.js:4253-4276 placement
var AUTO_MODE_GATE_CHECK_STATE = new HostScoped(() => new AutoModeGateCheckState());
/**
 * 构造 auto 模式闸门通知对象（key auto-mode-gate-notification，警告色、高优先级）。
 */
//@ chunk-pc1rmcr2.js:4276-4388 fingerprint = checkAndDisableAutoModeIfNeeded (0.673)
function createAutoModeGateNotification(text) {
  return {
    key: "auto-mode-gate-notification",
    kind: "warning",
    text: text,
    color: "warning",
    priority: "high",
  };
}
/**
 * 每宿主只跑一次：调用 verifyAutoModeGateAccess，按返回的 updateContext 更新 toolPermissionContext（踢出 auto 或刷新可用性），并排队/推送不可用通知。
 */
//@ chunk-pc1rmcr2.js:4388-4761 file-local
async function checkAndDisableAutoModeIfNeeded(host, context, setAppState, fastMode, addNotification) {
  let of = AUTO_MODE_GATE_CHECK_STATE.of(host);
  if (!of.claimAutoModeCheck()) return;
  let { updateContext: updateContext, notification: notification } = await verifyAutoModeGateAccess(
    context,
    fastMode,
    of.isLaunchRun,
  );
  if (
    (setAppState((m) => {
      let toolPermissionContext = updateContext(m.toolPermissionContext),
        s =
          toolPermissionContext === m.toolPermissionContext
            ? m
            : { ...m, toolPermissionContext: toolPermissionContext };
      if (!notification || addNotification) return s;
      return {
        ...s,
        notifications: {
          ...s.notifications,
          queue: [...s.notifications.queue, createAutoModeGateNotification(notification)],
        },
      };
    }),
    notification && addNotification)
  )
    addNotification(createAutoModeGateNotification(notification));
}
//@ chunk-pc1rmcr2.js:4761-4806 placement
function rearmAutoModeGateCheck(e) {
  AUTO_MODE_GATE_CHECK_STATE.of(e).rearmAutoModeCheck();
}
/**
 * React hook：主模型、会话模型或 fast 模式变化时重新运行 auto 闸门检查；settings 变化时推送 "auto mode disabled by settings" 通知。
 */
//@ chunk-18hwfzwa.js:213494-213861 fingerprint = useKickOffCheckAndDisableAutoModeIfNeeded (0.776)
function useKickOffCheckAndDisableAutoModeIfNeeded() {
  let mainLoopModel = useAppState((We) => We.mainLoopModel),
    mainLoopModelForSession = useAppState((We) => We.mainLoopModelForSession),
    fastMode = useAppState((We) => We.fastMode),
    setAppState = useSetAppState(),
    store = Cr(),
    { addNotification: addNotification } = useNotifications(),
    Re = useHost(),
    isFirstRunRef = R(!0);
  P(() => {
    if (getIsRemoteMode()) return;
    if (isFirstRunRef.current) isFirstRunRef.current = !1;
    else rearmAutoModeGateCheck(Re);
    checkAndDisableAutoModeIfNeeded(
      Re,
      store.getState().toolPermissionContext,
      setAppState,
      fastMode,
      addNotification,
    );
  }, [mainLoopModel, mainLoopModelForSession, fastMode]);
  let He = useAppStateSession();
  P(
    () =>
      e_o
        .of(He)
        .subscribe(() =>
          addNotification(createAutoModeGateNotification(getAutoModeUnavailableNotification("settings"))),
        ),
    [addNotification, He],
  );
}
/**
 * 把模式（规范化为对外模式）写入 AppState，并同步 isBypassPermissionsModeAvailable（目标为 bypass 时置 true）；返回 {ok, mode} 或失败结果。
 */
//@ chunk-18hwfzwa.js:1687162-1687535 fingerprint = checkAndDisableBypassPermissionsIfNeeded (0.691)
function applyStartupPermissionMode(mode, context, setAppState) {
  let L = permissionModeFromString(mode),
    ee = isExternalPermissionMode(L) ? L : permissionModeFromString(toExternalPermissionMode(L)),
    ke = ee === "bypassPermissions",
    Re = setPermissionModeWithGuards(
      ee,
      ke ? { ...context, isBypassPermissionsModeAvailable: !0 } : context,
      (Be) =>
        setAppState((prev) => {
          let toolPermissionContext = prev.toolPermissionContext,
            ze =
              toolPermissionContext.isBypassPermissionsModeAvailable === ke
                ? toolPermissionContext
                : { ...toolPermissionContext, isBypassPermissionsModeAvailable: ke },
            Xe = Be(ze);
          return Xe === toolPermissionContext ? prev : { ...prev, toolPermissionContext: Xe };
        }),
    );
  return Re.ok ? { ok: !0, mode: ee } : Re;
}

export {
  createAutoModeGateNotification,
  useKickOffCheckAndDisableAutoModeIfNeeded,
  checkAndDisableAutoModeIfNeeded,
  applyStartupPermissionMode,
  rearmAutoModeGateCheck,
};
