# HANDOFF_DOSSIVO · continuation-0.2 · 2026-11-05

先读 DOSSIVO_STATUS.md、PACI_COMPATIBILITY.md、ACCEPTANCE_REPORT.md、RELEASE_EVIDENCE.json，再读本目录下接口、规则和数据流文件。完整主输入在 continuation-2026-11-05/inputs。当前源工程延续现有Site；不另建公共演示站，不改用户GitHub可见性。

## 本轮实际完成

1. 恢复第19版真实源码（基线c5831b667a1da88a4024063d26e4639f23b4f5e1），核查全部附件校验；公开GitHub只有入口README。
2. 私密任务D1持久化、合成材料/目录、字段原值/单位/引用、逐字段确认和追加更正、8指标准备性计算、未解决事项与历史、固定私密准备卡、CAS/幂等/原子Outbox。
3. 既有登记适配器默认对齐paci-http/0.4，显式保留旧0.3；新任务登记/恢复通过真正本地HTTP调用现有core，核心未修改/复制。
4. `/protocol`文字应用规范草案，标题旁并列PACI Protocol与PACI-DOSSIVO-FL链上入口状态；无权威部署时不填假地址，正式发布关闭。
5. 三语旧价格显著标记未采纳原型示例；新增任务当前中文/英文，意大利语原站保留但新模块英文fallback，尚非意语能力验收。

## 给Protocol窗口

- 提供唯一权威通用文本（版本/摘要）、合约源码/commit、ABI、编译参数、网络/chain_id、合约/实现地址、部署交易、源码验证与升级权限、最终性/重组策略。
- 冻结PACI-DOSSIVO-FL和PACI-FLR的对应关系；文本条款—代码—测试—部署映射，签核/批次/挑战/版本状态的验证器。
- 提供可独立信任的签署密钥/企业身份/CA桥接路径，不能让导出包替换自己的信任锚。
- 当前DOSSIVO应用文字不能冒充权威通用Protocol已定稿；收到材料后固定精确引用并做语义及执行验证，才显示真正链上链接与正式卡。

## 给PACIscan窗口

- 先确认承接core0.4.2-alpha.1 `/v1`还是Standalone1.2 `/api`；这是不同分支，不能混接或按版本数字降级。
- 提供实际可访问的服务origin、服务身份/tenant认证绑定、受控配置方式；不要把密钥放在交接正文。
- 增加可核验tenant/actor绑定回执或身份端点；当前0.4回执本身无法发现初始token配置到错误租户的问题。
- 逐项开放六组接口、上游权限/固定版本检查、导出独立验证与真实Protocol路径。0.4没有Standalone ACK，不伪造ACK调用。
- 运行 `node --experimental-strip-types --disable-warning=ExperimentalWarning scripts/paci-http-04-integration.mjs /path/to/existing/core`；当前脚本固定core0.4.2-alpha.1，版本变化需先审查再更新，禁止为绿灯替换新核心。

## 下一轮DOSSIVO顺序

- 完成真实登录后的生产浏览器任务闭环、两个账号隔离、恢复；未完成项仍按验收矩阵标记。
- D1补授权环境内的真实导入/OCR/AI字段草稿、未知/否定/附件等真实评估、完整OutcomeSpec和角色、多语言。
- D2补六组能力、队列自动退避、收件确认分支、固定版本更正/挑战/导出。
- D3收到Protocol实际交付后集成签核/链凭证/独立核验，不能另写不兼容内核凑完成。
- D4 Link2、多买家；D5支付/JUG；D6校准。现阶段不得接受真实敏感劳工材料或称56场景全通过。

本轮证据、具体保存提交/部署版本以 RELEASE_EVIDENCE.json 为准。共享源码文件有后续修改时先对照远端HEAD，使用普通push并保留并发冲突；不得强推覆盖另窗口。

## 本轮运行版本

Site第20版已部署；runtime commit `ded2beb207be95ad980fa5734f76c4ebea548044`。后续documentation commit保存本轮上线/未验收状态，未改变runtime。公开页已浏览器核对；登录认证需要用户选择方法/凭据，登录后操作与多账号验收尚未完成。

## 最新界面续接 · 首屏简化

