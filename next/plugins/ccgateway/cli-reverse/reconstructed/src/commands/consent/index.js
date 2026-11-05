/**
 * commands/consent/index.ts
 *
 * /consent 命令定义（2.1.316 新增）
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * new in 2.1.318 (2.1.88 has no file at this path)
 * pieces: chunk-y7hsfrn3.js (1)
 * attribution: placement 1
 * (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.
 */
import { designCommandCall } from "../design/design.js";

//@ chunk-y7hsfrn3.js:3980-4010 placement
/**
 * /design-consent 的 local call(args, context, invokedName) 实现入口（由命令对象 load() 返回）。
 */
var designConsentCall = (args, context) => designCommandCall("consent", context);
export { designConsentCall };
