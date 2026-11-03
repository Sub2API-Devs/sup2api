/**
 * commands/consent/index.ts
 *
 * /consent 命令定义（2.1.316 新增）
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-c9mbsnrs.js (1)
 * attribution: placement 1
 */
import { designCommandCall } from "../design/design.js";

/**
 * /design-consent 的 local call(args, context, invokedName) 实现入口（由命令对象 load() 返回）。
 */
//@ chunk-c9mbsnrs.js:3644-3674 placement
var m = (args, context) => designCommandCall("consent", context);
