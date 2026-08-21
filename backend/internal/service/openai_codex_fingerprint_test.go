package service

import (
	"context"
	"encoding/json"
	"fmt"
	"net/http"
	"net/http/httptest"
	"strings"
	"sync"
	"testing"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
	"github.com/tidwall/gjson"
)

const testCodexFingerprintSeed = "11111111-1111-4111-8111-111111111111"

func newTestOAuthAccount(id int64, extra map[string]any) *Account {
	if codexFingerprintModeRequiresSeed(codexFingerprintModeFromExtra(extra)) {
		if extra == nil {
			extra = make(map[string]any)
		}
		if _, exists := extra[codexFingerprintSeedExtraKey]; !exists {
			extra[codexFingerprintSeedExtraKey] = testCodexFingerprintSeed
		}
	}
	return &Account{
		ID:       id,
		Platform: PlatformOpenAI,
		Type:     AccountTypeOAuth,
		Extra:    extra,
	}
}

// --- deriveStableUUIDv4 ---

func TestDeriveStableUUIDv4_Deterministic(t *testing.T) {
	a := deriveStableUUIDv4("test-seed-1")
	b := deriveStableUUIDv4("test-seed-1")
	assert.Equal(t, a, b, "同一种子应返回相同结果")
}

func TestDeriveStableUUIDv4_DifferentSeeds(t *testing.T) {
	a := deriveStableUUIDv4("seed-a")
	b := deriveStableUUIDv4("seed-b")
	assert.NotEqual(t, a, b, "不同种子应返回不同结果")
}

func TestDeriveStableUUIDv4_ValidFormat(t *testing.T) {
	result := deriveStableUUIDv4("test-seed")
	parsed, err := uuid.Parse(result)
	require.NoError(t, err, "应返回合法 UUID 格式")
	assert.Equal(t, uuid.Version(4), parsed.Version(), "应为 UUIDv4")
	assert.Equal(t, uuid.RFC4122, parsed.Variant(), "应为 RFC4122 变体")
}

// --- GetCodexFingerprintMode ---

func TestGetCodexFingerprintMode(t *testing.T) {
	tests := []struct {
		name     string
		account  *Account
		expected codexFingerprintMode
	}{
		{"nil 账号", nil, codexFingerprintOff},
		{"非 OAuth 账号", &Account{Platform: PlatformOpenAI, Type: "api_key"}, codexFingerprintOff},
		{"OpenAI setup token", &Account{Platform: PlatformOpenAI, Type: AccountTypeSetupToken, Extra: map[string]any{codexFingerprintModeExtraKey: "session"}}, codexFingerprintSession},
		{"Anthropic setup token", &Account{Platform: PlatformAnthropic, Type: AccountTypeSetupToken, Extra: map[string]any{codexFingerprintModeExtraKey: "session"}}, codexFingerprintOff},
		// 收敛是显式 opt-in：缺省/空/非法一律 off（#5610）。存量账号普遍没有这个
		// extra 键，升级不得把它们静默切进收敛。
		{"无 extra 默认 off", newTestOAuthAccount(1, nil), codexFingerprintOff},
		{"空值默认 off", newTestOAuthAccount(1, map[string]any{codexFingerprintModeExtraKey: ""}), codexFingerprintOff},
		{"非法值默认 off", newTestOAuthAccount(1, map[string]any{codexFingerprintModeExtraKey: "invalid"}), codexFingerprintOff},
		{"显式 off", newTestOAuthAccount(1, map[string]any{codexFingerprintModeExtraKey: "off"}), codexFingerprintOff},
		{"device", newTestOAuthAccount(1, map[string]any{codexFingerprintModeExtraKey: "device"}), codexFingerprintDevice},
		{"session", newTestOAuthAccount(1, map[string]any{codexFingerprintModeExtraKey: "session"}), codexFingerprintSession},
		{"thread_pool", newTestOAuthAccount(1, map[string]any{codexFingerprintModeExtraKey: "thread_pool"}), codexFingerprintThreadPool},
		{"full", newTestOAuthAccount(1, map[string]any{codexFingerprintModeExtraKey: "full"}), codexFingerprintFull},
	}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			assert.Equal(t, tt.expected, tt.account.GetCodexFingerprintMode())
		})
	}
}

// --- resolveConvergedInstallationID ---

func TestResolveConvergedInstallationID_UsesDeviceID(t *testing.T) {
	account := newTestOAuthAccount(1, map[string]any{"openai_device_id": "real-device-id"})
	assert.Equal(t, "real-device-id", resolveConvergedInstallationID(account, testCodexFingerprintSeed))
}

func TestResolveConvergedInstallationID_DerivesFromSeed(t *testing.T) {
	account := newTestOAuthAccount(42, nil)
	result := resolveConvergedInstallationID(account, testCodexFingerprintSeed)
	_, err := uuid.Parse(result)
	require.NoError(t, err, "派生值应为合法 UUID")
	assert.Equal(t, result, resolveConvergedInstallationID(account, testCodexFingerprintSeed), "确定性")
}

func TestResolveConvergedInstallationID_DifferentSeeds(t *testing.T) {
	account := newTestOAuthAccount(1, nil)
	a := resolveConvergedInstallationID(account, testCodexFingerprintSeed)
	b := resolveConvergedInstallationID(account, "22222222-2222-4222-8222-222222222222")
	assert.NotEqual(t, a, b)
}

// --- resolveConvergedThreadID ---

func TestResolveConvergedThreadID_PerClientSession(t *testing.T) {
	a := resolveConvergedThreadID(testCodexFingerprintSeed, "session-aaa")
	b := resolveConvergedThreadID(testCodexFingerprintSeed, "session-bbb")
	assert.NotEqual(t, a, b, "不同客户端 session 应得到不同 thread_id")
}

func TestResolveConvergedThreadID_Deterministic(t *testing.T) {
	a := resolveConvergedThreadID(testCodexFingerprintSeed, "session-aaa")
	b := resolveConvergedThreadID(testCodexFingerprintSeed, "session-aaa")
	assert.Equal(t, a, b, "同一客户端 session 应得到相同 thread_id")
}

func TestResolveConvergedThreadID_EmptySession(t *testing.T) {
	assert.Equal(t, "", resolveConvergedThreadID(testCodexFingerprintSeed, ""))
}

func TestGetCodexFingerprintThreadPoolSize(t *testing.T) {
	assert.Equal(t, 4, (*Account)(nil).GetCodexFingerprintThreadPoolSize())
	assert.Equal(t, 4, newTestOAuthAccount(1, nil).GetCodexFingerprintThreadPoolSize())
	assert.Equal(t, 6, newTestOAuthAccount(1, map[string]any{codexFingerprintThreadPoolSizeExtraKey: 6}).GetCodexFingerprintThreadPoolSize())
	assert.Equal(t, 3, newTestOAuthAccount(1, map[string]any{codexFingerprintThreadPoolSizeExtraKey: "3"}).GetCodexFingerprintThreadPoolSize())
	assert.Equal(t, 4, newTestOAuthAccount(1, map[string]any{codexFingerprintThreadPoolSizeExtraKey: 0}).GetCodexFingerprintThreadPoolSize())
	assert.Equal(t, 4, newTestOAuthAccount(1, map[string]any{codexFingerprintThreadPoolSizeExtraKey: 99}).GetCodexFingerprintThreadPoolSize())
}

func TestResolvePooledThreadID_CapsUniqueThreads(t *testing.T) {
	account := newTestOAuthAccount(42, map[string]any{
		codexFingerprintModeExtraKey:           "thread_pool",
		codexFingerprintThreadPoolSizeExtraKey: 4,
	})
	sessionID := resolveConvergedSessionID(mustCodexFingerprintSeed(account))
	seen := map[string]struct{}{}
	for i := 0; i < 64; i++ {
		threadID := resolvePooledThreadID(account, mustCodexFingerprintSeed(account), fmt.Sprintf("client-%d", i))
		require.NotEmpty(t, threadID)
		seen[threadID] = struct{}{}
	}
	assert.LessOrEqual(t, len(seen), 4)
	assert.Contains(t, seen, sessionID, "池中必须包含根线程 session_id")
}

func TestResolvePooledThreadID_StickyAndEmptyRoot(t *testing.T) {
	account := newTestOAuthAccount(7, nil)
	a1 := resolvePooledThreadID(account, mustCodexFingerprintSeed(account), "same-client")
	a2 := resolvePooledThreadID(account, mustCodexFingerprintSeed(account), "same-client")
	assert.Equal(t, a1, a2)
	assert.Equal(t, resolveConvergedSessionID(mustCodexFingerprintSeed(account)), resolvePooledThreadID(account, mustCodexFingerprintSeed(account), ""))
}

func TestApplyCodexFingerprintHeaders_ThreadPoolMode(t *testing.T) {
	account := newTestOAuthAccount(11, map[string]any{codexFingerprintModeExtraKey: "thread_pool"})
	clientA := http.Header{}
	clientA.Set("session-id", "pool-client-a")
	clientB := http.Header{}
	clientB.Set("conversation_id", "pool-client-b")

	idsA := resolveCodexFingerprintIDsFromRequest(account, clientA)
	idsB := resolveCodexFingerprintIDsFromRequest(account, clientB)
	require.NotNil(t, idsA)
	require.NotNil(t, idsB)
	assert.Equal(t, codexFingerprintThreadPool, idsA.mode)
	assert.Equal(t, idsA.sessionID, idsB.sessionID)
	assert.Equal(t, resolvePooledThreadID(account, mustCodexFingerprintSeed(account), "pool-client-a"), idsA.threadID)
	assert.Equal(t, resolvePooledThreadID(account, mustCodexFingerprintSeed(account), "pool-client-b"), idsB.threadID)

	h := http.Header{}
	h.Set("conversation_id", "client-conv")
	applyCodexFingerprintHeaders(h, idsA)
	assert.Equal(t, idsA.threadID, h.Get("conversation_id"))
	assert.Equal(t, idsA.sessionID, h.Get("session_id"))
}

func TestExtractClientStickyKey(t *testing.T) {
	h := http.Header{}
	h.Set("conversation_id", "conv-only")
	assert.Equal(t, "conv-only", extractClientStickyKey(h))
	h.Set("session_id", "sess")
	assert.Equal(t, "sess", extractClientStickyKey(h))
}

// --- off 模式：resolveCodexFingerprintIDsFromRequest 返回 nil ---

