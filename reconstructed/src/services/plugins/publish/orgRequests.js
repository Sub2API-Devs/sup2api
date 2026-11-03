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

/**
 * /api/oauth/organizations/<org>/<编码后的子路径>。
 */
//@ chunk-9cjx5pnm.js:14069-14117 placement
var organizationSubPath = (e, r) => `${organizationApiPath(e)}/${r.map(encodePathSegment).join("/")}`;
/**
 * 构建组织级 GET 请求描述。
 */
//@ chunk-9cjx5pnm.js:14117-14213 placement
var buildOrgGetRequest = (e, r) => ({
  method: "get",
  path: organizationSubPath(e, r),
  body: void 0,
  headers: {},
  bound: "clock",
  signal: e.signal,
});

export { buildOrgGetRequest, organizationSubPath };
