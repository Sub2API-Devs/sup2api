/**
 * utils/projectFacts.ts
 *
 * 2.1.316 新增：项目技术栈探测（包管理器锁文件、私有仓库源、iOS/Android/Xcode、gradle、CMake、sops 等）与 iOS 构建命令识别
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * new in 2.1.318 (2.1.88 has no file at this path)
 * pieces: chunk-yx0qwrvr.js (36)
 * attribution: placement 36
 */
import { join } from "path";
import { lstat, readdir } from "fs/promises";
import { EDIT } from "../tools/FileEditTool/constants.js";
import { FILE_WRITE_TOOL_NAME } from "../tools/FileWriteTool/prompt.js";
import { SHELL_TOOL_NAMES } from "./shell/shellToolUtils.js";
import { nestedCommandSpans } from "./bash/commands.js";
import { isGithubDotCom } from "./git/githubUrl.js";
import { readFileGuarded, isMissingPathError } from "./fsSafety/guardedFileRead.js";
import { isRemoteSessionAvailable } from "../remote/remoteMode.js";
import { findGitRoot, isHomeDirectoryGitRoot } from "./git.js";
import { getCwd } from "./cwd.js";
import { getGitRepoCache, memoizeMap } from "./git/gitRepoCache.js";
import { deferInit } from "../../runtime/deferred-init.js";

//@ chunk-yx0qwrvr.js:509-1657 placement
/**
 * IOS_SDK_VERSION_SOURCE：iOS SDK 版本匹配片段；IOS_SDKROOT_ASSIGNMENT_RE：Xcode 构建设置里的 iOS SDK 赋值；XCODE_PLATFORM_MARKER_RE：Xcode 工程里的 iOS 平台标记（同一声明共 9 个绑定）。
 */
var ASSIGNMENT_PATTERN_SOURCE; // deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
var IOS_SDK_VERSION_SOURCE;
var regExp;
var IOS_SDKROOT_ASSIGNMENT_RE;
var XCODE_PLATFORM_MARKER_RE;
var UIKIT_SOURCE_EXTENSIONS;
var IOS_ARTIFACT_EXTENSION_RE;
var SIMULATOR_COMMAND_RE;
var SIMULATOR_SDK_FLAG;
var regExp_2;
var XCODE_COMMAND_PREFIX_RE;
var IOS_BUILD_COMMAND_NAMES;
deferInit("chunk-yx0qwrvr.js:509", () => {
  ASSIGNMENT_PATTERN_SOURCE = String.raw`(?:\[[^\]\n]{0,100}\]){0,4}["']?\]?[ \t]{0,20}(?:=>|[=:])[ \t]{0,20}[\["' ]{0,8}`;
  IOS_SDK_VERSION_SOURCE = String.raw`iphone(?:os|simulator)[\d.]{0,12}\b`;
  regExp = new RegExp(
    [
      String.raw`\bSDKROOT${ASSIGNMENT_PATTERN_SOURCE}${IOS_SDK_VERSION_SOURCE}`,
      String.raw`\bTARGETED_DEVICE_FAMILY${ASSIGNMENT_PATTERN_SOURCE}(?:\d,){0,8}[12]\b`,
      String.raw`\bSUPPORTED_PLATFORMS${ASSIGNMENT_PATTERN_SOURCE}[^;\n]{0,200}?\b${IOS_SDK_VERSION_SOURCE}`,
    ].join("|"),
  );
  IOS_SDKROOT_ASSIGNMENT_RE = /IPHONEOS_DEPLOYMENT_TARGET|TARGETED_DEVICE_FAMILY/;
  XCODE_PLATFORM_MARKER_RE = /\bimport UIKit\b|#import\s*<UIKit\/|\.iOS\(/;
  UIKIT_SOURCE_EXTENSIONS = [".swift", ".m", ".mm", ".h"];
  IOS_ARTIFACT_EXTENSION_RE = /simctl|devicectl|iphone(?:os|simulator)|platform=iOS|-apple-ios|Simulator/i;
  SIMULATOR_COMMAND_RE = String.raw`-sdk\s+\S*iphone(?:os|simulator)`;
  SIMULATOR_SDK_FLAG = String.raw`(?:"[^"]*"|'[^']*'|[^\s"'])*`;
  regExp_2 = new RegExp(
    String.raw`^(?:(?:\w+=${SIMULATOR_SDK_FLAG}|sudo|time|env|nice|caffeinate|xcrun|timeout\s+\S+|arch\s+-\S+)\s+){0,20}` +
      String.raw`(?:\S*[\\/])?(?:` +
      [
        String.raw`(?:xcrun\s[\s\S]*?)?\b(?:simctl|devicectl)\b`,
        String.raw`xcrun\s[\s\S]*${SIMULATOR_COMMAND_RE}`,
        String.raw`xcodebuild\s[\s\S]*(?:${SIMULATOR_COMMAND_RE}|platform=iOS\b)`,
        String.raw`swift\s+(?:build|test|run)\s[\s\S]*(?:${SIMULATOR_COMMAND_RE}|-triple\s+\S*-apple-ios)`,
        String.raw`open\s[\s\S]*-a\s+["']?Simulator\b`,
      ].join("|") +
      ")",
    "i",
  );
  XCODE_COMMAND_PREFIX_RE = /\bsimctl\b|-sdk iphonesimulator|-sdk iphoneos|platform=iOS Simulator/;
  IOS_BUILD_COMMAND_NAMES = new Set([EDIT, FILE_WRITE_TOOL_NAME]);
});
//@ chunk-yx0qwrvr.js:1657-1737 placement
/**
 * emptyProjectFactsEvidence：项目事实证据的初值。
 */
