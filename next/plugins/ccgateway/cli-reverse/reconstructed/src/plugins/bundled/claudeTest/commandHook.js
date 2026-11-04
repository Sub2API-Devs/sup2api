/**
 * plugins/bundled/claudeTest/commandHook.ts
 *
 * 2.1.316 新增：Claude Test 的 command.run 钩子（/claude-test 命令）与面板刷新循环
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-ae5g0zb5.js (71)
 * attribution: placement 71
 */
import { claudeTestState, RUN_ID_RE, isPlainObjectNonArray } from "./appFacts.js";
import {
  AGENTS_NOT_LOADED_TEXT,
  AGENTS_STILL_LOADING_TEXT,
  HELPER_NOT_READY_TEXT,
  tellPersonAndStop,
  LOAD_MARK_PREFIX,
  REQUEST_NOT_RUN_TEXT,
  OPEN_REPORT_LABEL,
  PANE_TITLE,
  CLAUDE_TEST_TITLE,
  PANEL_OPEN_FRESH_MS,
  PANE_POLL_MS,
  PANEL_OPEN_NO_PICTURES_RULE,
  PANEL_OPEN_RULE,
  CLI_ONLY_TEXT,
  LOGIN_CHANGED_TEXT,
  NOT_AVAILABLE_NOW_TEXT,
  LOGIN_CHECK_FAILED_TEXT,
  DUPLICATE_HELPER_TOOLS_TEXT,
  ASK_IN_CHAT_TEXT,
  describeHelperEnvIgnored,
  describeHelperFileMismatch,
  RUN_STOPPED_TEXT,
  BROWSER_UNAVAILABLE_TEXT,
  TESTS_FAILED_TEXT,
  INSTALL_NEEDED_TEXT,
  RUN_BLOCKED_TEXT,
  NO_TESTS_TEXT,
  REPORT_MISSING_TEXT,
} from "./messages.js";
import {
  SKILL_NAMES,
  CLAUDE_TEST_RUNNER,
  HELPER_TOOL_PREFIX,
  CLAUDE_TEST_2 as CLAUDE_TEST_2_2,
  CLAUDE_TEST_APP_UP,
  CLAUDE_TEST_EXPLORER,
  CLAUDE_TEST_CONDUCTOR,
  CLAUDE_TEST_AUTHOR,
  BROWSER,
  HELPER_SERVER_NAME,
} from "./constants.js";
import {
  CLAUDE_TEST_CONSENT_KINDS,
  openGate,
  closeGate,
  isGateOpen,
  resolveProjectAndPermission,
  resetGates,
  claudeTestGateApi,
} from "./consent.js";
import {
  helperRuntimeState,
  fitScreenshotSize,
  resetRunDirCaches,
  resolveAppDir,
  readRunFolderFacts,
  readScreenshot,
  findAppPackageJson,
} from "./runFiles.js";
import {
  createOpeningFacts,
  canOpenBrowser,
  describeInstallState,
  parsePortHealthStatus,
} from "./runState.js";
import { PANE_DEFAULT_WIDTH, renderClaudeTestPane, totalLines } from "./panelView.js";
import { supportsInlineImages } from "./progress.js";
import { isBareMode } from "../../../utils/envUtils.js";
import { isCustomizationDisabled } from "../../../utils/settings/customizationDisabled.js";
import {
  complianceTaintsSettled,
  isPolicyVerdictAbsent,
} from "../../../services/policyLimits/policyVerdicts.js";
import { hasComplianceTaint } from "../../../services/policyLimits/complianceTaints.js";
import { getPlatform } from "../../../utils/platform.js";
import { HostScoped } from "../../../utils/hostScoped.js";
import { getRootSession } from "../../../bootstrap/state.js";
import { deferInit } from "../../../../runtime/deferred-init.js";

//@ chunk-ae5g0zb5.js:88412-92023 placement
/**
 * 注册 command.run 钩子处理 /claude-test：检查可用性、确保自有代理、打开面板并启动运行（约 3.6 KB）。
 */
