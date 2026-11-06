# PACI 兼容矩阵 · 本轮实际状态

| 组件 | 精确版本/来源 | 与DOSSIVO关系 | 本轮验证 |
|---|---|---|---|
| DOSSIVO | 基线c5831b667a1da88a4024063d26e4639f23b4f5e1；业务模块0.2.0 | 原工程增量，不新建Site | 单元/SQLite与类型/构建，见报告 |
| 通用PACI Protocol | 未取得正式规范及部署版本 | 不以HTTP版本代替 | BLOCKED：无合约/部署清单 |
| PACI-FLR | 原规则v0.1 + 待采纳差异 | 本轮仅准备性公式；无正式profile_version | 没有虚设v0.2已发布 |
| PACI-DOSSIVO-FL | 用户指定呈现标题 | 与PACI-FLR映射待冻结 | 未部署、未确认canonical名称 |
| Task schema/API | dossivo-private-task/0.2 / dossivo-task-api/0.2 | 业务私密任务 | CAS/回放/版本隔离实测 |
| 现有PACIs​​can core | 0.4.2-alpha.1；源码提交ecebe6755a80118df8aee9393a7fdf1c32b79c5b | 独立应用的已有核心，不复制入DOSSIVO | 实际loopback HTTP登记/恢复，双SQLite重启 |
| core HTTP | paci-http/0.4；digest sha256/paci-canonical-json-1 | 新默认，显式服务端选择 | 真实服务及适配器往返；不声称公开签名回执 |
| 旧DOSSIVO HTTP | paci-http/0.3 | 显式PACI_HTTP_VERSION可选择旧协议；已有信封不静默升级 | 保留旧信封恢复形状；真实0.4端拒绝0.3，无降级fallback |
| Standalone Alpha | 1.2.0；归档b058fd2855700e57d1c52c28d67e8dbe4280362f4669e144002305d41c692f7e | `/api/business/*`与`/v1`不是相同接口 | SDK/路由静态核查；本轮不跑118项，不部署该分支 |
| benchmark/model | null / null | 无独立基准，无外部模型 | 不制造模型执行记录/准确率 |

## 核心文件固定摘要

- `src/engine.ts`: `36f8b78649c2e3aa2ca6f37d7154649fd44fd1c2276edf9128b3dfc329307a8c`
- `src/server.ts`: `8593d3781bfabbcca440a41bb4eea450a6a01e6543ca6b608825c5341139c94f`
- `contract/PACI_HTTP_0.4.md`: `d78cab6d76db5c21696c2bb794efd838a959f81999d6f9081f48c6c18932bff8`

## 六组业务适配状态

登记已真实本地往返；更正、AI/Jurisdiction Ledger、检查/声明评估、授权历史、外部挑战回应、PACI证明导出仍需业务接入及生产授权验收。现有core提供端点不等于DOSSIVO已全部调用。新任务更正和导出当前属于DOSSIVO业务层。

## 回执信任边界

0.4登记回执通过TLS/Bearer已选服务通道认证，并核对稳定操作键、请求摘要、结果记录/版本/正文/摘要。0.4结果没有独立的签名租户/执行者声明，无法仅凭回执发现“初始服务token误配至另一租户”。服务端租户绑定需运维核验；正式接入要求上游提供可核验身份/tenant绑定的回执或身份端点。当前不向第三方声称该回执是公开可归责签名，也不凭它放行正式卡。

## 本轮首页UI调整

只改变展示及渐进展开；Protocol/Profile/schema/API/登记回执与PACI兼容版本均未变化。新首页不增加链上或真实材料能力声明。

侧栏优势入口调整仅涉及展示，不改变Protocol、Profile、API或回执契约。

眉标文案调整：中文采用用户最新确认的“让 DOSSIVO 的 AI 工具协助你，把材料变成有据可查的回应”，英文和意大利文同步明确 DOSSIVO 的 AI 工具。仅文案，无接口或协议能力变化；构建校验随本次发布执行。

## 基本参数授权与覆盖扩展

新增dossivo-material-coverage/0.1和dossivo-basic-evidence/0.1；旧task/card0.2增加可选覆盖/分类字段，历史卡不重写。PACI core/HTTP/Protocol/Profile版本无变更；原真实本地HTTP8检查点随新卡覆盖字段重跑通过。授权码是DOSSIVO业务披露，不冒称PACI链上授权/验证。


## Protocol 导航兼容性 · 2026-11-05

新增返回/关闭控件，仅修改阅读界面；Protocol 正文、条款映射、PACI core/HTTP/Profile、登记回执与链上状态均沿用原状态，无契约或数据迁移。


## 复用测量兼容性 · 2026-11-05

