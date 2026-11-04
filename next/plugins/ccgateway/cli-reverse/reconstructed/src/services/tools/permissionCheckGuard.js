/**
 * services/tools/permissionCheckGuard.ts
 *
 * 2.1.316 新增：工具定义构建与运行位置变化时的权限检查守卫
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-g54kbxqw.js (5)
 * attribution: placement 5
 */
import {
  assertNativeToolRunsHere,
  NativeToolElsewhereError,
  runPermissionCheck,
  NATIVE_TOOL_OK,
} from "../../remote/tools/nativeToolErrors.js";
import { createToolUseContextView, runPermissionCheckWithReentry, TOOL_DEFAULTS } from "../../Tool.js";
import { withdrawablePromptScope, turnAbortControllerOf } from "../../utils/abortController.js";
import { clearToolUsePermissionState } from "../../components/permissions/hooks.js";
import { getCheckRunner, hasRegisteredCheck } from "../../utils/permissions/checkRegistry.js";

//@ chunk-g54kbxqw.js:167050-167123 placement
/**
 * 用全 undefined 的 Proxy 调一次 create，探测返回对象里是否有指定方法（避免为不实现 permissionCheckFailureDecision 的工具构造真实上下文）。
 */
function createReturnsMethod(create, methodName) {
  let proxy = new Proxy(
    {},
    {
      get: () => {
        return;
      },
    },
  );
  return methodName in create(proxy);
}
//@ chunk-g54kbxqw.js:167123-170242 placement
/**
 * 316 的工具工厂（旧版 buildTool）。定义里的 create(ctx) 返回 {validateInput, checkPermissions, call, permissionCheckFailureDecision}；工厂把它们包成统一签名，注入 call 上下文（signal、onProgress、ask、runEngine、权限阶段等），并在工具"在别处运行"（nae 判定，原生工具转发）时改走 Jo 转发或拒绝。缺省 checkPermissions 为 allow、validateInput 为通过。
 */
