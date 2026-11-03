/**
 * commands/voice/voice.ts
 *
 * /voice 实现：解析模式参数并切换语音输入（allow_voice_mode）
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/commands/voice/voice.ts
 * pieces: chunk-vrdyygyr.js (3)
 * attribution: sole-consumer 1, affinity 1, fingerprint 1
 */
import { Vvt } from "../../voice/voiceModeEnabled.js";
import { isAnthropicAuthEnabled } from "../../utils/auth.js";
import { policyDeniedReason } from "../../services/policyLimits/policyEvidence.js";
import { logOrgPolicyDenied } from "../../services/policyLimits/orgPolicyDeniedEvent.js";
import { getInitialSettings_2, updateSettingsForSource } from "../../utils/settings/settings.js";
import { useVoiceEnabled } from "../../hooks/useVoiceEnabled.js";
import { logEvent } from "../../services/analytics/index.js";
import { getShortcutDisplay } from "../../keybindings/shortcutFormat.js";
import { normalizeLanguageForSTT } from "../../hooks/useVoice.js";
import { getGlobalConfig, saveGlobalConfig } from "../../utils/config.js";

//@ chunk-vrdyygyr.js:3685-3693 sole-consumer
var V = 2;
/**
 * parseVoiceArg：hold|tap|off|invalid。
 */
//@ chunk-vrdyygyr.js:3693-3814 affinity
function parseVoiceArg(s) {
  let lower = s.trim().toLowerCase();
  if (lower === "") return;
  if (lower === "hold" || lower === "tap" || lower === "off") return lower;
  return "invalid";
}
/**
 * /voice 的 local call(args, context, invokedName) 实现入口（由命令对象 load() 返回）。
 */
//@ chunk-vrdyygyr.js:3814-6440 fingerprint = call (0.705)
var call = async (args, context) => {
  if (!Vvt()) {
    if (!isAnthropicAuthEnabled())
      return {
        type: "text",
        value: "Voice mode requires a Claude.ai account. Please run /login to sign in.",
      };
    let o = policyDeniedReason("allow_voice_mode", "Voice mode", "is");
    if (o) return (logOrgPolicyDenied("allow_voice_mode", "slash_command"), { type: "text", value: o });
    return { type: "text", value: "Voice mode is not available." };
  }
  let currentSettings = getInitialSettings_2(),
    v = useVoiceEnabled(currentSettings),
    t = parseVoiceArg(args);
  if (t === "invalid")
    return { type: "text", value: `Unknown mode: "${args.trim()}". Use hold, tap, or off.` };
  if (t === "off" || (t === void 0 && v)) {
    if (
      (
        await updateSettingsForSource(
          "userSettings",
          { voiceEnabled: !1, voice: { ...currentSettings.voice, enabled: !1 } },
          void 0,
          context.storageV5,
        )
      ).error
    )
      return {
        type: "text",
        value: "Failed to update settings. Check your settings file for syntax errors.",
      };
    return (
      logEvent("tengu_voice_toggled", { enabled: !1 }),
      { type: "text", value: "Voice mode disabled." }
    );
  }
  let { isVoiceStreamAvailable: isVoiceStreamAvailable } = await import("./chunk-k5p47mp3.js"),
    { checkRecordingAvailability: checkRecordingAvailability } = await import("./chunk-ga5txjrx.js"),
    r = await checkRecordingAvailability(context.session.host, { probeForwarded: !0 });
  if (!r.available)
    return { type: "text", value: r.reason ?? "Voice mode is not available in this environment." };
  if (!isVoiceStreamAvailable())
    return { type: "text", value: "Voice mode requires a Claude.ai account. Please run /login to sign in." };
  let {
      checkVoiceDependencies: checkVoiceDependencies,
      requestMicrophonePermission: requestMicrophonePermission,
    } = await import("./chunk-ga5txjrx.js"),
    c = await checkVoiceDependencies(context.session.host);
  if (!c.available)
    return {
      type: "text",
      value: `No audio recording tool found.${
        c.installCommand
          ? `
Install audio recording tools? Run: ${c.installCommand}`
          : `
Install SoX manually for audio recording.`
      }`,
    };
  if (!(await requestMicrophonePermission(context.session.host))) {
    let o;
    return (
      (o = "your system's audio settings"),
      { type: "text", value: `Microphone access is denied. To enable it, go to ${o}, then run /voice again.` }
    );
  }
  let l = t === "hold" || t === "tap" ? t : (currentSettings.voice?.mode ?? "hold");
  if (
    (
      await updateSettingsForSource(
        "userSettings",
        { voiceEnabled: !0, voice: { ...currentSettings.voice, enabled: !0, mode: l } },
        void 0,
        context.storageV5,
      )
    ).error
  )
    return { type: "text", value: "Failed to update settings. Check your settings file for syntax errors." };
  logEvent("tengu_voice_toggled", { enabled: !0, tap_mode: l === "tap" });
  let key = getShortcutDisplay("voice:pushToTalk", "Chat", "space"),
    w = l === "tap" ? `Tap ${key} (with input empty) to start, tap again to send.` : `Hold ${key} to record.`,
    stt = normalizeLanguageForSTT(currentSettings.language),
    cfg = getGlobalConfig(),
    p = cfg.voiceLangHintLastLanguage !== stt.code,
    f = p ? 0 : (cfg.voiceLangHintShownCount ?? 0),
    showHint = !stt.fellBackFrom && f < V,
    langNote = "";
  if (stt.fellBackFrom)
    langNote = ` Note: "${stt.fellBackFrom}" is not a supported dictation language; using English. Change it via /config.`;
  else if (showHint) langNote = ` Dictation language: ${stt.code} (/config to change).`;
  if (p || showHint)
    await saveGlobalConfig(
      (prev) => ({
        ...prev,
        voiceLangHintShownCount: f + (showHint ? 1 : 0),
        voiceLangHintLastLanguage: stt.code,
      }),
      context.storageV5,
    );
  let S = r.note ? ` ${r.note}` : "";
  return { type: "text", value: `Voice mode enabled (${l}). ${w}${langNote}${S}` };
};
