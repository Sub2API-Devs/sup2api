/**
 * services/workflow/localFileJournal.ts
 *
 * 2.1.316 新增：本地文件日志
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-41w44bgm.js (3)
 * attribution: placement 3
 */
import { join, join as join_2, dirname, dirname as dirname_2 } from "path";
import { readFile, mkdir, mkdir as mkdir_2, open, open as open_2, appendFile } from "fs/promises";
import { nDr, Iz } from "./snapshots.js";
import { STORAGE_SPACES } from "../../utils/storage/storageSpaces.js";
import { getSessionId } from "../../bootstrap/state.js";
import { validateStorageKey } from "../../utils/storage/storageKeys.js";
import { createMutex } from "../../utils/promiseQueue.js";
import { isENOENT } from "../../utils/errors.js";
import {
  RESTORING_LINE,
  RESTORED_LINE,
  indexJournalEntries,
  RESUMED_LINE,
  containsLaunchedLine,
} from "./journalEntries.js";
import { toJsonLine, jsonParseRaw } from "../../utils/slowOperations.js";
import { writeFileAtomic } from "../../utils/atomicPublishWrite.js";
import { logForDebugging } from "../../utils/debug.js";
import { formatStorageError } from "../../utils/storage/storageErrors.js";

//@ chunk-41w44bgm.js:30489-30500 placement
class iin {}
//@ chunk-41w44bgm.js:30500-30619 placement
function workflowJournalKey(e) {
  let n = nDr();
  if (n === void 0) return;
  let journal = STORAGE_SPACES.journal(n, getSessionId(), ["workflows", e]);
  return validateStorageKey(journal) === void 0 ? journal : void 0;
}
//@ chunk-41w44bgm.js:30619-33596 placement
class LocalFileJournal {
  path;
  storageV5;
  dirReady = !1;
  isTailEnded = !1;
  appendTurns = createMutex();
  constructor(e, n) {
    this.path = join(Iz(e), "journal.jsonl");
    let r = n === void 0 ? void 0 : workflowJournalKey(e);
    this.storageV5 = n === void 0 || r === void 0 ? void 0 : { backend: n, key: r };
  }
  async readLines() {
    if (this.storageV5 !== void 0) return this.loadV5(this.storageV5);
    try {
      return (await readFile(this.path, "utf8")).split(`
`);
    } catch (error) {
      if (!isENOENT(error)) throw error;
      return;
    }
  }
  async restoreState() {
    let lines = await this.readLines();
    if (lines === void 0) return "missing";
    return lines[0] === RESTORING_LINE && !lines.includes(RESTORED_LINE) ? "partial" : "complete";
  }
  async writeRestored(e) {
    let mapped = [{ type: "restoring" }, ...e, { type: "restored" }].map((y) => toJsonLine(y)),
      storageV5 = this.storageV5;
    if (storageV5 === void 0) {
      (await mkdir(dirname(this.path), { recursive: !0 }), await writeFileAtomic(this.path, mapped.join("")));
      return;
    }
    let h = await storageV5.backend.delete(storageV5.key);
    if (!h.ok && h.error.code !== "NotFound")
      throw Error("LocalFileJournal: journal delete failed", { cause: h.error });
    let append = await storageV5.backend.append(
      storageV5.key,
      mapped.map((y) => ({ data: y })),
    );
    if (!append.ok) throw Error("LocalFileJournal: journal append failed", { cause: append.error });
  }
  async load() {
    let lines = await this.readLines();
    if (lines === void 0) return indexJournalEntries([]);
    let n = [],
      r = this.storageV5 !== void 0 && (await this.isTailTorn());
    for (let [h, T] of lines.entries()) {
      if (!T || T === RESUMED_LINE) continue;
      try {
        n.push(jsonParseRaw(T));
      } catch (error) {
        let L =
          ((this.storageV5 === void 0 && h === lines.length - 1) || lines[h + 1] === RESUMED_LINE) &&
          !containsLaunchedLine(T);
        ((r ||= !L),
          logForDebugging(`LocalFileJournal: skipping unparseable line in ${this.path}: ${error}`));
      }
    }
    return { ...indexJournalEntries(n), ...(r && { hasUnreadLine: !0 }) };
  }
  async loadV5({ backend: e, key: n }) {
    let textDecoder = new TextDecoder("utf-8", { ignoreBOM: !0 }),
      h = [],
      T;
    for (;;) {
      let records = await e.readRecords(n, T === void 0 ? void 0 : { fromSeq: T });
      if (!records.ok) {
        if (records.error.code === "NotFound") return;
        throw (
          logForDebugging(
            `LocalFileJournal: read of ${this.path} failed: ${formatStorageError(records.error)}`,
          ),
          Error("LocalFileJournal: journal read failed", { cause: records.error })
        );
      }
      for (let item of records.value.items) {
        let decode = textDecoder.decode(item.data);
        h.push(
          decode.endsWith(`
`)
            ? decode.slice(0, -1)
            : decode,
        );
      }
      let nextSeq = records.value.nextSeq;
      if (nextSeq === void 0) return h;
      if (T !== void 0 && nextSeq <= T)
        throw Error("LocalFileJournal: journal read cursor failed to advance");
      T = nextSeq;
    }
  }
  async isTailTorn() {
    let storageV5 = this.storageV5;
    if (storageV5 !== void 0) {
      let stats = await storageV5.backend.stat(storageV5.key);
      if (!stats.ok) {
        if (stats.error.code === "NotFound") return !1;
        throw Error("LocalFileJournal: journal stat failed", { cause: stats.error });
      }
      return (stats.value.tornTailBytes ?? 0) > 0;
    }
    let n;
    try {
      n = await open_2(this.path, "r");
    } catch (error) {
      if (isENOENT(error)) return !1;
      throw error;
    }
    try {
      let { size: size } = await n.stat();
      if (size === 0) return !1;
      let alloc = Buffer.alloc(1);
      return (await n.read(alloc, 0, 1, size - 1), alloc[0] !== 10);
    } finally {
      await n.close();
    }
  }
  async append(e) {
    let acquire = await this.appendTurns.acquire();
    try {
      let r = !this.isTailEnded && (await this.isTailTorn()),
        storageV5 = this.storageV5;
      if (storageV5 !== void 0) {
        let y = r
            ? [
                {
                  data: `
`,
                },
                {
                  data: `${RESUMED_LINE}
`,
                },
              ]
            : [],
          append = await storageV5.backend.append(storageV5.key, [...y, { data: toJsonLine(e) }]);
        if (!append.ok)
          throw (
            logForDebugging(
              `LocalFileJournal: append to ${this.path} failed: ${formatStorageError(append.error)}`,
            ),
            Error("LocalFileJournal: journal append failed", { cause: append.error })
          );
        this.isTailEnded = !0;
        return;
      }
      if (!this.dirReady) (await mkdir(dirname(this.path), { recursive: !0 }), (this.dirReady = !0));
      let T = r
        ? `
${RESUMED_LINE}
`
        : "";
      (await appendFile(this.path, T + toJsonLine(e), "utf8"), (this.isTailEnded = !0));
    } finally {
      acquire();
    }
  }
}

export { iin, LocalFileJournal };
