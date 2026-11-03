/**
 * plugins/bundled/mermaid/flowchartLayout.ts
 *
 * 2.1.316 新增：mermaid 流程图分层布局
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-yb0ajcmt.js (8)
 * attribution: placement 8
 */
import { at, ke, BOX_DIRECTION_BITS, v, G, X, lt, ut, A } from "../../../ink/graphemeCells.js";
import { labelEdgeBundles } from "./flowchartRender.js";

/**
 * 把字符网格（字形、连线位、样式、圆角）转为文本行。
 */
//@ chunk-yb0ajcmt.js:9934-10213 placement
function gridToLines(e) {
  let t = [];
  for (let n = 0; n < e.height; n++) {
    let o = "";
    for (let i = 0; i < e.width; i++) {
      let u = n * e.width + i,
        r = e.links[u] ?? 0,
        s = at[ke[e.styles[u] ?? 0] ?? "solid"];
      o +=
        e.glyphs[u] ??
        (r === (BOX_DIRECTION_BITS | v)
          ? s.down
          : r === (G | X)
            ? s.across
            : ((e.rounded[u] ? lt[r] : void 0) ?? ut[r] ?? " "));
    }
    t.push(o.trimEnd());
  }
  return t;
}
//@ chunk-yb0ajcmt.js:10213-10237 placement
var dt = 1000,
  ct = 64,
  ft = 24;
/**
 * 把解析后的 mermaid 流程图（节点/边/子图）按方向分层布局到字符网格坐标。
 */
