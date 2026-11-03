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
var He = 30000;
/**
 * 为带 progressToken 的 MCP 工具调用启动进度心跳：每隔固定间隔发送 notifications/progress（"Running for Ns"），progress 单调递增；返回 {report, [Symbol.dispose]}，dispose 时停止计时器。
 */
//@ chunk-hjesqqfw.js:1698-2111 placement
function startProgressHeartbeat(s, S, o = He) {
  if (s === void 0) return { report: void 0, [Symbol.dispose]() {} };
  let a = 0,
    p = 0,
    P = (R, E) => (
      (p = R > p ? R : p + 0.001),
      S({ method: "notifications/progress", params: { progressToken: s, progress: p, message: E } })
    ),
    v = setInterval(() => {
      a += 1;
      let R = (a * o) / 1000;
      P(R, `Running for ${R}s`).catch((E) => {
        logForDebugging(`MCP server: progress heartbeat not sent: ${errorMessage(E)}`);
      });
    }, o);
  return (
    v.unref?.(),
    {
      report: (R) => P(0, R),
      [Symbol.dispose]() {
        clearInterval(v);
      },
    }
  );
}
//@ chunk-hjesqqfw.js:2147-2218 placement
var CLAUDECODE_REPOHOOKSSTAMP = "claudecode/repoHooksStamp",
  Zks = 4096,
  fZt = ["userSettings", ...REPO_DIR_SETTING_SOURCE_LIST];
/**
 * 对项目/本地等设置文件取 stat（ino、size、ctimeNs）拼成指纹字符串，文件不可访问记 "-"，用于检测仓库设置是否变化。
 */
//@ chunk-hjesqqfw.js:2218-2464 placement
async function getSettingsFilesStamp() {
  let s = [...fZt.map(getSettingsFilePathForSource), getLegacyLocalSettingsFilePath()];
  return (
    await Promise.all(
      s.map(async (o) => {
        if (o === void 0) return "-";
        try {
          let { ino: ino, size: size, ctimeNs: ctimeNs } = await stat(o, { bigint: !0 });
          return `${ino}:${size}:${ctimeNs}`;
        } catch (error) {
          return isFsInaccessible(error) ? "-" : `?${getErrnoCode(error)}`;
        }
      }),
    )
  ).join("|");
}
//@ chunk-hjesqqfw.js:2464-2487 placement
var le = new HostScoped(() => ({}));
/**
 * mcp serve 订阅设置变更：项目设置源（或调用方要求时任意源）变化时调用 tell 通知调用方，并记录 mcp_serve_repo_settings_notice 遥测；只订阅一次。
 */
//@ chunk-hjesqqfw.js:2487-2922 placement
function watchRepoSettingsChanges(s, S, o = () => !1) {
  let of = le.of(s);
  if (((of.tell = S), of.stop !== void 0)) return;
  let subscribe = settingsChangeDetector.subscribe((P) => {
    if (!o() && !fZt.some((R) => R === P)) return;
    if (of.tell === void 0) {
      logFeatureSad("mcp_serve_repo_settings_notice", "no_caller");
      return;
    }
    of.tell()
      .then(() => logFeatureOk("mcp_serve_repo_settings_notice"))
      .catch((R) => {
        (logFeatureSad("mcp_serve_repo_settings_notice", "not_sent"),
          logForDebugging(`repo settings notice not sent: ${errorMessage(R)}`));
      });
  });
  ((of.stop = () => {
    (subscribe(), (of.stop = void 0));
  }),
    settingsChangeDetector.initialize(async () => !1));
}
//@ chunk-hjesqqfw.js:2922-2982 placement
function Re(s, S) {
  let of = le.of(s);
  if (of.stop !== void 0) of.tell = S;
}
//@ chunk-hjesqqfw.js:2982-3042 placement
function Ee(s, S) {
  let of = le.of(s);
  if (of.tell === S) of.tell = void 0;
}

export {
  CLAUDECODE_REPOHOOKSSTAMP,
  getSettingsFilesStamp,
  Re,
  Ee,
  startProgressHeartbeat,
  fZt,
  Zks,
  watchRepoSettingsChanges,
};
