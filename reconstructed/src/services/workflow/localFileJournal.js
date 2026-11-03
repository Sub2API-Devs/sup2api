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
import { join, dirname } from "path";
import { readFile, mkdir, open, appendFile } from "fs/promises";
import { sessionProjectKey, subagentWorkflowDir } from "./snapshots.js";
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
/**
 * 空类占位（工作流日志相关，当前无字段）。
 */
class WorkflowJournalStub {}
//@ chunk-41w44bgm.js:30500-30619 placement
function workflowJournalKey(e) {
  let n = sessionProjectKey();
  if (n === undefined) return;
  let r = STORAGE_SPACES.journal(n, getSessionId(), ["workflows", e]);
  return validateStorageKey(r) === undefined ? r : undefined;
}
//@ chunk-41w44bgm.js:30619-33596 placement
class LocalFileJournal {
  path;
  storageV5;
  dirReady = false;
  isTailEnded = false;
  appendTurns = createMutex();
  constructor(e, n) {
    this.path = join(subagentWorkflowDir(e), "journal.jsonl");
    let r = n === undefined ? undefined : workflowJournalKey(e);
    this.storageV5 =
      n === undefined || r === undefined
        ? undefined
        : {
            backend: n,
            key: r,
          };
  }
  async readLines() {
    if (this.storageV5 !== undefined) return this.loadV5(this.storageV5);
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
    if (lines === undefined) return "missing";
    return lines[0] === RESTORING_LINE && !lines.includes(RESTORED_LINE) ? "partial" : "complete";
  }
  async writeRestored(e) {
    let mapped = [
      {
        type: "restoring",
      },
      ...e,
      {
        type: "restored",
      },
    ].map((y) => toJsonLine(y));
    let storageV5 = this.storageV5;
    if (storageV5 === undefined) {
      await mkdir(dirname(this.path), {
        recursive: true,
      });
      await writeFileAtomic(this.path, mapped.join(""));
      return;
    }
    let h = await storageV5.backend.delete(storageV5.key);
    if (!h.ok && h.error.code !== "NotFound")
      throw Error("LocalFileJournal: journal delete failed", {
        cause: h.error,
      });
    let T = await storageV5.backend.append(
      storageV5.key,
      mapped.map((data) => ({
        data,
      })),
    );
    if (!T.ok)
      throw Error("LocalFileJournal: journal append failed", {
        cause: T.error,
      });
  }
  async load() {
    let lines = await this.readLines();
    if (lines === undefined) return indexJournalEntries([]);
    let entries = [];
    let r = this.storageV5 !== undefined && (await this.isTailTorn());
    for (let [h, T] of lines.entries()) {
      if (!T || T === RESUMED_LINE) continue;
      try {
        entries.push(jsonParseRaw(T));
      } catch (error) {
        let L =
          ((this.storageV5 === undefined && h === lines.length - 1) || lines[h + 1] === RESUMED_LINE) &&
          !containsLaunchedLine(T);
        r ||= !L;
        logForDebugging(`LocalFileJournal: skipping unparseable line in ${this.path}: ${error}`);
      }
    }
    return {
      ...indexJournalEntries(entries),
      ...(r && {
        hasUnreadLine: true,
      }),
    };
  }
  async loadV5({ backend, key }) {
    let textDecoder = new TextDecoder("utf-8", {
      ignoreBOM: true,
    });
    let h = [];
    let T;
    for (;;) {
      let records = await backend.readRecords(
        key,
        T === undefined
          ? undefined
          : {
              fromSeq: T,
            },
      );
      if (!records.ok) {
        if (records.error.code === "NotFound") return;
        logForDebugging(
          `LocalFileJournal: read of ${this.path} failed: ${formatStorageError(records.error)}`,
        );
        throw Error("LocalFileJournal: journal read failed", {
          cause: records.error,
        });
      }
      for (let item of records.value.items) {
        let j = textDecoder.decode(item.data);
        h.push(
          j.endsWith(`
`)
            ? j.slice(0, -1)
            : j,
        );
      }
      let nextSeq = records.value.nextSeq;
      if (nextSeq === undefined) return h;
      if (T !== undefined && nextSeq <= T)
        throw Error("LocalFileJournal: journal read cursor failed to advance");
      T = nextSeq;
    }
  }
  async isTailTorn() {
    let storageV5 = this.storageV5;
    if (storageV5 !== undefined) {
      let stats = await storageV5.backend.stat(storageV5.key);
      if (!stats.ok) {
        if (stats.error.code === "NotFound") return false;
        throw Error("LocalFileJournal: journal stat failed", {
          cause: stats.error,
        });
      }
      return (stats.value.tornTailBytes ?? 0) > 0;
    }
    let n;
    try {
      n = await open(this.path, "r");
    } catch (error) {
      if (isENOENT(error)) return false;
      throw error;
    }
    try {
      let { size } = await n.stat();
      if (size === 0) return false;
      let h = Buffer.alloc(1);
      await n.read(h, 0, 1, size - 1);
      return h[0] !== 10;
    } finally {
      await n.close();
    }
  }
  async append(e) {
    let n = await this.appendTurns.acquire();
    try {
      let r = !this.isTailEnded && (await this.isTailTorn());
      let storageV5 = this.storageV5;
      if (storageV5 !== undefined) {
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
          : [];
        let A = await storageV5.backend.append(storageV5.key, [
          ...y,
          {
            data: toJsonLine(e),
          },
        ]);
        if (!A.ok) {
          logForDebugging(`LocalFileJournal: append to ${this.path} failed: ${formatStorageError(A.error)}`);
          throw Error("LocalFileJournal: journal append failed", {
            cause: A.error,
          });
        }
        this.isTailEnded = true;
        return;
      }
      if (!this.dirReady) {
        await mkdir(dirname(this.path), {
          recursive: true,
        });
        this.dirReady = true;
      }
      let T = r
        ? `
${RESUMED_LINE}
`
        : "";
      await appendFile(this.path, T + toJsonLine(e), "utf8");
      this.isTailEnded = true;
    } finally {
      n();
    }
  }
}
export { WorkflowJournalStub, LocalFileJournal };