function registerClaudeTestCommand(on) {
  claudeTestState.isModuleLoaded = true;
  on(
    "command.run",
    {
      command: "claude-test",
    },
    async (ctx, payload, next) => {
      let loginMessage = await checkLoginWatch(ctx);
      if (loginMessage !== undefined)
        return {
          text: loginMessage,
        };
      let fromComposer = payload.origin.kind === "composer" || payload.origin.kind === "bridge";
      let agentSeat = fromComposer ? await claudeTestState.seatOwnAgents?.() : undefined;
      switch (agentSeat) {
        case "missing":
          return {
            text: AGENTS_NOT_LOADED_TEXT,
          };
        case "reading":
          return {
            text: AGENTS_STILL_LOADING_TEXT,
          };
        default:
          break;
      }
      REMOTE_STATE.isRemote = payload.origin.kind === "bridge";
      if (await markSessionWantsHelper(ctx)) {
        if (fromComposer) {
          claudeTestState.typedArgs = payload.args;
          setPaneOpenedAt(openClaudeTestPane(ctx));
        }
        if (agentSeat === "listed")
          claudeTestState.agentsCheckedFor = {
            args: payload.args,
            at: Date.now(),
          };
        return next(payload);
      }
      if (!fromComposer)
        return {
          text: HELPER_NOT_READY_TEXT,
        };
      let listingMessage = await describeHelperListing(ctx, () => next.budget.remainingMs);
      if (listingMessage !== undefined)
        return {
          text: listingMessage,
        };
      claudeTestState.typedArgs = payload.args;
      setPaneOpenedAt(openClaudeTestPane(ctx));
      if (agentSeat === "listed")
        claudeTestState.agentsCheckedFor = {
          args: payload.args,
          at: Date.now(),
        };
      return next(payload);
    },
  );
  on(
    "skill.prompt",
    {
      skill: SKILL_NAMES.run,
    },
    async (ctx, payload, next) => {
      let paneOpened = consumePaneOpenedRecently();
      let loginMessage = await checkLoginWatch(ctx);
      let loadMark = takeLoadMark(payload.text);
      if (loginMessage !== undefined)
        return next({
          ...payload,
          text: tellPersonAndStop(loginMessage),
        });
      if (!payload.text.startsWith(LOAD_MARK_PREFIX)) return next(payload);
      if (loadMark === undefined)
        return next({
          ...payload,
          text: tellPersonAndStop(REQUEST_NOT_RUN_TEXT),
        });
      if (await markSessionWantsHelper(ctx))
        return next({
          ...payload,
          text: await finishCommandOutput(ctx, loadMark, paneOpened, () => next.budget.remainingMs),
        });
      if (!loadMark.isTyped || !loadMark.mayStillStart())
        return next({
          ...payload,
          text: tellPersonAndStop(HELPER_NOT_READY_TEXT),
        });
      let listingMessage = await describeHelperListing(ctx, () => next.budget.remainingMs);
      if (listingMessage !== undefined)
        return next({
          ...payload,
          text: tellPersonAndStop(listingMessage),
        });
      return next({
        ...payload,
        text: await finishCommandOutput(ctx, loadMark, paneOpened, () => next.budget.remainingMs),
      });
    },
  );
  on(
    "classic.SubagentStop",
    {
      agent_type: CLAUDE_TEST_RUNNER,
    },
    async (ctx, payload, next) => {
      await claudeTestState.reportRuns?.();
      return next(payload);
    },
  );
  on(
    "tool.call",
    {
      tool: APP_UP_ANSWER_KEY,
    },
    async (ctx, payload, next) => {
      let result = await next(payload);
      if (
        result.deny === undefined &&
        next.origin.plugin === "engine" &&
        payload.agentId === undefined &&
        noteAppStartEnded(
          payload.project,
          result.result,
          typeof payload.wait === "number" && payload.wait > 0,
        )
      )
        tickClaudeTestPane(ctx);
      if (
        result.deny === undefined &&
        result.isError !== true &&
        next.origin.plugin === "engine" &&
        payload.agentId === undefined &&
        notePortHealth(payload.project, result.result)
      )
        tickClaudeTestPane(ctx);
      return result;
    },
  );
  on(
    "tool.call",
    {
      tool: START_APP_ANSWER_KEY,
    },
    async (ctx, payload, next) => {
      let result = await next(payload);
      if (
        result.deny === undefined &&
        result.isError !== true &&
        next.origin.plugin === "engine" &&
        payload.agentId === undefined &&
        noteStartAppAnswer(payload.project, result.result)
      )
        tickClaudeTestPane(ctx);
      return result;
    },
  );
  on(
    "tool.call",
    {
      tool: CONFIRM_RUN_ANSWER_KEY,
    },
    async (ctx, payload, next) => {
      let result = await next(payload);
      if (
        result.deny === undefined &&
        result.isError !== true &&
        next.origin.plugin === "engine" &&
        payload.agentId === undefined &&
        noteRunConfirmed(payload.project, result.result)
      )
        tickClaudeTestPane(ctx);
      return result;
    },
  );
  on(
    "tool.call",
    {
      tool: MORE_TESTS_ANSWER_KEY,
    },
    async (ctx, payload, next) => {
      let result = await next(payload);
      if (
        result.deny === undefined &&
        next.origin.plugin === "engine" &&
        payload.agentId === undefined &&
        (result.isError === true
          ? noteMoreTestsDeclinedByText(payload.project, result.text ?? result.result)
          : noteMoreTestsDeclined(payload.project, result.result))
      )
        tickClaudeTestPane(ctx);
      return result;
    },
  );
  for (let kind of CLAUDE_TEST_CONSENT_KINDS)
    on(
      "tool.call",
      {
        tool: `${HELPER_TOOL_PREFIX}${kind}`,
      },
      async (ctx, payload, next) => {
        if (!isEarlyPhaseActive() || payload.agentId !== undefined) return next(payload);
        let gate = openGate();
        try {
          return await next(payload);
        } finally {
          closeGate(gate);
        }
      },
    );
  on(
    "ui.render",
    {
      component: "Pane",
      requestId: CLAUDE_TEST_2_2,
      surface: "terminal",
    },
    (ctx, payload, next) => {
      if (payload.requestId !== CLAUDE_TEST_2_2 || payload.surface !== "terminal") return next(payload);
      let { Box, Text, Image, Link } = ctx.ui.resolve(payload);
      let now = Date.now();
      let facts =
        helperRuntimeState.facts ??
        createOpeningFacts(
          paneState.openedAt > 0 ? paneState.openedAt : now,
          helperRuntimeState.early?.app ?? null,
          helperRuntimeState.appStarting?.isGuess === true,
          helperRuntimeState.early?.name?.name ?? null,
        );
      let isEarlyPhase = isEarlyPhaseActive(now);
      let paneFacts = {
        ...facts,
        ...(isEarlyPhase &&
          isGateOpen() && {
            isWaitingForPerson: true,
          }),
        ...(isEarlyPhase &&
          shouldShowFixing(claudeTestState.typedArgs, facts) && {
            isFixing: true,
          }),
      };
      let finishedReportHref = getFinishedReportHref(paneFacts);
      let reportRows = finishedReportHref === null ? 0 : 1;
      let max = Math.max(20 + PANE_PAD_LEFT + PANE_PAD_RIGHT, payload.props.bodyColumns);
      let max_2 = Math.max(20, max - PANE_PAD_LEFT - PANE_PAD_RIGHT);
      let bodyRows =
        (payload.props.scroll.bodyRows > 0 ? payload.props.scroll.bodyRows : PANE_DEFAULT_WIDTH) -
        PANE_PAD_BOTTOM;
      let isDocked = payload.props.placement === "dock";
      let statusLines = renderClaudeTestPane(
        paneFacts,
        now,
        max_2,
        INLINE_IMAGE_CAPS.glyphs,
        bodyRows - reportRows,
        !INLINE_IMAGE_CAPS.opensHere,
      );
      let picture = helperRuntimeState.picture;
      let screenshotSize =
        picture === null
          ? null
          : helperRuntimeState.canDrawPictures === false
            ? null
            : fitScreenshotSize(max_2, bodyRows - totalLines(statusLines) - reportRows - 1);
      return Box({
        flexDirection: "column",
        justifyContent: "space-between",
        width: max,
        paddingLeft: PANE_PAD_LEFT,
        paddingRight: PANE_PAD_RIGHT,
        paddingBottom: PANE_PAD_BOTTOM,
        ...(isDocked && {
          minHeight: bodyRows + PANE_PAD_BOTTOM,
        }),
        children: [
          Box({
            flexDirection: "column",
            children: [
              ...statusLines.map((statusLine) => renderStatusLine(ctx, payload, statusLine, max_2)),
              ...(finishedReportHref === null
                ? []
                : [
                    Text({
                      children: [
                        Link({
                          href: finishedReportHref,
                          children: OPEN_REPORT_LABEL,
                        }),
                      ],
                    }),
                  ]),
            ],
          }),
          ...(helperRuntimeState.canDrawPictures === null && pictureAskState.isAsking
            ? [
                Box({
                  position: "absolute",
                  top: 0,
                  left: 0,
                  children: [
                    Image({
                      key: PROBE,
                      source: PROBE_IMAGE,
                      columns: 1,
                      rows: 1,
                      alt: PANE_TITLE,
                    }),
                  ],
                }),
              ]
            : []),
          ...(picture === null || screenshotSize === null
            ? []
            : [
                Box({
                  flexDirection: "row",
                  justifyContent: "center",
                  marginTop: 1,
                  width: max_2,
                  children: [
                    Image({
                      key: "verdict",
                      source: {
                        png: picture.png,
                      },
                      columns: screenshotSize.columns,
                      rows: screenshotSize.rows,
                      alt: PANE_TITLE,
                    }),
                  ],
                }),
              ]),
        ],
      });
    },
  );
}
//@ chunk-ae5g0zb5.js:92023-92176 placement
/**
 * 面板开关开启时打开 Claude Test 窗格（记录 placed 承诺），重置面板状态、探测能否画图并决定是否打开浏览器。
 */
function openClaudeTestPane(ctx) {
  try {
    if (claudeTestState.isPaneOn?.() === true) {
      helperRuntimeState.placed = ctx.ui
        .open({
          id: CLAUDE_TEST_2_2,
          title: CLAUDE_TEST_TITLE,
        })
        .then(
          (placement) => placement.isPlaced,
          () => false,
        );
      resetPaneForCommand(ctx);
      probePictureSupport(ctx);
      shouldOpenBrowser(ctx);
      return true;
    }
  } catch {}
  return false;
}
//@ chunk-ae5g0zb5.js:92176-92197 placement
/**
 * isRemote 标记对象
 */
var REMOTE_STATE = {
  isRemote: false,
};
//@ chunk-ae5g0zb5.js:92197-92242 placement
/**
 * 记录窗格打开时间
 */
function setPaneOpenedAt(claudeTestPane) {
  claudeTestState.paneOpenedAt = claudeTestPane ? Date.now() : 0;
}
//@ chunk-ae5g0zb5.js:92242-92323 placement
/**
 * 取出窗格打开时间并清零，判断是否在有效窗口内。
 */
