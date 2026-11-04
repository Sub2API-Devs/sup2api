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
import {
  getEnvironmentSelectionInfo,
  isCcpoolId,
  isSelfHostedPool,
  findFirst,
} from "./environmentSelection.js";

//@ chunk-mdk550gj.js:281-1059 placement
/**
 * 并行拉取云环境列表与自托管池，合并结果并校验当前选中的池是否仍存在、是否忽略了不可信池。
 */
async function fetchEnvironmentsAndPools(storageV5, credentials) {
  let [environmentsResult, poolsResult] = await Promise.allSettled([
    fetchEnvironments(undefined, storageV5, credentials),
    fetchSelfHostedPools(undefined, credentials),
  ]);
  let environmentsError =
    environmentsResult.status === "rejected" ? errorMessage(environmentsResult.reason) : null;
  let environmentsError_2 = environmentsResult.status === "fulfilled" ? environmentsResult.value : [];
  let poolsError = poolsResult.status === "fulfilled" ? poolsResult.value : [];
  let environments = [...environmentsError_2, ...poolsError];
  let selection = getEnvironmentSelectionInfo();
  let ignoredUntrustedPool = selection.ignoredUntrustedPool ?? null;
  if (
    selection.id !== undefined &&
    isCcpoolId(selection.id) &&
    !environments.some((environment) => isSelfHostedPool(environment) === selection.id)
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
      environmentsError,
      ignoredUntrustedPool,
    };
  let selectedTarget =
    findFirst(environmentsError_2, (error) => error.kind !== "bridge") ?? poolsError[0] ?? environments[0];
  let selectedTargetSource = null;
  if (selection.id !== undefined) {
    let found = environments.find((environment) => isSelfHostedPool(environment) === selection.id);
    if (found) {
      selectedTarget = found;
      selectedTargetSource = selection.source ?? null;
    }
  }
  return {
    availableTargets: environments,
    selectedTarget,
    selectedTargetSource,
    environmentsError,
    ignoredUntrustedPool,
  };
}
export { fetchEnvironmentsAndPools };
