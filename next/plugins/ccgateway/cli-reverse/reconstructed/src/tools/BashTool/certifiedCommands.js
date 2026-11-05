/**
 * tools/BashTool/certifiedCommands.ts
 *
 * 2.1.316 新增：经认证的只读命令表
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * new in 2.1.318 (2.1.88 has no file at this path)
 * pieces: chunk-5xgkngpb.js (14)
 * attribution: placement 13, layout 1
 */
import { parseRuleString } from "../../utils/permissions/permissionRuleParser.js";
import { BASH_TOOL_NAME } from "./toolName.js";
import { containsRuntimePlaceholder } from "../../utils/bash/ast.js";
import { deferInit } from "../../../runtime/deferred-init.js";

//@ chunk-5xgkngpb.js:1031831-1031853 placement
/**
 * 认证只读命令的规则名前缀。
 */
var CERTIFIED_PREFIX = "certified: ";
//@ chunk-5xgkngpb.js:1031853-1031894 placement
/**
 * 判断规则内容是否带 “certified: ” 前缀。
 */
function hasCertifiedPrefix(ruleContent) {
  return ruleContent.startsWith(CERTIFIED_PREFIX);
}
//@ chunk-5xgkngpb.js:1031894-1031989 placement
/**
 * 解析权限规则字符串，判断它是否是 Bash 工具的认证命令规则。
 */
function isCertifiedCommandRule(ruleString) {
  let rule = parseRuleString(ruleString);
  return (
    rule.toolName === BASH_TOOL_NAME && rule.ruleContent !== undefined && hasCertifiedPrefix(rule.ruleContent)
  );
}
//@ chunk-5xgkngpb.js:1031989-1032382 placement
/**
 * 认证只读命令的规则名常量（git status/add/commit/checkout -b/log/diff/branch --show-current、gh pr create/edit/view、git push）与远程名正则。
 */
var CERTIFIED_GIT_STATUS = "certified: git status";
var CERTIFIED_GIT_ADD = "certified: git add";
var CERTIFIED_GIT_COMMIT = "certified: git commit";
var CERTIFIED_GIT_CHECKOUT_B = "certified: git checkout -b";
var CERTIFIED_GIT_LOG = "certified: git log";
var CERTIFIED_GIT_DIFF = "certified: git diff";
var CERTIFIED_GIT_BRANCH_SHOW_CURRENT = "certified: git branch --show-current";
var CERTIFIED_GH_PR_CREATE = "certified: gh pr create";
var CERTIFIED_GH_PR_EDIT = "certified: gh pr edit";
var CERTIFIED_GH_PR_VIEW = "certified: gh pr view";
var CERTIFIED_GIT_PUSH_PREFIX = "certified: git push ";
var CERTIFIED_GIT_PUSH_ORIGIN = "certified: git push origin";
var REMOTE_NAME_RE = /^[A-Za-z0-9][A-Za-z0-9._-]*$/;
//@ chunk-5xgkngpb.js:1032382-1032439 placement
/**
 * 远程名合法时，返回该远程的认证 git push 规则。
 */
function buildCertifiedPushRule(remoteName) {
  if (!REMOTE_NAME_RE.test(remoteName)) return null;
  return CERTIFIED_GIT_PUSH_PREFIX + remoteName;
}
//@ chunk-5xgkngpb.js:1032439-1032580 placement
function isSafeRefName(refName) {
  if (!/^[A-Za-z0-9][A-Za-z0-9._/-]*$/.test(refName)) return false;
  if (refName.includes("..") || refName.includes("@{") || refName.endsWith("/")) return false;
  return true;
}
//@ chunk-5xgkngpb.js:1032580-1032758 placement
function isSafeRevisionRange(range) {
  let index = range.indexOf("...");
  if (index !== -1) return isSafeRefName(range.slice(0, index)) && isSafeRefName(range.slice(index + 3));
  let index_2 = range.indexOf("..");
  if (index_2 !== -1)
    return isSafeRefName(range.slice(0, index_2)) && isSafeRefName(range.slice(index_2 + 2));
  return isSafeRefName(range);
}
//@ chunk-5xgkngpb.js:1032758-1032923 placement
function isSafePathspec(pathspec) {
  if (pathspec === "") return false;
  for (let segment of pathspec.split("/")) {
    if (segment === "" || segment === "." || segment === "..") return false;
    if (!/^[A-Za-z0-9_.][A-Za-z0-9._@+-]*$/.test(segment)) return false;
  }
  return true;
}
//@ chunk-5xgkngpb.js:1032923-1034537 placement
/**
 * 认证命令规格表：每条规则的命令头、子命令、允许的长/短选项（布尔或取值）、必需选项、操作数形态。
 */
