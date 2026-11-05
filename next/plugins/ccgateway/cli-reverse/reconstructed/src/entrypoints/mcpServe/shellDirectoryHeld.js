/**
 * entrypoints/mcpServe/shellDirectoryHeld.ts
 *
 * mcp serve 下 shell 目录被“接管”的记录：只在启动目录内、且工作目录没被移动时生效（2.1.318 新增）
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * new in 2.1.318 (2.1.88 has no file at this path)
 * pieces: chunk-drk84f4t.js (2)
 * attribution: placement 2
 * (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.
 */
import { mcpServeCallState } from "../../services/mcpServe/callClaims.js";
import { getSessionProject } from "../../bootstrap/sessionSlices.js";
import { isSafeRelativePath } from "../../utils/sanitization.js";
import { logFeatureBad, logFeatureOk } from "../../services/analytics/featureTelemetry.js";
import { invalidateSessionEnvCache } from "../../utils/sessionEnvironment.js";

//@ chunk-drk84f4t.js:373-883 placement
/**
 * 记录 shell 目录被接管：只在启动目录内、路径是普通目录且工作目录没被移动时生效。
 */
function takeShellDirectoryHeld(directory, shellState) {
  let { shell } = mcpServeCallState.of(shellState);
  let { cwd: originalCwd, originalCwd: cwd } = getSessionProject(shellState);
  if (!shell.isWatched) {
    shell.isWatched = true;
    shell.hasMoved = originalCwd !== cwd;
    shellState.subscribe(() => {
      shell.hasMoved ||= shellState.project?.cwd !== cwd;
      if (shellState.project?.cwd !== shell.taken) shell.taken = undefined;
    });
  }
  if (directory === undefined || directory === originalCwd || shell.hasMoved) return;
  if (typeof directory !== "string" || !isSafeRelativePath(directory)) {
    logFeatureBad("mcp_serve_shell_directory_held", "not_a_plain_directory");
    return;
  }
  if (!directory.startsWith(`${cwd}/`)) {
    logFeatureBad("mcp_serve_shell_directory_held", "outside_launch_directory");
    return;
  }
  shell.taken = directory;
  shellState.setCwd(directory);
  invalidateSessionEnvCache();
  logFeatureOk("mcp_serve_shell_directory_held");
}
//@ chunk-drk84f4t.js:883-936 placement
/**
 * 某会话的 shell 接管目录是否等于给定值。
 */
function isShellDirectoryTaken(session, daemonCwd) {
  return mcpServeCallState.peek(session)?.shell.taken === daemonCwd;
}
export { isShellDirectoryTaken, takeShellDirectoryHeld };
