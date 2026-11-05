/**
 * utils/git/gitignore.ts
 *
 * gitignore 判定（check-ignore）、全局 gitignore 路径（core.excludesfile/XDG）、向全局 gitignore 追加规则并验证
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/utils/git/gitignore.ts
 * pieces: chunk-5fn9rb8r.js (7)
 * attribution: fingerprint 3, layout 2, placement 2
 * (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.
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

//@ chunk-5fn9rb8r.js:5114-5252 fingerprint (2.1.88 match: isPathGitignored, 0.927)
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
//@ chunk-5fn9rb8r.js:5252-5302 layout
async function isPathGitignoredBool(filePath, cwd) {
  return (await isPathGitignored(filePath, cwd)) === 0;
}
//@ chunk-5fn9rb8r.js:5302-5465 layout
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
//@ chunk-5fn9rb8r.js:5465-5682 fingerprint (2.1.88 match: getGlobalGitignorePath, 0.902)
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
//@ chunk-5fn9rb8r.js:5682-6750 fingerprint (2.1.88 match: addFileGlobRuleToGitignore, 0.377)
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
//@ chunk-5fn9rb8r.js:6750-6901 placement
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
//@ chunk-5fn9rb8r.js:6901-7067 placement
function describeGitignoreIneffective(reason, pattern) {
  return reason === "already_tracked"
    ? `'${pattern}' is tracked in the index; gitignore rules do not apply to tracked files`
    : "core.excludesfile may point elsewhere";
}
export { addFileGlobRuleToGitignore, isPathGitignored, isPathGitignoredBool };
