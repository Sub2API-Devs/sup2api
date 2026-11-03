/**
 * cli/print/remoteToolsAnnounce.ts
 *
 * 2.1.316 新增：remote_tools_announce 处理与工作目录同步判定
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-tyg7f3ek.js (7)
 * attribution: placement 7
 */
import { userInfo, homedir } from "os";
import { isAbsolute, join } from "path";
import { GIT_CREDENTIAL_ENTRYPOINTS } from "../remoteIO/workerAuth.js";
import { logFeatureBad } from "../../services/analytics/featureTelemetry.js";
import { REMOTE_DEVICES } from "../../services/mcp/firstPartyServerIds.js";
import { logForDiagnosticsNoPII } from "../../utils/diagLogs.js";
import { logError } from "../../utils/log.js";
import { isEnvTruthy, getClaudeConfigDir } from "../../utils/envUtils.js";

//@ chunk-tyg7f3ek.js:618438-618479 placement
var REMOTE_TOOLS_ANNOUNCE_ENTRYPOINTS = new Set([...GIT_CREDENTIAL_ENTRYPOINTS, "remote_mobile"]);
//@ chunk-tyg7f3ek.js:618479-618834 placement
function admitRemoteToolsAnnounce(e) {
  if (!e.sdkUrl || !e.remoteSessionId || e.environmentKind !== undefined)
    return {
      admitted: false,
      reason: "not_managed_cloud_worker",
    };
  if (e.entrypoint !== undefined && !REMOTE_TOOLS_ANNOUNCE_ENTRYPOINTS.has(e.entrypoint))
    return {
      admitted: false,
      reason: "entrypoint",
    };
  if (e.channelOff)
    return {
      admitted: false,
      reason: "session_channel_off",
    };
  if (e.hermetic)
    return {
      admitted: false,
      reason: "hermetic",
    };
  return {
    admitted: true,
  };
}
//@ chunk-tyg7f3ek.js:618834-619613 placement
/**
 * 处理 remote_tools_announce：仅托管云 worker 准入，转发到会话通道工具服务。
 */
function createRemoteToolsAnnounceHandler(e, n) {
  let r;
  return async (s, h) => {
    if (!e.admitted) {
      logFeatureBad("remote_tools_announce", e.reason);
      h({
        kind: "error",
        error: `remote_tools_disabled: ${e.reason}`,
      });
      return;
    }
    try {
      r ??= import("./chunk-qqkcdb5s.js")
        .then(async (y) =>
          y.createRemoteToolsAnnounceWorker(
            await y.productionRemoteToolsAnnounceDeps({
              workerEpoch: n.workerEpoch,
              toolState: n.toolState,
              sender: n.sender,
              bridgeServer: () => {
                let found = n
                  .mcpClients()
                  .find((R) => R.name === REMOTE_DEVICES && R.config.scope === "dynamic");
                return found === undefined
                  ? undefined
                  : {
                      name: found.name,
                      config: found.config,
                      disabled: found.type === "disabled",
                    };
              },
            }),
          ),
        )
        .catch((error) => {
          r = undefined;
          throw error;
        });
      h(await (await r).handle(s));
    } catch (error) {
      logForDiagnosticsNoPII("warn", "remote_tools_announce_handler_failed", {});
      logError(error);
      logFeatureBad("remote_tools_announce", "internal_error");
      h({
        kind: "error",
        error: "remote_tools_not_ready: internal_error; retry",
      });
    }
  };
}
//@ chunk-tyg7f3ek.js:619704-619761 placement
function safeHomedir() {
  try {
    return userInfo().homedir;
  } catch {
    return homedir();
  }
}
//@ chunk-tyg7f3ek.js:619761-619863 placement = getProjectDirsUpToHome (0.875)
function getProjectDirsUpToHome(subdir, cwd) {
  let r = subdir.HOME !== undefined && isAbsolute(subdir.HOME) ? subdir.HOME : cwd();
  return join(r, ".claude").normalize("NFC");
}
//@ chunk-tyg7f3ek.js:619863-620512 placement
function decideWorkerDirSync(e) {
  if (e.admittedAs === null)
    return {
      start: false,
      reason: "not_admitted",
    };
  if (e.admittedAs === "runner_child")
    return {
      start: false,
      reason: "self_hosted_runner",
    };
  if (!e.dirSyncStarts)
    return {
      start: false,
      reason: "file_store_worker_off",
    };
  let subdir = e.spawnEnv();
  if (isEnvTruthy(subdir.CLAUDE_CODE_DISABLE_HOME_SETTINGS_SEED))
    return {
      start: false,
      reason: "disabled",
    };
  if (e.hermetic)
    return {
      start: false,
      reason: "hermetic",
    };
  let CLAUDE_CONFIG_DIR = subdir.CLAUDE_CONFIG_DIR;
  if (e.admittedAs === "managed" && CLAUDE_CONFIG_DIR !== undefined)
    return {
      start: false,
      reason: "config_dir",
    };
  let projectDirsUpToHome = getProjectDirsUpToHome(subdir, e.accountHome);
  if (e.currentConfigHome() !== projectDirsUpToHome)
    return {
      start: false,
      reason: "config_home_moved",
    };
  return {
    start: true,
    configHome: projectDirsUpToHome,
    foreignFiles: "replaced",
    takes: "everything",
  };
}
//@ chunk-tyg7f3ek.js:620512-620538 placement
function configDirForSync() {
  return getClaudeConfigDir();
}
export {
  decideWorkerDirSync,
  safeHomedir,
  configDirForSync,
  admitRemoteToolsAnnounce,
  createRemoteToolsAnnounceHandler,
};
