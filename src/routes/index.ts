import { Router } from 'express';
import v1Routes from './v1';

const router = Router();

// API version routes - must be defined before the default route
router.use('/', v1Routes);

// Default route - should only respond to exact '/' path, not all routes
router.get('/', (_req, res) => {
  res.status(200).json({
    status: 'success',
    message: 'Welcome to Nigeria E-Voting API',
    version: '1.0.0',
    apiDocumentation: '/api-docs',
  });
});

export default router;
