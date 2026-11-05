/**
 * utils/messagingSocket/setup.ts
 *
 * 2.1.316 新增：消息 socket 设置
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * new in 2.1.318 (2.1.88 has no file at this path)
 * pieces: chunk-8ejqp86e.js (4)
 * attribution: placement 4
 * (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.
 */
import { HostScoped } from "../hostScoped.js";

//@ chunk-8ejqp86e.js:226-240 placement
/**
 * 消息套接字服务启动/连接的默认超时（30 秒）。
 */
var MESSAGING_SOCKET_TIMEOUT_MS = 30000;
//@ chunk-8ejqp86e.js:240-1214 placement
/**
 * 消息 socket 的状态：socket 路径、已连接客户端、回调、令牌、认证与启动失败原因等。
 */
class MessagingSocketState {
  activeSocketPath = undefined;
  connectedClients = new Set();
  onEnqueue = null;
  onRename = null;
  onEnableRemoteControl = null;
  onPeerMessageStatus = null;
  processingChain = Promise.resolve();
  activeTokens = undefined;
  activeKeyFile = undefined;
  authRequired = false;
  authOkReported = false;
  authDropReported = false;
  firstLineDeadlineMs = MESSAGING_SOCKET_TIMEOUT_MS;
  silentDropReported = false;
  lastStartFailureCause = undefined;
  lastStartDegradedCause = undefined;
  lastStartFailureDetail = undefined;
  startInFlight = false;
  peerDirOwnerUids = [];
  reset() {
    this.onEnqueue = null;
    this.onRename = null;
    this.onEnableRemoteControl = null;
    this.onPeerMessageStatus = null;
    this.activeSocketPath = undefined;
    this.connectedClients.clear();
    this.processingChain = Promise.resolve();
    this.activeTokens = undefined;
    this.activeKeyFile = undefined;
    this.authRequired = false;
    this.authOkReported = false;
    this.authDropReported = false;
    this.firstLineDeadlineMs = MESSAGING_SOCKET_TIMEOUT_MS;
    this.silentDropReported = false;
    this.lastStartFailureCause = undefined;
    this.lastStartDegradedCause = undefined;
    this.lastStartFailureDetail = undefined;
    this.startInFlight = false;
    this.peerDirOwnerUids = [];
  }
}
//@ chunk-8ejqp86e.js:1214-1779 placement
/**
 * 消息 socket 不可用的原因文字（目录、路径、绑定、发布密钥、绑定后设置失败）。
 */
function messagingSocketUnavailableReason(state) {
  if (state.startInFlight || state.activeSocketPath !== undefined) return;
  switch (state.lastStartFailureCause) {
    case "socket_dir_refused":
      return state.lastStartFailureDetail !== undefined
        ? `its socket directory could not be set up: ${state.lastStartFailureDetail}`
        : "its socket directory could not be set up";
    case "path_refused":
      return "its socket path is not a usable local address";
    case "bind_failed":
      return "it could not be started";
    case "key_publish_failed":
      return "its peer key could not be published";
    case "post_bind_setup_failed":
      return "setting it up after bind failed";
    case undefined:
      return;
  }
}
//@ chunk-8ejqp86e.js:1779-1804 placement
/**
 * 宿主隔离的消息套接字服务端状态。
 */
var messagingSocketServerSlot = new HostScoped(() => new MessagingSocketState());
export { messagingSocketServerSlot, messagingSocketUnavailableReason, MESSAGING_SOCKET_TIMEOUT_MS };
