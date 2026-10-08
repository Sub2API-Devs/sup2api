# 真实生产 UI 只读验收方案与 stdin 接口

2026-10-09。最初准备阶段未读取凭据或启动生产动作；随后API作者在root放行后已用旧版runner对真实Core.77完成四张只GET截图，暴露宽表详情内部裁切和保存栏覆盖。当前增强版runner尚未访问生产，等待布局修复候选Core.78部署后复用既有授权usage744验收，不增加模型请求。管理登录与Claude CLI/OAuth授权状态无关，不操作后者。.76曾因构建工具链漂移被阻断。

## 会话与路由核验

- `next/web/packages/host/src/http.ts:97–136`：真实应用从 localStorage 的 `s2a.session` 读取 `{access_token, refresh_token, expires_at}`，expires_at 是 epoch 毫秒，HTTP API 使用 Bearer token。不是Cookie session。
- `next/web/src/stores/auth.ts:43` 与 `router/index.ts:81–91`：路由恢复仍真实 GET `/api/v1/me`，由服务端返回的 superuser/permissions 决定权限。注入已有真实令牌不替换或mock权限。
- `host/http.ts:291,339`：refresh_token 为空则不会周期续期，401也不会成功续期。运行器另外阻断全部非GET，并在任何401时关闭上下文。
- 平台API前缀 `/api/v1`（`packages/host/src/routes.ts:19`）。目标页面 `/usage`（usage:all:read）与 `/plugins/ccgateway?tab=settings`（plugin:read + settings:read）；旧 `/system/ccgateway` 是redirect。
- 用量页尚不从URL读取client RID过滤；加载即请求列表与摘要。client RID不保证唯一，运行器先通过授权 usage:id 的真实GET验证id/client RID并在RAM保存原request_id；列表和摘要同时加 `client_request_id` 与 `request_id`（核心 `usage/api.go:191–192` 支持两者）。随后用真实UI输入client RID。**只收窄请求范围，不伪造或改写响应**。首次列表及UI过滤后的列表必须HTTP200、data恰有一行、page.total=1，且id/request_id/client RID都匹配授权记录，否则停止；DOM对应行也必须唯一，不用first绕过多行。详情仅允许约定 usage_log_id。真实request_id不输出、不持久化。
- 现有 `upgrade_observe.py:68–72` 正常平台登录后仅在进程变量里保留access token，代码没有可复用的持久session文件。已退出进程的令牌不应通过dump/日志恢复；API作者可在本次 .77 正常 preflight 登录的同一受控流程提供有效令牌。

## 运行器接口

脚本：`implementation/evidence/cache-ttl-production-ui.mjs`。只从stdin接受一份JSON；不要放在命令行、环境变量、临时文件、聊天消息或工具输出。

字段：

- `base`：SSH本地转发的真实生产origin，例如 `http://127.0.0.1:5196/`。仅接受loopback；不能把管理令牌发到公网明文HTTP。
- `access_token`：正常平台登录返回的原令牌。
- `expires_at`：登录时刻＋真实expires_in转为epoch毫秒；至少剩余两分钟。
- `usage_client_request_id`：本轮已授权公网验收的精确RID。
- `usage_log_id`：该RID对应的真实用量记录id。
- `expected_core_version`：待发布 `0.1.78`（运行器动态校验输入，不硬编码旧版本）。

API作者接口约定：登录成功的同一个受控流程将上面对象仅写到专用stdout管道，所有非凭据诊断写stderr；本地将SSH stdout直接接Node stdin，不能让stdout独立经过工具显示。SSH传输加密；令牌仅在发送进程、管道与临时浏览器上下文内存中存在。若现有登录流程的stdout混有日志，需要专门受控的输出分支，不能让Node解析混合流，也不能先把令牌导出文件再读取。

启动结构（占位符不是实际生产命令；仅root放行后由API作者填写可信SSH alias/真实受控入口）：

```text
ssh -T <existing-host-alias> <controlled-normal-login-session-emitter> |
  node next/docs/ccgateway-feature-support/implementation/evidence/cache-ttl-production-ui.mjs
```

SSH本地端口转发由已有连接流程建立并维持，例如将loopback5196映射到OVH loopback3130。不要复制本地业务源码到服务器构建；本脚本只是本地浏览器验收工具，真实版本仍走服务器Git构建。

## 安全与真实性边界

使用独立非persistent Edge context，不打开用户profile；localStorage只存在该临时上下文，不导出storageState，不启用trace/HAR、不收集控制台文本、响应body或headers。会话填原access token、空refresh、真实expiry；真实/me仍验证。preflight真实GET检查权限、部署版本和精确记录RID。任一步不符即停止，不fallback成mockauth。

浏览器仅准同源GET，阻断跨域、POST/PUT/PATCH/DELETE及auth、credential、key、logs/diagnostics页面。只点击用量展开和CCGateway“通用API特性”tab，不点击保存/测试/操作/授权按钮。401立即关闭上下文；到期不刷新、不新建账号、不重置密码、不从数据库mint。

计划产物为真实全应用1440px/390px下usage展开与features各一张截图；不改DOM内容或响应，只测尺寸并记录pageerror计数。截图启用遮罩：真实/me及目标usage返回的email/display_name/user_name/account_name/api_key_name/group_name只在RAM收集用于文字定位遮罩，不输出这些值；password输入也遮罩。AppTopbar.vue:60–68 的实际余额RouterLink使用 `header a[href="/me/usage?tab=ledger"]` 直接遮罩，不读取或保留余额值。遮罩仅用于隐私，不遮住计量事实区。截图发布前仍须人工检查；不得截图密钥页或凭据输入。失败报告只记录阶段/固定原因，不记录原始异常堆栈或网络对象。

增强版输出到 `implementation/evidence/cache-ttl-ui-production-<expected_core_version>/`，避免覆盖原Core.77的 `cache-ttl-ui-production/` 缺陷证据。桌面用量分别记录横滚left/right状态，并要求实际usage-detail及其section/dt/dd边界留在nearest STable scrollport内；features记录initial/full-page和滚底viewport，要求保存栏top不小于前一内容bottom。body宽度只作补充，不再代替内部检查。布局失败保留已遮罩截图与数字bounds并exit1，不把失败写成完成。

没有实际运行时，不创建或声称有新版本生产截图。运行器finally关闭context/browser并丢弃token引用。生产截图还需实际查看，不能仅依赖脚本exit0；输出包括版本、隐私遮罩标志和尺寸，不保存原始响应或私人标识。

## 本次已执行验证

`node --check next/docs/ccgateway-feature-support/implementation/evidence/cache-ttl-production-ui.mjs`：PASS。仅语法检查，不含浏览器或网络执行。脚本的实际生产路径尚未验证；selectors、权限及新版本页面加载必须在放行后实测，不能将准备完成称为生产验收成功。
