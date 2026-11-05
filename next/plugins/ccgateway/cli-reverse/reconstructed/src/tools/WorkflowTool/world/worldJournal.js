/**
 * tools/WorkflowTool/world/worldJournal.ts
 *
 * 2.1.316 新增：工作流 world 日志的写入、读取与重放
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * new in 2.1.318 (2.1.88 has no file at this path)
 * pieces: chunk-kgbsr4tm.js (12)
 * attribution: placement 11, sole-consumer 1
 */
import { join, dirname, basename } from "path";
import { mkdir, appendFile, readFile } from "fs/promises";
import { resolveSessionProjectDir, getProjectKeyIfRepresentable } from "../../../utils/sessionStorage.js";
import { getSessionId, onSessionSwitch } from "../../../bootstrap/state.js";
import { WORLD_JSONL, worldJournalLineSchema, MAX_WORLD_JOURNAL_READ_BYTES } from "./runRegistry.js";
import { STORAGE_SPACES } from "../../../utils/storage/storageSpaces.js";
import { validateStorageKey } from "../../../utils/storage/storageKeys.js";
import { isStorageV5Enabled } from "../../../utils/hoverRest.js";
import { toJsonLine, jsonParseRaw } from "../../../utils/slowOperations.js";
import { logForDebugging } from "../../../utils/debug.js";
import { formatStorageError } from "../../../utils/storage/storageErrors.js";
import { logFeatureSad, logFeatureOk } from "../../../services/analytics/featureTelemetry.js";
import { isENOENT } from "../../../utils/errors.js";
import { SessionRootSlot } from "../../../bootstrap/sessionSlices.js";
import { WorldStore } from "./worldStore.js";
import { call } from "../../../commands/extra-usage/extra-usage-noninteractive.js";

//@ chunk-kgbsr4tm.js:52682-52727 placement
/**
 * 当前会话的 world 日志文件路径。
 */
function worldJournalPath() {
  let sessionProjectDir = resolveSessionProjectDir();
  return join(sessionProjectDir, getSessionId(), WORLD_JSONL);
}
//@ chunk-kgbsr4tm.js:52727-52871 placement
function worldJournalStorageKey(filePath) {
  let journalDir = dirname(filePath);
  let projectKeyIfRepresentable = getProjectKeyIfRepresentable(dirname(journalDir));
  if (projectKeyIfRepresentable === undefined || basename(filePath) !== WORLD_JSONL) return;
  let storageKey = STORAGE_SPACES.sessionJournal(projectKeyIfRepresentable, basename(journalDir), "world");
  return validateStorageKey(storageKey) === undefined ? storageKey : undefined;
}
//@ chunk-kgbsr4tm.js:52871-53881 placement
/**
 * 把 world 行变更顺序追加写入会话日志（远程会话走记录存储）。
 */
