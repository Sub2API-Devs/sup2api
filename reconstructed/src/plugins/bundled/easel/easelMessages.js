/**
 * plugins/bundled/easel/easelMessages.ts
 *
 * 2.1.316 新增：easel 的结果文本（未绘制原因、自动图表提示、策略禁用）与工具名
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-3s7ydtfd.js (65)
 * attribution: placement 65
 */

//@ chunk-3s7ydtfd.js:9102-9197 placement
var vx = "easel made an auto chart from this result. Chart it again only for a different chart.";
//@ chunk-3s7ydtfd.js:9197-9301 placement
var EASEL_FAILED_MESSAGE =
  "Not drawn. easel failed on this call. The fault is its own, and the same call will fail again.";
//@ chunk-3s7ydtfd.js:9301-9412 placement
var NO_CONVERSATION_MESSAGE =
  "Not drawn. The session keeps no conversation for this call, and every call made here will be refused.";
//@ chunk-3s7ydtfd.js:9412-9439 placement
var MCP_EASEL_CHART = "mcp__easel__chart";
//@ chunk-3s7ydtfd.js:9439-9535 placement
var $x = "Not drawn. This organization's policy withholds easel, and every call will be refused.";
//@ chunk-3s7ydtfd.js:9535-9661 placement
var CHART_TOOL_HINT = `If a tool named ${MCP_EASEL_CHART} is available, call it when numbers over time or across categories would be clearer as a chart.`;
//@ chunk-3s7ydtfd.js:9661-9694 placement
var Xx = 1000000000000000000000000;
//@ chunk-3s7ydtfd.js:9694-9728 placement
var Kx = 0.000000000000000000000001;
//@ chunk-3s7ydtfd.js:9728-9737 placement
var Ko = 7;
//@ chunk-3s7ydtfd.js:9737-9749 placement
var zo = 1000;
//@ chunk-3s7ydtfd.js:9749-9762 placement
var Es = 86400;
//@ chunk-3s7ydtfd.js:9762-9774 placement
var As = 3600;
//@ chunk-3s7ydtfd.js:9774-9784 placement
var bs = 60;
//@ chunk-3s7ydtfd.js:9784-9797 placement
var Rs = 0.001;
//@ chunk-3s7ydtfd.js:9797-9813 placement
var Is = 0.000001;
//@ chunk-3s7ydtfd.js:9813-9822 placement
var Vx = 2;
//@ chunk-3s7ydtfd.js:9822-9833 placement
var Yo = 1e9;
//@ chunk-3s7ydtfd.js:9833-9845 placement
var je = 1024;
//@ chunk-3s7ydtfd.js:9845-9856 placement
var Jo = 1e6;
//@ chunk-3s7ydtfd.js:9856-9868 placement
var ve = 1000;
//@ chunk-3s7ydtfd.js:9868-9889 placement
var Vo = 1000000000000;
//@ chunk-3s7ydtfd.js:9889-9905 placement
var Ns = 0.000001;
//@ chunk-3s7ydtfd.js:9905-9918 placement
var Qx = 0.001;
//@ chunk-3s7ydtfd.js:9918-9937 placement
var eu = 0.000000001;
//@ chunk-3s7ydtfd.js:9937-9948 placement
var tu = 100;
//@ chunk-3s7ydtfd.js:9948-9972 placement
var ou = 1000000000000000;
//@ chunk-3s7ydtfd.js:9972-9981 placement
var Ms = 4;
//@ chunk-3s7ydtfd.js:9981-9990 placement
var su = 4;
//@ chunk-3s7ydtfd.js:9990-10000 placement
var mu = 60;
//@ chunk-3s7ydtfd.js:10000-10013 placement
var nu = 60000;
//@ chunk-3s7ydtfd.js:10013-10048 placement
var W = (e) => ({ kind: "unread", why: e });
//@ chunk-3s7ydtfd.js:10048-10106 placement
var ws = (e, t) => ({ kind: "number", value: e, unit: e === 0 ? null : t });
/**
 * 数值过大或过小时返回错误，否则生成带单位的数值。
 */
