import { Router } from 'express';
import { criarAcordo, listarAcordos, listarFinalizados } from '../controllers/acordoController.js';

const router = Router();

router.post('/', criarAcordo);
router.get('/', listarAcordos);
router.get('/finalizados', listarFinalizados);

export default router;