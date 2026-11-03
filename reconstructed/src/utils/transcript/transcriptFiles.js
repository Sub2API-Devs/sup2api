/**
 * utils/transcript/transcriptFiles.ts
 *
 * 2.1.316 新增：转录文件
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-e6aww6q8.js (34)
 * attribution: placement 34
 */
import {
  open,
  open as open_2,
  open as open_3,
  open as open_4,
  open as open_5,
  open as open_6,
  open as open_7,
  open as open_8,
  open as open_9,
  open as open_10,
  open as open_11,
  open as open_12,
  open as open_13,
  open as open_14,
  open as open_15,
  open as open_16,
  open as open_17,
  open as open_18,
  open as open_19,
  open as open_20,
  open as open_21,
  open as open_22,
  open as open_23,
  open as open_24,
  open as open_25,
  open as open_26,
  open as open_27,
  mkdir,
  mkdir as mkdir_2,
  mkdir as mkdir_3,
  mkdir as mkdir_4,
  mkdir as mkdir_5,
  mkdir as mkdir_6,
  mkdir as mkdir_7,
  mkdir as mkdir_8,
  mkdir as mkdir_9,
  mkdir as mkdir_10,
  mkdir as mkdir_11,
  mkdir as mkdir_12,
  mkdir as mkdir_13,
  mkdir as mkdir_14,
  mkdir as mkdir_15,
  mkdir as mkdir_16,
  mkdir as mkdir_17,
  mkdir as mkdir_18,
  mkdir as mkdir_19,
  mkdir as mkdir_20,
  mkdir as mkdir_21,
  mkdir as mkdir_22,
  mkdir as mkdir_23,
  mkdir as mkdir_24,
  mkdir as mkdir_25,
  mkdir as mkdir_26,
  rm as rm_2,
  rm as rm_2_2,
  rm as rm_3,
  rm as rm_4,
  rm as rm_5,
  rm as rm_6,
  rm as rm_7,
  rm as rm_8,
  rm as rm_9,
  rm as rm_10,
  rm as rm_11,
  rm as rm_12,
  rm as rm_13,
  rm as rm_14,
  rm as rm_15,
  rm as rm_16,
  rm as rm_17,
  rm as rm_18,
  rm as rm_19,
  rm as rm_20,
  rm as rm_21,
  rm as rm_22,
  rm as rm_23,
  rm as rm_24,
  rm as rm_25,
  rm as rm_26,
  rm as rm_27,
} from "fs/promises";
import {
  dirname,
  dirname as dirname_2,
  dirname as dirname_3,
  dirname as dirname_4,
  dirname as dirname_5,
  dirname as dirname_6,
  dirname as dirname_7,
  dirname as dirname_8,
  dirname as dirname_9,
  dirname as dirname_10,
  dirname as dirname_11,
  dirname as dirname_12,
  dirname as dirname_13,
  dirname as dirname_14,
  dirname as dirname_15,
  dirname as dirname_16,
  dirname as dirname_17,
  dirname as dirname_18,
  dirname as dirname_19,
  dirname as dirname_20,
  dirname as dirname_21,
  dirname as dirname_22,
  dirname as dirname_23,
  dirname as dirname_24,
  dirname as dirname_25,
  dirname as dirname_26,
  dirname as dirname_27,
  dirname as dirname_28,
  dirname as dirname_29,
  dirname as dirname_30,
  dirname as dirname_31,
  dirname as dirname_32,
  dirname as dirname_33,
  dirname as dirname_34,
  dirname as dirname_35,
  dirname as dirname_36,
  dirname as dirname_37,
  dirname as dirname_38,
  dirname as dirname_39,
  dirname as dirname_40,
  dirname as dirname_41,
  dirname as dirname_42,
  dirname as dirname_43,
  dirname as dirname_44,
  dirname as dirname_45,
  dirname as dirname_46,
  dirname as dirname_47,
  dirname as dirname_48,
  dirname as dirname_49,
  dirname as dirname_50,
  dirname as dirname_51,
  dirname as dirname_52,
  dirname as dirname_53,
  dirname as dirname_54,
  dirname as dirname_55,
  dirname as dirname_56,
  dirname as dirname_57,
  dirname as dirname_58,
  dirname as dirname_59,
  dirname as dirname_60,
  dirname as dirname_61,
  dirname as dirname_62,
  dirname as dirname_63,
  dirname as dirname_64,
  dirname as dirname_65,
  dirname as dirname_66,
  dirname as dirname_67,
  dirname as dirname_68,
  dirname as dirname_69,
  dirname as dirname_70,
  dirname as dirname_71,
  dirname as dirname_72,
  dirname as dirname_73,
  dirname as dirname_74,
  dirname as dirname_75,
  dirname as dirname_76,
  dirname as dirname_77,
  relative,
  relative as relative_2,
  relative as relative_3,
  relative as relative_4,
  relative as relative_5,
  relative as relative_6,
  relative as relative_7,
  relative as relative_8,
  relative as relative_9,
  relative as relative_10,
  relative as relative_11,
  relative as relative_12,
  relative as relative_13,
  relative as relative_14,
  relative as relative_15,
  relative as relative_16,
  relative as relative_17,
  relative as relative_18,
  relative as relative_19,
  relative as relative_20,
  relative as relative_21,
  relative as relative_22,
  relative as relative_23,
  relative as relative_24,
  relative as relative_25,
  relative as relative_26,
  relative as relative_27,
  relative as relative_28,
  relative as relative_29,
  relative as relative_30,
  relative as relative_31,
  relative as relative_32,
  relative as relative_33,
  relative as relative_34,
  relative as relative_35,
  relative as relative_36,
  relative as relative_37,
  relative as relative_38,
  relative as relative_39,
  relative as relative_40,
  relative as relative_41,
  relative as relative_42,
  relative as relative_43,
  relative as relative_44,
  relative as relative_45,
  relative as relative_46,
  relative as relative_47,
  relative as relative_48,
  sep,
  sep as sep_2,
  sep as sep_3,
  sep as sep_4,
  sep as sep_5,
  sep as sep_6,
  sep as sep_7,
  sep as sep_8,
  sep as sep_9,
  sep as sep_10,
  sep as sep_11,
  sep as sep_12,
  sep as sep_13,
  sep as sep_14,
  sep as sep_15,
  sep as sep_16,
  sep as sep_17,
  sep as sep_18,
  sep as sep_19,
  sep as sep_20,
  sep as sep_21,
  sep as sep_22,
  sep as sep_23,
  sep as sep_24,
  sep as sep_25,
  sep as sep_26,
  sep as sep_27,
  sep as sep_28,
  sep as sep_29,
  sep as sep_30,
  sep as sep_31,
  sep as sep_32,
  sep as sep_33,
  sep as sep_34,
  sep as sep_35,
  sep as sep_36,
  sep as sep_37,
  sep as sep_38,
  sep as sep_39,
  sep as sep_40,
  sep as sep_41,
  sep as sep_42,
  sep as sep_43,
  sep as sep_44,
  sep as sep_45,
  sep as sep_46,
  sep as sep_47,
  sep as sep_48,
  sep as sep_49,
  sep as sep_50,
  sep as sep_51,
  sep as sep_52,
  sep as sep_53,
  sep as sep_54,
  sep as sep_55,
  sep as sep_56,
  sep as sep_57,
  sep as sep_58,
  sep as sep_59,
  sep as sep_60,
  sep as sep_61,
  sep as sep_62,
  sep as sep_63,
  sep as sep_64,
  sep as sep_65,
  sep as sep_66,
  sep as sep_67,
  sep as sep_68,
  sep as sep_69,
  sep as sep_70,
  sep as sep_71,
  sep as sep_72,
  sep as sep_73,
  isAbsolute,
  isAbsolute as isAbsolute_2,
  isAbsolute as isAbsolute_3,
  isAbsolute as isAbsolute_4,
  isAbsolute as isAbsolute_5,
  isAbsolute as isAbsolute_6,
  isAbsolute as isAbsolute_7,
  isAbsolute as isAbsolute_8,
  isAbsolute as isAbsolute_9,
  isAbsolute as isAbsolute_10,
  isAbsolute as isAbsolute_11,
  isAbsolute as isAbsolute_12,
  isAbsolute as isAbsolute_13,
  isAbsolute as isAbsolute_14,
  isAbsolute as isAbsolute_15,
  isAbsolute as isAbsolute_16,
  isAbsolute as isAbsolute_17,
  isAbsolute as isAbsolute_18,
  isAbsolute as isAbsolute_19,
  isAbsolute as isAbsolute_20,
  isAbsolute as isAbsolute_21,
  isAbsolute as isAbsolute_22,
  isAbsolute as isAbsolute_23,
  isAbsolute as isAbsolute_24,
  isAbsolute as isAbsolute_25,
  isAbsolute as isAbsolute_26,
  isAbsolute as isAbsolute_27,
  isAbsolute as isAbsolute_28,
  isAbsolute as isAbsolute_29,
  isAbsolute as isAbsolute_30,
  isAbsolute as isAbsolute_31,
  isAbsolute as isAbsolute_32,
  isAbsolute as isAbsolute_33,
  isAbsolute as isAbsolute_34,
  isAbsolute as isAbsolute_35,
  isAbsolute as isAbsolute_36,
  isAbsolute as isAbsolute_37,
  isAbsolute as isAbsolute_38,
  isAbsolute as isAbsolute_39,
  isAbsolute as isAbsolute_40,
  isAbsolute as isAbsolute_42,
  isAbsolute as isAbsolute_43,
  isAbsolute as isAbsolute_44,
  isAbsolute as isAbsolute_45,
  isAbsolute as isAbsolute_46,
  isAbsolute as isAbsolute_47,
  isAbsolute as isAbsolute_48,
  isAbsolute as isAbsolute_49,
  isAbsolute as isAbsolute_50,
  isAbsolute as isAbsolute_51,
  isAbsolute as isAbsolute_52,
  isAbsolute as isAbsolute_53,
  isAbsolute as isAbsolute_54,
  isAbsolute as isAbsolute_55,
  isAbsolute as isAbsolute_56,
  isAbsolute as isAbsolute_57,
  join,
  join as join_2,
  join as join_3,
  join as join_4,
  join as join_5,
  join as join_6,
  join as join_7,
  join as join_8,
  join as join_9,
  join as join_10,
  join as join_11,
  join as join_12,
  join as join_13,
  join as join_14,
  join as join_15,
  join as join_16,
  join as join_17,
  join as join_18,
  join as join_19,
  join as join_20,
  join as join_21,
  join as join_22,
  join as join_23,
  join as join_24,
  join as join_25,
  join as join_26,
  join as join_27,
  join as join_28,
  join as join_29,
  join as join_30,
  join as join_31,
  join as join_32,
  join as join_33,
  join as join_34,
  join as join_35,
  join as join_36,
  join as join_37,
  join as join_38,
  join as join_40,
  join as join_41,
  join as join_42,
  join as join_43,
  join as join_44,
  join as join_45,
  join as join_46,
  join as join_47,
  join as join_48,
  join as join_49,
  join as join_50,
  join as join_51,
  join as join_52,
  join as join_53,
  join as join_54,
  join as join_55,
  join as join_56,
  join as join_57,
  join as join_58,
  join as join_59,
  join as join_60,
  join as join_61,
  join as join_62,
  join as join_63,
  join as join_64,
  join as join_65,
  join as join_66,
  join as join_67,
  join as join_68,
  join as join_69,
  join as join_70,
  join as join_71,
  join as join_72,
  join as join_73,
  join as join_74,
  join as join_75,
  join as join_76,
  join as join_77,
  join as join_78,
  join as join_79,
  join as join_80,
  join as join_81,
  join as join_82,
  join as join_84,
  join as join_85,
  join as join_86,
  join as join_87,
  join as join_88,
  join as join_89,
  join as join_90,
  join as join_91,
  join as join_92,
  join as join_93,
  join as join_94,
  join as join_95,
  join as join_96,
  join as join_97,
  join as join_98,
  join as join_99,
  join as join_100,
  join as join_101,
  join as join_102,
  join as join_103,
  join as join_104,
  join as join_105,
  join as join_106,
  join as join_107,
  join as join_108,
  join as join_109,
  join as join_110,
  join as join_111,
  join as join_112,
  join as join_113,
  join as join_114,
  join as join_115,
  join as join_116,
  join as join_117,
  join as join_118,
  join as join_119,
  join as join_120,
  join as join_121,
  join as join_122,
  join as join_123,
  join as join_124,
  join as join_125,
  join as join_126,
  join as join_127,
  join as join_128,
  join as join_129,
} from "path";
import { lxt, SHe } from "./entryTypes.js";
import { isBeforeCompactBoundary } from "../../components/tasks/BackgroundTaskStatus.js";
import { TRANSCRIPT_READ_CHUNK_SIZE, COMPACT_BOUNDARY_MARKER } from "../sessionStoragePortable.js";
import { DoctorLazy } from "../../cli/handlers/util.js";
import { kt, Ue, T, o } from "../../../vendor/zod/v4/classic/schemas.js";
import { jsonParseRaw, jsonStringify } from "../slowOperations.js";
import { sanitizeSessionTitle } from "../stringUtils.js";
import { getCustomTitlePath } from "../../cli/toolPermissionStream.js";
import { isStorageV5Enabled } from "../hoverRest.js";
import { pathToSessionSideKey, validateStorageKey, validateStorageScope } from "../storage/storageKeys.js";
import { logForDebugging } from "../debug.js";
import { isDiskless } from "../../bootstrap/state.js";
import { writeFileAtomic as writeFileAtomic_2 } from "../atomicPublishWrite.js";
import {
  errorMessage,
  TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS,
  isWin32ReadEbadf,
  storageCauseErrnoCode,
  getTelemetryMessage,
  isSadFsErrno,
  isEnvFsErrno,
} from "../errors.js";
import { formatStorageError } from "../storage/storageErrors.js";
import { isValidKeySegment, STORAGE_SPACES, XOi } from "../storage/storageSpaces.js";
import { getProjectsDir as getProjectsDir_2 } from "../sessionStorage.js";
import { formatFileSize } from "../format.js";
import { isPlainObject as isPlainObject_4 } from "../isPlainObject.js";

