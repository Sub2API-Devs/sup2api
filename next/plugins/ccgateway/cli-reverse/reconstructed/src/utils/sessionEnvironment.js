/**
 * utils/sessionEnvironment.ts
 *
 * Bash 会话环境脚本：CLAUDE_ENV_FILE 与 session-env 目录下各 hook 写入的 env 文件。
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/utils/sessionEnvironment.ts
 * pieces: chunk-pc3x100t.js (1), chunk-rmva59md.js (14)
 * attribution: fingerprint 6, placement 4, layout 4, file-local 1
 */
import { join } from "path";
import { readdir, writeFile, readFile } from "fs/promises";
import { HostScoped } from "./hostScoped.js";
import { getRootSession, getSessionId } from "../bootstrap/state.js";
import { getClaudeConfigDir } from "./markdownConfigLoader.js";
import { getFsImplementation } from "./fsOperations.js";
import { STORAGE_SPACES } from "./storage/storageSpaces.js";
import { isStorageV5Enabled } from "./hoverRest.js";
import { logForDebugging } from "./debug.js";
import { formatStorageError } from "./storage/storageErrors.js";
import { getErrnoCode, errorMessage } from "./errors.js";
import { env } from "./env.js";
import { getPlatform } from "./platform.js";
import { cleanupOldFilesInDirectory } from "./cleanup.js";
import { deferInit } from "../../runtime/deferred-init.js";

//@ chunk-rmva59md.js:646-765 placement
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
//@ chunk-rmva59md.js:765-788 placement
var sessionEnvScriptSlot; // deferred: uses SessionEnvScriptSlot of its import cycle while loading; runs once the cycle is complete
deferInit("chunk-rmva59md.js:765", () => {
  sessionEnvScriptSlot = new HostScoped(() => new SessionEnvScriptSlot());
});
//@ chunk-rmva59md.js:788-823 placement
function sessionEnvScript() {
  return sessionEnvScriptSlot.of(getRootSession().host);
}
//@ chunk-rmva59md.js:823-906 placement
async function sessionEnvDir(sessionId = getSessionId()) {
  let dir = join(getClaudeConfigDir(), "session-env", sessionId);
  await getFsImplementation().mkdir(dir);
  return dir;
}
//@ chunk-rmva59md.js:906-967 layout
function getSessionEnvKey(sessionId, name) {
  return STORAGE_SPACES.userConfigDir("session-env", [sessionId, name]);
}
//@ chunk-rmva59md.js:967-1333 layout
async function listSessionEnvFilesViaStorage(storage, sessionId) {
  let names = [];
  let cursor;
  do {
    let page = await storage.listEntries(
      {
        namespace: "userConfigDir",
        dir: "session-env",
        relPath: [sessionId],
      },
      cursor === undefined
        ? undefined
        : {
            cursor,
          },
    );
    if (!page.ok)
      return {
        error: page.error,
      };
    for (let item of page.value.items) {
      if (item.kind !== "key" || item.key.namespace !== "userConfigDir") continue;
      let last = item.key.relPath.at(-1);
      if (last !== undefined) names.push(last);
    }
    cursor = page.value.cursor;
  } while (cursor !== undefined);
  return names;
}
//@ chunk-rmva59md.js:1333-1422 fingerprint (2.1.88 match: getHookEnvFilePath, 1)
async function getHookEnvFilePath(hookEvent, hookIndex, sessionId) {
  let prefix = hookEvent.toLowerCase();
  return join(await sessionEnvDir(sessionId), `${prefix}-hook-${hookIndex}.sh`);
}
//@ chunk-rmva59md.js:1422-2079 fingerprint (2.1.88 match: clearCwdEnvFiles, 0.852)
async function clearCwdEnvFiles(storage) {
  if (isStorageV5Enabled() && storage !== undefined) {
    let sessionId = getSessionId();
    let names = await listSessionEnvFilesViaStorage(storage, sessionId);
    if (!Array.isArray(names)) {
      logForDebugging(`Failed to clear cwd env files: ${formatStorageError(names.error)}`);
      return;
    }
    let filtered = names.filter(
      (name) =>
        (name.startsWith("filechanged-hook-") || name.startsWith("cwdchanged-hook-")) &&
        HOOK_ENV_NAME_RE.test(name),
    );
    let results = await Promise.all(
      filtered.map((name) =>
        storage.write(getSessionEnvKey(sessionId, name), "", {
          publishDiscipline: "inPlace",
        }),
      ),
    );
    for (let result of results)
      if (!result.ok) logForDebugging(`Failed to clear cwd env files: ${formatStorageError(result.error)}`);
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
  } catch (error) {
    if (getErrnoCode(error) !== "ENOENT")
      logForDebugging(`Failed to clear cwd env files: ${errorMessage(error)}`);
  }
}
//@ chunk-rmva59md.js:2079-2149 fingerprint (2.1.88 match: invalidateSessionEnvCache, 0.876)
function invalidateSessionEnvCache() {
  logForDebugging("Invalidating session environment cache");
  sessionEnvScript().reset();
}
//@ chunk-rmva59md.js:2149-3766 fingerprint (2.1.88 match: getSessionEnvironmentScript, 0.911)
/**
 * 组装 Bash 工具的会话环境脚本：CLAUDE_ENV_FILE 与 session-env 目录下各 hook 写入的 env 文件（按 setup/sessionstart/cwdchanged/filechanged 顺序）。
 */
