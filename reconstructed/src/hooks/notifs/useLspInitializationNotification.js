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
import { Dqe } from "../../coordinator/coordinatorMode.js";
import { logForDebugging } from "../../utils/debug.js";
import { printableName } from "../../utils/printableName.js";
import { logSetupIssues } from "../../utils/notifications/setupIssues.js";
import { wt } from "../../remote/remoteMode.js";
import { getIsScrollDraining } from "../../bootstrap/state.js";
import { getInitializationStatus, getLspServerManager } from "../../services/lsp/manager.js";
import { startClockInterval } from "../../ink/components/Input.js";

/**
 * 启动通知"lsp-initialization"：每 5 秒检查 LSP 管理器与各服务器状态，把初始化失败和服务器错误写进插件错误列表（去重）并更新 setupIssues.lspFailedCount；全部就绪后停止轮询。
 */
//@ chunk-18hwfzwa.js:1764183-1765355 fingerprint = useLspInitializationNotification (0.551)
var LSP_POLL_INTERVAL_MS = 5000,
  lspInitializationNoticeSpec = {
    id: "lsp-initialization",
    deps: (h) => [h.store, h.clock],
    setup() {
      let h = new Set();
      return ({ store: store, clock: clock }) => {
        if (!Dqe()) return;
        function L(Be, He) {
          let We = `${Be}:${He}`;
          if (h.has(We)) return;
          (h.add(We),
            logForDebugging(`LSP error: ${Be} - ${He}`),
            store.setState((ze) => {
              let Xe = new Set(
                  ze.plugins.errors.map((error) => {
                    if (error.type === "generic-error") return `generic-error:${error.source}:${error.error}`;
                    return `${error.type}:${error.source}`;
                  }),
                ),
                rt = `generic-error:${Be}:${He}`;
              if (Xe.has(rt)) return ze;
              return {
                ...ze,
                plugins: {
                  ...ze.plugins,
                  errors: [
                    ...ze.plugins.errors,
                    { type: "generic-error", source: Be, error: printableName(He, 500) },
                  ],
                },
              };
            }));
        }
        function ee(Be) {
          store.setState((He) => {
            if (He.setupIssues.lspFailedCount === Be) return He;
            return (
              logSetupIssues("LSP", Be),
              { ...He, setupIssues: { ...He.setupIssues, lspFailedCount: Be } }
            );
          });
        }
        function ke() {
          if (wt()) return !0;
          if (getIsScrollDraining()) return !0;
          let Be = getInitializationStatus();
          if (Be.status === "failed") return (L("lsp-manager", Be.error.message), ee(1), !1);
          if (Be.status === "pending" || Be.status === "not-started") return !0;
          let He = getLspServerManager();
          if (He) {
            let allServers = He.getAllServers(),
              ze = 0;
            for (let [Xe, rt] of allServers)
              if (rt.state === "error" && rt.lastError) (ze++, L(Xe, rt.lastError.message));
            ee(ze);
          }
          return !0;
        }
        if (!wt() && !ke()) return;
        let Re = startClockInterval(
          clock,
          () => {
            if (!ke()) Re();
          },
          LSP_POLL_INTERVAL_MS,
        );
        return Re;
      };
    },
  };
//@ chunk-7nse75qx.js:634-743 fingerprint = _temp2 (1)
function pluginErrorKey(e) {
  return e.type === "generic-error" ? `generic-error:${e.source}:${e.error}` : `${e.type}:${e.source}`;
}

export { lspInitializationNoticeSpec, pluginErrorKey };
