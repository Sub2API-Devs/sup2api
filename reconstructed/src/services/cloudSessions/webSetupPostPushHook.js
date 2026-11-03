/**
 * services/cloudSessions/webSetupPostPushHook.ts
 *
 * 2.1.316 新增：PostToolUse hook：推送成功后提示通过 /web-setup 在云端继续。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-m2yw48pg.js (6)
 * attribution: placement 6
 */
import { DoctorLazy } from "../../cli/handlers/util.js";
import { u, o } from "../../../vendor/zod/v4/classic/schemas.js";
import { gitOperationSchema, parsePrUrl_2 } from "../../tools/shared/gitOperationTracking.js";
import { getIsNonInteractiveSession, registerHookCallbacks } from "../../bootstrap/state.js";
import { BASH_TOOL_NAME } from "../../tools/BashTool/toolName.js";
import { POWERSHELL_TOOL_NAME } from "../../tools/PowerShellTool/toolName.js";
import { maybeArmWebSetupPushOffer } from "../../commands/remote-setup/pushOffer.js";
import { logError } from "../../utils/log.js";
import { getCachedRemoteHost } from "../../utils/detectRepository.js";
import { isGithubDotCom } from "../../utils/git/githubUrl.js";
import {
  isGitRemoteMutation,
  getGitDirOption,
  listGhRepoTargets,
} from "../../tools/BashTool/gitRemoteMutation.js";

//@ chunk-m2yw48pg.js:6083-6157 placement
var c = DoctorLazy(() => u({ gitOperation: gitOperationSchema().optional() })),
  g = DoctorLazy(() => u({ command: o() }));
/**
 * PostToolUse hook：推送成功后提示通过 /web-setup 在云端继续。
 */
//@ chunk-m2yw48pg.js:6157-6657 placement
async function webSetupPostPushHook(e, r, t, n, s) {
  try {
    if (e.hook_event_name !== "PostToolUse" || s === void 0) return {};
    if (getIsNonInteractiveSession() || e.agent_id !== void 0) return {};
    if (e.tool_name !== BASH_TOOL_NAME && e.tool_name !== POWERSHELL_TOOL_NAME) return {};
    let safeParse = c().safeParse(e.tool_response),
      f = safeParse.success ? safeParse.data.gitOperation : void 0;
    if (f === void 0) return {};
    let a = d(f);
    if (a === null) return {};
    if (a === "push") {
      let safeParse = g().safeParse(e.tool_input);
      if (!safeParse.success || !isPlainPushToOrigin(safeParse.data.command)) return {};
    }
    if (!isGithubPushTarget(f, a)) return {};
    maybeArmWebSetupPushOffer({ trigger: a, host: s.session.host, storageV5: s.storageV5 });
  } catch (error) {
    logError(error);
  }
  return {};
}
//@ chunk-m2yw48pg.js:6657-6743 placement
function d(e) {
  if (e.pr?.action === "created") return "pr_create";
  return e.push ? "push" : null;
}
/**
 * 判断这次 git 操作是否推向 GitHub：创建 PR 时看 PR URL 的托管方是否为 github，否则看缓存的远端主机是否是 github.com。
 */
//@ chunk-m2yw48pg.js:6743-6876 placement
function isGithubPushTarget(e, r) {
  let t = e.pr?.url;
  if (r === "pr_create" && t !== void 0) return parsePrUrl_2(t)?.provider === "github";
  let n = getCachedRemoteHost();
  return n !== null && isGithubDotCom(n);
}
/**
 * 命令里的每个 git push 都不带额外选项且只推 origin 时为真；webSetupPostPushHook 用它限定只在普通推送后触发。
 */
//@ chunk-m2yw48pg.js:6876-7032 placement = GIT_PUSH_RE (0.494)
function isPlainPushToOrigin(e) {
  let filtered = isGitRemoteMutation(e).filter((t) => t.kind === "push");
  return (
    filtered.length > 0 &&
    filtered.every(
      ({ optsSpan: optsSpan, rest: rest }) =>
        getGitDirOption(optsSpan) === void 0 && listGhRepoTargets(rest).every((s) => s === "origin"),
    )
  );
}
//@ chunk-m2yw48pg.js:7032-7156 placement = registerSessionFileAccessHooks (1)
function registerSessionFileAccessHooks() {
  let hook = { type: "callback", callback: webSetupPostPushHook, timeout: 1, internal: !0 };
  registerHookCallbacks({
    PostToolUse: [{ matcher: `${BASH_TOOL_NAME}|${POWERSHELL_TOOL_NAME}`, hooks: [hook] }],
  });
}
