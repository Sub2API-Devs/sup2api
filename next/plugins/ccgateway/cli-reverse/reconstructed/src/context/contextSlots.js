/**
 * context/contextSlots.ts
 *
 * 2.1.316 新增：两个 React 上下文槽。
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * new in 2.1.318 (2.1.88 has no file at this path)
 * pieces: chunk-f0vrgj76.js (2)
 * attribution: placement 2
 * (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.
 */
import { init_react_production, createContext } from "../../vendor/react/cjs/react.production.js";

//@ chunk-f0vrgj76.js:229-233 placement
init_react_production();
//@ chunk-f0vrgj76.js:233-262 placement
/**
 * 两个 React 上下文槽。
 */
var ContextSlotA = createContext(null);
var contextSlot = createContext(null);
export { ContextSlotA, contextSlot };
