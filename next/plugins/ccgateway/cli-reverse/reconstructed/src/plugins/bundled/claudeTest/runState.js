/**
 * plugins/bundled/claudeTest/runState.ts
 *
 * 2.1.316 新增：Claude Test 运行状态（安装、检查、报告摘要、PASS/FAIL 统计）
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * new in 2.1.318 (2.1.88 has no file at this path)
 * pieces: chunk-mhn0amzz.js (39)
 * attribution: placement 38, layout 1
 * (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.
 */
import {
  isPlainObjectNonArray,
  regExp,
  APP_UNAVAILABLE_CAUSES,
  SIGN_IN_KIND_LABELS,
  PAYMENT_LABELS,
  DATA_LOCATION_LABELS,
  APP_PACKAGE_MANAGERS,
  SPEC_FILE_NAME_PATTERN,
  BLOCKED_STATES,
  RUN_ID_RE,
  SAFE_ARG_PATTERN,
} from "./appFacts.js";
import { parseJsonObject } from "./progress.js";
import { beginDeferredInits } from "../../../../runtime/deferred-init.js";

// This module is the first evaluated of an import cycle of 3 modules closed by ./appFacts.js;
// the load-time work of the cycle's statements marked "deferred" waits until the cycle is complete (runtime/deferred-init.js).
beginDeferredInits("src/plugins/bundled/claudeTest/appFacts.js");
// This module is the first evaluated of an import cycle of 3 modules closed by ./appFacts.js (in the hooks worker thread);
// the load-time work of the cycle's statements marked "deferred" waits until the cycle is complete (runtime/deferred-init.js).
beginDeferredInits("worker:src/plugins/bundled/claudeTest/appFacts.js");
//@ chunk-mhn0amzz.js:39469-39844 placement
/**
 * 「 · see the chat」后缀，以及常见应用框架名表与对应状态标签——claude-test 用它判断打开的应用是否是自己认识的那一类。
 */
