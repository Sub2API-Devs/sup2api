/**
 * tools/WorkflowTool/world/worldJournal.ts
 *
 * 2.1.316 新增：工作流 world 日志的写入、读取与重放
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-y1shfdfm.js (12)
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

//@ chunk-y1shfdfm.js:51018-51063 placement
/**
 * 当前会话的 world 日志文件路径。
 */
function worldJournalPath() {
  let sessionProjectDir = resolveSessionProjectDir();
  return join(sessionProjectDir, getSessionId(), WORLD_JSONL);
}
//@ chunk-y1shfdfm.js:51063-51207 placement
function worldJournalStorageKey(e) {
  let r = dirname(e);
  let projectKeyIfRepresentable = getProjectKeyIfRepresentable(dirname(r));
  if (projectKeyIfRepresentable === undefined || basename(e) !== WORLD_JSONL) return;
  let s = STORAGE_SPACES.sessionJournal(projectKeyIfRepresentable, basename(r), "world");
  return validateStorageKey(s) === undefined ? s : undefined;
}
//@ chunk-y1shfdfm.js:51207-52217 placement
/**
 * 把 world 行变更顺序追加写入会话日志（远程会话走记录存储）。
 */
function createWorldJournalWriter(e, r, n) {
  let s = worldJournalStorageKey(r);
  let i = false;
  let w = false;
  let resolved = Promise.resolve();
  let k = (R) => {
    resolved = resolved
      .then(async () => {
        if (w) return;
        if (isStorageV5Enabled() && n !== undefined && s !== undefined) {
          let I = await n.append(s, [
            {
              data: toJsonLine(R),
            },
          ]);
          if (!I.ok) {
            logForDebugging(`world journal append failed: ${formatStorageError(I.error)}`, {
              level: "warn",
            });
            throw Error("world journal append failed", {
              cause: I.error,
            });
          }
          return;
        }
        if (!i) {
          await mkdir(dirname(r), {
            recursive: true,
          });
          i = true;
        }
        await appendFile(r, toJsonLine(R));
      })
      .catch((error) => {
        w = true;
        y();
        logFeatureSad("workflow_journal", "append_failed");
        logForDebugging(
          `world journal append failed; the writer detaches and this session's later rows stay in memory only: ${error}`,
          {
            level: "warn",
          },
        );
      });
  };
  let y = e.subscribe((R) => {
    switch (R.kind) {
      case "put": {
        let { addr, kind, fact, by, at, status } = R.row;
        k({
          k: "put",
          addr,
          kind,
          fact,
          by,
          in: R.row.in,
          at,
          status,
        });
        return;
      }
      case "settled": {
        let { addr, status, value: V, error } = R.row;
        if (status === "done")
          k({
            k: "settled",
            addr,
            status,
            value: V,
          });
        else if (status === "failed")
          k({
            k: "settled",
            addr,
            status,
            error,
          });
        return;
      }
      case "retracted":
        k({
          k: "retracted",
          addr: R.row.addr,
        });
        return;
      case "runaway":
        return;
    }
  });
  return () => {
    y();
    return resolved;
  };
}
//@ chunk-y1shfdfm.js:52217-52805 placement
async function readWorldJournal(e, r) {
  let n = worldJournalStorageKey(e);
  if (isStorageV5Enabled() && r !== undefined && n !== undefined) {
    let remoteJournalRecords = await readRemoteJournalRecords(r, n);
    if (remoteJournalRecords === undefined)
      return {
        lines: [],
        skipped: 0,
      };
    let journalLines = parseJournalLines(remoteJournalRecords);
    let R = await r.statMeta(n);
    if (!R.ok) {
      logForDebugging(`world journal stat failed: ${formatStorageError(R.error)}`, {
        level: "warn",
      });
      throw Error("world journal stat failed", {
        cause: R.error,
      });
    }
    return (R.value.storedBytes ?? R.value.size) > R.value.size
      ? {
          lines: journalLines.lines,
          skipped: journalLines.skipped + 1,
        }
      : journalLines;
  }
  let s;
  try {
    s = await readFile(e, "utf8");
  } catch (error) {
    if (isENOENT(error))
      return {
        lines: [],
        skipped: 0,
      };
    throw error;
  }
  let lines = s.split(`
`);
  let w =
    s.length > 0 &&
    !s.endsWith(`
`);
  if (w) lines.pop();
  let journalLines = parseJournalLines(lines);
  return w
    ? {
        lines: journalLines.lines,
        skipped: journalLines.skipped + 1,
      }
    : journalLines;
}
//@ chunk-y1shfdfm.js:52805-53164 placement
function parseJournalLines(e) {
  let r = [];
  let n = new Set();
  let s = 0;
  for (let i of e) {
    if (!i) continue;
    let w;
    try {
      w = jsonParseRaw(i);
    } catch {
      s++;
      continue;
    }
    let h = worldJournalLineSchema().safeParse(w);
    if (!h.success) {
      s++;
      continue;
    }
    if (h.data.k === "put") {
      if (n.has(h.data.addr)) {
        s++;
        continue;
      }
      n.add(h.data.addr);
    }
    r.push(h.data);
  }
  if (s > 0)
    logForDebugging(`world journal: skipped ${s} malformed or invalid line(s)`, {
      level: "warn",
    });
  return {
    lines: r,
    skipped: s,
  };
}
//@ chunk-y1shfdfm.js:53164-53235 placement
/**
 * 由现有行计算下一个可用地址（最大地址 + 1）。
 */
