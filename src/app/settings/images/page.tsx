'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { AppLayout } from '@/components/layout';
import { Loader2, Save, Image, Upload } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface User {
  id: string;
  email: string;
  name?: string;
  role: string;
}

interface ImageSettings {
  tiktokMainImageSize: string;
  shopeeMainImageSize: string;
  autoRemoveWatermark: boolean;
  autoOcrTranslate: boolean;
  addWatermark: boolean;
  watermarkUrl: string;
  watermarkPosition: string;
  watermarkOpacity: number;
}

export default function ImageSettingsPage() {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [settings, setSettings] = useState<ImageSettings>({
    tiktokMainImageSize: '1:1',
    shopeeMainImageSize: '1:1',
    autoRemoveWatermark: true,
    autoOcrTranslate: true,
    addWatermark: false,
    watermarkUrl: '',
    watermarkPosition: 'bottom-right',
    watermarkOpacity: 50,
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
      const response = await fetch('/api/settings/images', { credentials: 'include' });
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
      const response = await fetch('/api/settings/images', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(settings),
      });

      if (response.ok) {
        toast({ title: '保存成功', description: '图片设置已更新' });
      } else {
        toast({ title: '保存失败', description: '请稍后重试', variant: 'destructive' });
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
          <h1 className="text-3xl font-bold">图片设置</h1>
          <p className="text-slate-500 mt-1">配置商品图片的处理参数</p>
        </div>

        {/* 默认尺寸 */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Image className="h-5 w-5" />
              默认图片尺寸
            </CardTitle>
            <CardDescription>各平台主图的默认尺寸设置</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label>TikTok Shop 主图尺寸</Label>
                <Select
                  value={settings.tiktokMainImageSize}
                  onValueChange={(value) => setSettings({ ...settings, tiktokMainImageSize: value })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="1:1">1:1 (正方形)</SelectItem>
                    <SelectItem value="3:4">3:4 (竖版)</SelectItem>
                    <SelectItem value="4:3">4:3 (横版)</SelectItem>
                  </SelectContent>
                </Select>
                <p className="text-xs text-slate-500">推荐尺寸：800x800 像素</p>
              </div>
              <div className="space-y-2">
                <Label>Shopee 主图尺寸</Label>
                <Select
                  value={settings.shopeeMainImageSize}
                  onValueChange={(value) => setSettings({ ...settings, shopeeMainImageSize: value })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="1:1">1:1 (正方形)</SelectItem>
                    <SelectItem value="3:4">3:4 (竖版)</SelectItem>
                    <SelectItem value="4:3">4:3 (横版)</SelectItem>
                  </SelectContent>
                </Select>
                <p className="text-xs text-slate-500">推荐尺寸：800x800 像素</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* 图片处理 */}
        <Card>
          <CardHeader>
            <CardTitle>图片处理</CardTitle>
            <CardDescription>自动处理图片的选项</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <Label>自动去水印</Label>
                <p className="text-sm text-slate-500">自动检测并去除图片中的水印</p>
              </div>
              <Switch
                checked={settings.autoRemoveWatermark}
                onCheckedChange={(checked) => setSettings({ ...settings, autoRemoveWatermark: checked })}
              />
            </div>
            <div className="flex items-center justify-between">
              <div>
                <Label>OCR 翻译图片文字</Label>
                <p className="text-sm text-slate-500">自动识别图片中的中文并翻译为目标语言</p>
              </div>
              <Switch
                checked={settings.autoOcrTranslate}
                onCheckedChange={(checked) => setSettings({ ...settings, autoOcrTranslate: checked })}
              />
            </div>
          </CardContent>
        </Card>

        {/* 水印设置 */}
        <Card>
          <CardHeader>
            <CardTitle>水印设置</CardTitle>
            <CardDescription>为商品图片添加自定义水印</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <Label>添加水印</Label>
                <p className="text-sm text-slate-500">为所有图片添加品牌水印</p>
              </div>
              <Switch
                checked={settings.addWatermark}
                onCheckedChange={(checked) => setSettings({ ...settings, addWatermark: checked })}
              />
            </div>
            
            {settings.addWatermark && (
              <>
                <div className="space-y-2">
                  <Label>水印图片</Label>
                  <div className="flex gap-2">
                    <Input
                      placeholder="水印图片 URL 或上传图片"
                      value={settings.watermarkUrl}
                      onChange={(e) => setSettings({ ...settings, watermarkUrl: e.target.value })}
                    />
                    <Button variant="outline">
                      <Upload className="h-4 w-4" />
                    </Button>
                  </div>
                  <p className="text-xs text-slate-500">支持 PNG 格式透明背景水印</p>
                </div>
                
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label>水印位置</Label>
                    <Select
                      value={settings.watermarkPosition}
                      onValueChange={(value) => setSettings({ ...settings, watermarkPosition: value })}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="top-left">左上角</SelectItem>
                        <SelectItem value="top-right">右上角</SelectItem>
                        <SelectItem value="bottom-left">左下角</SelectItem>
                        <SelectItem value="bottom-right">右下角</SelectItem>
                        <SelectItem value="center">居中</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>水印透明度：{settings.watermarkOpacity}%</Label>
                    <Input
                      type="range"
                      min="10"
                      max="100"
                      value={settings.watermarkOpacity}
                      onChange={(e) => setSettings({ ...settings, watermarkOpacity: parseInt(e.target.value) })}
                    />
                  </div>
                </div>
              </>
            )}
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