var SEE_THE_CHAT_SUFFIX = " \xB7 see the chat";
var SEE_CHAT_SUFFIX = [
  "Next.js",
  "Remix",
  "SvelteKit",
  "Nuxt",
  "Astro",
  "Angular",
  "Gatsby",
  "Create React App",
  "Vite + React",
  "Vite + Vue",
  "Vite + Svelte",
  "Vite",
  "React",
  "Vue",
  "Svelte",
  "Express",
];
var APP_STATE_LABELS = /^[A-Za-z0-9][A-Za-z0-9 ]{0,29}$/;
var APP_RUNNING_LABELS = /^[A-Za-z0-9@._:/=+ -]{1,60}$/;
var APP_STOPPED_LABELS = /^[a-z][a-z0-9-]{0,23}$/;
var REPORT_STATE_TEXT = {
  app: null,
  about: null,
  name: null,
  look: null,
  more: [],
  stopped: null,
  from: null,
};
//@ chunk-mhn0amzz.js:39844-40271 layout (2.1.88 match: capitalize, 1)
function capitalize(configJson, fallbackName) {
  let parsed = null;
  try {
    parsed = configJson === undefined ? null : JSON.parse(configJson);
  } catch {
    parsed = null;
  }
  let configuredName = isPlainObjectNonArray(parsed) ? parsed.name : null;
  let safeConfiguredName =
    typeof configuredName === "string" &&
    configuredName.length <= 214 &&
    /^(?:@[a-z0-9-~][a-z0-9-._~]*\/)?[a-z0-9-~][a-z0-9-._~]*$/.test(configuredName)
      ? configuredName
      : null;
  let safeFallbackName =
    fallbackName.length <= 214 && /^[A-Za-z0-9][A-Za-z0-9-._~]*$/.test(fallbackName) ? fallbackName : null;
  let trimmed = (safeConfiguredName ?? safeFallbackName ?? "")
    .replace(/^@[^/]*\//, "")
    .replace(/[-._~]+/g, " ")
    .trim()
    .slice(0, 30)
    .trim();
  let label = trimmed.charAt(0).toUpperCase() + trimmed.slice(1);
  return APP_STATE_LABELS.test(label) ? label : null;
}
//@ chunk-mhn0amzz.js:40271-40505 placement (2.1.88 match: CompanionFloatingBubble, 0.322)
/**
 * 解析服务健康状态 JSON：up / down / busy（端口占用）。
 */
function parsePortHealthStatus(json) {
  let parsed;
  try {
    parsed = json === undefined ? null : JSON.parse(json);
  } catch {
    return null;
  }
  if (!isPlainObjectNonArray(parsed)) return null;
  let { up, portBusy } = parsed;
  if (up === true)
    return {
      kind: "up",
    };
  if (up !== false) return null;
  if (!isPlainObjectNonArray(portBusy))
    return {
      kind: "down",
    };
  return {
    kind: "busy",
    port: asPort(portBusy.port),
  };
}
//@ chunk-mhn0amzz.js:40505-40518 placement
/**
 * 30000
 */
var INSTALL_STALE_MS = 30000;
//@ chunk-mhn0amzz.js:40518-40885 placement
function describeInstallState(text, openedAt, now) {
  if (text === undefined) return null;
  let parsed;
  try {
    parsed = JSON.parse(text);
  } catch {
    return null;
  }
  if (!isPlainObjectNonArray(parsed)) return null;
  let { state, percent, at } = parsed;
  if (
    (state !== "installing" && state !== "done" && state !== "failed") ||
    typeof at !== "number" ||
    !Number.isFinite(at) ||
    at < openedAt - 2000 ||
    (state === "installing" && now - at > INSTALL_STALE_MS)
  )
    return null;
  return {
    state,
    percent:
      typeof percent === "number" && Number.isInteger(percent) && percent >= 0 && percent <= 100
        ? percent
        : null,
    at,
  };
}
//@ chunk-mhn0amzz.js:40885-40926 placement
/**
 * .claude-test/runs
 */
var RUNS_DIR = ".claude-test/runs";
var REPORT_PREFIX = "Report: ";
//@ chunk-mhn0amzz.js:40926-41215 placement
/**
 * 环境能否打开浏览器：非 CI/SSH，未设 CLAUDE_TEST_NO_OPEN，且为 macOS/Windows 或有 DISPLAY/WAYLAND_DISPLAY。
 */
function canOpenBrowser(env, platform) {
  if (
    env.CLAUDE_TEST_NO_OPEN !== undefined ||
    env.CI !== undefined ||
    env.SSH_CONNECTION !== undefined ||
    env.SSH_TTY !== undefined ||
    env.SSH_CLIENT !== undefined
  )
    return false;
  return (
    platform === "darwin" ||
    platform === "win32" ||
    /^(?:unix)?:\d{1,4}(?:\.\d{1,2})?$/.test(env.DISPLAY ?? "") ||
    /^[A-Za-z0-9._-]{1,64}$/.test(env.WAYLAND_DISPLAY ?? "")
  );
}
//@ chunk-mhn0amzz.js:41215-41474 placement
/**
 * 根据准备阶段与运行行数推算读代码/写测试状态。
 */
function resolveCodeReadingFlags(phase, proposedCount) {
  let isReadingCode = phase?.isReadingCode ?? false;
  let hasReadCode = phase?.hasReadCode ?? false;
  let isWritingTests = phase?.isWritingTests;
  if (phase?.isPreparing !== true)
    return {
      isReadingCode,
      hasReadCode,
      ...(isWritingTests === undefined
        ? {}
        : {
            isWritingTests,
          }),
    };
  return {
    isReadingCode: isReadingCode || proposedCount === 0,
    hasReadCode: hasReadCode || proposedCount > 0,
    isWritingTests: isWritingTests === true || proposedCount > 0,
  };
}
//@ chunk-mhn0amzz.js:41474-41604 placement
/**
 * 运行事实的初始对象。
 */
function createRunFacts(openedAt, phase) {
  return {
    openedAt,
    finishedAt: null,
    hasRunFolder: false,
    hasLook: false,
    ...resolveCodeReadingFlags(phase, 0),
    readingFolder: null,
    proposed: [],
    run: null,
  };
}
//@ chunk-mhn0amzz.js:41604-41709 placement
/**
 * 打开面板时的运行事实（含早期应用状态）。
 */
function createOpeningFacts(openedAt, app, isStartingApp = false, name = null) {
  return {
    ...createRunFacts(openedAt),
    isOpening: true,
    early: {
      name,
      app,
    },
    ...(isStartingApp && {
      isStartingApp: true,
    }),
  };
}
//@ chunk-mhn0amzz.js:41709-41721 placement
/**
 * 1000
 */
var EARLY_CHECK_WINDOW_MS = 1000;
//@ chunk-mhn0amzz.js:41721-41900 placement
/**
 * 早期阶段尚未过期时把应用状态显示为 checking。
 */
function withCheckingAppState(facts, now) {
  let early = facts.early ?? null;
  if (
    early === null ||
    early.app === null ||
    early.app.kind === "checking" ||
    facts.hasRunFolder ||
    now - facts.openedAt >= EARLY_CHECK_WINDOW_MS
  )
    return facts;
  return {
    ...facts,
    early: {
      ...early,
      app: {
        kind: "checking",
      },
    },
  };
}
//@ chunk-mhn0amzz.js:41900-42016 placement
/**
 * 去掉标签、压缩空白并截断到 n 个字符。
 */
function collapseAndTruncate(text, maxChars) {
  let trimmed = text.replace(regExp, " ").replace(/ {2,}/g, " ").trim();
  return trimmed.length > maxChars ? `${trimmed.slice(0, maxChars - 1)}\u2026` : trimmed;
}
//@ chunk-mhn0amzz.js:42016-42075 placement (2.1.88 match: capitalize, 1)
function capitalize_2(str) {
  return str.charAt(0).toUpperCase() + str.slice(1);
}
//@ chunk-mhn0amzz.js:42075-42123 placement
function humanizeSlug(slug) {
  return capitalize_2(slug.replaceAll("-", " "));
}
//@ chunk-mhn0amzz.js:42123-42187 placement
/**
 * 对象自有字符串键
 */
function hasOwnString(value, key) {
  return typeof key === "string" && Object.hasOwn(value, key);
}
//@ chunk-mhn0amzz.js:42187-42228 placement
/**
 * 白名单内的值
 */
function knownValue(value, key) {
  return hasOwnString(value, key) ? key : undefined;
}
//@ chunk-mhn0amzz.js:42228-42308 placement
/**
 * 0..9999 的整数
 */
function clampedCount(value) {
  return typeof value === "number" && Number.isInteger(value) && value >= 0 && value < 1e4 ? value : 0;
}
//@ chunk-mhn0amzz.js:42308-42394 placement
/**
 * 1..65535 的端口
 */
function asPort(port) {
  return typeof port === "number" && Number.isInteger(port) && port >= 1 && port <= 65535 ? port : null;
}
//@ chunk-mhn0amzz.js:42394-43520 placement
function summarizeRunStart(runFile) {
  let jsonObject = parseJsonObject(runFile);
  if (jsonObject === null) return REPORT_STATE_TEXT;
  let app = isPlainObjectNonArray(jsonObject.app) ? jsonObject.app : null;
  let about = isPlainObjectNonArray(jsonObject.about) ? jsonObject.about : null;
  let look = isPlainObjectNonArray(jsonObject.look) ? jsonObject.look : null;
  let appState = knownValue(
    {
      down: 1,
      running: 1,
      started: 1,
      failed: 1,
      busy: 1,
      stopped: 1,
    },
    app?.state,
  );
  let cause = knownValue(APP_UNAVAILABLE_CAUSES, app?.cause);
  let signin = knownValue(SIGN_IN_KIND_LABELS, about?.signin);
  let payments = knownValue(PAYMENT_LABELS, about?.payments);
  let data = knownValue(DATA_LOCATION_LABELS, about?.data);
  let lookKind = knownValue(
    {
      loads: 1,
      empty: 1,
      nothing: 1,
    },
    look?.kind,
  );
  let command = app?.command;
  let port = app?.port;
  return {
    app:
      appState === undefined
        ? null
        : {
            state: appState,
            command:
              appState === "started" && typeof command === "string" && APP_RUNNING_LABELS.test(command)
                ? command
                : null,
            failure:
              appState === "failed"
                ? {
                    cause: cause ?? "other",
                    port: cause === "port" ? asPort(port) : null,
                    install:
                      cause === "packages" ? (knownValue(APP_PACKAGE_MANAGERS, app?.install) ?? null) : null,
                  }
                : null,
            port:
              appState !== "down" && appState !== "failed" && appState !== "stopped" ? asPort(port) : null,
          },
    about:
      signin === undefined || payments === undefined || data === undefined
        ? null
        : {
            framework:
              typeof about?.framework === "string" && SEE_CHAT_SUFFIX.includes(about.framework)
                ? about.framework
                : null,
            signin,
            payments,
            data,
          },
    name:
      typeof jsonObject.name === "string" && APP_STATE_LABELS.test(jsonObject.name) ? jsonObject.name : null,
    look:
      lookKind === undefined
        ? null
        : {
            kind: lookKind,
            errors: clampedCount(look?.errors),
            failed: clampedCount(look?.failed),
          },
    more: Array.isArray(jsonObject.more)
      ? jsonObject.more
          .filter((stem) => typeof stem === "string" && SPEC_FILE_NAME_PATTERN.test(`${stem}.md`))
          .slice(0, 4)
      : [],
    stopped: knownValue(BLOCKED_STATES, jsonObject.stopped) ?? null,
    from: typeof jsonObject.from === "string" && RUN_ID_RE.test(jsonObject.from) ? jsonObject.from : null,
    ...(jsonObject.fix === "none" && {
      noFix: true,
    }),
  };
}
//@ chunk-mhn0amzz.js:43520-44233 placement
function stripHtmlComments(stem, runFile) {
  let hasFrontmatter =
    typeof runFile === "string" &&
    runFile.startsWith(`---
`);
  let frontmatterEnd = hasFrontmatter
    ? runFile.indexOf(
        `
---`,
        3,
      )
    : -1;
  let frontmatterLines = hasFrontmatter
    ? runFile.slice(4, Math.max(4, frontmatterEnd)).split(
        `
`,
        20,
      )
    : [];
  let found = frontmatterLines
    .map((line) => /^area\s*:\s*([a-z][a-z0-9-]{0,23})$/.exec(line.trim())?.[1])
    .find((area) => area !== undefined);
  let body =
    typeof runFile !== "string"
      ? ""
      : hasFrontmatter
        ? frontmatterEnd < 0
          ? ""
          : runFile.slice(frontmatterEnd + 4)
        : runFile;
  let heading = /^#[ \t]+(.+)$/m.exec(body.slice(0, 4096))?.[1];
  let name = heading === undefined ? "" : collapseAndTruncate(heading.trim(), 140);
  let found_2 = body
    .slice(0, 4096)
    .split(
      `
`,
    )
    .map((line) => line.trim())
    .find((line) => line !== "" && !line.startsWith("#") && !line.startsWith("<!--"));
  let isWalled =
    /^signed in\b/i.test(found_2 ?? "") ||
    frontmatterLines.some((line) => /^tags\s*:\s*\[[^\]]*\bsigned-in\b[^\]]*\]$/.test(line.trim()));
  return {
    stem,
    name: name === "" ? null : name,
    area: found ?? null,
    addsData: frontmatterLines.some((line) => /^tags\s*:\s*\[\s*creates-data\s*\]$/.test(line.trim())),
    ...(isWalled && {
      walled: true,
    }),
  };
}
//@ chunk-mhn0amzz.js:44233-44322 placement
/**
 * 合法的规格名
 */
