/**
 * commands/feedback/FeedbackQueue.tsx
 *
 * 2.1.316 新增：/feedback 反馈队列界面：列出本会话与其他会话的待发反馈，打开、编辑、丢弃或新写。
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * new in 2.1.318 (2.1.88 has no file at this path)
 * pieces: chunk-pghf5k6z.js (17)
 * attribution: placement 17
 * (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.
 */
import {
  init_react_production,
  useState,
  useRef,
  useCallback,
  useEffect,
  useMemo,
} from "../../../vendor/react/cjs/react.production.js";
import {
  jsxProd_default,
  jsxProd_default_2,
  Fragment,
} from "../../../vendor/react/cjs/react-jsx-dev-runtime.react-server.production.js";
import { OrderedListWithItem } from "../../components/CustomSelect/selectTable.js";
import { stripInvisibleChars, stripInvisibleCharsMultiLine } from "../../utils/invisibleChars.js";
import {
  FEEDBACK_FAILURE_MODES,
  FEEDBACK_TASK_CATEGORIES,
  listFeedbackDrafts,
  setSessionDraftCount,
  recentEntries,
  saveFeedbackDraft,
  MAX_DETAILS_LENGTH,
} from "../../services/feedback/feedbackDrafts.js";
import { useIsScreenReaderEnabled } from "../../ink/components/ErrorBoundary.js";
import { useLatestState } from "../../components/CustomSelect/option-map.js";
import { useTerminalSize } from "../../hooks/useTerminalSize.js";
import { useClock } from "../../ink/components/ClockContext.js";
import { useTheme_2 } from "../../components/design-system/ThemeProvider.js";
import { useHost, useSession } from "../../context/session.js";
import { countWhere } from "../../utils/collections.js";
import { logEvent } from "../../services/analytics/index.js";
import { fromNumber } from "../../services/analytics/safeMetadata.js";
import { discardFeedbackDraft, submitFeedbackDraft } from "../../services/feedback/feedbackDraft.js";
import { Byline } from "../../components/design-system/Byline.js";
import { KeyboardShortcutHint } from "../../components/design-system/KeyboardShortcutHint.js";
import { supportsShiftEnter } from "../terminalSetup/terminalSetup.js";
import { FocusColumn } from "../../components/design-system/FocusColumn.js";
import { Dialog } from "../../components/design-system/Dialog.js";
import { Text, Box } from "../../ink/components/Text.js";
import { HideRow } from "../../components/Spinner/TeammateSpinnerTree.js";
import { plural } from "../../utils/stringUtils.js";
import { ErrorText } from "../../components/ErrorText.js";
import { StatusIcon } from "../../components/design-system/StatusIcon.js";
import { stripCombiningRepeated } from "../../utils/sanitization.js";
import { replaceControlChars } from "../../utils/resultError.js";
import { useMemoCache } from "../../../vendor/react/compiler-runtime.js";
import { figures_default } from "../../../vendor/@inquirer/figures/dist/esm/index.js";
import { MEMO_CACHE_SENTINEL } from "../../../runtime/bun-runtime.js";
import { TextInput } from "../../components/TextInput.js";
import { WrappedTextBox } from "../../components/FeedbackSurvey/FeedbackDraftNotice.js";
import { useScrollViewportSize, useHasScrollViewport } from "../../components/ScrollViewportContext.js";
import { merged } from "../../components/CustomSelect/select.js";
import { deferInit } from "../../../runtime/deferred-init.js";

//@ chunk-pghf5k6z.js:1298-1302 placement
// deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
deferInit("chunk-pghf5k6z.js:1298", () => {
  init_react_production();
});
//@ chunk-pghf5k6z.js:1302-1377 placement
function renderThisSessionFeedbackItem(draft) {
  return jsxProd_default(
    OrderedListWithItem.Item,
    {
      label: stripInvisibleChars(draft.title),
      meta: feedbackItemMeta(draft),
    },
    draft.draft_id,
  );
}
//@ chunk-pghf5k6z.js:1377-1456 placement
function renderOtherFeedbackItem(draft) {
  return jsxProd_default(
    OrderedListWithItem.Item,
    {
      label: stripInvisibleChars(draft.title),
      meta: feedbackItemMeta(draft),
    },
    draft.draft_id,
  );
}
//@ chunk-pghf5k6z.js:1456-1604 placement
var FEEDBACK_TYPES; // deferred: uses FEEDBACK_TYPES (../../services/feedback/feedbackDrafts.js) of its import cycle while loading; runs once the cycle is complete
var FEEDBACK_TYPE_LABELS;
var AREA_CHOICES;
var FAILURE_MODE_CHOICES;
deferInit("chunk-pghf5k6z.js:1456", () => {
  FEEDBACK_TYPES = ["bug", "idea", "missing_capability"];
  FEEDBACK_TYPE_LABELS = {
    bug: "bug",
    idea: "idea",
    missing_capability: "missing capability",
  };
  AREA_CHOICES = [undefined, ...FEEDBACK_FAILURE_MODES];
  FAILURE_MODE_CHOICES = [undefined, ...FEEDBACK_TASK_CATEGORIES];
});
//@ chunk-pghf5k6z.js:1604-1666 placement
function snakeToWords(text) {
  return text === undefined ? "(none)" : text.replace(/_/g, " ");
}
//@ chunk-pghf5k6z.js:1666-1802 placement
/**
 * 反馈编辑表单的字段顺序，transcript 可用时含 transcript。
 */
