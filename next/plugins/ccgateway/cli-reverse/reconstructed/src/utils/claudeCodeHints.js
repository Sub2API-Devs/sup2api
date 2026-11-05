/**
 * utils/claudeCodeHints.ts
 *
 * 解析并剥离命令输出中的 <claude-code-hint .../> 标签（如插件安装建议）
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/utils/claudeCodeHints.ts
 * pieces: chunk-5xgkngpb.js (4), chunk-wrq65rh8.js (11)
 * attribution: placement 4, callgraph-fingerprint 3, fingerprint 1, layout 7
 * (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.
 */
import { logForDebugging } from "./debug.js";
import { isFirstPartyTelemetryBlocked } from "./hostEnvironment.js";
import { getPluginRegistry } from "./plugins/pluginLoadState.js";
import { MAX_SEEN_PLUGIN_HINTS } from "./telemetry/errorClassNames.js";
import { parsePluginIdentifier, isOfficialMarketplaceName_3 } from "./plugins/pluginIdentifier.js";
import { logEvent } from "../services/analytics/index.js";
import { fromEnum } from "../services/analytics/safeMetadata.js";
import { pluginIdHash } from "./telemetry/pluginTelemetry.js";
import { deferInit } from "../../runtime/deferred-init.js";

//@ chunk-wrq65rh8.js:8363-8598 callgraph-fingerprint (2.1.88 match: SUPPORTED_TYPES, 0.501)
/**
 * 支持的 hint 载荷类型（目前只有 plugin）。
 */
var SUPPORTED_HINT_VERSIONS; // deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
var HINT_PAYLOAD_KINDS;
var STANDALONE_HINT_RE;
var MAX_HINT_CHARS;
var PLUGIN_NAME_AT_RE;
var HTML_ATTRIBUTE_RE;
var CLAUDE_CODE_HINT_TAG;
deferInit("chunk-wrq65rh8.js:8363", () => {
  SUPPORTED_HINT_VERSIONS = new Set([1]);
  HINT_PAYLOAD_KINDS = new Set(["plugin"]);
  STANDALONE_HINT_RE = /^[ \t]*<claude-code-hint[ \t][^>\r\n]*\/>[ \t]*$/;
  MAX_HINT_CHARS = 1024;
  PLUGIN_NAME_AT_RE = /^[A-Za-z0-9][A-Za-z0-9._-]{0,63}@[A-Za-z0-9][A-Za-z0-9._-]{0,63}$/;
  HTML_ATTRIBUTE_RE = /(\w+)=(?:"([^"]*)"|([^\s/>]+))/g;
  CLAUDE_CODE_HINT_TAG = "<claude-code-hint";
});
//@ chunk-wrq65rh8.js:8598-9291 fingerprint (2.1.88 match: extractClaudeCodeHints, 0.721)
function extractClaudeCodeHints_2(output, command) {
  if (!output.includes(CLAUDE_CODE_HINT_TAG))
    return {
      hints: [],
      stripped: output,
    };
  let sourceCommand = firstCommandToken(command);
  let hints = [];
  let stripped = extractClaudeCodeHints(output, (matchText, tagBody) => {
    if (matchText.length > MAX_HINT_CHARS) {
      logForDebugging("[claudeCodeHints] dropped over-long hint line");
      return;
    }
    let attrs = parseAttrs(tagBody);
    let v = Number(attrs.v);
    let { type, value } = attrs;
    if (!SUPPORTED_HINT_VERSIONS.has(v)) {
      logForDebugging(`[claudeCodeHints] dropped hint with unsupported v=${attrs.v}`);
      return;
    }
    if (!type || !HINT_PAYLOAD_KINDS.has(type)) {
      logForDebugging(`[claudeCodeHints] dropped hint with unsupported type=${type}`);
      return;
    }
    if (!value) {
      logForDebugging("[claudeCodeHints] dropped hint with empty value");
      return;
    }
    if (type === "plugin" && !PLUGIN_NAME_AT_RE.test(value)) {
      logForDebugging("[claudeCodeHints] dropped plugin hint whose value is not name@marketplace");
      return;
    }
    hints.push({
      v,
      type,
      value,
      sourceCommand,
    });
  });
  let collapsed =
    hints.length > 0 || stripped !== output
      ? stripped.replace(
          /\n{3,}/g,
          `

`,
        )
      : stripped;
  return {
    hints,
    stripped: collapsed,
  };
}
//@ chunk-wrq65rh8.js:9291-9371 layout
/**
 * 去掉命令输出中的 <claude-code-hint .../> 行并把三个以上连续空行压成两个。
 */