本轮按用户截图修改首页：三张主要入口卡（快速自检/准备证据/回应买方），其余内容默认折叠；侧栏默认收起。revealElement/revealSection负责打开目标所有details祖先，保持菜单、搜索、FAQ及hash导航可用。不要在后续业务开发中再次把所有技术面板和长表单无条件铺到首页。后端与协议状态沿用前述边界；首页调整不代表原未验收功能通过。

侧栏顶部现有“为何选择多希沃”文字入口（含收窄态）；通过dossivo:open-benefits事件打开主区域独立面板，支持#why-dossivo直达，保留原优势文案及规划标签。

眉标文案调整：中文采用用户最新确认的“让 DOSSIVO 的 AI 工具协助你，把材料变成有据可查的回应”，英文和意大利文同步明确 DOSSIVO 的 AI 工具。仅文案，无接口或协议能力变化；构建校验随本次发布执行。

## 最新：材料覆盖与基本参数访问码

先读BASIC_BUYER_ACCESS_0_1.md，追加迁移0006_left_toro。欧盟入口/eu-buyer使用正常注册登录；一次兑换绑定账号，48/72小时从生成起算；所有读/下载重验，已下载历史卡不会过期自毁。覆盖条不作为可信评分；真实文件/PDF/AI、独立同行基准及正式链上卡仍阻断。下一轮优先完成登录后出口企业/两买方真实浏览器验收，再逐项放行真实材料区域/模型路径。不要把基本码授权误当Link2原件权限，不把用户入口当国籍或公司代表资格验证。


## 最新界面修复：Protocol 返回与关闭

app/protocol/navigation.tsx 为独立客户端导航；页面外层及顶部吸附样式在 app/globals.css。返回/×使用同源 document.referrer 推导入口，有同源历史时 history.back()，否则使用真实链接回入口；无可信来源则 /zh/。不要改用 window.close()：当前所有 Protocol 入口都在同一标签页。本地首页/欧盟入口往返与滚动可见、TypeScript、Worker构建通过；协议正文与PACI兼容状态未改。当前源码及部署版本以Site最新保存/部署记录和远端HEAD为准。


## 最新续接：共享状态与复用测量

先读SHARED_STATE_SUPPLEMENT_2026_11_05.md：对照三份附件、官方来源与宪章，纠正“竞品都是孤岛”、手填0即实测、开源即去中心控制等推断。新增EvidenceReusePanel位于私密任务→基本参数授权码→证据复用记录，默认折叠，打开/刷新才向GET basic-access?task=...&usage=1读取ownerUsage。服务端全量SQL聚合，权限沿用read(owner,task)，只向所有者返回数字/卡ID，不泄露其他买方身份，不因统计读写新事件。合成计数不能充当真实商业数据，verified_buyer_companies/purchase_acceptances/real_commercial_usage保持null。

新基本投影可选source_card_id与HTML/买方在线页显示同一固定卡身份；不暴露私有全文，不更改历史投影，不自动给新内容授权。108项测试/TS/Worker构建通过；登录后统计UI与双账号线上验收尚未完成。下一步优先完成该验收，然后按原阶段补企业/工厂稳定ID、来源去重与跨任务引用、变更影响关系；买方明确反馈为新增建议未实现。真实原件、同行基准、CA签核与正式链上历史仍按各自原门槛，不能为网络叙事跳过。


## 最新优先交付：两组界定第1批（2026-11-05）

先读 CONTINUOUS_ACCESS_BATCH_1.md。用户已授权分批实现披露授权与合规对话；本批完成持续固定摘要授权基础，其他功能按该文档清单接续。追加迁移0007_aberrant_freak，旧授权保持TEMPORARY，不自动延长。新CONTINUOUS_SUMMARY：兑换窗口48/72小时，成功绑定后持续至撤销；禁止精确数值，版本仅FIXED，用途COMPLIANCE_REVIEW。新API expires_at=null表示无固定访问到期日，redemption_expires_at单独表示兑换截止。任务变化提示复核，不自动披露未发布新材料。

本轮重新运行114项测试全通过（新增6项），TypeScript通过，日志evidence/continuous-access-tests.log。持续授权不等于完整三级披露：公开概览、专项原件、后续摘要发布订阅、企业成员和合规对话均尚待实现；真实数据和正式PACI链路径仍阻断。生产多账号浏览器验收尚未完成。以上最新说明优先于本文件之前旧版48/72小时整体到期描述。