新增DOSSIVO业务层dossivo-evidence-reuse/0.1，只读聚合现有授权和访问表，无新迁移。dossivo-basic-evidence/0.1新投影增加可选source_card_id，旧固定投影/下载仍可读且不重写。不同授权仍各自固定披露范围，不因卡ID相同扩大权限。不修改PACI core、HTTP、Protocol/Profile、登记回执或领域规则；合成使用计数与卡ID不代表PACI链上登记、执行或独立核验。


## 最新优先交付：两组界定第1批（2026-11-05）

先读 CONTINUOUS_ACCESS_BATCH_1.md。用户已授权分批实现披露授权与合规对话；本批完成持续固定摘要授权基础，其他功能按该文档清单接续。追加迁移0007_aberrant_freak，旧授权保持TEMPORARY，不自动延长。新CONTINUOUS_SUMMARY：兑换窗口48/72小时，成功绑定后持续至撤销；禁止精确数值，版本仅FIXED，用途COMPLIANCE_REVIEW。新API expires_at=null表示无固定访问到期日，redemption_expires_at单独表示兑换截止。任务变化提示复核，不自动披露未发布新材料。

本轮重新运行114项测试全通过（新增6项），TypeScript通过，日志evidence/continuous-access-tests.log。持续授权不等于完整三级披露：公开概览、专项原件、后续摘要发布订阅、企业成员和合规对话均尚待实现；真实数据和正式PACI链路径仍阻断。生产多账号浏览器验收尚未完成。以上最新说明优先于本文件之前旧版48/72小时整体到期描述。

本批Worker构建通过；托管预览健康检查超时，status显示stopped，未做浏览器交互验收。部署结果以Sites保存版本/部署返回为准。


## 最新优先交付：两组界定第2批（2026-11-05）

先读PUBLISHED_SUMMARY_BATCH_2.md。新增FOLLOW_PUBLISHED，必须在创建持续授权时明确选择，旧授权默认FIXED。所有者预览后按单一已绑定授权发布同任务/主体/场所/期间的新摘要；冻结历史和事项轨迹保留，原类别/用途不扩大，精确数值仍禁止。GET sequence支持获准历史查看与下载；每次含历史请求均重验，撤销不删除既有交付事实。

迁移0008_omniscient_the_call及新表dossivo_summary_publications；访问事件card_id用于统计真正被读取的版本。预览hash/expected_sequence、D1事务、CAS和幂等约束已覆盖。122项测试全通过，TypeScript复检通过；日志evidence/published-summary-tests.log。浏览器交互与生产双账号仍未验收。PACI路径/正式链上卡/真实材料门槛不变；哈希链不冒称链上执行。合规对话与组织成员尚未实现，是下一批优先工作。

第2批Worker完整构建通过；生产发布状态以本批Sites保存版本及部署结果为准。


第3批进行中：新增会话成员/发送权限及带推荐人来源的联系人白名单投影策略。服务端数据库、API、UI尚未接入，不属于已上线聊天能力。新增3项隔离策略测试，本轮125项测试通过；日志evidence/collaboration-policy-tests.log。Protocol/PACI兼容不变，线上仍为第28版。详见HANDOFF_DOSSIVO.md最新条目。


## 第3批实际接通：双边文字请求与回复（2026-11-05）

迁移0009_sturdy_black_panther增加conversations/messages。ConversationStore仅从可信的已兑换grant读取owner/buyer双方，不接受客户端成员列表；每条会话绑定一个grant，不自动合并其他买方或企业。POST /api/conversations使用正常登录与readDemoCommand防护，显式synthetic_only，2000字符上限，幂等键、原子写入、关联回复仅限同会话。GET返回消息侧别，不输出原始账号ID、其他关系或证据正文。

入口位于所有者已兑换授权条目和买方已打开卡片内。请求、普通消息、回复、确认收到分别显示；均不改变flag、不授予证据权限。材料撤权不删除聊天历史；材料读取仍由BuyerAccessStore鉴权。当前买方在授权撤销后尚无独立会话列表入口，后续必须补齐，不能声称完整消息中心已交付。

本批只有原授权双方账号，尚非企业多成员体系。之前collaboration-permissions策略尚未作为可配置成员管理接入；目前无成员增删UI/API，无卡片引用、未读通知、发送邮件、自动翻译、联系人推荐或真实资料放行。推荐人可见的联系人分享仍在交接待办，不忘记也不伪称已实现。普通文字也只限合成测试，未建立正式保留/删除政策前不开放真实业务聊天。

本轮127项测试通过（新增2项服务层集成测试，涵盖隔离、幂等、关联回复、真实数据阻断、撤权后证据仍拒绝、失败回滚、关闭状态拒绝发送）；TypeScript通过。测试日志evidence/conversation-tests.log。此前托管预览超时，本批浏览器与生产双账号验收仍未完成。原协议/正式链上卡及真实材料门槛保持不变。