//@ chunk-e6aww6q8.js:293658-293843 placement
function makeLineEmitter(e) {
  return (n, r) => {
    let s = [];
    if (lxt(e, n)) s.push(e.ledgerSubstitutes.get(n) ?? r);
    if (n === e.lastBoundaryIdx) {
      for (let h of e.lastMeta.values()) if (isBeforeCompactBoundary(e, h)) s.push(h.line);
    }
    return s;
  };
}
//@ chunk-e6aww6q8.js:293843-293921 placement
function ice(e) {
  let n = 0;
  while (e.charCodeAt(n) === 0) n++;
  return n > 0 ? e.slice(n) : e;
}
//@ chunk-e6aww6q8.js:293921-293970 placement
var mapped = [...SHe].map((e) => Buffer.from(`"${e}"`));
/**
 * 以分块方式读取转录文件前 n 字节，查找 COMPACT_BOUNDARY_MARKER 与各元数据标记的位置，跨块拼接处理半行， 返回最后边界偏移及需要跳过/保留的元数据行信息。
 */
//@ chunk-e6aww6q8.js:293970-295017 placement
async function scanCompactBoundaries(e, n, r = TRANSCRIPT_READ_CHUNK_SIZE) {
  let h = Math.max(COMPACT_BOUNDARY_MARKER.length, ...mapped.map((Se) => Se.length)) - 1,
    min = Math.min(r, Math.max(n, 1)),
    allocUnsafe = Buffer.allocUnsafe(h + min),
    w = -1,
    L = 0,
    G = 0,
    q = -1,
    Z = await open_2(e, "r");
  try {
    let Se = 0,
      ke = 0;
    while (Se < n) {
      let { bytesRead: bytesRead } = await Z.read(allocUnsafe, ke, Math.min(min, n - Se), Se);
      if (bytesRead === 0) break;
      let Ee = Se - ke;
      Se += bytesRead;
      let chunk = allocUnsafe.subarray(0, ke + bytesRead);
      for (
        let index = chunk.indexOf(COMPACT_BOUNDARY_MARKER);
        index >= 0;
        index = chunk.indexOf(COMPACT_BOUNDARY_MARKER, index + 1)
      )
        w = Ee + index;
      let Ie = chunk.subarray(0, ke).lastIndexOf(10) + 1;
      if (q >= 0) {
        let index = chunk.indexOf(10, ke);
        if (index < 0) Ie = chunk.length;
        else ((L += Ee + index + 1 - q), (q = -1), (Ie = index + 1));
      }
      let Me = -2,
        mapped_2 = mapped.map((lt) => ({ marker: lt, at: Me }));
      while (Ie < chunk.length) {
        let lt = -1;
        for (let Et of mapped_2) {
          if (Et.at !== -1 && Et.at < Ie) Et.at = chunk.indexOf(Et.marker, Ie);
          if (Et.at >= 0 && (lt < 0 || Et.at < lt)) lt = Et.at;
        }
        if (lt < 0) break;
        let index = chunk.subarray(0, lt).lastIndexOf(10),
          nt = index >= 0 ? Ee + index + 1 : G,
          index_2 = chunk.indexOf(10, lt);
        if (index_2 < 0) {
          q = nt;
          break;
        }
        ((L += Ee + index_2 + 1 - nt), (Ie = index_2 + 1));
      }
      let index = chunk.lastIndexOf(10);
      if (index >= 0) G = Ee + index + 1;
      ((ke = Math.min(h, chunk.length)), allocUnsafe.copy(allocUnsafe, 0, chunk.length - ke, chunk.length));
    }
  } finally {
    await Z.close().catch(() => {});
  }
  if (w < 0) return 0;
  if (q >= 0) L += n - q;
  return Math.min(n, w + L);
}
//@ chunk-e6aww6q8.js:295017-295088 placement
var nfo = DoctorLazy(() => kt({ type: Ue([T("user"), T("assistant")]), timestamp: o() }));
/**
 * 从文本末尾向前找最后一条 user/assistant 消息的时间戳。
 */
