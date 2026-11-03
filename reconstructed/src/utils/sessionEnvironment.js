/**
 * utils/sessionEnvironment.ts
 *
 * Bash 会话环境脚本：CLAUDE_ENV_FILE 与 session-env 目录下各 hook 写入的 env 文件。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/utils/sessionEnvironment.ts
 * pieces: chunk-23fm9f0d.js (1), chunk-e6aww6q8.js (14)
 * attribution: fingerprint 6, placement 4, layout 4, file-local 1
 */
import {
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
import {
  readdir,
  readdir as readdir_2,
  readdir as readdir_3,
  readdir as readdir_4,
  readdir as readdir_5,
  readdir as readdir_6,
  readdir as readdir_7,
  readdir as readdir_8,
  readdir as readdir_9,
  readdir as readdir_10,
  readdir as readdir_11,
  readdir as readdir_12,
  readdir as readdir_13,
  readdir as readdir_14,
  readdir as readdir_15,
  readdir as readdir_16,
  readdir as readdir_17,
  readdir as readdir_18,
  readdir as readdir_19,
  readdir as readdir_20,
  readdir as readdir_21,
  readdir as readdir_22,
  readdir as readdir_23,
  readdir as readdir_24,
  readdir as readdir_25,
  readdir as readdir_26,
  readdir as readdir_27,
  readdir as readdir_28,
  readdir as readdir_29,
  readdir as readdir_30,
  readdir as readdir_31,
  readdir as readdir_32,
  writeFile,
  writeFile as writeFile_2,
  writeFile as writeFile_3,
  writeFile as writeFile_4,
  writeFile as writeFile_5,
  writeFile as writeFile_6,
  writeFile as writeFile_7,
  writeFile as writeFile_8,
  writeFile as writeFile_9,
  writeFile as writeFile_10,
  writeFile as writeFile_11,
  writeFile as writeFile_12,
  writeFile as writeFile_13,
  writeFile as writeFile_14,
  writeFile as writeFile_15,
  writeFile as writeFile_16,
  writeFile as writeFile_17,
  writeFile as writeFile_18,
  readFile,
  readFile as readFile_2,
  readFile as readFile_3,
  readFile as readFile_4,
  readFile as readFile_5,
  readFile as readFile_6,
  readFile as readFile_7,
  readFile as readFile_8,
  readFile as readFile_9,
  readFile as readFile_10,
  readFile as readFile_11,
  readFile as readFile_12,
  readFile as readFile_13,
  readFile as readFile_14,
  readFile as readFile_15,
  readFile as readFile_16,
  readFile as readFile_17,
  readFile as readFile_18,
  readFile as readFile_19,
} from "fs/promises";
import { HostScoped } from "./hostScoped.js";
import { getRootSession, getSessionId } from "../bootstrap/state.js";
import { getClaudeConfigDir } from "./envUtils.js";
import { getFsImplementation } from "./fsOperations.js";
import { STORAGE_SPACES } from "./storage/storageSpaces.js";
import { isStorageV5Enabled } from "./hoverRest.js";
import { logForDebugging } from "./debug.js";
import { formatStorageError } from "./storage/storageErrors.js";
import { getErrnoCode, errorMessage } from "./errors.js";
import { env } from "./env.js";
import { getPlatform } from "./platform.js";
import { cleanupOldFilesInDirectory } from "./cleanup.js";

//@ chunk-e6aww6q8.js:824835-824956 placement
class SessionEnvScriptSlot {
  script = void 0;
  owner = void 0;
  store(e, n) {
    ((this.script = e), (this.owner = n));
  }
  reset() {
    ((this.script = void 0), (this.owner = void 0));
  }
}
//@ chunk-e6aww6q8.js:824956-824983 placement
var pRo = new HostScoped(() => new SessionEnvScriptSlot());
//@ chunk-e6aww6q8.js:824983-825022 placement
function aHt() {
  return pRo.of(getRootSession().host);
}
//@ chunk-e6aww6q8.js:825022-825109 placement
async function OWe(e = getSessionId()) {
  let n = join_36(getClaudeConfigDir(), "session-env", e);
  return (await getFsImplementation().mkdir(n), n);
}
//@ chunk-e6aww6q8.js:825109-825172 layout
function getSessionEnvKey(e, n) {
  return STORAGE_SPACES.userConfigDir("session-env", [e, n]);
}
//@ chunk-e6aww6q8.js:825172-825540 layout
async function listSessionEnvFilesViaStorage(e, n) {
  let r = [],
    s;
  do {
    let listEntries = await e.listEntries(
      { namespace: "userConfigDir", dir: "session-env", relPath: [n] },
      s === void 0 ? void 0 : { cursor: s },
    );
    if (!listEntries.ok) return { error: listEntries.error };
    for (let item of listEntries.value.items) {
      if (item.kind !== "key" || item.key.namespace !== "userConfigDir") continue;
      let at = item.key.relPath.at(-1);
      if (at !== void 0) r.push(at);
    }
    s = listEntries.value.cursor;
  } while (s !== void 0);
  return r;
}
//@ chunk-e6aww6q8.js:825540-825633 fingerprint = getHookEnvFilePath (1)
async function getHookEnvFilePath(e, n, r) {
  let prefix = e.toLowerCase();
  return join_36(await OWe(r), `${prefix}-hook-${n}.sh`);
}
//@ chunk-e6aww6q8.js:825633-826304 fingerprint = clearCwdEnvFiles (0.852)
async function clearCwdEnvFiles(e) {
  if (isStorageV5Enabled() && e !== void 0) {
    let n = getSessionId(),
      r = await listSessionEnvFilesViaStorage(e, n);
    if (!Array.isArray(r)) {
      logForDebugging(`Failed to clear cwd env files: ${formatStorageError(r.error)}`);
      return;
    }
    let filtered = r.filter(
        (y) => (y.startsWith("filechanged-hook-") || y.startsWith("cwdchanged-hook-")) && Mz.test(y),
      ),
      results = await Promise.all(
        filtered.map((y) => e.write(getSessionEnvKey(n, y), "", { publishDiscipline: "inPlace" })),
      );
    for (let y of results)
      if (!y.ok) logForDebugging(`Failed to clear cwd env files: ${formatStorageError(y.error)}`);
    return;
  }
  try {
    let dir = await OWe(),
      files = await readdir_15(dir);
    await Promise.all(
      files
        .filter((s) => (s.startsWith("filechanged-hook-") || s.startsWith("cwdchanged-hook-")) && Mz.test(s))
        .map((s) => writeFile_7(join_36(dir, s), "")),
    );
  } catch (error) {
    if (getErrnoCode(error) !== "ENOENT")
      logForDebugging(`Failed to clear cwd env files: ${errorMessage(error)}`);
  }
}
//@ chunk-e6aww6q8.js:826304-826376 fingerprint = invalidateSessionEnvCache (0.876)
function invalidateSessionEnvCache() {
  (logForDebugging("Invalidating session environment cache"), aHt().reset());
}
/**
 * 组装 Bash 工具的会话环境脚本：CLAUDE_ENV_FILE 与 session-env 目录下各 hook 写入的 env 文件（按 setup/sessionstart/cwdchanged/filechanged 顺序）。
 */
//@ chunk-e6aww6q8.js:826376-828021 fingerprint = getSessionEnvironmentScript (0.911)
async function getSessionEnvironmentScript(e) {
  let n = getSessionId(),
    r = aHt();
  if (r.script !== void 0 && r.owner === n) return r.script;
  let scripts = [],
    envFile = env.CLAUDE_ENV_FILE;
  if (envFile)
    try {
      let envScript = (await readFile_7(envFile, "utf8")).trim();
      if (envScript)
        (scripts.push(envScript),
          logForDebugging(
            `Session environment loaded from CLAUDE_ENV_FILE: ${envFile} (${envScript.length} chars)`,
          ));
    } catch (error) {
      if (getErrnoCode(error) !== "ENOENT")
        logForDebugging(`Failed to read CLAUDE_ENV_FILE: ${errorMessage(error)}`);
    }
  if (isStorageV5Enabled() && e !== void 0) {
    let S = await listSessionEnvFilesViaStorage(e, n);
    if (!Array.isArray(S))
      logForDebugging(`Failed to load session environment from hooks: ${formatStorageError(S.error)}`);
    else {
      let sorted = S.filter((G) => Mz.test(G)).sort(sortHookEnvFiles);
      if (sorted.length > 0) {
        let results = await Promise.all(sorted.map((q) => e.read([getSessionEnvKey(n, q)])));
        for (let q = 0; q < sorted.length; q++) {
          let Z = results[q];
          if (!Z.ok) {
            logForDebugging(`Failed to read hook file ${sorted[q]}: ${formatStorageError(Z.error)}`);
            continue;
          }
          let Se = Z.value.items[0];
          if (!Se?.found) continue;
          let trimmed = Buffer.from(Se.value).toString("utf-8").trim();
          if (trimmed) scripts.push(trimmed);
        }
        logForDebugging(`Session environment loaded from ${sorted.length} hook file(s)`);
      }
    }
    if (scripts.length === 0)
      return (logForDebugging("No session environment scripts found"), r.store(null, n), null);
    let joined = scripts.join(`
`);
    return (
      r.store(joined, n),
      logForDebugging(`Session environment script ready (${joined.length} chars total)`),
      joined
    );
  }
  try {
    let sessionEnvDir = await OWe(),
      hookFiles = (await readdir_15(sessionEnvDir)).filter((G) => Mz.test(G)).sort(sortHookEnvFiles);
    for (let file of hookFiles) {
      let filePath = join_36(sessionEnvDir, file);
      try {
        let content = (await readFile_7(filePath, "utf8")).trim();
        if (content) scripts.push(content);
      } catch (error) {
        if (getErrnoCode(error) !== "ENOENT")
          logForDebugging(`Failed to read hook file ${filePath}: ${errorMessage(error)}`);
      }
    }
    if (hookFiles.length > 0)
      logForDebugging(`Session environment loaded from ${hookFiles.length} hook file(s)`);
  } catch (error) {
    if (getErrnoCode(error) !== "ENOENT")
      logForDebugging(`Failed to load session environment from hooks: ${errorMessage(error)}`);
  }
  if (scripts.length === 0)
    return (logForDebugging("No session environment scripts found"), r.store(null, n), null);
  let joined = scripts.join(`
`);
  return (
    r.store(joined, n),
    logForDebugging(`Session environment script ready (${joined.length} chars total)`),
    joined
  );
}
//@ chunk-e6aww6q8.js:828021-828196 layout
var PLAIN_ASSIGNMENT_RE =
    /^(?:\s*(?:#.*)?|(?:export +|declare -x +)?([A-Za-z_]\w*)=((?:[\w@%+=:,./-]|'[^'\0]*'|"(?:[^"\\$`\0]|\\[^\0])*")*))$/,
  QUOTED_SEGMENT_RE = /'([^']*)'|"((?:[^"\\]|\\.)*)"/g,
  PATH_SEPARATOR_RE = /[/\\]/;
/**
 * 把会话环境脚本解析为变量表：每行必须是纯赋值（可带 export/declare -x 与引号），否则放弃返回空表；Windows 上含路径分隔符的值会被删除。
 */
//@ chunk-e6aww6q8.js:828196-828573 layout
async function parseSessionEnvironment(e) {
  let n = await getSessionEnvironmentScript(e),
    r = new Map();
  for (let s of n?.split(`
`) ?? []) {
    let match = PLAIN_ASSIGNMENT_RE.exec(s.trimEnd());
    if (match === null)
      return (logForDebugging("Session environment is not all plain assignments"), new Map());
    let [, y, S] = match;
    if (y === void 0 || S === void 0) continue;
    let replaced = S.replace(QUOTED_SEGMENT_RE, (L, G, q) => G ?? q?.replace(/\\([$`"\\])/g, "$1") ?? "");
    if (getPlatform() === "windows" && PATH_SEPARATOR_RE.test(replaced)) r.delete(y);
    else r.set(y, replaced);
  }
  return r;
}
//@ chunk-e6aww6q8.js:828573-828699 fingerprint = HOOK_ENV_PRIORITY (1)
var HOOK_ENV_PRIORITY = { setup: 0, sessionstart: 1, cwdchanged: 2, filechanged: 3 },
  Mz = /^(setup|sessionstart|cwdchanged|filechanged)-hook-(\d+)\.sh$/;
//@ chunk-e6aww6q8.js:828699-828885 file-local
function sortHookEnvFiles(a, b) {
  let aMatch = a.match(Mz),
    bMatch = b.match(Mz),
    h = aMatch?.[1] || "",
    y = bMatch?.[1] || "";
  if (h !== y) return (HOOK_ENV_PRIORITY[h] ?? 99) - (HOOK_ENV_PRIORITY[y] ?? 99);
  let aIndex = parseInt(aMatch?.[2] || "0", 10),
    bIndex = parseInt(bMatch?.[2] || "0", 10);
  return aIndex - bIndex;
}
//@ chunk-23fm9f0d.js:22931-22969 fingerprint = getSessionEnvDirPath (0.858)
function getSessionEnvDirPath() {
  return cleanupOldFilesInDirectory("session-env");
}

export {
  invalidateSessionEnvCache,
  getSessionEnvDirPath,
  getHookEnvFilePath,
  getSessionEnvironmentScript,
  clearCwdEnvFiles,
  parseSessionEnvironment,
};
