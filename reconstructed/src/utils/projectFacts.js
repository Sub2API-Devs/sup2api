/**
 * utils/projectFacts.ts
 *
 * 2.1.316 新增：项目技术栈探测（包管理器锁文件、私有仓库源、iOS/Android/Xcode、gradle、CMake、sops 等）与 iOS 构建命令识别
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-dsy6gyxv.js (36)
 * attribution: placement 36
 */
import { join } from "path";
import { lstat, readdir } from "fs/promises";
import { FILE_EDIT_TOOL_NAME } from "../tools/FileEditTool/constants.js";
import { FILE_WRITE_TOOL_NAME } from "../tools/FileWriteTool/prompt.js";
import { SHELL_TOOL_NAMES } from "./shell/shellToolUtils.js";
import { nestedCommandSpans } from "./bash/commands.js";
import { isGithubDotCom } from "./git/githubUrl.js";
import { readFileGuarded, isMissingPathError } from "./fsSafety/guardedFileRead.js";
import { isRemoteSessionAvailable } from "../remote/remoteMode.js";
import { findGitRoot, isHomeDirectoryGitRoot } from "./git.js";
import { getCwd } from "./cwd.js";
import { getGitRepoCache, memoizeMap } from "./git/gitRepoCache.js";

//@ chunk-dsy6gyxv.js:509-1657 placement
/**
 * IOS_SDK_VERSION_SOURCE：iOS SDK 版本匹配片段；IOS_SDKROOT_ASSIGNMENT_RE：Xcode 构建设置里的 iOS SDK 赋值；XCODE_PLATFORM_MARKER_RE：Xcode 工程里的 iOS 平台标记（同一声明共 9 个绑定）。
 */