function emptyProjectFactsEvidence() {
  return {
    swiftFileEdited: false,
    evidence: null,
    conclusiveEvidence: null,
  };
}
//@ chunk-yx0qwrvr.js:1737-1829 placement
/**
 * conclusiveEvidenceOf：项目证据（确定优先）。
 */
function conclusiveEvidenceOf(entry) {
  return entry.swiftFileEdited && entry.evidence !== null ? entry.evidence : entry.conclusiveEvidence;
}
//@ chunk-yx0qwrvr.js:1829-1864 placement
function hasProjectEvidence(state) {
  return conclusiveEvidenceOf(state) !== null;
}
//@ chunk-yx0qwrvr.js:1864-2767 placement
function countToolProgress(state, items) {
  for (let item of items) {
    if (hasProjectEvidence(state)) return;
    let message =
      item.type === "progress" && (item.data.type === "agent_progress" || item.data.type === "skill_progress")
        ? item.data.message
        : item;
    if (message.type === "assistant") {
      if (!Array.isArray(message.message.content)) continue;
      for (let block of message.message.content) {
        if (block.type !== "tool_use") continue;
        let input = block.input;
        if (typeof input !== "object" || input === null) continue;
        if (IOS_BUILD_COMMAND_NAMES.has(block.name)) {
          let filePath =
            "file_path" in input && typeof input.file_path === "string" ? input.file_path.toLowerCase() : "";
          if (filePath.endsWith(".swift")) state.swiftFileEdited = true;
          let conclusive = UIKIT_SOURCE_EXTENSIONS.some((ext) => filePath.endsWith(ext));
          if ("content" in input) recordUIKitImport(state, input.content, conclusive);
          if ("new_string" in input) recordUIKitImport(state, input.new_string, conclusive);
        } else if (
          SHELL_TOOL_NAMES.includes(block.name) &&
          "command" in input &&
          typeof input.command === "string"
        ) {
          let isIosBuild = isIosBuildCommand(input.command);
          if (isIosBuild || XCODE_COMMAND_PREFIX_RE.test(input.command))
            recordEvidence(state, "ios_command", isIosBuild);
        }
      }
    } else if (message.type === "user") {
      if (!Array.isArray(message.message.content)) continue;
      for (let block of message.message.content)
        if (block.type === "tool_result")
          for (let textPart of getTextParts(block.content)) recordXcodeMarker(state, textPart);
    }
  }
}
//@ chunk-yx0qwrvr.js:2767-2830 placement
function recordEvidence(state, kind, conclusive) {
  state.evidence ??= kind;
  if (conclusive) state.conclusiveEvidence ??= kind;
}
//@ chunk-yx0qwrvr.js:2830-2925 placement
function recordXcodeMarker(state, text) {
  if (regExp.test(text)) recordEvidence(state, "xcode_project", true);
  else if (IOS_SDKROOT_ASSIGNMENT_RE.test(text)) recordEvidence(state, "xcode_project", false);
}
//@ chunk-yx0qwrvr.js:2925-3015 placement
function recordUIKitImport(state, text, conclusive) {
  if (typeof text !== "string") return;
  if (XCODE_PLATFORM_MARKER_RE.test(text)) recordEvidence(state, "uikit_import", conclusive);
  recordXcodeMarker(state, text);
}
//@ chunk-yx0qwrvr.js:3015-3133 placement
function getTextParts(content) {
  if (typeof content === "string") return [content];
  return Array.isArray(content)
    ? content.flatMap((block) => (block.type === "text" ? [block.text] : []))
    : [];
}
//@ chunk-yx0qwrvr.js:3133-3193 placement
function isIosBuildCommand(command) {
  return (
    IOS_ARTIFACT_EXTENSION_RE.test(command) && nestedCommandSpans(command).some((span) => regExp_2.test(span))
  );
}
//@ chunk-yx0qwrvr.js:3193-4911 placement
/**
 * MAX_LOCKFILE_ENTRIES_SCAN：扫描锁文件条数上限；PACKAGE_MANAGER_LOCKFILES：锁文件与包管理器对应表；PIP_INDEX_URL_RE：pip registry/index-url 配置（同一声明共 16 个绑定）。
 */
