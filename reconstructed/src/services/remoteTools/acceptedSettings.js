/**
 * services/remoteTools/acceptedSettings.ts
 *
 * 2.1.316 新增：远程工具宿主接受的设置
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-cc8an1p1.js (14)
 * attribution: placement 14
 */
import { join, resolve, basename } from "path";
import { lstatSync, utimesSync, mkdirSync, writeFileSync, unlinkSync, constants } from "fs";
import { readdir, lstat, rm, mkdir, writeFile, open } from "fs/promises";
import { randomBytes } from "crypto";
import { MAX_SETTINGS_JSON_BYTES } from "../../utils/settings/settings.js";
import { computeContentHash } from "../../utils/commitAttribution.js";
import { DoctorLazy } from "../../cli/handlers/util.js";
import { u, T, o, U } from "../../../vendor/zod/v4/classic/schemas.js";
import { getPlatform } from "../../utils/platform.js";
import { normalizeCaseForComparison } from "../../utils/permissions/filesystem.js";
import { servedCallsDir } from "../../remote/tools/servedCallLog.js";
import { readFileSync } from "../../utils/fileRead.js";
import { isENOENT, getErrnoCode, toError } from "../../utils/errors.js";
import { writeAndPublishSync } from "../../utils/atomicPublishWrite.js";
import { jsonStringify, jsonParse } from "../../utils/slowOperations.js";
import { getFirstLine } from "../../utils/stringUtils.js";
import { logEvent } from "../analytics/index.js";
import { lit, fromEnum } from "../analytics/safeMetadata.js";
import { logError } from "../../utils/log.js";
import { ws } from "../../utils/fsFlags.js";

//@ chunk-cc8an1p1.js:1071-1149 placement
var y = 1,
  ee = 8 * MAX_SETTINGS_JSON_BYTES,
  re = 900000,
  ACCEPTED = "accepted-",
  S = ".jsonl",
  ne = ".seen",
  O = ".accepting-";
//@ chunk-cc8an1p1.js:1149-1192 placement
function _gt(e) {
  return e === null ? null : computeContentHash(e);
}
//@ chunk-cc8an1p1.js:1192-1479 placement
var ACCEPTED_FILE_RECORD_SCHEMA = DoctorLazy(() =>
    u({
      v: T(y),
      kind: T("file"),
      path: o(),
      text: o().nullable(),
      sha256: o()
        .regex(/^[0-9a-f]{64}$/)
        .nullable(),
      at: o(),
      by: U(["first_attach", "own_write", "person"]),
    }),
  ),
  ACCEPTED_FOLDER_RECORD_SCHEMA = DoctorLazy(() =>
    u({
      v: T(y),
      kind: T("folder"),
      key: o(),
      project: o().nullable(),
      local: o().nullable(),
      legacy: o().nullable(),
      at: o(),
    }),
  );
//@ chunk-cc8an1p1.js:1479-1536 placement
function R(e, i) {
  return getPlatform() === "windows" ? C(e) === C(i) : e === i;
}
//@ chunk-cc8an1p1.js:1536-1603 placement
function C(e) {
  return e.replace(/^[a-z](?=:)/, (i) => i.toUpperCase());
}
//@ chunk-cc8an1p1.js:1603-1647 placement = setCwdState (1)
function nfcKey(cwd) {
  return normalizeCaseForComparison(cwd.normalize("NFC"));
}
//@ chunk-cc8an1p1.js:1647-1726 placement
function F(e, i = servedCallsDir()) {
  return join(i, `${ACCEPTED}settings-${computeContentHash(nfcKey(resolve(e))).slice(0, 32)}${S}`);
}
//@ chunk-cc8an1p1.js:1726-1800 placement
function x(e, i = servedCallsDir()) {
  return join(i, `${ACCEPTED}folder-${computeContentHash(nfcKey(e)).slice(0, 32)}${S}`);
}
//@ chunk-cc8an1p1.js:1800-1851 placement
function X(e) {
  return `${e.slice(0, -S.length)}${ne}`;
}
//@ chunk-cc8an1p1.js:1851-1986 placement
function readAcceptedRecord(e) {
  try {
    return readFileSync(e, ee);
  } catch (error) {
    if (!isENOENT(error)) throw error;
  }
  try {
    lstatSync(X(e));
  } catch (error) {
    if (isENOENT(error)) return;
    throw error;
  }
  throw Error("record aged out");
}
//@ chunk-cc8an1p1.js:1986-2036 placement
function j(e) {
  try {
    let date = new Date();
    utimesSync(e, date, date);
  } catch {}
}
/**
 * 远程工具宿主"已接受设置"的记录存储：按路径记录文件文本与哈希、按文件夹记录项目/本地/旧版设置；读取时校验格式与哈希，不可读返回 "unreadable"；写入采用原子发布并维护存在标记。
 */