## 最新续接：第4批独立会话、未读与卡片引用（2026-11-05）

先读CONVERSATION_INBOX_BATCH_4.md。/conversations提供正常登录后的独立列表，授权到期/撤销后仍能找回已开始的会话。站内未读按sequence和本人read cursor持久计算，显式标至已加载消息，新消息不被并发标读吞掉。线程最新100条并可加载更早内容；迁移0010_right_puck对已有消息回填顺序。

同授权已发布固定卡可作为消息引用，发送只保存版本身份，不复制正文，不计买方已查看；打开/下载重验授权，所有者也只看获准投影。引用发送与序号分配在同一事务，撤权竞争回滚。旧引用不跟新版本变化。API与细节见第4批文档。137项测试/TypeScript通过，日志evidence/conversation-inbox-tests.log；生产双账号浏览器仍未验收。主体/成员、请求完成状态、联系人推荐、外部通知与真实数据仍按各自待办，不把已实现的双账号对话称完整企业通讯系统。

第4批Worker完整构建通过；部署记录以Sites保存版本和部署返回为准。

第4批实际发布：Site第30版，runtime commit 514c69ef57025799da5fb83cefd5271479da559a；部署appgdep_6aec8d67af24819199f666dad35a829b成功。生产浏览器已从侧栏点击/conversations并确认匿名登录保护；未开始认证，登录后双账号收发/未读/撤权UI仍待验收。RELEASE_EVIDENCE.json的latest_release为当前结果，其他顶层旧记录仅为历史。


## 界面修订：直接通信与添加联系人方向（2026-11-05）

用户反馈截图：买卖双方共用的/conversations不应显示居中的“欧盟用户入口”。已移除该导航，将主标题/页面标题/内嵌入口/侧栏统一为“直接通信”（EN Direct messaging / IT Messaggi diretti）；欧盟入口自身保留，并将指向共享页的链接改名。

添加联系人方向：由邮件、微信等外部渠道交换DOSSIVO ID → 输入ID发送联系申请 → 对方接受后通信；外部渠道用于传递ID，私人邮箱/手机号不默认作为公开可搜索ID。接收联系不授予材料权限。联系请求、拒绝/屏蔽、推荐人可见的联系人推荐仍待接入；当前没有ID搜索或添加联系人API，本次未制作误导性的可用搜索框。页面折叠帮助和空状态明确现有能力与后续方向，当前仍从既有已兑换材料授权关系发起通信。

本次仅文案/导航与折叠帮助，无数据库/API/授权规则变化。本次TypeScript noEmit和Worker完整构建通过，git diff --check通过；文案修改未新增或重跑服务层测试，不把第4批137项测试当作本轮新运行结果。Protocol/PACI兼容、真实数据门槛保持原状态。

本次已发布Site第31版，runtime commit cdd4d44f3ef80baf0aa0dcbaacdaaa82c0ef4034，部署appgdep_6aec99e54f1c819190eb15a7ab850493成功。生产浏览器核对“直接通信”标题、移除共享页欧盟入口、展开添加联系人说明均通过；ID/申请接口仍未实现。


## 最新优先状态：第5批联系链接及后台（2026-11-05）

先读CONTACT_LINKS_BACKEND_BATCH_5.md。本批已接通ContactStore+D1+API+页面：随机稳定DS-ID、主动开放显示名称、精确查询、复制联系链接/本地二维码、/connect/ID登录安全回跳、申请/接受/拒绝、独立联系人通信与双方屏蔽。服务端推荐token可显示真实推荐人，不采信自报名字；生成/使用推荐均重验屏蔽和公开设置。

迁移0011_famous_ego保留老会话并追加contact_id，与grant_id恰好一项非空。接受联系人不会写basic_grants，dm_会话不能取得证据；通信屏蔽原子阻断同一双方的联系人/旧授权会话发信，但材料授权单独管理。仅限原登录双方，不等于组织代表资格或多成员企业权限。

本批154项测试全部通过（新contact测试16项及跨旧会话屏蔽1项），TypeScript通过；日志evidence/contact-links-tests.log。生产双账号、扫码、实际登录回跳仍待浏览器验收。侧栏直接通信图标已改UsersRound，欧盟入口保持单人图标。以上替代之前“ID/申请/推荐尚未接入”状态；其他真实数据/PACI门槛不变。

第5批Worker完整构建通过，二维码本地生成PNG检查通过。生产发布结果以Sites保存版本与部署记录为准。

第5批实际发布：Site第32版，runtime commit 21c31efe33fd806892b110386976dfeac0f85932，部署appgdep_6aeca20eaae48191a05623ced79a3c22成功。线上浏览器已验证直接通信登录保护、未知ID落地页、侧栏lucide-users-round双人图标。当前浏览器未登录，双账号申请/接受/屏蔽/收发、实际登录回跳和扫码未实测；服务层154项测试不能代替这些浏览器验收。RELEASE_EVIDENCE.json latest_release为最新记录，后续文档回执提交不改变运行代码。


