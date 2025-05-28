// server.ts
import app from './app';

const port = process.env.APP_PORT || 3000;

async function startServer() {
  app.listen(port, () => {
    console.log(`Server is running on port ${port}`);
  });
}

startServer();
