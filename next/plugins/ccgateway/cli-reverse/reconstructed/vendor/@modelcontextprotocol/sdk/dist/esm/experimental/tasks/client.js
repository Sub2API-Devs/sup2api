/**
 * @modelcontextprotocol/sdk/dist/esm/experimental/tasks/client.js
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * third-party: @modelcontextprotocol/sdk@1.29.0
 * pieces: chunk-h44h5gdv.js (1)
 * attribution: esm-fingerprint 1
 * (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.
 */
import { CallToolResultSchema, McpError, ErrorCode } from "../../types.js";

//@ chunk-h44h5gdv.js:17952-19186 esm-fingerprint
class ExperimentalClientTasks {
  constructor(_client) {
    this._client = _client;
  }
  async *callToolStream(params, resultSchema = CallToolResultSchema, options) {
    let clientInternal = this._client;
    let optionsWithTask = {
      ...options,
      task: options?.task ?? (clientInternal.isToolTask(params.name) ? {} : undefined),
    };
    let stream = clientInternal.requestStream(
      {
        method: "tools/call",
        params,
      },
      resultSchema,
      optionsWithTask,
    );
    let validator = clientInternal.getToolOutputValidator(params.name);
    for await (let message of stream) {
      if (message.type === "result" && validator) {
        let result = message.result;
        if (!result.structuredContent && !result.isError) {
          yield {
            type: "error",
            error: new McpError(
              ErrorCode.InvalidRequest,
              `Tool ${params.name} has an output schema but did not return structured content`,
            ),
          };
          return;
        }
        if (result.structuredContent)
          try {
            let validationResult = validator(result.structuredContent);
            if (!validationResult.valid) {
              yield {
                type: "error",
                error: new McpError(
                  ErrorCode.InvalidParams,
                  `Structured content does not match the tool's output schema: ${validationResult.errorMessage}`,
                ),
              };
              return;
            }
          } catch (error) {
            if (error instanceof McpError) {
              yield {
                type: "error",
                error,
              };
              return;
            }
            yield {
              type: "error",
              error: new McpError(
                ErrorCode.InvalidParams,
                `Failed to validate structured content: ${error instanceof Error ? error.message : String(error)}`,
              ),
            };
            return;
          }
      }
      yield message;
    }
  }
  async getTask(taskId, options) {
    return this._client.getTask(
      {
        taskId,
      },
      options,
    );
  }
  async getTaskResult(taskId, resultSchema, options) {
    return this._client.getTaskResult(
      {
        taskId,
      },
      resultSchema,
      options,
    );
  }
  async listTasks(cursor, options) {
    return this._client.listTasks(
      cursor
        ? {
            cursor,
          }
        : undefined,
      options,
    );
  }
  async cancelTask(taskId, options) {
    return this._client.cancelTask(
      {
        taskId,
      },
      options,
    );
  }
  requestStream(request, resultSchema, options) {
    return this._client.requestStream(request, resultSchema, options);
  }
}
export { ExperimentalClientTasks };