## 本轮增量：通信服务地区0.1（2026-11-05）

| 组件 | 版本/变更 | 兼容结论 |
|---|---|---|
| Communication policy | intl-beta/0.1；迁移0012 | 新增本人地区声明，未知默认关闭；不是核验地理位置或PACI配置 |
| Contacts / Conversations | 前置资格检查+事务重验 | 新旧grant/contact通信均受双方当前资格限制；保留历史、标读和屏蔽 |
| BuyerAccessStore / 固定摘要 | 未改协议或历史授权 | 不因通信暂缓删除/扩张材料权限；169项全回归包含独立性验证 |
| PACI / PACI-DOSSIVO-FL | 本轮未改核心、映射、链上状态 | 未新增链上声明或登记结果；原BLOCKED项不变 |
| Tencent / Ali SDK | 未接入/未采购 | 不将附件费用和手续估算当正式政策；中国大陆暂未开放 |


## 最新增量：开发期间地区限制关闭（2026-11-05）

| 项目 | 当前配置/行为 | 兼容结论 |
|---|---|---|
| 地区限制 | COMMUNICATION_REGION_ENFORCEMENT=false；DEVELOPMENT_OPEN | 后端、原子SQL和UI同一默认值；CN/UNKNOWN可测试，不改成国际声明 |
| 将来的地区规则 | 显式regionEnforcement=true仅作服务层测试；正式发布再启用 | 沿用原严格模式约束；不使用语言作为地区依据 |
| 数据库/材料权限 | 无迁移，原声明和材料授权保留 | 地区开关不扩张证据权限、不删除历史 |
| PACI/Protocol | 无改动 | 原核心、映射及链上状态保持既有边界 |


## 本轮：侧栏导航调整（2026-11-05）

仅移除重复Sidebar欧盟入口、增加指向既有价格区的显著链接及折叠展开定位。Protocol、PACI、材料/通信权限、API与数据库无变更。历史原型价码仍非正式政策，本轮未改变收费状态。


## 本轮：Protocol入口移入侧栏（2026-11-05）

仅移除顶部Protocol导航，在Sidebar直接通信下新增同址入口；协议正文、返回/关闭、链上证据状态及PACI兼容关系未变。登录/注册合并与外观移位不改变认证或数据权限。


## 登录后默认展开对话窗口（2026-11-05）

本轮实现：已登录 /conversations 进入后自动选择服务端按时间排序的最近会话，展开并主动加载消息；刷新保留手动选择。通信区在联系人管理前；无会话显示窗口空态和展开的联系人入口。联系人“打开通信”复用主窗口，避免重复线程。未登录仍正常登录回跳；不自动发送、不自动标记已读、不改变材料授权或开发期间地区开放规则。

验证：本轮 TypeScript、git diff --check、Worker 构建成功；重新运行全部现有测试 175 PASS / 0 FAIL，日志 docs/evidence/conversation-auto-open-tests.log。当前未做真实已登录双账号浏览器验收，自动展开交互尚需该验收；测试通过不等于浏览器交互实测。

后续：固定字段证据请求、一键回应及授权卡闭环仍待实现。现有自由 body REQUEST 不计作结构化功能，邮件通知仍未接通。PACI 内核/接口、D1 schema、价格及授权协议无变化；原宪章未改。

发布回执：Site v37，runtime commit 013fc2c3d68eb1e4162b6de25454adfa60a00a14，部署 appgdep_6aece55f4c9081919b9096a8767883ed 已成功。


## 固定字段证据请求：首批全栈实现（2026-11-05）

已实现：对话内选择用电凭证/社保缴纳凭证/人员汇总/审核报告/证据卡片摘要及月份，后端白名单验证并生成固定文字；结构字段独立持久化。对方一键回应 PREPARING / UNAVAILABLE / CARD_SHARED，并关联原请求；不能回应自己的请求或普通消息冒充结构化请求。重复发送幂等，改变内容复用键返回冲突。

卡片回应要求已有有效授权、明确选择固定版本，发送事务再次核对撤销/到期/屏蔽。仅联系人会话不能附卡；需在材料工作台单独授权并进入对应授权会话。读取/下载沿用权限复核、固定版本及访问事件。请求/回应不等于验证通过、材料真实性确认或整改关闭，不自动创建授权、标读或邮件。

兼容：新增可空 structured_json 列，0013_conscious_trish_tilby.sql 由 drizzle-kit 生成；旧消息为 null，普通文字功能保留。PACI 内核/协议接口/证据等级/价格无改动，开发期间地区默认开放，仍仅合成测试。

