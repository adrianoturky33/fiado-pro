import { useEffect, useState } from "react";
import { db } from "./firebase";
import {
  collection, addDoc, doc, updateDoc, deleteDoc,
  serverTimestamp, writeBatch, query, where, orderBy, onSnapshot
} from "firebase/firestore";
import { 
  Wallet, Search, Trash2, Pencil, X, Plus, DollarSign, AlertCircle, Loader2 
} from "lucide-react";

// Helper para formatar moeda
const fMoeda = (valor) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(valor || 0);

function App() {
  const [formData, setFormData] = useState({ nome: "", apelido: "", telefone: "", endereco: "", vencimento: "" });
  const [editandoId, setEditandoId] = useState(null);
  const [clientes, setClientes] = useState([]);
  const [busca, setBusca] = useState("");
  const [clienteSelecionado, setClienteSelecionado] = useState(null);
  const [modalAberto, setModalAberto] = useState(null); 
  const [valorVenda, setValorVenda] = useState("");
  const [valorPagamento, setValorPagamento] = useState("");
  const [metodoPagamento, setMetodoPagamento] = useState("PIX");
  const [historico, setHistorico] = useState([]);
  const [carregando, setCarregando] = useState(true);

  useEffect(() => {
    const q = query(collection(db, "clientes"), orderBy("nome", "asc"));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const lista = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setClientes(lista);
      setCarregando(false);
    });
    return () => unsubscribe();
  }, []);

  // ✅ HISTÓRICO EM TEMPO REAL
  useEffect(() => {
    if (!clienteSelecionado) return;

    const q = query(
      collection(db, "historico"),
      where("clienteId", "==", clienteSelecionado.id),
      orderBy("data", "desc")
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const lista = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      setHistorico(lista);
    });

    return () => unsubscribe();
  }, [clienteSelecionado]);

  const totalGeralAReceber = clientes.reduce((acc, c) => acc + ((c.totalFiado || 0) - (c.totalPago || 0)), 0);
  const devedoresAtivos = clientes.filter(c => (c.totalFiado - (c.totalPago || 0)) > 0).length;

  async function finalizarOperacao(tipo) {
    const valor = tipo === 'venda' ? Number(valorVenda) : Number(valorPagamento);
    if (!valor || valor <= 0) return alert("Digite um valor válido");
    try {
      const batch = writeBatch(db);
      const histRef = doc(collection(db, "historico"));
      batch.set(histRef, {
        clienteId: clienteSelecionado.id,
        tipo,
        total: valor,
        metodo: tipo === 'pagamento' ? metodoPagamento : null,
        data: serverTimestamp()
      });
      const clienteRef = doc(db, "clientes", clienteSelecionado.id);
      const atualizacao = tipo === 'venda' 
        ? { totalFiado: (clienteSelecionado.totalFiado || 0) + valor }
        : { totalPago: (clienteSelecionado.totalPago || 0) + valor };
      batch.update(clienteRef, atualizacao);
      await batch.commit();
      setModalAberto(null);
      setValorVenda("");
      setValorPagamento("");
    } catch (e) { alert("Erro: " + e.message); }
  }

  // ✅ CRIAR / EDITAR CLIENTE
  async function salvarCliente() {
    try {
      if (!formData.nome) {
        alert("Nome é obrigatório");
        return;
      }

      if (editandoId) {
        await updateDoc(doc(db, "clientes", editandoId), {
          nome: formData.nome,
          apelido: formData.apelido,
          telefone: formData.telefone,
          endereco: formData.endereco,
          vencimento: formData.vencimento
        });
      } else {
        await addDoc(collection(db, "clientes"), {
          nome: formData.nome,
          apelido: formData.apelido,
          telefone: formData.telefone,
          endereco: formData.endereco,
          vencimento: formData.vencimento,
          totalFiado: 0,
          totalPago: 0,
          criadoEm: serverTimestamp()
        });
      }

      setModalAberto(null);
      setFormData({ nome: "", apelido: "", telefone: "", endereco: "", vencimento: "" });
      setEditandoId(null);

    } catch (e) {
      alert("Erro: " + e.message);
    }
  }

  // ✅ DELETAR CLIENTE
  async function deletarCliente(id) {
    if (!confirm("Deseja excluir este cliente?")) return;

    try {
      await deleteDoc(doc(db, "clientes", id));
    } catch (e) {
      alert("Erro ao deletar: " + e.message);
    }
  }

  const clientesFiltrados = clientes.filter(c => 
    c.nome.toLowerCase().includes(busca.toLowerCase()) || 
    (c.apelido && c.apelido.toLowerCase().includes(busca.toLowerCase()))
  );

  return (
    <div className="min-h-screen bg-[#0f172a] text-slate-200 p-4 md:p-8 font-sans">
      <div className="max-w-6xl mx-auto">
        
        <div className="bg-[#1e293b] p-5 rounded-3xl border border-slate-700 shadow-2xl mb-10 flex flex-col lg:flex-row justify-between items-center gap-6">
          
          <div className="flex flex-col md:flex-row items-center gap-6 w-full lg:w-auto flex-1">
            <div className="flex items-center gap-3 shrink-0">
              <div className="bg-yellow-500/10 p-2 rounded-xl border border-yellow-500/20">
                <Wallet className="text-yellow-500" size={28} />
              </div>
              <h1 className="text-2xl font-black text-white tracking-tighter uppercase">
                Fiado<span className="text-yellow-500">Pro</span>
              </h1>
            </div>

            <div className="relative flex-1 w-full max-w-md">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500" size={18} />
              <input 
                placeholder="Buscar cliente..." 
                className="bg-[#0f172a] pl-11 pr-4 py-3 rounded-2xl w-full border border-slate-700 outline-none focus:ring-2 focus:ring-emerald-500 transition-all text-sm shadow-inner"
                value={busca}
                onChange={(e) => setBusca(e.target.value)}
              />
            </div>
          </div>

          <div className="flex flex-wrap items-center justify-center gap-4 shrink-0">
            <div className="flex gap-3">
              <div className="bg-[#0f172a] px-5 py-3 rounded-2xl border border-emerald-500/20 text-center min-w-[140px]">
                <p className="text-[9px] uppercase tracking-[0.2em] text-emerald-500 font-bold mb-1">A Receber</p>
                <p className="text-emerald-400 text-xl font-black">{fMoeda(totalGeralAReceber)}</p>
              </div>

              <div className="bg-[#0f172a] px-5 py-3 rounded-2xl border border-rose-500/20 text-center min-w-[110px]">
                <p className="text-[9px] uppercase tracking-[0.2em] text-rose-500 font-bold mb-1">Atrasados</p>
                <p className="text-rose-400 text-xl font-black">{devedoresAtivos}</p>
              </div>
            </div>

            <button 
              onClick={() => { setEditandoId(null); setFormData({nome:"", apelido:"", telefone:"", endereco:"", vencimento: ""}); setModalAberto('cliente'); }} 
              className="bg-emerald-600 px-6 py-3.5 rounded-2xl font-bold flex items-center gap-2 text-white text-sm"
            >
              <Plus size={18} /> Novo Cliente
            </button>
          </div>
        </div>

        {carregando ? (
          <div className="flex justify-center py-20"><Loader2 className="animate-spin text-emerald-500" size={40} /></div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {clientesFiltrados.map(c => {
              const saldo = (c.totalFiado || 0) - (c.totalPago || 0);
              return (
                <div key={c.id} className="bg-[#1e293b] border p-5 rounded-3xl flex justify-between items-center">
                  
                  <div className="flex-1">
                    <h4 className="font-bold text-white">{c.nome}</h4>
                    <p className="text-xl">{fMoeda(saldo)}</p>
                  </div>

                  <div className="flex gap-2">
                    <button onClick={() => { setClienteSelecionado(c); setModalAberto('venda'); }}>
                      <Plus />
                    </button>
                    <button onClick={() => { setClienteSelecionado(c); setModalAberto('pagamento'); }}>
                      <DollarSign />
                    </button>
                    <button onClick={() => { setEditandoId(c.id); setFormData(c); setModalAberto('cliente'); }}>
                      <Pencil />
                    </button>
                    <button onClick={() => deletarCliente(c.id)}>
                      <Trash2 />
                    </button>
                  </div>

                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

export default App;