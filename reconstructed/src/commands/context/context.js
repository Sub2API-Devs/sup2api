/**
 * commands/context/context.tsx
 *
 * 并入已有模块：/context 命令：显示上下文用量；远程会话通过控制通道获取。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/commands/context/context.tsx
 * pieces: chunk-10q8r8ck.js (1)
 * attribution: placement 1
 */
import { Jn, _C, cwr } from "../../remote/remoteMode.js";
import { requestContextUsage } from "../../entrypoints/sdk/controlSchemas.js";
import { isBridgeOrTransport } from "../../cli/transportState.js";
import { renderToAnsiString } from "../../utils/staticRender.js";
import { e } from "../../../vendor/react/cjs/react-jsx-dev-runtime.react-server.production.js";
import { ContextVisualization } from "../../components/ContextVisualization.js";
import { formatContextAsMarkdownTable } from "./context-noninteractive.js";
import { isAbortError, errorMessage } from "../../utils/errors.js";
import { logForDebugging } from "../../utils/debug.js";
import { Us } from "../../services/projects/threadRows.js";
import { analyzeContextUsage } from "../../utils/analyzeContext.js";

/**
 * /context 命令：显示上下文用量；远程会话通过控制通道获取。
 */
//@ chunk-10q8r8ck.js:27146-28617 placement
async function call(onDone, context, args) {
  let i = context.presentation === "fullscreen" && args.trim().toLowerCase() !== "all",
    l = Jn();
  if (l) {
    if (!_C("controlChannel"))
      return (onDone("Context usage isn't available over this remote connection"), null);
    try {
      let p = await requestContextUsage(l, { signal: context.abortController.signal });
      if (!p)
        return (
          onDone("Couldn't show context usage: the remote sent a reply this version can't display"),
          null
        );
      let f = isBridgeOrTransport(context.session),
        H = f ? { ...p, memoryFiles: [] } : p,
        g = await renderToAnsiString(e(ContextVisualization, { data: H, collapseDetailSections: i }), {
          storageV5: context.storageV5,
        });
      if (!f && isBridgeOrTransport(context.session))
        ((f = !0),
          (H = { ...p, memoryFiles: [] }),
          (g = await renderToAnsiString(e(ContextVisualization, { data: H, collapseDetailSections: i }), {
            storageV5: context.storageV5,
          })));
      onDone(g, { display: "system", metaMessages: [formatContextAsMarkdownTable(H)] });
    } catch (error) {
      if (isAbortError(error)) return (onDone(cwr), null);
      let f = isBridgeOrTransport(context.session);
      if (f) logForDebugging(`/context remote fetch failed: ${errorMessage(error)}`, { level: "error" });
      onDone(
        f
          ? "Couldn't fetch context from remote"
          : `Couldn't fetch context from remote: ${errorMessage(error)}`,
      );
    }
    return null;
  }
  let {
      messages: messages,
      getAppState: getAppState,
      options: { mainLoopModel: x, tools: A },
    } = context,
    L = Us(messages),
    y = process.stdout.columns || 80,
    k = getAppState(),
    T = await analyzeContextUsage(L, x, async () => k.toolPermissionContext, A, k.agentDefinitions, {
      session: context.session,
      terminalWidth: y,
      toolUseContext: context,
      originalMessages: L,
      configuredWindow: k.autoCompactWindow,
    }),
    R = isBridgeOrTransport(context.session),
    E = R ? { ...T, memoryFiles: [] } : T,
    Q = await renderToAnsiString(e(ContextVisualization, { data: E, collapseDetailSections: i }), {
      storageV5: context.storageV5,
    });
  if (!R && isBridgeOrTransport(context.session))
    ((E = { ...T, memoryFiles: [] }),
      (Q = await renderToAnsiString(e(ContextVisualization, { data: E, collapseDetailSections: i }), {
        storageV5: context.storageV5,
      })));
  return (onDone(Q, { display: "system", metaMessages: [formatContextAsMarkdownTable(E)] }), null);
}
