      setLocation(`/application/${applicationId}/step/9`);
    },
    onError: (error: any) => {
      toast.error(`保存失敗: ${error.message}`);
    },
  });

  // 計算評分
  const calculateScore = (): { totalScore: number; riskLevel: string; riskDescription: string } => {
    let score = 0;

    // Q1: 現在是否持有以下任何投資產品？（每個選項40分）
    if (formData.q1_current_investments.includes("savings")) score += 40;
    if (formData.q1_current_investments.includes("bonds")) score += 40;
    if (formData.q1_current_investments.includes("derivatives")) score += 40;

    // Q2: 預期投資年期（A=10分，B=30分，C=50分）
    if (formData.q2_investment_period === "less_than_1") score += 10;
    else if (formData.q2_investment_period === "1_to_3") score += 30;
    else if (formData.q2_investment_period === "more_than_3") score += 50;

    // Q3: 可以接受的年度價格波幅（A=10分，B=30分，C=50分）
    if (formData.q3_price_volatility === "10_percent") score += 10;
    else if (formData.q3_price_volatility === "20_percent") score += 30;
    else if (formData.q3_price_volatility === "30_percent") score += 50;

    // Q4: 資產淨值中可作投資用途的百分比（A=10分，B=20分，C=30分，D=40分，E=50分）
    if (formData.q4_investment_percentage === "less_than_10") score += 10;
    else if (formData.q4_investment_percentage === "10_to_20") score += 20;
    else if (formData.q4_investment_percentage === "21_to_30") score += 30;
    else if (formData.q4_investment_percentage === "31_to_50") score += 40;
    else if (formData.q4_investment_percentage === "more_than_50") score += 50;

    // Q5: 對金融投資的一般態度（A=10分，B=20分，C=30分，D=40分，E=50分）
    if (formData.q5_investment_attitude === "no_volatility") score += 10;
    else if (formData.q5_investment_attitude === "small_volatility") score += 20;
    else if (formData.q5_investment_attitude === "some_volatility") score += 30;
    else if (formData.q5_investment_attitude === "large_volatility") score += 40;
    else if (formData.q5_investment_attitude === "any_volatility") score += 50;

    // Q6: 對衍生工具產品的認識（A/B/C各40分，D=0分）
    if (formData.q6_derivatives_knowledge.includes("training")) score += 40;
    if (formData.q6_derivatives_knowledge.includes("experience")) score += 40;
    if (formData.q6_derivatives_knowledge.includes("transactions")) score += 40;
    if (formData.q6_derivatives_knowledge.includes("no_knowledge")) score += 0;

    // Q7: 年齡組別（A=20分，B=30分，C=40分，D=20分，E=10分）
    if (formData.q7_age_group === "18_to_25") score += 20;
    else if (formData.q7_age_group === "26_to_35") score += 30;
    else if (formData.q7_age_group === "36_to_50") score += 40;
    else if (formData.q7_age_group === "51_to_64") score += 20;
    else if (formData.q7_age_group === "65_plus") score += 10;

    // Q8: 教育程度（A=10分，B=30分，C=50分）
    if (formData.q8_education_level === "primary_or_below") score += 10;
    else if (formData.q8_education_level === "secondary") score += 30;
    else if (formData.q8_education_level === "tertiary_or_above") score += 50;

    // Q9: 投資知識來源（A=0分，B/C/D各40分）
    if (formData.q9_investment_knowledge_sources.includes("no_interest")) score += 0;
    if (formData.q9_investment_knowledge_sources.includes("discussion")) score += 40;
    if (formData.q9_investment_knowledge_sources.includes("reading")) score += 40;
    if (formData.q9_investment_knowledge_sources.includes("research")) score += 40;

    // Q10: 流動資金需求（A=50分，B=30分，C=20分，D=10分）
    if (formData.q10_liquidity_needs === "no_need") score += 50;
    else if (formData.q10_liquidity_needs === "up_to_30") score += 30;
    else if (formData.q10_liquidity_needs === "30_to_50") score += 20;
    else if (formData.q10_liquidity_needs === "over_50") score += 10;

    // 判定風險等級（根據總分直接對應風險水平）
    let riskLevel = "";
    let riskDescription = "";
    
    if (score <= 99) {
      riskLevel = "Lowest / 最低";
      riskDescription = "You tend to prefer investments with a lowest risk of a decline in value. You are much more interested in preserving the value of your investment than receiving a return on your capital. 您倾向投資跌下降風險最低的投資。您對保存您投資值的興趣遠大於獲取您的資本回報。";
    } else if (score <= 199) {
      riskLevel = "Low / 低";
      riskDescription = "You tend to prefer investments with a low risk of a decline in value. You are more interested in preserving the value of your investment than receiving a return on your capital. 您倾向投資跌下降風險低的投資。您對保存您投資值的興趣大於獲取您的資本回報。";
    } else if (score <= 299) {
      riskLevel = "Low to Medium / 低至中等";
      riskDescription = "You tend to prefer investments with lower risk of a decline in value. However, you do recognize that in order to achieve higher returns, some risks must be incurred and you are prepared to tolerate some fluctuations and volatility in your investment. 您倾向投資跌下降風險較低的投資。然而您亦明白在您達到較高投資回報的過程中必須使一些風險，而您亦已準備接受一些投資上的波動及波幅。";
    } else if (score <= 399) {
      riskLevel = "Medium / 中等";
      riskDescription = "You are willing to place reasonable emphasis on growth investments and are aware that these are liable to fluctuate in value. You can tolerate some fluctuations and volatility, but you tend to stay away from the possibility of dramatic or frequent changes in value. 您著重投資增長的投資值的波動。您雖可以承受一些波動和變動，但您不希望看到有大波動或頁繁變動。";
    } else if (score <= 599) {
      riskLevel = "Medium to High / 中等至高";
      riskDescription = "You have an above-average tolerance to risk and are willing to accept a greater chance of decline in value for the potentially higher returns. 您對風險的承受程度較平均高並願意接受大機會的投資跌值去賺取較高的潛在回報。";
    } else {
      riskLevel = "High / 高";
      riskDescription = "You are willing, and usually eager, to accept a greater chance of a decline in value for potentially higher returns. 您願意並通常渴望接受大機會的投資跌值去賺取較高的潛在回報。";
    }

    return { totalScore: score, riskLevel, riskDescription };
  };

  // 驗證表單
  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};