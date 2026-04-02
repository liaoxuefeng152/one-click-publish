import { NextRequest, NextResponse } from 'next/server';
import { 
  prohibitedWords, 
  getProhibitedWordsByPlatform,
  getProhibitedWordsByRegion,
  ProhibitedWord 
} from '@/lib/prohibited-words';

interface DetectionResult {
  word: string;
  category: ProhibitedWord['category'];
  severity: ProhibitedWord['severity'];
  position: {
    start: number;
    end: number;
  };
  suggestion?: string;
  context: string;
}

interface DetectionResponse {
  success: boolean;
  hasProhibited: boolean;
  totalFound: number;
  highSeverityCount: number;
  results: DetectionResult[];
  text: string;
  cleanedText?: string;
}

/**
 * 违禁词检测API
 * 
 * 支持检测商品标题、描述中的违禁词、敏感词、广告词等
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { 
      text, 
      platform = 'all', 
      region,
      autoClean = false,
      checkType = 'all' // 'all' | 'title' | 'description'
    } = body;

    if (!text) {
      return NextResponse.json(
        { error: '请提供要检测的文本' },
        { status: 400 }
      );
    }

    // 获取适用的违禁词列表
    let wordsToCheck = prohibitedWords;
    
    if (platform !== 'all') {
      wordsToCheck = getProhibitedWordsByPlatform(platform);
    }
    
    if (region) {
      wordsToCheck = wordsToCheck.filter(
        word => !word.region || word.region.includes(region)
      );
    }

    // 执行检测
    const results = detectProhibitedWords(text, wordsToCheck);

    // 自动清理（如果启用）
    let cleanedText: string | undefined;
    if (autoClean && results.length > 0) {
      cleanedText = cleanText(text, results);
    }

    const response: DetectionResponse = {
      success: true,
      hasProhibited: results.length > 0,
      totalFound: results.length,
      highSeverityCount: results.filter(r => r.severity === 'high').length,
      results,
      text,
      cleanedText,
    };

    return NextResponse.json(response);
  } catch (error: any) {
    console.error('违禁词检测错误:', error);
    return NextResponse.json(
      { error: error.message || '检测失败' },
      { status: 500 }
    );
  }
}

/**
 * 检测文本中的违禁词
 */
function detectProhibitedWords(
  text: string, 
  wordsToCheck: ProhibitedWord[]
): DetectionResult[] {
  const results: DetectionResult[] = [];
  const textLower = text.toLowerCase();

  for (const wordInfo of wordsToCheck) {
    const wordLower = wordInfo.word.toLowerCase();
    let startIndex = 0;

    // 查找所有出现位置
    while (true) {
      const index = textLower.indexOf(wordLower, startIndex);
      
      if (index === -1) break;

      // 提取上下文
      const contextStart = Math.max(0, index - 10);
      const contextEnd = Math.min(text.length, index + wordInfo.word.length + 10);
      const context = text.substring(contextStart, contextEnd);

      results.push({
        word: wordInfo.word,
        category: wordInfo.category,
        severity: wordInfo.severity,
        position: {
          start: index,
          end: index + wordInfo.word.length,
        },
        suggestion: wordInfo.suggestion,
        context: `...${context}...`,
      });

      startIndex = index + 1;
    }
  }

  // 按严重程度和位置排序
  return results.sort((a, b) => {
    const severityOrder = { high: 0, medium: 1, low: 2 };
    const severityDiff = severityOrder[a.severity] - severityOrder[b.severity];
    if (severityDiff !== 0) return severityDiff;
    return a.position.start - b.position.start;
  });
}

/**
 * 清理文本中的违禁词
 */
function cleanText(text: string, results: DetectionResult[]): string {
  // 按位置倒序排序，从后往前替换，避免位置偏移
  const sortedResults = [...results].sort((a, b) => b.position.start - a.position.start);
  
  let cleanedText = text;
  
  for (const result of sortedResults) {
    // 使用星号替换违禁词
    const replacement = '*'.repeat(result.word.length);
    cleanedText = 
      cleanedText.substring(0, result.position.start) + 
      replacement + 
      cleanedText.substring(result.position.end);
  }

  return cleanedText;
}

/**
 * 批量检测（GET方法用于快速检查）
 */
export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const text = searchParams.get('text');
  const platform = searchParams.get('platform') || 'all';
  const region = searchParams.get('region') || undefined;

  if (!text) {
    return NextResponse.json(
      { error: '请提供要检测的文本' },
      { status: 400 }
    );
  }

  // 重用POST逻辑
  const mockRequest = {
    json: async () => ({
      text,
      platform,
      region,
      autoClean: false,
    }),
  } as NextRequest;

  return POST(mockRequest);
}
