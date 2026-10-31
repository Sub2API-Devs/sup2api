package core

import (
	"context"
	"os"
	"strconv"
	"strings"
	"time"
)

// Environment variables (CONTRACTS §73.3) are the general runtime parameters
// of forwarding that the core declares and an administrator overrides per
// layer: account, then group, then the global setting, then the process
// environment variable. 0 (or an absent key) follows the next layer. Plugins
// read the resolved values and cannot declare their own.

// Environment variable keys.
const (
	EnvRelayTimeoutSeconds          = "relay_timeout_seconds"
	EnvResponseHeaderTimeoutSeconds = "response_header_timeout_seconds"
	EnvStreamingIdleTimeoutSeconds  = "streaming_idle_timeout_seconds"
	EnvMaxRequestBodyMB             = "max_request_body_mb"
	EnvMaxFileDownloadMB            = "max_file_download_mb"
	EnvTaskTimeoutMinutes           = "task_timeout_minutes"
	EnvTaskPollMaxFailures          = "task_poll_max_failures"
)

// EnvironmentLayer is a layer an environment variable can be set on.
type EnvironmentLayer string

const (
	EnvLayerGlobal  EnvironmentLayer = "global"
	EnvLayerGroup   EnvironmentLayer = "group"
	EnvLayerAccount EnvironmentLayer = "account"
)

// EnvironmentVariable declares one variable.
type EnvironmentVariable struct {
	Key  string        `json:"key"`
	Unit string        `json:"unit"` // seconds | minutes | mb | count
	Min  int64         `json:"min"`
	Max  int64         `json:"max"`
	Name LocalizedText `json:"name"`
	Help LocalizedText `json:"help"`
	// Layers it can be set on. A variable used before the account is chosen
	// (the request body limit) has no account layer.
	Layers []EnvironmentLayer `json:"layers"`
	// ProcessEnv is the process environment variable of the last layer.
	ProcessEnv string `json:"process_env"`
}

var allLayers = []EnvironmentLayer{EnvLayerGlobal, EnvLayerGroup, EnvLayerAccount}

// EnvironmentVariables is the declared set, in display order.
var EnvironmentVariables = []EnvironmentVariable{
	{Key: EnvRelayTimeoutSeconds, Unit: "seconds", Min: 1, Max: 86400, Layers: allLayers, ProcessEnv: "SUB2API_RELAY_TIMEOUT_SECONDS",
		Name: LocalizedText{"en": "Upstream timeout", "zh": "上游整体超时"},
		Help: LocalizedText{"en": "Longest time one upstream attempt may take, including reading a streamed response. Unset: no limit.",
			"zh": "一次上游尝试的最长耗时，包含读取流式响应。未设置：不限。"}},
	{Key: EnvResponseHeaderTimeoutSeconds, Unit: "seconds", Min: 1, Max: 86400, Layers: allLayers, ProcessEnv: "SUB2API_RESPONSE_HEADER_TIMEOUT_SECONDS",
		Name: LocalizedText{"en": "Response header timeout", "zh": "响应头超时"},
		Help: LocalizedText{"en": "Longest wait for the upstream response headers. Unset: 180 s for streams, 600 s otherwise.",
			"zh": "等待上游响应头的最长时间。未设置：流式 180 秒，非流式 600 秒。"}},
	{Key: EnvStreamingIdleTimeoutSeconds, Unit: "seconds", Min: 1, Max: 86400, Layers: allLayers, ProcessEnv: "SUB2API_STREAMING_IDLE_TIMEOUT_SECONDS",
		Name: LocalizedText{"en": "Stream idle timeout", "zh": "流式空闲超时"},
		Help: LocalizedText{"en": "Longest gap between two reads of a streamed response. Unset: no limit.",
			"zh": "流式响应两次读到数据之间的最长间隔。未设置：不限。"}},
	{Key: EnvMaxRequestBodyMB, Unit: "mb", Min: 1, Max: 1024, Layers: []EnvironmentLayer{EnvLayerGlobal, EnvLayerGroup}, ProcessEnv: "SUB2API_MAX_REQUEST_BODY_MB",
		Name: LocalizedText{"en": "Request body limit", "zh": "请求体上限"},
		Help: LocalizedText{"en": "Largest client request body. Unset: what the endpoint declares, else 32 MB.",
			"zh": "客户端请求体的上限。未设置：端点声明的值，否则 32 MB。"}},
	{Key: EnvMaxFileDownloadMB, Unit: "mb", Min: 1, Max: 1024, Layers: allLayers, ProcessEnv: "SUB2API_MAX_FILE_DOWNLOAD_MB",
		Name: LocalizedText{"en": "File download limit", "zh": "文件下载上限"},
		Help: LocalizedText{"en": "Largest file (an image URL, for example) a plugin downloads for a request. Unset: the plugin's own limit.",
			"zh": "插件为请求下载文件（例如图片 URL）的上限。未设置：插件自己的上限。"}},
	{Key: EnvTaskTimeoutMinutes, Unit: "minutes", Min: 1, Max: 43200, Layers: allLayers, ProcessEnv: "SUB2API_TASK_TIMEOUT_MINUTES",
		Name: LocalizedText{"en": "Async task timeout", "zh": "异步任务超时"},
		Help: LocalizedText{"en": "How long the core keeps observing an async task (image, video). Unset: the reconcile settings.",
			"zh": "核心观测一个异步任务（画图、视频）的最长时间。未设置：沿用对账设置。"}},
	{Key: EnvTaskPollMaxFailures, Unit: "count", Min: 1, Max: 1000, Layers: allLayers, ProcessEnv: "SUB2API_TASK_POLL_MAX_FAILURES",
		Name: LocalizedText{"en": "Task query failure limit", "zh": "任务查询失败上限"},
		Help: LocalizedText{"en": "Consecutive failed queries after which an async task is given up. Unset: the reconcile settings.",
			"zh": "异步任务连续查询失败多少次后放弃。未设置：沿用对账设置。"}},
}

