import type { NextApiRequest, NextApiResponse } from 'next';
import dbConnect from '../../lib/mongodb';
import Category from '../../models/Category';
import { bucketData } from '../../data'; // Importa o arquivo acima

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  await dbConnect();

  try {
    // 1. Limpa o banco atual para evitar duplicatas ao rodar o seed várias vezes
    await Category.deleteMany({});

    // 2. Formata os dados para o Schema do Mongoose (adicionando checked: false)
    const formattedData = bucketData.map(cat => ({
        category: cat.category,
        icon: cat.icon,
        color: cat.color,
        items: cat.items.map(item => ({
            name: item.name,
            desc: item.desc,
            checked: false // Define o estado inicial como não feito
        }))
    }));

    // 3. Insere tudo de uma vez
    await Category.insertMany(formattedData);

    console.log("Banco populado com sucesso!");
    res.status(200).json({ success: true, message: "Banco de dados populado com sucesso com os dados do data.ts!" });
  } catch (error) {
    console.error("Erro ao popular banco:", error);
    res.status(500).json({ success: false, error });
  }
}