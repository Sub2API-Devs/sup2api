package worker

import (
	"context"
	"encoding/json"
	"fmt"
	"time"

	"github.com/yourusername/ccgateway-worker/internal/cli"
	"github.com/yourusername/ccgateway-worker/internal/config"
	"github.com/yourusername/ccgateway-worker/internal/history"
	"github.com/yourusername/ccgateway-worker/pkg/types"
)

// Worker CCGateway Worker 核心接口
type Worker interface {
	Execute(ctx context.Context, req *types.Request) (*types.Response, error)
	Health(ctx context.Context) (*types.HealthStatus, error)
	Close() error
}

// impl Worker 接口实现
type impl struct {
	id           string
	cliPath      string
	cliVersion   string
	pluginPath   string
	historyStore history.Store
	cliManager   cli.Manager
	startTime    time.Time
}

// New 创建新的 Worker
func New(cfg *config.Config) (Worker, error) {
	// 创建历史存储
	historyStore, err := history.NewStore(cfg.HistoryDir)
	if err != nil {
		return nil, fmt.Errorf("create history store: %w", err)
	}

	// 创建 CLI 管理器
	cliManager := cli.NewManager(cfg.CLIPath, cfg.CLIVersion)

	return &impl{
		id:           cfg.WorkerID,
		cliPath:      cfg.CLIPath,
		cliVersion:   cfg.CLIVersion,
		pluginPath:   cfg.PluginPath,
		historyStore: historyStore,
		cliManager:   cliManager,
		startTime:    time.Now(),
	}, nil
}

// Execute 执行请求
func (w *impl) Execute(ctx context.Context, req *types.Request) (*types.Response, error) {
	// 1. 匹配历史
	session, err := w.matchHistory(ctx, req)
	if err != nil {
		return nil, fmt.Errorf("match history: %w", err)
	}

	// 2. 构建 CLI 参数和环境变量
	args := w.buildCLIArgs(req, session)
	env := w.buildCLIEnv(req)

	// 3. 启动 CLI 进程
	proc, err := w.cliManager.Start(ctx, args, env)
	if err != nil {
		return nil, fmt.Errorf("start CLI: %w", err)
	}

	// 4. 发送请求到 stdin
	if err := w.writeRequest(proc, req); err != nil {
		proc.Kill()
		return nil, fmt.Errorf("write request: %w", err)
	}

	// 5. 解析流式输出
	eventCh := make(chan types.Event, 10)
	errCh := make(chan error, 1)

	go w.parseStream(proc, eventCh, errCh)

	return &types.Response{
		StatusCode: 200,
		Body:       eventCh,
		Err:        errCh,
	}, nil
}

// matchHistory 匹配客户端历史
func (w *impl) matchHistory(ctx context.Context, req *types.Request) (*types.Session, error) {
	// 尝试匹配现有会话
	session, err := w.historyStore.Match(ctx, req.Messages)
	if err == nil {
		return session, nil
	}

	// 匹配失败，导入完整历史
	return w.historyStore.Import(ctx, req.Messages)
}

// buildCLIArgs 构建 Claude CLI 参数（基于原始 ccgateway 的 cliArgs）
func (w *impl) buildCLIArgs(req *types.Request, session *types.Session) []string {
	// 基础参数（与原始 ccgateway 一致）
	args := []string{
		"-p",
		"--input-format", "stream-json",
		"--output-format", "stream-json",
		"--verbose",
		"--include-partial-messages",
		"--permission-prompt-tool", "stdio",
		"--tools", "",
		"--strict-mcp-config",
		"--mcp-config", `{"mcpServers":{}}`,
		"--setting-sources", "",
		"--settings", `{"disableAllHooks":false}`,
		"--disable-slash-commands",
		"--no-chrome",
		"--max-turns", "1",
		"--system-prompt-snapshot", "off",
	}

	// 模型参数（必须在前面，使用 --model= 格式防止注入）
	if req.Model != "" {
		args = append(args, "--model="+req.Model)
	}

	// 插件参数
	if w.pluginPath != "" {
		args = append(args, "--plugin-dir", w.pluginPath)
	}

	// 会话恢复参数（与原始 ccgateway 逻辑一致）
	if session.SnapshotPath != "" {
		// 有历史文件路径，使用 --resume
		args = append(args, "--resume", session.SnapshotPath)
		if session.Anchor != "" {
			args = append(args, "--resume-session-at", session.Anchor)
		}
		if session.Fork {
			args = append(args, "--fork-session", "--session-id", session.NativeID)
		}
	} else {
		// 新会话，仅指定 session ID
		args = append(args, "--session-id", session.NativeID)
	}

	return args
}

// buildCLIEnv 构建 CLI 环境变量
func (w *impl) buildCLIEnv(req *types.Request) map[string]string {
	env := map[string]string{
		"CLAUDE_CODE_MAX_OUTPUT_TOKENS":            fmt.Sprintf("%d", req.MaxTokens),
		"DISABLE_AUTOUPDATER":                      "1",
		"DISABLE_AUTO_COMPACT":                     "1",
		"CLAUDE_CODE_DISABLE_NONESSENTIAL_TRAFFIC": "1",
		"CLAUDE_CODE_DISABLE_CLAUDE_MDS":           "1",
		"CLAUDE_CODE_DISABLE_AUTO_MEMORY":          "1",
		"ENABLE_TOOL_SEARCH":                       "false",
		"CLAUDE_CODE_ENABLE_PROMPT_SUGGESTION":     "0",
	}

	return env
}

// writeRequest 向 CLI stdin 写入请求
func (w *impl) writeRequest(proc cli.Process, req *types.Request) error {
	stdin := proc.Stdin()
	defer stdin.Close()

	// 提取最后一条消息的文本内容
	lastMsg := req.Messages[len(req.Messages)-1]

	var content interface{}
	if err := json.Unmarshal(lastMsg.Content, &content); err != nil {
		return fmt.Errorf("unmarshal content: %w", err)
	}

	text := ""
	if str, ok := content.(string); ok {
		text = str
	} else if blocks, ok := content.([]interface{}); ok && len(blocks) > 0 {
		if block, ok := blocks[0].(map[string]interface{}); ok {
			if t, ok := block["text"].(string); ok {
				text = t
			}
		}
	}

	// 发送用户消息
	_, err := stdin.Write([]byte(text))
	return err
}

// parseStream 解析 CLI 输出流
func (w *impl) parseStream(proc cli.Process, eventCh chan<- types.Event, errCh chan<- error) {
	defer close(eventCh)
	defer close(errCh)

	reader := proc.Stdout()
	defer reader.Close()

	decoder := cli.NewStreamDecoder(reader)
	for {
		event, err := decoder.Next()
		if err != nil {
			if err.Error() != "EOF" {
				errCh <- err
			}
			break
		}

		eventCh <- *event
	}

	if err := proc.Wait(); err != nil {
		errCh <- fmt.Errorf("CLI process error: %w", err)
	}
}

// Health 健康检查
func (w *impl) Health(ctx context.Context) (*types.HealthStatus, error) {
	return &types.HealthStatus{
		Status:     "healthy",
		WorkerID:   w.id,
		CLIVersion: w.cliVersion,
		Uptime:     int64(time.Since(w.startTime).Seconds()),
	}, nil
}

// Close 关闭 Worker
func (w *impl) Close() error {
	// 清理资源
	if w.historyStore != nil {
		if closer, ok := w.historyStore.(interface{ Close() error }); ok {
			return closer.Close()
		}
	}
	return nil
}
