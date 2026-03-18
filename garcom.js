import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { getFirestore, collection, onSnapshot, doc, updateDoc, getDoc, addDoc, serverTimestamp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

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
let mesaAtualId = null;

// ESCUTAR STATUS DAS MESAS
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
        <div class="mesa-numero">${mesa.numero}</div>
        <div class="mesa-status">${mesa.status === 'ocupada' ? 'Ocupada' : 'Livre'}</div>
        ${mesa.status === 'ocupada' ? `<div class="mesa-total">R$ ${(mesa.total || 0).toFixed(2).replace('.', ',')}</div>` : ''}
    `;
    div.onclick = () => abrirMesa(id, mesa);
    mesaGrid.appendChild(div);
}

// ABRIR GESTÃO DA MESA NO MODAL
window.abrirMesa = (id, mesa) => {
    mesaAtualId = id;
    document.getElementById('modal-titulo-mesa').innerText = `MESA ${mesa.numero}`;
    
    const areaLivre = document.getElementById('area-livre');
    const areaOcupada = document.getElementById('area-ocupada');
    const itensContainer = document.getElementById('itens-consumo');
    const totalConsumo = document.getElementById('total-consumo');

    if (mesa.status === 'livre') {
        areaLivre.style.display = 'block';
        areaOcupada.style.display = 'none';
    } else {
        areaLivre.style.display = 'none';
        areaOcupada.style.display = 'block';
        
        itensContainer.innerHTML = "";
        if (mesa.itens && mesa.itens.length > 0) {
            mesa.itens.forEach((itemObj, index) => {
                const nome = typeof itemObj === 'string' ? itemObj : itemObj.nome;
                const preco = typeof itemObj === 'string' ? 0 : (itemObj.preco || 0);
                
                itensContainer.innerHTML += `
                    <div class="item-row">
                        <span class="item-name">${nome}</span>
                        <span class="item-price">R$ ${preco.toFixed(2).replace('.', ',')}</span>
                        <button class="btn-remove-item" onclick="removerItemGarcom(${index}, ${preco})">Excluir</button>
                    </div>
                `;
            });
        } else {
            itensContainer.innerHTML = `<div style="color: #64748b; padding: 10px 0; text-align: center;">Mesa vazia</div>`;
        }
        totalConsumo.innerText = `R$ ${(mesa.total || 0).toFixed(2).replace('.', ',')}`;
    }

    document.getElementById('mesa-modal').style.display = 'flex';
};

// OCUPAR MESA
window.ocuparMesaGarcom = async () => {
    try {
        await updateDoc(doc(db, "mesas", mesaAtualId), { status: "ocupada" });
        fecharModal();
    } catch (e) { console.error(e); }
};

// LANÇAR ITEM (ATUALIZADO)
window.adicionarItemGarcom = async () => {
    const select = document.getElementById('select-produto');
    const valor = parseFloat(select.value);
    const texto = select.options[select.selectedIndex].text;
    
    if (!valor) return alert("Selecione um produto para lançar!");

    const mesaRef = doc(db, "mesas", mesaAtualId);
    try {
        const snap = await getDoc(mesaRef);
        const dados = snap.data();
        
        const novoItem = { nome: texto, preco: valor };
        
        await updateDoc(mesaRef, {
            total: (dados.total || 0) + valor,
            itens: [...(dados.itens || []), novoItem] 
        });

        // Manda o pedido para a cozinha (Preparando)
        await addDoc(collection(db, "pedidos"), {
            cliente: `MESA ${dados.numero}`, status: "Preparando", data: serverTimestamp(),
            total: 0, itens: [{ name: texto, price: 0 }], metodo: "Consumo na Mesa", pagamento: "Comanda Cozinha"
        });

        select.selectedIndex = 0;
        fecharModal();
        alert("Item enviado para a cozinha!");
    } catch (e) { console.error(e); }
};

// EXCLUIR ITEM ESPECÍFICO 
window.removerItemGarcom = async (index, precoAAbater) => {
    if(!confirm("Tem certeza que deseja remover este item da conta da mesa?")) return;
    
    const mesaRef = doc(db, "mesas", mesaAtualId);
    try {
        const snap = await getDoc(mesaRef);
        const dados = snap.data();
        
        const novosItens = [...dados.itens];
        novosItens.splice(index, 1);
        
        const novoTotal = Math.max(0, (dados.total || 0) - precoAAbater);

        await updateDoc(mesaRef, {
            total: novoTotal,
            itens: novosItens
        });
        
        fecharModal();
    } catch (e) { console.error(e); }
};

// FECHAR CONTA (Trava de Segurança: Altera para fechando)
window.fecharContaGarcom = async () => {
    if (!confirm("Avisar o Caixa que esta mesa pediu a conta?")) return;
    
    const mesaRef = doc(db, "mesas", mesaAtualId);
    try {
        await updateDoc(mesaRef, {
            status: "fechando"
        });
        fecharModal();
        alert("Caixa avisado! Aguarde a impressão da conta.");
    } catch (e) { console.error(e); }
};

// ADICIONAR NOVA MESA 
window.adicionarNovaMesaGarcom = async () => {
    const numeroStr = prompt("Digite o número da nova mesa (Ex: 15):");
    if (!numeroStr) return; 
    
    const numeroMesa = parseInt(numeroStr);
    if (isNaN(numeroMesa) || numeroMesa <= 0) return alert("Número inválido.");
    
    try {
        await addDoc(collection(db, "mesas"), { numero: numeroMesa, status: "livre", total: 0, itens: [] });
    } catch (e) { console.error(e); }
};

// AUXILIARES
window.fecharModal = () => {
    document.getElementById('mesa-modal').style.display = 'none';
};