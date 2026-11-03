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
import { homedir, homedir as homedir_2, homedir as homedir_3 } from "os";
import { getModeConfig } from "./permissions/PermissionMode.js";
import { M, Ka, u, A, o, U, T } from "../../vendor/zod/v4/classic/schemas.js";
import { PERMISSION_MODES, EXTERNAL_PERMISSION_MODES } from "../types/permissions.js";
import { logForDebugging } from "./debug.js";
import { whichAsync } from "./which.js";
import { HostScoped } from "./hostScoped.js";
import { createSignal } from "./signal.js";
import { e, r } from "../../vendor/react/cjs/react-jsx-dev-runtime.react-server.production.js";
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

/**
 * 取主题颜色。
 */
//@ chunk-dcmhvw5a.js:209359-209393 placement
function themeColorOf(e) {
  return getModeConfig(e).color;
}
/**
 * 接受 true/false 字符串的布尔 schema。
 */
//@ chunk-dcmhvw5a.js:209393-209428 placement
function booleanishSchema(e = M()) {
  return Ka(coerceBooleanString, e);
}
/**
 * 把 true/false 字符串转为布尔。
 */
//@ chunk-dcmhvw5a.js:209428-209481 placement
function coerceBooleanString(e) {
  return e === "true" ? !0 : e === "false" ? !1 : e;
}
/**
 * 拼写检查程序列表与词格式。
 */
//@ chunk-dcmhvw5a.js:209481-209566 placement
var SPELLCHECK_PROGRAMS = ["aspell", "hunspell", "ispell"],
  oPi = `!
`,
  Wb = /^[A-Za-z][A-Za-z0-9_.,-]{0,63}$/;
//@ chunk-dcmhvw5a.js:209566-209600 placement
function B_r(e) {
  return Wb.test(e);
}
/**
 * 拼写检查程序的管道模式参数。
 */
//@ chunk-dcmhvw5a.js:209600-209852 placement
function spellCheckerArgs(e, n) {
  let r = n !== void 0 && B_r(n) ? n : void 0;
  switch (e) {
    case "aspell":
      return ["-a", "--encoding=utf-8", "--sug-mode=ultra", ...(r ? [`--lang=${r}`] : [])];
    case "hunspell":
      return ["-a", "-i", "utf-8", ...(r ? ["-d", r] : [])];
    case "ispell":
      return ["-a", ...(r ? ["-d", r] : [])];
  }
}
/**
 * 从 ispell 版本行判断实际是 aspell/hunspell/ispell。
 */
//@ chunk-dcmhvw5a.js:209852-210039 placement
function detectSpellCheckerFlavor(e) {
  if (!e.startsWith("@(#) International Ispell")) return null;
  if (/but really Aspell/i.test(e)) return "aspell";
  if (/but really Hunspell/i.test(e)) return "hunspell";
  return "ispell";
}
//@ chunk-dcmhvw5a.js:210039-210080 placement
function aPi(e) {
  return `^${e.join(" ")}
`;
}
/**
 * 解析 ispell 管道输出行。
 */
//@ chunk-dcmhvw5a.js:210080-210436 placement
function parseIspellLine(e) {
  if (e === "") return { type: "end" };
  switch (e[0]) {
    case "*":
    case "+":
    case "-":
      return { type: "correct" };
    case "&":
    case "?": {
      let match = /^[&?] (\S+) \d+ \d+:/.exec(e);
      return match ? { type: "misspelled", word: match[1] } : { type: "unrecognized" };
    }
    case "#": {
      let match = /^# (\S+) \d+/.exec(e);
      return match ? { type: "misspelled", word: match[1] } : { type: "unrecognized" };
    }
    default:
      return { type: "unrecognized" };
  }
}
//@ chunk-dcmhvw5a.js:210436-210502 placement
var Vb = ["autoMode", "deepLink", "voice", "briefView", "screenReader"];
/**
 * 按特性分组的设置 schema（构建开关、形状）。
 */
