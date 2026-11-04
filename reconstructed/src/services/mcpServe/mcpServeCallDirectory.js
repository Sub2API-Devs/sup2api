/**
 * services/mcpServe/mcpServeCallDirectory.ts
 *
 * 2.1.316 新增：claude mcp serve 中单次调用的工作目录隔离与结束时采纳
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-1mqwyc6a.js (1)
 * attribution: placement 1
 */
import { getSessionProject } from "../../bootstrap/sessionSlices.js";
import { permissionCheckedCwds, setCwd } from "../../utils/Shell.js";
import { runInRemoteCallFrameMain } from "../../remote/remoteMode.js";
import { logForDebugging } from "../../utils/debug.js";
import { logFeatureSad, logFeatureOk } from "../analytics/featureTelemetry.js";
import { errorMessage } from "../../utils/errors.js";
import { invalidateSessionEnvCache } from "../../utils/sessionEnvironment.js";
import { onCwdChanged } from "../../utils/hooks/fileChangedWatcher.js";
import { logError } from "../../utils/log.js";

//@ chunk-1mqwyc6a.js:11848-12627 placement
function createCallDirectoryScope(session, callerGone) {
  let cwd = getSessionProject(session).cwd;
  let scopedSession = session.withProject({
    cwd,
  });
  permissionCheckedCwds.of(scopedSession).set(scopedSession, cwd);
  let projectCwdSubscription = scopedSession.subscribe(() => {
    if (scopedSession.project?.cwd !== cwd) permissionCheckedCwds.of(scopedSession).set(scopedSession, "");
  });
  let cwdMovedMeanwhile = false;
  let sessionSubscription = session.subscribe(() => {
    cwdMovedMeanwhile ||= session.project?.cwd !== cwd;
  });
  return {
    session: scopedSession,
    run: (run) => runInRemoteCallFrameMain(getSessionProject(scopedSession).cwd, run),
    bind: (run) => () => runInRemoteCallFrameMain(getSessionProject(scopedSession).cwd, run),
    [Symbol.dispose]() {
      sessionSubscription();
      projectCwdSubscription();
      let cwd_2 = getSessionProject(scopedSession).cwd;
      if (cwd_2 === cwd || callerGone.aborted) return;
      if (cwdMovedMeanwhile) {
        logForDebugging(
          `MCP server: a call ended in ${cwd_2}, but another call moved the working directory meanwhile, so the next call starts in ${session.project?.cwd}`,
        );
        logFeatureSad("mcp_serve_call_directory", "moved_meanwhile");
        return;
      }
      try {
        setCwd(cwd_2, session);
      } catch (error) {
        logForDebugging(
          `MCP server: the directory a call ended in could not be adopted, so the next call starts in ${cwd}: ${errorMessage(error)}`,
        );
        logFeatureSad("mcp_serve_call_directory", "end_directory_gone");
        return;
      }
      invalidateSessionEnvCache();
      onCwdChanged(cwd, cwd_2).catch(logError);
      logFeatureOk("mcp_serve_call_directory");
    },
  };
}
export { createCallDirectoryScope };
