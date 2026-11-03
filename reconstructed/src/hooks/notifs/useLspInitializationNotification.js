/**
 * hooks/notifs/useLspInitializationNotification.tsx
 *
 * LSP 初始化失败通知（LSP error: …）。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/hooks/notifs/useLspInitializationNotification.tsx
 * pieces: chunk-18hwfzwa.js (1), chunk-7nse75qx.js (1)
 * attribution: fingerprint 2
 */
import { isCoordinatorEnvSet } from "../../coordinator/coordinatorMode.js";
import { logForDebugging } from "../../utils/debug.js";
import { printableName } from "../../utils/printableName.js";
import { logSetupIssues } from "../../utils/notifications/setupIssues.js";
import { isRemoteSessionAvailable } from "../../remote/remoteMode.js";
import { getIsScrollDraining } from "../../bootstrap/state.js";
import { getInitializationStatus, getLspServerManager } from "../../services/lsp/manager.js";
import { startClockInterval } from "../../ink/components/Input.js";

//@ chunk-18hwfzwa.js:1764183-1765355 fingerprint = useLspInitializationNotification (0.551)
/**
 * 启动通知"lsp-initialization"：每 5 秒检查 LSP 管理器与各服务器状态，把初始化失败和服务器错误写进插件错误列表（去重）并更新 setupIssues.lspFailedCount；全部就绪后停止轮询。
 */
var LSP_POLL_INTERVAL_MS = 5000;
var lspInitializationNoticeSpec = {
  id: "lsp-initialization",
  deps: (h) => [h.store, h.clock],
  setup() {
    let h = new Set();
    return ({ store, clock }) => {
      if (!isCoordinatorEnvSet()) return;
      function L(source, errorMessage) {
        let errorKey = `${source}:${errorMessage}`;
        if (h.has(errorKey)) return;
        h.add(errorKey);
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
      function ee(Be) {
        store.setState((He) => {
          if (He.setupIssues.lspFailedCount === Be) return He;
          logSetupIssues("LSP", Be);
          return {
            ...He,
            setupIssues: {
              ...He.setupIssues,
              lspFailedCount: Be,
            },
          };
        });
      }
      function ke() {
        if (isRemoteSessionAvailable()) return true;
        if (getIsScrollDraining()) return true;
        let status = getInitializationStatus();
        if (status.status === "failed") {
          L("lsp-manager", status.error.message);
          ee(1);
          return false;
        }
        if (status.status === "pending" || status.status === "not-started") return true;
        let manager = getLspServerManager();
        if (manager) {
          let servers = manager.getAllServers();
          let ze = 0;
          for (let [serverName, server] of servers)
            if (server.state === "error" && server.lastError) {
              ze++;
              L(serverName, server.lastError.message);
            }
          ee(ze);
        }
        return true;
      }
      if (!isRemoteSessionAvailable() && !ke()) return;
      let clockInterval = startClockInterval(
        clock,
        () => {
          if (!ke()) clockInterval();
        },
        LSP_POLL_INTERVAL_MS,
      );
      return clockInterval;
    };
  },
};
//@ chunk-7nse75qx.js:634-743 fingerprint = _temp2 (1)
function pluginErrorKey(e) {
  return e.type === "generic-error" ? `generic-error:${e.source}:${e.error}` : `${e.type}:${e.source}`;
}
export { lspInitializationNoticeSpec, pluginErrorKey };
