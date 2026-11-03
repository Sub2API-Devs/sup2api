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
  RUN_STALE_MS,
  runElapsedSeconds,
  buildRow,
  spacedItem,
  buildItemsBlock,
  textBlock,
  VERDICT_TONES,
  isLaneRunning,
  DEFAULT_PANE_WIDTH,
  MIN_PANE_WIDTH,
  INLINE_IMAGE_SUPPORT,
  formatElapsed,
  laneElapsedSeconds,
  spinnerGlyph,
  EMPTY_TEXT_SPAN,
  secondsSinceLastDone,
  estimateRemainingSeconds,
  joinSpans,
  MAX_THREAD_ROWS,
  VERDICT_MARKS,
} from "./progress.js";
import {
  REPORT_STATE_TEXT,
  SEE_THE_CHAT_SUFFIX,
  humanizeSlug,
  REPORT_PREFIX,
  withCheckingAppState,
  RUNS_DIR,
  collapseAndTruncate,
  capitalize,
} from "./runState.js";
import {
  SIGN_IN_SHORT_LABELS,
  PAYMENT_SHORT_LABELS,
  DATA_LOCATION_PHRASES,
  describePortInUse,
  BLOCKED_STATES,
  isValidSpecPath,
  RUN_ID_RE,
} from "./appFacts.js";

//@ chunk-ae5g0zb5.js:52377-52543 placement
/**
 * 结束阶段文案：“Writing the report…” 或 “Checking the page…”。
 */
function finishingPhaseLabel(e, n) {
  let r = e.startedAtMs === null ? null : e.startedAtMs + e.doneAtS * 1000;
  return e.hasLog || (r !== null && n - r >= RUN_STALE_MS)
    ? "Writing the report\u2026"
    : "Checking the page\u2026";
}
//@ chunk-ae5g0zb5.js:52543-53280 placement
function formatResultCounts(e) {
  let earlier = e.earlier;
  if (earlier === null || earlier === undefined || !earlier.finished) return null;
  let r =
    e.run ??
    (e.proposed.length === 0
      ? null
      : {
          rows: orderProposedRows(e.proposed).map((i) => ({
            stem: i.stem,
            name: i.name ?? displayNameForStem(i.stem),
            area: i.area,
            verdict: null,
            seconds: null,
            addsData: i.addsData,
          })),
          app: null,
          started: false,
          finished: false,
          hasLog: false,
          running: null,
          lastDone: null,
          startedAtMs: null,
          doneAtS: 0,
        });
  if (r === null) return null;
  let o = new Set(r.rows.map((i) => i.stem));
  let s = e.isFixRerun === true ? (e.fixedStems ?? []) : [];
  let mapped = earlier.rows
    .filter((i) => i.verdict !== null && !o.has(i.stem))
    .map((i) =>
      i.verdict !== "PASS" && s.includes(i.stem)
        ? {
            ...i,
            isNotReRun: true,
          }
        : i,
    );
  return mapped.length === 0
    ? null
    : {
        run: {
          ...adjustSkippedCount(r, earlier),
          rows: [...mapped, ...r.rows],
          app: r.app ?? earlier.app,
        },
        earlierS: earlier.doneAtS,
        earlierClockS: runElapsedSeconds(earlier, earlier.rows.length, 0),
        earlierRows: mapped.length,
      };
}
//@ chunk-ae5g0zb5.js:53280-53483 placement
/**
 * 按已显示的行修正 skipped 计数。
 */
function adjustSkippedCount(e, earlier) {
  let { skipped, ...o } = e;
  let s = new Set(earlier.rows.map((c) => c.stem));
  let reduced = e.rows.reduce((acc, _) => acc + (s.has(_.stem) ? 0 : 1), 0);
  let i = earlier.skipped === undefined ? 0 : Math.max(0, earlier.skipped - reduced);
  return {
    ...o,
    ...(i >= 1 && {
      skipped: i,
    }),
  };
}
//@ chunk-ae5g0zb5.js:53483-53625 placement
/**
 * 应用宕机/失败/忙或页面为空时为 true。
 */
function isAppUnusable(e) {
  return (
    e.app?.state === "down" ||
    e.app?.state === "failed" ||
    e.app?.state === "busy" ||
    e.look?.kind === "empty" ||
    e.look?.kind === "nothing"
  );
}
//@ chunk-ae5g0zb5.js:53625-53770 placement
/**
 * “N console errors”、“M failed requests”。
 */
function formatLookIssues(errors, failed) {
  return [
    ...(errors > 0 ? [`${errors} ${errors > 1 ? "console errors" : "console error"}`] : []),
    ...(failed > 0 ? [`${failed} ${failed > 1 ? "failed requests" : "failed request"}`] : []),
  ];
}
//@ chunk-ae5g0zb5.js:53770-54228 placement
function describeAppState(e) {
  let note = e.note ?? REPORT_STATE_TEXT;
  let look = note.look;
  if (
    note.app?.state === "down" ||
    note.app?.state === "failed" ||
    note.app?.state === "busy" ||
    note.app?.state === "stopped"
  )
    return false;
  if (e.run === null && note.app === null && look === null && !e.hasLook) {
    let app = e.early?.app ?? null;
    if (app?.kind === "busy" || app?.kind === "down" || (!e.hasRunFolder && app?.kind !== "up")) return false;
  }
  if (e.run !== null || e.isLaterRun === true) return look === null || look.kind === "loads";
  return (look === null ? e.hasLook : look.kind === "loads") && (e.hasReadCode || e.proposed.length > 0);
}
//@ chunk-ae5g0zb5.js:54228-54424 placement
/**
 * 应用细节：端口、框架、页面问题。
 */
