/**
 * hooks/useTypeahead.tsx
 *
 * 输入补全：斜杠命令、命令参数、@ 文件/agent/MCP 资源、bash 命令与路径、emoji、/resume 会话等建议的生成、导航与接受。
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/hooks/useTypeahead.tsx
 * pieces: chunk-czq1j3j2.js (27)
 * attribution: placement 2, sole-consumer 4, affinity 1, fingerprint 10, file-local 2, layout 8
 * (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.
 */
import {
  isCommandMetadata_2,
  isCommandInput,
  findMidInputSlashCommand,
  getFilteredCommandSuggestions,
  getBestCommandMatch,
  getCommandSuggestionsForQuery,
  generateCommandSuggestions,
  isValidCommandToken,
  applyMidInputCommandSuggestion,
  applyCommandSuggestion,
  getMidInputCommandCompletion,
} from "../utils/suggestions/commandSuggestions.js";
import {
  matchesCommandWords,
  looksLikePathToken,
  getPathCompletions,
  getDirectoryCompletions,
} from "../utils/suggestions/directoryCompletion.js";
import { getCommandName, findCommand } from "../commands.js";
import { areSkillsConvertedAsPlugins } from "../utils/permissions/permissionRulePayload.js";
import { stripSuffix, firstLineOf } from "../utils/stringUtils.js";
import { WORD_BOUNDARY_PATTERN } from "../utils/attachments/atMentions.js";
import { getArrowedSuggestionId } from "../components/PromptInput/PromptInputFooterSuggestions.js";
import { loggedSessionState } from "./useWorkspaceDiff.js";
import { logEvent } from "../services/analytics/index.js";
import { createAutocompleteStore, takeAutocompleteRow } from "../components/PromptInput/autocompleteStore.js";
import { createStore } from "../state/store.js";
import { isRemoteSessionAvailable } from "../remote/remoteMode.js";
import { getShellCompletions } from "../utils/bash/shellCompletion.js";
import { useStoreSelector } from "./useStoreSelector.js";
import { selectDraftValue, selectCursorOffset, selectInputMode } from "../screens/repl/PromptDraft.js";
import {
  useCallback,
  useRef,
  useMemo,
  useState,
  useEffect,
  useEffectEvent,
} from "../../vendor/react/cjs/react.production.js";
import { useNotifications } from "../context/notifications.js";
import { useShortcutDisplay as useShortcutDisplay_2 } from "../keybindings/useShortcutDisplay.js";
import { useAppState, useAppStoreDirect, useSetAppState } from "../state/AppState.js";
import { useSettingsState } from "./useSettings.js";
import { useSession, useHost } from "../context/session.js";
import { useTheme_2 } from "../components/design-system/ThemeProvider.js";
import { useKeybindingContext, useRegisterKeybindingContext } from "../keybindings/KeybindingContext.js";
import { useIsFullscreen } from "../ink/renderModeContext.js";
import { isSuggestionNavEnabled } from "../utils/accessibility/screenReader.js";
import { createDialFailureLatch } from "../services/mcp/dialFailureLatch.js";
import { resolvePeerAddressFromState, suggestPeerMentions } from "../utils/peerAddressing.js";
import { mcpTemplateCompletions } from "../utils/suggestions/mcpTemplateCompletion.js";
import { generateUnifiedSuggestions } from "./unifiedSuggestions.js";
import {
  globalFileIndexCache,
  startBackgroundCacheRefresh,
  findLongestCommonPrefix,
  applyFileSuggestion,
} from "./fileSuggestions.js";
import { useDebouncedCallback } from "../ink/components/Input.js";
import { getSlackChannelSuggestions, hasSlackClient } from "../utils/suggestions/slackChannelSuggestions.js";
import { getShellHistoryCompletion } from "../utils/suggestions/shellHistoryCompletion.js";
import { slugifySessionName } from "../utils/sessionAddresses.js";
import { isAgentSwarmsEnabled } from "../utils/agentSwarmsEnabled.js";
import { TEAM_LEAD } from "../utils/swarm/constants.js";
import { isCrossSessionMessagingEnabled } from "../utils/crossSessionMessagingGate.js";
import { lookupEmoji, getEmojiSuggestions } from "../utils/emojiShortcodes.js";
import { logFeatureOk } from "../services/analytics/featureTelemetry.js";
import {
  DIR_ARG_COMMANDS,
  commandArgSuggestions,
  COMMAND_ARG,
} from "../utils/suggestions/commandArgSuggestions.js";
import { searchSessionsByCustomTitle, getSessionIdFromLog } from "../utils/sessionStorage.js";
import { formatLogMetadata } from "../utils/format.js";
import { parseArgumentNames } from "../utils/argumentSubstitution.js";
import { formatExtraArgHints } from "../skills/loadSkillsDir.js";
import { parseCompletionResult } from "../utils/suggestions/uriTemplate.js";
import { useThirdOverlayKeys, useRegisterOverlay } from "../context/overlayContext.js";
import { MessageActionsKeybindings } from "../components/messageActions.js";
import {
  getModeFromInput as getModeFromInput_2,
  stripModePrefix,
} from "../components/PromptInput/inputModes.js";
import { isShownOrAcceptedSuggestion } from "../services/PromptSuggestion/promptSuggestion.js";
import { logError } from "../utils/log.js";
import { needsShiftWorkaround } from "./useTextInput.js";
import { deferInit } from "../../runtime/deferred-init.js";

//@ chunk-czq1j3j2.js:579545-579741 placement (2.1.88 match: toolMatchesName, 0.66)
/**
 * （旧版名 toolMatchesName 是错配）typeahead 里判断 "/xxx" 输入是否匹配候选命令：按命令元数据的 name、命令名和别名做模糊匹配，非命令候选直接通过。
 */
function commandMatchesTypeaheadQuery(query, suggestions) {
  let first = suggestions[0];
  if (!first) return false;
  if (!isCommandMetadata_2(first.metadata)) return true;
  let query_2 = query.slice(1).toLowerCase().trim();
  if (query_2 === "") return true;
  let metadata = first.metadata;
  return matchesCommandWords(query_2, [metadata.name, getCommandName(metadata), ...(metadata.aliases ?? [])]);
}
//@ chunk-czq1j3j2.js:579741-579980 sole-consumer
function isPluginHiddenCommand(text, commands) {
  let trimmed = text.trimEnd();
  let wantedName = /^\/\S+$/.test(trimmed) ? trimmed.slice(1).toLowerCase() : "";
  return (
    wantedName !== "" &&
    areSkillsConvertedAsPlugins() &&
    commands.some(
      (command) =>
        command.type === "prompt" &&
        command.hiddenBehindPlugin !== undefined &&
        [command.name, getCommandName(command), ...(command.aliases ?? [])].some(
          (candidate) => candidate.toLowerCase() === wantedName,
        ),
    )
  );
}
//@ chunk-czq1j3j2.js:579980-580139 sole-consumer
function isUniqueCommandMatch(text, suggestions, index) {
  if (!/^\/\S+$/.test(text)) return false;
  let lower = text.slice(1).toLowerCase();
  return (
    getSuggestionMatchKeys(suggestions[index]).includes(lower) &&
    suggestions.every((suggestion, i) => i === index || !getSuggestionMatchKeys(suggestion).includes(lower))
  );
}
//@ chunk-czq1j3j2.js:580139-580369 sole-consumer
function getSuggestionMatchKeys(suggestion) {
  if (!suggestion || !isCommandMetadata_2(suggestion.metadata)) return [];
  let metadata = suggestion.metadata;
  let commandName = metadata.isMcp
    ? stripSuffix(getCommandName(metadata), " (MCP)")
    : getCommandName(metadata);
  return [
    metadata.name,
    commandName,
    ...(metadata.aliases ?? []),
    metadata.name.slice(metadata.name.lastIndexOf(":") + 1),
    commandName.slice(commandName.lastIndexOf(":") + 1),
  ].map((key) => key.toLowerCase());
}
//@ chunk-czq1j3j2.js:635948-636361 sole-consumer
var AT_TOKEN_RE; // deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
var WORD_CHAR_RE;
var AT_TOKEN_WITH_SYMBOL_RE;
var WORD_TAIL_RE;
var regExp_2;
var regExp_3;
var HASH_TOKEN_RE;
var COLON_TOKEN_RE;
var CLOSED_COLON_TOKEN_RE;
deferInit("chunk-czq1j3j2.js:635948", () => {
  AT_TOKEN_RE = /^@[\p{L}\p{N}\p{M}_\-./\\()[\]~:]*/u;
  WORD_CHAR_RE = /^[\p{L}\p{N}\p{M}_\-./\\()[\]~:]+/u;
  AT_TOKEN_WITH_SYMBOL_RE = /(@[\p{L}\p{N}\p{M}_\-./\\()[\]~:]*|[\p{L}\p{N}\p{M}_\-./\\()[\]~:]+)$/u;
  WORD_TAIL_RE = /[\p{L}\p{N}\p{M}_\-./\\()[\]~:]+$/u;
  regExp_2 = new RegExp(WORD_BOUNDARY_PATTERN, "u");
  regExp_3 = new RegExp(
    String.raw`(^|${WORD_BOUNDARY_PATTERN})@([\p{L}\p{N}\p{M}_\-./\\()[\]~:]*|"[^"]*"?)$`,
    "u",
  );
  HASH_TOKEN_RE = /(^|\s)#([a-z0-9][a-z0-9_-]*)$/;
  COLON_TOKEN_RE = /(^|\s):([a-z0-9_+-]{2,})$/;
  CLOSED_COLON_TOKEN_RE = /(^|\s):([a-z0-9_+-]+):$/;
});
//@ chunk-czq1j3j2.js:636361-636522 affinity
function isPrefixInsertion(query, previous, cursorOffset) {
  if (previous === undefined) return false;
  let insertedLength = query.length - previous.length;
  let insertStart = cursorOffset - insertedLength;
  return (
    insertedLength > 0 &&
    insertStart >= 0 &&
    query.slice(0, insertStart) + query.slice(cursorOffset) === previous &&
    /^[a-z0-9_+-]*:$/.test(query.slice(insertStart, cursorOffset))
  );
}
//@ chunk-czq1j3j2.js:636522-636627 fingerprint (2.1.88 match: isPathMetadata, 1)
/**
 * 是否为 {type: "file"|"directory"} 路径元数据对象。
 */
