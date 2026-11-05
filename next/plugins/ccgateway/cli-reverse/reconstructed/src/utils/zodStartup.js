/**
 * utils/zodStartup.ts
 *
 * 2.1.316 新增。启动时配置 zod。
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * new in 2.1.318 (2.1.88 has no file at this path)
 * pieces: chunk-xtxzdqzb.js (1)
 * attribution: placement 1
 * (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.
 */
import { config } from "../../vendor/zod/v4/core/core.js";

//@ chunk-xtxzdqzb.js:228-261 placement
/**
 * 启动时配置 zod。
 */
function configureZodForStartup() {
  config({
    jitless: true,
  });
}
export { configureZodForStartup };