function formatAppDetails(note) {
  let port = note.app?.port ?? null;
  let framework = note.about?.framework ?? null;
  let look = note.look;
  return [
    ...(port === null ? [] : [`:${port}`]),
    ...(framework === null ? [] : [framework]),
    ...(look === null ? [] : formatLookIssues(look.errors, look.failed)),
  ]
    .map((s) => ` \xB7 ${s}`)
    .join("");
}
//@ chunk-ae5g0zb5.js:54424-54513 placement
/**
 * 登录/支付/数据三句概述
 */
function appFactSummary(note) {
  let about = note.about;
  return about === null
    ? []
    : [
        SIGN_IN_SHORT_LABELS[about.signin],
        PAYMENT_SHORT_LABELS[about.payments],
        DATA_LOCATION_PHRASES[about.data],
      ];
}
//@ chunk-ae5g0zb5.js:54513-54800 placement
/**
 * 步骤行构造：完成（✓）、失败（✗）、待办（◻）、进行中（带标记）。
 */
var doneStep = (words, n) => ({
  mark: {
    text: "\u2713",
    tone: "success",
  },
  words,
  ...(n === undefined
    ? {}
    : {
        details: n,
      }),
  isNow: false,
});
var failedStep = (words) => ({
  mark: {
    text: "\u2717",
    tone: "error",
  },
  words,
  isNow: true,
});
var pendingStep = (words, isNow = false) => ({
  mark: {
    text: "\u25FB",
    tone: "dim",
  },
  words,
  isNow,
});
var activeStep = (text, words) => ({
  mark: {
    text,
    tone: "claude",
  },
  words,
  isNow: true,
});
//@ chunk-ae5g0zb5.js:54800-55035 placement
/**
 * 把步骤渲染成一行（进行中的 claude 色调步骤登记以便替换）。
 */
function renderStepRow(e, n, r = false) {
  let row = buildRow(
    e,
    spacedItem(n.mark, ""),
    [
      !n.isNow
        ? {
            text: n.words,
            tone: "dim",
          }
        : n.mark.tone === "claude"
          ? {
              text: n.words,
              tone: "title",
            }
          : {
              text: n.words,
            },
      {
        text: n.details ?? "",
        tone: "dim",
      },
    ],
    null,
    r,
  );
  if (n.mark.tone === "claude") weakSet.add(row);
  return row;
}
//@ chunk-ae5g0zb5.js:55035-55054 placement
var weakSet = new WeakSet();
//@ chunk-ae5g0zb5.js:55054-55174 placement
/**
 * 等待用户时把进行中的步骤替换为等待提示。
 */
function replaceActiveStepWithWaiting(e, n) {
  let index = e.findIndex((o) => weakSet.has(o));
  return index === -1
    ? e
    : [
        ...e.slice(0, index),
        renderStepRow(n, pendingStep(WAITING_IN_CHAT_TEXT, true), true),
        ...e.slice(index + 1),
      ];
}
//@ chunk-ae5g0zb5.js:55174-55447 placement
/**
 * 测试浏览器安装进度步骤。
 */
function browserInstallStep(install, n) {
  if (install.state === "failed")
    return {
      ...failedStep("Couldn't install the test browser"),
      details: SEE_THE_CHAT_SUFFIX,
    };
  if (install.state === "done") return doneStep("Test browser installed");
  return activeStep(
    n,
    install.percent === null
      ? "Installing the test browser\u2026"
      : `Installing the test browser\u2026 ${install.percent}%`,
  );
}
//@ chunk-ae5g0zb5.js:55447-55537 placement
/**
 * 安装步骤行
 */
function installStepRows(e, n, r) {
  return e.install === undefined || e.install === null
    ? []
    : [renderStepRow(r, browserInstallStep(e.install, n))];
}
//@ chunk-ae5g0zb5.js:55537-55616 placement
/**
 * 停止原因，修复中则显示“Fixing…”
 */
function haltStepOrFixing(e, n) {
  let r = describeRunHalt(e, n);
  return e.isFixing === true && r.words === APP_STARTING_TEXT ? activeStep(n, FIXING_TEXT) : r;
}
//@ chunk-ae5g0zb5.js:55616-55671 placement
/**
 * "Waiting for you in the chat"
 */