本批Worker构建通过；托管预览健康检查超时，status显示stopped，未做浏览器交互验收。部署结果以Sites保存版本/部署返回为准。


## 最新优先交付：两组界定第2批（2026-11-05）

先读PUBLISHED_SUMMARY_BATCH_2.md。新增FOLLOW_PUBLISHED，必须在创建持续授权时明确选择，旧授权默认FIXED。所有者预览后按单一已绑定授权发布同任务/主体/场所/期间的新摘要；冻结历史和事项轨迹保留，原类别/用途不扩大，精确数值仍禁止。GET sequence支持获准历史查看与下载；每次含历史请求均重验，撤销不删除既有交付事实。

迁移0008_omniscient_the_call及新表dossivo_summary_publications；访问事件card_id用于统计真正被读取的版本。预览hash/expected_sequence、D1事务、CAS和幂等约束已覆盖。122项测试全通过，TypeScript复检通过；日志evidence/published-summary-tests.log。浏览器交互与生产双账号仍未验收。PACI路径/正式链上卡/真实材料门槛不变；哈希链不冒称链上执行。合规对话与组织成员尚未实现，是下一批优先工作。

第2批Worker完整构建通过；生产发布状态以本批Sites保存版本及部署结果为准。

## 第3批进行中：会话权限边界与联系人推荐

新增collaboration-permissions.js纯策略模块及测试，尚未接入数据库/API/UI，不能称聊天功能已上线。必须由服务端读取可信成员列表，禁止直接采用请求JSON作为成员事实；只允许指定会话的ACTIVE成员，企业管理员身份本身不授予所有会话权限；其他买方和退出成员拒绝，READER不可发送，关闭会话仅可按成员权限读取。证据读取仍必须独立走BuyerAccessStore，不由会话角色授予。

用户新增已定方向：推荐/分享联系人，接收方可看到谁推荐。后续实现推荐人、被推荐联系人、指定接收方、时间及处理状态；推荐不自动建立会话、不自动授予证据权限、不公开关系图。首期展示推荐来源和经允许的名称，不默认分享私人邮箱/电话；拒绝、屏蔽、防滥用与联系人共享同意需接入实际流程。当前仅有白名单投影策略，不存在发送推荐接口或外发行为。


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


## 最新优先状态：国际通信测试版与中国大陆暂缓（2026-11-05）

先读COMMUNICATION_REGIONAL_AVAILABILITY_0_1.md。按用户最新决定，暂缓腾讯/阿里付费SDK及中国大陆通信开放；不是审批申请已经提交。侧栏保留UsersRound直接通信及悬停/键盘提示“中国大陆用户暂未开通，待完成相关手续。国际测试版已开放。”

新增0012和CommunicationPolicyStore：正常登录后本人声明通信服务地区，UNKNOWN默认关闭，CN_MAINLAND暂不开放，双方当前INTERNATIONAL才可申请/接受/推荐/发信。资料公开解析、第三方推荐和旧grant会话也受约束；事务重验防止并发声明变更后落入新消息。地区仅本人声明、未核验，不按中文/国籍推断，不能声称地理封锁或企业身份认证。旧账号不自动迁移为国际。

历史消息、已读/拒绝/屏蔽仍按原身份可处理；证据授权独立。当前仍只支持合成测试资料。本轮完整169项测试通过，新增地区测试15项，日志evidence/communication-regional-tests.log；不沿用上轮154项作为本轮结果。原PACI/真实数据门槛不变。

本轮TypeScript noEmit、git diff --check及Worker完整构建通过。发布结果另记实际保存版本与部署回执。

本轮实际发布：Site第33版，runtime commit 0f2b4bc4104abd37e45fcea966dccecdd05362af，部署appgdep_6aecae08ed64819183780dbbbc2428fa成功。生产匿名页显示国际测试版及大陆暂未开通说明；侧栏键盘聚焦Tooltip已观察到visible/opacity=1及完整准确文案。未登录，双账号地区设置/收发/扫码/实际回跳仍未验收，不能由169项服务测试代替。后续文档回执提交不更改运行代码。

