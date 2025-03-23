import { Router } from 'express';
import v1Routes from './v1';

const router = Router();

// API version routes
router.use('/v1', v1Routes);

// Default route
router.use('/', (_req, res) => {
  res.status(200).json({
    status: 'success',
    message: 'Welcome to Nigeria E-Voting API',
    version: '1.0.0',
    apiDocumentation: '/api-docs',
  });
});

export default router;
