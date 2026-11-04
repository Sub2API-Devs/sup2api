/**
 * tools/MemoryTool/MemoryTool.ts
 *
 * 2.1.316 新增：memory 文件工具名（read/write/str_replace/append）与文件头、memory_document 前言的正则，以及 memory search 工具名。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-s61vbvea.js (1)
 * attribution: placement 1
 */
import { MEMORY_TOOL_PREFIX } from "../../memdir/memoryTool.js";
import { deferInit } from "../../../runtime/deferred-init.js";

//@ chunk-s61vbvea.js:84109-84365 placement = SEARCH_TOOLS (0.344)
/**
 * memory 文件工具名（read/write/str_replace/append）、版本行、文件头与 memory_document 前言的正则，以及 memory search 工具名；与 MCP 折叠分类无关。
 */
var regExp_4; // deferred: uses MEMORY (../../memdir/memoryTool.js) of its import cycle while loading; runs once the cycle is complete
var MEMORY_VERSION_TAG_RE;
var MEMORY_DOC_SECTION_RE;
var MEMORY_SEARCH_TOOL_NAME;
var MEMORY_DOC_ENVELOPE_RE;
deferInit("chunk-s61vbvea.js:84109", () => {
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
