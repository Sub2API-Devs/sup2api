/**
 * utils/idePathConversion.ts
 *
 * Windows 与 WSL 路径互转（wslpath），供 IDE 集成使用
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/utils/idePathConversion.ts
 * pieces: chunk-q39gsg86.js (3)
 * attribution: placement 2, fingerprint 1
 */
import { execFileNoThrow } from "./execFileNoThrow.js";

//@ chunk-q39gsg86.js:227-357 placement
/**
 * 把 Windows 盘符路径转为 WSL 的 /mnt/<盘符> 路径，非盘符路径返回 null。
 */
function windowsToWslPath(windowsPath) {
  let match = windowsPath.match(/^([A-Z]):(.*)$/i);
  if (!match) return null;
  return `/mnt/${match[1].toLowerCase()}${match[2].replaceAll("\\", "/")}`;
}
//@ chunk-q39gsg86.js:357-846 fingerprint (2.1.88 match: WindowsToWSLConverter, 0.627)
class WindowsToWSLConverter {
  wslDistroName;
  constructor(wslDistroName) {
    this.wslDistroName = wslDistroName;
  }
  async toLocalPath(windowsPath) {
    if (!windowsPath) return windowsPath;
    if (this.wslDistroName) {
      let wslUncMatch = windowsPath.match(/^\\\\wsl(?:\.localhost|\$)\\([^\\]+)(.*)$/);
      if (wslUncMatch && wslUncMatch[1] !== this.wslDistroName) return windowsPath;
    }
    let { stdout, code } = await execFileNoThrow("wslpath", ["-u", windowsPath], {
      useCwd: false,
    });
    let trimmed = stdout.trim();
    if (code === 0 && trimmed) return trimmed;
    return windowsToWslPath(windowsPath) ?? windowsPath.replaceAll("\\", "/");
  }
  async toIDEPath(wslPath) {
    if (!wslPath) return wslPath;
    let { stdout, code } = await execFileNoThrow("wslpath", ["-w", wslPath], {
      useCwd: false,
    });
    let trimmed = stdout.trim();
    if (code === 0 && trimmed) return trimmed;
    return wslPath;
  }
}
//@ chunk-q39gsg86.js:846-953 placement
/**
 * 判断 \\wsl$ 或 \\wsl.localhost 的 UNC 路径是否属于给定 WSL 发行版；不是 WSL 路径时视为匹配。
 */
function checkWSLDistroMatch(windowsPath, wslDistroName) {
  let wslUncMatch = windowsPath.match(/^\\\\wsl(?:\.localhost|\$)\\([^\\]+)(.*)$/);
  if (wslUncMatch) return wslUncMatch[1] === wslDistroName;
  return true;
}
export { windowsToWslPath, checkWSLDistroMatch, WindowsToWSLConverter };
