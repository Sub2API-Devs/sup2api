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
import { getRemoteCaps, hasRemoteCap, REMOTE_STOPPED_WAITING_NOTICE } from "../../remote/remoteMode.js";
import { requestContextUsage } from "../../entrypoints/sdk/controlSchemas.js";
import { isBridgeOrTransport } from "../../cli/transportState.js";
import { renderToAnsiString } from "../../utils/staticRender.js";
import { jsxProd_default } from "../../../vendor/react/cjs/react-jsx-dev-runtime.react-server.production.js";
import { ContextVisualization } from "../../components/ContextVisualization.js";
import { formatContextAsMarkdownTable } from "./context-noninteractive.js";
import { isAbortError, errorMessage } from "../../utils/errors.js";
import { logForDebugging } from "../../utils/debug.js";
import { messagesSinceCompactBoundary } from "../../services/projects/threadRows.js";
import { analyzeContextUsage } from "../../utils/analyzeContext.js";

//@ chunk-10q8r8ck.js:27146-28617 placement
/**
 * /context 命令：显示上下文用量；远程会话通过控制通道获取。
 */
async function call(onDone, context, args) {
  let collapseDetailSections = context.presentation === "fullscreen" && args.trim().toLowerCase() !== "all";
  let controlChannel = getRemoteCaps();
  if (controlChannel) {
    if (!hasRemoteCap("controlChannel")) {
      onDone("Context usage isn't available over this remote connection");
      return null;
    }
    try {
      let p = await requestContextUsage(controlChannel, {
        signal: context.abortController.signal,
      });
      if (!p) {
        onDone("Couldn't show context usage: the remote sent a reply this version can't display");
        return null;
      }
      let f = isBridgeOrTransport(context.session);
      let H = f
        ? {
            ...p,
            memoryFiles: [],
          }
        : p;
      let g = await renderToAnsiString(
        jsxProd_default(ContextVisualization, {
          data: H,
          collapseDetailSections,
        }),
        {
          storageV5: context.storageV5,
        },
      );
      if (!f && isBridgeOrTransport(context.session)) {
        f = true;
        H = {
          ...p,
          memoryFiles: [],
        };
        g = await renderToAnsiString(
          jsxProd_default(ContextVisualization, {
            data: H,
            collapseDetailSections,
          }),
          {
            storageV5: context.storageV5,
          },
        );
      }
      onDone(g, {
        display: "system",
        metaMessages: [formatContextAsMarkdownTable(H)],
      });
    } catch (error) {
      if (isAbortError(error)) {
        onDone(REMOTE_STOPPED_WAITING_NOTICE);
        return null;
      }
      let f = isBridgeOrTransport(context.session);
      if (f)
        logForDebugging(`/context remote fetch failed: ${errorMessage(error)}`, {
          level: "error",
        });
      onDone(
        f
          ? "Couldn't fetch context from remote"
          : `Couldn't fetch context from remote: ${errorMessage(error)}`,
      );
    }
    return null;
  }
  let {
    messages,
    getAppState,
    options: { mainLoopModel, tools },
  } = context;
  let messages_2 = messagesSinceCompactBoundary(messages);
  let terminalWidth = process.stdout.columns || 80;
  let appState = getAppState();
  let T = await analyzeContextUsage(
    messages_2,
    mainLoopModel,
    async () => appState.toolPermissionContext,
    tools,
    appState.agentDefinitions,
    {
      session: context.session,
      terminalWidth,
      toolUseContext: context,
      originalMessages: messages_2,
      configuredWindow: appState.autoCompactWindow,
    },
  );
  let R = isBridgeOrTransport(context.session);
  let E = R
    ? {
        ...T,
        memoryFiles: [],
      }
    : T;
  let Q = await renderToAnsiString(
    jsxProd_default(ContextVisualization, {
      data: E,
      collapseDetailSections,
    }),
    {
      storageV5: context.storageV5,
    },
  );
  if (!R && isBridgeOrTransport(context.session)) {
    E = {
      ...T,
      memoryFiles: [],
    };
    Q = await renderToAnsiString(
      jsxProd_default(ContextVisualization, {
        data: E,
        collapseDetailSections,
      }),
      {
        storageV5: context.storageV5,
      },
    );
  }
  onDone(Q, {
    display: "system",
    metaMessages: [formatContextAsMarkdownTable(E)],
  });
  return null;
}
