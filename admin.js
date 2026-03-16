import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { getFirestore, collection, query, orderBy, onSnapshot, doc, updateDoc, deleteDoc, addDoc, serverTimestamp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

const firebaseConfig = {
  apiKey: "AIzaSyDs17Az4-kB--3LdBs1KwPNDrEr37jYkCU",
  authDomain: "esquina-sabor-real.firebaseapp.com",
  projectId: "esquina-sabor-real",
  storageBucket: "esquina-sabor-real.firebasestorage.app",
  messagingSenderId: "423163019859",
  appId: "1:423163019859:web:31d00ff2004ec7e8bb7ca6"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

// --- 1. SELEÇÃO DE ELEMENTOS DO DOM ---
const colPendente = document.getElementById('col-pendente');
const colPreparando = document.getElementById('col-preparando');
const colFinalizado = document.getElementById('col-finalizado');
const statsDiv = document.getElementById('stats');
const mesaGridAdmin = document.getElementById('mesa-grid-admin');

// --- 2. LÓGICA DE NAVEGAÇÃO (COLOQUE AQUI) ---
window.switchView = (viewId, el) => {
    // Remove o estado ativo de todas as seções e links
    document.querySelectorAll('.view-section').forEach(s => s.classList.remove('active'));
    document.querySelectorAll('.nav-link').forEach(l => l.classList.remove('active'));
    
    // Ativa a seção correspondente
    document.getElementById(viewId).classList.add('active');
    
    // Se o elemento foi passado (pelo clique), marca como ativo no menu
    if (el) el.classList.add('active');
};

// Configura a URL para os garçons conectarem
const configUrl = document.getElementById('url-garcom');
if (configUrl) {
    configUrl.innerText = window.location.origin + "/garcom.html";
}

// --- 3. GESTÃO FINANCEIRA E REAL-TIME ---
let faturamentoFinalizado = 0;
let faturamentoMesasAberto = 0;

// Escutar pedidos de Delivery/Retirada
onSnapshot(query(collection(db, "pedidos"), orderBy("data", "desc")), (snapshot) => {
    colPendente.innerHTML = "";
    colPreparando.innerHTML = "";
    colFinalizado.innerHTML = "";
    faturamentoFinalizado = 0;

    snapshot.forEach((docSnap) => {
        const pedido = docSnap.data();
        if (pedido.status === "Finalizado") faturamentoFinalizado += (pedido.total || 0);
        renderCard(docSnap.id, pedido);
    });
    atualizarDashboard();
});

// Escutar mesas para o Salão
onSnapshot(collection(db, "mesas"), (snapshot) => {
    faturamentoMesasAberto = 0;
    if (mesaGridAdmin) mesaGridAdmin.innerHTML = "";

    snapshot.forEach((docSnap) => {
        const mesa = docSnap.data();
        if (mesa.status === "ocupada") faturamentoMesasAberto += (mesa.total || 0);
        
        if (mesaGridAdmin) renderMesaAdmin(docSnap.id, mesa);
    });
    atualizarDashboard();
});

function atualizarDashboard() {
    if (statsDiv) {
        const totalGeral = faturamentoFinalizado + faturamentoMesasAberto;
        statsDiv.innerHTML = `
            <div class="kpi-card">
                <span class="kpi-label">💰 Caixa (Finalizados)</span>
                <span class="kpi-value" style="color: #10b981;">R$ ${faturamentoFinalizado.toFixed(2).replace('.', ',')}</span>
            </div>
            <div class="kpi-card">
                <span class="kpi-label">🍽️ Em Mesa</span>
                <span class="kpi-value" style="color: #f59e0b;">R$ ${faturamentoMesasAberto.toFixed(2).replace('.', ',')}</span>
            </div>
            <div class="kpi-card" style="border-color: #3b82f6;">
                <span class="kpi-label" style="color: #60a5fa;">🚀 Total</span>
                <span class="kpi-value">R$ ${totalGeral.toFixed(2).replace('.', ',')}</span>
            </div>
        `;
    }
}   

onSnapshot(collection(db, "estoque"), (snapshot) => {
    const listaEstoque = document.getElementById('lista-estoque');
    if (!listaEstoque) return;
    
    listaEstoque.innerHTML = "";
    snapshot.forEach(docSnap => {
        const item = docSnap.data();
        const corStatus = item.quantidade < 10 ? '#ef4444' : '#10b981'; 
        
        listaEstoque.innerHTML += `
            <div class="kpi-card">
                <span class="kpi-label">${item.nome}</span>
                <span class="kpi-value" style="color: ${corStatus}">${item.quantidade} ${item.unidade}</span>
                <div style="margin-top: 10px; display: flex; gap: 5px;">
                    <button onclick="ajustarEstoque('${docSnap.id}', 1)" style="background: #334155; border: none; color: white; padding: 5px 10px; border-radius: 5px; cursor: pointer;">+</button>
                    <button onclick="ajustarEstoque('${docSnap.id}', -1)" style="background: #334155; border: none; color: white; padding: 5px 10px; border-radius: 5px; cursor: pointer;">-</button>
                </div>
            </div>
        `;
    });
});

// --- (PDV) ---

// LÓGICA DE FRENTE DE CAIXA (PDV BALCÃO) E ESTOQUE AUTOMÁTICO ---

let carrinhoBalcao = [];
let totalBalcao = 0;

window.lancarPedidoManual = () => {
    document.getElementById('modal-balcao').style.display = 'block';
    carrinhoBalcao = [];
    totalBalcao = 0;
    atualizarCarrinhoBalcao();
};

window.fecharModalBalcao = () => {
    document.getElementById('modal-balcao').style.display = 'none';
};

window.adicionarItemBalcao = () => {
    const select = document.getElementById('select-produto-balcao');
    const valor = parseFloat(select.value);
    const nome = select.options[select.selectedIndex].text;
    
    if (!valor) return alert("Selecione um produto!");

    carrinhoBalcao.push({ name: nome, price: valor });
    totalBalcao += valor;
    
    atualizarCarrinhoBalcao();
    select.selectedIndex = 0; // Reseta o select
};

function atualizarCarrinhoBalcao() {
    const lista = document.getElementById('lista-itens-balcao');
    lista.innerHTML = "";
    carrinhoBalcao.forEach((item, index) => {
        lista.innerHTML += `<div style="display: flex; justify-content: space-between; margin-bottom: 5px;">
            <span>• ${item.name}</span>
            <button onclick="removerItemBalcao(${index})" style="background: transparent; color: #ef4444; border: none; cursor: pointer;">❌</button>
        </div>`;
    });
    document.getElementById('total-balcao').innerText = totalBalcao.toFixed(2).replace('.', ',');
}

window.removerItemBalcao = (index) => {
    totalBalcao -= carrinhoBalcao[index].price;
    carrinhoBalcao.splice(index, 1);
    atualizarCarrinhoBalcao();
};

window.finalizarPedidoBalcao = async () => {
    const cliente = document.getElementById('input-cliente-balcao').value;
    if (!cliente) return alert("Preencha o nome do cliente!");
    if (carrinhoBalcao.length === 0) return alert("A comanda está vazia!");

    try {
        // Salva o pedido no banco de dados (Aparece na coluna de Pendentes)
        await addDoc(collection(db, "pedidos"), {
            cliente: cliente,
            status: "Pendente",
            data: serverTimestamp(),
            total: totalBalcao,
            itens: carrinhoBalcao,
            metodo: "Balcão",
            pagamento: "A combinar no Caixa"
        });

        const qtdLanches = carrinhoBalcao.filter(i => i.name.includes("X-")).length;
        
        if (qtdLanches > 0) {
            console.log(`Abatendo ${qtdLanches} pães do estoque...`);
            alert(`Pedido finalizado! O sistema reconheceu ${qtdLanches} lanches e descontaria do estoque.`);
        } else {
            alert("Pedido lançado com sucesso!");
        }

        fecharModalBalcao();
        document.getElementById('input-cliente-balcao').value = "";
    } catch (e) {
        console.error("Erro ao finalizar:", e);
        alert("Erro ao lançar pedido.");
    }
};

//  PARA CRIAR O CARD DO PEDIDO
function renderCard(id, pedido) {
    const card = document.createElement('div');
    card.classList.add('order-card');
    if (pedido.status === "Preparando") card.classList.add('preparando');
    if (pedido.status === "Finalizado") card.classList.add('finalizado');
    
    const ehEntrega = pedido.metodo && pedido.metodo.toLowerCase() === 'entrega';

    let itensHtml = "";
    pedido.itens.forEach(i => {
        itensHtml += `• ${i.name}<br>`;
    });

    card.innerHTML = `
        <div class="order-header">
            <span>👤 ${pedido.cliente}</span>
            <span>💰 R$ ${pedido.total.toFixed(2).replace('.', ',')}</span>
        </div>
        <div style="font-size: 0.8rem; color: #aaa; margin-bottom: 5px;">
            🛵 ${ehEntrega ? 'Entrega' : 'Retirada'} | 💳 ${pedido.pagamento}
        </div>
        
        ${ehEntrega ? `<div style="font-size: 0.8rem; color: #ccc; margin-bottom: 8px;">📍 ${pedido.endereco}</div>` : ''}
        
        <div class="order-items">${itensHtml}</div>
        
        ${pedido.obs ? `<div style="color: #ffc300; font-size: 0.8rem; margin-top: 5px;">📝 <b>Obs:</b> ${pedido.obs}</div>` : ''}
        
        <div class="admin-btns" style="margin-top: 15px;">
            ${pedido.status === "Pendente" ? `<button class="btn-accept" onclick="alterarStatus('${id}', 'Preparando')">Aceitar</button>` : ''}
            ${pedido.status === "Preparando" ? `<button class="btn-done" onclick="alterarStatus('${id}', 'Finalizado')">Concluir</button>` : ''}
            <button class="btn-cancel" onclick="excluirPedido('${id}')">Excluir</button>
        </div>
    `;

    if (pedido.status === "Pendente") colPendente.appendChild(card);
    else if (pedido.status === "Preparando") colPreparando.appendChild(card);
    else if (pedido.status === "Finalizado") colFinalizado.appendChild(card);
}
 
window.alterarStatus = async (id, novoStatus) => {
    try {
        const pedidoRef = doc(db, "pedidos", id);
        await updateDoc(pedidoRef, { status: novoStatus });
    } catch (e) {
        console.error("Erro ao atualizar status:", e);
    }
};

window.excluirPedido = async (id) => {
    if (confirm("Tem certeza que deseja excluir este pedido do sistema?")) {
        try {
            await deleteDoc(doc(db, "pedidos", id));
        } catch (e) {
            console.error("Erro ao excluir:", e);
        }
    }
};

window.ajustarEstoque = async (id, mudanca) => {
    const ref = doc(db, "estoque", id);
    const snap = await getDoc(ref);
    await updateDoc(ref, { quantidade: snap.data().quantidade + mudanca });
};

window.adicionarInsumo = async () => {
    const nome = prompt("Nome do Insumo (ex: Pão de Hambúrguer):");
    const qtd = Number(prompt("Quantidade inicial:"));
    if (nome && !isNaN(qtd)) {
        await addDoc(collection(db, "estoque"), { nome, quantidade: qtd, unidade: "un" });
    }
};