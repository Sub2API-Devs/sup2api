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

//@ chunk-ae5g0zb5.js:35406-35813 placement
/**
 * Claude Test 插件的进程级共享状态（浏览器助手、报告、面板、同意预览等）。
 */
var claudeTestState = {
  wantedSessions: new Set(),
  hasStartedServer: false,
  filesReady: undefined,
  report: undefined,
  reportRuns: undefined,
  mayRun: undefined,
  watchLogin: undefined,
  takeOut: undefined,
  listedWaitMs: 7000,
  isModuleLoaded: false,
  seatOwnAgents: undefined,
  agentsReread: undefined,
  agentsCheckedFor: undefined,
  isPaneOn: undefined,
  reportHref: undefined,
  installNoteText: undefined,
  isMadeHere: undefined,
  paneOpenedAt: 0,
  loads: new Map(),
  typedArgs: "",
  consentPreview: undefined,
  panePreview: undefined,
};
//@ chunk-ae5g0zb5.js:35813-35883 placement
/**
 * 普通对象
 */
function isPlainObjectNonArray(e) {
  return e !== null && typeof e === "object" && !Array.isArray(e);
}
//@ chunk-ae5g0zb5.js:35883-35989 placement
/**
 * 运行目录名与规格路径的格式约束。
 */
var RUN_ID_RE = /^\d{4}-\d{2}-\d{2}T\d{2}-\d{2}-\d{2}(-\d+)?$/;
var SPEC_SEGMENT_RE = /^[A-Za-z0-9_][A-Za-z0-9._-]{0,63}$/;
var MAX_SPEC_SEGMENTS = 8;
var MAX_SPEC_PATH_LENGTH = 200;
//@ chunk-ae5g0zb5.js:35989-36122 placement
/**
 * 规格路径是否合法（长度、段数、每段字符）。
 */
function isValidSpecPath(e) {
  if (typeof e !== "string" || e === "" || e.length > MAX_SPEC_PATH_LENGTH) return false;
  let parts = e.split("/");
  return parts.length <= MAX_SPEC_SEGMENTS && parts.every((r) => SPEC_SEGMENT_RE.test(r));
}
//@ chunk-ae5g0zb5.js:36122-36371 placement
/**
 * 把参数（可能是绝对路径）转为相对规格目录的合法路径，否则 null。
 */
function toSpecPath(e, n) {
  if (typeof e !== "string") return null;
  let r = e.trim().split(/\s+/, 1)[0] ?? "";
  let replaced = n.replace(/\/+$/, "");
  let replaced_2 = (
    r.startsWith("/") ? (r.startsWith(`${replaced}/`) ? r.slice(replaced.length + 1) : null) : r
  )
    ?.replace(/^(?:\.\/+)+/, "")
    .replace(/\/+$/, "");
  return isValidSpecPath(replaced_2) ? replaced_2 : null;
}
//@ chunk-ae5g0zb5.js:36371-36671 placement
/**
 * Claude Test 规格文件名与安全参数的正则、不可见字符正则，以及同意答案的三种取值。
 */
var SPEC_FILE_NAME_PATTERN = /^([a-z0-9][a-z0-9-]{0,79})\.md$/;
var SAFE_ARG_PATTERN = /^(?![.\s])[^/\\$`"':;&|<>*?\n\t]{1,120}$/u;
var regExp = new RegExp(
  String.raw`(?:[\p{Cc}\u2028\u2029\uFE00-\uFE0D\u{E0100}-\u{E01EF}]|(?![\u200C\u200D])\p{Cf}|[\u115F\u1160\u3164\uFFA0\u2065\uFFF0-\uFFF8\u{E0000}-\u{E0FFF}])+`,
  "gu",
);
var CONSENT_ANSWERS = ["visitor", "none", "refused"];
//@ chunk-ae5g0zb5.js:36671-36756 placement
/**
 * 解析同意答案
 */
function parseConsentAnswer(runFile) {
  let jsonObject = parseJsonObject(runFile);
  return typeof jsonObject?.answer === "string" && CONSENT_ANSWERS.includes(jsonObject.answer);
}
//@ chunk-ae5g0zb5.js:36756-36818 placement
/**
 * 去掉被隔离的条目
 */
function filterWalled(e, n) {
  return n ? e.filter((r) => r.walled !== true) : [...e];
}
//@ chunk-ae5g0zb5.js:36818-37944 placement
/**
 * 被测应用事实的显示文本：登录方式、支付、数据存放的几种说法，以及“测试没能开始”的阻塞原因与可用包管理器。
 */
var SIGN_IN_KIND_LABELS = {
  none: "none",
  form: "a form",
  google: "Google",
  other: "another site",
};
var PAYMENT_LABELS = {
  none: "none",
  stripe: "Stripe",
  other: "yes",
};
var DATA_LOCATION_LABELS = {
  browser: "in the browser",
  server: "on your server",
  local: "in a database",
  hosted: "in a hosted database",
};
var SIGN_IN_SHORT_LABELS = {
  none: "no sign-in",
  form: "sign-in by form",
  google: "Google sign-in",
  other: "sign-in on another site",
};
var PAYMENT_SHORT_LABELS = {
  none: "no payments",
  stripe: "Stripe payments",
  other: "payments",
};
var DATA_LOCATION_PHRASES = {
  browser: `data ${DATA_LOCATION_LABELS.browser}`,
  server: `data ${DATA_LOCATION_LABELS.server}`,
  local: `data ${DATA_LOCATION_LABELS.local}`,
  hosted: `data ${DATA_LOCATION_LABELS.hosted}`,
};
var BLOCKED_STATES = {
  agents: {
    mark: {
      text: "\u2717",
      tone: "error",
    },
    words: "Couldn't start the test agents",
  },
  blocked: {
    mark: {
      text: "\u26A0",
      tone: "warning",
    },
    words: "Blocked before the tests ran",
  },
  signin: {
    mark: {
      text: "\u26A0",
      tone: "warning",
    },
    words: "Nothing ran: every test needs sign-in",
  },
  halted: {
    mark: {
      text: "\u25A0",
      tone: "warning",
    },
    words: "Stopped before the tests ran",
  },
  declined: {
    mark: {
      text: "\u2717",
      tone: "error",
    },
    words: "Not allowed: nothing ran",
  },
};
var APP_UNAVAILABLE_CAUSES = {
  port: "Its port is in use by another program",
  packages: "Dependencies aren't installed",
  command: "Its start command wasn't found",
  other: "It stopped before it answered",
};
var APP_PACKAGE_MANAGERS = {
  npm: 1,
  pnpm: 1,
  yarn: 1,
  bun: 1,
};
//@ chunk-ae5g0zb5.js:37944-38231 placement
function describePortInUse(failure) {
  if (failure === null) return APP_UNAVAILABLE_CAUSES.other;
  if (failure.cause === "port" && failure.port !== null)
    return `Port ${failure.port} is in use by another program`;
  if (failure.cause === "packages")
    return failure.install === null
      ? "Dependencies aren't installed"
      : `Dependencies aren't installed: run ${failure.install} install`;
  return APP_UNAVAILABLE_CAUSES[failure.cause];
}
export {
  claudeTestState,
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
  toSpecPath,
  filterWalled,
  parseConsentAnswer,
  SIGN_IN_SHORT_LABELS,
  PAYMENT_SHORT_LABELS,
  DATA_LOCATION_PHRASES,
  describePortInUse,
  isValidSpecPath,
};
