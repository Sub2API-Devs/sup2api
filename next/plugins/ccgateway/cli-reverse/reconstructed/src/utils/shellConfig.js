/**
 * utils/shellConfig.ts
 *
 * 读取 shell 配置文件（.zshrc/.bashrc/config.fish）查找与清理 `alias claude=`；另含一个 execa 风格执行包装（误配名）。
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/utils/shellConfig.ts
 * pieces: chunk-wzyv38y8.js (8)
 * attribution: affinity 1, fingerprint 4, layout 2, callgraph-witnessed 1
 */
import { homedir } from "os";
import { existsSync } from "fs";
import { join } from "path";
import { readFile, open, stat } from "fs/promises";
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
import { deferInit } from "../../runtime/deferred-init.js";

//@ chunk-wzyv38y8.js:4593-4625 affinity
var CLAUDE_ALIAS_REGEX = /^\s*alias\s+claude\s*=/;
//@ chunk-wzyv38y8.js:4625-4966 fingerprint (2.1.88 match: getShellConfigPaths, 0.661)
/**
 * 各 shell 的 rc 文件路径：zsh 用 $ZDOTDIR/.zshrc，bash 在 macOS 取已存在的 .bash_profile/.bash_login/.profile（另给 .bashrc），其他平台 .bashrc，fish 用 ~/.config/fish/config.fish。
 */
function getShellConfigPaths(options) {
  let home = options?.homedir ?? homedir();
  let env = options?.env ?? process.env;
  let platform = options?.platform ?? "linux";
  let fileExists = options?.fileExists ?? existsSync;
  let zshConfigDir = env.ZDOTDIR || home;
  let bashProfileName =
    platform === "darwin"
      ? ([".bash_profile", ".bash_login", ".profile"].find((candidate) =>
          fileExists(join(home, candidate)),
        ) ?? ".bash_profile")
      : ".bashrc";
  return {
    zsh: join(zshConfigDir, ".zshrc"),
    bash: join(home, bashProfileName),
    ...(platform === "darwin" && {
      bashrc: join(home, ".bashrc"),
    }),
    fish: join(home, ".config/fish/config.fish"),
  };
}
//@ chunk-wzyv38y8.js:4966-5215 fingerprint (2.1.88 match: filterClaudeAliases, 1)
/**
 * 从 rc 文件行中去掉指向本地安装 claude 的 alias claude=… 行，返回 {filtered, hadAlias}；安装器/迁移用。
 */
function filterClaudeAliases(lines) {
  let hadAlias = false;
  return {
    filtered: lines.filter((line) => {
      if (CLAUDE_ALIAS_REGEX.test(line)) {
        let match = line.match(/alias\s+claude\s*=\s*["']([^"']+)["']/);
        if (!match) match = line.match(/alias\s+claude\s*=\s*([^#\n]+)/);
        if (match && match[1]) {
          if (match[1].trim() === getLocalClaudePath()) {
            hadAlias = true;
            return false;
          }
        }
      }
      return true;
    }),
    hadAlias,
  };
}
//@ chunk-wzyv38y8.js:5215-5405 layout
/**
 * 读文件并按行切分；文件不存在返回 null，是目录时告警并返回 null，其他错误抛出。
 */
async function readFileLinesOrNull(filePath) {
  try {
    return (
      await readFile(filePath, {
        encoding: "utf8",
      })
    ).split(`
`);
  } catch (e) {
    if (isFsInaccessible(e)) return null;
    if (isEISDIR(e)) {
      logForDebugging(`Skipping ${filePath}: path is a directory`, {
        level: "warn",
      });
      return null;
    }
    throw e;
  }
}
//@ chunk-wzyv38y8.js:5405-5548 fingerprint (2.1.88 match: writeFileLines, 1)
/**
 * 把行数组写回文件并 datasync。
 */
async function writeFileLines(filePath, lines) {
  let fh = await open(filePath, "w");
  try {
    await fh.writeFile(
      lines.join(`
`),
      {
        encoding: "utf8",
      },
    );
    await fh.datasync();
  } finally {
    await fh.close();
  }
}
//@ chunk-wzyv38y8.js:5548-5680 layout
var UNREADABLE_CONFIG_ERROR_CODES; // deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
deferInit("chunk-wzyv38y8.js:5548", () => {
  UNREADABLE_CONFIG_ERROR_CODES = new Set([
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
});
//@ chunk-wzyv38y8.js:5680-6047 callgraph-witnessed (2.1.88 match: findClaudeAlias, 0)
/**
 * 在 zsh/bash/fish 配置文件里查找 `alias claude=` 的目标；读不了的文件记日志跳过。
 */
async function findClaudeAlias(options) {
  let configs = getShellConfigPaths(options);
  for (let configPath of Object.values(configs)) {
    let lines = await readFileLinesOrNull(configPath).catch((error) => {
      if (
        isSadFsErrno(error) ||
        isEnvFsErrno(error) ||
        UNREADABLE_CONFIG_ERROR_CODES.has(getErrnoCode(error) ?? "")
      ) {
        logForDebugging(
          `Skipping unreadable shell config ${configPath} during alias scan: ${errorMessage(error)}`,
          {
            level: "warn",
          },
        );
        return null;
      }
      throw error;
    });
    if (!lines) continue;
    for (let line of lines)
      if (CLAUDE_ALIAS_REGEX.test(line)) {
        let match = line.match(/alias\s+claude=["']?([^"'\s]+)/);
        if (match && match[1]) return match[1];
      }
  }
  return null;
}
//@ chunk-wzyv38y8.js:6047-6252 fingerprint (2.1.88 match: findValidClaudeAlias, 1)
/**
 * 在 rc 文件中找 claude 别名，展开 ~ 后目标存在（文件或符号链接）才返回别名目标。
 */
async function findValidClaudeAlias(options) {
  let aliasTarget = await findClaudeAlias(options);
  if (!aliasTarget) return null;
  let home = options?.homedir ?? homedir();
  let expandedPath = aliasTarget.startsWith("~") ? aliasTarget.replace("~", home) : aliasTarget;
  try {
    let stats = await stat(expandedPath);
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
