# 生产 UI runner 独立只读复核

2026-10-09。审查 `evidence/cache-ttl-production-ui.mjs` 和对应 PLAN，并核对真实前端session/auth/router/usage selectors及服务端过滤字段。没有执行登录、浏览器或生产网络，没有修改作者runner。

已确认：stdin有界JSON；token不写argv/env/文件/报告，浏览器使用临时context；只同源loopback GET，阻断auth/refresh非GET和外域；preflight固定三个GET、禁止redirect；401在preflight与页面路径均停止；真实/me的permissions/superuser字段与应用契约一致。session的expires_at为毫秒，空refresh token配合路由阻断不会主动续期。主要usage/feature selectors与当前源码匹配。`node --check`独立通过，仅语法证据。

已发root两项整改建议（待作者修复后复核）：

1. `client_request_id`是客户端提供且数据库查询仅按值相等，不能保证唯一。当前列表和summary只追加该过滤，截图可能包含另一个相同client RID行。预flight已读取唯一usage_log_id对应详情，建议保存其实际request_id于内存，并同时用服务端已支持的`request_id`与`client_request_id`约束两个请求，不改response。不得将相同client RID视为其他行的授权证据。
2. `AppTopbar.vue`通过真实`/me/balance`展示平台余额；当前mask只覆盖名称/email/password，1440px截图会留下余额。建议专门遮罩余额RouterLink，不改DOM值或页面响应。此项为隐私截图边界，不涉及token泄露。

APIRequestContext的preflight不会经过BrowserContext.route，但其代码只调用固定同源路径、maxRedirects=0且独立检查401，因此没有把这部分误称由route保护。报告不包含rawerror/headers/body，selector执行结果仍须发布后真实验证，不能以此次静态检查声称生产可视验收。

## 整改复核

作者修改后再次只读审查：预检同时检查usage_log_id/client RID，实际request_id仅RAM保存；列表与摘要同时追加两ID过滤，真实列表要求data长度1、page.total1、三字段对应，DOM行唯一才点击。已核`httpapi.List`真实响应是该分页形状。余额遮罩`header a[href="/me/usage?tab=ledger"]`与AppTopbar实际RouterLink一致；实际request ID也加入截图遮罩。两项整改关闭，独立`node --check`再次通过。未启动浏览器/登录/网络，生产视觉仍待正式执行和图片人工核验。

布局修复后的增强runner也已离线复核：真实usage详情最近scrollport左右界及内部section/dt/dd检查，桌面横滚左/右各在下一帧测量；feature保存栏初始/滚底与前兄弟边界检查。截图先按原隐私规则保存、数字bounds入报告后才判失败，异常最终exit1；输出目录按已验证expectedCoreVersion区分，下一`.78`不覆盖`.77`证据。独立node语法检查通过，未执行生产浏览器或认证。本阶段未发现新增阻断。
