/**
 * plugins/bundled/claudeTest/panelView.ts
 *
 * 2.1.316 新增：Claude Test 面板（pane）的渲染：阶段提示、结果行、控制台错误与失败请求、下一步按钮
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-ae5g0zb5.js (53)
 * attribution: placement 53
 */
import {
  Ul,
  runElapsedSeconds,
  buildRow,
  Te,
  buildItemsBlock,
  textBlock,
  VERDICT_TONES,
  kt,
  Dl,
  Fl,
  Zs,
  formatElapsed,
  laneElapsedSeconds,
  Il,
  Ve,
  secondsSinceLastDone,
  estimateRemainingSeconds,
  ot,
  Cl,
  VERDICT_MARKS,
} from "./progress.js";
import {
  qe,
  SEE_THE_CHAT_SUFFIX,
  humanizeSlug,
  ln,
  withCheckingAppState,
  Ot,
  collapseAndTruncate,
  capitalize,
} from "./runState.js";
import { pl, ml, gl, describePortInUse, wr, isValidSpecPath, RUN_ID_RE } from "./appFacts.js";

/**
 * 结束阶段文案：“Writing the report…” 或 “Checking the page…”。
 */
//@ chunk-ae5g0zb5.js:52377-52543 placement
function finishingPhaseLabel(e, n) {
  let r = e.startedAtMs === null ? null : e.startedAtMs + e.doneAtS * 1000;
  return e.hasLog || (r !== null && n - r >= Ul) ? "Writing the report\u2026" : "Checking the page\u2026";
}
//@ chunk-ae5g0zb5.js:52543-53280 placement
function formatResultCounts(e) {
  let earlier = e.earlier;
  if (earlier === null || earlier === void 0 || !earlier.finished) return null;
  let r =
    e.run ??
    (e.proposed.length === 0
      ? null
      : {
          rows: ci(e.proposed).map((i) => ({
            stem: i.stem,
            name: i.name ?? Nr(i.stem),
            area: i.area,
            verdict: null,
            seconds: null,
            addsData: i.addsData,
          })),
          app: null,
          started: !1,
          finished: !1,
          hasLog: !1,
          running: null,
          lastDone: null,
          startedAtMs: null,
          doneAtS: 0,
        });
  if (r === null) return null;
  let o = new Set(r.rows.map((row) => row.stem)),
    s = e.isFixRerun === !0 ? (e.fixedStems ?? []) : [],
    mapped = earlier.rows
      .filter((row) => row.verdict !== null && !o.has(row.stem))
      .map((i) => (i.verdict !== "PASS" && s.includes(i.stem) ? { ...i, isNotReRun: !0 } : i));
  return mapped.length === 0
    ? null
    : {
        run: { ...adjustSkippedCount(r, earlier), rows: [...mapped, ...r.rows], app: r.app ?? earlier.app },
        earlierS: earlier.doneAtS,
        earlierClockS: runElapsedSeconds(earlier, earlier.rows.length, 0),
        earlierRows: mapped.length,
      };
}
/**
 * 按已显示的行修正 skipped 计数。
 */
//@ chunk-ae5g0zb5.js:53280-53483 placement
function adjustSkippedCount(e, n) {
  let { skipped: skipped, ...o } = e,
    s = new Set(n.rows.map((row) => row.stem)),
    reduced = e.rows.reduce((c, _) => c + (s.has(_.stem) ? 0 : 1), 0),
    i = n.skipped === void 0 ? 0 : Math.max(0, n.skipped - reduced);
  return { ...o, ...(i >= 1 && { skipped: i }) };
}
/**
 * 应用宕机/失败/忙或页面为空时为 true。
 */
//@ chunk-ae5g0zb5.js:53483-53625 placement
function isAppUnusable(e) {
  return (
    e.app?.state === "down" ||
    e.app?.state === "failed" ||
    e.app?.state === "busy" ||
    e.look?.kind === "empty" ||
    e.look?.kind === "nothing"
  );
}
/**
 * “N console errors”、“M failed requests”。
 */
