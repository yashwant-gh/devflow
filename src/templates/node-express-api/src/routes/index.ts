import { Router } from 'express';
import { healthRoutes } from './health.routes.js';
import { itemsRoutes } from './items.routes.js';

const router = Router();

router.use('/health', healthRoutes);
router.use('/items', itemsRoutes);

export const apiRoutes = router;