//@ chunk-e6aww6q8.js:295088-295414 placement
function findLastMessageTimestamp(e) {
  let n = e.length;
  while (n > 0) {
    let index = e.lastIndexOf(
        `
`,
        n - 1,
      ),
      sliced = e.slice(index + 1, n);
    if (
      ((n = index),
      sliced.includes('"timestamp":') &&
        (sliced.includes('"type":"user"') || sliced.includes('"type":"assistant"')))
    )
      try {
        let safeParse = nfo().safeParse(jsonParseRaw(sliced));
        if (safeParse.success) {
          let parse = Date.parse(safeParse.data.timestamp);
          if (!Number.isNaN(parse)) return parse;
        }
      } catch {}
    if (index < 0) break;
  }
  return;
}
/**
 * 写会话标题旁文件（空标题则删除，v5 存储时写存储）。
 */
//@ chunk-e6aww6q8.js:295495-295925 placement
async function writeSessionTitleSidecar(e, n, r, s) {
  if (!sanitizeSessionTitle(r)) {
    await deleteSessionTitleSidecar(e, n, s);
    return;
  }
  let h = getCustomTitlePath(e, n);
  try {
    if (isStorageV5Enabled() && s !== void 0) {
      let y = pathToSessionSideKey(h);
      if (y !== void 0) {
        let write = await s.write(y, jsonStringify({ customTitle: r }), { mode: 384 });
        if (!write.ok)
          logForDebugging(`writeSessionTitleSidecar: ${write.error.code} via storage`, { level: "error" });
        return;
      }
    }
    if (isDiskless()) return;
    (await mkdir_3(dirname_4(h), { recursive: !0, mode: 448 }),
      await writeFileAtomic_2(h, jsonStringify({ customTitle: r }), 384));
  } catch (error) {
    logForDebugging(`writeSessionTitleSidecar: ${errorMessage(error)}`, { level: "error" });
  }
}
/**
 * 删除会话标题旁文件。
 */
