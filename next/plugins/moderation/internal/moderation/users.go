package moderation

import (
	"context"
	"net/http"

	"google.golang.org/grpc/codes"
	"google.golang.org/grpc/status"

	pluginv1 "github.com/Sub2API-Devs/sup2api/next/sdk/gen/pluginv1"
	"github.com/Sub2API-Devs/sup2api/next/sdk/pluginsdk"
)

// Users of the core (HostService.GetUsers, grant users.read, host API 8,
// CONTRACTS §74.3): a user must exist before it is put on the watch list or
// banned (new-api AddModerationWatch), and the console shows names for the
// ids of a page with one call (GET /users?ids=).

// CoreUser is one user of GET /users.
type CoreUser struct {
	ID          int64    `json:"id"`
	Email       string   `json:"email"`
	DisplayName string   `json:"display_name"`
	Status      string   `json:"status"`
	Roles       []string `json:"roles"`
}

// lookupUsers returns the core users among ids; unknown and deleted users
// are left out. ok=false: the host cannot tell (users.read not granted, or
// a host before API 8), and the callers skip what needs it.
func (p *Plugin) lookupUsers(ctx context.Context, ids []int64) (users []*pluginv1.UserInfo, ok bool, err error) {
	if p.host == nil {
		return nil, false, nil
	}
	users, err = pluginsdk.GetUsers(ctx, p.host, ids)
	switch status.Code(err) {
	case codes.OK:
		return users, true, nil
	case codes.PermissionDenied, codes.FailedPrecondition, codes.Unimplemented:
		return nil, false, nil
	}
	return nil, false, err
}

// missingUser is the answer to a write naming a user the core does not know
// (404 user_not_found), or nil when the user exists or the host cannot tell.
func (p *Plugin) missingUser(ctx context.Context, uid int64) *pluginv1.HTTPResponse {
	users, ok, err := p.lookupUsers(ctx, []int64{uid})
	if err != nil {
		return pluginsdk.Unavailable("user lookup failed / 查询用户失败: " + err.Error())
	}
	if !ok || len(users) > 0 {
		return nil
	}
	return pluginsdk.ErrorResponse(http.StatusNotFound, "user_not_found", "the user does not exist / 用户不存在")
}

// getUsers: GET /users?ids=1,2 (at most 500) -> the users the core knows.
// 503 users_unavailable when the host cannot look users up.
func (p *Plugin) getUsers(ctx context.Context, req *pluginv1.HTTPRequest) (*pluginv1.HTTPResponse, error) {
	ids, valid := parseIDList(pluginsdk.Query(req, "ids"))
	if !valid {
		return pluginsdk.FieldErrorResponse("invalid query / 查询参数无效",
			pluginsdk.FieldErrors{}.Add("ids", "invalid", "ids is a comma list of up to 500 user ids / ids 为逗号分隔的用户 id，最多 500 个")), nil
	}
	users, ok, err := p.lookupUsers(ctx, ids)
	if err != nil {
		return pluginsdk.Unavailable("user lookup failed / 查询用户失败: " + err.Error()), nil
	}
	if !ok {
		return pluginsdk.ErrorResponse(http.StatusServiceUnavailable, "users_unavailable",
			"user lookup needs the users.read grant and host API 8 / 查询用户需要 users.read 授权和 Host API 8"), nil
	}
	out := make([]CoreUser, len(users))
	for i, u := range users {
		out[i] = CoreUser{ID: u.GetId(), Email: u.GetEmail(), DisplayName: u.GetDisplayName(), Status: u.GetStatus(), Roles: u.GetRoles()}
	}
	return pluginsdk.DataResponse(out), nil
}
