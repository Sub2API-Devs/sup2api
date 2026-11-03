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
function assertNativeToolRunsHere(e, n) {
  if (!isRemoteOnlyCheck(e)) return;
  throw (
    logFeatureBad("native_tool_never_runs_here", e, { has_session: n !== void 0 }),
    new NeverRunsInThisProcessError(
      `${e} is unavailable: this session runs file and shell tools only in its cloud environment, and this call could not be sent there. Retrying will not help.`,
    )
  );
}
//@ chunk-g54kbxqw.js:36297-36316 placement
var NATIVE_TOOL_OK = { result: !0 };
//@ chunk-g54kbxqw.js:36316-36420 placement
class NativeToolElsewhereError extends Error {
  code;
  constructor(e, n) {
    super(e);
    this.code = n;
    this.name = "NativeToolElsewhereError";
  }
}
//@ chunk-g54kbxqw.js:36420-36508 placement
class NeverRunsInThisProcessError extends Error {
  constructor(e) {
    super(e);
    this.name = "NeverRunsInThisProcessError";
  }
}
//@ chunk-g54kbxqw.js:36508-37428 placement
async function runPermissionCheck(e, n, s, r, h, y, k) {
  let C;
  try {
    C = (await n(e.name, s, r, h)) ?? {};
  } catch (error) {
    if (error instanceof NativeToolElsewhereError || isAbortError(error)) throw error;
    let se = escapeXmlInline(clipText(errorMessage(error), 2000));
    if (error instanceof Error && Object.isExtensible(error))
      throw (Object.defineProperty(error, "message", { value: se, writable: !0, configurable: !0 }), error);
    throw new NativeToolElsewhereError(se);
  }
  let {
      output: output,
      afterRead: afterRead,
      subagentFrameResult: subagentFrameResult,
      fieldsFromThisSide: fieldsFromThisSide,
    } = C,
    L = (e.outputSchemaAcrossProcesses ?? e.outputSchema)?.safeParse(output);
  if (L?.success !== !0) {
    afterRead?.unreadable();
    let G = e.isReadOnly?.(s) === !0 && e.name !== SEND_USER_FILE_TOOL_NAME;
    throw new NativeToolElsewhereError(
      G
        ? `${e.name} ran, but its result could not be read. It changes nothing, so it is safe to run again.`
        : `${e.name} ran, but its result could not be read. Check its effect before running it again.`,
      "ANSWER_LOST",
    );
  }
  afterRead?.ok();
  let j = fieldsFromThisSide === void 0 ? L.data : { ...L.data, ...fieldsFromThisSide },
    Q = e.fromAnotherProcess?.(j, s, y, k) ?? {},
    q = Q.newMessages ?? [];
  return {
    data: Q.data ?? j,
    ...(q.length > 0 && { newMessages: q }),
    ...(subagentFrameResult !== void 0 && { subagentFrameResult: subagentFrameResult }),
  };
}
//@ chunk-g54kbxqw.js:37428-37963 placement
var GET_TASK_TOOL_TEXT = "GetTask",
  Dpi =
    ". GetTask is not a tool you can call. A background command's result reaches you by itself when it finishes, unless the message that started it said otherwise, so you don't need to check on it.",
  d7o =
    "<tool_use_error>Error: No such tool available: GetTask. GetTask is not a tool you can call. A background command's result reaches you by itself when it finishes, unless the message that started it said otherwise, so you don't need to check on it.</tool_use_error>",
  Xvn = "Repeated GetTask call; not answered again.";

export {
  GET_TASK_TOOL_TEXT,
  Xvn,
  d7o,
  Dpi,
  assertNativeToolRunsHere,
  NativeToolElsewhereError,
  runPermissionCheck,
  NATIVE_TOOL_OK,
};