本轮验证：182 PASS / 0 FAIL（新增 7 项），TypeScript、git diff --check、Worker 构建通过。日志 docs/evidence/structured-evidence-tests.log。尚未完成真实登录双账号浏览器端验收；不把服务层测试当作该验收。

后续边界：本批是现有授权会话内的请求/回应/固定卡引用闭环。跨联系人直接选择并新建材料授权、请求状态汇总、邮件通知、真实资料开放均未实现；不得宣称已经完成。原宪章未修订。

发布回执：Site v38，runtime commit 08d0c361686ea732ffdbf27fa574d798720915fd，部署 appgdep_6aece7fb289c8191859fe29e2ab10670 成功。线上匿名浏览器已验证 /conversations 正常显示登录保护与开发开放提示；双账号登录交互未验收。


## 证据请求跟进列表（2026-11-05）

已实现：会话内可展开独立请求列表，显示项目、月份、发起方向、时间及最新结构化回应（待回应/正在准备/暂无法提供/已回应授权卡片）。从全会话按 sequence 查询，每页50条，与聊天最近100条分页独立；回复相同时间按 sequence 排序。对方请求可直接回应准备中/暂无法提供；卡片沿现有授权和固定版本读取。手动刷新状态，不自动标读或发邮件。

权限与兼容：参与者限定，不返回账号标识或证据正文；撤权保留历史状态但禁止读取卡片。CARD_SHARED 仅表示历史发送事件，不表示授权当前有效/已查看/验证通过/整改完成。普通文字回复不改变结构化状态。无需数据库迁移，兼容现有消息与PACI接口。

验证：本轮185项测试通过（新增3项：状态与顺序、隔离及撤权、跨消息分页）；日志 docs/evidence/request-tracker-tests.log。TypeScript/Worker构建结果见发布回执；双账号登录浏览器验收仍未完成。状态列表按需展开；跨联系人新建授权和邮件通知仍未实现。

发布回执：Site v39，runtime c9651bf43b8ee118cc7bc44ec96cc31d7e7df278，部署 appgdep_6aecea5fc9088191914ea520733205f3 成功。TypeScript、git diff --check及Worker构建通过；本轮无已登录浏览器交互验证。


## 联系人对话关联已有材料授权（2026-11-05）

新增只读接口 related_grants 与对话内“双方已有的材料授权”入口：按双方账号精确匹配已兑换授权，每页50条，只返回原授权摘要的企业/设施/月份及当前授权状态。排除未兑换授权和其他买家，验证摘要hash；不返回原始资料、账号ID或兑换码。

可以进入对应授权会话并返回原联系人对话。没有已兑换授权时引导到现有材料工作台及授权码兑换页。此操作不生成/扩大授权，不创建消息、不标已读、不产生卡片访问事件。撤权后历史入口保留，卡片读取继续重新鉴权。此批不是“聊天内一键新建授权”，尚未实现该能力及跨会话关联原请求。

兼容：无数据库迁移，PACI协议、授权类型和开发地区开放规则不变。验证：188 PASS / 0 FAIL，本轮新增3项；日志 docs/evidence/related-grants-tests.log。分页测试使用推进测试时钟避开真实的兑换限流，没有放宽产品限流。双账号登录浏览器交互尚未验收。

发布回执：Site v40，runtime d8d9b700875d6cdb083f9a627f052e080138b899，部署 appgdep_6aeceb9535988191acd13e7b917d5022 成功。TypeScript、git diff --check及Worker构建通过。


## 工作台请求待办及 HR 智能体入口（2026-11-05）

已实现：收到的结构化证据请求自动投影至材料工作台待办，分页50条。授权会话自动关联供应方原任务；联系人请求由接收人显式关联自己的同月份任务，持久保存关联时间，重复绑定同一任务幂等，改绑拒绝。可打开任务或原请求会话回应；最新结构化回应同步显示，不自动认定完成/核验通过。内部关联不对请求人暴露任务、不授予证据权限，不创建重复任务。

新增schema-only迁移0014_gigantic_thor_girl.sql（drizzle-kit生成）。四项新增测试覆盖自动关联、私密绑定和权限、月份/改绑、分页；本轮192 PASS / 0 FAIL，见docs/evidence/workbench-requests-tests.log。双账号登录浏览器验收仍未完成。

HR智能体：已增加材料工作台内可展开“筹备中”提示和禁用待接入按钮，正确名称 PACI scan。设计预留见 HR_AGENT_INTERFACE_PLAN.md；没有实现AI自动上传、真实Agent API或PACI scan记账，不将预留当作可用功能，不修改原宪章。

仍待：联系人请求与新授权卡片的跨会话自动关联、买家供应商总看板、尽调报告导出、真实资料/AI运行及邮件通知。

