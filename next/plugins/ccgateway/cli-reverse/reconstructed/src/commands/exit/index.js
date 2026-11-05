/**
 * commands/exit/index.ts
 *
 * /exit（别名 quit）命令对象，后台会话里描述为 Detach
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/commands/exit/index.ts
 * pieces: chunk-5xgkngpb.js (2)
 * attribution: placement 1, fingerprint 1
 */
import { isBgSession } from "../../utils/concurrentSessions.js";

//@ chunk-5xgkngpb.js:2093292-2093391 placement
/**
 * getExitDescription：后台会话为 "Detach..."，否则 "Exit the CLI"。
 */
function getExitDescription() {
  return isBgSession() ? "Detach from this background session (it keeps running)" : "Exit the CLI";
}
//@ chunk-5xgkngpb.js:2093391-2093721 fingerprint (2.1.88 match: exit, 0.605)
/**
 * /exit 命令对象（local-jsx）；描述：{return Arn()}；别名 ["quit"]；实现 chunk-xs5f70ym.js 的 Pe。
 */
var exitCommandDefinition = {
  type: "local-jsx",
  name: "exit",
  aliases: ["quit"],
  get description() {
    return getExitDescription();
  },
  immediate: true,
  requires: {
    ink: true,
  },
  terminalOriented: true,
  fleetHostCall: async ({ exit }) => exit(),
};
var exitNonInteractiveCommand = {
  type: "local",
  name: "exit",
  terminalOriented: true,
  supportsNonInteractive: true,
  get description() {
    return getExitDescription();
  },
  load: () => import("./call.lazy.js"),
};
var exitCommand = exitCommandDefinition;
export { exitCommand, exitNonInteractiveCommand };
