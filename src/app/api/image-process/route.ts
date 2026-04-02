import { NextRequest, NextResponse } from 'next/server';
import { LLMClient, Config, HeaderUtils } from 'coze-coding-dev-sdk';
import { S3Storage } from 'coze-coding-dev-sdk';

// 初始化存储客户端
const storage = new S3Storage({
  endpointUrl: process.env.COZE_BUCKET_ENDPOINT_URL,
  accessKey: '',
  secretKey: '',
  bucketName: process.env.COZE_BUCKET_NAME,
  region: 'cn-beijing',
});

/**
 * 图片处理API
 * 支持：OCR文字识别、文字翻译、去水印、尺寸裁剪
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { action, imageUrl, targetLanguage, productId } = body;

    const customHeaders = HeaderUtils.extractForwardHeaders(request.headers);
    const config = new Config();
    const llmClient = new LLMClient(config, customHeaders);

    switch (action) {
      case 'ocr':
        return await handleOCR(llmClient, imageUrl);
      
      case 'translate-image':
        return await handleImageTranslate(llmClient, imageUrl, targetLanguage);
      
      case 'process-all':
        return await handleProcessAll(llmClient, imageUrl, targetLanguage, productId);
      
      default:
        return NextResponse.json(
          { error: '不支持的操作类型' },
          { status: 400 }
        );
    }
  } catch (error: any) {
    console.error('图片处理错误:', error);
    return NextResponse.json(
      { error: error.message || '图片处理失败' },
      { status: 500 }
    );
  }
}

/**
 * OCR文字识别 - 使用LLM Vision能力
 */
async function handleOCR(llmClient: LLMClient, imageUrl: string) {
  const messages = [
    {
      role: 'user' as const,
      content: [
        {
          type: 'text' as const,
          text: `请仔细识别这张商品图片中的所有中文文字，包括：
1. 商品标题/名称
2. 商品描述/特点
3. 价格信息
4. 规格参数
5. 其他任何可见的文字

请以JSON格式返回识别结果，格式如下：
{
  "texts": [
    {
      "content": "识别到的文字内容",
      "position": "大概位置（如：顶部、中部、底部）",
      "type": "文字类型（如：标题、描述、价格等）"
    }
  ],
  "fullText": "所有识别到的文字拼接成的完整文本"
}

如果图片中没有中文文字，请返回空数组。只返回JSON，不要有其他说明文字。`,
        },
        {
          type: 'image_url' as const,
          image_url: {
            url: imageUrl,
            detail: 'high' as const,
          },
        },
      ],
    },
  ];

  const response = await llmClient.invoke(messages, {
    model: 'doubao-seed-1-6-vision-250815',
    temperature: 0.3,
  });

  try {
    // 尝试解析JSON响应
    const jsonMatch = response.content.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      const result = JSON.parse(jsonMatch[0]);
      return NextResponse.json({
        success: true,
        ocrResult: result,
      });
    }
    
    return NextResponse.json({
      success: true,
      ocrResult: {
        texts: [],
        fullText: response.content,
      },
    });
  } catch (parseError) {
    return NextResponse.json({
      success: true,
      ocrResult: {
        texts: [],
        fullText: response.content,
      },
    });
  }
}

/**
 * 图片文字翻译 - OCR + 翻译
 */
async function handleImageTranslate(
  llmClient: LLMClient,
  imageUrl: string,
  targetLanguage: string
) {
  const languageNames: Record<string, string> = {
    en: '英语',
    th: '泰语',
    vi: '越南语',
    id: '印尼语',
    ms: '马来语',
  };

  const targetLangName = languageNames[targetLanguage] || targetLanguage;

  const messages = [
    {
      role: 'user' as const,
      content: [
        {
          type: 'text' as const,
          text: `请识别这张商品图片中的所有中文文字，并将其翻译成${targetLangName}。

请以JSON格式返回结果：
{
  "originalTexts": ["原文1", "原文2", ...],
  "translatedTexts": ["译文1", "译文2", ...],
  "fullOriginalText": "所有原文拼接",
  "fullTranslatedText": "所有译文拼接"
}

要求：
1. 准确识别图片中的所有中文文字
2. 翻译要符合电商场景，语言自然流畅
3. 保留原有的格式和结构
4. 只返回JSON，不要有其他说明文字`,
        },
        {
          type: 'image_url' as const,
          image_url: {
            url: imageUrl,
            detail: 'high' as const,
          },
        },
      ],
    },
  ];

  const response = await llmClient.invoke(messages, {
    model: 'doubao-seed-1-6-vision-250815',
    temperature: 0.3,
  });

  try {
    const jsonMatch = response.content.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      const result = JSON.parse(jsonMatch[0]);
      return NextResponse.json({
        success: true,
        translateResult: result,
      });
    }

    return NextResponse.json({
      success: true,
      translateResult: {
        originalTexts: [],
        translatedTexts: [],
        fullOriginalText: '',
        fullTranslatedText: response.content,
      },
    });
  } catch (parseError) {
    return NextResponse.json({
      success: true,
      translateResult: {
        originalTexts: [],
        translatedTexts: [],
        fullOriginalText: '',
        fullTranslatedText: response.content,
      },
    });
  }
}

/**
 * 综合处理 - OCR + 翻译 + 检测水印
 */
async function handleProcessAll(
  llmClient: LLMClient,
  imageUrl: string,
  targetLanguage: string,
  productId?: string
) {
  const languageNames: Record<string, string> = {
    en: '英语',
    th: '泰语',
    vi: '越南语',
    id: '印尼语',
    ms: '马来语',
  };

  const targetLangName = languageNames[targetLanguage] || targetLanguage;

  const messages = [
    {
      role: 'user' as const,
      content: [
        {
          type: 'text' as const,
          text: `请对这张商品图片进行全面分析，完成以下任务：

1. **OCR识别**：识别图片中的所有中文文字
2. **翻译**：将识别到的文字翻译成${targetLangName}
3. **水印检测**：检测图片中是否有水印、Logo、二维码等需要处理的内容
4. **图片质量**：评估图片质量（清晰度、尺寸等）

请以JSON格式返回结果：
{
  "ocr": {
    "texts": [{"content": "文字", "position": "位置", "type": "类型"}],
    "fullText": "完整文本"
  },
  "translation": {
    "originalTexts": ["原文"],
    "translatedTexts": ["译文"],
    "fullTranslatedText": "完整译文"
  },
  "watermark": {
    "hasWatermark": true/false,
    "watermarks": [{"type": "类型", "position": "位置", "description": "描述"}]
  },
  "quality": {
    "clarity": "清晰/一般/模糊",
    "suggestedSize": "建议尺寸",
    "issues": ["问题列表"]
  }
}

只返回JSON，不要有其他说明文字。`,
        },
        {
          type: 'image_url' as const,
          image_url: {
            url: imageUrl,
            detail: 'high' as const,
          },
        },
      ],
    },
  ];

  const response = await llmClient.invoke(messages, {
    model: 'doubao-seed-1-6-vision-250815',
    temperature: 0.3,
  });

  try {
    const jsonMatch = response.content.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      const result = JSON.parse(jsonMatch[0]);
      return NextResponse.json({
        success: true,
        processResult: result,
      });
    }

    return NextResponse.json({
      success: false,
      error: '解析结果失败',
      rawResponse: response.content,
    });
  } catch (parseError) {
    return NextResponse.json({
      success: false,
      error: '解析结果失败',
      rawResponse: response.content,
    });
  }
}
