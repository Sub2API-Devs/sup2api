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
  $e,
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

//@ chunk-ae5g0zb5.js:88412-92023 placement
/**
 * 注册 command.run 钩子处理 /claude-test：检查可用性、确保自有代理、打开面板并启动运行（约 3.6 KB）。
 */
function registerClaudeTestCommand(e) {
  claudeTestState.isModuleLoaded = true;
  e(
    "command.run",
    {
      command: "claude-test",
    },
    async (n, r, o) => {
      let s = await checkLoginWatch(n);
      if (s !== undefined)
        return {
          text: s,
        };
      let a = r.origin.kind === "composer" || r.origin.kind === "bridge";
      let i = a ? await claudeTestState.seatOwnAgents?.() : undefined;
      switch (i) {
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
      REMOTE_STATE.isRemote = r.origin.kind === "bridge";
      if (await markSessionWantsHelper(n)) {
        if (a) {
          claudeTestState.typedArgs = r.args;
          setPaneOpenedAt(openClaudeTestPane(n));
        }
        if (i === "listed")
          claudeTestState.agentsCheckedFor = {
            args: r.args,
            at: Date.now(),
          };
        return o(r);
      }
      if (!a)
        return {
          text: HELPER_NOT_READY_TEXT,
        };
      let c = await describeHelperListing(n, () => o.budget.remainingMs);
      if (c !== undefined)
        return {
          text: c,
        };
      claudeTestState.typedArgs = r.args;
      setPaneOpenedAt(openClaudeTestPane(n));
      if (i === "listed")
        claudeTestState.agentsCheckedFor = {
          args: r.args,
          at: Date.now(),
        };
      return o(r);
    },
  );
  e(
    "skill.prompt",
    {
      skill: $e.run,
    },
    async (n, r, o) => {
      let s = consumePaneOpenedRecently();
      let a = await checkLoginWatch(n);
      let i = takeLoadMark(r.text);
      if (a !== undefined)
        return o({
          ...r,
          text: tellPersonAndStop(a),
        });
      if (!r.text.startsWith(LOAD_MARK_PREFIX)) return o(r);
      if (i === undefined)
        return o({
          ...r,
          text: tellPersonAndStop(REQUEST_NOT_RUN_TEXT),
        });
      if (await markSessionWantsHelper(n))
        return o({
          ...r,
          text: await finishCommandOutput(n, i, s, () => o.budget.remainingMs),
        });
      if (!i.isTyped || !i.mayStillStart())
        return o({
          ...r,
          text: tellPersonAndStop(HELPER_NOT_READY_TEXT),
        });
      let c = await describeHelperListing(n, () => o.budget.remainingMs);
      if (c !== undefined)
        return o({
          ...r,
          text: tellPersonAndStop(c),
        });
      return o({
        ...r,
        text: await finishCommandOutput(n, i, s, () => o.budget.remainingMs),
      });
    },
  );
  e(
    "classic.SubagentStop",
    {
      agent_type: CLAUDE_TEST_RUNNER,
    },
    async (n, r, o) => {
      await claudeTestState.reportRuns?.();
      return o(r);
    },
  );
  e(
    "tool.call",
    {
      tool: APP_UP_ANSWER_KEY,
    },
    async (n, r, o) => {
      let s = await o(r);
      if (
        s.deny === undefined &&
        o.origin.plugin === "engine" &&
        r.agentId === undefined &&
        noteAppStartEnded(r.project, s.result, typeof r.wait === "number" && r.wait > 0)
      )
        tickClaudeTestPane(n);
      if (
        s.deny === undefined &&
        s.isError !== true &&
        o.origin.plugin === "engine" &&
        r.agentId === undefined &&
        notePortHealth(r.project, s.result)
      )
        tickClaudeTestPane(n);
      return s;
    },
  );
  e(
    "tool.call",
    {
      tool: START_APP_ANSWER_KEY,
    },
    async (n, r, o) => {
      let s = await o(r);
      if (
        s.deny === undefined &&
        s.isError !== true &&
        o.origin.plugin === "engine" &&
        r.agentId === undefined &&
        noteStartAppAnswer(r.project, s.result)
      )
        tickClaudeTestPane(n);
      return s;
    },
  );
  e(
    "tool.call",
    {
      tool: CONFIRM_RUN_ANSWER_KEY,
    },
    async (n, r, o) => {
      let s = await o(r);
      if (
        s.deny === undefined &&
        s.isError !== true &&
        o.origin.plugin === "engine" &&
        r.agentId === undefined &&
        noteRunConfirmed(r.project, s.result)
      )
        tickClaudeTestPane(n);
      return s;
    },
  );
  e(
    "tool.call",
    {
      tool: MORE_TESTS_ANSWER_KEY,
    },
    async (n, r, o) => {
      let s = await o(r);
      if (
        s.deny === undefined &&
        o.origin.plugin === "engine" &&
        r.agentId === undefined &&
        (s.isError === true
          ? noteMoreTestsDeclinedByText(r.project, s.text ?? s.result)
          : noteMoreTestsDeclined(r.project, s.result))
      )
        tickClaudeTestPane(n);
      return s;
    },
  );
  for (let n of CLAUDE_TEST_CONSENT_KINDS)
    e(
      "tool.call",
      {
        tool: `${HELPER_TOOL_PREFIX}${n}`,
      },
      async (r, o, s) => {
        if (!isEarlyPhaseActive() || o.agentId !== undefined) return s(o);
        let gate = openGate();
        try {
          return await s(o);
        } finally {
          closeGate(gate);
        }
      },
    );
  e(
    "ui.render",
    {
      component: "Pane",
      requestId: CLAUDE_TEST_2_2,
      surface: "terminal",
    },
    (n, r, o) => {
      if (r.requestId !== CLAUDE_TEST_2_2 || r.surface !== "terminal") return o(r);
      let { Box, Text, Image, Link } = n.ui.resolve(r);
      let now = Date.now();
      let S =
        helperRuntimeState.facts ??
        createOpeningFacts(
          paneState.openedAt > 0 ? paneState.openedAt : now,
          helperRuntimeState.early?.app ?? null,
          helperRuntimeState.appStarting?.isGuess === true,
          helperRuntimeState.early?.name?.name ?? null,
        );
      let w = isEarlyPhaseActive(now);
      let f = {
        ...S,
        ...(w &&
          isGateOpen() && {
            isWaitingForPerson: true,
          }),
        ...(w &&
          shouldShowFixing(claudeTestState.typedArgs, S) && {
            isFixing: true,
          }),
      };
      let finishedReportHref = getFinishedReportHref(f);
      let P = finishedReportHref === null ? 0 : 1;
      let max = Math.max(20 + PANE_PAD_LEFT + PANE_PAD_RIGHT, r.props.bodyColumns);
      let max_2 = Math.max(20, max - PANE_PAD_LEFT - PANE_PAD_RIGHT);
      let j = (r.props.scroll.bodyRows > 0 ? r.props.scroll.bodyRows : PANE_DEFAULT_WIDTH) - PANE_PAD_BOTTOM;
      let se = r.props.placement === "dock";
      let J = renderClaudeTestPane(
        f,
        now,
        max_2,
        INLINE_IMAGE_CAPS.glyphs,
        j - P,
        !INLINE_IMAGE_CAPS.opensHere,
      );
      let picture = helperRuntimeState.picture;
      let ce =
        picture === null
          ? null
          : helperRuntimeState.canDrawPictures === false
            ? null
            : fitScreenshotSize(max_2, j - totalLines(J) - P - 1);
      return Box({
        flexDirection: "column",
        justifyContent: "space-between",
        width: max,
        paddingLeft: PANE_PAD_LEFT,
        paddingRight: PANE_PAD_RIGHT,
        paddingBottom: PANE_PAD_BOTTOM,
        ...(se && {
          minHeight: j + PANE_PAD_BOTTOM,
        }),
        children: [
          Box({
            flexDirection: "column",
            children: [
              ...J.map((pe) => renderStatusLine(n, r, pe, max_2)),
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
          ...(picture === null || ce === null
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
                      columns: ce.columns,
                      rows: ce.rows,
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
function openClaudeTestPane(e) {
  try {
    if (claudeTestState.isPaneOn?.() === true) {
      helperRuntimeState.placed = e.ui
        .open({
          id: CLAUDE_TEST_2_2,
          title: CLAUDE_TEST_TITLE,
        })
        .then(
          (n) => n.isPlaced,
          () => false,
        );
      resetPaneForCommand(e);
      probePictureSupport(e);
      shouldOpenBrowser(e);
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
async function finishCommandOutput(e, n, r, o) {
  let s = r || (n.isTyped && openClaudeTestPane(e));
  if (s) trackProjectGuess(e, o() - PANE_POLL_MS > 0 ? await resolveProjectAndPermission(e) : undefined);
  let promise = new Promise(() => {
    return;
  });
  try {
    promise = !s
      ? Promise.resolve(false)
      : e.clock.sleep(Math.max(0, Math.min(PICTURE_PROBE_WAIT_MS, o() - PANE_POLL_MS))).then(
          () => false,
          () => false,
        );
  } catch {}
  let i = s && (await Promise.race([helperRuntimeState.placed ?? Promise.resolve(false), promise]));
  if (i) await waitForPictureProbe(e, Math.min(PICTURE_PROBE_WAIT_MS, o() - PANE_POLL_MS));
  let c =
    !i || REMOTE_STATE.isRemote
      ? ""
      : helperRuntimeState.canDrawPictures === false
        ? PANEL_OPEN_NO_PICTURES_RULE
        : PANEL_OPEN_RULE;
  return n.came + c;
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
function renderToneSpans(e, n, r) {
  let { Text } = e.ui.resolve(n);
  return r.map((s) =>
    Text({
      ...(s.tone !== undefined && TONE_STYLES[s.tone]),
      children: s.text,
    }),
  );
}
//@ chunk-ae5g0zb5.js:92979-93670 placement
function renderStatusLine(e, n, r, width) {
  let { Box, Text } = e.ui.resolve(n);
  switch (r.kind) {
    case "text":
      return Text({
        children: r.spans.length === 0 ? " " : renderToneSpans(e, n, r.spans),
      });
    case "row":
      return Box({
        flexDirection: "row",
        width,
        children: [
          Box({
            flexShrink: 0,
            children: Text({
              children: renderToneSpans(e, n, r.lead),
            }),
          }),
          Box({
            flexGrow: 1,
            flexShrink: 1,
            minWidth: 0,
            children: Text({
              wrap: r.wraps === true ? "wrap" : "truncate-end",
              children: renderToneSpans(e, n, r.body),
            }),
          }),
          ...(r.right === null
            ? []
            : [
                Box({
                  flexShrink: 0,
                  marginLeft: 1,
                  children: Text({
                    children: renderToneSpans(e, n, [r.right]),
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
        paddingLeft: r.indent,
        width,
        children: r.items.map((children) =>
          Box({
            flexShrink: 0,
            children: Text({
              ...(r.tone !== undefined && TONE_STYLES[r.tone]),
              children,
            }),
          }),
        ),
      });
    default:
      return r;
  }
}
//@ chunk-ae5g0zb5.js:93670-93722 placement
/**
 * 内联图片能力与是否在此打开
 */
var INLINE_IMAGE_CAPS = {
  glyphs: supportsInlineImages({
    platform: "linux",
  }),
  opensHere: true,
};
//@ chunk-ae5g0zb5.js:93722-94191 placement
async function shouldOpenBrowser(e) {
  try {
    let [n, r, o, s, a, i, c, _, S] = await Promise.all([
      e.env.get("TERM"),
      e.env.get("TERM_PROGRAM"),
      e.env.get("CLAUDE_TEST_NO_OPEN"),
      e.env.get("CI"),
      e.env.get("SSH_CONNECTION"),
      e.env.get("SSH_TTY"),
      e.env.get("SSH_CLIENT"),
      e.env.get("DISPLAY"),
      e.env.get("WAYLAND_DISPLAY"),
    ]);
    INLINE_IMAGE_CAPS.glyphs = supportsInlineImages({
      term: n,
      termProgram: r,
      platform: "linux",
    });
    INLINE_IMAGE_CAPS.opensHere = canOpenBrowser(
      {
        CLAUDE_TEST_NO_OPEN: o,
        CI: s,
        SSH_CONNECTION: a,
        SSH_TTY: i,
        SSH_CLIENT: c,
        DISPLAY: _,
        WAYLAND_DISPLAY: S,
      },
      "linux",
    );
  } catch {}
}
//@ chunk-ae5g0zb5.js:94191-94313 placement
/**
 * 窗格刷新循环状态（打开/命令时间、代数、运行者、报告链接等）。
 */
var paneState = {
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
//@ chunk-ae5g0zb5.js:94313-94426 placement
/**
 * 运行结束且报告属于本次运行时返回报告链接。
 */
function getFinishedReportHref(e) {
  let report = paneState.report;
  return e.run?.finished === true &&
    report !== null &&
    report.runId === e.runId &&
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
    let s = await claudeTestState.reportHref?.(dir, runId);
    if (s !== undefined && paneState.generation === generation)
      paneState.report = {
        runId,
        href: s,
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
var PICTURE_ASK_MIN_GAP_MS = 1000;
var pictureAskState = {
  isAsking: false,
  round: 0,
  askedAt: 0,
  firstAskedAt: 0,
  waiters: new Set(),
};
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
function probePictureSupport(e) {
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
    runQuietly(() => e.ui.invalidate("ui.render"));
    e.clock.after(100, () => sendPictureProbe(e, 12));
    e.clock.after(PICTURE_ASK_TIMEOUT_MS, () => {
      if (pictureAskState.isAsking && pictureAskState.round === round) {
        settlePictureAsk();
        runQuietly(() => e.ui.invalidate("ui.render"));
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
function sendPictureProbe(e, n) {
  if (helperRuntimeState.canDrawPictures !== null) {
    settlePictureAsk();
    return;
  }
  let r;
  try {
    r = e.ui.blit({
      requestId: CLAUDE_TEST_2_2,
      key: PROBE,
      source: PROBE_IMAGE,
    });
  } catch {
    settlePictureAsk();
    return;
  }
  r.then((o) => {
    if (o.deny === undefined) helperRuntimeState.canDrawPictures = true;
    else if (isAltTextRefusal(o.deny)) helperRuntimeState.canDrawPictures = false;
    else if (n > 0) {
      e.clock.after(250, () => sendPictureProbe(e, n - 1));
      return;
    }
    settlePictureAsk();
    runQuietly(() => e.ui.invalidate("ui.render"));
  }).catch(() => settlePictureAsk());
}
//@ chunk-ae5g0zb5.js:95667-95844 placement
/**
 * 等待画图探测结束（最多 n 毫秒）。
 */
function waitForPictureProbe(e, n) {
  if (!pictureAskState.isAsking || n <= 0) return Promise.resolve();
  return new Promise((resolve) => {
    let o = () => {
      pictureAskState.waiters.delete(o);
      resolve();
    };
    pictureAskState.waiters.add(o);
    try {
      e.clock.after(n, o);
    } catch {
      o();
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
function retryVerdictPicture(e) {
  if (helperRuntimeState.canDrawPictures !== null) return;
  e.clock.after(500, () => blitVerdictPicture(e, 5));
}
//@ chunk-ae5g0zb5.js:95944-96306 placement
/**
 * 把结论截图画到窗格，据结果更新是否能画图，失败重试。
 */
function blitVerdictPicture(e, n) {
  let picture = helperRuntimeState.picture;
  if (picture === null || helperRuntimeState.canDrawPictures !== null) return;
  pictureAskState.firstAskedAt ||= Date.now();
  e.ui
    .blit({
      requestId: CLAUDE_TEST_2_2,
      key: "verdict",
      source: {
        png: picture.png,
      },
    })
    .then((o) => {
      if (o.deny === undefined) helperRuntimeState.canDrawPictures = true;
      else if (isAltTextRefusal(o.deny)) {
        helperRuntimeState.canDrawPictures = false;
        runQuietly(() => e.ui.invalidate("ui.render"));
      } else if (n > 0) e.clock.after(1000, () => blitVerdictPicture(e, n - 1));
    })
    .catch(() => {
      return;
    });
}
//@ chunk-ae5g0zb5.js:96306-96938 placement
/**
 * 新一次命令时重置窗格与运行状态，并启动 250ms 刷新循环（每 4 拍完整刷新一次）。
 */
function resetPaneForCommand(e) {
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
  let r = 0;
  let all = e.clock.every(250, () => {
    r += 1;
    if (r % 4 === 0) tickClaudeTestPane(e);
    else runQuietly(() => e.ui.invalidate("ui.render"));
  });
  helperRuntimeState.stop = () => {
    all.cancel();
    helperRuntimeState.stop = null;
  };
  tickClaudeTestPane(e);
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
async function tickClaudeTestPane(e) {
  paneState.tickedAt = Date.now();
  if (paneState.isBusy) return;
  paneState.isBusy = true;
  let generation = paneState.generation;
  try {
    let r;
    try {
      r = await e.ui.panes();
    } catch {}
    if (
      r !== undefined &&
      !r.some((b) => b.id === CLAUDE_TEST_2_2) &&
      Date.now() - paneState.commandAt > PANE_COMMAND_STALE_MS
    ) {
      helperRuntimeState.stop?.();
      return;
    }
    let { dir, appFolder } = await resolveAppDir(e, await e.session.root(), claudeTestState.typedArgs);
    let now = Date.now();
    let runFolderFacts = await readRunFolderFacts(
      e,
      dir,
      paneState.openedAt,
      now,
      await describeRunPhase(e),
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
    let c = await claudeTestState.installNoteText?.().catch(() => {
      return;
    });
    let early = await resolveEarlyAppInfo(e, dir);
    let S = await e.agent.list().catch(() => []);
    if (paneState.generation !== generation) return;
    let w = rememberRunHalt(
      runFolderFacts.runRel === null
        ? null
        : `${dir}
${runFolderFacts.runRel}`,
      detectRunHalt(
        {
          ...runFolderFacts.facts,
          early,
        },
        S,
        paneState.runners,
        claudeTestState.typedArgs,
      ),
      runFolderFacts.facts.run?.finished === true,
      S.some((b) => regExp_2.test(b.type) && ACTIVE_TASK_STATUSES.has(b.status)),
    );
    helperRuntimeState.facts = {
      ...runFolderFacts.facts,
      openedAt: paneState.openedAt,
      readAt: now,
      appFolder,
      install: describeInstallState(c, paneState.openedAt, Date.now()),
      early,
      ...(isRunAcceptedPending(runFolderFacts.facts, dir, paneState.openedAt) && {
        isStartingRun: true,
      }),
      ...(w !== undefined && {
        halt: w,
      }),
      ...(w === undefined &&
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
      let screenshot = await readScreenshot(e, runFolderFacts.runRel, runFolderFacts.runReal, pictureStem);
      if (screenshot !== undefined && paneState.generation === generation) {
        helperRuntimeState.picture = {
          stem: pictureStem,
          png: screenshot,
        };
        retryVerdictPicture(e);
      }
    }
  } catch {
  } finally {
    paneState.isBusy = false;
    runQuietly(() => e.ui.invalidate("ui.render"));
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
function parseAnswerObject(e) {
  if (isPlainObjectNonArray(e) && [Object.prototype, null].includes(Object.getPrototypeOf(e))) return e;
  let [n, ...r] = answerTextParts(e);
  if (n === undefined || r.length > 0) return null;
  try {
    let parsed = JSON.parse(n);
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
function noteAppDownWithStartAllowed(project, n) {
  let r =
    helperRuntimeState.appStarting?.isGuess === true && helperRuntimeState.appStarting.project === project;
  if (
    typeof project !== "string" ||
    helperRuntimeState.stop === null ||
    (helperRuntimeState.appStarting !== null && !r) ||
    n === undefined ||
    hasCiFlag(claudeTestState.typedArgs)
  )
    return false;
  let o;
  try {
    let parsed = JSON.parse(n);
    o = isPlainObjectNonArray(parsed) ? parsed : null;
  } catch {
    return false;
  }
  if (
    o === null ||
    o.up !== false ||
    o.startEnded === true ||
    isPlainObjectNonArray(o.portBusy) ||
    !isPlainObjectNonArray(o.startDialog) ||
    o.startAllowed !== true
  )
    return false;
  let at = r ? helperRuntimeState.appStarting?.at : undefined;
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
function noteAppProbeResult(project, n) {
  let appStarting = helperRuntimeState.appStarting;
  let o = null;
  try {
    let s = n === undefined ? null : JSON.parse(n);
    o = isPlainObjectNonArray(s) ? s : null;
  } catch {
    o = null;
  }
  if (
    o !== null &&
    o.up === false &&
    o.startAllowed !== true &&
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
function noteAppStartEnded(project, result, r = false) {
  let appStarting = helperRuntimeState.appStarting;
  if (appStarting === null || project !== appStarting.project) return false;
  let answerObject = parseAnswerObject(result);
  if (answerObject === null || answerObject.up === true) return false;
  if (answerObject.startEnded !== true && !isPlainObjectNonArray(answerObject.portBusy) && !r) return false;
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
function isEarlyPhaseActive(e = Date.now()) {
  let facts = helperRuntimeState.facts;
  let at = helperRuntimeState.early?.at ?? 0;
  return (
    helperRuntimeState.stop !== null &&
    at > 0 &&
    e - at < EARLY_PHASE_WINDOW_MS &&
    (facts?.run?.finished !== true || facts.isKept === true) &&
    (facts?.note?.stopped ?? null) === null &&
    facts?.halt === undefined
  );
}
//@ chunk-ae5g0zb5.js:100087-100150 placement
/**
 * 带 fix 参数、非重跑且尚未开始运行时，标记为“正在修复”。
 */
function shouldShowFixing(typedArgs, n) {
  return hasFixFlag(typedArgs) && n.isFixRerun !== true && n.run === null;
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
var regExp_2 = new RegExp(`^${CLAUDE_TEST_RUNNER}(-\\d+)?$`);
var ACTIVE_TASK_STATUSES = new Set(["pending", "running", "waiting"]);
//@ chunk-ae5g0zb5.js:100314-100719 placement
/**
 * 根据后台任务状态判断运行被停止（stopped）或因应用未运行而阻塞（blocked）。
 */
function detectRunHalt(e, n, runners, typedArgs) {
  let filtered = n.filter((c) => regExp_2.test(c.type));
  for (let c of filtered) if (ACTIVE_TASK_STATUSES.has(c.status)) runners.add(c.id);
  if (e.run?.finished === true) return;
  let filtered_2 = filtered.filter((c) => runners.has(c.id));
  if (
    filtered_2.length > 0 &&
    filtered_2.every((c) => !ACTIVE_TASK_STATUSES.has(c.status)) &&
    filtered_2.some((c) => c.status === "killed")
  )
    return "stopped";
  let i = e.note?.app?.state ?? e.early?.app?.kind ?? null;
  if (hasCiFlag(typedArgs) && (e.run === null || !e.run.started) && runners.size === 0 && i === "down")
    return "blocked";
  return;
}
//@ chunk-ae5g0zb5.js:100719-100734 placement
/**
 * 记录哪些项目的运行处于“已停止”。
 */
var stoppedProjects = new Set();
//@ chunk-ae5g0zb5.js:100734-100893 placement
/**
 * 记住或清除某项目的停止状态。
 */
function rememberRunHalt(e, runHalt, r, o = false) {
  if (e !== null && o) stoppedProjects.delete(e);
  if (e !== null && runHalt === "stopped") stoppedProjects.add(e);
  if (runHalt !== undefined || r || e === null) return runHalt;
  return stoppedProjects.has(e) ? "stopped" : undefined;
}
//@ chunk-ae5g0zb5.js:100893-100974 placement
/**
 * 参数里是否有 fix
 */
function hasFixFlag(e) {
  return typeof e === "string" && e.trim().split(/\s+/).includes("fix");
}
//@ chunk-ae5g0zb5.js:100974-101084 placement
/**
 * 应用启动中且未超时。
 */
function isAppStartPending(dir, commandAt, r) {
  let appStarting = helperRuntimeState.appStarting;
  return (
    appStarting !== null &&
    appStarting.project === dir &&
    appStarting.at >= commandAt &&
    r - appStarting.at < (appStarting.isAhead === true ? APP_START_AHEAD_TIMEOUT_MS : APP_START_TIMEOUT_MS_2)
  );
}
//@ chunk-ae5g0zb5.js:101084-101226 placement
/**
 * 答案中的文本片段（字符串或 text 块）。
 */
function answerTextParts(e) {
  return typeof e === "string"
    ? [e]
    : Array.isArray(e)
      ? e.flatMap((n) =>
          isPlainObjectNonArray(n) && n.type === "text" && typeof n.text === "string" ? [n.text] : [],
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
function noteMoreTestsDeclinedByText(project, n) {
  if (helperRuntimeState.stop === null || !answerTextParts(n).some((r) => ASK_PROMPT_RE.test(r)))
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
  let s = answerObject === null ? null : parsePortHealthStatus(JSON.stringify(answerObject));
  if (early === null || s === null || project !== early.project || helperRuntimeState.stop === null)
    return false;
  helperRuntimeState.early = {
    ...early,
    app: s,
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
async function resolveEarlyAppInfo(e, dir) {
  let early = helperRuntimeState.early;
  if (early === null) return null;
  let o = early.name;
  if (o === null || o.dir !== dir) {
    o = {
      dir,
      name: await findAppPackageJson(e, dir),
    };
    if (helperRuntimeState.early?.at === early.at)
      helperRuntimeState.early = {
        ...helperRuntimeState.early,
        name: o,
      };
  }
  let app = helperRuntimeState.early?.at === early.at ? helperRuntimeState.early.app : null;
  let project = helperRuntimeState.early?.project ?? null;
  let i = project !== null && project !== dir;
  let c = app?.kind === "checking" && Date.now() - early.at > EARLY_CHECK_STALE_MS;
  return {
    name: o.name,
    app: i || c ? null : app,
  };
}
//@ chunk-ae5g0zb5.js:102555-102895 placement
/**
 * 跟踪预判的项目与权限回答，回答到达后更新应用状态并刷新窗格。
 */
function trackProjectGuess(e, n) {
  let early = helperRuntimeState.early;
  if (early === null) return;
  if (n === undefined) {
    helperRuntimeState.early = {
      ...early,
      app: null,
    };
    if (helperRuntimeState.appStarting?.isGuess === true) helperRuntimeState.appStarting = null;
    return;
  }
  helperRuntimeState.early = {
    ...early,
    project: n.project,
  };
  n.answer.then((json) => {
    let early_2 = helperRuntimeState.early;
    if (early_2?.at === early.at) {
      let a = early_2.app?.kind === "checking";
      if (!a || !noteAppDownWithStartAllowed(n.project, json)) noteAppProbeResult(n.project, json);
      if (a)
        helperRuntimeState.early = {
          ...early_2,
          app: parsePortHealthStatus(json),
        };
      tickClaudeTestPane(e);
    }
  });
}
//@ chunk-ae5g0zb5.js:102895-103412 placement
async function describeRunPhase(e) {
  let facts = helperRuntimeState.facts;
  if (facts !== null && facts.run !== null)
    return {
      isReadingCode: facts.isReadingCode,
      hasReadCode: facts.hasReadCode,
      isWritingTests: facts.isWritingTests,
    };
  let r = await e.agent.list().catch(() => []);
  let filtered = r.filter((i) => i.type === CLAUDE_TEST_EXPLORER);
  let any = r.some((i) => i.type === CLAUDE_TEST_CONDUCTOR && i.status === "running");
  let any_2 = filtered.some((i) => i.status === "running");
  paneState.sawExplorer ||= filtered.length > 0 || any;
  return {
    isReadingCode: any_2,
    hasReadCode: filtered.some((i) => i.status === "completed") || (paneState.sawExplorer && !any_2 && !any),
    isWritingTests: r.some((i) => i.type === CLAUDE_TEST_AUTHOR && i.status === "running"),
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
  let o = claudeTestState.loads.get(sliced);
  claudeTestState.loads.delete(sliced);
  return o !== undefined && Date.now() - o.issuedAt <= PANEL_OPEN_FRESH_MS
    ? {
        ...o,
        came: text.slice(index + 1),
      }
    : undefined;
}
//@ chunk-ae5g0zb5.js:103623-103706 placement
/**
 * 检查当前工具列表里是否存在浏览器助手提供的工具前缀。
 */
async function hasHelperTool(e) {
  return (await e.tool.list()).some((n) => n.name.startsWith(HELPER_TOOL_PREFIX));
}
//@ chunk-ae5g0zb5.js:103706-103868 placement
/**
 * 浏览器助手可启动时把当前会话加入需要助手的集合。
 */
async function markSessionWantsHelper(e) {
  if (!(await hasHelperTool(e))) {
    claudeTestState.hasStartedServer = false;
    return false;
  }
  let n = await e.session.id();
  if (!claudeTestState.hasStartedServer) return false;
  claudeTestState.wantedSessions.add(n);
  return true;
}
//@ chunk-ae5g0zb5.js:103868-104225 placement
async function checkLoginWatch(e) {
  if (!(await e.session.surfaces()).includes("terminal")) {
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
  let n = claudeTestState.wantedSessions.has(await e.session.id());
  if (!claudeTestState.hasStartedServer && !n && (await hasHelperTool(e))) {
    claudeTestState.report?.("other_plugin");
    return DUPLICATE_HELPER_TOOLS_TEXT;
  }
  return;
}
//@ chunk-ae5g0zb5.js:104225-105061 placement
async function describeHelperListing(e, n) {
  let { watchLogin, takeOut } = claudeTestState;
  if (watchLogin === undefined || takeOut === undefined) return LOGIN_CHECK_FAILED_TEXT;
  let s = await claudeTestState.filesReady?.();
  if (s === undefined) return ASK_IN_CHAT_TEXT;
  if (s.ignored !== undefined) {
    let f = describeHelperEnvIgnored(s.ignored);
    runQuietly(() => e.ui.log(f));
  }
  if (s.problem !== undefined) {
    claudeTestState.wantedSessions.clear();
    claudeTestState.hasStartedServer = false;
    return describeHelperFileMismatch(s.folder, s.problem, s.what);
  }
  let a = await e.session.id();
  claudeTestState.wantedSessions.add(a);
  let i = describeHelperState_2(watchLogin, takeOut);
  if (i !== undefined) return i;
  runQuietly(() => e.ui.toast(RUN_STOPPED_TEXT));
  let c = await describeAvailability(e);
  if (!claudeTestState.wantedSessions.has(a)) {
    takeOut();
    return HELPER_NOT_READY_TEXT;
  }
  if (c !== undefined) return c;
  let min = Math.min(claudeTestState.listedWaitMs, n() - PANE_POLL_MS);
  let S = await e.clock.now();
  while (!(await hasHelperTool(e))) {
    if (!claudeTestState.wantedSessions.has(a)) break;
    if ((await e.clock.now()) - S >= min) {
      claudeTestState.report?.("not_listed");
      return BROWSER_UNAVAILABLE_TEXT;
    }
    await e.clock.sleep(100);
  }
  if (!claudeTestState.wantedSessions.has(a)) {
    takeOut();
    return HELPER_NOT_READY_TEXT;
  }
  claudeTestState.hasStartedServer = true;
  let w = describeHelperState_2(watchLogin, takeOut);
  if (w !== undefined) return w;
  claudeTestState.report?.("listed");
  return;
}
//@ chunk-ae5g0zb5.js:105061-105271 placement
/**
 * 助手状态对应的提示文本（watching 时无提示）。
 */
function describeHelperState_2(watchLogin, takeOut) {
  let r = watchLogin();
  switch (r) {
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
async function describeAvailability(e) {
  try {
    let n = await e.mcp.connect(BROWSER);
    if (n.isConnected) return n.server === HELPER_SERVER_NAME ? undefined : TESTS_FAILED_TEXT;
    switch (n.reason) {
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
      e.ui.log(`Claude Test: $.mcp.connect rejected: ${String(error)}`, {
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
function runQuietly(e) {
  try {
    e();
  } catch {}
}
//@ chunk-ae5g0zb5.js:105616-105680 placement
/**
 * 非 root 的 uid
 */
function isNonRootUser() {
  let e = process.getuid?.();
  return e !== undefined && e !== 0;
}
//@ chunk-ae5g0zb5.js:105680-105720 placement = SUPPORTED_PLATFORMS (0.811)
var SUPPORTED_PLATFORMS = new Set(["linux", "macos", "wsl"]);
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
var claudeTestMarkSlot = new HostScoped(() => ({
  mark: undefined,
  reload: undefined,
  outcome: undefined,
}));
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
var regExp_3 = new RegExp(`^${CLAUDE_TEST_3}@[A-Za-z0-9][A-Za-z0-9._-]{0,39}$`);
//@ chunk-ae5g0zb5.js:106044-106214 placement
/**
 * 在命令列表中找到 Claude Test 插件的来源仓库。
 */
function findClaudeTestRepository(e) {
  return e
    .flatMap((n) => (n.type === "prompt" && n.pluginInfo !== undefined ? [n.pluginInfo] : []))
    .find((n) => n.pluginManifest.name === CLAUDE_TEST_3 && regExp_3.test(n.repository))?.repository;
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