//@ chunk-dcmhvw5a.js:210502-212817 placement
var SETTINGS_FEATURE_GROUPS = {
  autoMode: {
    buildGate: () => !0,
    shape: () => ({
      skipAutoPermissionPrompt: M()
        .optional()
        .describe("Whether the user has accepted the auto mode opt-in dialog"),
      useAutoModeDuringPlan: M()
        .optional()
        .describe("Whether plan mode uses auto mode semantics when auto mode is available (default: true)"),
      autoMode: u({
        allow: A(o())
          .optional()
          .describe(
            'Rules for the auto mode classifier allow section. Include the literal string "$defaults" to inherit the built-in rules at that position.',
          ),
        soft_deny: A(o())
          .optional()
          .describe(
            'Rules for the auto mode classifier SOFT BLOCK section \u2014 destructive/irreversible actions that user intent can clear. Include the literal string "$defaults" to inherit the built-in rules at that position.',
          ),
        hard_deny: A(o())
          .optional()
          .describe(
            'Rules for the auto mode classifier HARD BLOCK section \u2014 security boundaries that user intent does NOT clear. Include the literal string "$defaults" to inherit the built-in rules at that position.',
          ),
        ...!1,
        ...{},
        environment: A(o())
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
    buildGate: () => !0,
    shape: () => ({
      disableDeepLinkRegistration: U(["disable"])
        .optional()
        .describe("Prevent claude-cli:// protocol handler registration with the OS"),
    }),
  },
  voice: {
    buildGate: () => !0,
    shape: () => ({ voiceEnabled: M().optional().describe("Enable voice mode (hold-to-talk dictation)") }),
  },
  briefView: {
    buildGate: () => !0,
    shape: () => ({
      defaultView: U(["chat", "transcript"])
        .optional()
        .describe("Default transcript view: chat (SendUserMessage checkpoints only) or transcript (full)"),
    }),
  },
  screenReader: {
    buildGate: () => !0,
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
function LOt() {
  return Vb.filter((e) => SETTINGS_FEATURE_GROUPS[e].buildGate());
}
//@ chunk-dcmhvw5a.js:212873-212947 placement
function pc(e) {
  let n = {};
  for (let r of e) n = { ...n, ...SETTINGS_FEATURE_GROUPS[r].shape() };
  return n;
}
//@ chunk-dcmhvw5a.js:212947-213036 placement
function ts(e) {
  let n = [];
  for (let r of e) n.push(...(SETTINGS_FEATURE_GROUPS[r].permissionModes?.() ?? []));
  return n;
}
//@ chunk-18hwfzwa.js:865347-865735 placement
async function findSpellChecker(h, x) {
  let D = h !== "auto" && SPELLCHECK_PROGRAMS.includes(h) ? [h] : SPELLCHECK_PROGRAMS;
  if (x !== void 0 && !B_r(x))
    logForDebugging(
      `[spellcheck] ignoring language "${x}" (not a plain dictionary name); the checker's default dictionary applies`,
    );
  for (let L of D) {
    let ee = await whichAsync(L);
    if (ee) return { command: ee, args: spellCheckerArgs(L, x) };
  }
  return (
    logForDebugging(
      `[spellcheck] no checker found on PATH (looked for ${D.join(", ")}); spell checking stays off`,
    ),
    null
  );
}
//@ chunk-18hwfzwa.js:865735-865784 placement
var z3e = new HostScoped(() => ({ key: void 0, checker: void 0 }));
/**
 * 按程序与语言复用或新建拼写检查器。
 */
//@ chunk-18hwfzwa.js:865784-865960 placement
function getSpellChecker(h, x, D) {
  let of = z3e.of(h),
    ee = `${x}:${D ?? ""}`;
  if (of.checker && of.key === ee) return of.checker;
  return (
    of.checker?.dispose(),
    (of.key = ee),
    (of.checker = new SpellChecker(() => findSpellChecker(x, D))),
    of.checker
  );
}
//@ chunk-18hwfzwa.js:865960-866043 placement
function Y3e(h) {
  let of = z3e.of(h);
  (of.checker?.dispose(), (of.key = void 0), (of.checker = void 0));
}
/**
 * 拼写检查器的时间与大小常量。
 */
//@ chunk-18hwfzwa.js:866043-866194 placement
var RESPONSE_TIMEOUT_MS = 3000,
  wno = 15000,
  kno = 1000,
  vno = 1,
  Q3e = 3,
  Cno = { aspell: 256, hunspell: 16, ispell: 256 },
  _no = 128,
  Tno = /[\s\p{Cc}]/u,
  Rno = 20,
  xno = 4096,
  Pno = 65536,
  Ano = 1e4,
  Nye = 80;
/**
 * 拼写检查器：在 PATH 中找 aspell/hunspell/ispell，以 -a 管道模式常驻子进程查询单词，带响应超时与状态机（resolving/starting/ready/unavailable）。
 */
//@ chunk-18hwfzwa.js:866194-871660 placement
class SpellChecker {
  changed = createSignal();
  #e = this.#b();
  #t = { status: "idle" };
  #o = !1;
  #n = 0;
  #s = 0;
  #r = 0;
  #c = !1;
  #i = !1;
  #a = "";
  #l = new Map();
  #d = new Set();
  #m = null;
  #p = new Set();
  #u = "";
  #f = void 0;
  #S = void 0;
  #h;
  #y;
  constructor(h, x = {}) {
    ((this.#h = h), (this.#y = x.responseTimeoutMs ?? wno));
  }
  get verdicts() {
    return this.#e;
  }
  isMisspelled(h) {
    return this.#l.get(h);
  }
  #b() {
    return { isMisspelled: (h) => this.#l.get(h) };
  }
  request(h) {
    if (this.#o || this.#t.status === "unavailable") return;
    for (let x of h)
      if (!this.#l.has(x) && !this.#m?.has(x) && x.length > 0 && x.length <= _no && !Tno.test(x))
        this.#d.add(x);
    this.#g();
  }
  dispose() {
    if (this.#o) return;
    ((this.#o = !0), this.#P(), this.#d.clear(), this.changed.clear());
  }
  #g() {
    this.#v().catch((h) => {
      (logError(h), this.#_(`internal error: ${errorMessage(h)}`, "internal_error"));
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
    let h = Cno[this.#t.backend],
      x = [],
      D = 2;
    for (let L of this.#d) {
      let ee = Buffer.byteLength(L) + 1;
      if (x.length >= h || D + ee > xno) break;
      (x.push(L), (D += ee));
    }
    for (let L of x) this.#d.delete(L);
    ((this.#m = new Set(x)),
      this.#p.clear(),
      this.#M(this.#y, "response timeout"),
      this.#t.process.stdin?.write(aPi(x)));
  }
  async #C() {
    this.#t = { status: "resolving" };
    let h,
      x = !1;
    try {
      h = await this.#h();
    } catch (error) {
      (logForDebugging(
        `[spellcheck] could not look for a checker: ${errorMessage(error)}; spell checking stays off`,
        { level: "warn" },
      ),
        (h = null),
        (x = !0));
    }
    if (this.#o || this.#t.status !== "resolving") return;
    if (!h) {
      (logFeatureSad("input_spellcheck", x ? "checker_lookup_failed" : "checker_not_found"),
        (this.#t = { status: "unavailable" }),
        this.#d.clear());
      return;
    }
    let D;
    try {
      (logForDebugging(`[spellcheck] starting ${h.command} ${h.args.join(" ")}`),
        (D = safeSpawn(h.command, h.args, {
          stdio: ["pipe", "pipe", "pipe"],
          env: subprocessEnv(),
          extendEnv: !1,
          cwd: homedir(),
          windowsHide: !0,
          toolCgroupClass: "plugin",
        })));
    } catch (error) {
      ((this.#t = { status: "idle" }),
        this.#_(`spawn failed: ${errorMessage(error)}`, "checker_failed_to_start"));
      return;
    }
    ((this.#t = { status: "starting", process: D }),
      (this.#S = registerCleanup(() => this.dispose())),
      D.unref());
    for (let L of [D.stdin, D.stdout, D.stderr]) unrefHandle(L);
    (D.stdout?.setEncoding("utf8"),
      D.stdout?.on("data", (L) => {
        if (this.#w(D)) this.#T(L);
      }),
      D.stderr?.setEncoding("utf8"),
      D.stderr?.on("data", (L) => {
        let trimmed = L.trim();
        if (trimmed)
          ((this.#a = truncateToLength(trimmed, 200)), logForDebugging(`[spellcheck] stderr: ${this.#a}`));
      }));
    for (let L of [D.stdout, D.stderr])
      L?.on("error", (ee) => {
        if (this.#w(D)) this.#_(`stdio error: ${ee.message}`, "checker_crashed");
      });
    (D.on("error", (L) => {
      if (this.#w(D)) this.#_(`process error: ${L.message}`, "checker_crashed");
    }),
      D.stdin?.on("error", (L) => {
        if (this.#w(D)) this.#_(`stdin error: ${L.message}`, "checker_crashed");
      }),
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
      }),
      this.#M(RESPONSE_TIMEOUT_MS, "banner timeout"));
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
      if (
        ((this.#u = this.#u.slice(index + 1)),
        this.#x(D),
        this.#t.status !== "starting" && this.#t.status !== "ready")
      )
        return;
      index = this.#u.indexOf(`
`);
    }
    if (this.#u.length > Pno) {
      this.#_("output line too long", "checker_protocol_error");
      return;
    }
    if (this.#t.status === "ready" && !this.#m) this.#g();
  }
  #x(h) {
    if (this.#t.status === "starting") {
      let D = detectSpellCheckerFlavor(h);
      if (!D) {
        this.#_(`unexpected banner: ${truncateToLength(h, Nye)}`, "checker_failed_to_start");
        return;
      }
      if (
        (clearTimeout(this.#f),
        (this.#t = { status: "ready", process: this.#t.process, backend: D }),
        this.#t.process.stdin?.write(oPi),
        !this.#i)
      )
        ((this.#i = !0), logFeatureOk("input_spellcheck", { backend: fromEnum(D) }));
      logForDebugging(`[spellcheck] ${D} ready`);
      return;
    }
    if (!this.#m) {
      this.#_(`unexpected output: ${truncateToLength(h, Nye)}`, "checker_protocol_error");
      return;
    }
    let x = parseIspellLine(h);
    switch (x.type) {
      case "correct":
        return;
      case "misspelled":
        this.#p.add(x.word);
        return;
      case "unrecognized":
        this.#_(`unrecognized output: ${truncateToLength(h, Nye)}`, "checker_protocol_error");
        return;
      case "end": {
        if (this.#u !== "") {
          this.#_("output past the end of a response", "checker_protocol_error");
          return;
        }
        if (
          (clearTimeout(this.#f),
          this.#k(this.#m, this.#p),
          (this.#m = null),
          this.#p.clear(),
          this.#r++,
          this.#r >= Rno)
        )
          ((this.#r = 0), (this.#n = 0), (this.#s = 0));
        this.#g();
        return;
      }
    }
  }
  #k(h, x) {
    if (this.#l.size + h.size > Ano) {
      let ceil = Math.ceil(this.#l.size / 2);
      for (let L of this.#l.keys()) {
        if (ceil-- <= 0) break;
        this.#l.delete(L);
      }
    }
    for (let D of h) this.#l.set(D, x.has(D));
    ((this.#e = this.#b()), this.changed.emit());
  }
  #M(h, x) {
    (clearTimeout(this.#f), (this.#f = setTimeout((D) => this.#R(D), h, x)), this.#f.unref?.());
  }
  #R(h) {
    if (this.#t.status !== "ready" || !this.#m) {
      this.#_(h, "checker_failed_to_start");
      return;
    }
    (this.#s++,
      (this.#r = 0),
      logForDebugging(
        `[spellcheck] no answer for ${this.#m.size} words within ${this.#y}ms; skipping them (${this.#s}/${Q3e})`,
        { level: "warn" },
      ));
    let x = this.#m,
      D = new Set(this.#p);
    if (((this.#m = null), this.#p.clear(), this.#k(x, D), this.#s >= Q3e)) {
      this.#A(h, "checker_too_slow");
      return;
    }
    (this.#P(), this.#g());
  }
  #P() {
    (clearTimeout(this.#f), (this.#c = !1), this.#S?.(), (this.#S = void 0));
    let h = this.#t;
    if (((this.#t = { status: "idle" }), (this.#u = ""), this.#m)) {
      for (let x of this.#m) this.#d.add(x);
      ((this.#m = null), this.#p.clear());
    }
    if (h.status === "starting" || h.status === "ready") stopChildProcess(h.process);
  }
  #_(h, x) {
    if (this.#o || this.#t.status === "unavailable") return;
    if ((this.#P(), (this.#r = 0), this.#n < vno)) {
      (this.#n++,
        logForDebugging(`[spellcheck] ${h}; restarting once`, { level: "warn" }),
        (this.#c = !0),
        (this.#f = setTimeout(() => {
          ((this.#c = !1), this.#g());
        }, kno)),
        this.#f.unref?.());
      return;
    }
    this.#A(h, x);
  }
  #A(h, x) {
    (logForDebugging(`[spellcheck] ${h}; spell checking is off for this session`, { level: "warn" }),
      logFeatureBad("input_spellcheck", x),
      this.#P(),
      (this.#t = { status: "unavailable" }),
      this.#d.clear());
  }
}
/**
 * 对可 unref 的对象调用 unref。
 */
//@ chunk-18hwfzwa.js:871660-871761 placement
function unrefHandle(h) {
  if (typeof h === "object" && h !== null && "unref" in h && typeof h.unref === "function") h.unref();
}
/**
 * 关闭子进程 stdin，仍在运行时 kill。
 */
//@ chunk-18hwfzwa.js:871761-871872 placement
function stopChildProcess(h) {
  if ((h.stdin?.end(), typeof h.exitCode === "number" || typeof h.signalCode === "string")) return;
  h.kill();
}

export {
  themeColorOf,
  SPELLCHECK_PROGRAMS,
  B_r,
  getSpellChecker,
  Y3e,
  booleanishSchema,
  coerceBooleanString,
  LOt,
  ts,
  pc,
};
