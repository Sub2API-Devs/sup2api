/**
 * tools/LSPTool/symbolContext.ts
 *
 * 读文件前 64KB 取光标处符号，用于渲染 LSP 调用
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/tools/LSPTool/symbolContext.ts
 * pieces: chunk-kxyd0g16.js (2)
 * attribution: affinity 1, fingerprint 1
 */
import { xe } from "./LSPTool.js";
import { getFsImplementation, findIntermediateUncJunction } from "../../utils/fsOperations.js";
import { expandPath } from "../../utils/path.js";
import { truncate } from "../../utils/format.js";
import { logForDebugging } from "../../utils/debug.js";

//@ chunk-kxyd0g16.js:103289-103302 affinity
var MAX_SYMBOL_READ_BYTES = 65536;
/**
 * 读取文件前 64KB，取指定 0 基行列处的符号（标识符）文本，用于渲染工具调用；失败返回 null。
 */
//@ chunk-kxyd0g16.js:103302-103920 fingerprint = getSymbolAtPosition (1)
function getSymbolAtPosition(filePath, line, character) {
  if (typeof filePath !== "string" || xe(filePath, filePath)) return null;
  try {
    let fs = getFsImplementation(),
      absolutePath = expandPath(filePath);
    if (xe(filePath, absolutePath)) return null;
    if (findIntermediateUncJunction(fs, absolutePath) !== void 0) return null;
    let { buffer: buffer, bytesRead: bytesRead } = fs.readSync(absolutePath, {
        length: MAX_SYMBOL_READ_BYTES,
      }),
      parts = buffer.toString("utf-8", 0, bytesRead).split(`
`);
    if (line < 0 || line >= parts.length) return null;
    if (bytesRead === MAX_SYMBOL_READ_BYTES && line === parts.length - 1) return null;
    let S = parts[line];
    if (!S || character < 0 || character >= S.length) return null;
    let symbolPattern = /[\w$'!]+|[+\-*/%&|^~<>=]+/g,
      match;
    while ((match = symbolPattern.exec(S)) !== null) {
      let start = match.index,
        end = start + match[0].length;
      if (character >= start && character < end) {
        let B = match[0];
        return truncate(B, 30);
      }
    }
    return null;
  } catch (error) {
    if (error instanceof Error)
      logForDebugging(`Symbol extraction failed for ${filePath}:${line}:${character}: ${error.message}`, {
        level: "warn",
      });
    return null;
  }
}

export { getSymbolAtPosition };
