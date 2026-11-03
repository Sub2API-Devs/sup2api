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
import { claudeTestState, RUN_ID_RE, G } from "./appFacts.js";
import {
  Ht,
  jt,
  HELPER_NOT_READY_TEXT,
  Pe,
  LOAD_MARK_PREFIX,
  Mn,
  Gn,
  Gt,
  CLAUDE_TEST_TITLE,
  na,
  Bn,
  Wn,
  jn,
  CLI_ONLY_TEXT,
  ct,
  ut,
  Me,
  xn,
  Cn,
  describeHelperEnvIgnored,
  describeHelperFileMismatch,
  vn,
  Pn,
  In,
  Ln,
  kn,
  Nn,
  Wt,
} from "./messages.js";
import {
  freeze,
  CLAUDE_TEST_RUNNER,
  u0e,
  CLAUDE_TEST_2 as CLAUDE_TEST_2_2,
  CLAUDE_TEST_APP_UP,
  CLAUDE_TEST_EXPLORER,
  CLAUDE_TEST_CONDUCTOR,
  CLAUDE_TEST_AUTHOR,
  BROWSER,
  IZ,
} from "./constants.js";
import { Ui, Bi, $i, Xi, resolveProjectAndPermission, Vi, An } from "./consent.js";
import {
  y,
  fitScreenshotSize,
  Si,
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
import { kr, renderClaudeTestPane, Se } from "./panelView.js";
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

/**
 * 注册 command.run 钩子处理 /claude-test：检查可用性、确保自有代理、打开面板并启动运行（约 3.6 KB）。
 */
//@ chunk-ae5g0zb5.js:88412-92023 placement
function registerClaudeTestCommand(e) {
  ((claudeTestState.isModuleLoaded = !0),
    e("command.run", { command: "claude-test" }, async (n, r, o) => {
      let s = await checkLoginWatch(n);
      if (s !== void 0) return { text: s };
      let a = r.origin.kind === "composer" || r.origin.kind === "bridge",
        i = a ? await claudeTestState.seatOwnAgents?.() : void 0;
      switch (i) {
        case "missing":
          return { text: Ht };
        case "reading":
          return { text: jt };
        default:
          break;
      }
      if (((oa.isRemote = r.origin.kind === "bridge"), await markSessionWantsHelper(n))) {
        if (a) ((claudeTestState.typedArgs = r.args), Ki(openClaudeTestPane(n)));
        if (i === "listed") claudeTestState.agentsCheckedFor = { args: r.args, at: Date.now() };
        return o(r);
      }
      if (!a) return { text: HELPER_NOT_READY_TEXT };
      let c = await describeHelperListing(n, () => o.budget.remainingMs);
      if (c !== void 0) return { text: c };
      if (((claudeTestState.typedArgs = r.args), Ki(openClaudeTestPane(n)), i === "listed"))
        claudeTestState.agentsCheckedFor = { args: r.args, at: Date.now() };
      return o(r);
    }),
    e("skill.prompt", { skill: freeze.run }, async (n, r, o) => {
      let s = _u(),
        a = await checkLoginWatch(n),
        i = takeLoadMark(r.text);
      if (a !== void 0) return o({ ...r, text: Pe(a) });
      if (!r.text.startsWith(LOAD_MARK_PREFIX)) return o(r);
      if (i === void 0) return o({ ...r, text: Pe(Mn) });
      if (await markSessionWantsHelper(n))
        return o({ ...r, text: await finishCommandOutput(n, i, s, () => o.budget.remainingMs) });
      if (!i.isTyped || !i.mayStillStart()) return o({ ...r, text: Pe(HELPER_NOT_READY_TEXT) });
      let c = await describeHelperListing(n, () => o.budget.remainingMs);
      if (c !== void 0) return o({ ...r, text: Pe(c) });
      return o({ ...r, text: await finishCommandOutput(n, i, s, () => o.budget.remainingMs) });
    }),
    e(
      "classic.SubagentStop",
      { agent_type: CLAUDE_TEST_RUNNER },
      async (n, r, o) => (await claudeTestState.reportRuns?.(), o(r)),
    ),
    e("tool.call", { tool: APP_UP_ANSWER_KEY }, async (n, r, o) => {
      let s = await o(r);
      if (
        s.deny === void 0 &&
        o.origin.plugin === "engine" &&
        r.agentId === void 0 &&
        noteAppStartEnded(r.project, s.result, typeof r.wait === "number" && r.wait > 0)
      )
        tickClaudeTestPane(n);
      if (
        s.deny === void 0 &&
        s.isError !== !0 &&
        o.origin.plugin === "engine" &&
        r.agentId === void 0 &&
        notePortHealth(r.project, s.result)
      )
        tickClaudeTestPane(n);
      return s;
    }),
    e("tool.call", { tool: START_APP_ANSWER_KEY }, async (n, r, o) => {
      let s = await o(r);
      if (
        s.deny === void 0 &&
        s.isError !== !0 &&
        o.origin.plugin === "engine" &&
        r.agentId === void 0 &&
        noteStartAppAnswer(r.project, s.result)
      )
        tickClaudeTestPane(n);
      return s;
    }),
    e("tool.call", { tool: CONFIRM_RUN_ANSWER_KEY }, async (n, r, o) => {
      let s = await o(r);
      if (
        s.deny === void 0 &&
        s.isError !== !0 &&
        o.origin.plugin === "engine" &&
        r.agentId === void 0 &&
        noteRunConfirmed(r.project, s.result)
      )
        tickClaudeTestPane(n);
      return s;
    }),
    e("tool.call", { tool: MORE_TESTS_ANSWER_KEY }, async (n, r, o) => {
      let s = await o(r);
      if (
        s.deny === void 0 &&
        o.origin.plugin === "engine" &&
        r.agentId === void 0 &&
        (s.isError === !0
          ? noteMoreTestsDeclinedByText(r.project, s.text ?? s.result)
          : noteMoreTestsDeclined(r.project, s.result))
      )
        tickClaudeTestPane(n);
      return s;
    }));
  for (let n of Ui)
    e("tool.call", { tool: `${u0e}${n}` }, async (r, o, s) => {
      if (!isEarlyPhaseActive() || o.agentId !== void 0) return s(o);
      let a = Bi();
      try {
        return await s(o);
      } finally {
        $i(a);
      }
    });
  e("ui.render", { component: "Pane", requestId: CLAUDE_TEST_2_2, surface: "terminal" }, (n, r, o) => {
    if (r.requestId !== CLAUDE_TEST_2_2 || r.surface !== "terminal") return o(r);
    let { Box: Box, Text: Text, Image: Image, Link: Link } = n.ui.resolve(r),
      now = Date.now(),
      S =
        y.facts ??
        createOpeningFacts(
          paneState.openedAt > 0 ? paneState.openedAt : now,
          y.early?.app ?? null,
          y.appStarting?.isGuess === !0,
          y.early?.name?.name ?? null,
        ),
      w = isEarlyPhaseActive(now),
      f = {
        ...S,
        ...(w && Xi() && { isWaitingForPerson: !0 }),
        ...(w && lo(claudeTestState.typedArgs, S) && { isFixing: !0 }),
      },
      b = getFinishedReportHref(f),
      P = b === null ? 0 : 1,
      max = Math.max(20 + Zr + Qr, r.props.bodyColumns),
      max_2 = Math.max(20, max - Zr - Qr),
      j = (r.props.scroll.bodyRows > 0 ? r.props.scroll.bodyRows : kr) - eo,
      se = r.props.placement === "dock",
      J = renderClaudeTestPane(f, now, max_2, Ut.glyphs, j - P, !Ut.opensHere),
      picture = y.picture,
      ce =
        picture === null
          ? null
          : y.canDrawPictures === !1
            ? null
            : fitScreenshotSize(max_2, j - Se(J) - P - 1);
    return Box({
      flexDirection: "column",
      justifyContent: "space-between",
      width: max,
      paddingLeft: Zr,
      paddingRight: Qr,
      paddingBottom: eo,
      ...(se && { minHeight: j + eo }),
      children: [
        Box({
          flexDirection: "column",
          children: [
            ...J.map((pe) => renderStatusLine(n, r, pe, max_2)),
            ...(b === null ? [] : [Text({ children: [Link({ href: b, children: Gn })] })]),
          ],
        }),
        ...(y.canDrawPictures === null && z.isAsking
          ? [
              Box({
                position: "absolute",
                top: 0,
                left: 0,
                children: [Image({ key: PROBE, source: aa, columns: 1, rows: 1, alt: Gt })],
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
                    source: { png: picture.png },
                    columns: ce.columns,
                    rows: ce.rows,
                    alt: Gt,
                  }),
                ],
              }),
            ]),
      ],
    });
  });
}
/**
 * 面板开关开启时打开 Claude Test 窗格（记录 placed 承诺），重置面板状态、探测能否画图并决定是否打开浏览器。
 */
