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
function finishingPhaseLabel(run, now) {
  let expectedDoneAt = run.startedAtMs === null ? null : run.startedAtMs + run.doneAtS * 1000;
  return run.hasLog || (expectedDoneAt !== null && now - expectedDoneAt >= RUN_STALE_MS)
    ? "Writing the report\u2026"
    : "Checking the page\u2026";
}
//@ chunk-ae5g0zb5.js:52543-53280 placement
function formatResultCounts(state) {
  let earlier = state.earlier;
  if (earlier === null || earlier === undefined || !earlier.finished) return null;
  let currentRun =
    state.run ??
    (state.proposed.length === 0
      ? null
      : {
          rows: orderProposedRows(state.proposed).map((row) => ({
            stem: row.stem,
            name: row.name ?? displayNameForStem(row.stem),
            area: row.area,
            verdict: null,
            seconds: null,
            addsData: row.addsData,
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
  if (currentRun === null) return null;
  let currentStems = new Set(currentRun.rows.map((row) => row.stem));
  let fixedStems = state.isFixRerun === true ? (state.fixedStems ?? []) : [];
  let mapped = earlier.rows
    .filter((row) => row.verdict !== null && !currentStems.has(row.stem))
    .map((row) =>
      row.verdict !== "PASS" && fixedStems.includes(row.stem)
        ? {
            ...row,
            isNotReRun: true,
          }
        : row,
    );
  return mapped.length === 0
    ? null
    : {
        run: {
          ...adjustSkippedCount(currentRun, earlier),
          rows: [...mapped, ...currentRun.rows],
          app: currentRun.app ?? earlier.app,
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
function adjustSkippedCount(run, earlier) {
  let { skipped, ...rest } = run;
  let earlierStems = new Set(earlier.rows.map((row) => row.stem));
  let reduced = run.rows.reduce((acc, row) => acc + (earlierStems.has(row.stem) ? 0 : 1), 0);
  let skippedCount = earlier.skipped === undefined ? 0 : Math.max(0, earlier.skipped - reduced);
  return {
    ...rest,
    ...(skippedCount >= 1 && {
      skipped: skippedCount,
    }),
  };
}
//@ chunk-ae5g0zb5.js:53483-53625 placement
/**
 * 应用宕机/失败/忙或页面为空时为 true。
 */
function isAppUnusable(state) {
  return (
    state.app?.state === "down" ||
    state.app?.state === "failed" ||
    state.app?.state === "busy" ||
    state.look?.kind === "empty" ||
    state.look?.kind === "nothing"
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
function describeAppState(facts) {
  let note = facts.note ?? REPORT_STATE_TEXT;
  let look = note.look;
  if (
    note.app?.state === "down" ||
    note.app?.state === "failed" ||
    note.app?.state === "busy" ||
    note.app?.state === "stopped"
  )
    return false;
  if (facts.run === null && note.app === null && look === null && !facts.hasLook) {
    let app = facts.early?.app ?? null;
    if (app?.kind === "busy" || app?.kind === "down" || (!facts.hasRunFolder && app?.kind !== "up"))
      return false;
  }
  if (facts.run !== null || facts.isLaterRun === true) return look === null || look.kind === "loads";
  return (
    (look === null ? facts.hasLook : look.kind === "loads") &&
    (facts.hasReadCode || facts.proposed.length > 0)
  );
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
    .map((part) => ` \xB7 ${part}`)
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
var doneStep = (words, details) => ({
  mark: {
    text: "\u2713",
    tone: "success",
  },
  words,
  ...(details === undefined
    ? {}
    : {
        details,
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
function renderStepRow(ctx, step, isWide = false) {
  let row = buildRow(
    ctx,
    spacedItem(step.mark, ""),
    [
      !step.isNow
        ? {
            text: step.words,
            tone: "dim",
          }
        : step.mark.tone === "claude"
          ? {
              text: step.words,
              tone: "title",
            }
          : {
              text: step.words,
            },
      {
        text: step.details ?? "",
        tone: "dim",
      },
    ],
    null,
    isWide,
  );
  if (step.mark.tone === "claude") weakSet.add(row);
  return row;
}
//@ chunk-ae5g0zb5.js:55035-55054 placement
var weakSet = new WeakSet();
//@ chunk-ae5g0zb5.js:55054-55174 placement
/**
 * 等待用户时把进行中的步骤替换为等待提示。
 */
function replaceActiveStepWithWaiting(rows, ctx) {
  let index = rows.findIndex((row) => weakSet.has(row));
  return index === -1
    ? rows
    : [
        ...rows.slice(0, index),
        renderStepRow(ctx, pendingStep(WAITING_IN_CHAT_TEXT, true), true),
        ...rows.slice(index + 1),
      ];
}
//@ chunk-ae5g0zb5.js:55174-55447 placement
/**
 * 测试浏览器安装进度步骤。
 */
function browserInstallStep(install, mark) {
  if (install.state === "failed")
    return {
      ...failedStep("Couldn't install the test browser"),
      details: SEE_THE_CHAT_SUFFIX,
    };
  if (install.state === "done") return doneStep("Test browser installed");
  return activeStep(
    mark,
    install.percent === null
      ? "Installing the test browser\u2026"
      : `Installing the test browser\u2026 ${install.percent}%`,
  );
}
//@ chunk-ae5g0zb5.js:55447-55537 placement
/**
 * 安装步骤行
 */
function installStepRows(facts, mark, ctx) {
  return facts.install === undefined || facts.install === null
    ? []
    : [renderStepRow(ctx, browserInstallStep(facts.install, mark))];
}
//@ chunk-ae5g0zb5.js:55537-55616 placement
/**
 * 停止原因，修复中则显示“Fixing…”
 */
function haltStepOrFixing(facts, mark) {
  let haltStep = describeRunHalt(facts, mark);
  return facts.isFixing === true && haltStep.words === APP_STARTING_TEXT
    ? activeStep(mark, FIXING_TEXT)
    : haltStep;
}
//@ chunk-ae5g0zb5.js:55616-55671 placement
/**
 * "Waiting for you in the chat"
 */
var WAITING_IN_CHAT_TEXT = "Waiting for you in the chat";
var FIXING_TEXT = "Fixing\u2026";
//@ chunk-ae5g0zb5.js:55671-56671 placement
function describeRunHalt(facts, mark) {
  let note = facts.note ?? REPORT_STATE_TEXT;
  let { app, look } = note;
  let appDetails = formatAppDetails(note);
  if (app?.state === "stopped") return pendingStep(APP_STOPPED_TEXT);
  if (look?.kind === "nothing") return failedStep("Nothing loaded");
  if (look?.kind === "empty") return failedStep(`Your app's first page stayed empty${appDetails}`);
  if (
    facts.isStartingApp === true &&
    facts.halt === undefined &&
    (app === null || app === undefined || app.state === "down")
  )
    return activeStep(mark, APP_STARTING_TEXT);
  if (app?.state === "down") return pendingStep(APP_NOT_RUNNING_TEXT, true);
  if (app?.state === "failed") return failedStep(`App didn't start \xB7 ${describePortInUse(app.failure)}`);
  if (app?.state === "busy") return portInUseStep(app.port);
  if (app?.state === "started")
    return doneStep(app.command === null ? "App started" : `App started (${app.command})`, appDetails);
  if (app?.state === "running") return doneStep("App ready", appDetails);
  if (look?.kind === "loads" || facts.hasLook) return doneStep("Your app loads", appDetails);
  let app_2 = facts.early?.app ?? null;
  if (facts.hasRunFolder && app_2?.kind !== "busy" && app_2?.kind !== "down")
    return activeStep(mark, "Opening your app\u2026");
  switch (app_2?.kind) {
    case "checking":
      return activeStep(mark, "Checking your app\u2026");
    case "up":
      return doneStep("App ready");
    case "down":
      return pendingStep(APP_NOT_RUNNING_TEXT, true);
    case "busy":
      return portInUseStep(app_2.port);
    default:
      return activeStep(mark, "Getting ready\u2026");
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
function resolveStopReason(facts) {
  if (facts.isAddressDeclined === true && facts.run === null) return "declined";
  let reason =
    facts.halt === "stopped"
      ? "halted"
      : facts.halt === "blocked"
        ? "blocked"
        : (facts.note?.stopped ?? null);
  return reason === null || facts.run !== null || facts.isReadingCode || facts.isWritingTests === true
    ? null
    : reason;
}
//@ chunk-ae5g0zb5.js:57072-57217 placement
/**
 * 停止原因行（必要时附“见聊天”）。
 */
function renderStopRow(ctx, stopReason) {
  let { mark, words } = BLOCKED_STATES[stopReason];
  return buildRow(
    ctx,
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
function isNowStep(step) {
  return step.mark.tone !== "claude" && (step.isNow || step.mark.tone === "success");
}
//@ chunk-ae5g0zb5.js:57298-57954 placement
function formatReadingCodeStep(facts, mark, ctx, stopReason = null) {
  let note = facts.note ?? REPORT_STATE_TEXT;
  let proposedCount = facts.proposed.length;
  let appSummary = appFactSummary(note);
  let readStep =
    facts.hasReadCode || proposedCount > 0
      ? doneStep("Read your code")
      : facts.isReadingCode || facts.readingFolder !== null
        ? activeStep(
            mark,
            facts.readingFolder === null
              ? "Reading your code\u2026"
              : `Reading your code: ${facts.readingFolder}\u2026`,
          )
        : pendingStep("Read your code");
  let writeStep =
    facts.isWritingTests === true
      ? activeStep(mark, "Writing the tests\u2026")
      : proposedCount > 0
        ? doneStep(`${proposedCount} ${proposedCount === 1 ? "test" : "tests"} written`)
        : pendingStep("Write the tests");
  let haltStep = haltStepOrFixing(facts, mark);
  let summaryRows = appSummary.length === 0 ? [] : [buildItemsBlock(ctx, 2, appSummary, "dim")];
  if (stopReason !== null) {
    let candidateSteps = stopReason === "declined" ? [] : [readStep, writeStep];
    return [
      ...installStepRows(facts, mark, ctx),
      ...(isNowStep(haltStep) ? [renderStepRow(ctx, haltStep, true)] : []),
      ...summaryRows,
      ...candidateSteps.filter(isNowStep).map((step) => renderStepRow(ctx, step)),
      renderStopRow(ctx, stopReason),
    ];
  }
  return [
    ...installStepRows(facts, mark, ctx),
    renderStepRow(ctx, haltStep, true),
    ...summaryRows,
    renderStepRow(ctx, readStep),
    renderStepRow(ctx, writeStep),
    renderStepRow(ctx, pendingStep("Run them")),
  ];
}
//@ chunk-ae5g0zb5.js:57954-58084 placement
/**
 * “App ready” 行及应用细节。
 */
function renderAppReadyRow(facts, ctx) {
  return buildRow(
    ctx,
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
        text: formatAppDetails(facts.note ?? REPORT_STATE_TEXT),
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
function renderPanelTitle(ctx, subtitle, right) {
  return buildRow(
    ctx,
    [
      {
        text: "Claude Test",
        tone: "title",
      },
    ],
    [
      {
        text: subtitle === null ? "" : ` \xB7 ${subtitle}`,
        tone: "dim",
      },
    ],
    right === null
      ? null
      : {
          text: right,
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
function groupKeyOf(keyOf) {
  return (row) => keyOf(row) ?? OTHER;
}
//@ chunk-ae5g0zb5.js:58281-58334 placement
/**
 * 是否有多个分组
 */
function hasMultipleGroups(rows, keyOf) {
  return new Set(rows.map(groupKeyOf(keyOf))).size > 1;
}
//@ chunk-ae5g0zb5.js:58334-58497 placement
/**
 * 按分组键给行插入分组标题。
 */
function groupRowsWithHeadings(ctx, rows, keyOf, renderRow) {
  let hasGroups = hasMultipleGroups(rows, keyOf);
  let keyOfRow = groupKeyOf(keyOf);
  let out = [];
  rows.forEach((row, index) => {
    if (hasGroups && (index === 0 || keyOfRow(rows[index - 1]) !== keyOfRow(row)))
      out.push(
        textBlock(ctx, {
          text: humanizeSlug(keyOfRow(row)),
          tone: "dim",
        }),
      );
    out.push(renderRow(row));
  });
  return out;
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
function orderRowsByGroup(rows, keyOf) {
  let keyOfRow = groupKeyOf(keyOf);
  return rows
    .map(keyOfRow)
    .filter((key, index, keys) => keys.indexOf(key) === index)
    .sort((keyA, keyB) => Number(keyA === OTHER) - Number(keyB === OTHER))
    .flatMap((key) => rows.filter((row) => keyOfRow(row) === key));
}
//@ chunk-ae5g0zb5.js:58732-58772 placement
/**
 * 按 area 分组排序
 */
function orderProposedRows(rows) {
  return orderRowsByGroup(rows, (row) => row.area);
}
//@ chunk-ae5g0zb5.js:58772-58878 placement
/**
 * 结果行色调：未重跑为暗色，有结论按 PASS/FAIL/BLOCKED，运行中为 claude。
 */
function rowTone(state, row) {
  return row.isNotReRun === true
    ? "dim"
    : row.verdict !== null
      ? VERDICT_TONES[row.verdict]
      : isLaneRunning(state, row.stem)
        ? "claude"
        : null;
}
//@ chunk-ae5g0zb5.js:58878-59437 placement
function buildPanelHeader(state, icons, columns) {
  let mapped = state.rows.map((row) => rowTone(state, row));
  let mapped_2 = state.rows.map((row) => row.verdict !== null);
  let min = Math.min(DEFAULT_PANE_WIDTH, Math.max(MIN_PANE_WIDTH, columns));
  let cells =
    mapped.length <= min
      ? mapped.map((tone, index) => ({
          tone,
          isFull: mapped_2[index],
        }))
      : Array.from(
          {
            length: min,
          },
          (unused, cellIndex) => {
            let floored = Math.floor((cellIndex * mapped.length) / min);
            let floored_2 = Math.floor(((cellIndex + 1) * mapped.length) / min);
            let sliced = mapped.slice(floored, floored_2);
            return {
              tone: ["error", "warning", "claude", "success"].find((tone) => sliced.includes(tone)) ?? null,
              isFull: mapped_2.slice(floored, floored_2).every(Boolean),
            };
          },
        );
  let segments = [];
  for (let { tone, isFull } of cells) {
    let text = tone === null || !isFull ? icons.empty : icons.fill;
    let cellTone = tone ?? "dim";
    let last = segments.at(-1);
    if (last !== undefined && last.tone === cellTone) last.text += text;
    else
      segments.push({
        text,
        tone: cellTone,
      });
  }
  return segments;
}
//@ chunk-ae5g0zb5.js:59437-59757 placement
/**
 * 结果行排序：运行结束后按组内最早顺序排列。
 */
function orderResultRows(results) {
  let rows = orderRowsByGroup(results.rows, areaOf);
  if (!results.finished) return rows;
  let keyOf = groupKeyOf(areaOf);
  let groups = [];
  for (let row of rows) {
    let found = groups.find((group) => keyOf(group[0]) === keyOf(row));
    if (found === undefined) groups.push([row]);
    else found.push(row);
  }
  return groups
    .sort(
      (groupA, groupB) =>
        Math.min(...groupA.map(verdictRank)) - Math.min(...groupB.map(verdictRank)) ||
        Number(keyOf(groupA[0]) === OTHER) - Number(keyOf(groupB[0]) === OTHER),
    )
    .flatMap((group) => group.sort((rowA, rowB) => verdictRank(rowA) - verdictRank(rowB)));
}
//@ chunk-ae5g0zb5.js:59757-59786 placement
/**
 * 取行的 area
 */
function areaOf(row) {
  return row.area;
}
//@ chunk-ae5g0zb5.js:59786-59875 placement
/**
 * FAIL<BLOCKED<PASS<未重跑 的排序权重
 */
function verdictRank(row) {
  return row.isNotReRun === true ? 3 : row.verdict === "FAIL" ? 0 : row.verdict === "BLOCKED" ? 1 : 2;
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
function dimLine(ctx, ...rest) {
  return textBlock(ctx, ...rest);
}
//@ chunk-ae5g0zb5.js:59959-60139 placement
/**
 * 带前缀的条目列表，放不下时前缀单独一行。
 */
function renderLabeledItems(width, items) {
  return items.every((item) => REPORT_PREFIX.length + item.length <= width)
    ? items.map((item, index) =>
        buildLabeledRow(width, item, index === 0 ? REPORT_PREFIX : " ".repeat(REPORT_PREFIX.length)),
      )
    : [
        textBlock(width, {
          text: REPORT_PREFIX.trimEnd(),
          tone: "dim",
        }),
        ...items.map((item) => buildLabeledRow(width, item, "  ")),
      ];
}
//@ chunk-ae5g0zb5.js:60139-60220 placement
/**
 * 生成“标签 + 值”的行
 */
function buildLabeledRow(ctx, text, text_2) {
  return buildRow(
    ctx,
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
function countRow(ctx, item, text) {
  return buildRow(
    ctx,
    spacedItem(item),
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
function formatResultSummary(state, ctx, maxRows, renderRow) {
  let rows = orderResultRows(state);
  let withHeadings = groupRowsWithHeadings(ctx, rows, (row) => row.area, renderRow);
  if ((state.finished || rows.length <= MAX_DETAIL_ROWS) && totalLines(withHeadings) <= maxRows)
    return withHeadings;
  if (state.finished) {
    let filtered = rows.filter((row) => row.verdict !== "PASS");
    let filtered_2 = rows.filter((row) => row.verdict === "PASS");
    let passShown = filtered_2.length;
    while (passShown > 0 && filtered.length + passShown + (filtered_2.length > passShown ? 1 : 0) > maxRows)
      passShown -= 1;
    return [
      ...filtered.map(renderRow),
      ...filtered_2.slice(0, passShown).map(renderRow),
      ...(filtered_2.length > passShown
        ? [
            countRow(
              ctx,
              {
                text: "\u2713",
                tone: "success",
              },
              `${filtered_2.length - passShown} more`,
            ),
          ]
        : []),
    ];
  }
  let reduced = rows.reduce((acc, row) => acc + (row.verdict === "PASS" ? 1 : 0), 0);
  let filtered = rows.filter(
    (row) => row.verdict === "FAIL" || row.verdict === "BLOCKED" || isLaneRunning(state, row.stem),
  );
  let filtered_2 = state.rows.filter((row) => row.verdict === null && !isLaneRunning(state, row.stem));
  let nonPassLines = filtered.length + (reduced > 0 ? 1 : 0);
  let min = Math.min(MIN_PASS_ROWS, filtered_2.length);
  if (filtered_2.length === min + 1 && nonPassLines + min + 1 <= maxRows) min += 1;
  while (min > 0 && nonPassLines + min + (filtered_2.length > min ? 1 : 0) > maxRows) min -= 1;
  let passRows =
    reduced === 0
      ? []
      : [
          countRow(
            ctx,
            {
              text: "\u2713",
              tone: "success",
            },
            `${reduced} passed`,
          ),
        ];
  let moreRows =
    filtered_2.length > min
      ? [
          countRow(
            ctx,
            {
              text: "\u25FB",
              tone: "dim",
            },
            `${filtered_2.length - min} more`,
          ),
        ]
      : [];
  return [...passRows, ...filtered.map(renderRow), ...filtered_2.slice(0, min).map(renderRow), ...moreRows];
}
//@ chunk-ae5g0zb5.js:61168-61295 placement
/**
 * 渲染面板；等待用户时把进行中的步骤换成等待提示。
 */
function renderClaudeTestPane(
  state,
  now,
  width = 60,
  glyphs = INLINE_IMAGE_SUPPORT,
  maxRows = PANE_DEFAULT_WIDTH,
  showRunIds = false,
) {
  let lines = renderClaudeTestPanel(state, now, width, glyphs, maxRows, showRunIds);
  return state.isWaitingForPerson === true
    ? replaceActiveStepWithWaiting(lines, Math.max(20, Math.floor(width)))
    : lines;
}
//@ chunk-ae5g0zb5.js:61295-61403 placement
/**
 * 待运行规格行。
 */
function renderPendingSpecRow(ctx, row) {
  return buildRow(
    ctx,
    spacedItem({
      text: "\u25FB",
      tone: "dim",
    }),
    [
      {
        text: row.name ?? displayNameForStem(row.stem),
      },
    ],
    row.addsData ? ADDS_DATA_MARK : null,
  );
}
//@ chunk-ae5g0zb5.js:61403-61492 placement
/**
 * 统计某结论的行数
 */
function countVerdict(run, verdict) {
  return run.rows.reduce((acc, row) => acc + (row.verdict === verdict && row.isNotReRun !== true ? 1 : 0), 0);
}
//@ chunk-ae5g0zb5.js:61492-61769 placement
/**
 * 结果行的耗时文本（完成用总秒数，运行中按开始时间推算）。
 */
function rowElapsedLabel(run, row, readAt, runningSeconds) {
  if (row.verdict === "BLOCKED") return null;
  if (row.verdict !== null) return row.seconds === null ? null : formatElapsed(row.seconds * 1000);
  if (run.lanesRunning !== undefined) {
    let seconds = isLaneRunning(run, row.stem) ? laneElapsedSeconds(run, row.stem, readAt) : null;
    return seconds !== null ? formatElapsed(seconds * 1000) : null;
  }
  return row.stem === run.running && runningSeconds !== null ? formatElapsed(runningSeconds * 1000) : null;
}
//@ chunk-ae5g0zb5.js:61769-66493 placement
/**
 * 生成 Claude Test 面板内容：登录、开始测试、审批规格、结果与修复建议（约 4.7 KB）。
 */
function renderClaudeTestPanel(facts, now, width, glyphs, maxRows, showRunIds) {
  let max = Math.max(20, Math.floor(width));
  let view = withCheckingAppState(facts, now);
  let counts = formatResultCounts(view);
  let run =
    counts?.run ??
    (view.run !== null && view.earlier?.finished === true
      ? adjustSkippedCount(view.run, view.earlier)
      : view.run);
  let isHalted = view.halt !== undefined && run !== null && !run.finished;
  let shownRun =
    run !== null && isHalted
      ? {
          ...run,
          running: null,
          lanesRunning: undefined,
        }
      : run;
  let spinner = spinnerGlyph(now, glyphs);
  let appName = shownRun?.app ?? view.note?.name ?? view.early?.name ?? null;
  if (shownRun === null) {
    let isStartingRun = view.isStartingRun === true && view.isLaterRun !== true;
    let viewForBody = isStartingRun
      ? {
          ...view,
          isReadingCode: false,
          hasReadCode: true,
          isWritingTests: false,
        }
      : view;
    let stopReason = resolveStopReason(viewForBody);
    let isStarting = isStartingRun && stopReason === null;
    let proposedCount = viewForBody.proposed.length;
    if (!(
      stopReason !== "signin" &&
      (isStarting ||
        (proposedCount > 0 && (viewForBody.isWritingTests !== true || viewForBody.hasOutline === true)))
    ))
      return [
        renderPanelTitle(max, appName, null),
        ...(viewForBody.isLaterRun === true || viewForBody.isOpening === true
          ? [
              ...installStepRows(viewForBody, spinner, max),
              describeAppState(viewForBody)
                ? renderAppReadyRow(viewForBody, max)
                : renderStepRow(max, haltStepOrFixing(viewForBody, spinner), true),
              ...(stopReason === null ? [] : [renderStopRow(max, stopReason)]),
            ]
          : formatReadingCodeStep(viewForBody, spinner, max, stopReason)),
      ];
    let isLaterRun = viewForBody.isLaterRun === true;
    let awaitingApproval =
      !isLaterRun &&
      !isStarting &&
      (viewForBody.startsAtOutline !== true || viewForBody.proposed.some((row) => row.addsData));
    let showStartStep =
      !isLaterRun &&
      !awaitingApproval &&
      stopReason === null &&
      (isStarting || viewForBody.startsAtOutline === true) &&
      describeAppState(viewForBody);
    let appSummary = appFactSummary(viewForBody.note ?? REPORT_STATE_TEXT);
    let headerLines = [
      renderPanelTitle(max, appName, null),
      ...(describeAppState(viewForBody)
        ? [
            renderAppReadyRow(viewForBody, max),
            ...(appSummary.length === 0 ? [] : [buildItemsBlock(max, 2, appSummary, "dim")]),
            ...(showStartStep ? [renderStepRow(max, activeStep(spinner, "Starting the tests\u2026"))] : []),
          ]
        : viewForBody.isLaterRun === true
          ? [renderStepRow(max, haltStepOrFixing(viewForBody, spinner), true)]
          : formatReadingCodeStep(viewForBody, spinner, max)),
      EMPTY_TEXT_SPAN,
    ];
    let footerLines =
      stopReason !== null
        ? [EMPTY_TEXT_SPAN, renderStopRow(max, stopReason)]
        : awaitingApproval
          ? [
              EMPTY_TEXT_SPAN,
              dimLine(max, {
                text: "Approve or change them in the chat",
                tone: "dim",
              }),
            ]
          : [];
    let max_2 = Math.max(3, maxRows - totalLines(headerLines) - totalLines(footerLines));
    let orderedProposed = orderProposedRows(viewForBody.proposed);
    let proposedLines = groupRowsWithHeadings(
      max,
      orderedProposed,
      (row) => row.area,
      (row) => renderPendingSpecRow(max, row),
    );
    return [
      ...headerLines,
      ...(totalLines(proposedLines) <= max_2
        ? proposedLines
        : [
            ...orderedProposed.slice(0, max_2 - 1).map((row) => renderPendingSpecRow(max, row)),
            countRow(
              max,
              {
                text: "\u25FB",
                tone: "dim",
              },
              `${orderedProposed.length - (max_2 - 1)} more`,
            ),
          ]),
      ...footerLines,
    ];
  }
  let reduced = shownRun.rows.reduce((acc, row) => acc + (row.isNotReRun === true ? 1 : 0), 0);
  let rowsDone = shownRun.rows.length - countVerdict(shownRun, null);
  let readAt = view.readAt ?? now;
  let lastDoneSeconds = secondsSinceLastDone(shownRun, readAt);
  let isFixRerun = view.isFixRerun === true;
  let earlierSeconds = isFixRerun ? 0 : (counts?.earlierS ?? 0);
  let earlierRows = isFixRerun ? (counts?.earlierRows ?? 0) : 0;
  let isNotStarted = !shownRun.started;
  let elapsedSeconds = isHalted ? shownRun.doneAtS : runElapsedSeconds(shownRun, rowsDone, readAt);
  let elapsedLabel = isNotStarted
    ? null
    : formatElapsed(((isFixRerun ? 0 : (counts?.earlierClockS ?? 0)) + elapsedSeconds) * 1000);
  let lines = [
    renderPanelTitle(max, appName, elapsedLabel),
    ...(counts === null
      ? [
          describeAppState(view)
            ? renderAppReadyRow(view, max)
            : renderStepRow(max, haltStepOrFixing(view, spinner), true),
        ]
      : isAppUnusable(view.note ?? REPORT_STATE_TEXT)
        ? [renderStepRow(max, haltStepOrFixing(view, spinner), true)]
        : []),
  ];
  if (shownRun.finished) {
    let failCount = countVerdict(shownRun, "FAIL");
    let blockedCount = countVerdict(shownRun, "BLOCKED");
    let mapped = [
      [failCount, "failed"],
      [blockedCount, "blocked"],
      [countVerdict(shownRun, "PASS"), "passed"],
      [reduced, "not re-run yet"],
    ]
      .filter(([count]) => count > 0)
      .map(([count, label]) => ({
        text: `${count} ${label}`,
        tone: "title",
      }));
    lines.push(
      buildRow(
        max,
        spacedItem(
          failCount > 0
            ? {
                text: "\u2717",
                tone: "error",
              }
            : blockedCount > 0
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
              ...mapped.flatMap((span, index) =>
                index === 0
                  ? [span]
                  : [
                      {
                        text: " \xB7 ",
                        tone: "dim",
                      },
                      span,
                    ],
              ),
              ...(shownRun.skipped === undefined
                ? []
                : [
                    {
                      text: ` \xB7 ${shownRun.skipped} skipped`,
                      tone: "dim",
                    },
                  ]),
            ],
        null,
      ),
    );
  } else if (isHalted && shownRun.started) {
    let counts = [
      [countVerdict(shownRun, "FAIL"), "failed"],
      [countVerdict(shownRun, "BLOCKED"), "blocked"],
      [countVerdict(shownRun, "PASS"), "passed"],
      [countVerdict(shownRun, null), "not run"],
    ];
    lines.push(
      buildRow(
        max,
        spacedItem(BLOCKED_STATES.halted.mark, ""),
        [
          {
            text: view.halt === "blocked" ? "Blocked" : "Stopped",
            tone: "title",
          },
          ...counts
            .filter(([count]) => count > 0)
            .map(([count, label]) => ({
              text: ` \xB7 ${count} ${label}`,
            })),
        ],
        null,
        true,
      ),
    );
  } else if (isHalted) lines.push(renderStopRow(max, view.halt === "blocked" ? "blocked" : "halted"));
  else {
    let allDone = shownRun.rows.length > 0 && rowsDone === shownRun.rows.length;
    let remainingSeconds =
      allDone || isNotStarted
        ? null
        : estimateRemainingSeconds(
            earlierSeconds + shownRun.doneAtS,
            rowsDone - earlierRows,
            shownRun.rows.length - earlierRows,
            elapsedSeconds - shownRun.doneAtS,
          );
    let progressSpans = [
      {
        text: `  ${rowsDone} of ${shownRun.rows.length} done`,
      },
      {
        text:
          remainingSeconds === null
            ? ""
            : remainingSeconds === 0
              ? " \xB7 almost done"
              : ` \xB7 about ${formatElapsed(remainingSeconds * 1000)} left`,
        tone: "dim",
      },
    ];
    lines.push(
      buildRow(
        max,
        buildPanelHeader(shownRun, glyphs, max - joinSpans(progressSpans).length),
        progressSpans,
        null,
      ),
    );
    if (allDone) lines.push(renderStepRow(max, activeStep(spinner, finishingPhaseLabel(shownRun, now))));
    if (isNotStarted) {
      let stopReason = resolveStopReason(view);
      let remainingTests = shownRun.rows.length - rowsDone;
      lines.push(
        stopReason === null
          ? renderStepRow(
              max,
              activeStep(
                spinner,
                view.isFixRerun === true
                  ? `Re-running ${remainingTests} ${remainingTests === 1 ? "test" : "tests"}\u2026`
                  : `Starting ${remainingTests} more ${remainingTests === 1 ? "test" : "tests"}\u2026`,
              ),
            )
          : renderStopRow(max, stopReason),
      );
    }
  }
  if (shownRun.rows.length === 0) return lines;
  lines.push(EMPTY_TEXT_SPAN);
  let max_2 = Math.max(
    MAX_THREAD_ROWS,
    ...shownRun.rows.map((row) => rowElapsedLabel(shownRun, row, readAt, lastDoneSeconds)?.length ?? 0),
  );
  let failCount = countVerdict(shownRun, "FAIL");
  let blockedCount = countVerdict(shownRun, "BLOCKED");
  let moreTests = shownRun.finished && view.isMoreDeclined !== true ? (view.note?.more ?? []) : [];
  let moreTestLines =
    moreTests.length === 0
      ? []
      : [
          EMPTY_TEXT_SPAN,
          textBlock(max, {
            text: "More tests ready",
            tone: "dim",
          }),
          ...moreTests.map((stem) =>
            buildRow(
              max,
              spacedItem({
                text: "\u25FB",
                tone: "dim",
              }),
              [
                {
                  text: view.proposed.find((row) => row.stem === stem)?.name ?? displayNameForStem(stem),
                },
              ],
              null,
            ),
          ),
        ];
  let earlierRunId = counts === null ? null : (view.note?.from ?? null);
  let runsDir = isValidSpecPath(view.appFolder) ? `${view.appFolder}/${RUNS_DIR}` : RUNS_DIR;
  let runIdLines =
    shownRun.finished && showRunIds && typeof view.runId === "string" && RUN_ID_RE.test(view.runId)
      ? renderLabeledItems(max, [
          `${runsDir}/${view.runId}/`,
          ...(earlierRunId !== null && RUN_ID_RE.test(earlierRunId) ? [`${runsDir}/${earlierRunId}/`] : []),
        ])
      : [];
  let footerHintLines = isHalted
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
    : !shownRun.finished
      ? []
      : [
          EMPTY_TEXT_SPAN,
          (failCount > 0 || reduced > 0) && view.note?.noFix !== true
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
            : blockedCount > 0 || failCount > 0
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
          ...runIdLines,
        ];
  lines.push(
    ...formatResultSummary(
      shownRun,
      max,
      Math.max(3, maxRows - totalLines(lines) - totalLines(moreTestLines) - totalLines(footerHintLines)),
      (row) => {
        let isRunning = isLaneRunning(shownRun, row.stem);
        if (row.isNotReRun === true)
          return buildRow(
            max,
            spacedItem({
              text: "\u2013",
              tone: "dim",
            }),
            [
              {
                text: row.name,
                tone: "dim",
              },
            ],
            NOT_RE_RUN_MARK,
          );
        let elapsed = rowElapsedLabel(shownRun, row, readAt, lastDoneSeconds);
        let mark =
          row.verdict !== null
            ? {
                text: VERDICT_MARKS[row.verdict],
                tone: VERDICT_TONES[row.verdict],
              }
            : isRunning
              ? {
                  text: spinner,
                  tone: "claude",
                }
              : {
                  text: "\u25FB",
                  tone: "dim",
                };
        let right =
          row.verdict === null && !isRunning && row.addsData
            ? ADDS_DATA_MARK
            : elapsed === null
              ? null
              : {
                  text: elapsed.padStart(max_2),
                  tone: "dim",
                };
        let nameSpan =
          row.verdict !== null
            ? {
                text: row.name,
              }
            : isRunning
              ? {
                  text: row.name,
                  tone: "title",
                }
              : {
                  text: row.name,
                  tone: "dim",
                };
        return buildRow(max, spacedItem(mark), [nameSpan], right);
      },
    ),
    ...moreTestLines,
    ...footerHintLines,
  );
  if (shownRun.started && !shownRun.finished && !isHalted && totalLines(lines) + 1 <= maxRows)
    lines.push(
      dimLine(max, {
        text: STOP_AGENTS_HINT,
        tone: "dim",
      }),
    );
  return lines;
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
  let lineCount = 1;
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
    lineCount += 1;
  return lineCount;
}
//@ chunk-ae5g0zb5.js:66639-66693 placement
/**
 * 所有行合计行数
 */
function totalLines(lines) {
  return lines.reduce((acc, line) => acc + lineCount(line.text), 0);
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
