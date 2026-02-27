#!/usr/bin/env python3
import re

# 讀取文件
with open('/home/ubuntu/account_opening_app/client/src/pages/steps/RiskQuestionnaire.tsx', 'r', encoding='utf-8') as f:
    content = f.read()

# Q2: 將RadioGroup改為Checkbox（3個選項）
q2_pattern = r'(<Label className="text-base font-medium">Q2\. 預期投資年期是多少\？\*</Label>\s*)<RadioGroup\s+value=\{formData\.q2_investment_period\}\s+onValueChange=\{\(value\) => setFormData\(prev => \(\{ \.\.\.prev, q2_investment_period: value \}\)\)\}\s+className="pl-4"\s*>(.*?)</RadioGroup>'
q2_replacement = r'''\1<div className="space-y-2 pl-4">
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="q2-less-than-1"
                    checked={formData.q2_investment_period.includes("less_than_1")}
                    onCheckedChange={(checked) => handleCheckboxChange("q2_investment_period", "less_than_1", checked as boolean)}
                  />
                  <label htmlFor="q2-less-than-1" className="text-sm">沒有或少於1年</label>
                </div>
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="q2-1-to-3"
                    checked={formData.q2_investment_period.includes("1_to_3")}
                    onCheckedChange={(checked) => handleCheckboxChange("q2_investment_period", "1_to_3", checked as boolean)}
                  />
                  <label htmlFor="q2-1-to-3" className="text-sm">1-3年</label>
                </div>
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="q2-more-than-3"
                    checked={formData.q2_investment_period.includes("more_than_3")}
                    onCheckedChange={(checked) => handleCheckboxChange("q2_investment_period", "more_than_3", checked as boolean)}
                  />
                  <label htmlFor="q2-more-than-3" className="text-sm">多於3年</label>
                </div>
              </div>'''

content = re.sub(q2_pattern, q2_replacement, content, flags=re.DOTALL)

# 保存文件
with open('/home/ubuntu/account_opening_app/client/src/pages/steps/RiskQuestionnaire.tsx', 'w', encoding='utf-8') as f:
    f.write(content)

print("Q2轉換完成")
