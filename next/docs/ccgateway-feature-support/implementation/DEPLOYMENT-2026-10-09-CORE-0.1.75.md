# Core .75 / Worker .80 发布

精确60969149045452a96e5f0b125c912ddf28f8eeba；准备、签名、备份详见 CORE-0.1.75-VALIDATION-PREPARATION.md。Worker .80双账号原地更新及root独立hash核验通过后，root明确放行本平台四节点正常发布。

新鲜preflight200、blockers=[]；正常计划a49d0b64309c5c48baf3a9a52d7aa792创建202，目标manifest044759b7ba4f82fe8acf3a30663aa23757fa9912a4a477617558dafa8218ba60。句柄81975，日志/home/debian/sup2api-managed/upgrade-20261008T175450.log，61.80s完成completed|27，observer65.89s完成。

采样401共1054次，维护503共1454次；首50322.18s、末50359.69s，约37.51s观测窗口。无零中断承诺，不将采样当所有用户实际错误统计。

四节点实际版本均.75，Core hash52be405c123fbf8f0ff97d56e9e96cf12554d018231783cd89b8b32e0a79d306，updater全部local/ready=true/stopped=false、release相同。CCGateway enabled、active=desired=0.1.14，四节点实际/proc插件hash全2f836e52bd5da8c645c1891e834219f87ecda42753a1656f7fe2c0b519d2bede，与新签名包一致。旧.13不可变包未覆盖。

备份/home/debian/sup2api-managed/backups/core-0.1.75-20261008T174726Z保留，旧.74制品保留；schema不变。若故障按既有updater回滚，不删除账号容器/授权。本次未触发回滚。

未来default更新前cc-max私有快照/opt/ccgateway-runtime/default-0.1.80-before.json已保存0600。新image ccgateway-worker:0.1.80 IDsha256:aa1cc92e1dcb8accb5abc99b43b43cee010d6ae762f6e713951a6ffe66c56f6a。完整public配置读改仅images.app→.80，Controller要求保持.48；后续刷新和原容器核验完成后追加结果。

默认镜像闭环已完成：仅app配置PUT200、runtime/install200，完整public其它字段与全部secret flags相等，effective Controller仍ccg-controller:0.1.48。安全事实/home/debian/sup2api-managed/default-worker-0.1.80-verification.json；cc-max after私有快照同前缀-after.json。21/22 Id/Image/Mounts/完整Config/Path/Args逐字段完全一致，均running；双方程序hash e2ab0ee3884ccbf725064f93e23dd48b6f55cdd5967dc8154627a825ea187f79。没有重建旧容器、换imageRef.56或授权。整个过程没有profile/quota/model调用。全部稳定后交root独占公网验收。
