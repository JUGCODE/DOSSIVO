# DOSSIVO服务端桥接契约 · task-bridge/0.2

浏览器 → `/api/private-tasks` → DOSSIVO D1 → 服务端适配器 → 指定PACI HTTPS服务。浏览器不接触PACI密钥；新任务不使用匿名demo会话作为身份。

- GET无参数列出当前账号任务；`?task=id`读取当前版本/Outbox；`?task=id&card=id`导出当前账号获准的固定合成准备件。
- POST同源、JSON、16KiB限制。`{action,idempotencyKey,data:{task_id,expected_version,payload}}`。创建不需要task_id/version。操作：create/add_material/locate_fields/confirm_field/open_flag/flag_response/assess/freeze_card/sync_registration。
- 当前业务身份为Sites账号；尚无可供用户自定义的tenant或actor。每次读取/重放/导出均再鉴权。同键不同内容409；并发expected_version不符409。幂等响应重读当前获准状态，不缓存旧敏感正文。
- 写头CAS、断言guard、追加版本、操作记录、必要Outbox使用一个D1 batch；失败整体回滚。
- freeze_card不等于正式签核。队列绑定card_id/card_hash和冻结task_version；不回写旧卡。
- sync_registration仅允许当前账号自己的队列。先把不含token的固定信封入库，查询已有操作，再发送相同键；重启/丢回执不新建操作。服务失联保持PENDING；历史receipt保留但当前UNCONFIRMED不保留成功标签。
- 默认`paci-http/0.4`，`PACI_HTTP_VERSION=paci-http/0.3`仅供明确旧服务配置，不能混用同一信封。`/api/business/*`不自动fallback。
- 回执核对protocol、摘要算法、请求摘要、幂等键、operation_id、record_id/version、PRIVATE、SELF_REPORTED、PARTIAL、CONTENT与原正文/summary、未删除。登记成功只能返回REGISTERED；verification仍UNVERIFIED，chain仍NOT_CONNECTED。
- 0.4没有Standalone专用ACK端点。本分支登记回执持久保存即本地收件，不能虚构向PACI发送了ACK。另一分支需单独实现GET receipt → 本地保存 → ACK及契约测试。

配置：`PACI_REGISTRATION_PILOT=enabled`、`PACI_SERVICE_ORIGIN=https://...`（纯origin，不含用户信息/路径/查询）、`PACI_TENANT_BINDINGS`（服务端按Sites actor映射tenant_id/service_actor_id/token）、可选PACI_HTTP_VERSION。凭据不提交，不写前端或共享交接包。

尚无后台定时dispatcher；由用户点击同步/恢复，依然使用持久队列。网络错误、5xx可同键重试；4xx保持可见等待配置/权限或人工处理。生产需补租户身份回执、密钥轮换、退避调度、独立限流与六组能力接入。

材料覆盖和基本参数授权码走DOSSIVO业务API，不改变PACI登记协议。新增卡coverage字段作为固定正文一起进入原有摘要/回执验证；真实本地HTTP8检查点已重跑。
