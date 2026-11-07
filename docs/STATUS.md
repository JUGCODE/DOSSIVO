## 最终上线回执 · v67

- 线上地址：https://dossivo-outcome-workbench.xugv.chatgpt.site
- 运行源码：`28f2ea93ddd44830a98a64f87d7eb0d9b4ac1dc2`。
- 版本：`appgprj_6aadb2f67df081918266b82e3fc373fb~appgver_338063c348088191a83bb242cc1b2a31`。
- 部署：`appgdep_6aee57f3cc348191997cbd6540de8af3`，succeeded。
- 246 项测试通过；类型检查及构建通过。对 19 段完整保密条款扫描当前跟踪源码与构建产物，命中 0。
- 实际生产数据库已确认存在合同审批表及运行时文档表；未批准收件人，未上传生产合同。
- 线上浏览器实测：英文首页→通信→协议→关闭返回；英文合作伙伴标题、简报；中文欧盟入口与合作伙伴页。真实获批账号交付及双账号登录场景未做浏览器验收。
- 合同保密原件已独立保存供负责人审阅，不在可复制的当前发布源码内。此回执后的文档提交不改变 v67 运行代码。

## 最终保密边界补强（v67）

发现站点允许源码复制（remix）。合同正文写在服务端源码里仍不满足保密要求，因此已从当前发布源码、内部状态摘录及测试样本移走真实草案和分成，另存负责人保密审阅包。没有把草案同步公开 GitHub。

- 新增 0020 合同正文运行时表，按类型、版本、语言存放；源码和迁移均不包含正文或条款种子。复制项目不会复制运行时数据库内容。
- 网页及下载必须同时具备有效的逐人审批记录和对应的审定语言文件。缺文件、语言不匹配、无效文档均不交付。读取文档前先验审批。
- 当前未向生产库上传合同正文，也未批准任何合作方，因此所有合同默认不发放。管理员审核、上传、通知和电子签约操作台尚未开通。
- 不得直接把此源仓库及其历史提交推到公开 GitHub；旧提交仍含历史草案。任何未来公开源码交付须使用经审查的干净导出。不得直接回滚 v61–v66，否则可能重新暴露打包草案。
- 旧版本已被他人获取的独立副本无法远程收回；本轮没有证据证明是否已有复制或下载。
- 最终全套实测 246 项通过、0 失败；语言测试 8 项，合同模式/权限/运行时文件测试 7 项。此前 245 项和 v66 均为本轮中间结果。

## 当前优先状态：合同保密与中英界面修复（2026-11-06，发布收尾 v66）

本节覆盖下方历史记录中的旧权限及语言描述。

- 合同默认拒绝。普通登录不授权；后台审批记录必须绑定接收账号、合作类型、指定合同版本、审批人、有效期，未撤销且未过期才可读取。网页和下载接口同时检查。新表默认无授权，没有用户自行批准的接口。
- 管理员审批操作台、资格审核、电子签约、自动通知尚未实现；本轮没有批准任何实际合作方。不能把本次访问控制当作完整签约系统。
- 中英界面统一使用明确语言 URL、共用翻译目录与渲染边界；内部导航、登录返回、联系人分享、证据卡及请求记录下载保持所选语言。用户消息和证据原文不自动翻译，结构化系统消息按当前语言呈现。
- 共用页面实际渲染测试覆盖：首页、通信、欧盟用户入口、协议、隐私、合作伙伴、账号，以及材料、授权、联系人、请求待办等面板。新增语言测试 8 项；新增保密权限测试 2 项。全套实跑 245 项通过、0 失败；类型检查及生产构建通过。
- 意大利语已有翻译继续保留；新增共用文案缺少意大利语译文时显示英文，不声称本轮完成意大利语全译。原始 JSON 导出保持机器字段及用户原文，不篡改历史数据。
- 合同内容、分成及包含这些内容的内部文档禁止同步公开 GitHub。v61 后的合同草案未同步公开 JUGCODE/DOSSIVO；公开仓库仍是 v57。今后公开导出须先排除并审查保密材料，不能沿用过去“完整源码公开”的授权来覆盖新保密要求。
- 尚未做双账号真实登录、实际批准收件人下载及全量浏览器交互验收；自动化验证不等于这些人工场景已验收。

