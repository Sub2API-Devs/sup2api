/**
 * utils/toolchainDetection.ts
 *
 * 2.1.316 新增：本机工具链探测（语言运行时、包管理器）。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-3dq9c61y.js (18)
 * attribution: placement 18
 */
import { release } from "os";
import { readdir, readFile, stat } from "fs/promises";
import { join } from "path";
import { BUILD_TOOL_NAMES, scanPathForExecutables, env, w_s } from "./env.js";
import { DoctorLazy } from "../cli/handlers/util.js";
import { u, o } from "../../vendor/zod/v4/classic/schemas.js";
import { getFeatureValue_CACHED_MAY_BE_STALE } from "../services/analytics/growthbook.js";
import { mct } from "./settings/types.js";
import {
  getAllPolicyTierSettings,
  getSettingsForSource,
  getSettingsForSourceTightenOnly,
  getPolicySettingsLoadErrors,
  getSettingsParseErrorsForSource,
} from "./settings/settings.js";
import { REPO_DIR_SETTING_SOURCE_LIST, isSettingSourceEnabled } from "./settings/constants.js";
import { REMOTECONTROL_SHAREHOSTPROFILE } from "./settings/hooksValidation.js";
import { n1e, mdmReadSnapshot, GOe } from "./settings/mdm/settings.js";
import { or } from "./settings/commandSyncNames.js";
import { logError } from "./log.js";
import { logEvent } from "../services/analytics/index.js";
import { lit, fromEnumOpt } from "../services/analytics/safeMetadata.js";
import { logFeatureOk, logFeatureSad, logFeatureBad } from "../services/analytics/featureTelemetry.js";
import { withDeadline, raceWithAbortSignal } from "./sleep.js";
import { AbortError, errorMessage } from "./errors.js";
import { getPlatform, Iwr } from "./platform.js";
import { readSmallFileOrNull } from "./readSmallFile.js";
import { parsePlistXml, pNt } from "./plistParser.js";
import { safeParseJSON } from "./json.js";
import { MCP_SETTINGS_SCOPES, getMcpConfigsByScope } from "../services/mcp/config.js";
import { logForDebugging } from "./debug.js";
import { TOOL_HOST_ID_RE } from "../remote/tools/protocolConstants.js";
import { uniq } from "./collections.js";

/**
 * 主机工具链探测的常量：截止时间、读取上限、工具数上限、版本/名字正则、要找的工具列表与系统路径。
 */
//@ chunk-3dq9c61y.js:1129-1856 placement
var HOST_PROFILE_DEADLINE_MS = 1500,
  A = 262144,
  X = 32,
  B = 16,
  w = /^[0-9][0-9A-Za-z.+_-]{0,23}$/,
  j = /^[a-z0-9_]{1,16}$/,
  U = /^[a-z0-9._-]{1,24}$/,
  J = /^[A-Za-z0-9_.-]{1,64}$/,
  G = [
    "swift",
    "xcodebuild",
    "xcrun",
    "pod",
    "fastlane",
    "carthage",
    "adb",
    "emulator",
    "sdkmanager",
    "flutter",
    "dart",
    "xcodes",
    "kubectl",
    "helm",
    "terraform",
    "bazel",
    "bazelisk",
    "nix",
    "conda",
    "mamba",
    "pipx",
    "podman",
    "nerdctl",
    "nvidia-smi",
    "psql",
    "mysql",
    "redis-cli",
    ...BUILD_TOOL_NAMES,
  ],
  Y = new Set([
    "xcodebuild",
    "swift",
    "swiftc",
    "xcrun",
    "git",
    "make",
    "clang",
    "clang++",
    "gcc",
    "g++",
    "python3",
    "pip3",
  ]),
  q = "/System/Library/CoreServices/SystemVersion.plist",
  y = "/Applications",
  W = "/Library/Developer/CommandLineTools/usr/bin",
  Z = "/usr/local/cuda/version.json",
  K = "/proc/driver/nvidia/version",
  Q = DoctorLazy(() => u({ cuda: u({ version: o() }) }));