function nextRowAddr(lines) {
  let r = 0;
  for (let n of lines) if (n.addr >= r) r = n.addr + 1;
  return r;
}
//@ chunk-y1shfdfm.js:53235-53774 placement
async function readRemoteJournalRecords(e, r) {
  let textDecoder = new TextDecoder("utf-8", {
    ignoreBOM: true,
  });
  let s = [];
  let i;
  for (;;) {
    let records = await e.readRecords(r, {
      ...(i !== undefined && {
        fromSeq: i,
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
      let y = textDecoder.decode(item.data);
      s.push(
        y.endsWith(`
`)
          ? y.slice(0, -1)
          : y,
      );
    }
    let nextSeq = records.value.nextSeq;
    if (nextSeq === undefined) return s;
    if (i !== undefined && nextSeq <= i) throw Error("world journal read cursor failed to advance");
    i = nextSeq;
  }
}
//@ chunk-y1shfdfm.js:53774-54473 placement
/**
 * 把日志行重放到空 world，重建行、规则与状态。
 */
function replayWorldJournal(e, lines) {
  if (e.rows.length > 0) throw Error("replayWorldJournal: the world is not empty");
  let n = new Map();
  let s = new Map();
  let i = new Set();
  for (let h of lines)
    switch (h.k) {
      case "put":
        n.set(h.addr, h);
        break;
      case "settled":
        s.set(h.addr, h);
        break;
      case "retracted":
        i.add(h.addr);
        break;
    }
  let w = [];
  for (let j = 0; j < n.size; j++) {
    let k = n.get(j);
    if (!k) break;
    let y = {
      addr: j,
      kind: k.kind,
      fact: k.fact,
      by: k.by,
      in: k.in,
      at: k.at,
      status: k.status,
    };
    let R = s.get(j);
    if (R) {
      y.status = R.status;
      if (R.status === "done") y.value = R.value;
      else y.error = R.error;
    }
    if (i.has(j)) y.status = "retracted";
    else if (y.kind === "sub" && y.status === "live") y.status = "retracted";
    else if (y.status === "pending") {
      y.status = "failed";
      y.error = "lost on resume";
    }
    w.push(y);
  }
  e.restore(w);
  return w.length;
}
//@ chunk-y1shfdfm.js:54473-54499 placement
/**
 * 按会话根保存的世界存储实例。
 */
var worldStoreByRoot = new SessionRootSlot(() => new WorldStore());
//@ chunk-y1shfdfm.js:54499-54530 placement
function worldStateOf(e) {
  return worldStoreByRoot.of(e);
}
//@ chunk-y1shfdfm.js:54558-54607 sole-consumer
/**
 * 按会话根保存的 world 日志句柄。
 */
var journalByRoot = new SessionRootSlot(() => new call());
var journalSubscribersByRoot = new SessionRootSlot(() => new Map());
//@ chunk-y1shfdfm.js:54607-55713 placement
function openWorldJournal(e, r) {
  let n = journalByRoot.of(e);
  if (n.opened) return n.opened;
  if (n.unsubscribe === undefined) {
    let sessionId = getSessionId();
    n.unsubscribe = onSessionSwitch((i, w) => {
      if (w === "cd" || w === "hydrate" || i === sessionId) return;
      n.unsubscribe?.();
      journalByRoot.drop(e);
      worldStoreByRoot.drop(e);
    });
  }
  n.opened = (async () => {
    let s = worldStateOf(e);
    let i = worldJournalPath();
    let w = journalSubscribersByRoot.of(e);
    let h = w.get(i);
    if (h !== undefined) {
      logFeatureSad("workflow_journal", "writer_reclaimed");
      logForDebugging(
        `world journal at ${i} had a writer from before a session switch; the re-entered session reclaims the file and the pre-switch world stops journaling`,
        {
          level: "warn",
        },
      );
      await h();
      if (w.get(i) === h) w.delete(i);
    }
    let k = 0;
    let y = false;
    let R = false;
    try {
      let { lines, skipped } = await readWorldJournal(i, r);
      if (lines.length > 0 && s.rows.length === 0) k = replayWorldJournal(s, lines);
      y = skipped === 0 && k === nextRowAddr(lines) && s.rows.length === k;
    } catch (error) {
      R = true;
      logForDebugging(`world journal replay failed: ${error}`, {
        level: "warn",
      });
    }
    if (journalByRoot.peek(e) !== n) return openWorldJournal(e, r);
    if (!y) {
      logFeatureSad("workflow_journal", R ? "replay_failed" : "not_whole");
      logForDebugging(
        `world journal at ${i} is not whole after replay (${k} rows restored); the world stays in memory for this session`,
        {
          level: "warn",
        },
      );
      if (R) n.opened = undefined;
      return {
        restored: k,
        attached: false,
      };
    }
    w.set(i, createWorldJournalWriter(s, i, r));
    logFeatureOk("workflow_journal");
    return {
      restored: k,
      attached: true,
    };
  })();
  return n.opened;
}
export { openWorldJournal, worldStateOf };
