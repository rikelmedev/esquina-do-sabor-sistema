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

let mesaAtualId = null;
let mesaAtualNumero = null;

// 1. RENDERIZAR MESAS DINAMICAMENTE
const tableSelector = document.querySelector('.table-selector');
if (tableSelector) {
    onSnapshot(collection(db, "mesas"), (snapshot) => {
        tableSelector.innerHTML = "";
        snapshot.forEach((docSnap) => {
            const mesa = docSnap.data();
            const btn = document.createElement('button');
            
            if (mesa.status === 'ocupada') {
                btn.className = 'table-btn border-red-500 text-red-500 bg-red-500/10';
            } else if (mesa.status === 'fechando') {
                btn.className = 'table-btn border-yellow-500 text-yellow-500 bg-yellow-500/10';
            } else {
                btn.className = 'table-btn border-green-500 text-green-500 bg-green-500/10';
            }
            
            btn.innerHTML = `Mesa ${mesa.numero}`;
            btn.onclick = () => abrirMesaGarcom(docSnap.id, mesa);
            tableSelector.appendChild(btn);
        });

        // Botão de adicionar mesa (A sua regra de negócio!)
        const btnNova = document.createElement('button');
        btnNova.className = 'table-btn border-dashed border-gray-500 text-gray-400';
        btnNova.innerHTML = '+ Nova Mesa';
        btnNova.onclick = adicionarNovaMesaGarcom;
        tableSelector.appendChild(btnNova);
    });
}

// 2. ABRIR MESA (Seu modal antigo, visual novo)
window.abrirMesaGarcom = (id, mesa) => {
    mesaAtualId = id;
    mesaAtualNumero = mesa.numero;
    
    document.getElementById('modal-titulo-mesa').innerText = `MESA ${mesa.numero}`;
    const itensContainer = document.getElementById('itens-consumo');
    const totalConsumo = document.getElementById('total-consumo');
    const btnOcupar = document.getElementById('btn-ocupar-mesa');
    const acoesOcupada = document.getElementById('acoes-mesa-ocupada');

    if (mesa.status === 'livre') {
        btnOcupar.style.display = 'block';
        acoesOcupada.style.display = 'none';
        itensContainer.innerHTML = `<div class="text-gray-500 text-center py-4">Mesa vazia</div>`;
        totalConsumo.innerText = `R$ 0,00`;
    } else {
        btnOcupar.style.display = 'none';
        acoesOcupada.style.display = 'block';
        
        itensContainer.innerHTML = "";
        if (mesa.itens && mesa.itens.length > 0) {
            mesa.itens.forEach((itemObj, index) => {
                const nome = typeof itemObj === 'string' ? itemObj : (itemObj.nome || itemObj.name);
                const preco = typeof itemObj === 'string' ? 0 : (itemObj.preco || itemObj.price || 0);
                
                itensContainer.innerHTML += `
                    <div class="flex justify-between items-center py-2 border-b border-gray-800">
                        <span class="text-gray-300 text-sm w-2/3 truncate">• ${nome}</span>
                        <div class="flex items-center gap-3">
                            <span class="text-[#FFC300] font-bold text-sm">R$ ${preco.toFixed(2).replace('.', ',')}</span>
                            <button onclick="removerItemGarcom(${index}, ${preco})" class="text-red-500 text-xs px-2 py-1 border border-red-500/30 rounded">Excluir</button>
                        </div>
                    </div>
                `;
            });
        } else {
            itensContainer.innerHTML = `<div class="text-gray-500 text-center py-4">Nenhum consumo</div>`;
        }
        totalConsumo.innerText = `R$ ${(mesa.total || 0).toFixed(2).replace('.', ',')}`;
    }

    document.getElementById('mesa-modal-overlay').classList.add('active');
    document.getElementById('mesa-modal').classList.add('active');
};

window.fecharModalGarcom = () => {
    document.getElementById('mesa-modal-overlay').classList.remove('active');
    document.getElementById('mesa-modal').classList.remove('active');
};

window.abrirDrawer = () => {
    document.getElementById('drawer-overlay').classList.add('active');
    document.getElementById('drawer-content').classList.add('active');
};

