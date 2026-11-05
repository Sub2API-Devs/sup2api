/**
 * utils/spellcheck.ts
 *
 * 2.1.316 新增。拼写检查。
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * new in 2.1.318 (2.1.88 has no file at this path)
 * pieces: chunk-czq1j3j2.js (8), chunk-z20c443b.js (14)
 * attribution: placement 22
 */
import { homedir } from "os";
import { getModeConfig } from "./permissions/PermissionMode.js";
import {
  booleanSchema,
  preprocess,
  objectSchema,
  array,
  stringSchema,
  _enum,
  literal,
} from "../../vendor/zod/v4/classic/schemas.js";
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
import { logEvent } from "../services/analytics/index.js";
import { env } from "./env.js";
import { logError } from "./log.js";
import { logFeatureSad, logFeatureBad, logFeatureOk } from "../services/analytics/featureTelemetry.js";
import {
  errorMessage,
  TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS,
  getErrnoCode,
} from "./errors.js";
import { DoctorLazy } from "../cli/handlers/util.js";
import { useMemoCache } from "../../vendor/react/compiler-runtime.js";
import { useState, useEffect, useRef } from "../../vendor/react/cjs/react.production.js";
import { getPlatform } from "./platform.js";
import { getFeatureValue_CACHED_MAY_BE_STALE } from "../services/analytics/growthbook.js";
import { jsonStringify } from "./slowOperations.js";
import { safeSpawn } from "./safeSpawn.js";
import { subprocessEnv } from "./subprocessEnv.js";
import { registerCleanup } from "./cleanupRegistry.js";
import { MEMO_CACHE_SENTINEL } from "../../runtime/bun-runtime.js";
import { truncateToLength, stripSuffix, plural } from "./stringUtils.js";
import { deferInit } from "../../runtime/deferred-init.js";

//@ chunk-z20c443b.js:203485-203519 placement
/**
 * 取主题颜色。
 */
function themeColorOf(theme) {
  return getModeConfig(theme).color;
}
//@ chunk-z20c443b.js:203519-203554 placement
/**
 * 接受 true/false 字符串的布尔 schema。
 */
function booleanishSchema(schema = booleanSchema()) {
  return preprocess(coerceBooleanString, schema);
}
//@ chunk-z20c443b.js:203554-203607 placement
/**
 * 把 true/false 字符串转为布尔。
 */
function coerceBooleanString(value) {
  return value === "true" ? true : value === "false" ? false : value;
}
//@ chunk-z20c443b.js:203607-203692 placement
/**
 * 拼写检查程序列表与词格式。
 */
var SPELLCHECK_PROGRAMS = ["aspell", "hunspell", "ispell"];
var ISPELL_SESSION_END_MARKER = `!
`;
var SPELLCHECK_LANG_RE = /^[A-Za-z][A-Za-z0-9_.,-]{0,63}$/;
//@ chunk-z20c443b.js:203692-203726 placement
/**
 * 语言标识是否合法（字母开头、允许 . , _ -）。
 */
function isValidLanguageTag(tag) {
  return SPELLCHECK_LANG_RE.test(tag);
}
//@ chunk-z20c443b.js:203726-203978 placement
/**
 * 拼写检查程序的管道模式参数。
 */
function spellCheckerArgs(program, language) {
  let lang = language !== undefined && isValidLanguageTag(language) ? language : undefined;
  switch (program) {
    case "aspell":
      return ["-a", "--encoding=utf-8", "--sug-mode=ultra", ...(lang ? [`--lang=${lang}`] : [])];
    case "hunspell":
      return ["-a", "-i", "utf-8", ...(lang ? ["-d", lang] : [])];
    case "ispell":
      return ["-a", ...(lang ? ["-d", lang] : [])];
  }
}
//@ chunk-z20c443b.js:203978-204165 placement
/**
 * 从 ispell 版本行判断实际是 aspell/hunspell/ispell。
 */
function detectSpellCheckerFlavor(banner) {
  if (!banner.startsWith("@(#) International Ispell")) return null;
  if (/but really Aspell/i.test(banner)) return "aspell";
  if (/but really Hunspell/i.test(banner)) return "hunspell";
  return "ispell";
}
//@ chunk-z20c443b.js:204165-204206 placement
/**
 * 生成向 ispell 管道查询的 `^word …` 行。
 */
