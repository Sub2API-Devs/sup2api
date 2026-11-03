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

//@ chunk-82kqcve8.js:21690-21703 placement
var FIRST_STORE_PULL_WAIT_DEADLINE_MS = 2500;
//@ chunk-82kqcve8.js:21703-21774 placement
function Mo() {
  return Boolean(process.env.CLAUDE_MEMORY_STORES?.trim());
}
/**
 * 首次记忆库拉取的等待门：settle 唤醒等待者；wait 在拉取进行中时等待，最多到截止时间或中止。
 */
//@ chunk-82kqcve8.js:21774-22265 placement
class FirstStorePullGate {
  settled = !1;
  racePromise = null;
  raceSettled = !1;
  waiters = [];
  pulledMounts = new Set();
  settle() {
    this.settled = !0;
    for (let waiter of this.waiters) waiter();
    this.waiters = [];
  }
  isPending() {
    if (this.settled || this.raceSettled) return !1;
    return Mo();
  }
  async wait(e) {
    if (this.settled || this.raceSettled) return;
    if (!Mo()) return;
    if (!this.racePromise)
      ((this.racePromise = Promise.race([
        new Promise((n) => this.waiters.push(n)),
        sleep(FIRST_STORE_PULL_WAIT_DEADLINE_MS),
      ])),
        this.racePromise.then(() => {
          this.raceSettled = !0;
        }));
    await Promise.race([this.racePromise, sleep(FIRST_STORE_PULL_WAIT_DEADLINE_MS, e)]);
  }
}
//@ chunk-82kqcve8.js:22265-22290 placement
var fu = new HostScoped(() => new FirstStorePullGate());
//@ chunk-82kqcve8.js:22290-22327 placement
function Bn() {
  return fu.of(getRootSession().host);
}
//@ chunk-82kqcve8.js:22327-22356 placement
function settleFirstStorePull() {
  Bn().settle();
}
//@ chunk-82kqcve8.js:22356-22468 placement
function noteStorePulls(e) {
  let { pulledMounts: pulledMounts } = Bn();
  for (let r of e)
    if (r.pulled) pulledMounts.add(r.mountDir);
    else pulledMounts.delete(r.mountDir);
}
//@ chunk-82kqcve8.js:22468-22509 placement
function isFirstStorePullPending() {
  return !Bn().settled && Mo();
}
//@ chunk-82kqcve8.js:22509-22545 placement
function waitForFirstStorePull(e) {
  return Bn().wait(e);
}
//@ chunk-82kqcve8.js:22545-22584 placement
function firstStorePullPending() {
  return Bn().isPending();
}

export {
  FIRST_STORE_PULL_WAIT_DEADLINE_MS,
  waitForFirstStorePull,
  firstStorePullPending,
  isFirstStorePullPending,
  noteStorePulls,
  settleFirstStorePull,
};
