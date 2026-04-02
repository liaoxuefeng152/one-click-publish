'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Slider } from '@/components/ui/slider';
import { 
  Calculator, Package, Scale, DollarSign, Percent, Globe, 
  Settings, Save, RotateCcw, CheckCircle, AlertCircle, Loader2,
  Tag, TrendingUp, ShoppingCart, Edit
} from 'lucide-react';
import { useAuth, authFetch } from '@/components/auth-provider';
import { AppLayout } from '@/components/layout';

interface PricingTemplate {
  id: string;
  name: string;
  platform: 'shopee' | 'tiktok';
  targetCurrency: string;
  platformCommissionRate: number;
  profitRate: number;
  isDefault?: boolean;
  isSystem?: boolean;
}

interface Product {
  id: string;
  original_title: string;
  original_price: number;
  weight?: number;
  packaging_weight?: number;
  packaging_cost?: number;
  original_images?: string[];
}

interface PricingResult {
  costBreakdown: {
    purchasePrice: number;
    actualPurchasePrice: number;
    discountRate: number;
    packagingCost: number;
    domesticShipping: number;
    internationalShipping: number;
    totalCostCNY: number;
  };
  feeBreakdown: {
    commission: number;
    transactionFee: number;
    paymentFee: number;
    totalFees: number;
  };
  profit: {
    amount: number;
    rate: number;
    profitRateSetting: number;
  };
  finalPrice: number;
  exchangeRate: number;
  calculationSteps: string[];
}

// 默认值
const DEFAULT_VALUES = {
  purchasePrice: 20,
  productWeight: 0.3,
  packagingWeight: 0.1,
  packagingCost: 0,
  discountRate: 60,    // 60%
  profitRate: 30,      // 30%
};

