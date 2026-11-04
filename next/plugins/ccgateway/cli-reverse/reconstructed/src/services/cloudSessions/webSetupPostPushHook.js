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
import { objectSchema, stringSchema } from "../../../vendor/zod/v4/classic/schemas.js";
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
/**
 * PostToolUse 事件 input 的最小 schema（command）。
 */
var toolResponseSchema = DoctorLazy(() =>
  objectSchema({
    gitOperation: gitOperationSchema().optional(),
  }),
);
var toolInputSchema = DoctorLazy(() =>
  objectSchema({
    command: stringSchema(),
  }),
);
//@ chunk-m2yw48pg.js:6157-6657 placement
/**
 * PostToolUse hook：推送成功后提示通过 /web-setup 在云端继续。
 */
async function webSetupPostPushHook(hookInput, toolUseId, toolName, toolInput, hookContext) {
  try {
    if (hookInput.hook_event_name !== "PostToolUse" || hookContext === undefined) return {};
    if (getIsNonInteractiveSession() || hookInput.agent_id !== undefined) return {};
    if (hookInput.tool_name !== BASH_TOOL_NAME && hookInput.tool_name !== POWERSHELL_TOOL_NAME) return {};
    let responseParsed = toolResponseSchema().safeParse(hookInput.tool_response);
    let gitOperation = responseParsed.success ? responseParsed.data.gitOperation : undefined;
    if (gitOperation === undefined) return {};
    let operationKind = classifyGitOperation(gitOperation);
    if (operationKind === null) return {};
    if (operationKind === "push") {
      let inputParsed = toolInputSchema().safeParse(hookInput.tool_input);
      if (!inputParsed.success || !isPlainPushToOrigin(inputParsed.data.command)) return {};
    }
    if (!isGithubPushTarget(gitOperation, operationKind)) return {};
    maybeArmWebSetupPushOffer({
      trigger: operationKind,
      host: hookContext.session.host,
      storageV5: hookContext.storageV5,
    });
  } catch (error) {
    logError(error);
  }
  return {};
}
//@ chunk-m2yw48pg.js:6657-6743 placement
/**
 * 把一次 git 操作归类成 pr_create、push 或 null。
 */
function classifyGitOperation(gitOperation) {
  if (gitOperation.pr?.action === "created") return "pr_create";
  return gitOperation.push ? "push" : null;
}
//@ chunk-m2yw48pg.js:6743-6876 placement
/**
 * 判断这次 git 操作是否推向 GitHub：创建 PR 时看 PR URL 的托管方是否为 github，否则看缓存的远端主机是否是 github.com。
 */
function isGithubPushTarget(gitOperation, eventType) {
  let url = gitOperation.pr?.url;
  if (eventType === "pr_create" && url !== undefined) return parsePrUrl_2(url)?.provider === "github";
  let cachedRemoteHost = getCachedRemoteHost();
  return cachedRemoteHost !== null && isGithubDotCom(cachedRemoteHost);
}
//@ chunk-m2yw48pg.js:6876-7032 placement = GIT_PUSH_RE (0.494)
/**
 * 命令里的每个 git push 都不带额外选项且只推 origin 时为真；webSetupPostPushHook 用它限定只在普通推送后触发。
 */
function isPlainPushToOrigin(command) {
  let filtered = isGitRemoteMutation(command).filter((op) => op.kind === "push");
  return (
    filtered.length > 0 &&
    filtered.every(
      ({ optsSpan, rest }) =>
        getGitDirOption(optsSpan) === undefined &&
        listGhRepoTargets(rest).every((target) => target === "origin"),
    )
  );
}
//@ chunk-m2yw48pg.js:7032-7156 placement = registerSessionFileAccessHooks (1)
function registerSessionFileAccessHooks() {
  let hook = {
    type: "callback",
    callback: webSetupPostPushHook,
    timeout: 1,
    internal: true,
  };
  registerHookCallbacks({
    PostToolUse: [
      {
        matcher: `${BASH_TOOL_NAME}|${POWERSHELL_TOOL_NAME}`,
        hooks: [hook],
      },
    ],
  });
}
export { registerSessionFileAccessHooks };
