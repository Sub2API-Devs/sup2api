/**
 * services/mcp/mcpAccountKey.ts
 *
 * 2.1.316 新增：MCP 账号键（区分不同登录账号的连接）
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-e6aww6q8.js (16)
 * attribution: placement 16
 */
import { filterCommandsByAllowlist, getSkillToolCommands } from "../../commands.js";
import { getSessionSkillAllowlist, isDiskless } from "../../bootstrap/state.js";
import { env } from "../../utils/env.js";
import { createKeyedQueue } from "../../utils/promiseQueue.js";
import { LocalFileStore } from "../../utils/fileStore.js";
import { sleep } from "../../utils/sleep.js";
import { getCliOwnedState } from "./cliOwnedClients.js";

//@ chunk-e6aww6q8.js:2303366-2303421 placement
/**
 * 取当前会话可用且被允许的技能命令。
 */
async function getSessionSkillCommands(cwd, storageV5) {
  return filterCommandsByAllowlist(await getSkillToolCommands(cwd, storageV5), getSessionSkillAllowlist());
}
//@ chunk-e6aww6q8.js:2303421-2303434 placement
/**
 * 解析账号身份的超时（3000 毫秒）。
 */
var ACCOUNT_RESOLVE_TIMEOUT_MS = 3000;
//@ chunk-e6aww6q8.js:2303434-2303470 placement
/**
 * 发现缓存是否开启。
 */
function isDiscoveryCacheOn() {
  return discoveryCacheOffReason() === undefined;
}
//@ chunk-e6aww6q8.js:2303470-2303537 placement
/**
 * 发现缓存是否可用（关闭原因为空或仅键不可用）。
 */
function isDiscoveryCacheUsable() {
  let offReason = discoveryCacheOffReason();
  return offReason === undefined || offReason === "key-unavailable";
}
//@ chunk-e6aww6q8.js:2303537-2303571 placement
/**
 * 设置发现缓存的熔断（kill switch）。
 */
function setCacheKillSwitch(killSwitch) {
  getDiscoveryCacheStore().killSwitch = killSwitch;
}
//@ chunk-e6aww6q8.js:2303571-2303618 placement
/**
 * 是否已设置熔断。
 */
function hasCacheKillSwitch() {
  return getDiscoveryCacheStore().killSwitch !== undefined;
}
//@ chunk-e6aww6q8.js:2303618-2303816 placement
/**
 * 返回发现缓存关闭的原因（无盘、环境变量禁用、熔断等），确定的原因会被锁存。
 */
function discoveryCacheOffReason() {
  let discoveryCacheStore = getDiscoveryCacheStore();
  if (isDiskless()) discoveryCacheStore.offLatched = "diskless";
  if (discoveryCacheStore.offLatched !== undefined) return discoveryCacheStore.offLatched;
  let discoveryCacheOffReason = computeDiscoveryCacheOffReason(discoveryCacheStore);
  if (
    discoveryCacheOffReason !== undefined &&
    (discoveryCacheOffReason === "env-disabled" || discoveryCacheStore.killSwitch !== undefined)
  )
    discoveryCacheStore.offLatched = discoveryCacheOffReason;
  return discoveryCacheOffReason;
}
//@ chunk-e6aww6q8.js:2303816-2303860 placement
/**
 * 取发现缓存关闭的锁存原因。
 */
function getCacheOffLatched() {
  discoveryCacheOffReason();
  return getDiscoveryCacheStore().offLatched;
}
//@ chunk-e6aww6q8.js:2303860-2303911 placement
/**
 * 把关闭原因锁存为 key-unavailable。
 */
function latchCacheOff() {
  getDiscoveryCacheStore().offLatched ??= "key-unavailable";
}
//@ chunk-e6aww6q8.js:2303911-2304096 placement
function computeDiscoveryCacheOffReason(discoveryCacheStore) {
  if (env.MCP_DISCOVERY_CACHE === false) return "env-disabled";
  let killSwitchState = discoveryCacheStore.killSwitch?.();
  if (killSwitchState === false) return "kill-switch";
  if (env.MCP_DISCOVERY_CACHE !== true && killSwitchState !== true) return "not-enabled";
  return;
}
//@ chunk-e6aww6q8.js:2304096-2304163 placement
var ACCT_UNWIRED = "acct:unwired";
var ACCT_LOGGED_OUT = "acct:logged-out";
var ACCT_INCOMPLETE = "acct:incomplete";
//@ chunk-e6aww6q8.js:2304163-2304486 placement
/**
 * 解析当前 MCP 账号身份：未接入解析器、未登录、不完整，或账号与组织组成的身份令牌。
 */
