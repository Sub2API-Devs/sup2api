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

/**
 * 用全 undefined 的 Proxy 调一次 create，探测返回对象里是否有指定方法（避免为不实现 permissionCheckFailureDecision 的工具构造真实上下文）。
 */
//@ chunk-g54kbxqw.js:167050-167123 placement
function createReturnsMethod(e, n) {
  let proxy = new Proxy(
    {},
    {
      get: () => {
        return;
      },
    },
  );
  return n in e(proxy);
}
/**
 * 316 的工具工厂（旧版 buildTool）。定义里的 create(ctx) 返回 {validateInput, checkPermissions, call, permissionCheckFailureDecision}；工厂把它们包成统一签名，注入 call 上下文（signal、onProgress、ask、runEngine、权限阶段等），并在工具"在别处运行"（nae 判定，原生工具转发）时改走 Jo 转发或拒绝。缺省 checkPermissions 为 allow、validateInput 为通过。
 */
//@ chunk-g54kbxqw.js:167123-170242 placement
function buildTool(def) {
  let create = def.create,
    s = (k, C) => (assertNativeToolRunsHere(def.name, C), create.call(def, k)),
    r = (k, C, R, S, w) => ({
      tool: s(createToolUseContextView(k), k?.session),
      call: {
        parentMessage: R,
        userModified: w?.userModified,
        globLimits: w?.globLimits,
        userTypedShellDispatch: w?.userTypedShellDispatch,
        pdfRenderSignal: w?.pdfRenderSignal,
        gitDiffRead: w?.gitDiffRead,
        outsideResultReader: w?.outsideResultReader,
        ...!1,
        smallResultAsked: w?.smallResultAsked,
        callerLogsSharedEvents: w?.callerLogsSharedEvents,
        timing: w?.timing,
        runEngine: (P, L) =>
          P({
            ...L,
            toolUseContext: k.permissionRound === void 0 ? k : { ...k, permissionRound: void 0 },
            canUseTool: S,
          }),
        ask:
          S && R
            ? (P, L) => {
                let j = runPermissionCheckWithReentry(
                  S,
                  merged,
                  L.withdraw === void 0
                    ? k
                    : { ...k, abortController: withdrawablePromptScope(k.abortController, L.withdraw) },
                  R,
                  P,
                  L,
                );
                return L.toolUseId === k.toolUseId
                  ? j
                  : j.finally(() => clearToolUsePermissionState(k.session, L.toolUseId));
              }
            : void 0,
        get toolUseId() {
          return k.toolUseId;
        },
        get signal() {
          return k.abortController.signal;
        },
        get permissionPhase() {
          return k.permissionPhase;
        },
        get permissionRound() {
          return k.permissionRound;
        },
        abort: (P) => k.abortController.abort(P),
        abortTurn: (P) => turnAbortControllerOf(k.abortController).abort(P),
        onProgress: C,
        get innerCall() {
          return k.innerCall;
        },
        get shellWallCapMs() {
          return k.shellWallCapMs;
        },
        get promptShellPluginId() {
          return k.promptShellPluginId;
        },
        get fileReadingLimits() {
          return k.fileReadingLimits;
        },
        get sameTurnToolUses() {
          return k.sameTurnToolUses;
        },
        get remoteCall() {
          return k.remoteCall;
        },
        get keptBackgroundShells() {
          return k.keptBackgroundShells;
        },
        get inputFromAnotherMachine() {
          return k.inputFromAnotherMachine;
        },
        get permissionSurface() {
          return k.toolUseId === void 0 ? void 0 : k.toolDecisions.get(k.toolUseId)?.surface;
        },
      },
    }),
    h = {
      create: (k) => s(k, k.session),
      call: (k, C, R, S, w, P) => {
        let L = getCheckRunner(C?.session, def.name),
          j =
            P?.runnerCheckedHere !== void 0 && L !== void 0 && hasRegisteredCheck(C?.session, def.name)
              ? P.runnerCheckedHere
              : L;
        if (P?.permissionCheckedFor !== void 0 && P.permissionCheckedFor !== j)
          return Promise.reject(
            new NativeToolElsewhereError(
              `${def.name} was not run: where it runs changed after its permission was checked. Send the call again.`,
              "NOT_RUN",
            ),
          );
        if (j) return runPermissionCheck(def, j, k, C.abortController.signal, C, P, S?.message.model);
        let { tool: tool, call: q } = r(C, w, S, R, P);
        return tool.call(k, q);
      },
      validateInput: async (k, C) => {
        let R = getCheckRunner(C?.session, def.name);
        if (R) {
          let P = R.refusedUnasked?.(k, C);
          return P === void 0 ? NATIVE_TOOL_OK : { result: !1, message: P, errorCode: 1 };
        }
        let { tool: tool, call: w } = r(C);
        return tool.validateInput ? tool.validateInput(k, w) : { result: !0 };
      },
      checkPermissions: (k, C) => {
        let R = getCheckRunner(C?.session, def.name);
        if (R) {
          let P = { behavior: "passthrough", message: `${def.name} requires permission.` };
          return R.checkPermissions === void 0 || C.toolUseId === void 0
            ? Promise.resolve(P)
            : R.checkPermissions(merged, k, C).then((L) => L ?? P);
        }
        let { tool: tool, call: w } = r(C);
        return tool.checkPermissions
          ? tool.checkPermissions(k, w)
          : Promise.resolve({ behavior: "allow", updatedInput: k });
      },
      permissionCheckFailureDecision: (k, C) => {
        if (getCheckRunner(C?.session, def.name))
          return {
            behavior: "deny",
            message: `${def.name} was not run: its permission check could not be completed.`,
            decisionReason: { type: "other", reason: "permission check failed" },
          };
        if (!createReturnsMethod(create, "permissionCheckFailureDecision")) return;
        let { tool: tool, call: S } = r(C);
        return tool.permissionCheckFailureDecision?.(k, S);
      },
    },
    merged = Object.assign(
      Object.defineProperties(
        { ...TOOL_DEFAULTS, userFacingName: () => def.name },
        Object.getOwnPropertyDescriptors(def),
      ),
      h,
    );
  return merged;
}
/**
 * 判断工具是否是 V2 多条目别名工具（有 underlyingV1ToolName、entryFieldName、perEntryHookInputs、reassemble），这类工具的 hook 按条目拆分。
 */
//@ chunk-g54kbxqw.js:170242-170425 placement
function isMultiEntryAliasTool(e) {
  let n = e;
  return (
    typeof n.underlyingV1ToolName === "string" &&
    typeof n.entryFieldName === "string" &&
    typeof n.perEntryHookInputs === "function" &&
    typeof n.reassemble === "function"
  );
}
/**
 * 工具的 name、underlyingV1ToolName 或 familyParentToolName 任一在给定集合（Set 或数组）中即为真。延迟加载判定、REPL 过滤都用它。
 */
//@ chunk-g54kbxqw.js:170425-170588 placement
function toolMatchesAnyName(tool, names) {
  return (
    collectionHas(names, tool.name) ||
    (tool.underlyingV1ToolName !== void 0 && collectionHas(names, tool.underlyingV1ToolName)) ||
    (tool.familyParentToolName !== void 0 && collectionHas(names, tool.familyParentToolName))
  );
}
//@ chunk-g54kbxqw.js:170588-170644 placement
function collectionHas(e, n) {
  return "has" in e ? e.has(n) : e.includes(n);
}

export { toolMatchesAnyName, buildTool, isMultiEntryAliasTool };
