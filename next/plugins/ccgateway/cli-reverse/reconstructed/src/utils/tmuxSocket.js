/**
 * utils/tmuxSocket.ts
 *
 * tmux socket 名（按 pid）；本模块绝大部分声明实为 WSL/UNC/8.3 短名等路径安全判定与托管设置目录代码（被错配为 execTmux_*）
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/utils/tmuxSocket.ts
 * pieces: chunk-2214fejy.js (1)
 * attribution: fingerprint 1
 */
import { getPlatform } from "./platform.js";
import {
  windowsProfileRoots,
  isRootOrSensitiveProfileAncestor,
} from "../services/remoteTools/mountSafety.js";

//@ chunk-2214fejy.js:20379-20456 fingerprint (2.1.88 match: execTmux, 1)
function touchesWindowsRootFromWsl(args, opts) {
  if (getPlatform() !== "wsl") return false;
  return args.some((arg) => windowsProfileRoots(arg, opts).some(isRootOrSensitiveProfileAncestor));
}
export { touchesWindowsRootFromWsl };
