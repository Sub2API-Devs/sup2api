/**
 * @modelcontextprotocol/sdk/dist/esm/experimental/tasks/server.js
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * third-party: @modelcontextprotocol/sdk@1.29.0
 * pieces: chunk-exz1ts42.js (1)
 * attribution: esm-fingerprint 1
 */
import { CreateMessageResultSchema, ElicitResultSchema } from "../../types.js";

//@ chunk-exz1ts42.js:349-2221 esm-fingerprint
class g {
  constructor(e) {
    this._server = e;
  }
  requestStream(e, t, i) {
    return this._server.requestStream(e, t, i);
  }
  createMessageStream(e, t) {
    let clientCapabilities = this._server.getClientCapabilities();
    if ((e.tools || e.toolChoice) && !clientCapabilities?.sampling?.tools)
      throw Error("Client does not support sampling tools capability.");
    if (e.messages.length > 0) {
      let s = e.messages[e.messages.length - 1],
        o = Array.isArray(s.content) ? s.content : [s.content],
        any = o.some((a) => a.type === "tool_result"),
        r = e.messages.length > 1 ? e.messages[e.messages.length - 2] : void 0,
        h = r ? (Array.isArray(r.content) ? r.content : [r.content]) : [],
        any_2 = h.some((a) => a.type === "tool_use");
      if (any) {
        if (o.some((a) => a.type !== "tool_result"))
          throw Error("The last message must contain only tool_result content if any is present");
        if (!any_2) throw Error("tool_result blocks are not matching any tool_use from the previous message");
      }
      if (any_2) {
        let a = new Set(h.filter((u) => u.type === "tool_use").map((u) => u.id)),
          l = new Set(o.filter((u) => u.type === "tool_result").map((u) => u.toolUseId));
        if (a.size !== l.size || ![...a].every((u) => l.has(u)))
          throw Error("ids of tool_result blocks and tool_use blocks from previous message do not match");
      }
    }
    return this.requestStream({ method: "sampling/createMessage", params: e }, CreateMessageResultSchema, t);
  }
  elicitInputStream(e, t) {
    let clientCapabilities = this._server.getClientCapabilities(),
      s = e.mode ?? "form";
    switch (s) {
      case "url": {
        if (!clientCapabilities?.elicitation?.url) throw Error("Client does not support url elicitation.");
        break;
      }
      case "form": {
        if (!clientCapabilities?.elicitation?.form) throw Error("Client does not support form elicitation.");
        break;
      }
    }
    let o = s === "form" && e.mode === void 0 ? { ...e, mode: "form" } : e;
    return this.requestStream({ method: "elicitation/create", params: o }, ElicitResultSchema, t);
  }
  async getTask(e, t) {
    return this._server.getTask({ taskId: e }, t);
  }
  async getTaskResult(e, t, i) {
    return this._server.getTaskResult({ taskId: e }, t, i);
  }
  async listTasks(e, t) {
    return this._server.listTasks(e ? { cursor: e } : void 0, t);
  }
  async cancelTask(e, t) {
    return this._server.cancelTask({ taskId: e }, t);
  }
}

export { g };
