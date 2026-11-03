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
var eMo = "certified: ";
//@ chunk-e6aww6q8.js:1018057-1018098 placement
function HGe(e) {
  return e.startsWith(eMo);
}
//@ chunk-e6aww6q8.js:1018098-1018193 placement
function cBo(e) {
  let n = permissionRuleValueFromString(e);
  return n.toolName === BASH_TOOL_NAME && n.ruleContent !== void 0 && HGe(n.ruleContent);
}
/**
 * 认证只读命令的规则名常量（git status/add/commit/checkout -b/log/diff/branch --show-current、gh pr create/edit/view、git push）与远程名正则。
 */
//@ chunk-e6aww6q8.js:1018193-1018586 placement
var CERTIFIED_GIT_STATUS = "certified: git status",
  CERTIFIED_GIT_ADD = "certified: git add",
  CERTIFIED_GIT_COMMIT = "certified: git commit",
  CERTIFIED_GIT_CHECKOUT_B = "certified: git checkout -b",
  CERTIFIED_GIT_LOG = "certified: git log",
  CERTIFIED_GIT_DIFF = "certified: git diff",
  CERTIFIED_GIT_BRANCH_SHOW_CURRENT = "certified: git branch --show-current",
  CERTIFIED_GH_PR_CREATE = "certified: gh pr create",
  CERTIFIED_GH_PR_EDIT = "certified: gh pr edit",
  CERTIFIED_GH_PR_VIEW = "certified: gh pr view",
  CERTIFIED_GIT_PUSH_PREFIX = "certified: git push ",
  CERTIFIED_GIT_PUSH_ORIGIN = "certified: git push origin",
  REMOTE_NAME_RE = /^[A-Za-z0-9][A-Za-z0-9._-]*$/;
//@ chunk-e6aww6q8.js:1018586-1018643 placement
function Njr(e) {
  if (!REMOTE_NAME_RE.test(e)) return null;
  return CERTIFIED_GIT_PUSH_PREFIX + e;
}
//@ chunk-e6aww6q8.js:1018643-1018784 placement
function isSafeRefName(e) {
  if (!/^[A-Za-z0-9][A-Za-z0-9._/-]*$/.test(e)) return !1;
  if (e.includes("..") || e.includes("@{") || e.endsWith("/")) return !1;
  return !0;
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
  if (e === "") return !1;
  for (let n of e.split("/")) {
    if (n === "" || n === "." || n === "..") return !1;
    if (!/^[A-Za-z0-9_.][A-Za-z0-9._@+-]*$/.test(n)) return !1;
  }
  return !0;
}
/**
 * 认证命令规格表：每条规则的命令头、子命令、允许的长/短选项（布尔或取值）、必需选项、操作数形态。
 */
//@ chunk-e6aww6q8.js:1019127-1020741 placement
var EMPTY_OPTIONS = new Map(),
  optionMap = (e) => new Map(e),
  BOOLEAN_OPTION = { arity: "boolean" },
  OPAQUE_VALUE_OPTION = { arity: "value", valueShape: "opaque" },
  REF_VALUE_OPTION = { arity: "value", valueShape: "ref" },
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
        operands: { kind: "none" },
      },
    ],
    [
      CERTIFIED_GIT_ADD,
      {
        head: "git",
        subcommand: ["add"],
        longOptions: EMPTY_OPTIONS,
        shortOptions: EMPTY_OPTIONS,
        operands: { kind: "pathspecs", min: 1 },
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
        operands: { kind: "pathspecs", min: 0 },
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
        operands: { kind: "none" },
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
        allowNumericCountShort: !0,
        operands: { kind: "revisionsAndPathspecs" },
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
        operands: { kind: "revisionsAndPathspecs" },
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
        operands: { kind: "none" },
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
        operands: { kind: "none" },
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
        operands: { kind: "none" },
      },
    ],
    [
      CERTIFIED_GH_PR_VIEW,
      {
        head: "gh",
        subcommand: ["pr", "view"],
        longOptions: optionMap([["--json", OPAQUE_VALUE_OPTION]]),
        shortOptions: EMPTY_OPTIONS,
        operands: { kind: "prNumber" },
      },
    ],
  ]);
//@ chunk-e6aww6q8.js:1020741-1021040 placement
function getCertifiedSpec(e) {
  let n = CERTIFIED_COMMAND_SPECS.get(e);
  if (n !== void 0) return n;
  if (e.startsWith(CERTIFIED_GIT_PUSH_PREFIX)) {
    let sliced = e.slice(CERTIFIED_GIT_PUSH_PREFIX.length);
    if (!REMOTE_NAME_RE.test(sliced)) return null;
    return {
      head: "git",
      subcommand: ["push"],
      longOptions: optionMap([["--set-upstream", BOOLEAN_OPTION]]),
      shortOptions: optionMap([["u", BOOLEAN_OPTION]]),
      operands: { kind: "pushRemoteAndRefspec", remote: sliced },
    };
  }
  return null;
}
//@ chunk-e6aww6q8.js:1021153-1021277 placement
function isValidOptionValue(e, n) {
  if (e.arity !== "value") return !1;
  if (n.startsWith("-")) return !1;
  if (e.valueShape === "ref") return isSafeRefName(n);
  return !0;
}
/**
 * 检查命令操作数是否符合认证命令的约束：无操作数、路径规格、修订与路径、PR 编号、推送远程与 refspec。
 */
