/**
 * components/mcp/ElicitationDialog.tsx
 *
 * MCP elicitation 对话框：按服务器给的 JSON Schema 渲染表单（文本/数字/布尔/枚举/日期），提交/拒绝/取消。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/components/mcp/ElicitationDialog.tsx
 * pieces: chunk-18hwfzwa.js (9), chunk-tn4j580p.js (1)
 * attribution: placement 2, fingerprint 6, layout 1, sole-consumer 1
 */
import {
  randomUUID,
  randomUUID as randomUUID_2,
  randomUUID as randomUUID_3,
  randomUUID as randomUUID_4,
  randomUUID as randomUUID_5,
  randomUUID as randomUUID_6,
  randomUUID as randomUUID_7,
  randomUUID as randomUUID_8,
  randomUUID as randomUUID_9,
  randomUUID as randomUUID_10,
  randomUUID as randomUUID_11,
  randomUUID as randomUUID_12,
  randomUUID as randomUUID_13,
  randomUUID as randomUUID_14,
  randomUUID as randomUUID_15,
  randomUUID as randomUUID_16,
  randomUUID as randomUUID_17,
} from "crypto";
import {
  C9,
  yRo,
  restoreElicitationValue,
  zL,
  isEnumSchema,
  isMultiSelectEnumSchema,
  isDateTimeSchema,
  parseElicitationField,
  validateElicitationInputAsync,
  getMultiSelectValues,
  getMultiSelectLabel,
  getEnumValues,
  getEnumLabel,
  ETe,
  bRo,
  wRo,
  QL,
  elicitationUrlCost,
  Pdt,
  Mdt,
} from "../../utils/mcp/elicitationValidation.js";
import { w } from "../../../vendor/react/compiler-runtime.js";
import { usePrefersReducedMotion } from "../Spinner/spinnerFlags.js";
import { useIsScreenReaderEnabled } from "../../ink/components/ErrorBoundary.js";
import { useAnimationFrame, useInputClock } from "../../ink/components/Input.js";
import { e, r, Fragment } from "../../../vendor/react/cjs/react-jsx-dev-runtime.react-server.production.js";
import { Text, Box } from "../../ink/components/Text.js";
import { jsonStringify } from "../../utils/slowOperations.js";
import { logForDebugging } from "../../utils/debug.js";
import { errorMessage } from "../../utils/errors.js";
import { y, Se, R, NSe, zt, Q, P, ce } from "../../../vendor/react/cjs/react.production.js";
import { isWithinRecentInput, INPUT_SETTLE_MS } from "../../hooks/useRecentInputGuard.js";
import { useClock } from "../../ink/components/ClockContext.js";
import { kp } from "../../../vendor/convert-to-spaces/dist/index.js";
import { Me, useStdin } from "../design-system/ThemeProvider.js";
import {
  labelOrEmpty,
  displayField,
  serializeApprovalPayload,
  MAX_PAYLOAD_UNITS,
  hasDisplayUnsafeChar,
  markBrokenSequences,
  replaceLineBreaks,
  stripUnsafeChars,
} from "../../utils/permissions/approvalPayloadSerialization.js";
import { truncateToLength, plural, countCharInString } from "../../utils/stringUtils.js";
import {
  hasPluginUserConfig,
  sLo,
  isPluginPasswordField,
} from "../../plugins/bundled/claudeTest/userConfig.js";
import { env } from "../../utils/env.js";
import { useLatestState } from "../CustomSelect/option-map.js";
import { useTerminalSize } from "../../hooks/useTerminalSize.js";
import { useScrollViewportSize, Tl } from "../ScrollViewportContext.js";
import { useRegisterOverlay, WWe } from "../../context/overlayContext.js";
import { useKeybinding } from "../../keybindings/useKeybinding.js";
import { isTextInputKey } from "../../ink/events/input-event.js";
import { useUnattendedNotice } from "../permissions/UnattendedAutoBlockNotice.js";
import { isFullscreenActive } from "../../utils/fullscreen.js";
import {
  isFlagOnWithInternalOverride,
  TENGU_AMBER_QUILLWORT,
} from "../../services/analytics/flagOverrides.js";
import { V3, truncateLines, zh, max } from "../PromptInput/promptInputState.js";
import { bunStringWidth } from "../../ink/stringWidth.js";
import { truncateToWidth } from "../../utils/format.js";
import { Dialog } from "../design-system/Dialog.js";
import { Byline } from "../design-system/Byline.js";
import { ConfigurableShortcutHint } from "../ConfigurableShortcutHint.js";
import { KeyboardShortcutHint } from "../design-system/KeyboardShortcutHint.js";
import { FocusColumn } from "../design-system/FocusColumn.js";
import { re } from "../../../vendor/@inquirer/figures/dist/esm/index.js";
import { v$t } from "../permissions/permissionCardKinds.js";
import { wrapText } from "../../ink/wrap-text.js";
import { _xo } from "./_new/ElicitationDialog.helpers-18hw.js";
import { fi } from "../../utils/browser.js";
import { flipElicitationAction } from "../../entrypoints/sdk/controlSchemas.js";
import { MEMO_CACHE_SENTINEL } from "../../../runtime/bun-runtime.js";
import { Blockquote } from "../Blockquote.js";
import { TextInput } from "../TextInput.js";

/**
 * JSON schema 的 required 里只保留 properties 中确实存在的字段名。旧版名 filterSwarmFieldsFromSchema 为错配。
 */
//@ chunk-18hwfzwa.js:1205190-1205353 placement = filterSwarmFieldsFromSchema (0.664)
function getDeclaredRequiredFields(h) {
  let x = h?.required;
  if (!Array.isArray(x)) return [];
  let D = new Set(C9(h?.properties).map(([L]) => L));
  return x.filter((L) => typeof L === "string" && D.has(L));
}
//@ chunk-18hwfzwa.js:1206341-1206411 fingerprint = RESOLVING_SPINNER_CHARS (1)
var RESOLVING_SPINNER_CHARS = "\u280B\u2819\u2839\u2838\u283C\u2834\u2826\u2827\u2807\u280F";
/**
 * 解析中的旋转指示（减少动态效果或读屏时静止）。
 */
//@ chunk-18hwfzwa.js:1206411-1206722 layout
function ResolvingSpinner() {
  let $ = w(5),
    h = usePrefersReducedMotion(),
    x = useIsScreenReaderEnabled(),
    [D, L] = useAnimationFrame(h || x ? null : 80),
    ee = Math.floor(L / 80) % RESOLVING_SPINNER_CHARS.length;
  const ke = RESOLVING_SPINNER_CHARS[ee];
  let Be;
  if ($[0] !== ke) ((Be = e(Text, { color: "warning", children: ke })), ($[0] = ke), ($[1] = Be));
  else Be = $[1];
  let He;
  if ($[2] !== D || $[3] !== Be)
    ((He = e(Box, { ref: D, children: Be })), ($[2] = D), ($[3] = Be), ($[4] = He));
  else He = $[4];
  return He;
}
//@ chunk-18hwfzwa.js:1206722-1207211 fingerprint = formatDateDisplay (1)
function formatDateDisplay(isoValue, schema) {
  try {
    let date = new Date(isoValue);
    if (Number.isNaN(date.getTime())) return isoValue;
    if (("format" in schema ? schema.format : void 0) === "date-time")
      return date.toLocaleDateString("en-US", {
        weekday: "short",
        year: "numeric",
        month: "short",
        day: "numeric",
        hour: "numeric",
        minute: "2-digit",
        timeZoneName: "short",
      });
    let parts = isoValue.split("-");
    if (parts.length === 3)
      return new Date(Number(parts[0]), Number(parts[1]) - 1, Number(parts[2])).toLocaleDateString("en-US", {
        weekday: "short",
        year: "numeric",
        month: "short",
        day: "numeric",
      });
    return isoValue;
  } catch {
    return isoValue;
  }
}
/**
 * MCP elicitation：form 模式按 requestedSchema 渲染字段（校验、日期格式化），URL 模式打开链接并等待；结果 accept/decline/cancel 回传服务器。
 */
