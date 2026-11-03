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
  Ue,
  tooComplexReason,
  isStaticNode,
  isDollarQuoteEdge,
  shortenForReason,
  QUOTED_NAME_RE,
  Te,
  isRiskyExpansionOperand,
  checkSubscript,
  TOO_COMPLEX_SUFFIX,
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
} from "./wordValues.js";
import { readFlagWithOverride } from "../../../services/analytics/flagOverrides.js";
import { count } from "../../../utils/collections.js";
import {
  isQuotedLiteral,
  analyzeCommand,
  describeGitRunner,
  INTERPRETER_RULES,
  programBaseName,
  Xt,
  TENGU_HOLLOW_SANDPIPER,
} from "./commandRules.js";
import {
  wordSet,
  Dn,
  ft,
  Pn,
  Pe,
  isPlainWordText,
  SHELL_NAME_PATTERN,
  me,
  GIT_COMMAND_PATTERN,
  Ce,
} from "./shellState.js";
import { dt, ot, It, isDevicePath, isStdinLikeDevicePath } from "./commandTables.js";
import {
  INTEGER_ATTR_DEFAULT_VARS,
  BASH_IMPLICITLY_REBOUND_VARS,
  isAssignmentNameUnsafeForSandbox,
  isExecInfluencingVar,
  TEST_ARITH_CMP_OPS,
} from "../../../utils/bash/ast.js";