发布回执：Site v41，runtime 880f960a41b7148a223a1b82d7cb088a2783233a，部署 appgdep_6aecf1bede2081918114b04186077e80 成功。TypeScript、git diff --check及Worker构建通过。


## 工作台请求状态筛选（2026-11-05）
已实现后台全量请求按最新结构化回应筛选，分页前过滤；切换条件重置分页。状态：全部/待回应/准备中/暂无法提供/已回应卡片。无数据库迁移或授权变更。193项测试通过，新增1项；TypeScript、构建和diff检查通过。登录浏览器验收未完成。日志 evidence/workbench-filter-tests.log。


## 工作台请求全量统计（2026-11-06）
后台按最新回应汇总全部收到的请求，独立于筛选与分页，仅限当前账号。UI展示全部/待回应/准备中/暂无法提供/已回应卡片数量，刷新更新，不宣称实时推送或合规通过。无迁移、无权限变更。194项测试通过（新增1项），TypeScript、构建及diff检查通过。登录交互未实测。日志 evidence/workbench-count-tests.log。


## 2026-11-06 · 证据类型组合筛选
本轮只扩展请求队列查询和界面；无数据库迁移、PACI 内核变更、链上写入或新增材料授权。保持现有接口默认 ALL 的兼容性。


## 2026-11-06 · 材料月份筛选
请求队列新增 period（默认 ALL），月份格式限 2000–2099 年有效月份；与类型和状态组合，在数据库分页前筛选。界面可清除月份，切换回到第一页；统计仍为全部请求。无迁移、授权或 PACI 内核变化。196 项实际测试通过，TypeScript 和 diff 检查通过；日志 docs/evidence/workbench-month-tests.log。双账号浏览器验收未完成；GitHub 暂不同步。


## 2026-11-06 · 请求关联同月份任务
私密任务列表新增完整性校验后的 period；请求关联下拉只显示已加载的同月份任务，确认按钮同步校验选择。后台原归属、月份和不可改绑约束保留。最近 50 个任务限制已明示；无迁移、材料授权或 PACI 内核变更。实际 197 项测试全部通过，类型检查及 diff 检查通过；日志 docs/evidence/task-match-tests.log。双账号浏览器验收未完成，GitHub 暂不同步。


## 2026-11-06 · 同月份任务分页查找
关联任务新增按需后台查找、刷新与加载更多；按月份先筛选再分页，不再受全局最近 50 个任务限制。每页 50 个，按 ID 游标；仅当前用户且校验任务摘要。无迁移或授权/PACI 内核变化。198 项测试通过，TypeScript 通过；日志 matching-task-pagination-tests.log。双账号浏览器未验收；GitHub 暂不同步。


## 2026-11-06 · 请求到任务准备及原会话返回
请求待办新增准备新任务入口，带入主题与月份，用户确认企业/场所后沿原后台保存；保留请求上下文和返回原会话入口。保存不自动关联或披露，用户返回待办明确关联。未增加迁移或 PACI 内核。198 项现有测试重新运行通过，类型检查和 diff 检查通过；新界面尚未完成双账号验收。GitHub 暂不同步。


## 2026-11-06 · 通信协作边界集中回归
新增三项跨功能服务测试：撤销后请求历史/响应保留而卡片访问与再次发送拒绝；联系人屏蔽不能通过已有授权会话绕过；内部任务关联不新增授权、访问记录或对方任务读取权限。201 项实际测试全部通过。未修改运行代码，线上保持 v48；双账号真实登录浏览器验收仍未完成。GitHub 不同步。


## 2026-11-06 · 待办选择生命周期修复
刷新/筛选/分页立即清除旧任务选择，避免下拉卸载但确认按钮仍启用。重新查找立即清空选择和结果；卸载取消未完成请求，忽略已取消结果。无后台权限或 PACI 修改。201 项现有测试重新通过，类型检查和 diff 检查通过；日志 selection-reset-tests.log。该 UI 修复未完成已登录浏览器验证，安全登录与接管工具不可用的阻塞仍存在。GitHub 暂不同步。


## 2026-11-06 · 通信界面可靠性
会话组件按 grantId 隔离状态，切换会话清除未发送草稿/回复对象，旧异步结果不会写入新会话。发送中禁用文字编辑以防成功响应清除新输入；无已加载会话时禁用发送。快捷请求依据后台 buyer 标识显示。失败保留文字，同 payload 重试沿用幂等标识；切换会话不保留草稿，此边界需用户注意。201 项现有测试重新通过，类型检查/diff 通过，日志 conversation-reliability-tests.log。无后台权限或 PACI 改动，登录 UI 实测仍阻塞；GitHub 暂不同步。


