import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { getFirestore, collection, query, orderBy, onSnapshot, doc, updateDoc, deleteDoc } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

// ✅ NOVA CONFIGURAÇÃO DE PRODUÇÃO
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
const alertSound = document.getElementById('alert-sound');
const statsDiv = document.getElementById('stats');

// 2. ESCUTAR PEDIDOS EM TEMPO REAL
// Consulta que busca a coleção pedidos em ordem de data
const q = query(collection(db, "pedidos"), orderBy("data", "desc"));

onSnapshot(q, (snapshot) => {
    snapshot.docChanges().forEach((change) => {
        if (change.type === "added") {
            const alertSound = new Audio('https://notificationsounds.com/storage/sounds/file-sounds-1150-pristine.mp3');
            alertSound.play().catch(e => console.log("Áudio bloqueado: Interaja com a página primeiro."));
        }
    });

    colPendente.innerHTML = "";
    colPreparando.innerHTML = "";
    colFinalizado.innerHTML = "";

    let totalVendasHoje = 0;
    let contadorPedidos = 0;

    snapshot.forEach((docSnap) => {
        const pedido = docSnap.data();
        const id = docSnap.id;
        
        contadorPedidos++;
        if (pedido.status === "Finalizado") {
            totalVendasHoje += pedido.total;
        }

        renderCard(id, pedido);
    });

    if (statsDiv) {
        statsDiv.innerText = `Total de Pedidos: ${contadorPedidos} | Faturamento Finalizado: R$ ${totalVendasHoje.toFixed(2).replace('.', ',')}`;
    }
});

// 3. PARA CRIAR O CARD DO PEDIDO
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