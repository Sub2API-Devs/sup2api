/**
 * tools/REPLTool/EvalTool.ts
 *
 * EvalTool 工具定义：名称、schema、权限、结果映射与块状结果渲染（2.1.318 新增）。
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * new in 2.1.318 (2.1.88 has no file at this path)
 * pieces: chunk-n51jggtb.js (10)
 * attribution: placement 10
 * (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.
 */
import { codeModeAccepted, contextKeyAccepted } from "../../utils/codeMode/accepted.js";
import { isCodeModeEnabled } from "../RefreshMcpToolsTool/RefreshMcpToolsTool.js";
import { DoctorLazy } from "../../cli/handlers/util.js";
import {
  zodStrictObject,
  stringSchema,
  numberSchema,
  objectSchema,
  unknown,
  _enum,
  booleanSchema,
  array,
} from "../../../vendor/zod/v4/classic/schemas.js";
import { STOP_REPORT_LIMITS } from "./stopReport.js";
import { setExtraToolsProvider, setVirtualResultPatcher } from "../../Tool.js";
import { getFileAndShellTools } from "../../tools.js";
import { stripStoredRemoteResult } from "./mcpTools.js";
import { elideConsoleLine } from "./consoleRing.js";
import { memoizeWithLRU, retainCacheKey } from "../../utils/memoize.js";
import { truncate } from "../../utils/format.js";
import { getFirstLine } from "../../utils/stringUtils.js";
import { redactSecretPrefix } from "../../services/teamMemorySync/secretScanner.js";
import { MAX_DESCRIPTION_CHARS } from "../../constants/outputLimits.js";
import { displayableScriptDescription } from "../../utils/codeMode/displayableScriptDescription.js";
import { hasVisibleText } from "../../utils/permissions/approvalPayloadSerialization.js";
import { buildTool } from "../../services/tools/permissionCheckGuard.js";
import { REPL_TOOL_NAME, EVAL_TOOL_NAME, REPL_DISPLAY_NAME } from "./constants.js";
import { buildReplPrompt } from "./prompt.js";
import { isAutoClassifierActive } from "../../utils/permissions/autoModeState.js";
import { CODE_MODE_LABEL } from "../../constants/codeMode.js";
import { runAsyncEval } from "./asyncEval.js";
import { outputText } from "./render.js";
import { failedPageLine, MAX_FAILED_PAGES, MAX_IMAGES, MAX_DOCUMENTS } from "./innerResults.js";

//@ chunk-n51jggtb.js:57785-57958 placement
/**
 * 工具的一句话描述，按是否 Code Mode 切换。
 */
function replToolDescription() {
  if (codeModeAccepted())
    return isCodeModeEnabled()
      ? "Execute JavaScript to read, write, edit files and run shell commands"
      : "Execute JavaScript code with access to Claude Code tools";
  return "";
}
//@ chunk-n51jggtb.js:166632-171217 placement
/**
 * REPL 工具的输入与输出 schema（含 code/description/timeout 与 stdout/images 等字段说明）。
 */
