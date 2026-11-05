/**
 * services/mcpServe/containerStart.ts
 *
 * 2.1.316 新增：mcp serve 容器启动记录与限额常量。
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * new in 2.1.318 (2.1.88 has no file at this path)
 * pieces: chunk-78qefq0z.js (2), chunk-z0gd899m.js (2)
 * attribution: placement 4
 */
import { join } from "path";
import { writeFile, open, unlink, opendir, mkdir, lstat } from "fs/promises";
import { randomUUID } from "crypto";
import { constants } from "fs";
import { createRemoteFileState, READ_FILE_STATE_CACHE_SIZE } from "../../utils/remoteFileState.js";
import { stringSchema } from "../../../vendor/zod/v4/classic/schemas.js";
import { logForDebugging } from "../../utils/debug.js";
import { getErrnoCode, errorMessage } from "../../utils/errors.js";
import { env } from "../../utils/env.js";
import { filePath } from "../../utils/atomicPublishWrite.js";
import {
  CALL_RECORD_EXT,
  MAX_CALL_RECORD_SCAN,
  MAX_CALL_RECORDS,
  MAX_CALL_RECORD_BATCH,
  MAX_CALL_RECORD_BYTES,
  callRecordSchema,
  CALL_RECORD_RETENTION_MS,
} from "./readCalls.js";
import { jsonStringify } from "../../utils/slowOperations.js";
import { logError } from "../../utils/log.js";
import { isTaskIdOfType } from "../../Task.js";
import { chunk_default } from "../../../vendor/lodash-es/chunk.js";
import { safeParseJSON } from "../../utils/json.js";
import { countWhere } from "../../utils/collections.js";

//@ chunk-z0gd899m.js:409-455 placement
/**
 * 容器启动超时（300000 毫秒）。
 */
var MAX_START_RECORDS = 1024;
var MAX_PENDING_STARTS = 1024;
var MAX_CONCURRENT_STARTS = 32;
var MAX_RETRY_ROUNDS = 16;
var MAX_START_METADATA_BYTES = 524288;
var START_TIMEOUT_MS = 300000;
//@ chunk-z0gd899m.js:455-492 placement
/**
 * 读取容器启动记录。
 */
function readContainerStartRecord() {
  return createRemoteFileState(READ_FILE_STATE_CACHE_SIZE, undefined, true);
}
//@ chunk-78qefq0z.js:2783-6702 placement
/**
 * mcp serve：在 /dev/shm 记录容器启动标记，判断工具调用是否发生在当前容器生命周期内。
 */