//@ chunk-18hwfzwa.js:1207211-1209040 fingerprint = ElicitationDialog (0.354)
function ElicitationDialog(t0) {
  let $ = w(28),
    {
      serverName: serverName,
      pluginSource: pluginSource,
      params: params,
      onResponse: onResponse,
      waitingState: waitingState,
      initialPhase: initialPhase,
      onWaitingDismiss: onWaitingDismiss,
      userConfirmsCompletion: userConfirmsCompletion,
      wouldTakeAnswer: wouldTakeAnswer,
    } = t0,
    ze = useInputClock(),
    Xe;
  if (
    $[0] !== params.elicitationId ||
    $[1] !== params.message ||
    $[2] !== params.mode ||
    $[3] !== params.requestedSchema ||
    $[4] !== params.url
  ) {
    kt: {
      if (params.mode === "url") {
        Xe = `url
${params.elicitationId}
${params.url}
${params.message}`;
        break kt;
      }
      try {
        Xe = `form
${params.message}
${jsonStringify(params.requestedSchema)}`;
      } catch (error) {
        let It = error;
        Xe =
          (logForDebugging(
            `MCP elicitation requestedSchema could not be turned into JSON; each new payload counts as a new question: ${errorMessage(It)}`,
          ),
          `form
${randomUUID_11()}`);
      }
    }
    (($[0] = params.elicitationId),
      ($[1] = params.message),
      ($[2] = params.mode),
      ($[3] = params.requestedSchema),
      ($[4] = params.url),
      ($[5] = Xe));
  } else Xe = $[5];
  let Ot = Xe,
    At;
  if ($[6] !== Ot) ((At = () => ({ key: Ot, at: Date.now(), generation: 0 })), ($[6] = Ot), ($[7] = At));
  else At = $[7];
  let [Et, Dt] = y(At);
  if (Et.key !== Ot) Dt({ key: Ot, at: Date.now(), generation: Et.generation + 1 });
  let at = Et.at,
    oo;
  if ($[8] !== ze || $[9] !== at || $[10] !== onResponse)
    ((oo = (...Xt) => {
      let io = Xt;
      if (io[0] !== "cancel" && isWithinRecentInput(ze, at)) {
        return !1;
      }
      return onResponse(...io);
    }),
      ($[8] = ze),
      ($[9] = at),
      ($[10] = onResponse),
      ($[11] = oo));
  else oo = $[11];
  let so = oo;
  if (params.mode === "url") {
    const Xt = initialPhase ?? "prompt";
    const po = userConfirmsCompletion ?? !1;
    let ao;
    if (
      $[12] !== Et.generation ||
      $[13] !== so ||
      $[14] !== onWaitingDismiss ||
      $[15] !== params ||
      $[16] !== serverName ||
      $[17] !== Xt ||
      $[18] !== po ||
      $[19] !== waitingState ||
      $[20] !== wouldTakeAnswer
    )
      ((ao = e(
        ElicitationURLDialog,
        {
          serverName: serverName,
          params: params,
          onResponse: so,
          waitingState: waitingState,
          initialPhase: Xt,
          onWaitingDismiss: onWaitingDismiss,
          userConfirmsCompletion: po,
          wouldTakeAnswer: wouldTakeAnswer,
        },
        Et.generation,
      )),
        ($[12] = Et.generation),
        ($[13] = so),
        ($[14] = onWaitingDismiss),
        ($[15] = params),
        ($[16] = serverName),
        ($[17] = Xt),
        ($[18] = po),
        ($[19] = waitingState),
        ($[20] = wouldTakeAnswer),
        ($[21] = ao));
    else ao = $[21];
    return ao;
  }
  let Xt;
  if (
    $[22] !== Et.generation ||
    $[23] !== so ||
    $[24] !== params ||
    $[25] !== pluginSource ||
    $[26] !== serverName
  )
    ((Xt = e(
      ElicitationFormDialog,
      { serverName: serverName, pluginSource: pluginSource, params: params, onResponse: so },
      Et.generation,
    )),
      ($[22] = Et.generation),
      ($[23] = so),
      ($[24] = params),
      ($[25] = pluginSource),
      ($[26] = serverName),
      ($[27] = Xt));
  else Xt = $[27];
  return Xt;
}
/**
 * 防误触：对话框刚出现或用户刚在打字时，短时间内拒绝按键提交；返回 {arrived, typed, refuses}。
 */
