/**
 * utils/tmuxSocket.ts
 *
 * tmux socket 名（按 pid）；本模块绝大部分声明实为 WSL/UNC/8.3 短名等路径安全判定与托管设置目录代码（被错配为 execTmux_*）
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/utils/tmuxSocket.ts
 * pieces: chunk-dcmhvw5a.js (1), chunk-e2fknt7w.js (1)
 * attribution: fingerprint 1, file-local 1
 */
import { posix } from "path";
import { getPlatform } from "./platform.js";
import { uniq, count } from "./collections.js";
import { driveMountsForPath } from "./wslMounts.js";
import { WINDOWS_PROFILE_FOLDER_NAMES, foldCaseSimple } from "./windowsProfileFolders.js";

//@ chunk-dcmhvw5a.js:426871-426947 fingerprint (2.1.88 match: execTmux, 1)
function isPosixPlatform() {
  try {
    let platform = getPlatform();
    return platform !== "windows" && platform !== "wsl";
  } catch {
    return false;
  }
}
//@ chunk-e2fknt7w.js:20091-20376 file-local
function getWslWindowsUserDirs(dirs) {
  if (getPlatform() !== "wsl") return [];
  return uniq(
    dirs.flatMap((dir) =>
      driveMountsForPath(posix.normalize(dir)).flatMap((mount) => {
        let filtered = mount.beneath.split("/").filter(Boolean);
        let path = count(mount.within.split("/"), Boolean);
        return filtered.length >= 2 && path <= 2 && WINDOWS_PROFILE_FOLDER_NAMES(foldCaseSimple(filtered[0]))
          ? [[mount.mountPoint, ...filtered.slice(path, 2)].join("/").replace(/^\/\//, "/")]
          : [];
      }),
    ),
  );
}
export { isPosixPlatform, getWslWindowsUserDirs };
