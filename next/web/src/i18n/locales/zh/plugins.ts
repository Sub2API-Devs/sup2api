export default {
  colon: '：',
  listSep: '、',
  key: '标识',
  publisher: '发布者',
  activeVersion: '当前版本',
  desiredVersion: '目标版本',
  manifestVersion: 'manifest 版本',

  trust: {
    official: '官方',
    verified: '已验证',
    community: '社区',
    unsigned: '未签名'
  },

  status: {
    awaiting_consent: '待授权',
    installed: '已安装',
    enabling: '启用中',
    enabled: '已启用',
    upgrading: '升级中',
    disabled: '已禁用',
    uninstalled: '已卸载',
    preparing: '准备中',
    activating: '激活中',
    active: '已激活',
    failed: '失败',
    cancelled: '已取消',
    rolled_back: '已回滚',
    pending: '等待中',
    ready: '就绪',
    running: '运行中',
    starting: '启动中',
    stopped: '已停止',
    crashed: '已崩溃',
    unavailable: '不可用',
    ok: '正常',
    success: '成功',
    succeeded: '成功',
    error: '错误',
    timeout: '超时',
    approved: '已批准',
    rejected: '已拒绝',
    granted: '已授权',
    revoked: '已撤销',
    unknown: '未知'
  },

  risk: {
    low: '低',
    medium: '中',
    high: '高',
    critical: '极高'
  },

  signature: {
    valid: '签名有效',
    invalid: '签名无效',
    unsigned: '未签名',
    revoked: '签名已吊销',
    expired: '密钥已过期',
    untrusted: '密钥不受信任',
    unknown: '未知'
  },

  hp: {
    kv: 'KV 存储',
    config: '读取配置',
    log: '日志',
    routes_admin: '管理接口',
    routes_user: '用户接口',
    events: '订阅事件',
    jobs: '后台任务',
    ui_menu: '控制台菜单',
    ui_iframe: '沙箱 iframe 页面',
    accounts_read: '读取账号',
    db_schema: '独立数据库 schema',
    net: '外部网络访问',
    routes_public: '公开接口',
    routes_webhook: 'Webhook 接口',
    gateway_hook: '网关钩子',
    gateway_endpoint: '网关端点',
    platform_register: '注册平台',
    scheduler_affinity: '调度亲和',
    users_read: '读取用户',
    accounts_credentials: '账号凭证',
    ledger_credit: '余额入账',
    ledger_debit: '余额扣款',
    ui_native: '原生界面',
    users_write: '修改用户',
    db_core_views: '核心数据视图'
  },

  hpWarn: {
    ui_native: '插件代码将以你的登录身份在控制台中运行。',
    accounts_credentials: '插件可以读取上游账号的密钥（API Key、Token）。',
    ledger_credit: '插件可以给用户增加余额。',
    ledger_debit: '插件可以扣减用户余额。',
    users_write: '插件可以创建和修改用户。',
    db_core_views: '插件可以通过数据库视图读取核心数据。'
  },

  fields: {
    model: '模型',
    prompt_text: '提示词文本',
    messages: '消息',
    headers: '请求头',
    body: '请求体',
    user_id: '用户 ID',
    group_id: '分组 ID',
    api_key_id: 'API Key ID',
    metadata: '元数据'
  },

  list: {
    title: '插件',
    description: '已安装的插件、版本以及在各节点上的运行状态。',
    plugin: '插件',
    nodes: '节点',
    upload: '上传插件',
    badFile: '请选择 .s2plugin 插件包。',
    uploaded: '{name} v{version} 已上传，请确认授权。',
    searchPlaceholder: '搜索名称、标识或发布者',
    allStatuses: '全部状态',
    empty: '还没有安装插件',
    review: '审查并授权'
  },

  market: {
    title: '插件市场',
    description: '浏览插件索引，安装新插件、检查已安装插件的更新。',
    source: '来源',
    searchPlaceholder: '搜索插件',
    noSources: '还没有配置插件市场来源',
    noMatch: '没有匹配的插件',
    empty: '该来源没有插件',
    installedVersion: '已安装 v{version}',
    installed: '已安装',
    versions: '版本',
    upgrade: '升级',
    install: '安装',
    pickTitle: '安装 {name}',
    pickHint: '选择版本。下载后会校验 sha256 和签名，然后进入授权确认。',
    latest: '最新',
    continue: '下载并审查',
    downloaded: '{name} v{version} 已下载，请确认授权。'
  },

  consent: {
    titleInstall: '安装插件',
    titleUpgrade: '升级插件',
    notFound: '没有找到该版本的审查信息。请重新上传插件包或从插件市场安装。',
    fromCache: '显示的是上传时返回的审查信息。',
    signature: '签名',
    hostCompat: '兼容核心',
    incompatibleTitle: '该插件与当前核心版本不兼容',
    incompatibleBody: '插件要求核心版本 {range}，无法安装。',
    signatureWarnTitle: '签名：{status}',
    signatureWarnBody: '无法用受信任的发布者密钥验证该插件包。只有在确认来源可信时才继续。',
    diffTitle: '本版本的权限变化',
    diffAdded: '新增',
    diffWidened: '扩大',
    diffRemoved: '移除',
    diffNone: '权限没有变化。',
    provides: '插件提供',
    gatewayEndpoints: '网关端点',
    platform: '平台',
    protocols: '协议',
    accountTypes: '账号类型',
    hooks: '网关钩子',
    models: '模型',
    groups: '分组',
    reads: '读取字段',
    maxPrompt: '提示词上限',
    timeout: '超时',
    onFailure: '失败时',
    failOpen: '放行',
    failClosed: '拒绝请求',
    events: '订阅事件',
    jobs: '后台任务',
    routes: '接口',
    menus: '菜单',
    userPermissions: '用户权限',
    grantToRoles: '将新权限授予角色：',
    database: '数据库',
    migrations: '迁移 {n} 个',
    showMigrations: '查看迁移',
    resources: '资源',
    externalServices: '外部服务',
    hostPermissions: '插件申请的核心能力',
    hostPermissionsHint: '低风险自动授予；高风险和极高风险需要逐项勾选。',
    noHostPermissions: '该插件没有申请核心能力。',
    criticalWarn: '极高风险权限：只授予完全信任的插件。',
    needPermission: '需要 {perm} 权限，你没有该权限。',
    auto: '自动',
    missingRequired: '以下权限是插件必需的：{list}。请勾选，或拒绝安装。',
    blockedByPermission: '你无法授予必需的权限：{list}。请联系拥有相应权限的管理员。',
    stillRequired: '还有 {n} 项必需权限未勾选。',
    stepUpHint: '可能需要再次输入密码。',
    approve: '确认并安装',
    approveUpgrade: '确认升级',
    approved: '已批准 {name} v{version} 的授权。',
    reject: '拒绝',
    rejectTitle: '拒绝该版本',
    rejectConfirm: '确定拒绝 {name} v{version}？上传的插件包将被丢弃。',
    rejected: '已拒绝该版本'
  },

  resources: {
    memory: '内存',
    memoryMB: '内存（MB）',
    cpu: 'CPU',
    cores: '{n} 核',
    threads: '最大线程数',
    files: '最大打开文件数',
    item: '资源',
    requested: 'manifest 申请',
    effective: '生效上限',
    overridden: '已调整',
    invalid: '请输入非负数',
    saved: '资源限制已保存，插件进程下次启动时生效。',
    hint: '留空表示使用 manifest 中的申请值；不能超过全局上限。'
  },

  detail: {
    tabs: {
      overview: '概览',
      grants: '授权',
      nodes: '节点',
      hooks: '钩子',
      jobs: '任务',
      events: '事件',
      egress: '外部访问',
      resources: '资源',
      settings: '设置'
    },
    overview: '摘要',
    runtime: '运行情况',
    capabilities: '能力',
    pages: '页面',
    slots: '插槽',
    rawManifest: '查看 manifest JSON',
    nodeCount: '共 {n} 个节点',
    notFound: '没有找到插件 "{key}"',
    viewRollout: '发布进度',
    upgrade: '升级',
    upgradeTitle: '升级 {name}',
    upgradeHint: '当前运行 v{version}。选择一个已授权的版本进行发布。',
    disableTitle: '禁用 {name}',
    disableConfirm: '所有节点上的插件进程将停止，钩子、任务和事件投递暂停。授权、数据和账号都会保留。',
    consentedBanner: 'v{version} 的授权已确认。',
    enableNow: '立即启用',
    upgradeNow: '立即升级到 v{version}',
    pendingConsent: '版本 v{version} 正在等待授权确认。'
  },

  grants: {
    permission: '权限',
    risk: '风险',
    scope: '范围',
    grantedBy: '授权人',
    grantedAt: '授权时间',
    revoke: '撤销',
    revokeTitle: '撤销授权',
    revokeConfirm: '确定撤销"{perm}"？插件需要该权限的调用将被拒绝。',
    revoked: '已撤销授权'
  },

  nodes: {
    node: '节点',
    restarts: '重启次数',
    heartbeat: '心跳'
  },

  hooks: {
    point: '挂载点',
    order: '顺序',
    stats: '统计',
    calls: '调用',
    denied: '拒绝',
    timeouts: '超时',
    breaker: '熔断',
    breakerOpen: '是',
    breakerClosed: '否',
    noStats: '暂无统计'
  },

  jobs: {
    job: '任务',
    schedule: '调度',
    lastRun: '上次运行',
    duration: '耗时',
    message: '信息',
    next: '下次',
    never: '从未运行',
    runNow: '立即执行',
    triggered: '已触发任务 "{id}"'
  },

  events: {
    cursor: '游标',
    backlog: '积压',
    deadletters: '死信',
    subscribed: '订阅的事件',
    noSubscriptions: '该插件没有订阅事件。',
    event: '事件',
    attempts: '尝试次数',
    error: '错误'
  },

  egress: {
    policy: '出口策略',
    policies: {
      allow_all: '全部允许（只记录）',
      allowlist: '白名单（只允许已批准的域名）'
    },
    policyHint: {
      allow_all: '允许所有对外连接，并记录下来。',
      allowlist: '只能访问通过 "net" 权限批准的域名，其他连接会被拒绝。'
    },
    approvedDomains: '已批准的域名：',
    byDomain: '按目标汇总',
    details: '连接明细',
    destination: '目标',
    connections: '连接数',
    traffic: '流量',
    results: '结果',
    result: '结果',
    lastSeen: '最近一次',
    last1h: '最近 1 小时',
    last24h: '最近 24 小时',
    notAllowlisted: '不在白名单',
    noReadPermission: '需要 plugin:egress:read 权限才能查看外部访问记录。'
  },

  uninstall: {
    action: '卸载',
    title: '卸载 {name}',
    body: '卸载会删除插件包、插件注册的权限及其授权、事件游标、任务记录和默认价格。',
    purge: '同时删除插件数据（schema {schema}）和该插件的账号',
    purgeHint: '不勾选时数据会保留，重新安装后可以继续使用。',
    purgeWarn: '插件数据和账号将被永久删除。',
    typeKey: '输入插件标识 "{key}" 以确认',
    confirm: '卸载',
    done: '已卸载 {name}'
  },

  rollout: {
    phase: '阶段',
    actions: {
      enable: '启用',
      upgrade: '升级',
      disable: '禁用'
    },
    steps: {
      migrate: '数据库迁移',
      prepare: '各节点准备',
      activate: '激活'
    },
    stepState: {
      waiting: '等待中',
      running: '进行中…',
      done: '完成',
      failed: '失败',
      skipped: '无需执行',
      cancelled: '已取消'
    },
    waitingAllReady: '等待全部节点就绪',
    noNodes: '还没有节点上报',
    coordinator: '协调者',
    liveVersion: '当前线上版本',
    cancel: '取消发布',
    cancelTitle: '取消发布',
    cancelConfirm: '所有节点将继续使用当前版本。',
    cancelRequested: '已请求取消',
    none: '当前没有进行中的发布',
    backToDetail: '返回插件详情',
    success: {
      enable: '已在所有节点启用 v{version}。',
      upgrade: '已在所有节点升级到 v{version}。',
      disable: '已在所有节点禁用插件。'
    },
    ended: {
      failed: '发布失败，各节点继续运行 v{version}。',
      cancelled: '发布已取消，各节点继续运行 v{version}。',
      rolled_back: '发布已回滚到 v{version}。'
    }
  }
}
