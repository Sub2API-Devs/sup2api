/**
 * commands/usage-credits/renameNotice.ts
 *
 * 2.1.316 新增。/extra-usage 改名为 /usage-credits 的提示。
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * new in 2.1.318 (2.1.88 has no file at this path)
 * pieces: chunk-bbs0hzyc.js (1)
 * attribution: placement 1
 * (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.
 */
//@ chunk-bbs0hzyc.js:191-390 placement
/**
 * /extra-usage 改名为 /usage-credits 的提示。
 */
var RENAME_NOTICE = "/extra-usage is now /usage-credits";
var call = async (onDone, context) => {
  let { call } = await import("../extra-usage/call.lazy.js");
  return {
    type: "text",
    value: `/extra-usage is now /usage-credits

${(await call(onDone, context)).value}`,
  };
};
export { RENAME_NOTICE, call };
