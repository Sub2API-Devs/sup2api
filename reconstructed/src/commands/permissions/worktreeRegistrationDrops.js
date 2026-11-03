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
import { o, zodStrictObject, A } from "../../../vendor/zod/v4/classic/schemas.js";
import { hl } from "../../utils/networkPaths.js";
import { DoctorLazy } from "../../cli/handlers/util.js";
import { vetRepoForWorktrees } from "../../utils/git/worktreeVetting.js";
import { deregisterWorktree } from "../../utils/git/worktreeRegistrations.js";
import { jsonStringify } from "../../utils/slowOperations.js";

//@ chunk-5sfp2t4x.js:1659-1946 placement
var localAbsolutePathSchema = () =>
    o()
      .min(1)
      .max(4096)
      .refine(
        (t) => !t.includes("\x00") && isAbsolute(t) && !hl(t),
        "must be an absolute local path, not a network or automount path (such as \\\\server\\share, //server/share or /net/host), with no NUL character",
      ),
  worktreeDropRequestSchema = DoctorLazy(() =>
    zodStrictObject({
      repoRoot: localAbsolutePathSchema(),
      worktreePaths: A(localAbsolutePathSchema()).min(1).max(4),
    }),
  );
/**
 * 处理 worktree 注册撤销请求：校验请求、核对仓库后移除注册。
 */
//@ chunk-5sfp2t4x.js:1946-2573 placement
async function runWorktreeRegistrationDrops(t) {
  let safeParse = worktreeDropRequestSchema().safeParse(t);
  if (!safeParse.success) {
    let r = safeParse.error.issues[0];
    return {
      ok: !1,
      error: r
        ? `Not a worktree registration request (${r.path.map(String).join(".") || "request"}: ${r.message}).`
        : "Not a worktree registration request.",
    };
  }
  let { worktreePaths: worktreePaths } = safeParse.data,
    s = normalize(safeParse.data.repoRoot),
    a = await vetRepoForWorktrees(s);
  if (a === null) {
    let r = `the repository at ${s} could not be vetted`;
    return { ok: !0, outcomes: worktreePaths.map(() => ({ outcome: "kept", reason: r })) };
  }
  let u = [];
  for (let r of worktreePaths) {
    let i = await deregisterWorktree(a, { worktreePath: r, repoSpelled: s }, { locked: "keep" });
    u.push(i.outcome === "kept" ? { outcome: "kept", reason: i.reason } : { outcome: i.outcome });
  }
  return { ok: !0, outcomes: u };
}
//@ chunk-5sfp2t4x.js:2573-2616 placement
function y(t) {
  return jsonStringify({ ok: !0, outcomes: t });
}
