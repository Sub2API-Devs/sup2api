/**
 * utils/randomId.ts
 *
 * 2.1.316 新增：随机 id
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * new in 2.1.318 (2.1.88 has no file at this path)
 * pieces: chunk-jjzv90rc.js (2)
 * attribution: placement 2
 */
import { randomBytes } from "crypto";
import { hopIdHmac } from "./peerMessageHeaders.js";
import { deferInit } from "../../runtime/deferred-init.js";

//@ chunk-jjzv90rc.js:265-277 placement
var randomIdSecret; // deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
deferInit("chunk-jjzv90rc.js:265", () => {
  randomIdSecret = randomBytes(32);
});
//@ chunk-jjzv90rc.js:277-309 placement
/**
 * hmacRandomId：用密钥做 HMAC 生成 id。
 */
function hmacRandomId(input) {
  return hopIdHmac(input, randomIdSecret);
}
export { hmacRandomId };