var replInputSchema = DoctorLazy(() =>
  zodStrictObject({
    code: stringSchema().describe(
      "JavaScript code to execute. Supports top-level await. State persists across calls.",
    ),
    description: stringSchema()
      .optional()
      .describe(
        'Clear, concise description of what this script does in active voice (5-10 words). E.g. "Trace upgrade message to its GrowthBook flag"',
      ),
    timeout: numberSchema()
      .optional()
      .describe(
        "Optional limit on the script's own running time in milliseconds; time spent inside the tool calls it awaits is not counted (default 30000, max 600000)",
      ),
  }),
);
var replOutputSchema = DoctorLazy(() =>
  objectSchema({
    code: stringSchema().describe("The code that was executed"),
    result: unknown().optional().describe("Return value from the code execution"),
    stdout: stringSchema().describe("What the script logged (self.log; console.log outside REPL mode)"),
    stderr: stringSchema().describe("Captured console.error output"),
    error: stringSchema().optional().describe("Error message if execution failed"),
    stoppedBy: _enum(["user", "refusal"])
      .optional()
      .describe(
        `Set when the user stopped the script: 'user' for Esc or a Stop from another client, 'refusal' for a No on one of its permission prompts. The error field then gives each tool call's state at the stop: finished, failed, declined, or still running. After the first ${STOP_REPORT_LIMITS.entries} calls, the rest are counted by state and tool name.`,
      ),
    asyncDispatched: booleanSchema()
      .optional()
      .describe(
        "True when this Output carries no execution output: the receipt of an async eval (its outcome arrives in a poll event), a refusal at the cap on unsettled evals, or an eval that was cancelled before it ran",
      ),
    neverRan: _enum(["person", "other"])
      .optional()
      .describe(
        "Set when the eval was cancelled before its script ran: 'person' when the turn was cut (usually by a person's Esc or Stop), 'other' when a script, a TaskStop call or Claude Code cancelled it. The error field then holds the text written for the model",
      ),
    plainErrorLine: objectSchema({
      text: stringSchema(),
      replaces: stringSchema(),
    })
      .optional()
      .describe(
        "@internal Set for some errors that Claude Code wrote for the model. `text` is a short line shown to people instead of `replaces`, the line the error would otherwise show. If the error no longer shows `replaces`, for example because a PostToolUse hook rewrote it, the error's own line is shown",
      ),
    keptByTurnAbort: booleanSchema()
      .optional()
      .describe(
        "@internal True when a plugin's turn abort made this call return its receipt early while the script kept running; resume treats a transcript that ends on it as a finished turn (conversationRecovery.ts)",
      ),
    evalId: numberSchema()
      .optional()
      .describe(
        "The eval's number on the async lane. On a result, the script ended inside the settle window, and its late output arrives under this number. On a receipt, its settle arrives under this number, or a lost event after a process exit (lostEvals.ts). On a batch of late output (late is true), the number of the eval whose script logged it",
      ),
    ms: numberSchema().optional().describe("How long the script ran, in milliseconds (async lane)"),
    late: booleanSchema()
      .optional()
      .describe(
        "@internal True when this Output carries only an async eval's late output: stdout is the lines the script logged after its settle, delivered as one batch to the PostToolUse hooks before it reaches the model. Never set on a settle or a result",
      ),
    images: array(
      objectSchema({
        base64: stringSchema(),
        mediaType: stringSchema(),
      }),
    )
      .optional()
      .describe("Images returned by inner Read and MCP tool calls \u2014 surfaced as image content blocks"),
    imagesOmitted: numberSchema()
      .optional()
      .describe(
        "Count of images from inner tool calls dropped by the per-result image cap; surfaced as a note in the tool_result",
      ),
    imagePagesFailed: array(
      objectSchema({
        page: numberSchema(),
        file: stringSchema().optional(),
        error: stringSchema().optional(),
      }),
    )
      .optional()
      .describe(
        "Pages of inner page-range Reads that could not be processed as an image; surfaced as one note each in the tool_result",
      ),
    imagePagesFailedOmitted: numberSchema()
      .optional()
      .describe(
        "Count of failed-page notes dropped by the per-result note cap; surfaced as a note in the tool_result",
      ),
    documents: array(
      objectSchema({
        base64: stringSchema(),
      }),
    )
      .optional()
      .describe("PDFs returned by inner Read calls \u2014 surfaced as document content blocks"),
    documentsOmitted: numberSchema()
      .optional()
      .describe(
        "Count of inner-Read PDFs dropped by the per-result document cap; surfaced as a note in the tool_result",
      ),
    notifications: array(stringSchema())
      .optional()
      .describe(
        "The text of each ReadNotifications call the script made, as a direct call's result has it, whole; the first parts of the tool_result",
      ),
    toolsUsed: array(stringSchema())
      .optional()
      .describe(
        "The tools the script called, and those its calls' results say their work called, whose names this conversation's prompt did not yet carry: a synchronous result's first line, or the first child of its <repl-output>, names them (an async settle's delivery names them instead)",
      ),
  }),
);
var DEFAULT_REPL_TIMEOUT_MS = 30000;
var NON_TEXT_RESULT_KEYS = new Set(["stdout", "stderr", "error", "result"]);
//@ chunk-n51jggtb.js:175553-175584 placement
/**
 * 向核心注册 eval 工具用到的 seams（工具集读取与结果剥离）。
 */
function registerSeams() {
  setExtraToolsProvider(getFileAndShellTools);
  setVirtualResultPatcher(stripStoredRemoteResult);
}
//@ chunk-n51jggtb.js:181086-181097 placement
/**
 * REPL 结果的最大字符数。
 */
var MAX_RESULT_CHARS = 1e5;
//@ chunk-n51jggtb.js:181745-182094 placement
/**
 * 剥离结果里的图片/文档字段并做头尾截断。
 */
