#!/usr/bin/env python3
"""
将RiskQuestionnaire.tsx中的Q2从Checkbox改为RadioGroup
"""

import re

# 读取文件
with open('/home/ubuntu/account_opening_app/client/src/pages/steps/RiskQuestionnaire.tsx', 'r', encoding='utf-8') as f:
    content = f.read()

# Q2的替换
q2_old = '''              <Label className="text-base font-medium">Q2. 預期投資年期是多少？* (可多選)</Label>
              <div className="space-y-2 pl-4">
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

q2_new = '''              <Label className="text-base font-medium">Q2. 預期投資年期是多少？*</Label>
              <RadioGroup
                value={formData.q2_investment_period}
                onValueChange={(value) => setFormData(prev => ({ ...prev, q2_investment_period: value }))}
                className="space-y-2 pl-4"
              >
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="less_than_1" id="q2-less-than-1" />
                  <Label htmlFor="q2-less-than-1">沒有或少於1年</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="1_to_3" id="q2-1-to-3" />
                  <Label htmlFor="q2-1-to-3">1-3年</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="more_than_3" id="q2-more-than-3" />
                  <Label htmlFor="q2-more-than-3">多於3年</Label>
                </div>
              </RadioGroup>'''

content = content.replace(q2_old, q2_new)

# 保存文件
with open('/home/ubuntu/account_opening_app/client/src/pages/steps/RiskQuestionnaire.tsx', 'w', encoding='utf-8') as f:
    f.write(content)

print("Q2转换完成！")
