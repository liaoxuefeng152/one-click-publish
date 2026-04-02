/**
 * 平台API配置
 * 
 * 注意：实际使用时需要替换为真实的API密钥和配置
 * TikTok Shop API文档: https://partner.tiktokshop.com/docv2/page/
 * Shopee API文档: https://partner.shopeemobile.com/doccenter
 */

export const platformConfig = {
  tiktok: {
    name: 'TikTok Shop',
    baseUrl: 'https://open-api.tiktokglobalshop.com',
    authUrl: 'https://services.tiktokshop.com/open/authorize',
    // 需要从环境变量获取
    appId: process.env.TIKTOK_APP_ID || '',
    appSecret: process.env.TIKTOK_APP_SECRET || '',
    // OAuth回调URL
    redirectUri: `${process.env.COZE_PROJECT_DOMAIN_DEFAULT}/api/platforms/tiktok/callback`,
    // API版本
    apiVersion: '202312',
    // 支持的地区
    regions: ['TH', 'MY', 'VN', 'PH', 'UK', 'US'],
    // 商品图片要求
    imageRequirements: {
      minWidth: 800,
      minHeight: 800,
      maxWidth: 5000,
      maxHeight: 5000,
      maxSize: 5 * 1024 * 1024, // 5MB
      formats: ['jpg', 'jpeg', 'png'],
    },
  },

  shopee: {
    name: 'Shopee',
    baseUrl: 'https://partner.shopeemobile.com',
    authUrl: 'https://partner.shopeemobile.com/api/v2/shop/auth_partner',
    // 需要从环境变量获取
    partnerId: process.env.SHOPEE_PARTNER_ID || '',
    partnerKey: process.env.SHOPEE_PARTNER_KEY || '',
    // OAuth回调URL
    redirectUri: `${process.env.COZE_PROJECT_DOMAIN_DEFAULT}/api/platforms/shopee/callback`,
    // API版本
    apiVersion: 'v2',
    // 支持的地区
    regions: ['TH', 'MY', 'VN', 'ID', 'PH', 'SG', 'TW'],
    // 商品图片要求
    imageRequirements: {
      minWidth: 330,
      minHeight: 330,
      maxWidth: 5000,
      maxHeight: 5000,
      maxSize: 10 * 1024 * 1024, // 10MB
      formats: ['jpg', 'jpeg', 'png'],
    },
  },
};

/**
 * 生成TikTok Shop授权URL
 */
export function generateTikTokAuthUrl(state: string): string {
  const config = platformConfig.tiktok;
  const params = new URLSearchParams({
    app_id: config.appId,
    state: state,
    redirect_uri: config.redirectUri,
  });
  
  return `${config.authUrl}?${params.toString()}`;
}

/**
 * 生成Shopee授权URL
 */
export function generateShopeeAuthUrl(state: string): string {
  const config = platformConfig.shopee;
  const basePath = '/api/v2/shop/auth_partner';
  const baseString = `${config.partnerId}${basePath}${config.redirectUri}`;
  
  // 生成签名 (实际使用时需要使用HMAC-SHA256)
  // 这里使用占位符，实际实现需要引入crypto库
  const sign = 'GENERATE_SIGN_HERE'; // TODO: 实现签名生成
  
  const params = new URLSearchParams({
    partner_id: config.partnerId,
    redirect: config.redirectUri,
    sign: sign,
    state: state,
  });
  
  return `${config.authUrl}?${params.toString()}`;
}

/**
 * TikTok Shop API请求封装
 */
export class TikTokShopAPI {
  private accessToken: string;
  private shopId: string;
  private baseUrl: string;

  constructor(accessToken: string, shopId: string) {
    this.accessToken = accessToken;
    this.shopId = shopId;
    this.baseUrl = platformConfig.tiktok.baseUrl;
  }

  /**
   * 通用请求方法
   */
  private async request(
    method: 'GET' | 'POST' | 'PUT' | 'DELETE',
    path: string,
    params?: Record<string, any>,
    data?: Record<string, any>
  ) {
    const url = new URL(`${this.baseUrl}${path}`);
    
    // 添加通用参数
    url.searchParams.set('app_key', platformConfig.tiktok.appId);
    url.searchParams.set('shop_id', this.shopId);
    url.searchParams.set('timestamp', Math.floor(Date.now() / 1000).toString());
    
    // 添加业务参数
    if (params) {
      Object.entries(params).forEach(([key, value]) => {
        url.searchParams.set(key, String(value));
      });
    }

    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      'x-tts-access-token': this.accessToken,
    };

    const options: RequestInit = {
      method,
      headers,
    };

    if (data && method !== 'GET') {
      options.body = JSON.stringify(data);
    }

    const response = await fetch(url.toString(), options);
    const result = await response.json();

    if (!response.ok || result.code !== 0) {
      throw new Error(result.message || 'TikTok Shop API请求失败');
    }

