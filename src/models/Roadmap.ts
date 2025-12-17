import mongoose from 'mongoose';

// Schema do Item (Idêntico ao original)
const ItemSchema = new mongoose.Schema({
  name: { type: String, required: true },
  desc: { type: String, default: "" }, // Descrição
  checked: { type: Boolean, default: false }, // Usando 'checked' como no original
  link: String,
});

// Schema da Categoria (Idêntico ao original)
const CategorySchema = new mongoose.Schema({
  category: { type: String, required: true }, // Usando 'category' em vez de 'name'
  icon: { type: String, default: "fa-star" },
  color: { type: String, default: "text-gray-500" },
  items: [ItemSchema],
});

// Schema do Roteiro (Container)
const RoadmapSchema = new mongoose.Schema({
  name: { type: String, required: true }, // Nome do Roteiro
  ownerEmail: { type: String, required: true },
  invitedUsers: [String],
  categories: [CategorySchema], // Lista de categorias no formato original
  createdAt: { type: Date, default: Date.now }
});

export default mongoose.models.Roadmap || mongoose.model('Roadmap', RoadmapSchema);