/**
 * utils/messages/apiMediaNormalization.ts
 *
 * 2.1.316 新增：发往 API 前的媒体规范化
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-e6aww6q8.js (12)
 * attribution: placement 12
 */
import { isPdfUnsupportedError } from "../../services/api/badRequestClassifier.js";
import { truncateToLength } from "../stringUtils.js";
import { isObjectBlock, hasImageBlock as hasImageBlock_2 } from "../toolResultStorage.js";
import { parseWebpHeader } from "../imageFormats.js";

//@ chunk-e6aww6q8.js:125210-125892 placement
/**
 * 把模型或 API 不接受的图片与文档替换为说明文字。
 */
function replaceUnsupportedMedia(e, n) {
  if (e === "document" && isPdfUnsupportedError(n))
    return "[Document removed: this model does not accept whole PDF documents. This is not a problem with the file; if it is a file on disk, read specific pages with the Read tool's pages parameter (returned as images), and do not read it again without pages.]";
  let r = e === "document" ? "Document" : "Image";
  let s = truncateToLength(
    n
      .replace(/.*messages[.[]\d+[\].]+content[.[]\d+[\].]+\S*:?\s*/, "")
      .replace(/["}]+\s*$/, "")
      .replace(/\s+/g, " ")
      .trim(),
    200,
  );
  let h = s.length > 0 ? ` (${s})` : "";
  return `[${r} removed: the API could not process this ${e}${h}. The file may be unsupported or corrupt; do not retry reading it. If you need to inspect it, use a shell command instead.]`;
}
//@ chunk-e6aww6q8.js:125892-126115 placement
function replaceMatchingBlock(e, n, r) {
  if (!isObjectBlock(e)) return e;
  if (n(e)) return r;
  if (
    e.type === "tool_result" &&
    "content" in e &&
    Array.isArray(e.content) &&
    e.content.some((s) => isObjectBlock(s) && n(s))
  )
    return {
      ...e,
      content: e.content.map((s) => (isObjectBlock(s) && n(s) ? r : s)),
    };
  return e;
}
//@ chunk-e6aww6q8.js:126115-126294 placement
function replaceNestedBlock(e, nestedContentIdx, kind, s) {
  if (
    e.type !== "tool_result" ||
    !("content" in e) ||
    !Array.isArray(e.content) ||
    e.content[nestedContentIdx]?.type !== kind
  )
    return e;
  return {
    ...e,
    content: e.content.map((h, y) => (y === nestedContentIdx ? s : h)),
  };
}
//@ chunk-e6aww6q8.js:126294-126742 placement
/**
 * 把某条用户消息中指定位置（可为 tool_result 内的嵌套位置）的不支持媒体块替换成说明文字，返回新消息列表；未变化时返回原列表。
 */
function replaceUnsupportedMediaAt(messagesForAPI, n, r) {
  let s = messagesForAPI[n.messageIdx];
  if (s?.type !== "user" || !Array.isArray(s.message.content)) return messagesForAPI;
  let h = s.message.content[n.contentIdx];
  if (!h) return messagesForAPI;
  let y = {
    type: "text",
    text: replaceUnsupportedMedia(n.kind, r),
  };
  let S =
    n.nestedContentIdx !== undefined
      ? replaceNestedBlock(h, n.nestedContentIdx, n.kind, y)
      : replaceMatchingBlock(h, (L) => L.type === n.kind, y);
  if (S === h) return messagesForAPI;
  let w = {
    ...s,
    message: {
      ...s.message,
      content: s.message.content.map((L, G) => (G === n.contentIdx ? S : L)),
    },
  };
  return messagesForAPI.map((L, G) => (G === n.messageIdx ? w : L));
}
//@ chunk-e6aww6q8.js:126742-126820 placement
var MEDIA_BLOCK_SOURCES = {
  image: {
    url: true,
    file: true,
  },
  document: {
    url: true,
    file: true,
    text: true,
    content: true,
  },
};
//@ chunk-e6aww6q8.js:126820-126967 placement
function isUnsupportedMediaSource(e, n) {
  if (e.type !== n) return false;
  let source = "source" in e ? e.source : undefined;
  return !(
    isObjectBlock(source) &&
    typeof source.type === "string" &&
    Object.hasOwn(MEDIA_BLOCK_SOURCES[n], source.type)
  );
}
//@ chunk-e6aww6q8.js:126967-127182 placement
function replaceInUserMessage(e, n, r) {
  if (e.type !== "user" || !Array.isArray(e.message.content)) return e;
  let s = false;
  let content = e.message.content.map((y) => {
    let S = replaceMatchingBlock(y, n, r);
    if (S !== y) s = true;
    return S;
  });
  return s
    ? {
        ...e,
        message: {
          ...e.message,
          content,
        },
      }
    : e;
}
//@ chunk-e6aww6q8.js:127182-127396 placement
/**
 * 从后往前找到最后一条含该类不支持来源媒体的用户消息，替换为说明文字，返回新消息列表与该消息下标。
 */
function replaceLastUnsupportedMedia(messagesForAPI, kind, r) {
  let s = {
    type: "text",
    text: replaceUnsupportedMedia(kind, r),
  };
  let h = (y) => isUnsupportedMediaSource(y, kind);
  for (let idx = messagesForAPI.length - 1; idx >= 0; idx--) {
    let S = messagesForAPI[idx];
    if (!S) continue;
    let w = replaceInUserMessage(S, h, s);
    if (w !== S)
      return {
        messages: messagesForAPI.map((L, G) => (G === idx ? w : L)),
        carrierIdx: idx,
      };
  }
  return;
}
//@ chunk-e6aww6q8.js:127396-127502 placement
var IMAGE_TOO_LARGE_ERROR_RE =
  /base64\.data: (At least one of the image dimensions exceed max allowed size[^:]*: (\d+) pixels)/;
//@ chunk-e6aww6q8.js:127502-127565 placement
/**
 * 从"图片过大"错误信息中取出上限数值。
 */
function tooLargeLimitFromError(errorDetails) {
  let match = IMAGE_TOO_LARGE_ERROR_RE.exec(errorDetails);
  return match ? Number(match[2]) : undefined;
}
//@ chunk-e6aww6q8.js:127565-127851 placement = isBase64ImageBlock (0.885)
function isBase64ImageBlock(e, n) {
  let match = IMAGE_TOO_LARGE_ERROR_RE.exec(n);
  if (!match?.[1]) return e;
  let s = Number(match[2]);
  let h = {
    type: "text",
    text: replaceUnsupportedMedia("image", match[1]),
  };
  let mapped = e.map((S) =>
    replaceInUserMessage(
      S,
      (w) => {
        let L = hasImageBlock_2(w) ? parseWebpHeader(Buffer.from(w.source.data, "base64")) : undefined;
        return L !== undefined && Math.max(L.width, L.height) > s;
      },
      h,
    ),
  );
  return mapped.some((S, w) => S !== e[w]) ? mapped : e;
}
//@ chunk-e6aww6q8.js:129314-129356 placement
/**
 * 判断消息是否为 fallback 类型。
 */
function isFallbackMessage(e) {
  return e.type === "fallback";
}
export {
  tooLargeLimitFromError,
  isBase64ImageBlock,
  isFallbackMessage,
  replaceUnsupportedMediaAt,
  replaceLastUnsupportedMedia,
};