function createWorldJournalWriter(world, filePath, storageV5) {
  let storageKey = worldJournalStorageKey(filePath);
  let dirMade = false;
  let failed = false;
  let resolved = Promise.resolve();
  let appendLine = (record) => {
    resolved = resolved
      .then(async () => {
        if (failed) return;
        if (isStorageV5Enabled() && storageV5 !== undefined && storageKey !== undefined) {
          let writeResult = await storageV5.append(storageKey, [
            {
              data: toJsonLine(record),
            },
          ]);
          if (!writeResult.ok) {
            logForDebugging(`world journal append failed: ${formatStorageError(writeResult.error)}`, {
              level: "warn",
            });
            throw Error("world journal append failed", {
              cause: writeResult.error,
            });
          }
          return;
        }
        if (!dirMade) {
          await mkdir(dirname(filePath), {
            recursive: true,
          });
          dirMade = true;
        }
        await appendFile(filePath, toJsonLine(record));
      })
      .catch((error) => {
        failed = true;
        unsubscribe();
        logFeatureSad("workflow_journal", "append_failed");
        logForDebugging(
          `world journal append failed; the writer detaches and this session's later rows stay in memory only: ${error}`,
          {
            level: "warn",
          },
        );
      });
  };
  let unsubscribe = world.subscribe((change) => {
    switch (change.kind) {
      case "put": {
        let { addr, kind, fact, by, at, status } = change.row;
        appendLine({
          k: "put",
          addr,
          kind,
          fact,
          by,
          in: change.row.in,
          at,
          status,
        });
        return;
      }
      case "settled": {
        let { addr, status, value: settledValue, error } = change.row;
        if (status === "done")
          appendLine({
            k: "settled",
            addr,
            status,
            value: settledValue,
          });
        else if (status === "failed")
          appendLine({
            k: "settled",
            addr,
            status,
            error,
          });
        return;
      }
      case "retracted":
        appendLine({
          k: "retracted",
          addr: change.row.addr,
        });
        return;
      case "runaway":
        return;
    }
  });
  return () => {
    unsubscribe();
    return resolved;
  };
}
//@ chunk-kgbsr4tm.js:53881-54469 placement
async function readWorldJournal(filePath, storageV5) {
  let storageKey = worldJournalStorageKey(filePath);
  if (isStorageV5Enabled() && storageV5 !== undefined && storageKey !== undefined) {
    let lines = await readRemoteJournalRecords(storageV5, storageKey);
    if (lines === undefined)
      return {
        lines: [],
        skipped: 0,
      };
    let journalLines = parseJournalLines(lines);
    let statResult = await storageV5.statMeta(storageKey);
    if (!statResult.ok) {
      logForDebugging(`world journal stat failed: ${formatStorageError(statResult.error)}`, {
        level: "warn",
      });
      throw Error("world journal stat failed", {
        cause: statResult.error,
      });
    }
    return (statResult.value.storedBytes ?? statResult.value.size) > statResult.value.size
      ? {
          lines: journalLines.lines,
          skipped: journalLines.skipped + 1,
        }
      : journalLines;
  }
  let rawText;
  try {
    rawText = await readFile(filePath, "utf8");
  } catch (error) {
    if (isENOENT(error))
      return {
        lines: [],
        skipped: 0,
      };
    throw error;
  }
  let lines = rawText.split(`
`);
  let missingFinalNewline =
    rawText.length > 0 &&
    !rawText.endsWith(`
`);
  if (missingFinalNewline) lines.pop();
  let journalLines = parseJournalLines(lines);
  return missingFinalNewline
    ? {
        lines: journalLines.lines,
        skipped: journalLines.skipped + 1,
      }
    : journalLines;
}
//@ chunk-kgbsr4tm.js:54469-54828 placement
function parseJournalLines(lines) {
  let parsed = [];
  let seenAddrs = new Set();
  let skipped = 0;
  for (let line of lines) {
    if (!line) continue;
    let parsedLine;
    try {
      parsedLine = jsonParseRaw(line);
    } catch {
      skipped++;
      continue;
    }
    let schemaResult = worldJournalLineSchema().safeParse(parsedLine);
    if (!schemaResult.success) {
      skipped++;
      continue;
    }
    if (schemaResult.data.k === "put") {
      if (seenAddrs.has(schemaResult.data.addr)) {
        skipped++;
        continue;
      }
      seenAddrs.add(schemaResult.data.addr);
    }
    parsed.push(schemaResult.data);
  }
  if (skipped > 0)
    logForDebugging(`world journal: skipped ${skipped} malformed or invalid line(s)`, {
      level: "warn",
    });
  return {
    lines: parsed,
    skipped,
  };
}
//@ chunk-kgbsr4tm.js:54828-54899 placement
/**
 * 由现有行计算下一个可用地址（最大地址 + 1）。
 */
function nextRowAddr(lines) {
  let nextAddr = 0;
  for (let line of lines) if (line.addr >= nextAddr) nextAddr = line.addr + 1;
  return nextAddr;
}
//@ chunk-kgbsr4tm.js:54899-55438 placement
async function readRemoteJournalRecords(storageV5, storageKey) {
  let textDecoder = new TextDecoder("utf-8", {
    ignoreBOM: true,
  });
  let lines = [];
  let fromSeq;
  for (;;) {
    let records = await storageV5.readRecords(storageKey, {
      ...(fromSeq !== undefined && {
        fromSeq,
      }),
      maxBytes: MAX_WORLD_JOURNAL_READ_BYTES,
    });
    if (!records.ok) {
      if (records.error.code === "NotFound") return;
      logForDebugging(`world journal read failed: ${formatStorageError(records.error)}`, {
        level: "warn",
      });
      throw Error("world journal read failed", {
        cause: records.error,
      });
    }
    for (let item of records.value.items) {
      let decoded = textDecoder.decode(item.data);
      lines.push(
        decoded.endsWith(`
`)
          ? decoded.slice(0, -1)
          : decoded,
      );
    }
    let nextSeq = records.value.nextSeq;
    if (nextSeq === undefined) return lines;
    if (fromSeq !== undefined && nextSeq <= fromSeq)
      throw Error("world journal read cursor failed to advance");
    fromSeq = nextSeq;
  }
}
//@ chunk-kgbsr4tm.js:55438-56137 placement
/**
 * 把日志行重放到空 world，重建行、规则与状态。
 */
