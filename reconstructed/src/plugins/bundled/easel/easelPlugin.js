/**
 * plugins/bundled/easel/easelPlugin.ts
 *
 * 2.1.316 新增：easel 插件入口：chart 调用处理、自动图表（对工具结果自动作图）与 ui.render 显示
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-3s7ydtfd.js (54)
 * attribution: placement 54
 */
import {
  stableSum,
  Et,
  wrapToWidth,
  cleanCellText,
  K,
  N,
  cleanAllStrings,
  jx,
  Xo,
  selectPath,
  toolResultText,
  collectToolUses,
} from "./chartSchema.js";
import {
  rn,
  ln,
  FAILED_USAGE,
  an,
  describeNamesReadAsBars,
  gS,
  YT,
  XT,
  buildEaselTelemetryEvent,
} from "./readTable.js";
import { planChartLayout, renderLegend, rasterizeChart, layoutChart, Xa } from "./renderChart.js";
import { ansiToSvg } from "./chartSvg.js";
import { An, readChartRequestData, CHART_THEME_COLORS } from "./planChart.js";
import { Ut, VALUE, Rc, waitForToolUses } from "./parseValues.js";
import {
  MCP_EASEL_CHART,
  vx,
  CHART_TOOL_HINT,
  $x,
  NO_CONVERSATION_MESSAGE,
  EASEL_FAILED_MESSAGE,
} from "./easelMessages.js";

//@ chunk-3s7ydtfd.js:81486-81497 placement
var Zr = 100;
//@ chunk-3s7ydtfd.js:81497-81509 placement
var Sb = 1000;
//@ chunk-3s7ydtfd.js:81509-81518 placement
var Ob = 2;
//@ chunk-3s7ydtfd.js:81518-81528 placement
var Qi = 40;
//@ chunk-3s7ydtfd.js:81528-81537 placement
var Cb = 5;
//@ chunk-3s7ydtfd.js:81537-81547 placement
var Eb = 66;
//@ chunk-3s7ydtfd.js:81547-81624 placement
var el = (e) => stableSum(e.series.flatMap((sery) => sery.samples).map((t) => (t.value === null ? 0 : 1)));
/**
 * 已绘制图表的用量遥测（形式、格式、系列数、点数、是否省略）。
 */
//@ chunk-3s7ydtfd.js:81624-81768 placement
var drawnUsage = (e, t) => ({
  ...e,
  outcome: "drawn",
  form: t.form,
  format: rn(t),
  seriesCount: t.series.length,
  pointCount: el(t),
  hasLeftOut: t.leftOutNotes.length > 0,
});
//@ chunk-3s7ydtfd.js:81768-81828 placement
var qr = (e, t, o) => (Number.isNaN(e) ? o : Math.min(Math.floor(e), t));
/**
 * 由请求与数据生成图表结果：给模型的图例文本、终端行渲染器与 SVG 渲染器。
 */
//@ chunk-3s7ydtfd.js:81828-82020 placement
function buildChartResult(e, t, o) {
  let r = planChartLayout(e, t);
  return {
    kind: "chart",
    modelText: renderLegend(r).join(`
`),
    terminalRows: (s) => rasterizeChart(layoutChart(r, Math.max(0, qr(s, Sb, 0)))),
    svg: (s = Zr) => ansiToSvg(layoutChart(r, Math.max(Xa, qr(s, Zr, Zr)))),
    usage: drawnUsage(o, e),
  };
}
//@ chunk-3s7ydtfd.js:82020-82038 placement
var ol = 1 + ln + Ob * An;
/**
 * 未绘制的结果文本（Not drawn + 原因列表，按宽度折行）。
 */
//@ chunk-3s7ydtfd.js:82038-82211 placement
var refusedResult = (e, t, o) => ({
  kind: "refused",
  modelText: (
    "Not drawn. " +
    Et(t, ol, "more line").join(`
- `)
  )
    .split(
      `
`,
    )
    .map((r) =>
      wrapToWidth(r, Eb, 1 / 0).join(`
  `),
    ).join(`
`),
  usage: { ...o, outcome: e },
});
/**
 * x 列是名称而非时间时改画为柱状并加说明。
 */