function consumePaneOpenedRecently() {
  let paneOpenedAt = claudeTestState.paneOpenedAt;
  claudeTestState.paneOpenedAt = 0;
  return paneOpenedAt > 0 && Date.now() - paneOpenedAt <= PANEL_OPEN_FRESH_MS;
}
//@ chunk-ae5g0zb5.js:92323-92720 placement
/**
 * /claude-test 命令输出收尾：必要时打开窗格、预判项目并等待窗格放置/画图探测，返回命令文本加画图提示。
 */
async function finishCommandOutput(ctx, mark, paneOpened, remainingMs) {
  let paneOpen = paneOpened || (mark.isTyped && openClaudeTestPane(ctx));
  if (paneOpen)
    trackProjectGuess(
      ctx,
      remainingMs() - PANE_POLL_MS > 0 ? await resolveProjectAndPermission(ctx) : undefined,
    );
  let promise = new Promise(() => {
    return;
  });
  try {
    promise = !paneOpen
      ? Promise.resolve(false)
      : ctx.clock.sleep(Math.max(0, Math.min(PICTURE_PROBE_WAIT_MS, remainingMs() - PANE_POLL_MS))).then(
          () => false,
          () => false,
        );
  } catch {}
  let placed =
    paneOpen && (await Promise.race([helperRuntimeState.placed ?? Promise.resolve(false), promise]));
  if (placed) await waitForPictureProbe(ctx, Math.min(PICTURE_PROBE_WAIT_MS, remainingMs() - PANE_POLL_MS));
  let panelRule =
    !placed || REMOTE_STATE.isRemote
      ? ""
      : helperRuntimeState.canDrawPictures === false
        ? PANEL_OPEN_NO_PICTURES_RULE
        : PANEL_OPEN_RULE;
  return mark.came + panelRule;
}
//@ chunk-ae5g0zb5.js:92720-92861 placement
/**
 * 文本色调名到 Text 样式属性的映射。
 */
var TONE_STYLES = {
  title: {
    bold: true,
  },
  dim: {
    dimColor: true,
  },
  success: {
    color: "success",
  },
  error: {
    color: "error",
  },
  warning: {
    color: "warning",
  },
  claude: {
    color: "claude",
  },
};
//@ chunk-ae5g0zb5.js:92861-92979 placement
/**
 * 把带色调的文本片段渲染成 Text 元素。
 */
function renderToneSpans(ctx, payload, spans) {
  let { Text } = ctx.ui.resolve(payload);
  return spans.map((span) =>
    Text({
      ...(span.tone !== undefined && TONE_STYLES[span.tone]),
      children: span.text,
    }),
  );
}
//@ chunk-ae5g0zb5.js:92979-93670 placement
function renderStatusLine(ctx, payload, line, width) {
  let { Box, Text } = ctx.ui.resolve(payload);
  switch (line.kind) {
    case "text":
      return Text({
        children: line.spans.length === 0 ? " " : renderToneSpans(ctx, payload, line.spans),
      });
    case "row":
      return Box({
        flexDirection: "row",
        width,
        children: [
          Box({
            flexShrink: 0,
            children: Text({
              children: renderToneSpans(ctx, payload, line.lead),
            }),
          }),
          Box({
            flexGrow: 1,
            flexShrink: 1,
            minWidth: 0,
            children: Text({
              wrap: line.wraps === true ? "wrap" : "truncate-end",
              children: renderToneSpans(ctx, payload, line.body),
            }),
          }),
          ...(line.right === null
            ? []
            : [
                Box({
                  flexShrink: 0,
                  marginLeft: 1,
                  children: Text({
                    children: renderToneSpans(ctx, payload, [line.right]),
                  }),
                }),
              ]),
        ],
      });
    case "items":
      return Box({
        flexDirection: "row",
        flexWrap: "wrap",
        columnGap: 1,
        paddingLeft: line.indent,
        width,
        children: line.items.map((children) =>
          Box({
            flexShrink: 0,
            children: Text({
              ...(line.tone !== undefined && TONE_STYLES[line.tone]),
              children,
            }),
          }),
        ),
      });
    default:
      return line;
  }
}
//@ chunk-ae5g0zb5.js:93670-93722 placement
/**
 * 内联图片能力与是否在此打开
 */
var INLINE_IMAGE_CAPS; // deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
deferInit("chunk-ae5g0zb5.js:93670", () => {
  INLINE_IMAGE_CAPS = {
    glyphs: supportsInlineImages({
      platform: "linux",
    }),
    opensHere: true,
  };
});
//@ chunk-ae5g0zb5.js:93722-94191 placement
async function shouldOpenBrowser(ctx) {
  try {
    let [term, termProgram, noOpen, ci, sshConnection, sshTty, sshClient, display, waylandDisplay] =
      await Promise.all([
        ctx.env.get("TERM"),
        ctx.env.get("TERM_PROGRAM"),
        ctx.env.get("CLAUDE_TEST_NO_OPEN"),
        ctx.env.get("CI"),
        ctx.env.get("SSH_CONNECTION"),
        ctx.env.get("SSH_TTY"),
        ctx.env.get("SSH_CLIENT"),
        ctx.env.get("DISPLAY"),
        ctx.env.get("WAYLAND_DISPLAY"),
      ]);
    INLINE_IMAGE_CAPS.glyphs = supportsInlineImages({
      term,
      termProgram,
      platform: "linux",
    });
    INLINE_IMAGE_CAPS.opensHere = canOpenBrowser(
      {
        CLAUDE_TEST_NO_OPEN: noOpen,
        CI: ci,
        SSH_CONNECTION: sshConnection,
        SSH_TTY: sshTty,
        SSH_CLIENT: sshClient,
        DISPLAY: display,
        WAYLAND_DISPLAY: waylandDisplay,
      },
      "linux",
    );
  } catch {}
}
//@ chunk-ae5g0zb5.js:94191-94313 placement
/**
 * 窗格刷新循环状态（打开/命令时间、代数、运行者、报告链接等）。
 */
var paneState; // deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
deferInit("chunk-ae5g0zb5.js:94191", () => {
  paneState = {
    openedAt: 0,
    commandAt: 0,
    generation: 0,
    sawExplorer: false,
    drawnRun: null,
    runners: new Set(),
    isBusy: false,
    tickedAt: 0,
    report: null,
  };
});
//@ chunk-ae5g0zb5.js:94313-94426 placement
/**
 * 运行结束且报告属于本次运行时返回报告链接。
 */
function getFinishedReportHref(facts) {
  let report = paneState.report;
  return facts.run?.finished === true &&
    report !== null &&
    report.runId === facts.runId &&
    INLINE_IMAGE_CAPS.opensHere
    ? report.href
    : null;
}
//@ chunk-ae5g0zb5.js:94426-94653 placement
/**
 * 运行结束后取一次报告链接（代数不变才写入）。
 */
async function fetchReportHref(dir, facts, generation) {
  let runId = facts.runId;
  if (
    facts.run?.finished !== true ||
    typeof runId !== "string" ||
    !RUN_ID_RE.test(runId) ||
    paneState.report?.runId === runId
  )
    return;
  try {
    let href = await claudeTestState.reportHref?.(dir, runId);
    if (href !== undefined && paneState.generation === generation)
      paneState.report = {
        runId,
        href,
      };
  } catch {}
}
//@ chunk-ae5g0zb5.js:94653-94722 placement
/**
 * 探测图键名
 */
var PROBE = "probe";
var PROBE_IMAGE = {
  rgba: "AAAAAA==",
  width: 1,
  height: 1,
};
var PICTURE_PROBE_WAIT_MS = 2500;
var PICTURE_ASK_TIMEOUT_MS = 5000;
//@ chunk-ae5g0zb5.js:94722-94827 placement
/**
 * 画图被拒的原因是否为“只支持 alt 文本”（且已等待足够久）。
 */
