/**
 * dijkstrajs/dijkstra.js
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * third-party: dijkstrajs@1.0.3
 * pieces: chunk-s2h2kd6t.js (1)
 * attribution: cjs-fingerprint 1
 */
import { __commonJS } from "../../runtime/bun-runtime.js";

//@ chunk-s2h2kd6t.js:13686-14833 cjs-fingerprint
var require_dijkstra = __commonJS(function (cjsExports, cjsModule) {
  var dijkstra = {
    single_source_shortest_paths: function (graph, s_2, d) {
      var predecessors = {};
      var costs = {};
      costs[s_2] = 0;
      var open = dijkstra.PriorityQueue.make();
      open.push(s_2, 0);
      var closest;
      var u_2;
      var v;
      var cost_of_s_to_u;
      var adjacent_nodes;
      var cost_of_e;
      var cost_of_s_to_u_plus_cost_of_e;
      var cost_of_s_to_v;
      var first_visit;
      while (!open.empty()) {
        closest = open.pop();
        u_2 = closest.value;
        cost_of_s_to_u = closest.cost;
        adjacent_nodes = graph[u_2] || {};
        for (v in adjacent_nodes)
          if (adjacent_nodes.hasOwnProperty(v)) {
            cost_of_e = adjacent_nodes[v];
            cost_of_s_to_u_plus_cost_of_e = cost_of_s_to_u + cost_of_e;
            cost_of_s_to_v = costs[v];
            first_visit = typeof costs[v] === "undefined";
            if (first_visit || cost_of_s_to_v > cost_of_s_to_u_plus_cost_of_e) {
              costs[v] = cost_of_s_to_u_plus_cost_of_e;
              open.push(v, cost_of_s_to_u_plus_cost_of_e);
              predecessors[v] = u_2;
            }
          }
      }
      if (typeof d !== "undefined" && typeof costs[d] === "undefined") {
        var msg = ["Could not find a path from ", s_2, " to ", d, "."].join("");
        throw Error(msg);
      }
      return predecessors;
    },
    extract_shortest_path_from_predecessor_list: function (predecessors, d) {
      var nodes = [];
      var u = d;
      var predecessor;
      while (u) {
        nodes.push(u);
        predecessor = predecessors[u];
        u = predecessors[u];
      }
      nodes.reverse();
      return nodes;
    },
    find_path: function (graph, s, d) {
      var predecessors = dijkstra.single_source_shortest_paths(graph, s, d);
      return dijkstra.extract_shortest_path_from_predecessor_list(predecessors, d);
    },
    PriorityQueue: {
      make: function (opts) {
        var T = dijkstra.PriorityQueue;
        var t = {};
        var key;
        opts = opts || {};
        for (key in T) if (T.hasOwnProperty(key)) t[key] = T[key];
        t.queue = [];
        t.sorter = opts.sorter || T.default_sorter;
        return t;
      },
      default_sorter: function (a, b) {
        return a.cost - b.cost;
      },
      push: function (value, cost) {
        var item = {
          value,
          cost,
        };
        this.queue.push(item);
        this.queue.sort(this.sorter);
      },
      pop: function () {
        return this.queue.shift();
      },
      empty: function () {
        return this.queue.length === 0;
      },
    },
  };
  if (typeof cjsModule !== "undefined") cjsModule.exports = dijkstra;
});
export { require_dijkstra };