//@ chunk-3s7ydtfd.js:82211-82366 placement
var redrawAsBars = (e, t, o) =>
  buildChartResult(
    {
      ...e,
      notes: [`drawn as bars, not as ${t.form ?? "line"}: ${t.x ?? "x"} holds names, not times`, ...e.notes],
    },
    Ut(t),
    { ...o, isFormReplaced: !0 },
  );
//@ chunk-3s7ydtfd.js:82366-82574 placement
function describeOtherResults(e, t, o) {
  let mapped = t
      .slice(-Cb)
      .map(
        ({ id: id, tool: tool, text: text }) =>
          `${cleanCellText(id, Qi)} (${cleanCellText(tool, Qi)}, ${K(text.length, "character")})`,
      ),
    s = mapped.length > 0;
  return refusedResult(
    e.code,
    [
      e.why +
        (s
          ? `
Or name another tool result:`
          : ""),
      ...mapped,
    ],
    o,
  );
}
//@ chunk-3s7ydtfd.js:82574-82814 placement
var NO_DATA_MESSAGES = (e) =>
  e
    ? { code: "no_result", why: "No tool has answered yet. Pass the rows as data" }
    : {
        code: "data_not_found",
        why: "data is neither the id of a tool result nor a table. Pass an id, JSON records, or the text of a CSV, TSV or markdown table",
      };
