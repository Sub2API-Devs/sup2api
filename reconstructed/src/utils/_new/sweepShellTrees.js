/**
 * utils/_new/sweepShellTrees.ts
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-e6aww6q8.js (3)
 * attribution: sole-consumer-new 3
 */
import { readProcessInfo, listProcessInfos, aHe, ico, eAt, pco } from "../shell/processCpuTime.js";
import { isSignalablePid } from "../genericProcessUtils.js";
import { killIfUnchanged } from "../auth/lockHolderLiveness.js";

//@ chunk-e6aww6q8.js:250002-250080 sole-consumer-new
function nAt(e, n) {
  let r = readProcessInfo(e);
  return r !== void 0 && !r.exited && r.startToken === n;
}
/**
 * 从进程列表中收集以给定 pid 或进程组为根的进程树（广度优先，跳过 pid≤1 与自身）。
 */
//@ chunk-e6aww6q8.js:250080-250438 sole-consumer-new
function collectProcessTree(e, n) {
  let r = new Map(),
    s = [];
  for (let S of e) {
    if (S.ppid !== void 0) {
      let w = r.get(S.ppid);
      if (w) w.push(S);
      else r.set(S.ppid, [S]);
    }
    if (n.has(S.pid) || (S.pgrp !== void 0 && n.has(S.pgrp))) s.push(S);
  }
  let h = new Set(),
    y = [];
  while (s.length > 0) {
    let S = s.shift();
    if (S.pid <= 1 || S.pid === process.pid || h.has(S.pid)) continue;
    (h.add(S.pid), y.push(S), s.push(...(r.get(S.pid) ?? [])));
  }
  return y;
}
/**
 * 退出时清理 shell 进程树：根据进程列表找出各 shell 的进程组与后代（以启动令牌识别），先发 SIGTERM，在宽限期内轮询等待退出，再对仍存活且启动令牌未变的进程发 SIGKILL；返回树数量、等待时间与超出宽限仍存活的数量。
 */
//@ chunk-e6aww6q8.js:250438-252316 sole-consumer-new
function sweepShellTrees(shells, graceMs) {
  let startedAt = Date.now(),
    processList = listProcessInfos(),
    processByPid = new Map(processList?.map((Me) => [Me.pid, Me])),
    ownedPgids = new Set(),
    unlistedShells = [];
  for (let Me of shells) {
    if (!isSignalablePid(Me.pid)) continue;
    let We = processByPid.get(Me.pid);
    if (processList === void 0) unlistedShells.push(Me);
    else if (We === void 0 || (Me.running && We.ppid === process.pid)) ownedPgids.add(Me.pid);
  }
  let groupMembers = new Map(),
    alive = new Map(),
    loneTargets = new Map();
  for (let Me of processList ? collectProcessTree(processList, ownedPgids) : []) {
    if (Me.startToken === void 0) continue;
    let We = Me.pgrp !== void 0 && ownedPgids.has(Me.pgrp) ? Me.pgrp : void 0;
    if (We !== void 0) {
      let ze = groupMembers.get(We) ?? new Map();
      groupMembers.set(We, ze.set(Me.pid, Me.startToken));
    }
    if (Me.exited) continue;
    if ((alive.set(Me.pid, Me.startToken), We === void 0)) loneTargets.set(Me.pid, Me.startToken);
  }
  let askedPids = new Set();
  for (let Me of shells) {
    if (Me.askedAt !== void 0) askedPids.add(Me.pid);
    for (let [We, ze] of Me.descendants ?? []) {
      if (Me.askedAt !== void 0) askedPids.add(We);
      if (processList !== void 0 && isSignalablePid(We) && !alive.has(We) && nAt(We, ze))
        (alive.set(We, ze), loneTargets.set(We, ze));
    }
  }
  let treeCount = ownedPgids.size + unlistedShells.length;
  if (treeCount === 0 && alive.size === 0) return { trees: treeCount, waitedMs: 0, outlivedGrace: void 0 };
  let signalAll = (Me) => {
    let We = (ze) => Me === "SIGTERM" && askedPids.has(ze);
    for (let [ze, lt] of groupMembers)
      if ([...lt].some(([nt, pt]) => readProcessInfo(nt)?.startToken === pt) && !We(ze)) aHe(-ze, Me);
    for (let ze of unlistedShells) if (!We(ze.pid) && !aHe(-ze.pid, Me) && ze.running) aHe(ze.pid, Me);
    killIfUnchanged(new Map([...loneTargets].filter(([ze]) => !We(ze))), Me);
  };
  signalAll("SIGTERM");
  let deadlineFor = (Me, We) => Math.max(0, ...Me.map((ze) => (ze.askedAt ?? startedAt) + We)),
    minDeadline = deadlineFor(unlistedShells, Math.min(graceMs, ico)),
    maxDeadline = Math.max(
      minDeadline,
      deadlineFor(
        shells.filter((Me) => !unlistedShells.includes(Me)),
        graceMs,
      ),
    ),
    waitStart = performance.now(),
    waitMs = Math.min(graceMs, maxDeadline - startedAt);
  for (
    let Me = waitMs / eAt;
    Me > 0 && performance.now() - waitStart < waitMs && Date.now() < maxDeadline;
    Me--
  ) {
    for (let [We, ze] of alive) if (!nAt(We, ze)) alive.delete(We);
    if (alive.size === 0 && Date.now() >= minDeadline) break;
    pco(Math.min(eAt, Math.max(1, maxDeadline - Date.now())));
  }
  if (alive.size > 0) {
    let Me = listProcessInfos() ?? [],
      filtered = Me.filter((ze) => ze.startToken !== void 0 && alive.get(ze.pid) === ze.startToken);
    for (let ze of collectProcessTree(Me, new Set(filtered.map((lt) => lt.pid))))
      if (!ze.exited && ze.startToken !== void 0 && !alive.has(ze.pid))
        loneTargets.set(ze.pid, ze.startToken);
  }
  return (
    signalAll("SIGKILL"),
    {
      trees: treeCount,
      waitedMs: Date.now() - startedAt,
      outlivedGrace: unlistedShells.length > 0 ? void 0 : alive.size,
    }
  );
}

export { sweepShellTrees };
