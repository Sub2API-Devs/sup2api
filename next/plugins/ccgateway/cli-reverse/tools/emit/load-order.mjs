// Load order of the reading tree's modules, reconstructed from the original chunks.
//   import { moduleLoadOrder } from './load-order.mjs'
//   moduleLoadOrder({ decls, moduleOf, chunkOrder }) -> { rank: Map(module -> index), order: [module…], stats }
//     decls      top-level statements of original/ (analysis/scan/decls.jsonl records)
//     moduleOf   decl -> output module path (null: not emitted)
//     chunkOrder [chunk…] in the order the original evaluates them (see chunkEvalOrder)
//   chunkEvalOrder(importsOf, entry) -> [chunk…]
//     importsOf  Map(chunk -> { static: [chunk…], atLoad: [chunk…], dynamic: [chunk…] }) in source order
//
// Bun (like esbuild) writes the files of a chunk in one depth-first order of the source import
// graph, every file's statements contiguous, a file after the files it imports. Reading a chunk's
// statements and mapping them to output modules therefore gives a sequence of modules that the
// source program evaluated in that order. All chunks' sequences are merged into one order of
// modules: a precedence graph (a -> b when a's statements directly precede b's in some chunk,
// weighted by how often), topologically sorted; ties and cycles (placement that does not match the
// source, files split differently in different chunks) are resolved by the time the original
// evaluates the module's first statement (chunk evaluation order, then offset).
// docs/process/buildable.md, "evaluation order".

export function chunkEvalOrder(importsOf, entry) {
  // static imports depth first (ESM order), then the chunks loaded while the chunk is evaluated
  // (atLoad: a top-level require() / import(), they are evaluated during it, so before the rest of it);
  // chunks loaded later by import()/require() inside functions afterwards, in the order they are first
  // referenced, each with its own imports
  const order = [];
  const seen = new Set();
  const lazyQueue = [];
  const visit = (root) => {
    const stack = [[root, 0]];
    seen.add(root);
    while (stack.length) {
      const top = stack[stack.length - 1];
      const im = importsOf.get(top[0]);
      const deps = im ? [...im.static, ...(im.atLoad ?? [])] : [];
      if (top[1] < deps.length) {
        const t = deps[top[1]++];
        if (!seen.has(t)) { seen.add(t); stack.push([t, 0]); }
      } else {
        stack.pop();
        order.push(top[0]);
        for (const d of importsOf.get(top[0])?.dynamic ?? []) lazyQueue.push(d);
      }
    }
  };
  visit(entry);
  for (let i = 0; i < lazyQueue.length; i++) if (!seen.has(lazyQueue[i])) visit(lazyQueue[i]);
  for (const c of importsOf.keys()) if (!seen.has(c)) visit(c);
  return order;
}

export function moduleLoadOrder({ decls, moduleOf, chunkOrder }) {
  const chunkRank = new Map(chunkOrder.map((c, i) => [c, i]));
  const byChunk = new Map();
  for (const d of decls) {
    if (!byChunk.has(d.file)) byChunk.set(d.file, []);
    byChunk.get(d.file).push(d);
  }
  const first = new Map(); // module -> earliest original evaluation time [chunk rank, offset]
  const edges = new Map(); // a -> Map(b -> weight)
  const nodes = new Set();
  const earlier = (x, y) => x[0] < y[0] || (x[0] === y[0] && x[1] < y[1]);
  for (const [chunk, ds] of byChunk) {
    const cr = chunkRank.get(chunk) ?? chunkOrder.length;
    ds.sort((a, b) => a.start - b.start);
    let prev = null;
    for (const d of ds) {
      const m = moduleOf(d);
      if (!m) continue;
      nodes.add(m);
      const t = [cr, d.start];
      if (!first.has(m) || earlier(t, first.get(m))) first.set(m, t);
      if (prev && prev !== m) {
        if (!edges.has(prev)) edges.set(prev, new Map());
        const e = edges.get(prev);
        e.set(m, (e.get(m) ?? 0) + 1);
      }
      prev = m;
    }
  }
  // Kahn's algorithm; among ready modules the one the original evaluates first. When every
  // remaining module has a predecessor (a cycle), the earliest-evaluated one is taken and its
  // incoming edges are counted as dropped.
  const indeg = new Map([...nodes].map((n) => [n, 0]));
  for (const [, e] of edges) for (const [b] of e) indeg.set(b, indeg.get(b) + 1);
  const key = (m) => first.get(m);
  const cmp = (a, b) => { const x = key(a), y = key(b); return x[0] - y[0] || x[1] - y[1] || (a < b ? -1 : 1); };
  // binary heap of ready modules
  const heap = [];
  const push = (m) => { heap.push(m); let i = heap.length - 1; while (i > 0) { const p = (i - 1) >> 1; if (cmp(heap[i], heap[p]) >= 0) break; [heap[i], heap[p]] = [heap[p], heap[i]]; i = p; } };
  const pop = () => { const top = heap[0]; const last = heap.pop(); if (heap.length) { heap[0] = last; let i = 0; for (;;) { const l = 2 * i + 1, r = l + 1; let s = i; if (l < heap.length && cmp(heap[l], heap[s]) < 0) s = l; if (r < heap.length && cmp(heap[r], heap[s]) < 0) s = r; if (s === i) break; [heap[i], heap[s]] = [heap[s], heap[i]]; i = s; } } return top; };
  for (const [n, k] of indeg) if (k === 0) push(n);
  const remaining = new Set(nodes);
  const byTime = [...nodes].sort(cmp);
  let cursor = 0;
  const order = [];
  let dropped = 0, cycleBreaks = 0;
  const done = new Set();
  while (order.length < nodes.size) {
    let m;
    if (heap.length) m = pop();
    else {
      while (done.has(byTime[cursor])) cursor++;
      m = byTime[cursor];
      dropped += indeg.get(m);
      cycleBreaks++;
    }
    if (done.has(m)) continue;
    done.add(m);
    remaining.delete(m);
    order.push(m);
    for (const [b] of edges.get(m) ?? []) {
      if (done.has(b)) continue;
      indeg.set(b, indeg.get(b) - 1);
      if (indeg.get(b) === 0) push(b);
    }
  }
  return { rank: new Map(order.map((m, i) => [m, i])), order, stats: { modules: order.length, cycleBreaks, droppedEdges: dropped } };
}
