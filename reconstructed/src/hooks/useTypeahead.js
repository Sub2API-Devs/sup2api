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
import { B2 } from "../utils/permissions/permissionRulePayload.js";
import { stripSuffix, firstLineOf } from "../utils/stringUtils.js";
import { gq } from "../utils/attachments/atMentions.js";
import { getArrowedSuggestionId } from "../components/PromptInput/PromptInputFooterSuggestions.js";
import { loggedSessionState } from "./useWorkspaceDiff.js";
import { logEvent } from "../services/analytics/index.js";
import { createAutocompleteStore, takeAutocompleteRow } from "../components/PromptInput/autocompleteStore.js";
import { createStore } from "../state/store.js";
import { wt } from "../remote/remoteMode.js";
import { getShellCompletions } from "../utils/bash/shellCompletion.js";
import { useStoreSelector } from "./useStoreSelector.js";
import { selectDraftValue, selectCursorOffset, selectInputMode } from "../screens/repl/PromptDraft.js";
import { ce, R, Q, y, P, Oo } from "../../vendor/react/cjs/react.production.js";
import { useNotifications } from "../context/notifications.js";
import { useShortcutDisplay as useShortcutDisplay_2 } from "../keybindings/useShortcutDisplay.js";
import { useAppState, Cr, useSetAppState } from "../state/AppState.js";
import { qd } from "./useSettings.js";
import { useSession, useHost } from "../context/session.js";
import { Me } from "../components/design-system/ThemeProvider.js";
import { useKeybindingContext, useRegisterKeybindingContext } from "../keybindings/KeybindingContext.js";
import { useIsFullscreen } from "../ink/renderModeContext.js";
import { whr } from "../utils/accessibility/screenReader.js";
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
import { sKe, getEmojiSuggestions } from "./_new/EMOJI_BY_SHORTCODE.js";
import { logFeatureOk } from "../services/analytics/featureTelemetry.js";
import { o2, commandArgSuggestions, COMMAND_ARG } from "../utils/suggestions/commandArgSuggestions.js";
import { searchSessionsByCustomTitle, getSessionIdFromLog } from "../utils/sessionStorage.js";
import { formatLogMetadata } from "../utils/format.js";
import { parseArgumentNames } from "../utils/argumentSubstitution.js";
import { formatExtraArgHints } from "../skills/loadSkillsDir.js";
import { parseCompletionResult } from "../utils/suggestions/uriTemplate.js";
import { UV, useRegisterOverlay } from "../context/overlayContext.js";
import { MessageActionsKeybindings } from "../components/messageActions.js";
import {
  getModeFromInput as getModeFromInput_2,
  stripModePrefix,
} from "../components/PromptInput/inputModes.js";
import { nGe } from "../services/PromptSuggestion/promptSuggestion.js";
import { logError } from "../utils/log.js";
import { Vnn } from "./useTextInput.js";

/**
 * （旧版名 toolMatchesName 是错配）typeahead 里判断 "/xxx" 输入是否匹配候选命令：按命令元数据的 name、命令名和别名做模糊匹配，非命令候选直接通过。
 */
//@ chunk-18hwfzwa.js:558864-559060 placement = toolMatchesName (0.66)
function commandMatchesTypeaheadQuery(query, suggestions) {
  let D = suggestions[0];
  if (!D) return !1;
  if (!isCommandMetadata(D.metadata)) return !0;
  let trimmed = query.slice(1).toLowerCase().trim();
  if (trimmed === "") return !0;
  let metadata = D.metadata;
  return matchesCommandWords(trimmed, [metadata.name, getCommandName(metadata), ...(metadata.aliases ?? [])]);
}
//@ chunk-18hwfzwa.js:559060-559299 sole-consumer
function isPluginHiddenCommand(h, x) {
  let trimEnd = h.trimEnd(),
    L = /^\/\S+$/.test(trimEnd) ? trimEnd.slice(1).toLowerCase() : "";
  return (
    L !== "" &&
    B2() &&
    x.some(
      (ee) =>
        ee.type === "prompt" &&
        ee.hiddenBehindPlugin !== void 0 &&
        [ee.name, getCommandName(ee), ...(ee.aliases ?? [])].some((ke) => ke.toLowerCase() === L),
    )
  );
}
//@ chunk-18hwfzwa.js:559299-559458 sole-consumer
function isUniqueCommandMatch(h, x, D) {
  if (!/^\/\S+$/.test(h)) return !1;
  let lower = h.slice(1).toLowerCase();
  return (
    getSuggestionMatchKeys(x[D]).includes(lower) &&
    x.every((ee, ke) => ke === D || !getSuggestionMatchKeys(ee).includes(lower))
  );
}
//@ chunk-18hwfzwa.js:559458-559688 sole-consumer
function getSuggestionMatchKeys(h) {
  if (!h || !isCommandMetadata(h.metadata)) return [];
  let metadata = h.metadata,
    D = metadata.isMcp ? stripSuffix(getCommandName(metadata), " (MCP)") : getCommandName(metadata);
  return [
    metadata.name,
    D,
    ...(metadata.aliases ?? []),
    metadata.name.slice(metadata.name.lastIndexOf(":") + 1),
    D.slice(D.lastIndexOf(":") + 1),
  ].map((L) => L.toLowerCase());
}
//@ chunk-18hwfzwa.js:615267-615680 sole-consumer
var AT_TOKEN_RE = /^@[\p{L}\p{N}\p{M}_\-./\\()[\]~:]*/u,
  pKe = /^[\p{L}\p{N}\p{M}_\-./\\()[\]~:]+/u,
  HQt = /(@[\p{L}\p{N}\p{M}_\-./\\()[\]~:]*|[\p{L}\p{N}\p{M}_\-./\\()[\]~:]+)$/u,
  UQt = /[\p{L}\p{N}\p{M}_\-./\\()[\]~:]+$/u,
  regExp_2 = new RegExp(gq, "u"),
  regExp_3 = new RegExp(String.raw`(^|${gq})@([\p{L}\p{N}\p{M}_\-./\\()[\]~:]*|"[^"]*"?)$`, "u"),
  yue = /(^|\s)#([a-z0-9][a-z0-9_-]*)$/,
  Sue = /(^|\s):([a-z0-9_+-]{2,})$/,
  qQt = /(^|\s):([a-z0-9_+-]+):$/;
//@ chunk-18hwfzwa.js:615680-615841 affinity
function isPrefixInsertion(h, x, D) {
  if (x === void 0) return !1;
  let L = h.length - x.length,
    ee = D - L;
  return L > 0 && ee >= 0 && h.slice(0, ee) + h.slice(D) === x && /^[a-z0-9_+-]*:$/.test(h.slice(ee, D));
}
/**
 * 是否为 {type: "file"|"directory"} 路径元数据对象。
 */
