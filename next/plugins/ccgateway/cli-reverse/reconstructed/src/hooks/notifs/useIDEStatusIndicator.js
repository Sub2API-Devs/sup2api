/**
 * hooks/notifs/useIDEStatusIndicator.tsx
 *
 * IDE 连接状态通知（断开、扩展安装失败等）。
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/hooks/notifs/useIDEStatusIndicator.tsx
 * pieces: chunk-czq1j3j2.js (3)
 * attribution: fingerprint 2, file-last-pair 1
 */
import { useIdeConnectionStatus } from "../useIdeConnectionStatus.js";
import { isRemoteSessionAvailable } from "../../remote/remoteMode.js";

//@ chunk-czq1j3j2.js:386086-386245 fingerprint (2.1.88 match: _temp2, 0.379)
function strandedResumeFailedNotification(hasShownHintRef_0, addNotification_0) {
  return {
    key: `stranded-resume-failed-${hasShownHintRef_0}`,
    kind: "warning",
    text: `Failed to deliver queued message to agent: ${addNotification_0}`,
    color: "error",
    priority: "low",
  };
}
//@ chunk-czq1j3j2.js:1808783-1808948 file-last-pair
function ideStatusFromState(current) {
  let { status, ideName } = useIdeConnectionStatus(current.mcpClients);
  return {
    ideStatus: status,
    ideName,
    showIDEInstallError: Boolean(current.ideInstallationStatus?.error) && status !== "connected",
  };
}
//@ chunk-czq1j3j2.js:1808948-1809796 fingerprint (2.1.88 match: useIDEStatusIndicator, 0.719)
/**
 * 启动通知规格：IDE 已断开（ide-status-disconnected）与 IDE 扩展安装失败（ide-status-install-error），状态恢复时自动移除。
 */
var IDE_DISCONNECTED_NOTICE_SPEC = {
  id: "ide-status-disconnected",
  deps: (noticeState) => {
    let { ideStatus, ideName, showIDEInstallError } = ideStatusFromState(noticeState);
    return [
      noticeState.addNotification,
      noticeState.removeNotification,
      ideStatus,
      ideName,
      showIDEInstallError,
    ];
  },
  setup: () => (noticeState) => {
    if (isRemoteSessionAvailable()) return;
    let { ideStatus, ideName, showIDEInstallError } = ideStatusFromState(noticeState);
    if (showIDEInstallError || ideStatus !== "disconnected" || !ideName) {
      noticeState.removeNotification("ide-status-disconnected");
      return;
    }
    noticeState.addNotification({
      key: "ide-status-disconnected",
      kind: "warning",
      text: `${ideName} disconnected`,
      color: "error",
      priority: "medium",
    });
  },
};
var IDE_INSTALL_ERROR_NOTICE_SPEC = {
  id: "ide-status-install-error",
  deps: (noticeState) => [
    noticeState.addNotification,
    noticeState.removeNotification,
    ideStatusFromState(noticeState).showIDEInstallError,
  ],
  setup: () => (noticeState) => {
    if (isRemoteSessionAvailable()) return;
    if (!ideStatusFromState(noticeState).showIDEInstallError) {
      noticeState.removeNotification("ide-status-install-error");
      return;
    }
    noticeState.addNotification({
      key: "ide-status-install-error",
      kind: "warning",
      text: "IDE extension install failed (see /status for info)",
      color: "error",
      priority: "medium",
    });
  },
};
export { IDE_DISCONNECTED_NOTICE_SPEC, IDE_INSTALL_ERROR_NOTICE_SPEC, strandedResumeFailedNotification };
