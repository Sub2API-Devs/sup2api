//go:build integration
// +build integration

package integration

import (
	"bufio"
	"bytes"
	"context"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"os"
	"strings"
	"testing"
	"time"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
	"github.com/yourusername/ccgateway-worker/pkg/types"
)

// testClient 集成测试客户端
type testClient struct {
	baseURL    string
	httpClient *http.Client
}

// newTestClient 创建测试客户端
func newTestClient(t *testing.T) *testClient {
	baseURL := os.Getenv("TEST_WORKER_URL")
	if baseURL == "" {
		baseURL = "http://localhost:8788"
	}

	timeout := 30 * time.Second
	if timeoutStr := os.Getenv("TEST_TIMEOUT"); timeoutStr != "" {
		if d, err := time.ParseDuration(timeoutStr); err == nil {
			timeout = d
		}
	}

	return &testClient{
		baseURL: baseURL,
		httpClient: &http.Client{
			Timeout: timeout,
		},
	}
}

// Close 关闭客户端
func (c *testClient) Close() {
	c.httpClient.CloseIdleConnections()
}

// Health 健康检查
func (c *testClient) Health(t *testing.T) *types.HealthStatus {
	resp, err := c.httpClient.Get(c.baseURL + "/health")
	require.NoError(t, err)
	defer resp.Body.Close()

	require.Equal(t, http.StatusOK, resp.StatusCode)

	var status types.HealthStatus
	err = json.NewDecoder(resp.Body).Decode(&status)
	require.NoError(t, err)

	return &status
}

// PostMessages 发送 /v1/messages 请求
func (c *testClient) PostMessages(t *testing.T, req *types.Request, headers map[string]string) *messagesResponse {
	body, err := json.Marshal(req)
	require.NoError(t, err)

	httpReq, err := http.NewRequest("POST", c.baseURL+"/v1/messages", bytes.NewReader(body))
	require.NoError(t, err)

	httpReq.Header.Set("Content-Type", "application/json")
	for k, v := range headers {
		httpReq.Header.Set(k, v)
	}

	resp, err := c.httpClient.Do(httpReq)
	require.NoError(t, err)

	return &messagesResponse{
		StatusCode: resp.StatusCode,
		Body:       resp.Body,
		Headers:    resp.Header,
	}
}

// messagesResponse /v1/messages 响应
type messagesResponse struct {
	StatusCode int
	Body       io.ReadCloser
	Headers    http.Header
}

// Close 关闭响应
func (r *messagesResponse) Close() {
	if r.Body != nil {
		r.Body.Close()
	}
}

// ReadEvents 读取 SSE 事件流
func (r *messagesResponse) ReadEvents(t *testing.T) []types.Event {
	defer r.Close()

	var events []types.Event
	scanner := bufio.NewScanner(r.Body)

	var currentEvent types.Event
	for scanner.Scan() {
		line := scanner.Text()

		if strings.HasPrefix(line, "event: ") {
			currentEvent.Type = strings.TrimPrefix(line, "event: ")
		} else if strings.HasPrefix(line, "data: ") {
			currentEvent.Data = json.RawMessage(strings.TrimPrefix(line, "data: "))
		} else if line == "" && currentEvent.Type != "" {
			// 事件结束
			events = append(events, currentEvent)
			currentEvent = types.Event{}
		}
	}

	require.NoError(t, scanner.Err())
	return events
}

// TestIntegration_HealthCheck 测试健康检查
func TestIntegration_HealthCheck(t *testing.T) {
	client := newTestClient(t)
	defer client.Close()

	status := client.Health(t)

	assert.Equal(t, "healthy", status.Status)
	assert.NotEmpty(t, status.WorkerID)
	assert.NotEmpty(t, status.CLIVersion)
	assert.GreaterOrEqual(t, status.Uptime, int64(0))
}

// TestIntegration_SimpleRequest 测试简单请求
func TestIntegration_SimpleRequest(t *testing.T) {
	client := newTestClient(t)
	defer client.Close()

	req := &types.Request{
		Model:     "claude-sonnet-4",
		MaxTokens: 100,
		Messages: []types.Message{
			{
				Role:    "user",
				Content: json.RawMessage(`"Hello, respond with just 'Hi'"`),
			},
		},
	}

	resp := client.PostMessages(t, req, nil)
	assert.Equal(t, http.StatusOK, resp.StatusCode)
	assert.Equal(t, "text/event-stream", resp.Headers.Get("Content-Type"))

	events := resp.ReadEvents(t)
	assert.NotEmpty(t, events)

	// 验证至少有 message_start 和 message_stop
	eventTypes := make(map[string]bool)
	for _, event := range events {
		eventTypes[event.Type] = true
	}

	assert.True(t, eventTypes["message_start"], "应该有 message_start 事件")
	assert.True(t, eventTypes["message_stop"], "应该有 message_stop 事件")
}

// TestIntegration_RequestWithSystem 测试带系统提示的请求
func TestIntegration_RequestWithSystem(t *testing.T) {
	client := newTestClient(t)
	defer client.Close()

	req := &types.Request{
		Model:     "claude-sonnet-4",
		MaxTokens: 100,
		System:    json.RawMessage(`"You are a helpful assistant."`),
		Messages: []types.Message{
			{
				Role:    "user",
				Content: json.RawMessage(`"What is 2+2?"`),
			},
		},
	}

	resp := client.PostMessages(t, req, nil)
	assert.Equal(t, http.StatusOK, resp.StatusCode)

	events := resp.ReadEvents(t)
	assert.NotEmpty(t, events)
}

