/**
 * commands/auto-mode-setup/autoModeSetup.tsx
 *
 * 2.1.316 新增：/auto-mode-setup：后台扫描环境、提出 auto mode 规则并写入设置的对话框与命令。
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * new in 2.1.318 (2.1.88 has no file at this path)
 * pieces: chunk-8x5p2wd7.js (19), chunk-vqqyj99a.js (9)
 * attribution: affinity 1, placement 27
 * (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.
 */
import { isAbsolute, resolve, relative } from "path";
import { createHash } from "crypto";
import { tmpdir } from "os";
import { realpath } from "fs/promises";
import { logFeatureBad, logFeatureOk, logFeatureSad } from "../../services/analytics/featureTelemetry.js";
import { getToolPermissionContext } from "../../utils/permissions/toolPermissionContext.js";
import {
  checkAutoModeSetupLogin,
  autoModeSetupLoginMessage,
  proposeAutoModeSetup,
  parseAutoModeProposal,
} from "../../services/autoModeSetup/autoModeSetup.js";
import { isNetworkHomePath } from "../../services/autoModeSetup/homeRepoScan.js";
import { isAttachmentReadDeniedOrThrown } from "../../utils/attachments/fileAttachments.js";
import { readFileGuarded } from "../../utils/fsSafety/guardedFileRead.js";
import { applyAutoModeSettings, AutoModeSetupWriteError } from "../../services/autoModeSetup/applySetup.js";
import { getClaudeConfigDir } from "../../utils/markdownConfigLoader.js";
import { jsonStringify } from "../../utils/slowOperations.js";
import { emitTaskNotification } from "../../utils/task/taskNotifications.js";
import { init_react_production, useState, useEffect } from "../../../vendor/react/cjs/react.production.js";
import { useClock } from "../../ink/components/ClockContext.js";
import { logEvent } from "../../services/analytics/index.js";
import { RECENT_INPUT_GUARD_MS } from "../../hooks/useRecentInputGuard.js";
import { fromEnum } from "../../services/analytics/safeMetadata.js";
import {
  jsxProd_default_2,
  jsxProd_default,
  Fragment,
} from "../../../vendor/react/cjs/react-jsx-dev-runtime.react-server.production.js";
import { Byline } from "../../components/design-system/Byline.js";
import { KeyboardShortcutHint } from "../../components/design-system/KeyboardShortcutHint.js";
import { Dialog } from "../../components/design-system/Dialog.js";
import { ModelSelector } from "../../components/agents/ModelSelector.js";
import { pregatherOptionsFromAnswer } from "../../services/autoModeSetup/pregather.js";
import {
  AutoModeSetupReview,
  AutoModeSetupFlaggedPicker,
} from "../../components/permissions/AutoModeSetupReview.js";
import { WorkerBadge } from "../../components/permissions/WorkerBadge.js";
import { Box, Text } from "../../ink/components/Text.js";
import { StatusIcon } from "../../components/design-system/StatusIcon.js";
import { useMemoCache } from "../../../vendor/react/compiler-runtime.js";
import { useIsScreenReaderEnabled } from "../../ink/components/ErrorBoundary.js";
import { useDialogKeybindings } from "../../keybindings/dialogKeyHints.js";
import { merged } from "../../components/CustomSelect/selectA11y.js";
import { Select } from "../../components/CustomSelect/selectTypeahead.js";
import { MEMO_CACHE_SENTINEL } from "../../../runtime/bun-runtime.js";
import { useKeybinding } from "../../keybindings/useKeybinding.js";
import {
  getBackgroundAutoModeSetupInFlight,
  setBackgroundAutoModeSetupInFlight,
} from "../../bootstrap/state.js";
import { createSystemMessage } from "../../utils/messages.js";
import {
  errorMessage,
  TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS,
} from "../../utils/errors.js";
import { logError } from "../../utils/log.js";
import { registerAutoModeScanTask, findRunningAutoModeScanTask } from "../../tasks/AutoModeScanTask.js";
import {
  autoModeSetupReviewDialogDef,
  AUTO_MODE_SETUP_FLAGGED_DIALOG,
} from "../../components/dialogs/dialogKinds.js";
import { onceExport } from "../../../vendor/lodash-es/once.js";
import { autoModeConfigSchema, getSettingsForSourceForUpkeep } from "../../utils/settings/settings.js";

//@ chunk-vqqyj99a.js:13291-14642 placement
/**
 * /auto-mode-setup 文本命令入口：解析参数（含 --request-id）后执行 propose/apply，结果以 JSON 文本返回并回显 requestId。
 */
var APPLY_TARGETS = ["user", "project"];
var APPLY_TARGET_TO_SCOPE = {
  user: "all",
  project: "project",
};
var AUTO_MODE_SETUP_USAGE = `Usage:
  /auto-mode-setup [--request-id <uuid>] --wizard posture=<personal|open-source|enterprise|mixed> scope=<all|project> depth=<both|shell|repos|here> --propose
  /auto-mode-setup [--request-id <uuid>] [--apply-target <user|project>] --expect-sha256 <64-hex> --apply-file <absolute-path>   (reads a proposal JSON from a file under the system temp dir or the Claude config dir \u2014 the caller must have shown it to the user first; --expect-sha256 is required and the apply refuses unless the file\u2019s exact bytes hash to the given sha256)

--request-id must come first when used. The token must be a UUID (canonical 8-4-4-4-12 hex-and-dash form, either case) and is echoed verbatim as "requestId" on the command's JSON result, so a host with several commands in flight can match replies to requests.

--apply-target doesn\u2019t change where the config is written \u2014 entries always land in the user settings file. It refuses a proposal whose scope answer doesn\u2019t match the save choice (user \u2194 scope=all, project \u2194 scope=project). Flags ride in the order shown; everything after --apply-file is the path.`;
var SHA256_HEX_RE = /^[0-9a-fA-F]{64}$/;
var MAX_PROPOSAL_FILE_BYTES = 1e6;
var UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
var callAutoModeSetup = async (args, context) => {
  let autoModeSetupCommandArgs = parseAutoModeSetupCommandArgs(args);
  return textResultWithRequestId(
    await runAutoModeSetup(autoModeSetupCommandArgs, context),
    autoModeSetupCommandArgs.requestId,
  );
};
//@ chunk-vqqyj99a.js:14642-18556 placement
/**
 * 处理 propose/apply-file：读取提议（读拒绝、大小、哈希不符、解析失败）并写入设置（约 4 KB）。
 */
