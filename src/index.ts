import express from 'express';
import cors from 'cors';
import { PrismaClient } from '../generated/prisma/index.js';

const app = express();
const prisma = new PrismaClient();
const port = 3000;

app.use(cors());
app.use(express.json());

app.get('/', (req, res) => {
  res.send('API do Desafio AFAP no ar!');
});

//ROTA PARA CRIAR NOVO ACORDO
app.post('/acordos', async (req, res) => {

  const { mensalidadesIds, data_prevista, descricao, realizado_por, metodo_pag} = req.body;
  
  //1. Validação básica: verificar se alista de IDs foi enviada
  if (!mensalidadesIds || !Array.isArray(mensalidadesIds) || mensalidadesIds.length === 0) {
    return res.status(400).json({ error: 'A lista de IDs de mensalidades é obrigatória.' })
  }

  try {

    //2. Buscar as mensalidades no banco de dados 
    const mensalidadesDoBanco = await prisma.mensalidades.findMany({
      where: {
        id_mensalidade: {
          in: mensalidadesIds
        }
      }
    })

    //3. Validar se todas as mensalidades foram encontradas
    if (mensalidadesDoBanco.length !== mensalidadesIds.length) {
      return res.status(404).json({ error: 'Uma ou mais mensalidades não foram encontradas' })
    }

    //4. Validar se todas as mensalidades estão em aberto 
    const todasAbertas = mensalidadesDoBanco.every(m => m.status === 'A');
    if (!todasAbertas) {
      return res.status(400).json({ error: 'Apenas mensalidades com status "Aberto" podem ser incluídas em um acordo.' })
    }

    //5. Calcular o valor total de acordo

    const totalAcordo = mensalidadesDoBanco.reduce((soma, mensalidade) => {
      return soma + Number(mensalidade.valor_principal)
    }, 0)


    //6. Usar uma transação para criar Acordo e suas ligações 
    const novoAcordo = await prisma.$transaction(async (tx) => {

      const acordo = await tx.acordo.create({
        data: {
          data_prevista: data_prevista,
          descricao: descricao,
          metodo_pag: metodo_pag,
          realizado_por: realizado_por,
          total_acordo: totalAcordo,
          status: 'Aberto',
          dt_criacao: new Date(),
        },
      });

      const dadosParaJunction = mensalidadesIds.map((id) => ({
        id_acordo: acordo.id_acordo,
        id_mensalidade: id,
      }));

      await tx.acordoMensalidade.createMany({
        data: dadosParaJunction,
      })

      return acordo;
    })

    return res.status(201).json(novoAcordo);
  } catch (error) {
    console.error(error)
    return res.status(500).json({ error: 'Ocorreu um erro ao processar a solicitação.' });
  }
});

//ROTA PARA LISTAR TODOS OS ACORDOS
app.get('/acordos', async (req, res) => {
  try {
    const acordos = await prisma.acordo.findMany({
      include: {
        mensalidades: {
          include: {
            mensalidade: true,
          }
        }
      }
    })
    return res.status(200).json(acordos);
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: 'Ocorreu um erro ao buscar os acordos' })
  }
})

//ROTA PARA LISTAR MENSALIDADES DISPONÍVEIS PARA ACORDO
app.get('/mensalidades/disponiveis', async (req, res) => {
  try {
    const mensalidadesDisponiveis = await prisma.mensalidades.findMany({
      where: {
        status: 'A',
      }
    })
    return res.status(200).json(mensalidadesDisponiveis)
  } catch (error) {
    console.error(error)
    return res.status(500).json({ error: 'Ocorreu um erro ao buscar as mensalidades.' })
  }
})

//ROTA LISTAR ACORDOS QUE ESTÃO EM QUEBRA OU CONCLUÍDOS
app.get('/acordos/finalizados', async (req, res) => {
  try {
    const acordosfinalizados = await prisma.acordo.findMany({
      where: {
        status: {
          in: ['Quebra', 'Concluído']
        }
      },
      include: {
        mensalidades: {
          include: {
            mensalidade: true
          }
        }
      }
    })
    return res.status(200).json(acordosfinalizados)
  } catch (error) {
    console.error(error)
    return res.status(500).json({ error: 'Ocorreu um erro ao buscar os acordos.' })
  }
})

// ROTA PARA LISTAR TODAS AS MENSALIDADES (PAGAS E ABERTAS)
app.get('/mensalidades', async (req, res) => {
  try {
    const todasAsMensalidades = await prisma.mensalidades.findMany({
      orderBy: {
        parcela: 'asc', // Ordena pela parcela
      },
    });
    return res.status(200).json(todasAsMensalidades);
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: 'Ocorreu um erro ao buscar as mensalidades.' });
  }
});

//ROTA PARA REGISTRAR O PAGAMENTO DE UMA MENSALIDADE
app.patch('/mensalidades/:id/pagar', async (req, res) => {
  try {
    const { id } = req.params;
    const { valor_pago, form_pagto } = req.body

    const mensalidadeId = parseInt(id, 10)

    const mensalidadePaga = await prisma.mensalidades.update({
      where: { id_mensalidade: mensalidadeId },
      data: {
        status: 'P',
        valor_pago: valor_pago ?? null,
        form_pagto: form_pagto ?? null,
        data_pgto: new Date(),
        hora_pgto: new Date().toLocaleTimeString('pt-BR', { hour12: false }),
      }
    })

    const acordosAfetados = await prisma.acordo.findMany({
      where: {
        mensalidades: {
          some: {
            id_mensalidade: mensalidadeId
          }
        }
      }
    })

    //Buscar as mensalidades
    for (const acordo of acordosAfetados) {

      const todasAsMensalidadesDoAcordo = await prisma.mensalidades.findMany({
        where: {
          acordos: {
            some: {
              id_acordo: acordo.id_acordo
            }
          }
        }
      })

      //Analisar as mensalidades
      let quantidadePaga = 0
      let houvePagamentoAtrasado = false
      const quantidadeTotal = todasAsMensalidadesDoAcordo.length

      for (const mensalidade of todasAsMensalidadesDoAcordo) {
        if (mensalidade.status === 'P') {
          quantidadePaga++

          if (mensalidade.data_pgto && mensalidade.data_pgto > acordo.data_prevista) {
            houvePagamentoAtrasado = true
          }
        }
      }

      //Decidir novo status
      let novoStatus = 'Aberto'

      if (houvePagamentoAtrasado) {
        novoStatus = 'Quebra'
      }
      else if (quantidadePaga === quantidadeTotal) {
        novoStatus = 'Concluído'
      }
      // Atualizar o acordo no banco de dados, se o status mudou
      if (novoStatus !== acordo.status) {
        await prisma.acordo.update({
          where: { id_acordo: acordo.id_acordo },
          data: {
            status: novoStatus,
            dt_pgto: novoStatus == 'Concluído' ? new Date() : null,
          }
        })
      }
    }



    res.status(200).json(mensalidadePaga)
  } catch (error) {
    console.error(error)
    res.status(500).json({ error: 'Ocorreu um erro ao procesar o pagamento.' })
  }
})

app.listen(port, () => {
  console.log(`Servidor rodando em http://localhost:${port}`);
});