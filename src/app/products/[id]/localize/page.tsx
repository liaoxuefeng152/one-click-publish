'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Progress } from '@/components/ui/progress';
import { Checkbox } from '@/components/ui/checkbox';
import { 
  Loader2, Globe, Image as ImageIcon, Save, Languages, 
  ZoomIn, Crop, Droplets, Sparkles, CheckCircle, AlertCircle,
  Wand2, Download
} from 'lucide-react';

interface Product {
  id: string;
  original_title: string;
  original_description: string;
  original_price: number;
  original_images: string[];
  translated_title: string;
  translated_description: string;
  target_language: string;
  status: string;
}

interface ImageProcessResult {
  ocr?: {
    texts: Array<{ content: string; position: string; type: string }>;
    fullText: string;
  };
  translation?: {
    originalTexts: string[];
    translatedTexts: string[];
    fullTranslatedText: string;
  };
  watermark?: {
    hasWatermark: boolean;
    watermarks: Array<{ type: string; position: string; description: string }>;
  };
  quality?: {
    clarity: string;
    suggestedSize: string;
    issues: string[];
  };
}

interface ProcessedImage {
  originalUrl: string;
  processedUrl?: string;
  fileKey?: string;
  processResult?: ImageProcessResult;
  status: 'pending' | 'processing' | 'completed' | 'failed';
}