func TestResolveCodexFingerprintIDsFromRequest_ExplicitOff(t *testing.T) {
	account := newTestOAuthAccount(1, map[string]any{codexFingerprintModeExtraKey: "off"})
	ids := resolveCodexFingerprintIDsFromRequest(account, nil)
	assert.Nil(t, ids, "显式 off 模式应返回 nil")
}

func TestResolveCodexFingerprintIDsFromRequest_DefaultIsOff(t *testing.T) {
	account := newTestOAuthAccount(1, nil)
	assert.Nil(t, resolveCodexFingerprintIDsFromRequest(account, nil), "无 extra 应视为 off")
}

// 管理员显式 opt-in 的账号行为不变。
func TestResolveCodexFingerprintIDsFromRequest_ExplicitOptInHonored(t *testing.T) {
	for _, mode := range []string{"device", "session", "thread_pool", "full"} {
		t.Run(mode, func(t *testing.T) {
			account := newTestOAuthAccount(1, map[string]any{codexFingerprintModeExtraKey: mode})
			ids := resolveCodexFingerprintIDsFromRequest(account, nil)
			require.NotNil(t, ids, "显式配置必须生效")
			assert.Equal(t, codexFingerprintMode(mode), ids.mode)
			assert.NotEmpty(t, ids.installationID)
		})
	}
}

func TestResolveCodexFingerprintIDsFromRequest_EnabledModesRequireValidSeed(t *testing.T) {
	for _, tt := range []struct {
		name  string
		extra map[string]any
	}{
		{name: "missing", extra: map[string]any{codexFingerprintModeExtraKey: "device"}},
		{name: "missing with device override", extra: map[string]any{codexFingerprintModeExtraKey: "device", "openai_device_id": "real-device"}},
		{name: "blank", extra: map[string]any{codexFingerprintModeExtraKey: "session", codexFingerprintSeedExtraKey: ""}},
		{name: "uppercase", extra: map[string]any{codexFingerprintModeExtraKey: "full", codexFingerprintSeedExtraKey: "11111111-1111-4111-8111-AAAAAAAAAAAA"}},
		{name: "nil uuid", extra: map[string]any{codexFingerprintModeExtraKey: "device", codexFingerprintSeedExtraKey: "00000000-0000-0000-0000-000000000000"}},
		{name: "non string", extra: map[string]any{codexFingerprintModeExtraKey: "session", codexFingerprintSeedExtraKey: 123}},
	} {
		t.Run(tt.name, func(t *testing.T) {
			account := &Account{ID: 1, Platform: PlatformOpenAI, Type: AccountTypeOAuth, Extra: tt.extra}
			require.Nil(t, resolveCodexFingerprintIDsFromRequest(account, nil))
		})
	}
}

// --- applyCodexFingerprintHeaders: off 模式 ---

func TestApplyCodexFingerprintHeaders_OffMode(t *testing.T) {
	h := http.Header{}
	h.Set("x-codex-installation-id", "original-install-id")
	h.Set("x-codex-window-id", "original-window-id")

	applyCodexFingerprintHeaders(h, nil)

	assert.Equal(t, "original-install-id", h.Get("x-codex-installation-id"), "nil ids 不改写")
	assert.Equal(t, "original-window-id", h.Get("x-codex-window-id"), "nil ids 不改写")
}

// --- applyCodexFingerprintHeaders: device 模式 ---

func TestApplyCodexFingerprintHeaders_DeviceMode(t *testing.T) {
	account := newTestOAuthAccount(1, map[string]any{
		codexFingerprintModeExtraKey: "device",
		"openai_device_id":           "converged-device",
	})
	turnMetadata := `{"installation_id":"user-install","session_id":"user-session","sandbox":"seccomp","workspaces":{"/tmp/repo":{"associated_remote_urls":{"origin":"https://github.com/acme/app.git"}}}}`
	h := http.Header{}
	h.Set("x-codex-installation-id", "user-install")
	h.Set("x-codex-window-id", "user-window:0")
	h.Set("x-codex-turn-metadata", turnMetadata)

	ids := resolveCodexFingerprintIDsFromRequest(account, nil)
	applyCodexFingerprintHeaders(h, ids)

	assert.Equal(t, "converged-device", h.Get("x-codex-installation-id"), "installation_id 应收敛")
	assert.Equal(t, "user-window:0", h.Get("x-codex-window-id"), "device 模式不改写 window_id")

	var meta map[string]any
	require.NoError(t, json.Unmarshal([]byte(h.Get("x-codex-turn-metadata")), &meta))
	assert.Equal(t, "converged-device", meta["installation_id"])
	assert.Equal(t, "user-session", meta["session_id"], "device 模式不改写 session_id")
	assert.Equal(t, "seccomp", meta["sandbox"], "非指纹字段保留原样")
	_, hasWorkspaces := meta["workspaces"]
	assert.False(t, hasWorkspaces, "device 模式也应丢掉 workspaces 仓库指纹")
}

// --- applyCodexFingerprintHeaders: session 模式 ---

func TestApplyCodexFingerprintHeaders_SessionMode(t *testing.T) {
	account := newTestOAuthAccount(1, map[string]any{
		codexFingerprintModeExtraKey: "session",
	})
	clientHeaders := http.Header{}
	clientHeaders.Set("session-id", "client-session-aaa")

	turnMetadata := `{"installation_id":"user-install","session_id":"user-session","thread_id":"user-thread","turn_id":"user-turn","window_id":"user-thread:0","sandbox":"seccomp","thread_source":"user","workspaces":{"/Users/a/proj":{"associated_remote_urls":{"origin":"https://github.com/a/proj.git"}}}}`
	h := http.Header{}
	h.Set("x-codex-installation-id", "user-install")
	h.Set("x-codex-window-id", "user-thread:0")
	h.Set("x-codex-turn-metadata", turnMetadata)
	h.Set("x-client-request-id", "user-thread")
	h.Set("conversation_id", "prompt-cache-or-client-conv")

	ids := resolveCodexFingerprintIDsFromRequest(account, clientHeaders)
	applyCodexFingerprintHeaders(h, ids)

	seed, ok := codexFingerprintSeed(account.Extra)
	require.True(t, ok)
	convergedInstall := resolveConvergedInstallationID(account, seed)
	convergedSession := resolveConvergedSessionID(seed)
	convergedThread := resolveConvergedThreadID(seed, "client-session-aaa")
	if account.GetCodexFingerprintMode() == codexFingerprintThreadPool {
		convergedThread = resolvePooledThreadID(account, seed, "client-session-aaa")
	}

	assert.Equal(t, convergedInstall, h.Get("x-codex-installation-id"))
	assert.Equal(t, convergedSession, h.Get("session-id"))
	assert.Equal(t, convergedSession, h.Get("session_id"), "下划线形式也应被改写")
	assert.Equal(t, convergedThread, h.Get("thread-id"))
	assert.Equal(t, convergedThread, h.Get("thread_id"))
	assert.Equal(t, convergedThread, h.Get("conversation_id"), "conversation_id 必须等于收敛 thread_id")
	assert.Equal(t, convergedThread, h.Get("x-client-request-id"))
	assert.Equal(t, ids.windowID, h.Get("x-codex-window-id"))
	assert.Empty(t, h.Get("x-codex-parent-thread-id"), "根 turn 不应写出 parent")

	var meta map[string]any
	require.NoError(t, json.Unmarshal([]byte(h.Get("x-codex-turn-metadata")), &meta))
	assert.Equal(t, convergedInstall, meta["installation_id"])
	assert.Equal(t, convergedSession, meta["session_id"])
	assert.Equal(t, convergedThread, meta["thread_id"])
	assert.Equal(t, ids.windowID, meta["window_id"])
	assert.NotEqual(t, "user-turn", meta["turn_id"], "turn_id 应被新生成的值替换")
	assert.Equal(t, "seccomp", meta["sandbox"], "sandbox 保留原样")
	assert.Equal(t, "user", meta["thread_source"], "thread_source 保留原样")
	_, hasParent := meta["parent_thread_id"]
	_, hasForked := meta["forked_from_thread_id"]
	_, hasParentTurn := meta["parent_turn_id"]
	_, hasWorkspaces := meta["workspaces"]
	assert.False(t, hasParent, "根 turn 不应写出 parent_thread_id")
	assert.False(t, hasForked, "根 turn 不应写出 forked_from_thread_id")
	assert.False(t, hasParentTurn, "根 turn 不应写出 parent_turn_id")
	assert.False(t, hasWorkspaces, "必须丢掉 workspaces 仓库指纹")
}

func TestApplyCodexFingerprintHeaders_MapsSubagentLineage(t *testing.T) {
	account := newTestOAuthAccount(1, map[string]any{codexFingerprintModeExtraKey: "thread_pool"})
	clientHeaders := http.Header{}
	clientHeaders.Set("session-id", "client-session-aaa")
	clientHeaders.Set(codexParentThreadIDHeader, "client-parent")
	clientHeaders.Set(codexOpenAISubagentHeader, "collab_spawn")
	clientHeaders.Set("x-codex-turn-metadata", `{"parent_thread_id":"client-parent","parent_turn_id":"client-parent-turn","subagent_kind":"collab_spawn"}`)

	ids := resolveCodexFingerprintIDsFromRequest(account, clientHeaders)
	require.NotNil(t, ids)
	parent := resolvePooledThreadID(account, mustCodexFingerprintSeed(account), "client-session-aaa")
	child := resolveChildThreadID(account.ID, parent)
	assert.Equal(t, parent, ids.parentThreadID)
	assert.Equal(t, child, ids.threadID)
	assert.NotEqual(t, parent, child)
	assert.Equal(t, "client-parent-turn", ids.parentTurnID)
	assert.Equal(t, "collab_spawn", ids.subagentHeader)

	h := http.Header{}
	h.Set("x-codex-turn-metadata", `{"installation_id":"x","session_id":"x","thread_id":"x","parent_thread_id":"client-parent","parent_turn_id":"client-parent-turn","workspaces":{"/tmp/x":{}}}`)
	h.Set(codexParentThreadIDHeader, "client-parent")
	applyCodexFingerprintHeaders(h, ids)

	assert.Equal(t, child, h.Get("thread-id"))
	assert.Equal(t, child, h.Get("conversation_id"))
	assert.Equal(t, parent, h.Get(codexParentThreadIDHeader))
	assert.Equal(t, "collab_spawn", h.Get(codexOpenAISubagentHeader))

	var meta map[string]any
	require.NoError(t, json.Unmarshal([]byte(h.Get("x-codex-turn-metadata")), &meta))
	assert.Equal(t, child, meta["thread_id"])
	assert.Equal(t, parent, meta["parent_thread_id"])
	assert.Equal(t, "client-parent-turn", meta["parent_turn_id"])
	_, hasWorkspaces := meta["workspaces"]
	assert.False(t, hasWorkspaces)
}

