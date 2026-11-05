# HR 智能体资料助手 / PACI scan 接口预留

状态：2026-11-05 产品提议及接口设计预留，非已运行服务，不修改原宪章。

本轮交付只有材料工作台内可展开说明及禁用的“待接入”入口。没有 Agent 批量上传 API、模型调用、调度执行或 PACI scan 真实记账。后端既有请求待办接口不是 Agent 接口。

未来流程：用户选择任务与授权范围 → Agent 整理/去重/上传到私密草稿 → 用户核对来源与提取字段 → 人工确认 → 按原规则固定版本及明确披露。不得自动发布、扩权、确认企业声明或把成功上传标为核验通过。

拟向 PACI scan 对接的操作事件（字段名称待三窗口协议对齐，不是已生效契约）：
- operation_id / idempotency_key：重试去重和运行关联。
- tenant_id / task_id / initiating_user：租户、任务和发起用户；由可信服务端绑定。
- executor_type HUMAN / AI_AGENT，agent_identity、agent_version、run_id：区别实际执行者与授权人，不能相信客户端自报。
- action、source_reference、input_hash、output_hash、occurred_at：操作及资料来源/版本引用；不得把敏感原文直接送上链。
- authorisation_scope / expires_at / revoked_at：可撤销最小权限，只允许草稿阶段操作。
- human_review_status / reviewer / reviewed_at：独立的人审记录，默认待确认。
- recording_status：NOT_CONNECTED / PENDING / RECORDED / FAILED；必须取得实际回执后才显示已记账，上链状态另列。

安全与接入待办：独立 Agent 身份凭据和权限、租户隔离、文件安全与保留规则、限额及取消、失败恢复、真实 PACI scan API/版本契约、回执验证、双账号与越权测试。不得另造 PACI 内核或把产品占位当作协议实现。
