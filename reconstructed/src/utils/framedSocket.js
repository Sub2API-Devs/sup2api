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
var vvt = 0,
  MZn = 1,
  _yn = 262144,
  n = 5,
  byn = 1048576,
  RNe = 1e4;
/**
 * 编码数据帧：4 字节长度 + 1 字节类型（数据）+ 负载。
 */
//@ chunk-2hnnvz4r.js:280-448 placement
function encodeDataFrame(r) {
  let e = typeof r === "string" ? Buffer.from(r, "utf8") : r,
    allocUnsafe = Buffer.allocUnsafe(n + e.length);
  return (
    allocUnsafe.writeUInt32BE(e.length, 0),
    allocUnsafe.writeUInt8(vvt, 4),
    e.copy(allocUnsafe, n),
    allocUnsafe
  );
}
/**
 * 编码控制帧：4 字节长度 + 1 字节类型（控制）+ JSON 负载。
 */
//@ chunk-2hnnvz4r.js:448-596 placement
function encodeControlFrame(r) {
  let buffer = Buffer.from(jsonStringify(r), "utf8"),
    allocUnsafe = Buffer.allocUnsafe(n + buffer.length);
  return (
    allocUnsafe.writeUInt32BE(buffer.length, 0),
    allocUnsafe.writeUInt8(MZn, 4),
    buffer.copy(allocUnsafe, n),
    allocUnsafe
  );
}
/**
 * 创建分帧解码器：累积字节流并解析出数据帧与控制帧，帧过大、JSON 错误或未知类型时报错并停止。
 */
//@ chunk-2hnnvz4r.js:596-1098 placement
function createFrameDecoder(r, e) {
  let alloc = Buffer.alloc(0),
    o = !1;
  return (l) => {
    if (o) return;
    alloc = alloc.length === 0 ? l : Buffer.concat([alloc, l]);
    while (alloc.length >= n) {
      let uInt32BE = alloc.readUInt32BE(0);
      if (uInt32BE > byn) {
        ((o = !0), e(`frame too large (${uInt32BE} > ${byn})`));
        return;
      }
      let u = n + uInt32BE;
      if (alloc.length < u) return;
      let uInt8 = alloc.readUInt8(4),
        chunk = alloc.subarray(n, u);
      if (((alloc = alloc.subarray(u)), uInt8 === vvt)) r({ kind: vvt, payload: Buffer.from(chunk) });
      else if (uInt8 === MZn) {
        let c;
        try {
          c = jsonParse(chunk.toString("utf8"));
        } catch {
          ((o = !0), e("bad ctrl json"));
          return;
        }
        r({ kind: MZn, ctrl: c });
      } else {
        ((o = !0), e(`unknown frame kind ${uInt8}`));
        return;
      }
    }
  };
}

export { byn, vvt, encodeControlFrame, createFrameDecoder, encodeDataFrame, _yn, RNe, MZn };