//@ chunk-3dq9c61y.js:1856-1947 placement
function M() {
  let n = getFeatureValue_CACHED_MAY_BE_STALE("tengu_bridge_host_profile", "off");
  return mct.find((e) => e === n) ?? "off";
}
/**
 * 按设置决定远程控制是否分享主机档案（off/basic/full）；相关设置解析出错时为 off。
 */
//@ chunk-3dq9c61y.js:1947-2244 placement
function hostProfileSharing(n) {
  if (hostProfileSettingsBroken()) return "off";
  let e = (s) => s?.remoteControl?.shareHostProfile,
    mapped = [
      ...getAllPolicyTierSettings(),
      getSettingsForSource("policySettings"),
      getSettingsForSource("flagSettings"),
      getSettingsForSource("userSettings"),
    ].map(e),
    S = mct.find((s) => mapped.includes(s)) ?? n,
    c = [
      S,
      e(getSettingsForSourceTightenOnly("userSettings")),
      ...REPO_DIR_SETTING_SOURCE_LIST.filter(isSettingSourceEnabled).map((s) => e(getSettingsForSource(s))),
    ];
  return mct.find((s) => c.includes(s)) ?? S;
}
//@ chunk-3dq9c61y.js:2244-2535 placement
function hostProfileSettingsBroken() {
  return [
    ...getPolicySettingsLoadErrors(),
    ...getSettingsParseErrorsForSource("flagSettings"),
    ...getSettingsParseErrorsForSource("userSettings"),
    ...REPO_DIR_SETTING_SOURCE_LIST.filter(isSettingSourceEnabled).flatMap((e) =>
      getSettingsParseErrorsForSource(e),
    ),
  ].some((e) => {
    if (e.path === "") return !0;
    if (e.statusOnly) return !1;
    if (e.severity !== "warning") return !0;
    return (
      e.path === REMOTECONTROL_SHAREHOSTPROFILE ||
      e.path === "remoteControl" ||
      e.path.startsWith("remoteControl.")
    );
  });
}
/**
 * 重新注册环境前按主机档案分享设置过滤（basic 时去掉 MCP 服务器列表，off 时不分享）。
 */
//@ chunk-3dq9c61y.js:2535-2946 placement
async function filterSharedEnvironment(n) {
  if (n === void 0) return;
  try {
    let e = M();
    if (e === "off") return;
    let r = await n1e();
    or();
    let S = hostProfileSharing(e),
      c = mdmReadSnapshot(),
      s;
    GOe(r.mdm, r.hkcu, r.wslInherits, r.whereAsked);
    try {
      (or(), (s = hostProfileSharing(e)));
    } finally {
      (GOe(c.mdm, c.hkcu, c.wslInherits, c.whereAsked), or());
    }
    let _ = mct.find((P) => P === S || P === s) ?? "off";
    if (_ === "off") return;
    if (_ === "basic" && n.mcp_servers !== void 0) {
      let { mcp_servers: mcp_servers, ...h } = n;
      return h;
    }
    return n;
  } catch (error) {
    logError(error);
    return;
  }
}
/**
 * 若允许分享，收集主机档案（full 时包含 MCP 服务器）。
 */
//@ chunk-3dq9c61y.js:2946-3178 placement
async function collectHostProfileIfShared(n) {
  try {
    let e = M();
    if (e === "off") return;
    let r = hostProfileSharing(e);
    if (r === "off") {
      logEvent("tengu_bridge_host_profile_collect", { outcome: lit("disabled") });
      return;
    }
    return await collectHostProfile({ includeMcpServers: r === "full", signal: n });
  } catch (error) {
    logError(error);
    return;
  }
}
/**
 * 收集主机档案并上报结果遥测。
 */
