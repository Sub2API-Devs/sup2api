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
import { Ar } from "../../../runtime/bun-runtime.js";
import { ENV_PARSERS } from "../envSchema.js";

//@ chunk-zya51bzb.js:486-495 placement
var e = {};
//@ chunk-zya51bzb.js:495-572 placement
Ar(e, { CLAUDE_CODE_MESSAGING_SOCKET: () => str, CLAUDE_CODE_MESSAGING_TOKEN: () => str_2 });
//@ chunk-zya51bzb.js:572-596 placement
var str = ENV_PARSERS.str(),
  str_2 = ENV_PARSERS.str();
//@ chunk-zya51bzb.js:596-609 placement
var s = { ...e };
