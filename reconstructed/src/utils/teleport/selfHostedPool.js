/**
 * utils/teleport/selfHostedPool.ts
 *
 * 2.1.316 新增：自托管池
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-mdk550gj.js (1)
 * attribution: placement 1
 */
import { fetchEnvironments } from "./environments.js";
import { fetchSelfHostedPools } from "./selfHostedPools.js";
import { errorMessage } from "../errors.js";
import { getEnvironmentSelectionInfo, isCcpoolId, isSelfHostedPool, tPe } from "./environmentSelection.js";

/**
 * 并行拉取云环境列表与自托管池，合并结果并校验当前选中的池是否仍存在、是否忽略了不可信池。
 */
//@ chunk-mdk550gj.js:281-1059 placement
async function fetchEnvironmentsAndPools(f, r) {
  let [o, l] = await Promise.allSettled([fetchEnvironments(void 0, f, r), fetchSelfHostedPools(void 0, r)]),
    s = o.status === "rejected" ? errorMessage(o.reason) : null,
    i = o.status === "fulfilled" ? o.value : [],
    a = l.status === "fulfilled" ? l.value : [],
    environments = [...i, ...a],
    selection = getEnvironmentSelectionInfo(),
    u = selection.ignoredUntrustedPool ?? null;
  if (
    selection.id !== void 0 &&
    isCcpoolId(selection.id) &&
    !environments.some((n) => isSelfHostedPool(n) === selection.id)
  )
    environments.push({
      kind: "self_hosted_pool",
      pool_id: selection.id,
      name: selection.id,
      created_at: "",
      alive_runner_count: 0,
    });
  if (environments.length === 0)
    return {
      availableTargets: [],
      selectedTarget: null,
      selectedTargetSource: null,
      environmentsError: s,
      ignoredUntrustedPool: u,
    };
  let c = tPe(i, (n) => n.kind !== "bridge") ?? a[0] ?? environments[0],
    g = null;
  if (selection.id !== void 0) {
    let found = environments.find((m) => isSelfHostedPool(m) === selection.id);
    if (found) ((c = found), (g = selection.source ?? null));
  }
  return {
    availableTargets: environments,
    selectedTarget: c,
    selectedTargetSource: g,
    environmentsError: s,
    ignoredUntrustedPool: u,
  };
}

export { fetchEnvironmentsAndPools };
