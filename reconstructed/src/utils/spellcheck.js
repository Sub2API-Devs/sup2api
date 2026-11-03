/**
 * utils/spellcheck.ts
 *
 * 2.1.316 新增。拼写检查。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-18hwfzwa.js (8), chunk-dcmhvw5a.js (14)
 * attribution: placement 22
 */
import { homedir } from "os";
import { getModeConfig } from "./permissions/PermissionMode.js";
import { M, preprocess, u, array, string, _enum, literal } from "../../vendor/zod/v4/classic/schemas.js";
import { PERMISSION_MODES, EXTERNAL_PERMISSION_MODES } from "../types/permissions.js";
import { logForDebugging } from "./debug.js";
import { whichAsync } from "./which.js";
import { HostScoped } from "./hostScoped.js";
import { createSignal } from "./signal.js";
import {
  jsxProd_default,
  jsxProd_default_2,
} from "../../vendor/react/cjs/react-jsx-dev-runtime.react-server.production.js";
import { lit as lit_2, fromEnum } from "../services/analytics/safeMetadata.js";
import { Text, Box } from "../ink/components/Text.js";
import { env } from "./env.js";
import { logEvent } from "../services/analytics/index.js";
import { logError } from "./log.js";
import {
  errorMessage,
  TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS,
  getErrnoCode,
} from "./errors.js";
import { logFeatureBad, logFeatureSad, logFeatureOk } from "../services/analytics/featureTelemetry.js";
import { DoctorLazy } from "../cli/handlers/util.js";
import { MEMO_CACHE_SENTINEL } from "../../runtime/bun-runtime.js";
import { y, P, R } from "../../vendor/react/cjs/react.production.js";
import { getFeatureValue_CACHED_MAY_BE_STALE } from "../services/analytics/growthbook.js";
import { jsonStringify } from "./slowOperations.js";
import { safeSpawn } from "./safeSpawn.js";
import { subprocessEnv } from "./subprocessEnv.js";
import { registerCleanup } from "./cleanupRegistry.js";
import { w } from "../../vendor/react/compiler-runtime.js";
import { truncateToLength, stripSuffix } from "./stringUtils.js";

//@ chunk-dcmhvw5a.js:209359-209393 placement
/**
 * 取主题颜色。
 */
function themeColorOf(e) {
  return getModeConfig(e).color;
}
//@ chunk-dcmhvw5a.js:209393-209428 placement
/**
 * 接受 true/false 字符串的布尔 schema。
 */
function booleanishSchema(e = M()) {
  return preprocess(coerceBooleanString, e);
}
//@ chunk-dcmhvw5a.js:209428-209481 placement
/**
 * 把 true/false 字符串转为布尔。
 */
function coerceBooleanString(e) {
  return e === "true" ? true : e === "false" ? false : e;
}
//@ chunk-dcmhvw5a.js:209481-209566 placement
/**
 * 拼写检查程序列表与词格式。
 */
var SPELLCHECK_PROGRAMS = ["aspell", "hunspell", "ispell"];
var ISPELL_SESSION_END_MARKER = `!
`;
var SPELLCHECK_LANG_RE = /^[A-Za-z][A-Za-z0-9_.,-]{0,63}$/;
//@ chunk-dcmhvw5a.js:209566-209600 placement
/**
 * 语言标识是否合法（字母开头、允许 . , _ -）。
 */
function isValidLanguageTag(e) {
  return SPELLCHECK_LANG_RE.test(e);
}
//@ chunk-dcmhvw5a.js:209600-209852 placement
/**
 * 拼写检查程序的管道模式参数。
 */
function spellCheckerArgs(e, n) {
  let r = n !== undefined && isValidLanguageTag(n) ? n : undefined;
  switch (e) {
    case "aspell":
      return ["-a", "--encoding=utf-8", "--sug-mode=ultra", ...(r ? [`--lang=${r}`] : [])];
    case "hunspell":
      return ["-a", "-i", "utf-8", ...(r ? ["-d", r] : [])];
    case "ispell":
      return ["-a", ...(r ? ["-d", r] : [])];
  }
}
//@ chunk-dcmhvw5a.js:209852-210039 placement
/**
 * 从 ispell 版本行判断实际是 aspell/hunspell/ispell。
 */