var WAITING_IN_CHAT_TEXT = "Waiting for you in the chat";
var FIXING_TEXT = "Fixing\u2026";
//@ chunk-ae5g0zb5.js:55671-56671 placement
function describeRunHalt(e, n) {
  let note = e.note ?? REPORT_STATE_TEXT;
  let { app, look } = note;
  let a = formatAppDetails(note);
  if (app?.state === "stopped") return pendingStep(APP_STOPPED_TEXT);
  if (look?.kind === "nothing") return failedStep("Nothing loaded");
  if (look?.kind === "empty") return failedStep(`Your app's first page stayed empty${a}`);
  if (
    e.isStartingApp === true &&
    e.halt === undefined &&
    (app === null || app === undefined || app.state === "down")
  )
    return activeStep(n, APP_STARTING_TEXT);
  if (app?.state === "down") return pendingStep(APP_NOT_RUNNING_TEXT, true);
  if (app?.state === "failed") return failedStep(`App didn't start \xB7 ${describePortInUse(app.failure)}`);
  if (app?.state === "busy") return portInUseStep(app.port);
  if (app?.state === "started")
    return doneStep(app.command === null ? "App started" : `App started (${app.command})`, a);
  if (app?.state === "running") return doneStep("App ready", a);
  if (look?.kind === "loads" || e.hasLook) return doneStep("Your app loads", a);
  let app_2 = e.early?.app ?? null;
  if (e.hasRunFolder && app_2?.kind !== "busy" && app_2?.kind !== "down")
    return activeStep(n, "Opening your app\u2026");
  switch (app_2?.kind) {
    case "checking":
      return activeStep(n, "Checking your app\u2026");
    case "up":
      return doneStep("App ready");
    case "down":
      return pendingStep(APP_NOT_RUNNING_TEXT, true);
    case "busy":
      return portInUseStep(app_2.port);
    default:
      return activeStep(n, "Getting ready\u2026");
  }
}
//@ chunk-ae5g0zb5.js:56671-56744 placement
/**
 * "App isn't running"
 */
var APP_NOT_RUNNING_TEXT = "App isn't running";
var APP_STOPPED_TEXT = "App stopped";
var APP_STARTING_TEXT = "Starting your app\u2026";
//@ chunk-ae5g0zb5.js:56744-56836 placement
/**
 * 端口被占用的失败行
 */
function portInUseStep(port) {
  return failedStep(`${port === null ? "Its port" : `Port ${port}`} is in use by another program`);
}
//@ chunk-ae5g0zb5.js:56836-57072 placement
/**
 * 运行停止的原因（declined/halted/blocked 或备注里的原因）。
 */
function resolveStopReason(e) {
  if (e.isAddressDeclined === true && e.run === null) return "declined";
  let n = e.halt === "stopped" ? "halted" : e.halt === "blocked" ? "blocked" : (e.note?.stopped ?? null);
  return n === null || e.run !== null || e.isReadingCode || e.isWritingTests === true ? null : n;
}
//@ chunk-ae5g0zb5.js:57072-57217 placement
/**
 * 停止原因行（必要时附“见聊天”）。
 */
function renderStopRow(e, stopReason) {
  let { mark, words } = BLOCKED_STATES[stopReason];
  return buildRow(
    e,
    spacedItem(mark, ""),
    stopReason === "signin" || stopReason === "declined"
      ? [
          {
            text: words,
          },
        ]
      : [
          {
            text: words,
          },
          {
            text: SEE_THE_CHAT_SUFFIX,
            tone: "dim",
          },
        ],
    null,
    true,
  );
}
//@ chunk-ae5g0zb5.js:57217-57298 placement
/**
 * 当前进行或成功完成的步骤
 */
function isNowStep(e) {
  return e.mark.tone !== "claude" && (e.isNow || e.mark.tone === "success");
}
//@ chunk-ae5g0zb5.js:57298-57954 placement
function formatReadingCodeStep(e, n, r, stopReason = null) {
  let note = e.note ?? REPORT_STATE_TEXT;
  let a = e.proposed.length;
  let i = appFactSummary(note);
  let c =
    e.hasReadCode || a > 0
      ? doneStep("Read your code")
      : e.isReadingCode || e.readingFolder !== null
        ? activeStep(
            n,
            e.readingFolder === null
              ? "Reading your code\u2026"
              : `Reading your code: ${e.readingFolder}\u2026`,
          )
        : pendingStep("Read your code");
  let _ =
    e.isWritingTests === true
      ? activeStep(n, "Writing the tests\u2026")
      : a > 0
        ? doneStep(`${a} ${a === 1 ? "test" : "tests"} written`)
        : pendingStep("Write the tests");
  let S = haltStepOrFixing(e, n);
  let w = i.length === 0 ? [] : [buildItemsBlock(r, 2, i, "dim")];
  if (stopReason !== null) {
    let f = stopReason === "declined" ? [] : [c, _];
    return [
      ...installStepRows(e, n, r),
      ...(isNowStep(S) ? [renderStepRow(r, S, true)] : []),
      ...w,
      ...f.filter(isNowStep).map((b) => renderStepRow(r, b)),
      renderStopRow(r, stopReason),
    ];
  }
  return [
    ...installStepRows(e, n, r),
    renderStepRow(r, S, true),
    ...w,
    renderStepRow(r, c),
    renderStepRow(r, _),
    renderStepRow(r, pendingStep("Run them")),
  ];
}
//@ chunk-ae5g0zb5.js:57954-58084 placement
/**
 * “App ready” 行及应用细节。
 */
