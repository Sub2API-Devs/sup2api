/**
 * commands/permissions/worktreeRegistrationDrops.ts
 *
 * 2.1.316 新增：处理 worktree 注册撤销请求：校验请求、核对仓库后移除注册。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-5sfp2t4x.js (3)
 * attribution: placement 3
 */
import { isAbsolute, normalize } from "path";
import { string, zodStrictObject, array } from "../../../vendor/zod/v4/classic/schemas.js";
import { isUntouchableSpelling } from "../../utils/networkPaths.js";
import { DoctorLazy } from "../../cli/handlers/util.js";
import { vetRepoForWorktrees } from "../../utils/git/worktreeVetting.js";
import { deregisterWorktree } from "../../utils/git/worktreeRegistrations.js";
import { jsonStringify } from "../../utils/slowOperations.js";

//@ chunk-5sfp2t4x.js:1659-1946 placement
var localAbsolutePathSchema = () =>
  string()
    .min(1)
    .max(4096)
    .refine(
      (t) => !t.includes("\x00") && isAbsolute(t) && !isUntouchableSpelling(t),
      "must be an absolute local path, not a network or automount path (such as \\\\server\\share, //server/share or /net/host), with no NUL character",
    );
var worktreeDropRequestSchema = DoctorLazy(() =>
  zodStrictObject({
    repoRoot: localAbsolutePathSchema(),
    worktreePaths: array(localAbsolutePathSchema()).min(1).max(4),
  }),
);
//@ chunk-5sfp2t4x.js:1946-2573 placement
/**
 * 处理 worktree 注册撤销请求：校验请求、核对仓库后移除注册。
 */
async function runWorktreeRegistrationDrops(t) {
  let e = worktreeDropRequestSchema().safeParse(t);
  if (!e.success) {
    let r = e.error.issues[0];
    return {
      ok: false,
      error: r
        ? `Not a worktree registration request (${r.path.map(String).join(".") || "request"}: ${r.message}).`
        : "Not a worktree registration request.",
    };
  }
  let { worktreePaths } = e.data;
  let s = normalize(e.data.repoRoot);
  let a = await vetRepoForWorktrees(s);
  if (a === null) {
    let reason = `the repository at ${s} could not be vetted`;
    return {
      ok: true,
      outcomes: worktreePaths.map(() => ({
        outcome: "kept",
        reason,
      })),
    };
  }
  let u = [];
  for (let worktreePath of worktreePaths) {
    let i = await deregisterWorktree(
      a,
      {
        worktreePath,
        repoSpelled: s,
      },
      {
        locked: "keep",
      },
    );
    u.push(
      i.outcome === "kept"
        ? {
            outcome: "kept",
            reason: i.reason,
          }
        : {
            outcome: i.outcome,
          },
    );
  }
  return {
    ok: true,
    outcomes: u,
  };
}
//@ chunk-5sfp2t4x.js:2573-2616 placement
function worktreeDropResultJson(outcomes) {
  return jsonStringify({
    ok: true,
    outcomes,
  });
}