//@ chunk-ae5g0zb5.js:53625-53770 placement
function formatLookIssues(e, n) {
  return [
    ...(e > 0 ? [`${e} ${e > 1 ? "console errors" : "console error"}`] : []),
    ...(n > 0 ? [`${n} ${n > 1 ? "failed requests" : "failed request"}`] : []),
  ];
}
//@ chunk-ae5g0zb5.js:53770-54228 placement
function describeAppState(e) {
  let n = e.note ?? qe,
    look = n.look;
  if (
    n.app?.state === "down" ||
    n.app?.state === "failed" ||
    n.app?.state === "busy" ||
    n.app?.state === "stopped"
  )
    return !1;
  if (e.run === null && n.app === null && look === null && !e.hasLook) {
    let s = e.early?.app ?? null;
    if (s?.kind === "busy" || s?.kind === "down" || (!e.hasRunFolder && s?.kind !== "up")) return !1;
  }
  if (e.run !== null || e.isLaterRun === !0) return look === null || look.kind === "loads";
  return (look === null ? e.hasLook : look.kind === "loads") && (e.hasReadCode || e.proposed.length > 0);
}
/**
 * 应用细节：端口、框架、页面问题。
 */
//@ chunk-ae5g0zb5.js:54228-54424 placement
function formatAppDetails(e) {
  let n = e.app?.port ?? null,
    r = e.about?.framework ?? null,
    look = e.look;
  return [
    ...(n === null ? [] : [`:${n}`]),
    ...(r === null ? [] : [r]),
    ...(look === null ? [] : formatLookIssues(look.errors, look.failed)),
  ]
    .map((s) => ` \xB7 ${s}`)
    .join("");
}
//@ chunk-ae5g0zb5.js:54424-54513 placement
function si(e) {
  let about = e.about;
  return about === null ? [] : [pl[about.signin], ml[about.payments], gl[about.data]];
}
/**
 * 步骤行构造：完成（✓）、失败（✗）、待办（◻）、进行中（带标记）。
 */
//@ chunk-ae5g0zb5.js:54513-54800 placement
var doneStep = (e, n) => ({
    mark: { text: "\u2713", tone: "success" },
    words: e,
    ...(n === void 0 ? {} : { details: n }),
    isNow: !1,
  }),
  failedStep = (e) => ({ mark: { text: "\u2717", tone: "error" }, words: e, isNow: !0 }),
  pendingStep = (e, n = !1) => ({ mark: { text: "\u25FB", tone: "dim" }, words: e, isNow: n }),
  activeStep = (e, n) => ({ mark: { text: e, tone: "claude" }, words: n, isNow: !0 });
/**
 * 把步骤渲染成一行（进行中的 claude 色调步骤登记以便替换）。
 */
//@ chunk-ae5g0zb5.js:54800-55035 placement
function renderStepRow(e, n, r = !1) {
  let o = buildRow(
    e,
    Te(n.mark, ""),
    [
      !n.isNow
        ? { text: n.words, tone: "dim" }
        : n.mark.tone === "claude"
          ? { text: n.words, tone: "title" }
          : { text: n.words },
      { text: n.details ?? "", tone: "dim" },
    ],
    null,
    r,
  );
  if (n.mark.tone === "claude") weakSet.add(o);
  return o;
}
//@ chunk-ae5g0zb5.js:55035-55054 placement
var weakSet = new WeakSet();
/**
 * 等待用户时把进行中的步骤替换为等待提示。
 */
//@ chunk-ae5g0zb5.js:55054-55174 placement
function replaceActiveStepWithWaiting(e, n) {
  let index = e.findIndex((o) => weakSet.has(o));
  return index === -1
    ? e
    : [...e.slice(0, index), renderStepRow(n, pendingStep(Yl, !0), !0), ...e.slice(index + 1)];
}
/**
 * 测试浏览器安装进度步骤。
 */
//@ chunk-ae5g0zb5.js:55174-55447 placement
function browserInstallStep(e, n) {
  if (e.state === "failed")
    return { ...failedStep("Couldn't install the test browser"), details: SEE_THE_CHAT_SUFFIX };
  if (e.state === "done") return doneStep("Test browser installed");
  return activeStep(
    n,
    e.percent === null
      ? "Installing the test browser\u2026"
      : `Installing the test browser\u2026 ${e.percent}%`,
  );
}
//@ chunk-ae5g0zb5.js:55447-55537 placement
function yr(e, n, r) {
  return e.install === void 0 || e.install === null
    ? []
    : [renderStepRow(r, browserInstallStep(e.install, n))];
}
//@ chunk-ae5g0zb5.js:55537-55616 placement
function At(e, n) {
  let r = describeRunHalt(e, n);
  return e.isFixing === !0 && r.words === ai ? activeStep(n, ql) : r;
}
//@ chunk-ae5g0zb5.js:55616-55671 placement
var Yl = "Waiting for you in the chat",
  ql = "Fixing\u2026";