//@ chunk-18hwfzwa.js:615841-615946 fingerprint = isPathMetadata (1)
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
function findSelectedSuggestionIndex(h, x, D) {
  if (h.suggestionType !== D || h.selectedSuggestion < 0) return -1;
  let L = h.suggestions[h.selectedSuggestion]?.id;
  return L === void 0 ? -1 : x.findIndex((ee) => ee.id === L);
}
//@ chunk-18hwfzwa.js:616367-616462 layout
function kue(h) {
  return { ...h, arrowedSuggestionId: h.suggestions[h.selectedSuggestion]?.id ?? null };
}
//@ chunk-18hwfzwa.js:616462-616638 layout
function preserveArrowedSuggestion(h, x) {
  let arrowedSuggestionId = h.arrowedSuggestionId;
  return arrowedSuggestionId != null &&
    x !== h &&
    x.arrowedSuggestionId === void 0 &&
    x.suggestions[x.selectedSuggestion]?.id === arrowedSuggestionId
    ? { ...x, arrowedSuggestionId: arrowedSuggestionId }
    : x;
}
//@ chunk-18hwfzwa.js:616638-616797 layout
function logSuggestionNavUsed(h, x, D) {
  if (getArrowedSuggestionId(D) === null) return;
  let of = loggedSessionState.of(h);
  if (of.lastLoggedSessionId === x) return;
  ((of.lastLoggedSessionId = x), logEvent("tengu_ax_sr_suggestion_nav_used", {}));
}
//@ chunk-18hwfzwa.js:616797-616832 layout
function Tue() {
  return createAutocompleteStore(createStore(bKe));
}
//@ chunk-18hwfzwa.js:616832-616928 layout
var bKe = { suggestions: [], selectedSuggestion: -1, suggestionType: "none", commandArgumentHint: void 0 };
//@ chunk-18hwfzwa.js:616928-617178 layout
function normalizeEmptySuggestions(h) {
  return h.suggestions.length === 0 &&
    h.selectedSuggestion === -1 &&
    h.suggestionType === "none" &&
    h.commandArgumentHint === void 0 &&
    h.suggestionsEmptyMessage === void 0 &&
    h.maxColumnWidth === void 0 &&
    !h.hoveredSuggestionId &&
    !h.arrowedSuggestionId
    ? h
    : bKe;
}
//@ chunk-18hwfzwa.js:617178-617320 fingerprint = extractSearchToken (1)
function extractSearchToken(completionToken) {
  if (completionToken.isQuoted) return stripSuffix(completionToken.token.slice(2), '"');
  else if (completionToken.token.startsWith("@")) return completionToken.token.substring(1);
  else return completionToken.token;
}
//@ chunk-18hwfzwa.js:617320-617556 fingerprint = formatReplacementValue (1)
function formatReplacementValue(options) {
  let {
      displayText: displayText,
      mode: mode,
      hasAtPrefix: hasAtPrefix,
      needsQuotes: needsQuotes,
      isQuoted: isQuoted,
      isComplete: isComplete,
    } = options,
    space = isComplete ? " " : "";
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
  let He = input.slice(0, cursorOffset).lastIndexOf(" ") + 1,
    replacementText;
  if (completionType === "variable") replacementText = "$" + suggestion.displayText + " ";
  else if (completionType === "command") replacementText = suggestion.displayText + " ";
  else replacementText = suggestion.displayText;
  let ze = input.slice(0, He) + replacementText + input.slice(cursorOffset);
  (onInputChange(ze), setCursorOffset(He + replacementText.length));
}
//@ chunk-18hwfzwa.js:617794-617884 layout
var AT_MENTION_TOKEN_RE = new RegExp(String.raw`(^|${gq})@([\p{L}\p{N}\p{M}\u200C\u200D_-]*)$`, "u"),
  KQt = 5000;
//@ chunk-18hwfzwa.js:617884-618116 placement = _temp (1)
function isCursorInTriggerToken(h, x, D, L, ee, ke) {
  let match = x.slice(0, D).match(L);
  if (!match || match.index === void 0) return !1;
  let Be = match.index + (match[1]?.length ?? 0),
    sliced = x.slice(0, Be),
    We = sliced + h.displayText + " " + x.slice(D);
  return (ee(We), ke(sliced.length + h.displayText.length + 1), !0);
}
/**
 * bash 模式补全：调用 shell completion，失败记 tengu_shell_completion_failed。
 */
//@ chunk-18hwfzwa.js:618116-618319 fingerprint = generateBashSuggestions (1)
async function generateBashSuggestions(h, x, D, L, ee) {
  if (wt()) return [];
  try {
    h.current?.abort();
    let abortController = new AbortController();
    return ((h.current = abortController), await getShellCompletions(x, D, L, abortController.signal, ee));
  } catch {
    return (logEvent("tengu_shell_completion_failed", {}), []);
  }
}
//@ chunk-18hwfzwa.js:618319-618462 fingerprint = applyDirectorySuggestion (1)
function applyDirectorySuggestion(input, suggestionId, tokenStartPos, tokenLength, isDirectory) {
  let suffix = isDirectory ? "/" : " ",
    before = input.slice(0, tokenStartPos),
    after = input.slice(tokenStartPos + tokenLength),
    He = "@" + suggestionId + suffix;
  return { newInput: before + He + after, cursorPos: before.length + He.length };
}
//@ chunk-18hwfzwa.js:618462-619115 fingerprint = extractCompletionToken (1)
function extractCompletionToken(text, cursorPos, includeAtSymbol = !1) {
  if (!text) return null;
  let textBeforeCursor = text.substring(0, cursorPos);
  if (includeAtSymbol) {
    let quotedAtRegex = /@"([^"]*)"?$/,
      quotedMatch = textBeforeCursor.match(quotedAtRegex);
    if (quotedMatch && quotedMatch.index !== void 0) {
      let afterQuotedMatch = text.substring(cursorPos).match(/^[^"]*"?/),
        kt = afterQuotedMatch ? afterQuotedMatch[0] : "";
      return { token: quotedMatch[0] + kt, startPos: quotedMatch.index, isQuoted: !0 };
    }
  }
  if (includeAtSymbol) {
    let atIdx = textBeforeCursor.lastIndexOf("@");
    if (atIdx >= 0 && (atIdx === 0 || regExp_2.test(textBeforeCursor[atIdx - 1]))) {
      let fromAt = textBeforeCursor.substring(atIdx),
        atHeadMatch = fromAt.match(AT_TOKEN_RE);
      if (atHeadMatch && atHeadMatch[0].length === fromAt.length) {
        let afterMatch = text.substring(cursorPos).match(pKe),
          At = afterMatch ? afterMatch[0] : "";
        return { token: atHeadMatch[0] + At, startPos: atIdx, isQuoted: !1 };
      }
    }
  }
  let ee = includeAtSymbol ? HQt : UQt,
    match = textBeforeCursor.match(ee);
  if (!match || match.index === void 0) return null;
  let afterMatch = text.substring(cursorPos).match(pKe),
    He = afterMatch ? afterMatch[0] : "";
  return { token: match[0] + He, startPos: match.index, isQuoted: !1 };
}
//@ chunk-18hwfzwa.js:619115-619274 fingerprint = extractCommandNameAndArgs (1)
function extractCommandNameAndArgs(value) {
  if (isCommandInput(value)) {
    let spaceIndex = value.indexOf(" ");
    if (spaceIndex === -1) return { commandName: value.slice(1), args: "" };
    return { commandName: value.slice(1, spaceIndex), args: value.slice(spaceIndex + 1) };
  }
  return null;
}
//@ chunk-18hwfzwa.js:619274-619336 file-local
function hasCommandWithArguments(isAtEndWithWhitespace, value) {
  return !isAtEndWithWhitespace && value.includes(" ") && !value.endsWith(" ");
}
/**
 * 补全核心：根据光标前的 token 判定触发类型——"/" 命令与命令参数、"@" 文件/目录/agent/MCP 资源、bash 模式下的命令/路径/变量（shell completion）、":" emoji、/resume 会话标题；生成建议写入 suggestionsStore，处理 autocomplete:accept/dismiss/next/previous 与 Tab 补全，接受后改写 draft 的 value 与光标。
 */