//@ chunk-cc8an1p1.js:2036-3582 placement
function createAcceptedSettingsStore(dir = servedCallsDir()) {
  let i = (r, n) => {
      mkdirSync(dir, { recursive: !0, mode: 448 });
      let t = X(r),
        g = !1;
      try {
        (writeFileSync(t, "", { mode: 384, flag: "wx" }), (g = !0));
      } catch (error) {
        if (getErrnoCode(error) !== "EEXIST") throw error;
      }
      try {
        writeAndPublishSync(
          r,
          `${jsonStringify(n)}
`,
          384,
        );
      } catch (error) {
        let m;
        try {
          m = lstatSync(r).isFile();
        } catch (error) {
          m = !isENOENT(error);
        }
        if (g && !m) {
          try {
            unlinkSync(t);
          } catch {}
          try {
            if (lstatSync(r).isFile()) writeFileSync(t, "", { mode: 384, flag: "wx" });
          } catch {}
        }
        throw error;
      }
      try {
        writeFileSync(t, "", { mode: 384, flag: "wx" });
      } catch (error) {
        if (getErrnoCode(error) !== "EEXIST") throw error;
      }
    },
    s = new Set(),
    d = (r, n, t) => {
      let g = getFirstLine(t);
      if (t.length > g.length + 1 && !s.has(n)) {
        s.add(n);
        try {
          logEvent("tengu_remote_tool_serving", {
            event: lit("accepted_record_has_tail"),
            record_kind: fromEnum(r),
          });
        } catch (error) {
          logError(toError(error));
        }
      }
      return g;
    };
  return {
    file: (r) => {
      try {
        let n = readAcceptedRecord(F(r, dir));
        if (n === void 0) return "none";
        let safeParse = ACCEPTED_FILE_RECORD_SCHEMA().safeParse(jsonParse(d("file", r, n)));
        if (
          !safeParse.success ||
          !R(resolve(safeParse.data.path), resolve(r)) ||
          _gt(safeParse.data.text) !== safeParse.data.sha256
        )
          return "unreadable";
        return { text: safeParse.data.text, sha256: safeParse.data.sha256 };
      } catch {
        return "unreadable";
      }
    },
    recordFile: (r, n, t) => {
      if (n !== null && Buffer.byteLength(n) > MAX_SETTINGS_JSON_BYTES)
        throw Error("accepted settings text exceeds the settings size limit");
      (i(F(r, dir), {
        v: y,
        kind: "file",
        path: r,
        text: n,
        sha256: _gt(n),
        at: new Date().toISOString(),
        by: t,
      }),
        s.delete(r));
    },
    folder: (r) => {
      try {
        let n = readAcceptedRecord(x(r, dir));
        if (n === void 0) return "none";
        let safeParse = ACCEPTED_FOLDER_RECORD_SCHEMA().safeParse(jsonParse(d("folder", r, n)));
        if (!safeParse.success || !R(safeParse.data.key, r)) return "unreadable";
        let { project: project, local: local, legacy: legacy } = safeParse.data;
        return { project: project, local: local, legacy: legacy };
      } catch {
        return "unreadable";
      }
    },
    recordFolder: (r, n) => {
      (i(x(r, dir), {
        v: y,
        kind: "folder",
        key: r,
        project: n.project,
        local: n.local,
        legacy: n.legacy,
        at: new Date().toISOString(),
      }),
        s.delete(r));
    },
    noteServed: (r, n) => {
      j(x(r, dir));
      for (let t of n) j(F(t, dir));
    },
  };
}
//@ chunk-cc8an1p1.js:3582-3826 placement
async function pruneStaleSettingsCopies(e) {
  try {
    let i = Date.now() - re;
    for (let s of await readdir(e)) {
      let index = s.lastIndexOf(O);
      if (index <= 0 || !/^[0-9a-f]{8}\.jsonl$/.test(s.slice(index + O.length))) continue;
      let r = join(e, s);
      if ((await lstat(r)).mtimeMs < i) await rm(r, { recursive: !0, force: !0 });
    }
  } catch {}
}
/**
 * 把待审设置写成临时文件交给检查函数，检查后确认文件未被替换（inode、大小、内容一致），返回 allowed/blocked/tampered，最后删除临时文件。
 */
//@ chunk-cc8an1p1.js:3826-4488 placement
async function checkSettingsCopy(settings, isBlocked) {
  let s = settings.dir ?? servedCallsDir();
  (await mkdir(s, { recursive: !0, mode: 448 }), await pruneStaleSettingsCopies(s));
  let d = join(s, `${basename(settings.name)}${O}${randomBytes(4).toString("hex")}${S}`);
  await writeFile(d, settings.text, { mode: 384, flag: "wx" });
  try {
    let r = await lstat(d);
    if (await isBlocked(d)) return "blocked";
    let n;
    try {
      if (getPlatform() === "windows" && (await lstat(d)).isSymbolicLink()) return "tampered";
      n = await open(d, constants.O_RDONLY | ws);
      let stats = await n.stat();
      return stats.isFile() &&
        stats.nlink === 1 &&
        stats.ino === r.ino &&
        stats.dev === r.dev &&
        stats.size === r.size &&
        (await n.readFile({ encoding: "utf8" })) === settings.text
        ? "allowed"
        : "tampered";
    } catch (error) {
      if (isENOENT(error) || getErrnoCode(error) === "ELOOP") return "tampered";
      throw error;
    } finally {
      await n?.close().catch(() => {});
    }
  } finally {
    await rm(d, { recursive: !0, force: !0 }).catch(() => {});
  }
}

export { _gt, checkSettingsCopy, createAcceptedSettingsStore };