function isAltTextRefusal(deny) {
  return (
    /\balt\b/.test(deny) &&
    !/\bimage id is in use\b/.test(deny) &&
    Date.now() - pictureAskState.firstAskedAt >= PICTURE_ASK_MIN_GAP_MS
  );
}
//@ chunk-ae5g0zb5.js:94827-94904 placement
/**
 * claude-test 询问「能否在这里画图」的最小间隔 1 秒，避免同一轮里反复弹问；同一声明还带着询问状态对象。
 */
var PICTURE_ASK_MIN_GAP_MS; // deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
var pictureAskState;
deferInit("chunk-ae5g0zb5.js:94827", () => {
  PICTURE_ASK_MIN_GAP_MS = 1000;
  pictureAskState = {
    isAsking: false,
    round: 0,
    askedAt: 0,
    firstAskedAt: 0,
    waiters: new Set(),
  };
});
//@ chunk-ae5g0zb5.js:94904-94977 placement
/**
 * 把“能否画图”的询问标记为结束并叫醒所有等待者。
 */
function settlePictureAsk() {
  pictureAskState.isAsking = false;
  for (let waiter of pictureAskState.waiters) waiter();
  pictureAskState.waiters.clear();
}
//@ chunk-ae5g0zb5.js:94977-95329 placement
/**
 * 开始探测终端能否显示图片：触发重绘、稍后发送探测图，超时则放弃。
 */
function probePictureSupport(ctx) {
  if (
    helperRuntimeState.canDrawPictures !== null ||
    (pictureAskState.isAsking && Date.now() - pictureAskState.askedAt < PICTURE_ASK_TIMEOUT_MS)
  )
    return;
  pictureAskState.isAsking = true;
  pictureAskState.askedAt = Date.now();
  pictureAskState.firstAskedAt ||= pictureAskState.askedAt;
  pictureAskState.round += 1;
  let round = pictureAskState.round;
  try {
    runQuietly(() => ctx.ui.invalidate("ui.render"));
    ctx.clock.after(100, () => sendPictureProbe(ctx, 12));
    ctx.clock.after(PICTURE_ASK_TIMEOUT_MS, () => {
      if (pictureAskState.isAsking && pictureAskState.round === round) {
        settlePictureAsk();
        runQuietly(() => ctx.ui.invalidate("ui.render"));
      }
    });
  } catch {
    settlePictureAsk();
  }
}
//@ chunk-ae5g0zb5.js:95329-95667 placement
/**
 * 发送探测图片并据结果设置 canDrawPictures，未决时重试 n 次。
 */
function sendPictureProbe(ctx, attemptsLeft) {
  if (helperRuntimeState.canDrawPictures !== null) {
    settlePictureAsk();
    return;
  }
  let probe;
  try {
    probe = ctx.ui.blit({
      requestId: CLAUDE_TEST_2_2,
      key: PROBE,
      source: PROBE_IMAGE,
    });
  } catch {
    settlePictureAsk();
    return;
  }
  probe
    .then((result) => {
      if (result.deny === undefined) helperRuntimeState.canDrawPictures = true;
      else if (isAltTextRefusal(result.deny)) helperRuntimeState.canDrawPictures = false;
      else if (attemptsLeft > 0) {
        ctx.clock.after(250, () => sendPictureProbe(ctx, attemptsLeft - 1));
        return;
      }
      settlePictureAsk();
      runQuietly(() => ctx.ui.invalidate("ui.render"));
    })
    .catch(() => settlePictureAsk());
}
//@ chunk-ae5g0zb5.js:95667-95844 placement
/**
 * 等待画图探测结束（最多 n 毫秒）。
 */
function waitForPictureProbe(ctx, timeoutMs) {
  if (!pictureAskState.isAsking || timeoutMs <= 0) return Promise.resolve();
  return new Promise((resolve) => {
    let finish = () => {
      pictureAskState.waiters.delete(finish);
      resolve();
    };
    pictureAskState.waiters.add(finish);
    try {
      ctx.clock.after(timeoutMs, finish);
    } catch {
      finish();
    }
  });
}
//@ chunk-ae5g0zb5.js:95844-95863 placement
/**
 * 2
 */
var PANE_PAD_LEFT = 2;
var PANE_PAD_RIGHT = 1;
var PANE_PAD_BOTTOM = 1;
//@ chunk-ae5g0zb5.js:95863-95944 placement
/**
 * 画图能力未知时 500ms 后重试绘制结论截图。
 */
function retryVerdictPicture(ctx) {
  if (helperRuntimeState.canDrawPictures !== null) return;
  ctx.clock.after(500, () => blitVerdictPicture(ctx, 5));
}
//@ chunk-ae5g0zb5.js:95944-96306 placement
/**
 * 把结论截图画到窗格，据结果更新是否能画图，失败重试。
 */
function blitVerdictPicture(ctx, attemptsLeft) {
  let picture = helperRuntimeState.picture;
  if (picture === null || helperRuntimeState.canDrawPictures !== null) return;
  pictureAskState.firstAskedAt ||= Date.now();
  ctx.ui
    .blit({
      requestId: CLAUDE_TEST_2_2,
      key: "verdict",
      source: {
        png: picture.png,
      },
    })
    .then((result) => {
      if (result.deny === undefined) helperRuntimeState.canDrawPictures = true;
      else if (isAltTextRefusal(result.deny)) {
        helperRuntimeState.canDrawPictures = false;
        runQuietly(() => ctx.ui.invalidate("ui.render"));
      } else if (attemptsLeft > 0) ctx.clock.after(1000, () => blitVerdictPicture(ctx, attemptsLeft - 1));
    })
    .catch(() => {
      return;
    });
}
//@ chunk-ae5g0zb5.js:96306-96938 placement
/**
 * 新一次命令时重置窗格与运行状态，并启动 250ms 刷新循环（每 4 拍完整刷新一次）。
 */
function resetPaneForCommand(ctx) {
  paneState.openedAt = Date.now();
  paneState.commandAt = paneState.openedAt;
  paneState.generation += 1;
  paneState.sawExplorer = false;
  paneState.drawnRun = null;
  paneState.runners = new Set();
  paneState.report = null;
  helperRuntimeState.facts = null;
  helperRuntimeState.picture = null;
  helperRuntimeState.runAccepted = null;
  let rememberedStart = helperRuntimeState.rememberedStart;
  helperRuntimeState.appStarting =
    rememberedStart === null || hasCiFlag(claudeTestState.typedArgs)
      ? null
      : {
          project: rememberedStart,
          at: paneState.openedAt,
          isAhead: true,
          isGuess: true,
        };
  helperRuntimeState.moreDeclined = null;
  resetRunDirCaches();
  resetGates();
  helperRuntimeState.early = {
    at: paneState.openedAt,
    project: null,
    app: {
      kind: "checking",
    },
    name: helperRuntimeState.early?.name ?? null,
  };
  if (helperRuntimeState.stop !== null && Date.now() - paneState.tickedAt < PANE_TICK_STALE_MS) return;
  try {
    helperRuntimeState.stop?.();
  } catch {}
  let tickCount = 0;
  let all = ctx.clock.every(250, () => {
    tickCount += 1;
    if (tickCount % 4 === 0) tickClaudeTestPane(ctx);
    else runQuietly(() => ctx.ui.invalidate("ui.render"));
  });
  helperRuntimeState.stop = () => {
    all.cancel();
    helperRuntimeState.stop = null;
  };
  tickClaudeTestPane(ctx);
}
//@ chunk-ae5g0zb5.js:96938-96958 placement
/**
 * 5000
 */
