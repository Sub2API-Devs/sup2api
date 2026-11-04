/**
 * services/orgMemory/storePulls.ts
 *
 * 记忆库拉取（2.1.316 新增）
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-82kqcve8.js (10)
 * attribution: placement 10
 */
import { sleep } from "../../utils/sleep.js";
import { HostScoped } from "../../utils/hostScoped.js";
import { getRootSession } from "../../bootstrap/state.js";
import { deferInit } from "../../../runtime/deferred-init.js";

//@ chunk-82kqcve8.js:21690-21703 placement
var FIRST_STORE_PULL_WAIT_DEADLINE_MS = 2500;
//@ chunk-82kqcve8.js:21703-21774 placement
/**
 * 是否配置了 CLAUDE_MEMORY_STORES。
 */
function hasMemoryStoresEnv() {
  return Boolean(process.env.CLAUDE_MEMORY_STORES?.trim());
}
//@ chunk-82kqcve8.js:21774-22265 placement
/**
 * 首次记忆库拉取的等待门：settle 唤醒等待者；wait 在拉取进行中时等待，最多到截止时间或中止。
 */
class FirstStorePullGate {
  settled = false;
  racePromise = null;
  raceSettled = false;
  waiters = [];
  pulledMounts = new Set();
  settle() {
    this.settled = true;
    for (let waiter of this.waiters) waiter();
    this.waiters = [];
  }
  isPending() {
    if (this.settled || this.raceSettled) return false;
    return hasMemoryStoresEnv();
  }
  async wait(signal) {
    if (this.settled || this.raceSettled) return;
    if (!hasMemoryStoresEnv()) return;
    if (!this.racePromise) {
      this.racePromise = Promise.race([
        new Promise((resolve) => this.waiters.push(resolve)),
        sleep(FIRST_STORE_PULL_WAIT_DEADLINE_MS),
      ]);
      this.racePromise.then(() => {
        this.raceSettled = true;
      });
    }
    await Promise.race([this.racePromise, sleep(FIRST_STORE_PULL_WAIT_DEADLINE_MS, signal)]);
  }
}
//@ chunk-82kqcve8.js:22265-22290 placement
/**
 * 按宿主保存的首轮拉取闸门。
 */
var firstStorePullGate; // deferred: uses FirstStorePullGate of its import cycle while loading; runs once the cycle is complete
deferInit("chunk-82kqcve8.js:22265", () => {
  firstStorePullGate = new HostScoped(() => new FirstStorePullGate());
});
//@ chunk-82kqcve8.js:22290-22327 placement
/**
 * 取当前宿主的首轮拉取闸门。
 */
function getFirstStorePullGate() {
  return firstStorePullGate.of(getRootSession().host);
}
//@ chunk-82kqcve8.js:22327-22356 placement
function settleFirstStorePull() {
  getFirstStorePullGate().settle();
}
//@ chunk-82kqcve8.js:22356-22468 placement
function noteStorePulls(stores) {
  let { pulledMounts } = getFirstStorePullGate();
  for (let store of stores)
    if (store.pulled) pulledMounts.add(store.mountDir);
    else pulledMounts.delete(store.mountDir);
}
//@ chunk-82kqcve8.js:22468-22509 placement
function isFirstStorePullPending() {
  return !getFirstStorePullGate().settled && hasMemoryStoresEnv();
}
//@ chunk-82kqcve8.js:22509-22545 placement
function waitForFirstStorePull(signal) {
  return getFirstStorePullGate().wait(signal);
}
//@ chunk-82kqcve8.js:22545-22584 placement
function firstStorePullPending() {
  return getFirstStorePullGate().isPending();
}
export {
  FIRST_STORE_PULL_WAIT_DEADLINE_MS,
  waitForFirstStorePull,
  firstStorePullPending,
  isFirstStorePullPending,
  noteStorePulls,
  settleFirstStorePull,
};