async function runAutoModeSetup(autoModeSetupCommandArgs, context) {
  if (autoModeSetupCommandArgs.mode === "usage") {
    if (autoModeSetupCommandArgs.logCode !== undefined)
      logFeatureBad("auto_mode_setup_write", autoModeSetupCommandArgs.logCode);
    return {
      ok: false,
      code: "usage",
      reason: autoModeSetupCommandArgs.message,
      usage: AUTO_MODE_SETUP_USAGE,
    };
  }
  if (autoModeSetupCommandArgs.mode === "apply-file") {
    if (autoModeSetupCommandArgs.expectedSha256 === undefined) {
      logFeatureBad("auto_mode_setup_write", "missing_hash_arg");
      return {
        ok: false,
        code: "missing_hash_arg",
        reason:
          "--expect-sha256 is required: pass the 64-character hex sha256 of the proposal file\u2019s exact bytes, before --apply-file. Every non-interactive apply is hash-bound.",
      };
    }
    if (!SHA256_HEX_RE.test(autoModeSetupCommandArgs.expectedSha256)) {
      logFeatureBad("auto_mode_setup_write", "bad_hash_arg");
      return {
        ok: false,
        code: "bad_hash_arg",
        reason:
          "--expect-sha256 must be the 64-character hex sha256 digest of the proposal file\u2019s exact bytes.",
      };
    }
  }
  let toolPermissionContext = getToolPermissionContext(context);
  if (autoModeSetupCommandArgs.mode === "propose") {
    let login = await checkAutoModeSetupLogin({
      credentials: context.credentials,
      storageV5: context.storageV5,
    });
    if (login !== "ok") {
      logFeatureBad("auto_mode_setup_propose", login);
      return {
        ok: false,
        code: login,
        reason: autoModeSetupLoginMessage(login),
      };
    }
    let proposal = await proposeAutoModeSetup(
      autoModeSetupCommandArgs.answers,
      toolPermissionContext,
      context.abortController.signal,
      undefined,
      undefined,
      context.storageV5,
      context.credentials,
    );
    if (!proposal.ok)
      return {
        ok: false,
        code: proposal.code,
        reason: proposal.reason,
      };
    return {
      ok: true,
      proposal: proposal.proposal,
    };
  }
  if (
    !isAbsolute(autoModeSetupCommandArgs.path) ||
    isNetworkHomePath(autoModeSetupCommandArgs.path) ||
    !(await isUnderTempOrConfigDir(autoModeSetupCommandArgs.path))
  ) {
    logFeatureBad("auto_mode_setup_write", "bad_path");
    return {
      ok: false,
      code: "bad_path",
      reason:
        "Pass an absolute path under the system temp directory or the Claude config directory \u2014 --apply-file only reads proposal files the reviewing host wrote there.",
    };
  }
  if (
    isAttachmentReadDeniedOrThrown(autoModeSetupCommandArgs.path, {
      ...toolPermissionContext,
      blockReadsOutsideWorkingDirectories: undefined,
    })
  ) {
    logFeatureBad("auto_mode_setup_write", "read_denied");
    return {
      ok: false,
      code: "read_denied",
      reason:
        "That path is covered by a permissions.deny read rule. Write the proposal somewhere the session can read.",
    };
  }
  let fileGuarded = await readFileGuarded(autoModeSetupCommandArgs.path, MAX_PROPOSAL_FILE_BYTES, {
    noFollow: true,
    requireNlink1: true,
    sniffEncoding: true,
    withBytes: true,
  });
  if (fileGuarded === null) {
    logFeatureBad("auto_mode_setup_write", "read_failed");
    return {
      ok: false,
      code: "read_failed",
      reason: "Couldn\u2019t read the proposal file. Check the path and that it is a regular file.",
    };
  }
  let content = fileGuarded.content;
  if (fileGuarded.truncated) {
    logFeatureBad("auto_mode_setup_write", "too_large");
    return {
      ok: false,
      code: "too_large",
      reason:
        "The proposal file is over the 1 MB cap \u2014 a real proposal is a few KB. Regenerate it with --propose.",
    };
  }
  let lower = autoModeSetupCommandArgs.expectedSha256.toLowerCase();
  if (createHash("sha256").update(fileGuarded.bytes).digest("hex") !== lower) {
    logFeatureBad("auto_mode_setup_write", "hash_mismatch");
    return {
      ok: false,
      code: "hash_mismatch",
      expectedSha256: lower,
      reason:
        "The proposal file\u2019s bytes do not match the reviewed digest \u2014 the file changed after it was approved. Nothing was written; regenerate the proposal, re-review, and retry.",
    };
  }
  let autoModeProposal = parseAutoModeProposal(content);
  if (!autoModeProposal.ok) {
    logFeatureBad("auto_mode_setup_write", autoModeProposal.code);
    return {
      ok: false,
      code: autoModeProposal.code,
      reason:
        autoModeProposal.code === "parse_failed"
          ? "That file doesn\u2019t contain a proposal this command can read. Regenerate it with --propose and pass that output."
          : autoModeProposal.reason.replace(
              /Re-run to try again\.?$/,
              "Regenerate the proposal with --propose.",
            ),
    };
  }
  if (autoModeSetupCommandArgs.target !== undefined) {
    let applyScope = APPLY_TARGET_TO_SCOPE[autoModeSetupCommandArgs.target];
    if (autoModeProposal.proposal.scope !== applyScope) {
      logFeatureBad("auto_mode_setup_write", "scope_mismatch");
      return {
        ok: false,
        code: "scope_mismatch",
        reason:
          autoModeProposal.proposal.scope === undefined
            ? `This proposal was generated before save scope was recorded, so --apply-target ${autoModeSetupCommandArgs.target} can\u2019t confirm it matches. Regenerate the proposal with --propose, answering scope=${applyScope}.`
            : `This proposal was generated for a different save scope (${autoModeProposal.proposal.scope}) than --apply-target ${autoModeSetupCommandArgs.target} expects (${applyScope}). Regenerate the proposal with --propose, answering scope=${applyScope}.`,
      };
    }
  }
  try {
    return {
      ok: true,
      ...(await applyAutoModeSettings(
        {
          mode: autoModeProposal.proposal.mode,
          autoMode: {
            environment: autoModeProposal.proposal.environment,
            ...(autoModeProposal.proposal.allow.length > 0 && {
              allow: autoModeProposal.proposal.allow,
            }),
            ...(autoModeProposal.proposal.soft_deny.length > 0 && {
              soft_deny: autoModeProposal.proposal.soft_deny,
            }),
            ...(autoModeProposal.proposal.hard_deny.length > 0 && {
              hard_deny: autoModeProposal.proposal.hard_deny,
            }),
          },
          removeFromPermissionsAllow: autoModeProposal.proposal.remove_from_permissions_allow,
        },
        context.storageV5,
      )),
      ...(autoModeSetupCommandArgs.target !== undefined && {
        target: autoModeSetupCommandArgs.target,
      }),
      ...(autoModeProposal.droppedUnsafeAllowCount > 0 && {
        droppedUnsafeAllowCount: autoModeProposal.droppedUnsafeAllowCount,
      }),
    };
  } catch (error) {
    return {
      ok: false,
      code: error instanceof AutoModeSetupWriteError ? error.code : "write_failed",
      reason: error instanceof Error ? error.message : String(error),
    };
  }
}
//@ chunk-vqqyj99a.js:18556-18748 placement
/**
 * 判断路径（含 realpath）是否位于系统临时目录或 Claude 配置目录之下，用于限制 --apply-file 可读取的提议文件位置。
 */
