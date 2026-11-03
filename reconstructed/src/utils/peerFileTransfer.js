/**
 * utils/peerFileTransfer.ts
 *
 * 2.1.316 新增：对等文件传输
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-pn6cmra7.js (3)
 * attribution: placement 3
 */
import { isCrossSessionMessagingEnabled } from "./crossSessionMessagingGate.js";
import { getFeatureValue_CACHED_MAY_BE_STALE } from "../services/analytics/growthbook.js";

//@ chunk-pn6cmra7.js:262-300 placement
/**
 * MAX_PEER_FILE_BYTES：单个对端文件的传输上限（30 MiB）；MAX_PEER_SPOOL_BYTES：对端文件落到中转目录的总量上限；MAX_PEER_ATTACHMENTS：一次消息最多携带的对端文件数（同一声明共 3 个绑定）。
 */
var MAX_PEER_FILE_BYTES = 31457280;
var MAX_PEER_SPOOL_BYTES = 524288000;
var MAX_PEER_ATTACHMENTS = 16;
//@ chunk-pn6cmra7.js:300-352 placement
/**
 * isPeerSendFileEnabled：跨会话消息开启且 tengu_send_file 打开时才允许发送文件。
 */
function isPeerSendFileEnabled() {
  return isCrossSessionMessagingEnabled() && getFeatureValue_CACHED_MAY_BE_STALE("tengu_send_file", false);
}
//@ chunk-pn6cmra7.js:352-530 placement
/**
 * 对等文件传输的错误文案与协议版本。
 */
var PEER_FILE_UNREADABLE_TEXT = `could not be read, is not a regular file, or exceeds the ${MAX_PEER_FILE_BYTES / 1048576} MiB transfer limit`;
var PEER_SEND_UNAVAILABLE_TEXT = "this session cannot send files to other sessions on this machine";
var PEER_TRANSFER_VERSION = 1;
export {
  isPeerSendFileEnabled,
  PEER_TRANSFER_VERSION,
  MAX_PEER_FILE_BYTES,
  MAX_PEER_SPOOL_BYTES,
  MAX_PEER_ATTACHMENTS,
  PEER_FILE_UNREADABLE_TEXT,
  PEER_SEND_UNAVAILABLE_TEXT,
};
