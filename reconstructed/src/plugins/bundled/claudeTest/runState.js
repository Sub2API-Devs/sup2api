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
  G,
  regExp,
  _r,
  SIGN_IN_KIND_LABELS,
  cl,
  Rt,
  _l,
  SPEC_FILE_NAME_PATTERN,
  wr,
  RUN_ID_RE,
  il,
} from "./appFacts.js";
import { parseJsonObject } from "./progress.js";

//@ chunk-ae5g0zb5.js:38231-38606 placement
var SEE_THE_CHAT_SUFFIX = " \xB7 see the chat",
  wl = [
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
  ],
  Er = /^[A-Za-z0-9][A-Za-z0-9 ]{0,29}$/,
  El = /^[A-Za-z0-9@._:/=+ -]{1,60}$/,
  Sl = /^[a-z][a-z0-9-]{0,23}$/,
  qe = { app: null, about: null, name: null, look: null, more: [], stopped: null, from: null };
/**
 * 解析服务健康状态 JSON：up / down / busy（端口占用）。
 */
//@ chunk-ae5g0zb5.js:39033-39267 placement = CompanionFloatingBubble (0.32)
function parsePortHealthStatus(json) {
  let n;
  try {
    n = json === void 0 ? null : JSON.parse(json);
  } catch {
    return null;
  }
  if (!G(n)) return null;
  let { up: up, portBusy: portBusy } = n;
  if (up === !0) return { kind: "up" };
  if (up !== !1) return null;
  if (!G(portBusy)) return { kind: "down" };
  return { kind: "busy", port: hr(portBusy.port) };
}
//@ chunk-ae5g0zb5.js:39267-39280 placement
var Tl = 30000;
//@ chunk-ae5g0zb5.js:39280-39647 placement
function describeInstallState(e, n, r) {
  if (e === void 0) return null;
  let o;
  try {
    o = JSON.parse(e);
  } catch {
    return null;
  }
  if (!G(o)) return null;
  let { state: state, percent: percent, at: at } = o;
  if (
    (state !== "installing" && state !== "done" && state !== "failed") ||
    typeof at !== "number" ||
    !Number.isFinite(at) ||
    at < n - 2000 ||
    (state === "installing" && r - at > Tl)
  )
    return null;
  return {
    state: state,
    percent:
      typeof percent === "number" && Number.isInteger(percent) && percent >= 0 && percent <= 100
        ? percent
        : null,
    at: at,
  };
}
//@ chunk-ae5g0zb5.js:39647-39688 placement
var Ot = ".claude-test/runs",
  ln = "Report: ";
/**
 * 环境能否打开浏览器：非 CI/SSH，未设 CLAUDE_TEST_NO_OPEN，且为 macOS/Windows 或有 DISPLAY/WAYLAND_DISPLAY。
 */
//@ chunk-ae5g0zb5.js:39688-39977 placement
function canOpenBrowser(e, n) {
  if (
    e.CLAUDE_TEST_NO_OPEN !== void 0 ||
    e.CI !== void 0 ||
    e.SSH_CONNECTION !== void 0 ||
    e.SSH_TTY !== void 0 ||
    e.SSH_CLIENT !== void 0
  )
    return !1;
  return (
    n === "darwin" ||
    n === "win32" ||
    /^(?:unix)?:\d{1,4}(?:\.\d{1,2})?$/.test(e.DISPLAY ?? "") ||
    /^[A-Za-z0-9._-]{1,64}$/.test(e.WAYLAND_DISPLAY ?? "")
  );
}
/**
 * 根据准备阶段与运行行数推算读代码/写测试状态。
 */
//@ chunk-ae5g0zb5.js:39977-40236 placement
function resolveCodeReadingFlags(e, n) {
  let r = e?.isReadingCode ?? !1,
    o = e?.hasReadCode ?? !1,
    s = e?.isWritingTests;
  if (e?.isPreparing !== !0)
    return { isReadingCode: r, hasReadCode: o, ...(s === void 0 ? {} : { isWritingTests: s }) };
  return { isReadingCode: r || n === 0, hasReadCode: o || n > 0, isWritingTests: s === !0 || n > 0 };
}
/**
 * 运行事实的初始对象。
 */
//@ chunk-ae5g0zb5.js:40236-40366 placement
function createRunFacts(e, n) {
  return {
    openedAt: e,
    finishedAt: null,
    hasRunFolder: !1,
    hasLook: !1,
    ...resolveCodeReadingFlags(n, 0),
    readingFolder: null,
    proposed: [],
    run: null,
  };
}
/**
 * 打开面板时的运行事实（含早期应用状态）。
 */