async function isUnderTempOrConfigDir(path) {
  let resolvedPath = resolve(path);
  let seen = new Set();
  for (let dir of [tmpdir(), getClaudeConfigDir()]) {
    seen.add(resolve(dir));
    try {
      seen.add(await realpath(dir));
    } catch {}
  }
  for (let baseDir of seen) {
    let relativePath = relative(baseDir, resolvedPath);
    if (relativePath !== "" && !relativePath.startsWith("..") && !isAbsolute(relativePath)) return true;
  }
  return false;
}
//@ chunk-vqqyj99a.js:18748-19169 placement
function parseRequestIdArg(arg) {
  let match = arg.match(/^--request-id(?:=|\s+(?!--))(\S+)\s*/);
  if (!match) {
    if (/^--request-id=?(?=\s|$)/.test(arg))
      return {
        ok: false,
        message: `--request-id needs a value.
${AUTO_MODE_SETUP_USAGE}`,
      };
    return {
      ok: true,
      rest: arg,
    };
  }
  let requestId = match[1];
  if (!UUID_RE.test(requestId))
    return {
      ok: false,
      message: `--request-id must be a UUID in canonical 8-4-4-4-12 hex-and-dash form (either case) \u2014 the token is refused, not echoed.
${AUTO_MODE_SETUP_USAGE}`,
    };
  return {
    ok: true,
    rest: arg.slice(match[0].length),
    requestId,
  };
}
//@ chunk-vqqyj99a.js:19169-19351 placement
function parseAutoModeSetupCommandArgs(argv) {
  let requestIdArg = parseRequestIdArg(argv.trim());
  if (!requestIdArg.ok)
    return {
      mode: "usage",
      message: requestIdArg.message,
      logCode: "bad_flag_grammar",
    };
  let autoModeSetupArgs = parseAutoModeSetupArgs(requestIdArg.rest);
  return requestIdArg.requestId === undefined
    ? autoModeSetupArgs
    : {
        ...autoModeSetupArgs,
        requestId: requestIdArg.requestId,
      };
}
//@ chunk-vqqyj99a.js:19351-22596 placement
/**
 * 解析 /auto-mode-setup 参数（--request-id、--expect-sha256、--propose 等）。
 */
function parseAutoModeSetupArgs(argv) {
  let trimmed = argv.trim();
  if (trimmed === "" || trimmed === "--help" || trimmed === "-h")
    return {
      mode: "usage",
      message: AUTO_MODE_SETUP_USAGE,
    };
  if (/^--request-id(?:=|\s|$)/.test(trimmed))
    return {
      mode: "usage",
      message:
        `--request-id was given more than once \u2014 pass exactly one, as the first flag.
` + AUTO_MODE_SETUP_USAGE,
      logCode: "bad_flag_grammar",
    };
  let target;
  let trimmedArg = trimmed;
  let match = trimmedArg.match(/^--apply-target(?:[= ]\s*(\S+))?(?:\s+|$)/);
  if (match) {
    target = findInList(match[1], APPLY_TARGETS);
    if (!target)
      return {
        mode: "usage",
        message: `--apply-target must be "user" or "project".
${AUTO_MODE_SETUP_USAGE}`,
        logCode: "bad_flag_grammar",
      };
    trimmedArg = trimmedArg.slice(match[0].length);
    if (/^--apply-target(?:[= ]|\s|$)/.test(trimmedArg))
      return {
        mode: "usage",
        message:
          `--apply-target was given more than once \u2014 pass exactly one.
` + AUTO_MODE_SETUP_USAGE,
        logCode: "bad_flag_grammar",
      };
    if (/^--request-id(?:=|\s|$)/.test(trimmedArg))
      return {
        mode: "usage",
        message:
          `--request-id must come first, before --apply-target and --expect-sha256.
` + AUTO_MODE_SETUP_USAGE,
        logCode: "bad_flag_grammar",
      };
    if (!/^(?:--expect-sha256|--apply-file)(?:\s|$)/.test(trimmedArg))
      return {
        mode: "usage",
        message: `--apply-target only applies to --apply-file.
${AUTO_MODE_SETUP_USAGE}`,
        logCode: "bad_flag_grammar",
      };
  }
  let raw;
  if (/^--expect-sha256=/.test(trimmedArg))
    return {
      mode: "usage",
      message:
        "--expect-sha256 takes its value space-separated, not with `=`: --expect-sha256 <64-hex> --apply-file <path>.\n" +
        AUTO_MODE_SETUP_USAGE,
      logCode: "bad_flag_grammar",
    };
  if (/^--expect-sha256(?:\s|$)/.test(trimmedArg)) {
    let match = trimmedArg.match(/^--expect-sha256\s+(\S+)\s*(.*)$/s);
    let requestId = match?.[1];
    if (requestId === undefined || requestId.startsWith("--"))
      return {
        mode: "usage",
        message:
          `--expect-sha256 needs the 64-character hex sha256 of the proposal file\u2019s exact bytes.
` + AUTO_MODE_SETUP_USAGE,
        logCode: "bad_flag_grammar",
      };
    raw = requestId;
    trimmedArg = match[2];
    if (!/^--apply-file(?:\s|$)/.test(trimmedArg))
      return {
        mode: "usage",
        message:
          `--expect-sha256 applies only to --apply-file and must come directly before it (--apply-target goes before --expect-sha256).
` + AUTO_MODE_SETUP_USAGE,
        logCode: "bad_flag_grammar",
      };
  }
  if (/^--apply-file(?:\s|$)/.test(trimmedArg)) {
    let match = trimmedArg.match(/^--apply-file\s+(.+)$/s);
    if (match) {
      let trimmed = match[1].trim();
      if (/(?:^|\s)--expect-sha256(?:=|\s|$)/.test(trimmed))
        return {
          mode: "usage",
          message:
            `--expect-sha256 must come before --apply-file, not after it.
` + AUTO_MODE_SETUP_USAGE,
          logCode: "bad_flag_grammar",
        };
      if (/(?:^|\s)--request-id(?:=|\s|$)/.test(trimmed))
        return {
          mode: "usage",
          message:
            `--request-id must come first, before --expect-sha256 and --apply-file \u2014 not after --apply-file.
` + AUTO_MODE_SETUP_USAGE,
          logCode: "bad_flag_grammar",
        };
      if (/(?:^|\s)--apply-target(?:=|\s|$)/.test(trimmed))
        return {
          mode: "usage",
          message:
            `--apply-target must come before --expect-sha256 and --apply-file \u2014 not after --apply-file.
` + AUTO_MODE_SETUP_USAGE,
          logCode: "bad_flag_grammar",
        };
      return {
        mode: "apply-file",
        path: stripMatchingQuotes(trimmed),
        ...(target !== undefined && {
          target,
        }),
        ...(raw !== undefined && {
          expectedSha256: raw,
        }),
      };
    }
    return {
      mode: "usage",
      message:
        `--apply-file needs a path to the reviewed proposal JSON.
` + AUTO_MODE_SETUP_USAGE,
      logCode: "bad_flag_grammar",
    };
  }
  let match_2 = trimmedArg.match(/^--wizard posture=(\S+) scope=(\S+) depth=(\S+)\s+--propose$/);
  if (!match_2) {
    if (/--apply\b/.test(trimmedArg))
      return {
        mode: "usage",
        message:
          "One-shot --apply isn\u2019t available (it would write model output with no review). Use --propose, show the result to the user, then --apply-file <path>.",
      };
    return {
      mode: "usage",
      message: `Couldn\u2019t parse arguments.
${AUTO_MODE_SETUP_USAGE}`,
    };
  }
  let inList = findInList(match_2[1], ["personal", "open-source", "enterprise", "mixed"]);
  let inList_2 = findInList(match_2[2], ["all", "project"]);
  let inList_3 = findInList(match_2[3], ["both", "shell", "repos", "here"]);
  if (!inList || !inList_2 || !inList_3)
    return {
      mode: "usage",
      message: `Couldn\u2019t parse arguments.
${AUTO_MODE_SETUP_USAGE}`,
    };
  return {
    mode: "propose",
    answers: {
      posture: inList,
      scope: inList_2,
      depth: inList_3,
    },
  };
}
//@ chunk-vqqyj99a.js:22596-22704 placement
function stripMatchingQuotes(value) {
  return (value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))
    ? value.slice(1, -1)
    : value;
}
//@ chunk-vqqyj99a.js:22704-22746 placement
function findInList(needle, list) {
  return list.find((item) => item === needle);
}
//@ chunk-vqqyj99a.js:22746-22838 placement
function textResultWithRequestId(result, requestId) {
  let withRequestId =
    requestId === undefined
      ? result
      : {
          ...result,
          requestId,
        };
  return {
    type: "text",
    value: jsonStringify(withRequestId, null, 2),
  };
}
//@ chunk-8x5p2wd7.js:16576-16781 affinity
/**
 * 把运行中的 dream 任务置为给定终态（failed 等）并发 ambient 通知。
 */
