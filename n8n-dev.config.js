module.exports = {
  // Enable custom nodes
  customNodesDir: './dist',
  
  // Development mode settings
  development: true,
  
  // Enable detailed logging
  logLevel: 'debug',
  
  // Database settings for development
  database: {
    type: 'sqlite',
    database: '~/.n8n/database.sqlite',
  },
  
  // Webhook settings
  webhookUrl: 'http://localhost:5678/',
  
  // Editor settings
  editorBaseUrl: 'http://localhost:5678/',
  
  // Security settings for development
  security: {
    jwtSecret: 'development-secret-key',
  },
  
  // Execution settings
  execution: {
    timeout: 30000,
    maxExecutionTime: 30000,
  },
  
  // Node settings
  nodes: {
    include: ['n8n-nodes-blue'],
  },
}; 