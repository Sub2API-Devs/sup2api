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
import { join } from "path";
import { readdir, writeFile, readFile } from "fs/promises";
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
  script = undefined;
  owner = undefined;
  store(script, owner) {
    this.script = script;
    this.owner = owner;
  }
  reset() {
    this.script = undefined;
    this.owner = undefined;
  }
}
//@ chunk-e6aww6q8.js:824956-824983 placement
var sessionEnvScriptSlot = new HostScoped(() => new SessionEnvScriptSlot());
//@ chunk-e6aww6q8.js:824983-825022 placement
function sessionEnvScript() {
  return sessionEnvScriptSlot.of(getRootSession().host);
}
//@ chunk-e6aww6q8.js:825022-825109 placement
async function sessionEnvDir(e = getSessionId()) {
  let n = join(getClaudeConfigDir(), "session-env", e);
  await getFsImplementation().mkdir(n);
  return n;
}
//@ chunk-e6aww6q8.js:825109-825172 layout
function getSessionEnvKey(sessionId, n) {
  return STORAGE_SPACES.userConfigDir("session-env", [sessionId, n]);
}
//@ chunk-e6aww6q8.js:825172-825540 layout
async function listSessionEnvFilesViaStorage(e, sessionId) {
  let r = [];
  let s;
  do {
    let h = await e.listEntries(
      {
        namespace: "userConfigDir",
        dir: "session-env",
        relPath: [sessionId],
      },
      s === undefined
        ? undefined
        : {
            cursor: s,
          },
    );
    if (!h.ok)
      return {
        error: h.error,
      };
    for (let item of h.value.items) {
      if (item.kind !== "key" || item.key.namespace !== "userConfigDir") continue;
      let last = item.key.relPath.at(-1);
      if (last !== undefined) r.push(last);
    }
    s = h.value.cursor;
  } while (s !== undefined);
  return r;
}
//@ chunk-e6aww6q8.js:825540-825633 fingerprint = getHookEnvFilePath (1)
async function getHookEnvFilePath(hookEvent, hookIndex, envFileSessionId) {
  let prefix = hookEvent.toLowerCase();
  return join(await sessionEnvDir(envFileSessionId), `${prefix}-hook-${hookIndex}.sh`);
}
//@ chunk-e6aww6q8.js:825633-826304 fingerprint = clearCwdEnvFiles (0.852)
async function clearCwdEnvFiles(e) {
  if (isStorageV5Enabled() && e !== undefined) {
    let sessionId = getSessionId();
    let r = await listSessionEnvFilesViaStorage(e, sessionId);
    if (!Array.isArray(r)) {
      logForDebugging(`Failed to clear cwd env files: ${formatStorageError(r.error)}`);
      return;
    }
    let filtered = r.filter(
      (y) =>
        (y.startsWith("filechanged-hook-") || y.startsWith("cwdchanged-hook-")) && HOOK_ENV_NAME_RE.test(y),
    );
    let results = await Promise.all(
      filtered.map((y) =>
        e.write(getSessionEnvKey(sessionId, y), "", {
          publishDiscipline: "inPlace",
        }),
      ),
    );
    for (let y of results)
      if (!y.ok) logForDebugging(`Failed to clear cwd env files: ${formatStorageError(y.error)}`);
    return;
  }
  try {
    let dir = await sessionEnvDir();
    let files = await readdir(dir);
    await Promise.all(
      files
        .filter(
          (file) =>
            (file.startsWith("filechanged-hook-") || file.startsWith("cwdchanged-hook-")) &&
            HOOK_ENV_NAME_RE.test(file),
        )
        .map((file) => writeFile(join(dir, file), "")),
    );
  } catch (e) {
    if (getErrnoCode(e) !== "ENOENT") logForDebugging(`Failed to clear cwd env files: ${errorMessage(e)}`);
  }
}
//@ chunk-e6aww6q8.js:826304-826376 fingerprint = invalidateSessionEnvCache (0.876)
function invalidateSessionEnvCache() {
  logForDebugging("Invalidating session environment cache");
  sessionEnvScript().reset();
}
//@ chunk-e6aww6q8.js:826376-828021 fingerprint = getSessionEnvironmentScript (0.911)
/**
 * 组装 Bash 工具的会话环境脚本：CLAUDE_ENV_FILE 与 session-env 目录下各 hook 写入的 env 文件（按 setup/sessionstart/cwdchanged/filechanged 顺序）。
 */
