/**
 * components/mcp/ElicitationDialog.tsx
 *
 * MCP elicitation 对话框：按服务器给的 JSON Schema 渲染表单（文本/数字/布尔/枚举/日期），提交/拒绝/取消。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/components/mcp/ElicitationDialog.tsx
 * pieces: chunk-18hwfzwa.js (10), chunk-tn4j580p.js (1)
 * attribution: placement 3, fingerprint 6, layout 1, sole-consumer 1
 */
import { randomUUID } from "crypto";
import {
  objectFieldEntries,
  MAX_URL_FIELD_CHARS,
  restoreElicitationValue,
  isScalarSchemaType,
  isEnumSchema,
  isMultiSelectEnumSchema,
  isDateTimeSchema,
  parseElicitationField,
  validateElicitationInputAsync,
  getMultiSelectValues,
  getMultiSelectLabel,
  getEnumValues,
  getEnumLabel,
  isBlankValue,
  MAX_URL_PARTS,
  MAX_ENUM_LABEL_CHARS,
  labelOrEmpty,
  elicitationUrlCost,
  MAX_URL_COST_CHARS,
  REDACTED_FIELD_TEXT,
} from "../../utils/mcp/elicitationValidation.js";
import { w } from "../../../vendor/react/compiler-runtime.js";
import { usePrefersReducedMotion } from "../Spinner/spinnerFlags.js";
import { useIsScreenReaderEnabled } from "../../ink/components/ErrorBoundary.js";
import { useAnimationFrame, useInputClock } from "../../ink/components/Input.js";
import {
  jsxProd_default,
  jsxProd_default_2,
  Fragment,
} from "../../../vendor/react/cjs/react-jsx-dev-runtime.react-server.production.js";
import { Text, Box } from "../../ink/components/Text.js";
import { jsonStringify } from "../../utils/slowOperations.js";
import { logForDebugging } from "../../utils/debug.js";
import { errorMessage } from "../../utils/errors.js";
import { y, Se, R, NSe, zt, Q, P, ce } from "../../../vendor/react/cjs/react.production.js";
import { isWithinRecentInput, INPUT_SETTLE_MS } from "../../hooks/useRecentInputGuard.js";
import { useClock } from "../../ink/components/ClockContext.js";
import { kp } from "../../../vendor/convert-to-spaces/dist/index.js";
import { useTheme_2, useStdin } from "../design-system/ThemeProvider.js";
import {
  labelOrEmpty as labelOrEmpty_2,
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
  pluginUserConfigTitle,
  isPluginPasswordField,
} from "../../plugins/bundled/claudeTest/userConfig.js";
import { env } from "../../utils/env.js";
import { useLatestState } from "../CustomSelect/option-map.js";
import { useTerminalSize } from "../../hooks/useTerminalSize.js";
import { useScrollViewportSize, useHasScrollViewport } from "../ScrollViewportContext.js";
import { useRegisterOverlay, OVERLAY_BATCH_SIZE } from "../../context/overlayContext.js";
import { useKeybinding } from "../../keybindings/useKeybinding.js";
import { isTextInputKey } from "../../ink/events/input-event.js";
import { useUnattendedNotice } from "../permissions/UnattendedAutoBlockNotice.js";
import { isFullscreenActive } from "../../utils/fullscreen.js";
import {
  isFlagOnWithInternalOverride,
  TENGU_AMBER_QUILLWORT,
} from "../../services/analytics/flagOverrides.js";
import {
  MAX_DEFAULT_TRUNCATE_LINES,
  truncateLines,
  MIN_TRUNCATE_WIDTH,
  max,
} from "../PromptInput/promptInputState.js";
import { bunStringWidth } from "../../ink/stringWidth.js";
import { truncateToWidth } from "../../utils/format.js";
import { Dialog } from "../design-system/Dialog.js";
import { Byline } from "../design-system/Byline.js";
import { ConfigurableShortcutHint } from "../ConfigurableShortcutHint.js";
import { KeyboardShortcutHint } from "../design-system/KeyboardShortcutHint.js";
import { FocusColumn } from "../design-system/FocusColumn.js";
import { figures_default } from "../../../vendor/@inquirer/figures/dist/esm/index.js";
import { normalizeUrlHref } from "../permissions/permissionCardKinds.js";
import { wrapText } from "../../ink/wrap-text.js";
import { openValidatedUrlSucceeded } from "../../utils/browser.js";
import { flipElicitationAction } from "../../entrypoints/sdk/controlSchemas.js";
import { MEMO_CACHE_SENTINEL } from "../../../runtime/bun-runtime.js";
import { Blockquote } from "../Blockquote.js";
import { TextInput } from "../TextInput.js";

//@ chunk-18hwfzwa.js:1204791-1204824 placement
function getNowMs() {
  return Date.now();
}
//@ chunk-18hwfzwa.js:1205190-1205353 placement = filterSwarmFieldsFromSchema (0.664)
/**
 * JSON schema 的 required 里只保留 properties 中确实存在的字段名。旧版名 filterSwarmFieldsFromSchema 为错配。
 */
function getDeclaredRequiredFields(requestedSchema) {
  let required = requestedSchema?.required;
  if (!Array.isArray(required)) return [];
  let D = new Set(objectFieldEntries(requestedSchema?.properties).map(([L]) => L));
  return required.filter((L) => typeof L === "string" && D.has(L));
}
//@ chunk-18hwfzwa.js:1206341-1206411 fingerprint = RESOLVING_SPINNER_CHARS (1)
var RESOLVING_SPINNER_CHARS = "\u280B\u2819\u2839\u2838\u283C\u2834\u2826\u2827\u2807\u280F";
//@ chunk-18hwfzwa.js:1206411-1206722 layout
/**
 * 解析中的旋转指示（减少动态效果或读屏时静止）。
 */
