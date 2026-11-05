/**
 * services/remoteTools/returnToolOutput.ts
 *
 * 2.1.316 新增：远程工具输出回传。
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * new in 2.1.318 (2.1.88 has no file at this path)
 * pieces: chunk-w38a90r4.js (13)
 * attribution: placement 13
 */
import { createHash } from "crypto";
import { isPlainObject } from "../../utils/objectUtils.js";
import { DoctorLazy } from "../../cli/handlers/util.js";
import {
  array,
  numberSchema,
  stringSchema,
  zodStrictObject,
} from "../../../vendor/zod/v4/classic/schemas.js";
import { BASH_TOOL_NAME } from "../../tools/BashTool/toolName.js";
import { READ } from "../../tools/FileReadTool/constants.js";
import { EDIT } from "../../tools/FileEditTool/constants.js";
import { FILE_WRITE_TOOL_NAME } from "../../tools/FileWriteTool/prompt.js";
import { NOTEBOOK_EDIT_TOOL_NAME } from "../../tools/NotebookEditTool/constants.js";
import { normalizeCaseForComparison_2 } from "../../utils/permissions/filesystem.js";
import {
  parseRuleString,
  permissionRuleValueFromString,
} from "../../utils/permissions/permissionRuleParser.js";
import { jsonStringify } from "../../utils/slowOperations.js";
import { deferInit } from "../../../runtime/deferred-init.js";

//@ chunk-w38a90r4.js:563-620 placement
/**
 * 支持的回传输出版本与最大字节数。
 */
var ANTHROPIC_RETURNTOOLOUTPUT = "anthropic/returnToolOutput";
var SUPPORTED_RETURN_OUTPUT_VERSIONS = [2];
var MAX_RETURNED_OUTPUT_BYTES = 4194304;
//@ chunk-w38a90r4.js:620-644 placement
/**
 * 判断对端是否支持 return tool output。
 */
function isReturnOutputSupported() {
  return true;
}
//@ chunk-w38a90r4.js:644-705 placement
/**
 * 判断工具宿主是否声明了该接口。
 */
function hasToolHostInterface(meta) {
  return isPlainObject(meta) && meta.tool_host_interface !== undefined;
}
//@ chunk-w38a90r4.js:705-714 placement
var MAX_PROTOCOL_VERSIONS = 64;
//@ chunk-w38a90r4.js:714-926 placement
var MAX_DENY_RULES; // deferred: uses DoctorLazy (../../cli/handlers/util.js) of its import cycle while loading; runs once the cycle is complete
var MAX_DENY_RULE_LENGTH;
var MAX_DENY_RULES_TOTAL;
var VERSIONS_SCHEMA;
var DENY_RULES_SCHEMA;
var RETURN_OUTPUT_REQUEST_SCHEMA;
deferInit("chunk-w38a90r4.js:714", () => {
  MAX_DENY_RULES = 1024;
  MAX_DENY_RULE_LENGTH = 1024;
  MAX_DENY_RULES_TOTAL = 65536;
  VERSIONS_SCHEMA = DoctorLazy(() => array(numberSchema().int()).max(MAX_PROTOCOL_VERSIONS));
  DENY_RULES_SCHEMA = DoctorLazy(() =>
    array(stringSchema().min(1).max(MAX_DENY_RULE_LENGTH))
      .max(MAX_DENY_RULES)
      .refine((rules) => rules.reduce((acc, rule) => acc + rule.length, 0) <= MAX_DENY_RULES_TOTAL),
  );
  RETURN_OUTPUT_REQUEST_SCHEMA = DoctorLazy(() =>
    zodStrictObject({
      versions: VERSIONS_SCHEMA(),
      deny_rules_digest: stringSchema().regex(/^[0-9a-f]{64}$/),
    }),
  );
});
//@ chunk-w38a90r4.js:926-1263 placement
/**
 * 解析请求中的"返回工具输出"字段：缺省、格式错误、无共同版本或已请求（附拒绝规则摘要）。
 */
function parseReturnOutputRequest(meta) {
  let request = asPlainObject(meta)?.[ANTHROPIC_RETURNTOOLOUTPUT];
  if (request === undefined)
    return {
      kind: "absent",
    };
  let versions = VERSIONS_SCHEMA().safeParse(asPlainObject(request)?.versions);
  if (!versions.success)
    return {
      kind: "malformed",
    };
  if (sharedVersions(versions.data).length === 0)
    return {
      kind: "no_shared_version",
      versions: versions.data,
    };
  let parsed = RETURN_OUTPUT_REQUEST_SCHEMA().safeParse(request);
  return parsed.success
    ? {
        kind: "requested",
        denyRulesDigest: parsed.data.deny_rules_digest,
      }
    : {
        kind: "malformed",
      };
}
//@ chunk-w38a90r4.js:1263-1315 placement
function sharedVersions(advertised) {
  return SUPPORTED_RETURN_OUTPUT_VERSIONS.filter((version) => advertised.includes(version));
}
//@ chunk-w38a90r4.js:1315-1409 placement
var TOOL_PREREQUISITES; // deferred: uses normalizeCaseForComparison_2 (../../utils/permissions/filesystem.js) of its import cycle while loading; runs once the cycle is complete
var PREREQUISITE_TOOL_NAMES;
deferInit("chunk-w38a90r4.js:1315", () => {
  TOOL_PREREQUISITES = {
    [BASH_TOOL_NAME]: [READ, EDIT],
    [EDIT]: [READ],
    [FILE_WRITE_TOOL_NAME]: [EDIT, READ],
    [NOTEBOOK_EDIT_TOOL_NAME]: [EDIT, READ],
  };
  PREREQUISITE_TOOL_NAMES = normalizeCaseForComparison_2([
    BASH_TOOL_NAME,
    ...Object.values(TOOL_PREREQUISITES).flat(),
  ]);
});
//@ chunk-w38a90r4.js:1409-1528 placement
/**
 * 从权限规则字符串中挑出带内容的 Bash 类规则，去重排序后返回。
 */
function bashDenyRuleStrings(denyRules) {
  return normalizeCaseForComparison_2(
    denyRules
      .map(parseRuleString)
      .filter(
        ({ toolName, ruleContent }) =>
          ruleContent !== undefined && PREREQUISITE_TOOL_NAMES.includes(toolName),
      )
      .map(permissionRuleValueFromString),
  ).toSorted();
}
//@ chunk-w38a90r4.js:1528-1576 placement
/**
 * 校验拒绝规则列表符合 schema（条数、单条长度与总长上限）。
 */
function validateDenyRules(denyRules) {
  return DENY_RULES_SCHEMA().safeParse(denyRules).success;
}
//@ chunk-w38a90r4.js:1576-1638 placement
/**
 * 对回传请求结构做 sha256 摘要，用于校验拒绝规则。
 */
function hashJsonSha256(denyRules) {
  return createHash("sha256").update(jsonStringify(denyRules)).digest("hex");
}
//@ chunk-w38a90r4.js:1638-1731 placement
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
//@ chunk-w38a90r4.js:1731-1767 placement
function asPlainObject(value) {
  return isPlainObject(value) ? value : undefined;
}
export {
  ANTHROPIC_RETURNTOOLOUTPUT,
  hasToolHostInterface,
  validateDenyRules,
  isReturnOutputSupported,
  buildReturnToolOutputPayload,
  parseReturnOutputRequest,
  SUPPORTED_RETURN_OUTPUT_VERSIONS,
  hashJsonSha256,
  MAX_RETURNED_OUTPUT_BYTES,
  bashDenyRuleStrings,
};
