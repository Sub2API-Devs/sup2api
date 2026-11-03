/**
 * utils/exampleCommands.ts
 *
 * 欢迎屏示例命令：用 git log 找常改文件，生成“fix lint errors in <file>”之类的示例并缓存一周
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/utils/exampleCommands.ts
 * pieces: chunk-3wek6r2k.js (7), chunk-awy329vy.js (1)
 * attribution: affinity 1, file-local 1, callgraph-fingerprint 1, fingerprint 4, layout 1
 */
import { env } from "./env.js";
import { getIsGit, gitExe } from "./git.js";
import { getGitEmail } from "../services/analytics/growthbook.js";
import { execFileNoThrowWithCwd } from "./execFileNoThrow.js";
import { getCwd } from "./cwd.js";
import { logForDebugging } from "./debug.js";
import { zhe } from "./pastedContent.js";
import { getCurrentProjectConfig, saveCurrentProjectConfig } from "./config.js";

//@ chunk-3wek6r2k.js:69063-69784 affinity
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
//@ chunk-3wek6r2k.js:69784-69830 file-local
function isCoreFile(path) {
  return !NON_CORE_FILE_PATTERNS.some((o) => o.test(path));
}
//@ chunk-3wek6r2k.js:69830-70192 callgraph-fingerprint = pickDiverseCoreFiles (1)
function pickDiverseCoreFiles(sortedPaths, want) {
  let picked = [],
    seenBasenames = new Set(),
    dirTally = new Map();
  for (let cap = 1; picked.length < want && cap <= want; cap++)
    for (let h of sortedPaths) {
      if (picked.length >= want) break;
      if (!isCoreFile(h)) continue;
      let lastSep = Math.max(h.lastIndexOf("/"), h.lastIndexOf("\\")),
        y = lastSep >= 0 ? h.slice(lastSep + 1) : h;
      if (!y || seenBasenames.has(y)) continue;
      let M = lastSep >= 0 ? h.slice(0, lastSep) : ".";
      if ((dirTally.get(M) ?? 0) >= cap) continue;
      (picked.push(y), seenBasenames.add(y), dirTally.set(M, (dirTally.get(M) ?? 0) + 1));
    }
  return picked.length >= want ? picked : [];
}
/**
 * 用 git log 找近期经常修改的文件，供欢迎屏生成示例命令。
 */
//@ chunk-3wek6r2k.js:70192-70782 fingerprint = getFrequentlyModifiedFiles (0.864)
async function getFrequentlyModifiedFiles() {
  if (env.platform === "win32") return [];
  if (!(await getIsGit())) return [];
  try {
    let userEmail = await getGitEmail(),
      logArgs = ["log", "-n", "1000", "--pretty=format:", "--name-only", "--diff-filter=M"],
      counts = new Map(),
      tallyInto = (stdout) => {
        for (let line of stdout.split(`
`)) {
          let trimmed = line.trim();
          if (trimmed) counts.set(trimmed, (counts.get(trimmed) ?? 0) + 1);
        }
      };
    if (userEmail) {
      let { stdout: stdout } = await execFileNoThrowWithCwd("git", [...logArgs, `--author=${userEmail}`], {
        cwd: getCwd(),
      });
      tallyInto(stdout);
    }
    if (counts.size < 10) {
      let { stdout: stdout } = await execFileNoThrowWithCwd(gitExe(), logArgs, { cwd: getCwd() });
      tallyInto(stdout);
    }
    let sorted = Array.from(counts.entries())
      .sort((p, h) => h[1] - p[1])
      .map(([p]) => p);
    return pickDiverseCoreFiles(sorted, 5);
  } catch (err) {
    return (
      logForDebugging(`Failed to collect frequently-modified files from git history: ${err}`, {
        level: "error",
      }),
      []
    );
  }
}
//@ chunk-3wek6r2k.js:70782-70799 layout
var ONE_WEEK_MS = 604800000;
/**
 * 从缓存的常改文件中挑一个，生成示例命令文本（如“fix lint errors in <file>”）。
 */
//@ chunk-3wek6r2k.js:70799-71114 fingerprint = getExampleCommandFromCache (0.987)
function getExampleCommandFromCache(e) {
  let abs = Math.abs(zhe(e)),
    r = getCurrentProjectConfig().exampleFiles ?? [],
    u = r[abs % r.length] ?? "<filepath>",
    commands = [
      "fix lint errors",
      "fix typecheck errors",
      `how does ${u} work?`,
      `refactor ${u}`,
      "how do I log an error?",
      `edit ${u} to...`,
      `write a test for ${u}`,
      "create a util logging.py that...",
    ];
  return `Try "${commands[(abs >>> 8) % commands.length]}"`;
}
//@ chunk-3wek6r2k.js:71114-71354 fingerprint = refreshExampleCommands (1)
async function refreshExampleCommands(e) {
  let projectConfig = getCurrentProjectConfig(),
    lastGenerated = projectConfig.exampleFilesGeneratedAt ?? 0;
  if (Date.now() - lastGenerated > ONE_WEEK_MS || !projectConfig.exampleFiles?.length)
    getFrequentlyModifiedFiles().then((files) => {
      if (!files.length && !projectConfig.exampleFiles?.length) return;
      saveCurrentProjectConfig(
        (current) => ({ ...current, exampleFiles: files, exampleFilesGeneratedAt: Date.now() }),
        e,
      );
    });
}
//@ chunk-awy329vy.js:4723-4790 fingerprint = countAndSortItems (0.712)
function countAndSortItems(n) {
  return n.toString(16).toUpperCase().padStart(4, "0");
}

export { refreshExampleCommands, getExampleCommandFromCache, countAndSortItems };
