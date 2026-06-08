// PM2 process definition for the Solana volume Telegram bot.
// Runs the TypeScript entry point directly via ts-node (transpile-only).
//
//   pm2 start ecosystem.config.js     # start
//   pm2 logs volume-bot               # tail logs
//   pm2 restart volume-bot            # restart after code/.env changes
//   pm2 stop volume-bot               # stop
//   pm2 save                          # persist process list

module.exports = {
  apps: [
    {
      name: 'volume-bot',
      script: './src/index.ts',
      cwd: __dirname,
      interpreter: 'node',
      interpreter_args: '-r ts-node/register',

      // ts-node: skip type-checking at runtime, use the project's tsconfig
      env: {
        TS_NODE_TRANSPILE_ONLY: 'true',
        TS_NODE_PROJECT: './tsconfig.json',
        NODE_ENV: 'production',
      },

      // a single Telegram poller only — never run more than one instance
      instances: 1,
      exec_mode: 'fork',

      // resilience
      autorestart: true,
      max_restarts: 15,
      restart_delay: 3000,
      min_uptime: '10s',
      max_memory_restart: '600M',

      // do NOT watch files (this is production; restart manually on changes)
      watch: false,

      // timestamped, separated logs under ./logs
      time: true,
      merge_logs: true,
      out_file: './logs/volume-bot.out.log',
      error_file: './logs/volume-bot.err.log',
    },
  ],
}
