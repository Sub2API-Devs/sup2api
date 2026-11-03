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

/**
 * 端点动作（get_endpoints/call_endpoint/run_script）：In 为可选的处理器实现模块；Th 为动作处理器（不可用时拒绝），md 为不可用文案。
 * （endpoints 处理器在本构建中不可用时的占位，所有方法拒绝或报错）
 */
//@ chunk-8wvtd8sr.js:249767-250851 placement
var handlersModule = null,
  ENDPOINTS_UNAVAILABLE = "artifact endpoints are not available in this build",
  ARTIFACT_ENDPOINTS_ACTION_HANDLER = {
    actions: ["get_endpoints", "call_endpoint", "run_script"],
    async checkPermissions(e, n, s) {
      if (!handlersModule)
        return {
          behavior: "deny",
          message: ENDPOINTS_UNAVAILABLE,
          decisionReason: { type: "other", reason: "not available" },
        };
      return handlersModule.handlersHandler.checkPermissions(e, n, s);
    },
    async validateInput(e, n, s) {
      if (!handlersModule) return { result: !1, message: ENDPOINTS_UNAVAILABLE, errorCode: 9 };
      return handlersModule.handlersHandler.validateInput(e, n, s);
    },
    toAutoClassifierInput(e) {
      let n = handlersModule ? handlersModule.handlersHandler.toAutoClassifierInput?.(e) : void 0;
      if (n !== void 0) return n;
      return e?.action === "get_endpoints"
        ? "list artifact endpoints"
        : e?.action === "call_endpoint"
          ? "call an artifact endpoint"
          : e?.action === "run_script"
            ? "run a script on an artifact"
            : throwUnroutedArtifactAction("handlers.toAutoClassifierInput", e);
    },
    async description(e, n, s) {
      let r = handlersModule ? handlersModule.handlersHandler.description : void 0;
      return r ? r(e, n, s) : "Use an artifact's server-side endpoints.";
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
function unreadableRecordResult(e) {
  return { tool_use_id: e, type: "tool_result", content: "This record is unreadable in this build." };
}
/**
 * 端点结果渲染与存储瘦身：Ha 代理到实现模块的渲染器；Eh / Ph 在存储时去掉 script_result / handler_result 的返回值、正文、头与错误详情，日志清空为占位。
 */
//@ chunk-8wvtd8sr.js:250958-252085 placement
var ENDPOINT_RESULT_MAPPERS = {
    handlers_doc: (e, n) =>
      handlersModule ? handlersModule.handlersResultMappers.handlers_doc(e, n) : unreadableRecordResult(n),
    handler_result: (e, n) =>
      handlersModule ? handlersModule.handlersResultMappers.handler_result(e, n) : unreadableRecordResult(n),
    script_result: (e, n) =>
      handlersModule ? handlersModule.handlersResultMappers.script_result(e, n) : unreadableRecordResult(n),
  },
  stripScriptResult = (e) => {
    if (e === null || typeof e !== "object" || !("script_result" in e) || !isPlainObject(e.script_result))
      return e;
    let script_result = e.script_result,
      s = isPlainObject(script_result.error) ? script_result.error : void 0;
    if (
      !("value" in script_result) &&
      Array.isArray(script_result.logs) &&
      script_result.logs.every((log) => log === "") &&
      (!("error" in script_result) || (s !== void 0 && !("detail" in s)))
    )
      return e;
    let { value: r, error: error, ...y } = script_result,
      { detail: detail, ...w } = s ?? {},
      A = {
        ...y,
        logs: Array.isArray(script_result.logs) ? script_result.logs.map(() => "") : [],
        ...(s !== void 0 && { error: w }),
      };
    return { ...e, script_result: A };
  },
  stripHandlerResult = (e) => {
    if (e === null || typeof e !== "object" || !("handler_result" in e) || !isPlainObject(e.handler_result))
      return e;
    let handler_result = e.handler_result,
      s = isPlainObject(handler_result.error) ? handler_result.error : void 0;
    if (
      !("body" in handler_result) &&
      !("headers" in handler_result) &&
      Array.isArray(handler_result.logs) &&
      handler_result.logs.every((log) => log === "") &&
      (!("error" in handler_result) || (s !== void 0 && !("detail" in s)))
    )
      return e;
    let { body: body, headers: headers, error: error, ...p } = handler_result,
      { detail: detail, ...A } = s ?? {},
      S = {
        ...p,
        logs: Array.isArray(handler_result.logs) ? handler_result.logs.map(() => "") : [],
        ...(s !== void 0 && { error: A }),
      };
    return { ...e, handler_result: S };
  };

export { ARTIFACT_ENDPOINTS_ACTION_HANDLER, ENDPOINT_RESULT_MAPPERS, stripHandlerResult, stripScriptResult };
