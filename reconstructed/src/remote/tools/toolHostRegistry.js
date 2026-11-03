/**
 * remote/tools/toolHostRegistry.ts
 *
 * 工具宿主登记（2.1.316 新增）
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-s61vbvea.js (3)
 * attribution: placement 3
 */
import {
  isDeepStrictEqual,
  isDeepStrictEqual as isDeepStrictEqual_2,
  isDeepStrictEqual as isDeepStrictEqual_3,
  isDeepStrictEqual as isDeepStrictEqual_4,
} from "util";
import { b4, xH, machineNameMatches, _4 } from "../../bridge/deviceRegistration.js";
import { logForDebugging } from "../../utils/debug.js";

//@ chunk-s61vbvea.js:451474-451551 placement
var Y0 = ["session", "bridge", "loopback"],
  q0 = { session: !1, bridge: !0, loopback: !0 };
/**
 * 工具宿主登记：local/host/remote 等来源
 */
//@ chunk-s61vbvea.js:451551-453085 placement
class ToolHostRegistry {
  #e = new Map();
  get defaultHost() {
    return { kind: "local", name: b4(), enforcement: "host" };
  }
  hosts() {
    return [this.defaultHost, ...this.#t()];
  }
  resolve(e) {
    if (xH(e)) return { kind: "local", host: this.defaultHost };
    let n = this.#t(),
      found = n.find((y) => y.name === e);
    if (found) return { kind: "remote", host: found };
    let [s, h] = n.filter((y) => machineNameMatches(e, y.name));
    return s !== void 0 && h === void 0 ? { kind: "remote", host: s } : { kind: "unknown" };
  }
  replaceRemoteHosts(e, n) {
    if (n.find((P) => P.source !== e))
      throw Error("replaceRemoteHosts was handed a ToolHost registered by another source");
    let s = snapshotToolHosts(this.#t()),
      h = this.#e.get(e) ?? new Map(),
      y = new Map(),
      flattened = n.flatMap((P) => {
        if (!_4(P.name) || y.has(P.name)) return [P.name];
        return (y.set(P.name, P), []);
      }),
      w = y.size > 0 || !q0[e] ? [] : [...h.values()].map((P) => [P.name, { ...P, status: "offline" }]),
      R = new Map(this.#e);
    (R.set(e, new Map([...w, ...y])), (this.#e = R));
    let x = snapshotToolHosts(this.#t());
    return { changed: !isDeepStrictEqual_2(s, x), dropped: flattened };
  }
  passthroughHost(e) {
    return this.#n().find((n) => n.passthroughTools?.has(e) === !0);
  }
  sourceHosts(e) {
    return [...(this.#e.get(e)?.values() ?? [])];
  }
  #t() {
    return [
      ...this.#n()
        .reduce((n, r) => {
          let s = n.get(r.name);
          if (s === void 0) return n.set(r.name, r);
          let h =
            s.passthroughTools === void 0 && r.passthroughTools !== void 0
              ? {
                  ...s,
                  passthroughTools: r.passthroughTools,
                  ...(r.rejectedPassthroughTools !== void 0 && {
                    rejectedPassthroughTools: r.rejectedPassthroughTools,
                  }),
                }
              : s;
          return h === s ? n : n.set(r.name, h);
        }, new Map())
        .values(),
    ].sort((n, r) => n.name.localeCompare(r.name));
  }
  #n() {
    let flattened = Y0.flatMap((n) => [...(this.#e.get(n)?.values() ?? [])]);
    return [
      ...flattened.filter((n) => n.status === "online"),
      ...flattened.filter((n) => n.status !== "online"),
    ];
  }
}
/**
 * 生成工具宿主列表快照：来源、名称、状态和执行策略。
 */
//@ chunk-s61vbvea.js:453085-453549 placement
function snapshotToolHosts(e) {
  return {
    remotes: e.map(
      ({
        source: source,
        name: r,
        status: status,
        enforcement: enforcement,
        description: description,
        servedTools: servedTools,
        passthroughTools: passthroughTools,
        rejectedPassthroughTools: rejectedPassthroughTools,
        protocol: protocol,
        transport: transport,
        takenOverAt: takenOverAt,
        asleep: asleep,
        busy: busy,
        lastHeardAt: lastHeardAt,
      }) => ({
        source: source,
        name: r,
        status: status,
        enforcement: enforcement,
        description: description,
        servedTools: [...servedTools].sort(),
        passthroughTools: [...(passthroughTools?.keys() ?? [])].sort(),
        rejectedPassthroughTools: [...(rejectedPassthroughTools ?? [])].sort(),
        protocol: protocol,
        transport: transport.kind,
        takenOverAt: takenOverAt,
        asleep: asleep,
        busy: busy,
        lastHeardAt: lastHeardAt,
      }),
    ),
  };
}

export { ToolHostRegistry };