//@ chunk-ae5g0zb5.js:40366-40471 placement
function createOpeningFacts(e, n, r = !1, o = null) {
  return { ...createRunFacts(e), isOpening: !0, early: { name: o, app: n }, ...(r && { isStartingApp: !0 }) };
}
//@ chunk-ae5g0zb5.js:40471-40483 placement
var bl = 1000;
/**
 * 早期阶段尚未过期时把应用状态显示为 checking。
 */
//@ chunk-ae5g0zb5.js:40483-40662 placement
function withCheckingAppState(e, n) {
  let r = e.early ?? null;
  if (r === null || r.app === null || r.app.kind === "checking" || e.hasRunFolder || n - e.openedAt >= bl)
    return e;
  return { ...e, early: { ...r, app: { kind: "checking" } } };
}
/**
 * 去掉标签、压缩空白并截断到 n 个字符。
 */
//@ chunk-ae5g0zb5.js:40662-40778 placement
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
function Pl(e, n) {
  return typeof n === "string" && Object.hasOwn(e, n);
}
//@ chunk-ae5g0zb5.js:40949-40990 placement
function Ne(e, n) {
  return Pl(e, n) ? n : void 0;
}
//@ chunk-ae5g0zb5.js:40990-41070 placement
function cs(e) {
  return typeof e === "number" && Number.isInteger(e) && e >= 0 && e < 1e4 ? e : 0;
}
//@ chunk-ae5g0zb5.js:41070-41156 placement
function hr(e) {
  return typeof e === "number" && Number.isInteger(e) && e >= 1 && e <= 65535 ? e : null;
}
//@ chunk-ae5g0zb5.js:41156-42282 placement
function summarizeRunStart(e) {
  let n = parseJsonObject(e);
  if (n === null) return qe;
  let r = G(n.app) ? n.app : null,
    o = G(n.about) ? n.about : null,
    s = G(n.look) ? n.look : null,
    a = Ne({ down: 1, running: 1, started: 1, failed: 1, busy: 1, stopped: 1 }, r?.state),
    i = Ne(_r, r?.cause),
    c = Ne(SIGN_IN_KIND_LABELS, o?.signin),
    _ = Ne(cl, o?.payments),
    S = Ne(Rt, o?.data),
    w = Ne({ loads: 1, empty: 1, nothing: 1 }, s?.kind),
    f = r?.command,
    b = r?.port;
  return {
    app:
      a === void 0
        ? null
        : {
            state: a,
            command: a === "started" && typeof f === "string" && El.test(f) ? f : null,
            failure:
              a === "failed"
                ? {
                    cause: i ?? "other",
                    port: i === "port" ? hr(b) : null,
                    install: i === "packages" ? (Ne(_l, r?.install) ?? null) : null,
                  }
                : null,
            port: a !== "down" && a !== "failed" && a !== "stopped" ? hr(b) : null,
          },
    about:
      c === void 0 || _ === void 0 || S === void 0
        ? null
        : {
            framework: typeof o?.framework === "string" && wl.includes(o.framework) ? o.framework : null,
            signin: c,
            payments: _,
            data: S,
          },
    name: typeof n.name === "string" && Er.test(n.name) ? n.name : null,
    look: w === void 0 ? null : { kind: w, errors: cs(s?.errors), failed: cs(s?.failed) },
    more: Array.isArray(n.more)
      ? n.more.filter((P) => typeof P === "string" && SPEC_FILE_NAME_PATTERN.test(`${P}.md`)).slice(0, 4)
      : [],
    stopped: Ne(wr, n.stopped) ?? null,
    from: typeof n.from === "string" && RUN_ID_RE.test(n.from) ? n.from : null,
    ...(n.fix === "none" && { noFix: !0 }),
  };
}
//@ chunk-ae5g0zb5.js:42282-42995 placement
function stripHtmlComments(e, n) {
  let r =
      typeof n === "string" &&
      n.startsWith(`---
`),
    o = r
      ? n.indexOf(
          `
---`,
          3,
        )
      : -1,
    s = r
      ? n.slice(4, Math.max(4, o)).split(
          `
`,
          20,
        )
      : [],
    found = s.map((f) => /^area\s*:\s*([a-z][a-z0-9-]{0,23})$/.exec(f.trim())?.[1]).find((f) => f !== void 0),
    i = typeof n !== "string" ? "" : r ? (o < 0 ? "" : n.slice(o + 4)) : n,
    c = /^#[ \t]+(.+)$/m.exec(i.slice(0, 4096))?.[1],
    _ = c === void 0 ? "" : collapseAndTruncate(c.trim(), 140),
    found_2 = i
      .slice(0, 4096)
      .split(
        `
`,
      )
      .map((f) => f.trim())
      .find((f) => f !== "" && !f.startsWith("#") && !f.startsWith("<!--")),
    w =
      /^signed in\b/i.test(found_2 ?? "") ||
      s.some((f) => /^tags\s*:\s*\[[^\]]*\bsigned-in\b[^\]]*\]$/.test(f.trim()));
  return {
    stem: e,
    name: _ === "" ? null : _,
    area: found ?? null,
    addsData: s.some((f) => /^tags\s*:\s*\[\s*creates-data\s*\]$/.test(f.trim())),
    ...(w && { walled: !0 }),
  };
}
//@ chunk-ae5g0zb5.js:42995-43084 placement
function nt(e) {
  return typeof e === "string" && il.test(e) && !e.startsWith("-") && collapseAndTruncate(e, 120) === e;
}
/**
 * 比较运行 id（时间戳部分，再按序号后缀）。
 */