//@ chunk-ae5g0zb5.js:55671-56671 placement
function describeRunHalt(e, n) {
  let r = e.note ?? qe,
    { app: app, look: look } = r,
    a = formatAppDetails(r);
  if (app?.state === "stopped") return pendingStep(Zl);
  if (look?.kind === "nothing") return failedStep("Nothing loaded");
  if (look?.kind === "empty") return failedStep(`Your app's first page stayed empty${a}`);
  if (e.isStartingApp === !0 && e.halt === void 0 && (app === null || app === void 0 || app.state === "down"))
    return activeStep(n, ai);
  if (app?.state === "down") return pendingStep(_s, !0);
  if (app?.state === "failed") return failedStep(`App didn't start \xB7 ${describePortInUse(app.failure)}`);
  if (app?.state === "busy") return hs(app.port);
  if (app?.state === "started")
    return doneStep(app.command === null ? "App started" : `App started (${app.command})`, a);
  if (app?.state === "running") return doneStep("App ready", a);
  if (look?.kind === "loads" || e.hasLook) return doneStep("Your app loads", a);
  let i = e.early?.app ?? null;
  if (e.hasRunFolder && i?.kind !== "busy" && i?.kind !== "down")
    return activeStep(n, "Opening your app\u2026");
  switch (i?.kind) {
    case "checking":
      return activeStep(n, "Checking your app\u2026");
    case "up":
      return doneStep("App ready");
    case "down":
      return pendingStep(_s, !0);
    case "busy":
      return hs(i.port);
    default:
      return activeStep(n, "Getting ready\u2026");
  }
}
//@ chunk-ae5g0zb5.js:56671-56744 placement
var _s = "App isn't running",
  Zl = "App stopped",
  ai = "Starting your app\u2026";
//@ chunk-ae5g0zb5.js:56744-56836 placement
function hs(e) {
  return failedStep(`${e === null ? "Its port" : `Port ${e}`} is in use by another program`);
}
/**
 * 运行停止的原因（declined/halted/blocked 或备注里的原因）。
 */
//@ chunk-ae5g0zb5.js:56836-57072 placement
function resolveStopReason(e) {
  if (e.isAddressDeclined === !0 && e.run === null) return "declined";
  let n = e.halt === "stopped" ? "halted" : e.halt === "blocked" ? "blocked" : (e.note?.stopped ?? null);
  return n === null || e.run !== null || e.isReadingCode || e.isWritingTests === !0 ? null : n;
}
/**
 * 停止原因行（必要时附“见聊天”）。
 */
//@ chunk-ae5g0zb5.js:57072-57217 placement
function renderStopRow(e, n) {
  let { mark: mark, words: words } = wr[n];
  return buildRow(
    e,
    Te(mark, ""),
    n === "signin" || n === "declined"
      ? [{ text: words }]
      : [{ text: words }, { text: SEE_THE_CHAT_SUFFIX, tone: "dim" }],
    null,
    !0,
  );
}
//@ chunk-ae5g0zb5.js:57217-57298 placement
function ws(e) {
  return e.mark.tone !== "claude" && (e.isNow || e.mark.tone === "success");
}
//@ chunk-ae5g0zb5.js:57298-57954 placement
function formatReadingCodeStep(e, n, r, o = null) {
  let s = e.note ?? qe,
    a = e.proposed.length,
    i = si(s),
    c =
      e.hasReadCode || a > 0
        ? doneStep("Read your code")
        : e.isReadingCode || e.readingFolder !== null
          ? activeStep(
              n,
              e.readingFolder === null
                ? "Reading your code\u2026"
                : `Reading your code: ${e.readingFolder}\u2026`,
            )
          : pendingStep("Read your code"),
    _ =
      e.isWritingTests === !0
        ? activeStep(n, "Writing the tests\u2026")
        : a > 0
          ? doneStep(`${a} ${a === 1 ? "test" : "tests"} written`)
          : pendingStep("Write the tests"),
    S = At(e, n),
    w = i.length === 0 ? [] : [buildItemsBlock(r, 2, i, "dim")];
  if (o !== null) {
    let f = o === "declined" ? [] : [c, _];
    return [
      ...yr(e, n, r),
      ...(ws(S) ? [renderStepRow(r, S, !0)] : []),
      ...w,
      ...f.filter(ws).map((b) => renderStepRow(r, b)),
      renderStopRow(r, o),
    ];
  }
  return [
    ...yr(e, n, r),
    renderStepRow(r, S, !0),
    ...w,
    renderStepRow(r, c),
    renderStepRow(r, _),
    renderStepRow(r, pendingStep("Run them")),
  ];
}
/**
 * “App ready” 行及应用细节。
 */
