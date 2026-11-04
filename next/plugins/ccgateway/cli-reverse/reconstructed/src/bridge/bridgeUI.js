/**
 * bridge/bridgeUI.ts
 *
 * claude remote-control 终端界面：横幅、连接 URL 与二维码、状态行（idle/attached/reconnecting/failed）、会话列表与工具活动
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/bridge/bridgeUI.ts
 * pieces: chunk-wbbfk060.js (2)
 * attribution: fingerprint 2
 */
import { bunStringWidth } from "../ink/stringWidth.js";
import { toString } from "../../vendor/qrcode/lib/server.js";
import { logForDebugging } from "../utils/debug.js";
import { BRIDGE_SPINNER_FRAMES, BRIDGE_READY_INDICATOR } from "../constants/figures.js";
import { sequential } from "../utils/sequential.js";
import { truncateToWidth, formatDuration } from "../utils/format.js";
import {
  wrapWithOsc8Link,
  BRIDGE_STATUS_CONSTANTS,
  buildIdleFooterText,
  buildActiveFooterText,
  PROJECTS_HINT_TEXT,
  buildBridgeConnectUrl,
  timestamp,
} from "./bridgeStatusUtil.js";
import { plural, sanitizeSessionTitle } from "../utils/stringUtils.js";
import { getRemoteSessionUrl } from "../constants/product.js";

//@ chunk-wbbfk060.js:13677-13732 fingerprint (2.1.88 match: QR_OPTIONS, 1)
var QR_OPTIONS = {
  type: "utf8",
  errorCorrectionLevel: "L",
  small: true,
};
//@ chunk-wbbfk060.js:13732-19273 fingerprint (2.1.88 match: createBridgeLogger, 0.801)
/**
 * 创建终端日志/状态显示器：printBanner 打印连接地址与 QR，logSession*\/logStatus 输出事件，updateIdleStatus/updateReconnectingStatus/updateSessionStatus 重绘状态行（ANSI 回退清除），支持多会话列表与 spawn 模式显示。
 */