//@ chunk-e6aww6q8.js:295925-296237 placement
async function deleteSessionTitleSidecar(e, n, r) {
  try {
    if (isStorageV5Enabled() && r !== void 0) {
      let s = pathToSessionSideKey(getCustomTitlePath(e, n));
      if (s !== void 0) {
        let h = await r.delete(s);
        if (!h.ok)
          logForDebugging(`deleteSessionTitleSidecar: ${h.error.code} via storage`, { level: "error" });
        return;
      }
    }
    if (isDiskless()) return;
    await rm_2_2(getCustomTitlePath(e, n), { force: !0 });
  } catch (error) {
    logForDebugging(`deleteSessionTitleSidecar: ${errorMessage(error)}`, { level: "error" });
  }
}
//@ chunk-e6aww6q8.js:296237-296264 placement
var ifo = 262144,
  yxt = 2097152;
/**
 * 打开转录文件流，支持倒序读取，文件不存在时报 ENOENT。
 */
//@ chunk-e6aww6q8.js:296264-297367 placement
async function* openTranscriptStream(e, n) {
  let r,
    s,
    h = ifo,
    y = !1;
  for (;;) {
    let records = await e.readRecords(
      n,
      y
        ? { order: "backward", limit: 2, fromSeq: r }
        : { order: "backward", maxBytes: h + (s?.byteLength ?? 0), ...(r !== void 0 && { fromSeq: r }) },
    );
    if (!records.ok) {
      if (records.error.code === "NotFound" && r === void 0)
        throw Object.assign(
          new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
            "ENOENT: no such file or directory, open (transcript stream)",
            "ENOENT: no such file or directory",
          ),
          { code: "ENOENT", syscall: "open" },
        );
      throw (
        logForDebugging(`[transcript-reverse-read] stream read failed: ${formatStorageError(records.error)}`),
        Error("v5 transcript stream read failed")
      );
    }
    let items = records.value.items;
    if (s !== void 0) {
      let G = items[0];
      if (G === void 0 || G.seq !== r || Buffer.compare(s, G.data) !== 0)
        throw (
          logForDebugging(
            "[transcript-reverse-read] transcript stream changed between pages; abandoning the scan",
          ),
          Error("v5 transcript stream changed between pages")
        );
      items = items.slice(1);
    }
    if (items.length === 0) {
      if (records.value.nextSeq === void 0) return;
      y = !0;
      continue;
    }
    y = !1;
    let L;
    for (let G of items) {
      let { data: q } = G,
        Z = q.at(-1) === 10 ? q.length - 1 : q.length,
        str = Buffer.from(q.buffer, q.byteOffset, Z).toString("utf8");
      if (str) ((L = G), yield str);
    }
    if (records.value.nextSeq === void 0) return;
    if (L === void 0) {
      h += yxt;
      continue;
    }
    ((r = L.seq), (s = Buffer.from(L.data)), (h = yxt));
  }
}
/**
 * Windows 读转录报 EBADF 时的说明与遥测消息。
 */
