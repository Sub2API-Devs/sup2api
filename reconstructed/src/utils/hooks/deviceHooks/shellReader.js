/**
 * utils/hooks/deviceHooks/shellReader.ts
 *
 * 2.1.316 新增：简化 shell 读取器（分词、管道、heredoc）
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-mthxbav8.js (32)
 * attribution: placement 32
 */
import { COMMAND_WRAPPERS_2, WRAPPERS_WITH_TIMEOUT, WRAPPER_VALUE_OPTIONS } from "./vouching.js";
import { readFlagWithOverride } from "../../../services/analytics/flagOverrides.js";
import { isVersionOnlyFlag } from "../../bash/parser.js";
import { INTERPRETER_NAME_PATTERN } from "../hookCommandAnalysis.js";
import { TENGU_FEDERATED_HEARTH } from "./commandReach.js";

//@ chunk-mthxbav8.js:49944-50122 placement
function isAnchoredPath(program) {
  return (
    /^(?:\/|\$(?!\{?(?:CURDIR|PWD)\b)(?:[A-Za-z_][A-Za-z0-9_]*|\{[A-Za-z_][A-Za-z0-9_]*\})\/)/.test(
      program.text,
    ) || /^~(?:[A-Za-z_][A-Za-z0-9._-]*)?\//.test(joinLineContinuations(program.raw))
  );
}
//@ chunk-mthxbav8.js:50122-50711 placement
/**
 * 路径参数的解析规则集：哪些选项取下一个词、哪些启动器/带值选项、是否按 su 语义处理 runuser 等。
 */
var PATH_ARG_RULES = {
  anchored: isAnchoredPath,
  takesNext: (e, n) =>
    e(n) || (!n.startsWith("--") && Array.from(n).findIndex((r, s) => s > 0 && e("-" + r)) === n.length - 1),
  alsoLaunchers: new Set(["ionice", "chrt", "taskset", "xvfb-run"]),
  alsoValued: {
    sudo: new Set(["-r", "-t"]),
  },
  runuserIsSu: true,
};
var PATH_ARG_RULESET = [
  {
    anchored: (e) => e.text.startsWith("/"),
    takesNext: (e, n) => !n.includes("=") && (e(n) || (/^-[a-zA-Z]{2,}$/.test(n) && e("-" + n.at(-1)))),
    alsoLaunchers: new Set(),
    alsoValued: {},
    runuserIsSu: false,
  },
  PATH_ARG_RULES,
  {
    ...PATH_ARG_RULES,
    alsoValued: {
      ...PATH_ARG_RULES.alsoValued,
      time: new Set(["-f", "--format", "-o", "--output"]),
      strace: new Set(["-I", "-b"]),
      xargs: new Set(["-J"]),
    },
  },
  {
    ...PATH_ARG_RULES,
    stepsPastVariable: true,
  },
];
//@ chunk-mthxbav8.js:50711-50781 placement
function isLauncherCommand(e) {
  return COMMAND_WRAPPERS_2.has(e) || PATH_ARG_RULESET.some((n) => n.alsoLaunchers.has(e));
}
//@ chunk-mthxbav8.js:50781-50952 placement
function computeUserOptionFill(e) {
  let n = Array(e.length + 1).fill(false);
  for (let r = e.length - 1; r >= 0; r -= 1) {
    let text = e[r].text;
    n[r] = text !== "--" && (/^(?:-[flmpPT]*u|--user(?:=|$))/.test(text) || n[r + 1]);
  }
  return n;
}
//@ chunk-mthxbav8.js:50952-51596 placement
/**
 * shell 解析用关键字集合（then/do/else/if 等）、块结束词（fi/done/esac）、控制词、赋值词正则、命令替换嵌套上限与若干转义/续行正则。
 */
var SHELL_KEYWORDS = new Set(["then", "do", "else", "elif", "if", "while", "until", "!"]);
var SHELL_BLOCK_CLOSERS = new Set(["fi", "done", "esac", "}", "]]"]);
var TENGU_EVENTUAL_DRAGONFLY = "tengu_eventual_dragonfly";
var SHELL_CONTROL_WORDS = new Set(["time", "coproc", "function", "fi", "done", "esac"]);
var SHELL_COMPOUND_OPENERS = new Set(["coproc", "function"]);
var ASSIGNMENT_WORD_RE = /^[A-Za-z_][A-Za-z0-9_]*(?:\[[^\]]*\])?\+?=/;
var MAX_SUBSTITUTION_DEPTH = 6;
var WHITESPACE_CHARS = " \t";
var SHELL_META_CHARS = ` 	
;&|()<>`;
var IDENTIFIER_RE = /^[A-Za-z_\u0080-\uffff][A-Za-z0-9_\u0080-\uffff]*$/;
var TENGU_TRANQUIL_DUCKLING = "tengu_tranquil_duckling";
var BOT_PROTECTED_TENGU_SABLE_THIMBLE = "bot_protected_tengu_sable_thimble";
var CASE_FOLLOW_UNSUPPORTED_TEXT =
  "a case statement this check cannot follow, such as one with parentheses or the word esac inside a pattern";
