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
import { join, join as join_2 } from "path";
import { writeFile, open, unlink, opendir, mkdir, lstat } from "fs/promises";
import { randomUUID, randomUUID as randomUUID_2, randomUUID as randomUUID_3 } from "crypto";
import { constants } from "fs";
import { o } from "../../../vendor/zod/v4/classic/schemas.js";
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
import { xbt } from "../../../vendor/lodash-es/chunk.js";
import { safeParseJSON } from "../../utils/json.js";
import { count } from "../../utils/collections.js";
import { nv, ZC } from "../../utils/remoteFileState.js";

/**
 * mcp serve：在 /dev/shm 记录容器启动标记，判断工具调用是否发生在当前容器生命周期内。
 */
//@ chunk-m8aeec95.js:3042-6963 placement
class ContainerStartRecord {
  #o;
  #e;
  #r;
  #s;
  #t = new Map();
  constructor({
    folder: e,
    failed: n,
    containerStartFile: r = join_2("/dev/shm", `claude-${process.getuid?.() ?? 0}-container-start`),
    containerStart: s,
  }) {
    ((this.#o = e), (this.#s = n), (this.#e = r), (this.#r = s));
  }
  #n() {
    return (
      (this.#r ??= (async () => {
        let e = this.#e;
        await writeFile(e, randomUUID_2(), { flag: "wx", mode: 384 }).catch((r) => {
          if (getErrnoCode(r) !== "EEXIST") throw r;
        });
        let n = await open(e, constants.O_RDONLY | constants.O_NOFOLLOW | constants.O_NONBLOCK);
        try {
          let stats = await n.stat();
          if (!stats.isFile() || stats.uid !== process.getuid?.())
            throw Error(
              "The file that identifies this container start is not a regular file owned by this user.",
            );
          let { buffer: buffer, bytesRead: bytesRead } = await n.read({ buffer: Buffer.alloc(64) }),
            trimmed = buffer.subarray(0, bytesRead).toString("utf8").trim();
          if (trimmed.length === 0) throw Error("The file that identifies this container start is empty.");
          return trimmed;
        } finally {
          await n.close();
        }
      })().catch((e) => {
        throw ((this.#r = void 0), e);
      })),
      this.#r
    );
  }
  write(e) {
    this.#a(e.listed.taskId, async (n, r) => {
      if (
        (await publishWriteAtomic(
          join_2(n, e.listed.taskId + CALL_RECORD_EXT),
          jsonStringify({ v: 1, ...e, container_start: r }),
          { flush: !0, mode: 384 },
        ),
        e.ended !== void 0)
      )
        await fsyncDirectory(n);
    });
  }
  remove(e) {
    this.#a(e, async (n) => {
      await unlink(join_2(n, e + CALL_RECORD_EXT)).catch((r) => {
        if (getErrnoCode(r) !== "ENOENT") throw r;
      });
    });
  }
  async settled(e) {
    await this.#t.get(e);
  }
  async settledAll() {
    while (this.#t.size > 0) await Promise.all(this.#t.values());
    await this.#i()
      .then((e) => (e === void 0 ? void 0 : fsyncDirectory(e)))
      .catch(this.#s);
  }
  async readEarlier() {
    let e = await this.#n().catch((h) => {
        logForDebugging(
          `mcp serve: could not read or make the file that identifies this container start, so commands that earlier daemons started are not listed: ${errorMessage(h)}`,
          { level: "error" },
        );
        return;
      }),
      n =
        e === void 0
          ? void 0
          : await this.#i().catch((h) => {
              logForDebugging(
                `mcp serve: could not read the folder of saved background command records, so commands that earlier daemons started are not listed: ${errorMessage(h)}`,
                { level: "error" },
              );
              return;
            }),
      r = [];
    if (n !== void 0) {
      let h = 0;
      try {
        for await (let w of await opendir(n)) {
          if (
            (h++,
            w.name.endsWith(CALL_RECORD_EXT) &&
              isTaskIdOfType("local_bash", w.name.slice(0, -CALL_RECORD_EXT.length)))
          )
            r.push({ name: w.name, path: join_2(n, w.name) });
          if (h >= MAX_CALL_RECORD_SCAN || r.length >= MAX_CALL_RECORDS) break;
        }
      } catch (error) {
        logForDebugging(
          `mcp serve: could not read the folder of saved background command records, so commands that earlier daemons started are not listed: ${errorMessage(error)}`,
          { level: "error" },
        );
      }
    }
    let now = Date.now(),
      y = [];
    for (let h of xbt(r, MAX_CALL_RECORD_BATCH))
      y.push(
        ...(await Promise.all(
          h.map(async ({ name: w, path: path }) => {
            let S = await open(path, constants.O_RDONLY | constants.O_NOFOLLOW | constants.O_NONBLOCK)
                .then(async (R) => {
                  try {
                    let stats = await R.stat();
                    if (!stats.isFile() || stats.size > MAX_CALL_RECORD_BYTES) return;
                    let { buffer: buffer, bytesRead: bytesRead } = await R.read({
                      buffer: Buffer.alloc(MAX_CALL_RECORD_BYTES),
                    });
                    return buffer.subarray(0, bytesRead).toString("utf8");
                  } finally {
                    await R.close();
                  }
                })
                .catch(() => {
                  return;
                }),
              safeParse = callRecordSchema().safeParse(S === void 0 ? void 0 : safeParseJSON(S, !1));
            if (!safeParse.success || safeParse.data.listed.taskId + CALL_RECORD_EXT !== w)
              return { fate: "unreadable" };
            let {
              container_start: container_start,
              listed: listed,
              started_at: started_at,
              written_at: written_at,
              ended: ended,
            } = safeParse.data;
            if (now - written_at > CALL_RECORD_RETENTION_MS)
              return (this.remove(listed.taskId), { fate: "too_old" });
            if (container_start === e && ended === void 0) return { fate: "maybe_still_running" };
            return ended === void 0
              ? {
                  fate: "container_stopped",
                  command: {
                    listed: listed,
                    started_at: started_at,
                    ended: { how: { state: "killed", reason: "container_stopped" }, at: written_at },
                  },
                }
              : { fate: "with_end", command: { listed: listed, started_at: started_at, ended: ended } };
          }),
        )),
      );
    return {
      commands: y
        .flatMap((h) => ("command" in h ? [h.command] : []))
        .toSorted((h, w) => h.ended.at - w.ended.at),
      counted: {
        with_end: count(y, ({ fate: fate }) => fate === "with_end"),
        container_stopped: count(y, ({ fate: fate }) => fate === "container_stopped"),
        maybe_still_running: count(y, ({ fate: fate }) => fate === "maybe_still_running"),
        too_old: count(y, ({ fate: fate }) => fate === "too_old"),
        unreadable: count(y, ({ fate: fate }) => fate === "unreadable"),
      },
    };
  }
  async #i(e = !1) {
    let n = this.#o();
    if (e) await mkdir(n, { recursive: !0, mode: 448 });
    let r = await lstat(n).catch((s) => {
      if (getErrnoCode(s) !== "ENOENT") throw s;
      return;
    });
    if (r === void 0) return;
    if (!r.isDirectory() || r.uid !== process.getuid?.())
      throw Error(
        "The folder for background command records is a symbolic link or not a directory owned by this user.",
      );
    return n;
  }
  #a(e, n) {
    let r = (this.#t.get(e) ?? Promise.resolve())
      .then(async () => {
        let s = await this.#n(),
          y = s === void 0 ? void 0 : await this.#i(!0);
        if (s !== void 0 && y !== void 0) await n(y, s);
      })
      .catch(this.#s);
    (this.#t.set(e, r),
      r.then(() => {
        if (this.#t.get(e) === r) this.#t.delete(e);
      }));
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
var Ke = 1024,
  je = 1024,
  ce = 32,
  Ve = 16,
  Ue = 524288,
  $e = 300000;
//@ chunk-m8aeec95.js:7172-7210 placement
function me() {
  return nv(ZC, void 0, !0);
}

export { je, ContainerStartRecord, me, Ke, Ue, $e, Ve, ce };