function isValidSpecName(spec) {
  return (
    typeof spec === "string" &&
    SAFE_ARG_PATTERN.test(spec) &&
    !spec.startsWith("-") &&
    collapseAndTruncate(spec, 120) === spec
  );
}
//@ chunk-mhn0amzz.js:44322-44440 placement
/**
 * 比较运行 id（时间戳部分，再按序号后缀）。
 */
function compareRunIds(runIdA, runIdB) {
  return (
    runIdA.slice(0, 19).localeCompare(runIdB.slice(0, 19)) ||
    (Number(runIdA.slice(20)) || 1) - (Number(runIdB.slice(20)) || 1)
  );
}
//@ chunk-mhn0amzz.js:44440-44520 placement
/**
 * 最近的运行 id
 */
function latestRunId(madeHereRuns) {
  let filtered = madeHereRuns.filter((runId) => RUN_ID_RE.test(runId));
  filtered.sort(compareRunIds);
  return filtered.at(-1) ?? null;
}
//@ chunk-mhn0amzz.js:44520-44529 placement
/**
 * 8
 */
var MAX_PRIOR_RUNS = 8;
//@ chunk-mhn0amzz.js:44529-44624 placement
/**
 * 比给定运行更早的运行 id
 */
function earlierRunIds(madeHereRuns, currentRunId) {
  return madeHereRuns
    .filter((runId) => RUN_ID_RE.test(runId) && compareRunIds(runId, currentRunId) < 0)
    .sort(compareRunIds)
    .slice(-(MAX_PRIOR_RUNS + 1))
    .reverse();
}
//@ chunk-mhn0amzz.js:44624-44634 placement
/**
 * 50
 */
