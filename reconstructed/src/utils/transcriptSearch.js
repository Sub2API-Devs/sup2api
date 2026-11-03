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

//@ chunk-ag5x7vhf.js:136561-137699 fingerprint = computeSearchText (0.768)
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
        for (let _ of content)
          if (_.type === "text") {
            if (!INTERRUPT_MESSAGE_TEXTS.has(_.text))
              parts.push(
                renderCompactSummaryText(renderPluginPromptSpace(_.text, msg.pluginPrompt), modelOnlyText),
              );
          } else if (_.type === "tool_result") parts.push(toolResultSearchText(msg.toolUseResult));
        raw = parts.join(`
`);
      }
      break;
    }
    case "assistant": {
      let content = msg.message.content;
      if (Array.isArray(content))
        raw = content.flatMap((T) => {
          if (T.type === "text") return [T.text];
          if (T.type === "tool_use") return [toolUseSearchText(T.input)];
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
//@ chunk-ag5x7vhf.js:137699-138433 fingerprint = toolUseSearchText (0.916)
function toolUseSearchText(input) {
  if (!input || typeof input !== "object" || isUntrustedObject(input)) return "";
  let h = input;
  let parts = [];
  for (let T of [
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
    let ownPropertyDescriptor = Object.getOwnPropertyDescriptor(h, T);
    if (!ownPropertyDescriptor || !("value" in ownPropertyDescriptor)) continue;
    let _ = ownPropertyDescriptor.value;
    if (typeof _ === "string") parts.push(_);
  }
  for (let T of ["args", "files"]) {
    let ownPropertyDescriptor = Object.getOwnPropertyDescriptor(h, T);
    if (!ownPropertyDescriptor || !("value" in ownPropertyDescriptor)) continue;
    let _ = ownPropertyDescriptor.value;
    if (_ === null || typeof _ !== "object" || isUntrustedObject(_) || !Array.isArray(_)) continue;
    let I = _.length;
    if (!Number.isSafeInteger(I) || I > CLONE_DEPTH_THRESHOLD) continue;
    let D = [];
    let A = true;
    for (let idx = 0; idx < I; idx++) {
      let ownPropertyDescriptor = Object.getOwnPropertyDescriptor(_, idx);
      if (
        !ownPropertyDescriptor ||
        !("value" in ownPropertyDescriptor) ||
        typeof ownPropertyDescriptor.value !== "string"
      ) {
        A = false;
        break;
      }
      D.push(ownPropertyDescriptor.value);
    }
    if (A) parts.push(D.join(" "));
  }
  return parts.join(`
`);
}
//@ chunk-ag5x7vhf.js:138433-138975 fingerprint = toolResultSearchText (1)
function toolResultSearchText(r) {
  if (!r || typeof r !== "object") return typeof r === "string" ? r : "";
  let h = r;
  if (typeof h.stdout === "string") {
    let err = typeof h.stderr === "string" ? h.stderr : "";
    return (
      h.stdout +
      (err
        ? `
` + err
        : "")
    );
  }
  if (h.file && typeof h.file === "object" && typeof h.file.content === "string") return h.file.content;
  let parts = [];
  for (let k_2 of ["content", "output", "result", "text", "message"]) {
    let v = h[k_2];
    if (typeof v === "string") parts.push(v);
  }
  for (let k_2 of ["filenames", "lines", "results"]) {
    let v = h[k_2];
    if (Array.isArray(v) && v.every((x) => typeof x === "string"))
      parts.push(
        v.join(`
`),
      );
  }
  return parts.join(`
`);
}
//@ chunk-wd9kxbpn.js:15515-15608 fingerprint = SYSTEM_REMINDER_CLOSE (0.863)
function SYSTEM_REMINDER_CLOSE(e) {
  let index = e.lastIndexOf("</system-reminder>");
  return (index >= 0 ? e.slice(index + 18) : e).trim();
}
export { computeSearchText, SYSTEM_REMINDER_CLOSE };
