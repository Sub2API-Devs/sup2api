/**
 * utils/suggestions/commandArgSuggestions.ts
 *
 * 2.1.316 新增。命令参数建议。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-18hwfzwa.js (3)
 * attribution: placement 3
 */

//@ chunk-18hwfzwa.js:550092-550115 placement
var COMMAND_ARG = "command-arg-";
//@ chunk-18hwfzwa.js:550115-550716 placement
async function commandArgSuggestions(h, getArgumentCompletions, storageV5) {
  let index = h.indexOf(" ");
  if (!h.startsWith("/") || index === -1) return [];
  let sliced = h.slice(1, index);
  let sliced_2 = h.slice(index + 1);
  let filtered = sliced_2.split(/\s+/).filter(Boolean);
  let Be = sliced_2 === "" || /\s$/.test(sliced_2);
  let He = Be ? "" : (filtered.at(-1) ?? "");
  let We = Be ? filtered : filtered.slice(0, -1);
  let ze = await getArgumentCompletions(We, He, storageV5);
  let joined = [`/${sliced}`, ...We].join(" ");
  return ze.slice(0, 12).map((rt) => {
    let kt = rt.isFinal === true || rt.value.toLowerCase() === He.toLowerCase();
    let At = !kt && (rt.appendSpace ?? true);
    return {
      id: `command-arg-${rt.value}`,
      displayText: rt.value,
      description: rt.description,
      query: He === "" ? undefined : He.toLowerCase(),
      metadata: {
        replacement: `${joined} ${rt.value}${At ? " " : ""}`,
        partial: !kt,
      },
    };
  });
}
//@ chunk-18hwfzwa.js:550787-550848 placement
var DIR_ARG_COMMANDS = new Set(["add-dir", "cd"]);
var COMMAND_SUGGESTIONS_TTL_MS = 15000;
var FAILED_SCAN_TTL_MS = 2500;
var SHELL_HISTORY_TTL_MS = 5000;
export {
  SHELL_HISTORY_TTL_MS,
  COMMAND_SUGGESTIONS_TTL_MS,
  FAILED_SCAN_TTL_MS,
  DIR_ARG_COMMANDS,
  commandArgSuggestions,
  COMMAND_ARG,
};
