import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { ChevronLeft, ChevronRight, FileText } from "lucide-react";
import { useLocation } from "wouter";

interface Step {
  id: number;
  title: string;
  description: string;
}

const steps: Step[] = [
  { id: 1, title: "客戶類型", description: "選擇客戶類型" },
  { id: 2, title: "賬戶類型", description: "選擇賬戶類型" },
  { id: 3, title: "個人基本信息", description: "填寫基本資料" },
  { id: 4, title: "個人詳細信息", description: "填寫詳細資料" },
  { id: 5, title: "職業信息", description: "填寫職業狀況" },
  { id: 6, title: "就業詳情", description: "填寫收入資產" },
  { id: 7, title: "財務與投資", description: "填寫投資信息" },
  { id: 8, title: "風險評估問卷", description: "完成風險評估" },
  { id: 9, title: "銀行賬戶", description: "添加銀行賬戶" },
  { id: 10, title: "稅務信息", description: "填寫稅務資料" },
  { id: 11, title: "文件上傳", description: "上傳證明文件" },
  { id: 12, title: "人臉識別", description: "進行人臉驗證" },
  { id: 13, title: "監管聲明", description: "簽署協議" },
];

interface ApplicationWizardProps {
  applicationId: number;
  currentStep: number;
  children: ReactNode;
  onNext?: () => void;
  onPrevious?: () => void;
  onSave?: () => void;
  isNextDisabled?: boolean;
  isNextLoading?: boolean;
  isSaveLoading?: boolean;
  hideNext?: boolean;
  hidePrevious?: boolean;
  nextLabel?: string;
  showReturnToPreview?: boolean;
}

export default function ApplicationWizard({
  applicationId,
  currentStep,
  children,
  onNext,
  onPrevious,
  onSave,
  isNextDisabled = false,
  isNextLoading = false,
  isSaveLoading = false,
  hideNext = false,
  hidePrevious = false,
  nextLabel = "下一步",
  showReturnToPreview = false,
}: ApplicationWizardProps) {
  const [, setLocation] = useLocation();
  const progress = (currentStep / steps.length) * 100;
  const currentStepInfo = steps.find(s => s.id === currentStep);

  const handlePrevious = () => {
    if (onPrevious) {
      onPrevious();
    } else if (currentStep > 1) {
      setLocation(`/application/${applicationId}/step/${currentStep - 1}`);
    }
  };

  const handleNext = () => {
    if (onNext) {
      onNext();
    } else if (currentStep < steps.length) {
      setLocation(`/application/${applicationId}/step/${currentStep + 1}`);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-blue-50 to-white">
      {/* Header */}
      <header className="border-b bg-white/80 backdrop-blur-sm sticky top-0 z-50">
        <div className="container py-4">
          <div className="flex items-center justify-between mb-4">
            <a href="/" className="flex items-center">
              <img src="/logo-zh.png" alt="誠港金融" className="h-12" />
            </a>
            <Button
              variant="ghost"
              onClick={() => setLocation("/applications")}
            >
              返回申請列表
            </Button>
          </div>
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span className="font-medium">
                步驟 {currentStep} / {steps.length}: {currentStepInfo?.title}