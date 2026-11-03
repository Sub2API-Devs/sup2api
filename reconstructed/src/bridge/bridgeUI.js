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

//@ chunk-wbbfk060.js:13677-13732 fingerprint = QR_OPTIONS (1)
var QR_OPTIONS = { type: "utf8", errorCorrectionLevel: "L", small: !0 };
/**
 * 创建终端日志/状态显示器：printBanner 打印连接地址与 QR，logSession*\/logStatus 输出事件，updateIdleStatus/updateReconnectingStatus/updateSessionStatus 重绘状态行（ANSI 回退清除），支持多会话列表与 spawn 模式显示。
 */
//@ chunk-wbbfk060.js:13732-19273 fingerprint = createBridgeLogger (0.801)
function createBridgeLogger(options) {
  let s = options.write ?? ((h) => process.stdout.write(h)),
    verbose = options.verbose,
    P = options.projectsHint ?? (() => !1),
    U = 0,
    currentState = "idle",
    currentStateText = "Ready",
    j = null,
    repoName = "",
    branch = "",
    debugLogPath = "",
    connectUrl = "",
    cachedIngressUrl = "",
    activeSessionUrl = null,
    qrLines = [],
    be = !1,
    Oe = "",
    lastToolSummary = null,
    ve = 0,
    q = 0,
    sessionMax = 1,
    spawnModeDisplay = null,
    X = null,
    spawnMode = "single-session",
    sessionDisplayInfo = new Map(),
    connectingTimer = null,
    ze = 0;
  function countVisualLines(text) {
    let L = process.stdout.columns || 80,
      te = 0;
    for (let logical of text.split(`
`)) {
      if (logical.length === 0) {
        te++;
        continue;
      }
      let width = bunStringWidth(logical);
      te += Math.max(1, Math.ceil(width / L));
    }
    if (
      text.endsWith(`
`)
    )
      te--;
    return te;
  }
  function writeStatus(text) {
    (s(text), (U += countVisualLines(text)));
  }
  function clearStatusLines() {
    if (U <= 0) return;
    (s(`\x1B[${U}A`), s("\x1B[J"), (U = 0));
  }
  function printLog(line) {
    if ((clearStatusLines(), s(line), currentState === "reconnecting" && j)) Re(j.delayStr, j.elapsedStr);
    else renderStatusLine();
  }
  function regenerateQr(url) {
    if (url === Oe) return;
    ((Oe = url),
      toString(url, QR_OPTIONS)
        .then((lines) => {
          ((qrLines = lines
            .split(
              `
`,
            )
            .filter((te) => te.length > 0)),
            renderStatusLine());
        })
        .catch((L) => {
          logForDebugging(`QR code generation failed: ${L}`, { level: "error" });
        }));
  }
  function renderConnectingLine() {
    clearStatusLines();
    let h = BRIDGE_SPINNER_FRAMES[ze % BRIDGE_SPINNER_FRAMES.length],
      suffix = "";
    if (repoName) suffix += sequential.dim(" \xB7 ") + sequential.dim(repoName);
    if (branch) suffix += sequential.dim(" \xB7 ") + sequential.dim(branch);
    writeStatus(`${sequential.yellow(h)} ${sequential.yellow("Connecting")}${suffix}
`);
  }
  function startConnecting() {
    (stopConnecting(),
      renderConnectingLine(),
      (connectingTimer = setInterval(() => {
        (ze++, renderConnectingLine());
      }, 150)));
  }
  function stopConnecting() {
    if (connectingTimer) (clearInterval(connectingTimer), (connectingTimer = null));
  }
  function Re(h, L) {
    if (be)
      for (let je of qrLines)
        writeStatus(`${sequential.dim(je)}
`);
    let te = BRIDGE_SPINNER_FRAMES[ze % BRIDGE_SPINNER_FRAMES.length];
    (ze++,
      writeStatus(`${sequential.yellow(te)} ${sequential.yellow("Reconnecting")} ${sequential.dim("\xB7")} ${sequential.dim(`retrying in ${h}`)} ${sequential.dim("\xB7")} ${sequential.dim(`disconnected ${L}`)}
`));
  }
  function renderStatusLine() {
    if (currentState === "reconnecting") return;
    clearStatusLines();
    let isIdle = currentState === "idle";
    if (be)
      for (let line of qrLines)
        writeStatus(`${sequential.dim(line)}
`);
    let indicator = BRIDGE_READY_INDICATOR,
      te = isIdle ? sequential.green : sequential.cyan,
      we = (isIdle ? sequential.green : sequential.cyan)(currentStateText),
      suffix = "";
    if (repoName) suffix += sequential.dim(" \xB7 ") + sequential.dim(repoName);
    if (branch && spawnMode !== "worktree") suffix += sequential.dim(" \xB7 ") + sequential.dim(branch);
    if (
      (writeStatus(`${te(indicator)} ${we}${suffix}
`),
      sessionMax > 1)
    ) {
      let Fe =
        spawnMode === "worktree"
          ? "New sessions will be created in an isolated worktree"
          : "New sessions will be created in the current directory";
      writeStatus(`    ${sequential.dim(`Capacity: ${q}/${sessionMax} \xB7 ${Fe}`)}
`);
      for (let [, Ie] of sessionDisplayInfo) {
        let st = Ie.title ? truncateToWidth(Ie.title, 35) : sequential.dim("Attached"),
          titleLinked = wrapWithOsc8Link(st, Ie.url),
          act = Ie.activity,
          gt =
            act && act.type !== "result" && act.type !== "error"
              ? sequential.dim(` ${truncateToWidth(act.summary, 40)}`)
              : "";
        writeStatus(`    ${titleLinked}${gt}
`);
      }
    }
    if (sessionMax === 1) {
      let Fe =
        spawnMode === "single-session"
          ? "Single session \xB7 exits when complete"
          : spawnMode === "worktree"
            ? `Capacity: ${q}/1 \xB7 New sessions will be created in an isolated worktree`
            : `Capacity: ${q}/1 \xB7 New sessions will be created in the current directory`;
      writeStatus(`    ${sequential.dim(Fe)}
`);
    }
    if (X) {
      let { text: text, unattended: unattended } = X;
      writeStatus(`    ${unattended ? sequential.yellow(text) : sequential.dim(text)}
`);
    }
    if (sessionMax === 1 && !isIdle && lastToolSummary && Date.now() - ve < BRIDGE_STATUS_CONSTANTS)
      writeStatus(`  ${sequential.dim(truncateToWidth(lastToolSummary, 60))}
`);
    let Ce = activeSessionUrl ?? connectUrl;
    if (Ce) {
      writeStatus(`
`);
      let Fe = isIdle ? buildIdleFooterText(Ce) : buildActiveFooterText(Ce),
        Ie = be
          ? sequential.dim.italic("space to hide QR code")
          : sequential.dim.italic("space to show QR code"),
        st = spawnModeDisplay ? sequential.dim.italic(" \xB7 w to toggle spawn mode") : "";
      if (
        (writeStatus(`${sequential.dim(Fe)}
`),
        (isIdle || sessionMax > 1) && P())
      )
        writeStatus(`${sequential.dim(PROJECTS_HINT_TEXT)}
`);
      writeStatus(`${Ie}${st}
`);
    }
  }
  return {
    printBanner(h, L) {
      if (
        ((cachedIngressUrl = h.sessionIngressUrl),
        (connectUrl = buildBridgeConnectUrl(L, cachedIngressUrl)),
        regenerateQr(connectUrl),
        verbose)
      )
        s(
          sequential.dim("Remote Control") +
            ` v${{ ISSUES_EXPLAINER: "report the issue at https://github.com/anthropics/claude-code/issues", PACKAGE_URL: "@anthropic-ai/claude-code", README_URL: "https://code.claude.com/docs/en/overview", VERSION: "2.1.316", FEEDBACK_CHANNEL: "https://github.com/anthropics/claude-code/issues", BUILD_TIME: "2026-10-30T23:28:13Z", GIT_SHA: "cd7ceb459c6864567b16a11f60101b24421475c1", HOOKS_WORKER_URL: import.meta.dir + "/./src/plugins/functionHooks/hooks-worker/hooks-worker.js", DD_SOURCEMAP_GROUP: "default" }.VERSION}
`,
        );
      if (verbose) {
        if (h.spawnMode !== "single-session")
          (s(
            sequential.dim("Spawn mode: ") +
              `${h.spawnMode}
`,
          ),
            s(
              sequential.dim("Max concurrent sessions: ") +
                `${h.maxSessions}
`,
            ));
        s(
          sequential.dim("Environment ID: ") +
            `${L}
`,
        );
      }
      if (h.livePreviewPorts && h.livePreviewPorts.size > 0) {
        let joined = [...h.livePreviewPorts].sort((je, we) => je - we).join(", ");
        s(
          sequential.yellow(`\u26A0  Live preview enabled: 127.0.0.1 ${plural(h.livePreviewPorts.size, "port")} ${joined} ${h.livePreviewPorts.size > 1 ? "are" : "is"} reachable from this session's livepreview URL while Remote Control is running.
`),
        );
      }
      (s(`
`),
        startConnecting());
    },
    logSessionStart(h, L) {
      if (verbose) {
        let short = truncateToWidth(L, 80);
        printLog(
          sequential.dim(`[${timestamp()}]`) +
            ` Session started: ${sequential.white(`"${short}"`)} (${sequential.dim(h)})
`,
        );
      }
    },
    logSessionComplete(h, L) {
      printLog(
        sequential.dim(`[${timestamp()}]`) +
          ` Session ${sequential.green("completed")} (${formatDuration(L)}) ${sequential.dim(h)}
`,
      );
    },
    logSessionFailed(h, L) {
      printLog(
        sequential.dim(`[${timestamp()}]`) +
          ` Session ${sequential.red("failed")}: ${L} ${sequential.dim(h)}
`,
      );
    },
    logStatus(h) {
      printLog(
        sequential.dim(`[${timestamp()}]`) +
          ` ${h}
`,
      );
    },
    logVerbose(h) {
      if (verbose)
        printLog(
          sequential.dim(`[${timestamp()}] ${h}`) +
            `
`,
        );
    },
    logError(h) {
      printLog(
        sequential.red(`[${timestamp()}] Error: ${h}`) +
          `
`,
      );
    },
    logWarning(h) {
      printLog(
        sequential.yellow(`[${timestamp()}] Warning: ${h}`) +
          `
`,
      );
    },
    logReconnected(h) {
      ((j = null),
        printLog(
          sequential.dim(`[${timestamp()}]`) +
            ` ${sequential.green("Reconnected")} after ${formatDuration(h)}
`,
        ));
    },
    setRepoInfo(h, L) {
      ((repoName = h), (branch = L));
    },
    setDebugLogPath(h) {
      debugLogPath = h;
    },
    updateIdleStatus() {
      (stopConnecting(),
        (currentState = "idle"),
        (currentStateText = "Ready"),
        (lastToolSummary = null),
        (ve = 0),
        (activeSessionUrl = null),
        regenerateQr(connectUrl),
        renderStatusLine());
    },
    setAttached(h) {
      if (
        (stopConnecting(),
        (currentState = "attached"),
        (currentStateText = "Connected"),
        (lastToolSummary = null),
        (ve = 0),
        sessionMax <= 1)
      )
        ((activeSessionUrl = getRemoteSessionUrl(h, cachedIngressUrl)), regenerateQr(activeSessionUrl));
      renderStatusLine();
    },
    updateReconnectingStatus(h, L) {
      (stopConnecting(),
        clearStatusLines(),
        (currentState = "reconnecting"),
        (j = { delayStr: h, elapsedStr: L }),
        Re(h, L));
    },
    updateSessionStatus(h, L, te, je) {
      if (te.type === "tool_start") ((lastToolSummary = te.summary), (ve = Date.now()));
      renderStatusLine();
    },
    clearStatus(h) {
      if ((stopConnecting(), clearStatusLines(), h?.final)) j = null;
    },
    setCloudSessionsStatus(h) {
      if (h?.text === X?.text && h?.unattended === X?.unattended) return;
      if (((X = h), U > 0 && connectingTimer === null)) renderStatusLine();
    },
    detachTerminal() {
      s = () => {};
    },
    toggleQr() {
      ((be = !be), renderStatusLine());
    },
    updateSessionCount(h, L, te) {
      if (q === h && sessionMax === L && spawnMode === te) return;
      ((q = h), (sessionMax = L), (spawnMode = te));
    },
    setSpawnModeDisplay(h) {
      if (spawnModeDisplay === h) return;
      if (((spawnModeDisplay = h), h)) spawnMode = h;
    },
    addSession(h, L) {
      sessionDisplayInfo.set(h, { url: L });
    },
    updateSessionActivity(h, L) {
      let info = sessionDisplayInfo.get(h);
      if (!info) return;
      info.activity = L;
    },
    setSessionTitle(h, L) {
      let info = sessionDisplayInfo.get(h);
      if (!info) return;
      let je = sanitizeSessionTitle(L);
      if (((info.title = je), currentState === "reconnecting")) return;
      if (sessionMax === 1) ((currentState = "titled"), (currentStateText = truncateToWidth(je, 40)));
      renderStatusLine();
    },
    removeSession(h) {
      sessionDisplayInfo.delete(h);
    },
    refreshDisplay() {
      if (currentState === "reconnecting") return;
      renderStatusLine();
    },
  };
}

export { createBridgeLogger };
