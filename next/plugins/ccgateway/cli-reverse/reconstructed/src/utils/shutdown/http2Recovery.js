/**
 * utils/shutdown/http2Recovery.ts
 *
 * 2.1.316 新增：HTTP/2 恢复
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * new in 2.1.318 (2.1.88 has no file at this path)
 * pieces: chunk-5xgkngpb.js (3)
 * attribution: placement 3
 * (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.
 */

//@ chunk-5xgkngpb.js:245142-245203 placement
var HTTP2_STREAM_CLOSED_PATTERN = /^Stream closed with error code NGHTTP2_[A-Z0-9_]+$/;
//@ chunk-5xgkngpb.js:245203-245365 placement (2.1.88 match: shortErrorStack, 0.826)
var HTTP2_SESSION_CLOSED_RE = /^Session closed with error code \d+$/;
var stackHasFrame = (stack, framePattern) =>
  typeof stack === "string" &&
  stack
    .split(
      `
`,
    )
    .some((line) => {
      let trimmed = line.trim();
      return trimmed.startsWith("at ") && trimmed.includes(framePattern);
    });
//@ chunk-5xgkngpb.js:245365-245852 placement
function isHttp2TransportError(error) {
  try {
    let code = error.code;
    if (code === "ERR_HTTP2_STREAM_ERROR")
      return (
        typeof error.message === "string" &&
        HTTP2_STREAM_CLOSED_PATTERN.test(error.message) &&
        stackHasFrame(error.stack, "emitStreamErrorNT (node:http2:")
      );
    if (code === "ERR_HTTP2_GOAWAY_SESSION")
      return (
        error.message === "New streams cannot be created after receiving a GOAWAY" &&
        stackHasFrame(error.stack, "streamRejectedByGoawaySession (node:http2:")
      );
    if (code === "ERR_HTTP2_SESSION_ERROR")
      return (
        typeof error.message === "string" &&
        HTTP2_SESSION_CLOSED_RE.test(error.message) &&
        stackHasFrame(error.stack, "goaway (node:http2:")
      );
    return false;
  } catch {
    return false;
  }
}
export { isHttp2TransportError };
