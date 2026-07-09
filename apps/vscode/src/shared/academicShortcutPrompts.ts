export const RESEARCH_TOPIC_PROMPT =
	"/deep-research 请进入 socratic 模式，作为选题引导助手协助我澄清研究方向。优先询问我的学科领域、兴趣主题、课程或项目约束、可用数据/文献、时间范围和期望产出；请用 FINER 标准生成并比较 3-5 个候选研究问题，指出每个问题的可行性、创新点、风险和下一步文献检索关键词。不要替我虚构研究背景或结论，信息不足时先列出需要补充的问题。"

export const LITERATURE_REVIEW_PROMPT =
	"/deep-research 请以 lit-review 模式协助我完成文献检索与综述。优先询问研究主题/问题、学科范围、时间范围、数据库或语种偏好、纳入/排除标准、已有文献文件和目标综述格式；请输出检索策略、候选文献矩阵、主题归类、争议点、研究空白和可继续扩展的关键词。区分已发表同行评审文献、预印本和灰色文献，不能编造不存在的引用。"

export const ACADEMIC_PIPELINE_PROMPT =
	"/ars-full 请作为科研全流程助手，帮我从当前阶段推进完整学术项目。优先询问我的起点是选题、已有文献、已有草稿、审稿意见还是待投稿稿件，并确认研究主题、目标产出、时间安排、目标期刊/会议/课程要求、已有材料和需要暂停确认的节点；请按 research -> write -> integrity check -> review -> revise -> re-review -> final integrity check -> finalize 的流程给出阶段判断、下一步建议和需要调用的 ARS 技能。不要跳过用户确认节点，也不要编造文献、实验结果或审稿意见。"

export const EXPERIMENT_ASSISTANT_PROMPT =
	"/scientific-toolkit-skill 请作为实验助手协助我完成科研计算任务。优先询问任务目标、数据或代码位置、物理量/单位、输入输出格式、期望图表和验证方式；可覆盖 MATLAB/Python 仿真、信号处理、统计分析、机器学习、优化、论文配图与可复现实验流程。不要编造实验参数或结果，必要时先列出假设和需要我补充的信息。"

export const OFFICE_ACADEMIC_ASSISTANT_PROMPT =
	"/office-academic-skill 请作为 Word/PPT 助手协助我制作或修改学术交付物。优先询问用途、受众、时长/页数、模板要求、源文件和输出格式；可覆盖文献阅读报告、组会 PPT、课程汇报、开题/中期/答辩 PPT、DOCX/PPTX 生成与质量检查。默认中文表达，保留英文题名、公式、变量名和参考文献信息，并为关键结论标注来源。"

export const PAPER_STRUCTURE_PROMPT =
	"/ars-outline 请作为论文结构重组助手分析并优化我的论文大纲或章节结构。优先询问论文题目、研究问题、目标期刊/课程要求、论文类型、字数、已有大纲或草稿位置、核心证据和必须保留的章节；请给出重组后的章节层级、每节功能、论点-证据映射、缺口与调整理由。不要直接编造实验结果或文献结论，缺少材料时先给出待补充清单。"

export const ARTICLE_POLISH_PROMPT =
	"/nature-polishing 请作为文章润色助手优化学术表达。优先询问目标语言、论文类型、目标期刊或风格、具体章节、是否需要保留术语/公式/引用格式，以及希望保守润色还是结构性改写；请在不改变原意和证据边界的前提下改进中英文学术表达、逻辑衔接、段落节奏和贡献表述，并标注不应凭空补写的内容。"

export const LOGIC_SCAN_PROMPT =
	"/ars-reviewer 请作为论证漏洞扫描助手，以审稿人和 Devil's Advocate 视角检查我的论文或段落。优先询问稿件位置、研究问题、目标读者/期刊、方法和证据材料；请重点识别逻辑跳跃、因果过度推断、证据不足、方法缺陷、反例、概念混用和结论边界问题，按严重程度给出修复建议。只输出诊断和建议，不直接改写原稿，除非我明确要求。"

export const PEER_REVIEW_PROMPT =
	"/ars-reviewer 请作为模拟审稿助手对我的论文进行同行评审。优先询问稿件文件或正文、目标期刊/会议、学科领域、论文类型和我最担心的问题；请按编辑和多位审稿人的视角输出优点、主要问题、次要问题、方法与引用意见、总体判断和可执行修订路线图。不要替审稿人编造不存在的实验或引用事实。"

export const CITATION_CHECK_PROMPT =
	"/ars-citation-check 请作为引用核查助手检查我的论文引用与论证支撑。优先询问稿件位置、参考文献列表、目标引用格式和需要重点核查的章节；请检查文内引用与参考文献是否匹配、格式是否一致、关键论断是否有来源支撑、是否存在缺失/过期/不可靠来源，并输出问题清单和修复建议。不要生成无法验证的 DOI、页码或文献信息。"

export const FORMAT_CHECK_PROMPT =
	"/ars-format-convert 请作为投稿格式检查助手核对我的论文是否符合目标期刊、会议或学校模板要求。优先询问目标 venue、模板/author guidelines、稿件文件、输出格式、引用格式、图表/附录要求和是否允许自动修改；请先做格式差异清单，再给出可执行修改步骤或转换方案。不要在未确认模板和目标格式前大幅改写正文。"

export const PAPER_PLAN_PROMPT =
	"/ars-plan Help me plan an academic paper. Ask for my topic, field, target venue or course requirements, current sources, and expected length, then guide me toward a research question, thesis, chapter plan, evidence map, and writing milestones before drafting."

export const ABSTRACT_POLISH_PROMPT =
	"/nature-polishing Help me polish an academic abstract. Ask me to paste the abstract and name the field, target venue, paper type, and desired language, then improve clarity, academic tone, contribution framing, logical flow, and keyword fit while preserving the original meaning and evidence boundaries."

export const REVIEWER_RESPONSE_PROMPT =
	"/ars-revision-coach Help me draft a response-to-reviewers plan. Ask for the reviewer comments, decision letter, manuscript context, and any revised draft, then produce a prioritized revision roadmap and point-by-point response skeleton with tone guidance and places where evidence or manuscript changes are required."
