'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Separator } from '@/components/ui/separator';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { AppLayout } from '@/components/layout';
import { Loader2, Save, Shield, Key, Eye, EyeOff, Lock, History } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface User {
  id: string;
  email: string;
  name?: string;
  role: string;
}

interface SecuritySettings {
  rememberMe: boolean;
  autoLogoutMinutes: number;
  saveOperationLog: boolean;
  logRetentionDays: number;
}

export default function SecuritySettingsPage() {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [settings, setSettings] = useState<SecuritySettings>({
    rememberMe: true,
    autoLogoutMinutes: 30,
    saveOperationLog: true,
    logRetentionDays: 90,
  });
  const [passwordForm, setPasswordForm] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  });
  const [showPassword, setShowPassword] = useState(false);
  const [isChangingPassword, setIsChangingPassword] = useState(false);
  const [showPasswordDialog, setShowPasswordDialog] = useState(false);
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
      const response = await fetch('/api/settings/security', { credentials: 'include' });
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
      const response = await fetch('/api/settings/security', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(settings),
      });

      if (response.ok) {
        toast({ title: '保存成功', description: '安全设置已更新' });
      } else {
        toast({ title: '保存失败', description: '请稍后重试', variant: 'destructive' });
      }
    } catch (error) {
      console.error('保存失败:', error);
    } finally {
      setIsSaving(false);
    }
  };

  const handleChangePassword = async () => {
    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      toast({ title: '密码不一致', description: '两次输入的新密码不相同', variant: 'destructive' });
      return;
    }
    if (passwordForm.newPassword.length < 8) {
      toast({ title: '密码太短', description: '密码至少需要8个字符', variant: 'destructive' });
      return;
    }

    setIsChangingPassword(true);
    try {
      const response = await fetch('/api/auth/change-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          currentPassword: passwordForm.currentPassword,
          newPassword: passwordForm.newPassword,
        }),
      });

      const data = await response.json();
      if (response.ok) {
        toast({ title: '密码修改成功', description: '请使用新密码登录' });
        setShowPasswordDialog(false);
        setPasswordForm({ currentPassword: '', newPassword: '', confirmPassword: '' });
      } else {
        toast({ title: '修改失败', description: data.error || '请检查原密码是否正确', variant: 'destructive' });
      }
    } catch (error) {
      console.error('修改密码失败:', error);
    } finally {
      setIsChangingPassword(false);
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
          <h1 className="text-3xl font-bold">安全设置</h1>
          <p className="text-slate-500 mt-1">管理账号安全和登录设置</p>
        </div>

        {/* 密码修改 */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Key className="h-5 w-5" />
              密码管理
            </CardTitle>
            <CardDescription>修改登录密码</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium">登录密码</p>
                <p className="text-sm text-slate-500">定期修改密码可以提高账号安全性</p>
              </div>
              <Dialog open={showPasswordDialog} onOpenChange={setShowPasswordDialog}>
                <DialogTrigger asChild>
                  <Button variant="outline">
                    <Lock className="h-4 w-4 mr-2" />
                    修改密码
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>修改密码</DialogTitle>
                    <DialogDescription>请输入当前密码和新密码</DialogDescription>
                  </DialogHeader>
                  <div className="space-y-4 py-4">
                    <div className="space-y-2">
                      <Label htmlFor="currentPassword">当前密码</Label>
                      <Input
                        id="currentPassword"
                        type="password"
                        value={passwordForm.currentPassword}
                        onChange={(e) => setPasswordForm({ ...passwordForm, currentPassword: e.target.value })}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="newPassword">新密码</Label>
                      <div className="relative">
                        <Input
                          id="newPassword"
                          type={showPassword ? 'text' : 'password'}
                          value={passwordForm.newPassword}
                          onChange={(e) => setPasswordForm({ ...passwordForm, newPassword: e.target.value })}
                        />
                        <button
                          type="button"
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400"
                          onClick={() => setShowPassword(!showPassword)}
                        >
                          {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                        </button>
                      </div>
                      <p className="text-xs text-slate-500">密码需包含大小写字母和数字，至少8位</p>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="confirmPassword">确认新密码</Label>
                      <Input
                        id="confirmPassword"
                        type="password"
                        value={passwordForm.confirmPassword}
                        onChange={(e) => setPasswordForm({ ...passwordForm, confirmPassword: e.target.value })}
                      />
                    </div>
                  </div>
                  <DialogFooter>
                    <Button variant="outline" onClick={() => setShowPasswordDialog(false)}>
                      取消
                    </Button>
                    <Button onClick={handleChangePassword} disabled={isChangingPassword}>
                      {isChangingPassword ? (
                        <>
                          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                          修改中...
                        </>
                      ) : (
                        '确认修改'
                      )}
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            </div>
          </CardContent>
        </Card>

        {/* 登录设置 */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Shield className="h-5 w-5" />
              登录设置
            </CardTitle>
            <CardDescription>管理登录相关的安全选项</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <Label>记住密码</Label>
                <p className="text-sm text-slate-500">勾选后7天内免登录</p>
              </div>
              <Switch
                checked={settings.rememberMe}
                onCheckedChange={(checked) => setSettings({ ...settings, rememberMe: checked })}
              />
            </div>
            <Separator />
            <div className="flex items-center justify-between">
              <div>
                <Label>自动登出时间</Label>
                <p className="text-sm text-slate-500">无操作超过设定时间后自动登出</p>
              </div>
              <div className="flex items-center gap-2">
                <Input
                  type="number"
                  className="w-20"
                  value={settings.autoLogoutMinutes}
                  onChange={(e) => setSettings({ ...settings, autoLogoutMinutes: parseInt(e.target.value) || 30 })}
                />
                <span className="text-slate-500">分钟</span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* 操作日志 */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <History className="h-5 w-5" />
              操作日志
            </CardTitle>
            <CardDescription>记录和查看操作历史</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <Label>保存操作日志</Label>
                <p className="text-sm text-slate-500">记录所有操作行为，便于问题追溯</p>
              </div>
              <Switch
                checked={settings.saveOperationLog}
                onCheckedChange={(checked) => setSettings({ ...settings, saveOperationLog: checked })}
              />
            </div>
            {settings.saveOperationLog && (
              <>
                <Separator />
                <div className="flex items-center justify-between">
                  <div>
                    <Label>日志保留时间</Label>
                    <p className="text-sm text-slate-500">超过保留时间的日志将自动删除</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Input
                      type="number"
                      className="w-20"
                      value={settings.logRetentionDays}
                      onChange={(e) => setSettings({ ...settings, logRetentionDays: parseInt(e.target.value) || 90 })}
                    />
                    <span className="text-slate-500">天</span>
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
