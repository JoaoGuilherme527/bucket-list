import { useState, useEffect, useMemo } from "react";
import Head from "next/head";
import { useRouter } from 'next/router';
import { useSession } from "next-auth/react";

interface Item {
  _id: string;
  name: string;
  desc: string;
  checked: boolean;
}

interface Category {
  _id: string;
  category: string;
  icon: string;
  color: string;
  items: Item[];
}

// Interface atualizada para receber os detalhes do usuário
interface UserDetail {
  name: string;
  email: string;
  image?: string;
}

interface Roadmap {
  _id: string;
  name: string;
  ownerEmail: string;
  invitedUsers: string[];
  ownerDetails?: UserDetail; // Detalhes do dono
  invitedDetails?: UserDetail[]; // Detalhes dos convidados
  categories: Category[];
}

const AVAILABLE_ICONS = [
  "fa-star", "fa-heart", "fa-pizza-slice", "fa-fish", 
  "fa-martini-glass", "fa-mug-hot", "fa-utensils", "fa-burger",
  "fa-stopwatch", "fa-person-running", "fa-bicycle", "fa-dumbbell",
  "fa-bed", "fa-couch", "fa-gamepad", "fa-music",
  "fa-plane", "fa-umbrella-beach", "fa-mountain", "fa-car",
  "fa-camera", "fa-book", "fa-landmark", "fa-palette"
];