function stripClaudeCodeHints(text) {
  if (!text.includes(CLAUDE_CODE_HINT_TAG)) return text;
  return extractClaudeCodeHints(text).replace(
    /\n{3,}/g,
    `

`,
  );
}
//@ chunk-wrq65rh8.js:9371-9445 layout
/**
 * 一行是否是完整的 claude-code-hint 自闭合标签（长度不超过 1024）。
 */
function isClaudeCodeHintLine(line) {
  if (line.length > MAX_HINT_CHARS || !line.includes(CLAUDE_CODE_HINT_TAG)) return false;
  return STANDALONE_HINT_RE.test(line);
}
//@ chunk-wrq65rh8.js:9445-9546 layout
function removeClaudeCodeHintLines(text) {
  if (!text.includes(CLAUDE_CODE_HINT_TAG)) return text;
  return text
    .split(
      `
`,
    )
    .filter((line) => !isClaudeCodeHintLine(line.trim())).join(`
`);
}
//@ chunk-wrq65rh8.js:9546-9582 layout
function isSpaceOrTab(char) {
  return char === 32 || char === 9;
}
//@ chunk-wrq65rh8.js:9582-9623 layout
function isLineOrParagraphSeparator(char) {
  return char === 8232 || char === 8233;
}
//@ chunk-wrq65rh8.js:9623-10056 layout
function findClaudeCodeHintTags(text) {
  let tags = [];
  let index = text.indexOf(CLAUDE_CODE_HINT_TAG);
  while (index !== -1) {
    let index_2 = text.indexOf(">", index);
    if (index_2 === -1) break;
    let searchStart = index_2 + 1;
    while (isSpaceOrTab(text.charCodeAt(searchStart))) searchStart++;
    if (
      text[index_2 - 1] === "/" &&
      (searchStart === text.length || isLineOrParagraphSeparator(text.charCodeAt(searchStart)))
    )
      for (
        let openIndex = index;
        openIndex !== -1 && openIndex < index_2;
        openIndex = text.indexOf(CLAUDE_CODE_HINT_TAG, openIndex + CLAUDE_CODE_HINT_TAG.length)
      ) {
        let bodyStart = openIndex + CLAUDE_CODE_HINT_TAG.length + 1;
        let closeIndex = openIndex;
        while (isSpaceOrTab(text.charCodeAt(closeIndex - 1))) closeIndex--;
        if (
          isSpaceOrTab(text.charCodeAt(bodyStart - 1)) &&
          bodyStart < index_2 &&
          (closeIndex === 0 || isLineOrParagraphSeparator(text.charCodeAt(closeIndex - 1)))
        ) {
          tags.push({
            start: closeIndex,
            end: searchStart,
            body: text.slice(bodyStart, index_2 - 1),
          });
          break;
        }
      }
    index = text.indexOf(CLAUDE_CODE_HINT_TAG, index_2 + 1);
  }
  return tags;
}
//@ chunk-wrq65rh8.js:10056-10470 layout
/**
 * 扫描文本中的 claude-code-hint 标签（插件安装提示等），返回去掉这些行后的文本，可选收集解析出的提示。
 */
