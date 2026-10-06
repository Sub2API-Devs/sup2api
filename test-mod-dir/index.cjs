#!/usr/bin/env node
// 测试 $.tool.register 注册的工具是否出现在 API 请求的 tools 数组中

const { on } = require('claude:hooks');

// 在 session.start 注册两个测试工具
on('session.start', async ($, e, next) => {
  console.error('[test] Registering tools...');

  const r1 = await $.tool.register({
    name: 'test_weather',
    description: 'Get weather for a city',
    inputSchema: {
      type: 'object',
      properties: {
        city: { type: 'string' }
      },
      required: ['city']
    }
  });
  console.error('[test] Registered:', JSON.stringify(r1));

  const r2 = await $.tool.register({
    name: 'test_search',
    description: 'Search the web',
    inputSchema: {
      type: 'object',
      properties: {
        query: { type: 'string' }
      }
    }
  });
  console.error('[test] Registered:', JSON.stringify(r2));

  return next(e);
});

// 在 prompt.compose 看注册的工具是否在 tools 列表中
on('prompt.compose', async ($, e, next) => {
  console.error('[test] prompt.compose tools:', JSON.stringify(e.tools));
  return next(e);
});

// 看工具是否被调用
on('tool.call', async ($, e, next) => {
  console.error('[test] tool.call:', e.tool, JSON.stringify(e.input));
  return next(e);
});
