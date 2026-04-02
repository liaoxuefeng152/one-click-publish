'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { AppLayout } from '@/components/layout';
import { Loader2, Save, DollarSign } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface User {
  id: string;
  email: string;
  name?: string;
  role: string;
}

interface PricingSettings {
  defaultProfitRate: number;
  defaultSafetyMargin: number;
  defaultCurrency: string;
  exchangeRates: Record<string, number>;
  shippingFees: Record<string, number>;
  platformCommissions: Record<string, number>;
}

export default function PricingSettingsPage() {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [settings, setSettings] = useState<PricingSettings>({
    defaultProfitRate: 1.8,
    defaultSafetyMargin: 5,
    defaultCurrency: 'THB',
    exchangeRates: { THB: 4.8, MYR: 0.65, VND: 3400, IDR: 2150, PHP: 7.8 },
    shippingFees: { TH: 15, MY: 8, VN: 10, ID: 12, PH: 10 },
    platformCommissions: { tiktok: 0.05, shopee: 0.06 },
  });
  const { toast } = useToast();

  useEffect(() => {
    fetch('/api/auth/me', { credentials: 'include' })
      .then(res => res.json())
      .then(data => {
        if (data.user) {
          setUser(data.user);
          fetchSettings();
        }
      })
      .catch(() => {})
      .finally(() => setIsLoading(false));
  }, []);

  const fetchSettings = async () => {
    try {
      const response = await fetch('/api/settings/pricing', { credentials: 'include' });
      if (response.ok) {
        const data = await response.json();
        if (data.settings) {
          setSettings(data.settings);
        }
      }
    } catch (error) {
      console.error('获取设置失败:', error);
    }
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      const response = await fetch('/api/settings/pricing', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(settings),
      });

      if (response.ok) {
        toast({
          title: '保存成功',
          description: '定价设置已更新',
        });
      } else {
        toast({
          title: '保存失败',
          description: '请稍后重试',
          variant: 'destructive',
        });
      }
    } catch (error) {
      console.error('保存失败:', error);
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
      </div>
    );
  }

  if (!user) return null;

  return (
    <AppLayout user={user}>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold">定价设置</h1>
          <p className="text-slate-500 mt-1">配置智能定价的默认参数</p>
        </div>

        {/* 利润设置 */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <DollarSign className="h-5 w-5" />
              利润设置
            </CardTitle>
            <CardDescription>设置默认利润率和安全边际</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <Label>默认利润率</Label>
                <span className="text-2xl font-bold text-blue-600">{settings.defaultProfitRate.toFixed(1)}x</span>
              </div>
              <Slider
                value={[settings.defaultProfitRate]}
                onValueChange={(value) => setSettings({ ...settings, defaultProfitRate: value[0] })}
                min={1.0}
                max={3.0}
                step={0.1}
              />
              <p className="text-xs text-slate-500">利润率范围 1.0x - 3.0x，默认 1.8x</p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="safetyMargin">默认安全边际（泰铢）</Label>
              <Input
                id="safetyMargin"
                type="number"
                value={settings.defaultSafetyMargin}
                onChange={(e) => setSettings({ ...settings, defaultSafetyMargin: parseFloat(e.target.value) || 0 })}
              />
              <p className="text-xs text-slate-500">额外添加的安全边际金额，用于覆盖价格波动</p>
            </div>

            <div className="space-y-2">
              <Label>默认目标货币</Label>
              <Select
                value={settings.defaultCurrency}
                onValueChange={(value) => setSettings({ ...settings, defaultCurrency: value })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="THB">泰铢 (THB)</SelectItem>
                  <SelectItem value="MYR">林吉特 (MYR)</SelectItem>
                  <SelectItem value="VND">越南盾 (VND)</SelectItem>
                  <SelectItem value="IDR">印尼盾 (IDR)</SelectItem>
                  <SelectItem value="PHP">菲律宾比索 (PHP)</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* 汇率设置 */}
        <Card>
          <CardHeader>
            <CardTitle>汇率设置</CardTitle>
            <CardDescription>人民币对各目标货币的汇率（可手动调整）</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              <div className="space-y-2">
                <Label>人民币 → 泰铢</Label>
                <Input
                  type="number"
                  step="0.01"
                  value={settings.exchangeRates.THB}
                  onChange={(e) => setSettings({
                    ...settings,
                    exchangeRates: { ...settings.exchangeRates, THB: parseFloat(e.target.value) || 0 }
                  })}
                />
              </div>
              <div className="space-y-2">
                <Label>人民币 → 林吉特</Label>
                <Input
                  type="number"
                  step="0.01"
                  value={settings.exchangeRates.MYR}
                  onChange={(e) => setSettings({
                    ...settings,
                    exchangeRates: { ...settings.exchangeRates, MYR: parseFloat(e.target.value) || 0 }
                  })}
                />
              </div>
              <div className="space-y-2">
                <Label>人民币 → 越南盾</Label>
                <Input
                  type="number"
                  value={settings.exchangeRates.VND}
                  onChange={(e) => setSettings({
                    ...settings,
                    exchangeRates: { ...settings.exchangeRates, VND: parseFloat(e.target.value) || 0 }
                  })}
                />
              </div>
              <div className="space-y-2">
                <Label>人民币 → 印尼盾</Label>
                <Input
                  type="number"
                  value={settings.exchangeRates.IDR}
                  onChange={(e) => setSettings({
                    ...settings,
                    exchangeRates: { ...settings.exchangeRates, IDR: parseFloat(e.target.value) || 0 }
                  })}
                />
              </div>
              <div className="space-y-2">
                <Label>人民币 → 菲律宾比索</Label>
                <Input
                  type="number"
                  step="0.01"
                  value={settings.exchangeRates.PHP}
                  onChange={(e) => setSettings({
                    ...settings,
                    exchangeRates: { ...settings.exchangeRates, PHP: parseFloat(e.target.value) || 0 }
                  })}
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* 物流费用 */}
        <Card>
          <CardHeader>
            <CardTitle>跨境物流费</CardTitle>
            <CardDescription>各国家/地区默认物流费用（人民币）</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              <div className="space-y-2">
                <Label>泰国</Label>
                <Input
                  type="number"
                  value={settings.shippingFees.TH}
                  onChange={(e) => setSettings({
                    ...settings,
                    shippingFees: { ...settings.shippingFees, TH: parseFloat(e.target.value) || 0 }
                  })}
                />
              </div>
              <div className="space-y-2">
                <Label>马来西亚</Label>
                <Input
                  type="number"
                  value={settings.shippingFees.MY}
                  onChange={(e) => setSettings({
                    ...settings,
                    shippingFees: { ...settings.shippingFees, MY: parseFloat(e.target.value) || 0 }
                  })}
                />
              </div>
              <div className="space-y-2">
                <Label>越南</Label>
                <Input
                  type="number"
                  value={settings.shippingFees.VN}
                  onChange={(e) => setSettings({
                    ...settings,
                    shippingFees: { ...settings.shippingFees, VN: parseFloat(e.target.value) || 0 }
                  })}
                />
              </div>
              <div className="space-y-2">
                <Label>印尼</Label>
                <Input
                  type="number"
                  value={settings.shippingFees.ID}
                  onChange={(e) => setSettings({
                    ...settings,
                    shippingFees: { ...settings.shippingFees, ID: parseFloat(e.target.value) || 0 }
                  })}
                />
              </div>
              <div className="space-y-2">
                <Label>菲律宾</Label>
                <Input
                  type="number"
                  value={settings.shippingFees.PH}
                  onChange={(e) => setSettings({
                    ...settings,
                    shippingFees: { ...settings.shippingFees, PH: parseFloat(e.target.value) || 0 }
                  })}
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* 平台佣金 */}
        <Card>
          <CardHeader>
            <CardTitle>平台佣金率</CardTitle>
            <CardDescription>各平台默认佣金比例</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label>TikTok Shop 佣金率</Label>
                <div className="flex items-center gap-2">
                  <Input
                    type="number"
                    step="0.01"
                    value={settings.platformCommissions.tiktok * 100}
                    onChange={(e) => setSettings({
                      ...settings,
                      platformCommissions: { ...settings.platformCommissions, tiktok: (parseFloat(e.target.value) || 0) / 100 }
                    })}
                  />
                  <span className="text-slate-500">%</span>
                </div>
              </div>
              <div className="space-y-2">
                <Label>Shopee 佣金率</Label>
                <div className="flex items-center gap-2">
                  <Input
                    type="number"
                    step="0.01"
                    value={settings.platformCommissions.shopee * 100}
                    onChange={(e) => setSettings({
                      ...settings,
                      platformCommissions: { ...settings.platformCommissions, shopee: (parseFloat(e.target.value) || 0) / 100 }
                    })}
                  />
                  <span className="text-slate-500">%</span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* 定价公式说明 */}
        <Card className="bg-blue-50 border-blue-200">
          <CardContent className="pt-6">
            <h3 className="font-semibold mb-2">定价公式</h3>
            <code className="text-sm bg-white px-3 py-2 rounded block">
              售价 = (1688成本 + 国内运费) × 汇率 × 利润率 + 跨境物流 + 平台佣金 + 安全边际
            </code>
          </CardContent>
        </Card>

        {/* 保存按钮 */}
        <div className="flex justify-end">
          <Button onClick={handleSave} disabled={isSaving}>
            {isSaving ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                保存中...
              </>
            ) : (
              <>
                <Save className="h-4 w-4 mr-2" />
                保存设置
              </>
            )}
          </Button>
        </div>
      </div>
    </AppLayout>
  );
}
