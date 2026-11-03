/**
 * utils/nativeInstaller/packageManagers.ts
 *
 * 识别包管理器安装（Homebrew、winget、apt/dnf、mise/asdf 等）
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/utils/nativeInstaller/packageManagers.ts
 * pieces: chunk-hntsfzas.js (3), chunk-x4gcvpxy.js (4)
 * attribution: fingerprint 4, placement 3
 */
import { open, stat, mkdir, writeFile, link, unlink, readFile } from "fs/promises";
import { join } from "path";
import { getXDGDataHome } from "../xdg.js";
import { jbo } from "../deepLink/registerProtocol.js";
import { makeTempSiblingPath, retryFsOp } from "../atomicPublishWrite.js";
import { getPlatform } from "../platform.js";
import { env } from "../env.js";
import { isStandaloneExecutable } from "../slowOperations.js";
import { compactEnvObject } from "../safeObject.js";
import { logForDebugging } from "../debug.js";
import { HostScoped } from "../hostScoped.js";
import { execFileNoThrow } from "../execFileNoThrow.js";

/**
 * Mach-O load command LC_SEGMENT_64（25）。
 */
//@ chunk-x4gcvpxy.js:565-574 placement
var LC_SEGMENT_64 = 25;
/**
 * 解析 Mach-O 头，从 __info_plist 节读出可执行文件内嵌的 Info.plist。
 */
//@ chunk-x4gcvpxy.js:574-1111 placement
async function readEmbeddedInfoPlist(s) {
  let fd = await open(s, "r");
  try {
    let header = Buffer.alloc(32);
    await fd.read(header, 0, header.length, 0);
    let loadCommands = Buffer.alloc(header.readUInt32LE(20));
    await fd.read(loadCommands, 0, loadCommands.length, header.length);
    for (let offset = 0; offset < loadCommands.length; offset += loadCommands.readUInt32LE(offset + 4)) {
      if (loadCommands.readUInt32LE(offset) !== LC_SEGMENT_64) continue;
      let uInt32LE = loadCommands.readUInt32LE(offset + 64);
      for (let sectionIndex = 0; sectionIndex < uInt32LE; sectionIndex++) {
        let sectionOffset = offset + 72 + sectionIndex * 80;
        if (
          loadCommands.toString("latin1", sectionOffset, sectionOffset + 16) !==
          "__info_plist\x00\x00\x00\x00"
        )
          continue;
        let alloc = Buffer.alloc(Number(loadCommands.readBigUInt64LE(sectionOffset + 40)));
        return (await fd.read(alloc, 0, alloc.length, loadCommands.readUInt32LE(sectionOffset + 48)), alloc);
      }
    }
    return null;
  } finally {
    await fd.close();
  }
}
/**
 * （误归 deepLink）在 XDG data 下建 ClaudeCode.app：写内嵌 Info.plist、把当前可执行文件硬链接为 Contents/MacOS/claude，返回路径；失败返回 null。
 */
//@ chunk-x4gcvpxy.js:1111-1560 placement = MACOS_SYMLINK_PATH (0.623)
async function ensureMacAppBundleLink() {
  let s = join(getXDGDataHome(), "claude");
  if (!jbo()) return null;
  let macosDir = join(s, "ClaudeCode.app", "Contents", "MacOS"),
    appBinaryPath = join(macosDir, "claude");
  try {
    let infoPlist = await readEmbeddedInfoPlist(process.execPath);
    if (infoPlist === null) return null;
    let ino = (await stat(process.execPath)).ino;
    (await mkdir(macosDir, { recursive: !0 }),
      await writeFile(join(macosDir, "..", "Info.plist"), infoPlist));
    try {
      if ((await stat(appBinaryPath)).ino === ino) return appBinaryPath;
    } catch {}
    let tempPath = makeTempSiblingPath(appBinaryPath);
    await link(process.execPath, tempPath);
    try {
      await retryFsOp(tempPath, appBinaryPath);
    } finally {
      await unlink(tempPath).catch(() => {});
    }
    return appBinaryPath;
  } catch {
    return null;
  }
}
/**
 * macOS 上为后台进程准备稳定路径/TCC 相关处理（切分可疑：旧版名 detectHomebrew 不符）。
 */