function getFeedbackFormFields(draft) {
  return [
    "type",
    "title",
    "area",
    "failure_mode",
    "task_category",
    "details",
    ...(draft.transcriptAvailable ? ["transcript"] : []),
    "send",
  ];
}
//@ chunk-pghf5k6z.js:1802-1828 placement
var DRAFT_DEBOUNCE_MS = 500;
var FEEDBACK_LIST_CHROME_ROWS = 6;
var FEEDBACK_LIST_FIXED_ROWS = 3;
var FEEDBACK_LIST_MIN_ROWS = 5;
//@ chunk-pghf5k6z.js:1828-12272 placement
/**
 * /feedback 的反馈队列界面（2.1.316 新增）：列出本会话与其他会话的待发反馈，可打开、编辑字段、丢弃或新写一条。
 */
function FeedbackQueue({ messages, onDone, abortSignal, onWriteNew }) {
  let [drafts, setDrafts] = useState(null);
  let [cursor, setCursor] = useState(0);
  let isScreenReaderEnabled = useIsScreenReaderEnabled();
  let [view, setView] = useState("list");
  let [activeDraft, setActiveDraft] = useState(null);
  let [includeTranscript, setIncludeTranscript] = useState(false);
  let [fieldIndex, setFieldIndex, getFieldIndex] = useLatestState(0);
  let [form, setForm, getForm] = useLatestState(null);
  let [listCursor, setListCursor] = useState(null);
  let lastSaveAt = useRef(-1 / 0);
  let [saveError, setSaveError] = useState(null);
  let [statusMessage, setStatusMessage] = useState(null);
  let columns = useTerminalSize().columns - 6;
  let clock = useClock();
  let lastEditAt = useRef(0);
  let savingRef = useRef(false);
  let lastDiscardAt = useRef(0);
  let discardingRef = useRef(false);
  let submittedRef = useRef(false);
  let { storageV5, credentials } = useTheme_2();
  let host = useHost();
  let sessionId = useSession((session) => session.id);
  let canWriteNew = onWriteNew !== undefined;
  let reloadDrafts = useCallback(async () => {
    let { queued } = await listFeedbackDrafts(undefined, storageV5).catch(() => ({
      queued: [],
      expired: [],
    }));
    setSessionDraftCount(countWhere(queued, (draft) => draft.source_session_id === sessionId));
    setDrafts(queued);
    let maxCursor = queued.length - (canWriteNew ? 0 : 1);
    setCursor((cursorValue) => Math.min(cursorValue, Math.max(0, maxCursor)));
    return queued;
  }, [sessionId, canWriteNew, storageV5, setCursor]);
  useEffect(() => {
    reloadDrafts().then((loaded) => {
      logEvent("tengu_feedback_queue_opened", {
        queued_count: fromNumber(loaded.length),
        this_session_count: fromNumber(countWhere(loaded, (draft) => draft.source_session_id === sessionId)),
      });
    });
  }, [reloadDrafts, sessionId]);
  let filtered = (drafts ?? []).filter((draft) => draft.source_session_id === sessionId);
  let filtered_2 = (drafts ?? []).filter((draft) => draft.source_session_id !== sessionId);
  let orderedDrafts = [...filtered, ...filtered_2];
  let newDraftSelected = canWriteNew && cursor === orderedDrafts.length;
  let totalRows = orderedDrafts.length + (canWriteNew ? 1 : 0);
  let selectedDraft = orderedDrafts[cursor];
  let recentCount = activeDraft ? recentEntries(activeDraft.request_ids).length : 0;
  let finishWith = useCallback(
    (message) => {
      if (message === undefined) onDone();
      else
        onDone(message, {
          display: "system",
        });
    },
    [onDone],
  );
  let formFields = useMemo(() => (activeDraft ? getFeedbackFormFields(activeDraft) : []), [activeDraft]);
  let resetFormIndex = useCallback(
    (fields) => {
      lastEditAt.current = clock.now();
      setFieldIndex(fields.length - 1);
    },
    [clock, setFieldIndex],
  );
  let currentField = formFields[fieldIndex];
  let isTextInputField = currentField === "title" || currentField === "area" || currentField === "details";
  let onOpen = useCallback(
    (draft) => {
      setActiveDraft(draft);
      setIncludeTranscript(draft.transcriptAvailable);
      setSaveError(null);
      setForm({
        type: draft.type,
        title: stripInvisibleChars(draft.title),
        area: stripInvisibleChars(draft.area ?? ""),
        failureMode: draft.failure_mode,
        taskCategory: draft.task_category,
        details: stripInvisibleCharsMultiLine(draft.details),
      });
      setListCursor(null);
      lastSaveAt.current = -1 / 0;
      resetFormIndex(getFeedbackFormFields(draft));
      lastDiscardAt.current = clock.now();
      savingRef.current = false;
      submittedRef.current = false;
      setView("review");
    },
    [clock, resetFormIndex, setForm],
  );
  let discardDraft = useCallback(
    async (draft) => {
      let now = clock.now();
      let since = lastDiscardAt.current;
      lastDiscardAt.current = Math.max(now, since);
      if (now - since < DRAFT_DEBOUNCE_MS || discardingRef.current || savingRef.current) return;
      discardingRef.current = true;
      try {
        await discardFeedbackDraft(draft, "panel", storageV5).catch(() => {});
        await reloadDrafts();
        setView("list");
        setActiveDraft(null);
      } finally {
        discardingRef.current = false;
      }
    },
    [reloadDrafts, clock, storageV5],
  );
  let saveEdits = useCallback(
    (draft) => {
      setActiveDraft(draft);
      setDrafts((list) =>
        list ? list.map((entry) => (entry.draft_id === draft.draft_id ? draft : entry)) : list,
      );
      let { transcriptAvailable, ...storedDraft } = draft;
      return saveFeedbackDraft(storedDraft, new Date(), storageV5).then((result) => {
        if (!result.success)
          setSaveError(
            result.reason === "too_large"
              ? "That draft is too large to save. Trim the details."
              : "Could not save the draft to disk.",
          );
      });
    },
    [storageV5],
  );
  let mergeEdits = useCallback(() => {
    let edits = getForm();
    if (!activeDraft || !edits) return activeDraft;
    let titleText = stripInvisibleChars(activeDraft.title);
    let areaText = stripInvisibleChars(activeDraft.area ?? "");
    let detailsText = stripInvisibleCharsMultiLine(activeDraft.details);
    let nextTitle =
      edits.title === titleText || edits.title.trim() === "" ? activeDraft.title : edits.title.trim();
    let nextArea = edits.area === areaText ? (activeDraft.area ?? "") : edits.area.trim();
    let nextDetails =
      edits.details === detailsText ? activeDraft.details : edits.details.trim() === "" ? "" : edits.details;
    if (
      edits.type === activeDraft.type &&
      nextTitle === activeDraft.title &&
      (nextArea === "" ? undefined : nextArea) === activeDraft.area &&
      edits.failureMode === activeDraft.failure_mode &&
      edits.taskCategory === activeDraft.task_category &&
      nextDetails === activeDraft.details
    )
      return activeDraft;
    return {
      ...activeDraft,
      type: edits.type,
      title: nextTitle,
      area: nextArea === "" ? undefined : nextArea,
      failure_mode: edits.failureMode,
      task_category: edits.taskCategory,
      details: nextDetails,
    };
  }, [activeDraft, getForm]);
  let persistEdits = useCallback(() => {
    let merged = mergeEdits();
    if (merged && merged !== activeDraft) {
      if (
        activeDraft &&
        merged.details === "" &&
        activeDraft.details !== "" &&
        clock.now() - lastSaveAt.current < DRAFT_DEBOUNCE_MS
      )
        merged = {
          ...merged,
          details: activeDraft.details,
        };
      saveEdits(merged);
    }
  }, [mergeEdits, activeDraft, saveEdits, clock]);
  let setFailureMode = useCallback(
    (index) => {
      setListCursor(null);
      setSaveError((error) => (error === DETAILS_TOO_LARGE_MESSAGE ? null : error));
      setFieldIndex((fieldCursor) => {
        let max = Math.max(0, Math.min(formFields.length - 1, fieldCursor + index));
        if (max !== fieldCursor && formFields[max] === "send") lastEditAt.current = clock.now();
        return max;
      });
    },
    [formFields, clock, setFieldIndex],
  );
  let onFieldKey = useCallback(
    (field, delta) => {
      if (field === "type")
        setForm((prev) => {
          if (!prev) return prev;
          let index = FEEDBACK_TYPES.indexOf(prev.type);
          let nextType = FEEDBACK_TYPES[(index + delta + FEEDBACK_TYPES.length) % FEEDBACK_TYPES.length];
          return nextType
            ? {
                ...prev,
                type: nextType,
              }
            : prev;
        });
      else if (field === "failure_mode")
        setForm((prev) => {
          if (!prev) return prev;
          let index = AREA_CHOICES.indexOf(prev.failureMode);
          let areaCount = AREA_CHOICES.length;
          return {
            ...prev,
            failureMode: AREA_CHOICES[(index + delta + areaCount) % areaCount],
          };
        });
      else if (field === "task_category")
        setForm((prev) => {
          if (!prev) return prev;
          let index = FAILURE_MODE_CHOICES.indexOf(prev.taskCategory);
          let failureModeCount = FAILURE_MODE_CHOICES.length;
          return {
            ...prev,
            taskCategory: FAILURE_MODE_CHOICES[(index + delta + failureModeCount) % failureModeCount],
          };
        });
      else if (field === "transcript") setIncludeTranscript((value) => !value);
    },
    [setForm],
  );
  let submit = useCallback(async () => {
    if (!activeDraft || savingRef.current || discardingRef.current) return;
    let now = clock.now();
    let lastSubmitAt = lastEditAt.current;
    lastEditAt.current = Math.max(now, lastSubmitAt);
    if (now - lastSubmitAt < DRAFT_DEBOUNCE_MS) return;
    if (getForm()?.title.trim() === "") {
      setSaveError("Title is blank. Type a title, or press esc on the field to restore it.");
      return;
    }
    let draft = mergeEdits() ?? activeDraft;
    savingRef.current = true;
    setView("submitting");
    setSaveError(null);
    if (draft !== activeDraft) await saveEdits(draft);
    let result;
    try {
      result = await submitFeedbackDraft({
        draft,
        includeTranscript: includeTranscript && draft.transcriptAvailable,
        currentSessionMessages: messages,
        signal: abortSignal,
        storageV5,
        host,
        credentials,
      });
    } catch {
      result = {
        success: false,
        error: "Couldn't send feedback. The draft is still queued. Try again later.",
      };
    }
    savingRef.current = false;
    if (result.success) {
      await reloadDrafts();
      setStatusMessage(result.feedbackId);
      setView("receipt");
    } else {
      setSaveError(result.error);
      if (result.payloadTooLarge) {
        let index = formFields.indexOf("transcript");
        if (index >= 0) setFieldIndex(index);
      }
      setView("review");
    }
  }, [
    activeDraft,
    getForm,
    includeTranscript,
    messages,
    abortSignal,
    reloadDrafts,
    clock,
    mergeEdits,
    saveEdits,
    storageV5,
    credentials,
    host,
    formFields,
    setFieldIndex,
  ]);
  function handleKeyDown(event) {
    if (event.ctrl || event.meta) return;
    if (view === "submitting") {
      event.preventDefault();
      return;
    }
    if (event.key === "escape" && !(view === "review" && isTextInputField)) return;
    if (view === "receipt") {
      event.preventDefault();
      if ((drafts?.length ?? 0) > 0) {
        setView("list");
        setActiveDraft(null);
      } else finishWith(`Feedback sent (receipt ${statusMessage})`);
      return;
    }
    if (view === "list") {
      if (!drafts) {
        event.preventDefault();
        return;
      }
      if (event.key.toLowerCase() === "w" && onWriteNew) {
        event.preventDefault();
        onWriteNew();
        return;
      }
      if (totalRows === 0) {
        event.preventDefault();
        finishWith();
        return;
      }
      if (orderedDrafts.length > 0) return;
      if (event.key === "up" || event.key === "down") event.preventDefault();
      else if (event.key === "return" && onWriteNew) {
        event.preventDefault();
        onWriteNew();
      } else if (event.key !== "escape") {
        event.preventDefault();
        finishWith();
      }
      return;
    }
    if (view === "review" && activeDraft) {
      if (submittedRef.current) {
        event.preventDefault();
        return;
      }
      if (isTextInputField) {
        if (event.key === "escape") {
          event.preventDefault();
          close();
        }
        return;
      }
      let field = formFields[getFieldIndex()];
      if (event.key === "up") {
        event.preventDefault();
        setFailureMode(-1);
      } else if (event.key === "down") {
        event.preventDefault();
        setFailureMode(1);
      } else if (event.key === "left" || event.key === "right") {
        event.preventDefault();
        onFieldKey(field, event.key === "left" ? -1 : 1);
      } else if (event.key === " " && field === "transcript") {
        event.preventDefault();
        setIncludeTranscript((value) => !value);
      } else if (event.key === "return") {
        event.preventDefault();
        if (field === "send") submit();
        else setFailureMode(1);
      } else if (
        event.key.toLowerCase() === "d" &&
        field !== "title" &&
        field !== "area" &&
        field !== "details"
      ) {
        event.preventDefault();
        discardDraft(activeDraft);
      }
    }
  }
  let closeToList = useCallback(() => {
    if (submittedRef.current || savingRef.current || discardingRef.current) return;
    submittedRef.current = true;
    persistEdits();
    lastDiscardAt.current = -1 / 0;
    setView("list");
    setActiveDraft(null);
  }, [persistEdits]);
  let close = useCallback(() => {
    if (view !== "review") {
      finishWith();
      return;
    }
    let field = formFields[getFieldIndex()];
    if (field !== "title" && field !== "area" && field !== "details") {
      closeToList();
      return;
    }
    setForm((prev) =>
      prev && activeDraft
        ? {
            ...prev,
            [field]:
              field === "details"
                ? stripInvisibleCharsMultiLine(activeDraft.details)
                : stripInvisibleChars(activeDraft[field] ?? ""),
          }
        : prev,
    );
    setListCursor(null);
    resetFormIndex(formFields);
    setSaveError((error) => (error === DETAILS_TOO_LARGE_MESSAGE ? null : error));
  }, [view, activeDraft, formFields, getFieldIndex, closeToList, setForm, resetFormIndex, finishWith]);
  let inputEnabled = !(isScreenReaderEnabled && orderedDrafts.length > 0);
  let inputGuide =
    view === "list"
      ? jsxProd_default_2(Byline, {
          children: [
            totalRows > 0 &&
              inputEnabled &&
              jsxProd_default(KeyboardShortcutHint, {
                chord: "enter",
                action: newDraftSelected ? "write new feedback" : "review",
              }),
            selectedDraft !== undefined &&
              inputEnabled &&
              jsxProd_default(KeyboardShortcutHint, {
                chord: "d",
                action: "discard",
              }),
            jsxProd_default(KeyboardShortcutHint, {
              chord: "esc",
              action: "close",
            }),
          ],
        })
      : view === "review"
        ? jsxProd_default_2(Byline, {
            children: [
              jsxProd_default(KeyboardShortcutHint, {
                chord: ["up", "down"],
                action: "move",
              }),
              (currentField === "type" ||
                currentField === "failure_mode" ||
                currentField === "task_category" ||
                currentField === "transcript") &&
                jsxProd_default(KeyboardShortcutHint, {
                  chord: ["left", "right"],
                  action: "change",
                }),
              jsxProd_default(KeyboardShortcutHint, {
                chord: "enter",
                action: currentField === "send" ? "send" : "next",
              }),
              currentField === "details" &&
                jsxProd_default(KeyboardShortcutHint, {
                  chord: supportsShiftEnter() ? "shift+enter" : "ctrl+j",
                  action: "new line",
                }),
              !isTextInputField &&
                jsxProd_default(KeyboardShortcutHint, {
                  chord: "d",
                  action: "discard",
                }),
              jsxProd_default(KeyboardShortcutHint, {
                chord: "esc",
                action: isTextInputField ? "cancel edit" : "later",
              }),
            ],
          })
        : null;
  return jsxProd_default(FocusColumn, {
    onKeyDown: handleKeyDown,
    children: jsxProd_default_2(Dialog, {
      title: "Feedback drafts",
      onCancel: close,
      isCancelActive: view !== "submitting" && !isTextInputField,
      hideInputGuide: view === "receipt" || view === "submitting",
      inputGuide,
      children: [
        view === "list" &&
          drafts === null &&
          jsxProd_default(Text, {
            dimColor: true,
            children: "Loading\u2026",
          }),
        view === "list" &&
          drafts !== null &&
          orderedDrafts.length === 0 &&
          jsxProd_default_2(Box, {
            flexDirection: "column",
            gap: 1,
            children: [
              jsxProd_default(Text, {
                children: "No feedback drafts queued.",
              }),
              jsxProd_default(Text, {
                dimColor: true,
                children:
                  "Claude drafts feedback at high-signal moments; drafts appear here for your review.",
              }),
              onWriteNew
                ? jsxProd_default_2(Box, {
                    flexDirection: "column",
                    gap: 1,
                    children: [
                      jsxProd_default(HideRow, {
                        isSelected: newDraftSelected,
                      }),
                      jsxProd_default(Text, {
                        dimColor: true,
                        children: "/bug works anytime. Any other key closes this panel.",
                      }),
                    ],
                  })
                : jsxProd_default(Text, {
                    dimColor: true,
                    children: "Any key closes this panel.",
                  }),
            ],
          }),
        view === "list" &&
          drafts !== null &&
          orderedDrafts.length > 0 &&
          jsxProd_default_2(Box, {
            flexDirection: "column",
            children: [
              jsxProd_default(FeedbackQueueList, {
                thisSession: filtered,
                others: filtered_2,
                hasWriteNew: canWriteNew,
                defaultFocusIndex: cursor,
                onFocus: setCursor,
                onOpen,
                onWriteNew: () => onWriteNew?.(),
                onDiscard: (draft) => void discardDraft(draft),
              }),
              jsxProd_default(Box, {
                marginTop: 1,
                children: jsxProd_default(Text, {
                  dimColor: true,
                  wrap: "wrap",
                  children:
                    "Drafts live only on this machine and are never sent without you. Unsent drafts expire after 30 days.",
                }),
              }),
            ],
          }),
        view === "review" &&
          activeDraft &&
          form &&
          jsxProd_default_2(Box, {
            flexDirection: "column",
            children: [
              jsxProd_default_2(Box, {
                children: [
                  jsxProd_default(FocusPointer, {
                    isFocused: currentField === "type",
                  }),
                  jsxProd_default(Text, {
                    children: "Type: ",
                  }),
                  jsxProd_default(CycleValue, {
                    value: FEEDBACK_TYPE_LABELS[form.type],
                    isFocused: currentField === "type",
                  }),
                ],
              }),
              jsxProd_default(FeedbackField, {
                label: "Title:",
                value: form.title,
                isFocused: currentField === "title",
                bold: true,
                columns,
                cursorOffset: listCursor,
                onChange: (title) =>
                  setForm((form) =>
                    form
                      ? {
                          ...form,
                          title,
                        }
                      : form,
                  ),
                onCursorChange: setListCursor,
                onNext: () => setFailureMode(1),
                onPrev: () => setFailureMode(-1),
                onExit: closeToList,
              }),
              jsxProd_default(FeedbackField, {
                label: "Area:",
                value: form.area,
                isFocused: currentField === "area",
                dim: true,
                columns,
                cursorOffset: listCursor,
                onChange: (area) =>
                  setForm((form) =>
                    form
                      ? {
                          ...form,
                          area,
                        }
                      : form,
                  ),
                onCursorChange: setListCursor,
                onNext: () => setFailureMode(1),
                onPrev: () => setFailureMode(-1),
                onExit: closeToList,
              }),
              jsxProd_default_2(Box, {
                children: [
                  jsxProd_default(FocusPointer, {
                    isFocused: currentField === "failure_mode",
                  }),
                  jsxProd_default(Text, {
                    children: "Failure mode: ",
                  }),
                  jsxProd_default(CycleValue, {
                    value: snakeToWords(form.failureMode),
                    isFocused: currentField === "failure_mode",
                  }),
                ],
              }),
              jsxProd_default_2(Box, {
                children: [
                  jsxProd_default(FocusPointer, {
                    isFocused: currentField === "task_category",
                  }),
                  jsxProd_default(Text, {
                    children: "Task: ",
                  }),
                  jsxProd_default(CycleValue, {
                    value: snakeToWords(form.taskCategory),
                    isFocused: currentField === "task_category",
                  }),
                ],
              }),
              jsxProd_default(FeedbackField, {
                label: "Details:",
                value: form.details,
                isFocused: currentField === "details",
                dim: true,
                multiline: true,
                columns,
                cursorOffset: listCursor,
                onChange: (text) => {
                  let byteLength = Buffer.byteLength(text, "utf8");
                  if (
                    byteLength > MAX_DETAILS_LENGTH &&
                    byteLength >= Buffer.byteLength(form.details, "utf8")
                  ) {
                    setSaveError(DETAILS_TOO_LARGE_MESSAGE);
                    return;
                  }
                  setForm((form) => {
                    if (form && form.details.trim() !== "" && text.trim() === "")
                      lastSaveAt.current = clock.now();
                    return form
                      ? {
                          ...form,
                          details: text,
                        }
                      : form;
                  });
                  setSaveError((error) => (error === DETAILS_TOO_LARGE_MESSAGE ? null : error));
                },
                onCursorChange: setListCursor,
                onNext: () => setFailureMode(1),
                onPrev: () => setFailureMode(-1),
                onExit: closeToList,
              }),
              activeDraft.transcriptAvailable
                ? jsxProd_default_2(Box, {
                    flexDirection: "column",
                    children: [
                      jsxProd_default_2(Box, {
                        children: [
                          jsxProd_default(FocusPointer, {
                            isFocused: currentField === "transcript",
                          }),
                          jsxProd_default(Text, {
                            children: "Send transcript: ",
                          }),
                          jsxProd_default(CycleValue, {
                            value: includeTranscript ? "yes" : "no",
                            isFocused: currentField === "transcript",
                          }),
                          jsxProd_default_2(Text, {
                            dimColor: true,
                            children: [
                              " \xB7 ",
                              includeTranscript ? "sends this conversation to Anthropic" : "report only",
                            ],
                          }),
                        ],
                      }),
                      activeDraft.source_session_id !== sessionId &&
                        jsxProd_default(Box, {
                          marginLeft: 4,
                          children: jsxProd_default_2(Text, {
                            dimColor: true,
                            wrap: "wrap",
                            children: [
                              "from ",
                              stripInvisibleChars(activeDraft.cwd),
                              " \xB7 session",
                              " ",
                              stripInvisibleChars(activeDraft.source_session_id),
                            ],
                          }),
                        }),
                    ],
                  })
                : jsxProd_default_2(Box, {
                    children: [
                      jsxProd_default(FocusPointer, {
                        isFocused: false,
                      }),
                      jsxProd_default_2(Text, {
                        children: [
                          "Send transcript: ",
                          jsxProd_default(Text, {
                            dimColor: true,
                            children: "expired (report only)",
                          }),
                        ],
                      }),
                    ],
                  }),
              jsxProd_default_2(Box, {
                marginTop: 1,
                children: [
                  jsxProd_default(FocusPointer, {
                    isFocused: false,
                  }),
                  jsxProd_default_2(Text, {
                    dimColor: true,
                    wrap: "wrap",
                    children: [
                      "Environment info (",
                      stripInvisibleChars(activeDraft.os),
                      ", v",
                      stripInvisibleChars(activeDraft.cli_version),
                      ",",
                      " ",
                      stripInvisibleChars(activeDraft.model),
                      activeDraft.effort !== undefined &&
                        jsxProd_default_2(Fragment, {
                          children: [", effort", " ", stripInvisibleChars(activeDraft.effort)],
                        }),
                      activeDraft.thinking_type !== undefined &&
                        jsxProd_default_2(Fragment, {
                          children: [
                            ", thinking ",
                            activeDraft.thinking_type,
                            activeDraft.thinking_budget !== undefined &&
                              jsxProd_default_2(Fragment, {
                                children: [" (budget ", activeDraft.thinking_budget, ")"],
                              }),
                          ],
                        }),
                      activeDraft.assistant_turn_count !== undefined &&
                        jsxProd_default_2(Fragment, {
                          children: [
                            ", turn ",
                            activeDraft.assistant_turn_count,
                            activeDraft.message_count !== undefined &&
                              jsxProd_default_2(Fragment, {
                                children: ["/", activeDraft.message_count],
                              }),
                            activeDraft.subagent_count !== undefined &&
                              activeDraft.subagent_count > 0 &&
                              jsxProd_default_2(Fragment, {
                                children: [
                                  " ",
                                  "with ",
                                  activeDraft.subagent_count,
                                  " ",
                                  plural(activeDraft.subagent_count, "subagent"),
                                ],
                              }),
                          ],
                        }),
                      ", drafted ",
                      formatAgeShort(activeDraft.created_at),
                      " ago)",
                      recentCount > 0
                        ? ` and ${recentCount} API request ${plural(recentCount, "id")} are`
                        : " is",
                      " ",
                      "always attached.",
                    ],
                  }),
                ],
              }),
              saveError &&
                jsxProd_default(Box, {
                  marginTop: 1,
                  children: jsxProd_default(ErrorText, {
                    error: saveError,
                  }),
                }),
              jsxProd_default_2(Box, {
                marginTop: 1,
                children: [
                  jsxProd_default(FocusPointer, {
                    isFocused: currentField === "send",
                  }),
                  jsxProd_default(Text, {
                    bold: currentField === "send",
                    children: "Send feedback",
                  }),
                ],
              }),
              jsxProd_default(Box, {
                marginTop: 1,
                children: jsxProd_default(Text, {
                  dimColor: true,
                  wrap: "wrap",
                  children:
                    "We may use these reports to debug related issues and improve Claude Code. Turn off Claude-drafted feedback anytime in /config.",
                }),
              }),
            ],
          }),
        view === "submitting" &&
          jsxProd_default(Text, {
            children: "Sending feedback\u2026",
          }),
        view === "receipt" &&
          jsxProd_default_2(Box, {
            flexDirection: "column",
            children: [
              jsxProd_default_2(Text, {
                color: "success",
                children: [
                  jsxProd_default(StatusIcon, {
                    status: "success",
                    withSpace: true,
                  }),
                  "Feedback sent (receipt ",
                  statusMessage,
                  "). Thanks!",
                ],
              }),
              jsxProd_default(Box, {
                marginTop: 1,
                children: jsxProd_default(Text, {
                  dimColor: true,
                  italic: true,
                  children: "Any key to continue",
                }),
              }),
            ],
          }),
      ],
    }),
  });
}
//@ chunk-pghf5k6z.js:12272-12376 placement
var DETAILS_TOO_LARGE_MESSAGE; // deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
deferInit("chunk-pghf5k6z.js:12272", () => {
  DETAILS_TOO_LARGE_MESSAGE = `That edit would push Details past the ${Math.floor(MAX_DETAILS_LENGTH / 1024)}KB limit. Trim the details first.`;
});
//@ chunk-pghf5k6z.js:12376-12473 placement
function normalizeFeedbackInput(text, multiline) {
  return stripCombiningRepeated(
    text.replace(
      /\r\n|\r/g,
      `
`,
    ),
  )
    .split(
      `
`,
    )
    .map((line) => replaceControlChars(line))
    .join(
      multiline
        ? `
`
        : " ",
    );
}
//@ chunk-pghf5k6z.js:12473-12668 placement
/**
 * 聚焦时显示指针，否则两个空格。
 */
