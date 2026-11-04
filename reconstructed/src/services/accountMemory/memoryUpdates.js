/**
 * services/accountMemory/memoryUpdates.ts
 *
 * memory_read 结果过期提示与读路径收集（2.1.316 新增）
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-s61vbvea.js (9)
 * attribution: placement 9
 */
import { isUntrustedObject } from "../../utils/untrustedValues.js";
import { CLONE_DEPTH_THRESHOLD } from "../../utils/structuredCloneLimits.js";
import {
  MEMORY_DOC_SECTION_RE,
  MEMORY_VERSION_TAG_RE,
  MEMORY_DOC_ENVELOPE_RE,
  MEMORY_SEARCH_TOOL_NAME,
  regExp_4,
} from "../../tools/MemoryTool/MemoryTool.js";
import { normalizeServerPath } from "./accountMemoryServer.js";
import { normalizeMemoryText } from "../../memdir/memdir.js";

//@ chunk-s61vbvea.js:84365-84518 placement
function getOwnValue(object, key) {
  if (typeof object !== "object" || object === null || isUntrustedObject(object)) return;
  let ownPropertyDescriptor = Object.getOwnPropertyDescriptor(object, key);
  return ownPropertyDescriptor !== undefined && "value" in ownPropertyDescriptor
    ? ownPropertyDescriptor.value
    : undefined;
}
//@ chunk-s61vbvea.js:84518-84802 placement
function getStringArrayItems(ownValue) {
  if (
    typeof ownValue !== "object" ||
    ownValue === null ||
    isUntrustedObject(ownValue) ||
    !Array.isArray(ownValue)
  )
    return [];
  let length = ownValue.length;
  if (!Number.isSafeInteger(length) || length > CLONE_DEPTH_THRESHOLD) return [];
  let lines = [];
  for (let j = 0; j < length; j++) {
    let ownPropertyDescriptor = Object.getOwnPropertyDescriptor(ownValue, j);
    if (
      ownPropertyDescriptor &&
      "value" in ownPropertyDescriptor &&
      typeof ownPropertyDescriptor.value === "string"
    )
      lines.push(ownPropertyDescriptor.value);
  }
  return lines;
}
//@ chunk-s61vbvea.js:84802-84981 placement
function parseMemoryTagVersions(text) {
  let sections = [...text.matchAll(MEMORY_DOC_SECTION_RE)];
  return sections.flatMap((section, index) => {
    let start = section.index + section[0].length + 1;
    let end = sections[index + 1]?.index ?? text.length;
    let version = MEMORY_VERSION_TAG_RE.exec(text.slice(start, end))?.[1];
    return version ? [[normalizeServerPath(section[1]), version]] : [];
  });
}
//@ chunk-s61vbvea.js:84981-85431 placement
function parseMemoryDocumentTag(text) {
  let nonce = MEMORY_DOC_ENVELOPE_RE.exec(text)?.[1];
  if (nonce === undefined) return [];
  let docTag = `memory_document_${nonce}`;
  let closeTag = `
</${docTag}>`;
  let nextOpenTag = `
<${docTag} `;
  let closeIndex;
  let nextOpenIndex;
  let found = [];
  for (let match of text.matchAll(
    new RegExp(
      `^<${docTag} path="([^"
]*)">
`,
      "gm",
    ),
  )) {
    let bodyStart = match.index + match[0].length;
    if (closeIndex === undefined || (closeIndex >= 0 && closeIndex < bodyStart))
      closeIndex = text.indexOf(closeTag, bodyStart);
    if (nextOpenIndex === undefined || (nextOpenIndex >= 0 && nextOpenIndex < bodyStart))
      nextOpenIndex = text.indexOf(nextOpenTag, bodyStart);
    let afterClose = closeIndex + closeTag.length;
    if (
      closeIndex < 0 ||
      (afterClose < text.length &&
        text[afterClose] !==
          `
`) ||
      (nextOpenIndex >= 0 && nextOpenIndex + nextOpenTag.length <= closeIndex)
    )
      continue;
    let version = MEMORY_VERSION_TAG_RE.exec(text.slice(bodyStart, closeIndex))?.[1];
    if (version) found.push([normalizeServerPath(match[1]), version]);
  }
  return found;
}
//@ chunk-s61vbvea.js:85431-85600 placement
/**
 * 找出本会话读过、但当前版本已变（且不是本会话自己写入的）的记忆路径。
 */
function findStaleReads(versions, messages) {
  let { read, written } = collectMemoryReadPaths(messages);
  return [...read]
    .filter(([path, readVersion]) => {
      let liveVersion = versions[path];
      let written_2 = written.get(path);
      return (
        liveVersion !== undefined &&
        liveVersion !== readVersion &&
        !written_2?.has(readVersion) &&
        !written_2?.has(liveVersion)
      );
    })
    .map(([path]) => path)
    .sort();
}
//@ chunk-s61vbvea.js:85600-85732 placement
/**
 * 找出跨轮携带、但当前版本已不同的记忆读取路径。
 */