export default function PricingPage() {
  const { user, loading: authLoading } = useAuth();
  const [templates, setTemplates] = useState<PricingTemplate[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [selectedTemplate, setSelectedTemplate] = useState<string>('');
  const [selectedProduct, setSelectedProduct] = useState<string>('');
  const [isLoading, setIsLoading] = useState(true);
  const [isCalculating, setIsCalculating] = useState(false);
  
  // 计算输入
  const [purchasePrice, setPurchasePrice] = useState(DEFAULT_VALUES.purchasePrice.toString());
  const [productWeight, setProductWeight] = useState(DEFAULT_VALUES.productWeight.toString());
  const [packagingWeight, setPackagingWeight] = useState(DEFAULT_VALUES.packagingWeight.toString());
  const [packagingCost, setPackagingCost] = useState(DEFAULT_VALUES.packagingCost.toString());
  const [discountRate, setDiscountRate] = useState(DEFAULT_VALUES.discountRate); // 百分比
  const [profitRate, setProfitRate] = useState(DEFAULT_VALUES.profitRate); // 百分比
  
  // 计算结果
  const [result, setResult] = useState<PricingResult | null>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    if (user) {
      loadTemplates();
      loadProducts();
    }
  }, [user]);

  useEffect(() => {
    if (templates.length > 0 && !selectedTemplate) {
      setSelectedTemplate(templates[0].id);
    }
  }, [templates]);

  // 当选择商品时，自动填充数据
  useEffect(() => {
    if (selectedProduct && selectedProduct !== 'manual') {
      const product = products.find(p => p.id === selectedProduct);
      if (product) {
        setPurchasePrice((product.original_price || DEFAULT_VALUES.purchasePrice).toString());
        setProductWeight((product.weight || DEFAULT_VALUES.productWeight).toString());
        setPackagingWeight((product.packaging_weight || DEFAULT_VALUES.packagingWeight).toString());
        setPackagingCost((product.packaging_cost || DEFAULT_VALUES.packagingCost).toString());
      }
    }
  }, [selectedProduct, products]);

  const loadTemplates = async () => {
    try {
      const response = await authFetch('/api/pricing/templates');
      const data = await response.json();
      
      if (data.success) {
        setTemplates(data.templates);
      }
    } catch (err) {
      console.error('加载模板失败:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const loadProducts = async () => {
    try {
      const response = await authFetch('/api/products?status=draft&limit=50');
      const data = await response.json();
      
      if (data.success || data.products) {
        setProducts(data.products || []);
      }
    } catch (err) {
      console.error('加载商品失败:', err);
    }
  };

  const handleCalculate = async () => {
    setError('');
    setIsCalculating(true);
    
    try {
      const response = await authFetch('/api/pricing/calculate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          templateId: selectedTemplate,
          productId: selectedProduct !== 'manual' ? selectedProduct : null,
          purchasePrice: parseFloat(purchasePrice) || DEFAULT_VALUES.purchasePrice,
          productWeight: parseFloat(productWeight) || DEFAULT_VALUES.productWeight,
          packagingWeight: parseFloat(packagingWeight) || DEFAULT_VALUES.packagingWeight,
          packagingCost: parseFloat(packagingCost) || DEFAULT_VALUES.packagingCost,
          discountRate: discountRate / 100, // 转换为小数
          profitRate: profitRate / 100, // 转换为小数
        }),
      });
      
      const data = await response.json();
      
      if (data.success) {
        setResult(data.result);
      } else {
        setError(data.error || '计算失败');
      }
    } catch (err: any) {
      setError(err.message || '计算失败');
    } finally {
      setIsCalculating(false);
    }
  };

  // 自动计算
  useEffect(() => {
    if (selectedTemplate && purchasePrice && productWeight) {
      const timer = setTimeout(() => {
        handleCalculate();
      }, 500);
      return () => clearTimeout(timer);
    }
  }, [selectedTemplate, purchasePrice, productWeight, packagingWeight, packagingCost, discountRate, profitRate]);

  // 重置为默认值
  const handleReset = () => {
    setSelectedProduct('manual');
    setPurchasePrice(DEFAULT_VALUES.purchasePrice.toString());
    setProductWeight(DEFAULT_VALUES.productWeight.toString());
    setPackagingWeight(DEFAULT_VALUES.packagingWeight.toString());
    setPackagingCost(DEFAULT_VALUES.packagingCost.toString());
    setDiscountRate(DEFAULT_VALUES.discountRate);
    setProfitRate(DEFAULT_VALUES.profitRate);
  };

  if (authLoading || isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
      </div>
    );
  }

  const selectedTemplateInfo = templates.find(t => t.id === selectedTemplate);

  return (
    <AppLayout user={user}>
      <div className="space-y-6">
        {/* 页面标题 */}
        <div>
          <h1 className="text-3xl font-bold">定价设置</h1>
          <p className="text-slate-500 mt-1">智能定价计算，支持折扣和利润率调整</p>
        </div>

        <Tabs defaultValue="calculator" className="space-y-4">
          <TabsList>
            <TabsTrigger value="calculator">
              <Calculator className="h-4 w-4 mr-2" />
              定价计算器
            </TabsTrigger>
            <TabsTrigger value="templates">
              <Settings className="h-4 w-4 mr-2" />
              定价模板
            </TabsTrigger>
          </TabsList>

          {/* 定价计算器 */}
          <TabsContent value="calculator" className="space-y-4">
            <div className="grid gap-6 lg:grid-cols-2">
              {/* 左侧：输入 */}
              <div className="space-y-4">
                {/* 商品选择 */}
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base">商品数据来源</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="space-y-2">
                      <Label>选择商品（可选）</Label>
                      <Select value={selectedProduct} onValueChange={setSelectedProduct}>
                        <SelectTrigger>
                          <SelectValue placeholder="手动输入 / 选择已采集商品" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="manual">
                            <div className="flex items-center gap-2">
                              <Edit className="h-4 w-4" />
                              手动输入
                            </div>
                          </SelectItem>
                          {products.length > 0 && (
                            <>
                              <Separator className="my-1" />
                              {products.slice(0, 10).map(product => (
                                <SelectItem key={product.id} value={product.id}>
                                  <div className="flex items-center gap-2">
                                    <ShoppingCart className="h-4 w-4" />
                                    <span className="truncate max-w-[200px]">
                                      {product.original_title || '未命名商品'}
                                    </span>
                                    <span className="text-slate-400 text-xs">
                                      ¥{product.original_price}
                                    </span>
                                  </div>
                                </SelectItem>
                              ))}
                            </>
                          )}
                        </SelectContent>
                      </Select>
                    </div>
                  </CardContent>
                </Card>

                {/* 定价模板 */}
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base">定价模板</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    <Select value={selectedTemplate} onValueChange={setSelectedTemplate}>
                      <SelectTrigger>
                        <SelectValue placeholder="选择定价模板" />
                      </SelectTrigger>
                      <SelectContent>
                        {templates.map(template => (
                          <SelectItem key={template.id} value={template.id}>
                            <div className="flex items-center gap-2">
                              <span>{template.name}</span>
                              {template.isSystem && (
                                <Badge variant="secondary" className="text-xs">系统</Badge>
                              )}
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    {selectedTemplateInfo && (
                      <div className="flex gap-2 text-xs text-slate-500">
                        <span>货币: {selectedTemplateInfo.targetCurrency}</span>
                        <span>•</span>
                        <span>佣金: {(selectedTemplateInfo.platformCommissionRate * 100).toFixed(1)}%</span>
                      </div>
                    )}
                  </CardContent>
                </Card>

                {/* 折扣和利润率 */}
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base flex items-center gap-2">
                      <TrendingUp className="h-4 w-4" />
                      折扣与利润
                    </CardTitle>
                    <CardDescription>调整折扣率和期望利润率</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    {/* 折扣率 */}
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <Label className="flex items-center gap-2">
                          <Tag className="h-4 w-4" />
                          采购折扣
                        </Label>
                        <Badge variant="secondary" className="text-lg font-bold">
                          {discountRate}%
                        </Badge>
                      </div>
                      <Slider
                        value={[discountRate]}
                        onValueChange={([value]) => setDiscountRate(value)}
                        min={10}
                        max={100}
                        step={5}
                        className="w-full"
                      />
                      <div className="flex justify-between text-xs text-slate-400">
                        <span>10%</span>
                        <span>采购价 × {discountRate}% = 实际成本</span>
                        <span>100%</span>
                      </div>
                    </div>

                    <Separator />

                    {/* 利润率 */}
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <Label className="flex items-center gap-2">
                          <DollarSign className="h-4 w-4" />
                          期望利润率
                        </Label>
                        <Badge className="text-lg font-bold bg-green-600">
                          {profitRate}%
                        </Badge>
                      </div>
                      <Slider
                        value={[profitRate]}
                        onValueChange={([value]) => setProfitRate(value)}
                        min={5}
                        max={100}
                        step={5}
                        className="w-full"
                      />
                      <div className="flex justify-between text-xs text-slate-400">
                        <span>5%</span>
                        <span>成本 × (1 + {profitRate}%) = 基础售价</span>
                        <span>100%</span>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* 商品信息 */}
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base">商品信息</CardTitle>
                    <CardDescription>
                      {selectedProduct && selectedProduct !== 'manual' 
                        ? '数据来自已采集商品，可手动调整' 
                        : '输入商品成本和重量信息'}
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {/* 采购价格 */}
                    <div className="space-y-2">
                      <Label htmlFor="purchasePrice">
                        <div className="flex items-center gap-2">
                          <DollarSign className="h-4 w-4" />
                          采购价格 (CNY)
                        </div>
                      </Label>
                      <Input
                        id="purchasePrice"
                        type="number"
                        step="0.01"
                        value={purchasePrice}
                        onChange={(e) => setPurchasePrice(e.target.value)}
                        placeholder="输入采购价格"
                      />
                    </div>

                    {/* 商品重量 */}
                    <div className="space-y-2">
                      <Label htmlFor="productWeight">
                        <div className="flex items-center gap-2">
                          <Scale className="h-4 w-4" />
                          商品重量 (kg)
                        </div>
                      </Label>
                      <Input
                        id="productWeight"
                        type="number"
                        step="0.001"
                        value={productWeight}
                        onChange={(e) => setProductWeight(e.target.value)}
                        placeholder="输入商品重量"
                      />
                    </div>

                    {/* 包装重量 */}
                    <div className="space-y-2">
                      <Label htmlFor="packagingWeight">包装重量 (kg)</Label>
                      <Input
                        id="packagingWeight"
                        type="number"
                        step="0.001"
                        value={packagingWeight}
                        onChange={(e) => setPackagingWeight(e.target.value)}
                        placeholder="输入包装重量"
                      />
                    </div>

                    {/* 包装成本 */}
                    <div className="space-y-2">
                      <Label htmlFor="packagingCost">包装成本 (CNY)</Label>
                      <Input
                        id="packagingCost"
                        type="number"
                        step="0.01"
                        value={packagingCost}
                        onChange={(e) => setPackagingCost(e.target.value)}
                        placeholder="输入包装成本"
                      />
                    </div>

                    <Button 
                      variant="outline" 
                      size="sm" 
                      onClick={handleReset}
                      className="w-full"
                    >
                      <RotateCcw className="h-4 w-4 mr-2" />
                      重置为默认值
                    </Button>
                  </CardContent>
                </Card>
              </div>

              {/* 右侧：结果 */}
              <Card className="lg:sticky lg:top-4 lg:self-start">
                <CardHeader>
                  <CardTitle>计算结果</CardTitle>
                  <CardDescription>自动计算定价明细</CardDescription>
                </CardHeader>
                <CardContent>
                  {error && (
                    <div className="flex items-center gap-2 text-red-500 mb-4">
                      <AlertCircle className="h-4 w-4" />
                      <span>{error}</span>
                    </div>
                  )}

                  {isCalculating && !result && (
                    <div className="flex items-center justify-center py-12">
                      <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
                    </div>
                  )}

                  {result && (
                    <div className="space-y-4">
                      {/* 最终售价 */}
                      <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
                        <div className="text-sm text-blue-600">建议售价</div>
                        <div className="text-4xl font-bold text-blue-700">
                          {result.finalPrice.toFixed(2)} {selectedTemplateInfo?.targetCurrency}
                        </div>
                        <div className="text-sm text-blue-600 mt-1">
                          ≈ ¥{(result.finalPrice / result.exchangeRate).toFixed(2)} CNY
                        </div>
                      </div>

                      {/* 折扣和利润率 */}
                      <div className="grid grid-cols-2 gap-2">
                        <div className="p-3 bg-orange-50 rounded-lg border border-orange-200">
                          <div className="text-xs text-orange-600">采购折扣</div>
                          <div className="text-xl font-bold text-orange-700">
                            {result.costBreakdown.discountRate * 100}%
                          </div>
                          <div className="text-xs text-orange-600">
                            ¥{result.costBreakdown.purchasePrice} → ¥{result.costBreakdown.actualPurchasePrice.toFixed(2)}
                          </div>
                        </div>
                        <div className="p-3 bg-green-50 rounded-lg border border-green-200">
                          <div className="text-xs text-green-600">利润率</div>
                          <div className="text-xl font-bold text-green-700">
                            {result.profit.profitRateSetting * 100}%
                          </div>
                          <div className="text-xs text-green-600">
                            设置值
                          </div>
                        </div>
                      </div>

                      {/* 成本明细 */}
                      <div className="space-y-2">
                        <h4 className="font-medium text-sm text-slate-600">成本明细 (CNY)</h4>
                        <div className="space-y-1 text-sm">
                          <div className="flex justify-between">
                            <span className="text-slate-500">原采购价</span>
                            <span className="line-through text-slate-400">¥{result.costBreakdown.purchasePrice.toFixed(2)}</span>
                          </div>
                          <div className="flex justify-between text-orange-600">
                            <span>实际采购价（{result.costBreakdown.discountRate * 100}%折扣）</span>
                            <span className="font-medium">¥{result.costBreakdown.actualPurchasePrice.toFixed(2)}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-slate-500">包装成本</span>
                            <span>¥{result.costBreakdown.packagingCost.toFixed(2)}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-slate-500">国内运费</span>
                            <span>¥{result.costBreakdown.domesticShipping.toFixed(2)}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-slate-500">国际运费</span>
                            <span>¥{result.costBreakdown.internationalShipping.toFixed(2)}</span>
                          </div>
                        </div>
                        <Separator />
                        <div className="flex justify-between font-medium">
                          <span>总成本</span>
                          <span>¥{result.costBreakdown.totalCostCNY.toFixed(2)}</span>
                        </div>
                      </div>

                      {/* 费用明细 */}
                      <div className="space-y-2">
                        <h4 className="font-medium text-sm text-slate-600">
                          平台费用 ({selectedTemplateInfo?.targetCurrency})
                        </h4>
                        <div className="space-y-1 text-sm">
                          <div className="flex justify-between">
                            <span className="text-slate-500">平台佣金</span>
                            <span>{result.feeBreakdown.commission.toFixed(2)}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-slate-500">交易手续费</span>
                            <span>{result.feeBreakdown.transactionFee.toFixed(2)}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-slate-500">支付手续费</span>
                            <span>{result.feeBreakdown.paymentFee.toFixed(2)}</span>
                          </div>
                        </div>
                        <Separator />
                        <div className="flex justify-between font-medium">
                          <span>总费用</span>
                          <span>{result.feeBreakdown.totalFees.toFixed(2)}</span>
                        </div>
                      </div>

                      {/* 利润 */}
                      <div className="p-3 bg-green-50 rounded-lg border border-green-200">
                        <div className="flex justify-between items-center">
                          <div>
                            <div className="text-sm text-green-600">预计利润</div>
                            <div className="text-2xl font-bold text-green-700">
                              {result.profit.amount.toFixed(2)} {selectedTemplateInfo?.targetCurrency}
                            </div>
                          </div>
                          <Badge className="bg-green-600 text-white text-lg px-3 py-1">
                            {(result.profit.rate * 100).toFixed(1)}%
                          </Badge>
                        </div>
                      </div>

                      {/* 计算过程 */}
                      <details className="text-sm">
                        <summary className="cursor-pointer text-slate-500 hover:text-slate-700">
                          查看计算过程
                        </summary>
                        <div className="mt-2 p-3 bg-slate-50 rounded text-xs space-y-1 max-h-60 overflow-y-auto">
                          {result.calculationSteps.map((step, i) => (
                            <div key={i} className="text-slate-600">{step}</div>
                          ))}
                        </div>
                      </details>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* 定价模板 */}
          <TabsContent value="templates" className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {templates.map(template => (
                <Card key={template.id} className={template.isDefault ? 'border-blue-500' : ''}>
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-base">{template.name}</CardTitle>
                      <div className="flex gap-1">
                        {template.isSystem && (
                          <Badge variant="secondary">系统</Badge>
                        )}
                        {template.isDefault && (
                          <Badge>默认</Badge>
                        )}
                      </div>
                    </div>
                    <CardDescription>
                      {template.platform === 'shopee' ? 'Shopee' : 'TikTok Shop'} • {template.targetCurrency}
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-slate-500">平台佣金</span>
                      <span>{(template.platformCommissionRate * 100).toFixed(1)}%</span>
                    </div>
                    <Separator />
                    <div className="flex gap-2">
                      <Button 
                        variant="outline" 
                        size="sm" 
                        className="flex-1"
                        onClick={() => {
                          setSelectedTemplate(template.id);
                          document.querySelector('[value="calculator"]')?.dispatchEvent(
                            new MouseEvent('click', { bubbles: true })
                          );
                        }}
                      >
                        使用
                      </Button>
                      {!template.isSystem && (
                        <Button variant="outline" size="sm">
                          编辑
                        </Button>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))}
              
              {/* 创建新模板 */}
              <Card className="border-dashed">
                <CardContent className="flex items-center justify-center h-full min-h-[200px]">
                  <Button variant="ghost" className="h-full w-full">
                    <div className="text-center">
                      <Settings className="h-8 w-8 mx-auto mb-2 text-slate-400" />
                      <span className="text-slate-500">创建新模板</span>
                    </div>
                  </Button>
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </AppLayout>
  );
}