function renderAppReadyRow(e, n) {
  return buildRow(
    n,
    spacedItem(
      {
        text: "\u2713",
        tone: "success",
      },
      "",
    ),
    [
      {
        text: "App ready",
      },
      {
        text: formatAppDetails(e.note ?? REPORT_STATE_TEXT),
        tone: "dim",
      },
    ],
    null,
    true,
  );
}
//@ chunk-ae5g0zb5.js:58084-58231 placement
/**
 * 面板标题行 “Claude Test · 项目” 与右侧说明。
 */
function renderPanelTitle(e, n, r) {
  return buildRow(
    e,
    [
      {
        text: "Claude Test",
        tone: "title",
      },
    ],
    [
      {
        text: n === null ? "" : ` \xB7 ${n}`,
        tone: "dim",
      },
    ],
    r === null
      ? null
      : {
          text: r,
          tone: "dim",
        },
  );
}
//@ chunk-ae5g0zb5.js:58231-58246 placement
var OTHER = "other";
//@ chunk-ae5g0zb5.js:58246-58281 placement
/**
 * 取分组键，缺省为 OTHER
 */
function groupKeyOf(e) {
  return (n) => e(n) ?? OTHER;
}
//@ chunk-ae5g0zb5.js:58281-58334 placement
/**
 * 是否有多个分组
 */
function hasMultipleGroups(e, n) {
  return new Set(e.map(groupKeyOf(n))).size > 1;
}
//@ chunk-ae5g0zb5.js:58334-58497 placement
/**
 * 按分组键给行插入分组标题。
 */
function groupRowsWithHeadings(e, n, r, o) {
  let s = hasMultipleGroups(n, r);
  let a = groupKeyOf(r);
  let i = [];
  n.forEach((c, _) => {
    if (s && (_ === 0 || a(n[_ - 1]) !== a(c)))
      i.push(
        textBlock(e, {
          text: humanizeSlug(a(c)),
          tone: "dim",
        }),
      );
    i.push(o(c));
  });
  return i;
}
//@ chunk-ae5g0zb5.js:58497-58572 placement
/**
 * "adds data" 警告标记
 */
var ADDS_DATA_MARK = {
  text: "adds data",
  tone: "warning",
};
var NOT_RE_RUN_MARK = {
  text: "not re-run",
  tone: "dim",
};
//@ chunk-ae5g0zb5.js:58572-58732 placement
/**
 * 按分组聚合行（OTHER 组放最后）。
 */
function orderRowsByGroup(e, n) {
  let r = groupKeyOf(n);
  return e
    .map(r)
    .filter((s, a, i) => i.indexOf(s) === a)
    .sort((s, a) => Number(s === OTHER) - Number(a === OTHER))
    .flatMap((s) => e.filter((a) => r(a) === s));
}
//@ chunk-ae5g0zb5.js:58732-58772 placement
/**
 * 按 area 分组排序
 */
function orderProposedRows(proposed) {
  return orderRowsByGroup(proposed, (n) => n.area);
}
//@ chunk-ae5g0zb5.js:58772-58878 placement
/**
 * 结果行色调：未重跑为暗色，有结论按 PASS/FAIL/BLOCKED，运行中为 claude。
 */
function rowTone(e, n) {
  return n.isNotReRun === true
    ? "dim"
    : n.verdict !== null
      ? VERDICT_TONES[n.verdict]
      : isLaneRunning(e, n.stem)
        ? "claude"
        : null;
}
//@ chunk-ae5g0zb5.js:58878-59437 placement
function buildPanelHeader(e, n, r) {
  let mapped = e.rows.map((_) => rowTone(e, _));
  let mapped_2 = e.rows.map((_) => _.verdict !== null);
  let min = Math.min(DEFAULT_PANE_WIDTH, Math.max(MIN_PANE_WIDTH, r));
  let i =
    mapped.length <= min
      ? mapped.map((tone, S) => ({
          tone,
          isFull: mapped_2[S],
        }))
      : Array.from(
          {
            length: min,
          },
          (_, S) => {
            let floored = Math.floor((S * mapped.length) / min);
            let floored_2 = Math.floor(((S + 1) * mapped.length) / min);
            let sliced = mapped.slice(floored, floored_2);
            return {
              tone: ["error", "warning", "claude", "success"].find((P) => sliced.includes(P)) ?? null,
              isFull: mapped_2.slice(floored, floored_2).every(Boolean),
            };
          },
        );
  let c = [];
  for (let { tone, isFull } of i) {
    let w = tone === null || !isFull ? n.empty : n.fill;
    let f = tone ?? "dim";
    let last = c.at(-1);
    if (last !== undefined && last.tone === f) last.text += w;
    else
      c.push({
        text: w,
        tone: f,
      });
  }
  return c;
}
//@ chunk-ae5g0zb5.js:59437-59757 placement
/**
 * 结果行排序：运行结束后按组内最早顺序排列。
 */
