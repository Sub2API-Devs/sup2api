/**
 * hooks/useDirectConnect.ts
 *
 * direct connect（连接到远程 Claude Code 服务器）会话：连接、断开提示。
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/hooks/useDirectConnect.ts
 * pieces: chunk-czq1j3j2.js (1)
 * attribution: callgraph-fingerprint 1
 * (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.
 */
import { useMemo } from "../../vendor/react/cjs/react.production.js";
import { DirectConnectSessionManager } from "../server/directConnectManager.js";
import { gracefulShutdown } from "../utils/gracefulShutdown.js";
import { useRemoteTransportCore } from "../remote/useRemoteTransportCore.js";

//@ chunk-czq1j3j2.js:267882-268265 callgraph-fingerprint (2.1.88 match: useDirectConnect, 0.173)
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
