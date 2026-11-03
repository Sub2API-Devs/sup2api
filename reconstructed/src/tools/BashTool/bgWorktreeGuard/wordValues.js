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
import { basename, posix } from "path";
import {
  wordSet,
  isStartupHazardVariable,
  SHELL_SPECIAL_VARIABLES,
  isShellManagedVariable,
  isEagerShellSetScreeningEnabled,
  isPlainWordText,
  SHELL_NAME_PATTERN,
  DYNAMIC_VALUE_FLAGS,
  STATIC_VALUE_FLAGS,
  PATH_LIKE_VARIABLES_RE,
  ZSH_SPECIAL_VARIABLES,
  SHELL_AUTO_VARIABLES,
  PLAIN_TEXT_RE,
  SINGLE_VAR_REF_RE,
  SAFE_QUOTED_TEXT_RE,
} from "./shellState.js";
import {
  truncateAtWord,
  countCharInString,
  urlPatternToRegex as urlPatternToRegex_2,
} from "../../../utils/stringUtils.js";
import {
  ARRAY_REF_RE,
  ARRAY_LENGTH_RE,
  isStaticWord,
  hasExpansion,
  TENGU_WOOLLY_WALL,
  isStrictDynamicValuesEnabled,
} from "./commandRules.js";
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
  TRANSPARENT_LAUNCHERS,
  EXEC_LIKE_COMMANDS,
  COMMAND_PREFIX_WORDS,
  isDevicePath,
  KNOWN_PROGRAMS,
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

//@ chunk-63f0f3kd.js:11907-15619 placement
/**
 * 后台 worktree 守卫的值求解常量：declare 标志、参数展开运算符、带引号变量名等正则；值为命令的环境变量、启动钩子变量、可放行的解释器变量、危险 NODE_OPTIONS、locale 变量；语句/单词/重定向节点类型集合；各类拒绝原因的说明文字。
 */