func TestApplyCodexFingerprintHeaders_SessionModeDerivesPerClientThread(t *testing.T) {
	account := newTestOAuthAccount(1, map[string]any{
		codexFingerprintModeExtraKey: "session",
	})
	clientA := http.Header{}
	clientA.Set("session-id", "client-A")
	clientB := http.Header{}
	clientB.Set("session-id", "client-B")

	idsA := resolveCodexFingerprintIDsFromRequest(account, clientA)
	idsB := resolveCodexFingerprintIDsFromRequest(account, clientB)
	require.NotNil(t, idsA)
	require.NotNil(t, idsB)
	assert.Equal(t, codexFingerprintSession, idsA.mode)
	assert.Equal(t, idsA.sessionID, idsB.sessionID)
	seed := mustCodexFingerprintSeed(account)
	assert.Equal(t, resolveConvergedThreadID(seed, "client-A"), idsA.threadID)
	assert.Equal(t, resolveConvergedThreadID(seed, "client-B"), idsB.threadID)
}

// --- full 模式 ---

func TestApplyCodexFingerprintHeaders_FullMode(t *testing.T) {
	account := newTestOAuthAccount(1, map[string]any{
		codexFingerprintModeExtraKey: "full",
	})
	seed, ok := codexFingerprintSeed(account.Extra)
	require.True(t, ok)
	convergedSession := resolveConvergedSessionID(seed)

	clientA := http.Header{}
	clientA.Set("session-id", "client-A")
	idsA := resolveCodexFingerprintIDsFromRequest(account, clientA)
	hA := http.Header{}
	hA.Set("x-codex-turn-metadata", `{"installation_id":"x","session_id":"x","thread_id":"x","turn_id":"x","window_id":"x:0"}`)
	applyCodexFingerprintHeaders(hA, idsA)

	clientB := http.Header{}
	clientB.Set("session-id", "client-B")
	idsB := resolveCodexFingerprintIDsFromRequest(account, clientB)
	hB := http.Header{}
	hB.Set("x-codex-turn-metadata", `{"installation_id":"x","session_id":"x","thread_id":"x","turn_id":"x","window_id":"x:0"}`)
	applyCodexFingerprintHeaders(hB, idsB)

	assert.Equal(t, hA.Get("thread-id"), hB.Get("thread-id"), "full 模式 thread_id 应相同")
	assert.Equal(t, convergedSession, hA.Get("thread-id"), "full 模式 thread_id 应等于 session_id")
	assert.Equal(t, convergedSession, hA.Get("conversation_id"))
	assert.Equal(t, convergedSession, hB.Get("conversation_id"))
	assert.True(t, strings.HasPrefix(hA.Get("x-codex-window-id"), convergedSession+":"))
	assert.True(t, strings.HasPrefix(hB.Get("x-codex-window-id"), convergedSession+":"))
}

// --- H1 修复验证：头和体的 turn_id 一致性 ---

func TestFingerprintIDs_HeaderAndBody_TurnID_Consistent(t *testing.T) {
	account := newTestOAuthAccount(1, map[string]any{
		codexFingerprintModeExtraKey: "session",
	})
	clientHeaders := http.Header{}
	clientHeaders.Set("session-id", "client-session-xyz")

	ids := resolveCodexFingerprintIDsFromRequest(account, clientHeaders)
	require.NotNil(t, ids)

	// 头改写
	h := http.Header{}
	h.Set("x-codex-turn-metadata", `{"installation_id":"x","session_id":"x","thread_id":"x","turn_id":"x","window_id":"x:0"}`)
	applyCodexFingerprintHeaders(h, ids)

	// 体改写（使用同一份 ids）
	reqBody := map[string]any{
		"client_metadata": map[string]any{
			"x-codex-installation-id": "x",
			"session_id":              "x",
			"turn_id":                 "x",
			"x-codex-turn-metadata":   `{"installation_id":"x","session_id":"x","thread_id":"x","turn_id":"x","window_id":"x:0"}`,
		},
	}
	applyCodexFingerprintClientMetadata(reqBody, ids)

	// 从头 turn-metadata JSON 提取 turn_id
	var headerMeta map[string]any
	require.NoError(t, json.Unmarshal([]byte(h.Get("x-codex-turn-metadata")), &headerMeta))
	headerTurnID, ok := headerMeta["turn_id"].(string)
	require.True(t, ok, "头 turn-metadata 应包含 string 类型的 turn_id")

	// 从体 client_metadata 提取 turn_id
	cm, ok := reqBody["client_metadata"].(map[string]any)
	require.True(t, ok, "请求体应包含 client_metadata")
	bodyTurnID, ok := cm["turn_id"].(string)
	require.True(t, ok, "体 client_metadata 应包含 string 类型的 turn_id")

	// 从体内嵌 turn-metadata JSON 提取 turn_id
	embeddedRaw, ok := cm["x-codex-turn-metadata"].(string)
	require.True(t, ok, "体 client_metadata 应包含 x-codex-turn-metadata 字符串")
	var bodyMeta map[string]any
	require.NoError(t, json.Unmarshal([]byte(embeddedRaw), &bodyMeta))
	bodyEmbeddedTurnID, ok := bodyMeta["turn_id"].(string)
	require.True(t, ok, "体内嵌 turn-metadata 应包含 string 类型的 turn_id")

	assert.Equal(t, headerTurnID, bodyTurnID, "头和体的 turn_id 必须一致")
	assert.Equal(t, headerTurnID, bodyEmbeddedTurnID, "头和体内嵌 turn-metadata 的 turn_id 必须一致")
	assert.Equal(t, ids.turnID, headerTurnID, "所有 turn_id 都应来自同一份 ids")
	headerStarted, ok := headerMeta["turn_started_at_unix_ms"].(float64)
	require.True(t, ok, "头 turn-metadata 应包含 turn_started_at_unix_ms")
	bodyStarted, ok := bodyMeta["turn_started_at_unix_ms"].(float64)
	require.True(t, ok, "体内嵌 turn-metadata 应包含 turn_started_at_unix_ms")
	assert.Equal(t, headerStarted, bodyStarted, "头和体的 turn_started_at_unix_ms 必须一致")
	assert.Equal(t, headerMeta["turn_started_at_unix_ms"], bodyMeta["turn_started_at_unix_ms"], "头和体的 timestamp 必须一致")
	assert.Equal(t, float64(ids.turnStartedAtUnixMs), headerMeta["turn_started_at_unix_ms"])
}

func TestFingerprintIDs_MalformedEmbeddedMetadataRebuiltConsistently(t *testing.T) {
	account := newTestOAuthAccount(2, map[string]any{codexFingerprintModeExtraKey: "session"})
	clientHeaders := make(http.Header)
	clientHeaders.Set("session-id", "client-session-malformed")
	ids := resolveCodexFingerprintIDsFromRequest(account, clientHeaders)
	require.NotNil(t, ids)

	h := make(http.Header)
	h.Set("x-codex-turn-metadata", "{malformed")
	applyCodexFingerprintHeaders(h, ids)

	reqBody := map[string]any{
		"client_metadata": map[string]any{
			"session_id":            "client-session-malformed",
			"x-codex-turn-metadata": "[malformed",
		},
	}
	require.True(t, applyCodexFingerprintClientMetadata(reqBody, ids))

	var headerMeta map[string]any
	require.NoError(t, json.Unmarshal([]byte(h.Get("x-codex-turn-metadata")), &headerMeta))
	clientMetadata, ok := reqBody["client_metadata"].(map[string]any)
	require.True(t, ok)
	bodyRaw, ok := clientMetadata["x-codex-turn-metadata"].(string)
	require.True(t, ok)
	var bodyMeta map[string]any
	require.NoError(t, json.Unmarshal([]byte(bodyRaw), &bodyMeta))

	for _, key := range []string{"installation_id", "session_id", "thread_id", "turn_id", "window_id", "turn_started_at_unix_ms"} {
		assert.Equal(t, headerMeta[key], bodyMeta[key], "rebuilt metadata field %s must match", key)
	}
}

// --- applyCodexFingerprintClientMetadata ---

func TestApplyCodexFingerprintClientMetadata_OffMode(t *testing.T) {
	reqBody := map[string]any{
		"client_metadata": map[string]any{
			"x-codex-installation-id": "original",
		},
	}
	modified := applyCodexFingerprintClientMetadata(reqBody, nil)
	assert.False(t, modified, "nil ids 不改写")
}

func TestApplyCodexFingerprintClientMetadata_DeviceMode(t *testing.T) {
	account := newTestOAuthAccount(1, map[string]any{
		codexFingerprintModeExtraKey: "device",
		"openai_device_id":           "converged-device",
	})
	ids := resolveCodexFingerprintIDsFromRequest(account, nil)
	require.NotNil(t, ids)

	embeddedMeta := `{"installation_id":"x","session_id":"user-session","sandbox":"seccomp"}`
	reqBody := map[string]any{
		"client_metadata": map[string]any{
			"x-codex-installation-id": "original-install",
			"session_id":              "user-session",
			"x-codex-turn-metadata":   embeddedMeta,
		},
	}

	modified := applyCodexFingerprintClientMetadata(reqBody, ids)
	require.True(t, modified)

	cm, ok := reqBody["client_metadata"].(map[string]any)
	require.True(t, ok)
	assert.Equal(t, "converged-device", cm["x-codex-installation-id"])
	assert.Equal(t, "user-session", cm["session_id"], "device 模式不改 session_id")

	turnMetaStr, ok := cm["x-codex-turn-metadata"].(string)
	require.True(t, ok)
	var meta map[string]any
	require.NoError(t, json.Unmarshal([]byte(turnMetaStr), &meta))
	assert.Equal(t, "converged-device", meta["installation_id"])
	assert.Equal(t, "seccomp", meta["sandbox"], "非指纹字段保留原样")
}

