/**
 * tools/BashTool/bgWorktreeGuard/statementWalk.ts
 *
 * 2.1.316 新增：后台 worktree 守卫的语句遍历：按语法节点分派（赋值、heredoc、test 表达式等）。
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * new in 2.1.318 (2.1.88 has no file at this path)
 * pieces: chunk-h2y5xkdx.js (20)
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
import { countWhere } from "../../../utils/collections.js";
import {
  isQuotedLiteral,
  analyzeCommand,
  describeGitRunner,
  INTERPRETER_RULES,
  programBaseName,
  describeEnvValue,
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
import { deferInit } from "../../../../runtime/deferred-init.js";

//@ chunk-h2y5xkdx.js:37019-37332 placement
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
//@ chunk-h2y5xkdx.js:37332-39416 placement
/**
 * 判断命令替换体是否只是产出无害值的简单命令（date +格式、wc -l、seq、nproc、id -u、echo 数字、stat -c %Y），用于放行赋值中的命令替换。
 */
function isSafeValueCommand(children, state) {
  let filtered = children.filter((child) => STATEMENT_NODE_TYPES.has(child.type));
  let statement = filtered.length === 1 && !state.pathAssigned ? filtered[0] : null;
  if (statement?.type === "list") {
    let [left, operator, right] = statement.children;
    return (
      operator?.type === "||" &&
      !!left &&
      /^echo -?\d+$/.test(right?.text ?? "") &&
      isSafeValueCommand([left], state)
    );
  }
  if (statement?.type === "pipeline")
    statement = statement.children.findLast((child) => STATEMENT_NODE_TYPES.has(child.type)) ?? null;
  let parseOk = readFlagWithOverride(BOT_PROTECTED_TENGU_HUSHED_HYPHEN, {
    safe: true,
  });
  let redirectedStatement = statement?.type === "redirected_statement" ? statement : null;
  if (
    statement?.type === "redirected_statement" &&
    statement.children.every(
      (child) =>
        child.type !== "heredoc_redirect" &&
        child.type !== "herestring_redirect" &&
        !(parseOk && child.type === "file_redirect" && !SAFE_REDIRECT_RE.test(child.text)),
    )
  )
    statement = statement.children.find((child) => STATEMENT_NODE_TYPES.has(child.type)) ?? null;
  if (statement?.type !== "command" || statement.children[0]?.type !== "command_name") return false;
  let filtered_2 = statement.children.slice(1).filter((child) => WORD_NODE_TYPES.has(child.type));
  let mapped = filtered_2.map((word) => {
    let evaluated = evaluateWord(word, state, true);
    return evaluated.kind === "literal" ? evaluated.text : evaluated.kind === "dynamic" ? null : "";
  });
  switch (statement.children[0].text) {
    case "date": {
      if (
        readFlagWithOverride(TENGU_GILDED_SUNDIAL, {
          safe: true,
        })
      ) {
        if (statement.children.length !== filtered_2.length + 1) return false;
        if (mapped.some((text) => /^\+.*%[-_0-9^#EO]*[Nq]/s.test(text ?? ""))) {
          state.dateDirectiveDenied = true;
          return false;
        }
      }
      return (
        countWhere(mapped, (text) => !!text && text.startsWith("+")) === 1 &&
        !(
          parseOk &&
          mapped.some(
            (text, idx) =>
              LEADING_PLUS_FLAG_RE.test(text ?? "") ||
              (text === null && !isQuotedLiteral(filtered_2[idx])) ||
              (DATE_REFERENCE_FLAGS.test(mapped[idx - 1] ?? "") &&
                (text?.startsWith("+") || DATE_REFERENCE_FLAGS.test(text ?? ""))),
          )
        ) &&
        mapped.every(
          (text, idx) =>
            DATE_REFERENCE_FLAGS.test(mapped[idx - 1] ?? "") ||
            (text !== null &&
              /^(?:-u|--utc|-d|--date|-r|--reference|\+(?:%[sYmdHMSjuUwWVCgGeNq]|[-:/. 0-9])*)$/.test(text)),
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
        (redirectedStatement?.children ?? [])
          .filter((child) => REDIRECT_NODE_TYPES.has(child.type))
          .every((redirect) => /^2>\s*\/dev\/null$/.test(redirect.text))
      )
        return true;
      if (
        mapped.some((text) => text === null || /^~(?!\/)/.test(text)) &&
        readFlagWithOverride(TENGU_FERROUS_ALMANAC, {
          safe: true,
        })
      ) {
        state.statPathDenied ||= mapped.some((text) => /^(?:-c|--format)/.test(text ?? ""));
        return false;
      }
      let isNonFormat = (text) => text === null || !/^(?:-c|--format|%[YXZWsbB])$/.test(text);
      let index = mapped.findIndex(isNonFormat);
      return (
        mapped.length === 3 &&
        countWhere(mapped, isNonFormat) === 1 &&
        (mapped[index] === null ? filtered_2[index].type === "string" : /^[^-%]/.test(mapped[index])) &&
        mapped.some((text) => /^%[YXZWsbB]$/.test(text ?? "")) &&
        mapped.some((text) => /^(?:-c|--format)$/.test(text ?? ""))
      );
    }
    default:
      return false;
  }
}
//@ chunk-h2y5xkdx.js:39416-39474 placement
function allMatch(values, pattern) {
  return values.every((value) => value !== null && pattern.test(value));
}
//@ chunk-h2y5xkdx.js:39474-39597 placement
var CONTAINER_NODE_TYPES; // deferred: uses wordSet (./shellState.js) of its import cycle while loading; runs once the cycle is complete
deferInit("chunk-h2y5xkdx.js:39474", () => {
  CONTAINER_NODE_TYPES = wordSet(`program compound_statement subshell do_group
  command_substitution process_substitution else_clause case_item`);
});
//@ chunk-h2y5xkdx.js:39597-39854 placement
function withStdinState(node, state, stdinFed, pipedFrom) {
  let saved = {
    stdinFed: state.stdinFed,
    pipedFrom: state.pipedFrom,
  };
  state.stdinFed = stdinFed;
  state.pipedFrom = pipedFrom;
  let opensScope = node.type !== "program" && node.type !== "list";
  if (opensScope) state.scopes.push(new Map());
  let reason = analyzeStatement(node, state);
  if (opensScope) state.scopes.pop();
  state.stdinFed = saved.stdinFed;
  state.pipedFrom = saved.pipedFrom;
  return reason;
}
//@ chunk-h2y5xkdx.js:39854-43156 placement
/**
 * 按语法节点类型分派分析：注释、赋值、声明、命令、管道、列表、重定向、子 shell、函数定义等。
 */
function analyzeStatement(node, state) {
  let { stdinFed } = state;
  switch (node.type) {
    case "comment":
      return null;
    case "variable_assignment":
      return analyzeVariableAssignment(node, state, undefined);
    case "declaration_command":
      return analyzeDeclarationCommand(node, state);
    case "command": {
      let inputAssembled = state.inputAssembled;
      state.inputAssembled ||= node.children.some(
        (child) => REDIRECT_NODE_TYPES.has(child.type) && analyzeFileRedirect(child, state),
      );
      let reason = analyzeCommand(node, state, []);
      state.inputAssembled = inputAssembled;
      return reason;
    }
    case "unset_command":
      return node.children
        .slice(1)
        .every(
          (child) =>
            child.type === "variable_name" ||
            (child.type === "word" && /^(?:-[fvn]|[A-Za-z_][A-Za-z0-9_]*)$/.test(child.text)),
        )
        ? null
        : unverifiableRunReason("unset", "with an operand that is not a plain name");
    case "test_command":
      return analyzeTestExpression(node, state, node.children[0]?.type === "[[");
    case "compound_statement":
      if (node.children[0]?.type === "((") return checkArithmeticNode(node, state);
      break;
    case "c_style_for_statement":
      for (let child of node.children) {
        let reason =
          child.type === "do_group"
            ? withStdinState(child, state, stdinFed)
            : child.children.length > 0 || /^(?:word|number|variable_name)$/.test(child.type)
              ? checkArithmeticNode(child, state)
              : null;
        if (reason !== null)
          return child.type === "compound_statement" && isShellSpecialVariableTypingEnabled()
            ? tooComplexReason("a { \u2026 } body after for ((\u2026)) (write it as do \u2026; done)")
            : reason;
      }
      return null;
    case "pipeline": {
      let previousStatement;
      let inputAssembled = state.inputAssembled;
      for (let child of node.children) {
        state.inputAssembled ||= !!previousStatement;
        let reason = STATEMENT_NODE_TYPES.has(child.type)
          ? withStdinState(child, state, stdinFed || !!previousStatement, previousStatement)
          : /^\|&?$/.test(child.type)
            ? null
            : tooComplexReason(`a ${child.type} in a pipeline`);
        if (reason !== null) return reason;
        previousStatement = STATEMENT_NODE_TYPES.has(child.type) ? child : previousStatement;
      }
      state.inputAssembled = inputAssembled;
      return null;
    }
    case "redirected_statement": {
      let redirects = node.children.filter((child) => REDIRECT_NODE_TYPES.has(child.type));
      let commandNode = node.children.find((child) => STATEMENT_NODE_TYPES.has(child.type));
      let heredocBodies = [];
      for (let child of node.children) {
        let reason = REDIRECT_NODE_TYPES.has(child.type)
          ? analyzeHeredocRedirect(child, state, heredocBodies)
          : child !== commandNode && child.children.length > 0
            ? tooComplexReason(`a ${child.type} after a redirect`)
            : null;
        if (reason !== null) return reason;
      }
      let feedsStdin = stdinFed || redirects.some(isStdinRedirect);
      let inputAssembled = state.inputAssembled;
      state.inputAssembled ||= [
        ...redirects,
        ...(commandNode?.type === "command"
          ? commandNode.children.filter((child) => REDIRECT_NODE_TYPES.has(child.type))
          : []),
      ].some((redirect) => analyzeFileRedirect(redirect, state));
      let reason = !commandNode
        ? redirects.some((redirect) => analyzeRedirect(redirect, state))
          ? tooComplexReason("a here-string after a compound command")
          : null
        : commandNode.type === "command"
          ? analyzeCommand(commandNode, state, redirects)
          : withStdinState(commandNode, state, feedsStdin);
      state.inputAssembled ||= heredocBodies.length > 0;
      let result =
        reason ??
        heredocBodies.map((body) => withStdinState(body, state, true)).find((reason) => reason !== null);
      state.inputAssembled = inputAssembled;
      return result ?? null;
    }
    case "function_definition": {
      let found = node.children.find((child) => child.type === "word");
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
      let found_2 = node.children.find((child) => child !== found && STATEMENT_NODE_TYPES.has(child.type));
      return found_2 ? withStdinState(found_2, state, false) : null;
    }
    default:
      if (!STATEMENT_NODE_TYPES.has(node.type) && !/^(?:command|process)_substitution$/.test(node.type))
        return tooComplexReason(`a ${node.type} statement`);
  }
  for (let [idx, child] of node.children.entries()) {
    let reason = null;
    if (STATEMENT_NODE_TYPES.has(child.type)) {
      reason = withStdinState(child, state, stdinFed);
      let innerNode =
        child.type === "declaration_command" && child.children.length === 2 ? child.children[1] : child;
      let [nameNode, equalsNode, valueNode] = innerNode.children;
      let value =
        innerNode.type === "variable_assignment" &&
        nameNode?.type === "variable_name" &&
        equalsNode?.type === "=" &&
        valueNode &&
        isStaticNode(valueNode) &&
        (CONTAINER_NODE_TYPES.has(node.type) || (node.type === "list" && idx === 0)) &&
        node.children[idx + 1]?.type !== "&" &&
        state.bindingSites.get(nameNode.text) === 1 &&
        !state.integerNames.has(nameNode.text) &&
        !state.arrayNames.has(nameNode.text) &&
        !INTEGER_ATTR_DEFAULT_VARS.has(nameNode.text) &&
        !SHELL_SPECIAL_VARIABLES.test(nameNode.text) &&
        !BASH_IMPLICITLY_REBOUND_VARS.has(nameNode.text) &&
        !PATH_LIKE_VARIABLES_RE.test(nameNode.text)
          ? evaluateWord(valueNode, state, false)
          : null;
      if (value?.kind === "literal") state.scopes.at(-1).set(nameNode.text, value.text);
    } else if (WORD_NODE_TYPES.has(child.type)) {
      let nextNode = node.children[idx + 1];
      let evaluated = evaluateWord(child, state, node.type === "for_statement");
      reason =
        nextNode?.startIndex === child.endIndex && isDollarQuoteEdge(child, nextNode)
          ? tooComplexReason(`the pattern ${shortenForReason(child.text + nextNode.text)}`)
          : evaluated.kind === "refuse"
            ? evaluated.detail
            : null;
    } else if (child.type === "variable_name") reason = describeUnsafeBinding(child.text, state);
    else if (child.children.length > 0 || child.type === "ERROR")
      reason = tooComplexReason(
        child.type === "ERROR" ? "syntax the parser could not recover" : `a ${child.type} here`,
      );
    if (reason !== null) return reason;
  }
  return null;
}
//@ chunk-h2y5xkdx.js:43156-43762 placement
function analyzeFileRedirect(node, state) {
  if (node.type === "file_redirect") {
    let found = node.children.find((child) => WORD_NODE_TYPES.has(child.type));
    let text = /^\d*<(?!>)/.test(node.text) ? found?.text : undefined;
    let [, , bracedVarName, plainVarName] = SINGLE_VAR_REF_RE.exec(found?.text ?? "") ?? [];
    let varName = bracedVarName ?? plainVarName ?? "";
    let targetValue = found && !isStaticNode(found) ? evaluateWord(found, state, true) : null;
    let isUnsafeTarget =
      !!targetValue &&
      (targetValue.kind !== "dynamic" || !targetValue.inert) &&
      !(state.pathNames.has(varName) && state.bindingSites.get(varName) === 1);
    return (
      /[<>]\(|<&|&</.test(node.text) ||
      (text !== undefined && (isUnsafeTarget || isDevicePath(text.replace(/["'\\]/g, ""))))
    );
  }
  let wordParent =
    node.type === "heredoc_redirect" ? node.children.find((child) => child.type === "heredoc_body") : node;
  return (
    (!isStdinRedirect(node) && analyzeRedirect(node, state)) ||
    (wordParent?.children ?? [])
      .filter((wordNode) => WORD_NODE_TYPES.has(wordNode.type))
      .some((wordNode) => {
        let wordValue = evaluateWord(wordNode, state, false);
        return wordValue.kind !== "literal" && (wordValue.kind !== "dynamic" || !wordValue.inert);
      })
  );
}
//@ chunk-h2y5xkdx.js:43762-43994 placement
function isStdinRedirect(redirect) {
  let found = redirect.children.find((child) => child.type === "file_descriptor");
  return (
    (!found ||
      found.text === "0" ||
      (/^0+$/.test(found.text) &&
        readFlagWithOverride(BOT_PROTECTED_TENGU_HUSHED_HYPHEN, {
          safe: true,
        }))) &&
    (redirect.type !== "file_redirect" ||
      redirect.children.some((child) => child.children.length === 0 && /^<(?!\()/.test(child.type)))
  );
}
//@ chunk-h2y5xkdx.js:43994-45271 placement
function analyzeHeredocRedirect(child, state, pendingStatements) {
  if (child.type !== "heredoc_redirect") {
    for (let child_2 of child.children) {
      let wordValue = WORD_NODE_TYPES.has(child_2.type)
        ? evaluateWord(child_2, state, child.type === "file_redirect")
        : null;
      if (wordValue?.kind === "refuse") return wordValue.detail;
    }
    return null;
  }
  let found = child.children.find((child) => child.type === "heredoc_start");
  let found_2 = child.children.find((child) => child.type === "heredoc_end");
  let match = QUOTED_NAME_RE.exec(found?.text ?? "");
  if (!match || found_2?.text.trim() !== match[2])
    return tooComplexReason("a here-document whose delimiter it cannot match the way bash does");
  for (let child_2 of child.children) {
    let refusalReason = null;
    if (child_2.type === "heredoc_body") {
      let firstBodyChild = child_2.children[0];
      let joined = [
        firstBodyChild
          ? Buffer.from(child_2.text, "utf8")
              .subarray(0, firstBodyChild.startIndex - child_2.startIndex)
              .toString("utf8")
          : child_2.text,
        ...child_2.children.filter((child) => child.type === "heredoc_content").map((child) => child.text),
      ].join("\x00");
      refusalReason =
        match[1] === "" &&
        (child_2.text.replace(/\\[\\$`]/g, "").includes("`") ||
          /\$(?![ \t\r\n"').,/|]|$)/.test(joined.replace(/\\[\\$`]/g, "")))
          ? tooComplexReason("a here-document body it did not tokenize")
          : match[1] === "" &&
              (child_2.text
                .split("$")
                .slice(1)
                .some((dollarSegment) => DOLLAR_QUOTE_EDGE_RE.test(dollarSegment)) ||
                child_2.children.some((child, bodyChildIndex) => {
                  let nextBodyChild = child_2.children[bodyChildIndex + 1];
                  return (
                    nextBodyChild?.startIndex === child.endIndex &&
                    isRiskyExpansionOperand(child, nextBodyChild.text)
                  );
                }))
            ? tooComplexReason("a here-document body zsh expands differently")
            : withStdinState(child_2, state, false);
    } else if (child_2.type === "pipeline")
      pendingStatements.push(...child_2.children.filter((child) => STATEMENT_NODE_TYPES.has(child.type)));
    else if (REDIRECT_NODE_TYPES.has(child_2.type))
      refusalReason = analyzeHeredocRedirect(child_2, state, pendingStatements);
    else if (child_2.children.length > 0)
      refusalReason = tooComplexReason(`a ${child_2.type} after a here-document`);
    if (refusalReason !== null) return refusalReason;
  }
  return null;
}
//@ chunk-h2y5xkdx.js:45271-45622 placement
function analyzeRedirect(redirect, state) {
  if (redirect.type === "file_redirect") return analyzeFileRedirect(redirect, state);
  let found = redirect.children.find((child) => child.type === "heredoc_body");
  let found_2 = redirect.children.find((child) => WORD_NODE_TYPES.has(child.type));
  let wordValue =
    redirect.type === "herestring_redirect" && found_2
      ? evaluateWord(found_2, state, false)
      : redirect.type === "heredoc_redirect" && found?.children.length === 0
        ? {
            kind: "literal",
            text: found.text,
          }
        : null;
  return !(wordValue?.kind === "literal"
    ? isPlainWordText(wordValue.text)
    : wordValue?.kind === "dynamic" && wordValue.inert);
}
//@ chunk-h2y5xkdx.js:45622-47258 placement
function analyzeVariableAssignment(
  assignmentNode,
  state,
  integerAttr,
  allExported = false,
  isStringExec = false,
  precedesCommandName = false,
) {
  let [nameNode, operatorNode, valueNode] = assignmentNode.children;
  let plainNameNode = nameNode?.type === "subscript" ? nameNode.children[0] : nameNode;
  if (
    !plainNameNode ||
    !operatorNode ||
    !SHELL_NAME_PATTERN.test(plainNameNode.text) ||
    !/^(?:variable_name|subscript)$/.test(nameNode.type)
  )
    return tooComplexReason("an assignment whose name is not a plain word");
  let text = plainNameNode.text;
  let subscriptReason = nameNode.type === "subscript" ? checkSubscript(nameNode, state) : null;
  if (subscriptReason !== null) return subscriptReason;
  if (GIT_LOCATION_ENV_RE.test(text) && !state.simple)
    return `assigns ${text} ${TOO_COMPLEX_SUFFIX}, which redirects git or its configuration to a location this guard cannot verify`;
  let isIntegerVar =
    !!integerAttr?.integer || state.integerNames.has(text) || INTEGER_ATTR_DEFAULT_VARS.has(text);
  if (valueNode?.type === "array") {
    for (let child of valueNode.children) {
      if (!WORD_NODE_TYPES.has(child.type)) {
        if (child.type !== "(" && child.type !== ")") return tooComplexReason(`a ${child.type} in an array`);
        continue;
      }
      let indexEnd =
        child.type === "concatenation" && child.children[0]?.text === "["
          ? child.children.findIndex((child) => child.text === "]")
          : 0;
      for (let child_2 of child.children.slice(1, Math.max(indexEnd, 1))) {
        let arithmeticReason = checkArithmeticNode(child_2, state);
        if (arithmeticReason !== null) return arithmeticReason;
      }
      let arithmeticReason = isIntegerVar ? checkArithmeticWord(child, state) : null;
      let elementValue = evaluateWord(child, state, true);
      if (arithmeticReason !== null || elementValue.kind === "refuse")
        return arithmeticReason ?? describeWordValue(elementValue);
    }
    return environmentAssignmentReason(text, dynamicValue("an array"), valueNode.text);
  }
  if (valueNode && !WORD_NODE_TYPES.has(valueNode.type))
    return tooComplexReason(`a ${valueNode.type} as an assignment value`);
  let arithmeticReason = valueNode && isIntegerVar ? checkArithmeticWord(valueNode, state) : null;
  if (arithmeticReason !== null) return arithmeticReason;
  let valueResult = valueNode
    ? evaluateWord(valueNode, state, false)
    : {
        kind: "literal",
        text: "",
      };
  if (valueResult.kind === "refuse") return valueResult.detail;
  if (
    integerAttr &&
    (integerAttr.array || state.arrayNames.has(text)) &&
    (valueResult.kind !== "literal" || valueResult.text.trimStart().startsWith("("))
  )
    return unverifiableRunReason(
      `declare ${text}=`,
      "with a string it would re-parse as an array assignment",
    );
  if (
    (integerAttr?.exported || (state.allExported && !allExported)) &&
    (valueResult.kind === "dynamic"
      ? !valueResult.inert
      : valueResult.text
          .split(/\s+/)
          .some((wordPart) => GIT_COMMAND_PATTERN.test(programBaseName(wordPart)))) &&
    !/^(?:PATH|(?:DY)?LD_\w+)$/.test(text)
  )
    return unverifiableRunReason(
      `export ${text}=`,
      `with a value every later program inherits (${valueResult.kind === "dynamic" ? valueResult.why : "a git command"})`,
    );
  return (
    environmentAssignmentReason(
      text,
      valueResult,
      valueNode?.text ?? "",
      allExported,
      isStringExec,
      precedesCommandName,
    ) ??
    describeEnvValue(text, valueResult, state, operatorNode.text === "+=" || nameNode.type === "subscript")
  );
}
//@ chunk-h2y5xkdx.js:47258-47288 placement
var TENGU_DRIFTING_LEMUR = "tengu_drifting_lemur";
//@ chunk-h2y5xkdx.js:47288-47326 placement
/**
 * 读取 tengu_drifting_lemur 开关：LOCALE 类变量若来自路径，视为危险。
 */
function shouldTreatLocalePathAsHazard() {
  return readFlagWithOverride(TENGU_DRIFTING_LEMUR, {
    safe: true,
  });
}
//@ chunk-h2y5xkdx.js:47326-47418 placement
function containsSubstitution(child) {
  return /^(?:command|process)_substitution$/.test(child.type) || child.children.some(containsSubstitution);
}
//@ chunk-h2y5xkdx.js:47418-47542 placement
/**
 * 在文本中查找 shell 自身设置的特殊变量名（仅在相应模式开启时）。
 */
function findShellVarName(text) {
  let found = text
    .replace(/\\\n|"/g, "")
    .match(/[A-Za-z_]\w*/g)
    ?.find((wordPart) => LOCALE_PATH_ENV_RE.test(wordPart));
  return found !== undefined && shouldTreatLocalePathAsHazard() ? found : undefined;
}
//@ chunk-h2y5xkdx.js:47542-47786 placement
/**
 * 若内建命令可把 shell 自身变量设为整数/浮点类型，返回风险说明。
 */
function describeIntegerTyping(varName) {
  return isSpecialVariableTypingRisk(varName)
    ? `can make ${varName} an integer or float variable ${TOO_COMPLEX_SUFFIX}; ${varName} is a variable bash or zsh sets by itself, and with that type the shell can evaluate what it later stores there as arithmetic, so use another variable name`
    : null;
}
//@ chunk-h2y5xkdx.js:47786-48111 placement
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
//@ chunk-h2y5xkdx.js:48111-49316 placement
function environmentAssignmentReason(
  variableName,
  value,
  rawValue,
  allowShellStateVars = false,
  isCommandValue = false,
  isDeclaration = false,
) {
  let upper = variableName.toUpperCase();
  let isPlainValue = isPlainOrInertValue(value);
  let isLocalePathHazard =
    ((isCommandValue && CHARSET_LOCALE_ENV_RE.test(upper)) || (isDeclaration && upper === "IFS")) &&
    shouldTreatLocalePathAsHazard();
  if (allowShellStateVars && !isLocalePathHazard && (upper === "IFS" || LOCALE_ENV_RE.test(upper)))
    return null;
  if (LOCALE_PATH_ENV_RE.test(variableName) && shouldTreatLocalePathAsHazard())
    return unverifiableRunReason(
      `${variableName}=${shortenForReason(rawValue)}`,
      "with locale or character-set tables from a path of its choosing (no value is accepted in a command: drop it)",
    );
  if (SHELL_STATE_SETTING_VARIABLES.test(variableName))
    return unverifiableRunReason(
      `${variableName}=`,
      "which changes what a later command word, tilde directory or child shell option resolves to",
    );
  if (
    (value.kind === "literal" ? value.text : rawValue.replace(/["'\\]/g, ""))
      .split(/\s+/)
      .some(isStdinLikeDevicePath)
  )
    return unverifiableRunReason(
      `${variableName}=`,
      "with a descriptor path whose content a program may read as its program or configuration",
    );
  if (upper === "IFS")
    return EMPTY_VALUE_RE.test(rawValue)
      ? null
      : unverifiableRunReason("IFS=", "with a separator other than whitespace");
  if (LOCALE_ENV_RE.test(upper))
    return value.kind === "literal" && /^(?:C|POSIX|[A-Za-z_]*\.UTF-?8)?$/i.test(value.text)
      ? null
      : unverifiableRunReason(
          `${variableName}=${shortenForReason(rawValue)}`,
          "with a locale whose character set cannot be verified (only C, POSIX or a name of letters and underscores ending in .UTF-8, such as en_US.UTF-8, is accepted: use one of those or remove the assignment)",
        );
  if (upper === "PATH" || upper.startsWith("LD_") || upper.startsWith("DYLD_")) return null;
  if (isExecInfluencingVar(variableName) || (COMMAND_VALUED_ENV_RE.test(variableName) && !isPlainValue))
    return unverifiableRunReason(
      `${variableName}=`,
      `with a value the shell or another program acts on (${describeWordValue(value)})`,
    );
  return null;
}
//@ chunk-h2y5xkdx.js:49316-50220 placement
function analyzeDeclarationCommand(node, state) {
  let text = node.children[0]?.text ?? "declare";
  let flags = {
    integer: false,
    array: false,
    exported: text === "export",
  };
  let hasIntegerOrFormat = false;
  for (let child of node.children.slice(1)) {
    let reason = null;
    if (child.type === "word" && DECLARE_FLAGS_RE.test(child.text)) {
      flags.integer ||= child.text[0] === "-" && child.text.includes("i");
      hasIntegerOrFormat ||= child.text[0] === "-" && /[iF]/.test(child.text);
      flags.array ||= /[aA]/.test(child.text);
      flags.exported ||= child.text.includes("x");
    } else if (child.type === "variable_name")
      reason =
        GIT_LOCATION_ENV_RE.test(child.text) && !state.simple
          ? `exports ${child.text} ${TOO_COMPLEX_SUFFIX}, which redirects git to a location this guard cannot verify`
          : flags.exported && state.kinds.get(child.text) === "other"
            ? unverifiableRunReason(
                `${text} ${child.text}`,
                "exporting a value this command computes to every later program",
              )
            : null;
    else if (child.type === "variable_assignment") {
      let nameNode = child.children[0];
      let text = (nameNode?.type === "subscript" ? nameNode.children[0] : nameNode)?.text;
      reason =
        (hasIntegerOrFormat ? describeIntegerTyping(text ?? "") : null) ??
        analyzeVariableAssignment(child, state, flags);
    } else if (child.children.length > 0 || WORD_NODE_TYPES.has(child.type))
      reason = unverifiableRunReason(
        text,
        `with an operand it would expand or evaluate (${shortenForReason(child.text)})`,
      );
    if (reason !== null) return reason;
  }
  return null;
}
//@ chunk-h2y5xkdx.js:50220-51169 placement
function analyzeTestExpression(node, state, isDoubleBracket) {
  if (WORD_NODE_TYPES.has(node.type)) {
    let evaluated = evaluateWord(node, state, !isDoubleBracket);
    return evaluated.kind === "refuse" ? evaluated.detail : null;
  }
  let text = node.children.find((child) => child.type === "test_operator")?.text ?? "";
  if (
    /^-[vRt]$/.test(text) &&
    (node.type === "unary_expression" ||
      (node.type === "binary_expression" &&
        node.children.length > 2 &&
        !isDoubleBracket &&
        readFlagWithOverride(TENGU_HOLLOW_SANDPIPER, {
          safe: true,
        })))
  ) {
    let last = node.children.at(-1);
    let reason =
      /^(?:word|number)$/.test(last?.type ?? "") && /^(?:[A-Za-z_]\w*|\d+)$/.test(last?.text ?? "")
        ? null
        : arithmeticEvalReason(node.text);
    if (reason !== null || node.type === "unary_expression") return reason;
  }
  if (node.type === "binary_expression" && isDoubleBracket && TEST_ARITH_CMP_OPS.has(text))
    return (
      node.children
        .filter((child) => child.type !== "test_operator")
        .map((child) => checkArithmeticWord(child, state))
        .find((reason) => reason !== null) ?? null
    );
  if (!/expression|test_command/.test(node.type)) return tooComplexReason(`a ${node.type} in a test`);
  for (let [idx, child] of node.children.entries()) {
    let nextChild = node.children[idx + 1];
    if (
      nextChild?.startIndex === child.endIndex &&
      (isRiskyExpansionOperand(child, nextChild.text) || isDollarQuoteEdge(child, nextChild))
    )
      return tooComplexReason(`the pattern ${shortenForReason(child.text + nextChild.text)}`);
  }
  return (
    node.children
      .filter((child) => child.children.length > 0 || WORD_NODE_TYPES.has(child.type))
      .map((child) => analyzeTestExpression(child, state, isDoubleBracket))
      .find((reason) => reason !== null) ?? null
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