//@ chunk-ae5g0zb5.js:57954-58084 placement
function renderAppReadyRow(e, n) {
  return buildRow(
    n,
    Te({ text: "\u2713", tone: "success" }, ""),
    [{ text: "App ready" }, { text: formatAppDetails(e.note ?? qe), tone: "dim" }],
    null,
    !0,
  );
}
/**
 * 面板标题行 “Claude Test · 项目” 与右侧说明。
 */
//@ chunk-ae5g0zb5.js:58084-58231 placement
function renderPanelTitle(e, n, r) {
  return buildRow(
    e,
    [{ text: "Claude Test", tone: "title" }],
    [{ text: n === null ? "" : ` \xB7 ${n}`, tone: "dim" }],
    r === null ? null : { text: r, tone: "dim" },
  );
}
//@ chunk-ae5g0zb5.js:58231-58246 placement
var OTHER = "other";
//@ chunk-ae5g0zb5.js:58246-58281 placement
function hn(e) {
  return (n) => e(n) ?? OTHER;
}
//@ chunk-ae5g0zb5.js:58281-58334 placement
function Ql(e, n) {
  return new Set(e.map(hn(n))).size > 1;
}
/**
 * 按分组键给行插入分组标题。
 */
//@ chunk-ae5g0zb5.js:58334-58497 placement
function groupRowsWithHeadings(e, n, r, o) {
  let s = Ql(n, r),
    a = hn(r),
    i = [];
  return (
    n.forEach((c, _) => {
      if (s && (_ === 0 || a(n[_ - 1]) !== a(c)))
        i.push(textBlock(e, { text: humanizeSlug(a(c)), tone: "dim" }));
      i.push(o(c));
    }),
    i
  );
}
//@ chunk-ae5g0zb5.js:58497-58572 placement
var di = { text: "adds data", tone: "warning" },
  ed = { text: "not re-run", tone: "dim" };
/**
 * 按分组聚合行（OTHER 组放最后）。
 */
//@ chunk-ae5g0zb5.js:58572-58732 placement
function orderRowsByGroup(e, n) {
  let r = hn(n);
  return e
    .map(r)
    .filter((s, a, i) => i.indexOf(s) === a)
    .sort((s, a) => Number(s === OTHER) - Number(a === OTHER))
    .flatMap((s) => e.filter((a) => r(a) === s));
}
//@ chunk-ae5g0zb5.js:58732-58772 placement
function ci(e) {
  return orderRowsByGroup(e, (n) => n.area);
}
/**
 * 结果行色调：未重跑为暗色，有结论按 PASS/FAIL/BLOCKED，运行中为 claude。
 */
//@ chunk-ae5g0zb5.js:58772-58878 placement
function rowTone(e, n) {
  return n.isNotReRun === !0
    ? "dim"
    : n.verdict !== null
      ? VERDICT_TONES[n.verdict]
      : kt(e, n.stem)
        ? "claude"
        : null;
}
//@ chunk-ae5g0zb5.js:58878-59437 placement
function buildPanelHeader(e, n, r) {
  let mapped = e.rows.map((row) => rowTone(e, row)),
    mapped_2 = e.rows.map((row) => row.verdict !== null),
    min = Math.min(Dl, Math.max(Fl, r)),
    i =
      mapped.length <= min
        ? mapped.map((_, S) => ({ tone: _, isFull: mapped_2[S] }))
        : Array.from({ length: min }, (_, S) => {
            let floored = Math.floor((S * mapped.length) / min),
              floored_2 = Math.floor(((S + 1) * mapped.length) / min),
              sliced = mapped.slice(floored, floored_2);
            return {
              tone: ["error", "warning", "claude", "success"].find((P) => sliced.includes(P)) ?? null,
              isFull: mapped_2.slice(floored, floored_2).every(Boolean),
            };
          }),
    c = [];
  for (let { tone: tone, isFull: isFull } of i) {
    let w = tone === null || !isFull ? n.empty : n.fill,
      f = tone ?? "dim",
      at = c.at(-1);
    if (at !== void 0 && at.tone === f) at.text += w;
    else c.push({ text: w, tone: f });
  }
  return c;
}
/**
 * 结果行排序：运行结束后按组内最早顺序排列。
 */
