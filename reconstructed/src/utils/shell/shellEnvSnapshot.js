/**
 * utils/shell/shellEnvSnapshot.ts
 *
 * 2.1.316 新增：shell 环境快照
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-e6aww6q8.js (12)
 * attribution: placement 12
 */
import { logForDebugging } from "../debug.js";
import { o } from "../../../vendor/zod/v4/classic/schemas.js";
import { subprocessEnv } from "../subprocessEnv.js";
import { HostScoped } from "../hostScoped.js";
import { getRootSession } from "../../bootstrap/state.js";

/**
 * Claude Code 启动 shell 时总会设置的环境变量名（SHELL、GIT_EDITOR、CLAUDECODE、会话 id、TMPDIR、BUN_OPTIONS 等）。
 */
//@ chunk-e6aww6q8.js:1015407-1015747 placement
var ALWAYS_SPAWN_ENV_KEYS = [
  "SHELL",
  "GIT_EDITOR",
  "CLAUDECODE",
  "AI_AGENT",
  "CLAUDE_CODE_SESSION_ID",
  "CLAUDE_CODE_CHILD_SESSION",
  "CLAUDE_CODE_SESSION_ATTENDED",
  "CLAUDE_PID",
  "TRACEPARENT",
  "CLAUDE_CODE_EXECPATH",
  "TMUX",
  "TMPDIR",
  "CLAUDE_CODE_TMPDIR",
  "TMPPREFIX",
  "BUN_OPTIONS",
  "TEMP",
  "TMP",
  "GIT_CONFIG_PARAMETERS",
  "CLAUDE_EFFORT",
  "CLAUDE_CODE_INVOKED_SKILLS",
  ...[],
];
/**
 * shell 环境快照状态：快照是否可用/已落定、最近检查的会话环境变量键、探测到的启动环境键、shell 导出的变量，以及据此计算 spawn 时会出现的环境键集合。
 */
//@ chunk-e6aww6q8.js:1015747-1016473 placement
class ShellEnvSnapshotState {
  #e = !1;
  #t = !1;
  #n = new Set();
  #o = null;
  #r;
  get snapshotAvailable() {
    return this.#e;
  }
  get snapshotSettled() {
    return this.#t;
  }
  get lastCheckedSessionEnvVarKeys() {
    return this.#n;
  }
  get probedEnvKeys() {
    return this.#o;
  }
  get shellExports() {
    return this.#r;
  }
  spawnEnvKeys(sessionKeys) {
    if (!this.#e || this.#o === null || sessionKeys === void 0) return null;
    let keys = new Set(Object.keys(subprocessEnv(this.#r)));
    for (let r of ALWAYS_SPAWN_ENV_KEYS) keys.add(r);
    for (let r of sessionKeys) keys.add(r);
    for (let r of this.#o) keys.add(r);
    return keys;
  }
  markSnapshotAvailable(e) {
    ((this.#e = e), (this.#t = !0));
  }
  replaceLastCheckedSessionEnvVarKeys(e) {
    this.#n = new Set(e);
  }
  replaceProbedEnvKeys(e) {
    this.#o = e === null ? null : new Set(e);
  }
  reportShellExports(e) {
    this.#r ??= Object.fromEntries(e);
  }
  reset() {
    ((this.#e = !1), (this.#t = !1), (this.#n = new Set()), (this.#o = null), (this.#r = void 0));
  }
}
//@ chunk-e6aww6q8.js:1016473-1016500 placement
var YPo = new HostScoped(() => new ShellEnvSnapshotState());
//@ chunk-e6aww6q8.js:1016500-1016538 placement
function bR() {
  return YPo.of(getRootSession().host);
}
//@ chunk-e6aww6q8.js:1016538-1016584 placement
function Ghe(e) {
  bR().markSnapshotAvailable(e);
}
//@ chunk-e6aww6q8.js:1016584-1016644 placement
function mqt(e) {
  bR().replaceLastCheckedSessionEnvVarKeys(e);
}
//@ chunk-e6aww6q8.js:1016644-1016700 placement
function yqt() {
  return bR().lastCheckedSessionEnvVarKeys;
}
//@ chunk-e6aww6q8.js:1016700-1016745 placement
function zhe(e) {
  bR().replaceProbedEnvKeys(e);
}
//@ chunk-e6aww6q8.js:1016745-1016788 placement
function _qt(e) {
  bR().reportShellExports(e);
}
//@ chunk-e6aww6q8.js:1016788-1016850 placement
function Sqt(e) {
  return Object.hasOwn(bR().shellExports ?? {}, e);
}
//@ chunk-e6aww6q8.js:1016850-1016906 placement
function RA(e) {
  return new Set(e.sessionEnvVars?.keys());
}
//@ chunk-e6aww6q8.js:1016906-1016950 placement
function qhe(e) {
  return bR().spawnEnvKeys(e);
}

export { bR, qhe, RA, Sqt, mqt, yqt, Ghe, _qt, zhe };