function ResolvingSpinner() {
  let $ = w(5);
  let prefersReducedMotion = usePrefersReducedMotion();
  let isScreenReaderEnabled = useIsScreenReaderEnabled();
  let [D, L] = useAnimationFrame(prefersReducedMotion || isScreenReaderEnabled ? null : 80);
  let ee = Math.floor(L / 80) % RESOLVING_SPINNER_CHARS.length;
  const children = RESOLVING_SPINNER_CHARS[ee];
  let children_2;
  if ($[0] !== children) {
    children_2 = jsxProd_default(Text, {
      color: "warning",
      children,
    });
    $[0] = children;
    $[1] = children_2;
  } else children_2 = $[1];
  let He;
  if ($[2] !== D || $[3] !== children_2) {
    He = jsxProd_default(Box, {
      ref: D,
      children: children_2,
    });
    $[2] = D;
    $[3] = children_2;
    $[4] = He;
  } else He = $[4];
  return He;
}
//@ chunk-18hwfzwa.js:1206722-1207211 fingerprint = formatDateDisplay (1)
function formatDateDisplay(isoValue, schema) {
  try {
    let date = new Date(isoValue);
    if (Number.isNaN(date.getTime())) return isoValue;
    if (("format" in schema ? schema.format : undefined) === "date-time")
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
//@ chunk-18hwfzwa.js:1207211-1209040 fingerprint = ElicitationDialog (0.354)
/**
 * MCP elicitation：form 模式按 requestedSchema 渲染字段（校验、日期格式化），URL 模式打开链接并等待；结果 accept/decline/cancel 回传服务器。
 */
function ElicitationDialog(props) {
  let $ = w(28);
  let {
    serverName,
    pluginSource,
    params,
    onResponse,
    waitingState,
    initialPhase,
    onWaitingDismiss,
    userConfirmsCompletion,
    wouldTakeAnswer,
  } = props;
  let inputClock = useInputClock();
  let Xe;
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
${randomUUID()}`);
      }
    }
    $[0] = params.elicitationId;
    $[1] = params.message;
    $[2] = params.mode;
    $[3] = params.requestedSchema;
    $[4] = params.url;
    $[5] = Xe;
  } else Xe = $[5];
  let Ot = Xe;
  let At;
  if ($[6] !== Ot) {
    At = () => ({
      key: Ot,
      at: Date.now(),
      generation: 0,
    });
    $[6] = Ot;
    $[7] = At;
  } else At = $[7];
  let [Et, Dt] = y(At);
  if (Et.key !== Ot)
    Dt({
      key: Ot,
      at: Date.now(),
      generation: Et.generation + 1,
    });
  let at = Et.at;
  let oo;
  if ($[8] !== inputClock || $[9] !== at || $[10] !== onResponse) {
    oo = (...Xt) => {
      let io = Xt;
      if (io[0] !== "cancel" && isWithinRecentInput(inputClock, at)) {
        return false;
      }
      return onResponse(...io);
    };
    $[8] = inputClock;
    $[9] = at;
    $[10] = onResponse;
    $[11] = oo;
  } else oo = $[11];
  let onResponse_2 = oo;
  if (params.mode === "url") {
    const initialPhase_2 = initialPhase ?? "prompt";
    const userConfirmsCompletion_2 = userConfirmsCompletion ?? false;
    let ao;
    if (
      $[12] !== Et.generation ||
      $[13] !== onResponse_2 ||
      $[14] !== onWaitingDismiss ||
      $[15] !== params ||
      $[16] !== serverName ||
      $[17] !== initialPhase_2 ||
      $[18] !== userConfirmsCompletion_2 ||
      $[19] !== waitingState ||
      $[20] !== wouldTakeAnswer
    ) {
      ao = jsxProd_default(
        ElicitationURLDialog,
        {
          serverName,
          params,
          onResponse: onResponse_2,
          waitingState,
          initialPhase: initialPhase_2,
          onWaitingDismiss,
          userConfirmsCompletion: userConfirmsCompletion_2,
          wouldTakeAnswer,
        },
        Et.generation,
      );
      $[12] = Et.generation;
      $[13] = onResponse_2;
      $[14] = onWaitingDismiss;
      $[15] = params;
      $[16] = serverName;
      $[17] = initialPhase_2;
      $[18] = userConfirmsCompletion_2;
      $[19] = waitingState;
      $[20] = wouldTakeAnswer;
      $[21] = ao;
    } else ao = $[21];
    return ao;
  }
  let Xt;
  if (
    $[22] !== Et.generation ||
    $[23] !== onResponse_2 ||
    $[24] !== params ||
    $[25] !== pluginSource ||
    $[26] !== serverName
  ) {
    Xt = jsxProd_default(
      ElicitationFormDialog,
      {
        serverName,
        pluginSource,
        params,
        onResponse: onResponse_2,
      },
      Et.generation,
    );
    $[22] = Et.generation;
    $[23] = onResponse_2;
    $[24] = params;
    $[25] = pluginSource;
    $[26] = serverName;
    $[27] = Xt;
  } else Xt = $[27];
  return Xt;
}
//@ chunk-18hwfzwa.js:1209040-1209724 sole-consumer
/**
 * 防误触：对话框刚出现或用户刚在打字时，短时间内拒绝按键提交；返回 {arrived, typed, refuses}。
 */
function useInputGuard(h) {
  let inputClock = useInputClock();
  let clock = useClock();
  let { subscribeFrames } = Se(kp);
  let ee = R(null);
  let ke = R(false);
  let Re = R(false);
  let Be = R(null);
  let He = R(() => {
    if (ke.current || !Re.current) return;
    ke.current = true;
    We.current?.();
    if (h || ee.current !== null) ee.current = Date.now();
  });
  let We = R(null);
  if (We.current === null && !ke.current) We.current = subscribeFrames(() => He.current());
  NSe(() => {
    Re.current = true;
  }, []);
  zt(() => {
    let ze = clock.setTimeout(He.current, MAX_URL_FIELD_CHARS);
    return () => {
      ze();
      We.current?.();
    };
  }, [clock]);
  return {
    arrived: () => {
      ee.current = Date.now();
    },
    typed: () => {
      Be.current = Date.now();
    },
    refuses: () => {
      if (!ke.current) return true;
      let ze = Be.current;
      if (ze !== null && isWithinRecentInput(inputClock, ze, INPUT_SETTLE_MS)) {
        Be.current = Date.now();
        return true;
      }
      let Xe = ee.current;
      if (Xe === null || !isWithinRecentInput(inputClock, Xe)) return false;
      ee.current = Date.now();
      return true;
    },
  };
}
//@ chunk-18hwfzwa.js:1209978-1220738 fingerprint = ElicitationFormDialog (0.541)
function ElicitationFormDialog({ serverName, pluginSource, params, onResponse }) {
  let { message, requestedSchema } = params;
  let { credentials } = useTheme_2();
  let { parseRelatedTaskMetadata } = require("./chunk-asne9cp8.js").mcpElicitationHandlerModule();
  let relatedTaskMetadata = parseRelatedTaskMetadata(params._meta);
  let We = relatedTaskMetadata
    ? ` (task ${labelOrEmpty_2(truncateToLength(relatedTaskMetadata.taskId, 8))})`
    : "";
  let hasFields = objectFieldEntries(requestedSchema?.properties).length > 0;
  let CLAUDE_CODE_CONSENT_POINTERLESS =
    !hasFields && hasPluginUserConfig(serverName, pluginSource) && env.CLAUDE_CODE_CONSENT_POINTERLESS;
  let [focusedButton, kt, At] = useLatestState(
    hasFields || CLAUDE_CODE_CONSENT_POINTERLESS ? null : "accept",
  );
  let inputGuard = useInputGuard(!hasFields && !CLAUDE_CODE_CONSENT_POINTERLESS);
  let Ot = Q(() => {
    let kr = {};
    let ls = {};
    for (let [propName, propSchema] of objectFieldEntries(requestedSchema?.properties)) {
      let validation = restoreElicitationValue(propSchema, propSchema.default);
      if (validation === undefined) continue;
      kr[propName] = validation.value;
      if (validation.error !== undefined) ls[propName] = validation.error;
    }
    return {
      values: kr,
      errors: ls,
    };
  }, [requestedSchema]);
  let [formValues, setFormValues] = y(() => Ot.values);
  let [validationErrors, setValidationErrors] = y(() => Ot.errors);
  let { setRawMode } = useStdin();
  zt(() => {
    setRawMode(true);
    return () => setRawMode(false);
  }, [setRawMode]);
  let schemaFields = Q(() => {
    let requiredFields = getDeclaredRequiredFields(requestedSchema);
    return objectFieldEntries(requestedSchema?.properties).map(([name, schema]) => ({
      name,
      schema,
      isRequired: requiredFields.includes(name),
    }));
  }, [requestedSchema]);
  let [currentFieldIndex, setCurrentFieldIndex] = y(hasFields ? 0 : undefined);
  let [textInputValue, setTextInputValue] = y(() => {
    let firstField = schemaFields[0];
    if (firstField && isScalarSchemaType(firstField.schema)) {
      let val = formValues[firstField.name];
      if (val === undefined) return "";
      return String(val);
    }
    return "";
  });
  let [textInputCursorOffset, setTextInputCursorOffset] = y(textInputValue.length);
  let [resolvingFields, setResolvingFields] = y(() => new Set());
  let [expandedAccordion, setExpandedAccordion] = y();
  let [accordionOptionIndex, setAccordionOptionIndex] = y(0);
  let clock = useClock();
  let dateDebounceRef = R(undefined);
  let resolveAbortRef = R(new Map());
  let enumTypeaheadRef = R({
    buffer: "",
    timer: undefined,
  });
  P(
    () => () => {
      if (dateDebounceRef.current !== undefined) dateDebounceRef.current();
      let ta = enumTypeaheadRef.current;
      if (ta.timer !== undefined) ta.timer();
      for (let controller of resolveAbortRef.current.values()) controller.abort();
      resolveAbortRef.current.clear();
    },
    [],
  );
  let terminalSize = useTerminalSize();
  let { columns } = terminalSize;
  let { rows } = useScrollViewportSize(terminalSize);
  let currentField = currentFieldIndex !== undefined ? schemaFields[currentFieldIndex] : undefined;
  let Mn =
    currentField !== undefined &&
    isScalarSchemaType(currentField.schema) &&
    !isEnumSchema(currentField.schema) &&
    !focusedButton;
  useRegisterOverlay("elicitation");
  let syncTextInput = ce(
    (fieldIndex) => {
      if (fieldIndex === undefined) {
        setTextInputValue("");
        setTextInputCursorOffset(0);
        return;
      }
      let field = schemaFields[fieldIndex];
      if (field && isScalarSchemaType(field.schema) && !isEnumSchema(field.schema)) {
        let val = formValues[field.name];
        let text = val !== undefined ? String(val) : "";
        setTextInputValue(text);
        setTextInputCursorOffset(text.length);
      }
    },
    [schemaFields, formValues],
  );
  function validateMultiSelect(fieldName, schema, selected, isRequired) {
    if (!isMultiSelectEnumSchema(schema)) return;
    let { minItems: min, maxItems: max } = schema;
    if (min !== undefined && selected.length < min && (selected.length > 0 || isRequired))
      updateValidationError(fieldName, `Select at least ${min} ${plural(min, "item")}`);
    else if (max !== undefined && selected.length > max)
      updateValidationError(fieldName, `Select at most ${max} ${plural(max, "item")}`);
    else updateValidationError(fieldName);
  }
  function handleNavigation(direction) {
    if (currentField && isMultiSelectEnumSchema(currentField.schema)) {
      validateMultiSelect(
        currentField.name,
        currentField.schema,
        (() => {
          let es = formValues[currentField.name];
          return Array.isArray(es) ? es : [];
        })(),
        currentField.isRequired,
      );
      setExpandedAccordion(undefined);
    } else if (currentField && isEnumSchema(currentField.schema)) setExpandedAccordion(undefined);
    if (Mn && currentField) {
      commitTextField(currentField.name, currentField.schema, textInputValue);
      if (dateDebounceRef.current !== undefined) {
        dateDebounceRef.current();
        dateDebounceRef.current = undefined;
      }
      if (
        isDateTimeSchema(currentField.schema) &&
        textInputValue.trim() !== "" &&
        validationErrors[currentField.name]
      )
        resolveFieldAsync(currentField.name, currentField.schema, textInputValue);
    }
    let itemCount = schemaFields.length + 2;
    let focusedButton = At();
    let index =
      currentFieldIndex ??
      (focusedButton === "accept"
        ? schemaFields.length
        : focusedButton === "decline"
          ? schemaFields.length + 1
          : undefined);
    let nextIndex = index !== undefined ? (index + (direction === "up" ? itemCount - 1 : 1)) % itemCount : 0;
    if (nextIndex < schemaFields.length) {
      setCurrentFieldIndex(nextIndex);
      kt(null);
      syncTextInput(nextIndex);
    } else {
      let es = nextIndex === schemaFields.length ? "accept" : "decline";
      if (es === "accept") inputGuard.arrived();
      setCurrentFieldIndex(undefined);
      kt(es);
      setTextInputValue("");
    }
  }
  function setField(fieldName, value) {
    setFormValues((prev) => {
      let next = {
        ...prev,
      };
      if (value === undefined) delete next[fieldName];
      else next[fieldName] = value;
      return next;
    });
    if (value !== undefined && validationErrors[fieldName] === "This field is required")
      updateValidationError(fieldName);
  }
  function updateValidationError(fieldName, error) {
    setValidationErrors((prev) => {
      let next = {
        ...prev,
      };
      if (error) next[fieldName] = error;
      else delete next[fieldName];
      return next;
    });
  }
  function unsetField(fieldName) {
    if (!fieldName) return;
    setField(fieldName, undefined);
    updateValidationError(fieldName);
    setTextInputValue("");
    setTextInputCursorOffset(0);
  }
  function commitTextField(fieldName, schema, value) {
    let validation_0 = parseElicitationField(schema, value);
    if (validation_0.kind === "unset") {
      unsetField(fieldName);
      return;
    }
    if (validation_0.kind === "keepEmptyIfSet") {
      if (formValues[fieldName] !== undefined) setField(fieldName, "");
      return;
    }
    setField(fieldName, validation_0.value);
    updateValidationError(fieldName, validation_0.error);
  }
  function resolveFieldAsync(fieldName, schema, rawValue) {
    let existing = resolveAbortRef.current.get(fieldName);
    if (existing) existing.abort();
    let controller = new AbortController();
    resolveAbortRef.current.set(fieldName, controller);
    setResolvingFields((prev) => new Set(prev).add(fieldName));
    validateElicitationInputAsync(rawValue, schema, controller.signal, credentials).then(
      (result) => {
        resolveAbortRef.current.delete(fieldName);
        setResolvingFields((prev) => {
          let next = new Set(prev);
          next.delete(fieldName);
          return next;
        });
        if (controller.signal.aborted) return;
        if (result.isValid) {
          setField(fieldName, result.value);
          updateValidationError(fieldName);
          let isoText = String(result.value);
          setTextInputValue((prev) => {
            if (prev === rawValue) {
              setTextInputCursorOffset(isoText.length);
              return isoText;
            }
            return prev;
          });
        } else updateValidationError(fieldName, result.error);
      },
      () => {
        resolveAbortRef.current.delete(fieldName);
        setResolvingFields((prev) => {
          let next = new Set(prev);
          next.delete(fieldName);
          return next;
        });
      },
    );
  }
  function handleTextInputChange(newValue) {
    setTextInputValue(newValue);
    if (currentField) {
      commitTextField(currentField.name, currentField.schema, newValue);
      if (dateDebounceRef.current !== undefined) {
        dateDebounceRef.current();
        dateDebounceRef.current = undefined;
      }
      if (
        isDateTimeSchema(currentField.schema) &&
        newValue.trim() !== "" &&
        validationErrors[currentField.name]
      ) {
        let { name: fieldName, schema } = currentField;
        dateDebounceRef.current = clock.setTimeout(() => {
          dateDebounceRef.current = undefined;
          resolveFieldAsync(fieldName, schema, newValue);
        }, 2000);
      }
    }
  }
  function handleTextInputSubmit() {
    handleNavigation("down");
  }
  function runTypeahead(char, labels, onMatch) {
    let ta_0 = enumTypeaheadRef.current;
    if (ta_0.timer !== undefined) ta_0.timer();
    ta_0.buffer += char.toLowerCase();
    ta_0.timer = clock.setTimeout(() => {
      ta_0.buffer = "";
      ta_0.timer = undefined;
    }, 2000);
    let match = labels.findIndex((label) => label.startsWith(ta_0.buffer));
    if (match !== -1) onMatch(match);
  }
  useKeybinding(
    "confirm:no",
    () => {
      if (Mn && currentField) {
        let val = formValues[currentField.name];
        setTextInputValue(val !== undefined ? String(val) : "");
        setTextInputCursorOffset(0);
      }
      onResponse("cancel");
    },
    {
      context: "Settings",
      isActive: !!currentField && !focusedButton && !expandedAccordion,
    },
  );
  function Fr(event) {
    let _input = event.key.length === 1 && event.key !== " " && !event.ctrl && !event.meta ? event.key : "";
    if (
      Mn &&
      event.key !== "up" &&
      event.key !== "down" &&
      event.key !== "return" &&
      event.key !== "backspace"
    )
      return;
    if (expandedAccordion && currentField && isMultiSelectEnumSchema(currentField.schema)) {
      let msSchema = currentField.schema;
      let msValues = getMultiSelectValues(msSchema);
      let _s = formValues[currentField.name];
      let fs = Array.isArray(_s) ? _s : [];
      if (event.key === "left" || event.key === "escape") {
        event.preventDefault();
        setExpandedAccordion(undefined);
        validateMultiSelect(currentField.name, msSchema, fs, currentField.isRequired);
        return;
      }
      if (event.key === "up") {
        event.preventDefault();
        if (accordionOptionIndex === 0) {
          setExpandedAccordion(undefined);
          validateMultiSelect(currentField.name, msSchema, fs, currentField.isRequired);
        } else setAccordionOptionIndex(accordionOptionIndex - 1);
        return;
      }
      if (event.key === "down") {
        event.preventDefault();
        if (accordionOptionIndex >= msValues.length - 1) {
          setExpandedAccordion(undefined);
          handleNavigation("down");
        } else setAccordionOptionIndex(accordionOptionIndex + 1);
        return;
      }
      if (event.key === " ") {
        event.preventDefault();
        let optionValue = msValues[accordionOptionIndex];
        if (optionValue !== undefined) {
          let newSelected = fs.includes(optionValue)
            ? fs.filter((v) => v !== optionValue)
            : [...fs, optionValue];
          let newValue = newSelected.length > 0 ? newSelected : undefined;
          setField(currentField.name, newValue);
          validateMultiSelect(currentField.name, msSchema, newSelected, currentField.isRequired);
        }
        return;
      }
      if (event.key === "return") {
        event.preventDefault();
        let optionValue = msValues[accordionOptionIndex];
        if (optionValue !== undefined && !fs.includes(optionValue))
          setField(currentField.name, [...fs, optionValue]);
        setExpandedAccordion(undefined);
        handleNavigation("down");
        return;
      }
      if (_input) {
        event.preventDefault();
        let labels = msValues.map((v_0) => labelOrEmpty_2(getMultiSelectLabel(msSchema, v_0)).toLowerCase());
        runTypeahead(_input, labels, setAccordionOptionIndex);
        return;
      }
      return;
    }
    if (expandedAccordion && currentField && isEnumSchema(currentField.schema)) {
      let enumSchema = currentField.schema;
      let enumValues = getEnumValues(enumSchema);
      if (event.key === "left" || event.key === "escape") {
        event.preventDefault();
        setExpandedAccordion(undefined);
        return;
      }
      if (event.key === "up") {
        event.preventDefault();
        if (accordionOptionIndex === 0) setExpandedAccordion(undefined);
        else setAccordionOptionIndex(accordionOptionIndex - 1);
        return;
      }
      if (event.key === "down") {
        event.preventDefault();
        if (accordionOptionIndex >= enumValues.length - 1) {
          setExpandedAccordion(undefined);
          handleNavigation("down");
        } else setAccordionOptionIndex(accordionOptionIndex + 1);
        return;
      }
      if (event.key === " ") {
        event.preventDefault();
        let optionValue = enumValues[accordionOptionIndex];
        if (optionValue !== undefined) setField(currentField.name, optionValue);
        setExpandedAccordion(undefined);
        return;
      }
      if (event.key === "return") {
        event.preventDefault();
        let optionValue = enumValues[accordionOptionIndex];
        if (optionValue !== undefined) setField(currentField.name, optionValue);
        setExpandedAccordion(undefined);
        handleNavigation("down");
        return;
      }
      if (_input) {
        event.preventDefault();
        let labels = enumValues.map((v_1) => labelOrEmpty_2(getEnumLabel(enumSchema, v_1)).toLowerCase());
        runTypeahead(_input, labels, setAccordionOptionIndex);
        return;
      }
      return;
    }
    let Ms = focusedButton ? At() : null;
    if (event.key === "return" && Ms === "accept") {
      event.preventDefault();
      if (validateRequired() && Object.keys(validationErrors).length === 0) {
        if (inputGuard.refuses()) return;
        onResponse("accept", formValues);
      } else {
        let requiredFields = getDeclaredRequiredFields(requestedSchema);
        for (let fieldName of requiredFields)
          if (isBlankValue(formValues[fieldName])) updateValidationError(fieldName, "This field is required");
        let firstBadIndex = schemaFields.findIndex(
          (f_0) =>
            (requiredFields.includes(f_0.name) && isBlankValue(formValues[f_0.name])) ||
            validationErrors[f_0.name] !== undefined,
        );
        if (firstBadIndex !== -1) {
          setCurrentFieldIndex(firstBadIndex);
          kt(null);
          syncTextInput(firstBadIndex);
        }
      }
      return;
    }
    if (event.key === "return" && Ms === "decline") {
      event.preventDefault();
      onResponse("decline");
      return;
    }
    if (event.key === "up" || event.key === "down") {
      event.preventDefault();
      let ta_1 = enumTypeaheadRef.current;
      ta_1.buffer = "";
      if (ta_1.timer !== undefined) {
        ta_1.timer();
        ta_1.timer = undefined;
      }
      handleNavigation(event.key === "up" ? "up" : "down");
      return;
    }
    if (focusedButton && (event.key === "left" || event.key === "right")) {
      event.preventDefault();
      if (At() === "decline") inputGuard.arrived();
      kt((ds) => (ds === "accept" ? "decline" : ds === "decline" ? "accept" : ds));
      return;
    }
    if (!hasFields && At() === null && (event.key === "left" || event.key === "right")) {
      event.preventDefault();
      inputGuard.arrived();
      kt("accept");
      return;
    }
    if (!currentField) {
      if (isTextInputKey(event)) inputGuard.typed();
      return;
    }
    let { schema, name } = currentField;
    let value = formValues[name];
    if (schema.type === "boolean") {
      if (event.key === " ") {
        event.preventDefault();
        setField(name, value === undefined ? true : !value);
        return;
      }
      if (event.key === "return") {
        event.preventDefault();
        handleNavigation("down");
        return;
      }
      if (event.key === "backspace" && value !== undefined) {
        event.preventDefault();
        unsetField(name);
        return;
      }
      if (_input && event.key !== "return") {
        event.preventDefault();
        runTypeahead(_input, ["yes", "no"], (i) => setField(name, i === 0));
        return;
      }
      return;
    }
    if (isEnumSchema(schema) || isMultiSelectEnumSchema(schema)) {
      if (event.key === "return") {
        event.preventDefault();
        handleNavigation("down");
        return;
      }
      if (event.key === "backspace" && value !== undefined) {
        event.preventDefault();
        unsetField(name);
        return;
      }
      let labels;
      let startIdx = 0;
      if (isEnumSchema(schema)) {
        let vals = getEnumValues(schema);
        labels = vals.map((v_2) => labelOrEmpty_2(getEnumLabel(schema, v_2)).toLowerCase());
        if (value !== undefined) startIdx = Math.max(0, vals.indexOf(value));
      } else
        labels = getMultiSelectValues(schema).map((v_3) =>
          labelOrEmpty_2(getMultiSelectLabel(schema, v_3)).toLowerCase(),
        );
      if (event.key === "right") {
        event.preventDefault();
        setExpandedAccordion(name);
        setAccordionOptionIndex(startIdx);
        return;
      }
      if (_input && event.key !== "left") {
        event.preventDefault();
        runTypeahead(_input, labels, (i_0) => {
          setExpandedAccordion(name);
          setAccordionOptionIndex(i_0);
        });
        return;
      }
      return;
    }
    if (event.key === "backspace") {
      if (Mn && textInputValue === "") {
        event.preventDefault();
        unsetField(name);
        return;
      }
    }
  }
  function validateRequired() {
    let requiredFields = getDeclaredRequiredFields(requestedSchema);
    for (let fieldName of requiredFields) if (isBlankValue(formValues[fieldName])) return false;
    return true;
  }
  let hasScrollViewport = useHasScrollViewport();
  let unattendedNotice = useUnattendedNotice();
  let or = isFullscreenActive();
  let pr = 2;
  let Qn = or ? (hasScrollViewport ? rows : rows - OVERLAY_BATCH_SIZE - pr - unattendedNotice) : rows;
  let ur = 5;
  let Ir = 2;
  let LINES_PER_FIELD = 3;
  let ts = or ? (Qn >= 18 ? 1 : 0) : 1;
  let Gn = schemaFields.length > 1 ? Ir : 0;
  let Ur = pluginUserConfigTitle(serverName, pluginSource);
  let Zr = Ur !== undefined && isFlagOnWithInternalOverride(TENGU_AMBER_QUILLWORT) ? Ur : undefined;
  let wr = Zr !== undefined ? MAX_URL_PARTS : MAX_DEFAULT_TRUNCATE_LINES + 1;
  let min = Math.min(wr, Math.max(1, Qn - ur - ts - Gn - Math.min(2, schemaFields.length) * LINES_PER_FIELD));
  let maxVisibleFields = Math.max(1, Qn - ur - ts - Gn - Math.min(1, schemaFields.length) * LINES_PER_FIELD);
  let fr = or
    ? Math.min(min, maxVisibleFields)
    : Zr === undefined
      ? wr
      : Math.max(MAX_DEFAULT_TRUNCATE_LINES + 1, Math.min(min, maxVisibleFields - pr));
  let scrollWindow = Q(() => truncateLines(displayField(message).text, columns, fr), [message, columns, fr]);
  let subtitle = scrollWindow
    ? ts
      ? `
${scrollWindow}`
      : scrollWindow
    : undefined;
  let Er = scrollWindow
    ? ts +
      countCharInString(
        scrollWindow,
        `
`,
      ) +
      1
    : 0;
  let Vr = Qn - ur - Er - Gn;
  let ms =
    expandedAccordion !== undefined
      ? schemaFields.find((schemaField) => schemaField.name === expandedAccordion)
      : undefined;
  let Xs = ms
    ? isMultiSelectEnumSchema(ms.schema)
      ? getMultiSelectValues(ms.schema).length
      : isEnumSchema(ms.schema)
        ? getEnumValues(ms.schema).length
        : 0
    : 0;
  let Ls = Vr - LINES_PER_FIELD;
  let is = Q(() => {
    if (!or || Xs <= Ls) return null;
    let max = Math.max(1, Ls);
    let max_2 = Math.max(1, max - 2);
    let start = Math.max(0, accordionOptionIndex - Math.floor(max_2 / 2));
    let end = Math.min(start + max_2, Xs);
    start = Math.max(0, end - max_2);
    let gs = start > 0;
    let es = end < Xs;
    let ds = end - start + (gs ? 1 : 0) + (es ? 1 : 0) - max;
    if (ds > 0 && gs) {
      gs = false;
      ds--;
    }
    if (ds > 0) es = false;
    return {
      start,
      end,
      showAbove: gs,
      showBelow: es,
    };
  }, [or, Xs, Ls, accordionOptionIndex]);
  let ws =
    !or || Xs === 0
      ? 0
      : is === null
        ? Xs
        : is.end - is.start + (is.showAbove ? 1 : 0) + (is.showBelow ? 1 : 0);
  let maxVisibleFields_2 = or
    ? Math.max(1, Math.floor((Vr - ws) / LINES_PER_FIELD))
    : Math.max(2, Math.floor((rows - 14) / LINES_PER_FIELD));
  let scrollWindow_2 = Q(() => {
    let total = schemaFields.length;
    if (total <= maxVisibleFields_2)
      return {
        start: 0,
        end: total,
      };
    let focusIdx = currentFieldIndex ?? total - 1;
    let start = Math.max(0, focusIdx - Math.floor(maxVisibleFields_2 / 2));
    let end = Math.min(start + maxVisibleFields_2, total);
    start = Math.max(0, end - maxVisibleFields_2);
    return {
      start,
      end,
    };
  }, [schemaFields.length, maxVisibleFields_2, currentFieldIndex]);
  let Hi = "MCP server \u201C";
  let Zi = "\u201D requests your input";
  let max_2 = Math.max(MIN_TRUNCATE_WIDTH, columns - max);
  let qn =
    max_2 - bunStringWidth(Hi) - bunStringWidth(`${Zi}${We}`) >= MAX_ENUM_LABEL_CHARS ? `${Zi}${We}` : Zi;
  let ps = or
    ? truncateToWidth(
        Hi +
          truncateToWidth(
            labelOrEmpty(serverName),
            Math.max(1, max_2 - bunStringWidth(Hi) - bunStringWidth(qn)),
          ) +
          qn,
        max_2,
      )
    : `${Hi}${labelOrEmpty(serverName)}${Zi}${We}`;
  let title = Zr === undefined ? ps : truncateToWidth(Zr, max_2);
  return jsxProd_default(Dialog, {
    title,
    subtitle,
    color: "permission",
    onCancel: () => onResponse("cancel"),
    isCancelActive: (!currentField || !!focusedButton) && !expandedAccordion,
    inputGuide: jsxProd_default_2(Byline, {
      children: [
        jsxProd_default(ConfigurableShortcutHint, {
          action: "confirm:no",
          context: "Confirmation",
          fallback: "Esc",
          description: "cancel",
        }),
        jsxProd_default(KeyboardShortcutHint, {
          chord: ["up", "down"],
          action: "navigate",
        }),
        currentField &&
          jsxProd_default(KeyboardShortcutHint, {
            chord: "backspace",
            action: "unset",
          }),
        currentField &&
          currentField.schema.type === "boolean" &&
          jsxProd_default(KeyboardShortcutHint, {
            chord: "space",
            action: "toggle",
          }),
        currentField &&
          isEnumSchema(currentField.schema) &&
          (expandedAccordion
            ? jsxProd_default(KeyboardShortcutHint, {
                chord: "space",
                action: "select",
              })
            : jsxProd_default(KeyboardShortcutHint, {
                chord: "right",
                action: "expand",
              })),
        currentField &&
          isMultiSelectEnumSchema(currentField.schema) &&
          (expandedAccordion
            ? jsxProd_default(KeyboardShortcutHint, {
                chord: "space",
                action: "toggle",
              })
            : jsxProd_default(KeyboardShortcutHint, {
                chord: "right",
                action: "expand",
              })),
      ],
    }),
    children: jsxProd_default_2(FocusColumn, {
      onKeyDown: Fr,
      children: [
        jsxProd_default(ElicitationForm, {
          schemaFields,
          scrollWindow: scrollWindow_2,
          currentFieldIndex,
          focusedButton,
          formValues,
          validationErrors,
          resolvingFields,
          expandedAccordion,
          accordionOptionIndex,
          optionWindow: is,
          clampFieldRows: or,
          textInputValue,
          textInputCursorOffset,
          setTextInputCursorOffset,
          handleTextInputChange,
          handleTextInputSubmit,
          columns,
          serverName,
          pluginSource,
        }),
        jsxProd_default_2(Box, {
          children: [
            jsxProd_default_2(Box, {
              flexShrink: 0,
              children: [
                jsxProd_default(Text, {
                  color: "success",
                  children: focusedButton === "accept" ? figures_default.pointer : " ",
                }),
                jsxProd_default(Text, {
                  bold: focusedButton === "accept",
                  color: focusedButton === "accept" ? "success" : undefined,
                  dimColor: focusedButton !== "accept",
                  children: " Accept  ",
                }),
                jsxProd_default(Text, {
                  color: "error",
                  children: focusedButton === "decline" ? figures_default.pointer : " ",
                }),
                jsxProd_default(Text, {
                  bold: focusedButton === "decline",
                  color: focusedButton === "decline" ? "error" : undefined,
                  dimColor: focusedButton !== "decline",
                  children: " Decline",
                }),
              ],
            }),
            CLAUDE_CODE_CONSENT_POINTERLESS &&
              focusedButton === null &&
              jsxProd_default(Text, {
                dimColor: true,
                wrap: "truncate-end",
                children: "   (press an arrow key to choose)",
              }),
          ],
        }),
      ],
    }),
  });
}
//@ chunk-18hwfzwa.js:1220738-1231333 fingerprint = ElicitationURLDialog (0.683)
function ElicitationURLDialog(props) {
  let $ = w(163);
  let {
    serverName,
    params,
    onResponse,
    waitingState,
    initialPhase,
    onWaitingDismiss,
    userConfirmsCompletion,
    wouldTakeAnswer,
  } = props;
  let { columns, rows } = useTerminalSize();
  let { message, url } = params;
  let At;
  if ($[0] !== url) {
    At = serializeApprovalPayload(url, {
      maxUnits: MAX_PAYLOAD_UNITS,
      softWrap: true,
    });
    $[0] = url;
    $[1] = At;
  } else At = $[1];
  let It = At;
  let Ot;
  if ($[2] !== url) {
    Ot = normalizeUrlHref(url);
    $[2] = url;
    $[3] = Ot;
  } else Ot = $[3];
  let Et = Ot;
  let Dt;
  if ($[4] !== Et) {
    Dt = serializeApprovalPayload(Et, {
      maxUnits: MAX_PAYLOAD_UNITS,
      softWrap: true,
    });
    $[4] = Et;
    $[5] = Dt;
  } else Dt = $[5];
  let Lt = Dt;
  let oo;
  if ($[6] !== columns || $[7] !== message) {
    oo = truncateLines(displayField(message).text, columns);
    $[6] = columns;
    $[7] = message;
    $[8] = oo;
  } else oo = $[8];
  let subtitle = `
${oo}`;
  let io;
  if ($[9] !== Lt || $[10] !== Et || $[11] !== url || $[12] !== It.kind || $[13] !== It.text) {
    io =
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
      !/[\n\r\u2028\u2029]/.test(Et);
    $[9] = Lt;
    $[10] = Et;
    $[11] = url;
    $[12] = It.kind;
    $[13] = It.text;
    $[14] = io;
  } else io = $[14];
  let so = io;
  let po;
  let domain = "";
  let urlBeforeDomain = "";
  let bo;
  if ($[15] !== Et) {
    bo = false;
    try {
      po = new URL(Et).hostname;
      let domainStart = Et.indexOf(po);
      if (po !== "" && domainStart !== -1) {
        bo = true;
        domain = Et.slice(0, domainStart);
        urlBeforeDomain = Et.slice(domainStart + po.length);
      }
    } catch {
      po = Et;
    }
    $[15] = Et;
    $[16] = bo;
    $[17] = po;
    $[18] = domain;
    $[19] = urlBeforeDomain;
  } else {
    bo = $[16];
    po = $[17];
    domain = $[18];
    urlBeforeDomain = $[19];
  }
  let Bo = rows - 12;
  bo;
  let Ro;
  Ho: {
    if (Bo < 1) {
      Ro = true;
      break Ho;
    }
    let Io = columns - 6;
    if (Io < 20) {
      Ro = true;
      break Ho;
    }
    let Wo = bo ? Et : Lt.kind === "full" ? Lt.text : Et;
    let mn;
    if ($[20] !== Io || $[21] !== Wo) {
      mn = countCharInString(
        wrapText(Wo, Io, "wrap"),
        `
`,
      );
      $[20] = Io;
      $[21] = Wo;
      $[22] = mn;
    } else mn = $[22];
    Ro = mn + 1 > Bo;
  }
  let Cn = Ro;
  let No = so && elicitationUrlCost(Et) <= MAX_URL_COST_CHARS;
  let [vo, Yo] = y(initialPhase);
  let inputClock = useInputClock();
  let [Fn] = y(getNowMs);
  let bn = R(initialPhase === "waiting" ? Fn : undefined);
  let [Go, hn, Mn] = useLatestState(
    initialPhase === "waiting"
      ? "open"
      : No && !Cn
        ? userConfirmsCompletion
          ? "open"
          : "accept"
        : "decline",
  );
  let mn;
  let Xo;
  if ($[23] !== hn || $[24] !== Cn || $[25] !== No || $[26] !== userConfirmsCompletion) {
    mn = () => {
      if (!No || Cn)
        hn((Sn) => (Sn === "accept" || (Sn === "open" && userConfirmsCompletion) ? "decline" : Sn));
    };
    Xo = [No, Cn, userConfirmsCompletion, hn];
    $[23] = hn;
    $[24] = Cn;
    $[25] = No;
    $[26] = userConfirmsCompletion;
    $[27] = mn;
    $[28] = Xo;
  } else {
    mn = $[27];
    Xo = $[28];
  }
  P(mn, Xo);
  let inputGuard = useInputGuard(initialPhase !== "waiting" && No && !Cn);
  let showCancel = waitingState?.showCancel ?? false;
  let { setRawMode } = useStdin();
  let cn;
  let Dn;
  if ($[29] !== setRawMode) {
    Dn = () => {
      setRawMode(true);
      return () => setRawMode(false);
    };
    cn = [setRawMode];
    $[29] = setRawMode;
    $[30] = cn;
    $[31] = Dn;
  } else {
    cn = $[30];
    Dn = $[31];
  }
  zt(Dn, cn);
  useRegisterOverlay("elicitation-url");
  let wn = R(false);
  let mr;
  if (
    $[32] !== Et ||
    $[33] !== onResponse ||
    $[34] !== hn ||
    $[35] !== No ||
    $[36] !== userConfirmsCompletion
  ) {
    mr = () => {
      if (!No || wn.current) {
        return;
      }
      if (onResponse("accept") === false) {
        return;
      }
      wn.current = true;
      if (userConfirmsCompletion) {
        return;
      }
      bn.current = Date.now();
      openValidatedUrlSucceeded(Et);
      Yo("waiting");
      hn("open");
    };
    $[32] = Et;
    $[33] = onResponse;
    $[34] = hn;
    $[35] = No;
    $[36] = userConfirmsCompletion;
    $[37] = mr;
  } else mr = $[37];
  let Kn = mr;
  let [Wn, Fr] = y(false);
  let Zn;
  if ($[38] !== inputGuard || $[39] !== Et || $[40] !== hn || $[41] !== No || $[42] !== wouldTakeAnswer) {
    Zn = function Un() {
      if (!No || wn.current || wouldTakeAnswer?.() !== true) {
        return;
      }
      openValidatedUrlSucceeded(Et);
      Fr(true);
      inputGuard.arrived();
      hn("accept");
    };
    $[38] = inputGuard;
    $[39] = Et;
    $[40] = hn;
    $[41] = No;
    $[42] = wouldTakeAnswer;
    $[43] = Zn;
  } else Zn = $[43];
  let Un = Zn;
  let dr;
  if (
    $[44] !== inputGuard ||
    $[45] !== Et ||
    $[46] !== Mn ||
    $[47] !== Kn ||
    $[48] !== Un ||
    $[49] !== inputClock ||
    $[50] !== onResponse ||
    $[51] !== onWaitingDismiss ||
    $[52] !== vo ||
    $[53] !== hn ||
    $[54] !== showCancel ||
    $[55] !== No ||
    $[56] !== userConfirmsCompletion
  ) {
    dr = function zr(prev) {
      if (vo === "prompt") {
        if (prev.key === "left" || prev.key === "right") {
          prev.preventDefault();
          if (No && userConfirmsCompletion) {
            let pr = ["open", "accept", "decline"];
            let index = pr.indexOf(Mn());
            let ur = pr[(index + (prev.key === "right" ? 1 : -1) + 3) % 3];
            if (ur !== "decline") inputGuard.arrived();
            hn(ur);
          } else if (No) {
            if (Mn() === "decline") inputGuard.arrived();
            hn(flipElicitationAction);
          }
          return;
        }
        if (prev.key === "return") {
          prev.preventDefault();
          let Ir = Mn();
          if (Ir === "open" && userConfirmsCompletion) {
            if (inputGuard.refuses()) {
              return;
            }
            Un();
          } else if (Ir === "accept") {
            if (inputGuard.refuses()) {
              return;
            }
            Kn();
          } else if (Ir === "decline" && !wn.current) onResponse("decline");
        }
        if (isTextInputKey(prev)) inputGuard.typed();
      } else {
        let Pr = showCancel ? ["open", "action", "cancel"] : ["open", "action"];
        if (prev.key === "left" || prev.key === "right") {
          prev.preventDefault();
          let ts = prev.key === "right";
          hn((prev) => {
            let idx = Pr.indexOf(prev);
            return Pr[(idx + (ts ? 1 : -1) + Pr.length) % Pr.length];
          });
          return;
        }
        if (prev.key === "return") {
          prev.preventDefault();
          let Zr = bn.current;
          if (Zr !== undefined && isWithinRecentInput(inputClock, Zr)) {
            return;
          }
          let wr = Mn();
          if (wr === "open") {
            if (No) openValidatedUrlSucceeded(Et);
          } else if (wr === "cancel") onWaitingDismiss?.("cancel");
          else onWaitingDismiss?.(showCancel ? "retry" : "dismiss");
        }
      }
    };
    $[44] = inputGuard;
    $[45] = Et;
    $[46] = Mn;
    $[47] = Kn;
    $[48] = Un;
    $[49] = inputClock;
    $[50] = onResponse;
    $[51] = onWaitingDismiss;
    $[52] = vo;
    $[53] = hn;
    $[54] = showCancel;
    $[55] = No;
    $[56] = userConfirmsCompletion;
    $[57] = dr;
  } else dr = $[57];
  let onKeyDown = dr;
  if (vo === "waiting") {
    let actionLabel = waitingState?.actionLabel ?? "Continue without waiting";
    let fr;
    if ($[58] !== serverName) {
      fr = labelOrEmpty(serverName);
      $[58] = serverName;
      $[59] = fr;
    } else fr = $[59];
    const title = `MCP server \u201C${fr}\u201D \u2014 waiting for completion`;
    let onCancel;
    if ($[60] !== onWaitingDismiss) {
      onCancel = () => onWaitingDismiss?.("cancel");
      $[60] = onWaitingDismiss;
      $[61] = onCancel;
    } else onCancel = $[61];
    let Er;
    if ($[62] === MEMO_CACHE_SENTINEL) {
      Er = jsxProd_default(ConfigurableShortcutHint, {
        action: "confirm:no",
        context: "Confirmation",
        fallback: "Esc",
        description: "cancel",
      });
      $[62] = Er;
    } else Er = $[62];
    let inputGuide;
    if ($[63] === MEMO_CACHE_SENTINEL) {
      inputGuide = jsxProd_default_2(Byline, {
        children: [
          Er,
          jsxProd_default(KeyboardShortcutHint, {
            chord: ["left", "right"],
            action: "switch",
          }),
        ],
      });
      $[63] = inputGuide;
    } else inputGuide = $[63];
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
    ) {
      ms = jsxProd_default(Box, {
        marginBottom: 1,
        flexDirection: "column",
        children:
          No || so
            ? jsxProd_default(Blockquote, {
                multiline: Lt.kind === "full" && Lt.needsGutter,
                children: bo
                  ? jsxProd_default_2(Text, {
                      children: [
                        domain,
                        jsxProd_default(Text, {
                          bold: true,
                          children: po,
                        }),
                        urlBeforeDomain,
                      ],
                    })
                  : jsxProd_default(Text, {
                      children: Lt.kind === "full" ? Lt.text : null,
                    }),
              })
            : jsxProd_default(Blockquote, {
                multiline: It.kind === "full" && It.needsGutter,
                children: jsxProd_default(Text, {
                  children: It.kind === "full" ? It.text : It.marker,
                }),
              }),
      });
      $[64] = Lt;
      $[65] = po;
      $[66] = bo;
      $[67] = urlBeforeDomain;
      $[68] = domain;
      $[69] = It.kind;
      $[70] = It.marker;
      $[71] = It.needsGutter;
      $[72] = It.text;
      $[73] = No;
      $[74] = so;
      $[75] = ms;
    } else ms = $[75];
    let Xs;
    if ($[76] === MEMO_CACHE_SENTINEL) {
      Xs = jsxProd_default(Box, {
        marginBottom: 1,
        children: jsxProd_default(Text, {
          dimColor: true,
          italic: true,
          children: "Waiting for the server to confirm completion\u2026",
        }),
      });
      $[76] = Xs;
    } else Xs = $[76];
    const children = Go === "open" ? figures_default.pointer : " ";
    let is;
    if ($[77] !== children) {
      is = jsxProd_default(Text, {
        color: "success",
        children,
      });
      $[77] = children;
      $[78] = is;
    } else is = $[78];
    const bold = Go === "open";
    const color = Go === "open" ? "success" : undefined;
    const dimColor = Go !== "open";
    let Oi;
    if ($[79] !== bold || $[80] !== color || $[81] !== dimColor) {
      Oi = jsxProd_default(Text, {
        bold,
        color,
        dimColor,
        children: " Reopen URL  ",
      });
      $[79] = bold;
      $[80] = color;
      $[81] = dimColor;
      $[82] = Oi;
    } else Oi = $[82];
    const children_2 = Go === "action" ? figures_default.pointer : " ";
    let Zi;
    if ($[83] !== children_2) {
      Zi = jsxProd_default(Text, {
        color: "success",
        children: children_2,
      });
      $[83] = children_2;
      $[84] = Zi;
    } else Zi = $[84];
    const bold_2 = Go === "action";
    const color_2 = Go === "action" ? "success" : undefined;
    const dimColor_2 = Go !== "action";
    const children_3 = ` ${actionLabel}`;
    let kr;
    if ($[85] !== bold_2 || $[86] !== color_2 || $[87] !== dimColor_2 || $[88] !== children_3) {
      kr = jsxProd_default(Text, {
        bold: bold_2,
        color: color_2,
        dimColor: dimColor_2,
        children: children_3,
      });
      $[85] = bold_2;
      $[86] = color_2;
      $[87] = dimColor_2;
      $[88] = children_3;
      $[89] = kr;
    } else kr = $[89];
    let ls;
    if ($[90] !== Go || $[91] !== showCancel) {
      ls =
        showCancel &&
        jsxProd_default_2(Fragment, {
          children: [
            jsxProd_default(Text, {
              children: " ",
            }),
            jsxProd_default(Text, {
              color: "error",
              children: Go === "cancel" ? figures_default.pointer : " ",
            }),
            jsxProd_default(Text, {
              bold: Go === "cancel",
              color: Go === "cancel" ? "error" : undefined,
              dimColor: Go !== "cancel",
              children: " Cancel",
            }),
          ],
        });
      $[90] = Go;
      $[91] = showCancel;
      $[92] = ls;
    } else ls = $[92];
    let Ms;
    if ($[93] !== is || $[94] !== Oi || $[95] !== Zi || $[96] !== kr || $[97] !== ls) {
      Ms = jsxProd_default_2(Box, {
        children: [is, Oi, Zi, kr, ls],
      });
      $[93] = is;
      $[94] = Oi;
      $[95] = Zi;
      $[96] = kr;
      $[97] = ls;
      $[98] = Ms;
    } else Ms = $[98];
    let children_4;
    if ($[99] !== onKeyDown || $[100] !== ms || $[101] !== Ms) {
      children_4 = jsxProd_default_2(FocusColumn, {
        onKeyDown,
        children: [ms, Xs, Ms],
      });
      $[99] = onKeyDown;
      $[100] = ms;
      $[101] = Ms;
      $[102] = children_4;
    } else children_4 = $[102];
    let gs;
    if ($[103] !== subtitle || $[104] !== title || $[105] !== onCancel || $[106] !== children_4) {
      gs = jsxProd_default(Dialog, {
        title,
        subtitle,
        color: "permission",
        onCancel,
        isCancelActive: true,
        inputGuide,
        children: children_4,
      });
      $[103] = subtitle;
      $[104] = title;
      $[105] = onCancel;
      $[106] = children_4;
      $[107] = gs;
    } else gs = $[107];
    return gs;
  }
  let fr;
  if ($[108] !== serverName) {
    fr = labelOrEmpty(serverName);
    $[108] = serverName;
    $[109] = fr;
  } else fr = $[109];
  const title = `MCP server \u201C${fr}\u201D wants to open a URL`;
  let onCancel;
  if ($[110] !== onResponse) {
    onCancel = () => onResponse("cancel");
    $[110] = onResponse;
    $[111] = onCancel;
  } else onCancel = $[111];
  let Er;
  if ($[112] === MEMO_CACHE_SENTINEL) {
    Er = jsxProd_default(ConfigurableShortcutHint, {
      action: "confirm:no",
      context: "Confirmation",
      fallback: "Esc",
      description: "cancel",
    });
    $[112] = Er;
  } else Er = $[112];
  let inputGuide;
  if ($[113] === MEMO_CACHE_SENTINEL) {
    inputGuide = jsxProd_default_2(Byline, {
      children: [
        Er,
        jsxProd_default(KeyboardShortcutHint, {
          chord: ["left", "right"],
          action: "switch",
        }),
      ],
    });
    $[113] = inputGuide;
  } else inputGuide = $[113];
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
  ) {
    ms = jsxProd_default(Box, {
      marginBottom: 1,
      flexDirection: "column",
      children:
        No || so
          ? jsxProd_default(Blockquote, {
              multiline: Lt.kind === "full" && Lt.needsGutter,
              children: bo
                ? jsxProd_default_2(Text, {
                    children: [
                      domain,
                      jsxProd_default(Text, {
                        bold: true,
                        children: po,
                      }),
                      urlBeforeDomain,
                    ],
                  })
                : jsxProd_default(Text, {
                    children: Lt.kind === "full" ? Lt.text : null,
                  }),
            })
          : jsxProd_default(Blockquote, {
              multiline: It.kind === "full" && It.needsGutter,
              children: jsxProd_default(Text, {
                children: It.kind === "full" ? It.text : It.marker,
              }),
            }),
    });
    $[114] = Lt;
    $[115] = po;
    $[116] = bo;
    $[117] = urlBeforeDomain;
    $[118] = domain;
    $[119] = It.kind;
    $[120] = It.marker;
    $[121] = It.needsGutter;
    $[122] = It.text;
    $[123] = No;
    $[124] = so;
    $[125] = ms;
  } else ms = $[125];
  let Xs;
  if ($[126] !== No || $[127] !== so) {
    Xs =
      !No &&
      jsxProd_default(Box, {
        marginBottom: 1,
        children: jsxProd_default(Text, {
          dimColor: true,
          children: so
            ? "This URL\u2019s browser-ready form is too long to hand to a browser safely, so one-click opening is disabled. The URL above is shown in full. Decline to continue."
            : "This URL cannot be shown exactly as it would open, so opening it is disabled. Decline to continue.",
        }),
      });
    $[126] = No;
    $[127] = so;
    $[128] = Xs;
  } else Xs = $[128];
  let Ls;
  if ($[129] !== Cn || $[130] !== No) {
    Ls =
      No &&
      Cn &&
      jsxProd_default(Box, {
        marginBottom: 1,
        children: jsxProd_default(Text, {
          dimColor: true,
          children:
            "This URL extends past this screen \u2014 its beginning is not visible here. Review it in full before you continue.",
        }),
      });
    $[129] = Cn;
    $[130] = No;
    $[131] = Ls;
  } else Ls = $[131];
  let is;
  if ($[132] !== Go || $[133] !== Wn || $[134] !== No || $[135] !== userConfirmsCompletion) {
    is =
      No &&
      userConfirmsCompletion &&
      jsxProd_default_2(Fragment, {
        children: [
          jsxProd_default(Text, {
            color: "success",
            children: Go === "open" ? figures_default.pointer : " ",
          }),
          jsxProd_default(Text, {
            bold: Go === "open",
            color: Go === "open" ? "success" : undefined,
            dimColor: Go !== "open",
            children: Wn ? " Open again  " : " Open in browser  ",
          }),
        ],
      });
    $[132] = Go;
    $[133] = Wn;
    $[134] = No;
    $[135] = userConfirmsCompletion;
    $[136] = is;
  } else is = $[136];
  let ws;
  if ($[137] !== Go || $[138] !== No || $[139] !== userConfirmsCompletion) {
    ws =
      No &&
      jsxProd_default_2(Fragment, {
        children: [
          jsxProd_default(Text, {
            color: "success",
            children: Go === "accept" ? figures_default.pointer : " ",
          }),
          jsxProd_default(Text, {
            bold: Go === "accept",
            color: Go === "accept" ? "success" : undefined,
            dimColor: Go !== "accept",
            children: userConfirmsCompletion ? " I'm done, continue  " : " Accept  ",
          }),
        ],
      });
    $[137] = Go;
    $[138] = No;
    $[139] = userConfirmsCompletion;
    $[140] = ws;
  } else ws = $[140];
  const children = Go === "decline" ? figures_default.pointer : " ";
  let oi;
  if ($[141] !== children) {
    oi = jsxProd_default(Text, {
      color: "error",
      children,
    });
    $[141] = children;
    $[142] = oi;
  } else oi = $[142];
  const bold = Go === "decline";
  const color = Go === "decline" ? "error" : undefined;
  const dimColor = Go !== "decline";
  let da;
  if ($[143] !== bold || $[144] !== color || $[145] !== dimColor) {
    da = jsxProd_default(Text, {
      bold,
      color,
      dimColor,
      children: " Decline",
    });
    $[143] = bold;
    $[144] = color;
    $[145] = dimColor;
    $[146] = da;
  } else da = $[146];
  let qn;
  if ($[147] !== is || $[148] !== ws || $[149] !== oi || $[150] !== da) {
    qn = jsxProd_default_2(Box, {
      children: [is, ws, oi, da],
    });
    $[147] = is;
    $[148] = ws;
    $[149] = oi;
    $[150] = da;
    $[151] = qn;
  } else qn = $[151];
  let children_2;
  if ($[152] !== onKeyDown || $[153] !== ms || $[154] !== Xs || $[155] !== Ls || $[156] !== qn) {
    children_2 = jsxProd_default_2(FocusColumn, {
      onKeyDown,
      children: [ms, Xs, Ls, qn],
    });
    $[152] = onKeyDown;
    $[153] = ms;
    $[154] = Xs;
    $[155] = Ls;
    $[156] = qn;
    $[157] = children_2;
  } else children_2 = $[157];
  let xs;
  if ($[158] !== subtitle || $[159] !== title || $[160] !== onCancel || $[161] !== children_2) {
    xs = jsxProd_default(Dialog, {
      title,
      subtitle,
      color: "permission",
      onCancel,
      isCancelActive: true,
      inputGuide,
      children: children_2,
    });
    $[158] = subtitle;
    $[159] = title;
    $[160] = onCancel;
    $[161] = children_2;
    $[162] = xs;
  } else xs = $[162];
  return xs;
}
//@ chunk-18hwfzwa.js:1231333-1237471 placement
/**
 * MCP elicitation 表单：按服务器给出的 schema 渲染字段、校验输入并提交。
 */
function ElicitationForm(props) {
  let $ = w(51);
  let {
    schemaFields,
    scrollWindow,
    currentFieldIndex,
    focusedButton,
    formValues,
    validationErrors,
    resolvingFields,
    expandedAccordion,
    accordionOptionIndex,
    optionWindow,
    clampFieldRows,
    textInputValue,
    textInputCursorOffset,
    setTextInputCursorOffset,
    handleTextInputChange,
    handleTextInputSubmit,
    columns,
    serverName,
    pluginSource,
  } = props;
  if (!schemaFields.length) {
    return null;
  }
  let oo = scrollWindow.start > 0;
  let Xt = scrollWindow.end < schemaFields.length;
  let so;
  if ($[0] !== oo || $[1] !== scrollWindow.start) {
    so =
      oo &&
      jsxProd_default(Box, {
        marginLeft: 2,
        children: jsxProd_default_2(Text, {
          dimColor: true,
          children: [figures_default.arrowUp, " ", scrollWindow.start, " more above"],
        }),
      });
    $[0] = oo;
    $[1] = scrollWindow.start;
    $[2] = so;
  } else so = $[2];
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
    ) {
      co = (bo, Ao) => {
        let Bo = scrollWindow.start + Ao;
        let { name: Ro, schema, isRequired } = bo;
        let Wo = isPluginPasswordField(serverName, pluginSource, Ro, schema);
        let mn = Bo === currentFieldIndex && !focusedButton;
        let Cn = formValues[Ro];
        let No = Cn !== undefined && (!Array.isArray(Cn) || Cn.length > 0);
        let vo = validationErrors[Ro];
        let Yo = resolvingFields.has(Ro)
          ? jsxProd_default(ResolvingSpinner, {})
          : vo
            ? jsxProd_default(Text, {
                color: "error",
                children: figures_default.warning,
              })
            : No
              ? jsxProd_default(Text, {
                  color: "success",
                  dimColor: !mn,
                  children: figures_default.tick,
                })
              : isRequired
                ? jsxProd_default(Text, {
                    color: "error",
                    children: "*",
                  })
                : jsxProd_default(Text, {
                    children: " ",
                  });
        let kn = vo ? "error" : No ? "success" : isRequired ? "error" : "suggestion";
        let color = mn ? kn : undefined;
        let title = schema.title || Ro;
        let Go = clampFieldRows
          ? truncateToWidth(labelOrEmpty_2(title), Math.max(8, columns - max - 8 - MIN_TRUNCATE_WIDTH))
          : labelOrEmpty_2(title);
        let hn = jsxProd_default(Text, {
          color,
          bold: mn,
          children: Go,
        });
        let max_2 = Math.max(MIN_TRUNCATE_WIDTH, columns - max - 8 - bunStringWidth(Go));
        let max_3 = Math.max(MIN_TRUNCATE_WIDTH, columns - max - 6 - 4);
        let Sn;
        let $n = null;
        if (isMultiSelectEnumSchema(schema)) {
          let multiSelectValues = getMultiSelectValues(schema);
          let _o = Array.isArray(Cn) ? Cn : [];
          if (expandedAccordion === Ro && mn) {
            Sn = jsxProd_default(Text, {
              dimColor: true,
              children: figures_default.triangleDownSmall,
            });
            let cn = optionWindow ?? {
              start: 0,
              end: multiSelectValues.length,
              showAbove: false,
              showBelow: false,
            };
            $n = jsxProd_default_2(Box, {
              flexDirection: "column",
              marginLeft: 6,
              children: [
                cn.showAbove &&
                  jsxProd_default_2(Text, {
                    dimColor: true,
                    children: [figures_default.arrowUp, " ", cn.start, " more above"],
                  }),
                multiSelectValues.slice(cn.start, cn.end).map((multiSelectValue, wn) => {
                  let mr = cn.start + wn;
                  let children = clampFieldRows
                    ? truncateToWidth(labelOrEmpty_2(getMultiSelectLabel(schema, multiSelectValue)), max_3)
                    : labelOrEmpty_2(getMultiSelectLabel(schema, multiSelectValue));
                  let included = _o.includes(multiSelectValue);
                  let Fr = mr === accordionOptionIndex;
                  return jsxProd_default_2(
                    Box,
                    {
                      gap: 1,
                      children: [
                        jsxProd_default(Text, {
                          color: "suggestion",
                          children: Fr ? figures_default.pointer : " ",
                        }),
                        jsxProd_default(Text, {
                          color: included ? "success" : undefined,
                          children: included ? figures_default.checkboxOn : figures_default.checkboxOff,
                        }),
                        jsxProd_default(Text, {
                          color: Fr ? "suggestion" : undefined,
                          bold: Fr,
                          children,
                        }),
                      ],
                    },
                    multiSelectValue,
                  );
                }),
                cn.showBelow &&
                  jsxProd_default_2(Text, {
                    dimColor: true,
                    children: [
                      figures_default.arrowDown,
                      " ",
                      multiSelectValues.length - cn.end,
                      " ",
                      "more below",
                    ],
                  }),
              ],
            });
          } else {
            let Zn = mn
              ? jsxProd_default_2(Text, {
                  dimColor: true,
                  children: [figures_default.triangleRightSmall, " "],
                })
              : null;
            if (_o.length > 0) {
              let joined = _o.map((Un) => labelOrEmpty_2(getMultiSelectLabel(schema, Un))).join(", ");
              Sn = jsxProd_default_2(Text, {
                children: [
                  Zn,
                  jsxProd_default(Text, {
                    color,
                    bold: mn,
                    children: clampFieldRows ? truncateToWidth(joined, max_2) : joined,
                  }),
                ],
              });
            } else
              Sn = jsxProd_default_2(Text, {
                children: [
                  Zn,
                  jsxProd_default(Text, {
                    dimColor: true,
                    italic: true,
                    children: "not set",
                  }),
                ],
              });
          }
        } else if (isEnumSchema(schema)) {
          let enumValues = getEnumValues(schema);
          if (expandedAccordion === Ro && mn) {
            Sn = jsxProd_default(Text, {
              dimColor: true,
              children: figures_default.triangleDownSmall,
            });
            let pr = optionWindow ?? {
              start: 0,
              end: enumValues.length,
              showAbove: false,
              showBelow: false,
            };
            $n = jsxProd_default_2(Box, {
              flexDirection: "column",
              marginLeft: 6,
              children: [
                pr.showAbove &&
                  jsxProd_default_2(Text, {
                    dimColor: true,
                    children: [figures_default.arrowUp, " ", pr.start, " more above"],
                  }),
                enumValues.slice(pr.start, pr.end).map((enumValue, ur) => {
                  let Ir = pr.start + ur;
                  let children = clampFieldRows
                    ? truncateToWidth(labelOrEmpty_2(getEnumLabel(schema, enumValue)), max_3)
                    : labelOrEmpty_2(getEnumLabel(schema, enumValue));
                  let ts = Cn === enumValue;
                  let Gn = Ir === accordionOptionIndex;
                  return jsxProd_default_2(
                    Box,
                    {
                      gap: 1,
                      children: [
                        jsxProd_default(Text, {
                          color: "suggestion",
                          children: Gn ? figures_default.pointer : " ",
                        }),
                        jsxProd_default(Text, {
                          color: ts ? "success" : undefined,
                          children: ts ? figures_default.radioOn : figures_default.radioOff,
                        }),
                        jsxProd_default(Text, {
                          color: Gn ? "suggestion" : undefined,
                          bold: Gn,
                          children,
                        }),
                      ],
                    },
                    enumValue,
                  );
                }),
                pr.showBelow &&
                  jsxProd_default_2(Text, {
                    dimColor: true,
                    children: [figures_default.arrowDown, " ", enumValues.length - pr.end, " ", "more below"],
                  }),
              ],
            });
          } else {
            let Ur = mn
              ? jsxProd_default_2(Text, {
                  dimColor: true,
                  children: [figures_default.triangleRightSmall, " "],
                })
              : null;
            if (No)
              Sn = jsxProd_default_2(Text, {
                children: [
                  Ur,
                  jsxProd_default(Text, {
                    color,
                    bold: mn,
                    children: clampFieldRows
                      ? truncateToWidth(labelOrEmpty_2(getEnumLabel(schema, Cn)), max_2)
                      : labelOrEmpty_2(getEnumLabel(schema, Cn)),
                  }),
                ],
              });
            else
              Sn = jsxProd_default_2(Text, {
                children: [
                  Ur,
                  jsxProd_default(Text, {
                    dimColor: true,
                    italic: true,
                    children: "not set",
                  }),
                ],
              });
          }
        } else if (schema.type === "boolean") {
          if (mn)
            Sn = No
              ? jsxProd_default(Text, {
                  color,
                  bold: true,
                  children: Cn ? figures_default.checkboxOn : figures_default.checkboxOff,
                })
              : jsxProd_default(Text, {
                  dimColor: true,
                  children: figures_default.checkboxOff,
                });
          else
            Sn = No
              ? jsxProd_default(Text, {
                  children: Cn ? figures_default.checkboxOn : figures_default.checkboxOff,
                })
              : jsxProd_default(Text, {
                  dimColor: true,
                  italic: true,
                  children: "not set",
                });
        } else if (isScalarSchemaType(schema)) {
          if (mn)
            Sn = jsxProd_default(TextInput, {
              value: textInputValue,
              onChange: handleTextInputChange,
              onSubmit: handleTextInputSubmit,
              mask: Wo ? "*" : undefined,
              maskWhole: Wo,
              placeholder: "Type something\u2026",
              columns: Math.min(clampFieldRows ? max_2 : columns - 20, 60),
              maxVisibleLines: clampFieldRows ? 1 : undefined,
              cursorOffset: textInputCursorOffset,
              onChangeCursorOffset: setTextInputCursorOffset,
              focus: true,
              showCursor: true,
            });
          else {
            let Zr =
              No && Wo && Cn !== ""
                ? REDACTED_FIELD_TEXT
                : No && isDateTimeSchema(schema)
                  ? formatDateDisplay(String(Cn), schema)
                  : String(Cn);
            let wr = markBrokenSequences(replaceLineBreaks(stripUnsafeChars(Zr)));
            Sn = No
              ? jsxProd_default(Text, {
                  children: clampFieldRows ? truncateToWidth(wr, max_2) : wr,
                })
              : jsxProd_default(Text, {
                  dimColor: true,
                  italic: true,
                  children: "not set",
                });
          }
        } else {
          let zr = markBrokenSequences(replaceLineBreaks(stripUnsafeChars(String(Cn))));
          Sn = No
            ? jsxProd_default(Text, {
                children: clampFieldRows ? truncateToWidth(zr, max_2) : zr,
              })
            : jsxProd_default(Text, {
                dimColor: true,
                italic: true,
                children: "not set",
              });
        }
        let _r = schema.description ? displayField(schema.description) : null;
        return jsxProd_default_2(
          Box,
          {
            flexDirection: "column",
            children: [
              jsxProd_default_2(Box, {
                gap: 1,
                children: [
                  jsxProd_default(Text, {
                    color: kn,
                    children: mn ? figures_default.pointer : " ",
                  }),
                  Yo,
                  jsxProd_default_2(Box, {
                    children: [
                      hn,
                      jsxProd_default(Text, {
                        color,
                        children: ": ",
                      }),
                      Sn,
                    ],
                  }),
                ],
              }),
              $n,
              _r !== null &&
                jsxProd_default(Box, {
                  marginLeft: 6,
                  children: clampFieldRows
                    ? jsxProd_default(Text, {
                        dimColor: true,
                        children: truncateToWidth(
                          replaceLineBreaks(_r.text),
                          Math.max(MIN_TRUNCATE_WIDTH, columns - 6 - max),
                        ),
                      })
                    : jsxProd_default(Blockquote, {
                        multiline: _r.needsGutter,
                        children: jsxProd_default(Text, {
                          dimColor: true,
                          children: _r.text,
                        }),
                      }),
                }),
              jsxProd_default(Box, {
                marginLeft: 6,
                height: 1,
                children: vo
                  ? jsxProd_default(Text, {
                      color: "error",
                      italic: true,
                      children: clampFieldRows
                        ? truncateToWidth(
                            replaceLineBreaks(displayField(vo).text),
                            Math.max(MIN_TRUNCATE_WIDTH, columns - 6 - max),
                          )
                        : replaceLineBreaks(displayField(vo).text),
                    })
                  : jsxProd_default(Text, {
                      children: " ",
                    }),
              }),
            ],
          },
          Ro,
        );
      };
      $[24] = accordionOptionIndex;
      $[25] = clampFieldRows;
      $[26] = columns;
      $[27] = currentFieldIndex;
      $[28] = expandedAccordion;
      $[29] = focusedButton;
      $[30] = formValues;
      $[31] = handleTextInputChange;
      $[32] = handleTextInputSubmit;
      $[33] = optionWindow;
      $[34] = pluginSource;
      $[35] = resolvingFields;
      $[36] = scrollWindow.start;
      $[37] = serverName;
      $[38] = setTextInputCursorOffset;
      $[39] = textInputCursorOffset;
      $[40] = textInputValue;
      $[41] = validationErrors;
      $[42] = co;
    } else co = $[42];
    po = sliced.map(co);
    $[3] = accordionOptionIndex;
    $[4] = clampFieldRows;
    $[5] = columns;
    $[6] = currentFieldIndex;
    $[7] = expandedAccordion;
    $[8] = focusedButton;
    $[9] = formValues;
    $[10] = handleTextInputChange;
    $[11] = handleTextInputSubmit;
    $[12] = optionWindow;
    $[13] = pluginSource;
    $[14] = resolvingFields;
    $[15] = schemaFields;
    $[16] = scrollWindow.end;
    $[17] = scrollWindow.start;
    $[18] = serverName;
    $[19] = setTextInputCursorOffset;
    $[20] = textInputCursorOffset;
    $[21] = textInputValue;
    $[22] = validationErrors;
    $[23] = po;
  } else po = $[23];
  let ao;
  if ($[43] !== Xt || $[44] !== schemaFields.length || $[45] !== scrollWindow.end) {
    ao =
      Xt &&
      jsxProd_default(Box, {
        marginLeft: 2,
        children: jsxProd_default_2(Text, {
          dimColor: true,
          children: [figures_default.arrowDown, " ", schemaFields.length - scrollWindow.end, " more below"],
        }),
      });
    $[43] = Xt;
    $[44] = schemaFields.length;
    $[45] = scrollWindow.end;
    $[46] = ao;
  } else ao = $[46];
  let co;
  if ($[47] !== so || $[48] !== po || $[49] !== ao) {
    co = jsxProd_default_2(Box, {
      flexDirection: "column",
      children: [so, po, ao],
    });
    $[47] = so;
    $[48] = po;
    $[49] = ao;
    $[50] = co;
  } else co = $[50];
  return co;
}
//@ chunk-tn4j580p.js:17770-17833 fingerprint = resetTypeahead (0.475)
function resetTypeahead(ta) {
  ta.writers.delete(ta.signal);
  clearTimeout(ta.timer);
}
export { ElicitationDialog, resetTypeahead };