//@ chunk-3dq9c61y.js:3178-3837 placement
async function collectHostProfile({ includeMcpServers: includeMcpServers, signal: signal }) {
  let now = Date.now(),
    S = hostPlatform();
  try {
    let c = await gatherHostProfile({ includeMcpServers: includeMcpServers, signal: signal });
    if (c === void 0) return;
    let { profile: profile, complete: complete, aborted: aborted } = c;
    if (
      (logEvent("tengu_bridge_host_profile_collect", {
        outcome: complete ? lit("ok") : aborted ? lit("aborted") : lit("partial"),
        duration_ms: Date.now() - now,
        tools_count: profile.tools.length,
        mcp_count: profile.mcp_servers?.length ?? 0,
        platform: fromEnumOpt(S),
        arch: fromEnumOpt("x64"),
        wsl: profile.wsl === !0,
      }),
      complete)
    )
      logFeatureOk("bridge_host_profile");
    else if (!aborted) logFeatureSad("bridge_host_profile", "deadline");
    return profile;
  } catch (error) {
    (logError(error),
      logEvent("tengu_bridge_host_profile_collect", {
        outcome: lit("error"),
        duration_ms: Date.now() - now,
        platform: fromEnumOpt(S),
        arch: fromEnumOpt("x64"),
      }),
      logFeatureBad("bridge_host_profile", "error"));
    return;
  }
}
/**
 * 在截止时间内收集主机档案：系统版本、发行版、PATH 中的工具、Xcode/Android SDK/CUDA 与可选的 MCP 服务器。
 */
//@ chunk-3dq9c61y.js:3837-4581 placement
async function gatherHostProfile({
  includeMcpServers: includeMcpServers,
  signal: signal,
  alsoLookFor: alsoLookFor = [],
  maxTools: maxTools = X,
}) {
  let c = hostPlatform();
  if (c === void 0) return;
  let s = [...G, ...alsoLookFor],
    _ = { pathTools: new Set(), mcpServers: [] },
    P = [detectOsVersion(c, _), detectAndroidSdk(_), scanPathForExecutables(s, _.pathTools)];
  if (c === "darwin") P.push(detectXcode(_), ne(_));
  if (c === "linux") P.push(detectCuda(_));
  if (includeMcpServers) P.push(collectMcpServerNames(_));
  let h = withDeadline(
      Promise.all(
        P.map((E) =>
          E.catch((C) => {
            logError(C);
          }),
        ),
      ).then(() => !0),
      HOST_PROFILE_DEADLINE_MS,
    ).then((E) => E === !0),
    O = !1,
    x =
      signal === void 0
        ? await h
        : await raceWithAbortSignal(h, signal, () => new AbortError()).catch(() => ((O = !0), !1));
  return {
    profile: {
      platform: c,
      ...(j.test("x64") && { arch: "x64" }),
      ...(_.osVersion !== void 0 && { os_version: _.osVersion }),
      ...(_.distro !== void 0 && { distro: _.distro }),
      ...(getPlatform() === "wsl" && { wsl: !0 }),
      tools: orderHostTools(c, _, s, maxTools),
      ...(includeMcpServers && { mcp_servers: _.mcpServers.slice(0, B) }),
      collected_at: new Date().toISOString(),
    },
    complete: x,
    aborted: O,
  };
}
/**
 * （误归 deepLink）平台名常量折叠函数，linux 构建恒返回 "linux"。
 */
//@ chunk-3dq9c61y.js:4581-4677 placement = detectTerminal (0.92)
function hostPlatform() {
  switch ("linux") {
    case "darwin":
    case "linux":
    case "win32":
      return "linux";
    default:
      return;
  }
}
/**
 * 探测系统版本与发行版。
 */
