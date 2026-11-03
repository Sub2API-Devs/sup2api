/**
 * tools/SyntheticOutputTool/SyntheticOutputTool.ts
 *
 * StructuredOutput 工具（SDK 结构化输出）：按 JSON schema（Ajv 编译、严格 schema 派生、不可满足检查）校验模型给出的最终结果并结束回合
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/tools/SyntheticOutputTool/SyntheticOutputTool.ts
 * pieces: chunk-22r83hv0.js (10), chunk-ae5g0zb5.js (1)
 * attribution: fingerprint 3, layout 6, file-local 1, callgraph-fingerprint 1
 */
import { DoctorLazy } from "../../cli/handlers/util.js";
import { u, string } from "../../../vendor/zod/v4/classic/schemas.js";
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

//@ chunk-22r83hv0.js:24633-24745 fingerprint = outputSchema (0.607)
var structuredOutputInputSchema = DoctorLazy(() => u({}).passthrough());
var structuredOutputOutputSchema = DoctorLazy(() => string().describe("Structured output tool result"));
var STRUCTUREDOUTPUT = "StructuredOutput";
//@ chunk-22r83hv0.js:24745-24814 layout
function isNonInteractiveOrBgSession(e) {
  return e.isNonInteractiveSession || e.isBgSession === true;
}
//@ chunk-22r83hv0.js:24814-25041 layout = countToolCallsSince (1)
function countToolCallsSince_2(messages, sinceUuid) {
  if (messages?.type !== "tool_use" || messages.name !== STRUCTUREDOUTPUT) return null;
  if (messages.id !== undefined && sinceUuid.has(messages.id)) return null;
  let input = messages.input;
  let text = input !== null && typeof input === "object" && "text" in input ? input.text : undefined;
  return typeof text === "string" && text.length > 0 ? text : null;
}
//@ chunk-22r83hv0.js:25041-26067 fingerprint = SyntheticOutputTool (0.815)
/**
 * StructuredOutput 工具（SDK --json-schema 用）：输入是任意对象，call 时用 Ajv 校验后作为 structured_output 返回并结束回合；总是内联、只读、并发安全。
 */
function SyntheticOutputTool(e = {}, n = () => {}) {
  return buildTool({
    ...e,
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
          n(input);
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
//@ chunk-22r83hv0.js:26067-26095 layout
var DEFAULT_SYNTHETIC_OUTPUT_TOOL = SyntheticOutputTool();
var syntheticOutputToolCache = new WeakMap();
//@ chunk-22r83hv0.js:26095-26174 file-local
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
//@ chunk-22r83hv0.js:26174-26193 layout
var MAX_SCHEMA_NODES_2 = 1e5;
var MAX_SCHEMA_DEPTH_2 = 1e4;
//@ chunk-22r83hv0.js:26193-26343 layout
function isSchemaTooLarge(e, n, r) {
  if (--n.n < 0 || r > MAX_SCHEMA_DEPTH_2) return true;
  if (typeof e !== "object" || e === null) return false;
  for (let s of Object.values(e)) if (isSchemaTooLarge(s, n, r + 1)) return true;
  return false;
}
//@ chunk-22r83hv0.js:26343-26910 layout
function compileOutputSchemaValidator(jsonSchema) {
  try {
    if (
      isSchemaTooLarge(
        jsonSchema,
        {
          n: MAX_SCHEMA_NODES_2,
        },
        0,
      )
    )
      return {
        error: "schema too large",
      };
    if (Boolean(jsonSchema.$async))
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
    if (!ajv.validateSchema(jsonSchema))
      return {
        error: ajv.errorsText(ajv.errors),
      };
    let validateSchema = ajv.compile(jsonSchema);
    return {
      validate(f) {
        if (validateSchema(f)) return;
        let errors = validateSchema.errors ?? [];
        return {
          message: errors.map((error) => formatSchemaError(error, f)).join(", "),
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
//@ chunk-22r83hv0.js:26910-27797 callgraph-fingerprint = buildSyntheticOutputTool (0.281)
/**
 * 构造带 schema 校验的 StructuredOutput 工具：先编译 Ajv 校验器（拒绝过大或 $async schema），尝试派生严格模式 schema，检查 schema 是否不可满足，再返回 {tool, unsatisfiable?} 或 {error}。
 */
function buildSyntheticOutputTool(jsonSchema) {
  try {
    let n = compileOutputSchemaValidator(jsonSchema);
    if ("error" in n) return n;
    let r;
    try {
      let d = normalizeOutputSchema(jsonSchema);
      if (d.ok) r = d.schema;
      logEvent("tengu_structured_output_strict_schema", {
        outcome: d.ok ? lit("converted") : lit("fallback"),
        reason: d.ok ? undefined : fromEnum(d.reason),
      });
    } catch (error) {
      logForDebugging(
        `Strict structured-output schema derivation failed, falling back to non-strict: ${error instanceof Error ? error.message : String(error)}`,
        {
          level: "error",
        },
      );
    }
    let s;
    try {
      let isValid = checkOutputSchemaSatisfiable(jsonSchema);
      if (!isValid.ok) s = isValid.finding;
      logEvent("tengu_structured_output_schema_lint", {
        outcome: isValid.ok ? lit("ok") : lit("unsatisfiable"),
        reason: isValid.ok ? undefined : fromEnum(isValid.finding.reason),
        scope: isValid.ok ? undefined : fromEnum(isValid.finding.scope),
      });
    } catch (error) {
      logError(error);
    }
    return {
      ...(s && {
        unsatisfiable: s,
      }),
      tool: SyntheticOutputTool(
        {
          inputJSONSchema: jsonSchema,
          ...(r && {
            strictInputJSONSchema: r,
          }),
        },
        (d) => {
          let f = n.validate(d);
          if (f)
            throw new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
              `Output does not match required schema: ${f.message}`,
              `StructuredOutput schema mismatch: ${f.keywords}`,
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
//@ chunk-ae5g0zb5.js:106792-106956 fingerprint = isSyntheticOutputToolEnabled (0.699)
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
  countToolCallsSince_2,
  createSyntheticOutputTool,
  isNonInteractiveOrBgSession,
  MAX_SCHEMA_NODES_2,
  isSyntheticOutputToolEnabled,
  DEFAULT_SYNTHETIC_OUTPUT_TOOL,
};
