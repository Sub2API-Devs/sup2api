/**
 * services/homeSeed/destination.ts
 *
 * 2.1.316 新增：home seed 目标位置
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-twq47pff.js (11)
 * attribution: placement 11
 */
import {
  stat,
  realpath,
  realpath as realpath_2,
  realpath as realpath_3,
  mkdir,
  lstat,
  lstat as lstat_2,
} from "fs/promises";
import {
  dirname,
  dirname as dirname_2,
  dirname as dirname_3,
  basename,
  basename as basename_2,
  basename as basename_3,
  join,
  join as join_2,
  join as join_3,
  join as join_4,
  join as join_5,
  relative,
  relative as relative_2,
  relative as relative_3,
  sep,
  sep as sep_2,
  sep as sep_3,
  sep as sep_4,
  resolve,
  resolve as resolve_2,
  posix,
} from "path";
import { SETTINGS_JSON, classifyWorkingFile, RULES, OUTPUT_STYLES } from "./workingFiles.js";
import { STORAGE_SPACES } from "../../utils/storage/storageSpaces.js";
import { K1n } from "../../cli/remoteIO/workerAuth.js";
import { x0r, writeUnderSyncDir, shouldIgnore } from "../syncedFiles/syncedFileSyncer.js";
import { getErrnoCode, isENOENT } from "../../utils/errors.js";

//@ chunk-twq47pff.js:32742-32760 placement
var jn = 501,
  Bn = 409;
//@ chunk-twq47pff.js:32760-32925 placement
function classifyRowError(t) {
  if (t.errorKind === "auth") return "auth";
  if (t.errorKind === "gated" || t.status === jn || t.status === Bn) return "refused";
  return t.retryable ? "transport" : "rejected";
}
//@ chunk-twq47pff.js:33217-33280 placement
async function Xn(t) {
  try {
    return (await stat(t), !0);
  } catch {
    return !1;
  }
}
/**
 * 求目标路径相对于真实 home 的拼写：从最近的存在祖先求真实路径再拼回，落在 home 之外返回 null。
 */
//@ chunk-twq47pff.js:33280-33535 placement
async function resolveDestinationSpelling(t, e) {
  try {
    let n = dirname_2(e),
      l = [];
    while (!(await Xn(n))) {
      l.unshift(basename_2(n));
      let v = dirname_2(n);
      if (v === n) return null;
      n = v;
    }
    let d = await realpath_2(n),
      u = join_3(d, ...l, basename_2(e)),
      w = relative(t, u);
    if (w === "" || w.startsWith("..")) return null;
    return w.split(sep_2).join("/");
  } catch {
    return null;
  }
}
//@ chunk-twq47pff.js:33708-33965 placement
function getStorageSpaceForPath(t) {
  if (t === SETTINGS_JSON) return STORAGE_SPACES.userSettings();
  let e = classifyWorkingFile(t),
    [, ...n] = t.split("/");
  switch (e) {
    case null:
      return null;
    case "claude_md":
      return STORAGE_SPACES.state("user-memory");
    case "rule":
      return STORAGE_SPACES.userConfigDir(RULES, n);
    case "output_style":
      return STORAGE_SPACES.userConfigDir(OUTPUT_STYLES, n);
  }
}
/**
 * 创建写 home 文件的函数：开关未开时抛 HOME_DEST_FLAG_OFF；启用存储 v5 时校验 home 一致并把可识别的文件原子写入存储后端（失败转为 HOME_STORAGE_* 错误码），其余走普通写入。
 */