var MAX_FIXED_SPECS = 50;
//@ chunk-mhn0amzz.js:44634-44872 placement
/**
 * 解析 fix.json 的 fixed 列表（全部合法才返回，去重）。
 */
function parseFixedSpecs(text) {
  if (text === undefined) return [];
  try {
    let parsed = JSON.parse(text);
    let fixed = isPlainObjectNonArray(parsed) ? parsed.fixed : undefined;
    if (!Array.isArray(fixed) || fixed.length < 1 || fixed.length > MAX_FIXED_SPECS) return [];
    let filtered = fixed.filter(isValidSpecName);
    return filtered.length === fixed.length
      ? filtered.filter((stem, index) => filtered.indexOf(stem) === index)
      : [];
  } catch {
    return [];
  }
}
//@ chunk-mhn0amzz.js:44872-45050 placement
/**
 * 找最近一个包含指定规格未通过的运行，并合并之前运行的结论。
 */
function findLatestFailingRun(runs, fixedStems) {
  let index = runs.findIndex((run) =>
    run.rows.some((row) => fixedStems.includes(row.stem) && row.verdict !== null && row.verdict !== "PASS"),
  );
  let run = runs[index];
  return run === undefined ? null : mergeEarlierVerdicts(run, runs.slice(0, index).toReversed());
}
//@ chunk-mhn0amzz.js:45050-45433 placement
/**
 * 用更早的运行补齐结论与耗时。
 */
