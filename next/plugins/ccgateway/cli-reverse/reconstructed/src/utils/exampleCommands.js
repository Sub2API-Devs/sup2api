/**
 * utils/exampleCommands.ts
 *
 * 欢迎屏示例命令：用 git log 找常改文件，生成“fix lint errors in <file>”之类的示例并缓存一周
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/utils/exampleCommands.ts
 * pieces: chunk-9knfmvrf.js (1), chunk-hjswk319.js (7)
 * attribution: fingerprint 4, affinity 1, file-local 1, callgraph-fingerprint 1, layout 1
 * (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.
 */
import { env } from "./env.js";
import { getIsGit, gitExe } from "./git.js";
import { getGitEmail } from "../services/analytics/growthbook.js";
import { execFileNoThrowWithCwd } from "./execFileNoThrow.js";
import { getCwd } from "./cwd.js";
import { logForDebugging } from "./debug.js";
import { hashString31 } from "./pastedContent.js";
import { getCurrentProjectConfig, saveCurrentProjectConfig } from "./config.js";

//@ chunk-hjswk319.js:68462-69183 affinity
var NON_CORE_FILE_PATTERNS = [
  /(?:^|\/)(?:package-lock\.json|yarn\.lock|bun\.lock|bun\.lockb|pnpm-lock\.yaml|Pipfile\.lock|poetry\.lock|Cargo\.lock|Gemfile\.lock|go\.sum|composer\.lock|uv\.lock)$/,
  /\.generated\./,
  /(?:^|\/)(?:dist|build|out|target|node_modules|\.next|__pycache__)\//,
  /\.(?:min\.js|min\.css|map|pyc|pyo)$/,
  /\.(?:json|ya?ml|toml|xml|ini|cfg|conf|env|lock|txt|md|mdx|rst|csv|log|svg)$/i,
  /(?:^|\/)\.?(?:eslintrc|prettierrc|babelrc|editorconfig|gitignore|gitattributes|dockerignore|npmrc)/,
  /(?:^|\/)(?:tsconfig|jsconfig|biome|vitest\.config|jest\.config|webpack\.config|vite\.config|rollup\.config)\.[a-z]+$/,
  /(?:^|\/)\.(?:github|vscode|idea|claude)\//,
  /(?:^|\/)(?:CHANGELOG|LICENSE|CONTRIBUTING|CODEOWNERS|README)(?:\.[a-z]+)?$/i,
];
//@ chunk-hjswk319.js:69183-69229 file-local
function isCoreFile(path) {
  return !NON_CORE_FILE_PATTERNS.some((pattern) => pattern.test(path));
}
//@ chunk-hjswk319.js:69229-69591 callgraph-fingerprint (2.1.88 match: pickDiverseCoreFiles, 1)
function pickDiverseCoreFiles(sortedPaths, want) {
  let picked = [];
  let seenBasenames = new Set();
  let dirTally = new Map();
  for (let cap = 1; picked.length < want && cap <= want; cap++)
    for (let sortedPath of sortedPaths) {
      if (picked.length >= want) break;
      if (!isCoreFile(sortedPath)) continue;
      let lastSep = Math.max(sortedPath.lastIndexOf("/"), sortedPath.lastIndexOf("\\"));
      let base = lastSep >= 0 ? sortedPath.slice(lastSep + 1) : sortedPath;
      if (!base || seenBasenames.has(base)) continue;
      let dir = lastSep >= 0 ? sortedPath.slice(0, lastSep) : ".";
      if ((dirTally.get(dir) ?? 0) >= cap) continue;
      picked.push(base);
      seenBasenames.add(base);
      dirTally.set(dir, (dirTally.get(dir) ?? 0) + 1);
    }
  return picked.length >= want ? picked : [];
}
//@ chunk-hjswk319.js:69591-70181 fingerprint (2.1.88 match: getFrequentlyModifiedFiles, 0.863)
/**
 * 用 git log 找近期经常修改的文件，供欢迎屏生成示例命令。
 */
async function getFrequentlyModifiedFiles() {
  if (env.platform === "win32") return [];
  if (!(await getIsGit())) return [];
  try {
    let userEmail = await getGitEmail();
    let logArgs = ["log", "-n", "1000", "--pretty=format:", "--name-only", "--diff-filter=M"];
    let counts = new Map();
    let tallyInto = (stdout) => {
      for (let line of stdout.split(`
`)) {
        let trimmed = line.trim();
        if (trimmed) counts.set(trimmed, (counts.get(trimmed) ?? 0) + 1);
      }
    };
    if (userEmail) {
      let { stdout } = await execFileNoThrowWithCwd("git", [...logArgs, `--author=${userEmail}`], {
        cwd: getCwd(),
      });
      tallyInto(stdout);
    }
    if (counts.size < 10) {
      let { stdout } = await execFileNoThrowWithCwd(gitExe(), logArgs, {
        cwd: getCwd(),
      });
      tallyInto(stdout);
    }
    let sorted = Array.from(counts.entries())
      .sort((leftEntry, rightEntry) => rightEntry[1] - leftEntry[1])
      .map(([filePath]) => filePath);
    return pickDiverseCoreFiles(sorted, 5);
  } catch (err) {
    logForDebugging(`Failed to collect frequently-modified files from git history: ${err}`, {
      level: "error",
    });
    return [];
  }
}
//@ chunk-hjswk319.js:70181-70198 layout
var ONE_WEEK_MS = 604800000;
//@ chunk-hjswk319.js:70198-70513 fingerprint (2.1.88 match: getExampleCommandFromCache, 0.987)
/**
 * 从缓存的常改文件中挑一个，生成示例命令文本（如“fix lint errors in <file>”）。
 */
function getExampleCommandFromCache(sessionId) {
  let hash = Math.abs(hashString31(sessionId));
  let exampleFiles = getCurrentProjectConfig().exampleFiles ?? [];
  let frequentFile = exampleFiles[hash % exampleFiles.length] ?? "<filepath>";
  let commands = [
    "fix lint errors",
    "fix typecheck errors",
    `how does ${frequentFile} work?`,
    `refactor ${frequentFile}`,
    "how do I log an error?",
    `edit ${frequentFile} to...`,
    `write a test for ${frequentFile}`,
    "create a util logging.py that...",
  ];
  return `Try "${commands[(hash >>> 8) % commands.length]}"`;
}
//@ chunk-hjswk319.js:70513-70753 fingerprint (2.1.88 match: refreshExampleCommands, 1)
async function refreshExampleCommands(frequentFiles) {
  let projectConfig = getCurrentProjectConfig();
  let lastGenerated = projectConfig.exampleFilesGeneratedAt ?? 0;
  if (Date.now() - lastGenerated > ONE_WEEK_MS || !projectConfig.exampleFiles?.length)
    getFrequentlyModifiedFiles().then((files) => {
      if (!files.length && !projectConfig.exampleFiles?.length) return;
      saveCurrentProjectConfig(
        (current) => ({
          ...current,
          exampleFiles: files,
          exampleFilesGeneratedAt: Date.now(),
        }),
        frequentFiles,
      );
    });
}
//@ chunk-9knfmvrf.js:4732-4799 fingerprint (2.1.88 match: countAndSortItems, 0.712)
function countAndSortItems(items) {
  return items.toString(16).toUpperCase().padStart(4, "0");
}
export { refreshExampleCommands, countAndSortItems, getExampleCommandFromCache };
