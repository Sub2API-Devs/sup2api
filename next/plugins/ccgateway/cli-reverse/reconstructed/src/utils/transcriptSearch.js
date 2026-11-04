/**
 * utils/transcriptSearch.ts
 *
 * 转录搜索：计算消息（文本、工具输入、工具结果）的可搜索文本。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/utils/transcriptSearch.ts
 * pieces: chunk-ag5x7vhf.js (3), chunk-wd9kxbpn.js (1)
 * attribution: fingerprint 4
 */
import { INTERRUPT_MESSAGE_TEXTS } from "../components/Messages.js";
import { renderCompactSummaryText } from "../components/CompactSummary.js";
import { renderPluginPromptSpace } from "./messages/pluginPrompts.js";
import { joinTextContent } from "./messageProvenance.js";
import { stringArray } from "./collections.js";
import { stripSystemReminders } from "./systemReminder.js";
import { isUntrustedObject } from "./untrustedValues.js";
import { CLONE_DEPTH_THRESHOLD } from "./structuredCloneLimits.js";

//@ chunk-wd9kxbpn.js:15515-15608 fingerprint (2.1.88 match: SYSTEM_REMINDER_CLOSE, 0.863)
function SYSTEM_REMINDER_CLOSE(text) {
  let index = text.lastIndexOf("</system-reminder>");
  return (index >= 0 ? text.slice(index + 18) : text).trim();
}
//@ chunk-ag5x7vhf.js:136561-137699 fingerprint (2.1.88 match: computeSearchText, 0.768)
/**
 * 计算消息的可搜索文本（转录搜索用），覆盖文本、工具输入与结果。
 */
function computeSearchText(msg) {
  let raw = "";
  switch (msg.type) {
    case "user": {
      let content = msg.message.content;
      let modelOnlyText = msg.isCompactSummary ? msg.modelOnlyText : undefined;
      if (typeof content === "string")
        raw = INTERRUPT_MESSAGE_TEXTS.has(content)
          ? ""
          : renderCompactSummaryText(renderPluginPromptSpace(content, msg.pluginPrompt), modelOnlyText);
      else {
        let parts = [];
        for (let block of content)
          if (block.type === "text") {
            if (!INTERRUPT_MESSAGE_TEXTS.has(block.text))
              parts.push(
                renderCompactSummaryText(
                  renderPluginPromptSpace(block.text, msg.pluginPrompt),
                  modelOnlyText,
                ),
              );
          } else if (block.type === "tool_result") parts.push(toolResultSearchText(msg.toolUseResult));
        raw = parts.join(`
`);
      }
      break;
    }
    case "assistant": {
      let content = msg.message.content;
      if (Array.isArray(content))
        raw = content.flatMap((block) => {
          if (block.type === "text") return [block.text];
          if (block.type === "tool_use") return [toolUseSearchText(block.input)];
          return [];
        }).join(`
`);
      break;
    }
    case "attachment": {
      if (msg.attachment.type === "relevant_memories")
        raw = msg.attachment.memories.map((m) => m.content).join(`
`);
      else if (
        msg.attachment.type === "queued_command" &&
        msg.attachment.commandMode !== "task-notification" &&
        !msg.attachment.isMeta
      )
        raw = joinTextContent(msg.attachment.prompt);
      else if (msg.attachment.type === "tool_host_result_lines")
        raw = [
          ...(msg.attachment.unverified === true && typeof msg.attachment.label === "string"
            ? [msg.attachment.label]
            : []),
          ...stringArray(msg.attachment.lines),
        ].join(`
`);
      break;
    }
    case "collapsed_read_search": {
      raw = [...(msg.relevantMemories ?? []).map((m) => m.content), ...[]].join(`
`);
      break;
    }
    default:
      break;
  }
  return stripSystemReminders(raw);
}
//@ chunk-ag5x7vhf.js:137699-138433 fingerprint (2.1.88 match: toolUseSearchText, 0.916)
function toolUseSearchText(input) {
  if (!input || typeof input !== "object" || isUntrustedObject(input)) return "";
  let toolInput = input;
  let parts = [];
  for (let fieldName of [
    "command",
    "pattern",
    "file_path",
    "path",
    "prompt",
    "description",
    "query",
    "url",
    "skill",
  ]) {
    let ownPropertyDescriptor = Object.getOwnPropertyDescriptor(toolInput, fieldName);
    if (!ownPropertyDescriptor || !("value" in ownPropertyDescriptor)) continue;
    let fieldValue = ownPropertyDescriptor.value;
    if (typeof fieldValue === "string") parts.push(fieldValue);
  }
  for (let arrayFieldName of ["args", "files"]) {
    let ownPropertyDescriptor = Object.getOwnPropertyDescriptor(toolInput, arrayFieldName);
    if (!ownPropertyDescriptor || !("value" in ownPropertyDescriptor)) continue;
    let fieldValue = ownPropertyDescriptor.value;
    if (
      fieldValue === null ||
      typeof fieldValue !== "object" ||
      isUntrustedObject(fieldValue) ||
      !Array.isArray(fieldValue)
    )
      continue;
    let itemCount = fieldValue.length;
    if (!Number.isSafeInteger(itemCount) || itemCount > CLONE_DEPTH_THRESHOLD) continue;
    let strings = [];
    let allStrings = true;
    for (let idx = 0; idx < itemCount; idx++) {
      let ownPropertyDescriptor = Object.getOwnPropertyDescriptor(fieldValue, idx);
      if (
        !ownPropertyDescriptor ||
        !("value" in ownPropertyDescriptor) ||
        typeof ownPropertyDescriptor.value !== "string"
      ) {
        allStrings = false;
        break;
      }
      strings.push(ownPropertyDescriptor.value);
    }
    if (allStrings) parts.push(strings.join(" "));
  }
  return parts.join(`
`);
}
//@ chunk-ag5x7vhf.js:138433-138975 fingerprint (2.1.88 match: toolResultSearchText, 1)
function toolResultSearchText(r) {
  if (!r || typeof r !== "object") return typeof r === "string" ? r : "";
  let result = r;
  if (typeof result.stdout === "string") {
    let err = typeof result.stderr === "string" ? result.stderr : "";
    return (
      result.stdout +
      (err
        ? `
` + err
        : "")
    );
  }
  if (result.file && typeof result.file === "object" && typeof result.file.content === "string")
    return result.file.content;
  let parts = [];
  for (let k_2 of ["content", "output", "result", "text", "message"]) {
    let v = result[k_2];
    if (typeof v === "string") parts.push(v);
  }
  for (let k_2 of ["filenames", "lines", "results"]) {
    let v = result[k_2];
    if (Array.isArray(v) && v.every((x) => typeof x === "string"))
      parts.push(
        v.join(`
`),
      );
  }
  return parts.join(`
`);
}
export { computeSearchText, SYSTEM_REMINDER_CLOSE };