function mergeEarlierVerdicts(run, reversed) {
  let rows = run.rows;
  let addedSeconds = 0;
  for (let earlierRun of reversed) {
    let earlierByStem = new Map(
      earlierRun.rows.filter((row) => row.verdict !== null).map((row) => [row.stem, row]),
    );
    if (!rows.some((row) => earlierByStem.has(row.stem))) continue;
    rows = rows.map((row) => {
      let earlierRow = earlierByStem.get(row.stem);
      return earlierRow === undefined
        ? row
        : {
            ...row,
            verdict: earlierRow.verdict,
            seconds: earlierRow.seconds,
          };
    });
    addedSeconds += earlierRun.doneAtS;
  }
  return rows === run.rows
    ? run
    : {
        ...run,
        rows,
        doneAtS: run.doneAtS + addedSeconds,
        ...(typeof run.seconds === "number" && {
          seconds: run.seconds + addedSeconds,
        }),
      };
}
//@ chunk-mhn0amzz.js:45433-45443 placement
/**
 * 16
 */
var MAX_CHAIN_HOPS = 16;
//@ chunk-mhn0amzz.js:45443-45660 placement
/**
 * 找出与当前运行同一链（通过 from 链接）的更早运行。
 */
function findRunsInSameChain(runIds, runId, linkOf) {
  let graph = {
    known: new Set(runIds.filter((id) => RUN_ID_RE.test(id))),
    linkOf,
    roots: new Map(),
  };
  let chainRoot = findChainRoot(graph, runId);
  if (chainRoot === null || chainRoot === runId) return [];
  return [...graph.known]
    .filter((id) => compareRunIds(chainRoot, id) <= 0 && compareRunIds(id, runId) < 0)
    .sort(compareRunIds)
    .filter((id) => findChainRoot(graph, id) === chainRoot);
}
//@ chunk-mhn0amzz.js:45660-45909 placement
/**
 * 沿 from 链找运行链的根（带缓存与深度上限）。
 */