var PANE_TICK_STALE_MS = 5000;
var PANE_COMMAND_STALE_MS = 5000;
//@ chunk-ae5g0zb5.js:96958-98343 placement
/**
 * 面板刷新：读取运行目录、更新视图、面板关闭超时后停止。
 */
async function tickClaudeTestPane(ctx) {
  paneState.tickedAt = Date.now();
  if (paneState.isBusy) return;
  paneState.isBusy = true;
  let generation = paneState.generation;
  try {
    let panes;
    try {
      panes = await ctx.ui.panes();
    } catch {}
    if (
      panes !== undefined &&
      !panes.some((pane) => pane.id === CLAUDE_TEST_2_2) &&
      Date.now() - paneState.commandAt > PANE_COMMAND_STALE_MS
    ) {
      helperRuntimeState.stop?.();
      return;
    }
    let { dir, appFolder } = await resolveAppDir(ctx, await ctx.session.root(), claudeTestState.typedArgs);
    let now = Date.now();
    let runFolderFacts = await readRunFolderFacts(
      ctx,
      dir,
      paneState.openedAt,
      now,
      await describeRunPhase(ctx),
      hasFixFlag(claudeTestState.typedArgs),
    );
    if (paneState.generation !== generation) return;
    if (runFolderFacts.runRel !== null && runFolderFacts.runRel !== paneState.drawnRun) {
      if (paneState.drawnRun !== null) {
        paneState.openedAt = now;
        helperRuntimeState.picture = null;
      }
      paneState.drawnRun = runFolderFacts.runRel;
      paneState.runners = new Set();
    }
    let installNote = await claudeTestState.installNoteText?.().catch(() => {
      return;
    });
    let early = await resolveEarlyAppInfo(ctx, dir);
    let agents = await ctx.agent.list().catch(() => []);
    if (paneState.generation !== generation) return;
    let halt = rememberRunHalt(
      runFolderFacts.runRel === null
        ? null
        : `${dir}
${runFolderFacts.runRel}`,
      detectRunHalt(
        {
          ...runFolderFacts.facts,
          early,
        },
        agents,
        paneState.runners,
        claudeTestState.typedArgs,
      ),
      runFolderFacts.facts.run?.finished === true,
      agents.some((agent) => regExp_2.test(agent.type) && ACTIVE_TASK_STATUSES.has(agent.status)),
    );
    helperRuntimeState.facts = {
      ...runFolderFacts.facts,
      openedAt: paneState.openedAt,
      readAt: now,
      appFolder,
      install: describeInstallState(installNote, paneState.openedAt, Date.now()),
      early,
      ...(isRunAcceptedPending(runFolderFacts.facts, dir, paneState.openedAt) && {
        isStartingRun: true,
      }),
      ...(halt !== undefined && {
        halt,
      }),
      ...(halt === undefined &&
        isAppStartPending(dir, paneState.commandAt, Date.now()) && {
          isStartingApp: true,
        }),
      ...(isMoreTestsDeclined(dir, runFolderFacts.runRel) && {
        isMoreDeclined: true,
      }),
    };
    await fetchReportHref(dir, runFolderFacts.facts, generation);
    let pictureStem = runFolderFacts.pictureStem;
    if (
      pictureStem !== null &&
      runFolderFacts.runRel !== null &&
      runFolderFacts.runReal !== null &&
      helperRuntimeState.picture?.stem !== pictureStem
    ) {
      let screenshot = await readScreenshot(ctx, runFolderFacts.runRel, runFolderFacts.runReal, pictureStem);
      if (screenshot !== undefined && paneState.generation === generation) {
        helperRuntimeState.picture = {
          stem: pictureStem,
          png: screenshot,
        };
        retryVerdictPicture(ctx);
      }
    }
  } catch {
  } finally {
    paneState.isBusy = false;
    runQuietly(() => ctx.ui.invalidate("ui.render"));
  }
}
//@ chunk-ae5g0zb5.js:98343-98486 placement
/**
 * 面板向会话提问的答案键与超时。
 */
var APP_UP_ANSWER_KEY = `${HELPER_TOOL_PREFIX}${CLAUDE_TEST_APP_UP}`;
var CONFIRM_RUN_ANSWER_KEY = `${HELPER_TOOL_PREFIX}claude_test_confirm_run`;
var MORE_TESTS_ANSWER_KEY = `${HELPER_TOOL_PREFIX}claude_test_more_tests`;
var START_APP_ANSWER_KEY = `${HELPER_TOOL_PREFIX}claude_test_start_app`;
var APP_START_TIMEOUT_MS_2 = 300000;
var APP_START_AHEAD_TIMEOUT_MS = 60000;
//@ chunk-ae5g0zb5.js:98486-98696 placement
/**
 * 工具答案（对象、字符串或单个 text 块）解析为普通对象，否则 null。
 */
function parseAnswerObject(value) {
  if (isPlainObjectNonArray(value) && [Object.prototype, null].includes(Object.getPrototypeOf(value)))
    return value;
  let [firstPart, ...restParts] = answerTextParts(value);
  if (firstPart === undefined || restParts.length > 0) return null;
  try {
    let parsed = JSON.parse(firstPart);
    return isPlainObjectNonArray(parsed) ? parsed : null;
  } catch {
    return null;
  }
}
//@ chunk-ae5g0zb5.js:98696-98954 placement
/**
 * 记录“启动应用”问题的回答：start 时标记应用正在启动并记住项目。
 */
function noteStartAppAnswer(project, result) {
  if (typeof project !== "string" || helperRuntimeState.stop === null) return false;
  let answerObject = parseAnswerObject(result);
  if (answerObject === null) return false;
  if (answerObject.answer !== "start") {
    if (helperRuntimeState.appStarting?.project !== project) return false;
    helperRuntimeState.appStarting = null;
    return true;
  }
  helperRuntimeState.appStarting = {
    project,
    at: Date.now(),
  };
  helperRuntimeState.rememberedStart = project;
  return true;
}
//@ chunk-ae5g0zb5.js:98954-99416 placement
/**
 * 应用未运行但允许启动时，提前标记为启动中。
 */
function noteAppDownWithStartAllowed(project, answerText) {
  let isGuessedStart =
    helperRuntimeState.appStarting?.isGuess === true && helperRuntimeState.appStarting.project === project;
  if (
    typeof project !== "string" ||
    helperRuntimeState.stop === null ||
    (helperRuntimeState.appStarting !== null && !isGuessedStart) ||
    answerText === undefined ||
    hasCiFlag(claudeTestState.typedArgs)
  )
    return false;
  let answer;
  try {
    let parsed = JSON.parse(answerText);
    answer = isPlainObjectNonArray(parsed) ? parsed : null;
  } catch {
    return false;
  }
  if (
    answer === null ||
    answer.up !== false ||
    answer.startEnded === true ||
    isPlainObjectNonArray(answer.portBusy) ||
    !isPlainObjectNonArray(answer.startDialog) ||
    answer.startAllowed !== true
  )
    return false;
  let at = isGuessedStart ? helperRuntimeState.appStarting?.at : undefined;
  helperRuntimeState.appStarting = {
    project,
    at: at ?? Date.now(),
    isAhead: true,
  };
  helperRuntimeState.rememberedStart = project;
  return true;
}
//@ chunk-ae5g0zb5.js:99416-99689 placement
/**
 * 应用探测结果：不允许启动时忘记记住的项目；撤销猜测的启动状态。
 */