var EMPTY_OPTIONS; // deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
var optionMap;
var BOOLEAN_OPTION;
var OPAQUE_VALUE_OPTION;
var REF_VALUE_OPTION;
var CERTIFIED_COMMAND_SPECS;
deferInit("chunk-5xgkngpb.js:1032923", () => {
  EMPTY_OPTIONS = new Map();
  optionMap = (entries) => new Map(entries);
  BOOLEAN_OPTION = {
    arity: "boolean",
  };
  OPAQUE_VALUE_OPTION = {
    arity: "value",
    valueShape: "opaque",
  };
  REF_VALUE_OPTION = {
    arity: "value",
    valueShape: "ref",
  };
  CERTIFIED_COMMAND_SPECS = new Map([
    [
      CERTIFIED_GIT_STATUS,
      {
        head: "git",
        subcommand: ["status"],
        longOptions: optionMap([
          ["--porcelain", BOOLEAN_OPTION],
          ["--short", BOOLEAN_OPTION],
        ]),
        shortOptions: optionMap([
          ["s", BOOLEAN_OPTION],
          ["b", BOOLEAN_OPTION],
        ]),
        operands: {
          kind: "none",
        },
      },
    ],
    [
      CERTIFIED_GIT_ADD,
      {
        head: "git",
        subcommand: ["add"],
        longOptions: EMPTY_OPTIONS,
        shortOptions: EMPTY_OPTIONS,
        operands: {
          kind: "pathspecs",
          min: 1,
        },
      },
    ],
    [
      CERTIFIED_GIT_COMMIT,
      {
        head: "git",
        subcommand: ["commit"],
        longOptions: EMPTY_OPTIONS,
        shortOptions: optionMap([["m", OPAQUE_VALUE_OPTION]]),
        requiredOptions: ["-m"],
        operands: {
          kind: "pathspecs",
          min: 0,
        },
      },
    ],
    [
      CERTIFIED_GIT_CHECKOUT_B,
      {
        head: "git",
        subcommand: ["checkout"],
        longOptions: EMPTY_OPTIONS,
        shortOptions: optionMap([["b", REF_VALUE_OPTION]]),
        requiredOptions: ["-b"],
        operands: {
          kind: "none",
        },
      },
    ],
    [
      CERTIFIED_GIT_LOG,
      {
        head: "git",
        subcommand: ["log"],
        longOptions: optionMap([
          ["--oneline", BOOLEAN_OPTION],
          ["--stat", BOOLEAN_OPTION],
          ["--name-only", BOOLEAN_OPTION],
        ]),
        shortOptions: EMPTY_OPTIONS,
        allowNumericCountShort: true,
        operands: {
          kind: "revisionsAndPathspecs",
        },
      },
    ],
    [
      CERTIFIED_GIT_DIFF,
      {
        head: "git",
        subcommand: ["diff"],
        longOptions: optionMap([
          ["--stat", BOOLEAN_OPTION],
          ["--cached", BOOLEAN_OPTION],
          ["--name-only", BOOLEAN_OPTION],
        ]),
        shortOptions: EMPTY_OPTIONS,
        operands: {
          kind: "revisionsAndPathspecs",
        },
      },
    ],
    [
      CERTIFIED_GIT_BRANCH_SHOW_CURRENT,
      {
        head: "git",
        subcommand: ["branch"],
        longOptions: optionMap([["--show-current", BOOLEAN_OPTION]]),
        shortOptions: EMPTY_OPTIONS,
        requiredOptions: ["--show-current"],
        operands: {
          kind: "none",
        },
      },
    ],
    [
      CERTIFIED_GH_PR_CREATE,
      {
        head: "gh",
        subcommand: ["pr", "create"],
        longOptions: optionMap([
          ["--title", OPAQUE_VALUE_OPTION],
          ["--body", OPAQUE_VALUE_OPTION],
          ["--draft", BOOLEAN_OPTION],
          ["--reviewer", OPAQUE_VALUE_OPTION],
        ]),
        shortOptions: EMPTY_OPTIONS,
        operands: {
          kind: "none",
        },
      },
    ],
    [
      CERTIFIED_GH_PR_EDIT,
      {
        head: "gh",
        subcommand: ["pr", "edit"],
        longOptions: optionMap([
          ["--title", OPAQUE_VALUE_OPTION],
          ["--body", OPAQUE_VALUE_OPTION],
          ["--add-reviewer", OPAQUE_VALUE_OPTION],
        ]),
        shortOptions: EMPTY_OPTIONS,
        operands: {
          kind: "none",
        },
      },
    ],
    [
      CERTIFIED_GH_PR_VIEW,
      {
        head: "gh",
        subcommand: ["pr", "view"],
        longOptions: optionMap([["--json", OPAQUE_VALUE_OPTION]]),
        shortOptions: EMPTY_OPTIONS,
        operands: {
          kind: "prNumber",
        },
      },
    ],
  ]);
});
//@ chunk-5xgkngpb.js:1034537-1034836 placement
function getCertifiedSpec(ruleName) {
  let spec = CERTIFIED_COMMAND_SPECS.get(ruleName);
  if (spec !== undefined) return spec;
  if (ruleName.startsWith(CERTIFIED_GIT_PUSH_PREFIX)) {
    let sliced = ruleName.slice(CERTIFIED_GIT_PUSH_PREFIX.length);
    if (!REMOTE_NAME_RE.test(sliced)) return null;
    return {
      head: "git",
      subcommand: ["push"],
      longOptions: optionMap([["--set-upstream", BOOLEAN_OPTION]]),
      shortOptions: optionMap([["u", BOOLEAN_OPTION]]),
      operands: {
        kind: "pushRemoteAndRefspec",
        remote: sliced,
      },
    };
  }
  return null;
}
//@ chunk-5xgkngpb.js:1034836-1034949 layout
/**
 * 重定向是否为字面量 >/dev/null 或 2>/dev/null。
 */
