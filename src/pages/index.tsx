import { useState, useEffect } from 'react';
import Head from 'next/head';
import { useRouter } from 'next/router';
import { LogOut, Loader2, Users, Trash2, Map, Plus } from 'lucide-react';
import { useSession, signIn, signOut } from "next-auth/react";
import Image from 'next/image';

interface Roadmap {
  _id: string;
  name: string;
  ownerEmail: string;
  invitedUsers: string[];
  categories: any[];
}

export default function Home() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [roadmaps, setRoadmaps] = useState<Roadmap[]>([]);
  const [loading, setLoading] = useState(true);
  const [newRoadmapName, setNewRoadmapName] = useState('');

  useEffect(() => {
    if (status === 'authenticated') {
      fetchRoadmaps();
    }
  }, [status]);

  const fetchRoadmaps = async () => {
    try {
      const response = await fetch('/api/bucket');
      const data = await response.json();
      setRoadmaps(data);
    } catch (error) {
      console.error('Failed to fetch roadmaps:', error);
    } finally {
      setLoading(false);
    }
  };

  const createRoadmap = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newRoadmapName.trim()) return;
    await fetch('/api/bucket', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'createRoadmap', name: newRoadmapName }),
    });
    setNewRoadmapName('');
    fetchRoadmaps();
  };

  const deleteRoadmap = async (roadmapId: string) => {
    if (!confirm('Tem certeza? Isso apagará todo o roteiro.')) return;
    await fetch('/api/bucket', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ roadmapId, type: 'roadmap' }),
    });
    fetchRoadmaps();
  };

  if (status === "loading") {
    return <div className="min-h-screen flex items-center justify-center bg-gray-50"><Loader2 className="animate-spin text-blue-600" /></div>;
  }

  if (status === "unauthenticated") {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50 px-4">
        <div className="bg-white p-8 rounded-xl shadow-lg text-center max-w-md w-full">
          <h1 className="text-2xl font-bold mb-4">Bucket List & Roadmaps</h1>
          <button onClick={() => signIn('google')} className="w-full flex items-center justify-center gap-2 bg-blue-600 text-white py-3 rounded-lg hover:bg-blue-700">
             Entrar com Google
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Head><title>Meus Roteiros</title></Head>

      {/* Header */}
      <header className="bg-white border-b border-gray-200 px-4 py-4">
        <div className="max-w-5xl mx-auto flex justify-between items-center">
          <div className="flex items-center gap-2">
            <Map className="text-blue-600" />
            <h1 className="text-xl font-bold text-gray-900">Bucket List</h1>
          </div>
          <div className="flex items-center gap-4">
            <span className="text-sm text-gray-500 hidden sm:inline">{session?.user?.email}</span>
             {session?.user?.image && (
                <Image src={session.user.image} alt="Profile" width={32} height={32} className="rounded-full border" />
              )}
            <button onClick={() => signOut()} className="text-red-500 hover:bg-red-50 p-2 rounded-full"><LogOut size={20} /></button>
          </div>
        </div>
      </header>

      <main className="max-w-5xl mx-auto py-8 px-4">
         <h2 className="text-2xl font-bold text-gray-800 mb-6">Meus Roteiros</h2>
         
         {/* Criar Novo Roteiro */}
         <form onSubmit={createRoadmap} className="mb-8 flex gap-2">
           <input 
             type="text" 
             placeholder="Nome do novo roteiro (ex: Viagem Japão)" 
             className="flex-1 px-4 py-3 rounded-lg border border-gray-300 shadow-sm focus:ring-2 focus:ring-blue-500 outline-none"
             value={newRoadmapName}
             onChange={e => setNewRoadmapName(e.target.value)}
           />
           <button type="submit" disabled={!newRoadmapName} className="bg-blue-600 text-white px-6 py-3 rounded-lg font-medium hover:bg-blue-700 disabled:opacity-50 flex items-center gap-2">
             <Plus size={20} /> Criar
           </button>
         </form>

         {/* Grid de Roteiros */}
         {loading ? (
            <div className="text-center py-10"><Loader2 className="animate-spin inline text-blue-600"/> Carregando...</div>
         ) : (
           <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {roadmaps.map(roadmap => {
                const isOwner = roadmap.ownerEmail === session?.user?.email;

                const isInvited = roadmap.invitedUsers.includes(session?.user?.email ?? "");
                
                return (
                  <div 
                    key={roadmap._id} 
                    className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 hover:shadow-md transition-all cursor-pointer relative group hover:border-blue-300"
                    onClick={() => router.push(`/roadmap/${roadmap._id}`)}
                  >
                    <h3 className="text-lg font-bold text-gray-900 mb-2">{roadmap.name}</h3>
                    <p className="text-sm text-gray-500 mb-4">
                      {roadmap.categories.length} categorias • {roadmap.categories.reduce((acc: any, c: any) => acc + c.items.length, 0)} itens
                    </p>
                    <div className="flex items-center gap-2 text-xs text-gray-400">
                      <Users size={14} />
                      {isOwner ? 'Você é o dono' : `De: ${roadmap.ownerEmail}`}
                    </div>
                    {/* Botão de excluir APENAS para o dono */}
                    {isOwner && (
                      <button 
                        onClick={(e) => { e.stopPropagation(); deleteRoadmap(roadmap._id); }}
                        className="absolute top-4 right-4 text-gray-300 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity p-2"
                        title="Excluir Roteiro"
                      >
                        <Trash2 size={18} />
                      </button>
                    )}
                  </div>
                );
              })}
              
              {roadmaps.length === 0 && (
                <div className="col-span-full text-center py-12 bg-gray-50 rounded-lg border border-dashed border-gray-300 text-gray-500">
                  Você ainda não tem roteiros. Crie um acima!
                </div>
              )}
           </div>
         )}
      </main>
    </div>
  );
}