function stripResultForStorage(truncateShellStrings) {
  let result = stripMediaFields(truncateShellStrings);
  if (typeof result !== "object" || result === null) return result;
  let stdout = typeof result.stdout === "string" ? elideConsoleLine(result.stdout, "output") : result.stdout;
  let stderr = typeof result.stderr === "string" ? elideConsoleLine(result.stderr, "output") : result.stderr;
  let truncatedError =
    typeof result.error === "string" ? elideConsoleLine(result.error, "error") : result.error;
  return stdout === result.stdout && stderr === result.stderr && truncatedError === result.error
    ? result
    : {
        ...result,
        stdout,
        stderr,
        ...(truncatedError !== result.error && {
          error: truncatedError,
        }),
      };
}
//@ chunk-n51jggtb.js:182094-182343 placement
/**
 * 结果仅含文本时返回原值，否则去掉块字段。
 */
function stripMediaFields(stripMediaFromResult) {
  if (
    typeof stripMediaFromResult !== "object" ||
    stripMediaFromResult === null ||
    (!stripMediaFromResult.images?.length &&
      !stripMediaFromResult.documents?.length &&
      !stripMediaFromResult.imagePagesFailed?.length)
  )
    return stripMediaFromResult;
  let {
    images,
    imagesOmitted,
    imagePagesFailed,
    imagePagesFailedOmitted,
    documents,
    documentsOmitted,
    ...rest
  } = stripMediaFromResult;
  return rest;
}
//@ chunk-n51jggtb.js:182343-182894 placement
/**
 * 把被剥掉的图片/文档字段补回（用于重映射）。
 */
function restoreTransientMedia(from, to) {
  if (typeof from !== "object" || from === null || typeof to !== "object" || to === null) return to;
  let missingImages = to.images === undefined && from.images !== undefined;
  let missingFailedPages = to.imagePagesFailed === undefined && from.imagePagesFailed !== undefined;
  let missingDocuments = to.documents === undefined && from.documents !== undefined;
  if (!missingImages && !missingFailedPages && !missingDocuments) return to;
  return {
    ...to,
    ...(missingImages && {
      images: from.images,
      imagesOmitted: to.imagesOmitted ?? from.imagesOmitted,
    }),
    ...(missingFailedPages && {
      imagePagesFailed: from.imagePagesFailed,
      imagePagesFailedOmitted: to.imagePagesFailedOmitted ?? from.imagePagesFailedOmitted,
    }),
    ...(missingDocuments && {
      documents: from.documents,
      documentsOmitted: to.documentsOmitted ?? from.documentsOmitted,
    }),
  };
}
//@ chunk-n51jggtb.js:189063-189169 placement
/**
 * 工具摘要的 utf16le 编码缓存。
 */
var memoizedFirstLine = memoizeWithLRU(
  (code) =>
    Buffer.from(
      truncate(getFirstLine(redactSecretPrefix(code, MAX_DESCRIPTION_CHARS)), MAX_DESCRIPTION_CHARS),
      "utf16le",
    ).toString("utf16le"),
  (code) => code,
  64,
);
var firstLineCacheKey = retainCacheKey(memoizedFirstLine.cache);
//@ chunk-n51jggtb.js:189169-189320 placement
/**
 * 把多行描述压成首行并标注“多行取首行”。
 */
function summaryLine(description) {
  let replaced = displayableScriptDescription(description).replace(/\s+/g, " ");
  if (!hasVisibleText(replaced)) return "";
  return typeof description === "string" &&
    description.trim().includes(`
`)
    ? `${replaced} (first line of several)`
    : replaced;
}
//@ chunk-n51jggtb.js:189320-192336 placement
/**
 * EvalTool 工具定义本体（名称、提示词、schema、权限、结果映射）。
 */