//@ chunk-yb0ajcmt.js:10237-13733 placement
function layoutFlowchart(e, t, n) {
  let o = e.direction === "TD" || e.direction === "BT",
    i = new Map(e.nodes.map((node, m) => [node.id, m])),
    mapped = e.edges.map((edge) => ({ from: i.get(edge.from) ?? 0, to: i.get(edge.to) ?? 0 })),
    mapped_2 = e.nodes.map(() => []);
  mapped.forEach((d, m) => mapped_2[d.from]?.push(m));
  let mapped_3 = mapped.map((d) => d.from === d.to),
    uint8Array = new Uint8Array(e.nodes.length);
  for (let d = 0; d < e.nodes.length; d++)
    markLoopEdges(d, { outgoing: mapped_2, links: mapped, visited: uint8Array, isLoop: mapped_3 });
  let a = rankNodesTopologically(
      e.nodes.length,
      mapped.filter((d, m) => !mapped_3[m]),
    ),
    mapped_4 = e.nodes.map(() => 0),
    mapped_5 = e.nodes.map(() => "");
  if (
    (e.edges.forEach((edge, m) => {
      let F = mapped[m]?.to ?? 0;
      ((mapped_4[F] = (mapped_4[F] ?? 0) + 1),
        (mapped_5[F] = edge.label === "" ? (mapped_5[F] ?? "") : edge.label));
    }),
    mapped_5.some((d, m) => d !== "" && (mapped_4[m] ?? 0) > 1))
  )
    return;
  let mapped_6 = e.nodes.map((node, m) => {
    let F = Math.max(...node.label.map(A)) + 4,
      b = node.label.length + 2,
      k = o ? F : b,
      M = mapped_5[m] ?? "";
    return {
      kind: "box",
      label: node.label,
      isRounded: node.isRounded,
      line: "solid",
      rank: a[m] ?? 0,
      center: 0,
      breadth: k,
      slot: o && M !== "" ? Math.max(k, A(M) + 2) : k,
      depth: o ? b : F,
      start: 0,
    };
  });
  if (mapped.reduce((d, m, F) => d + (mapped_3[F] ? 2 : (a[m.to] ?? 0) - (a[m.from] ?? 0)), 0) > dt) return;
  let S = [];
  mapped.forEach((d, m) => {
    let F = e.edges[m],
      b = a[d.to] ?? 0,
      from = d.from;
    for (let M = (a[d.from] ?? 0) + 1; M <= b && F && !mapped_3[m]; M++) {
      let H = M === b ? d.to : mapped_6.length;
      if (M !== b)
        mapped_6.push({
          kind: "crossing",
          label: [],
          isRounded: !1,
          line: F.line,
          rank: M,
          center: 0,
          breadth: 1,
          slot: 1,
          depth: 0,
          start: 0,
        });
      (S.push({
        kind: "plain",
        gap: M - 1,
        from: from,
        to: H,
        line: F.line,
        label: M === b ? F.label : "",
        hasHead: F.hasArrow && M === b,
        track: -1,
      }),
        (from = H));
    }
  });
  let w = [];
  mapped_6.forEach((d, m) => {
    let F = w[d.rank] ?? [];
    (F.push(m), (w[d.rank] = F));
  });
  let mapped_7 = mapped_6.map(() => []),
    mapped_8 = mapped_6.map(() => []);
  for (let d of S) (mapped_7[d.to]?.push(d.from), mapped_8[d.from]?.push(d.to));
  for (let d = 0; d < 4; d++) {
    let m = d % 2 === 0;
    for (let F = 1; F < w.length; F++) {
      let b = m ? F : w.length - 1 - F,
        k = w[m ? b - 1 : b + 1] ?? [],
        M = w[b] ?? [],
        H = new Map(k.map((N, P) => [N, P])),
        K = new Map(
          M.map((N, P) => [N, Ce(((m ? mapped_7 : mapped_8)[N] ?? []).map((Y) => H.get(Y) ?? 0)) ?? P]),
        );
      M.sort((N, P) => (K.get(N) ?? 0) - (K.get(P) ?? 0));
    }
  }
  let I = o ? (t ? 1 : 3) : t ? 0 : 1;
  for (let d of w)
    d.forEach((m, F) => {
      let b = mapped_6[m],
        k = mapped_6[d[F - 1] ?? -1];
      if (b) b.center = k ? k.center + requiredCenterGap(k, b, I) : Math.floor(b.slot / 2);
    });
  for (let d = 0; d < 4; d++) {
    let m = d % 2 === 0;
    for (let F = 1; F < w.length; F++) {
      let b = m ? F : w.length - 1 - F;
      spreadNodeCenters(
        (w[b] ?? []).flatMap((k) => mapped_6[k] ?? []),
        (w[b] ?? []).map((k) =>
          Ce(((m ? mapped_7 : mapped_8)[k] ?? []).map((M) => mapped_6[M]?.center ?? 0)),
        ),
        I,
      );
    }
  }
  let min = Math.min(...mapped_6.map((d) => d.center - Math.floor(d.slot / 2)));
  for (let d of mapped_6) d.center -= min;
  let max = Math.max(...mapped_6.map((d) => d.center - Math.floor(d.slot / 2) + d.slot)),
    sorted = mapped
      .flatMap((d, m) => (mapped_3[m] ? [{ link: d, edge: m }] : []))
      .sort(
        (d, m) => (a[d.link.from] ?? 0) - (a[d.link.to] ?? 0) - ((a[m.link.from] ?? 0) - (a[m.link.to] ?? 0)),
      );
  for (let { link: link, edge: edge } of sorted) {
    let F = e.edges[edge],
      b = {
        kind: "channel",
        label: [],
        isRounded: !1,
        line: F?.line ?? "solid",
        rank: -1,
        center: max + 1,
        breadth: 1,
        slot: 1,
        depth: 0,
        start: 0,
      };
    ((max += 2),
      mapped_6.push(b),
      S.push(
        {
          kind: "loopOut",
          gap: a[link.from] ?? 0,
          from: link.from,
          to: mapped_6.length - 1,
          line: b.line,
          label: "",
          hasHead: !1,
          track: -1,
        },
        {
          kind: "loopIn",
          gap: (a[link.to] ?? 0) - 1,
          from: mapped_6.length - 1,
          to: link.to,
          line: b.line,
          label: F?.label ?? "",
          hasHead: Boolean(F?.hasArrow),
          track: -1,
        },
      ));
  }
  if (o && max > n) return "too wide";
  let V = new Map(),
    B = 0;
  for (let d = -1; d < w.length; d++) {
    let flattened = (w[d] ?? []).flatMap((R) => mapped_6[R] ?? []),
      F = d < 0 ? 0 : Math.max(1, ...flattened.map((R) => R.depth));
    for (let R of flattened)
      ((R.depth = R.kind === "crossing" ? F : R.depth), (R.start = B + Math.floor((F - R.depth) / 2)));
    B += F;
    let filtered = S.filter((R) => R.gap === d),
      k = d >= 0 && d < w.length - 1;
    if (filtered.length === 0 && !k) continue;
    if (!o && B > n) return "too wide";
    let M = filtered.length > ct ? void 0 : labelEdgeBundles(filtered, mapped_6);
    if (M === void 0) return;
    let max = Math.max(0, ...filtered.map((R) => A(R.label))),
      K = o ? 1 : 2,
      N = max === 0 ? 0 : o ? 1 : max + 2,
      P = d < 0 ? B - 1 : B,
      Y = P + 1 + M * K;
    (V.set(d, { start: P, labelStart: Y, labelSize: N, stride: K }),
      (B = d === w.length - 1 ? Y : Y + N + (o ? 1 : 2)));
  }
  return {
    isVertical: o,
    isFlipped: e.direction === "BT" || e.direction === "RL",
    nodes: mapped_6,
    segments: S,
    gaps: V,
    rankExtent: B,
    orderExtent: max,
  };
}
/**
 * 深度优先遍历，标记形成环的边。
 */
