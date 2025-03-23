import { Router } from 'express';
import authRoutes from './authRoutes';
import voterRoutes from './voterRoutes';
import electionRoutes from './electionRoutes';
import resultsRoutes from './resultsRoutes';
import ussdRoutes from './ussdRoutes';
import mobileRoutes from './mobileRoutes';
import adminRoutes from './adminRoutes';

const router = Router();

// Mount route modules
router.use('/auth', authRoutes);
router.use('/voter', voterRoutes);
router.use('/elections', electionRoutes);
router.use('/results', resultsRoutes);
router.use('/ussd', ussdRoutes);
router.use('/mobile', mobileRoutes);
router.use('/admin', adminRoutes);

export default router;
