#!/usr/bin/env python3
"""
批量将RiskQuestionnaire.tsx中的Q2-Q5、Q7、Q10从Checkbox改为RadioGroup
"""

import re

# 读取文件
with open('/home/ubuntu/account_opening_app/client/src/pages/steps/RiskQuestionnaire.tsx', 'r', encoding='utf-8') as f:
    content = f.read()

# 定义需要转换的问题及其选项
questions_to_convert = {
    'q2_investment_period': ['less_than_1', '1_to_3', 'more_than_3'],
    'q3_price_volatility': ['low', 'medium', 'high'],
    'q4_investment_percentage': ['less_than_10', '10_to_25', '25_to_50', '50_to_75', 'more_than_75'],
    'q5_investment_attitude': ['conservative', 'moderate', 'balanced', 'aggressive', 'very_aggressive'],
    'q7_age_group': ['18_to_40', '41_to_50', '51_to_60', '61_to_64', '65_or_above'],
    'q10_liquidity_needs': ['no_need', 'within_1_year', '1_to_3_years', 'more_than_3_years'],
}

# 对每个问题进行转换
for question_key, options in questions_to_convert.items():
    # 查找该问题的Checkbox部分
    # 匹配模式：从<div className="space-y-3">开始，到</div>结束
    pattern = rf'(<Label[^>]*>{question_key}.*?</Label>.*?)<div className="space-y-3">(.*?)</div>'
    
    def replace_checkboxes(match):
        label_part = match.group(1)
        checkbox_part = match.group(2)
        
        # 构建RadioGroup
        radio_items = []
        for option in options:
            # 从checkbox_part中提取该选项的label文本
            option_pattern = rf'value="{option}".*?<Label[^>]*>(.*?)</Label>'
            option_match = re.search(option_pattern, checkbox_part, re.DOTALL)
            if option_match:
                label_text = option_match.group(1).strip()
                radio_items.append(f'''            <div className="flex items-center space-x-2">
              <RadioGroupItem value="{option}" id="{question_key}_{option}" />
              <Label htmlFor="{question_key}_{option}">{label_text}</Label>
            </div>''')
        
        radio_group = f'''          <RadioGroup
            value={{{question_key}}}
            onValueChange={{(value) => setFormData(prev => ({{ ...prev, {question_key}: value }}))}}
          >
{chr(10).join(radio_items)}
          </RadioGroup>'''
        
        return label_part + radio_group
    
    content = re.sub(pattern, replace_checkboxes, content, flags=re.DOTALL)

# 保存文件
with open('/home/ubuntu/account_opening_app/client/src/pages/steps/RiskQuestionnaire.tsx', 'w', encoding='utf-8') as f:
    f.write(content)

print("转换完成！")