//@ chunk-yb0ajcmt.js:13733-13911 placement
function markLoopEdges(e, t) {
  if (t.visited[e] !== 0) return;
  t.visited[e] = 1;
  for (let n of t.outgoing[e] ?? []) {
    let o = t.links[n]?.to ?? 0;
    if (t.visited[o] === 1) t.isLoop[n] = !0;
    else markLoopEdges(o, t);
  }
  t.visited[e] = 2;
}
//@ chunk-yb0ajcmt.js:13911-14270 placement
function rankNodesTopologically(e, t) {
  let list = Array.from({ length: e }, () => 0),
    list_2 = Array.from({ length: e }, () => 0),
    list_3 = Array.from({ length: e }, () => []);
  for (let r of t) ((list_2[r.to] = (list_2[r.to] ?? 0) + 1), list_3[r.from]?.push(r.to));
  let flattened = list_2.flatMap((r, s) => (r === 0 ? [s] : []));
  for (let r = 0; r < flattened.length; r++) {
    let s = flattened[r] ?? 0;
    for (let l of list_3[s] ?? [])
      if (
        ((list[l] = Math.max(list[l] ?? 0, (list[s] ?? 0) + 1)),
        (list_2[l] = (list_2[l] ?? 0) - 1),
        list_2[l] === 0)
      )
        flattened.push(l);
  }
  return list;
}
//@ chunk-yb0ajcmt.js:14270-14344 placement
function Ce(e) {
  return e.length === 0 ? void 0 : e.reduce((t, n) => t + n, 0) / e.length;
}
/**
 * 图布局：两个相邻节点中心的最小间距。旧版名 percentile 为错配，归错文件。
 */
//@ chunk-yb0ajcmt.js:14344-14401 placement = percentile (0.62)
function requiredCenterGap(e, t, n) {
  return Math.ceil((e.slot + t.slot) / 2) + n;
}
/**
 * 图布局：前向/后向两遍约束后取中点，调整节点中心位置。
 */
//@ chunk-yb0ajcmt.js:14401-14774 placement
function spreadNodeCenters(e, t, n) {
  let o = [];
  e.forEach((u, r) => {
    let s = e[r - 1],
      rounded = Math.round(t[r] ?? u.center);
    o.push(s ? Math.max(rounded, (o[r - 1] ?? 0) + requiredCenterGap(s, u, n)) : rounded);
  });
  let list = Array.from({ length: e.length }, () => 0);
  for (let u = e.length - 1; u >= 0; u--) {
    let r = e[u],
      s = e[u + 1],
      rounded = Math.round(t[u] ?? r?.center ?? 0);
    list[u] = r && s ? Math.min(rounded, (list[u + 1] ?? 0) - requiredCenterGap(r, s, n)) : rounded;
  }
  e.forEach((u, r) => {
    u.center = Math.floor(((o[r] ?? 0) + (list[r] ?? 0)) / 2);
  });
}

export { ft, layoutFlowchart, gridToLines };
