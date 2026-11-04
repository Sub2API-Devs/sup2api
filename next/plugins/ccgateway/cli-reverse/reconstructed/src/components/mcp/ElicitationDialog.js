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
import { useMemoCache } from "../../../vendor/react/compiler-runtime.js";
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
import {
  useState,
  useContext,
  useRef,
  useInsertionEffect,
  useLayoutEffect,
  useMemo,
  useEffect,
  useCallback,
} from "../../../vendor/react/cjs/react.production.js";
import { isWithinRecentInput, INPUT_SETTLE_MS } from "../../hooks/useRecentInputGuard.js";
import { useClock } from "../../ink/components/ClockContext.js";
import { APP_CONTEXT } from "../../../vendor/convert-to-spaces/dist/index.js";
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

//@ chunk-tn4j580p.js:17770-17833 fingerprint = resetTypeahead (0.475)
function resetTypeahead(ta) {
  ta.writers.delete(ta.signal);
  clearTimeout(ta.timer);
}
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
  let propertyNames = new Set(objectFieldEntries(requestedSchema?.properties).map(([name]) => name));
  return required.filter((name) => typeof name === "string" && propertyNames.has(name));
}
//@ chunk-18hwfzwa.js:1206341-1206411 fingerprint = RESOLVING_SPINNER_CHARS (1)
var RESOLVING_SPINNER_CHARS = "\u280B\u2819\u2839\u2838\u283C\u2834\u2826\u2827\u2807\u280F";
//@ chunk-18hwfzwa.js:1206411-1206722 layout
/**
 * 解析中的旋转指示（减少动态效果或读屏时静止）。
 */
