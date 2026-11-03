/**
 * services/mcpServe/repoGitState.ts
 *
 * 2.1.316 新增：mcp serve 读取仓库 git 状态。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-wy9dbk5f.js (3)
 * attribution: placement 3
 */
import { DoctorLazy } from "../../cli/handlers/util.js";
import { u as u_2, pe, o, A, Ir, T, M } from "../../../vendor/zod/v4/classic/schemas.js";
import { L8e } from "../../utils/detectRepository.js";
import {
  SDKSystemCodeChangePublishedMessageSchema,
  SDKSystemVcsStateChangedMessageSchema,
} from "../../entrypoints/sdk/coreSchemas.js";
import { isSafeBranchName, Gvt } from "../../tools/shared/gitOperationTracking.js";
import { getRepoCheckouts, resolveCheckoutPath } from "../../utils/git/repoCheckouts.js";
import { refreshGitDir, readGitHead } from "../../utils/git/gitFilesystem.js";
import { drainTaskNotifications } from "../../utils/task/taskNotifications.js";

//@ chunk-wy9dbk5f.js:50401-50887 placement
var READREPOGITSTATE = "ReadRepoGitState",
  Ge = 32,
  $e = 64,
  Io = 256,
  Fo = 4096,
  xr = 255,
  No = /^\/[^\p{C}\p{Zl}\p{Zp}]*$/u,
  ru = DoctorLazy(() =>
    u_2({
      branches: pe(o().max(Io), o().max(xr).nullable()).refine(Tr),
      events: A(
        Ir("subtype", [
          u_2({
            subtype: T("code_change_published"),
            url: o().max(L8e),
            action: SDKSystemCodeChangePublishedMessageSchema().shape.action.unwrap(),
            branch: o().refine(isSafeBranchName).optional(),
          }),
          u_2({
            subtype: T("vcs_state_changed"),
            kind: SDKSystemVcsStateChangedMessageSchema().shape.kind,
            cwd: o().max(Fo).regex(No),
            branch: o().refine(isSafeBranchName).optional(),
          }),
        ])
          .nullable()
          .catch(null),
      ).max($e),
      cut: M().optional(),
    }),
  );
//@ chunk-wy9dbk5f.js:50887-51776 placement
async function serveReadRepoGitState(e, r, { callerGone: callerGone }) {
  let s = [...getRepoCheckouts()],
    a = s.length > Ge,
    c = [];
  for (let [h, S] of s.slice(0, Ge)) {
    if (h.length > Io) {
      a = !0;
      continue;
    }
    let C = resolveCheckoutPath(S);
    if (C === null) continue;
    let b = await refreshGitDir(C);
    if (b !== null) {
      let R = await readGitHead(b);
      c.push([h, R?.type === "branch" && isSafeBranchName(R.name) ? R.name : null]);
    }
  }
  (await Gvt(), r.throwIfAborted(), callerGone?.throwIfAborted());
  let y = [];
  for (let h of drainTaskNotifications()) {
    if (h.type !== "system") continue;
    if (h.subtype === "code_change_published")
      y.push({
        subtype: h.subtype,
        url: h.url,
        action: h.action,
        ...(h.branch !== void 0 && { branch: h.branch }),
      });
    else if (h.subtype === "vcs_state_changed") {
      if (h.cwd.length > Fo || !No.test(h.cwd)) {
        a = !0;
        continue;
      }
      y.push({
        subtype: h.subtype,
        kind: h.kind,
        cwd: h.cwd,
        ...("branch" in h && h.branch !== void 0 && isSafeBranchName(h.branch) && { branch: h.branch }),
      });
    }
  }
  a ||= y.length > $e;
  let sliced = y.slice(-$e);
  return {
    summary: `${c.length} checkouts, ${sliced.length} events`,
    output: { branches: Object.fromEntries(c), events: sliced, ...(a && { cut: a }) },
  };
}
//@ chunk-wy9dbk5f.js:51776-51824 placement
function Tr(e) {
  return Object.keys(e).length <= Ge;
}

export { READREPOGITSTATE, serveReadRepoGitState };
