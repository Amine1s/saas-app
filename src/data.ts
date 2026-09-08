import { ChartPoint } from './types';

// أكواد المحاكاة والبيانات الثابتة للتطبيق

export const CODE_SNIPPETS = {
  db: {
    title: 'الاتصال بقاعدة البيانات (database.js)',
    language: 'javascript',
    description: 'ملف تهيئة وإعداد مجمع الاتصالات مع قاعدة بيانات PostgreSQL.',
    code: `// config/database.js
const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' 
    ? { rejectUnauthorized: false } 
    : false
});

pool.on('connect', () => {
  console.log('PostgreSQL database connected successfully.');
});

pool.on('error', (err) => {
  console.error('Unexpected database connection error:', err);
  process.exit(-1);
});

module.exports = {
  query: (text, params) => pool.query(text, params),
  pool
};`
  },
  api: {
    title: 'مسارات إدارة المبيعات والمخزون (routes.js)',
    language: 'javascript',
    description: 'مسارات Express للتحكم في المخازن؛ إضافة منتج وتحديث كمية المخزون.',
    code: `// routes/products.js
const express = require('express');
const router = express.Router();
const db = require('../config/database');

// إضافة منتج جديد
router.post('/products', async (req, res) => {
  const { name, sku, price, quantity, description } = req.body;

  if (!name || !sku || price === undefined || quantity === undefined) {
    return res.status(400).json({
      success: false,
      message: 'جميع الحقول الأساسية مطلوبة.'
    });
  }

  try {
    const queryText = \`
      INSERT INTO products (name, sku, price, quantity, description, created_at, updated_at)
      VALUES ($1, $2, $3, $4, $5, NOW(), NOW())
      RETURNING *;
    \`;
    const values = [name, sku, Number(price), Number(quantity), description || ''];
    const result = await db.query(queryText, values);

    return res.status(201).json({
      success: true,
      message: 'تمت إضافة المنتج بنجاح.',
      product: result.rows[0]
    });

  } catch (error) {
    console.error(error);
    if (error.code === '23505') {
      return res.status(409).json({
        success: false,
        message: 'مستعمل مسبقاً SKU رمز التعريف.'
      });
    }
    return res.status(500).json({
      success: false,
      message: 'حدث خطأ داخلي بالخادم.'
    });
  }
});

// تحديث مستويات المخازن
router.patch('/products/:id/stock', async (req, res) => {
  const { id } = req.params;
  const { quantity } = req.body;

  if (quantity === undefined || isNaN(quantity) || Number(quantity) < 0) {
    return res.status(400).json({
      success: false,
      message: 'الرجاء توفير كمية صحيحة.'
    });
  }

  try {
    const queryText = \`
      UPDATE products
      SET quantity = $1, updated_at = NOW()
      WHERE id = $2
      RETURNING *;
    \`;
    const result = await db.query(queryText, [Number(quantity), id]);

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'المنتج غير موجود.'
      });
    }

    return res.status(200).json({
      success: true,
      message: 'تم تحديث كمية المخزون بنجاح.',
      product: result.rows[0]
    });

  } catch (error) {
    console.error(error);
    return res.status(500).json({
      success: false,
      message: 'فشل التحديث بسبب خطأ داخلي.'
    });
  }
});

module.exports = router;`
  },
  env: {
    title: 'إعدادات البيئة ومخطط الجدول (schema.sql & .env)',
    language: 'sql',
    description: 'ملف المتغيرات البيئية وهيكل الجدول لتهيئة وإعداد قاعدة البيانات.',
    code: `# -------------------------------------------------------------
# 1. Server Environment Configuration (.env)
# -------------------------------------------------------------
PORT=3000
DATABASE_URL=postgresql://user:pass@endpoint.com:5432/db
NODE_ENV=development

-- -------------------------------------------------------------
-- 2. SQL schema script to populate products constraints
-- -------------------------------------------------------------
CREATE TABLE products (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    sku VARCHAR(100) UNIQUE NOT NULL,
    price DECIMAL(10, 2) NOT NULL DEFAULT 0.00,
    quantity INTEGER NOT NULL DEFAULT 0,
    description TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_products_sku ON products(sku);`
  }
};

export const WEEKLY_CHART_DATA: ChartPoint[] = [
  { label: 'السبت', sales: 950, invoices: 3 },
  { label: 'الأحد', sales: 1320, invoices: 5 },
  { label: 'الأثنين', sales: 1850, invoices: 8 },
  { label: 'الثلاثاء', sales: 1100, invoices: 4 },
  { label: 'الأربعاء', sales: 2400, invoices: 11 },
  { label: 'الخميس', sales: 3100, invoices: 14 },
  { label: 'الجمعة', sales: 2150, invoices: 9 },
];

export const MONTHLY_CHART_DATA: ChartPoint[] = [
  { label: 'يناير', sales: 18500, invoices: 72 },
  { label: 'فبراير', sales: 21400, invoices: 94 },
  { label: 'مارس', sales: 29800, invoices: 115 },
  { label: 'أبريل', sales: 24200, invoices: 88 },
  { label: 'مايو', sales: 34900, invoices: 142 },
  { label: 'يونيو', sales: 28800, invoices: 120 },
];
