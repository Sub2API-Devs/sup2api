package history

import (
	"context"
	"crypto/rand"
	"encoding/hex"

	"github.com/yourusername/ccgateway-worker/pkg/types"
)

// Store 历史存储接口
type Store interface {
	Match(ctx context.Context, messages []types.Message) (*types.Session, error)
	Import(ctx context.Context, messages []types.Message) (*types.Session, error)
}

// simpleStore 简化版历史存储（第一版：每次都创建新会话）
type simpleStore struct {
	historyDir string
}

// NewStore 创建历史存储
func NewStore(historyDir string) (Store, error) {
	return &simpleStore{
		historyDir: historyDir,
	}, nil
}

// Match 尝试匹配现有会话（简化版：总是返回错误，表示需要新建）
func (s *simpleStore) Match(ctx context.Context, messages []types.Message) (*types.Session, error) {
	// 简化实现：第一版不做历史匹配，总是创建新会话
	return nil, ErrNoMatch
}

// Import 导入完整历史，创建新会话
func (s *simpleStore) Import(ctx context.Context, messages []types.Message) (*types.Session, error) {
	// 生成新的 session ID
	sessionID := generateUUID()

	return &types.Session{
		ID:           computeFingerprint(messages), // 客户端历史指纹
		NativeID:     sessionID,                    // CLI 原生会话 ID
		SnapshotPath: "",                           // 新会话无快照
		Anchor:       "",                           // 无锚点
		Fork:         false,                        // 不是 fork
		Mode:         "new",                        // 新会话模式
	}, nil
}

// generateUUID 生成 UUID
func generateUUID() string {
	var b [16]byte
	if _, e := rand.Read(b[:]); e != nil {
		panic(e)
	}
	b[6] = (b[6] & 15) | 64
	b[8] = (b[8] & 63) | 128
	s := hex.EncodeToString(b[:])
	return s[:8] + "-" + s[8:12] + "-" + s[12:16] + "-" + s[16:20] + "-" + s[20:]
}

// computeFingerprint 计算客户端历史指纹（简化版）
func computeFingerprint(messages []types.Message) string {
	// 简化实现：使用 UUID 作为指纹
	// 完整实现应该计算 messages 的 hash
	return generateUUID()
}

// ErrNoMatch 表示没有匹配的会话
var ErrNoMatch = &MatchError{msg: "no matching session"}

type MatchError struct {
	msg string
}

func (e *MatchError) Error() string {
	return e.msg
}
