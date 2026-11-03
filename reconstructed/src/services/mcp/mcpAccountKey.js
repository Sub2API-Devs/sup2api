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
import { ht } from "./cliOwnedClients.js";

//@ chunk-e6aww6q8.js:2303366-2303421 placement
async function smn(e, n) {
  return filterCommandsByAllowlist(await getSkillToolCommands(e, n), getSessionSkillAllowlist());
}
//@ chunk-e6aww6q8.js:2303421-2303434 placement
var I4s = 3000;
//@ chunk-e6aww6q8.js:2303434-2303470 placement
function fd() {
  return discoveryCacheOffReason() === void 0;
}
//@ chunk-e6aww6q8.js:2303470-2303537 placement
function IM() {
  let e = discoveryCacheOffReason();
  return e === void 0 || e === "key-unavailable";
}
//@ chunk-e6aww6q8.js:2303537-2303571 placement
function O4s(e) {
  getDiscoveryCacheStore().killSwitch = e;
}
//@ chunk-e6aww6q8.js:2303571-2303618 placement
function M4s() {
  return getDiscoveryCacheStore().killSwitch !== void 0;
}
/**
 * 返回发现缓存关闭的原因（无盘、环境变量禁用、熔断等），确定的原因会被锁存。
 */
//@ chunk-e6aww6q8.js:2303618-2303816 placement
function discoveryCacheOffReason() {
  let e = getDiscoveryCacheStore();
  if (isDiskless()) e.offLatched = "diskless";
  if (e.offLatched !== void 0) return e.offLatched;
  let n = computeDiscoveryCacheOffReason(e);
  if (n !== void 0 && (n === "env-disabled" || e.killSwitch !== void 0)) e.offLatched = n;
  return n;
}
//@ chunk-e6aww6q8.js:2303816-2303860 placement
function D4s() {
  return (discoveryCacheOffReason(), getDiscoveryCacheStore().offLatched);
}
//@ chunk-e6aww6q8.js:2303860-2303911 placement
function OFo() {
  getDiscoveryCacheStore().offLatched ??= "key-unavailable";
}
//@ chunk-e6aww6q8.js:2303911-2304096 placement
function computeDiscoveryCacheOffReason(e) {
  if (env.MCP_DISCOVERY_CACHE === !1) return "env-disabled";
  let n = e.killSwitch?.();
  if (n === !1) return "kill-switch";
  if (env.MCP_DISCOVERY_CACHE !== !0 && n !== !0) return "not-enabled";
  return;
}
//@ chunk-e6aww6q8.js:2304096-2304163 placement
var ACCT_UNWIRED = "acct:unwired",
  ACCT_LOGGED_OUT = "acct:logged-out",
  ACCT_INCOMPLETE = "acct:incomplete";
/**
 * 解析当前 MCP 账号身份：未接入解析器、未登录、不完整，或账号与组织组成的身份令牌。
 */
//@ chunk-e6aww6q8.js:2304163-2304486 placement
function resolveMcpAccountIdentity() {
  let accountResolver = getDiscoveryCacheStore().accountResolver;
  if (!accountResolver) return { kind: "unwired", token: ACCT_UNWIRED };
  let n = accountResolver();
  if (!n) return { kind: "logged-out", token: ACCT_LOGGED_OUT };
  let r = n.accountUuid ?? "",
    s = n.organizationUuid ?? "";
  if (!r || !n.credentialInstalled) return { kind: "incomplete", token: ACCT_INCOMPLETE };
  return { kind: "resolved", token: `acct:${r}|org:${s}`, accountUuid: r, orgUuid: s };
}
/**
 * 目标是否未解析（kind!=="resolved"）。
 */
//@ chunk-e6aww6q8.js:2304486-2304529 placement = getResolvedDir (1)
function isUnresolved(target) {
  return target.kind !== "resolved";
}
//@ chunk-e6aww6q8.js:2304529-2304557 placement
var f1r = ["legacy", "modern"];
/**
 * 发现缓存的进程级状态：账号解析器、开关、缓存路径记忆、按路径串行化的写队列、删除代际、协议代解析器等；drain 在限定时间内等待写入完成。
 */
//@ chunk-e6aww6q8.js:2304557-2305434 placement
class DiscoveryCacheStore {
  accountResolver;
  lastResolvedAccountToken = void 0;
  killSwitch;
  offLatched = void 0;
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
  constructor(e) {
    ((this.storage = e?.storage ?? new LocalFileStore()),
      (this.storageV5 = e?.storageV5),
      (this.accountResolver = e?.accountResolver),
      (this.killSwitch = e?.killSwitch));
  }
  serializeWrite(e, n) {
    let r = this.#e;
    if (r === null) return this.pathWrites.run(e, n);
    return this.pathWrites.run(e, () => r.then(n));
  }
  async drain(e) {
    if (this.pathWrites.size === 0) return;
    await Promise.race([this.pathWrites.settle(), sleep(e, void 0, { unref: !0 })]);
  }
  async dispose(e) {
    try {
      await this.drain(e);
    } finally {
      (this.flushCleanup?.(), (this.flushCleanup = void 0));
    }
  }
  succeed(e) {
    if (e.pathWrites.size === 0) return;
    let n = e.pathWrites.settle().then(() => {
      if (this.#e === n) this.#e = null;
    });
    this.#e = n;
  }
}
/**
 * 获取（必要时创建）发现缓存的进程级状态对象。
 */
//@ chunk-e6aww6q8.js:2305434-2305550 placement
function getDiscoveryCacheStore() {
  let e = ht();
  if (e.discoveryCacheStore === null) e.discoveryCacheStore = new DiscoveryCacheStore();
  return e.discoveryCacheStore;
}

export {
  fd,
  getDiscoveryCacheStore,
  resolveMcpAccountIdentity,
  f1r,
  discoveryCacheOffReason,
  OFo,
  IM,
  I4s,
  D4s,
  isUnresolved,
  M4s,
  O4s,
  smn,
};
