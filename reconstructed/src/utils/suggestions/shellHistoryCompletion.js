/**
 * utils/suggestions/shellHistoryCompletion.ts
 *
 * 从 shell 历史中给出 ! 命令补全（缓存 60 秒）
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/utils/suggestions/shellHistoryCompletion.ts
 * pieces: chunk-18hwfzwa.js (4)
 * attribution: affinity 1, fingerprint 3
 */
import { yX } from "./suggestionCache.js";
import { g4r, parsePastedRefs } from "../../history.js";
import { logForDebugging } from "../debug.js";

//@ chunk-18hwfzwa.js:607982-607996 affinity
var SHELL_HISTORY_CACHE_TTL_MS = 60000;
//@ chunk-18hwfzwa.js:607996-608512 fingerprint = getShellHistoryCommands (0.582)
async function getShellHistoryCommands(h, x) {
  let of = yX.of(h),
    now = Date.now();
  if (of.shellHistoryCommands && now - of.shellHistoryLoadedAt < SHELL_HISTORY_CACHE_TTL_MS)
    return of.shellHistoryCommands;
  let commands = [],
    seen = new Set();
  try {
    for await (let entry of g4r(x)) {
      if (entry.display && entry.display.startsWith("!")) {
        if (parsePastedRefs(entry.display).some((He) => !He.match.startsWith("[Image"))) continue;
        let command = entry.display.slice(1).trim();
        if (command && !seen.has(command)) (seen.add(command), commands.push(command));
      }
      if (commands.length >= 50) break;
    }
  } catch (error) {
    logForDebugging(`Failed to read shell history: ${error}`);
  }
  return ((of.shellHistoryCommands = commands), (of.shellHistoryLoadedAt = now), commands);
}
//@ chunk-18hwfzwa.js:608512-608635 fingerprint = prependToShellHistoryCache (0.708)
function prependToShellHistoryCache(h, x) {
  let shellHistoryCommands = yX.of(h).shellHistoryCommands;
  if (!shellHistoryCommands) return;
  let idx = shellHistoryCommands.indexOf(x);
  if (idx !== -1) shellHistoryCommands.splice(idx, 1);
  shellHistoryCommands.unshift(x);
}
//@ chunk-18hwfzwa.js:608635-608844 fingerprint = getShellHistoryCompletion (1)
async function getShellHistoryCompletion(h, x, D) {
  if (!x || x.length < 2) return null;
  if (!x.trim()) return null;
  let ee = await getShellHistoryCommands(h, D);
  for (let command of ee)
    if (command.startsWith(x) && command !== x)
      return { fullCommand: command, suffix: command.slice(x.length) };
  return null;
}

export { getShellHistoryCompletion, prependToShellHistoryCache };
