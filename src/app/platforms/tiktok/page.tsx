'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { 
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Loader2, Plus, Store, CheckCircle, AlertCircle, ExternalLink, Trash2 } from 'lucide-react';

interface Shop {
  id: string;
  platform: string;
  shop_name: string;
  shop_id: string;
  region: string;
  is_active: boolean;
  created_at: string;
}

export default function TikTokShopPage() {
  const [shops, setShops] = useState<Shop[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isAdding, setIsAdding] = useState(false);
  
  // 表单数据
  const [shopName, setShopName] = useState('');
  const [shopId, setShopId] = useState('');
  const [region, setRegion] = useState('TH');

  useEffect(() => {
    fetchShops();
  }, []);

  const fetchShops = async () => {
    try {
      const response = await fetch('/api/shops');
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || '获取店铺失败');
      }

      setShops((data.shops || []).filter((s: Shop) => s.platform === 'tiktok'));
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleAddShop = async () => {
    if (!shopName || !shopId || !region) {
      setError('请填写完整信息');
      return;
    }

    setIsAdding(true);
    setError('');

    try {
      const response = await fetch('/api/shops', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          platform: 'tiktok',
          shop_name: shopName,
          shop_id: shopId,
          region,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || '添加失败');
      }

      setShops([data.shop, ...shops]);
      setIsDialogOpen(false);
      setShopName('');
      setShopId('');
      setRegion('TH');
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsAdding(false);
    }
  };

  const handleDeleteShop = async (shopId: string) => {
    if (!confirm('确定要删除此店铺吗？')) return;

    try {
      const response = await fetch(`/api/shops/${shopId}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        throw new Error('删除失败');
      }

      setShops(shops.filter((s) => s.id !== shopId));
    } catch (err: any) {
      setError(err.message);
    }
  };

  const getRegionName = (code: string) => {
    const regions: Record<string, string> = {
      TH: '泰国',
      MY: '马来西亚',
      VN: '越南',
      ID: '印尼',
      PH: '菲律宾',
      UK: '英国',
      US: '美国',
    };
    return regions[code] || code;
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">TikTok Shop 授权</h1>
          <p className="text-slate-500 mt-1">管理您的TikTok Shop店铺授权</p>
        </div>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              添加店铺
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>添加 TikTok Shop 店铺</DialogTitle>
              <DialogDescription>
                输入您的TikTok Shop店铺信息进行授权
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="shopName">店铺名称</Label>
                <Input
                  id="shopName"
                  placeholder="请输入店铺名称"
                  value={shopName}
                  onChange={(e) => setShopName(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="shopId">店铺ID</Label>
                <Input
                  id="shopId"
                  placeholder="请输入店铺ID"
                  value={shopId}
                  onChange={(e) => setShopId(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="region">站点</Label>
                <Select value={region} onValueChange={setRegion}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="TH">泰国</SelectItem>
                    <SelectItem value="MY">马来西亚</SelectItem>
                    <SelectItem value="VN">越南</SelectItem>
                    <SelectItem value="ID">印尼</SelectItem>
                    <SelectItem value="PH">菲律宾</SelectItem>
                    <SelectItem value="UK">英国</SelectItem>
                    <SelectItem value="US">美国</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
                取消
              </Button>
              <Button onClick={handleAddShop} disabled={isAdding}>
                {isAdding && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                确认添加
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {/* 店铺列表 */}
      {isLoading ? (
        <div className="flex items-center justify-center h-64">
          <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
        </div>
      ) : shops.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Store className="h-16 w-16 text-slate-300 mb-4" />
            <p className="text-slate-500 mb-4">暂无授权店铺</p>
            <Button onClick={() => setIsDialogOpen(true)}>
              <Plus className="mr-2 h-4 w-4" />
              添加第一个店铺
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {shops.map((shop) => (
            <Card key={shop.id}>
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-full bg-black flex items-center justify-center">
                      <span className="text-white font-bold text-xs">TT</span>
                    </div>
                    <div>
                      <CardTitle className="text-lg">{shop.shop_name}</CardTitle>
                      <CardDescription>ID: {shop.shop_id}</CardDescription>
                    </div>
                  </div>
                  <Badge variant={shop.is_active ? "default" : "secondary"}>
                    {shop.is_active ? '已授权' : '未授权'}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-slate-500">站点: {getRegionName(shop.region)}</span>
                  <Button variant="ghost" size="sm" onClick={() => handleDeleteShop(shop.id)}>
                    <Trash2 className="h-4 w-4 text-red-500" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* 授权说明 */}
      <Card>
        <CardHeader>
          <CardTitle>授权说明</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3 text-sm text-slate-600">
            <p>1. 登录TikTok Shop卖家中心，获取您的店铺ID</p>
            <p>2. 在TikTok Open Platform创建应用并获取授权</p>
            <p>3. 将授权信息填入系统，完成店铺绑定</p>
            <p>4. 授权成功后，即可使用一键发布功能</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