//@ chunk-e6aww6q8.js:297367-298028 placement
var WIN32_EBADF_HELP =
    "Windows reported an error (EBADF) when Claude Code read this session's transcript file, although the file had opened normally. This can happen when other software intercepts file reads \u2014 security, encryption or endpoint-management tools, for example. If it keeps happening for this conversation, try excluding the folder that holds Claude Code's session transcripts from such software (the .claude folder in your user profile, unless the app or CLAUDE_CONFIG_DIR points Claude Code elsewhere), or adding Claude Code to its allowed applications, then resume again.",
  WIN32_EBADF_TELEMETRY_MESSAGE =
    "loadTranscriptFile: transcript read failed with EBADF (syscall read, win32)";
//@ chunk-e6aww6q8.js:298028-298220 placement
function isWin32TranscriptEbadf(e, n) {
  if (isWin32ReadEbadf(e, n)) return !0;
  try {
    let r = e instanceof Error ? e.cause : void 0,
      s = typeof r === "object" && r !== null && "cause" in r ? r.cause : void 0;
    return storageCauseErrnoCode(e) === "EBADF" && isWin32ReadEbadf(s, n);
  } catch {
    return !1;
  }
}
//@ chunk-e6aww6q8.js:298220-298267 placement
function Sxt(e, n) {
  return isWin32TranscriptEbadf(e, n) && getTelemetryMessage(e) === WIN32_EBADF_TELEMETRY_MESSAGE;
}
//@ chunk-e6aww6q8.js:298267-298315 placement
function Qoe(e, n) {
  return isSadFsErrno(e) || isEnvFsErrno(e) || Sxt(e, n);
}
//@ chunk-e6aww6q8.js:298315-298360 placement
function _et(e, n) {
  return Sxt(e, n) ? WIN32_EBADF_HELP : void 0;
}
/**
 * 转录文件路径转存储键（主转录或子代理转录）。
 */