function detectSpellCheckerFlavor(e) {
  if (!e.startsWith("@(#) International Ispell")) return null;
  if (/but really Aspell/i.test(e)) return "aspell";
  if (/but really Hunspell/i.test(e)) return "hunspell";
  return "ispell";
}
//@ chunk-dcmhvw5a.js:210039-210080 placement
/**
 * 生成向 ispell 管道查询的 `^word …` 行。
 */
function buildWordQueryLine(e) {
  return `^${e.join(" ")}
`;
}
//@ chunk-dcmhvw5a.js:210080-210436 placement
/**
 * 解析 ispell 管道输出行。
 */
function parseIspellLine(e) {
  if (e === "")
    return {
      type: "end",
    };
  switch (e[0]) {
    case "*":
    case "+":
    case "-":
      return {
        type: "correct",
      };
    case "&":
    case "?": {
      let match = /^[&?] (\S+) \d+ \d+:/.exec(e);
      return match
        ? {
            type: "misspelled",
            word: match[1],
          }
        : {
            type: "unrecognized",
          };
    }
    case "#": {
      let match = /^# (\S+) \d+/.exec(e);
      return match
        ? {
            type: "misspelled",
            word: match[1],
          }
        : {
            type: "unrecognized",
          };
    }
    default:
      return {
        type: "unrecognized",
      };
  }
}
//@ chunk-dcmhvw5a.js:210436-210502 placement
var SETTINGS_FEATURE_ORDER = ["autoMode", "deepLink", "voice", "briefView", "screenReader"];
//@ chunk-dcmhvw5a.js:210502-212817 placement
/**
 * 按特性分组的设置 schema（构建开关、形状）。
 */
var SETTINGS_FEATURE_GROUPS = {
  autoMode: {
    buildGate: () => true,
    shape: () => ({
      skipAutoPermissionPrompt: M()
        .optional()
        .describe("Whether the user has accepted the auto mode opt-in dialog"),
      useAutoModeDuringPlan: M()
        .optional()
        .describe("Whether plan mode uses auto mode semantics when auto mode is available (default: true)"),
      autoMode: u({
        allow: array(string())
          .optional()
          .describe(
            'Rules for the auto mode classifier allow section. Include the literal string "$defaults" to inherit the built-in rules at that position.',
          ),
        soft_deny: array(string())
          .optional()
          .describe(
            'Rules for the auto mode classifier SOFT BLOCK section \u2014 destructive/irreversible actions that user intent can clear. Include the literal string "$defaults" to inherit the built-in rules at that position.',
          ),
        hard_deny: array(string())
          .optional()
          .describe(
            'Rules for the auto mode classifier HARD BLOCK section \u2014 security boundaries that user intent does NOT clear. Include the literal string "$defaults" to inherit the built-in rules at that position.',
          ),
        ...false,
        ...{},
        environment: array(string())
          .optional()
          .describe(
            'Entries for the auto mode classifier environment section. Include the literal string "$defaults" to inherit the built-in entries at that position.',
          ),
        classifyAllShell: M()
          .optional()
          .describe(
            "When true, every Bash/PowerShell allow rule is suspended while auto mode is active so all shell commands are routed through the classifier (higher safety, more classifier calls). Default: false.",
          ),
      })
        .optional()
        .describe("Auto mode classifier prompt customization"),
    }),
    permissionModes: () => PERMISSION_MODES.filter((e) => !EXTERNAL_PERMISSION_MODES.includes(e)),
  },
  deepLink: {
    buildGate: () => true,
    shape: () => ({
      disableDeepLinkRegistration: _enum(["disable"])
        .optional()
        .describe("Prevent claude-cli:// protocol handler registration with the OS"),
    }),
  },
  voice: {
    buildGate: () => true,
    shape: () => ({
      voiceEnabled: M().optional().describe("Enable voice mode (hold-to-talk dictation)"),
    }),
  },
  briefView: {
    buildGate: () => true,
    shape: () => ({
      defaultView: _enum(["chat", "transcript"])
        .optional()
        .describe("Default transcript view: chat (SendUserMessage checkpoints only) or transcript (full)"),
    }),
  },
  screenReader: {
    buildGate: () => true,
    shape: () => ({
      axScreenReader: M()
        .optional()
        .describe(
          "Render screen-reader friendly output (flat text, no decorative borders or animations). Overridden by the CLAUDE_AX_SCREEN_READER env var and the --ax-screen-reader CLI flag. Ignored in project and local settings.",
        ),
    }),
  },
};
//@ chunk-dcmhvw5a.js:212817-212873 placement
/**
 * 返回构建开关打开的设置特性组名。
 */
