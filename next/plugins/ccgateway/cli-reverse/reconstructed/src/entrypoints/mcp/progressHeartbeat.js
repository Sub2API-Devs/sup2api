/**
 * entrypoints/mcp/progressHeartbeat.ts
 *
 * 2.1.316 新增：mcp serve 进度心跳。
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * new in 2.1.318 (2.1.88 has no file at this path)
 * pieces: chunk-aw801t9e.js (8)
 * attribution: placement 8
 * (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.
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
import { deferInit } from "../../../runtime/deferred-init.js";

//@ chunk-aw801t9e.js:1719-1732 placement
var HEARTBEAT_INTERVAL_MS = 30000;
//@ chunk-aw801t9e.js:1732-2145 placement
/**
 * 为带 progressToken 的 MCP 工具调用启动进度心跳：每隔固定间隔发送 notifications/progress（"Running for Ns"），progress 单调递增；返回 {report, [Symbol.dispose]}，dispose 时停止计时器。
 */
function startProgressHeartbeat(progressToken, sendNotification, intervalMs = HEARTBEAT_INTERVAL_MS) {
  if (progressToken === undefined)
    return {
      report: undefined,
      [Symbol.dispose]() {},
    };
  let ticks = 0;
  let lastProgress = 0;
  let sendProgress = (progress, message) => {
    lastProgress = progress > lastProgress ? progress : lastProgress + 0.001;
    return sendNotification({
      method: "notifications/progress",
      params: {
        progressToken,
        progress: lastProgress,
        message,
      },
    });
  };
  let interval = setInterval(() => {
    ticks += 1;
    let elapsedSeconds = (ticks * intervalMs) / 1000;
    sendProgress(elapsedSeconds, `Running for ${elapsedSeconds}s`).catch((error) => {
      logForDebugging(`MCP server: progress heartbeat not sent: ${errorMessage(error)}`);
    });
  }, intervalMs);
  interval.unref?.();
  return {
    report: (message) => sendProgress(0, message),
    [Symbol.dispose]() {
      clearInterval(interval);
    },
  };
}
//@ chunk-aw801t9e.js:2306-2377 placement
/**
 * 导出值：同一声明里的多个绑定：MAX_HEARTBEAT_BYTES（4096）；HEARTBEAT_SETTINGS_SOURCES（userSettings 加已知来源）。
 */
var CLAUDECODE_REPOHOOKSSTAMP; // deferred: uses EDITABLE_SETTING_SOURCES (../../utils/settings/constants.js) of its import cycle while loading; runs once the cycle is complete
var MAX_HEARTBEAT_BYTES;
var HEARTBEAT_SETTINGS_SOURCES;
deferInit("chunk-aw801t9e.js:2306", () => {
  CLAUDECODE_REPOHOOKSSTAMP = "claudecode/repoHooksStamp";
  MAX_HEARTBEAT_BYTES = 4096;
  HEARTBEAT_SETTINGS_SOURCES = ["userSettings", ...REPO_DIR_SETTING_SOURCE_LIST];
});
//@ chunk-aw801t9e.js:2377-2623 placement
/**
 * 对项目/本地等设置文件取 stat（ino、size、ctimeNs）拼成指纹字符串，文件不可访问记 "-"，用于检测仓库设置是否变化。
 */
async function getSettingsFilesStamp() {
  let paths = [
    ...HEARTBEAT_SETTINGS_SOURCES.map(getSettingsFilePathForSource),
    getLegacyLocalSettingsFilePath(),
  ];
  return (
    await Promise.all(
      paths.map(async (filePath) => {
        if (filePath === undefined) return "-";
        try {
          let { ino, size, ctimeNs } = await stat(filePath, {
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
//@ chunk-aw801t9e.js:2623-2646 placement
var heartbeatStoreSlot; // deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
deferInit("chunk-aw801t9e.js:2623", () => {
  heartbeatStoreSlot = new HostScoped(() => ({}));
});
//@ chunk-aw801t9e.js:2646-3081 placement
/**
 * mcp serve 订阅设置变更：项目设置源（或调用方要求时任意源）变化时调用 tell 通知调用方，并记录 mcp_serve_repo_settings_notice 遥测；只订阅一次。
 */
function watchRepoSettingsChanges(host, tell, isAnySource = () => false) {
  let store = heartbeatStoreSlot.of(host);
  store.tell = tell;
  if (store.stop !== undefined) return;
  let unsubscribe = settingsChangeDetector.subscribe((source) => {
    if (!isAnySource() && !HEARTBEAT_SETTINGS_SOURCES.some((watched) => watched === source)) return;
    if (store.tell === undefined) {
      logFeatureSad("mcp_serve_repo_settings_notice", "no_caller");
      return;
    }
    store
      .tell()
      .then(() => logFeatureOk("mcp_serve_repo_settings_notice"))
      .catch((error) => {
        logFeatureSad("mcp_serve_repo_settings_notice", "not_sent");
        logForDebugging(`repo settings notice not sent: ${errorMessage(error)}`);
      });
  });
  store.stop = () => {
    unsubscribe();
    store.stop = undefined;
  };
  settingsChangeDetector.initialize(async () => false);
}
//@ chunk-aw801t9e.js:3081-3141 placement
function setHeartbeatProgress(host, tell) {
  let store = heartbeatStoreSlot.of(host);
  if (store.stop !== undefined) store.tell = tell;
}
//@ chunk-aw801t9e.js:3141-3201 placement
function clearHeartbeatProgress(host, tell) {
  let store = heartbeatStoreSlot.of(host);
  if (store.tell === tell) store.tell = undefined;
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