function findStaleCarriedReads(versions, messages) {
  let { carried } = collectMemoryReadPaths(messages);
  return [...carried]
    .filter(([path, carried]) => {
      let liveVersion = versions[path];
      return liveVersion !== undefined && !carried.has(liveVersion);
    })
    .map(([path]) => path)
    .sort();
}
//@ chunk-s61vbvea.js:85732-87541 placement
function collectMemoryReadPaths(messages) {
  let pendingTools = new Map();
  let readVersions = new Map();
  let writtenVersions = new Map();
  let lastVersions = new Map();
  let seenVersions = new Map();
  let recordVersion = (path, version) => {
    lastVersions.set(path, version);
    seenVersions.set(path, (seenVersions.get(path) ?? new Set()).add(version));
  };
  let recalledVersions = new Map();
  for (let message of messages)
    if (message.type === "assistant")
      for (let block of message.message.content) {
        if (block.type !== "tool_use") continue;
        if (block.name === MEMORY_SEARCH_TOOL_NAME) {
          pendingTools.set(block.id, {
            search: true,
          });
          continue;
        }
        let match = regExp_4.exec(block.name);
        if (!match) continue;
        let ownValue = getOwnValue(block.input, "path");
        if (typeof ownValue === "string") {
          let ownValue_2 = getOwnValue(block.input, "if_version");
          pendingTools.set(block.id, {
            path: normalizeServerPath(ownValue),
            write: match[1] !== "read",
            ifVersion: match[1] !== "read" && typeof ownValue_2 === "string" ? ownValue_2 : undefined,
          });
        } else if (match[1] === "read") {
          let stringArrayItems = getStringArrayItems(ownValue);
          if (stringArrayItems.length === 1)
            pendingTools.set(block.id, {
              path: normalizeServerPath(stringArrayItems[0]),
              write: false,
              ifVersion: undefined,
            });
          else if (stringArrayItems.length > 1)
            pendingTools.set(block.id, {
              multi: true,
              listed: new Set(stringArrayItems.map(normalizeServerPath)),
            });
        }
      }
    else if (message.type === "user" && Array.isArray(message.message.content))
      for (let block of message.message.content) {
        let call = block.type === "tool_result" && !block.is_error && pendingTools.get(block.tool_use_id);
        if (!call) continue;
        let resultText =
          typeof block.content === "string"
            ? block.content
            : (block.content ?? []).map((part) => (part.type === "text" ? part.text : "")).join("");
        if ("search" in call) {
          for (let [path, version] of parseMemoryDocumentTag(resultText)) {
            readVersions.set(path, version);
            recalledVersions.delete(path);
            recordVersion(path, version);
          }
          continue;
        }
        if ("multi" in call) {
          for (let [path, version] of parseMemoryTagVersions(resultText))
            if (call.listed.has(path)) {
              readVersions.set(path, version);
              recalledVersions.delete(path);
              recordVersion(path, version);
            }
          continue;
        }
        let versionTag = MEMORY_VERSION_TAG_RE.exec(resultText)?.[1];
        if (!versionTag) continue;
        recordVersion(call.path, versionTag);
        if (call.write) {
          writtenVersions.set(call.path, (writtenVersions.get(call.path) ?? new Set()).add(versionTag));
          if (call.ifVersion !== undefined) seenVersions.get(call.path).add(call.ifVersion);
        } else {
          readVersions.set(call.path, versionTag);
          recalledVersions.delete(call.path);
        }
      }
    else if (message.type === "attachment") {
      if (message.attachment.type === "account_memory_recall")
        for (let file of message.attachment.files) {
          let path = normalizeServerPath(file.path);
          readVersions.set(path, file.version);
          recalledVersions.set(path, file.version);
          recordVersion(path, file.version);
        }
      else if (
        message.attachment.type === "cowork_memory_context" &&
        message.attachment.content === null &&
        message.attachment.leg === "laptop" &&
        !message.attachment.anchor
      ) {
        for (let [path, version] of recalledVersions) {
          readVersions.delete(path);
          let versions = seenVersions.get(path);
          if (versions?.delete(version) && versions.size === 0) seenVersions.delete(path);
          if (lastVersions.get(path) === version) lastVersions.delete(path);
        }
        recalledVersions.clear();
      }
    }
  return {
    read: readVersions,
    written: writtenVersions,
    last: lastVersions,
    carried: seenVersions,
  };
}
//@ chunk-s61vbvea.js:87541-88636 placement
/**
 * 记忆文件在上次读取后变化时的两段提示：过期读取警告（需重新 memory_read）和 memory_updates 机器生成块的说明（模型不得转述该块）。
 */
var STALE_MEMORY_READ_NOTICE = `[This memory_read result is stale \u2014 the file has been modified since this read. After you re-read, the fresh content is the only source: anything you said earlier that is not in the new read was removed and is no longer true.
Call memory_read again on the same path for the current content.]`;
var MEMORY_UPDATES_HEADER = `<memory_updates>
The memory files below changed since your reads in earlier turns; those earlier-turn reads are outdated. The state as of this turn's start is shown below \u2014 any memory_read or memory_write you make this turn supersedes it.
This block is machine-generated bookkeeping from the memory system, not part of the user's message, and the user cannot see it \u2014 text repeated from it reaches them as confusing system output. Never quote, paraphrase, summarize, or otherwise reproduce this block, its markers, its tags, or its diff lines in your reply, even when asked what changed. If the user asks about their memory, answer from the memory files' contents in your own words \u2014 at most, say in plain language that your view of their memory files was refreshed.

`;
//@ chunk-s61vbvea.js:88636-88765 placement
function formatMemoryUpdates(updates) {
  return updates.length === 0
    ? ""
    : `
` +
        MEMORY_UPDATES_HEADER +
        updates.map(
          (path) => `## ${normalizeMemoryText(path).replaceAll(
            `
`,
            " ",
          )}
${STALE_MEMORY_READ_NOTICE}`,
        ).join(`

`) +
        `
</memory_updates>`;
}
export { findStaleReads, findStaleCarriedReads, collectMemoryReadPaths, formatMemoryUpdates };