function FocusPointer(props) {
  let $ = useMemoCache(3);
  let { isFocused } = props;
  const color = isFocused ? "suggestion" : undefined;
  const children = isFocused ? `${figures_default.pointer} ` : "  ";
  let content;
  if ($[0] !== color || $[1] !== children) {
    content = jsxProd_default(Text, {
      color,
      children,
    });
    $[0] = color;
    $[1] = children;
    $[2] = content;
  } else content = $[2];
  return content;
}
//@ chunk-pghf5k6z.js:12668-13068 placement
/**
 * 可左右切换的值：聚焦时两侧显示 ◀ ▶。
 */
function CycleValue(props) {
  let $ = useMemoCache(6);
  let { value, isFocused } = props;
  if (!isFocused) {
    let content;
    if ($[0] !== value) {
      content = jsxProd_default(Text, {
        dimColor: true,
        children: value,
      });
      $[0] = value;
      $[1] = content;
    } else content = $[1];
    return content;
  }
  let footer;
  if ($[2] === MEMO_CACHE_SENTINEL) {
    footer = jsxProd_default_2(Text, {
      dimColor: true,
      children: [figures_default.triangleLeft, " "],
    });
    $[2] = footer;
  } else footer = $[2];
  let rightArrow;
  if ($[3] === MEMO_CACHE_SENTINEL) {
    rightArrow = jsxProd_default_2(Text, {
      dimColor: true,
      children: [" ", figures_default.triangleRight],
    });
    $[3] = rightArrow;
  } else rightArrow = $[3];
  let status;
  if ($[4] !== value) {
    status = jsxProd_default_2(Text, {
      children: [footer, value, rightArrow],
    });
    $[4] = value;
    $[5] = status;
  } else status = $[5];
  return status;
}
//@ chunk-pghf5k6z.js:13068-14451 placement
function FeedbackField(props) {
  let $ = useMemoCache(24);
  let {
    label,
    value,
    isFocused,
    bold,
    dim,
    multiline,
    columns,
    cursorOffset,
    onChange,
    onCursorChange,
    onNext,
    onPrev,
    onExit,
  } = props;
  let isScreenReaderEnabled = useIsScreenReaderEnabled();
  let content;
  if ($[0] !== isFocused) {
    content = jsxProd_default(FocusPointer, {
      isFocused,
    });
    $[0] = isFocused;
    $[1] = content;
  } else content = $[1];
  let labelText;
  if ($[2] !== label) {
    labelText = jsxProd_default(Text, {
      children: label,
    });
    $[2] = label;
    $[3] = labelText;
  } else labelText = $[3];
  let footer;
  if ($[4] !== content || $[5] !== labelText) {
    footer = jsxProd_default_2(Box, {
      children: [content, labelText],
    });
    $[4] = content;
    $[5] = labelText;
    $[6] = footer;
  } else footer = $[6];
  let status;
  if (
    $[7] !== bold ||
    $[8] !== columns ||
    $[9] !== cursorOffset ||
    $[10] !== dim ||
    $[11] !== isFocused ||
    $[12] !== isScreenReaderEnabled ||
    $[13] !== multiline ||
    $[14] !== onChange ||
    $[15] !== onCursorChange ||
    $[16] !== onExit ||
    $[17] !== onNext ||
    $[18] !== onPrev ||
    $[19] !== value
  ) {
    status = jsxProd_default(Box, {
      marginLeft: 4,
      children: isFocused
        ? jsxProd_default(Box, {
            borderStyle: multiline && !isScreenReaderEnabled ? "single" : undefined,
            borderLeft: true,
            borderTop: false,
            borderBottom: false,
            borderRight: false,
            borderDimColor: true,
            paddingLeft: multiline && !isScreenReaderEnabled ? 1 : 0,
            children: jsxProd_default(TextInput, {
              value,
              onChange,
              columns: multiline && !isScreenReaderEnabled ? columns - 2 : columns,
              onSubmit: onNext,
              onExit,
              onHistoryUp: onPrev,
              onHistoryDown: onNext,
              cursorOffset: cursorOffset ?? value.length,
              onChangeCursorOffset: onCursorChange,
              multiline,
              inputFilter: (text) => normalizeFeedbackInput(text, multiline),
              clearOnSubmit: false,
              disableCtrlCClear: true,
              disableBackslashReturn: multiline,
              disableCursorMovementForUpDownKeys: !multiline,
              disableEscapeDoublePress: true,
              showCursor: true,
              focus: true,
            }),
          })
        : multiline
          ? jsxProd_default(WrappedTextBox, {
              value,
              bold,
              dim,
              columns,
            })
          : jsxProd_default(Text, {
              bold,
              dimColor: dim,
              wrap: "wrap",
              children: stripInvisibleChars(value),
            }),
    });
    $[7] = bold;
    $[8] = columns;
    $[9] = cursorOffset;
    $[10] = dim;
    $[11] = isFocused;
    $[12] = isScreenReaderEnabled;
    $[13] = multiline;
    $[14] = onChange;
    $[15] = onCursorChange;
    $[16] = onExit;
    $[17] = onNext;
    $[18] = onPrev;
    $[19] = value;
    $[20] = status;
  } else status = $[20];
  let hint;
  if ($[21] !== footer || $[22] !== status) {
    hint = jsxProd_default_2(Box, {
      flexDirection: "column",
      children: [footer, status],
    });
    $[21] = footer;
    $[22] = status;
    $[23] = hint;
  } else hint = $[23];
  return hint;
}
//@ chunk-pghf5k6z.js:14451-14481 placement
var WRITE_NEW_FEEDBACK_LABEL = "+ Write new feedback";
//@ chunk-pghf5k6z.js:14683-16291 placement
function FeedbackQueueList(props) {
  let $ = useMemoCache(34);
  let { thisSession, others, hasWriteNew, defaultFocusIndex, onFocus, onOpen, onWriteNew, onDiscard } = props;
  let { rows } = useScrollViewportSize(useTerminalSize());
  let hasScrollViewport = useHasScrollViewport();
  let content;
  if ($[0] !== others || $[1] !== thisSession) {
    content = [...thisSession, ...others];
    $[0] = others;
    $[1] = thisSession;
    $[2] = content;
  } else content = $[2];
  let otherItems = content;
  let rowOffset =
    (thisSession.length > 0 ? 1 : 0) +
    (others.length > 0 ? 1 : 0) +
    otherItems.length +
    (hasWriteNew ? 2 : 0);
  let max = Math.max(
    FEEDBACK_LIST_MIN_ROWS,
    rows - FEEDBACK_LIST_FIXED_ROWS - (hasScrollViewport ? 0 : FEEDBACK_LIST_CHROME_ROWS),
  );
  const visibleCount = rowOffset > max ? max - 2 : max;
  let onSelect;
  if ($[3] !== onOpen || $[4] !== onWriteNew || $[5] !== otherItems) {
    onSelect = (index) => {
      let selectedItem = otherItems[index];
      if (selectedItem) onOpen(selectedItem);
      else onWriteNew();
    };
    $[3] = onOpen;
    $[4] = onWriteNew;
    $[5] = otherItems;
    $[6] = onSelect;
  } else onSelect = $[6];
  let onRowKeyDown;
  if ($[7] !== onDiscard || $[8] !== otherItems) {
    onRowKeyDown = (event, index) => {
      let rowItem = otherItems[index];
      if (event.key.toLowerCase() === "d" && rowItem && !event.ctrl && !event.meta) {
        event.preventDefault();
        onDiscard(rowItem);
      }
    };
    $[7] = onDiscard;
    $[8] = otherItems;
    $[9] = onRowKeyDown;
  } else onRowKeyDown = $[9];
  let rowContent;
  if ($[10] !== thisSession.length) {
    rowContent =
      thisSession.length > 0 &&
      jsxProd_default(
        merged.Heading,
        {
          children: jsxProd_default(Text, {
            bold: true,
            children: "This session",
          }),
        },
        "this-session",
      );
    $[10] = thisSession.length;
    $[11] = rowContent;
  } else rowContent = $[11];
  let sessionRows;
  if ($[12] !== thisSession) {
    sessionRows = thisSession.map(renderThisSessionFeedbackItem);
    $[12] = thisSession;
    $[13] = sessionRows;
  } else sessionRows = $[13];
  let footer;
  if ($[14] !== others.length) {
    footer =
      others.length > 0 &&
      jsxProd_default(
        merged.Heading,
        {
          children: jsxProd_default(Text, {
            bold: true,
            children: "Other sessions",
          }),
        },
        "other-sessions",
      );
    $[14] = others.length;
    $[15] = footer;
  } else footer = $[15];
  let status;
  if ($[16] !== others) {
    status = others.map(renderOtherFeedbackItem);
    $[16] = others;
    $[17] = status;
  } else status = $[17];
  let writeNewHint;
  if ($[18] !== hasWriteNew) {
    writeNewHint = hasWriteNew && jsxProd_default(merged.Heading, {}, "gap");
    $[18] = hasWriteNew;
    $[19] = writeNewHint;
  } else writeNewHint = $[19];
  let body;
  if ($[20] !== hasWriteNew) {
    body =
      hasWriteNew &&
      jsxProd_default(
        OrderedListWithItem.Item,
        {
          label: WRITE_NEW_FEEDBACK_LABEL,
        },
        "write-new",
      );
    $[20] = hasWriteNew;
    $[21] = body;
  } else body = $[21];
  let details;
  if (
    $[22] !== defaultFocusIndex ||
    $[23] !== onFocus ||
    $[24] !== body ||
    $[25] !== visibleCount ||
    $[26] !== onSelect ||
    $[27] !== onRowKeyDown ||
    $[28] !== rowContent ||
    $[29] !== sessionRows ||
    $[30] !== footer ||
    $[31] !== status ||
    $[32] !== writeNewHint
  ) {
    details = jsxProd_default_2(OrderedListWithItem, {
      visibleCount,
      defaultFocusIndex,
      overflowHint: "count",
      onFocus,
      onSelect,
      onRowKeyDown,
      children: [rowContent, sessionRows, footer, status, writeNewHint, body],
    });
    $[22] = defaultFocusIndex;
    $[23] = onFocus;
    $[24] = body;
    $[25] = visibleCount;
    $[26] = onSelect;
    $[27] = onRowKeyDown;
    $[28] = rowContent;
    $[29] = sessionRows;
    $[30] = footer;
    $[31] = status;
    $[32] = writeNewHint;
    $[33] = details;
  } else details = $[33];
  return details;
}
//@ chunk-pghf5k6z.js:16291-16432 placement
/**
 * 反馈条目的元信息：类型、多久前、目录、transcript 是否可用。
 */
function feedbackItemMeta(meta) {
  return [
    FEEDBACK_TYPE_LABELS[meta.type],
    formatAgeShort(meta.created_at),
    stripInvisibleChars(meta.cwd),
    meta.transcriptAvailable ? "transcript available" : "transcript expired (report only)",
  ];
}
//@ chunk-pghf5k6z.js:16432-16656 placement
function formatAgeShort(createdAt, now = Date.now()) {
  let ageMs = now - Date.parse(createdAt);
  if (!Number.isFinite(ageMs) || ageMs < 0) return "now";
  let floored = Math.floor(ageMs / 60000);
  if (floored < 60) return `${Math.max(1, floored)}m`;
  let floored_2 = Math.floor(floored / 60);
  if (floored_2 < 24) return `${floored_2}h`;
  return `${Math.floor(floored_2 / 24)}d`;
}
export { FeedbackQueue, WRITE_NEW_FEEDBACK_LABEL };
