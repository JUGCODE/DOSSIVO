# 开发期间地区限制关闭 · 0.1（2026-11-05）

用户最新指令覆盖此前第33版地区默认限制：开发过程中不拦截中国地区，不拦截中文语言；当前默认开放地区测试，正式上线再启用地区规则。这里的“正式上线”指产品正式商用发布决定，不能因Sites增量部署使用production构建就自动启用。

## 本轮实际改动

- lib/communication-config.js集中配置COMMUNICATION_REGION_ENFORCEMENT=false。后端资格检查、事务SQL及UI使用同一默认配置，不按NODE_ENV、浏览器语言、邮箱、姓名或中文消息推断地区。
- CommunicationPolicyStore默认返回mode=DEVELOPMENT_OPEN、region_enforcement=false、available=true；UNKNOWN仍是UNKNOWN，原CN_MAINLAND声明仍保留，不偷偷回填为INTERNATIONAL。
- 联系资料公开解析、ID查询、申请/接受、推荐及新旧会话发信，在默认开发模式均不因地区被拒。对方接受、屏蔽/公开设置、材料单独授权、登录身份及合成内容门槛仍有效。
- /conversations与/connect页面不再要求先填地区表单；Sidebar和页面提示“开发期间暂不按地区限制，中文可正常使用”。旧“中国大陆未开通”提示仅保留在未启用的地区限制分支。
- 仅可信服务端构造选项可显式测试regionEnforcement=true；HTTP JSON不得设置模式。正式启用需要修改集中发布配置并部署、复核地区依据，不能通过用户输入或语言选择切换。
- 本轮无需数据库迁移，不删除既有声明、联系人、会话、授权或历史版本；PACI及真实资料状态不因地区开关而改变。

## 后续接续

本节优先于COMMUNICATION_REGIONAL_AVAILABILITY_0_1.md及旧报告中“UNKNOWN/CN默认关闭”的当前状态描述；那些描述和15项严格模式测试保留为历史/未来开关验证。正式地区规则仍只能按地区资料控制，不能基于中文界面、中文内容或中文姓名拦截；当前已有声明未核验，不能标为企业注册地认证或地理识别完成。

Claude关于固定请求/一键回复/授权卡闭环的建议仍为下一批候选，邮件、语音、图片尚未接入。本轮只解除开发期间地区阻断，没有将未完成功能标成可用。

验证计数、构建及部署结果见ACCEPTANCE_REPORT和RELEASE_EVIDENCE.latest_release；服务层检查与生产双账号浏览器验收分别记录。

本轮实际完整回归175 PASS / 0 FAIL / 0 SKIP / 0 TODO；地区策略测试21项（原15项显式严格模式、新增6项默认开发开放），日志evidence/communication-dev-open-tests.log。覆盖大陆/未知账号中文联系与收发、旧大陆声明解禁、默认不回填国际地区、旧grant会话、严格开关保留、同意/屏蔽/隐私/合成资料及材料权限独立。TypeScript noEmit、git diff --check、Worker完整构建均通过。生产浏览器验收与部署结果另记回执，不由服务测试代替。

本轮已实际发布Site第34版：runtime commit ad9c44e11a9f0e558789f0de934bc3f2d150ffe3，部署appgdep_6aecb0b500508191adf3362a2c7951a5成功。线上匿名/conversations显示“开发期间暂不按地区限制，中文可正常使用”及无需先选地区；侧栏键盘聚焦Tooltip可见且为开发开放文案。当前浏览器未登录，双账号收发/扫码未实测；175项服务测试不代替该验收。文档回执提交不改变运行代码。
