/**
 * services/cloudSessions/webSetup.ts
 *
 * 2.1.316 新增：/web-setup 命令：用 GitHub 账号设置云会话（连接 GitHub、允许远程会话）。
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * new in 2.1.318 (2.1.88 has no file at this path)
 * pieces: chunk-xbatms9p.js (5)
 * attribution: placement 5
 * (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.
 */
import { isEssentialTrafficOnly } from "../../utils/privacyLevel.js";
import { isPolicyAllowed } from "../policyLimits/policyEvidence.js";
import { isHostEntrypoint } from "../../utils/entrypointKinds.js";
import { getOauthConfig } from "../../constants/oauth.js";
import { CLOUD_SESSIONS_POLICY } from "./cloudSessionsPolicy.js";

//@ chunk-xbatms9p.js:2670-2755 placement
function isWebSetupEnabled() {
  return (
    !isEssentialTrafficOnly() &&
    isPolicyAllowed("allow_remote_sessions") &&
    isPolicyAllowed("allow_quick_web_setup")
  );
}
//@ chunk-xbatms9p.js:2755-2789 placement
function isWebSetupOfferable() {
  return !isHostEntrypoint() && isWebSetupEnabled();
}
//@ chunk-xbatms9p.js:2789-2852 placement
function connectGithubUrl() {
  return `${getOauthConfig().CLAUDE_AI_ORIGIN}/connect-github`;
}
//@ chunk-xbatms9p.js:2852-3122 placement
function githubNotConnectedMessage(subject = "this repository") {
  let githubUrl = connectGithubUrl();
  let advice = isWebSetupOfferable()
    ? `Run /web-setup to connect with your GitHub CLI login, or connect on the web at ${githubUrl}`
    : `Connect it on the web at ${githubUrl}`;
  return `GitHub isn't connected to your Claude account, so ${subject} can't be cloned in the cloud. ${advice}`;
}
//@ chunk-xbatms9p.js:3122-3367 placement (2.1.88 match: web, 0.749)
/**
 * /web-setup 命令对象（local-jsx）；描述：Set up cloud sessions with your GitHub account；availability ["claude-ai"]；isEnabled: o$e；isHidden: {return!dn("allow_remote_sessions")||!dn("allow_quick_web_setup")}；实现 chunk-ajkmgejw.js 的 et。
 */
var webSetupCommandDefinition = {
  type: "local-jsx",
  name: "web-setup",
  description: "Set up cloud sessions with your GitHub account",
  availability: ["claude-ai"],
  isEnabled: isWebSetupEnabled,
  policyGate: CLOUD_SESSIONS_POLICY,
  get isHidden() {
    return !isPolicyAllowed("allow_remote_sessions") || !isPolicyAllowed("allow_quick_web_setup");
  },
};
var webSetupCommand = webSetupCommandDefinition;
export {
  isWebSetupOfferable,
  githubNotConnectedMessage,
  isWebSetupEnabled,
  connectGithubUrl,
  webSetupCommand,
};
