export default {
  title: '系统设置',
  description: '全局的计费、网关与调度设置。',
  tabs: {
    billing: '计费',
    gateway: '网关',
    sticky: '粘性会话',
    offload: 'CPU 保护'
  },
  offload: {
    title: 'CPU 保护',
    subtitle: '节点 CPU 过高时，把新请求转给其他空闲节点。只在网关托管的多节点集群中可用。',
    enabled: '启用',
    enabledHint: '关闭时每个节点只处理自己入口的请求。',
    threshold: 'CPU 阈值',
    thresholdHint: '节点最近 10 秒的平均 CPU 达到该值后开始转移，降到阈值减 10 以下时停止。只转给低于阈值减 10、版本相同的正常节点；没有这样的节点就留在本节点处理。已在处理的请求不受影响。',
    range: '范围 {min}–{max}。',
    unmanaged: '当前节点不是由网关托管的，没有 CPU 保护。多节点部署请使用网关托管。',
    node: '节点',
    cpu: 'CPU',
    state: '状态',
    states: {
      serving: '本地处理',
      offloading: '正在转移',
      forwarding: '转发到主节点',
      unavailable: '未就绪',
      disabled: '已禁用'
    }
  },
  gateway: {
    title: '网关',
    subtitle: '网关请求的失败切换与超时。修改后各节点对新请求生效。',
    fields: {
      max_attempts: '最大尝试次数',
      platform_call_timeout_ms: '平台调用超时',
      default_hook_timeout_ms: '钩子默认超时',
      platform_hotpath_timeout_ms: '平台热路径超时'
    },
    hints: {
      max_attempts: '每个请求最多尝试的账号数（含首次，用于失败切换）。',
      platform_call_timeout_ms: '请求路径上调用插件平台接口（构造上游请求、解析用量）的超时。',
      default_hook_timeout_ms: 'manifest 未设置超时的钩子使用此值。',
      platform_hotpath_timeout_ms: '每个请求中不属于钩子的平台调用超时：调度前解析模型、响应发完后提取用量。'
    },
    range: '范围 {min}–{max}。',
    notInteger: '请输入整数'
  },
  autoDisable: {
    title: '自动禁用',
    subtitle: '上游报错说明账号本身不可用（凭证失效、额度耗尽、组织被封）时自动禁用账号，参考 new-api。插件的判定之外，可按状态码和错误关键词追加规则。',
    enabled: '启用自动禁用',
    enabledHint: '关闭后任何账号都不会被自动禁用，只冷却 60 秒。单个账号可在账号编辑器中关闭。',
    statusCodes: '禁用状态码',
    statusCodesHint: '上游返回这些状态码时禁用账号。逗号分隔，可写区间，如 401,403,500-503；留空表示不按状态码禁用。',
    keywords: '禁用关键词',
    keywordsHint: '上游错误内容包含任一关键词（不区分大小写）时禁用账号。每行一个，最多 100 个。',
    restoreKeywords: '恢复默认关键词'
  },
  billing: {
    preConsumeTokens: '请求预扣 Token 数',
    preConsumeHint: '文本请求预占的输入 Token 下限，默认 500；本地估算超过此值时使用估算值。0 表示不设下限，最终仍按实际用量结算。视频使用插件自己的用量估算。',
    preConsumeInvalid: '请输入 0 到 100000000 之间的整数',
    title: '计费',
    missingPolicy: '模型没有配置价格时',
    policy: {
      reject: '拒绝请求',
      free: '免费放行'
    },
    policyHint: {
      reject: '返回 403 model_price_not_configured。推荐：没有价格的模型不对外提供。',
      free: '照常转发，使用记录的结算状态为"免费"。'
    },
    minBalance: '最低余额',
    minBalanceHint: '余额不高于该值时，请求返回 402 余额不足（默认 0）。',
    bigCost: '高额费用警告阈值',
    bigCostHint: '保存价格时，若 100 万输入 token 的费用超过该值，需要二次确认。',
    decimalInvalid: '请输入数字，最多 8 位小数'
  }
}
