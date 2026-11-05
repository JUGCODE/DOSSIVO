# 业务证据准备件 schema 0.2

这不是正式PACI proof格式，不替代PACI独立验证器。

任务：task_id/version、synthetic_only、visibility、OutcomeSpec、versions、materials、fields、flags、assessments、cards、events。历史body_json与body_hash追加保存；头只指向当前版本。

材料：id/version、mode（DIRECTORY/SYNTHETIC_TEXT）、title、custodian（目录）、text（仅合成）、text_sha256、root_id、scope、SELF_REPORTED、original_seen:false。目录无原文，不可运行字段定位。合成样本实际场所与期间固定，不继承用户随意填写的任务范围。

字段：id/code、material_id/version、root_id、locator（页1/行/start_utf16/end_utf16/quote）、raw_value/raw_unit、extracted_value/unit、conversion.factor/basis、scope、expression、method/model:null、located_at、confirmed_value、confirmations[]（previous_value/value/reason/actor/at）。确认不覆盖原提取值。当前仅内置文字，不支持PDF真实页码裁剪/OCR。

检查：固定input_version/input_digest、checker_version、profile_version:null、metrics[]（公式、输入字段与共同根、值/无法计算原因）、missing、unresolved、incomplete及summary。单月同场所口径外不计算；H/P、实际工作条件与法律判断独立列未评估。

Flag：本地X1、target_version、severity、open/explained/remediating、history；resolved为保留状态但未开放关闭操作，等待合格复核规则。不是自动违法flag，也不是PACI挑战回执。

准备卡：id、body、sha256。body固定task_version、OutcomeSpec、所有来源/字段/事项与检查版本；formal_card:false、signature:null、proof_package:null、registration_status:NOT_REGISTERED、chain_status:NOT_CONNECTED。后来的登记只更新Outbox/delivery，不篡改历史body。

离线JSON带合成材料全文，只有所有者能导出；不是公开Link1或只含摘要的证明包。外部包内sha256不是信任锚；本轮未提供独立签名验证。若修改原件/字段/规则引用，服务端摘要核对可发现已存内容改变，但自洽重算恶意离线包仍需外部信任锚来发现。

新增可选coverage（固定11项参考分母、submitted/company_confirmed/checked、L1–3覆盖）和材料categories/company review。基本披露格式不含原文字段，只含用户选定的确认数值、类别状态、范围、覆盖及未解决事项计数。独立HTML卡记录创建/下载/在线到期时点，不在离线文件中执行过期自毁。详见BASIC_BUYER_ACCESS_0_1。
