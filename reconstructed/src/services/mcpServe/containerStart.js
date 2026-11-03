/**
 * services/mcpServe/containerStart.ts
 *
 * 2.1.316 新增：mcp serve 容器启动记录与限额常量。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-m8aeec95.js (4)
 * attribution: placement 4
 */
import { join } from "path";
import { writeFile, open, unlink, opendir, mkdir, lstat } from "fs/promises";
import { randomUUID } from "crypto";
import { constants } from "fs";
import { string } from "../../../vendor/zod/v4/classic/schemas.js";
import { logForDebugging } from "../../utils/debug.js";
import { getErrnoCode, errorMessage } from "../../utils/errors.js";
import { logEvent } from "../analytics/index.js";
import { publishWriteAtomic } from "../../utils/atomicPublishWrite.js";
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
import { env } from "../../utils/env.js";
import { isTaskIdOfType } from "../../Task.js";
import { chunk_default } from "../../../vendor/lodash-es/chunk.js";
import { safeParseJSON } from "../../utils/json.js";
import { count } from "../../utils/collections.js";
import { createRemoteFileState, READ_FILE_STATE_CACHE_SIZE } from "../../utils/remoteFileState.js";

//@ chunk-m8aeec95.js:3042-6963 placement
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
      let e = this.#e;
      await writeFile(e, randomUUID(), {
        flag: "wx",
        mode: 384,
      }).catch((error) => {
        if (getErrnoCode(error) !== "EEXIST") throw error;
      });
      let n = await open(e, constants.O_RDONLY | constants.O_NOFOLLOW | constants.O_NONBLOCK);
      try {
        let stats = await n.stat();
        if (!stats.isFile() || stats.uid !== process.getuid?.())
          throw Error(
            "The file that identifies this container start is not a regular file owned by this user.",
          );
        let { buffer, bytesRead } = await n.read({
          buffer: Buffer.alloc(64),
        });
        let trimmed = buffer.subarray(0, bytesRead).toString("utf8").trim();
        if (trimmed.length === 0) throw Error("The file that identifies this container start is empty.");
        return trimmed;
      } finally {
        await n.close();
      }
    })().catch((error) => {
      this.#r = undefined;
      throw error;
    });
    return this.#r;
  }
  write(e) {
    this.#a(e.listed.taskId, async (n, containerStart) => {
      await publishWriteAtomic(
        join(n, e.listed.taskId + CALL_RECORD_EXT),
        jsonStringify({
          v: 1,
          ...e,
          container_start: containerStart,
        }),
        {
          flush: true,
          mode: 384,
        },
      );
      if (e.ended !== undefined) await fsyncDirectory(n);
    });
  }
  remove(e) {
    this.#a(e, async (n) => {
      await unlink(join(n, e + CALL_RECORD_EXT)).catch((error) => {
        if (getErrnoCode(error) !== "ENOENT") throw error;
      });
    });
  }
  async settled(e) {
    await this.#t.get(e);
  }
  async settledAll() {
    while (this.#t.size > 0) await Promise.all(this.#t.values());
    await this.#i()
      .then((e) => (e === undefined ? undefined : fsyncDirectory(e)))
      .catch(this.#s);
  }
  async readEarlier() {
    let e = await this.#n().catch((error) => {
      logForDebugging(
        `mcp serve: could not read or make the file that identifies this container start, so commands that earlier daemons started are not listed: ${errorMessage(error)}`,
        {
          level: "error",
        },
      );
      return;
    });
    let n =
      e === undefined
        ? undefined
        : await this.#i().catch((error) => {
            logForDebugging(
              `mcp serve: could not read the folder of saved background command records, so commands that earlier daemons started are not listed: ${errorMessage(error)}`,
              {
                level: "error",
              },
            );
            return;
          });
    let r = [];
    if (n !== undefined) {
      let h = 0;
      try {
        for await (let w of await opendir(n)) {
          h++;
          if (
            w.name.endsWith(CALL_RECORD_EXT) &&
            isTaskIdOfType("local_bash", w.name.slice(0, -CALL_RECORD_EXT.length))
          )
            r.push({
              name: w.name,
              path: join(n, w.name),
            });
          if (h >= MAX_CALL_RECORD_SCAN || r.length >= MAX_CALL_RECORDS) break;
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
    let y = [];
    for (let h of chunk_default(r, MAX_CALL_RECORD_BATCH))
      y.push(
        ...(await Promise.all(
          h.map(async ({ name: w, path }) => {
            let S = await open(path, constants.O_RDONLY | constants.O_NOFOLLOW | constants.O_NONBLOCK)
              .then(async (R) => {
                try {
                  let stats = await R.stat();
                  if (!stats.isFile() || stats.size > MAX_CALL_RECORD_BYTES) return;
                  let { buffer, bytesRead } = await R.read({
                    buffer: Buffer.alloc(MAX_CALL_RECORD_BYTES),
                  });
                  return buffer.subarray(0, bytesRead).toString("utf8");
                } finally {
                  await R.close();
                }
              })
              .catch(() => {
                return;
              });
            let x = callRecordSchema().safeParse(S === undefined ? undefined : safeParseJSON(S, false));
            if (!x.success || x.data.listed.taskId + CALL_RECORD_EXT !== w)
              return {
                fate: "unreadable",
              };
            let {
              container_start: containerStart,
              listed,
              started_at: startedAt,
              written_at: writtenAt,
              ended,
            } = x.data;
            if (now - writtenAt > CALL_RECORD_RETENTION_MS) {
              this.remove(listed.taskId);
              return {
                fate: "too_old",
              };
            }
            if (containerStart === e && ended === undefined)
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
      commands: y
        .flatMap((h) => ("command" in h ? [h.command] : []))
        .toSorted((h, w) => h.ended.at - w.ended.at),
      counted: {
        with_end: count(y, ({ fate }) => fate === "with_end"),
        container_stopped: count(y, ({ fate }) => fate === "container_stopped"),
        maybe_still_running: count(y, ({ fate }) => fate === "maybe_still_running"),
        too_old: count(y, ({ fate }) => fate === "too_old"),
        unreadable: count(y, ({ fate }) => fate === "unreadable"),
      },
    };
  }
  async #i(e = false) {
    let n = this.#o();
    if (e)
      await mkdir(n, {
        recursive: true,
        mode: 448,
      });
    let r = await lstat(n).catch((error) => {
      if (getErrnoCode(error) !== "ENOENT") throw error;
      return;
    });
    if (r === undefined) return;
    if (!r.isDirectory() || r.uid !== process.getuid?.())
      throw Error(
        "The folder for background command records is a symbolic link or not a directory owned by this user.",
      );
    return n;
  }
  #a(e, n) {
    let r = (this.#t.get(e) ?? Promise.resolve())
      .then(async () => {
        let s = await this.#n();
        let y = s === undefined ? undefined : await this.#i(true);
        if (s !== undefined && y !== undefined) await n(y, s);
      })
      .catch(this.#s);
    this.#t.set(e, r);
    r.then(() => {
      if (this.#t.get(e) === r) this.#t.delete(e);
    });
  }
}
//@ chunk-m8aeec95.js:6963-7083 placement
async function fsyncDirectory(e) {
  let n = await open(e, constants.O_RDONLY | constants.O_DIRECTORY | constants.O_NOFOLLOW);
  try {
    await n.sync();
  } finally {
    await n.close();
  }
}
//@ chunk-m8aeec95.js:7120-7172 placement
/**
 * 容器启动超时（300000 毫秒）。
 */
var MAX_START_RECORDS = 1024;
var MAX_PENDING_STARTS = 1024;
var MAX_CONCURRENT_STARTS = 32;
var MAX_RETRY_ROUNDS = 16;
var MAX_START_METADATA_BYTES = 524288;
var START_TIMEOUT_MS = 300000;
//@ chunk-m8aeec95.js:7172-7210 placement
/**
 * 读取容器启动记录。
 */
function readContainerStartRecord() {
  return createRemoteFileState(READ_FILE_STATE_CACHE_SIZE, undefined, true);
}
export {
  MAX_PENDING_STARTS,
  ContainerStartRecord,
  readContainerStartRecord,
  MAX_START_RECORDS,
  MAX_START_METADATA_BYTES,
  START_TIMEOUT_MS,
  MAX_RETRY_ROUNDS,
  MAX_CONCURRENT_STARTS,
};
