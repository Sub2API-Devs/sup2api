/**
 * tools/SyntheticOutputTool/SyntheticOutputTool.ts
 *
 * StructuredOutput 工具（SDK 结构化输出）：按 JSON schema（Ajv 编译、严格 schema 派生、不可满足检查）校验模型给出的最终结果并结束回合
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/tools/SyntheticOutputTool/SyntheticOutputTool.ts
 * pieces: chunk-8nzbdydx.js (10), chunk-mhn0amzz.js (1)
 * attribution: fingerprint 3, layout 6, file-local 1, callgraph-fingerprint 1
 * (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.
 */
import { DoctorLazy } from "../../cli/handlers/util.js";
import { objectSchema, stringSchema } from "../../../vendor/zod/v4/classic/schemas.js";
import { buildTool } from "../../services/tools/permissionCheckGuard.js";
import { jsonStringify } from "../../utils/slowOperations.js";
import { isDisklessContext } from "../../utils/pollEvents.js";
import { require_ajv } from "../../../vendor/ajv/dist/ajv.js";
import { formatSchemaError, normalizeOutputSchema, checkOutputSchemaSatisfiable } from "./schemaCheck.js";
import { logEvent } from "../../services/analytics/index.js";
import { lit, fromEnum } from "../../services/analytics/safeMetadata.js";
import { logForDebugging } from "../../utils/debug.js";
import { logError } from "../../utils/log.js";
import { TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS } from "../../utils/errors.js";
import { getIsRemoteMode } from "../../bootstrap/state.js";
import { hooksModulesRefusalReason } from "../../services/analytics/growthbookCredentials.js";
import { isProjectScopeTrustAccepted } from "../../utils/config.js";
import { isDemoOrClaubbet } from "../../plugins/functionHooks/policyGate.js";
import { pendingReloadSlot } from "../../plugins/functionHooks/pluginLifecycle.js";
import { isClaudeTestPluginEnabled } from "../../plugins/bundled/claudeTest/browserHelper.js";
import { hasPluginSkill } from "../../components/skills/SkillsMenu.js";
import { deferInit } from "../../../runtime/deferred-init.js";

//@ chunk-8nzbdydx.js:53826-53938 fingerprint (2.1.88 match: outputSchema, 0.607)
var structuredOutputInputSchema; // deferred: uses DoctorLazy (../../cli/handlers/util.js) of its import cycle while loading; runs once the cycle is complete
var structuredOutputOutputSchema;
var STRUCTUREDOUTPUT;
deferInit("chunk-8nzbdydx.js:53826", () => {
  structuredOutputInputSchema = DoctorLazy(() => objectSchema({}).passthrough());
  structuredOutputOutputSchema = DoctorLazy(() => stringSchema().describe("Structured output tool result"));
  STRUCTUREDOUTPUT = "StructuredOutput";
});
//@ chunk-8nzbdydx.js:53938-54007 layout
function isNonInteractiveOrBgSession(toolContext) {
  return toolContext.isNonInteractiveSession || toolContext.isBgSession === true;
}
//@ chunk-8nzbdydx.js:54007-54234 layout
function structuredOutputText(message, seenIds) {
  if (message?.type !== "tool_use" || message.name !== STRUCTUREDOUTPUT) return null;
  if (message.id !== undefined && seenIds.has(message.id)) return null;
  let input = message.input;
  let text = input !== null && typeof input === "object" && "text" in input ? input.text : undefined;
  return typeof text === "string" && text.length > 0 ? text : null;
}
//@ chunk-8nzbdydx.js:54234-55260 fingerprint (2.1.88 match: SyntheticOutputTool, 0.815)
/**
 * StructuredOutput 工具（SDK --json-schema 用）：输入是任意对象，call 时用 Ajv 校验后作为 structured_output 返回并结束回合；总是内联、只读、并发安全。
 */
