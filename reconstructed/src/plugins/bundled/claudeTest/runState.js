/**
 * plugins/bundled/claudeTest/runState.ts
 *
 * 2.1.316 新增：Claude Test 运行状态（安装、检查、报告摘要、PASS/FAIL 统计）
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-ae5g0zb5.js (38)
 * attribution: placement 38
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

//@ chunk-ae5g0zb5.js:38231-38606 placement
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
//@ chunk-ae5g0zb5.js:39033-39267 placement = CompanionFloatingBubble (0.32)
/**
 * 解析服务健康状态 JSON：up / down / busy（端口占用）。
 */
function parsePortHealthStatus(json) {
  let n;
  try {
    n = json === undefined ? null : JSON.parse(json);
  } catch {
    return null;
  }
  if (!isPlainObjectNonArray(n)) return null;
  let { up, portBusy } = n;
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
//@ chunk-ae5g0zb5.js:39267-39280 placement
/**
 * 30000
 */
var INSTALL_STALE_MS = 30000;
//@ chunk-ae5g0zb5.js:39280-39647 placement
function describeInstallState(e, openedAt, r) {
  if (e === undefined) return null;
  let o;
  try {
    o = JSON.parse(e);
  } catch {
    return null;
  }
  if (!isPlainObjectNonArray(o)) return null;
  let { state, percent, at } = o;
  if (
    (state !== "installing" && state !== "done" && state !== "failed") ||
    typeof at !== "number" ||
    !Number.isFinite(at) ||
    at < openedAt - 2000 ||
    (state === "installing" && r - at > INSTALL_STALE_MS)
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
//@ chunk-ae5g0zb5.js:39647-39688 placement
/**
 * .claude-test/runs
 */
var RUNS_DIR = ".claude-test/runs";
var REPORT_PREFIX = "Report: ";
//@ chunk-ae5g0zb5.js:39688-39977 placement
/**
 * 环境能否打开浏览器：非 CI/SSH，未设 CLAUDE_TEST_NO_OPEN，且为 macOS/Windows 或有 DISPLAY/WAYLAND_DISPLAY。
 */
function canOpenBrowser(e, n) {
  if (
    e.CLAUDE_TEST_NO_OPEN !== undefined ||
    e.CI !== undefined ||
    e.SSH_CONNECTION !== undefined ||
    e.SSH_TTY !== undefined ||
    e.SSH_CLIENT !== undefined
  )
    return false;
  return (
    n === "darwin" ||
    n === "win32" ||
    /^(?:unix)?:\d{1,4}(?:\.\d{1,2})?$/.test(e.DISPLAY ?? "") ||
    /^[A-Za-z0-9._-]{1,64}$/.test(e.WAYLAND_DISPLAY ?? "")
  );
}
//@ chunk-ae5g0zb5.js:39977-40236 placement
/**
 * 根据准备阶段与运行行数推算读代码/写测试状态。
 */
function resolveCodeReadingFlags(e, n) {
  let isReadingCode = e?.isReadingCode ?? false;
  let hasReadCode = e?.hasReadCode ?? false;
  let isWritingTests = e?.isWritingTests;
  if (e?.isPreparing !== true)
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
    isReadingCode: isReadingCode || n === 0,
    hasReadCode: hasReadCode || n > 0,
    isWritingTests: isWritingTests === true || n > 0,
  };
}
//@ chunk-ae5g0zb5.js:40236-40366 placement
/**
 * 运行事实的初始对象。
 */
function createRunFacts(openedAt, n) {
  return {
    openedAt,
    finishedAt: null,
    hasRunFolder: false,
    hasLook: false,
    ...resolveCodeReadingFlags(n, 0),
    readingFolder: null,
    proposed: [],
    run: null,
  };
}
//@ chunk-ae5g0zb5.js:40366-40471 placement
/**
 * 打开面板时的运行事实（含早期应用状态）。
 */
function createOpeningFacts(openedAt, app, r = false, name = null) {
  return {
    ...createRunFacts(openedAt),
    isOpening: true,
    early: {
      name,
      app,
    },
    ...(r && {
      isStartingApp: true,
    }),
  };
}
//@ chunk-ae5g0zb5.js:40471-40483 placement
/**
 * 1000
 */
var EARLY_CHECK_WINDOW_MS = 1000;
//@ chunk-ae5g0zb5.js:40483-40662 placement
/**
 * 早期阶段尚未过期时把应用状态显示为 checking。
 */
function withCheckingAppState(e, n) {
  let early = e.early ?? null;
  if (
    early === null ||
    early.app === null ||
    early.app.kind === "checking" ||
    e.hasRunFolder ||
    n - e.openedAt >= EARLY_CHECK_WINDOW_MS
  )
    return e;
  return {
    ...e,
    early: {
      ...early,
      app: {
        kind: "checking",
      },
    },
  };
}
//@ chunk-ae5g0zb5.js:40662-40778 placement
/**
 * 去掉标签、压缩空白并截断到 n 个字符。
 */
function collapseAndTruncate(e, n) {
  let trimmed = e.replace(regExp, " ").replace(/ {2,}/g, " ").trim();
  return trimmed.length > n ? `${trimmed.slice(0, n - 1)}\u2026` : trimmed;
}
//@ chunk-ae5g0zb5.js:40778-40837 placement = capitalize (1)
function capitalize(str) {
  return str.charAt(0).toUpperCase() + str.slice(1);
}
//@ chunk-ae5g0zb5.js:40837-40885 placement
function humanizeSlug(e) {
  return capitalize(e.replaceAll("-", " "));
}
//@ chunk-ae5g0zb5.js:40885-40949 placement
/**
 * 对象自有字符串键
 */
function hasOwnString(e, n) {
  return typeof n === "string" && Object.hasOwn(e, n);
}
//@ chunk-ae5g0zb5.js:40949-40990 placement
/**
 * 白名单内的值
 */
function knownValue(e, n) {
  return hasOwnString(e, n) ? n : undefined;
}
//@ chunk-ae5g0zb5.js:40990-41070 placement
/**
 * 0..9999 的整数
 */
function clampedCount(e) {
  return typeof e === "number" && Number.isInteger(e) && e >= 0 && e < 1e4 ? e : 0;
}
//@ chunk-ae5g0zb5.js:41070-41156 placement
/**
 * 1..65535 的端口
 */
function asPort(port) {
  return typeof port === "number" && Number.isInteger(port) && port >= 1 && port <= 65535 ? port : null;
}
//@ chunk-ae5g0zb5.js:41156-42282 placement
function summarizeRunStart(runFile) {
  let jsonObject = parseJsonObject(runFile);
  if (jsonObject === null) return REPORT_STATE_TEXT;
  let app = isPlainObjectNonArray(jsonObject.app) ? jsonObject.app : null;
  let about = isPlainObjectNonArray(jsonObject.about) ? jsonObject.about : null;
  let look = isPlainObjectNonArray(jsonObject.look) ? jsonObject.look : null;
  let a = knownValue(
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
  let i = knownValue(APP_UNAVAILABLE_CAUSES, app?.cause);
  let c = knownValue(SIGN_IN_KIND_LABELS, about?.signin);
  let _ = knownValue(PAYMENT_LABELS, about?.payments);
  let S = knownValue(DATA_LOCATION_LABELS, about?.data);
  let w = knownValue(
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
      a === undefined
        ? null
        : {
            state: a,
            command:
              a === "started" && typeof command === "string" && APP_RUNNING_LABELS.test(command)
                ? command
                : null,
            failure:
              a === "failed"
                ? {
                    cause: i ?? "other",
                    port: i === "port" ? asPort(port) : null,
                    install:
                      i === "packages" ? (knownValue(APP_PACKAGE_MANAGERS, app?.install) ?? null) : null,
                  }
                : null,
            port: a !== "down" && a !== "failed" && a !== "stopped" ? asPort(port) : null,
          },
    about:
      c === undefined || _ === undefined || S === undefined
        ? null
        : {
            framework:
              typeof about?.framework === "string" && SEE_CHAT_SUFFIX.includes(about.framework)
                ? about.framework
                : null,
            signin: c,
            payments: _,
            data: S,
          },
    name:
      typeof jsonObject.name === "string" && APP_STATE_LABELS.test(jsonObject.name) ? jsonObject.name : null,
    look:
      w === undefined
        ? null
        : {
            kind: w,
            errors: clampedCount(look?.errors),
            failed: clampedCount(look?.failed),
          },
    more: Array.isArray(jsonObject.more)
      ? jsonObject.more
          .filter((P) => typeof P === "string" && SPEC_FILE_NAME_PATTERN.test(`${P}.md`))
          .slice(0, 4)
      : [],
    stopped: knownValue(BLOCKED_STATES, jsonObject.stopped) ?? null,
    from: typeof jsonObject.from === "string" && RUN_ID_RE.test(jsonObject.from) ? jsonObject.from : null,
    ...(jsonObject.fix === "none" && {
      noFix: true,
    }),
  };
}
//@ chunk-ae5g0zb5.js:42282-42995 placement
function stripHtmlComments(stem, runFile) {
  let r =
    typeof runFile === "string" &&
    runFile.startsWith(`---
`);
  let o = r
    ? runFile.indexOf(
        `
---`,
        3,
      )
    : -1;
  let s = r
    ? runFile.slice(4, Math.max(4, o)).split(
        `
`,
        20,
      )
    : [];
  let found = s
    .map((f) => /^area\s*:\s*([a-z][a-z0-9-]{0,23})$/.exec(f.trim())?.[1])
    .find((f) => f !== undefined);
  let i = typeof runFile !== "string" ? "" : r ? (o < 0 ? "" : runFile.slice(o + 4)) : runFile;
  let c = /^#[ \t]+(.+)$/m.exec(i.slice(0, 4096))?.[1];
  let _ = c === undefined ? "" : collapseAndTruncate(c.trim(), 140);
  let found_2 = i
    .slice(0, 4096)
    .split(
      `
`,
    )
    .map((line) => line.trim())
    .find((f) => f !== "" && !f.startsWith("#") && !f.startsWith("<!--"));
  let w =
    /^signed in\b/i.test(found_2 ?? "") ||
    s.some((f) => /^tags\s*:\s*\[[^\]]*\bsigned-in\b[^\]]*\]$/.test(f.trim()));
  return {
    stem,
    name: _ === "" ? null : _,
    area: found ?? null,
    addsData: s.some((f) => /^tags\s*:\s*\[\s*creates-data\s*\]$/.test(f.trim())),
    ...(w && {
      walled: true,
    }),
  };
}
//@ chunk-ae5g0zb5.js:42995-43084 placement
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
//@ chunk-ae5g0zb5.js:43084-43202 placement
/**
 * 比较运行 id（时间戳部分，再按序号后缀）。
 */
function compareRunIds(e, n) {
  return (
    e.slice(0, 19).localeCompare(n.slice(0, 19)) || (Number(e.slice(20)) || 1) - (Number(n.slice(20)) || 1)
  );
}
//@ chunk-ae5g0zb5.js:43202-43282 placement
/**
 * 最近的运行 id
 */
function latestRunId(madeHereRuns) {
  let filtered = madeHereRuns.filter((r) => RUN_ID_RE.test(r));
  filtered.sort(compareRunIds);
  return filtered.at(-1) ?? null;
}
//@ chunk-ae5g0zb5.js:43282-43291 placement
/**
 * 8
 */
var MAX_PRIOR_RUNS = 8;
//@ chunk-ae5g0zb5.js:43291-43386 placement
/**
 * 比给定运行更早的运行 id
 */
function earlierRunIds(madeHereRuns, n) {
  return madeHereRuns
    .filter((r) => RUN_ID_RE.test(r) && compareRunIds(r, n) < 0)
    .sort(compareRunIds)
    .slice(-(MAX_PRIOR_RUNS + 1))
    .reverse();
}
//@ chunk-ae5g0zb5.js:43386-43396 placement
/**
 * 50
 */
var MAX_FIXED_SPECS = 50;
//@ chunk-ae5g0zb5.js:43396-43634 placement
/**
 * 解析 fix.json 的 fixed 列表（全部合法才返回，去重）。
 */
function parseFixedSpecs(e) {
  if (e === undefined) return [];
  try {
    let parsed = JSON.parse(e);
    let fixed = isPlainObjectNonArray(parsed) ? parsed.fixed : undefined;
    if (!Array.isArray(fixed) || fixed.length < 1 || fixed.length > MAX_FIXED_SPECS) return [];
    let filtered = fixed.filter(isValidSpecName);
    return filtered.length === fixed.length ? filtered.filter((s, a) => filtered.indexOf(s) === a) : [];
  } catch {
    return [];
  }
}
//@ chunk-ae5g0zb5.js:43634-43812 placement
/**
 * 找最近一个包含指定规格未通过的运行，并合并之前运行的结论。
 */
function findLatestFailingRun(e, n) {
  let index = e.findIndex((s) =>
    s.rows.some((a) => n.includes(a.stem) && a.verdict !== null && a.verdict !== "PASS"),
  );
  let o = e[index];
  return o === undefined ? null : mergeEarlierVerdicts(o, e.slice(0, index).toReversed());
}
//@ chunk-ae5g0zb5.js:43812-44195 placement
/**
 * 用更早的运行补齐结论与耗时。
 */
function mergeEarlierVerdicts(e, reversed) {
  let rows = e.rows;
  let o = 0;
  for (let s of reversed) {
    let a = new Map(s.rows.filter((i) => i.verdict !== null).map((i) => [i.stem, i]));
    if (!rows.some((i) => a.has(i.stem))) continue;
    rows = rows.map((i) => {
      let c = a.get(i.stem);
      return c === undefined
        ? i
        : {
            ...i,
            verdict: c.verdict,
            seconds: c.seconds,
          };
    });
    o += s.doneAtS;
  }
  return rows === e.rows
    ? e
    : {
        ...e,
        rows,
        doneAtS: e.doneAtS + o,
        ...(typeof e.seconds === "number" && {
          seconds: e.seconds + o,
        }),
      };
}
//@ chunk-ae5g0zb5.js:44195-44205 placement
/**
 * 16
 */
var MAX_CHAIN_HOPS = 16;
//@ chunk-ae5g0zb5.js:44205-44422 placement
/**
 * 找出与当前运行同一链（通过 from 链接）的更早运行。
 */
function findRunsInSameChain(e, n, linkOf) {
  let o = {
    known: new Set(e.filter((a) => RUN_ID_RE.test(a))),
    linkOf,
    roots: new Map(),
  };
  let chainRoot = findChainRoot(o, n);
  if (chainRoot === null || chainRoot === n) return [];
  return [...o.known]
    .filter((a) => compareRunIds(chainRoot, a) <= 0 && compareRunIds(a, n) < 0)
    .sort(compareRunIds)
    .filter((a) => findChainRoot(o, a) === chainRoot);
}
//@ chunk-ae5g0zb5.js:44422-44671 placement
/**
 * 沿 from 链找运行链的根（带缓存与深度上限）。
 */
function findChainRoot(e, n) {
  let r = n;
  let o = null;
  let s = [];
  for (let j = 0; j <= MAX_CHAIN_HOPS; j++) {
    if (e.roots.has(r)) {
      o = e.roots.get(r) ?? null;
      break;
    }
    s.push(r);
    let i = e.linkOf(r);
    let c = i !== null && e.known.has(i) && compareRunIds(i, r) < 0 ? i : null;
    if (c === null) {
      o = r;
      break;
    }
    r = c;
  }
  for (let a of s) e.roots.set(a, o);
  return o;
}
//@ chunk-ae5g0zb5.js:44671-45183 placement
function countResults(e) {
  let [n, ...r] = e;
  if (n === undefined) return null;
  let o = [...n.rows];
  let s = 0;
  for (let _ of r) {
    for (let S of _.rows) {
      if (S.verdict === null) continue;
      let index = o.findIndex((b) => b.stem === S.stem);
      let f = o[index];
      if (f === undefined) o.push(S);
      else
        o[index] = {
          ...f,
          verdict: S.verdict,
          seconds: S.seconds,
        };
    }
    s += _.doneAtS;
  }
  if (r.length === 0) return n;
  let { skipped, ...i } = n;
  let c = n.skipped === undefined ? 0 : Math.max(0, n.skipped - (o.length - n.rows.length));
  return {
    ...i,
    rows: o,
    doneAtS: n.doneAtS + s,
    ...(typeof n.seconds === "number" && {
      seconds: n.seconds + s,
    }),
    ...(c >= 1 && {
      skipped: c,
    }),
  };
}
//@ chunk-ae5g0zb5.js:45183-45334 placement
/**
 * 解析运行记录里的 from 字段（合法运行 id）。
 */
function parseRunFrom(e) {
  if (e === undefined) return null;
  try {
    let parsed = JSON.parse(e);
    let from = isPlainObjectNonArray(parsed) ? parsed.from : undefined;
    return typeof from === "string" && RUN_ID_RE.test(from) ? from : null;
  } catch {
    return null;
  }
}
//@ chunk-ae5g0zb5.js:45334-45403 placement
/**
 * .claude-test/specs
 */
var SPECS_DIR = ".claude-test/specs";
var OUTLINE_SUFFIX = ".outline.md";
var OUTLINE_ASKED_JSON = "outline-asked.json";
//@ chunk-ae5g0zb5.js:45403-45779 placement
function formatAskedSpecs(runFile) {
  if (typeof runFile !== "string" || runFile.length > 16384) return null;
  let n;
  try {
    let parsed = JSON.parse(runFile);
    n = isPlainObjectNonArray(parsed) ? parsed.tests : undefined;
  } catch {
    return null;
  }
  if (!Array.isArray(n) || n.length < 1 || n.length > 12) return null;
  let filtered = n.filter((o) => typeof o === "string" && o.trim() !== "" && !/[\r\n]/.test(o));
  if (filtered.length !== n.length) return null;
  return readSpecOutline(
    filtered.map((o, s) => `${s + 1}. [asked-${s + 1}] ${o.trim()}`).join(`
`),
  );
}
//@ chunk-ae5g0zb5.js:45779-45847 placement
/**
 * 取较长的那个
 */
function longerOf(specOutline, n) {
  return n !== null && specOutline !== null && n.length !== specOutline.length ? n : specOutline;
}
//@ chunk-ae5g0zb5.js:45847-46641 placement
function readSpecOutline(e) {
  if (typeof e !== "string" || e.length > 16384) return null;
  let mapped = e
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
  let index = mapped.findIndex((s) => /^not covered:?$/i.test(s));
  let o = [];
  for (let s of (index >= 0 ? mapped.slice(0, index) : mapped).filter((a) => /^\d{1,2}\.\s/.test(a))) {
    let a = /^\d{1,2}\.\s+\[([a-z0-9][a-z0-9-]{0,79})\]\s+\S/.exec(s)?.[1];
    if (a === undefined || a === "readme" || o.some((S) => S.stem === a)) return null;
    let trimmed = (s.replace(/^\d{1,2}\.\s+\[[a-z0-9-]+\]\s+/, "").split(/:\s/)[0] ?? "")
      .replace(
        /\s*\((adds|changes|creates|edits|deletes|removes|you changed|changed recently|looks like|behind sign-in)\b[^)]*\)/gi,
        "",
      )
      .trim();
    let _ = collapseAndTruncate(trimmed, 140);
    o.push({
      stem: a,
      name: _ === "" ? null : _,
      area: null,
      addsData: /\((adds|changes|creates|edits|deletes|removes)\b/i.test(s),
      ...(/\(behind sign-in\)/i.test(s) && {
        walled: true,
      }),
    });
  }
  return o.length === 0 ? null : o;
}
export {
  APP_STATE_LABELS,
  SPECS_DIR,
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
  REPORT_STATE_TEXT,
  SEE_THE_CHAT_SUFFIX,
  humanizeSlug,
  REPORT_PREFIX,
  withCheckingAppState,
  capitalize,
  createOpeningFacts,
  canOpenBrowser,
  describeInstallState,
  parsePortHealthStatus,
};