class ContainerStartRecord {
  #o;
  #e;
  #r;
  #s;
  #t = new Map();
  constructor({
    folder,
    failed,
    containerStartFile = join("/dev/shm", `claude-${process.getuid?.() ?? 0}-container-start`),
    containerStart,
  }) {
    this.#o = folder;
    this.#s = failed;
    this.#e = containerStartFile;
    this.#r = containerStart;
  }
  #n() {
    this.#r ??= (async () => {
      let startFilePath = this.#e;
      await writeFile(startFilePath, randomUUID(), {
        flag: "wx",
        mode: 384,
      }).catch((error) => {
        if (getErrnoCode(error) !== "EEXIST") throw error;
      });
      let handle = await open(
        startFilePath,
        constants.O_RDONLY | constants.O_NOFOLLOW | constants.O_NONBLOCK,
      );
      try {
        let stats = await handle.stat();
        if (!stats.isFile() || stats.uid !== process.getuid?.())
          throw Error(
            "The file that identifies this container start is not a regular file owned by this user.",
          );
        let { buffer, bytesRead } = await handle.read({
          buffer: Buffer.alloc(64),
        });
        let trimmed = buffer.subarray(0, bytesRead).toString("utf8").trim();
        if (trimmed.length === 0) throw Error("The file that identifies this container start is empty.");
        return trimmed;
      } finally {
        await handle.close();
      }
    })().catch((error) => {
      this.#r = undefined;
      throw error;
    });
    return this.#r;
  }
  write(record) {
    this.#i(record.listed.taskId, async (folder, containerStart) => {
      await filePath(
        join(folder, record.listed.taskId + CALL_RECORD_EXT),
        jsonStringify({
          v: 1,
          ...record,
          container_start: containerStart,
        }),
        {
          flush: true,
          mode: 384,
        },
      );
      if (record.ended !== undefined) await fsyncDirectory(folder);
    });
  }
  remove(taskId) {
    this.#i(taskId, async (folder) => {
      await unlink(join(folder, taskId + CALL_RECORD_EXT)).catch((error) => {
        if (getErrnoCode(error) !== "ENOENT") throw error;
      });
    });
  }
  async settled(taskId) {
    await this.#t.get(taskId);
  }
  async settledAll() {
    while (this.#t.size > 0) await Promise.all(this.#t.values());
    await this.#a()
      .then((folder) => (folder === undefined ? undefined : fsyncDirectory(folder)))
      .catch(this.#s);
  }
  async readEarlier() {
    let containerStart = await this.#n().catch((error) => {
      logForDebugging(
        `mcp serve: could not read or make the file that identifies this container start, so commands that earlier daemons started are not listed: ${errorMessage(error)}`,
        {
          level: "error",
        },
      );
      return;
    });
    let recordsFolder =
      containerStart === undefined
        ? undefined
        : await this.#a().catch((error) => {
            logForDebugging(
              `mcp serve: could not read the folder of saved background command records, so commands that earlier daemons started are not listed: ${errorMessage(error)}`,
              {
                level: "error",
              },
            );
            return;
          });
    let recordFiles = [];
    if (recordsFolder !== undefined) {
      let scannedCount = 0;
      try {
        for await (let dirEntry of await opendir(recordsFolder)) {
          scannedCount++;
          if (
            dirEntry.name.endsWith(CALL_RECORD_EXT) &&
            isTaskIdOfType("local_bash", dirEntry.name.slice(0, -CALL_RECORD_EXT.length))
          )
            recordFiles.push({
              name: dirEntry.name,
              path: join(recordsFolder, dirEntry.name),
            });
          if (scannedCount >= MAX_CALL_RECORD_SCAN || recordFiles.length >= MAX_CALL_RECORDS) break;
        }
      } catch (error) {
        logForDebugging(
          `mcp serve: could not read the folder of saved background command records, so commands that earlier daemons started are not listed: ${errorMessage(error)}`,
          {
            level: "error",
          },
        );
      }
    }
    let now = Date.now();
    let fates = [];
    for (let batch of chunk_default(recordFiles, MAX_CALL_RECORD_BATCH))
      fates.push(
        ...(await Promise.all(
          batch.map(async ({ name: fileName, path }) => {
            let raw = await open(path, constants.O_RDONLY | constants.O_NOFOLLOW | constants.O_NONBLOCK)
              .then(async (fileHandle) => {
                try {
                  let stats = await fileHandle.stat();
                  if (!stats.isFile() || stats.size > MAX_CALL_RECORD_BYTES) return;
                  let { buffer, bytesRead } = await fileHandle.read({
                    buffer: Buffer.alloc(MAX_CALL_RECORD_BYTES),
                  });
                  return buffer.subarray(0, bytesRead).toString("utf8");
                } finally {
                  await fileHandle.close();
                }
              })
              .catch(() => {
                return;
              });
            let parsed = callRecordSchema().safeParse(
              raw === undefined ? undefined : safeParseJSON(raw, false),
            );
            if (!parsed.success || parsed.data.listed.taskId + CALL_RECORD_EXT !== fileName)
              return {
                fate: "unreadable",
              };
            let {
              container_start: containerStart_2,
              listed,
              started_at: startedAt,
              written_at: writtenAt,
              ended,
            } = parsed.data;
            if (now - writtenAt > CALL_RECORD_RETENTION_MS) {
              this.remove(listed.taskId);
              return {
                fate: "too_old",
              };
            }
            if (containerStart_2 === containerStart && ended === undefined)
              return {
                fate: "maybe_still_running",
              };
            return ended === undefined
              ? {
                  fate: "container_stopped",
                  command: {
                    listed,
                    started_at: startedAt,
                    ended: {
                      how: {
                        state: "killed",
                        reason: "container_stopped",
                      },
                      at: writtenAt,
                    },
                  },
                }
              : {
                  fate: "with_end",
                  command: {
                    listed,
                    started_at: startedAt,
                    ended,
                  },
                };
          }),
        )),
      );
    return {
      commands: fates
        .flatMap((fate) => ("command" in fate ? [fate.command] : []))
        .toSorted((left, right) => left.ended.at - right.ended.at),
      counted: {
        with_end: countWhere(fates, ({ fate }) => fate === "with_end"),
        container_stopped: countWhere(fates, ({ fate }) => fate === "container_stopped"),
        maybe_still_running: countWhere(fates, ({ fate }) => fate === "maybe_still_running"),
        too_old: countWhere(fates, ({ fate }) => fate === "too_old"),
        unreadable: countWhere(fates, ({ fate }) => fate === "unreadable"),
      },
    };
  }
  async #a(create = false) {
    let folder = this.#o();
    if (create)
      await mkdir(folder, {
        recursive: true,
        mode: 448,
      });
    let stats = await lstat(folder).catch((error) => {
      if (getErrnoCode(error) !== "ENOENT") throw error;
      return;
    });
    if (stats === undefined) return;
    if (!stats.isDirectory() || stats.uid !== process.getuid?.())
      throw Error(
        "The folder for background command records is a symbolic link or not a directory owned by this user.",
      );
    return folder;
  }
  #i(taskId, run) {
    let queued = (this.#t.get(taskId) ?? Promise.resolve())
      .then(async () => {
        let containerStart = await this.#n();
        let folder = containerStart === undefined ? undefined : await this.#a(true);
        if (containerStart !== undefined && folder !== undefined) await run(folder, containerStart);
      })
      .catch(this.#s);
    this.#t.set(taskId, queued);
    queued.then(() => {
      if (this.#t.get(taskId) === queued) this.#t.delete(taskId);
    });
  }
}
//@ chunk-78qefq0z.js:6702-6822 placement
async function fsyncDirectory(dirPath) {
  let handle = await open(dirPath, constants.O_RDONLY | constants.O_DIRECTORY | constants.O_NOFOLLOW);
  try {
    await handle.sync();
  } finally {
    await handle.close();
  }
}
export {
  readContainerStartRecord,
  MAX_START_RECORDS,
  MAX_START_METADATA_BYTES,
  START_TIMEOUT_MS,
  MAX_RETRY_ROUNDS,
  MAX_CONCURRENT_STARTS,
  MAX_PENDING_STARTS,
  ContainerStartRecord,
};
