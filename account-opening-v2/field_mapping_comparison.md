# PDF字段映射问题对比

## 问题根源

routers.ts中传递给PDF生成器的字段名与pdf-generator-v7.ts中定义的字段名不一致。

## 字段名对比

### 监管声明字段

| routers.ts传递的字段名 | pdf-generator-v7.ts期望的字段名 | 说明 |
|---|---|---|
| hasReadAgreement | agreementRead | 已阅读开户协议 |
| acceptsETO | electronicSignatureConsent | 接受电子交易条例 |
| acceptsAML | amlComplianceConsent | 接受反洗钱和合规监管 |
| acceptsRiskAssessment | riskAssessmentConsent | 风险评估确认 |
| agreementSigned | agreementAccepted | 协议签署 |

### 其他字段

| routers.ts传递的字段名 | pdf-generator-v7.ts期望的字段名 | 说明 |
|---|---|---|
| customerType | accountSelection.customerType | 客户类型（结构不一致） |
| accountType | accountSelection.accountType | 账户类型（结构不一致） |
| chineseName | basicInfo.chineseName | 中文姓名（结构不一致） |
| englishName | basicInfo.englishName | 英文姓名（结构不一致） |
| ... | ... | 所有字段都是扁平结构 vs 嵌套结构 |

## 解决方案

有两个选择：
1. 修改routers.ts中的字段名，使其与pdf-generator-v7.ts一致
2. 修改pdf-generator-v7.ts中的字段名和结构，使其与routers.ts一致

**建议选择方案2**：修改pdf-generator-v7.ts，因为routers.ts中的字段名更符合业务逻辑，且已经在多个地方使用。