function findChainRoot(graph, runId) {
  let current = runId;
  let root = null;
  let visited = [];
  for (let j = 0; j <= MAX_CHAIN_HOPS; j++) {
    if (graph.roots.has(current)) {
      root = graph.roots.get(current) ?? null;
      break;
    }
    visited.push(current);
    let link = graph.linkOf(current);
    let nextId = link !== null && graph.known.has(link) && compareRunIds(link, current) < 0 ? link : null;
    if (nextId === null) {
      root = current;
      break;
    }
    current = nextId;
  }
  for (let id of visited) graph.roots.set(id, root);
  return root;
}
//@ chunk-mhn0amzz.js:45909-46421 placement
function countResults(runs) {
  let [latest, ...earlier] = runs;
  if (latest === undefined) return null;
  let rows = [...latest.rows];
  let addedSeconds = 0;
  for (let run of earlier) {
    for (let row of run.rows) {
      if (row.verdict === null) continue;
      let index = rows.findIndex((matchedRow) => matchedRow.stem === row.stem);
      let existing = rows[index];
      if (existing === undefined) rows.push(row);
      else
        rows[index] = {
          ...existing,
          verdict: row.verdict,
          seconds: row.seconds,
        };
    }
    addedSeconds += run.doneAtS;
  }
  if (earlier.length === 0) return latest;
  let { skipped, ...rest } = latest;
  let skippedCount =
    latest.skipped === undefined ? 0 : Math.max(0, latest.skipped - (rows.length - latest.rows.length));
  return {
    ...rest,
    rows,
    doneAtS: latest.doneAtS + addedSeconds,
    ...(typeof latest.seconds === "number" && {
      seconds: latest.seconds + addedSeconds,
    }),
    ...(skippedCount >= 1 && {
      skipped: skippedCount,
    }),
  };
}
//@ chunk-mhn0amzz.js:46421-46572 placement
/**
 * 解析运行记录里的 from 字段（合法运行 id）。
 */
function parseRunFrom(text) {
  if (text === undefined) return null;
  try {
    let parsed = JSON.parse(text);
    let from = isPlainObjectNonArray(parsed) ? parsed.from : undefined;
    return typeof from === "string" && RUN_ID_RE.test(from) ? from : null;
  } catch {
    return null;
  }
}
//@ chunk-mhn0amzz.js:46572-46641 placement
/**
 * .claude-test/specs
 */