测试原始记录：`docs/evidence/contract-privacy-language-final-tests.log`。

# Status

Updated 2026-10-26.

## PACI alignment implementation, 2026-10-26

- Added an authenticated, tenant-scoped D1 preparation API and a Chinese/English/Italian panel below the existing outcome workspace.
- Saves immutable application-level dossier snapshots bound to a specific case version. A batch persists each snapshot and its pending request together; stale-version and concurrent-history changes are rejected.
- Added stable-key retry handling, payload conflict detection, private draft export with a digest check, and append-only local challenge/reply/withdrawal history.
- Every request remains `PENDING`, connection is `NOT_CONNECTED`, and exports explicitly contain `proof_package: null`. PACI core 0.1 is reviewed but is not embedded in the production Worker. There is no dispatcher, connected PACI service or PACI receipt yet.
- A business reply is not adjudication. No external reviewer has been configured and no decision UI is offered. Current tenant scope is a single signed-in account, not full organisational roles.
- Fixed Link 1 fallback to mutable current content: links require frozen card and scope snapshots. Consumption rechecks expiry/revocation atomically; unidentified visitors are labelled honestly. Token changes cancel stale viewer requests.
- Added 17 bridge persistence/permission/version tests and 10 proof-link behaviour checks, alongside the 27 existing checks. Full TypeScript check and Worker build pass.
- Browser QA remains incomplete: the managed preview starts, but local D1 migration cannot bind its required loopback listener (`EPERM`). The database-backed page could not be exercised in that preview. SQL behaviour was tested with SQLite, including the real Drizzle route predicates; hosted migration/deployment is verified separately by Sites.

Architecture decisions and upstream acceptance conditions: [PACI alignment](PACI_ALIGNMENT_2026-10-26.md). Core review and reproducible probes: [paci-core 0.1 review](PACI_CORE_0_1_REVIEW.md).

## Implemented and tested

- Persistent tenant-scoped outcome case and generated database migration.
- Eight-stage buyer evidence flow and A01-A06 execution status.
- Adaptive questions, deterministic risk, traceable synthetic facts, gaps and remediation tasks.
- Enterprise confirmation gate and three-language card preview.
- Named-recipient Link 1 with expiry, card version and atomic view decrement.
- Explicitly fictional expert candidates and suitability reasons.
- Responsive working surface, labelled controls and receiving view.
- Hero-first home experience with four task-oriented entry points.
- Complete Chinese/Italian interface switching across the workbench and evidence-card view.
- Collapsible desktop sidebar with expanded and compact navigation states.
- Supplier-owned positioning, two-CTA home page, no-registration quick check and Brussels-time readiness countdown.
- Evidence continuity model with immutable validity periods, historical time-point lookup, gap highlighting and 30/7-day reminders.
- Proof-link snapshots, atomic view consumption, revocation and access logs.
- Complete Chinese, English and Italian product and evidence-link interfaces.
- Single-control flag language menu, site search, FAQ shortcut and visible sign-up/sign-in entry points.
- Revised labour-evidence hero, prominent readiness countdown and formal scope terminology in all three languages.
- Expanded the core self-check to a 17-question regulatory and evidence readiness assessment covering OECD six-step due diligence, worker-risk indicators, evidence continuity and inquiry response; added company governance to the 30-second check.
- Clarified the inventory-cycle selector and the limited meaning of the end-user withdrawal boundary in Chinese, English and Italian.
- Moved the full pricing section directly below the readiness countdown so visitors can assess urgency and cost in one continuous decision flow.
- EU-27 multi-country selection with a highlighted Italy option and multi-select support.
- Upstream evidence-chain self-check question with deterministic scoring and remediation finding.
- Monthly/annual price display, Chinese reference explainer and regional hosting plan disclosure.
- Interactive monthly/annual pricing, clickable plan comparison and initial Free/Starter/Business service bundles.
- Legally corrected readiness and scope copy distinguishing suspicion, investigation and confirmed prohibition decisions.
- Functional return control on the Chinese reference page, with safe in-site fallback.
- Finalised the trilingual hero around progressive file building and on-demand delivery of reviewable evidence.
- Refined the fourth quick-check question and urgent CTA in Chinese, English and Italian to identify buyer questionnaires and competent-authority inquiries precisely.
- Replaced platform-dependent flag emoji with packaged China, UK and Italy flag artwork across the header, market selector and evidence-card language controls.
- Clarified supplier follow-up messages as company-reviewed drafts, added Italian generation, and aligned Starter/Business wording with the implemented language set.
- Made the 30-second hero check collapsible, preserving its current-session result and remembering the compact preference for later visits.
- Added a multilingual, reduced-motion-aware floating return-to-top control that appears once the hero leaves view.
- Added an honest trilingual intelligent-workflow prototype entry in the hero, with Chinese rendered as “原生智能” rather than the English product term.
- Added a natural-language task launcher and three quick tasks that deterministically route Chinese, English and Italian intent into the existing self-check or urgent-response path; the interface makes company approval mandatory before execution or disclosure.
- Added a dedicated Chinese/English/Italian enterprise-action briefing centre, a homepage teaser and a working sidebar route, while preserving the countdown-to-pricing order.
- Added a clearly labelled founding preview with enterprise action cards, evidence-to-retain guidance, official sources and a scenario example that is explicitly not a real customer case.
- Added D1 schemas and authenticated APIs for issue archives, translated issue versions, explicit newsletter preferences and future delivery records. Registration does not create a subscription; users choose a preferred briefing language and can withdraw the preference.
- Kept email delivery visibly disabled until a provider, confirmation and one-click unsubscribe workflow are verified; no open or click tracking is implemented.
- Removed the remaining Chinese “AI 原生” product-positioning phrase in favour of “原生智能”.

