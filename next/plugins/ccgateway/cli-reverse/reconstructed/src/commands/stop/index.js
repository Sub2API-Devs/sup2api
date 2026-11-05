/**
 * commands/stop/index.ts
 *
 * 2.1.316 新增：非交互后台会话的 /stop 命令
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * new in 2.1.318 (2.1.88 has no file at this path)
 * pieces: chunk-fbdrnep1.js (1)
 * attribution: placement 1
 * (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.
 */
import { isBgSession } from "../../utils/concurrentSessions.js";
import { getRootSessionOverride } from "../../context/replRootContext.js";

//@ chunk-fbdrnep1.js:3652-4000 placement
/**
 * /stop 命令对象（local-jsx）；描述：Stop this background session; transcript and worktree are kept；isEnabled: ()=>Ft()||hkt()!==null；实现 chunk-t85zxbmt.js 的 cho。
 */
var stopCommandDefinition = {
  type: "local-jsx",
  name: "stop",
  description: "Stop this background session; transcript and worktree are kept",
  immediate: true,
  isEnabled: () => isBgSession() || getRootSessionOverride() !== null,
};
var stopNonInteractiveCommand = {
  type: "local",
  name: "stop",
  supportsNonInteractive: true,
  description: "Stop this background session; transcript and worktree are kept",
  isEnabled: isBgSession,
  load: () => import("./call.lazy.js"),
};
var stopCommand = stopCommandDefinition;
export { stopCommand, stopNonInteractiveCommand };
