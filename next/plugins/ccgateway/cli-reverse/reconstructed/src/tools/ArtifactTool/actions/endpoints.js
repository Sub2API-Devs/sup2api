/**
 * tools/ArtifactTool/actions/endpoints.ts
 *
 * 2.1.316 新增：endpoints 动作
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * new in 2.1.318 (2.1.88 has no file at this path)
 * pieces: chunk-xzmy9dn4.js (3)
 * attribution: placement 3
 */
import { throwUnroutedArtifactAction } from "../../../services/artifacts/artifactPeople.js";
import { ArtifactInputError } from "../constants.js";
import { isPlainObject } from "../../../utils/isPlainObject.js";

//@ chunk-xzmy9dn4.js:251992-253076 placement
/**
 * 端点动作（get_endpoints/call_endpoint/run_script）：In 为可选的处理器实现模块；Th 为动作处理器（不可用时拒绝），md 为不可用文案。
 * （endpoints 处理器在本构建中不可用时的占位，所有方法拒绝或报错）
 */
var handlersModule = null;
var ENDPOINTS_UNAVAILABLE = "artifact endpoints are not available in this build";
var ARTIFACT_ENDPOINTS_ACTION_HANDLER = {
  actions: ["get_endpoints", "call_endpoint", "run_script"],
  async checkPermissions(tool, input, context) {
    if (!handlersModule)
      return {
        behavior: "deny",
        message: ENDPOINTS_UNAVAILABLE,
        decisionReason: {
          type: "other",
          reason: "not available",
        },
      };
    return handlersModule.handlersHandler.checkPermissions(tool, input, context);
  },
  async validateInput(tool, input, context) {
    if (!handlersModule)
      return {
        result: false,
        message: ENDPOINTS_UNAVAILABLE,
        errorCode: 9,
      };
    return handlersModule.handlersHandler.validateInput(tool, input, context);
  },
  toAutoClassifierInput(input) {
    let classifierInput = handlersModule
      ? handlersModule.handlersHandler.toAutoClassifierInput?.(input)
      : undefined;
    if (classifierInput !== undefined) return classifierInput;
    return input?.action === "get_endpoints"
      ? "list artifact endpoints"
      : input?.action === "call_endpoint"
        ? "call an artifact endpoint"
        : input?.action === "run_script"
          ? "run a script on an artifact"
          : throwUnroutedArtifactAction("handlers.toAutoClassifierInput", input);
  },
  async description(input, options, context) {
    let description = handlersModule ? handlersModule.handlersHandler.description : undefined;
    return description ? description(input, options, context) : "Use an artifact's server-side endpoints.";
  },
  getToolUseSummary(input) {
    return handlersModule ? (handlersModule.handlersHandler.getToolUseSummary?.(input) ?? null) : null;
  },
  async call(input, toolUseContext, canUseTool, parentMessage, onProgress, options) {
    if (!handlersModule) throw new ArtifactInputError(ENDPOINTS_UNAVAILABLE, "handlers_unavailable");
    return handlersModule.handlersHandler.call(
      input,
      toolUseContext,
      canUseTool,
      parentMessage,
      onProgress,
      options,
    );
  },
};
//@ chunk-xzmy9dn4.js:253076-253183 placement
function unreadableRecordResult(toolUseId) {
  return {
    tool_use_id: toolUseId,
    type: "tool_result",
    content: "This record is unreadable in this build.",
  };
}
//@ chunk-xzmy9dn4.js:253183-254310 placement
/**
 * 端点结果渲染与存储瘦身：Ha 代理到实现模块的渲染器；Eh / Ph 在存储时去掉 script_result / handler_result 的返回值、正文、头与错误详情，日志清空为占位。
 */
var ENDPOINT_RESULT_MAPPERS = {
  handlers_doc: (result, toolUseId) =>
    handlersModule
      ? handlersModule.handlersResultMappers.handlers_doc(result, toolUseId)
      : unreadableRecordResult(toolUseId),
  handler_result: (result, toolUseId) =>
    handlersModule
      ? handlersModule.handlersResultMappers.handler_result(result, toolUseId)
      : unreadableRecordResult(toolUseId),
  script_result: (result, toolUseId) =>
    handlersModule
      ? handlersModule.handlersResultMappers.script_result(result, toolUseId)
      : unreadableRecordResult(toolUseId),
};
var stripScriptResult = (result) => {
  if (
    result === null ||
    typeof result !== "object" ||
    !("script_result" in result) ||
    !isPlainObject(result.script_result)
  )
    return result;
  let scriptResult = result.script_result;
  let error = isPlainObject(scriptResult.error) ? scriptResult.error : undefined;
  if (
    !("value" in scriptResult) &&
    Array.isArray(scriptResult.logs) &&
    scriptResult.logs.every((log) => log === "") &&
    (!("error" in scriptResult) || (error !== undefined && !("detail" in error)))
  )
    return result;
  let { value, error: error_2, ...rest } = scriptResult;
  let { detail, ...errorRest } = error ?? {};
  let scriptResult_2 = {
    ...rest,
    logs: Array.isArray(scriptResult.logs) ? scriptResult.logs.map(() => "") : [],
    ...(error !== undefined && {
      error: errorRest,
    }),
  };
  return {
    ...result,
    script_result: scriptResult_2,
  };
};
var stripHandlerResult = (result) => {
  if (
    result === null ||
    typeof result !== "object" ||
    !("handler_result" in result) ||
    !isPlainObject(result.handler_result)
  )
    return result;
  let handlerResult = result.handler_result;
  let error = isPlainObject(handlerResult.error) ? handlerResult.error : undefined;
  if (
    !("body" in handlerResult) &&
    !("headers" in handlerResult) &&
    Array.isArray(handlerResult.logs) &&
    handlerResult.logs.every((log) => log === "") &&
    (!("error" in handlerResult) || (error !== undefined && !("detail" in error)))
  )
    return result;
  let { body, headers, error: error_2, ...rest } = handlerResult;
  let { detail, ...errorRest } = error ?? {};
  let handlerResult_2 = {
    ...rest,
    logs: Array.isArray(handlerResult.logs) ? handlerResult.logs.map(() => "") : [],
    ...(error !== undefined && {
      error: errorRest,
    }),
  };
  return {
    ...result,
    handler_result: handlerResult_2,
  };
};
export { ARTIFACT_ENDPOINTS_ACTION_HANDLER, ENDPOINT_RESULT_MAPPERS, stripHandlerResult, stripScriptResult };
