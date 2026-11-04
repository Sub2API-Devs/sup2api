/**
 * bridge/relayToken.ts
 *
 * --session-tunnel 中继令牌参数（2.1.316 新增）
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-hqm2hdtg.js (1)
 * attribution: placement 1
 */
import { isHttpMcpServeInvocation } from "../entrypoints/mcpServeArgs.js";
import { disableCoreDumps } from "../utils/processHardening.js";

//@ chunk-hqm2hdtg.js:291-428 placement
function disableCoreDumpsForSessionTunnel() {
  if (
    (process.env.CCR_AGENT_PROXY_TOKEN_FILE_DESCRIPTOR !== undefined ||
      process.argv.includes("--session-tunnel")) &&
    isHttpMcpServeInvocation()
  )
    disableCoreDumps(() => {});
}
export { disableCoreDumpsForSessionTunnel };
