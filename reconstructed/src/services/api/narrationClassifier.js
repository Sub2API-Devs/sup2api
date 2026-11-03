/**
 * services/api/narrationClassifier.ts
 *
 * 2.1.316 新增：旁白（narration）分类器调用
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-e6aww6q8.js (9)
 * attribution: placement 9
 */
import { claimOnce } from "./verificationRequired.js";
import { logError } from "../../utils/log.js";

//@ chunk-e6aww6q8.js:2538286-2538334 placement
var textDecoder = new TextDecoder("utf-8", { ignoreBOM: !0 });
//@ chunk-e6aww6q8.js:2538334-2538496 placement
function readVarint(e, n) {
  let r = 0,
    s = 1;
  for (let h = 0; h < 10; h++) {
    let y = n + h;
    if (y >= e.length) return;
    let S = e[y];
    if (((r += (S & 127) * s), (S & 128) === 0)) return { value: r, next: y + 1 };
    s *= 128;
  }
  return;
}
/**
 * 极简 protobuf 解析器：逐字段读 tag，varint 与 length-delimited 字段回调 visitor，跳过 64/32 位定长字段；格式错误返回 false。
 */
//@ chunk-e6aww6q8.js:2538496-2538965 placement
function walkProtobufFields(bytes, visitor) {
  let r = 0;
  while (r < bytes.length) {
    let s = readVarint(bytes, r);
    if (s === void 0) return !1;
    let h = s.value & 7,
      floored = Math.floor(s.value / 8);
    switch (((r = s.next), h)) {
      case 0: {
        let S = readVarint(bytes, r);
        if (S === void 0) return !1;
        ((r = S.next), visitor.onVarint?.(floored, S.value));
        break;
      }
      case 1:
        if (r + 8 > bytes.length) return !1;
        r += 8;
        break;
      case 2: {
        let S = readVarint(bytes, r);
        if (S === void 0 || S.value > bytes.length - S.next) return !1;
        ((r = S.next + S.value), visitor.onBytes?.(floored, bytes.subarray(S.next, r)));
        break;
      }
      case 5:
        if (r + 4 > bytes.length) return !1;
        r += 4;
        break;
      default:
        return !1;
    }
  }
  return !0;
}
//@ chunk-e6aww6q8.js:2538965-2539041 placement
function Zve(e, n) {
  let r;
  return walkProtobufFields(e, {
    onBytes(h, y) {
      if (h === n) r = y;
    },
  })
    ? r
    : void 0;
}
//@ chunk-e6aww6q8.js:2539041-2539113 placement
function wun(e, n) {
  let r = Zve(e, n);
  return r === void 0 ? void 0 : textDecoder.decode(r);
}
//@ chunk-e6aww6q8.js:2539113-2539151 placement
var Ygr = 2,
  Xgr = 1,
  Jgr = 8,
  NARRATION = "narration";
//@ chunk-e6aww6q8.js:2539169-2539391 placement
function decodeSignatureKind(e) {
  let n;
  try {
    n = atob(e);
  } catch {
    return;
  }
  let uint8Array = new Uint8Array(n.length);
  for (let y = 0; y < n.length; y++) uint8Array[y] = n.charCodeAt(y);
  let s = Zve(uint8Array, Ygr);
  if (s === void 0) return;
  let h = Zve(s, Xgr);
  if (h === void 0) return;
  return wun(h, Jgr);
}
//@ chunk-e6aww6q8.js:2539391-2539411 placement
var weakMap_10 = new WeakMap();
//@ chunk-e6aww6q8.js:2539411-2539630 placement
function isNarrationThinking(block) {
  try {
    if (block.type !== "thinking" || !block.signature) return !1;
    let n;
    if (weakMap_10.has(block)) n = weakMap_10.get(block);
    else ((n = decodeSignatureKind(block.signature)), weakMap_10.set(block, n));
    return n === NARRATION;
  } catch (error) {
    if (claimOnce().claim("narration_classifier_error")) logError(error);
    return !1;
  }
}

export { walkProtobufFields, isNarrationThinking };
