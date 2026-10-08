# 2026-10-08 第六批 Worker 原地部署

状态：cc-max #21/#22 已部署 `160f6064ada938e69e84a32797df82fd660d8e6e`，原容器/镜像/卷/授权均保留。此记录只覆盖账号 Worker，不代表核心公网资源路由部署。

## Git 构建与门禁

服务器 Git fetch 后精确干净 worktree `/root/ccgateway-features-4903994f4`。首次命令 bash -lc 重置 PATH，go not found；改 bash -c 后正常运行，未影响线上。原490399完整race发现旧fixture仍将container:null判非法，真实报错 TestGenerationPlanValidationAndSemanticIgnore。未部署该失败候选。

root仅修一行测试并提交 `160f6064ada938e69e84a32797df82fd660d8e6e`，服务器再次Git fetch，干净检出 `/root/ccgateway-features-160f6064a`。没有上传本地应用源码。

- 490399 engine/Worker vet、contracts race/vet通过。
- 490399真实CLI2.1.292对隔离假上游 CodeExec/PTC/Skills/resources/files broad targeted通过235.614s。
- 160f6064仅旧测试夹具变更，业务实现相同，按主线程要求复用同实现CLI证据；完整engine/Worker race重新通过，engine15.783s。
- 单构建容器限2CPU/2GiB，golang:1.27-trixie，复用受控Go缓存卷；未并行构建挤占负载。
- 产物 `/opt/ccgateway-runtime/feature-validation-160f6064a/worker`，SHA256 `9edea7dcc5ba07c57ff9307a7cac710efc2c36c01990145537ad698546d8ba30`。
- Build version `features-160f6064a`，revision完整SHA，modified=false，部署后实际 /admin/features确认。

## 原地替换与回滚

升级前两个Worker均为78aa产物SHA `1869444ce135222a9f9a4d5b52cd7700aa5d02f2f6ff2434c76d0e278731ee44`；CLI已是2.1.292，本次不替换CLI。

新备份：
- `/opt/ccgateway-runtime/manual-backups/20261008-160f6064a-21`
- `/opt/ccgateway-runtime/manual-backups/20261008-160f6064a-22`

每份含旧ccgateway、精简容器事实、CLI symlink，不含凭据。核对旧程序hash、候选hash与无活动CLI请求后，docker cp到容器临时文件、chmod755、核hash、原子mv至`/usr/local/bin/ccgateway`，原容器restart。#22先升级验health/features/login，再#21。

回滚可将对应备份程序先cp至容器临时名，再mv回原程序并原地restart；CLI/卷/授权无需修改。本批未触发回滚。一次docker top仅给comm导致缺PID列，发生在备份/替换前；补pid列后重新执行。

最终两者均running、1000:1000，启动命令仍docker-entrypoint.sh ccgateway：
- #21 ID `6b67d1ffb6e65ffd91a07ff43b18c987e454a2ec20342e064bd33dc91543ae2b`，原ccg-21-data卷，loggedIn=true/api_key。
- #22 ID `9de9b219210f43379014eb2bb991bc7cb813e2ecd92a9ec0830e232e7f1c8e22`，原账号数据卷，loggedIn=true/claude.ai。
- 两者镜像仍 `sha256:789f605082fbec34e210d859fac06c9f9603e3ec8f535e249924074a5754b85d`，CLI2.1.292。没有重建容器或替换镜像引用。
- healthz与admin/features均200；资源spool body文件均0。

## 真实最小调用与资格边界

凭据只由容器UID1000进程使用，不输出key/token/email/原始profile标识。直连Worker的私有资源grant是受控运维验证，不等于核心租户公开ID ACL验证。

1. #21普通Messages：claude-opus-5-5，max_tokens32，HTTP200/end_turn，准确READY；input41/output4。没有为#21伪造资源issuer资格。
2. #22真实resource identity：200，principal/generation存在。
3. #22CodeExec：请求Python17*19，HTTP200/end_turn，返回bash_code_execution_tool_result_error，真实error_code=too_many_requests，无container。日志upstream/CLI/最终response一致。usage input103/output202/cache_creation2942/cache_read2942。首probe误用了X-CCGateway-Policy，因此未开启正式pass_upstream_errors；后续探针已使用正确X-CCGateway-Request-Policy。工具错误本身是正常200内容，不是网关异常。
4. #22PTC：HTTP200/end_turn，code_execution_tool_result_error too_many_requests，无客户端子调用/容器，因此没有伪造续聊或额外重试。usage input174/output301/cache_creation4212/cache_read4212。
5. #22builtin pptx Skills：HTTP200/end_turn，有container，latest真实解析为version20261002；text_editor_code_execution与bash_code_execution均返回too_many_requests。usage input1470/output341/cache_creation1081/cache_read9559。请求max_tokens256而provider用量累计341，报告保留原事实，不推断或篡改账务。未成功创建探针文件，无文件清理项；provider容器按其生命周期到期。

本批共#21一次普通模型、#22三次资源模型探针，没有重试模型请求。CodeExec/PTC/Skills协议保真与错误透传已确认；真实执行成功仍受提供商too_many_requests限制，不能据此标为资格全通过。核心公开路由与持久资源登记仍由主线程另行部署/验证。