Claude最新附件已复核，见COMMUNICATION_REGIONAL_AVAILABILITY_0_1.md末节。下一批建议优先独立固定字段证据请求/一键回复/授权卡引用，不把现有自由body的REQUEST当结构化完成；邮件、音图仍未接通。原v33开放边界不因建议自动放宽，企业注册国建议未替换为已核验地理身份。


## 最新覆盖：开发期间默认不拦截地区（2026-11-05）

按用户最新指令，COMMUNICATION_REGION_ENFORCEMENT=false；当前开发测试不拦截CN_MAINLAND或UNKNOWN，无需先选择地区，中文可正常使用。后台与事务SQL同步关闭地区条件，保留未来正式启用的地区规则。Sidebar及入口提示同步；不因production构建/本次增量部署自动开启限制。不将账号悄悄改成国际地区。

先读COMMUNICATION_DEVELOPMENT_OPEN_0_1.md。此状态覆盖第33版地区默认关闭的运行描述；历史材料/授权/身份/屏蔽/合成测试门槛保留，PACI未改。本轮测试与发布结果另记实际回执。

本轮实际完整回归175 PASS / 0 FAIL / 0 SKIP / 0 TODO；地区策略测试21项（原15项显式严格模式、新增6项默认开发开放），日志evidence/communication-dev-open-tests.log。覆盖大陆/未知账号中文联系与收发、旧大陆声明解禁、默认不回填国际地区、旧grant会话、严格开关保留、同意/屏蔽/隐私/合成资料及材料权限独立。TypeScript noEmit、git diff --check、Worker完整构建均通过。生产浏览器验收与部署结果另记回执，不由服务测试代替。

本轮已实际发布Site第34版：runtime commit ad9c44e11a9f0e558789f0de934bc3f2d150ffe3，部署appgdep_6aecb0b500508191adf3362a2c7951a5成功。线上匿名/conversations显示“开发期间暂不按地区限制，中文可正常使用”及无需先选地区；侧栏键盘聚焦Tooltip可见且为开发开放文案。当前浏览器未登录，双账号收发/扫码未实测；175项服务测试不代替该验收。文档回执提交不改变运行代码。


## 最新界面调整：侧栏订阅与价格（2026-11-05）

按用户要求删除Sidebar重复的欧盟用户入口，顶部入口保留。在“为何选择多希沃”下方新增突出显示的“订阅与价格”（EN Plans & pricing / IT Abbonamenti e prezzi），窄侧栏保留图标和短标签。

入口复用现有价格区，新增subscription-pricing锚点。点击沿用revealSection展开价格本身和home-information父级，再滚动定位；关闭移动侧栏。保留现有语言、月付/年付和套餐选择状态，不新建第二份价格内容。

仅app/workbench.tsx、app/compliance-home.tsx、app/globals.css的导航与定位样式变化。金额、配额、原型价格提示、购买状态、API/数据库、地区开发开放模式与PACI均未改变。

本轮TypeScript noEmit、git diff --check及Worker完整构建通过。纯导航变化未新增或重跑服务层测试，不把上轮175项当本轮结果。生产点击定位及发布结果另记实际回执。

本次已发布Site第35版：runtime commit 81d34f5fd56183bc8997e41c3723374c0f84ded9，部署appgdep_6aecb291d42481919767e8f573ca4d9d成功。生产浏览器已确认顶部欧盟入口1个、Sidebar为0个；窄侧栏显示“订阅/价格”，点击后subscription-pricing及其home-information父级均open，平滑滚动结束后顶部96px且处于视口内，月付/年付与套餐内容可见。未改价格政策或服务端，本轮未重跑服务层测试。文档回执提交不改变运行代码。


## 最新界面调整：顶部导航精简与侧栏底部外观（2026-11-05）

用户继续要求：合并登录与注册、外观选择移到Sidebar下部、Protocol并入Sidebar。顶部现为单一“登录 / 注册”（EN Sign in / Sign up / IT Accedi / Registrati），沿用同一Sites认证地址；移除顶部主题按钮及Protocol链接。

Sidebar在直接通信下新增ScrollText图标Protocol入口。外观切换置于底部固定区域，显示当前浅色/深色，沿用原toggleTheme和dossivo-theme偏好；窄侧栏也可操作。主要入口保持可见，中间任务导航和进度允许滚动，避免底部控制被长列表挤出；通信Tooltip留在非滚动区域。之前新增订阅与价格、删除侧栏欧盟重复入口的调整保留。

