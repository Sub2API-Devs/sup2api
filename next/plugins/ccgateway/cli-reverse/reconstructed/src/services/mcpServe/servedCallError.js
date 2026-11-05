/**
 * services/mcpServe/servedCallError.ts
 *
 * 2.1.316 新增。服务调用错误类型。
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * new in 2.1.318 (2.1.88 has no file at this path)
 * pieces: chunk-sd6y863d.js (1)
 * attribution: placement 1
 * (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.
 */

//@ chunk-sd6y863d.js:191-259 placement
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
