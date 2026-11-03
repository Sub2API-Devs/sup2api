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
import { COMMAND_WRAPPERS, ii, ri } from "./vouching.js";
import { readFlagWithOverride } from "../../../services/analytics/flagOverrides.js";
import { BAt } from "../../bash/parser.js";
import { INTERPRETER_NAME_PATTERN } from "../hookCommandAnalysis.js";
import { TENGU_FEDERATED_HEARTH } from "./commandReach.js";

//@ chunk-mthxbav8.js:49944-50122 placement
function isAnchoredPath(e) {
  return (
    /^(?:\/|\$(?!\{?(?:CURDIR|PWD)\b)(?:[A-Za-z_][A-Za-z0-9_]*|\{[A-Za-z_][A-Za-z0-9_]*\})\/)/.test(e.text) ||
    /^~(?:[A-Za-z_][A-Za-z0-9._-]*)?\//.test(joinLineContinuations(e.raw))
  );
}
//@ chunk-mthxbav8.js:50122-50711 placement
var PATH_ARG_RULES = {
    anchored: isAnchoredPath,
    takesNext: (e, n) =>
      e(n) ||
      (!n.startsWith("--") && Array.from(n).findIndex((r, s) => s > 0 && e("-" + r)) === n.length - 1),
    alsoLaunchers: new Set(["ionice", "chrt", "taskset", "xvfb-run"]),
    alsoValued: { sudo: new Set(["-r", "-t"]) },
    runuserIsSu: !0,
  },
  fo = [
    {
      anchored: (e) => e.text.startsWith("/"),
      takesNext: (e, n) => !n.includes("=") && (e(n) || (/^-[a-zA-Z]{2,}$/.test(n) && e("-" + n.at(-1)))),
      alsoLaunchers: new Set(),
      alsoValued: {},
      runuserIsSu: !1,
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
    { ...PATH_ARG_RULES, stepsPastVariable: !0 },
  ];
//@ chunk-mthxbav8.js:50711-50781 placement
function isLauncherCommand(e) {
  return COMMAND_WRAPPERS.has(e) || fo.some((n) => n.alsoLaunchers.has(e));
}
//@ chunk-mthxbav8.js:50781-50952 placement
function si(e) {
  let fill = Array(e.length + 1).fill(!1);
  for (let r = e.length - 1; r >= 0; r -= 1) {
    let text = e[r].text;
    fill[r] = text !== "--" && (/^(?:-[flmpPT]*u|--user(?:=|$))/.test(text) || fill[r + 1]);
  }
  return fill;
}
//@ chunk-mthxbav8.js:50952-51596 placement
var SHELL_KEYWORDS = new Set(["then", "do", "else", "elif", "if", "while", "until", "!"]),
  ai = new Set(["fi", "done", "esac", "}", "]]"]),
  TENGU_EVENTUAL_DRAGONFLY = "tengu_eventual_dragonfly",
  di = new Set(["time", "coproc", "function", "fi", "done", "esac"]),
  ci = new Set(["coproc", "function"]),
  ui = /^[A-Za-z_][A-Za-z0-9_]*(?:\[[^\]]*\])?\+?=/,
  oo = 6,
  Tt = " \t",
  fi = ` 	
;&|()<>`,
  ro = /^[A-Za-z_\u0080-\uffff][A-Za-z0-9_\u0080-\uffff]*$/,
  TENGU_TRANQUIL_DUCKLING = "tengu_tranquil_duckling",
  BOT_PROTECTED_TENGU_SABLE_THIMBLE = "bot_protected_tengu_sable_thimble",
  mi =
    "a case statement this check cannot follow, such as one with parentheses or the word esac inside a pattern",
  gi = ` 	
;`,
  fromCharCode = String.fromCharCode(96),
  _i = /(?:^|[^\\])(?:\\\\)*\\\n/,
  ki = /(?:^|[^\\])(?:\\\\)*\\$/;
//@ chunk-mthxbav8.js:51596-51667 placement
function Xt(e, n) {
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
function joinLineContinuations(e) {
  if (!e.includes("\\\n")) return e;
  let n = [],
    r = 0,
    s = -1;
  for (let u = 0; u < e.length; u += 1) {
    let S = e[u];
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
    )
      (n.push(e.slice(r, u - 1)), (r = u + 1));
    s = -1;
  }
  return (n.push(e.slice(r)), n.join(""));
}
//@ chunk-mthxbav8.js:51911-52140 placement
function unescapeDoubleQuoted(e) {
  if (!e.includes("\\")) return e;
  let n = "",
    r = 0;
  for (let s = 0; s < e.length; s += 1) {
    if (e[s] !== "\\") continue;
    let u = e[s + 1];
    if (
      u === "$" ||
      u === fromCharCode ||
      u === "\\" ||
      u ===
        `
`
    )
      ((n += e.slice(r, s)),
        (r =
          u ===
          `
`
            ? s + 2
            : s + 1),
        (s += 1));
  }
  return r === 0 ? e : n + e.slice(r);
}
//@ chunk-mthxbav8.js:52140-52193 placement
var io = /[ \t\n|]/,
  so = /@P\}/,
  Si = /\$'[^']*\\|"[^"]*\\/;
