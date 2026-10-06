package server

import (
	"bytes"
	"context"
	"encoding/json"
	"errors"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
	"github.com/yourusername/ccgateway-worker/pkg/types"
)

func init() {
	gin.SetMode(gin.TestMode)
}

// mockWorker 模拟 Worker
type mockWorker struct {
	executeFunc func(context.Context, *types.Request) (*types.Response, error)
	healthFunc  func(context.Context) (*types.HealthStatus, error)
	closeFunc   func() error
}

func (m *mockWorker) Execute(ctx context.Context, req *types.Request) (*types.Response, error) {
	if m.executeFunc != nil {
		return m.executeFunc(ctx, req)
	}
	return nil, errors.New("not implemented")
}

func (m *mockWorker) Health(ctx context.Context) (*types.HealthStatus, error) {
	if m.healthFunc != nil {
		return m.healthFunc(ctx)
	}
	return &types.HealthStatus{Status: "healthy"}, nil
}

func (m *mockWorker) Close() error {
	if m.closeFunc != nil {
		return m.closeFunc()
	}
	return nil
}

// TestNew 测试服务器创建
func TestNew(t *testing.T) {
	worker := &mockWorker{}
	server := New(worker, 8788)

	assert.NotNil(t, server)
	assert.Equal(t, 8788, server.port)
	assert.NotNil(t, server.engine)
	assert.Equal(t, worker, server.worker)
}

// TestHandleMessages_Success 测试成功的消息处理
func TestHandleMessages_Success(t *testing.T) {
	worker := &mockWorker{
		executeFunc: func(ctx context.Context, req *types.Request) (*types.Response, error) {
			// 验证请求参数
			assert.Equal(t, "claude-opus-5", req.Model)
			assert.Equal(t, 1024, req.MaxTokens)
			assert.Len(t, req.Messages, 1)
			assert.Equal(t, "session-123", req.SessionID)
			assert.Equal(t, "default", req.RequestPolicy)

			// 创建独立的 channel
			eventCh := make(chan types.Event, 3)
			errCh := make(chan error, 1)

			// 发送模拟事件（使用 time.Sleep 确保有序）
			go func() {
				defer close(eventCh)
				defer close(errCh)

				eventCh <- types.Event{
					Type: "message_start",
					Data: json.RawMessage(`{"id":"msg_123"}`),
				}
				time.Sleep(10 * time.Millisecond)

				eventCh <- types.Event{
					Type: "content_block_delta",
					Data: json.RawMessage(`{"delta":{"text":"Hello"}}`),
				}
				time.Sleep(10 * time.Millisecond)

				eventCh <- types.Event{
					Type: "message_stop",
					Data: json.RawMessage(`{}`),
				}
			}()

			return &types.Response{
				StatusCode: 200,
				Body:       eventCh,
				Err:        errCh,
			}, nil
		},
	}

	server := New(worker, 8788)

	reqBody := map[string]interface{}{
		"model":      "claude-opus-5",
		"max_tokens": 1024,
		"messages": []map[string]string{
			{"role": "user", "content": "Hello"},
		},
	}
	body, _ := json.Marshal(reqBody)

	req := httptest.NewRequest(http.MethodPost, "/v1/messages", bytes.NewReader(body))
	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("X-CCGateway-Session-ID", "session-123")
	req.Header.Set("X-CCGateway-Request-Policy", "default")

	w := httptest.NewRecorder()
	server.engine.ServeHTTP(w, req)

	assert.Equal(t, http.StatusOK, w.Code)
	assert.Equal(t, "text/event-stream", w.Header().Get("Content-Type"))
	assert.Equal(t, "no-cache", w.Header().Get("Cache-Control"))

	// 验证 SSE 格式
	body = w.Body.Bytes()
	bodyStr := string(body)
	assert.Contains(t, bodyStr, "event: message_start")
	assert.Contains(t, bodyStr, "data: {\"id\":\"msg_123\"}")
	assert.Contains(t, bodyStr, "event: content_block_delta")
	assert.Contains(t, bodyStr, "event: message_stop")
}