async function getSessionEnvironmentScript(e) {
  let sessionId = getSessionId();
  let r = sessionEnvScript();
  if (r.script !== undefined && r.owner === sessionId) return r.script;
  let scripts = [];
  let envFile = env.CLAUDE_ENV_FILE;
  if (envFile)
    try {
      let envScript = (await readFile(envFile, "utf8")).trim();
      if (envScript) {
        scripts.push(envScript);
        logForDebugging(
          `Session environment loaded from CLAUDE_ENV_FILE: ${envFile} (${envScript.length} chars)`,
        );
      }
    } catch (e) {
      if (getErrnoCode(e) !== "ENOENT") logForDebugging(`Failed to read CLAUDE_ENV_FILE: ${errorMessage(e)}`);
    }
  if (isStorageV5Enabled() && e !== undefined) {
    let S = await listSessionEnvFilesViaStorage(e, sessionId);
    if (!Array.isArray(S))
      logForDebugging(`Failed to load session environment from hooks: ${formatStorageError(S.error)}`);
    else {
      let sorted = S.filter((G) => HOOK_ENV_NAME_RE.test(G)).sort(sortHookEnvFiles);
      if (sorted.length > 0) {
        let results = await Promise.all(sorted.map((q) => e.read([getSessionEnvKey(sessionId, q)])));
        for (let idx = 0; idx < sorted.length; idx++) {
          let Z = results[idx];
          if (!Z.ok) {
            logForDebugging(`Failed to read hook file ${sorted[idx]}: ${formatStorageError(Z.error)}`);
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
    if (scripts.length === 0) {
      logForDebugging("No session environment scripts found");
      r.store(null, sessionId);
      return null;
    }
    let joined = scripts.join(`
`);
    r.store(joined, sessionId);
    logForDebugging(`Session environment script ready (${joined.length} chars total)`);
    return joined;
  }
  try {
    let sessionEnvDir_2 = await sessionEnvDir();
    let hookFiles = (await readdir(sessionEnvDir_2))
      .filter((G) => HOOK_ENV_NAME_RE.test(G))
      .sort(sortHookEnvFiles);
    for (let file of hookFiles) {
      let filePath = join(sessionEnvDir_2, file);
      try {
        let content = (await readFile(filePath, "utf8")).trim();
        if (content) scripts.push(content);
      } catch (e) {
        if (getErrnoCode(e) !== "ENOENT")
          logForDebugging(`Failed to read hook file ${filePath}: ${errorMessage(e)}`);
      }
    }
    if (hookFiles.length > 0)
      logForDebugging(`Session environment loaded from ${hookFiles.length} hook file(s)`);
  } catch (e) {
    if (getErrnoCode(e) !== "ENOENT")
      logForDebugging(`Failed to load session environment from hooks: ${errorMessage(e)}`);
  }
  if (scripts.length === 0) {
    logForDebugging("No session environment scripts found");
    r.store(null, sessionId);
    return null;
  }
  let joined = scripts.join(`
`);
  r.store(joined, sessionId);
  logForDebugging(`Session environment script ready (${joined.length} chars total)`);
  return joined;
}
//@ chunk-e6aww6q8.js:828021-828196 layout
var PLAIN_ASSIGNMENT_RE =
  /^(?:\s*(?:#.*)?|(?:export +|declare -x +)?([A-Za-z_]\w*)=((?:[\w@%+=:,./-]|'[^'\0]*'|"(?:[^"\\$`\0]|\\[^\0])*")*))$/;
var QUOTED_SEGMENT_RE = /'([^']*)'|"((?:[^"\\]|\\.)*)"/g;
var PATH_SEPARATOR_RE = /[/\\]/;
//@ chunk-e6aww6q8.js:828196-828573 layout
/**
 * 把会话环境脚本解析为变量表：每行必须是纯赋值（可带 export/declare -x 与引号），否则放弃返回空表；Windows 上含路径分隔符的值会被删除。
 */
async function parseSessionEnvironment(storageV5) {
  let sessionEnvironmentScript = await getSessionEnvironmentScript(storageV5);
  let r = new Map();
  for (let s of sessionEnvironmentScript?.split(`
`) ?? []) {
    let match = PLAIN_ASSIGNMENT_RE.exec(s.trimEnd());
    if (match === null) {
      logForDebugging("Session environment is not all plain assignments");
      return new Map();
    }
    let [, y, S] = match;
    if (y === undefined || S === undefined) continue;
    let replaced = S.replace(QUOTED_SEGMENT_RE, (L, G, q) => G ?? q?.replace(/\\([$`"\\])/g, "$1") ?? "");
    if (getPlatform() === "windows" && PATH_SEPARATOR_RE.test(replaced)) r.delete(y);
    else r.set(y, replaced);
  }
  return r;
}
//@ chunk-e6aww6q8.js:828573-828699 fingerprint = HOOK_ENV_PRIORITY (1)
var HOOK_ENV_PRIORITY = {
  setup: 0,
  sessionstart: 1,
  cwdchanged: 2,
  filechanged: 3,
};
var HOOK_ENV_NAME_RE = /^(setup|sessionstart|cwdchanged|filechanged)-hook-(\d+)\.sh$/;
//@ chunk-e6aww6q8.js:828699-828885 file-local
function sortHookEnvFiles(a, b) {
  let aMatch = a.match(HOOK_ENV_NAME_RE);
  let bMatch = b.match(HOOK_ENV_NAME_RE);
  let aType = aMatch?.[1] || "";
  let bType = bMatch?.[1] || "";
  if (aType !== bType) return (HOOK_ENV_PRIORITY[aType] ?? 99) - (HOOK_ENV_PRIORITY[bType] ?? 99);
  let aIndex = parseInt(aMatch?.[2] || "0", 10);
  let bIndex = parseInt(bMatch?.[2] || "0", 10);
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