function failTaskAndNotify(taskId, taskRegistry, status) {
  let didFail = false;
  taskRegistry.update(taskId, (task) => {
    if (task.status !== "running") return task;
    didFail = true;
    return {
      ...task,
      status,
      endTime: Date.now(),
      notified: true,
      abortController: undefined,
    };
  });
  if (didFail)
    emitTaskNotification(taskId, status, {
      skipTranscript: true,
      ambient: true,
    });
}
//@ chunk-8x5p2wd7.js:16781-16785 placement
init_react_production();
//@ chunk-8x5p2wd7.js:16785-16968 placement (2.1.88 match: autoModeConfigHandler, 0.842)
function autoModeConfigHandler(props) {
  return {
    environment: props.environment,
    ...(props.allow.length > 0 && {
      allow: props.allow,
    }),
    ...(props.soft_deny.length > 0 && {
      soft_deny: props.soft_deny,
    }),
    ...(props.hard_deny.length > 0 && {
      hard_deny: props.hard_deny,
    }),
  };
}
//@ chunk-8x5p2wd7.js:16968-17702 placement
function savedToMessage(settings, state) {
  return (
    `Saved to ${settings.filePath} (${settings.autoModeKeysWritten.join(", ")}` +
    (settings.environmentEntriesPreserved > 0
      ? `; kept ${settings.environmentEntriesPreserved} existing environment ${settings.environmentEntriesPreserved === 1 ? "entry" : "entries"}`
      : "") +
    (state.removed > 0
      ? `; removed ${state.removed} permissions.allow ${state.removed === 1 ? "entry" : "entries"}`
      : "") +
    "). Run `claude auto-mode config` to see the effective result." +
    (state.skipped > 0
      ? ` Note: ${state.skipped} ${state.skipped === 1 ? "rule" : "rules"} couldn\u2019t be removed \u2014 permissions.allow isn\u2019t an array in your settings.`
      : "") +
    ((state.notFound ?? 0) > 0
      ? ` Note: ${state.notFound} ${state.notFound === 1 ? "rule was" : "rules were"} already gone from permissions.allow.`
      : "") +
    (settings.warnings.length > 0
      ? `
${settings.warnings.join(`
`)}`
      : "")
  );
}
//@ chunk-8x5p2wd7.js:17702-17958 placement
function initialAutoModeSetupState(hasExisting = false) {
  return {
    step: hasExisting ? "existing" : "confirm",
    hasExisting,
    mode: "append",
    posture: "mixed",
    gathersFromGitHubOrg: false,
    flaggedPicking: false,
    flaggedSelection: [],
    confirmSelection: ["shell"],
    confirmFocus: 1,
    confirmSrAtPosture: true,
    shownLogged: false,
    resolution: "none",
  };
}
//@ chunk-8x5p2wd7.js:17958-18700 placement
/**
 * auto 模式环境配置向导的标题与说明文案常量。
 */
var AUTO_MODE_SETUP_TITLE = "Teach auto mode about your environment?";
var AUTO_MODE_SETUP_DESCRIPTION =
  "Claude Code reads this project, your recent Claude sessions, and optionally your shell history and other repositories. Claude analyzes this data and customizes auto mode to make better decisions.";