//@ chunk-ae5g0zb5.js:43084-43202 placement
function compareRunIds(e, n) {
  return (
    e.slice(0, 19).localeCompare(n.slice(0, 19)) || (Number(e.slice(20)) || 1) - (Number(n.slice(20)) || 1)
  );
}
//@ chunk-ae5g0zb5.js:43202-43282 placement
function Gs(e) {
  let filtered = e.filter((r) => RUN_ID_RE.test(r));
  return (filtered.sort(compareRunIds), filtered.at(-1) ?? null);
}
//@ chunk-ae5g0zb5.js:43282-43291 placement
var Ll = 8;
//@ chunk-ae5g0zb5.js:43291-43386 placement
function Us(e, n) {
  return e
    .filter((r) => RUN_ID_RE.test(r) && compareRunIds(r, n) < 0)
    .sort(compareRunIds)
    .slice(-(Ll + 1))
    .reverse();
}
//@ chunk-ae5g0zb5.js:43386-43396 placement
var Ol = 50;
/**
 * 解析 fix.json 的 fixed 列表（全部合法才返回，去重）。
 */
//@ chunk-ae5g0zb5.js:43396-43634 placement
function parseFixedSpecs(e) {
  if (e === void 0) return [];
  try {
    let parsed = JSON.parse(e),
      r = G(parsed) ? parsed.fixed : void 0;
    if (!Array.isArray(r) || r.length < 1 || r.length > Ol) return [];
    let filtered = r.filter(nt);
    return filtered.length === r.length ? filtered.filter((s, a) => filtered.indexOf(s) === a) : [];
  } catch {
    return [];
  }
}
/**
 * 找最近一个包含指定规格未通过的运行，并合并之前运行的结论。
 */
//@ chunk-ae5g0zb5.js:43634-43812 placement
function findLatestFailingRun(e, n) {
  let index = e.findIndex((s) =>
      s.rows.some((row) => n.includes(row.stem) && row.verdict !== null && row.verdict !== "PASS"),
    ),
    o = e[index];
  return o === void 0 ? null : mergeEarlierVerdicts(o, e.slice(0, index).toReversed());
}
/**
 * 用更早的运行补齐结论与耗时。
 */
//@ chunk-ae5g0zb5.js:43812-44195 placement
function mergeEarlierVerdicts(e, n) {
  let rows = e.rows,
    o = 0;
  for (let s of n) {
    let a = new Map(s.rows.filter((row) => row.verdict !== null).map((i) => [i.stem, i]));
    if (!rows.some((i) => a.has(i.stem))) continue;
    ((rows = rows.map((i) => {
      let c = a.get(i.stem);
      return c === void 0 ? i : { ...i, verdict: c.verdict, seconds: c.seconds };
    })),
      (o += s.doneAtS));
  }
  return rows === e.rows
    ? e
    : {
        ...e,
        rows: rows,
        doneAtS: e.doneAtS + o,
        ...(typeof e.seconds === "number" && { seconds: e.seconds + o }),
      };
}
//@ chunk-ae5g0zb5.js:44195-44205 placement
var Nl = 16;
/**
 * 找出与当前运行同一链（通过 from 链接）的更早运行。
 */
//@ chunk-ae5g0zb5.js:44205-44422 placement
function findRunsInSameChain(e, n, r) {
  let o = { known: new Set(e.filter((a) => RUN_ID_RE.test(a))), linkOf: r, roots: new Map() },
    s = findChainRoot(o, n);
  if (s === null || s === n) return [];
  return [...o.known]
    .filter((a) => compareRunIds(s, a) <= 0 && compareRunIds(a, n) < 0)
    .sort(compareRunIds)
    .filter((a) => findChainRoot(o, a) === s);
}
/**
 * 沿 from 链找运行链的根（带缓存与深度上限）。
 */
