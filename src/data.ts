export interface BucketItem {
  name: string;
  desc: string;
}

export interface BucketCategory {
  category: string;
  icon: string;
  color: string;
  items: BucketItem[];
}

export const bucketData: BucketCategory[] = [
  {
    category: "🇮🇹 Italiano & Massas",
    icon: "fa-pizza-slice",
    color: "text-orange-500",
    items: [
      { name: "Vicenzo Spaghetteria", desc: "Focado em massas frescas e molhos caseiros. Ambiente descontraído." },
      { name: "Peppo Cucina", desc: "Clássico no Moinhos de Vento. Italiano sofisticado em um casarão." },
      { name: "Puppi Baggio", desc: "Comfort food. Famoso pelas massas com molhos encorpados." },
      { name: "Sfoglia", desc: "Especializado em massas artesanais e pães." },
      { name: "Barolo", desc: "Tradicionalíssimo. Porções fartas para dividir." },
      { name: "Giuseppe Ristorante", desc: "Tradicional focado em massas e grelhados." }
    ]
  },
  {
    category: "🍣 Japonês & Asiático",
    icon: "fa-fish",
    color: "text-red-500",
    items: [
      { name: "Makoto", desc: "Sushi tradicional e steakhouse japonês." },
      { name: "Kampeki", desc: "Rodízio e à la carte, bom custo-benefício." },
      { name: "Sushito", desc: "Proposta jovem, forte em delivery." },
      { name: "Zada", desc: "Pode ser o Sushi ou Árabe. Ambos bons." },
      { name: "Koh Pee Pee", desc: "Tailandês famoso e premiado. Picante e autêntico." },
      { name: "Giosakaya", desc: "Izakaya ou referência à Gioia." }
    ]
  },
  {
    category: "🍸 Drinks, Tapas & Vibe",
    icon: "fa-martini-glass",
    color: "text-purple-500",
    items: [
      { name: "Vasco da Gama 1020", desc: "Espaço cultural e bar descolado." },
      { name: "Locale", desc: "Café, pizza napolitana e drinks." },
      { name: "Tuyo", desc: "Cocina Ibérica. Vinhos e tapas." },
      { name: "Península Bar", desc: "Coquetelaria sofisticada na beira do Guaíba." },
      { name: "Lola Bar de Tapas", desc: "Espanhol. Sangria e petiscos." },
      { name: "Oh Bruder", desc: "Hamburgueria e cervejaria." },
      { name: "Tetto", desc: "Rooftop lounge com vista." },
      { name: "Chica Parrilla y Bar", desc: "Parrilla em ambiente de bar." },
      { name: "Golden hour + House music", desc: "Pôr do sol com drink e música eletrônica." }
    ]
  },
  {
    category: "☕ Cafés & Brunch",
    icon: "fa-mug-hot",
    color: "text-amber-600",
    items: [
      { name: "Ginkgo", desc: "Café dentro de floricultura." },
      { name: "Musa Velutina", desc: "Café com jardim e ingredientes brasileiros." },
      { name: "Ofertorio", desc: "Bistrô e café, ótimo para brunch." },
      { name: "Sabor de Luna", desc: "Padaria uruguaia autêntica." },
      { name: "Machry", desc: "Clássico da Zona Sul. Tortas famosas." },
      { name: "Corrida e café", desc: "Exercício seguido de café gourmet." }
    ]
  },
  {
    category: "🥂 Jantar Sofisticado",
    icon: "fa-utensils",
    color: "text-slate-700",
    items: [
      { name: "Capincho", desc: "Cozinha autoral do sul, moderna." },
      { name: "Le Bateau Ivre", desc: "Francês clássico e sofisticado." },
      { name: "The Raven", desc: "Restaurante e Pub estilo taberna." },
      { name: "BAH", desc: "Culinária gaúcha reinterpretada." },
      {name: "20/9", desc: "Parrilla, que serve carnes e hambúrgueres na brasa"}
    ]
  },
  {
    category: "🏎️ Adrenalina & Esportes",
    icon: "fa-stopwatch",
    color: "text-blue-600",
    items: [
      { name: "Role no kart 2.0", desc: "Competição na pista." },
      { name: "Treinar juntos", desc: "Gym Date." },
      { name: "Jogar sinuqueta", desc: "Ensinar o João a jogar sinuca." }
    ]
  },
  {
    category: "🏠 Conforto & Relax",
    icon: "fa-bed",
    color: "text-indigo-400",
    items: [
      { name: "Assistir 'Pecadores'", desc: "Cinema em casa." },
      { name: "Assistir 'Todo Mundo em Pânico'", desc: "Comédia besteirol." },
      { name: "Lego do Ayrton 🥵", desc: "Montar a McLaren MP4/4." },
      { name: "Neneca de domingo", desc: "Descanso pós almoço sem despertador." }
    ]
  },
  {
    category: "✈️ Sonhos (Big Goals)",
    icon: "fa-plane",
    color: "text-emerald-600",
    items: [
      { name: "Interlagos", desc: "GP de F1 ou track day." },
      { name: "Restaurante Porsche LA", desc: "Restaurant 917 no Experience Center." }
    ]
  }
];