/**
 * hooks/notifs/useLspInitializationNotification.tsx
 *
 * LSP 初始化失败通知（LSP error: …）。
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/hooks/notifs/useLspInitializationNotification.tsx
 * pieces: chunk-a8hqqf13.js (1), chunk-czq1j3j2.js (1)
 * attribution: fingerprint 2
 * (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.
 */
import { isCoordinatorEnvSet } from "../../coordinator/coordinatorMode.js";
import { logForDebugging } from "../../utils/debug.js";
import { printableName } from "../../utils/printableName.js";
import { logSetupIssues } from "../../utils/notifications/setupIssues.js";
import { isRemoteSessionAvailable } from "../../remote/remoteMode.js";
import { getIsScrollDraining } from "../../bootstrap/state.js";
import { getInitializationStatus, getLspServerManager } from "../../services/lsp/manager.js";
import { startClockInterval } from "../../ink/components/Input.js";

//@ chunk-a8hqqf13.js:635-744 fingerprint (2.1.88 match: _temp2, 1)
function pluginErrorKey(pluginError) {
  return pluginError.type === "generic-error"
    ? `generic-error:${pluginError.source}:${pluginError.error}`
    : `${pluginError.type}:${pluginError.source}`;
}
//@ chunk-czq1j3j2.js:1811444-1812616 fingerprint (2.1.88 match: useLspInitializationNotification, 0.551)
/**
 * 启动通知"lsp-initialization"：每 5 秒检查 LSP 管理器与各服务器状态，把初始化失败和服务器错误写进插件错误列表（去重）并更新 setupIssues.lspFailedCount；全部就绪后停止轮询。
 */
var LSP_POLL_INTERVAL_MS = 5000;
var lspInitializationNoticeSpec = {
  id: "lsp-initialization",
  deps: (noticeState) => [noticeState.store, noticeState.clock],
  setup() {
    let reportedErrors = new Set();
    return ({ store, clock }) => {
      if (!isCoordinatorEnvSet()) return;
      function reportLspError(source, errorMessage) {
        let errorKey = `${source}:${errorMessage}`;
        if (reportedErrors.has(errorKey)) return;
        reportedErrors.add(errorKey);
        logForDebugging(`LSP error: ${source} - ${errorMessage}`);
        store.setState((prev) => {
          let existingKeys = new Set(
            prev.plugins.errors.map((e) => {
              if (e.type === "generic-error") return `generic-error:${e.source}:${e.error}`;
              return `${e.type}:${e.source}`;
            }),
          );
          let stateErrorKey = `generic-error:${source}:${errorMessage}`;
          if (existingKeys.has(stateErrorKey)) return prev;
          return {
            ...prev,
            plugins: {
              ...prev.plugins,
              errors: [
                ...prev.plugins.errors,
                {
                  type: "generic-error",
                  source,
                  error: printableName(errorMessage, 500),
                },
              ],
            },
          };
        });
      }
      function setFailedCount(failedCount) {
        store.setState((state) => {
          if (state.setupIssues.lspFailedCount === failedCount) return state;
          logSetupIssues("LSP", failedCount);
          return {
            ...state,
            setupIssues: {
              ...state.setupIssues,
              lspFailedCount: failedCount,
            },
          };
        });
      }
      function pollLspStatus() {
        if (isRemoteSessionAvailable()) return true;
        if (getIsScrollDraining()) return true;
        let status = getInitializationStatus();
        if (status.status === "failed") {
          reportLspError("lsp-manager", status.error.message);
          setFailedCount(1);
          return false;
        }
        if (status.status === "pending" || status.status === "not-started") return true;
        let manager = getLspServerManager();
        if (manager) {
          let servers = manager.getAllServers();
          let errorServerCount = 0;
          for (let [serverName, server] of servers)
            if (server.state === "error" && server.lastError) {
              errorServerCount++;
              reportLspError(serverName, server.lastError.message);
            }
          setFailedCount(errorServerCount);
        }
        return true;
      }
      if (!isRemoteSessionAvailable() && !pollLspStatus()) return;
      let clockInterval = startClockInterval(
        clock,
        () => {
          if (!pollLspStatus()) clockInterval();
        },
        LSP_POLL_INTERVAL_MS,
      );
      return clockInterval;
    };
  },
};
export { pluginErrorKey, lspInitializationNoticeSpec };
