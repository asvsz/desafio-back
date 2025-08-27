import type { Request, Response } from 'express';
import { prisma } from '../config/prismaClient.js';

// Lista mensalidades disponíveis
export const listarDisponiveis = async (req: Request, res: Response) => {
  try {
    const mensalidades = await prisma.mensalidades.findMany({ where: { status: 'A' } });
    res.status(200).json(mensalidades);
  } catch (error) {
    res.status(500).json({ error: 'Erro ao buscar mensalidades.' });
  }
};

// Lista todas as mensalidades
export const listarTodas = async (req: Request, res: Response) => {
  try {
    const mensalidades = await prisma.mensalidades.findMany({
      orderBy: { parcela: 'asc' },
      include: { acordos: { include: { acordo: true } } },
    });
    res.status(200).json(mensalidades);
  } catch (error) {
    res.status(500).json({ error: 'Erro ao buscar mensalidades.' });
  }
};

// Paga uma mensalidade e atualiza acordos
export const pagarMensalidade = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    if (!id) {
      return res.status(400).json({error: 'O ID da mensalidade é obrigatório.'})
    }
    const { valor_pago, form_pagto } = req.body;
    const mensalidadeId = parseInt(id, 10);

    const mensalidadePaga = await prisma.mensalidades.update({
      where: { id_mensalidade: mensalidadeId },
      data: {
        status: 'P', valor_pago, form_pagto: form_pagto ?? null,
        data_pgto: new Date(),
        hora_pgto: new Date().toLocaleTimeString('pt-BR', { hour12: false }),
      },
    });

    const acordosAfetados = await prisma.acordo.findMany({
      where: { mensalidades: { some: { id_mensalidade: mensalidadeId } } },
    });

    for (const acordo of acordosAfetados) {
      const mensalidadesDoAcordo = await prisma.mensalidades.findMany({
        where: { acordos: { some: { id_acordo: acordo.id_acordo } } },
      });

      let quantidadePaga = 0;
      let houvePagamentoAtrasado = false;
      mensalidadesDoAcordo.forEach(m => {
        if (m.status === 'P') {
          quantidadePaga++;
          if (m.data_pgto && m.data_pgto > acordo.data_prevista) {
            houvePagamentoAtrasado = true;
          }
        }
      });

      let novoStatus = acordo.status;
      if (houvePagamentoAtrasado) {
        novoStatus = 'Quebra';
      } else if (quantidadePaga === mensalidadesDoAcordo.length) {
        novoStatus = 'Concluído';
      }

      if (novoStatus !== acordo.status) {
        await prisma.acordo.update({
          where: { id_acordo: acordo.id_acordo },
          data: { status: novoStatus, dt_pgto: novoStatus === 'Concluído' ? new Date() : null },
        });
      }
    }
    res.status(200).json(mensalidadePaga);
  } catch (error) {
    res.status(500).json({ error: 'Erro ao processar pagamento.' });
  }
};