## 2026-11-06 · 通信操作互斥与草稿提示
会话内发送、快捷回应、刷新及已读操作增加同步 ref 锁，避免按钮状态渲染前的重复操作；完成或失败释放锁。操作中禁止改变合成确认和卡片附加选择，草稿离开清除提示加入输入区。后端幂等机制保持。201 项现有测试重新通过，TypeScript/diff 通过；日志 send-lock-tests.log。没有新增浏览器测试结果，双账号及连点实测仍阻塞。GitHub 不同步。


## 2026-11-06 · 完整联系人协作流程回归
新增请求→新建任务→月份查找→明确关联→回应→幂等重试→已读的服务流程测试，验证未向买方披露私密任务。202 项实际测试通过；日志 complete-contact-flow-tests.log。首次失败为测试夹具缺少联系人资料，补齐后通过。运行代码未改，线上 v51。双账号步骤见 COMMUNICATION_BROWSER_ACCEPTANCE.md，全部待验收。GitHub 不同步。


## 2026-11-06 · Enterprise storage preference

Implemented account-scoped, trilingual deployment-interest card in the private material workbench, with persistent save/read/withdraw and optimistic concurrency. Additive migration 0015; no change to existing grants, disclosure, evidence grading or PACI interfaces. Local originals with authorised summary sharing is the planned priority; full private deployment is a separate preference. Neither enables a connector, original upload, local AI or PACI scan recording. Architecture and future activation gates: ENTERPRISE_STORAGE_DESIGN.md.

Validation: 205 PASS / 0 FAIL, including 3 new persistence/isolation/concurrency/input tests; TypeScript and diff checks passed. Exact log: evidence/storage-preferences-tests.log. Browser QA unverified because managed preview could not start (existing vinext server); no authenticated browser acceptance claimed. Build/deployment receipt follows in RELEASE_EVIDENCE.json.

Release receipt: Site v52 deployed successfully; runtime 75e98c3e1e7c32439f949398bf3a974a9c5662b5; deployment appgdep_6aedfb5a75c8819186aefb9cdf39ff3f. Worker build passed. Latest details: RELEASE_EVIDENCE.json. GitHub remains at prior v51 synchronization unless separately updated.


## 2026-11-06 · Storage preference retry recovery

Exact immediately preceding transitions can be retried after a lost response without creating another preference version. Old retries cannot overwrite withdrawal or later changes, including a later matching preference. This is transition-based recovery, not an indefinite idempotency-key ledger. UI retains selection on network/server uncertainty; version conflicts require explicit reload. Added language-correct sign-in return link and last-saved timestamp. Timestamp describes preference saving, never evidence freshness.

Validation: 207 PASS / 0 FAIL, two new retry/withdrawal regressions; TypeScript and diff checks passed. Log: evidence/storage-preference-retry-tests.log. No migration or PACI/permission change. Browser authenticated acceptance remains pending; previous managed-preview blocker remains unresolved. Publication receipt: RELEASE_EVIDENCE.json.

Published Site v53 successfully: runtime 2b30b9464a3001d449e65b97d3f644e920e64866; deployment appgdep_6aee0440aae081918215de3ecd830f80. Worker build passed. GitHub remains at the separately synchronized v51.


## 2026-11-06 · Buyer access overview

EU buyer portal now displays all redeemed grant records with ACTIVE / EXPIRED / REVOKED filters, full-account totals and 50-row ID-cursor pagination. Counts are grants, not verified companies, suppliers or compliance scores. Revocation takes precedence over expiry; continuous-summary redemption deadlines do not become access expiry. Unredeemed and other-account grants are excluded. Inactive rows expose only minimal grant metadata, never organization or evidence contents. Overview browsing creates no VIEWED/DOWNLOADED evidence event. Existing evidence read/download authorization remains authoritative.

API: GET /api/basic-access?overview=1&status=ACTIVE&before=...; legacy buyerList is retained for compatibility. UI clears selected evidence when filtering/refreshing and aborts superseded list requests. Status is measured on refresh, not realtime push. No new migration, no PACI core or sharing-policy changes.

Validation: 210 PASS / 0 FAIL; three new tests cover time boundary/continuous/revocation/redaction, 55-record pagination and ownership, invalid input. Initial test fixture improperly requested precise values in a continuous summary and was corrected without weakening disclosure rules. TypeScript/diff checks passed; log evidence/buyer-overview-tests.log. Authenticated browser acceptance remains unverified; build/deployment receipt follows in RELEASE_EVIDENCE.json.

Still pending: verified supplier grouping, notifications, cross-conversation request/card association and due-diligence report exports. This overview does not claim to implement those features.

Published Site v54 successfully: runtime 26d57f6bc54887f03464288a4fe8290d419e2c19; deployment appgdep_6aee060ffb248191a7dda29bdf0c662e. Worker build passed. No GitHub synchronization in this round.