var POSTURE_LABEL = "How you use Claude here";
var POSTURE_OPTIONS = [
  {
    value: "enterprise",
    label: "Work",
  },
  {
    value: "open-source",
    label: "Open source",
  },
  {
    value: "personal",
    label: "Hobby",
  },
  {
    value: "mixed",
    label: "Mixed",
  },
];
var OPTIONAL_READ_OPTIONS = [
  {
    value: "shell",
    label: "Also scan shell history",
  },
  {
    value: "repos",
    label: "Also scan your other repos",
  },
];
var SCREEN_READER_READ_OPTIONS = [
  {
    value: "shell",
    label: "Also scan shell history (default)",
  },
  {
    value: "repos",
    label: "Also scan your other repos",
  },
  {
    value: "both",
    label: "Scan both",
  },
  {
    value: "here",
    label: "Neither \u2014 just this project and sessions",
  },
];
//@ chunk-8x5p2wd7.js:18700-18837 placement
function depthToReadScopes(paths) {
  switch (paths) {
    case "both":
      return ["shell", "repos"];
    case "shell":
      return ["shell"];
    case "repos":
      return ["repos"];
    case "here":
      return [];
  }
}
//@ chunk-8x5p2wd7.js:18837-23151 placement
/**
 * /auto-mode-setup 对话框（2.1.316 新增）：后台扫描环境、提出 auto mode 规则建议，用户确认后写入设置。
 */
function AutoModeSetupDialog({
  state,
  propose,
  onBackgroundStart,
  abort,
  write,
  writeRemoval,
  onDone,
  onCancel,
}) {
  let [, setStep] = useState(state.step);
  let step = state.step;
  let clock = useClock();
  useState(() => {
    state.lastAcceptAt = Math.max(clock.now(), state.lastAcceptAt ?? 0);
    return null;
  });
  useEffect(() => {
    state.notify = () => setStep(state.step);
    setStep(state.step);
    return () => {
      state.notify = undefined;
    };
  }, [state]);
  useEffect(() => {
    if (!state.shownLogged) {
      state.shownLogged = true;
      logEvent("tengu_auto_mode_setup_wizard_shown", {
        has_existing: state.hasExisting ? 1 : 0,
      });
    }
  }, [state]);
  function useAutoModeSetup() {
    let now = clock.now();
    let lastAcceptAt = state.lastAcceptAt;
    state.lastAcceptAt = Math.max(now, lastAcceptAt ?? now);
    return lastAcceptAt !== undefined && now - lastAcceptAt >= RECENT_INPUT_GUARD_MS;
  }
  function acceptStep(value) {
    if (!useAutoModeSetup()) return false;
    return state.step === value && state.resolution === "none";
  }
  function accept(step) {
    state.lastAcceptAt = Math.max(clock.now(), state.lastAcceptAt ?? 0);
    state.step = step;
    state.notify?.();
  }
  function skip(reason) {
    if (state.resolution !== "none") return;
    state.resolution = "cancel";
    logEvent("tengu_auto_mode_setup_wizard_resolved", {
      choice: fromEnum(reason),
      step: fromEnum(state.step),
    });
    onCancel();
  }
  function reload() {
    skip("cancel");
  }
  function reject(settings, outcome) {
    if (state.resolution !== "none") return;
    state.resolution = "done";
    logEvent("tengu_auto_mode_setup_wizard_resolved", {
      choice: fromEnum("saved"),
      mode: fromEnum(state.mode),
    });
    onDone(savedToMessage(settings, outcome));
  }
  function footer() {
    if (!useAutoModeSetup()) return;
    if (state.saved) {
      reject(state.saved, {
        removed: 0,
        skipped: 0,
      });
      return;
    }
    skip("error");
  }
  let byline = jsxProd_default_2(Byline, {
    children: [
      step === "confirm"
        ? jsxProd_default(KeyboardShortcutHint, {
            chord: ["left", "right"],
            action: "change",
          })
        : null,
      jsxProd_default(KeyboardShortcutHint, {
        chord: "enter",
        action: "continue",
      }),
      jsxProd_default(KeyboardShortcutHint, {
        chord: "escape",
        action: "cancel",
      }),
    ],
  });
  if (step === "existing")
    return jsxProd_default(Dialog, {
      title: "You already have auto-mode entries \u2014 add to them, or start fresh?",
      onCancel: reload,
      inputGuide: byline,
      children: jsxProd_default(ModelSelector, {
        options: [
          {
            value: "append",
            label: "Add to them (keeps your existing entries)",
          },
          {
            value: "replace",
            label: "Start fresh (replaces the environment section)",
          },
          {
            value: "cancel",
            label: "Cancel",
          },
        ],
        onChange: (posture) => {
          if (!acceptStep("existing")) return;
          if (posture === "cancel") {
            reload();
            return;
          }
          state.mode = posture;
          accept("confirm");
        },
        onCancel: reload,
      }),
    });
  if (step === "confirm")
    return jsxProd_default(AutoModeSetupIntroDialog, {
      persisted: state,
      cancel: reload,
      footer: byline,
      isFreshKeypress: useAutoModeSetup,
      onContinue: (result) => {
        if (!acceptStep("confirm")) return;
        let included = result.includes("shell");
        let included_2 = result.includes("repos");
        let viewModel = {
          posture: state.posture,
          scope: "project",
          depth: included && included_2 ? "both" : included ? "shell" : included_2 ? "repos" : "here",
        };
        logEvent("tengu_auto_mode_setup_wizard_answers", {
          posture: fromEnum(viewModel.posture),
          scope: fromEnum(viewModel.scope),
          depth: fromEnum(viewModel.depth),
        });
        state.gathersFromGitHubOrg = pregatherOptionsFromAnswer(viewModel).allProjects;
        if (onBackgroundStart) {
          state.resolution = "done";
          onBackgroundStart(viewModel);
          onDone(
            `Gathering data and drafting your auto-mode setup; back soon${state.gathersFromGitHubOrg ? " (also scanning your GitHub org \u2014 stoppable from the background tasks list)" : ""}`,
          );
          return;
        }
        accept("propose");
        propose(viewModel).then(
          (value) => {
            if (value.ok) {
              state.proposal = value.proposal;
              accept("review");
            } else if (value.code === "aborted") reload();
            else {
              state.error = value.reason;
              accept("error");
            }
          },
          (error) => {
            state.error = error instanceof Error ? error.message : String(error);
            accept("error");
          },
        );
      },
    });
  if (step === "propose")
    return jsxProd_default(WorkerBadgeWithEscape, {
      message: state.gathersFromGitHubOrg
        ? "Scanning your repo, recent sessions, and your GitHub org\u2026"
        : "Scanning your repo and recent sessions\u2026",
      subtitle: "then drafting a proposal \u2014 this can take a moment (Esc to cancel)",
      onEscape: abort,
    });
  if (step === "review" && state.proposal) {
    let proposal = state.proposal;
    return jsxProd_default(AutoModeSetupReview, {
      hideIndexes: true,
      proposal,
      onCancel: reload,
      onDecline: () => {
        if (!acceptStep("review")) return;
        state.resolution = "done";
        logEvent("tengu_auto_mode_setup_wizard_resolved", {
          choice: fromEnum("decline"),
        });
        onDone("Discarded \u2014 nothing was saved. Re-run /auto-mode-setup anytime.");
      },
      onAccept: () => {
        if (!acceptStep("review")) return;
        accept("write");
        write(proposal, state.mode).then(
          (choice) => {
            state.saved = choice;
            if (proposal.remove_from_permissions_allow.length > 0) accept("flagged");
            else
              reject(choice, {
                removed: 0,
                skipped: 0,
              });
          },
          (error) => {
            state.error = error instanceof Error ? error.message : String(error);
            accept("error");
          },
        );
      },
    });
  }
  if (step === "write")
    return jsxProd_default(WorkerBadge, {
      message: "Saving\u2026",
    });
  if (step === "flagged" && state.proposal && state.saved) {
    let saved = state.saved;
    return jsxProd_default(AutoModeSetupFlaggedPicker, {
      hideIndexes: true,
      flagged: state.proposal.remove_from_permissions_allow,
      initialPicking: state.flaggedPicking,
      onPickingChange: (flaggedPicking) => {
        if (!acceptStep("flagged")) return false;
        state.flaggedPicking = flaggedPicking;
        return true;
      },
      initialSelection: state.flaggedSelection,
      onSelectionChange: (flaggedSelection) => {
        state.flaggedSelection = flaggedSelection;
      },
      onCancel: () => {
        if (!useAutoModeSetup()) return;
        reject(saved, {
          removed: 0,
          skipped: 0,
        });
      },
      onResolve: (outcome) => {
        if (!acceptStep("flagged")) return;
        if (outcome.length === 0) {
          reject(saved, {
            removed: 0,
            skipped: 0,
          });
          return;
        }
        accept("write");
        writeRemoval(outcome).then(
          (err) =>
            reject(saved, {
              removed: err.permissionsAllowRemoved.length,
              skipped: err.permissionsAllowSkipped ? outcome.length : 0,
              notFound: err.permissionsAllowNotFound.length,
            }),
          (error) => {
            state.error = error instanceof Error ? error.message : String(error);
            accept("error");
          },
        );
      },
    });
  }
  return jsxProd_default(Dialog, {
    title: "Auto-mode setup",
    onCancel: footer,
    children: jsxProd_default_2(Box, {
      flexDirection: "column",
      gap: 1,
      children: [
        jsxProd_default_2(Box, {
          children: [
            jsxProd_default(StatusIcon, {
              status: "error",
            }),
            jsxProd_default_2(Text, {
              children: [" ", state.error ?? "Something went wrong."],
            }),
          ],
        }),
        jsxProd_default(ModelSelector, {
          options: [
            {
              value: "close",
              label: "Close",
            },
          ],
          onChange: footer,
          onCancel: footer,
        }),
      ],
    }),
  });
}
//@ chunk-8x5p2wd7.js:23151-23320 placement
function AutoModeSetupIntroDialog(props) {
  let $ = useMemoCache(4);
  if (useIsScreenReaderEnabled()) {
    let content;
    if ($[0] !== props) {
      content = jsxProd_default(ScreenReaderIntroDialog, {
        ...props,
      });
      $[0] = props;
      $[1] = content;
    } else content = $[1];
    return content;
  }
  let footer;
  if ($[2] !== props) {
    footer = jsxProd_default(AutoModeSetupConfirmDialog, {
      ...props,
    });
    $[2] = props;
    $[3] = footer;
  } else footer = $[3];
  return footer;
}
//@ chunk-8x5p2wd7.js:23320-24241 placement
/**
 * auto-mode-setup 的确认对话框：姿态选择 + 可选读取项开关 + 页脚，确认后继续。
 */
