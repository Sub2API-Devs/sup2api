/**
 * tools/BashTool/bgWorktreeGuard/statementWalk.ts
 *
 * 2.1.316 新增：后台 worktree 守卫的语句遍历：按语法节点分派（赋值、heredoc、test 表达式等）。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-63f0f3kd.js (20)
 * attribution: placement 20
 */
import {
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
  TOO_COMPLEX_SUFFIX,
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
} from "./wordValues.js";
import { readFlagWithOverride } from "../../../services/analytics/flagOverrides.js";
import { count } from "../../../utils/collections.js";
import {
  isQuotedLiteral,
  analyzeCommand,
  describeGitRunner,
  INTERPRETER_RULES,
  programBaseName,
  isPlainOrInertValue,
  TENGU_HOLLOW_SANDPIPER,
} from "./commandRules.js";
import {
  wordSet,
  SAFE_PATH_TOKEN_RE,
  SHELL_SPECIAL_VARIABLES,
  PATH_LIKE_VARIABLES_RE,
  SINGLE_VAR_REF_RE,
  isPlainWordText,
  SHELL_NAME_PATTERN,
  GIT_LOCATION_ENV_RE,
  GIT_COMMAND_PATTERN,
  SHELL_STATE_SETTING_VARIABLES,
} from "./shellState.js";
import {
  KNOWN_PROGRAMS,
  TRANSPARENT_LAUNCHERS,
  REMOTE_SESSION_PROGRAMS,
  isDevicePath,
  isStdinLikeDevicePath,
} from "./commandTables.js";
import {
  INTEGER_ATTR_DEFAULT_VARS,
  BASH_IMPLICITLY_REBOUND_VARS,
  isAssignmentNameUnsafeForSandbox,
  isExecInfluencingVar,
  TEST_ARITH_CMP_OPS,
} from "../../../utils/bash/ast.js";

//@ chunk-63f0f3kd.js:36615-36928 placement
/**
 * 判断重定向是否只是把输出去向文件或 /dev/null（这类重定向不改变命令范围）。
 */
