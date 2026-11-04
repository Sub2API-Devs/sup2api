/**
 * utils/udsMessaging/messagingEnv.ts
 *
 * 2.1.316 新增：跨会话消息的环境变量（CLAUDE_CODE_MESSAGING_SOCKET/TOKEN）
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-zya51bzb.js (4)
 * attribution: placement 4
 */
import { __export } from "../../../runtime/bun-runtime.js";
import { ENV_PARSERS } from "../envSchema.js";

//@ chunk-zya51bzb.js:486-495 placement
var MESSAGING_ENV_DEFAULTS = {};
//@ chunk-zya51bzb.js:495-572 placement
__export(MESSAGING_ENV_DEFAULTS, {
  CLAUDE_CODE_MESSAGING_SOCKET: () => messagingSocketEnv,
  CLAUDE_CODE_MESSAGING_TOKEN: () => messagingTokenEnv,
});
//@ chunk-zya51bzb.js:572-596 placement
var messagingSocketEnv = ENV_PARSERS.str();
var messagingTokenEnv = ENV_PARSERS.str();
//@ chunk-zya51bzb.js:596-609 placement
/**
 * 跨会话消息环境变量的副本。
 */
var MESSAGING_ENV_COPY = {
  ...MESSAGING_ENV_DEFAULTS,
};
export { MESSAGING_ENV_COPY };