var EvalTool = buildTool({
  name: REPL_TOOL_NAME,
  aliases: [EVAL_TOOL_NAME],
  searchHint: "execute JavaScript with programmatic tool access",
  enablesCodeExecution: true,
  backgrounding: "never",
  get maxResultSizeChars() {
    return MAX_RESULT_CHARS;
  },
  persistenceThresholdCeiling: MAX_RESULT_CHARS,
  async prompt({ tools, getToolPermissionContext }) {
    return buildReplPrompt(tools, await getToolPermissionContext());
  },
  async description(input) {
    return contextKeyAccepted() ? summaryLine(input.description) || "Run commands" : replToolDescription();
  },
  permissionNote(input, mode) {
    if (!contextKeyAccepted()) return;
    let note =
      summaryLine(
        typeof input === "object" && input !== null && "description" in input ? input.description : undefined,
      ) === ""
        ? "Yes runs Claude's code."
        : "Yes runs Claude's code. The line at the top is Claude's own summary of it, and nothing checks it against the code.";
    return mode === undefined || mode === "bypassPermissions"
      ? note
      : `${note} Each tool call in the code that needs approval is still checked on its own, by auto mode, by you or by a hook you've set up.`;
  },
  get inputSchema() {
    return replInputSchema();
  },
  get outputSchema() {
    return replOutputSchema();
  },
  isEnabled() {
    return isCodeModeEnabled();
  },
  isConcurrencySafe() {
    return false;
  },
  isReadOnly() {
    return false;
  },
  toAutoClassifierInput(input) {
    return input.code;
  },
  suppressesAlwaysAllowRule() {
    return contextKeyAccepted();
  },
  create(toolUseContext) {
    return {
      async checkPermissions(updatedInput) {
        if (isAutoClassifierActive(toolUseContext.permissions().mode))
          return {
            behavior: "passthrough",
            message: `${CODE_MODE_LABEL} script requires classifier review.`,
          };
        return {
          behavior: "allow",
          updatedInput,
        };
      },
      call(input, callCtx) {
        if (!callCtx.runEngine)
          return Promise.reject(Error("REPL: running needs the executor (call.runEngine)"));
        return callCtx.runEngine(runAsyncEval, {
          input,
          parentMessage: callCtx.parentMessage,
          onProgress: callCtx.onProgress,
        });
      },
    };
  },
  userFacingName() {
    return REPL_DISPLAY_NAME;
  },
  isTransparentWrapper() {
    return true;
  },
  stripForCreation: stripResultForStorage,
  stripForStorage: stripResultForStorage,
  restoreTransientForRemap: restoreTransientMedia,
  getToolUseSummary(input) {
    if (!input?.code) return null;
    let { code, description } = input;
    return displayableScriptDescription(description) || memoizedFirstLine(code);
  },
  renderToolUseMessage() {
    return "";
  },
  mapToolResultToToolResultBlockParam(output, toolUseId) {
    let text = outputText(output);
    if (output.images?.length || output.documents?.length || output.imagePagesFailed?.length) {
      let maxChars = MAX_RESULT_CHARS;
      let text_2 =
        text.length > maxChars
          ? text.slice(0, maxChars) +
            `
[\u2026 ${text.length - maxChars} more chars truncated \u2014 block-bearing REPL results are capped at ${maxChars} chars of text]`
          : text || "(no text output)";
      return {
        tool_use_id: toolUseId,
        type: "tool_result",
        content: [
          {
            type: "text",
            text: text_2,
          },
          ...(output.images ?? []).map((image) => ({
            type: "image",
            source: {
              type: "base64",
              media_type: image.mediaType,
              data: image.base64,
            },
          })),
          ...(output.imagePagesFailed ?? []).map((page) => ({
            type: "text",
            text: failedPageLine(page),
          })),
          ...(output.imagePagesFailedOmitted
            ? [
                {
                  type: "text",
                  text: `[${output.imagePagesFailedOmitted} more page(s) from inner Read calls could not be processed as an image \u2014 a REPL result names at most ${MAX_FAILED_PAGES} such pages]`,
                },
              ]
            : []),
          ...(output.imagesOmitted
            ? [
                {
                  type: "text",
                  text: `[${output.imagesOmitted} more image(s) from inner tool calls not shown \u2014 a REPL result carries at most ${MAX_IMAGES} images; fetch fewer images or PDF pages per REPL call]`,
                },
              ]
            : []),
          ...(output.documents ?? []).map((pdfDocument) => ({
            type: "document",
            source: {
              type: "base64",
              media_type: "application/pdf",
              data: pdfDocument.base64,
            },
          })),
          ...(output.documentsOmitted
            ? [
                {
                  type: "text",
                  text: `[${output.documentsOmitted} more PDF document(s) from inner Read calls not shown \u2014 a REPL result surfaces at most ${MAX_DOCUMENTS} documents; read fewer PDFs per call]`,
                },
              ]
            : []),
        ],
      };
    }
    return {
      tool_use_id: toolUseId,
      type: "tool_result",
      content: text,
      is_error: !!output.error,
    };
  },
});
export { EvalTool, replOutputSchema, NON_TEXT_RESULT_KEYS, DEFAULT_REPL_TIMEOUT_MS, registerSeams };
