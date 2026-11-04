/**
 * utils/clientSurface.ts
 *
 * 客户端表面识别（2.1.316 新增）
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-hrfbvpdn.js (1)
 * attribution: placement 1
 */
import { isBgSession } from "./concurrentSessions.js";
import { isTeammate } from "./teammate.js";
import { isRunningInRemoteEnvironment } from "../bridge/bridgeGates.js";
import { isHostEntrypoint, getEntrypointKind } from "./entrypointKinds.js";

//@ chunk-hrfbvpdn.js:338-452 placement
function detectClientSurface() {
  return isBgSession()
    ? "bg"
    : isTeammate()
      ? "teammate"
      : isRunningInRemoteEnvironment()
        ? "remote"
        : isHostEntrypoint()
          ? "desktop"
          : getEntrypointKind() === "claude-vscode"
            ? "vscode"
            : null;
}
export { detectClientSurface };
