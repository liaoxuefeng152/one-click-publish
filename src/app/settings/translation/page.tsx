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
import { Textarea } from '@/components/ui/textarea';
import { AppLayout } from '@/components/layout';
import { Loader2, Save, Languages, Plus, Trash2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface User {
  id: string;
  email: string;
  name?: string;
  role: string;
}

interface TranslationSettings {
  defaultTargetLanguage: string;
  translationApi: string;
  apiKey: string;
  autoTranslate: boolean;
  autoOptimizeTitle: boolean;
  autoRemoveSensitiveWords: boolean;
  sensitiveWords: string[];
  hotKeywords: string[];
}

export default function TranslationSettingsPage() {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [settings, setSettings] = useState<TranslationSettings>({
    defaultTargetLanguage: 'th',
    translationApi: 'google',
    apiKey: '',
    autoTranslate: true,
    autoOptimizeTitle: true,
    autoRemoveSensitiveWords: true,
    sensitiveWords: ['1688', '厂家直销', '批发价', '源头工厂', '一件代发'],
    hotKeywords: [],
  });
  const [newSensitiveWord, setNewSensitiveWord] = useState('');
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
      const response = await fetch('/api/settings/translation', { credentials: 'include' });
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
      const response = await fetch('/api/settings/translation', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(settings),
      });

      if (response.ok) {
        toast({ title: '保存成功', description: '翻译设置已更新' });
      } else {
        toast({ title: '保存失败', description: '请稍后重试', variant: 'destructive' });
      }
    } catch (error) {
      console.error('保存失败:', error);
    } finally {
      setIsSaving(false);
    }
  };

  const addSensitiveWord = () => {
    if (newSensitiveWord.trim() && !settings.sensitiveWords.includes(newSensitiveWord.trim())) {
      setSettings({
        ...settings,
        sensitiveWords: [...settings.sensitiveWords, newSensitiveWord.trim()],
      });
      setNewSensitiveWord('');
    }
  };

  const removeSensitiveWord = (word: string) => {
    setSettings({
      ...settings,
      sensitiveWords: settings.sensitiveWords.filter(w => w !== word),
    });
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
          <h1 className="text-3xl font-bold">翻译设置</h1>
          <p className="text-slate-500 mt-1">配置商品标题和描述的翻译参数</p>
        </div>

        {/* 基础设置 */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Languages className="h-5 w-5" />
              基础设置
            </CardTitle>
            <CardDescription>设置默认翻译语言和翻译服务</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label>默认目标语言</Label>
                <Select
                  value={settings.defaultTargetLanguage}
                  onValueChange={(value) => setSettings({ ...settings, defaultTargetLanguage: value })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="th">泰语</SelectItem>
                    <SelectItem value="vi">越南语</SelectItem>
                    <SelectItem value="id">印尼语</SelectItem>
                    <SelectItem value="ms">马来语</SelectItem>
                    <SelectItem value="en">英语</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>翻译 API</Label>
                <Select
                  value={settings.translationApi}
                  onValueChange={(value) => setSettings({ ...settings, translationApi: value })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="google">Google 翻译</SelectItem>
                    <SelectItem value="aliyun">阿里翻译</SelectItem>
                    <SelectItem value="baidu">百度翻译</SelectItem>
                    <SelectItem value="deepl">DeepL</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="apiKey">API Key</Label>
              <Input
                id="apiKey"
                type="password"
                placeholder="请输入翻译 API 密钥"
                value={settings.apiKey}
                onChange={(e) => setSettings({ ...settings, apiKey: e.target.value })}
              />
              <p className="text-xs text-slate-500">部分翻译服务需要 API 密钥，请根据所选服务填入</p>
            </div>
          </CardContent>
        </Card>

        {/* 自动处理设置 */}
        <Card>
          <CardHeader>
            <CardTitle>自动处理设置</CardTitle>
            <CardDescription>配置翻译时的自动化处理选项</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <Label>自动翻译</Label>
                <p className="text-sm text-slate-500">采集后自动翻译标题和描述</p>
              </div>
              <Switch
                checked={settings.autoTranslate}
                onCheckedChange={(checked) => setSettings({ ...settings, autoTranslate: checked })}
              />
            </div>
            <div className="flex items-center justify-between">
              <div>
                <Label>标题优化</Label>
                <p className="text-sm text-slate-500">自动优化翻译后的标题（添加关键词、去除极限词）</p>
              </div>
              <Switch
                checked={settings.autoOptimizeTitle}
                onCheckedChange={(checked) => setSettings({ ...settings, autoOptimizeTitle: checked })}
              />
            </div>
            <div className="flex items-center justify-between">
              <div>
                <Label>去除敏感词</Label>
                <p className="text-sm text-slate-500">自动过滤标题和描述中的敏感词</p>
              </div>
              <Switch
                checked={settings.autoRemoveSensitiveWords}
                onCheckedChange={(checked) => setSettings({ ...settings, autoRemoveSensitiveWords: checked })}
              />
            </div>
          </CardContent>
        </Card>

        {/* 敏感词库 */}
        <Card>
          <CardHeader>
            <CardTitle>敏感词库</CardTitle>
            <CardDescription>翻译时自动过滤的敏感词列表</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex gap-2">
              <Input
                placeholder="添加敏感词"
                value={newSensitiveWord}
                onChange={(e) => setNewSensitiveWord(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && addSensitiveWord()}
              />
              <Button onClick={addSensitiveWord}>
                <Plus className="h-4 w-4" />
              </Button>
            </div>
            <div className="flex flex-wrap gap-2">
              {settings.sensitiveWords.map((word) => (
                <div
                  key={word}
                  className="flex items-center gap-1 px-3 py-1 bg-slate-100 rounded-full text-sm"
                >
                  <span>{word}</span>
                  <button
                    onClick={() => removeSensitiveWord(word)}
                    className="text-slate-400 hover:text-red-500"
                  >
                    <Trash2 className="h-3 w-3" />
                  </button>
                </div>
              ))}
            </div>
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