func TestApplyCodexFingerprintClientMetadata_SessionMode(t *testing.T) {
	account := newTestOAuthAccount(1, map[string]any{
		codexFingerprintModeExtraKey: "session",
	})
	clientHeaders := http.Header{}
	clientHeaders.Set("session-id", "client-session-aaa")

	ids := resolveCodexFingerprintIDsFromRequest(account, clientHeaders)
	require.NotNil(t, ids)

	embeddedMeta := `{"installation_id":"x","session_id":"x","thread_id":"x","turn_id":"x","window_id":"x:0","sandbox":"seccomp","workspaces":{"/tmp/x":{"has_changes":true}}}`
	reqBody := map[string]any{
		"client_metadata": map[string]any{
			"x-codex-installation-id": "original-install",
			"session_id":              "original-session",
			"x-codex-turn-metadata":   embeddedMeta,
		},
	}

	modified := applyCodexFingerprintClientMetadata(reqBody, ids)
	require.True(t, modified)

	cm, ok := reqBody["client_metadata"].(map[string]any)
	require.True(t, ok)
	seed, ok := codexFingerprintSeed(account.Extra)
	require.True(t, ok)
	convergedInstall := resolveConvergedInstallationID(account, seed)
	convergedSession := resolveConvergedSessionID(seed)
	convergedThread := resolveConvergedThreadID(seed, "client-session-aaa")
	if account.GetCodexFingerprintMode() == codexFingerprintThreadPool {
		convergedThread = resolvePooledThreadID(account, seed, "client-session-aaa")
	}

	assert.Equal(t, convergedInstall, cm["x-codex-installation-id"])
	assert.Equal(t, convergedSession, cm["session_id"])
	assert.Equal(t, convergedThread, cm["thread_id"])
	assert.Equal(t, ids.windowID, cm["x-codex-window-id"])
	_, hasParentHeader := cm[codexParentThreadIDHeader]
	assert.False(t, hasParentHeader, "根 turn 的 body 不应补 parent")

	turnMetaStr, ok := cm["x-codex-turn-metadata"].(string)
	require.True(t, ok)
	var meta map[string]any
	require.NoError(t, json.Unmarshal([]byte(turnMetaStr), &meta))
	assert.Equal(t, convergedInstall, meta["installation_id"])
	assert.Equal(t, convergedSession, meta["session_id"])
	assert.Equal(t, ids.windowID, meta["window_id"])
	assert.Equal(t, "seccomp", meta["sandbox"], "非指纹字段保留原样")
	_, hasParent := meta["parent_thread_id"]
	_, hasWorkspaces := meta["workspaces"]
	assert.False(t, hasParent)
	assert.False(t, hasWorkspaces)
}

func TestApplyCodexFingerprintClientMetadata_MapsBodyOnlyParent(t *testing.T) {
	resetCodexFingerprintWindowStateForTest()
	t.Cleanup(resetCodexFingerprintWindowStateForTest)

	account := newTestOAuthAccount(1, map[string]any{codexFingerprintModeExtraKey: "thread_pool"})
	clientHeaders := http.Header{}
	clientHeaders.Set("session-id", "pool-parent-client")
	parent := resolvePooledThreadID(account, mustCodexFingerprintSeed(account), "pool-parent-client")
	reqBody := map[string]any{
		"client_metadata": map[string]any{
			codexParentThreadIDHeader: "client-parent",
			codexOpenAISubagentHeader: "review",
			"x-codex-turn-metadata":   `{"parent_thread_id":"client-parent","parent_turn_id":"turn-9","workspaces":{"/tmp/x":{}}}`,
		},
	}
	ids := resolveCodexFingerprintIDsFromClient(account, clientHeaders, reqBody, nil)
	require.NotNil(t, ids)
	require.True(t, applyCodexFingerprintClientMetadata(reqBody, ids))

	child := resolveChildThreadID(account.ID, parent)
	assert.Equal(t, parent, ids.parentThreadID)
	assert.Equal(t, child, ids.threadID)
	assert.Equal(t, child+":0", ids.windowID, "body-only parent 应只给 child 计一次 window")
	cm, ok := reqBody["client_metadata"].(map[string]any)
	require.True(t, ok)
	assert.Equal(t, parent, cm[codexParentThreadIDHeader])
	assert.Equal(t, child, cm["thread_id"])
	assert.Equal(t, "review", cm[codexOpenAISubagentHeader])
	assert.Equal(t, "turn-9", cm["parent_turn_id"])
	assert.Equal(t, ids.turnID, cm["turn_id"], "resolve 与 apply 必须共用同一 turn_id")

	turnMeta, ok := cm["x-codex-turn-metadata"].(string)
	require.True(t, ok)
	var meta map[string]any
	require.NoError(t, json.Unmarshal([]byte(turnMeta), &meta))
	assert.Equal(t, parent, meta["parent_thread_id"])
	assert.Equal(t, "turn-9", meta["parent_turn_id"])
	assert.Equal(t, ids.turnID, meta["turn_id"])
	_, hasWorkspaces := meta["workspaces"]
	assert.False(t, hasWorkspaces)
}

func TestApplyCodexFingerprintClientMetadata_FullMode(t *testing.T) {
	account := newTestOAuthAccount(1, map[string]any{
		codexFingerprintModeExtraKey: "full",
	})
	clientHeaders := http.Header{}
	clientHeaders.Set("session-id", "any-client")

	ids := resolveCodexFingerprintIDsFromRequest(account, clientHeaders)
	require.NotNil(t, ids)

	reqBody := map[string]any{
		"client_metadata": map[string]any{
			"session_id":            "x",
			"thread_id":             "x",
			"x-codex-turn-metadata": `{"installation_id":"x","session_id":"x","thread_id":"x","turn_id":"x","window_id":"x:0"}`,
		},
	}

	modified := applyCodexFingerprintClientMetadata(reqBody, ids)
	require.True(t, modified)

	cm, ok := reqBody["client_metadata"].(map[string]any)
	require.True(t, ok)
	seed, ok := codexFingerprintSeed(account.Extra)
	require.True(t, ok)
	convergedSession := resolveConvergedSessionID(seed)

	assert.Equal(t, convergedSession, cm["session_id"])
	assert.Equal(t, convergedSession, cm["thread_id"], "full 模式 thread_id 应等于 session_id")
	assert.Equal(t, ids.windowID, cm["x-codex-window-id"])
}

func TestCodexFingerprintWindowIncrementsByTurnStride(t *testing.T) {
	resetCodexFingerprintWindowStateForTest()
	t.Cleanup(resetCodexFingerprintWindowStateForTest)

	account := newTestOAuthAccount(99101, map[string]any{
		codexFingerprintModeExtraKey: "full",
	})
	clientHeaders := http.Header{}
	clientHeaders.Set("session-id", "window-stride-client")

	first := resolveCodexFingerprintIDsFromRequest(account, clientHeaders)
	require.NotNil(t, first)
	assert.Equal(t, first.threadID+":0", first.windowID)

	for i := 1; i < codexFingerprintWindowTurnStride; i++ {
		ids := resolveCodexFingerprintIDsFromRequest(account, clientHeaders)
		require.NotNil(t, ids)
		assert.Equal(t, first.threadID+":0", ids.windowID, "stride 内 window 应保持 :0")
	}

	next := resolveCodexFingerprintIDsFromRequest(account, clientHeaders)
	require.NotNil(t, next)
	assert.Equal(t, first.threadID+":1", next.windowID)
}

func TestApplyCodexFingerprintClientMetadata_DeviceMode_StripsWorkspaces(t *testing.T) {
	account := newTestOAuthAccount(1, map[string]any{
		codexFingerprintModeExtraKey: "device",
		"openai_device_id":           "converged-device",
	})
	ids := resolveCodexFingerprintIDsFromRequest(account, nil)
	require.NotNil(t, ids)

	reqBody := map[string]any{
		"client_metadata": map[string]any{
			"x-codex-turn-metadata": `{"installation_id":"x","parent_thread_id":"keep-me","workspaces":{"/tmp/x":{"has_changes":true}}}`,
		},
	}
	require.True(t, applyCodexFingerprintClientMetadata(reqBody, ids))
	cm, ok := reqBody["client_metadata"].(map[string]any)
	require.True(t, ok)
	turnMeta, ok := cm["x-codex-turn-metadata"].(string)
	require.True(t, ok)
	var meta map[string]any
	require.NoError(t, json.Unmarshal([]byte(turnMeta), &meta))
	assert.Equal(t, "keep-me", meta["parent_thread_id"], "device 模式不改写谱系")
	_, hasWorkspaces := meta["workspaces"]
	assert.False(t, hasWorkspaces)
}

// --- extractClientSessionID ---

func TestExtractClientSessionID(t *testing.T) {
	tests := []struct {
		name     string
		headers  http.Header
		expected string
	}{
		{"连字符形式优先", func() http.Header {
			h := http.Header{}
			h.Set("session-id", "hyphen-form")
			h.Set("session_id", "underscore-form")
			return h
		}(), "hyphen-form"},
		{"回退到下划线形式", func() http.Header {
			h := http.Header{}
			h.Set("session_id", "underscore-form")
			return h
		}(), "underscore-form"},
		{"都没有", http.Header{}, ""},
	}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			assert.Equal(t, tt.expected, extractClientSessionID(tt.headers))
		})
	}
}

func TestBuildUpstreamRequest_FingerprintOverridesPromptCacheConversation(t *testing.T) {
	gin.SetMode(gin.TestMode)
	svc := &OpenAIGatewayService{}
	account := newTestOAuthAccount(1, map[string]any{codexFingerprintModeExtraKey: "thread_pool"})

	rec := httptest.NewRecorder()
	c, _ := gin.CreateTestContext(rec)
	c.Request = httptest.NewRequest(http.MethodPost, "/v1/responses", strings.NewReader(`{}`))
	c.Request.Header.Set("session-id", "client-session-conv")

	ids := resolveCodexFingerprintIDsFromRequest(account, c.Request.Header)
	require.NotNil(t, ids)
	stageCodexFingerprintIDs(c, ids)

	req, err := svc.buildUpstreamRequest(context.Background(), c, account, []byte(`{}`), "token", false, "pcache-should-not-win", false)
	require.NoError(t, err)
	assert.Equal(t, ids.threadID, req.Header.Get("conversation_id"))
	assert.Equal(t, ids.sessionID, req.Header.Get("session_id"))
	assert.Equal(t, ids.windowID, req.Header.Get("x-codex-window-id"))
	assert.Empty(t, req.Header.Get("x-codex-parent-thread-id"))
}

