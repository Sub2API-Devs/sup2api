/**
 * services/orgMemory/storePulls.ts
 *
 * 记忆库拉取（2.1.316 新增）
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * new in 2.1.318 (2.1.88 has no file at this path)
 * pieces: chunk-a2q0x549.js (10)
 * attribution: placement 10
 * (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.
 */
import { sleep } from "../../utils/sleep.js";
import { HostScoped } from "../../utils/hostScoped.js";
import { getRootSession } from "../../bootstrap/state.js";
import { deferInit } from "../../../runtime/deferred-init.js";

//@ chunk-a2q0x549.js:21765-21778 placement
var FIRST_STORE_PULL_WAIT_DEADLINE_MS = 2500;
//@ chunk-a2q0x549.js:21778-21849 placement
/**
 * 是否配置了 CLAUDE_MEMORY_STORES。
 */
function hasMemoryStoresEnv() {
  return Boolean(process.env.CLAUDE_MEMORY_STORES?.trim());
}
//@ chunk-a2q0x549.js:21849-22340 placement
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
//@ chunk-a2q0x549.js:22340-22365 placement
/**
 * 按宿主保存的首轮拉取闸门。
 */
var firstStorePullGate; // deferred: uses FirstStorePullGate of its import cycle while loading; runs once the cycle is complete
deferInit("chunk-a2q0x549.js:22340", () => {
  firstStorePullGate = new HostScoped(() => new FirstStorePullGate());
});
//@ chunk-a2q0x549.js:22365-22402 placement
/**
 * 取当前宿主的首轮拉取闸门。
 */
function getFirstStorePullGate() {
  return firstStorePullGate.of(getRootSession().host);
}
//@ chunk-a2q0x549.js:22402-22431 placement
function settleFirstStorePull() {
  getFirstStorePullGate().settle();
}
//@ chunk-a2q0x549.js:22431-22543 placement
function noteStorePulls(stores) {
  let { pulledMounts } = getFirstStorePullGate();
  for (let store of stores)
    if (store.pulled) pulledMounts.add(store.mountDir);
    else pulledMounts.delete(store.mountDir);
}
//@ chunk-a2q0x549.js:22543-22584 placement
function isFirstStorePullPending() {
  return !getFirstStorePullGate().settled && hasMemoryStoresEnv();
}
//@ chunk-a2q0x549.js:22584-22620 placement
function waitForFirstStorePull(signal) {
  return getFirstStorePullGate().wait(signal);
}
//@ chunk-a2q0x549.js:22620-22659 placement
function firstStorePullPending() {
  return getFirstStorePullGate().isPending();
}
export {
  waitForFirstStorePull,
  firstStorePullPending,
  FIRST_STORE_PULL_WAIT_DEADLINE_MS,
  isFirstStorePullPending,
  noteStorePulls,
  settleFirstStorePull,
};
