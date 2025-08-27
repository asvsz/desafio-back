import express from 'express';
import cors from 'cors';
import mensalidadeRoutes from './routes/mensalidadeRoutes.js';
import acordoRoutes from './routes/acordoRoutes.js';

const app = express();
const port = 3000;

app.use(cors());
app.use(express.json());

// Rotas principais da aplicação
app.use('/mensalidades', mensalidadeRoutes);
app.use('/acordos', acordoRoutes);

app.get('/', (req, res) => {
  res.send('API do Desafio AFAP no ar!');
});

app.listen(port, () => {
  console.log(`Servidor rodando em http://localhost:${port}`);
});