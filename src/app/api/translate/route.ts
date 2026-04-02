import { NextRequest, NextResponse } from 'next/server';
import { LLMClient, Config, HeaderUtils } from 'coze-coding-dev-sdk';
import { getCurrentUser } from '@/lib/auth';
import { getSupabaseClient } from '@/storage/database/supabase-client';
import { prohibitedWords } from '@/lib/prohibited-words';

interface ProhibitedWordResult {
  word: string;
  category: string;
  severity: string;
  suggestion?: string;
}

/**
 * 翻译商品信息
 * 
 * 包含违禁词检测和自动过滤功能
 */
export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: '未登录' }, { status: 401 });
    }

    const { productId, targetLanguage, skipProhibitedCheck = false } = await request.json();
    
    if (!productId || !targetLanguage) {
      return NextResponse.json({ error: '缺少必要参数' }, { status: 400 });
    }

    const client = getSupabaseClient();
    
    // 获取商品信息
    const { data: product, error: productError } = await client
      .from('products')
      .select('*')
      .eq('id', productId)
      .eq('user_id', user.id)
      .maybeSingle();

    if (productError || !product) {
      return NextResponse.json({ error: '商品不存在' }, { status: 404 });
    }

    // 创建翻译任务
    const { data: task } = await client
      .from('tasks')
      .insert({
        user_id: user.id,
        type: 'translate',
        status: 'processing',
        product_id: productId,
      })
      .select()
      .single();

    const customHeaders = HeaderUtils.extractForwardHeaders(request.headers);
    const llmClient = new LLMClient(new Config(), customHeaders);

    // 语言映射
    const languageNames: Record<string, string> = {
      en: '英语',
      th: '泰语',
      vi: '越南语',
      id: '印尼语',
      ms: '马来语',
      ph: '菲律宾语',
    };

    const targetLangName = languageNames[targetLanguage] || targetLanguage;

    try {
      // 步骤1: 检测原始文本中的违禁词
      let originalProhibitedWords: ProhibitedWordResult[] = [];
      if (!skipProhibitedCheck) {
        originalProhibitedWords = detectProhibitedWords(product.original_title + ' ' + (product.original_description || ''));
      }

      // 步骤2: 翻译标题
      let translatedTitle = product.original_title;
      if (product.original_title) {
        const titlePrompt = `你是一个专业的跨境电商翻译专家。请将以下中文商品标题翻译成${targetLangName}。

要求：
1. 保持商品卖点，使用当地电商常用关键词
2. 去除"1688"、"厂家直销"、"包邮"等平台敏感词
3. 去除"第一"、"唯一"、"最好"等夸大宣传词
4. 标题长度适中，适合${targetLangName}电商平台
5. 只输出翻译后的标题，不要其他内容

中文标题：${product.original_title}`;

        const titleResponse = await llmClient.invoke([
          { role: 'user', content: titlePrompt }
        ], { temperature: 0.3 });
        translatedTitle = titleResponse.content.trim();
      }

      // 步骤3: 翻译描述
      let translatedDescription = product.original_description;
      if (product.original_description) {
        const descPrompt = `你是一个专业的跨境电商翻译专家。请将以下中文商品描述翻译成${targetLangName}。

要求：
1. 保持HTML格式不变
2. 翻译准确，符合当地语言习惯
3. 去除"1688"、"厂家直销"等平台敏感词
4. 去除夸大宣传词，保持客观描述
5. 只输出翻译后的内容，不要其他内容

中文描述：${product.original_description}`;

        const descResponse = await llmClient.invoke([
          { role: 'user', content: descPrompt }
        ], { temperature: 0.3 });
        translatedDescription = descResponse.content.trim();
      }

      // 步骤4: 检测翻译后的违禁词
      let translatedProhibitedWords: ProhibitedWordResult[] = [];
      if (!skipProhibitedCheck) {
        translatedProhibitedWords = detectProhibitedWords(
          translatedTitle + ' ' + (translatedDescription || '')
        );
      }

      // 步骤5: 如果有高风险违禁词，进行二次清理
      const highSeverityWords = translatedProhibitedWords.filter(w => w.severity === 'high');
      if (highSeverityWords.length > 0) {
        const cleanPrompt = `请清理以下商品标题和描述中的违禁词，用更合适的词语替换或删除：

标题：${translatedTitle}

描述：${translatedDescription}

违禁词列表：${highSeverityWords.map(w => w.word).join('、')}

请返回JSON格式：
{
  "title": "清理后的标题",
  "description": "清理后的描述"
}`;

        try {
          const cleanResponse = await llmClient.invoke([
            { role: 'user', content: cleanPrompt }
          ], { temperature: 0.3 });
          
          const jsonMatch = cleanResponse.content.match(/\{[\s\S]*\}/);
          if (jsonMatch) {
            const cleaned = JSON.parse(jsonMatch[0]);
            translatedTitle = cleaned.title || translatedTitle;
            translatedDescription = cleaned.description || translatedDescription;
          }
        } catch (cleanError) {
          console.warn('二次清理失败:', cleanError);
        }
      }

      // 更新商品
      const { error: updateError } = await client
        .from('products')
        .update({
          translated_title: translatedTitle,
          translated_description: translatedDescription,
          target_language: targetLanguage,
          status: translatedProhibitedWords.filter(w => w.severity === 'high').length > 0 
            ? 'needs_review'  // 有高风险违禁词，需要人工审核
            : 'ready',
          updated_at: new Date().toISOString(),
        })
        .eq('id', productId);

      if (updateError) {
        throw new Error('更新商品失败');
      }

      // 更新任务状态
      await client
        .from('tasks')
        .update({
          status: 'completed',
          completed_at: new Date().toISOString(),
          result: {
            prohibited_words_found: translatedProhibitedWords.length,
            high_severity_count: highSeverityWords.length,
          },
        })
        .eq('id', task?.id);

      return NextResponse.json({
        success: true,
        translatedTitle,
        translatedDescription,
        prohibitedWords: {
          original: originalProhibitedWords,
          translated: translatedProhibitedWords,
          hasHighSeverity: highSeverityWords.length > 0,
        },
        needsReview: highSeverityWords.length > 0,
      });
    } catch (translateError: any) {
      // 更新任务失败状态
      await client
        .from('tasks')
        .update({
          status: 'failed',
          error_message: translateError.message,
        })
        .eq('id', task?.id);

      throw translateError;
    }
  } catch (error: any) {
    console.error('翻译错误:', error);
    return NextResponse.json(
      { error: error.message || '翻译失败' },
      { status: 500 }
    );
  }
}

/**
 * 检测文本中的违禁词
 */
function detectProhibitedWords(text: string): ProhibitedWordResult[] {
  const results: ProhibitedWordResult[] = [];
  const textLower = text.toLowerCase();

  for (const wordInfo of prohibitedWords) {
    const wordLower = wordInfo.word.toLowerCase();
    
    if (textLower.includes(wordLower)) {
      results.push({
        word: wordInfo.word,
        category: wordInfo.category,
        severity: wordInfo.severity,
        suggestion: wordInfo.suggestion,
      });
    }
  }

  return results;
}
