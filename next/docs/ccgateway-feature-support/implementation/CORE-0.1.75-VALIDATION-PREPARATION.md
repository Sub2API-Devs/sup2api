# Core 0.1.75 构建与发布准备

精确候选60969149045452a96e5f0b125c912ddf28f8eeba，目标Core .75 / Plugin .14 / catalog2026-10-09.17，Worker .80由另一代理独立构建；Controller .48保持。当前仅准备，未创建升级计划或修改未来默认镜像。

OVH只读预备：release-0.1.75和stage/0.1.75均未占用，无:0.1.75镜像标签，磁盘879GiB可用。四节点running且实际Core程序hash全44c94eb1aaae1640774995c65094f40ab0476d94d4885f6055b2e34f17b582ec（.74）。updater.nodes记录local/ready=true/stopped=false，但last_seen仍为旧发布时刻，不将其当新鲜心跳；正式预检必须重新核活体节点。匿名公开价格入口401，无推理/身份/quota调用。

服务器Git fetch精确提交后新增clean detached /home/debian/sup2api/release-0.1.75。首次在父目录fetch因非Git目录失败，改用已有.74工作树fetch后成功，没有上传源码或修改旧工作树。

句柄14116：受影响ccgateway插件与contracts全模块Linux race+vet已通过（2CPU/2GiB，SUB2API_TESTPG=off；本批无DB业务变更，没有声称新增DB测试）。日志/home/debian/sub2api-next-test/validation-609691490/affected-tests.log，成功标记affected-tests.exit=0。

随后既有prepare-core-release.sh受限2CPU/4GiB、BUILD_MAX_PROCS=2、default builder/cache、REQUIRE_EXISTING_DEV_KEY=1构建签名中。保留原trust，Plugin .14使用新版本包，不覆盖已发布.13。构建、完整GET校验、备份、预检的最终结果待追加。

## 最终准备结果

句柄14116正常exit0，prepare.exit=0。manifest摘要044759b7ba4f82fe8acf3a30663aa23757fa9912a4a477617558dafa8218ba60，bundle f44c2b64d40ac2452d584b65bb767795f4eff61908f2824129ac4818330138d5（110190862bytes）。Core程序52be405c123fbf8f0ff97d56e9e96cf12554d018231783cd89b8b32e0a79d306；新Plugin.14包a7e0d1f0eea17c32812e03fc9b267e20b8d07d5d75bcae4953b627ccd86ae7cf，linux-amd64程序2f836e52bd5da8c645c1891e834219f87ecda42753a1656f7fe2c0b519d2bede。原Plugin.13没有覆盖。

原trust e51300373d1ce798114d1b39207dcb0e9dd4b7e9dccaa7e1935f55e334847133保持。schema before/after相同e8ec13814e64ced829fe95d94c719afe902eed9d7b50370634d5d129ec321138。独立Ed25519签名、payload摘要、tar每文件mode/size/hash、源码SHA与完整TLS GET均通过，manifest下载3191bytes。证据stage/0.1.75/verification.json。

校验过程两次环境失败保留：宿主不能解析Docker服务名releases；显式读取其容器地址后Python3.13新严格CA规则拒既有CA缺keyUsage。最后使用系统curl --cacert原CA及--resolve正确服务地址验证TLS主机名和证书，完整GET与磁盘一致；没有关闭TLS校验或改证书。

受限备份/home/debian/sup2api-managed/backups/core-0.1.75-20261008T174726Z/database.dump（21544081bytes，0600），pg_restore --list成功；四节点原始inspect保存在同目录nodes-before.json（私有文件，不输出秘密）。

正常签名manifest导入完成；17:49 UTC重新preflight HTTP200、blockers=[]、expected_revision143、节点严格sup2api-1..4。preflight原结果stage/0.1.75/preflight.json（0600）。随后对四节点分别实际执行version均.74，四个独立本机HTTP端口key/prices均401，源码仍clean。此为新鲜活体核验，不使用旧last_seen冒充心跳。

尚未创建升级计划、未切换服务、未保存未来default、未刷新Controller，也没有profile/quota/model调用。等待root放行；正式发布时仍须重新preflight revision，不能复用可能过期的143。