function SyntheticOutputTool(overrides = {}, handleInput = () => {}) {
  return buildTool({
    ...overrides,
    isMcp: false,
    isEnabled() {
      return true;
    },
    isConcurrencySafe() {
      return true;
    },
    isReadOnly() {
      return true;
    },
    isOpenWorld() {
      return false;
    },
    name: STRUCTUREDOUTPUT,
    searchHint: "return the final response as structured JSON",
    backgrounding: "never",
    maxResultSizeChars: 1e5,
    async description() {
      return "Return structured output in the requested format";
    },
    async prompt() {
      return "Use this tool to return your final response in the requested structured format. You MUST call this tool exactly once at the end of your response to provide the structured output.";
    },
    get inputSchema() {
      return structuredOutputInputSchema();
    },
    get outputSchema() {
      return structuredOutputOutputSchema();
    },
    create() {
      return {
        async call(input) {
          handleInput(input);
          return {
            data: "Structured output provided successfully",
            structured_output: input,
            endsTurn: true,
          };
        },
      };
    },
    renderToolUseMessage(input) {
      let keys = Object.keys(input);
      if (keys.length === 0) return null;
      if (keys.length <= 3) return keys.map((k) => `${k}: ${jsonStringify(input[k])}`).join(", ");
      return `${keys.length} fields: ${keys.slice(0, 3).join(", ")}\u2026`;
    },
    mapToolResultToToolResultBlockParam(content, toolUseID) {
      return {
        tool_use_id: toolUseID,
        type: "tool_result",
        content,
      };
    },
  });
}
//@ chunk-8nzbdydx.js:55260-55288 layout
var DEFAULT_SYNTHETIC_OUTPUT_TOOL; // deferred: uses SyntheticOutputTool of its import cycle while loading; runs once the cycle is complete
var syntheticOutputToolCache;
deferInit("chunk-8nzbdydx.js:55260", () => {
  DEFAULT_SYNTHETIC_OUTPUT_TOOL = SyntheticOutputTool();
  syntheticOutputToolCache = new WeakMap();
});
//@ chunk-8nzbdydx.js:55288-55367 file-local
/**
 * 按 JSON schema 缓存构造的 StructuredOutput 工具。
 */
function createSyntheticOutputTool(jsonSchema) {
  let cached = syntheticOutputToolCache.get(jsonSchema);
  if (cached) return cached;
  let result = buildSyntheticOutputTool(jsonSchema);
  syntheticOutputToolCache.set(jsonSchema, result);
  return result;
}
//@ chunk-8nzbdydx.js:55367-55386 layout
var MAX_SCHEMA_NODES_2 = 1e5;
var MAX_SCHEMA_DEPTH_2 = 1e4;
//@ chunk-8nzbdydx.js:55386-55536 layout
function isSchemaTooLarge(node, budget, depth) {
  if (--budget.n < 0 || depth > MAX_SCHEMA_DEPTH_2) return true;
  if (typeof node !== "object" || node === null) return false;
  for (let child of Object.values(node)) if (isSchemaTooLarge(child, budget, depth + 1)) return true;
  return false;
}
//@ chunk-8nzbdydx.js:55536-56103 layout
function compileOutputSchemaValidator(node) {
  try {
    if (
      isSchemaTooLarge(
        node,
        {
          n: MAX_SCHEMA_NODES_2,
        },
        0,
      )
    )
      return {
        error: "schema too large",
      };
    if (Boolean(node.$async))
      return {
        error: "$async schemas are not supported",
      };
    if (isDisklessContext())
      return {
        error: "this session compiles no schemas",
      };
    let { Ajv } = require_ajv();
    let ajv = new Ajv({
      allErrors: true,
      validateFormats: false,
      multipleOfPrecision: 6,
    });
    if (!ajv.validateSchema(node))
      return {
        error: ajv.errorsText(ajv.errors),
      };
    let validateSchema = ajv.compile(node);
    return {
      validate(value) {
        if (validateSchema(value)) return;
        let errors = validateSchema.errors ?? [];
        return {
          message: errors.map((error) => formatSchemaError(error, value)).join(", "),
          keywords: errors.map((error) => error.keyword).join(","),
        };
      },
    };
  } catch (e) {
    return {
      error: e instanceof Error ? e.message : String(e),
    };
  }
}
//@ chunk-8nzbdydx.js:56103-56990 callgraph-fingerprint (2.1.88 match: buildSyntheticOutputTool, 0.281)
/**
 * 构造带 schema 校验的 StructuredOutput 工具：先编译 Ajv 校验器（拒绝过大或 $async schema），尝试派生严格模式 schema，检查 schema 是否不可满足，再返回 {tool, unsatisfiable?} 或 {error}。
 */