function isPathMetadata(metadata) {
  return (
    typeof metadata === "object" &&
    metadata !== null &&
    "type" in metadata &&
    (metadata.type === "directory" || metadata.type === "file")
  );
}
//@ chunk-czq1j3j2.js:636627-636770 file-local
function getPreservedSelection(prevSuggestions, prevSelection, newSuggestions) {
  if (newSuggestions.length === 0) return -1;
  if (prevSelection < 0) return 0;
  let prevSelectedItem = prevSuggestions[prevSelection];
  if (!prevSelectedItem) return 0;
  let newIndex = newSuggestions.findIndex((item) => item.id === prevSelectedItem.id);
  return newIndex >= 0 ? newIndex : 0;
}
//@ chunk-czq1j3j2.js:636770-636875 fingerprint (2.1.88 match: buildResumeInputFromSuggestion, 1)
function buildResumeInputFromSuggestion(suggestion) {
  let metadata = suggestion.metadata;
  return metadata?.sessionId ? `/resume ${metadata.sessionId}` : `/resume ${suggestion.displayText}`;
}
//@ chunk-czq1j3j2.js:636875-637048 layout
function findSelectedSuggestionIndex(prev, suggestions, suggestionType) {
  if (prev.suggestionType !== suggestionType || prev.selectedSuggestion < 0) return -1;
  let id = prev.suggestions[prev.selectedSuggestion]?.id;
  return id === undefined ? -1 : suggestions.findIndex((item) => item.id === id);
}
//@ chunk-czq1j3j2.js:637048-637143 layout
function withArrowedSuggestionId(state) {
  return {
    ...state,
    arrowedSuggestionId: state.suggestions[state.selectedSuggestion]?.id ?? null,
  };
}
//@ chunk-czq1j3j2.js:637143-637319 layout
function preserveArrowedSuggestion(previous, next) {
  let arrowedSuggestionId = previous.arrowedSuggestionId;
  return arrowedSuggestionId != null &&
    next !== previous &&
    next.arrowedSuggestionId === undefined &&
    next.suggestions[next.selectedSuggestion]?.id === arrowedSuggestionId
    ? {
        ...next,
        arrowedSuggestionId,
      }
    : next;
}
//@ chunk-czq1j3j2.js:637319-637478 layout
function logSuggestionNavUsed(host, id, state) {
  if (getArrowedSuggestionId(state) === null) return;
  let sessionState = loggedSessionState.of(host);
  if (sessionState.lastLoggedSessionId === id) return;
  sessionState.lastLoggedSessionId = id;
  logEvent("tengu_ax_sr_suggestion_nav_used", {});
}
//@ chunk-czq1j3j2.js:637478-637513 layout
function createEmptyAutocompleteStore() {
  return createAutocompleteStore(createStore(EMPTY_AUTOCOMPLETE_STATE_2));
}
//@ chunk-czq1j3j2.js:637513-637609 layout
var EMPTY_AUTOCOMPLETE_STATE_2 = {
  suggestions: [],
  selectedSuggestion: -1,
  suggestionType: "none",
  commandArgumentHint: undefined,
};
//@ chunk-czq1j3j2.js:637609-637859 layout
function normalizeEmptySuggestions(state) {
  return state.suggestions.length === 0 &&
    state.selectedSuggestion === -1 &&
    state.suggestionType === "none" &&
    state.commandArgumentHint === undefined &&
    state.suggestionsEmptyMessage === undefined &&
    state.maxColumnWidth === undefined &&
    !state.hoveredSuggestionId &&
    !state.arrowedSuggestionId
    ? state
    : EMPTY_AUTOCOMPLETE_STATE_2;
}
//@ chunk-czq1j3j2.js:637859-638001 fingerprint (2.1.88 match: extractSearchToken, 1)
function extractSearchToken(completionToken) {
  if (completionToken.isQuoted) return stripSuffix(completionToken.token.slice(2), '"');
  else if (completionToken.token.startsWith("@")) return completionToken.token.substring(1);
  else return completionToken.token;
}
//@ chunk-czq1j3j2.js:638001-638237 fingerprint (2.1.88 match: formatReplacementValue, 1)
function formatReplacementValue(options) {
  let { displayText, mode, hasAtPrefix, needsQuotes, isQuoted, isComplete } = options;
  let space = isComplete ? " " : "";
  if (isQuoted || needsQuotes)
    return mode === "bash" ? `"${displayText}"${space}` : `@"${displayText}"${space}`;
  else if (hasAtPrefix) return mode === "bash" ? `${displayText}${space}` : `@${displayText}${space}`;
  else return displayText;
}
//@ chunk-czq1j3j2.js:638237-638475 fingerprint (2.1.88 match: applyShellSuggestion, 1)
function applyShellSuggestion(
  suggestion,
  input,
  cursorOffset,
  onInputChange,
  setCursorOffset,
  completionType,
) {
  let tokenStart = input.slice(0, cursorOffset).lastIndexOf(" ") + 1;
  let replacementText;
  if (completionType === "variable") replacementText = "$" + suggestion.displayText + " ";
  else if (completionType === "command") replacementText = suggestion.displayText + " ";
  else replacementText = suggestion.displayText;
  let newInput = input.slice(0, tokenStart) + replacementText + input.slice(cursorOffset);
  onInputChange(newInput);
  setCursorOffset(tokenStart + replacementText.length);
}
//@ chunk-czq1j3j2.js:638475-638565 layout
var AT_MENTION_TOKEN_RE; // deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
var TEAM_NAME_CACHE_MS;
deferInit("chunk-czq1j3j2.js:638475", () => {
  AT_MENTION_TOKEN_RE = new RegExp(
    String.raw`(^|${WORD_BOUNDARY_PATTERN})@([\p{L}\p{N}\p{M}\u200C\u200D_-]*)$`,
    "u",
  );
  TEAM_NAME_CACHE_MS = 5000;
});
//@ chunk-czq1j3j2.js:638565-638797 placement (2.1.88 match: _temp, 1)
function isCursorInTriggerToken(suggestion, input, cursorOffset, triggerRegex, setValue, setCursorOffset) {
  let match = input.slice(0, cursorOffset).match(triggerRegex);
  if (!match || match.index === undefined) return false;
  let insertAt = match.index + (match[1]?.length ?? 0);
  let sliced = input.slice(0, insertAt);
  let nextInput = sliced + suggestion.displayText + " " + input.slice(cursorOffset);
  setValue(nextInput);
  setCursorOffset(sliced.length + suggestion.displayText.length + 1);
  return true;
}
//@ chunk-czq1j3j2.js:638797-639000 fingerprint (2.1.88 match: generateBashSuggestions, 1)
/**
 * bash 模式补全：调用 shell completion，失败记 tengu_shell_completion_failed。
 */
async function generateBashSuggestions(shellCompletionAbort, host, input, cursorOffset, sessionEnvVars) {
  if (isRemoteSessionAvailable()) return [];
  try {
    shellCompletionAbort.current?.abort();
    let abortController = new AbortController();
    shellCompletionAbort.current = abortController;
    return await getShellCompletions(host, input, cursorOffset, abortController.signal, sessionEnvVars);
  } catch {
    logEvent("tengu_shell_completion_failed", {});
    return [];
  }
}
//@ chunk-czq1j3j2.js:639000-639143 fingerprint (2.1.88 match: applyDirectorySuggestion, 1)
function applyDirectorySuggestion(input, suggestionId, tokenStartPos, tokenLength, isDirectory) {
  let suffix = isDirectory ? "/" : " ";
  let before = input.slice(0, tokenStartPos);
  let after = input.slice(tokenStartPos + tokenLength);
  let replacement = "@" + suggestionId + suffix;
  return {
    newInput: before + replacement + after,
    cursorPos: before.length + replacement.length,
  };
}
//@ chunk-czq1j3j2.js:639143-639796 fingerprint (2.1.88 match: extractCompletionToken, 1)
function extractCompletionToken(text, cursorPos, includeAtSymbol = false) {
  if (!text) return null;
  let textBeforeCursor = text.substring(0, cursorPos);
  if (includeAtSymbol) {
    let quotedAtRegex = /@"([^"]*)"?$/;
    let quotedMatch = textBeforeCursor.match(quotedAtRegex);
    if (quotedMatch && quotedMatch.index !== undefined) {
      let afterQuotedMatch = text.substring(cursorPos).match(/^[^"]*"?/);
      let quotedSuffix = afterQuotedMatch ? afterQuotedMatch[0] : "";
      return {
        token: quotedMatch[0] + quotedSuffix,
        startPos: quotedMatch.index,
        isQuoted: true,
      };
    }
  }
  if (includeAtSymbol) {
    let atIdx = textBeforeCursor.lastIndexOf("@");
    if (atIdx >= 0 && (atIdx === 0 || regExp_2.test(textBeforeCursor[atIdx - 1]))) {
      let fromAt = textBeforeCursor.substring(atIdx);
      let atHeadMatch = fromAt.match(AT_TOKEN_RE);
      if (atHeadMatch && atHeadMatch[0].length === fromAt.length) {
        let afterMatch = text.substring(cursorPos).match(WORD_CHAR_RE);
        let tokenSuffix = afterMatch ? afterMatch[0] : "";
        return {
          token: atHeadMatch[0] + tokenSuffix,
          startPos: atIdx,
          isQuoted: false,
        };
      }
    }
  }
  let tokenRegex = includeAtSymbol ? AT_TOKEN_WITH_SYMBOL_RE : WORD_TAIL_RE;
  let match = textBeforeCursor.match(tokenRegex);
  if (!match || match.index === undefined) return null;
  let afterMatch = text.substring(cursorPos).match(WORD_CHAR_RE);
  let tokenSuffix = afterMatch ? afterMatch[0] : "";
  return {
    token: match[0] + tokenSuffix,
    startPos: match.index,
    isQuoted: false,
  };
}
//@ chunk-czq1j3j2.js:639796-639955 fingerprint (2.1.88 match: extractCommandNameAndArgs, 1)
function extractCommandNameAndArgs(value) {
  if (isCommandInput(value)) {
    let spaceIndex = value.indexOf(" ");
    if (spaceIndex === -1)
      return {
        commandName: value.slice(1),
        args: "",
      };
    return {
      commandName: value.slice(1, spaceIndex),
      args: value.slice(spaceIndex + 1),
    };
  }
  return null;
}
//@ chunk-czq1j3j2.js:639955-640017 file-local
function hasCommandWithArguments(isAtEndWithWhitespace, value) {
  return !isAtEndWithWhitespace && value.includes(" ") && !value.endsWith(" ");
}
//@ chunk-czq1j3j2.js:640017-662708 fingerprint (2.1.88 match: useTypeahead, 0.697)
/**
 * 补全核心：根据光标前的 token 判定触发类型——"/" 命令与命令参数、"@" 文件/目录/agent/MCP 资源、bash 模式下的命令/路径/变量（shell completion）、":" emoji、/resume 会话标题；生成建议写入 suggestionsStore，处理 autocomplete:accept/dismiss/next/previous 与 Tab 补全，接受后改写 draft 的 value 与光标。
 */
