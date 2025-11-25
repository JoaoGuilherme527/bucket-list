import mongoose, { Schema, model, models } from 'mongoose';

const ItemSchema = new Schema({
  name: { type: String, required: true },
  desc: { type: String, required: true },
  checked: { type: Boolean, default: false } // Agora o estado vive no banco
});

const CategorySchema = new Schema({
  category: { type: String, required: true },
  icon: { type: String, required: true }, // Ex: "fa-pizza-slice"
  color: { type: String, required: true }, // Ex: "text-orange-500"
  items: [ItemSchema]
});

// Evita erro de recompilação do modelo no Next.js
const Category = models.Category || model('Category', CategorySchema);

export default Category;