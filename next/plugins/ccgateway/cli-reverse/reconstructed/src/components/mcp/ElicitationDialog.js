/**
 * components/mcp/ElicitationDialog.tsx
 *
 * MCP elicitation 对话框：按服务器给的 JSON Schema 渲染表单（文本/数字/布尔/枚举/日期），提交/拒绝/取消。
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/components/mcp/ElicitationDialog.tsx
 * pieces: chunk-b9vpay08.js (1), chunk-czq1j3j2.js (9)
 * attribution: fingerprint 6, placement 2, layout 1, sole-consumer 1
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
import {
  useRecentInputStamp,
  isWithinRecentInput,
  INPUT_SETTLE_MS,
} from "../../hooks/useRecentInputGuard.js";
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
import { Blockquote } from "../Blockquote.js";
import { MoreItemsIndicator } from "../CustomSelect/select.js";
import { TextInput } from "../TextInput.js";

//@ chunk-b9vpay08.js:18918-18981 fingerprint (2.1.88 match: resetTypeahead, 0.476)
function resetTypeahead(ta) {
  ta.writers.delete(ta.signal);
  clearTimeout(ta.timer);
}
//@ chunk-czq1j3j2.js:1235245-1235408 placement (2.1.88 match: filterSwarmFieldsFromSchema, 0.663)
/**
 * JSON schema 的 required 里只保留 properties 中确实存在的字段名。旧版名 filterSwarmFieldsFromSchema 为错配。
 */
function getDeclaredRequiredFields(requestedSchema) {
  let required = requestedSchema?.required;
  if (!Array.isArray(required)) return [];
  let propertyNames = new Set(objectFieldEntries(requestedSchema?.properties).map(([name]) => name));
  return required.filter((name) => typeof name === "string" && propertyNames.has(name));
}
//@ chunk-czq1j3j2.js:1236396-1236466 fingerprint (2.1.88 match: RESOLVING_SPINNER_CHARS, 1)
var RESOLVING_SPINNER_CHARS = "\u280B\u2819\u2839\u2838\u283C\u2834\u2826\u2827\u2807\u280F";
//@ chunk-czq1j3j2.js:1236466-1236777 layout
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
//@ chunk-czq1j3j2.js:1236777-1237266 fingerprint (2.1.88 match: formatDateDisplay, 1)
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
//@ chunk-czq1j3j2.js:1237266-1239135 fingerprint (2.1.88 match: ElicitationDialog, 0.354)
/**
 * MCP elicitation：form 模式按 requestedSchema 渲染字段（校验、日期格式化），URL 模式打开链接并等待；结果 accept/decline/cancel 回传服务器。
 */