function replayWorldJournal(world, lines) {
  if (world.rows.length > 0) throw Error("replayWorldJournal: the world is not empty");
  let settledByAddr = new Map();
  let retractedAddrs = new Map();
  let seenAddrs = new Set();
  for (let line of lines)
    switch (line.k) {
      case "put":
        settledByAddr.set(line.addr, line);
        break;
      case "settled":
        retractedAddrs.set(line.addr, line);
        break;
      case "retracted":
        seenAddrs.add(line.addr);
        break;
    }
  let rows = [];
  for (let j = 0; j < settledByAddr.size; j++) {
    let putRow = settledByAddr.get(j);
    if (!putRow) break;
    let row = {
      addr: j,
      kind: putRow.kind,
      fact: putRow.fact,
      by: putRow.by,
      in: putRow.in,
      at: putRow.at,
      status: putRow.status,
    };
    let settledRow = retractedAddrs.get(j);
    if (settledRow) {
      row.status = settledRow.status;
      if (settledRow.status === "done") row.value = settledRow.value;
      else row.error = settledRow.error;
    }
    if (seenAddrs.has(j)) row.status = "retracted";
    else if (row.kind === "sub" && row.status === "live") row.status = "retracted";
    else if (row.status === "pending") {
      row.status = "failed";
      row.error = "lost on resume";
    }
    rows.push(row);
  }
  world.restore(rows);
  return rows.length;
}
//@ chunk-kgbsr4tm.js:56137-56163 placement
/**
 * 按会话根保存的世界存储实例。
 */
var worldStoreByRoot = new SessionRootSlot(() => new WorldStore());
//@ chunk-kgbsr4tm.js:56163-56194 placement
function worldStateOf(root) {
  return worldStoreByRoot.of(root);
}
//@ chunk-kgbsr4tm.js:56222-56271 sole-consumer
/**
 * 按会话根保存的 world 日志句柄。
 */
var journalByRoot = new SessionRootSlot(() => new call());
var journalSubscribersByRoot = new SessionRootSlot(() => new Map());
//@ chunk-kgbsr4tm.js:56271-57377 placement
function openWorldJournal(root, options) {
  let state = journalByRoot.of(root);
  if (state.opened) return state.opened;
  if (state.unsubscribe === undefined) {
    let sessionId = getSessionId();
    state.unsubscribe = onSessionSwitch((nextSessionId, reason) => {
      if (reason === "cd" || reason === "hydrate" || nextSessionId === sessionId) return;
      state.unsubscribe?.();
      journalByRoot.drop(root);
      worldStoreByRoot.drop(root);
    });
  }
  state.opened = (async () => {
    let world = worldStateOf(root);
    let journalPath = worldJournalPath();
    let subscribers = journalSubscribersByRoot.of(root);
    let priorWriter = subscribers.get(journalPath);
    if (priorWriter !== undefined) {
      logFeatureSad("workflow_journal", "writer_reclaimed");
      logForDebugging(
        `world journal at ${journalPath} had a writer from before a session switch; the re-entered session reclaims the file and the pre-switch world stops journaling`,
        {
          level: "warn",
        },
      );
      await priorWriter();
      if (subscribers.get(journalPath) === priorWriter) subscribers.delete(journalPath);
    }
    let restoredCount = 0;
    let isWhole = false;
    let replayFailed = false;
    try {
      let { lines, skipped } = await readWorldJournal(journalPath, options);
      if (lines.length > 0 && world.rows.length === 0) restoredCount = replayWorldJournal(world, lines);
      isWhole = skipped === 0 && restoredCount === nextRowAddr(lines) && world.rows.length === restoredCount;
    } catch (error) {
      replayFailed = true;
      logForDebugging(`world journal replay failed: ${error}`, {
        level: "warn",
      });
    }
    if (journalByRoot.peek(root) !== state) return openWorldJournal(root, options);
    if (!isWhole) {
      logFeatureSad("workflow_journal", replayFailed ? "replay_failed" : "not_whole");
      logForDebugging(
        `world journal at ${journalPath} is not whole after replay (${restoredCount} rows restored); the world stays in memory for this session`,
        {
          level: "warn",
        },
      );
      if (replayFailed) state.opened = undefined;
      return {
        restored: restoredCount,
        attached: false,
      };
    }
    subscribers.set(journalPath, createWorldJournalWriter(world, journalPath, options));
    logFeatureOk("workflow_journal");
    return {
      restored: restoredCount,
      attached: true,
    };
  })();
  return state.opened;
}
export { openWorldJournal, worldStateOf };