function orderResultRows(e) {
  let n = orderRowsByGroup(e.rows, areaOf);
  if (!e.finished) return n;
  let r = groupKeyOf(areaOf);
  let o = [];
  for (let s of n) {
    let found = o.find((i) => r(i[0]) === r(s));
    if (found === undefined) o.push([s]);
    else found.push(s);
  }
  return o
    .sort(
      (s, a) =>
        Math.min(...s.map(verdictRank)) - Math.min(...a.map(verdictRank)) ||
        Number(r(s[0]) === OTHER) - Number(r(a[0]) === OTHER),
    )
    .flatMap((s) => s.sort((a, i) => verdictRank(a) - verdictRank(i)));
}
//@ chunk-ae5g0zb5.js:59757-59786 placement
/**
 * 取行的 area
 */
function areaOf(e) {
  return e.area;
}
//@ chunk-ae5g0zb5.js:59786-59875 placement
/**
 * FAIL<BLOCKED<PASS<未重跑 的排序权重
 */
function verdictRank(e) {
  return e.isNotReRun === true ? 3 : e.verdict === "FAIL" ? 0 : e.verdict === "BLOCKED" ? 1 : 2;
}
//@ chunk-ae5g0zb5.js:59875-59921 placement
/**
 * 停止全部代理的按键提示
 */
var STOP_AGENTS_HINT = "ctrl+x ctrl+k twice stops all agents";
//@ chunk-ae5g0zb5.js:59921-59959 placement
/**
 * 生成暗色文本块
 */
function dimLine(e, ...n) {
  return textBlock(e, ...n);
}
//@ chunk-ae5g0zb5.js:59959-60139 placement
/**
 * 带前缀的条目列表，放不下时前缀单独一行。
 */
function renderLabeledItems(e, n) {
  return n.every((o) => REPORT_PREFIX.length + o.length <= e)
    ? n.map((o, s) => buildLabeledRow(e, o, s === 0 ? REPORT_PREFIX : " ".repeat(REPORT_PREFIX.length)))
    : [
        textBlock(e, {
          text: REPORT_PREFIX.trimEnd(),
          tone: "dim",
        }),
        ...n.map((o) => buildLabeledRow(e, o, "  ")),
      ];
}
//@ chunk-ae5g0zb5.js:60139-60220 placement
/**
 * 生成“标签 + 值”的行
 */
function buildLabeledRow(e, text, text_2) {
  return buildRow(
    e,
    [
      {
        text: text_2,
        tone: "dim",
      },
    ],
    [
      {
        text,
        tone: "dim",
      },
    ],
    null,
  );
}
//@ chunk-ae5g0zb5.js:60220-60240 placement
/**
 * 6
 */
var MAX_DETAIL_ROWS = 6;
var MIN_PASS_ROWS = 3;
var PANE_DEFAULT_WIDTH = 30;
//@ chunk-ae5g0zb5.js:60240-60305 placement
/**
 * 生成计数行
 */
function countRow(e, n, text) {
  return buildRow(
    e,
    spacedItem(n),
    [
      {
        text,
        tone: "dim",
      },
    ],
    null,
  );
}
//@ chunk-ae5g0zb5.js:60305-61168 placement
function formatResultSummary(e, n, r, o) {
  let s = orderResultRows(e);
  let a = groupRowsWithHeadings(n, s, (P) => P.area, o);
  if ((e.finished || s.length <= MAX_DETAIL_ROWS) && totalLines(a) <= r) return a;
  if (e.finished) {
    let filtered = s.filter((j) => j.verdict !== "PASS");
    let filtered_2 = s.filter((j) => j.verdict === "PASS");
    let O = filtered_2.length;
    while (O > 0 && filtered.length + O + (filtered_2.length > O ? 1 : 0) > r) O -= 1;
    return [
      ...filtered.map(o),
      ...filtered_2.slice(0, O).map(o),
      ...(filtered_2.length > O
        ? [
            countRow(
              n,
              {
                text: "\u2713",
                tone: "success",
              },
              `${filtered_2.length - O} more`,
            ),
          ]
        : []),
    ];
  }
  let reduced = s.reduce((acc, F) => acc + (F.verdict === "PASS" ? 1 : 0), 0);
  let filtered = s.filter((P) => P.verdict === "FAIL" || P.verdict === "BLOCKED" || isLaneRunning(e, P.stem));
  let filtered_2 = e.rows.filter((P) => P.verdict === null && !isLaneRunning(e, P.stem));
  let S = filtered.length + (reduced > 0 ? 1 : 0);
  let min = Math.min(MIN_PASS_ROWS, filtered_2.length);
  if (filtered_2.length === min + 1 && S + min + 1 <= r) min += 1;
  while (min > 0 && S + min + (filtered_2.length > min ? 1 : 0) > r) min -= 1;
  let f =
    reduced === 0
      ? []
      : [
          countRow(
            n,
            {
              text: "\u2713",
              tone: "success",
            },
            `${reduced} passed`,
          ),
        ];
  let b =
    filtered_2.length > min
      ? [
          countRow(
            n,
            {
              text: "\u25FB",
              tone: "dim",
            },
            `${filtered_2.length - min} more`,
          ),
        ]
      : [];
  return [...f, ...filtered.map(o), ...filtered_2.slice(0, min).map(o), ...b];
}
//@ chunk-ae5g0zb5.js:61168-61295 placement
/**
 * 渲染面板；等待用户时把进行中的步骤换成等待提示。
 */
