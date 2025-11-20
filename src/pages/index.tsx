import {useState, useEffect, useMemo} from "react"
import Head from "next/head"
import {bucketData} from "../data"

export default function Home() {
    // Estados
    const [checkedItems, setCheckedItems] = useState<Record<string, boolean>>({})
    const [lastClickedId, setLastClickedId] = useState<string | null>(null)
    const [isLoaded, setIsLoaded] = useState(false)

    // Carregar do LocalStorage
    useEffect(() => {
        const saved = localStorage.getItem("bucketListState")
        if (saved) {
            try {
                setCheckedItems(JSON.parse(saved))
            } catch (e) {
                console.error("Erro ao carregar dados", e)
            }
        }
        setIsLoaded(true)
    }, [])

    // Salvar no LocalStorage
    useEffect(() => {
        if (isLoaded) {
            localStorage.setItem("bucketListState", JSON.stringify(checkedItems))
        }
    }, [checkedItems, isLoaded])

    // Lógica de toggle (Marcar/Desmarcar)
    const toggleItem = (id: string) => {
        setCheckedItems((prev) => ({
            ...prev,
            [id]: !prev[id],
        }))
        // Removemos a lógica de scroll automático ao desmarcar para focar na navegação manual que você pediu
    }

    // Nova função: Rolar até a descrição e destacar
    const scrollToDescription = (id: string) => {
        // 1. Ativa a animação de highlight (reseta antes para garantir que re-anime se clicar 2x)
        setLastClickedId(null)
        setTimeout(() => setLastClickedId(id), 10)

        // 2. Rola a página suavemente até o elemento
        const element = document.getElementById(`desc-${id}`)
        if (element) {
            element.scrollIntoView({behavior: "smooth", block: "center"})
        }
    }

    // Reset
    const resetList = () => {
        if (confirm("Tem certeza que deseja resetar todo o progresso?")) {
            setCheckedItems({})
            window.scrollTo({top: 0, behavior: "smooth"})
        }
    }

    // Estatísticas
    const stats = useMemo(() => {
        let total = 0
        let checked = 0

        bucketData.forEach((cat, catIdx) => {
            cat.items.forEach((_, itemIdx) => {
                total++
                const id = `${catIdx}-${itemIdx}`
                if (checkedItems[id]) checked++
            })
        })

        const percentage = total === 0 ? 0 : Math.round((checked / total) * 100)
        return {total, checked, percentage}
    }, [checkedItems])

    // Previne erro de hidratação
    if (!isLoaded) return null

    return (
        <div className="bg-gray-50 text-gray-800 min-h-screen flex flex-col font-sans">
            <Head>
                <title>Nosso Bucket List & Guia</title>
                <meta name="viewport" content="width=device-width, initial-scale=1" />
                <script src="https://cdn.tailwindcss.com"></script>
                <link href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.0.0/css/all.min.css" rel="stylesheet" />
            </Head>

            {/* Header Sticky */}
            <div className="bg-white shadow-sm sticky top-0 z-20">
                <div className="max-w-md mx-auto px-4 py-4">
                    <h1 className="text-2xl font-bold text-center text-gray-900">
                        Nosso Roteiro <i className="fa-solid fa-heart text-rose-500"></i>
                    </h1>

                    {/* Barra de Progresso */}
                    <div className="mt-4">
                        <div className="flex justify-between text-xs font-semibold text-gray-500 mb-1">
                            <span>Progresso</span>
                            <span>{stats.percentage}%</span>
                        </div>
                        <div className="w-full bg-gray-200 rounded-full h-2.5 overflow-hidden">
                            <div
                                className="bg-rose-500 h-2.5 rounded-full transition-all duration-500 shadow-lg shadow-rose-500/30"
                                style={{width: `${stats.percentage}%`}}
                            ></div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Lista de Itens */}
            <div className="max-w-md mx-auto px-4 mt-6 space-y-6 grow w-full">
                {bucketData.map((category, catIndex) => (
                    <div key={catIndex} className="bg-white rounded-xl shadow-sm overflow-hidden border border-gray-100">
                        <div className="bg-gray-50 px-4 py-3 border-b border-gray-100 flex items-center gap-3">
                            <div className="w-8 h-8 rounded-full bg-white flex items-center justify-center shadow-sm">
                                <i className={`fa-solid ${category.icon} ${category.color}`}></i>
                            </div>
                            <h2 className="font-bold text-gray-700 text-sm uppercase tracking-wide">{category.category}</h2>
                        </div>

                        <div className="divide-y divide-gray-50">
                            {category.items.map((item, itemIdx) => {
                                const id = `${catIndex}-${itemIdx}`
                                const isChecked = !!checkedItems[id]

                                return (
                                    <div
                                        key={id}
                                        className="flex items-center px-4 py-3 hover:bg-gray-50 transition-colors group justify-between"
                                    >
                                        <div className="flex items-center gap-3 overflow-hidden">
                                            {/* 1. CHECKBOX: Isolado em um label para só ele ativar o check */}
                                            <label className="cursor-pointer relative flex items-center checkbox-wrapper shrink-0 p-1 -ml-1">
                                                <input
                                                    type="checkbox"
                                                    className="peer sr-only"
                                                    checked={isChecked}
                                                    onChange={() => toggleItem(id)}
                                                />
                                                <div
                                                    className={`
                                                        w-5 h-5 border-2 rounded transition-all duration-200 flex items-center justify-center
                                                        ${isChecked ? "bg-emerald-500 border-emerald-500 scale-105" : "border-gray-300 bg-white hover:border-gray-400"}
                                                        `}
                                                >
                                                    <svg
                                                        className={`w-3 h-3 text-white fill-current ${isChecked ? "block" : "hidden"}`}
                                                        viewBox="0 0 20 20"
                                                    >
                                                        <path d="M0 11l2-2 5 5L18 3l2 2L7 18z" />
                                                    </svg>
                                                </div>
                                            </label>

                                            {/* 2. TEXTO: Agora é clicável e leva para a descrição */}
                                            <button
                                                onClick={() => scrollToDescription(id)}
                                                className={`text-sm text-left truncate transition-all duration-200 hover:text-rose-500 ${
                                                    isChecked ? "text-gray-400 line-through" : "text-gray-700"
                                                }`}
                                            >
                                                {item.name}
                                            </button>
                                        </div>

                                        {/* 3. LINK/BOTÃOZINHO: Ícone visual para indicar 'Ver detalhes' */}
                                        <button
                                            onClick={() => scrollToDescription(id)}
                                            className="text-gray-300 hover:text-rose-500 hover:bg-rose-50 p-1.5 rounded-full transition-all shrink-0 ml-2"
                                            title="Ver detalhes"
                                        >
                                            <i className="fa-solid fa-circle-info text-xs"></i>
                                        </button>
                                    </div>
                                )
                            })}
                        </div>
                    </div>
                ))}
            </div>

            {/* Rodapé e Botões */}
            <div className="max-w-md mx-auto px-4 mt-12 text-center w-full">
                <div className="mb-4 flex items-center justify-center gap-2 text-xs text-emerald-600 bg-emerald-50 py-2 px-4 rounded-full w-fit mx-auto border border-emerald-100">
                    <i className="fa-solid fa-cloud-arrow-up"></i>
                    Progresso salvo automaticamente
                </div>
                <button onClick={resetList} className="text-xs text-gray-400 hover:text-red-500 underline transition-colors">
                    Resetar toda a lista
                </button>
            </div>

            {/* Divisória */}
            <div className="max-w-md mx-auto px-4 mt-12 mb-6 w-full">
                <div className="border-t border-gray-200 relative">
                    <span className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 bg-gray-50 px-4 text-gray-400 text-sm font-medium">
                        Guia Detalhado
                    </span>
                </div>
            </div>

            {/* Descrições (Cards) */}
            <div className="max-w-md mx-auto px-4 pb-20 space-y-4 w-full">
                {bucketData.map((cat, catIndex) =>
                    cat.items.map((item, itemIdx) => {
                        const id = `${catIndex}-${itemIdx}`
                        const isHighlight = lastClickedId === id

                        return (
                            <div
                                key={`desc-${id}`}
                                id={`desc-${id}`}
                                className={`
                    bg-white p-4 rounded-lg border border-gray-100 shadow-sm transition-all duration-500 scroll-mt-24
                    ${isHighlight ? "animate-highlight ring-2 ring-yellow-200" : ""}
                `}
                            >
                                <h3 className="font-bold text-gray-800 text-sm mb-1 flex items-center gap-2">
                                    {item.name}
                                    {checkedItems[id] && (
                                        <span className="text-xs text-emerald-500 bg-emerald-50 px-2 py-0.5 rounded-full font-normal">
                                            Feito
                                        </span>
                                    )}
                                </h3>
                                <p className="text-gray-500 text-xs leading-relaxed">{item.desc}</p>
                                <div className="mt-2 flex items-center gap-1 text-[10px] text-gray-400 uppercase tracking-wider font-semibold">
                                    <i className={`fa-solid ${cat.icon} text-gray-300`}></i>
                                    {cat.category}
                                </div>
                            </div>
                        )
                    })
                )}
            </div>
        </div>
    )
}
