/**
 * entrypoints/mcp/progressHeartbeat.ts
 *
 * 2.1.316 新增：mcp serve 进度心跳。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-hjesqqfw.js (8)
 * attribution: placement 8
 */
import { stat } from "fs/promises";
import { logForDebugging } from "../../utils/debug.js";
import { errorMessage, isFsInaccessible, getErrnoCode } from "../../utils/errors.js";
import { REPO_DIR_SETTING_SOURCE_LIST } from "../../utils/settings/constants.js";
import {
  getSettingsFilePathForSource,
  getLegacyLocalSettingsFilePath,
} from "../../utils/settings/settings.js";
import { HostScoped } from "../../utils/hostScoped.js";
import { settingsChangeDetector } from "../../utils/settings/changeDetector.js";
import { logFeatureSad, logFeatureOk } from "../../services/analytics/featureTelemetry.js";

//@ chunk-hjesqqfw.js:1685-1698 placement
var HEARTBEAT_INTERVAL_MS = 30000;
//@ chunk-hjesqqfw.js:1698-2111 placement
/**
 * 为带 progressToken 的 MCP 工具调用启动进度心跳：每隔固定间隔发送 notifications/progress（"Running for Ns"），progress 单调递增；返回 {report, [Symbol.dispose]}，dispose 时停止计时器。
 */
function startProgressHeartbeat(progressToken, sendNotification, o = HEARTBEAT_INTERVAL_MS) {
  if (progressToken === undefined)
    return {
      report: undefined,
      [Symbol.dispose]() {},
    };
  let a = 0;
  let p = 0;
  let P = (R, message) => {
    p = R > p ? R : p + 0.001;
    return sendNotification({
      method: "notifications/progress",
      params: {
        progressToken,
        progress: p,
        message,
      },
    });
  };
  let interval = setInterval(() => {
    a += 1;
    let R = (a * o) / 1000;
    P(R, `Running for ${R}s`).catch((error) => {
      logForDebugging(`MCP server: progress heartbeat not sent: ${errorMessage(error)}`);
    });
  }, o);
  interval.unref?.();
  return {
    report: (message) => P(0, message),
    [Symbol.dispose]() {
      clearInterval(interval);
    },
  };
}
//@ chunk-hjesqqfw.js:2147-2218 placement
/**
 * 导出值：同一声明里的多个绑定：MAX_HEARTBEAT_BYTES（4096）；HEARTBEAT_SETTINGS_SOURCES（userSettings 加已知来源）。
 */
var CLAUDECODE_REPOHOOKSSTAMP = "claudecode/repoHooksStamp";
var MAX_HEARTBEAT_BYTES = 4096;
var HEARTBEAT_SETTINGS_SOURCES = ["userSettings", ...REPO_DIR_SETTING_SOURCE_LIST];
//@ chunk-hjesqqfw.js:2218-2464 placement
/**
 * 对项目/本地等设置文件取 stat（ino、size、ctimeNs）拼成指纹字符串，文件不可访问记 "-"，用于检测仓库设置是否变化。
 */
async function getSettingsFilesStamp() {
  let s = [...HEARTBEAT_SETTINGS_SOURCES.map(getSettingsFilePathForSource), getLegacyLocalSettingsFilePath()];
  return (
    await Promise.all(
      s.map(async (o) => {
        if (o === undefined) return "-";
        try {
          let { ino, size, ctimeNs } = await stat(o, {
            bigint: true,
          });
          return `${ino}:${size}:${ctimeNs}`;
        } catch (error) {
          return isFsInaccessible(error) ? "-" : `?${getErrnoCode(error)}`;
        }
      }),
    )
  ).join("|");
}
//@ chunk-hjesqqfw.js:2464-2487 placement
var heartbeatStoreSlot = new HostScoped(() => ({}));
//@ chunk-hjesqqfw.js:2487-2922 placement
/**
 * mcp serve 订阅设置变更：项目设置源（或调用方要求时任意源）变化时调用 tell 通知调用方，并记录 mcp_serve_repo_settings_notice 遥测；只订阅一次。
 */
function watchRepoSettingsChanges(host, tell, o = () => false) {
  let a = heartbeatStoreSlot.of(host);
  a.tell = tell;
  if (a.stop !== undefined) return;
  let p = settingsChangeDetector.subscribe((P) => {
    if (!o() && !HEARTBEAT_SETTINGS_SOURCES.some((R) => R === P)) return;
    if (a.tell === undefined) {
      logFeatureSad("mcp_serve_repo_settings_notice", "no_caller");
      return;
    }
    a.tell()
      .then(() => logFeatureOk("mcp_serve_repo_settings_notice"))
      .catch((error) => {
        logFeatureSad("mcp_serve_repo_settings_notice", "not_sent");
        logForDebugging(`repo settings notice not sent: ${errorMessage(error)}`);
      });
  });
  a.stop = () => {
    p();
    a.stop = undefined;
  };
  settingsChangeDetector.initialize(async () => false);
}
//@ chunk-hjesqqfw.js:2922-2982 placement
function setHeartbeatProgress(host, tell) {
  let o = heartbeatStoreSlot.of(host);
  if (o.stop !== undefined) o.tell = tell;
}
//@ chunk-hjesqqfw.js:2982-3042 placement
function clearHeartbeatProgress(host, S) {
  let o = heartbeatStoreSlot.of(host);
  if (o.tell === S) o.tell = undefined;
}
export {
  CLAUDECODE_REPOHOOKSSTAMP,
  getSettingsFilesStamp,
  setHeartbeatProgress,
  clearHeartbeatProgress,
  startProgressHeartbeat,
  HEARTBEAT_SETTINGS_SOURCES,
  MAX_HEARTBEAT_BYTES,
  watchRepoSettingsChanges,
};