function useTypeahead({
  draft,
  commands,
  onSubmit,
  agents,
  suggestionsStore,
  suppressSuggestions,
  markAccepted,
  sessionEnvVars,
}) {
  let value = useStoreSelector(draft, selectDraftValue);
  let cursorOffset = useStoreSelector(draft, selectCursorOffset);
  let mode = useStoreSelector(draft, selectInputMode);
  let { setValue, setCursorOffset, setMode } = draft;
  let takeRow = takeAutocompleteRow({
    shown: suggestionsStore,
    draft,
    text: value,
    cursor: cursorOffset,
    isOpen: mode === "prompt" && !suppressSuggestions,
  });
  let own = suggestionsStore.own;
  let state = useStoreSelector(suggestionsStore);
  let {
    suggestions,
    suggestionType,
    hoveredSuggestionId,
    commandArgumentHint,
    suggestionsEmptyMessage,
    maxColumnWidth,
  } = useStoreSelector(own);
  let updateState = useCallback(
    (updater) => own.setState((prev) => preserveArrowedSuggestion(prev, updater(prev))),
    [own],
  );
  let { addNotification } = useNotifications();
  let thinkingToggleShortcut = useShortcutDisplay_2("chat:thinkingToggle", "Chat", "alt+t");
  let hoveredSuggestionIdRef = useRef(hoveredSuggestionId);
  hoveredSuggestionIdRef.current = hoveredSuggestionId ?? null;
  let allCommandsMaxWidth = useMemo(() => {
    let visibleCommands = commands.filter((cmd) => !cmd.isHidden);
    if (visibleCommands.length === 0) return;
    return Math.max(...visibleCommands.map((cmd) => getCommandName(cmd).length)) + 6;
  }, [commands]);
  let resources = useAppState((cmd) => cmd.mcp.resources);
  let resourceTemplates = useAppState((appState) => appState.mcp.resourceTemplates);
  let store = useAppStoreDirect();
  let setAppState = useSetAppState();
  let emojiEnabled = useSettingsState().emojiCompletionEnabled !== false;
  let session = useSession();
  let host = useHost();
  let id = useSession((session) => session.id);
  let { storageV5 } = useTheme_2();
  let refreshResources = useCallback(() => {
    let state = store.getState();
    if (!state.mcp.clients.some((client) => client.type === "connected")) return;
    let { refreshResourceTemplates } = require("../services/mcp/emitTripwireEvent.lazy.js").mcpClientModule();
    refreshResourceTemplates(state.mcp.clients, state.mcp.resourceTemplates).then((templates) => {
      if (templates.length === 0) return;
      let cancelled = false;
      setAppState((prev) => {
        let resourceTemplates = prev.mcp.resourceTemplates;
        for (let { client, templates: templates_2 } of templates) {
          if (
            client.name in resourceTemplates ||
            !prev.mcp.clients.some(
              (client_2) => client_2.type === "connected" && client_2.client === client.client,
            )
          )
            continue;
          resourceTemplates = {
            ...resourceTemplates,
            [client.name]: templates_2,
          };
        }
        if (resourceTemplates === prev.mcp.resourceTemplates) return prev;
        cancelled = true;
        return {
          ...prev,
          mcp: {
            ...prev.mcp,
            resourceTemplates,
          },
        };
      });
      if (cancelled && searchKind.current === "at") latestSearchTokenRef.current = null;
    });
  }, [store, setAppState]);
  let promptSuggestion = useAppState((appState) => appState.promptSuggestion);
  let isViewingTeammate = useAppState((appState) => !!appState.viewingAgentTaskId);
  let keybindingContext = useKeybindingContext();
  let [inlineGhostText, setInlineGhostText] = useState(undefined);
  let isFullscreen = useIsFullscreen();
  let navEnabled = isSuggestionNavEnabled() && !isFullscreen;
  let syncPromptGhostText = useMemo(() => {
    if (mode !== "prompt" || isFullscreen || suppressSuggestions || suggestionType === "mid-command") return;
    let midInputCommand = findMidInputSlashCommand(value, cursorOffset);
    if (!midInputCommand) return;
    let partialCommand = getFilteredCommandSuggestions(session, midInputCommand.partialCommand, commands);
    let match = getBestCommandMatch(partialCommand, midInputCommand.partialCommand);
    if (!match) return;
    return {
      text: partialCommand.length > 1 ? `${match.suffix} +${partialCommand.length - 1}` : match.suffix,
      fullCommand: match.fullCommand,
      insertPosition: midInputCommand.startPos + 1 + midInputCommand.partialCommand.length,
    };
  }, [value, cursorOffset, mode, isFullscreen, suppressSuggestions, suggestionType, session, commands]);
  let selectGhostText = useMemo(() => {
    if (mode !== "bash" || !inlineGhostText) return;
    if (value.length < 2 || !value.trim()) return;
    let { fullCommand } = inlineGhostText;
    if (!fullCommand.startsWith(value) || fullCommand === value) return;
    if (inlineGhostText.insertPosition === value.length) return inlineGhostText;
    return {
      text: fullCommand.slice(value.length),
      fullCommand,
      insertPosition: value.length,
    };
  }, [mode, inlineGhostText, value]);
  let ghostTextSource = suppressSuggestions
    ? undefined
    : mode === "prompt"
      ? syncPromptGhostText
      : selectGhostText;
  let cursorOffsetRef = useRef(null);
  if (cursorOffsetRef.current === null) cursorOffsetRef.current = createDialFailureLatch();
  let latestSearchTokenRef = useRef(null);
  let searchKind = useRef("file");
  let prevInputRef = useRef("");
  let latestPathTokenRef = useRef("");
  let latestBashInputRef = useRef(0);
  let lastSuggestionKind = useRef("at-path");
  let latestSlackTokenRef = useRef(null);
  latestSlackTokenRef.current = null;
  let latestBashInputRef_2 = useRef("");
  let dismissedForInputRef = useRef("");
  let debounceTimer = useRef(null);
  let inFlightAbort = useRef(null);
  let stateRef = useRef({
    roster: {
      candidates: [],
      inProcess: new Set(),
      defaultNamed: new Set(),
    },
    at: 0,
    loading: false,
  });
  let pendingQuery = useRef(null);
  let lastQuery = useRef(null);
  let [renderCount, setRenderCount] = useState(0);
  let clearSuggestions = useCallback(() => {
    let previousState = stateRef.current;
    if (previousState.loading || Date.now() - previousState.at < TEAM_NAME_CACHE_MS) return;
    previousState.loading = true;
    resolvePeerAddressFromState(session, store.getState(), {
      storageV5,
    }).then(
      (roster) => {
        stateRef.current = {
          roster,
          at: Date.now(),
          loading: false,
        };
        setRenderCount((count) => count + 1);
      },
      () => {
        stateRef.current = {
          ...stateRef.current,
          at: Date.now(),
          loading: false,
        };
      },
    );
  }, [session, store, storageV5]);
  let fetchFileSuggestions = useCallback(() => {
    updateState(normalizeEmptySuggestions);
    setInlineGhostText(undefined);
  }, [updateState]);
  let fetchFileSuggestions_2 = useCallback(
    async (searchToken, forceTemplates = false) => {
      latestSearchTokenRef.current = searchToken;
      searchKind.current = forceTemplates ? "at" : "file";
      let isRemote = isRemoteSessionAvailable();
      let abort = null;
      let templates =
        forceTemplates && !isRemote ? store.getState().mcp.resourceTemplates : resourceTemplates;
      if (forceTemplates && !isRemote) {
        refreshResources();
        abort = await mcpTemplateCompletions(
          searchToken,
          templates,
          store.getState().mcp.clients,
          cursorOffsetRef.current,
        );
        if (latestSearchTokenRef.current !== searchToken) return;
      }
      if (!abort)
        abort = await generateUnifiedSuggestions(
          globalFileIndexCache,
          searchToken,
          {
            mcpResources: isRemote ? {} : resources,
            agents: isRemote ? [] : agents,
            showOnEmpty: forceTemplates,
            mcpResourceTemplates: isRemote ? {} : templates,
          },
          storageV5,
        );
      if (latestSearchTokenRef.current !== searchToken) return;
      if (abort.length === 0) {
        updateState(normalizeEmptySuggestions);
        return;
      }
      updateState((prev) => ({
        commandArgumentHint: undefined,
        suggestions: abort,
        selectedSuggestion: findSelectedSuggestionIndex(prev, abort, "file"),
        suggestionType: abort.length > 0 ? "file" : "none",
      }));
    },
    [resources, resourceTemplates, store, refreshResources, updateState, agents, storageV5],
  );
  useEffect(() => {
    let handle = setImmediate((prev) => {
      if (!isRemoteSessionAvailable()) startBackgroundCacheRefresh(globalFileIndexCache, prev);
    }, storageV5);
    let unsubscribeIndex = globalFileIndexCache.indexBuildComplete.subscribe(() => {
      let token = latestSearchTokenRef.current;
      if (token === null) return;
      let kind = searchKind.current;
      latestSearchTokenRef.current = null;
      fetchFileSuggestions_2(token, kind === "at");
    });
    return () => {
      clearImmediate(handle);
      unsubscribeIndex();
    };
  }, [fetchFileSuggestions_2, storageV5]);
  let debouncedFetchFileSuggestions = useDebouncedCallback(fetchFileSuggestions_2, 50);
  let fetchSlackChannels = useCallback(
    async (partial) => {
      dismissedForInputRef.current = partial;
      let channels = await getSlackChannelSuggestions(session, store.getState().mcp.clients, partial);
      if (dismissedForInputRef.current !== partial) return;
      updateState((prev) => ({
        commandArgumentHint: undefined,
        suggestions: channels,
        selectedSuggestion: findSelectedSuggestionIndex(prev, channels, "slack-channel"),
        suggestionType: channels.length > 0 ? "slack-channel" : "none",
      }));
    },
    [session, updateState],
  );
  let debouncedFetchSlackChannels = useDebouncedCallback(fetchSlackChannels, 150);
  let updateSuggestions = useCallback(() => {
    debouncedFetchFileSuggestions.cancel();
    debouncedFetchSlackChannels.cancel();
    latestSearchTokenRef.current = null;
    latestPathTokenRef.current = "";
    dismissedForInputRef.current = "";
  }, [debouncedFetchFileSuggestions, debouncedFetchSlackChannels]);
  let runBash = useCallback(
    async (query, inputCursorOffset, nextInput) => {
      if (lastQuery.current !== query) lastQuery.current = null;
      inFlightAbort.current = query;
      latestBashInputRef.current += 1;
      let latestBash = latestBashInputRef.current;
      let cursor = inputCursorOffset ?? draft.cursorOffset;
      if (suppressSuggestions) {
        debouncedFetchFileSuggestions.cancel();
        inFlightAbort.current = null;
        fetchFileSuggestions();
        return;
      }
      if (mode === "prompt") {
        let midInputCommand = findMidInputSlashCommand(query, cursor);
        let isMidCommand = suggestionType === "mid-command";
        let members =
          midInputCommand && (isMidCommand || midInputCommand.partialCommand)
            ? getCommandSuggestionsForQuery(session, midInputCommand.partialCommand, commands)
            : [];
        if (members.length > 0 && (isFullscreen || isMidCommand)) {
          updateSuggestions();
          updateState((state) => {
            let previousMid = state.suggestionType === "mid-command";
            let id = previousMid ? state.suggestions[state.selectedSuggestion]?.id : undefined;
            let index = members.findIndex((item) => item.id === id);
            if (index < 0 && previousMid && state.selectedSuggestion >= 0) index = 0;
            return {
              commandArgumentHint: undefined,
              suggestions: members,
              selectedSuggestion: index,
              suggestionType: "mid-command",
              maxColumnWidth: allCommandsMaxWidth,
            };
          });
          return;
        }
        if (members.length > 0) {
          updateState(normalizeEmptySuggestions);
          return;
        }
        if (isMidCommand) fetchFileSuggestions();
      }
      if (mode === "bash" && query.trim()) {
        let tokenStart = query.slice(0, cursor).lastIndexOf(" ") + 1;
        let normalized = query.slice(tokenStart, cursor);
        if (normalized && (looksLikePathToken(normalized) || normalized.includes("/"))) {
          latestPathTokenRef.current = normalized;
          let pathCompletions = await getPathCompletions(session, normalized, {
            maxResults: 10,
            keepDotPrefix: true,
          });
          if (latestPathTokenRef.current !== normalized) return;
          if (pathCompletions.length > 0) {
            setInlineGhostText(undefined);
            updateState((state) => ({
              suggestions: pathCompletions,
              selectedSuggestion: getPreservedSelection(
                state.suggestions,
                state.selectedSuggestion,
                pathCompletions,
              ),
              commandArgumentHint: undefined,
              suggestionType: "directory",
            }));
            lastSuggestionKind.current = "bash-path";
            return;
          }
        }
        if (suggestionType === "directory" && lastSuggestionKind.current === "bash-path")
          fetchFileSuggestions();
        latestBashInputRef_2.current = query;
        let historyMatch = await getShellHistoryCompletion(session, query, storageV5);
        if (latestBashInputRef_2.current !== query) return;
        if (historyMatch) {
          setInlineGhostText({
            text: historyMatch.suffix,
            fullCommand: historyMatch.fullCommand,
            insertPosition: query.length,
          });
          updateState(normalizeEmptySuggestions);
          return;
        } else setInlineGhostText(undefined);
      }
      let atMatch = mode !== "bash" ? query.substring(0, cursor).match(AT_MENTION_TOKEN_RE) : null;
      if (atMatch) {
        let slug = slugifySessionName(atMatch[2] ?? "");
        let state = store.getState();
        let members = [];
        let seen = new Set();
        if (isAgentSwarmsEnabled() && state.teamContext)
          for (let t of Object.values(state.teamContext.teammates ?? {})) {
            if (t.name === TEAM_LEAD) continue;
            if (!slugifySessionName(t.name).startsWith(slug)) continue;
            seen.add(t.name);
            members.push({
              id: `dm-${t.name}`,
              displayText: `@${t.name}`,
              description: "send message",
            });
          }
        for (let [name, agentId] of state.agentNameRegistry) {
          if (seen.has(name)) continue;
          if (!slugifySessionName(name).startsWith(slug)) continue;
          let status = state.tasks[agentId]?.status;
          members.push({
            id: `dm-${name}`,
            displayText: `@${name}`,
            description: status ? `send message \xB7 ${status}` : "send message",
          });
        }
        if (isCrossSessionMessagingEnabled() && !isRemoteSessionAvailable()) {
          let query_2 = pendingQuery.current;
          let result =
            query_2?.value === query && query_2.partial === slug
              ? query_2.rows
              : suggestPeerMentions(stateRef.current.roster, slug);
          pendingQuery.current = {
            value: query,
            partial: slug,
            rows: result,
          };
          members.push(...result);
          if (slug !== "") clearSuggestions();
        }
        if (members.length > 0) {
          debouncedFetchFileSuggestions.cancel();
          latestSearchTokenRef.current = null;
          latestPathTokenRef.current = "";
          dismissedForInputRef.current = "";
          debouncedFetchSlackChannels.cancel();
          let sameQuery = lastQuery.current === query;
          updateState((prev) => ({
            commandArgumentHint: undefined,
            suggestions: members,
            selectedSuggestion: sameQuery
              ? prev.suggestions.length === members.length &&
                prev.suggestions.every(
                  (suggestion, suggestion_2) => suggestion.id === members[suggestion_2].id,
                )
                ? prev.selectedSuggestion
                : -1
              : getPreservedSelection(prev.suggestions, prev.selectedSuggestion, members),
            suggestionType: "agent",
          }));
          return;
        }
      }
      if (mode === "prompt") {
        let hashMatch = query.substring(0, cursor).match(HASH_TOKEN_RE);
        let commandName = hashMatch ? extractCommandNameAndArgs(query) : null;
        let commandResult =
          commandName !== null &&
          findCommand(commandName.commandName, commands)?.completesHashChannels === true;
        if (hashMatch && !commandResult && hasSlackClient(store.getState().mcp.clients)) {
          debouncedFetchSlackChannels(hashMatch[2]);
          return;
        } else if (suggestionType === "slack-channel") {
          debouncedFetchSlackChannels.cancel();
          fetchFileSuggestions();
        }
      }
      if (mode === "prompt") {
        if (emojiEnabled) {
          let before = query.substring(0, cursor);
          let insertion = isPrefixInsertion(query, nextInput, cursor)
            ? before.match(CLOSED_COLON_TOKEN_RE)
            : null;
          if (insertion) {
            let emoji = lookupEmoji(insertion[2]);
            if (emoji) {
              let insertAt = (insertion.index ?? 0) + (insertion[1]?.length ?? 0);
              let nextInput = query.slice(0, insertAt) + emoji + query.slice(cursor);
              setValue(nextInput);
              setCursorOffset(insertAt + emoji.length);
              fetchFileSuggestions();
              logFeatureOk("input_emoji_completion", {
                inline: true,
              });
              return;
            }
          }
          let hasAtSymbol = before.match(COLON_TOKEN_RE);
          if (hasAtSymbol) {
            let emojiSuggestions = getEmojiSuggestions(hasAtSymbol[2]);
            if (emojiSuggestions.length > 0) {
              updateState((state) => ({
                commandArgumentHint: undefined,
                suggestions: emojiSuggestions,
                selectedSuggestion: getPreservedSelection(
                  state.suggestions,
                  state.selectedSuggestion,
                  emojiSuggestions,
                ),
                suggestionType: "emoji",
              }));
              return;
            }
          }
        }
        if (suggestionType === "emoji") fetchFileSuggestions();
      }
      let match = query.substring(0, cursor).match(regExp_3);
      let isAtEndWithWhitespace =
        cursor === query.length && cursor > 0 && query.length > 0 && query[cursor - 1] === " ";
      if (mode === "prompt" && isCommandInput(query) && cursor > 0) {
        let parsedCommand = extractCommandNameAndArgs(query);
        if (parsedCommand && DIR_ARG_COMMANDS.has(parsedCommand.commandName) && parsedCommand.args) {
          let { args } = parsedCommand;
          if (args.match(/\s+$/)) {
            debouncedFetchFileSuggestions.cancel();
            fetchFileSuggestions();
            return;
          }
          let dirSuggestions = await getDirectoryCompletions(session, args);
          if (dirSuggestions.length > 0) {
            updateState((prev) => ({
              suggestions: dirSuggestions,
              selectedSuggestion: getPreservedSelection(
                prev.suggestions,
                prev.selectedSuggestion,
                dirSuggestions,
              ),
              commandArgumentHint: undefined,
              suggestionType: "directory",
            }));
            lastSuggestionKind.current = "command-arg";
            return;
          }
          debouncedFetchFileSuggestions.cancel();
          fetchFileSuggestions();
          return;
        }
        if (
          parsedCommand &&
          parsedCommand.commandName === "resume" &&
          parsedCommand.args !== undefined &&
          parsedCommand.args.trim().length > 0 &&
          query.includes(" ")
        ) {
          let { args } = parsedCommand;
          let matches = await searchSessionsByCustomTitle(
            args,
            {
              limit: 10,
            },
            storageV5,
          );
          if (inFlightAbort.current !== query || debounceTimer.current === query) return;
          let suggestions = matches.map((log) => {
            let sessionId = getSessionIdFromLog(log);
            return {
              id: `resume-title-${sessionId}`,
              displayText: log.customTitle ?? log.aiTitle,
              description: formatLogMetadata(log),
              metadata: {
                sessionId,
              },
            };
          });
          if (suggestions.length > 0) {
            updateState((prev) => ({
              suggestions,
              selectedSuggestion: findSelectedSuggestionIndex(prev, suggestions, "custom-title"),
              commandArgumentHint: undefined,
              suggestionType: "custom-title",
            }));
            return;
          }
          fetchFileSuggestions();
          return;
        }
        if (parsedCommand && query.includes(" ")) {
          let command = findCommand(parsedCommand.commandName, commands);
          if (command?.getArgumentCompletions) {
            let argSuggestions = commandArgSuggestions(query, command.getArgumentCompletions, storageV5);
            let winner = await Promise.race([
              argSuggestions,
              new Promise((resolve) => setImmediate(resolve)),
            ]);
            if (
              winner === undefined &&
              own.getState().suggestions.some((suggestion) => !suggestion.id.startsWith(COMMAND_ARG))
            )
              fetchFileSuggestions();
            let chosen = winner ?? (await argSuggestions);
            if (inFlightAbort.current !== query || debounceTimer.current === query) return;
            if (chosen.length > 0) {
              updateState((state) => ({
                suggestions: chosen,
                selectedSuggestion: getPreservedSelection(
                  state.suggestions,
                  state.selectedSuggestion,
                  chosen,
                ),
                commandArgumentHint: undefined,
                suggestionType: "command",
              }));
              return;
            }
            debouncedFetchFileSuggestions.cancel();
            fetchFileSuggestions();
            return;
          }
        }
      }
      if (
        mode === "prompt" &&
        isCommandInput(query) &&
        cursor > 0 &&
        !hasCommandWithArguments(isAtEndWithWhitespace, query)
      ) {
        let commandArgumentHint = undefined;
        if (query.length > 1) {
          let spaceIndex = query.indexOf(" ");
          let commandWord = spaceIndex === -1 ? query.slice(1) : query.slice(1, spaceIndex);
          let hasRealArguments = spaceIndex !== -1 && query.slice(spaceIndex + 1).trim().length > 0;
          let hasExactlyOneTrailingSpace = spaceIndex !== -1 && query.length === spaceIndex + 1;
          if (spaceIndex !== -1) {
            let exactMatch = findCommand(commandWord, commands);
            if (exactMatch || hasRealArguments) {
              if (exactMatch?.argumentHint && hasExactlyOneTrailingSpace)
                commandArgumentHint = exactMatch.argumentHint;
              else if (exactMatch?.type === "prompt" && exactMatch.argNames?.length && query.endsWith(" ")) {
                let argsText = query.slice(spaceIndex + 1);
                let typedArgs = parseArgumentNames(argsText);
                commandArgumentHint = formatExtraArgHints(exactMatch.argNames, typedArgs);
              }
              updateState(() => ({
                commandArgumentHint,
                suggestions: [],
                selectedSuggestion: -1,
                suggestionType: "none",
              }));
              return;
            }
          }
        }
        let suggestions = generateCommandSuggestions(session, query, commands);
        let commandText = firstLineOf(query.slice(1), " ");
        let state =
          commandMatchesTypeaheadQuery(query, suggestions) && !isPluginHiddenCommand(query, commands)
            ? 0
            : -1;
        updateState((state_2) => {
          let selectedSuggestion = state;
          if (query === nextInput && state_2.selectedSuggestion >= 0) {
            let id = state_2.suggestions[state_2.selectedSuggestion]?.id;
            let index = suggestions.findIndex((item) => item.id === id);
            selectedSuggestion = index >= 0 ? index : state;
          }
          return {
            commandArgumentHint,
            suggestions,
            selectedSuggestion,
            suggestionType: "command",
            suggestionsEmptyMessage:
              suggestions.length === 0 && query.length > 1 && isValidCommandToken(commandText)
                ? `No commands match "${query}"`
                : undefined,
            maxColumnWidth: suggestions.length > 0 ? allCommandsMaxWidth : undefined,
          };
        });
        return;
      }
      if (suggestionType === "command") {
        debouncedFetchFileSuggestions.cancel();
        fetchFileSuggestions();
      } else if (isCommandInput(query) && hasCommandWithArguments(isAtEndWithWhitespace, query))
        updateState((prev) =>
          prev.commandArgumentHint
            ? {
                ...prev,
                commandArgumentHint: undefined,
              }
            : prev,
        );
      if (suggestionType === "custom-title") fetchFileSuggestions();
      if (
        suggestionType === "agent" &&
        own.getState().suggestions.some((suggestion) => suggestion.id?.startsWith("dm-"))
      ) {
        if (!query.substring(0, cursor).match(AT_MENTION_TOKEN_RE)) fetchFileSuggestions();
      }
      if (match && mode !== "bash") {
        let completionToken = extractCompletionToken(query, cursor, true);
        if (completionToken && completionToken.token.startsWith("@")) {
          let searchToken = extractSearchToken(completionToken);
          if (looksLikePathToken(searchToken)) {
            latestPathTokenRef.current = searchToken;
            let pathSuggestions = await getPathCompletions(session, searchToken, {
              maxResults: 10,
            });
            if (latestBashInputRef.current !== latestBash) return;
            if (latestPathTokenRef.current !== searchToken) return;
            if (pathSuggestions.length > 0) {
              updateState((prev) => ({
                suggestions: pathSuggestions,
                selectedSuggestion: getPreservedSelection(
                  prev.suggestions,
                  prev.selectedSuggestion,
                  pathSuggestions,
                ),
                commandArgumentHint: undefined,
                suggestionType: "directory",
              }));
              lastSuggestionKind.current = "at-path";
              return;
            }
          }
          if (latestSearchTokenRef.current === searchToken) return;
          debouncedFetchFileSuggestions(searchToken, true);
          return;
        }
      }
      if (suggestionType === "file") {
        let completionToken = extractCompletionToken(query, cursor, true);
        if (completionToken) {
          let searchToken = extractSearchToken(completionToken);
          if (latestSearchTokenRef.current === searchToken) return;
          debouncedFetchFileSuggestions(searchToken, false);
        } else {
          debouncedFetchFileSuggestions.cancel();
          fetchFileSuggestions();
        }
      }
      if (suggestionType === "shell") {
        let inputSnapshot = own.getState().suggestions[0]?.metadata?.inputSnapshot;
        if (mode !== "bash" || query !== inputSnapshot) {
          debouncedFetchFileSuggestions.cancel();
          fetchFileSuggestions();
        }
      }
      if (suggestionType !== "directory") return;
      debouncedFetchFileSuggestions.cancel();
      fetchFileSuggestions();
    },
    [
      suggestionType,
      commands,
      updateState,
      fetchFileSuggestions,
      fetchFileSuggestions_2,
      debouncedFetchFileSuggestions,
      debouncedFetchSlackChannels,
      mode,
      suppressSuggestions,
      draft,
      setValue,
      setCursorOffset,
      own,
      allCommandsMaxWidth,
      isFullscreen,
      updateSuggestions,
      emojiEnabled,
      session,
      storageV5,
      clearSuggestions,
    ],
  );
  useEffect(() => {
    if (debounceTimer.current === value) return;
    let previousInput = prevInputRef.current;
    if (previousInput !== value) {
      prevInputRef.current = value;
      latestSearchTokenRef.current = null;
    }
    debounceTimer.current = null;
    runBash(value, undefined, previousInput);
  }, [value, runBash]);
  let onAccept = useEffectEvent(() => {
    if (
      debounceTimer.current !== value &&
      own.getState().suggestions.length === 0 &&
      AT_MENTION_TOKEN_RE.test(value.substring(0, draft.cursorOffset))
    ) {
      pendingQuery.current = null;
      lastQuery.current = value;
      runBash(value);
    }
  });
  useEffect(() => {
    if (renderCount === 0) return;
    onAccept();
  }, [renderCount]);
  let handleTab = useCallback(async () => {
    if (mode === "bash" && ghostTextSource) {
      setValue(ghostTextSource.fullCommand);
      setCursorOffset(ghostTextSource.fullCommand.length);
      setInlineGhostText(undefined);
      return;
    }
    if (takeRow.tab()) return;
    let { value: value_2, cursorOffset: cursorOffset_2 } = draft;
    let nextValue =
      mode === "prompt" && !suppressSuggestions && suggestions.length === 0
        ? findMidInputSlashCommand(value_2, cursorOffset_2)
        : null;
    if (nextValue) {
      let commandSuggestionsForQuery = getCommandSuggestionsForQuery(
        session,
        nextValue.partialCommand,
        commands,
      );
      let nextValue_ =
        commandSuggestionsForQuery.length === 1 && commandSuggestionsForQuery[0]
          ? applyMidInputCommandSuggestion(commandSuggestionsForQuery[0], value_2, cursorOffset_2)
          : null;
      if (nextValue_) {
        setValue(nextValue_.value);
        setCursorOffset(nextValue_.cursorOffset);
        return;
      }
      if (commandSuggestionsForQuery.length > 1) {
        updateSuggestions();
        updateState(() => ({
          commandArgumentHint: undefined,
          suggestions: commandSuggestionsForQuery,
          selectedSuggestion: 0,
          suggestionType: "mid-command",
          maxColumnWidth: allCommandsMaxWidth,
        }));
        return;
      }
    }
    if (!ghostTextSource && takeRow.tabTop()) return;
    if (suggestions.length > 0) {
      debouncedFetchFileSuggestions.cancel();
      debouncedFetchSlackChannels.cancel();
      let hoveredId = hoveredSuggestionIdRef.current
        ? suggestions.findIndex((suggestion) => suggestion.id === hoveredSuggestionIdRef.current)
        : -1;
      let selectedSuggestion = own.getState().selectedSuggestion;
      if (
        hoveredId < 0 &&
        selectedSuggestion === -1 &&
        lastQuery.current === value &&
        suggestions.some((suggestion) => suggestion.id.startsWith("dm-peer-"))
      )
        return;
      let index = hoveredId >= 0 ? hoveredId : selectedSuggestion === -1 ? 0 : selectedSuggestion;
      let suggestion = suggestions[index];
      if (suggestionType === "command" && index < suggestions.length) {
        if (suggestion) {
          let newInput = applyCommandSuggestion({
            suggestion,
            shouldExecute: false,
            commands,
            onInputChange: setValue,
            setCursorOffset,
            onSubmit,
          });
          if (newInput?.reSuggest) runBash(newInput.newInput, newInput.newInput.length);
          else fetchFileSuggestions();
        }
      } else if (suggestionType === "mid-command") {
        let applied =
          suggestion &&
          getMidInputCommandCompletion({
            session,
            commands,
            row: suggestion,
            input: value_2,
            cursorOffset: cursorOffset_2,
          });
        if (applied) {
          setValue(applied.value);
          setCursorOffset(applied.cursorOffset);
        }
        fetchFileSuggestions();
      } else if (suggestionType === "custom-title" && suggestions.length > 0) {
        if (suggestion) {
          let newInput = buildResumeInputFromSuggestion(suggestion);
          setValue(newInput);
          setCursorOffset(newInput.length);
          fetchFileSuggestions();
        }
      } else if (suggestionType === "directory" && suggestions.length > 0) {
        let suggestion = suggestions[index];
        if (suggestion) {
          let newInput;
          if (lastSuggestionKind.current === "bash-path") {
            let tokenStart = value.slice(0, cursorOffset).lastIndexOf(" ") + 1;
            let isDir = isPathMetadata(suggestion.metadata) && suggestion.metadata.type === "directory";
            let replacement = suggestion.displayText + (isDir ? "" : " ");
            newInput = value.slice(0, tokenStart) + replacement + value.slice(cursorOffset);
            let nextCursor = tokenStart + replacement.length;
            setValue(newInput);
            setCursorOffset(nextCursor);
            if (isDir) runBash(newInput, nextCursor);
            else fetchFileSuggestions();
          } else if (lastSuggestionKind.current === "command-arg") {
            let spaceIndex = value.indexOf(" ");
            let commandPart = value.slice(0, spaceIndex + 1);
            let cmdSuffix =
              isPathMetadata(suggestion.metadata) && suggestion.metadata.type === "directory" ? "/" : " ";
            newInput = commandPart + suggestion.id + cmdSuffix;
            setValue(newInput);
            setCursorOffset(newInput.length);
            if (isPathMetadata(suggestion.metadata) && suggestion.metadata.type === "directory") {
              updateState((prev) => ({
                ...prev,
                commandArgumentHint: undefined,
              }));
              runBash(newInput, newInput.length);
            } else fetchFileSuggestions();
          } else {
            let nextValue =
              extractCompletionToken(value, cursorOffset, true) ??
              extractCompletionToken(value, cursorOffset, false);
            if (nextValue) {
              let isDir = isPathMetadata(suggestion.metadata) && suggestion.metadata.type === "directory";
              let result = applyDirectorySuggestion(
                value,
                suggestion.id,
                nextValue.startPos,
                nextValue.token.length,
                isDir,
              );
              newInput = result.newInput;
              setValue(newInput);
              setCursorOffset(result.cursorPos);
              if (isDir) {
                updateState((prev) => ({
                  ...prev,
                  commandArgumentHint: undefined,
                }));
                runBash(newInput, result.cursorPos);
              } else fetchFileSuggestions();
            } else fetchFileSuggestions();
          }
        }
      } else if (suggestionType === "shell" && suggestions.length > 0) {
        let suggestion = suggestions[index];
        if (suggestion) {
          let metadata = suggestion.metadata;
          applyShellSuggestion(
            suggestion,
            value,
            cursorOffset,
            setValue,
            setCursorOffset,
            metadata?.completionType,
          );
          fetchFileSuggestions();
        }
      } else if (
        suggestionType === "agent" &&
        suggestions.length > 0 &&
        suggestions[index]?.id?.startsWith("dm-")
      ) {
        let suggestion = suggestions[index];
        if (suggestion) {
          isCursorInTriggerToken(
            suggestion,
            value,
            cursorOffset,
            AT_MENTION_TOKEN_RE,
            setValue,
            setCursorOffset,
          );
          fetchFileSuggestions();
        }
      } else if (suggestionType === "slack-channel" && suggestions.length > 0) {
        let suggestion = suggestions[index];
        if (suggestion) {
          isCursorInTriggerToken(suggestion, value, cursorOffset, HASH_TOKEN_RE, setValue, setCursorOffset);
          fetchFileSuggestions();
        }
      } else if (emojiEnabled && suggestionType === "emoji" && suggestions.length > 0) {
        let suggestion = suggestions[index];
        if (suggestion) {
          let handled = isCursorInTriggerToken(
            suggestion,
            value,
            cursorOffset,
            COLON_TOKEN_RE,
            setValue,
            setCursorOffset,
          );
          fetchFileSuggestions();
          if (handled)
            logFeatureOk("input_emoji_completion", {
              inline: false,
            });
        }
      } else if (suggestionType === "file" && suggestions.length > 0) {
        let completionToken = extractCompletionToken(value, cursorOffset, true);
        if (!completionToken) {
          fetchFileSuggestions();
          return;
        }
        let commonPrefix = suggestions.some(
          (suggestion) => parseCompletionResult(suggestion.metadata) !== null,
        )
          ? ""
          : findLongestCommonPrefix(suggestions);
        let hasAtPrefix = completionToken.token.startsWith("@");
        let effectiveTokenLength;
        if (completionToken.isQuoted)
          effectiveTokenLength = stripSuffix(completionToken.token.slice(2), '"').length;
        else if (hasAtPrefix) effectiveTokenLength = completionToken.token.length - 1;
        else effectiveTokenLength = completionToken.token.length;
        if (commonPrefix.length > effectiveTokenLength) {
          let replacementValue = formatReplacementValue({
            displayText: commonPrefix,
            mode,
            hasAtPrefix,
            needsQuotes: false,
            isQuoted: completionToken.isQuoted,
            isComplete: false,
          });
          applyFileSuggestion({
            suggestion: replacementValue,
            input: value,
            partialPath: completionToken.token,
            startPos: completionToken.startPos,
            onInputChange: setValue,
            setCursorOffset,
          });
          runBash(value.replace(completionToken.token, replacementValue), cursorOffset);
        } else if (index < suggestions.length) {
          let suggestion = suggestions[index];
          if (suggestion) {
            let completionResult = parseCompletionResult(suggestion.metadata);
            let completion = completionResult
              ? `${completionResult.replacement}${completionResult.partial ? "" : " "}`
              : formatReplacementValue({
                  displayText: suggestion.displayText,
                  mode,
                  hasAtPrefix,
                  needsQuotes: suggestion.displayText.includes(" "),
                  isQuoted: completionToken.isQuoted,
                  isComplete: true,
                });
            let replacementValue = applyFileSuggestion({
              suggestion: completion,
              input: value,
              partialPath: completionToken.token,
              startPos: completionToken.startPos,
              onInputChange: setValue,
              setCursorOffset,
            });
            if (completionResult?.partial)
              runBash(replacementValue, completionToken.startPos + completion.length);
            else fetchFileSuggestions();
          }
        }
      }
    } else if (value.trim() !== "") {
      let suggestionType;
      let suggestionItems;
      if (mode === "bash") {
        suggestionType = "shell";
        let bashSuggestions = await generateBashSuggestions(
          draft.shellCompletionAbort,
          session.host,
          value,
          cursorOffset,
          sessionEnvVars,
        );
        if (bashSuggestions.length === 1) {
          let suggestion = bashSuggestions[0];
          if (suggestion) {
            let metadata = suggestion.metadata;
            applyShellSuggestion(
              suggestion,
              value,
              cursorOffset,
              setValue,
              setCursorOffset,
              metadata?.completionType,
            );
          }
          suggestionItems = [];
        } else suggestionItems = bashSuggestions;
      } else {
        suggestionType = "file";
        let completionInfo = extractCompletionToken(value, cursorOffset, true);
        if (completionInfo) {
          let isAtSymbol = completionInfo.token.startsWith("@");
          let mcpResources = extractSearchToken(completionInfo);
          let isRemote = isRemoteSessionAvailable();
          latestSearchTokenRef.current = mcpResources;
          searchKind.current = isAtSymbol ? "at" : "file";
          let promise = isAtSymbol && !isRemote ? store.getState().mcp.resourceTemplates : resourceTemplates;
          let abortRef = null;
          if (isAtSymbol && !isRemote) {
            refreshResources();
            abortRef = await mcpTemplateCompletions(
              mcpResources,
              promise,
              store.getState().mcp.clients,
              cursorOffsetRef.current,
            );
            if (latestSearchTokenRef.current !== mcpResources) return;
          }
          suggestionItems =
            abortRef ??
            (await generateUnifiedSuggestions(
              globalFileIndexCache,
              mcpResources,
              {
                mcpResources: isRemote ? {} : resources,
                agents: isRemote ? [] : agents,
                showOnEmpty: isAtSymbol,
                mcpResourceTemplates: isRemote ? {} : promise,
              },
              storageV5,
            ));
          if (latestSearchTokenRef.current !== mcpResources) return;
        } else suggestionItems = [];
      }
      if (suggestionItems.length > 0)
        updateState((prev) => ({
          commandArgumentHint: undefined,
          suggestions: suggestionItems,
          selectedSuggestion: getPreservedSelection(
            prev.suggestions,
            prev.selectedSuggestion,
            suggestionItems,
          ),
          suggestionType,
        }));
    }
  }, [
    suggestions,
    value,
    suggestionType,
    commands,
    mode,
    setValue,
    setCursorOffset,
    onSubmit,
    fetchFileSuggestions,
    cursorOffset,
    runBash,
    resources,
    resourceTemplates,
    store,
    refreshResources,
    updateState,
    agents,
    debouncedFetchFileSuggestions,
    debouncedFetchSlackChannels,
    ghostTextSource,
    session,
    sessionEnvVars,
    draft,
    own,
    emojiEnabled,
    storageV5,
    allCommandsMaxWidth,
    suppressSuggestions,
    updateSuggestions,
    takeRow,
  ]);
  let handleEnter = useCallback(
    (query, input, cursorOffset) => {
      let { suggestions, selectedSuggestion, suggestionType, arrowedSuggestionId } = own.getState();
      let arrowedSuggestionId_2 = getArrowedSuggestionId({
        suggestions,
        selectedSuggestion,
        arrowedSuggestionId,
      });
      let before =
        query === undefined &&
        navEnabled &&
        (suggestionType === "command" || suggestionType === "custom-title") &&
        arrowedSuggestionId_2 === null &&
        !(suggestionType === "command" && isUniqueCommandMatch(input, suggestions, selectedSuggestion));
      let draftText = draft.value;
      if (query === undefined && suggestionType === "command" && draftText !== input) {
        debouncedFetchFileSuggestions.cancel();
        fetchFileSuggestions();
        if (mode === "prompt" && isCommandInput(draftText) && draftText.slice(1).trim() !== "") {
          let suggestions = generateCommandSuggestions(session, draftText, commands);
          let first = suggestions[0];
          if (
            first &&
            commandMatchesTypeaheadQuery(draftText, suggestions) &&
            !isPluginHiddenCommand(draftText, commands) &&
            (!navEnabled ||
              first.id === arrowedSuggestionId_2 ||
              isUniqueCommandMatch(draftText, suggestions, 0))
          ) {
            let newInput = applyCommandSuggestion({
              suggestion: first,
              shouldExecute: true,
              commands,
              onInputChange: setValue,
              setCursorOffset,
              onSubmit,
            });
            if (newInput?.submitted) latestSlackTokenRef.current = draft.value;
            if (newInput?.reSuggest) runBash(newInput.newInput, newInput.newInput.length);
            return;
          }
        }
        onSubmit(draftText, true);
        latestSlackTokenRef.current = draft.value;
        return;
      }
      let hoveredId = hoveredSuggestionIdRef.current
        ? suggestions.findIndex((suggestion) => suggestion.id === hoveredSuggestionIdRef.current)
        : -1;
      let selectedSuggestion_2 = before ? -1 : (query ?? (hoveredId >= 0 ? hoveredId : selectedSuggestion));
      if (selectedSuggestion_2 < 0 || suggestions.length === 0) {
        if (
          suggestions.length > 0 &&
          lastQuery.current === input &&
          suggestions.some((suggestion) => suggestion.id.startsWith("dm-peer-"))
        ) {
          debounceTimer.current = input;
          fetchFileSuggestions();
        } else if (
          suggestions.length > 0 &&
          (suggestionType === "command" ||
            suggestionType === "mid-command" ||
            suggestionType === "custom-title" ||
            suggestionType === "file" ||
            suggestionType === "slack-channel")
        ) {
          debouncedFetchFileSuggestions.cancel();
          debouncedFetchSlackChannels.cancel();
          fetchFileSuggestions();
          onSubmit(draftText, true);
          latestSlackTokenRef.current = draft.value;
        }
        return;
      }
      let suggestion = suggestions[selectedSuggestion_2];
      if (suggestionType === "command" && selectedSuggestion_2 < suggestions.length) {
        if (suggestion) {
          if (
            query === undefined &&
            arrowedSuggestionId_2 === null &&
            suggestion.id.startsWith(COMMAND_ARG) &&
            /^\/\S+\s+$/.test(input) &&
            findCommand(input.trim().slice(1), commands)?.enterTakesArgumentCompletion !== true
          ) {
            debouncedFetchFileSuggestions.cancel();
            fetchFileSuggestions();
            onSubmit(input, true);
            latestSlackTokenRef.current = draft.value;
            return;
          }
          let nextInput = applyCommandSuggestion({
            suggestion,
            shouldExecute: query === undefined,
            commands,
            onInputChange: setValue,
            setCursorOffset,
            onSubmit,
          });
          if (nextInput?.submitted) latestSlackTokenRef.current = draft.value;
          debouncedFetchFileSuggestions.cancel();
          if (nextInput?.reSuggest) runBash(nextInput.newInput, nextInput.newInput.length);
          else fetchFileSuggestions();
        }
      } else if (suggestionType === "custom-title" && selectedSuggestion_2 < suggestions.length) {
        if (suggestion) {
          let newInput = buildResumeInputFromSuggestion(suggestion);
          setValue(newInput);
          setCursorOffset(newInput.length);
          onSubmit(newInput, true);
          latestSlackTokenRef.current = draft.value;
          debouncedFetchFileSuggestions.cancel();
          fetchFileSuggestions();
        }
      } else if (suggestionType === "shell" && selectedSuggestion_2 < suggestions.length) {
        if (suggestion) {
          let metadata = suggestion.metadata;
          applyShellSuggestion(
            suggestion,
            input,
            cursorOffset,
            setValue,
            setCursorOffset,
            metadata?.completionType,
          );
          debouncedFetchFileSuggestions.cancel();
          fetchFileSuggestions();
        }
      } else if (
        suggestionType === "agent" &&
        selectedSuggestion_2 < suggestions.length &&
        suggestion?.id?.startsWith("dm-")
      ) {
        isCursorInTriggerToken(
          suggestion,
          input,
          cursorOffset,
          AT_MENTION_TOKEN_RE,
          setValue,
          setCursorOffset,
        );
        debouncedFetchFileSuggestions.cancel();
        fetchFileSuggestions();
      } else if (suggestionType === "slack-channel" && selectedSuggestion_2 < suggestions.length) {
        if (suggestion) {
          isCursorInTriggerToken(suggestion, input, cursorOffset, HASH_TOKEN_RE, setValue, setCursorOffset);
          debouncedFetchSlackChannels.cancel();
          fetchFileSuggestions();
        }
      } else if (suggestionType === "mid-command") {
        let state =
          suggestion &&
          getMidInputCommandCompletion({
            session,
            commands,
            row: suggestion,
            input: draftText,
            cursorOffset: draft.cursorOffset,
          });
        fetchFileSuggestions();
        if (state) {
          setValue(state.value);
          setCursorOffset(state.cursorOffset);
        } else if (query === undefined) {
          onSubmit(draftText, true);
          latestSlackTokenRef.current = draft.value;
        }
      } else if (emojiEnabled && suggestionType === "emoji" && selectedSuggestion_2 < suggestions.length) {
        if (suggestion) {
          let handled = isCursorInTriggerToken(
            suggestion,
            input,
            cursorOffset,
            COLON_TOKEN_RE,
            setValue,
            setCursorOffset,
          );
          fetchFileSuggestions();
          if (handled)
            logFeatureOk("input_emoji_completion", {
              inline: false,
            });
        }
      } else if (suggestionType === "file" && selectedSuggestion_2 < suggestions.length) {
        let completionInfo = extractCompletionToken(input, cursorOffset, true);
        if (completionInfo) {
          if (suggestion) {
            let completionResult = parseCompletionResult(suggestion.metadata);
            let hasAtPrefix = completionInfo.token.startsWith("@");
            let completion = completionResult
              ? `${completionResult.replacement}${completionResult.partial ? "" : " "}`
              : formatReplacementValue({
                  displayText: suggestion.displayText,
                  mode,
                  hasAtPrefix,
                  needsQuotes: suggestion.displayText.includes(" "),
                  isQuoted: completionInfo.isQuoted,
                  isComplete: true,
                });
            let replacementValue = applyFileSuggestion({
              suggestion: completion,
              input,
              partialPath: completionInfo.token,
              startPos: completionInfo.startPos,
              onInputChange: setValue,
              setCursorOffset,
            });
            debouncedFetchFileSuggestions.cancel();
            if (completionResult?.partial)
              runBash(replacementValue, completionInfo.startPos + completion.length);
            else fetchFileSuggestions();
          }
        }
      } else if (suggestionType === "directory" && selectedSuggestion_2 < suggestions.length) {
        if (suggestion) {
          if (lastSuggestionKind.current === "bash-path") {
            debouncedFetchFileSuggestions.cancel();
            if (query === undefined && arrowedSuggestionId_2 === null) {
              fetchFileSuggestions();
              if (latestSlackTokenRef.current === null) {
                onSubmit(draft.value, true);
                latestSlackTokenRef.current = draft.value;
              }
              return;
            }
            let tokenStart = input.slice(0, cursorOffset).lastIndexOf(" ") + 1;
            let isDir = isPathMetadata(suggestion.metadata) && suggestion.metadata.type === "directory";
            let replacement = suggestion.displayText + (isDir ? "" : " ");
            let nextInput = input.slice(0, tokenStart) + replacement + input.slice(cursorOffset);
            setValue(nextInput);
            setCursorOffset(tokenStart + replacement.length);
            fetchFileSuggestions();
            return;
          }
          if (lastSuggestionKind.current === "command-arg") {
            debouncedFetchFileSuggestions.cancel();
            if (query !== undefined || arrowedSuggestionId_2 !== null) {
              let index = input.indexOf(" ");
              let sliced = input.slice(0, index + 1);
              let isDir = isPathMetadata(suggestion.metadata) && suggestion.metadata.type === "directory";
              let nextValue = sliced + suggestion.id + (isDir ? "/" : " ");
              setValue(nextValue);
              setCursorOffset(nextValue.length);
              if (isDir) runBash(nextValue, nextValue.length);
              else fetchFileSuggestions();
              return;
            }
            fetchFileSuggestions();
            onSubmit(input, true);
            latestSlackTokenRef.current = draft.value;
            return;
          }
          let completionToken =
            extractCompletionToken(input, cursorOffset, true) ??
            extractCompletionToken(input, cursorOffset, false);
          if (completionToken) {
            let isDir = isPathMetadata(suggestion.metadata) && suggestion.metadata.type === "directory";
            let result = applyDirectorySuggestion(
              input,
              suggestion.id,
              completionToken.startPos,
              completionToken.token.length,
              isDir,
            );
            setValue(result.newInput);
            setCursorOffset(result.cursorPos);
          }
          debouncedFetchFileSuggestions.cancel();
          fetchFileSuggestions();
        }
      }
    },
    [
      own,
      navEnabled,
      commands,
      draft,
      session,
      mode,
      setValue,
      setCursorOffset,
      onSubmit,
      fetchFileSuggestions,
      debouncedFetchFileSuggestions,
      debouncedFetchSlackChannels,
      runBash,
      emojiEnabled,
    ],
  );
  let handleAutocompleteAccept = useCallback(() => {
    handleTab();
  }, [handleTab]);
  let handleAutocompleteDismiss = useCallback(() => {
    debouncedFetchFileSuggestions.cancel();
    debouncedFetchSlackChannels.cancel();
    takeRow.drop();
    fetchFileSuggestions();
    debounceTimer.current = value;
    latestBashInputRef.current += 1;
  }, [debouncedFetchFileSuggestions, debouncedFetchSlackChannels, fetchFileSuggestions, value, takeRow]);
  let handleAutocompletePrevious = useCallback(() => {
    let state = suggestionsStore.getState();
    let count = own.getState().suggestions.length;
    if (
      !navEnabled ||
      !state.suggestions[state.selectedSuggestion] ||
      state.selectedSuggestion >= count ||
      getArrowedSuggestionId(state) !== null
    )
      return false;
    updateState(withArrowedSuggestionId);
    logSuggestionNavUsed(host, id, own.getState());
    return true;
  }, [navEnabled, own, suggestionsStore, updateState, host, id]);
  let onBlur = useCallback(() => {
    if (handleAutocompletePrevious()) return;
    if (takeRow.move(-1, navEnabled)) {
      logSuggestionNavUsed(host, id, suggestionsStore.getState());
      return;
    }
    updateState((prev) => {
      let state = {
        ...prev,
        hoveredSuggestionId: null,
        selectedSuggestion:
          prev.selectedSuggestion <= 0 ? prev.suggestions.length - 1 : prev.selectedSuggestion - 1,
      };
      return navEnabled ? withArrowedSuggestionId(state) : state;
    });
    logSuggestionNavUsed(host, id, own.getState());
  }, [updateState, handleAutocompletePrevious, navEnabled, host, id, own, suggestionsStore, takeRow]);
  let handleAutocompleteNext = useCallback(() => {
    if (handleAutocompletePrevious()) return;
    if (takeRow.move(1, navEnabled)) {
      logSuggestionNavUsed(host, id, suggestionsStore.getState());
      return;
    }
    updateState((prev) => {
      let state = {
        ...prev,
        hoveredSuggestionId: null,
        selectedSuggestion:
          prev.selectedSuggestion >= prev.suggestions.length - 1 ? 0 : prev.selectedSuggestion + 1,
      };
      return navEnabled ? withArrowedSuggestionId(state) : state;
    });
    logSuggestionNavUsed(host, id, own.getState());
  }, [updateState, handleAutocompletePrevious, navEnabled, host, id, own, suggestionsStore, takeRow]);
  useEffect(() => {
    if (!navEnabled) return;
    let { value, cursorOffset } = draft;
    return draft.subscribe(() => {
      if (draft.value === value && draft.cursorOffset === cursorOffset) return;
      value = draft.value;
      cursorOffset = draft.cursorOffset;
      updateState((state) =>
        state.arrowedSuggestionId
          ? {
              ...state,
              arrowedSuggestionId: null,
            }
          : state,
      );
    });
  }, [draft, updateState, navEnabled]);
  let autocompleteHandlers = useCallback(
    (state) => {
      updateState((state_2) =>
        state_2.hoveredSuggestionId === state
          ? state_2
          : {
              ...state_2,
              hoveredSuggestionId: state,
            },
      );
    },
    [updateState],
  );
  let selectSuggestion = useCallback(
    (value, cursor) => {
      if (takeRow.click(cursor)) return;
      let index = own.getState().suggestions.findIndex((suggestion) => suggestion.id === cursor);
      if (index < 0) return;
      handleEnter(index, draft.value, draft.cursorOffset);
    },
    [handleEnter, draft, own, takeRow],
  );
  let derived = useMemo(
    () => ({
      "autocomplete:accept": handleAutocompleteAccept,
      "autocomplete:dismiss": handleAutocompleteDismiss,
      "autocomplete:previous": onBlur,
      "autocomplete:next": handleAutocompleteNext,
    }),
    [handleAutocompleteAccept, handleAutocompleteDismiss, onBlur, handleAutocompleteNext],
  );
  let isAutocompleteActive = state.suggestions.length > 0 || !!ghostTextSource;
  let isModalOverlayActive = useThirdOverlayKeys();
  useRegisterOverlay("autocomplete", isAutocompleteActive);
  useRegisterKeybindingContext("Autocomplete", isAutocompleteActive);
  MessageActionsKeybindings(derived, {
    context: "Autocomplete",
    isActive: isAutocompleteActive && !isModalOverlayActive,
  });
  function acceptSuggestionText(text) {
    let detectedMode = getModeFromInput_2(text);
    if (detectedMode !== "prompt") {
      setMode(detectedMode);
      let stripped = stripModePrefix(text);
      setValue(stripped);
      setCursorOffset(stripped.length);
    } else {
      setValue(text);
      setCursorOffset(text.length);
    }
  }
  let handleKeyDown = (e) => {
    if (e.name === "right" && !isViewingTeammate) {
      if (isShownOrAcceptedSuggestion(promptSuggestion) && value === "") {
        markAccepted();
        acceptSuggestionText(promptSuggestion.text);
        e.preventDefault();
        e.stopImmediatePropagation();
        return;
      }
    }
    if (e.name === "tab" && !e.shift) {
      if (suggestionsStore.getState().suggestions.length > 0 || ghostTextSource) return;
      let suggestionText =
        mode === "prompt" && !suppressSuggestions
          ? findMidInputSlashCommand(draft.value, draft.cursorOffset)
          : null;
      if (
        suggestionText &&
        getCommandSuggestionsForQuery(session, suggestionText.partialCommand, commands).length > 0
      ) {
        e.preventDefault();
        handleTab().catch(logError);
        return;
      }
      if (isShownOrAcceptedSuggestion(promptSuggestion) && value === "" && !isViewingTeammate) {
        e.preventDefault();
        markAccepted();
        acceptSuggestionText(promptSuggestion.text);
        return;
      }
      if (value.trim() === "") {
        e.preventDefault();
        addNotification({
          key: "thinking-toggle-hint",
          kind: "hint",
          text: `Use ${thinkingToggleShortcut} to toggle thinking`,
          row1Hint: `${thinkingToggleShortcut} to toggle thinking`,
          priority: "immediate",
          timeoutMs: 3000,
        });
      }
      return;
    }
    if (suggestionsStore.getState().suggestions.length === 0) {
      if (
        e.name === "return" &&
        !e.shift &&
        !e.meta &&
        latestSlackTokenRef.current !== null &&
        draft.value === latestSlackTokenRef.current
      )
        e.preventDefault();
      return;
    }
    let hasPendingChord = keybindingContext?.pendingChord != null;
    if (e.ctrl && e.key === "n" && !hasPendingChord) {
      e.preventDefault();
      handleAutocompleteNext();
      return;
    }
    if (e.ctrl && e.key === "p" && !hasPendingChord) {
      e.preventDefault();
      onBlur();
      return;
    }
    if (e.name === "return" && !e.shift && !e.meta) {
      let entry = takeRow.enter();
      if (entry === "left") return;
      if (entry === "taken") {
        e.preventDefault();
        return;
      }
      if (own.getState().suggestionType === "directory" && lastSuggestionKind.current === "bash-path") {
        let oldValue = draft.value;
        let offsetDelta = cursorOffset + (oldValue.length - value.length);
        if (oldValue[offsetDelta - 1] === "\\" || needsShiftWorkaround()) return;
      }
      e.preventDefault();
      handleEnter(undefined, value, cursorOffset);
    }
  };
  return {
    suggestions: state.suggestions,
    selectedSuggestion: state.selectedSuggestion,
    suggestionType,
    maxColumnWidth,
    commandArgumentHint,
    suggestionsEmptyMessage,
    inlineGhostText: ghostTextSource,
    handleKeyDown,
    selectSuggestion,
    setHoveredSuggestion: autocompleteHandlers,
    hoveredSuggestionId: hoveredSuggestionId ?? null,
    cursorRowId: getArrowedSuggestionId(state),
  };
}
export { createEmptyAutocompleteStore, useTypeahead };
