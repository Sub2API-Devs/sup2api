/**
 * utils/hooks/deviceHooks/shellReader.ts
 *
 * 2.1.316 新增：简化 shell 读取器（分词、管道、heredoc）
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * new in 2.1.318 (2.1.88 has no file at this path)
 * pieces: chunk-4z1ntdgk.js (40)
 * attribution: placement 32, layout 7, affinity 1
 */
import { COMMAND_WRAPPERS_2, WRAPPERS_WITH_TIMEOUT, WRAPPER_VALUE_OPTIONS } from "./vouching.js";
import { quote } from "../../bash/shellQuote.js";
import { readFlagWithOverride } from "../../../services/analytics/flagOverrides.js";
import { isVersionOnlyFlag } from "../../bash/parser.js";
import { INTERPRETER_NAME_PATTERN } from "../hookCommandAnalysis.js";
import { TENGU_FEDERATED_HEARTH, TENGU_COMPOSED_KITE } from "./commandReach.js";
import { firstLineOf } from "../../stringUtils.js";
import { deferInit } from "../../../../runtime/deferred-init.js";

//@ chunk-4z1ntdgk.js:50479-50657 placement
function isAnchoredPath(program) {
  return (
    /^(?:\/|\$(?!\{?(?:CURDIR|PWD)\b)(?:[A-Za-z_][A-Za-z0-9_]*|\{[A-Za-z_][A-Za-z0-9_]*\})\/)/.test(
      program.text,
    ) || /^~(?:[A-Za-z_][A-Za-z0-9._-]*)?\//.test(joinLineContinuations(program.raw))
  );
}
//@ chunk-4z1ntdgk.js:50657-51246 placement
/**
 * 路径参数的解析规则集：哪些选项取下一个词、哪些启动器/带值选项、是否按 su 语义处理 runuser 等。
 */
var PATH_ARG_RULES; // deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
var PATH_ARG_RULESET;
deferInit("chunk-4z1ntdgk.js:50657", () => {
  PATH_ARG_RULES = {
    anchored: isAnchoredPath,
    takesNext: (isAnchored, arg) =>
      isAnchored(arg) ||
      (!arg.startsWith("--") &&
        Array.from(arg).findIndex((char, charIndex) => charIndex > 0 && isAnchored("-" + char)) ===
          arg.length - 1),
    alsoLaunchers: new Set(["ionice", "chrt", "taskset", "xvfb-run"]),
    alsoValued: {
      sudo: new Set(["-r", "-t"]),
    },
    runuserIsSu: true,
  };
  PATH_ARG_RULESET = [
    {
      anchored: (arg) => arg.text.startsWith("/"),
      takesNext: (isAnchored, arg) =>
        !arg.includes("=") &&
        (isAnchored(arg) || (/^-[a-zA-Z]{2,}$/.test(arg) && isAnchored("-" + arg.at(-1)))),
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
});
//@ chunk-4z1ntdgk.js:51246-51316 placement
function isLauncherCommand(name) {
  return COMMAND_WRAPPERS_2.has(name) || PATH_ARG_RULESET.some((rules) => rules.alsoLaunchers.has(name));
}
//@ chunk-4z1ntdgk.js:51316-51487 placement
function computeUserOptionFill(words) {
  let filled = Array(words.length + 1).fill(false);
  for (let wordIndex = words.length - 1; wordIndex >= 0; wordIndex -= 1) {
    let text = words[wordIndex].text;
    filled[wordIndex] =
      text !== "--" && (/^(?:-[flmpPT]*u|--user(?:=|$))/.test(text) || filled[wordIndex + 1]);
  }
  return filled;
}
//@ chunk-4z1ntdgk.js:51487-51800 placement
/**
 * shell 解析用关键字集合（then/do/else/if 等）、块结束词（fi/done/esac）、控制词、赋值词正则、命令替换嵌套上限与若干转义/续行正则。
 */
var SHELL_KEYWORDS; // deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
var SHELL_BLOCK_CLOSERS;
var TENGU_EVENTUAL_DRAGONFLY;
var REPEAT_PREFIX_WORDS;
var SHELL_CONTROL_WORDS;
var SHELL_COMPOUND_OPENERS;
var LOOP_WORD_RE;
deferInit("chunk-4z1ntdgk.js:51487", () => {
  SHELL_KEYWORDS = new Set(["then", "do", "else", "elif", "if", "while", "until", "!"]);
  SHELL_BLOCK_CLOSERS = new Set(["fi", "done", "esac", "}", "]]"]);
  TENGU_EVENTUAL_DRAGONFLY = "tengu_eventual_dragonfly";
  REPEAT_PREFIX_WORDS = new Set(["repeat", "noglob", "nocorrect", "-"]);
  SHELL_CONTROL_WORDS = new Set(["time", "coproc", "function", "fi", "done", "esac"]);
  SHELL_COMPOUND_OPENERS = new Set(["coproc", "function"]);
  LOOP_WORD_RE = /^(?:for|foreach|select)$/;
});
//@ chunk-4z1ntdgk.js:51800-51896 layout (2.1.88 match: quote, 0.751)
function quote_2(args) {
  let index = args.findIndex((arg, argIndex) => argIndex > 0 && !arg.quoted && arg.text === "in");
  return index === -1 ? args.length : index;
}
//@ chunk-4z1ntdgk.js:51896-51969 placement
var ALNUM_NAME_RE = /^[A-Za-z0-9_]+$/;
var ASSIGNMENT_WORD_RE = /^[A-Za-z_][A-Za-z0-9_]*(?:\[[^\]]*\])?\+?=/;
//@ chunk-4z1ntdgk.js:52032-52397 affinity
var MAX_SUBSTITUTION_DEPTH; // deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
var WHITESPACE_CHARS;
var SHELL_META_CHARS;
var IDENTIFIER_RE;
var TENGU_TRANQUIL_DUCKLING;
var BOT_PROTECTED_TENGU_SABLE_THIMBLE;
var CASE_FOLLOW_UNSUPPORTED_TEXT;
var PIPE_TERMINATORS;
var BACKTICK;
var CONTINUED_LINE_RE;
var TRAILING_BACKSLASH_RE;
deferInit("chunk-4z1ntdgk.js:52032", () => {
  MAX_SUBSTITUTION_DEPTH = 6;
  WHITESPACE_CHARS = " \t";
  SHELL_META_CHARS = ` 	
;&|()<>`;
  IDENTIFIER_RE = /^[A-Za-z_\u0080-\uffff][A-Za-z0-9_\u0080-\uffff]*$/;
  TENGU_TRANQUIL_DUCKLING = "tengu_tranquil_duckling";
  BOT_PROTECTED_TENGU_SABLE_THIMBLE = "bot_protected_tengu_sable_thimble";
  CASE_FOLLOW_UNSUPPORTED_TEXT =
    "a case statement this check cannot follow, such as one with parentheses or the word esac inside a pattern";
  PIPE_TERMINATORS = ` 	
;`;
  BACKTICK = String.fromCharCode(96);
  CONTINUED_LINE_RE = /(?:^|[^\\])(?:\\\\)*\\\n/;
  TRAILING_BACKSLASH_RE = /(?:^|[^\\])(?:\\\\)*\\$/;
});
//@ chunk-4z1ntdgk.js:52397-52468 placement
function skipLineContinuations(text, index) {
  let cursor = index;
  while (
    text[cursor] === "\\" &&
    text[cursor + 1] ===
      `
`
  )
    cursor += 2;
  return cursor;
}
//@ chunk-4z1ntdgk.js:52468-52712 placement
function joinLineContinuations(raw) {
  if (!raw.includes("\\\n")) return raw;
  let parts = [];
  let start = 0;
  let backslashAt = -1;
  for (let index = 0; index < raw.length; index += 1) {
    let char = raw[index];
    if (char === "\\") {
      if (backslashAt === -1) backslashAt = index;
      continue;
    }
    if (
      char ===
        `
` &&
      backslashAt !== -1 &&
      (index - backslashAt) % 2 === 1
    ) {
      parts.push(raw.slice(start, index - 1));
      start = index + 1;
    }
    backslashAt = -1;
  }
  parts.push(raw.slice(start));
  return parts.join("");
}
//@ chunk-4z1ntdgk.js:52712-52941 placement
function unescapeDoubleQuoted(text) {
  if (!text.includes("\\")) return text;
  let out = "";
  let copied = 0;
  for (let index = 0; index < text.length; index += 1) {
    if (text[index] !== "\\") continue;
    let next = text[index + 1];
    if (
      next === "$" ||
      next === BACKTICK ||
      next === "\\" ||
      next ===
        `
`
    ) {
      out += text.slice(copied, index);
      copied =
        next ===
        `
`
          ? index + 2
          : index + 1;
      index += 1;
    }
  }
  return copied === 0 ? text : out + text.slice(copied);
}
//@ chunk-4z1ntdgk.js:52941-52994 placement
var WHITESPACE_OR_PIPE_RE = /[ \t\n|]/;
var PARAMETER_EXPANSION_RE = /@P\}/;
var QUOTED_BACKSLASH_RE = /\$'[^']*\\|"[^"]*\\/;
//@ chunk-4z1ntdgk.js:52994-53226 placement
function parseShellCommands(text, options = {}) {
  let reader = new ShellReader(
    text,
    options.make === true,
    options.quotedBackslashKept !== false,
    options.substitutionHeredocs !== false,
  );
  let tokens = reader.tokens("eof", 0);
  let commands = [];
  let firstResult = null;
  for (let tokenList of [tokens, ...reader.bodies]) {
    let result = splitPipeline(tokenList, options, commands);
    firstResult ??= result;
  }
  return {
    commands,
    unreadable: reader.unreadable ?? firstResult,
  };
}
//@ chunk-4z1ntdgk.js:53226-53331 placement
function shellComments(text, options = {}) {
  let reader = new ShellReader(text, false, options.quotedBackslashKept !== false, false);
  reader.tokens("eof", 0);
  return reader.comments;
}
//@ chunk-4z1ntdgk.js:53331-53431 placement
function hasNonNewlineTokenAfter(tokens, from, to) {
  for (let index = from; index < to; index += 1) {
    let token = tokens[index];
    if (
      token?.kind !== "op" ||
      token.op !==
        `
`
    )
      return true;
  }
  return false;
}
//@ chunk-4z1ntdgk.js:53431-56941 placement
function splitPipeline(tokens, options, commands) {
  let splitReason = null;
  let index = 0;
  let caseDepth = 0;
  let skipToEsac = false;
  let afterPipe = false;
  let groupStart = 0;
  let parenDepth = 0;
  while (index < tokens.length) {
    let token = tokens[index];
    if (skipToEsac) {
      if (
        token.kind === "op" &&
        token.op ===
          `
`
      ) {
        index += 1;
        continue;
      }
      if (token.kind === "word" && token.word.text === "esac" && !token.word.quoted) {
        caseDepth -= 1;
        skipToEsac = false;
        index += 1;
        continue;
      }
      while (index < tokens.length) {
        let token = tokens[index];
        if (
          (token.kind === "op" && token.op === ")") ||
          (token.kind === "word" && token.word.text === "esac" && !token.word.quoted)
        )
          break;
        index += 1;
      }
      if (tokens[index]?.kind === "op") index += 1;
      skipToEsac = false;
      afterPipe = false;
      continue;
    }
    if (token.kind === "op") {
      if (caseDepth > 0 && /^;[;&]|^;;&$/.test(token.op)) skipToEsac = true;
      if (token.op === "(" || token.op === "{") {
        parenDepth += 1;
        if (afterPipe && groupStart === 0) groupStart = parenDepth;
      } else if (token.op === ")" || token.op === "}") {
        if (parenDepth === groupStart) groupStart = 0;
        parenDepth = Math.max(0, parenDepth - 1);
      }
      if (token.op === "|" || token.op === "|&") afterPipe = true;
      else if (
        token.op !==
          `
` &&
        token.op !== "(" &&
        token.op !== "{"
      )
        afterPipe = false;
      index += 1;
      continue;
    }
    let words = [];
    let redirects = [];
    let heredoc;
    while (index < tokens.length && tokens[index].kind !== "op") {
      let token = tokens[index];
      if (token.kind === "word") words.push(token.word);
      else if (token.kind === "redirect")
        redirects.push({
          op: token.op,
          target: token.word,
        });
      else if (token.kind === "heredoc" && token.body !== null) heredoc = (heredoc ?? "") + token.body;
      index += 1;
    }
    let piped = afterPipe || groupStart > 0;
    afterPipe = false;
    let commandList = heredocCommandLists(words, options);
    let afterConditional = [];
    let conditionalAt = options.commandAfterConditional === false ? -1 : words.findIndex(quote);
    for (let firstPass = true; conditionalAt !== -1; firstPass = false) {
      let wordIndex = conditionalAt;
      let ok = true;
      while (wordIndex < words.length && !words[wordIndex].quoted) {
        let word = words[wordIndex];
        if (word.text === "[[") {
          wordIndex += 1;
          while (wordIndex < words.length && (words[wordIndex].quoted || words[wordIndex].text !== "]]"))
            wordIndex += 1;
          if (wordIndex === words.length) {
            ok = false;
            break;
          }
        } else if (!SHELL_KEYWORDS.has(word.text) && word.text !== "]]") break;
        wordIndex += 1;
      }
      if (!ok) break;
      let commandLimit = wordIndex;
      while (commandLimit < words.length && !quote(words[commandLimit])) commandLimit += 1;
      for (let command of heredocCommandLists(
        firstPass ? words.slice(wordIndex) : words.slice(wordIndex, commandLimit),
        options,
      ))
        if (command.program.quoted || !SHELL_BLOCK_CLOSERS.has(command.program.text)) {
          afterConditional.push(command);
          commands.push({
            ...command,
            redirects,
            piped,
            ...(heredoc !== undefined && {
              heredoc,
            }),
          });
        }
      conditionalAt = commandLimit < words.length ? commandLimit : -1;
    }
    let currentToken = tokens[index];
    let allCommands = [...commandList, ...afterConditional];
    let found = (options.commandAfterConditional === false ? commandList.slice(0, 1) : allCommands).find(
      (command) => !command.program.quoted && LOOP_WORD_RE.test(command.program.text),
    );
    let quoteLimit = found === undefined ? 0 : quote_2(found.args);
    if (
      options.shortLoopLists !== false &&
      currentToken?.kind === "op" &&
      currentToken.op === "(" &&
      found !== undefined &&
      !found.program.quoted &&
      LOOP_WORD_RE.test(found.program.text) &&
      found.args.length > 0 &&
      found.args.every(
        (arg, argIndex) =>
          argIndex === 0 || arg.quoted || argIndex > quoteLimit || !SHELL_KEYWORDS.has(arg.text),
      )
    ) {
      let hasLoopWord = quoteLimit < found.args.length;
      let loopWords = [];
      for (let tokenIndex = index + 1; tokenIndex < tokens.length; tokenIndex += 1) {
        let nextToken = tokens[tokenIndex];
        if (nextToken.kind === "word") loopWords.push(nextToken.word);
        else if (nextToken.kind === "op" && nextToken.op === ")") {
          let afterToken = tokens[tokenIndex + 1];
          if (
            hasLoopWord &&
            afterToken !== undefined &&
            !(
              afterToken.kind === "op" &&
              (afterToken.op === ";" ||
                afterToken.op ===
                  `
`)
            )
          ) {
            splitReason ??=
              "more text after a parenthesized group in a loop's 'in' list, which this reading does not follow: in zsh the group is part of a longer file pattern";
            break;
          }
          for (let command of allCommands)
            if (command.program === found.program) command.args.push(...loopWords);
          break;
        } else if (nextToken.kind === "op" && nextToken.op === "(") {
          splitReason ??=
            "a second parenthesis inside a loop's parenthesized word list, which this reading does not follow: in zsh it can be part of a file pattern or a substitution that runs a command";
          break;
        } else if (
          nextToken.kind !== "op" ||
          (nextToken.op !== ";" &&
            nextToken.op !==
              `
`)
        ) {
          splitReason ??=
            "a redirection or an operator inside a loop's parenthesized word list, which this reading does not follow: to zsh '(a|b)' and '<1-9>' there are patterns that match files";
          break;
        }
      }
    }
    let [first, ...rest] = commandList;
    let command =
      first ??
      (redirects.length > 0 || heredoc !== undefined
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
    if (command === undefined) continue;
    let text = command.program.text;
    if (!command.program.quoted) {
      if (text === "case") {
        caseDepth += 1;
        let token = tokens[index];
        if (token?.kind === "op" && token.op === ")" && command.args.some((arg) => arg.text === "in"))
          index += 1;
        else skipToEsac = true;
        continue;
      }
      if (text === "esac") {
        caseDepth = Math.max(0, caseDepth - 1);
        if (
          (redirects.length === 0 && heredoc === undefined) ||
          !readFlagWithOverride(TENGU_EVENTUAL_DRAGONFLY, {
            safe: true,
          })
        )
          continue;
      }
      if (text === "[[") {
        if (!words.some((word) => word.text === "]]" && !word.quoted)) {
          while (index < tokens.length) {
            let token = tokens[index];
            if (
              (token.kind === "word" && token.word.text === "]]") ||
              (token.kind === "op" &&
                token.op ===
                  `
`)
            )
              break;
            index += 1;
          }
          if (tokens[index]?.kind === "word") index += 1;
        }
        continue;
      }
      if (SHELL_BLOCK_CLOSERS.has(text)) {
        if (redirects.length > 0 || heredoc !== undefined)
          commands.push({
            program: {
              text: ":",
              quoted: false,
              raw: ":",
            },
            args: [],
            assignments: [],
            redirects,
            piped,
            ...(heredoc !== undefined && {
              heredoc,
            }),
          });
        continue;
      }
    }
    for (let command_2 of [command, ...rest])
      commands.push({
        ...command_2,
        redirects,
        piped,
        ...(heredoc !== undefined && {
          heredoc,
        }),
      });
  }
  return splitReason;
}
//@ chunk-4z1ntdgk.js:56941-58723 placement
function collectHeredocBodies(words, options, rules, commandAfterConditional) {
  let kept = [];
  let userFill;
  let sawWrapper = false;
  let saved;
  let index = 0;
  for (;;) {
    while (index < words.length) {
      let word = words[index];
      if (ASSIGNMENT_WORD_RE.test(joinLineContinuations(word.raw))) kept.push(word);
      else if (commandAfterConditional && REPEAT_PREFIX_WORDS.has(word.text)) {
        kept.push(word);
        if (word.text === "repeat" && words[index + 1] !== undefined) {
          index += 1;
          kept.push(words[index]);
        }
      } else if (!(!word.quoted && SHELL_KEYWORDS.has(word.text))) break;
      index += 1;
    }
    let word = words[index];
    if (word === undefined)
      return kept.length > 0
        ? {
            program: {
              text: ":",
              quoted: false,
              raw: ":",
            },
            args: [],
            assignments: kept,
          }
        : undefined;
    if (options.make && !word.quoted && /^[@+-]+./.test(word.text)) {
      let replaced = word.text.replace(/^[@+-]+/, "");
      word = {
        ...word,
        text: replaced,
        raw: replaced,
      };
    }
    let lower = word.text.slice(word.text.lastIndexOf("/") + 1).toLowerCase();
    if (
      !(COMMAND_WRAPPERS_2.has(lower) || rules.alsoLaunchers.has(lower)) ||
      /[ \t]/.test(word.text) ||
      (word.text.includes("/") && !rules.anchored(word))
    ) {
      if (
        rules.stepsPastVariable === true &&
        sawWrapper &&
        word.text.startsWith("$") &&
        words[index + 1] !== undefined
      ) {
        saved ??= {
          k: index,
          kept: kept.length,
        };
        kept.push(word);
        index += 1;
        continue;
      }
      let isDollarVar = word.text.startsWith("$") && !/^\$\((?:\u2026|\(\u2026\))\)/.test(word.text);
      if (
        saved !== undefined &&
        (word.text.startsWith("-") || (!isDollarVar && (word.quoted || word.expands === true)))
      )
        return {
          program: words[saved.k],
          args: words.slice(saved.k + 1),
          assignments: kept.slice(0, saved.kept),
        };
      return {
        program: word,
        args: words.slice(index + 1),
        assignments: kept,
      };
    }
    if (lower === "command") {
      let anyVersionFlag = false;
      for (let index_2 = index + 1; words[index_2]?.text.startsWith("-") === true; index_2 += 1)
        anyVersionFlag ||= isVersionOnlyFlag(words[index_2].text);
      if (anyVersionFlag)
        return {
          program: word,
          args: words.slice(index + 1),
          assignments: kept,
        };
    }
    if (lower === "runuser" && rules.runuserIsSu) {
      userFill ??= computeUserOptionFill(words);
      if (!userFill[index + 1])
        return {
          program: word,
          args: words.slice(index + 1),
          assignments: kept,
        };
    }
    if (lower === "busybox") {
      kept.push(word);
      index += 1;
      continue;
    }
    kept.push(word);
    sawWrapper = true;
    saved = undefined;
    index += 1;
    let valuesLeft = WRAPPERS_WITH_TIMEOUT[lower] ?? 0;
    let takesValue = (text) =>
      (WRAPPER_VALUE_OPTIONS[lower]?.has(text) ?? false) || (rules.alsoValued[lower]?.has(text) ?? false);
    let sawDoubleDash = false;
    while (index < words.length) {
      let text = words[index].text;
      if (!sawDoubleDash && text === "--") {
        kept.push(words[index]);
        sawDoubleDash = true;
        index += 1;
        continue;
      }
      if (!sawDoubleDash && lower === "env" && text === "-") {
        kept.push({
          ...words[index],
          text: "-i",
        });
        index += 1;
        continue;
      }
      if (!sawDoubleDash && text.startsWith("-") && text !== "-") {
        let takesNext = rules.takesNext(takesValue, text);
        kept.push(words[index]);
        if (takesNext && words[index + 1] !== undefined) kept.push(words[index + 1]);
        index += takesNext ? 2 : 1;
        continue;
      }
      if (valuesLeft > 0 && (lower !== "chrt" || /^\d+$/.test(text))) {
        kept.push(words[index]);
        valuesLeft -= 1;
        index += 1;
        continue;
      }
      break;
    }
  }
}
//@ chunk-4z1ntdgk.js:58723-58997 layout
function heredocCommandLists(words, options) {
  return (
    options.commandAfterConditional !== false && words.some((word) => REPEAT_PREFIX_WORDS.has(word.text))
      ? [false, true]
      : [false]
  )
    .flatMap((commandAfterConditional) =>
      PATH_ARG_RULESET.flatMap((rules) => {
        let heredocBodies = collectHeredocBodies(words, options, rules, commandAfterConditional);
        return heredocBodies === undefined ? [] : [heredocBodies];
      }),
    )
    .filter(
      (body, bodyIndex, matchIndex) =>
        matchIndex.findIndex(
          (entry) => entry.program.raw === body.program.raw && entry.args.length === body.args.length,
        ) === bodyIndex,
    );
}
//@ chunk-4z1ntdgk.js:58997-59032 placement
function parseShellWords(words, options = {}) {
  return heredocCommandLists(words, options);
}
//@ chunk-4z1ntdgk.js:59032-72319 placement
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
  fail(reason) {
    this.unreadable ??= reason;
  }
  failUnlessSubscriptHoldsOff(reason) {
    if (
      this.unreadable === null &&
      readFlagWithOverride(TENGU_TRANQUIL_DUCKLING, {
        safe: true,
      })
    )
      this.fail(reason);
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
  pastContinuations(index, skipSpaces = false) {
    for (;;) {
      let next = skipLineContinuations(this.text, index);
      if (next !== index) index = next;
      else if (skipSpaces && index < this.text.length && WHITESPACE_CHARS.includes(this.text[index]))
        index += 1;
      else return index;
    }
  }
  tooDeep(depth) {
    if (depth < MAX_SUBSTITUTION_DEPTH) return false;
    this.fail("command substitutions nested too deeply");
    let open = 1;
    while (this.pos < this.text.length && open > 0) {
      let char = this.text[this.pos];
      if (char === "(") open += 1;
      else if (char === ")") open -= 1;
      this.pos += 1;
    }
    return true;
  }
  tokens(mode, depth) {
    let text = this.text;
    let end = text.length;
    let out = [];
    let pending = this.pending;
    let parenClosers = 0;
    let caseDepth = 0;
    let sawCaseKeyword = false;
    let inCasePatterns = false;
    let parenDepthStack = [];
    let patternStart = 0;
    let inCaseParen = false;
    let atCommandStart = true;
    let sawCompoundOpener = false;
    while (this.pos < end) {
      let char = text[this.pos];
      if (WHITESPACE_CHARS.includes(char)) {
        this.pos += 1;
        continue;
      }
      if (
        char ===
        `
`
      ) {
        this.pos += 1;
        if (pending.length > 0) {
          let maxDepth = mode === "array" ? depth - 1 : depth;
          if (this.substitutionHeredocs && pending[0].depth < maxDepth)
            this.fail(
              "a $( \u2026 ) or <( \u2026 ) that runs on past the end of a line which opened a heredoc of its own",
            );
          this.readHeredocBodies(pending.splice(0), depth);
        }
        if (mode === "array") continue;
        out.push({
          kind: "op",
          op: `
`,
        });
        atCommandStart = true;
        continue;
      }
      if (
        char === "\\" &&
        text[this.pos + 1] ===
          `
`
      ) {
        this.pos += 2;
        continue;
      }
      if (char === "#") {
        let index = text.indexOf(
          `
`,
          this.pos,
        );
        let lineEnd = index === -1 ? end : index;
        this.comments.push([this.pos, lineEnd]);
        this.pos = lineEnd;
        continue;
      }
      if (mode === "array") {
        if (char === ")") {
          this.pos += 1;
          return out;
        }
        if (";&|<>".includes(char) || char === "(") {
          this.fail("an array assignment holds something other than words");
          this.pos += 1;
          continue;
        }
        out.push({
          kind: "word",
          word: this.readWord(depth, false, true),
        });
        continue;
      }
      let nextIndex = this.pastContinuations(this.pos + 1);
      let pair = char + (text[nextIndex] ?? "");
      let afterPair = this.pastContinuations(nextIndex + 1);
      if (pair === ";;" && text[afterPair] === "&") {
        out.push({
          kind: "op",
          op: ";;&",
        });
        this.pos = afterPair + 1;
        inCasePatterns = caseDepth > 0;
        patternStart = out.length;
        atCommandStart = true;
        continue;
      }
      if (pair === "&&" || pair === "||" || pair === ";;" || pair === ";&" || pair === "|&") {
        out.push({
          kind: "op",
          op: pair,
        });
        this.pos = nextIndex + 1;
        if ((pair === ";;" || pair === ";&") && caseDepth > 0) {
          inCasePatterns = true;
          patternStart = out.length;
        }
        atCommandStart = true;
        continue;
      }
      if (
        char === "(" &&
        inCasePatterns &&
        (pair === "((" || inCaseParen || hasNonNewlineTokenAfter(out, patternStart, out.length))
      )
        this.failUnlessCasePatternGroupHoldOff();
      if (pair === "((" && atCommandStart) {
        let bodyStart = nextIndex + 1;
        let arithmeticClose = findArithmeticClose(text, bodyStart);
        if (arithmeticClose !== -1) {
          this.collectExpansions(text.slice(bodyStart, arithmeticClose - 2), depth);
          this.pos = arithmeticClose;
          atCommandStart = false;
          continue;
        }
      }
      if (char === "(") {
        this.pos += 1;
        if (inCasePatterns) {
          inCaseParen = true;
          continue;
        }
        parenClosers += 1;
        out.push({
          kind: "op",
          op: "(",
        });
        atCommandStart = true;
        continue;
      }
      if (char === ")") {
        this.pos += 1;
        if (inCasePatterns) {
          out.push({
            kind: "op",
            op: ")",
          });
          inCasePatterns = false;
          let nextChar =
            text[this.pastContinuations(this.pos)] ??
            `
`;
          if (
            text[this.pastContinuations(this.pos, true)] === "|" ||
            (inCaseParen && !PIPE_TERMINATORS.includes(nextChar))
          )
            this.failUnlessCasePatternGroupHoldOff();
          inCaseParen = false;
          atCommandStart = true;
          continue;
        }
        if (parenDepthStack.at(-1) === parenClosers) this.failUnlessCasePatternGroupHoldOff();
        if (parenClosers > 0) {
          parenClosers -= 1;
          out.push({
            kind: "op",
            op: ")",
          });
          atCommandStart = true;
          continue;
        }
        if (mode === "paren") {
          if (this.substitutionHeredocs && (pending.at(-1)?.depth ?? -1) >= depth)
            this.fail(
              "a heredoc opened inside $( \u2026 ) or <( \u2026 ) whose closing ')' comes on the same line, before the heredoc's lines",
            );
          return out;
        }
        this.fail("a closing parenthesis that closes nothing");
        out.push({
          kind: "op",
          op: ")",
        });
        continue;
      }
      if (char === "&" && text[nextIndex] === ">") {
        this.pos = text[afterPair] === ">" ? afterPair + 1 : nextIndex + 1;
        this.pos = this.pastContinuations(this.pos, true);
        if (
          this.pos < end &&
          !`
;&|()`.includes(text[this.pos])
        )
          out.push({
            kind: "redirect",
            op: "&>",
            word: this.readWord(depth),
          });
        atCommandStart = false;
        continue;
      }
      if (char === ";" || char === "&" || char === "|") {
        if (pair === ";|" && caseDepth > 0) this.failUnlessCasePatternGroupHoldOff();
        out.push({
          kind: "op",
          op: char,
        });
        this.pos += 1;
        atCommandStart = true;
        continue;
      }
      if (char === "<" || char === ">") {
        if (inCasePatterns && pair === "<<") this.failUnlessCasePatternGroupHoldOff();
        if (text[nextIndex] === "(") {
          out.push({
            kind: "word",
            word: this.readWord(depth),
          });
          atCommandStart = false;
          continue;
        }
        let at = nextIndex;
        let op = pair;
        let heredocStart = op === "<<" ? this.pastContinuations(at + 1) : at;
        if (op === "<<" && text[heredocStart] !== "<") {
          this.pos = heredocStart;
          let strip = false;
          if (text[this.pos] === "-") {
            if (heredocStart !== at + 1)
              this.fail('a heredoc "-" that only a joined line continuation puts next to the <<');
            strip = true;
            this.pos = this.pastContinuations(this.pos + 1);
          }
          this.pos = this.pastContinuations(this.pos, true);
          let word = this.readWord(depth, true);
          if (word.raw !== "") {
            if (QUOTED_BACKSLASH_RE.test(joinLineContinuations(word.raw)))
              this.fail("a heredoc delimiter this reading cannot spell as the shell does");
            if (word.text === "" && !word.quoted) this.fail("a heredoc delimiter that reads as empty");
            let token = {
              kind: "heredoc",
              body: null,
            };
            out.push(token);
            atCommandStart = false;
            pending.push({
              token,
              delimiter: word.text,
              strip,
              expand: !word.quoted,
              depth,
            });
          }
          continue;
        }
        let redirectOp = op === "<<" ? "<<<" : [">>", ">&", "<&", ">|", "<>"].includes(op) ? op : char;
        this.pos = redirectOp === "<<<" ? heredocStart + 1 : redirectOp.length === 2 ? at + 1 : this.pos + 1;
        this.pos = this.pastContinuations(this.pos, true);
        if (
          this.pos < end &&
          !`
;&|()`.includes(text[this.pos])
        )
          out.push({
            kind: "redirect",
            op: redirectOp,
            word: this.readWord(depth),
          });
        atCommandStart = false;
        continue;
      }
      if (char === "{" || char === "}") {
        let nextIndex = this.pastContinuations(this.pos + 1);
        let endsToken =
          nextIndex >= end ||
          (
            WHITESPACE_CHARS +
            `
;&|()<>`
          ).includes(text[nextIndex]);
        if (endsToken && atCommandStart) {
          out.push({
            kind: "op",
            op: char,
          });
          this.pos += 1;
          atCommandStart = true;
          continue;
        }
        if (endsToken && char === "{") this.fail("a { that may open a group or may be an argument");
      }
      let match = /^[A-Za-z_][A-Za-z0-9_]*\+?=\(/.exec(text.slice(this.pos, this.pos + 256));
      if (match !== null) {
        if (inCasePatterns) this.failUnlessCasePatternGroupHoldOff();
        let pos = this.pos;
        this.pos += match[0].length;
        if (!this.tooDeep(depth + 1)) {
          this.tokens("array", depth + 1);
          let afterArray = this.pastContinuations(this.pos);
          let nextChar =
            text[afterArray] ??
            `
`;
          let nextIsSubscript =
            (nextChar === "<" || nextChar === ">") && text[this.pastContinuations(afterArray + 1)] === "(";
          let endsLine =
            nextChar ===
              `
` ||
            (nextChar === "\r" &&
              (text[afterArray + 1] ??
                `
`) ===
                `
`);
          if (nextIsSubscript || !(endsLine || `${WHITESPACE_CHARS};&|<>)`.includes(nextChar)))
            this.failUnlessSubscriptHoldsOff(
              "text straight after the ) that closes name=( \u2026 ), which the shells read in different ways or refuse",
            );
        }
        let sliced = text.slice(pos, this.pos);
        out.push({
          kind: "word",
          word: {
            text: sliced,
            quoted: false,
            raw: sliced,
          },
        });
        atCommandStart = false;
        continue;
      }
      let word = this.readWord(depth);
      if (word.raw === "") {
        this.pos += 1;
        continue;
      }
      if (
        /^[0-9]+$/.test(joinLineContinuations(word.raw)) &&
        (text[this.pos] === "<" || text[this.pos] === ">")
      )
        continue;
      out.push({
        kind: "word",
        word,
      });
      if (!word.quoted) {
        if (atCommandStart && word.text === "case") {
          sawCaseKeyword = true;
          if (inCasePatterns || sawCompoundOpener) this.failUnlessCasePatternGroupHoldOff();
        } else if (sawCaseKeyword && word.text === "in") {
          sawCaseKeyword = false;
          caseDepth += 1;
          parenDepthStack.push(parenClosers);
          inCasePatterns = true;
          patternStart = out.length;
        } else if (word.text === "esac" && caseDepth > 0 && (atCommandStart || inCasePatterns)) {
          if (
            inCasePatterns &&
            (inCaseParen ||
              "(<>".includes(text[this.pastContinuations(this.pos)] ?? " ") ||
              hasNonNewlineTokenAfter(out, patternStart, out.length - 1))
          )
            this.failUnlessCasePatternGroupHoldOff();
          caseDepth -= 1;
          parenDepthStack.pop();
          inCasePatterns = false;
          inCaseParen = false;
        }
      }
      let wasAtCommandStart = atCommandStart;
      let wasCompoundOpener = sawCompoundOpener;
      sawCompoundOpener = wasAtCommandStart && !word.quoted && SHELL_COMPOUND_OPENERS.has(word.text);
      atCommandStart =
        wasCompoundOpener ||
        (wasAtCommandStart &&
          !word.quoted &&
          (SHELL_KEYWORDS.has(word.text) || SHELL_CONTROL_WORDS.has(word.text)));
    }
    if (mode === "eof") pending.splice(0);
    if (caseDepth > 0 || inCasePatterns) this.fail("a case statement that is never closed");
    if (mode !== "eof")
      this.fail(
        mode === "array" ? "an array assignment that is never closed" : "a $( or ( that is never closed",
      );
    return out;
  }
  readWord(depth, noSubstitutions = false, requireIdentifier = false) {
    let text = this.text;
    let end = text.length;
    let pos = this.pos;
    let value = "";
    let quoted = false;
    let expands = false;
    let bracketDepth = 0;
    let sawBracket = false;
    let subscriptEnd = 0;
    let beforeEquals;
    while (this.pos < end) {
      let char = text[this.pos];
      if (char === "'") {
        quoted = true;
        let index = text.indexOf("'", this.pos + 1);
        if (index === -1) {
          this.fail("a single quote that is never closed");
          value += text.slice(this.pos + 1);
          this.pos = end;
          break;
        }
        value += text.slice(this.pos + 1, index);
        this.pos = index + 1;
        continue;
      }
      if (char === "$" && text[this.pos + 1] === "'") {
        quoted = true;
        {
          let index = text.indexOf("'", this.pos + 2);
          if (text.slice(this.pos + 2, index === -1 ? end : index).includes("\\")) expands = true;
        }
        this.pos += 2;
        while (this.pos < end && text[this.pos] !== "'")
          if (text[this.pos] === "\\" && this.pos + 1 < end) {
            value += text[this.pos + 1];
            this.pos += 2;
          } else {
            value += text[this.pos];
            this.pos += 1;
          }
        if (this.pos >= end) {
          this.fail("a $' quote that is never closed");
          break;
        }
        this.pos += 1;
        continue;
      }
      if (char === '"' || (char === "$" && text[this.pos + 1] === '"')) {
        quoted = true;
        this.pos += char === "$" ? 2 : 1;
        while (this.pos < end && text[this.pos] !== '"') {
          let char = text[this.pos];
          if (char === "\\" && this.pos + 1 < end) {
            let nextChar = text[this.pos + 1];
            value +=
              nextChar ===
              `
`
                ? ""
                : nextChar === "$" || nextChar === BACKTICK || nextChar === '"' || nextChar === "\\"
                  ? nextChar
                  : this.quotedBackslashKept
                    ? char + nextChar
                    : nextChar;
            this.pos += 2;
          } else if (!noSubstitutions && char === "$" && text[this.pastContinuations(this.pos + 1)] === "(")
            value += this.readDollarParen(depth, this.pastContinuations(this.pos + 1));
          else if (!noSubstitutions && char === BACKTICK) value += this.readBackticks(depth);
          else if (char === "$" && text[this.pastContinuations(this.pos + 1)] === "{") {
            value += this.readParameterExpansion(depth, this.pastContinuations(this.pos + 1));
            expands = true;
          } else {
            if (char === "$") expands = true;
            value += char;
            this.pos += 1;
          }
        }
        if (this.pos >= end) {
          this.fail("a double quote that is never closed");
          break;
        }
        this.pos += 1;
        continue;
      }
      if (char === "\\" && this.pos + 1 < end) {
        if (
          text[this.pos + 1] !==
          `
`
        ) {
          value += text[this.pos + 1];
          quoted = true;
        }
        this.pos += 2;
        continue;
      }
      if (char === "$" && text[this.pastContinuations(this.pos + 1)] === "{") {
        value += this.readParameterExpansion(depth, this.pastContinuations(this.pos + 1));
        expands = true;
        continue;
      }
      if (!noSubstitutions && char === "$" && text[this.pastContinuations(this.pos + 1)] !== "(")
        expands = true;
      if (!noSubstitutions && char === "$" && text[this.pastContinuations(this.pos + 1)] === "(") {
        value += this.readDollarParen(depth, this.pastContinuations(this.pos + 1));
        quoted = true;
        expands = true;
        continue;
      }
      if (!noSubstitutions && char === BACKTICK) {
        value += this.readBackticks(depth);
        quoted = true;
        expands = true;
        continue;
      }
      if (
        !noSubstitutions &&
        (char === "<" || char === ">") &&
        text[this.pastContinuations(this.pos + 1)] === "("
      ) {
        this.pos = this.pastContinuations(this.pos + 1) + 1;
        if (!this.tooDeep(depth + 1)) this.bodies.push(this.tokens("paren", depth + 1));
        value += char + "(\u2026)";
        quoted = true;
        continue;
      }
      if (SHELL_META_CHARS.includes(char)) {
        if (bracketDepth > 0)
          this.failUnlessSubscriptHoldsOff(
            "a [ still open at a space, tab, line break or one of ; & | < > ( ), where bash may read on to its ] and other shells end the word",
          );
        else if (
          char === "(" &&
          subscriptEnd > 0 &&
          /^\+?=/.test(value.slice(subscriptEnd)) &&
          value.endsWith("=")
        )
          this.failUnlessSubscriptHoldsOff(
            "an opening parenthesis after [\u2026]= or [\u2026]+= in the same word, as in a[1]=(x), which the shells read in different ways or refuse",
          );
        else if (
          char === "(" &&
          !noSubstitutions &&
          !requireIdentifier &&
          beforeEquals === true &&
          value.endsWith("=")
        )
          this.failUnlessSubscriptHoldsOff(
            "name=( that this reading did not take as an array, such as one with a line continuation or a second = before the parenthesis, a name hundreds of characters long or a non-ASCII name, which the shells read in different ways or refuse",
          );
        break;
      }
      if (char === "[") {
        if (bracketDepth > 0) bracketDepth += 1;
        else if (!sawBracket) {
          sawBracket = true;
          if (!noSubstitutions && !quoted && (requireIdentifier ? value === "" : IDENTIFIER_RE.test(value)))
            bracketDepth = 1;
        }
      } else if (char === "]" && bracketDepth > 0) {
        bracketDepth -= 1;
        if (bracketDepth === 0) subscriptEnd = value.length + 1;
      } else if (char === "=" && beforeEquals === undefined)
        beforeEquals = !quoted && IDENTIFIER_RE.test(value.endsWith("+") ? value.slice(0, -1) : value);
      value += char;
      this.pos += 1;
    }
    let sliced = text.slice(pos, this.pos);
    if (/\{[^{}'"]*(?:,|\.\.)[^{}'"]*\}/.test(sliced.replace(/'[^']*'|"[^"]*"/g, ""))) expands = true;
    return {
      text: value,
      quoted,
      raw: sliced,
      ...(expands && {
        expands,
      }),
    };
  }
  readParameterExpansion(depth, start = this.pos + 1) {
    let text = this.text;
    let end = text.length;
    this.pos = start + 1;
    let isSemicolonAfter = (pos) => WHITESPACE_OR_PIPE_RE.test(text[this.pastContinuations(pos)] ?? "");
    if (isSemicolonAfter(this.pos)) this.fail("a ${ \u2026; } command substitution");
    let nesting = 1;
    let inDoubleQuotes = false;
    while (this.pos < end && nesting > 0) {
      let char = text[this.pos];
      if (char === "\\") this.pos += 2;
      else if (char === '"') {
        inDoubleQuotes = !inDoubleQuotes;
        this.pos += 1;
      } else if (char === "'" && !inDoubleQuotes) {
        let index = text.indexOf("'", this.pos + 1);
        let quoteEnd = index === -1 ? end : index;
        this.collectExpansions(text.slice(this.pos + 1, quoteEnd), depth);
        this.pos = index === -1 ? end : index + 1;
      } else if (char === "'") this.pos += 1;
      else if (char === "$" && text[this.pastContinuations(this.pos + 1)] === "(")
        this.readDollarParen(depth, this.pastContinuations(this.pos + 1));
      else if (char === BACKTICK) this.readBackticks(depth);
      else if (char === "$" && text[this.pastContinuations(this.pos + 1)] === "{") {
        nesting += 1;
        this.pos = this.pastContinuations(this.pos + 1) + 1;
        if (isSemicolonAfter(this.pos)) this.fail("a ${ \u2026; } command substitution");
      } else {
        if (char === "}" && !inDoubleQuotes) nesting -= 1;
        this.pos += 1;
      }
    }
    if (nesting > 0) this.fail("a ${ that is never closed");
    let body = joinLineContinuations(text.slice(start, this.pos));
    if (PARAMETER_EXPANSION_RE.test(body)) this.fail("a ${ \u2026@P } expansion");
    return "$" + body;
  }
  readDollarParen(depth, start = this.pos + 1) {
    let text = this.text;
    if (text[start + 1] === "(") {
      let arithmeticClose = findArithmeticClose(text, start + 2);
      if (arithmeticClose !== -1) {
        this.collectExpansions(text.slice(start + 2, arithmeticClose - 2), depth);
        this.pos = arithmeticClose;
        return "$((\u2026))";
      }
    }
    this.pos = start + 1;
    if (this.tooDeep(depth + 1)) return "$(\u2026)";
    let pos = this.pos;
    let tokens = this.tokens("paren", depth + 1);
    if (this.make) {
      let first = tokens[0];
      if (first?.kind === "word" && /^(?:shell|eval|call)$/.test(first.word.text)) {
        this.bodies.push(tokens.slice(1));
        return "$(\u2026)";
      }
      return "$(" + this.text.slice(pos, Math.max(pos, this.pos - 1)) + ")";
    }
    this.bodies.push(tokens);
    return "$(\u2026)";
  }
  readBackticks(depth) {
    let text = this.text;
    let end = text.length;
    let closeAt = this.pos + 1;
    while (closeAt < end && text[closeAt] !== BACKTICK) closeAt += text[closeAt] === "\\" ? 2 : 1;
    if (closeAt >= end) this.fail("a backtick that is never closed");
    let nested = new ShellReader(
      text.slice(this.pos + 1, Math.min(closeAt, end)).replace(/\\([$\x60\\])/g, "$1"),
      this.make,
      this.quotedBackslashKept,
      this.substitutionHeredocs,
    );
    if (depth + 1 > MAX_SUBSTITUTION_DEPTH) this.fail("command substitutions nested too deeply");
    else {
      this.bodies.push(nested.tokens("eof", depth + 1), ...nested.bodies);
      if (nested.unreadable !== null) this.fail(nested.unreadable);
    }
    this.pos = Math.min(closeAt + 1, end);
    return "$(\u2026)";
  }
  collectExpansions(text, depth) {
    if (PARAMETER_EXPANSION_RE.test(joinLineContinuations(text))) this.fail("a ${ \u2026@P } expansion");
    let index = 0;
    while (index < text.length) {
      let char = text[index];
      let afterDollar = char === "$" ? skipLineContinuations(text, index + 1) : index + 1;
      if (char === "$" && text[afterDollar] === "(") {
        let nested = new ShellReader(
          text.slice(index),
          this.make,
          this.quotedBackslashKept,
          this.substitutionHeredocs,
        );
        nested.readDollarParen(depth, afterDollar - index);
        this.bodies.push(...nested.bodies);
        if (nested.unreadable !== null) this.fail(nested.unreadable);
        index += Math.max(nested.pos, 1);
        continue;
      }
      if (char === "$" && text[afterDollar] === "{") {
        if (WHITESPACE_OR_PIPE_RE.test(text[skipLineContinuations(text, afterDollar + 1)] ?? ""))
          this.fail("a ${ \u2026; } command substitution");
      }
      if (char === "\\") index += 2;
      else if (char === BACKTICK) {
        let nested = new ShellReader(
          text.slice(index),
          this.make,
          this.quotedBackslashKept,
          this.substitutionHeredocs,
        );
        nested.readBackticks(depth);
        this.bodies.push(...nested.bodies);
        if (nested.unreadable !== null) this.fail(nested.unreadable);
        index += Math.max(nested.pos, 1);
      } else index += 1;
    }
  }
  readHeredocBodies(pending, depth) {
    for (let item of pending) {
      let line = this.findLine(item.delimiter, this.pos, item.strip);
      let lineEnd =
        line === -1
          ? -1
          : this.text.indexOf(
              `
`,
              line,
            );
      if (
        item.expand &&
        line !== -1 &&
        this.unreadable === null &&
        CONTINUED_LINE_RE.test(this.text.slice(this.pos, line))
      )
        ({ at: line, lineEnd } = this.findJoinedLine(item.delimiter, this.pos, item.strip));
      if (line === -1) {
        this.fail("a heredoc is never terminated");
        break;
      }
      let text = this.text.slice(this.pos, line);
      if (item.expand) this.collectExpansions(joinLineContinuations(text), depth);
      item.token.body = item.expand ? unescapeDoubleQuoted(text) : text;
      this.pos = lineEnd === -1 ? this.text.length : lineEnd + 1;
    }
  }
  findJoinedLine(delimiter, start, strip) {
    let text = this.text;
    let candidateStart = start;
    while (candidateStart <= text.length) {
      let joined = "";
      let from = candidateStart;
      let lineEnd = -1;
      for (;;) {
        lineEnd = text.indexOf(
          `
`,
          from,
        );
        let sliced = text.slice(from, lineEnd === -1 ? text.length : lineEnd);
        let continues = lineEnd !== -1 && TRAILING_BACKSLASH_RE.test(sliced);
        joined += continues ? sliced.slice(0, -1) : sliced;
        if (!continues) break;
        from = lineEnd + 1;
      }
      if ((strip ? joined.replace(/^\t+/, "") : joined) === delimiter)
        return {
          at: candidateStart,
          lineEnd,
        };
      if (lineEnd === -1)
        return {
          at: -1,
          lineEnd: -1,
        };
      candidateStart = lineEnd + 1;
    }
    return {
      at: -1,
      lineEnd: -1,
    };
  }
  findLine(delimiter, from, strip) {
    if (this.lineIndex === null) {
      let exactIndex = new Map();
      let strippedIndex = new Map();
      let offset = 0;
      for (let line of this.text.split(`
`)) {
        let addLine = (index, lineText) => {
          let list = index.get(lineText);
          if (list === undefined) index.set(lineText, [offset]);
          else list.push(offset);
        };
        addLine(exactIndex, line);
        addLine(strippedIndex, line.replace(/^\t+/, ""));
        offset += line.length + 1;
      }
      this.lineIndex = exactIndex;
      this.strippedLineIndex = strippedIndex;
    }
    let offsets = (strip ? this.strippedLineIndex : this.lineIndex).get(delimiter);
    if (offsets === undefined) return -1;
    let low = 0;
    let high = offsets.length;
    while (low < high) {
      let mid = (low + high) >> 1;
      if (offsets[mid] < from) low = mid + 1;
      else high = mid;
    }
    return low < offsets.length ? offsets[low] : -1;
  }
}
//@ chunk-4z1ntdgk.js:72319-72554 placement
function findArithmeticClose(text, start) {
  let min = Math.min(text.length, start + 4096);
  let index = start;
  let depth = 0;
  while (index < min) {
    let char = text[index];
    if (char === "'" || char === '"') {
      let index_2 = text.indexOf(char, index + 1);
      index = index_2 === -1 ? min : index_2 + 1;
      continue;
    }
    if (char === "(") depth += 1;
    else if (char === ")") {
      if (depth === 0) return text[index + 1] === ")" ? index + 2 : -1;
      depth -= 1;
    }
    index += 1;
  }
  return -1;
}
//@ chunk-4z1ntdgk.js:72554-74042 placement
/**
 * 会影响工具行为的敏感环境变量名单（编辑器、分页器、预加载、Go/Rust/JVM 相关），以及其前缀/精确名匹配正则。
 */
var TOOL_ENV_VARS; // deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
var TOOL_ENV_PREFIX_RE;
var NULL_COMMAND_ENV_VARS;
var TOOL_ENV_EXACT_RE;
var SCRIPT_PATH_RE;
deferInit("chunk-4z1ntdgk.js:72554", () => {
  TOOL_ENV_VARS = new Set([
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
  TOOL_ENV_PREFIX_RE = /^(?:DYLD_|LD_|BASH_FUNC_|GIT_CONFIG_|LUA_C?PATH)/;
  NULL_COMMAND_ENV_VARS = new Set(["NULLCMD", "READNULLCMD"]);
  TOOL_ENV_EXACT_RE =
    /^(?:GH_BROWSER|RSYNC_RSH|CVS_RSH|SOPS_GPG_EXEC|PERL5SHELL|RUBYSHELL|JAVACMD|CLOUDSDK_PYTHON|UV_PYTHON|RUSTC_WRAPPER|RUSTC_WORKSPACE_WRAPPER|npm_config_script_shell|NPM_CONFIG_SCRIPT_SHELL|R_(?:PROFILE|ENVIRON)(?:_USER)?|TAR_OPTIONS|BUN_OPTIONS|TF_CLI_ARGS\w*|CARGO_ALIAS_\w+|[A-Z0-9][A-Z0-9_]*_(?:EXTERNAL_DIFF|PAGER|EDITOR))$/;
  SCRIPT_PATH_RE =
    /^(?!-)(?:[^\s]*\/[^\s]*|[^\s\/]+\.(?:sh|bash|zsh|fish|py|rb|pl|js|mjs|cjs|ts|php|lua|R|r|ps1|awk|tcl|exs?|jl))$/;
});
//@ chunk-4z1ntdgk.js:74042-74102 placement
function isToolEnvVar(name, nullCommandHeld) {
  return (
    TOOL_ENV_VARS.has(name) ||
    TOOL_ENV_PREFIX_RE.test(name) ||
    (nullCommandHeld && NULL_COMMAND_ENV_VARS.has(name))
  );
}
//@ chunk-4z1ntdgk.js:74102-74203 placement
function splitQuotedWords(text) {
  return (text.match(/(?:[^\s"']+|"[^"]*"|'[^']*')+/g) ?? []).map((word) => word.replace(/["']/g, ""));
}
//@ chunk-4z1ntdgk.js:74203-74466 placement
function pathPrefixes(path, home) {
  let replaced = path.replace(/\/+$/, "");
  if (!replaced.startsWith("/") || replaced === "") return [];
  let underHome =
    home !== "" && home !== "/" && (replaced === home || replaced.startsWith(`${home}/`))
      ? replaced.slice(home.length)
      : null;
  let tail = underHome === "" ? "/" : underHome;
  return underHome === null
    ? [replaced]
    : [replaced, `~${tail}`, `$HOME${tail}`, `$HOME"${tail}`, `\${HOME}${tail}`, `\${HOME}"${tail}`];
}
//@ chunk-4z1ntdgk.js:74466-77447 placement
/**
 * 均依赖 cwd 的命令模式（相对路径、process.cwd()、pwd、git rev-parse --show-toplevel 等），以及 shell 名、脚本解释器、构建工具与解释器取值选项表。
 */
var CWD_DEPENDENCE_PATTERN; // deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
var PWD_REFERENCE_RE;
var HISTCHARS_RE;
var SHELL_NAME_RE;
var CSH_SHELL_RE;
var CSH_IN_TEXT_RE;
var SHELL_SET_TO_CSH_RE;
var SHELL_PROGRAMS;
var SCRIPT_INTERPRETERS;
var EXTENSION_INTERPRETERS;
var BUILD_TOOL_PROGRAMS;
var VERSION_OR_HELP_FLAG_RE;
var BUILD_SUBCOMMANDS;
var INTERPRETER_EVAL_FLAGS;
deferInit("chunk-4z1ntdgk.js:74466", () => {
  CWD_DEPENDENCE_PATTERN =
    /(?:^|[\s"'=(`:;&|<>])\.\.?\/|\bprocess\.cwd\(\)|\bos\.getcwd\(\)|\bPath\.cwd\(\)|\bDir\.pwd\b|\bgit\b[^\n]{0,12}\brev-parse\b[^\n]{0,6}--show-toplevel\b/im;
  PWD_REFERENCE_RE = /\$PWD\b|\$\{PWD\b|\$\(pwd(?:[ \t]+-[LP])?\)|`pwd`/im;
  HISTCHARS_RE = /histchars|HISTCHARS/;
  SHELL_NAME_RE =
    /^(?:bash|sh|zsh|dash|ash|(?:pd|lo|o|m|r)?ksh[0-9]*|rbash|fish|csh|tcsh|yash|posh|[oy]sh)$/i;
  CSH_SHELL_RE = /^(?:t?csh|bsd-csh)$/;
  CSH_IN_TEXT_RE =
    /(?=(?:t?csh|bsd-csh)(?![\w.-]))(?:(?<![\w.-])|(?<=\$\{[^}\n]{1,128}[-=+?])|(?<=(?<![\w.])-[a-zA-Z]{0,64}[sc]))/i;
  SHELL_SET_TO_CSH_RE = /^SHELL(?:\+=|=(?:.*\/)?(?:[tT]?|[bB][sS][dD]-)[cC][sS][hH]$)/;
  SHELL_PROGRAMS = new Set([
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
  SCRIPT_INTERPRETERS = new Set([
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
  EXTENSION_INTERPRETERS = {
    julia: /\.jl$/,
    elixir: /\.exs?$/,
    groovy: /\.groovy$/,
    racket: /\.rkt$/,
    guile: /\.scm$/,
    sbcl: /\.(?:lisp|cl)$/,
  };
  BUILD_TOOL_PROGRAMS = new Set([
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
  VERSION_OR_HELP_FLAG_RE = /^--(?:version|help)$/;
  BUILD_SUBCOMMANDS = {
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
  INTERPRETER_EVAL_FLAGS = {
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
});
//@ chunk-4z1ntdgk.js:77447-77908 placement
function isEvalFlag(interpreterName, text) {
  switch (interpreterName) {
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
//@ chunk-4z1ntdgk.js:77908-78094 placement
/**
 * Python/其它脚本中 import/exec/eval 相关正则。
 */
var PYTHON_IMPORT_PATTERN = /\bimport\b|__import__/;
var EXEC_OR_EVAL_RE = /\bexec(?:file)?\b|\beval\b/;
var IMPORT_OR_EXEC_RE = /\bimport\b|__import__|\bexec\b/;
var PREFIX_WRAPPER_RE = /^(?:noglob|nocorrect|repeat|-)$/;
var DISABLE_OR_ENABLE_RE = /disable|enable/i;
var QUOTE_OR_CONTINUATION_RE = /\$(?=['"])|\\\n|['"\\]/g;
//@ chunk-4z1ntdgk.js:78094-78173 placement
function commandBaseName(word) {
  let text = word.text;
  return text.slice(text.lastIndexOf("/") + 1).toLowerCase();
}
//@ chunk-4z1ntdgk.js:78173-78283 placement
function normalizeInterpreterName(name) {
  return name.replace(/^(python|pypy|perl|ruby|php|lua|node|nodejs|ksh|tclsh|wish)[0-9.]+t?$/, "$1");
}
//@ chunk-4z1ntdgk.js:78283-78339 placement
function isKnownInterpreter(name) {
  return SHELL_PROGRAMS.has(name) || SCRIPT_INTERPRETERS.has(name) || INTERPRETER_NAME_PATTERN.test(name);
}
//@ chunk-4z1ntdgk.js:78339-78402 placement
/**
 * 绝对路径/疑似绝对路径/以 ~ 或 $ 开头的路径前缀正则。
 */
var ABSOLUTE_PATH_PATTERN = /^[\/$]|^~(?=\/|$)/;
var ABSOLUTE_LIKE_PATH_RE = /^[\/$]|^~(?![+-])/;
var PATH_PREFIX_CHARS_RE = /^[\/~$]/;
//@ chunk-4z1ntdgk.js:78402-78470 placement
function isAbsoluteLike(text, extraPattern = ABSOLUTE_LIKE_PATH_RE) {
  return (
    ABSOLUTE_PATH_PATTERN.test(text) ||
    (extraPattern.test(text) &&
      !readFlagWithOverride(TENGU_FEDERATED_HEARTH, {
        safe: true,
      }))
  );
}
//@ chunk-4z1ntdgk.js:78470-78870 layout
var LEADING_EMPTY_QUOTES_RE = /^(?:''|""|\$''|\$"")+/;
var UNQUOTED_VARIABLE_START_RE = /^(?:\$?")?\$(?=[\w{(\[@*#?!$-])/;
var BRACED_DEFAULT_EXPANSION_RE = /^(\$?")?\$\{(?:!?\w+(?:\[[^\]]*\])?|[@*#?$!-]):?[-=+](.*)$/s;
var TILDE_START_RE = /^~(?:\/|\}|$)/;
var SPECIAL_PARAMETER_START_RE = /^(?:\$?")?\$(?:[#?$-]|[0-9@*!]"?(?:""|'')*(?!$|[\/}"]))/;
var VARIABLE_WITH_SUFFIX_RE =
  /^(?:\$?")?\$([A-Za-z_]\w*)((?:["'\\]|\$["'0-9@*#?$!-]|\$[A-Za-z_]\w*(?!\w)|\$\[[^\]]*\]|\$\{[^{}]*(?:\$\{[^{}]*\}[^{}]*)*\}|\$\([^()]*(?:\([^()]*\)[^()]*)*\)|`(?:[^`\\]|\\.)*`)+\w)?/;
//@ chunk-4z1ntdgk.js:78870-79031 layout
function variableReferenceHasSuffix(text, text_2) {
  let match = VARIABLE_WITH_SUFFIX_RE.exec(text);
  if (match === null) return false;
  let variable = text_2 === undefined ? null : /^\$([A-Za-z_]\w*)/.exec(text_2);
  return match[2] !== undefined || (variable !== null && match[1].length < variable[1].length);
}
//@ chunk-4z1ntdgk.js:79031-79291 layout
function isBracedExpansionPathLike(text, startsWithPrefix) {
  let match = BRACED_DEFAULT_EXPANSION_RE.exec(text);
  if (match === null || match[2].startsWith("}")) return false;
  let singleQuoted = match[1] === undefined;
  let text_2 = match[2].replace(singleQuoted ? LEADING_EMPTY_QUOTES_RE : /^(?:"")+/, "");
  return !(
    /^"?[\/`]/.test(text_2) ||
    (UNQUOTED_VARIABLE_START_RE.test(text_2) &&
      !variableReferenceHasSuffix(text_2) &&
      !SPECIAL_PARAMETER_START_RE.test(text_2)) ||
    (singleQuoted && /^(?:['\\]|\$['"])\//.test(text_2)) ||
    (singleQuoted && TILDE_START_RE.test(match[2])) ||
    (startsWithPrefix && TILDE_START_RE.test(text_2))
  );
}
//@ chunk-4z1ntdgk.js:79291-79608 layout
function isTildeOrDollarWordChanged(word, allowTilde = false) {
  let firstChar = word.text[0];
  if (firstChar !== "~" && firstChar !== "$" && firstChar !== "<" && firstChar !== ">") return false;
  let raw = joinLineContinuations(word.raw);
  let text = raw.replace(LEADING_EMPTY_QUOTES_RE, "");
  return (
    (firstChar === "~"
      ? /^(?:~|["'\\]|\$['"])/.test(raw) && firstLineOf(raw, "/") !== firstLineOf(word.text, "/")
      : firstChar === "$"
        ? /^(?:\$?["'])?\\?\$/.test(text) &&
          (!UNQUOTED_VARIABLE_START_RE.test(text) ||
            variableReferenceHasSuffix(text, word.text) ||
            SPECIAL_PARAMETER_START_RE.test(text) ||
            isBracedExpansionPathLike(text, allowTilde))
        : !/^[<>]\(/.test(text)) &&
    readFlagWithOverride(TENGU_COMPOSED_KITE, {
      safe: true,
    })
  );
}
//@ chunk-4z1ntdgk.js:79608-80094 layout
function attachedPathWord(word, path) {
  let literalWord = path.startsWith("~")
    ? {
        ...word,
        text: path,
        raw: "\\" + path,
      }
    : {
        ...word,
        text: path,
      };
  let sliced = word.text.slice(0, word.text.length - path.length);
  let raw = joinLineContinuations(word.raw);
  let quoteChar = "";
  let rawIndex = 0;
  let textIndex = 0;
  while (textIndex < sliced.length && rawIndex < raw.length) {
    let rawChar = raw[rawIndex];
    if (quoteChar === "") {
      if (rawChar === "'" || rawChar === '"') {
        quoteChar = rawChar;
        rawIndex += 1;
        continue;
      }
      if (rawChar === "\\") rawIndex += 1;
    } else if (rawChar === quoteChar) {
      quoteChar = "";
      rawIndex += 1;
      continue;
    } else if (quoteChar === '"' && rawChar === "\\" && /[$`"\\]/.test(raw[rawIndex + 1] ?? ""))
      rawIndex += 1;
    if (raw[rawIndex] !== sliced[textIndex]) return literalWord;
    rawIndex += 1;
    textIndex += 1;
  }
  if (textIndex < sliced.length) return literalWord;
  let sliced_2 = raw.slice(rawIndex);
  let raw_2 = quoteChar === "" && sliced_2.startsWith("~") ? "\\" + sliced_2 : quoteChar + sliced_2;
  return {
    ...word,
    text: path,
    raw: raw_2,
  };
}
//@ chunk-4z1ntdgk.js:80094-80160 placement
function isPathWord(word) {
  return (isAbsoluteLike(word.text) || /^[<>]\(/.test(word.text)) && !isTildeOrDollarWordChanged(word);
}
//@ chunk-4z1ntdgk.js:80160-80239 placement
function isPlainArgument(word) {
  return word !== undefined && word.text !== "" && !isPathWord(word) && !word.text.startsWith("-");
}
export {
  commandBaseName,
  SHELL_SET_TO_CSH_RE,
  isTildeOrDollarWordChanged,
  isPlainArgument,
  isLauncherCommand,
  isAnchoredPath,
  normalizeInterpreterName,
  isPathWord,
  CSH_SHELL_RE,
  LOOP_WORD_RE,
  ALNUM_NAME_RE,
  BUILD_TOOL_PROGRAMS,
  VERSION_OR_HELP_FLAG_RE,
  SHELL_PROGRAMS,
  SCRIPT_INTERPRETERS,
  isKnownInterpreter,
  isAbsoluteLike,
  PATH_PREFIX_CHARS_RE,
  EXTENSION_INTERPRETERS,
  SHELL_NAME_RE,
  PREFIX_WRAPPER_RE,
  DISABLE_OR_ENABLE_RE,
  QUOTE_OR_CONTINUATION_RE,
  parseShellWords,
  BUILD_SUBCOMMANDS,
  isEvalFlag,
  parseShellCommands,
  INTERPRETER_EVAL_FLAGS,
  attachedPathWord,
  splitQuotedWords,
  isToolEnvVar,
  TOOL_ENV_EXACT_RE,
  SCRIPT_PATH_RE,
  EXEC_OR_EVAL_RE,
  IMPORT_OR_EXEC_RE,
  PYTHON_IMPORT_PATTERN,
  pathPrefixes,
  CWD_DEPENDENCE_PATTERN,
  PWD_REFERENCE_RE,
  HISTCHARS_RE,
  CSH_IN_TEXT_RE,
  shellComments,
};
