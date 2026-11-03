/**
 * dijkstrajs/dijkstra.js
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * third-party: dijkstrajs@1.0.3
 * pieces: chunk-spjgqa4y.js (1)
 * attribution: cjs-fingerprint 1
 */
import { x } from "../../runtime/bun-runtime.js";

//@ chunk-spjgqa4y.js:13686-14833 cjs-fingerprint
var Er = x(function (ql, Qe) {
  var _e = {
    single_source_shortest_paths: function (t, e, r) {
      var n = {},
        i = {};
      i[e] = 0;
      var make = _e.PriorityQueue.make();
      make.push(e, 0);
      var s, l, u, f, a, h, c, p, _;
      while (!make.empty()) {
        ((s = make.pop()), (l = s.value), (f = s.cost), (a = t[l] || {}));
        for (u in a)
          if (a.hasOwnProperty(u)) {
            if (((h = a[u]), (c = f + h), (p = i[u]), (_ = typeof i[u] > "u"), _ || p > c))
              ((i[u] = c), make.push(u, c), (n[u] = l));
          }
      }
      if (typeof r < "u" && typeof i[r] > "u") {
        var joined = ["Could not find a path from ", e, " to ", r, "."].join("");
        throw Error(joined);
      }
      return n;
    },
    extract_shortest_path_from_predecessor_list: function (t, e) {
      var r = [],
        n = e,
        i;
      while (n) (r.push(n), (i = t[n]), (n = t[n]));
      return (r.reverse(), r);
    },
    find_path: function (t, e, r) {
      var single_source_shortest_paths = _e.single_source_shortest_paths(t, e, r);
      return _e.extract_shortest_path_from_predecessor_list(single_source_shortest_paths, r);
    },
    PriorityQueue: {
      make: function (t) {
        var PriorityQueue = _e.PriorityQueue,
          r = {},
          n;
        t = t || {};
        for (n in PriorityQueue) if (PriorityQueue.hasOwnProperty(n)) r[n] = PriorityQueue[n];
        return ((r.queue = []), (r.sorter = t.sorter || PriorityQueue.default_sorter), r);
      },
      default_sorter: function (t, e) {
        return t.cost - e.cost;
      },
      push: function (t, e) {
        var r = { value: t, cost: e };
        (this.queue.push(r), this.queue.sort(this.sorter));
      },
      pop: function () {
        return this.queue.shift();
      },
      empty: function () {
        return this.queue.length === 0;
      },
    },
  };
  if (typeof Qe < "u") Qe.exports = _e;
});

export { Er };
