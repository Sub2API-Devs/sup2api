# CCGateway 实施指南

**文档版本：** 1.0  
**最后更新：** 2026-10-07  
**技术负责人：** [待分配]  
**适用对象：** 后端工程师、运维工程师

---

## 目录

1. [前置准备](#1-前置准备)
2. [Worker 改造](#2-worker-改造)
3. [插件开发](#3-插件开发)
4. [核心集成](#4-核心集成)
5. [配置管理](#5-配置管理)
6. [测试指南](#6-测试指南)
7. [部署指南](#7-部署指南)
8. [代码审查清单](#8-代码审查清单)
9. [常见问题](#9-常见问题)
10. [故障排查](#10-故障排查)

---

## 1. 前置准备

### 1.1 环境要求

**开发环境：**
- Go 1.27+
- Node 24+ (前端相关)
- Docker 24+
- PostgreSQL 16+ (测试)
- Redis/Valkey 9+ (测试)

**工具链：**
```bash
# 安装 Go 工具
go install google.golang.org/protobuf/cmd/protoc-gen-go@latest
go install google.golang.org/grpc/cmd/protoc-gen-go-grpc@latest
go install github.com/bufbuild/buf/cmd/buf@latest

# 验证安装
go version
docker --version
buf --version
```

### 1.2 代码获取

```bash
# 克隆代码
cd /path/to/sup2api
git checkout -b feat/ccgateway-migration

# 初始化工作区
cd next
go work sync
```

### 1.3 理解现有代码

**必读文件：**
1. `next/docs/CONTRACTS.md` - 系统契约
2. `next/docs/ARCHITECTURE.md` - 架构文档
3. `next/docs/ccgateway-migration/09-ISSUES-AND-DECISIONS.md` - 架构决策
4. `next/docs/ccgateway-migration/11-CODE-CLEANUP.md` - 代码规范

**现有 CCGateway 代码：**
- `tools/ccgateway/` - 当前 Worker 实现
- `next/plugins/ccgateway/` - 当前插件实现（已存在）

**参考插件：**
- `next/plugins/anthropic/` - Anthropic 插件
- `next/plugins/openai/` - OpenAI 插件

### 1.4 本地测试环境

```bash
# 启动测试数据库
cd next/deploy/testdb
docker compose up -d

# 验证连接
psql "postgresql://postgres:password@localhost:5432/sub2api_test"

# 启动 Redis
docker run -d --name redis-test -p 36379:6379 valkey/valkey:9

# 验证
redis-cli -p 36379 ping
```

---

## 2. Worker 改造

### 2.1 目标架构

**改造前（当前）：**
```
tools/ccgateway/
├── main.go              # HTTP gateway + runner
├── runner.go            # Claude CLI 封装
├── history.go           # 历史文件管理
├── inline_system.go     # System 消息处理
├── auth.go              # 授权管理
└── mod/
    └── hooks/
        └── register.js  # Mod 钩子（文件通信）
```

**改造后（目标）：**
```
tools/ccgateway/worker/
├── main.go                    # HTTP 服务入口
├── server/
│   ├── server.go              # HTTP 服务器
│   ├── handler.go             # 请求处理器
│   └── middleware.go          # 中间件（日志、认证）
├── runner/
│   ├── runner.go              # Claude CLI 执行器
│   ├── protocol.go            # stream-json 协议
│   └── environment.go         # 环境变量注入
├── history/
│   ├── store.go               # 历史存储接口
│   ├── filestore.go           # 文件系统实现
│   └── recovery.go            # 会话恢复
├── protocol/
│   ├── messages.go            # Anthropic Messages 协议
│   └── inline_system.go       # System 内联处理
├── mod/
│   ├── bridge.go              # Mod HTTP 回调服务
│   └── hooks/
│       └── register.js        # Mod 钩子（HTTP 回调）
├── auth/
│   └── auth.go                # 授权管理
└── Dockerfile                 # Worker 镜像
```

### 2.2 步骤 1: 重组目录结构

**任务：** 将现有代码按模块重新组织

```bash
# 创建新目录结构
cd tools/ccgateway
mkdir -p worker/{server,runner,history,protocol,mod/hooks,auth}

# 移动文件（保留旧文件作为参考）
# 不要直接 mv，而是复制后修改
cp main.go worker/main.go
cp runner.go worker/runner/runner.go
cp history.go worker/history/filestore.go
cp inline_system.go worker/protocol/inline_system.go
cp auth.go worker/auth/auth.go
cp mod/hooks/register.js worker/mod/hooks/register.js
```

**注意事项：**
- 保留原文件，新代码写在 `worker/` 下
- 旧代码在迁移完成后才归档
- 每个模块独立 package

### 2.3 步骤 2: HTTP 服务器框架

**文件：** `worker/server/server.go`

```go
package server

import (
	"context"
	"fmt"
	"net/http"
	"time"

	"tools/ccgateway/worker/runner"
)

// Server is the HTTP server for the Worker.
type Server struct {
	addr    string
	runner  *runner.Runner
	authKey string
	slots   chan struct{} // Concurrency control
	server  *http.Server
}

// Config holds server configuration.
type Config struct {
	Addr        string        // Listen address, e.g., ":8788"
	AuthKey     string        // X-API-Key for authentication
	Concurrency int           // Max concurrent requests
	Timeout     time.Duration // Request timeout
	Runner      *runner.Runner
}

// New creates a new Worker HTTP server.
func New(cfg Config) *Server {
	s := &Server{
		addr:    cfg.Addr,
		runner:  cfg.Runner,
		authKey: cfg.AuthKey,
		slots:   make(chan struct{}, cfg.Concurrency),
	}
	
	mux := http.NewServeMux()
	mux.HandleFunc("/v1/messages", s.handleMessages)
	mux.HandleFunc("/healthz", s.handleHealth)
	mux.HandleFunc("/mod-callback/ready", s.handleModReady)
	mux.HandleFunc("/mod-callback/get-system", s.handleModGetSystem)
	
	s.server = &http.Server{
		Addr:         cfg.Addr,
		Handler:      s.withMiddleware(mux),
		ReadTimeout:  30 * time.Second,
		WriteTimeout: cfg.Timeout,
	}
	
	return s
}

// Start starts the HTTP server.
func (s *Server) Start() error {
	fmt.Printf("Worker listening on %s\n", s.addr)
	return s.server.ListenAndServe()
}

// Shutdown gracefully shuts down the server.
func (s *Server) Shutdown(ctx context.Context) error {
	return s.server.Shutdown(ctx)
}

// withMiddleware wraps the handler with logging and auth.
func (s *Server) withMiddleware(h http.Handler) http.Handler {
	return LoggingMiddleware(AuthMiddleware(h, s.authKey))
}
```

**文件：** `worker/server/middleware.go`

```go
package server

import (
	"crypto/subtle"
	"log"
	"net/http"
	"strings"
	"time"
)

// LoggingMiddleware logs HTTP requests.
func LoggingMiddleware(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		start := time.Now()
		log.Printf("[%s] %s %s", r.Method, r.URL.Path, r.RemoteAddr)
		next.ServeHTTP(w, r)
		log.Printf("[%s] %s completed in %v", r.Method, r.URL.Path, time.Since(start))
	})
}

// AuthMiddleware validates the X-API-Key header.
func AuthMiddleware(next http.Handler, key string) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		// Skip auth for healthz
		if r.URL.Path == "/healthz" {
			next.ServeHTTP(w, r)
			return
		}
		
		// No key required if not configured
		if key == "" {
			next.ServeHTTP(w, r)
			return
		}
		
		// Check X-API-Key or Authorization header
		gotKey := r.Header.Get("x-api-key")
		if gotKey == "" {
			gotKey = strings.TrimPrefix(r.Header.Get("Authorization"), "Bearer ")
		}
		
		if subtle.ConstantTimeCompare([]byte(gotKey), []byte(key)) != 1 {
			http.Error(w, "Unauthorized", http.StatusUnauthorized)
			return
		}
		
		next.ServeHTTP(w, r)
	})
}
```

### 2.4 步骤 3: /v1/messages 端点

**文件：** `worker/server/handler.go`

```go
package server

import (
	"context"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"strings"
	"time"

	"tools/ccgateway/worker/history"
	"tools/ccgateway/worker/protocol"
	"tools/ccgateway/worker/runner"
)

// handleMessages handles POST /v1/messages (Anthropic Messages API).
func (s *Server) handleMessages(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}
	
	// Parse request
	var req protocol.MessagesRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		writeError(w, http.StatusBadRequest, "invalid_request_error", "Invalid JSON body")
		return
	}
	
	// Extract session ID from header
	sessionID := strings.TrimSpace(r.Header.Get("x-ccgateway-session-id"))
	if sessionID == "" {
		sessionID = fmt.Sprintf("ephemeral-%d", time.Now().UnixNano())
	}
	
	// Validate session ID format
	if !protocol.ValidSessionID(sessionID) {
		writeError(w, http.StatusBadRequest, "invalid_request_error", "Invalid session ID format")
		return
	}
	
	// Check concurrency slot
	select {
	case s.slots <- struct{}{}:
		defer func() { <-s.slots }()
	default:
		writeError(w, http.StatusTooManyRequests, "rate_limit_error", "Worker concurrency limit reached")
		return
	}
	
	// Execute request
	ctx := r.Context()
	resp, err := s.executeMessages(ctx, sessionID, &req)
	if err != nil {
		writeError(w, http.StatusInternalServerError, "internal_error", err.Error())
		return
	}
	
	// Write response
	if req.Stream {
		s.streamResponse(w, resp)
	} else {
		s.writeJSONResponse(w, resp)
	}
}

// executeMessages runs the Claude CLI and returns the response.
func (s *Server) executeMessages(ctx context.Context, sessionID string, req *protocol.MessagesRequest) (*protocol.MessagesResponse, error) {
	// Load history if session exists
	checkpoint, err := s.runner.History.FindCheckpoint(ctx, sessionID)
	if err != nil {
		return nil, fmt.Errorf("load history: %w", err)
	}
	
	// Build command environment
	env := s.buildEnvironment(sessionID, req)
	
	// Execute Claude CLI
	runResult, err := s.runner.Execute(ctx, runner.Request{
		SessionID:  sessionID,
		Checkpoint: checkpoint,
		Model:      req.Model,
		Messages:   req.Messages,
		System:     req.System,
		MaxTokens:  req.MaxTokens,
		Stream:     req.Stream,
		Environment: env,
	})
	if err != nil {
		return nil, fmt.Errorf("execute: %w", err)
	}
	
	// Save history
	if err := s.runner.History.SaveSession(ctx, sessionID, runResult.NewCheckpoint); err != nil {
		return nil, fmt.Errorf("save history: %w", err)
	}
	
	return runResult.Response, nil
}

// buildEnvironment constructs environment variables for Claude CLI.
func (s *Server) buildEnvironment(sessionID string, req *protocol.MessagesRequest) map[string]string {
	env := make(map[string]string)
	
	// Pass system messages via environment
	if len(req.System) > 0 {
		systemJSON, _ := json.Marshal(req.System)
		env["CCGATEWAY_SYSTEMS"] = string(systemJSON)
	}
	
	// Pass attachment filter settings
	env["CCGATEWAY_ATTACHMENT_SOURCE"] = "client" // or "mod" based on policy
	
	// Session scope (set by core)
	env["CCGATEWAY_SESSION_SCOPE"] = req.Scope
	
	return env
}

// handleHealth handles GET /healthz.
func (s *Server) handleHealth(w http.ResponseWriter, r *http.Request) {
	version, err := s.runner.GetVersion()
	if err != nil {
		version = "unknown"
	}
	
	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]string{
		"status":         "ok",
		"claude_version": version,
	})
}

// writeError writes an Anthropic-style error response.
func writeError(w http.ResponseWriter, status int, errType, message string) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(status)
	json.NewEncoder(w).Encode(map[string]interface{}{
		"type": "error",
		"error": map[string]string{
			"type":    errType,
			"message": message,
		},
	})
}

// streamResponse writes a streaming response (SSE).
func (s *Server) streamResponse(w http.ResponseWriter, resp *protocol.MessagesResponse) {
	w.Header().Set("Content-Type", "text/event-stream")
	w.Header().Set("Cache-Control", "no-cache")
	w.Header().Set("Connection", "keep-alive")
	
	flusher, ok := w.(http.Flusher)
	if !ok {
		http.Error(w, "Streaming not supported", http.StatusInternalServerError)
		return
	}
	
	for _, event := range resp.StreamEvents {
		fmt.Fprintf(w, "event: %s\n", event.Type)
		fmt.Fprintf(w, "data: %s\n\n", event.Data)
		flusher.Flush()
	}
}

// writeJSONResponse writes a non-streaming JSON response.
func (s *Server) writeJSONResponse(w http.ResponseWriter, resp *protocol.MessagesResponse) {
	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(resp)
}
```

### 2.5 步骤 4: Mod HTTP 回调

**问题：** 当前 Mod 通过文件通信 (ready.txt, system.json)，需要改为 HTTP 回调。

**文件：** `worker/mod/bridge.go`

```go
package mod

import (
	"context"
	"encoding/json"
	"fmt"
	"net/http"
	"sync"
)

// Bridge provides HTTP endpoints for Mod callbacks.
type Bridge struct {
	readyCh   chan struct{}
	systemReq chan SystemRequest
	mu        sync.Mutex
	systems   []map[string]interface{}
}

type SystemRequest struct {
	ResponseCh chan []map[string]interface{}
}

func NewBridge() *Bridge {
	return &Bridge{
		readyCh:   make(chan struct{}, 1),
		systemReq: make(chan SystemRequest),
	}
}

// WaitReady blocks until Mod calls /mod-callback/ready.
func (b *Bridge) WaitReady(ctx context.Context) error {
	select {
	case <-b.readyCh:
		return nil
	case <-ctx.Done():
		return ctx.Err()
	}
}

// GetSystems handles Mod requesting system messages.
func (b *Bridge) GetSystems(ctx context.Context) ([]map[string]interface{}, error) {
	req := SystemRequest{ResponseCh: make(chan []map[string]interface{}, 1)}
	select {
	case b.systemReq <- req:
	case <-ctx.Done():
		return nil, ctx.Err()
	}
	
	select {
	case systems := <-req.ResponseCh:
		return systems, nil
	case <-ctx.Done():
		return nil, ctx.Err()
	}
}

// HandleReady is the HTTP handler for POST /mod-callback/ready.
func (b *Bridge) HandleReady(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}
	
	var body struct {
		Signal string `json:"signal"`
	}
	if err := json.NewDecoder(r.Body).Decode(&body); err != nil || body.Signal != "ccgateway-v1" {
		http.Error(w, "Invalid signal", http.StatusBadRequest)
		return
	}
	
	select {
	case b.readyCh <- struct{}{}:
	default:
	}
	
	w.WriteHeader(http.StatusOK)
	json.NewEncoder(w).Encode(map[string]string{"status": "ok"})
}

// HandleGetSystem is the HTTP handler for POST /mod-callback/get-system.
func (b *Bridge) HandleGetSystem(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}
	
	// Wait for system messages from runner
	req := SystemRequest{ResponseCh: make(chan []map[string]interface{}, 1)}
	b.systemReq <- req
	
	systems := <-req.ResponseCh
	
	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]interface{}{
		"systems": systems,
	})
}

// SetSystems sets the system messages for the next GetSystems call.
func (b *Bridge) SetSystems(systems []map[string]interface{}) {
	b.mu.Lock()
	b.systems = systems
	b.mu.Unlock()
	
	// Respond to pending request if any
	select {
	case req := <-b.systemReq:
		req.ResponseCh <- systems
	default:
	}
}
```

**文件：** `worker/mod/hooks/register.js` (修改)

```javascript
// 修改前（文件通信）
const readyFile = '/tmp/ccgateway-ready.txt';
await $.write(readyFile, 'ccgateway-v1');

const systemFile = '/tmp/ccgateway-system.json';
const systemJSON = await $.read(systemFile);
const systems = JSON.parse(systemJSON);

// 修改后（HTTP 回调）
const modCallbackURL = process.env.MOD_CALLBACK_URL || 'http://localhost:8787';

// Signal ready
await fetch(`${modCallbackURL}/mod-callback/ready`, {
  method: 'POST',
  headers: {'Content-Type': 'application/json'},
  body: JSON.stringify({signal: 'ccgateway-v1'})
});

// Get system messages from environment variable
const systemsJSON = await $.env.get('CCGATEWAY_SYSTEMS');
const systems = systemsJSON ? JSON.parse(systemsJSON) : [];

// Apply systems
for (const sys of systems) {
  $.context.push(sys);
}
```

### 2.6 步骤 5: 历史存储封装

**文件：** `worker/history/store.go`

```go
package history

import (
	"context"
)

// Store manages session history storage.
type Store interface {
	// FindCheckpoint returns the checkpoint for resuming a session.
	FindCheckpoint(ctx context.Context, sessionID string) (string, error)
	
	// SaveSession saves the session after a successful run.
	SaveSession(ctx context.Context, sessionID string, checkpoint string) error
	
	// DeleteSession deletes a session's history.
	DeleteSession(ctx context.Context, sessionID string) error
	
	// ListSessions returns all session IDs.
	ListSessions(ctx context.Context) ([]string, error)
}

// Checkpoint represents a session checkpoint for resuming.
type Checkpoint struct {
	SessionID  string
	Fingerprint string
	Path       string
}
```

**文件：** `worker/history/filestore.go`

```go
package history

import (
	"context"
	"fmt"
	"os"
	"path/filepath"
)

// FileStore implements Store using the file system.
type FileStore struct {
	baseDir string
}

func NewFileStore(baseDir string) *FileStore {
	return &FileStore{baseDir: baseDir}
}

// FindCheckpoint finds the checkpoint file for a session.
func (f *FileStore) FindCheckpoint(ctx context.Context, sessionID string) (string, error) {
	sessionDir := filepath.Join(f.baseDir, "sessions", sessionID)
	
	// Check if session exists
	if _, err := os.Stat(sessionDir); os.IsNotExist(err) {
		return "", nil // New session
	}
	
	// Find the latest checkpoint
	checkpointFile := filepath.Join(sessionDir, "checkpoint.txt")
	if _, err := os.Stat(checkpointFile); err == nil {
		data, err := os.ReadFile(checkpointFile)
		if err != nil {
			return "", fmt.Errorf("read checkpoint: %w", err)
		}
		return string(data), nil
	}
	
	return "", nil
}

// SaveSession saves the session checkpoint.
func (f *FileStore) SaveSession(ctx context.Context, sessionID string, checkpoint string) error {
	sessionDir := filepath.Join(f.baseDir, "sessions", sessionID)
	
	// Create session directory
	if err := os.MkdirAll(sessionDir, 0700); err != nil {
		return fmt.Errorf("create session dir: %w", err)
	}
	
	// Write checkpoint
	checkpointFile := filepath.Join(sessionDir, "checkpoint.txt")
	if err := os.WriteFile(checkpointFile, []byte(checkpoint), 0600); err != nil {
		return fmt.Errorf("write checkpoint: %w", err)
	}
	
	return nil
}

// DeleteSession deletes a session's history.
func (f *FileStore) DeleteSession(ctx context.Context, sessionID string) error {
	sessionDir := filepath.Join(f.baseDir, "sessions", sessionID)
	return os.RemoveAll(sessionDir)
}

// ListSessions returns all session IDs.
func (f *FileStore) ListSessions(ctx context.Context) ([]string, error) {
	sessionsDir := filepath.Join(f.baseDir, "sessions")
	
	entries, err := os.ReadDir(sessionsDir)
	if err != nil {
		if os.IsNotExist(err) {
			return nil, nil
		}
		return nil, err
	}
	
	var sessions []string
	for _, e := range entries {
		if e.IsDir() {
			sessions = append(sessions, e.Name())
		}
	}
	
	return sessions, nil
}
```

### 2.7 步骤 6: Runner 改造

**文件：** `worker/runner/runner.go`

```go
package runner

import (
	"context"
	"fmt"
	"os/exec"
	"tools/ccgateway/worker/history"
)

// Runner executes Claude CLI commands.
type Runner struct {
	CLIPath string
	History history.Store
}

// Request represents a Claude CLI execution request.
type Request struct {
	SessionID   string
	Checkpoint  string
	Model       string
	Messages    []map[string]interface{}
	System      []map[string]interface{}
	MaxTokens   int
	Stream      bool
	Environment map[string]string
}

// Result represents the execution result.
type Result struct {
	Response      *MessagesResponse
	NewCheckpoint string
}

// Execute runs the Claude CLI with the given request.
func (r *Runner) Execute(ctx context.Context, req Request) (*Result, error) {
	// Build command
	args := []string{"agent", "run", "--stream-json"}
	if req.Checkpoint != "" {
		args = append(args, "--resume", req.Checkpoint)
	}
	
	cmd := exec.CommandContext(ctx, r.CLIPath, args...)
	
	// Set environment variables
	cmd.Env = buildEnv(req.Environment)
	
	// TODO: Implement stream-json protocol parsing
	// TODO: Handle stdin/stdout communication
	// TODO: Parse response events
	
	return &Result{
		Response:      &MessagesResponse{},
		NewCheckpoint: "", // Extract from CLI output
	}, nil
}

// GetVersion returns the Claude CLI version.
func (r *Runner) GetVersion() (string, error) {
	cmd := exec.Command(r.CLIPath, "--version")
	output, err := cmd.Output()
	if err != nil {
		return "", err
	}
	return string(output), nil
}

func buildEnv(custom map[string]string) []string {
	// Merge custom env with system env
	env := []string{}
	for k, v := range custom {
		env = append(env, fmt.Sprintf("%s=%s", k, v))
	}
	return env
}

// MessagesResponse represents an Anthropic Messages API response.
type MessagesResponse struct {
	ID           string                   `json:"id"`
	Type         string                   `json:"type"`
	Role         string                   `json:"role"`
	Content      []map[string]interface{} `json:"content"`
	Model        string                   `json:"model"`
	StopReason   string                   `json:"stop_reason,omitempty"`
	Usage        Usage                    `json:"usage"`
	StreamEvents []StreamEvent            `json:"-"` // For streaming
}

type Usage struct {
	InputTokens  int `json:"input_tokens"`
	OutputTokens int `json:"output_tokens"`
}

type StreamEvent struct {
	Type string `json:"type"`
	Data string `json:"data"`
}
```

### 2.8 步骤 7: Worker 入口

**文件：** `worker/main.go`

```go
package main

import (
	"context"
	"fmt"
	"log"
	"os"
	"os/signal"
	"syscall"
	"time"

	"tools/ccgateway/worker/history"
	"tools/ccgateway/worker/runner"
	"tools/ccgateway/worker/server"
)

func main() {
	// Load configuration from environment
	cfg := loadConfig()
	
	// Initialize history store
	histStore := history.NewFileStore(cfg.HistoryDir)
	
	// Initialize runner
	run := &runner.Runner{
		CLIPath: cfg.CLIPath,
		History: histStore,
	}
	
	// Create server
	srv := server.New(server.Config{
		Addr:        cfg.Addr,
		AuthKey:     cfg.AuthKey,
		Concurrency: cfg.Concurrency,
		Timeout:     cfg.Timeout,
		Runner:      run,
	})
	
	// Start server in goroutine
	go func() {
		if err := srv.Start(); err != nil {
			log.Fatalf("Server failed: %v", err)
		}
	}()
	
	// Wait for shutdown signal
	stop := make(chan os.Signal, 1)
	signal.Notify(stop, os.Interrupt, syscall.SIGTERM)
	<-stop
	
	// Graceful shutdown
	log.Println("Shutting down...")
	ctx, cancel := context.WithTimeout(context.Background(), 30*time.Second)
	defer cancel()
	
	if err := srv.Shutdown(ctx); err != nil {
		log.Fatalf("Shutdown failed: %v", err)
	}
	
	log.Println("Server stopped")
}

type Config struct {
	Addr        string
	AuthKey     string
	Concurrency int
	Timeout     time.Duration
	CLIPath     string
	HistoryDir  string
}

func loadConfig() Config {
	return Config{
		Addr:        getEnv("WORKER_ADDR", ":8788"),
		AuthKey:     os.Getenv("WORKER_AUTH_KEY"),
		Concurrency: getEnvInt("WORKER_CONCURRENCY", 4),
		Timeout:     getEnvDuration("WORKER_TIMEOUT", 5*time.Minute),
		CLIPath:     getEnv("CLAUDE_CLI_PATH", "claude"),
		HistoryDir:  getEnv("HISTORY_DIR", "/root/.claude"),
	}
}

func getEnv(key, fallback string) string {
	if v := os.Getenv(key); v != "" {
		return v
	}
	return fallback
}

func getEnvInt(key string, fallback int) int {
	if v := os.Getenv(key); v != "" {
		var i int
		fmt.Sscanf(v, "%d", &i)
		return i
	}
	return fallback
}

func getEnvDuration(key string, fallback time.Duration) time.Duration {
	if v := os.Getenv(key); v != "" {
		d, _ := time.ParseDuration(v)
		return d
	}
	return fallback
}
```

### 2.9 步骤 8: Worker Dockerfile

**文件：** `worker/Dockerfile`

```dockerfile
FROM golang:1.27-alpine AS builder

WORKDIR /build
COPY . .

RUN go build -o worker ./worker/main.go

FROM alpine:3.19

# Install Claude CLI (假设从官方安装)
RUN apk add --no-cache curl bash
RUN curl -fsSL https://code.claude.com/install.sh | sh

# Copy worker binary
COPY --from=builder /build/worker /usr/local/bin/worker

# Create directories
RUN mkdir -p /root/.claude/sessions

EXPOSE 8788

ENTRYPOINT ["/usr/local/bin/worker"]
```

### 2.10 步骤 9: Worker 单元测试

**文件：** `worker/server/handler_test.go`

```go
package server

import (
	"bytes"
	"context"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"testing"
	
	"tools/ccgateway/worker/history"
	"tools/ccgateway/worker/runner"
)

func TestHandleMessages(t *testing.T) {
	// Mock history store
	histStore := &mockHistoryStore{}
	
	// Mock runner
	run := &runner.Runner{
		CLIPath: "/usr/bin/claude",
		History: histStore,
	}
	
	// Create server
	srv := New(Config{
		Addr:        ":8788",
		AuthKey:     "test-key",
		Concurrency: 4,
		Timeout:     60,
		Runner:      run,
	})
	
	// Create test request
	reqBody := map[string]interface{}{
		"model":      "claude-haiku-4-5",
		"max_tokens": 1024,
		"messages": []map[string]string{
			{"role": "user", "content": "Hello"},
		},
	}
	body, _ := json.Marshal(reqBody)
	
	req := httptest.NewRequest(http.MethodPost, "/v1/messages", bytes.NewReader(body))
	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("x-api-key", "test-key")
	
	rec := httptest.NewRecorder()
	
	srv.handleMessages(rec, req)
	
	if rec.Code != http.StatusOK {
		t.Errorf("Expected 200, got %d", rec.Code)
	}
}

type mockHistoryStore struct{}

func (m *mockHistoryStore) FindCheckpoint(ctx context.Context, sessionID string) (string, error) {
	return "", nil
}

func (m *mockHistoryStore) SaveSession(ctx context.Context, sessionID string, checkpoint string) error {
	return nil
}

func (m *mockHistoryStore) DeleteSession(ctx context.Context, sessionID string) error {
	return nil
}

func (m *mockHistoryStore) ListSessions(ctx context.Context) ([]string, error) {
	return []string{}, nil
}
```

---

## 3. 插件开发

### 3.1 目标架构

**插件职责：**
- 账号类型注册（已完成）
- 请求路由到 Worker
- 流式响应透传
- 错误处理

**现有代码：**
- `next/plugins/ccgateway/` 已经存在
- 需要适配新的 Worker HTTP 接口

### 3.2 步骤 1: 插件入口

**文件：** `next/plugins/ccgateway/main.go`（已存在）

```go
package main

import (
	_ "embed"

	"github.com/Sub2API-Devs/sup2api/next/plugins/ccgateway/internal/ccgateway"
	"github.com/Sub2API-Devs/sup2api/next/sdk/pluginsdk"
)

//go:embed manifest.json
var manifestJSON []byte

func main() {
	pluginsdk.Serve(ccgateway.New(), pluginsdk.WithManifest(manifestJSON))
}
```

### 3.3 步骤 2: 插件实现

**文件：** `next/plugins/ccgateway/internal/ccgateway/ccgateway.go`（已存在，需要增强）

当前代码已经实现了基本的账号验证和请求构建，需要补充：
1. Worker URL 获取逻辑
2. HTTP 客户端和请求转发
3. 流式响应处理

**补充：Worker URL 映射**

```go
// GetWorkerURL returns the Worker URL for the given account.
func (p *Plugin) GetWorkerURL(ctx context.Context, accountID int64) (string, error) {
	// TODO: 通过 Host Service 查询账号配置
	// account, err := p.host.GetAccount(ctx, accountID)
	// if err != nil {
	//     return "", err
	// }
	// 
	// var config map[string]string
	// if err := json.Unmarshal([]byte(account.Config), &config); err != nil {
	//     return "", err
	// }
	// 
	// return config["worker_url"], nil
	
	// 临时实现：从环境变量读取
	// 生产环境应该从核心的 Host Service 获取
	return os.Getenv("WORKER_URL"), nil
}
```

### 3.4 步骤 3: HTTP 客户端

**文件：** `next/plugins/ccgateway/internal/client/client.go`

```go
package client

import (
	"bytes"
	"context"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"time"
)

// Client is an HTTP client for Worker communication.
type Client struct {
	httpClient *http.Client
	authKey    string
}

func New(authKey string) *Client {
	return &Client{
		httpClient: &http.Client{
			Timeout: 5 * time.Minute,
		},
		authKey: authKey,
	}
}

// Forward forwards a request to the Worker.
func (c *Client) Forward(ctx context.Context, workerURL string, req *ForwardRequest) (*ForwardResponse, error) {
	// Build request body
	body, err := json.Marshal(req.Body)
	if err != nil {
		return nil, fmt.Errorf("marshal body: %w", err)
	}
	
	// Create HTTP request
	httpReq, err := http.NewRequestWithContext(ctx, req.Method, workerURL, bytes.NewReader(body))
	if err != nil {
		return nil, fmt.Errorf("create request: %w", err)
	}
	
	// Set headers
	for k, v := range req.Headers {
		httpReq.Header.Set(k, v)
	}
	if c.authKey != "" {
		httpReq.Header.Set("x-api-key", c.authKey)
	}
	
	// Send request
	httpResp, err := c.httpClient.Do(httpReq)
	if err != nil {
		return nil, fmt.Errorf("send request: %w", err)
	}
	defer httpResp.Body.Close()
	
	// Read response
	respBody, err := io.ReadAll(httpResp.Body)
	if err != nil {
		return nil, fmt.Errorf("read response: %w", err)
	}
	
	return &ForwardResponse{
		StatusCode: httpResp.StatusCode,
		Headers:    httpResp.Header,
		Body:       respBody,
	}, nil
}

type ForwardRequest struct {
	Method  string
	Headers map[string]string
	Body    interface{}
}

type ForwardResponse struct {
	StatusCode int
	Headers    http.Header
	Body       []byte
}
```

### 3.5 步骤 4: 插件单元测试

**文件：** `next/plugins/ccgateway/internal/ccgateway/ccgateway_test.go`（已存在）

补充测试用例：

```go
func TestPlugin_GetWorkerURL(t *testing.T) {
	plugin := New()
	
	// TODO: Mock Host Service
	url, err := plugin.GetWorkerURL(context.Background(), 123)
	if err != nil {
		t.Fatalf("GetWorkerURL failed: %v", err)
	}
	
	if url == "" {
		t.Error("Expected non-empty URL")
	}
}

func TestPlugin_ForwardRequest(t *testing.T) {
	// TODO: Mock Worker HTTP server
	// TODO: Test request forwarding
	// TODO: Test error handling
}
```

---

## 4. 核心集成

### 4.1 账号 Config Schema

**问题：** 需要在账号的 `config` JSONB 字段中存储 Worker URL。

**Schema 设计：**

```json
{
  "worker_url": "http://ccgateway-worker-123:8788",
  "worker_auth_key": "secure-random-key",
  "concurrency": 4
}
```

**验证逻辑：**

插件的 `ValidateCredentials` 方法（已存在）需要验证 config 格式。

### 4.2 Host Service 扩展

**问题：** 插件需要通过 Host Service 查询账号配置。

**现有接口：**

查看 `next/sdk/proto/pluginv1/host.proto`，确认是否已有 `GetAccount` 方法。

**如果没有，需要添加：**

```protobuf
service HostService {
  rpc GetAccount(GetAccountRequest) returns (GetAccountResponse);
}

message GetAccountRequest {
  int64 account_id = 1;
}

message GetAccountResponse {
  Account account = 1;
}

message Account {
  int64 id = 1;
  string type = 2;
  string credentials_json = 3;
  string settings_json = 4;
  string config_json = 5;
}
```

**实现：**

在 `next/server/internal/plugin/grpcruntime/host_service.go` 中实现。

### 4.3 数据库迁移

**如果需要新增字段：**

```sql
-- next/server/internal/migrations/NNNN_ccgateway_config.sql

-- 现有 accounts 表已经有 config JSONB 字段，无需迁移
-- 只需要在应用层验证 config 格式
```

### 4.4 集成测试

**文件：** `next/server/internal/gateway/ccgateway_integration_test.go`

```go
package gateway_test

import (
	"context"
	"testing"
	
	"github.com/Sub2API-Devs/sup2api/next/server/internal/testutil"
)

func TestCCGateway_EndToEnd(t *testing.T) {
	// Setup test database
	db := testutil.DB(t)
	
	// Create test account
	// TODO: Insert CCGateway account
	
	// Start test Worker
	// TODO: Start mock Worker on localhost
	
	// Send request through gateway
	// TODO: POST /v1/messages
	
	// Verify response
	// TODO: Check response format
}
```

---

## 5. 配置管理

### 5.1 Docker Compose

**文件：** `docker-compose.ccgateway.yml`

```yaml
version: '3.8'

services:
  # CCGateway Worker 1
  ccgateway-worker-1:
    build:
      context: ./tools/ccgateway/worker
      dockerfile: Dockerfile
    container_name: ccgateway-worker-1
    environment:
      - WORKER_ADDR=:8788
      - WORKER_AUTH_KEY=${WORKER_1_AUTH_KEY}
      - WORKER_CONCURRENCY=4
      - WORKER_TIMEOUT=5m
      - CLAUDE_CLI_PATH=/usr/local/bin/claude
      - HISTORY_DIR=/root/.claude
      # Mod callback URL
      - MOD_CALLBACK_URL=http://localhost:8787
    volumes:
      - worker-1-data:/root/.claude
    ports:
      - "8788:8788"
    restart: unless-stopped
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:8788/healthz"]
      interval: 30s
      timeout: 10s
      retries: 3

  # CCGateway Worker 2
  ccgateway-worker-2:
    build:
      context: ./tools/ccgateway/worker
      dockerfile: Dockerfile
    container_name: ccgateway-worker-2
    environment:
      - WORKER_ADDR=:8788
      - WORKER_AUTH_KEY=${WORKER_2_AUTH_KEY}
      - WORKER_CONCURRENCY=4
      - WORKER_TIMEOUT=5m
      - CLAUDE_CLI_PATH=/usr/local/bin/claude
      - HISTORY_DIR=/root/.claude
      - MOD_CALLBACK_URL=http://localhost:8787
    volumes:
      - worker-2-data:/root/.claude
    ports:
      - "8789:8788"
    restart: unless-stopped
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:8788/healthz"]
      interval: 30s
      timeout: 10s
      retries: 3

volumes:
  worker-1-data:
  worker-2-data:
```

### 5.2 环境变量模板

**文件：** `.env.ccgateway.example`

```bash
# Worker 1
WORKER_1_AUTH_KEY=your-secure-random-key-here

# Worker 2
WORKER_2_AUTH_KEY=another-secure-random-key-here

# Claude Code OAuth/API Key (在容器内配置)
# 每个 Worker 需要单独授权
```

### 5.3 启动脚本

**文件：** `tools/ccgateway/worker/start.sh`

```bash
#!/bin/bash
set -e

# Generate .env if not exists
if [ ! -f .env.ccgateway ]; then
  echo "Generating .env.ccgateway..."
  cp .env.ccgateway.example .env.ccgateway
  
  # Generate random keys
  sed -i "s/your-secure-random-key-here/$(openssl rand -hex 32)/g" .env.ccgateway
  sed -i "s/another-secure-random-key-here/$(openssl rand -hex 32)/g" .env.ccgateway
fi

# Start Workers
docker compose -f docker-compose.ccgateway.yml up -d

echo "Workers started!"
echo "- Worker 1: http://localhost:8788"
echo "- Worker 2: http://localhost:8789"
echo ""
echo "Next steps:"
echo "1. Authorize Claude Code in each Worker:"
echo "   docker exec -it ccgateway-worker-1 claude auth login"
echo "   docker exec -it ccgateway-worker-2 claude auth login"
echo "2. Create accounts in sup2api with Worker URLs"
```

---

## 6. 测试指南

### 6.1 单元测试

```bash
# Test Worker
cd tools/ccgateway/worker
go test ./... -v -cover

# Test Plugin
cd next/plugins/ccgateway
go test ./... -v -cover

# Test with race detector
go test -race ./...
```

### 6.2 集成测试

```bash
# Start test environment
docker compose -f docker-compose.test.yml up -d

# Run integration tests
cd next/server
go test ./internal/gateway/... -v -tags=integration

# Cleanup
docker compose -f docker-compose.test.yml down -v
```

### 6.3 手动测试

```bash
# Start Worker
cd tools/ccgateway/worker
go run main.go

# Test health endpoint
curl http://localhost:8788/healthz

# Test /v1/messages
curl -X POST http://localhost:8788/v1/messages \
  -H "Content-Type: application/json" \
  -H "x-api-key: test-key" \
  -d '{
    "model": "claude-haiku-4-5",
    "max_tokens": 1024,
    "messages": [{"role": "user", "content": "Hello"}]
  }'
```

---

## 7. 部署指南

详见 [06-DEPLOYMENT-GUIDE.md](06-DEPLOYMENT-GUIDE.md)

---

## 8. 代码审查清单

### 8.1 架构和设计

- [ ] 遵循分层架构（server/runner/history/protocol 清晰分离）
- [ ] 使用接口而非具体实现（如 `history.Store`）
- [ ] 依赖注入，不使用全局变量
- [ ] 错误处理完整，所有 error 都被检查

### 8.2 代码质量

- [ ] 遵守代码规范（见 11-CODE-CLEANUP.md）
- [ ] 函数长度 < 50 行
- [ ] 嵌套深度 < 3 层
- [ ] 圈复杂度 < 15
- [ ] 无 golangci-lint 警告

### 8.3 测试

- [ ] 单元测试覆盖率 > 80%
- [ ] 所有公开函数都有测试
- [ ] 测试用例覆盖正常和异常路径
- [ ] 使用 table-driven tests
- [ ] Mock 外部依赖

### 8.4 安全

- [ ] 不在日志中打印敏感信息
- [ ] 使用 `crypto/subtle` 进行密钥比较
- [ ] 文件权限正确（0600 for secrets）
- [ ] 环境变量验证

### 8.5 性能

- [ ] 避免不必要的内存分配
- [ ] 使用连接池（HTTP client）
- [ ] 并发控制（channel slots）
- [ ] 超时设置合理

### 8.6 可维护性

- [ ] 代码注释清晰
- [ ] 命名符合 Go 规范
- [ ] 错误消息描述清晰
- [ ] 日志级别合理

---

## 9. 常见问题

### Q1: Worker 启动失败，提示 "Claude CLI not found"

**A:** 检查 Dockerfile 中 Claude CLI 的安装步骤，确保：
```bash
docker exec -it ccgateway-worker-1 which claude
docker exec -it ccgateway-worker-1 claude --version
```

### Q2: Mod 回调超时

**A:** 检查：
1. Mod HTTP 服务是否启动（`:8787`）
2. `MOD_CALLBACK_URL` 环境变量是否正确
3. 防火墙规则

### Q3: 会话历史丢失

**A:** 检查：
1. 数据卷是否正确挂载
2. 文件权限（需要 0700）
3. checkpoint 保存逻辑

### Q4: 插件无法获取 Worker URL

**A:** 检查：
1. Host Service 是否实现 `GetAccount`
2. 账号 config 格式是否正确
3. 插件是否有 `accounts.credentials` 权限

### Q5: 流式响应中断

**A:** 检查：
1. HTTP 客户端超时设置
2. 网络稳定性
3. Worker 并发限制

---

## 10. 故障排查

### 10.1 Worker 故障

**症状：** Worker 无响应或返回 500 错误

**排查步骤：**
```bash
# 查看 Worker 日志
docker logs ccgateway-worker-1

# 检查健康状态
curl http://localhost:8788/healthz

# 查看进程状态
docker exec -it ccgateway-worker-1 ps aux | grep worker

# 查看资源占用
docker stats ccgateway-worker-1
```

### 10.2 插件故障

**症状：** 请求返回 "plugin_unavailable"

**排查步骤：**
```bash
# 查看核心日志
docker logs sup2api-next

# 检查插件状态
curl http://localhost:8080/api/v1/plugins

# 查看插件日志
# 插件日志在核心日志中，搜索 "ccgateway"
```

### 10.3 性能问题

**症状：** 响应延迟高

**排查步骤：**
```bash
# 查看 Worker 并发情况
# 在 Worker 日志中搜索 "concurrency limit"

# 检查网络延迟
ping ccgateway-worker-1

# 查看 CPU 和内存
docker stats

# 分析慢查询
# 在 Worker 中添加性能日志
```

### 10.4 会话历史问题

**症状：** 续聊失败或历史丢失

**排查步骤：**
```bash
# 查看会话文件
docker exec -it ccgateway-worker-1 ls -la /root/.claude/sessions

# 检查文件内容
docker exec -it ccgateway-worker-1 cat /root/.claude/sessions/xxx/checkpoint.txt

# 验证权限
docker exec -it ccgateway-worker-1 ls -la /root/.claude
```

---

**文档状态：** ✅ 已完成  
**最后审阅：** [待填写]  
**批准日期：** [待填写]  
**下次评审：** [待填写]
