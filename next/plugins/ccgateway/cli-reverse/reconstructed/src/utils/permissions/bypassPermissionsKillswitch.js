/**
 * utils/permissions/bypassPermissionsKillswitch.ts
 *
 * auto 模式闸门检查（每宿主一次、模型/fast 变化时重跑）与不可用通知；启动权限模式写入 AppState。
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/utils/permissions/bypassPermissionsKillswitch.ts
 * pieces: chunk-01b7fqej.js (5), chunk-czq1j3j2.js (2)
 * attribution: placement 3, fingerprint 3, file-local 1
 * (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.
 */
import { HostScoped } from "../hostScoped.js";
import {
  verifyAutoModeGateAccess,
  getAutoModeUnavailableNotification,
  setPermissionModeWithGuards,
} from "./permissionSetup.js";
import { useAppState, useSetAppState, useAppStoreDirect, useAppStateSession } from "../../state/AppState.js";
import { useNotifications } from "../../context/notifications.js";
import { useHost } from "../../context/session.js";
import { useRef, useEffect } from "../../../vendor/react/cjs/react.production.js";
import { getIsRemoteMode } from "../../bootstrap/state.js";
import { settingsChangedSignal } from "../settings/applySettingsChange.js";
import {
  permissionModeFromString,
  isExternalPermissionMode,
  toExternalPermissionMode,
} from "./PermissionMode.js";
import { deferInit } from "../../../runtime/deferred-init.js";

//@ chunk-01b7fqej.js:4069-4296 placement
/**
 * 每个宿主一份的 auto 闸门检查状态：claimAutoModeCheck 保证只跑一次，rearm 后下次视为非启动运行。
 */