function noteAppProbeResult(project, answerText) {
  let appStarting = helperRuntimeState.appStarting;
  let answer = null;
  try {
    let parsed = answerText === undefined ? null : JSON.parse(answerText);
    answer = isPlainObjectNonArray(parsed) ? parsed : null;
  } catch {
    answer = null;
  }
  if (
    answer !== null &&
    answer.up === false &&
    answer.startAllowed !== true &&
    helperRuntimeState.rememberedStart === project
  )
    helperRuntimeState.rememberedStart = null;
  if (appStarting?.isGuess !== true || appStarting.project !== project) return false;
  helperRuntimeState.appStarting = null;
  return true;
}
//@ chunk-ae5g0zb5.js:99689-99890 placement
/**
 * 应用启动结束（或端口被占）时清除启动中状态。
 */
function noteAppStartEnded(project, result, hasWait = false) {
  let appStarting = helperRuntimeState.appStarting;
  if (appStarting === null || project !== appStarting.project) return false;
  let answerObject = parseAnswerObject(result);
  if (answerObject === null || answerObject.up === true) return false;
  if (answerObject.startEnded !== true && !isPlainObjectNonArray(answerObject.portBusy) && !hasWait)
    return false;
  helperRuntimeState.appStarting = null;
  return true;
}
//@ chunk-ae5g0zb5.js:99890-99905 placement
/**
 * 3600000
 */
var EARLY_PHASE_WINDOW_MS = 3600000;
//@ chunk-ae5g0zb5.js:99905-100087 placement
/**
 * 面板早期阶段是否仍在进行（时间窗内且运行未结束/未停止）。
 */
function isEarlyPhaseActive(now = Date.now()) {
  let facts = helperRuntimeState.facts;
  let at = helperRuntimeState.early?.at ?? 0;
  return (
    helperRuntimeState.stop !== null &&
    at > 0 &&
    now - at < EARLY_PHASE_WINDOW_MS &&
    (facts?.run?.finished !== true || facts.isKept === true) &&
    (facts?.note?.stopped ?? null) === null &&
    facts?.halt === undefined
  );
}
//@ chunk-ae5g0zb5.js:100087-100150 placement
/**
 * 带 fix 参数、非重跑且尚未开始运行时，标记为“正在修复”。
 */
function shouldShowFixing(typedArgs, facts) {
  return hasFixFlag(typedArgs) && facts.isFixRerun !== true && facts.run === null;
}
//@ chunk-ae5g0zb5.js:100150-100232 placement
/**
 * 判断命令参数里是否带 --ci。
 */
function hasCiFlag(typedArgs) {
  return typeof typedArgs === "string" && typedArgs.trim().split(/\s+/).includes("--ci");
}
//@ chunk-ae5g0zb5.js:100232-100314 placement
/**
 * 匹配 Claude Test 运行代理的 task 名，以及“仍在进行”的 task 状态集合。
 */
var regExp_2; // deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
var ACTIVE_TASK_STATUSES;
deferInit("chunk-ae5g0zb5.js:100232", () => {
  regExp_2 = new RegExp(`^${CLAUDE_TEST_RUNNER}(-\\d+)?$`);
  ACTIVE_TASK_STATUSES = new Set(["pending", "running", "waiting"]);
});
//@ chunk-ae5g0zb5.js:100314-100719 placement
/**
 * 根据后台任务状态判断运行被停止（stopped）或因应用未运行而阻塞（blocked）。
 */
function detectRunHalt(runFolderFacts, agents, runners, typedArgs) {
  let filtered = agents.filter((agent) => regExp_2.test(agent.type));
  for (let agent of filtered) if (ACTIVE_TASK_STATUSES.has(agent.status)) runners.add(agent.id);
  if (runFolderFacts.run?.finished === true) return;
  let filtered_2 = filtered.filter((agent) => runners.has(agent.id));
  if (
    filtered_2.length > 0 &&
    filtered_2.every((agent) => !ACTIVE_TASK_STATUSES.has(agent.status)) &&
    filtered_2.some((agent) => agent.status === "killed")
  )
    return "stopped";
  let appState = runFolderFacts.note?.app?.state ?? runFolderFacts.early?.app?.kind ?? null;
  if (
    hasCiFlag(typedArgs) &&
    (runFolderFacts.run === null || !runFolderFacts.run.started) &&
    runners.size === 0 &&
    appState === "down"
  )
    return "blocked";
  return;
}
//@ chunk-ae5g0zb5.js:100719-100734 placement
/**
 * 记录哪些项目的运行处于“已停止”。
 */
var stoppedProjects; // deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
deferInit("chunk-ae5g0zb5.js:100719", () => {
  stoppedProjects = new Set();
});
//@ chunk-ae5g0zb5.js:100734-100893 placement
/**
 * 记住或清除某项目的停止状态。
 */
function rememberRunHalt(project, runHalt, runFinished, hasActiveRunner = false) {
  if (project !== null && hasActiveRunner) stoppedProjects.delete(project);
  if (project !== null && runHalt === "stopped") stoppedProjects.add(project);
  if (runHalt !== undefined || runFinished || project === null) return runHalt;
  return stoppedProjects.has(project) ? "stopped" : undefined;
}
//@ chunk-ae5g0zb5.js:100893-100974 placement
/**
 * 参数里是否有 fix
 */
function hasFixFlag(args) {
  return typeof args === "string" && args.trim().split(/\s+/).includes("fix");
}
//@ chunk-ae5g0zb5.js:100974-101084 placement
/**
 * 应用启动中且未超时。
 */
function isAppStartPending(dir, commandAt, now) {
  let appStarting = helperRuntimeState.appStarting;
  return (
    appStarting !== null &&
    appStarting.project === dir &&
    appStarting.at >= commandAt &&
    now - appStarting.at <
      (appStarting.isAhead === true ? APP_START_AHEAD_TIMEOUT_MS : APP_START_TIMEOUT_MS_2)
  );
}
//@ chunk-ae5g0zb5.js:101084-101226 placement
/**
 * 答案中的文本片段（字符串或 text 块）。
 */
function answerTextParts(value) {
  return typeof value === "string"
    ? [value]
    : Array.isArray(value)
      ? value.flatMap((part) =>
          isPlainObjectNonArray(part) && part.type === "text" && typeof part.text === "string"
            ? [part.text]
            : [],
        )
      : [];
}
//@ chunk-ae5g0zb5.js:101226-101363 placement
/**
 * 记录用户确认运行。
 */
function noteRunConfirmed(project, result) {
  if (
    typeof project !== "string" ||
    parseAnswerObject(result)?.answer !== "run" ||
    helperRuntimeState.stop === null
  )
    return false;
  helperRuntimeState.runAccepted = {
    project,
    at: Date.now(),
  };
  return true;
}
//@ chunk-ae5g0zb5.js:101363-101592 placement
/**
 * 记录“更多测试”问题被拒绝或回答。
 */
function noteMoreTestsDeclined(project, result) {
  if (typeof project !== "string" || helperRuntimeState.stop === null) return false;
  let answerObject = parseAnswerObject(result);
  if (
    answerObject === null ||
    !("answer" in answerObject) ||
    !(answerObject.answer === "run" || answerObject.answer === "not-now" || answerObject.answer === null)
  )
    return false;
  helperRuntimeState.moreDeclined = {
    project,
    runRel: paneState.drawnRun,
  };
  return true;
}
//@ chunk-ae5g0zb5.js:101592-101656 placement
/**
 * 反问提示正则
 */
var ASK_PROMPT_RE = /\bAsk (?:with AskUserQuestion|as the run skill says)\b/;
//@ chunk-ae5g0zb5.js:101656-101809 placement
/**
 * 文本回答匹配拒绝时记录“更多测试”被拒。
 */
