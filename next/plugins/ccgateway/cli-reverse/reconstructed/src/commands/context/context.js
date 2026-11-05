/**
 * commands/context/context.tsx
 *
 * 并入已有模块：/context 命令：显示上下文用量；远程会话通过控制通道获取。
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/commands/context/context.tsx
 * pieces: chunk-qt8k81nz.js (1)
 * attribution: placement 1
 * (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.
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

//@ chunk-qt8k81nz.js:28320-29791 placement
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
      let usage = await requestContextUsage(controlChannel, {
        signal: context.abortController.signal,
      });
      if (!usage) {
        onDone("Couldn't show context usage: the remote sent a reply this version can't display");
        return null;
      }
      let isBridge = isBridgeOrTransport(context.session);
      let trimmedUsage = isBridge
        ? {
            ...usage,
            memoryFiles: [],
          }
        : usage;
      let rendered = await renderToAnsiString(
        jsxProd_default(ContextVisualization, {
          data: trimmedUsage,
          collapseDetailSections,
        }),
        {
          storageV5: context.storageV5,
        },
      );
      if (!isBridge && isBridgeOrTransport(context.session)) {
        isBridge = true;
        trimmedUsage = {
          ...usage,
          memoryFiles: [],
        };
        rendered = await renderToAnsiString(
          jsxProd_default(ContextVisualization, {
            data: trimmedUsage,
            collapseDetailSections,
          }),
          {
            storageV5: context.storageV5,
          },
        );
      }
      onDone(rendered, {
        display: "system",
        metaMessages: [formatContextAsMarkdownTable(trimmedUsage)],
      });
    } catch (error) {
      if (isAbortError(error)) {
        onDone(REMOTE_STOPPED_WAITING_NOTICE);
        return null;
      }
      let isBridge = isBridgeOrTransport(context.session);
      if (isBridge)
        logForDebugging(`/context remote fetch failed: ${errorMessage(error)}`, {
          level: "error",
        });
      onDone(
        isBridge
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
  let analysis = await analyzeContextUsage(
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
  let isBridge = isBridgeOrTransport(context.session);
  let trimmedAnalysis = isBridge
    ? {
        ...analysis,
        memoryFiles: [],
      }
    : analysis;
  let rendered = await renderToAnsiString(
    jsxProd_default(ContextVisualization, {
      data: trimmedAnalysis,
      collapseDetailSections,
    }),
    {
      storageV5: context.storageV5,
    },
  );
  if (!isBridge && isBridgeOrTransport(context.session)) {
    trimmedAnalysis = {
      ...analysis,
      memoryFiles: [],
    };
    rendered = await renderToAnsiString(
      jsxProd_default(ContextVisualization, {
        data: trimmedAnalysis,
        collapseDetailSections,
      }),
      {
        storageV5: context.storageV5,
      },
    );
  }
  onDone(rendered, {
    display: "system",
    metaMessages: [formatContextAsMarkdownTable(trimmedAnalysis)],
  });
  return null;
}
export { call };
