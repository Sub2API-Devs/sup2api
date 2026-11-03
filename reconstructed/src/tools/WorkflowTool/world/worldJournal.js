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
import { join, dirname, basename, basename as basename_2 } from "path";
import { mkdir, appendFile, readFile } from "fs/promises";
import { resolveSessionProjectDir, getProjectKeyIfRepresentable } from "../../../utils/sessionStorage.js";
import { getSessionId, onSessionSwitch } from "../../../bootstrap/state.js";
import { WORLD_JSONL, worldJournalLineSchema, Kt } from "./runRegistry.js";
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
function Zr() {
  let e = resolveSessionProjectDir();
  return join(e, getSessionId(), WORLD_JSONL);
}
//@ chunk-y1shfdfm.js:51063-51207 placement
function worldJournalStorageKey(e) {
  let r = dirname(e),
    n = getProjectKeyIfRepresentable(dirname(r));
  if (n === void 0 || basename_2(e) !== WORLD_JSONL) return;
  let sessionJournal = STORAGE_SPACES.sessionJournal(n, basename_2(r), "world");
  return validateStorageKey(sessionJournal) === void 0 ? sessionJournal : void 0;
}
/**
 * 把 world 行变更顺序追加写入会话日志（远程会话走记录存储）。
 */
//@ chunk-y1shfdfm.js:51207-52217 placement
function createWorldJournalWriter(e, r, n) {
  let s = worldJournalStorageKey(r),
    i = !1,
    w = !1,
    resolved = Promise.resolve(),
    k = (R) => {
      resolved = resolved
        .then(async () => {
          if (w) return;
          if (isStorageV5Enabled() && n !== void 0 && s !== void 0) {
            let append = await n.append(s, [{ data: toJsonLine(R) }]);
            if (!append.ok)
              throw (
                logForDebugging(`world journal append failed: ${formatStorageError(append.error)}`, {
                  level: "warn",
                }),
                Error("world journal append failed", { cause: append.error })
              );
            return;
          }
          if (!i) (await mkdir(dirname(r), { recursive: !0 }), (i = !0));
          await appendFile(r, toJsonLine(R));
        })
        .catch((I) => {
          ((w = !0),
            subscribe(),
            logFeatureSad("workflow_journal", "append_failed"),
            logForDebugging(
              `world journal append failed; the writer detaches and this session's later rows stay in memory only: ${I}`,
              { level: "warn" },
            ));
        });
    },
    subscribe = e.subscribe((R) => {
      switch (R.kind) {
        case "put": {
          let { addr: addr, kind: kind, fact: fact, by: by, at: at, status: status } = R.row;
          k({ k: "put", addr: addr, kind: kind, fact: fact, by: by, in: R.row.in, at: at, status: status });
          return;
        }
        case "settled": {
          let { addr: addr, status: status, value: V, error: error } = R.row;
          if (status === "done") k({ k: "settled", addr: addr, status: status, value: V });
          else if (status === "failed") k({ k: "settled", addr: addr, status: status, error: error });
          return;
        }
        case "retracted":
          k({ k: "retracted", addr: R.row.addr });
          return;
        case "runaway":
          return;
      }
    });
  return () => (subscribe(), resolved);
}
//@ chunk-y1shfdfm.js:52217-52805 placement
async function readWorldJournal(e, r) {
  let n = worldJournalStorageKey(e);
  if (isStorageV5Enabled() && r !== void 0 && n !== void 0) {
    let k = await readRemoteJournalRecords(r, n);
    if (k === void 0) return { lines: [], skipped: 0 };
    let y = parseJournalLines(k),
      statMeta = await r.statMeta(n);
    if (!statMeta.ok)
      throw (
        logForDebugging(`world journal stat failed: ${formatStorageError(statMeta.error)}`, {
          level: "warn",
        }),
        Error("world journal stat failed", { cause: statMeta.error })
      );
    return (statMeta.value.storedBytes ?? statMeta.value.size) > statMeta.value.size
      ? { lines: y.lines, skipped: y.skipped + 1 }
      : y;
  }
  let s;
  try {
    s = await readFile(e, "utf8");
  } catch (error) {
    if (isENOENT(error)) return { lines: [], skipped: 0 };
    throw error;
  }
  let parts = s.split(`
`),
    w =
      s.length > 0 &&
      !s.endsWith(`
`);
  if (w) parts.pop();
  let h = parseJournalLines(parts);
  return w ? { lines: h.lines, skipped: h.skipped + 1 } : h;
}
//@ chunk-y1shfdfm.js:52805-53164 placement
function parseJournalLines(e) {
  let r = [],
    n = new Set(),
    s = 0;
  for (let i of e) {
    if (!i) continue;
    let w;
    try {
      w = jsonParseRaw(i);
    } catch {
      s++;
      continue;
    }
    let safeParse = worldJournalLineSchema().safeParse(w);
    if (!safeParse.success) {
      s++;
      continue;
    }
    if (safeParse.data.k === "put") {
      if (n.has(safeParse.data.addr)) {
        s++;
        continue;
      }
      n.add(safeParse.data.addr);
    }
    r.push(safeParse.data);
  }
  if (s > 0) logForDebugging(`world journal: skipped ${s} malformed or invalid line(s)`, { level: "warn" });
  return { lines: r, skipped: s };
}
//@ chunk-y1shfdfm.js:53164-53235 placement
function ot(e) {
  let r = 0;
  for (let n of e) if (n.addr >= r) r = n.addr + 1;
  return r;
}
//@ chunk-y1shfdfm.js:53235-53774 placement
async function readRemoteJournalRecords(e, r) {
  let textDecoder = new TextDecoder("utf-8", { ignoreBOM: !0 }),
    s = [],
    i;
  for (;;) {
    let records = await e.readRecords(r, { ...(i !== void 0 && { fromSeq: i }), maxBytes: Kt });
    if (!records.ok) {
      if (records.error.code === "NotFound") return;
      throw (
        logForDebugging(`world journal read failed: ${formatStorageError(records.error)}`, { level: "warn" }),
        Error("world journal read failed", { cause: records.error })
      );
    }
    for (let item of records.value.items) {
      let decode = textDecoder.decode(item.data);
      s.push(
        decode.endsWith(`
`)
          ? decode.slice(0, -1)
          : decode,
      );
    }
    let nextSeq = records.value.nextSeq;
    if (nextSeq === void 0) return s;
    if (i !== void 0 && nextSeq <= i) throw Error("world journal read cursor failed to advance");
    i = nextSeq;
  }
}
/**
 * 把日志行重放到空 world，重建行、规则与状态。
 */
