/**
 * components/permissions/SkillPermissionRequest/SkillPermissionRequest.tsx
 *
 * Skill 工具权限请求：技能名与安全检查结果，允许/应用建议/拒绝。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/components/permissions/SkillPermissionRequest/SkillPermissionRequest.tsx
 * pieces: chunk-18hwfzwa.js (10)
 * attribution: sole-consumer 3, affinity 2, fingerprint 2, layout 1, placement 2
 */
import {
  parseConsentSuggestions,
  DISPLAYED_UPDATE_TYPES,
  MAX_CONSENT_RULE_WIDTH,
  CONSENT_ROW_LIMITS,
  parseModeSuggestions,
  combineRows,
} from "../consentRows.js";
import { generateShellSuggestionsLabel } from "../shellPermissionHelpers.js";
import { findSafetyCheckReason } from "../../../utils/permissions/permissions.js";
import { w } from "../../../../vendor/react/compiler-runtime.js";
import { processResponse } from "../../../hooks/useSwarmPermissionPoller.js";
import { MEMO_CACHE_SENTINEL } from "../../../../runtime/bun-runtime.js";
import {
  needsGutter,
  displayField,
  plainDisplay,
} from "../../../utils/permissions/approvalPayloadSerialization.js";
import {
  jsxProd_default,
  jsxProd_default_2,
  Fragment,
} from "../../../../vendor/react/cjs/react-jsx-dev-runtime.react-server.production.js";
import { Text, Box } from "../../../ink/components/Text.js";
import { Blockquote } from "../../Blockquote.js";
import { formatQuotedList } from "../../../utils/websocketSummary.js";
import { DiffFrame } from "../../FileEditToolDiff.js";
import { sandboxHostsSummary, formatHiddenRowsHint } from "../BashPermissionRequest/commandDisplay.js";
import { MAX_EXPLANATION_LINES, PermissionRuleExplanation } from "../PermissionRuleExplanation.js";
import { PermissionPrompt } from "../PermissionPrompt.js";
import { PermissionDialog_2 } from "../PermissionDialog.js";
import { MONITOR } from "../../../tools/MonitorTool/constants.js";
import {
  getSkillCommandPrefix,
  resolveSkillDisplay,
  useSkillAskRevealMemory,
  SKILL_NARROW_COLUMNS,
  buildSkillExactRule,
  buildSkillPrefixRule,
  HIDDEN_EXACT_RULE_LABEL,
  SKILL_UNREAD_HINT_ENABLED,
  UNREAD_OFFER_HINT,
  CUT_OFFER_HINT,
  TERMINAL_TOO_SHORT_HINT,
  skillChoiceToResult,
  NARROW_COLUMNS_WITH_HINTS,
  NARROW_COLUMN_INSET,
  SURVEY_QUESTION_LINE_CHARS,
} from "./skillPermissionOptions.js";
import { getOriginalCwd } from "../../../bootstrap/state.js";
import { Q, Se, y, P, zt, init_react_production } from "../../../../vendor/react/cjs/react.production.js";
import { useIsScreenReaderEnabled } from "../../../ink/components/ErrorBoundary.js";
import { useScrollViewportSize } from "../../ScrollViewportContext.js";
import { TerminalSizeContext } from "../../../ink/terminalModes.js";
import { fitsWithMeta } from "../PermissionRequestTitle.js";
import { FittedOfferBody } from "../../AutocompactOfferDialog.js";
import { sanitizeToolNameForAnalytics } from "../../../services/analytics/metadata.js";
import { useShortcutDisplay } from "../../../keybindings/useKeybindingDisplay.js";
import { formatShortcutHint } from "../../design-system/KeyboardShortcutHint.js";
import { useDialogKeybindings } from "../../../keybindings/dialogKeyHints.js";

//@ chunk-18hwfzwa.js:1390671-1391495 sole-consumer
/**
 * 从权限结果的 suggestions 生成同意行：规则类一行，addDirectories 目录（有总数上限、防御性读取）一行，多行合并。
 */
