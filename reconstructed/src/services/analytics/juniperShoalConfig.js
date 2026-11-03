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
class Nh {
  reader = null;
  register(e) {
    this.reader = e;
  }
}
//@ chunk-aepeg2w5.js:74937-74951 placement
var Lh = new Nh();
//@ chunk-aepeg2w5.js:74951-74981 placement
function Hh(e) {
  Lh.register(e);
}
/**
 * juniper_shoal 默认参数与默认配置对象。
 */
//@ chunk-aepeg2w5.js:74981-75126 placement
var DEFAULT_EVERY_N_TURNS = 15,
  DEFAULT_MAX_NAMES = 10,
  DEFAULT_JUNIPER_SHOAL_CONFIG = Object.freeze({
    toolSearchReminder: null,
    toolParamStrictness: !1,
    emptyInputRepair: !1,
    toolSearchFetchRule: !1,
    schemaDescFixes: !1,
  });
/**
 * 读取 juniper_shoal 配置（每 N 回合、最大名字数）。
 */
//@ chunk-aepeg2w5.js:75126-75812 placement
function getJuniperShoalConfig() {
  let e;
  try {
    e = Lh.reader?.()?.juniper_shoal;
  } catch {
    return DEFAULT_JUNIPER_SHOAL_CONFIG;
  }
  if (typeof e !== "object" || e === null || Array.isArray(e)) return DEFAULT_JUNIPER_SHOAL_CONFIG;
  let n = e,
    r = null,
    marsh_lantern = n.marsh_lantern;
  if (marsh_lantern === !0)
    r = Object.freeze({ everyNTurns: DEFAULT_EVERY_N_TURNS, maxNames: DEFAULT_MAX_NAMES });
  else if (typeof marsh_lantern === "object" && marsh_lantern !== null && !Array.isArray(marsh_lantern)) {
    let h = marsh_lantern,
      y =
        typeof h.stride === "number" && Number.isInteger(h.stride) && h.stride >= 1
          ? h.stride
          : DEFAULT_EVERY_N_TURNS,
      S = typeof h.span === "number" && Number.isInteger(h.span) && h.span >= 1 ? h.span : DEFAULT_MAX_NAMES;
    r = Object.freeze({ everyNTurns: y, maxNames: S });
  }
  return Object.freeze({
    toolSearchReminder: r,
    toolParamStrictness: n.bracken_spool === !0,
    emptyInputRepair: n.teasel_cove === !0,
    toolSearchFetchRule: n.gorse_hollow === !0,
    schemaDescFixes: n.thistle_skein === !0,
  });
}
//@ chunk-aepeg2w5.js:75812-75858 placement
function Nas() {
  return getJuniperShoalConfig().toolSearchReminder;
}
//@ chunk-aepeg2w5.js:75858-75905 placement
function ITi() {
  return getJuniperShoalConfig().toolParamStrictness;
}
//@ chunk-aepeg2w5.js:75905-75949 placement
function OTi() {
  return getJuniperShoalConfig().emptyInputRepair;
}
//@ chunk-aepeg2w5.js:75949-75996 placement
function MTi() {
  return getJuniperShoalConfig().toolSearchFetchRule;
}
//@ chunk-aepeg2w5.js:75996-76039 placement
function $as() {
  return getJuniperShoalConfig().schemaDescFixes;
}

export { ITi, Hh, MTi, $as, OTi, Nas };
