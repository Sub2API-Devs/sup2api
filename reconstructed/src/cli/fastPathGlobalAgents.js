/**
 * cli/fastPathGlobalAgents.ts
 *
 * 2.1.316 新增：CLI 快速路径中处理全局 agents 子命令的入口片段。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-hr00hxnh.js (1)
 * attribution: placement 1
 */
import {
  getProxyUrlWithSource,
  parseProxyUrl,
  describeInvalidProxyUrl,
  configureGlobalAgents,
} from "../utils/proxy.js";
import { exitWithError } from "../utils/process.js";

//@ chunk-hr00hxnh.js:1422-1497 placement
function i() {
  let r = getProxyUrlWithSource();
  if (r && !parseProxyUrl(r.value)) exitWithError(describeInvalidProxyUrl(r.source, r.value));
  configureGlobalAgents();
}
