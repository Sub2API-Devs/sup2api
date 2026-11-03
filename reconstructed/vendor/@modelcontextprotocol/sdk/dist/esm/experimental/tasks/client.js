/**
 * @modelcontextprotocol/sdk/dist/esm/experimental/tasks/client.js
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * third-party: @modelcontextprotocol/sdk@1.29.0
 * pieces: chunk-z1n5m6nf.js (1)
 * attribution: esm-fingerprint 1
 */
import { CallToolResultSchema, McpError, ErrorCode } from "../../types.js";

//@ chunk-z1n5m6nf.js:16536-17770 esm-fingerprint
class Zt {
  constructor(e) {
    this._client = e;
  }
  async *callToolStream(e, r = CallToolResultSchema, n) {
    let _client = this._client,
      h = { ...n, task: n?.task ?? (_client.isToolTask(e.name) ? {} : void 0) },
      requestStream = _client.requestStream({ method: "tools/call", params: e }, r, h),
      toolOutputValidator = _client.getToolOutputValidator(e.name);
    for await (let T of requestStream) {
      if (T.type === "result" && toolOutputValidator) {
        let M = T.result;
        if (!M.structuredContent && !M.isError) {
          yield {
            type: "error",
            error: new McpError(
              ErrorCode.InvalidRequest,
              `Tool ${e.name} has an output schema but did not return structured content`,
            ),
          };
          return;
        }
        if (M.structuredContent)
          try {
            let w = toolOutputValidator(M.structuredContent);
            if (!w.valid) {
              yield {
                type: "error",
                error: new McpError(
                  ErrorCode.InvalidParams,
                  `Structured content does not match the tool's output schema: ${w.errorMessage}`,
                ),
              };
              return;
            }
          } catch (error) {
            if (error instanceof McpError) {
              yield { type: "error", error: error };
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
      yield T;
    }
  }
  async getTask(e, r) {
    return this._client.getTask({ taskId: e }, r);
  }
  async getTaskResult(e, r, n) {
    return this._client.getTaskResult({ taskId: e }, r, n);
  }
  async listTasks(e, r) {
    return this._client.listTasks(e ? { cursor: e } : void 0, r);
  }
  async cancelTask(e, r) {
    return this._client.cancelTask({ taskId: e }, r);
  }
  requestStream(e, r, n) {
    return this._client.requestStream(e, r, n);
  }
}

export { Zt };
