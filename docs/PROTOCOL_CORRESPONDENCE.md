# Protocol 条款—实现—测试—部署对应（应用侧草案）

本文件是应用消费方对照，不是Protocol窗口发布的权威对应表。当前没有正式protocol_version/部署，故不能声称与PACIscan使用的链上Protocol“完全对应”。HTTP0.4只是应用API。

| 应用文字条款 | 实现 | 本轮测试依据 | 链上/生产状态 |
|---|---|---|---|
| 1 四层关系与六式术语 | lib/protocol-text.js、现有PACI核心外部引用 | 真HTTP调用既有core，不复制内核 | 通用链上版本待交付 |
| 2 固定来源/字段确认 | private-task-core/store，D1版本表 | 原引文slice、万元转换、旧值/理由、CAS | 合成；无真实文件/AI |
| 3 规则/证据不膨胀 | assessTask，原Profile差异文档 | 8指标共同根、无个体工资/真实产量推断 | 无正式Profile或基准 |
| 4 事项与挑战 | 本地X1/历史 | explained/remediating不解决、无resolved旁路 | 未调用PACI Challenge链路 |
| 5 私密与版本 | 新任务仅登录所有者、固定卡 | 错actor/历史卡不变、旧Link1回归 | Link2/多买家待实现 |
| 6 签核/执行/更新 | protocol-registry的正式发布关闭 | 任意地址/bool不能启用 | 合约/签核/最终性均未接 |
| 7 六组接口 | paci-http-client/task-registration-store | 实际HTTP登记/恢复8检查点 | 只有登记本地往返，其余待接 |
| 8 发布可核查性 | 版本分离、交接证据清单 | 文本单源生成检查 | 无链上地址，不虚构查询链接 |

网页与Markdown共享lib/protocol-text.js；这保证本应用两份文字一致，不证明通用协议语义/代码/链上部署已一致。收到上游发布后须替换null版本为固定引用、核对条款与代码测试并执行真实验证，再显示链上入口。