// 3. RESTAURANDO SUAS FUNÇÕES ORIGINAIS
window.adicionarNovaMesaGarcom = async () => {
    const numeroStr = prompt("Digite o número da nova mesa (Ex: 15):");
    if (!numeroStr) return; 
    const numeroMesa = parseInt(numeroStr);
    if (isNaN(numeroMesa) || numeroMesa <= 0) return alert("Número inválido.");
    try {
        await addDoc(collection(db, "mesas"), { numero: numeroMesa, status: "livre", total: 0, itens: [] });
    } catch (e) { console.error(e); }
};

window.ocuparMesaGarcom = async () => {
    try {
        await updateDoc(doc(db, "mesas", mesaAtualId), { status: "ocupada" });
    } catch (e) { console.error(e); }
};

window.removerItemGarcom = async (index, precoAAbater) => {
    if(!confirm("Tem certeza que deseja remover este item da conta?")) return;
    const mesaRef = doc(db, "mesas", mesaAtualId);
    try {
        const snap = await getDoc(mesaRef);
        const dados = snap.data();
        const novosItens = [...dados.itens];
        novosItens.splice(index, 1);
        const novoTotal = Math.max(0, (dados.total || 0) - precoAAbater);
        await updateDoc(mesaRef, { total: novoTotal, itens: novosItens });
        abrirMesaGarcom(mesaAtualId, { ...dados, total: novoTotal, itens: novosItens });
    } catch (e) { console.error(e); }
};

window.fecharContaGarcom = async () => {
    if (!confirm("Avisar o Caixa que esta mesa pediu a conta?")) return;
    const mesaRef = doc(db, "mesas", mesaAtualId);
    try {
        await updateDoc(mesaRef, { status: "fechando" });
        fecharModalGarcom();
        alert("Caixa avisado! Aguarde a impressão da conta.");
    } catch (e) { console.error(e); }
};

// 4. DRAWER COMO CARRINHO (Novo Enviar Pedido)
const submitOrderBtn = document.getElementById('submit-order-btn');
if (submitOrderBtn) {
    submitOrderBtn.addEventListener('click', async (e) => {
        e.preventDefault();
        if (!mesaAtualId) return alert('Abra uma mesa primeiro!');

        let itensPedido = [];
        let totalPedido = 0;
        const obs = document.getElementById('observation-input').value.trim();

        document.querySelectorAll('.product-card').forEach(card => {
            const qtyElement = card.querySelector('.quantity-display');
            if (qtyElement) {
                const qty = parseInt(qtyElement.textContent);
                if (qty > 0) {
                    const nome = card.dataset.name;
                    const preco = parseFloat(card.dataset.price);
                    for(let i=0; i<qty; i++) {
                        const nomeFinal = obs ? `${nome} (${obs})` : nome;
                        itensPedido.push({ name: nomeFinal, price: preco, nome: nomeFinal, preco: preco });
                        totalPedido += preco;
                    }
                }
            }
        });

        if (itensPedido.length === 0) return alert('Adicione pelo menos um produto na gaveta.');

        submitOrderBtn.innerHTML = "Enviando...";

        try {
            const mesaRef = doc(db, "mesas", mesaAtualId);
            const snap = await getDoc(mesaRef);
            const dados = snap.data();

            await updateDoc(mesaRef, {
                status: "ocupada",
                total: (dados.total || 0) + totalPedido,
                itens: [...(dados.itens || []), ...itensPedido.map(i => ({ nome: i.nome, preco: i.preco }))]
            });

            await addDoc(collection(db, "pedidos"), {
                cliente: `MESA ${mesaAtualNumero}`,
                status: "Preparando",
                data: serverTimestamp(),
                total: 0,
                itens: itensPedido.map(i => ({ name: i.name, price: i.price })),
                metodo: "Consumo na Mesa",
                pagamento: "Comanda Cozinha"
            });

            // Limpa Drawer
            document.querySelectorAll('.quantity-display').forEach(d => d.textContent = '0');
            document.getElementById('observation-input').value = "";
            document.getElementById('drawer-overlay').classList.remove('active');
            document.getElementById('drawer-content').classList.remove('active');
            submitOrderBtn.innerHTML = "✓ Confirmar Pedido";
            fecharModalGarcom(); 

            alert(`Pedido enviado para a Mesa ${mesaAtualNumero}`);
        } catch(erro) {
            console.error(erro);
            submitOrderBtn.innerHTML = "✓ Confirmar Pedido";
            alert("Erro ao enviar pedido");
        }
    });
}