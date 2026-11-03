/**
 * tools/BashTool/certifiedCommands.ts
 *
 * 2.1.316 新增：经认证的只读命令表
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-e6aww6q8.js (13)
 * attribution: placement 13
 */
import { permissionRuleValueFromString } from "../../utils/permissions/permissionRuleParser.js";
import { BASH_TOOL_NAME } from "./toolName.js";
import { isDevNullStdoutRedirect } from "../../utils/bash/bashPipeCommand.js";
import { containsRuntimePlaceholder } from "../../utils/bash/ast.js";

//@ chunk-e6aww6q8.js:1018035-1018057 placement
/**
 * 认证只读命令的规则名前缀。
 */
var CERTIFIED_PREFIX = "certified: ";
//@ chunk-e6aww6q8.js:1018057-1018098 placement
/**
 * 判断规则内容是否带 “certified: ” 前缀。
 */
function hasCertifiedPrefix(ruleContent) {
  return ruleContent.startsWith(CERTIFIED_PREFIX);
}
//@ chunk-e6aww6q8.js:1018098-1018193 placement
/**
 * 解析权限规则字符串，判断它是否是 Bash 工具的认证命令规则。
 */
function isCertifiedCommandRule(e) {
  let n = permissionRuleValueFromString(e);
  return n.toolName === BASH_TOOL_NAME && n.ruleContent !== undefined && hasCertifiedPrefix(n.ruleContent);
}
//@ chunk-e6aww6q8.js:1018193-1018586 placement
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
//@ chunk-e6aww6q8.js:1018586-1018643 placement
/**
 * 远程名合法时，返回该远程的认证 git push 规则。
 */
function buildCertifiedPushRule(e) {
  if (!REMOTE_NAME_RE.test(e)) return null;
  return CERTIFIED_GIT_PUSH_PREFIX + e;
}
//@ chunk-e6aww6q8.js:1018643-1018784 placement
function isSafeRefName(e) {
  if (!/^[A-Za-z0-9][A-Za-z0-9._/-]*$/.test(e)) return false;
  if (e.includes("..") || e.includes("@{") || e.endsWith("/")) return false;
  return true;
}
//@ chunk-e6aww6q8.js:1018784-1018962 placement
function isSafeRevisionRange(e) {
  let index = e.indexOf("...");
  if (index !== -1) return isSafeRefName(e.slice(0, index)) && isSafeRefName(e.slice(index + 3));
  let index_2 = e.indexOf("..");
  if (index_2 !== -1) return isSafeRefName(e.slice(0, index_2)) && isSafeRefName(e.slice(index_2 + 2));
  return isSafeRefName(e);
}
//@ chunk-e6aww6q8.js:1018962-1019127 placement
function isSafePathspec(e) {
  if (e === "") return false;
  for (let n of e.split("/")) {
    if (n === "" || n === "." || n === "..") return false;
    if (!/^[A-Za-z0-9_.][A-Za-z0-9._@+-]*$/.test(n)) return false;
  }
  return true;
}
//@ chunk-e6aww6q8.js:1019127-1020741 placement
/**
 * 认证命令规格表：每条规则的命令头、子命令、允许的长/短选项（布尔或取值）、必需选项、操作数形态。
 */
var EMPTY_OPTIONS = new Map();
var optionMap = (e) => new Map(e);
var BOOLEAN_OPTION = {
  arity: "boolean",
};
var OPAQUE_VALUE_OPTION = {
  arity: "value",
  valueShape: "opaque",
};
var REF_VALUE_OPTION = {
  arity: "value",
  valueShape: "ref",
};
var CERTIFIED_COMMAND_SPECS = new Map([
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
//@ chunk-e6aww6q8.js:1020741-1021040 placement
function getCertifiedSpec(ruleName) {
  let n = CERTIFIED_COMMAND_SPECS.get(ruleName);
  if (n !== undefined) return n;
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
//@ chunk-e6aww6q8.js:1021153-1021277 placement
function isValidOptionValue(e, n) {
  if (e.arity !== "value") return false;
  if (n.startsWith("-")) return false;
  if (e.valueShape === "ref") return isSafeRefName(n);
  return true;
}
//@ chunk-e6aww6q8.js:1021277-1021655 placement
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
      return operands_2.every((r) => isSafeRevisionRange(r) || isSafePathspec(r));
    case "prNumber":
      return operands_2.length <= 1 && operands_2.every((r) => /^[0-9]+$/.test(r));
    case "pushRemoteAndRefspec": {
      if (operands_2.length < 1 || operands_2.length > 2) return false;
      if (operands_2[0] !== operands.remote) return false;
      let r = operands_2[1];
      return r === undefined || isSafeRefName(r);
    }
  }
}
//@ chunk-e6aww6q8.js:1021655-1022987 placement
/**
 * 判断命令是否严格符合某条认证规则：字面 argv、无环境变量与通配、只重定向到 /dev/null，命令头与子命令一致，选项不重复且都在白名单内、必需选项齐全、操作数形态匹配。
 */
function matchesCertifiedCommand(ruleName, command, r) {
  let spec = getCertifiedSpec(ruleName);
  if (spec === null) return false;
  if (command.argvSourceLiteral !== true) return false;
  if (command.envVars.length > 0) return false;
  if (r.length > 0) return false;
  let h =
    command.argv.some((arg) => /[*?[]/.test(arg)) ||
    command.redirects.some((redirect) => /[*?[]/.test(redirect.target));
  if (command.carveOutMayDesyncQuoteScan === true) {
    if (h) return false;
  } else if (command.hasUnquotedGlob && h) return false;
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
    let q = sliced[idx];
    if (q === undefined) return false;
    if (afterDashes) {
      operands.push(q);
      continue;
    }
    if (q === "--") {
      afterDashes = true;
      continue;
    }
    if (q.startsWith("--")) {
      if (q.includes("=")) return false;
      let Z = spec.longOptions.get(q);
      if (Z === undefined) return false;
      if (seenOptions.has(q)) return false;
      seenOptions.add(q);
      if (Z.arity === "value") {
        let Se = sliced[idx + 1];
        if (Se === undefined || !isValidOptionValue(Z, Se)) return false;
        idx++;
      }
      continue;
    }
    if (q.startsWith("-") && q !== "-") {
      if (spec.allowNumericCountShort === true && /^-[0-9]+$/.test(q)) continue;
      if (!/^-[A-Za-z]$/.test(q)) return false;
      let Z = spec.shortOptions.get(q.slice(1));
      if (Z === undefined) return false;
      if (seenOptions.has(q)) return false;
      seenOptions.add(q);
      if (Z.arity === "value") {
        let Se = sliced[idx + 1];
        if (Se === undefined || !isValidOptionValue(Z, Se)) return false;
        idx++;
      }
      continue;
    }
    operands.push(q);
  }
  if (spec.requiredOptions !== undefined) {
    for (let requiredOption of spec.requiredOptions) if (!seenOptions.has(requiredOption)) return false;
  }
  return operandsMatch(spec.operands, operands);
}
export {
  isCertifiedCommandRule,
  hasCertifiedPrefix,
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
