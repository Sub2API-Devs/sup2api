/**
 * services/analytics/juniperShoalConfig.ts
 *
 * 2.1.316 新增：读取 juniper_shoal 配置（每 N 回合、最大名字数）。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-aepeg2w5.js (10)
 * attribution: placement 10
 */

//@ chunk-aepeg2w5.js:74889-74937 placement
/**
 * juniper_shoal 配置读取器插槽：注册读取函数并提供各子配置（工具搜索提醒、参数严格性、空输入修复、搜索抓取规则、schema 描述修复）的取值函数。
 */
class ConfigReaderSlot {
  reader = null;
  register(reader) {
    this.reader = reader;
  }
}
//@ chunk-aepeg2w5.js:74937-74951 placement
var configReaderSlot = new ConfigReaderSlot();
//@ chunk-aepeg2w5.js:74951-74981 placement
function registerJuniperShoalReader(reader) {
  configReaderSlot.register(reader);
}
//@ chunk-aepeg2w5.js:74981-75126 placement
/**
 * juniper_shoal 默认参数与默认配置对象。
 */
var DEFAULT_EVERY_N_TURNS = 15;
var DEFAULT_MAX_NAMES = 10;
var DEFAULT_JUNIPER_SHOAL_CONFIG = Object.freeze({
  toolSearchReminder: null,
  toolParamStrictness: false,
  emptyInputRepair: false,
  toolSearchFetchRule: false,
  schemaDescFixes: false,
});
//@ chunk-aepeg2w5.js:75126-75812 placement
/**
 * 读取 juniper_shoal 配置（每 N 回合、最大名字数）。
 */
function getJuniperShoalConfig() {
  let raw;
  try {
    raw = configReaderSlot.reader?.()?.juniper_shoal;
  } catch {
    return DEFAULT_JUNIPER_SHOAL_CONFIG;
  }
  if (typeof raw !== "object" || raw === null || Array.isArray(raw)) return DEFAULT_JUNIPER_SHOAL_CONFIG;
  let config = raw;
  let reminder = null;
  let marshLantern = config.marsh_lantern;
  if (marshLantern === true)
    reminder = Object.freeze({
      everyNTurns: DEFAULT_EVERY_N_TURNS,
      maxNames: DEFAULT_MAX_NAMES,
    });
  else if (typeof marshLantern === "object" && marshLantern !== null && !Array.isArray(marshLantern)) {
    let lantern = marshLantern;
    let everyNTurns =
      typeof lantern.stride === "number" && Number.isInteger(lantern.stride) && lantern.stride >= 1
        ? lantern.stride
        : DEFAULT_EVERY_N_TURNS;
    let maxNames =
      typeof lantern.span === "number" && Number.isInteger(lantern.span) && lantern.span >= 1
        ? lantern.span
        : DEFAULT_MAX_NAMES;
    reminder = Object.freeze({
      everyNTurns,
      maxNames,
    });
  }
  return Object.freeze({
    toolSearchReminder: reminder,
    toolParamStrictness: config.bracken_spool === true,
    emptyInputRepair: config.teasel_cove === true,
    toolSearchFetchRule: config.gorse_hollow === true,
    schemaDescFixes: config.thistle_skein === true,
  });
}
//@ chunk-aepeg2w5.js:75812-75858 placement
/**
 * 导出函数 `toolSearchReminderConfig`：返回 getJuniperShoalConfig().toolSearchReminder。
 */
function toolSearchReminderConfig() {
  return getJuniperShoalConfig().toolSearchReminder;
}
//@ chunk-aepeg2w5.js:75858-75905 placement
/**
 * 导出函数 `toolParamStrictnessConfig`：返回 getJuniperShoalConfig().toolParamStrictness。
 */
function toolParamStrictnessConfig() {
  return getJuniperShoalConfig().toolParamStrictness;
}
//@ chunk-aepeg2w5.js:75905-75949 placement
/**
 * 导出函数 `emptyInputRepairConfig`：返回 getJuniperShoalConfig().emptyInputRepair。
 */
function emptyInputRepairConfig() {
  return getJuniperShoalConfig().emptyInputRepair;
}
//@ chunk-aepeg2w5.js:75949-75996 placement
/**
 * 导出函数 `toolSearchFetchRuleConfig`：返回 getJuniperShoalConfig().toolSearchFetchRule。
 */
function toolSearchFetchRuleConfig() {
  return getJuniperShoalConfig().toolSearchFetchRule;
}
//@ chunk-aepeg2w5.js:75996-76039 placement
/**
 * 导出函数 `schemaDescFixesConfig`：返回 getJuniperShoalConfig().schemaDescFixes; } export { ITi, Hh, MTi, $as, OTi, Nas }。
 */
function schemaDescFixesConfig() {
  return getJuniperShoalConfig().schemaDescFixes;
}
export {
  toolParamStrictnessConfig,
  registerJuniperShoalReader,
  toolSearchFetchRuleConfig,
  schemaDescFixesConfig,
  emptyInputRepairConfig,
  toolSearchReminderConfig,
};