//@ chunk-e6aww6q8.js:298435-298887 placement
function transcriptStorageKeyForPath(e) {
  let n = splitProjectsPath(e);
  if (n === void 0) return;
  let [r, s] = n,
    at = n.at(-1);
  if (r === void 0 || s === void 0 || at === void 0) return;
  if (n.length === 2) {
    let match = /^(.+)\.jsonl$/.exec(at);
    if (match === null) return;
    let G = match[1];
    return isValidKeySegment(r) && isValidKeySegment(G) ? e0(STORAGE_SPACES.transcript(r, G)) : void 0;
  }
  if (n.length < 4 || n[2] !== "subagents") return;
  let match = /^agent-(.+)\.jsonl$/.exec(at);
  if (match === null) return;
  let S = match[1],
    sliced = n.slice(3, -1);
  if (![r, s, S, ...sliced].every(isValidKeySegment)) return;
  return e0(STORAGE_SPACES.transcript(r, s, S, sliced.length > 0 ? sliced : void 0));
}
//@ chunk-e6aww6q8.js:298887-298941 placement
function wG(e) {
  return typeof e === "string" ? transcriptStorageKeyForPath(e) : e.key;
}
//@ chunk-e6aww6q8.js:298941-299033 placement
function O$o(e) {
  let n = transcriptStorageKeyForPath(e);
  return n?.namespace === "transcript" && n.agentId === void 0 ? n : void 0;
}
//@ chunk-e6aww6q8.js:299033-299189 placement
function mainTranscriptKeyOf(e) {
  return e.namespace === "transcript" && (e.agentId ?? e.journal ?? e.sessionJournal) === void 0
    ? { projectKey: e.projectKey, sessionId: e.sessionId }
    : void 0;
}
//@ chunk-e6aww6q8.js:299189-299235 placement
function e0(e) {
  return validateStorageKey(e) === void 0 ? e : void 0;
}
//@ chunk-e6aww6q8.js:299235-299384 placement
function splitProjectsPath(e) {
  let n = relative_3(getProjectsDir_2(), e);
  if (n === "" || n === ".." || n.startsWith(`..${sep_4}`) || isAbsolute_2(n)) return;
  let parts = n.split(sep_4);
  return e === join_6(getProjectsDir_2(), ...parts) ? parts : void 0;
}
/**
 * 转录目录路径转存储作用域。
 */
