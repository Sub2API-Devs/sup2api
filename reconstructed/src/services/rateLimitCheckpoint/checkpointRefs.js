/**
 * services/rateLimitCheckpoint/checkpointRefs.ts
 *
 * 2.1.316 新增：限流检查点 git 引用
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-89f54s6c.js (3)
 * attribution: placement 3
 */
import { promisify } from "util";
import { close } from "fs";
import { SandboxManager } from "../../utils/sandbox/sandbox-adapter.js";
import { gitExe } from "../../utils/git.js";
import { buildSafeGitInvocation } from "../../utils/git/gitSafeInvocation.js";
import { GIT_SAFE_GLOBAL_ARGS } from "../../utils/git/gitSafeEnv.js";
import { wrapWithSeccompExec, openSelfExeForSeccomp } from "../../utils/sandbox/linuxSandboxExec.js";
import { shellQuoteArgs } from "../../utils/bash/bashPipeCommand.js";
import { getDefaultWritePaths } from "../../../vendor/@anthropic-ai/sandbox-runtime/dist/sandbox/sandbox-utils.js";
import { execFileNoThrowWithCwd } from "../../utils/execFileNoThrow.js";
import {
  GIT_COMMAND_TIMEOUT_MS,
  REFS_CLAUDE_CHECKPOINT,
  CHECKPOINT_INDEX_MAX_AGE_SECONDS,
  TENGU_COPPER_SLUICE,
  sanitizeCheckpointLine,
} from "./checkpointCommit.js";
import { logForDebugging } from "../../utils/debug.js";
import { readFlagWithOverride } from "../analytics/flagOverrides.js";

//@ chunk-89f54s6c.js:13998-15119 placement
/**
 * 在沙箱中用 git update-ref --stdin 删除旧检查点引用。
 */
async function deleteRefsInSandbox(i, cwd, r, s) {
  if (SandboxManager.getConfig() === undefined) throw Error("the sandbox has not started");
  await SandboxManager.ensureInitializedForWrap();
  let u = gitExe();
  let safeGitInvocation = buildSafeGitInvocation(u, [...GIT_SAFE_GLOBAL_ARGS, "update-ref", "--stdin"], s);
  let filesystem = SandboxManager.getConfig()?.filesystem;
  if (safeGitInvocation === null || filesystem === undefined)
    throw Error("git could not be made ready for the sandbox");
  let n = wrapWithSeccompExec(
    shellQuoteArgs(["/usr/bin/env", "-u", "GIT_CONFIG_COUNT", u, ...safeGitInvocation.args]),
  );
  let R = await SandboxManager.wrapWithSandbox(n, "/bin/sh", {
    filesystem: {
      allowWrite: [r],
      denyWrite: [...getDefaultWritePaths().filter((l) => !l.startsWith("/dev/")), ...filesystem.denyWrite],
      denyRead: filesystem.denyRead,
      allowRead: [...(filesystem.allowRead ?? []), r],
    },
    allowNestedUserNamespaces: false,
  });
  if (R === n) throw Error("the sandbox cannot confine commands here, so git did not run");
  let _;
  try {
    _ = await openSelfExeForSeccomp();
    let l = await execFileNoThrowWithCwd("/bin/sh", ["-c", R], {
      cwd,
      env: safeGitInvocation.env,
      inheritFd: _,
      input: i
        .map(
          (C) => `option no-deref
delete ${C}
`,
        )
        .join(""),
      timeout: GIT_COMMAND_TIMEOUT_MS,
      waitForExitAfterKill: true,
    });
    if (l.code !== 0) {
      logForDebugging(
        `[rateLimitCheckpoint] git update-ref in the sandbox exited ${l.code}: ${l.stderr.trim()}`,
        {
          level: "warn",
        },
      );
      throw Error("git could not delete the stale refs in the sandbox");
    }
  } finally {
    try {
      SandboxManager.cleanupAfterCommand();
    } finally {
      if (_ !== undefined) await promisify(close)(_);
    }
  }
}
//@ chunk-89f54s6c.js:15119-15675 placement
/**
 * 删除过期的检查点引用（沙箱开启时走沙箱）。
 */
async function pruneOldCheckpointRefs(cwd, o, r, s, remoteHostSessionCount) {
  let p = await s(
    ["for-each-ref", "--format=%(refname)%00%(committerdate:unix)%00%(symref)", `${REFS_CLAUDE_CHECKPOINT}*`],
    {
      cwd,
    },
  );
  if (p.code !== 0) return;
  let floored = Math.floor(Date.now() / 1000);
  let n = [];
  for (let line of p.stdout.split(`
`)) {
    let [_, l, C] = line.split("\x00");
    if (
      _ === undefined ||
      _ === r ||
      !_.startsWith(REFS_CLAUDE_CHECKPOINT) ||
      (C !== undefined && C.length > 0)
    )
      continue;
    let b = floored - Number(l);
    if (!Number.isFinite(b) || b < CHECKPOINT_INDEX_MAX_AGE_SECONDS) continue;
    n.push(_);
  }
  if (n.length === 0) return;
  if (
    SandboxManager.isSandboxingEnabled() &&
    readFlagWithOverride(TENGU_COPPER_SLUICE, {
      safe: true,
    })
  ) {
    await deleteRefsInSandbox(n, cwd, o, remoteHostSessionCount);
    return;
  }
  for (let R of n)
    await s(["update-ref", "--no-deref", "-d", R], {
      cwd,
    });
}
//@ chunk-89f54s6c.js:15675-16809 placement
/**
 * 生成检查点说明 markdown（恢复命令与 todo 列表）。
 */
function buildCheckpointNote(i) {
  let o = [
    "# Claude Code \u2014 resume checkpoint",
    "",
    `Session: ${i.sessionId}`,
    `Written: ${new Date().toISOString()}`,
    `Trigger: ${i.trigger === "near_limit" ? "near-limit" : "rate-limited"}`,
    `Ref with your in-progress files: ${i.ref}`,
    "",
    "## To resume",
    "",
    `    claude --resume ${i.sessionId}`,
    "",
    "(or open Claude Code in this directory and run /resume)",
    "",
    "## Plan (from TodoWrite state)",
    "",
  ];
  if (i.todos.length === 0) o.push("No task list was active; see transcript via the resume command above.");
  else {
    let r;
    let s;
    for (let u of i.todos)
      if (u.status === "completed") o.push(`- [x] ${sanitizeCheckpointLine(u.content)}`);
      else if (u.status === "in_progress") {
        let p = sanitizeCheckpointLine(u.activeForm);
        o.push(`- [>] ${p}    \u2190 current step`);
        s ??= p;
      } else {
        let p = sanitizeCheckpointLine(u.content);
        o.push(`- [ ] ${p}`);
        r ??= p;
      }
    o.push("", "## What's next", "");
    o.push(r !== undefined ? r : s !== undefined ? `finish: ${s}` : "All tasks completed.");
  }
  o.push(
    "",
    "---",
    "",
    "Don't want these changes? Resume this session (above), then run",
    "`/rewind` to roll back the turn's tool edits (bash-made changes",
    `excluded). ${i.ref} holds a full snapshot until this session's`,
    "next checkpoint, or for up to ~2 weeks.",
    "",
  );
  return o.join(`
`);
}
export { buildCheckpointNote, pruneOldCheckpointRefs };