function renderClaudeTestPane(
  e,
  n,
  r = 60,
  glyphs = INLINE_IMAGE_SUPPORT,
  s = PANE_DEFAULT_WIDTH,
  a = false,
) {
  let i = renderClaudeTestPanel(e, n, r, glyphs, s, a);
  return e.isWaitingForPerson === true ? replaceActiveStepWithWaiting(i, Math.max(20, Math.floor(r))) : i;
}
//@ chunk-ae5g0zb5.js:61295-61403 placement
/**
 * 待运行规格行。
 */
function renderPendingSpecRow(e, n) {
  return buildRow(
    e,
    spacedItem({
      text: "\u25FB",
      tone: "dim",
    }),
    [
      {
        text: n.name ?? displayNameForStem(n.stem),
      },
    ],
    n.addsData ? ADDS_DATA_MARK : null,
  );
}
//@ chunk-ae5g0zb5.js:61403-61492 placement
/**
 * 统计某结论的行数
 */
function countVerdict(e, n) {
  return e.rows.reduce((acc, o) => acc + (o.verdict === n && o.isNotReRun !== true ? 1 : 0), 0);
}
//@ chunk-ae5g0zb5.js:61492-61769 placement
/**
 * 结果行的耗时文本（完成用总秒数，运行中按开始时间推算）。
 */
function rowElapsedLabel(e, n, readAt, o) {
  if (n.verdict === "BLOCKED") return null;
  if (n.verdict !== null) return n.seconds === null ? null : formatElapsed(n.seconds * 1000);
  if (e.lanesRunning !== undefined) {
    let s = isLaneRunning(e, n.stem) ? laneElapsedSeconds(e, n.stem, readAt) : null;
    return s !== null ? formatElapsed(s * 1000) : null;
  }
  return n.stem === e.running && o !== null ? formatElapsed(o * 1000) : null;
}
//@ chunk-ae5g0zb5.js:61769-66493 placement
/**
 * 生成 Claude Test 面板内容：登录、开始测试、审批规格、结果与修复建议（约 4.7 KB）。
 */