// EnvironmentVariableByKey finds a declared variable.
func EnvironmentVariableByKey(key string) (EnvironmentVariable, bool) {
	for _, v := range EnvironmentVariables {
		if v.Key == key {
			return v, true
		}
	}
	return EnvironmentVariable{}, false
}

// AllowedOn reports whether the variable can be set on the layer.
func (v EnvironmentVariable) AllowedOn(layer EnvironmentLayer) bool {
	for _, l := range v.Layers {
		if l == layer {
			return true
		}
	}
	return false
}

// EnvironmentValues are the values set on one layer; only set keys are kept.
type EnvironmentValues map[string]int64

// ValidateEnvironmentValues checks the values of one layer and drops the
// zeros (0 follows the next layer). field prefixes the field errors.
func ValidateEnvironmentValues(ctx context.Context, layer EnvironmentLayer, field string, in EnvironmentValues) (EnvironmentValues, []FieldError) {
	zh := Locale(ctx) == "zh"
	out := EnvironmentValues{}
	var fe []FieldError
	for key, value := range in {
		f := field + "." + key
		v, ok := EnvironmentVariableByKey(key)
		switch {
		case !ok:
			fe = append(fe, FieldError{Field: f, Code: "invalid", Message: pick(zh, "unknown environment variable", "未知的环境变量")})
		case !v.AllowedOn(layer):
			fe = append(fe, FieldError{Field: f, Code: "invalid", Message: pick(zh, "cannot be set on this layer", "不能在这一层设置")})
		case value == 0:
		case value < v.Min || value > v.Max:
			fe = append(fe, FieldError{Field: f, Code: "invalid",
				Message: pick(zh, "0 (follow) or "+rangeText(v), "0（跟随）或 "+rangeText(v))})
		default:
			out[key] = value
		}
	}
	return out, fe
}

func pick(zh bool, en, cn string) string {
	if zh {
		return cn
	}
	return en
}

func rangeText(v EnvironmentVariable) string {
	return strconv.FormatInt(v.Min, 10) + "-" + strconv.FormatInt(v.Max, 10)
}

// Environment is the resolved set: every key some layer sets, with the value
// of the nearest layer. A missing key means the component's own default.
type Environment map[string]int64

// ResolveEnvironment merges the layers, nearest first. A value a layer may
// not hold (written before a variable lost that layer) or out of range is
// skipped rather than trusted.
func ResolveEnvironment(global, group, account EnvironmentValues) Environment {
	out := Environment{}
	for _, v := range EnvironmentVariables {
		for _, layer := range []struct {
			l      EnvironmentLayer
			values EnvironmentValues
		}{{EnvLayerAccount, account}, {EnvLayerGroup, group}, {EnvLayerGlobal, global}} {
			if x := layer.values[v.Key]; x >= v.Min && x <= v.Max && v.AllowedOn(layer.l) {
				out[v.Key] = x
				break
			}
		}
		if _, ok := out[v.Key]; !ok {
			if x := processEnvironment[v.Key]; x > 0 {
				out[v.Key] = x
			}
		}
	}
	return out
}

// processEnvironment holds the process environment variables, read once.
var processEnvironment = readProcessEnvironment()

func readProcessEnvironment() map[string]int64 {
	out := map[string]int64{}
	for _, v := range EnvironmentVariables {
		x, err := strconv.ParseInt(strings.TrimSpace(os.Getenv(v.ProcessEnv)), 10, 64)
		if err == nil && x >= v.Min && x <= v.Max {
			out[v.Key] = x
		}
	}
	return out
}

// ProcessEnvironment is the last layer, for display.
func ProcessEnvironment() EnvironmentValues {
	out := EnvironmentValues{}
	for k, v := range processEnvironment {
		out[k] = v
	}
	return out
}

// Duration reads a seconds or minutes variable; 0 when unset.
func (e Environment) Duration(key string) time.Duration {
	v, ok := EnvironmentVariableByKey(key)
	if !ok || e[key] <= 0 {
		return 0
	}
	if v.Unit == "minutes" {
		return time.Duration(e[key]) * time.Minute
	}
	return time.Duration(e[key]) * time.Second
}

// Bytes reads an mb variable; 0 when unset.
func (e Environment) Bytes(key string) int64 { return e[key] << 20 }

// EnvironmentResolver (owner: environment) resolves the environment of a
// group and an account outside a gateway request, e.g. for
// HostService.GetEnvironment. accountID 0 resolves the group alone.
type EnvironmentResolver interface {
	ResolveEnvironment(ctx context.Context, groupID, accountID int64) (Environment, error)
	// GlobalEnvironment is the global layer, cached.
	GlobalEnvironment(ctx context.Context) EnvironmentValues
}
