# CCGateway 控制面板连接改造设计

## 目标

将 CCGateway 插件从直接 SSH 管理账号容器改造为通过控制面板 HTTP API 管理。

## 架构变更

### 当前架构
- 插件配置时通过 SSH 直接访问 Docker 主机
- 直接管理账号容器的生命周期
- 每次操作都需要 SSH 连接

### 新架构

#### 1. 初始化阶段（需要 SSH）
- 用户提供 SSH 连接信息
- 核心通过 SSH 上传控制面板镜像
- 检查 Docker 是否已安装（不自动安装）
- 启动控制面板容器
- 保存控制面板连接信息（IP + 端口 + 密钥）

#### 2. 后续操作阶段（仅 HTTP）
- 使用控制面板 HTTP API 管理
- 上传账号容器镜像
- 配置账号参数
- 启动/停止账号容器
- 更新插件镜像

## 实现要点

### 1. 状态检测

```go
type ConnectionState struct {
    HasController bool   // 是否已安装控制面板
    ControllerURL string // 控制面板地址
    ControllerKey string // 控制面板密钥
    Healthy       bool   // 控制面板是否健康
}
```

### 2. 配置流程

```
用户配置插件:
  检查控制面板状态
  if 已连接 && 健康:
    直接使用 HTTP API
  else:
    要求 SSH 信息
    安装控制面板
    保存连接信息
```

### 3. 控制面板 API

#### 现有 API（manager.py）
- `GET /health` - 健康检查
- `GET /accounts` - 列出所有账号运行时
- `PUT /accounts/<key>/config` - 配置账号
- `GET /accounts/<key>/status` - 账号状态
- `DELETE /accounts/<key>` - 删除草稿运行时
- 账号请求代理（messages, status, auth 等）

#### 需要新增的 API
- `POST /images/upload` - 上传镜像
- `POST /images/<image_id>/load` - 加载镜像到 Docker
- `GET /system/docker-info` - Docker 系统信息

### 4. 镜像管理流程

#### 初次安装
```
1. SSH 连接
2. 检查 Docker
3. 上传控制面板镜像（打包在插件中）
4. 上传账号容器镜像
5. 启动控制面板
6. 通过 /health 验证
7. 保存连接信息
```

#### 后续更新
```
1. HTTP 连接控制面板
2. POST /images/upload 上传新镜像
3. 控制面板自动加载镜像
4. PUT /accounts/<key>/config 触发容器重启
```

### 5. 控制面板自动启动逻辑

控制面板需要实现：
- 监听镜像更新事件
- 检测账号容器使用的镜像版本
- 自动重启使用旧镜像的容器

## 文件修改清单

### 核心代码
- `next/server/internal/ccgateway/config.go` - 添加控制面板连接状态
- `next/server/internal/ccgateway/runtime.go` - 双模式安装逻辑
- `next/server/internal/ccgateway/controller_client.go` (新建) - HTTP 客户端
- `next/server/internal/ccgateway/image_upload.go` (新建) - 镜像上传

### 控制面板
- `next/plugins/ccgateway/companions/controller/manager.py` - 添加镜像上传 API
- `next/plugins/ccgateway/companions/controller/images.py` (新建) - 镜像管理

### 前端
- `next/web/src/views/ccgateway/RemoteSettings.vue` - 状态检测和安装流程
- `next/web/src/views/ccgateway/ControllerConnection.vue` (新建) - 连接管理组件
- `next/web/src/views/ccgateway/controllerApi.ts` (新建) - API 调用

### 插件配置
- `next/plugins/ccgateway/internal/ccgateway/ccgateway.go` - 验证控制面板连接

## 实施步骤

1. ✅ 分析现有架构
2. [ ] 实现控制面板 HTTP 客户端
3. [ ] 添加镜像上传 API（控制面板）
4. [ ] 实现双模式安装逻辑（核心）
5. [ ] 更新前端配置表单
6. [ ] 添加状态检测接口
7. [ ] 测试完整流程
8. [ ] 更新文档

## 测试要点

1. 首次安装：SSH → 上传镜像 → 启动控制面板
2. 状态检测：已安装直接使用，未安装要求 SSH
3. 镜像更新：HTTP 上传 → 自动加载 → 容器重启
4. 错误恢复：连接失败时回退到 SSH 模式
5. 多节点：每个节点独立的控制面板
