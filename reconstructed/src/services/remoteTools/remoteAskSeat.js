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
  constructor(init) {
    this.callId = init.callId;
    this.toolName = init.toolName;
    this.hostName = init.hostName;
    this.dispatchEpoch = init.dispatchEpoch;
    this.#k = init.onAskEnded;
    this.#n = init.now;
    this.issuedAt = init.now();
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
  sent(sent) {
    this.#d = sent;
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
  recordApprovedBy(who) {
    this.#p = who;
  }
  recordAddressee(instanceId, epoch, requestId) {
    if (this.#e !== undefined && this.#e !== instanceId) this.#s = undefined;
    this.#e = instanceId;
    this.#i ??= epoch;
    this.#u = requestId ?? this.#u;
  }
  beginQueuedWait() {
    let startMs = this.#n();
    let ended = false;
    return () => {
      if (ended) return;
      ended = true;
      this.#y += this.#n() - startMs;
    };
  }
  beginAskSeatWait() {
    let startMs = this.#n();
    let ended = false;
    return () => {
      if (ended) return;
      ended = true;
      this.#w += this.#n() - startMs;
    };
  }
  beginReconnectHold() {
    let startMs = this.#n();
    this.#g = 0;
    return () => {
      this.#g = this.#n() - startMs;
    };
  }
  legTransit(leg) {
    return this.#b.get(leg);
  }
  recordLegTransit(leg, transitMs) {
    this.#b.set(leg, transitMs);
  }
  get held() {
    return this.#m;
  }
  hold(holdHandle) {
    this.#m = holdHandle;
  }
  async whileAsking(ask, run, lapse) {
    this.#c();
    this.#r = "asking";
    this.#t = {
      ...ask,
      since: this.#n(),
    };
    if (this.#s !== undefined) ask.end?.(this.#s);
    let abortController = new AbortController();
    let lapseTimer;
    let armLapse = () => {
      if (lapse === undefined || abortController.signal.aborted) return;
      lapseTimer?.abort();
      let abortController_2 = new AbortController();
      lapseTimer = abortController_2;
      sleep(lapse.afterMs, abortController_2.signal).then(() => {
        if (!abortController_2.signal.aborted && !abortController.signal.aborted) {
          logRemoteTools(this.callId, "ask lapsed unanswered", {
            ask_id: ask.askId,
            after_ms: lapse.afterMs,
          });
          this.endAsk(lapse.reason);
        }
      });
    };
    armLapse();
    try {
      return await run({
        hold: () => lapseTimer?.abort(),
        resume: armLapse,
      });
    } finally {
      abortController.abort();
      lapseTimer?.abort();
      this.#r = this.#s === undefined ? "answered" : "none";
      this.#c();
    }
  }
  endAsk(reason) {
    if (this.#s !== undefined) return;
    this.#s = reason;
    logRemoteTools(this.callId, "ask ended without an answer", {
      reason,
      ask_id: this.#t?.askId,
      host_inst: this.#e,
      showing: this.#t?.end !== undefined,
    });
    this.#t?.end?.(reason);
    this.#k?.(reason);
  }
  #c() {
    if (this.#t === undefined) return;
    this.#f += this.#n() - this.#t.since;
    this.#t = undefined;
  }
  markSettled(outcome) {
    if (this.#o !== undefined) return;
    this.#c();
    this.#o = {
      outcome:
        outcome.kind === "completed"
          ? {
              kind: "completed",
              disposition: outcome.disposition,
            }
          : {
              kind: "error",
              code: outcome.code,
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
  begin(init) {
    let card = new RemoteAskCard({
      ...init,
      now: this.now,
    });
    this.#e.set(init.callId, card);
    return card;
  }
  settle(card, outcome) {
    let settled = card.markSettled(outcome);
    if (settled === undefined) return;
    if (this.#e.get(card.callId) === card) this.#e.delete(card.callId);
    this.remember({
      callId: card.callId,
      toolName: card.toolName,
      hostName: card.hostName,
      fingerprint: card.fingerprint,
      asked: card.card !== undefined,
      askedAboutKey: card.askedAboutKey,
      ...settled,
    });
  }
  get(callId) {
    return this.#e.get(callId);
  }
  addressedTo(instanceId) {
    let cards = [];
    for (let card of this.#e.values()) if (card.instanceId === instanceId) cards.push(card);
    return cards;
  }
  recentByFingerprint(fingerprint, withinMs) {
    let matches = [];
    let nowMs = this.now();
    for (let index = this.#i.length - 1; index >= 0; index -= 1) {
      let entry = this.#i[index];
      if (nowMs - entry.at > withinMs) break;
      if (entry.fingerprint === fingerprint) matches.push(entry);
    }
    return matches;
  }
  askedAboutBefore(card) {
    let askedAboutKey = card.askedAboutKey;
    return (
      askedAboutKey !== undefined &&
      this.#i.some(
        (entry) => entry.asked && entry.askedAboutKey === askedAboutKey && entry.callId !== card.callId,
      )
    );
  }
  remember(entry) {
    let clamped = {
      ...entry,
      at: Math.min(entry.at, this.now()),
    };
    let lastIndex = this.#i.findLastIndex((existing) => existing.at <= clamped.at);
    this.#i.splice(lastIndex + 1, 0, clamped);
    if (this.#i.length > MAX_ASK_CARDS_TRACKED) this.#i.shift();
  }
}
export { RemoteAskSeat };
