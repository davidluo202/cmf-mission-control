// 新的ApplicationPDFData接口定义（扁平结构，与routers.ts完全一致）
export interface ApplicationPDFData {
  // 基本信息
  applicationNumber?: string;
  customerType?: string;
  accountType?: string;
  
  // 个人基本信息
  chineseName?: string;
  englishName?: string;
  gender?: string;
  dateOfBirth?: string | Date;
  placeOfBirth?: string;
  nationality?: string;
  
  // 个人详细信息
  idType?: string;
  idNumber?: string;
  idIssuingPlace?: string;
  idExpiryDate?: string | Date | undefined;
  idIsPermanent?: boolean;
  maritalStatus?: string;
  educationLevel?: string;
  email?: string;
  phoneCountryCode?: string;
  phoneNumber?: string;
  mobileCountryCode?: string;
  mobileNumber?: string;
  faxNo?: string | undefined;
  residentialAddress?: string;
  billingAddressType?: string;
  billingAddressOther?: string | undefined;
  preferredLanguage?: string;
  
  // 职业信息
  employmentStatus?: string;
  employerName?: string | undefined;
  employerAddress?: string | undefined;
  occupation?: string | undefined;
  officePhone?: string | undefined;
  officeFaxNo?: string | undefined;
  
  // 财务状况
  annualIncome?: string;
  netWorth?: string;
  liquidAsset?: string;
  
  // 投资信息
  investmentObjective?: string;
  investmentExperience?: string;
  
  // 银行账户
  bankAccounts?: Array<{
    bankName?: string;
    accountNumber?: string;
    accountType?: string;
  }>;
  
  // 税务信息
  taxCountry?: string;
  taxIdNumber?: string;
  
  // 风险评估问卷
  riskQuestionnaire?: {
    q1_current_investments?: string;
    q2_investment_period?: string;
    q3_price_volatility?: string;
    q4_investment_percentage?: string;
    q5_investment_attitude?: string;
    q6_derivatives_knowledge?: string;
    q7_age_group?: string;
    q8_education_level?: string;
    q9_investment_knowledge_sources?: string;
    q10_liquidity_needs?: string;
    totalScore?: number;
    riskLevel?: string;
    riskDescription?: string;
  };
  
  // 上传文件
  uploadedDocuments?: Array<{
    documentType?: string;
    fileUrl?: string;
  }>;
  
  // 人脸识别
  faceVerificationStatus?: string;
  
  // 监管声明（使用routers.ts中的字段名）
  isPEP?: boolean;
  isUSPerson?: boolean;
  hasReadAgreement?: boolean;
  acceptsETO?: boolean;
  acceptsAML?: boolean;
  acceptsRiskAssessment?: boolean;
  agreementSigned?: boolean;
  signatureDate?: string;
  signature?: string;
  
  // 审批信息
  firstApproval?: {
    approverName?: string;
    approverCeNo?: string;
    isProfessionalInvestor?: boolean;
    approvedRiskProfile?: string;
    approvalTime?: string | Date;
    comments?: string;
  };
  secondApproval?: {
    approverName?: string;
    approverCeNo?: string;
    isProfessionalInvestor?: boolean;
    approvedRiskProfile?: string;
    approvalTime?: string | Date;
    comments?: string;
  };
}
