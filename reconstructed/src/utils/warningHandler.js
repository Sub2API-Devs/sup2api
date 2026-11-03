/**
 * utils/warningHandler.ts
 *
 * Node 进程 warning 处理：initializeWarningHandler 屏蔽已知噪声、限次记录；isRunningFromBuildDirectory 判断开发构建
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/utils/warningHandler.ts
 * pieces: chunk-shkzs7rp.js (4)
 * attribution: affinity 1, fingerprint 2, layout 1
 */
import { win32, posix } from "path";
import { types } from "util";
import { getPlatform } from "./platform.js";
import { Pf } from "./untrustedValues.js";
import { logEvent } from "../services/analytics/index.js";
import { sanitizeClassName } from "./errors.js";
import { lit } from "../services/analytics/safeMetadata.js";
import { env } from "./env.js";
import { logForDebugging } from "./debug.js";

//@ chunk-shkzs7rp.js:26694-26706 affinity
var MAX_WARNING_KEYS = 1000;
/**
 * 是否从开发构建目录运行（argv[1]/execPath 含 /build-ant/、/build-external/ 等）。
 */
//@ chunk-shkzs7rp.js:26706-27010 fingerprint = isRunningFromBuildDirectory (1)
function isRunningFromBuildDirectory() {
  let n = process.argv[1] || "",
    e = process.execPath || process.argv[0] || "";
  if (getPlatform() === "windows")
    ((n = n.split(win32.sep).join(posix.sep)), (e = e.split(win32.sep).join(posix.sep)));
  let pathsToCheck = [n, e],
    buildDirs = ["/build-ant/", "/build-external/", "/build-external-native/", "/build-ant-native/"];
  return pathsToCheck.some((path) => buildDirs.some((dir) => path.includes(dir)));
}
//@ chunk-shkzs7rp.js:27010-27105 layout
var IGNORED_WARNING_PATTERNS = [
  /MaxListenersExceededWarning.*AbortSignal/,
  /MaxListenersExceededWarning.*EventTarget/,
];
/**
 * 接管 process 'warning' 事件：非开发构建时移除默认监听并禁止默认输出，按名称去重上报 tengu_node_warning，忽略 MaxListenersExceededWarning（AbortSignal/EventTarget）。
 */
//@ chunk-shkzs7rp.js:27105-27853 fingerprint = initializeWarningHandler (0.629)
function initializeWarningHandler() {
  let n = new Map();
  if (!isRunningFromBuildDirectory())
    (process.removeAllListeners("warning"), (process.noProcessWarnings = !0));
  let S = (warning) => {
    try {
      if (Pf(warning) || !types.isNativeError(warning)) return;
      let ownPropertyDescriptor = Object.getOwnPropertyDescriptor(warning, "message"),
        s =
          ownPropertyDescriptor && typeof ownPropertyDescriptor.value === "string"
            ? ownPropertyDescriptor.value
            : "",
        ownPropertyDescriptor_2 = Object.getOwnPropertyDescriptor(warning, "name"),
        E =
          ownPropertyDescriptor_2 && typeof ownPropertyDescriptor_2.value === "string"
            ? ownPropertyDescriptor_2.value
            : "Error",
        warningKey = `${E}: ${s.slice(0, 50)}`,
        X = n.get(warningKey) || 0;
      if (n.has(warningKey) || n.size < MAX_WARNING_KEYS) n.set(warningKey, X + 1);
      let oe = `${E}: ${s}`,
        any = IGNORED_WARNING_PATTERNS.some((Me) => Me.test(oe));
      if (
        (logEvent("tengu_node_warning", {
          is_internal: any ? 1 : 0,
          occurrence_count: X + 1,
          classname: sanitizeClassName(E) ?? lit("Error"),
          ...!1,
        }),
        env.CLAUDE_DEBUG)
      )
        logForDebugging(`${any ? "[Internal Warning]" : "[Warning]"} ${E}: ${s}`, { level: "warn" });
    } catch {}
  };
  return (
    process.on("warning", S),
    {
      uninstall() {
        process.removeListener("warning", S);
      },
    }
  );
}

export { initializeWarningHandler };