//@ chunk-twq47pff.js:33965-34840 placement
function createHomeFileWriter({
  storageV5: storageV5,
  flagOn: flagOn,
  configHome: configHome,
  settingsToCloud: settingsToCloud = K1n,
}) {
  let guardFlag = (w) => async (v, P, E) => {
    if (!(await settingsToCloud().catch(() => !1)))
      throw le(Error("settings forwarding is not enabled for this account"), "HOME_DEST_FLAG_OFF");
    return w(v, P, E);
  };
  if (!flagOn || storageV5 === void 0) return guardFlag(en);
  let configHomeResolved = resolve_2(configHome);
  return guardFlag(async (w, v, P) => {
    if (resolve_2(w) !== configHomeResolved)
      throw le(
        Error("destination names a config home the backend does not address"),
        "HOME_DEST_HOME_MISMATCH",
      );
    let joined = relative_2(w, v).split(sep_3).join(posix.sep),
      space = getStorageSpaceForPath(joined);
    if (space === null) return en(w, v, P);
    await vetHomeDestination(w, v);
    let write = await storageV5.write(space, P, {
      publishDiscipline: "atomic",
      mode: x0r,
      precondition: { type: "none" },
      parent: "mustExist",
    });
    if (!write.ok) {
      let { error: error } = write;
      throw le(
        Error("storage backend refused the write"),
        error.code === "Failed"
          ? `HOME_STORAGE_FAILED_${error.failureClass.toUpperCase()}${error.telemetryCode === void 0 ? "" : `_${error.telemetryCode.toUpperCase()}`}`
          : `HOME_STORAGE_${error.code.toUpperCase()}`,
      );
    }
  });
}
//@ chunk-twq47pff.js:34840-34887 placement
function en(t, e, n) {
  return writeUnderSyncDir(t, e, n, "replace");
}
/**
 * 校验写入目标：名字不能被忽略，父目录真实路径必须在 config home 内，目标不能是符号链接、目录或硬链接。
 */
//@ chunk-twq47pff.js:34887-35710 placement
async function vetHomeDestination(t, e) {
  if (shouldIgnore(relative_2(t, e)))
    throw le(Error("destination name is one the lane writer ignores"), "HOME_DEST_IGNORED");
  await mkdir(t).catch((d) => {
    if (getErrnoCode(d) !== "EEXIST") throw d;
  });
  let realHome = await realpath_3(t);
  (await vetDestinationAncestors(realHome, dirname_3(e)), await mkdir(dirname_3(e), { recursive: !0 }));
  let realParent = await realpath_3(dirname_3(e));
  if (!nn({ path: realParent, directory: realHome }))
    throw le(Error("destination parent escaped the config home"), "HOME_DEST_PARENT_ESCAPE");
  if (shouldIgnore(relative_2(realHome, join_4(realParent, basename_3(e)))))
    throw le(Error("destination resolves to a name the lane writer ignores"), "HOME_DEST_IGNORED");
  try {
    let d = await lstat_2(e);
    if (d.isSymbolicLink()) throw le(Error("destination is a symlink"), "HOME_DEST_SYMLINK");
    if (d.isDirectory()) throw le(Error("destination is a directory"), "HOME_DEST_IS_DIRECTORY");
    if (d.nlink > 1) throw le(Error("destination is hard-linked elsewhere"), "HOME_DEST_HARD_LINKED");
  } catch (error) {
    if (!isENOENT(error)) throw error;
  }
}
/**
 * 从目标向上找第一个存在的祖先，确认其真实路径在 config home 内且名字不会被忽略。
 */
//@ chunk-twq47pff.js:35710-36085 placement
async function vetDestinationAncestors(t, e) {
  let n = e;
  for (;;)
    try {
      let l = await realpath_3(n);
      if (!nn({ path: l, directory: t }))
        throw le(Error("destination ancestor escaped the config home"), "HOME_DEST_PARENT_ESCAPE");
      if (shouldIgnore(relative_2(t, l)))
        throw le(
          Error("destination ancestor resolves to a name the lane writer ignores"),
          "HOME_DEST_IGNORED",
        );
      return;
    } catch (error) {
      if (getErrnoCode(error) !== "ENOENT") throw error;
      let d = dirname_3(n);
      if (d === n) throw error;
      n = d;
    }
}
//@ chunk-twq47pff.js:36085-36169 placement
function nn({ path: path, directory: directory }) {
  return path === directory || path.startsWith(directory.endsWith(sep_3) ? directory : directory + sep_3);
}
//@ chunk-twq47pff.js:36169-36204 placement
function le(t, e) {
  return ((t.code = e), t);
}

export { classifyRowError, createHomeFileWriter, resolveDestinationSpelling };
