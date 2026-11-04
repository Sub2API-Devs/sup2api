/**
 * utils/git/gitignore.ts
 *
 * gitignore 判定（check-ignore）、全局 gitignore 路径（core.excludesfile/XDG）、向全局 gitignore 追加规则并验证
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/utils/git/gitignore.ts
 * pieces: chunk-q8cqcff6.js (7)
 * attribution: fingerprint 3, layout 2, placement 2
 */
import { join, isAbsolute, dirname } from "path";
import { homedir } from "os";
import { mkdir, readFile, appendFile, writeFile } from "fs/promises";
import { execFileNoThrowWithCwd } from "../execFileNoThrow.js";
import { GIT_SAFE_GLOBAL_ARGS } from "./gitSafeEnv.js";
import { buildGitConfigScopedEnv } from "./gitConfigEnv.js";
import { env } from "../env.js";
import { getCwd } from "../cwd.js";
import { dirIsInGitRepo } from "../git.js";
import { logForDebugging } from "../debug.js";
import { getErrnoCode } from "../errors.js";

//@ chunk-q8cqcff6.js:4976-5114 fingerprint = isPathGitignored (0.926)
/**
 * git check-ignore 判断路径是否被忽略，返回退出码。
 */
async function isPathGitignored(filePath, cwd) {
  let { exitCode } = await execFileNoThrowWithCwd(
    "git",
    [...GIT_SAFE_GLOBAL_ARGS, "check-ignore", "--", filePath],
    {
      preserveOutputOnError: false,
      cwd,
      env: buildGitConfigScopedEnv(),
    },
  );
  return exitCode;
}
//@ chunk-q8cqcff6.js:5114-5164 layout
async function isPathGitignoredBool(filePath, cwd) {
  return (await isPathGitignored(filePath, cwd)) === 0;
}
//@ chunk-q8cqcff6.js:5164-5327 layout
async function getConfiguredGlobalGitignorePath(cwd) {
  let { stdout, code } = await execFileNoThrowWithCwd(
    "git",
    ["config", "--global", "--get", "core.excludesfile"],
    {
      preserveOutputOnError: false,
      cwd,
    },
  );
  return getGlobalGitignorePath(code === 0 ? stdout : "");
}
//@ chunk-q8cqcff6.js:5327-5544 fingerprint = getGlobalGitignorePath (0.901)
/**
 * 全局 gitignore 路径：core.excludesfile，否则 $XDG_CONFIG_HOME/git/ignore 或 ~/.config/git/ignore。
 */
function getGlobalGitignorePath(excludesFile) {
  let trimmed = excludesFile.trim();
  if (trimmed) {
    if (trimmed === "~" || trimmed.startsWith("~/")) return join(homedir(), trimmed.slice(2));
    if (isAbsolute(trimmed)) return trimmed;
  }
  let XDG_CONFIG_HOME = env.XDG_CONFIG_HOME;
  if (XDG_CONFIG_HOME && isAbsolute(XDG_CONFIG_HOME)) return join(XDG_CONFIG_HOME, "git", "ignore");
  return join(homedir(), ".config", "git", "ignore");
}
//@ chunk-q8cqcff6.js:5544-6612 fingerprint = addFileGlobRuleToGitignore (0.377)
/**
 * 把文件名规则（如 .claude/settings.local.json）写入全局 gitignore（必要时创建），并验证规则对样例路径生效；文件已被 index 跟踪时返回 already_tracked。
 */
async function addFileGlobRuleToGitignore(filename, cwd = getCwd()) {
  try {
    if (!(await dirIsInGitRepo(cwd)))
      return {
        written: false,
        effective: false,
      };
    let replaced = filename.replaceAll("\\", "/");
    let gitignoreEntry = `**/${replaced}`;
    let probePath = replaced.endsWith("/") ? `${replaced}sample-file.txt` : replaced;
    if (await isPathGitignoredBool(probePath, cwd))
      return {
        written: false,
        effective: true,
      };
    let globalGitignorePath = await getConfiguredGlobalGitignorePath(cwd);
    let configGitDir = dirname(globalGitignorePath);
    await mkdir(configGitDir, {
      recursive: true,
    });
    try {
      if (
        (
          await readFile(globalGitignorePath, {
            encoding: "utf-8",
          })
        ).includes(gitignoreEntry)
      ) {
        let reason = (await isTrackedInIndex(probePath, cwd)) ? "already_tracked" : "excludesfile_not_read";
        logForDebugging(
          `[gitignore] '${gitignoreEntry}' already present in ${globalGitignorePath} but git check-ignore reports not-ignored \u2014 ${describeGitignoreIneffective(reason, probePath)}`,
          {
            level: "warn",
          },
        );
        return {
          written: false,
          effective: false,
          reason,
        };
      }
      await appendFile(
        globalGitignorePath,
        `
${gitignoreEntry}
`,
      );
    } catch (e) {
      if (getErrnoCode(e) === "ENOENT")
        await writeFile(
          globalGitignorePath,
          `${gitignoreEntry}
`,
          "utf-8",
        );
      else throw e;
    }
    if (!(await isPathGitignoredBool(probePath, cwd))) {
      let reason = (await isTrackedInIndex(probePath, cwd)) ? "already_tracked" : "excludesfile_not_read";
      logForDebugging(
        `[gitignore] wrote '${gitignoreEntry}' to ${globalGitignorePath} but git check-ignore still reports not-ignored \u2014 ${describeGitignoreIneffective(reason, probePath)}`,
        {
          level: "warn",
        },
      );
      return {
        written: true,
        effective: false,
        reason,
      };
    }
    return {
      written: true,
      effective: true,
    };
  } catch (error) {
    logForDebugging(
      `Failed to add gitignore entry to global gitignore: ${error instanceof Error ? error.message : String(error)}`,
      {
        level: "error",
      },
    );
    return {
      written: false,
      effective: false,
    };
  }
}
//@ chunk-q8cqcff6.js:6612-6763 placement
async function isTrackedInIndex(path, cwd) {
  let { code } = await execFileNoThrowWithCwd(
    "git",
    [...GIT_SAFE_GLOBAL_ARGS, "ls-files", "--error-unmatch", "--", path],
    {
      preserveOutputOnError: false,
      cwd,
      env: buildGitConfigScopedEnv(),
    },
  );
  return code === 0;
}
//@ chunk-q8cqcff6.js:6763-6929 placement
function describeGitignoreIneffective(reason, pattern) {
  return reason === "already_tracked"
    ? `'${pattern}' is tracked in the index; gitignore rules do not apply to tracked files`
    : "core.excludesfile may point elsewhere";
}
export { addFileGlobRuleToGitignore, isPathGitignored, isPathGitignoredBool };
