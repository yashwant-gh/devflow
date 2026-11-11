import type { Request, Response, NextFunction } from 'express';
import { itemsService } from '../services/items.service.js';
import type { AppError } from '../middleware/error.middleware.js';

export function getItems(_req: Request, res: Response): void {
  const items = itemsService.getAll();
  res.status(200).json({ data: items });
}

export function getItemById(req: Request, res: Response, next: NextFunction): void {
  const { id } = req.params;
  const item = itemsService.getById(id!);

  if (!item) {
    const error: AppError = Object.assign(new Error(`Item with id "${id}" not found.`), {
      statusCode: 404,
    });
    return next(error);
  }

  res.status(200).json({ data: item });
}

export function createItem(req: Request, res: Response, next: NextFunction): void {
  const { name, description } = req.body;

  if (!name) {
    const error: AppError = Object.assign(new Error('Field "name" is required.'), {
      statusCode: 400,
    });
    return next(error);
  }

  const item = itemsService.create({ name, description: description || '' });
  res.status(201).json({ data: item });
}