//@ chunk-ae5g0zb5.js:59437-59757 placement
function orderResultRows(e) {
  let n = orderRowsByGroup(e.rows, Ts);
  if (!e.finished) return n;
  let r = hn(Ts),
    o = [];
  for (let s of n) {
    let found = o.find((i) => r(i[0]) === r(s));
    if (found === void 0) o.push([s]);
    else found.push(s);
  }
  return o
    .sort(
      (s, a) =>
        Math.min(...s.map(un)) - Math.min(...a.map(un)) ||
        Number(r(s[0]) === OTHER) - Number(r(a[0]) === OTHER),
    )
    .flatMap((s) => s.sort((a, i) => un(a) - un(i)));
}
//@ chunk-ae5g0zb5.js:59757-59786 placement
function Ts(e) {
  return e.area;
}
//@ chunk-ae5g0zb5.js:59786-59875 placement
function un(e) {
  return e.isNotReRun === !0 ? 3 : e.verdict === "FAIL" ? 0 : e.verdict === "BLOCKED" ? 1 : 2;
}
//@ chunk-ae5g0zb5.js:59875-59921 placement
var od = "ctrl+x ctrl+k twice stops all agents";
//@ chunk-ae5g0zb5.js:59921-59959 placement
function tt(e, ...n) {
  return textBlock(e, ...n);
}
/**
 * 带前缀的条目列表，放不下时前缀单独一行。
 */
//@ chunk-ae5g0zb5.js:59959-60139 placement
function renderLabeledItems(e, n) {
  return n.every((o) => ln.length + o.length <= e)
    ? n.map((o, s) => bs(e, o, s === 0 ? ln : " ".repeat(ln.length)))
    : [textBlock(e, { text: ln.trimEnd(), tone: "dim" }), ...n.map((o) => bs(e, o, "  "))];
}
//@ chunk-ae5g0zb5.js:60139-60220 placement
function bs(e, n, r) {
  return buildRow(e, [{ text: r, tone: "dim" }], [{ text: n, tone: "dim" }], null);
}
//@ chunk-ae5g0zb5.js:60220-60240 placement
var ad = 6,
  ld = 3,
  kr = 30;
//@ chunk-ae5g0zb5.js:60240-60305 placement
function pn(e, n, r) {
  return buildRow(e, Te(n), [{ text: r, tone: "dim" }], null);
}
//@ chunk-ae5g0zb5.js:60305-61168 placement
function formatResultSummary(e, n, r, o) {
  let s = orderResultRows(e),
    a = groupRowsWithHeadings(n, s, (P) => P.area, o);
  if ((e.finished || s.length <= ad) && Se(a) <= r) return a;
  if (e.finished) {
    let filtered = s.filter((j) => j.verdict !== "PASS"),
      filtered_2 = s.filter((j) => j.verdict === "PASS"),
      O = filtered_2.length;
    while (O > 0 && filtered.length + O + (filtered_2.length > O ? 1 : 0) > r) O -= 1;
    return [
      ...filtered.map(o),
      ...filtered_2.slice(0, O).map(o),
      ...(filtered_2.length > O
        ? [pn(n, { text: "\u2713", tone: "success" }, `${filtered_2.length - O} more`)]
        : []),
    ];
  }
  let reduced = s.reduce((P, F) => P + (F.verdict === "PASS" ? 1 : 0), 0),
    filtered = s.filter((P) => P.verdict === "FAIL" || P.verdict === "BLOCKED" || kt(e, P.stem)),
    filtered_2 = e.rows.filter((row) => row.verdict === null && !kt(e, row.stem)),
    S = filtered.length + (reduced > 0 ? 1 : 0),
    min = Math.min(ld, filtered_2.length);
  if (filtered_2.length === min + 1 && S + min + 1 <= r) min += 1;
  while (min > 0 && S + min + (filtered_2.length > min ? 1 : 0) > r) min -= 1;
  let f = reduced === 0 ? [] : [pn(n, { text: "\u2713", tone: "success" }, `${reduced} passed`)],
    b =
      filtered_2.length > min
        ? [pn(n, { text: "\u25FB", tone: "dim" }, `${filtered_2.length - min} more`)]
        : [];
  return [...f, ...filtered.map(o), ...filtered_2.slice(0, min).map(o), ...b];
}
/**
 * 渲染面板；等待用户时把进行中的步骤换成等待提示。
 */
