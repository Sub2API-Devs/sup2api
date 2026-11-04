/**
 * hooks/useSSHSession.ts
 *
 * SSH 远程会话：连接、退出码/信号与 stderr 提示。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/hooks/useSSHSession.ts
 * pieces: chunk-18hwfzwa.js (1)
 * attribution: fingerprint 1
 */
import { useMemo } from "../../vendor/react/cjs/react.production.js";
import { gracefulShutdown } from "../utils/gracefulShutdown.js";
import { useRemoteTransportCore } from "../remote/useRemoteTransportCore.js";

//@ chunk-18hwfzwa.js:309217-309809 fingerprint (2.1.88 match: useSSHSession, 0.434)
function useSSHSession({ session, sink, requestDialog, toolPermissionContext, tools }) {
  let converted = useMemo(() => {
    if (!session) return;
    return {
      label: "ssh",
      createManager: (prev) => session.createManager(prev),
      onDisconnected: (connected) => {
        let stderr = session.getStderrTail().trim();
        let exitCode = session.proc.exitCode;
        let msg = connected ? "Remote session ended." : "SSH session failed before connecting.";
        if (stderr && (!connected || exitCode !== 0))
          msg += `
Remote stderr (exit ${exitCode ?? "signal " + session.proc.signalCode}):
${stderr}`;
        gracefulShutdown(1, "other", {
          finalMessage: msg,
        });
      },
      cleanup: () => session.proxy?.stop(),
      hostUsesLocalCredentials: session.proxy !== undefined,
    };
  }, [session]);
  return useRemoteTransportCore({
    adapter: converted,
    sink,
    requestDialog,
    toolPermissionContext,
    tools,
  });
}
export { useSSHSession };
