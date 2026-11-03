/**
 * commands/session/index.ts
 *
 * /session（别名 remote）命令对象（远程会话时可用）
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/commands/session/index.ts
 * pieces: chunk-e6aww6q8.js (1)
 * attribution: fingerprint 1
 */
import { getIsRemoteMode } from "../../bootstrap/state.js";
import { hasRemoteCap } from "../../remote/remoteMode.js";

//@ chunk-e6aww6q8.js:1735365-1735556 fingerprint = session (0.636)
/**
 * /session 命令对象（local-jsx）；描述：Show cloud session URL and QR code；别名 ["remote"]；isEnabled: ()=>On()；isHidden: {return!_C("fanout")}；实现 chunk-3rb87ry3.js 的 Pe。
 */
var sessionCommandDefinition = {
  type: "local-jsx",
  name: "session",
  aliases: ["remote"],
  description: "Show cloud session URL and QR code",
  isEnabled: () => getIsRemoteMode(),
  get isHidden() {
    return !hasRemoteCap("fanout");
  },
  requires: {
    ink: true,
  },
};
var sessionCommand = sessionCommandDefinition;
export { sessionCommand };
