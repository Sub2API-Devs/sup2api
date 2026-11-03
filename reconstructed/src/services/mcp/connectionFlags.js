/**
 * services/mcp/connectionFlags.ts
 *
 * 2.1.316 新增：MCP 连接相关功能开关（认证丢失、重连、缓存复用）
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-stemk4wd.js (1)
 * attribution: placement 1
 */
import { createLazySignal } from "../../utils/signal.js";
import { ht } from "./cliOwnedClients.js";

/**
 * MCP 连接相关的进程级信号：认证丢失、重新认证后重连、缓存收编、缓存拨号失败。
 */
//@ chunk-stemk4wd.js:263-389 placement
var AUTH_LOST_SIGNAL = createLazySignal(() => ht().authLost),
  REAUTH_RECONNECT_SIGNAL = createLazySignal(() => ht().reauthReconnect),
  CACHED_ADOPT_SIGNAL = createLazySignal(() => ht().cachedAdopt),
  CACHED_DIAL_FAILED_SIGNAL = createLazySignal(() => ht().cachedDialFailed);

export { CACHED_ADOPT_SIGNAL, CACHED_DIAL_FAILED_SIGNAL, REAUTH_RECONNECT_SIGNAL, AUTH_LOST_SIGNAL };
