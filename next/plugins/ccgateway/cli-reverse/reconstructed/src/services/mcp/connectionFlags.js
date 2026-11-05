/**
 * services/mcp/connectionFlags.ts
 *
 * 2.1.316 新增：MCP 连接相关功能开关（认证丢失、重连、缓存复用）
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * new in 2.1.318 (2.1.88 has no file at this path)
 * pieces: chunk-m14ns5pp.js (1)
 * attribution: placement 1
 */
import { createLazySignal } from "../../utils/signal.js";
import { getCliOwnedState } from "./cliOwnedClients.js";
import { deferInit } from "../../../runtime/deferred-init.js";

//@ chunk-m14ns5pp.js:263-389 placement
/**
 * MCP 连接相关的进程级信号：认证丢失、重新认证后重连、缓存收编、缓存拨号失败。
 */
var AUTH_LOST_SIGNAL; // deferred: uses getCliOwnedState (./cliOwnedClients.js) of its import cycle while loading; runs once the cycle is complete
var REAUTH_RECONNECT_SIGNAL;
var CACHED_ADOPT_SIGNAL;
var CACHED_DIAL_FAILED_SIGNAL;
deferInit("chunk-m14ns5pp.js:263", () => {
  AUTH_LOST_SIGNAL = createLazySignal(() => getCliOwnedState().authLost);
  REAUTH_RECONNECT_SIGNAL = createLazySignal(() => getCliOwnedState().reauthReconnect);
  CACHED_ADOPT_SIGNAL = createLazySignal(() => getCliOwnedState().cachedAdopt);
  CACHED_DIAL_FAILED_SIGNAL = createLazySignal(() => getCliOwnedState().cachedDialFailed);
});
export { REAUTH_RECONNECT_SIGNAL, CACHED_ADOPT_SIGNAL, CACHED_DIAL_FAILED_SIGNAL, AUTH_LOST_SIGNAL };
