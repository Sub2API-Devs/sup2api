/**
 * utils/tlsAgentPool.ts
 *
 * TLS 连接池检查：在 TLS 开关值（NODE_TLS_REJECT_UNAUTHORIZED 等）变化时作废并关闭沿用旧值的 keep-alive 连接，附 poolName/_agentKey 记录（2.1.318 新增）
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * new in 2.1.318 (2.1.88 has no file at this path)
 * pieces: chunk-355mdh7x.js (4)
 * attribution: placement 4
 */
import { logForDebugging } from "./debug.js";
import { caEnvFingerprint } from "./anthropicHosts.js";

//@ chunk-355mdh7x.js:93841-93961 placement
/**
 * 连接池名缓存的容量上限与说明 TLS 相关开关的变量名文案。
 */
var MAX_AGENT_KEYS = 256;
var SWITCHES_HINT =
  "NODE_TLS_REJECT_UNAUTHORIZED, BUN_TLS_REFUSE_DISTRUSTED_KEYS or CLAUDE_CODE_DISABLE_HTTPS_AGENT_KEEPING";
//@ chunk-355mdh7x.js:93961-94831 placement
/**
 * TLS agent 的连接池守卫类：给池打上开关快照名，开关变化时关闭沿用旧值且无等待请求的连接；utils/mtls 与 utils/proxy 构造它。
 */
class KeptConnectionGate {
  #e = new WeakMap();
  #t = new Map();
  constructor(socket) {
    socket.prependListener("free", (cause, owner) => {
      let presentSwitches = caEnvFingerprint();
      if (!this.#r(presentSwitches, cause)) return;
      let agentKey = agentKeyOf(owner);
      if (
        agentKey !== undefined &&
        this.#t.get(agentKey) !== presentSwitches &&
        !socket.requests[agentKey]?.length
      )
        closeKept(
          cause,
          `it belongs to a connection pool made under other values of ${SWITCHES_HINT}, and no request is waiting for that pool`,
        );
    });
  }
  dialOptions(options) {
    let agentKey = agentKeyOf(options);
    if (agentKey === undefined || this.#t.get(agentKey) === caEnvFingerprint()) return options;
    let copy = {
      ...options,
    };
    Reflect.deleteProperty(copy, "_agentKey");
    return copy;
  }
  noteOpened(options, socket) {
    this.#e.set(options, socket);
  }
  closeUnlessOpenedUnderPresentSwitches(socket) {
    this.#r(caEnvFingerprint(), socket);
  }
  #r(switches, socket) {
    if (this.#e.get(socket) === switches) return true;
    closeKept(
      socket,
      this.#e.has(socket)
        ? `it was opened under other values of ${SWITCHES_HINT}`
        : "its agent has no record of opening it, so of how its certificate was checked",
    );
    return false;
  }
  poolName(socket, makeKey) {
    let existing = agentKeyOf(socket);
    if (existing !== undefined) return existing;
    let switches = caEnvFingerprint();
    let key = switches === undefined ? makeKey() : `${makeKey()}:${switches}`;
    if (this.#t.size >= MAX_AGENT_KEYS) this.#t.clear();
    this.#t.set(key, switches);
    return key;
  }
}
//@ chunk-355mdh7x.js:94831-94901 placement
/**
 * 打印“因开关变化关闭保留连接”的日志并销毁连接。
 */
function closeKept(socket, why) {
  logForDebugging(`TLS: closed a kept connection: ${why}`);
  socket.destroy();
}
//@ chunk-355mdh7x.js:94901-95020 placement
/**
 * 取连接选项上的 _agentKey 池名。
 */
function agentKeyOf(options) {
  return typeof options === "object" &&
    options !== null &&
    "_agentKey" in options &&
    typeof options._agentKey === "string"
    ? options._agentKey
    : undefined;
}
export { KeptConnectionGate };
