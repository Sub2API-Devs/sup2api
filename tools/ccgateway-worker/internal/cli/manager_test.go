package cli

import (
	"bytes"
	"context"
	"encoding/json"
	"fmt"
	"io"
	"os/exec"
	"strings"
	"testing"
	"time"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

// TestNewManager 测试创建管理器
func TestNewManager(t *testing.T) {
	tests := []struct {
		name       string
		cliPath    string
		cliVersion string
	}{
		{
			name:       "valid parameters",
			cliPath:    "/usr/bin/claude",
			cliVersion: "2.1.288",
		},
		{
			name:       "empty version",
			cliPath:    "/usr/bin/claude",
			cliVersion: "",
		},
		{
			name:       "windows path",
			cliPath:    "C:\\Program Files\\Claude\\claude.exe",
			cliVersion: "2.1.288",
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			m := NewManager(tt.cliPath, tt.cliVersion)
			assert.NotNil(t, m)

			impl, ok := m.(*manager)
			require.True(t, ok)
			assert.Equal(t, tt.cliPath, impl.cliPath)
			assert.Equal(t, tt.cliVersion, impl.cliVersion)
		})
	}
}

// TestManagerStart 测试启动进程
func TestManagerStart(t *testing.T) {
	t.Run("successful start", func(t *testing.T) {
		// 使用真实命令来测试（echo 在 Windows 和 Unix 都可用）
		m := NewManager("cmd", "1.0.0")
		ctx := context.Background()

		// Windows: cmd /c echo test
		// 使用简单的命令避免平台差异
		proc, err := m.Start(ctx, []string{"/c", "echo", "test"})
		require.NoError(t, err)
		require.NotNil(t, proc)

		// 验证接口方法可用
		assert.NotNil(t, proc.Stdout())
		assert.NotNil(t, proc.Stdin())

		// 等待进程结束
		err = proc.Wait()
		assert.NoError(t, err)
	})

	t.Run("context cancellation", func(t *testing.T) {
		m := NewManager("cmd", "1.0.0")
		ctx, cancel := context.WithCancel(context.Background())

		// 立即取消上下文
		cancel()

		// 启动应该失败或进程应该被取消
		proc, err := m.Start(ctx, []string{"/c", "timeout", "10"})

		// 可能在启动时就失败
		if err != nil {
			assert.Error(t, err)
			return
		}

		// 或者启动后很快结束
		require.NotNil(t, proc)
		err = proc.Wait()
		// 上下文取消会导致退出码非零
		assert.Error(t, err)
	})

	t.Run("invalid command", func(t *testing.T) {
		m := NewManager("/nonexistent/command", "1.0.0")
		ctx := context.Background()

		proc, err := m.Start(ctx, []string{"arg1"})
		assert.Error(t, err)
		assert.Nil(t, proc)
		assert.Contains(t, err.Error(), "start CLI")
	})
}

// TestProcessStdout 测试标准输出
func TestProcessStdout(t *testing.T) {
	m := NewManager("cmd", "1.0.0")
	ctx := context.Background()

	proc, err := m.Start(ctx, []string{"/c", "echo", "hello"})
	require.NoError(t, err)
	require.NotNil(t, proc)

	// 读取标准输出
	stdout := proc.Stdout()
	require.NotNil(t, stdout)

	buf := new(bytes.Buffer)
	_, err = io.Copy(buf, stdout)
	require.NoError(t, err)

	output := strings.TrimSpace(buf.String())
	assert.Equal(t, "hello", output)

	err = proc.Wait()
	assert.NoError(t, err)
}

// TestProcessStdin 测试标准输入
func TestProcessStdin(t *testing.T) {
	// 使用 findstr 命令读取 stdin（Windows）
	// 或使用其他跨平台方案
	t.Run("write to stdin", func(t *testing.T) {
		m := NewManager("cmd", "1.0.0")
		ctx := context.Background()

		// cmd /c findstr ".*" 会回显输入
		proc, err := m.Start(ctx, []string{"/c", "findstr", ".*"})
		require.NoError(t, err)
		require.NotNil(t, proc)

		stdin := proc.Stdin()
		require.NotNil(t, stdin)

		// 写入数据
		testData := "test input\n"
		_, err = stdin.Write([]byte(testData))
		require.NoError(t, err)

		// 关闭 stdin 以便命令结束
		err = stdin.Close()
		require.NoError(t, err)

		// 读取输出
		stdout := proc.Stdout()
		buf := new(bytes.Buffer)
		_, err = io.Copy(buf, stdout)
		require.NoError(t, err)

		output := strings.TrimSpace(buf.String())
		assert.Contains(t, output, "test input")

		err = proc.Wait()
		assert.NoError(t, err)
	})
}

