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
import { u, o, A } from "../../../vendor/zod/v4/classic/schemas.js";
import { HostScoped } from "../../utils/hostScoped.js";
import { gas, uTi, ANTHROPIC_SESSIONENDHOOKS } from "../../services/analytics/metadata.js";
import { registerHookCallbacks } from "../../bootstrap/state.js";
import { safeParseJSON } from "../../utils/json.js";
import { logForDebugging } from "../../utils/debug.js";
import { createAbortController } from "../../utils/abortController.js";
import { runRemotePluginHook } from "../../services/remoteTools/runPluginHook.js";
import { count } from "../../utils/collections.js";
import { logFeatureOk, logFeatureSad } from "../../services/analytics/featureTelemetry.js";

//@ chunk-877zq7yv.js:15269-15407 placement
var sessionEndHookMetaSchema = DoctorLazy(() =>
    u({ jsonInput: o(), hooks: A(u({ pluginId: o(), command: o(), args: A(o()).optional() })) }),
  ),
  sessionEndHookStateByHost = new HostScoped(() => ({ stated: gas, isRegistered: !1 }));
/**
 * 记录调用方声明的 SessionEnd hook 描述（每个宿主一份）；首次解析出有效描述时注册一个内部 SessionEnd 回调，会话结束时运行这些持有的 hook。
 */
//@ chunk-877zq7yv.js:15407-15678 placement
function registerHeldSessionEndHooks(e, s) {
  let of = sessionEndHookStateByHost.of(s.session.host);
  if (e === void 0 || e === of.stated) return;
  if (((of.stated = e), (of.named = parseSessionEndHookMeta(e)), of.named === void 0 || of.isRegistered))
    return;
  ((of.isRegistered = !0),
    registerHookCallbacks({
      SessionEnd: [
        {
          hooks: [
            {
              type: "callback",
              internal: !0,
              callback: async (a, d, r) => (await runHeldSessionEndHooks(of.named, s, r), {}),
            },
          ],
        },
      ],
    }));
}
/**
 * 解析 MCP 调用 _meta 中携带的 SessionEnd hook 描述（超过 8 KiB 或不可读时忽略）。
 */
//@ chunk-877zq7yv.js:15678-15979 placement
function parseSessionEndHookMeta(e) {
  if (e === gas) return;
  let s =
    typeof e === "string" && Buffer.byteLength(e) <= uTi
      ? sessionEndHookMetaSchema().safeParse(safeParseJSON(e, !1))
      : void 0;
  if (!s?.success) {
    logForDebugging(
      `mcp serve: a call's _meta['${ANTHROPIC_SESSIONENDHOOKS}'] cannot be read or is over 8 KiB, so no SessionEnd hook is held`,
      { level: "warn" },
    );
    return;
  }
  return s.data.hooks.length > 0 ? s.data : void 0;
}
/**
 * 运行 mcp serve 会话持有的 SessionEnd hooks（可中止），上报结果。
 */
//@ chunk-877zq7yv.js:15979-16514 placement
async function runHeldSessionEndHooks(e, s, n) {
  if (e === void 0) return;
  let a = createAbortController();
  if (n?.aborted) a.abort();
  n?.addEventListener("abort", () => a.abort(), { once: !0 });
  let settled = await Promise.allSettled(
      e.hooks.map((hook) =>
        runRemotePluginHook(
          { ...hook, hookEvent: "SessionEnd", jsonInput: e.jsonInput },
          { ...s, abortController: a },
          void 0,
        ),
      ),
    ),
    r = {
      num_named: settled.length,
      num_run: count(
        settled,
        (i) =>
          i.status === "fulfilled" &&
          !i.value.output.spawnFailed &&
          !i.value.output.notStarted &&
          !i.value.output.aborted,
      ),
    };
  if (r.num_run === r.num_named) logFeatureOk("mcp_serve_session_end_hooks", r);
  else logFeatureSad("mcp_serve_session_end_hooks", "some_not_run", r);
}