var BOT_PROTECTED_TENGU_HUSHED_HYPHEN = "bot_protected_tengu_hushed_hyphen";
var SAFE_REDIRECT_RE =
  /^(?!.*[(`])(?:(?:0*<(?![<>&])|0*1?>[>|]?(?!&))\s*(?:"[^"]*"|'[^']*'|\S+)$|0*1?>&\s*\d*-?$|(?:0*2>[>|]?|&>>?|0*1?>&)\s*(["']?)\/dev\/null\1$|0*2[<>]&\s*-$)/s;
var LEADING_PLUS_FLAG_RE = /^\+(?:.*\s)?-/s;
var DATE_REFERENCE_FLAGS = /^(?:-d|--date|-r|--reference)$/;
var TENGU_GILDED_SUNDIAL = "tengu_gilded_sundial";
var TENGU_FERROUS_ALMANAC = "tengu_ferrous_almanac";
//@ chunk-63f0f3kd.js:36928-39012 placement
/**
 * 判断命令替换体是否只是产出无害值的简单命令（date +格式、wc -l、seq、nproc、id -u、echo 数字、stat -c %Y），用于放行赋值中的命令替换。
 */
function isSafeValueCommand(children, e) {
  let filtered = children.filter((u) => STATEMENT_NODE_TYPES.has(u.type));
  let n = filtered.length === 1 && !e.pathAssigned ? filtered[0] : null;
  if (n?.type === "list") {
    let [u, l, d] = n.children;
    return l?.type === "||" && !!u && /^echo -?\d+$/.test(d?.text ?? "") && isSafeValueCommand([u], e);
  }
  if (n?.type === "pipeline")
    n = n.children.findLast((child) => STATEMENT_NODE_TYPES.has(child.type)) ?? null;
  let flagWithOverride = readFlagWithOverride(BOT_PROTECTED_TENGU_HUSHED_HYPHEN, {
    safe: true,
  });
  let s = n?.type === "redirected_statement" ? n : null;
  if (
    n?.type === "redirected_statement" &&
    n.children.every(
      (child) =>
        child.type !== "heredoc_redirect" &&
        child.type !== "herestring_redirect" &&
        !(flagWithOverride && child.type === "file_redirect" && !SAFE_REDIRECT_RE.test(child.text)),
    )
  )
    n = n.children.find((child) => STATEMENT_NODE_TYPES.has(child.type)) ?? null;
  if (n?.type !== "command" || n.children[0]?.type !== "command_name") return false;
  let filtered_2 = n.children.slice(1).filter((child) => WORD_NODE_TYPES.has(child.type));
  let mapped = filtered_2.map((u) => {
    let l = evaluateWord(u, e, true);
    return l.kind === "literal" ? l.text : l.kind === "dynamic" ? null : "";
  });
  switch (n.children[0].text) {
    case "date": {
      if (
        readFlagWithOverride(TENGU_GILDED_SUNDIAL, {
          safe: true,
        })
      ) {
        if (n.children.length !== filtered_2.length + 1) return false;
        if (mapped.some((u) => /^\+.*%[-_0-9^#EO]*[Nq]/s.test(u ?? ""))) {
          e.dateDirectiveDenied = true;
          return false;
        }
      }
      return (
        count(mapped, (u) => !!u && u.startsWith("+")) === 1 &&
        !(
          flagWithOverride &&
          mapped.some(
            (u, l) =>
              LEADING_PLUS_FLAG_RE.test(u ?? "") ||
              (u === null && !isQuotedLiteral(filtered_2[l])) ||
              (DATE_REFERENCE_FLAGS.test(mapped[l - 1] ?? "") &&
                (u?.startsWith("+") || DATE_REFERENCE_FLAGS.test(u ?? ""))),
          )
        ) &&
        mapped.every(
          (u, l) =>
            DATE_REFERENCE_FLAGS.test(mapped[l - 1] ?? "") ||
            (u !== null &&
              /^(?:-u|--utc|-d|--date|-r|--reference|\+(?:%[sYmdHMSjuUwWVCgGeNq]|[-:/. 0-9])*)$/.test(u)),
        )
      );
    }
    case "wc":
      return allMatch(mapped, /^-[lcmwL]+$/);
    case "seq":
      return allMatch(mapped, /^-?\d+$/);
    case "nproc":
      return allMatch(mapped, /^--all$/);
    case "id":
      return mapped.length === 1 && allMatch(mapped, /^-[ug]$/);
    case "echo":
      return mapped.length === 1 && allMatch(mapped, /^-?\d+$/);
    case "stat": {
      if (
        mapped.length === 4 &&
        mapped[0] === "-c" &&
        /^%[YXZWsbB]$/.test(mapped[1] ?? "") &&
        mapped[2] === "--" &&
        filtered_2[3].type === "string" &&
        (s?.children ?? [])
          .filter((d) => REDIRECT_NODE_TYPES.has(d.type))
          .every((d) => /^2>\s*\/dev\/null$/.test(d.text))
      )
        return true;
      if (
        mapped.some((d) => d === null || /^~(?!\/)/.test(d)) &&
        readFlagWithOverride(TENGU_FERROUS_ALMANAC, {
          safe: true,
        })
      ) {
        e.statPathDenied ||= mapped.some((d) => /^(?:-c|--format)/.test(d ?? ""));
        return false;
      }
      let u = (d) => d === null || !/^(?:-c|--format|%[YXZWsbB])$/.test(d);
      let index = mapped.findIndex(u);
      return (
        mapped.length === 3 &&
        count(mapped, u) === 1 &&
        (mapped[index] === null ? filtered_2[index].type === "string" : /^[^-%]/.test(mapped[index])) &&
        mapped.some((d) => /^%[YXZWsbB]$/.test(d ?? "")) &&
        mapped.some((d) => /^(?:-c|--format)$/.test(d ?? ""))
      );
    }
    default:
      return false;
  }
}
//@ chunk-63f0f3kd.js:39012-39070 placement
function allMatch(t, e) {
  return t.every((i) => i !== null && e.test(i));
}
//@ chunk-63f0f3kd.js:39070-39193 placement
var CONTAINER_NODE_TYPES = wordSet(`program compound_statement subshell do_group
  command_substitution process_substitution else_clause case_item`);
//@ chunk-63f0f3kd.js:39193-39450 placement
function withStdinState(t, e, stdinFed, pipedFrom) {
  let r = {
    stdinFed: e.stdinFed,
    pipedFrom: e.pipedFrom,
  };
  e.stdinFed = stdinFed;
  e.pipedFrom = pipedFrom;
  let s = t.type !== "program" && t.type !== "list";
  if (s) e.scopes.push(new Map());
  let a = analyzeStatement(t, e);
  if (s) e.scopes.pop();
  e.stdinFed = r.stdinFed;
  e.pipedFrom = r.pipedFrom;
  return a;
}
//@ chunk-63f0f3kd.js:39450-42752 placement
/**
 * 按语法节点类型分派分析：注释、赋值、声明、命令、管道、列表、重定向、子 shell、函数定义等。
 */
function analyzeStatement(t, e) {
  let { stdinFed } = e;
  switch (t.type) {
    case "comment":
      return null;
    case "variable_assignment":
      return analyzeVariableAssignment(t, e, undefined);
    case "declaration_command":
      return analyzeDeclarationCommand(t, e);
    case "command": {
      let inputAssembled = e.inputAssembled;
      e.inputAssembled ||= t.children.some(
        (child) => REDIRECT_NODE_TYPES.has(child.type) && analyzeFileRedirect(child, e),
      );
      let r = analyzeCommand(t, e, []);
      e.inputAssembled = inputAssembled;
      return r;
    }
    case "unset_command":
      return t.children
        .slice(1)
        .every(
          (child) =>
            child.type === "variable_name" ||
            (child.type === "word" && /^(?:-[fvn]|[A-Za-z_][A-Za-z0-9_]*)$/.test(child.text)),
        )
        ? null
        : unverifiableRunReason("unset", "with an operand that is not a plain name");
    case "test_command":
      return analyzeTestExpression(t, e, t.children[0]?.type === "[[");
    case "compound_statement":
      if (t.children[0]?.type === "((") return checkArithmeticNode(t, e);
      break;
    case "c_style_for_statement":
      for (let child of t.children) {
        let r =
          child.type === "do_group"
            ? withStdinState(child, e, stdinFed)
            : child.children.length > 0 || /^(?:word|number|variable_name)$/.test(child.type)
              ? checkArithmeticNode(child, e)
              : null;
        if (r !== null)
          return child.type === "compound_statement" && isShellSpecialVariableTypingEnabled()
            ? tooComplexReason("a { \u2026 } body after for ((\u2026)) (write it as do \u2026; done)")
            : r;
      }
      return null;
    case "pipeline": {
      let n;
      let inputAssembled = e.inputAssembled;
      for (let child of t.children) {
        e.inputAssembled ||= !!n;
        let a = STATEMENT_NODE_TYPES.has(child.type)
          ? withStdinState(child, e, stdinFed || !!n, n)
          : /^\|&?$/.test(child.type)
            ? null
            : tooComplexReason(`a ${child.type} in a pipeline`);
        if (a !== null) return a;
        n = STATEMENT_NODE_TYPES.has(child.type) ? child : n;
      }
      e.inputAssembled = inputAssembled;
      return null;
    }
    case "redirected_statement": {
      let filtered = t.children.filter((child) => REDIRECT_NODE_TYPES.has(child.type));
      let found = t.children.find((child) => STATEMENT_NODE_TYPES.has(child.type));
      let s = [];
      for (let child of t.children) {
        let c = REDIRECT_NODE_TYPES.has(child.type)
          ? analyzeHeredocRedirect(child, e, s)
          : child !== found && child.children.length > 0
            ? tooComplexReason(`a ${child.type} after a redirect`)
            : null;
        if (c !== null) return c;
      }
      let a = stdinFed || filtered.some(isStdinRedirect);
      let inputAssembled = e.inputAssembled;
      e.inputAssembled ||= [
        ...filtered,
        ...(found?.type === "command"
          ? found.children.filter((child) => REDIRECT_NODE_TYPES.has(child.type))
          : []),
      ].some((d) => analyzeFileRedirect(d, e));
      let u = !found
        ? filtered.some((d) => analyzeRedirect(d, e))
          ? tooComplexReason("a here-string after a compound command")
          : null
        : found.type === "command"
          ? analyzeCommand(found, e, filtered)
          : withStdinState(found, e, a);
      e.inputAssembled ||= s.length > 0;
      let l = u ?? s.map((d) => withStdinState(d, e, true)).find((d) => d !== null);
      e.inputAssembled = inputAssembled;
      return l ?? null;
    }
    case "function_definition": {
      let found = t.children.find((child) => child.type === "word");
      if (
        !found ||
        !SAFE_PATH_TOKEN_RE.test(found.text) ||
        describeGitRunner(found.text) !== null ||
        KNOWN_PROGRAMS.has(found.text) ||
        INTERPRETER_RULES.has(programBaseName(found.text)) ||
        TRANSPARENT_LAUNCHERS.has(found.text) ||
        REMOTE_SESSION_PROGRAMS.has(found.text) ||
        /^(?:nproc|command_name)$/.test(found.text)
      )
        return tooComplexReason("a function named like a program this guard knows");
      let found_2 = t.children.find((child) => child !== found && STATEMENT_NODE_TYPES.has(child.type));
      return found_2 ? withStdinState(found_2, e, false) : null;
    }
    default:
      if (!STATEMENT_NODE_TYPES.has(t.type) && !/^(?:command|process)_substitution$/.test(t.type))
        return tooComplexReason(`a ${t.type} statement`);
  }
  for (let [n, r] of t.children.entries()) {
    let s = null;
    if (STATEMENT_NODE_TYPES.has(r.type)) {
      s = withStdinState(r, e, stdinFed);
      let a = r.type === "declaration_command" && r.children.length === 2 ? r.children[1] : r;
      let [o, u, l] = a.children;
      let d =
        a.type === "variable_assignment" &&
        o?.type === "variable_name" &&
        u?.type === "=" &&
        l &&
        isStaticNode(l) &&
        (CONTAINER_NODE_TYPES.has(t.type) || (t.type === "list" && n === 0)) &&
        t.children[n + 1]?.type !== "&" &&
        e.bindingSites.get(o.text) === 1 &&
        !e.integerNames.has(o.text) &&
        !e.arrayNames.has(o.text) &&
        !INTEGER_ATTR_DEFAULT_VARS.has(o.text) &&
        !SHELL_SPECIAL_VARIABLES.test(o.text) &&
        !BASH_IMPLICITLY_REBOUND_VARS.has(o.text) &&
        !PATH_LIKE_VARIABLES_RE.test(o.text)
          ? evaluateWord(l, e, false)
          : null;
      if (d?.kind === "literal") e.scopes.at(-1).set(o.text, d.text);
    } else if (WORD_NODE_TYPES.has(r.type)) {
      let a = t.children[n + 1];
      let o = evaluateWord(r, e, t.type === "for_statement");
      s =
        a?.startIndex === r.endIndex && isDollarQuoteEdge(r, a)
          ? tooComplexReason(`the pattern ${shortenForReason(r.text + a.text)}`)
          : o.kind === "refuse"
            ? o.detail
            : null;
    } else if (r.type === "variable_name") s = describeUnsafeBinding(r.text, e);
    else if (r.children.length > 0 || r.type === "ERROR")
      s = tooComplexReason(r.type === "ERROR" ? "syntax the parser could not recover" : `a ${r.type} here`);
    if (s !== null) return s;
  }
  return null;
}
//@ chunk-63f0f3kd.js:42752-43358 placement
function analyzeFileRedirect(t, e) {
  if (t.type === "file_redirect") {
    let found = t.children.find((child) => WORD_NODE_TYPES.has(child.type));
    let text = /^\d*<(?!>)/.test(t.text) ? found?.text : undefined;
    let [, , s, a] = SINGLE_VAR_REF_RE.exec(found?.text ?? "") ?? [];
    let o = s ?? a ?? "";
    let u = found && !isStaticNode(found) ? evaluateWord(found, e, true) : null;
    let l = !!u && (u.kind !== "dynamic" || !u.inert) && !(e.pathNames.has(o) && e.bindingSites.get(o) === 1);
    return (
      /[<>]\(|<&|&</.test(t.text) || (text !== undefined && (l || isDevicePath(text.replace(/["'\\]/g, ""))))
    );
  }
  let i = t.type === "heredoc_redirect" ? t.children.find((child) => child.type === "heredoc_body") : t;
  return (
    (!isStdinRedirect(t) && analyzeRedirect(t, e)) ||
    (i?.children ?? [])
      .filter((n) => WORD_NODE_TYPES.has(n.type))
      .some((n) => {
        let r = evaluateWord(n, e, false);
        return r.kind !== "literal" && (r.kind !== "dynamic" || !r.inert);
      })
  );
}
//@ chunk-63f0f3kd.js:43358-43590 placement
function isStdinRedirect(t) {
  let found = t.children.find((child) => child.type === "file_descriptor");
  return (
    (!found ||
      found.text === "0" ||
      (/^0+$/.test(found.text) &&
        readFlagWithOverride(BOT_PROTECTED_TENGU_HUSHED_HYPHEN, {
          safe: true,
        }))) &&
    (t.type !== "file_redirect" ||
      t.children.some((child) => child.children.length === 0 && /^<(?!\()/.test(child.type)))
  );
}
//@ chunk-63f0f3kd.js:43590-44867 placement
function analyzeHeredocRedirect(child, e, i) {
  if (child.type !== "heredoc_redirect") {
    for (let child_2 of child.children) {
      let o = WORD_NODE_TYPES.has(child_2.type)
        ? evaluateWord(child_2, e, child.type === "file_redirect")
        : null;
      if (o?.kind === "refuse") return o.detail;
    }
    return null;
  }
  let found = child.children.find((child) => child.type === "heredoc_start");
  let found_2 = child.children.find((child) => child.type === "heredoc_end");
  let match = QUOTED_NAME_RE.exec(found?.text ?? "");
  if (!match || found_2?.text.trim() !== match[2])
    return tooComplexReason("a here-document whose delimiter it cannot match the way bash does");
  for (let child_2 of child.children) {
    let o = null;
    if (child_2.type === "heredoc_body") {
      let u = child_2.children[0];
      let joined = [
        u
          ? Buffer.from(child_2.text, "utf8")
              .subarray(0, u.startIndex - child_2.startIndex)
              .toString("utf8")
          : child_2.text,
        ...child_2.children.filter((child) => child.type === "heredoc_content").map((child) => child.text),
      ].join("\x00");
      o =
        match[1] === "" &&
        (child_2.text.replace(/\\[\\$`]/g, "").includes("`") ||
          /\$(?![ \t\r\n"').,/|]|$)/.test(joined.replace(/\\[\\$`]/g, "")))
          ? tooComplexReason("a here-document body it did not tokenize")
          : match[1] === "" &&
              (child_2.text
                .split("$")
                .slice(1)
                .some((d) => DOLLAR_QUOTE_EDGE_RE.test(d)) ||
                child_2.children.some((child, c) => {
                  let f = child_2.children[c + 1];
                  return f?.startIndex === child.endIndex && isRiskyExpansionOperand(child, f.text);
                }))
            ? tooComplexReason("a here-document body zsh expands differently")
            : withStdinState(child_2, e, false);
    } else if (child_2.type === "pipeline")
      i.push(...child_2.children.filter((child) => STATEMENT_NODE_TYPES.has(child.type)));
    else if (REDIRECT_NODE_TYPES.has(child_2.type)) o = analyzeHeredocRedirect(child_2, e, i);
    else if (child_2.children.length > 0) o = tooComplexReason(`a ${child_2.type} after a here-document`);
    if (o !== null) return o;
  }
  return null;
}
//@ chunk-63f0f3kd.js:44867-45218 placement
function analyzeRedirect(t, e) {
  if (t.type === "file_redirect") return analyzeFileRedirect(t, e);
  let found = t.children.find((child) => child.type === "heredoc_body");
  let found_2 = t.children.find((child) => WORD_NODE_TYPES.has(child.type));
  let r =
    t.type === "herestring_redirect" && found_2
      ? evaluateWord(found_2, e, false)
      : t.type === "heredoc_redirect" && found?.children.length === 0
        ? {
            kind: "literal",
            text: found.text,
          }
        : null;
  return !(r?.kind === "literal" ? isPlainWordText(r.text) : r?.kind === "dynamic" && r.inert);
}
//@ chunk-63f0f3kd.js:45218-46806 placement
function analyzeVariableAssignment(t, e, i, n = false, r = false, s = false) {
  let [a, o, u] = t.children;
  let l = a?.type === "subscript" ? a.children[0] : a;
  if (!l || !o || !SHELL_NAME_PATTERN.test(l.text) || !/^(?:variable_name|subscript)$/.test(a.type))
    return tooComplexReason("an assignment whose name is not a plain word");
  let text = l.text;
  let c = a.type === "subscript" ? checkSubscript(a, e) : null;
  if (c !== null) return c;
  if (GIT_LOCATION_ENV_RE.test(text) && !e.simple)
    return `assigns ${text} ${TOO_COMPLEX_SUFFIX}, which redirects git or its configuration to a location this guard cannot verify`;
  let f = !!i?.integer || e.integerNames.has(text) || INTEGER_ATTR_DEFAULT_VARS.has(text);
  if (u?.type === "array") {
    for (let child of u.children) {
      if (!WORD_NODE_TYPES.has(child.type)) {
        if (child.type !== "(" && child.type !== ")") return tooComplexReason(`a ${child.type} in an array`);
        continue;
      }
      let S =
        child.type === "concatenation" && child.children[0]?.text === "["
          ? child.children.findIndex((child) => child.text === "]")
          : 0;
      for (let child_2 of child.children.slice(1, Math.max(S, 1))) {
        let x = checkArithmeticNode(child_2, e);
        if (x !== null) return x;
      }
      let p = f ? checkArithmeticWord(child, e) : null;
      let m = evaluateWord(child, e, true);
      if (p !== null || m.kind === "refuse") return p ?? describeWordValue(m);
    }
    return environmentAssignmentReason(text, dynamicValue("an array"), u.text);
  }
  if (u && !WORD_NODE_TYPES.has(u.type)) return tooComplexReason(`a ${u.type} as an assignment value`);
  let h = u && f ? checkArithmeticWord(u, e) : null;
  if (h !== null) return h;
  let b = u
    ? evaluateWord(u, e, false)
    : {
        kind: "literal",
        text: "",
      };
  if (b.kind === "refuse") return b.detail;
  if (
    i &&
    (i.array || e.arrayNames.has(text)) &&
    (b.kind !== "literal" || b.text.trimStart().startsWith("("))
  )
    return unverifiableRunReason(
      `declare ${text}=`,
      "with a string it would re-parse as an array assignment",
    );
  if (
    (i?.exported || (e.allExported && !n)) &&
    (b.kind === "dynamic"
      ? !b.inert
      : b.text.split(/\s+/).some((g) => GIT_COMMAND_PATTERN.test(programBaseName(g)))) &&
    !/^(?:PATH|(?:DY)?LD_\w+)$/.test(text)
  )
    return unverifiableRunReason(
      `export ${text}=`,
      `with a value every later program inherits (${b.kind === "dynamic" ? b.why : "a git command"})`,
    );
  return environmentAssignmentReason(text, b, u?.text ?? "", n, r, s);
}
//@ chunk-63f0f3kd.js:46806-46836 placement
var TENGU_DRIFTING_LEMUR = "tengu_drifting_lemur";
//@ chunk-63f0f3kd.js:46836-46874 placement
/**
 * 读取 tengu_drifting_lemur 开关：LOCALE 类变量若来自路径，视为危险。
 */