function AutoModeSetupConfirmDialog({ persisted, cancel, footer, onContinue, isFreshKeypress }) {
  let [, setTick] = useState(0);
  let bumpTick = () => setTick((value) => value + 1);
  let run = () => {
    if (persisted.confirmFocus !== 0) return false;
    isFreshKeypress();
  };
  return jsxProd_default_2(Dialog, {
    title: AUTO_MODE_SETUP_TITLE,
    onCancel: cancel,
    inputGuide: footer,
    children: [
      jsxProd_default(Text, {
        children: AUTO_MODE_SETUP_DESCRIPTION,
      }),
      jsxProd_default(useDialogKeybindings, {
        bindings: [
          {
            action: "confirm:yes",
            run,
          },
          {
            action: "confirm:toggle",
            run,
          },
        ],
        children: jsxProd_default(merged, {
          wrap: true,
          visibleCount: 2 * (OPTIONAL_READ_OPTIONS.length + 2) + 1,
          defaultFocusIndex: persisted.confirmFocus,
          onFocus: (confirmFocus) => {
            persisted.confirmFocus = confirmFocus;
          },
          children: [
            jsxProd_default(
              merged.Field,
              {
                label: POSTURE_LABEL,
                children: jsxProd_default(merged.Select, {
                  value: persisted.posture,
                  options: POSTURE_OPTIONS,
                  onChange: (posture) => {
                    persisted.posture = posture;
                    bumpTick();
                  },
                }),
              },
              "posture",
            ),
            ...OPTIONAL_READ_OPTIONS.map((option) =>
              jsxProd_default(
                merged.Field,
                {
                  label: option.label,
                  children: jsxProd_default(merged.Toggle, {
                    value: persisted.confirmSelection.includes(option.value),
                    onChange: (value) => {
                      if (!isFreshKeypress()) return;
                      let filtered = persisted.confirmSelection.filter((value) => value !== option.value);
                      persisted.confirmSelection = value ? [...filtered, option.value] : filtered;
                      bumpTick();
                    },
                  }),
                },
                option.value,
              ),
            ),
            jsxProd_default(
              Text,
              {
                children: " ",
              },
              "gap",
            ),
            jsxProd_default(
              merged.Field,
              {
                label: "Continue",
                children: jsxProd_default(merged.Button, {
                  onPress: () => onContinue(persisted.confirmSelection),
                }),
              },
              "continue",
            ),
          ],
        }),
      }),
    ],
  });
}
//@ chunk-8x5p2wd7.js:24241-24816 placement
/**
 * 屏幕阅读器模式下的向导介绍对话框：记录最近确认时间，选择姿态与读取范围后继续。
 */
