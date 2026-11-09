import { Router } from 'express';
import { getItems, getItemById, createItem } from '../controllers/items.controller.js';

const router = Router();

router.get('/', getItems);
router.get('/:id', getItemById);
router.post('/', createItem);

export const itemsRoutes = router;
