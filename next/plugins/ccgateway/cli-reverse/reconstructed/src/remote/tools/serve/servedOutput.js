/**
 * remote/tools/serve/servedOutput.ts
 *
 * 2.1.316 新增。把远端服务调用的输出编码为工具结果。
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * new in 2.1.318 (2.1.88 has no file at this path)
 * pieces: chunk-9qqbv5eq.js (3)
 * attribution: placement 3
 * (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.
 */
import { randomBytes } from "crypto";
import { buildRemoteToolCallResult, toRemoteToolContentBlocks } from "../callResults.js";
import { REMOTE_TOOL_PROTOCOL_VERSION } from "../protocolConstants.js";
import { currentMachineLabel } from "../../../bridge/deviceRegistration.js";
import { getCwd } from "../../../utils/cwd.js";

//@ chunk-9qqbv5eq.js:343-503 placement
function encodeUnlistedToolResult(tool, update) {
  let result = tool.mapToolResultToToolResultBlockParam(
    update.data,
    `toolu_serve_${randomBytes(12).toString("hex")}`,
  );
  return encodeServedOutput(result?.content ?? "", update.data, result?.is_error === true);
}
//@ chunk-9qqbv5eq.js:503-663 placement
/**
 * 把远端服务调用的输出编码为工具结果。
 */
function encodeServedOutput(content, output, isError = false, notes = []) {
  return buildRemoteToolCallResult({
    envelope: {
      v: REMOTE_TOOL_PROTOCOL_VERSION,
      outcome: "completed",
      target: servedTarget(),
      is_error: isError,
      content: toRemoteToolContentBlocks(content),
      output,
      ...(notes.length > 0 && {
        notes,
      }),
    },
    content,
  });
}
//@ chunk-9qqbv5eq.js:663-713 placement
function servedTarget() {
  return {
    name: currentMachineLabel(),
    working_dir: getCwd(),
  };
}
export { servedTarget, encodeServedOutput, encodeUnlistedToolResult };