function shouldTreatLocalePathAsHazard() {
  return readFlagWithOverride(TENGU_DRIFTING_LEMUR, {
    safe: true,
  });
}
//@ chunk-63f0f3kd.js:46874-46966 placement
function containsSubstitution(child) {
  return /^(?:command|process)_substitution$/.test(child.type) || child.children.some(containsSubstitution);
}
//@ chunk-63f0f3kd.js:46966-47090 placement
/**
 * 在文本中查找 shell 自身设置的特殊变量名（仅在相应模式开启时）。
 */
function findShellVarName(t) {
  let found = t
    .replace(/\\\n|"/g, "")
    .match(/[A-Za-z_]\w*/g)
    ?.find((i) => LOCALE_PATH_ENV_RE.test(i));
  return found !== undefined && shouldTreatLocalePathAsHazard() ? found : undefined;
}
//@ chunk-63f0f3kd.js:47090-47334 placement
/**
 * 若内建命令可把 shell 自身变量设为整数/浮点类型，返回风险说明。
 */
function describeIntegerTyping(t) {
  return isSpecialVariableTypingRisk(t)
    ? `can make ${t} an integer or float variable ${TOO_COMPLEX_SUFFIX}; ${t} is a variable bash or zsh sets by itself, and with that type the shell can evaluate what it later stores there as arithmetic, so use another variable name`
    : null;
}
//@ chunk-63f0f3kd.js:47334-47659 placement
/**
 * 判断通过循环或内建命令绑定的变量名是否危险（影响 shell 或程序行为、整数变量、导出后影响后续命令），危险时返回原因。
 */
function describeUnsafeBinding(text, state) {
  return isAssignmentNameUnsafeForSandbox(text) ||
    state.integerNames.has(text) ||
    GIT_LOCATION_ENV_RE.test(text) ||
    SHELL_STATE_SETTING_VARIABLES.test(text) ||
    LOCALE_ENV_RE.test(text.toUpperCase()) ||
    (LOCALE_PATH_ENV_RE.test(text) && shouldTreatLocalePathAsHazard()) ||
    COMMAND_VALUED_ENV_RE.test(text) ||
    (state.allExported && state.kinds.get(text) === "other")
    ? `binds ${text} through a loop or builtin ${TOO_COMPLEX_SUFFIX}; its value steers the shell or a program (or, exported, every later one) and cannot be screened there`
    : null;
}
//@ chunk-63f0f3kd.js:47659-48864 placement
function environmentAssignmentReason(text, e, i, n = false, r = false, s = false) {
  let upper = text.toUpperCase();
  let o = isPlainOrInertValue(e);
  let u =
    ((r && CHARSET_LOCALE_ENV_RE.test(upper)) || (s && upper === "IFS")) && shouldTreatLocalePathAsHazard();
  if (n && !u && (upper === "IFS" || LOCALE_ENV_RE.test(upper))) return null;
  if (LOCALE_PATH_ENV_RE.test(text) && shouldTreatLocalePathAsHazard())
    return unverifiableRunReason(
      `${text}=${shortenForReason(i)}`,
      "with locale or character-set tables from a path of its choosing (no value is accepted in a command: drop it)",
    );
  if (SHELL_STATE_SETTING_VARIABLES.test(text))
    return unverifiableRunReason(
      `${text}=`,
      "which changes what a later command word, tilde directory or child shell option resolves to",
    );
  if ((e.kind === "literal" ? e.text : i.replace(/["'\\]/g, "")).split(/\s+/).some(isStdinLikeDevicePath))
    return unverifiableRunReason(
      `${text}=`,
      "with a descriptor path whose content a program may read as its program or configuration",
    );
  if (upper === "IFS")
    return EMPTY_VALUE_RE.test(i)
      ? null
      : unverifiableRunReason("IFS=", "with a separator other than whitespace");
  if (LOCALE_ENV_RE.test(upper))
    return e.kind === "literal" && /^(?:C|POSIX|[A-Za-z_]*\.UTF-?8)?$/i.test(e.text)
      ? null
      : unverifiableRunReason(
          `${text}=${shortenForReason(i)}`,
          "with a locale whose character set cannot be verified (only C, POSIX or a name of letters and underscores ending in .UTF-8, such as en_US.UTF-8, is accepted: use one of those or remove the assignment)",
        );
  if (upper === "PATH" || upper.startsWith("LD_") || upper.startsWith("DYLD_")) return null;
  if (isExecInfluencingVar(text) || (COMMAND_VALUED_ENV_RE.test(text) && !o))
    return unverifiableRunReason(
      `${text}=`,
      `with a value the shell or another program acts on (${describeWordValue(e)})`,
    );
  return null;
}
//@ chunk-63f0f3kd.js:48864-49768 placement
function analyzeDeclarationCommand(t, e) {
  let text = t.children[0]?.text ?? "declare";
  let n = {
    integer: false,
    array: false,
    exported: text === "export",
  };
  let r = false;
  for (let child of t.children.slice(1)) {
    let a = null;
    if (child.type === "word" && DECLARE_FLAGS_RE.test(child.text)) {
      n.integer ||= child.text[0] === "-" && child.text.includes("i");
      r ||= child.text[0] === "-" && /[iF]/.test(child.text);
      n.array ||= /[aA]/.test(child.text);
      n.exported ||= child.text.includes("x");
    } else if (child.type === "variable_name")
      a =
        GIT_LOCATION_ENV_RE.test(child.text) && !e.simple
          ? `exports ${child.text} ${TOO_COMPLEX_SUFFIX}, which redirects git to a location this guard cannot verify`
          : n.exported && e.kinds.get(child.text) === "other"
            ? unverifiableRunReason(
                `${text} ${child.text}`,
                "exporting a value this command computes to every later program",
              )
            : null;
    else if (child.type === "variable_assignment") {
      let o = child.children[0];
      let text = (o?.type === "subscript" ? o.children[0] : o)?.text;
      a = (r ? describeIntegerTyping(text ?? "") : null) ?? analyzeVariableAssignment(child, e, n);
    } else if (child.children.length > 0 || WORD_NODE_TYPES.has(child.type))
      a = unverifiableRunReason(
        text,
        `with an operand it would expand or evaluate (${shortenForReason(child.text)})`,
      );
    if (a !== null) return a;
  }
  return null;
}
//@ chunk-63f0f3kd.js:49768-50717 placement
function analyzeTestExpression(t, e, i) {
  if (WORD_NODE_TYPES.has(t.type)) {
    let r = evaluateWord(t, e, !i);
    return r.kind === "refuse" ? r.detail : null;
  }
  let text = t.children.find((child) => child.type === "test_operator")?.text ?? "";
  if (
    /^-[vRt]$/.test(text) &&
    (t.type === "unary_expression" ||
      (t.type === "binary_expression" &&
        t.children.length > 2 &&
        !i &&
        readFlagWithOverride(TENGU_HOLLOW_SANDPIPER, {
          safe: true,
        })))
  ) {
    let last = t.children.at(-1);
    let s =
      /^(?:word|number)$/.test(last?.type ?? "") && /^(?:[A-Za-z_]\w*|\d+)$/.test(last?.text ?? "")
        ? null
        : arithmeticEvalReason(t.text);
    if (s !== null || t.type === "unary_expression") return s;
  }
  if (t.type === "binary_expression" && i && TEST_ARITH_CMP_OPS.has(text))
    return (
      t.children
        .filter((child) => child.type !== "test_operator")
        .map((child) => checkArithmeticWord(child, e))
        .find((r) => r !== null) ?? null
    );
  if (!/expression|test_command/.test(t.type)) return tooComplexReason(`a ${t.type} in a test`);
  for (let [r, s] of t.children.entries()) {
    let a = t.children[r + 1];
    if (a?.startIndex === s.endIndex && (isRiskyExpansionOperand(s, a.text) || isDollarQuoteEdge(s, a)))
      return tooComplexReason(`the pattern ${shortenForReason(s.text + a.text)}`);
  }
  return (
    t.children
      .filter((child) => child.children.length > 0 || WORD_NODE_TYPES.has(child.type))
      .map((child) => analyzeTestExpression(child, e, i))
      .find((r) => r !== null) ?? null
  );
}
export {
  withStdinState,
  isSafeValueCommand,
  describeUnsafeBinding,
  findShellVarName,
  environmentAssignmentReason,
  describeIntegerTyping,
  BOT_PROTECTED_TENGU_HUSHED_HYPHEN,
  isStdinRedirect,
  containsSubstitution,
  analyzeVariableAssignment,
  analyzeHeredocRedirect,
  analyzeRedirect,
};
