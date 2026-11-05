// Single application-text source for the web page and Markdown. Not a new PACI kernel.
export const PROTOCOL_SECTIONS = [
  {
    "title": "1. 范围与六式框架",
    "text": "DOSSIVO 是业务应用，通过 PACIscan 使用 PACI 通用协议；不分叉通用内核。六式框架承接业务借贷记录、链上时间与共识、AI Ledger 和 Jurisdiction Ledger。框架叙事不代表这些链上能力已部署。PACIscan 保留 Record / Explore / Verify / Challenge。"
  },
  {
    "title": "2. 固定来源与企业确认",
    "text": "任务明确主体、工厂、期间、请求与目的。字段绑定材料版本、原文位置、原值与单位、转换方法和确认历史。更正追加新版本及理由，不能覆盖原提取值；企业确认不升级来源独立性。只有目录的资料不标为已阅读原件。"
  },
  {
    "title": "3. 检查、领域规则与结果",
    "text": "PACI-FLR 独立版本管理领域公式与规则。本次用户要求的 PACI-DOSSIVO-FL 名称作为证据呈现层标题保留，是否等同于 PACI-FLR 或引用它，待 Protocol 窗口冻结对应关系。H/P 初始阈值、示例价格和测试数量不视为正式政策。材料忠实性、来源认证、独立性、现实佐证和法律分析分别陈述。"
  },
  {
    "title": "4. 未解决事项与挑战",
    "text": "open、explained、remediating、resolved 保留各自含义。待审解释及整改中不是已解决。资料不足和已知问题同时显示。企业拒签不能阻止有权限的挑战、回应或更正；无合格独立复核人时不输出独立裁决。"
  },
  {
    "title": "5. 私密、交付与版本",
    "text": "默认 PRIVATE。Link1 摘要和 Link2 原件分别按接收人、版本、用途、页范围及期限授权，每次查询和导出重新鉴权。签核快照不被最新内容覆盖，新版本不自动扩大旧授权。敏感原件不上公开链。当前新任务模块仅支持合成材料与目录，不接受真实劳工原件。"
  },
  {
    "title": "6. 签核与链上执行",
    "text": "正式卡必须绑定有权人签核、原件与卡片承诺、精确版本、PACI 回执、对应 Protocol 合约执行事件及最终性验证。仅哈希一致、登记回执、代码开源、普通地址或 CA 结果哈希均不能代替这一链条。升级追加新版本；代理合约必须披露实现和管理权限。"
  },
  {
    "title": "7. 与 PACIscan 的对应表",
    "text": "上表引用已读取的 paci-http/0.4 应用接口；该版本号不是通用链上 Protocol 版本。0.4.2-alpha.1 与历史 Standalone 1.2 是不同实现分支，不能按数值大小推定新旧或兼容。",
    "rows": [
      [
        "登记 / 更正",
        "/v1/records；/versions",
        "适配器登记往返测试，更正需进一步业务接入"
      ],
      [
        "AI Ledger / Jurisdiction Ledger",
        "/v1/ai-actions；/v1/jurisdiction",
        "保留原名；当前未运行模型，不制造 AI 记录"
      ],
      [
        "检查 / 声明评估",
        "/checks；/evaluation",
        "不把登记或算出比率标为事实核实"
      ],
      [
        "查询 / 授权 / 历史",
        "/v1/records；/access-grants",
        "旧版 Link1 是合成演示；新任务保持私密"
      ],
      [
        "Challenge / 回应",
        "/v1/challenges；/respond",
        "本地业务事项不冒称 PACI 独立裁决"
      ],
      [
        "导出 / 核验",
        "/v1/proofs",
        "准备件可导出；无正式链上证明"
      ]
    ]
  },
  {
    "title": "8. 发布与可查询要求",
    "text": "Protocol 窗口交付权威文字、条款—代码—测试映射、源码提交、ABI、编译配置、链 ID、合约地址、部署交易、源码验证和升级策略后，DOSSIVO 才能固定引用并完成实际验证。核验应区分历史离线包与最新撤销、挑战及版本状态。现在不展示假地址、不宣称不可篡改的链上记录已经形成。"
  }
];
