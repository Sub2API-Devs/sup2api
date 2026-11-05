/**
 * tools/BashTool/bgWorktreeGuard/wordValues.ts
 *
 * 2.1.316 新增：后台 worktree 守卫的值求解：单词展开、参数展开、变量赋值的静态求值与风险原因。
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * new in 2.1.318 (2.1.88 has no file at this path)
 * pieces: chunk-h2y5xkdx.js (49)
 * attribution: placement 47, layout 2
 * (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.
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
import { deferInit } from "../../../../runtime/deferred-init.js";

//@ chunk-h2y5xkdx.js:12271-15983 placement
/**
 * 后台 worktree 守卫的值求解常量：declare 标志、参数展开运算符、带引号变量名等正则；值为命令的环境变量、启动钩子变量、可放行的解释器变量、危险 NODE_OPTIONS、locale 变量；语句/单词/重定向节点类型集合；各类拒绝原因的说明文字。
 */
var DECLARE_FLAGS_RE; // deferred: uses wordSet (./shellState.js) of its import cycle while loading; runs once the cycle is complete
var PARAM_EXPANSION_OPERATOR_RE;
var QUOTED_NAME_RE;
var COMMAND_VALUED_ENV_RE;
var STARTUP_HOOK_ENV_RE;
var BENIGN_INTERPRETER_ENV_RE;
var RISKY_NODE_OPTIONS_RE;
var LOCALE_ENV_RE;
var CHARSET_LOCALE_ENV_RE;
var LOCALE_PATH_ENV_RE;
var EMPTY_VALUE_RE;
var STATEMENT_NODE_TYPES;
var WORD_NODE_TYPES;
var REDIRECT_NODE_TYPES;
var TOO_COMPLEX_SUFFIX;
var OPTION_POSITION_NOTE;
var OPTION_POSITION_NOTE_LONG;
var SED_PATTERN_NOTE;
var STAT_VALUE_NOTE;
var DATE_VALUE_NOTE;
var GIT_TOO_COMPLEX_REASON;
deferInit("chunk-h2y5xkdx.js:12271", () => {
  DECLARE_FLAGS_RE = /^[-+][aAgilurxpfFt]*$/;
  PARAM_EXPANSION_OPERATOR_RE = /^(?::?[-+=?]|##?|%%?|\/[\/#%]?|\^\^?|,,?|@)$/;
  QUOTED_NAME_RE = /^(['"]?)([A-Za-z_][A-Za-z0-9_]*)\1$/;
  COMMAND_VALUED_ENV_RE =
    /(?:^|_)(?:EDITOR|VISUAL|PAGER|BROWSER|SHELL|ASKPASS|RSH|SSH|COMMAND|CMD|OPTIONS|OPTS|INIT|EXTERNAL_DIFF)$|^(?:LESSOPEN|LESSCLOSE|MAILER|FCEDIT|CC|CXX|PERL5OPT|PERL5DB|RUBYOPT|PYTHONSTARTUP|VIMINIT|EXINIT|PS[0-4]|PROMPT[0-4]?|(?:GNU)?MAKEFLAGS|MFLAGS|MAKEFILES)$|^(?:LUA_INIT|R_PROFILE)\w*$/i;
  STARTUP_HOOK_ENV_RE = /^(?:PERL5DB|R_PROFILE\w*)$|STARTUP$|_INIT(?:_\w*)?$|INSPECT|BREAKPOINT|REPL|PRELOAD/;
  BENIGN_INTERPRETER_ENV_RE =
    /^(?:PYTHON(?:DONTWRITEBYTECODE|UNBUFFERED|IOENCODING|HASHSEED|UTF8|WARNINGS|FAULTHANDLER|NOUSERSITE|OPTIMIZE|VERBOSE|DEVMODE|SAFEPATH)|NODE_(?:ENV|DEBUG|NO_WARNINGS|DISABLE_COLORS|PENDING_DEPRECATION|TLS_REJECT_UNAUTHORIZED)|NPM_CONFIG_(?:LOGLEVEL|COLOR|YES)|PERL_(?:UNICODE|BADLANG)|RUBY_YJIT_ENABLE|JULIA_NUM_THREADS|DENO_NO_UPDATE_CHECK)$/;
  RISKY_NODE_OPTIONS_RE =
    /(?:^|[\s,])(?:-[^\s=MmIeECSFx-]*[dr]|-e|--(?:require|import|loader|experimental-loader|eval|inspect|interactive)\b)|\binspect\b|\/(?:dev|proc)\//i;
  LOCALE_ENV_RE = /^(?:LANG|LANGUAGE|LC_[A-Z]+)$/;
  CHARSET_LOCALE_ENV_RE = /^(?:LC_ALL|LC_CTYPE|LANG)$/;
  LOCALE_PATH_ENV_RE = /^(?:LOCPATH|GCONV_PATH|GUIX_LOCPATH|PATH_LOCALE|LOCALE_ARCHIVE(?:_\d+_\d+)?)$/;
  EMPTY_VALUE_RE = /^(?:\$'(?:\\[nt ]| )*'|"\s*"|'\s*'|)$/;
  STATEMENT_NODE_TYPES = wordSet(`program list pipeline redirected_statement
  subshell compound_statement negated_command if_statement elif_clause
  else_clause while_statement for_statement c_style_for_statement
  case_statement case_item function_definition do_group variable_assignment
  declaration_command unset_command test_command command comment heredoc_body`);
  WORD_NODE_TYPES = wordSet(`word number string raw_string ansi_c_string
  translated_string concatenation simple_expansion expansion
  command_substitution process_substitution arithmetic_expansion
  brace_expression extglob_pattern regex`);
  REDIRECT_NODE_TYPES = wordSet("file_redirect heredoc_redirect herestring_redirect");
  TOO_COMPLEX_SUFFIX = "inside a construct too complex to verify";
  OPTION_POSITION_NOTE =
    "where an option may stand (a value that is not double-quoted, or whose first character is matched or computed rather than spelled out, may begin with -; spell it out, or put -- before it if it is an operand rather than an option's value)";
  OPTION_POSITION_NOTE_LONG =
    "where an option may stand (a word that is not double-quoted, or whose first character is matched or computed rather than spelled out, may begin with - and be read as an option, even after --; spell it out, running any command substitution as its own command first, or, where the command is otherwise plain, begin a relative path or glob with ./ (a home path with ~/), quote an unquoted variable or a pattern meant for the program, or give an option its value as a separate word)";
  SED_PATTERN_NOTE =
    ' (the check cannot tell where every sed ends a pattern or address here: a bracket is unclosed or holds the delimiter, a control character, "\\[", "[.", "[=", a broken [:class:], "[" just before "]" or "^", or "-]" just after "]"; a y operand holds "["; or the delimiter is "[" or alphanumeric. To pass: use another delimiter; put "-" straight after "[" or "[^" unless "]" already stands there (then match "-" in a command of its own); or move the character, escaped, out of a non-negated bracket)';
  STAT_VALUE_NOTE =
    ' (if this value comes from stat: a word that comes from a variable or a command, or a path starting with a ~ other than ~/, can turn into --help, and stat then prints text, not a number. To pass, write stat -c FORMAT -- "PATH", with FORMAT one of %s %b %B %W %X %Y %Z, PATH in double quotes, and no redirect but 2>/dev/null)';
  DATE_VALUE_NOTE =
    " (if this value comes from date: some versions print %N and %q as a letter and others leave them unchanged, and arithmetic can read either as a variable. To pass: use date +%s, or do the sum in bc or awk)";
  GIT_TOO_COMPLEX_REASON = "names git in a form too complex to verify that it stays inside the worktree";
});
//@ chunk-h2y5xkdx.js:15983-16086 placement
function tooComplexReason(what) {
  return `uses ${what} ${TOO_COMPLEX_SUFFIX}, so it is too complex to verify that it stays inside the worktree`;
}
//@ chunk-h2y5xkdx.js:16086-16177 placement
function unverifiableRunReason(program, detail) {
  return `runs ${program} ${detail} ${TOO_COMPLEX_SUFFIX}, so what it runs cannot be shown not to be git`;
}
//@ chunk-h2y5xkdx.js:16177-16291 placement
function arithmeticEvalReason(text) {
  return `evaluates ${shortenForReason(text)} arithmetically ${TOO_COMPLEX_SUFFIX}, which can run a command hidden in a variable's value`;
}
//@ chunk-h2y5xkdx.js:16291-17395 placement
function assignmentHazardReason(text, name, state) {
  let kind = state.kinds.get(name);
  if (isStartupHazardVariable(name)) {
    let renameHint =
      kind === "int" || (kind === undefined && !state.opaqueNames) ? ", so use another variable name" : "";
    return `${arithmeticEvalReason(text)}; ${name} is a variable the shell fills with text of its own${renameHint}`;
  }
  if (isSpecialVariableTypingRisk(name))
    return kind === "int"
      ? `${arithmeticEvalReason(text)}; ${name} is a variable bash or zsh sets by itself, so use another variable name`
      : arithmeticEvalReason(text);
  let shellSetNameWord = state.shellSetNameWord;
  if (
    shellSetNameWord !== null &&
    kind === undefined &&
    !state.opaqueNames &&
    !SHELL_SPECIAL_VARIABLES.test(name) &&
    !isShellManagedVariable(name) &&
    !new RegExp(`[\\w#]${name}`).test(text)
  ) {
    let shortText = shortenForReason(shellSetNameWord.text);
    let assignText =
      shortText === shellSetNameWord.token
        ? `'${shortText}'`
        : `'${shortText}', which contains '${shellSetNameWord.token}'`;
    return `${arithmeticEvalReason(text)}; ${name} is never set in this command, so the shell reads the text ${name} inherits as more variable names, and this command assigns the value ${assignText}, a name the shell itself rewrites as commands run; run the arithmetic as a separate Bash command without that assignment`;
  }
  let shellFilledWord = state.shellFilledWord;
  let found = shellFilledWord?.match(/[A-Za-z_]\w*/g)?.find(isStartupHazardVariable);
  return found !== undefined &&
    kind === undefined &&
    !SHELL_SPECIAL_VARIABLES.test(name) &&
    ![...state.kinds.values()].includes("other")
    ? `${arithmeticEvalReason(text)}; ${name} is not trusted here because the assigned word '${shortenForReason(shellFilledWord)}' contains '${found}', the name of a variable the shell fills with text of its own`
    : arithmeticEvalReason(text);
}
//@ chunk-h2y5xkdx.js:17395-17452 placement
function shortenForReason(text) {
  return truncateAtWord(text.replace(/\s+/g, " ").trim(), 40);
}
//@ chunk-h2y5xkdx.js:17452-17686 placement
function describeWordValue(value) {
  switch (value.kind) {
    case "literal": {
      let shortText = shortenForReason(value.text);
      return shortText !== ""
        ? `the text ${shortText}`
        : value.text === ""
          ? "an empty word"
          : "a whitespace-only word";
    }
    case "dynamic":
      return `a value computed at runtime (${value.why})`;
    case "refuse":
      return value.detail;
  }
}
//@ chunk-h2y5xkdx.js:17686-18722 layout
function describeWordRefusal(program, { node, value }, clusterHint) {
  let describe = value.kind === "dynamic" ? value.why : describeWordValue(value);
  let advice =
    value.kind === "dynamic" && value.many
      ? "that find replaces with all the found paths at once when the clause ends in `{} +` (do not put `{}` right after an option that takes a value, or end the clause with `\\;` so that each run gets one path)"
      : ARRAY_REF_RE.test(node.text.replace(ARRAY_LENGTH_RE, "0"))
        ? 'that should be one element ("$1", "${a[0]}") or spelled out rather than an @-style list (several words, or none, even inside double quotes)'
        : isStaticWord(node) && hasExpansion(node)
          ? 'that is a "$*"-style join, an array length, or a bare arithmetic or special parameter, none of which is accepted (pass one element such as "$1", a plain quoted variable such as "$x", or spell the value out)'
          : clusterHint
            ? `that should be quoted whole, with ${program} written as its own word (${clusterHint.slice(0, -1)} ${program} "$x"): as written, it can become no word or several words`
            : `that should be one double-quoted or spelled-out word ('*.ts' for a pattern, "$x" or "$(\u2026)" for an expansion): as written, it can become no word or several words`;
  return `(${describe}) ${advice}`;
}
//@ chunk-h2y5xkdx.js:18722-18846 layout
function describeComputedValue(program, label, value, cluster) {
  return `a computed ${label} value${cluster ? ` in the cluster ${cluster}` : ""} ${describeWordRefusal(label, value, cluster)} where ${program} reads exactly one,`;
}
//@ chunk-h2y5xkdx.js:18846-19150 placement
function recordVariableKind(state, name, kind, isOptionSafe = false, nodeText = "") {
  let previousKind = state.kinds.get(name);
  let nextKind = previousKind === undefined || previousKind === kind ? kind : "inert";
  state.kinds.set(name, previousKind === "other" || kind === "other" ? "other" : nextKind);
  state.bindingSites.set(name, (state.bindingSites.get(name) ?? 0) + 1);
  state.optionSafeNames.set(
    name,
    (state.optionSafeNames.get(name) ?? true) &&
      (isOptionSafe ||
        (kind === "int" &&
          !readFlagWithOverride(TENGU_WOOLLY_WALL, {
            safe: true,
          }))),
  );
  recordStartupHazard(state, name, kind === "other" || RISKY_NODE_OPTIONS_RE.test(nodeText));
}
//@ chunk-h2y5xkdx.js:19150-19252 placement
function recordStartupHazard(state, name, isHazard) {
  if (!BENIGN_INTERPRETER_ENV_RE.test(name))
    state.startupHazards.set(
      name,
      state.startupHazards.get(name) === true || isHazard || STARTUP_HOOK_ENV_RE.test(name),
    );
}
//@ chunk-h2y5xkdx.js:19252-19378 placement
function isLiteralNonOption(node, state) {
  let evaluated = isStaticNode(node) ? evaluateWord(node, state, true) : null;
  return evaluated?.kind === "literal"
    ? /^[^-]/.test(evaluated.text)
    : evaluated?.kind === "dynamic" && evaluated.optionSafe;
}
//@ chunk-h2y5xkdx.js:19378-20023 placement
function expansionKind(node, state) {
  if (!node) return "inert";
  if (
    node.type === "arithmetic_expansion" ||
    (node.type === "simple_expansion" && /^\$[?#$!]$/.test(node.text)) ||
    (node.type === "command_substitution" && isSafeValueCommand(node.children, state))
  )
    return "int";
  let evaluated = isStaticNode(node) ? evaluateWord(node, state, false) : null;
  if (
    evaluated?.kind === "literal" &&
    (evaluated.text.match(/[A-Za-z_]\w*/g) ?? []).some(isStartupHazardVariable)
  ) {
    if (!state.opaqueNames) state.shellFilledWord = evaluated.text;
    state.opaqueNames = true;
  } else if (evaluated?.kind === "literal" && state.shellSetNameWord === null) {
    let found = evaluated.text.match(/[A-Za-z_]\w*/g)?.find(isShellManagedVariable);
    if (found !== undefined && isEagerShellSetScreeningEnabled())
      state.shellSetNameWord = {
        text: evaluated.text,
        token: found,
      };
  }
  return evaluated?.kind !== "literal"
    ? "other"
    : /^\d+$/.test(evaluated.text)
      ? "int"
      : isPlainWordText(evaluated.text) &&
          !evaluated.text.split(/\s+/).some((word) => isStdinLikeDevicePath(resolveAgainstCwd(word, state)))
        ? "inert"
        : "other";
}
//@ chunk-h2y5xkdx.js:20023-24281 placement
/**
 * 处理变量赋值/声明节点：记录变量种类（整数、数组、导出、只读），检测影响 git 或 shell 行为的危险变量。
 */
function analyzeAssignment(node, state, isIntegerContext) {
  switch (node.type) {
    case "variable_assignment": {
      let [nameOrSubscript, equalsNode, valueNode] = node.children;
      let nameNode = nameOrSubscript?.type === "subscript" ? nameOrSubscript.children[0] : nameOrSubscript;
      if (nameNode?.type === "variable_name") {
        if (valueNode?.type === "array" || nameOrSubscript?.type === "subscript")
          state.arrayNames.add(nameNode.text);
        let isPlainAssignment = equalsNode?.type === "=" && valueNode?.type !== "array";
        recordVariableKind(
          state,
          nameNode.text,
          isIntegerContext ? "int" : isPlainAssignment ? expansionKind(valueNode, state) : "other",
          isPlainAssignment &&
            !isIntegerContext &&
            !(
              (INTEGER_ATTR_DEFAULT_VARS.has(nameNode.text) || state.integerNames.has(nameNode.text)) &&
              readFlagWithOverride(TENGU_WOOLLY_WALL, {
                safe: true,
              })
            ) &&
            !!valueNode &&
            isLiteralNonOption(valueNode, state),
          valueNode && isStaticNode(valueNode) ? valueNode.text.replace(/["'\\]/g, "") : "",
        );
      }
      break;
    }
    case "declaration_command": {
      let joined = node.children
        .filter((child) => child.type === "word" && child.text.startsWith("-"))
        .map((child) => child.text)
        .join("");
      for (let child of node.children) {
        let nameNode = child.type === "variable_name" ? child : child.children[0];
        if (nameNode?.type !== "variable_name") continue;
        if (/[aA]/.test(joined)) state.arrayNames.add(nameNode.text);
        if (joined.includes("i")) state.integerNames.add(nameNode.text);
        else if (child.type === "variable_name" && SHELL_SPECIAL_VARIABLES.test(nameNode.text))
          recordVariableKind(state, nameNode.text, "other");
      }
      for (let child of node.children) analyzeAssignment(child, state, joined.includes("i"));
      return;
    }
    case "for_statement": {
      let found = node.children.find((child) => child.type === "variable_name");
      let filtered = node.children.filter((child) => WORD_NODE_TYPES.has(child.type));
      let mapped = filtered.map((word) => expansionKind(word, state));
      if (found) {
        let any = node.children.some((child) => child.type === "in");
        recordVariableKind(
          state,
          found.text,
          !any || mapped.includes("other")
            ? "other"
            : mapped.every((kind) => kind === "int")
              ? "int"
              : "inert",
          any && filtered.every((word) => isLiteralNonOption(word, state)),
        );
        if (
          any &&
          !isSpecialVariableTypingRisk(found.text) &&
          filtered.every(
            (word) => isStaticNode(word) && !isOpaquePathArgument(word.text.replace(/["'\\]/g, ""), state),
          )
        )
          state.pathNames.add(found.text);
      }
      break;
    }
    case "c_style_for_statement":
    case "arithmetic_expansion":
    case "compound_statement":
      if (node.type !== "compound_statement" || node.children[0]?.type === "((") {
        for (let child of node.children) {
          let nestedInLoopBody =
            node.type === "c_style_for_statement" &&
            /^(?:do_group|compound_statement)$/.test(child.type) &&
            isEagerShellSetScreeningEnabled();
          analyzeAssignment(child, state, !nestedInLoopBody);
        }
        return;
      }
      break;
    case "command_substitution":
    case "process_substitution":
      if (isIntegerContext && isEagerShellSetScreeningEnabled()) {
        for (let child of node.children) analyzeAssignment(child, state, false);
        return;
      }
      break;
    case "binary_expression":
    case "unary_expression":
    case "postfix_expression": {
      let found = node.children.find((child) => child.type === "variable_name" || child.type === "word");
      let any = node.children.some((child) => /^(?:[-+*/%&|^]?=|<<=|>>=|\+\+|--)$/.test(child.type));
      if (isIntegerContext && any && found && SHELL_NAME_PATTERN.test(found.text))
        recordVariableKind(state, found.text, "int");
      break;
    }
    case "expansion": {
      let [targetNode, operatorNode, valueNode] = node.children.slice(1);
      let nameNode = targetNode?.type === "subscript" ? targetNode.children[0] : targetNode;
      if (nameNode?.type === "variable_name" && /^:?=$/.test(operatorNode?.type ?? "")) {
        let kind = expansionKind(valueNode, state);
        if (targetNode.type === "subscript") state.arrayNames.add(nameNode.text);
        if (SHELL_SPECIAL_VARIABLES.test(nameNode.text)) recordVariableKind(state, nameNode.text, "other");
        else if (state.kinds.has(nameNode.text) || kind !== "int")
          recordVariableKind(state, nameNode.text, state.kinds.has(nameNode.text) ? kind : "other");
      }
      break;
    }
    case "unset_command":
    case "command": {
      let filtered = node.children.filter(
        (child) =>
          /^(?:command_name|variable_name|unset)$/.test(child.type) || WORD_NODE_TYPES.has(child.type),
      );
      let mapped = filtered.map((wordNode) =>
        WORD_NODE_TYPES.has(wordNode.type) && isStaticNode(wordNode)
          ? evaluateWord(wordNode, state, true)
          : null,
      );
      let mapped_2 = filtered.map((wordNode, idx) => {
        let evaluated = mapped[idx];
        return evaluated?.kind === "literal" ? evaluated.text : wordNode.text.replace(/["'\\]/g, "");
      });
      let any = filtered.some(
        (wordNode, idx) => WORD_NODE_TYPES.has(wordNode.type) && mapped[idx]?.kind !== "literal",
      );
      let commandName = basename(mapped_2[0] ?? "");
      let mapped_3 = mapped_2
        .slice(
          0,
          TRANSPARENT_LAUNCHERS.has(commandName) ||
            EXEC_LIKE_COMMANDS.has(commandName) ||
            UNHANDLED_EXEC_WRAPPERS.has(commandName)
            ? mapped_2.length
            : 1,
        )
        .map((word) => basename(word));
      let index = mapped_3.findIndex((word) => /^(?:cd|chdir|pushd|popd)$/.test(word));
      if (index !== -1) {
        let all = mapped_3
          .slice(0, index)
          .every((word) => COMMAND_PREFIX_WORDS.has(word) || /^-[p-]*$/.test(word));
        let targetWord =
          mapped_2.slice(index + 1).find((word) => !/^-[LPe@]+$|^--$/.test(word)) ??
          (mapped_3[index] === "cd" ? "~" : "-");
        let resolvedCwd =
          !all || /^(?:~[-+0-9]|[-+])/.test(targetWord) || any
            ? ".."
            : /^[\/~]/.test(targetWord) || !state.cwd.startsWith("/")
              ? posix.normalize(targetWord)
              : posix.normalize(`${state.cwd}/${targetWord}`);
        state.opaqueCwd ||= /^\.\.(?:\/|$)/.test(resolvedCwd) || isDevicePath(resolvedCwd);
        state.cwd = /^[\/~]/.test(resolvedCwd) ? resolvedCwd : state.cwd;
      }
      state.deviceLinked ||=
        (mapped_3.some((word) => /^(?:ln|link|cp|mv|mkfifo|mknod)$/.test(word)) &&
          mapped_2.some((word) => isDevicePath(resolveAgainstCwd(word, state)))) ||
        (mapped_3.some((word) => /^(?:ln|link|cp|mv)$/.test(word)) &&
          (any || mapped_2.some((word) => /^(?:\/|\.\.)(?:\/|$)/.test(posix.normalize(word)))));
      state.inputAssembled ||= state.deviceLinked;
      state.allExported ||=
        mapped_3.some((word) => /^(?:set|shopt|setopt)$/.test(word)) &&
        mapped_2.some((word) => /^-[A-Za-z]*a|^allexport$/i.test(word.replace(/_/g, "")));
      for (let child of node.children) {
        let assignmentMatch =
          WORD_NODE_TYPES.has(child.type) && TRANSPARENT_LAUNCHERS.has(mapped_3[0] ?? "")
            ? /^([A-Za-z_]\w*)=(.*)$/s.exec(child.text.replace(/["'\\]/g, ""))
            : null;
        if (assignmentMatch)
          recordStartupHazard(
            state,
            assignmentMatch[1],
            !isStaticNode(child) ||
              !isPlainWordText(assignmentMatch[2]) ||
              RISKY_NODE_OPTIONS_RE.test(assignmentMatch[2]),
          );
      }
      let any_2 = mapped_2.some((word) => /^(?:read|getopts|mapfile|readarray|printf)$/.test(basename(word)));
      if (any_2 || mapped_2.some((word) => basename(word) === "unset")) {
        let any = mapped_2.some((word) => /^(?:mapfile|readarray|-[a-zA-Z]*[aA]\w*)$/.test(word));
        for (let word of mapped_2) {
          let nameWord = /^-[a-zA-Z]*[aA](\w+)$/.exec(word)?.[1] ?? word;
          if (SHELL_NAME_PATTERN.test(nameWord)) {
            if (any_2) recordVariableKind(state, nameWord, "other");
            else {
              state.bindingSites.set(nameWord, (state.bindingSites.get(nameWord) ?? 0) + 1);
              state.optionSafeNames.set(nameWord, false);
            }
            if (any) state.arrayNames.add(nameWord);
          }
        }
        if (any_2) recordVariableKind(state, "REPLY", "other");
      } else if (!KNOWN_PROGRAMS.has(mapped_3[0] ?? ""))
        for (let word of mapped_2.slice(1).filter((word) => SHELL_NAME_PATTERN.test(word)))
          state.bindingSites.set(word, (state.bindingSites.get(word) ?? 0) + 1);
      break;
    }
    default:
      break;
  }
  for (let child of node.children) analyzeAssignment(child, state, isIntegerContext);
}
//@ chunk-h2y5xkdx.js:24281-24363 placement
function isStaticNode(node) {
  return !/expansion|substitution/.test(node.type) && node.children.every(isStaticNode);
}
//@ chunk-h2y5xkdx.js:24363-24416 placement (2.1.88 match: toScopedConfig, 0.806)
function dynamicValue(why, flags = DYNAMIC_VALUE_FLAGS) {
  return {
    kind: "dynamic",
    why,
    ...flags,
  };
}
//@ chunk-h2y5xkdx.js:24416-24973 placement
function mergeWordParts(parts) {
  let found = parts.find((part) => part.kind === "refuse");
  let filtered = parts.filter((part) => part.kind === "dynamic");
  if (found || filtered.length === 0)
    return (
      found ?? {
        kind: "literal",
        text: parts.map((part) => (part.kind === "literal" ? part.text : "")).join(""),
      }
    );
  let inert =
    filtered.every((part) => part.kind === "dynamic" && part.integer) &&
    isPlainWordText(parts.map((part) => (part.kind === "literal" ? part.text : "")).join(""));
  let found_2 = parts.find((firstPart) => firstPart.kind !== "literal" || firstPart.text !== "");
  return parts.length === 1
    ? filtered[0]
    : dynamicValue(filtered[0].why, {
        ...DYNAMIC_VALUE_FLAGS,
        inert,
        optionSafe: readFlagWithOverride(TENGU_WOOLLY_WALL, {
          safe: true,
        })
          ? isOptionSafeParts(parts)
          : found_2?.kind === "literal"
            ? !found_2.text.startsWith("-")
            : found_2?.kind === "dynamic" && found_2.optionSafe,
        written: filtered.some((part) => part.kind === "dynamic" && part.written),
      });
}
//@ chunk-h2y5xkdx.js:24973-25142 placement
function isOptionSafeParts(parts) {
  for (let part of parts)
    if (part.kind === "literal") {
      if (part.text !== "") return !part.text.startsWith("-");
    } else if (part.kind !== "dynamic" || !part.optionSafe || part.integer) return false;
  return true;
}
//@ chunk-h2y5xkdx.js:25142-25212 placement
function unescapeDoubleQuoted(text) {
  return text.replace(/\\([$`"\\\n])/g, (match, escaped) =>
    escaped ===
    `
`
      ? ""
      : escaped,
  );
}
//@ chunk-h2y5xkdx.js:25212-25254 placement
var GIT_PROGRAM_NAMES; // deferred: uses POSIX_SHELL_NAMES (../../../utils/bash/ast.js) of its import cycle while loading; runs once the cycle is complete
deferInit("chunk-h2y5xkdx.js:25212", () => {
  GIT_PROGRAM_NAMES = ["git", "git.exe", "git.real", ...SHELL_PROGRAM_NAMES];
});
//@ chunk-h2y5xkdx.js:25254-25670 placement (2.1.88 match: urlPatternToRegex, 0.838)
function urlPatternToRegex(pattern) {
  let replaced = pattern
    .slice(pattern.lastIndexOf("/") + 1)
    .replace(/\[(?:\[[:=.]\w*[:=.]\]|[^\]])*\]/g, (bracket) =>
      /\[[:=.]/.test(bracket.slice(1)) ? "?" : bracket,
    );
  let regexSource = "";
  for (let k = 0; k < replaced.length; k++) {
    let char = replaced[k];
    let closeIndex = char === "[" ? replaced.indexOf("]", k + 2) : -1;
    if (closeIndex !== -1) {
      regexSource += replaced.slice(k, closeIndex + 1).replace(/^\[!/, "[^");
      k = closeIndex;
    } else
      regexSource += char === "*" ? ".*" : char === "?" ? "." : char.replace(/[\\^$.|+(){}[\]]/g, "\\$&");
  }
  try {
    let regExp = new RegExp(`^${regexSource}$`, "i");
    return GIT_PROGRAM_NAMES.some((programName) => regExp.test(programName));
  } catch {
    return true;
  }
}
//@ chunk-h2y5xkdx.js:25670-25716 placement
var BOT_PROTECTED_TENGU_RIPPLING_JOURNAL = "bot_protected_tengu_rippling_journal";
//@ chunk-h2y5xkdx.js:25716-25879 placement
function isRiskyGlob(pattern, fullPattern = pattern) {
  if (countCharInString(pattern, "*") > 16) return true;
  if (
    !readFlagWithOverride(BOT_PROTECTED_TENGU_RIPPLING_JOURNAL, {
      safe: true,
    })
  )
    return urlPatternToRegex(pattern);
  let pattern_2 = fullPattern.slice(fullPattern.lastIndexOf("/") + 1);
  return (
    fullPattern.length > 4096 ||
    urlPatternToRegex(pattern) ||
    globToRegex(pattern_2) ||
    (pattern_2 !== fullPattern && globToRegex(fullPattern))
  );
}
//@ chunk-h2y5xkdx.js:25879-26746 placement
function globToRegex(pattern) {
  let index = pattern.lastIndexOf("]");
  let regexSource = "";
  for (let k = 0; k < pattern.length; k++) {
    let char = pattern[k];
    if (char === "\\") {
      let nextChar = pattern[k + 1];
      if (nextChar === undefined) return true;
      regexSource = nextChar === "/" ? "" : regexSource + urlPatternToRegex_2(nextChar);
      k++;
      continue;
    }
    if (char === "[") {
      let isNegated = pattern[k + 1] === "!" || pattern[k + 1] === "^";
      let classStart = k + (isNegated ? 2 : 1);
      let classChars = "";
      let isAnyChar = isNegated;
      let pos = index > classStart ? classStart : pattern.length;
      for (; pos < pattern.length && (pattern[pos] !== "]" || pos === classStart); pos++) {
        let classChar = pattern[pos];
        let isPosixClass = classChar === "[" && /^[:.=]$/.test(pattern[pos + 1] ?? "");
        if (isPosixClass && pos === classStart && pattern[pos + 1] !== ":") {
          if (pattern.indexOf(pattern[pos + 1] + "]", pos + 2) !== -1) return true;
          isPosixClass = false;
        }
        let posixClass = isPosixClass ? /^\[:[a-z]+:\]/.exec(pattern.slice(pos, pos + 12)) : null;
        if (posixClass) {
          isAnyChar = true;
          pos += posixClass[0].length - 1;
        } else if (isPosixClass || classChar === "\\" || (classChar === "-" && pattern[pos + 1] === "["))
          return true;
        else if (classChar === "-" && pos !== classStart && pattern[pos + 1] !== "]") {
          if (!(/[0-9]/.test(pattern[pos - 1]) && /[0-9]/.test(pattern[pos + 1]))) isAnyChar = true;
        } else classChars += classChar;
      }
      if (pos < pattern.length) {
        regexSource += isAnyChar ? "." : `[${urlPatternToRegex_2(classChars)}]`;
        k = pos;
        continue;
      }
      if (isNegated && pattern[classStart] === "]") {
        regexSource += ".";
        k = classStart;
        continue;
      }
    }
    regexSource =
      char === "/"
        ? ""
        : regexSource + (char === "*" ? ".*" : char === "?" ? "." : urlPatternToRegex_2(char));
  }
  try {
    let regExp = new RegExp(`^${regexSource}$`, "i");
    return GIT_PROGRAM_NAMES.some((programName) => regExp.test(programName));
  } catch {
    return true;
  }
}
//@ chunk-h2y5xkdx.js:26746-26848 placement
var ANSI_C_ESCAPES; // deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
deferInit("chunk-h2y5xkdx.js:26746", () => {
  ANSI_C_ESCAPES = new Map(
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
});
//@ chunk-h2y5xkdx.js:26848-26926 placement
function hasChildWordMatching(node, pattern) {
  return node.children.some((child) => child.type === "word" && pattern.test(child.text));
}
//@ chunk-h2y5xkdx.js:26926-27005 placement
/**
 * 测试表达式里会被当成运算符的开头（[ 或 :字母）；值落在这里会改变语义。
 */
var TEST_EXPRESSION_OPERAND_RE = /^(?:\[|:[A-Za-z&])/;
var GLOB_WITH_ESCAPE_RE = /(?:^|[^\\])(?:\\\\)*[*?]/;
var GLOB_SIMPLE_RE = /(?:^|[^\\])[*?]/;
//@ chunk-h2y5xkdx.js:27005-27070 placement
function isBraceExpansionNode(node) {
  return (
    hasChildWordMatching(node, /^\{$/) &&
    hasChildWordMatching(node, /^\}$/) &&
    hasChildWordMatching(node, /,|\.\./)
  );
}
//@ chunk-h2y5xkdx.js:27070-27118 placement
function isBracketGlobNode(node) {
  return hasChildWordMatching(node, /^\[$/) && hasChildWordMatching(node, /\]$/);
}
//@ chunk-h2y5xkdx.js:27118-27250 placement
/**
 * 判断展开节点的值是否用于有风险的表达式位置（如 zsh 特殊下标或测试表达式）。
 */
function isRiskyExpansionOperand(node, testExpression) {
  return (
    /expansion$/.test(node.type) &&
    (/^\$\W$/.test(node.text) ? ZSH_SPECIAL_SUBSCRIPT_TESTEXPR_RE : TEST_EXPRESSION_OPERAND_RE).test(
      /^\$\d$/.test(node.text) ? testExpression.replace(/^\d+/, "") : testExpression,
    )
  );
}
//@ chunk-h2y5xkdx.js:27250-27281 placement
/**
 * 判断 $ 后面接的内容是否构成算术或测试表达式（[[、=~、^、+ 等）。
 */
var DOLLAR_QUOTE_EDGE_RE = /^(?:[[=~^+]|#\w*[[:])/;
//@ chunk-h2y5xkdx.js:27281-27390 placement
/**
 * 判断节点相邻处是否构成 $'...' 引号边界的特殊情况。
 */
function isDollarQuoteEdge(left, right) {
  return (
    right.type === "raw_string" &&
    (left.text === "$$" || (left.text.endsWith("$") && right.text.endsWith("\\'")))
  );
}
//@ chunk-h2y5xkdx.js:27390-27419 placement
var TENGU_JAUNTY_FOREST = "tengu_jaunty_forest";
//@ chunk-h2y5xkdx.js:27419-27457 placement
/**
 * 读取 tengu_jaunty_forest 开关：字符串内容是否按字节精确校验（开启时更保守）。
 */
function isParameterExpansionStrictnessOn() {
  return readFlagWithOverride(TENGU_JAUNTY_FOREST, {
    safe: true,
  });
}
//@ chunk-h2y5xkdx.js:27457-27488 placement
var TENGU_QUILTED_LANTERN = "tengu_quilted_lantern";
//@ chunk-h2y5xkdx.js:27488-27696 placement
function hasProcessSubstitution(text) {
  let backslashRun = 0;
  for (let i = 0; i < text.length; i++) {
    if ((text[i] === "<" || text[i] === ">") && text[i + 1] === "(" && backslashRun % 2 === 0) return true;
    backslashRun = text[i] === "\\" ? backslashRun + 1 : 0;
  }
  let firstSeparator = text.search(/[|&\s]/);
  return text.startsWith("=(") || (firstSeparator >= 0 && text.includes("=(", firstSeparator));
}
//@ chunk-h2y5xkdx.js:27696-32307 placement
/**
 * 把一个 shell 单词节点静态求值：literal（可确定文本）、dynamic（运行期值，附原因与属性）或 refuse（无法判断，拒绝）。
 */
function evaluateWord(node, state, allowGlob) {
  switch (node.type) {
    case "word":
    case "number":
      if (WORD_LEAF_EXPANSION_RE.test(node.text) || WORD_LEAF_QUOTE_RE.test(node.text))
        return {
          kind: "refuse",
          detail: tooComplexReason(`the word ${shortenForReason(node.text)}`),
        };
      if (allowGlob && GLOB_SIMPLE_RE.test(node.text))
        return dynamicValue("a glob pattern", {
          ...DYNAMIC_VALUE_FLAGS,
          inert: !isRiskyGlob(node.text),
          optionSafe: /^[A-Za-z0-9_.\/~@+]/.test(node.text),
        });
      if (allowGlob && isStrictDynamicValuesEnabled() && GLOB_WITH_ESCAPE_RE.test(node.text))
        return {
          kind: "refuse",
          detail: tooComplexReason(
            `the word ${shortenForReason(node.text)}, whose * or ? the shell expands as a file pattern (an even run of backslashes does not escape it),`,
          ),
        };
      return node.text.endsWith("\\")
        ? dynamicValue("a trailing backslash")
        : {
            kind: "literal",
            text: node.text.replace(/\\(.)/g, "$1"),
          };
    case "raw_string":
      return {
        kind: "literal",
        text: node.text.slice(1, -1),
      };
    case "string": {
      let parts = [];
      let covered = "";
      let isStrict = isParameterExpansionStrictnessOn();
      let textBytes = isStrict ? Buffer.from(node.text, "utf8") : null;
      let startIndex = node.startIndex;
      for (let [idx, child] of node.children.entries()) {
        let gapText = textBytes
          ? textBytes
              .subarray(startIndex - node.startIndex, child.startIndex - node.startIndex)
              .toString("utf8")
          : "";
        startIndex = child.endIndex;
        if (/^[ \t\n]+$/.test(gapText)) {
          covered += gapText;
          parts.push({
            kind: "literal",
            text: gapText,
          });
        }
        let nextChild = node.children[idx + 1];
        let nextText =
          nextChild?.type === "string_content"
            ? nextChild.text
            : nextChild?.type === "$" && nextChild.startIndex === child.endIndex
              ? nextChild.text + (node.children[idx + 2]?.text ?? "")
              : "";
        if (child.type === '"') continue;
        covered += child.text;
        if (child.type === "string_content")
          parts.push({
            kind: "literal",
            text: unescapeDoubleQuoted(child.text),
          });
        else if (child.type === "$") {
          if (DOLLAR_QUOTE_EDGE_RE.test(nextText))
            return {
              kind: "refuse",
              detail: arithmeticEvalReason(`$${nextText}`),
            };
          parts.push({
            kind: "literal",
            text: "$",
          });
        } else if (isRiskyExpansionOperand(child, nextText))
          return {
            kind: "refuse",
            detail: arithmeticEvalReason(child.text + nextText),
          };
        else parts.push(evaluateWord(child, state, false));
      }
      if (
        isStrict
          ? covered !== node.text.slice(1, -1)
          : covered.replace(/\s+/g, "") !== node.text.slice(1, -1).replace(/\s+/g, "")
      )
        return {
          kind: "refuse",
          detail: tooComplexReason("string content the parser did not tokenize"),
        };
      return mergeWordParts(parts);
    }
    case "concatenation": {
      let parts = [];
      let rawSoFar = "";
      for (let [idx, child] of node.children.entries()) {
        let nextChild = node.children[idx + 1];
        if (child.type === "$") {
          if (nextChild && DOLLAR_QUOTE_EDGE_RE.test(nextChild.text))
            return {
              kind: "refuse",
              detail: arithmeticEvalReason(`$${nextChild.text}`),
            };
          parts.push(
            nextChild?.type === "string"
              ? dynamicValue("a locale-translated string")
              : {
                  kind: "literal",
                  text: "$",
                },
          );
          rawSoFar += "$";
        } else if (
          nextChild &&
          isRiskyExpansionOperand(child, nextChild.text + (node.children[idx + 2]?.text ?? ""))
        )
          return {
            kind: "refuse",
            detail: arithmeticEvalReason(child.text + nextChild.text),
          };
        else if (nextChild && isDollarQuoteEdge(child, nextChild))
          return {
            kind: "refuse",
            detail: tooComplexReason(`the word ${shortenForReason(node.text)}`),
          };
        else {
          let evaluated = evaluateWord(child, state, allowGlob);
          parts.push(evaluated);
          if (child.type === "word" || child.type === "number") rawSoFar += child.text;
          else if (evaluated.kind === "literal") rawSoFar += evaluated.text.replace(/./gsu, "\\$&");
        }
      }
      let merged = mergeWordParts(parts);
      if (merged.kind === "refuse" || !allowGlob) return merged;
      if (isBraceExpansionNode(node)) return dynamicValue("a brace expansion");
      if (isBracketGlobNode(node))
        return dynamicValue("a glob pattern", {
          ...DYNAMIC_VALUE_FLAGS,
          inert: merged.kind === "literal" && !isRiskyGlob(merged.text, rawSoFar),
          optionSafe: merged.kind === "literal" && /^[A-Za-z0-9_.\/~@+]/.test(merged.text),
        });
      return merged.kind === "literal" && /^=[A-Za-z_]|~\[/.test(merged.text)
        ? dynamicValue("a zsh expansion")
        : merged;
    }
    case "ansi_c_string": {
      let match = /^\$'((?:[^\\']|\\[abeEfnrtv\\'"?])*)'$/.exec(node.text);
      return match
        ? {
            kind: "literal",
            text: match[1].replace(
              /\\(.)/g,
              (match, escapeChar) => ANSI_C_ESCAPES.get(escapeChar) ?? escapeChar,
            ),
          }
        : dynamicValue("an ansi c string");
    }
    case "translated_string":
      return dynamicValue("a translated string");
    case "simple_expansion": {
      let nameNode = node.children[1];
      if (node.children.length !== 2 || !nameNode)
        return dynamicValue("an expansion the parser did not resolve");
      if (nameNode.type === "special_variable_name")
        return /^[?#$!]$/.test(nameNode.text)
          ? dynamicValue("a count", STATIC_VALUE_FLAGS)
          : dynamicValue(`the parameter $${nameNode.text}`);
      return evaluateVariableReference(state, nameNode.text);
    }
    case "expansion":
      return evaluateParameterExpansion(node, state);
    case "command_substitution": {
      if (node.children.some((child) => /^backtick_(?:escape_unsupported|body_overrun)$/.test(child.type)))
        return {
          kind: "refuse",
          detail: tooComplexReason("a backtick substitution it cannot tokenize"),
        };
      let reason = withStdinState(node, state, state.stdinFed);
      return reason === null
        ? dynamicValue(
            "command output",
            isSafeValueCommand(node.children, state) ? STATIC_VALUE_FLAGS : DYNAMIC_VALUE_FLAGS,
          )
        : {
            kind: "refuse",
            detail: reason,
          };
    }
    case "process_substitution": {
      let reason = withStdinState(node, state, state.stdinFed || node.children[0]?.type !== "<(");
      return reason === null
        ? dynamicValue("a process substitution")
        : {
            kind: "refuse",
            detail: reason,
          };
    }
    case "arithmetic_expansion": {
      let reason = checkArithmeticNode(node, state);
      return reason === null
        ? dynamicValue("a number", STATIC_VALUE_FLAGS)
        : {
            kind: "refuse",
            detail: reason,
          };
    }
    case "brace_expression":
    case "extglob_pattern":
    case "regex": {
      let reason =
        node.children.length > 0
          ? null
          : hasCommandSubstitutionText(node.text)
            ? `an expansion inside the pattern ${shortenForReason(node.text)} (a bare $NAME, \${NAME} or $1 passes; quote it, as "$NAME", when a [ or : follows; spell a literal $ as an unquoted \\$; put anything else, such as a nested \${\u2026}, a backquote or a $'\u2026' string, in a variable first)`
            : hasProcessSubstitution(node.text)
              ? `a <(, >( or zsh =( that may start a process substitution inside the pattern ${shortenForReason(node.text)} (if you mean it as text, put that text in a variable and write the variable here in double quotes, as "$NAME"; for a [[ =~ ]] regular expression, write the variable unquoted, as $NAME, or write =( as [=](; either keeps it a regular expression)`
              : /\|\||&&/.test(node.text) || containsStandaloneCondCloser(node.text)
                ? `the pattern ${shortenForReason(node.text)}`
                : null;
      if (
        reason !== null &&
        readFlagWithOverride(TENGU_QUILTED_LANTERN, {
          safe: true,
        })
      )
        return {
          kind: "refuse",
          detail: tooComplexReason(reason),
        };
      for (let child of node.children) {
        let evaluated = WORD_NODE_TYPES.has(child.type) ? evaluateWord(child, state, false) : null;
        if (evaluated?.kind === "refuse") return evaluated;
      }
      return dynamicValue(`a ${node.type.replaceAll("_", " ")}`);
    }
    case "ERROR":
      return {
        kind: "refuse",
        detail: tooComplexReason("syntax the parser could not recover"),
      };
    default:
      return {
        kind: "refuse",
        detail: tooComplexReason(`a ${node.type} word`),
      };
  }
}
//@ chunk-h2y5xkdx.js:32307-32648 placement
function hasCommandSubstitutionText(text) {
  for (let match of text.matchAll(/\\[\s\S]|[$`]/g)) {
    if (match[0].length === 2) continue;
    if (match[0] === "`") return true;
    let sliced = text.slice(match.index + 1);
    let match_2 = /^(?:\{[A-Za-z_]\w*\}|#?(?:[A-Za-z_\u0080-\uffff][\w\u0080-\uffff]*|\d+|[@*?$!-])|#)/.exec(
      sliced,
    );
    if (
      !(match_2
        ? !(match_2[0].startsWith("{") ? /^\[/ : TEST_EXPRESSION_OPERAND_RE).test(
            sliced.slice(match_2[0].length),
          )
        : !/^[{(\[=~^+'"]/.test(sliced))
    )
      return true;
  }
  return false;
}
//@ chunk-h2y5xkdx.js:32648-33074 placement
function evaluateVariableReference(state, name) {
  if (/^\d+$/.test(name)) return dynamicValue("a positional parameter");
  let kind = state.kinds.get(name);
  let isUnlistedSpecial =
    (SHELL_SPECIAL_VARIABLES.test(name) ||
      BASH_IMPLICITLY_REBOUND_VARS.has(name) ||
      PATH_LIKE_VARIABLES_RE.test(name)) &&
    readFlagWithOverride(TENGU_WOOLLY_WALL, {
      safe: true,
    });
  let isTypingRisk = isSpecialVariableTypingRisk(name);
  let why =
    isTypingRisk && (kind === "int" || kind === "inert")
      ? `the variable ${name}, which bash or zsh sets by itself`
      : `the variable ${name}`;
  let isTrustedKind = !isUnlistedSpecial && !isTypingRisk;
  return dynamicValue(why, {
    integer: kind === "int" && isTrustedKind,
    inert: (kind === "int" || kind === "inert") && isTrustedKind,
    arithmeticSafe: isSafeArithmeticName(name, state),
    optionSafe: state.optionSafeNames.get(name) === true && isTrustedKind,
    written: kind === "other",
  });
}
//@ chunk-h2y5xkdx.js:33074-33105 placement
var TENGU_FOAMY_WATERFALL = "tengu_foamy_waterfall";
//@ chunk-h2y5xkdx.js:33105-33143 placement
/**
 * 读取 tengu_foamy_waterfall 开关。
 */
function isShellSpecialVariableTypingEnabled() {
  return readFlagWithOverride(TENGU_FOAMY_WATERFALL, {
    safe: true,
  });
}
//@ chunk-h2y5xkdx.js:33143-33195 placement
/**
 * 名字是 bash/zsh 特殊变量且开关开启时返回 true（这类变量被设为整数后可被当成算术求值）。
 */
function isSpecialVariableTypingRisk(name) {
  return (
    (SHELL_SPECIAL_VARIABLES.test(name) || ZSH_SPECIAL_VARIABLES.test(name)) &&
    isShellSpecialVariableTypingEnabled()
  );
}
//@ chunk-h2y5xkdx.js:33195-33349 placement
function isSafeArithmeticName(name, state) {
  let kind = state.kinds.get(name);
  return (
    !isStartupHazardVariable(name) &&
    !isSpecialVariableTypingRisk(name) &&
    (kind === "int" ||
      (kind === undefined &&
        !state.opaqueNames &&
        !SHELL_SPECIAL_VARIABLES.test(name) &&
        (state.shellSetNameWord === null || SHELL_AUTO_VARIABLES.test(name))))
  );
}
//@ chunk-h2y5xkdx.js:33349-33434 placement
/**
 * 匹配 ${!prefix@}、${!prefix[*]} 这类间接名字列表展开。
 */
var TENGU_SHIMMYING_MOCHI = "tengu_shimmying_mochi";
var INDIRECT_NAME_LIST_RE = /^\$\{![A-Za-z_][A-Za-z0-9_]*(?:[@*]|\[[@*]\])\}$/;
//@ chunk-h2y5xkdx.js:33434-35437 placement
function evaluateParameterExpansion(node, state) {
  let [head, ...rest] = node.children.filter((child) => child.type !== "${" && child.type !== "}");
  let refuseArithmetic = {
    kind: "refuse",
    detail: arithmeticEvalReason(node.text),
  };
  let isStrictSubstitution = getFeatureValue_CACHED_MAY_BE_STALE(TENGU_SHIMMYING_MOCHI, true) !== false;
  if (isStrictSubstitution && /^\$\{[\s|]/.test(node.text))
    return {
      kind: "refuse",
      detail: tooComplexReason(`the substitution ${shortenForReason(node.text)}`),
    };
  if (isStrictSubstitution && node.text.startsWith("${!") && node.text !== "${!}")
    return INDIRECT_NAME_LIST_RE.test(node.text)
      ? dynamicValue("a name listing")
      : /^\$\{![#?]\}$/.test(node.text)
        ? dynamicValue("a positional parameter")
        : refuseArithmetic;
  if (!head) return dynamicValue("an expansion the parser did not resolve");
  let isFullyCovered =
    !isStrictSubstitution || node.children.map((child) => child.text).join("") === node.text;
  if (head.type === "#") {
    let subscriptReason = rest[0]?.type === "subscript" ? checkSubscript(rest[0], state) : null;
    return isFullyCovered && rest.length === 1 && subscriptReason === null
      ? dynamicValue("a length", STATIC_VALUE_FLAGS)
      : {
          kind: "refuse",
          detail: subscriptReason ?? arithmeticEvalReason(node.text),
        };
  }
  if (head.type === "!") {
    let isNameListing =
      (rest.length === 2 && /^[@*]$/.test(rest[1].type)) ||
      (rest.length === 1 && rest[0].type === "subscript" && /^[@*]$/.test(rest[0].children[2]?.text ?? ""));
    return isFullyCovered && isNameListing ? dynamicValue("a name listing") : refuseArithmetic;
  }
  let baseValue;
  if (head.type === "variable_name") baseValue = evaluateVariableReference(state, head.text);
  else if (head.type === "special_variable_name")
    baseValue = /^[?#$!]$/.test(head.text)
      ? dynamicValue("a count", STATIC_VALUE_FLAGS)
      : dynamicValue(`the parameter $${head.text}`);
  else if (head.type === "subscript") {
    let subscriptReason = checkSubscript(head, state);
    if (subscriptReason !== null)
      return {
        kind: "refuse",
        detail: subscriptReason,
      };
    baseValue = dynamicValue("an array element");
  } else
    return {
      kind: "refuse",
      detail: tooComplexReason(`the expansion ${shortenForReason(node.text)}`),
    };
  let operator = rest[0];
  if (!operator) return baseValue;
  let nameNode = head.type === "subscript" ? head.children[0] : head;
  let bindingReason =
    /^:?=$/.test(operator.type) && nameNode ? describeUnsafeBinding(nameNode.text, state) : null;
  if (bindingReason !== null)
    return {
      kind: "refuse",
      detail: bindingReason,
    };
  if (operator.type === "@") return refuseArithmetic;
  if (!PARAM_EXPANSION_OPERATOR_RE.test(operator.type)) {
    let found = rest.map((child) => checkArithmeticNode(child, state)).find((reason) => reason !== null);
    return found === undefined
      ? dynamicValue("a substring")
      : {
          kind: "refuse",
          detail: found,
        };
  }
  let defaultValue = {
    kind: "literal",
    text: "",
  };
  for (let word of rest
    .flatMap((child) => (child.type === "array" ? child.children : [child]))
    .filter((child) => WORD_NODE_TYPES.has(child.type))) {
    defaultValue = evaluateWord(word, state, false);
    if (defaultValue.kind === "refuse") return defaultValue;
  }
  if (/^:?[-=?]$/.test(operator.type) && rest.length <= 2 && baseValue.kind === "dynamic") {
    let defaultFlags =
      defaultValue.kind === "literal"
        ? {
            inert: PLAIN_TEXT_RE.test(defaultValue.text),
            arithmeticSafe: /^\d*$/.test(defaultValue.text),
          }
        : defaultValue.kind === "dynamic"
          ? defaultValue
          : DYNAMIC_VALUE_FLAGS;
    return dynamicValue(baseValue.why, {
      integer: false,
      inert: baseValue.inert && defaultFlags.inert,
      arithmeticSafe: baseValue.arithmeticSafe && defaultFlags.arithmeticSafe,
      optionSafe: false,
      written: baseValue.written || (defaultValue.kind === "dynamic" && defaultValue.written),
    });
  }
  return dynamicValue(`the expansion ${shortenForReason(node.text)}`);
}
//@ chunk-h2y5xkdx.js:35437-35692 placement
/**
 * 检查数组下标表达式是否安全：变量名必须是普通变量，下标为 @/* 或安全的算术。
 */
function checkSubscript(node, state) {
  let [nameNode, ...indexNodes] = node.children.filter((child) => child.type !== "[" && child.type !== "]");
  if (nameNode?.type !== "variable_name")
    return tooComplexReason(`the subscript ${shortenForReason(node.text)}`);
  if (indexNodes.length === 1 && /^[@*]$/.test(indexNodes[0].text)) return null;
  return (
    indexNodes.map((indexNode) => checkArithmeticNode(indexNode, state)).find((reason) => reason !== null) ??
    null
  );
}
//@ chunk-h2y5xkdx.js:35692-36624 placement
/**
 * 递归检查算术上下文中的节点（数字、变量名、赋值、下标、各类表达式）：可能触发数组下标求值或赋值有害变量时返回原因，否则 null。
 */
function checkArithmeticNode(node, state) {
  let name = /_expression$|^(?:variable_assignment|word)$/.test(node.type)
    ? findShellVarName(node.text)
    : undefined;
  if (name !== undefined) return environmentAssignmentReason(name, dynamicValue("a number"), "");
  switch (node.type) {
    case "number":
      return /^-?(?:0[xX][0-9a-fA-F]+|[0-9]+#[0-9a-zA-Z@_]+|[0-9]+)$/.test(node.text)
        ? null
        : arithmeticEvalReason(node.text);
    case "variable_name":
    case "word":
      return checkArithmeticText(node.text, node.text, state);
    case "variable_assignment": {
      let text = node.children[0]?.text ?? "";
      return (
        describeUnsafeBinding(text, state) ??
        describeIntegerTyping(text.trim()) ??
        (isShellSpecialVariableTypingEnabled() ? checkArithmeticText(text.trim(), text, state) : null) ??
        (node.children[2] ? checkArithmeticNode(node.children[2], state) : null)
      );
    }
    case "subscript":
      return (
        checkSubscript(node, state) ?? checkArithmeticText(node.children[0]?.text ?? "", node.text, state)
      );
    default:
      if (
        !/^(?:arithmetic_expansion|c_style_for_statement|compound_statement|(?:binary|unary|postfix|ternary|parenthesized)_expression)$/.test(
          node.type,
        )
      )
        return WORD_NODE_TYPES.has(node.type)
          ? checkArithmeticWord(node, state)
          : arithmeticEvalReason(node.text);
      for (let child of node.children) {
        let reason =
          (child.children.length === 0 && child.type === child.text && !/^[A-Za-z0-9_]/.test(child.text)) ||
          /^(?:\$\(\(|\(\(|\)\)|\$\[)$/.test(child.type)
            ? null
            : checkArithmeticNode(child, state);
        if (reason !== null) return reason;
      }
      return null;
  }
}
//@ chunk-h2y5xkdx.js:36624-36857 placement
/**
 * 检查算术上下文中的单词是否安全，危险时返回原因（算术求值或赋值风险）。
 */
function checkArithmeticWord(word, state) {
  let evaluated = evaluateWord(word, state, false);
  if (evaluated.kind === "refuse") return evaluated.detail;
  if (evaluated.kind === "literal") return checkArithmeticText(evaluated.text, word.text, state);
  if (evaluated.arithmeticSafe) return null;
  let match = SINGLE_VAR_REF_RE.exec(word.text);
  let varName = match?.[2] ?? match?.[3];
  return varName === undefined
    ? arithmeticEvalReason(word.text)
    : assignmentHazardReason(word.text, varName, state);
}
//@ chunk-h2y5xkdx.js:36857-37019 placement
function checkArithmeticText(text, text_2, state) {
  if (!SAFE_QUOTED_TEXT_RE.test(text) || findShellVarName(text) !== undefined)
    return arithmeticEvalReason(text_2);
  let name = (text.match(/[A-Za-z_][A-Za-z0-9_]*/g) ?? []).find((name) => !isSafeArithmeticName(name, state));
  return name === undefined ? null : assignmentHazardReason(text_2, name, state);
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
  describeComputedValue,
  describeWordRefusal,
  OPTION_POSITION_NOTE_LONG,
  isParameterExpansionStrictnessOn,
  hasChildWordMatching,
  SED_PATTERN_NOTE,
};
