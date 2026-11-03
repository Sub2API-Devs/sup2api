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
import { getCliOwnedState } from "./cliOwnedClients.js";

//@ chunk-stemk4wd.js:263-389 placement
/**
 * MCP 连接相关的进程级信号：认证丢失、重新认证后重连、缓存收编、缓存拨号失败。
 */
var AUTH_LOST_SIGNAL = createLazySignal(() => getCliOwnedState().authLost);
var REAUTH_RECONNECT_SIGNAL = createLazySignal(() => getCliOwnedState().reauthReconnect);
var CACHED_ADOPT_SIGNAL = createLazySignal(() => getCliOwnedState().cachedAdopt);
var CACHED_DIAL_FAILED_SIGNAL = createLazySignal(() => getCliOwnedState().cachedDialFailed);
export { CACHED_ADOPT_SIGNAL, CACHED_DIAL_FAILED_SIGNAL, REAUTH_RECONNECT_SIGNAL, AUTH_LOST_SIGNAL };
