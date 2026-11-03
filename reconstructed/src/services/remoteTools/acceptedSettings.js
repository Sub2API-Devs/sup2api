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
import { u, literal, string, _enum } from "../../../vendor/zod/v4/classic/schemas.js";
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
import { NOFOLLOW_NONBLOCK_FLAGS } from "../../utils/fsFlags.js";

//@ chunk-cc8an1p1.js:1071-1149 placement
/**
 * 已接受设置记录（settings-/folder- 两种 .jsonl）的常量：格式版本、文件大小上限、过期清理时间与各种文件名片段。
 */
var ACCEPTED_SETTINGS_VERSION = 1;
var MAX_ACCEPTED_SETTINGS_BYTES = 8 * MAX_SETTINGS_JSON_BYTES;
var STALE_SETTINGS_PRUNE_MS = 900000;
var ACCEPTED = "accepted-";
var SETTINGS_FILE_EXT = ".jsonl";
var SEEN_MARKER_EXT = ".seen";
var ACCEPTING_TEMP_INFIX = ".accepting-";
//@ chunk-cc8an1p1.js:1149-1192 placement
/**
 * 计算设置内容哈希；内容为 null 时返回 null。
 */
function hashOrNull(e) {
  return e === null ? null : computeContentHash(e);
}
//@ chunk-cc8an1p1.js:1192-1479 placement
var ACCEPTED_FILE_RECORD_SCHEMA = DoctorLazy(() =>
  u({
    v: literal(ACCEPTED_SETTINGS_VERSION),
    kind: literal("file"),
    path: string(),
    text: string().nullable(),
    sha256: string()
      .regex(/^[0-9a-f]{64}$/)
      .nullable(),
    at: string(),
    by: _enum(["first_attach", "own_write", "person"]),
  }),
);
var ACCEPTED_FOLDER_RECORD_SCHEMA = DoctorLazy(() =>
  u({
    v: literal(ACCEPTED_SETTINGS_VERSION),
    kind: literal("folder"),
    key: string(),
    project: string().nullable(),
    local: string().nullable(),
    legacy: string().nullable(),
    at: string(),
  }),
);
//@ chunk-cc8an1p1.js:1479-1536 placement
/**
 * 比较两个路径是否相同（Windows 下忽略盘符大小写）。
 */
function samePathCaseAware(e, i) {
  return getPlatform() === "windows" ? normalizeDriveLetter(e) === normalizeDriveLetter(i) : e === i;
}
//@ chunk-cc8an1p1.js:1536-1603 placement
/**
 * 把路径的盘符字母转成大写，供 Windows 路径比较。
 */
function normalizeDriveLetter(e) {
  return e.replace(/^[a-z](?=:)/, (i) => i.toUpperCase());
}
//@ chunk-cc8an1p1.js:1603-1647 placement = setCwdState (1)
function nfcKey(cwd) {
  return normalizeCaseForComparison(cwd.normalize("NFC"));
}
//@ chunk-cc8an1p1.js:1647-1726 placement
/**
 * 按规范化路径算出的哈希拼出「已接受设置」记录文件路径。
 */
function settingsRecordPath(e, dir = servedCallsDir()) {
  return join(
    dir,
    `${ACCEPTED}settings-${computeContentHash(nfcKey(resolve(e))).slice(0, 32)}${SETTINGS_FILE_EXT}`,
  );
}
//@ chunk-cc8an1p1.js:1726-1800 placement
/**
 * 按文件夹名哈希拼出「已接受文件夹设置」记录路径。
 */
function folderRecordPath(cwd, dir = servedCallsDir()) {
  return join(dir, `${ACCEPTED}folder-${computeContentHash(nfcKey(cwd)).slice(0, 32)}${SETTINGS_FILE_EXT}`);
}
//@ chunk-cc8an1p1.js:1800-1851 placement
/**
 * 把 .jsonl 记录路径换成 .seen 存在标记路径。
 */
function seenMarkerPath(e) {
  return `${e.slice(0, -SETTINGS_FILE_EXT.length)}${SEEN_MARKER_EXT}`;
}
//@ chunk-cc8an1p1.js:1851-1986 placement
function readAcceptedRecord(e) {
  try {
    return readFileSync(e, MAX_ACCEPTED_SETTINGS_BYTES);
  } catch (error) {
    if (!isENOENT(error)) throw error;
  }
  try {
    lstatSync(seenMarkerPath(e));
  } catch (error) {
    if (isENOENT(error)) return;
    throw error;
  }
  throw Error("record aged out");
}
//@ chunk-cc8an1p1.js:1986-2036 placement
/**
 * 把文件的访问与修改时间更新为当前时间，用于保留标记（失败忽略）。
 */
function touchFile(e) {
  try {
    let date = new Date();
    utimesSync(e, date, date);
  } catch {}
}
//@ chunk-cc8an1p1.js:2036-3582 placement
/**
 * 远程工具宿主"已接受设置"的记录存储：按路径记录文件文本与哈希、按文件夹记录项目/本地/旧版设置；读取时校验格式与哈希，不可读返回 "unreadable"；写入采用原子发布并维护存在标记。
 */
