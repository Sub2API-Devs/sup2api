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
import { init_react_production, useRef, useMemo } from "../../vendor/react/cjs/react.production.js";

//@ chunk-mtx4csef.js:14813-14817 placement
init_react_production();
//@ chunk-mtx4csef.js:14817-14821 placement
init_react_production();
//@ chunk-mtx4csef.js:14821-15070 fingerprint (2.1.88 match: isFileEditResult, 0.874)
function isFileEditResult(result) {
  if (!result || typeof result !== "object") return false;
  let editResult = result;
  if (editResult.staged === true) return false;
  let hasFilePath = typeof editResult.filePath === "string";
  let hasStructuredPatch = Array.isArray(editResult.structuredPatch) && editResult.structuredPatch.length > 0;
  let isNewFile = editResult.type === "create" && typeof editResult.content === "string";
  return hasFilePath && (hasStructuredPatch || isNewFile);
}
//@ chunk-mtx4csef.js:15070-15142 fingerprint (2.1.88 match: isFileWriteOutput, 1)
function isFileWriteOutput(result) {
  return "type" in result && (result.type === "create" || result.type === "update");
}
//@ chunk-mtx4csef.js:15142-15286 fingerprint (2.1.88 match: countHunkLines, 1)
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
//@ chunk-mtx4csef.js:15435-15590 fingerprint (2.1.88 match: computeTurnStats, 1)
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
//@ chunk-mtx4csef.js:15590-17021 fingerprint (2.1.88 match: useTurnDiffs, 1)
function useTurnDiffs(messages) {
  let cache = useRef({
    completedTurns: [],
    currentTurn: null,
    lastProcessedIndex: 0,
    lastTurnIndex: 0,
  });
  return useMemo(() => {
    let state = cache.current;
    if (messages.length < state.lastProcessedIndex) {
      state.completedTurns = [];
      state.currentTurn = null;
      state.lastProcessedIndex = 0;
      state.lastTurnIndex = 0;
    }
    for (let i = state.lastProcessedIndex; i < messages.length; i++) {
      let message = messages[i];
      if (!message || message.type !== "user") continue;
      if (
        !(
          message.toolUseResult ||
          (Array.isArray(message.message.content) && message.message.content[0]?.type === "tool_result")
        ) &&
        !message.isMeta
      ) {
        if (state.currentTurn && state.currentTurn.files.size > 0) {
          computeTurnStats(state.currentTurn);
          state.completedTurns.push(state.currentTurn);
        }
        state.lastTurnIndex++;
        state.currentTurn = {
          turnIndex: state.lastTurnIndex,
          userPromptPreview: getUserPromptPreview(message),
          timestamp: message.timestamp,
          files: new Map(),
          stats: {
            filesChanged: 0,
            linesAdded: 0,
            linesRemoved: 0,
          },
        };
      } else if (state.currentTurn && message.toolUseResult) {
        let result = message.toolUseResult;
        if (isFileEditResult(result)) {
          let { filePath, structuredPatch } = result;
          let isNewFile = "type" in result && result.type === "create";
          let fileEntry = state.currentTurn.files.get(filePath);
          if (!fileEntry) {
            fileEntry = {
              filePath,
              hunks: [],
              isNewFile,
              linesAdded: 0,
              linesRemoved: 0,
            };
            state.currentTurn.files.set(filePath, fileEntry);
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
    state.lastProcessedIndex = messages.length;
    let result = [...state.completedTurns];
    if (state.currentTurn && state.currentTurn.files.size > 0) {
      computeTurnStats(state.currentTurn);
      result.push(state.currentTurn);
    }
    return result.reverse();
  }, [messages]);
}
export { useTurnDiffs };
