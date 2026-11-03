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
import { isDeepStrictEqual } from "util";
import {
  currentMachineLabel,
  isReservedMachineNameExact,
  machineNameMatches,
  isValidMachineSlug,
} from "../../bridge/deviceRegistration.js";
import { logForDebugging } from "../../utils/debug.js";

//@ chunk-s61vbvea.js:451474-451551 placement
var HOST_SOURCE_ORDER = ["session", "bridge", "loopback"];
var OFFLINE_WHEN_MISSING = {
  session: false,
  bridge: true,
  loopback: true,
};
//@ chunk-s61vbvea.js:451551-453085 placement
/**
 * 工具宿主登记：local/host/remote 等来源
 */
class ToolHostRegistry {
  #e = new Map();
  get defaultHost() {
    return {
      kind: "local",
      name: currentMachineLabel(),
      enforcement: "host",
    };
  }
  hosts() {
    return [this.defaultHost, ...this.#t()];
  }
  resolve(e) {
    if (isReservedMachineNameExact(e))
      return {
        kind: "local",
        host: this.defaultHost,
      };
    let n = this.#t();
    let found = n.find((y) => y.name === e);
    if (found)
      return {
        kind: "remote",
        host: found,
      };
    let [s, h] = n.filter((y) => machineNameMatches(e, y.name));
    return s !== undefined && h === undefined
      ? {
          kind: "remote",
          host: s,
        }
      : {
          kind: "unknown",
        };
  }
  replaceRemoteHosts(e, n) {
    if (n.find((P) => P.source !== e))
      throw Error("replaceRemoteHosts was handed a ToolHost registered by another source");
    let s = snapshotToolHosts(this.#t());
    let h = this.#e.get(e) ?? new Map();
    let y = new Map();
    let dropped = n.flatMap((P) => {
      if (!isValidMachineSlug(P.name) || y.has(P.name)) return [P.name];
      y.set(P.name, P);
      return [];
    });
    let w =
      y.size > 0 || !OFFLINE_WHEN_MISSING[e]
        ? []
        : [...h.values()].map((P) => [
            P.name,
            {
              ...P,
              status: "offline",
            },
          ]);
    let R = new Map(this.#e);
    R.set(e, new Map([...w, ...y]));
    this.#e = R;
    let x = snapshotToolHosts(this.#t());
    return {
      changed: !isDeepStrictEqual(s, x),
      dropped,
    };
  }
  passthroughHost(e) {
    return this.#n().find((n) => n.passthroughTools?.has(e) === true);
  }
  sourceHosts(e) {
    return [...(this.#e.get(e)?.values() ?? [])];
  }
  #t() {
    return [
      ...this.#n()
        .reduce((acc, r) => {
          let s = acc.get(r.name);
          if (s === undefined) return acc.set(r.name, r);
          let h =
            s.passthroughTools === undefined && r.passthroughTools !== undefined
              ? {
                  ...s,
                  passthroughTools: r.passthroughTools,
                  ...(r.rejectedPassthroughTools !== undefined && {
                    rejectedPassthroughTools: r.rejectedPassthroughTools,
                  }),
                }
              : s;
          return h === s ? acc : acc.set(r.name, h);
        }, new Map())
        .values(),
    ].sort((n, r) => n.name.localeCompare(r.name));
  }
  #n() {
    let flattened = HOST_SOURCE_ORDER.flatMap((n) => [...(this.#e.get(n)?.values() ?? [])]);
    return [
      ...flattened.filter((n) => n.status === "online"),
      ...flattened.filter((n) => n.status !== "online"),
    ];
  }
}
//@ chunk-s61vbvea.js:453085-453549 placement
/**
 * 生成工具宿主列表快照：来源、名称、状态和执行策略。
 */
function snapshotToolHosts(e) {
  return {
    remotes: e.map(
      ({
        source,
        name: r,
        status,
        enforcement,
        description,
        servedTools,
        passthroughTools,
        rejectedPassthroughTools,
        protocol,
        transport,
        takenOverAt,
        asleep,
        busy,
        lastHeardAt,
      }) => ({
        source,
        name: r,
        status,
        enforcement,
        description,
        servedTools: [...servedTools].sort(),
        passthroughTools: [...(passthroughTools?.keys() ?? [])].sort(),
        rejectedPassthroughTools: [...(rejectedPassthroughTools ?? [])].sort(),
        protocol,
        transport: transport.kind,
        takenOverAt,
        asleep,
        busy,
        lastHeardAt,
      }),
    ),
  };
}
export { ToolHostRegistry };
