import express, { Application } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import 'dotenv/config';

import authRoutes from './routers/auth.routes';
import assetRoutes from './routers/asset.routes';
import scriptRoutes from './routers/script.routes';

const app: Application = express();

app.use(express.json());
app.use(cors());
app.use(helmet());
app.use(morgan('dev'));

app.use('/api/auth', authRoutes);
app.use('/api/asset', assetRoutes);
app.use('/api/script', scriptRoutes);

export default app;
