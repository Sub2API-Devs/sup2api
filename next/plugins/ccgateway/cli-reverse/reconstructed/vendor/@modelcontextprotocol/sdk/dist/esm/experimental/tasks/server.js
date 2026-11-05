/**
 * @modelcontextprotocol/sdk/dist/esm/experimental/tasks/server.js
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * third-party: @modelcontextprotocol/sdk@1.29.0
 * pieces: chunk-d020vhv1.js (1)
 * attribution: esm-fingerprint 1
 * (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.
 */
import { CreateMessageResultSchema, ElicitResultSchema } from "../../types.js";

//@ chunk-d020vhv1.js:351-2223 esm-fingerprint
class ExperimentalServerTasks {
  constructor(_server) {
    this._server = _server;
  }
  requestStream(request, resultSchema, options) {
    return this._server.requestStream(request, resultSchema, options);
  }
  createMessageStream(params, options) {
    let clientCapabilities = this._server.getClientCapabilities();
    if ((params.tools || params.toolChoice) && !clientCapabilities?.sampling?.tools)
      throw Error("Client does not support sampling tools capability.");
    if (params.messages.length > 0) {
      let lastMessage = params.messages[params.messages.length - 1];
      let lastContent = Array.isArray(lastMessage.content) ? lastMessage.content : [lastMessage.content];
      let hasToolResults = lastContent.some((c) => c.type === "tool_result");
      let previousMessage =
        params.messages.length > 1 ? params.messages[params.messages.length - 2] : undefined;
      let previousContent = previousMessage
        ? Array.isArray(previousMessage.content)
          ? previousMessage.content
          : [previousMessage.content]
        : [];
      let hasPreviousToolUse = previousContent.some((c) => c.type === "tool_use");
      if (hasToolResults) {
        if (lastContent.some((c) => c.type !== "tool_result"))
          throw Error("The last message must contain only tool_result content if any is present");
        if (!hasPreviousToolUse)
          throw Error("tool_result blocks are not matching any tool_use from the previous message");
      }
      if (hasPreviousToolUse) {
        let toolUseIds = new Set(previousContent.filter((c) => c.type === "tool_use").map((c) => c.id));
        let toolResultIds = new Set(
          lastContent.filter((c) => c.type === "tool_result").map((c) => c.toolUseId),
        );
        if (toolUseIds.size !== toolResultIds.size || ![...toolUseIds].every((id) => toolResultIds.has(id)))
          throw Error("ids of tool_result blocks and tool_use blocks from previous message do not match");
      }
    }
    return this.requestStream(
      {
        method: "sampling/createMessage",
        params,
      },
      CreateMessageResultSchema,
      options,
    );
  }
  elicitInputStream(params, options) {
    let clientCapabilities = this._server.getClientCapabilities();
    let mode = params.mode ?? "form";
    switch (mode) {
      case "url": {
        if (!clientCapabilities?.elicitation?.url) throw Error("Client does not support url elicitation.");
        break;
      }
      case "form": {
        if (!clientCapabilities?.elicitation?.form) throw Error("Client does not support form elicitation.");
        break;
      }
    }
    let normalizedParams =
      mode === "form" && params.mode === undefined
        ? {
            ...params,
            mode: "form",
          }
        : params;
    return this.requestStream(
      {
        method: "elicitation/create",
        params: normalizedParams,
      },
      ElicitResultSchema,
      options,
    );
  }
  async getTask(taskId, options) {
    return this._server.getTask(
      {
        taskId,
      },
      options,
    );
  }
  async getTaskResult(taskId, resultSchema, options) {
    return this._server.getTaskResult(
      {
        taskId,
      },
      resultSchema,
      options,
    );
  }
  async listTasks(cursor, options) {
    return this._server.listTasks(
      cursor
        ? {
            cursor,
          }
        : undefined,
      options,
    );
  }
  async cancelTask(taskId, options) {
    return this._server.cancelTask(
      {
        taskId,
      },
      options,
    );
  }
}
export { ExperimentalServerTasks };
