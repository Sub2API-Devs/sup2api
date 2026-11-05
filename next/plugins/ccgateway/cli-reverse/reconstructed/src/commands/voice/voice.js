/**
 * commands/voice/voice.ts
 *
 * /voice 实现：解析模式参数并切换语音输入（allow_voice_mode）
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/commands/voice/voice.ts
 * pieces: chunk-xe2139jk.js (3)
 * attribution: sole-consumer 1, affinity 1, fingerprint 1
 */
import { isVoiceModeAvailable } from "../../voice/voiceModeEnabled.js";
import { isAnthropicAuthEnabled } from "../../utils/auth.js";
import { policyDeniedReason } from "../../services/policyLimits/policyEvidence.js";
import { logOrgPolicyDenied } from "../../services/policyLimits/orgPolicyDeniedEvent.js";
import { getInitialSettings, updateSettingsForSource } from "../../utils/settings/settings.js";
import { useVoiceEnabled } from "../../hooks/useVoiceEnabled.js";
import { logEvent } from "../../services/analytics/index.js";
import { getShortcutDisplay } from "../../keybindings/shortcutFormat.js";
import { normalizeLanguageForSTT } from "../../hooks/useVoice.js";
import { getGlobalConfig, saveGlobalConfig } from "../../utils/config.js";

//@ chunk-xe2139jk.js:3993-4001 sole-consumer
var MAX_HINT_SHOWS = 2;
//@ chunk-xe2139jk.js:4001-4122 affinity
/**
 * parseVoiceArg：hold|tap|off|invalid。
 */
function parseVoiceArg(arg) {
  let lower = arg.trim().toLowerCase();
  if (lower === "") return;
  if (lower === "hold" || lower === "tap" || lower === "off") return lower;
  return "invalid";
}
//@ chunk-xe2139jk.js:4122-6748 fingerprint (2.1.88 match: call, 0.706)
/**
 * /voice 的 local call(args, context, invokedName) 实现入口（由命令对象 load() 返回）。
 */
var call = async (args, context) => {
  if (!isVoiceModeAvailable()) {
    if (!isAnthropicAuthEnabled())
      return {
        type: "text",
        value: "Voice mode requires a Claude.ai account. Please run /login to sign in.",
      };
    let policyDenied = policyDeniedReason("allow_voice_mode", "Voice mode", "is");
    if (policyDenied) {
      logOrgPolicyDenied("allow_voice_mode", "slash_command");
      return {
        type: "text",
        value: policyDenied,
      };
    }
    return {
      type: "text",
      value: "Voice mode is not available.",
    };
  }
  let currentSettings = getInitialSettings();
  let voiceEnabled = useVoiceEnabled(currentSettings);
  let voiceArg = parseVoiceArg(args);
  if (voiceArg === "invalid")
    return {
      type: "text",
      value: `Unknown mode: "${args.trim()}". Use hold, tap, or off.`,
    };
  if (voiceArg === "off" || (voiceArg === undefined && voiceEnabled)) {
    if (
      (
        await updateSettingsForSource(
          "userSettings",
          {
            voiceEnabled: false,
            voice: {
              ...currentSettings.voice,
              enabled: false,
            },
          },
          undefined,
          context.storageV5,
        )
      ).error
    )
      return {
        type: "text",
        value: "Failed to update settings. Check your settings file for syntax errors.",
      };
    logEvent("tengu_voice_toggled", {
      enabled: false,
    });
    return {
      type: "text",
      value: "Voice mode disabled.",
    };
  }
  let { isVoiceStreamAvailable } = await import("../../services/voiceStreamSTT.js");
  let { checkRecordingAvailability } = await import("../../services/voice.js");
  let recording = await checkRecordingAvailability(context.session.host, {
    probeForwarded: true,
  });
  if (!recording.available)
    return {
      type: "text",
      value: recording.reason ?? "Voice mode is not available in this environment.",
    };
  if (!isVoiceStreamAvailable())
    return {
      type: "text",
      value: "Voice mode requires a Claude.ai account. Please run /login to sign in.",
    };
  let { checkVoiceDependencies, requestMicrophonePermission } = await import("../../services/voice.js");
  let deps = await checkVoiceDependencies(context.session.host);
  if (!deps.available)
    return {
      type: "text",
      value: `No audio recording tool found.${
        deps.installCommand
          ? `
Install audio recording tools? Run: ${deps.installCommand}`
          : `
Install SoX manually for audio recording.`
      }`,
    };
  if (!(await requestMicrophonePermission(context.session.host))) {
    let guidance;
    guidance = "your system's audio settings";
    return {
      type: "text",
      value: `Microphone access is denied. To enable it, go to ${guidance}, then run /voice again.`,
    };
  }
  let voiceMode =
    voiceArg === "hold" || voiceArg === "tap" ? voiceArg : (currentSettings.voice?.mode ?? "hold");
  if (
    (
      await updateSettingsForSource(
        "userSettings",
        {
          voiceEnabled: true,
          voice: {
            ...currentSettings.voice,
            enabled: true,
            mode: voiceMode,
          },
        },
        undefined,
        context.storageV5,
      )
    ).error
  )
    return {
      type: "text",
      value: "Failed to update settings. Check your settings file for syntax errors.",
    };
  logEvent("tengu_voice_toggled", {
    enabled: true,
    tap_mode: voiceMode === "tap",
  });
  let key = getShortcutDisplay("voice:pushToTalk", "Chat", "space");
  let activationHint =
    voiceMode === "tap"
      ? `Tap ${key} (with input empty) to start, tap again to send.`
      : `Hold ${key} to record.`;
  let stt = normalizeLanguageForSTT(currentSettings.language);
  let cfg = getGlobalConfig();
  let langChanged = cfg.voiceLangHintLastLanguage !== stt.code;
  let priorCount = langChanged ? 0 : (cfg.voiceLangHintShownCount ?? 0);
  let showHint = !stt.fellBackFrom && priorCount < MAX_HINT_SHOWS;
  let langNote = "";
  if (stt.fellBackFrom)
    langNote = ` Note: "${stt.fellBackFrom}" is not a supported dictation language; using English. Change it via /config.`;
  else if (showHint) langNote = ` Dictation language: ${stt.code} (/config to change).`;
  if (langChanged || showHint)
    await saveGlobalConfig(
      (prev) => ({
        ...prev,
        voiceLangHintShownCount: priorCount + (showHint ? 1 : 0),
        voiceLangHintLastLanguage: stt.code,
      }),
      context.storageV5,
    );
  let recordingNote = recording.note ? ` ${recording.note}` : "";
  return {
    type: "text",
    value: `Voice mode enabled (${voiceMode}). ${activationHint}${langNote}${recordingNote}`,
  };
};
export { call };