function noteMoreTestsDeclinedByText(project, text) {
  if (helperRuntimeState.stop === null || !answerTextParts(text).some((part) => ASK_PROMPT_RE.test(part)))
    return false;
  helperRuntimeState.moreDeclined = {
    project: typeof project === "string" ? project : null,
    runRel: paneState.drawnRun,
  };
  return true;
}
//@ chunk-ae5g0zb5.js:101809-101922 placement
/**
 * 当前运行是否已拒绝“更多测试”。
 */
function isMoreTestsDeclined(dir, runRel) {
  let moreDeclined = helperRuntimeState.moreDeclined;
  return (
    moreDeclined !== null &&
    runRel !== null &&
    (moreDeclined.project === null || moreDeclined.project === dir) &&
    moreDeclined.runRel === runRel
  );
}
//@ chunk-ae5g0zb5.js:101922-102034 placement
/**
 * 运行已确认但尚未开始。
 */
function isRunAcceptedPending(facts, dir, openedAt) {
  let runAccepted = helperRuntimeState.runAccepted;
  return (
    runAccepted !== null &&
    runAccepted.project === dir &&
    runAccepted.at >= openedAt &&
    facts.run === null &&
    facts.isLaterRun !== true
  );
}
//@ chunk-ae5g0zb5.js:102034-102203 placement
/**
 * 把端口健康检查结果写入早期状态。
 */
function notePortHealth(project, result) {
  let early = helperRuntimeState.early;
  let answerObject = parseAnswerObject(result);
  let portStatus = answerObject === null ? null : parsePortHealthStatus(JSON.stringify(answerObject));
  if (early === null || portStatus === null || project !== early.project || helperRuntimeState.stop === null)
    return false;
  helperRuntimeState.early = {
    ...early,
    app: portStatus,
  };
  return true;
}
//@ chunk-ae5g0zb5.js:102203-102214 placement
/**
 * 10000
 */
var EARLY_CHECK_STALE_MS = 1e4;
//@ chunk-ae5g0zb5.js:102214-102555 placement
/**
 * 早期阶段的应用名（按目录缓存 package.json 名称）与应用状态。
 */
async function resolveEarlyAppInfo(ctx, dir) {
  let early = helperRuntimeState.early;
  if (early === null) return null;
  let nameInfo = early.name;
  if (nameInfo === null || nameInfo.dir !== dir) {
    nameInfo = {
      dir,
      name: await findAppPackageJson(ctx, dir),
    };
    if (helperRuntimeState.early?.at === early.at)
      helperRuntimeState.early = {
        ...helperRuntimeState.early,
        name: nameInfo,
      };
  }
  let app = helperRuntimeState.early?.at === early.at ? helperRuntimeState.early.app : null;
  let project = helperRuntimeState.early?.project ?? null;
  let isOtherProject = project !== null && project !== dir;
  let isCheckStale = app?.kind === "checking" && Date.now() - early.at > EARLY_CHECK_STALE_MS;
  return {
    name: nameInfo.name,
    app: isOtherProject || isCheckStale ? null : app,
  };
}
//@ chunk-ae5g0zb5.js:102555-102895 placement
/**
 * 跟踪预判的项目与权限回答，回答到达后更新应用状态并刷新窗格。
 */
function trackProjectGuess(ctx, guess) {
  let early = helperRuntimeState.early;
  if (early === null) return;
  if (guess === undefined) {
    helperRuntimeState.early = {
      ...early,
      app: null,
    };
    if (helperRuntimeState.appStarting?.isGuess === true) helperRuntimeState.appStarting = null;
    return;
  }
  helperRuntimeState.early = {
    ...early,
    project: guess.project,
  };
  guess.answer.then((probeResult) => {
    let early_2 = helperRuntimeState.early;
    if (early_2?.at === early.at) {
      let wasChecking = early_2.app?.kind === "checking";
      if (!wasChecking || !noteAppDownWithStartAllowed(guess.project, probeResult))
        noteAppProbeResult(guess.project, probeResult);
      if (wasChecking)
        helperRuntimeState.early = {
          ...early_2,
          app: parsePortHealthStatus(probeResult),
        };
      tickClaudeTestPane(ctx);
    }
  });
}
//@ chunk-ae5g0zb5.js:102895-103412 placement
async function describeRunPhase(ctx) {
  let facts = helperRuntimeState.facts;
  if (facts !== null && facts.run !== null)
    return {
      isReadingCode: facts.isReadingCode,
      hasReadCode: facts.hasReadCode,
      isWritingTests: facts.isWritingTests,
    };
  let agents = await ctx.agent.list().catch(() => []);
  let filtered = agents.filter((agent) => agent.type === CLAUDE_TEST_EXPLORER);
  let any = agents.some((agent) => agent.type === CLAUDE_TEST_CONDUCTOR && agent.status === "running");
  let any_2 = filtered.some((agent) => agent.status === "running");
  paneState.sawExplorer ||= filtered.length > 0 || any;
  return {
    isReadingCode: any_2,
    hasReadCode:
      filtered.some((agent) => agent.status === "completed") || (paneState.sawExplorer && !any_2 && !any),
    isWritingTests: agents.some((agent) => agent.type === CLAUDE_TEST_AUTHOR && agent.status === "running"),
    isPreparing: any,
  };
}
//@ chunk-ae5g0zb5.js:103412-103623 placement
/**
 * 从命令文本开头取出加载标记，返回对应的加载记录（未过期）与剩余文本。
 */
function takeLoadMark(text) {
  let index = text.indexOf(`
`);
  if (!text.startsWith(LOAD_MARK_PREFIX) || index === -1) return;
  let sliced = text.slice(LOAD_MARK_PREFIX.length, index);
  let mark = claudeTestState.loads.get(sliced);
  claudeTestState.loads.delete(sliced);
  return mark !== undefined && Date.now() - mark.issuedAt <= PANEL_OPEN_FRESH_MS
    ? {
        ...mark,
        came: text.slice(index + 1),
      }
    : undefined;
}
//@ chunk-ae5g0zb5.js:103623-103706 placement
/**
 * 检查当前工具列表里是否存在浏览器助手提供的工具前缀。
 */
async function hasHelperTool(ctx) {
  return (await ctx.tool.list()).some((tool) => tool.name.startsWith(HELPER_TOOL_PREFIX));
}
//@ chunk-ae5g0zb5.js:103706-103868 placement
/**
 * 浏览器助手可启动时把当前会话加入需要助手的集合。
 */