//@ chunk-e6aww6q8.js:1021277-1021655 placement
function operandsMatch(e, n) {
  switch (e.kind) {
    case "none":
      return n.length === 0;
    case "pathspecs":
      return n.length >= e.min && n.every(isSafePathspec);
    case "revisionsAndPathspecs":
      return n.every((r) => isSafeRevisionRange(r) || isSafePathspec(r));
    case "prNumber":
      return n.length <= 1 && n.every((r) => /^[0-9]+$/.test(r));
    case "pushRemoteAndRefspec": {
      if (n.length < 1 || n.length > 2) return !1;
      if (n[0] !== e.remote) return !1;
      let r = n[1];
      return r === void 0 || isSafeRefName(r);
    }
  }
}
/**
 * 判断命令是否严格符合某条认证规则：字面 argv、无环境变量与通配、只重定向到 /dev/null，命令头与子命令一致，选项不重复且都在白名单内、必需选项齐全、操作数形态匹配。
 */
//@ chunk-e6aww6q8.js:1021655-1022987 placement
function matchesCertifiedCommand(ruleName, command, r) {
  let spec = getCertifiedSpec(ruleName);
  if (spec === null) return !1;
  if (command.argvSourceLiteral !== !0) return !1;
  if (command.envVars.length > 0) return !1;
  if (r.length > 0) return !1;
  let h =
    command.argv.some((G) => /[*?[]/.test(G)) ||
    command.redirects.some((redirect) => /[*?[]/.test(redirect.target));
  if (command.carveOutMayDesyncQuoteScan === !0) {
    if (h) return !1;
  } else if (command.hasUnquotedGlob && h) return !1;
  for (let redirect of command.redirects) if (!isDevNullStdoutRedirect(redirect)) return !1;
  for (let G of command.argv) if (containsRuntimePlaceholder(G)) return !1;
  if (command.argv[0] !== spec.head) return !1;
  for (let G = 0; G < spec.subcommand.length; G++) if (command.argv[1 + G] !== spec.subcommand[G]) return !1;
  let sliced = command.argv.slice(1 + spec.subcommand.length),
    operands = [],
    seenOptions = new Set(),
    afterDashes = !1;
  for (let G = 0; G < sliced.length; G++) {
    let q = sliced[G];
    if (q === void 0) return !1;
    if (afterDashes) {
      operands.push(q);
      continue;
    }
    if (q === "--") {
      afterDashes = !0;
      continue;
    }
    if (q.startsWith("--")) {
      if (q.includes("=")) return !1;
      let Z = spec.longOptions.get(q);
      if (Z === void 0) return !1;
      if (seenOptions.has(q)) return !1;
      if ((seenOptions.add(q), Z.arity === "value")) {
        let Se = sliced[G + 1];
        if (Se === void 0 || !isValidOptionValue(Z, Se)) return !1;
        G++;
      }
      continue;
    }
    if (q.startsWith("-") && q !== "-") {
      if (spec.allowNumericCountShort === !0 && /^-[0-9]+$/.test(q)) continue;
      if (!/^-[A-Za-z]$/.test(q)) return !1;
      let Z = spec.shortOptions.get(q.slice(1));
      if (Z === void 0) return !1;
      if (seenOptions.has(q)) return !1;
      if ((seenOptions.add(q), Z.arity === "value")) {
        let Se = sliced[G + 1];
        if (Se === void 0 || !isValidOptionValue(Z, Se)) return !1;
        G++;
      }
      continue;
    }
    operands.push(q);
  }
  if (spec.requiredOptions !== void 0) {
    for (let requiredOption of spec.requiredOptions) if (!seenOptions.has(requiredOption)) return !1;
  }
  return operandsMatch(spec.operands, operands);
}

export {
  cBo,
  HGe,
  matchesCertifiedCommand,
  CERTIFIED_GIT_ADD,
  CERTIFIED_GIT_STATUS,
  CERTIFIED_GIT_COMMIT,
  CERTIFIED_GIT_CHECKOUT_B,
  CERTIFIED_GH_PR_CREATE,
  CERTIFIED_GH_PR_EDIT,
  CERTIFIED_GH_PR_VIEW,
  CERTIFIED_GIT_PUSH_ORIGIN,
  Njr,
  CERTIFIED_GIT_LOG,
  CERTIFIED_GIT_DIFF,
  CERTIFIED_GIT_BRANCH_SHOW_CURRENT,
};
