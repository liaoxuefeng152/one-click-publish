/**
 * 跨境电商违禁词库
 * 
 * 包含各平台通用违禁词、敏感词、广告词等
 * 数据来源：平台官方规则 + 行业经验
 */

export interface ProhibitedWord {
  word: string;
  category: 'prohibited' | 'sensitive' | 'advertising' | 'infringement' | 'adult';
  severity: 'high' | 'medium' | 'low';
  platforms: ('tiktok' | 'shopee' | 'lazada' | 'all')[];
  region?: string[];
  suggestion?: string;
}

/**
 * 违禁词库 - 分类整理
 */
export const prohibitedWords: ProhibitedWord[] = [
  // ===== 高风险违禁词（绝对禁止） =====
  
  // 成人用品类
  { word: '性感', category: 'adult', severity: 'high', platforms: ['all'], suggestion: '请使用更中性的描述' },
  { word: '诱惑', category: 'adult', severity: 'high', platforms: ['all'], suggestion: '请使用更中性的描述' },
  { word: '情趣', category: 'adult', severity: 'high', platforms: ['all'], suggestion: '成人用品在多数平台禁止销售' },
  { word: '催情', category: 'adult', severity: 'high', platforms: ['all'] },
  { word: '迷药', category: 'adult', severity: 'high', platforms: ['all'] },
  
  // 毒品相关
  { word: '冰毒', category: 'prohibited', severity: 'high', platforms: ['all'] },
  { word: '摇头丸', category: 'prohibited', severity: 'high', platforms: ['all'] },
  { word: '大麻', category: 'prohibited', severity: 'high', platforms: ['all'] },
  { word: '毒品', category: 'prohibited', severity: 'high', platforms: ['all'] },
  
  // 武器类
  { word: '枪支', category: 'prohibited', severity: 'high', platforms: ['all'] },
  { word: '手枪', category: 'prohibited', severity: 'high', platforms: ['all'] },
  { word: '步枪', category: 'prohibited', severity: 'high', platforms: ['all'] },
  { word: '弹药', category: 'prohibited', severity: 'high', platforms: ['all'] },
  { word: '管制刀具', category: 'prohibited', severity: 'high', platforms: ['all'], suggestion: '部分刀具需要特殊许可' },
  
  // 医疗药品类
  { word: '处方药', category: 'prohibited', severity: 'high', platforms: ['all'] },
  { word: '减肥药', category: 'sensitive', severity: 'medium', platforms: ['all'], suggestion: '需提供相关认证' },
  { word: '壮阳', category: 'sensitive', severity: 'medium', platforms: ['all'], suggestion: '保健品需合规宣传' },
  { word: '伟哥', category: 'sensitive', severity: 'medium', platforms: ['all'] },
  { word: '肉毒杆菌', category: 'prohibited', severity: 'high', platforms: ['all'] },
  
  // ===== 中风险敏感词 =====
  
  // 夸大宣传类
  { word: '第一', category: 'advertising', severity: 'medium', platforms: ['all'], suggestion: '避免使用最高级形容词' },
  { word: '唯一', category: 'advertising', severity: 'medium', platforms: ['all'] },
  { word: '最好', category: 'advertising', severity: 'medium', platforms: ['all'] },
  { word: '最强', category: 'advertising', severity: 'medium', platforms: ['all'] },
  { word: '最低价', category: 'advertising', severity: 'medium', platforms: ['all'], suggestion: '需提供价格证明' },
  { word: '史上最', category: 'advertising', severity: 'medium', platforms: ['all'] },
  { word: '绝对', category: 'advertising', severity: 'low', platforms: ['all'] },
  { word: '保证', category: 'advertising', severity: 'low', platforms: ['all'], suggestion: '慎用保证性用语' },
  
  // 医疗宣传类
  { word: '治愈', category: 'sensitive', severity: 'medium', platforms: ['all'], suggestion: '医疗功效宣传需谨慎' },
  { word: '疗效', category: 'sensitive', severity: 'medium', platforms: ['all'] },
  { word: '药效', category: 'sensitive', severity: 'medium', platforms: ['all'] },
  { word: '根治', category: 'sensitive', severity: 'medium', platforms: ['all'] },
  { word: '包治', category: 'sensitive', severity: 'high', platforms: ['all'] },
  { word: '无副作用', category: 'sensitive', severity: 'medium', platforms: ['all'] },
  
  // 金融相关
  { word: '贷款', category: 'sensitive', severity: 'medium', platforms: ['all'] },
  { word: '信用卡套现', category: 'prohibited', severity: 'high', platforms: ['all'] },
  { word: '洗钱', category: 'prohibited', severity: 'high', platforms: ['all'] },
  
  // 品牌侵权类
  { word: '高仿', category: 'infringement', severity: 'high', platforms: ['all'], suggestion: '禁止销售仿冒品' },
  { word: 'A货', category: 'infringement', severity: 'high', platforms: ['all'] },
  { word: '复刻', category: 'infringement', severity: 'medium', platforms: ['all'] },
  { word: '同款', category: 'sensitive', severity: 'low', platforms: ['all'], suggestion: '注意不要侵权' },
  { word: '名牌', category: 'sensitive', severity: 'medium', platforms: ['all'] },
  
  // TikTok Shop 特殊违禁词
  { word: '直播带货', category: 'advertising', severity: 'low', platforms: ['tiktok'] },
  { word: '私聊', category: 'sensitive', severity: 'medium', platforms: ['tiktok'] },
  { word: '微信', category: 'sensitive', severity: 'medium', platforms: ['tiktok'], suggestion: '禁止引流到其他平台' },
  { word: 'WhatsApp', category: 'sensitive', severity: 'medium', platforms: ['tiktok'] },
  
  // Shopee 特殊违禁词
  { word: '线下交易', category: 'prohibited', severity: 'high', platforms: ['shopee'] },
  { word: '货到付款', category: 'sensitive', severity: 'low', platforms: ['shopee'], region: ['VN', 'ID', 'TH'] },
  
  // ===== 低风险但需注意 =====
  { word: '热销', category: 'advertising', severity: 'low', platforms: ['all'] },
  { word: '爆款', category: 'advertising', severity: 'low', platforms: ['all'] },
  { word: '网红', category: 'advertising', severity: 'low', platforms: ['all'] },
  { word: '明星同款', category: 'sensitive', severity: 'medium', platforms: ['all'], suggestion: '需确保不侵权' },
  { word: '专柜', category: 'sensitive', severity: 'low', platforms: ['all'] },
  { word: '正品', category: 'sensitive', severity: 'low', platforms: ['all'], suggestion: '需提供授权证明' },
  
  // 地区特定违禁词
  { word: '赌博', category: 'prohibited', severity: 'high', platforms: ['all'], region: ['TH', 'VN', 'ID'] },
  { word: '算命', category: 'sensitive', severity: 'medium', platforms: ['all'], region: ['TH', 'MY'] },
  { word: '佛牌', category: 'sensitive', severity: 'medium', platforms: ['all'], region: ['TH', 'MY'] },
];