function buildSuggestionRows(payload) {
  let suggestions =
    "suggestions" in payload.permissionResult ? payload.permissionResult.suggestions : undefined;
  if (!Array.isArray(suggestions) || suggestions.length === 0) return null;
  let D = [];
  let consentSuggestions = parseConsentSuggestions(suggestions, {
    displayedTypes: DISPLAYED_UPDATE_TYPES,
    renderLabel: generateShellSuggestionsLabel,
  });
  if (consentSuggestions !== null) D.push(consentSuggestions);
  let ee = [];
  let ke = false;
  try {
    let He = suggestions.length;
    ke = typeof He === "number" && Number.isSafeInteger(He) && He >= 0 && He <= MAX_CONSENT_RULE_WIDTH;
    if (ke) {
      let We = MAX_CONSENT_RULE_WIDTH * CONSENT_ROW_LIMITS;
      for (let idx = 0; idx < He && ke; idx++)
        try {
          let Xe = suggestions[idx];
          if (Xe === null || typeof Xe !== "object" || Xe.type !== "addDirectories") continue;
          let directories = Xe.directories;
          if (!Array.isArray(directories)) continue;
          let kt = directories.length;
          if (typeof kt !== "number" || !Number.isSafeInteger(kt) || kt < 0) continue;
          We -= kt;
          if (We < 0) {
            ke = false;
            break;
          }
          for (let idx = 0; idx < kt; idx++) ee.push(directories[idx]);
        } catch {}
    }
  } catch {
    ke = false;
  }
  if (ke && ee.length > 0) {
    let modeSuggestions = parseModeSuggestions(ee);
    if (modeSuggestions !== null) D.push(modeSuggestions);
  }
  let [Re, ...Be] = D;
  if (Re === undefined) return null;
  return Be.length === 0 ? Re : combineRows(Re, ...Be);
}
//@ chunk-18hwfzwa.js:1391495-1391665 sole-consumer
function hasBlockingSafetyCheck(payload) {
  let decisionReason =
    payload.permissionResult.behavior === "ask" ? payload.permissionResult.decisionReason : undefined;
  return (
    findSafetyCheckReason(decisionReason, (D) => !D.classifierApprovable) !== undefined ||
    payload.isAskCappedByOrg
  );
}
//@ chunk-18hwfzwa.js:1391665-1391836 sole-consumer
function isSkillInputWithheld(payload) {
  return (
    payload.command?.kind === "withheld" ||
    payload.mcp?.argsDisplay?.kind === "withheld" ||
    payload.ws?.url.kind === "withheld" ||
    (payload.command === undefined && payload.mcp === undefined && payload.ws === undefined)
  );
}
//@ chunk-18hwfzwa.js:1391836-1391890 affinity
function displayTextOf(h) {
  return h.kind === "full" ? h.text : h.marker;
}
//@ chunk-18hwfzwa.js:1391890-1395417 fingerprint = SkillPermissionRequest (0.304)
/**
 * Skill 权限：显示技能名、来源与安全检查，选项允许 / 应用建议规则 / 拒绝。
 */