var DECLARE_FLAGS_RE = /^[-+][aAgilurxpfFt]*$/;
var PARAM_EXPANSION_OPERATOR_RE = /^(?::?[-+=?]|##?|%%?|\/[\/#%]?|\^\^?|,,?|@)$/;
var QUOTED_NAME_RE = /^(['"]?)([A-Za-z_][A-Za-z0-9_]*)\1$/;
var COMMAND_VALUED_ENV_RE =
  /(?:^|_)(?:EDITOR|VISUAL|PAGER|BROWSER|SHELL|ASKPASS|RSH|SSH|COMMAND|CMD|OPTIONS|OPTS|INIT|EXTERNAL_DIFF)$|^(?:LESSOPEN|LESSCLOSE|MAILER|FCEDIT|CC|CXX|PERL5OPT|PERL5DB|RUBYOPT|PYTHONSTARTUP|VIMINIT|EXINIT|PS[0-4]|PROMPT[0-4]?|(?:GNU)?MAKEFLAGS|MFLAGS|MAKEFILES)$|^(?:LUA_INIT|R_PROFILE)\w*$/i;
var STARTUP_HOOK_ENV_RE =
  /^(?:PERL5DB|R_PROFILE\w*)$|STARTUP$|_INIT(?:_\w*)?$|INSPECT|BREAKPOINT|REPL|PRELOAD/;
var BENIGN_INTERPRETER_ENV_RE =
  /^(?:PYTHON(?:DONTWRITEBYTECODE|UNBUFFERED|IOENCODING|HASHSEED|UTF8|WARNINGS|FAULTHANDLER|NOUSERSITE|OPTIMIZE|VERBOSE|DEVMODE|SAFEPATH)|NODE_(?:ENV|DEBUG|NO_WARNINGS|DISABLE_COLORS|PENDING_DEPRECATION|TLS_REJECT_UNAUTHORIZED)|NPM_CONFIG_(?:LOGLEVEL|COLOR|YES)|PERL_(?:UNICODE|BADLANG)|RUBY_YJIT_ENABLE|JULIA_NUM_THREADS|DENO_NO_UPDATE_CHECK)$/;
var RISKY_NODE_OPTIONS_RE =
  /(?:^|[\s,])(?:-[^\s=MmIeECSFx-]*[dr]|-e|--(?:require|import|loader|experimental-loader|eval|inspect|interactive)\b)|\binspect\b|\/(?:dev|proc)\//i;
var LOCALE_ENV_RE = /^(?:LANG|LANGUAGE|LC_[A-Z]+)$/;
var CHARSET_LOCALE_ENV_RE = /^(?:LC_ALL|LC_CTYPE|LANG)$/;
var LOCALE_PATH_ENV_RE = /^(?:LOCPATH|GCONV_PATH|GUIX_LOCPATH|PATH_LOCALE|LOCALE_ARCHIVE(?:_\d+_\d+)?)$/;
var EMPTY_VALUE_RE = /^(?:\$'(?:\\[nt ]| )*'|"\s*"|'\s*'|)$/;
var STATEMENT_NODE_TYPES = wordSet(`program list pipeline redirected_statement
  subshell compound_statement negated_command if_statement elif_clause
  else_clause while_statement for_statement c_style_for_statement
  case_statement case_item function_definition do_group variable_assignment
  declaration_command unset_command test_command command comment heredoc_body`);
var WORD_NODE_TYPES = wordSet(`word number string raw_string ansi_c_string
  translated_string concatenation simple_expansion expansion
  command_substitution process_substitution arithmetic_expansion
  brace_expression extglob_pattern regex`);
var REDIRECT_NODE_TYPES = wordSet("file_redirect heredoc_redirect herestring_redirect");
var TOO_COMPLEX_SUFFIX = "inside a construct too complex to verify";
var OPTION_POSITION_NOTE =
  "where an option may stand (a value that is not double-quoted, or whose first character is matched or computed rather than spelled out, may begin with -; spell it out, or put -- before it if it is an operand rather than an option's value)";
var OPTION_POSITION_NOTE_LONG =
  "where an option may stand (a word that is not double-quoted, or whose first character is matched or computed rather than spelled out, may begin with - and be read as an option, even after --; spell it out, running any command substitution as its own command first, or, where the command is otherwise plain, begin a relative path or glob with ./ (a home path with ~/), quote an unquoted variable or a pattern meant for the program, or give an option its value as a separate word)";
var SED_PATTERN_NOTE =
  ' (the check cannot tell where every sed ends a pattern or address here: a bracket is unclosed or holds the delimiter, a control character, "\\[", "[.", "[=", a broken [:class:], "[" just before "]" or "^", or "-]" just after "]"; a y operand holds "["; or the delimiter is "[" or alphanumeric. To pass: use another delimiter; put "-" straight after "[" or "[^" unless "]" already stands there (then match "-" in a command of its own); or move the character, escaped, out of a non-negated bracket)';
var STAT_VALUE_NOTE =
  ' (if this value comes from stat: a word that comes from a variable or a command, or a path starting with a ~ other than ~/, can turn into --help, and stat then prints text, not a number. To pass, write stat -c FORMAT -- "PATH", with FORMAT one of %s %b %B %W %X %Y %Z, PATH in double quotes, and no redirect but 2>/dev/null)';
var DATE_VALUE_NOTE =
  " (if this value comes from date: some versions print %N and %q as a letter and others leave them unchanged, and arithmetic can read either as a variable. To pass: use date +%s, or do the sum in bc or awk)";
var GIT_TOO_COMPLEX_REASON = "names git in a form too complex to verify that it stays inside the worktree";
//@ chunk-63f0f3kd.js:15619-15722 placement
function tooComplexReason(t) {
  return `uses ${t} ${TOO_COMPLEX_SUFFIX}, so it is too complex to verify that it stays inside the worktree`;
}
//@ chunk-63f0f3kd.js:15722-15813 placement
function unverifiableRunReason(program, e) {
  return `runs ${program} ${e} ${TOO_COMPLEX_SUFFIX}, so what it runs cannot be shown not to be git`;
}
//@ chunk-63f0f3kd.js:15813-15927 placement
function arithmeticEvalReason(t) {
  return `evaluates ${shortenForReason(t)} arithmetically ${TOO_COMPLEX_SUFFIX}, which can run a command hidden in a variable's value`;
}
//@ chunk-63f0f3kd.js:15927-17031 placement
function assignmentHazardReason(t, e, i) {
  let n = i.kinds.get(e);
  if (isStartupHazardVariable(e)) {
    let o = n === "int" || (n === undefined && !i.opaqueNames) ? ", so use another variable name" : "";
    return `${arithmeticEvalReason(t)}; ${e} is a variable the shell fills with text of its own${o}`;
  }
  if (isSpecialVariableTypingRisk(e))
    return n === "int"
      ? `${arithmeticEvalReason(t)}; ${e} is a variable bash or zsh sets by itself, so use another variable name`
      : arithmeticEvalReason(t);
  let shellSetNameWord = i.shellSetNameWord;
  if (
    shellSetNameWord !== null &&
    n === undefined &&
    !i.opaqueNames &&
    !SHELL_SPECIAL_VARIABLES.test(e) &&
    !isShellManagedVariable(e) &&
    !new RegExp(`[\\w#]${e}`).test(t)
  ) {
    let o = shortenForReason(shellSetNameWord.text);
    let u = o === shellSetNameWord.token ? `'${o}'` : `'${o}', which contains '${shellSetNameWord.token}'`;
    return `${arithmeticEvalReason(t)}; ${e} is never set in this command, so the shell reads the text ${e} inherits as more variable names, and this command assigns the value ${u}, a name the shell itself rewrites as commands run; run the arithmetic as a separate Bash command without that assignment`;
  }
  let shellFilledWord = i.shellFilledWord;
  let found = shellFilledWord?.match(/[A-Za-z_]\w*/g)?.find(isStartupHazardVariable);
  return found !== undefined &&
    n === undefined &&
    !SHELL_SPECIAL_VARIABLES.test(e) &&
    ![...i.kinds.values()].includes("other")
    ? `${arithmeticEvalReason(t)}; ${e} is not trusted here because the assigned word '${shortenForReason(shellFilledWord)}' contains '${found}', the name of a variable the shell fills with text of its own`
    : arithmeticEvalReason(t);
}
//@ chunk-63f0f3kd.js:17031-17088 placement
function shortenForReason(text) {
  return truncateAtWord(text.replace(/\s+/g, " ").trim(), 40);
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
function dynamicArgumentReason(program, e, { node, value: n }, r) {
  let s = n.kind === "dynamic" ? n.why : describeWordValue(n);
  let a =
    n.kind === "dynamic" && n.many
      ? "that find replaces with all the found paths at once when the clause ends in `{} +` (do not put `{}` right after an option that takes a value, or end the clause with `\\;` so that each run gets one path)"
      : ARRAY_REF_RE.test(node.text.replace(ARRAY_LENGTH_RE, "0"))
        ? 'that should be one element ("$1", "${a[0]}") or spelled out rather than an @-style list (several words, or none, even inside double quotes)'
        : isStaticWord(node) && hasExpansion(node)
          ? 'that is a "$*"-style join, an array length, or a bare arithmetic or special parameter, none of which is accepted (pass one element such as "$1", a plain quoted variable such as "$x", or spell the value out)'
          : r
            ? `that should be quoted whole, with ${e} written as its own word (${r.slice(0, -1)} ${e} "$x"): as written, it can become no word or several words`
            : `that should be one double-quoted or spelled-out word ('*.ts' for a pattern, "$x" or "$(\u2026)" for an expansion): as written, it can become no word or several words`;
  return `a computed ${e} value${r ? ` in the cluster ${r}` : ""} (${s}) ${a} where ${program} reads exactly one,`;
}
//@ chunk-63f0f3kd.js:18442-18746 placement
function recordVariableKind(t, text, i, n = false, r = "") {
  let s = t.kinds.get(text);
  let a = s === undefined || s === i ? i : "inert";
  t.kinds.set(text, s === "other" || i === "other" ? "other" : a);
  t.bindingSites.set(text, (t.bindingSites.get(text) ?? 0) + 1);
  t.optionSafeNames.set(
    text,
    (t.optionSafeNames.get(text) ?? true) &&
      (n ||
        (i === "int" &&
          !readFlagWithOverride(TENGU_WOOLLY_WALL, {
            safe: true,
          }))),
  );
  recordStartupHazard(t, text, i === "other" || RISKY_NODE_OPTIONS_RE.test(r));
}
//@ chunk-63f0f3kd.js:18746-18848 placement
function recordStartupHazard(t, e, i) {
  if (!BENIGN_INTERPRETER_ENV_RE.test(e))
    t.startupHazards.set(e, t.startupHazards.get(e) === true || i || STARTUP_HOOK_ENV_RE.test(e));
}
//@ chunk-63f0f3kd.js:18848-18974 placement
function isLiteralNonOption(t, e) {
  let i = isStaticNode(t) ? evaluateWord(t, e, true) : null;
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
  let i = isStaticNode(t) ? evaluateWord(t, e, false) : null;
  if (i?.kind === "literal" && (i.text.match(/[A-Za-z_]\w*/g) ?? []).some(isStartupHazardVariable)) {
    if (!e.opaqueNames) e.shellFilledWord = i.text;
    e.opaqueNames = true;
  } else if (i?.kind === "literal" && e.shellSetNameWord === null) {
    let found = i.text.match(/[A-Za-z_]\w*/g)?.find(isShellManagedVariable);
    if (found !== undefined && isEagerShellSetScreeningEnabled())
      e.shellSetNameWord = {
        text: i.text,
        token: found,
      };
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
//@ chunk-63f0f3kd.js:19619-23877 placement
/**
 * 处理变量赋值/声明节点：记录变量种类（整数、数组、导出、只读），检测影响 git 或 shell 行为的危险变量。
 */
function analyzeAssignment(child, e, i) {
  switch (child.type) {
    case "variable_assignment": {
      let [n, r, s] = child.children;
      let a = n?.type === "subscript" ? n.children[0] : n;
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
              readFlagWithOverride(TENGU_WOOLLY_WALL, {
                safe: true,
              })
            ) &&
            !!s &&
            isLiteralNonOption(s, e),
          s && isStaticNode(s) ? s.text.replace(/["'\\]/g, "") : "",
        );
      }
      break;
    }
    case "declaration_command": {
      let joined = child.children
        .filter((child) => child.type === "word" && child.text.startsWith("-"))
        .map((child) => child.text)
        .join("");
      for (let child_2 of child.children) {
        let s = child_2.type === "variable_name" ? child_2 : child_2.children[0];
        if (s?.type !== "variable_name") continue;
        if (/[aA]/.test(joined)) e.arrayNames.add(s.text);
        if (joined.includes("i")) e.integerNames.add(s.text);
        else if (child_2.type === "variable_name" && SHELL_SPECIAL_VARIABLES.test(s.text))
          recordVariableKind(e, s.text, "other");
      }
      for (let child_2 of child.children) analyzeAssignment(child_2, e, joined.includes("i"));
      return;
    }
    case "for_statement": {
      let found = child.children.find((child) => child.type === "variable_name");
      let filtered = child.children.filter((child) => WORD_NODE_TYPES.has(child.type));
      let mapped = filtered.map((a) => expansionKind(a, e));
      if (found) {
        let any = child.children.some((child) => child.type === "in");
        recordVariableKind(
          e,
          found.text,
          !any || mapped.includes("other") ? "other" : mapped.every((o) => o === "int") ? "int" : "inert",
          any && filtered.every((o) => isLiteralNonOption(o, e)),
        );
        if (
          any &&
          !isSpecialVariableTypingRisk(found.text) &&
          filtered.every((o) => isStaticNode(o) && !isOpaquePathArgument(o.text.replace(/["'\\]/g, ""), e))
        )
          e.pathNames.add(found.text);
      }
      break;
    }
    case "c_style_for_statement":
    case "arithmetic_expansion":
    case "compound_statement":
      if (child.type !== "compound_statement" || child.children[0]?.type === "((") {
        for (let child_2 of child.children) {
          let r =
            child.type === "c_style_for_statement" &&
            /^(?:do_group|compound_statement)$/.test(child_2.type) &&
            isEagerShellSetScreeningEnabled();
          analyzeAssignment(child_2, e, !r);
        }
        return;
      }
      break;
    case "command_substitution":
    case "process_substitution":
      if (i && isEagerShellSetScreeningEnabled()) {
        for (let child_2 of child.children) analyzeAssignment(child_2, e, false);
        return;
      }
      break;
    case "binary_expression":
    case "unary_expression":
    case "postfix_expression": {
      let found = child.children.find((child) => child.type === "variable_name" || child.type === "word");
      let any = child.children.some((child) => /^(?:[-+*/%&|^]?=|<<=|>>=|\+\+|--)$/.test(child.type));
      if (i && any && found && SHELL_NAME_PATTERN.test(found.text)) recordVariableKind(e, found.text, "int");
      break;
    }
    case "expansion": {
      let [n, r, s] = child.children.slice(1);
      let a = n?.type === "subscript" ? n.children[0] : n;
      if (a?.type === "variable_name" && /^:?=$/.test(r?.type ?? "")) {
        let o = expansionKind(s, e);
        if (n.type === "subscript") e.arrayNames.add(a.text);
        if (SHELL_SPECIAL_VARIABLES.test(a.text)) recordVariableKind(e, a.text, "other");
        else if (e.kinds.has(a.text) || o !== "int")
          recordVariableKind(e, a.text, e.kinds.has(a.text) ? o : "other");
      }
      break;
    }
    case "unset_command":
    case "command": {
      let filtered = child.children.filter(
        (child) =>
          /^(?:command_name|variable_name|unset)$/.test(child.type) || WORD_NODE_TYPES.has(child.type),
      );
      let mapped = filtered.map((c) =>
        WORD_NODE_TYPES.has(c.type) && isStaticNode(c) ? evaluateWord(c, e, true) : null,
      );
      let mapped_2 = filtered.map((c, f) => {
        let h = mapped[f];
        return h?.kind === "literal" ? h.text : c.text.replace(/["'\\]/g, "");
      });
      let any = filtered.some((c, f) => WORD_NODE_TYPES.has(c.type) && mapped[f]?.kind !== "literal");
      let o = basename(mapped_2[0] ?? "");
      let mapped_3 = mapped_2
        .slice(
          0,
          TRANSPARENT_LAUNCHERS.has(o) || EXEC_LIKE_COMMANDS.has(o) || UNHANDLED_EXEC_WRAPPERS.has(o)
            ? mapped_2.length
            : 1,
        )
        .map((c) => basename(c));
      let index = mapped_3.findIndex((c) => /^(?:cd|chdir|pushd|popd)$/.test(c));
      if (index !== -1) {
        let all = mapped_3.slice(0, index).every((b) => COMMAND_PREFIX_WORDS.has(b) || /^-[p-]*$/.test(b));
        let f =
          mapped_2.slice(index + 1).find((b) => !/^-[LPe@]+$|^--$/.test(b)) ??
          (mapped_3[index] === "cd" ? "~" : "-");
        let h =
          !all || /^(?:~[-+0-9]|[-+])/.test(f) || any
            ? ".."
            : /^[\/~]/.test(f) || !e.cwd.startsWith("/")
              ? posix.normalize(f)
              : posix.normalize(`${e.cwd}/${f}`);
        e.opaqueCwd ||= /^\.\.(?:\/|$)/.test(h) || isDevicePath(h);
        e.cwd = /^[\/~]/.test(h) ? h : e.cwd;
      }
      e.deviceLinked ||=
        (mapped_3.some((c) => /^(?:ln|link|cp|mv|mkfifo|mknod)$/.test(c)) &&
          mapped_2.some((c) => isDevicePath(resolveAgainstCwd(c, e)))) ||
        (mapped_3.some((c) => /^(?:ln|link|cp|mv)$/.test(c)) &&
          (any || mapped_2.some((c) => /^(?:\/|\.\.)(?:\/|$)/.test(posix.normalize(c)))));
      e.inputAssembled ||= e.deviceLinked;
      e.allExported ||=
        mapped_3.some((c) => /^(?:set|shopt|setopt)$/.test(c)) &&
        mapped_2.some((c) => /^-[A-Za-z]*a|^allexport$/i.test(c.replace(/_/g, "")));
      for (let child_2 of child.children) {
        let f =
          WORD_NODE_TYPES.has(child_2.type) && TRANSPARENT_LAUNCHERS.has(mapped_3[0] ?? "")
            ? /^([A-Za-z_]\w*)=(.*)$/s.exec(child_2.text.replace(/["'\\]/g, ""))
            : null;
        if (f)
          recordStartupHazard(
            e,
            f[1],
            !isStaticNode(child_2) || !isPlainWordText(f[2]) || RISKY_NODE_OPTIONS_RE.test(f[2]),
          );
      }
      let any_2 = mapped_2.some((c) => /^(?:read|getopts|mapfile|readarray|printf)$/.test(basename(c)));
      if (any_2 || mapped_2.some((c) => basename(c) === "unset")) {
        let any = mapped_2.some((f) => /^(?:mapfile|readarray|-[a-zA-Z]*[aA]\w*)$/.test(f));
        for (let f of mapped_2) {
          let h = /^-[a-zA-Z]*[aA](\w+)$/.exec(f)?.[1] ?? f;
          if (SHELL_NAME_PATTERN.test(h)) {
            if (any_2) recordVariableKind(e, h, "other");
            else {
              e.bindingSites.set(h, (e.bindingSites.get(h) ?? 0) + 1);
              e.optionSafeNames.set(h, false);
            }
            if (any) e.arrayNames.add(h);
          }
        }
        if (any_2) recordVariableKind(e, "REPLY", "other");
      } else if (!KNOWN_PROGRAMS.has(mapped_3[0] ?? ""))
        for (let c of mapped_2.slice(1).filter((f) => SHELL_NAME_PATTERN.test(f)))
          e.bindingSites.set(c, (e.bindingSites.get(c) ?? 0) + 1);
      break;
    }
    default:
      break;
  }
  for (let child_2 of child.children) analyzeAssignment(child_2, e, i);
}
//@ chunk-63f0f3kd.js:23877-23959 placement
function isStaticNode(t) {
  return !/expansion|substitution/.test(t.type) && t.children.every(isStaticNode);
}
//@ chunk-63f0f3kd.js:23959-24012 placement = toScopedConfig (0.805)
function dynamicValue(why, e = DYNAMIC_VALUE_FLAGS) {
  return {
    kind: "dynamic",
    why,
    ...e,
  };
}
//@ chunk-63f0f3kd.js:24012-24569 placement
function mergeWordParts(t) {
  let found = t.find((s) => s.kind === "refuse");
  let filtered = t.filter((s) => s.kind === "dynamic");
  if (found || filtered.length === 0)
    return (
      found ?? {
        kind: "literal",
        text: t.map((s) => (s.kind === "literal" ? s.text : "")).join(""),
      }
    );
  let inert =
    filtered.every((s) => s.kind === "dynamic" && s.integer) &&
    isPlainWordText(t.map((s) => (s.kind === "literal" ? s.text : "")).join(""));
  let found_2 = t.find((s) => s.kind !== "literal" || s.text !== "");
  return t.length === 1
    ? filtered[0]
    : dynamicValue(filtered[0].why, {
        ...DYNAMIC_VALUE_FLAGS,
        inert,
        optionSafe: readFlagWithOverride(TENGU_WOOLLY_WALL, {
          safe: true,
        })
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
    } else if (e.kind !== "dynamic" || !e.optionSafe || e.integer) return false;
  return true;
}
//@ chunk-63f0f3kd.js:24738-24808 placement
function unescapeDoubleQuoted(text) {
  return text.replace(/\\([$`"\\\n])/g, (e, i) =>
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
    .replace(/\[(?:\[[:=.]\w*[:=.]\]|[^\]])*\]/g, (n) => (/\[[:=.]/.test(n.slice(1)) ? "?" : n));
  let i = "";
  for (let idx = 0; idx < replaced.length; idx++) {
    let r = replaced[idx];
    let s = r === "[" ? replaced.indexOf("]", idx + 2) : -1;
    if (s !== -1) {
      i += replaced.slice(idx, s + 1).replace(/^\[!/, "[^");
      idx = s;
    } else i += r === "*" ? ".*" : r === "?" ? "." : r.replace(/[\\^$.|+(){}[\]]/g, "\\$&");
  }
  try {
    let regExp = new RegExp(`^${i}$`, "i");
    return GIT_PROGRAM_NAMES.some((r) => regExp.test(r));
  } catch {
    return true;
  }
}
//@ chunk-63f0f3kd.js:25266-25312 placement
var BOT_PROTECTED_TENGU_RIPPLING_JOURNAL = "bot_protected_tengu_rippling_journal";
//@ chunk-63f0f3kd.js:25312-25475 placement
function isRiskyGlob(pattern, e = pattern) {
  if (countCharInString(pattern, "*") > 16) return true;
  if (
    !readFlagWithOverride(BOT_PROTECTED_TENGU_RIPPLING_JOURNAL, {
      safe: true,
    })
  )
    return urlPatternToRegex(pattern);
  let sliced = e.slice(e.lastIndexOf("/") + 1);
  return (
    e.length > 4096 || urlPatternToRegex(pattern) || globToRegex(sliced) || (sliced !== e && globToRegex(e))
  );
}
//@ chunk-63f0f3kd.js:25475-26342 placement
function globToRegex(t) {
  let index = t.lastIndexOf("]");
  let i = "";
  for (let idx = 0; idx < t.length; idx++) {
    let r = t[idx];
    if (r === "\\") {
      let s = t[idx + 1];
      if (s === undefined) return true;
      i = s === "/" ? "" : i + urlPatternToRegex_2(s);
      idx++;
      continue;
    }
    if (r === "[") {
      let s = t[idx + 1] === "!" || t[idx + 1] === "^";
      let a = idx + (s ? 2 : 1);
      let o = "";
      let u = s;
      let l = index > a ? a : t.length;
      for (; l < t.length && (t[l] !== "]" || l === a); l++) {
        let d = t[l];
        let c = d === "[" && /^[:.=]$/.test(t[l + 1] ?? "");
        if (c && l === a && t[l + 1] !== ":") {
          if (t.indexOf(t[l + 1] + "]", l + 2) !== -1) return true;
          c = false;
        }
        let f = c ? /^\[:[a-z]+:\]/.exec(t.slice(l, l + 12)) : null;
        if (f) {
          u = true;
          l += f[0].length - 1;
        } else if (c || d === "\\" || (d === "-" && t[l + 1] === "[")) return true;
        else if (d === "-" && l !== a && t[l + 1] !== "]") {
          if (!(/[0-9]/.test(t[l - 1]) && /[0-9]/.test(t[l + 1]))) u = true;
        } else o += d;
      }
      if (l < t.length) {
        i += u ? "." : `[${urlPatternToRegex_2(o)}]`;
        idx = l;
        continue;
      }
      if (s && t[a] === "]") {
        i += ".";
        idx = a;
        continue;
      }
    }
    i = r === "/" ? "" : i + (r === "*" ? ".*" : r === "?" ? "." : urlPatternToRegex_2(r));
  }
  try {
    let regExp = new RegExp(`^${i}$`, "i");
    return GIT_PROGRAM_NAMES.some((r) => regExp.test(r));
  } catch {
    return true;
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
  return t.children.some((child) => child.type === "word" && e.test(child.text));
}
//@ chunk-63f0f3kd.js:26522-26601 placement
/**
 * 测试表达式里会被当成运算符的开头（[ 或 :字母）；值落在这里会改变语义。
 */
var TEST_EXPRESSION_OPERAND_RE = /^(?:\[|:[A-Za-z&])/;
var GLOB_WITH_ESCAPE_RE = /(?:^|[^\\])(?:\\\\)*[*?]/;
var GLOB_SIMPLE_RE = /(?:^|[^\\])[*?]/;
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
//@ chunk-63f0f3kd.js:26714-26846 placement
/**
 * 判断展开节点的值是否用于有风险的表达式位置（如 zsh 特殊下标或测试表达式）。
 */
function isRiskyExpansionOperand(t, text) {
  return (
    /expansion$/.test(t.type) &&
    (/^\$\W$/.test(t.text) ? ZSH_SPECIAL_SUBSCRIPT_TESTEXPR_RE : TEST_EXPRESSION_OPERAND_RE).test(
      /^\$\d$/.test(t.text) ? text.replace(/^\d+/, "") : text,
    )
  );
}
//@ chunk-63f0f3kd.js:26846-26877 placement
/**
 * 判断 $ 后面接的内容是否构成算术或测试表达式（[[、=~、^、+ 等）。
 */
var DOLLAR_QUOTE_EDGE_RE = /^(?:[[=~^+]|#\w*[[:])/;
//@ chunk-63f0f3kd.js:26877-26986 placement
/**
 * 判断节点相邻处是否构成 $'...' 引号边界的特殊情况。
 */
function isDollarQuoteEdge(t, e) {
  return e.type === "raw_string" && (t.text === "$$" || (t.text.endsWith("$") && e.text.endsWith("\\'")));
}
//@ chunk-63f0f3kd.js:26986-27015 placement
var TENGU_JAUNTY_FOREST = "tengu_jaunty_forest";
//@ chunk-63f0f3kd.js:27015-27053 placement
/**
 * 读取 tengu_jaunty_forest 开关：字符串内容是否按字节精确校验（开启时更保守）。
 */
function isParameterExpansionStrictnessOn() {
  return readFlagWithOverride(TENGU_JAUNTY_FOREST, {
    safe: true,
  });
}
//@ chunk-63f0f3kd.js:27053-27084 placement
var TENGU_QUILTED_LANTERN = "tengu_quilted_lantern";
//@ chunk-63f0f3kd.js:27084-27292 placement
function hasProcessSubstitution(text) {
  let e = 0;
  for (let idx = 0; idx < text.length; idx++) {
    if ((text[idx] === "<" || text[idx] === ">") && text[idx + 1] === "(" && e % 2 === 0) return true;
    e = text[idx] === "\\" ? e + 1 : 0;
  }
  let i = text.search(/[|&\s]/);
  return text.startsWith("=(") || (i >= 0 && text.includes("=(", i));
}
//@ chunk-63f0f3kd.js:27292-31903 placement
/**
 * 把一个 shell 单词节点静态求值：literal（可确定文本）、dynamic（运行期值，附原因与属性）或 refuse（无法判断，拒绝）。
 */
function evaluateWord(t, e, i) {
  switch (t.type) {
    case "word":
    case "number":
      if (WORD_LEAF_EXPANSION_RE.test(t.text) || WORD_LEAF_QUOTE_RE.test(t.text))
        return {
          kind: "refuse",
          detail: tooComplexReason(`the word ${shortenForReason(t.text)}`),
        };
      if (i && GLOB_SIMPLE_RE.test(t.text))
        return dynamicValue("a glob pattern", {
          ...DYNAMIC_VALUE_FLAGS,
          inert: !isRiskyGlob(t.text),
          optionSafe: /^[A-Za-z0-9_.\/~@+]/.test(t.text),
        });
      if (i && isStrictDynamicValuesEnabled() && GLOB_WITH_ESCAPE_RE.test(t.text))
        return {
          kind: "refuse",
          detail: tooComplexReason(
            `the word ${shortenForReason(t.text)}, whose * or ? the shell expands as a file pattern (an even run of backslashes does not escape it),`,
          ),
        };
      return t.text.endsWith("\\")
        ? dynamicValue("a trailing backslash")
        : {
            kind: "literal",
            text: t.text.replace(/\\(.)/g, "$1"),
          };
    case "raw_string":
      return {
        kind: "literal",
        text: t.text.slice(1, -1),
      };
    case "string": {
      let n = [];
      let r = "";
      let s = isParameterExpansionStrictnessOn();
      let a = s ? Buffer.from(t.text, "utf8") : null;
      let startIndex = t.startIndex;
      for (let [u, l] of t.children.entries()) {
        let d = a ? a.subarray(startIndex - t.startIndex, l.startIndex - t.startIndex).toString("utf8") : "";
        startIndex = l.endIndex;
        if (/^[ \t\n]+$/.test(d)) {
          r += d;
          n.push({
            kind: "literal",
            text: d,
          });
        }
        let c = t.children[u + 1];
        let f =
          c?.type === "string_content"
            ? c.text
            : c?.type === "$" && c.startIndex === l.endIndex
              ? c.text + (t.children[u + 2]?.text ?? "")
              : "";
        if (l.type === '"') continue;
        r += l.text;
        if (l.type === "string_content")
          n.push({
            kind: "literal",
            text: unescapeDoubleQuoted(l.text),
          });
        else if (l.type === "$") {
          if (DOLLAR_QUOTE_EDGE_RE.test(f))
            return {
              kind: "refuse",
              detail: arithmeticEvalReason(`$${f}`),
            };
          n.push({
            kind: "literal",
            text: "$",
          });
        } else if (isRiskyExpansionOperand(l, f))
          return {
            kind: "refuse",
            detail: arithmeticEvalReason(l.text + f),
          };
        else n.push(evaluateWord(l, e, false));
      }
      if (s ? r !== t.text.slice(1, -1) : r.replace(/\s+/g, "") !== t.text.slice(1, -1).replace(/\s+/g, ""))
        return {
          kind: "refuse",
          detail: tooComplexReason("string content the parser did not tokenize"),
        };
      return mergeWordParts(n);
    }
    case "concatenation": {
      let n = [];
      let r = "";
      for (let [a, o] of t.children.entries()) {
        let u = t.children[a + 1];
        if (o.type === "$") {
          if (u && DOLLAR_QUOTE_EDGE_RE.test(u.text))
            return {
              kind: "refuse",
              detail: arithmeticEvalReason(`$${u.text}`),
            };
          n.push(
            u?.type === "string"
              ? dynamicValue("a locale-translated string")
              : {
                  kind: "literal",
                  text: "$",
                },
          );
          r += "$";
        } else if (u && isRiskyExpansionOperand(o, u.text + (t.children[a + 2]?.text ?? "")))
          return {
            kind: "refuse",
            detail: arithmeticEvalReason(o.text + u.text),
          };
        else if (u && isDollarQuoteEdge(o, u))
          return {
            kind: "refuse",
            detail: tooComplexReason(`the word ${shortenForReason(t.text)}`),
          };
        else {
          let l = evaluateWord(o, e, i);
          n.push(l);
          if (o.type === "word" || o.type === "number") r += o.text;
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
        ? {
            kind: "literal",
            text: match[1].replace(/\\(.)/g, (r, s) => ANSI_C_ESCAPES.get(s) ?? s),
          }
        : dynamicValue("an ansi c string");
    }
    case "translated_string":
      return dynamicValue("a translated string");
    case "simple_expansion": {
      let n = t.children[1];
      if (t.children.length !== 2 || !n) return dynamicValue("an expansion the parser did not resolve");
      if (n.type === "special_variable_name")
        return /^[?#$!]$/.test(n.text)
          ? dynamicValue("a count", STATIC_VALUE_FLAGS)
          : dynamicValue(`the parameter $${n.text}`);
      return evaluateVariableReference(e, n.text);
    }
    case "expansion":
      return evaluateParameterExpansion(t, e);
    case "command_substitution": {
      if (t.children.some((child) => /^backtick_(?:escape_unsupported|body_overrun)$/.test(child.type)))
        return {
          kind: "refuse",
          detail: tooComplexReason("a backtick substitution it cannot tokenize"),
        };
      let n = withStdinState(t, e, e.stdinFed);
      return n === null
        ? dynamicValue(
            "command output",
            isSafeValueCommand(t.children, e) ? STATIC_VALUE_FLAGS : DYNAMIC_VALUE_FLAGS,
          )
        : {
            kind: "refuse",
            detail: n,
          };
    }
    case "process_substitution": {
      let n = withStdinState(t, e, e.stdinFed || t.children[0]?.type !== "<(");
      return n === null
        ? dynamicValue("a process substitution")
        : {
            kind: "refuse",
            detail: n,
          };
    }
    case "arithmetic_expansion": {
      let n = checkArithmeticNode(t, e);
      return n === null
        ? dynamicValue("a number", STATIC_VALUE_FLAGS)
        : {
            kind: "refuse",
            detail: n,
          };
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
      if (
        n !== null &&
        readFlagWithOverride(TENGU_QUILTED_LANTERN, {
          safe: true,
        })
      )
        return {
          kind: "refuse",
          detail: tooComplexReason(n),
        };
      for (let child of t.children) {
        let s = WORD_NODE_TYPES.has(child.type) ? evaluateWord(child, e, false) : null;
        if (s?.kind === "refuse") return s;
      }
      return dynamicValue(`a ${t.type.replaceAll("_", " ")}`);
    }
    case "ERROR":
      return {
        kind: "refuse",
        detail: tooComplexReason("syntax the parser could not recover"),
      };
    default:
      return {
        kind: "refuse",
        detail: tooComplexReason(`a ${t.type} word`),
      };
  }
}
//@ chunk-63f0f3kd.js:31903-32244 placement
function hasCommandSubstitutionText(text) {
  for (let e of text.matchAll(/\\[\s\S]|[$`]/g)) {
    if (e[0].length === 2) continue;
    if (e[0] === "`") return true;
    let sliced = text.slice(e.index + 1);
    let match = /^(?:\{[A-Za-z_]\w*\}|#?(?:[A-Za-z_\u0080-\uffff][\w\u0080-\uffff]*|\d+|[@*?$!-])|#)/.exec(
      sliced,
    );
    if (
      !(match
        ? !(match[0].startsWith("{") ? /^\[/ : TEST_EXPRESSION_OPERAND_RE).test(sliced.slice(match[0].length))
        : !/^[{(\[=~^+'"]/.test(sliced))
    )
      return true;
  }
  return false;
}
//@ chunk-63f0f3kd.js:32244-32670 placement
function evaluateVariableReference(t, text) {
  if (/^\d+$/.test(text)) return dynamicValue("a positional parameter");
  let i = t.kinds.get(text);
  let n =
    (SHELL_SPECIAL_VARIABLES.test(text) ||
      BASH_IMPLICITLY_REBOUND_VARS.has(text) ||
      PATH_LIKE_VARIABLES_RE.test(text)) &&
    readFlagWithOverride(TENGU_WOOLLY_WALL, {
      safe: true,
    });
  let r = isSpecialVariableTypingRisk(text);
  let s =
    r && (i === "int" || i === "inert")
      ? `the variable ${text}, which bash or zsh sets by itself`
      : `the variable ${text}`;
  let a = !n && !r;
  return dynamicValue(s, {
    integer: i === "int" && a,
    inert: (i === "int" || i === "inert") && a,
    arithmeticSafe: isSafeArithmeticName(text, t),
    optionSafe: t.optionSafeNames.get(text) === true && a,
    written: i === "other",
  });
}
//@ chunk-63f0f3kd.js:32670-32701 placement
var TENGU_FOAMY_WATERFALL = "tengu_foamy_waterfall";
//@ chunk-63f0f3kd.js:32701-32739 placement
/**
 * 读取 tengu_foamy_waterfall 开关。
 */
function isShellSpecialVariableTypingEnabled() {
  return readFlagWithOverride(TENGU_FOAMY_WATERFALL, {
    safe: true,
  });
}
//@ chunk-63f0f3kd.js:32739-32791 placement
/**
 * 名字是 bash/zsh 特殊变量且开关开启时返回 true（这类变量被设为整数后可被当成算术求值）。
 */
function isSpecialVariableTypingRisk(t) {
  return (
    (SHELL_SPECIAL_VARIABLES.test(t) || ZSH_SPECIAL_VARIABLES.test(t)) &&
    isShellSpecialVariableTypingEnabled()
  );
}
//@ chunk-63f0f3kd.js:32791-32945 placement
function isSafeArithmeticName(t, e) {
  let i = e.kinds.get(t);
  return (
    !isStartupHazardVariable(t) &&
    !isSpecialVariableTypingRisk(t) &&
    (i === "int" ||
      (i === undefined &&
        !e.opaqueNames &&
        !SHELL_SPECIAL_VARIABLES.test(t) &&
        (e.shellSetNameWord === null || SHELL_AUTO_VARIABLES.test(t))))
  );
}
//@ chunk-63f0f3kd.js:32945-33030 placement
/**
 * 匹配 ${!prefix@}、${!prefix[*]} 这类间接名字列表展开。
 */
var TENGU_SHIMMYING_MOCHI = "tengu_shimmying_mochi";
var INDIRECT_NAME_LIST_RE = /^\$\{![A-Za-z_][A-Za-z0-9_]*(?:[@*]|\[[@*]\])\}$/;
//@ chunk-63f0f3kd.js:33030-35033 placement
function evaluateParameterExpansion(t, e) {
  let [i, ...n] = t.children.filter((child) => child.type !== "${" && child.type !== "}");
  let r = {
    kind: "refuse",
    detail: arithmeticEvalReason(t.text),
  };
  let s = getFeatureValue_CACHED_MAY_BE_STALE(TENGU_SHIMMYING_MOCHI, true) !== false;
  if (s && /^\$\{[\s|]/.test(t.text))
    return {
      kind: "refuse",
      detail: tooComplexReason(`the substitution ${shortenForReason(t.text)}`),
    };
  if (s && t.text.startsWith("${!") && t.text !== "${!}")
    return INDIRECT_NAME_LIST_RE.test(t.text)
      ? dynamicValue("a name listing")
      : /^\$\{![#?]\}$/.test(t.text)
        ? dynamicValue("a positional parameter")
        : r;
  if (!i) return dynamicValue("an expansion the parser did not resolve");
  let a = !s || t.children.map((child) => child.text).join("") === t.text;
  if (i.type === "#") {
    let f = n[0]?.type === "subscript" ? checkSubscript(n[0], e) : null;
    return a && n.length === 1 && f === null
      ? dynamicValue("a length", STATIC_VALUE_FLAGS)
      : {
          kind: "refuse",
          detail: f ?? arithmeticEvalReason(t.text),
        };
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
    o = /^[?#$!]$/.test(i.text)
      ? dynamicValue("a count", STATIC_VALUE_FLAGS)
      : dynamicValue(`the parameter $${i.text}`);
  else if (i.type === "subscript") {
    let f = checkSubscript(i, e);
    if (f !== null)
      return {
        kind: "refuse",
        detail: f,
      };
    o = dynamicValue("an array element");
  } else
    return {
      kind: "refuse",
      detail: tooComplexReason(`the expansion ${shortenForReason(t.text)}`),
    };
  let u = n[0];
  if (!u) return o;
  let l = i.type === "subscript" ? i.children[0] : i;
  let d = /^:?=$/.test(u.type) && l ? describeUnsafeBinding(l.text, e) : null;
  if (d !== null)
    return {
      kind: "refuse",
      detail: d,
    };
  if (u.type === "@") return r;
  if (!PARAM_EXPANSION_OPERATOR_RE.test(u.type)) {
    let found = n.map((h) => checkArithmeticNode(h, e)).find((h) => h !== null);
    return found === undefined
      ? dynamicValue("a substring")
      : {
          kind: "refuse",
          detail: found,
        };
  }
  let c = {
    kind: "literal",
    text: "",
  };
  for (let f of n
    .flatMap((h) => (h.type === "array" ? h.children : [h]))
    .filter((h) => WORD_NODE_TYPES.has(h.type))) {
    c = evaluateWord(f, e, false);
    if (c.kind === "refuse") return c;
  }
  if (/^:?[-=?]$/.test(u.type) && n.length <= 2 && o.kind === "dynamic") {
    let f =
      c.kind === "literal"
        ? {
            inert: PLAIN_TEXT_RE.test(c.text),
            arithmeticSafe: /^\d*$/.test(c.text),
          }
        : c.kind === "dynamic"
          ? c
          : DYNAMIC_VALUE_FLAGS;
    return dynamicValue(o.why, {
      integer: false,
      inert: o.inert && f.inert,
      arithmeticSafe: o.arithmeticSafe && f.arithmeticSafe,
      optionSafe: false,
      written: o.written || (c.kind === "dynamic" && c.written),
    });
  }
  return dynamicValue(`the expansion ${shortenForReason(t.text)}`);
}
//@ chunk-63f0f3kd.js:35033-35288 placement
/**
 * 检查数组下标表达式是否安全：变量名必须是普通变量，下标为 @/* 或安全的算术。
 */
function checkSubscript(t, e) {
  let [i, ...n] = t.children.filter((child) => child.type !== "[" && child.type !== "]");
  if (i?.type !== "variable_name") return tooComplexReason(`the subscript ${shortenForReason(t.text)}`);
  if (n.length === 1 && /^[@*]$/.test(n[0].text)) return null;
  return n.map((r) => checkArithmeticNode(r, e)).find((r) => r !== null) ?? null;
}
//@ chunk-63f0f3kd.js:35288-36220 placement
/**
 * 递归检查算术上下文中的节点（数字、变量名、赋值、下标、各类表达式）：可能触发数组下标求值或赋值有害变量时返回原因，否则 null。
 */
function checkArithmeticNode(t, e) {
  let i = /_expression$|^(?:variable_assignment|word)$/.test(t.type) ? findShellVarName(t.text) : undefined;
  if (i !== undefined) return environmentAssignmentReason(i, dynamicValue("a number"), "");
  switch (t.type) {
    case "number":
      return /^-?(?:0[xX][0-9a-fA-F]+|[0-9]+#[0-9a-zA-Z@_]+|[0-9]+)$/.test(t.text)
        ? null
        : arithmeticEvalReason(t.text);
    case "variable_name":
    case "word":
      return checkArithmeticText(t.text, t.text, e);
    case "variable_assignment": {
      let text = t.children[0]?.text ?? "";
      return (
        describeUnsafeBinding(text, e) ??
        describeIntegerTyping(text.trim()) ??
        (isShellSpecialVariableTypingEnabled() ? checkArithmeticText(text.trim(), text, e) : null) ??
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
      for (let child of t.children) {
        let s =
          (child.children.length === 0 && child.type === child.text && !/^[A-Za-z0-9_]/.test(child.text)) ||
          /^(?:\$\(\(|\(\(|\)\)|\$\[)$/.test(child.type)
            ? null
            : checkArithmeticNode(child, e);
        if (s !== null) return s;
      }
      return null;
  }
}
//@ chunk-63f0f3kd.js:36220-36453 placement
/**
 * 检查算术上下文中的单词是否安全，危险时返回原因（算术求值或赋值风险）。
 */
function checkArithmeticWord(child, e) {
  let i = evaluateWord(child, e, false);
  if (i.kind === "refuse") return i.detail;
  if (i.kind === "literal") return checkArithmeticText(i.text, child.text, e);
  if (i.arithmeticSafe) return null;
  let match = SINGLE_VAR_REF_RE.exec(child.text);
  let r = match?.[2] ?? match?.[3];
  return r === undefined ? arithmeticEvalReason(child.text) : assignmentHazardReason(child.text, r, e);
}
//@ chunk-63f0f3kd.js:36453-36615 placement
function checkArithmeticText(text, text_2, i) {
  if (!SAFE_QUOTED_TEXT_RE.test(text) || findShellVarName(text) !== undefined)
    return arithmeticEvalReason(text_2);
  let found = (text.match(/[A-Za-z_][A-Za-z0-9_]*/g) ?? []).find((r) => !isSafeArithmeticName(r, i));
  return found === undefined ? null : assignmentHazardReason(text_2, found, i);
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
  isShellSpecialVariableTypingEnabled,
  tooComplexReason,
  isStaticNode,
  isDollarQuoteEdge,
  shortenForReason,
  QUOTED_NAME_RE,
  DOLLAR_QUOTE_EDGE_RE,
  isRiskyExpansionOperand,
  checkSubscript,
  checkArithmeticWord,
  describeWordValue,
  dynamicValue,
  LOCALE_PATH_ENV_RE,
  isSpecialVariableTypingRisk,
  LOCALE_ENV_RE,
  COMMAND_VALUED_ENV_RE,
  CHARSET_LOCALE_ENV_RE,
  EMPTY_VALUE_RE,
  DECLARE_FLAGS_RE,
  arithmeticEvalReason,
  GIT_TOO_COMPLEX_REASON,
  GLOB_WITH_ESCAPE_RE,
  unescapeDoubleQuoted,
  GLOB_SIMPLE_RE,
  isBraceExpansionNode,
  isBracketGlobNode,
  OPTION_POSITION_NOTE,
  dynamicArgumentReason,
  OPTION_POSITION_NOTE_LONG,
  isParameterExpansionStrictnessOn,
  hasChildWordMatching,
  SED_PATTERN_NOTE,
};