//@ chunk-mthxbav8.js:52193-52402 placement
function parseShellCommands(e, n = {}) {
  let r = new ShellReader(e, n.make === !0, n.quotedBackslashKept !== !1, n.substitutionHeredocs !== !1),
    tokens = r.tokens("eof", 0),
    u = [];
  for (let S of [tokens, ...r.bodies]) splitPipeline(S, n, u);
  return { commands: u, unreadable: r.unreadable };
}
//@ chunk-mthxbav8.js:52402-52507 placement
function shellComments(e, n = {}) {
  let r = new ShellReader(e, !1, n.quotedBackslashKept !== !1, !1);
  return (r.tokens("eof", 0), r.comments);
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
      return !0;
  }
  return !1;
}
//@ chunk-mthxbav8.js:52607-54329 placement
function splitPipeline(e, n, r) {
  let s = 0,
    u = 0,
    S = !1,
    w = !1,
    h = 0,
    v = 0;
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
        ((u -= 1), (S = !1), (s += 1));
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
      ((S = !1), (w = !1));
      continue;
    }
    if (y.kind === "op") {
      if (u > 0 && /^;[;&]|^;;&$/.test(y.op)) S = !0;
      if (y.op === "(" || y.op === "{") {
        if (((v += 1), w && h === 0)) h = v;
      } else if (y.op === ")" || y.op === "}") {
        if (v === h) h = 0;
        v = Math.max(0, v - 1);
      }
      if (y.op === "|" || y.op === "|&") w = !0;
      else if (
        y.op !==
          `
` &&
        y.op !== "(" &&
        y.op !== "{"
      )
        w = !1;
      s += 1;
      continue;
    }
    let C = [],
      O = [],
      x;
    while (s < e.length && e[s].kind !== "op") {
      let P = e[s];
      if (P.kind === "word") C.push(P.word);
      else if (P.kind === "redirect") O.push({ op: P.op, target: P.word });
      else if (P.kind === "heredoc" && P.body !== null) x = (x ?? "") + P.body;
      s += 1;
    }
    let R = w || h > 0;
    w = !1;
    let [j, ...M] = collectAllHeredocCommands(C, n),
      q =
        j ??
        (O.length > 0 || x !== void 0
          ? { program: { text: ":", quoted: !1, raw: ":" }, args: [], assignments: [] }
          : void 0);
    if (q === void 0) continue;
    let text = q.program.text;
    if (!q.program.quoted) {
      if (text === "case") {
        u += 1;
        let P = e[s];
        if (P?.kind === "op" && P.op === ")" && q.args.some((arg) => arg.text === "in")) s += 1;
        else S = !0;
        continue;
      }
      if (text === "esac") {
        if (
          ((u = Math.max(0, u - 1)),
          (O.length === 0 && x === void 0) || !readFlagWithOverride(TENGU_EVENTUAL_DRAGONFLY, { safe: !0 }))
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
      if (ai.has(text)) {
        if (O.length > 0 || x !== void 0)
          r.push({
            program: { text: ":", quoted: !1, raw: ":" },
            args: [],
            assignments: [],
            redirects: O,
            piped: R,
            ...(x !== void 0 && { heredoc: x }),
          });
        continue;
      }
    }
    for (let P of [q, ...M]) r.push({ ...P, redirects: O, piped: R, ...(x !== void 0 && { heredoc: x }) });
  }
}
//@ chunk-mthxbav8.js:54329-56016 placement
function collectHeredocBodies(e, n, r) {
  let s = [],
    u,
    S = !1,
    w,
    h = 0;
  for (;;) {
    while (h < e.length) {
      let R = e[h];
      if (ui.test(joinLineContinuations(R.raw))) s.push(R);
      else if (!(!R.quoted && SHELL_KEYWORDS.has(R.text))) break;
      h += 1;
    }
    let v = e[h];
    if (v === void 0)
      return s.length > 0
        ? { program: { text: ":", quoted: !1, raw: ":" }, args: [], assignments: s }
        : void 0;
    if (n.make && !v.quoted && /^[@+-]+./.test(v.text)) {
      let replaced = v.text.replace(/^[@+-]+/, "");
      v = { ...v, text: replaced, raw: replaced };
    }
    let lower = v.text.slice(v.text.lastIndexOf("/") + 1).toLowerCase();
    if (
      !(COMMAND_WRAPPERS.has(lower) || r.alsoLaunchers.has(lower)) ||
      /[ \t]/.test(v.text) ||
      (v.text.includes("/") && !r.anchored(v))
    ) {
      if (r.stepsPastVariable === !0 && S && v.text.startsWith("$") && e[h + 1] !== void 0) {
        ((w ??= { k: h, kept: s.length }), s.push(v), (h += 1));
        continue;
      }
      let R = v.text.startsWith("$") && !/^\$\((?:\u2026|\(\u2026\))\)/.test(v.text);
      if (w !== void 0 && (v.text.startsWith("-") || (!R && (v.quoted || v.expands === !0))))
        return { program: e[w.k], args: e.slice(w.k + 1), assignments: s.slice(0, w.kept) };
      return { program: v, args: e.slice(h + 1), assignments: s };
    }
    if (lower === "command") {
      let R = !1;
      for (let j = h + 1; e[j]?.text.startsWith("-") === !0; j += 1) R ||= BAt(e[j].text);
      if (R) return { program: v, args: e.slice(h + 1), assignments: s };
    }
    if (lower === "runuser" && r.runuserIsSu) {
      if (((u ??= si(e)), !u[h + 1])) return { program: v, args: e.slice(h + 1), assignments: s };
    }
    if (lower === "busybox") {
      (s.push(v), (h += 1));
      continue;
    }
    (s.push(v), (S = !0), (w = void 0), (h += 1));
    let C = ii[lower] ?? 0,
      O = (R) => (ri[lower]?.has(R) ?? !1) || (r.alsoValued[lower]?.has(R) ?? !1),
      x = !1;
    while (h < e.length) {
      let text = e[h].text;
      if (!x && text === "--") {
        (s.push(e[h]), (x = !0), (h += 1));
        continue;
      }
      if (!x && lower === "env" && text === "-") {
        (s.push({ ...e[h], text: "-i" }), (h += 1));
        continue;
      }
      if (!x && text.startsWith("-") && text !== "-") {
        let takesNext = r.takesNext(O, text);
        if ((s.push(e[h]), takesNext && e[h + 1] !== void 0)) s.push(e[h + 1]);
        h += takesNext ? 2 : 1;
        continue;
      }
      if (C > 0 && (lower !== "chrt" || /^\d+$/.test(text))) {
        (s.push(e[h]), (C -= 1), (h += 1));
        continue;
      }
      break;
    }
  }
}
//@ chunk-mthxbav8.js:56016-56200 placement
function collectAllHeredocCommands(e, n) {
  return fo
    .flatMap((r) => {
      let s = collectHeredocBodies(e, n, r);
      return s === void 0 ? [] : [s];
    })
    .filter(
      (r, s, u) =>
        u.findIndex((S) => S.program.raw === r.program.raw && S.args.length === r.args.length) === s,
    );
}
//@ chunk-mthxbav8.js:56200-56231 placement
function parseShellWords(e) {
  return collectAllHeredocCommands(e, {});
}
/**
 * 简化的 shell 词法/语法读取器：切分命令、引号、替换、heredoc，记录无法解析的位置。
 */
