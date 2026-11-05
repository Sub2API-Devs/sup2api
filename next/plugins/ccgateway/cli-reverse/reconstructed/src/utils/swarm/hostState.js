/**
 * utils/swarm/hostState.ts
 *
 * 2.1.316 新增：swarm 宿主状态
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * new in 2.1.318 (2.1.88 has no file at this path)
 * pieces: chunk-19yyx8q2.js (14)
 * attribution: placement 14
 */
import { createHash } from "crypto";
import { jsonStringify } from "../slowOperations.js";
import { createSignal } from "../signal.js";
import { createKeyedQueue } from "../promiseQueue.js";
import { HostScoped } from "../hostScoped.js";
import { getRootSession } from "../../bootstrap/state.js";
import { deferInit } from "../../../runtime/deferred-init.js";

//@ chunk-19yyx8q2.js:404-415 placement
var MAILBOX_LEDGER_LIMIT = 2048;
//@ chunk-19yyx8q2.js:415-927 placement
/**
 * 记录邮箱写入的消息 id 账本，供去重与回执。
 */
class MailboxWriteLedger {
  #e = new Map();
  #n = new Set();
  record(inboxPath, message) {
    if (message.msg_id === undefined) return;
    let ledger = this.#e.get(inboxPath);
    if (ledger === undefined) {
      ledger = new Map();
      this.#e.set(inboxPath, ledger);
    }
    ledger.set(message.msg_id, mailboxMessageHash(message));
    if (!this.#n.has(inboxPath)) evictOldestLedgerEntry(ledger);
  }
  wrote(inboxPath, message) {
    return (
      message.msg_id !== undefined &&
      this.#e.get(inboxPath)?.get(message.msg_id) === mailboxMessageHash(message)
    );
  }
  retire(inboxPath, keepIds) {
    let keep = new Set(keepIds);
    this.#s(inboxPath, (messageId) => !keep.has(messageId));
  }
  retain(inboxPath, keepIds) {
    this.#n.add(inboxPath);
    this.#s(inboxPath, (messageId) => keepIds.has(messageId));
  }
  forget(inboxPath) {
    this.#e.delete(inboxPath);
  }
  #s(inboxPath, keep) {
    let ledger = this.#e.get(inboxPath);
    if (ledger === undefined) return;
    for (let key of ledger.keys()) if (!keep(key)) ledger.delete(key);
    if (ledger.size === 0) this.#e.delete(inboxPath);
  }
}
//@ chunk-19yyx8q2.js:927-1003 placement
function evictOldestLedgerEntry(ledger) {
  if (ledger.size <= MAILBOX_LEDGER_LIMIT) return;
  let [oldestId] = ledger.keys();
  if (oldestId !== undefined) ledger.delete(oldestId);
}
//@ chunk-19yyx8q2.js:1003-1139 placement
function mailboxMessageHash(message) {
  return createHash("sha256")
    .update(
      jsonStringify([
        message.from,
        message.timestamp,
        message.text,
        message.summary ?? null,
        message.color ?? null,
        message.from_plugin ?? null,
      ]),
    )
    .digest("hex");
}
//@ chunk-19yyx8q2.js:1139-1834 placement
/**
 * 入站对端状态：当前模式、持有/释放回调、回执发送等。
 */
class InboundPeerState {
  getCurrentMode = null;
  modeAtUnwire = undefined;
  onPeerHeld = null;
  onPeerHoldReleased = null;
  onPeerHoldDropped = null;
  sendPeerReceipt = null;
  recordCorrespondent = null;
  publishAvailability = null;
  unsubscribeAvailabilityRefresh = null;
  shutdownSettleHandle = null;
  shuttingDown = false;
  held = [];
  announced = new WeakMap();
  reset() {
    this.held.length = 0;
    this.getCurrentMode = null;
    this.modeAtUnwire = undefined;
    this.onPeerHeld = null;
    this.onPeerHoldReleased = null;
    this.onPeerHoldDropped = null;
    this.shutdownSettleHandle?.();
    this.shutdownSettleHandle = null;
    this.shuttingDown = false;
    this.sendPeerReceipt = null;
    this.recordCorrespondent = null;
    this.publishAvailability = null;
    this.unsubscribeAvailabilityRefresh?.();
    this.unsubscribeAvailabilityRefresh = null;
  }
}
//@ chunk-19yyx8q2.js:1834-1953 placement
class ReceiptsState {
  outstandingSends = [];
  awaitingTerminal = [];
  reset() {
    this.outstandingSends.length = 0;
    this.awaitingTerminal.length = 0;
  }
}
//@ chunk-19yyx8q2.js:1953-1997 placement
class OutboundPacerState {
  pacer = null;
  reset() {
    this.pacer = null;
  }
}
//@ chunk-19yyx8q2.js:1997-2188 placement
class IngressState {
  ownUdsHopToken = undefined;
  ownBridgePeerAddressResolver = undefined;
  messageDropped = createSignal();
  reset() {
    this.ownUdsHopToken = undefined;
    this.ownBridgePeerAddressResolver = undefined;
    this.messageDropped.clear();
  }
}
//@ chunk-19yyx8q2.js:2188-2348 placement
class SwarmPermissionsState {
  pending = new Map();
  pendingSandbox = new Map();
  pendingPlanApproval = null;
  clear() {
    this.pending.clear();
    this.pendingSandbox.clear();
    this.pendingPlanApproval = null;
  }
}
//@ chunk-19yyx8q2.js:2348-2422 placement
class MailboxState {
  reportedDroppedEntries = new Set();
  pendingPrunes = new Map();
  ledger = new MailboxWriteLedger();
}
//@ chunk-19yyx8q2.js:2422-2659 placement
class TaskListState {
  updated = createSignal();
  locks = createKeyedQueue();
  leaderTeamName = undefined;
  sessionListId = undefined;
  reset() {
    if (this.leaderTeamName === undefined && this.sessionListId === undefined) return;
    this.leaderTeamName = undefined;
    this.sessionListId = undefined;
    try {
      this.updated.emit();
    } catch {}
  }
}
//@ chunk-19yyx8q2.js:2659-2777 placement
/**
 * 每个会话宿主一份的 swarm 状态集合：入站对端、回执、出站节奏、入口、权限中继、mailbox 与任务列表，供 HostScoped 单例使用。
 */
class SwarmHostState {
  inbound = new InboundPeerState();
  receipts = new ReceiptsState();
  outbound = new OutboundPacerState();
  ingress = new IngressState();
  swarmPermissions = new SwarmPermissionsState();
  mailbox = new MailboxState();
  taskList = new TaskListState();
}
//@ chunk-19yyx8q2.js:2777-2800 placement
var swarmHostStateByHost; // deferred: uses SwarmHostState of its import cycle while loading; runs once the cycle is complete
deferInit("chunk-19yyx8q2.js:2777", () => {
  swarmHostStateByHost = new HostScoped(() => new SwarmHostState());
});
//@ chunk-19yyx8q2.js:2800-2836 placement
/**
 * 取当前宿主的 swarm 状态。
 */
function swarmHostState() {
  return swarmHostStateByHost.of(getRootSession().host);
}
export { swarmHostState };
