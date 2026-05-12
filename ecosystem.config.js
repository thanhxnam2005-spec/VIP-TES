module.exports = {
  apps: [
    {
      name: 'novel-studio',
      script: 'npm',
      args: 'start',
      instances: 'max', // Chạy tối đa số core CPU của VPS để tăng hiệu năng
      exec_mode: 'cluster',
      env: {
        NODE_ENV: 'production',
        PORT: 3000
      }
    }
  ]
};
