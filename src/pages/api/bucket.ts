import { NextApiRequest, NextApiResponse } from 'next';
import dbConnect from '../../lib/mongodb';
import Roadmap from '../../models/Roadmap';
import User from '../../models/User';
import { getServerSession } from "next-auth/next";
import { authOptions } from "./auth/[...nextauth]";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const session = await getServerSession(req, res, authOptions);

  if (!session || !session.user?.email) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const userEmail = session.user.email;
  await dbConnect();

  const { method } = req;
  const { action } = req.body;

  try {
    // --- LISTAR ROTEIROS (GET) ---
    if (method === 'GET') {
      const { id } = req.query;

      // 1. Buscar um Roteiro Específico (Detalhes + Membros)
      if (id) {
        const roadmap = await Roadmap.findOne({
          _id: id,
          $or: [{ ownerEmail: userEmail }, { invitedUsers: userEmail }]
        });
        
        if (!roadmap) return res.status(404).json({ error: 'Roadmap not found' });

        const allEmails = [roadmap.ownerEmail, ...roadmap.invitedUsers];
        const users = await User.find({ email: { $in: allEmails } }).lean();

        const userMap = users.reduce((acc: any, user: any) => {
            acc[user.email] = { name: user.name, image: user.image, email: user.email };
            return acc;
        }, {});

        const roadmapWithDetails = {
            ...roadmap.toObject(),
            ownerDetails: userMap[roadmap.ownerEmail] || { name: roadmap.ownerEmail, email: roadmap.ownerEmail },
            invitedDetails: roadmap.invitedUsers.map((email: string) => userMap[email] || { name: email, email: email })
        };

        return res.status(200).json(roadmapWithDetails);
      }

      // 2. Listar Todos (Dashboard) - AGORA COM DETALHES DO DONO
      const roadmaps = await Roadmap.find({
        $or: [{ ownerEmail: userEmail }, { invitedUsers: userEmail }]
      }).sort({ createdAt: -1 });

      // Coletar emails dos donos para buscar nomes e fotos
      const ownerEmails = [...new Set(roadmaps.map((r: any) => r.ownerEmail))];
      const owners = await User.find({ email: { $in: ownerEmails } }).lean();

      // Mapa de Email -> Dados do Usuário
      const ownerMap = owners.reduce((acc: any, user: any) => {
          acc[user.email] = { name: user.name, image: user.image };
          return acc;
      }, {});

      // Anexar detalhes ao objeto de retorno
      const roadmapsWithOwners = roadmaps.map((r: any) => ({
          ...r.toObject(),
          ownerDetails: ownerMap[r.ownerEmail] || { name: r.ownerEmail }
      }));
      
      return res.status(200).json(roadmapsWithOwners);
    }

    // --- CRIAR / ADICIONAR (POST) ---
    if (method === 'POST') {
      // 1. Criar Roteiro
      if (action === 'createRoadmap') {
        const { name } = req.body;
        const newRoadmap = await Roadmap.create({
          name,
          ownerEmail: userEmail,
          invitedUsers: [],
          categories: []
        });
        return res.status(201).json(newRoadmap);
      }

      // 2. Adicionar Categoria
      if (action === 'addCategory') {
        const { roadmapId, name, icon, color } = req.body;
        const roadmap = await Roadmap.findOne({ _id: roadmapId, $or: [{ ownerEmail: userEmail }, { invitedUsers: userEmail }] });
        
        if (!roadmap) return res.status(404).json({ error: 'Roadmap not found' });

        roadmap.categories.push({ 
            category: name,
            items: [],
            icon: icon || 'fa-star',
            color: color || 'text-gray-500'
        });
        await roadmap.save();
        return res.status(200).json(roadmap);
      }

      // 3. Adicionar Item
      if (action === 'addItem') {
        const { roadmapId, categoryId, name, desc } = req.body;
        const roadmap = await Roadmap.findOne({ _id: roadmapId, $or: [{ ownerEmail: userEmail }, { invitedUsers: userEmail }] });
        if (!roadmap) return res.status(404).json({ error: 'Roadmap not found' });

        const cat = roadmap.categories.id(categoryId);
        if (!cat) return res.status(404).json({ error: 'Category not found' });

        cat.items.push({ 
            name, 
            desc: desc || "",
            checked: false
        });
        await roadmap.save();
        return res.status(200).json(roadmap);
      }

      // 4. Convidar Usuário
      if (action === 'inviteUser') {
        const { roadmapId, emailToInvite } = req.body;
        const roadmap = await Roadmap.findOne({ 
            _id: roadmapId, 
            $or: [{ ownerEmail: userEmail }, { invitedUsers: userEmail }] 
        });

        if (!roadmap) return res.status(403).json({ error: 'Permission denied' });

        if (!roadmap.invitedUsers.includes(emailToInvite) && emailToInvite !== roadmap.ownerEmail) {
          roadmap.invitedUsers.push(emailToInvite);
          await roadmap.save();
        }
        return res.status(200).json(roadmap);
      }

      // 5. Remover Usuário
      if (action === 'removeUser') {
        const { roadmapId, emailToRemove } = req.body;
        
        const roadmap = await Roadmap.findOne({ _id: roadmapId, ownerEmail: userEmail });
        
        if (!roadmap) return res.status(403).json({ error: 'Apenas o dono pode remover membros' });

        roadmap.invitedUsers = roadmap.invitedUsers.filter((email: string) => email !== emailToRemove);
        await roadmap.save();
        
        return res.status(200).json(roadmap);
      }
    }

    // --- ATUALIZAR (PATCH) ---
    if (method === 'PATCH') {
      const { roadmapId, categoryId, itemId, checked, name, desc } = req.body;
      
      const roadmap = await Roadmap.findOne({ _id: roadmapId, $or: [{ ownerEmail: userEmail }, { invitedUsers: userEmail }] });
      if (!roadmap) return res.status(404).json({ error: 'Roadmap not found' });

      const cat = roadmap.categories.id(categoryId);
      const item = cat?.items.id(itemId);

      if (item) {
        if (checked !== undefined) item.checked = checked;
        if (name !== undefined) item.name = name;
        if (desc !== undefined) item.desc = desc;
        await roadmap.save();
      }
      return res.status(200).json(roadmap);
    }

    // --- DELETAR (DELETE) ---
    if (method === 'DELETE') {
      const { roadmapId, categoryId, itemId, type } = req.body;

      if (type === 'roadmap') {
        const deleted = await Roadmap.findOneAndDelete({ _id: roadmapId, ownerEmail: userEmail });
        if (!deleted) return res.status(403).json({ error: "Only owner can delete roadmap" });
        return res.status(200).json({ success: true });
      }
      
      const roadmap = await Roadmap.findOne({ _id: roadmapId, $or: [{ ownerEmail: userEmail }, { invitedUsers: userEmail }] });
      if (!roadmap) return res.status(404).json({ error: 'Roadmap not found' });

      if (type === 'item') {
        const cat = roadmap.categories.id(categoryId);
        cat.items.pull(itemId);
        await roadmap.save();
        return res.status(200).json(roadmap);
      }

      if (type === 'category') {
         roadmap.categories.pull({ _id: categoryId });
         await roadmap.save();
         return res.status(200).json(roadmap);
      }
    }

    return res.status(405).json({ error: 'Method not allowed' });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: 'Internal Server Error' });
  }
}