    return result.data;
  }

  /**
   * 获取商品分类
   */
  async getCategories(parentId?: number) {
    return this.request('GET', '/api/products/categories', {
      parent_id: parentId,
    });
  }

  /**
   * 获取商品属性模板
   */
  async getProductAttributes(categoryId: number) {
    return this.request('GET', '/api/products/attributes', {
      category_id: categoryId,
    });
  }

  /**
   * 创建商品
   */
  async createProduct(productData: {
    name: string;
    description: string;
    category_id: number;
    images: string[];
    price: number;
    stock: number;
    attributes?: Record<string, any>;
    skus?: any[];
  }) {
    return this.request('POST', '/api/products/create', undefined, productData);
  }

  /**
   * 更新商品
   */
  async updateProduct(productId: string, productData: Partial<{
    name: string;
    description: string;
    images: string[];
    price: number;
    stock: number;
    attributes: Record<string, any>;
  }>) {
    return this.request('PUT', `/api/products/${productId}`, undefined, productData);
  }

  /**
   * 获取商品详情
   */
  async getProduct(productId: string) {
    return this.request('GET', `/api/products/${productId}`);
  }

  /**
   * 获取商品列表
   */
  async getProducts(pageNumber: number = 1, pageSize: number = 20) {
    return this.request('GET', '/api/products/search', {
      page_number: pageNumber,
      page_size: pageSize,
    });
  }

  /**
   * 上传商品图片
   */
  async uploadImage(imageUrl: string) {
    return this.request('POST', '/api/media/upload', undefined, {
      image_url: imageUrl,
    });
  }
}

/**
 * Shopee API请求封装
 */
export class ShopeeAPI {
  private accessToken: string;
  private shopId: string;
  private baseUrl: string;
  private partnerId: string;
  private partnerKey: string;

  constructor(accessToken: string, shopId: string) {
    this.accessToken = accessToken;
    this.shopId = shopId;
    this.baseUrl = platformConfig.shopee.baseUrl;
    this.partnerId = platformConfig.shopee.partnerId;
    this.partnerKey = platformConfig.shopee.partnerKey;
  }

  /**
   * 生成签名
   */
  private generateSign(path: string, timestamp: number): string {
    const baseString = `${this.partnerId}${path}${timestamp}${this.accessToken}${this.shopId}`;
    // TODO: 使用HMAC-SHA256生成签名
    // 实际实现: crypto.createHmac('sha256', this.partnerKey).update(baseString).digest('hex')
    return 'GENERATE_SIGN_HERE';
  }

  /**
   * 通用请求方法
   */
  private async request(
    method: 'GET' | 'POST',
    path: string,
    data?: Record<string, any>
  ) {
    const timestamp = Math.floor(Date.now() / 1000);
    const sign = this.generateSign(path, timestamp);
    
    const url = new URL(`${this.baseUrl}${path}`);
    url.searchParams.set('partner_id', this.partnerId);
    url.searchParams.set('timestamp', timestamp.toString());
    url.searchParams.set('access_token', this.accessToken);
    url.searchParams.set('shop_id', this.shopId);
    url.searchParams.set('sign', sign);

    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };

    const options: RequestInit = {
      method,
      headers,
    };

    if (data && method === 'POST') {
      options.body = JSON.stringify(data);
    }

    const response = await fetch(url.toString(), options);
    const result = await response.json();

    if (!response.ok || result.error) {
      throw new Error(result.message || result.error_msg || 'Shopee API请求失败');
    }

    return result.response || result;
  }

  /**
   * 获取商品分类
   */
  async getCategories(language: string = 'en') {
    return this.request('GET', '/api/v2/product/get_category', {
      language,
    });
  }

  /**
   * 获取商品属性
   */
  async getProductAttributes(categoryId: number, language: string = 'en') {
    return this.request('GET', '/api/v2/product/get_attribute', {
      category_id: categoryId,
      language,
    });
  }

  /**
   * 创建商品
   */
  async createProduct(productData: {
    category_id: number;
    name: string;
    description: string;
    images: string[];
    price: number;
    stock: number;
    attributes?: any[];
    logistics?: any;
  }) {
    return this.request('POST', '/api/v2/product/add_item', productData);
  }

  /**
   * 更新商品
   */
  async updateProduct(itemId: number, productData: Partial<{
    name: string;
    description: string;
    images: string[];
    price: number;
    stock: number;
  }>) {
    return this.request('POST', '/api/v2/product/update_item', {
      item_id: itemId,
      ...productData,
    });
  }

  /**
   * 获取商品详情
   */
  async getProduct(itemId: number) {
    return this.request('GET', '/api/v2/product/get_item_info', {
      item_id: itemId,
    });
  }

  /**
   * 获取商品列表
   */
  async getProducts(offset: number = 0, pageSize: number = 20) {
    return this.request('GET', '/api/v2/product/get_item_list', {
      offset,
      page_size: pageSize,
    });
  }

  /**
   * 上传商品图片
   */
  async uploadImage(imageUrl: string) {
    return this.request('POST', '/api/v2/media_space/upload_image', {
      image_url: imageUrl,
    });
  }
}

/**
 * 平台API工厂
 */
export function createPlatformAPI(platform: 'tiktok' | 'shopee', accessToken: string, shopId: string) {
  switch (platform) {
    case 'tiktok':
      return new TikTokShopAPI(accessToken, shopId);
    case 'shopee':
      return new ShopeeAPI(accessToken, shopId);
    default:
      throw new Error(`不支持的平台: ${platform}`);
  }
}