async function getSessionEnvironmentScript(storage) {
  let sessionId = getSessionId();
  let cache = sessionEnvScript();
  if (cache.script !== undefined && cache.owner === sessionId) return cache.script;
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
  if (isStorageV5Enabled() && storage !== undefined) {
    let names = await listSessionEnvFilesViaStorage(storage, sessionId);
    if (!Array.isArray(names))
      logForDebugging(`Failed to load session environment from hooks: ${formatStorageError(names.error)}`);
    else {
      let sorted = names.filter((name) => HOOK_ENV_NAME_RE.test(name)).sort(sortHookEnvFiles);
      if (sorted.length > 0) {
        let results = await Promise.all(
          sorted.map((name) => storage.read([getSessionEnvKey(sessionId, name)])),
        );
        for (let j = 0; j < sorted.length; j++) {
          let result = results[j];
          if (!result.ok) {
            logForDebugging(`Failed to read hook file ${sorted[j]}: ${formatStorageError(result.error)}`);
            continue;
          }
          let item = result.value.items[0];
          if (!item?.found) continue;
          let trimmed = Buffer.from(item.value).toString("utf-8").trim();
          if (trimmed) scripts.push(trimmed);
        }
        logForDebugging(`Session environment loaded from ${sorted.length} hook file(s)`);
      }
    }
    if (scripts.length === 0) {
      logForDebugging("No session environment scripts found");
      cache.store(null, sessionId);
      return null;
    }
    let joined = scripts.join(`
`);
    cache.store(joined, sessionId);
    logForDebugging(`Session environment script ready (${joined.length} chars total)`);
    return joined;
  }
  try {
    let sessionEnvDir_2 = await sessionEnvDir();
    let hookFiles = (await readdir(sessionEnvDir_2))
      .filter((name) => HOOK_ENV_NAME_RE.test(name))
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
    cache.store(null, sessionId);
    return null;
  }
  let joined = scripts.join(`
`);
  cache.store(joined, sessionId);
  logForDebugging(`Session environment script ready (${joined.length} chars total)`);
  return joined;
}
//@ chunk-rmva59md.js:3766-3935 layout
var PLAIN_ASSIGNMENT_RE =
  /^(?:\s*(?:#.*)?|(?:export +|declare -x +)?([A-Za-z_]\w*)=((?:[\w@%+=:,./-]|'[^'\0]*'|"(?:[^"\\$`\0]|\\[^\0])*")*))$/;
var QUOTED_SEGMENT_RE = /'([^']*)'|"((?:[^"\\]|\\.)*)"/g;
var PATH_SEPARATOR_RE = /[/\\]/;
//@ chunk-rmva59md.js:3935-4306 layout
/**
 * 把会话环境脚本解析为变量表：每行必须是纯赋值（可带 export/declare -x 与引号），否则放弃返回空表；Windows 上含路径分隔符的值会被删除。
 */
async function parseSessionEnvironment(storage) {
  let sessionEnvironmentScript = await getSessionEnvironmentScript(storage);
  let env = new Map();
  for (let line of sessionEnvironmentScript?.split(`
`) ?? []) {
    let match = PLAIN_ASSIGNMENT_RE.exec(line.trimEnd());
    if (match === null) {
      logForDebugging("Session environment is not all plain assignments");
      return new Map();
    }
    let [, name, rawValue] = match;
    if (name === undefined || rawValue === undefined) continue;
    let replaced = rawValue.replace(
      QUOTED_SEGMENT_RE,
      (match, doubled, quoted) => doubled ?? quoted?.replace(/\\([$`"\\])/g, "$1") ?? "",
    );
    if (getPlatform() === "windows" && PATH_SEPARATOR_RE.test(replaced)) env.delete(name);
    else env.set(name, replaced);
  }
  return env;
}
//@ chunk-rmva59md.js:4306-4429 fingerprint (2.1.88 match: HOOK_ENV_PRIORITY, 1)
var HOOK_ENV_PRIORITY = {
  setup: 0,
  sessionstart: 1,
  cwdchanged: 2,
  filechanged: 3,
};
var HOOK_ENV_NAME_RE = /^(setup|sessionstart|cwdchanged|filechanged)-hook-(\d+)\.sh$/;
//@ chunk-rmva59md.js:4429-4607 file-local
function sortHookEnvFiles(fileA, fileB) {
  let aMatch = fileA.match(HOOK_ENV_NAME_RE);
  let bMatch = fileB.match(HOOK_ENV_NAME_RE);
  let aType = aMatch?.[1] || "";
  let bType = bMatch?.[1] || "";
  if (aType !== bType) return (HOOK_ENV_PRIORITY[aType] ?? 99) - (HOOK_ENV_PRIORITY[bType] ?? 99);
  let aIndex = parseInt(aMatch?.[2] || "0", 10);
  let bIndex = parseInt(bMatch?.[2] || "0", 10);
  return aIndex - bIndex;
}
//@ chunk-pc3x100t.js:22982-23020 fingerprint (2.1.88 match: getSessionEnvDirPath, 0.858)
function getSessionEnvDirPath() {
  return cleanupOldFilesInDirectory("session-env");
}
export {
  invalidateSessionEnvCache,
  getSessionEnvDirPath,
  parseSessionEnvironment,
  getHookEnvFilePath,
  getSessionEnvironmentScript,
  clearCwdEnvFiles,
};
