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
import { kw } from "../components/Messages.js";
import { renderCompactSummaryText } from "../components/CompactSummary.js";
import { Jys } from "./messages/pluginPrompts.js";
import { joinTextContent } from "./messageProvenance.js";
import { stringArray } from "./collections.js";
import { stripSystemReminders } from "./systemReminder.js";
import { Pf } from "./untrustedValues.js";
import { CLONE_DEPTH_THRESHOLD } from "./structuredCloneLimits.js";

/**
 * 计算消息的可搜索文本（转录搜索用），覆盖文本、工具输入与结果。
 */
//@ chunk-ag5x7vhf.js:136561-137699 fingerprint = computeSearchText (0.768)
function computeSearchText(msg) {
  let raw = "";
  switch (msg.type) {
    case "user": {
      let content = msg.message.content,
        T = msg.isCompactSummary ? msg.modelOnlyText : void 0;
      if (typeof content === "string")
        raw = kw.has(content) ? "" : renderCompactSummaryText(Jys(content, msg.pluginPrompt), T);
      else {
        let parts = [];
        for (let _ of content)
          if (_.type === "text") {
            if (!kw.has(_.text)) parts.push(renderCompactSummaryText(Jys(_.text, msg.pluginPrompt), T));
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
        raw = msg.attachment.memories.map((memory) => memory.content).join(`
`);
      else if (
        msg.attachment.type === "queued_command" &&
        msg.attachment.commandMode !== "task-notification" &&
        !msg.attachment.isMeta
      )
        raw = joinTextContent(msg.attachment.prompt);
      else if (msg.attachment.type === "tool_host_result_lines")
        raw = [
          ...(msg.attachment.unverified === !0 && typeof msg.attachment.label === "string"
            ? [msg.attachment.label]
            : []),
          ...stringArray(msg.attachment.lines),
        ].join(`
`);
      break;
    }
    case "collapsed_read_search": {
      raw = [...(msg.relevantMemories ?? []).map((x) => x.content), ...[]].join(`
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
  if (!input || typeof input !== "object" || Pf(input)) return "";
  let h = input,
    x = [];
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
    if (typeof _ === "string") x.push(_);
  }
  for (let T of ["args", "files"]) {
    let ownPropertyDescriptor = Object.getOwnPropertyDescriptor(h, T);
    if (!ownPropertyDescriptor || !("value" in ownPropertyDescriptor)) continue;
    let _ = ownPropertyDescriptor.value;
    if (_ === null || typeof _ !== "object" || Pf(_) || !Array.isArray(_)) continue;
    let I = _.length;
    if (!Number.isSafeInteger(I) || I > CLONE_DEPTH_THRESHOLD) continue;
    let D = [],
      A = !0;
    for (let L = 0; L < I; L++) {
      let ownPropertyDescriptor = Object.getOwnPropertyDescriptor(_, L);
      if (
        !ownPropertyDescriptor ||
        !("value" in ownPropertyDescriptor) ||
        typeof ownPropertyDescriptor.value !== "string"
      ) {
        A = !1;
        break;
      }
      D.push(ownPropertyDescriptor.value);
    }
    if (A) x.push(D.join(" "));
  }
  return x.join(`
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
  for (let T of ["content", "output", "result", "text", "message"]) {
    let k = h[T];
    if (typeof k === "string") parts.push(k);
  }
  for (let T of ["filenames", "lines", "results"]) {
    let k = h[T];
    if (Array.isArray(k) && k.every((_) => typeof _ === "string"))
      parts.push(
        k.join(`
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