var ASSIGNMENT_PATTERN_SOURCE = String.raw`(?:\[[^\]\n]{0,100}\]){0,4}["']?\]?[ \t]{0,20}(?:=>|[=:])[ \t]{0,20}[\["' ]{0,8}`;
var IOS_SDK_VERSION_SOURCE = String.raw`iphone(?:os|simulator)[\d.]{0,12}\b`;
var regExp = new RegExp(
  [
    String.raw`\bSDKROOT${ASSIGNMENT_PATTERN_SOURCE}${IOS_SDK_VERSION_SOURCE}`,
    String.raw`\bTARGETED_DEVICE_FAMILY${ASSIGNMENT_PATTERN_SOURCE}(?:\d,){0,8}[12]\b`,
    String.raw`\bSUPPORTED_PLATFORMS${ASSIGNMENT_PATTERN_SOURCE}[^;\n]{0,200}?\b${IOS_SDK_VERSION_SOURCE}`,
  ].join("|"),
);
var IOS_SDKROOT_ASSIGNMENT_RE = /IPHONEOS_DEPLOYMENT_TARGET|TARGETED_DEVICE_FAMILY/;
var XCODE_PLATFORM_MARKER_RE = /\bimport UIKit\b|#import\s*<UIKit\/|\.iOS\(/;
var UIKIT_IMPORT_RE = [".swift", ".m", ".mm", ".h"];
var IOS_ARTIFACT_EXTENSIONS = /simctl|devicectl|iphone(?:os|simulator)|platform=iOS|-apple-ios|Simulator/i;
var SIMULATOR_COMMAND_RE = String.raw`-sdk\s+\S*iphone(?:os|simulator)`;
var SIMULATOR_SDK_FLAG = String.raw`(?:"[^"]*"|'[^']*'|[^\s"'])*`;
var regExp_2 = new RegExp(
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
var XCODE_COMMAND_PREFIX = /\bsimctl\b|-sdk iphonesimulator|-sdk iphoneos|platform=iOS Simulator/;
var IOS_BUILD_COMMAND_RE = new Set([FILE_EDIT_TOOL_NAME, FILE_WRITE_TOOL_NAME]);
//@ chunk-dsy6gyxv.js:1657-1737 placement
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
//@ chunk-dsy6gyxv.js:1737-1829 placement
/**
 * conclusiveEvidenceOf：项目证据（确定优先）。
 */
function conclusiveEvidenceOf(e) {
  return e.swiftFileEdited && e.evidence !== null ? e.evidence : e.conclusiveEvidence;
}
//@ chunk-dsy6gyxv.js:1829-1864 placement
function hasProjectEvidence(e) {
  return conclusiveEvidenceOf(e) !== null;
}
//@ chunk-dsy6gyxv.js:1864-2767 placement
function countToolProgress(e, t) {
  for (let n of t) {
    if (hasProjectEvidence(e)) return;
    let s =
      n.type === "progress" && (n.data.type === "agent_progress" || n.data.type === "skill_progress")
        ? n.data.message
        : n;
    if (s.type === "assistant") {
      if (!Array.isArray(s.message.content)) continue;
      for (let o of s.message.content) {
        if (o.type !== "tool_use") continue;
        let input = o.input;
        if (typeof input !== "object" || input === null) continue;
        if (IOS_BUILD_COMMAND_RE.has(o.name)) {
          let i =
            "file_path" in input && typeof input.file_path === "string" ? input.file_path.toLowerCase() : "";
          if (i.endsWith(".swift")) e.swiftFileEdited = true;
          let any = UIKIT_IMPORT_RE.some((m) => i.endsWith(m));
          if ("content" in input) recordUIKitImport(e, input.content, any);
          if ("new_string" in input) recordUIKitImport(e, input.new_string, any);
        } else if (
          SHELL_TOOL_NAMES.includes(o.name) &&
          "command" in input &&
          typeof input.command === "string"
        ) {
          let i = isIosBuildCommand(input.command);
          if (i || XCODE_COMMAND_PREFIX.test(input.command)) recordEvidence(e, "ios_command", i);
        }
      }
    } else if (s.type === "user") {
      if (!Array.isArray(s.message.content)) continue;
      for (let o of s.message.content)
        if (o.type === "tool_result") for (let r of getTextParts(o.content)) recordXcodeMarker(e, r);
    }
  }
}
//@ chunk-dsy6gyxv.js:2767-2830 placement
function recordEvidence(e, t, n) {
  e.evidence ??= t;
  if (n) e.conclusiveEvidence ??= t;
}
//@ chunk-dsy6gyxv.js:2830-2925 placement
function recordXcodeMarker(e, t) {
  if (regExp.test(t)) recordEvidence(e, "xcode_project", true);
  else if (IOS_SDKROOT_ASSIGNMENT_RE.test(t)) recordEvidence(e, "xcode_project", false);
}
//@ chunk-dsy6gyxv.js:2925-3015 placement
function recordUIKitImport(e, t, n) {
  if (typeof t !== "string") return;
  if (XCODE_PLATFORM_MARKER_RE.test(t)) recordEvidence(e, "uikit_import", n);
  recordXcodeMarker(e, t);
}
//@ chunk-dsy6gyxv.js:3015-3133 placement
function getTextParts(content) {
  if (typeof content === "string") return [content];
  return Array.isArray(content) ? content.flatMap((t) => (t.type === "text" ? [t.text] : [])) : [];
}
//@ chunk-dsy6gyxv.js:3133-3193 placement
function isIosBuildCommand(command) {
  return IOS_ARTIFACT_EXTENSIONS.test(command) && nestedCommandSpans(command).some((t) => regExp_2.test(t));
}
//@ chunk-dsy6gyxv.js:3193-4911 placement
/**
 * MAX_LOCKFILE_ENTRIES_SCAN：扫描锁文件条数上限；PACKAGE_MANAGER_LOCKFILES：锁文件与包管理器对应表；PIP_INDEX_URL_RE：pip registry/index-url 配置（同一声明共 16 个绑定）。
 */
var MAX_MANIFEST_BYTES = 65536;
var MAX_LOCKFILE_ENTRIES_SCAN = 20;
var PACKAGE_MANAGER_LOCKFILES = [
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
var PIP_INDEX_URL_RE = /(?:registry|index-url)\s*=\s*["']?(https?:\/\/[^\s"'`]+)/g;
var POETRY_UV_SOURCE_URL_RE =
  /\[\[tool\.(?:poetry\.source|uv\.index)\]\][^[]*?url\s*=\s*["'](https?:\/\/[^\s"'`]+)/g;
var YARN_NPM_REGISTRY_RE = /npmRegistryServer\s*:\s*["']?(https?:\/\/[^\s"'`]+)/g;
var CARGO_INDEX_URL_RE = /(?:index|registry)\s*=\s*["']?(?:sparse\+)?(https?:\/\/[^\s"'`]+)/g;
var SECRETS_TOOL_MARKER_RE = /\b(?:VAULT_ADDR|SOPS_[A-Z_]*|op read|aws secretsmanager|gcloud secrets)\b/;
var ANDROID_APPLICATION_PLUGIN_RE =
  /\bcom\.android\.(?:application|library|test|dynamic-feature|tools\.build:gradle)\b/;
var CMAKE_CUDA_RE =
  /\b(?:enable_language\s*\(\s*CUDA|LANGUAGES\b[^)\n]{0,200}\bCUDA\b|find_package\s*\(\s*CUDA|cuda_add_(?:executable|library))/i;
var CONDA_CUDA_PACKAGE_RE =
  /^[^\S\n]*-[^\S\n]*(?:[a-z][\w.-]*::)?(?:cudatoolkit|cuda-toolkit|cudnn|pytorch-cuda)\b/m;
var GRADLE_BUILD_FILES = ["settings.gradle", "settings.gradle.kts", "build.gradle", "build.gradle.kts"];
var CONDA_ENV_FILES = ["environment.yml", "environment.yaml"];
var APPLE_PROJECT_DIRS = ["ios", "iosapp", "macos", "apple"];
var MAX_XCODEPROJ_SCAN = 5;
var MAX_MANIFEST_READ_BYTES = 1048576;
var PUBLIC_REGISTRY_HOSTS = new Set([
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
//@ chunk-dsy6gyxv.js:4911-5378 placement
function detectPrivateRegistry(e) {
  let t = e?.toLowerCase() ?? null;
  if (!t) return "none";
  if (t.includes("jfrog")) return "jfrog";
  if (t.includes("nexus") || t.includes("sonatype")) return "nexus";
  if (t.includes("github")) return "github";
  if (t.includes("gitlab")) return "gitlab";
  if (t === "pkgs.dev.azure.com" || t.endsWith(".visualstudio.com") || t.endsWith(".azure.com"))
    return "azure";
  if (t.endsWith(".amazonaws.com")) return "aws";
  if (t.endsWith(".pkg.dev") || t.endsWith(".googleapis.com")) return "gcp";
  return "other";
}
//@ chunk-dsy6gyxv.js:5378-5510 placement
function extractHostname(e) {
  try {
    let lower = new URL(e).hostname.toLowerCase();
    return lower && /^[a-z0-9.[][a-z0-9.:\]-]*$/.test(lower) ? lower : null;
  } catch {
    return null;
  }
}
//@ chunk-dsy6gyxv.js:5510-5649 placement = isPreapprovedUrl (1)
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
//@ chunk-dsy6gyxv.js:5649-5874 placement
/**
 * 从配置文本中按正则抽取主机名（跳过 # ; 注释行与 crates.io 索引 URL）；与 WebFetch 无关。
 */
function extractRegistryHosts(manifestFile, t) {
  let n = [];
  let joined = manifestFile
    .split(
      `
`,
    )
    .filter((line) => !/^\s*[#;]/.test(line)).join(`
`);
  let regExp = new RegExp(t.source, t.flags);
  for (let r of joined.matchAll(regExp)) {
    if (r[1] === undefined || isCratesIoIndexUrl(r[1])) continue;
    let hostname = extractHostname(r[1]);
    if (hostname !== null) n.push(hostname);
  }
  return n;
}
//@ chunk-dsy6gyxv.js:5874-5992 placement
async function readManifestFile(e, t) {
  try {
    let fileGuarded = await readFileGuarded(join(e, t), MAX_MANIFEST_BYTES, {
      noFollow: true,
    });
    return typeof fileGuarded === "string" ? fileGuarded : null;
  } catch {
    return null;
  }
}
//@ chunk-dsy6gyxv.js:5992-6060 placement
async function isFileAsync(e) {
  try {
    return (await lstat(e)).isFile();
  } catch {
    return false;
  }
}
//@ chunk-dsy6gyxv.js:6060-6622 placement
async function PACKAGE_CONFIG_FILES(e, t, n) {
  let s = [
    ...[".npmrc", "pip.conf", "pyproject.toml", "bunfig.toml"]
      .filter((o) => t.has(o))
      .map((o) => [o, PIP_INDEX_URL_RE]),
    ...(t.has("pyproject.toml") ? [["pyproject.toml", POETRY_UV_SOURCE_URL_RE]] : []),
    ...(t.has(".yarnrc.yml") ? [[".yarnrc.yml", YARN_NPM_REGISTRY_RE]] : []),
    ...(n
      ? [
          [".cargo/config.toml", CARGO_INDEX_URL_RE],
          [".cargo/config", CARGO_INDEX_URL_RE],
        ]
      : []),
  ];
  for (let [o, r] of s) {
    if (o.startsWith(".cargo/") && !(await isFileAsync(join(e, o)))) continue;
    let manifestFile = await readManifestFile(e, o);
    if (manifestFile === null) continue;
    for (let u of extractRegistryHosts(manifestFile, r))
      if (!PUBLIC_REGISTRY_HOSTS.has(u))
        return {
          has_private_registry: true,
          private_registry_host_class: detectPrivateRegistry(u),
        };
  }
  return {
    has_private_registry: false,
    private_registry_host_class: "none",
  };
}
//@ chunk-dsy6gyxv.js:6622-6975 placement
async function SECRETS_TOOL_FILES(e, t) {
  if (
    t.some((s) => {
      let lower = s.toLowerCase();
      return lower === ".sops.yaml" || lower === ".sops.yml";
    })
  )
    return true;
  let sliced = t
    .filter((s) => {
      let lower = s.toLowerCase();
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
  for (let s of sliced) {
    let manifestFile = await readManifestFile(e, s);
    if (manifestFile !== null && SECRETS_TOOL_MARKER_RE.test(manifestFile)) return true;
  }
  return false;
}
//@ chunk-dsy6gyxv.js:6975-7049 placement
async function isDirectoryAsync(e) {
  try {
    return (await lstat(e)).isDirectory();
  } catch {
    return false;
  }
}
//@ chunk-dsy6gyxv.js:7049-7218 placement
async function hasGithubWorkflows(e) {
  try {
    let t = join(e, ".github", "workflows");
    if (!(await isDirectoryAsync(t))) return false;
    return (await readdir(t)).some((s) => s.endsWith(".yml") || s.endsWith(".yaml"));
  } catch {
    return false;
  }
}
//@ chunk-dsy6gyxv.js:7218-7284 placement
function packageManagerFromLockfiles(e) {
  for (let [t, n] of PACKAGE_MANAGER_LOCKFILES) if (e.has(t)) return n;
  return "none";
}
//@ chunk-dsy6gyxv.js:7284-7553 placement
async function detectGradle(dir, t, n) {
  for (let s of GRADLE_BUILD_FILES) {
    if (!t.has(s)) continue;
    let manifestFile = await readManifestFile(dir, s);
    if (manifestFile !== null && ANDROID_APPLICATION_PLUGIN_RE.test(_(manifestFile))) return true;
  }
  if (n) {
    let s = join(dir, "gradle", "libs.versions.toml");
    if (await isFileAsync(s)) {
      let manifestFile = await readManifestFile(dir, "gradle/libs.versions.toml");
      if (manifestFile !== null && ANDROID_APPLICATION_PLUGIN_RE.test(_(manifestFile))) return true;
    }
  }
  return false;
}
//@ chunk-dsy6gyxv.js:7553-7615 placement
function _(manifestFile) {
  return manifestFile.replace(/^[^\S\n]*(?:#|\/\/).*$/gm, "");
}
//@ chunk-dsy6gyxv.js:7615-7836 placement
async function hasMatchingBuildFile(e, t) {
  if (t.has("CMakeLists.txt")) {
    let manifestFile = await readManifestFile(e, "CMakeLists.txt");
    if (manifestFile !== null && CMAKE_CUDA_RE.test(_(manifestFile))) return true;
  }
  for (let n of CONDA_ENV_FILES) {
    if (!t.has(n)) continue;
    let manifestFile = await readManifestFile(e, n);
    if (manifestFile !== null && CONDA_CUDA_PACKAGE_RE.test(_(manifestFile))) return true;
  }
  return false;
}
//@ chunk-dsy6gyxv.js:7836-7989 placement
function hasXcodeProject(fileNames, dirNames) {
  return (
    [...fileNames, ...dirNames].some((n) => {
      let lower = n.toLowerCase();
      return lower.endsWith(".xcodeproj") || lower.endsWith(".xcworkspace");
    }) || fileNames.includes("Podfile")
  );
}
//@ chunk-dsy6gyxv.js:7989-8220 placement
async function listDirEntries(e) {
  let t = await readdir(e, {
    withFileTypes: true,
  }).catch((error) => (isMissingPathError(error) ? [] : null));
  if (t === null) return null;
  return {
    dir: e,
    fileNames: t.filter((n) => n.isFile()).map((n) => n.name),
    dirNames: t.filter((n) => n.isDirectory()).map((n) => n.name),
  };
}
//@ chunk-dsy6gyxv.js:8220-8452 placement
async function readXcodeProject(e) {
  let found = e.fileNames.find((fileName) => fileName.toLowerCase() === "project.pbxproj");
  if (found === undefined) return false;
  let fileGuarded = await readFileGuarded(join(e.dir, found), MAX_MANIFEST_READ_BYTES, {
    noFollow: true,
    fromTail: true,
  });
  if (fileGuarded === "unreadable") return null;
  return fileGuarded !== null && regExp.test(fileGuarded.content);
}
//@ chunk-dsy6gyxv.js:8452-8596 placement
async function isAndroidProjectDir(e) {
  if (e.fileNames.includes("AndroidManifest.xml")) return true;
  return detectGradle(e.dir, new Set(e.fileNames), e.dirNames.includes("gradle"));
}
//@ chunk-dsy6gyxv.js:8596-8869 placement
async function detectAndroidProject(e, fileNames, n) {
  if (
    await isAndroidProjectDir({
      dir: e,
      fileNames,
      dirNames: n,
    })
  )
    return {
      hasAndroidProject: true,
      hasAndroidAppProject: true,
    };
  let found = n.find((r) => r.toLowerCase() === "android");
  let o = found === undefined ? null : await listDirEntries(join(e, found));
  return {
    hasAndroidProject: false,
    hasAndroidAppProject: o !== null && (await isAndroidProjectDir(o)),
  };
}
//@ chunk-dsy6gyxv.js:8869-9445 placement
async function detectXcodeProject(e, fileNames, n) {
  let flattened = APPLE_PROJECT_DIRS.flatMap((c) => {
    let found = n.find((d) => d.toLowerCase() === c);
    return found === undefined ? [] : [join(e, found)];
  });
  let o = [
    ...(await Promise.all(flattened.map(listDirEntries))),
    {
      dir: e,
      fileNames,
      dirNames: n,
    },
  ];
  let included = o.includes(null);
  let filtered = o.filter((c) => c !== null);
  let hasXcodeProject_2 = filtered.some((c) => hasXcodeProject(c.fileNames, c.dirNames));
  let sliced = filtered
    .flatMap((c) =>
      c.dirNames
        .filter((dirName) => dirName.toLowerCase().endsWith(".xcodeproj"))
        .sort()
        .map((dirName) => join(c.dir, dirName)),
    )
    .slice(0, MAX_XCODEPROJ_SCAN);
  for (let c of sliced) {
    let l = await listDirEntries(c);
    let d = l === null ? null : await readXcodeProject(l);
    if (d === true)
      return {
        hasXcodeProject: hasXcodeProject_2,
        hasIosAppProject: true,
      };
    included ||= d === null;
  }
  return {
    hasXcodeProject: hasXcodeProject_2,
    hasIosAppProject: included ? null : false,
  };
}
//@ chunk-dsy6gyxv.js:9445-9887 placement
async function classifyProjectPlatforms(e, t, n, hasXcodeProject, hasAndroidProject) {
  let mapped = t.map((i) => i.toLowerCase());
  if (hasXcodeProject) return "xcode";
  if (hasAndroidProject) return "android";
  if (mapped.some((i) => i.endsWith(".cu") || i.endsWith(".cuh")) || (await hasMatchingBuildFile(e, n)))
    return "cuda";
  if (mapped.some((i) => i.endsWith(".sln") || i.endsWith(".csproj"))) return "dotnet";
  if (
    mapped.some(
      (i) =>
        (i.endsWith(".bat") || i.endsWith(".cmd") || i.endsWith(".ps1")) &&
        i !== "gradlew.bat" &&
        i !== "gradlew.cmd" &&
        i !== "mvnw.bat" &&
        i !== "mvnw.cmd",
    )
  )
    return "windows_scripts";
  return "none";
}
//@ chunk-dsy6gyxv.js:9887-11269 placement
/**
 * 扫描项目根目录得到技术栈事实（锁文件、配置、平台目录）。
 */
async function detectProjectFacts(e) {
  let t = await readdir(e, {
    withFileTypes: true,
  });
  let fileNames = t.filter((a) => a.isFile()).map((a) => a.name);
  let mapped = t.filter((a) => a.isDirectory()).map((a) => a.name);
  let o = new Set(fileNames);
  let mapped_2 = fileNames.map((a) => a.toLowerCase());
  let i = new Set(mapped.map((a) => a.toLowerCase()));
  let [u, m, c, xcodeProject, androidProject] = await Promise.all([
    PACKAGE_CONFIG_FILES(e, o, mapped.includes(".cargo")),
    SECRETS_TOOL_FILES(e, fileNames),
    mapped.includes(".github") ? hasGithubWorkflows(e) : Promise.resolve(false),
    detectXcodeProject(e, fileNames, mapped),
    detectAndroidProject(e, fileNames, mapped),
  ]);
  let osLockedToolchain = await classifyProjectPlatforms(
    e,
    fileNames,
    o,
    xcodeProject.hasXcodeProject,
    androidProject.hasAndroidProject,
  );
  return {
    has_dockerfile: mapped_2.some(
      (a) => a === "dockerfile" || a.startsWith("dockerfile.") || a.endsWith(".dockerfile"),
    ),
    has_compose: mapped_2.some((a) => /^(docker-)?compose(\..+)?\.ya?ml$/.test(a)),
    has_devcontainer: i.has(".devcontainer") || mapped_2.includes(".devcontainer.json"),
    has_nix: ["flake.nix", "default.nix", "shell.nix"].some((a) => o.has(a)),
    has_bazel: ["WORKSPACE", "WORKSPACE.bazel", "MODULE.bazel", "BUILD", "BUILD.bazel", ".bazelrc"].some(
      (a) => o.has(a),
    ),
    lockfile_family: packageManagerFromLockfiles(o),
    has_env_file: mapped_2.some(
      (a) => (a === ".env" || a.startsWith(".env.")) && !/\.(example|sample|template|dist)$/.test(a),
    ),
    has_ci_config:
      c ||
      i.has(".circleci") ||
      i.has(".buildkite") ||
      mapped_2.some((a) =>
        [
          ".gitlab-ci.yml",
          "jenkinsfile",
          "azure-pipelines.yml",
          ".travis.yml",
          "bitbucket-pipelines.yml",
        ].includes(a),
      ),
    ...u,
    has_secrets_manager_refs: m,
    has_xcode_project: xcodeProject.hasXcodeProject,
    has_ios_app_project: xcodeProject.hasIosAppProject,
    has_android_project: androidProject.hasAndroidProject,
    has_android_app_project: androidProject.hasAndroidAppProject,
    os_locked_toolchain: osLockedToolchain,
  };
}
//@ chunk-dsy6gyxv.js:11269-11332 placement
async function detectProjectFactsSafe(e) {
  try {
    return await detectProjectFacts(e);
  } catch {
    return null;
  }
}
//@ chunk-dsy6gyxv.js:11332-11626 placement
async function getProjectFactsForStartup(e) {
  try {
    if (isRemoteSessionAvailable()) return null;
    let gitRoot = findGitRoot(getCwd());
    if (gitRoot === null) return null;
    if (await isHomeDirectoryGitRoot(gitRoot)) return null;
    let markersByRoot = getGitRepoCache().markersByRoot;
    if (e?.fresh === true) markersByRoot.delete(gitRoot);
    let s = memoizeMap(markersByRoot, gitRoot, detectProjectFactsSafe);
    let o = await s;
    if ((o === null || o.has_ios_app_project === null) && markersByRoot.peek(gitRoot) === s)
      markersByRoot.delete(gitRoot);
    return o;
  } catch {
    return null;
  }
}
//@ chunk-dsy6gyxv.js:11626-11638 placement
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
