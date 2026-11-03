/**
 * plugins/bundled/claudeTest/appFacts.ts
 *
 * 2.1.316 新增：Claude Test 记录的被测应用事实（登录方式、支付、数据存放、端口）及其显示文本
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-ae5g0zb5.js (10)
 * attribution: placement 10
 */
import { parseJsonObject } from "./progress.js";

/**
 * Claude Test 插件的进程级共享状态（浏览器助手、报告、面板、同意预览等）。
 */
//@ chunk-ae5g0zb5.js:35406-35813 placement
var claudeTestState = {
  wantedSessions: new Set(),
  hasStartedServer: !1,
  filesReady: void 0,
  report: void 0,
  reportRuns: void 0,
  mayRun: void 0,
  watchLogin: void 0,
  takeOut: void 0,
  listedWaitMs: 7000,
  isModuleLoaded: !1,
  seatOwnAgents: void 0,
  agentsReread: void 0,
  agentsCheckedFor: void 0,
  isPaneOn: void 0,
  reportHref: void 0,
  installNoteText: void 0,
  isMadeHere: void 0,
  paneOpenedAt: 0,
  loads: new Map(),
  typedArgs: "",
  consentPreview: void 0,
  panePreview: void 0,
};
//@ chunk-ae5g0zb5.js:35813-35883 placement
function G(e) {
  return e !== null && typeof e === "object" && !Array.isArray(e);
}
/**
 * 运行目录名与规格路径的格式约束。
 */
//@ chunk-ae5g0zb5.js:35883-35989 placement
var RUN_ID_RE = /^\d{4}-\d{2}-\d{2}T\d{2}-\d{2}-\d{2}(-\d+)?$/,
  SPEC_SEGMENT_RE = /^[A-Za-z0-9_][A-Za-z0-9._-]{0,63}$/,
  MAX_SPEC_SEGMENTS = 8,
  MAX_SPEC_PATH_LENGTH = 200;
/**
 * 规格路径是否合法（长度、段数、每段字符）。
 */
//@ chunk-ae5g0zb5.js:35989-36122 placement
function isValidSpecPath(e) {
  if (typeof e !== "string" || e === "" || e.length > MAX_SPEC_PATH_LENGTH) return !1;
  let parts = e.split("/");
  return parts.length <= MAX_SPEC_SEGMENTS && parts.every((r) => SPEC_SEGMENT_RE.test(r));
}
/**
 * 把参数（可能是绝对路径）转为相对规格目录的合法路径，否则 null。
 */
//@ chunk-ae5g0zb5.js:36122-36371 placement
function toSpecPath(e, n) {
  if (typeof e !== "string") return null;
  let r = e.trim().split(/\s+/, 1)[0] ?? "",
    replaced = n.replace(/\/+$/, ""),
    a = (r.startsWith("/") ? (r.startsWith(`${replaced}/`) ? r.slice(replaced.length + 1) : null) : r)
      ?.replace(/^(?:\.\/+)+/, "")
      .replace(/\/+$/, "");
  return isValidSpecPath(a) ? a : null;
}
//@ chunk-ae5g0zb5.js:36371-36671 placement
var SPEC_FILE_NAME_PATTERN = /^([a-z0-9][a-z0-9-]{0,79})\.md$/,
  il = /^(?![.\s])[^/\\$`"':;&|<>*?\n\t]{1,120}$/u,
  regExp = new RegExp(
    String.raw`(?:[\p{Cc}\u2028\u2029\uFE00-\uFE0D\u{E0100}-\u{E01EF}]|(?![\u200C\u200D])\p{Cf}|[\u115F\u1160\u3164\uFFA0\u2065\uFFF0-\uFFF8\u{E0000}-\u{E0FFF}])+`,
    "gu",
  ),
  dl = ["visitor", "none", "refused"];
//@ chunk-ae5g0zb5.js:36671-36756 placement
function Ns(e) {
  let n = parseJsonObject(e);
  return typeof n?.answer === "string" && dl.includes(n.answer);
}
//@ chunk-ae5g0zb5.js:36756-36818 placement
function Is(e, n) {
  return n ? e.filter((r) => r.walled !== !0) : [...e];
}
/**
 * 应用事实各取值的显示文本（登录方式、Stripe、数据位置等）。
 */
//@ chunk-ae5g0zb5.js:36818-37944 placement
var SIGN_IN_KIND_LABELS = { none: "none", form: "a form", google: "Google", other: "another site" },
  cl = { none: "none", stripe: "Stripe", other: "yes" },
  Rt = {
    browser: "in the browser",
    server: "on your server",
    local: "in a database",
    hosted: "in a hosted database",
  },
  pl = {
    none: "no sign-in",
    form: "sign-in by form",
    google: "Google sign-in",
    other: "sign-in on another site",
  },
  ml = { none: "no payments", stripe: "Stripe payments", other: "payments" },
  gl = {
    browser: `data ${Rt.browser}`,
    server: `data ${Rt.server}`,
    local: `data ${Rt.local}`,
    hosted: `data ${Rt.hosted}`,
  },
  wr = {
    agents: { mark: { text: "\u2717", tone: "error" }, words: "Couldn't start the test agents" },
    blocked: { mark: { text: "\u26A0", tone: "warning" }, words: "Blocked before the tests ran" },
    signin: { mark: { text: "\u26A0", tone: "warning" }, words: "Nothing ran: every test needs sign-in" },
    halted: { mark: { text: "\u25A0", tone: "warning" }, words: "Stopped before the tests ran" },
    declined: { mark: { text: "\u2717", tone: "error" }, words: "Not allowed: nothing ran" },
  },
  _r = {
    port: "Its port is in use by another program",
    packages: "Dependencies aren't installed",
    command: "Its start command wasn't found",
    other: "It stopped before it answered",
  },
  _l = { npm: 1, pnpm: 1, yarn: 1, bun: 1 };
//@ chunk-ae5g0zb5.js:37944-38231 placement
function describePortInUse(e) {
  if (e === null) return _r.other;
  if (e.cause === "port" && e.port !== null) return `Port ${e.port} is in use by another program`;
  if (e.cause === "packages")
    return e.install === null
      ? "Dependencies aren't installed"
      : `Dependencies aren't installed: run ${e.install} install`;
  return _r[e.cause];
}

export {
  claudeTestState,
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
  toSpecPath,
  Is,
  Ns,
  pl,
  ml,
  gl,
  describePortInUse,
  isValidSpecPath,
};
