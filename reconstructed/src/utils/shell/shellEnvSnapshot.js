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
import { stringSchema } from "../../../vendor/zod/v4/classic/schemas.js";
import { subprocessEnv } from "../subprocessEnv.js";
import { HostScoped } from "../hostScoped.js";
import { getRootSession } from "../../bootstrap/state.js";
import { deferInit } from "../../../runtime/deferred-init.js";

//@ chunk-e6aww6q8.js:1015407-1015747 placement
/**
 * Claude Code 启动 shell 时总会设置的环境变量名（SHELL、GIT_EDITOR、CLAUDECODE、会话 id、TMPDIR、BUN_OPTIONS 等）。
 */
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
//@ chunk-e6aww6q8.js:1015747-1016473 placement
/**
 * shell 环境快照状态：快照是否可用/已落定、最近检查的会话环境变量键、探测到的启动环境键、shell 导出的变量，以及据此计算 spawn 时会出现的环境键集合。
 */
class ShellEnvSnapshotState {
  #e = false;
  #t = false;
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
    if (!this.#e || this.#o === null || sessionKeys === undefined) return null;
    let keys = new Set(Object.keys(subprocessEnv(this.#r)));
    for (let key of ALWAYS_SPAWN_ENV_KEYS) keys.add(key);
    for (let sessionKey of sessionKeys) keys.add(sessionKey);
    for (let key of this.#o) keys.add(key);
    return keys;
  }
  markSnapshotAvailable(snapshot) {
    this.#e = snapshot;
    this.#t = true;
  }
  replaceLastCheckedSessionEnvVarKeys(keys) {
    this.#n = new Set(keys);
  }
  replaceProbedEnvKeys(keys) {
    this.#o = keys === null ? null : new Set(keys);
  }
  reportShellExports(shellExports) {
    this.#r ??= Object.fromEntries(shellExports);
  }
  reset() {
    this.#e = false;
    this.#t = false;
    this.#n = new Set();
    this.#o = null;
    this.#r = undefined;
  }
}
//@ chunk-e6aww6q8.js:1016473-1016500 placement
var shellEnvSnapshotByHost; // deferred: uses ShellEnvSnapshotState of its import cycle while loading; runs once the cycle is complete
deferInit("chunk-e6aww6q8.js:1016473", () => {
  shellEnvSnapshotByHost = new HostScoped(() => new ShellEnvSnapshotState());
});
//@ chunk-e6aww6q8.js:1016500-1016538 placement
function shellEnvSnapshot() {
  return shellEnvSnapshotByHost.of(getRootSession().host);
}
//@ chunk-e6aww6q8.js:1016538-1016584 placement
function markSnapshotAvailable(snapshot) {
  shellEnvSnapshot().markSnapshotAvailable(snapshot);
}
//@ chunk-e6aww6q8.js:1016584-1016644 placement
function setLastCheckedSessionEnvVarKeys(keys) {
  shellEnvSnapshot().replaceLastCheckedSessionEnvVarKeys(keys);
}
//@ chunk-e6aww6q8.js:1016644-1016700 placement
function getLastCheckedSessionEnvVarKeys() {
  return shellEnvSnapshot().lastCheckedSessionEnvVarKeys;
}
//@ chunk-e6aww6q8.js:1016700-1016745 placement
function setProbedEnvKeys(keys) {
  shellEnvSnapshot().replaceProbedEnvKeys(keys);
}
//@ chunk-e6aww6q8.js:1016745-1016788 placement
function reportShellExports(shellExports) {
  shellEnvSnapshot().reportShellExports(shellExports);
}
//@ chunk-e6aww6q8.js:1016788-1016850 placement
function wasShellExportReported(name) {
  return Object.hasOwn(shellEnvSnapshot().shellExports ?? {}, name);
}
//@ chunk-e6aww6q8.js:1016850-1016906 placement
function sessionEnvVarNameSet(options) {
  return new Set(options.sessionEnvVars?.keys());
}
//@ chunk-e6aww6q8.js:1016906-1016950 placement
function spawnEnvKeysForSession(options) {
  return shellEnvSnapshot().spawnEnvKeys(options);
}
export {
  shellEnvSnapshot,
  spawnEnvKeysForSession,
  sessionEnvVarNameSet,
  wasShellExportReported,
  setLastCheckedSessionEnvVarKeys,
  getLastCheckedSessionEnvVarKeys,
  setProbedEnvKeys,
  markSnapshotAvailable,
  reportShellExports,
};
