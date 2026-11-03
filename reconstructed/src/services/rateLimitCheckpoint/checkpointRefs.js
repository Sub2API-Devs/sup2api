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
import { freeze } from "../../utils/git/gitSafeEnv.js";
import { Por, openSelfExeForSeccomp } from "../../utils/sandbox/linuxSandboxExec.js";
import { shellQuoteArgs } from "../../utils/bash/bashPipeCommand.js";
import { BP } from "../../../vendor/@anthropic-ai/sandbox-runtime/dist/sandbox/sandbox-utils.js";
import { execFileNoThrowWithCwd } from "../../utils/execFileNoThrow.js";
import {
  w,
  REFS_CLAUDE_CHECKPOINT,
  Fe,
  TENGU_COPPER_SLUICE,
  sanitizeCheckpointLine,
} from "./checkpointCommit.js";
import { logForDebugging } from "../../utils/debug.js";
import { readFlagWithOverride } from "../analytics/flagOverrides.js";

/**
 * 在沙箱中用 git update-ref --stdin 删除旧检查点引用。
 */
//@ chunk-89f54s6c.js:13998-15119 placement
async function deleteRefsInSandbox(i, o, r, s) {
  if (SandboxManager.getConfig() === void 0) throw Error("the sandbox has not started");
  await SandboxManager.ensureInitializedForWrap();
  let u = gitExe(),
    p = buildSafeGitInvocation(u, [...freeze, "update-ref", "--stdin"], s),
    h = SandboxManager.getConfig()?.filesystem;
  if (p === null || h === void 0) throw Error("git could not be made ready for the sandbox");
  let n = Por(shellQuoteArgs(["/usr/bin/env", "-u", "GIT_CONFIG_COUNT", u, ...p.args])),
    wrapWithSandbox = await SandboxManager.wrapWithSandbox(n, "/bin/sh", {
      filesystem: {
        allowWrite: [r],
        denyWrite: [...BP().filter((l) => !l.startsWith("/dev/")), ...h.denyWrite],
        denyRead: h.denyRead,
        allowRead: [...(h.allowRead ?? []), r],
      },
      allowNestedUserNamespaces: !1,
    });
  if (wrapWithSandbox === n) throw Error("the sandbox cannot confine commands here, so git did not run");
  let _;
  try {
    _ = await openSelfExeForSeccomp();
    let l = await execFileNoThrowWithCwd("/bin/sh", ["-c", wrapWithSandbox], {
      cwd: o,
      env: p.env,
      inheritFd: _,
      input: i
        .map(
          (C) => `option no-deref
delete ${C}
`,
        )
        .join(""),
      timeout: w,
      waitForExitAfterKill: !0,
    });
    if (l.code !== 0)
      throw (
        logForDebugging(
          `[rateLimitCheckpoint] git update-ref in the sandbox exited ${l.code}: ${l.stderr.trim()}`,
          { level: "warn" },
        ),
        Error("git could not delete the stale refs in the sandbox")
      );
  } finally {
    try {
      SandboxManager.cleanupAfterCommand();
    } finally {
      if (_ !== void 0) await promisify(close)(_);
    }
  }
}
/**
 * 删除过期的检查点引用（沙箱开启时走沙箱）。
 */
//@ chunk-89f54s6c.js:15119-15675 placement
async function pruneOldCheckpointRefs(i, o, r, s, u) {
  let p = await s(
    ["for-each-ref", "--format=%(refname)%00%(committerdate:unix)%00%(symref)", `${REFS_CLAUDE_CHECKPOINT}*`],
    { cwd: i },
  );
  if (p.code !== 0) return;
  let floored = Math.floor(Date.now() / 1000),
    n = [];
  for (let R of p.stdout.split(`
`)) {
    let [_, l, C] = R.split("\x00");
    if (_ === void 0 || _ === r || !_.startsWith(REFS_CLAUDE_CHECKPOINT) || (C !== void 0 && C.length > 0))
      continue;
    let b = floored - Number(l);
    if (!Number.isFinite(b) || b < Fe) continue;
    n.push(_);
  }
  if (n.length === 0) return;
  if (SandboxManager.isSandboxingEnabled() && readFlagWithOverride(TENGU_COPPER_SLUICE, { safe: !0 })) {
    await deleteRefsInSandbox(n, i, o, u);
    return;
  }
  for (let R of n) await s(["update-ref", "--no-deref", "-d", R], { cwd: i });
}
/**
 * 生成检查点说明 markdown（恢复命令与 todo 列表）。
 */
//@ chunk-89f54s6c.js:15675-16809 placement
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
    let r, s;
    for (let todo of i.todos)
      if (todo.status === "completed") o.push(`- [x] ${sanitizeCheckpointLine(todo.content)}`);
      else if (todo.status === "in_progress") {
        let p = sanitizeCheckpointLine(todo.activeForm);
        (o.push(`- [>] ${p}    \u2190 current step`), (s ??= p));
      } else {
        let p = sanitizeCheckpointLine(todo.content);
        (o.push(`- [ ] ${p}`), (r ??= p));
      }
    (o.push("", "## What's next", ""),
      o.push(r !== void 0 ? r : s !== void 0 ? `finish: ${s}` : "All tasks completed."));
  }
  return (
    o.push(
      "",
      "---",
      "",
      "Don't want these changes? Resume this session (above), then run",
      "`/rewind` to roll back the turn's tool edits (bash-made changes",
      `excluded). ${i.ref} holds a full snapshot until this session's`,
      "next checkpoint, or for up to ~2 weeks.",
      "",
    ),
    o.join(`
`)
  );
}

export { buildCheckpointNote, pruneOldCheckpointRefs };
