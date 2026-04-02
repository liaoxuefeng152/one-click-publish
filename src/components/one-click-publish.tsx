'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { 
  Loader2, Zap, CheckCircle, AlertCircle, Clock, 
  Languages, Image, DollarSign, Send 
} from 'lucide-react';

interface OneClickPublishProps {
  productId: string;
  productTitle: string;
  onComplete?: () => void;
}

interface PipelineStep {
  step: string;
  status: string;
  duration?: number;
  error?: string;
}

export default function OneClickPublish({ productId, productTitle, onComplete }: OneClickPublishProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [error, setError] = useState('');

  const [config, setConfig] = useState({
    shopId: '',
    targetLanguage: 'en',
    processImages: true,
    autoPublish: false,
  });

  const [shops, setShops] = useState<any[]>([]);
  const [isLoadingShops, setIsLoadingShops] = useState(false);

  // 加载店铺列表
  const loadShops = async () => {
    setIsLoadingShops(true);
    try {
      const response = await fetch('/api/shops');
      const data = await response.json();
      if (response.ok) {
        setShops(data.shops || []);
        if (data.shops?.length > 0) {
          setConfig(prev => ({ ...prev, shopId: data.shops[0].id }));
        }
      }
    } catch (err) {
      console.error('加载店铺失败:', err);
    } finally {
      setIsLoadingShops(false);
    }
  };

  // 执行一键上架
  const executePipeline = async () => {
    if (!config.shopId) {
      setError('请选择目标店铺');
      return;
    }

    setIsProcessing(true);
    setError('');
    setResult(null);

    try {
      const response = await fetch('/api/automation/pipeline', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          productId,
          ...config,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || '自动化流程失败');
      }

      setResult(data);

      if (data.success && onComplete) {
        setTimeout(onComplete, 2000);
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsProcessing(false);
    }
  };

  const getStepIcon = (step: string) => {
    switch (step) {
      case 'translate': return <Languages className="h-4 w-4" />;
      case 'image_processing': return <Image className="h-4 w-4" />;
      case 'pricing': return <DollarSign className="h-4 w-4" />;
      case 'publish': return <Send className="h-4 w-4" />;
      default: return <CheckCircle className="h-4 w-4" />;
    }
  };

  const getStepLabel = (step: string) => {
    const labels: Record<string, string> = {
      translate: '翻译商品信息',
      image_processing: '处理商品图片',
      pricing: '智能定价',
      publish: '发布到平台',
    };
    return labels[step] || step;
  };

  if (!isOpen) {
    return (
      <Button
        onClick={() => {
          setIsOpen(true);
          loadShops();
        }}
        className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700"
      >
        <Zap className="mr-2 h-4 w-4" />
        一键上架
      </Button>
    );
  }

  return (
    <Card className="w-full max-w-2xl mx-auto">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Zap className="h-5 w-5 text-blue-600" />
          全自动上架流程
        </CardTitle>
        <CardDescription>
          商品: {productTitle.substring(0, 50)}...
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* 错误提示 */}
        {error && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {/* 处理结果 */}
        {result && (
          <div className="space-y-4">
            <div className="flex items-center justify-between p-4 bg-green-50 rounded-lg">
              <div className="flex items-center gap-2">
                <CheckCircle className="h-6 w-6 text-green-600" />
                <div>
                  <p className="font-medium text-green-900">处理完成</p>
                  <p className="text-sm text-green-700">总耗时: {result.totalDuration}</p>
                </div>
              </div>
              <Badge variant="default" className="bg-green-600">
                成功率 {result.summary.successRate}
              </Badge>
            </div>

            {/* 步骤详情 */}
            <div className="space-y-2">
              {result.pipelineResults.map((step: PipelineStep, index: number) => (
                <div
                  key={index}
                  className={`flex items-center justify-between p-3 rounded-lg ${
                    step.status === 'completed' ? 'bg-green-50' :
                    step.status === 'failed' ? 'bg-red-50' :
                    step.status === 'skipped' ? 'bg-slate-50' : 'bg-blue-50'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    {getStepIcon(step.step)}
                    <span className="font-medium">{getStepLabel(step.step)}</span>
                  </div>
                  <div className="flex items-center gap-3">
                    {step.duration && (
                      <span className="text-sm text-slate-500">{(step.duration / 1000).toFixed(1)}秒</span>
                    )}
                    <Badge variant={
                      step.status === 'completed' ? 'default' :
                      step.status === 'failed' ? 'destructive' : 'secondary'
                    }>
                      {step.status === 'completed' ? '完成' :
                       step.status === 'failed' ? '失败' :
                       step.status === 'skipped' ? '跳过' : '处理中'}
                    </Badge>
                  </div>
                </div>
              ))}
            </div>

            {/* 性能指标 */}
            {result.meetsPerformanceTarget && (
              <div className="flex items-center gap-2 text-green-600 text-sm">
                <Clock className="h-4 w-4" />
                达到性能目标 (≤90秒)
              </div>
            )}

            <Button onClick={() => setIsOpen(false)} className="w-full">
              关闭
            </Button>
          </div>
        )}

        {/* 配置表单 */}
        {!result && !isProcessing && (
          <>
            <div className="grid gap-4">
              <div>
                <label className="text-sm font-medium">目标店铺 *</label>
                <Select 
                  value={config.shopId} 
                  onValueChange={(value) => setConfig(prev => ({ ...prev, shopId: value }))}
                >
                  <SelectTrigger className="mt-1">
                    <SelectValue placeholder="选择店铺" />
                  </SelectTrigger>
                  <SelectContent>
                    {shops.map((shop) => (
                      <SelectItem key={shop.id} value={shop.id}>
                        <div className="flex items-center gap-2">
                          <span>{shop.shop_name}</span>
                          <Badge variant="outline">{shop.platform}</Badge>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {shops.length === 0 && !isLoadingShops && (
                  <p className="text-sm text-yellow-600 mt-1">
                    暂无授权店铺，请先授权店铺
                  </p>
                )}
              </div>

              <div>
                <label className="text-sm font-medium">目标语言</label>
                <Select 
                  value={config.targetLanguage} 
                  onValueChange={(value) => setConfig(prev => ({ ...prev, targetLanguage: value }))}
                >
                  <SelectTrigger className="mt-1">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="en">英语 (English)</SelectItem>
                    <SelectItem value="th">泰语 (ไทย)</SelectItem>
                    <SelectItem value="vi">越南语 (Tiếng Việt)</SelectItem>
                    <SelectItem value="id">印尼语 (Bahasa Indonesia)</SelectItem>
                    <SelectItem value="ms">马来语 (Bahasa Melayu)</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <label className="text-sm font-medium">处理商品图片</label>
                  <p className="text-xs text-slate-500">OCR识别、翻译图片文字</p>
                </div>
                <input
                  type="checkbox"
                  checked={config.processImages}
                  onChange={(e) => setConfig(prev => ({ ...prev, processImages: e.target.checked }))}
                  className="h-4 w-4"
                />
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <label className="text-sm font-medium">自动发布</label>
                  <p className="text-xs text-slate-500">处理完成后自动发布到平台</p>
                </div>
                <input
                  type="checkbox"
                  checked={config.autoPublish}
                  onChange={(e) => setConfig(prev => ({ ...prev, autoPublish: e.target.checked }))}
                  className="h-4 w-4"
                />
              </div>
            </div>

            <div className="flex gap-3">
              <Button
                onClick={executePipeline}
                disabled={!config.shopId || shops.length === 0}
                className="flex-1 bg-gradient-to-r from-blue-600 to-purple-600"
              >
                <Zap className="mr-2 h-4 w-4" />
                开始自动化
              </Button>
              <Button
                variant="outline"
                onClick={() => setIsOpen(false)}
              >
                取消
              </Button>
            </div>
          </>
        )}

        {/* 处理中状态 */}
        {isProcessing && (
          <div className="flex flex-col items-center justify-center py-8">
            <Loader2 className="h-12 w-12 animate-spin text-blue-600 mb-4" />
            <p className="font-medium">自动化处理中...</p>
            <p className="text-sm text-slate-500 mt-2">
              正在执行: 翻译 → 图片处理 → 定价 → 发布
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