function isDevNullStdoutRedirect(redirect) {
  return (
    redirect.op === ">" &&
    (redirect.fd === undefined || redirect.fd === 2) &&
    redirect.target === "/dev/null" &&
    redirect.targetSourceLiteral === true
  );
}
//@ chunk-5xgkngpb.js:1034949-1035073 placement
function isValidOptionValue(optionSpec, optionValue) {
  if (optionSpec.arity !== "value") return false;
  if (optionValue.startsWith("-")) return false;
  if (optionSpec.valueShape === "ref") return isSafeRefName(optionValue);
  return true;
}
//@ chunk-5xgkngpb.js:1035073-1035451 placement
/**
 * 检查命令操作数是否符合认证命令的约束：无操作数、路径规格、修订与路径、PR 编号、推送远程与 refspec。
 */
function operandsMatch(operands, operands_2) {
  switch (operands.kind) {
    case "none":
      return operands_2.length === 0;
    case "pathspecs":
      return operands_2.length >= operands.min && operands_2.every(isSafePathspec);
    case "revisionsAndPathspecs":
      return operands_2.every((operand) => isSafeRevisionRange(operand) || isSafePathspec(operand));
    case "prNumber":
      return operands_2.length <= 1 && operands_2.every((operand) => /^[0-9]+$/.test(operand));
    case "pushRemoteAndRefspec": {
      if (operands_2.length < 1 || operands_2.length > 2) return false;
      if (operands_2[0] !== operands.remote) return false;
      let refspec = operands_2[1];
      return refspec === undefined || isSafeRefName(refspec);
    }
  }
}
//@ chunk-5xgkngpb.js:1035451-1036791 placement
/**
 * 判断命令是否严格符合某条认证规则：字面 argv、无环境变量与通配、只重定向到 /dev/null，命令头与子命令一致，选项不重复且都在白名单内、必需选项齐全、操作数形态匹配。
 */
