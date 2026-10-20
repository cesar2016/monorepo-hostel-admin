import { Router } from 'express';
import { listProductos, getProductoById, createProducto, updateProducto } from './productos.controller.js';
import { authenticate } from '../../middlewares/authenticate.js';
import { validateBody } from '../../middlewares/validate.js';
import { createProductoSchema, updateProductoSchema } from '@hotel/shared';

const router = Router();

router.use(authenticate);

router.get('/', listProductos);
router.get('/:id', getProductoById);
router.post('/', validateBody(createProductoSchema), createProducto);
router.put('/:id', validateBody(updateProductoSchema), updateProducto);

export default router;
