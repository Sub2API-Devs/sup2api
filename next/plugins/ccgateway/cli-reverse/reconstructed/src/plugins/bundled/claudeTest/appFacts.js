/**
 * plugins/bundled/claudeTest/appFacts.ts
 *
 * 2.1.316 新增：Claude Test 记录的被测应用事实（登录方式、支付、数据存放、端口）及其显示文本
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * new in 2.1.318 (2.1.88 has no file at this path)
 * pieces: chunk-mhn0amzz.js (10)
 * attribution: placement 10
 */
import { parseJsonObject } from "./progress.js";
import { runDeferredInits } from "../../../../runtime/deferred-init.js";

//@ chunk-mhn0amzz.js:36644-37051 placement
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
//@ chunk-mhn0amzz.js:37051-37121 placement
/**
 * 普通对象
 */
function isPlainObjectNonArray(value) {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}
//@ chunk-mhn0amzz.js:37121-37227 placement
/**
 * 运行目录名与规格路径的格式约束。
 */
var RUN_ID_RE = /^\d{4}-\d{2}-\d{2}T\d{2}-\d{2}-\d{2}(-\d+)?$/;
var SPEC_SEGMENT_RE = /^[A-Za-z0-9_][A-Za-z0-9._-]{0,63}$/;
var MAX_SPEC_SEGMENTS = 8;
var MAX_SPEC_PATH_LENGTH = 200;
//@ chunk-mhn0amzz.js:37227-37360 placement
/**
 * 规格路径是否合法（长度、段数、每段字符）。
 */
function isValidSpecPath(specPath) {
  if (typeof specPath !== "string" || specPath === "" || specPath.length > MAX_SPEC_PATH_LENGTH) return false;
  let parts = specPath.split("/");
  return parts.length <= MAX_SPEC_SEGMENTS && parts.every((segment) => SPEC_SEGMENT_RE.test(segment));
}
//@ chunk-mhn0amzz.js:37360-37609 placement
/**
 * 把参数（可能是绝对路径）转为相对规格目录的合法路径，否则 null。
 */
function toSpecPath(text, rootDir) {
  if (typeof text !== "string") return null;
  let firstWord = text.trim().split(/\s+/, 1)[0] ?? "";
  let replaced = rootDir.replace(/\/+$/, "");
  let specPath = (
    firstWord.startsWith("/")
      ? firstWord.startsWith(`${replaced}/`)
        ? firstWord.slice(replaced.length + 1)
        : null
      : firstWord
  )
    ?.replace(/^(?:\.\/+)+/, "")
    .replace(/\/+$/, "");
  return isValidSpecPath(specPath) ? specPath : null;
}
//@ chunk-mhn0amzz.js:37609-37909 placement
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
//@ chunk-mhn0amzz.js:37909-37994 placement
/**
 * 解析同意答案
 */
function parseConsentAnswer(runFile) {
  let jsonObject = parseJsonObject(runFile);
  return typeof jsonObject?.answer === "string" && CONSENT_ANSWERS.includes(jsonObject.answer);
}
//@ chunk-mhn0amzz.js:37994-38056 placement
/**
 * 去掉被隔离的条目
 */
function filterWalled(items, dropWalled) {
  return dropWalled ? items.filter((item) => item.walled !== true) : [...items];
}
//@ chunk-mhn0amzz.js:38056-39182 placement
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
//@ chunk-mhn0amzz.js:39182-39469 placement
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

// The import cycle this module closes (3 modules) is complete: run the load-time work its statements
// marked "deferred" waited for, in the official build's order (runtime/deferred-init.js).
runDeferredInits("src/plugins/bundled/claudeTest/appFacts.js");
runDeferredInits("worker:src/plugins/bundled/claudeTest/appFacts.js");
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
