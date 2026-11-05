/**
 * utils/suggestions/commandArgSuggestions.ts
 *
 * 2.1.316 新增。命令参数建议。
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * new in 2.1.318 (2.1.88 has no file at this path)
 * pieces: chunk-czq1j3j2.js (3)
 * attribution: placement 3
 */

//@ chunk-czq1j3j2.js:570778-570801 placement
var COMMAND_ARG = "command-arg-";
//@ chunk-czq1j3j2.js:570801-571402 placement
async function commandArgSuggestions(input, getArgumentCompletions, storageV5) {
  let index = input.indexOf(" ");
  if (!input.startsWith("/") || index === -1) return [];
  let sliced = input.slice(1, index);
  let sliced_2 = input.slice(index + 1);
  let filtered = sliced_2.split(/\s+/).filter(Boolean);
  let endsWithSpace = sliced_2 === "" || /\s$/.test(sliced_2);
  let query = endsWithSpace ? "" : (filtered.at(-1) ?? "");
  let completedArgs = endsWithSpace ? filtered : filtered.slice(0, -1);
  let suggestions = await getArgumentCompletions(completedArgs, query, storageV5);
  let joined = [`/${sliced}`, ...completedArgs].join(" ");
  return suggestions.slice(0, 12).map((suggestion) => {
    let isExact = suggestion.isFinal === true || suggestion.value.toLowerCase() === query.toLowerCase();
    let appendSpace = !isExact && (suggestion.appendSpace ?? true);
    return {
      id: `command-arg-${suggestion.value}`,
      displayText: suggestion.value,
      description: suggestion.description,
      query: query === "" ? undefined : query.toLowerCase(),
      metadata: {
        replacement: `${joined} ${suggestion.value}${appendSpace ? " " : ""}`,
        partial: !isExact,
      },
    };
  });
}
//@ chunk-czq1j3j2.js:571473-571534 placement
var DIR_ARG_COMMANDS = new Set(["add-dir", "cd"]);
var COMMAND_SUGGESTIONS_TTL_MS = 15000;
var FAILED_SCAN_TTL_MS = 2500;
var SHELL_HISTORY_TTL_MS = 5000;
export {
  DIR_ARG_COMMANDS,
  SHELL_HISTORY_TTL_MS,
  COMMAND_SUGGESTIONS_TTL_MS,
  FAILED_SCAN_TTL_MS,
  commandArgSuggestions,
  COMMAND_ARG,
};