var MAX_MANIFEST_BYTES; // deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
var MAX_LOCKFILE_ENTRIES_SCAN;
var PACKAGE_MANAGER_LOCKFILES;
var PIP_INDEX_URL_RE;
var POETRY_UV_SOURCE_URL_RE;
var YARN_NPM_REGISTRY_RE;
var CARGO_INDEX_URL_RE;
var SECRETS_TOOL_MARKER_RE;
var ANDROID_APPLICATION_PLUGIN_RE;
var CMAKE_CUDA_RE;
var CONDA_CUDA_PACKAGE_RE;
var GRADLE_BUILD_FILES;
var CONDA_ENV_FILES;
var APPLE_PROJECT_DIRS;
var MAX_XCODEPROJ_SCAN;
var MAX_MANIFEST_READ_BYTES;
var PUBLIC_REGISTRY_HOSTS;
deferInit("chunk-yx0qwrvr.js:3193", () => {
  MAX_MANIFEST_BYTES = 65536;
  MAX_LOCKFILE_ENTRIES_SCAN = 20;
  PACKAGE_MANAGER_LOCKFILES = [
    ["pnpm-lock.yaml", "pnpm"],
    ["yarn.lock", "yarn"],
    ["bun.lock", "bun"],
    ["bun.lockb", "bun"],
    ["package-lock.json", "npm"],
    ["npm-shrinkwrap.json", "npm"],
    ["deno.lock", "deno"],
    ["poetry.lock", "poetry"],
    ["uv.lock", "uv"],
    ["Pipfile.lock", "pipenv"],
    ["requirements.txt", "pip"],
    ["Cargo.lock", "cargo"],
    ["go.sum", "go"],
    ["composer.lock", "composer"],
    ["Gemfile.lock", "bundler"],
    ["gradle.lockfile", "gradle"],
    ["packages.lock.json", "nuget"],
    ["Podfile.lock", "cocoapods"],
    ["Package.resolved", "swift"],
    ["mix.lock", "mix"],
    ["pubspec.lock", "pub"],
    ["conan.lock", "other"],
  ];
  PIP_INDEX_URL_RE = /(?:registry|index-url)\s*=\s*["']?(https?:\/\/[^\s"'`]+)/g;
  POETRY_UV_SOURCE_URL_RE =
    /\[\[tool\.(?:poetry\.source|uv\.index)\]\][^[]*?url\s*=\s*["'](https?:\/\/[^\s"'`]+)/g;
  YARN_NPM_REGISTRY_RE = /npmRegistryServer\s*:\s*["']?(https?:\/\/[^\s"'`]+)/g;
  CARGO_INDEX_URL_RE = /(?:index|registry)\s*=\s*["']?(?:sparse\+)?(https?:\/\/[^\s"'`]+)/g;
  SECRETS_TOOL_MARKER_RE = /\b(?:VAULT_ADDR|SOPS_[A-Z_]*|op read|aws secretsmanager|gcloud secrets)\b/;
  ANDROID_APPLICATION_PLUGIN_RE =
    /\bcom\.android\.(?:application|library|test|dynamic-feature|tools\.build:gradle)\b/;
  CMAKE_CUDA_RE =
    /\b(?:enable_language\s*\(\s*CUDA|LANGUAGES\b[^)\n]{0,200}\bCUDA\b|find_package\s*\(\s*CUDA|cuda_add_(?:executable|library))/i;
  CONDA_CUDA_PACKAGE_RE =
    /^[^\S\n]*-[^\S\n]*(?:[a-z][\w.-]*::)?(?:cudatoolkit|cuda-toolkit|cudnn|pytorch-cuda)\b/m;
  GRADLE_BUILD_FILES = ["settings.gradle", "settings.gradle.kts", "build.gradle", "build.gradle.kts"];
  CONDA_ENV_FILES = ["environment.yml", "environment.yaml"];
  APPLE_PROJECT_DIRS = ["ios", "iosapp", "macos", "apple"];
  MAX_XCODEPROJ_SCAN = 5;
  MAX_MANIFEST_READ_BYTES = 1048576;
  PUBLIC_REGISTRY_HOSTS = new Set([
    "registry.npmjs.org",
    "registry.yarnpkg.com",
    "pypi.org",
    "pypi.python.org",
    "files.pythonhosted.org",
    "crates.io",
    "index.crates.io",
    "static.crates.io",
    "proxy.golang.org",
    "localhost",
    "127.0.0.1",
    "0.0.0.0",
    "[::1]",
    "registry.npmmirror.com",
    "registry.npm.taobao.org",
    "pypi.tuna.tsinghua.edu.cn",
    "mirrors.aliyun.com",
  ]);
});
//@ chunk-yx0qwrvr.js:4911-5378 placement
function detectPrivateRegistry(host) {
  let lowerHost = host?.toLowerCase() ?? null;
  if (!lowerHost) return "none";
  if (lowerHost.includes("jfrog")) return "jfrog";
  if (lowerHost.includes("nexus") || lowerHost.includes("sonatype")) return "nexus";
  if (lowerHost.includes("github")) return "github";
  if (lowerHost.includes("gitlab")) return "gitlab";
  if (
    lowerHost === "pkgs.dev.azure.com" ||
    lowerHost.endsWith(".visualstudio.com") ||
    lowerHost.endsWith(".azure.com")
  )
    return "azure";
  if (lowerHost.endsWith(".amazonaws.com")) return "aws";
  if (lowerHost.endsWith(".pkg.dev") || lowerHost.endsWith(".googleapis.com")) return "gcp";
  return "other";
}
//@ chunk-yx0qwrvr.js:5378-5510 placement
function extractHostname(url) {
  try {
    let lower = new URL(url).hostname.toLowerCase();
    return lower && /^[a-z0-9.[][a-z0-9.:\]-]*$/.test(lower) ? lower : null;
  } catch {
    return null;
  }
}
//@ chunk-yx0qwrvr.js:5510-5649 placement (2.1.88 match: isPreapprovedUrl, 1)
function isCratesIoIndexUrl(url) {
  try {
    let parsedUrl = new URL(url);
    return (
      isGithubDotCom(parsedUrl.hostname) &&
      /^\/rust-lang\/crates\.io-index(?:\.git)?\/?$/.test(parsedUrl.pathname)
    );
  } catch {
    return false;
  }
}
//@ chunk-yx0qwrvr.js:5649-5874 placement
/**
 * 从配置文本中按正则抽取主机名（跳过 # ; 注释行与 crates.io 索引 URL）；与 WebFetch 无关。
 */
function extractRegistryHosts(manifestFile, pattern) {
  let hosts = [];
  let joined = manifestFile
    .split(
      `
`,
    )
    .filter((line) => !/^\s*[#;]/.test(line)).join(`
`);
  let regExp = new RegExp(pattern.source, pattern.flags);
  for (let match of joined.matchAll(regExp)) {
    if (match[1] === undefined || isCratesIoIndexUrl(match[1])) continue;
    let hostname = extractHostname(match[1]);
    if (hostname !== null) hosts.push(hostname);
  }
  return hosts;
}
//@ chunk-yx0qwrvr.js:5874-5992 placement
async function readManifestFile(dir, relPath) {
  try {
    let fileGuarded = await readFileGuarded(join(dir, relPath), MAX_MANIFEST_BYTES, {
      noFollow: true,
    });
    return typeof fileGuarded === "string" ? fileGuarded : null;
  } catch {
    return null;
  }
}
//@ chunk-yx0qwrvr.js:5992-6060 placement
async function isFileAsync(filePath) {
  try {
    return (await lstat(filePath)).isFile();
  } catch {
    return false;
  }
}
//@ chunk-yx0qwrvr.js:6060-6622 placement
async function PACKAGE_CONFIG_FILES(dir, fileNames, hasCargoDir) {
  let candidates = [
    ...[".npmrc", "pip.conf", "pyproject.toml", "bunfig.toml"]
      .filter((name) => fileNames.has(name))
      .map((name) => [name, PIP_INDEX_URL_RE]),
    ...(fileNames.has("pyproject.toml") ? [["pyproject.toml", POETRY_UV_SOURCE_URL_RE]] : []),
    ...(fileNames.has(".yarnrc.yml") ? [[".yarnrc.yml", YARN_NPM_REGISTRY_RE]] : []),
    ...(hasCargoDir
      ? [
          [".cargo/config.toml", CARGO_INDEX_URL_RE],
          [".cargo/config", CARGO_INDEX_URL_RE],
        ]
      : []),
  ];
  for (let [relPath, pattern] of candidates) {
    if (relPath.startsWith(".cargo/") && !(await isFileAsync(join(dir, relPath)))) continue;
    let manifestFile = await readManifestFile(dir, relPath);
    if (manifestFile === null) continue;
    for (let host of extractRegistryHosts(manifestFile, pattern))
      if (!PUBLIC_REGISTRY_HOSTS.has(host))
        return {
          has_private_registry: true,
          private_registry_host_class: detectPrivateRegistry(host),
        };
  }
  return {
    has_private_registry: false,
    private_registry_host_class: "none",
  };
}
//@ chunk-yx0qwrvr.js:6622-6975 placement
async function SECRETS_TOOL_FILES(dir, fileNames) {
  if (
    fileNames.some((name) => {
      let lower = name.toLowerCase();
      return lower === ".sops.yaml" || lower === ".sops.yml";
    })
  )
    return true;
  let sliced = fileNames
    .filter((name) => {
      let lower = name.toLowerCase();
      return (
        lower === ".envrc" ||
        lower.endsWith(".yml") ||
        lower.endsWith(".yaml") ||
        lower.endsWith(".toml") ||
        lower.endsWith(".sh")
      );
    })
    .sort()
    .slice(0, MAX_LOCKFILE_ENTRIES_SCAN);
  for (let name of sliced) {
    let manifestFile = await readManifestFile(dir, name);
    if (manifestFile !== null && SECRETS_TOOL_MARKER_RE.test(manifestFile)) return true;
  }
  return false;
}
//@ chunk-yx0qwrvr.js:6975-7049 placement
async function isDirectoryAsync(filePath) {
  try {
    return (await lstat(filePath)).isDirectory();
  } catch {
    return false;
  }
}
//@ chunk-yx0qwrvr.js:7049-7218 placement
async function hasGithubWorkflows(dir) {
  try {
    let workflowsDir = join(dir, ".github", "workflows");
    if (!(await isDirectoryAsync(workflowsDir))) return false;
    return (await readdir(workflowsDir)).some((name) => name.endsWith(".yml") || name.endsWith(".yaml"));
  } catch {
    return false;
  }
}
//@ chunk-yx0qwrvr.js:7218-7284 placement
function packageManagerFromLockfiles(lockfiles) {
  for (let [lockfile, manager] of PACKAGE_MANAGER_LOCKFILES) if (lockfiles.has(lockfile)) return manager;
  return "none";
}
//@ chunk-yx0qwrvr.js:7284-7553 placement
async function detectGradle(dir, fileNames, hasGradleDir) {
  for (let name of GRADLE_BUILD_FILES) {
    if (!fileNames.has(name)) continue;
    let manifestFile = await readManifestFile(dir, name);
    if (manifestFile !== null && ANDROID_APPLICATION_PLUGIN_RE.test(_(manifestFile))) return true;
  }
  if (hasGradleDir) {
    let versionCatalogPath = join(dir, "gradle", "libs.versions.toml");
    if (await isFileAsync(versionCatalogPath)) {
      let manifestFile = await readManifestFile(dir, "gradle/libs.versions.toml");
      if (manifestFile !== null && ANDROID_APPLICATION_PLUGIN_RE.test(_(manifestFile))) return true;
    }
  }
  return false;
}
//@ chunk-yx0qwrvr.js:7553-7615 placement
function _(manifestFile) {
  return manifestFile.replace(/^[^\S\n]*(?:#|\/\/).*$/gm, "");
}
//@ chunk-yx0qwrvr.js:7615-7836 placement
async function hasMatchingBuildFile(dir, fileNames) {
  if (fileNames.has("CMakeLists.txt")) {
    let manifestFile = await readManifestFile(dir, "CMakeLists.txt");
    if (manifestFile !== null && CMAKE_CUDA_RE.test(_(manifestFile))) return true;
  }
  for (let name of CONDA_ENV_FILES) {
    if (!fileNames.has(name)) continue;
    let manifestFile = await readManifestFile(dir, name);
    if (manifestFile !== null && CONDA_CUDA_PACKAGE_RE.test(_(manifestFile))) return true;
  }
  return false;
}
//@ chunk-yx0qwrvr.js:7836-7989 placement
function hasXcodeProject(fileNames, dirNames) {
  return (
    [...fileNames, ...dirNames].some((name) => {
      let lower = name.toLowerCase();
      return lower.endsWith(".xcodeproj") || lower.endsWith(".xcworkspace");
    }) || fileNames.includes("Podfile")
  );
}
//@ chunk-yx0qwrvr.js:7989-8220 placement
async function listDirEntries(dir) {
  let dirents = await readdir(dir, {
    withFileTypes: true,
  }).catch((error) => (isMissingPathError(error) ? [] : null));
  if (dirents === null) return null;
  return {
    dir,
    fileNames: dirents.filter((dirent) => dirent.isFile()).map((dirent) => dirent.name),
    dirNames: dirents.filter((dirent) => dirent.isDirectory()).map((dirent) => dirent.name),
  };
}
//@ chunk-yx0qwrvr.js:8220-8452 placement
async function readXcodeProject(entries) {
  let found = entries.fileNames.find((fileName) => fileName.toLowerCase() === "project.pbxproj");
  if (found === undefined) return false;
  let fileGuarded = await readFileGuarded(join(entries.dir, found), MAX_MANIFEST_READ_BYTES, {
    noFollow: true,
    fromTail: true,
  });
  if (fileGuarded === "unreadable") return null;
  return fileGuarded !== null && regExp.test(fileGuarded.content);
}
//@ chunk-yx0qwrvr.js:8452-8596 placement
async function isAndroidProjectDir(entries) {
  if (entries.fileNames.includes("AndroidManifest.xml")) return true;
  return detectGradle(entries.dir, new Set(entries.fileNames), entries.dirNames.includes("gradle"));
}
//@ chunk-yx0qwrvr.js:8596-8869 placement
async function detectAndroidProject(dir, fileNames, dirNames) {
  if (
    await isAndroidProjectDir({
      dir,
      fileNames,
      dirNames,
    })
  )
    return {
      hasAndroidProject: true,
      hasAndroidAppProject: true,
    };
  let found = dirNames.find((name) => name.toLowerCase() === "android");
  let androidEntries = found === undefined ? null : await listDirEntries(join(dir, found));
  return {
    hasAndroidProject: false,
    hasAndroidAppProject: androidEntries !== null && (await isAndroidProjectDir(androidEntries)),
  };
}
//@ chunk-yx0qwrvr.js:8869-9445 placement
async function detectXcodeProject(dir, fileNames, dirNames) {
  let flattened = APPLE_PROJECT_DIRS.flatMap((candidateDir) => {
    let found = dirNames.find((name) => name.toLowerCase() === candidateDir);
    return found === undefined ? [] : [join(dir, found)];
  });
  let entriesList = [
    ...(await Promise.all(flattened.map(listDirEntries))),
    {
      dir,
      fileNames,
      dirNames,
    },
  ];
  let included = entriesList.includes(null);
  let filtered = entriesList.filter((entry) => entry !== null);
  let hasXcodeProject_2 = filtered.some((entry) => hasXcodeProject(entry.fileNames, entry.dirNames));
  let sliced = filtered
    .flatMap((entry) =>
      entry.dirNames
        .filter((dirName) => dirName.toLowerCase().endsWith(".xcodeproj"))
        .sort()
        .map((dirName) => join(entry.dir, dirName)),
    )
    .slice(0, MAX_XCODEPROJ_SCAN);
  for (let projectPath of sliced) {
    let projectEntries = await listDirEntries(projectPath);
    let iosVerdict = projectEntries === null ? null : await readXcodeProject(projectEntries);
    if (iosVerdict === true)
      return {
        hasXcodeProject: hasXcodeProject_2,
        hasIosAppProject: true,
      };
    included ||= iosVerdict === null;
  }
  return {
    hasXcodeProject: hasXcodeProject_2,
    hasIosAppProject: included ? null : false,
  };
}
//@ chunk-yx0qwrvr.js:9445-9887 placement
async function classifyProjectPlatforms(dir, fileNames, fileNamesSet, hasXcodeProject, hasAndroidProject) {
  let mapped = fileNames.map((name) => name.toLowerCase());
  if (hasXcodeProject) return "xcode";
  if (hasAndroidProject) return "android";
  if (
    mapped.some((name) => name.endsWith(".cu") || name.endsWith(".cuh")) ||
    (await hasMatchingBuildFile(dir, fileNamesSet))
  )
    return "cuda";
  if (mapped.some((name) => name.endsWith(".sln") || name.endsWith(".csproj"))) return "dotnet";
  if (
    mapped.some(
      (name) =>
        (name.endsWith(".bat") || name.endsWith(".cmd") || name.endsWith(".ps1")) &&
        name !== "gradlew.bat" &&
        name !== "gradlew.cmd" &&
        name !== "mvnw.bat" &&
        name !== "mvnw.cmd",
    )
  )
    return "windows_scripts";
  return "none";
}
//@ chunk-yx0qwrvr.js:9887-11269 placement
/**
 * 扫描项目根目录得到技术栈事实（锁文件、配置、平台目录）。
 */
async function detectProjectFacts(dir) {
  let dirents = await readdir(dir, {
    withFileTypes: true,
  });
  let fileNames = dirents.filter((dirent) => dirent.isFile()).map((dirent) => dirent.name);
  let dirNames = dirents.filter((dirent) => dirent.isDirectory()).map((dirent) => dirent.name);
  let fileNamesSet = new Set(fileNames);
  let mapped = fileNames.map((name) => name.toLowerCase());
  let dirNamesLower = new Set(dirNames.map((name) => name.toLowerCase()));
  let [registryFacts, hasSecretsRefs, hasWorkflows, xcodeProject, androidProject] = await Promise.all([
    PACKAGE_CONFIG_FILES(dir, fileNamesSet, dirNames.includes(".cargo")),
    SECRETS_TOOL_FILES(dir, fileNames),
    dirNames.includes(".github") ? hasGithubWorkflows(dir) : Promise.resolve(false),
    detectXcodeProject(dir, fileNames, dirNames),
    detectAndroidProject(dir, fileNames, dirNames),
  ]);
  let osLockedToolchain = await classifyProjectPlatforms(
    dir,
    fileNames,
    fileNamesSet,
    xcodeProject.hasXcodeProject,
    androidProject.hasAndroidProject,
  );
  return {
    has_dockerfile: mapped.some(
      (name) => name === "dockerfile" || name.startsWith("dockerfile.") || name.endsWith(".dockerfile"),
    ),
    has_compose: mapped.some((name) => /^(docker-)?compose(\..+)?\.ya?ml$/.test(name)),
    has_devcontainer: dirNamesLower.has(".devcontainer") || mapped.includes(".devcontainer.json"),
    has_nix: ["flake.nix", "default.nix", "shell.nix"].some((name) => fileNamesSet.has(name)),
    has_bazel: ["WORKSPACE", "WORKSPACE.bazel", "MODULE.bazel", "BUILD", "BUILD.bazel", ".bazelrc"].some(
      (name) => fileNamesSet.has(name),
    ),
    lockfile_family: packageManagerFromLockfiles(fileNamesSet),
    has_env_file: mapped.some(
      (name) =>
        (name === ".env" || name.startsWith(".env.")) && !/\.(example|sample|template|dist)$/.test(name),
    ),
    has_ci_config:
      hasWorkflows ||
      dirNamesLower.has(".circleci") ||
      dirNamesLower.has(".buildkite") ||
      mapped.some((name) =>
        [
          ".gitlab-ci.yml",
          "jenkinsfile",
          "azure-pipelines.yml",
          ".travis.yml",
          "bitbucket-pipelines.yml",
        ].includes(name),
      ),
    ...registryFacts,
    has_secrets_manager_refs: hasSecretsRefs,
    has_xcode_project: xcodeProject.hasXcodeProject,
    has_ios_app_project: xcodeProject.hasIosAppProject,
    has_android_project: androidProject.hasAndroidProject,
    has_android_app_project: androidProject.hasAndroidAppProject,
    os_locked_toolchain: osLockedToolchain,
  };
}
//@ chunk-yx0qwrvr.js:11269-11332 placement
async function detectProjectFactsSafe(dir) {
  try {
    return await detectProjectFacts(dir);
  } catch {
    return null;
  }
}
//@ chunk-yx0qwrvr.js:11332-11626 placement
async function getProjectFactsForStartup(options) {
  try {
    if (isRemoteSessionAvailable()) return null;
    let gitRoot = findGitRoot(getCwd());
    if (gitRoot === null) return null;
    if (await isHomeDirectoryGitRoot(gitRoot)) return null;
    let markersByRoot = getGitRepoCache().markersByRoot;
    if (options?.fresh === true) markersByRoot.delete(gitRoot);
    let factsPromise = memoizeMap(markersByRoot, gitRoot, detectProjectFactsSafe);
    let facts = await factsPromise;
    if (
      (facts === null || facts.has_ios_app_project === null) &&
      markersByRoot.peek(gitRoot) === factsPromise
    )
      markersByRoot.delete(gitRoot);
    return facts;
  } catch {
    return null;
  }
}
//@ chunk-yx0qwrvr.js:11626-11638 placement
/**
 * PROJECT_FACTS_CACHE_TTL_MS：项目事实缓存时长。
 */
var PROJECT_FACTS_CACHE_TTL_MS = 500;
export {
  getProjectFactsForStartup,
  PROJECT_FACTS_CACHE_TTL_MS,
  emptyProjectFactsEvidence,
  countToolProgress,
  conclusiveEvidenceOf,
};
