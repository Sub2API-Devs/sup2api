/**
 * utils/idePathConversion.ts
 *
 * Windows 与 WSL 路径互转（wslpath），供 IDE 集成使用
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/utils/idePathConversion.ts
 * pieces: chunk-j0y6ypnr.js (2)
 * attribution: placement 1, fingerprint 1
 */
import { execFileNoThrow } from "./execFileNoThrow.js";

/**
 * 把 Windows 盘符路径转为 WSL 的 /mnt/<盘符> 路径，非盘符路径返回 null。
 */
//@ chunk-j0y6ypnr.js:227-357 placement
function windowsToWslPath(t) {
  let match = t.match(/^([A-Z]):(.*)$/i);
  if (!match) return null;
  return `/mnt/${match[1].toLowerCase()}${match[2].replaceAll("\\", "/")}`;
}
//@ chunk-j0y6ypnr.js:357-846 fingerprint = WindowsToWSLConverter (0.627)
class WindowsToWSLConverter {
  wslDistroName;
  constructor(t) {
    this.wslDistroName = t;
  }
  async toLocalPath(t) {
    if (!t) return t;
    if (this.wslDistroName) {
      let match = t.match(/^\\\\wsl(?:\.localhost|\$)\\([^\\]+)(.*)$/);
      if (match && match[1] !== this.wslDistroName) return t;
    }
    let { stdout: stdout, code: code } = await execFileNoThrow("wslpath", ["-u", t], { useCwd: !1 }),
      trimmed = stdout.trim();
    if (code === 0 && trimmed) return trimmed;
    return windowsToWslPath(t) ?? t.replaceAll("\\", "/");
  }
  async toIDEPath(t) {
    if (!t) return t;
    let { stdout: stdout, code: code } = await execFileNoThrow("wslpath", ["-w", t], { useCwd: !1 }),
      trimmed = stdout.trim();
    if (code === 0 && trimmed) return trimmed;
    return t;
  }
}

export { windowsToWslPath, WindowsToWSLConverter };