// TestIntegration_SessionMatching 测试会话匹配
func TestIntegration_SessionMatching(t *testing.T) {
	client := newTestClient(t)
	defer client.Close()

	sessionID := fmt.Sprintf("test-session-%d", time.Now().Unix())

	req := &types.Request{
		Model:     "claude-sonnet-4",
		MaxTokens: 50,
		Messages: []types.Message{
			{
				Role:    "user",
				Content: json.RawMessage(`"First message"`),
			},
		},
	}

	headers := map[string]string{
		"X-CCGateway-Session-ID": sessionID,
	}

	// 第一次请求
	resp1 := client.PostMessages(t, req, headers)
	assert.Equal(t, http.StatusOK, resp1.StatusCode)
	events1 := resp1.ReadEvents(t)
	assert.NotEmpty(t, events1)

	// 第二次请求，应该匹配已有会话
	time.Sleep(1 * time.Second) // 等待会话保存

	req.Messages = append(req.Messages, types.Message{
		Role:    "assistant",
		Content: json.RawMessage(`"Response"`),
	}, types.Message{
		Role:    "user",
		Content: json.RawMessage(`"Second message"`),
	})

	resp2 := client.PostMessages(t, req, headers)
	assert.Equal(t, http.StatusOK, resp2.StatusCode)
	events2 := resp2.ReadEvents(t)
	assert.NotEmpty(t, events2)
}

// TestIntegration_InvalidRequest 测试无效请求
func TestIntegration_InvalidRequest(t *testing.T) {
	client := newTestClient(t)
	defer client.Close()

	tests := []struct {
		name       string
		req        *types.Request
		wantStatus int
	}{
		{
			name: "missing model",
			req: &types.Request{
				MaxTokens: 100,
				Messages: []types.Message{
					{Role: "user", Content: json.RawMessage(`"test"`)},
				},
			},
			wantStatus: http.StatusBadRequest,
		},
		{
			name: "missing messages",
			req: &types.Request{
				Model:     "claude-sonnet-4",
				MaxTokens: 100,
				Messages:  []types.Message{},
			},
			wantStatus: http.StatusBadRequest,
		},
		{
			name: "missing max_tokens",
			req: &types.Request{
				Model: "claude-sonnet-4",
				Messages: []types.Message{
					{Role: "user", Content: json.RawMessage(`"test"`)},
				},
			},
			wantStatus: http.StatusBadRequest,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			resp := client.PostMessages(t, tt.req, nil)
			defer resp.Close()
			assert.Equal(t, tt.wantStatus, resp.StatusCode)
		})
	}
}

// TestIntegration_ConcurrentRequests 测试并发请求
func TestIntegration_ConcurrentRequests(t *testing.T) {
	if testing.Short() {
		t.Skip("跳过并发测试")
	}

	client := newTestClient(t)
	defer client.Close()

	concurrency := 5
	done := make(chan bool, concurrency)

	for i := 0; i < concurrency; i++ {
		go func(id int) {
			req := &types.Request{
				Model:     "claude-sonnet-4",
				MaxTokens: 50,
				Messages: []types.Message{
					{
						Role:    "user",
						Content: json.RawMessage(fmt.Sprintf(`"Request %d"`, id)),
					},
				},
			}

			resp := client.PostMessages(t, req, nil)
			assert.Equal(t, http.StatusOK, resp.StatusCode)

			events := resp.ReadEvents(t)
			assert.NotEmpty(t, events)

			done <- true
		}(i)
	}

	// 等待所有请求完成
	ctx, cancel := context.WithTimeout(context.Background(), 2*time.Minute)
	defer cancel()

	for i := 0; i < concurrency; i++ {
		select {
		case <-done:
			// 成功
		case <-ctx.Done():
			t.Fatal("并发请求超时")
		}
	}
}

// TestIntegration_Timeout 测试超时
func TestIntegration_Timeout(t *testing.T) {
	if testing.Short() {
		t.Skip("跳过超时测试")
	}

	// 创建短超时的客户端
	client := &testClient{
		baseURL: os.Getenv("TEST_WORKER_URL"),
		httpClient: &http.Client{
			Timeout: 1 * time.Second, // 很短的超时
		},
	}
	if client.baseURL == "" {
		client.baseURL = "http://localhost:8788"
	}
	defer client.Close()

	req := &types.Request{
		Model:     "claude-sonnet-4",
		MaxTokens: 1000, // 大 token 数可能导致较长响应
		Messages: []types.Message{
			{
				Role:    "user",
				Content: json.RawMessage(`"Write a long essay"`),
			},
		},
	}

	// 应该超时或成功，但不应崩溃
	resp := client.PostMessages(t, req, nil)
	defer resp.Close()

	// 不严格断言结果，只确保不崩溃
	assert.True(t, resp.StatusCode > 0)
}

// TestIntegration_StreamingResponse 测试流式响应
func TestIntegration_StreamingResponse(t *testing.T) {
	client := newTestClient(t)
	defer client.Close()

	req := &types.Request{
		Model:     "claude-sonnet-4",
		MaxTokens: 200,
		Messages: []types.Message{
			{
				Role:    "user",
				Content: json.RawMessage(`"Count from 1 to 5"`),
			},
		},
	}

	resp := client.PostMessages(t, req, nil)
	assert.Equal(t, http.StatusOK, resp.StatusCode)

	// 验证是流式响应
	assert.Equal(t, "text/event-stream", resp.Headers.Get("Content-Type"))
	assert.Equal(t, "no-cache", resp.Headers.Get("Cache-Control"))
	assert.Equal(t, "keep-alive", resp.Headers.Get("Connection"))

	events := resp.ReadEvents(t)
	assert.NotEmpty(t, events)

	// 验证事件顺序
	if len(events) > 0 {
		assert.Equal(t, "message_start", events[0].Type)
		assert.Equal(t, "message_stop", events[len(events)-1].Type)
	}
}
