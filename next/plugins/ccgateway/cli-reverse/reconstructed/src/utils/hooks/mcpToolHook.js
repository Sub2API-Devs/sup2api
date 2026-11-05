/**
 * utils/hooks/mcpToolHook.ts
 *
 * mcp_tool 钩子的执行：等 MCP server 连接后调用钩子并返回结果（2.1.318 新增）
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * new in 2.1.318 (2.1.88 has no file at this path)
 * pieces: chunk-5xgkngpb.js (1)
 * attribution: placement 1
 * (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.
 */
import { TOOL_HOOK_EXECUTION_TIMEOUT_MS } from "./hookEvents.js";
import {
  getMcpClientsFromAccessor,
  isDiskless,
  getEnsureConnectedClient,
  getRootSession,
} from "../../bootstrap/state.js";
import { logError } from "../log.js";
import {
  CLOUD_HOOK_UNSUPPORTED_REASON,
  waitForMcpClientReady,
  refuseArtifactsMcpHook,
  refuseRemoteBrowserHook,
  interpolateHookInput,
} from "../hooks.js";
import { releaseMcpCgroupAtHookFire } from "./mcpToolHookCgroup.js";
import { mcpToolHookEventUnavailableText } from "./hookInputRewrite.js";
import { logForDebugging } from "../debug.js";
import { HOOK_EVENT_NAMES } from "./hookEventSets.js";
import { getConnectionTimeoutMs } from "../../services/mcp/client.js";
import { MEMORY_SERVER_MAX } from "../../plugins/functionHooks/uiApi.js";
import { isConnectedOrCached } from "../../skills/bundled/scheduleRemoteAgents.js";
import { createCombinedAbortSignal } from "../combinedAbortSignal.js";
import { isMemoryToolServer_2, MEMORY_CALLER_META_KEY } from "../../memdir/memoryTool.js";
import {
  isMemoryToolAllowed,
  accountMemoryServerState,
} from "../../services/accountMemory/accountMemoryServer.js";
import { subagentMemoryMode } from "../../services/accountMemory/memoryContext.js";
import { recordToolUsed } from "../../services/compact/keptTools.js";
import { buildMcpToolName } from "../../services/mcp/mcpStringUtils.js";
import { callMcpTool } from "../../services/mcp/mcpWireUtils.js";
import { errorMessage } from "../errors.js";

//@ chunk-5xgkngpb.js:3499823-3502696 placement
/**
 * 执行 mcp_tool 钩子：先等对应 MCP server 连上（受超时与 abort 约束），再取 body 调钩子，返回 ok/body/error。
 */