//@ chunk-ae5g0zb5.js:61168-61295 placement
function renderClaudeTestPane(e, n, r = 60, o = Zs, s = kr, a = !1) {
  let i = renderClaudeTestPanel(e, n, r, o, s, a);
  return e.isWaitingForPerson === !0 ? replaceActiveStepWithWaiting(i, Math.max(20, Math.floor(r))) : i;
}
/**
 * 待运行规格行。
 */
//@ chunk-ae5g0zb5.js:61295-61403 placement
function renderPendingSpecRow(e, n) {
  return buildRow(
    e,
    Te({ text: "\u25FB", tone: "dim" }),
    [{ text: n.name ?? Nr(n.stem) }],
    n.addsData ? di : null,
  );
}
//@ chunk-ae5g0zb5.js:61403-61492 placement
function Ee(e, n) {
  return e.rows.reduce((r, o) => r + (o.verdict === n && o.isNotReRun !== !0 ? 1 : 0), 0);
}
/**
 * 结果行的耗时文本（完成用总秒数，运行中按开始时间推算）。
 */
//@ chunk-ae5g0zb5.js:61492-61769 placement
function rowElapsedLabel(e, n, r, o) {
  if (n.verdict === "BLOCKED") return null;
  if (n.verdict !== null) return n.seconds === null ? null : formatElapsed(n.seconds * 1000);
  if (e.lanesRunning !== void 0) {
    let s = kt(e, n.stem) ? laneElapsedSeconds(e, n.stem, r) : null;
    return s !== null ? formatElapsed(s * 1000) : null;
  }
  return n.stem === e.running && o !== null ? formatElapsed(o * 1000) : null;
}
/**
 * 生成 Claude Test 面板内容：登录、开始测试、审批规格、结果与修复建议（约 4.7 KB）。
 */
