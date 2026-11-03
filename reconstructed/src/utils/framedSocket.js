/**
 * utils/framedSocket.ts
 *
 * 2.1.316 新增。分帧 socket。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-2hnnvz4r.js (4)
 * attribution: placement 4
 */
import { jsonStringify, jsonParse } from "./slowOperations.js";

//@ chunk-2hnnvz4r.js:229-280 placement
/**
 * 分帧 socket 的常量组：数据帧类型、控制帧类型、控制帧上限、帧头字节数、帧上限与空闲超时。
 */
var DATA_FRAME_KIND = 0;
var CONTROL_FRAME_KIND = 1;
var MAX_CONTROL_FRAME_BYTES = 262144;
var FRAME_HEADER_BYTES = 5;
var MAX_FRAME_BYTES = 1048576;
var SOCKET_IDLE_TIMEOUT_MS = 1e4;
//@ chunk-2hnnvz4r.js:280-448 placement
/**
 * 编码数据帧：4 字节长度 + 1 字节类型（数据）+ 负载。
 */
function encodeDataFrame(r) {
  let e = typeof r === "string" ? Buffer.from(r, "utf8") : r;
  let t = Buffer.allocUnsafe(FRAME_HEADER_BYTES + e.length);
  t.writeUInt32BE(e.length, 0);
  t.writeUInt8(DATA_FRAME_KIND, 4);
  e.copy(t, FRAME_HEADER_BYTES);
  return t;
}
//@ chunk-2hnnvz4r.js:448-596 placement
/**
 * 编码控制帧：4 字节长度 + 1 字节类型（控制）+ JSON 负载。
 */
function encodeControlFrame(r) {
  let buffer = Buffer.from(jsonStringify(r), "utf8");
  let t = Buffer.allocUnsafe(FRAME_HEADER_BYTES + buffer.length);
  t.writeUInt32BE(buffer.length, 0);
  t.writeUInt8(CONTROL_FRAME_KIND, 4);
  buffer.copy(t, FRAME_HEADER_BYTES);
  return t;
}
//@ chunk-2hnnvz4r.js:596-1098 placement
/**
 * 创建分帧解码器：累积字节流并解析出数据帧与控制帧，帧过大、JSON 错误或未知类型时报错并停止。
 */
function createFrameDecoder(r, e) {
  let t = Buffer.alloc(0);
  let o = false;
  return (l) => {
    if (o) return;
    t = t.length === 0 ? l : Buffer.concat([t, l]);
    while (t.length >= FRAME_HEADER_BYTES) {
      let uInt32BE = t.readUInt32BE(0);
      if (uInt32BE > MAX_FRAME_BYTES) {
        o = true;
        e(`frame too large (${uInt32BE} > ${MAX_FRAME_BYTES})`);
        return;
      }
      let u = FRAME_HEADER_BYTES + uInt32BE;
      if (t.length < u) return;
      let uInt8 = t.readUInt8(4);
      let chunk = t.subarray(FRAME_HEADER_BYTES, u);
      t = t.subarray(u);
      if (uInt8 === DATA_FRAME_KIND)
        r({
          kind: DATA_FRAME_KIND,
          payload: Buffer.from(chunk),
        });
      else if (uInt8 === CONTROL_FRAME_KIND) {
        let ctrl;
        try {
          ctrl = jsonParse(chunk.toString("utf8"));
        } catch {
          o = true;
          e("bad ctrl json");
          return;
        }
        r({
          kind: CONTROL_FRAME_KIND,
          ctrl,
        });
      } else {
        o = true;
        e(`unknown frame kind ${uInt8}`);
        return;
      }
    }
  };
}
export {
  MAX_FRAME_BYTES,
  DATA_FRAME_KIND,
  encodeControlFrame,
  createFrameDecoder,
  encodeDataFrame,
  MAX_CONTROL_FRAME_BYTES,
  SOCKET_IDLE_TIMEOUT_MS,
  CONTROL_FRAME_KIND,
};
