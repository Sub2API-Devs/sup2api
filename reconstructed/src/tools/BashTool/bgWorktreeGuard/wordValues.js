/**
 * tools/BashTool/bgWorktreeGuard/wordValues.ts
 *
 * 2.1.316 新增：后台 worktree 守卫的值求解：单词展开、参数展开、变量赋值的静态求值与风险原因。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-63f0f3kd.js (48)
 * attribution: placement 48
 */
import { basename, basename as basename_2, posix } from "path";
import {
  wordSet,
  isStartupHazardVariable,
  ft,
  isShellManagedVariable,
  ve,
  isPlainWordText,
  SHELL_NAME_PATTERN,
  DYNAMIC_VALUE_FLAGS,
  zt,
  Pn,
  Ts,
  SHELL_AUTO_VARIABLES,
  Wt,
  Pe,
  Rs,
} from "./shellState.js";
import {
  truncateAtWord,
  countCharInString,
  urlPatternToRegex as urlPatternToRegex_2,
} from "../../../utils/stringUtils.js";
import { us, cs, isStaticWord, hasExpansion, TENGU_WOOLLY_WALL, V } from "./commandRules.js";
import { readFlagWithOverride } from "../../../services/analytics/flagOverrides.js";
import {
  isSafeValueCommand,
  withStdinState,
  describeUnsafeBinding,
  findShellVarName,
  environmentAssignmentReason,
  describeIntegerTyping,
} from "./statementWalk.js";
import {
  isStdinLikeDevicePath,
  resolveAgainstCwd,
  isOpaquePathArgument,
  ot,
  Ft,
  Fe,
  isDevicePath,
  dt,
} from "./commandTables.js";
import {
  INTEGER_ATTR_DEFAULT_VARS,
  UNHANDLED_EXEC_WRAPPERS,
  SHELL_PROGRAM_NAMES,
  ZSH_SPECIAL_SUBSCRIPT_TESTEXPR_RE,
  WORD_LEAF_EXPANSION_RE,
  WORD_LEAF_QUOTE_RE,
  containsStandaloneCondCloser,
  BASH_IMPLICITLY_REBOUND_VARS,
} from "../../../utils/bash/ast.js";
import { getFeatureValue_CACHED_MAY_BE_STALE } from "../../../services/analytics/growthbook.js";

/**
 * 后台 worktree 守卫的值求解常量：declare 标志、参数展开运算符、带引号变量名等正则；值为命令的环境变量、启动钩子变量、可放行的解释器变量、危险 NODE_OPTIONS、locale 变量；语句/单词/重定向节点类型集合；各类拒绝原因的说明文字。
 */
