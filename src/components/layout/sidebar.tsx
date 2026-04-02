'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';
import {
  Home,
  Package,
  ShoppingCart,
  Store,
  Settings,
  ChevronDown,
  ChevronRight,
  Globe,
  DollarSign,
  Send,
  FileText,
  Layers,
  Link2 as LinkIcon,
  HelpCircle,
  Image,
  Shield,
  Languages,
} from 'lucide-react';
import { useState } from 'react';

interface NavItem {
  title: string;
  href?: string;
  icon: React.ReactNode;
  children?: NavItem[];
}

const navItems: NavItem[] = [
  {
    title: '首页',
    href: '/dashboard',
    icon: <Home className="h-5 w-5" />,
  },
  {
    title: '商品采集',
    icon: <Package className="h-5 w-5" />,
    children: [
      { title: '单链接采集', href: '/collect/single', icon: <LinkIcon className="h-4 w-4" /> },
      { title: '批量采集', href: '/collect/batch', icon: <Layers className="h-4 w-4" /> },
    ],
  },
  {
    title: '商品管理',
    icon: <ShoppingCart className="h-5 w-5" />,
    children: [
      { title: '草稿箱', href: '/products/drafts', icon: <FileText className="h-4 w-4" /> },
      { title: '已采集商品', href: '/products/collected', icon: <Package className="h-4 w-4" /> },
      { title: '已发布商品', href: '/products/published', icon: <Send className="h-4 w-4" /> },
    ],
  },
  {
    title: '定价设置',
    href: '/pricing',
    icon: <DollarSign className="h-5 w-5" />,
  },
  {
    title: '平台管理',
    icon: <Store className="h-5 w-5" />,
    children: [
      { title: 'TikTok Shop授权', href: '/platforms/tiktok', icon: <Globe className="h-4 w-4" /> },
      { title: 'Shopee授权', href: '/platforms/shopee', icon: <Store className="h-4 w-4" /> },
    ],
  },
  {
    title: '系统设置',
    icon: <Settings className="h-5 w-5" />,
    children: [
      { title: '翻译设置', href: '/settings/translation', icon: <Languages className="h-4 w-4" /> },
      { title: '图片设置', href: '/settings/images', icon: <Image className="h-4 w-4" /> },
      { title: '安全设置', href: '/settings/security', icon: <Shield className="h-4 w-4" /> },
    ],
  },
  {
    title: '帮助中心',
    href: '/help',
    icon: <HelpCircle className="h-5 w-5" />,
  },
];

function NavItemComponent({ item, depth = 0 }: { item: NavItem; depth?: number }) {
  const pathname = usePathname();
  const [isOpen, setIsOpen] = useState(false);
  
  const isActive = item.href === pathname;
  const hasChildren = item.children && item.children.length > 0;
  
  // 检查子菜单是否有活动项
  const hasActiveChild = hasChildren && item.children!.some(child => child.href === pathname);
  
  if (hasChildren) {
    return (
      <div>
        <button
          onClick={() => setIsOpen(!isOpen)}
          className={cn(
            'w-full flex items-center justify-between px-4 py-3 text-sm font-medium rounded-lg transition-colors',
            'hover:bg-slate-100 dark:hover:bg-slate-800',
            (isOpen || hasActiveChild) && 'bg-slate-100 dark:bg-slate-800'
          )}
        >
          <div className="flex items-center gap-3">
            {item.icon}
            <span>{item.title}</span>
          </div>
          {isOpen ? (
            <ChevronDown className="h-4 w-4" />
          ) : (
            <ChevronRight className="h-4 w-4" />
          )}
        </button>
        {(isOpen || hasActiveChild) && (
          <div className="ml-4 mt-1 space-y-1">
            {item.children!.map((child, index) => (
              <NavItemComponent key={index} item={child} depth={depth + 1} />
            ))}
          </div>
        )}
      </div>
    );
  }
  
  return (
    <Link
      href={item.href!}
      className={cn(
        'flex items-center gap-3 px-4 py-3 text-sm font-medium rounded-lg transition-colors',
        isActive
          ? 'bg-blue-50 text-blue-600 dark:bg-blue-900/50 dark:text-blue-400'
          : 'hover:bg-slate-100 dark:hover:bg-slate-800',
        depth > 0 && 'py-2.5 text-slate-600 dark:text-slate-400'
      )}
    >
      {item.icon}
      <span>{item.title}</span>
    </Link>
  );
}

export function Sidebar() {
  return (
    <aside className="fixed left-0 top-0 z-40 h-screen w-64 border-r border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900 pt-16">
      <div className="h-full overflow-y-auto py-4">
        <nav className="space-y-1 px-3">
          {navItems.map((item, index) => (
            <NavItemComponent key={index} item={item} />
          ))}
        </nav>
      </div>
    </aside>
  );
}
