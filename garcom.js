import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { getFirestore, collection, onSnapshot, doc, updateDoc, getDoc } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

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

const mesaGrid = document.getElementById('mesa-grid');

// 1. STATUS DAS MESAS
onSnapshot(collection(db, "mesas"), (snapshot) => {
    mesaGrid.innerHTML = "";
    snapshot.forEach((docSnap) => {
        const mesa = docSnap.data();
        renderMesa(docSnap.id, mesa);
    });
});

function renderMesa(id, mesa) {
    const div = document.createElement('div');
    div.className = `mesa-card ${mesa.status}`;
    div.innerHTML = `
        <span class="mesa-numero">${mesa.numero}</span>
        <span class="mesa-status">${mesa.status}</span>
    `;
    div.onclick = () => abrirMesa(id, mesa);
    mesaGrid.appendChild(div);
}

// Função para decidir se o número é editável
let mesaAtualId = null;


function abrirMesa(id, mesa) {
    mesaAtualId = id;
    const itensContainer = document.getElementById('itens-consumo');
    const areaProdutos = document.getElementById('area-produtos');
    const areaAcoes = document.getElementById('area-acoes');

    document.getElementById('modal-titulo-mesa').innerText = `Mesa ${mesa.numero}`;
    
    // Listar itens já consumidos
    let htmlConsumo = `<p style="color: #888;">Consumo Total: <b>R$ ${mesa.total.toFixed(2)}</b></p><ul style="font-size: 0.9rem; padding-left: 15px;">`;
    if (mesa.itens && mesa.itens.length > 0) {
        mesa.itens.forEach(item => htmlConsumo += `<li>${item}</li>`);
    } else {
        htmlConsumo += `<li>Nenhum item lançado</li>`;
    }
    htmlConsumo += "</ul>";
    itensContainer.innerHTML = htmlConsumo;

    if (mesa.status === 'ocupada') {
        areaProdutos.style.display = 'block';
        areaAcoes.innerHTML = `<button onclick="fecharContaMesa()" class="finalize-order-btn" style="background: var(--color-red-fire);">Fechar Conta e Liberar</button>`;
    } else {
        areaProdutos.style.display = 'none';
        areaAcoes.innerHTML = `<button onclick="confirmarOcuparMesa()" class="finalize-order-btn" style="background: #2ecc71;">Ocupar Mesa</button>`;
    }

    document.getElementById('mesa-modal').style.display = 'block';
}

// FUNÇÃO PARA LANÇAR ITEM
window.adicionarItemMesa = async () => {
    const select = document.getElementById('select-produto');
    const valor = parseFloat(select.value);
    const texto = select.options[select.selectedIndex].text;
    if (!valor) return;

    const mesaRef = doc(db, "mesas", mesaAtualId);
    try {
        const snap = await getDoc(mesaRef);
        const dados = snap.data();
        
        await updateDoc(mesaRef, {
            total: (dados.total || 0) + valor,
            itens: [...(dados.itens || []), texto] 
        });
        select.selectedIndex = 0;
    } catch (e) { console.error(e); }
};

// FUNÇÃO PARA FECHAR CONTA
window.fecharContaMesa = async () => {
    if (!confirm("Deseja fechar a conta e liberar a mesa?")) return;
    
    const mesaRef = doc(db, "mesas", mesaAtualId);
    try {
        await updateDoc(mesaRef, {
            status: "livre",
            total: 0,
            itens: [] // Limpa o consumo
        });
        fecharModal();
    } catch (e) { console.error(e); }
};

async function confirmarOcuparMesa() {
    const novoNumero = document.getElementById('input-numero-mesa').value;
    const mesaRef = doc(db, "mesas", mesaAtualId);

    try {
        await updateDoc(mesaRef, {
            numero: Number(novoNumero),
            status: "ocupada"
        });
        fecharModal();
    } catch (e) {
        console.error("Erro ao ocupar mesa:", e);
    }
}