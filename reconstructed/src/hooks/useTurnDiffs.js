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
import { j, R, Q } from "../../vendor/react/cjs/react.production.js";

//@ chunk-mtx4csef.js:14813-14817 placement
j();
//@ chunk-mtx4csef.js:14817-14821 placement
j();
//@ chunk-mtx4csef.js:14821-15070 fingerprint = isFileEditResult (0.874)
function isFileEditResult(result) {
  if (!result || typeof result !== "object") return !1;
  let o = result;
  if (o.staged === !0) return !1;
  let hasFilePath = typeof o.filePath === "string",
    t = Array.isArray(o.structuredPatch) && o.structuredPatch.length > 0,
    u = o.type === "create" && typeof o.content === "string";
  return hasFilePath && (t || u);
}
//@ chunk-mtx4csef.js:15070-15142 fingerprint = isFileWriteOutput (1)
function isFileWriteOutput(result) {
  return "type" in result && (result.type === "create" || result.type === "update");
}
//@ chunk-mtx4csef.js:15142-15286 fingerprint = countHunkLines (1)
function countHunkLines(hunks) {
  let o = 0,
    i = 0;
  for (let hunk of hunks)
    for (let line of hunk.lines)
      if (line.startsWith("+")) o++;
      else if (line.startsWith("-")) i++;
  return { added: o, removed: i };
}
//@ chunk-mtx4csef.js:15286-15435 file-local
function getUserPromptPreview(message) {
  if (message.type !== "user") return "";
  let content = message.message.content,
    text = typeof content === "string" ? content : "";
  if (text.length <= 30) return text;
  return text.slice(0, 29) + "\u2026";
}
//@ chunk-mtx4csef.js:15435-15590 fingerprint = computeTurnStats (1)
function computeTurnStats(turn) {
  let o = 0,
    i = 0;
  for (let file of turn.files.values()) ((o += file.linesAdded), (i += file.linesRemoved));
  turn.stats = { filesChanged: turn.files.size, linesAdded: o, linesRemoved: i };
}
//@ chunk-mtx4csef.js:15590-17021 fingerprint = useTurnDiffs (1)
function useTurnDiffs(messages) {
  let cache = R({ completedTurns: [], currentTurn: null, lastProcessedIndex: 0, lastTurnIndex: 0 });
  return Q(() => {
    let i = cache.current;
    if (messages.length < i.lastProcessedIndex)
      ((i.completedTurns = []), (i.currentTurn = null), (i.lastProcessedIndex = 0), (i.lastTurnIndex = 0));
    for (
      let lastProcessedIndex = i.lastProcessedIndex;
      lastProcessedIndex < messages.length;
      lastProcessedIndex++
    ) {
      let message = messages[lastProcessedIndex];
      if (!message || message.type !== "user") continue;
      if (
        !(
          message.toolUseResult ||
          (Array.isArray(message.message.content) && message.message.content[0]?.type === "tool_result")
        ) &&
        !message.isMeta
      ) {
        if (i.currentTurn && i.currentTurn.files.size > 0)
          (computeTurnStats(i.currentTurn), i.completedTurns.push(i.currentTurn));
        (i.lastTurnIndex++,
          (i.currentTurn = {
            turnIndex: i.lastTurnIndex,
            userPromptPreview: getUserPromptPreview(message),
            timestamp: message.timestamp,
            files: new Map(),
            stats: { filesChanged: 0, linesAdded: 0, linesRemoved: 0 },
          }));
      } else if (i.currentTurn && message.toolUseResult) {
        let result = message.toolUseResult;
        if (isFileEditResult(result)) {
          let { filePath: filePath, structuredPatch: structuredPatch } = result,
            g = "type" in result && result.type === "create",
            fileEntry = i.currentTurn.files.get(filePath);
          if (!fileEntry)
            ((fileEntry = { filePath: filePath, hunks: [], isNewFile: g, linesAdded: 0, linesRemoved: 0 }),
              i.currentTurn.files.set(filePath, fileEntry));
          if (g && structuredPatch.length === 0 && isFileWriteOutput(result)) {
            let parts = result.content.split(`
`),
              syntheticHunk = {
                oldStart: 0,
                oldLines: 0,
                newStart: 1,
                newLines: parts.length,
                lines: parts.map((V) => "+" + V),
              };
            (fileEntry.hunks.push(syntheticHunk), (fileEntry.linesAdded += parts.length));
          } else {
            fileEntry.hunks.push(...structuredPatch);
            let { added: added, removed: removed } = countHunkLines(structuredPatch);
            ((fileEntry.linesAdded += added), (fileEntry.linesRemoved += removed));
          }
          if (g) fileEntry.isNewFile = !0;
        }
      }
    }
    i.lastProcessedIndex = messages.length;
    let result = [...i.completedTurns];
    if (i.currentTurn && i.currentTurn.files.size > 0)
      (computeTurnStats(i.currentTurn), result.push(i.currentTurn));
    return result.reverse();
  }, [messages]);
}

export { useTurnDiffs };