## 2026-11-06 · Account entry and unverified contact forms

Added /account?lang=zh|en|it with current ChatGPT sign-in plus visibly pending email/phone registration choices. Main header sign-in/register now opens it, including mobile. Optional company-preferred email and international +country-code phone fields persist after hosted sign-in in an account-isolated table (migration 0016). Fields support update/clear, version conflicts and exact-transition response-loss recovery. Domain case normalized, international phone format checked; this is not verification of ownership, existence, mobile capability, delivery or company authority. No country/Chinese language blocking. Contact fields cannot change authenticated identity or existing public contact ID. No OTP, email/SMS sending, password system or independent account creation is implemented. No shared search or buyer disclosure. Privacy notice updated; clear removes current values, not a guarantee of immediate backup erasure.

Validation: 214 PASS / 0 FAIL (4 new format/isolation/retry/clear tests), TypeScript and diff checks passed. Test data uses reserved example.com and synthetic numbers. Log: evidence/account-contacts-tests.log. Authenticated browser acceptance remains pending. Build/publication receipt follows in RELEASE_EVIDENCE.json.

Remaining prerequisite for genuine email/SMS sign-in: confirm hosted identity-provider capability, select and configure provider, verified callback/session integration, OTP hashing/expiry/single-use, resend and attempt limits, enumeration resistance, account linking/recovery, supported delivery countries and production privacy terms. Do not represent current contact forms as working email/SMS registration. No PACI interface change.

Published Site v55 successfully: runtime daaed275eed4178dee0318ac56faaea8c77fb79c; deployment appgdep_6aee0d99b83081919a3fa30da9d806ea. Worker build passed. GitHub not synchronized this round.


## 2026-11-06 · Account contact confirmation and recovery UX

Server now requires the current explicit storage-confirmation version for any nonempty contact save. Additive nullable migration 0017 stores confirmation version/time with the contact row. Legacy rows retain null confirmation; no retrospective assertion. Clearing requires no new consent and clears the current confirmation fields. Exact-transition recovery preserves the original confirmation timestamp. Confirmation never verifies mailbox, phone or company authority. Privacy notice now describes these metadata.

UI distinguishes invalid email/phone, missing confirmation, stale version, expired session and uncertain network result; retains inputs on failure, provides sign-in recovery, shows unsaved changes and last-save/confirmation times. Does not add OTP/provider integration.

Validation: 216 PASS / 0 FAIL (2 new confirmation/legacy tests); TypeScript and diff checks passed; log evidence/account-confirmation-tests.log. Signed-in browser acceptance remains pending. Build/publication receipt follows in RELEASE_EVIDENCE.json.

Published Site v56 successfully: runtime cce588de8e19de5f4c5cd34d1c682fedefb8bd45; deployment appgdep_6aee2032498881918b0f739566aacb2d. Worker build passed. GitHub unchanged this round.


## 2026-11-06 · Cross-contact authorised card response

Implemented explicit CARD_SHARED responses in the original contact request thread using a separately created, redeemed grant. Sender must own that grant; redeemed buyer must be the request author; selected fixed publication month must equal the request month. Only structured responses allow an external evidence_grant_id; ordinary notes/requests cannot attach arbitrary grants. No grant is created, widened, redeemed or automatically bound by sending. Card response is not a claim that the requested material is present, independently verified or sufficient.

Migration 0018 adds nullable evidence_grant_id on messages. Existing grant-thread references retain their projection shape; external references include grant_id. Messages and request tracker preserve original request linkage and fixed card/version. Supplier workbench latest response becomes CARD_SHARED through existing projection. Reads/downloads re-authorise via original grant; revoke/expiry denies evidence while preserving message history. Send transaction rechecks active grant, sender/requester binding and contact/region restrictions; a concurrent revoke rolls back message and sequence.

UI: direct contact conversation → evidence request tracker → incoming request → use separately authorised card → select active same-month grant already redeemed by this contact → select fixed version → explicitly send. Candidate lookup supports pagination, reset and cancellation. Existing grant conversations continue unchanged. No original upload, AI execution, PACI core modification, email notification or automatic disclosure.

Validation: 221 PASS / 0 FAIL, including five cross-contact workflow/security tests. Initial legacy reference-shape regression was fixed by preserving optional-field compatibility. TypeScript/diff checks passed; log evidence/cross-contact-card-tests.log. Authenticated browser acceptance remains pending. Build/deployment receipt follows in RELEASE_EVIDENCE.json.

Published Site v57 successfully: runtime 36ea9c4579e0f715bdc4b7fc0ac32c8e050e8a3d; deployment appgdep_6aee2181a8688191bc44afed768fe3c3. Worker build passed. No GitHub synchronization this round. Next: buyer-side request record export and consolidated browser acceptance.
