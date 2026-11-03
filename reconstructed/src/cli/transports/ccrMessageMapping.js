/**
 * cli/transports/ccrMessageMapping.ts
 *
 * 2.1.316 新增：消息映射到 CCR（云端会话）格式：媒体、工具结果与转录条目。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-f25sswmp.js (15)
 * attribution: placement 15
 */
import { RawJson } from "../../bridge/readReceipts.js";
import { isPlainObject as isPlainObject_2 } from "../../utils/isPlainObject.js";
import { isToolResultBlockWithContent } from "../../utils/toolSearch.js";
import { hasImageBlock } from "../../utils/toolResultStorage.js";
import { isNonConversationMessage } from "../../bootstrap/sessionSlices.js";

//@ chunk-f25sswmp.js:11201-11300 placement
var st = new Set(["content", "_meta", "structuredContent", "structuredContentOmitted", "resourceLinks"]);
//@ chunk-f25sswmp.js:11300-11579 placement
function stripInlineMediaBase64(e, n) {
  if (n.media !== !0) return e;
  if (e instanceof RawJson) {
    let toJSON = e.toJSON(),
      i = stripInlineMediaBase64(toJSON, n);
    return i === toJSON ? e : RawJson.of(i);
  }
  if (!isPlainObject_2(e)) return e;
  let file = e.file;
  if (
    isPlainObject_2(file) &&
    (e.type === "image" || e.type === "pdf") &&
    typeof file.base64 === "string" &&
    file.base64 !== ""
  )
    return { ...e, file: { ...file, base64: "" } };
  return e;
}
//@ chunk-f25sswmp.js:11579-11750 placement
function dedupeMcpImageData(e, n, r) {
  if (r.mcp_images !== !0) return e;
  let s = (h) => mapToolResultImageData(h, n, (E, I) => (E === I ? "" : E));
  if (!(e instanceof RawJson)) return s(e);
  let toJSON = e.toJSON(),
    y = s(toJSON);
  return y === toJSON ? e : RawJson.of(y);
}
//@ chunk-f25sswmp.js:11750-11801 placement
function qwn(e, n) {
  return mapToolResultImageData(e, n, (r, s) => (r === "" ? s : r));
}
//@ chunk-f25sswmp.js:11801-11941 placement
function normalizeUserToolUseResult(e) {
  if (!isPlainObject_2(e) || e.type !== "user") return e;
  let n = qwn(e.toolUseResult, e.message);
  return n === e.toolUseResult ? e : { ...e, toolUseResult: n };
}
/**
 * 当工具结果内容与原 tool_result 块一一对应时，用回调逐个变换其中 image 块的 base64 数据；无变化时返回原对象。
 */
//@ chunk-f25sswmp.js:11941-12447 placement
function mapToolResultImageData(e, n, r) {
  let s = isPlainObject_2(e) && Object.keys(e).every((R) => st.has(R)),
    i = s ? e.content : e,
    y = isPlainObject_2(n) ? n.content : void 0;
  if (!Array.isArray(i) || !Array.isArray(y)) return e;
  let [h, ...E] = y.filter((R) => isPlainObject_2(R) && R.type === "tool_result");
  if (E.length > 0 || !isToolResultBlockWithContent(h) || h.content.length !== i.length) return e;
  let I = !1,
    mapped = i.map((R, T) => {
      let S = h.content[T];
      if (!hasImageBlock(R) || !hasImageBlock(S)) return R;
      let v = r(R.source.data, S.source.data);
      if (v === R.source.data) return R;
      return ((I = !0), { ...R, source: { ...R.source, data: v } });
    });
  if (!I) return e;
  return s ? { ...e, content: mapped } : mapped;
}
//@ chunk-f25sswmp.js:12447-12506 placement
var it = new Set(["user", "assistant", "attachment", "system"]);
//@ chunk-f25sswmp.js:12506-12576 placement
function isTranscriptMessage(e) {
  return isPlainObject_2(e) && typeof e.type === "string" && it.has(e.type);
}
//@ chunk-f25sswmp.js:12576-12671 placement
var Re = ["cwd", "gitBranch", "version", "userType", "entrypoint", "promptId"],
  at = [...Re, "requestId"];
