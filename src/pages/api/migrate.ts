import type { NextApiRequest, NextApiResponse } from 'next';
import dbConnect from '../../lib/mongodb';
import Roadmap from '../../models/Roadmap';
import Category from '../../models/Category';
import { getServerSession } from "next-auth/next";
import { authOptions } from "./auth/[...nextauth]";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const session = await getServerSession(req, res, authOptions);

  if (!session || !session.user?.email) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const userEmail = session.user.email;
  await dbConnect();

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { roadmapId } = req.body;

  try {
    const roadmap = await Roadmap.findOne({ _id: roadmapId, ownerEmail: userEmail });
    if (!roadmap) return res.status(404).json({ error: 'Roteiro não encontrado' });

    // Busca categorias antigas (Modelo Category)
    const oldCategories = await Category.find({});

    if (oldCategories.length === 0) {
      return res.status(404).json({ message: 'Nenhuma categoria antiga encontrada.' });
    }

    let count = 0;
    for (const oldCat of oldCategories) {
      // Verifica duplicatas pelo nome da categoria (campo 'category')
      const exists = roadmap.categories.some((c: any) => c.category === oldCat.category);
      
      if (!exists) {
        // Como agora os Schemas são iguais, podemos empurrar o objeto quase direto
        roadmap.categories.push({
          category: oldCat.category, // Campo correto
          icon: oldCat.icon,
          color: oldCat.color,
          items: oldCat.items.map((item: any) => ({
            name: item.name,
            desc: item.desc || '',
            checked: item.checked || false // Campo correto
          }))
        });
        count++;
      }
    }

    await roadmap.save();
    return res.status(200).json({ success: true, message: `Migrado ${count} categorias com sucesso!` });

  } catch (error) {
    console.error("Erro na migração:", error);
    return res.status(500).json({ error: 'Erro interno' });
  }
}