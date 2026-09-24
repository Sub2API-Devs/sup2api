export default {
  title: '模型价格',
  description: '按平台和模型配置计费表达式；管理员价格优先于插件默认价格。',
  new: '新增价格',
  newTitle: '新增价格',
  editTitle: '编辑价格 · {name}',
  editTitleShort: '编辑价格',
  pluginDefaultReadonly: '由插件 {plugin} 提供的默认价格，只读；点击"覆盖"复制为管理员价格后再修改。',
  source: {
    admin: '管理员',
    plugin_default: '插件默认'
  },
  override: '覆盖',
  overridden: '已复制为管理员价格',
  overrideNote: '"覆盖"会复制插件默认价格为一条管理员价格；插件升级不会改动管理员价格。',
  basic: '基本信息',
  platformHint: '"*" 表示所有平台',
  modelPattern: '模型',
  modelPatternHint: '精确名称或通配符，如 claude-sonnet-*',
  modeCol: '方式',
  summaryCol: '摘要',
  searchPlaceholder: '模型、备注、插件…',
  exprHash: '表达式 hash',
  viewHistory: '查看表达式',
  billingMode: '计费方式',
  expression: '表达式',
  view: {
    visual: '可视化',
    source: '源码'
  },
  mode: {
    per_request: '按次',
    per_token: '按 token',
    expression: '表达式'
  },
  modeHint: {
    per_request: '每次调用固定价格（图片、搜索等），单位美元。',
    per_token: '输入、输出、缓存读、缓存写的每百万 token 价格（美元）。',
    expression: '按上下文长度分档、按请求头 / 参数 / 时段加价，或直接编写表达式。'
  },
  perRequestPrice: '每次价格（USD）',
  perMillion: '每百万 token 价格（USD）',
  vars: {
    p: '输入',
    c: '输出',
    cr: '缓存读',
    cc: '缓存写 5 分钟',
    cc1h: '缓存写 1 小时',
    flat: '固定费'
  },
  unsetPlaceholder: '按输入计',
  cacheUnsetHint: '缓存价格留空表示这部分 token 按输入价格计费；填 0 表示免费。',
  notVisual: '该表达式无法用可视化方式表示，只能在源码模式编辑。',
  sourceHint: '加价规则用三个竖线追加，形如 条件 ? 1.5 : 1',
  generated: '生成的表达式（只读）',
  serverGenerated: '服务端生成的表达式',
  validate: {
    title: '校验',
    ok: '编译通过，冒烟测试通过',
    pending: '等待输入…',
    fixErrors: '请先修正校验错误',
    warnTitle: '确认高额费用',
    warnConfirm: '服务端提示：{list}。仍然保存？',
    costPerMillion: '100 万输入 token 的费用：{cost}'
  },
  trial: {
    title: '价格试算',
    len: 'len（上下文长度）',
    headers: '请求头',
    params: '请求参数',
    paramsHint: '值能按 JSON 解析时按 JSON 发送（1.5、true、"x"），否则作为字符串。',
    at: '时间',
    group: '分组（倍率）',
    calculate: '试算',
    fixFirst: '请先修正价格定义。',
    cost: '费用',
    tier: '档位',
    rules: '加价规则',
    breakdown: '明细',
    empty: '输入用量后试算。'
  },
  items: {
    p: '输入',
    c: '输出',
    cr: '缓存读',
    cc: '缓存写 5 分钟',
    cc1h: '缓存写 1 小时',
    flat: '固定费',
    other: '其他',
    subtotal: '小计',
    rules: '加价',
    groupRate: '分组倍率'
  },
  summary: {
    perRequest: '{price} / 次',
    perToken: '输入 {p} · 输出 {c} · 缓存读 {cr} /百万',
    visual: '{tiers} 档 · {rules} 条加价规则',
    custom: '自定义表达式'
  },
  local: {
    noTier: '至少需要一个档位',
    tierName: '第 {n} 个档位缺少名称',
    tierDup: '档位名称重复："{name}"',
    tierMax: '档位"{name}"需要填写上下文长度上限',
    ruleField: '第 {n} 条加价规则不完整',
    emptyExpr: '表达式为空'
  },
  history: {
    title: '表达式历史',
    notFound: '该 hash 下没有保存的表达式。'
  },
  visual: {
    tiers: '分档（按 len = 完整上下文长度）',
    tiersHint: '按上限从小到大依次判断，最后一档为"其余"。',
    addTier: '分档',
    tierName: '档位',
    condLen: '条件 len ≤',
    otherwise: '其余',
    always: '始终',
    rules: '加价规则',
    rulesHint: '每条命中的规则都会乘以倍数。',
    addRule: '规则',
    noRules: '没有加价规则。',
    when: '当',
    kind: {
      header: '请求头',
      param: '请求参数',
      time: '时段'
    },
    op: {
      contains: '包含',
      eq: '等于'
    },
    headerName: '请求头名称',
    paramPath: '参数路径',
    value: '值',
    tz: '时区',
    hour: '{h} 点',
    multiplier: '倍数'
  }
}