function ElicitationDialog(props) {
  let $ = useMemoCache(29);
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
    bt: {
      if (params.mode === "url") {
        dedupeKey = `url
${params.elicitationId}
${params.url}
${params.message}`;
        break bt;
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
  let dialogDedupeKey = useRecentInputStamp(attemptState.at);
  let onResponseOnce;
  if ($[8] !== attemptState.at || $[9] !== dialogDedupeKey || $[10] !== inputClock || $[11] !== onResponse) {
    onResponseOnce = (...args) => {
      let args_2 = args;
      if (args_2[0] !== "cancel" && isWithinRecentInput(inputClock, dialogDedupeKey(attemptState.at))) {
        return false;
      }
      return onResponse(...args_2);
    };
    $[8] = attemptState.at;
    $[9] = dialogDedupeKey;
    $[10] = inputClock;
    $[11] = onResponse;
    $[12] = onResponseOnce;
  } else onResponseOnce = $[12];
  let onResponse_2 = onResponseOnce;
  if (params.mode === "url") {
    const initialPhase_2 = initialPhase ?? "prompt";
    const userConfirmsCompletion_2 = userConfirmsCompletion ?? false;
    let urlDialog;
    if (
      $[13] !== attemptState.generation ||
      $[14] !== onResponse_2 ||
      $[15] !== onWaitingDismiss ||
      $[16] !== params ||
      $[17] !== serverName ||
      $[18] !== initialPhase_2 ||
      $[19] !== userConfirmsCompletion_2 ||
      $[20] !== waitingState ||
      $[21] !== wouldTakeAnswer
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
      $[13] = attemptState.generation;
      $[14] = onResponse_2;
      $[15] = onWaitingDismiss;
      $[16] = params;
      $[17] = serverName;
      $[18] = initialPhase_2;
      $[19] = userConfirmsCompletion_2;
      $[20] = waitingState;
      $[21] = wouldTakeAnswer;
      $[22] = urlDialog;
    } else urlDialog = $[22];
    return urlDialog;
  }
  let formDialog;
  if (
    $[23] !== attemptState.generation ||
    $[24] !== onResponse_2 ||
    $[25] !== params ||
    $[26] !== pluginSource ||
    $[27] !== serverName
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
    $[23] = attemptState.generation;
    $[24] = onResponse_2;
    $[25] = params;
    $[26] = pluginSource;
    $[27] = serverName;
    $[28] = formDialog;
  } else formDialog = $[28];
  return formDialog;
}
//@ chunk-czq1j3j2.js:1239135-1239819 sole-consumer
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
//@ chunk-czq1j3j2.js:1240073-1250831 fingerprint (2.1.88 match: ElicitationFormDialog, 0.54)
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
//@ chunk-czq1j3j2.js:1250831-1256678 fingerprint (2.1.88 match: ElicitationURLDialog, 0.673)
function ElicitationURLDialog({
  serverName,
  params,
  onResponse,
  waitingState,
  initialPhase,
  onWaitingDismiss,
  userConfirmsCompletion,
  wouldTakeAnswer,
}) {
  let { columns, rows } = useTerminalSize();
  let { message, url } = params;
  let urlPayload = useMemo(
    () =>
      serializeApprovalPayload(url, {
        maxUnits: MAX_PAYLOAD_UNITS,
        softWrap: true,
      }),
    [url],
  );
  let href = useMemo(() => normalizeUrlHref(url), [url]);
  let hrefPayload = useMemo(
    () =>
      serializeApprovalPayload(href, {
        maxUnits: MAX_PAYLOAD_UNITS,
        softWrap: true,
      }),
    [href],
  );
  let subtitle = useMemo(
    () => `
${truncateLines(displayField(message).text, columns)}`,
    [message, columns],
  );
  let isUrlShownWhole = useMemo(
    () =>
      urlPayload.kind === "full" &&
      urlPayload.text.replaceAll(
        `
`,
        "",
      ) === url &&
      !hasDisplayUnsafeChar(url) &&
      !/[\n\r\u2028\u2029]/.test(url) &&
      hrefPayload.kind === "full" &&
      hrefPayload.text.replaceAll(
        `
`,
        "",
      ) === href &&
      !hasDisplayUnsafeChar(href) &&
      !/[\n\r\u2028\u2029]/.test(href),
    [urlPayload, url, hrefPayload, href],
  );
  let hostname = "";
  let urlBeforeDomain = "";
  let urlAfterDomain = "";
  let normalizedHrefPayload = false;
  try {
    hostname = new URL(href).hostname;
    let domainStart = href.indexOf(hostname);
    if (hostname !== "" && domainStart !== -1) {
      normalizedHrefPayload = true;
      urlBeforeDomain = href.slice(0, domainStart);
      urlAfterDomain = href.slice(domainStart + hostname.length);
    }
  } catch {
    hostname = href;
  }
  let bodyRows = rows - 12;
  let tooLarge = useMemo(() => {
    if (bodyRows < 1) return true;
    let contentWidth = columns - 6;
    if (contentWidth < 20) return true;
    let measuredText = normalizedHrefPayload ? href : hrefPayload.kind === "full" ? hrefPayload.text : href;
    return (
      countCharInString(
        wrapText(measuredText, contentWidth, "wrap"),
        `
`,
      ) +
        1 >
      bodyRows
    );
  }, [normalizedHrefPayload, hrefPayload, href, columns, bodyRows]);
  let urlSubtitle = isUrlShownWhole && elicitationUrlCost(href) <= MAX_URL_COST_CHARS;
  let [phase, setPhase] = useState(initialPhase);
  let inputClock = useInputClock();
  let waitingSinceRef = useRef(initialPhase === "waiting" ? Date.now() : undefined);
  let urlBodyRows = useRecentInputStamp(waitingSinceRef.current ?? 0);
  let [focus, setFocus, getFocus] = useLatestState(
    initialPhase === "waiting"
      ? "open"
      : urlSubtitle && !tooLarge
        ? userConfirmsCompletion
          ? "open"
          : "accept"
        : "decline",
  );
  useEffect(() => {
    if (!urlSubtitle || tooLarge)
      setFocus((prev) =>
        prev === "accept" || (prev === "open" && userConfirmsCompletion) ? "decline" : prev,
      );
  }, [urlSubtitle, tooLarge, userConfirmsCompletion, setFocus]);
  let inputGuard = useInputGuard(initialPhase !== "waiting" && urlSubtitle && !tooLarge);
  let showCancel = waitingState?.showCancel ?? false;
  let { setRawMode } = useStdin();
  useLayoutEffect(() => {
    setRawMode(true);
    return () => setRawMode(false);
  }, [setRawMode]);
  useRegisterOverlay("elicitation-url");
  let answeredRef = useRef(false);
  let element = useCallback(() => {
    if (!urlSubtitle || answeredRef.current) return;
    if (onResponse("accept") === false) return;
    answeredRef.current = true;
    if (userConfirmsCompletion) return;
    waitingSinceRef.current = Date.now();
    openValidatedUrlSucceeded(href);
    setPhase("waiting");
    setFocus("open");
  }, [onResponse, href, urlSubtitle, userConfirmsCompletion, setFocus]);
  let [reopened, setReopened] = useState(false);
  function applyExternalAnswer() {
    if (!urlSubtitle || answeredRef.current || wouldTakeAnswer?.() !== true) return;
    openValidatedUrlSucceeded(href);
    setReopened(true);
    inputGuard.arrived();
    setFocus("accept");
  }
  function onKeyDown(event) {
    if (phase === "prompt") {
      if (event.key === "left" || event.key === "right") {
        event.preventDefault();
        if (urlSubtitle && userConfirmsCompletion) {
          let promptActions = ["open", "accept", "decline"];
          let index = promptActions.indexOf(getFocus());
          let nextAction = promptActions[(index + (event.key === "right" ? 1 : -1) + 3) % 3];
          if (nextAction !== "decline") inputGuard.arrived();
          setFocus(nextAction);
        } else if (urlSubtitle) {
          if (getFocus() === "decline") inputGuard.arrived();
          setFocus((prev) => (prev === "accept" ? "decline" : prev === "decline" ? "accept" : prev));
        }
        return;
      }
      if (event.key === "return") {
        event.preventDefault();
        let action = getFocus();
        if (action === "open" && userConfirmsCompletion) {
          if (inputGuard.refuses()) return;
          applyExternalAnswer();
        } else if (action === "accept") {
          if (inputGuard.refuses()) return;
          element();
        } else if (action === "decline" && !answeredRef.current) onResponse("decline");
      }
      if (isTextInputKey(event)) inputGuard.typed();
    } else {
      let waitingActions = showCancel ? ["open", "action", "cancel"] : ["open", "action"];
      if (event.key === "left" || event.key === "right") {
        event.preventDefault();
        let forward = event.key === "right";
        setFocus((prev) => {
          let idx = waitingActions.indexOf(prev);
          return waitingActions[(idx + (forward ? 1 : -1) + waitingActions.length) % waitingActions.length];
        });
        return;
      }
      if (event.key === "return") {
        event.preventDefault();
        let confirmed = waitingSinceRef.current;
        if (confirmed !== undefined && isWithinRecentInput(inputClock, urlBodyRows(confirmed))) return;
        let action = getFocus();
        if (action === "open") {
          if (urlSubtitle) openValidatedUrlSucceeded(href);
        } else if (action === "cancel") onWaitingDismiss?.("cancel");
        else onWaitingDismiss?.(showCancel ? "retry" : "dismiss");
      }
    }
  }
  if (phase === "waiting") {
    let actionLabel = waitingState?.actionLabel ?? "Continue without waiting";
    return jsxProd_default(Dialog, {
      title: `MCP server \u201C${labelOrEmpty(serverName)}\u201D \u2014 waiting for completion`,
      subtitle,
      color: "permission",
      onCancel: () => onWaitingDismiss?.("cancel"),
      isCancelActive: true,
      inputGuide: jsxProd_default_2(Byline, {
        children: [
          jsxProd_default(ConfigurableShortcutHint, {
            action: "confirm:no",
            context: "Confirmation",
            fallback: "Esc",
            description: "cancel",
          }),
          jsxProd_default(KeyboardShortcutHint, {
            chord: ["left", "right"],
            action: "switch",
          }),
        ],
      }),
      children: jsxProd_default_2(FocusColumn, {
        onKeyDown,
        children: [
          jsxProd_default(Box, {
            marginBottom: 1,
            flexDirection: "column",
            children:
              urlSubtitle || isUrlShownWhole
                ? jsxProd_default(Blockquote, {
                    multiline: hrefPayload.kind === "full" && hrefPayload.needsGutter,
                    children: normalizedHrefPayload
                      ? jsxProd_default_2(Text, {
                          children: [
                            urlBeforeDomain,
                            jsxProd_default(Text, {
                              bold: true,
                              children: hostname,
                            }),
                            urlAfterDomain,
                          ],
                        })
                      : jsxProd_default(Text, {
                          children: hrefPayload.kind === "full" ? hrefPayload.text : null,
                        }),
                  })
                : jsxProd_default(Blockquote, {
                    multiline: urlPayload.kind === "full" && urlPayload.needsGutter,
                    children: jsxProd_default(Text, {
                      children: urlPayload.kind === "full" ? urlPayload.text : urlPayload.marker,
                    }),
                  }),
          }),
          jsxProd_default(Box, {
            marginBottom: 1,
            children: jsxProd_default(Text, {
              dimColor: true,
              italic: true,
              children: "Waiting for the server to confirm completion\u2026",
            }),
          }),
          jsxProd_default_2(Box, {
            children: [
              jsxProd_default(Text, {
                color: "success",
                children: focus === "open" ? figures_default.pointer : " ",
              }),
              jsxProd_default(Text, {
                bold: focus === "open",
                color: focus === "open" ? "success" : undefined,
                dimColor: focus !== "open",
                children: " Reopen URL  ",
              }),
              jsxProd_default(Text, {
                color: "success",
                children: focus === "action" ? figures_default.pointer : " ",
              }),
              jsxProd_default(Text, {
                bold: focus === "action",
                color: focus === "action" ? "success" : undefined,
                dimColor: focus !== "action",
                children: ` ${actionLabel}`,
              }),
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
                }),
            ],
          }),
        ],
      }),
    });
  }
  return jsxProd_default(Dialog, {
    title: `MCP server \u201C${labelOrEmpty(serverName)}\u201D wants to open a URL`,
    subtitle,
    color: "permission",
    onCancel: () => onResponse("cancel"),
    isCancelActive: true,
    inputGuide: jsxProd_default_2(Byline, {
      children: [
        jsxProd_default(ConfigurableShortcutHint, {
          action: "confirm:no",
          context: "Confirmation",
          fallback: "Esc",
          description: "cancel",
        }),
        jsxProd_default(KeyboardShortcutHint, {
          chord: ["left", "right"],
          action: "switch",
        }),
      ],
    }),
    children: jsxProd_default_2(FocusColumn, {
      onKeyDown,
      children: [
        jsxProd_default(Box, {
          marginBottom: 1,
          flexDirection: "column",
          children:
            urlSubtitle || isUrlShownWhole
              ? jsxProd_default(Blockquote, {
                  multiline: hrefPayload.kind === "full" && hrefPayload.needsGutter,
                  children: normalizedHrefPayload
                    ? jsxProd_default_2(Text, {
                        children: [
                          urlBeforeDomain,
                          jsxProd_default(Text, {
                            bold: true,
                            children: hostname,
                          }),
                          urlAfterDomain,
                        ],
                      })
                    : jsxProd_default(Text, {
                        children: hrefPayload.kind === "full" ? hrefPayload.text : null,
                      }),
                })
              : jsxProd_default(Blockquote, {
                  multiline: urlPayload.kind === "full" && urlPayload.needsGutter,
                  children: jsxProd_default(Text, {
                    children: urlPayload.kind === "full" ? urlPayload.text : urlPayload.marker,
                  }),
                }),
        }),
        !urlSubtitle &&
          jsxProd_default(Box, {
            marginBottom: 1,
            children: jsxProd_default(Text, {
              dimColor: true,
              children: isUrlShownWhole
                ? "This URL\u2019s browser-ready form is too long to hand " +
                  "to a browser safely, so one-click opening is disabled. The URL above is shown in full. Decline to continue."
                : "This URL cannot be shown exactly as it would open, so opening it is disabled. Decline to continue.",
            }),
          }),
        urlSubtitle &&
          tooLarge &&
          jsxProd_default(Box, {
            marginBottom: 1,
            children: jsxProd_default(Text, {
              dimColor: true,
              children:
                "This URL extends past this screen \u2014 its beginning is not visible here. Review it in full before you continue.",
            }),
          }),
        jsxProd_default_2(Box, {
          children: [
            urlSubtitle &&
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
              }),
            urlSubtitle &&
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
              }),
            jsxProd_default(Text, {
              color: "error",
              children: focus === "decline" ? figures_default.pointer : " ",
            }),
            jsxProd_default(Text, {
              bold: focus === "decline",
              color: focus === "decline" ? "error" : undefined,
              dimColor: focus !== "decline",
              children: " Decline",
            }),
          ],
        }),
      ],
    }),
  });
}
//@ chunk-czq1j3j2.js:1256678-1262586 placement
/**
 * MCP elicitation 表单：按服务器给出的 schema 渲染字段、校验输入并提交。
 */