var PIPE_TERMINATORS = ` 	
;`;
var Ge = String.fromCharCode(96);
var CONTINUED_LINE_RE = /(?:^|[^\\])(?:\\\\)*\\\n/;
var TRAILING_BACKSLASH_RE = /(?:^|[^\\])(?:\\\\)*\\$/;
//@ chunk-mthxbav8.js:51596-51667 placement
function skipLineContinuations(e, n) {
  let r = n;
  while (
    e[r] === "\\" &&
    e[r + 1] ===
      `
`
  )
    r += 2;
  return r;
}
//@ chunk-mthxbav8.js:51667-51911 placement
function joinLineContinuations(raw) {
  if (!raw.includes("\\\n")) return raw;
  let n = [];
  let r = 0;
  let s = -1;
  for (let u = 0; u < raw.length; u += 1) {
    let S = raw[u];
    if (S === "\\") {
      if (s === -1) s = u;
      continue;
    }
    if (
      S ===
        `
` &&
      s !== -1 &&
      (u - s) % 2 === 1
    ) {
      n.push(raw.slice(r, u - 1));
      r = u + 1;
    }
    s = -1;
  }
  n.push(raw.slice(r));
  return n.join("");
}
//@ chunk-mthxbav8.js:51911-52140 placement
function unescapeDoubleQuoted(e) {
  if (!e.includes("\\")) return e;
  let n = "";
  let r = 0;
  for (let s = 0; s < e.length; s += 1) {
    if (e[s] !== "\\") continue;
    let u = e[s + 1];
    if (
      u === "$" ||
      u === Ge ||
      u === "\\" ||
      u ===
        `
`
    ) {
      n += e.slice(r, s);
      r =
        u ===
        `
`
          ? s + 2
          : s + 1;
      s += 1;
    }
  }
  return r === 0 ? e : n + e.slice(r);
}
//@ chunk-mthxbav8.js:52140-52193 placement
var WHITESPACE_OR_PIPE_RE = /[ \t\n|]/;
var PARAMETER_EXPANSION_RE = /@P\}/;
var QUOTED_BACKSLASH_RE = /\$'[^']*\\|"[^"]*\\/;
//@ chunk-mthxbav8.js:52193-52402 placement
function parseShellCommands(e, n = {}) {
  let r = new ShellReader(
    e,
    n.make === true,
    n.quotedBackslashKept !== false,
    n.substitutionHeredocs !== false,
  );
  let s = r.tokens("eof", 0);
  let u = [];
  for (let S of [s, ...r.bodies]) splitPipeline(S, n, u);
  return {
    commands: u,
    unreadable: r.unreadable,
  };
}
//@ chunk-mthxbav8.js:52402-52507 placement
function shellComments(e, n = {}) {
  let r = new ShellReader(e, false, n.quotedBackslashKept !== false, false);
  r.tokens("eof", 0);
  return r.comments;
}
//@ chunk-mthxbav8.js:52507-52607 placement
function hasNonNewlineTokenAfter(e, n, r) {
  for (let s = n; s < r; s += 1) {
    let u = e[s];
    if (
      u?.kind !== "op" ||
      u.op !==
        `
`
    )
      return true;
  }
  return false;
}
//@ chunk-mthxbav8.js:52607-54329 placement
function splitPipeline(e, n, r) {
  let s = 0;
  let u = 0;
  let S = false;
  let w = false;
  let h = 0;
  let v = 0;
  while (s < e.length) {
    let y = e[s];
    if (S) {
      if (
        y.kind === "op" &&
        y.op ===
          `
`
      ) {
        s += 1;
        continue;
      }
      if (y.kind === "word" && y.word.text === "esac" && !y.word.quoted) {
        u -= 1;
        S = false;
        s += 1;
        continue;
      }
      while (s < e.length) {
        let P = e[s];
        if (
          (P.kind === "op" && P.op === ")") ||
          (P.kind === "word" && P.word.text === "esac" && !P.word.quoted)
        )
          break;
        s += 1;
      }
      if (e[s]?.kind === "op") s += 1;
      S = false;
      w = false;
      continue;
    }
    if (y.kind === "op") {
      if (u > 0 && /^;[;&]|^;;&$/.test(y.op)) S = true;
      if (y.op === "(" || y.op === "{") {
        v += 1;
        if (w && h === 0) h = v;
      } else if (y.op === ")" || y.op === "}") {
        if (v === h) h = 0;
        v = Math.max(0, v - 1);
      }
      if (y.op === "|" || y.op === "|&") w = true;
      else if (
        y.op !==
          `
` &&
        y.op !== "(" &&
        y.op !== "{"
      )
        w = false;
      s += 1;
      continue;
    }
    let C = [];
    let O = [];
    let x;
    while (s < e.length && e[s].kind !== "op") {
      let P = e[s];
      if (P.kind === "word") C.push(P.word);
      else if (P.kind === "redirect")
        O.push({
          op: P.op,
          target: P.word,
        });
      else if (P.kind === "heredoc" && P.body !== null) x = (x ?? "") + P.body;
      s += 1;
    }
    let piped = w || h > 0;
    w = false;
    let [j, ...M] = collectAllHeredocCommands(C, n);
    let q =
      j ??
      (O.length > 0 || x !== undefined
        ? {
            program: {
              text: ":",
              quoted: false,
              raw: ":",
            },
            args: [],
            assignments: [],
          }
        : undefined);
    if (q === undefined) continue;
    let text = q.program.text;
    if (!q.program.quoted) {
      if (text === "case") {
        u += 1;
        let P = e[s];
        if (P?.kind === "op" && P.op === ")" && q.args.some((arg) => arg.text === "in")) s += 1;
        else S = true;
        continue;
      }
      if (text === "esac") {
        u = Math.max(0, u - 1);
        if (
          (O.length === 0 && x === undefined) ||
          !readFlagWithOverride(TENGU_EVENTUAL_DRAGONFLY, {
            safe: true,
          })
        )
          continue;
      }
      if (text === "[[") {
        if (!C.some((P) => P.text === "]]" && !P.quoted)) {
          while (s < e.length) {
            let P = e[s];
            if (
              (P.kind === "word" && P.word.text === "]]") ||
              (P.kind === "op" &&
                P.op ===
                  `
`)
            )
              break;
            s += 1;
          }
          if (e[s]?.kind === "word") s += 1;
        }
        continue;
      }
      if (SHELL_BLOCK_CLOSERS.has(text)) {
        if (O.length > 0 || x !== undefined)
          r.push({
            program: {
              text: ":",
              quoted: false,
              raw: ":",
            },
            args: [],
            assignments: [],
            redirects: O,
            piped,
            ...(x !== undefined && {
              heredoc: x,
            }),
          });
        continue;
      }
    }
    for (let P of [q, ...M])
      r.push({
        ...P,
        redirects: O,
        piped,
        ...(x !== undefined && {
          heredoc: x,
        }),
      });
  }
}
//@ chunk-mthxbav8.js:54329-56016 placement
function collectHeredocBodies(e, n, r) {
  let s = [];
  let u;
  let S = false;
  let w;
  let h = 0;
  for (;;) {
    while (h < e.length) {
      let R = e[h];
      if (ASSIGNMENT_WORD_RE.test(joinLineContinuations(R.raw))) s.push(R);
      else if (!(!R.quoted && SHELL_KEYWORDS.has(R.text))) break;
      h += 1;
    }
    let v = e[h];
    if (v === undefined)
      return s.length > 0
        ? {
            program: {
              text: ":",
              quoted: false,
              raw: ":",
            },
            args: [],
            assignments: s,
          }
        : undefined;
    if (n.make && !v.quoted && /^[@+-]+./.test(v.text)) {
      let replaced = v.text.replace(/^[@+-]+/, "");
      v = {
        ...v,
        text: replaced,
        raw: replaced,
      };
    }
    let lower = v.text.slice(v.text.lastIndexOf("/") + 1).toLowerCase();
    if (
      !(COMMAND_WRAPPERS_2.has(lower) || r.alsoLaunchers.has(lower)) ||
      /[ \t]/.test(v.text) ||
      (v.text.includes("/") && !r.anchored(v))
    ) {
      if (r.stepsPastVariable === true && S && v.text.startsWith("$") && e[h + 1] !== undefined) {
        w ??= {
          k: h,
          kept: s.length,
        };
        s.push(v);
        h += 1;
        continue;
      }
      let R = v.text.startsWith("$") && !/^\$\((?:\u2026|\(\u2026\))\)/.test(v.text);
      if (w !== undefined && (v.text.startsWith("-") || (!R && (v.quoted || v.expands === true))))
        return {
          program: e[w.k],
          args: e.slice(w.k + 1),
          assignments: s.slice(0, w.kept),
        };
      return {
        program: v,
        args: e.slice(h + 1),
        assignments: s,
      };
    }
    if (lower === "command") {
      let R = false;
      for (let j = h + 1; e[j]?.text.startsWith("-") === true; j += 1) R ||= isVersionOnlyFlag(e[j].text);
      if (R)
        return {
          program: v,
          args: e.slice(h + 1),
          assignments: s,
        };
    }
    if (lower === "runuser" && r.runuserIsSu) {
      u ??= computeUserOptionFill(e);
      if (!u[h + 1])
        return {
          program: v,
          args: e.slice(h + 1),
          assignments: s,
        };
    }
    if (lower === "busybox") {
      s.push(v);
      h += 1;
      continue;
    }
    s.push(v);
    S = true;
    w = undefined;
    h += 1;
    let C = WRAPPERS_WITH_TIMEOUT[lower] ?? 0;
    let O = (R) => (WRAPPER_VALUE_OPTIONS[lower]?.has(R) ?? false) || (r.alsoValued[lower]?.has(R) ?? false);
    let x = false;
    while (h < e.length) {
      let text = e[h].text;
      if (!x && text === "--") {
        s.push(e[h]);
        x = true;
        h += 1;
        continue;
      }
      if (!x && lower === "env" && text === "-") {
        s.push({
          ...e[h],
          text: "-i",
        });
        h += 1;
        continue;
      }
      if (!x && text.startsWith("-") && text !== "-") {
        let j = r.takesNext(O, text);
        s.push(e[h]);
        if (j && e[h + 1] !== undefined) s.push(e[h + 1]);
        h += j ? 2 : 1;
        continue;
      }
      if (C > 0 && (lower !== "chrt" || /^\d+$/.test(text))) {
        s.push(e[h]);
        C -= 1;
        h += 1;
        continue;
      }
      break;
    }
  }
}
//@ chunk-mthxbav8.js:56016-56200 placement
function collectAllHeredocCommands(e, n) {
  return PATH_ARG_RULESET.flatMap((r) => {
    let heredocBodies = collectHeredocBodies(e, n, r);
    return heredocBodies === undefined ? [] : [heredocBodies];
  }).filter(
    (r, s, u) => u.findIndex((S) => S.program.raw === r.program.raw && S.args.length === r.args.length) === s,
  );
}
//@ chunk-mthxbav8.js:56200-56231 placement
function parseShellWords(e) {
  return collectAllHeredocCommands(e, {});
}
//@ chunk-mthxbav8.js:56231-69518 placement
/**
 * 简化的 shell 词法/语法读取器：切分命令、引号、替换、heredoc，记录无法解析的位置。
 */
