package admin

import (
	"context"
	"encoding/json"
	"io"
	"net/http"
	"net/url"
	"os"
	"strings"
	"time"

	"github.com/Wei-Shaw/sub2api/internal/pkg/response"
	"github.com/Wei-Shaw/sub2api/internal/service"
	"github.com/gin-gonic/gin"
)

// The native plugin talks only to an operator-configured sidecar, never a URL
// supplied by the browser. Docker credentials and socket remain outside the UI.
func ccgatewayURL() string {
	if value := strings.TrimRight(os.Getenv("CCGATEWAY_URL"), "/"); value != "" {
		return value
	}
	return "http://127.0.0.1:8787"
}
func ccgatewayRequest(ctx context.Context, method, path string, body io.Reader) (*http.Response, error) {
	req, err := http.NewRequestWithContext(ctx, method, ccgatewayURL()+path, body)
	if err != nil {
		return nil, err
	}
	req.Header.Set("Authorization", "Bearer "+os.Getenv("CCG_ADMIN_KEY"))
	req.Header.Set("Content-Type", "application/json")
	client := &http.Client{Timeout: 50 * time.Second, CheckRedirect: func(_ *http.Request, _ []*http.Request) error { return http.ErrUseLastResponse }}
	return client.Do(req)
}

func (h *PluginHandler) CCGateway(c *gin.Context) {
	c.Header("Cache-Control", "no-store")
	path := "/admin/status"
	if c.Request.Method == http.MethodPost {
		action := c.Param("action")
		switch action {
		case "start", "complete", "cancel", "logout":
			path = "/admin/auth/" + action
		default:
			response.BadRequest(c, "不支持的授权操作")
			return
		}
	}
	if os.Getenv("CCG_ADMIN_KEY") == "" {
		response.Error(c, 503, "请配置 CCG_ADMIN_KEY 并启动本地 Docker 网关")
		return
	}
	res, err := ccgatewayRequest(c.Request.Context(), c.Request.Method, path, http.MaxBytesReader(c.Writer, c.Request.Body, 8192))
	if err != nil {
		response.Error(c, 502, "无法连接本地 Docker 网关，请检查容器状态")
		return
	}
	defer res.Body.Close()
	var body json.RawMessage
	if json.NewDecoder(io.LimitReader(res.Body, 65536)).Decode(&body) != nil {
		response.Error(c, 502, "网关返回无效响应")
		return
	}
	if res.StatusCode != 200 {
		var failure struct {
			Error struct {
				Message string `json:"message"`
			} `json:"error"`
		}
		_ = json.Unmarshal(body, &failure)
		if failure.Error.Message == "" {
			failure.Error.Message = "网关授权操作失败"
		}
		response.BadRequest(c, failure.Error.Message)
		return
	}
	response.Success(c, body)
}

// Provision through the existing account service so scheduling, group policy,
// encryption and the public /v1/messages entrypoint retain their usual behavior.
func (h *AccountHandler) ConnectCCGateway(c *gin.Context) {
	key := os.Getenv("CCG_API_KEY")
	if key == "" || os.Getenv("CCG_ADMIN_KEY") == "" {
		response.BadRequest(c, "请先配置网关密钥")
		return
	}
	target, err := url.Parse(ccgatewayURL())
	if err != nil || target.Host == "" || (target.Scheme != "http" && target.Scheme != "https") {
		response.BadRequest(c, "网关地址无效")
		return
	}
	res, err := ccgatewayRequest(c.Request.Context(), http.MethodGet, "/admin/status", nil)
	if err != nil {
		response.BadRequest(c, "网关不可用")
		return
	}
	defer res.Body.Close()
	var status struct {
		LoggedIn bool `json:"logged_in"`
	}
	if res.StatusCode != 200 || json.NewDecoder(io.LimitReader(res.Body, 65536)).Decode(&status) != nil || !status.LoggedIn {
		response.BadRequest(c, "请先完成 Claude 授权")
		return
	}
	var input struct {
		Name     string  `json:"name" binding:"max=100"`
		GroupIDs []int64 `json:"group_ids"`
	}
	if c.ShouldBindJSON(&input) != nil {
		response.BadRequest(c, "账号参数无效")
		return
	}
	if strings.TrimSpace(input.Name) == "" {
		input.Name = "CCGateway（本地 Docker）"
	}
	account, err := h.adminService.CreateAccount(c.Request.Context(), &service.CreateAccountInput{
		Name: input.Name, Platform: service.PlatformAnthropic, Type: service.AccountTypeAPIKey,
		Credentials: map[string]any{"base_url": ccgatewayURL(), "api_key": key},
		Extra:       map[string]any{"builtin_plugin": "ccgateway"}, Concurrency: 4, Priority: 50, GroupIDs: input.GroupIDs,
	})
	if err != nil {
		response.ErrorFrom(c, err)
		return
	}
	// Never return sidecar secrets to the browser.
	response.Success(c, gin.H{"id": account.ID, "name": account.Name})
}