function enabledSettingsFeatureGroups() {
  return SETTINGS_FEATURE_ORDER.filter((e) => SETTINGS_FEATURE_GROUPS[e].buildGate());
}
//@ chunk-dcmhvw5a.js:212873-212947 placement
function buildSettingsShapeForGroups(e) {
  let n = {};
  for (let r of e)
    n = {
      ...n,
      ...SETTINGS_FEATURE_GROUPS[r].shape(),
    };
  return n;
}
//@ chunk-dcmhvw5a.js:212947-213036 placement
function buildPermissionModesForGroups(e) {
  let n = [];
  for (let r of e) n.push(...(SETTINGS_FEATURE_GROUPS[r].permissionModes?.() ?? []));
  return n;
}
//@ chunk-18hwfzwa.js:865347-865735 placement
async function findSpellChecker(h, x) {
  let D = h !== "auto" && SPELLCHECK_PROGRAMS.includes(h) ? [h] : SPELLCHECK_PROGRAMS;
  if (x !== undefined && !isValidLanguageTag(x))
    logForDebugging(
      `[spellcheck] ignoring language "${x}" (not a plain dictionary name); the checker's default dictionary applies`,
    );
  for (let L of D) {
    let ee = await whichAsync(L);
    if (ee)
      return {
        command: ee,
        args: spellCheckerArgs(L, x),
      };
  }
  logForDebugging(
    `[spellcheck] no checker found on PATH (looked for ${D.join(", ")}); spell checking stays off`,
  );
  return null;
}
//@ chunk-18hwfzwa.js:865735-865784 placement
var spellCheckerByHost = new HostScoped(() => ({
  key: undefined,
  checker: undefined,
}));
//@ chunk-18hwfzwa.js:865784-865960 placement
/**
 * 按程序与语言复用或新建拼写检查器。
 */
function getSpellChecker(host, checker, dictLanguage) {
  let L = spellCheckerByHost.of(host);
  let ee = `${checker}:${dictLanguage ?? ""}`;
  if (L.checker && L.key === ee) return L.checker;
  L.checker?.dispose();
  L.key = ee;
  L.checker = new SpellChecker(() => findSpellChecker(checker, dictLanguage));
  return L.checker;
}
//@ chunk-18hwfzwa.js:865960-866043 placement
function disposeSpellChecker(host) {
  let x = spellCheckerByHost.of(host);
  x.checker?.dispose();
  x.key = undefined;
  x.checker = undefined;
}
//@ chunk-18hwfzwa.js:866043-866194 placement
/**
 * 拼写检查器的时间与大小常量。
 */
