/**
 * utils/zodStartup.ts
 *
 * 2.1.316 新增。启动时配置 zod。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-vtcm47cy.js (1)
 * attribution: placement 1
 */
import { config } from "../../vendor/zod/v4/core/core.js";

//@ chunk-vtcm47cy.js:228-261 placement
/**
 * 启动时配置 zod。
 */
function configureZodForStartup() {
  config({
    jitless: true,
  });
}
export { configureZodForStartup };
