/**
 * utils/backoff.ts
 *
 * 退避（2.1.316 新增）
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * new in 2.1.318 (2.1.88 has no file at this path)
 * pieces: chunk-5gxa0bhz.js (1)
 * attribution: placement 1
 * (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.
 */
import { sleep } from "./sleep.js";

//@ chunk-5gxa0bhz.js:226-329 placement
/**
 * 生成指数退避等待函数（第 n 次等待 base·2^(n-1)，50%–100% 抖动）。
 */
function createJitteredBackoff(baseMs) {
  return function (attempt) {
    let delayMs = baseMs * 2 ** (attempt - 1);
    let rounded = Math.round(delayMs * (0.5 + Math.random() / 2));
    return sleep(rounded);
  };
}
export { createJitteredBackoff };