//@ chunk-e6aww6q8.js:299384-299701 placement
function transcriptScopeForDir(e) {
  let n = splitProjectsPath(e);
  if (n === void 0) return;
  let [r, s, h, ...y] = n,
    S;
  if (r !== void 0 && n.length === 1) S = { namespace: "transcript", projectKey: r };
  else if (r !== void 0 && s !== void 0 && h === "subagents")
    S = y.length > 0 ? { namespace: "transcript", projectKey: r, sessionId: s, agentRelPath: y } : XOi(r, s);
  else return;
  return validateStorageScope(S) === void 0 ? S : void 0;
}
//@ chunk-e6aww6q8.js:299701-299776 placement
function Ext(e) {
  return e !== void 0 ? { type: "ifMatch", version: e } : { type: "none" };
}
//@ chunk-e6aww6q8.js:299776-300035 placement
function rowHasUuid(e, n) {
  let buffer = Buffer.from(e.data.buffer, e.data.byteOffset, e.data.byteLength);
  if (!buffer.includes(`"uuid":"${n}"`)) return !1;
  try {
    let s = jsonParseRaw(buffer.toString("utf8").replace(/\r?\n$/, ""));
    return typeof s === "object" && s !== null && "uuid" in s && s.uuid === n;
  } catch {
    return !1;
  }
}
/**
 * 从转录流中移除墓碑记录。
 */