//@ chunk-18hwfzwa.js:619336-642027 fingerprint = useTypeahead (0.697)
function useTypeahead({
  draft: draft,
  commands: commands,
  onSubmit: onSubmit,
  agents: agents,
  suggestionsStore: suggestionsStore,
  suppressSuggestions: suppressSuggestions,
  markAccepted: markAccepted,
  sessionEnvVars: sessionEnvVars,
}) {
  let value = useStoreSelector(draft, selectDraftValue),
    cursorOffset = useStoreSelector(draft, selectCursorOffset),
    mode = useStoreSelector(draft, selectInputMode),
    { setValue: setValue, setCursorOffset: setCursorOffset, setMode: setMode } = draft,
    At = takeAutocompleteRow({
      shown: suggestionsStore,
      draft: draft,
      text: value,
      cursor: cursorOffset,
      isOpen: mode === "prompt" && !suppressSuggestions,
    }),
    own = suggestionsStore.own,
    Ot = useStoreSelector(suggestionsStore),
    {
      suggestions: suggestions,
      suggestionType: suggestionType,
      hoveredSuggestionId: hoveredSuggestionId,
      commandArgumentHint: commandArgumentHint,
      suggestionsEmptyMessage: suggestionsEmptyMessage,
      maxColumnWidth: maxColumnWidth,
    } = useStoreSelector(own),
    so = ce((qn) => own.setState((ps) => preserveArrowedSuggestion(ps, qn(ps))), [own]),
    { addNotification: addNotification } = useNotifications(),
    thinkingToggleShortcut = useShortcutDisplay_2("chat:thinkingToggle", "Chat", "alt+t"),
    co = R(hoveredSuggestionId);
  co.current = hoveredSuggestionId ?? null;
  let allCommandsMaxWidth = Q(() => {
      let visibleCommands = commands.filter((cmd) => !cmd.isHidden);
      if (visibleCommands.length === 0) return;
      return Math.max(...visibleCommands.map((xs) => getCommandName(xs).length)) + 6;
    }, [commands]),
    resources = useAppState((cmd) => cmd.mcp.resources),
    resourceTemplates = useAppState((qn) => qn.mcp.resourceTemplates),
    store = Cr(),
    Ho = useSetAppState(),
    Wo = qd().emojiCompletionEnabled !== !1,
    mn = useSession(),
    Cn = useHost(),
    id = useSession((qn) => qn.id),
    { storageV5: storageV5 } = Me(),
    Yo = ce(() => {
      let state = store.getState();
      if (!state.mcp.clients.some((client) => client.type === "connected")) return;
      let { refreshResourceTemplates: refreshResourceTemplates } =
        require("./chunk-asne9cp8.js").mcpClientModule();
      refreshResourceTemplates(state.mcp.clients, state.mcp.resourceTemplates).then((xs) => {
        if (xs.length === 0) return;
        let kr = !1;
        if (
          (Ho((ls) => {
            let resourceTemplates = ls.mcp.resourceTemplates;
            for (let { client: client, templates: templates } of xs) {
              if (
                client.name in resourceTemplates ||
                !ls.mcp.clients.some(
                  (client_2) => client_2.type === "connected" && client_2.client === client.client,
                )
              )
                continue;
              resourceTemplates = { ...resourceTemplates, [client.name]: templates };
            }
            if (resourceTemplates === ls.mcp.resourceTemplates) return ls;
            return ((kr = !0), { ...ls, mcp: { ...ls.mcp, resourceTemplates: resourceTemplates } });
          }),
          kr && Dn.current === "at")
        )
          latestSearchTokenRef.current = null;
      });
    }, [store, Ho]),
    promptSuggestion = useAppState((qn) => qn.promptSuggestion),
    Fn = useAppState((qn) => !!qn.viewingAgentTaskId),
    keybindingContext = useKeybindingContext(),
    [Go, hn] = y(void 0),
    Mn = useIsFullscreen(),
    Xo = whr() && !Mn,
    syncPromptGhostText = Q(() => {
      if (mode !== "prompt" || Mn || suppressSuggestions || suggestionType === "mid-command") return;
      let midInputCommand = findMidInputSlashCommand(value, cursorOffset);
      if (!midInputCommand) return;
      let ps = getFilteredCommandSuggestions(mn, midInputCommand.partialCommand, commands),
        match = getBestCommandMatch(ps, midInputCommand.partialCommand);
      if (!match) return;
      return {
        text: ps.length > 1 ? `${match.suffix} +${ps.length - 1}` : match.suffix,
        fullCommand: match.fullCommand,
        insertPosition: midInputCommand.startPos + 1 + midInputCommand.partialCommand.length,
      };
    }, [value, cursorOffset, mode, Mn, suppressSuggestions, suggestionType, mn, commands]),
    $n = Q(() => {
      if (mode !== "bash" || !Go) return;
      if (value.length < 2 || !value.trim()) return;
      let { fullCommand: fullCommand } = Go;
      if (!fullCommand.startsWith(value) || fullCommand === value) return;
      if (Go.insertPosition === value.length) return Go;
      return {
        text: fullCommand.slice(value.length),
        fullCommand: fullCommand,
        insertPosition: value.length,
      };
    }, [mode, Go, value]),
    on = suppressSuggestions ? void 0 : mode === "prompt" ? syncPromptGhostText : $n,
    cursorOffsetRef = R(null);
  if (cursorOffsetRef.current === null) cursorOffsetRef.current = createDialFailureLatch();
  let latestSearchTokenRef = R(null),
    Dn = R("file"),
    prevInputRef = R(""),
    latestPathTokenRef = R(""),
    latestBashInputRef = R(0),
    Wn = R("at-path"),
    latestSlackTokenRef = R(null);
  latestSlackTokenRef.current = null;
  let suggestionsRef = R(""),
    dismissedForInputRef = R(""),
    dr = R(null),
    or = R(null),
    pr = R({ roster: { candidates: [], inProcess: new Set(), defaultNamed: new Set() }, at: 0, loading: !1 }),
    Qn = R(null),
    ur = R(null),
    [Ir, Pr] = y(0),
    clearSuggestions = ce(() => {
      let qn = pr.current;
      if (qn.loading || Date.now() - qn.at < KQt) return;
      ((qn.loading = !0),
        resolveTeamName(mn, store.getState(), { storageV5: storageV5 }).then(
          (ps) => {
            ((pr.current = { roster: ps, at: Date.now(), loading: !1 }), Pr((xs) => xs + 1));
          },
          () => {
            pr.current = { ...pr.current, at: Date.now(), loading: !1 };
          },
        ));
    }, [mn, store, storageV5]),
    fetchFileSuggestions = ce(() => {
      (so(normalizeEmptySuggestions), hn(void 0));
    }, [so]),
    Ur = ce(
      async (searchToken, ps = !1) => {
        ((latestSearchTokenRef.current = searchToken), (Dn.current = ps ? "at" : "file"));
        let xs = wt(),
          kr = null,
          ls = ps && !xs ? store.getState().mcp.resourceTemplates : resourceTemplates;
        if (ps && !xs) {
          if (
            (Yo(),
            (kr = await mcpTemplateCompletions(
              searchToken,
              ls,
              store.getState().mcp.clients,
              cursorOffsetRef.current,
            )),
            latestSearchTokenRef.current !== searchToken)
          )
            return;
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
        so((Ms) => ({
          commandArgumentHint: void 0,
          suggestions: kr,
          selectedSuggestion: findSelectedSuggestionIndex(Ms, kr, "file"),
          suggestionType: kr.length > 0 ? "file" : "none",
        }));
      },
      [resources, resourceTemplates, store, Yo, so, agents, storageV5],
    );
  P(() => {
    let qn = setImmediate((prev) => {
        if (!wt()) startBackgroundCacheRefresh(globalFileIndexCache, prev);
      }, storageV5),
      subscribe = globalFileIndexCache.indexBuildComplete.subscribe(() => {
        let token = latestSearchTokenRef.current;
        if (token === null) return;
        let kr = Dn.current;
        ((latestSearchTokenRef.current = null), Ur(token, kr === "at"));
      });
    return () => {
      (clearImmediate(qn), subscribe());
    };
  }, [Ur, storageV5]);
  let debouncedFetchFileSuggestions = useDebouncedCallback(Ur, 50),
    fetchSlackChannels = ce(
      async (partial) => {
        dismissedForInputRef.current = partial;
        let ps = await getSlackChannelSuggestions(mn, store.getState().mcp.clients, partial);
        if (dismissedForInputRef.current !== partial) return;
        so((prev) => ({
          commandArgumentHint: void 0,
          suggestions: ps,
          selectedSuggestion: findSelectedSuggestionIndex(prev, ps, "slack-channel"),
          suggestionType: ps.length > 0 ? "slack-channel" : "none",
        }));
      },
      [mn, so],
    ),
    debouncedFetchSlackChannels = useDebouncedCallback(fetchSlackChannels, 150),
    updateSuggestions = ce(() => {
      (debouncedFetchFileSuggestions.cancel(),
        debouncedFetchSlackChannels.cancel(),
        (latestSearchTokenRef.current = null),
        (latestPathTokenRef.current = ""),
        (dismissedForInputRef.current = ""));
    }, [debouncedFetchFileSuggestions, debouncedFetchSlackChannels]),
    fr = ce(
      async (qn, ps, xs) => {
        if (ur.current !== qn) ur.current = null;
        ((or.current = qn), (latestBashInputRef.current += 1));
        let kr = latestBashInputRef.current,
          ls = ps ?? draft.cursorOffset;
        if (suppressSuggestions) {
          (debouncedFetchFileSuggestions.cancel(), (or.current = null), fetchFileSuggestions());
          return;
        }
        if (mode === "prompt") {
          let midInputCommand = findMidInputSlashCommand(qn, ls),
            ds = suggestionType === "mid-command",
            Hs =
              midInputCommand && (ds || midInputCommand.partialCommand)
                ? getCommandSuggestionsForQuery(mn, midInputCommand.partialCommand, commands)
                : [];
          if (Hs.length > 0 && (Mn || ds)) {
            (updateSuggestions(),
              so((_s) => {
                let fs = _s.suggestionType === "mid-command",
                  ii = fs ? _s.suggestions[_s.selectedSuggestion]?.id : void 0,
                  index = Hs.findIndex((La) => La.id === ii);
                if (index < 0 && fs && _s.selectedSuggestion >= 0) index = 0;
                return {
                  commandArgumentHint: void 0,
                  suggestions: Hs,
                  selectedSuggestion: index,
                  suggestionType: "mid-command",
                  maxColumnWidth: allCommandsMaxWidth,
                };
              }));
            return;
          }
          if (Hs.length > 0) {
            so(normalizeEmptySuggestions);
            return;
          }
          if (ds) fetchFileSuggestions();
        }
        if (mode === "bash" && qn.trim()) {
          let es = qn.slice(0, ls).lastIndexOf(" ") + 1,
            sliced = qn.slice(es, ls);
          if (sliced && (looksLikePathToken(sliced) || sliced.includes("/"))) {
            latestPathTokenRef.current = sliced;
            let _s = await getPathCompletions(mn, sliced, { maxResults: 10, keepDotPrefix: !0 });
            if (latestPathTokenRef.current !== sliced) return;
            if (_s.length > 0) {
              (hn(void 0),
                so((fs) => ({
                  suggestions: _s,
                  selectedSuggestion: getPreservedSelection(fs.suggestions, fs.selectedSuggestion, _s),
                  commandArgumentHint: void 0,
                  suggestionType: "directory",
                })),
                (Wn.current = "bash-path"));
              return;
            }
          }
          if (suggestionType === "directory" && Wn.current === "bash-path") fetchFileSuggestions();
          suggestionsRef.current = qn;
          let Hs = await getShellHistoryCompletion(mn, qn, storageV5);
          if (suggestionsRef.current !== qn) return;
          if (Hs) {
            (hn({ text: Hs.suffix, fullCommand: Hs.fullCommand, insertPosition: qn.length }),
              so(normalizeEmptySuggestions));
            return;
          } else hn(void 0);
        }
        let Ms = mode !== "bash" ? qn.substring(0, ls).match(AT_MENTION_TOKEN_RE) : null;
        if (Ms) {
          let es = slugifySessionName(Ms[2] ?? ""),
            state = store.getState(),
            members = [],
            seen = new Set();
          if (isAgentSwarmsEnabled() && state.teamContext)
            for (let fs of Object.values(state.teamContext.teammates ?? {})) {
              if (fs.name === TEAM_LEAD) continue;
              if (!slugifySessionName(fs.name).startsWith(es)) continue;
              (seen.add(fs.name),
                members.push({
                  id: `dm-${fs.name}`,
                  displayText: `@${fs.name}`,
                  description: "send message",
                }));
            }
          for (let [fs, ii] of state.agentNameRegistry) {
            if (seen.has(fs)) continue;
            if (!slugifySessionName(fs).startsWith(es)) continue;
            let status = state.tasks[ii]?.status;
            members.push({
              id: `dm-${fs}`,
              displayText: `@${fs}`,
              description: status ? `send message \xB7 ${status}` : "send message",
            });
          }
          if (isCrossSessionMessagingEnabled() && !wt()) {
            let fs = Qn.current,
              ii =
                fs?.value === qn && fs.partial === es ? fs.rows : suggestPeerMentions(pr.current.roster, es);
            if (((Qn.current = { value: qn, partial: es, rows: ii }), members.push(...ii), es !== ""))
              clearSuggestions();
          }
          if (members.length > 0) {
            (debouncedFetchFileSuggestions.cancel(),
              (latestSearchTokenRef.current = null),
              (latestPathTokenRef.current = ""),
              (dismissedForInputRef.current = ""),
              debouncedFetchSlackChannels.cancel());
            let fs = ur.current === qn;
            so((prev) => ({
              commandArgumentHint: void 0,
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
          let hashMatch = qn.substring(0, ls).match(yue),
            ds = hashMatch ? extractCommandNameAndArgs(qn) : null,
            Hs = ds !== null && findCommand(ds.commandName, commands)?.completesHashChannels === !0;
          if (hashMatch && !Hs && hasSlackClient(store.getState().mcp.clients)) {
            debouncedFetchSlackChannels(hashMatch[2]);
            return;
          } else if (suggestionType === "slack-channel")
            (debouncedFetchSlackChannels.cancel(), fetchFileSuggestions());
        }
        if (mode === "prompt") {
          if (Wo) {
            let substring = qn.substring(0, ls),
              ds = isPrefixInsertion(qn, xs, ls) ? substring.match(qQt) : null;
            if (ds) {
              let _s = sKe(ds[2]);
              if (_s) {
                let fs = (ds.index ?? 0) + (ds[1]?.length ?? 0),
                  ii = qn.slice(0, fs) + _s + qn.slice(ls);
                (setValue(ii),
                  setCursorOffset(fs + _s.length),
                  fetchFileSuggestions(),
                  logFeatureOk("input_emoji_completion", { inline: !0 }));
                return;
              }
            }
            let hasAtSymbol = substring.match(Sue);
            if (hasAtSymbol) {
              let _s = getEmojiSuggestions(hasAtSymbol[2]);
              if (_s.length > 0) {
                so((fs) => ({
                  commandArgumentHint: void 0,
                  suggestions: _s,
                  selectedSuggestion: getPreservedSelection(fs.suggestions, fs.selectedSuggestion, _s),
                  suggestionType: "emoji",
                }));
                return;
              }
            }
          }
          if (suggestionType === "emoji") fetchFileSuggestions();
        }
        let match = qn.substring(0, ls).match(regExp_3),
          gs = ls === qn.length && ls > 0 && qn.length > 0 && qn[ls - 1] === " ";
        if (mode === "prompt" && isCommandInput(qn) && ls > 0) {
          let parsedCommand = extractCommandNameAndArgs(qn);
          if (parsedCommand && o2.has(parsedCommand.commandName) && parsedCommand.args) {
            let { args: args } = parsedCommand;
            if (args.match(/\s+$/)) {
              (debouncedFetchFileSuggestions.cancel(), fetchFileSuggestions());
              return;
            }
            let Hs = await getDirectoryCompletions(mn, args);
            if (Hs.length > 0) {
              (so((prev) => ({
                suggestions: Hs,
                selectedSuggestion: getPreservedSelection(prev.suggestions, prev.selectedSuggestion, Hs),
                commandArgumentHint: void 0,
                suggestionType: "directory",
              })),
                (Wn.current = "command-arg"));
              return;
            }
            (debouncedFetchFileSuggestions.cancel(), fetchFileSuggestions());
            return;
          }
          if (
            parsedCommand &&
            parsedCommand.commandName === "resume" &&
            parsedCommand.args !== void 0 &&
            parsedCommand.args.trim().length > 0 &&
            qn.includes(" ")
          ) {
            let { args: args } = parsedCommand,
              Hs = await searchSessionsByCustomTitle(args, { limit: 10 }, storageV5);
            if (or.current !== qn || dr.current === qn) return;
            let suggestions = Hs.map((log) => {
              let sessionId = getSessionIdFromLog(log);
              return {
                id: `resume-title-${sessionId}`,
                displayText: log.customTitle ?? log.aiTitle,
                description: formatLogMetadata(log),
                metadata: { sessionId: sessionId },
              };
            });
            if (suggestions.length > 0) {
              so((prev) => ({
                suggestions: suggestions,
                selectedSuggestion: findSelectedSuggestionIndex(prev, suggestions, "custom-title"),
                commandArgumentHint: void 0,
                suggestionType: "custom-title",
              }));
              return;
            }
            fetchFileSuggestions();
            return;
          }
          if (parsedCommand && qn.includes(" ")) {
            let ds = findCommand(parsedCommand.commandName, commands);
            if (ds?.getArgumentCompletions) {
              let Hs = commandArgSuggestions(qn, ds.getArgumentCompletions, storageV5),
                winner = await Promise.race([Hs, new Promise((ii) => setImmediate(ii))]);
              if (
                winner === void 0 &&
                own.getState().suggestions.some((suggestion) => !suggestion.id.startsWith(COMMAND_ARG))
              )
                fetchFileSuggestions();
              let fs = winner ?? (await Hs);
              if (or.current !== qn || dr.current === qn) return;
              if (fs.length > 0) {
                so((ii) => ({
                  suggestions: fs,
                  selectedSuggestion: getPreservedSelection(ii.suggestions, ii.selectedSuggestion, fs),
                  commandArgumentHint: void 0,
                  suggestionType: "command",
                }));
                return;
              }
              (debouncedFetchFileSuggestions.cancel(), fetchFileSuggestions());
              return;
            }
          }
        }
        if (mode === "prompt" && isCommandInput(qn) && ls > 0 && !hasCommandWithArguments(gs, qn)) {
          let es = void 0;
          if (qn.length > 1) {
            let spaceIndex = qn.indexOf(" "),
              ii = spaceIndex === -1 ? qn.slice(1) : qn.slice(1, spaceIndex),
              ua = spaceIndex !== -1 && qn.slice(spaceIndex + 1).trim().length > 0,
              La = spaceIndex !== -1 && qn.length === spaceIndex + 1;
            if (spaceIndex !== -1) {
              let Xa = findCommand(ii, commands);
              if (Xa || ua) {
                if (Xa?.argumentHint && La) es = Xa.argumentHint;
                else if (Xa?.type === "prompt" && Xa.argNames?.length && qn.endsWith(" ")) {
                  let argsText = qn.slice(spaceIndex + 1),
                    typedArgs = parseArgumentNames(argsText);
                  es = formatExtraArgHints(Xa.argNames, typedArgs);
                }
                so(() => ({
                  commandArgumentHint: es,
                  suggestions: [],
                  selectedSuggestion: -1,
                  suggestionType: "none",
                }));
                return;
              }
            }
          }
          let ds = generateCommandSuggestions(mn, qn, commands),
            Hs = firstLineOf(qn.slice(1), " "),
            _s = commandMatchesTypeaheadQuery(qn, ds) && !isPluginHiddenCommand(qn, commands) ? 0 : -1;
          so((fs) => {
            let ii = _s;
            if (qn === xs && fs.selectedSuggestion >= 0) {
              let ua = fs.suggestions[fs.selectedSuggestion]?.id,
                index = ds.findIndex((Xa) => Xa.id === ua);
              ii = index >= 0 ? index : _s;
            }
            return {
              commandArgumentHint: es,
              suggestions: ds,
              selectedSuggestion: ii,
              suggestionType: "command",
              suggestionsEmptyMessage:
                ds.length === 0 && qn.length > 1 && isValidCommandToken(Hs)
                  ? `No commands match "${qn}"`
                  : void 0,
              maxColumnWidth: ds.length > 0 ? allCommandsMaxWidth : void 0,
            };
          });
          return;
        }
        if (suggestionType === "command") (debouncedFetchFileSuggestions.cancel(), fetchFileSuggestions());
        else if (isCommandInput(qn) && hasCommandWithArguments(gs, qn))
          so((prev) => (prev.commandArgumentHint ? { ...prev, commandArgumentHint: void 0 } : prev));
        if (suggestionType === "custom-title") fetchFileSuggestions();
        if (
          suggestionType === "agent" &&
          own.getState().suggestions.some((suggestion) => suggestion.id?.startsWith("dm-"))
        ) {
          if (!qn.substring(0, ls).match(AT_MENTION_TOKEN_RE)) fetchFileSuggestions();
        }
        if (match && mode !== "bash") {
          let completionToken = extractCompletionToken(qn, ls, !0);
          if (completionToken && completionToken.token.startsWith("@")) {
            let searchToken = extractSearchToken(completionToken);
            if (looksLikePathToken(searchToken)) {
              latestPathTokenRef.current = searchToken;
              let Hs = await getPathCompletions(mn, searchToken, { maxResults: 10 });
              if (latestBashInputRef.current !== kr) return;
              if (latestPathTokenRef.current !== searchToken) return;
              if (Hs.length > 0) {
                (so((prev) => ({
                  suggestions: Hs,
                  selectedSuggestion: getPreservedSelection(prev.suggestions, prev.selectedSuggestion, Hs),
                  commandArgumentHint: void 0,
                  suggestionType: "directory",
                })),
                  (Wn.current = "at-path"));
                return;
              }
            }
            if (latestSearchTokenRef.current === searchToken) return;
            debouncedFetchFileSuggestions(searchToken, !0);
            return;
          }
        }
        if (suggestionType === "file") {
          let completionToken = extractCompletionToken(qn, ls, !0);
          if (completionToken) {
            let searchToken = extractSearchToken(completionToken);
            if (latestSearchTokenRef.current === searchToken) return;
            debouncedFetchFileSuggestions(searchToken, !1);
          } else (debouncedFetchFileSuggestions.cancel(), fetchFileSuggestions());
        }
        if (suggestionType === "shell") {
          let inputSnapshot = own.getState().suggestions[0]?.metadata?.inputSnapshot;
          if (mode !== "bash" || qn !== inputSnapshot)
            (debouncedFetchFileSuggestions.cancel(), fetchFileSuggestions());
        }
        if (suggestionType !== "directory") return;
        (debouncedFetchFileSuggestions.cancel(), fetchFileSuggestions());
      },
      [
        suggestionType,
        commands,
        so,
        fetchFileSuggestions,
        Ur,
        debouncedFetchFileSuggestions,
        debouncedFetchSlackChannels,
        mode,
        suppressSuggestions,
        draft,
        setValue,
        setCursorOffset,
        own,
        allCommandsMaxWidth,
        Mn,
        updateSuggestions,
        Wo,
        mn,
        storageV5,
        clearSuggestions,
      ],
    );
  P(() => {
    if (dr.current === value) return;
    let qn = prevInputRef.current;
    if (qn !== value) ((prevInputRef.current = value), (latestSearchTokenRef.current = null));
    ((dr.current = null), fr(value, void 0, qn));
  }, [value, fr]);
  let $r = Oo(() => {
    if (
      dr.current !== value &&
      own.getState().suggestions.length === 0 &&
      AT_MENTION_TOKEN_RE.test(value.substring(0, draft.cursorOffset))
    )
      ((Qn.current = null), (ur.current = value), fr(value));
  });
  P(() => {
    if (Ir === 0) return;
    $r();
  }, [Ir]);
  let handleTab = ce(async () => {
      if (mode === "bash" && on) {
        (setValue(on.fullCommand), setCursorOffset(on.fullCommand.length), hn(void 0));
        return;
      }
      if (At.tab()) return;
      let { value: qn, cursorOffset: cursorOffset_2 } = draft,
        xs =
          mode === "prompt" && !suppressSuggestions && suggestions.length === 0
            ? findMidInputSlashCommand(qn, cursorOffset_2)
            : null;
      if (xs) {
        let kr = getCommandSuggestionsForQuery(mn, xs.partialCommand, commands),
          ls = kr.length === 1 && kr[0] ? applyMidInputCommandSuggestion(kr[0], qn, cursorOffset_2) : null;
        if (ls) {
          (setValue(ls.value), setCursorOffset(ls.cursorOffset));
          return;
        }
        if (kr.length > 1) {
          (updateSuggestions(),
            so(() => ({
              commandArgumentHint: void 0,
              suggestions: kr,
              selectedSuggestion: 0,
              suggestionType: "mid-command",
              maxColumnWidth: allCommandsMaxWidth,
            })));
          return;
        }
      }
      if (!on && At.tabTop()) return;
      if (suggestions.length > 0) {
        (debouncedFetchFileSuggestions.cancel(), debouncedFetchSlackChannels.cancel());
        let kr = co.current ? suggestions.findIndex((gs) => gs.id === co.current) : -1,
          selectedSuggestion = own.getState().selectedSuggestion;
        if (
          kr < 0 &&
          selectedSuggestion === -1 &&
          ur.current === value &&
          suggestions.some((gs) => gs.id.startsWith("dm-peer-"))
        )
          return;
        let Ms = kr >= 0 ? kr : selectedSuggestion === -1 ? 0 : selectedSuggestion,
          qs = suggestions[Ms];
        if (suggestionType === "command" && Ms < suggestions.length) {
          if (qs) {
            let newInput = applyCommandSuggestion({
              suggestion: qs,
              shouldExecute: !1,
              commands: commands,
              onInputChange: setValue,
              setCursorOffset: setCursorOffset,
              onSubmit: onSubmit,
            });
            if (newInput?.reSuggest) fr(newInput.newInput, newInput.newInput.length);
            else fetchFileSuggestions();
          }
        } else if (suggestionType === "mid-command") {
          let gs =
            qs &&
            getMidInputCommandCompletion({
              session: mn,
              commands: commands,
              row: qs,
              input: qn,
              cursorOffset: cursorOffset_2,
            });
          if (gs) (setValue(gs.value), setCursorOffset(gs.cursorOffset));
          fetchFileSuggestions();
        } else if (suggestionType === "custom-title" && suggestions.length > 0) {
          if (qs) {
            let gs = buildResumeInputFromSuggestion(qs);
            (setValue(gs), setCursorOffset(gs.length), fetchFileSuggestions());
          }
        } else if (suggestionType === "directory" && suggestions.length > 0) {
          let gs = suggestions[Ms];
          if (gs) {
            let es;
            if (Wn.current === "bash-path") {
              let ds = value.slice(0, cursorOffset).lastIndexOf(" ") + 1,
                Hs = isPathMetadata(gs.metadata) && gs.metadata.type === "directory",
                _s = gs.displayText + (Hs ? "" : " ");
              es = value.slice(0, ds) + _s + value.slice(cursorOffset);
              let fs = ds + _s.length;
              if ((setValue(es), setCursorOffset(fs), Hs)) fr(es, fs);
              else fetchFileSuggestions();
            } else if (Wn.current === "command-arg") {
              let spaceIndex = value.indexOf(" "),
                commandPart = value.slice(0, spaceIndex + 1),
                _s = isPathMetadata(gs.metadata) && gs.metadata.type === "directory" ? "/" : " ";
              if (
                ((es = commandPart + gs.id + _s),
                setValue(es),
                setCursorOffset(es.length),
                isPathMetadata(gs.metadata) && gs.metadata.type === "directory")
              )
                (so((prev) => ({ ...prev, commandArgumentHint: void 0 })), fr(es, es.length));
              else fetchFileSuggestions();
            } else {
              let Hs =
                extractCompletionToken(value, cursorOffset, !0) ??
                extractCompletionToken(value, cursorOffset, !1);
              if (Hs) {
                let _s = isPathMetadata(gs.metadata) && gs.metadata.type === "directory",
                  result = applyDirectorySuggestion(value, gs.id, Hs.startPos, Hs.token.length, _s);
                if (((es = result.newInput), setValue(es), setCursorOffset(result.cursorPos), _s))
                  (so((prev) => ({ ...prev, commandArgumentHint: void 0 })), fr(es, result.cursorPos));
                else fetchFileSuggestions();
              } else fetchFileSuggestions();
            }
          }
        } else if (suggestionType === "shell" && suggestions.length > 0) {
          let gs = suggestions[Ms];
          if (gs) {
            let metadata = gs.metadata;
            (applyShellSuggestion(
              gs,
              value,
              cursorOffset,
              setValue,
              setCursorOffset,
              metadata?.completionType,
            ),
              fetchFileSuggestions());
          }
        } else if (
          suggestionType === "agent" &&
          suggestions.length > 0 &&
          suggestions[Ms]?.id?.startsWith("dm-")
        ) {
          let gs = suggestions[Ms];
          if (gs)
            (isCursorInTriggerToken(gs, value, cursorOffset, AT_MENTION_TOKEN_RE, setValue, setCursorOffset),
              fetchFileSuggestions());
        } else if (suggestionType === "slack-channel" && suggestions.length > 0) {
          let gs = suggestions[Ms];
          if (gs)
            (isCursorInTriggerToken(gs, value, cursorOffset, yue, setValue, setCursorOffset),
              fetchFileSuggestions());
        } else if (Wo && suggestionType === "emoji" && suggestions.length > 0) {
          let gs = suggestions[Ms];
          if (gs) {
            let es = isCursorInTriggerToken(gs, value, cursorOffset, Sue, setValue, setCursorOffset);
            if ((fetchFileSuggestions(), es)) logFeatureOk("input_emoji_completion", { inline: !1 });
          }
        } else if (suggestionType === "file" && suggestions.length > 0) {
          let completionToken = extractCompletionToken(value, cursorOffset, !0);
          if (!completionToken) {
            fetchFileSuggestions();
            return;
          }
          let ds = suggestions.some((fs) => parseCompletionResult(fs.metadata) !== null)
              ? ""
              : findLongestCommonPrefix(suggestions),
            hasAtPrefix = completionToken.token.startsWith("@"),
            _s;
          if (completionToken.isQuoted) _s = stripSuffix(completionToken.token.slice(2), '"').length;
          else if (hasAtPrefix) _s = completionToken.token.length - 1;
          else _s = completionToken.token.length;
          if (ds.length > _s) {
            let replacementValue = formatReplacementValue({
              displayText: ds,
              mode: mode,
              hasAtPrefix: hasAtPrefix,
              needsQuotes: !1,
              isQuoted: completionToken.isQuoted,
              isComplete: !1,
            });
            (applyFileSuggestion({
              suggestion: replacementValue,
              input: value,
              partialPath: completionToken.token,
              startPos: completionToken.startPos,
              onInputChange: setValue,
              setCursorOffset: setCursorOffset,
            }),
              fr(value.replace(completionToken.token, replacementValue), cursorOffset));
          } else if (Ms < suggestions.length) {
            let fs = suggestions[Ms];
            if (fs) {
              let ii = parseCompletionResult(fs.metadata),
                ua = ii
                  ? `${ii.replacement}${ii.partial ? "" : " "}`
                  : formatReplacementValue({
                      displayText: fs.displayText,
                      mode: mode,
                      hasAtPrefix: hasAtPrefix,
                      needsQuotes: fs.displayText.includes(" "),
                      isQuoted: completionToken.isQuoted,
                      isComplete: !0,
                    }),
                replacementValue = applyFileSuggestion({
                  suggestion: ua,
                  input: value,
                  partialPath: completionToken.token,
                  startPos: completionToken.startPos,
                  onInputChange: setValue,
                  setCursorOffset: setCursorOffset,
                });
              if (ii?.partial) fr(replacementValue, completionToken.startPos + ua.length);
              else fetchFileSuggestions();
            }
          }
        }
      } else if (value.trim() !== "") {
        let kr, ls;
        if (mode === "bash") {
          kr = "shell";
          let Ms = await generateBashSuggestions(
            draft.shellCompletionAbort,
            mn.host,
            value,
            cursorOffset,
            sessionEnvVars,
          );
          if (Ms.length === 1) {
            let qs = Ms[0];
            if (qs) {
              let metadata = qs.metadata;
              applyShellSuggestion(
                qs,
                value,
                cursorOffset,
                setValue,
                setCursorOffset,
                metadata?.completionType,
              );
            }
            ls = [];
          } else ls = Ms;
        } else {
          kr = "file";
          let completionInfo = extractCompletionToken(value, cursorOffset, !0);
          if (completionInfo) {
            let isAtSymbol = completionInfo.token.startsWith("@"),
              gs = extractSearchToken(completionInfo),
              es = wt();
            ((latestSearchTokenRef.current = gs), (Dn.current = isAtSymbol ? "at" : "file"));
            let ds = isAtSymbol && !es ? store.getState().mcp.resourceTemplates : resourceTemplates,
              Hs = null;
            if (isAtSymbol && !es) {
              if (
                (Yo(),
                (Hs = await mcpTemplateCompletions(
                  gs,
                  ds,
                  store.getState().mcp.clients,
                  cursorOffsetRef.current,
                )),
                latestSearchTokenRef.current !== gs)
              )
                return;
            }
            if (
              ((ls =
                Hs ??
                (await generateUnifiedSuggestions(
                  globalFileIndexCache,
                  gs,
                  {
                    mcpResources: es ? {} : resources,
                    agents: es ? [] : agents,
                    showOnEmpty: isAtSymbol,
                    mcpResourceTemplates: es ? {} : ds,
                  },
                  storageV5,
                ))),
              latestSearchTokenRef.current !== gs)
            )
              return;
          } else ls = [];
        }
        if (ls.length > 0)
          so((prev) => ({
            commandArgumentHint: void 0,
            suggestions: ls,
            selectedSuggestion: getPreservedSelection(prev.suggestions, prev.selectedSuggestion, ls),
            suggestionType: kr,
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
      mn,
      sessionEnvVars,
      draft,
      own,
      Wo,
      storageV5,
      allCommandsMaxWidth,
      suppressSuggestions,
      updateSuggestions,
      At,
    ]),
    handleEnter = ce(
      (qn, ps, xs) => {
        let {
            suggestions: suggestions,
            selectedSuggestion: selectedSuggestion,
            suggestionType: suggestionType,
            arrowedSuggestionId: arrowedSuggestionId,
          } = own.getState(),
          gs = getArrowedSuggestionId({
            suggestions: suggestions,
            selectedSuggestion: selectedSuggestion,
            arrowedSuggestionId: arrowedSuggestionId,
          }),
          es =
            qn === void 0 &&
            Xo &&
            (suggestionType === "command" || suggestionType === "custom-title") &&
            gs === null &&
            !(suggestionType === "command" && isUniqueCommandMatch(ps, suggestions, selectedSuggestion)),
          ds = draft.value;
        if (qn === void 0 && suggestionType === "command" && ds !== ps) {
          if (
            (debouncedFetchFileSuggestions.cancel(),
            fetchFileSuggestions(),
            mode === "prompt" && isCommandInput(ds) && ds.slice(1).trim() !== "")
          ) {
            let ii = generateCommandSuggestions(mn, ds, commands),
              ua = ii[0];
            if (
              ua &&
              commandMatchesTypeaheadQuery(ds, ii) &&
              !isPluginHiddenCommand(ds, commands) &&
              (!Xo || ua.id === gs || isUniqueCommandMatch(ds, ii, 0))
            ) {
              let newInput = applyCommandSuggestion({
                suggestion: ua,
                shouldExecute: !0,
                commands: commands,
                onInputChange: setValue,
                setCursorOffset: setCursorOffset,
                onSubmit: onSubmit,
              });
              if (newInput?.submitted) latestSlackTokenRef.current = draft.value;
              if (newInput?.reSuggest) fr(newInput.newInput, newInput.newInput.length);
              return;
            }
          }
          (onSubmit(ds, !0), (latestSlackTokenRef.current = draft.value));
          return;
        }
        let Hs = co.current ? suggestions.findIndex((ii) => ii.id === co.current) : -1,
          _s = es ? -1 : (qn ?? (Hs >= 0 ? Hs : selectedSuggestion));
        if (_s < 0 || suggestions.length === 0) {
          if (
            suggestions.length > 0 &&
            ur.current === ps &&
            suggestions.some((ii) => ii.id.startsWith("dm-peer-"))
          )
            ((dr.current = ps), fetchFileSuggestions());
          else if (
            suggestions.length > 0 &&
            (suggestionType === "command" ||
              suggestionType === "mid-command" ||
              suggestionType === "custom-title" ||
              suggestionType === "file" ||
              suggestionType === "slack-channel")
          )
            (debouncedFetchFileSuggestions.cancel(),
              debouncedFetchSlackChannels.cancel(),
              fetchFileSuggestions(),
              onSubmit(ds, !0),
              (latestSlackTokenRef.current = draft.value));
          return;
        }
        let fs = suggestions[_s];
        if (suggestionType === "command" && _s < suggestions.length) {
          if (fs) {
            if (
              qn === void 0 &&
              gs === null &&
              fs.id.startsWith(COMMAND_ARG) &&
              /^\/\S+\s+$/.test(ps) &&
              findCommand(ps.trim().slice(1), commands)?.enterTakesArgumentCompletion !== !0
            ) {
              (debouncedFetchFileSuggestions.cancel(),
                fetchFileSuggestions(),
                onSubmit(ps, !0),
                (latestSlackTokenRef.current = draft.value));
              return;
            }
            let ii = applyCommandSuggestion({
              suggestion: fs,
              shouldExecute: qn === void 0,
              commands: commands,
              onInputChange: setValue,
              setCursorOffset: setCursorOffset,
              onSubmit: onSubmit,
            });
            if (ii?.submitted) latestSlackTokenRef.current = draft.value;
            if ((debouncedFetchFileSuggestions.cancel(), ii?.reSuggest)) fr(ii.newInput, ii.newInput.length);
            else fetchFileSuggestions();
          }
        } else if (suggestionType === "custom-title" && _s < suggestions.length) {
          if (fs) {
            let ii = buildResumeInputFromSuggestion(fs);
            (setValue(ii),
              setCursorOffset(ii.length),
              onSubmit(ii, !0),
              (latestSlackTokenRef.current = draft.value),
              debouncedFetchFileSuggestions.cancel(),
              fetchFileSuggestions());
          }
        } else if (suggestionType === "shell" && _s < suggestions.length) {
          if (fs) {
            let metadata = fs.metadata;
            (applyShellSuggestion(fs, ps, xs, setValue, setCursorOffset, metadata?.completionType),
              debouncedFetchFileSuggestions.cancel(),
              fetchFileSuggestions());
          }
        } else if (suggestionType === "agent" && _s < suggestions.length && fs?.id?.startsWith("dm-"))
          (isCursorInTriggerToken(fs, ps, xs, AT_MENTION_TOKEN_RE, setValue, setCursorOffset),
            debouncedFetchFileSuggestions.cancel(),
            fetchFileSuggestions());
        else if (suggestionType === "slack-channel" && _s < suggestions.length) {
          if (fs)
            (isCursorInTriggerToken(fs, ps, xs, yue, setValue, setCursorOffset),
              debouncedFetchSlackChannels.cancel(),
              fetchFileSuggestions());
        } else if (suggestionType === "mid-command") {
          let ii =
            fs &&
            getMidInputCommandCompletion({
              session: mn,
              commands: commands,
              row: fs,
              input: ds,
              cursorOffset: draft.cursorOffset,
            });
          if ((fetchFileSuggestions(), ii)) (setValue(ii.value), setCursorOffset(ii.cursorOffset));
          else if (qn === void 0) (onSubmit(ds, !0), (latestSlackTokenRef.current = draft.value));
        } else if (Wo && suggestionType === "emoji" && _s < suggestions.length) {
          if (fs) {
            let ii = isCursorInTriggerToken(fs, ps, xs, Sue, setValue, setCursorOffset);
            if ((fetchFileSuggestions(), ii)) logFeatureOk("input_emoji_completion", { inline: !1 });
          }
        } else if (suggestionType === "file" && _s < suggestions.length) {
          let completionInfo = extractCompletionToken(ps, xs, !0);
          if (completionInfo) {
            if (fs) {
              let ua = parseCompletionResult(fs.metadata),
                hasAtPrefix = completionInfo.token.startsWith("@"),
                Xa = ua
                  ? `${ua.replacement}${ua.partial ? "" : " "}`
                  : formatReplacementValue({
                      displayText: fs.displayText,
                      mode: mode,
                      hasAtPrefix: hasAtPrefix,
                      needsQuotes: fs.displayText.includes(" "),
                      isQuoted: completionInfo.isQuoted,
                      isComplete: !0,
                    }),
                replacementValue = applyFileSuggestion({
                  suggestion: Xa,
                  input: ps,
                  partialPath: completionInfo.token,
                  startPos: completionInfo.startPos,
                  onInputChange: setValue,
                  setCursorOffset: setCursorOffset,
                });
              if ((debouncedFetchFileSuggestions.cancel(), ua?.partial))
                fr(replacementValue, completionInfo.startPos + Xa.length);
              else fetchFileSuggestions();
            }
          }
        } else if (suggestionType === "directory" && _s < suggestions.length) {
          if (fs) {
            if (Wn.current === "bash-path") {
              if ((debouncedFetchFileSuggestions.cancel(), qn === void 0 && gs === null)) {
                if ((fetchFileSuggestions(), latestSlackTokenRef.current === null))
                  (onSubmit(draft.value, !0), (latestSlackTokenRef.current = draft.value));
                return;
              }
              let La = ps.slice(0, xs).lastIndexOf(" ") + 1,
                Xa = isPathMetadata(fs.metadata) && fs.metadata.type === "directory",
                dl = fs.displayText + (Xa ? "" : " "),
                Vl = ps.slice(0, La) + dl + ps.slice(xs);
              (setValue(Vl), setCursorOffset(La + dl.length), fetchFileSuggestions());
              return;
            }
            if (Wn.current === "command-arg") {
              if ((debouncedFetchFileSuggestions.cancel(), qn !== void 0 || gs !== null)) {
                let index = ps.indexOf(" "),
                  sliced = ps.slice(0, index + 1),
                  dl = isPathMetadata(fs.metadata) && fs.metadata.type === "directory",
                  Vl = sliced + fs.id + (dl ? "/" : " ");
                if ((setValue(Vl), setCursorOffset(Vl.length), dl)) fr(Vl, Vl.length);
                else fetchFileSuggestions();
                return;
              }
              (fetchFileSuggestions(), onSubmit(ps, !0), (latestSlackTokenRef.current = draft.value));
              return;
            }
            let ua = extractCompletionToken(ps, xs, !0) ?? extractCompletionToken(ps, xs, !1);
            if (ua) {
              let La = isPathMetadata(fs.metadata) && fs.metadata.type === "directory",
                result = applyDirectorySuggestion(ps, fs.id, ua.startPos, ua.token.length, La);
              (setValue(result.newInput), setCursorOffset(result.cursorPos));
            }
            (debouncedFetchFileSuggestions.cancel(), fetchFileSuggestions());
          }
        }
      },
      [
        own,
        Xo,
        commands,
        draft,
        mn,
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
    ),
    handleAutocompleteAccept = ce(() => {
      handleTab();
    }, [handleTab]),
    handleAutocompleteDismiss = ce(() => {
      (debouncedFetchFileSuggestions.cancel(),
        debouncedFetchSlackChannels.cancel(),
        At.drop(),
        fetchFileSuggestions(),
        (dr.current = value),
        (latestBashInputRef.current += 1));
    }, [debouncedFetchFileSuggestions, debouncedFetchSlackChannels, fetchFileSuggestions, value, At]),
    handleAutocompletePrevious = ce(() => {
      let state = suggestionsStore.getState(),
        ps = own.getState().suggestions.length;
      if (
        !Xo ||
        !state.suggestions[state.selectedSuggestion] ||
        state.selectedSuggestion >= ps ||
        getArrowedSuggestionId(state) !== null
      )
        return !1;
      return (so(kue), logSuggestionNavUsed(Cn, id, own.getState()), !0);
    }, [Xo, own, suggestionsStore, so, Cn, id]),
    Ls = ce(() => {
      if (handleAutocompletePrevious()) return;
      if (At.move(-1, Xo)) {
        logSuggestionNavUsed(Cn, id, suggestionsStore.getState());
        return;
      }
      (so((prev) => {
        let ps = {
          ...prev,
          hoveredSuggestionId: null,
          selectedSuggestion:
            prev.selectedSuggestion <= 0 ? prev.suggestions.length - 1 : prev.selectedSuggestion - 1,
        };
        return Xo ? kue(ps) : ps;
      }),
        logSuggestionNavUsed(Cn, id, own.getState()));
    }, [so, handleAutocompletePrevious, Xo, Cn, id, own, suggestionsStore, At]),
    handleAutocompleteNext = ce(() => {
      if (handleAutocompletePrevious()) return;
      if (At.move(1, Xo)) {
        logSuggestionNavUsed(Cn, id, suggestionsStore.getState());
        return;
      }
      (so((prev) => {
        let ps = {
          ...prev,
          hoveredSuggestionId: null,
          selectedSuggestion:
            prev.selectedSuggestion >= prev.suggestions.length - 1 ? 0 : prev.selectedSuggestion + 1,
        };
        return Xo ? kue(ps) : ps;
      }),
        logSuggestionNavUsed(Cn, id, own.getState()));
    }, [so, handleAutocompletePrevious, Xo, Cn, id, own, suggestionsStore, At]);
  P(() => {
    if (!Xo) return;
    let { value: qn, cursorOffset: cursorOffset } = draft;
    return draft.subscribe(() => {
      if (draft.value === qn && draft.cursorOffset === cursorOffset) return;
      ((qn = draft.value),
        (cursorOffset = draft.cursorOffset),
        so((xs) => (xs.arrowedSuggestionId ? { ...xs, arrowedSuggestionId: null } : xs)));
    });
  }, [draft, so, Xo]);
  let autocompleteHandlers = ce(
      (qn) => {
        so((ps) => (ps.hoveredSuggestionId === qn ? ps : { ...ps, hoveredSuggestionId: qn }));
      },
      [so],
    ),
    Ci = ce(
      (qn, ps) => {
        if (At.click(ps)) return;
        let index = own.getState().suggestions.findIndex((suggestion) => suggestion.id === ps);
        if (index < 0) return;
        handleEnter(index, draft.value, draft.cursorOffset);
      },
      [handleEnter, draft, own, At],
    ),
    oi = Q(
      () => ({
        "autocomplete:accept": handleAutocompleteAccept,
        "autocomplete:dismiss": handleAutocompleteDismiss,
        "autocomplete:previous": Ls,
        "autocomplete:next": handleAutocompleteNext,
      }),
      [handleAutocompleteAccept, handleAutocompleteDismiss, Ls, handleAutocompleteNext],
    ),
    Oi = Ot.suggestions.length > 0 || !!on,
    isModalOverlayActive = UV();
  (useRegisterOverlay("autocomplete", Oi),
    useRegisterKeybindingContext("Autocomplete", Oi),
    MessageActionsKeybindings(oi, { context: "Autocomplete", isActive: Oi && !isModalOverlayActive }));
  function acceptSuggestionText(text) {
    let detectedMode = getModeFromInput_2(text);
    if (detectedMode !== "prompt") {
      setMode(detectedMode);
      let stripped = stripModePrefix(text);
      (setValue(stripped), setCursorOffset(stripped.length));
    } else (setValue(text), setCursorOffset(text.length));
  }
  let handleKeyDown = (qn) => {
    if (qn.name === "right" && !Fn) {
      if (nGe(promptSuggestion) && value === "") {
        (markAccepted(),
          acceptSuggestionText(promptSuggestion.text),
          qn.preventDefault(),
          qn.stopImmediatePropagation());
        return;
      }
    }
    if (qn.name === "tab" && !qn.shift) {
      if (suggestionsStore.getState().suggestions.length > 0 || on) return;
      let xs =
        mode === "prompt" && !suppressSuggestions
          ? findMidInputSlashCommand(draft.value, draft.cursorOffset)
          : null;
      if (xs && getCommandSuggestionsForQuery(mn, xs.partialCommand, commands).length > 0) {
        (qn.preventDefault(), handleTab().catch(logError));
        return;
      }
      if (nGe(promptSuggestion) && value === "" && !Fn) {
        (qn.preventDefault(), markAccepted(), acceptSuggestionText(promptSuggestion.text));
        return;
      }
      if (value.trim() === "")
        (qn.preventDefault(),
          addNotification({
            key: "thinking-toggle-hint",
            kind: "hint",
            text: `Use ${thinkingToggleShortcut} to toggle thinking`,
            row1Hint: `${thinkingToggleShortcut} to toggle thinking`,
            priority: "immediate",
            timeoutMs: 3000,
          }));
      return;
    }
    if (suggestionsStore.getState().suggestions.length === 0) {
      if (
        qn.name === "return" &&
        !qn.shift &&
        !qn.meta &&
        latestSlackTokenRef.current !== null &&
        draft.value === latestSlackTokenRef.current
      )
        qn.preventDefault();
      return;
    }
    let ps = keybindingContext?.pendingChord != null;
    if (qn.ctrl && qn.key === "n" && !ps) {
      (qn.preventDefault(), handleAutocompleteNext());
      return;
    }
    if (qn.ctrl && qn.key === "p" && !ps) {
      (qn.preventDefault(), Ls());
      return;
    }
    if (qn.name === "return" && !qn.shift && !qn.meta) {
      let enter = At.enter();
      if (enter === "left") return;
      if (enter === "taken") {
        qn.preventDefault();
        return;
      }
      if (own.getState().suggestionType === "directory" && Wn.current === "bash-path") {
        let kr = draft.value,
          ls = cursorOffset + (kr.length - value.length);
        if (kr[ls - 1] === "\\" || Vnn()) return;
      }
      (qn.preventDefault(), handleEnter(void 0, value, cursorOffset));
    }
  };
  return {
    suggestions: Ot.suggestions,
    selectedSuggestion: Ot.selectedSuggestion,
    suggestionType: suggestionType,
    maxColumnWidth: maxColumnWidth,
    commandArgumentHint: commandArgumentHint,
    suggestionsEmptyMessage: suggestionsEmptyMessage,
    inlineGhostText: on,
    handleKeyDown: handleKeyDown,
    selectSuggestion: Ci,
    setHoveredSuggestion: autocompleteHandlers,
    hoveredSuggestionId: hoveredSuggestionId ?? null,
    cursorRowId: getArrowedSuggestionId(Ot),
  };
}

export { useTypeahead, Tue };