func TestBuildUpstreamPassthroughRequest_FingerprintOverridesPromptCacheConversation(t *testing.T) {
	gin.SetMode(gin.TestMode)
	svc := &OpenAIGatewayService{}
	account := newTestOAuthAccount(1, map[string]any{codexFingerprintModeExtraKey: "full"})

	rec := httptest.NewRecorder()
	c, _ := gin.CreateTestContext(rec)
	c.Request = httptest.NewRequest(http.MethodPost, "/v1/responses", strings.NewReader(`{}`))
	c.Request.Header.Set("Content-Type", "application/json")
	c.Request.Header.Set("conversation_id", "client-conv")

	ids := resolveCodexFingerprintIDsFromRequest(account, c.Request.Header)
	require.NotNil(t, ids)
	stageCodexFingerprintIDs(c, ids)

	req, err := svc.buildUpstreamRequestOpenAIPassthrough(context.Background(), c, account, []byte(`{"prompt_cache_key":"pcache-456"}`), "token")
	require.NoError(t, err)
	assert.Equal(t, ids.threadID, req.Header.Get("conversation_id"))
	assert.Equal(t, ids.sessionID, req.Header.Get("session_id"))
}

func TestApplyCodexFingerprintToWSCreateFrame_MapsLineageAndStripsWorkspaces(t *testing.T) {
	account := newTestOAuthAccount(1, map[string]any{codexFingerprintModeExtraKey: "thread_pool"})
	clientHeaders := http.Header{}
	clientHeaders.Set("session-id", "ws-lineage-client")

	payload := []byte(`{"type":"response.create","client_metadata":{"x-codex-parent-thread-id":"client-parent","x-openai-subagent":"collab_spawn","x-codex-turn-metadata":"{\"parent_thread_id\":\"client-parent\",\"forked_from_thread_id\":\"client-fork\",\"workspaces\":{\"/tmp/x\":{}}}"}}`)
	rewritten := applyCodexFingerprintToWSCreateFrame(account, clientHeaders, payload)
	require.NotEqual(t, string(payload), string(rewritten))

	seed, _ := codexFingerprintSeed(account.Extra)
	parent := resolvePooledThreadID(account, seed, "ws-lineage-client")
	child := resolveChildThreadID(account.ID, parent)

	var body map[string]any
	require.NoError(t, json.Unmarshal(rewritten, &body))
	cm, ok := body["client_metadata"].(map[string]any)
	require.True(t, ok)
	assert.Equal(t, parent, cm[codexParentThreadIDHeader])
	assert.Equal(t, child, cm["thread_id"])
	assert.Equal(t, "collab_spawn", cm[codexOpenAISubagentHeader])

	turnMeta, ok := cm["x-codex-turn-metadata"].(string)
	require.True(t, ok)
	var meta map[string]any
	require.NoError(t, json.Unmarshal([]byte(turnMeta), &meta))
	assert.Equal(t, parent, meta["parent_thread_id"])
	assert.Equal(t, "client-fork", meta["forked_from_thread_id"])
	_, hasWorkspaces := meta["workspaces"]
	assert.False(t, hasWorkspaces)
}

func TestResolveCodexFingerprintIDsFromClient_BodyOnlyParentDoesNotBurnParentWindow(t *testing.T) {
	resetCodexFingerprintWindowStateForTest()
	t.Cleanup(resetCodexFingerprintWindowStateForTest)

	account := newTestOAuthAccount(88101, map[string]any{codexFingerprintModeExtraKey: "thread_pool"})
	clientHeaders := http.Header{}
	clientHeaders.Set("session-id", "pool-window-client")
	parent := resolvePooledThreadID(account, mustCodexFingerprintSeed(account), "pool-window-client")
	child := resolveChildThreadID(account.ID, parent)
	reqBody := map[string]any{
		"client_metadata": map[string]any{
			codexParentThreadIDHeader: "client-parent",
		},
	}

	for i := 0; i < codexFingerprintWindowTurnStride; i++ {
		ids := resolveCodexFingerprintIDsFromClient(account, clientHeaders, reqBody, nil)
		require.NotNil(t, ids)
		assert.Equal(t, child, ids.threadID)
		assert.Equal(t, child+":0", ids.windowID)
	}
	ninth := resolveCodexFingerprintIDsFromClient(account, clientHeaders, reqBody, nil)
	require.NotNil(t, ninth)
	assert.Equal(t, child+":1", ninth.windowID)

	root := resolveCodexFingerprintIDsFromRequest(account, clientHeaders)
	require.NotNil(t, root)
	assert.Equal(t, parent, root.threadID)
	assert.Equal(t, parent+":0", root.windowID, "parent 窗口不应被子代理请求空计")
}

func TestApplyLineage_FillsParentAfterForkOnly(t *testing.T) {
	account := newTestOAuthAccount(1, map[string]any{codexFingerprintModeExtraKey: "thread_pool"})
	clientHeaders := http.Header{}
	clientHeaders.Set("session-id", "fork-then-parent")
	clientHeaders.Set("x-codex-turn-metadata", `{"forked_from_thread_id":"client-fork"}`)

	ids := resolveCodexFingerprintIDsFromRequest(account, clientHeaders)
	require.NotNil(t, ids)
	parent := resolvePooledThreadID(account, mustCodexFingerprintSeed(account), "fork-then-parent")
	child := resolveChildThreadID(account.ID, parent)
	assert.Equal(t, parent, ids.forkedFromThreadID)
	assert.Empty(t, ids.parentThreadID)
	assert.Equal(t, child, ids.threadID)
	turnBefore := ids.turnID
	windowBefore := ids.windowID

	reqBody := map[string]any{
		"client_metadata": map[string]any{
			codexParentThreadIDHeader: "client-parent",
			codexOpenAISubagentHeader: "review",
		},
	}
	require.True(t, applyCodexFingerprintClientMetadata(reqBody, ids))
	assert.Equal(t, parent, ids.parentThreadID, "已有 fork 谱系时仍应补上 parent")
	assert.Equal(t, parent, ids.forkedFromThreadID)
	assert.Equal(t, child, ids.threadID, "补 parent 不得再派生新 child")
	assert.Equal(t, turnBefore, ids.turnID)
	assert.Equal(t, windowBefore, ids.windowID)
	assert.Equal(t, "review", ids.subagentHeader)
}

func TestApplyCodexFingerprintLineageHeaders_DeletesEmptySubagent(t *testing.T) {
	h := http.Header{}
	h.Set(codexOpenAISubagentHeader, "collab_spawn")
	h.Set(codexParentThreadIDHeader, "keep-me")
	applyCodexFingerprintLineageHeaders(h, &codexFingerprintIDs{})
	assert.Empty(t, h.Get(codexOpenAISubagentHeader))
	assert.Empty(t, h.Get(codexParentThreadIDHeader))
}

func TestApplyCodexFingerprintClientMetadata_RootStripsStaleParentTurn(t *testing.T) {
	account := newTestOAuthAccount(1, map[string]any{codexFingerprintModeExtraKey: "full"})
	ids := resolveCodexFingerprintIDsFromRequest(account, nil)
	require.NotNil(t, ids)
	require.Empty(t, ids.parentThreadID)
	require.Empty(t, ids.subagentHeader)

	reqBody := map[string]any{
		"client_metadata": map[string]any{
			"parent_turn_id": "stale-turn",
		},
	}
	require.True(t, applyCodexFingerprintClientMetadata(reqBody, ids))
	cm, ok := reqBody["client_metadata"].(map[string]any)
	require.True(t, ok)
	_, hasParentTurn := cm["parent_turn_id"]
	_, hasSubagent := cm[codexOpenAISubagentHeader]
	assert.False(t, hasParentTurn, "根 turn 应丢掉无谱系的 parent_turn_id")
	assert.False(t, hasSubagent)
	assert.Equal(t, ids.threadID, cm["thread_id"], "仅残留 parent_turn_id 不得被当成子代理")
}

func TestWSHandshakeAndCreateFrameShareFingerprintIDs(t *testing.T) {
	resetCodexFingerprintWindowStateForTest()
	t.Cleanup(resetCodexFingerprintWindowStateForTest)

	account := newTestOAuthAccount(1, map[string]any{codexFingerprintModeExtraKey: "thread_pool"})
	clientHeaders := http.Header{}
	clientHeaders.Set("session-id", "ws-align-client")
	payload := []byte(`{"type":"response.create","client_metadata":{"x-codex-parent-thread-id":"client-parent","x-openai-subagent":"collab_spawn","x-codex-turn-metadata":"{\"parent_thread_id\":\"client-parent\"}"}}`)

	ids := resolveCodexFingerprintIDsFromClient(account, clientHeaders, nil, payload)
	require.NotNil(t, ids)
	parent := resolvePooledThreadID(account, mustCodexFingerprintSeed(account), "ws-align-client")
	child := resolveChildThreadID(account.ID, parent)
	assert.Equal(t, child, ids.threadID)
	assert.Equal(t, parent, ids.parentThreadID)

	h := http.Header{}
	h.Set("x-codex-turn-metadata", `{"installation_id":"x","session_id":"x","thread_id":"x","turn_id":"x","window_id":"x:0"}`)
	applyCodexFingerprintHeaders(h, ids)

	rewritten := applyCodexFingerprintToWSCreateFrameWithIDs(account, clientHeaders, payload, ids)
	var body map[string]any
	require.NoError(t, json.Unmarshal(rewritten, &body))
	cm, ok := body["client_metadata"].(map[string]any)
	require.True(t, ok)

	assert.Equal(t, child, h.Get("thread-id"))
	assert.Equal(t, child, h.Get("conversation_id"))
	assert.Equal(t, child, cm["thread_id"])
	assert.Equal(t, ids.turnID, cm["turn_id"])
	assert.Equal(t, ids.windowID, h.Get("x-codex-window-id"))
	assert.Equal(t, ids.windowID, cm["x-codex-window-id"])
	assert.Equal(t, parent, h.Get(codexParentThreadIDHeader))
	assert.Equal(t, parent, cm[codexParentThreadIDHeader])

	var headerMeta map[string]any
	require.NoError(t, json.Unmarshal([]byte(h.Get("x-codex-turn-metadata")), &headerMeta))
	assert.Equal(t, ids.turnID, headerMeta["turn_id"], "握手头与首帧必须共用同一 turn_id")

	next := applyCodexFingerprintToWSCreateFrame(account, clientHeaders, payload)
	var nextBody map[string]any
	require.NoError(t, json.Unmarshal(next, &nextBody))
	nextCM, ok := nextBody["client_metadata"].(map[string]any)
	require.True(t, ok)
	assert.Equal(t, child, nextCM["thread_id"])
	assert.NotEqual(t, ids.turnID, nextCM["turn_id"], "后续 turn 应换新 turn_id")
}