function resolveMcpAccountIdentity() {
  let accountResolver = getDiscoveryCacheStore().accountResolver;
  if (!accountResolver)
    return {
      kind: "unwired",
      token: ACCT_UNWIRED,
    };
  let account = accountResolver();
  if (!account)
    return {
      kind: "logged-out",
      token: ACCT_LOGGED_OUT,
    };
  let accountUuid = account.accountUuid ?? "";
  let organizationUuid = account.organizationUuid ?? "";
  if (!accountUuid || !account.credentialInstalled)
    return {
      kind: "incomplete",
      token: ACCT_INCOMPLETE,
    };
  return {
    kind: "resolved",
    token: `acct:${accountUuid}|org:${organizationUuid}`,
    accountUuid,
    orgUuid: organizationUuid,
  };
}
//@ chunk-e6aww6q8.js:2304486-2304529 placement = getResolvedDir (1)
/**
 * 目标是否未解析（kind!=="resolved"）。
 */
function isUnresolved(target) {
  return target.kind !== "resolved";
}
//@ chunk-e6aww6q8.js:2304529-2304557 placement
/**
 * 协议时代枚举（legacy、modern）。
 */
var PROTOCOL_ERAS = ["legacy", "modern"];
//@ chunk-e6aww6q8.js:2304557-2305434 placement
/**
 * 发现缓存的进程级状态：账号解析器、开关、缓存路径记忆、按路径串行化的写队列、删除代际、协议代解析器等；drain 在限定时间内等待写入完成。
 */
class DiscoveryCacheStore {
  accountResolver;
  lastResolvedAccountToken = undefined;
  killSwitch;
  offLatched = undefined;
  storage;
  storageV5;
  filePathMemo = new Map();
  pathWrites = createKeyedQueue();
  #e = null;
  flushCleanup;
  admissionPurgedKeySets = new Set();
  eraResolver = () => "legacy";
  deleteGenerationByCacheKey = new Map();
  readGateForTest;
  constructor(options) {
    this.storage = options?.storage ?? new LocalFileStore();
    this.storageV5 = options?.storageV5;
    this.accountResolver = options?.accountResolver;
    this.killSwitch = options?.killSwitch;
  }
  serializeWrite(path, operation) {
    let pendingFlush = this.#e;
    if (pendingFlush === null) return this.pathWrites.run(path, operation);
    return this.pathWrites.run(path, () => pendingFlush.then(operation));
  }
  async drain(timeoutMs) {
    if (this.pathWrites.size === 0) return;
    await Promise.race([
      this.pathWrites.settle(),
      sleep(timeoutMs, undefined, {
        unref: true,
      }),
    ]);
  }
  async dispose(timeoutMs) {
    try {
      await this.drain(timeoutMs);
    } finally {
      this.flushCleanup?.();
      this.flushCleanup = undefined;
    }
  }
  succeed(state) {
    if (state.pathWrites.size === 0) return;
    let flushPromise = state.pathWrites.settle().then(() => {
      if (this.#e === flushPromise) this.#e = null;
    });
    this.#e = flushPromise;
  }
}
//@ chunk-e6aww6q8.js:2305434-2305550 placement
/**
 * 获取（必要时创建）发现缓存的进程级状态对象。
 */
function getDiscoveryCacheStore() {
  let cliOwnedState = getCliOwnedState();
  if (cliOwnedState.discoveryCacheStore === null)
    cliOwnedState.discoveryCacheStore = new DiscoveryCacheStore();
  return cliOwnedState.discoveryCacheStore;
}
export {
  isDiscoveryCacheOn,
  getDiscoveryCacheStore,
  resolveMcpAccountIdentity,
  PROTOCOL_ERAS,
  discoveryCacheOffReason,
  latchCacheOff,
  isDiscoveryCacheUsable,
  ACCOUNT_RESOLVE_TIMEOUT_MS,
  getCacheOffLatched,
  isUnresolved,
  hasCacheKillSwitch,
  setCacheKillSwitch,
  getSessionSkillCommands,
};
