/**
 * commands/rename/rename.ts
 *
 * 2.1.316 新增。执行会话改名，名字冲突时让出。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/commands/rename/rename.ts
 * pieces: chunk-zmqmnh19.js (4)
 * attribution: placement 4
 */
import { escapeXmlText } from "../../utils/sanitization.js";
import { wrapInSystemReminder } from "../../utils/messages.js";
import { sanitizeSessionTitle } from "../../utils/stringUtils.js";
import { isTeammate } from "../../utils/teammate.js";
import { generateSessionName } from "./generateSessionName.js";
import { renameSession } from "../../utils/sessionTitle.js";
import { updateStandaloneAgentContext } from "../../utils/standaloneAgent.js";
import { getRemoteCaps } from "../../remote/remoteMode.js";

//@ chunk-zmqmnh19.js:2624-2966 placement
function renameSystemReminder(newName, requestedName = newName) {
  let escapedName = escapeXmlText(newName);
  let escapedRequested = escapeXmlText(requestedName);
  return wrapInSystemReminder(
    requestedName === newName
      ? `The user named this session "${escapedName}". This may indicate the session's focus or intent.`
      : `The user asked to name this session "${escapedRequested}"; another live session on this machine already holds that name, so this session is "${escapedName}". The requested name may indicate the session's focus or intent.`,
  );
}
//@ chunk-zmqmnh19.js:2966-3122 placement
function sessionNameYieldedNotice(heldName, actualName) {
  return `Another live session on this machine goes by "${sanitizeSessionTitle(heldName)}", so this session is now "${sanitizeSessionTitle(actualName)}". Use /rename to pick a different name.`;
}
//@ chunk-zmqmnh19.js:3122-4366 placement (2.1.88 match: call, 0.291)
/**
 * 执行会话改名，名字冲突时让出。
 */
async function performRename(onDone, context, args) {
  if (isTeammate())
    return {
      message: "Cannot rename: This session is a teammate. Teammate names are set by the team leader.",
    };
  let generateName = !onDone || onDone.trim() === "";
  let newName;
  if (generateName) {
    let generated = await generateSessionName(context.messages, context.abortController.signal, {
      preferFork: true,
      credentials: context.credentials,
    });
    if (!generated)
      return {
        message: "Could not generate a name: no conversation context yet. Usage: /rename <name>",
      };
    newName = generated;
  } else newName = onDone.trim();
  let renameResult = await renameSession(
    newName,
    "user",
    context.storageV5,
    args && !generateName,
    true,
    context.credentials,
  );
  if (renameResult === null)
    return {
      message: generateName
        ? "Could not generate a name: no conversation context yet. Usage: /rename <name>"
        : "That name is empty once invisible characters are removed. Usage: /rename <name>",
    };
  let actualName = renameResult.name;
  context.setAppState((prev) =>
    updateStandaloneAgentContext(prev, {
      name: actualName,
    }),
  );
  if (getRemoteCaps()?.sessionId !== undefined)
    context.setAppState((prev) =>
      prev.remoteSessionName === actualName
        ? prev
        : {
            ...prev,
            remoteSessionName: actualName,
          },
    );
  let requestedTitle = sanitizeSessionTitle(newName);
  let resultText =
    renameResult.outcome === "yielded"
      ? `Session renamed to: ${actualName} ("${requestedTitle}" is held by another live session on this machine)`
      : renameResult.outcome === "superseded"
        ? `Session is named: ${actualName} (a newer rename landed first)`
        : `Session renamed to: ${actualName}`;
  return {
    message: renameResult.registryUpdated
      ? resultText
      : `${resultText}. Other sessions may still show the old name: the session registry could not be updated (run with --debug for the cause)`,
    requestedName: renameResult.outcome === "yielded" ? requestedTitle : actualName,
    newName: actualName,
    isGenerated: generateName,
  };
}
//@ chunk-zmqmnh19.js:4366-4538 placement
async function call(onDone, context, args) {
  let { message, newName, requestedName, isGenerated } = await performRename(args, context, true);
  onDone(message, {
    display: "system",
    metaMessages: newName && !isGenerated ? [renameSystemReminder(newName, requestedName)] : undefined,
  });
  return null;
}
export { sessionNameYieldedNotice, performRename, call, renameSystemReminder };