function SkillPermissionRequest(props) {
  let $ = w(50);
  let { payload, answer } = props;
  let ee;
  if ($[0] !== payload) {
    ee =
      payload.showAlwaysAllow && !hasBlockingSafetyCheck(payload) && !isSkillInputWithheld(payload)
        ? buildSuggestionRows(payload)
        : null;
    $[0] = payload;
    $[1] = ee;
  } else ee = $[1];
  let ke = ee;
  let Re;
  if ($[2] !== answer || $[3] !== payload || $[4] !== ke) {
    Re = (Be, He) => answer(processResponse(Be, payload, ke, He));
    $[2] = answer;
    $[3] = payload;
    $[4] = ke;
    $[5] = Re;
  } else Re = $[5];
  let onSelect = Re;
  let ze;
  if ($[6] !== answer) {
    ze = () =>
      answer({
        behavior: "deny",
      });
    $[6] = answer;
    $[7] = ze;
  } else ze = $[7];
  let onCancel = ze;
  let rt = payload.permissionResult.inPlaceOfClassifier === true;
  let kt;
  if ($[8] === MEMO_CACHE_SENTINEL) {
    kt = {
      label: "No",
      value: "no",
      feedbackConfig: {
        type: "reject",
      },
    };
    $[8] = kt;
  } else kt = $[8];
  let At = kt;
  let It;
  if ($[9] === MEMO_CACHE_SENTINEL) {
    It = {
      label: "Yes",
      value: "yes",
      feedbackConfig: {
        type: "accept",
      },
    };
    $[9] = It;
  } else It = $[9];
  let Ot = It;
  let Et;
  if ($[10] !== rt || $[11] !== ke) {
    Et = rt ? [At, Ot] : [Ot];
    if (ke !== null) {
      let Dt;
      if ($[13] !== ke.node) {
        Dt = {
          label: ke.node,
          value: "yes-apply-suggestions",
        };
        $[13] = ke.node;
        $[14] = Dt;
      } else Dt = $[14];
      Et.push(Dt);
    }
    if (!rt) Et.push(At);
    $[10] = rt;
    $[11] = ke;
    $[12] = Et;
  } else Et = $[12];
  let options = Et;
  const requestSource = payload.requestSource;
  const monitorDescription = payload.monitorDescription ?? "";
  let multiline;
  if ($[15] !== monitorDescription) {
    multiline = needsGutter(monitorDescription);
    $[15] = monitorDescription;
    $[16] = multiline;
  } else multiline = $[16];
  let children;
  if ($[17] !== payload.monitorDescription) {
    children = jsxProd_default(Text, {
      dimColor: true,
      children: payload.monitorDescription,
    });
    $[17] = payload.monitorDescription;
    $[18] = children;
  } else children = $[18];
  let so;
  if ($[19] !== multiline || $[20] !== children) {
    so = jsxProd_default(Box, {
      flexDirection: "column",
      paddingX: 1,
      children: jsxProd_default(Blockquote, {
        multiline,
        children,
      }),
    });
    $[19] = multiline;
    $[20] = children;
    $[21] = so;
  } else so = $[21];
  let children_2;
  if (
    $[22] !== payload.command ||
    $[23] !== payload.intervalMs ||
    $[24] !== payload.mcp ||
    $[25] !== payload.ws
  ) {
    children_2 = payload.mcp
      ? jsxProd_default_2(Fragment, {
          children: [
            jsxProd_default_2(Text, {
              children: [
                "Poll",
                " ",
                jsxProd_default_2(Text, {
                  bold: true,
                  children: [payload.mcp.server, "/", payload.mcp.tool],
                }),
                " ",
                "every ",
                payload.intervalMs / 1000,
                "s",
              ],
            }),
            payload.mcp.argsDisplay !== undefined
              ? jsxProd_default(Blockquote, {
                  multiline: payload.mcp.argsDisplay.kind === "full" && payload.mcp.argsDisplay.needsGutter,
                  children: jsxProd_default_2(Text, {
                    dimColor: true,
                    children: ["args: ", displayTextOf(payload.mcp.argsDisplay)],
                  }),
                })
              : null,
          ],
        })
      : payload.ws
        ? jsxProd_default_2(Fragment, {
            children: [
              jsxProd_default(Blockquote, {
                multiline: payload.ws.url.kind === "full" && payload.ws.url.needsGutter,
                children: jsxProd_default_2(Text, {
                  children: [
                    "Open WebSocket ",
                    jsxProd_default(Text, {
                      bold: true,
                      children: displayTextOf(payload.ws.url),
                    }),
                  ],
                }),
              }),
              payload.ws.protocolsWithheld === true
                ? jsxProd_default_2(Text, {
                    children: [
                      "subprotocols:",
                      " ",
                      jsxProd_default(Text, {
                        bold: true,
                        children: "(cannot be shown in full \u2014 deny unless expected)",
                      }),
                    ],
                  })
                : payload.ws.protocols !== undefined && payload.ws.protocols.length > 0
                  ? jsxProd_default_2(Text, {
                      children: [
                        "subprotocols:",
                        " ",
                        jsxProd_default(Text, {
                          bold: true,
                          children: formatQuotedList(payload.ws.protocols),
                        }),
                      ],
                    })
                  : null,
            ],
          })
        : payload.command
          ? jsxProd_default(Blockquote, {
              multiline: payload.command.kind === "full" && payload.command.needsGutter,
              children: jsxProd_default(Text, {
                children: displayTextOf(payload.command),
              }),
            })
          : null;
    $[22] = payload.command;
    $[23] = payload.intervalMs;
    $[24] = payload.mcp;
    $[25] = payload.ws;
    $[26] = children_2;
  } else children_2 = $[26];
  let ao;
  if ($[27] !== children_2) {
    ao = jsxProd_default(DiffFrame, {
      children: children_2,
    });
    $[27] = children_2;
    $[28] = ao;
  } else ao = $[28];
  let co;
  if ($[29] !== payload.networkAllowHosts) {
    co =
      payload.networkAllowHosts !== undefined &&
      payload.networkAllowHosts.length > 0 &&
      jsxProd_default(Box, {
        marginBottom: 1,
        children: jsxProd_default(sandboxHostsSummary, {
          hosts: payload.networkAllowHosts,
        }),
      });
    $[29] = payload.networkAllowHosts;
    $[30] = co;
  } else co = $[30];
  const toolType = payload.mcp || payload.ws ? "tool" : "command";
  const rowBudget = rt ? MAX_EXPLANATION_LINES : undefined;
  let Bo;
  if ($[31] !== payload.permissionResult || $[32] !== toolType || $[33] !== rowBudget) {
    Bo = jsxProd_default(PermissionRuleExplanation, {
      permissionResult: payload.permissionResult,
      toolType,
      rowBudget,
    });
    $[31] = payload.permissionResult;
    $[32] = toolType;
    $[33] = rowBudget;
    $[34] = Bo;
  } else Bo = $[34];
  let Ro;
  if (
    $[35] !== onCancel ||
    $[36] !== onSelect ||
    $[37] !== rt ||
    $[38] !== options ||
    $[39] !== payload.requestSource
  ) {
    Ro = jsxProd_default(PermissionPrompt, {
      options,
      hideIndexes: rt,
      onSelect,
      onCancel,
      requestSource: payload.requestSource,
    });
    $[35] = onCancel;
    $[36] = onSelect;
    $[37] = rt;
    $[38] = options;
    $[39] = payload.requestSource;
    $[40] = Ro;
  } else Ro = $[40];
  let Ho;
  if ($[41] !== co || $[42] !== Bo || $[43] !== Ro) {
    Ho = jsxProd_default_2(Box, {
      flexDirection: "column",
      paddingX: 1,
      children: [co, Bo, Ro],
    });
    $[41] = co;
    $[42] = Bo;
    $[43] = Ro;
    $[44] = Ho;
  } else Ho = $[44];
  let Io;
  if ($[45] !== payload.requestSource || $[46] !== so || $[47] !== ao || $[48] !== Ho) {
    Io = jsxProd_default_2(PermissionDialog_2, {
      title: MONITOR,
      innerPaddingX: 0,
      requestSource,
      children: [so, ao, Ho],
    });
    $[45] = payload.requestSource;
    $[46] = so;
    $[47] = ao;
    $[48] = Ho;
    $[49] = Io;
  } else Io = $[49];
  return Io;
}
//@ chunk-18hwfzwa.js:1409005-1409162 affinity
function shouldOfferAlwaysAllow(h) {
  let decisionReason = h.permissionResult.decisionReason;
  let D = decisionReason?.type === "safetyCheck" && !decisionReason.classifierApprovable;
  return h.showAlwaysAllow && !D && !h.isAskCappedByOrg;
}
//@ chunk-18hwfzwa.js:1409162-1409256 fingerprint = _temp (0.709)
function shouldOfferExactSkillRule(input) {
  return (
    shouldOfferAlwaysAllow(input) &&
    input.skill !== "" &&
    !input.skill.endsWith(":*") &&
    !input.skill.endsWith(" *")
  );
}
//@ chunk-18hwfzwa.js:1409256-1409319 layout
function shouldOfferPrefixSkillRule(payload) {
  if (!shouldOfferAlwaysAllow(payload)) return false;
  return getSkillCommandPrefix(payload.skill) !== null;
}
//@ chunk-18hwfzwa.js:1409319-1412968 placement
/**
 * skill 使用权限请求对话框。
 */