//@ chunk-ae5g0zb5.js:61769-66493 placement
function renderClaudeTestPanel(e, n, r, o, s, a) {
  let max = Math.max(20, Math.floor(r)),
    c = withCheckingAppState(e, n),
    _ = formatResultCounts(c),
    S =
      _?.run ?? (c.run !== null && c.earlier?.finished === !0 ? adjustSkippedCount(c.run, c.earlier) : c.run),
    w = c.halt !== void 0 && S !== null && !S.finished,
    f = S !== null && w ? { ...S, running: null, lanesRunning: void 0 } : S,
    b = Il(n, o),
    P = f?.app ?? c.note?.name ?? c.early?.name ?? null;
  if (f === null) {
    let C = c.isStartingRun === !0 && c.isLaterRun !== !0,
      L = C ? { ...c, isReadingCode: !1, hasReadCode: !0, isWritingTests: !1 } : c,
      Y = resolveStopReason(L),
      de = C && Y === null,
      q = L.proposed.length;
    if (!(Y !== "signin" && (de || (q > 0 && (L.isWritingTests !== !0 || L.hasOutline === !0)))))
      return [
        renderPanelTitle(max, P, null),
        ...(L.isLaterRun === !0 || L.isOpening === !0
          ? [
              ...yr(L, b, max),
              describeAppState(L) ? renderAppReadyRow(L, max) : renderStepRow(max, At(L, b), !0),
              ...(Y === null ? [] : [renderStopRow(max, Y)]),
            ]
          : formatReadingCodeStep(L, b, max, Y)),
      ];
    let gt = L.isLaterRun === !0,
      nn = !gt && !de && (L.startsAtOutline !== !0 || L.proposed.some((Ue) => Ue.addsData)),
      D = !gt && !nn && Y === null && (de || L.startsAtOutline === !0) && describeAppState(L),
      Q = si(L.note ?? qe),
      Re = [
        renderPanelTitle(max, P, null),
        ...(describeAppState(L)
          ? [
              renderAppReadyRow(L, max),
              ...(Q.length === 0 ? [] : [buildItemsBlock(max, 2, Q, "dim")]),
              ...(D ? [renderStepRow(max, activeStep(b, "Starting the tests\u2026"))] : []),
            ]
          : L.isLaterRun === !0
            ? [renderStepRow(max, At(L, b), !0)]
            : formatReadingCodeStep(L, b, max)),
        Ve,
      ],
      rn =
        Y !== null
          ? [Ve, renderStopRow(max, Y)]
          : nn
            ? [Ve, tt(max, { text: "Approve or change them in the chat", tone: "dim" })]
            : [],
      max_2 = Math.max(3, s - Se(Re) - Se(rn)),
      Zn = ci(L.proposed),
      es = groupRowsWithHeadings(
        max,
        Zn,
        (Ue) => Ue.area,
        (Ue) => renderPendingSpecRow(max, Ue),
      );
    return [
      ...Re,
      ...(Se(es) <= max_2
        ? es
        : [
            ...Zn.slice(0, max_2 - 1).map((Ue) => renderPendingSpecRow(max, Ue)),
            pn(max, { text: "\u25FB", tone: "dim" }, `${Zn.length - (max_2 - 1)} more`),
          ]),
      ...rn,
    ];
  }
  let reduced = f.rows.reduce((C, L) => C + (L.isNotReRun === !0 ? 1 : 0), 0),
    O = f.rows.length - Ee(f, null),
    j = c.readAt ?? n,
    se = secondsSinceLastDone(f, j),
    J = c.isFixRerun === !0,
    ne = J ? 0 : (_?.earlierS ?? 0),
    ce = J ? (_?.earlierRows ?? 0) : 0,
    pe = !f.started,
    ie = w ? f.doneAtS : runElapsedSeconds(f, O, j),
    he = pe ? null : formatElapsed(((J ? 0 : (_?.earlierClockS ?? 0)) + ie) * 1000),
    R = [
      renderPanelTitle(max, P, he),
      ...(_ === null
        ? [describeAppState(c) ? renderAppReadyRow(c, max) : renderStepRow(max, At(c, b), !0)]
        : isAppUnusable(c.note ?? qe)
          ? [renderStepRow(max, At(c, b), !0)]
          : []),
    ];
  if (f.finished) {
    let C = Ee(f, "FAIL"),
      L = Ee(f, "BLOCKED"),
      mapped = [
        [C, "failed"],
        [L, "blocked"],
        [Ee(f, "PASS"), "passed"],
        [reduced, "not re-run yet"],
      ]
        .filter(([q]) => q > 0)
        .map(([q, be]) => ({ text: `${q} ${be}`, tone: "title" }));
    R.push(
      buildRow(
        max,
        Te(
          C > 0
            ? { text: "\u2717", tone: "error" }
            : L > 0
              ? { text: "\u26A0", tone: "warning" }
              : { text: "\u2713", tone: "success" },
          "",
        ),
        mapped.length === 0
          ? [{ text: "Nothing ran" }]
          : [
              ...mapped.flatMap((q, be) => (be === 0 ? [q] : [{ text: " \xB7 ", tone: "dim" }, q])),
              ...(f.skipped === void 0 ? [] : [{ text: ` \xB7 ${f.skipped} skipped`, tone: "dim" }]),
            ],
        null,
      ),
    );
  } else if (w && f.started) {
    let C = [
      [Ee(f, "FAIL"), "failed"],
      [Ee(f, "BLOCKED"), "blocked"],
      [Ee(f, "PASS"), "passed"],
      [Ee(f, null), "not run"],
    ];
    R.push(
      buildRow(
        max,
        Te(wr.halted.mark, ""),
        [
          { text: c.halt === "blocked" ? "Blocked" : "Stopped", tone: "title" },
          ...C.filter(([L]) => L > 0).map(([L, Y]) => ({ text: ` \xB7 ${L} ${Y}` })),
        ],
        null,
        !0,
      ),
    );
  } else if (w) R.push(renderStopRow(max, c.halt === "blocked" ? "blocked" : "halted"));
  else {
    let C = f.rows.length > 0 && O === f.rows.length,
      L =
        C || pe ? null : estimateRemainingSeconds(ne + f.doneAtS, O - ce, f.rows.length - ce, ie - f.doneAtS),
      Y = [
        { text: `  ${O} of ${f.rows.length} done` },
        {
          text:
            L === null ? "" : L === 0 ? " \xB7 almost done" : ` \xB7 about ${formatElapsed(L * 1000)} left`,
          tone: "dim",
        },
      ];
    if ((R.push(buildRow(max, buildPanelHeader(f, o, max - ot(Y).length), Y, null)), C))
      R.push(renderStepRow(max, activeStep(b, finishingPhaseLabel(f, n))));
    if (pe) {
      let de = resolveStopReason(c),
        q = f.rows.length - O;
      R.push(
        de === null
          ? renderStepRow(
              max,
              activeStep(
                b,
                c.isFixRerun === !0
                  ? `Re-running ${q} ${q === 1 ? "test" : "tests"}\u2026`
                  : `Starting ${q} more ${q === 1 ? "test" : "tests"}\u2026`,
              ),
            )
          : renderStopRow(max, de),
      );
    }
  }
  if (f.rows.length === 0) return R;
  R.push(Ve);
  let max_2 = Math.max(Cl, ...f.rows.map((row) => rowElapsedLabel(f, row, j, se)?.length ?? 0)),
    Z = Ee(f, "FAIL"),
    ye = Ee(f, "BLOCKED"),
    Qe = f.finished && c.isMoreDeclined !== !0 ? (c.note?.more ?? []) : [],
    We =
      Qe.length === 0
        ? []
        : [
            Ve,
            textBlock(max, { text: "More tests ready", tone: "dim" }),
            ...Qe.map((C) =>
              buildRow(
                max,
                Te({ text: "\u25FB", tone: "dim" }),
                [{ text: c.proposed.find((L) => L.stem === C)?.name ?? Nr(C) }],
                null,
              ),
            ),
          ],
    Ge = _ === null ? null : (c.note?.from ?? null),
    en = isValidSpecPath(c.appFolder) ? `${c.appFolder}/${Ot}` : Ot,
    tn =
      f.finished && a && typeof c.runId === "string" && RUN_ID_RE.test(c.runId)
        ? renderLabeledItems(max, [
            `${en}/${c.runId}/`,
            ...(Ge !== null && RUN_ID_RE.test(Ge) ? [`${en}/${Ge}/`] : []),
          ])
        : [],
    et = w
      ? [
          Ve,
          tt(
            max,
            { text: "Run ", tone: "dim" },
            { text: "/claude-test", tone: "title" },
            { text: " to start again", tone: "dim" },
          ),
        ]
      : !f.finished
        ? []
        : [
            Ve,
            (Z > 0 || reduced > 0) && c.note?.noFix !== !0
              ? tt(
                  max,
                  { text: "Details in the chat \xB7 ", tone: "dim" },
                  { text: "/claude-test fix", tone: "title" },
                )
              : ye > 0 || Z > 0
                ? tt(max, { text: "Details in the chat", tone: "dim" })
                : tt(
                    max,
                    { text: "Run ", tone: "dim" },
                    { text: "/claude-test", tone: "title" },
                    { text: " after your next change", tone: "dim" },
                  ),
            ...tn,
          ];
  if (
    (R.push(
      ...formatResultSummary(f, max, Math.max(3, s - Se(R) - Se(We) - Se(et)), (C) => {
        let L = kt(f, C.stem);
        if (C.isNotReRun === !0)
          return buildRow(max, Te({ text: "\u2013", tone: "dim" }), [{ text: C.name, tone: "dim" }], ed);
        let Y = rowElapsedLabel(f, C, j, se),
          de =
            C.verdict !== null
              ? { text: VERDICT_MARKS[C.verdict], tone: VERDICT_TONES[C.verdict] }
              : L
                ? { text: b, tone: "claude" }
                : { text: "\u25FB", tone: "dim" },
          q =
            C.verdict === null && !L && C.addsData
              ? di
              : Y === null
                ? null
                : { text: Y.padStart(max_2), tone: "dim" },
          be =
            C.verdict !== null
              ? { text: C.name }
              : L
                ? { text: C.name, tone: "title" }
                : { text: C.name, tone: "dim" };
        return buildRow(max, Te(de), [be], q);
      }),
      ...We,
      ...et,
    ),
    f.started && !f.finished && !w && Se(R) + 1 <= s)
  )
    R.push(tt(max, { text: od, tone: "dim" }));
  return R;
}
//@ chunk-ae5g0zb5.js:66493-66549 placement
function Nr(e) {
  return collapseAndTruncate(capitalize(e.replaceAll("-", " ")), 140);
}
//@ chunk-ae5g0zb5.js:66549-66639 placement
function cd(e) {
  let n = 1;
  for (
    let index = e.indexOf(`
`);
    index !== -1;
    index = e.indexOf(
      `
`,
      index + 1,
    )
  )
    n += 1;
  return n;
}
//@ chunk-ae5g0zb5.js:66639-66693 placement
function Se(e) {
  return e.reduce((n, r) => n + cd(r.text), 0);
}
//@ chunk-ae5g0zb5.js:66693-66716 placement
var xs = 0.5,
  Ps = 1.6,
  pd = 6;

export { Ps, xs, pd, kr, renderClaudeTestPane, Se };
