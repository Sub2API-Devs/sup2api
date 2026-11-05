/**
 * cli/fastPathGlobalAgents.ts
 *
 * 2.1.316 新增：CLI 快速路径中处理全局 agents 子命令的入口片段。
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * new in 2.1.318 (2.1.88 has no file at this path)
 * pieces: chunk-s7s9vz1t.js (1)
 * attribution: placement 1
 */
import {
  getProxyUrlWithSource,
  parseProxyUrl,
  describeInvalidProxyUrl,
  configureGlobalAgents,
} from "../utils/proxy.js";
import { exitWithError } from "../utils/process.js";

//@ chunk-s7s9vz1t.js:1534-1609 placement
function configureGlobalAgentsWithProxyCheck() {
  let proxyUrlWithSource = getProxyUrlWithSource();
  if (proxyUrlWithSource && !parseProxyUrl(proxyUrlWithSource.value))
    exitWithError(describeInvalidProxyUrl(proxyUrlWithSource.source, proxyUrlWithSource.value));
  configureGlobalAgents();
}
export { configureGlobalAgentsWithProxyCheck };
