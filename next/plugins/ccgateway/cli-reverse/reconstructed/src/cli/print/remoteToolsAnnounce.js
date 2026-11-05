/**
 * cli/print/remoteToolsAnnounce.ts
 *
 * 2.1.316 新增：remote_tools_announce 处理与工作目录同步判定
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * new in 2.1.318 (2.1.88 has no file at this path)
 * pieces: chunk-0yw3taqg.js (7)
 * attribution: placement 7
 */
import { userInfo, homedir } from "os";
import { isAbsolute, join } from "path";
import { GIT_CREDENTIAL_ENTRYPOINTS } from "../remoteIO/workerAuth.js";
import { logFeatureBad } from "../../services/analytics/featureTelemetry.js";
import { REMOTE_DEVICES } from "../../services/mcp/firstPartyServerIds.js";
import { logForDiagnosticsNoPII } from "../../utils/diagLogs.js";
import { logError } from "../../utils/log.js";
import { isEnvTruthy } from "../../utils/envUtils.js";
import { getClaudeConfigDir } from "../../utils/markdownConfigLoader.js";
import { deferInit } from "../../../runtime/deferred-init.js";

//@ chunk-0yw3taqg.js:660516-660557 placement
var REMOTE_TOOLS_ANNOUNCE_ENTRYPOINTS; // deferred: uses GIT_CREDENTIAL_ENTRYPOINTS (../remoteIO/workerAuth.js) of its import cycle while loading; runs once the cycle is complete
deferInit("chunk-0yw3taqg.js:660516", () => {
  REMOTE_TOOLS_ANNOUNCE_ENTRYPOINTS = new Set([...GIT_CREDENTIAL_ENTRYPOINTS, "remote_mobile"]);
});
//@ chunk-0yw3taqg.js:660557-660935 placement
function admitRemoteToolsAnnounce(session) {
  if (
    !session.sdkUrl ||
    !session.remoteSessionId ||
    (session.environmentKind !== undefined && !session.grantedRunnerChild)
  )
    return {
      admitted: false,
      reason: "not_managed_cloud_worker",
    };
  if (session.entrypoint !== undefined && !REMOTE_TOOLS_ANNOUNCE_ENTRYPOINTS.has(session.entrypoint))
    return {
      admitted: false,
      reason: "entrypoint",
    };
  if (session.channelOff)
    return {
      admitted: false,
      reason: "session_channel_off",
    };
  if (session.hermetic)
    return {
      admitted: false,
      reason: "hermetic",
    };
  return {
    admitted: true,
  };
}
//@ chunk-0yw3taqg.js:660935-661714 placement
/**
 * 处理 remote_tools_announce：仅托管云 worker 准入，转发到会话通道工具服务。
 */
function createRemoteToolsAnnounceHandler(deps, options) {
  let pending;
  return async (request, extra) => {
    if (!deps.admitted) {
      logFeatureBad("remote_tools_announce", deps.reason);
      extra({
        kind: "error",
        error: `remote_tools_disabled: ${deps.reason}`,
      });
      return;
    }
    try {
      pending ??= import("../../remote/tools/createRemoteToolsAnnounceWorker.lazy.js")
        .then(async (result) =>
          result.createRemoteToolsAnnounceWorker(
            await result.productionRemoteToolsAnnounceDeps({
              workerEpoch: options.workerEpoch,
              toolState: options.toolState,
              sender: options.sender,
              bridgeServer: () => {
                let found = options
                  .mcpClients()
                  .find((client) => client.name === REMOTE_DEVICES && client.config.scope === "dynamic");
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
          pending = undefined;
          throw error;
        });
      extra(await (await pending).handle(request));
    } catch (error) {
      logForDiagnosticsNoPII("warn", "remote_tools_announce_handler_failed", {});
      logError(error);
      logFeatureBad("remote_tools_announce", "internal_error");
      extra({
        kind: "error",
        error: "remote_tools_not_ready: internal_error; retry",
      });
    }
  };
}
//@ chunk-0yw3taqg.js:661805-661862 placement (2.1.88 match: findValidClaudeAlias, 0.751)
function safeHomedir() {
  try {
    return userInfo().homedir;
  } catch {
    return homedir();
  }
}
//@ chunk-0yw3taqg.js:661862-661964 placement (2.1.88 match: getProjectDirsUpToHome, 0.875)
function getProjectDirsUpToHome(subdir, cwd) {
  let homeDir = subdir.HOME !== undefined && isAbsolute(subdir.HOME) ? subdir.HOME : cwd();
  return join(homeDir, ".claude").normalize("NFC");
}
//@ chunk-0yw3taqg.js:661964-662613 placement
function decideWorkerDirSync(host) {
  if (host.admittedAs === null)
    return {
      start: false,
      reason: "not_admitted",
    };
  if (host.admittedAs === "runner_child")
    return {
      start: false,
      reason: "self_hosted_runner",
    };
  if (!host.dirSyncStarts)
    return {
      start: false,
      reason: "file_store_worker_off",
    };
  let subdir = host.spawnEnv();
  if (isEnvTruthy(subdir.CLAUDE_CODE_DISABLE_HOME_SETTINGS_SEED))
    return {
      start: false,
      reason: "disabled",
    };
  if (host.hermetic)
    return {
      start: false,
      reason: "hermetic",
    };
  let CLAUDE_CONFIG_DIR = subdir.CLAUDE_CONFIG_DIR;
  if (host.admittedAs === "managed" && CLAUDE_CONFIG_DIR !== undefined)
    return {
      start: false,
      reason: "config_dir",
    };
  let projectDirsUpToHome = getProjectDirsUpToHome(subdir, host.accountHome);
  if (host.currentConfigHome() !== projectDirsUpToHome)
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
//@ chunk-0yw3taqg.js:662613-662639 placement
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