// TestHandleMessages_InvalidJSON 测试无效 JSON
func TestHandleMessages_InvalidJSON(t *testing.T) {
	worker := &mockWorker{}
	server := New(worker, 8788)

	req := httptest.NewRequest(http.MethodPost, "/v1/messages", strings.NewReader("{invalid json}"))
	req.Header.Set("Content-Type", "application/json")

	w := httptest.NewRecorder()
	server.engine.ServeHTTP(w, req)

	assert.Equal(t, http.StatusBadRequest, w.Code)

	var resp map[string]interface{}
	err := json.Unmarshal(w.Body.Bytes(), &resp)
	require.NoError(t, err)
	assert.Contains(t, resp, "error")
}

// TestHandleMessages_MissingRequiredFields 测试缺失必填字段
func TestHandleMessages_MissingRequiredFields(t *testing.T) {
	tests := []struct {
		name string
		body map[string]interface{}
	}{
		{
			name: "missing model",
			body: map[string]interface{}{
				"max_tokens": 1024,
				"messages":   []map[string]string{{"role": "user", "content": "test"}},
			},
		},
		{
			name: "missing max_tokens",
			body: map[string]interface{}{
				"model":    "claude-opus-5",
				"messages": []map[string]string{{"role": "user", "content": "test"}},
			},
		},
		{
			name: "missing messages",
			body: map[string]interface{}{
				"model":      "claude-opus-5",
				"max_tokens": 1024,
			},
		},
		{
			name: "empty messages",
			body: map[string]interface{}{
				"model":      "claude-opus-5",
				"max_tokens": 1024,
				"messages":   []map[string]string{},
			},
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			worker := &mockWorker{}
			server := New(worker, 8788)

			body, _ := json.Marshal(tt.body)
			req := httptest.NewRequest(http.MethodPost, "/v1/messages", bytes.NewReader(body))
			req.Header.Set("Content-Type", "application/json")

			w := httptest.NewRecorder()
			server.engine.ServeHTTP(w, req)

			assert.Equal(t, http.StatusBadRequest, w.Code)
		})
	}
}

// TestHandleMessages_WorkerError 测试 Worker 执行错误
func TestHandleMessages_WorkerError(t *testing.T) {
	worker := &mockWorker{
		executeFunc: func(ctx context.Context, req *types.Request) (*types.Response, error) {
			return nil, errors.New("worker execution failed")
		},
	}

	server := New(worker, 8788)

	reqBody := map[string]interface{}{
		"model":      "claude-opus-5",
		"max_tokens": 1024,
		"messages": []map[string]string{
			{"role": "user", "content": "Hello"},
		},
	}
	body, _ := json.Marshal(reqBody)

	req := httptest.NewRequest(http.MethodPost, "/v1/messages", bytes.NewReader(body))
	req.Header.Set("Content-Type", "application/json")

	w := httptest.NewRecorder()
	server.engine.ServeHTTP(w, req)

	assert.Equal(t, http.StatusInternalServerError, w.Code)

	var resp map[string]interface{}
	err := json.Unmarshal(w.Body.Bytes(), &resp)
	require.NoError(t, err)
	assert.Equal(t, "worker execution failed", resp["error"])
}

