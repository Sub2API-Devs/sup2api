export default {
  title: '系统设置',
  description: '全局的计费、网关与调度设置。',
  tabs: {
    billing: '计费',
    gateway: '网关',
    sticky: '粘性会话'
  },
  gateway: {
    title: '网关',
    subtitle: '网关请求的失败切换与超时。修改后各节点对新请求生效。',
    fields: {
      max_attempts: '最大尝试次数',
      platform_call_timeout_ms: '平台调用超时',
      default_hook_timeout_ms: '钩子默认超时'
    },
    hints: {
      max_attempts: '每个请求最多尝试的账号数（含首次，用于失败切换）。',
      platform_call_timeout_ms: '请求路径上调用插件平台接口（构造上游请求、解析用量）的超时。',
      default_hook_timeout_ms: 'manifest 未设置超时的钩子使用此值。'
    },
    range: '范围 {min}–{max}。',
    notInteger: '请输入整数'
  },
  billing: {
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
