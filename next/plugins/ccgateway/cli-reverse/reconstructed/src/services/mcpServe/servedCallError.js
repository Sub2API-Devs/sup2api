/**
 * services/mcpServe/servedCallError.ts
 *
 * 2.1.316 新增。服务调用错误类型。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-dnt9czc7.js (1)
 * attribution: placement 1
 */

//@ chunk-dnt9czc7.js:191-259 placement
/**
 * 服务调用错误类型。
 */
class ServedCallError extends Error {
  meta;
  constructor(message, meta) {
    super(message);
    this.meta = meta;
  }
}
export { ServedCallError };