//@ chunk-18hwfzwa.js:1209040-1209724 sole-consumer
function useInputGuard(h) {
  let x = useInputClock(),
    D = useClock(),
    { subscribeFrames: subscribeFrames } = Se(kp),
    ee = R(null),
    ke = R(!1),
    Re = R(!1),
    Be = R(null),
    He = R(() => {
      if (ke.current || !Re.current) return;
      if (((ke.current = !0), We.current?.(), h || ee.current !== null)) ee.current = Date.now();
    }),
    We = R(null);
  if (We.current === null && !ke.current) We.current = subscribeFrames(() => He.current());
  return (
    NSe(() => {
      Re.current = !0;
    }, []),
    zt(() => {
      let ze = D.setTimeout(He.current, yRo);
      return () => {
        (ze(), We.current?.());
      };
    }, [D]),
    {
      arrived: () => {
        ee.current = Date.now();
      },
      typed: () => {
        Be.current = Date.now();
      },
      refuses: () => {
        if (!ke.current) return !0;
        let ze = Be.current;
        if (ze !== null && isWithinRecentInput(x, ze, INPUT_SETTLE_MS))
          return ((Be.current = Date.now()), !0);
        let Xe = ee.current;
        if (Xe === null || !isWithinRecentInput(x, Xe)) return !1;
        return ((ee.current = Date.now()), !0);
      },
    }
  );
}
//@ chunk-18hwfzwa.js:1209978-1220738 fingerprint = ElicitationFormDialog (0.541)
function ElicitationFormDialog({
  serverName: serverName,
  pluginSource: pluginSource,
  params: params,
  onResponse: onResponse,
}) {
  let { message: message, requestedSchema: requestedSchema } = params,
    { credentials: credentials } = Me(),
    { parseRelatedTaskMetadata: parseRelatedTaskMetadata } =
      require("./chunk-asne9cp8.js").mcpElicitationHandlerModule(),
    He = parseRelatedTaskMetadata(params._meta),
    We = He ? ` (task ${labelOrEmpty(truncateToLength(He.taskId, 8))})` : "",
    ze = C9(requestedSchema?.properties).length > 0,
    Xe = !ze && hasPluginUserConfig(serverName, pluginSource) && env.CLAUDE_CODE_CONSENT_POINTERLESS,
    [rt, kt, At] = useLatestState(ze || Xe ? null : "accept"),
    It = useInputGuard(!ze && !Xe),
    Ot = Q(() => {
      let kr = {},
        ls = {};
      for (let [Ms, qs] of C9(requestedSchema?.properties)) {
        let validation = restoreElicitationValue(qs, qs.default);
        if (validation === void 0) continue;
        if (((kr[Ms] = validation.value), validation.error !== void 0)) ls[Ms] = validation.error;
      }
      return { values: kr, errors: ls };
    }, [requestedSchema]),
    [Et, Dt] = y(() => Ot.values),
    [Lt, oo] = y(() => Ot.errors),
    { setRawMode: setRawMode } = useStdin();
  zt(() => (setRawMode(!0), () => setRawMode(!1)), [setRawMode]);
  let schemaFields = Q(() => {
      let kr = getDeclaredRequiredFields(requestedSchema);
      return C9(requestedSchema?.properties).map(([ls, Ms]) => ({
        name: ls,
        schema: Ms,
        isRequired: kr.includes(ls),
      }));
    }, [requestedSchema]),
    [so, po] = y(ze ? 0 : void 0),
    [ao, co] = y(() => {
      let kr = schemaFields[0];
      if (kr && zL(kr.schema)) {
        let ls = Et[kr.name];
        if (ls === void 0) return "";
        return String(ls);
      }
      return "";
    }),
    [bo, Ao] = y(ao.length),
    [Bo, Ro] = y(() => new Set()),
    [Ho, Io] = y(),
    [Wo, mn] = y(0),
    Cn = useClock(),
    dateDebounceRef = R(void 0),
    resolveAbortRef = R(new Map()),
    enumTypeaheadRef = R({ buffer: "", timer: void 0 });
  P(
    () => () => {
      if (dateDebounceRef.current !== void 0) dateDebounceRef.current();
      let ta = enumTypeaheadRef.current;
      if (ta.timer !== void 0) ta.timer();
      for (let controller of resolveAbortRef.current.values()) controller.abort();
      resolveAbortRef.current.clear();
    },
    [],
  );
  let kn = useTerminalSize(),
    { columns: columns } = kn,
    { rows: rows } = useScrollViewportSize(kn),
    Go = so !== void 0 ? schemaFields[so] : void 0,
    Mn = Go !== void 0 && zL(Go.schema) && !isEnumSchema(Go.schema) && !rt;
  useRegisterOverlay("elicitation");
  let syncTextInput = ce(
    (fieldIndex) => {
      if (fieldIndex === void 0) {
        (co(""), Ao(0));
        return;
      }
      let ls = schemaFields[fieldIndex];
      if (ls && zL(ls.schema) && !isEnumSchema(ls.schema)) {
        let Ms = Et[ls.name],
          qs = Ms !== void 0 ? String(Ms) : "";
        (co(qs), Ao(qs.length));
      }
    },
    [schemaFields, Et],
  );
  function Sn(kr, ls, Ms, qs) {
    if (!isMultiSelectEnumSchema(ls)) return;
    let { minItems: minItems, maxItems: maxItems } = ls;
    if (minItems !== void 0 && Ms.length < minItems && (Ms.length > 0 || qs))
      updateValidationError(kr, `Select at least ${minItems} ${plural(minItems, "item")}`);
    else if (maxItems !== void 0 && Ms.length > maxItems)
      updateValidationError(kr, `Select at most ${maxItems} ${plural(maxItems, "item")}`);
    else updateValidationError(kr);
  }
  function handleNavigation(direction) {
    if (Go && isMultiSelectEnumSchema(Go.schema))
      (Sn(
        Go.name,
        Go.schema,
        (() => {
          let es = Et[Go.name];
          return Array.isArray(es) ? es : [];
        })(),
        Go.isRequired,
      ),
        Io(void 0));
    else if (Go && isEnumSchema(Go.schema)) Io(void 0);
    if (Mn && Go) {
      if ((commitTextField(Go.name, Go.schema, ao), dateDebounceRef.current !== void 0))
        (dateDebounceRef.current(), (dateDebounceRef.current = void 0));
      if (isDateTimeSchema(Go.schema) && ao.trim() !== "" && Lt[Go.name])
        resolveFieldAsync(Go.name, Go.schema, ao);
    }
    let ls = schemaFields.length + 2,
      Ms = At(),
      qs =
        so ?? (Ms === "accept" ? schemaFields.length : Ms === "decline" ? schemaFields.length + 1 : void 0),
      gs = qs !== void 0 ? (qs + (direction === "up" ? ls - 1 : 1)) % ls : 0;
    if (gs < schemaFields.length) (po(gs), kt(null), syncTextInput(gs));
    else {
      let es = gs === schemaFields.length ? "accept" : "decline";
      if (es === "accept") It.arrived();
      (po(void 0), kt(es), co(""));
    }
  }
  function setField(fieldName_0, value) {
    if (
      (Dt((prev) => {
        let next = { ...prev };
        if (value === void 0) delete next[fieldName_0];
        else next[fieldName_0] = value;
        return next;
      }),
      value !== void 0 && Lt[fieldName_0] === "This field is required")
    )
      updateValidationError(fieldName_0);
  }
  function updateValidationError(fieldName_1, error) {
    oo((prev_0) => {
      let next_0 = { ...prev_0 };
      if (error) next_0[fieldName_1] = error;
      else delete next_0[fieldName_1];
      return next_0;
    });
  }
  function unsetField(fieldName_2) {
    if (!fieldName_2) return;
    (setField(fieldName_2, void 0), updateValidationError(fieldName_2), co(""), Ao(0));
  }
  function commitTextField(fieldName_3, schema_1, value_0) {
    let validation_0 = parseElicitationField(schema_1, value_0);
    if (validation_0.kind === "unset") {
      unsetField(fieldName_3);
      return;
    }
    if (validation_0.kind === "keepEmptyIfSet") {
      if (Et[fieldName_3] !== void 0) setField(fieldName_3, "");
      return;
    }
    (setField(fieldName_3, validation_0.value), updateValidationError(fieldName_3, validation_0.error));
  }
  function resolveFieldAsync(fieldName_4, schema_2, rawValue) {
    let existing = resolveAbortRef.current.get(fieldName_4);
    if (existing) existing.abort();
    let controller_0 = new AbortController();
    (resolveAbortRef.current.set(fieldName_4, controller_0),
      Ro((prev_1) => new Set(prev_1).add(fieldName_4)),
      validateElicitationInputAsync(rawValue, schema_2, controller_0.signal, credentials).then(
        (result) => {
          if (
            (resolveAbortRef.current.delete(fieldName_4),
            Ro((prev_2) => {
              let next_1 = new Set(prev_2);
              return (next_1.delete(fieldName_4), next_1);
            }),
            controller_0.signal.aborted)
          )
            return;
          if (result.isValid) {
            (setField(fieldName_4, result.value), updateValidationError(fieldName_4));
            let isoText = String(result.value);
            co((prev_3) => {
              if (prev_3 === rawValue) return (Ao(isoText.length), isoText);
              return prev_3;
            });
          } else updateValidationError(fieldName_4, result.error);
        },
        () => {
          (resolveAbortRef.current.delete(fieldName_4),
            Ro((prev_4) => {
              let next_2 = new Set(prev_4);
              return (next_2.delete(fieldName_4), next_2);
            }));
        },
      ));
  }
  function handleTextInputChange(newValue) {
    if ((co(newValue), Go)) {
      if ((commitTextField(Go.name, Go.schema, newValue), dateDebounceRef.current !== void 0))
        (dateDebounceRef.current(), (dateDebounceRef.current = void 0));
      if (isDateTimeSchema(Go.schema) && newValue.trim() !== "" && Lt[Go.name]) {
        let { name: ls, schema: schema } = Go;
        dateDebounceRef.current = Cn.setTimeout(() => {
          ((dateDebounceRef.current = void 0), resolveFieldAsync(ls, schema, newValue));
        }, 2000);
      }
    }
  }
  function handleTextInputSubmit() {
    handleNavigation("down");
  }
  function runTypeahead(char, labels, onMatch) {
    let ta_0 = enumTypeaheadRef.current;
    if (ta_0.timer !== void 0) ta_0.timer();
    ((ta_0.buffer += char.toLowerCase()),
      (ta_0.timer = Cn.setTimeout(() => {
        ((ta_0.buffer = ""), (ta_0.timer = void 0));
      }, 2000)));
    let match = labels.findIndex((es) => es.startsWith(ta_0.buffer));
    if (match !== -1) onMatch(match);
  }
  useKeybinding(
    "confirm:no",
    () => {
      if (Mn && Go) {
        let kr = Et[Go.name];
        (co(kr !== void 0 ? String(kr) : ""), Ao(0));
      }
      onResponse("cancel");
    },
    { context: "Settings", isActive: !!Go && !rt && !Ho },
  );
  function Fr(kr) {
    let ls = kr.key.length === 1 && kr.key !== " " && !kr.ctrl && !kr.meta ? kr.key : "";
    if (Mn && kr.key !== "up" && kr.key !== "down" && kr.key !== "return" && kr.key !== "backspace") return;
    if (Ho && Go && isMultiSelectEnumSchema(Go.schema)) {
      let msSchema = Go.schema,
        msValues = getMultiSelectValues(msSchema),
        _s = Et[Go.name],
        fs = Array.isArray(_s) ? _s : [];
      if (kr.key === "left" || kr.key === "escape") {
        (kr.preventDefault(), Io(void 0), Sn(Go.name, msSchema, fs, Go.isRequired));
        return;
      }
      if (kr.key === "up") {
        if ((kr.preventDefault(), Wo === 0)) (Io(void 0), Sn(Go.name, msSchema, fs, Go.isRequired));
        else mn(Wo - 1);
        return;
      }
      if (kr.key === "down") {
        if ((kr.preventDefault(), Wo >= msValues.length - 1)) (Io(void 0), handleNavigation("down"));
        else mn(Wo + 1);
        return;
      }
      if (kr.key === " ") {
        kr.preventDefault();
        let ii = msValues[Wo];
        if (ii !== void 0) {
          let ua = fs.includes(ii) ? fs.filter((Xa) => Xa !== ii) : [...fs, ii],
            La = ua.length > 0 ? ua : void 0;
          (setField(Go.name, La), Sn(Go.name, msSchema, ua, Go.isRequired));
        }
        return;
      }
      if (kr.key === "return") {
        kr.preventDefault();
        let ii = msValues[Wo];
        if (ii !== void 0 && !fs.includes(ii)) setField(Go.name, [...fs, ii]);
        (Io(void 0), handleNavigation("down"));
        return;
      }
      if (ls) {
        kr.preventDefault();
        let labels_0 = msValues.map((v_0) => labelOrEmpty(getMultiSelectLabel(msSchema, v_0)).toLowerCase());
        runTypeahead(ls, labels_0, mn);
        return;
      }
      return;
    }
    if (Ho && Go && isEnumSchema(Go.schema)) {
      let enumSchema = Go.schema,
        enumValues = getEnumValues(enumSchema);
      if (kr.key === "left" || kr.key === "escape") {
        (kr.preventDefault(), Io(void 0));
        return;
      }
      if (kr.key === "up") {
        if ((kr.preventDefault(), Wo === 0)) Io(void 0);
        else mn(Wo - 1);
        return;
      }
      if (kr.key === "down") {
        if ((kr.preventDefault(), Wo >= enumValues.length - 1)) (Io(void 0), handleNavigation("down"));
        else mn(Wo + 1);
        return;
      }
      if (kr.key === " ") {
        kr.preventDefault();
        let _s = enumValues[Wo];
        if (_s !== void 0) setField(Go.name, _s);
        Io(void 0);
        return;
      }
      if (kr.key === "return") {
        kr.preventDefault();
        let _s = enumValues[Wo];
        if (_s !== void 0) setField(Go.name, _s);
        (Io(void 0), handleNavigation("down"));
        return;
      }
      if (ls) {
        kr.preventDefault();
        let labels_1 = enumValues.map((v_1) => labelOrEmpty(getEnumLabel(enumSchema, v_1)).toLowerCase());
        runTypeahead(ls, labels_1, mn);
        return;
      }
      return;
    }
    let Ms = rt ? At() : null;
    if (kr.key === "return" && Ms === "accept") {
      if ((kr.preventDefault(), validateRequired() && Object.keys(Lt).length === 0)) {
        if (It.refuses()) return;
        onResponse("accept", Et);
      } else {
        let ds = getDeclaredRequiredFields(requestedSchema);
        for (let fieldName_7 of ds)
          if (ETe(Et[fieldName_7])) updateValidationError(fieldName_7, "This field is required");
        let firstBadIndex = schemaFields.findIndex(
          (f_0) => (ds.includes(f_0.name) && ETe(Et[f_0.name])) || Lt[f_0.name] !== void 0,
        );
        if (firstBadIndex !== -1) (po(firstBadIndex), kt(null), syncTextInput(firstBadIndex));
      }
      return;
    }
    if (kr.key === "return" && Ms === "decline") {
      (kr.preventDefault(), onResponse("decline"));
      return;
    }
    if (kr.key === "up" || kr.key === "down") {
      kr.preventDefault();
      let ta_1 = enumTypeaheadRef.current;
      if (((ta_1.buffer = ""), ta_1.timer !== void 0)) (ta_1.timer(), (ta_1.timer = void 0));
      handleNavigation(kr.key === "up" ? "up" : "down");
      return;
    }
    if (rt && (kr.key === "left" || kr.key === "right")) {
      if ((kr.preventDefault(), At() === "decline")) It.arrived();
      kt((ds) => (ds === "accept" ? "decline" : ds === "decline" ? "accept" : ds));
      return;
    }
    if (!ze && At() === null && (kr.key === "left" || kr.key === "right")) {
      (kr.preventDefault(), It.arrived(), kt("accept"));
      return;
    }
    if (!Go) {
      if (isTextInputKey(kr)) It.typed();
      return;
    }
    let { schema: schema_5, name: name_0 } = Go,
      es = Et[name_0];
    if (schema_5.type === "boolean") {
      if (kr.key === " ") {
        (kr.preventDefault(), setField(name_0, es === void 0 ? !0 : !es));
        return;
      }
      if (kr.key === "return") {
        (kr.preventDefault(), handleNavigation("down"));
        return;
      }
      if (kr.key === "backspace" && es !== void 0) {
        (kr.preventDefault(), unsetField(name_0));
        return;
      }
      if (ls && kr.key !== "return") {
        (kr.preventDefault(), runTypeahead(ls, ["yes", "no"], (ds) => setField(name_0, ds === 0)));
        return;
      }
      return;
    }
    if (isEnumSchema(schema_5) || isMultiSelectEnumSchema(schema_5)) {
      if (kr.key === "return") {
        (kr.preventDefault(), handleNavigation("down"));
        return;
      }
      if (kr.key === "backspace" && es !== void 0) {
        (kr.preventDefault(), unsetField(name_0));
        return;
      }
      let ds,
        startIdx = 0;
      if (isEnumSchema(schema_5)) {
        let vals = getEnumValues(schema_5);
        if (
          ((ds = vals.map((v_2) => labelOrEmpty(getEnumLabel(schema_5, v_2)).toLowerCase())), es !== void 0)
        )
          startIdx = Math.max(0, vals.indexOf(es));
      } else
        ds = getMultiSelectValues(schema_5).map((v_3) =>
          labelOrEmpty(getMultiSelectLabel(schema_5, v_3)).toLowerCase(),
        );
      if (kr.key === "right") {
        (kr.preventDefault(), Io(name_0), mn(startIdx));
        return;
      }
      if (ls && kr.key !== "left") {
        (kr.preventDefault(),
          runTypeahead(ls, ds, (i_0) => {
            (Io(name_0), mn(i_0));
          }));
        return;
      }
      return;
    }
    if (kr.key === "backspace") {
      if (Mn && ao === "") {
        (kr.preventDefault(), unsetField(name_0));
        return;
      }
    }
  }
  function validateRequired() {
    let kr = getDeclaredRequiredFields(requestedSchema);
    for (let fieldName_8 of kr) if (ETe(Et[fieldName_8])) return !1;
    return !0;
  }
  let Un = Tl(),
    dr = useUnattendedNotice(),
    or = isFullscreenActive(),
    pr = 2,
    Qn = or ? (Un ? rows : rows - WWe - pr - dr) : rows,
    ur = 5,
    Ir = 2,
    LINES_PER_FIELD = 3,
    ts = or ? (Qn >= 18 ? 1 : 0) : 1,
    Gn = schemaFields.length > 1 ? Ir : 0,
    Ur = sLo(serverName, pluginSource),
    Zr = Ur !== void 0 && isFlagOnWithInternalOverride(TENGU_AMBER_QUILLWORT) ? Ur : void 0,
    wr = Zr !== void 0 ? bRo : V3 + 1,
    min = Math.min(wr, Math.max(1, Qn - ur - ts - Gn - Math.min(2, schemaFields.length) * LINES_PER_FIELD)),
    maxVisibleFields = Math.max(1, Qn - ur - ts - Gn - Math.min(1, schemaFields.length) * LINES_PER_FIELD),
    fr = or
      ? Math.min(min, maxVisibleFields)
      : Zr === void 0
        ? wr
        : Math.max(V3 + 1, Math.min(min, maxVisibleFields - pr)),
    scrollWindow = Q(() => truncateLines(displayField(message).text, columns, fr), [message, columns, fr]),
    Yr = scrollWindow
      ? ts
        ? `
${scrollWindow}`
        : scrollWindow
      : void 0,
    Er = scrollWindow
      ? ts +
        countCharInString(
          scrollWindow,
          `
`,
        ) +
        1
      : 0,
    Vr = Qn - ur - Er - Gn,
    ms = Ho !== void 0 ? schemaFields.find((kr) => kr.name === Ho) : void 0,
    Xs = ms
      ? isMultiSelectEnumSchema(ms.schema)
        ? getMultiSelectValues(ms.schema).length
        : isEnumSchema(ms.schema)
          ? getEnumValues(ms.schema).length
          : 0
      : 0,
    Ls = Vr - LINES_PER_FIELD,
    is = Q(() => {
      if (!or || Xs <= Ls) return null;
      let max = Math.max(1, Ls),
        max_2 = Math.max(1, max - 2),
        start = Math.max(0, Wo - Math.floor(max_2 / 2)),
        end = Math.min(start + max_2, Xs);
      start = Math.max(0, end - max_2);
      let gs = start > 0,
        es = end < Xs,
        ds = end - start + (gs ? 1 : 0) + (es ? 1 : 0) - max;
      if (ds > 0 && gs) ((gs = !1), ds--);
      if (ds > 0) es = !1;
      return { start: start, end: end, showAbove: gs, showBelow: es };
    }, [or, Xs, Ls, Wo]),
    ws =
      !or || Xs === 0
        ? 0
        : is === null
          ? Xs
          : is.end - is.start + (is.showAbove ? 1 : 0) + (is.showBelow ? 1 : 0),
    oi = or
      ? Math.max(1, Math.floor((Vr - ws) / LINES_PER_FIELD))
      : Math.max(2, Math.floor((rows - 14) / LINES_PER_FIELD)),
    Oi = Q(() => {
      let kr = schemaFields.length;
      if (kr <= oi) return { start: 0, end: kr };
      let ls = so ?? kr - 1,
        max = Math.max(0, ls - Math.floor(oi / 2)),
        min = Math.min(max + oi, kr);
      return ((max = Math.max(0, min - oi)), { start: max, end: min });
    }, [schemaFields.length, oi, so]),
    Hi = "MCP server \u201C",
    Zi = "\u201D requests your input",
    max_2 = Math.max(zh, columns - max),
    qn = max_2 - bunStringWidth(Hi) - bunStringWidth(`${Zi}${We}`) >= wRo ? `${Zi}${We}` : Zi,
    ps = or
      ? truncateToWidth(
          Hi +
            truncateToWidth(QL(serverName), Math.max(1, max_2 - bunStringWidth(Hi) - bunStringWidth(qn))) +
            qn,
          max_2,
        )
      : `${Hi}${QL(serverName)}${Zi}${We}`,
    xs = Zr === void 0 ? ps : truncateToWidth(Zr, max_2);
  return e(Dialog, {
    title: xs,
    subtitle: Yr,
    color: "permission",
    onCancel: () => onResponse("cancel"),
    isCancelActive: (!Go || !!rt) && !Ho,
    inputGuide: r(Byline, {
      children: [
        e(ConfigurableShortcutHint, {
          action: "confirm:no",
          context: "Confirmation",
          fallback: "Esc",
          description: "cancel",
        }),
        e(KeyboardShortcutHint, { chord: ["up", "down"], action: "navigate" }),
        Go && e(KeyboardShortcutHint, { chord: "backspace", action: "unset" }),
        Go && Go.schema.type === "boolean" && e(KeyboardShortcutHint, { chord: "space", action: "toggle" }),
        Go &&
          isEnumSchema(Go.schema) &&
          (Ho
            ? e(KeyboardShortcutHint, { chord: "space", action: "select" })
            : e(KeyboardShortcutHint, { chord: "right", action: "expand" })),
        Go &&
          isMultiSelectEnumSchema(Go.schema) &&
          (Ho
            ? e(KeyboardShortcutHint, { chord: "space", action: "toggle" })
            : e(KeyboardShortcutHint, { chord: "right", action: "expand" })),
      ],
    }),
    children: r(FocusColumn, {
      onKeyDown: Fr,
      children: [
        e(ElicitationForm, {
          schemaFields: schemaFields,
          scrollWindow: Oi,
          currentFieldIndex: so,
          focusedButton: rt,
          formValues: Et,
          validationErrors: Lt,
          resolvingFields: Bo,
          expandedAccordion: Ho,
          accordionOptionIndex: Wo,
          optionWindow: is,
          clampFieldRows: or,
          textInputValue: ao,
          textInputCursorOffset: bo,
          setTextInputCursorOffset: Ao,
          handleTextInputChange: handleTextInputChange,
          handleTextInputSubmit: handleTextInputSubmit,
          columns: columns,
          serverName: serverName,
          pluginSource: pluginSource,
        }),
        r(Box, {
          children: [
            r(Box, {
              flexShrink: 0,
              children: [
                e(Text, { color: "success", children: rt === "accept" ? re.pointer : " " }),
                e(Text, {
                  bold: rt === "accept",
                  color: rt === "accept" ? "success" : void 0,
                  dimColor: rt !== "accept",
                  children: " Accept  ",
                }),
                e(Text, { color: "error", children: rt === "decline" ? re.pointer : " " }),
                e(Text, {
                  bold: rt === "decline",
                  color: rt === "decline" ? "error" : void 0,
                  dimColor: rt !== "decline",
                  children: " Decline",
                }),
              ],
            }),
            Xe &&
              rt === null &&
              e(Text, { dimColor: !0, wrap: "truncate-end", children: "   (press an arrow key to choose)" }),
          ],
        }),
      ],
    }),
  });
}
//@ chunk-18hwfzwa.js:1220738-1231333 fingerprint = ElicitationURLDialog (0.683)
function ElicitationURLDialog(h) {
  let $ = w(163),
    {
      serverName: serverName,
      params: params,
      onResponse: onResponse,
      waitingState: waitingState,
      initialPhase: initialPhase,
      onWaitingDismiss: onWaitingDismiss,
      userConfirmsCompletion: userConfirmsCompletion,
      wouldTakeAnswer: wouldTakeAnswer,
    } = h,
    { columns: columns, rows: rows } = useTerminalSize(),
    { message: message, url: url } = params,
    At;
  if ($[0] !== url)
    ((At = serializeApprovalPayload(url, { maxUnits: MAX_PAYLOAD_UNITS, softWrap: !0 })),
      ($[0] = url),
      ($[1] = At));
  else At = $[1];
  let It = At,
    Ot;
  if ($[2] !== url) ((Ot = v$t(url)), ($[2] = url), ($[3] = Ot));
  else Ot = $[3];
  let Et = Ot,
    Dt;
  if ($[4] !== Et)
    ((Dt = serializeApprovalPayload(Et, { maxUnits: MAX_PAYLOAD_UNITS, softWrap: !0 })),
      ($[4] = Et),
      ($[5] = Dt));
  else Dt = $[5];
  let Lt = Dt,
    oo;
  if ($[6] !== columns || $[7] !== message)
    ((oo = truncateLines(displayField(message).text, columns)),
      ($[6] = columns),
      ($[7] = message),
      ($[8] = oo));
  else oo = $[8];
  let Xt = `
${oo}`,
    io;
  if ($[9] !== Lt || $[10] !== Et || $[11] !== url || $[12] !== It.kind || $[13] !== It.text)
    ((io =
      It.kind === "full" &&
      It.text.replaceAll(
        `
`,
        "",
      ) === url &&
      !hasDisplayUnsafeChar(url) &&
      !/[\n\r\u2028\u2029]/.test(url) &&
      Lt.kind === "full" &&
      Lt.text.replaceAll(
        `
`,
        "",
      ) === Et &&
      !hasDisplayUnsafeChar(Et) &&
      !/[\n\r\u2028\u2029]/.test(Et)),
      ($[9] = Lt),
      ($[10] = Et),
      ($[11] = url),
      ($[12] = It.kind),
      ($[13] = It.text),
      ($[14] = io));
  else io = $[14];
  let so = io,
    po,
    domain = "",
    urlBeforeDomain = "",
    bo;
  if ($[15] !== Et) {
    bo = !1;
    try {
      po = new URL(Et).hostname;
      let domainStart = Et.indexOf(po);
      if (po !== "" && domainStart !== -1)
        ((bo = !0),
          (domain = Et.slice(0, domainStart)),
          (urlBeforeDomain = Et.slice(domainStart + po.length)));
    } catch {
      po = Et;
    }
    (($[15] = Et), ($[16] = bo), ($[17] = po), ($[18] = domain), ($[19] = urlBeforeDomain));
  } else ((bo = $[16]), (po = $[17]), (domain = $[18]), (urlBeforeDomain = $[19]));
  let Bo = rows - 12;
  bo;
  let Ro;
  Ho: {
    if (Bo < 1) {
      Ro = !0;
      break Ho;
    }
    let Io = columns - 6;
    if (Io < 20) {
      Ro = !0;
      break Ho;
    }
    let Wo = bo ? Et : Lt.kind === "full" ? Lt.text : Et;
    let mn;
    if ($[20] !== Io || $[21] !== Wo)
      ((mn = countCharInString(
        wrapText(Wo, Io, "wrap"),
        `
`,
      )),
        ($[20] = Io),
        ($[21] = Wo),
        ($[22] = mn));
    else mn = $[22];
    Ro = mn + 1 > Bo;
  }
  let Cn = Ro,
    No = so && elicitationUrlCost(Et) <= Pdt,
    [vo, Yo] = y(initialPhase),
    kn = useInputClock(),
    [Fn] = y(_xo),
    bn = R(initialPhase === "waiting" ? Fn : void 0),
    [Go, hn, Mn] = useLatestState(
      initialPhase === "waiting"
        ? "open"
        : No && !Cn
          ? userConfirmsCompletion
            ? "open"
            : "accept"
          : "decline",
    ),
    mn,
    Xo;
  if ($[23] !== hn || $[24] !== Cn || $[25] !== No || $[26] !== userConfirmsCompletion)
    ((mn = () => {
      if (!No || Cn)
        hn((Sn) => (Sn === "accept" || (Sn === "open" && userConfirmsCompletion) ? "decline" : Sn));
    }),
      (Xo = [No, Cn, userConfirmsCompletion, hn]),
      ($[23] = hn),
      ($[24] = Cn),
      ($[25] = No),
      ($[26] = userConfirmsCompletion),
      ($[27] = mn),
      ($[28] = Xo));
  else ((mn = $[27]), (Xo = $[28]));
  P(mn, Xo);
  let $n = useInputGuard(initialPhase !== "waiting" && No && !Cn),
    on = waitingState?.showCancel ?? !1,
    { setRawMode: setRawMode } = useStdin(),
    cn,
    Dn;
  if ($[29] !== setRawMode)
    ((Dn = () => (setRawMode(!0), () => setRawMode(!1))),
      (cn = [setRawMode]),
      ($[29] = setRawMode),
      ($[30] = cn),
      ($[31] = Dn));
  else ((cn = $[30]), (Dn = $[31]));
  (zt(Dn, cn), useRegisterOverlay("elicitation-url"));
  let wn = R(!1),
    mr;
  if (
    $[32] !== Et ||
    $[33] !== onResponse ||
    $[34] !== hn ||
    $[35] !== No ||
    $[36] !== userConfirmsCompletion
  )
    ((mr = () => {
      if (!No || wn.current) {
        return;
      }
      if (onResponse("accept") === !1) {
        return;
      }
      if (((wn.current = !0), userConfirmsCompletion)) {
        return;
      }
      ((bn.current = Date.now()), fi(Et), Yo("waiting"), hn("open"));
    }),
      ($[32] = Et),
      ($[33] = onResponse),
      ($[34] = hn),
      ($[35] = No),
      ($[36] = userConfirmsCompletion),
      ($[37] = mr));
  else mr = $[37];
  let Kn = mr,
    [Wn, Fr] = y(!1),
    Zn;
  if ($[38] !== $n || $[39] !== Et || $[40] !== hn || $[41] !== No || $[42] !== wouldTakeAnswer)
    ((Zn = function Un() {
      if (!No || wn.current || wouldTakeAnswer?.() !== !0) {
        return;
      }
      (fi(Et), Fr(!0), $n.arrived(), hn("accept"));
    }),
      ($[38] = $n),
      ($[39] = Et),
      ($[40] = hn),
      ($[41] = No),
      ($[42] = wouldTakeAnswer),
      ($[43] = Zn));
  else Zn = $[43];
  let Un = Zn,
    dr;
  if (
    $[44] !== $n ||
    $[45] !== Et ||
    $[46] !== Mn ||
    $[47] !== Kn ||
    $[48] !== Un ||
    $[49] !== kn ||
    $[50] !== onResponse ||
    $[51] !== onWaitingDismiss ||
    $[52] !== vo ||
    $[53] !== hn ||
    $[54] !== on ||
    $[55] !== No ||
    $[56] !== userConfirmsCompletion
  )
    ((dr = function zr(prev) {
      if (vo === "prompt") {
        if (prev.key === "left" || prev.key === "right") {
          if ((prev.preventDefault(), No && userConfirmsCompletion)) {
            let pr = ["open", "accept", "decline"];
            let index = pr.indexOf(Mn());
            let ur = pr[(index + (prev.key === "right" ? 1 : -1) + 3) % 3];
            if (ur !== "decline") $n.arrived();
            hn(ur);
          } else if (No) {
            if (Mn() === "decline") $n.arrived();
            hn(flipElicitationAction);
          }
          return;
        }
        if (prev.key === "return") {
          prev.preventDefault();
          let Ir = Mn();
          if (Ir === "open" && userConfirmsCompletion) {
            if ($n.refuses()) {
              return;
            }
            Un();
          } else if (Ir === "accept") {
            if ($n.refuses()) {
              return;
            }
            Kn();
          } else if (Ir === "decline" && !wn.current) onResponse("decline");
        }
        if (isTextInputKey(prev)) $n.typed();
      } else {
        let Pr = on ? ["open", "action", "cancel"] : ["open", "action"];
        if (prev.key === "left" || prev.key === "right") {
          prev.preventDefault();
          let ts = prev.key === "right";
          hn((prev_0) => {
            let idx = Pr.indexOf(prev_0);
            return Pr[(idx + (ts ? 1 : -1) + Pr.length) % Pr.length];
          });
          return;
        }
        if (prev.key === "return") {
          prev.preventDefault();
          let Zr = bn.current;
          if (Zr !== void 0 && isWithinRecentInput(kn, Zr)) {
            return;
          }
          let wr = Mn();
          if (wr === "open") {
            if (No) fi(Et);
          } else if (wr === "cancel") onWaitingDismiss?.("cancel");
          else onWaitingDismiss?.(on ? "retry" : "dismiss");
        }
      }
    }),
      ($[44] = $n),
      ($[45] = Et),
      ($[46] = Mn),
      ($[47] = Kn),
      ($[48] = Un),
      ($[49] = kn),
      ($[50] = onResponse),
      ($[51] = onWaitingDismiss),
      ($[52] = vo),
      ($[53] = hn),
      ($[54] = on),
      ($[55] = No),
      ($[56] = userConfirmsCompletion),
      ($[57] = dr));
  else dr = $[57];
  let zr = dr;
  if (vo === "waiting") {
    let _r = waitingState?.actionLabel ?? "Continue without waiting";
    let fr;
    if ($[58] !== serverName) ((fr = QL(serverName)), ($[58] = serverName), ($[59] = fr));
    else fr = $[59];
    const $r = `MCP server \u201C${fr}\u201D \u2014 waiting for completion`;
    let Yr;
    if ($[60] !== onWaitingDismiss)
      ((Yr = () => onWaitingDismiss?.("cancel")), ($[60] = onWaitingDismiss), ($[61] = Yr));
    else Yr = $[61];
    let Er;
    if ($[62] === MEMO_CACHE_SENTINEL)
      ((Er = e(ConfigurableShortcutHint, {
        action: "confirm:no",
        context: "Confirmation",
        fallback: "Esc",
        description: "cancel",
      })),
        ($[62] = Er));
    else Er = $[62];
    let Vr;
    if ($[63] === MEMO_CACHE_SENTINEL)
      ((Vr = r(Byline, {
        children: [Er, e(KeyboardShortcutHint, { chord: ["left", "right"], action: "switch" })],
      })),
        ($[63] = Vr));
    else Vr = $[63];
    let ms;
    if (
      $[64] !== Lt ||
      $[65] !== po ||
      $[66] !== bo ||
      $[67] !== urlBeforeDomain ||
      $[68] !== domain ||
      $[69] !== It.kind ||
      $[70] !== It.marker ||
      $[71] !== It.needsGutter ||
      $[72] !== It.text ||
      $[73] !== No ||
      $[74] !== so
    )
      ((ms = e(Box, {
        marginBottom: 1,
        flexDirection: "column",
        children:
          No || so
            ? e(Blockquote, {
                multiline: Lt.kind === "full" && Lt.needsGutter,
                children: bo
                  ? r(Text, { children: [domain, e(Text, { bold: !0, children: po }), urlBeforeDomain] })
                  : e(Text, { children: Lt.kind === "full" ? Lt.text : null }),
              })
            : e(Blockquote, {
                multiline: It.kind === "full" && It.needsGutter,
                children: e(Text, { children: It.kind === "full" ? It.text : It.marker }),
              }),
      })),
        ($[64] = Lt),
        ($[65] = po),
        ($[66] = bo),
        ($[67] = urlBeforeDomain),
        ($[68] = domain),
        ($[69] = It.kind),
        ($[70] = It.marker),
        ($[71] = It.needsGutter),
        ($[72] = It.text),
        ($[73] = No),
        ($[74] = so),
        ($[75] = ms));
    else ms = $[75];
    let Xs;
    if ($[76] === MEMO_CACHE_SENTINEL)
      ((Xs = e(Box, {
        marginBottom: 1,
        children: e(Text, {
          dimColor: !0,
          italic: !0,
          children: "Waiting for the server to confirm completion\u2026",
        }),
      })),
        ($[76] = Xs));
    else Xs = $[76];
    const Ls = Go === "open" ? re.pointer : " ";
    let is;
    if ($[77] !== Ls) ((is = e(Text, { color: "success", children: Ls })), ($[77] = Ls), ($[78] = is));
    else is = $[78];
    const ws = Go === "open";
    const Ci = Go === "open" ? "success" : void 0;
    const oi = Go !== "open";
    let Oi;
    if ($[79] !== ws || $[80] !== Ci || $[81] !== oi)
      ((Oi = e(Text, { bold: ws, color: Ci, dimColor: oi, children: " Reopen URL  " })),
        ($[79] = ws),
        ($[80] = Ci),
        ($[81] = oi),
        ($[82] = Oi));
    else Oi = $[82];
    const Hi = Go === "action" ? re.pointer : " ";
    let Zi;
    if ($[83] !== Hi) ((Zi = e(Text, { color: "success", children: Hi })), ($[83] = Hi), ($[84] = Zi));
    else Zi = $[84];
    const da = Go === "action";
    const qn = Go === "action" ? "success" : void 0;
    const ps = Go !== "action";
    const xs = ` ${_r}`;
    let kr;
    if ($[85] !== da || $[86] !== qn || $[87] !== ps || $[88] !== xs)
      ((kr = e(Text, { bold: da, color: qn, dimColor: ps, children: xs })),
        ($[85] = da),
        ($[86] = qn),
        ($[87] = ps),
        ($[88] = xs),
        ($[89] = kr));
    else kr = $[89];
    let ls;
    if ($[90] !== Go || $[91] !== on)
      ((ls =
        on &&
        r(Fragment, {
          children: [
            e(Text, { children: " " }),
            e(Text, { color: "error", children: Go === "cancel" ? re.pointer : " " }),
            e(Text, {
              bold: Go === "cancel",
              color: Go === "cancel" ? "error" : void 0,
              dimColor: Go !== "cancel",
              children: " Cancel",
            }),
          ],
        })),
        ($[90] = Go),
        ($[91] = on),
        ($[92] = ls));
    else ls = $[92];
    let Ms;
    if ($[93] !== is || $[94] !== Oi || $[95] !== Zi || $[96] !== kr || $[97] !== ls)
      ((Ms = r(Box, { children: [is, Oi, Zi, kr, ls] })),
        ($[93] = is),
        ($[94] = Oi),
        ($[95] = Zi),
        ($[96] = kr),
        ($[97] = ls),
        ($[98] = Ms));
    else Ms = $[98];
    let qs;
    if ($[99] !== zr || $[100] !== ms || $[101] !== Ms)
      ((qs = r(FocusColumn, { onKeyDown: zr, children: [ms, Xs, Ms] })),
        ($[99] = zr),
        ($[100] = ms),
        ($[101] = Ms),
        ($[102] = qs));
    else qs = $[102];
    let gs;
    if ($[103] !== Xt || $[104] !== $r || $[105] !== Yr || $[106] !== qs)
      ((gs = e(Dialog, {
        title: $r,
        subtitle: Xt,
        color: "permission",
        onCancel: Yr,
        isCancelActive: !0,
        inputGuide: Vr,
        children: qs,
      })),
        ($[103] = Xt),
        ($[104] = $r),
        ($[105] = Yr),
        ($[106] = qs),
        ($[107] = gs));
    else gs = $[107];
    return gs;
  }
  let fr;
  if ($[108] !== serverName) ((fr = QL(serverName)), ($[108] = serverName), ($[109] = fr));
  else fr = $[109];
  const $r = `MCP server \u201C${fr}\u201D wants to open a URL`;
  let Yr;
  if ($[110] !== onResponse) ((Yr = () => onResponse("cancel")), ($[110] = onResponse), ($[111] = Yr));
  else Yr = $[111];
  let Er;
  if ($[112] === MEMO_CACHE_SENTINEL)
    ((Er = e(ConfigurableShortcutHint, {
      action: "confirm:no",
      context: "Confirmation",
      fallback: "Esc",
      description: "cancel",
    })),
      ($[112] = Er));
  else Er = $[112];
  let Vr;
  if ($[113] === MEMO_CACHE_SENTINEL)
    ((Vr = r(Byline, {
      children: [Er, e(KeyboardShortcutHint, { chord: ["left", "right"], action: "switch" })],
    })),
      ($[113] = Vr));
  else Vr = $[113];
  let ms;
  if (
    $[114] !== Lt ||
    $[115] !== po ||
    $[116] !== bo ||
    $[117] !== urlBeforeDomain ||
    $[118] !== domain ||
    $[119] !== It.kind ||
    $[120] !== It.marker ||
    $[121] !== It.needsGutter ||
    $[122] !== It.text ||
    $[123] !== No ||
    $[124] !== so
  )
    ((ms = e(Box, {
      marginBottom: 1,
      flexDirection: "column",
      children:
        No || so
          ? e(Blockquote, {
              multiline: Lt.kind === "full" && Lt.needsGutter,
              children: bo
                ? r(Text, { children: [domain, e(Text, { bold: !0, children: po }), urlBeforeDomain] })
                : e(Text, { children: Lt.kind === "full" ? Lt.text : null }),
            })
          : e(Blockquote, {
              multiline: It.kind === "full" && It.needsGutter,
              children: e(Text, { children: It.kind === "full" ? It.text : It.marker }),
            }),
    })),
      ($[114] = Lt),
      ($[115] = po),
      ($[116] = bo),
      ($[117] = urlBeforeDomain),
      ($[118] = domain),
      ($[119] = It.kind),
      ($[120] = It.marker),
      ($[121] = It.needsGutter),
      ($[122] = It.text),
      ($[123] = No),
      ($[124] = so),
      ($[125] = ms));
  else ms = $[125];
  let Xs;
  if ($[126] !== No || $[127] !== so)
    ((Xs =
      !No &&
      e(Box, {
        marginBottom: 1,
        children: e(Text, {
          dimColor: !0,
          children: so
            ? "This URL\u2019s browser-ready form is too long to hand to a browser safely, so one-click opening is disabled. The URL above is shown in full. Decline to continue."
            : "This URL cannot be shown exactly as it would open, so opening it is disabled. Decline to continue.",
        }),
      })),
      ($[126] = No),
      ($[127] = so),
      ($[128] = Xs));
  else Xs = $[128];
  let Ls;
  if ($[129] !== Cn || $[130] !== No)
    ((Ls =
      No &&
      Cn &&
      e(Box, {
        marginBottom: 1,
        children: e(Text, {
          dimColor: !0,
          children:
            "This URL extends past this screen \u2014 its beginning is not visible here. Review it in full before you continue.",
        }),
      })),
      ($[129] = Cn),
      ($[130] = No),
      ($[131] = Ls));
  else Ls = $[131];
  let is;
  if ($[132] !== Go || $[133] !== Wn || $[134] !== No || $[135] !== userConfirmsCompletion)
    ((is =
      No &&
      userConfirmsCompletion &&
      r(Fragment, {
        children: [
          e(Text, { color: "success", children: Go === "open" ? re.pointer : " " }),
          e(Text, {
            bold: Go === "open",
            color: Go === "open" ? "success" : void 0,
            dimColor: Go !== "open",
            children: Wn ? " Open again  " : " Open in browser  ",
          }),
        ],
      })),
      ($[132] = Go),
      ($[133] = Wn),
      ($[134] = No),
      ($[135] = userConfirmsCompletion),
      ($[136] = is));
  else is = $[136];
  let ws;
  if ($[137] !== Go || $[138] !== No || $[139] !== userConfirmsCompletion)
    ((ws =
      No &&
      r(Fragment, {
        children: [
          e(Text, { color: "success", children: Go === "accept" ? re.pointer : " " }),
          e(Text, {
            bold: Go === "accept",
            color: Go === "accept" ? "success" : void 0,
            dimColor: Go !== "accept",
            children: userConfirmsCompletion ? " I'm done, continue  " : " Accept  ",
          }),
        ],
      })),
      ($[137] = Go),
      ($[138] = No),
      ($[139] = userConfirmsCompletion),
      ($[140] = ws));
  else ws = $[140];
  const Ci = Go === "decline" ? re.pointer : " ";
  let oi;
  if ($[141] !== Ci) ((oi = e(Text, { color: "error", children: Ci })), ($[141] = Ci), ($[142] = oi));
  else oi = $[142];
  const Oi = Go === "decline",
    Hi = Go === "decline" ? "error" : void 0,
    Zi = Go !== "decline";
  let da;
  if ($[143] !== Oi || $[144] !== Hi || $[145] !== Zi)
    ((da = e(Text, { bold: Oi, color: Hi, dimColor: Zi, children: " Decline" })),
      ($[143] = Oi),
      ($[144] = Hi),
      ($[145] = Zi),
      ($[146] = da));
  else da = $[146];
  let qn;
  if ($[147] !== is || $[148] !== ws || $[149] !== oi || $[150] !== da)
    ((qn = r(Box, { children: [is, ws, oi, da] })),
      ($[147] = is),
      ($[148] = ws),
      ($[149] = oi),
      ($[150] = da),
      ($[151] = qn));
  else qn = $[151];
  let ps;
  if ($[152] !== zr || $[153] !== ms || $[154] !== Xs || $[155] !== Ls || $[156] !== qn)
    ((ps = r(FocusColumn, { onKeyDown: zr, children: [ms, Xs, Ls, qn] })),
      ($[152] = zr),
      ($[153] = ms),
      ($[154] = Xs),
      ($[155] = Ls),
      ($[156] = qn),
      ($[157] = ps));
  else ps = $[157];
  let xs;
  if ($[158] !== Xt || $[159] !== $r || $[160] !== Yr || $[161] !== ps)
    ((xs = e(Dialog, {
      title: $r,
      subtitle: Xt,
      color: "permission",
      onCancel: Yr,
      isCancelActive: !0,
      inputGuide: Vr,
      children: ps,
    })),
      ($[158] = Xt),
      ($[159] = $r),
      ($[160] = Yr),
      ($[161] = ps),
      ($[162] = xs));
  else xs = $[162];
  return xs;
}
/**
 * MCP elicitation 表单：按服务器给出的 schema 渲染字段、校验输入并提交。
 */