export default function LocalizePage() {
  const params = useParams();
  const router = useRouter();
  const productId = params.id as string;

  const [product, setProduct] = useState<Product | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isTranslating, setIsTranslating] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState('');
  const [targetLanguage, setTargetLanguage] = useState('en');
  const [translatedTitle, setTranslatedTitle] = useState('');
  const [translatedDescription, setTranslatedDescription] = useState('');

  // 图片处理相关状态
  const [processedImages, setProcessedImages] = useState<ProcessedImage[]>([]);
  const [selectedImageIndex, setSelectedImageIndex] = useState(0);
  const [isProcessingImages, setIsProcessingImages] = useState(false);
  const [imageProcessProgress, setImageProcessProgress] = useState(0);
  
  // 图片处理选项
  const [processOptions, setProcessOptions] = useState({
    ocr: true,
    translateText: true,
    removeWatermark: false,
    resize: true,
    targetPlatform: 'tiktok',
    addWatermark: false,
    watermarkText: '',
  });

  useEffect(() => {
    fetchProduct();
  }, [productId]);

  const fetchProduct = async () => {
    try {
      const response = await fetch(`/api/products/${productId}`);
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || '获取商品失败');
      }

      setProduct(data.product);
      setTranslatedTitle(data.product.translated_title || '');
      setTranslatedDescription(data.product.translated_description || '');
      setTargetLanguage(data.product.target_language || 'en');

      // 初始化图片处理状态
      if (data.product.original_images && data.product.original_images.length > 0) {
        setProcessedImages(
          data.product.original_images.map((url: string) => ({
            originalUrl: url,
            status: 'pending' as const,
          }))
        );
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleTranslate = async () => {
    setIsTranslating(true);
    setError('');

    try {
      const response = await fetch('/api/translate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ productId, targetLanguage }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || '翻译失败');
      }

      setTranslatedTitle(data.translatedTitle);
      setTranslatedDescription(data.translatedDescription);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsTranslating(false);
    }
  };

  const handleSave = async () => {
    setIsSaving(true);
    setError('');

    try {
      // 更新商品信息
      const response = await fetch(`/api/products/${productId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          translated_title: translatedTitle,
          translated_description: translatedDescription,
          target_language: targetLanguage,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || '保存失败');
      }

      router.push(`/products/${productId}/pricing`);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsSaving(false);
    }
  };

  // 处理单张图片
  const processSingleImage = async (imageUrl: string, index: number) => {
    try {
      setProcessedImages(prev => 
        prev.map((img, i) => 
          i === index ? { ...img, status: 'processing' } : img
        )
      );

      // 综合处理：OCR + 翻译 + 水印检测
      const processResponse = await fetch('/api/image-process', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'process-all',
          imageUrl,
          targetLanguage,
          productId,
        }),
      });

      const processData = await processResponse.json();

      if (!processResponse.ok || !processData.success) {
        throw new Error(processData.error || '图片处理失败');
      }

      let processedUrl = imageUrl;
      let fileKey = '';

      // 如果需要去水印或调整尺寸
      if (processOptions.removeWatermark || processOptions.resize) {
        const editResponse = await fetch('/api/image-edit', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            action: processOptions.removeWatermark ? 'remove-watermark' : 'resize',
            imageUrl,
            options: processOptions.removeWatermark 
              ? { regions: processData.processResult?.watermark?.watermarks }
              : { platform: processOptions.targetPlatform },
          }),
        });

        const editData = await editResponse.json();

        if (editResponse.ok && editData.success) {
          processedUrl = editData.processedUrl;
          fileKey = editData.fileKey;
        }
      }

      // 如果需要添加水印
      if (processOptions.addWatermark && processOptions.watermarkText) {
        const watermarkResponse = await fetch('/api/image-edit', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            action: 'add-watermark',
            imageUrl: processedUrl,
            options: {
              text: processOptions.watermarkText,
              position: 'bottom-right',
              opacity: 0.3,
            },
          }),
        });

        const watermarkData = await watermarkResponse.json();

        if (watermarkResponse.ok && watermarkData.success) {
          processedUrl = watermarkData.processedUrl;
          fileKey = watermarkData.fileKey;
        }
      }

      setProcessedImages(prev => 
        prev.map((img, i) => 
          i === index 
            ? { 
                ...img, 
                status: 'completed',
                processedUrl,
                fileKey,
                processResult: processData.processResult,
              } 
            : img
        )
      );
    } catch (err: any) {
      console.error(`图片 ${index + 1} 处理失败:`, err);
      setProcessedImages(prev => 
        prev.map((img, i) => 
          i === index ? { ...img, status: 'failed' } : img
        )
      );
    }
  };

  // 处理所有图片
  const handleProcessAllImages = async () => {
    setIsProcessingImages(true);
    setImageProcessProgress(0);

    const totalImages = processedImages.length;
    let completedCount = 0;

    for (let i = 0; i < processedImages.length; i++) {
      if (processedImages[i].status === 'pending') {
        await processSingleImage(processedImages[i].originalUrl, i);
      }
      completedCount++;
      setImageProcessProgress((completedCount / totalImages) * 100);
    }

    setIsProcessingImages(false);
  };

  // 批量应用OCR翻译到商品描述
  const applyOCRTranslations = () => {
    const allTranslatedTexts: string[] = [];
    
    processedImages.forEach(img => {
      if (img.processResult?.translation?.translatedTexts) {
        allTranslatedTexts.push(...img.processResult.translation.translatedTexts);
      }
    });

    if (allTranslatedTexts.length > 0) {
      setTranslatedDescription(prev => 
        prev + '\n\n' + allTranslatedTexts.join('\n')
      );
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
      </div>
    );
  }

  if (!product) {
    return (
      <Alert variant="destructive">
        <AlertDescription>商品不存在</AlertDescription>
      </Alert>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">本地化处理</h1>
        <p className="text-slate-500 mt-1">翻译商品标题和描述，智能处理商品图片</p>
      </div>

      {error && (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      <Tabs defaultValue="text" className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="text">文本翻译</TabsTrigger>
          <TabsTrigger value="image">
            图片处理
            {processedImages.some(img => img.status === 'completed') && (
              <Badge className="ml-2 bg-green-500">
                {processedImages.filter(img => img.status === 'completed').length}/{processedImages.length}
              </Badge>
            )}
          </TabsTrigger>
        </TabsList>

        {/* 文本翻译 */}
        <TabsContent value="text" className="space-y-6">
          <div className="grid gap-6 lg:grid-cols-2">
            {/* 原始商品信息 */}
            <Card>
              <CardHeader>
                <CardTitle>原始商品信息</CardTitle>
                <CardDescription>从1688采集的原始数据</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* 商品图片预览 */}
                {product.original_images && product.original_images.length > 0 && (
                  <div>
                    <label className="text-sm font-medium text-slate-500">商品图片</label>
                    <div className="flex gap-2 mt-2 overflow-x-auto pb-2">
                      {product.original_images.map((img, index) => (
                        <img
                          key={index}
                          src={img}
                          alt={`商品图片 ${index + 1}`}
                          className="h-20 w-20 rounded-lg object-cover border cursor-pointer hover:opacity-80"
                          onClick={() => {
                            setSelectedImageIndex(index);
                            // 切换到图片处理标签
                          }}
                        />
                      ))}
                    </div>
                  </div>
                )}

                <div>
                  <label className="text-sm font-medium text-slate-500">原始标题</label>
                  <p className="mt-1 font-medium">{product.original_title}</p>
                </div>

                {product.original_description && (
                  <div>
                    <label className="text-sm font-medium text-slate-500">原始描述</label>
                    <div className="mt-1 p-3 bg-slate-50 rounded-lg text-sm max-h-[200px] overflow-y-auto">
                      {product.original_description}
                    </div>
                  </div>
                )}

                {product.original_price && (
                  <div>
                    <label className="text-sm font-medium text-slate-500">成本价</label>
                    <p className="mt-1 text-xl font-bold text-red-600">¥{product.original_price}</p>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* 本地化处理 */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Globe className="h-5 w-5" />
                  本地化设置
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <label className="text-sm font-medium">目标语言</label>
                  <Select value={targetLanguage} onValueChange={setTargetLanguage}>
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

                <Button 
                  onClick={handleTranslate} 
                  disabled={isTranslating}
                  className="w-full"
                >
                  {isTranslating ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      翻译中...
                    </>
                  ) : (
                    <>
                      <Languages className="mr-2 h-4 w-4" />
                      自动翻译
                    </>
                  )}
                </Button>

                <div>
                  <label className="text-sm font-medium">翻译后标题</label>
                  <Input
                    value={translatedTitle}
                    onChange={(e) => setTranslatedTitle(e.target.value)}
                    placeholder="翻译后的商品标题"
                    className="mt-1"
                  />
                </div>

                <div>
                  <label className="text-sm font-medium">翻译后描述</label>
                  <Textarea
                    value={translatedDescription}
                    onChange={(e) => setTranslatedDescription(e.target.value)}
                    placeholder="翻译后的商品描述"
                    className="mt-1 min-h-[150px]"
                  />
                </div>

                <div className="flex gap-3 pt-2">
                  <Button onClick={handleSave} disabled={isSaving}>
                    {isSaving ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        保存中...
                      </>
                    ) : (
                      <>
                        <Save className="mr-2 h-4 w-4" />
                        保存并继续
                      </>
                    )}
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* 图片处理 */}
        <TabsContent value="image" className="space-y-6">
          {/* 处理选项 */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Wand2 className="h-5 w-5" />
                智能处理选项
              </CardTitle>
              <CardDescription>选择要应用的图片处理功能</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="ocr"
                    checked={processOptions.ocr}
                    onCheckedChange={(checked) => 
                      setProcessOptions(prev => ({ ...prev, ocr: checked as boolean }))
                    }
                  />
                  <label htmlFor="ocr" className="text-sm font-medium flex items-center gap-2">
                    <ZoomIn className="h-4 w-4" />
                    OCR文字识别
                  </label>
                </div>

                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="translateText"
                    checked={processOptions.translateText}
                    onCheckedChange={(checked) => 
                      setProcessOptions(prev => ({ ...prev, translateText: checked as boolean }))
                    }
                  />
                  <label htmlFor="translateText" className="text-sm font-medium flex items-center gap-2">
                    <Languages className="h-4 w-4" />
                    文字翻译
                  </label>
                </div>

                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="removeWatermark"
                    checked={processOptions.removeWatermark}
                    onCheckedChange={(checked) => 
                      setProcessOptions(prev => ({ ...prev, removeWatermark: checked as boolean }))
                    }
                  />
                  <label htmlFor="removeWatermark" className="text-sm font-medium flex items-center gap-2">
                    <Droplets className="h-4 w-4" />
                    去水印
                  </label>
                </div>

                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="resize"
                    checked={processOptions.resize}
                    onCheckedChange={(checked) => 
                      setProcessOptions(prev => ({ ...prev, resize: checked as boolean }))
                    }
                  />
                  <label htmlFor="resize" className="text-sm font-medium flex items-center gap-2">
                    <Crop className="h-4 w-4" />
                    调整尺寸
                  </label>
                </div>

                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="addWatermark"
                    checked={processOptions.addWatermark}
                    onCheckedChange={(checked) => 
                      setProcessOptions(prev => ({ ...prev, addWatermark: checked as boolean }))
                    }
                  />
                  <label htmlFor="addWatermark" className="text-sm font-medium flex items-center gap-2">
                    <Sparkles className="h-4 w-4" />
                    添加水印
                  </label>
                </div>
              </div>

              {(processOptions.resize || processOptions.addWatermark) && (
                <div className="grid grid-cols-2 gap-4 mt-4">
                  {processOptions.resize && (
                    <div>
                      <label className="text-sm font-medium">目标平台</label>
                      <Select 
                        value={processOptions.targetPlatform} 
                        onValueChange={(value) => 
                          setProcessOptions(prev => ({ ...prev, targetPlatform: value }))
                        }
                      >
                        <SelectTrigger className="mt-1">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="tiktok">TikTok Shop (800x800)</SelectItem>
                          <SelectItem value="shopee">Shopee (800x800)</SelectItem>
                          <SelectItem value="lazada">Lazada (800x800)</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  )}

                  {processOptions.addWatermark && (
                    <div>
                      <label className="text-sm font-medium">水印文字</label>
                      <Input
                        value={processOptions.watermarkText}
                        onChange={(e) => 
                          setProcessOptions(prev => ({ ...prev, watermarkText: e.target.value }))
                        }
                        placeholder="输入水印文字"
                        className="mt-1"
                      />
                    </div>
                  )}
                </div>
              )}

              <div className="flex gap-3 pt-2">
                <Button 
                  onClick={handleProcessAllImages} 
                  disabled={isProcessingImages || processedImages.length === 0}
                  className="flex-1"
                >
                  {isProcessingImages ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      处理中...
                    </>
                  ) : (
                    <>
                      <Wand2 className="mr-2 h-4 w-4" />
                      一键处理所有图片
                    </>
                  )}
                </Button>

                {processedImages.some(img => img.processResult?.translation?.translatedTexts && img.processResult.translation.translatedTexts.length > 0) && (
                  <Button 
                    variant="outline"
                    onClick={applyOCRTranslations}
                  >
                    <Download className="mr-2 h-4 w-4" />
                    应用OCR翻译
                  </Button>
                )}
              </div>

              {isProcessingImages && (
                <div className="mt-4">
                  <div className="flex justify-between text-sm mb-2">
                    <span>处理进度</span>
                    <span>{Math.round(imageProcessProgress)}%</span>
                  </div>
                  <Progress value={imageProcessProgress} />
                </div>
              )}
            </CardContent>
          </Card>

          {/* 图片列表 */}
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {processedImages.map((img, index) => (
              <Card key={index} className={`overflow-hidden ${selectedImageIndex === index ? 'ring-2 ring-blue-500' : ''}`}>
                <div className="relative aspect-square">
                  <img
                    src={img.processedUrl || img.originalUrl}
                    alt={`图片 ${index + 1}`}
                    className="w-full h-full object-cover"
                  />
                  {img.status === 'processing' && (
                    <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                      <Loader2 className="h-8 w-8 animate-spin text-white" />
                    </div>
                  )}
                  {img.status === 'completed' && (
                    <div className="absolute top-2 right-2">
                      <CheckCircle className="h-6 w-6 text-green-500 bg-white rounded-full" />
                    </div>
                  )}
                  {img.status === 'failed' && (
                    <div className="absolute top-2 right-2">
                      <AlertCircle className="h-6 w-6 text-red-500 bg-white rounded-full" />
                    </div>
                  )}
                </div>
                <CardContent className="p-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">图片 {index + 1}</span>
                    <Badge variant={
                      img.status === 'completed' ? 'default' : 
                      img.status === 'failed' ? 'destructive' : 
                      img.status === 'processing' ? 'secondary' : 'outline'
                    }>
                      {img.status === 'pending' && '待处理'}
                      {img.status === 'processing' && '处理中'}
                      {img.status === 'completed' && '已完成'}
                      {img.status === 'failed' && '失败'}
                    </Badge>
                  </div>

                  {/* 显示OCR结果 */}
                  {img.processResult?.ocr?.texts && img.processResult.ocr.texts.length > 0 && (
                    <div className="mt-2 text-xs text-slate-600">
                      <p className="font-medium">识别文字:</p>
                      <p className="truncate">{img.processResult.ocr.fullText.substring(0, 50)}...</p>
                    </div>
                  )}

                  {/* 显示水印检测结果 */}
                  {img.processResult?.watermark?.hasWatermark && (
                    <div className="mt-2 text-xs text-yellow-600">
                      <p>检测到水印: {img.processResult.watermark.watermarks[0]?.type}</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>

          {/* 详细处理结果 */}
          {processedImages[selectedImageIndex]?.processResult && (
            <Card>
              <CardHeader>
                <CardTitle>处理详情 - 图片 {selectedImageIndex + 1}</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {/* OCR结果 */}
                  {processedImages[selectedImageIndex].processResult?.ocr && (
                    <div>
                      <h4 className="font-medium mb-2">OCR识别结果</h4>
                      <div className="bg-slate-50 p-3 rounded-lg text-sm">
                        <pre>{JSON.stringify(processedImages[selectedImageIndex].processResult?.ocr, null, 2)}</pre>
                      </div>
                    </div>
                  )}

                  {/* 翻译结果 */}
                  {processedImages[selectedImageIndex].processResult?.translation && (
                    <div>
                      <h4 className="font-medium mb-2">图片文字翻译</h4>
                      <div className="space-y-2">
                        {processedImages[selectedImageIndex].processResult?.translation?.originalTexts?.map((text, i) => (
                          <div key={i} className="bg-slate-50 p-3 rounded-lg">
                            <p className="text-xs text-slate-500">原文: {text}</p>
                            <p className="text-sm font-medium">
                              译文: {processedImages[selectedImageIndex].processResult?.translation?.translatedTexts?.[i]}
                            </p>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* 水印检测结果 */}
                  {processedImages[selectedImageIndex].processResult?.watermark && (
                    <div>
                      <h4 className="font-medium mb-2">水印检测</h4>
                      <div className="bg-slate-50 p-3 rounded-lg">
                        <p className="text-sm">
                          状态: {processedImages[selectedImageIndex].processResult?.watermark?.hasWatermark ? (
                            <span className="text-yellow-600">检测到水印</span>
                          ) : (
                            <span className="text-green-600">未检测到水印</span>
                          )}
                        </p>
                      </div>
                    </div>
                  )}

                  {/* 质量评估 */}
                  {processedImages[selectedImageIndex].processResult?.quality && (
                    <div>
                      <h4 className="font-medium mb-2">图片质量</h4>
                      <div className="bg-slate-50 p-3 rounded-lg text-sm">
                        <p>清晰度: {processedImages[selectedImageIndex].processResult?.quality?.clarity}</p>
                        <p>建议尺寸: {processedImages[selectedImageIndex].processResult?.quality?.suggestedSize}</p>
                        {processedImages[selectedImageIndex].processResult?.quality?.issues?.length > 0 && (
                          <div className="mt-2">
                            <p className="text-yellow-600">问题:</p>
                            <ul className="list-disc list-inside">
                              {processedImages[selectedImageIndex].processResult?.quality?.issues?.map((issue, i) => (
                                <li key={i}>{issue}</li>
                              ))}
                            </ul>
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
