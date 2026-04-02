import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { getSupabaseClient } from '@/storage/database/supabase-client';
import { createPlatformAPI } from '@/lib/platform-api';

/**
 * 发布商品到平台
 * 
 * 支持发布到TikTok Shop和Shopee
 * 实际使用需要配置API密钥和环境变量
 */
export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: '未登录' }, { status: 401 });
    }

    const { productId, shopId, autoMatch = true } = await request.json();

    if (!productId || !shopId) {
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

    // 验证商品信息完整性
    if (!product.translated_title) {
      return NextResponse.json({ error: '商品标题未翻译' }, { status: 400 });
    }
    if (!product.selling_price) {
      return NextResponse.json({ error: '商品售价未设置' }, { status: 400 });
    }
    if (!product.original_images || product.original_images.length === 0) {
      return NextResponse.json({ error: '商品缺少图片' }, { status: 400 });
    }

    // 获取店铺信息
    const { data: shop, error: shopError } = await client
      .from('shops')
      .select('*')
      .eq('id', shopId)
      .eq('user_id', user.id)
      .maybeSingle();

    if (shopError || !shop) {
      return NextResponse.json({ error: '店铺不存在' }, { status: 404 });
    }

    if (!shop.is_active) {
      return NextResponse.json({ error: '店铺未授权或已失效' }, { status: 400 });
    }

    // 创建发布任务
    const { data: task, error: taskError } = await client
      .from('tasks')
      .insert({
        user_id: user.id,
        type: 'publish',
        status: 'processing',
        product_id: productId,
        details: {
          shop_id: shopId,
          platform: shop.platform,
          region: shop.region,
          auto_match: autoMatch,
        },
      })
      .select()
      .single();

    if (taskError || !task) {
      return NextResponse.json({ error: '创建任务失败' }, { status: 500 });
    }

    try {
      // 创建平台API客户端
      const platformAPI = createPlatformAPI(
        shop.platform as 'tiktok' | 'shopee',
        shop.access_token,
        shop.shop_id
      );

      let platformProductId: string;
      let categoryMatched = false;

      // 步骤1: 类目匹配（如果启用）
      let categoryId: number | undefined;
      if (autoMatch) {
        try {
          // 使用LLM匹配类目
          const matchResponse = await fetch('/api/category/match', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              productTitle: product.translated_title,
              productDescription: product.translated_description,
              platform: shop.platform,
            }),
          });

          if (matchResponse.ok) {
            const matchData = await matchResponse.json();
            categoryId = matchData.categoryId;
            categoryMatched = true;
          }
        } catch (matchError) {
          console.warn('类目匹配失败，将使用默认类目:', matchError);
        }
      }

      // 步骤2: 上传商品图片
      const uploadedImageUrls: string[] = [];
      for (const imageUrl of product.original_images.slice(0, 9)) { // 最多9张图
        try {
          if (shop.platform === 'tiktok') {
            const uploadResult = await (platformAPI as any).uploadImage(imageUrl);
            uploadedImageUrls.push(uploadResult.image_url);
          } else if (shop.platform === 'shopee') {
            const uploadResult = await (platformAPI as any).uploadImage(imageUrl);
            uploadedImageUrls.push(uploadResult.image_url);
          }
        } catch (uploadError) {
          console.error('图片上传失败:', uploadError);
          // 继续使用原始URL
          uploadedImageUrls.push(imageUrl);
        }
      }

      // 步骤3: 创建商品
      const productData: any = {
        name: product.translated_title,
        description: product.translated_description || product.original_description,
        images: uploadedImageUrls,
        price: product.selling_price,
        stock: product.stock || 999,
      };

      if (categoryId) {
        productData.category_id = categoryId;
      }

      // 添加商品属性（如果有）
      if (product.attributes) {
        productData.attributes = product.attributes;
      }

      // 根据平台创建商品
      if (shop.platform === 'tiktok') {
        const result = await (platformAPI as any).createProduct(productData);
        platformProductId = result.product_id;
      } else if (shop.platform === 'shopee') {
        const result = await (platformAPI as any).createProduct(productData);
        platformProductId = result.item_id.toString();
      } else {
        throw new Error(`不支持的平台: ${shop.platform}`);
      }

      // 更新商品状态
      await client
        .from('products')
        .update({
          status: 'published',
          target_shop_id: shopId,
          platform_product_id: platformProductId,
          published_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq('id', productId);

      // 更新任务状态
      await client
        .from('tasks')
        .update({
          status: 'completed',
          completed_at: new Date().toISOString(),
          result: {
            platform_product_id: platformProductId,
            platform: shop.platform,
            category_matched: categoryMatched,
            images_uploaded: uploadedImageUrls.length,
          },
        })
        .eq('id', task.id);

      return NextResponse.json({
        success: true,
        platformProductId,
        message: `商品已成功发布到 ${shop.shop_name}`,
        details: {
          categoryMatched,
          imagesUploaded: uploadedImageUrls.length,
        },
      });
    } catch (publishError: any) {
      console.error('发布失败:', publishError);

      // 更新任务失败状态
      await client
        .from('tasks')
        .update({
          status: 'failed',
          error_message: publishError.message,
        })
        .eq('id', task.id);

      // 返回详细错误信息
      return NextResponse.json(
        {
          error: publishError.message || '发布失败',
          details: {
            platform: shop.platform,
            suggestion: getErrorSuggestion(publishError.message, shop.platform),
          },
        },
        { status: 500 }
      );
    }
  } catch (error: any) {
    console.error('发布错误:', error);
    return NextResponse.json(
      { error: error.message || '发布失败' },
      { status: 500 }
    );
  }
}

/**
 * 获取错误建议
 */
function getErrorSuggestion(errorMessage: string, platform: string): string {
  if (errorMessage.includes('token') || errorMessage.includes('auth')) {
    return '店铺授权已过期，请重新授权店铺';
  }
  if (errorMessage.includes('category')) {
    return '商品类目不匹配，请检查商品分类';
  }
  if (errorMessage.includes('image')) {
    return '商品图片不符合要求，请检查图片尺寸和格式';
  }
  if (errorMessage.includes('price')) {
    return '商品价格设置有误，请检查定价规则';
  }
  if (errorMessage.includes('quota')) {
    return '已达到发布数量限制，请升级店铺等级';
  }
  
  return `发布到${platform}失败，请检查商品信息是否完整`;
}
