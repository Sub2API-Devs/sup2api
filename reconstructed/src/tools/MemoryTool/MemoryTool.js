/**
 * tools/MemoryTool/MemoryTool.ts
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-s61vbvea.js (1)
 * attribution: placement 1
 */
import { Nlt } from "../../memdir/memoryTool.js";

/**
 * memory 文件工具名（read/write/str_replace/append）、版本行、文件头与 memory_document 前言的正则，以及 memory search 工具名；与 MCP 折叠分类无关。
 */
//@ chunk-s61vbvea.js:84109-84365 placement = SEARCH_TOOLS (0.344)
var regExp_4 = new RegExp(`^${Nlt}(read|write|str_replace|append)$`),
  iu = /^[^\n]*?\[version: ([0-9a-f]{12})\]/,
  ZT = /^=== (.+) ===$/gm,
  tv = `${Nlt}search`,
  nv =
    /^Files in <memory_document_([0-9a-f]{16})> elements below are shown in full, as memory_read returns them\.\n/;

export { ZT, iu, nv, tv, regExp_4 };
