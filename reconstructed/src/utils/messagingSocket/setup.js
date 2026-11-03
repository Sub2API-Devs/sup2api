/**
 * utils/messagingSocket/setup.ts
 *
 * 2.1.316 新增：消息 socket 设置
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-tm1p6ddm.js (4)
 * attribution: placement 4
 */
import { HostScoped } from "../hostScoped.js";

//@ chunk-tm1p6ddm.js:226-240 placement
var LPr = 30000;
/**
 * 消息 socket 的状态：socket 路径、已连接客户端、回调、令牌、认证与启动失败原因等。
 */
//@ chunk-tm1p6ddm.js:240-1214 placement
class MessagingSocketState {
  activeSocketPath = void 0;
  connectedClients = new Set();
  onEnqueue = null;
  onRename = null;
  onEnableRemoteControl = null;
  onPeerMessageStatus = null;
  processingChain = Promise.resolve();
  activeTokens = void 0;
  activeKeyFile = void 0;
  authRequired = !1;
  authOkReported = !1;
  authDropReported = !1;
  firstLineDeadlineMs = LPr;
  silentDropReported = !1;
  lastStartFailureCause = void 0;
  lastStartDegradedCause = void 0;
  lastStartFailureDetail = void 0;
  startInFlight = !1;
  peerDirOwnerUids = [];
  reset() {
    ((this.onEnqueue = null),
      (this.onRename = null),
      (this.onEnableRemoteControl = null),
      (this.onPeerMessageStatus = null),
      (this.activeSocketPath = void 0),
      this.connectedClients.clear(),
      (this.processingChain = Promise.resolve()),
      (this.activeTokens = void 0),
      (this.activeKeyFile = void 0),
      (this.authRequired = !1),
      (this.authOkReported = !1),
      (this.authDropReported = !1),
      (this.firstLineDeadlineMs = LPr),
      (this.silentDropReported = !1),
      (this.lastStartFailureCause = void 0),
      (this.lastStartDegradedCause = void 0),
      (this.lastStartFailureDetail = void 0),
      (this.startInFlight = !1),
      (this.peerDirOwnerUids = []));
  }
}
/**
 * 消息 socket 不可用的原因文字（目录、路径、绑定、发布密钥、绑定后设置失败）。
 */
//@ chunk-tm1p6ddm.js:1214-1779 placement
function messagingSocketUnavailableReason(e) {
  if (e.startInFlight || e.activeSocketPath !== void 0) return;
  switch (e.lastStartFailureCause) {
    case "socket_dir_refused":
      return e.lastStartFailureDetail !== void 0
        ? `its socket directory could not be set up: ${e.lastStartFailureDetail}`
        : "its socket directory could not be set up";
    case "path_refused":
      return "its socket path is not a usable local address";
    case "bind_failed":
      return "it could not be started";
    case "key_publish_failed":
      return "its peer key could not be published";
    case "post_bind_setup_failed":
      return "setting it up after bind failed";
    case void 0:
      return;
  }
}
//@ chunk-tm1p6ddm.js:1779-1804 placement
var don = new HostScoped(() => new MessagingSocketState());

export { don, messagingSocketUnavailableReason, LPr };