//@ chunk-y1shfdfm.js:53774-54473 placement
function replayWorldJournal(e, r) {
  if (e.rows.length > 0) throw Error("replayWorldJournal: the world is not empty");
  let n = new Map(),
    s = new Map(),
    i = new Set();
  for (let h of r)
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
  for (let h = 0; h < n.size; h++) {
    let k = n.get(h);
    if (!k) break;
    let y = { addr: h, kind: k.kind, fact: k.fact, by: k.by, in: k.in, at: k.at, status: k.status },
      R = s.get(h);
    if (R)
      if (((y.status = R.status), R.status === "done")) y.value = R.value;
      else y.error = R.error;
    if (i.has(h)) y.status = "retracted";
    else if (y.kind === "sub" && y.status === "live") y.status = "retracted";
    else if (y.status === "pending") ((y.status = "failed"), (y.error = "lost on resume"));
    w.push(y);
  }
  return (e.restore(w), w.length);
}
//@ chunk-y1shfdfm.js:54473-54499 placement
var it = new SessionRootSlot(() => new WorldStore());
//@ chunk-y1shfdfm.js:54499-54530 placement
function worldStateOf(e) {
  return it.of(e);
}
//@ chunk-y1shfdfm.js:54558-54607 sole-consumer
var kr = new SessionRootSlot(() => new call()),
  Jt = new SessionRootSlot(() => new Map());
//@ chunk-y1shfdfm.js:54607-55713 placement
function openWorldJournal(e, r) {
  let of = kr.of(e);
  if (of.opened) return of.opened;
  if (of.unsubscribe === void 0) {
    let s = getSessionId();
    of.unsubscribe = onSessionSwitch((i, w) => {
      if (w === "cd" || w === "hydrate" || i === s) return;
      (of.unsubscribe?.(), kr.drop(e), it.drop(e));
    });
  }
  return (
    (of.opened = (async () => {
      let s = worldStateOf(e),
        i = Zr(),
        of_2 = Jt.of(e),
        h = of_2.get(i);
      if (h !== void 0) {
        if (
          (logFeatureSad("workflow_journal", "writer_reclaimed"),
          logForDebugging(
            `world journal at ${i} had a writer from before a session switch; the re-entered session reclaims the file and the pre-switch world stops journaling`,
            { level: "warn" },
          ),
          await h(),
          of_2.get(i) === h)
        )
          of_2.delete(i);
      }
      let k = 0,
        y = !1,
        R = !1;
      try {
        let { lines: lines, skipped: skipped } = await readWorldJournal(i, r);
        if (lines.length > 0 && s.rows.length === 0) k = replayWorldJournal(s, lines);
        y = skipped === 0 && k === ot(lines) && s.rows.length === k;
      } catch (error) {
        ((R = !0), logForDebugging(`world journal replay failed: ${error}`, { level: "warn" }));
      }
      if (kr.peek(e) !== of) return openWorldJournal(e, r);
      if (!y) {
        if (
          (logFeatureSad("workflow_journal", R ? "replay_failed" : "not_whole"),
          logForDebugging(
            `world journal at ${i} is not whole after replay (${k} rows restored); the world stays in memory for this session`,
            { level: "warn" },
          ),
          R)
        )
          of.opened = void 0;
        return { restored: k, attached: !1 };
      }
      return (
        of_2.set(i, createWorldJournalWriter(s, i, r)),
        logFeatureOk("workflow_journal"),
        { restored: k, attached: !0 }
      );
    })()),
    of.opened
  );
}

export { openWorldJournal, worldStateOf };
