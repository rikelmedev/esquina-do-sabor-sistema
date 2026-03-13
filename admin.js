import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { getFirestore, collection, query, orderBy, onSnapshot, doc, updateDoc, deleteDoc } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

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

const colPendente = document.getElementById('col-pendente');
const colPreparando = document.getElementById('col-preparando');
const colFinalizado = document.getElementById('col-finalizado');
const statsDiv = document.getElementById('stats');

let faturamentoFinalizado = 0;
let faturamentoMesasAberto = 0;

// 1. ESCUTAR PEDIDOS EM TEMPO REAL (Delivery/Retirada)
const qPedidos = query(collection(db, "pedidos"), orderBy("data", "desc"));

onSnapshot(qPedidos, (snapshot) => {
    snapshot.docChanges().forEach((change) => {
        if (change.type === "added") {
            const alertSound = new Audio('https://notificationsounds.com/storage/sounds/file-sounds-1150-pristine.mp3');
            alertSound.play().catch(e => console.log("Áudio bloqueado: Interaja com a página primeiro."));
        }
    });

    colPendente.innerHTML = "";
    colPreparando.innerHTML = "";
    colFinalizado.innerHTML = "";

    faturamentoFinalizado = 0;
    let contadorPedidos = 0;

    snapshot.forEach((docSnap) => {
        const pedido = docSnap.data();
        const id = docSnap.id;
        
        contadorPedidos++;
        if (pedido.status === "Finalizado") {
            faturamentoFinalizado += pedido.total;
        }

        renderCard(id, pedido);
    });
    
    atualizarDashboard(contadorPedidos);
});

// 2. ESCUTAR CONSUMO DAS MESAS (Presencial)
onSnapshot(collection(db, "mesas"), (snapshot) => {
    faturamentoMesasAberto = 0;
    snapshot.forEach((docSnap) => {
        const mesa = docSnap.data();
        if (mesa.status === "ocupada") {
            faturamentoMesasAberto += (mesa.total || 0);
        }
    });
    atualizarDashboard();
});

// 3. FUNÇÃO PARA ATUALIZAR
function atualizarDashboard() {
    if (statsDiv) {
        const totalGeral = faturamentoFinalizado + faturamentoMesasAberto;
        statsDiv.innerHTML = `
            <div class="kpi-card">
                <span class="kpi-label">💰 Caixa (Finalizados)</span>
                <span class="kpi-value" style="color: #10b981;">R$ ${faturamentoFinalizado.toFixed(2).replace('.', ',')}</span>
            </div>
            <div class="kpi-card">
                <span class="kpi-label">🍽️ Consumo em Mesas</span>
                <span class="kpi-value" style="color: #f59e0b;">R$ ${faturamentoMesasAberto.toFixed(2).replace('.', ',')}</span>
            </div>
            <div class="kpi-card" style="background: linear-gradient(135deg, #1e293b 0%, #0f172a 100%); border-color: #3b82f6;">
                <span class="kpi-label" style="color: #60a5fa;">🚀 Faturamento Total</span>
                <span class="kpi-value">R$ ${totalGeral.toFixed(2).replace('.', ',')}</span>
            </div>
        `;
    }
}

// 4. PARA CRIAR O CARD DO PEDIDO
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