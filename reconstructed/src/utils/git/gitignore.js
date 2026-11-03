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
import {
  join,
  join as join_2,
  join as join_3,
  isAbsolute,
  dirname,
  dirname as dirname_2,
  dirname as dirname_3,
  dirname as dirname_4,
} from "path";
import { homedir } from "os";
import { mkdir, readFile, appendFile, writeFile } from "fs/promises";
import { execFileNoThrowWithCwd } from "../execFileNoThrow.js";
import { freeze as freeze_2 } from "./gitSafeEnv.js";
import { buildGitConfigScopedEnv } from "./gitConfigEnv.js";
import { env } from "../env.js";
import { getCwd } from "../cwd.js";
import { dirIsInGitRepo } from "../git.js";
import { logForDebugging } from "../debug.js";
import { getErrnoCode } from "../errors.js";

/**
 * git check-ignore 判断路径是否被忽略，返回退出码。
 */
//@ chunk-q8cqcff6.js:4976-5114 fingerprint = isPathGitignored (0.926)
async function isPathGitignored(filePath, cwd) {
  let { exitCode: exitCode } = await execFileNoThrowWithCwd(
    "git",
    [...freeze_2, "check-ignore", "--", filePath],
    { preserveOutputOnError: !1, cwd: cwd, env: buildGitConfigScopedEnv() },
  );
  return exitCode;
}
//@ chunk-q8cqcff6.js:5114-5164 layout
async function isPathGitignoredBool(e, n) {
  return (await isPathGitignored(e, n)) === 0;
}
//@ chunk-q8cqcff6.js:5164-5327 layout
async function getConfiguredGlobalGitignorePath(e) {
  let { stdout: stdout, code: code } = await execFileNoThrowWithCwd(
    "git",
    ["config", "--global", "--get", "core.excludesfile"],
    { preserveOutputOnError: !1, cwd: e },
  );
  return getGlobalGitignorePath(code === 0 ? stdout : "");
}
/**
 * 全局 gitignore 路径：core.excludesfile，否则 $XDG_CONFIG_HOME/git/ignore 或 ~/.config/git/ignore。
 */
//@ chunk-q8cqcff6.js:5327-5544 fingerprint = getGlobalGitignorePath (0.901)
function getGlobalGitignorePath(e) {
  let trimmed = e.trim();
  if (trimmed) {
    if (trimmed === "~" || trimmed.startsWith("~/")) return join_2(homedir(), trimmed.slice(2));
    if (isAbsolute(trimmed)) return trimmed;
  }
  let XDG_CONFIG_HOME = env.XDG_CONFIG_HOME;
  if (XDG_CONFIG_HOME && isAbsolute(XDG_CONFIG_HOME)) return join_2(XDG_CONFIG_HOME, "git", "ignore");
  return join_2(homedir(), ".config", "git", "ignore");
}
/**
 * 把文件名规则（如 .claude/settings.local.json）写入全局 gitignore（必要时创建），并验证规则对样例路径生效；文件已被 index 跟踪时返回 already_tracked。
 */
//@ chunk-q8cqcff6.js:5544-6612 fingerprint = addFileGlobRuleToGitignore (0.377)
async function addFileGlobRuleToGitignore(filename, cwd = getCwd()) {
  try {
    if (!(await dirIsInGitRepo(cwd))) return { written: !1, effective: !1 };
    let replaced = filename.replaceAll("\\", "/"),
      gitignoreEntry = `**/${replaced}`,
      S = replaced.endsWith("/") ? `${replaced}sample-file.txt` : replaced;
    if (await isPathGitignoredBool(S, cwd)) return { written: !1, effective: !0 };
    let E = await getConfiguredGlobalGitignorePath(cwd),
      configGitDir = dirname_3(E);
    await mkdir(configGitDir, { recursive: !0 });
    try {
      if ((await readFile(E, { encoding: "utf-8" })).includes(gitignoreEntry)) {
        let O = (await isTrackedInIndex(S, cwd)) ? "already_tracked" : "excludesfile_not_read";
        return (
          logForDebugging(
            `[gitignore] '${gitignoreEntry}' already present in ${E} but git check-ignore reports not-ignored \u2014 ${describeGitignoreIneffective(O, S)}`,
            { level: "warn" },
          ),
          { written: !1, effective: !1, reason: O }
        );
      }
      await appendFile(
        E,
        `
${gitignoreEntry}
`,
      );
    } catch (error) {
      if (getErrnoCode(error) === "ENOENT")
        await writeFile(
          E,
          `${gitignoreEntry}
`,
          "utf-8",
        );
      else throw error;
    }
    if (!(await isPathGitignoredBool(S, cwd))) {
      let P = (await isTrackedInIndex(S, cwd)) ? "already_tracked" : "excludesfile_not_read";
      return (
        logForDebugging(
          `[gitignore] wrote '${gitignoreEntry}' to ${E} but git check-ignore still reports not-ignored \u2014 ${describeGitignoreIneffective(P, S)}`,
          { level: "warn" },
        ),
        { written: !0, effective: !1, reason: P }
      );
    }
    return { written: !0, effective: !0 };
  } catch (error) {
    return (
      logForDebugging(
        `Failed to add gitignore entry to global gitignore: ${error instanceof Error ? error.message : String(error)}`,
        { level: "error" },
      ),
      { written: !1, effective: !1 }
    );
  }
}
//@ chunk-q8cqcff6.js:6612-6763 placement
async function isTrackedInIndex(e, n) {
  let { code: code } = await execFileNoThrowWithCwd(
    "git",
    [...freeze_2, "ls-files", "--error-unmatch", "--", e],
    { preserveOutputOnError: !1, cwd: n, env: buildGitConfigScopedEnv() },
  );
  return code === 0;
}
//@ chunk-q8cqcff6.js:6763-6929 placement
function describeGitignoreIneffective(e, n) {
  return e === "already_tracked"
    ? `'${n}' is tracked in the index; gitignore rules do not apply to tracked files`
    : "core.excludesfile may point elsewhere";
}

export { addFileGlobRuleToGitignore, isPathGitignored, isPathGitignoredBool };