//@ chunk-3s7ydtfd.js:82814-82832 placement
var Ub = /\n|^[[{]/;
//@ chunk-3s7ydtfd.js:82832-82927 placement
function ml(e) {
  let t = N(e) ? e.data : void 0;
  return typeof t === "string" && Ub.test(t.trim()) ? t : void 0;
}
//@ chunk-3s7ydtfd.js:82927-82976 placement
var nl = (e, t, o) => ({ ...e, format: o ? rn(t) : e.format });
/**
 * y/by 为字符串时包成数组。
 */
//@ chunk-3s7ydtfd.js:82976-83087 placement
function normalizeChartInput(e) {
  return N(e)
    ? { ...e, ...(typeof e.y === "string" && { y: [e.y] }), ...(typeof e.by === "string" && { by: [e.by] }) }
    : e;
}
//@ chunk-3s7ydtfd.js:83087-83150 placement
var fl = (e) => (e.form === "share" ? { ...e, combine: e.combine ?? "sum" } : e);
/**
 * 处理 easel chart 调用：校验输入、选定数据来源（指定结果或上一个工具结果）、绘图并返回说明。
 */
//@ chunk-3s7ydtfd.js:83150-83903 placement
function handleChartCall(e) {
  let t = normalizeChartInput(cleanAllStrings(e.input ?? {}));
  if (!jx(t)) return refusedResult("bad_call", Xo(t), FAILED_USAGE);
  let r = fl(t),
    { data: s } = r,
    filtered = e.results.filter((oe) => oe.tool !== MCP_EASEL_CHART),
    m = s === void 0,
    n = m ? filtered.findLast((oe) => oe.text.trim() !== "") : filtered.find((oe) => oe.id === s),
    filtered_2 = filtered.filter((oe) => oe !== n),
    f = ml(e.input),
    i = typeof s === "object" ? JSON.stringify(s) : void 0,
    x = i ?? n?.text ?? f,
    c = an(r, i ? "rows" : n ? (m ? "last_result" : "result_id") : f === void 0 ? "none" : "text");
  if (x === void 0) return describeOtherResults(NO_DATA_MESSAGES(m), filtered_2, c);
  let g = { zone: r.zone === "local" ? e.zone : "UTC", nowMs: e.nowMs },
    T = readChartRequestData(x, r, g);
  if (T.kind === "data") return buildChartResult(T, r, c);
  let _ = T.problem.fitsBars ? describeNamesReadAsBars(T, readChartRequestData(x, Ut(r), g), r) : T;
  if (_.kind === "data") return redrawAsBars(_, r, c);
  let [A, ...Fe] = _.tables;
  return A !== void 0
    ? refusedResult(_.problem.code, [_.problem.why, ...gS(_.tables)], nl(c, A, Fe.length === 0))
    : describeOtherResults(_.problem, filtered_2, c);
}
//@ chunk-3s7ydtfd.js:83903-84269 placement
function describeRequestShape(e, t) {
  let o = { form: "line" },
    r = readChartRequestData(e, o, { zone: "UTC", nowMs: t.nowMs });
  if (!(r.kind === "data" && r.isSeries && r.leftOutNotes.length === 0)) return { kind: "none" };
  let p = cleanCellText(
      t.query.replaceAll(
        `
`,
        " ",
      ),
    ),
    n = r.subject.toLowerCase() === VALUE && p !== "" ? p : r.subject;
  return buildChartResult(
    {
      ...r,
      subject: n,
      series: r.series.map((sery) => (sery.name === r.subject ? { ...sery, name: n } : sery)),
    },
    o,
    { ...FAILED_USAGE, dataFrom: "last_result" },
  );
}
/**
 * 注册 chart 工具（设置了代理时不注册并记录）。
 */
//@ chunk-3s7ydtfd.js:84269-84598 placement
function registerChartTool(e, t, o) {
  if (o.isProxySet?.() === !0)
    (e.ui.log("no chart tool: a proxy is set", { to: "debug" }),
      e.telemetry.mark({ feature: "easel_chart", kind: "sad", reason: "proxy_set" }).catch(() => {
        return;
      }));
  else e.tool.register(Rc).catch((r) => e.ui.log(`no chart tool: ${String(r)}`, { to: "debug" }));
  if (t)
    e.telemetry.log(YT(t)).catch(() => {
      return;
    });
}
/**
 * 记录 easel 遥测（mark 与带界面列表的 log 事件）。
 */
//@ chunk-3s7ydtfd.js:84598-84845 placement
function logEaselUsage(e, t, o) {
  (e.telemetry.mark(XT(t, o.isAsked)).catch(() => {
    return;
  }),
    e.session
      .surfaces()
      .catch(() => [])
      .then((r) =>
        e.telemetry.log(
          buildEaselTelemetryEvent(t, {
            isAsked: o.isAsked,
            isInSubagent: o.agentId !== void 0,
            surfaces: r,
            elapsedMs: o.elapsedMs,
          }),
        ),
      )
      .catch(() => {
        return;
      }));
}
//@ chunk-3s7ydtfd.js:84845-84870 placement
var qb = [10, 20, 40, 80, 160];
//@ chunk-3s7ydtfd.js:84870-84881 placement
var eR = 256;
//@ chunk-3s7ydtfd.js:84881-84891 placement
var oR = 80;
/**
 * 缓存图表结果（满了淘汰最后一个），无图表时记入 chartlessIds。
 */
//@ chunk-3s7ydtfd.js:84891-85073 placement
function cacheChart(e, t, o) {
  if (o.kind === "none") return (e.chartlessIds.add(t), o);
  let at = [...e.charts.keys()].at(-1);
  if (e.charts.size >= eR && at !== void 0) e.charts.delete(at);
  return (e.charts.set(t, o), o);
}
//@ chunk-3s7ydtfd.js:85073-85107 placement
var ll = (e, t) => ({ ...e, ...(N(t) && t) });
//@ chunk-3s7ydtfd.js:85107-85160 placement
var xl = (e, t) => ({ type: "text", text: e, _meta: { easel: t } });
//@ chunk-3s7ydtfd.js:85160-85187 placement
var ul = (e) => e !== "terminal";
//@ chunk-3s7ydtfd.js:85187-85210 placement
var rs = (e) => e.length > 0;
//@ chunk-3s7ydtfd.js:85210-85239 placement
var aR = /^(0|false|no|off)$/i;
//@ chunk-3s7ydtfd.js:85239-85267 placement
var fR = /^(1|true|yes|on)$/i;
//@ chunk-3s7ydtfd.js:85267-85294 placement
var dl = /^mcp__(?!easel__)/;
/**
 * 从工具输入的 query/expr/query_expr 中取第一个非空查询文本。
 */
//@ chunk-3s7ydtfd.js:85294-85416 placement
function queryTextOf(e) {
  return (
    ["query", "expr", "query_expr"]
      .flatMap((t) => selectPath(e, t))
      .find((t) => typeof t === "string" && t.trim() !== "") ?? ""
  );
}
//@ chunk-3s7ydtfd.js:85416-85442 placement
var cl = (e) => [...(e ?? []), vx];
/**
 * 是否按读屏模式输出图表。
 */
//@ chunk-3s7ydtfd.js:85442-85580 placement
function isScreenReaderRequest(e, t) {
  let o = e?.trim() ?? "",
    matches = aR.test(o),
    found = t.find((p) => p.axScreenReader !== void 0);
  return matches ? !1 : fR.test(o) || found?.axScreenReader === !0;
}
/**
 * 读结果里的 _meta.easel（nowMs、时区，默认 UTC）。
 */
//@ chunk-3s7ydtfd.js:85580-85724 placement
function readEaselMeta(e) {
  let [t] = selectPath(e, "0._meta.easel"),
    { nowMs: nowMs, zone: zone } = N(t) ? t : {};
  return { nowMs: typeof nowMs === "number" ? nowMs : null, zone: typeof zone === "string" ? zone : "UTC" };
}
//@ chunk-3s7ydtfd.js:85724-85747 placement
var Tl = (e) => e.length > 0;
//@ chunk-3s7ydtfd.js:85747-85768 placement
var Ot = { kind: "none" };
/**
 * 复用进行中的会话消息读取，失败时清除缓存。
 */
//@ chunk-3s7ydtfd.js:85768-85930 placement
function cachedTranscript(e, t, o) {
  if (t.transcript && t.transcript !== o) return t.transcript;
  let r = e();
  return (
    (t.transcript = r),
    r.catch(() => {
      if (t.transcript === r) t.transcript = void 0;
    }),
    r
  );
}
//@ chunk-3s7ydtfd.js:85930-86506 placement
async function memoizeChartRender(e, t, o) {
  let { tool_use_id: tool_use_id, tool: tool, input: input, output: output, isErrored: isErrored } = o.row;
  if (isErrored || output === void 0 || tool_use_id === void 0) return Ot;
  let i = t.chartlessIds.has(tool_use_id) ? Ot : t.charts.get(tool_use_id);
  if (i) return i;
  let x = tool !== MCP_EASEL_CHART,
    l = x && o.hasWholeOutput,
    u = t.autoChartCalls.get(tool_use_id);
  if (l)
    return cacheChart(
      t,
      tool_use_id,
      describeRequestShape(toolResultText(output), u ?? { nowMs: null, query: queryTextOf(input) }),
    );
  let d = cachedTranscript(e, t),
    g = await ((await d).some((_) => _.id === tool_use_id) ? d : cachedTranscript(e, t, d)),
    index = g.findIndex((_) => _.id === tool_use_id),
    L = g[index];
  if (!L) return Tl(g) ? cacheChart(t, tool_use_id, Ot) : Ot;
  return cacheChart(
    t,
    tool_use_id,
    x
      ? describeRequestShape(
          toolResultText(L.storedResult),
          u ?? { nowMs: null, query: queryTextOf(L.input) },
        )
      : handleChartCall({ input: L.input, results: g.slice(0, index), ...readEaselMeta(L.storedResult) }),
  );
}
//@ chunk-3s7ydtfd.js:86506-86568 placement
var gl = (e, t, o) => h(e.Box, { flexDirection: "column" }, t.hostRow, o);
//@ chunk-3s7ydtfd.js:86568-86827 placement
function formatChartGroupHeader(e) {
  let t = e.callCount > 1;
  return h(
    e.elements.Box,
    { flexDirection: "column" },
    h(e.elements.Svg, { source: e.chart.svg(e.columns), alt: e.chart.modelText }),
    t
      ? h(e.elements.Text, { dimColor: !0 }, `newest of ${e.callCount} calls: open the group for the rest`)
      : null,
  );
}
//@ chunk-3s7ydtfd.js:86827-86836 placement
var gR = 6;
//@ chunk-3s7ydtfd.js:86836-86905 placement
var _l = (e) => (e > 1 ? `newest of ${e} calls, ctrl+o for the rest \xB7 ` : "");
//@ chunk-3s7ydtfd.js:86905-86976 placement
var Cl = (e) => `auto chart \xB7 ${_l(e)}turn off in /config: Auto charts`;
//@ chunk-3s7ydtfd.js:86976-87010 placement
var Ll = (e) => (e === void 0 ? [] : [Cl(e)]);
//@ chunk-3s7ydtfd.js:87010-87030 placement
var ER = "  \u23BF  ";
//@ chunk-3s7ydtfd.js:87030-87428 placement
function renderChartTitle(e, t) {
  let o = e.columns - gR;
  return h(
    e.elements.Box,
    { flexDirection: "row" },
    h(e.elements.Text, { dimColor: !0 }, ER),
    h(
      e.elements.Text,
      null,
      e.chart
        .terminalRows(o)
        .concat(t.flatMap((r) => wrapToWidth(r, o)).map((r) => [{ text: r, ink: "quiet" }]))
        .flatMap((r, s) => [
          s > 0
            ? `
`
            : "",
          ...r.map((p) =>
            h(
              e.elements.Text,
              {
                color: CHART_THEME_COLORS[p.ink].host,
                backgroundColor: p.background && CHART_THEME_COLORS[p.background].host,
                bold: p.ink === "title",
              },
              p.text,
            ),
          ),
        ]),
    ),
  );
}
/**
 * 渲染自动图表：读屏模式输出文本，否则渲染标题与图。
 */
//@ chunk-3s7ydtfd.js:87428-87560 placement
function renderAutoChart(e) {
  let t = Ll(e.autoCallCount);
  return e.isScreenReader
    ? h(
        e.elements.Text,
        null,
        [e.chart.modelText, ...t].join(`
`),
      )
    : renderChartTitle(e, t);
}
/**
 * 为显示中的行重新渲染图表（按视口宽度缓存）。
 */
//@ chunk-3s7ydtfd.js:87560-88318 placement
async function renderChartsForRows(e, t) {
  let { cache: cache, event: event, rows: rows } = t,
    p = event.viewport?.columns;
  for (let m of rows.toReversed()) {
    let n = await memoizeChartRender(async () => collectToolUses(await e.session.messages({})), cache, {
      row: m,
      hasWholeOutput: event.surface === "terminal",
    });
    if (n.kind !== "chart") continue;
    if (event.surface !== "terminal") {
      let i = formatChartGroupHeader({
        elements: e.ui.resolve(event),
        chart: n,
        columns: p,
        callCount: rows.length,
      });
      return gl(e.ui.resolve(event), t, i);
    }
    if (cache.screenReader === "unread") {
      let i = await e.env.get("CLAUDE_AX_SCREEN_READER"),
        x = [];
      for (let l of ["policy", "flag", "user"]) x.push(await e.settings.read({ source: l }));
      cache.screenReader = isScreenReaderRequest(i, x) ? "on" : "off";
    }
    let a = m.tool === MCP_EASEL_CHART,
      f = renderAutoChart({
        elements: e.ui.resolve(event),
        chart: n,
        columns: p ?? oR,
        isScreenReader: cache.screenReader === "on",
        autoCallCount: a ? void 0 : rows.length,
      });
    return gl(e.ui.resolve(event), t, f);
  }
  return t.hostRow;
}
/**
 * easel 插件注册：维护图表与自动图表状态、读屏器开关，挂接 tool.call/ui.render 钩子。
 */
//@ chunk-3s7ydtfd.js:88318-90767 placement
function registerEasel(e, t, o = {}) {
  let r = o.isReaderOn?.(),
    s = {
      charts: new Map(),
      chartlessIds: new Set(),
      autoChartCalls: new Map(),
      screenReader: r === void 0 ? "unread" : r ? "on" : "off",
    },
    parts = String(t.autoChartSkip ?? "").split(/[\s,]+/),
    m = (f) =>
      dl.test(f) &&
      t.autoCharts !== !1 &&
      o.isRegulated?.() !== !0 &&
      !parts.some((i) => f.startsWith(`mcp__${i}__`)),
    any = parts.some((f) => f !== ""),
    a = t.autoCharts === !1 ? "off" : any && "skips_servers";
  (e("session.start", async (f, i, x) => {
    if (rs(await f.session.surfaces())) registerChartTool(f, a, o);
    return x(i);
  }),
    e("session.attach", (f, i, x) => (registerChartTool(f, a, o), x(i))),
    e("prompt.section", { name: "env_info_simple" }, async (f, i, x) => {
      let l = await x(i);
      return l.text === null
        ? l
        : {
            text: `${l.text}
${CHART_TOOL_HINT}`,
          };
    }),
    e("tool.call", { tool: MCP_EASEL_CHART }, async (f, i, x) => {
      if (o.isRegulated?.() === !0) return { deny: $x };
      let {
          tool: tool,
          tool_use_id: tool_use_id,
          agentId: agentId,
          consent: consent,
          $shadowed: $shadowed,
          ...T
        } = i,
        L = ll(T, $shadowed);
      s.transcript = void 0;
      let _ = T.data === void 0 && agentId === void 0 && o.isBatchAwaited?.() === !0,
        w = await waitForToolUses(
          f,
          { tool_use_id: tool_use_id, agentId: agentId, signal: x.signal },
          _ ? qb : [],
        );
      if (w === void 0) return { deny: NO_CONVERSATION_MESSAGE };
      let A = { nowMs: await f.clock.now(), zone: Intl.DateTimeFormat().resolvedOptions().timeZone },
        startTime = performance.now(),
        et = handleChartCall({ input: L, results: w, ...A });
      (cacheChart(s, tool_use_id, et),
        logEaselUsage(f, et.usage, {
          isAsked: !0,
          agentId: agentId,
          elapsedMs: performance.now() - startTime,
        }));
      let modelText = et.modelText;
      return et.kind === "chart" ? { result: [xl(modelText, A)] } : { deny: modelText };
    }).catch(
      (f, i) => (
        logEaselUsage(f, FAILED_USAGE, { isAsked: !0, agentId: i.agentId, elapsedMs: 0 }),
        { deny: EASEL_FAILED_MESSAGE }
      ),
    ),
    e("tool.call", { tool: dl }, async (f, i, x) => {
      let l = await x(i);
      if (
        ((s.transcript = void 0),
        "deny" in l || l.isError || !m(i.tool) || i.agentId !== void 0 || !rs(await f.session.surfaces()))
      )
        return l;
      let d = { nowMs: await f.clock.now(), query: queryTextOf(i) },
        startTime = performance.now(),
        g = describeRequestShape(toolResultText(l.result), d);
      if (g.kind !== "chart") return (cacheChart(s, i.tool_use_id, g), l);
      return (
        s.autoChartCalls.set(i.tool_use_id, d),
        logEaselUsage(f, g.usage, {
          isAsked: !1,
          agentId: i.agentId,
          elapsedMs: performance.now() - startTime,
        }),
        { ...l, context: cl(l.context) }
      );
    }).catch(async (f, i, x) => {
      let l = await x(i);
      return (logEaselUsage(f, FAILED_USAGE, { isAsked: !1, agentId: i.agentId, elapsedMs: 0 }), l);
    }),
    e(
      "ui.render",
      { component: "ToolResult", surface: "terminal", props: { tool: MCP_EASEL_CHART } },
      async (f, i, x) =>
        (await renderChartsForRows(f, {
          cache: s,
          event: i,
          hostRow: null,
          rows: [{ ...i.props, input: void 0 }],
        })) ?? x(i),
    ),
    e("ui.render", { component: "ToolUse", props: { tool: /^mcp__/ } }, async (f, i, x) => {
      let { tool: tool } = i.props,
        c = (tool === MCP_EASEL_CHART ? ul(i.surface) : m(tool)) ? [i.props] : [];
      return renderChartsForRows(f, { cache: s, event: i, hostRow: await x(i), rows: c });
    }),
    e("ui.render", { component: "ToolGroup", props: { isExpanded: !1 } }, async (f, i, x) => {
      let filtered = i.props.calls.filter((u) => m(u.tool));
      return renderChartsForRows(f, { cache: s, event: i, hostRow: await x(i), rows: filtered });
    }));
}

export { registerEasel };