function renderClaudeTestPanel(e, n, r, o, s, a) {
  let max = Math.max(20, Math.floor(r));
  let c = withCheckingAppState(e, n);
  let _ = formatResultCounts(c);
  let S =
    _?.run ?? (c.run !== null && c.earlier?.finished === true ? adjustSkippedCount(c.run, c.earlier) : c.run);
  let w = c.halt !== undefined && S !== null && !S.finished;
  let f =
    S !== null && w
      ? {
          ...S,
          running: null,
          lanesRunning: undefined,
        }
      : S;
  let b = spinnerGlyph(n, o);
  let P = f?.app ?? c.note?.name ?? c.early?.name ?? null;
  if (f === null) {
    let C = c.isStartingRun === true && c.isLaterRun !== true;
    let L = C
      ? {
          ...c,
          isReadingCode: false,
          hasReadCode: true,
          isWritingTests: false,
        }
      : c;
    let stopReason = resolveStopReason(L);
    let de = C && stopReason === null;
    let q = L.proposed.length;
    if (!(stopReason !== "signin" && (de || (q > 0 && (L.isWritingTests !== true || L.hasOutline === true)))))
      return [
        renderPanelTitle(max, P, null),
        ...(L.isLaterRun === true || L.isOpening === true
          ? [
              ...installStepRows(L, b, max),
              describeAppState(L)
                ? renderAppReadyRow(L, max)
                : renderStepRow(max, haltStepOrFixing(L, b), true),
              ...(stopReason === null ? [] : [renderStopRow(max, stopReason)]),
            ]
          : formatReadingCodeStep(L, b, max, stopReason)),
      ];
    let gt = L.isLaterRun === true;
    let nn = !gt && !de && (L.startsAtOutline !== true || L.proposed.some((Ue) => Ue.addsData));
    let D = !gt && !nn && stopReason === null && (de || L.startsAtOutline === true) && describeAppState(L);
    let Q = appFactSummary(L.note ?? REPORT_STATE_TEXT);
    let Re = [
      renderPanelTitle(max, P, null),
      ...(describeAppState(L)
        ? [
            renderAppReadyRow(L, max),
            ...(Q.length === 0 ? [] : [buildItemsBlock(max, 2, Q, "dim")]),
            ...(D ? [renderStepRow(max, activeStep(b, "Starting the tests\u2026"))] : []),
          ]
        : L.isLaterRun === true
          ? [renderStepRow(max, haltStepOrFixing(L, b), true)]
          : formatReadingCodeStep(L, b, max)),
      EMPTY_TEXT_SPAN,
    ];
    let rn =
      stopReason !== null
        ? [EMPTY_TEXT_SPAN, renderStopRow(max, stopReason)]
        : nn
          ? [
              EMPTY_TEXT_SPAN,
              dimLine(max, {
                text: "Approve or change them in the chat",
                tone: "dim",
              }),
            ]
          : [];
    let max_2 = Math.max(3, s - totalLines(Re) - totalLines(rn));
    let Zn = orderProposedRows(L.proposed);
    let es = groupRowsWithHeadings(
      max,
      Zn,
      (Ue) => Ue.area,
      (Ue) => renderPendingSpecRow(max, Ue),
    );
    return [
      ...Re,
      ...(totalLines(es) <= max_2
        ? es
        : [
            ...Zn.slice(0, max_2 - 1).map((Ue) => renderPendingSpecRow(max, Ue)),
            countRow(
              max,
              {
                text: "\u25FB",
                tone: "dim",
              },
              `${Zn.length - (max_2 - 1)} more`,
            ),
          ]),
      ...rn,
    ];
  }
  let reduced = f.rows.reduce((acc, L) => acc + (L.isNotReRun === true ? 1 : 0), 0);
  let O = f.rows.length - countVerdict(f, null);
  let readAt = c.readAt ?? n;
  let se = secondsSinceLastDone(f, readAt);
  let J = c.isFixRerun === true;
  let ne = J ? 0 : (_?.earlierS ?? 0);
  let ce = J ? (_?.earlierRows ?? 0) : 0;
  let pe = !f.started;
  let ie = w ? f.doneAtS : runElapsedSeconds(f, O, readAt);
  let he = pe ? null : formatElapsed(((J ? 0 : (_?.earlierClockS ?? 0)) + ie) * 1000);
  let R = [
    renderPanelTitle(max, P, he),
    ...(_ === null
      ? [describeAppState(c) ? renderAppReadyRow(c, max) : renderStepRow(max, haltStepOrFixing(c, b), true)]
      : isAppUnusable(c.note ?? REPORT_STATE_TEXT)
        ? [renderStepRow(max, haltStepOrFixing(c, b), true)]
        : []),
  ];
  if (f.finished) {
    let C = countVerdict(f, "FAIL");
    let L = countVerdict(f, "BLOCKED");
    let mapped = [
      [C, "failed"],
      [L, "blocked"],
      [countVerdict(f, "PASS"), "passed"],
      [reduced, "not re-run yet"],
    ]
      .filter(([q]) => q > 0)
      .map(([q, be]) => ({
        text: `${q} ${be}`,
        tone: "title",
      }));
    R.push(
      buildRow(
        max,
        spacedItem(
          C > 0
            ? {
                text: "\u2717",
                tone: "error",
              }
            : L > 0
              ? {
                  text: "\u26A0",
                  tone: "warning",
                }
              : {
                  text: "\u2713",
                  tone: "success",
                },
          "",
        ),
        mapped.length === 0
          ? [
              {
                text: "Nothing ran",
              },
            ]
          : [
              ...mapped.flatMap((q, be) =>
                be === 0
                  ? [q]
                  : [
                      {
                        text: " \xB7 ",
                        tone: "dim",
                      },
                      q,
                    ],
              ),
              ...(f.skipped === undefined
                ? []
                : [
                    {
                      text: ` \xB7 ${f.skipped} skipped`,
                      tone: "dim",
                    },
                  ]),
            ],
        null,
      ),
    );
  } else if (w && f.started) {
    let C = [
      [countVerdict(f, "FAIL"), "failed"],
      [countVerdict(f, "BLOCKED"), "blocked"],
      [countVerdict(f, "PASS"), "passed"],
      [countVerdict(f, null), "not run"],
    ];
    R.push(
      buildRow(
        max,
        spacedItem(BLOCKED_STATES.halted.mark, ""),
        [
          {
            text: c.halt === "blocked" ? "Blocked" : "Stopped",
            tone: "title",
          },
          ...C.filter(([L]) => L > 0).map(([L, Y]) => ({
            text: ` \xB7 ${L} ${Y}`,
          })),
        ],
        null,
        true,
      ),
    );
  } else if (w) R.push(renderStopRow(max, c.halt === "blocked" ? "blocked" : "halted"));
  else {
    let C = f.rows.length > 0 && O === f.rows.length;
    let L =
      C || pe ? null : estimateRemainingSeconds(ne + f.doneAtS, O - ce, f.rows.length - ce, ie - f.doneAtS);
    let Y = [
      {
        text: `  ${O} of ${f.rows.length} done`,
      },
      {
        text: L === null ? "" : L === 0 ? " \xB7 almost done" : ` \xB7 about ${formatElapsed(L * 1000)} left`,
        tone: "dim",
      },
    ];
    R.push(buildRow(max, buildPanelHeader(f, o, max - joinSpans(Y).length), Y, null));
    if (C) R.push(renderStepRow(max, activeStep(b, finishingPhaseLabel(f, n))));
    if (pe) {
      let stopReason = resolveStopReason(c);
      let q = f.rows.length - O;
      R.push(
        stopReason === null
          ? renderStepRow(
              max,
              activeStep(
                b,
                c.isFixRerun === true
                  ? `Re-running ${q} ${q === 1 ? "test" : "tests"}\u2026`
                  : `Starting ${q} more ${q === 1 ? "test" : "tests"}\u2026`,
              ),
            )
          : renderStopRow(max, stopReason),
      );
    }
  }
  if (f.rows.length === 0) return R;
  R.push(EMPTY_TEXT_SPAN);
  let max_2 = Math.max(MAX_THREAD_ROWS, ...f.rows.map((C) => rowElapsedLabel(f, C, readAt, se)?.length ?? 0));
  let Z = countVerdict(f, "FAIL");
  let ye = countVerdict(f, "BLOCKED");
  let Qe = f.finished && c.isMoreDeclined !== true ? (c.note?.more ?? []) : [];
  let We =
    Qe.length === 0
      ? []
      : [
          EMPTY_TEXT_SPAN,
          textBlock(max, {
            text: "More tests ready",
            tone: "dim",
          }),
          ...Qe.map((C) =>
            buildRow(
              max,
              spacedItem({
                text: "\u25FB",
                tone: "dim",
              }),
              [
                {
                  text: c.proposed.find((L) => L.stem === C)?.name ?? displayNameForStem(C),
                },
              ],
              null,
            ),
          ),
        ];
  let Ge = _ === null ? null : (c.note?.from ?? null);
  let en = isValidSpecPath(c.appFolder) ? `${c.appFolder}/${RUNS_DIR}` : RUNS_DIR;
  let tn =
    f.finished && a && typeof c.runId === "string" && RUN_ID_RE.test(c.runId)
      ? renderLabeledItems(max, [
          `${en}/${c.runId}/`,
          ...(Ge !== null && RUN_ID_RE.test(Ge) ? [`${en}/${Ge}/`] : []),
        ])
      : [];
  let et = w
    ? [
        EMPTY_TEXT_SPAN,
        dimLine(
          max,
          {
            text: "Run ",
            tone: "dim",
          },
          {
            text: "/claude-test",
            tone: "title",
          },
          {
            text: " to start again",
            tone: "dim",
          },
        ),
      ]
    : !f.finished
      ? []
      : [
          EMPTY_TEXT_SPAN,
          (Z > 0 || reduced > 0) && c.note?.noFix !== true
            ? dimLine(
                max,
                {
                  text: "Details in the chat \xB7 ",
                  tone: "dim",
                },
                {
                  text: "/claude-test fix",
                  tone: "title",
                },
              )
            : ye > 0 || Z > 0
              ? dimLine(max, {
                  text: "Details in the chat",
                  tone: "dim",
                })
              : dimLine(
                  max,
                  {
                    text: "Run ",
                    tone: "dim",
                  },
                  {
                    text: "/claude-test",
                    tone: "title",
                  },
                  {
                    text: " after your next change",
                    tone: "dim",
                  },
                ),
          ...tn,
        ];
  R.push(
    ...formatResultSummary(f, max, Math.max(3, s - totalLines(R) - totalLines(We) - totalLines(et)), (C) => {
      let L = isLaneRunning(f, C.stem);
      if (C.isNotReRun === true)
        return buildRow(
          max,
          spacedItem({
            text: "\u2013",
            tone: "dim",
          }),
          [
            {
              text: C.name,
              tone: "dim",
            },
          ],
          NOT_RE_RUN_MARK,
        );
      let Y = rowElapsedLabel(f, C, readAt, se);
      let de =
        C.verdict !== null
          ? {
              text: VERDICT_MARKS[C.verdict],
              tone: VERDICT_TONES[C.verdict],
            }
          : L
            ? {
                text: b,
                tone: "claude",
              }
            : {
                text: "\u25FB",
                tone: "dim",
              };
      let q =
        C.verdict === null && !L && C.addsData
          ? ADDS_DATA_MARK
          : Y === null
            ? null
            : {
                text: Y.padStart(max_2),
                tone: "dim",
              };
      let be =
        C.verdict !== null
          ? {
              text: C.name,
            }
          : L
            ? {
                text: C.name,
                tone: "title",
              }
            : {
                text: C.name,
                tone: "dim",
              };
      return buildRow(max, spacedItem(de), [be], q);
    }),
    ...We,
    ...et,
  );
  if (f.started && !f.finished && !w && totalLines(R) + 1 <= s)
    R.push(
      dimLine(max, {
        text: STOP_AGENTS_HINT,
        tone: "dim",
      }),
    );
  return R;
}
//@ chunk-ae5g0zb5.js:66493-66549 placement
/**
 * 由文件名 stem 得到显示名
 */
function displayNameForStem(stem) {
  return collapseAndTruncate(capitalize(stem.replaceAll("-", " ")), 140);
}
//@ chunk-ae5g0zb5.js:66549-66639 placement
/**
 * 统计文本行数
 */
function lineCount(text) {
  let n = 1;
  for (
    let index = text.indexOf(`
`);
    index !== -1;
    index = text.indexOf(
      `
`,
      index + 1,
    )
  )
    n += 1;
  return n;
}
//@ chunk-ae5g0zb5.js:66639-66693 placement
/**
 * 所有行合计行数
 */
function totalLines(e) {
  return e.reduce((acc, r) => acc + lineCount(r.text), 0);
}
//@ chunk-ae5g0zb5.js:66693-66716 placement
/**
 * 0.5
 */
var WRAP_FRACTION = 0.5;
var WIDE_CHAR_FACTOR = 1.6;
var MAX_NAME_CHARS = 6;
export {
  WIDE_CHAR_FACTOR,
  WRAP_FRACTION,
  MAX_NAME_CHARS,
  PANE_DEFAULT_WIDTH,
  renderClaudeTestPane,
  totalLines,
};