//@ chunk-e6aww6q8.js:300035-301017 placement
async function removeTombstones(e, n, r, s) {
  for (let h = 1; h <= 3; h++) {
    let statStream = await e.statStream(n);
    if (!statStream.ok) {
      if (statStream.error.code !== "NotFound")
        logForDebugging(`Tombstone removal abandoned: stream stat failed (${statStream.error.code})`, {
          level: "warn",
        });
      return;
    }
    let S = Ext(statStream.value.version),
      records = await e.readRecords(n, { order: "backward", maxBytes: s.windowBytes });
    if (!records.ok) {
      if (records.error.code !== "NotFound")
        logForDebugging(`Tombstone removal abandoned: record page failed (${records.error.code})`, {
          level: "warn",
        });
      return;
    }
    let filtered = records.value.items.filter((item) => rowHasUuid(item, r)),
      G = filtered[0],
      q = records.value.items.length > 1 || (G !== void 0 && G.data.byteLength < s.windowBytes);
    if (G === void 0 || !q) return await removeTombstonesBackward(e, n, r, records.value, filtered, S, s);
    let replaceRecords = await e.replaceRecords(n, [], {
      keepBefore: G.seq,
      preserveFrom: G.endSeq,
      publishDiscipline: "inPlace",
      precondition: S,
    });
    if (replaceRecords.ok || replaceRecords.error.code === "NotFound") return;
    if (
      !(
        replaceRecords.error.code === "PreconditionFailed" ||
        (replaceRecords.error.code === "Unavailable" && replaceRecords.error.retryAfterMs === void 0)
      ) ||
      h === 3
    ) {
      logForDebugging(`Tombstone removal abandoned after ${h} attempt(s) (${replaceRecords.error.code})`, {
        level: "warn",
      });
      return;
    }
  }
}
//@ chunk-e6aww6q8.js:301017-301962 placement
async function removeTombstonesBackward(e, n, r, s, h, y, S) {
  let reduced = s.items.reduce((q, Z) => q + Z.data.byteLength, 0),
    L = [...h],
    nextSeq = s.nextSeq;
  while (nextSeq !== void 0) {
    if (reduced > S.maxReadBytes) {
      logForDebugging(
        `Skipping tombstone removal: session stream too large (over ${formatFileSize(S.maxReadBytes)} read)`,
        { level: "warn" },
      );
      return;
    }
    let records = await e.readRecords(n, { order: "backward", fromSeq: nextSeq, maxBytes: S.pageBytes });
    if (!records.ok) {
      logForDebugging(`Tombstone removal abandoned: paging failed (${records.error.code})`, {
        level: "warn",
      });
      return;
    }
    for (let item of records.value.items)
      if (((reduced += item.data.byteLength), rowHasUuid(item, r))) L.push(item);
    let nextSeq_2 = records.value.nextSeq;
    if (nextSeq_2 !== void 0 && nextSeq_2 >= nextSeq) {
      logForDebugging("Tombstone removal abandoned: the backward record cursor did not advance", {
        level: "warn",
      });
      return;
    }
    nextSeq = nextSeq_2;
  }
  for (let q of L) {
    let replaceRecords = await e.replaceRecords(n, [], {
      keepBefore: q.seq,
      preserveFrom: q.endSeq,
      publishDiscipline: "inPlace",
      precondition: y,
    });
    if (!replaceRecords.ok) {
      if (replaceRecords.error.code !== "NotFound")
        logForDebugging(`Tombstone removal abandoned on the paged path (${replaceRecords.error.code})`, {
          level: "warn",
        });
      return;
    }
    y = Ext(replaceRecords.value.version);
  }
}
//@ chunk-e6aww6q8.js:301962-302034 placement
function _D(e, n) {
  return Array.isArray(e) && e.some((r) => isPlainObject_4(r) && r.type === n);
}
//@ chunk-e6aww6q8.js:302034-302227 placement
function collectLinearChain(e, n, r, s) {
  let h = [],
    y = e;
  while (y !== void 0) {
    if (s.has(y.uuid) || !filterResumableSessions(y, n)) return [];
    h.push(y);
    let filtered = (r.get(y.uuid) ?? []).filter((w) => !s.has(w.uuid));
    if (filtered.length > 1) return [];
    y = filtered[0];
  }
  return h;
}
//@ chunk-e6aww6q8.js:302227-302289 placement = filterResumableSessions (1)
function filterResumableSessions(logs, currentSessionId) {
  return logs.isSidechain === currentSessionId.isSidechain && isAuxiliaryEntry(logs);
}
//@ chunk-e6aww6q8.js:302289-302474 placement
function isAuxiliaryEntry(e) {
  if (e.type === "attachment") return !0;
  if (e.type === "system") return e.subtype !== "compact_boundary";
  return e.type === "user" && e.isMeta === !0 && !_D(e.message?.content, "tool_result");
}
//@ chunk-e6aww6q8.js:302474-302538 placement
function lR(e, n) {
  return e?.get(n.uuid) ?? Number.MAX_SAFE_INTEGER;
}
//@ chunk-e6aww6q8.js:302538-302615 placement
function vG(e) {
  let n = new Map(),
    r = 0;
  for (let s of e.keys()) n.set(s, r++);
  return n;
}
//@ chunk-e6aww6q8.js:302615-302775 placement
function buildChildrenIndex(e) {
  let n = new Map();
  for (let r of e.values()) {
    if (!r.parentUuid) continue;
    let s = n.get(r.parentUuid);
    if (s) s.push(r);
    else n.set(r.parentUuid, [r]);
  }
  return n;
}
/**
 * 对每个末端消息向上回溯到第一个 user/assistant 消息（带记忆），没有 user/assistant 子节点者加入 leafUuids；返回是否遇到环。
 */
//@ chunk-e6aww6q8.js:303694-304122 placement
function collectLeafUuids({
  messages: messages,
  terminalMessages: terminalMessages,
  hasUserAssistantChild: hasUserAssistantChild,
  leafUuids: leafUuids,
}) {
  let h = new Map(),
    y = !1;
  for (let S of terminalMessages) {
    let w = [],
      L = "root",
      G = S;
    while (G) {
      if (G.type === "user" || G.type === "assistant") {
        L = G;
        break;
      }
      let q = h.get(G.uuid);
      if (q !== void 0) {
        L = q;
        break;
      }
      (h.set(G.uuid, "cycle"), w.push(G.uuid), (G = G.parentUuid ? messages.get(G.parentUuid) : void 0));
    }
    for (let q of w) h.set(q, L);
    if (L === "cycle") y = !0;
    else if (L !== "root" && !hasUserAssistantChild.has(L.uuid)) leafUuids.add(L.uuid);
  }
  return y;
}

export {
  Qoe,
  ice,
  deleteSessionTitleSidecar,
  transcriptStorageKeyForPath,
  removeTombstones,
  scanCompactBoundaries,
  makeLineEmitter,
  wG,
  transcriptScopeForDir,
  _D,
  isAuxiliaryEntry,
  lR,
  vG,
  buildChildrenIndex,
  collectLinearChain,
  writeSessionTitleSidecar,
  openTranscriptStream,
  collectLeafUuids,
  isWin32TranscriptEbadf,
  WIN32_EBADF_TELEMETRY_MESSAGE,
  e0,
  findLastMessageTimestamp,
  _et,
  mainTranscriptKeyOf,
  O$o,
};