//@ chunk-f25sswmp.js:12671-12776 placement
function isAssistantWithMessageId(e) {
  let message = e.message;
  return (
    e.type === "assistant" &&
    isPlainObject_2(message) &&
    typeof message.id === "string" &&
    message.id.length > 0
  );
}
//@ chunk-f25sswmp.js:12776-12907 placement
function stripTranscriptOnlyFields(e, n) {
  if (!isTranscriptMessage(e)) return e;
  let r = isAssistantWithMessageId(e) && n?.() !== !0 ? at : Re,
    s;
  for (let i of r) if (i in e) ((s ??= { ...e }), delete s[i]);
  return s ?? e;
}
//@ chunk-f25sswmp.js:12907-13043 placement
function fillMissingTranscriptFields(e, n) {
  if (!isTranscriptMessage(e)) return e;
  let r;
  for (let [s, i] of Object.entries(n)) if (i !== void 0 && e[s] === void 0) ((r ??= { ...e }), (r[s] = i));
  return r ?? e;
}
/**
 * 扫描消息数组，找出从未完成 thinking 恢复（resumedFromIncompleteThinking）的 assistant 行，向前、向后合并同一 message.id 的片段（跳过中间的无关行），返回每段的 {fromIdx, toIdx}。
 */
//@ chunk-f25sswmp.js:13043-14106 placement
function findResumedThinkingRanges(messages) {
  let n = [],
    index = 0;
  while (index < messages.length) {
    let s = messages[index];
    if (s.type !== "assistant" || s.resumedFromIncompleteThinking !== !0) {
      index++;
      continue;
    }
    let i = index,
      y = index - 1;
    for (;;) {
      while (y >= 0 && isNonConversationMessage(messages[y])) y--;
      let w = y >= 0 ? messages[y] : void 0;
      if (w?.type !== "assistant") break;
      let id = w.message.id,
        T = y;
      while (y >= 0) {
        let v = messages[y];
        if (v.type === "assistant")
          if (v.message.id === id) ((T = y), y--);
          else break;
        else if (isNonConversationMessage(v)) y--;
        else {
          let b = y;
          while (b >= 0 && (messages[b].type !== "assistant" || isNonConversationMessage(messages[b]))) b--;
          let x = b >= 0 ? messages[b] : void 0;
          if (x?.type === "assistant" && x.message.id === id) ((T = b), (y = b - 1));
          else break;
        }
      }
      i = T;
      let S = messages[T];
      if (S.type !== "assistant" || S.resumedFromIncompleteThinking !== !0) break;
    }
    let h = index,
      id = s.message.id,
      I = index + 1;
    for (;;) {
      let w = I;
      while (w < messages.length && isNonConversationMessage(messages[w])) w++;
      let R = w < messages.length ? messages[w] : void 0;
      if (R?.type === "assistant") {
        if (R.message.id === id) {
          ((h = w), (I = w + 1));
          continue;
        }
        if (R.resumedFromIncompleteThinking === !0) {
          ((h = w), (id = R.message.id), (I = w + 1));
          continue;
        }
        break;
      }
      let T = w;
      while (
        T < messages.length &&
        (messages[T].type !== "assistant" || isNonConversationMessage(messages[T]))
      )
        T++;
      let S = T < messages.length ? messages[T] : void 0;
      if (S?.type === "assistant" && S.message.id === id) {
        ((h = T), (I = T + 1));
        continue;
      }
      break;
    }
    (n.push({ fromIdx: i, toIdx: h }), (index = I > index ? I : index + 1));
  }
  return n;
}
//@ chunk-f25sswmp.js:14106-14137 placement
var SHA256_DIGEST_SUFFIX = /@sha256:[0-9a-f]{64}$/;
//@ chunk-f25sswmp.js:14137-14170 placement
function hasPinnedDigest(e) {
  return SHA256_DIGEST_SUFFIX.test(e);
}

export {
  qwn,
  isTranscriptMessage,
  fillMissingTranscriptFields,
  findResumedThinkingRanges,
  isAssistantWithMessageId,
  stripInlineMediaBase64,
  dedupeMcpImageData,
  stripTranscriptOnlyFields,
  normalizeUserToolUseResult,
  hasPinnedDigest,
  SHA256_DIGEST_SUFFIX,
};
