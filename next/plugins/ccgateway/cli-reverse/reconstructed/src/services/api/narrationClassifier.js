/**
 * services/api/narrationClassifier.ts
 *
 * 2.1.316 新增：旁白（narration）分类器调用
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * new in 2.1.318 (2.1.88 has no file at this path)
 * pieces: chunk-5xgkngpb.js (15)
 * attribution: affinity 1, placement 9, layout 5
 * (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.
 */
import { claimOnce } from "./verificationRequired.js";
import { logError } from "../../utils/log.js";
import { deferInit } from "../../../runtime/deferred-init.js";

//@ chunk-5xgkngpb.js:2589329-2589377 affinity
var textDecoder; // deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
deferInit("chunk-5xgkngpb.js:2589329", () => {
  textDecoder = new TextDecoder("utf-8", {
    ignoreBOM: true,
  });
});
//@ chunk-5xgkngpb.js:2589377-2589539 placement
function readVarint(bytes, offset) {
  let value = 0;
  let shift = 1;
  for (let idx = 0; idx < 10; idx++) {
    let cursor = offset + idx;
    if (cursor >= bytes.length) return;
    let byte = bytes[cursor];
    value += (byte & 127) * shift;
    if ((byte & 128) === 0)
      return {
        value,
        next: cursor + 1,
      };
    shift *= 128;
  }
  return;
}
//@ chunk-5xgkngpb.js:2589539-2590008 placement
/**
 * 极简 protobuf 解析器：逐字段读 tag，varint 与 length-delimited 字段回调 visitor，跳过 64/32 位定长字段；格式错误返回 false。
 */
function walkProtobufFields(bytes, visitor) {
  let shift = 0;
  while (shift < bytes.length) {
    let varint = readVarint(bytes, shift);
    if (varint === undefined) return false;
    let wireType = varint.value & 7;
    let floored = Math.floor(varint.value / 8);
    switch (((shift = varint.next), wireType)) {
      case 0: {
        let varint = readVarint(bytes, shift);
        if (varint === undefined) return false;
        shift = varint.next;
        visitor.onVarint?.(floored, varint.value);
        break;
      }
      case 1:
        if (shift + 8 > bytes.length) return false;
        shift += 8;
        break;
      case 2: {
        let varint = readVarint(bytes, shift);
        if (varint === undefined || varint.value > bytes.length - varint.next) return false;
        shift = varint.next + varint.value;
        visitor.onBytes?.(floored, bytes.subarray(varint.next, shift));
        break;
      }
      case 5:
        if (shift + 4 > bytes.length) return false;
        shift += 4;
        break;
      default:
        return false;
    }
  }
  return true;
}
//@ chunk-5xgkngpb.js:2590008-2590084 placement
function nestedBytesField(envelope, field) {
  let out;
  return walkProtobufFields(envelope, {
    onBytes(result, bytes) {
      if (result === field) out = bytes;
    },
  })
    ? out
    : undefined;
}
//@ chunk-5xgkngpb.js:2590084-2590149 placement
function nestedTextField(envelope, field) {
  let bytes = nestedBytesField(envelope, field);
  return bytes === undefined ? undefined : decodeBytes(bytes);
}
//@ chunk-5xgkngpb.js:2590149-2590186 placement
function decodeBytes(bytes) {
  return textDecoder.decode(bytes);
}
//@ chunk-5xgkngpb.js:2590186-2590233 layout
function varintField(field, value) {
  return value === 0 ? [] : [encodeVarintField(field, 0, value)];
}
//@ chunk-5xgkngpb.js:2590233-2590296 layout
function bytesField(field, bytes) {
  return bytes.length === 0 ? [] : [encodeVarintField(field, 2, bytes.length), bytes];
}
//@ chunk-5xgkngpb.js:2590296-2590350 layout
function stringField(field, text) {
  return bytesField(field, Buffer.from(text, "utf8"));
}
//@ chunk-5xgkngpb.js:2590350-2590427 layout
function repeatedBytesField(field, chunks) {
  let totalLength = 0;
  for (let chunk of chunks) totalLength += chunk.length;
  return [encodeVarintField(field, 2, totalLength), ...chunks];
}
//@ chunk-5xgkngpb.js:2590427-2590565 layout
function encodeVarintField(field, wireType, value) {
  let out = [];
  for (let part of [field * 8 + wireType, value]) {
    while (part > 127) {
      out.push((part % 128) | 128);
      part = Math.floor(part / 128);
    }
    out.push(part);
  }
  return Uint8Array.from(out);
}
//@ chunk-5xgkngpb.js:2590565-2590603 placement
/**
 * narration 的 protobuf 字段号：外层 2、内层 1、文本 8，以及 "narration" 标记。
 */
var NARRATION_ENVELOPE_FIELD = 2;
var NARRATION_PAYLOAD_FIELD = 1;
var NARRATION_TEXT_FIELD = 8;
var NARRATION = "narration";
//@ chunk-5xgkngpb.js:2590621-2590843 placement
function decodeSignatureKind(signature) {
  let text;
  try {
    text = atob(signature);
  } catch {
    return;
  }
  let uint8Array = new Uint8Array(text.length);
  for (let idx = 0; idx < text.length; idx++) uint8Array[idx] = text.charCodeAt(idx);
  let envelope = nestedBytesField(uint8Array, NARRATION_ENVELOPE_FIELD);
  if (envelope === undefined) return;
  let payload = nestedBytesField(envelope, NARRATION_PAYLOAD_FIELD);
  if (payload === undefined) return;
  return nestedTextField(payload, NARRATION_TEXT_FIELD);
}
//@ chunk-5xgkngpb.js:2590843-2590863 placement
var weakMap_12; // deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
deferInit("chunk-5xgkngpb.js:2590843", () => {
  weakMap_12 = new WeakMap();
});
//@ chunk-5xgkngpb.js:2590863-2591082 placement
function isNarrationThinking(block) {
  try {
    if (block.type !== "thinking" || !block.signature) return false;
    let value;
    if (weakMap_12.has(block)) value = weakMap_12.get(block);
    else {
      value = decodeSignatureKind(block.signature);
      weakMap_12.set(block, value);
    }
    return value === NARRATION;
  } catch (error) {
    if (claimOnce().claim("narration_classifier_error")) logError(error);
    return false;
  }
}
export {
  walkProtobufFields,
  decodeBytes,
  repeatedBytesField,
  stringField,
  varintField,
  bytesField,
  nestedTextField,
  isNarrationThinking,
};