//@ chunk-mthxbav8.js:56231-69518 placement
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
  constructor(e, n, r, s) {
    this.text = e;
    this.make = n;
    this.quotedBackslashKept = r;
    this.substitutionHeredocs = s;
  }
  fail(e) {
    this.unreadable ??= e;
  }
  failUnlessSubscriptHoldsOff(e) {
    if (this.unreadable === null && readFlagWithOverride(TENGU_TRANQUIL_DUCKLING, { safe: !0 })) this.fail(e);
  }
  failUnlessCasePatternGroupHoldOff() {
    if (this.unreadable === null && readFlagWithOverride(BOT_PROTECTED_TENGU_SABLE_THIMBLE, { safe: !0 }))
      this.fail(mi);
  }
  pastContinuations(e, n = !1) {
    for (;;) {
      let r = Xt(this.text, e);
      if (r !== e) e = r;
      else if (n && e < this.text.length && Tt.includes(this.text[e])) e += 1;
      else return e;
    }
  }
  tooDeep(e) {
    if (e < oo) return !1;
    this.fail("command substitutions nested too deeply");
    let n = 1;
    while (this.pos < this.text.length && n > 0) {
      let r = this.text[this.pos];
      if (r === "(") n += 1;
      else if (r === ")") n -= 1;
      this.pos += 1;
    }
    return !0;
  }
  tokens(e, n) {
    let text = this.text,
      s = text.length,
      u = [],
      pending = this.pending,
      w = 0,
      h = 0,
      v = !1,
      y = !1,
      C = [],
      O = 0,
      x = !1,
      R = !0,
      j = !1;
    while (this.pos < s) {
      let M = text[this.pos];
      if (Tt.includes(M)) {
        this.pos += 1;
        continue;
      }
      if (
        M ===
        `
`
      ) {
        if (((this.pos += 1), pending.length > 0)) {
          let B = e === "array" ? n - 1 : n;
          if (this.substitutionHeredocs && pending[0].depth < B)
            this.fail(
              "a $( \u2026 ) or <( \u2026 ) that runs on past the end of a line which opened a heredoc of its own",
            );
          this.readHeredocBodies(pending.splice(0), n);
        }
        if (e === "array") continue;
        (u.push({
          kind: "op",
          op: `
`,
        }),
          (R = !0));
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
          ),
          Q = index === -1 ? s : index;
        (this.comments.push([this.pos, Q]), (this.pos = Q));
        continue;
      }
      if (e === "array") {
        if (M === ")") return ((this.pos += 1), u);
        if (";&|<>".includes(M) || M === "(") {
          (this.fail("an array assignment holds something other than words"), (this.pos += 1));
          continue;
        }
        u.push({ kind: "word", word: this.readWord(n, !1, !0) });
        continue;
      }
      let pastContinuations = this.pastContinuations(this.pos + 1),
        T = M + (text[pastContinuations] ?? ""),
        pastContinuations_2 = this.pastContinuations(pastContinuations + 1);
      if (T === ";;" && text[pastContinuations_2] === "&") {
        (u.push({ kind: "op", op: ";;&" }),
          (this.pos = pastContinuations_2 + 1),
          (y = h > 0),
          (O = u.length),
          (R = !0));
        continue;
      }
      if (T === "&&" || T === "||" || T === ";;" || T === ";&" || T === "|&") {
        if (
          (u.push({ kind: "op", op: T }),
          (this.pos = pastContinuations + 1),
          (T === ";;" || T === ";&") && h > 0)
        )
          ((y = !0), (O = u.length));
        R = !0;
        continue;
      }
      if (M === "(" && y && (T === "((" || x || hasNonNewlineTokenAfter(u, O, u.length)))
        this.failUnlessCasePatternGroupHoldOff();
      if (T === "((" && R) {
        let B = pastContinuations + 1,
          Q = findArithmeticClose(text, B);
        if (Q !== -1) {
          (this.collectExpansions(text.slice(B, Q - 2), n), (this.pos = Q), (R = !1));
          continue;
        }
      }
      if (M === "(") {
        if (((this.pos += 1), y)) {
          x = !0;
          continue;
        }
        ((w += 1), u.push({ kind: "op", op: "(" }), (R = !0));
        continue;
      }
      if (M === ")") {
        if (((this.pos += 1), y)) {
          (u.push({ kind: "op", op: ")" }), (y = !1));
          let B =
            text[this.pastContinuations(this.pos)] ??
            `
`;
          if (text[this.pastContinuations(this.pos, !0)] === "|" || (x && !gi.includes(B)))
            this.failUnlessCasePatternGroupHoldOff();
          ((x = !1), (R = !0));
          continue;
        }
        if (C.at(-1) === w) this.failUnlessCasePatternGroupHoldOff();
        if (w > 0) {
          ((w -= 1), u.push({ kind: "op", op: ")" }), (R = !0));
          continue;
        }
        if (e === "paren") {
          if (this.substitutionHeredocs && (pending.at(-1)?.depth ?? -1) >= n)
            this.fail(
              "a heredoc opened inside $( \u2026 ) or <( \u2026 ) whose closing ')' comes on the same line, before the heredoc's lines",
            );
          return u;
        }
        (this.fail("a closing parenthesis that closes nothing"), u.push({ kind: "op", op: ")" }));
        continue;
      }
      if (M === "&" && text[pastContinuations] === ">") {
        if (
          ((this.pos = text[pastContinuations_2] === ">" ? pastContinuations_2 + 1 : pastContinuations + 1),
          (this.pos = this.pastContinuations(this.pos, !0)),
          this.pos < s &&
            !`
;&|()`.includes(text[this.pos]))
        )
          u.push({ kind: "redirect", op: "&>", word: this.readWord(n) });
        R = !1;
        continue;
      }
      if (M === ";" || M === "&" || M === "|") {
        if (T === ";|" && h > 0) this.failUnlessCasePatternGroupHoldOff();
        (u.push({ kind: "op", op: M }), (this.pos += 1), (R = !0));
        continue;
      }
      if (M === "<" || M === ">") {
        if (y && T === "<<") this.failUnlessCasePatternGroupHoldOff();
        if (text[pastContinuations] === "(") {
          (u.push({ kind: "word", word: this.readWord(n) }), (R = !1));
          continue;
        }
        let B = pastContinuations,
          Q = T,
          ee = Q === "<<" ? this.pastContinuations(B + 1) : B;
        if (Q === "<<" && text[ee] !== "<") {
          this.pos = ee;
          let G = !1;
          if (text[this.pos] === "-") {
            if (ee !== B + 1)
              this.fail('a heredoc "-" that only a joined line continuation puts next to the <<');
            ((G = !0), (this.pos = this.pastContinuations(this.pos + 1)));
          }
          this.pos = this.pastContinuations(this.pos, !0);
          let word = this.readWord(n, !0);
          if (word.raw !== "") {
            if (Si.test(joinLineContinuations(word.raw)))
              this.fail("a heredoc delimiter this reading cannot spell as the shell does");
            if (word.text === "" && !word.quoted) this.fail("a heredoc delimiter that reads as empty");
            let Z = { kind: "heredoc", body: null };
            (u.push(Z),
              (R = !1),
              pending.push({ token: Z, delimiter: word.text, strip: G, expand: !word.quoted, depth: n }));
          }
          continue;
        }
        let D = Q === "<<" ? "<<<" : [">>", ">&", "<&", ">|", "<>"].includes(Q) ? Q : M;
        if (
          ((this.pos = D === "<<<" ? ee + 1 : D.length === 2 ? B + 1 : this.pos + 1),
          (this.pos = this.pastContinuations(this.pos, !0)),
          this.pos < s &&
            !`
;&|()`.includes(text[this.pos]))
        )
          u.push({ kind: "redirect", op: D, word: this.readWord(n) });
        R = !1;
        continue;
      }
      if (M === "{" || M === "}") {
        let pastContinuations = this.pastContinuations(this.pos + 1),
          Q =
            pastContinuations >= s ||
            (
              Tt +
              `
;&|()<>`
            ).includes(text[pastContinuations]);
        if (Q && R) {
          (u.push({ kind: "op", op: M }), (this.pos += 1), (R = !0));
          continue;
        }
        if (Q && M === "{") this.fail("a { that may open a group or may be an argument");
      }
      let match = /^[A-Za-z_][A-Za-z0-9_]*\+?=\(/.exec(text.slice(this.pos, this.pos + 256));
      if (match !== null) {
        if (y) this.failUnlessCasePatternGroupHoldOff();
        let pos = this.pos;
        if (((this.pos += match[0].length), !this.tooDeep(n + 1))) {
          this.tokens("array", n + 1);
          let pastContinuations = this.pastContinuations(this.pos),
            D =
              text[pastContinuations] ??
              `
`,
            G = (D === "<" || D === ">") && text[this.pastContinuations(pastContinuations + 1)] === "(",
            Y =
              D ===
                `
` ||
              (D === "\r" &&
                (text[pastContinuations + 1] ??
                  `
`) ===
                  `
`);
          if (G || !(Y || `${Tt};&|<>)`.includes(D)))
            this.failUnlessSubscriptHoldsOff(
              "text straight after the ) that closes name=( \u2026 ), which the shells read in different ways or refuse",
            );
        }
        let sliced = text.slice(pos, this.pos);
        (u.push({ kind: "word", word: { text: sliced, quoted: !1, raw: sliced } }), (R = !1));
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
      if ((u.push({ kind: "word", word: word }), !word.quoted)) {
        if (R && word.text === "case") {
          if (((v = !0), y || j)) this.failUnlessCasePatternGroupHoldOff();
        } else if (v && word.text === "in") ((v = !1), (h += 1), C.push(w), (y = !0), (O = u.length));
        else if (word.text === "esac" && h > 0 && (R || y)) {
          if (
            y &&
            (x ||
              "(<>".includes(text[this.pastContinuations(this.pos)] ?? " ") ||
              hasNonNewlineTokenAfter(u, O, u.length - 1))
          )
            this.failUnlessCasePatternGroupHoldOff();
          ((h -= 1), C.pop(), (y = !1), (x = !1));
        }
      }
      let F = R,
        X = j;
      ((j = F && !word.quoted && ci.has(word.text)),
        (R = X || (F && !word.quoted && (SHELL_KEYWORDS.has(word.text) || di.has(word.text)))));
    }
    if (e === "eof") pending.splice(0);
    if (h > 0 || y) this.fail("a case statement that is never closed");
    if (e !== "eof")
      this.fail(
        e === "array" ? "an array assignment that is never closed" : "a $( or ( that is never closed",
      );
    return u;
  }
  readWord(e, n = !1, r = !1) {
    let text = this.text,
      u = text.length,
      pos = this.pos,
      w = "",
      h = !1,
      v = !1,
      y = 0,
      C = !1,
      O = 0,
      x;
    while (this.pos < u) {
      let j = text[this.pos];
      if (j === "'") {
        h = !0;
        let index = text.indexOf("'", this.pos + 1);
        if (index === -1) {
          (this.fail("a single quote that is never closed"), (w += text.slice(this.pos + 1)), (this.pos = u));
          break;
        }
        ((w += text.slice(this.pos + 1, index)), (this.pos = index + 1));
        continue;
      }
      if (j === "$" && text[this.pos + 1] === "'") {
        h = !0;
        {
          let index = text.indexOf("'", this.pos + 2);
          if (text.slice(this.pos + 2, index === -1 ? u : index).includes("\\")) v = !0;
        }
        this.pos += 2;
        while (this.pos < u && text[this.pos] !== "'")
          if (text[this.pos] === "\\" && this.pos + 1 < u) ((w += text[this.pos + 1]), (this.pos += 2));
          else ((w += text[this.pos]), (this.pos += 1));
        if (this.pos >= u) {
          this.fail("a $' quote that is never closed");
          break;
        }
        this.pos += 1;
        continue;
      }
      if (j === '"' || (j === "$" && text[this.pos + 1] === '"')) {
        ((h = !0), (this.pos += j === "$" ? 2 : 1));
        while (this.pos < u && text[this.pos] !== '"') {
          let M = text[this.pos];
          if (M === "\\" && this.pos + 1 < u) {
            let q = text[this.pos + 1];
            ((w +=
              q ===
              `
`
                ? ""
                : q === "$" || q === fromCharCode || q === '"' || q === "\\"
                  ? q
                  : this.quotedBackslashKept
                    ? M + q
                    : q),
              (this.pos += 2));
          } else if (!n && M === "$" && text[this.pastContinuations(this.pos + 1)] === "(")
            w += this.readDollarParen(e, this.pastContinuations(this.pos + 1));
          else if (!n && M === fromCharCode) w += this.readBackticks(e);
          else if (M === "$" && text[this.pastContinuations(this.pos + 1)] === "{")
            ((w += this.readParameterExpansion(e, this.pastContinuations(this.pos + 1))), (v = !0));
          else {
            if (M === "$") v = !0;
            ((w += M), (this.pos += 1));
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
        )
          ((w += text[this.pos + 1]), (h = !0));
        this.pos += 2;
        continue;
      }
      if (j === "$" && text[this.pastContinuations(this.pos + 1)] === "{") {
        ((w += this.readParameterExpansion(e, this.pastContinuations(this.pos + 1))), (v = !0));
        continue;
      }
      if (!n && j === "$" && text[this.pastContinuations(this.pos + 1)] !== "(") v = !0;
      if (!n && j === "$" && text[this.pastContinuations(this.pos + 1)] === "(") {
        ((w += this.readDollarParen(e, this.pastContinuations(this.pos + 1))), (h = !0), (v = !0));
        continue;
      }
      if (!n && j === fromCharCode) {
        ((w += this.readBackticks(e)), (h = !0), (v = !0));
        continue;
      }
      if (!n && (j === "<" || j === ">") && text[this.pastContinuations(this.pos + 1)] === "(") {
        if (((this.pos = this.pastContinuations(this.pos + 1) + 1), !this.tooDeep(e + 1)))
          this.bodies.push(this.tokens("paren", e + 1));
        ((w += j + "(\u2026)"), (h = !0));
        continue;
      }
      if (fi.includes(j)) {
        if (y > 0)
          this.failUnlessSubscriptHoldsOff(
            "a [ still open at a space, tab, line break or one of ; & | < > ( ), where bash may read on to its ] and other shells end the word",
          );
        else if (j === "(" && O > 0 && /^\+?=/.test(w.slice(O)) && w.endsWith("="))
          this.failUnlessSubscriptHoldsOff(
            "an opening parenthesis after [\u2026]= or [\u2026]+= in the same word, as in a[1]=(x), which the shells read in different ways or refuse",
          );
        else if (j === "(" && !n && !r && x === !0 && w.endsWith("="))
          this.failUnlessSubscriptHoldsOff(
            "name=( that this reading did not take as an array, such as one with a line continuation or a second = before the parenthesis, a name hundreds of characters long or a non-ASCII name, which the shells read in different ways or refuse",
          );
        break;
      }
      if (j === "[") {
        if (y > 0) y += 1;
        else if (!C) {
          if (((C = !0), !n && !h && (r ? w === "" : ro.test(w)))) y = 1;
        }
      } else if (j === "]" && y > 0) {
        if (((y -= 1), y === 0)) O = w.length + 1;
      } else if (j === "=" && x === void 0) x = !h && ro.test(w.endsWith("+") ? w.slice(0, -1) : w);
      ((w += j), (this.pos += 1));
    }
    let sliced = text.slice(pos, this.pos);
    if (/\{[^{}'"]*(?:,|\.\.)[^{}'"]*\}/.test(sliced.replace(/'[^']*'|"[^"]*"/g, ""))) v = !0;
    return { text: w, quoted: h, raw: sliced, ...(v && { expands: v }) };
  }
  readParameterExpansion(e, n = this.pos + 1) {
    let text = this.text,
      s = text.length;
    this.pos = n + 1;
    let u = (v) => io.test(text[this.pastContinuations(v)] ?? "");
    if (u(this.pos)) this.fail("a ${ \u2026; } command substitution");
    let S = 1,
      w = !1;
    while (this.pos < s && S > 0) {
      let v = text[this.pos];
      if (v === "\\") this.pos += 2;
      else if (v === '"') ((w = !w), (this.pos += 1));
      else if (v === "'" && !w) {
        let index = text.indexOf("'", this.pos + 1),
          C = index === -1 ? s : index;
        (this.collectExpansions(text.slice(this.pos + 1, C), e), (this.pos = index === -1 ? s : index + 1));
      } else if (v === "'") this.pos += 1;
      else if (v === "$" && text[this.pastContinuations(this.pos + 1)] === "(")
        this.readDollarParen(e, this.pastContinuations(this.pos + 1));
      else if (v === fromCharCode) this.readBackticks(e);
      else if (v === "$" && text[this.pastContinuations(this.pos + 1)] === "{") {
        if (((S += 1), (this.pos = this.pastContinuations(this.pos + 1) + 1), u(this.pos)))
          this.fail("a ${ \u2026; } command substitution");
      } else {
        if (v === "}" && !w) S -= 1;
        this.pos += 1;
      }
    }
    if (S > 0) this.fail("a ${ that is never closed");
    let h = joinLineContinuations(text.slice(n, this.pos));
    if (so.test(h)) this.fail("a ${ \u2026@P } expansion");
    return "$" + h;
  }
  readDollarParen(e, n = this.pos + 1) {
    let text = this.text;
    if (text[n + 1] === "(") {
      let S = findArithmeticClose(text, n + 2);
      if (S !== -1)
        return (this.collectExpansions(text.slice(n + 2, S - 2), e), (this.pos = S), "$((\u2026))");
    }
    if (((this.pos = n + 1), this.tooDeep(e + 1))) return "$(\u2026)";
    let pos = this.pos,
      tokens = this.tokens("paren", e + 1);
    if (this.make) {
      let S = tokens[0];
      if (S?.kind === "word" && /^(?:shell|eval|call)$/.test(S.word.text))
        return (this.bodies.push(tokens.slice(1)), "$(\u2026)");
      return "$(" + this.text.slice(pos, Math.max(pos, this.pos - 1)) + ")";
    }
    return (this.bodies.push(tokens), "$(\u2026)");
  }
  readBackticks(e) {
    let text = this.text,
      r = text.length,
      s = this.pos + 1;
    while (s < r && text[s] !== fromCharCode) s += text[s] === "\\" ? 2 : 1;
    if (s >= r) this.fail("a backtick that is never closed");
    let u = new ShellReader(
      text.slice(this.pos + 1, Math.min(s, r)).replace(/\\([$\x60\\])/g, "$1"),
      this.make,
      this.quotedBackslashKept,
      this.substitutionHeredocs,
    );
    if (e + 1 > oo) this.fail("command substitutions nested too deeply");
    else if ((this.bodies.push(u.tokens("eof", e + 1), ...u.bodies), u.unreadable !== null))
      this.fail(u.unreadable);
    return ((this.pos = Math.min(s + 1, r)), "$(\u2026)");
  }
  collectExpansions(e, n) {
    if (so.test(joinLineContinuations(e))) this.fail("a ${ \u2026@P } expansion");
    let r = 0;
    while (r < e.length) {
      let s = e[r],
        u = s === "$" ? Xt(e, r + 1) : r + 1;
      if (s === "$" && e[u] === "(") {
        let S = new ShellReader(e.slice(r), this.make, this.quotedBackslashKept, this.substitutionHeredocs);
        if ((S.readDollarParen(n, u - r), this.bodies.push(...S.bodies), S.unreadable !== null))
          this.fail(S.unreadable);
        r += Math.max(S.pos, 1);
        continue;
      }
      if (s === "$" && e[u] === "{") {
        if (io.test(e[Xt(e, u + 1)] ?? "")) this.fail("a ${ \u2026; } command substitution");
      }
      if (s === "\\") r += 2;
      else if (s === fromCharCode) {
        let S = new ShellReader(e.slice(r), this.make, this.quotedBackslashKept, this.substitutionHeredocs);
        if ((S.readBackticks(n), this.bodies.push(...S.bodies), S.unreadable !== null))
          this.fail(S.unreadable);
        r += Math.max(S.pos, 1);
      } else r += 1;
    }
  }
  readHeredocBodies(e, n) {
    for (let r of e) {
      let line = this.findLine(r.delimiter, this.pos, r.strip),
        u =
          line === -1
            ? -1
            : this.text.indexOf(
                `
`,
                line,
              );
      if (r.expand && line !== -1 && this.unreadable === null && _i.test(this.text.slice(this.pos, line)))
        ({ at: line, lineEnd: u } = this.findJoinedLine(r.delimiter, this.pos, r.strip));
      if (line === -1) {
        this.fail("a heredoc is never terminated");
        break;
      }
      let sliced = this.text.slice(this.pos, line);
      if (r.expand) this.collectExpansions(joinLineContinuations(sliced), n);
      ((r.token.body = r.expand ? unescapeDoubleQuoted(sliced) : sliced),
        (this.pos = u === -1 ? this.text.length : u + 1));
    }
  }
  findJoinedLine(e, n, r) {
    let text = this.text,
      u = n;
    while (u <= text.length) {
      let S = "",
        w = u,
        h = -1;
      for (;;) {
        h = text.indexOf(
          `
`,
          w,
        );
        let sliced = text.slice(w, h === -1 ? text.length : h),
          y = h !== -1 && ki.test(sliced);
        if (((S += y ? sliced.slice(0, -1) : sliced), !y)) break;
        w = h + 1;
      }
      if ((r ? S.replace(/^\t+/, "") : S) === e) return { at: u, lineEnd: h };
      if (h === -1) return { at: -1, lineEnd: -1 };
      u = h + 1;
    }
    return { at: -1, lineEnd: -1 };
  }
  findLine(e, n, r) {
    if (this.lineIndex === null) {
      let w = new Map(),
        h = new Map(),
        v = 0;
      for (let y of this.text.split(`
`)) {
        let C = (O, x) => {
          let R = O.get(x);
          if (R === void 0) O.set(x, [v]);
          else R.push(v);
        };
        (C(w, y), C(h, y.replace(/^\t+/, "")), (v += y.length + 1));
      }
      ((this.lineIndex = w), (this.strippedLineIndex = h));
    }
    let s = (r ? this.strippedLineIndex : this.lineIndex).get(e);
    if (s === void 0) return -1;
    let u = 0,
      S = s.length;
    while (u < S) {
      let w = (u + S) >> 1;
      if (s[w] < n) u = w + 1;
      else S = w;
    }
    return u < s.length ? s[u] : -1;
  }
}
//@ chunk-mthxbav8.js:69518-69753 placement
function findArithmeticClose(e, n) {
  let min = Math.min(e.length, n + 4096),
    s = n,
    u = 0;
  while (s < min) {
    let S = e[s];
    if (S === "'" || S === '"') {
      let index = e.indexOf(S, s + 1);
      s = index === -1 ? min : index + 1;
      continue;
    }
    if (S === "(") u += 1;
    else if (S === ")") {
      if (u === 0) return e[s + 1] === ")" ? s + 2 : -1;
      u -= 1;
    }
    s += 1;
  }
  return -1;
}
//@ chunk-mthxbav8.js:69753-71241 placement
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
  ]),
  Ei = /^(?:DYLD_|LD_|BASH_FUNC_|GIT_CONFIG_|LUA_C?PATH)/,
  xi = new Set(["NULLCMD", "READNULLCMD"]),
  Ci =
    /^(?:GH_BROWSER|RSYNC_RSH|CVS_RSH|SOPS_GPG_EXEC|PERL5SHELL|RUBYSHELL|JAVACMD|CLOUDSDK_PYTHON|UV_PYTHON|RUSTC_WRAPPER|RUSTC_WORKSPACE_WRAPPER|npm_config_script_shell|NPM_CONFIG_SCRIPT_SHELL|R_(?:PROFILE|ENVIRON)(?:_USER)?|TAR_OPTIONS|BUN_OPTIONS|TF_CLI_ARGS\w*|CARGO_ALIAS_\w+|[A-Z0-9][A-Z0-9_]*_(?:EXTERNAL_DIFF|PAGER|EDITOR))$/,
  _o =
    /^(?!-)(?:[^\s]*\/[^\s]*|[^\s\/]+\.(?:sh|bash|zsh|fish|py|rb|pl|js|mjs|cjs|ts|php|lua|R|r|ps1|awk|tcl|exs?|jl))$/;
