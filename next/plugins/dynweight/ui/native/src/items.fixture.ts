// The plugin's factory rules and strategies, verbatim (byte for byte) from
// internal/rules/config.go defaultRules / defaultStrategies: the items tests
// write them back and compare the bytes. Update this file with the backend's
// defaults.
export const DEFAULT_RULES_JSON =
  '[{"name":"错误率过高","conditions":[{"metric":"error_rate","op":"gte","value":30}],"periods":3,"hit_periods":2}' +
  ',{"name":"首字 p95 过慢","conditions":[{"metric":"ttfb","p":95,"op":"gte","value":10000}],"periods":3,"hit_periods":2}' +
  ',{"name":"首字挂死","conditions":[{"metric":"ttfb","p":100,"op":"gte","value":60000},{"join":"or","metric":"latency","p":100,"op":"gte","value":120000,"scope":"non_stream"}],"periods":1,"hit_periods":1}' +
  ',{"name":"健康恢复","conditions":[{"metric":"error_rate","op":"lt","value":15},{"join":"and","metric":"ttfb","p":95,"op":"lt","value":10000,"when_empty":"pass"},{"join":"and","metric":"ttfb","p":100,"op":"lt","value":60000,"when_empty":"pass"},{"join":"and","metric":"latency","p":100,"op":"lt","value":120000,"scope":"non_stream","when_empty":"pass"}],"periods":1,"hit_periods":1}' +
  ',{"name":"复活探测","conditions":[{"metric":"weight","op":"lte","value":0}],"periods":2,"hit_periods":2}]'

export const DEFAULT_STRATEGIES_JSON =
  '[{"name":"错误率过高","when":"错误率过高","actions":[{"type":"weight_degrade","mode":"current_percent","value":30},{"type":"affinity_clear","percent":30}]}' +
  ',{"name":"首字 p95 过慢","when":"首字 p95 过慢","actions":[{"type":"weight_degrade","mode":"current_percent","value":30},{"type":"affinity_clear","percent":30}]}' +
  ',{"name":"首字挂死","when":"首字挂死","actions":[{"type":"weight_degrade","mode":"current_percent","value":50},{"type":"affinity_clear","percent":30}]}' +
  ',{"name":"自动回升","when":"健康恢复","actions":[{"type":"weight_climb","mode":"base_percent","value":10}]}' +
  ',{"name":"复活探测","when":"复活探测","actions":[{"type":"weight_climb","mode":"base_percent","value":10}]}]'