async function markSessionWantsHelper(ctx) {
  if (!(await hasHelperTool(ctx))) {
    claudeTestState.hasStartedServer = false;
    return false;
  }
  let sessionId = await ctx.session.id();
  if (!claudeTestState.hasStartedServer) return false;
  claudeTestState.wantedSessions.add(sessionId);
  return true;
}
//@ chunk-ae5g0zb5.js:103868-104225 placement
async function checkLoginWatch(ctx) {
  if (!(await ctx.session.surfaces()).includes("terminal")) {
    claudeTestState.report?.("no_terminal");
    return CLI_ONLY_TEXT;
  }
  switch (claudeTestState.mayRun?.()) {
    case "yes":
      break;
    case "login_changed":
      return LOGIN_CHANGED_TEXT;
    case "not_offered":
      return NOT_AVAILABLE_NOW_TEXT;
    default:
      return LOGIN_CHECK_FAILED_TEXT;
  }
  let wanted = claudeTestState.wantedSessions.has(await ctx.session.id());
  if (!claudeTestState.hasStartedServer && !wanted && (await hasHelperTool(ctx))) {
    claudeTestState.report?.("other_plugin");
    return DUPLICATE_HELPER_TOOLS_TEXT;
  }
  return;
}
//@ chunk-ae5g0zb5.js:104225-105061 placement
async function describeHelperListing(ctx, remainingMs) {
  let { watchLogin, takeOut } = claudeTestState;
  if (watchLogin === undefined || takeOut === undefined) return LOGIN_CHECK_FAILED_TEXT;
  let filesState = await claudeTestState.filesReady?.();
  if (filesState === undefined) return ASK_IN_CHAT_TEXT;
  if (filesState.ignored !== undefined) {
    let ignoredMessage = describeHelperEnvIgnored(filesState.ignored);
    runQuietly(() => ctx.ui.log(ignoredMessage));
  }
  if (filesState.problem !== undefined) {
    claudeTestState.wantedSessions.clear();
    claudeTestState.hasStartedServer = false;
    return describeHelperFileMismatch(filesState.folder, filesState.problem, filesState.what);
  }
  let sessionId = await ctx.session.id();
  claudeTestState.wantedSessions.add(sessionId);
  let helperMessage = describeHelperState_2(watchLogin, takeOut);
  if (helperMessage !== undefined) return helperMessage;
  runQuietly(() => ctx.ui.toast(RUN_STOPPED_TEXT));
  let availabilityMessage = await describeAvailability(ctx);
  if (!claudeTestState.wantedSessions.has(sessionId)) {
    takeOut();
    return HELPER_NOT_READY_TEXT;
  }
  if (availabilityMessage !== undefined) return availabilityMessage;
  let min = Math.min(claudeTestState.listedWaitMs, remainingMs() - PANE_POLL_MS);
  let startedAt = await ctx.clock.now();
  while (!(await hasHelperTool(ctx))) {
    if (!claudeTestState.wantedSessions.has(sessionId)) break;
    if ((await ctx.clock.now()) - startedAt >= min) {
      claudeTestState.report?.("not_listed");
      return BROWSER_UNAVAILABLE_TEXT;
    }
    await ctx.clock.sleep(100);
  }
  if (!claudeTestState.wantedSessions.has(sessionId)) {
    takeOut();
    return HELPER_NOT_READY_TEXT;
  }
  claudeTestState.hasStartedServer = true;
  let finalHelperMessage = describeHelperState_2(watchLogin, takeOut);
  if (finalHelperMessage !== undefined) return finalHelperMessage;
  claudeTestState.report?.("listed");
  return;
}
//@ chunk-ae5g0zb5.js:105061-105271 placement
/**
 * 助手状态对应的提示文本（watching 时无提示）。
 */
function describeHelperState_2(watchLogin, takeOut) {
  let status = watchLogin();
  switch (status) {
    case "watching":
      return;
    case "login_changed":
      return LOGIN_CHANGED_TEXT;
    case "not_offered":
      return NOT_AVAILABLE_NOW_TEXT;
    case "failed":
      return LOGIN_CHECK_FAILED_TEXT;
    default:
      claudeTestState.wantedSessions.clear();
      claudeTestState.hasStartedServer = false;
      takeOut();
      return LOGIN_CHECK_FAILED_TEXT;
  }
}
//@ chunk-ae5g0zb5.js:105271-105585 placement
async function describeAvailability(ctx) {
  try {
    let connection = await ctx.mcp.connect(BROWSER);
    if (connection.isConnected)
      return connection.server === HELPER_SERVER_NAME ? undefined : TESTS_FAILED_TEXT;
    switch (connection.reason) {
      case "disabled":
        return INSTALL_NEEDED_TEXT;
      case "policy":
        return RUN_BLOCKED_TEXT;
      case "failed":
        return NO_TESTS_TEXT;
      default:
        return REPORT_MISSING_TEXT;
    }
  } catch (error) {
    runQuietly(() =>
      ctx.ui.log(`Claude Test: $.mcp.connect rejected: ${String(error)}`, {
        to: "debug",
      }),
    );
    return REPORT_MISSING_TEXT;
  }
}
//@ chunk-ae5g0zb5.js:105585-105616 placement
/**
 * 吞掉异常地执行
 */
function runQuietly(fn) {
  try {
    fn();
  } catch {}
}
//@ chunk-ae5g0zb5.js:105616-105680 placement
/**
 * 非 root 的 uid
 */
function isNonRootUser() {
  let uid = process.getuid?.();
  return uid !== undefined && uid !== 0;
}
//@ chunk-ae5g0zb5.js:105680-105720 placement (2.1.88 match: SUPPORTED_PLATFORMS, 0.811)
var SUPPORTED_PLATFORMS; // deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
deferInit("chunk-ae5g0zb5.js:105680", () => {
  SUPPORTED_PLATFORMS = new Set(["linux", "macos", "wsl"]);
});
//@ chunk-ae5g0zb5.js:105720-105862 placement
/**
 * Claude Test 是否可用：非 bare、合规无 HIPAA/ZDR、平台支持且开关开启。
 */
function isClaudeTestAvailable() {
  if (isBareMode() || isCustomizationDisabled("mcpAutoDiscovered")) return false;
  claudeTestGateApi.note();
  return (
    complianceTaintsSettled() &&
    !isPolicyVerdictAbsent() &&
    !hasComplianceTaint("hipaa") &&
    !hasComplianceTaint("zdr") &&
    SUPPORTED_PLATFORMS.has(getPlatform()) &&
    isNonRootUser() &&
    claudeTestGateApi.isOn()
  );
}
//@ chunk-ae5g0zb5.js:105862-105925 placement
/**
 * HostScoped 的助手标记状态
 */
var claudeTestMarkSlot; // deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
deferInit("chunk-ae5g0zb5.js:105862", () => {
  claudeTestMarkSlot = new HostScoped(() => ({
    mark: undefined,
    reload: undefined,
    outcome: undefined,
  }));
});
//@ chunk-ae5g0zb5.js:105925-105962 placement
/**
 * 取当前宿主的助手标记状态
 */
function claudeTestMarkState() {
  return claudeTestMarkSlot.of(getRootSession().host);
}
//@ chunk-ae5g0zb5.js:105962-105983 placement
var CLAUDE_TEST_3 = "claude-test";
//@ chunk-ae5g0zb5.js:105983-106044 placement
var regExp_3; // deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
deferInit("chunk-ae5g0zb5.js:105983", () => {
  regExp_3 = new RegExp(`^${CLAUDE_TEST_3}@[A-Za-z0-9][A-Za-z0-9._-]{0,39}$`);
});
//@ chunk-ae5g0zb5.js:106044-106214 placement
/**
 * 在命令列表中找到 Claude Test 插件的来源仓库。
 */
function findClaudeTestRepository(messages) {
  return messages
    .flatMap((message) =>
      message.type === "prompt" && message.pluginInfo !== undefined ? [message.pluginInfo] : [],
    )
    .find(
      (pluginInfo) =>
        pluginInfo.pluginManifest.name === CLAUDE_TEST_3 && regExp_3.test(pluginInfo.repository),
    )?.repository;
}
export {
  CLAUDE_TEST_3,
  claudeTestMarkSlot,
  pictureAskState,
  noteAppStartEnded,
  detectRunHalt,
  isClaudeTestAvailable,
  shouldShowFixing,
  isMoreTestsDeclined,
  isEarlyPhaseActive,
  isAppStartPending,
  isRunAcceptedPending,
  hasCiFlag,
  rememberRunHalt,
  claudeTestMarkState,
  noteStartAppAnswer,
  noteMoreTestsDeclinedByText,
  noteMoreTestsDeclined,
  noteRunConfirmed,
  noteAppDownWithStartAllowed,
  findClaudeTestRepository,
  registerClaudeTestCommand,
  noteAppProbeResult,
};
