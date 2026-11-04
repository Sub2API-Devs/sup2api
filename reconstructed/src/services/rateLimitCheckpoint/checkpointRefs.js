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
async function deleteRefsInSandbox(refs, cwd, sandbox, options) {
  if (SandboxManager.getConfig() === undefined) throw Error("the sandbox has not started");
  await SandboxManager.ensureInitializedForWrap();
  let gitPath = gitExe();
  let safeGitInvocation = buildSafeGitInvocation(
    gitPath,
    [...GIT_SAFE_GLOBAL_ARGS, "update-ref", "--stdin"],
    options,
  );
  let filesystem = SandboxManager.getConfig()?.filesystem;
  if (safeGitInvocation === null || filesystem === undefined)
    throw Error("git could not be made ready for the sandbox");
  let wrapped = wrapWithSeccompExec(
    shellQuoteArgs(["/usr/bin/env", "-u", "GIT_CONFIG_COUNT", gitPath, ...safeGitInvocation.args]),
  );
  let quoteSafe = await SandboxManager.wrapWithSandbox(wrapped, "/bin/sh", {
    filesystem: {
      allowWrite: [sandbox],
      denyWrite: [
        ...getDefaultWritePaths().filter((quotedArgs) => !quotedArgs.startsWith("/dev/")),
        ...filesystem.denyWrite,
      ],
      denyRead: filesystem.denyRead,
      allowRead: [...(filesystem.allowRead ?? []), sandbox],
    },
    allowNestedUserNamespaces: false,
  });
  if (quoteSafe === wrapped) throw Error("the sandbox cannot confine commands here, so git did not run");
  let command;
  try {
    command = await openSelfExeForSeccomp();
    let input = await execFileNoThrowWithCwd("/bin/sh", ["-c", quoteSafe], {
      cwd,
      env: safeGitInvocation.env,
      inheritFd: command,
      input: refs
        .map(
          (result) => `option no-deref
delete ${result}
`,
        )
        .join(""),
      timeout: GIT_COMMAND_TIMEOUT_MS,
      waitForExitAfterKill: true,
    });
    if (input.code !== 0) {
      logForDebugging(
        `[rateLimitCheckpoint] git update-ref in the sandbox exited ${input.code}: ${input.stderr.trim()}`,
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
      if (command !== undefined) await promisify(close)(command);
    }
  }
}
//@ chunk-89f54s6c.js:15119-15675 placement
/**
 * 删除过期的检查点引用（沙箱开启时走沙箱）。
 */
async function pruneOldCheckpointRefs(cwd, gitDir, keepRef, git, options) {
  let listResult = await git(
    ["for-each-ref", "--format=%(refname)%00%(committerdate:unix)%00%(symref)", `${REFS_CLAUDE_CHECKPOINT}*`],
    {
      cwd,
    },
  );
  if (listResult.code !== 0) return;
  let floored = Math.floor(Date.now() / 1000);
  let staleRefs = [];
  for (let line of listResult.stdout.split(`
`)) {
    let [refName, committedAt, symrefTarget] = line.split("\x00");
    if (
      refName === undefined ||
      refName === keepRef ||
      !refName.startsWith(REFS_CLAUDE_CHECKPOINT) ||
      (symrefTarget !== undefined && symrefTarget.length > 0)
    )
      continue;
    let ageSeconds = floored - Number(committedAt);
    if (!Number.isFinite(ageSeconds) || ageSeconds < CHECKPOINT_INDEX_MAX_AGE_SECONDS) continue;
    staleRefs.push(refName);
  }
  if (staleRefs.length === 0) return;
  if (
    SandboxManager.isSandboxingEnabled() &&
    readFlagWithOverride(TENGU_COPPER_SLUICE, {
      safe: true,
    })
  ) {
    await deleteRefsInSandbox(staleRefs, cwd, gitDir, options);
    return;
  }
  for (let refName of staleRefs)
    await git(["update-ref", "--no-deref", "-d", refName], {
      cwd,
    });
}
//@ chunk-89f54s6c.js:15675-16809 placement
/**
 * 生成检查点说明 markdown（恢复命令与 todo 列表）。
 */
function buildCheckpointNote(note) {
  let lines = [
    "# Claude Code \u2014 resume checkpoint",
    "",
    `Session: ${note.sessionId}`,
    `Written: ${new Date().toISOString()}`,
    `Trigger: ${note.trigger === "near_limit" ? "near-limit" : "rate-limited"}`,
    `Ref with your in-progress files: ${note.ref}`,
    "",
    "## To resume",
    "",
    `    claude --resume ${note.sessionId}`,
    "",
    "(or open Claude Code in this directory and run /resume)",
    "",
    "## Plan (from TodoWrite state)",
    "",
  ];
  if (note.todos.length === 0)
    lines.push("No task list was active; see transcript via the resume command above.");
  else {
    let nextTodo;
    let currentTodo;
    for (let todo of note.todos)
      if (todo.status === "completed") lines.push(`- [x] ${sanitizeCheckpointLine(todo.content)}`);
      else if (todo.status === "in_progress") {
        let activeText = sanitizeCheckpointLine(todo.activeForm);
        lines.push(`- [>] ${activeText}    \u2190 current step`);
        currentTodo ??= activeText;
      } else {
        let pendingText = sanitizeCheckpointLine(todo.content);
        lines.push(`- [ ] ${pendingText}`);
        nextTodo ??= pendingText;
      }
    lines.push("", "## What's next", "");
    lines.push(
      nextTodo !== undefined
        ? nextTodo
        : currentTodo !== undefined
          ? `finish: ${currentTodo}`
          : "All tasks completed.",
    );
  }
  lines.push(
    "",
    "---",
    "",
    "Don't want these changes? Resume this session (above), then run",
    "`/rewind` to roll back the turn's tool edits (bash-made changes",
    `excluded). ${note.ref} holds a full snapshot until this session's`,
    "next checkpoint, or for up to ~2 weeks.",
    "",
  );
  return lines.join(`
`);
}
export { buildCheckpointNote, pruneOldCheckpointRefs };