function createBridgeLogger(options) {
  let write = options.write ?? ((chunk) => process.stdout.write(chunk));
  let verbose = options.verbose;
  let projectsHint = options.projectsHint ?? (() => false);
  let statusLineCount = 0;
  let currentState = "idle";
  let currentStateText = "Ready";
  let reconnectInfo = null;
  let repoName = "";
  let branch = "";
  let debugLogPath = "";
  let connectUrl = "";
  let cachedIngressUrl = "";
  let activeSessionUrl = null;
  let qrLines = [];
  let qrVisible = false;
  let qrUrl = "";
  let lastToolSummary = null;
  let lastToolTime = 0;
  let sessionActive = 0;
  let sessionMax = 1;
  let spawnModeDisplay = null;
  let cloudStatus = null;
  let spawnMode = "single-session";
  let sessionDisplayInfo = new Map();
  let connectingTimer = null;
  let connectingTick = 0;
  function countVisualLines(text) {
    let cols = process.stdout.columns || 80;
    let count = 0;
    for (let logical of text.split(`
`)) {
      if (logical.length === 0) {
        count++;
        continue;
      }
      let width = bunStringWidth(logical);
      count += Math.max(1, Math.ceil(width / cols));
    }
    if (
      text.endsWith(`
`)
    )
      count--;
    return count;
  }
  function writeStatus(text) {
    write(text);
    statusLineCount += countVisualLines(text);
  }
  function clearStatusLines() {
    if (statusLineCount <= 0) return;
    write(`\x1B[${statusLineCount}A`);
    write("\x1B[J");
    statusLineCount = 0;
  }
  function printLog(line) {
    clearStatusLines();
    write(line);
    if (currentState === "reconnecting" && reconnectInfo)
      renderReconnecting(reconnectInfo.delayStr, reconnectInfo.elapsedStr);
    else renderStatusLine();
  }
  function regenerateQr(url) {
    if (url === qrUrl) return;
    qrUrl = url;
    toString(url, QR_OPTIONS)
      .then((lines) => {
        qrLines = lines
          .split(
            `
`,
          )
          .filter((line) => line.length > 0);
        renderStatusLine();
      })
      .catch((e) => {
        logForDebugging(`QR code generation failed: ${e}`, {
          level: "error",
        });
      });
  }
  function renderConnectingLine() {
    clearStatusLines();
    let frame = BRIDGE_SPINNER_FRAMES[connectingTick % BRIDGE_SPINNER_FRAMES.length];
    let suffix = "";
    if (repoName) suffix += sequential.dim(" \xB7 ") + sequential.dim(repoName);
    if (branch) suffix += sequential.dim(" \xB7 ") + sequential.dim(branch);
    writeStatus(`${sequential.yellow(frame)} ${sequential.yellow("Connecting")}${suffix}
`);
  }
  function startConnecting() {
    stopConnecting();
    renderConnectingLine();
    connectingTimer = setInterval(() => {
      connectingTick++;
      renderConnectingLine();
    }, 150);
  }
  function stopConnecting() {
    if (connectingTimer) {
      clearInterval(connectingTimer);
      connectingTimer = null;
    }
  }
  function renderReconnecting(delayStr, elapsedStr) {
    if (qrVisible)
      for (let line of qrLines)
        writeStatus(`${sequential.dim(line)}
`);
    let frame = BRIDGE_SPINNER_FRAMES[connectingTick % BRIDGE_SPINNER_FRAMES.length];
    connectingTick++;
    writeStatus(`${sequential.yellow(frame)} ${sequential.yellow("Reconnecting")} ${sequential.dim("\xB7")} ${sequential.dim(`retrying in ${delayStr}`)} ${sequential.dim("\xB7")} ${sequential.dim(`disconnected ${elapsedStr}`)}
`);
  }
  function renderStatusLine() {
    if (currentState === "reconnecting") return;
    clearStatusLines();
    let isIdle = currentState === "idle";
    if (qrVisible)
      for (let line of qrLines)
        writeStatus(`${sequential.dim(line)}
`);
    let indicator = BRIDGE_READY_INDICATOR;
    let indicatorColor = isIdle ? sequential.green : sequential.cyan;
    let stateText = (isIdle ? sequential.green : sequential.cyan)(currentStateText);
    let suffix = "";
    if (repoName) suffix += sequential.dim(" \xB7 ") + sequential.dim(repoName);
    if (branch && spawnMode !== "worktree") suffix += sequential.dim(" \xB7 ") + sequential.dim(branch);
    writeStatus(`${indicatorColor(indicator)} ${stateText}${suffix}
`);
    if (sessionMax > 1) {
      let modeHint =
        spawnMode === "worktree"
          ? "New sessions will be created in an isolated worktree"
          : "New sessions will be created in the current directory";
      writeStatus(`    ${sequential.dim(`Capacity: ${sessionActive}/${sessionMax} \xB7 ${modeHint}`)}
`);
      for (let [, info] of sessionDisplayInfo) {
        let titleText = info.title ? truncateToWidth(info.title, 35) : sequential.dim("Attached");
        let titleLinked = wrapWithOsc8Link(titleText, info.url);
        let act = info.activity;
        let activitySuffix =
          act && act.type !== "result" && act.type !== "error"
            ? sequential.dim(` ${truncateToWidth(act.summary, 40)}`)
            : "";
        writeStatus(`    ${titleLinked}${activitySuffix}
`);
      }
    }
    if (sessionMax === 1) {
      let capacityText =
        spawnMode === "single-session"
          ? "Single session \xB7 exits when complete"
          : spawnMode === "worktree"
            ? `Capacity: ${sessionActive}/1 \xB7 New sessions will be created in an isolated worktree`
            : `Capacity: ${sessionActive}/1 \xB7 New sessions will be created in the current directory`;
      writeStatus(`    ${sequential.dim(capacityText)}
`);
    }
    if (cloudStatus) {
      let { text, unattended } = cloudStatus;
      writeStatus(`    ${unattended ? sequential.yellow(text) : sequential.dim(text)}
`);
    }
    if (sessionMax === 1 && !isIdle && lastToolSummary && Date.now() - lastToolTime < BRIDGE_STATUS_CONSTANTS)
      writeStatus(`  ${sequential.dim(truncateToWidth(lastToolSummary, 60))}
`);
    let url = activeSessionUrl ?? connectUrl;
    if (url) {
      writeStatus(`
`);
      let footerText = isIdle ? buildIdleFooterText(url) : buildActiveFooterText(url);
      let qrHint = qrVisible
        ? sequential.dim.italic("space to hide QR code")
        : sequential.dim.italic("space to show QR code");
      let toggleHint = spawnModeDisplay ? sequential.dim.italic(" \xB7 w to toggle spawn mode") : "";
      writeStatus(`${sequential.dim(footerText)}
`);
      if ((isIdle || sessionMax > 1) && projectsHint())
        writeStatus(`${sequential.dim(PROJECTS_HINT_TEXT)}
`);
      writeStatus(`${qrHint}${toggleHint}
`);
    }
  }
  return {
    printBanner(config, environmentId) {
      cachedIngressUrl = config.sessionIngressUrl;
      connectUrl = buildBridgeConnectUrl(environmentId, cachedIngressUrl);
      regenerateQr(connectUrl);
      if (verbose)
        write(
          sequential.dim("Remote Control") +
            ` v${
              {
                ISSUES_EXPLAINER: "report the issue at https://github.com/anthropics/claude-code/issues",
                PACKAGE_URL: "@anthropic-ai/claude-code",
                README_URL: "https://code.claude.com/docs/en/overview",
                VERSION: "2.1.316",
                FEEDBACK_CHANNEL: "https://github.com/anthropics/claude-code/issues",
                BUILD_TIME: "2026-10-30T23:28:13Z",
                GIT_SHA: "cd7ceb459c6864567b16a11f60101b24421475c1",
                HOOKS_WORKER_URL:
                  import.meta.dir + "/./src/plugins/functionHooks/hooks-worker/hooks-worker.js",
                DD_SOURCEMAP_GROUP: "default",
              }.VERSION
            }
`,
        );
      if (verbose) {
        if (config.spawnMode !== "single-session") {
          write(
            sequential.dim("Spawn mode: ") +
              `${config.spawnMode}
`,
          );
          write(
            sequential.dim("Max concurrent sessions: ") +
              `${config.maxSessions}
`,
          );
        }
        write(
          sequential.dim("Environment ID: ") +
            `${environmentId}
`,
        );
      }
      if (config.livePreviewPorts && config.livePreviewPorts.size > 0) {
        let joined = [...config.livePreviewPorts]
          .sort((leftPort, rightPort) => leftPort - rightPort)
          .join(", ");
        write(
          sequential.yellow(`\u26A0  Live preview enabled: 127.0.0.1 ${plural(config.livePreviewPorts.size, "port")} ${joined} ${config.livePreviewPorts.size > 1 ? "are" : "is"} reachable from this session's livepreview URL while Remote Control is running.
`),
        );
      }
      write(`
`);
      startConnecting();
    },
    logSessionStart(sessionId, prompt) {
      if (verbose) {
        let short = truncateToWidth(prompt, 80);
        printLog(
          sequential.dim(`[${timestamp()}]`) +
            ` Session started: ${sequential.white(`"${short}"`)} (${sequential.dim(sessionId)})
`,
        );
      }
    },
    logSessionComplete(sessionId, durationMs) {
      printLog(
        sequential.dim(`[${timestamp()}]`) +
          ` Session ${sequential.green("completed")} (${formatDuration(durationMs)}) ${sequential.dim(sessionId)}
`,
      );
    },
    logSessionFailed(sessionId, error) {
      printLog(
        sequential.dim(`[${timestamp()}]`) +
          ` Session ${sequential.red("failed")}: ${error} ${sequential.dim(sessionId)}
`,
      );
    },
    logStatus(message) {
      printLog(
        sequential.dim(`[${timestamp()}]`) +
          ` ${message}
`,
      );
    },
    logVerbose(message) {
      if (verbose)
        printLog(
          sequential.dim(`[${timestamp()}] ${message}`) +
            `
`,
        );
    },
    logError(message) {
      printLog(
        sequential.red(`[${timestamp()}] Error: ${message}`) +
          `
`,
      );
    },
    logWarning(message) {
      printLog(
        sequential.yellow(`[${timestamp()}] Warning: ${message}`) +
          `
`,
      );
    },
    logReconnected(disconnectedMs) {
      reconnectInfo = null;
      printLog(
        sequential.dim(`[${timestamp()}]`) +
          ` ${sequential.green("Reconnected")} after ${formatDuration(disconnectedMs)}
`,
      );
    },
    setRepoInfo(repo, branchName) {
      repoName = repo;
      branch = branchName;
    },
    setDebugLogPath(path) {
      debugLogPath = path;
    },
    updateIdleStatus() {
      stopConnecting();
      currentState = "idle";
      currentStateText = "Ready";
      lastToolSummary = null;
      lastToolTime = 0;
      activeSessionUrl = null;
      regenerateQr(connectUrl);
      renderStatusLine();
    },
    setAttached(sessionId) {
      stopConnecting();
      currentState = "attached";
      currentStateText = "Connected";
      lastToolSummary = null;
      lastToolTime = 0;
      if (sessionMax <= 1) {
        activeSessionUrl = getRemoteSessionUrl(sessionId, cachedIngressUrl);
        regenerateQr(activeSessionUrl);
      }
      renderStatusLine();
    },
    updateReconnectingStatus(delayStr, elapsedStr) {
      stopConnecting();
      clearStatusLines();
      currentState = "reconnecting";
      reconnectInfo = {
        delayStr,
        elapsedStr,
      };
      renderReconnecting(delayStr, elapsedStr);
    },
    updateSessionStatus(_sessionId, _elapsed, activity, _trail) {
      if (activity.type === "tool_start") {
        lastToolSummary = activity.summary;
        lastToolTime = Date.now();
      }
      renderStatusLine();
    },
    clearStatus(options) {
      stopConnecting();
      clearStatusLines();
      if (options?.final) reconnectInfo = null;
    },
    setCloudSessionsStatus(status) {
      if (status?.text === cloudStatus?.text && status?.unattended === cloudStatus?.unattended) return;
      cloudStatus = status;
      if (statusLineCount > 0 && connectingTimer === null) renderStatusLine();
    },
    detachTerminal() {
      write = () => {};
    },
    toggleQr() {
      qrVisible = !qrVisible;
      renderStatusLine();
    },
    updateSessionCount(active, max, mode) {
      if (sessionActive === active && sessionMax === max && spawnMode === mode) return;
      sessionActive = active;
      sessionMax = max;
      spawnMode = mode;
    },
    setSpawnModeDisplay(mode) {
      if (spawnModeDisplay === mode) return;
      spawnModeDisplay = mode;
      if (mode) spawnMode = mode;
    },
    addSession(sessionId, url) {
      sessionDisplayInfo.set(sessionId, {
        url,
      });
    },
    updateSessionActivity(sessionId, activity) {
      let info = sessionDisplayInfo.get(sessionId);
      if (!info) return;
      info.activity = activity;
    },
    setSessionTitle(sessionId, title) {
      let info = sessionDisplayInfo.get(sessionId);
      if (!info) return;
      let cleanTitle = sanitizeSessionTitle(title);
      info.title = cleanTitle;
      if (currentState === "reconnecting") return;
      if (sessionMax === 1) {
        currentState = "titled";
        currentStateText = truncateToWidth(cleanTitle, 40);
      }
      renderStatusLine();
    },
    removeSession(sessionId) {
      sessionDisplayInfo.delete(sessionId);
    },
    refreshDisplay() {
      if (currentState === "reconnecting") return;
      renderStatusLine();
    },
  };
}
export { createBridgeLogger };
