import { pgTable, serial, varchar, text, timestamp, boolean, integer, numeric, jsonb, index } from "drizzle-orm/pg-core"
import { sql } from "drizzle-orm"

// 系统健康检查表
export const healthCheck = pgTable("health_check", {
	id: serial().notNull(),
	updatedAt: timestamp("updated_at", { withTimezone: true, mode: 'string' }).defaultNow(),
});

// 用户表
export const users = pgTable(
  "users",
  {
    id: varchar("id", { length: 36 }).primaryKey().default(sql`gen_random_uuid()`),
    email: varchar("email", { length: 255 }).notNull().unique(),
    name: varchar("name", { length: 128 }),
    avatar: varchar("avatar", { length: 512 }),
    password_hash: varchar("password_hash", { length: 256 }),
    role: varchar("role", { length: 20 }).notNull().default('user'),
    is_active: boolean("is_active").default(true).notNull(),
    created_at: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updated_at: timestamp("updated_at", { withTimezone: true }),
  },
  (table) => [
    index("users_email_idx").on(table.email),
  ]
);

// 店铺表 - TikTok Shop / Shopee 授权
export const shops = pgTable(
  "shops",
  {
    id: varchar("id", { length: 36 }).primaryKey().default(sql`gen_random_uuid()`),
    user_id: varchar("user_id", { length: 36 }).notNull().references(() => users.id),
    platform: varchar("platform", { length: 20 }).notNull(),
    shop_name: varchar("shop_name", { length: 255 }).notNull(),
    shop_id: varchar("shop_id", { length: 128 }).notNull(),
    region: varchar("region", { length: 20 }).notNull(),
    access_token: text("access_token"),
    refresh_token: text("refresh_token"),
    token_expires_at: timestamp("token_expires_at", { withTimezone: true }),
    is_active: boolean("is_active").default(true).notNull(),
    created_at: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updated_at: timestamp("updated_at", { withTimezone: true }),
  },
  (table) => [
    index("shops_user_id_idx").on(table.user_id),
    index("shops_platform_idx").on(table.platform),
  ]
);

// 商品表 - 采集的商品
export const products = pgTable(
  "products",
  {
    id: varchar("id", { length: 36 }).primaryKey().default(sql`gen_random_uuid()`),
    user_id: varchar("user_id", { length: 36 }).notNull().references(() => users.id),
    source_url: varchar("source_url", { length: 1024 }).notNull(),
    source_id: varchar("source_id", { length: 128 }),
    
    // 原始数据
    original_title: varchar("original_title", { length: 512 }),
    original_description: text("original_description"),
    original_price: numeric("original_price", { precision: 12, scale: 2 }),
    original_images: jsonb("original_images").$type<string[]>(),
    original_video: varchar("original_video", { length: 512 }),
    original_skus: jsonb("original_skus"),
    
    // 翻译后数据
    translated_title: varchar("translated_title", { length: 512 }),
    translated_description: text("translated_description"),
    target_language: varchar("target_language", { length: 10 }),
    
    // 处理后图片
    processed_images: jsonb("processed_images").$type<string[]>(),
    
    // 定价信息
    cost_price: numeric("cost_price", { precision: 12, scale: 2 }),
    shipping_cost: numeric("shipping_cost", { precision: 12, scale: 2 }),
    cross_border_shipping: numeric("cross_border_shipping", { precision: 12, scale: 2 }),
    selling_price: numeric("selling_price", { precision: 12, scale: 2 }),
    profit_margin: numeric("profit_margin", { precision: 5, scale: 2 }),
    
    // 发布信息
    status: varchar("status", { length: 20 }).notNull().default('draft'),
    target_shop_id: varchar("target_shop_id", { length: 36 }).references(() => shops.id),
    platform_product_id: varchar("platform_product_id", { length: 128 }),
    platform_category_id: varchar("platform_category_id", { length: 128 }),
    
    // 错误信息
    error_message: text("error_message"),
    
    created_at: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updated_at: timestamp("updated_at", { withTimezone: true }),
    published_at: timestamp("published_at", { withTimezone: true }),
  },
  (table) => [
    index("products_user_id_idx").on(table.user_id),
    index("products_status_idx").on(table.status),
    index("products_source_url_idx").on(table.source_url),
  ]
);

// 采集任务表
export const tasks = pgTable(
  "tasks",
  {
    id: varchar("id", { length: 36 }).primaryKey().default(sql`gen_random_uuid()`),
    user_id: varchar("user_id", { length: 36 }).notNull().references(() => users.id),
    type: varchar("type", { length: 20 }).notNull(),
    status: varchar("status", { length: 20 }).notNull().default('pending'),
    source_url: varchar("source_url", { length: 1024 }),
    product_id: varchar("product_id", { length: 36 }).references(() => products.id),
    
    // 任务详情
    details: jsonb("details"),
    progress: integer("progress").default(0),
    
    // 结果
    result: jsonb("result"),
    error_message: text("error_message"),
    retry_count: integer("retry_count").default(0),
    
    started_at: timestamp("started_at", { withTimezone: true }),
    completed_at: timestamp("completed_at", { withTimezone: true }),
    created_at: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updated_at: timestamp("updated_at", { withTimezone: true }),
  },
  (table) => [
    index("tasks_user_id_idx").on(table.user_id),
    index("tasks_status_idx").on(table.status),
    index("tasks_type_idx").on(table.type),
  ]
);

// 定价规则表
export const pricingRules = pgTable(
  "pricing_rules",
  {
    id: varchar("id", { length: 36 }).primaryKey().default(sql`gen_random_uuid()`),
    user_id: varchar("user_id", { length: 36 }).notNull().references(() => users.id),
    name: varchar("name", { length: 128 }).notNull(),
    
    // 汇率设置
    exchange_rate: numeric("exchange_rate", { precision: 10, scale: 4 }).notNull(),
    currency: varchar("currency", { length: 10 }).notNull(),
    
    // 费用设置
    platform_fee_rate: numeric("platform_fee_rate", { precision: 5, scale: 2 }).default('5.00'),
    shipping_cost: numeric("shipping_cost", { precision: 10, scale: 2 }).default('0'),
    cross_border_shipping: numeric("cross_border_shipping", { precision: 10, scale: 2 }).default('0'),
    
    // 利润设置
    profit_margin: numeric("profit_margin", { precision: 5, scale: 2 }).default('20.00'),
    
    // 阶梯定价
    tier_pricing: jsonb("tier_pricing"),
    
    is_default: boolean("is_default").default(false),
    is_active: boolean("is_active").default(true).notNull(),
    
    created_at: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updated_at: timestamp("updated_at", { withTimezone: true }),
  },
  (table) => [
    index("pricing_rules_user_id_idx").on(table.user_id),
  ]
);

// 通知表
export const notifications = pgTable(
  "notifications",
  {
    id: varchar("id", { length: 36 }).primaryKey().default(sql`gen_random_uuid()`),
    user_id: varchar("user_id", { length: 36 }).notNull().references(() => users.id),
    type: varchar("type", { length: 20 }).notNull(),
    title: varchar("title", { length: 255 }).notNull(),
    message: text("message"),
    is_read: boolean("is_read").default(false).notNull(),
    link: varchar("link", { length: 512 }),
    created_at: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    index("notifications_user_id_idx").on(table.user_id),
  ]
);

// 类型导出
export type User = typeof users.$inferSelect;
export type Shop = typeof shops.$inferSelect;
export type Product = typeof products.$inferSelect;
export type Task = typeof tasks.$inferSelect;
export type PricingRule = typeof pricingRules.$inferSelect;
export type Notification = typeof notifications.$inferSelect;
