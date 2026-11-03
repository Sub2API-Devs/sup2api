/**
 * @anthropic-ai/bedrock-sdk/core/streaming.mjs
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * third-party: @anthropic-ai/bedrock-sdk@0.33.7..0.34.3
 * pieces: chunk-h87x8cg3.js (2)
 * attribution: esm-fingerprint 2
 */
import { F } from "../AWS_restJson1.js";
import { z, W } from "../internal/shims.mjs";
import { Ce, B, _ } from "./streaming.js";
import { R } from "../AWS_restJson1.mjs";
import { pr } from "../../sdk/core/error.mjs";
import { A } from "../internal/qs/utils.js";
import { BedrockRuntimeServiceException } from "../../../@aws-sdk/client-bedrock-runtime/dist-cjs/index.js";
import { j } from "../internal/errors.mjs";

//@ chunk-h87x8cg3.js:7144-7853 esm-fingerprint
function G(e) {
  let body = e.body;
  if (!body) return e;
  async function* r() {
    let o = F(z(body), Ce());
    try {
      for await (let i of o)
        if (i.chunk && i.chunk.bytes) {
          let a = B(i.chunk.bytes),
            d = R(a);
          if (d === void 0) throw new pr(`Could not parse a Bedrock chunk into JSON: ${a}`);
          let l = A(d) && typeof d.type === "string" ? d.type : null;
          if (l != null)
            yield _(`event: ${l}
data: ${JSON.stringify(d)}

`);
        }
    } catch (error) {
      let a = Te(error);
      if (!a) throw error;
      yield _(`event: error
data: ${JSON.stringify({ type: "error", error: a })}

`);
    }
  }
  let headers = new Headers(e.headers);
  (headers.set("content-type", "text/event-stream; charset=utf-8"), headers.delete("content-length"));
  let response = new Response(W(r()), { status: e.status, statusText: e.statusText, headers: headers });
  return (Object.defineProperty(response, "url", { value: e.url }), response);
}
//@ chunk-h87x8cg3.js:7853-8101 esm-fingerprint
function Te(e) {
  if (e instanceof BedrockRuntimeServiceException)
    return { type: e.name.charAt(0).toLowerCase() + e.name.slice(1), message: e.message };
  if (e instanceof Error && Object.getPrototypeOf(e) === Error.prototype && e.name !== "Error" && !j(e))
    return { type: e.name, message: e.message };
  return;
}

export { G };
