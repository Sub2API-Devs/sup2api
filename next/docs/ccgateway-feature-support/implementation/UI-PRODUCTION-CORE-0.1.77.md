# Core .77 生产只读 UI 核验

真实生产页面，经本机 SSH loopback 45477 → OVH 127.0.0.1:3130；非 mock、非本地组件替代。根代理唯一模型 probe 之后，按精确 client RID `cache-ttl-77-039d57ff045f4f73` / server RID `f566aacd7141ac2b38c11592` / usage id 744 限定访问。没有额外推理、profile、quota 或配置写入。

执行句柄79296，使用已独审 `evidence/cache-ttl-production-ui.mjs`。正常平台管理登录令牌只经 SSH stdout 被父进程内存捕获，再由匿名 stdin pipe 传 Node；没有写凭据文件、环境变量、命令参数或工具输出。Edge 使用非 persistent context，真实 `/me`、`/system/version`、精确 `/usage/744` 均200，确认实际版本0.1.77和权限；列表同时精确过滤两个 RID，实际唯一一条。禁止非 GET、跨域和无关秘密/日志路径；四个超出只读范围的页面请求被阻断。没有401或续期。

结果：runner exit0 / completed=true / pageErrors=0。1440及390宽度各有 Usage 与 Features 截图，真实余额与身份文本已遮罩。finally关闭浏览器context/browser及SSH隧道，令牌不保留。

证据位于 `evidence/cache-ttl-ui-production/`：`usage-1440.png`、`usage-390.png`、`features-1440.png`、`features-390.png`、`render-result.json`。已实际查看四张图。

Usage 展示输入218、输出409、读取2752；缓存写入观测总2595、已报告5m=0、1h=1376、TTL未细分1219，并明确 TTL 细分不完整。计费另外标注“默认计费桶”1219及“1小时计费桶”1376，说明未细分不据此认定5m、原费用保持不变。页面显示已结算，不把TTL未知误报请求失败。

## 视觉限制

不能仅据 body.scrollWidth==viewport 宣称无裁切：1440详情仍在宽表格内部，右侧请求卡片部分内容在右缘被表格裁切；390移动详情可完整阅读。Features窄版tab横向容纳，底部固定保存区遮住部分末尾内容。本轮没有点击保存或修改布局，已向根代理报告供后续窄修判断。这里证明新证据组件生产可见且事实准确，不声称整个管理界面视觉无缺陷。

## Owner 用量投影单独验证

随后经正常平台管理登录在服务器进程内存取得会话，精确 GET `/me` 与 `/usage/744` 均200，先确认当前 token 用户与记录 user_id 同 owner，再 GET `/me/usage/744`，实际200且记录ID/owner匹配。没有创建用户、铸造别人的会话或修改权限；token未输出/落盘。

Admin 与 owner 的 metrics 精确相同：version1/json、total2595、reported5m0、reported1h1376、unclassified1219、partial、platform_default_cache_write_compat。Owner响应没有非空 plugin_detail 或 anomalies。本例这些字段本就无敏感内容，因此只证明该真实记录的 owner 路由与新 metrics 保真，不用 `/me` 身份200替代此验证，也不把单个空字段案例当任意非空内部字段过滤的完整安全测试。后者仍由既有隔离测试承担。
