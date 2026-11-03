/**
 * utils/backoff.ts
 *
 * 退避（2.1.316 新增）
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-zn0hg2p9.js (1)
 * attribution: placement 1
 */
import { sleep } from "./sleep.js";

/**
 * 生成指数退避等待函数（第 n 次等待 base·2^(n-1)，50%–100% 抖动）。
 */
//@ chunk-zn0hg2p9.js:226-329 placement
function createJitteredBackoff(e) {
  return function (r) {
    let t = e * 2 ** (r - 1),
      rounded = Math.round(t * (0.5 + Math.random() / 2));
    return sleep(rounded);
  };
}

export { createJitteredBackoff };
