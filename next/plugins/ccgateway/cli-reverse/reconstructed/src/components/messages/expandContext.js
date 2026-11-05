/**
 * components/messages/expandContext.ts
 *
 * 2.1.316 新增：消息展开状态上下文
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * new in 2.1.318 (2.1.88 has no file at this path)
 * pieces: chunk-xz2j9584.js (2)
 * attribution: placement 2
 * (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.
 */
import { init_react_production, createContext } from "../../../vendor/react/cjs/react.production.js";

//@ chunk-xz2j9584.js:229-233 placement
init_react_production();
//@ chunk-xz2j9584.js:233-247 placement
/**
 * 导出值：expandContextSignal（展开上下文标记）。
 */
var expandContextSignal = createContext(false);
export { expandContextSignal };
