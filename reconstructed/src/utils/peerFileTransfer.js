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
var Lue = 31457280,
  Lun = 524288000,
  qoe = 16;
//@ chunk-pn6cmra7.js:300-352 placement
function y2e() {
  return isCrossSessionMessagingEnabled() && getFeatureValue_CACHED_MAY_BE_STALE("tengu_send_file", !1);
}
/**
 * 对等文件传输的错误文案与协议版本。
 */
//@ chunk-pn6cmra7.js:352-530 placement
var PEER_FILE_UNREADABLE_TEXT = `could not be read, is not a regular file, or exceeds the ${Lue / 1048576} MiB transfer limit`,
  PEER_SEND_UNAVAILABLE_TEXT = "this session cannot send files to other sessions on this machine",
  PEER_TRANSFER_VERSION = 1;

export { y2e, PEER_TRANSFER_VERSION, Lue, Lun, qoe, PEER_FILE_UNREADABLE_TEXT, PEER_SEND_UNAVAILABLE_TEXT };
