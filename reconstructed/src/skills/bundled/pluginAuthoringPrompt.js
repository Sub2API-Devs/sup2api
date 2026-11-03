/**
 * skills/bundled/pluginAuthoringPrompt.ts
 *
 * 2.1.316 新增：插件编写技能提示。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-3a38dj81.js (4)
 * attribution: placement 4
 */
import { isDesktopNonClaudecode, alwaysFalseEntry } from "../../utils/entrypointKinds.js";
import { env } from "../../utils/env.js";
import { getPlatform } from "../../utils/platform.js";

//@ chunk-3a38dj81.js:301-383 placement = execTmux (0.762)
function isNativeTerminalNotifySupported() {
  return (
    isDesktopNonClaudecode() &&
    !alwaysFalseEntry() &&
    !env.CLAUDE_CODE_REMOTE_SESSION_ID &&
    getPlatform() !== "wsl"
  );
}
/**
 * 组织库分享说明：mod 生效后只提一次发布到组织库。
 */
//@ chunk-3a38dj81.js:383-786 placement
var ORG_LIBRARY_SHARING_NOTE = ` Once the mod has loaded and the person has seen it do what they asked, offer once, in one line, to publish the mod to the organization's library; until then, sharing goes unmentioned unless the person raises it. Wait for their answer; a GitHub repository is for when the person asks for one. Say "the mod", not "it". Where the person says no, that answer stands for the rest of this session.`;
/**
 * 云端会话中分享 mod 的说明：以插件文件在聊天中交付。
 */
//@ chunk-3a38dj81.js:786-1562 placement
var CLOUD_SHARING_NOTE = `

SHARING IT. The offer is the main session's, to the person in the chat: a subagent or teammate hands the mod back to it. Here a mod is kept and passed on as a plugin file handed over in the chat (Packaging a mod in a chat in reference.md); a GitHub repository is for when the person asks for one. Files are scanned for keys first, and where the scan cannot run nothing is handed over. Once the mod has loaded and the person has seen it do what they asked, offer once, in one line, to package the mod so they can keep it and pass it on. Until then, keeping and sharing go unmentioned unless the person raises them. Offer, and wait for their answer before starting. Say "the mod", not "it". Where the person says no, that answer stands for the rest of this session.`;
/**
 * 终端会话中分享 mod 的说明：生效后只提一次分享方式。
 */
//@ chunk-3a38dj81.js:1562-2573 placement
var TERMINAL_SHARING_NOTE = `

SHARING IT. The offer is the main session's, to the person at its prompt: a subagent or teammate hands the mod back to it. Once the mod has loaded and the person has seen it do what they asked, offer once, in one line, to share the mod: a GitHub repository others install from with one line. Until then, sharing goes unmentioned unless the person raises it. Offer, and wait for their answer before starting. Say "the mod", not "it". A yes to sharing is not a yes to public: ask whether the repository is public (anyone can read the code and install the mod) or private (only people the person invites on GitHub, who also need GitHub set up on their own computer to install the mod), in those words, and create nothing until they answer. Files are scanned for keys first and a flagged one stays unopened; the rest are read for a key, an internal URL or someone else's data; the steps are under Sharing a mod in reference.md. Where the person says no, that answer stands for the rest of this session.`;

export {
  isNativeTerminalNotifySupported,
  TERMINAL_SHARING_NOTE,
  ORG_LIBRARY_SHARING_NOTE,
  CLOUD_SHARING_NOTE,
};