//@ chunk-3s7ydtfd.js:10106-10215 placement
function checkMagnitude(e, t) {
  let abs = Math.abs(e);
  if (!(abs <= Xx)) return W("too large");
  return abs > 0 && abs < Kx ? W("too small") : ws(e, t);
}
//@ chunk-3s7ydtfd.js:10215-10225 placement
var xu = !0;
//@ chunk-3s7ydtfd.js:10225-10235 placement
var du = !1;
//@ chunk-3s7ydtfd.js:10235-10248 placement
var rt = je * je;
//@ chunk-3s7ydtfd.js:10248-10261 placement
var st = rt * je;
//@ chunk-3s7ydtfd.js:10261-10270 placement
var Tu = 6;
//@ chunk-3s7ydtfd.js:10270-10283 placement
var gu = 30.44;
//@ chunk-3s7ydtfd.js:10283-10297 placement
var Ou = 365.25;
//@ chunk-3s7ydtfd.js:10297-10312 placement
var _u = 3600000;
//@ chunk-3s7ydtfd.js:10312-10325 placement
var Cu = 60000;
//@ chunk-3s7ydtfd.js:10325-10334 placement
var We = 2;
//@ chunk-3s7ydtfd.js:10334-10350 placement
var He = 86400000;
//@ chunk-3s7ydtfd.js:10350-10359 placement
var Eu = 2;
//@ chunk-3s7ydtfd.js:10359-10368 placement
var ks = 2;
//@ chunk-3s7ydtfd.js:10368-10377 placement
var bu = 2;
//@ chunk-3s7ydtfd.js:10377-10386 placement
var Iu = 6;
//@ chunk-3s7ydtfd.js:10386-10397 placement
var Mu = 0.5;
//@ chunk-3s7ydtfd.js:10397-10406 placement
var ku = 5;
//@ chunk-3s7ydtfd.js:10406-10415 placement
var Pu = 2;
//@ chunk-3s7ydtfd.js:10415-10424 placement
var Ps = 5;
//@ chunk-3s7ydtfd.js:10424-10436 placement
var qo = 1000;
//@ chunk-3s7ydtfd.js:10436-10445 placement
var Uu = 2;
//@ chunk-3s7ydtfd.js:10445-10454 placement
var Qo = 1;
//@ chunk-3s7ydtfd.js:10454-10463 placement
var Ds = 0;
//@ chunk-3s7ydtfd.js:10463-10472 placement
var Bu = 3;
//@ chunk-3s7ydtfd.js:10472-10481 placement
var vu = 3;
//@ chunk-3s7ydtfd.js:10481-10490 placement
var Wu = 7;
//@ chunk-3s7ydtfd.js:10490-10573 placement
function Us(e) {
  let t = new Map();
  return (o) => {
    let r = t.get(o) ?? e(o);
    return (t.set(o, r), r);
  };
}
//@ chunk-3s7ydtfd.js:10573-10672 placement
var Fs = Us(
  (e) => new Intl.DateTimeFormat("sv-SE", { timeZone: e, dateStyle: "short", timeStyle: "medium" }),
);
//@ chunk-3s7ydtfd.js:10672-10959 placement
function logEaselError(e, t) {
  let o = e - Math.floor(e / qo) * qo;
  if (t === "UTC") {
    let date = new Date(e);
    return [
      date.getUTCFullYear(),
      date.getUTCMonth(),
      date.getUTCDate(),
      date.getUTCHours(),
      date.getUTCMinutes(),
      date.getUTCSeconds(),
      o,
    ];
  }
  let [r = 0, s = 1, p = 1, m = 0, n = 0, a = 0] = Fs(t).format(e).split(/[- :]/, Tu).map(Number);
  return [r, s - 1, p, m, n, a, o];
}
//@ chunk-3s7ydtfd.js:10959-11273 placement
var EASEL_PROMPT_HINT = [
  { fieldIndex: 0, typicalMs: Ou * He, counts: [1, 2, 5, 10, 20, 50, 100] },
  { fieldIndex: 1, typicalMs: gu * He, counts: [1, 3, 6] },
  { fieldIndex: 2, typicalMs: He, counts: [1, 2, 4, 7, 14] },
  { fieldIndex: 3, typicalMs: _u, counts: [1, 2, 3, 6, 12] },
  { fieldIndex: 4, typicalMs: Cu, counts: [1, 2, 5, 10, 15, 30] },
  { fieldIndex: 5, typicalMs: qo, counts: [1, 2, 5, 10, 15, 30] },
];
//@ chunk-3s7ydtfd.js:11273-11283 placement
var zu = !0;
//@ chunk-3s7ydtfd.js:11283-11293 placement
var Ju = !0;

export {
  logEaselError,
  Iu,
  He,
  vu,
  Wu,
  bu,
  Mu,
  EASEL_PROMPT_HINT,
  Ps,
  Eu,
  ks,
  We,
  Pu,
  ku,
  zu,
  Ds,
  Qo,
  Uu,
  Ju,
  Bu,
  Es,
  As,
  bs,
  ve,
  Jo,
  Yo,
  Vo,
  st,
  je,
  ou,
  rt,
  eu,
  Ns,
  Qx,
  tu,
  checkMagnitude,
  Vx,
  W,
  zo,
  Rs,
  Is,
  Ko,
  su,
  Ms,
  du,
  mu,
  nu,
  xu,
  MCP_EASEL_CHART,
  vx,
  CHART_TOOL_HINT,
  $x,
  NO_CONVERSATION_MESSAGE,
  EASEL_FAILED_MESSAGE,
};
