/**
 * services/plugins/publish/orgRequests.ts
 *
 * 2.1.316 新增。插件发布的组织级请求路径构造。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-9cjx5pnm.js (2)
 * attribution: placement 2
 */
import { organizationApiPath } from "../../api/overageCreditGrant.js";
import { encodePathSegment } from "../../api/apiPath.js";

//@ chunk-9cjx5pnm.js:14069-14117 placement
/**
 * /api/oauth/organizations/<org>/<编码后的子路径>。
 */
var organizationSubPath = (e, r) => `${organizationApiPath(e)}/${r.map(encodePathSegment).join("/")}`;
//@ chunk-9cjx5pnm.js:14117-14213 placement
/**
 * 构建组织级 GET 请求描述。
 */
var buildOrgGetRequest = (e, r) => ({
  method: "get",
  path: organizationSubPath(e, r),
  body: undefined,
  headers: {},
  bound: "clock",
  signal: e.signal,
});
export { buildOrgGetRequest, organizationSubPath };
