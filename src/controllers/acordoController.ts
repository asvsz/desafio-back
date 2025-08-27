import type { Request, Response } from 'express';
import { prisma } from '../config/prismaClient.js';

// Cria um novo acordo
export const criarAcordo = async (req: Request, res: Response) => {
  const { mensalidadesIds, data_prevista, descricao, realizado_por, metodo_pag } = req.body;

  if (!mensalidadesIds || !Array.isArray(mensalidadesIds) || mensalidadesIds.length === 0) {
    return res.status(400).json({ error: 'A lista de IDs de mensalidades é obrigatória.' });
  }

  try {
    const mensalidadesDoBanco = await prisma.mensalidades.findMany({
      where: { id_mensalidade: { in: mensalidadesIds }, status: 'A' },
    });

    if (mensalidadesDoBanco.length !== mensalidadesIds.length) {
      return res.status(400).json({ error: 'Uma ou mais mensalidades não estão disponíveis para acordo.' });
    }

    const total_acordo = mensalidadesDoBanco.reduce((soma, m) => soma + Number(m.valor_principal), 0);

    const novoAcordo = await prisma.$transaction(async (tx) => {
      const acordo = await tx.acordo.create({
        data: {
          data_prevista, descricao, metodo_pag, realizado_por,
          total_acordo, status: 'Aberto', dt_criacao: new Date()
        },
      });
      const dadosParaJunction = mensalidadesIds.map((id) => ({ id_acordo: acordo.id_acordo, id_mensalidade: id }));
      await tx.acordoMensalidade.createMany({ data: dadosParaJunction });
      return acordo;
    });

    res.status(201).json(novoAcordo);
  } catch (error) {
    res.status(500).json({ error: 'Ocorreu um erro ao criar o acordo.' });
  }
};

// Lista todos os acordos
export const listarAcordos = async (req: Request, res: Response) => {
  try {
    const acordos = await prisma.acordo.findMany({
      include: { mensalidades: { include: { mensalidade: true } } },
    });
    res.status(200).json(acordos);
  } catch (error) {
    res.status(500).json({ error: 'Erro ao buscar acordos.' });
  }
};

// Lista acordos finalizados
export const listarFinalizados = async (req: Request, res: Response) => {
  try {
    const acordos = await prisma.acordo.findMany({
      where: { status: { in: ['Quebra', 'Concluído'] } },
      include: { mensalidades: { include: { mensalidade: true } } },
    });
    res.status(200).json(acordos);
  } catch (error) {
    res.status(500).json({ error: 'Erro ao buscar acordos.' });
  }
};