class AutoModeGateCheckState {
  #e = false;
  #o = false;
  get autoModeCheckRan() {
    return this.#e;
  }
  get isLaunchRun() {
    return !this.#o;
  }
  claimAutoModeCheck() {
    if (this.#e) return false;
    this.#e = true;
    return true;
  }
  rearmAutoModeCheck() {
    this.#e = false;
    this.#o = true;
  }
  reset() {
    this.#e = false;
    this.#o = false;
  }
}
//@ chunk-01b7fqej.js:4296-4319 placement
var AUTO_MODE_GATE_CHECK_STATE; // deferred: uses AutoModeGateCheckState of its import cycle while loading; runs once the cycle is complete
deferInit("chunk-01b7fqej.js:4296", () => {
  AUTO_MODE_GATE_CHECK_STATE = new HostScoped(() => new AutoModeGateCheckState());
});
//@ chunk-01b7fqej.js:4319-4431 fingerprint (2.1.88 match: checkAndDisableAutoModeIfNeeded, 0.673)
/**
 * 构造 auto 模式闸门通知对象（key auto-mode-gate-notification，警告色、高优先级）。
 */
function createAutoModeGateNotification(text) {
  return {
    key: "auto-mode-gate-notification",
    kind: "warning",
    text,
    color: "warning",
    priority: "high",
  };
}
//@ chunk-01b7fqej.js:4431-4804 file-local
/**
 * 每宿主只跑一次：调用 verifyAutoModeGateAccess，按返回的 updateContext 更新 toolPermissionContext（踢出 auto 或刷新可用性），并排队/推送不可用通知。
 */
async function checkAndDisableAutoModeIfNeeded(host, context, setAppState, fastMode, addNotification) {
  let gateState = AUTO_MODE_GATE_CHECK_STATE.of(host);
  if (!gateState.claimAutoModeCheck()) return;
  let { updateContext, notification } = await verifyAutoModeGateAccess(
    context,
    fastMode,
    gateState.isLaunchRun,
  );
  setAppState((prev) => {
    let nextCtx = updateContext(prev.toolPermissionContext);
    let newState =
      nextCtx === prev.toolPermissionContext
        ? prev
        : {
            ...prev,
            toolPermissionContext: nextCtx,
          };
    if (!notification || addNotification) return newState;
    return {
      ...newState,
      notifications: {
        ...newState.notifications,
        queue: [...newState.notifications.queue, createAutoModeGateNotification(notification)],
      },
    };
  });
  if (notification && addNotification) addNotification(createAutoModeGateNotification(notification));
}
//@ chunk-01b7fqej.js:4804-4849 placement
function rearmAutoModeGateCheck(host) {
  AUTO_MODE_GATE_CHECK_STATE.of(host).rearmAutoModeCheck();
}
//@ chunk-czq1j3j2.js:218529-218896 fingerprint (2.1.88 match: useKickOffCheckAndDisableAutoModeIfNeeded, 0.776)
/**
 * React hook：主模型、会话模型或 fast 模式变化时重新运行 auto 闸门检查；settings 变化时推送 "auto mode disabled by settings" 通知。
 */
function useKickOffCheckAndDisableAutoModeIfNeeded() {
  let mainLoopModel = useAppState((state) => state.mainLoopModel);
  let mainLoopModelForSession = useAppState((state) => state.mainLoopModelForSession);
  let fastMode = useAppState((state) => state.fastMode);
  let setAppState = useSetAppState();
  let store = useAppStoreDirect();
  let { addNotification } = useNotifications();
  let store_2 = useHost();
  let isFirstRunRef = useRef(true);
  useEffect(() => {
    if (getIsRemoteMode()) return;
    if (isFirstRunRef.current) isFirstRunRef.current = false;
    else rearmAutoModeGateCheck(store_2);
    checkAndDisableAutoModeIfNeeded(
      store_2,
      store.getState().toolPermissionContext,
      setAppState,
      fastMode,
      addNotification,
    );
  }, [mainLoopModel, mainLoopModelForSession, fastMode]);
  let appStateSession = useAppStateSession();
  useEffect(
    () =>
      settingsChangedSignal
        .of(appStateSession)
        .subscribe(() =>
          addNotification(createAutoModeGateNotification(getAutoModeUnavailableNotification("settings"))),
        ),
    [addNotification, appStateSession],
  );
}
//@ chunk-czq1j3j2.js:1733466-1733839 fingerprint (2.1.88 match: checkAndDisableBypassPermissionsIfNeeded, 0.692)
/**
 * 把模式（规范化为对外模式）写入 AppState，并同步 isBypassPermissionsModeAvailable（目标为 bypass 时置 true）；返回 {ok, mode} 或失败结果。
 */
function applyStartupPermissionMode(mode, context, setAppState) {
  let normalizedMode = permissionModeFromString(mode);
  let externalMode = isExternalPermissionMode(normalizedMode)
    ? normalizedMode
    : permissionModeFromString(toExternalPermissionMode(normalizedMode));
  let isBypass = externalMode === "bypassPermissions";
  let result = setPermissionModeWithGuards(
    externalMode,
    isBypass
      ? {
          ...context,
          isBypassPermissionsModeAvailable: true,
        }
      : context,
    (applyMode) =>
      setAppState((prev) => {
        let toolPermissionContext = prev.toolPermissionContext;
        let nextContext =
          toolPermissionContext.isBypassPermissionsModeAvailable === isBypass
            ? toolPermissionContext
            : {
                ...toolPermissionContext,
                isBypassPermissionsModeAvailable: isBypass,
              };
        let updatedContext = applyMode(nextContext);
        return updatedContext === toolPermissionContext
          ? prev
          : {
              ...prev,
              toolPermissionContext: updatedContext,
            };
      }),
  );
  return result.ok
    ? {
        ok: true,
        mode: externalMode,
      }
    : result;
}
export {
  createAutoModeGateNotification,
  useKickOffCheckAndDisableAutoModeIfNeeded,
  checkAndDisableAutoModeIfNeeded,
  applyStartupPermissionMode,
  rearmAutoModeGateCheck,
};