//@ chunk-x4gcvpxy.js:1560-2021 fingerprint = detectHomebrew (0.303)
async function detectHomebrew() {
  if (getPlatform() !== "macos") return;
  if (env.CLAUDE_BG_TCC_DISCLAIMED) {
    delete process.env.CLAUDE_BG_TCC_DISCLAIMED;
    return;
  }
  let execPath =
      (env.CLAUDE_PTY_HOST_NO_STABLE_PATH === "1" || env.CLAUDE_CODE_DISABLE_BG_STABLE_PATH
        ? null
        : await ensureMacAppBundleLink()) ?? process.execPath,
    t = [...(isStandaloneExecutable() ? [execPath] : [execPath, process.argv[1]]), ...process.argv.slice(2)],
    r = compactEnvObject(process.env);
  ((r.CLAUDE_BG_TCC_DISCLAIMED = "1"), delete r.CLAUDE_PTY_HOST_NO_STABLE_PATH);
  try {
    process.execve(execPath, t, r, { macDisclaimResponsibility: !0 });
  } catch {}
}
//@ chunk-hntsfzas.js:2480-2555 fingerprint = isDistroFamily (1)
function isDistroFamily(osRelease, families) {
  return families.includes(osRelease.id) || osRelease.idLike.some((like) => families.includes(like));
}
//@ chunk-hntsfzas.js:2555-4839 fingerprint = getPackageManager (0.31)
class getPackageManager {
  sources;
  osRelease;
  pacman;
  deb;
  rpm;
  apk;
  packageManager;
  constructor(e) {
    this.sources = e;
  }
  getOsRelease() {
    return (this.osRelease ??= this.sources.readOsRelease().then(
      (e) => {
        let match = e.match(/^ID=["']?(\S+?)["']?\s*$/m),
          match_2 = e.match(/^ID_LIKE=["']?(.+?)["']?\s*$/m);
        return { id: match?.[1] ?? "", idLike: match_2?.[1]?.split(" ") ?? [] };
      },
      () => null,
    ));
  }
  detectPacman() {
    return (this.pacman ??= this.ownsExecutable(["arch"], "pacman", ["-Qo"]));
  }
  detectDeb() {
    return (this.deb ??= this.ownsExecutable(["debian"], "dpkg", ["-S"]));
  }
  detectRpm() {
    return (this.rpm ??= this.ownsExecutable(["fedora", "rhel", "suse"], "rpm", ["-qf"]));
  }
  detectApk() {
    return (this.apk ??= this.ownsExecutable(["alpine"], "apk", ["info", "--who-owns"]));
  }
  async ownsExecutable(e, n, a) {
    if (this.sources.platform() !== "linux") return !1;
    let osRelease = await this.getOsRelease();
    if (osRelease && !isDistroFamily(osRelease, e)) return !1;
    let execFileNoThrow = await this.sources.execFileNoThrow(n, [...a, this.sources.execPath()], {
      timeout: 5000,
      useCwd: !1,
      useToolMemoryCgroup: !1,
    });
    if (execFileNoThrow.code === 0 && execFileNoThrow.stdout)
      return (logForDebugging(`Detected ${n} installation: ${execFileNoThrow.stdout.trim()}`), !0);
    return !1;
  }
  detectHomebrew() {
    let platform = this.sources.platform();
    if (platform !== "macos" && platform !== "linux" && platform !== "wsl") return !1;
    let execPath = this.sources.execPath();
    if (execPath.includes("/Caskroom/"))
      return (logForDebugging(`Detected Homebrew cask installation: ${execPath}`), !0);
    return !1;
  }
  getHomebrewCaskName() {
    return this.sources.execPath().match(/\/Caskroom\/([^/]+)\//)?.[1] ?? null;
  }
  detectWinget() {
    if (this.sources.platform() !== "windows") return !1;
    let execPath = this.sources.execPath();
    for (let n of [/Microsoft[/\\]WinGet[/\\]Packages/i, /Microsoft[/\\]WinGet[/\\]Links/i])
      if (n.test(execPath)) return (logForDebugging(`Detected winget installation: ${execPath}`), !0);
    return !1;
  }
  detectMise() {
    let execPath = this.sources.execPath();
    if (/[/\\]mise[/\\]installs[/\\]/i.test(execPath))
      return (logForDebugging(`Detected mise installation: ${execPath}`), !0);
    return !1;
  }
  detectAsdf() {
    let execPath = this.sources.execPath();
    if (/[/\\]\.?asdf[/\\]installs[/\\]/i.test(execPath))
      return (logForDebugging(`Detected asdf installation: ${execPath}`), !0);
    return !1;
  }
  getPackageManager() {
    return (this.packageManager ??= this.detectPackageManager());
  }
  async detectPackageManager() {
    if (this.detectHomebrew()) return "homebrew";
    if (this.detectWinget()) return "winget";
    if (this.detectMise()) return "mise";
    if (this.detectAsdf()) return "asdf";
    if (await this.detectPacman()) return "pacman";
    if (await this.detectApk()) return "apk";
    if (await this.detectDeb()) return "deb";
    if (await this.detectRpm()) return "rpm";
    return "unknown";
  }
}
//@ chunk-hntsfzas.js:4839-4993 fingerprint = getOsRelease (0.424)
var getOsRelease = new HostScoped(
  () =>
    new getPackageManager({
      platform: getPlatform,
      readOsRelease: () => readFile("/etc/os-release", "utf8"),
      execFileNoThrow: execFileNoThrow,
      execPath: () => process.execPath || process.argv[0] || "",
    }),
);

export { getOsRelease, detectHomebrew };
