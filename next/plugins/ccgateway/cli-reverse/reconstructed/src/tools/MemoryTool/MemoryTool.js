/**
 * tools/MemoryTool/MemoryTool.ts
 *
 * 2.1.316 新增：memory 文件工具名（read/write/str_replace/append）与文件头、memory_document 前言的正则，以及 memory search 工具名。
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * new in 2.1.318 (2.1.88 has no file at this path)
 * pieces: chunk-7jxyna5q.js (1)
 * attribution: placement 1
 * (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.
 */
import { MEMORY_TOOL_PREFIX } from "../../memdir/memoryTool.js";
import { deferInit } from "../../../runtime/deferred-init.js";

//@ chunk-7jxyna5q.js:83423-83679 placement (2.1.88 match: SEARCH_TOOLS, 0.344)
/**
 * memory 文件工具名（read/write/str_replace/append）、版本行、文件头与 memory_document 前言的正则，以及 memory search 工具名；与 MCP 折叠分类无关。
 */
var regExp_4; // deferred: uses MEMORY (../../memdir/memoryTool.js) of its import cycle while loading; runs once the cycle is complete
var MEMORY_VERSION_TAG_RE;
var MEMORY_DOC_SECTION_RE;
var MEMORY_SEARCH_TOOL_NAME;
var MEMORY_DOC_ENVELOPE_RE;
deferInit("chunk-7jxyna5q.js:83423", () => {
  regExp_4 = new RegExp(`^${MEMORY_TOOL_PREFIX}(read|write|str_replace|append)$`);
  MEMORY_VERSION_TAG_RE = /^[^\n]*?\[version: ([0-9a-f]{12})\]/;
  MEMORY_DOC_SECTION_RE = /^=== (.+) ===$/gm;
  MEMORY_SEARCH_TOOL_NAME = `${MEMORY_TOOL_PREFIX}search`;
  MEMORY_DOC_ENVELOPE_RE =
    /^Files in <memory_document_([0-9a-f]{16})> elements below are shown in full, as memory_read returns them\.\n/;
});
export {
  MEMORY_DOC_SECTION_RE,
  MEMORY_VERSION_TAG_RE,
  MEMORY_DOC_ENVELOPE_RE,
  MEMORY_SEARCH_TOOL_NAME,
  regExp_4,
};
