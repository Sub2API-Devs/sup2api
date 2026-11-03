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
import { array, E, string, zodStrictObject } from "../../../vendor/zod/v4/classic/schemas.js";
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
/**
 * 支持的回传输出版本与最大字节数。
 */
var ANTHROPIC_RETURNTOOLOUTPUT = "anthropic/returnToolOutput";
var SUPPORTED_RETURN_OUTPUT_VERSIONS = [2];
var MAX_RETURNED_OUTPUT_BYTES = 4194304;
//@ chunk-rqh5c9eg.js:620-644 placement
/**
 * 判断对端是否支持 return tool output。
 */
function isReturnOutputSupported() {
  return true;
}
//@ chunk-rqh5c9eg.js:644-705 placement
/**
 * 判断工具宿主是否声明了该接口。
 */
function hasToolHostInterface(e) {
  return isPlainObject(e) && e.tool_host_interface !== undefined;
}
//@ chunk-rqh5c9eg.js:705-714 placement
var MAX_PROTOCOL_VERSIONS = 64;
//@ chunk-rqh5c9eg.js:714-926 placement
var MAX_DENY_RULES = 1024;
var MAX_DENY_RULE_LENGTH = 1024;
var MAX_DENY_RULES_TOTAL = 65536;
var VERSIONS_SCHEMA = DoctorLazy(() => array(E().int()).max(MAX_PROTOCOL_VERSIONS));
var DENY_RULES_SCHEMA = DoctorLazy(() =>
  array(string().min(1).max(MAX_DENY_RULE_LENGTH))
    .max(MAX_DENY_RULES)
    .refine((e) => e.reduce((acc, t) => acc + t.length, 0) <= MAX_DENY_RULES_TOTAL),
);
var RETURN_OUTPUT_REQUEST_SCHEMA = DoctorLazy(() =>
  zodStrictObject({
    versions: VERSIONS_SCHEMA(),
    deny_rules_digest: string().regex(/^[0-9a-f]{64}$/),
  }),
);
//@ chunk-rqh5c9eg.js:926-1263 placement
/**
 * 解析请求中的"返回工具输出"字段：缺省、格式错误、无共同版本或已请求（附拒绝规则摘要）。
 */
function parseReturnOutputRequest(meta) {
  let n = asPlainObject(meta)?.[ANTHROPIC_RETURNTOOLOUTPUT];
  if (n === undefined)
    return {
      kind: "absent",
    };
  let t = VERSIONS_SCHEMA().safeParse(asPlainObject(n)?.versions);
  if (!t.success)
    return {
      kind: "malformed",
    };
  if (sharedVersions(t.data).length === 0)
    return {
      kind: "no_shared_version",
      versions: t.data,
    };
  let r = RETURN_OUTPUT_REQUEST_SCHEMA().safeParse(n);
  return r.success
    ? {
        kind: "requested",
        denyRulesDigest: r.data.deny_rules_digest,
      }
    : {
        kind: "malformed",
      };
}
//@ chunk-rqh5c9eg.js:1263-1315 placement
function sharedVersions(e) {
  return SUPPORTED_RETURN_OUTPUT_VERSIONS.filter((n) => e.includes(n));
}
//@ chunk-rqh5c9eg.js:1315-1409 placement
var TOOL_PREREQUISITES = {
  [BASH_TOOL_NAME]: [FILE_READ_TOOL_NAME, FILE_EDIT_TOOL_NAME],
  [FILE_EDIT_TOOL_NAME]: [FILE_READ_TOOL_NAME],
  [FILE_WRITE_TOOL_NAME]: [FILE_EDIT_TOOL_NAME, FILE_READ_TOOL_NAME],
  [NOTEBOOK_EDIT_TOOL_NAME]: [FILE_EDIT_TOOL_NAME, FILE_READ_TOOL_NAME],
};
var PREREQUISITE_TOOL_NAMES = uniq([BASH_TOOL_NAME, ...Object.values(TOOL_PREREQUISITES).flat()]);
//@ chunk-rqh5c9eg.js:1409-1528 placement
/**
 * 从权限规则字符串中挑出带内容的 Bash 类规则，去重排序后返回。
 */
function bashDenyRuleStrings(denyRules) {
  return uniq(
    denyRules
      .map(permissionRuleValueFromString)
      .filter(
        ({ toolName, ruleContent }) =>
          ruleContent !== undefined && PREREQUISITE_TOOL_NAMES.includes(toolName),
      )
      .map(formatPermissionRule),
  ).toSorted();
}
//@ chunk-rqh5c9eg.js:1528-1576 placement
/**
 * 校验拒绝规则列表符合 schema（条数、单条长度与总长上限）。
 */
function validateDenyRules(denyRules) {
  return DENY_RULES_SCHEMA().safeParse(denyRules).success;
}
//@ chunk-rqh5c9eg.js:1576-1638 placement
/**
 * 对回传请求结构做 sha256 摘要，用于校验拒绝规则。
 */
function hashJsonSha256(denyRules) {
  return createHash("sha256").update(jsonStringify(denyRules)).digest("hex");
}
//@ chunk-rqh5c9eg.js:1638-1731 placement
/**
 * 由工具表与拒绝规则生成回传请求的结构（版本、工具、bash 拒绝规则摘要）。
 */
function buildReturnToolOutputPayload({ tools, denyRules }) {
  return {
    versions: [...SUPPORTED_RETURN_OUTPUT_VERSIONS],
    tools: [...tools],
    deny_rules: bashDenyRuleStrings(denyRules),
  };
}
//@ chunk-rqh5c9eg.js:1731-1767 placement
function asPlainObject(e) {
  return isPlainObject(e) ? e : undefined;
}
export {
  ANTHROPIC_RETURNTOOLOUTPUT,
  validateDenyRules,
  isReturnOutputSupported,
  hasToolHostInterface,
  buildReturnToolOutputPayload,
  parseReturnOutputRequest,
  SUPPORTED_RETURN_OUTPUT_VERSIONS,
  hashJsonSha256,
  MAX_RETURNED_OUTPUT_BYTES,
  bashDenyRuleStrings,
};
