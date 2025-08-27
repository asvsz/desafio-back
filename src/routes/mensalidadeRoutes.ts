import { Router } from 'express';
import { listarDisponiveis, listarTodas, pagarMensalidade } from '../controllers/mensalidadeController.js';

const router = Router();

router.get('/disponiveis', listarDisponiveis);
router.get('/', listarTodas);
router.patch('/:id/pagar', pagarMensalidade);

export default router;