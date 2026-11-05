/**
 * services/workflow/localFileJournal.ts
 *
 * 2.1.316 新增：本地文件日志
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * new in 2.1.318 (2.1.88 has no file at this path)
 * pieces: chunk-kd2wbncj.js (3)
 * attribution: placement 3
 * (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.
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

//@ chunk-kd2wbncj.js:22764-22775 placement
/**
 * 空类占位（工作流日志相关，当前无字段）。
 */
class WorkflowJournalStub {}
//@ chunk-kd2wbncj.js:22775-22894 placement
function workflowJournalKey(runId) {
  let projectKey = sessionProjectKey();
  if (projectKey === undefined) return;
  let key = STORAGE_SPACES.journal(projectKey, getSessionId(), ["workflows", runId]);
  return validateStorageKey(key) === undefined ? key : undefined;
}
//@ chunk-kd2wbncj.js:22894-25872 placement
class LocalFileJournal {
  path;
  storageV5;
  dirReady = false;
  isTailEnded = false;
  appendTurns = createMutex();
  constructor(runId, storageRoot) {
    this.path = join(subagentWorkflowDir(runId), "journal.jsonl");
    let key = storageRoot === undefined ? undefined : workflowJournalKey(runId);
    this.storageV5 =
      storageRoot === undefined || key === undefined
        ? undefined
        : {
            backend: storageRoot,
            key,
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
  async writeRestored(entries) {
    let mapped = [
      {
        type: "restoring",
      },
      ...entries,
      {
        type: "restored",
      },
    ].map((entry) => toJsonLine(entry));
    let storageV5 = this.storageV5;
    if (storageV5 === undefined) {
      await mkdir(dirname(this.path), {
        recursive: true,
      });
      await writeFileAtomic(this.path, mapped.join(""));
      return;
    }
    let deleteResult = await storageV5.backend.delete(storageV5.key);
    if (!deleteResult.ok && deleteResult.error.code !== "NotFound")
      throw Error("LocalFileJournal: journal delete failed", {
        cause: deleteResult.error,
      });
    let appendResult = await storageV5.backend.append(
      storageV5.key,
      mapped.map((data) => ({
        data,
      })),
    );
    if (!appendResult.ok)
      throw Error("LocalFileJournal: journal append failed", {
        cause: appendResult.error,
      });
  }
  async load() {
    let lines = await this.readLines();
    if (lines === undefined) return indexJournalEntries([]);
    let entries = [];
    let hasUnreadLine = this.storageV5 !== undefined && (await this.isTailTorn());
    for (let [lineIndex, line] of lines.entries()) {
      if (!line || line === RESUMED_LINE) continue;
      try {
        entries.push(jsonParseRaw(line));
      } catch (error) {
        let isTornTail =
          ((this.storageV5 === undefined && lineIndex === lines.length - 1) ||
            lines[lineIndex + 1] === RESUMED_LINE) &&
          !containsLaunchedLine(line);
        hasUnreadLine ||= !isTornTail;
        logForDebugging(`LocalFileJournal: skipping unparseable line in ${this.path}: ${error}`);
      }
    }
    return {
      ...indexJournalEntries(entries),
      ...(hasUnreadLine && {
        hasUnreadLine: true,
      }),
    };
  }
  async loadV5({ backend, key }) {
    let textDecoder = new TextDecoder("utf-8", {
      ignoreBOM: true,
    });
    let lines = [];
    let fromSeq;
    for (;;) {
      let records = await backend.readRecords(
        key,
        fromSeq === undefined
          ? undefined
          : {
              fromSeq,
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
        let text = textDecoder.decode(item.data);
        lines.push(
          text.endsWith(`
`)
            ? text.slice(0, -1)
            : text,
        );
      }
      let nextSeq = records.value.nextSeq;
      if (nextSeq === undefined) return lines;
      if (fromSeq !== undefined && nextSeq <= fromSeq)
        throw Error("LocalFileJournal: journal read cursor failed to advance");
      fromSeq = nextSeq;
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
    let handle;
    try {
      handle = await open(this.path, "r");
    } catch (error) {
      if (isENOENT(error)) return false;
      throw error;
    }
    try {
      let { size } = await handle.stat();
      if (size === 0) return false;
      let lastByte = Buffer.alloc(1);
      await handle.read(lastByte, 0, 1, size - 1);
      return lastByte[0] !== 10;
    } finally {
      await handle.close();
    }
  }
  async append(entry) {
    let release = await this.appendTurns.acquire();
    try {
      let needsResumeMarker = !this.isTailEnded && (await this.isTailTorn());
      let storageV5 = this.storageV5;
      if (storageV5 !== undefined) {
        let markerRecords = needsResumeMarker
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
        let appendResult = await storageV5.backend.append(storageV5.key, [
          ...markerRecords,
          {
            data: toJsonLine(entry),
          },
        ]);
        if (!appendResult.ok) {
          logForDebugging(
            `LocalFileJournal: append to ${this.path} failed: ${formatStorageError(appendResult.error)}`,
          );
          throw Error("LocalFileJournal: journal append failed", {
            cause: appendResult.error,
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
      let markerText = needsResumeMarker
        ? `
${RESUMED_LINE}
`
        : "";
      await appendFile(this.path, markerText + toJsonLine(entry), "utf8");
      this.isTailEnded = true;
    } finally {
      release();
    }
  }
}
export { WorkflowJournalStub, LocalFileJournal };