var RESPONSE_TIMEOUT_MS = 3000;
var RESOLVE_TIMEOUT_MS = 15000;
var RETRY_DELAY_MS = 1000;
var MAX_CHECKER_RESTARTS = 1;
var MAX_TIMEOUTS_BEFORE_ABANDON = 3;
var MAX_WORDS_PER_BACKEND = {
  aspell: 256,
  hunspell: 16,
  ispell: 256,
};
var MAX_WORD_CHARS = 128;
var WHITESPACE_OR_CONTROL_RE = /[\s\p{Cc}]/u;
var RESET_COUNTERS_EVERY_RESPONSES = 20;
var MAX_REQUEST_BYTES = 4096;
var MAX_OUTPUT_LINE_CHARS = 65536;
var MAX_CACHED_VERDICTS = 1e4;
var MAX_LOGGED_LINE_CHARS = 80;
//@ chunk-18hwfzwa.js:866194-871660 placement
/**
 * 拼写检查器：在 PATH 中找 aspell/hunspell/ispell，以 -a 管道模式常驻子进程查询单词，带响应超时与状态机（resolving/starting/ready/unavailable）。
 */
class SpellChecker {
  changed = createSignal();
  #e = this.#b();
  #t = {
    status: "idle",
  };
  #o = false;
  #n = 0;
  #s = 0;
  #r = 0;
  #c = false;
  #i = false;
  #a = "";
  #l = new Map();
  #d = new Set();
  #m = null;
  #p = new Set();
  #u = "";
  #f = undefined;
  #S = undefined;
  #h;
  #y;
  constructor(h, x = {}) {
    this.#h = h;
    this.#y = x.responseTimeoutMs ?? RESOLVE_TIMEOUT_MS;
  }
  get verdicts() {
    return this.#e;
  }
  isMisspelled(h) {
    return this.#l.get(h);
  }
  #b() {
    return {
      isMisspelled: (h) => this.#l.get(h),
    };
  }
  request(h) {
    if (this.#o || this.#t.status === "unavailable") return;
    for (let x of h)
      if (
        !this.#l.has(x) &&
        !this.#m?.has(x) &&
        x.length > 0 &&
        x.length <= MAX_WORD_CHARS &&
        !WHITESPACE_OR_CONTROL_RE.test(x)
      )
        this.#d.add(x);
    this.#g();
  }
  dispose() {
    if (this.#o) return;
    this.#o = true;
    this.#P();
    this.#d.clear();
    this.changed.clear();
  }
  #g() {
    this.#v().catch((error) => {
      logError(error);
      this.#_(`internal error: ${errorMessage(error)}`, "internal_error");
    });
  }
  async #v() {
    if (this.#o || this.#c || this.#d.size === 0 || this.#m) return;
    switch (this.#t.status) {
      case "unavailable":
      case "resolving":
      case "starting":
        return;
      case "idle":
        await this.#C();
        return;
      case "ready":
        break;
    }
    let h = MAX_WORDS_PER_BACKEND[this.#t.backend];
    let x = [];
    let D = 2;
    for (let L of this.#d) {
      let ee = Buffer.byteLength(L) + 1;
      if (x.length >= h || D + ee > MAX_REQUEST_BYTES) break;
      x.push(L);
      D += ee;
    }
    for (let L of x) this.#d.delete(L);
    this.#m = new Set(x);
    this.#p.clear();
    this.#M(this.#y, "response timeout");
    this.#t.process.stdin?.write(buildWordQueryLine(x));
  }
  async #C() {
    this.#t = {
      status: "resolving",
    };
    let h;
    let x = false;
    try {
      h = await this.#h();
    } catch (error) {
      logForDebugging(
        `[spellcheck] could not look for a checker: ${errorMessage(error)}; spell checking stays off`,
        {
          level: "warn",
        },
      );
      h = null;
      x = true;
    }
    if (this.#o || this.#t.status !== "resolving") return;
    if (!h) {
      logFeatureSad("input_spellcheck", x ? "checker_lookup_failed" : "checker_not_found");
      this.#t = {
        status: "unavailable",
      };
      this.#d.clear();
      return;
    }
    let D;
    try {
      logForDebugging(`[spellcheck] starting ${h.command} ${h.args.join(" ")}`);
      D = safeSpawn(h.command, h.args, {
        stdio: ["pipe", "pipe", "pipe"],
        env: subprocessEnv(),
        extendEnv: false,
        cwd: homedir(),
        windowsHide: true,
        toolCgroupClass: "plugin",
      });
    } catch (error) {
      this.#t = {
        status: "idle",
      };
      this.#_(`spawn failed: ${errorMessage(error)}`, "checker_failed_to_start");
      return;
    }
    this.#t = {
      status: "starting",
      process: D,
    };
    this.#S = registerCleanup(() => this.dispose());
    D.unref();
    for (let L of [D.stdin, D.stdout, D.stderr]) unrefHandle(L);
    D.stdout?.setEncoding("utf8");
    D.stdout?.on("data", (L) => {
      if (this.#w(D)) this.#T(L);
    });
    D.stderr?.setEncoding("utf8");
    D.stderr?.on("data", (L) => {
      let trimmed = L.trim();
      if (trimmed) {
        this.#a = truncateToLength(trimmed, 200);
        logForDebugging(`[spellcheck] stderr: ${this.#a}`);
      }
    });
    for (let L of [D.stdout, D.stderr])
      L?.on("error", (ee) => {
        if (this.#w(D)) this.#_(`stdio error: ${ee.message}`, "checker_crashed");
      });
    D.on("error", (L) => {
      if (this.#w(D)) this.#_(`process error: ${L.message}`, "checker_crashed");
    });
    D.stdin?.on("error", (L) => {
      if (this.#w(D)) this.#_(`stdin error: ${L.message}`, "checker_crashed");
    });
    D.on("exit", (L, ee) => {
      if (this.#w(D)) {
        let ke = this.#i
          ? ""
          : `; last stderr: ${this.#a || "none"} (a missing dictionary usually means spellcheck.language needs setting)`;
        this.#_(
          `checker exited (code ${L}, signal ${ee})${ke}`,
          this.#i ? "checker_crashed" : "checker_failed_to_start",
        );
      }
    });
    this.#M(RESPONSE_TIMEOUT_MS, "banner timeout");
  }
  #w(h) {
    return (this.#t.status === "starting" || this.#t.status === "ready") && this.#t.process === h;
  }
  #T(h) {
    this.#u += h;
    let index = this.#u.indexOf(`
`);
    while (index !== -1) {
      let D = stripSuffix(this.#u.slice(0, index), "\r");
      this.#u = this.#u.slice(index + 1);
      this.#x(D);
      if (this.#t.status !== "starting" && this.#t.status !== "ready") return;
      index = this.#u.indexOf(`
`);
    }
    if (this.#u.length > MAX_OUTPUT_LINE_CHARS) {
      this.#_("output line too long", "checker_protocol_error");
      return;
    }
    if (this.#t.status === "ready" && !this.#m) this.#g();
  }
  #x(h) {
    if (this.#t.status === "starting") {
      let spellCheckerFlavor = detectSpellCheckerFlavor(h);
      if (!spellCheckerFlavor) {
        this.#_(
          `unexpected banner: ${truncateToLength(h, MAX_LOGGED_LINE_CHARS)}`,
          "checker_failed_to_start",
        );
        return;
      }
      clearTimeout(this.#f);
      this.#t = {
        status: "ready",
        process: this.#t.process,
        backend: spellCheckerFlavor,
      };
      this.#t.process.stdin?.write(ISPELL_SESSION_END_MARKER);
      if (!this.#i) {
        this.#i = true;
        logFeatureOk("input_spellcheck", {
          backend: fromEnum(spellCheckerFlavor),
        });
      }
      logForDebugging(`[spellcheck] ${spellCheckerFlavor} ready`);
      return;
    }
    if (!this.#m) {
      this.#_(`unexpected output: ${truncateToLength(h, MAX_LOGGED_LINE_CHARS)}`, "checker_protocol_error");
      return;
    }
    let ispellLine = parseIspellLine(h);
    switch (ispellLine.type) {
      case "correct":
        return;
      case "misspelled":
        this.#p.add(ispellLine.word);
        return;
      case "unrecognized":
        this.#_(
          `unrecognized output: ${truncateToLength(h, MAX_LOGGED_LINE_CHARS)}`,
          "checker_protocol_error",
        );
        return;
      case "end": {
        if (this.#u !== "") {
          this.#_("output past the end of a response", "checker_protocol_error");
          return;
        }
        clearTimeout(this.#f);
        this.#k(this.#m, this.#p);
        this.#m = null;
        this.#p.clear();
        this.#r++;
        if (this.#r >= RESET_COUNTERS_EVERY_RESPONSES) {
          this.#r = 0;
          this.#n = 0;
          this.#s = 0;
        }
        this.#g();
        return;
      }
    }
  }
  #k(h, x) {
    if (this.#l.size + h.size > MAX_CACHED_VERDICTS) {
      let D = Math.ceil(this.#l.size / 2);
      for (let key of this.#l.keys()) {
        if (D-- <= 0) break;
        this.#l.delete(key);
      }
    }
    for (let D of h) this.#l.set(D, x.has(D));
    this.#e = this.#b();
    this.changed.emit();
  }
  #M(h, x) {
    clearTimeout(this.#f);
    this.#f = setTimeout((D) => this.#R(D), h, x);
    this.#f.unref?.();
  }
  #R(h) {
    if (this.#t.status !== "ready" || !this.#m) {
      this.#_(h, "checker_failed_to_start");
      return;
    }
    this.#s++;
    this.#r = 0;
    logForDebugging(
      `[spellcheck] no answer for ${this.#m.size} words within ${this.#y}ms; skipping them (${this.#s}/${MAX_TIMEOUTS_BEFORE_ABANDON})`,
      {
        level: "warn",
      },
    );
    let x = this.#m;
    let D = new Set(this.#p);
    this.#m = null;
    this.#p.clear();
    this.#k(x, D);
    if (this.#s >= MAX_TIMEOUTS_BEFORE_ABANDON) {
      this.#A(h, "checker_too_slow");
      return;
    }
    this.#P();
    this.#g();
  }
  #P() {
    clearTimeout(this.#f);
    this.#c = false;
    this.#S?.();
    this.#S = undefined;
    let h = this.#t;
    this.#t = {
      status: "idle",
    };
    this.#u = "";
    if (this.#m) {
      for (let x of this.#m) this.#d.add(x);
      this.#m = null;
      this.#p.clear();
    }
    if (h.status === "starting" || h.status === "ready") stopChildProcess(h.process);
  }
  #_(h, x) {
    if (this.#o || this.#t.status === "unavailable") return;
    this.#P();
    this.#r = 0;
    if (this.#n < MAX_CHECKER_RESTARTS) {
      this.#n++;
      logForDebugging(`[spellcheck] ${h}; restarting once`, {
        level: "warn",
      });
      this.#c = true;
      this.#f = setTimeout(() => {
        this.#c = false;
        this.#g();
      }, RETRY_DELAY_MS);
      this.#f.unref?.();
      return;
    }
    this.#A(h, x);
  }
  #A(h, x) {
    logForDebugging(`[spellcheck] ${h}; spell checking is off for this session`, {
      level: "warn",
    });
    logFeatureBad("input_spellcheck", x);
    this.#P();
    this.#t = {
      status: "unavailable",
    };
    this.#d.clear();
  }
}
//@ chunk-18hwfzwa.js:871660-871761 placement
/**
 * 对可 unref 的对象调用 unref。
 */
function unrefHandle(h) {
  if (typeof h === "object" && h !== null && "unref" in h && typeof h.unref === "function") h.unref();
}
//@ chunk-18hwfzwa.js:871761-871872 placement
/**
 * 关闭子进程 stdin，仍在运行时 kill。
 */
function stopChildProcess(h) {
  h.stdin?.end();
  if (typeof h.exitCode === "number" || typeof h.signalCode === "string") return;
  h.kill();
}
export {
  themeColorOf,
  SPELLCHECK_PROGRAMS,
  isValidLanguageTag,
  getSpellChecker,
  disposeSpellChecker,
  booleanishSchema,
  coerceBooleanString,
  enabledSettingsFeatureGroups,
  buildPermissionModesForGroups,
  buildSettingsShapeForGroups,
};