## Synthetic demonstration only

Source files, extraction, translations, rule set and professional profiles. Agent cost is zero because no external model is invoked.

## Not production-ready

Real originals, customer-held keys, confidential execution, Link 2, deletion, full ABAC, real credentials, conflicts, language evaluation, security assessment, recovery and SLA evidence. Product decisions and placeholders are centralized in PENDING_DECISIONS.md.

Do not accept real originals or sell this package as production compliance software.

## 2026-10-23 update

- Added a trilingual compliance scope selector with clear available/planning boundaries.
- Added page-local evidence scope planning and text export; no persistence or real file ingestion.
- Added official regulation, portal, implementation guidelines and scope/process links.
- Retained existing labour workflow; CBAM, EUDR and battery/DPP are planning-only.

## Fixed snapshot review, 2026-10-26 (continuation)

- Added authenticated, tenant-scoped fixed snapshot content review and comparison endpoints without changing the database schema.
- Each requested snapshot is checked against its stored local digest before projecting its saved scope, facts, company confirmations and gaps. Current case content is never substituted.
- Added trilingual baseline selection, additions/removals/field-change tables and fixed-content inspection. Selection changes and refreshes abort obsolete reads and hide stale projections.
- Comparisons match stable local references; duplicate references fail closed. A reordered list is not a content change. Company confirmation changes remain separate from external verification.
- PACI service remains NOT_CONNECTED. Local digest matching is not a PACI receipt, independent verification, trusted timestamp or legal conclusion. This remains a synthetic-data prototype.

## Registration-only HTTP adapter, 2026-10-27

- Added a disabled-by-default, server-owned synthetic registration pilot with tenant-specific credentials, durable input envelopes and stable operation keys.
- Added query-before-post recovery, protocol/digest/content/version receipt validation, atomic receipt-to-request mapping and explicit unconfirmed failures.
- Added a trilingual registration status panel; without configured service credentials it shows that drafts remain local. No external service is contacted in the deployed default configuration.
- Added `PARTIALLY_SUPPORTED` to the proposed vocabulary; automatic assessments, independent verification and challenge dispatch remain disabled.
- Compatibility exercised with real core 0.3 engine outputs in process, not a live HTTP deployment. See PACI_HTTP_ADAPTER_0_3.md for configuration and upstream acceptance items.

## Current continuation (2026-11-05)

Current per-capability evidence supersedes historical status counts: see DOSSIVO_STATUS.md, PACI_COMPATIBILITY.md, ACCEPTANCE_REPORT.md and HANDOFF_DOSSIVO.md. The current application adds private versioned synthetic tasks and locally tested real HTTP registration; it does not claim a deployed on-chain Protocol.
