/**
 * plugins/bundled/diff/index.ts
 *
 * 2.1.316 新增：内置 diff 插件定义
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * new in 2.1.318 (2.1.88 has no file at this path)
 * pieces: chunk-jzwhckm7.js (2)
 * attribution: placement 2
 * (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.
 */
//@ chunk-jzwhckm7.js:191-211 placement
/**
 * diff 侧栏的宽度阈值：达到 110 列才会自动显示；用户在设置里明确开启时也用这个阈值，144 列是未设置时的默认开启线。
 */
var DIFF_SIDEBAR_MIN_COLUMNS = 110;
var DIFF_SIDEBAR_OPEN_COLUMNS = 144;
//@ chunk-jzwhckm7.js:211-236 placement
var CC_PLUGIN_DIFF = "cc-plugin-diff";
export { CC_PLUGIN_DIFF, DIFF_SIDEBAR_MIN_COLUMNS, DIFF_SIDEBAR_OPEN_COLUMNS };