function matchesCertifiedCommand(ruleName, command, ambiguousWords) {
  let spec = getCertifiedSpec(ruleName);
  if (spec === null) return false;
  if (command.argvSourceLiteral !== true) return false;
  if (command.envVars.length > 0) return false;
  if (ambiguousWords.length > 0) return false;
  let hasGlobSource =
    command.argv.some((arg) => /[*?[]/.test(arg)) ||
    command.redirects.some((redirect) => /[*?[]/.test(redirect.target));
  if (command.carveOutMayDesyncQuoteScan === true) {
    if (hasGlobSource) return false;
  } else if (command.hasUnquotedGlob && hasGlobSource) return false;
  for (let redirect of command.redirects) if (!isDevNullStdoutRedirect(redirect)) return false;
  for (let arg of command.argv) if (containsRuntimePlaceholder(arg)) return false;
  if (command.argv[0] !== spec.head) return false;
  for (let idx = 0; idx < spec.subcommand.length; idx++)
    if (command.argv[1 + idx] !== spec.subcommand[idx]) return false;
  let sliced = command.argv.slice(1 + spec.subcommand.length);
  let operands = [];
  let seenOptions = new Set();
  let afterDashes = false;
  for (let idx = 0; idx < sliced.length; idx++) {
    let arg = sliced[idx];
    if (arg === undefined) return false;
    if (afterDashes) {
      operands.push(arg);
      continue;
    }
    if (arg === "--") {
      afterDashes = true;
      continue;
    }
    if (arg.startsWith("--")) {
      if (arg.includes("=")) return false;
      let longOptionSpec = spec.longOptions.get(arg);
      if (longOptionSpec === undefined) return false;
      if (seenOptions.has(arg)) return false;
      seenOptions.add(arg);
      if (longOptionSpec.arity === "value") {
        let nextArg = sliced[idx + 1];
        if (nextArg === undefined || !isValidOptionValue(longOptionSpec, nextArg)) return false;
        idx++;
      }
      continue;
    }
    if (arg.startsWith("-") && arg !== "-") {
      if (spec.allowNumericCountShort === true && /^-[0-9]+$/.test(arg)) continue;
      if (!/^-[A-Za-z]$/.test(arg)) return false;
      let shortOptionSpec = spec.shortOptions.get(arg.slice(1));
      if (shortOptionSpec === undefined) return false;
      if (seenOptions.has(arg)) return false;
      seenOptions.add(arg);
      if (shortOptionSpec.arity === "value") {
        let nextArg = sliced[idx + 1];
        if (nextArg === undefined || !isValidOptionValue(shortOptionSpec, nextArg)) return false;
        idx++;
      }
      continue;
    }
    operands.push(arg);
  }
  if (spec.requiredOptions !== undefined) {
    for (let requiredOption of spec.requiredOptions) if (!seenOptions.has(requiredOption)) return false;
  }
  return operandsMatch(spec.operands, operands);
}
export {
  hasCertifiedPrefix,
  isCertifiedCommandRule,
  matchesCertifiedCommand,
  CERTIFIED_GIT_ADD,
  CERTIFIED_GIT_STATUS,
  CERTIFIED_GIT_COMMIT,
  CERTIFIED_GIT_CHECKOUT_B,
  CERTIFIED_GH_PR_CREATE,
  CERTIFIED_GH_PR_EDIT,
  CERTIFIED_GH_PR_VIEW,
  CERTIFIED_GIT_PUSH_ORIGIN,
  buildCertifiedPushRule,
  CERTIFIED_GIT_LOG,
  CERTIFIED_GIT_DIFF,
  CERTIFIED_GIT_BRANCH_SHOW_CURRENT,
};
