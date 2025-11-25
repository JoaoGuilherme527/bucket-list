import { useState, useEffect, useMemo } from "react";
import Head from "next/head";

// Definição dos tipos vindos do MongoDB
interface BucketItem {
  _id: string;
  name: string;
  desc: string;
  checked: boolean;
}

interface BucketCategory {
  _id: string;
  category: string;
  icon: string;
  color: string;
  items: BucketItem[];
}

const AVAILABLE_ICONS = [
  "fa-star", "fa-heart", "fa-pizza-slice", "fa-fish", 
  "fa-martini-glass", "fa-mug-hot", "fa-utensils", "fa-burger",
  "fa-stopwatch", "fa-person-running", "fa-bicycle", "fa-dumbbell",
  "fa-bed", "fa-couch", "fa-gamepad", "fa-music",
  "fa-plane", "fa-umbrella-beach", "fa-mountain", "fa-car",
  "fa-camera", "fa-book", "fa-landmark", "fa-palette"
];

export default function Home() {
  const [categories, setCategories] = useState<BucketCategory[]>([]);
  const [loading, setLoading] = useState(true);
  const [lastClickedId, setLastClickedId] = useState<string | null>(null);

  // Estados do Modal de Criação
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<'item' | 'category'>('item');
  
  // Estados do Modal de Edição
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<{catId: string, item: BucketItem} | null>(null);
  const [editName, setEditName] = useState("");
  const [editDesc, setEditDesc] = useState("");

  // Estados do Modal de Confirmação (Exclusão)
  const [confirmModal, setConfirmModal] = useState<{
    isOpen: boolean;
    type: 'category' | 'item' | null;
    catId: string | null;
    itemId: string | null;
    title: string;
    message: string;
  }>({ isOpen: false, type: null, catId: null, itemId: null, title: '', message: '' });

  // Inputs de Criação
  const [newCatName, setNewCatName] = useState("");
  const [newCatIcon, setNewCatIcon] = useState("fa-star");
  const [newItemName, setNewItemName] = useState("");
  const [newItemDesc, setNewItemDesc] = useState("");
  const [selectedCatForNewItem, setSelectedCatForNewItem] = useState("");

  const fetchData = async () => {
    try {
      const res = await fetch('/api/bucket');
      const data = await res.json();
      if (data.success) {
        setCategories(data.data);
      }
    } catch (error) {
      console.error("Erro ao buscar dados", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleSeed = async () => {
    setLoading(true);
    await fetch('/api/seed');
    await fetchData();
  };

  const toggleItem = async (catId: string, itemId: string, currentStatus: boolean) => {
    const newCategories = categories.map(cat => {
      if (cat._id === catId) {
        return {
          ...cat,
          items: cat.items.map(item => item._id === itemId ? { ...item, checked: !currentStatus } : item)
        };
      }
      return cat;
    });
    setCategories(newCategories);

    try {
      await fetch('/api/bucket', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ categoryId: catId, itemId: itemId, checked: !currentStatus })
      });
    } catch (error) {
      console.error("Erro ao salvar status", error);
      fetchData(); 
    }
  };

  // --- Lógica de Edição ---

  const openEditModal = (catId: string, item: BucketItem) => {
    setEditingItem({ catId, item });
    setEditName(item.name);
    setEditDesc(item.desc);
    setIsEditModalOpen(true);
  };

  const handleUpdateItem = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingItem) return;

    // Optimistic Update
    setCategories(prev => prev.map(c => {
      if (c._id === editingItem.catId) {
        return {
          ...c,
          items: c.items.map(i => i._id === editingItem.item._id ? { ...i, name: editName, desc: editDesc } : i)
        };
      }
      return c;
    }));

    setIsEditModalOpen(false);

    try {
      await fetch('/api/bucket', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
            categoryId: editingItem.catId, 
            itemId: editingItem.item._id, 
            name: editName,
            desc: editDesc
        })
      });
    } catch (error) {
      console.error("Erro ao editar item", error);
      fetchData();
    }
  };

  // --- Lógica de Exclusão ---

  const promptDeleteCategory = (cat: BucketCategory) => {
    setConfirmModal({
      isOpen: true,
      type: 'category',
      catId: cat._id,
      itemId: null,
      title: `Excluir "${cat.category}"?`,
      message: `Tem certeza? Isso também excluirá todos os ${cat.items.length} itens dentro dela.`
    });
  };

  const promptDeleteItem = (catId: string, item: BucketItem) => {
    setConfirmModal({
      isOpen: true,
      type: 'item',
      catId: catId,
      itemId: item._id,
      title: `Excluir "${item.name}"?`,
      message: "Quer mesmo remover este item da lista?"
    });
  };

  const handleConfirmDelete = async () => {
    if (!confirmModal.type) return;

    if (confirmModal.type === 'category' && confirmModal.catId) {
      setCategories(prev => prev.filter(c => c._id !== confirmModal.catId));
      await fetch(`/api/bucket?id=${confirmModal.catId}`, { method: 'DELETE' });
    } 
    else if (confirmModal.type === 'item' && confirmModal.catId && confirmModal.itemId) {
      setCategories(prev => prev.map(c => {
        if (c._id === confirmModal.catId) {
          return { ...c, items: c.items.filter(i => i._id !== confirmModal.itemId) };
        }
        return c;
      }));
      await fetch(`/api/bucket?catId=${confirmModal.catId}&itemId=${confirmModal.itemId}`, { method: 'DELETE' });
    }

    setConfirmModal({ ...confirmModal, isOpen: false });
    fetchData();
  };

  // --- Lógica de Criação ---

  const handleAddCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCatName) return;

    await fetch('/api/bucket', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        type: 'category',
        data: {
          category: newCatName,
          icon: newCatIcon,
          color: "text-gray-500",
          items: []
        }
      })
    });
    setNewCatName("");
    setNewCatIcon("fa-star");
    setIsModalOpen(false); 
    fetchData();
  };

  const handleAddItem = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newItemName || !selectedCatForNewItem) return;

    await fetch('/api/bucket', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        type: 'item',
        data: {
          categoryId: selectedCatForNewItem,
          item: {
            name: newItemName,
            desc: newItemDesc || "Sem descrição",
            checked: false
          }
        }
      })
    });
    setNewItemName("");
    setNewItemDesc("");
    setIsModalOpen(false); 
    fetchData();
  };

  const stats = useMemo(() => {
    let total = 0;
    let checked = 0;
    categories.forEach((cat) => {
      cat.items.forEach((item) => {
        total++;
        if (item.checked) checked++;
      });
    });
    const percentage = total === 0 ? 0 : Math.round((checked / total) * 100);
    return { percentage, total, checked };
  }, [categories]);

  const scrollToDescription = (catIndex: number, itemIndex: number) => {
    const uniqueId = `${catIndex}-${itemIndex}`;
    setLastClickedId(null);
    setTimeout(() => setLastClickedId(uniqueId), 10);
    const element = document.getElementById(`desc-${uniqueId}`);
    if (element) {
      element.scrollIntoView({ behavior: "smooth", block: "center" });
    }
  };

  if (loading) return (
    <div className="flex h-screen items-center justify-center bg-gray-50 text-gray-500 flex-col gap-4">
      <i className="fa-solid fa-circle-notch fa-spin text-3xl text-rose-500"></i>
      <p>Carregando seus sonhos...</p>
    </div>
  );

  return (
    <div className="bg-gray-50 text-gray-800 min-h-screen flex flex-col font-sans relative">
      <Head>
        <title>Nosso Bucket List</title>
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <link href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.0.0/css/all.min.css" rel="stylesheet" />
      </Head>

      {/* --- HEADER --- */}
      <div className="bg-white shadow-sm sticky top-0 z-20">
        <div className="max-w-md mx-auto px-4 py-4">
          <div className="flex justify-between items-center">
             <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
                Nosso Roteiro <i className="fa-solid fa-heart text-rose-500 animate-pulse"></i>
             </h1>
             <button 
                onClick={() => setIsModalOpen(true)} 
                className="bg-gray-900 hover:bg-black text-white text-xs px-4 py-2 rounded-full transition-all font-medium shadow-md shadow-gray-300 flex items-center gap-2"
             >
                <i className="fa-solid fa-plus"></i> Adicionar
             </button>
          </div>

          <div className="mt-4">
            <div className="flex justify-between text-xs font-semibold text-gray-500 mb-1">
              <span>Progresso ({stats.checked}/{stats.total})</span>
              <span>{stats.percentage}%</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2.5 overflow-hidden">
              <div
                className="bg-rose-500 h-2.5 rounded-full transition-all duration-500 shadow-lg shadow-rose-500/30"
                style={{ width: `${stats.percentage}%` }}
              ></div>
            </div>
          </div>
        </div>
      </div>

      {/* --- MODAL DE CRIAÇÃO --- */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center px-4">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm transition-opacity" onClick={() => setIsModalOpen(false)}></div>
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md relative z-10 overflow-hidden animate-in zoom-in-95 duration-200 flex flex-col max-h-[90vh]">
            <div className="bg-gray-50 px-6 py-4 border-b border-gray-100 flex justify-between items-center shrink-0">
              <h3 className="font-bold text-gray-800">Adicionar Novo</h3>
              <button onClick={() => setIsModalOpen(false)} className="text-gray-400 hover:text-gray-600 transition-colors"><i className="fa-solid fa-xmark text-lg"></i></button>
            </div>
            <div className="flex border-b border-gray-100 shrink-0">
              <button onClick={() => setActiveTab('item')} className={`flex-1 py-3 text-sm font-medium transition-colors relative ${activeTab === 'item' ? 'text-rose-500 bg-white' : 'text-gray-500 bg-gray-50 hover:bg-gray-100'}`}>Novo Item {activeTab === 'item' && <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-rose-500"></div>}</button>
              <button onClick={() => setActiveTab('category')} className={`flex-1 py-3 text-sm font-medium transition-colors relative ${activeTab === 'category' ? 'text-rose-500 bg-white' : 'text-gray-500 bg-gray-50 hover:bg-gray-100'}`}>Nova Categoria {activeTab === 'category' && <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-rose-500"></div>}</button>
            </div>
            <div className="p-6 overflow-y-auto">
              {activeTab === 'item' && (
                <form onSubmit={handleAddItem} className="space-y-4">
                  <div>
                    <label className="block text-xs font-bold text-gray-400 uppercase mb-1">Categoria</label>
                    <div className="relative">
                      <select value={selectedCatForNewItem} onChange={e => setSelectedCatForNewItem(e.target.value)} className="w-full border border-gray-200 p-3 rounded-xl text-sm appearance-none bg-white focus:outline-none focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500 transition-all" required>
                        <option value="">Selecione...</option>
                        {categories.map(cat => <option key={cat._id} value={cat._id}>{cat.category}</option>)}
                      </select>
                      <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-3 text-gray-400"><i className="fa-solid fa-chevron-down text-xs"></i></div>
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-gray-400 uppercase mb-1">O que vamos fazer?</label>
                    <input value={newItemName} onChange={e => setNewItemName(e.target.value)} placeholder="Ex: Jantar no Copacabana Palace..." className="w-full border border-gray-200 p-3 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500 transition-all" required />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-gray-400 uppercase mb-1">Detalhes (Opcional)</label>
                    <textarea value={newItemDesc} onChange={e => setNewItemDesc(e.target.value)} placeholder="Alguma observação especial?" rows={3} className="w-full border border-gray-200 p-3 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500 resize-none transition-all" />
                  </div>
                  <button type="submit" className="w-full bg-rose-500 hover:bg-rose-600 text-white py-3 rounded-xl font-bold shadow-lg shadow-rose-500/30 transition-all mt-2">Salvar Item</button>
                </form>
              )}
              {activeTab === 'category' && (
                <form onSubmit={handleAddCategory} className="space-y-5">
                  <div>
                    <label className="block text-xs font-bold text-gray-400 uppercase mb-1">Nome da Categoria</label>
                    <input value={newCatName} onChange={e => setNewCatName(e.target.value)} placeholder="Ex: Aventuras Radicais" className="w-full border border-gray-200 p-3 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500 transition-all" required />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-gray-400 uppercase mb-2">Escolha um Ícone</label>
                    <div className="grid grid-cols-6 gap-2 max-h-48 overflow-y-auto p-1 custom-scrollbar">
                      {AVAILABLE_ICONS.map((icon) => (
                        <button key={icon} type="button" onClick={() => setNewCatIcon(icon)} className={`aspect-square rounded-xl transition-all flex items-center justify-center text-lg ${newCatIcon === icon ? 'bg-rose-500 text-white shadow-md shadow-rose-500/30 scale-105 ring-2 ring-rose-200' : 'bg-gray-50 text-gray-400 hover:bg-gray-100 hover:text-gray-600'}`}><i className={`fa-solid ${icon}`}></i></button>
                      ))}
                    </div>
                  </div>
                  <button type="submit" className="w-full bg-gray-900 hover:bg-black text-white py-3 rounded-xl font-bold shadow-lg shadow-gray-500/30 transition-all">Criar Categoria</button>
                </form>
              )}
            </div>
          </div>
        </div>
      )}

      {/* --- MODAL DE EDIÇÃO --- */}
      {isEditModalOpen && editingItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center px-4">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm transition-opacity" onClick={() => setIsEditModalOpen(false)}></div>
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md relative z-10 overflow-hidden animate-in zoom-in-95 duration-200 flex flex-col">
            <div className="bg-gray-50 px-6 py-4 border-b border-gray-100 flex justify-between items-center shrink-0">
              <h3 className="font-bold text-gray-800">Editar Item</h3>
              <button onClick={() => setIsEditModalOpen(false)} className="text-gray-400 hover:text-gray-600 transition-colors"><i className="fa-solid fa-xmark text-lg"></i></button>
            </div>
            <div className="p-6">
                <form onSubmit={handleUpdateItem} className="space-y-4">
                  <div>
                    <label className="block text-xs font-bold text-gray-400 uppercase mb-1">Nome do Item</label>
                    <input 
                      value={editName} onChange={e => setEditName(e.target.value)} 
                      className="w-full border border-gray-200 p-3 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500 transition-all" 
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-gray-400 uppercase mb-1">Descrição</label>
                    <textarea 
                      value={editDesc} onChange={e => setEditDesc(e.target.value)} 
                      rows={3}
                      className="w-full border border-gray-200 p-3 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500 resize-none transition-all" 
                    />
                  </div>
                  <button type="submit" className="w-full bg-blue-500 hover:bg-blue-600 text-white py-3 rounded-xl font-bold shadow-lg shadow-blue-500/30 transition-all mt-2">
                    Salvar Alterações
                  </button>
                </form>
            </div>
          </div>
        </div>
      )}

      {/* --- MODAL DE CONFIRMAÇÃO (DELETE) --- */}
      {confirmModal.isOpen && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center px-4">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200" onClick={() => setConfirmModal({...confirmModal, isOpen: false})}></div>
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm relative z-10 p-6 animate-in zoom-in-95 duration-200 text-center">
            
            <div className="w-12 h-12 rounded-full bg-red-50 text-red-500 flex items-center justify-center mx-auto mb-4">
                <i className="fa-solid fa-trash-can text-xl"></i>
            </div>
            
            <h3 className="font-bold text-gray-800 text-lg mb-2">{confirmModal.title}</h3>
            <p className="text-gray-500 text-sm mb-6 leading-relaxed">{confirmModal.message}</p>
            
            <div className="flex gap-3">
                <button 
                    onClick={() => setConfirmModal({...confirmModal, isOpen: false})}
                    className="flex-1 bg-gray-100 hover:bg-gray-200 text-gray-700 py-2.5 rounded-xl font-medium transition-colors text-sm"
                >
                    Cancelar
                </button>
                <button 
                    onClick={handleConfirmDelete}
                    className="flex-1 bg-rose-500 hover:bg-rose-600 text-white py-2.5 rounded-xl font-medium transition-colors text-sm shadow-lg shadow-rose-500/30"
                >
                    Sim, excluir
                </button>
            </div>
          </div>
        </div>
      )}

      {/* --- CONTENT (LISTA) --- */}
      {categories.length === 0 && !loading && (
        <div className="max-w-md mx-auto px-4 mt-10 text-center">
            <div className="bg-white p-8 rounded-2xl shadow-sm border border-gray-100">
                <div className="w-16 h-16 bg-rose-50 rounded-full flex items-center justify-center mx-auto mb-4"><i className="fa-solid fa-database text-rose-500 text-2xl"></i></div>
                <h3 className="font-bold text-gray-800 text-lg mb-2">Banco de Dados Vazio</h3>
                <p className="text-gray-500 text-sm mb-6">Seu bucket list está vazio. Quer importar os dados iniciais?</p>
                <button onClick={handleSeed} className="bg-rose-500 hover:bg-rose-600 text-white px-6 py-3 rounded-xl font-bold shadow-lg shadow-rose-500/30 transition-all w-full"><i className="fa-solid fa-cloud-arrow-up mr-2"></i> Importar Dados</button>
            </div>
        </div>
      )}

      <div className="max-w-md mx-auto px-4 mt-6 space-y-5 grow w-full pb-10">
        {categories.map((category, catIndex) => (
          <div key={category._id} className="bg-white rounded-xl shadow-sm overflow-hidden border border-gray-100 hover:border-gray-200 transition-colors group/cat">
            <div className="bg-gray-50/50 px-4 py-3 border-b border-gray-100 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-white flex items-center justify-center shadow-sm text-sm">
                    <i className={`fa-solid ${category.icon} ${category.color}`}></i>
                </div>
                <h2 className="font-bold text-gray-700 text-xs uppercase tracking-wider">{category.category}</h2>
              </div>
              {/* Botão Excluir Categoria (Sutil) */}
              <button 
                onClick={() => promptDeleteCategory(category)}
                className="text-gray-300 hover:text-gray-500 transition-colors p-2 rounded-full group-hover/cat:opacity-100 focus:opacity-100"
                title="Excluir Categoria"
              >
                <i className="fa-solid fa-trash text-xs"></i>
              </button>
            </div>

            <div className="divide-y divide-gray-50">
              {category.items.map((item, itemIdx) => {
                return (
                  <div key={item._id} className="flex items-center px-4 py-3 hover:bg-gray-50 transition-colors group justify-between cursor-pointer" onClick={(e) => {
                    const target = e.target as HTMLElement;
                    if(target.tagName !== 'INPUT' && !target.closest('button')) {
                         scrollToDescription(catIndex, itemIdx);
                    }
                  }}>
                    <div className="flex items-center gap-3 overflow-hidden flex-1">
                      <label className="cursor-pointer relative flex items-center checkbox-wrapper shrink-0 p-2 -ml-2 hover:bg-gray-100 rounded-full transition-colors">
                        <input
                          type="checkbox"
                          className="peer sr-only"
                          checked={item.checked}
                          onChange={() => toggleItem(category._id, item._id, item.checked)}
                        />
                        <div className={`w-5 h-5 border-2 rounded transition-all duration-200 flex items-center justify-center ${item.checked ? "bg-emerald-500 border-emerald-500 scale-105" : "border-gray-300 bg-white group-hover:border-gray-400"}`}>
                          <svg className={`w-3 h-3 text-white fill-current ${item.checked ? "block" : "hidden"}`} viewBox="0 0 20 20">
                            <path d="M0 11l2-2 5 5L18 3l2 2L7 18z" />
                          </svg>
                        </div>
                      </label>

                      <span className={`text-sm text-left truncate transition-all duration-200 ${item.checked ? "text-gray-400 line-through decoration-gray-300" : "text-gray-700 font-medium"}`}>
                        {item.name}
                      </span>
                    </div>

                    <div className="flex items-center gap-1">
                        <button
                        onClick={() => scrollToDescription(catIndex, itemIdx)}
                        className="text-gray-300 hover:text-rose-500 hover:bg-rose-50 p-2 rounded-full transition-all group-hover:opacity-100"
                        title="Ver detalhes"
                        >
                        <i className="fa-solid fa-circle-info text-xs"></i>
                        </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </div>

      {/* Área de Detalhes (Fundo da página) */}
      {categories.length > 0 && (
        <>
            <div className="max-w-md mx-auto px-4 mb-6 w-full">
                <div className="border-t border-gray-200 relative">
                <span className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 bg-gray-50 px-4 text-gray-400 text-xs font-bold uppercase tracking-widest">
                    Detalhes
                </span>
                </div>
            </div>

            <div className="max-w-md mx-auto px-4 pb-20 space-y-4 w-full">
                {categories.map((cat, catIndex) =>
                cat.items.map((item, itemIdx) => {
                    const uniqueId = `${catIndex}-${itemIdx}`;
                    const isHighlight = lastClickedId === uniqueId;

                    return (
                    <div
                        key={`desc-${uniqueId}`}
                        id={`desc-${uniqueId}`}
                        className={`bg-white p-5 rounded-xl border border-gray-100 shadow-sm transition-all duration-500 scroll-mt-32 ${isHighlight ? "animate-highlight ring-2 ring-yellow-400/50 shadow-yellow-100" : ""}`}
                    >
                        <div className="flex items-start justify-between gap-4">
                            <div>
                                <h3 className="font-bold text-gray-800 text-sm mb-1.5 flex items-center gap-2">
                                {item.name}
                                {item.checked && (
                                    <span className="text-[10px] text-emerald-600 bg-emerald-50 border border-emerald-100 px-2 py-0.5 rounded-full font-bold uppercase tracking-wide">
                                    Concluído
                                    </span>
                                )}
                                </h3>
                                <p className="text-gray-500 text-xs leading-relaxed">{item.desc}</p>
                            </div>
                            <div className={`text-xl ${cat.color} opacity-20`}>
                                <i className={`fa-solid ${cat.icon}`}></i>
                            </div>
                        </div>
                        
                        {/* Área de Ações do Item (Detalhes) */}
                        <div className="mt-4 pt-4 border-t border-gray-50 flex justify-between items-center">
                            <div className="flex items-center gap-1.5 text-[10px] text-gray-400 uppercase tracking-wider font-bold">
                                <span className="w-1.5 h-1.5 rounded-full bg-gray-300"></span>
                                {cat.category}
                            </div>
                            <div className="flex gap-3">
                                <button 
                                    onClick={() => openEditModal(cat._id, item)}
                                    className="text-gray-400 hover:text-blue-500 transition-colors text-xs font-medium flex items-center gap-1"
                                >
                                    <i className="fa-solid fa-pencil"></i> Editar
                                </button>
                                <button 
                                    onClick={() => promptDeleteItem(cat._id, item)}
                                    className="text-gray-400 hover:text-red-500 transition-colors text-xs font-medium flex items-center gap-1"
                                >
                                    <i className="fa-solid fa-trash"></i> Excluir
                                </button>
                            </div>
                        </div>
                    </div>
                    );
                })
                )}
            </div>
        </>
      )}
    </div>
  );
}