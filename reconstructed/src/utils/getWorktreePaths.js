/**
 * utils/getWorktreePaths.ts
 *
 * git worktree list --porcelain 获取全部 worktree 路径（当前 worktree 排第一），打 tengu_worktree_detection
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/utils/getWorktreePaths.ts
 * pieces: chunk-e6aww6q8.js (1)
 * attribution: fingerprint 1
 */
import {
  sep,
  sep as sep_2,
  sep as sep_3,
  sep as sep_4,
  sep as sep_5,
  sep as sep_6,
  sep as sep_7,
  sep as sep_8,
  sep as sep_9,
  sep as sep_10,
  sep as sep_11,
  sep as sep_12,
  sep as sep_13,
  sep as sep_14,
  sep as sep_15,
  sep as sep_16,
  sep as sep_17,
  sep as sep_18,
  sep as sep_19,
  sep as sep_20,
  sep as sep_21,
  sep as sep_22,
  sep as sep_23,
  sep as sep_24,
  sep as sep_25,
  sep as sep_26,
  sep as sep_27,
  sep as sep_28,
  sep as sep_29,
  sep as sep_30,
  sep as sep_31,
  sep as sep_32,
  sep as sep_33,
  sep as sep_34,
  sep as sep_35,
  sep as sep_36,
  sep as sep_37,
  sep as sep_38,
  sep as sep_39,
  sep as sep_40,
  sep as sep_41,
  sep as sep_42,
  sep as sep_43,
  sep as sep_44,
  sep as sep_45,
  sep as sep_46,
  sep as sep_47,
  sep as sep_48,
  sep as sep_49,
  sep as sep_50,
  sep as sep_51,
  sep as sep_52,
  sep as sep_53,
  sep as sep_54,
  sep as sep_55,
  sep as sep_56,
  sep as sep_57,
  sep as sep_58,
  sep as sep_59,
  sep as sep_60,
  sep as sep_61,
  sep as sep_62,
  sep as sep_63,
  sep as sep_64,
  sep as sep_65,
  sep as sep_66,
  sep as sep_67,
  sep as sep_68,
  sep as sep_69,
  sep as sep_70,
  sep as sep_71,
  sep as sep_72,
  sep as sep_73,
} from "path";
import { execFileNoThrowWithCwd } from "./execFileNoThrow.js";
import { gitExe } from "./git.js";
import { Mn } from "./pathClassification.js";
import { logEvent } from "../services/analytics/index.js";

/**
 * getWorktreePaths：git worktree list --porcelain（禁用 hooksPath 与 fsmonitor），当前 worktree 排第一，打 tengu_worktree_detection。
 */
//@ chunk-e6aww6q8.js:224033-224638 fingerprint = getWorktreePaths (0.803)
async function getWorktreePaths(cwd) {
  let startTime = Date.now(),
    { stdout: stdout, code: code } = await execFileNoThrowWithCwd(
      gitExe(),
      ["-c", "core.hooksPath=/dev/null", "-c", "core.fsmonitor=", "worktree", "list", "--porcelain"],
      { cwd: cwd, preserveOutputOnError: !1 },
    ),
    h = null;
  if (code === 0)
    h = stdout
      .split(
        `
`,
      )
      .filter((line) => line.startsWith("worktree "))
      .map((line) => Mn(line.slice(9)));
  let y = Date.now() - startTime;
  if (h === null)
    return (logEvent("tengu_worktree_detection", { duration_ms: y, worktree_count: 0, success: !1 }), []);
  logEvent("tengu_worktree_detection", { duration_ms: y, worktree_count: h.length, success: !0 });
  let currentWorktree = h.find((path) => cwd === path || cwd.startsWith(path + sep_3)),
    otherWorktrees = h.filter((path) => path !== currentWorktree).sort((L, G) => L.localeCompare(G));
  return currentWorktree ? [currentWorktree, ...otherWorktrees] : otherWorktrees;
}

export { getWorktreePaths };
