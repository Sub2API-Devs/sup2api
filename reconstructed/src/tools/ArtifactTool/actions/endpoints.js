/**
 * tools/ArtifactTool/actions/endpoints.ts
 *
 * 2.1.316 新增：endpoints 动作
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-8wvtd8sr.js (3)
 * attribution: placement 3
 */
import { throwUnroutedArtifactAction } from "../../../services/artifacts/artifactPeople.js";
import { ArtifactInputError } from "../constants.js";
import { isPlainObject } from "../../../utils/isPlainObject.js";

//@ chunk-8wvtd8sr.js:249767-250851 placement
/**
 * 端点动作（get_endpoints/call_endpoint/run_script）：In 为可选的处理器实现模块；Th 为动作处理器（不可用时拒绝），md 为不可用文案。
 * （endpoints 处理器在本构建中不可用时的占位，所有方法拒绝或报错）
 */
var handlersModule = null;
var ENDPOINTS_UNAVAILABLE = "artifact endpoints are not available in this build";
var ARTIFACT_ENDPOINTS_ACTION_HANDLER = {
  actions: ["get_endpoints", "call_endpoint", "run_script"],
  async checkPermissions(e, n, s) {
    if (!handlersModule)
      return {
        behavior: "deny",
        message: ENDPOINTS_UNAVAILABLE,
        decisionReason: {
          type: "other",
          reason: "not available",
        },
      };
    return handlersModule.handlersHandler.checkPermissions(e, n, s);
  },
  async validateInput(e, n, s) {
    if (!handlersModule)
      return {
        result: false,
        message: ENDPOINTS_UNAVAILABLE,
        errorCode: 9,
      };
    return handlersModule.handlersHandler.validateInput(e, n, s);
  },
  toAutoClassifierInput(e) {
    let n = handlersModule ? handlersModule.handlersHandler.toAutoClassifierInput?.(e) : undefined;
    if (n !== undefined) return n;
    return e?.action === "get_endpoints"
      ? "list artifact endpoints"
      : e?.action === "call_endpoint"
        ? "call an artifact endpoint"
        : e?.action === "run_script"
          ? "run a script on an artifact"
          : throwUnroutedArtifactAction("handlers.toAutoClassifierInput", e);
  },
  async description(e, n, s) {
    let description = handlersModule ? handlersModule.handlersHandler.description : undefined;
    return description ? description(e, n, s) : "Use an artifact's server-side endpoints.";
  },
  getToolUseSummary(e) {
    return handlersModule ? (handlersModule.handlersHandler.getToolUseSummary?.(e) ?? null) : null;
  },
  async call(e, n, s, r, h, y) {
    if (!handlersModule) throw new ArtifactInputError(ENDPOINTS_UNAVAILABLE, "handlers_unavailable");
    return handlersModule.handlersHandler.call(e, n, s, r, h, y);
  },
};
//@ chunk-8wvtd8sr.js:250851-250958 placement
function unreadableRecordResult(toolUseId) {
  return {
    tool_use_id: toolUseId,
    type: "tool_result",
    content: "This record is unreadable in this build.",
  };
}
//@ chunk-8wvtd8sr.js:250958-252085 placement
/**
 * 端点结果渲染与存储瘦身：Ha 代理到实现模块的渲染器；Eh / Ph 在存储时去掉 script_result / handler_result 的返回值、正文、头与错误详情，日志清空为占位。
 */
var ENDPOINT_RESULT_MAPPERS = {
  handlers_doc: (e, toolUseId) =>
    handlersModule
      ? handlersModule.handlersResultMappers.handlers_doc(e, toolUseId)
      : unreadableRecordResult(toolUseId),
  handler_result: (e, toolUseId) =>
    handlersModule
      ? handlersModule.handlersResultMappers.handler_result(e, toolUseId)
      : unreadableRecordResult(toolUseId),
  script_result: (e, toolUseId) =>
    handlersModule
      ? handlersModule.handlersResultMappers.script_result(e, toolUseId)
      : unreadableRecordResult(toolUseId),
};
var stripScriptResult = (e) => {
  if (e === null || typeof e !== "object" || !("script_result" in e) || !isPlainObject(e.script_result))
    return e;
  let scriptResult = e.script_result;
  let error = isPlainObject(scriptResult.error) ? scriptResult.error : undefined;
  if (
    !("value" in scriptResult) &&
    Array.isArray(scriptResult.logs) &&
    scriptResult.logs.every((log) => log === "") &&
    (!("error" in scriptResult) || (error !== undefined && !("detail" in error)))
  )
    return e;
  let { value: r, error: error_2, ...y } = scriptResult;
  let { detail, ...w } = error ?? {};
  let scriptResult_2 = {
    ...y,
    logs: Array.isArray(scriptResult.logs) ? scriptResult.logs.map(() => "") : [],
    ...(error !== undefined && {
      error: w,
    }),
  };
  return {
    ...e,
    script_result: scriptResult_2,
  };
};
var stripHandlerResult = (e) => {
  if (e === null || typeof e !== "object" || !("handler_result" in e) || !isPlainObject(e.handler_result))
    return e;
  let handlerResult = e.handler_result;
  let error = isPlainObject(handlerResult.error) ? handlerResult.error : undefined;
  if (
    !("body" in handlerResult) &&
    !("headers" in handlerResult) &&
    Array.isArray(handlerResult.logs) &&
    handlerResult.logs.every((log) => log === "") &&
    (!("error" in handlerResult) || (error !== undefined && !("detail" in error)))
  )
    return e;
  let { body, headers, error: error_2, ...p } = handlerResult;
  let { detail, ...A } = error ?? {};
  let handlerResult_2 = {
    ...p,
    logs: Array.isArray(handlerResult.logs) ? handlerResult.logs.map(() => "") : [],
    ...(error !== undefined && {
      error: A,
    }),
  };
  return {
    ...e,
    handler_result: handlerResult_2,
  };
};
export { ARTIFACT_ENDPOINTS_ACTION_HANDLER, ENDPOINT_RESULT_MAPPERS, stripHandlerResult, stripScriptResult };
