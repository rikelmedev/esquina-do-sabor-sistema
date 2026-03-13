import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { getFirestore, collection, onSnapshot, doc, updateDoc } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

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

// Função para abrir o modal e decidir se o número é editável
let mesaAtualId = null;

function abrirMesa(id, mesa) {
    mesaAtualId = id;
    const inputNumero = document.getElementById('input-numero-mesa');
    const areaAcoes = document.getElementById('area-acoes');
    
    document.getElementById('modal-titulo-mesa').innerText = `Gestão: Mesa ${mesa.numero}`;
    inputNumero.value = mesa.numero;

    // Lógica de Trava: Só edita se estiver livre
    if (mesa.status === 'ocupada') {
        inputNumero.disabled = true;
        areaAcoes.innerHTML = `
            <button class="finalize-order-btn" style="background: var(--color-yellow-flame); color: #000;">+ Adicionar Pedido</button>
            <button class="finalize-order-btn" style="margin-top: 10px;">Fechar Conta</button>
        `;
    } else {
        inputNumero.disabled = false;
        areaAcoes.innerHTML = `
            <button class="finalize-order-btn" onclick="confirmarOcuparMesa()" style="background: #2ecc71; color: white;">Abrir Mesa (Ocupar)</button>
        `;
    }

    document.getElementById('mesa-modal').style.display = 'block';
}

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