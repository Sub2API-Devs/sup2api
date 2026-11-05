/**
 * remote/tools/nativeToolErrors.ts
 *
 * 2.1.316 新增：原生工具在别处运行时的错误与权限检查
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * new in 2.1.318 (2.1.88 has no file at this path)
 * pieces: chunk-2c3jp4kn.js (5), chunk-wrq65rh8.js (1)
 * attribution: placement 6
 * (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.
 */
import { isRemoteOnlyCheck, escapeXmlInline } from "../../utils/permissions/checkRegistry.js";
import { logFeatureBad } from "../../services/analytics/featureTelemetry.js";
import { isAbortError, errorMessage } from "../../utils/errors.js";
import { clipText } from "./protocolSchemas.js";
import { SEND_USER_FILE_TOOL_NAME } from "../../tools/SendUserFileTool/prompt.js";

//@ chunk-2c3jp4kn.js:4926-5188 placement
function assertNativeToolRunsHere(name, session) {
  if (!isRemoteOnlyCheck(name)) return;
  logFeatureBad("native_tool_never_runs_here", name, {
    has_session: session !== undefined,
  });
  throw new NeverRunsInThisProcessError(
    `${name} is unavailable: this session runs file and shell tools only in its cloud environment, and this call could not be sent there. Retrying will not help.`,
  );
}
//@ chunk-2c3jp4kn.js:5188-5206 placement
var NATIVE_TOOL_OK = {
  result: true,
};
//@ chunk-2c3jp4kn.js:5206-5309 placement
class NativeToolElsewhereError extends Error {
  code;
  constructor(message, code) {
    super(message);
    this.code = code;
    this.name = "NativeToolElsewhereError";
  }
}
//@ chunk-2c3jp4kn.js:5309-5396 placement
class NeverRunsInThisProcessError extends Error {
  constructor(message) {
    super(message);
    this.name = "NeverRunsInThisProcessError";
  }
}
//@ chunk-2c3jp4kn.js:5396-6309 placement
async function runPermissionCheck(toolDef, checkRunner, input, signal, toolUseContext, opts, model) {
  let checkResult;
  try {
    checkResult = (await checkRunner(toolDef.name, input, signal, toolUseContext)) ?? {};
  } catch (error) {
    if (error instanceof NativeToolElsewhereError || isAbortError(error)) throw error;
    let message = escapeXmlInline(clipText(errorMessage(error), 2000));
    if (error instanceof Error && Object.isExtensible(error)) {
      Object.defineProperty(error, "message", {
        value: message,
        writable: true,
        configurable: true,
      });
      throw error;
    }
    throw new NativeToolElsewhereError(message);
  }
  let { output, afterRead, subagentFrameResult, fieldsFromThisSide } = checkResult;
  let parsedOutput = (toolDef.outputSchemaAcrossProcesses ?? toolDef.outputSchema)?.safeParse(output);
  if (parsedOutput?.success !== true) {
    afterRead?.unreadable();
    let isReadOnly = toolDef.isReadOnly?.(input) === true && toolDef.name !== SEND_USER_FILE_TOOL_NAME;
    throw new NativeToolElsewhereError(
      isReadOnly
        ? `${toolDef.name} ran, but its result could not be read. It changes nothing, so it is safe to run again.`
        : `${toolDef.name} ran, but its result could not be read. Check its effect before running it again.`,
      "ANSWER_LOST",
    );
  }
  afterRead?.ok();
  let mergedData =
    fieldsFromThisSide === undefined
      ? parsedOutput.data
      : {
          ...parsedOutput.data,
          ...fieldsFromThisSide,
        };
  let transformed = toolDef.fromAnotherProcess?.(mergedData, input, opts, model) ?? {};
  let newMessages = transformed.newMessages ?? [];
  return {
    data: transformed.data ?? mergedData,
    ...(newMessages.length > 0 && {
      newMessages,
    }),
    ...(subagentFrameResult !== undefined && {
      subagentFrameResult,
    }),
  };
}
//@ chunk-wrq65rh8.js:1055-1590 placement
/**
 * GetTask 工具不可用时的三段说明：为什么不能调用 GetTask、tool_use_error 包装文案与重复调用的应答。
 */
var GET_TASK_TOOL_TEXT = "GetTask";
var GET_TASK_NOT_A_TOOL_TEXT =
  ". GetTask is not a tool you can call. A background command's result reaches you by itself when it finishes, unless the message that started it said otherwise, so you don't need to check on it.";
var GET_TASK_TOOL_ERROR_TEXT =
  "<tool_use_error>Error: No such tool available: GetTask. GetTask is not a tool you can call. A background command's result reaches you by itself when it finishes, unless the message that started it said otherwise, so you don't need to check on it.</tool_use_error>";
var GET_TASK_REPEAT_TEXT = "Repeated GetTask call; not answered again.";
export {
  GET_TASK_TOOL_TEXT,
  assertNativeToolRunsHere,
  NativeToolElsewhereError,
  runPermissionCheck,
  NATIVE_TOOL_OK,
  GET_TASK_REPEAT_TEXT,
  GET_TASK_NOT_A_TOOL_TEXT,
  GET_TASK_TOOL_ERROR_TEXT,
};