func TestWSCreateFramePinsHandshakeThreadAcrossTurns(t *testing.T) {
	resetCodexFingerprintWindowStateForTest()
	t.Cleanup(resetCodexFingerprintWindowStateForTest)

	account := newTestOAuthAccount(1, map[string]any{codexFingerprintModeExtraKey: "thread_pool"})
	clientHeaders := http.Header{}
	clientHeaders.Set("session-id", "ws-pin-client")
	childPayload := []byte(`{"type":"response.create","client_metadata":{"x-codex-parent-thread-id":"client-parent","x-openai-subagent":"review"}}`)
	rootPayload := []byte(`{"type":"response.create","client_metadata":{"session_id":"later-root"}}`)

	handshake := resolveCodexFingerprintIDsFromClient(account, clientHeaders, nil, childPayload)
	require.NotNil(t, handshake)
	parent := resolvePooledThreadID(account, mustCodexFingerprintSeed(account), "ws-pin-client")
	child := resolveChildThreadID(account.ID, parent)
	assert.Equal(t, child, handshake.threadID)

	conn := &openAIWSCodexFingerprintFrameConn{handshakeIDs: handshake}
	assert.Nil(t, conn.idsForCreateFrame([]byte(`{"type":"response.cancel"}`)))

	first := conn.idsForCreateFrame(childPayload)
	require.Same(t, handshake, first)
	assert.Equal(t, child, first.threadID)

	second := conn.idsForCreateFrame(rootPayload)
	require.NotNil(t, second)
	assert.NotSame(t, handshake, second)
	assert.Equal(t, child, second.threadID, "后续根 turn 仍钉在握手 child thread")
	assert.Equal(t, parent, second.parentThreadID)
	assert.NotEqual(t, handshake.turnID, second.turnID)
	assert.Equal(t, handshake, conn.handshakeIDs, "握手身份应保留在连接上")
}

func TestWSPinnedCreateDoesNotAdoptLaterLineage(t *testing.T) {
	resetCodexFingerprintWindowStateForTest()
	t.Cleanup(resetCodexFingerprintWindowStateForTest)

	account := newTestOAuthAccount(1, map[string]any{codexFingerprintModeExtraKey: "thread_pool"})
	clientHeaders := http.Header{}
	clientHeaders.Set("session-id", "ws-pin-root")
	rootPayload := []byte(`{"type":"response.create","client_metadata":{"session_id":"root-turn"}}`)
	childPayload := []byte(`{"type":"response.create","client_metadata":{"x-codex-parent-thread-id":"client-parent","x-openai-subagent":"review"}}`)

	handshake := resolveCodexFingerprintIDsFromClient(account, clientHeaders, nil, rootPayload)
	require.NotNil(t, handshake)
	require.Empty(t, handshake.parentThreadID)
	rootThread := resolvePooledThreadID(account, mustCodexFingerprintSeed(account), "ws-pin-root")
	assert.Equal(t, rootThread, handshake.threadID)

	conn := &openAIWSCodexFingerprintFrameConn{handshakeIDs: handshake}
	require.Same(t, handshake, conn.idsForCreateFrame(rootPayload))

	second := conn.idsForCreateFrame(childPayload)
	require.NotNil(t, second)
	assert.True(t, second.connectionPinned)
	assert.Equal(t, rootThread, second.threadID)
	assert.Empty(t, second.parentThreadID)

	rewritten := applyCodexFingerprintToWSCreateFrameWithIDs(account, clientHeaders, childPayload, second)
	var body map[string]any
	require.NoError(t, json.Unmarshal(rewritten, &body))
	cm, ok := body["client_metadata"].(map[string]any)
	require.True(t, ok)
	assert.Equal(t, rootThread, cm["thread_id"], "钉死后不得因后续帧谱系改成 child")
	_, hasParent := cm[codexParentThreadIDHeader]
	_, hasSubagent := cm[codexOpenAISubagentHeader]
	assert.False(t, hasParent)
	assert.False(t, hasSubagent)
}

func TestCodexFingerprintWindowStoreIsSharedAcrossLocalStates(t *testing.T) {
	resetCodexFingerprintWindowStateForTest()
	t.Cleanup(resetCodexFingerprintWindowStateForTest)

	store := &memCodexFingerprintWindowStore{n: make(map[string]int64)}
	configureCodexFingerprintWindowStore(store)

	account := newTestOAuthAccount(77001, map[string]any{codexFingerprintModeExtraKey: "full"})
	clientHeaders := http.Header{}
	clientHeaders.Set("session-id", "shared-window")

	first := resolveCodexFingerprintIDsFromRequest(account, clientHeaders)
	require.NotNil(t, first)
	assert.Equal(t, first.threadID+":0", first.windowID)

	defaultCodexFingerprintWindowState = newCodexFingerprintWindowState()
	for i := 1; i < codexFingerprintWindowTurnStride; i++ {
		ids := resolveCodexFingerprintIDsFromRequest(account, clientHeaders)
		require.NotNil(t, ids)
		assert.Equal(t, first.threadID+":0", ids.windowID)
	}
	next := resolveCodexFingerprintIDsFromRequest(account, clientHeaders)
	require.NotNil(t, next)
	assert.Equal(t, first.threadID+":1", next.windowID, "共享 store 应跨本地 map 重置继续计数")
}

type memCodexFingerprintWindowStore struct {
	mu sync.Mutex
	n  map[string]int64
}

func TestApplyCodexFingerprintToBodyBytes_PreservesUnrelatedFieldsAndIntegers(t *testing.T) {
	account := newTestOAuthAccount(1, map[string]any{codexFingerprintModeExtraKey: "thread_pool"})
	ids := resolveCodexFingerprintIDsFromRequest(account, nil)
	require.NotNil(t, ids)

	// 2^53+1 无法用 float64 精确表示；全量 json.Unmarshal/Marshal 会改掉这个字面量。
	const oversizedInt = "9007199254740993"
	body := []byte(`{"model":"gpt-5.1","max_output_tokens":` + oversizedInt + `,"prompt_cache_key":"pcache-keep","input":[{"type":"message","role":"user","seq":` + oversizedInt + `,"content":"keep <tag>"}],"client_metadata":{"x-codex-installation-id":"old-install"}}`)

	rewritten, changed := applyCodexFingerprintToBodyBytes(body, ids)
	require.True(t, changed)
	assert.Equal(t, "gpt-5.1", gjson.GetBytes(rewritten, "model").String())
	assert.Equal(t, "pcache-keep", gjson.GetBytes(rewritten, "prompt_cache_key").String())
	assert.Equal(t, oversizedInt, gjson.GetBytes(rewritten, "max_output_tokens").Raw)
	assert.Equal(t, oversizedInt, gjson.GetBytes(rewritten, "input.0.seq").Raw)
	assert.Equal(t, "keep <tag>", gjson.GetBytes(rewritten, "input.0.content").String())
	assert.Equal(t, ids.installationID, gjson.GetBytes(rewritten, "client_metadata.x-codex-installation-id").String())
	assert.Equal(t, ids.threadID, gjson.GetBytes(rewritten, "client_metadata.thread_id").String())
}

func TestApplyCodexFingerprintToBodyBytes_RejectsNonObject(t *testing.T) {
	account := newTestOAuthAccount(1, map[string]any{codexFingerprintModeExtraKey: "session"})
	ids := resolveCodexFingerprintIDsFromRequest(account, nil)
	require.NotNil(t, ids)

	raw := []byte(`["not-an-object"]`)
	rewritten, changed := applyCodexFingerprintToBodyBytes(raw, ids)
	assert.False(t, changed)
	assert.Equal(t, raw, rewritten)
}

func TestResolveCodexFingerprintIDs_ShadowUsesOwnAccountID(t *testing.T) {
	parentID := int64(10)
	parent := newTestOAuthAccount(parentID, map[string]any{codexFingerprintModeExtraKey: "session"})
	shadow := newTestOAuthAccount(99, map[string]any{codexFingerprintModeExtraKey: "session"})
	shadow.ParentAccountID = &parentID
	require.True(t, shadow.IsShadow())
	require.True(t, shadow.IsOpenAIOAuth())

	parentIDs := resolveCodexFingerprintIDsFromRequest(parent, nil)
	shadowIDs := resolveCodexFingerprintIDsFromRequest(shadow, nil)
	require.NotNil(t, parentIDs)
	require.NotNil(t, shadowIDs)
	assert.Equal(t, parentIDs.installationID, shadowIDs.installationID, "同一种子按 seed 派生，影子账号共享收敛身份")
	assert.Equal(t, parentIDs.sessionID, shadowIDs.sessionID)
	assert.Equal(t, parentIDs.threadID, shadowIDs.threadID)
	assert.Equal(t, resolveConvergedInstallationID(shadow, testCodexFingerprintSeed), shadowIDs.installationID)
}

func TestBuildOpenAIWSHeaders_CtxPoolDoesNotApplyCodexFingerprint(t *testing.T) {
	gin.SetMode(gin.TestMode)
	svc := &OpenAIGatewayService{}
	account := newTestOAuthAccount(42, map[string]any{codexFingerprintModeExtraKey: "thread_pool"})

	rec := httptest.NewRecorder()
	c, _ := gin.CreateTestContext(rec)
	c.Request = httptest.NewRequest(http.MethodGet, "/v1/responses", nil)
	c.Request.Header.Set("x-codex-installation-id", "client-install-keep")
	c.Request.Header.Set("x-codex-window-id", "client-window-keep")
	c.Request.Header.Set("session_id", "client-session-keep")
	c.Request.Header.Set("conversation_id", "client-conv-keep")

	headers, _, err := svc.buildOpenAIWSHeaders(
		context.Background(),
		c,
		account,
		"token",
		OpenAIWSProtocolDecision{Transport: OpenAIUpstreamTransportResponsesWebsocketV2},
		true,
		"",
		"",
		"pcache",
		"gpt-5.1",
		"",
	)
	require.NoError(t, err)

	assert.Equal(t, "client-install-keep", headers.Get("x-codex-installation-id"), "ctx_pool/dedicated 握手不得改写客户端 installation")
	assert.Equal(t, "client-window-keep", headers.Get("x-codex-window-id"))
	assert.Equal(t, isolateOpenAISessionID(0, "client-session-keep"), headers.Get("session_id"))
	assert.Equal(t, isolateOpenAISessionID(0, "client-conv-keep"), headers.Get("conversation_id"))

	converged := resolveCodexFingerprintIDsFromRequest(account, c.Request.Header)
	require.NotNil(t, converged)
	assert.NotEqual(t, converged.installationID, headers.Get("x-codex-installation-id"))
	assert.NotEqual(t, converged.sessionID, headers.Get("session_id"))
	assert.NotEqual(t, converged.threadID, headers.Get("conversation_id"))
}

