/**
 * hooks/useTypeahead.tsx
 *
 * 输入补全：斜杠命令、命令参数、@ 文件/agent/MCP 资源、bash 命令与路径、emoji、/resume 会话等建议的生成、导航与接受。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/hooks/useTypeahead.tsx
 * pieces: chunk-18hwfzwa.js (27)
 * attribution: placement 2, sole-consumer 4, affinity 1, fingerprint 10, file-local 2, layout 8
 */
import {
  isCommandMetadata,
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
import { ce, R, Q, y, P, Oo } from "../../vendor/react/cjs/react.production.js";
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
import { resolveTeamName, suggestPeerMentions } from "../utils/peerAddressing.js";
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

//@ chunk-18hwfzwa.js:558864-559060 placement = toolMatchesName (0.66)
/**
 * （旧版名 toolMatchesName 是错配）typeahead 里判断 "/xxx" 输入是否匹配候选命令：按命令元数据的 name、命令名和别名做模糊匹配，非命令候选直接通过。
 */
function commandMatchesTypeaheadQuery(query, suggestions) {
  let D = suggestions[0];
  if (!D) return false;
  if (!isCommandMetadata(D.metadata)) return true;
  let trimmed = query.slice(1).toLowerCase().trim();
  if (trimmed === "") return true;
  let metadata = D.metadata;
  return matchesCommandWords(trimmed, [metadata.name, getCommandName(metadata), ...(metadata.aliases ?? [])]);
}
//@ chunk-18hwfzwa.js:559060-559299 sole-consumer
function isPluginHiddenCommand(h, commands) {
  let D = h.trimEnd();
  let L = /^\/\S+$/.test(D) ? D.slice(1).toLowerCase() : "";
  return (
    L !== "" &&
    areSkillsConvertedAsPlugins() &&
    commands.some(
      (ee) =>
        ee.type === "prompt" &&
        ee.hiddenBehindPlugin !== undefined &&
        [ee.name, getCommandName(ee), ...(ee.aliases ?? [])].some((ke) => ke.toLowerCase() === L),
    )
  );
}
//@ chunk-18hwfzwa.js:559299-559458 sole-consumer
function isUniqueCommandMatch(h, x, D) {
  if (!/^\/\S+$/.test(h)) return false;
  let lower = h.slice(1).toLowerCase();
  return (
    getSuggestionMatchKeys(x[D]).includes(lower) &&
    x.every((ee, ke) => ke === D || !getSuggestionMatchKeys(ee).includes(lower))
  );
}
//@ chunk-18hwfzwa.js:559458-559688 sole-consumer
function getSuggestionMatchKeys(h) {
  if (!h || !isCommandMetadata(h.metadata)) return [];
  let metadata = h.metadata;
  let D = metadata.isMcp ? stripSuffix(getCommandName(metadata), " (MCP)") : getCommandName(metadata);
  return [
    metadata.name,
    D,
    ...(metadata.aliases ?? []),
    metadata.name.slice(metadata.name.lastIndexOf(":") + 1),
    D.slice(D.lastIndexOf(":") + 1),
  ].map((L) => L.toLowerCase());
}
//@ chunk-18hwfzwa.js:615267-615680 sole-consumer
var AT_TOKEN_RE = /^@[\p{L}\p{N}\p{M}_\-./\\()[\]~:]*/u;
var WORD_CHAR_RE = /^[\p{L}\p{N}\p{M}_\-./\\()[\]~:]+/u;
var AT_TOKEN_WITH_SYMBOL_RE = /(@[\p{L}\p{N}\p{M}_\-./\\()[\]~:]*|[\p{L}\p{N}\p{M}_\-./\\()[\]~:]+)$/u;
var WORD_TAIL_RE = /[\p{L}\p{N}\p{M}_\-./\\()[\]~:]+$/u;
var regExp_2 = new RegExp(WORD_BOUNDARY_PATTERN, "u");
var regExp_3 = new RegExp(
  String.raw`(^|${WORD_BOUNDARY_PATTERN})@([\p{L}\p{N}\p{M}_\-./\\()[\]~:]*|"[^"]*"?)$`,
  "u",
);
var HASH_TOKEN_RE = /(^|\s)#([a-z0-9][a-z0-9_-]*)$/;
var COLON_TOKEN_RE = /(^|\s):([a-z0-9_+-]{2,})$/;
var CLOSED_COLON_TOKEN_RE = /(^|\s):([a-z0-9_+-]+):$/;
//@ chunk-18hwfzwa.js:615680-615841 affinity
function isPrefixInsertion(h, x, D) {
  if (x === undefined) return false;
  let L = h.length - x.length;
  let ee = D - L;
  return L > 0 && ee >= 0 && h.slice(0, ee) + h.slice(D) === x && /^[a-z0-9_+-]*:$/.test(h.slice(ee, D));
}
//@ chunk-18hwfzwa.js:615841-615946 fingerprint = isPathMetadata (1)
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
//@ chunk-18hwfzwa.js:615946-616089 file-local
function getPreservedSelection(prevSuggestions, prevSelection, newSuggestions) {
  if (newSuggestions.length === 0) return -1;
  if (prevSelection < 0) return 0;
  let prevSelectedItem = prevSuggestions[prevSelection];
  if (!prevSelectedItem) return 0;
  let newIndex = newSuggestions.findIndex((item) => item.id === prevSelectedItem.id);
  return newIndex >= 0 ? newIndex : 0;
}
//@ chunk-18hwfzwa.js:616089-616194 fingerprint = buildResumeInputFromSuggestion (1)
function buildResumeInputFromSuggestion(suggestion) {
  let metadata = suggestion.metadata;
  return metadata?.sessionId ? `/resume ${metadata.sessionId}` : `/resume ${suggestion.displayText}`;
}
//@ chunk-18hwfzwa.js:616194-616367 layout
function findSelectedSuggestionIndex(prev, x, D) {
  if (prev.suggestionType !== D || prev.selectedSuggestion < 0) return -1;
  let id = prev.suggestions[prev.selectedSuggestion]?.id;
  return id === undefined ? -1 : x.findIndex((item) => item.id === id);
}
//@ chunk-18hwfzwa.js:616367-616462 layout
function withArrowedSuggestionId(h) {
  return {
    ...h,
    arrowedSuggestionId: h.suggestions[h.selectedSuggestion]?.id ?? null,
  };
}
//@ chunk-18hwfzwa.js:616462-616638 layout
function preserveArrowedSuggestion(h, x) {
  let arrowedSuggestionId = h.arrowedSuggestionId;
  return arrowedSuggestionId != null &&
    x !== h &&
    x.arrowedSuggestionId === undefined &&
    x.suggestions[x.selectedSuggestion]?.id === arrowedSuggestionId
    ? {
        ...x,
        arrowedSuggestionId,
      }
    : x;
}
//@ chunk-18hwfzwa.js:616638-616797 layout
function logSuggestionNavUsed(host, id, state) {
  if (getArrowedSuggestionId(state) === null) return;
  let L = loggedSessionState.of(host);
  if (L.lastLoggedSessionId === id) return;
  L.lastLoggedSessionId = id;
  logEvent("tengu_ax_sr_suggestion_nav_used", {});
}
//@ chunk-18hwfzwa.js:616797-616832 layout
function createEmptyAutocompleteStore() {
  return createAutocompleteStore(createStore(EMPTY_AUTOCOMPLETE_STATE));
}
//@ chunk-18hwfzwa.js:616832-616928 layout
var EMPTY_AUTOCOMPLETE_STATE = {
  suggestions: [],
  selectedSuggestion: -1,
  suggestionType: "none",
  commandArgumentHint: undefined,
};
//@ chunk-18hwfzwa.js:616928-617178 layout
function normalizeEmptySuggestions(h) {
  return h.suggestions.length === 0 &&
    h.selectedSuggestion === -1 &&
    h.suggestionType === "none" &&
    h.commandArgumentHint === undefined &&
    h.suggestionsEmptyMessage === undefined &&
    h.maxColumnWidth === undefined &&
    !h.hoveredSuggestionId &&
    !h.arrowedSuggestionId
    ? h
    : EMPTY_AUTOCOMPLETE_STATE;
}
//@ chunk-18hwfzwa.js:617178-617320 fingerprint = extractSearchToken (1)
function extractSearchToken(completionToken) {
  if (completionToken.isQuoted) return stripSuffix(completionToken.token.slice(2), '"');
  else if (completionToken.token.startsWith("@")) return completionToken.token.substring(1);
  else return completionToken.token;
}
//@ chunk-18hwfzwa.js:617320-617556 fingerprint = formatReplacementValue (1)
function formatReplacementValue(options) {
  let { displayText, mode, hasAtPrefix, needsQuotes, isQuoted, isComplete } = options;
  let space = isComplete ? " " : "";
  if (isQuoted || needsQuotes)
    return mode === "bash" ? `"${displayText}"${space}` : `@"${displayText}"${space}`;
  else if (hasAtPrefix) return mode === "bash" ? `${displayText}${space}` : `@${displayText}${space}`;
  else return displayText;
}
//@ chunk-18hwfzwa.js:617556-617794 fingerprint = applyShellSuggestion (1)
function applyShellSuggestion(
  suggestion,
  input,
  cursorOffset,
  onInputChange,
  setCursorOffset,
  completionType,
) {
  let He = input.slice(0, cursorOffset).lastIndexOf(" ") + 1;
  let replacementText;
  if (completionType === "variable") replacementText = "$" + suggestion.displayText + " ";
  else if (completionType === "command") replacementText = suggestion.displayText + " ";
  else replacementText = suggestion.displayText;
  let newInput = input.slice(0, He) + replacementText + input.slice(cursorOffset);
  onInputChange(newInput);
  setCursorOffset(He + replacementText.length);
}
//@ chunk-18hwfzwa.js:617794-617884 layout
var AT_MENTION_TOKEN_RE = new RegExp(
  String.raw`(^|${WORD_BOUNDARY_PATTERN})@([\p{L}\p{N}\p{M}\u200C\u200D_-]*)$`,
  "u",
);
var TEAM_NAME_CACHE_MS = 5000;
//@ chunk-18hwfzwa.js:617884-618116 placement = _temp (1)
function isCursorInTriggerToken(h, x, cursorOffset, L, setValue, setCursorOffset) {
  let match = x.slice(0, cursorOffset).match(L);
  if (!match || match.index === undefined) return false;
  let Be = match.index + (match[1]?.length ?? 0);
  let sliced = x.slice(0, Be);
  let We = sliced + h.displayText + " " + x.slice(cursorOffset);
  setValue(We);
  setCursorOffset(sliced.length + h.displayText.length + 1);
  return true;
}
//@ chunk-18hwfzwa.js:618116-618319 fingerprint = generateBashSuggestions (1)
/**
 * bash 模式补全：调用 shell completion，失败记 tengu_shell_completion_failed。
 */
async function generateBashSuggestions(shellCompletionAbort, host, D, cursorOffset, sessionEnvVars) {
  if (isRemoteSessionAvailable()) return [];
  try {
    shellCompletionAbort.current?.abort();
    let abortController = new AbortController();
    shellCompletionAbort.current = abortController;
    return await getShellCompletions(host, D, cursorOffset, abortController.signal, sessionEnvVars);
  } catch {
    logEvent("tengu_shell_completion_failed", {});
    return [];
  }
}
//@ chunk-18hwfzwa.js:618319-618462 fingerprint = applyDirectorySuggestion (1)
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
//@ chunk-18hwfzwa.js:618462-619115 fingerprint = extractCompletionToken (1)
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
//@ chunk-18hwfzwa.js:619115-619274 fingerprint = extractCommandNameAndArgs (1)
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
//@ chunk-18hwfzwa.js:619274-619336 file-local
function hasCommandWithArguments(isAtEndWithWhitespace, value) {
  return !isAtEndWithWhitespace && value.includes(" ") && !value.endsWith(" ");
}
//@ chunk-18hwfzwa.js:619336-642027 fingerprint = useTypeahead (0.697)
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
  let At = takeAutocompleteRow({
    shown: suggestionsStore,
    draft,
    text: value,
    cursor: cursorOffset,
    isOpen: mode === "prompt" && !suppressSuggestions,
  });
  let own = suggestionsStore.own;
  let storeSelector = useStoreSelector(suggestionsStore);
  let {
    suggestions,
    suggestionType,
    hoveredSuggestionId,
    commandArgumentHint,
    suggestionsEmptyMessage,
    maxColumnWidth,
  } = useStoreSelector(own);
  let so = ce((qn) => own.setState((ps) => preserveArrowedSuggestion(ps, qn(ps))), [own]);
  let { addNotification } = useNotifications();
  let thinkingToggleShortcut = useShortcutDisplay_2("chat:thinkingToggle", "Chat", "alt+t");
  let hoveredSuggestionIdRef = R(hoveredSuggestionId);
  hoveredSuggestionIdRef.current = hoveredSuggestionId ?? null;
  let allCommandsMaxWidth = Q(() => {
    let visibleCommands = commands.filter((cmd) => !cmd.isHidden);
    if (visibleCommands.length === 0) return;
    return Math.max(...visibleCommands.map((cmd) => getCommandName(cmd).length)) + 6;
  }, [commands]);
  let resources = useAppState((cmd) => cmd.mcp.resources);
  let resourceTemplates = useAppState((qn) => qn.mcp.resourceTemplates);
  let store = useAppStoreDirect();
  let setAppState = useSetAppState();
  let Wo = useSettingsState().emojiCompletionEnabled !== false;
  let session = useSession();
  let host = useHost();
  let id = useSession((qn) => qn.id);
  let { storageV5 } = useTheme_2();
  let Yo = ce(() => {
    let state = store.getState();
    if (!state.mcp.clients.some((client) => client.type === "connected")) return;
    let { refreshResourceTemplates } = require("./chunk-asne9cp8.js").mcpClientModule();
    refreshResourceTemplates(state.mcp.clients, state.mcp.resourceTemplates).then((xs) => {
      if (xs.length === 0) return;
      let kr = false;
      setAppState((ls) => {
        let resourceTemplates = ls.mcp.resourceTemplates;
        for (let { client, templates } of xs) {
          if (
            client.name in resourceTemplates ||
            !ls.mcp.clients.some(
              (client_2) => client_2.type === "connected" && client_2.client === client.client,
            )
          )
            continue;
          resourceTemplates = {
            ...resourceTemplates,
            [client.name]: templates,
          };
        }
        if (resourceTemplates === ls.mcp.resourceTemplates) return ls;
        kr = true;
        return {
          ...ls,
          mcp: {
            ...ls.mcp,
            resourceTemplates,
          },
        };
      });
      if (kr && Dn.current === "at") latestSearchTokenRef.current = null;
    });
  }, [store, setAppState]);
  let promptSuggestion = useAppState((qn) => qn.promptSuggestion);
  let isViewingTeammate = useAppState((qn) => !!qn.viewingAgentTaskId);
  let keybindingContext = useKeybindingContext();
  let [inlineGhostText, setInlineGhostText] = y(undefined);
  let isFullscreen = useIsFullscreen();
  let Xo = isSuggestionNavEnabled() && !isFullscreen;
  let syncPromptGhostText = Q(() => {
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
  let $n = Q(() => {
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
  let on = suppressSuggestions ? undefined : mode === "prompt" ? syncPromptGhostText : $n;
  let cursorOffsetRef = R(null);
  if (cursorOffsetRef.current === null) cursorOffsetRef.current = createDialFailureLatch();
  let latestSearchTokenRef = R(null);
  let Dn = R("file");
  let prevInputRef = R("");
  let latestPathTokenRef = R("");
  let latestBashInputRef = R(0);
  let Wn = R("at-path");
  let latestSlackTokenRef = R(null);
  latestSlackTokenRef.current = null;
  let latestBashInputRef_2 = R("");
  let dismissedForInputRef = R("");
  let dr = R(null);
  let or = R(null);
  let pr = R({
    roster: {
      candidates: [],
      inProcess: new Set(),
      defaultNamed: new Set(),
    },
    at: 0,
    loading: false,
  });
  let Qn = R(null);
  let ur = R(null);
  let [Ir, Pr] = y(0);
  let clearSuggestions = ce(() => {
    let qn = pr.current;
    if (qn.loading || Date.now() - qn.at < TEAM_NAME_CACHE_MS) return;
    qn.loading = true;
    resolveTeamName(session, store.getState(), {
      storageV5,
    }).then(
      (roster) => {
        pr.current = {
          roster,
          at: Date.now(),
          loading: false,
        };
        Pr((xs) => xs + 1);
      },
      () => {
        pr.current = {
          ...pr.current,
          at: Date.now(),
          loading: false,
        };
      },
    );
  }, [session, store, storageV5]);
  let fetchFileSuggestions = ce(() => {
    so(normalizeEmptySuggestions);
    setInlineGhostText(undefined);
  }, [so]);
  let fetchFileSuggestions_2 = ce(
    async (searchToken, ps = false) => {
      latestSearchTokenRef.current = searchToken;
      Dn.current = ps ? "at" : "file";
      let xs = isRemoteSessionAvailable();
      let kr = null;
      let ls = ps && !xs ? store.getState().mcp.resourceTemplates : resourceTemplates;
      if (ps && !xs) {
        Yo();
        kr = await mcpTemplateCompletions(
          searchToken,
          ls,
          store.getState().mcp.clients,
          cursorOffsetRef.current,
        );
        if (latestSearchTokenRef.current !== searchToken) return;
      }
      if (!kr)
        kr = await generateUnifiedSuggestions(
          globalFileIndexCache,
          searchToken,
          {
            mcpResources: xs ? {} : resources,
            agents: xs ? [] : agents,
            showOnEmpty: ps,
            mcpResourceTemplates: xs ? {} : ls,
          },
          storageV5,
        );
      if (latestSearchTokenRef.current !== searchToken) return;
      if (kr.length === 0) {
        so(normalizeEmptySuggestions);
        return;
      }
      so((prev) => ({
        commandArgumentHint: undefined,
        suggestions: kr,
        selectedSuggestion: findSelectedSuggestionIndex(prev, kr, "file"),
        suggestionType: kr.length > 0 ? "file" : "none",
      }));
    },
    [resources, resourceTemplates, store, Yo, so, agents, storageV5],
  );
  P(() => {
    let qn = setImmediate((prev) => {
      if (!isRemoteSessionAvailable()) startBackgroundCacheRefresh(globalFileIndexCache, prev);
    }, storageV5);
    let ps = globalFileIndexCache.indexBuildComplete.subscribe(() => {
      let token = latestSearchTokenRef.current;
      if (token === null) return;
      let kr = Dn.current;
      latestSearchTokenRef.current = null;
      fetchFileSuggestions_2(token, kr === "at");
    });
    return () => {
      clearImmediate(qn);
      ps();
    };
  }, [fetchFileSuggestions_2, storageV5]);
  let debouncedFetchFileSuggestions = useDebouncedCallback(fetchFileSuggestions_2, 50);
  let fetchSlackChannels = ce(
    async (partial) => {
      dismissedForInputRef.current = partial;
      let channels = await getSlackChannelSuggestions(session, store.getState().mcp.clients, partial);
      if (dismissedForInputRef.current !== partial) return;
      so((prev) => ({
        commandArgumentHint: undefined,
        suggestions: channels,
        selectedSuggestion: findSelectedSuggestionIndex(prev, channels, "slack-channel"),
        suggestionType: channels.length > 0 ? "slack-channel" : "none",
      }));
    },
    [session, so],
  );
  let debouncedFetchSlackChannels = useDebouncedCallback(fetchSlackChannels, 150);
  let updateSuggestions = ce(() => {
    debouncedFetchFileSuggestions.cancel();
    debouncedFetchSlackChannels.cancel();
    latestSearchTokenRef.current = null;
    latestPathTokenRef.current = "";
    dismissedForInputRef.current = "";
  }, [debouncedFetchFileSuggestions, debouncedFetchSlackChannels]);
  let fr = ce(
    async (query, inputCursorOffset, xs) => {
      if (ur.current !== query) ur.current = null;
      or.current = query;
      latestBashInputRef.current += 1;
      let kr = latestBashInputRef.current;
      let ls = inputCursorOffset ?? draft.cursorOffset;
      if (suppressSuggestions) {
        debouncedFetchFileSuggestions.cancel();
        or.current = null;
        fetchFileSuggestions();
        return;
      }
      if (mode === "prompt") {
        let midInputCommand = findMidInputSlashCommand(query, ls);
        let ds = suggestionType === "mid-command";
        let Hs =
          midInputCommand && (ds || midInputCommand.partialCommand)
            ? getCommandSuggestionsForQuery(session, midInputCommand.partialCommand, commands)
            : [];
        if (Hs.length > 0 && (isFullscreen || ds)) {
          updateSuggestions();
          so((_s) => {
            let fs = _s.suggestionType === "mid-command";
            let id = fs ? _s.suggestions[_s.selectedSuggestion]?.id : undefined;
            let index = Hs.findIndex((La) => La.id === id);
            if (index < 0 && fs && _s.selectedSuggestion >= 0) index = 0;
            return {
              commandArgumentHint: undefined,
              suggestions: Hs,
              selectedSuggestion: index,
              suggestionType: "mid-command",
              maxColumnWidth: allCommandsMaxWidth,
            };
          });
          return;
        }
        if (Hs.length > 0) {
          so(normalizeEmptySuggestions);
          return;
        }
        if (ds) fetchFileSuggestions();
      }
      if (mode === "bash" && query.trim()) {
        let es = query.slice(0, ls).lastIndexOf(" ") + 1;
        let normalized = query.slice(es, ls);
        if (normalized && (looksLikePathToken(normalized) || normalized.includes("/"))) {
          latestPathTokenRef.current = normalized;
          let pathCompletions = await getPathCompletions(session, normalized, {
            maxResults: 10,
            keepDotPrefix: true,
          });
          if (latestPathTokenRef.current !== normalized) return;
          if (pathCompletions.length > 0) {
            setInlineGhostText(undefined);
            so((fs) => ({
              suggestions: pathCompletions,
              selectedSuggestion: getPreservedSelection(
                fs.suggestions,
                fs.selectedSuggestion,
                pathCompletions,
              ),
              commandArgumentHint: undefined,
              suggestionType: "directory",
            }));
            Wn.current = "bash-path";
            return;
          }
        }
        if (suggestionType === "directory" && Wn.current === "bash-path") fetchFileSuggestions();
        latestBashInputRef_2.current = query;
        let historyMatch = await getShellHistoryCompletion(session, query, storageV5);
        if (latestBashInputRef_2.current !== query) return;
        if (historyMatch) {
          setInlineGhostText({
            text: historyMatch.suffix,
            fullCommand: historyMatch.fullCommand,
            insertPosition: query.length,
          });
          so(normalizeEmptySuggestions);
          return;
        } else setInlineGhostText(undefined);
      }
      let atMatch = mode !== "bash" ? query.substring(0, ls).match(AT_MENTION_TOKEN_RE) : null;
      if (atMatch) {
        let es = slugifySessionName(atMatch[2] ?? "");
        let state = store.getState();
        let members = [];
        let seen = new Set();
        if (isAgentSwarmsEnabled() && state.teamContext)
          for (let t of Object.values(state.teamContext.teammates ?? {})) {
            if (t.name === TEAM_LEAD) continue;
            if (!slugifySessionName(t.name).startsWith(es)) continue;
            seen.add(t.name);
            members.push({
              id: `dm-${t.name}`,
              displayText: `@${t.name}`,
              description: "send message",
            });
          }
        for (let [name, agentId] of state.agentNameRegistry) {
          if (seen.has(name)) continue;
          if (!slugifySessionName(name).startsWith(es)) continue;
          let status = state.tasks[agentId]?.status;
          members.push({
            id: `dm-${name}`,
            displayText: `@${name}`,
            description: status ? `send message \xB7 ${status}` : "send message",
          });
        }
        if (isCrossSessionMessagingEnabled() && !isRemoteSessionAvailable()) {
          let fs = Qn.current;
          let ii =
            fs?.value === query && fs.partial === es ? fs.rows : suggestPeerMentions(pr.current.roster, es);
          Qn.current = {
            value: query,
            partial: es,
            rows: ii,
          };
          members.push(...ii);
          if (es !== "") clearSuggestions();
        }
        if (members.length > 0) {
          debouncedFetchFileSuggestions.cancel();
          latestSearchTokenRef.current = null;
          latestPathTokenRef.current = "";
          dismissedForInputRef.current = "";
          debouncedFetchSlackChannels.cancel();
          let fs = ur.current === query;
          so((prev) => ({
            commandArgumentHint: undefined,
            suggestions: members,
            selectedSuggestion: fs
              ? prev.suggestions.length === members.length &&
                prev.suggestions.every((suggestion, La) => suggestion.id === members[La].id)
                ? prev.selectedSuggestion
                : -1
              : getPreservedSelection(prev.suggestions, prev.selectedSuggestion, members),
            suggestionType: "agent",
          }));
          return;
        }
      }
      if (mode === "prompt") {
        let hashMatch = query.substring(0, ls).match(HASH_TOKEN_RE);
        let ds = hashMatch ? extractCommandNameAndArgs(query) : null;
        let Hs = ds !== null && findCommand(ds.commandName, commands)?.completesHashChannels === true;
        if (hashMatch && !Hs && hasSlackClient(store.getState().mcp.clients)) {
          debouncedFetchSlackChannels(hashMatch[2]);
          return;
        } else if (suggestionType === "slack-channel") {
          debouncedFetchSlackChannels.cancel();
          fetchFileSuggestions();
        }
      }
      if (mode === "prompt") {
        if (Wo) {
          let es = query.substring(0, ls);
          let ds = isPrefixInsertion(query, xs, ls) ? es.match(CLOSED_COLON_TOKEN_RE) : null;
          if (ds) {
            let emoji = lookupEmoji(ds[2]);
            if (emoji) {
              let fs = (ds.index ?? 0) + (ds[1]?.length ?? 0);
              let ii = query.slice(0, fs) + emoji + query.slice(ls);
              setValue(ii);
              setCursorOffset(fs + emoji.length);
              fetchFileSuggestions();
              logFeatureOk("input_emoji_completion", {
                inline: true,
              });
              return;
            }
          }
          let hasAtSymbol = es.match(COLON_TOKEN_RE);
          if (hasAtSymbol) {
            let emojiSuggestions = getEmojiSuggestions(hasAtSymbol[2]);
            if (emojiSuggestions.length > 0) {
              so((fs) => ({
                commandArgumentHint: undefined,
                suggestions: emojiSuggestions,
                selectedSuggestion: getPreservedSelection(
                  fs.suggestions,
                  fs.selectedSuggestion,
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
      let match = query.substring(0, ls).match(regExp_3);
      let isAtEndWithWhitespace = ls === query.length && ls > 0 && query.length > 0 && query[ls - 1] === " ";
      if (mode === "prompt" && isCommandInput(query) && ls > 0) {
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
            so((prev) => ({
              suggestions: dirSuggestions,
              selectedSuggestion: getPreservedSelection(
                prev.suggestions,
                prev.selectedSuggestion,
                dirSuggestions,
              ),
              commandArgumentHint: undefined,
              suggestionType: "directory",
            }));
            Wn.current = "command-arg";
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
          if (or.current !== query || dr.current === query) return;
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
            so((prev) => ({
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
            let Hs = commandArgSuggestions(query, command.getArgumentCompletions, storageV5);
            let winner = await Promise.race([Hs, new Promise((resolve) => setImmediate(resolve))]);
            if (
              winner === undefined &&
              own.getState().suggestions.some((suggestion) => !suggestion.id.startsWith(COMMAND_ARG))
            )
              fetchFileSuggestions();
            let fs = winner ?? (await Hs);
            if (or.current !== query || dr.current === query) return;
            if (fs.length > 0) {
              so((ii) => ({
                suggestions: fs,
                selectedSuggestion: getPreservedSelection(ii.suggestions, ii.selectedSuggestion, fs),
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
        ls > 0 &&
        !hasCommandWithArguments(isAtEndWithWhitespace, query)
      ) {
        let commandArgumentHint = undefined;
        if (query.length > 1) {
          let spaceIndex = query.indexOf(" ");
          let ii = spaceIndex === -1 ? query.slice(1) : query.slice(1, spaceIndex);
          let hasRealArguments = spaceIndex !== -1 && query.slice(spaceIndex + 1).trim().length > 0;
          let hasExactlyOneTrailingSpace = spaceIndex !== -1 && query.length === spaceIndex + 1;
          if (spaceIndex !== -1) {
            let exactMatch = findCommand(ii, commands);
            if (exactMatch || hasRealArguments) {
              if (exactMatch?.argumentHint && hasExactlyOneTrailingSpace)
                commandArgumentHint = exactMatch.argumentHint;
              else if (exactMatch?.type === "prompt" && exactMatch.argNames?.length && query.endsWith(" ")) {
                let argsText = query.slice(spaceIndex + 1);
                let typedArgs = parseArgumentNames(argsText);
                commandArgumentHint = formatExtraArgHints(exactMatch.argNames, typedArgs);
              }
              so(() => ({
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
        let Hs = firstLineOf(query.slice(1), " ");
        let _s =
          commandMatchesTypeaheadQuery(query, suggestions) && !isPluginHiddenCommand(query, commands)
            ? 0
            : -1;
        so((fs) => {
          let selectedSuggestion = _s;
          if (query === xs && fs.selectedSuggestion >= 0) {
            let id = fs.suggestions[fs.selectedSuggestion]?.id;
            let index = suggestions.findIndex((Xa) => Xa.id === id);
            selectedSuggestion = index >= 0 ? index : _s;
          }
          return {
            commandArgumentHint,
            suggestions,
            selectedSuggestion,
            suggestionType: "command",
            suggestionsEmptyMessage:
              suggestions.length === 0 && query.length > 1 && isValidCommandToken(Hs)
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
        so((prev) =>
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
        if (!query.substring(0, ls).match(AT_MENTION_TOKEN_RE)) fetchFileSuggestions();
      }
      if (match && mode !== "bash") {
        let completionToken = extractCompletionToken(query, ls, true);
        if (completionToken && completionToken.token.startsWith("@")) {
          let searchToken = extractSearchToken(completionToken);
          if (looksLikePathToken(searchToken)) {
            latestPathTokenRef.current = searchToken;
            let pathSuggestions = await getPathCompletions(session, searchToken, {
              maxResults: 10,
            });
            if (latestBashInputRef.current !== kr) return;
            if (latestPathTokenRef.current !== searchToken) return;
            if (pathSuggestions.length > 0) {
              so((prev) => ({
                suggestions: pathSuggestions,
                selectedSuggestion: getPreservedSelection(
                  prev.suggestions,
                  prev.selectedSuggestion,
                  pathSuggestions,
                ),
                commandArgumentHint: undefined,
                suggestionType: "directory",
              }));
              Wn.current = "at-path";
              return;
            }
          }
          if (latestSearchTokenRef.current === searchToken) return;
          debouncedFetchFileSuggestions(searchToken, true);
          return;
        }
      }
      if (suggestionType === "file") {
        let completionToken = extractCompletionToken(query, ls, true);
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
      so,
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
      Wo,
      session,
      storageV5,
      clearSuggestions,
    ],
  );
  P(() => {
    if (dr.current === value) return;
    let qn = prevInputRef.current;
    if (qn !== value) {
      prevInputRef.current = value;
      latestSearchTokenRef.current = null;
    }
    dr.current = null;
    fr(value, undefined, qn);
  }, [value, fr]);
  let $r = Oo(() => {
    if (
      dr.current !== value &&
      own.getState().suggestions.length === 0 &&
      AT_MENTION_TOKEN_RE.test(value.substring(0, draft.cursorOffset))
    ) {
      Qn.current = null;
      ur.current = value;
      fr(value);
    }
  });
  P(() => {
    if (Ir === 0) return;
    $r();
  }, [Ir]);
  let handleTab = ce(async () => {
    if (mode === "bash" && on) {
      setValue(on.fullCommand);
      setCursorOffset(on.fullCommand.length);
      setInlineGhostText(undefined);
      return;
    }
    if (At.tab()) return;
    let { value: qn, cursorOffset: cursorOffset_2 } = draft;
    let xs =
      mode === "prompt" && !suppressSuggestions && suggestions.length === 0
        ? findMidInputSlashCommand(qn, cursorOffset_2)
        : null;
    if (xs) {
      let commandSuggestionsForQuery = getCommandSuggestionsForQuery(session, xs.partialCommand, commands);
      let ls =
        commandSuggestionsForQuery.length === 1 && commandSuggestionsForQuery[0]
          ? applyMidInputCommandSuggestion(commandSuggestionsForQuery[0], qn, cursorOffset_2)
          : null;
      if (ls) {
        setValue(ls.value);
        setCursorOffset(ls.cursorOffset);
        return;
      }
      if (commandSuggestionsForQuery.length > 1) {
        updateSuggestions();
        so(() => ({
          commandArgumentHint: undefined,
          suggestions: commandSuggestionsForQuery,
          selectedSuggestion: 0,
          suggestionType: "mid-command",
          maxColumnWidth: allCommandsMaxWidth,
        }));
        return;
      }
    }
    if (!on && At.tabTop()) return;
    if (suggestions.length > 0) {
      debouncedFetchFileSuggestions.cancel();
      debouncedFetchSlackChannels.cancel();
      let kr = hoveredSuggestionIdRef.current
        ? suggestions.findIndex((suggestion) => suggestion.id === hoveredSuggestionIdRef.current)
        : -1;
      let selectedSuggestion = own.getState().selectedSuggestion;
      if (
        kr < 0 &&
        selectedSuggestion === -1 &&
        ur.current === value &&
        suggestions.some((suggestion) => suggestion.id.startsWith("dm-peer-"))
      )
        return;
      let index = kr >= 0 ? kr : selectedSuggestion === -1 ? 0 : selectedSuggestion;
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
          if (newInput?.reSuggest) fr(newInput.newInput, newInput.newInput.length);
          else fetchFileSuggestions();
        }
      } else if (suggestionType === "mid-command") {
        let gs =
          suggestion &&
          getMidInputCommandCompletion({
            session,
            commands,
            row: suggestion,
            input: qn,
            cursorOffset: cursorOffset_2,
          });
        if (gs) {
          setValue(gs.value);
          setCursorOffset(gs.cursorOffset);
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
          if (Wn.current === "bash-path") {
            let ds = value.slice(0, cursorOffset).lastIndexOf(" ") + 1;
            let Hs = isPathMetadata(suggestion.metadata) && suggestion.metadata.type === "directory";
            let _s = suggestion.displayText + (Hs ? "" : " ");
            newInput = value.slice(0, ds) + _s + value.slice(cursorOffset);
            let fs = ds + _s.length;
            setValue(newInput);
            setCursorOffset(fs);
            if (Hs) fr(newInput, fs);
            else fetchFileSuggestions();
          } else if (Wn.current === "command-arg") {
            let spaceIndex = value.indexOf(" ");
            let commandPart = value.slice(0, spaceIndex + 1);
            let cmdSuffix =
              isPathMetadata(suggestion.metadata) && suggestion.metadata.type === "directory" ? "/" : " ";
            newInput = commandPart + suggestion.id + cmdSuffix;
            setValue(newInput);
            setCursorOffset(newInput.length);
            if (isPathMetadata(suggestion.metadata) && suggestion.metadata.type === "directory") {
              so((prev) => ({
                ...prev,
                commandArgumentHint: undefined,
              }));
              fr(newInput, newInput.length);
            } else fetchFileSuggestions();
          } else {
            let Hs =
              extractCompletionToken(value, cursorOffset, true) ??
              extractCompletionToken(value, cursorOffset, false);
            if (Hs) {
              let isDir = isPathMetadata(suggestion.metadata) && suggestion.metadata.type === "directory";
              let result = applyDirectorySuggestion(
                value,
                suggestion.id,
                Hs.startPos,
                Hs.token.length,
                isDir,
              );
              newInput = result.newInput;
              setValue(newInput);
              setCursorOffset(result.cursorPos);
              if (isDir) {
                so((prev) => ({
                  ...prev,
                  commandArgumentHint: undefined,
                }));
                fr(newInput, result.cursorPos);
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
      } else if (Wo && suggestionType === "emoji" && suggestions.length > 0) {
        let gs = suggestions[index];
        if (gs) {
          let es = isCursorInTriggerToken(gs, value, cursorOffset, COLON_TOKEN_RE, setValue, setCursorOffset);
          fetchFileSuggestions();
          if (es)
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
          fr(value.replace(completionToken.token, replacementValue), cursorOffset);
        } else if (index < suggestions.length) {
          let suggestion = suggestions[index];
          if (suggestion) {
            let completionResult = parseCompletionResult(suggestion.metadata);
            let ua = completionResult
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
              suggestion: ua,
              input: value,
              partialPath: completionToken.token,
              startPos: completionToken.startPos,
              onInputChange: setValue,
              setCursorOffset,
            });
            if (completionResult?.partial) fr(replacementValue, completionToken.startPos + ua.length);
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
          let es = isRemoteSessionAvailable();
          latestSearchTokenRef.current = mcpResources;
          Dn.current = isAtSymbol ? "at" : "file";
          let ds = isAtSymbol && !es ? store.getState().mcp.resourceTemplates : resourceTemplates;
          let Hs = null;
          if (isAtSymbol && !es) {
            Yo();
            Hs = await mcpTemplateCompletions(
              mcpResources,
              ds,
              store.getState().mcp.clients,
              cursorOffsetRef.current,
            );
            if (latestSearchTokenRef.current !== mcpResources) return;
          }
          suggestionItems =
            Hs ??
            (await generateUnifiedSuggestions(
              globalFileIndexCache,
              mcpResources,
              {
                mcpResources: es ? {} : resources,
                agents: es ? [] : agents,
                showOnEmpty: isAtSymbol,
                mcpResourceTemplates: es ? {} : ds,
              },
              storageV5,
            ));
          if (latestSearchTokenRef.current !== mcpResources) return;
        } else suggestionItems = [];
      }
      if (suggestionItems.length > 0)
        so((prev) => ({
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
    fr,
    resources,
    resourceTemplates,
    store,
    Yo,
    so,
    agents,
    debouncedFetchFileSuggestions,
    debouncedFetchSlackChannels,
    on,
    session,
    sessionEnvVars,
    draft,
    own,
    Wo,
    storageV5,
    allCommandsMaxWidth,
    suppressSuggestions,
    updateSuggestions,
    At,
  ]);
  let handleEnter = ce(
    (qn, ps, cursorOffset) => {
      let { suggestions, selectedSuggestion, suggestionType, arrowedSuggestionId } = own.getState();
      let arrowedSuggestionId_2 = getArrowedSuggestionId({
        suggestions,
        selectedSuggestion,
        arrowedSuggestionId,
      });
      let es =
        qn === undefined &&
        Xo &&
        (suggestionType === "command" || suggestionType === "custom-title") &&
        arrowedSuggestionId_2 === null &&
        !(suggestionType === "command" && isUniqueCommandMatch(ps, suggestions, selectedSuggestion));
      let query = draft.value;
      if (qn === undefined && suggestionType === "command" && query !== ps) {
        debouncedFetchFileSuggestions.cancel();
        fetchFileSuggestions();
        if (mode === "prompt" && isCommandInput(query) && query.slice(1).trim() !== "") {
          let suggestions = generateCommandSuggestions(session, query, commands);
          let ua = suggestions[0];
          if (
            ua &&
            commandMatchesTypeaheadQuery(query, suggestions) &&
            !isPluginHiddenCommand(query, commands) &&
            (!Xo || ua.id === arrowedSuggestionId_2 || isUniqueCommandMatch(query, suggestions, 0))
          ) {
            let newInput = applyCommandSuggestion({
              suggestion: ua,
              shouldExecute: true,
              commands,
              onInputChange: setValue,
              setCursorOffset,
              onSubmit,
            });
            if (newInput?.submitted) latestSlackTokenRef.current = draft.value;
            if (newInput?.reSuggest) fr(newInput.newInput, newInput.newInput.length);
            return;
          }
        }
        onSubmit(query, true);
        latestSlackTokenRef.current = draft.value;
        return;
      }
      let Hs = hoveredSuggestionIdRef.current
        ? suggestions.findIndex((suggestion) => suggestion.id === hoveredSuggestionIdRef.current)
        : -1;
      let selectedSuggestion_2 = es ? -1 : (qn ?? (Hs >= 0 ? Hs : selectedSuggestion));
      if (selectedSuggestion_2 < 0 || suggestions.length === 0) {
        if (
          suggestions.length > 0 &&
          ur.current === ps &&
          suggestions.some((suggestion) => suggestion.id.startsWith("dm-peer-"))
        ) {
          dr.current = ps;
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
          onSubmit(query, true);
          latestSlackTokenRef.current = draft.value;
        }
        return;
      }
      let suggestion = suggestions[selectedSuggestion_2];
      if (suggestionType === "command" && selectedSuggestion_2 < suggestions.length) {
        if (suggestion) {
          if (
            qn === undefined &&
            arrowedSuggestionId_2 === null &&
            suggestion.id.startsWith(COMMAND_ARG) &&
            /^\/\S+\s+$/.test(ps) &&
            findCommand(ps.trim().slice(1), commands)?.enterTakesArgumentCompletion !== true
          ) {
            debouncedFetchFileSuggestions.cancel();
            fetchFileSuggestions();
            onSubmit(ps, true);
            latestSlackTokenRef.current = draft.value;
            return;
          }
          let ii = applyCommandSuggestion({
            suggestion,
            shouldExecute: qn === undefined,
            commands,
            onInputChange: setValue,
            setCursorOffset,
            onSubmit,
          });
          if (ii?.submitted) latestSlackTokenRef.current = draft.value;
          debouncedFetchFileSuggestions.cancel();
          if (ii?.reSuggest) fr(ii.newInput, ii.newInput.length);
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
            ps,
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
        isCursorInTriggerToken(suggestion, ps, cursorOffset, AT_MENTION_TOKEN_RE, setValue, setCursorOffset);
        debouncedFetchFileSuggestions.cancel();
        fetchFileSuggestions();
      } else if (suggestionType === "slack-channel" && selectedSuggestion_2 < suggestions.length) {
        if (suggestion) {
          isCursorInTriggerToken(suggestion, ps, cursorOffset, HASH_TOKEN_RE, setValue, setCursorOffset);
          debouncedFetchSlackChannels.cancel();
          fetchFileSuggestions();
        }
      } else if (suggestionType === "mid-command") {
        let ii =
          suggestion &&
          getMidInputCommandCompletion({
            session,
            commands,
            row: suggestion,
            input: query,
            cursorOffset: draft.cursorOffset,
          });
        fetchFileSuggestions();
        if (ii) {
          setValue(ii.value);
          setCursorOffset(ii.cursorOffset);
        } else if (qn === undefined) {
          onSubmit(query, true);
          latestSlackTokenRef.current = draft.value;
        }
      } else if (Wo && suggestionType === "emoji" && selectedSuggestion_2 < suggestions.length) {
        if (suggestion) {
          let ii = isCursorInTriggerToken(
            suggestion,
            ps,
            cursorOffset,
            COLON_TOKEN_RE,
            setValue,
            setCursorOffset,
          );
          fetchFileSuggestions();
          if (ii)
            logFeatureOk("input_emoji_completion", {
              inline: false,
            });
        }
      } else if (suggestionType === "file" && selectedSuggestion_2 < suggestions.length) {
        let completionInfo = extractCompletionToken(ps, cursorOffset, true);
        if (completionInfo) {
          if (suggestion) {
            let completionResult = parseCompletionResult(suggestion.metadata);
            let hasAtPrefix = completionInfo.token.startsWith("@");
            let Xa = completionResult
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
              suggestion: Xa,
              input: ps,
              partialPath: completionInfo.token,
              startPos: completionInfo.startPos,
              onInputChange: setValue,
              setCursorOffset,
            });
            debouncedFetchFileSuggestions.cancel();
            if (completionResult?.partial) fr(replacementValue, completionInfo.startPos + Xa.length);
            else fetchFileSuggestions();
          }
        }
      } else if (suggestionType === "directory" && selectedSuggestion_2 < suggestions.length) {
        if (suggestion) {
          if (Wn.current === "bash-path") {
            debouncedFetchFileSuggestions.cancel();
            if (qn === undefined && arrowedSuggestionId_2 === null) {
              fetchFileSuggestions();
              if (latestSlackTokenRef.current === null) {
                onSubmit(draft.value, true);
                latestSlackTokenRef.current = draft.value;
              }
              return;
            }
            let La = ps.slice(0, cursorOffset).lastIndexOf(" ") + 1;
            let Xa = isPathMetadata(suggestion.metadata) && suggestion.metadata.type === "directory";
            let dl = suggestion.displayText + (Xa ? "" : " ");
            let Vl = ps.slice(0, La) + dl + ps.slice(cursorOffset);
            setValue(Vl);
            setCursorOffset(La + dl.length);
            fetchFileSuggestions();
            return;
          }
          if (Wn.current === "command-arg") {
            debouncedFetchFileSuggestions.cancel();
            if (qn !== undefined || arrowedSuggestionId_2 !== null) {
              let index = ps.indexOf(" ");
              let sliced = ps.slice(0, index + 1);
              let dl = isPathMetadata(suggestion.metadata) && suggestion.metadata.type === "directory";
              let Vl = sliced + suggestion.id + (dl ? "/" : " ");
              setValue(Vl);
              setCursorOffset(Vl.length);
              if (dl) fr(Vl, Vl.length);
              else fetchFileSuggestions();
              return;
            }
            fetchFileSuggestions();
            onSubmit(ps, true);
            latestSlackTokenRef.current = draft.value;
            return;
          }
          let completionToken =
            extractCompletionToken(ps, cursorOffset, true) ?? extractCompletionToken(ps, cursorOffset, false);
          if (completionToken) {
            let isDir = isPathMetadata(suggestion.metadata) && suggestion.metadata.type === "directory";
            let result = applyDirectorySuggestion(
              ps,
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
      Xo,
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
      fr,
      Wo,
    ],
  );
  let handleAutocompleteAccept = ce(() => {
    handleTab();
  }, [handleTab]);
  let handleAutocompleteDismiss = ce(() => {
    debouncedFetchFileSuggestions.cancel();
    debouncedFetchSlackChannels.cancel();
    At.drop();
    fetchFileSuggestions();
    dr.current = value;
    latestBashInputRef.current += 1;
  }, [debouncedFetchFileSuggestions, debouncedFetchSlackChannels, fetchFileSuggestions, value, At]);
  let handleAutocompletePrevious = ce(() => {
    let state = suggestionsStore.getState();
    let ps = own.getState().suggestions.length;
    if (
      !Xo ||
      !state.suggestions[state.selectedSuggestion] ||
      state.selectedSuggestion >= ps ||
      getArrowedSuggestionId(state) !== null
    )
      return false;
    so(withArrowedSuggestionId);
    logSuggestionNavUsed(host, id, own.getState());
    return true;
  }, [Xo, own, suggestionsStore, so, host, id]);
  let Ls = ce(() => {
    if (handleAutocompletePrevious()) return;
    if (At.move(-1, Xo)) {
      logSuggestionNavUsed(host, id, suggestionsStore.getState());
      return;
    }
    so((prev) => {
      let ps = {
        ...prev,
        hoveredSuggestionId: null,
        selectedSuggestion:
          prev.selectedSuggestion <= 0 ? prev.suggestions.length - 1 : prev.selectedSuggestion - 1,
      };
      return Xo ? withArrowedSuggestionId(ps) : ps;
    });
    logSuggestionNavUsed(host, id, own.getState());
  }, [so, handleAutocompletePrevious, Xo, host, id, own, suggestionsStore, At]);
  let handleAutocompleteNext = ce(() => {
    if (handleAutocompletePrevious()) return;
    if (At.move(1, Xo)) {
      logSuggestionNavUsed(host, id, suggestionsStore.getState());
      return;
    }
    so((prev) => {
      let ps = {
        ...prev,
        hoveredSuggestionId: null,
        selectedSuggestion:
          prev.selectedSuggestion >= prev.suggestions.length - 1 ? 0 : prev.selectedSuggestion + 1,
      };
      return Xo ? withArrowedSuggestionId(ps) : ps;
    });
    logSuggestionNavUsed(host, id, own.getState());
  }, [so, handleAutocompletePrevious, Xo, host, id, own, suggestionsStore, At]);
  P(() => {
    if (!Xo) return;
    let { value: qn, cursorOffset } = draft;
    return draft.subscribe(() => {
      if (draft.value === qn && draft.cursorOffset === cursorOffset) return;
      qn = draft.value;
      cursorOffset = draft.cursorOffset;
      so((xs) =>
        xs.arrowedSuggestionId
          ? {
              ...xs,
              arrowedSuggestionId: null,
            }
          : xs,
      );
    });
  }, [draft, so, Xo]);
  let autocompleteHandlers = ce(
    (qn) => {
      so((ps) =>
        ps.hoveredSuggestionId === qn
          ? ps
          : {
              ...ps,
              hoveredSuggestionId: qn,
            },
      );
    },
    [so],
  );
  let selectSuggestion = ce(
    (qn, ps) => {
      if (At.click(ps)) return;
      let index = own.getState().suggestions.findIndex((suggestion) => suggestion.id === ps);
      if (index < 0) return;
      handleEnter(index, draft.value, draft.cursorOffset);
    },
    [handleEnter, draft, own, At],
  );
  let oi = Q(
    () => ({
      "autocomplete:accept": handleAutocompleteAccept,
      "autocomplete:dismiss": handleAutocompleteDismiss,
      "autocomplete:previous": Ls,
      "autocomplete:next": handleAutocompleteNext,
    }),
    [handleAutocompleteAccept, handleAutocompleteDismiss, Ls, handleAutocompleteNext],
  );
  let isAutocompleteActive = storeSelector.suggestions.length > 0 || !!on;
  let isModalOverlayActive = useThirdOverlayKeys();
  useRegisterOverlay("autocomplete", isAutocompleteActive);
  useRegisterKeybindingContext("Autocomplete", isAutocompleteActive);
  MessageActionsKeybindings(oi, {
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
      if (suggestionsStore.getState().suggestions.length > 0 || on) return;
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
      Ls();
      return;
    }
    if (e.name === "return" && !e.shift && !e.meta) {
      let xs = At.enter();
      if (xs === "left") return;
      if (xs === "taken") {
        e.preventDefault();
        return;
      }
      if (own.getState().suggestionType === "directory" && Wn.current === "bash-path") {
        let kr = draft.value;
        let ls = cursorOffset + (kr.length - value.length);
        if (kr[ls - 1] === "\\" || needsShiftWorkaround()) return;
      }
      e.preventDefault();
      handleEnter(undefined, value, cursorOffset);
    }
  };
  return {
    suggestions: storeSelector.suggestions,
    selectedSuggestion: storeSelector.selectedSuggestion,
    suggestionType,
    maxColumnWidth,
    commandArgumentHint,
    suggestionsEmptyMessage,
    inlineGhostText: on,
    handleKeyDown,
    selectSuggestion,
    setHoveredSuggestion: autocompleteHandlers,
    hoveredSuggestionId: hoveredSuggestionId ?? null,
    cursorRowId: getArrowedSuggestionId(storeSelector),
  };
}
export { createEmptyAutocompleteStore, useTypeahead };