function buildSyntheticOutputTool(jsonSchema) {
  try {
    let validator = compileOutputSchemaValidator(jsonSchema);
    if ("error" in validator) return validator;
    let strictSchema;
    try {
      let normalized = normalizeOutputSchema(jsonSchema);
      if (normalized.ok) strictSchema = normalized.schema;
      logEvent("tengu_structured_output_strict_schema", {
        outcome: normalized.ok ? lit("converted") : lit("fallback"),
        reason: normalized.ok ? undefined : fromEnum(normalized.reason),
      });
    } catch (error) {
      logForDebugging(
        `Strict structured-output schema derivation failed, falling back to non-strict: ${error instanceof Error ? error.message : String(error)}`,
        {
          level: "error",
        },
      );
    }
    let unsatisfiableFinding;
    try {
      let isValid = checkOutputSchemaSatisfiable(jsonSchema);
      if (!isValid.ok) unsatisfiableFinding = isValid.finding;
      logEvent("tengu_structured_output_schema_lint", {
        outcome: isValid.ok ? lit("ok") : lit("unsatisfiable"),
        reason: isValid.ok ? undefined : fromEnum(isValid.finding.reason),
        scope: isValid.ok ? undefined : fromEnum(isValid.finding.scope),
      });
    } catch (error) {
      logError(error);
    }
    return {
      ...(unsatisfiableFinding && {
        unsatisfiable: unsatisfiableFinding,
      }),
      tool: SyntheticOutputTool(
        {
          inputJSONSchema: jsonSchema,
          ...(strictSchema && {
            strictInputJSONSchema: strictSchema,
          }),
        },
        (input) => {
          let mismatch = validator.validate(input);
          if (mismatch)
            throw new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
              `Output does not match required schema: ${mismatch.message}`,
              `StructuredOutput schema mismatch: ${mismatch.keywords}`,
            );
        },
      ),
    };
  } catch (error) {
    return {
      error: error instanceof Error ? error.message : String(error),
    };
  }
}
//@ chunk-mhn0amzz.js:108034-108198 fingerprint (2.1.88 match: isSyntheticOutputToolEnabled, 0.699)
/**
 * （旧版名 isSyntheticOutputToolEnabled，存疑）交互式、主线程、非远程会话且若干特性开启时为真；与 StructuredOutput 的关系待确认。
 */
function isSyntheticOutputToolEnabled(opts) {
  return (
    !opts.options.isNonInteractiveSession &&
    opts.agentId === undefined &&
    !getIsRemoteMode() &&
    hooksModulesRefusalReason() === undefined &&
    (isProjectScopeTrustAccepted() || isDemoOrClaubbet()) &&
    pendingReloadSlot.get() !== undefined &&
    isClaudeTestPluginEnabled() &&
    !hasPluginSkill(opts.options.commands)
  );
}
export {
  STRUCTUREDOUTPUT,
  createSyntheticOutputTool,
  DEFAULT_SYNTHETIC_OUTPUT_TOOL,
  isNonInteractiveOrBgSession,
  structuredOutputText,
  MAX_SCHEMA_NODES_2,
  isSyntheticOutputToolEnabled,
};