// TestHandleMessages_StreamError 测试流式响应中的错误
func TestHandleMessages_StreamError(t *testing.T) {
	worker := &mockWorker{
		executeFunc: func(ctx context.Context, req *types.Request) (*types.Response, error) {
			eventCh := make(chan types.Event, 2)
			errCh := make(chan error, 1)

			go func() {
				defer close(eventCh)
				defer close(errCh)

				eventCh <- types.Event{
					Type: "message_start",
					Data: json.RawMessage(`{"id":"msg_123"}`),
				}
				time.Sleep(10 * time.Millisecond)

				errCh <- errors.New("stream processing error")
			}()

			return &types.Response{
				StatusCode: 200,
				Body:       eventCh,
				Err:        errCh,
			}, nil
		},
	}

	server := New(worker, 8788)

	reqBody := map[string]interface{}{
		"model":      "claude-opus-5",
		"max_tokens": 1024,
		"messages": []map[string]string{
			{"role": "user", "content": "Hello"},
		},
	}
	body, _ := json.Marshal(reqBody)

	req := httptest.NewRequest(http.MethodPost, "/v1/messages", bytes.NewReader(body))
	req.Header.Set("Content-Type", "application/json")

	w := httptest.NewRecorder()
	server.engine.ServeHTTP(w, req)

	assert.Equal(t, http.StatusOK, w.Code)
	bodyStr := w.Body.String()
	assert.Contains(t, bodyStr, "event: error")
	assert.Contains(t, bodyStr, "stream processing error")
}

// TestHandleMessages_ContextCancellation 测试上下文取消
func TestHandleMessages_ContextCancellation(t *testing.T) {
	eventCh := make(chan types.Event)
	errCh := make(chan error)

	worker := &mockWorker{
		executeFunc: func(ctx context.Context, req *types.Request) (*types.Response, error) {
			go func() {
				// 模拟慢速流式响应
				select {
				case <-ctx.Done():
					close(eventCh)
					close(errCh)
				case <-time.After(5 * time.Second):
					close(eventCh)
					close(errCh)
				}
			}()

			return &types.Response{
				StatusCode: 200,
				Body:       eventCh,
				Err:        errCh,
			}, nil
		},
	}

	server := New(worker, 8788)

	reqBody := map[string]interface{}{
		"model":      "claude-opus-5",
		"max_tokens": 1024,
		"messages": []map[string]string{
			{"role": "user", "content": "Hello"},
		},
	}
	body, _ := json.Marshal(reqBody)

	ctx, cancel := context.WithCancel(context.Background())
	req := httptest.NewRequest(http.MethodPost, "/v1/messages", bytes.NewReader(body))
	req = req.WithContext(ctx)
	req.Header.Set("Content-Type", "application/json")

	// 立即取消上下文
	cancel()

	w := httptest.NewRecorder()
	server.engine.ServeHTTP(w, req)

	// 流应该干净结束
	assert.Equal(t, http.StatusOK, w.Code)
}

// TestHandleHealth_Success 测试健康检查成功
func TestHandleHealth_Success(t *testing.T) {
	worker := &mockWorker{
		healthFunc: func(ctx context.Context) (*types.HealthStatus, error) {
			return &types.HealthStatus{
				Status:     "healthy",
				WorkerID:   "worker-001",
				CLIVersion: "2.1.288",
				Uptime:     3600,
			}, nil
		},
	}

	server := New(worker, 8788)

	req := httptest.NewRequest(http.MethodGet, "/health", nil)
	w := httptest.NewRecorder()
	server.engine.ServeHTTP(w, req)

	assert.Equal(t, http.StatusOK, w.Code)

	var status types.HealthStatus
	err := json.Unmarshal(w.Body.Bytes(), &status)
	require.NoError(t, err)

	assert.Equal(t, "healthy", status.Status)
	assert.Equal(t, "worker-001", status.WorkerID)
	assert.Equal(t, "2.1.288", status.CLIVersion)
	assert.Equal(t, int64(3600), status.Uptime)
}

// TestHandleHealth_Unhealthy 测试健康检查失败
func TestHandleHealth_Unhealthy(t *testing.T) {
	worker := &mockWorker{
		healthFunc: func(ctx context.Context) (*types.HealthStatus, error) {
			return nil, errors.New("worker is down")
		},
	}

	server := New(worker, 8788)

	req := httptest.NewRequest(http.MethodGet, "/health", nil)
	w := httptest.NewRecorder()
	server.engine.ServeHTTP(w, req)

	assert.Equal(t, http.StatusServiceUnavailable, w.Code)

	var resp map[string]interface{}
	err := json.Unmarshal(w.Body.Bytes(), &resp)
	require.NoError(t, err)

	assert.Equal(t, "unhealthy", resp["status"])
	assert.Equal(t, "worker is down", resp["error"])
}

