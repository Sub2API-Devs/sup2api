package history

import (
	"context"
	"crypto/sha256"
	"encoding/hex"
	"encoding/json"
	"errors"
	"fmt"
	"os"
	"path/filepath"
	"sync"

	"github.com/yourusername/ccgateway-worker/pkg/types"
)

var (
	// ErrNoMatch 历史匹配失败
	ErrNoMatch = errors.New("no matching session found")
)

// Store 历史存储接口
type Store interface {
	Match(ctx context.Context, messages []types.Message) (*types.Session, error)
	Import(ctx context.Context, messages []types.Message) (*types.Session, error)
	Save(ctx context.Context, session *types.Session) error
}

// store 历史存储实现
type store struct {
	mu         sync.RWMutex      // 保护 index 的并发访问
	historyDir string
	indexPath  string
	index      map[string]string // fingerprint -> native_id
}

// NewStore 创建新的历史存储
func NewStore(historyDir string) (Store, error) {
	if err := os.MkdirAll(historyDir, 0755); err != nil {
		return nil, fmt.Errorf("create history dir: %w", err)
	}

	indexPath := filepath.Join(historyDir, ".fingerprints.json")

	s := &store{
		historyDir: historyDir,
		indexPath:  indexPath,
		index:      make(map[string]string),
	}

	// 加载索引
	if err := s.loadIndex(); err != nil && !os.IsNotExist(err) {
		return nil, fmt.Errorf("load index: %w", err)
	}

	return s, nil
}

// Match 匹配客户端历史到原生会话
func (s *store) Match(ctx context.Context, messages []types.Message) (*types.Session, error) {
	if len(messages) == 0 {
		return nil, ErrNoMatch
	}

	// 计算指纹
	fingerprint := computeFingerprint(messages)

	// 查询索引（读锁）
	s.mu.RLock()
	nativeID, ok := s.index[fingerprint]
	s.mu.RUnlock()

	if !ok {
		return nil, ErrNoMatch
	}

	// 验证会话文件存在
	sessionPath := filepath.Join(s.historyDir, nativeID)
	if _, err := os.Stat(sessionPath); err != nil {
		// 会话文件不存在，清理索引（写锁）
		s.mu.Lock()
		delete(s.index, fingerprint)
		s.mu.Unlock()
		_ = s.saveIndex()
		return nil, ErrNoMatch
	}

	return &types.Session{
		ID:       fingerprint,
		NativeID: nativeID,
		Mode:     "prefix-hit",
	}, nil
}

// Import 导入完整历史，创建新会话
func (s *store) Import(ctx context.Context, messages []types.Message) (*types.Session, error) {
	fingerprint := computeFingerprint(messages)

	// 创建快照文件
	snapshotPath, err := s.createSnapshot(messages)
	if err != nil {
		return nil, fmt.Errorf("create snapshot: %w", err)
	}

	return &types.Session{
		ID:           fingerprint,
		SnapshotPath: snapshotPath,
		Mode:         "rebuild",
	}, nil
}

// Save 保存会话状态
func (s *store) Save(ctx context.Context, session *types.Session) error {
	if session.Mode == "prefix-hit" && session.NativeID != "" {
		// 确保会话目录存在
		sessionPath := filepath.Join(s.historyDir, session.NativeID)
		if err := os.MkdirAll(sessionPath, 0755); err != nil {
			return fmt.Errorf("create session dir: %w", err)
		}

		s.mu.Lock()
		s.index[session.ID] = session.NativeID
		s.mu.Unlock()
		return s.saveIndex()
	}
	return nil
}

// computeFingerprint 计算消息历史的指纹
func computeFingerprint(messages []types.Message) string {
	// 规范化消息（只保留 role 和 content）
	normalized := make([]map[string]interface{}, len(messages))
	for i, msg := range messages {
		normalized[i] = map[string]interface{}{
			"role":    msg.Role,
			"content": string(msg.Content),
		}
	}

	// 序列化
	data, _ := json.Marshal(normalized)

	// 计算 SHA256
	hash := sha256.Sum256(data)
	return hex.EncodeToString(hash[:])
}

// createSnapshot 创建会话快照
func (s *store) createSnapshot(messages []types.Message) (string, error) {
	fingerprint := computeFingerprint(messages)
	snapshotPath := filepath.Join(s.historyDir, fmt.Sprintf("snapshot-%s.json", fingerprint[:16]))

	// 构建快照数据
	snapshot := map[string]interface{}{
		"messages": messages,
		"metadata": map[string]interface{}{
			"fingerprint": fingerprint,
			"imported":    true,
		},
	}

	data, err := json.MarshalIndent(snapshot, "", "  ")
	if err != nil {
		return "", fmt.Errorf("marshal snapshot: %w", err)
	}

	if err := os.WriteFile(snapshotPath, data, 0644); err != nil {
		return "", fmt.Errorf("write snapshot: %w", err)
	}

	return snapshotPath, nil
}

// loadIndex 加载指纹索引
func (s *store) loadIndex() error {
	data, err := os.ReadFile(s.indexPath)
	if err != nil {
		return err
	}

	s.mu.Lock()
	defer s.mu.Unlock()
	return json.Unmarshal(data, &s.index)
}

// saveIndex 保存指纹索引
func (s *store) saveIndex() error {
	s.mu.RLock()
	data, err := json.MarshalIndent(s.index, "", "  ")
	s.mu.RUnlock()

	if err != nil {
		return err
	}

	return os.WriteFile(s.indexPath, data, 0644)
}
