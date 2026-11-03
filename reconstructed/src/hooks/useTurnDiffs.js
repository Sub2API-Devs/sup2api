/**
 * hooks/useTurnDiffs.ts
 *
 * 从消息中提取每回合的文件编辑结果，计算每回合增删统计（/diff 的 turn 视图）。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/hooks/useTurnDiffs.ts
 * pieces: chunk-mtx4csef.js (8)
 * attribution: placement 2, fingerprint 5, file-local 1
 */
import { init_react_production, R, Q } from "../../vendor/react/cjs/react.production.js";

//@ chunk-mtx4csef.js:14813-14817 placement
init_react_production();
//@ chunk-mtx4csef.js:14817-14821 placement
init_react_production();
//@ chunk-mtx4csef.js:14821-15070 fingerprint = isFileEditResult (0.874)
function isFileEditResult(result) {
  if (!result || typeof result !== "object") return false;
  let o = result;
  if (o.staged === true) return false;
  let hasFilePath = typeof o.filePath === "string";
  let hasStructuredPatch = Array.isArray(o.structuredPatch) && o.structuredPatch.length > 0;
  let isNewFile = o.type === "create" && typeof o.content === "string";
  return hasFilePath && (hasStructuredPatch || isNewFile);
}
//@ chunk-mtx4csef.js:15070-15142 fingerprint = isFileWriteOutput (1)
function isFileWriteOutput(result) {
  return "type" in result && (result.type === "create" || result.type === "update");
}
//@ chunk-mtx4csef.js:15142-15286 fingerprint = countHunkLines (1)
function countHunkLines(hunks) {
  let added = 0;
  let removed = 0;
  for (let hunk of hunks)
    for (let line of hunk.lines)
      if (line.startsWith("+")) added++;
      else if (line.startsWith("-")) removed++;
  return {
    added,
    removed,
  };
}
//@ chunk-mtx4csef.js:15286-15435 file-local
function getUserPromptPreview(message) {
  if (message.type !== "user") return "";
  let content = message.message.content;
  let text = typeof content === "string" ? content : "";
  if (text.length <= 30) return text;
  return text.slice(0, 29) + "\u2026";
}
//@ chunk-mtx4csef.js:15435-15590 fingerprint = computeTurnStats (1)
function computeTurnStats(turn) {
  let totalAdded = 0;
  let totalRemoved = 0;
  for (let file of turn.files.values()) {
    totalAdded += file.linesAdded;
    totalRemoved += file.linesRemoved;
  }
  turn.stats = {
    filesChanged: turn.files.size,
    linesAdded: totalAdded,
    linesRemoved: totalRemoved,
  };
}
//@ chunk-mtx4csef.js:15590-17021 fingerprint = useTurnDiffs (1)
function useTurnDiffs(messages) {
  let cache = R({
    completedTurns: [],
    currentTurn: null,
    lastProcessedIndex: 0,
    lastTurnIndex: 0,
  });
  return Q(() => {
    let i = cache.current;
    if (messages.length < i.lastProcessedIndex) {
      i.completedTurns = [];
      i.currentTurn = null;
      i.lastProcessedIndex = 0;
      i.lastTurnIndex = 0;
    }
    for (let i_2 = i.lastProcessedIndex; i_2 < messages.length; i_2++) {
      let message = messages[i_2];
      if (!message || message.type !== "user") continue;
      if (
        !(
          message.toolUseResult ||
          (Array.isArray(message.message.content) && message.message.content[0]?.type === "tool_result")
        ) &&
        !message.isMeta
      ) {
        if (i.currentTurn && i.currentTurn.files.size > 0) {
          computeTurnStats(i.currentTurn);
          i.completedTurns.push(i.currentTurn);
        }
        i.lastTurnIndex++;
        i.currentTurn = {
          turnIndex: i.lastTurnIndex,
          userPromptPreview: getUserPromptPreview(message),
          timestamp: message.timestamp,
          files: new Map(),
          stats: {
            filesChanged: 0,
            linesAdded: 0,
            linesRemoved: 0,
          },
        };
      } else if (i.currentTurn && message.toolUseResult) {
        let result = message.toolUseResult;
        if (isFileEditResult(result)) {
          let { filePath, structuredPatch } = result;
          let isNewFile = "type" in result && result.type === "create";
          let fileEntry = i.currentTurn.files.get(filePath);
          if (!fileEntry) {
            fileEntry = {
              filePath,
              hunks: [],
              isNewFile,
              linesAdded: 0,
              linesRemoved: 0,
            };
            i.currentTurn.files.set(filePath, fileEntry);
          }
          if (isNewFile && structuredPatch.length === 0 && isFileWriteOutput(result)) {
            let lines = result.content.split(`
`);
            let syntheticHunk = {
              oldStart: 0,
              oldLines: 0,
              newStart: 1,
              newLines: lines.length,
              lines: lines.map((line) => "+" + line),
            };
            fileEntry.hunks.push(syntheticHunk);
            fileEntry.linesAdded += lines.length;
          } else {
            fileEntry.hunks.push(...structuredPatch);
            let { added, removed } = countHunkLines(structuredPatch);
            fileEntry.linesAdded += added;
            fileEntry.linesRemoved += removed;
          }
          if (isNewFile) fileEntry.isNewFile = true;
        }
      }
    }
    i.lastProcessedIndex = messages.length;
    let result = [...i.completedTurns];
    if (i.currentTurn && i.currentTurn.files.size > 0) {
      computeTurnStats(i.currentTurn);
      result.push(i.currentTurn);
    }
    return result.reverse();
  }, [messages]);
}
export { useTurnDiffs };
