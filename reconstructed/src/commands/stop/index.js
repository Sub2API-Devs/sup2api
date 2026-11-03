/**
 * commands/stop/index.ts
 *
 * 2.1.316 新增：非交互后台会话的 /stop 命令
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-adzz9hc5.js (1)
 * attribution: placement 1
 */
import { isBgSession } from "../../utils/concurrentSessions.js";
import { hkt } from "../../context/replRootContext.js";

/**
 * /stop 命令对象（local-jsx）；描述：Stop this background session; transcript and worktree are kept；isEnabled: ()=>Ft()||hkt()!==null；实现 chunk-t85zxbmt.js 的 cho。
 */
//@ chunk-adzz9hc5.js:3344-3692 placement
var stopCommandDefinition = {
    type: "local-jsx",
    name: "stop",
    description: "Stop this background session; transcript and worktree are kept",
    immediate: !0,
    isEnabled: () => isBgSession() || hkt() !== null,
  },
  stopNonInteractiveCommand = {
    type: "local",
    name: "stop",
    supportsNonInteractive: !0,
    description: "Stop this background session; transcript and worktree are kept",
    isEnabled: isBgSession,
    load: () => import("./chunk-zsxk930s.js"),
  },
  stopCommand = stopCommandDefinition;
