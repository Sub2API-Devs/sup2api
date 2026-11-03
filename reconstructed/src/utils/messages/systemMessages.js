/**
 * utils/messages/systemMessages.ts
 *
 * 2.1.316 新增：系统消息
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-e6aww6q8.js (3)
 * attribution: placement 3
 */
import {
  randomUUID,
  randomUUID as randomUUID_2,
  randomUUID as randomUUID_3,
  randomUUID as randomUUID_4,
  randomUUID as randomUUID_5,
  randomUUID as randomUUID_6,
  randomUUID as randomUUID_7,
  randomUUID as randomUUID_8,
  randomUUID as randomUUID_9,
  randomUUID as randomUUID_10,
  randomUUID as randomUUID_11,
  randomUUID as randomUUID_12,
  randomUUID as randomUUID_13,
  randomUUID as randomUUID_14,
  randomUUID as randomUUID_15,
  randomUUID as randomUUID_16,
  randomUUID as randomUUID_17,
  randomUUID as randomUUID_18,
  randomUUID as randomUUID_19,
  randomUUID as randomUUID_20,
  randomUUID as randomUUID_21,
  randomUUID as randomUUID_22,
  randomUUID as randomUUID_23,
  randomUUID as randomUUID_24,
  randomUUID as randomUUID_25,
  randomUUID as randomUUID_26,
  randomUUID as randomUUID_27,
  randomUUID as randomUUID_28,
  randomUUID as randomUUID_29,
  randomUUID as randomUUID_30,
  randomUUID as randomUUID_31,
  randomUUID as randomUUID_32,
  randomUUID as randomUUID_33,
  randomUUID as randomUUID_34,
  randomUUID as randomUUID_35,
  randomUUID as randomUUID_36,
  randomUUID as randomUUID_37,
  randomUUID as randomUUID_38,
  randomUUID as randomUUID_39,
  randomUUID as randomUUID_40,
  randomUUID as randomUUID_41,
  randomUUID as randomUUID_42,
  randomUUID as randomUUID_43,
  randomUUID as randomUUID_44,
  randomUUID as randomUUID_45,
  randomUUID as randomUUID_46,
  randomUUID as randomUUID_47,
  randomUUID as randomUUID_48,
  randomUUID as randomUUID_49,
  randomUUID as randomUUID_50,
} from "crypto";

/**
 * 创建一条 api_system 类型的系统消息（随机 uuid 与当前时间）。
 */
//@ chunk-e6aww6q8.js:91361-91483 placement
function createApiSystemMessage(e) {
  return {
    type: "api_system",
    message: { role: "system", content: e },
    uuid: randomUUID_3(),
    timestamp: new Date().toISOString(),
  };
}
/**
 * 把附件文本合并进系统消息：内容为空时整体作为临时内容（ephemeral），否则主体与临时后缀分开保存；需要时记录折叠的附件区间偏移与只含名称的版本。
 */
//@ chunk-e6aww6q8.js:91483-92031 placement
function foldAttachmentText(message, text, ephemeralText, nameOnlyText, spans) {
  let current = message.ephemeral ? "" : message.message.content;
  if (text && spans && spans.length > 0) {
    let L = current ? current.length + 2 : 0;
    message.foldedAttachmentSpans = [
      ...(message.foldedAttachmentSpans ?? []),
      ...spans.map((G) => ({ ...G, start: G.start + L })),
    ];
  }
  if (text && (nameOnlyText !== void 0 || message.nameOnlyContent !== void 0))
    message.nameOnlyContent = sD(message.nameOnlyContent ?? current, nameOnlyText ?? text);
  let merged = sD(current, text),
    ephemeral = sD(
      message.ephemeral ? message.message.content : (message.ephemeralSuffix ?? ""),
      ephemeralText,
    );
  if (merged === "") {
    ((message.message.content = ephemeral), (message.ephemeral = !0), delete message.ephemeralSuffix);
    return;
  }
  if (((message.message.content = merged), delete message.ephemeral, ephemeral === ""))
    delete message.ephemeralSuffix;
  else message.ephemeralSuffix = ephemeral;
}
//@ chunk-e6aww6q8.js:92031-92078 placement
function sD(e, n) {
  return e && n
    ? `${e}

${n}`
    : e || n;
}

export { foldAttachmentText, createApiSystemMessage, sD };
