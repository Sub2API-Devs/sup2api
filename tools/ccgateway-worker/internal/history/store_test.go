package history

import (
	"context"
	"encoding/json"
	"os"
	"path/filepath"
	"testing"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
	"github.com/yourusername/ccgateway-worker/pkg/types"
)

func TestNewStore(t *testing.T) {
	tmpDir := t.TempDir()

	store, err := NewStore(tmpDir)
	require.NoError(t, err)
	assert.NotNil(t, store)

	// 验证目录已创建
	_, err = os.Stat(tmpDir)
	assert.NoError(t, err)
}

func TestComputeFingerprint(t *testing.T) {
	messages := []types.Message{
		{Role: "user", Content: json.RawMessage(`"Hello"`)},
		{Role: "assistant", Content: json.RawMessage(`"Hi there"`)},
	}

	fp1 := computeFingerprint(messages)
	fp2 := computeFingerprint(messages)

	// 相同消息应该产生相同指纹
	assert.Equal(t, fp1, fp2)
	assert.NotEmpty(t, fp1)

	// 不同消息应该产生不同指纹
	messages2 := []types.Message{
		{Role: "user", Content: json.RawMessage(`"Different"`)},
	}
	fp3 := computeFingerprint(messages2)
	assert.NotEqual(t, fp1, fp3)
}

func TestMatch(t *testing.T) {
	tmpDir := t.TempDir()
	s, err := NewStore(tmpDir)
	require.NoError(t, err)

	messages := []types.Message{
		{Role: "user", Content: json.RawMessage(`"Hello"`)},
	}

	ctx := context.Background()

	// 首次匹配应该失败
	_, err = s.Match(ctx, messages)
	assert.ErrorIs(t, err, ErrNoMatch)

	// 添加到索引
	fingerprint := computeFingerprint(messages)
	nativeID := "test-session-123"
	s.(*store).index[fingerprint] = nativeID

	// 创建会话目录
	sessionPath := filepath.Join(tmpDir, nativeID)
	err = os.MkdirAll(sessionPath, 0755)
	require.NoError(t, err)

	// 再次匹配应该成功
	session, err := s.Match(ctx, messages)
	require.NoError(t, err)
	assert.Equal(t, nativeID, session.NativeID)
	assert.Equal(t, "prefix-hit", session.Mode)
}

func TestImport(t *testing.T) {
	tmpDir := t.TempDir()
	s, err := NewStore(tmpDir)
	require.NoError(t, err)

	messages := []types.Message{
		{Role: "user", Content: json.RawMessage(`"Hello"`)},
		{Role: "assistant", Content: json.RawMessage(`"Hi"`)},
	}

	ctx := context.Background()

	session, err := s.(*store).Import(ctx, messages)
	require.NoError(t, err)
	assert.NotEmpty(t, session.ID)
	assert.NotEmpty(t, session.SnapshotPath)
	assert.Equal(t, "rebuild", session.Mode)

	// 验证快照文件已创建
	_, err = os.Stat(session.SnapshotPath)
	assert.NoError(t, err)

	// 验证快照内容
	data, err := os.ReadFile(session.SnapshotPath)
	require.NoError(t, err)

	var snapshot map[string]interface{}
	err = json.Unmarshal(data, &snapshot)
	require.NoError(t, err)

	assert.Contains(t, snapshot, "messages")
	assert.Contains(t, snapshot, "metadata")
}

func TestSave(t *testing.T) {
	tmpDir := t.TempDir()
	s, err := NewStore(tmpDir)
	require.NoError(t, err)

	ctx := context.Background()

	session := &types.Session{
		ID:       "test-fingerprint",
		NativeID: "native-session-123",
		Mode:     "prefix-hit",
	}

	err = s.Save(ctx, session)
	require.NoError(t, err)

	// 验证索引已更新
	impl := s.(*store)
	assert.Equal(t, session.NativeID, impl.index[session.ID])

	// 验证索引文件已保存
	indexPath := filepath.Join(tmpDir, ".fingerprints.json")
	_, err = os.Stat(indexPath)
	assert.NoError(t, err)
}

func TestLoadAndSaveIndex(t *testing.T) {
	tmpDir := t.TempDir()
	indexPath := filepath.Join(tmpDir, ".fingerprints.json")

	// 创建测试索引
	testIndex := map[string]string{
		"fp1": "session1",
		"fp2": "session2",
	}

	data, err := json.MarshalIndent(testIndex, "", "  ")
	require.NoError(t, err)

	err = os.WriteFile(indexPath, data, 0644)
	require.NoError(t, err)

	// 加载索引
	s1, err := NewStore(tmpDir)
	require.NoError(t, err)

	impl1 := s1.(*store)
	assert.Equal(t, "session1", impl1.index["fp1"])
	assert.Equal(t, "session2", impl1.index["fp2"])

	// 修改并保存
	impl1.index["fp3"] = "session3"
	err = impl1.saveIndex()
	require.NoError(t, err)

	// 重新加载验证
	s2, err := NewStore(tmpDir)
	require.NoError(t, err)

	impl2 := s2.(*store)
	assert.Equal(t, "session3", impl2.index["fp3"])
}