func TestApplyCodexFingerprintHeaders_OverwritesClientInstallation(t *testing.T) {
	account := newTestOAuthAccount(42, map[string]any{codexFingerprintModeExtraKey: "thread_pool"})
	clientHeaders := http.Header{}
	clientHeaders.Set("session-id", "client-session-keep")
	ids := resolveCodexFingerprintIDsFromRequest(account, clientHeaders)
	require.NotNil(t, ids)

	h := http.Header{}
	h.Set("x-codex-installation-id", "client-install-keep")
	h.Set("session_id", "client-session-keep")
	applyCodexFingerprintHeaders(h, ids)
	assert.Equal(t, ids.installationID, h.Get("x-codex-installation-id"))
	assert.Equal(t, ids.sessionID, h.Get("session_id"))
	assert.Equal(t, ids.threadID, h.Get("conversation_id"))
}

func (s *memCodexFingerprintWindowStore) NextCodexFingerprintWindowIndex(_ context.Context, accountID int64, threadID string) (int, error) {
	s.mu.Lock()
	defer s.mu.Unlock()
	key := fmt.Sprintf("%d:%s", accountID, threadID)
	s.n[key]++
	return int((s.n[key] - 1) / int64(codexFingerprintWindowTurnStride)), nil

}

// --- 透传路径：raw 字节版 client_metadata 改写 ---

// rawVsMapClientMetadata 用同一份 ids 分别跑 map 版与 raw 字节版，
// 返回两侧最终的 client_metadata 解码结果。
func rawVsMapClientMetadata(t *testing.T, body []byte, ids *codexFingerprintIDs) (map[string]any, map[string]any) {
	t.Helper()

	var decoded map[string]any
	require.NoError(t, json.Unmarshal(body, &decoded))
	applyCodexFingerprintClientMetadata(decoded, ids)
	mapCM, _ := decoded["client_metadata"].(map[string]any)

	rawBody, changed, err := applyCodexFingerprintClientMetadataRaw(body, ids)
	require.NoError(t, err)
	require.True(t, changed)
	var rawDecoded map[string]any
	require.NoError(t, json.Unmarshal(rawBody, &rawDecoded))
	rawCM, _ := rawDecoded["client_metadata"].(map[string]any)
	return mapCM, rawCM
}

func cloneCodexFingerprintIDsForTest(ids *codexFingerprintIDs) *codexFingerprintIDs {
	if ids == nil {
		return nil
	}
	cloned := *ids
	cloned.originalBodySessionID = ""
	cloned.originalBodySessionIDCaptured = false
	return &cloned
}

func applyMapAndRawFingerprintBodiesForTest(t *testing.T, body []byte, ids *codexFingerprintIDs) (map[string]any, map[string]any) {
	t.Helper()

	mapIDs := cloneCodexFingerprintIDsForTest(ids)
	rawIDs := cloneCodexFingerprintIDsForTest(ids)

	var decoded map[string]any
	require.NoError(t, json.Unmarshal(body, &decoded))
	applyCodexFingerprintClientMetadata(decoded, mapIDs)

	rawBody, _, err := applyCodexFingerprintClientMetadataRaw(body, rawIDs)
	require.NoError(t, err)
	var rawDecoded map[string]any
	require.NoError(t, json.Unmarshal(rawBody, &rawDecoded))
	return decoded, rawDecoded
}

func TestApplyCodexFingerprintPromptCacheKey_MapRawEquivalence(t *testing.T) {
	for _, mode := range []codexFingerprintMode{codexFingerprintSession, codexFingerprintFull} {
		t.Run(string(mode)+"/default", func(t *testing.T) {
			account := newTestOAuthAccount(4300, map[string]any{codexFingerprintModeExtraKey: string(mode)})
			ids := resolveCodexFingerprintIDs(account, "header-session", mode)
			require.NotNil(t, ids)

			body := []byte(`{"model":"gpt-5.6-sol","prompt_cache_key":"body-session","client_metadata":{"session_id":" body-session ","trace":"keep"},"input":[]}`)
			mapBody, rawBody := applyMapAndRawFingerprintBodiesForTest(t, body, ids)

			require.Equal(t, mapBody["prompt_cache_key"], rawBody["prompt_cache_key"])
			require.Equal(t, ids.sessionID, mapBody["prompt_cache_key"])
			mapCM, _ := mapBody["client_metadata"].(map[string]any)
			rawCM, _ := rawBody["client_metadata"].(map[string]any)
			require.Equal(t, ids.sessionID, mapCM["session_id"])
			require.Equal(t, mapCM["session_id"], rawCM["session_id"])
			require.Equal(t, "keep", rawCM["trace"])
		})
	}

	t.Run("explicit override", func(t *testing.T) {
		account := newTestOAuthAccount(4301, map[string]any{codexFingerprintModeExtraKey: "session"})
		ids := resolveCodexFingerprintIDs(account, "header-session", codexFingerprintSession)
		require.NotNil(t, ids)

		body := []byte(`{"model":"gpt-5.6-sol","prompt_cache_key":"explicit-cache","client_metadata":{"session_id":"body-session"},"input":[]}`)
		mapBody, rawBody := applyMapAndRawFingerprintBodiesForTest(t, body, ids)

		require.Equal(t, "explicit-cache", mapBody["prompt_cache_key"])
		require.Equal(t, "explicit-cache", rawBody["prompt_cache_key"])
		mapCM, _ := mapBody["client_metadata"].(map[string]any)
		rawCM, _ := rawBody["client_metadata"].(map[string]any)
		require.Equal(t, ids.sessionID, mapCM["session_id"])
		require.Equal(t, ids.sessionID, rawCM["session_id"])
	})
}

func TestApplyCodexFingerprintPromptCacheKey_Negatives(t *testing.T) {
	sessionAccount := newTestOAuthAccount(4310, map[string]any{codexFingerprintModeExtraKey: "session"})
	sessionIDs := resolveCodexFingerprintIDs(sessionAccount, "header-session", codexFingerprintSession)
	require.NotNil(t, sessionIDs)
	deviceAccount := newTestOAuthAccount(4311, map[string]any{codexFingerprintModeExtraKey: "device"})
	deviceIDs := resolveCodexFingerprintIDs(deviceAccount, "header-session", codexFingerprintDevice)
	require.NotNil(t, deviceIDs)

	tests := []struct {
		name          string
		body          []byte
		ids           *codexFingerprintIDs
		wantExists    bool
		wantCacheKey  any
		wantRawString string
	}{
		{
			name:       "missing key is not injected",
			body:       []byte(`{"client_metadata":{"session_id":"body-session"}}`),
			ids:        sessionIDs,
			wantExists: false,
		},
		{
			name:         "empty key preserved",
			body:         []byte(`{"prompt_cache_key":"","client_metadata":{"session_id":"body-session"}}`),
			ids:          sessionIDs,
			wantExists:   true,
			wantCacheKey: "",
		},
		{
			name:         "whitespace-different key is an explicit override",
			body:         []byte(`{"prompt_cache_key":" body-session ","client_metadata":{"session_id":"body-session"}}`),
			ids:          sessionIDs,
			wantExists:   true,
			wantCacheKey: " body-session ",
		},
		{
			name:         "non-string key preserved",
			body:         []byte(`{"prompt_cache_key":123,"client_metadata":{"session_id":"body-session"}}`),
			ids:          sessionIDs,
			wantExists:   true,
			wantCacheKey: float64(123),
		},
		{
			name:         "missing source metadata preserves key",
			body:         []byte(`{"prompt_cache_key":"body-session"}`),
			ids:          sessionIDs,
			wantExists:   true,
			wantCacheKey: "body-session",
		},
		{
			name:         "non-string source session preserves key",
			body:         []byte(`{"prompt_cache_key":"123","client_metadata":{"session_id":123}}`),
			ids:          sessionIDs,
			wantExists:   true,
			wantCacheKey: "123",
		},
		{
			name:         "non-object source metadata preserves key",
			body:         []byte(`{"prompt_cache_key":"body-session","client_metadata":"bad"}`),
			ids:          sessionIDs,
			wantExists:   true,
			wantCacheKey: "body-session",
		},
		{
			name:         "device mode preserves key",
			body:         []byte(`{"prompt_cache_key":"body-session","client_metadata":{"session_id":"body-session"}}`),
			ids:          deviceIDs,
			wantExists:   true,
			wantCacheKey: "body-session",
		},
		{
			name:          "off mode preserves body",
			body:          []byte(`{"prompt_cache_key":"body-session","client_metadata":{"session_id":"body-session"}}`),
			ids:           nil,
			wantExists:    true,
			wantCacheKey:  "body-session",
			wantRawString: `{"prompt_cache_key":"body-session","client_metadata":{"session_id":"body-session"}}`,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			var mapBody map[string]any
			require.NoError(t, json.Unmarshal(tt.body, &mapBody))
			changedMap := applyCodexFingerprintClientMetadata(mapBody, cloneCodexFingerprintIDsForTest(tt.ids))

			rawBody, changedRaw, err := applyCodexFingerprintClientMetadataRaw(tt.body, cloneCodexFingerprintIDsForTest(tt.ids))
			require.NoError(t, err)
			if tt.ids == nil {
				require.False(t, changedMap)
				require.False(t, changedRaw)
				require.JSONEq(t, tt.wantRawString, string(rawBody))
				return
			}
			require.True(t, changedMap)
			require.True(t, changedRaw)

			rawDecoded := map[string]any{}
			require.NoError(t, json.Unmarshal(rawBody, &rawDecoded))
			_, mapExists := mapBody["prompt_cache_key"]
			_, rawExists := rawDecoded["prompt_cache_key"]
			require.Equal(t, tt.wantExists, mapExists)
			require.Equal(t, tt.wantExists, rawExists)
			if tt.wantExists {
				require.Equal(t, tt.wantCacheKey, mapBody["prompt_cache_key"])
				require.Equal(t, tt.wantCacheKey, rawDecoded["prompt_cache_key"])
			}
		})
	}
}

