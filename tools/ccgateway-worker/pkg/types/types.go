package types

import (
	"encoding/json"
)

// Request 代表一个 /v1/messages 请求
type Request struct {
	Model         string          `json:"model" binding:"required"`
	MaxTokens     int             `json:"max_tokens" binding:"required"`
	Messages      []Message       `json:"messages" binding:"required,min=1"`
	System        json.RawMessage `json:"system,omitempty"`
	Temperature   *float64        `json:"temperature,omitempty"`
	TopP          *float64        `json:"top_p,omitempty"`
	TopK          *int            `json:"top_k,omitempty"`
	StopSequences []string        `json:"stop_sequences,omitempty"`
	Stream        *bool           `json:"stream,omitempty"`

	// 自定义头部（从 HTTP headers 提取）
	SessionID     string `json:"-"`
	RequestPolicy string `json:"-"`
	NativeTools   string `json:"-"`
}

// Message 代表一条消息
type Message struct {
	Role    string          `json:"role" binding:"required,oneof=user assistant system"`
	Content json.RawMessage `json:"content" binding:"required"`
}

// Response 代表流式响应
type Response struct {
	StatusCode int
	Body       <-chan Event
	Err        <-chan error
}

// Event 代表一个 SSE 事件
type Event struct {
	Type string          `json:"type"`
	Data json.RawMessage `json:"data"`
}

// Session 代表一个会话状态
type Session struct {
	ID           string // 客户端历史指纹
	NativeID     string // Claude CLI 原生会话 ID
	SnapshotPath string // 快照文件路径（JSONL history.jsonl）
	Anchor       string // 恢复锚点（最后一个 assistant 消息的 UUID）
	Fork         bool   // 是否需要 fork 会话
	Mode         string // 模式：prefix-hit | fork | rebuild | new
}

// HealthStatus 健康状态
type HealthStatus struct {
	Status     string `json:"status"`
	WorkerID   string `json:"worker_id"`
	CLIVersion string `json:"cli_version"`
	Uptime     int64  `json:"uptime"`
}
