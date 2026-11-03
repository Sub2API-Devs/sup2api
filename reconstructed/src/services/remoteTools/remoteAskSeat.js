/**
 * services/remoteTools/remoteAskSeat.ts
 *
 * 2.1.316 新增：远程工具调用的 ask 座席：记录每次 ask 的状态（asking、answered、lapsed、withdrawn）
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-4nx37fzw.js (3)
 * attribution: placement 3
 */
import { logRemoteTools } from "./remoteToolsDebug.js";
import { stableHashWithSalt } from "../../utils/stableHash.js";
import { SHELL_TOOL_NAMES } from "../../utils/shell/shellToolUtils.js";
import { sleep } from "../../utils/sleep.js";

//@ chunk-4nx37fzw.js:334-344 placement
var MAX_ASK_CARDS_TRACKED = 256;
//@ chunk-4nx37fzw.js:344-3731 placement
/**
 * 一次远程 ask 的状态机（发起、继承的请求撤回、超时、回答）。
 */
class RemoteAskCard {
  callId;
  toolName;
  hostName;
  dispatchEpoch;
  issuedAt;
  claimedMode;
  card;
  #e;
  #i;
  #u;
  #a;
  #l = false;
  #d;
  #h;
  #m;
  #t;
  #s;
  #r = "none";
  #p;
  #k;
  #f = 0;
  #y = 0;
  #w = 0;
  #g;
  #A = false;
  #b = new Map();
  #o;
  #n;
  constructor(e) {
    this.callId = e.callId;
    this.toolName = e.toolName;
    this.hostName = e.hostName;
    this.dispatchEpoch = e.dispatchEpoch;
    this.#k = e.onAskEnded;
    this.#n = e.now;
    this.issuedAt = e.now();
  }
  get phase() {
    if (this.#o !== undefined) return "settled";
    if (this.#t !== undefined) return "asking";
    return this.#d === undefined ? "pending" : "sent";
  }
  get instanceId() {
    return this.#e;
  }
  get sentUnderEpoch() {
    return this.#i ?? this.dispatchEpoch;
  }
  get carryingRequestId() {
    return this.#u;
  }
  get inheritedRequestId() {
    return this.#a?.requestId;
  }
  get inheritedWithdrawn() {
    return this.#l;
  }
  inherit(requestId, withdraw) {
    this.#a = {
      requestId,
      withdraw,
    };
  }
  withdrawInherited() {
    if (this.#a === undefined || this.#l) return false;
    this.#l = true;
    logRemoteTools(this.callId, "inherited standing request withdrawn", {
      host_inst: this.#e,
    });
    this.#a.withdraw();
    return true;
  }
  get ask() {
    return this.#t;
  }
  get askEnded() {
    return this.#s;
  }
  get askOutstanding() {
    return this.#r === "raised" || this.#r === "asking";
  }
  get elapsedMs() {
    return (this.#o?.at ?? this.#n()) - this.issuedAt;
  }
  get queuedMs() {
    return this.#y;
  }
  get askSeatWaitMs() {
    return this.#w;
  }
  get reconnectHoldMs() {
    return this.#g;
  }
  get sentWithoutAskSeat() {
    return this.#A;
  }
  noteSentWithoutAskSeat() {
    this.#A = true;
  }
  get askingMs() {
    return this.#t === undefined ? this.#f : this.#f + (this.#n() - this.#t.since);
  }
  get settled() {
    return this.#o;
  }
  get wireName() {
    return this.#d?.wireName;
  }
  get fingerprint() {
    if (this.#h === undefined && this.#d !== undefined)
      this.#h = stableHashWithSalt(this.#d.wireName, this.#d.input);
    return this.#h;
  }
  get askedAboutKey() {
    if (this.#d === undefined) return;
    return SHELL_TOOL_NAMES.includes(this.toolName)
      ? stableHashWithSalt(this.#d.wireName, {
          command: this.#d.input.command,
        })
      : this.fingerprint;
  }
  sent(e) {
    this.#d = e;
    this.#h = undefined;
  }
  questionRaised() {
    this.#r = "raised";
  }
  answeredWithoutPrompt() {
    this.#r = this.#s === undefined ? "answered" : "none";
  }
  get approvedBy() {
    return this.#p;
  }
  recordApprovedBy(e) {
    this.#p = e;
  }
  recordAddressee(e, n, t) {
    if (this.#e !== undefined && this.#e !== e) this.#s = undefined;
    this.#e = e;
    this.#i ??= n;
    this.#u = t ?? this.#u;
  }
  beginQueuedWait() {
    let e = this.#n();
    let n = false;
    return () => {
      if (n) return;
      n = true;
      this.#y += this.#n() - e;
    };
  }
  beginAskSeatWait() {
    let e = this.#n();
    let n = false;
    return () => {
      if (n) return;
      n = true;
      this.#w += this.#n() - e;
    };
  }
  beginReconnectHold() {
    let e = this.#n();
    this.#g = 0;
    return () => {
      this.#g = this.#n() - e;
    };
  }
  legTransit(e) {
    return this.#b.get(e);
  }
  recordLegTransit(e, n) {
    this.#b.set(e, n);
  }
  get held() {
    return this.#m;
  }
  hold(e) {
    this.#m = e;
  }
  async whileAsking(e, n, t) {
    this.#c();
    this.#r = "asking";
    this.#t = {
      ...e,
      since: this.#n(),
    };
    if (this.#s !== undefined) e.end?.(this.#s);
    let abortController = new AbortController();
    let i;
    let s = () => {
      if (t === undefined || abortController.signal.aborted) return;
      i?.abort();
      let abortController_2 = new AbortController();
      i = abortController_2;
      sleep(t.afterMs, abortController_2.signal).then(() => {
        if (!abortController_2.signal.aborted && !abortController.signal.aborted) {
          logRemoteTools(this.callId, "ask lapsed unanswered", {
            ask_id: e.askId,
            after_ms: t.afterMs,
          });
          this.endAsk(t.reason);
        }
      });
    };
    s();
    try {
      return await n({
        hold: () => i?.abort(),
        resume: s,
      });
    } finally {
      abortController.abort();
      i?.abort();
      this.#r = this.#s === undefined ? "answered" : "none";
      this.#c();
    }
  }
  endAsk(e) {
    if (this.#s !== undefined) return;
    this.#s = e;
    logRemoteTools(this.callId, "ask ended without an answer", {
      reason: e,
      ask_id: this.#t?.askId,
      host_inst: this.#e,
      showing: this.#t?.end !== undefined,
    });
    this.#t?.end?.(e);
    this.#k?.(e);
  }
  #c() {
    if (this.#t === undefined) return;
    this.#f += this.#n() - this.#t.since;
    this.#t = undefined;
  }
  markSettled(e) {
    if (this.#o !== undefined) return;
    this.#c();
    this.#o = {
      outcome:
        e.kind === "completed"
          ? {
              kind: "completed",
              disposition: e.disposition,
            }
          : {
              kind: "error",
              code: e.code,
            },
      at: this.#n(),
    };
    return this.#o;
  }
}
//@ chunk-4nx37fzw.js:3731-4680 placement
class RemoteAskSeat {
  now = Date.now;
  #e = new Map();
  #i = [];
  begin(e) {
    let n = new RemoteAskCard({
      ...e,
      now: this.now,
    });
    this.#e.set(e.callId, n);
    return n;
  }
  settle(e, n) {
    let t = e.markSettled(n);
    if (t === undefined) return;
    if (this.#e.get(e.callId) === e) this.#e.delete(e.callId);
    this.remember({
      callId: e.callId,
      toolName: e.toolName,
      hostName: e.hostName,
      fingerprint: e.fingerprint,
      asked: e.card !== undefined,
      askedAboutKey: e.askedAboutKey,
      ...t,
    });
  }
  get(e) {
    return this.#e.get(e);
  }
  addressedTo(e) {
    let n = [];
    for (let t of this.#e.values()) if (t.instanceId === e) n.push(t);
    return n;
  }
  recentByFingerprint(e, n) {
    let t = [];
    let d = this.now();
    for (let i = this.#i.length - 1; i >= 0; i -= 1) {
      let s = this.#i[i];
      if (d - s.at > n) break;
      if (s.fingerprint === e) t.push(s);
    }
    return t;
  }
  askedAboutBefore(e) {
    let askedAboutKey = e.askedAboutKey;
    return (
      askedAboutKey !== undefined &&
      this.#i.some((t) => t.asked && t.askedAboutKey === askedAboutKey && t.callId !== e.callId)
    );
  }
  remember(e) {
    let n = {
      ...e,
      at: Math.min(e.at, this.now()),
    };
    let lastIndex = this.#i.findLastIndex((d) => d.at <= n.at);
    this.#i.splice(lastIndex + 1, 0, n);
    if (this.#i.length > MAX_ASK_CARDS_TRACKED) this.#i.shift();
  }
}
export { RemoteAskSeat };
