# 直接通信双账号验收
状态：未执行，不得将服务测试替代浏览器验收。
原始清单基线：v51；最新实现及发布版本见 RELEASE_EVIDENCE.json。只使用合成资料；两个独立登录账号与隔离浏览器会话。
阻塞：当前客户端安全登录与浏览器接管不可用。不得伪造登录或关闭身份校验。

|步骤|操作|预期|结果|
|---|---|---|---|
|1|双方各创建联系人资料，以公开 ID/链接申请并接受|双方可进入同一会话；接受不授予材料权限|待验收|
|2|买方发送社保 2026-09 请求|供应方收到消息与待办，打开不会自动已读|待验收|
|3|供应方从请求准备新任务并确认保存|主题月份带入，企业场所可确认；没有自动关联或共享|待验收|
|4|查找同月份任务并明确关联|关联持久保存，买方不能读取私密任务|待验收|
|5|供应方回应准备中并刷新|买方看到一次回应，供应方待办状态更新|待验收|
|6|买方明确标记已读|此前消息已读；之后新消息仍未读|待验收|
|7|另行创建及兑换材料授权，发送固定卡引用|仅对应授权可读；后续版本不替换历史引用|待验收|
|8|撤销授权并再次打开引用|历史消息保留，材料读取拒绝|待验收|
|9|屏蔽联系人后从联系人/授权会话发送|均拒绝发送，历史可读|待验收|
|10|翻页/筛选/刷新、快速连点、失败重试、切换会话|旧选择清除；无重复发送或跨会话内容；草稿离开清除提示可见|待验收|

每项记录日期、版本、账号角色（不用密码/令牌）、实际结果和脱敏截图。失败项修复后重验。验收完成前不得标注正式商用就绪。

新增待验收：买方授权总览的状态筛选、全量统计、超过50条分页、切换时清除旧卡片、到期/撤销不返回证据、打开卡片重新鉴权。服务回归已通过；浏览器实际操作未执行。

新增待验收：在联系人“证据请求跟进”中选择已兑换同月授权及固定版本回应；原请求/待办显示 CARD_SHARED；双方查看固定卡；撤销后历史保留、查看与下载拒绝；分页刷新不沿用旧选项。服务测试通过，浏览器未执行。


## Pending export acceptance (2026-11-06)
NOT VERIFIED: managed preview blocked by existing vinext process in /site. With two legitimate accounts: send structured request, send PREPARING then a separately authorized fixed card, download HTML/JSON from both accounts, verify order/print layout, revoke the grant and export again (REVOKED reference retained; card denied), confirm no unread reduction. Test direct unauthorized API access with a third account. No credentials or session bypasses were used.


## Download recovery checklist (2026-11-06)
Backend workflow verified in collaboration-acceptance-tests.log (230 suite tests pass). Browser NOT VERIFIED. Pending: download HTML in zh/en/it and JSON; print layout; expired login stays on conversation with login guidance; retry after network failure; switch conversations during download; latest response changes clear old card preview; revoked references deny fresh reads/downloads without erasing exported history. Current managed preview is stopped; prior infrastructure conflict unresolved.


## Inbox recovery checks (2026-11-06)
NOT VERIFIED in browser. Check concurrent refresh completion order; 401 hides loaded conversations and contacts; sign-in returns to /conversations; network failure warns that prior unread count is stale; a newly accepted empty contact stays selected on refresh; opening a different contact removes the previous return-contact destination. Complete contact-consent backend integration is PASS in contact-consent-workflow-tests.log (231 tests total); no manual accepted-contact insertion in this new workflow test.