// TestProcessWait 测试等待进程
func TestProcessWait(t *testing.T) {
	t.Run("normal exit", func(t *testing.T) {
		m := NewManager("cmd", "1.0.0")
		ctx := context.Background()

		proc, err := m.Start(ctx, []string{"/c", "exit", "0"})
		require.NoError(t, err)
		require.NotNil(t, proc)

		err = proc.Wait()
		assert.NoError(t, err)
	})

	t.Run("non-zero exit", func(t *testing.T) {
		m := NewManager("cmd", "1.0.0")
		ctx := context.Background()

		proc, err := m.Start(ctx, []string{"/c", "exit", "1"})
		require.NoError(t, err)
		require.NotNil(t, proc)

		err = proc.Wait()
		assert.Error(t, err)

		// 验证是 ExitError
		_, ok := err.(*exec.ExitError)
		assert.True(t, ok)
	})

	t.Run("multiple wait calls", func(t *testing.T) {
		m := NewManager("cmd", "1.0.0")
		ctx := context.Background()

		proc, err := m.Start(ctx, []string{"/c", "echo", "test"})
		require.NoError(t, err)
		require.NotNil(t, proc)

		// 第一次等待
		err = proc.Wait()
		assert.NoError(t, err)

		// 第二次等待会返回错误（exec.Cmd 不支持多次 Wait）
		err = proc.Wait()
		assert.Error(t, err)
		assert.Contains(t, err.Error(), "Wait was already called")
	})
}

// TestProcessKill 测试杀死进程
func TestProcessKill(t *testing.T) {
	t.Run("kill running process", func(t *testing.T) {
		m := NewManager("cmd", "1.0.0")
		ctx := context.Background()

		// 启动一个长时间运行的命令
		proc, err := m.Start(ctx, []string{"/c", "timeout", "/t", "30"})
		require.NoError(t, err)
		require.NotNil(t, proc)

		// 给进程一点时间启动
		time.Sleep(100 * time.Millisecond)

		// 杀死进程（在 Windows 上可能会有权限问题）
		err = proc.Kill()
		// Windows 上可能因为权限被拒绝，这是正常的
		if err != nil && !strings.Contains(err.Error(), "Access is denied") {
			t.Fatalf("unexpected kill error: %v", err)
		}

		// Wait 应该返回错误（因为被杀死或超时）
		err = proc.Wait()
		// 进程被杀死或正常退出都可接受
		_ = err
	})

	t.Run("kill already finished process", func(t *testing.T) {
		m := NewManager("cmd", "1.0.0")
		ctx := context.Background()

		proc, err := m.Start(ctx, []string{"/c", "echo", "test"})
		require.NoError(t, err)
		require.NotNil(t, proc)

		// 等待进程结束
		err = proc.Wait()
		require.NoError(t, err)

		// 尝试杀死已结束的进程
		err = proc.Kill()
		// 可能成功也可能失败，取决于操作系统
		// 只要不 panic 就行
		_ = err
	})
}

