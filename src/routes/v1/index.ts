import { Router } from 'express';
import authRoutes from './authRoutes';
import otpAuthRoutes from './otpAuthRoutes';
import voterRoutes from './voterRoutes';
import electionRoutes from './electionRoutes';
import resultsRoutes from './resultsRoutes';
import ussdRoutes from './ussdRoutes';
import mobileRoutes from './mobileRoutes';
import adminRoutes from './adminRoutes';
import publicRoutes from './publicRoutes';

const router = Router();

// Mount route modules
router.use('/auth', authRoutes);
router.use('/auth', otpAuthRoutes); // New OTP-based authentication
router.use('/public', publicRoutes); // Public routes (no authentication required)
router.use('/voter', voterRoutes);
router.use('/elections', electionRoutes);
router.use('/results', resultsRoutes);
router.use('/ussd', ussdRoutes);
router.use('/mobile', mobileRoutes);
router.use('/admin', adminRoutes);

export default router;
