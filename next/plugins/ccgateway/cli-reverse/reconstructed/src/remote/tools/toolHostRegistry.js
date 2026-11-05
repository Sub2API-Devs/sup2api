/**
 * remote/tools/toolHostRegistry.ts
 *
 * 工具宿主登记（2.1.316 新增）
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * new in 2.1.318 (2.1.88 has no file at this path)
 * pieces: chunk-7jxyna5q.js (3)
 * attribution: placement 3
 * (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.
 */
import { isDeepStrictEqual } from "util";
import {
  currentMachineLabel,
  isReservedMachineNameExact,
  machineNameMatches,
  isValidMachineSlug,
} from "../../bridge/deviceRegistration.js";
import { logForDebugging } from "../../utils/debug.js";

//@ chunk-7jxyna5q.js:370143-370220 placement
var HOST_SOURCE_ORDER = ["session", "bridge", "loopback"];
var OFFLINE_WHEN_MISSING = {
  session: false,
  bridge: true,
  loopback: true,
};
//@ chunk-7jxyna5q.js:370220-371754 placement
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
  resolve(name) {
    if (isReservedMachineNameExact(name))
      return {
        kind: "local",
        host: this.defaultHost,
      };
    let remotes = this.#t();
    let found = remotes.find((host) => host.name === name);
    if (found)
      return {
        kind: "remote",
        host: found,
      };
    let [firstMatch, secondMatch] = remotes.filter((remote) => machineNameMatches(name, remote.name));
    return firstMatch !== undefined && secondMatch === undefined
      ? {
          kind: "remote",
          host: firstMatch,
        }
      : {
          kind: "unknown",
        };
  }
  replaceRemoteHosts(source, hosts) {
    if (hosts.find((host) => host.source !== source))
      throw Error("replaceRemoteHosts was handed a ToolHost registered by another source");
    let beforeSnapshot = snapshotToolHosts(this.#t());
    let previous = this.#e.get(source) ?? new Map();
    let next = new Map();
    let dropped = hosts.flatMap((host) => {
      if (!isValidMachineSlug(host.name) || next.has(host.name)) return [host.name];
      next.set(host.name, host);
      return [];
    });
    let offlineRows =
      next.size > 0 || !OFFLINE_WHEN_MISSING[source]
        ? []
        : [...previous.values()].map((host) => [
            host.name,
            {
              ...host,
              status: "offline",
            },
          ]);
    let registry = new Map(this.#e);
    registry.set(source, new Map([...offlineRows, ...next]));
    this.#e = registry;
    let afterSnapshot = snapshotToolHosts(this.#t());
    return {
      changed: !isDeepStrictEqual(beforeSnapshot, afterSnapshot),
      dropped,
    };
  }
  passthroughHost(toolName) {
    return this.#n().find((host) => host.passthroughTools?.has(toolName) === true);
  }
  sourceHosts(source) {
    return [...(this.#e.get(source)?.values() ?? [])];
  }
  #t() {
    return [
      ...this.#n()
        .reduce((acc, host) => {
          let existing = acc.get(host.name);
          if (existing === undefined) return acc.set(host.name, host);
          let merged =
            existing.passthroughTools === undefined && host.passthroughTools !== undefined
              ? {
                  ...existing,
                  passthroughTools: host.passthroughTools,
                  ...(host.rejectedPassthroughTools !== undefined && {
                    rejectedPassthroughTools: host.rejectedPassthroughTools,
                  }),
                }
              : existing;
          return merged === existing ? acc : acc.set(host.name, merged);
        }, new Map())
        .values(),
    ].sort((left, right) => left.name.localeCompare(right.name));
  }
  #n() {
    let flattened = HOST_SOURCE_ORDER.flatMap((source) => [...(this.#e.get(source)?.values() ?? [])]);
    return [
      ...flattened.filter((host) => host.status === "online"),
      ...flattened.filter((host) => host.status !== "online"),
    ];
  }
}
//@ chunk-7jxyna5q.js:371754-372218 placement
/**
 * 生成工具宿主列表快照：来源、名称、状态和执行策略。
 */
function snapshotToolHosts(hosts) {
  return {
    remotes: hosts.map(
      ({
        source,
        name,
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
        name,
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