function ScreenReaderIntroDialog({ persisted, cancel, onContinue }) {
  let clock = useClock();
  let [, setTick] = useState(0);
  let bumpTick = () => {
    persisted.lastAcceptAt = Math.max(clock.now(), persisted.lastAcceptAt ?? 0);
  };
  return jsxProd_default_2(Dialog, {
    title: AUTO_MODE_SETUP_TITLE,
    onCancel: cancel,
    children: [
      jsxProd_default(Text, {
        children: AUTO_MODE_SETUP_DESCRIPTION,
      }),
      persisted.confirmSrAtPosture
        ? jsxProd_default_2(Fragment, {
            children: [
              jsxProd_default_2(Text, {
                children: [POSTURE_LABEL, ":"],
              }),
              jsxProd_default(Select, {
                options: POSTURE_OPTIONS,
                defaultValue: persisted.posture,
                onChange: (posture) => {
                  persisted.posture = posture;
                  persisted.confirmSrAtPosture = false;
                  bumpTick();
                  setTick((value) => value + 1);
                },
                onCancel: cancel,
              }),
            ],
          })
        : jsxProd_default_2(Fragment, {
            children: [
              jsxProd_default(Text, {
                children: "Optional reads (Claude already reads this project):",
              }),
              jsxProd_default(Select, {
                options: SCREEN_READER_READ_OPTIONS,
                defaultValue: "shell",
                onChange: (scope) => {
                  let scopes = depthToReadScopes(scope);
                  persisted.confirmSelection = scopes;
                  onContinue(scopes);
                },
                onCancel: cancel,
              }),
            ],
          }),
    ],
  });
}
//@ chunk-8x5p2wd7.js:24816-25056 placement
function WorkerBadgeWithEscape(props) {
  let $ = useMemoCache(4);
  let { message, subtitle, onEscape } = props;
  let confirmKeyContext;
  if ($[0] === MEMO_CACHE_SENTINEL) {
    confirmKeyContext = {
      context: "Settings",
    };
    $[0] = confirmKeyContext;
  } else confirmKeyContext = $[0];
  useKeybinding("confirm:no", onEscape, confirmKeyContext);
  let confirmElement;
  if ($[1] !== message || $[2] !== subtitle) {
    confirmElement = jsxProd_default(WorkerBadge, {
      message,
      subtitle,
    });
    $[1] = message;
    $[2] = subtitle;
    $[3] = confirmElement;
  } else confirmElement = $[3];
  return confirmElement;
}
//@ chunk-8x5p2wd7.js:25056-25296 placement
function logAutoModeSetupResolved(taskId, outcome, mode) {
  logEvent("tengu_auto_mode_setup_wizard_resolved", {
    choice: fromEnum(taskId),
    step: fromEnum(outcome),
    ...(mode !== undefined && {
      mode: fromEnum(mode),
    }),
  });
  if (taskId === "saved") logFeatureOk("auto_mode_setup_wizard");
  else if (taskId === "error") logFeatureBad("auto_mode_setup_wizard", outcome);
  else logFeatureSad("auto_mode_setup_wizard", taskId);
}
//@ chunk-8x5p2wd7.js:25296-25323 placement
function isAutoModeSetupInFlight() {
  return getBackgroundAutoModeSetupInFlight();
}
//@ chunk-8x5p2wd7.js:25323-25658 placement
/**
 * 后台运行 /auto-mode-setup 扫描：设置进行中标志，出错时追加警告系统消息、记录错误与遥测，最后清除标志。
 */
async function runAutoModeSetupInBackground(props) {
  setBackgroundAutoModeSetupInFlight(true);
  try {
    await runAutoModeScanTask(props);
  } catch (error) {
    props.appendSystemMessage?.(
      createSystemMessage(
        `Auto-mode setup hit an unexpected error and stopped: ${errorMessage(error)}. Re-run /auto-mode-setup to try again.`,
        "warning",
      ),
    );
    logError(
      new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
        `background auto-mode setup crashed: ${errorMessage(error)}`,
        "background auto-mode setup crashed",
      ),
    );
    logAutoModeSetupResolved("error", "background_crash");
  } finally {
    setBackgroundAutoModeSetupInFlight(false);
  }
}
//@ chunk-8x5p2wd7.js:25658-25804 placement
async function runAutoModeScanTask(task) {
  let { taskRegistry } = task;
  let abortController = new AbortController();
  let taskId = registerAutoModeScanTask(
    taskRegistry,
    abortController,
    pregatherOptionsFromAnswer(task.answers).allProjects,
  );
  try {
    await runAutoModeScanInBackground(task, taskId, abortController);
  } finally {
    failTaskAndNotify(taskId, taskRegistry, "failed");
  }
}
//@ chunk-8x5p2wd7.js:25804-27729 placement
async function runAutoModeScanInBackground(context, taskId, abortController) {
  let {
    taskRegistry,
    requestDialog,
    appendSystemMessage,
    propose = proposeAutoModeSetup,
    write = applyAutoModeSettings,
  } = context;
  let proposal = await propose(
    context.answers,
    context.permissionContext,
    abortController.signal,
    undefined,
    undefined,
    context.storageV5,
    context.credentials,
  ).catch((error) => {
    logError(
      new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
        `background auto-mode scan rejected: ${errorMessage(error)}`,
        "background auto-mode scan rejected",
      ),
    );
    return {
      ok: false,
      code: "api_failed",
      reason:
        "The model call didn\u2019t complete. This is usually temporary \u2014 re-run /auto-mode-setup to try again.",
    };
  });
  if (!proposal.ok) {
    if (proposal.code === "aborted" || abortController.signal.aborted) {
      logAutoModeSetupResolved("cancel", "background_scan");
      return;
    }
    failTaskAndNotify(taskId, taskRegistry, "failed");
    appendSystemMessage?.(createSystemMessage(`Auto-mode setup scan failed: ${proposal.reason}`, "warning"));
    logAutoModeSetupResolved("error", "background_scan");
    return;
  }
  if (abortController.signal.aborted) {
    logAutoModeSetupResolved("cancel", "background_scan");
    return;
  }
  failTaskAndNotify(taskId, taskRegistry, "completed");
  let review = await requestDialog(
    autoModeSetupReviewDialogDef,
    {
      ...proposal.proposal,
      mode: context.mode,
    },
    {
      place: "under",
    },
  );
  if (review !== "accept") {
    appendSystemMessage?.(
      createSystemMessage(
        "Auto-mode proposal discarded \u2014 nothing was saved. Re-run /auto-mode-setup anytime.",
        "notice",
      ),
    );
    logAutoModeSetupResolved(review === "decline" ? "decline" : "cancel", "background_review");
    return;
  }
  let applied;
  try {
    applied = await write(
      {
        mode: context.mode,
        autoMode: autoModeConfigHandler(proposal.proposal),
      },
      context.storageV5,
    );
  } catch (error) {
    appendSystemMessage?.(
      createSystemMessage(
        `Auto-mode setup couldn\u2019t save: ${errorMessage(error)}. Re-run /auto-mode-setup to try again.`,
        "warning",
      ),
    );
    logAutoModeSetupResolved("error", "background_write");
    return;
  }
  let counts = {
    removed: 0,
    skipped: 0,
    notFound: 0,
  };
  if (proposal.proposal.remove_from_permissions_allow.length > 0) {
    let flagged = await requestDialog(
      AUTO_MODE_SETUP_FLAGGED_DIALOG,
      {
        flagged: proposal.proposal.remove_from_permissions_allow,
        runId: taskId,
      },
      {
        place: "under",
      },
    );
    let toRemove =
      flagged === "cancelled"
        ? []
        : flagged.toRemove.filter((entry) => proposal.proposal.remove_from_permissions_allow.includes(entry));
    if (toRemove.length > 0)
      try {
        let writeResult = await write(
          {
            removeFromPermissionsAllow: toRemove,
          },
          context.storageV5,
        );
        counts = {
          removed: writeResult.permissionsAllowRemoved.length,
          skipped: writeResult.permissionsAllowSkipped ? toRemove.length : 0,
          notFound: writeResult.permissionsAllowNotFound.length,
        };
      } catch (error) {
        appendSystemMessage?.(
          createSystemMessage(
            `${savedToMessage(applied, {
              removed: 0,
              skipped: 0,
            })}
Note: removing the flagged permissions.allow entries failed: ${errorMessage(error)}`,
            "warning",
          ),
        );
        logAutoModeSetupResolved("saved", "background_write", context.mode);
        return;
      }
  }
  appendSystemMessage?.(createSystemMessage(savedToMessage(applied, counts), "notice"));
  logAutoModeSetupResolved("saved", "background", context.mode);
}
//@ chunk-8x5p2wd7.js:27729-29374 placement
/**
 * /auto-mode-setup 的 local-jsx call(onDone, context, args, invokedName) 实现入口（由命令对象 load() 返回）。
 */