// TestHandleHealth_Timeout 测试健康检查超时
func TestHandleHealth_Timeout(t *testing.T) {
	worker := &mockWorker{
		healthFunc: func(ctx context.Context) (*types.HealthStatus, error) {
			// 模拟超时
			select {
			case <-ctx.Done():
				return nil, ctx.Err()
			case <-time.After(10 * time.Second):
				return &types.HealthStatus{Status: "healthy"}, nil
			}
		},
	}

	server := New(worker, 8788)

	req := httptest.NewRequest(http.MethodGet, "/health", nil)
	w := httptest.NewRecorder()
	server.engine.ServeHTTP(w, req)

	assert.Equal(t, http.StatusServiceUnavailable, w.Code)
}

// TestLoggerMiddleware 测试日志中间件
func TestLoggerMiddleware(t *testing.T) {
	worker := &mockWorker{}
	server := New(worker, 8788)

	// 成功请求
	req := httptest.NewRequest(http.MethodGet, "/health", nil)
	w := httptest.NewRecorder()
	server.engine.ServeHTTP(w, req)

	// 404 请求
	req = httptest.NewRequest(http.MethodGet, "/nonexistent", nil)
	w = httptest.NewRecorder()
	server.engine.ServeHTTP(w, req)
	assert.Equal(t, http.StatusNotFound, w.Code)
}

// TestSetupRoutes 测试路由配置
func TestSetupRoutes(t *testing.T) {
	worker := &mockWorker{}
	server := New(worker, 8788)

	routes := server.engine.Routes()

	// 验证路由存在
	var foundMessages, foundHealth bool
	for _, route := range routes {
		if route.Method == "POST" && route.Path == "/v1/messages" {
			foundMessages = true
		}
		if route.Method == "GET" && route.Path == "/health" {
			foundHealth = true
		}
	}

	assert.True(t, foundMessages, "POST /v1/messages route not found")
	assert.True(t, foundHealth, "GET /health route not found")
}

// TestStreamResponse_MultipleEvents 测试多个事件的流式响应
func TestStreamResponse_MultipleEvents(t *testing.T) {
	worker := &mockWorker{
		executeFunc: func(ctx context.Context, req *types.Request) (*types.Response, error) {
			eventCh := make(chan types.Event, 5)
			errCh := make(chan error, 1)

			go func() {
				defer close(eventCh)
				defer close(errCh)

				events := []types.Event{
					{Type: "message_start", Data: json.RawMessage(`{"id":"1"}`)},
					{Type: "content_block_start", Data: json.RawMessage(`{"index":0}`)},
					{Type: "content_block_delta", Data: json.RawMessage(`{"delta":{"text":"Hello"}}`)},
					{Type: "content_block_stop", Data: json.RawMessage(`{"index":0}`)},
					{Type: "message_stop", Data: json.RawMessage(`{}`)},
				}

				for _, event := range events {
					eventCh <- event
					time.Sleep(10 * time.Millisecond)
				}
			}()

			return &types.Response{
				StatusCode: 200,
				Body:       eventCh,
				Err:        errCh,
			}, nil
		},
	}

	server := New(worker, 8788)

	reqBody := map[string]interface{}{
		"model":      "claude-opus-5",
		"max_tokens": 1024,
		"messages":   []map[string]string{{"role": "user", "content": "test"}},
	}
	body, _ := json.Marshal(reqBody)

	req := httptest.NewRequest(http.MethodPost, "/v1/messages", bytes.NewReader(body))
	req.Header.Set("Content-Type", "application/json")

	w := httptest.NewRecorder()
	server.engine.ServeHTTP(w, req)

	assert.Equal(t, http.StatusOK, w.Code)
	bodyStr := w.Body.String()

	// 验证所有事件都在响应中
	assert.Contains(t, bodyStr, "event: message_start")
	assert.Contains(t, bodyStr, "event: content_block_start")
	assert.Contains(t, bodyStr, "event: content_block_delta")
	assert.Contains(t, bodyStr, "event: content_block_stop")
	assert.Contains(t, bodyStr, "event: message_stop")
}

