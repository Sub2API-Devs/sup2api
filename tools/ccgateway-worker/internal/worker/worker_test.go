package worker

import (
	"context"
	"encoding/json"
	"testing"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/mock"
	"github.com/stretchr/testify/require"
	"github.com/yourusername/ccgateway-worker/internal/config"
	"github.com/yourusername/ccgateway-worker/pkg/types"
)

// MockHistoryStore 模拟历史存储
type MockHistoryStore struct {
	mock.Mock
}

func (m *MockHistoryStore) Match(ctx context.Context, messages []types.Message) (*types.Session, error) {
	args := m.Called(ctx, messages)
	if args.Get(0) == nil {
		return nil, args.Error(1)
	}
	return args.Get(0).(*types.Session), args.Error(1)
}

func (m *MockHistoryStore) Import(ctx context.Context, messages []types.Message) (*types.Session, error) {
	args := m.Called(ctx, messages)
	return args.Get(0).(*types.Session), args.Error(1)
}

func (m *MockHistoryStore) Save(ctx context.Context, session *types.Session) error {
	args := m.Called(ctx, session)
	return args.Error(0)
}

// MockCLIManager 模拟 CLI 管理器
type MockCLIManager struct {
	mock.Mock
}

func (m *MockCLIManager) Start(ctx context.Context, args []string) (interface{}, error) {
	callArgs := m.Called(ctx, args)
	return callArgs.Get(0), callArgs.Error(1)
}

func TestNew(t *testing.T) {
	tmpDir := t.TempDir()

	cfg := &config.Config{
		WorkerID:   "test-worker",
		Port:       8788,
		CLIPath:    "/usr/bin/claude",
		CLIVersion: "2.1.288",
		PluginPath: "/app/mod",
		ConfigDir:  tmpDir,
		HistoryDir: tmpDir,
		CacheDir:   tmpDir,
	}

	w, err := New(cfg)
	require.NoError(t, err)
	assert.NotNil(t, w)

	defer w.Close()
}

func TestBuildCLIArgs(t *testing.T) {
	tmpDir := t.TempDir()
	cfg := &config.Config{
		WorkerID:   "test",
		CLIPath:    "/usr/bin/claude",
		CLIVersion: "2.1.288",
		PluginPath: "/app/mod",
		HistoryDir: tmpDir,
	}

	w, err := New(cfg)
	require.NoError(t, err)
	defer w.Close()

	impl := w.(*impl)

	tests := []struct {
		name    string
		req     *types.Request
		session *types.Session
		want    []string
	}{
		{
			name: "prefix-hit mode",
			req: &types.Request{
				Model: "claude-opus-5-5",
			},
			session: &types.Session{
				NativeID: "session-123",
				Mode:     "prefix-hit",
			},
			want: []string{
				"--stream-json",
				"--max-turns=1",
				"--session=session-123",
				"--model=claude-opus-5-5",
				"--plugin=/app/mod",
			},
		},
		{
			name: "rebuild mode",
			req: &types.Request{
				Model: "claude-opus-5-5",
			},
			session: &types.Session{
				SnapshotPath: "/tmp/snapshot.json",
				Mode:         "rebuild",
			},
			want: []string{
				"--stream-json",
				"--max-turns=1",
				"--import-snapshot=/tmp/snapshot.json",
				"--model=claude-opus-5-5",
				"--plugin=/app/mod",
			},
		},
		{
			name: "new session",
			req: &types.Request{
				Model: "claude-sonnet-4",
			},
			session: &types.Session{
				Mode: "new",
			},
			want: []string{
				"--stream-json",
				"--max-turns=1",
				"--model=claude-sonnet-4",
				"--plugin=/app/mod",
			},
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			got := impl.buildCLIArgs(tt.req, tt.session)
			assert.Equal(t, tt.want, got)
		})
	}
}

func TestHealth(t *testing.T) {
	tmpDir := t.TempDir()
	cfg := &config.Config{
		WorkerID:   "test-worker",
		CLIPath:    "/usr/bin/claude",
		CLIVersion: "2.1.288",
		HistoryDir: tmpDir,
	}

	w, err := New(cfg)
	require.NoError(t, err)
	defer w.Close()

	ctx := context.Background()
	status, err := w.Health(ctx)
	require.NoError(t, err)

	assert.Equal(t, "healthy", status.Status)
	assert.Equal(t, "test-worker", status.WorkerID)
	assert.Equal(t, "2.1.288", status.CLIVersion)
	assert.GreaterOrEqual(t, status.Uptime, int64(0))
}

func TestMatchHistory(t *testing.T) {
	tmpDir := t.TempDir()
	cfg := &config.Config{
		WorkerID:   "test",
		CLIPath:    "/usr/bin/claude",
		HistoryDir: tmpDir,
	}

	w, err := New(cfg)
	require.NoError(t, err)
	defer w.Close()

	ctx := context.Background()
	messages := []types.Message{
		{Role: "user", Content: json.RawMessage(`"test message"`)},
	}

	req := &types.Request{
		Messages: messages,
	}

	impl := w.(*impl)

	// 第一次应该导入（没有匹配）
	session, err := impl.matchHistory(ctx, req)
	require.NoError(t, err)
	assert.Equal(t, "rebuild", session.Mode)

	// 保存会话
	session.NativeID = "native-123"
	session.Mode = "prefix-hit"
	err = impl.historyStore.Save(ctx, session)
	require.NoError(t, err)

	// 第二次应该匹配
	session2, err := impl.matchHistory(ctx, req)
	require.NoError(t, err)
	assert.Equal(t, "prefix-hit", session2.Mode)
	assert.Equal(t, "native-123", session2.NativeID)
}
