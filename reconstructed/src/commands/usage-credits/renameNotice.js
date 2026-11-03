/**
 * commands/usage-credits/renameNotice.ts
 *
 * 2.1.316 新增。/extra-usage 改名为 /usage-credits 的提示。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-pjtx3j3k.js (1)
 * attribution: placement 1
 */

/**
 * /extra-usage 改名为 /usage-credits 的提示。
 */
//@ chunk-pjtx3j3k.js:191-390 placement
var RENAME_NOTICE = "/extra-usage is now /usage-credits",
  call = async (a, t) => {
    let { call: e } = await import("./chunk-g49d7j62.js");
    return {
      type: "text",
      value: `/extra-usage is now /usage-credits

${(await e(a, t)).value}`,
    };
  };

export { RENAME_NOTICE };