本次仅导航/布局与状态传递，无认证后端、协议正文、收费政策、数据库或地区规则变化。真实资料/PACI及开发地区开放边界保持原状态。

本轮TypeScript noEmit、git diff --check、Worker完整构建通过；独立只读复核未发现侧栏闭合、Tooltip裁切或原认证/主题持久化回归。纯界面调整未新增或重跑服务层测试，175项为历史记录。本轮浏览器及部署结果另记回执。

本轮已发布Site第36版：runtime commit d70885743d07e57ebd76651774168843e3b92658，部署appgdep_6aecb44637d08191878d34ff71a86fd9成功。线上中文桌面验收：顶部仅一个“登录 / 注册”，无主题按钮/Protocol导航；侧栏Protocol实际打开且可用×返回；窄/宽侧栏外观按钮底部均距视口16px；切换深色刷新并完成hydration后仍保留深色，已恢复原浅色。小屏触摸与实际认证未新增实测；原认证地址未变。纯UI轮次没有把历史175项测试算作本轮结果。文档回执提交不改变运行代码。


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
工作台请求 GET 新增 topic（默认 ALL），与 status、before 组合；固定 topic 白名单来自 structured-evidence-request.js。统计不随筛选变化。GitHub 按用户要求暂不同步。后续继续请求与证据任务协作闭环；AI Agent 与 PACI scan 实际执行/记账仍未接入。

发布回执：v44 已部署成功；运行提交 `b81824ce10356a3af001f0cb5e34898735880994`；部署 `appgdep_6aed25aba2d08191bd09dfefe729bb58`。Worker 构建及 diff 检查通过。GitHub 未同步。


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

## Next delivery scope
Estimate from the start of this round: 6–8 rounds for a bounded synthetic-data trial milestone, including this account-form closure, 2–3 rounds on communication/evidence association, 1–2 on buyer record export and 2 on acceptance/fixes. This is an estimate, not a production-readiness guarantee; acceptance blockers may extend it. Stop incremental account-form polish unless a defect is found. Actual email/SMS authentication requires supported hosted identity integration and configured provider. Real evidence processing, AI, PACI scan and enterprise connectors remain separately gated external work.


## 2026-11-06 · Cross-contact authorised card response

Implemented explicit CARD_SHARED responses in the original contact request thread using a separately created, redeemed grant. Sender must own that grant; redeemed buyer must be the request author; selected fixed publication month must equal the request month. Only structured responses allow an external evidence_grant_id; ordinary notes/requests cannot attach arbitrary grants. No grant is created, widened, redeemed or automatically bound by sending. Card response is not a claim that the requested material is present, independently verified or sufficient.

Migration 0018 adds nullable evidence_grant_id on messages. Existing grant-thread references retain their projection shape; external references include grant_id. Messages and request tracker preserve original request linkage and fixed card/version. Supplier workbench latest response becomes CARD_SHARED through existing projection. Reads/downloads re-authorise via original grant; revoke/expiry denies evidence while preserving message history. Send transaction rechecks active grant, sender/requester binding and contact/region restrictions; a concurrent revoke rolls back message and sequence.

UI: direct contact conversation → evidence request tracker → incoming request → use separately authorised card → select active same-month grant already redeemed by this contact → select fixed version → explicitly send. Candidate lookup supports pagination, reset and cancellation. Existing grant conversations continue unchanged. No original upload, AI execution, PACI core modification, email notification or automatic disclosure.

Validation: 221 PASS / 0 FAIL, including five cross-contact workflow/security tests. Initial legacy reference-shape regression was fixed by preserving optional-field compatibility. TypeScript/diff checks passed; log evidence/cross-contact-card-tests.log. Authenticated browser acceptance remains pending. Build/deployment receipt follows in RELEASE_EVIDENCE.json.

Published Site v57 successfully: runtime 36ea9c4579e0f715bdc4b7fc0ac32c8e050e8a3d; deployment appgdep_6aee2181a8688191bc44afed768fe3c3. Worker build passed. No GitHub synchronization this round. Next: buyer-side request record export and consolidated browser acceptance.