// TestHandleMessages_CustomHeaders 测试自定义头部提取
func TestHandleMessages_CustomHeaders(t *testing.T) {
	eventCh := make(chan types.Event)
	errCh := make(chan error)

	var capturedReq *types.Request
	worker := &mockWorker{
		executeFunc: func(ctx context.Context, req *types.Request) (*types.Response, error) {
			capturedReq = req
			go func() {
				close(eventCh)
				close(errCh)
			}()
			return &types.Response{
				StatusCode: 200,
				Body:       eventCh,
				Err:        errCh,
			}, nil
		},
	}

	server := New(worker, 8788)

	reqBody := map[string]interface{}{
		"model":      "claude-opus-5",
		"max_tokens": 1024,
		"messages":   []map[string]string{{"role": "user", "content": "test"}},
	}
	body, _ := json.Marshal(reqBody)

	req := httptest.NewRequest(http.MethodPost, "/v1/messages", bytes.NewReader(body))
	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("X-CCGateway-Session-ID", "test-session-456")
	req.Header.Set("X-CCGateway-Request-Policy", "strict")
	req.Header.Set("X-CCGateway-Native-Tools", "true")

	w := httptest.NewRecorder()
	server.engine.ServeHTTP(w, req)

	require.NotNil(t, capturedReq)
	assert.Equal(t, "test-session-456", capturedReq.SessionID)
	assert.Equal(t, "strict", capturedReq.RequestPolicy)
	assert.Equal(t, "true", capturedReq.NativeTools)
}

// TestShutdown 测试优雅关闭
func TestShutdown(t *testing.T) {
	worker := &mockWorker{}
	server := New(worker, 8788)

	// 未启动的服务器应该可以关闭
	ctx, cancel := context.WithTimeout(context.Background(), 1*time.Second)
	defer cancel()

	err := server.Shutdown(ctx)
	assert.NoError(t, err)
}

// BenchmarkHandleMessages 消息处理性能基准测试
func BenchmarkHandleMessages(b *testing.B) {
	worker := &mockWorker{
		executeFunc: func(ctx context.Context, req *types.Request) (*types.Response, error) {
			ch := make(chan types.Event, 1)
			errCh := make(chan error, 1)
			go func() {
				ch <- types.Event{Type: "message_stop", Data: json.RawMessage(`{}`)}
				close(ch)
				close(errCh)
			}()
			return &types.Response{StatusCode: 200, Body: ch, Err: errCh}, nil
		},
	}

	server := New(worker, 8788)

	reqBody := map[string]interface{}{
		"model":      "claude-opus-5",
		"max_tokens": 1024,
		"messages":   []map[string]string{{"role": "user", "content": "test"}},
	}
	body, _ := json.Marshal(reqBody)

	b.ResetTimer()
	for i := 0; i < b.N; i++ {
		req := httptest.NewRequest(http.MethodPost, "/v1/messages", bytes.NewReader(body))
		req.Header.Set("Content-Type", "application/json")
		w := httptest.NewRecorder()
		server.engine.ServeHTTP(w, req)
	}
}

// BenchmarkHandleHealth 健康检查性能基准测试
func BenchmarkHandleHealth(b *testing.B) {
	worker := &mockWorker{
		healthFunc: func(ctx context.Context) (*types.HealthStatus, error) {
			return &types.HealthStatus{Status: "healthy"}, nil
		},
	}

	server := New(worker, 8788)

	b.ResetTimer()
	for i := 0; i < b.N; i++ {
		req := httptest.NewRequest(http.MethodGet, "/health", nil)
		w := httptest.NewRecorder()
		server.engine.ServeHTTP(w, req)
	}
}