function ResolvingSpinner() {
  let $ = useMemoCache(5);
  let prefersReducedMotion = usePrefersReducedMotion();
  let isScreenReaderEnabled = useIsScreenReaderEnabled();
  let [ref, frame] = useAnimationFrame(prefersReducedMotion || isScreenReaderEnabled ? null : 80);
  let charIndex = Math.floor(frame / 80) % RESOLVING_SPINNER_CHARS.length;
  const children = RESOLVING_SPINNER_CHARS[charIndex];
  let children_2;
  if ($[0] !== children) {
    children_2 = jsxProd_default(Text, {
      color: "warning",
      children,
    });
    $[0] = children;
    $[1] = children_2;
  } else children_2 = $[1];
  let spinner;
  if ($[2] !== ref || $[3] !== children_2) {
    spinner = jsxProd_default(Box, {
      ref,
      children: children_2,
    });
    $[2] = ref;
    $[3] = children_2;
    $[4] = spinner;
  } else spinner = $[4];
  return spinner;
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
  let $ = useMemoCache(28);
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
  let dedupeKey;
  if (
    $[0] !== params.elicitationId ||
    $[1] !== params.message ||
    $[2] !== params.mode ||
    $[3] !== params.requestedSchema ||
    $[4] !== params.url
  ) {
    kt: {
      if (params.mode === "url") {
        dedupeKey = `url
${params.elicitationId}
${params.url}
${params.message}`;
        break kt;
      }
      try {
        dedupeKey = `form
${params.message}
${jsonStringify(params.requestedSchema)}`;
      } catch (error) {
        let error_2 = error;
        dedupeKey =
          (logForDebugging(
            `MCP elicitation requestedSchema could not be turned into JSON; each new payload counts as a new question: ${errorMessage(error_2)}`,
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
    $[5] = dedupeKey;
  } else dedupeKey = $[5];
  let dedupeKey_2 = dedupeKey;
  let makeInitial;
  if ($[6] !== dedupeKey_2) {
    makeInitial = () => ({
      key: dedupeKey_2,
      at: Date.now(),
      generation: 0,
    });
    $[6] = dedupeKey_2;
    $[7] = makeInitial;
  } else makeInitial = $[7];
  let [attemptState, setAttemptState] = useState(makeInitial);
  if (attemptState.key !== dedupeKey_2)
    setAttemptState({
      key: dedupeKey_2,
      at: Date.now(),
      generation: attemptState.generation + 1,
    });
  let at = attemptState.at;
  let onResponseOnce;
  if ($[8] !== inputClock || $[9] !== at || $[10] !== onResponse) {
    onResponseOnce = (...args) => {
      let args_2 = args;
      if (args_2[0] !== "cancel" && isWithinRecentInput(inputClock, at)) {
        return false;
      }
      return onResponse(...args_2);
    };
    $[8] = inputClock;
    $[9] = at;
    $[10] = onResponse;
    $[11] = onResponseOnce;
  } else onResponseOnce = $[11];
  let onResponse_2 = onResponseOnce;
  if (params.mode === "url") {
    const initialPhase_2 = initialPhase ?? "prompt";
    const userConfirmsCompletion_2 = userConfirmsCompletion ?? false;
    let urlDialog;
    if (
      $[12] !== attemptState.generation ||
      $[13] !== onResponse_2 ||
      $[14] !== onWaitingDismiss ||
      $[15] !== params ||
      $[16] !== serverName ||
      $[17] !== initialPhase_2 ||
      $[18] !== userConfirmsCompletion_2 ||
      $[19] !== waitingState ||
      $[20] !== wouldTakeAnswer
    ) {
      urlDialog = jsxProd_default(
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
        attemptState.generation,
      );
      $[12] = attemptState.generation;
      $[13] = onResponse_2;
      $[14] = onWaitingDismiss;
      $[15] = params;
      $[16] = serverName;
      $[17] = initialPhase_2;
      $[18] = userConfirmsCompletion_2;
      $[19] = waitingState;
      $[20] = wouldTakeAnswer;
      $[21] = urlDialog;
    } else urlDialog = $[21];
    return urlDialog;
  }
  let formDialog;
  if (
    $[22] !== attemptState.generation ||
    $[23] !== onResponse_2 ||
    $[24] !== params ||
    $[25] !== pluginSource ||
    $[26] !== serverName
  ) {
    formDialog = jsxProd_default(
      ElicitationFormDialog,
      {
        serverName,
        pluginSource,
        params,
        onResponse: onResponse_2,
      },
      attemptState.generation,
    );
    $[22] = attemptState.generation;
    $[23] = onResponse_2;
    $[24] = params;
    $[25] = pluginSource;
    $[26] = serverName;
    $[27] = formDialog;
  } else formDialog = $[27];
  return formDialog;
}
//@ chunk-18hwfzwa.js:1209040-1209724 sole-consumer
/**
 * 防误触：对话框刚出现或用户刚在打字时，短时间内拒绝按键提交；返回 {arrived, typed, refuses}。
 */
function useInputGuard(prefilled) {
  let inputClock = useInputClock();
  let clock = useClock();
  let { subscribeFrames } = useContext(APP_CONTEXT);
  let arrivedAtRef = useRef(null);
  let armedRef = useRef(false);
  let mountedRef = useRef(false);
  let typedAtRef = useRef(null);
  let markArrived = useRef(() => {
    if (armedRef.current || !mountedRef.current) return;
    armedRef.current = true;
    unsubscribeRef.current?.();
    if (prefilled || arrivedAtRef.current !== null) arrivedAtRef.current = Date.now();
  });
  let unsubscribeRef = useRef(null);
  if (unsubscribeRef.current === null && !armedRef.current)
    unsubscribeRef.current = subscribeFrames(() => markArrived.current());
  useInsertionEffect(() => {
    mountedRef.current = true;
  }, []);
  useLayoutEffect(() => {
    let cancelTimer = clock.setTimeout(markArrived.current, MAX_URL_FIELD_CHARS);
    return () => {
      cancelTimer();
      unsubscribeRef.current?.();
    };
  }, [clock]);
  return {
    arrived: () => {
      arrivedAtRef.current = Date.now();
    },
    typed: () => {
      typedAtRef.current = Date.now();
    },
    refuses: () => {
      if (!armedRef.current) return true;
      let typedAt = typedAtRef.current;
      if (typedAt !== null && isWithinRecentInput(inputClock, typedAt, INPUT_SETTLE_MS)) {
        typedAtRef.current = Date.now();
        return true;
      }
      let arrivedAt = arrivedAtRef.current;
      if (arrivedAt === null || !isWithinRecentInput(inputClock, arrivedAt)) return false;
      arrivedAtRef.current = Date.now();
      return true;
    },
  };
}
//@ chunk-18hwfzwa.js:1209978-1220738 fingerprint = ElicitationFormDialog (0.541)
function ElicitationFormDialog({ serverName, pluginSource, params, onResponse }) {
  let { message, requestedSchema } = params;
  let { credentials } = useTheme_2();
  let { parseRelatedTaskMetadata } =
    require("../../services/mcp/emitTripwireEvent.lazy.js").mcpElicitationHandlerModule();
  let relatedTaskMetadata = parseRelatedTaskMetadata(params._meta);
  let taskSuffix = relatedTaskMetadata
    ? ` (task ${labelOrEmpty_2(truncateToLength(relatedTaskMetadata.taskId, 8))})`
    : "";
  let hasFields = objectFieldEntries(requestedSchema?.properties).length > 0;
  let CLAUDE_CODE_CONSENT_POINTERLESS =
    !hasFields && hasPluginUserConfig(serverName, pluginSource) && env.CLAUDE_CODE_CONSENT_POINTERLESS;
  let [focusedButton, setFocusedButton, getFocusedButton] = useLatestState(
    hasFields || CLAUDE_CODE_CONSENT_POINTERLESS ? null : "accept",
  );
  let inputGuard = useInputGuard(!hasFields && !CLAUDE_CODE_CONSENT_POINTERLESS);
  let initialForm = useMemo(() => {
    let values = {};
    let errors = {};
    for (let [propName, propSchema] of objectFieldEntries(requestedSchema?.properties)) {
      let validation = restoreElicitationValue(propSchema, propSchema.default);
      if (validation === undefined) continue;
      values[propName] = validation.value;
      if (validation.error !== undefined) errors[propName] = validation.error;
    }
    return {
      values,
      errors,
    };
  }, [requestedSchema]);
  let [formValues, setFormValues] = useState(() => initialForm.values);
  let [validationErrors, setValidationErrors] = useState(() => initialForm.errors);
  let { setRawMode } = useStdin();
  useLayoutEffect(() => {
    setRawMode(true);
    return () => setRawMode(false);
  }, [setRawMode]);
  let schemaFields = useMemo(() => {
    let requiredFields = getDeclaredRequiredFields(requestedSchema);
    return objectFieldEntries(requestedSchema?.properties).map(([name, schema]) => ({
      name,
      schema,
      isRequired: requiredFields.includes(name),
    }));
  }, [requestedSchema]);
  let [currentFieldIndex, setCurrentFieldIndex] = useState(hasFields ? 0 : undefined);
  let [textInputValue, setTextInputValue] = useState(() => {
    let firstField = schemaFields[0];
    if (firstField && isScalarSchemaType(firstField.schema)) {
      let val = formValues[firstField.name];
      if (val === undefined) return "";
      return String(val);
    }
    return "";
  });
  let [textInputCursorOffset, setTextInputCursorOffset] = useState(textInputValue.length);
  let [resolvingFields, setResolvingFields] = useState(() => new Set());
  let [expandedAccordion, setExpandedAccordion] = useState();
  let [accordionOptionIndex, setAccordionOptionIndex] = useState(0);
  let clock = useClock();
  let dateDebounceRef = useRef(undefined);
  let resolveAbortRef = useRef(new Map());
  let enumTypeaheadRef = useRef({
    buffer: "",
    timer: undefined,
  });
  useEffect(
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
  let isTextInputActive =
    currentField !== undefined &&
    isScalarSchemaType(currentField.schema) &&
    !isEnumSchema(currentField.schema) &&
    !focusedButton;
  useRegisterOverlay("elicitation");
  let syncTextInput = useCallback(
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
          let selected = formValues[currentField.name];
          return Array.isArray(selected) ? selected : [];
        })(),
        currentField.isRequired,
      );
      setExpandedAccordion(undefined);
    } else if (currentField && isEnumSchema(currentField.schema)) setExpandedAccordion(undefined);
    if (isTextInputActive && currentField) {
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
    let focusedButton = getFocusedButton();
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
      setFocusedButton(null);
      syncTextInput(nextIndex);
    } else {
      let nextButton = nextIndex === schemaFields.length ? "accept" : "decline";
      if (nextButton === "accept") inputGuard.arrived();
      setCurrentFieldIndex(undefined);
      setFocusedButton(nextButton);
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
      if (isTextInputActive && currentField) {
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
  function onKeyDown(event) {
    let _input = event.key.length === 1 && event.key !== " " && !event.ctrl && !event.meta ? event.key : "";
    if (
      isTextInputActive &&
      event.key !== "up" &&
      event.key !== "down" &&
      event.key !== "return" &&
      event.key !== "backspace"
    )
      return;
    if (expandedAccordion && currentField && isMultiSelectEnumSchema(currentField.schema)) {
      let msSchema = currentField.schema;
      let msValues = getMultiSelectValues(msSchema);
      let rawValue = formValues[currentField.name];
      let selectedValues = Array.isArray(rawValue) ? rawValue : [];
      if (event.key === "left" || event.key === "escape") {
        event.preventDefault();
        setExpandedAccordion(undefined);
        validateMultiSelect(currentField.name, msSchema, selectedValues, currentField.isRequired);
        return;
      }
      if (event.key === "up") {
        event.preventDefault();
        if (accordionOptionIndex === 0) {
          setExpandedAccordion(undefined);
          validateMultiSelect(currentField.name, msSchema, selectedValues, currentField.isRequired);
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
          let newSelected = selectedValues.includes(optionValue)
            ? selectedValues.filter((v) => v !== optionValue)
            : [...selectedValues, optionValue];
          let newValue = newSelected.length > 0 ? newSelected : undefined;
          setField(currentField.name, newValue);
          validateMultiSelect(currentField.name, msSchema, newSelected, currentField.isRequired);
        }
        return;
      }
      if (event.key === "return") {
        event.preventDefault();
        let optionValue = msValues[accordionOptionIndex];
        if (optionValue !== undefined && !selectedValues.includes(optionValue))
          setField(currentField.name, [...selectedValues, optionValue]);
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
    let activeButton = focusedButton ? getFocusedButton() : null;
    if (event.key === "return" && activeButton === "accept") {
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
          setFocusedButton(null);
          syncTextInput(firstBadIndex);
        }
      }
      return;
    }
    if (event.key === "return" && activeButton === "decline") {
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
      if (getFocusedButton() === "decline") inputGuard.arrived();
      setFocusedButton((prev) => (prev === "accept" ? "decline" : prev === "decline" ? "accept" : prev));
      return;
    }
    if (!hasFields && getFocusedButton() === null && (event.key === "left" || event.key === "right")) {
      event.preventDefault();
      inputGuard.arrived();
      setFocusedButton("accept");
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
      if (isTextInputActive && textInputValue === "") {
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
  let isFullscreen = isFullscreenActive();
  let buttonRows = 2;
  let bodyRows = isFullscreen
    ? hasScrollViewport
      ? rows
      : rows - OVERLAY_BATCH_SIZE - buttonRows - unattendedNotice
    : rows;
  let chromeRows = 5;
  let titleRows = 2;
  let LINES_PER_FIELD = 3;
  let subtitleRows = isFullscreen ? (bodyRows >= 18 ? 1 : 0) : 1;
  let headerRows = schemaFields.length > 1 ? titleRows : 0;
  let pluginTitle = pluginUserConfigTitle(serverName, pluginSource);
  let customTitle =
    pluginTitle !== undefined && isFlagOnWithInternalOverride(TENGU_AMBER_QUILLWORT)
      ? pluginTitle
      : undefined;
  let maxMessageRows = customTitle !== undefined ? MAX_URL_PARTS : MAX_DEFAULT_TRUNCATE_LINES + 1;
  let min = Math.min(
    maxMessageRows,
    Math.max(
      1,
      bodyRows - chromeRows - subtitleRows - headerRows - Math.min(2, schemaFields.length) * LINES_PER_FIELD,
    ),
  );
  let maxVisibleFields = Math.max(
    1,
    bodyRows - chromeRows - subtitleRows - headerRows - Math.min(1, schemaFields.length) * LINES_PER_FIELD,
  );
  let messageRows = isFullscreen
    ? Math.min(min, maxVisibleFields)
    : customTitle === undefined
      ? maxMessageRows
      : Math.max(MAX_DEFAULT_TRUNCATE_LINES + 1, Math.min(min, maxVisibleFields - buttonRows));
  let scrollWindow = useMemo(
    () => truncateLines(displayField(message).text, columns, messageRows),
    [message, columns, messageRows],
  );
  let subtitle = scrollWindow
    ? subtitleRows
      ? `
${scrollWindow}`
      : scrollWindow
    : undefined;
  let subtitleHeight = scrollWindow
    ? subtitleRows +
      countCharInString(
        scrollWindow,
        `
`,
      ) +
      1
    : 0;
  let remainingRows = bodyRows - chromeRows - subtitleHeight - headerRows;
  let expandedField =
    expandedAccordion !== undefined
      ? schemaFields.find((schemaField) => schemaField.name === expandedAccordion)
      : undefined;
  let optionCount = expandedField
    ? isMultiSelectEnumSchema(expandedField.schema)
      ? getMultiSelectValues(expandedField.schema).length
      : isEnumSchema(expandedField.schema)
        ? getEnumValues(expandedField.schema).length
        : 0
    : 0;
  let accordionRows = remainingRows - LINES_PER_FIELD;
  let optionWindow = useMemo(() => {
    if (!isFullscreen || optionCount <= accordionRows) return null;
    let max = Math.max(1, accordionRows);
    let max_2 = Math.max(1, max - 2);
    let start = Math.max(0, accordionOptionIndex - Math.floor(max_2 / 2));
    let end = Math.min(start + max_2, optionCount);
    start = Math.max(0, end - max_2);
    let showAbove = start > 0;
    let showBelow = end < optionCount;
    let overflow = end - start + (showAbove ? 1 : 0) + (showBelow ? 1 : 0) - max;
    if (overflow > 0 && showAbove) {
      showAbove = false;
      overflow--;
    }
    if (overflow > 0) showBelow = false;
    return {
      start,
      end,
      showAbove,
      showBelow,
    };
  }, [isFullscreen, optionCount, accordionRows, accordionOptionIndex]);
  let optionWindowRows =
    !isFullscreen || optionCount === 0
      ? 0
      : optionWindow === null
        ? optionCount
        : optionWindow.end -
          optionWindow.start +
          (optionWindow.showAbove ? 1 : 0) +
          (optionWindow.showBelow ? 1 : 0);
  let maxVisibleFields_2 = isFullscreen
    ? Math.max(1, Math.floor((remainingRows - optionWindowRows) / LINES_PER_FIELD))
    : Math.max(2, Math.floor((rows - 14) / LINES_PER_FIELD));
  let scrollWindow_2 = useMemo(() => {
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
  let titlePrefix = "MCP server \u201C";
  let titleSuffix = "\u201D requests your input";
  let max_2 = Math.max(MIN_TRUNCATE_WIDTH, columns - max);
  let shortSuffix =
    max_2 - bunStringWidth(titlePrefix) - bunStringWidth(`${titleSuffix}${taskSuffix}`) >=
    MAX_ENUM_LABEL_CHARS
      ? `${titleSuffix}${taskSuffix}`
      : titleSuffix;
  let fullTitle = isFullscreen
    ? truncateToWidth(
        titlePrefix +
          truncateToWidth(
            labelOrEmpty(serverName),
            Math.max(1, max_2 - bunStringWidth(titlePrefix) - bunStringWidth(shortSuffix)),
          ) +
          shortSuffix,
        max_2,
      )
    : `${titlePrefix}${labelOrEmpty(serverName)}${titleSuffix}${taskSuffix}`;
  let title = customTitle === undefined ? fullTitle : truncateToWidth(customTitle, max_2);
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
      onKeyDown,
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
          optionWindow,
          clampFieldRows: isFullscreen,
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
  let $ = useMemoCache(163);
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
  let rawPayload;
  if ($[0] !== url) {
    rawPayload = serializeApprovalPayload(url, {
      maxUnits: MAX_PAYLOAD_UNITS,
      softWrap: true,
    });
    $[0] = url;
    $[1] = rawPayload;
  } else rawPayload = $[1];
  let rawPayload_2 = rawPayload;
  let normalizedHref;
  if ($[2] !== url) {
    normalizedHref = normalizeUrlHref(url);
    $[2] = url;
    $[3] = normalizedHref;
  } else normalizedHref = $[3];
  let href = normalizedHref;
  let hrefPayload;
  if ($[4] !== href) {
    hrefPayload = serializeApprovalPayload(href, {
      maxUnits: MAX_PAYLOAD_UNITS,
      softWrap: true,
    });
    $[4] = href;
    $[5] = hrefPayload;
  } else hrefPayload = $[5];
  let hrefPayload_2 = hrefPayload;
  let messageText;
  if ($[6] !== columns || $[7] !== message) {
    messageText = truncateLines(displayField(message).text, columns);
    $[6] = columns;
    $[7] = message;
    $[8] = messageText;
  } else messageText = $[8];
  let subtitle = `
${messageText}`;
  let payloadExact;
  if (
    $[9] !== hrefPayload_2 ||
    $[10] !== href ||
    $[11] !== url ||
    $[12] !== rawPayload_2.kind ||
    $[13] !== rawPayload_2.text
  ) {
    payloadExact =
      rawPayload_2.kind === "full" &&
      rawPayload_2.text.replaceAll(
        `
`,
        "",
      ) === url &&
      !hasDisplayUnsafeChar(url) &&
      !/[\n\r\u2028\u2029]/.test(url) &&
      hrefPayload_2.kind === "full" &&
      hrefPayload_2.text.replaceAll(
        `
`,
        "",
      ) === href &&
      !hasDisplayUnsafeChar(href) &&
      !/[\n\r\u2028\u2029]/.test(href);
    $[9] = hrefPayload_2;
    $[10] = href;
    $[11] = url;
    $[12] = rawPayload_2.kind;
    $[13] = rawPayload_2.text;
    $[14] = payloadExact;
  } else payloadExact = $[14];
  let payloadExact_2 = payloadExact;
  let hostname;
  let urlPrefix = "";
  let urlSuffix = "";
  let hasHostname;
  if ($[15] !== href) {
    hasHostname = false;
    try {
      hostname = new URL(href).hostname;
      let domainStart = href.indexOf(hostname);
      if (hostname !== "" && domainStart !== -1) {
        hasHostname = true;
        urlPrefix = href.slice(0, domainStart);
        urlSuffix = href.slice(domainStart + hostname.length);
      }
    } catch {
      hostname = href;
    }
    $[15] = href;
    $[16] = hasHostname;
    $[17] = hostname;
    $[18] = urlPrefix;
    $[19] = urlSuffix;
  } else {
    hasHostname = $[16];
    hostname = $[17];
    urlPrefix = $[18];
    urlSuffix = $[19];
  }
  let bodyRows = rows - 12;
  hasHostname;
  let tooLarge;
  Ho: {
    if (bodyRows < 1) {
      tooLarge = true;
      break Ho;
    }
    let contentWidth = columns - 6;
    if (contentWidth < 20) {
      tooLarge = true;
      break Ho;
    }
    let measuredText = hasHostname ? href : hrefPayload_2.kind === "full" ? hrefPayload_2.text : href;
    let lineBreaks;
    if ($[20] !== contentWidth || $[21] !== measuredText) {
      lineBreaks = countCharInString(
        wrapText(measuredText, contentWidth, "wrap"),
        `
`,
      );
      $[20] = contentWidth;
      $[21] = measuredText;
      $[22] = lineBreaks;
    } else lineBreaks = $[22];
    tooLarge = lineBreaks + 1 > bodyRows;
  }
  let tooLarge_2 = tooLarge;
  let canOpen = payloadExact_2 && elicitationUrlCost(href) <= MAX_URL_COST_CHARS;
  let [phase, setPhase] = useState(initialPhase);
  let inputClock = useInputClock();
  let [nowMs] = useState(getNowMs);
  let waitingSinceRef = useRef(initialPhase === "waiting" ? nowMs : undefined);
  let [focus, setFocus, getFocus] = useLatestState(
    initialPhase === "waiting"
      ? "open"
      : canOpen && !tooLarge_2
        ? userConfirmsCompletion
          ? "open"
          : "accept"
        : "decline",
  );
  let downgradeEffect;
  let downgradeDeps;
  if ($[23] !== setFocus || $[24] !== tooLarge_2 || $[25] !== canOpen || $[26] !== userConfirmsCompletion) {
    downgradeEffect = () => {
      if (!canOpen || tooLarge_2)
        setFocus((prev) =>
          prev === "accept" || (prev === "open" && userConfirmsCompletion) ? "decline" : prev,
        );
    };
    downgradeDeps = [canOpen, tooLarge_2, userConfirmsCompletion, setFocus];
    $[23] = setFocus;
    $[24] = tooLarge_2;
    $[25] = canOpen;
    $[26] = userConfirmsCompletion;
    $[27] = downgradeEffect;
    $[28] = downgradeDeps;
  } else {
    downgradeEffect = $[27];
    downgradeDeps = $[28];
  }
  useEffect(downgradeEffect, downgradeDeps);
  let inputGuard = useInputGuard(initialPhase !== "waiting" && canOpen && !tooLarge_2);
  let showCancel = waitingState?.showCancel ?? false;
  let { setRawMode } = useStdin();
  let rawModeDeps;
  let rawModeEffect;
  if ($[29] !== setRawMode) {
    rawModeEffect = () => {
      setRawMode(true);
      return () => setRawMode(false);
    };
    rawModeDeps = [setRawMode];
    $[29] = setRawMode;
    $[30] = rawModeDeps;
    $[31] = rawModeEffect;
  } else {
    rawModeDeps = $[30];
    rawModeEffect = $[31];
  }
  useLayoutEffect(rawModeEffect, rawModeDeps);
  useRegisterOverlay("elicitation-url");
  let answeredRef = useRef(false);
  let openUrl;
  if (
    $[32] !== href ||
    $[33] !== onResponse ||
    $[34] !== setFocus ||
    $[35] !== canOpen ||
    $[36] !== userConfirmsCompletion
  ) {
    openUrl = () => {
      if (!canOpen || answeredRef.current) {
        return;
      }
      if (onResponse("accept") === false) {
        return;
      }
      answeredRef.current = true;
      if (userConfirmsCompletion) {
        return;
      }
      waitingSinceRef.current = Date.now();
      openValidatedUrlSucceeded(href);
      setPhase("waiting");
      setFocus("open");
    };
    $[32] = href;
    $[33] = onResponse;
    $[34] = setFocus;
    $[35] = canOpen;
    $[36] = userConfirmsCompletion;
    $[37] = openUrl;
  } else openUrl = $[37];
  let openUrl_2 = openUrl;
  let [reopened, setReopened] = useState(false);
  let applyExternalAnswer;
  if (
    $[38] !== inputGuard ||
    $[39] !== href ||
    $[40] !== setFocus ||
    $[41] !== canOpen ||
    $[42] !== wouldTakeAnswer
  ) {
    applyExternalAnswer = function applyExternalAnswer() {
      if (!canOpen || answeredRef.current || wouldTakeAnswer?.() !== true) {
        return;
      }
      openValidatedUrlSucceeded(href);
      setReopened(true);
      inputGuard.arrived();
      setFocus("accept");
    };
    $[38] = inputGuard;
    $[39] = href;
    $[40] = setFocus;
    $[41] = canOpen;
    $[42] = wouldTakeAnswer;
    $[43] = applyExternalAnswer;
  } else applyExternalAnswer = $[43];
  let applyExternalAnswer_2 = applyExternalAnswer;
  let onKeyDown;
  if (
    $[44] !== inputGuard ||
    $[45] !== href ||
    $[46] !== getFocus ||
    $[47] !== openUrl_2 ||
    $[48] !== applyExternalAnswer_2 ||
    $[49] !== inputClock ||
    $[50] !== onResponse ||
    $[51] !== onWaitingDismiss ||
    $[52] !== phase ||
    $[53] !== setFocus ||
    $[54] !== showCancel ||
    $[55] !== canOpen ||
    $[56] !== userConfirmsCompletion
  ) {
    onKeyDown = function onKeyDown(prev) {
      if (phase === "prompt") {
        if (prev.key === "left" || prev.key === "right") {
          prev.preventDefault();
          if (canOpen && userConfirmsCompletion) {
            let promptActions = ["open", "accept", "decline"];
            let index = promptActions.indexOf(getFocus());
            let nextAction = promptActions[(index + (prev.key === "right" ? 1 : -1) + 3) % 3];
            if (nextAction !== "decline") inputGuard.arrived();
            setFocus(nextAction);
          } else if (canOpen) {
            if (getFocus() === "decline") inputGuard.arrived();
            setFocus(flipElicitationAction);
          }
          return;
        }
        if (prev.key === "return") {
          prev.preventDefault();
          let action = getFocus();
          if (action === "open" && userConfirmsCompletion) {
            if (inputGuard.refuses()) {
              return;
            }
            applyExternalAnswer_2();
          } else if (action === "accept") {
            if (inputGuard.refuses()) {
              return;
            }
            openUrl_2();
          } else if (action === "decline" && !answeredRef.current) onResponse("decline");
        }
        if (isTextInputKey(prev)) inputGuard.typed();
      } else {
        let waitingActions = showCancel ? ["open", "action", "cancel"] : ["open", "action"];
        if (prev.key === "left" || prev.key === "right") {
          prev.preventDefault();
          let forward = prev.key === "right";
          setFocus((prev) => {
            let idx = waitingActions.indexOf(prev);
            return waitingActions[(idx + (forward ? 1 : -1) + waitingActions.length) % waitingActions.length];
          });
          return;
        }
        if (prev.key === "return") {
          prev.preventDefault();
          let waitingSince = waitingSinceRef.current;
          if (waitingSince !== undefined && isWithinRecentInput(inputClock, waitingSince)) {
            return;
          }
          let action = getFocus();
          if (action === "open") {
            if (canOpen) openValidatedUrlSucceeded(href);
          } else if (action === "cancel") onWaitingDismiss?.("cancel");
          else onWaitingDismiss?.(showCancel ? "retry" : "dismiss");
        }
      }
    };
    $[44] = inputGuard;
    $[45] = href;
    $[46] = getFocus;
    $[47] = openUrl_2;
    $[48] = applyExternalAnswer_2;
    $[49] = inputClock;
    $[50] = onResponse;
    $[51] = onWaitingDismiss;
    $[52] = phase;
    $[53] = setFocus;
    $[54] = showCancel;
    $[55] = canOpen;
    $[56] = userConfirmsCompletion;
    $[57] = onKeyDown;
  } else onKeyDown = $[57];
  let onKeyDown_2 = onKeyDown;
  if (phase === "waiting") {
    let actionLabel = waitingState?.actionLabel ?? "Continue without waiting";
    let serverLabel;
    if ($[58] !== serverName) {
      serverLabel = labelOrEmpty(serverName);
      $[58] = serverName;
      $[59] = serverLabel;
    } else serverLabel = $[59];
    const title = `MCP server \u201C${serverLabel}\u201D \u2014 waiting for completion`;
    let onCancel;
    if ($[60] !== onWaitingDismiss) {
      onCancel = () => onWaitingDismiss?.("cancel");
      $[60] = onWaitingDismiss;
      $[61] = onCancel;
    } else onCancel = $[61];
    let cancelHint;
    if ($[62] === MEMO_CACHE_SENTINEL) {
      cancelHint = jsxProd_default(ConfigurableShortcutHint, {
        action: "confirm:no",
        context: "Confirmation",
        fallback: "Esc",
        description: "cancel",
      });
      $[62] = cancelHint;
    } else cancelHint = $[62];
    let inputGuide;
    if ($[63] === MEMO_CACHE_SENTINEL) {
      inputGuide = jsxProd_default_2(Byline, {
        children: [
          cancelHint,
          jsxProd_default(KeyboardShortcutHint, {
            chord: ["left", "right"],
            action: "switch",
          }),
        ],
      });
      $[63] = inputGuide;
    } else inputGuide = $[63];
    let urlBox;
    if (
      $[64] !== hrefPayload_2 ||
      $[65] !== hostname ||
      $[66] !== hasHostname ||
      $[67] !== urlSuffix ||
      $[68] !== urlPrefix ||
      $[69] !== rawPayload_2.kind ||
      $[70] !== rawPayload_2.marker ||
      $[71] !== rawPayload_2.needsGutter ||
      $[72] !== rawPayload_2.text ||
      $[73] !== canOpen ||
      $[74] !== payloadExact_2
    ) {
      urlBox = jsxProd_default(Box, {
        marginBottom: 1,
        flexDirection: "column",
        children:
          canOpen || payloadExact_2
            ? jsxProd_default(Blockquote, {
                multiline: hrefPayload_2.kind === "full" && hrefPayload_2.needsGutter,
                children: hasHostname
                  ? jsxProd_default_2(Text, {
                      children: [
                        urlPrefix,
                        jsxProd_default(Text, {
                          bold: true,
                          children: hostname,
                        }),
                        urlSuffix,
                      ],
                    })
                  : jsxProd_default(Text, {
                      children: hrefPayload_2.kind === "full" ? hrefPayload_2.text : null,
                    }),
              })
            : jsxProd_default(Blockquote, {
                multiline: rawPayload_2.kind === "full" && rawPayload_2.needsGutter,
                children: jsxProd_default(Text, {
                  children: rawPayload_2.kind === "full" ? rawPayload_2.text : rawPayload_2.marker,
                }),
              }),
      });
      $[64] = hrefPayload_2;
      $[65] = hostname;
      $[66] = hasHostname;
      $[67] = urlSuffix;
      $[68] = urlPrefix;
      $[69] = rawPayload_2.kind;
      $[70] = rawPayload_2.marker;
      $[71] = rawPayload_2.needsGutter;
      $[72] = rawPayload_2.text;
      $[73] = canOpen;
      $[74] = payloadExact_2;
      $[75] = urlBox;
    } else urlBox = $[75];
    let waitingNotice;
    if ($[76] === MEMO_CACHE_SENTINEL) {
      waitingNotice = jsxProd_default(Box, {
        marginBottom: 1,
        children: jsxProd_default(Text, {
          dimColor: true,
          italic: true,
          children: "Waiting for the server to confirm completion\u2026",
        }),
      });
      $[76] = waitingNotice;
    } else waitingNotice = $[76];
    const children = focus === "open" ? figures_default.pointer : " ";
    let reopenPointer;
    if ($[77] !== children) {
      reopenPointer = jsxProd_default(Text, {
        color: "success",
        children,
      });
      $[77] = children;
      $[78] = reopenPointer;
    } else reopenPointer = $[78];
    const bold = focus === "open";
    const color = focus === "open" ? "success" : undefined;
    const dimColor = focus !== "open";
    let reopenButton;
    if ($[79] !== bold || $[80] !== color || $[81] !== dimColor) {
      reopenButton = jsxProd_default(Text, {
        bold,
        color,
        dimColor,
        children: " Reopen URL  ",
      });
      $[79] = bold;
      $[80] = color;
      $[81] = dimColor;
      $[82] = reopenButton;
    } else reopenButton = $[82];
    const children_2 = focus === "action" ? figures_default.pointer : " ";
    let actionPointer;
    if ($[83] !== children_2) {
      actionPointer = jsxProd_default(Text, {
        color: "success",
        children: children_2,
      });
      $[83] = children_2;
      $[84] = actionPointer;
    } else actionPointer = $[84];
    const bold_2 = focus === "action";
    const color_2 = focus === "action" ? "success" : undefined;
    const dimColor_2 = focus !== "action";
    const children_3 = ` ${actionLabel}`;
    let actionButton;
    if ($[85] !== bold_2 || $[86] !== color_2 || $[87] !== dimColor_2 || $[88] !== children_3) {
      actionButton = jsxProd_default(Text, {
        bold: bold_2,
        color: color_2,
        dimColor: dimColor_2,
        children: children_3,
      });
      $[85] = bold_2;
      $[86] = color_2;
      $[87] = dimColor_2;
      $[88] = children_3;
      $[89] = actionButton;
    } else actionButton = $[89];
    let cancelButton;
    if ($[90] !== focus || $[91] !== showCancel) {
      cancelButton =
        showCancel &&
        jsxProd_default_2(Fragment, {
          children: [
            jsxProd_default(Text, {
              children: " ",
            }),
            jsxProd_default(Text, {
              color: "error",
              children: focus === "cancel" ? figures_default.pointer : " ",
            }),
            jsxProd_default(Text, {
              bold: focus === "cancel",
              color: focus === "cancel" ? "error" : undefined,
              dimColor: focus !== "cancel",
              children: " Cancel",
            }),
          ],
        });
      $[90] = focus;
      $[91] = showCancel;
      $[92] = cancelButton;
    } else cancelButton = $[92];
    let buttons;
    if (
      $[93] !== reopenPointer ||
      $[94] !== reopenButton ||
      $[95] !== actionPointer ||
      $[96] !== actionButton ||
      $[97] !== cancelButton
    ) {
      buttons = jsxProd_default_2(Box, {
        children: [reopenPointer, reopenButton, actionPointer, actionButton, cancelButton],
      });
      $[93] = reopenPointer;
      $[94] = reopenButton;
      $[95] = actionPointer;
      $[96] = actionButton;
      $[97] = cancelButton;
      $[98] = buttons;
    } else buttons = $[98];
    let children_4;
    if ($[99] !== onKeyDown_2 || $[100] !== urlBox || $[101] !== buttons) {
      children_4 = jsxProd_default_2(FocusColumn, {
        onKeyDown: onKeyDown_2,
        children: [urlBox, waitingNotice, buttons],
      });
      $[99] = onKeyDown_2;
      $[100] = urlBox;
      $[101] = buttons;
      $[102] = children_4;
    } else children_4 = $[102];
    let waitingDialog;
    if ($[103] !== subtitle || $[104] !== title || $[105] !== onCancel || $[106] !== children_4) {
      waitingDialog = jsxProd_default(Dialog, {
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
      $[107] = waitingDialog;
    } else waitingDialog = $[107];
    return waitingDialog;
  }
  let serverLabel;
  if ($[108] !== serverName) {
    serverLabel = labelOrEmpty(serverName);
    $[108] = serverName;
    $[109] = serverLabel;
  } else serverLabel = $[109];
  const title = `MCP server \u201C${serverLabel}\u201D wants to open a URL`;
  let onCancel;
  if ($[110] !== onResponse) {
    onCancel = () => onResponse("cancel");
    $[110] = onResponse;
    $[111] = onCancel;
  } else onCancel = $[111];
  let cancelHint;
  if ($[112] === MEMO_CACHE_SENTINEL) {
    cancelHint = jsxProd_default(ConfigurableShortcutHint, {
      action: "confirm:no",
      context: "Confirmation",
      fallback: "Esc",
      description: "cancel",
    });
    $[112] = cancelHint;
  } else cancelHint = $[112];
  let inputGuide;
  if ($[113] === MEMO_CACHE_SENTINEL) {
    inputGuide = jsxProd_default_2(Byline, {
      children: [
        cancelHint,
        jsxProd_default(KeyboardShortcutHint, {
          chord: ["left", "right"],
          action: "switch",
        }),
      ],
    });
    $[113] = inputGuide;
  } else inputGuide = $[113];
  let urlBox;
  if (
    $[114] !== hrefPayload_2 ||
    $[115] !== hostname ||
    $[116] !== hasHostname ||
    $[117] !== urlSuffix ||
    $[118] !== urlPrefix ||
    $[119] !== rawPayload_2.kind ||
    $[120] !== rawPayload_2.marker ||
    $[121] !== rawPayload_2.needsGutter ||
    $[122] !== rawPayload_2.text ||
    $[123] !== canOpen ||
    $[124] !== payloadExact_2
  ) {
    urlBox = jsxProd_default(Box, {
      marginBottom: 1,
      flexDirection: "column",
      children:
        canOpen || payloadExact_2
          ? jsxProd_default(Blockquote, {
              multiline: hrefPayload_2.kind === "full" && hrefPayload_2.needsGutter,
              children: hasHostname
                ? jsxProd_default_2(Text, {
                    children: [
                      urlPrefix,
                      jsxProd_default(Text, {
                        bold: true,
                        children: hostname,
                      }),
                      urlSuffix,
                    ],
                  })
                : jsxProd_default(Text, {
                    children: hrefPayload_2.kind === "full" ? hrefPayload_2.text : null,
                  }),
            })
          : jsxProd_default(Blockquote, {
              multiline: rawPayload_2.kind === "full" && rawPayload_2.needsGutter,
              children: jsxProd_default(Text, {
                children: rawPayload_2.kind === "full" ? rawPayload_2.text : rawPayload_2.marker,
              }),
            }),
    });
    $[114] = hrefPayload_2;
    $[115] = hostname;
    $[116] = hasHostname;
    $[117] = urlSuffix;
    $[118] = urlPrefix;
    $[119] = rawPayload_2.kind;
    $[120] = rawPayload_2.marker;
    $[121] = rawPayload_2.needsGutter;
    $[122] = rawPayload_2.text;
    $[123] = canOpen;
    $[124] = payloadExact_2;
    $[125] = urlBox;
  } else urlBox = $[125];
  let unsafeNotice;
  if ($[126] !== canOpen || $[127] !== payloadExact_2) {
    unsafeNotice =
      !canOpen &&
      jsxProd_default(Box, {
        marginBottom: 1,
        children: jsxProd_default(Text, {
          dimColor: true,
          children: payloadExact_2
            ? "This URL\u2019s browser-ready form is too long to hand to a browser safely, so one-click opening is disabled. The URL above is shown in full. Decline to continue."
            : "This URL cannot be shown exactly as it would open, so opening it is disabled. Decline to continue.",
        }),
      });
    $[126] = canOpen;
    $[127] = payloadExact_2;
    $[128] = unsafeNotice;
  } else unsafeNotice = $[128];
  let truncatedNotice;
  if ($[129] !== tooLarge_2 || $[130] !== canOpen) {
    truncatedNotice =
      canOpen &&
      tooLarge_2 &&
      jsxProd_default(Box, {
        marginBottom: 1,
        children: jsxProd_default(Text, {
          dimColor: true,
          children:
            "This URL extends past this screen \u2014 its beginning is not visible here. Review it in full before you continue.",
        }),
      });
    $[129] = tooLarge_2;
    $[130] = canOpen;
    $[131] = truncatedNotice;
  } else truncatedNotice = $[131];
  let openButton;
  if ($[132] !== focus || $[133] !== reopened || $[134] !== canOpen || $[135] !== userConfirmsCompletion) {
    openButton =
      canOpen &&
      userConfirmsCompletion &&
      jsxProd_default_2(Fragment, {
        children: [
          jsxProd_default(Text, {
            color: "success",
            children: focus === "open" ? figures_default.pointer : " ",
          }),
          jsxProd_default(Text, {
            bold: focus === "open",
            color: focus === "open" ? "success" : undefined,
            dimColor: focus !== "open",
            children: reopened ? " Open again  " : " Open in browser  ",
          }),
        ],
      });
    $[132] = focus;
    $[133] = reopened;
    $[134] = canOpen;
    $[135] = userConfirmsCompletion;
    $[136] = openButton;
  } else openButton = $[136];
  let acceptButton;
  if ($[137] !== focus || $[138] !== canOpen || $[139] !== userConfirmsCompletion) {
    acceptButton =
      canOpen &&
      jsxProd_default_2(Fragment, {
        children: [
          jsxProd_default(Text, {
            color: "success",
            children: focus === "accept" ? figures_default.pointer : " ",
          }),
          jsxProd_default(Text, {
            bold: focus === "accept",
            color: focus === "accept" ? "success" : undefined,
            dimColor: focus !== "accept",
            children: userConfirmsCompletion ? " I'm done, continue  " : " Accept  ",
          }),
        ],
      });
    $[137] = focus;
    $[138] = canOpen;
    $[139] = userConfirmsCompletion;
    $[140] = acceptButton;
  } else acceptButton = $[140];
  const children = focus === "decline" ? figures_default.pointer : " ";
  let declinePointer;
  if ($[141] !== children) {
    declinePointer = jsxProd_default(Text, {
      color: "error",
      children,
    });
    $[141] = children;
    $[142] = declinePointer;
  } else declinePointer = $[142];
  const bold = focus === "decline";
  const color = focus === "decline" ? "error" : undefined;
  const dimColor = focus !== "decline";
  let declineButton;
  if ($[143] !== bold || $[144] !== color || $[145] !== dimColor) {
    declineButton = jsxProd_default(Text, {
      bold,
      color,
      dimColor,
      children: " Decline",
    });
    $[143] = bold;
    $[144] = color;
    $[145] = dimColor;
    $[146] = declineButton;
  } else declineButton = $[146];
  let buttons;
  if (
    $[147] !== openButton ||
    $[148] !== acceptButton ||
    $[149] !== declinePointer ||
    $[150] !== declineButton
  ) {
    buttons = jsxProd_default_2(Box, {
      children: [openButton, acceptButton, declinePointer, declineButton],
    });
    $[147] = openButton;
    $[148] = acceptButton;
    $[149] = declinePointer;
    $[150] = declineButton;
    $[151] = buttons;
  } else buttons = $[151];
  let children_2;
  if (
    $[152] !== onKeyDown_2 ||
    $[153] !== urlBox ||
    $[154] !== unsafeNotice ||
    $[155] !== truncatedNotice ||
    $[156] !== buttons
  ) {
    children_2 = jsxProd_default_2(FocusColumn, {
      onKeyDown: onKeyDown_2,
      children: [urlBox, unsafeNotice, truncatedNotice, buttons],
    });
    $[152] = onKeyDown_2;
    $[153] = urlBox;
    $[154] = unsafeNotice;
    $[155] = truncatedNotice;
    $[156] = buttons;
    $[157] = children_2;
  } else children_2 = $[157];
  let promptDialog;
  if ($[158] !== subtitle || $[159] !== title || $[160] !== onCancel || $[161] !== children_2) {
    promptDialog = jsxProd_default(Dialog, {
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
    $[162] = promptDialog;
  } else promptDialog = $[162];
  return promptDialog;
}
//@ chunk-18hwfzwa.js:1231333-1237471 placement
/**
 * MCP elicitation 表单：按服务器给出的 schema 渲染字段、校验输入并提交。
 */
function ElicitationForm(props) {
  let $ = useMemoCache(51);
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
  let hasAbove = scrollWindow.start > 0;
  let hasBelow = scrollWindow.end < schemaFields.length;
  let aboveHint;
  if ($[0] !== hasAbove || $[1] !== scrollWindow.start) {
    aboveHint =
      hasAbove &&
      jsxProd_default(Box, {
        marginLeft: 2,
        children: jsxProd_default_2(Text, {
          dimColor: true,
          children: [figures_default.arrowUp, " ", scrollWindow.start, " more above"],
        }),
      });
    $[0] = hasAbove;
    $[1] = scrollWindow.start;
    $[2] = aboveHint;
  } else aboveHint = $[2];
  let fieldRows;
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
    let renderField;
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
      renderField = (field, sliceIndex) => {
        let fieldIndex = scrollWindow.start + sliceIndex;
        let { name, schema, isRequired } = field;
        let isPassword = isPluginPasswordField(serverName, pluginSource, name, schema);
        let isFocused = fieldIndex === currentFieldIndex && !focusedButton;
        let value = formValues[name];
        let isSet = value !== undefined && (!Array.isArray(value) || value.length > 0);
        let error = validationErrors[name];
        let statusIcon = resolvingFields.has(name)
          ? jsxProd_default(ResolvingSpinner, {})
          : error
            ? jsxProd_default(Text, {
                color: "error",
                children: figures_default.warning,
              })
            : isSet
              ? jsxProd_default(Text, {
                  color: "success",
                  dimColor: !isFocused,
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
        let tone = error ? "error" : isSet ? "success" : isRequired ? "error" : "suggestion";
        let color = isFocused ? tone : undefined;
        let title = schema.title || name;
        let label = clampFieldRows
          ? truncateToWidth(labelOrEmpty_2(title), Math.max(8, columns - max - 8 - MIN_TRUNCATE_WIDTH))
          : labelOrEmpty_2(title);
        let labelText = jsxProd_default(Text, {
          color,
          bold: isFocused,
          children: label,
        });
        let max_2 = Math.max(MIN_TRUNCATE_WIDTH, columns - max - 8 - bunStringWidth(label));
        let max_3 = Math.max(MIN_TRUNCATE_WIDTH, columns - max - 6 - 4);
        let valueNode;
        let optionsBox = null;
        if (isMultiSelectEnumSchema(schema)) {
          let multiSelectValues = getMultiSelectValues(schema);
          let selectedValues = Array.isArray(value) ? value : [];
          if (expandedAccordion === name && isFocused) {
            valueNode = jsxProd_default(Text, {
              dimColor: true,
              children: figures_default.triangleDownSmall,
            });
            let visibleWindow = optionWindow ?? {
              start: 0,
              end: multiSelectValues.length,
              showAbove: false,
              showBelow: false,
            };
            optionsBox = jsxProd_default_2(Box, {
              flexDirection: "column",
              marginLeft: 6,
              children: [
                visibleWindow.showAbove &&
                  jsxProd_default_2(Text, {
                    dimColor: true,
                    children: [figures_default.arrowUp, " ", visibleWindow.start, " more above"],
                  }),
                multiSelectValues
                  .slice(visibleWindow.start, visibleWindow.end)
                  .map((multiSelectValue, optionIndex) => {
                    let absoluteIndex = visibleWindow.start + optionIndex;
                    let children = clampFieldRows
                      ? truncateToWidth(labelOrEmpty_2(getMultiSelectLabel(schema, multiSelectValue)), max_3)
                      : labelOrEmpty_2(getMultiSelectLabel(schema, multiSelectValue));
                    let included = selectedValues.includes(multiSelectValue);
                    let isHighlighted = absoluteIndex === accordionOptionIndex;
                    return jsxProd_default_2(
                      Box,
                      {
                        gap: 1,
                        children: [
                          jsxProd_default(Text, {
                            color: "suggestion",
                            children: isHighlighted ? figures_default.pointer : " ",
                          }),
                          jsxProd_default(Text, {
                            color: included ? "success" : undefined,
                            children: included ? figures_default.checkboxOn : figures_default.checkboxOff,
                          }),
                          jsxProd_default(Text, {
                            color: isHighlighted ? "suggestion" : undefined,
                            bold: isHighlighted,
                            children,
                          }),
                        ],
                      },
                      multiSelectValue,
                    );
                  }),
                visibleWindow.showBelow &&
                  jsxProd_default_2(Text, {
                    dimColor: true,
                    children: [
                      figures_default.arrowDown,
                      " ",
                      multiSelectValues.length - visibleWindow.end,
                      " ",
                      "more below",
                    ],
                  }),
              ],
            });
          } else {
            let collapsedMarker = isFocused
              ? jsxProd_default_2(Text, {
                  dimColor: true,
                  children: [figures_default.triangleRightSmall, " "],
                })
              : null;
            if (selectedValues.length > 0) {
              let joined = selectedValues
                .map((selectedValue) => labelOrEmpty_2(getMultiSelectLabel(schema, selectedValue)))
                .join(", ");
              valueNode = jsxProd_default_2(Text, {
                children: [
                  collapsedMarker,
                  jsxProd_default(Text, {
                    color,
                    bold: isFocused,
                    children: clampFieldRows ? truncateToWidth(joined, max_2) : joined,
                  }),
                ],
              });
            } else
              valueNode = jsxProd_default_2(Text, {
                children: [
                  collapsedMarker,
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
          if (expandedAccordion === name && isFocused) {
            valueNode = jsxProd_default(Text, {
              dimColor: true,
              children: figures_default.triangleDownSmall,
            });
            let visibleWindow = optionWindow ?? {
              start: 0,
              end: enumValues.length,
              showAbove: false,
              showBelow: false,
            };
            optionsBox = jsxProd_default_2(Box, {
              flexDirection: "column",
              marginLeft: 6,
              children: [
                visibleWindow.showAbove &&
                  jsxProd_default_2(Text, {
                    dimColor: true,
                    children: [figures_default.arrowUp, " ", visibleWindow.start, " more above"],
                  }),
                enumValues.slice(visibleWindow.start, visibleWindow.end).map((enumValue, optionIndex) => {
                  let absoluteIndex = visibleWindow.start + optionIndex;
                  let children = clampFieldRows
                    ? truncateToWidth(labelOrEmpty_2(getEnumLabel(schema, enumValue)), max_3)
                    : labelOrEmpty_2(getEnumLabel(schema, enumValue));
                  let isSelected = value === enumValue;
                  let isHighlighted = absoluteIndex === accordionOptionIndex;
                  return jsxProd_default_2(
                    Box,
                    {
                      gap: 1,
                      children: [
                        jsxProd_default(Text, {
                          color: "suggestion",
                          children: isHighlighted ? figures_default.pointer : " ",
                        }),
                        jsxProd_default(Text, {
                          color: isSelected ? "success" : undefined,
                          children: isSelected ? figures_default.radioOn : figures_default.radioOff,
                        }),
                        jsxProd_default(Text, {
                          color: isHighlighted ? "suggestion" : undefined,
                          bold: isHighlighted,
                          children,
                        }),
                      ],
                    },
                    enumValue,
                  );
                }),
                visibleWindow.showBelow &&
                  jsxProd_default_2(Text, {
                    dimColor: true,
                    children: [
                      figures_default.arrowDown,
                      " ",
                      enumValues.length - visibleWindow.end,
                      " ",
                      "more below",
                    ],
                  }),
              ],
            });
          } else {
            let collapsedMarker = isFocused
              ? jsxProd_default_2(Text, {
                  dimColor: true,
                  children: [figures_default.triangleRightSmall, " "],
                })
              : null;
            if (isSet)
              valueNode = jsxProd_default_2(Text, {
                children: [
                  collapsedMarker,
                  jsxProd_default(Text, {
                    color,
                    bold: isFocused,
                    children: clampFieldRows
                      ? truncateToWidth(labelOrEmpty_2(getEnumLabel(schema, value)), max_2)
                      : labelOrEmpty_2(getEnumLabel(schema, value)),
                  }),
                ],
              });
            else
              valueNode = jsxProd_default_2(Text, {
                children: [
                  collapsedMarker,
                  jsxProd_default(Text, {
                    dimColor: true,
                    italic: true,
                    children: "not set",
                  }),
                ],
              });
          }
        } else if (schema.type === "boolean") {
          if (isFocused)
            valueNode = isSet
              ? jsxProd_default(Text, {
                  color,
                  bold: true,
                  children: value ? figures_default.checkboxOn : figures_default.checkboxOff,
                })
              : jsxProd_default(Text, {
                  dimColor: true,
                  children: figures_default.checkboxOff,
                });
          else
            valueNode = isSet
              ? jsxProd_default(Text, {
                  children: value ? figures_default.checkboxOn : figures_default.checkboxOff,
                })
              : jsxProd_default(Text, {
                  dimColor: true,
                  italic: true,
                  children: "not set",
                });
        } else if (isScalarSchemaType(schema)) {
          if (isFocused)
            valueNode = jsxProd_default(TextInput, {
              value: textInputValue,
              onChange: handleTextInputChange,
              onSubmit: handleTextInputSubmit,
              mask: isPassword ? "*" : undefined,
              maskWhole: isPassword,
              placeholder: "Type something\u2026",
              columns: Math.min(clampFieldRows ? max_2 : columns - 20, 60),
              maxVisibleLines: clampFieldRows ? 1 : undefined,
              cursorOffset: textInputCursorOffset,
              onChangeCursorOffset: setTextInputCursorOffset,
              focus: true,
              showCursor: true,
            });
          else {
            let displayValue =
              isSet && isPassword && value !== ""
                ? REDACTED_FIELD_TEXT
                : isSet && isDateTimeSchema(schema)
                  ? formatDateDisplay(String(value), schema)
                  : String(value);
            let safeText = markBrokenSequences(replaceLineBreaks(stripUnsafeChars(displayValue)));
            valueNode = isSet
              ? jsxProd_default(Text, {
                  children: clampFieldRows ? truncateToWidth(safeText, max_2) : safeText,
                })
              : jsxProd_default(Text, {
                  dimColor: true,
                  italic: true,
                  children: "not set",
                });
          }
        } else {
          let safeText = markBrokenSequences(replaceLineBreaks(stripUnsafeChars(String(value))));
          valueNode = isSet
            ? jsxProd_default(Text, {
                children: clampFieldRows ? truncateToWidth(safeText, max_2) : safeText,
              })
            : jsxProd_default(Text, {
                dimColor: true,
                italic: true,
                children: "not set",
              });
        }
        let description = schema.description ? displayField(schema.description) : null;
        return jsxProd_default_2(
          Box,
          {
            flexDirection: "column",
            children: [
              jsxProd_default_2(Box, {
                gap: 1,
                children: [
                  jsxProd_default(Text, {
                    color: tone,
                    children: isFocused ? figures_default.pointer : " ",
                  }),
                  statusIcon,
                  jsxProd_default_2(Box, {
                    children: [
                      labelText,
                      jsxProd_default(Text, {
                        color,
                        children: ": ",
                      }),
                      valueNode,
                    ],
                  }),
                ],
              }),
              optionsBox,
              description !== null &&
                jsxProd_default(Box, {
                  marginLeft: 6,
                  children: clampFieldRows
                    ? jsxProd_default(Text, {
                        dimColor: true,
                        children: truncateToWidth(
                          replaceLineBreaks(description.text),
                          Math.max(MIN_TRUNCATE_WIDTH, columns - 6 - max),
                        ),
                      })
                    : jsxProd_default(Blockquote, {
                        multiline: description.needsGutter,
                        children: jsxProd_default(Text, {
                          dimColor: true,
                          children: description.text,
                        }),
                      }),
                }),
              jsxProd_default(Box, {
                marginLeft: 6,
                height: 1,
                children: error
                  ? jsxProd_default(Text, {
                      color: "error",
                      italic: true,
                      children: clampFieldRows
                        ? truncateToWidth(
                            replaceLineBreaks(displayField(error).text),
                            Math.max(MIN_TRUNCATE_WIDTH, columns - 6 - max),
                          )
                        : replaceLineBreaks(displayField(error).text),
                    })
                  : jsxProd_default(Text, {
                      children: " ",
                    }),
              }),
            ],
          },
          name,
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
      $[42] = renderField;
    } else renderField = $[42];
    fieldRows = sliced.map(renderField);
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
    $[23] = fieldRows;
  } else fieldRows = $[23];
  let belowHint;
  if ($[43] !== hasBelow || $[44] !== schemaFields.length || $[45] !== scrollWindow.end) {
    belowHint =
      hasBelow &&
      jsxProd_default(Box, {
        marginLeft: 2,
        children: jsxProd_default_2(Text, {
          dimColor: true,
          children: [figures_default.arrowDown, " ", schemaFields.length - scrollWindow.end, " more below"],
        }),
      });
    $[43] = hasBelow;
    $[44] = schemaFields.length;
    $[45] = scrollWindow.end;
    $[46] = belowHint;
  } else belowHint = $[46];
  let fieldsBox;
  if ($[47] !== aboveHint || $[48] !== fieldRows || $[49] !== belowHint) {
    fieldsBox = jsxProd_default_2(Box, {
      flexDirection: "column",
      children: [aboveHint, fieldRows, belowHint],
    });
    $[47] = aboveHint;
    $[48] = fieldRows;
    $[49] = belowHint;
    $[50] = fieldsBox;
  } else fieldsBox = $[50];
  return fieldsBox;
}
export { ElicitationDialog, resetTypeahead };