function createAcceptedSettingsStore(dir = servedCallsDir()) {
  let i = (r, n) => {
    mkdirSync(dir, {
      recursive: true,
      mode: 448,
    });
    let t = seenMarkerPath(r);
    let g = false;
    try {
      writeFileSync(t, "", {
        mode: 384,
        flag: "wx",
      });
      g = true;
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
          if (lstatSync(r).isFile())
            writeFileSync(t, "", {
              mode: 384,
              flag: "wx",
            });
        } catch {}
      }
      throw error;
    }
    try {
      writeFileSync(t, "", {
        mode: 384,
        flag: "wx",
      });
    } catch (error) {
      if (getErrnoCode(error) !== "EEXIST") throw error;
    }
  };
  let s = new Set();
  let d = (r, n, acceptedRecord) => {
    let firstLine = getFirstLine(acceptedRecord);
    if (acceptedRecord.length > firstLine.length + 1 && !s.has(n)) {
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
    return firstLine;
  };
  return {
    file: (r) => {
      try {
        let acceptedRecord = readAcceptedRecord(settingsRecordPath(r, dir));
        if (acceptedRecord === undefined) return "none";
        let t = ACCEPTED_FILE_RECORD_SCHEMA().safeParse(jsonParse(d("file", r, acceptedRecord)));
        if (
          !t.success ||
          !samePathCaseAware(resolve(t.data.path), resolve(r)) ||
          hashOrNull(t.data.text) !== t.data.sha256
        )
          return "unreadable";
        return {
          text: t.data.text,
          sha256: t.data.sha256,
        };
      } catch {
        return "unreadable";
      }
    },
    recordFile: (r, n, by) => {
      if (n !== null && Buffer.byteLength(n) > MAX_SETTINGS_JSON_BYTES)
        throw Error("accepted settings text exceeds the settings size limit");
      i(settingsRecordPath(r, dir), {
        v: ACCEPTED_SETTINGS_VERSION,
        kind: "file",
        path: r,
        text: n,
        sha256: hashOrNull(n),
        at: new Date().toISOString(),
        by,
      });
      s.delete(r);
    },
    folder: (r) => {
      try {
        let acceptedRecord = readAcceptedRecord(folderRecordPath(r, dir));
        if (acceptedRecord === undefined) return "none";
        let t = ACCEPTED_FOLDER_RECORD_SCHEMA().safeParse(jsonParse(d("folder", r, acceptedRecord)));
        if (!t.success || !samePathCaseAware(t.data.key, r)) return "unreadable";
        let { project, local, legacy } = t.data;
        return {
          project,
          local,
          legacy,
        };
      } catch {
        return "unreadable";
      }
    },
    recordFolder: (r, n) => {
      i(folderRecordPath(r, dir), {
        v: ACCEPTED_SETTINGS_VERSION,
        kind: "folder",
        key: r,
        project: n.project,
        local: n.local,
        legacy: n.legacy,
        at: new Date().toISOString(),
      });
      s.delete(r);
    },
    noteServed: (r, n) => {
      touchFile(folderRecordPath(r, dir));
      for (let t of n) touchFile(settingsRecordPath(t, dir));
    },
  };
}
//@ chunk-cc8an1p1.js:3582-3826 placement
async function pruneStaleSettingsCopies(e) {
  try {
    let i = Date.now() - STALE_SETTINGS_PRUNE_MS;
    for (let s of await readdir(e)) {
      let index = s.lastIndexOf(ACCEPTING_TEMP_INFIX);
      if (index <= 0 || !/^[0-9a-f]{8}\.jsonl$/.test(s.slice(index + ACCEPTING_TEMP_INFIX.length))) continue;
      let r = join(e, s);
      if ((await lstat(r)).mtimeMs < i)
        await rm(r, {
          recursive: true,
          force: true,
        });
    }
  } catch {}
}
//@ chunk-cc8an1p1.js:3826-4488 placement
/**
 * 把待审设置写成临时文件交给检查函数，检查后确认文件未被替换（inode、大小、内容一致），返回 allowed/blocked/tampered，最后删除临时文件。
 */
async function checkSettingsCopy(settings, isBlocked) {
  let s = settings.dir ?? servedCallsDir();
  await mkdir(s, {
    recursive: true,
    mode: 448,
  });
  await pruneStaleSettingsCopies(s);
  let d = join(
    s,
    `${basename(settings.name)}${ACCEPTING_TEMP_INFIX}${randomBytes(4).toString("hex")}${SETTINGS_FILE_EXT}`,
  );
  await writeFile(d, settings.text, {
    mode: 384,
    flag: "wx",
  });
  try {
    let r = await lstat(d);
    if (await isBlocked(d)) return "blocked";
    let n;
    try {
      if (getPlatform() === "windows" && (await lstat(d)).isSymbolicLink()) return "tampered";
      n = await open(d, constants.O_RDONLY | NOFOLLOW_NONBLOCK_FLAGS);
      let stats = await n.stat();
      return stats.isFile() &&
        stats.nlink === 1 &&
        stats.ino === r.ino &&
        stats.dev === r.dev &&
        stats.size === r.size &&
        (await n.readFile({
          encoding: "utf8",
        })) === settings.text
        ? "allowed"
        : "tampered";
    } catch (error) {
      if (isENOENT(error) || getErrnoCode(error) === "ELOOP") return "tampered";
      throw error;
    } finally {
      await n?.close().catch(() => {});
    }
  } finally {
    await rm(d, {
      recursive: true,
      force: true,
    }).catch(() => {});
  }
}
export { hashOrNull, checkSettingsCopy, createAcceptedSettingsStore };
