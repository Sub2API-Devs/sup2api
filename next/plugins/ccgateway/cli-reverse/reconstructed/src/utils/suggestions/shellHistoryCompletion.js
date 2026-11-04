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
import { suggestionCacheBySessionRoot } from "./suggestionCache.js";
import { readProjectHistory, parsePastedRefs } from "../../history.js";
import { logForDebugging } from "../debug.js";

//@ chunk-18hwfzwa.js:607982-607996 affinity
var SHELL_HISTORY_CACHE_TTL_MS = 60000;
//@ chunk-18hwfzwa.js:607996-608512 fingerprint = getShellHistoryCommands (0.582)
async function getShellHistoryCommands(session, historyPath) {
  let cache = suggestionCacheBySessionRoot.of(session);
  let now = Date.now();
  if (cache.shellHistoryCommands && now - cache.shellHistoryLoadedAt < SHELL_HISTORY_CACHE_TTL_MS)
    return cache.shellHistoryCommands;
  let commands = [];
  let seen = new Set();
  try {
    for await (let entry of readProjectHistory(historyPath)) {
      if (entry.display && entry.display.startsWith("!")) {
        if (parsePastedRefs(entry.display).some((ref) => !ref.match.startsWith("[Image"))) continue;
        let command = entry.display.slice(1).trim();
        if (command && !seen.has(command)) {
          seen.add(command);
          commands.push(command);
        }
      }
      if (commands.length >= 50) break;
    }
  } catch (error) {
    logForDebugging(`Failed to read shell history: ${error}`);
  }
  cache.shellHistoryCommands = commands;
  cache.shellHistoryLoadedAt = now;
  return commands;
}
//@ chunk-18hwfzwa.js:608512-608635 fingerprint = prependToShellHistoryCache (0.708)
function prependToShellHistoryCache(session, command) {
  let shellHistoryCommands = suggestionCacheBySessionRoot.of(session).shellHistoryCommands;
  if (!shellHistoryCommands) return;
  let idx = shellHistoryCommands.indexOf(command);
  if (idx !== -1) shellHistoryCommands.splice(idx, 1);
  shellHistoryCommands.unshift(command);
}
//@ chunk-18hwfzwa.js:608635-608844 fingerprint = getShellHistoryCompletion (1)
async function getShellHistoryCompletion(session, input, historyPath) {
  if (!input || input.length < 2) return null;
  if (!input.trim()) return null;
  let commands = await getShellHistoryCommands(session, historyPath);
  for (let command of commands)
    if (command.startsWith(input) && command !== input)
      return {
        fullCommand: command,
        suffix: command.slice(input.length),
      };
  return null;
}
export { getShellHistoryCompletion, prependToShellHistoryCache };