var SPECS_DIR = ".claude-test/specs";
var OUTLINE_SUFFIX = ".outline.md";
var OUTLINE_ASKED_JSON = "outline-asked.json";
//@ chunk-mhn0amzz.js:46641-47017 placement
function formatAskedSpecs(runFile) {
  if (typeof runFile !== "string" || runFile.length > 16384) return null;
  let tests;
  try {
    let parsed = JSON.parse(runFile);
    tests = isPlainObjectNonArray(parsed) ? parsed.tests : undefined;
  } catch {
    return null;
  }
  if (!Array.isArray(tests) || tests.length < 1 || tests.length > 12) return null;
  let filtered = tests.filter(
    (test) => typeof test === "string" && test.trim() !== "" && !/[\r\n]/.test(test),
  );
  if (filtered.length !== tests.length) return null;
  return readSpecOutline(
    filtered.map((test, index) => `${index + 1}. [asked-${index + 1}] ${test.trim()}`).join(`
`),
  );
}
//@ chunk-mhn0amzz.js:47017-47085 placement
/**
 * 取较长的那个
 */
function longerOf(specOutline, otherOutline) {
  return otherOutline !== null && specOutline !== null && otherOutline.length !== specOutline.length
    ? otherOutline
    : specOutline;
}
//@ chunk-mhn0amzz.js:47085-47879 placement
function readSpecOutline(text) {
  if (typeof text !== "string" || text.length > 16384) return null;
  let mapped = text
    .replace(
      /\r\n/g,
      `
`,
    )
    .split(
      `
`,
    )
    .map((line) => line.trim());
  let index = mapped.findIndex((line) => /^not covered:?$/i.test(line));
  let rows = [];
  for (let line of (index >= 0 ? mapped.slice(0, index) : mapped).filter((line) =>
    /^\d{1,2}\.\s/.test(line),
  )) {
    let stem = /^\d{1,2}\.\s+\[([a-z0-9][a-z0-9-]{0,79})\]\s+\S/.exec(line)?.[1];
    if (stem === undefined || stem === "readme" || rows.some((row) => row.stem === stem)) return null;
    let trimmed = (line.replace(/^\d{1,2}\.\s+\[[a-z0-9-]+\]\s+/, "").split(/:\s/)[0] ?? "")
      .replace(
        /\s*\((adds|changes|creates|edits|deletes|removes|you changed|changed recently|looks like|behind sign-in)\b[^)]*\)/gi,
        "",
      )
      .trim();
    let name = collapseAndTruncate(trimmed, 140);
    rows.push({
      stem,
      name: name === "" ? null : name,
      area: null,
      addsData: /\((adds|changes|creates|edits|deletes|removes)\b/i.test(line),
      ...(/\(behind sign-in\)/i.test(line) && {
        walled: true,
      }),
    });
  }
  return rows.length === 0 ? null : rows;
}
export {
  SPECS_DIR,
  capitalize,
  compareRunIds,
  createRunFacts,
  RUNS_DIR,
  latestRunId,
  summarizeRunStart,
  earlierRunIds,
  parseRunFrom,
  findRunsInSameChain,
  parseFixedSpecs,
  countResults,
  findLatestFailingRun,
  longerOf,
  readSpecOutline,
  OUTLINE_SUFFIX,
  formatAskedSpecs,
  OUTLINE_ASKED_JSON,
  stripHtmlComments,
  resolveCodeReadingFlags,
  isValidSpecName,
  collapseAndTruncate,
  APP_STOPPED_LABELS,
  APP_STATE_LABELS,
  REPORT_STATE_TEXT,
  SEE_THE_CHAT_SUFFIX,
  humanizeSlug,
  REPORT_PREFIX,
  withCheckingAppState,
  capitalize_2,
  createOpeningFacts,
  canOpenBrowser,
  describeInstallState,
  parsePortHealthStatus,
};
