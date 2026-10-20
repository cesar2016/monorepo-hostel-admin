import { Router } from 'express';
import { login, getMe, recoverPassword } from './auth.controller.js';
import { authenticate } from '../../middlewares/authenticate.js';
import { validateBody } from '../../middlewares/validate.js';
import { loginSchema, recoverPasswordSchema } from '@hotel/shared';

const router = Router();

router.post('/login', validateBody(loginSchema), login);
router.post('/recuperar-clave', validateBody(recoverPasswordSchema), recoverPassword);
router.get('/me', authenticate, getMe);

export default router;
