/**
 * remote/tools/nativeToolErrors.ts
 *
 * 2.1.316 新增：原生工具在别处运行时的错误与权限检查
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-g54kbxqw.js (6)
 * attribution: placement 6
 */
import { isRemoteOnlyCheck, escapeXmlInline } from "../../utils/permissions/checkRegistry.js";
import { logFeatureBad } from "../../services/analytics/featureTelemetry.js";
import { isAbortError, errorMessage } from "../../utils/errors.js";
import { clipText } from "./protocolSchemas.js";
import { SEND_USER_FILE_TOOL_NAME } from "../../tools/SendUserFileTool/prompt.js";

//@ chunk-g54kbxqw.js:36033-36297 placement
function assertNativeToolRunsHere(name, n) {
  if (!isRemoteOnlyCheck(name)) return;
  logFeatureBad("native_tool_never_runs_here", name, {
    has_session: n !== undefined,
  });
  throw new NeverRunsInThisProcessError(
    `${name} is unavailable: this session runs file and shell tools only in its cloud environment, and this call could not be sent there. Retrying will not help.`,
  );
}
//@ chunk-g54kbxqw.js:36297-36316 placement
var NATIVE_TOOL_OK = {
  result: true,
};
//@ chunk-g54kbxqw.js:36316-36420 placement
class NativeToolElsewhereError extends Error {
  code;
  constructor(message, code) {
    super(message);
    this.code = code;
    this.name = "NativeToolElsewhereError";
  }
}
//@ chunk-g54kbxqw.js:36420-36508 placement
class NeverRunsInThisProcessError extends Error {
  constructor(message) {
    super(message);
    this.name = "NeverRunsInThisProcessError";
  }
}
//@ chunk-g54kbxqw.js:36508-37428 placement
async function runPermissionCheck(e, n, s, signal, h, y, model) {
  let C;
  try {
    C = (await n(e.name, s, signal, h)) ?? {};
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
  let { output, afterRead, subagentFrameResult, fieldsFromThisSide } = C;
  let L = (e.outputSchemaAcrossProcesses ?? e.outputSchema)?.safeParse(output);
  if (L?.success !== true) {
    afterRead?.unreadable();
    let G = e.isReadOnly?.(s) === true && e.name !== SEND_USER_FILE_TOOL_NAME;
    throw new NativeToolElsewhereError(
      G
        ? `${e.name} ran, but its result could not be read. It changes nothing, so it is safe to run again.`
        : `${e.name} ran, but its result could not be read. Check its effect before running it again.`,
      "ANSWER_LOST",
    );
  }
  afterRead?.ok();
  let j =
    fieldsFromThisSide === undefined
      ? L.data
      : {
          ...L.data,
          ...fieldsFromThisSide,
        };
  let Q = e.fromAnotherProcess?.(j, s, y, model) ?? {};
  let newMessages = Q.newMessages ?? [];
  return {
    data: Q.data ?? j,
    ...(newMessages.length > 0 && {
      newMessages,
    }),
    ...(subagentFrameResult !== undefined && {
      subagentFrameResult,
    }),
  };
}
//@ chunk-g54kbxqw.js:37428-37963 placement
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
  GET_TASK_REPEAT_TEXT,
  GET_TASK_TOOL_ERROR_TEXT,
  GET_TASK_NOT_A_TOOL_TEXT,
  assertNativeToolRunsHere,
  NativeToolElsewhereError,
  runPermissionCheck,
  NATIVE_TOOL_OK,
};
