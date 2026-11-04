/**
 * hooks/useDirectConnect.ts
 *
 * direct connect（连接到远程 Claude Code 服务器）会话：连接、断开提示。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/hooks/useDirectConnect.ts
 * pieces: chunk-18hwfzwa.js (1)
 * attribution: callgraph-fingerprint 1
 */
import { useMemo } from "../../vendor/react/cjs/react.production.js";
import { DirectConnectSessionManager } from "../server/directConnectManager.js";
import { gracefulShutdown } from "../utils/gracefulShutdown.js";
import { useRemoteTransportCore } from "../remote/useRemoteTransportCore.js";

//@ chunk-18hwfzwa.js:262843-263226 callgraph-fingerprint = useDirectConnect (0.173)
function useDirectConnect({ config, sink, requestDialog, toolPermissionContext, tools }) {
  let converted = useMemo(() => {
    if (!config) return;
    return {
      label: "directConnect",
      createManager: (prev) => new DirectConnectSessionManager(config, prev),
      onDisconnected: (queue) => {
        process.stderr.write(
          queue
            ? `
Server disconnected.
`
            : `
Failed to connect to server at ${config.wsUrl}
`,
        );
        gracefulShutdown(1);
      },
    };
  }, [config]);
  return useRemoteTransportCore({
    adapter: converted,
    sink,
    requestDialog,
    toolPermissionContext,
    tools,
  });
}
export { useDirectConnect };