//@ chunk-ae5g0zb5.js:92023-92176 placement
function openClaudeTestPane(e) {
  try {
    if (claudeTestState.isPaneOn?.() === !0)
      return (
        (y.placed = e.ui.open({ id: CLAUDE_TEST_2_2, title: CLAUDE_TEST_TITLE }).then(
          (n) => n.isPlaced,
          () => !1,
        )),
        resetPaneForCommand(e),
        probePictureSupport(e),
        shouldOpenBrowser(e),
        !0
      );
  } catch {}
  return !1;
}
//@ chunk-ae5g0zb5.js:92176-92197 placement
var oa = { isRemote: !1 };
//@ chunk-ae5g0zb5.js:92197-92242 placement
function Ki(e) {
  claudeTestState.paneOpenedAt = e ? Date.now() : 0;
}
//@ chunk-ae5g0zb5.js:92242-92323 placement
function _u() {
  let paneOpenedAt = claudeTestState.paneOpenedAt;
  return ((claudeTestState.paneOpenedAt = 0), paneOpenedAt > 0 && Date.now() - paneOpenedAt <= na);
}
/**
 * /claude-test 命令输出收尾：必要时打开窗格、预判项目并等待窗格放置/画图探测，返回命令文本加画图提示。
 */
//@ chunk-ae5g0zb5.js:92323-92720 placement
async function finishCommandOutput(e, n, r, o) {
  let s = r || (n.isTyped && openClaudeTestPane(e));
  if (s) trackProjectGuess(e, o() - Bn > 0 ? await resolveProjectAndPermission(e) : void 0);
  let promise = new Promise(() => {
    return;
  });
  try {
    promise = !s
      ? Promise.resolve(!1)
      : e.clock.sleep(Math.max(0, Math.min(qi, o() - Bn))).then(
          () => !1,
          () => !1,
        );
  } catch {}
  let i = s && (await Promise.race([y.placed ?? Promise.resolve(!1), promise]));
  if (i) await waitForPictureProbe(e, Math.min(qi, o() - Bn));
  let c = !i || oa.isRemote ? "" : y.canDrawPictures === !1 ? Wn : jn;
  return n.came + c;
}
/**
 * 文本色调名到 Text 样式属性的映射。
 */