//@ chunk-ae5g0zb5.js:44422-44671 placement
function findChainRoot(e, n) {
  let r = n,
    o = null,
    s = [];
  for (let a = 0; a <= Nl; a++) {
    if (e.roots.has(r)) {
      o = e.roots.get(r) ?? null;
      break;
    }
    s.push(r);
    let linkOf = e.linkOf(r),
      c = linkOf !== null && e.known.has(linkOf) && compareRunIds(linkOf, r) < 0 ? linkOf : null;
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
  if (n === void 0) return null;
  let o = [...n.rows],
    s = 0;
  for (let _ of r) {
    for (let row of _.rows) {
      if (row.verdict === null) continue;
      let index = o.findIndex((b) => b.stem === row.stem),
        f = o[index];
      if (f === void 0) o.push(row);
      else o[index] = { ...f, verdict: row.verdict, seconds: row.seconds };
    }
    s += _.doneAtS;
  }
  if (r.length === 0) return n;
  let { skipped: skipped, ...i } = n,
    c = n.skipped === void 0 ? 0 : Math.max(0, n.skipped - (o.length - n.rows.length));
  return {
    ...i,
    rows: o,
    doneAtS: n.doneAtS + s,
    ...(typeof n.seconds === "number" && { seconds: n.seconds + s }),
    ...(c >= 1 && { skipped: c }),
  };
}
/**
 * 解析运行记录里的 from 字段（合法运行 id）。
 */
//@ chunk-ae5g0zb5.js:45183-45334 placement
function parseRunFrom(e) {
  if (e === void 0) return null;
  try {
    let parsed = JSON.parse(e),
      r = G(parsed) ? parsed.from : void 0;
    return typeof r === "string" && RUN_ID_RE.test(r) ? r : null;
  } catch {
    return null;
  }
}
//@ chunk-ae5g0zb5.js:45334-45403 placement
var It = ".claude-test/specs",
  zs = ".outline.md",
  OUTLINE_ASKED_JSON = "outline-asked.json";
//@ chunk-ae5g0zb5.js:45403-45779 placement
function formatAskedSpecs(e) {
  if (typeof e !== "string" || e.length > 16384) return null;
  let n;
  try {
    let parsed = JSON.parse(e);
    n = G(parsed) ? parsed.tests : void 0;
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
function qs(e, n) {
  return n !== null && e !== null && n.length !== e.length ? n : e;
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
      .map((s) => s.trim()),
    index = mapped.findIndex((s) => /^not covered:?$/i.test(s)),
    o = [];
  for (let s of (index >= 0 ? mapped.slice(0, index) : mapped).filter((a) => /^\d{1,2}\.\s/.test(a))) {
    let a = /^\d{1,2}\.\s+\[([a-z0-9][a-z0-9-]{0,79})\]\s+\S/.exec(s)?.[1];
    if (a === void 0 || a === "readme" || o.some((S) => S.stem === a)) return null;
    let trimmed = (s.replace(/^\d{1,2}\.\s+\[[a-z0-9-]+\]\s+/, "").split(/:\s/)[0] ?? "")
        .replace(
          /\s*\((adds|changes|creates|edits|deletes|removes|you changed|changed recently|looks like|behind sign-in)\b[^)]*\)/gi,
          "",
        )
        .trim(),
      _ = collapseAndTruncate(trimmed, 140);
    o.push({
      stem: a,
      name: _ === "" ? null : _,
      area: null,
      addsData: /\((adds|changes|creates|edits|deletes|removes)\b/i.test(s),
      ...(/\(behind sign-in\)/i.test(s) && { walled: !0 }),
    });
  }
  return o.length === 0 ? null : o;
}

export {
  Er,
  It,
  compareRunIds,
  createRunFacts,
  Ot,
  Gs,
  summarizeRunStart,
  Us,
  parseRunFrom,
  findRunsInSameChain,
  parseFixedSpecs,
  countResults,
  findLatestFailingRun,
  qs,
  readSpecOutline,
  zs,
  formatAskedSpecs,
  OUTLINE_ASKED_JSON,
  stripHtmlComments,
  resolveCodeReadingFlags,
  nt,
  collapseAndTruncate,
  Sl,
  qe,
  SEE_THE_CHAT_SUFFIX,
  humanizeSlug,
  ln,
  withCheckingAppState,
  capitalize,
  createOpeningFacts,
  canOpenBrowser,
  describeInstallState,
  parsePortHealthStatus,
};