function buildTool(def) {
  let create = def.create;
  let createChecked = (context, session) => {
    assertNativeToolRunsHere(def.name, session);
    return create.call(def, context);
  };
  let buildCall = (context, onProgress, parentMessage, canUseTool, options) => ({
    tool: createChecked(createToolUseContextView(context), context?.session),
    call: {
      parentMessage,
      userModified: options?.userModified,
      globLimits: options?.globLimits,
      userTypedShellDispatch: options?.userTypedShellDispatch,
      pdfRenderSignal: options?.pdfRenderSignal,
      gitDiffRead: options?.gitDiffRead,
      outsideResultReader: options?.outsideResultReader,
      ...false,
      smallResultAsked: options?.smallResultAsked,
      callerLogsSharedEvents: options?.callerLogsSharedEvents,
      timing: options?.timing,
      runEngine: (runFn, args) =>
        runFn({
          ...args,
          toolUseContext:
            context.permissionRound === undefined
              ? context
              : {
                  ...context,
                  permissionRound: undefined,
                },
          canUseTool,
        }),
      ask:
        canUseTool && parentMessage
          ? (input, askOptions) => {
              let checkPromise = runPermissionCheckWithReentry(
                canUseTool,
                merged,
                askOptions.withdraw === undefined
                  ? context
                  : {
                      ...context,
                      abortController: withdrawablePromptScope(context.abortController, askOptions.withdraw),
                    },
                parentMessage,
                input,
                askOptions,
              );
              return askOptions.toolUseId === context.toolUseId
                ? checkPromise
                : checkPromise.finally(() =>
                    clearToolUsePermissionState(context.session, askOptions.toolUseId),
                  );
            }
          : undefined,
      get toolUseId() {
        return context.toolUseId;
      },
      get signal() {
        return context.abortController.signal;
      },
      get permissionPhase() {
        return context.permissionPhase;
      },
      get permissionRound() {
        return context.permissionRound;
      },
      abort: (reason) => context.abortController.abort(reason),
      abortTurn: (reason) => turnAbortControllerOf(context.abortController).abort(reason),
      onProgress,
      get innerCall() {
        return context.innerCall;
      },
      get shellWallCapMs() {
        return context.shellWallCapMs;
      },
      get promptShellPluginId() {
        return context.promptShellPluginId;
      },
      get fileReadingLimits() {
        return context.fileReadingLimits;
      },
      get sameTurnToolUses() {
        return context.sameTurnToolUses;
      },
      get remoteCall() {
        return context.remoteCall;
      },
      get keptBackgroundShells() {
        return context.keptBackgroundShells;
      },
      get inputFromAnotherMachine() {
        return context.inputFromAnotherMachine;
      },
      get permissionSurface() {
        return context.toolUseId === undefined
          ? undefined
          : context.toolDecisions.get(context.toolUseId)?.surface;
      },
    },
  });
  let overrides = {
    create: (context) => createChecked(context, context.session),
    call: (input, context, canUseTool, parentMessage, onProgress, options) => {
      let checkRunner = getCheckRunner(context?.session, def.name);
      let wallRunner =
        options?.runnerCheckedHere !== undefined &&
        checkRunner !== undefined &&
        hasRegisteredCheck(context?.session, def.name)
          ? options.runnerCheckedHere
          : checkRunner;
      if (options?.permissionCheckedFor !== undefined && options.permissionCheckedFor !== wallRunner)
        return Promise.reject(
          new NativeToolElsewhereError(
            `${def.name} was not run: where it runs changed after its permission was checked. Send the call again.`,
            "NOT_RUN",
          ),
        );
      if (wallRunner)
        return runPermissionCheck(
          def,
          wallRunner,
          input,
          context.abortController.signal,
          context,
          options,
          parentMessage?.message.model,
        );
      let { tool, call } = buildCall(context, onProgress, parentMessage, canUseTool, options);
      return tool.call(input, call);
    },
    validateInput: async (input, context) => {
      let checkRunner = getCheckRunner(context?.session, def.name);
      if (checkRunner) {
        let refusal = checkRunner.refusedUnasked?.(input, context);
        return refusal === undefined
          ? NATIVE_TOOL_OK
          : {
              result: false,
              message: refusal,
              errorCode: 1,
            };
      }
      let { tool, call } = buildCall(context);
      return tool.validateInput
        ? tool.validateInput(input, call)
        : {
            result: true,
          };
    },
    checkPermissions: (input, context) => {
      let checkRunner = getCheckRunner(context?.session, def.name);
      if (checkRunner) {
        let defaultDecision = {
          behavior: "passthrough",
          message: `${def.name} requires permission.`,
        };
        return checkRunner.checkPermissions === undefined || context.toolUseId === undefined
          ? Promise.resolve(defaultDecision)
          : checkRunner
              .checkPermissions(merged, input, context)
              .then((decision) => decision ?? defaultDecision);
      }
      let { tool, call } = buildCall(context);
      return tool.checkPermissions
        ? tool.checkPermissions(input, call)
        : Promise.resolve({
            behavior: "allow",
            updatedInput: input,
          });
    },
    permissionCheckFailureDecision: (input, context) => {
      if (getCheckRunner(context?.session, def.name))
        return {
          behavior: "deny",
          message: `${def.name} was not run: its permission check could not be completed.`,
          decisionReason: {
            type: "other",
            reason: "permission check failed",
          },
        };
      if (!createReturnsMethod(create, "permissionCheckFailureDecision")) return;
      let { tool, call } = buildCall(context);
      return tool.permissionCheckFailureDecision?.(input, call);
    },
  };
  let merged = Object.assign(
    Object.defineProperties(
      {
        ...TOOL_DEFAULTS,
        userFacingName: () => def.name,
      },
      Object.getOwnPropertyDescriptors(def),
    ),
    overrides,
  );
  return merged;
}
//@ chunk-g54kbxqw.js:170242-170425 placement
/**
 * 判断工具是否是 V2 多条目别名工具（有 underlyingV1ToolName、entryFieldName、perEntryHookInputs、reassemble），这类工具的 hook 按条目拆分。
 */
function isMultiEntryAliasTool(tool) {
  let candidate = tool;
  return (
    typeof candidate.underlyingV1ToolName === "string" &&
    typeof candidate.entryFieldName === "string" &&
    typeof candidate.perEntryHookInputs === "function" &&
    typeof candidate.reassemble === "function"
  );
}
//@ chunk-g54kbxqw.js:170425-170588 placement
/**
 * 工具的 name、underlyingV1ToolName 或 familyParentToolName 任一在给定集合（Set 或数组）中即为真。延迟加载判定、REPL 过滤都用它。
 */
function toolMatchesAnyName(tool, names) {
  return (
    collectionHas(names, tool.name) ||
    (tool.underlyingV1ToolName !== undefined && collectionHas(names, tool.underlyingV1ToolName)) ||
    (tool.familyParentToolName !== undefined && collectionHas(names, tool.familyParentToolName))
  );
}
//@ chunk-g54kbxqw.js:170588-170644 placement
function collectionHas(names, name) {
  return "has" in names ? names.has(name) : names.includes(name);
}
export { toolMatchesAnyName, buildTool, isMultiEntryAliasTool };