//@ chunk-ae5g0zb5.js:92720-92861 placement
var TONE_STYLES = {
  title: { bold: !0 },
  dim: { dimColor: !0 },
  success: { color: "success" },
  error: { color: "error" },
  warning: { color: "warning" },
  claude: { color: "claude" },
};
/**
 * 把带色调的文本片段渲染成 Text 元素。
 */
//@ chunk-ae5g0zb5.js:92861-92979 placement
function renderToneSpans(e, n, r) {
  let { Text: Text } = e.ui.resolve(n);
  return r.map((s) => Text({ ...(s.tone !== void 0 && TONE_STYLES[s.tone]), children: s.text }));
}
//@ chunk-ae5g0zb5.js:92979-93670 placement
function renderStatusLine(e, n, r, o) {
  let { Box: Box, Text: Text } = e.ui.resolve(n);
  switch (r.kind) {
    case "text":
      return Text({ children: r.spans.length === 0 ? " " : renderToneSpans(e, n, r.spans) });
    case "row":
      return Box({
        flexDirection: "row",
        width: o,
        children: [
          Box({ flexShrink: 0, children: Text({ children: renderToneSpans(e, n, r.lead) }) }),
          Box({
            flexGrow: 1,
            flexShrink: 1,
            minWidth: 0,
            children: Text({
              wrap: r.wraps === !0 ? "wrap" : "truncate-end",
              children: renderToneSpans(e, n, r.body),
            }),
          }),
          ...(r.right === null
            ? []
            : [
                Box({
                  flexShrink: 0,
                  marginLeft: 1,
                  children: Text({ children: renderToneSpans(e, n, [r.right]) }),
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
        width: o,
        children: r.items.map((item) =>
          Box({
            flexShrink: 0,
            children: Text({ ...(r.tone !== void 0 && TONE_STYLES[r.tone]), children: item }),
          }),
        ),
      });
    default:
      return r;
  }
}
//@ chunk-ae5g0zb5.js:93670-93722 placement
var Ut = { glyphs: supportsInlineImages({ platform: "linux" }), opensHere: !0 };
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
    ((Ut.glyphs = supportsInlineImages({ term: n, termProgram: r, platform: "linux" })),
      (Ut.opensHere = canOpenBrowser(
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
      )));
  } catch {}
}
/**
 * 窗格刷新循环状态（打开/命令时间、代数、运行者、报告链接等）。
 */
//@ chunk-ae5g0zb5.js:94191-94313 placement
var paneState = {
  openedAt: 0,
  commandAt: 0,
  generation: 0,
  sawExplorer: !1,
  drawnRun: null,
  runners: new Set(),
  isBusy: !1,
  tickedAt: 0,
  report: null,
};
/**
 * 运行结束且报告属于本次运行时返回报告链接。
 */
//@ chunk-ae5g0zb5.js:94313-94426 placement
function getFinishedReportHref(e) {
  let report = paneState.report;
  return e.run?.finished === !0 && report !== null && report.runId === e.runId && Ut.opensHere
    ? report.href
    : null;
}
/**
 * 运行结束后取一次报告链接（代数不变才写入）。
 */
//@ chunk-ae5g0zb5.js:94426-94653 placement
async function fetchReportHref(e, n, r) {
  let runId = n.runId;
  if (
    n.run?.finished !== !0 ||
    typeof runId !== "string" ||
    !RUN_ID_RE.test(runId) ||
    paneState.report?.runId === runId
  )
    return;
  try {
    let s = await claudeTestState.reportHref?.(e, runId);
    if (s !== void 0 && paneState.generation === r) paneState.report = { runId: runId, href: s };
  } catch {}
}
//@ chunk-ae5g0zb5.js:94653-94722 placement
var PROBE = "probe",
  aa = { rgba: "AAAAAA==", width: 1, height: 1 },
  qi = 2500,
  Ji = 5000;
/**
 * 画图被拒的原因是否为“只支持 alt 文本”（且已等待足够久）。
 */
//@ chunk-ae5g0zb5.js:94722-94827 placement
function isAltTextRefusal(e) {
  return /\balt\b/.test(e) && !/\bimage id is in use\b/.test(e) && Date.now() - z.firstAskedAt >= Su;
}
//@ chunk-ae5g0zb5.js:94827-94904 placement
var Su = 1000,
  z = { isAsking: !1, round: 0, askedAt: 0, firstAskedAt: 0, waiters: new Set() };
//@ chunk-ae5g0zb5.js:94904-94977 placement
function pt() {
  z.isAsking = !1;
  for (let waiter of z.waiters) waiter();
  z.waiters.clear();
}
/**
 * 开始探测终端能否显示图片：触发重绘、稍后发送探测图，超时则放弃。
 */
//@ chunk-ae5g0zb5.js:94977-95329 placement
function probePictureSupport(e) {
  if (y.canDrawPictures !== null || (z.isAsking && Date.now() - z.askedAt < Ji)) return;
  ((z.isAsking = !0), (z.askedAt = Date.now()), (z.firstAskedAt ||= z.askedAt), (z.round += 1));
  let round = z.round;
  try {
    (Le(() => e.ui.invalidate("ui.render")),
      e.clock.after(100, () => sendPictureProbe(e, 12)),
      e.clock.after(Ji, () => {
        if (z.isAsking && z.round === round) (pt(), Le(() => e.ui.invalidate("ui.render")));
      }));
  } catch {
    pt();
  }
}
/**
 * 发送探测图片并据结果设置 canDrawPictures，未决时重试 n 次。
 */
//@ chunk-ae5g0zb5.js:95329-95667 placement
function sendPictureProbe(e, n) {
  if (y.canDrawPictures !== null) {
    pt();
    return;
  }
  let r;
  try {
    r = e.ui.blit({ requestId: CLAUDE_TEST_2_2, key: PROBE, source: aa });
  } catch {
    pt();
    return;
  }
  r.then((o) => {
    if (o.deny === void 0) y.canDrawPictures = !0;
    else if (isAltTextRefusal(o.deny)) y.canDrawPictures = !1;
    else if (n > 0) {
      e.clock.after(250, () => sendPictureProbe(e, n - 1));
      return;
    }
    (pt(), Le(() => e.ui.invalidate("ui.render")));
  }).catch(() => pt());
}
/**
 * 等待画图探测结束（最多 n 毫秒）。
 */
//@ chunk-ae5g0zb5.js:95667-95844 placement
function waitForPictureProbe(e, n) {
  if (!z.isAsking || n <= 0) return Promise.resolve();
  return new Promise((r) => {
    let o = () => {
      (z.waiters.delete(o), r());
    };
    z.waiters.add(o);
    try {
      e.clock.after(n, o);
    } catch {
      o();
    }
  });
}
//@ chunk-ae5g0zb5.js:95844-95863 placement
var Zr = 2,
  Qr = 1,
  eo = 1;
//@ chunk-ae5g0zb5.js:95863-95944 placement
function Ru(e) {
  if (y.canDrawPictures !== null) return;
  e.clock.after(500, () => blitVerdictPicture(e, 5));
}
/**
 * 把结论截图画到窗格，据结果更新是否能画图，失败重试。
 */
//@ chunk-ae5g0zb5.js:95944-96306 placement
function blitVerdictPicture(e, n) {
  let picture = y.picture;
  if (picture === null || y.canDrawPictures !== null) return;
  ((z.firstAskedAt ||= Date.now()),
    e.ui
      .blit({ requestId: CLAUDE_TEST_2_2, key: "verdict", source: { png: picture.png } })
      .then((o) => {
        if (o.deny === void 0) y.canDrawPictures = !0;
        else if (isAltTextRefusal(o.deny)) ((y.canDrawPictures = !1), Le(() => e.ui.invalidate("ui.render")));
        else if (n > 0) e.clock.after(1000, () => blitVerdictPicture(e, n - 1));
      })
      .catch(() => {
        return;
      }));
}
/**
 * 新一次命令时重置窗格与运行状态，并启动 250ms 刷新循环（每 4 拍完整刷新一次）。
 */
//@ chunk-ae5g0zb5.js:96306-96938 placement
function resetPaneForCommand(e) {
  ((paneState.openedAt = Date.now()),
    (paneState.commandAt = paneState.openedAt),
    (paneState.generation += 1),
    (paneState.sawExplorer = !1),
    (paneState.drawnRun = null),
    (paneState.runners = new Set()),
    (paneState.report = null),
    (y.facts = null),
    (y.picture = null),
    (y.runAccepted = null));
  let rememberedStart = y.rememberedStart;
  if (
    ((y.appStarting =
      rememberedStart === null || $t(claudeTestState.typedArgs)
        ? null
        : { project: rememberedStart, at: paneState.openedAt, isAhead: !0, isGuess: !0 }),
    (y.moreDeclined = null),
    Si(),
    Vi(),
    (y.early = {
      at: paneState.openedAt,
      project: null,
      app: { kind: "checking" },
      name: y.early?.name ?? null,
    }),
    y.stop !== null && Date.now() - paneState.tickedAt < xu)
  )
    return;
  try {
    y.stop?.();
  } catch {}
  let r = 0,
    all = e.clock.every(250, () => {
      if (((r += 1), r % 4 === 0)) tickClaudeTestPane(e);
      else Le(() => e.ui.invalidate("ui.render"));
    });
  ((y.stop = () => {
    (all.cancel(), (y.stop = null));
  }),
    tickClaudeTestPane(e));
}
//@ chunk-ae5g0zb5.js:96938-96958 placement
var xu = 5000,
  Pu = 5000;
/**
 * 面板刷新：读取运行目录、更新视图、面板关闭超时后停止。
 */
//@ chunk-ae5g0zb5.js:96958-98343 placement
async function tickClaudeTestPane(e) {
  if (((paneState.tickedAt = Date.now()), paneState.isBusy)) return;
  paneState.isBusy = !0;
  let generation = paneState.generation;
  try {
    let r;
    try {
      r = await e.ui.panes();
    } catch {}
    if (r !== void 0 && !r.some((b) => b.id === CLAUDE_TEST_2_2) && Date.now() - paneState.commandAt > Pu) {
      y.stop?.();
      return;
    }
    let { dir: dir, appFolder: appFolder } = await resolveAppDir(
        e,
        await e.session.root(),
        claudeTestState.typedArgs,
      ),
      now = Date.now(),
      i = await readRunFolderFacts(
        e,
        dir,
        paneState.openedAt,
        now,
        await describeRunPhase(e),
        fa(claudeTestState.typedArgs),
      );
    if (paneState.generation !== generation) return;
    if (i.runRel !== null && i.runRel !== paneState.drawnRun) {
      if (paneState.drawnRun !== null) ((paneState.openedAt = now), (y.picture = null));
      ((paneState.drawnRun = i.runRel), (paneState.runners = new Set()));
    }
    let c = await claudeTestState.installNoteText?.().catch(() => {
        return;
      }),
      _ = await resolveEarlyAppInfo(e, dir),
      S = await e.agent.list().catch(() => []);
    if (paneState.generation !== generation) return;
    let w = rememberRunHalt(
      i.runRel === null
        ? null
        : `${dir}
${i.runRel}`,
      detectRunHalt({ ...i.facts, early: _ }, S, paneState.runners, claudeTestState.typedArgs),
      i.facts.run?.finished === !0,
      S.some((b) => regExp_2.test(b.type) && ro.has(b.status)),
    );
    ((y.facts = {
      ...i.facts,
      openedAt: paneState.openedAt,
      readAt: now,
      appFolder: appFolder,
      install: describeInstallState(c, paneState.openedAt, Date.now()),
      early: _,
      ...(isRunAcceptedPending(i.facts, dir, paneState.openedAt) && { isStartingRun: !0 }),
      ...(w !== void 0 && { halt: w }),
      ...(w === void 0 && isAppStartPending(dir, paneState.commandAt, Date.now()) && { isStartingApp: !0 }),
      ...(isMoreTestsDeclined(dir, i.runRel) && { isMoreDeclined: !0 }),
    }),
      await fetchReportHref(dir, i.facts, generation));
    let pictureStem = i.pictureStem;
    if (pictureStem !== null && i.runRel !== null && i.runReal !== null && y.picture?.stem !== pictureStem) {
      let b = await readScreenshot(e, i.runRel, i.runReal, pictureStem);
      if (b !== void 0 && paneState.generation === generation)
        ((y.picture = { stem: pictureStem, png: b }), Ru(e));
    }
  } catch {
  } finally {
    ((paneState.isBusy = !1), Le(() => e.ui.invalidate("ui.render")));
  }
}
/**
 * 面板向会话提问的答案键与超时。
 */
//@ chunk-ae5g0zb5.js:98343-98486 placement
var APP_UP_ANSWER_KEY = `${u0e}${CLAUDE_TEST_APP_UP}`,
  CONFIRM_RUN_ANSWER_KEY = `${u0e}claude_test_confirm_run`,
  MORE_TESTS_ANSWER_KEY = `${u0e}claude_test_more_tests`,
  START_APP_ANSWER_KEY = `${u0e}claude_test_start_app`,
  APP_START_TIMEOUT_MS = 300000,
  APP_START_AHEAD_TIMEOUT_MS = 60000;
/**
 * 工具答案（对象、字符串或单个 text 块）解析为普通对象，否则 null。
 */
//@ chunk-ae5g0zb5.js:98486-98696 placement
function parseAnswerObject(e) {
  if (G(e) && [Object.prototype, null].includes(Object.getPrototypeOf(e))) return e;
  let [n, ...r] = answerTextParts(e);
  if (n === void 0 || r.length > 0) return null;
  try {
    let parsed = JSON.parse(n);
    return G(parsed) ? parsed : null;
  } catch {
    return null;
  }
}
/**
 * 记录“启动应用”问题的回答：start 时标记应用正在启动并记住项目。
 */
//@ chunk-ae5g0zb5.js:98696-98954 placement
function noteStartAppAnswer(e, n) {
  if (typeof e !== "string" || y.stop === null) return !1;
  let r = parseAnswerObject(n);
  if (r === null) return !1;
  if (r.answer !== "start") {
    if (y.appStarting?.project !== e) return !1;
    return ((y.appStarting = null), !0);
  }
  return ((y.appStarting = { project: e, at: Date.now() }), (y.rememberedStart = e), !0);
}
/**
 * 应用未运行但允许启动时，提前标记为启动中。
 */
//@ chunk-ae5g0zb5.js:98954-99416 placement
function noteAppDownWithStartAllowed(e, n) {
  let r = y.appStarting?.isGuess === !0 && y.appStarting.project === e;
  if (
    typeof e !== "string" ||
    y.stop === null ||
    (y.appStarting !== null && !r) ||
    n === void 0 ||
    $t(claudeTestState.typedArgs)
  )
    return !1;
  let o;
  try {
    let parsed = JSON.parse(n);
    o = G(parsed) ? parsed : null;
  } catch {
    return !1;
  }
  if (
    o === null ||
    o.up !== !1 ||
    o.startEnded === !0 ||
    G(o.portBusy) ||
    !G(o.startDialog) ||
    o.startAllowed !== !0
  )
    return !1;
  let s = r ? y.appStarting?.at : void 0;
  return ((y.appStarting = { project: e, at: s ?? Date.now(), isAhead: !0 }), (y.rememberedStart = e), !0);
}
/**
 * 应用探测结果：不允许启动时忘记记住的项目；撤销猜测的启动状态。
 */
//@ chunk-ae5g0zb5.js:99416-99689 placement
function noteAppProbeResult(e, n) {
  let appStarting = y.appStarting,
    o = null;
  try {
    let s = n === void 0 ? null : JSON.parse(n);
    o = G(s) ? s : null;
  } catch {
    o = null;
  }
  if (o !== null && o.up === !1 && o.startAllowed !== !0 && y.rememberedStart === e) y.rememberedStart = null;
  if (appStarting?.isGuess !== !0 || appStarting.project !== e) return !1;
  return ((y.appStarting = null), !0);
}
/**
 * 应用启动结束（或端口被占）时清除启动中状态。
 */
//@ chunk-ae5g0zb5.js:99689-99890 placement
function noteAppStartEnded(e, n, r = !1) {
  let appStarting = y.appStarting;
  if (appStarting === null || e !== appStarting.project) return !1;
  let s = parseAnswerObject(n);
  if (s === null || s.up === !0) return !1;
  if (s.startEnded !== !0 && !G(s.portBusy) && !r) return !1;
  return ((y.appStarting = null), !0);
}
//@ chunk-ae5g0zb5.js:99890-99905 placement
var Cu = 3600000;
/**
 * 面板早期阶段是否仍在进行（时间窗内且运行未结束/未停止）。
 */
//@ chunk-ae5g0zb5.js:99905-100087 placement
function isEarlyPhaseActive(e = Date.now()) {
  let facts = y.facts,
    r = y.early?.at ?? 0;
  return (
    y.stop !== null &&
    r > 0 &&
    e - r < Cu &&
    (facts?.run?.finished !== !0 || facts.isKept === !0) &&
    (facts?.note?.stopped ?? null) === null &&
    facts?.halt === void 0
  );
}
//@ chunk-ae5g0zb5.js:100087-100150 placement
function lo(e, n) {
  return fa(e) && n.isFixRerun !== !0 && n.run === null;
}
//@ chunk-ae5g0zb5.js:100150-100232 placement
function $t(e) {
  return typeof e === "string" && e.trim().split(/\s+/).includes("--ci");
}
//@ chunk-ae5g0zb5.js:100232-100314 placement
var regExp_2 = new RegExp(`^${CLAUDE_TEST_RUNNER}(-\\d+)?$`),
  ro = new Set(["pending", "running", "waiting"]);
/**
 * 根据后台任务状态判断运行被停止（stopped）或因应用未运行而阻塞（blocked）。
 */
//@ chunk-ae5g0zb5.js:100314-100719 placement
function detectRunHalt(e, n, r, o) {
  let filtered = n.filter((c) => regExp_2.test(c.type));
  for (let c of filtered) if (ro.has(c.status)) r.add(c.id);
  if (e.run?.finished === !0) return;
  let filtered_2 = filtered.filter((c) => r.has(c.id));
  if (
    filtered_2.length > 0 &&
    filtered_2.every((c) => !ro.has(c.status)) &&
    filtered_2.some((c) => c.status === "killed")
  )
    return "stopped";
  let i = e.note?.app?.state ?? e.early?.app?.kind ?? null;
  if ($t(o) && (e.run === null || !e.run.started) && r.size === 0 && i === "down") return "blocked";
  return;
}
//@ chunk-ae5g0zb5.js:100719-100734 placement
var to = new Set();
/**
 * 记住或清除某项目的停止状态。
 */
//@ chunk-ae5g0zb5.js:100734-100893 placement
function rememberRunHalt(e, n, r, o = !1) {
  if (e !== null && o) to.delete(e);
  if (e !== null && n === "stopped") to.add(e);
  if (n !== void 0 || r || e === null) return n;
  return to.has(e) ? "stopped" : void 0;
}
//@ chunk-ae5g0zb5.js:100893-100974 placement
function fa(e) {
  return typeof e === "string" && e.trim().split(/\s+/).includes("fix");
}
/**
 * 应用启动中且未超时。
 */
//@ chunk-ae5g0zb5.js:100974-101084 placement
function isAppStartPending(e, n, r) {
  let appStarting = y.appStarting;
  return (
    appStarting !== null &&
    appStarting.project === e &&
    appStarting.at >= n &&
    r - appStarting.at < (appStarting.isAhead === !0 ? APP_START_AHEAD_TIMEOUT_MS : APP_START_TIMEOUT_MS)
  );
}
/**
 * 答案中的文本片段（字符串或 text 块）。
 */
//@ chunk-ae5g0zb5.js:101084-101226 placement
function answerTextParts(e) {
  return typeof e === "string"
    ? [e]
    : Array.isArray(e)
      ? e.flatMap((n) => (G(n) && n.type === "text" && typeof n.text === "string" ? [n.text] : []))
      : [];
}
/**
 * 记录用户确认运行。
 */
//@ chunk-ae5g0zb5.js:101226-101363 placement
function noteRunConfirmed(e, n) {
  if (typeof e !== "string" || parseAnswerObject(n)?.answer !== "run" || y.stop === null) return !1;
  return ((y.runAccepted = { project: e, at: Date.now() }), !0);
}
/**
 * 记录“更多测试”问题被拒绝或回答。
 */
//@ chunk-ae5g0zb5.js:101363-101592 placement
function noteMoreTestsDeclined(e, n) {
  if (typeof e !== "string" || y.stop === null) return !1;
  let r = parseAnswerObject(n);
  if (r === null || !("answer" in r) || !(r.answer === "run" || r.answer === "not-now" || r.answer === null))
    return !1;
  return ((y.moreDeclined = { project: e, runRel: paneState.drawnRun }), !0);
}
//@ chunk-ae5g0zb5.js:101592-101656 placement
var Du = /\bAsk (?:with AskUserQuestion|as the run skill says)\b/;
/**
 * 文本回答匹配拒绝时记录“更多测试”被拒。
 */
//@ chunk-ae5g0zb5.js:101656-101809 placement
function noteMoreTestsDeclinedByText(e, n) {
  if (y.stop === null || !answerTextParts(n).some((r) => Du.test(r))) return !1;
  return ((y.moreDeclined = { project: typeof e === "string" ? e : null, runRel: paneState.drawnRun }), !0);
}
/**
 * 当前运行是否已拒绝“更多测试”。
 */
//@ chunk-ae5g0zb5.js:101809-101922 placement
function isMoreTestsDeclined(e, n) {
  let moreDeclined = y.moreDeclined;
  return (
    moreDeclined !== null &&
    n !== null &&
    (moreDeclined.project === null || moreDeclined.project === e) &&
    moreDeclined.runRel === n
  );
}
/**
 * 运行已确认但尚未开始。
 */
//@ chunk-ae5g0zb5.js:101922-102034 placement
function isRunAcceptedPending(e, n, r) {
  let runAccepted = y.runAccepted;
  return (
    runAccepted !== null &&
    runAccepted.project === n &&
    runAccepted.at >= r &&
    e.run === null &&
    e.isLaterRun !== !0
  );
}
/**
 * 把端口健康检查结果写入早期状态。
 */
//@ chunk-ae5g0zb5.js:102034-102203 placement
function notePortHealth(e, n) {
  let early = y.early,
    o = parseAnswerObject(n),
    s = o === null ? null : parsePortHealthStatus(JSON.stringify(o));
  if (early === null || s === null || e !== early.project || y.stop === null) return !1;
  return ((y.early = { ...early, app: s }), !0);
}
//@ chunk-ae5g0zb5.js:102203-102214 placement
var Mu = 1e4;
/**
 * 早期阶段的应用名（按目录缓存 package.json 名称）与应用状态。
 */
//@ chunk-ae5g0zb5.js:102214-102555 placement
async function resolveEarlyAppInfo(e, n) {
  let early = y.early;
  if (early === null) return null;
  let o = early.name;
  if (o === null || o.dir !== n) {
    if (((o = { dir: n, name: await findAppPackageJson(e, n) }), y.early?.at === early.at))
      y.early = { ...y.early, name: o };
  }
  let s = y.early?.at === early.at ? y.early.app : null,
    a = y.early?.project ?? null,
    i = a !== null && a !== n,
    c = s?.kind === "checking" && Date.now() - early.at > Mu;
  return { name: o.name, app: i || c ? null : s };
}
/**
 * 跟踪预判的项目与权限回答，回答到达后更新应用状态并刷新窗格。
 */
//@ chunk-ae5g0zb5.js:102555-102895 placement
function trackProjectGuess(e, n) {
  let early = y.early;
  if (early === null) return;
  if (n === void 0) {
    if (((y.early = { ...early, app: null }), y.appStarting?.isGuess === !0)) y.appStarting = null;
    return;
  }
  ((y.early = { ...early, project: n.project }),
    n.answer.then((o) => {
      let early_2 = y.early;
      if (early_2?.at === early.at) {
        let a = early_2.app?.kind === "checking";
        if (!a || !noteAppDownWithStartAllowed(n.project, o)) noteAppProbeResult(n.project, o);
        if (a) y.early = { ...early_2, app: parsePortHealthStatus(o) };
        tickClaudeTestPane(e);
      }
    }));
}
//@ chunk-ae5g0zb5.js:102895-103412 placement
async function describeRunPhase(e) {
  let facts = y.facts;
  if (facts !== null && facts.run !== null)
    return {
      isReadingCode: facts.isReadingCode,
      hasReadCode: facts.hasReadCode,
      isWritingTests: facts.isWritingTests,
    };
  let r = await e.agent.list().catch(() => []),
    filtered = r.filter((i) => i.type === CLAUDE_TEST_EXPLORER),
    any = r.some((i) => i.type === CLAUDE_TEST_CONDUCTOR && i.status === "running"),
    any_2 = filtered.some((i) => i.status === "running");
  return (
    (paneState.sawExplorer ||= filtered.length > 0 || any),
    {
      isReadingCode: any_2,
      hasReadCode:
        filtered.some((i) => i.status === "completed") || (paneState.sawExplorer && !any_2 && !any),
      isWritingTests: r.some((i) => i.type === CLAUDE_TEST_AUTHOR && i.status === "running"),
      isPreparing: any,
    }
  );
}
/**
 * 从命令文本开头取出加载标记，返回对应的加载记录（未过期）与剩余文本。
 */
//@ chunk-ae5g0zb5.js:103412-103623 placement
function takeLoadMark(e) {
  let index = e.indexOf(`
`);
  if (!e.startsWith(LOAD_MARK_PREFIX) || index === -1) return;
  let sliced = e.slice(LOAD_MARK_PREFIX.length, index),
    o = claudeTestState.loads.get(sliced);
  return (
    claudeTestState.loads.delete(sliced),
    o !== void 0 && Date.now() - o.issuedAt <= na ? { ...o, came: e.slice(index + 1) } : void 0
  );
}
//@ chunk-ae5g0zb5.js:103623-103706 placement
async function wo(e) {
  return (await e.tool.list()).some((n) => n.name.startsWith(u0e));
}
/**
 * 浏览器助手可启动时把当前会话加入需要助手的集合。
 */
//@ chunk-ae5g0zb5.js:103706-103868 placement
async function markSessionWantsHelper(e) {
  if (!(await wo(e))) return ((claudeTestState.hasStartedServer = !1), !1);
  let id = await e.session.id();
  if (!claudeTestState.hasStartedServer) return !1;
  return (claudeTestState.wantedSessions.add(id), !0);
}
//@ chunk-ae5g0zb5.js:103868-104225 placement
async function checkLoginWatch(e) {
  if (!(await e.session.surfaces()).includes("terminal"))
    return (claudeTestState.report?.("no_terminal"), CLI_ONLY_TEXT);
  switch (claudeTestState.mayRun?.()) {
    case "yes":
      break;
    case "login_changed":
      return ct;
    case "not_offered":
      return ut;
    default:
      return Me;
  }
  let n = claudeTestState.wantedSessions.has(await e.session.id());
  if (!claudeTestState.hasStartedServer && !n && (await wo(e)))
    return (claudeTestState.report?.("other_plugin"), xn);
  return;
}
//@ chunk-ae5g0zb5.js:104225-105061 placement
async function describeHelperListing(e, n) {
  let { watchLogin: watchLogin, takeOut: takeOut } = claudeTestState;
  if (watchLogin === void 0 || takeOut === void 0) return Me;
  let s = await claudeTestState.filesReady?.();
  if (s === void 0) return Cn;
  if (s.ignored !== void 0) {
    let f = describeHelperEnvIgnored(s.ignored);
    Le(() => e.ui.log(f));
  }
  if (s.problem !== void 0)
    return (
      claudeTestState.wantedSessions.clear(),
      (claudeTestState.hasStartedServer = !1),
      describeHelperFileMismatch(s.folder, s.problem, s.what)
    );
  let id = await e.session.id();
  claudeTestState.wantedSessions.add(id);
  let i = describeHelperState(watchLogin, takeOut);
  if (i !== void 0) return i;
  Le(() => e.ui.toast(vn));
  let c = await describeAvailability(e);
  if (!claudeTestState.wantedSessions.has(id)) return (takeOut(), HELPER_NOT_READY_TEXT);
  if (c !== void 0) return c;
  let min = Math.min(claudeTestState.listedWaitMs, n() - Bn),
    now = await e.clock.now();
  while (!(await wo(e))) {
    if (!claudeTestState.wantedSessions.has(id)) break;
    if ((await e.clock.now()) - now >= min) return (claudeTestState.report?.("not_listed"), Pn);
    await e.clock.sleep(100);
  }
  if (!claudeTestState.wantedSessions.has(id)) return (takeOut(), HELPER_NOT_READY_TEXT);
  claudeTestState.hasStartedServer = !0;
  let w = describeHelperState(watchLogin, takeOut);
  if (w !== void 0) return w;
  claudeTestState.report?.("listed");
  return;
}
/**
 * 助手状态对应的提示文本（watching 时无提示）。
 */
//@ chunk-ae5g0zb5.js:105061-105271 placement
function describeHelperState(e, n) {
  let r = e();
  switch (r) {
    case "watching":
      return;
    case "login_changed":
      return ct;
    case "not_offered":
      return ut;
    case "failed":
      return Me;
    default:
      return (claudeTestState.wantedSessions.clear(), (claudeTestState.hasStartedServer = !1), n(), Me);
  }
}
//@ chunk-ae5g0zb5.js:105271-105585 placement
async function describeAvailability(e) {
  try {
    let connect = await e.mcp.connect(BROWSER);
    if (connect.isConnected) return connect.server === IZ ? void 0 : In;
    switch (connect.reason) {
      case "disabled":
        return Ln;
      case "policy":
        return kn;
      case "failed":
        return Nn;
      default:
        return Wt;
    }
  } catch (error) {
    return (Le(() => e.ui.log(`Claude Test: $.mcp.connect rejected: ${String(error)}`, { to: "debug" })), Wt);
  }
}
//@ chunk-ae5g0zb5.js:105585-105616 placement
function Le(e) {
  try {
    e();
  } catch {}
}
//@ chunk-ae5g0zb5.js:105616-105680 placement
function ga() {
  let e = process.getuid?.();
  return e !== void 0 && e !== 0;
}
//@ chunk-ae5g0zb5.js:105680-105720 placement = SUPPORTED_PLATFORMS (0.811)
var SUPPORTED_PLATFORMS = new Set(["linux", "macos", "wsl"]);
/**
 * Claude Test 是否可用：非 bare、合规无 HIPAA/ZDR、平台支持且开关开启。
 */
//@ chunk-ae5g0zb5.js:105720-105862 placement
function isClaudeTestAvailable() {
  if (isBareMode() || isCustomizationDisabled("mcpAutoDiscovered")) return !1;
  return (
    An.note(),
    complianceTaintsSettled() &&
      !isPolicyVerdictAbsent() &&
      !hasComplianceTaint("hipaa") &&
      !hasComplianceTaint("zdr") &&
      SUPPORTED_PLATFORMS.has(getPlatform()) &&
      ga() &&
      An.isOn()
  );
}
//@ chunk-ae5g0zb5.js:105862-105925 placement
var _a = new HostScoped(() => ({ mark: void 0, reload: void 0, outcome: void 0 }));
//@ chunk-ae5g0zb5.js:105925-105962 placement
function Oe() {
  return _a.of(getRootSession().host);
}
//@ chunk-ae5g0zb5.js:105962-105983 placement
var CLAUDE_TEST_3 = "claude-test";
//@ chunk-ae5g0zb5.js:105983-106044 placement
var regExp_3 = new RegExp(`^${CLAUDE_TEST_3}@[A-Za-z0-9][A-Za-z0-9._-]{0,39}$`);
/**
 * 在命令列表中找到 Claude Test 插件的来源仓库。
 */
//@ chunk-ae5g0zb5.js:106044-106214 placement
function findClaudeTestRepository(e) {
  return e
    .flatMap((n) => (n.type === "prompt" && n.pluginInfo !== void 0 ? [n.pluginInfo] : []))
    .find((n) => n.pluginManifest.name === CLAUDE_TEST_3 && regExp_3.test(n.repository))?.repository;
}

export {
  CLAUDE_TEST_3,
  _a,
  z,
  noteAppStartEnded,
  detectRunHalt,
  isClaudeTestAvailable,
  lo,
  isMoreTestsDeclined,
  isEarlyPhaseActive,
  isAppStartPending,
  isRunAcceptedPending,
  $t,
  rememberRunHalt,
  Oe,
  noteStartAppAnswer,
  noteMoreTestsDeclinedByText,
  noteMoreTestsDeclined,
  noteRunConfirmed,
  noteAppDownWithStartAllowed,
  findClaudeTestRepository,
  registerClaudeTestCommand,
  noteAppProbeResult,
};
