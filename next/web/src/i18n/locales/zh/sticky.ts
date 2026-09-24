export default {
  title: '粘性会话',
  description: '让同一会话的连续请求尽量落到同一个账号，提高上游缓存命中率。',
  newRule: '新增规则',
  any: '任意',
  seconds: '秒',
  ttlValue: '{n} 秒',
  ttlDefault: '默认',
  copyAsAdmin: '复制为管理员规则',
  flush: '清空绑定',
  flushConfirm: '清空规则"{name}"的所有绑定？之后的请求会重新调度。',
  flushed: '绑定已清空',
  flushedN: '已清空 {n} 条绑定',
  statsLine: '命中 {hits} · 未命中 {misses} · 改绑 {rebinds}',
  source: {
    admin: '管理员',
    plugin_default: '插件默认'
  },
  cols: {
    priority: '优先级',
    match: '匹配',
    binding: '绑定',
    stats: '命中率',
    keySources: '会话 key',
    ttl: 'TTL',
    keyIncludes: 'key 包含',
    onFailure: '失败策略'
  },
  keyTypes: {
    body: '请求体字段',
    header: '请求头',
    api_key: 'API Key',
    user: '用户',
    plugin: '插件'
  },
  keyTypeHint: {
    api_key: '发起请求的 API Key',
    user: 'API Key 所属用户'
  },
  includes: {
    group: '分组',
    model: '模型',
    rule: '规则'
  },
  onFailure: {
    failover: '切换',
    stick: '保持'
  },
  onFailureHint: {
    failover: '绑定的账号失败时照常切换账号，成功后改绑。',
    stick: '不切换，直接返回错误（保护上游缓存）。'
  },
  settings: {
    title: '全局设置',
    enabled: '粘性会话',
    enabledHint: '所有规则的总开关',
    defaultTtl: '默认 TTL',
    defaultTtlHint: '规则未设置 TTL 时使用',
    ttlInvalid: '请输入正整数秒数',
    keepOnDisabled: '账号禁用时保留绑定',
    keepOnDisabledHint: '默认在账号被禁用时删除其绑定'
  },
  modal: {
    createTitle: '新增粘性规则',
    editTitle: '编辑规则 · {name}',
    copyTitle: '复制为管理员规则',
    limitedHint: '插件 {plugin} 提供的默认规则：只能修改启用状态、优先级和 TTL；如需修改其他内容，请复制为管理员规则。',
    priorityHint: '数值越大越先匹配',
    match: '匹配条件',
    protocols: '协议',
    models: '模型',
    modelsHint: '支持通配符；为空表示任意',
    ua: 'User-Agent 包含',
    emptyAny: '为空表示任意',
    keySources: '会话 key 来源',
    keySourcesHint: '按顺序取第一个非空值。',
    needsPlaceholder: '插件需要的输入（body、headers…）',
    valueRegex: '值正则',
    valueRegexHint: '可选；取第一个捕获组（或整个匹配）作为值',
    ttlHint: '0 表示使用默认 TTL',
    keyIncludesHint: '会话 key 还包含哪些维度',
    needSource: '至少添加一个 key 来源',
    needPath: '请填写请求体字段路径',
    needHeader: '请填写请求头名称',
    badRegex: '正则表达式无效',
    badTtl: '请输入不小于 0 的整数秒数'
  }
}