//@ chunk-3dq9c61y.js:4677-5020 placement
async function detectOsVersion(n, e) {
  switch (n) {
    case "darwin":
      e.osVersion = await readPlistVersion(q, "ProductVersion");
      return;
    case "linux": {
      let r = await Iwr();
      if (r?.linuxDistroVersion && w.test(r.linuxDistroVersion)) e.osVersion = r.linuxDistroVersion;
      let S = r?.linuxDistroId?.toLowerCase();
      if (S && U.test(S)) e.distro = S;
      return;
    }
    case "win32": {
      let r = release();
      if (w.test(r)) e.osVersion = r;
      return;
    }
  }
}
//@ chunk-3dq9c61y.js:5020-5162 placement
async function readPlistVersion(n, e) {
  let r = await readSmallFileOrNull(n, A);
  if (r === null) return;
  let S = parsePlistXml(r),
    c = pNt(S) ? S[e] : void 0;
  return typeof c === "string" && w.test(c) ? c : void 0;
}
/**
 * 探测 Xcode 版本。
 */
//@ chunk-3dq9c61y.js:5162-5501 placement
async function detectXcode(n) {
  let e;
  try {
    e = await readdir(y);
  } catch {
    return;
  }
  let sorted = e
    .filter((s) => /^Xcode.*\.app$/.test(s))
    .sort((s, _) => _.localeCompare(s, void 0, { numeric: !0 }));
  if (sorted.length === 0) return;
  let S = sorted.includes("Xcode.app") ? "Xcode.app" : sorted[0],
    c = await readPlistVersion(join(y, S, "Contents", "version.plist"), "CFBundleShortVersionString");
  n.xcode = c === void 0 ? "xcode" : `xcode@${c}`;
}
//@ chunk-3dq9c61y.js:5501-5548 placement
async function ne(n) {
  if (await D(W)) n.clt = "clt";
}
//@ chunk-3dq9c61y.js:5548-5686 placement
async function detectAndroidSdk(n) {
  let e = env.ANDROID_HOME ?? env.ANDROID_SDK_ROOT;
  if (e === void 0 || !(await w_s(e)) || !(await D(e))) return;
  n.androidSdk = "android-sdk";
}
//@ chunk-3dq9c61y.js:5686-5904 placement
async function detectCuda(n) {
  let e = await readSmallFileOrNull(Z, A);
  if (e !== null) {
    let safeParse = Q().safeParse(safeParseJSON(e, !1));
    n.cuda =
      safeParse.success && w.test(safeParse.data.cuda.version)
        ? `cuda@${safeParse.data.cuda.version}`
        : "cuda";
    return;
  }
  try {
    (await readFile(K, "utf8"), (n.cuda = "cuda"));
  } catch {}
}
//@ chunk-3dq9c61y.js:5904-5977 placement
async function D(n) {
  try {
    return (await stat(n)).isDirectory();
  } catch {
    return !1;
  }
}
/**
 * 收集用户与托管范围的 MCP 服务器名。
 */
//@ chunk-3dq9c61y.js:5977-6341 placement
async function collectMcpServerNames(n) {
  let e = new Set();
  for (let r of MCP_SETTINGS_SCOPES) {
    if (r === "project") continue;
    let S;
    try {
      S = Object.keys(getMcpConfigsByScope(r, { expandVars: !1 }).servers);
    } catch (error) {
      logForDebugging(`[bridge:host-profile] could not read ${r} MCP config: ${errorMessage(error)}`, {
        level: "warn",
      });
      continue;
    }
    let c = r === "managed" ? "enterprise" : r;
    for (let s of S) {
      if (!J.test(s) || e.has(s)) continue;
      (e.add(s), n.mcpServers.push({ name: s, scope: c }));
    }
  }
}
//@ chunk-3dq9c61y.js:6341-6625 placement
function orderHostTools(n, e, r, S) {
  let c = n !== "darwin" || e.xcode !== void 0 || e.clt !== void 0,
    filtered = r.filter((P) => e.pathTools.has(P) && (c || !Y.has(P))),
    filtered_2 = [
      e.xcode,
      e.clt,
      ...filtered.filter((P) => P === "swift"),
      e.androidSdk,
      e.cuda,
      ...filtered.filter((P) => P !== "swift"),
    ].filter((P) => P !== void 0 && TOOL_HOST_ID_RE.test(P));
  return uniq(filtered_2).slice(0, S);
}

export { collectHostProfileIfShared, filterSharedEnvironment, hostProfileSharing, gatherHostProfile };