export default function RoadmapDetails() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const { id } = router.query;

  const [roadmap, setRoadmap] = useState<Roadmap | null>(null);
  const [loading, setLoading] = useState(true);
  const [lastClickedId, setLastClickedId] = useState<string | null>(null);

  // Modals
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<'item' | 'category'>('item');
  
  // Edit State
  const [editingItem, setEditingItem] = useState<{catId: string, item: Item} | null>(null);
  const [editName, setEditName] = useState("");
  const [editDesc, setEditDesc] = useState("");

  // Invite State
  const [inviteEmail, setInviteEmail] = useState("");

  // Delete Confirm
  const [confirmModal, setConfirmModal] = useState<{
    isOpen: boolean;
    type: 'category' | 'item' | 'user' | null; // Adicionado 'user'
    catId: string | null;
    itemId: string | null;
    userData: string | null; // Para guardar email do usuário a remover
    title: string;
    message: string;
  }>({ isOpen: false, type: null, catId: null, itemId: null, userData: null, title: '', message: '' });

  // Creation Inputs
  const [newCatName, setNewCatName] = useState("");
  const [newCatIcon, setNewCatIcon] = useState("fa-star");
  const [newItemName, setNewItemName] = useState("");
  const [newItemDesc, setNewItemDesc] = useState("");
  const [selectedCatForNewItem, setSelectedCatForNewItem] = useState("");

  useEffect(() => {
    if (status === 'authenticated' && id) {
      fetchRoadmap();
    } else if (status === 'unauthenticated') {
      router.push('/');
    }
  }, [status, id]);

  const fetchRoadmap = async () => {
    try {
      const res = await fetch(`/api/bucket?id=${id}`);
      if (res.ok) {
        const data = await res.json();
        setRoadmap(data);
      } else {
        router.push('/');
      }
    } catch (error) {
      console.error("Erro ao buscar dados", error);
    } finally {
      setLoading(false);
    }
  };

  const toggleItem = async (catId: string, itemId: string, currentStatus: boolean) => {
    if (!roadmap) return;
    
    // Optimistic UI Update
    const updatedCategories = roadmap.categories.map(cat => {
      if (cat._id === catId) {
        return {
          ...cat,
          items: cat.items.map(item => item._id === itemId ? { ...item, checked: !currentStatus } : item)
        };
      }
      return cat;
    });
    setRoadmap({ ...roadmap, categories: updatedCategories });

    try {
      await fetch('/api/bucket', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
            roadmapId: roadmap._id,
            categoryId: catId, 
            itemId: itemId, 
            checked: !currentStatus 
        })
      });
    } catch (error) {
      console.error("Erro ao salvar status", error);
      fetchRoadmap(); 
    }
  };

  // --- Invite & User Management Logic ---
  
  const handleInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!roadmap || !inviteEmail) return;

    const res = await fetch('/api/bucket', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
            action: 'inviteUser',
            roadmapId: roadmap._id,
            emailToInvite: inviteEmail
        })
    });

    if (res.ok) {
        setInviteEmail("");
        alert("Adicionado com sucesso!");
        fetchRoadmap(); 
    } else {
        alert("Erro ao adicionar.");
    }
  };

  const promptRemoveUser = (userEmail: string, userName: string) => {
    setConfirmModal({
        isOpen: true,
        type: 'user',
        catId: null,
        itemId: null,
        userData: userEmail,
        title: `Remover ${userName}?`,
        message: "Essa pessoa perderá o acesso a este roteiro imediatamente."
    });
  };

  // --- Creation Logic ---

  const handleAddCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCatName || !roadmap) return;

    await fetch('/api/bucket', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'addCategory',
        roadmapId: roadmap._id,
        name: newCatName,
        icon: newCatIcon,
        color: "text-gray-500"
      })
    });
    setNewCatName("");
    setNewCatIcon("fa-star");
    setIsModalOpen(false); 
    fetchRoadmap();
  };

  const handleAddItem = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newItemName || !selectedCatForNewItem || !roadmap) return;

    await fetch('/api/bucket', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'addItem',
        roadmapId: roadmap._id,
        categoryId: selectedCatForNewItem,
        name: newItemName,
        desc: newItemDesc || ""
      })
    });
    setNewItemName("");
    setNewItemDesc("");
    setIsModalOpen(false); 
    fetchRoadmap();
  };

  // --- Edit Logic ---
  const openEditModal = (catId: string, item: Item) => {
    setEditingItem({ catId, item });
    setEditName(item.name);
    setEditDesc(item.desc);
    setIsEditModalOpen(true);
  };

  const handleUpdateItem = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingItem || !roadmap) return;

    setIsEditModalOpen(false);

    await fetch('/api/bucket', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ 
          roadmapId: roadmap._id,
          categoryId: editingItem.catId, 
          itemId: editingItem.item._id, 
          name: editName,
          desc: editDesc
      })
    });
    fetchRoadmap();
  };

  // --- Delete Logic ---
  const promptDeleteCategory = (cat: Category) => {
    setConfirmModal({
      isOpen: true,
      type: 'category',
      catId: cat._id,
      itemId: null,
      userData: null,
      title: `Excluir "${cat.category}"?`,
      message: `Tem certeza? Isso também excluirá todos os ${cat.items.length} itens dentro dela.`
    });
  };

  const promptDeleteItem = (catId: string, item: Item) => {
    setConfirmModal({
      isOpen: true,
      type: 'item',
      catId: catId,
      itemId: item._id,
      userData: null,
      title: `Excluir "${item.name}"?`,
      message: "Quer mesmo remover este item da lista?"
    });
  };

  const handleConfirmAction = async () => {
    if (!confirmModal.type || !roadmap) return;

    // Ação de Remover Usuário
    if (confirmModal.type === 'user' && confirmModal.userData) {
        await fetch('/api/bucket', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                action: 'removeUser',
                roadmapId: roadmap._id,
                emailToRemove: confirmModal.userData
            })
        });
        setConfirmModal({ ...confirmModal, isOpen: false });
        fetchRoadmap();
        return;
    }

    // Ações de Deletar Item/Categoria
    await fetch('/api/bucket', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            roadmapId: roadmap._id,
            categoryId: confirmModal.catId,
            itemId: confirmModal.itemId,
            type: confirmModal.type
        })
    });

    setConfirmModal({ ...confirmModal, isOpen: false });
    fetchRoadmap();
  };

  // --- Stats & Utils ---
  const stats = useMemo(() => {
    if (!roadmap) return { percentage: 0, total: 0, checked: 0 };
    let total = 0;
    let checked = 0;
    roadmap.categories.forEach((cat) => {
      cat.items.forEach((item) => {
        total++;
        if (item.checked) checked++;
      });
    });
    const percentage = total === 0 ? 0 : Math.round((checked / total) * 100);
    return { percentage, total, checked };
  }, [roadmap]);

  const scrollToDescription = (catIndex: number, itemIndex: number) => {
    const uniqueId = `${catIndex}-${itemIndex}`;
    setLastClickedId(null);
    setTimeout(() => setLastClickedId(uniqueId), 10);
    const element = document.getElementById(`desc-${uniqueId}`);
    if (element) {
      element.scrollIntoView({ behavior: "smooth", block: "center" });
    }
  };

  if (loading || !roadmap) return (
    <div className="flex h-screen items-center justify-center bg-gray-50 text-gray-500 flex-col gap-4">
      <i className="fa-solid fa-circle-notch fa-spin text-3xl text-rose-500"></i>
      <p>Carregando roteiro...</p>
    </div>
  );

  const isOwner = session?.user?.email === roadmap.ownerEmail;

  return (
    <div className="bg-gray-50 text-gray-800 min-h-screen flex flex-col font-sans relative">
      <Head>
        <title>{roadmap.name}</title>
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <link href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.0.0/css/all.min.css" rel="stylesheet" />
      </Head>

      {/* --- HEADER --- */}
      <div className="bg-white shadow-sm sticky top-0 z-20">
        <div className="max-w-md mx-auto px-4 py-4">
          
          <div className="flex justify-between items-center">
             <div className="flex items-center gap-3 overflow-hidden">
                <button onClick={() => router.push('/')} className="text-gray-400 hover:text-gray-600 transition-colors">
                    <i className="fa-solid fa-arrow-left"></i>
                </button>
                <h1 className="text-xl font-bold text-gray-900 flex items-center gap-2 truncate">
                    {roadmap.name} <i className="fa-solid fa-heart text-rose-500 animate-pulse text-sm"></i>
                </h1>
             </div>
             
             <div className="flex items-center gap-2">
                <button 
                    onClick={() => setIsModalOpen(true)} 
                    className="bg-gray-900 hover:bg-black text-white text-xs px-4 py-2 rounded-full transition-all font-medium shadow-md shadow-gray-300 flex items-center gap-2"
                >
                    <i className="fa-solid fa-plus"></i> <span className="hidden sm:inline">Adicionar</span>
                </button>

                <button 
                    onClick={() => setIsMenuOpen(true)}
                    className="w-8 h-8 rounded-full bg-gray-100 hover:bg-gray-200 text-gray-600 flex items-center justify-center transition-colors"
                    title="Membros"
                >
                    <i className="fa-solid fa-users"></i>
                </button>
             </div>
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

      {/* --- MODAL DE MEMBROS --- */}
      {isMenuOpen && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center px-4">
            <div className="absolute inset-0 bg-black/60 backdrop-blur-sm transition-opacity" onClick={() => setIsMenuOpen(false)}></div>
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm relative z-10 p-6 animate-in zoom-in-95 duration-200">
                <div className="flex justify-between items-center mb-6">
                    <h3 className="font-bold text-gray-800">Membros do Roteiro</h3>
                    <button onClick={() => setIsMenuOpen(false)}><i className="fa-solid fa-xmark text-gray-400"></i></button>
                </div>

                <div className="mb-6">
                    <label className="block text-xs font-bold text-gray-400 uppercase mb-2">Adicionar Pessoa</label>
                    <form onSubmit={handleInvite} className="flex gap-2">
                        <input 
                            type="email" 
                            value={inviteEmail} 
                            onChange={e => setInviteEmail(e.target.value)} 
                            className="flex-1 border border-gray-200 p-2 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500" 
                            placeholder="email@exemplo.com"
                            required
                        />
                        <button type="submit" className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm font-bold transition-all">
                            Add
                        </button>
                    </form>
                </div>

                <div className="border-t border-gray-100 pt-4">
                    <p className="text-xs font-bold text-gray-400 uppercase mb-3">Adicionados ({(roadmap.invitedDetails?.length || 0) + 1})</p>
                    <ul className="space-y-4 max-h-60 overflow-y-auto pr-1">
                        {/* Dono */}
                        <li className="flex items-center justify-between text-sm text-gray-700 group">
                            <div className="flex items-center gap-3 overflow-hidden">
                                {roadmap.ownerDetails?.image ? (
                                    <img src={roadmap.ownerDetails.image} alt={roadmap.ownerDetails.name} className="w-8 h-8 rounded-full border border-gray-200" />
                                ) : (
                                    <div className="w-8 h-8 rounded-full bg-yellow-100 text-yellow-600 flex items-center justify-center text-xs"><i className="fa-solid fa-crown"></i></div>
                                )}
                                <div className="flex flex-col truncate">
                                    <span className="font-semibold text-gray-800 truncate">{roadmap.ownerDetails?.name || roadmap.ownerEmail}</span>
                                    <span className="text-[10px] text-gray-400 truncate">{roadmap.ownerEmail}</span>
                                </div>
                            </div>
                            <span className="text-[10px] bg-yellow-50 text-yellow-600 border border-yellow-100 px-2 py-0.5 rounded-full font-bold">Dono</span>
                        </li>
                        
                        {/* Convidados */}
                        {roadmap.invitedDetails?.map(user => (
                            <li key={user.email} className="flex items-center justify-between text-sm text-gray-700 group">
                                <div className="flex items-center gap-3 overflow-hidden">
                                    {user.image ? (
                                        <img src={user.image} alt={user.name} className="w-8 h-8 rounded-full border border-gray-200" />
                                    ) : (
                                        <div className="w-8 h-8 rounded-full bg-gray-100 text-gray-400 flex items-center justify-center text-xs"><i className="fa-solid fa-user"></i></div>
                                    )}
                                    <div className="flex flex-col truncate">
                                        <span className="font-semibold text-gray-800 truncate">{user.name || user.email}</span>
                                        <span className="text-[10px] text-gray-400 truncate">{user.email}</span>
                                    </div>
                                </div>
                                
                                {isOwner && (
                                    <button 
                                        onClick={() => promptRemoveUser(user.email, user.name || user.email)}
                                        className="text-gray-300 hover:text-red-500 p-2 opacity-0 group-hover:opacity-100 transition-all focus:opacity-100"
                                        title="Remover acesso"
                                    >
                                        <i className="fa-solid fa-trash-can"></i>
                                    </button>
                                )}
                            </li>
                        ))}

                        {(!roadmap.invitedDetails || roadmap.invitedDetails.length === 0) && (
                           <li className="text-xs text-gray-400 italic text-center py-4 bg-gray-50 rounded-lg">Nenhum convidado ainda.</li>
                        )}
                    </ul>
                </div>
            </div>
        </div>
      )}

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
                        {roadmap.categories.map(cat => <option key={cat._id} value={cat._id}>{cat.category}</option>)}
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

      {/* --- MODAL DE CONFIRMAÇÃO (DELETE & REMOVE USER) --- */}
      {confirmModal.isOpen && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center px-4">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200" onClick={() => setConfirmModal({...confirmModal, isOpen: false})}></div>
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm relative z-10 p-6 animate-in zoom-in-95 duration-200 text-center">
            
            <div className="w-12 h-12 rounded-full bg-red-50 text-red-500 flex items-center justify-center mx-auto mb-4">
                <i className="fa-solid fa-triangle-exclamation text-xl"></i>
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
                    onClick={handleConfirmAction}
                    className="flex-1 bg-red-500 hover:bg-red-600 text-white py-2.5 rounded-xl font-medium transition-colors text-sm shadow-lg shadow-red-500/30"
                >
                    Confirmar
                </button>
            </div>
          </div>
        </div>
      )}

      {/* --- CONTENT (LISTA) --- */}
      {roadmap.categories.length === 0 && (
        <div className="max-w-md mx-auto px-4 mt-10 text-center">
            <div className="bg-white p-8 rounded-2xl shadow-sm border border-gray-100">
                <div className="w-16 h-16 bg-rose-50 rounded-full flex items-center justify-center mx-auto mb-4"><i className="fa-solid fa-layer-group text-rose-500 text-2xl"></i></div>
                <h3 className="font-bold text-gray-800 text-lg mb-2">Roteiro Vazio</h3>
                <p className="text-gray-500 text-sm mb-6">Comece adicionando uma categoria!</p>
                <button onClick={() => { setIsModalOpen(true); setActiveTab('category'); }} className="bg-rose-500 hover:bg-rose-600 text-white px-6 py-3 rounded-xl font-bold shadow-lg shadow-rose-500/30 transition-all w-full">Criar Primeira Categoria</button>
            </div>
        </div>
      )}

      <div className="max-w-md mx-auto px-4 mt-6 space-y-5 grow w-full pb-10">
        {roadmap.categories.map((category, catIndex) => (
          <div key={category._id} className="bg-white rounded-xl shadow-sm overflow-hidden border border-gray-100 hover:border-gray-200 transition-colors group/cat">
            <div className="bg-gray-50/50 px-4 py-3 border-b border-gray-100 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-white flex items-center justify-center shadow-sm text-sm">
                    <i className={`fa-solid ${category.icon} ${category.color}`}></i>
                </div>
                <h2 className="font-bold text-gray-700 text-xs uppercase tracking-wider">{category.category}</h2>
              </div>
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
      {roadmap.categories.length > 0 && (
        <>
            <div className="max-w-md mx-auto px-4 mb-6 w-full">
                <div className="border-t border-gray-200 relative">
                <span className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 bg-gray-50 px-4 text-gray-400 text-xs font-bold uppercase tracking-widest">
                    Detalhes
                </span>
                </div>
            </div>

            <div className="max-w-md mx-auto px-4 pb-20 space-y-4 w-full">
                {roadmap.categories.map((cat, catIndex) =>
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
                                <p className="text-gray-500 text-xs leading-relaxed">{item.desc || "Sem descrição"}</p>
                            </div>
                            <div className={`text-xl ${cat.color} opacity-20`}>
                                <i className={`fa-solid ${cat.icon}`}></i>
                            </div>
                        </div>
                        
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