//@ chunk-mthxbav8.js:71241-71301 placement
function isToolEnvVar(e, n) {
  return TOOL_ENV_VARS.has(e) || Ei.test(e) || (n && xi.has(e));
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
        : null,
    u = s === "" ? "/" : s;
  return s === null
    ? [replaced]
    : [replaced, `~${u}`, `$HOME${u}`, `$HOME"${u}`, `\${HOME}${u}`, `\${HOME}"${u}`];
}
//@ chunk-mthxbav8.js:71665-74438 placement
var CWD_DEPENDENCE_PATTERN =
    /(?:^|[\s"'=(`:;&|<>])\.\.?\/|\bprocess\.cwd\(\)|\bos\.getcwd\(\)|\bPath\.cwd\(\)|\bDir\.pwd\b|\bgit\b[^\n]{0,12}\brev-parse\b[^\n]{0,6}--show-toplevel\b/im,
  Hi = /\$PWD\b|\$\{PWD\b|\$\(pwd(?:[ \t]+-[LP])?\)|`pwd`/im,
  Oi = /histchars|HISTCHARS/,
  Di = /^(?:bash|sh|zsh|dash|ash|(?:pd|lo|o|m|r)?ksh[0-9]*|rbash|fish|csh|tcsh|yash|posh|[oy]sh)$/i,
  Me = new Set([
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
  ]),
  sn = new Set([
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
  ]),
  Ii = {
    julia: /\.jl$/,
    elixir: /\.exs?$/,
    groovy: /\.groovy$/,
    racket: /\.rkt$/,
    guile: /\.scm$/,
    sbcl: /\.(?:lisp|cl)$/,
  },
  $i = new Set([
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
  ]),
  ko = /^--(?:version|help)$/,
  Ni = {
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
  },
  wo = {
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
function isEvalFlag(e, n) {
  switch (e) {
    case "node":
    case "nodejs":
    case "tsx":
    case "ts-node":
      return /^(?:-e|--eval|-p|--print)$/.test(n) || /^-[a-zA-Z]*[ep]$/.test(n);
    case "python":
    case "pypy":
      return /^-[bBdEhiIOPqRsSuvVx]*[cm]/.test(n);
    case "perl":
      return /^-[acfgnpsStTuUwWXl0-9]*[eE]$/.test(n);
    case "ruby":
      return /^-[acdhlnpsSUvwy]*e$/.test(n);
    case "php":
      return /^-[aeHilmnqsvw]*[rRBE]$/.test(n);
    case "lua":
    case "bb":
    case "osascript":
    case "rscript":
    case "erb":
      return n === "-e";
    default:
      return !1;
  }
}
//@ chunk-mthxbav8.js:74899-74998 placement
var PYTHON_IMPORT_PATTERN = /\bimport\b|__import__/,
  xo = /\bexec(?:file)?\b|\beval\b/,
  Mi = /\bimport\b|__import__|\bexec\b/;
//@ chunk-mthxbav8.js:74998-75077 placement
function commandBaseName(e) {
  let text = e.text;
  return text.slice(text.lastIndexOf("/") + 1).toLowerCase();
}
//@ chunk-mthxbav8.js:75077-75187 placement
function normalizeInterpreterName(e) {
  return e.replace(/^(python|pypy|perl|ruby|php|lua|node|nodejs|ksh|tclsh|wish)[0-9.]+t?$/, "$1");
}
//@ chunk-mthxbav8.js:75187-75243 placement
function isKnownInterpreter(e) {
  return Me.has(e) || sn.has(e) || INTERPRETER_NAME_PATTERN.test(e);
}
//@ chunk-mthxbav8.js:75243-75306 placement
var ABSOLUTE_PATH_PATTERN = /^[\/$]|^~(?=\/|$)/,
  ji = /^[\/$]|^~(?![+-])/,
  nt = /^[\/~$]/;
//@ chunk-mthxbav8.js:75306-75374 placement
function isAbsoluteLike(e, n = ji) {
  return (
    ABSOLUTE_PATH_PATTERN.test(e) ||
    (n.test(e) && !readFlagWithOverride(TENGU_FEDERATED_HEARTH, { safe: !0 }))
  );
}
//@ chunk-mthxbav8.js:75374-75431 placement
function isPathWord(e) {
  return isAbsoluteLike(e.text) || /^[<>]\(/.test(e.text);
}
//@ chunk-mthxbav8.js:75431-75510 placement
function isPlainArgument(e) {
  return e !== void 0 && e.text !== "" && !isPathWord(e) && !e.text.startsWith("-");
}

export {
  commandBaseName,
  isPlainArgument,
  isLauncherCommand,
  isAnchoredPath,
  normalizeInterpreterName,
  isPathWord,
  $i,
  ko,
  Me,
  sn,
  isKnownInterpreter,
  isAbsoluteLike,
  nt,
  Ii,
  parseShellWords,
  Ni,
  isEvalFlag,
  parseShellCommands,
  wo,
  splitQuotedWords,
  isToolEnvVar,
  Ci,
  _o,
  xo,
  Mi,
  PYTHON_IMPORT_PATTERN,
  Di,
  pathPrefixes,
  CWD_DEPENDENCE_PATTERN,
  Hi,
  Oi,
  shellComments,
};
