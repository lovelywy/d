
import { z } from 'zod';
import { insertSiteSchema, sites, history, insertHistorySchema } from './schema';

// ============================================
// SHARED ERROR SCHEMAS
// ============================================
export const errorSchemas = {
  validation: z.object({
    message: z.string(),
    field: z.string().optional(),
  }),
  notFound: z.object({
    message: z.string(),
  }),
  internal: z.object({
    message: z.string(),
  }),
};

// ============================================
// API CONTRACT
// ============================================
export const api = {
  rates: {
    get: {
      method: 'GET' as const,
      path: '/api/rates/usdt-thb',
      responses: {
        200: z.object({ price: z.string() }),
        500: errorSchemas.internal,
      },
    }
  },
  sites: {
    list: {
      method: 'GET' as const,
      path: '/api/sites',
      responses: {
        200: z.array(z.custom<typeof sites.$inferSelect>()),
      },
    },
    create: {
      method: 'POST' as const,
      path: '/api/sites',
      input: insertSiteSchema,
      responses: {
        201: z.custom<typeof sites.$inferSelect>(),
        400: errorSchemas.validation,
      },
    },
    update: {
      method: 'PUT' as const,
      path: '/api/sites/:id',
      input: insertSiteSchema.partial(),
      responses: {
        200: z.custom<typeof sites.$inferSelect>(),
        404: errorSchemas.notFound,
      },
    },
    delete: {
      method: 'DELETE' as const,
      path: '/api/sites/:id',
      responses: {
        204: z.void(),
        404: errorSchemas.notFound,
      },
    },
    resetTurnover: {
      method: 'POST' as const,
      path: '/api/sites/reset-turnover',
      responses: {
        200: z.object({ message: z.string() }),
      },
    }
  },
  history: {
    list: {
      method: 'GET' as const,
      path: '/api/history',
      responses: {
        200: z.array(z.custom<typeof history.$inferSelect>()),
      },
    },
    create: {
      method: 'POST' as const,
      path: '/api/history',
      input: insertHistorySchema,
      responses: {
        201: z.custom<typeof history.$inferSelect>(),
      },
    },
    update: {
      method: 'PUT' as const,
      path: '/api/history/:id',
      input: z.object({
        userName: z.string().optional(),
        profit: z.string().optional(),
        initialThb: z.string().optional(),
        totalUsdt: z.string().optional(),
      }),
      responses: {
        200: z.custom<typeof history.$inferSelect>(),
        404: errorSchemas.notFound,
      },
    },
    delete: {
      method: 'DELETE' as const,
      path: '/api/history/:id',
      responses: {
        204: z.void(),
        404: errorSchemas.notFound,
      },
    }
  }
};

export function buildUrl(path: string, params?: Record<string, string | number>): string {
  let url = path;
  if (params) {
    Object.entries(params).forEach(([key, value]) => {
      if (url.includes(`:${key}`)) {
        url = url.replace(`:${key}`, String(value));
      }
    });
  }
  return url;
}
