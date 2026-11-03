/**
 * remote/tools/serve/servedOutput.ts
 *
 * 2.1.316 新增。把远端服务调用的输出编码为工具结果。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-9fr8dc9p.js (3)
 * attribution: placement 3
 */
import { randomBytes } from "crypto";
import { buildRemoteToolCallResult, toRemoteToolContentBlocks } from "../callResults.js";
import { REMOTE_TOOL_PROTOCOL_VERSION } from "../protocolConstants.js";
import { b4 } from "../../../bridge/deviceRegistration.js";
import { getCwd } from "../../../utils/cwd.js";

//@ chunk-9fr8dc9p.js:343-503 placement
function encodeUnlistedToolResult(o, t) {
  let mapToolResultToToolResultBlockParam = o.mapToolResultToToolResultBlockParam(
    t.data,
    `toolu_serve_${randomBytes(12).toString("hex")}`,
  );
  return encodeServedOutput(
    mapToolResultToToolResultBlockParam?.content ?? "",
    t.data,
    mapToolResultToToolResultBlockParam?.is_error === !0,
  );
}
/**
 * 把远端服务调用的输出编码为工具结果。
 */
//@ chunk-9fr8dc9p.js:503-663 placement
function encodeServedOutput(o, t, e = !1, r = []) {
  return buildRemoteToolCallResult({
    envelope: {
      v: REMOTE_TOOL_PROTOCOL_VERSION,
      outcome: "completed",
      target: servedTarget(),
      is_error: e,
      content: toRemoteToolContentBlocks(o),
      output: t,
      ...(r.length > 0 && { notes: r }),
    },
    content: o,
  });
}
//@ chunk-9fr8dc9p.js:663-713 placement
function servedTarget() {
  return { name: b4(), working_dir: getCwd() };
}

export { servedTarget, encodeServedOutput };