//@ chunk-18hwfzwa.js:1231333-1237471 placement
function ElicitationForm(h) {
  let $ = w(51),
    {
      schemaFields: schemaFields,
      scrollWindow: scrollWindow,
      currentFieldIndex: currentFieldIndex,
      focusedButton: focusedButton,
      formValues: formValues,
      validationErrors: validationErrors,
      resolvingFields: resolvingFields,
      expandedAccordion: expandedAccordion,
      accordionOptionIndex: accordionOptionIndex,
      optionWindow: optionWindow,
      clampFieldRows: clampFieldRows,
      textInputValue: textInputValue,
      textInputCursorOffset: textInputCursorOffset,
      setTextInputCursorOffset: setTextInputCursorOffset,
      handleTextInputChange: handleTextInputChange,
      handleTextInputSubmit: handleTextInputSubmit,
      columns: columns,
      serverName: serverName,
      pluginSource: pluginSource,
    } = h;
  if (!schemaFields.length) {
    return null;
  }
  let oo = scrollWindow.start > 0,
    Xt = scrollWindow.end < schemaFields.length,
    so;
  if ($[0] !== oo || $[1] !== scrollWindow.start)
    ((so =
      oo &&
      e(Box, {
        marginLeft: 2,
        children: r(Text, { dimColor: !0, children: [re.arrowUp, " ", scrollWindow.start, " more above"] }),
      })),
      ($[0] = oo),
      ($[1] = scrollWindow.start),
      ($[2] = so));
  else so = $[2];
  let po;
  if (
    $[3] !== accordionOptionIndex ||
    $[4] !== clampFieldRows ||
    $[5] !== columns ||
    $[6] !== currentFieldIndex ||
    $[7] !== expandedAccordion ||
    $[8] !== focusedButton ||
    $[9] !== formValues ||
    $[10] !== handleTextInputChange ||
    $[11] !== handleTextInputSubmit ||
    $[12] !== optionWindow ||
    $[13] !== pluginSource ||
    $[14] !== resolvingFields ||
    $[15] !== schemaFields ||
    $[16] !== scrollWindow.end ||
    $[17] !== scrollWindow.start ||
    $[18] !== serverName ||
    $[19] !== setTextInputCursorOffset ||
    $[20] !== textInputCursorOffset ||
    $[21] !== textInputValue ||
    $[22] !== validationErrors
  ) {
    const sliced = schemaFields.slice(scrollWindow.start, scrollWindow.end);
    let co;
    if (
      $[24] !== accordionOptionIndex ||
      $[25] !== clampFieldRows ||
      $[26] !== columns ||
      $[27] !== currentFieldIndex ||
      $[28] !== expandedAccordion ||
      $[29] !== focusedButton ||
      $[30] !== formValues ||
      $[31] !== handleTextInputChange ||
      $[32] !== handleTextInputSubmit ||
      $[33] !== optionWindow ||
      $[34] !== pluginSource ||
      $[35] !== resolvingFields ||
      $[36] !== scrollWindow.start ||
      $[37] !== serverName ||
      $[38] !== setTextInputCursorOffset ||
      $[39] !== textInputCursorOffset ||
      $[40] !== textInputValue ||
      $[41] !== validationErrors
    )
      ((co = (bo, Ao) => {
        let Bo = scrollWindow.start + Ao;
        let { name: Ro, schema: schema, isRequired: isRequired } = bo;
        let Wo = isPluginPasswordField(serverName, pluginSource, Ro, schema);
        let mn = Bo === currentFieldIndex && !focusedButton;
        let Cn = formValues[Ro];
        let No = Cn !== void 0 && (!Array.isArray(Cn) || Cn.length > 0);
        let vo = validationErrors[Ro];
        let Yo = resolvingFields.has(Ro)
          ? e(ResolvingSpinner, {})
          : vo
            ? e(Text, { color: "error", children: re.warning })
            : No
              ? e(Text, { color: "success", dimColor: !mn, children: re.tick })
              : isRequired
                ? e(Text, { color: "error", children: "*" })
                : e(Text, { children: " " });
        let kn = vo ? "error" : No ? "success" : isRequired ? "error" : "suggestion";
        let Fn = mn ? kn : void 0;
        let bn = schema.title || Ro;
        let Go = clampFieldRows
          ? truncateToWidth(labelOrEmpty(bn), Math.max(8, columns - max - 8 - zh))
          : labelOrEmpty(bn);
        let hn = e(Text, { color: Fn, bold: mn, children: Go });
        let max_2 = Math.max(zh, columns - max - 8 - bunStringWidth(Go));
        let max_3 = Math.max(zh, columns - max - 6 - 4);
        let Sn;
        let $n = null;
        if (isMultiSelectEnumSchema(schema)) {
          let on = getMultiSelectValues(schema);
          let _o = Array.isArray(Cn) ? Cn : [];
          if (expandedAccordion === Ro && mn) {
            Sn = e(Text, { dimColor: !0, children: re.triangleDownSmall });
            let cn = optionWindow ?? { start: 0, end: on.length, showAbove: !1, showBelow: !1 };
            $n = r(Box, {
              flexDirection: "column",
              marginLeft: 6,
              children: [
                cn.showAbove &&
                  r(Text, { dimColor: !0, children: [re.arrowUp, " ", cn.start, " more above"] }),
                on.slice(cn.start, cn.end).map((Dn, wn) => {
                  let mr = cn.start + wn;
                  let Kn = clampFieldRows
                    ? truncateToWidth(labelOrEmpty(getMultiSelectLabel(schema, Dn)), max_3)
                    : labelOrEmpty(getMultiSelectLabel(schema, Dn));
                  let included = _o.includes(Dn);
                  let Fr = mr === accordionOptionIndex;
                  return r(
                    Box,
                    {
                      gap: 1,
                      children: [
                        e(Text, { color: "suggestion", children: Fr ? re.pointer : " " }),
                        e(Text, {
                          color: included ? "success" : void 0,
                          children: included ? re.checkboxOn : re.checkboxOff,
                        }),
                        e(Text, { color: Fr ? "suggestion" : void 0, bold: Fr, children: Kn }),
                      ],
                    },
                    Dn,
                  );
                }),
                cn.showBelow &&
                  r(Text, {
                    dimColor: !0,
                    children: [re.arrowDown, " ", on.length - cn.end, " ", "more below"],
                  }),
              ],
            });
          } else {
            let Zn = mn ? r(Text, { dimColor: !0, children: [re.triangleRightSmall, " "] }) : null;
            if (_o.length > 0) {
              let joined = _o.map((Un) => labelOrEmpty(getMultiSelectLabel(schema, Un))).join(", ");
              Sn = r(Text, {
                children: [
                  Zn,
                  e(Text, {
                    color: Fn,
                    bold: mn,
                    children: clampFieldRows ? truncateToWidth(joined, max_2) : joined,
                  }),
                ],
              });
            } else
              Sn = r(Text, { children: [Zn, e(Text, { dimColor: !0, italic: !0, children: "not set" })] });
          }
        } else if (isEnumSchema(schema)) {
          let or = getEnumValues(schema);
          if (expandedAccordion === Ro && mn) {
            Sn = e(Text, { dimColor: !0, children: re.triangleDownSmall });
            let pr = optionWindow ?? { start: 0, end: or.length, showAbove: !1, showBelow: !1 };
            $n = r(Box, {
              flexDirection: "column",
              marginLeft: 6,
              children: [
                pr.showAbove &&
                  r(Text, { dimColor: !0, children: [re.arrowUp, " ", pr.start, " more above"] }),
                or.slice(pr.start, pr.end).map((Qn, ur) => {
                  let Ir = pr.start + ur;
                  let Pr = clampFieldRows
                    ? truncateToWidth(labelOrEmpty(getEnumLabel(schema, Qn)), max_3)
                    : labelOrEmpty(getEnumLabel(schema, Qn));
                  let ts = Cn === Qn;
                  let Gn = Ir === accordionOptionIndex;
                  return r(
                    Box,
                    {
                      gap: 1,
                      children: [
                        e(Text, { color: "suggestion", children: Gn ? re.pointer : " " }),
                        e(Text, { color: ts ? "success" : void 0, children: ts ? re.radioOn : re.radioOff }),
                        e(Text, { color: Gn ? "suggestion" : void 0, bold: Gn, children: Pr }),
                      ],
                    },
                    Qn,
                  );
                }),
                pr.showBelow &&
                  r(Text, {
                    dimColor: !0,
                    children: [re.arrowDown, " ", or.length - pr.end, " ", "more below"],
                  }),
              ],
            });
          } else {
            let Ur = mn ? r(Text, { dimColor: !0, children: [re.triangleRightSmall, " "] }) : null;
            if (No)
              Sn = r(Text, {
                children: [
                  Ur,
                  e(Text, {
                    color: Fn,
                    bold: mn,
                    children: clampFieldRows
                      ? truncateToWidth(labelOrEmpty(getEnumLabel(schema, Cn)), max_2)
                      : labelOrEmpty(getEnumLabel(schema, Cn)),
                  }),
                ],
              });
            else Sn = r(Text, { children: [Ur, e(Text, { dimColor: !0, italic: !0, children: "not set" })] });
          }
        } else if (schema.type === "boolean") {
          if (mn)
            Sn = No
              ? e(Text, { color: Fn, bold: !0, children: Cn ? re.checkboxOn : re.checkboxOff })
              : e(Text, { dimColor: !0, children: re.checkboxOff });
          else
            Sn = No
              ? e(Text, { children: Cn ? re.checkboxOn : re.checkboxOff })
              : e(Text, { dimColor: !0, italic: !0, children: "not set" });
        } else if (zL(schema)) {
          if (mn)
            Sn = e(TextInput, {
              value: textInputValue,
              onChange: handleTextInputChange,
              onSubmit: handleTextInputSubmit,
              mask: Wo ? "*" : void 0,
              maskWhole: Wo,
              placeholder: "Type something\u2026",
              columns: Math.min(clampFieldRows ? max_2 : columns - 20, 60),
              maxVisibleLines: clampFieldRows ? 1 : void 0,
              cursorOffset: textInputCursorOffset,
              onChangeCursorOffset: setTextInputCursorOffset,
              focus: !0,
              showCursor: !0,
            });
          else {
            let Zr =
              No && Wo && Cn !== ""
                ? Mdt
                : No && isDateTimeSchema(schema)
                  ? formatDateDisplay(String(Cn), schema)
                  : String(Cn);
            let wr = markBrokenSequences(replaceLineBreaks(stripUnsafeChars(Zr)));
            Sn = No
              ? e(Text, { children: clampFieldRows ? truncateToWidth(wr, max_2) : wr })
              : e(Text, { dimColor: !0, italic: !0, children: "not set" });
          }
        } else {
          let zr = markBrokenSequences(replaceLineBreaks(stripUnsafeChars(String(Cn))));
          Sn = No
            ? e(Text, { children: clampFieldRows ? truncateToWidth(zr, max_2) : zr })
            : e(Text, { dimColor: !0, italic: !0, children: "not set" });
        }
        let _r = schema.description ? displayField(schema.description) : null;
        return r(
          Box,
          {
            flexDirection: "column",
            children: [
              r(Box, {
                gap: 1,
                children: [
                  e(Text, { color: kn, children: mn ? re.pointer : " " }),
                  Yo,
                  r(Box, { children: [hn, e(Text, { color: Fn, children: ": " }), Sn] }),
                ],
              }),
              $n,
              _r !== null &&
                e(Box, {
                  marginLeft: 6,
                  children: clampFieldRows
                    ? e(Text, {
                        dimColor: !0,
                        children: truncateToWidth(
                          replaceLineBreaks(_r.text),
                          Math.max(zh, columns - 6 - max),
                        ),
                      })
                    : e(Blockquote, {
                        multiline: _r.needsGutter,
                        children: e(Text, { dimColor: !0, children: _r.text }),
                      }),
                }),
              e(Box, {
                marginLeft: 6,
                height: 1,
                children: vo
                  ? e(Text, {
                      color: "error",
                      italic: !0,
                      children: clampFieldRows
                        ? truncateToWidth(
                            replaceLineBreaks(displayField(vo).text),
                            Math.max(zh, columns - 6 - max),
                          )
                        : replaceLineBreaks(displayField(vo).text),
                    })
                  : e(Text, { children: " " }),
              }),
            ],
          },
          Ro,
        );
      }),
        ($[24] = accordionOptionIndex),
        ($[25] = clampFieldRows),
        ($[26] = columns),
        ($[27] = currentFieldIndex),
        ($[28] = expandedAccordion),
        ($[29] = focusedButton),
        ($[30] = formValues),
        ($[31] = handleTextInputChange),
        ($[32] = handleTextInputSubmit),
        ($[33] = optionWindow),
        ($[34] = pluginSource),
        ($[35] = resolvingFields),
        ($[36] = scrollWindow.start),
        ($[37] = serverName),
        ($[38] = setTextInputCursorOffset),
        ($[39] = textInputCursorOffset),
        ($[40] = textInputValue),
        ($[41] = validationErrors),
        ($[42] = co));
    else co = $[42];
    po = sliced.map(co);
    (($[3] = accordionOptionIndex),
      ($[4] = clampFieldRows),
      ($[5] = columns),
      ($[6] = currentFieldIndex),
      ($[7] = expandedAccordion),
      ($[8] = focusedButton),
      ($[9] = formValues),
      ($[10] = handleTextInputChange),
      ($[11] = handleTextInputSubmit),
      ($[12] = optionWindow),
      ($[13] = pluginSource),
      ($[14] = resolvingFields),
      ($[15] = schemaFields),
      ($[16] = scrollWindow.end),
      ($[17] = scrollWindow.start),
      ($[18] = serverName),
      ($[19] = setTextInputCursorOffset),
      ($[20] = textInputCursorOffset),
      ($[21] = textInputValue),
      ($[22] = validationErrors),
      ($[23] = po));
  } else po = $[23];
  let ao;
  if ($[43] !== Xt || $[44] !== schemaFields.length || $[45] !== scrollWindow.end)
    ((ao =
      Xt &&
      e(Box, {
        marginLeft: 2,
        children: r(Text, {
          dimColor: !0,
          children: [re.arrowDown, " ", schemaFields.length - scrollWindow.end, " more below"],
        }),
      })),
      ($[43] = Xt),
      ($[44] = schemaFields.length),
      ($[45] = scrollWindow.end),
      ($[46] = ao));
  else ao = $[46];
  let co;
  if ($[47] !== so || $[48] !== po || $[49] !== ao)
    ((co = r(Box, { flexDirection: "column", children: [so, po, ao] })),
      ($[47] = so),
      ($[48] = po),
      ($[49] = ao),
      ($[50] = co));
  else co = $[50];
  return co;
}
//@ chunk-tn4j580p.js:17770-17833 fingerprint = resetTypeahead (0.475)
function resetTypeahead(ta) {
  (ta.writers.delete(ta.signal), clearTimeout(ta.timer));
}

export { ElicitationDialog, resetTypeahead };