//@ chunk-63f0f3kd.js:36615-36928 placement
var BOT_PROTECTED_TENGU_HUSHED_HYPHEN = "bot_protected_tengu_hushed_hyphen",
  Ei =
    /^(?!.*[(`])(?:(?:0*<(?![<>&])|0*1?>[>|]?(?!&))\s*(?:"[^"]*"|'[^']*'|\S+)$|0*1?>&\s*\d*-?$|(?:0*2>[>|]?|&>>?|0*1?>&)\s*(["']?)\/dev\/null\1$|0*2[<>]&\s*-$)/s,
  Ai = /^\+(?:.*\s)?-/s,
  ye = /^(?:-d|--date|-r|--reference)$/,
  TENGU_GILDED_SUNDIAL = "tengu_gilded_sundial",
  TENGU_FERROUS_ALMANAC = "tengu_ferrous_almanac";
/**
 * 判断命令替换体是否只是产出无害值的简单命令（date +格式、wc -l、seq、nproc、id -u、echo 数字、stat -c %Y），用于放行赋值中的命令替换。
 */
//@ chunk-63f0f3kd.js:36928-39012 placement
function isSafeValueCommand(t, e) {
  let filtered = t.filter((u) => STATEMENT_NODE_TYPES.has(u.type)),
    n = filtered.length === 1 && !e.pathAssigned ? filtered[0] : null;
  if (n?.type === "list") {
    let [u, l, d] = n.children;
    return l?.type === "||" && !!u && /^echo -?\d+$/.test(d?.text ?? "") && isSafeValueCommand([u], e);
  }
  if (n?.type === "pipeline") n = n.children.findLast((u) => STATEMENT_NODE_TYPES.has(u.type)) ?? null;
  let r = readFlagWithOverride(BOT_PROTECTED_TENGU_HUSHED_HYPHEN, { safe: !0 }),
    s = n?.type === "redirected_statement" ? n : null;
  if (
    n?.type === "redirected_statement" &&
    n.children.every(
      (u) =>
        u.type !== "heredoc_redirect" &&
        u.type !== "herestring_redirect" &&
        !(r && u.type === "file_redirect" && !Ei.test(u.text)),
    )
  )
    n = n.children.find((u) => STATEMENT_NODE_TYPES.has(u.type)) ?? null;
  if (n?.type !== "command" || n.children[0]?.type !== "command_name") return !1;
  let filtered_2 = n.children.slice(1).filter((u) => WORD_NODE_TYPES.has(u.type)),
    mapped = filtered_2.map((u) => {
      let l = evaluateWord(u, e, !0);
      return l.kind === "literal" ? l.text : l.kind === "dynamic" ? null : "";
    });
  switch (n.children[0].text) {
    case "date": {
      if (readFlagWithOverride(TENGU_GILDED_SUNDIAL, { safe: !0 })) {
        if (n.children.length !== filtered_2.length + 1) return !1;
        if (mapped.some((u) => /^\+.*%[-_0-9^#EO]*[Nq]/s.test(u ?? "")))
          return ((e.dateDirectiveDenied = !0), !1);
      }
      return (
        count(mapped, (u) => !!u && u.startsWith("+")) === 1 &&
        !(
          r &&
          mapped.some(
            (u, l) =>
              Ai.test(u ?? "") ||
              (u === null && !isQuotedLiteral(filtered_2[l])) ||
              (ye.test(mapped[l - 1] ?? "") && (u?.startsWith("+") || ye.test(u ?? ""))),
          )
        ) &&
        mapped.every(
          (u, l) =>
            ye.test(mapped[l - 1] ?? "") ||
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
        return !0;
      if (
        mapped.some((d) => d === null || /^~(?!\/)/.test(d)) &&
        readFlagWithOverride(TENGU_FERROUS_ALMANAC, { safe: !0 })
      )
        return ((e.statPathDenied ||= mapped.some((d) => /^(?:-c|--format)/.test(d ?? ""))), !1);
      let u = (d) => d === null || !/^(?:-c|--format|%[YXZWsbB])$/.test(d),
        index = mapped.findIndex(u);
      return (
        mapped.length === 3 &&
        count(mapped, u) === 1 &&
        (mapped[index] === null ? filtered_2[index].type === "string" : /^[^-%]/.test(mapped[index])) &&
        mapped.some((d) => /^%[YXZWsbB]$/.test(d ?? "")) &&
        mapped.some((d) => /^(?:-c|--format)$/.test(d ?? ""))
      );
    }
    default:
      return !1;
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
function withStdinState(t, e, i, n) {
  let r = { stdinFed: e.stdinFed, pipedFrom: e.pipedFrom };
  ((e.stdinFed = i), (e.pipedFrom = n));
  let s = t.type !== "program" && t.type !== "list";
  if (s) e.scopes.push(new Map());
  let a = analyzeStatement(t, e);
  if (s) e.scopes.pop();
  return ((e.stdinFed = r.stdinFed), (e.pipedFrom = r.pipedFrom), a);
}
/**
 * 按语法节点类型分派分析：注释、赋值、声明、命令、管道、列表、重定向、子 shell、函数定义等。
 */
//@ chunk-63f0f3kd.js:39450-42752 placement
function analyzeStatement(t, e) {
  let { stdinFed: stdinFed } = e;
  switch (t.type) {
    case "comment":
      return null;
    case "variable_assignment":
      return analyzeVariableAssignment(t, e, void 0);
    case "declaration_command":
      return analyzeDeclarationCommand(t, e);
    case "command": {
      let inputAssembled = e.inputAssembled;
      e.inputAssembled ||= t.children.some(
        (s) => REDIRECT_NODE_TYPES.has(s.type) && analyzeFileRedirect(s, e),
      );
      let r = analyzeCommand(t, e, []);
      return ((e.inputAssembled = inputAssembled), r);
    }
    case "unset_command":
      return t.children
        .slice(1)
        .every(
          (n) =>
            n.type === "variable_name" ||
            (n.type === "word" && /^(?:-[fvn]|[A-Za-z_][A-Za-z0-9_]*)$/.test(n.text)),
        )
        ? null
        : unverifiableRunReason("unset", "with an operand that is not a plain name");
    case "test_command":
      return analyzeTestExpression(t, e, t.children[0]?.type === "[[");
    case "compound_statement":
      if (t.children[0]?.type === "((") return checkArithmeticNode(t, e);
      break;
    case "c_style_for_statement":
      for (let n of t.children) {
        let r =
          n.type === "do_group"
            ? withStdinState(n, e, stdinFed)
            : n.children.length > 0 || /^(?:word|number|variable_name)$/.test(n.type)
              ? checkArithmeticNode(n, e)
              : null;
        if (r !== null)
          return n.type === "compound_statement" && Ue()
            ? tooComplexReason("a { \u2026 } body after for ((\u2026)) (write it as do \u2026; done)")
            : r;
      }
      return null;
    case "pipeline": {
      let n,
        inputAssembled = e.inputAssembled;
      for (let s of t.children) {
        e.inputAssembled ||= !!n;
        let a = STATEMENT_NODE_TYPES.has(s.type)
          ? withStdinState(s, e, stdinFed || !!n, n)
          : /^\|&?$/.test(s.type)
            ? null
            : tooComplexReason(`a ${s.type} in a pipeline`);
        if (a !== null) return a;
        n = STATEMENT_NODE_TYPES.has(s.type) ? s : n;
      }
      return ((e.inputAssembled = inputAssembled), null);
    }
    case "redirected_statement": {
      let filtered = t.children.filter((d) => REDIRECT_NODE_TYPES.has(d.type)),
        found = t.children.find((d) => STATEMENT_NODE_TYPES.has(d.type)),
        s = [];
      for (let d of t.children) {
        let c = REDIRECT_NODE_TYPES.has(d.type)
          ? analyzeHeredocRedirect(d, e, s)
          : d !== found && d.children.length > 0
            ? tooComplexReason(`a ${d.type} after a redirect`)
            : null;
        if (c !== null) return c;
      }
      let a = stdinFed || filtered.some(isStdinRedirect),
        inputAssembled = e.inputAssembled;
      e.inputAssembled ||= [
        ...filtered,
        ...(found?.type === "command" ? found.children.filter((d) => REDIRECT_NODE_TYPES.has(d.type)) : []),
      ].some((d) => analyzeFileRedirect(d, e));
      let u = !found
        ? filtered.some((d) => analyzeRedirect(d, e))
          ? tooComplexReason("a here-string after a compound command")
          : null
        : found.type === "command"
          ? analyzeCommand(found, e, filtered)
          : withStdinState(found, e, a);
      e.inputAssembled ||= s.length > 0;
      let l = u ?? s.map((d) => withStdinState(d, e, !0)).find((d) => d !== null);
      return ((e.inputAssembled = inputAssembled), l ?? null);
    }
    case "function_definition": {
      let found = t.children.find((s) => s.type === "word");
      if (
        !found ||
        !Dn.test(found.text) ||
        describeGitRunner(found.text) !== null ||
        dt.has(found.text) ||
        INTERPRETER_RULES.has(programBaseName(found.text)) ||
        ot.has(found.text) ||
        It.has(found.text) ||
        /^(?:nproc|command_name)$/.test(found.text)
      )
        return tooComplexReason("a function named like a program this guard knows");
      let found_2 = t.children.find((s) => s !== found && STATEMENT_NODE_TYPES.has(s.type));
      return found_2 ? withStdinState(found_2, e, !1) : null;
    }
    default:
      if (!STATEMENT_NODE_TYPES.has(t.type) && !/^(?:command|process)_substitution$/.test(t.type))
        return tooComplexReason(`a ${t.type} statement`);
  }
  for (let [n, r] of t.children.entries()) {
    let s = null;
    if (STATEMENT_NODE_TYPES.has(r.type)) {
      s = withStdinState(r, e, stdinFed);
      let a = r.type === "declaration_command" && r.children.length === 2 ? r.children[1] : r,
        [o, u, l] = a.children,
        d =
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
          !ft.test(o.text) &&
          !BASH_IMPLICITLY_REBOUND_VARS.has(o.text) &&
          !Pn.test(o.text)
            ? evaluateWord(l, e, !1)
            : null;
      if (d?.kind === "literal") e.scopes.at(-1).set(o.text, d.text);
    } else if (WORD_NODE_TYPES.has(r.type)) {
      let a = t.children[n + 1],
        o = evaluateWord(r, e, t.type === "for_statement");
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
    let found = t.children.find((d) => WORD_NODE_TYPES.has(d.type)),
      r = /^\d*<(?!>)/.test(t.text) ? found?.text : void 0,
      [, , s, a] = Pe.exec(found?.text ?? "") ?? [],
      o = s ?? a ?? "",
      u = found && !isStaticNode(found) ? evaluateWord(found, e, !0) : null,
      l = !!u && (u.kind !== "dynamic" || !u.inert) && !(e.pathNames.has(o) && e.bindingSites.get(o) === 1);
    return /[<>]\(|<&|&</.test(t.text) || (r !== void 0 && (l || isDevicePath(r.replace(/["'\\]/g, ""))));
  }
  let i = t.type === "heredoc_redirect" ? t.children.find((n) => n.type === "heredoc_body") : t;
  return (
    (!isStdinRedirect(t) && analyzeRedirect(t, e)) ||
    (i?.children ?? [])
      .filter((n) => WORD_NODE_TYPES.has(n.type))
      .some((n) => {
        let r = evaluateWord(n, e, !1);
        return r.kind !== "literal" && (r.kind !== "dynamic" || !r.inert);
      })
  );
}
//@ chunk-63f0f3kd.js:43358-43590 placement
function isStdinRedirect(t) {
  let found = t.children.find((i) => i.type === "file_descriptor");
  return (
    (!found ||
      found.text === "0" ||
      (/^0+$/.test(found.text) && readFlagWithOverride(BOT_PROTECTED_TENGU_HUSHED_HYPHEN, { safe: !0 }))) &&
    (t.type !== "file_redirect" || t.children.some((i) => i.children.length === 0 && /^<(?!\()/.test(i.type)))
  );
}
//@ chunk-63f0f3kd.js:43590-44867 placement
function analyzeHeredocRedirect(t, e, i) {
  if (t.type !== "heredoc_redirect") {
    for (let a of t.children) {
      let o = WORD_NODE_TYPES.has(a.type) ? evaluateWord(a, e, t.type === "file_redirect") : null;
      if (o?.kind === "refuse") return o.detail;
    }
    return null;
  }
  let found = t.children.find((a) => a.type === "heredoc_start"),
    found_2 = t.children.find((a) => a.type === "heredoc_end"),
    match = QUOTED_NAME_RE.exec(found?.text ?? "");
  if (!match || found_2?.text.trim() !== match[2])
    return tooComplexReason("a here-document whose delimiter it cannot match the way bash does");
  for (let a of t.children) {
    let o = null;
    if (a.type === "heredoc_body") {
      let u = a.children[0],
        joined = [
          u
            ? Buffer.from(a.text, "utf8")
                .subarray(0, u.startIndex - a.startIndex)
                .toString("utf8")
            : a.text,
          ...a.children.filter((d) => d.type === "heredoc_content").map((d) => d.text),
        ].join("\x00");
      o =
        match[1] === "" &&
        (a.text.replace(/\\[\\$`]/g, "").includes("`") ||
          /\$(?![ \t\r\n"').,/|]|$)/.test(joined.replace(/\\[\\$`]/g, "")))
          ? tooComplexReason("a here-document body it did not tokenize")
          : match[1] === "" &&
              (a.text
                .split("$")
                .slice(1)
                .some((d) => Te.test(d)) ||
                a.children.some((d, c) => {
                  let f = a.children[c + 1];
                  return f?.startIndex === d.endIndex && isRiskyExpansionOperand(d, f.text);
                }))
            ? tooComplexReason("a here-document body zsh expands differently")
            : withStdinState(a, e, !1);
    } else if (a.type === "pipeline") i.push(...a.children.filter((u) => STATEMENT_NODE_TYPES.has(u.type)));
    else if (REDIRECT_NODE_TYPES.has(a.type)) o = analyzeHeredocRedirect(a, e, i);
    else if (a.children.length > 0) o = tooComplexReason(`a ${a.type} after a here-document`);
    if (o !== null) return o;
  }
  return null;
}
//@ chunk-63f0f3kd.js:44867-45218 placement
function analyzeRedirect(t, e) {
  if (t.type === "file_redirect") return analyzeFileRedirect(t, e);
  let found = t.children.find((s) => s.type === "heredoc_body"),
    found_2 = t.children.find((s) => WORD_NODE_TYPES.has(s.type)),
    r =
      t.type === "herestring_redirect" && found_2
        ? evaluateWord(found_2, e, !1)
        : t.type === "heredoc_redirect" && found?.children.length === 0
          ? { kind: "literal", text: found.text }
          : null;
  return !(r?.kind === "literal" ? isPlainWordText(r.text) : r?.kind === "dynamic" && r.inert);
}
//@ chunk-63f0f3kd.js:45218-46806 placement
function analyzeVariableAssignment(t, e, i, n = !1, r = !1, s = !1) {
  let [a, o, u] = t.children,
    l = a?.type === "subscript" ? a.children[0] : a;
  if (!l || !o || !SHELL_NAME_PATTERN.test(l.text) || !/^(?:variable_name|subscript)$/.test(a.type))
    return tooComplexReason("an assignment whose name is not a plain word");
  let text = l.text,
    c = a.type === "subscript" ? checkSubscript(a, e) : null;
  if (c !== null) return c;
  if (me.test(text) && !e.simple)
    return `assigns ${text} ${TOO_COMPLEX_SUFFIX}, which redirects git or its configuration to a location this guard cannot verify`;
  let f = !!i?.integer || e.integerNames.has(text) || INTEGER_ATTR_DEFAULT_VARS.has(text);
  if (u?.type === "array") {
    for (let g of u.children) {
      if (!WORD_NODE_TYPES.has(g.type)) {
        if (g.type !== "(" && g.type !== ")") return tooComplexReason(`a ${g.type} in an array`);
        continue;
      }
      let S =
        g.type === "concatenation" && g.children[0]?.text === "["
          ? g.children.findIndex((_) => _.text === "]")
          : 0;
      for (let _ of g.children.slice(1, Math.max(S, 1))) {
        let x = checkArithmeticNode(_, e);
        if (x !== null) return x;
      }
      let p = f ? checkArithmeticWord(g, e) : null,
        m = evaluateWord(g, e, !0);
      if (p !== null || m.kind === "refuse") return p ?? describeWordValue(m);
    }
    return environmentAssignmentReason(text, dynamicValue("an array"), u.text);
  }
  if (u && !WORD_NODE_TYPES.has(u.type)) return tooComplexReason(`a ${u.type} as an assignment value`);
  let h = u && f ? checkArithmeticWord(u, e) : null;
  if (h !== null) return h;
  let b = u ? evaluateWord(u, e, !1) : { kind: "literal", text: "" };
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
function fe() {
  return readFlagWithOverride(TENGU_DRIFTING_LEMUR, { safe: !0 });
}
//@ chunk-63f0f3kd.js:46874-46966 placement
function containsSubstitution(t) {
  return /^(?:command|process)_substitution$/.test(t.type) || t.children.some(containsSubstitution);
}
/**
 * 在文本中查找 shell 自身设置的特殊变量名（仅在相应模式开启时）。
 */
//@ chunk-63f0f3kd.js:46966-47090 placement
function findShellVarName(t) {
  let e = t
    .replace(/\\\n|"/g, "")
    .match(/[A-Za-z_]\w*/g)
    ?.find((i) => LOCALE_PATH_ENV_RE.test(i));
  return e !== void 0 && fe() ? e : void 0;
}
/**
 * 若内建命令可把 shell 自身变量设为整数/浮点类型，返回风险说明。
 */
//@ chunk-63f0f3kd.js:47090-47334 placement
function describeIntegerTyping(t) {
  return Yt(t)
    ? `can make ${t} an integer or float variable ${TOO_COMPLEX_SUFFIX}; ${t} is a variable bash or zsh sets by itself, and with that type the shell can evaluate what it later stores there as arithmetic, so use another variable name`
    : null;
}
/**
 * 判断通过循环或内建命令绑定的变量名是否危险（影响 shell 或程序行为、整数变量、导出后影响后续命令），危险时返回原因。
 */
//@ chunk-63f0f3kd.js:47334-47659 placement
function describeUnsafeBinding(t, e) {
  return isAssignmentNameUnsafeForSandbox(t) ||
    e.integerNames.has(t) ||
    me.test(t) ||
    Ce.test(t) ||
    LOCALE_ENV_RE.test(t.toUpperCase()) ||
    (LOCALE_PATH_ENV_RE.test(t) && fe()) ||
    COMMAND_VALUED_ENV_RE.test(t) ||
    (e.allExported && e.kinds.get(t) === "other")
    ? `binds ${t} through a loop or builtin ${TOO_COMPLEX_SUFFIX}; its value steers the shell or a program (or, exported, every later one) and cannot be screened there`
    : null;
}
//@ chunk-63f0f3kd.js:47659-48864 placement
function environmentAssignmentReason(t, e, i, n = !1, r = !1, s = !1) {
  let upper = t.toUpperCase(),
    o = Xt(e),
    u = ((r && CHARSET_LOCALE_ENV_RE.test(upper)) || (s && upper === "IFS")) && fe();
  if (n && !u && (upper === "IFS" || LOCALE_ENV_RE.test(upper))) return null;
  if (LOCALE_PATH_ENV_RE.test(t) && fe())
    return unverifiableRunReason(
      `${t}=${shortenForReason(i)}`,
      "with locale or character-set tables from a path of its choosing (no value is accepted in a command: drop it)",
    );
  if (Ce.test(t))
    return unverifiableRunReason(
      `${t}=`,
      "which changes what a later command word, tilde directory or child shell option resolves to",
    );
  if ((e.kind === "literal" ? e.text : i.replace(/["'\\]/g, "")).split(/\s+/).some(isStdinLikeDevicePath))
    return unverifiableRunReason(
      `${t}=`,
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
          `${t}=${shortenForReason(i)}`,
          "with a locale whose character set cannot be verified (only C, POSIX or a name of letters and underscores ending in .UTF-8, such as en_US.UTF-8, is accepted: use one of those or remove the assignment)",
        );
  if (upper === "PATH" || upper.startsWith("LD_") || upper.startsWith("DYLD_")) return null;
  if (isExecInfluencingVar(t) || (COMMAND_VALUED_ENV_RE.test(t) && !o))
    return unverifiableRunReason(
      `${t}=`,
      `with a value the shell or another program acts on (${describeWordValue(e)})`,
    );
  return null;
}
//@ chunk-63f0f3kd.js:48864-49768 placement
function analyzeDeclarationCommand(t, e) {
  let i = t.children[0]?.text ?? "declare",
    n = { integer: !1, array: !1, exported: i === "export" },
    r = !1;
  for (let s of t.children.slice(1)) {
    let a = null;
    if (s.type === "word" && DECLARE_FLAGS_RE.test(s.text))
      ((n.integer ||= s.text[0] === "-" && s.text.includes("i")),
        (r ||= s.text[0] === "-" && /[iF]/.test(s.text)),
        (n.array ||= /[aA]/.test(s.text)),
        (n.exported ||= s.text.includes("x")));
    else if (s.type === "variable_name")
      a =
        me.test(s.text) && !e.simple
          ? `exports ${s.text} ${TOO_COMPLEX_SUFFIX}, which redirects git to a location this guard cannot verify`
          : n.exported && e.kinds.get(s.text) === "other"
            ? unverifiableRunReason(
                `${i} ${s.text}`,
                "exporting a value this command computes to every later program",
              )
            : null;
    else if (s.type === "variable_assignment") {
      let o = s.children[0],
        u = (o?.type === "subscript" ? o.children[0] : o)?.text;
      a = (r ? describeIntegerTyping(u ?? "") : null) ?? analyzeVariableAssignment(s, e, n);
    } else if (s.children.length > 0 || WORD_NODE_TYPES.has(s.type))
      a = unverifiableRunReason(
        i,
        `with an operand it would expand or evaluate (${shortenForReason(s.text)})`,
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
  let n = t.children.find((r) => r.type === "test_operator")?.text ?? "";
  if (
    /^-[vRt]$/.test(n) &&
    (t.type === "unary_expression" ||
      (t.type === "binary_expression" &&
        t.children.length > 2 &&
        !i &&
        readFlagWithOverride(TENGU_HOLLOW_SANDPIPER, { safe: !0 })))
  ) {
    let at = t.children.at(-1),
      s =
        /^(?:word|number)$/.test(at?.type ?? "") && /^(?:[A-Za-z_]\w*|\d+)$/.test(at?.text ?? "")
          ? null
          : arithmeticEvalReason(t.text);
    if (s !== null || t.type === "unary_expression") return s;
  }
  if (t.type === "binary_expression" && i && TEST_ARITH_CMP_OPS.has(n))
    return (
      t.children
        .filter((r) => r.type !== "test_operator")
        .map((r) => checkArithmeticWord(r, e))
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
      .filter((r) => r.children.length > 0 || WORD_NODE_TYPES.has(r.type))
      .map((r) => analyzeTestExpression(r, e, i))
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