async function executeMcpToolHook(
  hook,
  hookEventName,
  interpolationContext,
  clients,
  signal,
  defaultTimeoutMs = TOOL_HOOK_EXECUTION_TIMEOUT_MS,
  memoryMode,
  getClients = getMcpClientsFromAccessor,
) {
  if (isDiskless() && getClients === getMcpClientsFromAccessor) {
    logError(Error("an MCP tool hook got past keepWhileDiskless in a diskless session and was not called"));
    return {
      ok: false,
      body: "",
      withheld: true,
      error: `MCP tool hook not run: ${CLOUD_HOOK_UNSUPPORTED_REASON}`,
    };
  }
  releaseMcpCgroupAtHookFire(hook.server, hookEventName);
  let clientList = clients ?? getMcpClientsFromAccessor();
  if (clientList === undefined) {
    let skipReason = mcpToolHookEventUnavailableText(hookEventName);
    logForDebugging(`Hooks: mcp_tool hook skipped \u2014 ${skipReason}`, {
      level: "warn",
    });
    return {
      ok: false,
      body: "",
      error: skipReason,
    };
  }
  let timeoutMs = hook.timeout ? hook.timeout * 1000 : defaultTimeoutMs;
  let deadline = Date.now() + timeoutMs;
  let found = clientList.find((client) => client.name === hook.server);
  if (found === undefined && clients !== undefined)
    found = getClients()?.find((client) => client.name === hook.server);
  if (found?.type === "pending" && !HOOK_EVENT_NAMES.has(hookEventName)) {
    let min = Math.min(timeoutMs, getConnectionTimeoutMs());
    logForDebugging(
      `Hooks: mcp_tool hook for ${hookEventName} is waiting up to ${min}ms (less if the server is retrying) for MCP server '${hook.server}' to finish connecting`,
    );
    let now = Date.now();
    let readyClient = await waitForMcpClientReady(hook.server, min, signal, getClients);
    if (signal?.aborted)
      return {
        ok: false,
        body: "",
        aborted: true,
      };
    let waitedMs = Date.now() - now;
    if (readyClient) {
      found = readyClient;
      logForDebugging(`Hooks: MCP server '${hook.server}' is now ${readyClient.type} after ${waitedMs}ms`);
    } else
      logForDebugging(
        waitedMs < MEMORY_SERVER_MAX
          ? `Hooks: no live MCP client list tracks '${hook.server}'; not waiting for it`
          : `Hooks: stopped waiting for MCP server '${hook.server}' after ${waitedMs}ms; it has not connected`,
        {
          level: "warn",
        },
      );
  }
  if (!found || !isConnectedOrCached(found)) {
    let notConnectedReason = `MCP server '${hook.server}' not connected`;
    logForDebugging(`Hooks: mcp_tool hook skipped \u2014 ${notConnectedReason}`, {
      level: "warn",
    });
    return {
      ok: false,
      body: "",
      error: notConnectedReason,
    };
  }
  let refusal = refuseArtifactsMcpHook(hook.server, found.config) ?? refuseRemoteBrowserHook(found.name);
  if (refusal !== null) {
    logForDebugging(`Hooks: mcp_tool hook refused \u2014 ${refusal}`, {
      level: "warn",
    });
    return {
      ok: false,
      body: "",
      error: refusal,
      withheld: true,
    };
  }
  let input = hook.input ? interpolateHookInput(hook.input, interpolationContext) : {};
  let remainingMs = deadline - Date.now();
  if (remainingMs <= 0)
    return {
      ok: false,
      body: "",
      aborted: true,
    };
  let { signal: signal_2, cleanup } = createCombinedAbortSignal(signal, {
    timeoutMs: remainingMs,
  });
  try {
    logForDebugging(
      `Hooks: mcp_tool calling ${hook.server}/${hook.tool} with ${Object.keys(input).length} arg(s)`,
    );
    let ensureConnectedClient = getEnsureConnectedClient();
    if (!ensureConnectedClient) {
      cleanup();
      let notConnectedText = `MCP server '${hook.server}' not connected`;
      logForDebugging(`Hooks: mcp_tool hook skipped \u2014 ${notConnectedText}`, {
        level: "warn",
      });
      return {
        ok: false,
        body: "",
        error: notConnectedText,
      };
    }
    let connectedClient = await ensureConnectedClient(found, {
      signal,
      timeoutMs: Math.min(remainingMs, getConnectionTimeoutMs()),
      context: "mcp_tool hook",
    });
    let refusal =
      refuseArtifactsMcpHook(hook.server, connectedClient.config) ??
      refuseRemoteBrowserHook(connectedClient.name);
    if (refusal !== null) {
      cleanup();
      logForDebugging(`Hooks: mcp_tool hook refused \u2014 ${refusal}`, {
        level: "warn",
      });
      return {
        ok: false,
        body: "",
        error: refusal,
        withheld: true,
      };
    }
    let isMemoryServer = isMemoryToolServer_2(connectedClient);
    if (
      isMemoryServer &&
      isMemoryToolAllowed(
        hook.tool,
        accountMemoryServerState([connectedClient], memoryMode ?? subagentMemoryMode(getRootSession().host))
          .mode,
      )
    ) {
      cleanup();
      let refusal = `The account memory server's ${hook.tool} is not available to a hook in this session`;
      logForDebugging(`Hooks: mcp_tool hook refused \u2014 ${refusal}`, {
        level: "warn",
      });
      return {
        ok: false,
        body: "",
        error: refusal,
        withheld: true,
      };
    }
    recordToolUsed(buildMcpToolName(hook.server, hook.tool));
    let result = await callMcpTool(
      connectedClient,
      {
        name: hook.tool,
        arguments: input,
        ...(isMemoryServer && {
          _meta: {
            [MEMORY_CALLER_META_KEY]: "worker",
          },
        }),
      },
      {
        signal: signal_2,
        timeout: remainingMs,
      },
    );
    cleanup();
    let body = Array.isArray(result.content)
      ? result.content.map((contentBlock) =>
          contentBlock.type === "text" ? contentBlock.text : `[${contentBlock.type}]`,
        ).join(`
`)
      : "";
    if (result.isError)
      return {
        ok: false,
        body,
        error: body || "MCP tool returned an error",
      };
    return {
      ok: true,
      body,
    };
  } catch (error) {
    cleanup();
    if (signal_2.aborted)
      return {
        ok: false,
        body: "",
        aborted: true,
      };
    let errorText = errorMessage(error);
    logForDebugging(`Hooks: mcp_tool hook error: ${errorText}`, {
      level: "error",
    });
    return {
      ok: false,
      body: "",
      error: errorText,
      thrown: error,
    };
  }
}
export { executeMcpToolHook };
