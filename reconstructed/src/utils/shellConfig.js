/**
 * utils/shellConfig.ts
 *
 * 读取 shell 配置文件（.zshrc/.bashrc/config.fish）查找与清理 `alias claude=`；另含一个 execa 风格执行包装（误配名）。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/utils/shellConfig.ts
 * pieces: chunk-6zvphrsz.js (8)
 * attribution: affinity 1, fingerprint 4, layout 2, callgraph-witnessed 1
 */
import { homedir, homedir as homedir_2 } from "os";
import { existsSync } from "fs";
import { join, join as join_2, join as join_3 } from "path";
import { readFile, open, stat, stat as stat_2 } from "fs/promises";
import { getLocalClaudePath } from "./localInstaller.js";
import {
  isFsInaccessible,
  isEISDIR,
  isSadFsErrno,
  isEnvFsErrno,
  getErrnoCode,
  errorMessage,
} from "./errors.js";
import { logForDebugging } from "./debug.js";

//@ chunk-6zvphrsz.js:4527-4559 affinity
var CLAUDE_ALIAS_REGEX = /^\s*alias\s+claude\s*=/;
/**
 * 各 shell 的 rc 文件路径：zsh 用 $ZDOTDIR/.zshrc，bash 在 macOS 取已存在的 .bash_profile/.bash_login/.profile（另给 .bashrc），其他平台 .bashrc，fish 用 ~/.config/fish/config.fish。
 */
//@ chunk-6zvphrsz.js:4559-4900 fingerprint = getShellConfigPaths (0.661)
function getShellConfigPaths(options) {
  let r = options?.homedir ?? homedir_2(),
    n = options?.env ?? process.env,
    o = options?.platform ?? "linux",
    s = options?.fileExists ?? existsSync,
    u = n.ZDOTDIR || r,
    R =
      o === "darwin"
        ? ([".bash_profile", ".bash_login", ".profile"].find((p) => s(join_2(r, p))) ?? ".bash_profile")
        : ".bashrc";
  return {
    zsh: join_2(u, ".zshrc"),
    bash: join_2(r, R),
    ...(o === "darwin" && { bashrc: join_2(r, ".bashrc") }),
    fish: join_2(r, ".config/fish/config.fish"),
  };
}
/**
 * 从 rc 文件行中去掉指向本地安装 claude 的 alias claude=… 行，返回 {filtered, hadAlias}；安装器/迁移用。
 */
//@ chunk-6zvphrsz.js:4900-5149 fingerprint = filterClaudeAliases (1)
function filterClaudeAliases(lines) {
  let r = !1;
  return {
    filtered: lines.filter((line) => {
      if (CLAUDE_ALIAS_REGEX.test(line)) {
        let match = line.match(/alias\s+claude\s*=\s*["']([^"']+)["']/);
        if (!match) match = line.match(/alias\s+claude\s*=\s*([^#\n]+)/);
        if (match && match[1]) {
          if (match[1].trim() === getLocalClaudePath()) return ((r = !0), !1);
        }
      }
      return !0;
    }),
    hadAlias: r,
  };
}
/**
 * 读文件并按行切分；文件不存在返回 null，是目录时告警并返回 null，其他错误抛出。
 */
//@ chunk-6zvphrsz.js:5149-5339 layout
async function readFileLinesOrNull(e) {
  try {
    return (await readFile(e, { encoding: "utf8" })).split(`
`);
  } catch (error) {
    if (isFsInaccessible(error)) return null;
    if (isEISDIR(error))
      return (logForDebugging(`Skipping ${e}: path is a directory`, { level: "warn" }), null);
    throw error;
  }
}
/**
 * 把行数组写回文件并 datasync。
 */
//@ chunk-6zvphrsz.js:5339-5482 fingerprint = writeFileLines (1)
async function writeFileLines(filePath, lines) {
  let fh = await open(filePath, "w");
  try {
    (await fh.writeFile(
      lines.join(`
`),
      { encoding: "utf8" },
    ),
      await fh.datasync());
  } finally {
    await fh.close();
  }
}
//@ chunk-6zvphrsz.js:5482-5614 layout
var UNREADABLE_CONFIG_ERROR_CODES = new Set([
  "EBUSY",
  "EOPNOTSUPP",
  "ENOTSUP",
  "ENOMEM",
  "ERR_FS_FILE_TOO_LARGE",
  "ENOTCONN",
  "EHOSTDOWN",
  "EHOSTUNREACH",
  "ETIMEDOUT",
]);
/**
 * 在 zsh/bash/fish 配置文件里查找 `alias claude=` 的目标；读不了的文件记日志跳过。
 */
//@ chunk-6zvphrsz.js:5614-5981 callgraph-witnessed = findClaudeAlias (0)
async function findClaudeAlias(options) {
  let configs = getShellConfigPaths(options);
  for (let configPath of Object.values(configs)) {
    let o = await readFileLinesOrNull(configPath).catch((s) => {
      if (isSadFsErrno(s) || isEnvFsErrno(s) || UNREADABLE_CONFIG_ERROR_CODES.has(getErrnoCode(s) ?? ""))
        return (
          logForDebugging(
            `Skipping unreadable shell config ${configPath} during alias scan: ${errorMessage(s)}`,
            { level: "warn" },
          ),
          null
        );
      throw s;
    });
    if (!o) continue;
    for (let line of o)
      if (CLAUDE_ALIAS_REGEX.test(line)) {
        let match = line.match(/alias\s+claude=["']?([^"'\s]+)/);
        if (match && match[1]) return match[1];
      }
  }
  return null;
}
/**
 * 在 rc 文件中找 claude 别名，展开 ~ 后目标存在（文件或符号链接）才返回别名目标。
 */
//@ chunk-6zvphrsz.js:5981-6186 fingerprint = findValidClaudeAlias (1)
async function findValidClaudeAlias(options) {
  let aliasTarget = await findClaudeAlias(options);
  if (!aliasTarget) return null;
  let home = options?.homedir ?? homedir_2(),
    expandedPath = aliasTarget.startsWith("~") ? aliasTarget.replace("~", home) : aliasTarget;
  try {
    let stats = await stat_2(expandedPath);
    if (stats.isFile() || stats.isSymbolicLink()) return aliasTarget;
  } catch {}
  return null;
}

export {
  getShellConfigPaths,
  readFileLinesOrNull,
  filterClaudeAliases,
  writeFileLines,
  findClaudeAlias,
  findValidClaudeAlias,
};
