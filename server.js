import app from './src/app.js';
import { PORT } from './src/config.js';

const server = app.listen(PORT, '0.0.0.0', () => {
  console.log(`FairShift listening on http://0.0.0.0:${PORT}`);
});

for (const signal of ['SIGTERM', 'SIGINT']) {
  process.on(signal, () => {
    console.log(`${signal} received, closing server`);
    server.close(() => process.exit(0));
  });
}