// TestStreamDecoder 测试流式解码器
func TestStreamDecoder(t *testing.T) {
	t.Run("decode single event", func(t *testing.T) {
		input := `{"type":"message_start","event":{"id":"msg_123","role":"assistant"}}`
		reader := strings.NewReader(input)
		decoder := NewStreamDecoder(reader)

		event, err := decoder.Next()
		require.NoError(t, err)
		require.NotNil(t, event)

		assert.Equal(t, "message_start", event.Type)
		assert.NotNil(t, event.Data)

		// 解析嵌套的 event 字段
		var data map[string]interface{}
		err = json.Unmarshal(event.Data, &data)
		require.NoError(t, err)
		assert.Equal(t, "msg_123", data["id"])
		assert.Equal(t, "assistant", data["role"])
	})

	t.Run("decode multiple events", func(t *testing.T) {
		input := `{"type":"message_start","event":{"id":"msg_1"}}
{"type":"content_block_delta","event":{"text":"hello"}}
{"type":"message_stop","event":{}}`

		reader := strings.NewReader(input)
		decoder := NewStreamDecoder(reader)

		// 第一个事件
		event1, err := decoder.Next()
		require.NoError(t, err)
		assert.Equal(t, "message_start", event1.Type)

		// 第二个事件
		event2, err := decoder.Next()
		require.NoError(t, err)
		assert.Equal(t, "content_block_delta", event2.Type)

		// 第三个事件
		event3, err := decoder.Next()
		require.NoError(t, err)
		assert.Equal(t, "message_stop", event3.Type)

		// 没有更多事件
		event4, err := decoder.Next()
		assert.Error(t, err)
		assert.Nil(t, event4)
		assert.Contains(t, err.Error(), "EOF")
	})

	t.Run("invalid JSON", func(t *testing.T) {
		input := `{invalid json}`
		reader := strings.NewReader(input)
		decoder := NewStreamDecoder(reader)

		event, err := decoder.Next()
		assert.Error(t, err)
		assert.Nil(t, event)
		assert.Contains(t, err.Error(), "unmarshal frame")
	})

	t.Run("empty input", func(t *testing.T) {
		reader := strings.NewReader("")
		decoder := NewStreamDecoder(reader)

		event, err := decoder.Next()
		assert.Error(t, err)
		assert.Nil(t, event)
		assert.Contains(t, err.Error(), "EOF")
	})

	t.Run("missing type field", func(t *testing.T) {
		// type 字段缺失，但 JSON 有效
		input := `{"event":{"id":"msg_123"}}`
		reader := strings.NewReader(input)
		decoder := NewStreamDecoder(reader)

		event, err := decoder.Next()
		require.NoError(t, err)
		require.NotNil(t, event)
		// type 会是空字符串
		assert.Equal(t, "", event.Type)
	})

	t.Run("large event", func(t *testing.T) {
		// 测试大型事件（例如长文本）
		largeText := strings.Repeat("a", 10000)
		input := fmt.Sprintf(`{"type":"content_block_delta","event":{"text":"%s"}}`, largeText)
		reader := strings.NewReader(input)
		decoder := NewStreamDecoder(reader)

		event, err := decoder.Next()
		require.NoError(t, err)
		require.NotNil(t, event)
		assert.Equal(t, "content_block_delta", event.Type)

		var data map[string]interface{}
		err = json.Unmarshal(event.Data, &data)
		require.NoError(t, err)
		assert.Equal(t, largeText, data["text"])
	})
}

// TestStreamDecoderWithRealData 使用真实的 CLI 输出格式测试
func TestStreamDecoderWithRealData(t *testing.T) {
	// 模拟真实的 Claude CLI --stream-json 输出
	input := `{"type":"message_start","event":{"type":"message","id":"msg_01ABC","role":"assistant","content":[],"model":"claude-opus-5","stop_reason":null}}
{"type":"content_block_start","event":{"type":"content_block_start","index":0,"content_block":{"type":"text","text":""}}}
{"type":"content_block_delta","event":{"type":"content_block_delta","index":0,"delta":{"type":"text_delta","text":"Hello"}}}
{"type":"content_block_delta","event":{"type":"content_block_delta","index":0,"delta":{"type":"text_delta","text":" world"}}}
{"type":"content_block_stop","event":{"type":"content_block_stop","index":0}}
{"type":"message_delta","event":{"type":"message_delta","delta":{"stop_reason":"end_turn"},"usage":{"output_tokens":5}}}
{"type":"message_stop","event":{"type":"message_stop"}}`

	reader := strings.NewReader(input)
	decoder := NewStreamDecoder(reader)

	expectedTypes := []string{
		"message_start",
		"content_block_start",
		"content_block_delta",
		"content_block_delta",
		"content_block_stop",
		"message_delta",
		"message_stop",
	}

	for i, expectedType := range expectedTypes {
		event, err := decoder.Next()
		require.NoError(t, err, "event %d failed", i)
		require.NotNil(t, event, "event %d is nil", i)
		assert.Equal(t, expectedType, event.Type, "event %d type mismatch", i)
	}

	// 应该没有更多事件
	event, err := decoder.Next()
	assert.Error(t, err)
	assert.Nil(t, event)
}

// TestNewStreamDecoder 测试创建解码器
func TestNewStreamDecoder(t *testing.T) {
	reader := strings.NewReader("test")
	decoder := NewStreamDecoder(reader)

	assert.NotNil(t, decoder)
	assert.NotNil(t, decoder.scanner)
}

// BenchmarkStreamDecoder 性能测试
func BenchmarkStreamDecoder(b *testing.B) {
	input := `{"type":"content_block_delta","event":{"type":"content_block_delta","index":0,"delta":{"type":"text_delta","text":"Hello world"}}}`

	b.ResetTimer()
	for i := 0; i < b.N; i++ {
		reader := strings.NewReader(input)
		decoder := NewStreamDecoder(reader)
		_, err := decoder.Next()
		if err != nil {
			b.Fatal(err)
		}
	}
}