function SkillUsePermissionDialog({ payload, answer }) {
  let originalCwd = getOriginalCwd();
  let L = Q(
    () => (payload.skillDescription ? displayField(payload.skillDescription) : undefined),
    [payload.skillDescription],
  );
  let ee = Q(() => resolveSkillDisplay(payload), [payload]);
  let ke = ee !== undefined;
  let isScreenReaderEnabled = useIsScreenReaderEnabled();
  let Be = plainDisplay(ee?.name ?? payload.skill);
  let He = Be !== null ? `Use skill "${Be.display}"?` : null;
  let { columns } = useScrollViewportSize(
    Se(TerminalSizeContext) ?? {
      rows: 0,
      columns: 0,
    },
  );
  let ze = He !== null && (!ke || fitsWithMeta(He, payload.requestSource, columns - 2));
  let Xe = ee?.isWithoutSkill === true;
  let calledAs = ee?.calledAs;
  let kt = Xe ? "" : (L?.text ?? "");
  let At = !ke
    ? ""
    : ze || Be === null
      ? kt
      : `"${Be.display}"
${kt}`;
  let decisionReason = payload.permissionResult.decisionReason;
  let reason =
    decisionReason !== undefined && "reason" in decisionReason && typeof decisionReason.reason === "string"
      ? decisionReason.reason
      : "";
  let skillAskRevealMemory = useSkillAskRevealMemory();
  let display = Be?.display ?? "";
  let contentKey = Q(
    () => ({
      shownNameText: display,
      descriptionText: kt,
      reasonText: reason,
    }),
    [display, kt, reason],
  );
  let oo = FittedOfferBody(At, {
    isActive: ke,
    isCut: !isScreenReaderEnabled,
    contentKey,
    keptForRequest: skillAskRevealMemory,
  });
  let Xt = oo.offersStanding && !oo.isStandingHeld;
  let matchedAskRule =
    payload.permissionResult.behavior === "ask" ? payload.permissionResult.matchedAskRule : undefined;
  let so = columns < SKILL_NARROW_COLUMNS;
  let [po, ao] = y(() => skillAskRevealMemory?.has("narrower") ?? false);
  P(() => {
    if (ke && so) ao(true);
  }, [ke, so]);
  zt(() => {
    if (ke && so) skillAskRevealMemory?.keep("narrower");
  }, [ke, so, skillAskRevealMemory]);
  let co = Xt && !so && !po;
  let permissionResult = Q(() => payload.permissionResult, [payload.permissionResult, ke, matchedAskRule]);
  let Ao = Q(() => {
    if (ee !== undefined) return null;
    return shouldOfferExactSkillRule(payload) ? buildSkillExactRule(payload, originalCwd) : null;
  }, [payload, originalCwd, ee, matchedAskRule, co, isScreenReaderEnabled]);
  let Bo = Q(
    () =>
      resolveSkillDisplay(payload) === undefined && shouldOfferPrefixSkillRule(payload)
        ? buildSkillPrefixRule(payload, originalCwd)
        : null,
    [payload, originalCwd],
  );
  let Ro = payload.permissionResult.inPlaceOfClassifier === true;
  let options = Q(() => {
    let mr = {
      label: "No",
      value: "no",
      feedbackConfig: {
        type: "reject",
      },
    };
    let Kn = {
      label: "Yes",
      value: "yes",
      feedbackConfig: {
        type: "accept",
      },
    };
    let Wn = Ro ? [mr, Kn] : [Kn];
    if (Ao !== null) {
      let Fr = ke && !co;
      Wn.push({
        label: Fr ? HIDDEN_EXACT_RULE_LABEL : Ao.node,
        value: "yes-exact",
        disabled: Fr,
      });
    }
    if (Bo !== null)
      Wn.push({
        label: Bo.node,
        value: "yes-prefix",
      });
    if (!Ro) Wn.push(mr);
    return Wn;
  }, [Ao, Bo, Ro, ke, co]);
  let toolAnalyticsContext = Q(
    () => ({
      toolName: sanitizeToolNameForAnalytics(payload.toolName),
      isMcp: payload.isMcp,
    }),
    [payload.toolName, payload.isMcp],
  );
  let [Wo, mn] = y();
  let Cn = undefined;
  let No = Cn === "both" || (Cn === "unread" && SKILL_UNREAD_HINT_ENABLED);
  let vo = !ke || false;
  let Yo = ke && !Xe && oo.isMeasured && !oo.fitsScreen && !isScreenReaderEnabled;
  let [kn, Fn] = y(() => skillAskRevealMemory?.has("hint") ?? false);
  P(() => {
    if (Yo && matchedAskRule !== undefined) Fn(true);
  }, [Yo, matchedAskRule]);
  zt(() => {
    if (Yo && matchedAskRule !== undefined) skillAskRevealMemory?.keep("hint");
  }, [Yo, matchedAskRule, skillAskRevealMemory]);
  let bn = undefined;
  let Go =
    !ke || Xe || No
      ? undefined
      : Cn === "unread"
        ? UNREAD_OFFER_HINT
        : Cn === "cut"
          ? CUT_OFFER_HINT
          : undefined;
  let Mn =
    (Yo ? (Go === undefined && bn !== undefined ? bn.tooShort : TERMINAL_TOO_SHORT_HINT) : Go) ??
    (calledAs === null ? UNREAD_OFFER_HINT : bn !== undefined ? bn.question : undefined);
  let onSelect = (mr, Kn) => {
    if ((mr !== "no" && !vo) || (mr === "yes-exact" && ke && !co)) return false;
    return answer(
      skillChoiceToResult(
        mr,
        payload,
        {
          exactRow: Ao,
          prefixRow: Bo,
        },
        Kn,
      ),
    );
  };
  let onCancel = () =>
    answer({
      behavior: "deny",
    });
  let chord = useShortcutDisplay("app:toggleTranscript", "Global", "ctrl+o");
  let showNextRows = oo.showNextRows;
  let bindings = Q(
    () => [
      {
        action: "app:toggleTranscript",
        run: showNextRows,
      },
    ],
    [showNextRows],
  );
  let cn = ke && (oo.hiddenRows > 0 || oo.hiddenAbove > 0);
  let Dn = ke && columns < NARROW_COLUMNS_WITH_HINTS ? Math.max(1, columns - NARROW_COLUMN_INSET) : undefined;
  let wn = jsxProd_default_2(PermissionDialog_2, {
    title: ze ? He : "Use this skill?",
    innerPaddingX: 0,
    requestSource: payload.requestSource,
    marginTop: ke ? 0 : 1,
    children: [
      jsxProd_default(Box, {
        paddingX: 1,
        children: jsxProd_default(Text, {
          children: "Claude may use instructions, code, or files from this Skill.",
        }),
      }),
      ke
        ? jsxProd_default(DiffFrame, {
            children: jsxProd_default_2(Box, {
              ref: oo.box,
              flexDirection: "column",
              children: [
                jsxProd_default(Blockquote, {
                  multiline: true,
                  children: jsxProd_default(Box, {
                    ref: oo.textBox,
                    flexDirection: "column",
                    flexGrow: 1,
                    children: jsxProd_default(Text, {
                      dimColor: true,
                      children: oo.text,
                    }),
                  }),
                }),
                cn &&
                  jsxProd_default(Text, {
                    dimColor: true,
                    wrap: "truncate-end",
                    children: formatHiddenRowsHint({
                      hiddenRows: oo.hiddenRows,
                      hiddenAbove: oo.hiddenAbove,
                      hint: formatShortcutHint({
                        chord,
                        action: oo.hiddenRows > 0 ? "see more" : "see the first lines",
                        parens: true,
                        format: {
                          keyCase: "lower",
                        },
                      }),
                      columns: oo.columns,
                    }),
                  }),
              ],
            }),
          })
        : L !== undefined
          ? jsxProd_default(DiffFrame, {
              children: jsxProd_default(Blockquote, {
                multiline: L.needsGutter,
                children: jsxProd_default(Text, {
                  dimColor: true,
                  children: L.text,
                }),
              }),
            })
          : null,
      jsxProd_default_2(Box, {
        flexDirection: "column",
        paddingX: 1,
        children: [
          jsxProd_default(PermissionRuleExplanation, {
            permissionResult,
            toolType: "tool",
            rowBudget:
              Dn !== undefined
                ? Math.ceil((MAX_EXPLANATION_LINES * SURVEY_QUESTION_LINE_CHARS) / Dn) + 1
                : ke || Ro
                  ? MAX_EXPLANATION_LINES
                  : undefined,
            rowColumns: Dn,
            hideAskRuleHint: ke && kn,
            onConsentDrawn: ke ? mn : undefined,
          }),
          jsxProd_default(PermissionPrompt, {
            options,
            hideIndexes: Ro,
            onSelect,
            onCancel,
            question: undefined,
            toolAnalyticsContext,
            requestSource: payload.requestSource,
          }),
        ],
      }),
    ],
  });
  return ke
    ? jsxProd_default(useDialogKeybindings, {
        bindings,
        active: cn,
        flexDirection: "column",
        children: wn,
      })
    : wn;
}
//@ chunk-18hwfzwa.js:1412968-1412972 placement
init_react_production();
export { SkillUsePermissionDialog, SkillPermissionRequest };
