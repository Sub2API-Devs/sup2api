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
import { wt } from "../remote/remoteMode.js";
import { findGitRoot, isHomeDirectoryGitRoot } from "./git.js";
import { getCwd } from "./cwd.js";
import { getGitRepoCache, uut } from "./git/gitRepoCache.js";

//@ chunk-dsy6gyxv.js:509-1657 placement
var ASSIGNMENT_PATTERN_SOURCE = String.raw`(?:\[[^\]\n]{0,100}\]){0,4}["']?\]?[ \t]{0,20}(?:=>|[=:])[ \t]{0,20}[\["' ]{0,8}`,
  w = String.raw`iphone(?:os|simulator)[\d.]{0,12}\b`,
  regExp = new RegExp(
    [
      String.raw`\bSDKROOT${ASSIGNMENT_PATTERN_SOURCE}${w}`,
      String.raw`\bTARGETED_DEVICE_FAMILY${ASSIGNMENT_PATTERN_SOURCE}(?:\d,){0,8}[12]\b`,
      String.raw`\bSUPPORTED_PLATFORMS${ASSIGNMENT_PATTERN_SOURCE}[^;\n]{0,200}?\b${w}`,
    ].join("|"),
  ),
  L = /IPHONEOS_DEPLOYMENT_TARGET|TARGETED_DEVICE_FAMILY/,
  v = /\bimport UIKit\b|#import\s*<UIKit\/|\.iOS\(/,
  x = [".swift", ".m", ".mm", ".h"],
  D = /simctl|devicectl|iphone(?:os|simulator)|platform=iOS|-apple-ios|Simulator/i,
  y = String.raw`-sdk\s+\S*iphone(?:os|simulator)`,
  j = String.raw`(?:"[^"]*"|'[^']*'|[^\s"'])*`,
  regExp_2 = new RegExp(
    String.raw`^(?:(?:\w+=${j}|sudo|time|env|nice|caffeinate|xcrun|timeout\s+\S+|arch\s+-\S+)\s+){0,20}` +
      String.raw`(?:\S*[\\/])?(?:` +
      [
        String.raw`(?:xcrun\s[\s\S]*?)?\b(?:simctl|devicectl)\b`,
        String.raw`xcrun\s[\s\S]*${y}`,
        String.raw`xcodebuild\s[\s\S]*(?:${y}|platform=iOS\b)`,
        String.raw`swift\s+(?:build|test|run)\s[\s\S]*(?:${y}|-triple\s+\S*-apple-ios)`,
        String.raw`open\s[\s\S]*-a\s+["']?Simulator\b`,
      ].join("|") +
      ")",
    "i",
  ),
  M = /\bsimctl\b|-sdk iphonesimulator|-sdk iphoneos|platform=iOS Simulator/,
  W = new Set([FILE_EDIT_TOOL_NAME, FILE_WRITE_TOOL_NAME]);