function buildWordQueryLine(words) {
  return `^${words.join(" ")}
`;
}
//@ chunk-z20c443b.js:204206-204562 placement
/**
 * 解析 ispell 管道输出行。
 */
function parseIspellLine(line) {
  if (line === "")
    return {
      type: "end",
    };
  switch (line[0]) {
    case "*":
    case "+":
    case "-":
      return {
        type: "correct",
      };
    case "&":
    case "?": {
      let match = /^[&?] (\S+) \d+ \d+:/.exec(line);
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
      let match = /^# (\S+) \d+/.exec(line);
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
//@ chunk-z20c443b.js:204562-204628 placement
var SETTINGS_FEATURE_ORDER = ["autoMode", "deepLink", "voice", "briefView", "screenReader"];
//@ chunk-z20c443b.js:204628-206943 placement
/**
 * 按特性分组的设置 schema（构建开关、形状）。
 */
var SETTINGS_FEATURE_GROUPS = {
  autoMode: {
    buildGate: () => true,
    shape: () => ({
      skipAutoPermissionPrompt: booleanSchema()
        .optional()
        .describe("Whether the user has accepted the auto mode opt-in dialog"),
      useAutoModeDuringPlan: booleanSchema()
        .optional()
        .describe("Whether plan mode uses auto mode semantics when auto mode is available (default: true)"),
      autoMode: objectSchema({
        allow: array(stringSchema())
          .optional()
          .describe(
            'Rules for the auto mode classifier allow section. Include the literal string "$defaults" to inherit the built-in rules at that position.',
          ),
        soft_deny: array(stringSchema())
          .optional()
          .describe(
            'Rules for the auto mode classifier SOFT BLOCK section \u2014 destructive/irreversible actions that user intent can clear. Include the literal string "$defaults" to inherit the built-in rules at that position.',
          ),
        hard_deny: array(stringSchema())
          .optional()
          .describe(
            'Rules for the auto mode classifier HARD BLOCK section \u2014 security boundaries that user intent does NOT clear. Include the literal string "$defaults" to inherit the built-in rules at that position.',
          ),
        ...false,
        ...{},
        environment: array(stringSchema())
          .optional()
          .describe(
            'Entries for the auto mode classifier environment section. Include the literal string "$defaults" to inherit the built-in entries at that position.',
          ),
        classifyAllShell: booleanSchema()
          .optional()
          .describe(
            "When true, every Bash/PowerShell allow rule is suspended while auto mode is active so all shell commands are routed through the classifier (higher safety, more classifier calls). Default: false.",
          ),
      })
        .optional()
        .describe("Auto mode classifier prompt customization"),
    }),
    permissionModes: () => PERMISSION_MODES.filter((mode) => !EXTERNAL_PERMISSION_MODES.includes(mode)),
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
      voiceEnabled: booleanSchema().optional().describe("Enable voice mode (hold-to-talk dictation)"),
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
      axScreenReader: booleanSchema()
        .optional()
        .describe(
          "Render screen-reader friendly output (flat text, no decorative borders or animations). Overridden by the CLAUDE_AX_SCREEN_READER env var and the --ax-screen-reader CLI flag. Ignored in project and local settings.",
        ),
    }),
  },
};
//@ chunk-z20c443b.js:206943-206999 placement
/**
 * 返回构建开关打开的设置特性组名。
 */
function enabledSettingsFeatureGroups() {
  return SETTINGS_FEATURE_ORDER.filter((group) => SETTINGS_FEATURE_GROUPS[group].buildGate());
}
//@ chunk-z20c443b.js:206999-207073 placement
function buildSettingsShapeForGroups(groups) {
  let shape = {};
  for (let group of groups)
    shape = {
      ...shape,
      ...SETTINGS_FEATURE_GROUPS[group].shape(),
    };
  return shape;
}
//@ chunk-z20c443b.js:207073-207162 placement
function buildPermissionModesForGroups(groups) {
  let modes = [];
  for (let group of groups) modes.push(...(SETTINGS_FEATURE_GROUPS[group].permissionModes?.() ?? []));
  return modes;
}
//@ chunk-czq1j3j2.js:898231-898619 placement
async function findSpellChecker(program, language) {
  let programsToTry =
    program !== "auto" && SPELLCHECK_PROGRAMS.includes(program) ? [program] : SPELLCHECK_PROGRAMS;
  if (language !== undefined && !isValidLanguageTag(language))
    logForDebugging(
      `[spellcheck] ignoring language "${language}" (not a plain dictionary name); the checker's default dictionary applies`,
    );
  for (let candidate of programsToTry) {
    let command = await whichAsync(candidate);
    if (command)
      return {
        command,
        args: spellCheckerArgs(candidate, language),
      };
  }
  logForDebugging(
    `[spellcheck] no checker found on PATH (looked for ${programsToTry.join(", ")}); spell checking stays off`,
  );
  return null;
}
//@ chunk-czq1j3j2.js:898619-898668 placement
var spellCheckerByHost; // deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
deferInit("chunk-czq1j3j2.js:898619", () => {
  spellCheckerByHost = new HostScoped(() => ({
    key: undefined,
    checker: undefined,
  }));
});
//@ chunk-czq1j3j2.js:898668-898844 placement
/**
 * 按程序与语言复用或新建拼写检查器。
 */
function getSpellChecker(host, program, language) {
  let slot = spellCheckerByHost.of(host);
  let key = `${program}:${language ?? ""}`;
  if (slot.checker && slot.key === key) return slot.checker;
  slot.checker?.dispose();
  slot.key = key;
  slot.checker = new SpellChecker(() => findSpellChecker(program, language));
  return slot.checker;
}
//@ chunk-czq1j3j2.js:898844-898927 placement
function disposeSpellChecker(host) {
  let slot = spellCheckerByHost.of(host);
  slot.checker?.dispose();
  slot.key = undefined;
  slot.checker = undefined;
}
//@ chunk-czq1j3j2.js:898927-899078 placement
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
//@ chunk-czq1j3j2.js:899078-904540 placement
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
  #r = 0;
  #s = 0;
  #l = false;
  #i = false;
  #a = "";
  #c = new Map();
  #d = new Set();
  #u = null;
  #p = new Set();
  #m = "";
  #f = undefined;
  #S = undefined;
  #h;
  #y;
  constructor(resolveChecker, options = {}) {
    this.#h = resolveChecker;
    this.#y = options.responseTimeoutMs ?? RESOLVE_TIMEOUT_MS;
  }
  get verdicts() {
    return this.#e;
  }
  isMisspelled(word) {
    return this.#c.get(word);
  }
  #b() {
    return {
      isMisspelled: (word) => this.#c.get(word),
    };
  }
  request(words) {
    if (this.#o || this.#t.status === "unavailable") return;
    for (let word of words)
      if (
        !this.#c.has(word) &&
        !this.#u?.has(word) &&
        word.length > 0 &&
        word.length <= MAX_WORD_CHARS &&
        !WHITESPACE_OR_CONTROL_RE.test(word)
      )
        this.#d.add(word);
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
    if (this.#o || this.#l || this.#d.size === 0 || this.#u) return;
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
    let maxWords = MAX_WORDS_PER_BACKEND[this.#t.backend];
    let batch = [];
    let requestBytes = 2;
    for (let word of this.#d) {
      let wordBytes = Buffer.byteLength(word) + 1;
      if (batch.length >= maxWords || requestBytes + wordBytes > MAX_REQUEST_BYTES) break;
      batch.push(word);
      requestBytes += wordBytes;
    }
    for (let word of batch) this.#d.delete(word);
    this.#u = new Set(batch);
    this.#p.clear();
    this.#M(this.#y, "response timeout");
    this.#t.process.stdin?.write(buildWordQueryLine(batch));
  }
  async #C() {
    this.#t = {
      status: "resolving",
    };
    let checker;
    let lookupFailed = false;
    try {
      checker = await this.#h();
    } catch (error) {
      logForDebugging(
        `[spellcheck] could not look for a checker: ${errorMessage(error)}; spell checking stays off`,
        {
          level: "warn",
        },
      );
      checker = null;
      lookupFailed = true;
    }
    if (this.#o || this.#t.status !== "resolving") return;
    if (!checker) {
      logFeatureSad("input_spellcheck", lookupFailed ? "checker_lookup_failed" : "checker_not_found");
      this.#t = {
        status: "unavailable",
      };
      this.#d.clear();
      return;
    }
    let childProcess;
    try {
      logForDebugging(`[spellcheck] starting ${checker.command} ${checker.args.join(" ")}`);
      childProcess = safeSpawn(checker.command, checker.args, {
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
      process: childProcess,
    };
    this.#S = registerCleanup(() => this.dispose());
    childProcess.unref();
    for (let handle of [childProcess.stdin, childProcess.stdout, childProcess.stderr]) unrefHandle(handle);
    childProcess.stdout?.setEncoding("utf8");
    childProcess.stdout?.on("data", (chunk) => {
      if (this.#w(childProcess)) this.#T(chunk);
    });
    childProcess.stderr?.setEncoding("utf8");
    childProcess.stderr?.on("data", (chunk) => {
      let trimmed = chunk.trim();
      if (trimmed) {
        this.#a = truncateToLength(trimmed, 200);
        logForDebugging(`[spellcheck] stderr: ${this.#a}`);
      }
    });
    for (let stream of [childProcess.stdout, childProcess.stderr])
      stream?.on("error", (error) => {
        if (this.#w(childProcess)) this.#_(`stdio error: ${error.message}`, "checker_crashed");
      });
    childProcess.on("error", (error) => {
      if (this.#w(childProcess)) this.#_(`process error: ${error.message}`, "checker_crashed");
    });
    childProcess.stdin?.on("error", (error) => {
      if (this.#w(childProcess)) this.#_(`stdin error: ${error.message}`, "checker_crashed");
    });
    childProcess.on("exit", (exitCode, exitSignal) => {
      if (this.#w(childProcess)) {
        let stderrHint = this.#i
          ? ""
          : `; last stderr: ${this.#a || "none"} (a missing dictionary usually means spellcheck.language needs setting)`;
        this.#_(
          `checker exited (code ${exitCode}, signal ${exitSignal})${stderrHint}`,
          this.#i ? "checker_crashed" : "checker_failed_to_start",
        );
      }
    });
    this.#M(RESPONSE_TIMEOUT_MS, "banner timeout");
  }
  #w(process_2) {
    return (this.#t.status === "starting" || this.#t.status === "ready") && this.#t.process === process_2;
  }
  #T(chunk) {
    this.#m += chunk;
    let index = this.#m.indexOf(`
`);
    while (index !== -1) {
      let line = stripSuffix(this.#m.slice(0, index), "\r");
      this.#m = this.#m.slice(index + 1);
      this.#x(line);
      if (this.#t.status !== "starting" && this.#t.status !== "ready") return;
      index = this.#m.indexOf(`
`);
    }
    if (this.#m.length > MAX_OUTPUT_LINE_CHARS) {
      this.#_("output line too long", "checker_protocol_error");
      return;
    }
    if (this.#t.status === "ready" && !this.#u) this.#g();
  }
  #x(line) {
    if (this.#t.status === "starting") {
      let spellCheckerFlavor = detectSpellCheckerFlavor(line);
      if (!spellCheckerFlavor) {
        this.#_(
          `unexpected banner: ${truncateToLength(line, MAX_LOGGED_LINE_CHARS)}`,
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
    if (!this.#u) {
      this.#_(
        `unexpected output: ${truncateToLength(line, MAX_LOGGED_LINE_CHARS)}`,
        "checker_protocol_error",
      );
      return;
    }
    let ispellLine = parseIspellLine(line);
    switch (ispellLine.type) {
      case "correct":
        return;
      case "misspelled":
        this.#p.add(ispellLine.word);
        return;
      case "unrecognized":
        this.#_(
          `unrecognized output: ${truncateToLength(line, MAX_LOGGED_LINE_CHARS)}`,
          "checker_protocol_error",
        );
        return;
      case "end": {
        if (this.#m !== "") {
          this.#_("output past the end of a response", "checker_protocol_error");
          return;
        }
        clearTimeout(this.#f);
        this.#k(this.#u, this.#p);
        this.#u = null;
        this.#p.clear();
        this.#s++;
        if (this.#s >= RESET_COUNTERS_EVERY_RESPONSES) {
          this.#s = 0;
          this.#n = 0;
          this.#r = 0;
        }
        this.#g();
        return;
      }
    }
  }
  #k(words, verdicts) {
    if (this.#c.size + words.size > MAX_CACHED_VERDICTS) {
      let remainingToDrop = Math.ceil(this.#c.size / 2);
      for (let key of this.#c.keys()) {
        if (remainingToDrop-- <= 0) break;
        this.#c.delete(key);
      }
    }
    for (let word of words) this.#c.set(word, verdicts.has(word));
    this.#e = this.#b();
    this.changed.emit();
  }
  #M(timeoutMs, reason) {
    clearTimeout(this.#f);
    this.#f = setTimeout((reason) => this.#R(reason), timeoutMs, reason);
    this.#f.unref?.();
  }
  #R(reason) {
    if (this.#t.status !== "ready" || !this.#u) {
      this.#_(reason, "checker_failed_to_start");
      return;
    }
    this.#r++;
    this.#s = 0;
    logForDebugging(
      `[spellcheck] no answer for ${this.#u.size} words within ${this.#y}ms; skipping them (${this.#r}/${MAX_TIMEOUTS_BEFORE_ABANDON})`,
      {
        level: "warn",
      },
    );
    let pendingWords = this.#u;
    let validWords = new Set(this.#p);
    this.#u = null;
    this.#p.clear();
    this.#k(pendingWords, validWords);
    if (this.#r >= MAX_TIMEOUTS_BEFORE_ABANDON) {
      this.#A(reason, "checker_too_slow");
      return;
    }
    this.#P();
    this.#g();
  }
  #P() {
    clearTimeout(this.#f);
    this.#l = false;
    this.#S?.();
    this.#S = undefined;
    let previousState = this.#t;
    this.#t = {
      status: "idle",
    };
    this.#m = "";
    if (this.#u) {
      for (let word of this.#u) this.#d.add(word);
      this.#u = null;
      this.#p.clear();
    }
    if (previousState.status === "starting" || previousState.status === "ready")
      stopChildProcess(previousState.process);
  }
  #_(message, featureReason) {
    if (this.#o || this.#t.status === "unavailable") return;
    this.#P();
    this.#s = 0;
    if (this.#n < MAX_CHECKER_RESTARTS) {
      this.#n++;
      logForDebugging(`[spellcheck] ${message}; restarting once`, {
        level: "warn",
      });
      this.#l = true;
      this.#f = setTimeout(() => {
        this.#l = false;
        this.#g();
      }, RETRY_DELAY_MS);
      this.#f.unref?.();
      return;
    }
    this.#A(message, featureReason);
  }
  #A(message, featureReason) {
    logForDebugging(`[spellcheck] ${message}; spell checking is off for this session`, {
      level: "warn",
    });
    logFeatureBad("input_spellcheck", featureReason);
    this.#P();
    this.#t = {
      status: "unavailable",
    };
    this.#d.clear();
  }
}
//@ chunk-czq1j3j2.js:904540-904641 placement
/**
 * 对可 unref 的对象调用 unref。
 */
function unrefHandle(handle) {
  if (
    typeof handle === "object" &&
    handle !== null &&
    "unref" in handle &&
    typeof handle.unref === "function"
  )
    handle.unref();
}
//@ chunk-czq1j3j2.js:904641-904752 placement
/**
 * 关闭子进程 stdin，仍在运行时 kill。
 */
function stopChildProcess(childProcess) {
  childProcess.stdin?.end();
  if (typeof childProcess.exitCode === "number" || typeof childProcess.signalCode === "string") return;
  childProcess.kill();
}
export {
  themeColorOf,
  enabledSettingsFeatureGroups,
  coerceBooleanString,
  booleanishSchema,
  SPELLCHECK_PROGRAMS,
  isValidLanguageTag,
  getSpellChecker,
  disposeSpellChecker,
  buildPermissionModesForGroups,
  buildSettingsShapeForGroups,
};