var autoModeSetupCommand = async (onDone, context, args) => {
  if (args.trim() !== "") {
    onDone(
      "/auto-mode-setup doesn\u2019t take arguments \u2014 run it on its own to open the setup dialog. In non-interactive mode, use --propose / --apply-file.",
      {
        display: "system",
      },
    );
    return null;
  }
  if (isAutoModeSetupInFlight() || findRunningAutoModeScanTask(context.taskRegistry)) {
    onDone(
      findRunningAutoModeScanTask(context.taskRegistry)
        ? "An auto-mode setup is already in progress \u2014 the proposal review will pop up when the scan finishes. (The scan shows in the background tasks list.)"
        : "An auto-mode setup is already wrapping up \u2014 if its proposal review hasn\u2019t popped up, answer it when it does; if you just stopped the scan, it\u2019s winding down \u2014 try again in a moment.",
      {
        display: "system",
      },
    );
    return null;
  }
  let login = await checkAutoModeSetupLogin({
    credentials: context.credentials,
    storageV5: context.storageV5,
  });
  if (login !== "ok") {
    logFeatureBad("auto_mode_setup_propose", login);
    onDone(autoModeSetupLoginMessage(login), {
      display: "system",
    });
    return null;
  }
  let done = onceExport(onDone);
  let abortController = new AbortController();
  let state = initialAutoModeSetupState(hasExistingAutoModeConfig());
  let finished = false;
  let requestDialog = context.requestDialog;
  return jsxProd_default(AutoModeSetupDialog, {
    state,
    onBackgroundStart:
      requestDialog &&
      ((answers) => {
        finished = true;
        runAutoModeSetupInBackground({
          answers,
          mode: state.mode,
          permissionContext: getToolPermissionContext(context),
          taskRegistry: context.taskRegistry,
          requestDialog,
          appendSystemMessage: context.appendSystemMessage,
          storageV5: context.storageV5,
          credentials: context.credentials,
        }).catch((error) => {
          logError(
            new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
              `background auto-mode setup crashed: ${errorMessage(error)}`,
              "background auto-mode setup crashed",
            ),
          );
        });
      }),
    propose: (value) =>
      proposeAutoModeSetup(
        value,
        getToolPermissionContext(context),
        AbortSignal.any([context.abortController.signal, abortController.signal]),
        undefined,
        undefined,
        context.storageV5,
        context.credentials,
      ),
    abort: () => abortController.abort(),
    write: (value, mode) =>
      applyAutoModeSettings(
        {
          mode,
          autoMode: autoModeConfigHandler(value),
        },
        context.storageV5,
      ),
    writeRemoval: (removeFromPermissionsAllow) =>
      applyAutoModeSettings(
        {
          removeFromPermissionsAllow,
        },
        context.storageV5,
      ),
    onCancel: () => {
      logFeatureSad("auto_mode_setup_wizard", "cancelled");
      done(undefined, {
        display: "skip",
      });
    },
    onDone: (value) => {
      if (!finished) logFeatureOk("auto_mode_setup_wizard");
      done(value, {
        display: "system",
      });
    },
  });
};
//@ chunk-8x5p2wd7.js:29374-29591 placement
function hasExistingAutoModeConfig() {
  let parsed = autoModeConfigSchema().safeParse(getSettingsForSourceForUpkeep("userSettings")?.autoMode);
  if (!parsed.success) return false;
  let autoMode = parsed.data;
  return (
    (autoMode.environment?.length ?? 0) > 0 ||
    (autoMode.allow?.length ?? 0) > 0 ||
    (autoMode.soft_deny?.length ?? 0) > 0 ||
    (autoMode.hard_deny?.length ?? 0) > 0
  );
}
export {
  callAutoModeSetup,
  parseRequestIdArg,
  isUnderTempOrConfigDir,
  parseAutoModeSetupCommandArgs,
  autoModeSetupCommand,
  hasExistingAutoModeConfig,
};