//@ chunk-dsy6gyxv.js:1657-1737 placement
function Kjs() {
  return { swiftFileEdited: !1, evidence: null, conclusiveEvidence: null };
}
//@ chunk-dsy6gyxv.js:1737-1829 placement
function mOo(e) {
  return e.swiftFileEdited && e.evidence !== null ? e.evidence : e.conclusiveEvidence;
}
//@ chunk-dsy6gyxv.js:1829-1864 placement
function F(e) {
  return mOo(e) !== null;
}
//@ chunk-dsy6gyxv.js:1864-2767 placement
function countToolProgress(e, t) {
  for (let n of t) {
    if (F(e)) return;
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
        if (W.has(o.name)) {
          let i =
            "file_path" in input && typeof input.file_path === "string" ? input.file_path.toLowerCase() : "";
          if (i.endsWith(".swift")) e.swiftFileEdited = !0;
          let any = x.some((m) => i.endsWith(m));
          if ("content" in input) R(e, input.content, any);
          if ("new_string" in input) R(e, input.new_string, any);
        } else if (
          SHELL_TOOL_NAMES.includes(o.name) &&
          "command" in input &&
          typeof input.command === "string"
        ) {
          let i = U(input.command);
          if (i || M.test(input.command)) g(e, "ios_command", i);
        }
      }
    } else if (s.type === "user") {
      if (!Array.isArray(s.message.content)) continue;
      for (let o of s.message.content)
        if (o.type === "tool_result") for (let r of getTextParts(o.content)) A(e, r);
    }
  }
}
//@ chunk-dsy6gyxv.js:2767-2830 placement
function g(e, t, n) {
  if (((e.evidence ??= t), n)) e.conclusiveEvidence ??= t;
}
//@ chunk-dsy6gyxv.js:2830-2925 placement
function A(e, t) {
  if (regExp.test(t)) g(e, "xcode_project", !0);
  else if (L.test(t)) g(e, "xcode_project", !1);
}
//@ chunk-dsy6gyxv.js:2925-3015 placement
function R(e, t, n) {
  if (typeof t !== "string") return;
  if (v.test(t)) g(e, "uikit_import", n);
  A(e, t);
}
//@ chunk-dsy6gyxv.js:3015-3133 placement
function getTextParts(e) {
  if (typeof e === "string") return [e];
  return Array.isArray(e) ? e.flatMap((t) => (t.type === "text" ? [t.text] : [])) : [];
}
//@ chunk-dsy6gyxv.js:3133-3193 placement
function U(e) {
  return D.test(e) && nestedCommandSpans(e).some((t) => regExp_2.test(t));
}
//@ chunk-dsy6gyxv.js:3193-4911 placement
var MAX_MANIFEST_BYTES = 65536,
  z = 20,
  B = [
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
  ],
  H = /(?:registry|index-url)\s*=\s*["']?(https?:\/\/[^\s"'`]+)/g,
  X = /\[\[tool\.(?:poetry\.source|uv\.index)\]\][^[]*?url\s*=\s*["'](https?:\/\/[^\s"'`]+)/g,
  Y = /npmRegistryServer\s*:\s*["']?(https?:\/\/[^\s"'`]+)/g,
  I = /(?:index|registry)\s*=\s*["']?(?:sparse\+)?(https?:\/\/[^\s"'`]+)/g,
  V = /\b(?:VAULT_ADDR|SOPS_[A-Z_]*|op read|aws secretsmanager|gcloud secrets)\b/,
  k = /\bcom\.android\.(?:application|library|test|dynamic-feature|tools\.build:gradle)\b/,
  J =
    /\b(?:enable_language\s*\(\s*CUDA|LANGUAGES\b[^)\n]{0,200}\bCUDA\b|find_package\s*\(\s*CUDA|cuda_add_(?:executable|library))/i,
  q = /^[^\S\n]*-[^\S\n]*(?:[a-z][\w.-]*::)?(?:cudatoolkit|cuda-toolkit|cudnn|pytorch-cuda)\b/m,
  Z = ["settings.gradle", "settings.gradle.kts", "build.gradle", "build.gradle.kts"],
  Q = ["environment.yml", "environment.yaml"],
  ee = ["ios", "iosapp", "macos", "apple"],
  te = 5,
  ne = 1048576,
  oe = new Set([
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
    return !1;
  }
}
/**
 * 从配置文本中按正则抽取主机名（跳过 # ; 注释行与 crates.io 索引 URL）；与 WebFetch 无关。
 */
//@ chunk-dsy6gyxv.js:5649-5874 placement
function extractRegistryHosts(e, t) {
  let n = [],
    joined = e
      .split(
        `
`,
      )
      .filter((r) => !/^\s*[#;]/.test(r)).join(`
`),
    regExp = new RegExp(t.source, t.flags);
  for (let r of joined.matchAll(regExp)) {
    if (r[1] === void 0 || isCratesIoIndexUrl(r[1])) continue;
    let i = extractHostname(r[1]);
    if (i !== null) n.push(i);
  }
  return n;
}
//@ chunk-dsy6gyxv.js:5874-5992 placement
async function readManifestFile(e, t) {
  try {
    let n = await readFileGuarded(join(e, t), MAX_MANIFEST_BYTES, { noFollow: !0 });
    return typeof n === "string" ? n : null;
  } catch {
    return null;
  }
}
//@ chunk-dsy6gyxv.js:5992-6060 placement
async function O(e) {
  try {
    return (await lstat(e)).isFile();
  } catch {
    return !1;
  }
}
//@ chunk-dsy6gyxv.js:6060-6622 placement
async function PACKAGE_CONFIG_FILES(e, t, n) {
  let s = [
    ...[".npmrc", "pip.conf", "pyproject.toml", "bunfig.toml"].filter((o) => t.has(o)).map((o) => [o, H]),
    ...(t.has("pyproject.toml") ? [["pyproject.toml", X]] : []),
    ...(t.has(".yarnrc.yml") ? [[".yarnrc.yml", Y]] : []),
    ...(n
      ? [
          [".cargo/config.toml", I],
          [".cargo/config", I],
        ]
      : []),
  ];
  for (let [o, r] of s) {
    if (o.startsWith(".cargo/") && !(await O(join(e, o)))) continue;
    let i = await readManifestFile(e, o);
    if (i === null) continue;
    for (let u of extractRegistryHosts(i, r))
      if (!oe.has(u))
        return { has_private_registry: !0, private_registry_host_class: detectPrivateRegistry(u) };
  }
  return { has_private_registry: !1, private_registry_host_class: "none" };
}
//@ chunk-dsy6gyxv.js:6622-6975 placement
async function SECRETS_TOOL_FILES(e, t) {
  if (
    t.some((s) => {
      let lower = s.toLowerCase();
      return lower === ".sops.yaml" || lower === ".sops.yml";
    })
  )
    return !0;
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
    .slice(0, z);
  for (let s of sliced) {
    let o = await readManifestFile(e, s);
    if (o !== null && V.test(o)) return !0;
  }
  return !1;
}
//@ chunk-dsy6gyxv.js:6975-7049 placement
async function ue(e) {
  try {
    return (await lstat(e)).isDirectory();
  } catch {
    return !1;
  }
}
//@ chunk-dsy6gyxv.js:7049-7218 placement
async function hasGithubWorkflows(e) {
  try {
    let t = join(e, ".github", "workflows");
    if (!(await ue(t))) return !1;
    return (await readdir(t)).some((s) => s.endsWith(".yml") || s.endsWith(".yaml"));
  } catch {
    return !1;
  }
}
//@ chunk-dsy6gyxv.js:7218-7284 placement
function pe(e) {
  for (let [t, n] of B) if (e.has(t)) return n;
  return "none";
}
//@ chunk-dsy6gyxv.js:7284-7553 placement
async function detectGradle(e, t, n) {
  for (let s of Z) {
    if (!t.has(s)) continue;
    let o = await readManifestFile(e, s);
    if (o !== null && k.test(_(o))) return !0;
  }
  if (n) {
    let s = join(e, "gradle", "libs.versions.toml");
    if (await O(s)) {
      let o = await readManifestFile(e, "gradle/libs.versions.toml");
      if (o !== null && k.test(_(o))) return !0;
    }
  }
  return !1;
}
//@ chunk-dsy6gyxv.js:7553-7615 placement
function _(e) {
  return e.replace(/^[^\S\n]*(?:#|\/\/).*$/gm, "");
}
//@ chunk-dsy6gyxv.js:7615-7836 placement
async function hasMatchingBuildFile(e, t) {
  if (t.has("CMakeLists.txt")) {
    let n = await readManifestFile(e, "CMakeLists.txt");
    if (n !== null && J.test(_(n))) return !0;
  }
  for (let n of Q) {
    if (!t.has(n)) continue;
    let s = await readManifestFile(e, n);
    if (s !== null && q.test(_(s))) return !0;
  }
  return !1;
}
//@ chunk-dsy6gyxv.js:7836-7989 placement
function hasXcodeProject(e, t) {
  return (
    [...e, ...t].some((n) => {
      let lower = n.toLowerCase();
      return lower.endsWith(".xcodeproj") || lower.endsWith(".xcworkspace");
    }) || e.includes("Podfile")
  );
}
//@ chunk-dsy6gyxv.js:7989-8220 placement
async function listDirEntries(e) {
  let t = await readdir(e, { withFileTypes: !0 }).catch((n) => (isMissingPathError(n) ? [] : null));
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
  if (found === void 0) return !1;
  let n = await readFileGuarded(join(e.dir, found), ne, { noFollow: !0, fromTail: !0 });
  if (n === "unreadable") return null;
  return n !== null && regExp.test(n.content);
}
//@ chunk-dsy6gyxv.js:8452-8596 placement
async function isAndroidProjectDir(e) {
  if (e.fileNames.includes("AndroidManifest.xml")) return !0;
  return detectGradle(e.dir, new Set(e.fileNames), e.dirNames.includes("gradle"));
}
//@ chunk-dsy6gyxv.js:8596-8869 placement
async function detectAndroidProject(e, t, n) {
  if (await isAndroidProjectDir({ dir: e, fileNames: t, dirNames: n }))
    return { hasAndroidProject: !0, hasAndroidAppProject: !0 };
  let found = n.find((r) => r.toLowerCase() === "android"),
    o = found === void 0 ? null : await listDirEntries(join(e, found));
  return { hasAndroidProject: !1, hasAndroidAppProject: o !== null && (await isAndroidProjectDir(o)) };
}
//@ chunk-dsy6gyxv.js:8869-9445 placement
async function detectXcodeProject(e, t, n) {
  let flattened = ee.flatMap((c) => {
      let found = n.find((d) => d.toLowerCase() === c);
      return found === void 0 ? [] : [join(e, found)];
    }),
    o = [...(await Promise.all(flattened.map(listDirEntries))), { dir: e, fileNames: t, dirNames: n }],
    included = o.includes(null),
    filtered = o.filter((c) => c !== null),
    any = filtered.some((c) => hasXcodeProject(c.fileNames, c.dirNames)),
    sliced = filtered
      .flatMap((c) =>
        c.dirNames
          .filter((dirName) => dirName.toLowerCase().endsWith(".xcodeproj"))
          .sort()
          .map((l) => join(c.dir, l)),
      )
      .slice(0, te);
  for (let c of sliced) {
    let l = await listDirEntries(c),
      d = l === null ? null : await readXcodeProject(l);
    if (d === !0) return { hasXcodeProject: any, hasIosAppProject: !0 };
    included ||= d === null;
  }
  return { hasXcodeProject: any, hasIosAppProject: included ? null : !1 };
}
//@ chunk-dsy6gyxv.js:9445-9887 placement
async function classifyProjectPlatforms(e, t, n, s, o) {
  let mapped = t.map((i) => i.toLowerCase());
  if (s) return "xcode";
  if (o) return "android";
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
/**
 * 扫描项目根目录得到技术栈事实（锁文件、配置、平台目录）。
 */
//@ chunk-dsy6gyxv.js:9887-11269 placement
async function detectProjectFacts(e) {
  let t = await readdir(e, { withFileTypes: !0 }),
    mapped = t.filter((a) => a.isFile()).map((a) => a.name),
    mapped_2 = t.filter((a) => a.isDirectory()).map((a) => a.name),
    o = new Set(mapped),
    mapped_3 = mapped.map((a) => a.toLowerCase()),
    i = new Set(mapped_2.map((a) => a.toLowerCase())),
    [u, m, c, l, d] = await Promise.all([
      PACKAGE_CONFIG_FILES(e, o, mapped_2.includes(".cargo")),
      SECRETS_TOOL_FILES(e, mapped),
      mapped_2.includes(".github") ? hasGithubWorkflows(e) : Promise.resolve(!1),
      detectXcodeProject(e, mapped, mapped_2),
      detectAndroidProject(e, mapped, mapped_2),
    ]),
    C = await classifyProjectPlatforms(e, mapped, o, l.hasXcodeProject, d.hasAndroidProject);
  return {
    has_dockerfile: mapped_3.some(
      (a) => a === "dockerfile" || a.startsWith("dockerfile.") || a.endsWith(".dockerfile"),
    ),
    has_compose: mapped_3.some((a) => /^(docker-)?compose(\..+)?\.ya?ml$/.test(a)),
    has_devcontainer: i.has(".devcontainer") || mapped_3.includes(".devcontainer.json"),
    has_nix: ["flake.nix", "default.nix", "shell.nix"].some((a) => o.has(a)),
    has_bazel: ["WORKSPACE", "WORKSPACE.bazel", "MODULE.bazel", "BUILD", "BUILD.bazel", ".bazelrc"].some(
      (a) => o.has(a),
    ),
    lockfile_family: pe(o),
    has_env_file: mapped_3.some(
      (a) => (a === ".env" || a.startsWith(".env.")) && !/\.(example|sample|template|dist)$/.test(a),
    ),
    has_ci_config:
      c ||
      i.has(".circleci") ||
      i.has(".buildkite") ||
      mapped_3.some((a) =>
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
    has_xcode_project: l.hasXcodeProject,
    has_ios_app_project: l.hasIosAppProject,
    has_android_project: d.hasAndroidProject,
    has_android_app_project: d.hasAndroidAppProject,
    os_locked_toolchain: C,
  };
}
//@ chunk-dsy6gyxv.js:11269-11332 placement
async function we(e) {
  try {
    return await detectProjectFacts(e);
  } catch {
    return null;
  }
}
//@ chunk-dsy6gyxv.js:11332-11626 placement
async function getProjectFactsForStartup(e) {
  try {
    if (wt()) return null;
    let t = findGitRoot(getCwd());
    if (t === null) return null;
    if (await isHomeDirectoryGitRoot(t)) return null;
    let markersByRoot = getGitRepoCache().markersByRoot;
    if (e?.fresh === !0) markersByRoot.delete(t);
    let s = uut(markersByRoot, t, we),
      o = await s;
    if ((o === null || o.has_ios_app_project === null) && markersByRoot.peek(t) === s)
      markersByRoot.delete(t);
    return o;
  } catch {
    return null;
  }
}
//@ chunk-dsy6gyxv.js:11626-11638 placement
var qjs = 500;

export { getProjectFactsForStartup, qjs, Kjs, countToolProgress, mOo };