function extractClaudeCodeHints(text, onMatch) {
  let output = "";
  let lastEnd = 0;
  let offset = 0;
  let prevOpen = -2;
  let prevClose = -2;
  for (
    let index = text.indexOf(CLAUDE_CODE_HINT_TAG);
    index !== -1;
    index = text.indexOf(CLAUDE_CODE_HINT_TAG, offset)
  ) {
    let sliced = text.slice(offset, index);
    let body =
      offset +
      Math.max(
        sliced.lastIndexOf(`
`),
        sliced.lastIndexOf("\r"),
      ) +
      1;
    if (prevOpen !== -1 && prevOpen < index)
      prevOpen = text.indexOf(
        `
`,
        index,
      );
    if (prevClose !== -1 && prevClose < index) prevClose = text.indexOf("\r", index);
    let min = Math.min(prevOpen === -1 ? text.length : prevOpen, prevClose === -1 ? text.length : prevClose);
    let text_2 = text.slice(body, min);
    for (let tag of findClaudeCodeHintTags(text_2)) {
      output += text.slice(lastEnd, body + tag.start);
      lastEnd = body + tag.end;
      onMatch?.(text_2.slice(tag.start, tag.end), tag.body);
    }
    offset = min;
  }
  return output + text.slice(lastEnd);
}
//@ chunk-wrq65rh8.js:10470-10554 callgraph-fingerprint (2.1.88 match: parseAttrs, 1)
function parseAttrs(tagBody) {
  let attrs = {};
  for (let m of tagBody.matchAll(HTML_ATTRIBUTE_RE)) attrs[m[1]] = m[2] ?? m[3] ?? "";
  return attrs;
}
//@ chunk-wrq65rh8.js:10554-10630 callgraph-fingerprint (2.1.88 match: firstCommandToken, 1)
function firstCommandToken(command) {
  let trimmed = command.trim();
  let spaceIdx = trimmed.search(/\s/);
  return spaceIdx === -1 ? trimmed : trimmed.slice(0, spaceIdx);
}
//@ chunk-5xgkngpb.js:3109587-3109743 placement
/**
 * 从命令输出中提取并剥离 claude-code-hint 标签：记录首次看到的插件提示，主线程时提交待处理提示；返回剥离后的输出。
 */
function consumeClaudeCodeHints(output, { command, pendingHint, isMainThread, surface }) {
  let { hints, stripped } = extractClaudeCodeHints_2(output, command);
  for (let hint of hints) {
    logPluginHintSeen(hint.value, surface);
    if (isMainThread) pendingHint.submit(hint);
  }
  return stripped;
}
//@ chunk-5xgkngpb.js:3109743-3110007 placement
function logPluginHintSeen(pluginId, surface) {
  if (isFirstPartyTelemetryBlocked()) return;
  let { seenHintPluginIds } = getPluginRegistry();
  if (seenHintPluginIds.has(pluginId) || seenHintPluginIds.size >= MAX_SEEN_PLUGIN_HINTS) return;
  seenHintPluginIds.add(pluginId);
  let { name, marketplace } = parsePluginIdentifier(pluginId);
  logEvent("tengu_plugin_hint_seen", {
    surface: fromEnum(surface),
    ...(name && marketplace
      ? {
          plugin_id_hash: pluginIdHash(name, marketplace),
          claims_official_marketplace: isOfficialMarketplaceName_3(marketplace),
        }
      : {
          parse_failed: true,
        }),
  });
}
//@ chunk-5xgkngpb.js:3110260-3110284 placement
/**
 * 恒为 false 的 hint 开关。
 */
function alwaysFalseHintGate() {
  return false;
}
//@ chunk-5xgkngpb.js:3110284-3110380 placement
/**
 * 匹配 msg_ 开头的消息 id。
 */
var MESSAGE_ID_RE = /^msg_[A-Za-z0-9_]{1,64}$/;
var TOOL_USE_ID_RE = /^toolu_[A-Za-z0-9_-]{1,64}$/;
var SAFE_ID_TOKEN_RE = /^[A-Za-z0-9-]{1,64}$/;
export {
  consumeClaudeCodeHints,
  removeClaudeCodeHintLines,
  alwaysFalseHintGate,
  MESSAGE_ID_RE,
  TOOL_USE_ID_RE,
  SAFE_ID_TOKEN_RE,
  stripClaudeCodeHints,
  isClaudeCodeHintLine,
  extractClaudeCodeHints_2,
};
