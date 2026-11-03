/**
 * services/remoteTools/returnToolOutput.ts
 *
 * 2.1.316 新增：远程工具输出回传。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-rqh5c9eg.js (13)
 * attribution: placement 13
 */
import { createHash } from "crypto";
import { isPlainObject } from "../../utils/objectUtils.js";
import { DoctorLazy } from "../../cli/handlers/util.js";
import { A, E, o, zodStrictObject } from "../../../vendor/zod/v4/classic/schemas.js";
import { BASH_TOOL_NAME } from "../../tools/BashTool/toolName.js";
import { FILE_READ_TOOL_NAME } from "../../tools/FileReadTool/constants.js";
import { FILE_EDIT_TOOL_NAME } from "../../tools/FileEditTool/constants.js";
import { FILE_WRITE_TOOL_NAME } from "../../tools/FileWriteTool/prompt.js";
import { NOTEBOOK_EDIT_TOOL_NAME } from "../../tools/NotebookEditTool/constants.js";
import { uniq } from "../../utils/collections.js";
import { permissionRuleValueFromString } from "../../utils/permissions/permissionRuleParser.js";
import { formatPermissionRule } from "../../utils/permissions/disallowedToolsFlag.js";
import { jsonStringify } from "../../utils/slowOperations.js";

//@ chunk-rqh5c9eg.js:563-620 placement
var ANTHROPIC_RETURNTOOLOUTPUT = "anthropic/returnToolOutput",
  jvr = [2],
  OTs = 4194304;
//@ chunk-rqh5c9eg.js:620-644 placement
function Gfo() {
  return !0;
}
//@ chunk-rqh5c9eg.js:644-705 placement
function r0n(e) {
  return isPlainObject(e) && e.tool_host_interface !== void 0;
}
//@ chunk-rqh5c9eg.js:705-714 placement
var d = 64;
//@ chunk-rqh5c9eg.js:714-926 placement
var MAX_DENY_RULES = 1024,
  MAX_DENY_RULE_LENGTH = 1024,
  MAX_DENY_RULES_TOTAL = 65536,
  VERSIONS_SCHEMA = DoctorLazy(() => A(E().int()).max(d)),
  DENY_RULES_SCHEMA = DoctorLazy(() =>
    A(o().min(1).max(MAX_DENY_RULE_LENGTH))
      .max(MAX_DENY_RULES)
      .refine((e) => e.reduce((n, t) => n + t.length, 0) <= MAX_DENY_RULES_TOTAL),
  ),
  RETURN_OUTPUT_REQUEST_SCHEMA = DoctorLazy(() =>
    zodStrictObject({ versions: VERSIONS_SCHEMA(), deny_rules_digest: o().regex(/^[0-9a-f]{64}$/) }),
  );
/**
 * 解析请求中的"返回工具输出"字段：缺省、格式错误、无共同版本或已请求（附拒绝规则摘要）。
 */
//@ chunk-rqh5c9eg.js:926-1263 placement
function parseReturnOutputRequest(e) {
  let n = s(e)?.[ANTHROPIC_RETURNTOOLOUTPUT];
  if (n === void 0) return { kind: "absent" };
  let safeParse = VERSIONS_SCHEMA().safeParse(s(n)?.versions);
  if (!safeParse.success) return { kind: "malformed" };
  if (m(safeParse.data).length === 0) return { kind: "no_shared_version", versions: safeParse.data };
  let safeParse_2 = RETURN_OUTPUT_REQUEST_SCHEMA().safeParse(n);
  return safeParse_2.success
    ? { kind: "requested", denyRulesDigest: safeParse_2.data.deny_rules_digest }
    : { kind: "malformed" };
}
//@ chunk-rqh5c9eg.js:1263-1315 placement
function m(e) {
  return jvr.filter((n) => e.includes(n));
}
//@ chunk-rqh5c9eg.js:1315-1409 placement
var O = {
    [BASH_TOOL_NAME]: [FILE_READ_TOOL_NAME, FILE_EDIT_TOOL_NAME],
    [FILE_EDIT_TOOL_NAME]: [FILE_READ_TOOL_NAME],
    [FILE_WRITE_TOOL_NAME]: [FILE_EDIT_TOOL_NAME, FILE_READ_TOOL_NAME],
    [NOTEBOOK_EDIT_TOOL_NAME]: [FILE_EDIT_TOOL_NAME, FILE_READ_TOOL_NAME],
  },
  T = uniq([BASH_TOOL_NAME, ...Object.values(O).flat()]);
/**
 * 从权限规则字符串中挑出带内容的 Bash 类规则，去重排序后返回。
 */
//@ chunk-rqh5c9eg.js:1409-1528 placement
function bashDenyRuleStrings(e) {
  return uniq(
    e
      .map(permissionRuleValueFromString)
      .filter(
        ({ toolName: toolName, ruleContent: ruleContent }) => ruleContent !== void 0 && T.includes(toolName),
      )
      .map(formatPermissionRule),
  ).toSorted();
}
//@ chunk-rqh5c9eg.js:1528-1576 placement
function Kfo(e) {
  return DENY_RULES_SCHEMA().safeParse(e).success;
}
//@ chunk-rqh5c9eg.js:1576-1638 placement
function DTs(e) {
  return createHash("sha256").update(jsonStringify(e)).digest("hex");
}
//@ chunk-rqh5c9eg.js:1638-1731 placement
function LTs({ tools: tools, denyRules: denyRules }) {
  return { versions: [...jvr], tools: [...tools], deny_rules: bashDenyRuleStrings(denyRules) };
}
//@ chunk-rqh5c9eg.js:1731-1767 placement
function s(e) {
  return isPlainObject(e) ? e : void 0;
}

export {
  ANTHROPIC_RETURNTOOLOUTPUT,
  Kfo,
  Gfo,
  r0n,
  LTs,
  parseReturnOutputRequest,
  jvr,
  DTs,
  OTs,
  bashDenyRuleStrings,
};