func TestApplyCodexFingerprintClientMetadataRaw_MatchesMapVariant(t *testing.T) {
	embedded := `{\"installation_id\":\"real-install\",\"session_id\":\"real-session\",\"sandbox\":\"seatbelt\"}`
	bodies := map[string]string{
		"no_client_metadata": `{"model":"gpt-5.6-sol","input":[],"stream":true}`,
		"object_with_extras": `{"model":"gpt-5.6-sol","client_metadata":{"session_id":"client-session","traceparent":"00-abc-def-01","x-codex-turn-metadata":"` + embedded + `"},"stream":true}`,
		"non_object_value":   `{"model":"gpt-5.6-sol","client_metadata":"bogus","stream":true}`,
	}
	for _, mode := range []codexFingerprintMode{codexFingerprintDevice, codexFingerprintSession, codexFingerprintFull} {
		account := newTestOAuthAccount(4242, map[string]any{codexFingerprintModeExtraKey: string(mode)})
		ids := resolveCodexFingerprintIDs(account, "client-sess-raw", mode)
		require.NotNil(t, ids)
		for name, body := range bodies {
			t.Run(string(mode)+"/"+name, func(t *testing.T) {
				mapCM, rawCM := rawVsMapClientMetadata(t, []byte(body), ids)
				assert.Equal(t, mapCM, rawCM, "raw 字节版与 map 版的 client_metadata 结果必须逐点一致")
			})
		}
	}
}

func TestApplyCodexFingerprintClientMetadataRaw_PreservesUnrelatedFields(t *testing.T) {
	account := newTestOAuthAccount(4243, map[string]any{codexFingerprintModeExtraKey: "session"})
	ids := resolveCodexFingerprintIDs(account, "client-sess-preserve", codexFingerprintSession)
	require.NotNil(t, ids)

	body := []byte(`{"model":"gpt-5.6-sol","input":[{"type":"message","role":"user","content":"hi"}],"stream":true,"prompt_cache_key":"pck-1"}`)
	out, changed, err := applyCodexFingerprintClientMetadataRaw(body, ids)
	require.NoError(t, err)
	require.True(t, changed)

	var decoded map[string]any
	require.NoError(t, json.Unmarshal(out, &decoded))
	assert.Equal(t, "gpt-5.6-sol", decoded["model"])
	assert.Equal(t, "pck-1", decoded["prompt_cache_key"])
	assert.Equal(t, true, decoded["stream"])
	cm, _ := decoded["client_metadata"].(map[string]any)
	require.NotNil(t, cm)
	assert.Equal(t, ids.sessionID, cm["session_id"])
	assert.Equal(t, ids.turnID, cm["turn_id"])
}

func TestApplyCodexFingerprintClientMetadataRaw_Noop(t *testing.T) {
	body := []byte(`{"model":"gpt-5.6-sol"}`)
	out, changed, err := applyCodexFingerprintClientMetadataRaw(body, nil)
	require.NoError(t, err)
	assert.False(t, changed)
	assert.Equal(t, body, out)

	out, changed, err = applyCodexFingerprintClientMetadataRaw(nil, &codexFingerprintIDs{mode: codexFingerprintSession, installationID: "x"})
	require.NoError(t, err)
	assert.False(t, changed)
	assert.Nil(t, out)
}

// --- context 暂存与出站头应用（透传/非透传共用 seam）---

func newFingerprintStageTestContext(t *testing.T) *gin.Context {
	t.Helper()
	gin.SetMode(gin.TestMode)
	c, _ := gin.CreateTestContext(httptest.NewRecorder())
	c.Request = httptest.NewRequest(http.MethodPost, "/v1/responses", nil)
	return c
}

func TestStageCodexFingerprintIDs_NilOverwritesPreviousAccount(t *testing.T) {
	c := newFingerprintStageTestContext(t)
	accountA := newTestOAuthAccount(1001, map[string]any{codexFingerprintModeExtraKey: "session"})
	idsA := resolveCodexFingerprintIDs(accountA, "sess-x", codexFingerprintSession)
	require.NotNil(t, idsA)
	stageCodexFingerprintIDs(c, idsA)

	// failover 切到 off 模式账号：无条件覆写为 nil，上一账号 IDs 不得残留
	stageCodexFingerprintIDs(c, nil)

	h := http.Header{}
	h.Set("session_id", "isolated-session")
	accountB := newTestOAuthAccount(1002, map[string]any{"codex_fingerprint_mode": "off"})
	applyStagedCodexFingerprintHeaders(c, accountB, h)
	assert.Equal(t, "isolated-session", h.Get("session_id"), "off 账号不得应用上一账号的收敛 ID")
	assert.Empty(t, h.Get("x-codex-installation-id"))
}

func TestApplyStagedCodexFingerprintRejectsDifferentOAuthAccount(t *testing.T) {
	c := newFingerprintStageTestContext(t)
	accountA := newTestOAuthAccount(1003, map[string]any{codexFingerprintModeExtraKey: "session"})
	idsA := resolveCodexFingerprintIDs(accountA, "sess-a", codexFingerprintSession)
	require.NotNil(t, idsA)
	stageCodexFingerprintIDs(c, idsA)

	accountB := newTestOAuthAccount(1004, map[string]any{codexFingerprintModeExtraKey: "session"})
	h := make(http.Header)
	h.Set("session-id", "account-b-session")
	applyStagedCodexFingerprintHeaders(c, accountB, h)
	assert.Equal(t, "account-b-session", h.Get("session-id"))
	assert.Empty(t, h.Get("x-codex-installation-id"))

	body := map[string]any{"client_metadata": map[string]any{"session_id": "account-b-session"}}
	assert.False(t, applyStagedCodexFingerprintClientMetadata(c, accountB, body))
	clientMetadata, ok := body["client_metadata"].(map[string]any)
	require.True(t, ok)
	assert.Equal(t, "account-b-session", clientMetadata["session_id"])
}

func TestApplyStagedCodexFingerprintHeaders_SkipsNonOAuthAccount(t *testing.T) {
	c := newFingerprintStageTestContext(t)
	oauthIDs := resolveCodexFingerprintIDs(newTestOAuthAccount(1003, map[string]any{codexFingerprintModeExtraKey: "session"}), "sess-y", codexFingerprintSession)
	require.NotNil(t, oauthIDs)
	stageCodexFingerprintIDs(c, oauthIDs)

	h := http.Header{}
	apiKeyAccount := &Account{ID: 1004, Platform: PlatformOpenAI, Type: AccountTypeAPIKey}
	applyStagedCodexFingerprintHeaders(c, apiKeyAccount, h)
	assert.Empty(t, h.Get("x-codex-installation-id"), "stale 收敛 ID 不得应用到非 OAuth 账号")
}

func TestBuildUpstreamRequestOpenAIPassthrough_AppliesStagedFingerprint(t *testing.T) {
	svc := &OpenAIGatewayService{}
	// 收敛是显式 opt-in（#5610）：显式开启后验证透传路径的出站头收敛。
	account := newTestOAuthAccount(2001, map[string]any{
		"openai_oauth_passthrough": true,
		"codex_fingerprint_mode":   "session",
	})

	c := newFingerprintStageTestContext(t)
	c.Request.Header.Set("session_id", "real-client-session")
	c.Request.Header.Set("User-Agent", "codex_cli_rs/0.144.1 (Ubuntu 22.4.0; x86_64) xterm-256color")
	c.Request.Header.Set("originator", "codex_cli_rs")
	c.Request.Header.Set("x-codex-turn-metadata", `{"installation_id":"real-install","session_id":"real-session","sandbox":"seatbelt"}`)

	// 复刻 forwardOpenAIPassthrough 的解析+暂存 seam（默认 session 模式）
	ids := resolveCodexFingerprintIDsFromRequest(account, c.Request.Header)
	require.NotNil(t, ids)
	stageCodexFingerprintIDs(c, ids)

	body := []byte(`{"model":"gpt-5.6-sol","input":[],"stream":true}`)
	req, err := svc.buildUpstreamRequestOpenAIPassthrough(context.Background(), c, account, body, "test-token")
	require.NoError(t, err)

	assert.Equal(t, ids.sessionID, req.Header.Get("session_id"), "session 模式下出站 session_id 应为账号级收敛值")
	assert.Equal(t, ids.installationID, req.Header.Get("x-codex-installation-id"))
	assert.Equal(t, ids.windowID, req.Header.Get("x-codex-window-id"))
	assert.Equal(t, ids.threadID, req.Header.Get("x-client-request-id"))
	turnMetadata := req.Header.Get("x-codex-turn-metadata")
	require.NotEmpty(t, turnMetadata)
	assert.Contains(t, turnMetadata, ids.sessionID, "turn-metadata JSON 中的 session_id 应被收敛")
	assert.Contains(t, turnMetadata, `"sandbox":"seatbelt"`, "turn-metadata 未指定字段应原样保留")
}

func TestBuildUpstreamRequestOpenAIPassthrough_OffModeKeepsIsolatedSession(t *testing.T) {
	svc := &OpenAIGatewayService{}
	account := newTestOAuthAccount(2002, map[string]any{
		"openai_oauth_passthrough": true,
		"codex_fingerprint_mode":   "off",
	})

	c := newFingerprintStageTestContext(t)
	c.Request.Header.Set("session_id", "real-client-session")
	c.Request.Header.Set("originator", "codex_cli_rs")

	ids := resolveCodexFingerprintIDsFromRequest(account, c.Request.Header)
	require.Nil(t, ids)
	stageCodexFingerprintIDs(c, ids)

	body := []byte(`{"model":"gpt-5.6-sol","input":[],"stream":true}`)
	req, err := svc.buildUpstreamRequestOpenAIPassthrough(context.Background(), c, account, body, "test-token")
	require.NoError(t, err)

	assert.NotEmpty(t, req.Header.Get("session_id"))
	assert.NotEqual(t, resolveConvergedSessionID(testCodexFingerprintSeed), req.Header.Get("session_id"), "off 模式不得收敛 session_id")
	assert.Empty(t, req.Header.Get("x-codex-window-id"))
}

func TestApplyCodexFingerprintClientMetadataRaw_NonObjectBodyUntouched(t *testing.T) {
	account := newTestOAuthAccount(4244, map[string]any{codexFingerprintModeExtraKey: "session"})
	ids := resolveCodexFingerprintIDs(account, "client-sess-nonobj", codexFingerprintSession)
	require.NotNil(t, ids)

	for _, body := range []string{`[1,2,3]`, `"plain string"`, `not json at all`} {
		out, changed, err := applyCodexFingerprintClientMetadataRaw([]byte(body), ids)
		require.NoError(t, err)
		assert.False(t, changed, "非 JSON 对象 body 不应被改写: %s", body)
		assert.Equal(t, []byte(body), out)
	}
}

func mustCodexFingerprintSeed(account *Account) string {
	seed, ok := codexFingerprintSeed(account.Extra)
	if !ok {
		return testCodexFingerprintSeed
	}
	return seed
}
