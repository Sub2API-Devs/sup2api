/**
 * entrypoints/mcp/sessionEndHooks.ts
 *
 * 2.1.316 新增：运行 mcp serve 会话持有的 SessionEnd hooks（可中止），上报结果；解析 MCP 调用 _meta 中携带的 SessionEnd hook 描述（超过 8 KiB 或不可读时忽略）。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-877zq7yv.js (4)
 * attribution: placement 4
 */
import { DoctorLazy } from "../../cli/handlers/util.js";
import { objectSchema, stringSchema, array } from "../../../vendor/zod/v4/classic/schemas.js";
import { HostScoped } from "../../utils/hostScoped.js";
import {
  EMPTY_SESSION_HOOKS_NAME,
  MAX_INJECTED_CONFIG_BYTES,
  ANTHROPIC_SESSIONENDHOOKS,
} from "../../services/analytics/metadata.js";
import { registerHookCallbacks } from "../../bootstrap/state.js";
import { safeParseJSON } from "../../utils/json.js";
import { logForDebugging } from "../../utils/debug.js";
import { createAbortController } from "../../utils/abortController.js";
import { runRemotePluginHook } from "../../services/remoteTools/runPluginHook.js";
import { count } from "../../utils/collections.js";
import { logFeatureOk, logFeatureSad } from "../../services/analytics/featureTelemetry.js";

//@ chunk-877zq7yv.js:15269-15407 placement
var sessionEndHookMetaSchema = DoctorLazy(() =>
  objectSchema({
    jsonInput: stringSchema(),
    hooks: array(
      objectSchema({
        pluginId: stringSchema(),
        command: stringSchema(),
        args: array(stringSchema()).optional(),
      }),
    ),
  }),
);
var sessionEndHookStateByHost = new HostScoped(() => ({
  stated: EMPTY_SESSION_HOOKS_NAME,
  isRegistered: false,
}));
//@ chunk-877zq7yv.js:15407-15678 placement
/**
 * 记录调用方声明的 SessionEnd hook 描述（每个宿主一份）；首次解析出有效描述时注册一个内部 SessionEnd 回调，会话结束时运行这些持有的 hook。
 */
function registerHeldSessionEndHooks(meta, sessionContext) {
  let state = sessionEndHookStateByHost.of(sessionContext.session.host);
  if (meta === undefined || meta === state.stated) return;
  state.stated = meta;
  state.named = parseSessionEndHookMeta(meta);
  if (state.named === undefined || state.isRegistered) return;
  state.isRegistered = true;
  registerHookCallbacks({
    SessionEnd: [
      {
        hooks: [
          {
            type: "callback",
            internal: true,
            callback: async (input, toolUseId, options) => {
              await runHeldSessionEndHooks(state.named, sessionContext, options);
              return {};
            },
          },
        ],
      },
    ],
  });
}
//@ chunk-877zq7yv.js:15678-15979 placement
/**
 * 解析 MCP 调用 _meta 中携带的 SessionEnd hook 描述（超过 8 KiB 或不可读时忽略）。
 */
function parseSessionEndHookMeta(raw) {
  if (raw === EMPTY_SESSION_HOOKS_NAME) return;
  let parsed =
    typeof raw === "string" && Buffer.byteLength(raw) <= MAX_INJECTED_CONFIG_BYTES
      ? sessionEndHookMetaSchema().safeParse(safeParseJSON(raw, false))
      : undefined;
  if (!parsed?.success) {
    logForDebugging(
      `mcp serve: a call's _meta['${ANTHROPIC_SESSIONENDHOOKS}'] cannot be read or is over 8 KiB, so no SessionEnd hook is held`,
      {
        level: "warn",
      },
    );
    return;
  }
  return parsed.data.hooks.length > 0 ? parsed.data : undefined;
}
//@ chunk-877zq7yv.js:15979-16514 placement
/**
 * 运行 mcp serve 会话持有的 SessionEnd hooks（可中止），上报结果。
 */
async function runHeldSessionEndHooks(named, sessionContext, options) {
  if (named === undefined) return;
  let abortController = createAbortController();
  if (options?.aborted) abortController.abort();
  options?.addEventListener("abort", () => abortController.abort(), {
    once: true,
  });
  let settled = await Promise.allSettled(
    named.hooks.map((hook) =>
      runRemotePluginHook(
        {
          ...hook,
          hookEvent: "SessionEnd",
          jsonInput: named.jsonInput,
        },
        {
          ...sessionContext,
          abortController,
        },
        undefined,
      ),
    ),
  );
  let summary = {
    num_named: settled.length,
    num_run: count(
      settled,
      (result) =>
        result.status === "fulfilled" &&
        !result.value.output.spawnFailed &&
        !result.value.output.notStarted &&
        !result.value.output.aborted,
    ),
  };
  if (summary.num_run === summary.num_named) logFeatureOk("mcp_serve_session_end_hooks", summary);
  else logFeatureSad("mcp_serve_session_end_hooks", "some_not_run", summary);
}
export { registerHeldSessionEndHooks };