//@ chunk-63f0f3kd.js:11907-15619 placement
var DECLARE_FLAGS_RE = /^[-+][aAgilurxpfFt]*$/,
  PARAM_EXPANSION_OPERATOR_RE = /^(?::?[-+=?]|##?|%%?|\/[\/#%]?|\^\^?|,,?|@)$/,
  QUOTED_NAME_RE = /^(['"]?)([A-Za-z_][A-Za-z0-9_]*)\1$/,
  COMMAND_VALUED_ENV_RE =
    /(?:^|_)(?:EDITOR|VISUAL|PAGER|BROWSER|SHELL|ASKPASS|RSH|SSH|COMMAND|CMD|OPTIONS|OPTS|INIT|EXTERNAL_DIFF)$|^(?:LESSOPEN|LESSCLOSE|MAILER|FCEDIT|CC|CXX|PERL5OPT|PERL5DB|RUBYOPT|PYTHONSTARTUP|VIMINIT|EXINIT|PS[0-4]|PROMPT[0-4]?|(?:GNU)?MAKEFLAGS|MFLAGS|MAKEFILES)$|^(?:LUA_INIT|R_PROFILE)\w*$/i,
  STARTUP_HOOK_ENV_RE = /^(?:PERL5DB|R_PROFILE\w*)$|STARTUP$|_INIT(?:_\w*)?$|INSPECT|BREAKPOINT|REPL|PRELOAD/,
  BENIGN_INTERPRETER_ENV_RE =
    /^(?:PYTHON(?:DONTWRITEBYTECODE|UNBUFFERED|IOENCODING|HASHSEED|UTF8|WARNINGS|FAULTHANDLER|NOUSERSITE|OPTIMIZE|VERBOSE|DEVMODE|SAFEPATH)|NODE_(?:ENV|DEBUG|NO_WARNINGS|DISABLE_COLORS|PENDING_DEPRECATION|TLS_REJECT_UNAUTHORIZED)|NPM_CONFIG_(?:LOGLEVEL|COLOR|YES)|PERL_(?:UNICODE|BADLANG)|RUBY_YJIT_ENABLE|JULIA_NUM_THREADS|DENO_NO_UPDATE_CHECK)$/,
  RISKY_NODE_OPTIONS_RE =
    /(?:^|[\s,])(?:-[^\s=MmIeECSFx-]*[dr]|-e|--(?:require|import|loader|experimental-loader|eval|inspect|interactive)\b)|\binspect\b|\/(?:dev|proc)\//i,
  LOCALE_ENV_RE = /^(?:LANG|LANGUAGE|LC_[A-Z]+)$/,
  CHARSET_LOCALE_ENV_RE = /^(?:LC_ALL|LC_CTYPE|LANG)$/,
  LOCALE_PATH_ENV_RE = /^(?:LOCPATH|GCONV_PATH|GUIX_LOCPATH|PATH_LOCALE|LOCALE_ARCHIVE(?:_\d+_\d+)?)$/,
  EMPTY_VALUE_RE = /^(?:\$'(?:\\[nt ]| )*'|"\s*"|'\s*'|)$/,
  STATEMENT_NODE_TYPES = wordSet(`program list pipeline redirected_statement
  subshell compound_statement negated_command if_statement elif_clause
  else_clause while_statement for_statement c_style_for_statement
  case_statement case_item function_definition do_group variable_assignment
  declaration_command unset_command test_command command comment heredoc_body`),
  WORD_NODE_TYPES = wordSet(`word number string raw_string ansi_c_string
  translated_string concatenation simple_expansion expansion
  command_substitution process_substitution arithmetic_expansion
  brace_expression extglob_pattern regex`),
  REDIRECT_NODE_TYPES = wordSet("file_redirect heredoc_redirect herestring_redirect"),
  TOO_COMPLEX_SUFFIX = "inside a construct too complex to verify",
  OPTION_POSITION_NOTE =
    "where an option may stand (a value that is not double-quoted, or whose first character is matched or computed rather than spelled out, may begin with -; spell it out, or put -- before it if it is an operand rather than an option's value)",
  OPTION_POSITION_NOTE_LONG =
    "where an option may stand (a word that is not double-quoted, or whose first character is matched or computed rather than spelled out, may begin with - and be read as an option, even after --; spell it out, running any command substitution as its own command first, or, where the command is otherwise plain, begin a relative path or glob with ./ (a home path with ~/), quote an unquoted variable or a pattern meant for the program, or give an option its value as a separate word)",
  SED_PATTERN_NOTE =
    ' (the check cannot tell where every sed ends a pattern or address here: a bracket is unclosed or holds the delimiter, a control character, "\\[", "[.", "[=", a broken [:class:], "[" just before "]" or "^", or "-]" just after "]"; a y operand holds "["; or the delimiter is "[" or alphanumeric. To pass: use another delimiter; put "-" straight after "[" or "[^" unless "]" already stands there (then match "-" in a command of its own); or move the character, escaped, out of a non-negated bracket)',
  STAT_VALUE_NOTE =
    ' (if this value comes from stat: a word that comes from a variable or a command, or a path starting with a ~ other than ~/, can turn into --help, and stat then prints text, not a number. To pass, write stat -c FORMAT -- "PATH", with FORMAT one of %s %b %B %W %X %Y %Z, PATH in double quotes, and no redirect but 2>/dev/null)',
  DATE_VALUE_NOTE =
    " (if this value comes from date: some versions print %N and %q as a letter and others leave them unchanged, and arithmetic can read either as a variable. To pass: use date +%s, or do the sum in bc or awk)",
  GIT_TOO_COMPLEX_REASON = "names git in a form too complex to verify that it stays inside the worktree";
//@ chunk-63f0f3kd.js:15619-15722 placement
function tooComplexReason(t) {
  return `uses ${t} ${TOO_COMPLEX_SUFFIX}, so it is too complex to verify that it stays inside the worktree`;
}
//@ chunk-63f0f3kd.js:15722-15813 placement
function unverifiableRunReason(t, e) {
  return `runs ${t} ${e} ${TOO_COMPLEX_SUFFIX}, so what it runs cannot be shown not to be git`;
}
//@ chunk-63f0f3kd.js:15813-15927 placement
function arithmeticEvalReason(t) {
  return `evaluates ${shortenForReason(t)} arithmetically ${TOO_COMPLEX_SUFFIX}, which can run a command hidden in a variable's value`;
}
//@ chunk-63f0f3kd.js:15927-17031 placement
function assignmentHazardReason(t, e, i) {
  let n = i.kinds.get(e);
  if (isStartupHazardVariable(e)) {
    let o = n === "int" || (n === void 0 && !i.opaqueNames) ? ", so use another variable name" : "";
    return `${arithmeticEvalReason(t)}; ${e} is a variable the shell fills with text of its own${o}`;
  }
  if (Yt(e))
    return n === "int"
      ? `${arithmeticEvalReason(t)}; ${e} is a variable bash or zsh sets by itself, so use another variable name`
      : arithmeticEvalReason(t);
  let shellSetNameWord = i.shellSetNameWord;
  if (
    shellSetNameWord !== null &&
    n === void 0 &&
    !i.opaqueNames &&
    !ft.test(e) &&
    !isShellManagedVariable(e) &&
    !new RegExp(`[\\w#]${e}`).test(t)
  ) {
    let o = shortenForReason(shellSetNameWord.text),
      u = o === shellSetNameWord.token ? `'${o}'` : `'${o}', which contains '${shellSetNameWord.token}'`;
    return `${arithmeticEvalReason(t)}; ${e} is never set in this command, so the shell reads the text ${e} inherits as more variable names, and this command assigns the value ${u}, a name the shell itself rewrites as commands run; run the arithmetic as a separate Bash command without that assignment`;
  }
  let shellFilledWord = i.shellFilledWord,
    a = shellFilledWord?.match(/[A-Za-z_]\w*/g)?.find(isStartupHazardVariable);
  return a !== void 0 && n === void 0 && !ft.test(e) && ![...i.kinds.values()].includes("other")
    ? `${arithmeticEvalReason(t)}; ${e} is not trusted here because the assigned word '${shortenForReason(shellFilledWord)}' contains '${a}', the name of a variable the shell fills with text of its own`
    : arithmeticEvalReason(t);
}
//@ chunk-63f0f3kd.js:17031-17088 placement
function shortenForReason(t) {
  return truncateAtWord(t.replace(/\s+/g, " ").trim(), 40);
}
//@ chunk-63f0f3kd.js:17088-17322 placement
function describeWordValue(t) {
  switch (t.kind) {
    case "literal": {
      let e = shortenForReason(t.text);
      return e !== "" ? `the text ${e}` : t.text === "" ? "an empty word" : "a whitespace-only word";
    }
    case "dynamic":
      return `a value computed at runtime (${t.why})`;
    case "refuse":
      return t.detail;
  }
}
//@ chunk-63f0f3kd.js:17322-18442 placement
function dynamicArgumentReason(t, e, { node: node, value: n }, r) {
  let s = n.kind === "dynamic" ? n.why : describeWordValue(n),
    a =
      n.kind === "dynamic" && n.many
        ? "that find replaces with all the found paths at once when the clause ends in `{} +` (do not put `{}` right after an option that takes a value, or end the clause with `\\;` so that each run gets one path)"
        : us.test(node.text.replace(cs, "0"))
          ? 'that should be one element ("$1", "${a[0]}") or spelled out rather than an @-style list (several words, or none, even inside double quotes)'
          : isStaticWord(node) && hasExpansion(node)
            ? 'that is a "$*"-style join, an array length, or a bare arithmetic or special parameter, none of which is accepted (pass one element such as "$1", a plain quoted variable such as "$x", or spell the value out)'
            : r
              ? `that should be quoted whole, with ${e} written as its own word (${r.slice(0, -1)} ${e} "$x"): as written, it can become no word or several words`
              : `that should be one double-quoted or spelled-out word ('*.ts' for a pattern, "$x" or "$(\u2026)" for an expansion): as written, it can become no word or several words`;
  return `a computed ${e} value${r ? ` in the cluster ${r}` : ""} (${s}) ${a} where ${t} reads exactly one,`;
}
//@ chunk-63f0f3kd.js:18442-18746 placement
function recordVariableKind(t, e, i, n = !1, r = "") {
  let s = t.kinds.get(e),
    a = s === void 0 || s === i ? i : "inert";
  (t.kinds.set(e, s === "other" || i === "other" ? "other" : a),
    t.bindingSites.set(e, (t.bindingSites.get(e) ?? 0) + 1),
    t.optionSafeNames.set(
      e,
      (t.optionSafeNames.get(e) ?? !0) &&
        (n || (i === "int" && !readFlagWithOverride(TENGU_WOOLLY_WALL, { safe: !0 }))),
    ),
    recordStartupHazard(t, e, i === "other" || RISKY_NODE_OPTIONS_RE.test(r)));
}
//@ chunk-63f0f3kd.js:18746-18848 placement
function recordStartupHazard(t, e, i) {
  if (!BENIGN_INTERPRETER_ENV_RE.test(e))
    t.startupHazards.set(e, t.startupHazards.get(e) === !0 || i || STARTUP_HOOK_ENV_RE.test(e));
}
//@ chunk-63f0f3kd.js:18848-18974 placement
function isLiteralNonOption(t, e) {
  let i = isStaticNode(t) ? evaluateWord(t, e, !0) : null;
  return i?.kind === "literal" ? /^[^-]/.test(i.text) : i?.kind === "dynamic" && i.optionSafe;
}
//@ chunk-63f0f3kd.js:18974-19619 placement
function expansionKind(t, e) {
  if (!t) return "inert";
  if (
    t.type === "arithmetic_expansion" ||
    (t.type === "simple_expansion" && /^\$[?#$!]$/.test(t.text)) ||
    (t.type === "command_substitution" && isSafeValueCommand(t.children, e))
  )
    return "int";
  let i = isStaticNode(t) ? evaluateWord(t, e, !1) : null;
  if (i?.kind === "literal" && (i.text.match(/[A-Za-z_]\w*/g) ?? []).some(isStartupHazardVariable)) {
    if (!e.opaqueNames) e.shellFilledWord = i.text;
    e.opaqueNames = !0;
  } else if (i?.kind === "literal" && e.shellSetNameWord === null) {
    let n = i.text.match(/[A-Za-z_]\w*/g)?.find(isShellManagedVariable);
    if (n !== void 0 && ve()) e.shellSetNameWord = { text: i.text, token: n };
  }
  return i?.kind !== "literal"
    ? "other"
    : /^\d+$/.test(i.text)
      ? "int"
      : isPlainWordText(i.text) &&
          !i.text.split(/\s+/).some((n) => isStdinLikeDevicePath(resolveAgainstCwd(n, e)))
        ? "inert"
        : "other";
}
/**
 * 处理变量赋值/声明节点：记录变量种类（整数、数组、导出、只读），检测影响 git 或 shell 行为的危险变量。
 */
//@ chunk-63f0f3kd.js:19619-23877 placement
function analyzeAssignment(t, e, i) {
  switch (t.type) {
    case "variable_assignment": {
      let [n, r, s] = t.children,
        a = n?.type === "subscript" ? n.children[0] : n;
      if (a?.type === "variable_name") {
        if (s?.type === "array" || n?.type === "subscript") e.arrayNames.add(a.text);
        let o = r?.type === "=" && s?.type !== "array";
        recordVariableKind(
          e,
          a.text,
          i ? "int" : o ? expansionKind(s, e) : "other",
          o &&
            !i &&
            !(
              (INTEGER_ATTR_DEFAULT_VARS.has(a.text) || e.integerNames.has(a.text)) &&
              readFlagWithOverride(TENGU_WOOLLY_WALL, { safe: !0 })
            ) &&
            !!s &&
            isLiteralNonOption(s, e),
          s && isStaticNode(s) ? s.text.replace(/["'\\]/g, "") : "",
        );
      }
      break;
    }
    case "declaration_command": {
      let joined = t.children
        .filter((r) => r.type === "word" && r.text.startsWith("-"))
        .map((r) => r.text)
        .join("");
      for (let r of t.children) {
        let s = r.type === "variable_name" ? r : r.children[0];
        if (s?.type !== "variable_name") continue;
        if (/[aA]/.test(joined)) e.arrayNames.add(s.text);
        if (joined.includes("i")) e.integerNames.add(s.text);
        else if (r.type === "variable_name" && ft.test(s.text)) recordVariableKind(e, s.text, "other");
      }
      for (let r of t.children) analyzeAssignment(r, e, joined.includes("i"));
      return;
    }
    case "for_statement": {
      let found = t.children.find((a) => a.type === "variable_name"),
        filtered = t.children.filter((a) => WORD_NODE_TYPES.has(a.type)),
        mapped = filtered.map((a) => expansionKind(a, e));
      if (found) {
        let any = t.children.some((o) => o.type === "in");
        if (
          (recordVariableKind(
            e,
            found.text,
            !any || mapped.includes("other") ? "other" : mapped.every((o) => o === "int") ? "int" : "inert",
            any && filtered.every((o) => isLiteralNonOption(o, e)),
          ),
          any &&
            !Yt(found.text) &&
            filtered.every((o) => isStaticNode(o) && !isOpaquePathArgument(o.text.replace(/["'\\]/g, ""), e)))
        )
          e.pathNames.add(found.text);
      }
      break;
    }
    case "c_style_for_statement":
    case "arithmetic_expansion":
    case "compound_statement":
      if (t.type !== "compound_statement" || t.children[0]?.type === "((") {
        for (let n of t.children) {
          let r =
            t.type === "c_style_for_statement" && /^(?:do_group|compound_statement)$/.test(n.type) && ve();
          analyzeAssignment(n, e, !r);
        }
        return;
      }
      break;
    case "command_substitution":
    case "process_substitution":
      if (i && ve()) {
        for (let n of t.children) analyzeAssignment(n, e, !1);
        return;
      }
      break;
    case "binary_expression":
    case "unary_expression":
    case "postfix_expression": {
      let found = t.children.find((s) => s.type === "variable_name" || s.type === "word"),
        any = t.children.some((s) => /^(?:[-+*/%&|^]?=|<<=|>>=|\+\+|--)$/.test(s.type));
      if (i && any && found && SHELL_NAME_PATTERN.test(found.text)) recordVariableKind(e, found.text, "int");
      break;
    }
    case "expansion": {
      let [n, r, s] = t.children.slice(1),
        a = n?.type === "subscript" ? n.children[0] : n;
      if (a?.type === "variable_name" && /^:?=$/.test(r?.type ?? "")) {
        let o = expansionKind(s, e);
        if (n.type === "subscript") e.arrayNames.add(a.text);
        if (ft.test(a.text)) recordVariableKind(e, a.text, "other");
        else if (e.kinds.has(a.text) || o !== "int")
          recordVariableKind(e, a.text, e.kinds.has(a.text) ? o : "other");
      }
      break;
    }
    case "unset_command":
    case "command": {
      let filtered = t.children.filter(
          (c) => /^(?:command_name|variable_name|unset)$/.test(c.type) || WORD_NODE_TYPES.has(c.type),
        ),
        mapped = filtered.map((c) =>
          WORD_NODE_TYPES.has(c.type) && isStaticNode(c) ? evaluateWord(c, e, !0) : null,
        ),
        mapped_2 = filtered.map((c, f) => {
          let h = mapped[f];
          return h?.kind === "literal" ? h.text : c.text.replace(/["'\\]/g, "");
        }),
        any = filtered.some((c, f) => WORD_NODE_TYPES.has(c.type) && mapped[f]?.kind !== "literal"),
        o = basename_2(mapped_2[0] ?? ""),
        mapped_3 = mapped_2
          .slice(0, ot.has(o) || Ft.has(o) || UNHANDLED_EXEC_WRAPPERS.has(o) ? mapped_2.length : 1)
          .map((c) => basename_2(c)),
        index = mapped_3.findIndex((c) => /^(?:cd|chdir|pushd|popd)$/.test(c));
      if (index !== -1) {
        let all = mapped_3.slice(0, index).every((b) => Fe.has(b) || /^-[p-]*$/.test(b)),
          f =
            mapped_2.slice(index + 1).find((b) => !/^-[LPe@]+$|^--$/.test(b)) ??
            (mapped_3[index] === "cd" ? "~" : "-"),
          h =
            !all || /^(?:~[-+0-9]|[-+])/.test(f) || any
              ? ".."
              : /^[\/~]/.test(f) || !e.cwd.startsWith("/")
                ? posix.normalize(f)
                : posix.normalize(`${e.cwd}/${f}`);
        ((e.opaqueCwd ||= /^\.\.(?:\/|$)/.test(h) || isDevicePath(h)),
          (e.cwd = /^[\/~]/.test(h) ? h : e.cwd));
      }
      ((e.deviceLinked ||=
        (mapped_3.some((c) => /^(?:ln|link|cp|mv|mkfifo|mknod)$/.test(c)) &&
          mapped_2.some((c) => isDevicePath(resolveAgainstCwd(c, e)))) ||
        (mapped_3.some((c) => /^(?:ln|link|cp|mv)$/.test(c)) &&
          (any || mapped_2.some((c) => /^(?:\/|\.\.)(?:\/|$)/.test(posix.normalize(c)))))),
        (e.inputAssembled ||= e.deviceLinked),
        (e.allExported ||=
          mapped_3.some((c) => /^(?:set|shopt|setopt)$/.test(c)) &&
          mapped_2.some((c) => /^-[A-Za-z]*a|^allexport$/i.test(c.replace(/_/g, "")))));
      for (let c of t.children) {
        let f =
          WORD_NODE_TYPES.has(c.type) && ot.has(mapped_3[0] ?? "")
            ? /^([A-Za-z_]\w*)=(.*)$/s.exec(c.text.replace(/["'\\]/g, ""))
            : null;
        if (f)
          recordStartupHazard(
            e,
            f[1],
            !isStaticNode(c) || !isPlainWordText(f[2]) || RISKY_NODE_OPTIONS_RE.test(f[2]),
          );
      }
      let any_2 = mapped_2.some((c) => /^(?:read|getopts|mapfile|readarray|printf)$/.test(basename_2(c)));
      if (any_2 || mapped_2.some((c) => basename_2(c) === "unset")) {
        let any = mapped_2.some((f) => /^(?:mapfile|readarray|-[a-zA-Z]*[aA]\w*)$/.test(f));
        for (let f of mapped_2) {
          let h = /^-[a-zA-Z]*[aA](\w+)$/.exec(f)?.[1] ?? f;
          if (SHELL_NAME_PATTERN.test(h)) {
            if (any_2) recordVariableKind(e, h, "other");
            else (e.bindingSites.set(h, (e.bindingSites.get(h) ?? 0) + 1), e.optionSafeNames.set(h, !1));
            if (any) e.arrayNames.add(h);
          }
        }
        if (any_2) recordVariableKind(e, "REPLY", "other");
      } else if (!dt.has(mapped_3[0] ?? ""))
        for (let c of mapped_2.slice(1).filter((f) => SHELL_NAME_PATTERN.test(f)))
          e.bindingSites.set(c, (e.bindingSites.get(c) ?? 0) + 1);
      break;
    }
    default:
      break;
  }
  for (let n of t.children) analyzeAssignment(n, e, i);
}
//@ chunk-63f0f3kd.js:23877-23959 placement
function isStaticNode(t) {
  return !/expansion|substitution/.test(t.type) && t.children.every(isStaticNode);
}
//@ chunk-63f0f3kd.js:23959-24012 placement = toScopedConfig (0.805)
function dynamicValue(t, e = DYNAMIC_VALUE_FLAGS) {
  return { kind: "dynamic", why: t, ...e };
}
//@ chunk-63f0f3kd.js:24012-24569 placement
function mergeWordParts(t) {
  let found = t.find((s) => s.kind === "refuse"),
    filtered = t.filter((s) => s.kind === "dynamic");
  if (found || filtered.length === 0)
    return found ?? { kind: "literal", text: t.map((s) => (s.kind === "literal" ? s.text : "")).join("") };
  let n =
      filtered.every((s) => s.kind === "dynamic" && s.integer) &&
      isPlainWordText(t.map((s) => (s.kind === "literal" ? s.text : "")).join("")),
    found_2 = t.find((s) => s.kind !== "literal" || s.text !== "");
  return t.length === 1
    ? filtered[0]
    : dynamicValue(filtered[0].why, {
        ...DYNAMIC_VALUE_FLAGS,
        inert: n,
        optionSafe: readFlagWithOverride(TENGU_WOOLLY_WALL, { safe: !0 })
          ? isOptionSafeParts(t)
          : found_2?.kind === "literal"
            ? !found_2.text.startsWith("-")
            : found_2?.kind === "dynamic" && found_2.optionSafe,
        written: filtered.some((s) => s.kind === "dynamic" && s.written),
      });
}
//@ chunk-63f0f3kd.js:24569-24738 placement
function isOptionSafeParts(t) {
  for (let e of t)
    if (e.kind === "literal") {
      if (e.text !== "") return !e.text.startsWith("-");
    } else if (e.kind !== "dynamic" || !e.optionSafe || e.integer) return !1;
  return !0;
}
//@ chunk-63f0f3kd.js:24738-24808 placement
function unescapeDoubleQuoted(t) {
  return t.replace(/\\([$`"\\\n])/g, (e, i) =>
    i ===
    `
`
      ? ""
      : i,
  );
}
//@ chunk-63f0f3kd.js:24808-24850 placement
var GIT_PROGRAM_NAMES = ["git", "git.exe", "git.real", ...SHELL_PROGRAM_NAMES];
//@ chunk-63f0f3kd.js:24850-25266 placement = urlPatternToRegex (0.838)
function urlPatternToRegex(pattern) {
  let replaced = pattern
      .slice(pattern.lastIndexOf("/") + 1)
      .replace(/\[(?:\[[:=.]\w*[:=.]\]|[^\]])*\]/g, (n) => (/\[[:=.]/.test(n.slice(1)) ? "?" : n)),
    i = "";
  for (let n = 0; n < replaced.length; n++) {
    let r = replaced[n],
      s = r === "[" ? replaced.indexOf("]", n + 2) : -1;
    if (s !== -1) ((i += replaced.slice(n, s + 1).replace(/^\[!/, "[^")), (n = s));
    else i += r === "*" ? ".*" : r === "?" ? "." : r.replace(/[\\^$.|+(){}[\]]/g, "\\$&");
  }
  try {
    let regExp = new RegExp(`^${i}$`, "i");
    return GIT_PROGRAM_NAMES.some((r) => regExp.test(r));
  } catch {
    return !0;
  }
}
//@ chunk-63f0f3kd.js:25266-25312 placement
var BOT_PROTECTED_TENGU_RIPPLING_JOURNAL = "bot_protected_tengu_rippling_journal";
//@ chunk-63f0f3kd.js:25312-25475 placement
function isRiskyGlob(t, e = t) {
  if (countCharInString(t, "*") > 16) return !0;
  if (!readFlagWithOverride(BOT_PROTECTED_TENGU_RIPPLING_JOURNAL, { safe: !0 })) return urlPatternToRegex(t);
  let sliced = e.slice(e.lastIndexOf("/") + 1);
  return e.length > 4096 || urlPatternToRegex(t) || globToRegex(sliced) || (sliced !== e && globToRegex(e));
}
//@ chunk-63f0f3kd.js:25475-26342 placement
function globToRegex(t) {
  let index = t.lastIndexOf("]"),
    i = "";
  for (let n = 0; n < t.length; n++) {
    let r = t[n];
    if (r === "\\") {
      let s = t[n + 1];
      if (s === void 0) return !0;
      ((i = s === "/" ? "" : i + urlPatternToRegex_2(s)), n++);
      continue;
    }
    if (r === "[") {
      let s = t[n + 1] === "!" || t[n + 1] === "^",
        a = n + (s ? 2 : 1),
        o = "",
        u = s,
        l = index > a ? a : t.length;
      for (; l < t.length && (t[l] !== "]" || l === a); l++) {
        let d = t[l],
          c = d === "[" && /^[:.=]$/.test(t[l + 1] ?? "");
        if (c && l === a && t[l + 1] !== ":") {
          if (t.indexOf(t[l + 1] + "]", l + 2) !== -1) return !0;
          c = !1;
        }
        let f = c ? /^\[:[a-z]+:\]/.exec(t.slice(l, l + 12)) : null;
        if (f) ((u = !0), (l += f[0].length - 1));
        else if (c || d === "\\" || (d === "-" && t[l + 1] === "[")) return !0;
        else if (d === "-" && l !== a && t[l + 1] !== "]") {
          if (!(/[0-9]/.test(t[l - 1]) && /[0-9]/.test(t[l + 1]))) u = !0;
        } else o += d;
      }
      if (l < t.length) {
        ((i += u ? "." : `[${urlPatternToRegex_2(o)}]`), (n = l));
        continue;
      }
      if (s && t[a] === "]") {
        ((i += "."), (n = a));
        continue;
      }
    }
    i = r === "/" ? "" : i + (r === "*" ? ".*" : r === "?" ? "." : urlPatternToRegex_2(r));
  }
  try {
    let regExp = new RegExp(`^${i}$`, "i");
    return GIT_PROGRAM_NAMES.some((r) => regExp.test(r));
  } catch {
    return !0;
  }
}
//@ chunk-63f0f3kd.js:26342-26444 placement
var ANSI_C_ESCAPES = new Map(
  Object.entries({
    a: "\x07",
    b: "\b",
    e: "\x1B",
    E: "\x1B",
    f: "\f",
    n: `
`,
    r: "\r",
    t: "\t",
    v: "\v",
  }),
);
//@ chunk-63f0f3kd.js:26444-26522 placement
function hasChildWordMatching(t, e) {
  return t.children.some((i) => i.type === "word" && e.test(i.text));
}
//@ chunk-63f0f3kd.js:26522-26601 placement
var Jn = /^(?:\[|:[A-Za-z&])/,
  Me = /(?:^|[^\\])(?:\\\\)*[*?]/,
  ts = /(?:^|[^\\])[*?]/;
//@ chunk-63f0f3kd.js:26601-26666 placement
function isBraceExpansionNode(t) {
  return (
    hasChildWordMatching(t, /^\{$/) && hasChildWordMatching(t, /^\}$/) && hasChildWordMatching(t, /,|\.\./)
  );
}
//@ chunk-63f0f3kd.js:26666-26714 placement
function isBracketGlobNode(t) {
  return hasChildWordMatching(t, /^\[$/) && hasChildWordMatching(t, /\]$/);
}
/**
 * 判断展开节点的值是否用于有风险的表达式位置（如 zsh 特殊下标或测试表达式）。
 */
//@ chunk-63f0f3kd.js:26714-26846 placement
function isRiskyExpansionOperand(t, e) {
  return (
    /expansion$/.test(t.type) &&
    (/^\$\W$/.test(t.text) ? ZSH_SPECIAL_SUBSCRIPT_TESTEXPR_RE : Jn).test(
      /^\$\d$/.test(t.text) ? e.replace(/^\d+/, "") : e,
    )
  );
}
//@ chunk-63f0f3kd.js:26846-26877 placement
var Te = /^(?:[[=~^+]|#\w*[[:])/;
/**
 * 判断节点相邻处是否构成 $'...' 引号边界的特殊情况。
 */
//@ chunk-63f0f3kd.js:26877-26986 placement
function isDollarQuoteEdge(t, e) {
  return e.type === "raw_string" && (t.text === "$$" || (t.text.endsWith("$") && e.text.endsWith("\\'")));
}
//@ chunk-63f0f3kd.js:26986-27015 placement
var TENGU_JAUNTY_FOREST = "tengu_jaunty_forest";
//@ chunk-63f0f3kd.js:27015-27053 placement
function ns() {
  return readFlagWithOverride(TENGU_JAUNTY_FOREST, { safe: !0 });
}
//@ chunk-63f0f3kd.js:27053-27084 placement
var TENGU_QUILTED_LANTERN = "tengu_quilted_lantern";
//@ chunk-63f0f3kd.js:27084-27292 placement
function hasProcessSubstitution(t) {
  let e = 0;
  for (let n = 0; n < t.length; n++) {
    if ((t[n] === "<" || t[n] === ">") && t[n + 1] === "(" && e % 2 === 0) return !0;
    e = t[n] === "\\" ? e + 1 : 0;
  }
  let search = t.search(/[|&\s]/);
  return t.startsWith("=(") || (search >= 0 && t.includes("=(", search));
}
/**
 * 把一个 shell 单词节点静态求值：literal（可确定文本）、dynamic（运行期值，附原因与属性）或 refuse（无法判断，拒绝）。
 */
//@ chunk-63f0f3kd.js:27292-31903 placement
function evaluateWord(t, e, i) {
  switch (t.type) {
    case "word":
    case "number":
      if (WORD_LEAF_EXPANSION_RE.test(t.text) || WORD_LEAF_QUOTE_RE.test(t.text))
        return { kind: "refuse", detail: tooComplexReason(`the word ${shortenForReason(t.text)}`) };
      if (i && ts.test(t.text))
        return dynamicValue("a glob pattern", {
          ...DYNAMIC_VALUE_FLAGS,
          inert: !isRiskyGlob(t.text),
          optionSafe: /^[A-Za-z0-9_.\/~@+]/.test(t.text),
        });
      if (i && V() && Me.test(t.text))
        return {
          kind: "refuse",
          detail: tooComplexReason(
            `the word ${shortenForReason(t.text)}, whose * or ? the shell expands as a file pattern (an even run of backslashes does not escape it),`,
          ),
        };
      return t.text.endsWith("\\")
        ? dynamicValue("a trailing backslash")
        : { kind: "literal", text: t.text.replace(/\\(.)/g, "$1") };
    case "raw_string":
      return { kind: "literal", text: t.text.slice(1, -1) };
    case "string": {
      let n = [],
        r = "",
        s = ns(),
        a = s ? Buffer.from(t.text, "utf8") : null,
        startIndex = t.startIndex;
      for (let [u, l] of t.children.entries()) {
        let d = a ? a.subarray(startIndex - t.startIndex, l.startIndex - t.startIndex).toString("utf8") : "";
        if (((startIndex = l.endIndex), /^[ \t\n]+$/.test(d)))
          ((r += d), n.push({ kind: "literal", text: d }));
        let c = t.children[u + 1],
          f =
            c?.type === "string_content"
              ? c.text
              : c?.type === "$" && c.startIndex === l.endIndex
                ? c.text + (t.children[u + 2]?.text ?? "")
                : "";
        if (l.type === '"') continue;
        if (((r += l.text), l.type === "string_content"))
          n.push({ kind: "literal", text: unescapeDoubleQuoted(l.text) });
        else if (l.type === "$") {
          if (Te.test(f)) return { kind: "refuse", detail: arithmeticEvalReason(`$${f}`) };
          n.push({ kind: "literal", text: "$" });
        } else if (isRiskyExpansionOperand(l, f))
          return { kind: "refuse", detail: arithmeticEvalReason(l.text + f) };
        else n.push(evaluateWord(l, e, !1));
      }
      if (s ? r !== t.text.slice(1, -1) : r.replace(/\s+/g, "") !== t.text.slice(1, -1).replace(/\s+/g, ""))
        return { kind: "refuse", detail: tooComplexReason("string content the parser did not tokenize") };
      return mergeWordParts(n);
    }
    case "concatenation": {
      let n = [],
        r = "";
      for (let [a, o] of t.children.entries()) {
        let u = t.children[a + 1];
        if (o.type === "$") {
          if (u && Te.test(u.text)) return { kind: "refuse", detail: arithmeticEvalReason(`$${u.text}`) };
          (n.push(
            u?.type === "string"
              ? dynamicValue("a locale-translated string")
              : { kind: "literal", text: "$" },
          ),
            (r += "$"));
        } else if (u && isRiskyExpansionOperand(o, u.text + (t.children[a + 2]?.text ?? "")))
          return { kind: "refuse", detail: arithmeticEvalReason(o.text + u.text) };
        else if (u && isDollarQuoteEdge(o, u))
          return { kind: "refuse", detail: tooComplexReason(`the word ${shortenForReason(t.text)}`) };
        else {
          let l = evaluateWord(o, e, i);
          if ((n.push(l), o.type === "word" || o.type === "number")) r += o.text;
          else if (l.kind === "literal") r += l.text.replace(/./gsu, "\\$&");
        }
      }
      let s = mergeWordParts(n);
      if (s.kind === "refuse" || !i) return s;
      if (isBraceExpansionNode(t)) return dynamicValue("a brace expansion");
      if (isBracketGlobNode(t))
        return dynamicValue("a glob pattern", {
          ...DYNAMIC_VALUE_FLAGS,
          inert: s.kind === "literal" && !isRiskyGlob(s.text, r),
          optionSafe: s.kind === "literal" && /^[A-Za-z0-9_.\/~@+]/.test(s.text),
        });
      return s.kind === "literal" && /^=[A-Za-z_]|~\[/.test(s.text) ? dynamicValue("a zsh expansion") : s;
    }
    case "ansi_c_string": {
      let match = /^\$'((?:[^\\']|\\[abeEfnrtv\\'"?])*)'$/.exec(t.text);
      return match
        ? { kind: "literal", text: match[1].replace(/\\(.)/g, (r, s) => ANSI_C_ESCAPES.get(s) ?? s) }
        : dynamicValue("an ansi c string");
    }
    case "translated_string":
      return dynamicValue("a translated string");
    case "simple_expansion": {
      let n = t.children[1];
      if (t.children.length !== 2 || !n) return dynamicValue("an expansion the parser did not resolve");
      if (n.type === "special_variable_name")
        return /^[?#$!]$/.test(n.text)
          ? dynamicValue("a count", zt)
          : dynamicValue(`the parameter $${n.text}`);
      return evaluateVariableReference(e, n.text);
    }
    case "expansion":
      return evaluateParameterExpansion(t, e);
    case "command_substitution": {
      if (t.children.some((r) => /^backtick_(?:escape_unsupported|body_overrun)$/.test(r.type)))
        return { kind: "refuse", detail: tooComplexReason("a backtick substitution it cannot tokenize") };
      let n = withStdinState(t, e, e.stdinFed);
      return n === null
        ? dynamicValue("command output", isSafeValueCommand(t.children, e) ? zt : DYNAMIC_VALUE_FLAGS)
        : { kind: "refuse", detail: n };
    }
    case "process_substitution": {
      let n = withStdinState(t, e, e.stdinFed || t.children[0]?.type !== "<(");
      return n === null ? dynamicValue("a process substitution") : { kind: "refuse", detail: n };
    }
    case "arithmetic_expansion": {
      let n = checkArithmeticNode(t, e);
      return n === null ? dynamicValue("a number", zt) : { kind: "refuse", detail: n };
    }
    case "brace_expression":
    case "extglob_pattern":
    case "regex": {
      let n =
        t.children.length > 0
          ? null
          : hasCommandSubstitutionText(t.text)
            ? `an expansion inside the pattern ${shortenForReason(t.text)} (a bare $NAME, \${NAME} or $1 passes; quote it, as "$NAME", when a [ or : follows; spell a literal $ as an unquoted \\$; put anything else, such as a nested \${\u2026}, a backquote or a $'\u2026' string, in a variable first)`
            : hasProcessSubstitution(t.text)
              ? `a <(, >( or zsh =( that may start a process substitution inside the pattern ${shortenForReason(t.text)} (if you mean it as text, put that text in a variable and write the variable here in double quotes, as "$NAME"; for a [[ =~ ]] regular expression, write the variable unquoted, as $NAME, or write =( as [=](; either keeps it a regular expression)`
              : /\|\||&&/.test(t.text) || containsStandaloneCondCloser(t.text)
                ? `the pattern ${shortenForReason(t.text)}`
                : null;
      if (n !== null && readFlagWithOverride(TENGU_QUILTED_LANTERN, { safe: !0 }))
        return { kind: "refuse", detail: tooComplexReason(n) };
      for (let r of t.children) {
        let s = WORD_NODE_TYPES.has(r.type) ? evaluateWord(r, e, !1) : null;
        if (s?.kind === "refuse") return s;
      }
      return dynamicValue(`a ${t.type.replaceAll("_", " ")}`);
    }
    case "ERROR":
      return { kind: "refuse", detail: tooComplexReason("syntax the parser could not recover") };
    default:
      return { kind: "refuse", detail: tooComplexReason(`a ${t.type} word`) };
  }
}
//@ chunk-63f0f3kd.js:31903-32244 placement
function hasCommandSubstitutionText(t) {
  for (let e of t.matchAll(/\\[\s\S]|[$`]/g)) {
    if (e[0].length === 2) continue;
    if (e[0] === "`") return !0;
    let sliced = t.slice(e.index + 1),
      match = /^(?:\{[A-Za-z_]\w*\}|#?(?:[A-Za-z_\u0080-\uffff][\w\u0080-\uffff]*|\d+|[@*?$!-])|#)/.exec(
        sliced,
      );
    if (
      !(match
        ? !(match[0].startsWith("{") ? /^\[/ : Jn).test(sliced.slice(match[0].length))
        : !/^[{(\[=~^+'"]/.test(sliced))
    )
      return !0;
  }
  return !1;
}
//@ chunk-63f0f3kd.js:32244-32670 placement
function evaluateVariableReference(t, e) {
  if (/^\d+$/.test(e)) return dynamicValue("a positional parameter");
  let i = t.kinds.get(e),
    n =
      (ft.test(e) || BASH_IMPLICITLY_REBOUND_VARS.has(e) || Pn.test(e)) &&
      readFlagWithOverride(TENGU_WOOLLY_WALL, { safe: !0 }),
    r = Yt(e),
    s =
      r && (i === "int" || i === "inert")
        ? `the variable ${e}, which bash or zsh sets by itself`
        : `the variable ${e}`,
    a = !n && !r;
  return dynamicValue(s, {
    integer: i === "int" && a,
    inert: (i === "int" || i === "inert") && a,
    arithmeticSafe: isSafeArithmeticName(e, t),
    optionSafe: t.optionSafeNames.get(e) === !0 && a,
    written: i === "other",
  });
}
//@ chunk-63f0f3kd.js:32670-32701 placement
var TENGU_FOAMY_WATERFALL = "tengu_foamy_waterfall";
//@ chunk-63f0f3kd.js:32701-32739 placement
function Ue() {
  return readFlagWithOverride(TENGU_FOAMY_WATERFALL, { safe: !0 });
}
//@ chunk-63f0f3kd.js:32739-32791 placement
function Yt(t) {
  return (ft.test(t) || Ts.test(t)) && Ue();
}
//@ chunk-63f0f3kd.js:32791-32945 placement
function isSafeArithmeticName(t, e) {
  let i = e.kinds.get(t);
  return (
    !isStartupHazardVariable(t) &&
    !Yt(t) &&
    (i === "int" ||
      (i === void 0 &&
        !e.opaqueNames &&
        !ft.test(t) &&
        (e.shellSetNameWord === null || SHELL_AUTO_VARIABLES.test(t))))
  );
}
//@ chunk-63f0f3kd.js:32945-33030 placement
var TENGU_SHIMMYING_MOCHI = "tengu_shimmying_mochi",
  wi = /^\$\{![A-Za-z_][A-Za-z0-9_]*(?:[@*]|\[[@*]\])\}$/;
//@ chunk-63f0f3kd.js:33030-35033 placement
function evaluateParameterExpansion(t, e) {
  let [i, ...n] = t.children.filter((f) => f.type !== "${" && f.type !== "}"),
    r = { kind: "refuse", detail: arithmeticEvalReason(t.text) },
    s = getFeatureValue_CACHED_MAY_BE_STALE(TENGU_SHIMMYING_MOCHI, !0) !== !1;
  if (s && /^\$\{[\s|]/.test(t.text))
    return { kind: "refuse", detail: tooComplexReason(`the substitution ${shortenForReason(t.text)}`) };
  if (s && t.text.startsWith("${!") && t.text !== "${!}")
    return wi.test(t.text)
      ? dynamicValue("a name listing")
      : /^\$\{![#?]\}$/.test(t.text)
        ? dynamicValue("a positional parameter")
        : r;
  if (!i) return dynamicValue("an expansion the parser did not resolve");
  let a = !s || t.children.map((f) => f.text).join("") === t.text;
  if (i.type === "#") {
    let f = n[0]?.type === "subscript" ? checkSubscript(n[0], e) : null;
    return a && n.length === 1 && f === null
      ? dynamicValue("a length", zt)
      : { kind: "refuse", detail: f ?? arithmeticEvalReason(t.text) };
  }
  if (i.type === "!") {
    let f =
      (n.length === 2 && /^[@*]$/.test(n[1].type)) ||
      (n.length === 1 && n[0].type === "subscript" && /^[@*]$/.test(n[0].children[2]?.text ?? ""));
    return a && f ? dynamicValue("a name listing") : r;
  }
  let o;
  if (i.type === "variable_name") o = evaluateVariableReference(e, i.text);
  else if (i.type === "special_variable_name")
    o = /^[?#$!]$/.test(i.text) ? dynamicValue("a count", zt) : dynamicValue(`the parameter $${i.text}`);
  else if (i.type === "subscript") {
    let f = checkSubscript(i, e);
    if (f !== null) return { kind: "refuse", detail: f };
    o = dynamicValue("an array element");
  } else return { kind: "refuse", detail: tooComplexReason(`the expansion ${shortenForReason(t.text)}`) };
  let u = n[0];
  if (!u) return o;
  let l = i.type === "subscript" ? i.children[0] : i,
    d = /^:?=$/.test(u.type) && l ? describeUnsafeBinding(l.text, e) : null;
  if (d !== null) return { kind: "refuse", detail: d };
  if (u.type === "@") return r;
  if (!PARAM_EXPANSION_OPERATOR_RE.test(u.type)) {
    let found = n.map((h) => checkArithmeticNode(h, e)).find((h) => h !== null);
    return found === void 0 ? dynamicValue("a substring") : { kind: "refuse", detail: found };
  }
  let c = { kind: "literal", text: "" };
  for (let f of n
    .flatMap((h) => (h.type === "array" ? h.children : [h]))
    .filter((h) => WORD_NODE_TYPES.has(h.type)))
    if (((c = evaluateWord(f, e, !1)), c.kind === "refuse")) return c;
  if (/^:?[-=?]$/.test(u.type) && n.length <= 2 && o.kind === "dynamic") {
    let f =
      c.kind === "literal"
        ? { inert: Wt.test(c.text), arithmeticSafe: /^\d*$/.test(c.text) }
        : c.kind === "dynamic"
          ? c
          : DYNAMIC_VALUE_FLAGS;
    return dynamicValue(o.why, {
      integer: !1,
      inert: o.inert && f.inert,
      arithmeticSafe: o.arithmeticSafe && f.arithmeticSafe,
      optionSafe: !1,
      written: o.written || (c.kind === "dynamic" && c.written),
    });
  }
  return dynamicValue(`the expansion ${shortenForReason(t.text)}`);
}
/**
 * 检查数组下标表达式是否安全：变量名必须是普通变量，下标为 @/* 或安全的算术。
 */
//@ chunk-63f0f3kd.js:35033-35288 placement
function checkSubscript(t, e) {
  let [i, ...n] = t.children.filter((r) => r.type !== "[" && r.type !== "]");
  if (i?.type !== "variable_name") return tooComplexReason(`the subscript ${shortenForReason(t.text)}`);
  if (n.length === 1 && /^[@*]$/.test(n[0].text)) return null;
  return n.map((r) => checkArithmeticNode(r, e)).find((r) => r !== null) ?? null;
}
/**
 * 递归检查算术上下文中的节点（数字、变量名、赋值、下标、各类表达式）：可能触发数组下标求值或赋值有害变量时返回原因，否则 null。
 */
//@ chunk-63f0f3kd.js:35288-36220 placement
function checkArithmeticNode(t, e) {
  let i = /_expression$|^(?:variable_assignment|word)$/.test(t.type) ? findShellVarName(t.text) : void 0;
  if (i !== void 0) return environmentAssignmentReason(i, dynamicValue("a number"), "");
  switch (t.type) {
    case "number":
      return /^-?(?:0[xX][0-9a-fA-F]+|[0-9]+#[0-9a-zA-Z@_]+|[0-9]+)$/.test(t.text)
        ? null
        : arithmeticEvalReason(t.text);
    case "variable_name":
    case "word":
      return checkArithmeticText(t.text, t.text, e);
    case "variable_assignment": {
      let n = t.children[0]?.text ?? "";
      return (
        describeUnsafeBinding(n, e) ??
        describeIntegerTyping(n.trim()) ??
        (Ue() ? checkArithmeticText(n.trim(), n, e) : null) ??
        (t.children[2] ? checkArithmeticNode(t.children[2], e) : null)
      );
    }
    case "subscript":
      return checkSubscript(t, e) ?? checkArithmeticText(t.children[0]?.text ?? "", t.text, e);
    default:
      if (
        !/^(?:arithmetic_expansion|c_style_for_statement|compound_statement|(?:binary|unary|postfix|ternary|parenthesized)_expression)$/.test(
          t.type,
        )
      )
        return WORD_NODE_TYPES.has(t.type) ? checkArithmeticWord(t, e) : arithmeticEvalReason(t.text);
      for (let n of t.children) {
        let s =
          (n.children.length === 0 && n.type === n.text && !/^[A-Za-z0-9_]/.test(n.text)) ||
          /^(?:\$\(\(|\(\(|\)\)|\$\[)$/.test(n.type)
            ? null
            : checkArithmeticNode(n, e);
        if (s !== null) return s;
      }
      return null;
  }
}
/**
 * 检查算术上下文中的单词是否安全，危险时返回原因（算术求值或赋值风险）。
 */
//@ chunk-63f0f3kd.js:36220-36453 placement
function checkArithmeticWord(t, e) {
  let i = evaluateWord(t, e, !1);
  if (i.kind === "refuse") return i.detail;
  if (i.kind === "literal") return checkArithmeticText(i.text, t.text, e);
  if (i.arithmeticSafe) return null;
  let match = Pe.exec(t.text),
    r = match?.[2] ?? match?.[3];
  return r === void 0 ? arithmeticEvalReason(t.text) : assignmentHazardReason(t.text, r, e);
}
//@ chunk-63f0f3kd.js:36453-36615 placement
function checkArithmeticText(t, e, i) {
  if (!Rs.test(t) || findShellVarName(t) !== void 0) return arithmeticEvalReason(e);
  let found = (t.match(/[A-Za-z_][A-Za-z0-9_]*/g) ?? []).find((r) => !isSafeArithmeticName(r, i));
  return found === void 0 ? null : assignmentHazardReason(e, found, i);
}

export {
  TOO_COMPLEX_SUFFIX,
  analyzeAssignment,
  STAT_VALUE_NOTE,
  DATE_VALUE_NOTE,
  STATEMENT_NODE_TYPES,
  WORD_NODE_TYPES,
  evaluateWord,
  REDIRECT_NODE_TYPES,
  unverifiableRunReason,
  checkArithmeticNode,
  Ue,
  tooComplexReason,
  isStaticNode,
  isDollarQuoteEdge,
  shortenForReason,
  QUOTED_NAME_RE,
  Te,
  isRiskyExpansionOperand,
  checkSubscript,
  checkArithmeticWord,
  describeWordValue,
  dynamicValue,
  LOCALE_PATH_ENV_RE,
  Yt,
  LOCALE_ENV_RE,
  COMMAND_VALUED_ENV_RE,
  CHARSET_LOCALE_ENV_RE,
  EMPTY_VALUE_RE,
  DECLARE_FLAGS_RE,
  arithmeticEvalReason,
  GIT_TOO_COMPLEX_REASON,
  Me,
  unescapeDoubleQuoted,
  ts,
  isBraceExpansionNode,
  isBracketGlobNode,
  OPTION_POSITION_NOTE,
  dynamicArgumentReason,
  OPTION_POSITION_NOTE_LONG,
  ns,
  hasChildWordMatching,
  SED_PATTERN_NOTE,
};
