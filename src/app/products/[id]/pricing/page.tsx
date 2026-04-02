'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Loader2, DollarSign, Calculator, ArrowRight, Save } from 'lucide-react';

interface Product {
  id: string;
  original_title: string;
  translated_title: string;
  original_price: number;
  cost_price: number;
  selling_price: number;
  target_language: string;
}

interface PricingRule {
  id: string;
  name: string;
  currency: string;
  exchange_rate: number;
  profit_margin: number;
  platform_fee_rate: number;
  shipping_cost: number;
  cross_border_shipping: number;
  is_default: boolean;
}

interface PricingResult {
  costPrice: number;
  shippingCost: number;
  crossBorderShipping: number;
  exchangeRate: number;
  profitMargin: number;
  platformFeeRate: number;
  sellingPrice: number;
  currency: string;
}

export default function PricingPage() {
  const params = useParams();
  const router = useRouter();
  const productId = params.id as string;

  const [product, setProduct] = useState<Product | null>(null);
  const [pricingRules, setPricingRules] = useState<PricingRule[]>([]);
  const [selectedRule, setSelectedRule] = useState<string>('');
  const [pricing, setPricing] = useState<PricingResult | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isCalculating, setIsCalculating] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState('');

  // 手动调整值
  const [manualPrice, setManualPrice] = useState<string>('');

  useEffect(() => {
    fetchData();
  }, [productId]);

  const fetchData = async () => {
    try {
      const [productRes, rulesRes] = await Promise.all([
        fetch(`/api/products/${productId}`),
        fetch('/api/pricing-rules'),
      ]);

      const productData = await productRes.json();
      const rulesData = await rulesRes.json();

      if (!productRes.ok) {
        throw new Error(productData.error || '获取商品失败');
      }

      setProduct(productData.product);
      setPricingRules(rulesData.rules || []);

      if (rulesData.rules?.length > 0) {
        const defaultRule = rulesData.rules.find((r: PricingRule) => r.is_default);
        setSelectedRule(defaultRule?.id || rulesData.rules[0].id);
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCalculate = async () => {
    setIsCalculating(true);
    setError('');

    try {
      const response = await fetch('/api/pricing/calculate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ productId, pricingRuleId: selectedRule || undefined }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || '计算失败');
      }

      setPricing(data.pricing);
      setManualPrice(data.pricing.sellingPrice.toString());
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsCalculating(false);
    }
  };

  const handleSave = async () => {
    setIsSaving(true);
    setError('');

    try {
      const response = await fetch(`/api/products/${productId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ selling_price: parseFloat(manualPrice) || 0 }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || '保存失败');
      }

      router.push(`/products/${productId}/publish`);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsSaving(false);
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
        <h1 className="text-3xl font-bold">智能定价</h1>
        <p className="text-slate-500 mt-1">设置商品售价，支持自动计算和手动调整</p>
      </div>

      {error && (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      <div className="grid gap-6 lg:grid-cols-2">
        {/* 商品信息 */}
        <Card>
          <CardHeader>
            <CardTitle>商品信息</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <label className="text-sm font-medium text-slate-500">商品标题</label>
              <p className="mt-1 font-medium">{product.translated_title || product.original_title}</p>
            </div>
            <div>
              <label className="text-sm font-medium text-slate-500">成本价 (CNY)</label>
              <p className="mt-1 text-xl font-bold text-red-600">¥{product.original_price || product.cost_price || '未设置'}</p>
            </div>
          </CardContent>
        </Card>

        {/* 定价设置 */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calculator className="h-5 w-5" />
              定价规则
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <label className="text-sm font-medium">选择定价规则</label>
              <Select value={selectedRule} onValueChange={setSelectedRule}>
                <SelectTrigger className="mt-1">
                  <SelectValue placeholder="选择定价规则" />
                </SelectTrigger>
                <SelectContent>
                  {pricingRules.map((rule) => (
                    <SelectItem key={rule.id} value={rule.id}>
                      {rule.name} ({rule.currency})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <Button onClick={handleCalculate} disabled={isCalculating} className="w-full">
              {isCalculating ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  计算中...
                </>
              ) : (
                <>
                  <Calculator className="mr-2 h-4 w-4" />
                  自动计算售价
                </>
              )}
            </Button>
          </CardContent>
        </Card>
      </div>

      {/* 定价结果 */}
      {pricing && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <DollarSign className="h-5 w-5" />
              定价明细
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
              <div className="p-4 bg-slate-50 rounded-lg">
                <p className="text-sm text-slate-500">成本价</p>
                <p className="text-lg font-bold">¥{pricing.costPrice}</p>
              </div>
              <div className="p-4 bg-slate-50 rounded-lg">
                <p className="text-sm text-slate-500">国内运费</p>
                <p className="text-lg font-bold">¥{pricing.shippingCost}</p>
              </div>
              <div className="p-4 bg-slate-50 rounded-lg">
                <p className="text-sm text-slate-500">跨境运费</p>
                <p className="text-lg font-bold">{pricing.crossBorderShipping} {pricing.currency}</p>
              </div>
              <div className="p-4 bg-slate-50 rounded-lg">
                <p className="text-sm text-slate-500">汇率</p>
                <p className="text-lg font-bold">{pricing.exchangeRate}</p>
              </div>
              <div className="p-4 bg-slate-50 rounded-lg">
                <p className="text-sm text-slate-500">利润率</p>
                <p className="text-lg font-bold">{pricing.profitMargin}%</p>
              </div>
              <div className="p-4 bg-slate-50 rounded-lg">
                <p className="text-sm text-slate-500">平台佣金</p>
                <p className="text-lg font-bold">{pricing.platformFeeRate}%</p>
              </div>
            </div>

            <div className="mt-6 p-4 bg-blue-50 rounded-lg border border-blue-200">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-blue-600">建议售价</p>
                  <p className="text-2xl font-bold text-blue-700">
                    {pricing.sellingPrice} {pricing.currency}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <Input
                    type="number"
                    value={manualPrice}
                    onChange={(e) => setManualPrice(e.target.value)}
                    className="w-32"
                  />
                  <span className="text-slate-500">{pricing.currency}</span>
                </div>
              </div>
            </div>

            <div className="flex gap-3 mt-6">
              <Button onClick={handleSave} disabled={isSaving}>
                {isSaving ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    保存中...
                  </>
                ) : (
                  <>
                    <Save className="mr-2 h-4 w-4" />
                    保存并发布
                  </>
                )}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
