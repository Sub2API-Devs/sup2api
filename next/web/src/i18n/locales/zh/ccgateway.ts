export default {
 runtime: {"switchHint": "切换代理会重启该账号的出口进程，正在使用旧连接的请求可能中断；其他账号不受影响。", "enable": "启用一账号一容器及外部代理", "setup": "启用前需安装远程账号控制器，监听 127.0.0.1:8787，管理密钥填写控制器密钥。原共享容器不会自动迁移。"},
  title: 'CCGateway 管理', description: '管理本地或 SSH 远程网关、出站代理与 Claude 授权。', readOnly: '当前权限仅允许查看配置。', failed: '操作失败，请检查连接配置后重试。',
  auth: { models: '模型列表', modelsHint: '已按插件预设填入，可增删；输入模型名称后按回车添加，清空表示允许所有模型。', mapping: '模型映射', mappingHint: '请求模型 → 上游模型；计费、分组白名单仍按请求模型。', title: 'Claude 授权与账号接入', hint: '通过 Claude Code 提供 Messages API，每个容器使用独立授权。', healthy: '服务在线', offline: '服务不可用', loggedIn: '已授权', loggedOut: '未授权', unknown: '状态未知', start: '获取授权链接', logout: '退出授权', confirmLogout: '退出授权后，关联账号将无法继续调用模型。确定退出？', open: '打开 Claude 授权页面', expires: '授权链接过期时间：{time}', code: '完整授权码（code#state）', complete: '完成授权', expired: '授权会话已过期，请取消后重新获取。', name: '账号名称', connect: '接入账号调度', connected: '已创建账号 #{id}', accounts: '前往账号管理', connectHint: '创建 CCGateway 托管账号，凭证由核心管理。可在此选择分组；未绑定分组的账号不参与调度。', pending: '授权回调已完成，请刷新状态确认。' },
  accountAuth: {
    title: 'Claude 授权', saveAndAuthorize: '保存并开始授权',
    steps: { save: '保存账号', container: '启动账号容器', login: '打开链接登录 Claude', code: '粘贴授权码', done: '完成' },
    saveHint: "填写名称、分组和代理后点击下方'保存并开始授权'：保存后会立刻为该账号启动独立容器，就绪后自动获取 Claude 授权链接。",
    saved: '已保存（账号 #{id}）',
    containerStarting: '正在启动账号容器…', containerPreparing: '容器 {name} 准备中，每 2 秒检查一次…', containerReady: '容器 {name} 已就绪', containerError: '容器状态异常（{status}），可重新同步后重试。',
    syncFailed: '启动账号容器失败', statusFailed: '无法读取账号容器状态', healthFailed: '容器已启动，但无法读取 Claude 登录状态',
    setup: { runtimes: "CCGateway 未启用'一账号一容器'", docker: 'CCGateway 的 Docker 连接（本地或 SSH）未配置', adminKey: '未填写容器管理密钥（CCG_ADMIN_KEY）' },
    openSettings: '前往 CCGateway 设置', retry: '重试', resync: '重新同步', reason: '原因：{message}',
    getLink: '获取授权链接', gettingLink: '正在获取授权链接…', openLink: '打开 Claude 授权页', startFailed: '获取授权链接失败', badSession: '服务返回的授权链接不可信或已过期',
    linkHint: '在新页面登录 Claude 并点击同意，页面会显示一串授权码，完整复制后粘贴到下一步。', expiresIn: '链接 {time} 后过期', expired: '授权链接已过期，请重新获取。',
    codeLabel: '完整授权码（code#state）', codePlaceholder: '粘贴形如 xxxx#yyyy 的授权码', codeShape: '授权码通常包含 #（code#state），请确认已完整复制。', submit: '完成授权',
    completeFailed: '提交授权码失败，请确认授权码完整且链接未过期', notConfirmed: '授权码已提交，但容器尚未确认登录；请稍后重试或重新获取链接。', regetLink: '重新获取链接', cancel: '取消本次授权',
    authorized: '已授权', loggedOut: '未授权', authorizedToast: 'Claude 授权完成', authorizedHint: '账号容器已登录 Claude，账号可以参与调度。', reauthorize: '重新授权', finish: '完成并关闭',
    readOnly: '需要编辑该账号的权限（或 settings:manage）才能启动容器和授权，请联系管理员。', noRead: '没有查看该账号容器状态的权限。',
    blocked: {
      no_proxy: { title: '账号容器已停止：未绑定代理', fix: 'Claude Code 账号必须通过代理出网（容器没有直连出口）。请在上方「代理」选择或粘贴一个代理并保存，容器会自动重新启动。' },
      proxy_disabled: { title: '账号容器已停止：绑定的代理已停用', fix: '请在上方「代理」换一个可用的代理并保存，或到代理页重新启用该代理，然后重新同步。' },
      account_disabled: { title: '账号容器已停止：账号已停用', fix: '账号处于停用状态时不运行容器。请先在账号列表重置或启用该账号，再回来授权。' },
      unknown: { title: '账号容器已被核心停止', fix: '请检查账号状态与代理设置后重新同步。' },
      pickProxy: '去选择代理', openProxies: '打开代理页'
    },
    proxyRequired: 'Claude Code 账号必须绑定代理', proxyRequiredHint: 'Claude Code 账号的容器只能经代理出网，没有直连兜底；未绑定代理的账号容器会被停止。'
  },
  runtimes: {
    title: '账号容器', hint: '每个 Claude Code 账号一个容器。授权在账号页完成：新建账号时会自动启动容器并引导登录；这里只显示状态。',
    account: '账号', container: '容器', auth: 'Claude 授权', typeOAuth: 'OAuth（容器内登录）', typeApiKey: 'API Key',
    state: { ready: '已就绪', preparing: '准备中', error: '异常', unavailable: '不可用', unknown: '未知' },
    checking: '检查中', authorized: '已授权', notAuthorized: '未授权', noAuthNeeded: '无需授权',
    goAuthorize: '去账号页授权', goEdit: '在账号页查看', openAccounts: '新建 / 管理账号', empty: '还没有 Claude Code 账号，请在账号页新建。', loadFailed: '账号列表加载失败'
  },

    proxy: {
      title: 'CCGateway 出站代理', description: '控制 Claude CLI 的出站连接，仅支持 HTTP / HTTPS 代理；官方 CLI 不支持 SOCKS。', effect: '保存后新请求使用新配置，进行中的请求继续使用旧代理，无需重启容器。代理地址必须可从远程容器访问。',
      mode: '代理模式', inherit: '继承容器环境代理', direct: '直接连接', proxy: '指定代理', url: '代理 URL', keep: '已保存，留空保持原代理', support: '可输入含认证信息的 HTTP / HTTPS URL；保存后不回显凭证。', current: '已保存代理：', clear: '保存此模式会清除已保存的自定义代理 URL。', revision: '配置版本 {revision}',
      save: '保存出站代理', saved: '出站代理配置已保存，新请求生效。', reload: '重新加载代理配置', required: '首次指定代理时，请填写代理 URL。', invalid: '请输入有效的 HTTP 或 HTTPS 代理 URL。', failed: '代理操作失败，请检查连接及配置后重试。', show: '显示', hide: '隐藏'
    },
    remote: {
      unconfigured: '未配置',
      admin_key: '容器管理密钥（CCG_ADMIN_KEY）', api_key: '容器模型密钥（CCG_API_KEY）', keysHint: '填写与目标容器一致的密钥，只写不回显；留空保留已有值。',
      title: 'CCGateway Docker 连接', authorization: '内建 · 网关授权', description: '管理已部署的 CCGateway 容器，可选择本机或通过 SSH 连接远程 Docker。不会自动安装 Docker 或部署镜像。',
      routingHint: 'SSH 模式通过加密隧道访问远端 127.0.0.1:8787，支持授权管理与模型请求，无需公开 Docker 或网关 API 端口。本地模式仍使用 CCGATEWAY_URL。下方保存的 CCG_API_KEY、CCG_ADMIN_KEY 必须与目标容器一致。',
      mode: '连接方式', local: '本地 Docker', ssh: '远程 SSH', host: 'SSH 主机', port: 'SSH 端口', user: 'SSH 用户', authMode: 'SSH 认证方式', password: 'SSH 密码', privateKey: 'SSH 私钥', passphrase: '私钥口令（可选）',
      fingerprint: '主机密钥指纹', probe: '探测主机指纹', verifyFingerprint: '请通过可信渠道核对以下指纹。探测结果不会自动保存，确认后再使用。', useFingerprint: '使用此指纹',
      keepSecret: '已保存，留空保持不变', secretsHint: '密码、私钥和口令不会回显；留空保留已保存的值。请勿在此填写 Claude 授权码或模型 API Key。', newCredentials: '连接目标或 SSH 用户变化后，必须重新输入对应密码或私钥。',
      required: '请填写有效的 SSH 主机、端口、用户和主机指纹。', targetRequired: '请先填写 SSH 主机与有效端口。',
      save: '保存连接配置', saved: '连接配置已保存。', reload: '重新加载配置', test: '测试已保存连接', saveFirst: '请先保存配置，再测试连接或管理容器。', savedOnly: '以下操作仅使用已保存的 SSH 配置；本地模式不提供远程操作。',
      actions: { status: '容器状态', start: '启动容器', stop: '停止容器', restart: '重启容器', logs: '查看日志' },
      confirmAction: '确定执行“{action}”？这可能中断该容器正在处理的请求。', confirm: '确认执行', cancel: '取消', failed: '操作失败，请重试。'
    },
}