class ShellReader {
  text;
  make;
  quotedBackslashKept;
  substitutionHeredocs;
  pos = 0;
  unreadable = null;
  bodies = [];
  comments = [];
  pending = [];
  lineIndex = null;
  strippedLineIndex = null;
  constructor(text, make, quotedBackslashKept, substitutionHeredocs) {
    this.text = text;
    this.make = make;
    this.quotedBackslashKept = quotedBackslashKept;
    this.substitutionHeredocs = substitutionHeredocs;
  }
  fail(e) {
    this.unreadable ??= e;
  }
  failUnlessSubscriptHoldsOff(e) {
    if (
      this.unreadable === null &&
      readFlagWithOverride(TENGU_TRANQUIL_DUCKLING, {
        safe: true,
      })
    )
      this.fail(e);
  }
  failUnlessCasePatternGroupHoldOff() {
    if (
      this.unreadable === null &&
      readFlagWithOverride(BOT_PROTECTED_TENGU_SABLE_THIMBLE, {
        safe: true,
      })
    )
      this.fail(CASE_FOLLOW_UNSUPPORTED_TEXT);
  }
  pastContinuations(e, n = false) {
    for (;;) {
      let r = skipLineContinuations(this.text, e);
      if (r !== e) e = r;
      else if (n && e < this.text.length && WHITESPACE_CHARS.includes(this.text[e])) e += 1;
      else return e;
    }
  }
  tooDeep(e) {
    if (e < MAX_SUBSTITUTION_DEPTH) return false;
    this.fail("command substitutions nested too deeply");
    let n = 1;
    while (this.pos < this.text.length && n > 0) {
      let r = this.text[this.pos];
      if (r === "(") n += 1;
      else if (r === ")") n -= 1;
      this.pos += 1;
    }
    return true;
  }
  tokens(e, n) {
    let text = this.text;
    let s = text.length;
    let u = [];
    let pending = this.pending;
    let w = 0;
    let h = 0;
    let v = false;
    let y = false;
    let C = [];
    let O = 0;
    let x = false;
    let R = true;
    let j = false;
    while (this.pos < s) {
      let M = text[this.pos];
      if (WHITESPACE_CHARS.includes(M)) {
        this.pos += 1;
        continue;
      }
      if (
        M ===
        `
`
      ) {
        this.pos += 1;
        if (pending.length > 0) {
          let B = e === "array" ? n - 1 : n;
          if (this.substitutionHeredocs && pending[0].depth < B)
            this.fail(
              "a $( \u2026 ) or <( \u2026 ) that runs on past the end of a line which opened a heredoc of its own",
            );
          this.readHeredocBodies(pending.splice(0), n);
        }
        if (e === "array") continue;
        u.push({
          kind: "op",
          op: `
`,
        });
        R = true;
        continue;
      }
      if (
        M === "\\" &&
        text[this.pos + 1] ===
          `
`
      ) {
        this.pos += 2;
        continue;
      }
      if (M === "#") {
        let index = text.indexOf(
          `
`,
          this.pos,
        );
        let Q = index === -1 ? s : index;
        this.comments.push([this.pos, Q]);
        this.pos = Q;
        continue;
      }
      if (e === "array") {
        if (M === ")") {
          this.pos += 1;
          return u;
        }
        if (";&|<>".includes(M) || M === "(") {
          this.fail("an array assignment holds something other than words");
          this.pos += 1;
          continue;
        }
        u.push({
          kind: "word",
          word: this.readWord(n, false, true),
        });
        continue;
      }
      let q = this.pastContinuations(this.pos + 1);
      let T = M + (text[q] ?? "");
      let P = this.pastContinuations(q + 1);
      if (T === ";;" && text[P] === "&") {
        u.push({
          kind: "op",
          op: ";;&",
        });
        this.pos = P + 1;
        y = h > 0;
        O = u.length;
        R = true;
        continue;
      }
      if (T === "&&" || T === "||" || T === ";;" || T === ";&" || T === "|&") {
        u.push({
          kind: "op",
          op: T,
        });
        this.pos = q + 1;
        if ((T === ";;" || T === ";&") && h > 0) {
          y = true;
          O = u.length;
        }
        R = true;
        continue;
      }
      if (M === "(" && y && (T === "((" || x || hasNonNewlineTokenAfter(u, O, u.length)))
        this.failUnlessCasePatternGroupHoldOff();
      if (T === "((" && R) {
        let B = q + 1;
        let arithmeticClose = findArithmeticClose(text, B);
        if (arithmeticClose !== -1) {
          this.collectExpansions(text.slice(B, arithmeticClose - 2), n);
          this.pos = arithmeticClose;
          R = false;
          continue;
        }
      }
      if (M === "(") {
        this.pos += 1;
        if (y) {
          x = true;
          continue;
        }
        w += 1;
        u.push({
          kind: "op",
          op: "(",
        });
        R = true;
        continue;
      }
      if (M === ")") {
        this.pos += 1;
        if (y) {
          u.push({
            kind: "op",
            op: ")",
          });
          y = false;
          let B =
            text[this.pastContinuations(this.pos)] ??
            `
`;
          if (text[this.pastContinuations(this.pos, true)] === "|" || (x && !PIPE_TERMINATORS.includes(B)))
            this.failUnlessCasePatternGroupHoldOff();
          x = false;
          R = true;
          continue;
        }
        if (C.at(-1) === w) this.failUnlessCasePatternGroupHoldOff();
        if (w > 0) {
          w -= 1;
          u.push({
            kind: "op",
            op: ")",
          });
          R = true;
          continue;
        }
        if (e === "paren") {
          if (this.substitutionHeredocs && (pending.at(-1)?.depth ?? -1) >= n)
            this.fail(
              "a heredoc opened inside $( \u2026 ) or <( \u2026 ) whose closing ')' comes on the same line, before the heredoc's lines",
            );
          return u;
        }
        this.fail("a closing parenthesis that closes nothing");
        u.push({
          kind: "op",
          op: ")",
        });
        continue;
      }
      if (M === "&" && text[q] === ">") {
        this.pos = text[P] === ">" ? P + 1 : q + 1;
        this.pos = this.pastContinuations(this.pos, true);
        if (
          this.pos < s &&
          !`
;&|()`.includes(text[this.pos])
        )
          u.push({
            kind: "redirect",
            op: "&>",
            word: this.readWord(n),
          });
        R = false;
        continue;
      }
      if (M === ";" || M === "&" || M === "|") {
        if (T === ";|" && h > 0) this.failUnlessCasePatternGroupHoldOff();
        u.push({
          kind: "op",
          op: M,
        });
        this.pos += 1;
        R = true;
        continue;
      }
      if (M === "<" || M === ">") {
        if (y && T === "<<") this.failUnlessCasePatternGroupHoldOff();
        if (text[q] === "(") {
          u.push({
            kind: "word",
            word: this.readWord(n),
          });
          R = false;
          continue;
        }
        let B = q;
        let Q = T;
        let ee = Q === "<<" ? this.pastContinuations(B + 1) : B;
        if (Q === "<<" && text[ee] !== "<") {
          this.pos = ee;
          let strip = false;
          if (text[this.pos] === "-") {
            if (ee !== B + 1)
              this.fail('a heredoc "-" that only a joined line continuation puts next to the <<');
            strip = true;
            this.pos = this.pastContinuations(this.pos + 1);
          }
          this.pos = this.pastContinuations(this.pos, true);
          let word = this.readWord(n, true);
          if (word.raw !== "") {
            if (QUOTED_BACKSLASH_RE.test(joinLineContinuations(word.raw)))
              this.fail("a heredoc delimiter this reading cannot spell as the shell does");
            if (word.text === "" && !word.quoted) this.fail("a heredoc delimiter that reads as empty");
            let Z = {
              kind: "heredoc",
              body: null,
            };
            u.push(Z);
            R = false;
            pending.push({
              token: Z,
              delimiter: word.text,
              strip,
              expand: !word.quoted,
              depth: n,
            });
          }
          continue;
        }
        let D = Q === "<<" ? "<<<" : [">>", ">&", "<&", ">|", "<>"].includes(Q) ? Q : M;
        this.pos = D === "<<<" ? ee + 1 : D.length === 2 ? B + 1 : this.pos + 1;
        this.pos = this.pastContinuations(this.pos, true);
        if (
          this.pos < s &&
          !`
;&|()`.includes(text[this.pos])
        )
          u.push({
            kind: "redirect",
            op: D,
            word: this.readWord(n),
          });
        R = false;
        continue;
      }
      if (M === "{" || M === "}") {
        let B = this.pastContinuations(this.pos + 1);
        let Q =
          B >= s ||
          (
            WHITESPACE_CHARS +
            `
;&|()<>`
          ).includes(text[B]);
        if (Q && R) {
          u.push({
            kind: "op",
            op: M,
          });
          this.pos += 1;
          R = true;
          continue;
        }
        if (Q && M === "{") this.fail("a { that may open a group or may be an argument");
      }
      let match = /^[A-Za-z_][A-Za-z0-9_]*\+?=\(/.exec(text.slice(this.pos, this.pos + 256));
      if (match !== null) {
        if (y) this.failUnlessCasePatternGroupHoldOff();
        let pos = this.pos;
        this.pos += match[0].length;
        if (!this.tooDeep(n + 1)) {
          this.tokens("array", n + 1);
          let ee = this.pastContinuations(this.pos);
          let D =
            text[ee] ??
            `
`;
          let G = (D === "<" || D === ">") && text[this.pastContinuations(ee + 1)] === "(";
          let Y =
            D ===
              `
` ||
            (D === "\r" &&
              (text[ee + 1] ??
                `
`) ===
                `
`);
          if (G || !(Y || `${WHITESPACE_CHARS};&|<>)`.includes(D)))
            this.failUnlessSubscriptHoldsOff(
              "text straight after the ) that closes name=( \u2026 ), which the shells read in different ways or refuse",
            );
        }
        let sliced = text.slice(pos, this.pos);
        u.push({
          kind: "word",
          word: {
            text: sliced,
            quoted: false,
            raw: sliced,
          },
        });
        R = false;
        continue;
      }
      let word = this.readWord(n);
      if (word.raw === "") {
        this.pos += 1;
        continue;
      }
      if (
        /^[0-9]+$/.test(joinLineContinuations(word.raw)) &&
        (text[this.pos] === "<" || text[this.pos] === ">")
      )
        continue;
      u.push({
        kind: "word",
        word,
      });
      if (!word.quoted) {
        if (R && word.text === "case") {
          v = true;
          if (y || j) this.failUnlessCasePatternGroupHoldOff();
        } else if (v && word.text === "in") {
          v = false;
          h += 1;
          C.push(w);
          y = true;
          O = u.length;
        } else if (word.text === "esac" && h > 0 && (R || y)) {
          if (
            y &&
            (x ||
              "(<>".includes(text[this.pastContinuations(this.pos)] ?? " ") ||
              hasNonNewlineTokenAfter(u, O, u.length - 1))
          )
            this.failUnlessCasePatternGroupHoldOff();
          h -= 1;
          C.pop();
          y = false;
          x = false;
        }
      }
      let F = R;
      let X = j;
      j = F && !word.quoted && SHELL_COMPOUND_OPENERS.has(word.text);
      R = X || (F && !word.quoted && (SHELL_KEYWORDS.has(word.text) || SHELL_CONTROL_WORDS.has(word.text)));
    }
    if (e === "eof") pending.splice(0);
    if (h > 0 || y) this.fail("a case statement that is never closed");
    if (e !== "eof")
      this.fail(
        e === "array" ? "an array assignment that is never closed" : "a $( or ( that is never closed",
      );
    return u;
  }
  readWord(e, n = false, r = false) {
    let text = this.text;
    let u = text.length;
    let pos = this.pos;
    let w = "";
    let h = false;
    let v = false;
    let y = 0;
    let C = false;
    let O = 0;
    let x;
    while (this.pos < u) {
      let j = text[this.pos];
      if (j === "'") {
        h = true;
        let index = text.indexOf("'", this.pos + 1);
        if (index === -1) {
          this.fail("a single quote that is never closed");
          w += text.slice(this.pos + 1);
          this.pos = u;
          break;
        }
        w += text.slice(this.pos + 1, index);
        this.pos = index + 1;
        continue;
      }
      if (j === "$" && text[this.pos + 1] === "'") {
        h = true;
        {
          let index = text.indexOf("'", this.pos + 2);
          if (text.slice(this.pos + 2, index === -1 ? u : index).includes("\\")) v = true;
        }
        this.pos += 2;
        while (this.pos < u && text[this.pos] !== "'")
          if (text[this.pos] === "\\" && this.pos + 1 < u) {
            w += text[this.pos + 1];
            this.pos += 2;
          } else {
            w += text[this.pos];
            this.pos += 1;
          }
        if (this.pos >= u) {
          this.fail("a $' quote that is never closed");
          break;
        }
        this.pos += 1;
        continue;
      }
      if (j === '"' || (j === "$" && text[this.pos + 1] === '"')) {
        h = true;
        this.pos += j === "$" ? 2 : 1;
        while (this.pos < u && text[this.pos] !== '"') {
          let M = text[this.pos];
          if (M === "\\" && this.pos + 1 < u) {
            let q = text[this.pos + 1];
            w +=
              q ===
              `
`
                ? ""
                : q === "$" || q === Ge || q === '"' || q === "\\"
                  ? q
                  : this.quotedBackslashKept
                    ? M + q
                    : q;
            this.pos += 2;
          } else if (!n && M === "$" && text[this.pastContinuations(this.pos + 1)] === "(")
            w += this.readDollarParen(e, this.pastContinuations(this.pos + 1));
          else if (!n && M === Ge) w += this.readBackticks(e);
          else if (M === "$" && text[this.pastContinuations(this.pos + 1)] === "{") {
            w += this.readParameterExpansion(e, this.pastContinuations(this.pos + 1));
            v = true;
          } else {
            if (M === "$") v = true;
            w += M;
            this.pos += 1;
          }
        }
        if (this.pos >= u) {
          this.fail("a double quote that is never closed");
          break;
        }
        this.pos += 1;
        continue;
      }
      if (j === "\\" && this.pos + 1 < u) {
        if (
          text[this.pos + 1] !==
          `
`
        ) {
          w += text[this.pos + 1];
          h = true;
        }
        this.pos += 2;
        continue;
      }
      if (j === "$" && text[this.pastContinuations(this.pos + 1)] === "{") {
        w += this.readParameterExpansion(e, this.pastContinuations(this.pos + 1));
        v = true;
        continue;
      }
      if (!n && j === "$" && text[this.pastContinuations(this.pos + 1)] !== "(") v = true;
      if (!n && j === "$" && text[this.pastContinuations(this.pos + 1)] === "(") {
        w += this.readDollarParen(e, this.pastContinuations(this.pos + 1));
        h = true;
        v = true;
        continue;
      }
      if (!n && j === Ge) {
        w += this.readBackticks(e);
        h = true;
        v = true;
        continue;
      }
      if (!n && (j === "<" || j === ">") && text[this.pastContinuations(this.pos + 1)] === "(") {
        this.pos = this.pastContinuations(this.pos + 1) + 1;
        if (!this.tooDeep(e + 1)) this.bodies.push(this.tokens("paren", e + 1));
        w += j + "(\u2026)";
        h = true;
        continue;
      }
      if (SHELL_META_CHARS.includes(j)) {
        if (y > 0)
          this.failUnlessSubscriptHoldsOff(
            "a [ still open at a space, tab, line break or one of ; & | < > ( ), where bash may read on to its ] and other shells end the word",
          );
        else if (j === "(" && O > 0 && /^\+?=/.test(w.slice(O)) && w.endsWith("="))
          this.failUnlessSubscriptHoldsOff(
            "an opening parenthesis after [\u2026]= or [\u2026]+= in the same word, as in a[1]=(x), which the shells read in different ways or refuse",
          );
        else if (j === "(" && !n && !r && x === true && w.endsWith("="))
          this.failUnlessSubscriptHoldsOff(
            "name=( that this reading did not take as an array, such as one with a line continuation or a second = before the parenthesis, a name hundreds of characters long or a non-ASCII name, which the shells read in different ways or refuse",
          );
        break;
      }
      if (j === "[") {
        if (y > 0) y += 1;
        else if (!C) {
          C = true;
          if (!n && !h && (r ? w === "" : IDENTIFIER_RE.test(w))) y = 1;
        }
      } else if (j === "]" && y > 0) {
        y -= 1;
        if (y === 0) O = w.length + 1;
      } else if (j === "=" && x === undefined)
        x = !h && IDENTIFIER_RE.test(w.endsWith("+") ? w.slice(0, -1) : w);
      w += j;
      this.pos += 1;
    }
    let sliced = text.slice(pos, this.pos);
    if (/\{[^{}'"]*(?:,|\.\.)[^{}'"]*\}/.test(sliced.replace(/'[^']*'|"[^"]*"/g, ""))) v = true;
    return {
      text: w,
      quoted: h,
      raw: sliced,
      ...(v && {
        expands: v,
      }),
    };
  }
  readParameterExpansion(e, n = this.pos + 1) {
    let text = this.text;
    let s = text.length;
    this.pos = n + 1;
    let u = (pos) => WHITESPACE_OR_PIPE_RE.test(text[this.pastContinuations(pos)] ?? "");
    if (u(this.pos)) this.fail("a ${ \u2026; } command substitution");
    let S = 1;
    let w = false;
    while (this.pos < s && S > 0) {
      let v = text[this.pos];
      if (v === "\\") this.pos += 2;
      else if (v === '"') {
        w = !w;
        this.pos += 1;
      } else if (v === "'" && !w) {
        let index = text.indexOf("'", this.pos + 1);
        let C = index === -1 ? s : index;
        this.collectExpansions(text.slice(this.pos + 1, C), e);
        this.pos = index === -1 ? s : index + 1;
      } else if (v === "'") this.pos += 1;
      else if (v === "$" && text[this.pastContinuations(this.pos + 1)] === "(")
        this.readDollarParen(e, this.pastContinuations(this.pos + 1));
      else if (v === Ge) this.readBackticks(e);
      else if (v === "$" && text[this.pastContinuations(this.pos + 1)] === "{") {
        S += 1;
        this.pos = this.pastContinuations(this.pos + 1) + 1;
        if (u(this.pos)) this.fail("a ${ \u2026; } command substitution");
      } else {
        if (v === "}" && !w) S -= 1;
        this.pos += 1;
      }
    }
    if (S > 0) this.fail("a ${ that is never closed");
    let h = joinLineContinuations(text.slice(n, this.pos));
    if (PARAMETER_EXPANSION_RE.test(h)) this.fail("a ${ \u2026@P } expansion");
    return "$" + h;
  }
  readDollarParen(e, n = this.pos + 1) {
    let text = this.text;
    if (text[n + 1] === "(") {
      let arithmeticClose = findArithmeticClose(text, n + 2);
      if (arithmeticClose !== -1) {
        this.collectExpansions(text.slice(n + 2, arithmeticClose - 2), e);
        this.pos = arithmeticClose;
        return "$((\u2026))";
      }
    }
    this.pos = n + 1;
    if (this.tooDeep(e + 1)) return "$(\u2026)";
    let pos = this.pos;
    let u = this.tokens("paren", e + 1);
    if (this.make) {
      let S = u[0];
      if (S?.kind === "word" && /^(?:shell|eval|call)$/.test(S.word.text)) {
        this.bodies.push(u.slice(1));
        return "$(\u2026)";
      }
      return "$(" + this.text.slice(pos, Math.max(pos, this.pos - 1)) + ")";
    }
    this.bodies.push(u);
    return "$(\u2026)";
  }
  readBackticks(e) {
    let text = this.text;
    let r = text.length;
    let s = this.pos + 1;
    while (s < r && text[s] !== Ge) s += text[s] === "\\" ? 2 : 1;
    if (s >= r) this.fail("a backtick that is never closed");
    let u = new ShellReader(
      text.slice(this.pos + 1, Math.min(s, r)).replace(/\\([$\x60\\])/g, "$1"),
      this.make,
      this.quotedBackslashKept,
      this.substitutionHeredocs,
    );
    if (e + 1 > MAX_SUBSTITUTION_DEPTH) this.fail("command substitutions nested too deeply");
    else {
      this.bodies.push(u.tokens("eof", e + 1), ...u.bodies);
      if (u.unreadable !== null) this.fail(u.unreadable);
    }
    this.pos = Math.min(s + 1, r);
    return "$(\u2026)";
  }
  collectExpansions(e, n) {
    if (PARAMETER_EXPANSION_RE.test(joinLineContinuations(e))) this.fail("a ${ \u2026@P } expansion");
    let r = 0;
    while (r < e.length) {
      let s = e[r];
      let u = s === "$" ? skipLineContinuations(e, r + 1) : r + 1;
      if (s === "$" && e[u] === "(") {
        let S = new ShellReader(e.slice(r), this.make, this.quotedBackslashKept, this.substitutionHeredocs);
        S.readDollarParen(n, u - r);
        this.bodies.push(...S.bodies);
        if (S.unreadable !== null) this.fail(S.unreadable);
        r += Math.max(S.pos, 1);
        continue;
      }
      if (s === "$" && e[u] === "{") {
        if (WHITESPACE_OR_PIPE_RE.test(e[skipLineContinuations(e, u + 1)] ?? ""))
          this.fail("a ${ \u2026; } command substitution");
      }
      if (s === "\\") r += 2;
      else if (s === Ge) {
        let S = new ShellReader(e.slice(r), this.make, this.quotedBackslashKept, this.substitutionHeredocs);
        S.readBackticks(n);
        this.bodies.push(...S.bodies);
        if (S.unreadable !== null) this.fail(S.unreadable);
        r += Math.max(S.pos, 1);
      } else r += 1;
    }
  }
  readHeredocBodies(e, n) {
    for (let r of e) {
      let line = this.findLine(r.delimiter, this.pos, r.strip);
      let u =
        line === -1
          ? -1
          : this.text.indexOf(
              `
`,
              line,
            );
      if (
        r.expand &&
        line !== -1 &&
        this.unreadable === null &&
        CONTINUED_LINE_RE.test(this.text.slice(this.pos, line))
      )
        ({ at: line, lineEnd: u } = this.findJoinedLine(r.delimiter, this.pos, r.strip));
      if (line === -1) {
        this.fail("a heredoc is never terminated");
        break;
      }
      let sliced = this.text.slice(this.pos, line);
      if (r.expand) this.collectExpansions(joinLineContinuations(sliced), n);
      r.token.body = r.expand ? unescapeDoubleQuoted(sliced) : sliced;
      this.pos = u === -1 ? this.text.length : u + 1;
    }
  }
  findJoinedLine(e, n, r) {
    let text = this.text;
    let u = n;
    while (u <= text.length) {
      let S = "";
      let w = u;
      let h = -1;
      for (;;) {
        h = text.indexOf(
          `
`,
          w,
        );
        let sliced = text.slice(w, h === -1 ? text.length : h);
        let y = h !== -1 && TRAILING_BACKSLASH_RE.test(sliced);
        S += y ? sliced.slice(0, -1) : sliced;
        if (!y) break;
        w = h + 1;
      }
      if ((r ? S.replace(/^\t+/, "") : S) === e)
        return {
          at: u,
          lineEnd: h,
        };
      if (h === -1)
        return {
          at: -1,
          lineEnd: -1,
        };
      u = h + 1;
    }
    return {
      at: -1,
      lineEnd: -1,
    };
  }
  findLine(e, n, r) {
    if (this.lineIndex === null) {
      let w = new Map();
      let h = new Map();
      let v = 0;
      for (let line of this.text.split(`
`)) {
        let C = (O, x) => {
          let R = O.get(x);
          if (R === undefined) O.set(x, [v]);
          else R.push(v);
        };
        C(w, line);
        C(h, line.replace(/^\t+/, ""));
        v += line.length + 1;
      }
      this.lineIndex = w;
      this.strippedLineIndex = h;
    }
    let s = (r ? this.strippedLineIndex : this.lineIndex).get(e);
    if (s === undefined) return -1;
    let u = 0;
    let S = s.length;
    while (u < S) {
      let w = (u + S) >> 1;
      if (s[w] < n) u = w + 1;
      else S = w;
    }
    return u < s.length ? s[u] : -1;
  }
}
//@ chunk-mthxbav8.js:69518-69753 placement
function findArithmeticClose(text, n) {
  let min = Math.min(text.length, n + 4096);
  let s = n;
  let u = 0;
  while (s < min) {
    let S = text[s];
    if (S === "'" || S === '"') {
      let index = text.indexOf(S, s + 1);
      s = index === -1 ? min : index + 1;
      continue;
    }
    if (S === "(") u += 1;
    else if (S === ")") {
      if (u === 0) return text[s + 1] === ")" ? s + 2 : -1;
      u -= 1;
    }
    s += 1;
  }
  return -1;
}
//@ chunk-mthxbav8.js:69753-71241 placement
/**
 * 会影响工具行为的敏感环境变量名单（编辑器、分页器、预加载、Go/Rust/JVM 相关），以及其前缀/精确名匹配正则。
 */
var TOOL_ENV_VARS = new Set([
  "DEVELOPER_DIR",
  "MAKEFILES",
  "MAKEFLAGS",
  "GNUMAKEFLAGS",
  "AWKPATH",
  "AWKLIBPATH",
  "GOFLAGS",
  "RUSTFLAGS",
  "GIT_EDITOR",
  "GIT_SEQUENCE_EDITOR",
  "GIT_EXTERNAL_DIFF",
  "GIT_PROXY_COMMAND",
  "SUDO_ASKPASS",
  "ZDOTDIR",
  "CDPATH",
  "GCONV_PATH",
  "NLSPATH",
  "DOTNET_STARTUP_HOOKS",
  "npm_config_node_options",
  "NPM_CONFIG_NODE_OPTIONS",
  "LESSOPEN",
  "LESSCLOSE",
  "MANPAGER",
  "MAVEN_OPTS",
  "GRADLE_OPTS",
  "OPENSSL_ENGINES",
  "SHELLOPTS",
  "BASHOPTS",
  "PS4",
  "PROMPT_COMMAND",
  "GIT_SSH_COMMAND",
  "GIT_SSH",
  "GIT_EXEC_PATH",
  "GIT_ASKPASS",
  "SSH_ASKPASS",
  "GIT_PAGER",
  "PAGER",
  "EDITOR",
  "VISUAL",
  "BROWSER",
  "PYTHONWARNINGS",
  "PYTHONBREAKPOINT",
  "PERL5DB",
  "NODE_REPL_EXTERNAL_MODULE",
  "JAVA_TOOL_OPTIONS",
  "_JAVA_OPTIONS",
  "JDK_JAVA_OPTIONS",
  "NODE_OPTIONS",
  "NODE_COMPILE_CACHE",
  "PYTHONSTARTUP",
  "PYTHONHOME",
  "PYTHONUSERBASE",
  "BASH_ENV",
  "ENV",
  "PERL5OPT",
  "RUBYOPT",
  "GEM_HOME",
  "RUBYGEMS_GEMDEPS",
  "BUNDLE_GEMFILE",
  "OPENSSL_CONF",
  "OPENSSL_MODULES",
  "DYLD_INSERT_LIBRARIES",
  "LD_PRELOAD",
  "LD_AUDIT",
]);
var TOOL_ENV_PREFIX_RE = /^(?:DYLD_|LD_|BASH_FUNC_|GIT_CONFIG_|LUA_C?PATH)/;
var NULL_COMMAND_ENV_VARS = new Set(["NULLCMD", "READNULLCMD"]);
var TOOL_ENV_EXACT_RE =
  /^(?:GH_BROWSER|RSYNC_RSH|CVS_RSH|SOPS_GPG_EXEC|PERL5SHELL|RUBYSHELL|JAVACMD|CLOUDSDK_PYTHON|UV_PYTHON|RUSTC_WRAPPER|RUSTC_WORKSPACE_WRAPPER|npm_config_script_shell|NPM_CONFIG_SCRIPT_SHELL|R_(?:PROFILE|ENVIRON)(?:_USER)?|TAR_OPTIONS|BUN_OPTIONS|TF_CLI_ARGS\w*|CARGO_ALIAS_\w+|[A-Z0-9][A-Z0-9_]*_(?:EXTERNAL_DIFF|PAGER|EDITOR))$/;
var SCRIPT_PATH_RE =
  /^(?!-)(?:[^\s]*\/[^\s]*|[^\s\/]+\.(?:sh|bash|zsh|fish|py|rb|pl|js|mjs|cjs|ts|php|lua|R|r|ps1|awk|tcl|exs?|jl))$/;
//@ chunk-mthxbav8.js:71241-71301 placement
function isToolEnvVar(e, n) {
  return TOOL_ENV_VARS.has(e) || TOOL_ENV_PREFIX_RE.test(e) || (n && NULL_COMMAND_ENV_VARS.has(e));
}
//@ chunk-mthxbav8.js:71301-71402 placement
function splitQuotedWords(e) {
  return (e.match(/(?:[^\s"']+|"[^"]*"|'[^']*')+/g) ?? []).map((n) => n.replace(/["']/g, ""));
}
//@ chunk-mthxbav8.js:71402-71665 placement
function pathPrefixes(e, n) {
  let replaced = e.replace(/\/+$/, "");
  if (!replaced.startsWith("/") || replaced === "") return [];
  let s =
    n !== "" && n !== "/" && (replaced === n || replaced.startsWith(`${n}/`))
      ? replaced.slice(n.length)
      : null;
  let u = s === "" ? "/" : s;
  return s === null
    ? [replaced]
    : [replaced, `~${u}`, `$HOME${u}`, `$HOME"${u}`, `\${HOME}${u}`, `\${HOME}"${u}`];
}
//@ chunk-mthxbav8.js:71665-74438 placement
/**
 * 均依赖 cwd 的命令模式（相对路径、process.cwd()、pwd、git rev-parse --show-toplevel 等），以及 shell 名、脚本解释器、构建工具与解释器取值选项表。
 */
var CWD_DEPENDENCE_PATTERN =
  /(?:^|[\s"'=(`:;&|<>])\.\.?\/|\bprocess\.cwd\(\)|\bos\.getcwd\(\)|\bPath\.cwd\(\)|\bDir\.pwd\b|\bgit\b[^\n]{0,12}\brev-parse\b[^\n]{0,6}--show-toplevel\b/im;
var PWD_REFERENCE_RE = /\$PWD\b|\$\{PWD\b|\$\(pwd(?:[ \t]+-[LP])?\)|`pwd`/im;
var HISTCHARS_RE = /histchars|HISTCHARS/;
var SHELL_NAME_RE =
  /^(?:bash|sh|zsh|dash|ash|(?:pd|lo|o|m|r)?ksh[0-9]*|rbash|fish|csh|tcsh|yash|posh|[oy]sh)$/i;
var SHELL_PROGRAMS = new Set([
  "bash",
  "sh",
  "zsh",
  "dash",
  "ash",
  "ksh",
  "mksh",
  "rbash",
  "fish",
  "csh",
  "tcsh",
  "pwsh",
  "yash",
  "posh",
  "osh",
  "ysh",
  "pdksh",
  "loksh",
  "oksh",
]);
var SCRIPT_INTERPRETERS = new Set([
  "python",
  "pypy",
  "node",
  "nodejs",
  "ruby",
  "perl",
  "php",
  "lua",
  "tsx",
  "ts-node",
  "bb",
  "awk",
  "gawk",
  "osascript",
  "expect",
  "tclsh",
  "wish",
  "rscript",
  "irb",
  "erb",
  "nawk",
  "mawk",
  "sed",
  "gsed",
  "m4",
]);
var EXTENSION_INTERPRETERS = {
  julia: /\.jl$/,
  elixir: /\.exs?$/,
  groovy: /\.groovy$/,
  racket: /\.rkt$/,
  guile: /\.scm$/,
  sbcl: /\.(?:lisp|cl)$/,
};
var BUILD_TOOL_PROGRAMS = new Set([
  "bmake",
  "pmake",
  "gnumake",
  "make",
  "gmake",
  "ninja",
  "nix-build",
  "nix-instantiate",
  "nix-env",
  "ctest",
  "meson",
  "cmake",
  "bazel",
  "bazelisk",
  "npm",
  "npx",
  "pnpm",
  "yarn",
  "bun",
  "bunx",
  "lint-staged",
  "npm-run-all",
  "run-p",
  "run-s",
  "turbo",
  "nx",
  "lerna",
  "lefthook",
  "gulp",
  "grunt",
  "eslint",
  "prettier",
  "jest",
  "vitest",
  "mocha",
  "ava",
  "playwright",
  "cypress",
  "webpack",
  "rollup",
  "vite",
  "babel",
  "postcss",
  "tailwindcss",
  "next",
  "tsc",
  "commitlint",
  "stylelint",
  "uv",
  "pip",
  "pip3",
  "poetry",
  "pipenv",
  "hatch",
  "pdm",
  "rye",
  "pytest",
  "tox",
  "nox",
  "pylint",
  "flake8",
  "mypy",
  "pre-commit",
  "cargo",
  "rake",
  "bundle",
  "rspec",
  "rubocop",
  "rails",
  "composer",
  "phpunit",
  "phpstan",
  "psalm",
  "gradle",
  "gradlew",
  "mvn",
  "mvnw",
  "scons",
  "ant",
  "hg",
  "sbt",
  "lein",
  "clj",
  "clojure",
  "stack",
  "cabal",
  "mix",
  "dotnet",
  "msbuild",
  "swift",
  "xcodebuild",
  "pod",
  "fastlane",
  "just",
  "task",
  "terraform",
  "tofu",
  "terragrunt",
  "snakemake",
  "vagrant",
  "docker-compose",
  "podman-compose",
  "devbox",
  "mise",
  "asdf",
]);
var VERSION_OR_HELP_FLAG_RE = /^--(?:version|help)$/;
var BUILD_SUBCOMMANDS = {
  go: new Set(["generate", "run", "test", "build", "install", "get", "vet", "tool"]),
  deno: new Set(["task", "test", "bench", "lint", "fmt", "check"]),
  docker: new Set(["compose", "build", "buildx"]),
  podman: new Set(["compose", "build"]),
  nix: new Set([
    "develop",
    "run",
    "build",
    "shell",
    "flake",
    "eval",
    "profile",
    "bundle",
    "print-dev-env",
    "fmt",
    "repl",
  ]),
  node: new Set(["--run", "--test"]),
};
var INTERPRETER_EVAL_FLAGS = {
  python: new Set(["-W", "-X", "--check-hash-based-pycs"]),
  pypy: new Set(["-W", "-X"]),
  node: new Set([
    "-e",
    "--eval",
    "-p",
    "--print",
    "-r",
    "--require",
    "--import",
    "--loader",
    "--experimental-loader",
    "-C",
    "--conditions",
    "--input-type",
    "--title",
  ]),
  ruby: new Set(["-e", "-r", "--require", "-I", "-C", "-E"]),
  perl: new Set(["-e", "-E", "-M", "-m", "-I"]),
  php: new Set([
    "-r",
    "-d",
    "--define",
    "-c",
    "--php-ini",
    "-B",
    "-R",
    "-F",
    "-E",
    "-z",
    "--zend-extension",
    "-f",
    "--file",
  ]),
  osascript: new Set(["-l", "-s"]),
  lua: new Set(["-e", "-l"]),
  tsx: new Set(["-e", "--eval", "-r", "--require", "--import", "--tsconfig"]),
  "ts-node": new Set(["-e", "--eval", "-r", "--require", "-P", "--project", "-O", "--compilerOptions"]),
};
//@ chunk-mthxbav8.js:74438-74899 placement
function isEvalFlag(e, text) {
  switch (e) {
    case "node":
    case "nodejs":
    case "tsx":
    case "ts-node":
      return /^(?:-e|--eval|-p|--print)$/.test(text) || /^-[a-zA-Z]*[ep]$/.test(text);
    case "python":
    case "pypy":
      return /^-[bBdEhiIOPqRsSuvVx]*[cm]/.test(text);
    case "perl":
      return /^-[acfgnpsStTuUwWXl0-9]*[eE]$/.test(text);
    case "ruby":
      return /^-[acdhlnpsSUvwy]*e$/.test(text);
    case "php":
      return /^-[aeHilmnqsvw]*[rRBE]$/.test(text);
    case "lua":
    case "bb":
    case "osascript":
    case "rscript":
    case "erb":
      return text === "-e";
    default:
      return false;
  }
}
//@ chunk-mthxbav8.js:74899-74998 placement
/**
 * Python/其它脚本中 import/exec/eval 相关正则。
 */
var PYTHON_IMPORT_PATTERN = /\bimport\b|__import__/;
var EXEC_OR_EVAL_RE = /\bexec(?:file)?\b|\beval\b/;
var IMPORT_OR_EXEC_RE = /\bimport\b|__import__|\bexec\b/;
//@ chunk-mthxbav8.js:74998-75077 placement
function commandBaseName(program) {
  let text = program.text;
  return text.slice(text.lastIndexOf("/") + 1).toLowerCase();
}
//@ chunk-mthxbav8.js:75077-75187 placement
function normalizeInterpreterName(e) {
  return e.replace(/^(python|pypy|perl|ruby|php|lua|node|nodejs|ksh|tclsh|wish)[0-9.]+t?$/, "$1");
}
//@ chunk-mthxbav8.js:75187-75243 placement
function isKnownInterpreter(e) {
  return SHELL_PROGRAMS.has(e) || SCRIPT_INTERPRETERS.has(e) || INTERPRETER_NAME_PATTERN.test(e);
}
//@ chunk-mthxbav8.js:75243-75306 placement
/**
 * 绝对路径/疑似绝对路径/以 ~ 或 $ 开头的路径前缀正则。
 */
var ABSOLUTE_PATH_PATTERN = /^[\/$]|^~(?=\/|$)/;
var ABSOLUTE_LIKE_PATH_RE = /^[\/$]|^~(?![+-])/;
var PATH_PREFIX_CHARS_RE = /^[\/~$]/;
//@ chunk-mthxbav8.js:75306-75374 placement
function isAbsoluteLike(e, n = ABSOLUTE_LIKE_PATH_RE) {
  return (
    ABSOLUTE_PATH_PATTERN.test(e) ||
    (n.test(e) &&
      !readFlagWithOverride(TENGU_FEDERATED_HEARTH, {
        safe: true,
      }))
  );
}
//@ chunk-mthxbav8.js:75374-75431 placement
function isPathWord(e) {
  return isAbsoluteLike(e.text) || /^[<>]\(/.test(e.text);
}
//@ chunk-mthxbav8.js:75431-75510 placement
function isPlainArgument(e) {
  return e !== undefined && e.text !== "" && !isPathWord(e) && !e.text.startsWith("-");
}
export {
  commandBaseName,
  isPlainArgument,
  isLauncherCommand,
  isAnchoredPath,
  normalizeInterpreterName,
  isPathWord,
  BUILD_TOOL_PROGRAMS,
  VERSION_OR_HELP_FLAG_RE,
  SHELL_PROGRAMS,
  SCRIPT_INTERPRETERS,
  isKnownInterpreter,
  isAbsoluteLike,
  PATH_PREFIX_CHARS_RE,
  EXTENSION_INTERPRETERS,
  parseShellWords,
  BUILD_SUBCOMMANDS,
  isEvalFlag,
  parseShellCommands,
  INTERPRETER_EVAL_FLAGS,
  splitQuotedWords,
  isToolEnvVar,
  TOOL_ENV_EXACT_RE,
  SCRIPT_PATH_RE,
  EXEC_OR_EVAL_RE,
  IMPORT_OR_EXEC_RE,
  PYTHON_IMPORT_PATTERN,
  SHELL_NAME_RE,
  pathPrefixes,
  CWD_DEPENDENCE_PATTERN,
  PWD_REFERENCE_RE,
  HISTCHARS_RE,
  shellComments,
};