/**
 * 违禁词分类说明
 */
export const categoryDescriptions = {
  prohibited: {
    label: '违禁词',
    description: '平台明确禁止，使用会导致商品下架或账号封禁',
    color: 'red',
  },
  sensitive: {
    label: '敏感词',
    description: '可能触发审核，需要提供相关证明或资质',
    color: 'orange',
  },
  advertising: {
    label: '广告词',
    description: '可能违反广告法，建议避免使用',
    color: 'yellow',
  },
  infringement: {
    label: '侵权词',
    description: '涉及知识产权，可能引起侵权投诉',
    color: 'purple',
  },
  adult: {
    label: '成人内容',
    description: '成人用品相关，在多数平台禁止销售',
    color: 'pink',
  },
};

/**
 * 获取指定平台的违禁词列表
 */
export function getProhibitedWordsByPlatform(platform: string): ProhibitedWord[] {
  return prohibitedWords.filter(
    word => word.platforms.includes(platform as any) || word.platforms.includes('all')
  );
}

/**
 * 获取指定地区的违禁词列表
 */
export function getProhibitedWordsByRegion(region: string): ProhibitedWord[] {
  return prohibitedWords.filter(
    word => !word.region || word.region.includes(region)
  );
}

/**
 * 获取指定严重级别的违禁词列表
 */
export function getProhibitedWordsBySeverity(severity: 'high' | 'medium' | 'low'): ProhibitedWord[] {
  return prohibitedWords.filter(word => word.severity === severity);
}

/**
 * 获取指定分类的违禁词列表
 */
export function getProhibitedWordsByCategory(category: ProhibitedWord['category']): ProhibitedWord[] {
  return prohibitedWords.filter(word => word.category === category);
}
