# 审批详情页面缺失的客户信息字段分析

## 对比基准：客户预览页面（ApplicationPreview.tsx）

### 缺失字段清单

#### 1. 个人详细信息部分
- **手机号**：`mobileCountryCode` + `mobileNumber`
  - 客户预览页面显示："+86 13800138000"
  - 审批详情页面：❌ 缺失

- **通讯地址**：`billingAddressType` + `billingAddressOther`
  - 客户预览页面显示："与居住地址相同" 或 "其他：xxx"
  - 审批详情页面：❌ 缺失

- **账单语言**：`preferredLanguage`
  - 客户预览页面显示："中文" 或 "English"
  - 审批详情页面：❌ 缺失

#### 2. 风险评估问卷部分
- **完整的10个问题和客户选择**
  - 客户预览页面显示：
    - Q1: 您目前持有的投资产品类型？
    - Q2: 您的投资期限？
    - Q3: 您对价格波动的接受程度？
    - Q4: 您计划投资的资金占总资产的百分比？
    - Q5: 您对投资的态度？
    - Q6: 您对衍生品的了解程度？
    - Q7: 您的年龄段？
    - Q8: 您的教育水平？
    - Q9: 您的投资知识来源？
    - Q10: 您的流动性需求？
  - 审批详情页面：❌ 缺失（只显示总分和风险等级）

- **总分**：`totalScore`
  - 客户预览页面显示："总分：540"
  - 审批详情页面：❌ 缺失

- **风险等级**：`riskLevel`
  - 客户预览页面显示："Medium to High / 中等至高"
  - 审批详情页面：❌ 缺失

- **投资取向描述**：`riskDescription`
  - 客户预览页面显示：完整的投资取向描述
  - 审批详情页面：❌ 缺失

## 修复方案

### 1. 在ApprovalDetail.tsx中添加缺失字段的显示

#### 个人详细信息部分（第4章节）
```tsx
{/* 手机号 */}
<div className="grid grid-cols-2 gap-4 py-2 border-b">
  <div className="text-sm text-muted-foreground">手机号 Mobile Number</div>
  <div className="text-sm font-medium">
    {completeData.detailedInfo?.mobileCountryCode} {completeData.detailedInfo?.mobileNumber || 'N/A'}
  </div>
</div>

{/* 通讯地址 */}
<div className="grid grid-cols-2 gap-4 py-2 border-b">
  <div className="text-sm text-muted-foreground">通讯地址 Billing Address</div>
  <div className="text-sm font-medium">
    {completeData.detailedInfo?.billingAddressType === 'same' 
      ? '与居住地址相同 Same as Residential Address'
      : completeData.detailedInfo?.billingAddressOther || 'N/A'}
  </div>
</div>

{/* 账单语言 */}
<div className="grid grid-cols-2 gap-4 py-2 border-b">
  <div className="text-sm text-muted-foreground">账单语言 Preferred Language</div>
  <div className="text-sm font-medium">
    {completeData.detailedInfo?.preferredLanguage === 'zh' ? '中文 Chinese' : 'English'}
  </div>
</div>
```

#### 风险评估问卷部分（新增章节）
```tsx
{/* 5. 风险评估问卷 Risk Assessment Questionnaire */}
{completeData.riskQuestionnaire && (
  <Card>
    <CardHeader>
      <CardTitle className="text-lg">5. 风险评估问卷 Risk Assessment Questionnaire</CardTitle>
    </CardHeader>
    <CardContent className="space-y-4">
      {/* Q1-Q10 的问题和答案 */}
      {/* 总分和风险等级 */}
      <div className="mt-4 p-4 bg-muted rounded-lg">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <div className="text-sm text-muted-foreground">总分 Total Score</div>
            <div className="text-2xl font-bold text-primary">{completeData.riskQuestionnaire.totalScore}</div>
          </div>
          <div>
            <div className="text-sm text-muted-foreground">风险等级 Risk Level</div>
            <div className="text-lg font-semibold">{completeData.riskQuestionnaire.riskLevel}</div>
          </div>
        </div>
        <div className="mt-4">
          <div className="text-sm text-muted-foreground">投资取向 Investment Orientation</div>
          <div className="text-sm mt-1">{completeData.riskQuestionnaire.riskDescription}</div>
        </div>
      </div>
    </CardContent>
  </Card>
)}
```

### 2. 在终审页面显示初审人员的审批信息

在ApprovalDetail.tsx中，当application.firstApprovalStatus === 'approved'时，显示初审记录：

```tsx
{/* 初审记录 First Approval Record */}
{application.firstApprovalStatus === 'approved' && (
  <Card className="mt-6">
    <CardHeader>
      <CardTitle className="text-lg">初审记录 First Approval Record</CardTitle>
    </CardHeader>
    <CardContent className="space-y-2">
      <div className="grid grid-cols-2 gap-4 py-2 border-b">
        <div className="text-sm text-muted-foreground">审批人员 Approver</div>
        <div className="text-sm font-medium">{application.firstApproverName || 'N/A'}</div>
      </div>
      <div className="grid grid-cols-2 gap-4 py-2 border-b">
        <div className="text-sm text-muted-foreground">CE号码 CE Number</div>
        <div className="text-sm font-medium">{application.firstApproverCeNo || 'N/A'}</div>
      </div>
      <div className="grid grid-cols-2 gap-4 py-2 border-b">
        <div className="text-sm text-muted-foreground">专业投资者认定 Professional Investor</div>
        <div className="text-sm font-medium">
          {application.isProfessionalInvestor ? '是 Yes' : '否 No'}
        </div>
      </div>
      <div className="grid grid-cols-2 gap-4 py-2 border-b">
        <div className="text-sm text-muted-foreground">风险等级 Risk Profile</div>
        <div className="text-sm font-medium">{application.firstApprovalRiskProfile || 'N/A'}</div>
      </div>
      <div className="grid grid-cols-2 gap-4 py-2 border-b">
        <div className="text-sm text-muted-foreground">审批时间 Approval Time</div>
        <div className="text-sm font-medium">
          {application.firstApprovalTime ? new Date(application.firstApprovalTime).toLocaleString('zh-CN') : 'N/A'}
        </div>
      </div>
      {application.firstApprovalComments && (
        <div className="grid grid-cols-2 gap-4 py-2 border-b">
          <div className="text-sm text-muted-foreground">审批意见 Comments</div>
          <div className="text-sm font-medium">{application.firstApprovalComments}</div>
        </div>
      )}
    </CardContent>
  </Card>
)}
```

### 3. 在最终预览页面和PDF中显示审批记录

#### ApplicationPreview.tsx（仅已审批的申请）
```tsx
{/* 审批记录 Approval Records */}
{(application.firstApprovalStatus === 'approved' || application.secondApprovalStatus === 'approved') && (
  <Card>
    <CardHeader>
      <CardTitle className="text-lg">审批记录 Approval Records</CardTitle>
    </CardHeader>
    <CardContent>
      {/* 初审记录 */}
      {/* 终审记录 */}
    </CardContent>
  </Card>
)}
```

#### PDF生成器（pdf-generator.ts）
- 已经实现了审批记录的渲染（第898-941行）
- 需要确保后端API正确传递审批信息
