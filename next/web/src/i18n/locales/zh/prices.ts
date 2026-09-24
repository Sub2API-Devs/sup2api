export default {
  title: '模型价格',
  description: '按模型配置计费表达式。价格由管理员维护：手动填写，或从同步源导入。',
  scopeNote: '价格按模型全局设置，与由哪个端点、哪种账号类型提供服务无关。表达式算出的是基础价格，实际扣费 = 基础价格 × 分组倍率。',
  new: '新增价格',
  newTitle: '新增价格',
  editTitle: '编辑价格 · {name}',
  editTitleShort: '编辑价格',
  source: {
    manual: '手动',
    sync: '同步'
  },
  sourceSync: '同步 · {name}',
  fromSource: '同步源：{name}',
  clearSourceFilter: '清除同步源筛选',
  syncPrices: '同步价格',
  viewSources: '同步源',
  syncedNotice: '从 {source} 同步于 {time}；修改价格后会变成手动价格，之后同步不会再自动覆盖（除非在同步预览中勾选）。',
  syncedNoticeDeleted: '已删除的同步源',
  basic: '基本信息',
  model: '模型',
  modelHint: '完整的模型 ID，如 claude-sonnet-4-5（不支持通配符；别名和带日期的 ID 需分别定价）',
  modelInvalid: '请填写完整的模型 ID：只能包含字母、数字和 . _ : / @ + -，不能有通配符或空格',
  modeCol: '方式',
  summaryCol: '摘要',
  searchPlaceholder: '模型、备注…',
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
  unsetPlaceholder: '不收费',
  cacheUnsetHint: '缓存价格留空表示这部分 token 不收费。',
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
  },
  def: {
    perRequest: '{price} / 次',
    perMillion: '/百万',
    otherwise: '其余',
    rules: '另有 {n} 条加价规则'
  },
  sources: {
    title: '价格同步源',
    description: '从公开价格库或上游 sup2api 实例导入价格。同步由管理员手动触发：先预览差异，勾选要导入的模型，再应用。',
    back: '返回价格列表',
    create: '新建同步源',
    editTitle: '编辑同步源 · {name}',
    kindCol: '类型',
    url: '地址',
    lastSynced: '上次同步',
    lastError: '错误',
    priceCount: '价格数',
    never: '从未',
    preview: '预览同步',
    empty: '还没有同步源。',
    kind: {
      litellm: 'LiteLLM',
      models_dev: 'models.dev',
      sup2api: '上游 sup2api'
    },
    kindHint: {
      litellm: 'LiteLLM 维护的公开价格表（model_prices_and_context_window.json），覆盖主流厂商的模型。',
      models_dev: 'models.dev 公开的模型与价格库，按厂商整理。',
      sup2api: '上游 sup2api 实例：用上游发给我们的 API Key 读取上游价格。'
    },
    urlHint: {
      litellm: '选择类型时已填入默认地址，一般无需修改。',
      models_dev: '选择类型时已填入默认地址，一般无需修改。',
      sup2api: '上游地址，如 https://up.example.com'
    },
    urlInvalid: '请填写以 http:// 或 https:// 开头的地址',
    apiKey: 'API Key',
    apiKeyHint: '上游发给我们的 Key（sk-s2a-...）',
    apiKeyRequired: '上游 sup2api 类型必须填写 API Key',
    apiKeyStored: '已保存（不显示）',
    apiKeyKeep: '已保存 Key，留空表示不修改。',
    apiKeyClear: '清除已保存的 Key',
    hasKey: '已配置 Key',
    providers: '厂商',
    providersHint: {
      litellm: 'LiteLLM 的 litellm_provider 值，如 anthropic、openai、gemini；只导入这些厂商的模型。按回车添加。',
      models_dev: 'models.dev 的厂商 id，如 anthropic、openai、google；只导入这些厂商的模型。按回车添加。'
    },
    providersPlaceholder: '输入厂商后回车',
    applyMultiplier: '按上游分组倍率导入',
    applyMultiplierHint: '导入时把价格乘以上游 Key 所在分组的倍率，也就是按我们实际付给上游的价格导入。',
    multiplierOn: '按分组倍率',
    multiplierOff: '按基础价格',
    deleteConfirm: '删除同步源"{name}"？已从它导入的 {n} 条价格会保留，但不再关联这个同步源。',
    viewPrices: '查看这些价格'
  },
  sync: {
    title: '同步预览 · {name}',
    fetching: '正在从 {name} 拉取价格并对比…',
    fetchFailed: '拉取失败',
    retry: '重试',
    refetch: '重新拉取',
    fetchedAt: '拉取于 {time}，共 {total} 个模型',
    stats: {
      create: '新增',
      update: '更新',
      manual: '手动价格不同',
      unchanged: '未变化',
      skipped: '跳过'
    },
    skippedHint: '同步源里无法转换成价格的条目（例如没有 token 价格）',
    tabs: {
      pending: '有差异',
      create: '新增',
      update: '更新',
      manual: '手动价格不同',
      unchanged: '未变化'
    },
    action: {
      create: '新增',
      update: '更新',
      manual: '手动价格不同',
      unchanged: '未变化'
    },
    searchPlaceholder: '搜索模型…',
    selectAll: '全选（{n}）',
    selectNone: '全不选',
    selectScope: '只作用于当前筛选结果',
    selected: '已选 {n} 个模型',
    selectedManual: '其中 {n} 个会覆盖手动价格',
    incoming: '新价格',
    current: '当前价格',
    noCurrent: '本地没有',
    manualWarn: '会覆盖手动价格',
    unchangedHint: '价格相同，无需导入',
    currentSync: '同步',
    currentManual: '手动',
    currentDisabled: '已停用',
    empty: '没有符合条件的模型。',
    apply: '应用所选（{n}）',
    applyConfirmTitle: '确认导入',
    applyConfirm: '导入 {n} 个模型的价格？',
    applyConfirmManual: '导入 {n} 个模型的价格？其中 {m} 个手动价格会被覆盖成同步价格。',
    resultTitle: '同步结果',
    result: {
      created: '新增',
      updated: '更新',
      unchanged: '未变化',
      skipped: '跳过'
    },
    skippedList: '跳过的模型',
    reason: '原因',
    viewPrices: '查看价格'
  }
}
