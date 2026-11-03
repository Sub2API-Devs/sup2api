/**
 * utils/swarm/hostState.ts
 *
 * 2.1.316 新增：swarm 宿主状态
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-c1qgdbhd.js (14)
 * attribution: placement 14
 */
import { createHash } from "crypto";
import { jsonStringify } from "../slowOperations.js";
import { createSignal } from "../signal.js";
import { createKeyedQueue } from "../promiseQueue.js";
import { HostScoped } from "../hostScoped.js";
import { getRootSession } from "../../bootstrap/state.js";

//@ chunk-c1qgdbhd.js:404-415 placement
var f = 2048;
/**
 * 记录邮箱写入的消息 id 账本，供去重与回执。
 */
//@ chunk-c1qgdbhd.js:415-927 placement
class MailboxWriteLedger {
  #e = new Map();
  #n = new Set();
  record(e, n) {
    if (n.msg_id === void 0) return;
    let s = this.#e.get(e);
    if (s === void 0) ((s = new Map()), this.#e.set(e, s));
    if ((s.set(n.msg_id, mailboxMessageHash(n)), !this.#n.has(e))) h(s);
  }
  wrote(e, n) {
    return n.msg_id !== void 0 && this.#e.get(e)?.get(n.msg_id) === mailboxMessageHash(n);
  }
  retire(e, n) {
    let s = new Set(n);
    this.#s(e, (o) => !s.has(o));
  }
  retain(e, n) {
    (this.#n.add(e), this.#s(e, (s) => n.has(s)));
  }
  forget(e) {
    this.#e.delete(e);
  }
  #s(e, n) {
    let s = this.#e.get(e);
    if (s === void 0) return;
    for (let o of s.keys()) if (!n(o)) s.delete(o);
    if (s.size === 0) this.#e.delete(e);
  }
}
//@ chunk-c1qgdbhd.js:927-1003 placement
function h(e) {
  if (e.size <= f) return;
  let [n] = e.keys();
  if (n !== void 0) e.delete(n);
}
//@ chunk-c1qgdbhd.js:1003-1139 placement
function mailboxMessageHash(e) {
  return createHash("sha256")
    .update(
      jsonStringify([e.from, e.timestamp, e.text, e.summary ?? null, e.color ?? null, e.from_plugin ?? null]),
    )
    .digest("hex");
}
/**
 * 入站对端状态：当前模式、持有/释放回调、回执发送等。
 */
//@ chunk-c1qgdbhd.js:1139-1834 placement
class InboundPeerState {
  getCurrentMode = null;
  modeAtUnwire = void 0;
  onPeerHeld = null;
  onPeerHoldReleased = null;
  onPeerHoldDropped = null;
  sendPeerReceipt = null;
  recordCorrespondent = null;
  publishAvailability = null;
  unsubscribeAvailabilityRefresh = null;
  shutdownSettleHandle = null;
  shuttingDown = !1;
  held = [];
  announced = new WeakMap();
  reset() {
    ((this.held.length = 0),
      (this.getCurrentMode = null),
      (this.modeAtUnwire = void 0),
      (this.onPeerHeld = null),
      (this.onPeerHoldReleased = null),
      (this.onPeerHoldDropped = null),
      this.shutdownSettleHandle?.(),
      (this.shutdownSettleHandle = null),
      (this.shuttingDown = !1),
      (this.sendPeerReceipt = null),
      (this.recordCorrespondent = null),
      (this.publishAvailability = null),
      this.unsubscribeAvailabilityRefresh?.(),
      (this.unsubscribeAvailabilityRefresh = null));
  }
}
//@ chunk-c1qgdbhd.js:1834-1953 placement
class ReceiptsState {
  outstandingSends = [];
  awaitingTerminal = [];
  reset() {
    ((this.outstandingSends.length = 0), (this.awaitingTerminal.length = 0));
  }
}
//@ chunk-c1qgdbhd.js:1953-1997 placement
class l {
  pacer = null;
  reset() {
    this.pacer = null;
  }
}
//@ chunk-c1qgdbhd.js:1997-2188 placement
class IngressState {
  ownUdsHopToken = void 0;
  ownBridgePeerAddressResolver = void 0;
  messageDropped = createSignal();
  reset() {
    ((this.ownUdsHopToken = void 0),
      (this.ownBridgePeerAddressResolver = void 0),
      this.messageDropped.clear());
  }
}
//@ chunk-c1qgdbhd.js:2188-2348 placement
class SwarmPermissionsState {
  pending = new Map();
  pendingSandbox = new Map();
  pendingPlanApproval = null;
  clear() {
    (this.pending.clear(), this.pendingSandbox.clear(), (this.pendingPlanApproval = null));
  }
}
//@ chunk-c1qgdbhd.js:2348-2422 placement
class p {
  reportedDroppedEntries = new Set();
  pendingPrunes = new Map();
  ledger = new MailboxWriteLedger();
}
//@ chunk-c1qgdbhd.js:2422-2659 placement
class TaskListState {
  updated = createSignal();
  locks = createKeyedQueue();
  leaderTeamName = void 0;
  sessionListId = void 0;
  reset() {
    if (this.leaderTeamName === void 0 && this.sessionListId === void 0) return;
    ((this.leaderTeamName = void 0), (this.sessionListId = void 0));
    try {
      this.updated.emit();
    } catch {}
  }
}
/**
 * 每个会话宿主一份的 swarm 状态集合：入站对端、回执、出站节奏、入口、权限中继、mailbox 与任务列表，供 HostScoped 单例使用。
 */
//@ chunk-c1qgdbhd.js:2659-2777 placement
class SwarmHostState {
  inbound = new InboundPeerState();
  receipts = new ReceiptsState();
  outbound = new l();
  ingress = new IngressState();
  swarmPermissions = new SwarmPermissionsState();
  mailbox = new p();
  taskList = new TaskListState();
}
//@ chunk-c1qgdbhd.js:2777-2800 placement
var y = new HostScoped(() => new SwarmHostState());
//@ chunk-c1qgdbhd.js:2800-2836 placement
function ci() {
  return y.of(getRootSession().host);
}

export { ci };
