/**
 * utils/framedSocket.ts
 *
 * 2.1.316 新增。分帧 socket。
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * new in 2.1.318 (2.1.88 has no file at this path)
 * pieces: chunk-e8cb2esh.js (4)
 * attribution: placement 4
 * (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.
 */
import { jsonStringify, jsonParse } from "./slowOperations.js";

//@ chunk-e8cb2esh.js:229-280 placement
/**
 * 分帧 socket 的常量组：数据帧类型、控制帧类型、控制帧上限、帧头字节数、帧上限与空闲超时。
 */
var DATA_FRAME_KIND = 0;
var CONTROL_FRAME_KIND = 1;
var MAX_CONTROL_FRAME_BYTES = 262144;
var FRAME_HEADER_BYTES = 5;
var MAX_FRAME_BYTES = 1048576;
var SOCKET_IDLE_TIMEOUT_MS = 1e4;
//@ chunk-e8cb2esh.js:280-448 placement
/**
 * 编码数据帧：4 字节长度 + 1 字节类型（数据）+ 负载。
 */
function encodeDataFrame(payload) {
  let payloadBuffer = typeof payload === "string" ? Buffer.from(payload, "utf8") : payload;
  let frame = Buffer.allocUnsafe(FRAME_HEADER_BYTES + payloadBuffer.length);
  frame.writeUInt32BE(payloadBuffer.length, 0);
  frame.writeUInt8(DATA_FRAME_KIND, 4);
  payloadBuffer.copy(frame, FRAME_HEADER_BYTES);
  return frame;
}
//@ chunk-e8cb2esh.js:448-596 placement
/**
 * 编码控制帧：4 字节长度 + 1 字节类型（控制）+ JSON 负载。
 */
function encodeControlFrame(controlMessage) {
  let buffer = Buffer.from(jsonStringify(controlMessage), "utf8");
  let frame = Buffer.allocUnsafe(FRAME_HEADER_BYTES + buffer.length);
  frame.writeUInt32BE(buffer.length, 0);
  frame.writeUInt8(CONTROL_FRAME_KIND, 4);
  buffer.copy(frame, FRAME_HEADER_BYTES);
  return frame;
}
//@ chunk-e8cb2esh.js:596-1098 placement
/**
 * 创建分帧解码器：累积字节流并解析出数据帧与控制帧，帧过大、JSON 错误或未知类型时报错并停止。
 */
function createFrameDecoder(onFrame, onError) {
  let pendingBuffer = Buffer.alloc(0);
  let isFatal = false;
  return (chunk) => {
    if (isFatal) return;
    pendingBuffer = pendingBuffer.length === 0 ? chunk : Buffer.concat([pendingBuffer, chunk]);
    while (pendingBuffer.length >= FRAME_HEADER_BYTES) {
      let uInt32BE = pendingBuffer.readUInt32BE(0);
      if (uInt32BE > MAX_FRAME_BYTES) {
        isFatal = true;
        onError(`frame too large (${uInt32BE} > ${MAX_FRAME_BYTES})`);
        return;
      }
      let frameLength = FRAME_HEADER_BYTES + uInt32BE;
      if (pendingBuffer.length < frameLength) return;
      let uInt8 = pendingBuffer.readUInt8(4);
      let chunk = pendingBuffer.subarray(FRAME_HEADER_BYTES, frameLength);
      pendingBuffer = pendingBuffer.subarray(frameLength);
      if (uInt8 === DATA_FRAME_KIND)
        onFrame({
          kind: DATA_FRAME_KIND,
          payload: Buffer.from(chunk),
        });
      else if (uInt8 === CONTROL_FRAME_KIND) {
        let ctrl;
        try {
          ctrl = jsonParse(chunk.toString("utf8"));
        } catch {
          isFatal = true;
          onError("bad ctrl json");
          return;
        }
        onFrame({
          kind: CONTROL_FRAME_KIND,
          ctrl,
        });
      } else {
        isFatal = true;
        onError(`unknown frame kind ${uInt8}`);
        return;
      }
    }
  };
}
export {
  encodeControlFrame,
  MAX_CONTROL_FRAME_BYTES,
  encodeDataFrame,
  SOCKET_IDLE_TIMEOUT_MS,
  createFrameDecoder,
  DATA_FRAME_KIND,
  CONTROL_FRAME_KIND,
  MAX_FRAME_BYTES,
};
