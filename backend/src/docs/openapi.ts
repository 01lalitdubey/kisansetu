/**
 * Compact OpenAPI description served at GET /api/docs (Swagger UI).
 * Not exhaustive — it documents the endpoints the three dashboards use.
 */
export const openapiSpec = {
  openapi: '3.0.3',
  info: {
    title: 'KisanSetu AI API',
    version: '1.0.0',
    description:
      'REST API powering the Farmer, Procurement Centre and Admin dashboards. ' +
      'The AI endpoints use a deterministic service that a Python ML service will replace later.',
  },
  servers: [{ url: '/api' }],
  components: {
    securitySchemes: {
      bearerAuth: { type: 'http', scheme: 'bearer', bearerFormat: 'JWT' },
    },
    schemas: {
      Success: { type: 'object', properties: { success: { type: 'boolean' }, data: {} } },
      Error: {
        type: 'object',
        properties: { success: { type: 'boolean', example: false }, message: { type: 'string' } },
      },
    },
  },
  security: [{ bearerAuth: [] }],
  paths: {
    '/health': { get: { summary: 'Liveness probe', security: [], responses: { 200: { description: 'OK' } } } },
    '/auth/login': {
      post: {
        summary: 'Login with email/mobile + password',
        security: [],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: { identifier: { type: 'string' }, password: { type: 'string' } },
                required: ['identifier', 'password'],
              },
              example: { identifier: 'farmer@demo.com', password: 'demo1234' },
            },
          },
        },
        responses: { 200: { description: 'JWT + user' }, 401: { description: 'Invalid credentials' } },
      },
    },
    '/auth/register': { post: { summary: 'Farmer self-signup', security: [], responses: { 201: { description: 'Created' } } } },
    '/auth/me': { get: { summary: 'Current user profile', responses: { 200: { description: 'User' } } } },

    '/farmers/{id}': { get: { summary: 'Farmer profile', responses: { 200: { description: 'Farmer' } } } },
    '/farmers/{id}/history': { get: { summary: 'Procurement history', responses: { 200: { description: 'Records' } } } },
    '/farmers/{id}/notifications': { get: { summary: 'Farmer notifications', responses: { 200: { description: 'List' } } } },

    '/centers': { get: { summary: 'All procurement centres', security: [], responses: { 200: { description: 'Centres' } } } },
    '/centers/{id}': { get: { summary: 'One centre (with predicted wait)', security: [], responses: { 200: { description: 'Centre' } } } },
    '/centers/{id}/schedules': { get: { summary: 'Centre schedules', security: [], responses: { 200: { description: 'Schedules' } } } },
    '/centers/{id}/farmers': { get: { summary: 'Farmers booked at a centre', responses: { 200: { description: 'Farmers' } } } },
    '/centers/{id}/analytics': { get: { summary: 'Centre analytics', security: [], responses: { 200: { description: 'Analytics' } } } },

    '/schedules': { get: { summary: 'All schedules', security: [], responses: { 200: { description: 'Schedules' } } } },
    '/schedules/recommended': {
      get: {
        summary: 'AI recommended slot (deterministic)',
        security: [],
        parameters: [{ name: 'centerId', in: 'query', required: true, schema: { type: 'string' } }],
        responses: { 200: { description: 'Recommendation' } },
      },
    },

    '/tokens': {
      post: {
        summary: 'Book a slot → generate a token',
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  farmerId: { type: 'string' },
                  centerId: { type: 'string' },
                  scheduleId: { type: 'string' },
                  cropId: { type: 'string' },
                  quantity: { type: 'number' },
                },
                required: ['farmerId', 'centerId', 'scheduleId', 'cropId', 'quantity'],
              },
            },
          },
        },
        responses: { 201: { description: 'Token' }, 409: { description: 'Slot full / duplicate' } },
      },
    },
    '/tokens/{id}': {
      get: { summary: 'Token detail', security: [], responses: { 200: { description: 'Token' } } },
      delete: { summary: 'Cancel token (status → CANCELLED)', responses: { 200: { description: 'Cancelled' } } },
    },

    '/queue/{centerId}': { get: { summary: 'Live queue snapshot (poll every 5–10s)', security: [], responses: { 200: { description: 'Queue' } } } },
    '/queue/{centerId}/process-next': { post: { summary: 'Officer: finish current, call next', responses: { 200: { description: 'Queue' } } } },
    '/queue/{centerId}/skip': { post: { summary: 'Officer: skip a token', responses: { 200: { description: 'Queue' } } } },
    '/queue/{centerId}/complete': { post: { summary: 'Officer: mark complete → create procurement', responses: { 200: { description: 'Procurement + queue' } } } },
    '/queue/{centerId}/running': { post: { summary: 'Officer: pause / resume queue', responses: { 200: { description: 'Queue' } } } },

    '/procurements': {
      get: { summary: 'List procurements', responses: { 200: { description: 'List' } } },
      post: { summary: 'Record a procurement', responses: { 201: { description: 'Procurement' } } },
    },

    '/notifications': {
      get: { summary: 'List notifications', security: [], responses: { 200: { description: 'List' } } },
      post: { summary: 'Create a notification', responses: { 201: { description: 'Notification' } } },
    },
    '/notifications/{farmerId}': { get: { summary: 'Notifications for a farmer', security: [], responses: { 200: { description: 'List' } } } },

    '/admin/overview': { get: { summary: 'Admin head-line metrics', responses: { 200: { description: 'Overview' } } } },
    '/admin/centers': { get: { summary: 'All centres for monitoring', responses: { 200: { description: 'Centres' } } } },
    '/admin/insights': { get: { summary: 'AI insights + active recommendation', responses: { 200: { description: 'Insights' } } } },

    '/analytics/farmers-served': { get: { summary: 'Recharts line series', security: [], responses: { 200: { description: 'Series' } } } },
    '/analytics/waiting-time': { get: { summary: 'Recharts line series', security: [], responses: { 200: { description: 'Series' } } } },
    '/analytics/center-utilization': { get: { summary: 'Recharts bar series', security: [], responses: { 200: { description: 'Series' } } } },
    '/analytics/crop-procurement': { get: { summary: 'Recharts donut series', security: [], responses: { 200: { description: 'Series' } } } },
    '/analytics/peak-hours': { get: { summary: 'Recharts bar series', security: [], responses: { 200: { description: 'Series' } } } },

    '/ai/waiting-time': { post: { summary: 'Deterministic wait prediction', security: [], responses: { 200: { description: 'predictedWait, confidence, factors' } } } },
    '/ai/recommend-slot': { post: { summary: 'Best slot recommendation', security: [], responses: { 200: { description: 'recommendedSlot, reasons' } } } },
    '/ai/center-load': { get: { summary: 'Per-centre load levels', security: [], responses: { 200: { description: 'Loads' } } } },
    '/ai/load-balancing': { get: { summary: 'Detect overloaded centre + redirect plan', security: [], responses: { 200: { description: 'Recommendation | null' } } } },
    '/ai/load-balancing/apply': { post: { summary: 'Apply a redirect recommendation', responses: { 200: { description: 'Updated centres' } } } },

    '/demo/high-demand': { post: { summary: 'Demo: Amer surges + AI reacts', responses: { 200: { description: 'Centre + recommendation' } } } },
    '/demo/queue-reduction': { post: { summary: 'Demo: queues drain', responses: { 200: { description: 'Centres' } } } },
    '/demo/schedule-change': { post: { summary: 'Demo: move the demo farmer slot', responses: { 200: { description: 'Schedules' } } } },
    '/demo/process-token': { post: { summary: 'Demo: advance primary queue', responses: { 200: { description: 'Queue' } } } },
    '/demo/reset': { post: { summary: 'Demo: restore seeded state', responses: { 200: { description: 'Centres + queue' } } } },
  },
} as const;