function ElicitationForm(props) {
  let $ = useMemoCache(48);
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
  let aboveHint;
  if ($[0] !== scrollWindow.start) {
    aboveHint = jsxProd_default(MoreItemsIndicator, {
      direction: "above",
      count: scrollWindow.start,
    });
    $[0] = scrollWindow.start;
    $[1] = aboveHint;
  } else aboveHint = $[1];
  let fieldRows;
  if (
    $[2] !== accordionOptionIndex ||
    $[3] !== clampFieldRows ||
    $[4] !== columns ||
    $[5] !== currentFieldIndex ||
    $[6] !== expandedAccordion ||
    $[7] !== focusedButton ||
    $[8] !== formValues ||
    $[9] !== handleTextInputChange ||
    $[10] !== handleTextInputSubmit ||
    $[11] !== optionWindow ||
    $[12] !== pluginSource ||
    $[13] !== resolvingFields ||
    $[14] !== schemaFields ||
    $[15] !== scrollWindow.end ||
    $[16] !== scrollWindow.start ||
    $[17] !== serverName ||
    $[18] !== setTextInputCursorOffset ||
    $[19] !== textInputCursorOffset ||
    $[20] !== textInputValue ||
    $[21] !== validationErrors
  ) {
    const sliced = schemaFields.slice(scrollWindow.start, scrollWindow.end);
    let renderField;
    if (
      $[23] !== accordionOptionIndex ||
      $[24] !== clampFieldRows ||
      $[25] !== columns ||
      $[26] !== currentFieldIndex ||
      $[27] !== expandedAccordion ||
      $[28] !== focusedButton ||
      $[29] !== formValues ||
      $[30] !== handleTextInputChange ||
      $[31] !== handleTextInputSubmit ||
      $[32] !== optionWindow ||
      $[33] !== pluginSource ||
      $[34] !== resolvingFields ||
      $[35] !== scrollWindow.start ||
      $[36] !== serverName ||
      $[37] !== setTextInputCursorOffset ||
      $[38] !== textInputCursorOffset ||
      $[39] !== textInputValue ||
      $[40] !== validationErrors
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
                  jsxProd_default(Box, {
                    marginLeft: 2,
                    children: jsxProd_default(MoreItemsIndicator, {
                      direction: "above",
                      count: visibleWindow.start,
                    }),
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
                  jsxProd_default(Box, {
                    marginLeft: 2,
                    children: jsxProd_default(MoreItemsIndicator, {
                      direction: "below",
                      count: multiSelectValues.length - visibleWindow.end,
                    }),
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
                  jsxProd_default(Box, {
                    marginLeft: 2,
                    children: jsxProd_default(MoreItemsIndicator, {
                      direction: "above",
                      count: visibleWindow.start,
                    }),
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
                  jsxProd_default(Box, {
                    marginLeft: 2,
                    children: jsxProd_default(MoreItemsIndicator, {
                      direction: "below",
                      count: enumValues.length - visibleWindow.end,
                    }),
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
      $[23] = accordionOptionIndex;
      $[24] = clampFieldRows;
      $[25] = columns;
      $[26] = currentFieldIndex;
      $[27] = expandedAccordion;
      $[28] = focusedButton;
      $[29] = formValues;
      $[30] = handleTextInputChange;
      $[31] = handleTextInputSubmit;
      $[32] = optionWindow;
      $[33] = pluginSource;
      $[34] = resolvingFields;
      $[35] = scrollWindow.start;
      $[36] = serverName;
      $[37] = setTextInputCursorOffset;
      $[38] = textInputCursorOffset;
      $[39] = textInputValue;
      $[40] = validationErrors;
      $[41] = renderField;
    } else renderField = $[41];
    fieldRows = sliced.map(renderField);
    $[2] = accordionOptionIndex;
    $[3] = clampFieldRows;
    $[4] = columns;
    $[5] = currentFieldIndex;
    $[6] = expandedAccordion;
    $[7] = focusedButton;
    $[8] = formValues;
    $[9] = handleTextInputChange;
    $[10] = handleTextInputSubmit;
    $[11] = optionWindow;
    $[12] = pluginSource;
    $[13] = resolvingFields;
    $[14] = schemaFields;
    $[15] = scrollWindow.end;
    $[16] = scrollWindow.start;
    $[17] = serverName;
    $[18] = setTextInputCursorOffset;
    $[19] = textInputCursorOffset;
    $[20] = textInputValue;
    $[21] = validationErrors;
    $[22] = fieldRows;
  } else fieldRows = $[22];
  const count = schemaFields.length - scrollWindow.end;
  let belowHint;
  if ($[42] !== count) {
    belowHint = jsxProd_default(MoreItemsIndicator, {
      direction: "below",
      count,
    });
    $[42] = count;
    $[43] = belowHint;
  } else belowHint = $[43];
  let fieldsBox;
  if ($[44] !== aboveHint || $[45] !== fieldRows || $[46] !== belowHint) {
    fieldsBox = jsxProd_default_2(Box, {
      flexDirection: "column",
      children: [aboveHint, fieldRows, belowHint],
    });
    $[44] = aboveHint;
    $[45] = fieldRows;
    $[46] = belowHint;
    $[47] = fieldsBox;
  } else fieldsBox = $[47];
  return fieldsBox;
}
export { resetTypeahead, ElicitationDialog };
