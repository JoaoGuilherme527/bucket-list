import type { NextApiRequest, NextApiResponse } from 'next';
import dbConnect from '../../lib/mongodb';
import Category from '../../models/Category';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  await dbConnect();

  const { method } = req;

  try {
    switch (method) {
      case 'GET':
        const categories = await Category.find({}).sort({ createdAt: 1 });
        res.status(200).json({ success: true, data: categories });
        break;

      case 'POST':
        const { type, data } = req.body;

        if (type === 'category') {
          const category = await Category.create(data);
          res.status(201).json({ success: true, data: category });
        } 
        else if (type === 'item') {
          const { categoryId, item } = data;
          const updatedCategory = await Category.findByIdAndUpdate(
            categoryId,
            { $push: { items: item } },
            { new: true }
          );
          res.status(201).json({ success: true, data: updatedCategory });
        }
        break;

      case 'PUT':
        const { categoryId, itemId, checked, name, desc } = req.body;
        
        // Monta o objeto de atualização dinamicamente
        const updateFields: Record<string, any> = {};
        
        if (checked !== undefined) updateFields["items.$.checked"] = checked;
        if (name !== undefined) updateFields["items.$.name"] = name;
        if (desc !== undefined) updateFields["items.$.desc"] = desc;

        const updated = await Category.findOneAndUpdate(
          { "_id": categoryId, "items._id": itemId },
          { 
            "$set": updateFields
          },
          { new: true }
        );
        res.status(200).json({ success: true, data: updated });
        break;
        
      case 'DELETE':
         const { id, catId, itemId: itemToDeleteId } = req.query;

         // Caso 1: Excluir Item Específico
         if (catId && itemToDeleteId) {
            await Category.findByIdAndUpdate(
                catId,
                { $pull: { items: { _id: itemToDeleteId } } }
            );
            res.status(200).json({ success: true });
            return;
         }

         // Caso 2: Excluir Categoria Inteira
         if (id) {
            await Category.findByIdAndDelete(id);
            res.status(200).json({ success: true });
            return;
         }
         
         res.status(400).json({ success: false, message: "ID não fornecido" });
         break;

      default:
        res.status(400).json({ success: false, message: "Método não suportado" });
        break;
    }
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, error });
  }
}