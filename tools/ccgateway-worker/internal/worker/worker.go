package worker

import (
	"context"
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

	// 2. 构建 CLI 参数
	args := w.buildCLIArgs(req, session)

	// 3. 启动 CLI 进程
	proc, err := w.cliManager.Start(ctx, args)
	if err != nil {
		return nil, fmt.Errorf("start CLI: %w", err)
	}

	// 4. 解析流式输出
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

// buildCLIArgs 构建 Claude CLI 参数
func (w *impl) buildCLIArgs(req *types.Request, session *types.Session) []string {
	args := []string{
		"--stream-json",
		"--max-turns=1",
	}

	// 会话参数
	if session.Mode == "prefix-hit" && session.NativeID != "" {
		args = append(args, fmt.Sprintf("--session=%s", session.NativeID))
	} else if session.Mode == "rebuild" && session.SnapshotPath != "" {
		args = append(args, fmt.Sprintf("--import-snapshot=%s", session.SnapshotPath))
	}

	// 模型参数
	if req.Model != "" {
		args = append(args, fmt.Sprintf("--model=%s", req.Model))
	}

	// 插件参数
	if w.pluginPath != "" {
		args = append(args, fmt.Sprintf("--plugin=%s", w.pluginPath))
	}

	return args
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
