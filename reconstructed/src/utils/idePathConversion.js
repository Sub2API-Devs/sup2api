/**
 * utils/idePathConversion.ts
 *
 * Windows 与 WSL 路径互转（wslpath），供 IDE 集成使用
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/utils/idePathConversion.ts
 * pieces: chunk-j0y6ypnr.js (3)
 * attribution: placement 2, fingerprint 1
 */
import { execFileNoThrow } from "./execFileNoThrow.js";

//@ chunk-j0y6ypnr.js:227-357 placement
/**
 * 把 Windows 盘符路径转为 WSL 的 /mnt/<盘符> 路径，非盘符路径返回 null。
 */
function windowsToWslPath(t) {
  let match = t.match(/^([A-Z]):(.*)$/i);
  if (!match) return null;
  return `/mnt/${match[1].toLowerCase()}${match[2].replaceAll("\\", "/")}`;
}
//@ chunk-j0y6ypnr.js:357-846 fingerprint = WindowsToWSLConverter (0.627)
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
//@ chunk-j0y6ypnr.js:846-953 placement
/**
 * 判断 \\wsl$ 或 \\wsl.localhost 路径是否属于给定发行版（非 WSL 路径视为匹配）。
 */
function isSameWslDistro(windowsPath, wslDistroName) {
  let wslUncMatch = windowsPath.match(/^\\\\wsl(?:\.localhost|\$)\\([^\\]+)(.*)$/);
  if (wslUncMatch) return wslUncMatch[1] === wslDistroName;
  return true;
}
export { windowsToWslPath, isSameWslDistro, WindowsToWSLConverter };
