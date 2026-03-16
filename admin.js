import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { getFirestore, collection, query, orderBy, onSnapshot, doc, updateDoc, deleteDoc, addDoc, serverTimestamp, getDoc} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

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
    document.querySelectorAll('.view-section').forEach(s => s.classList.remove('active'));
    document.querySelectorAll('.nav-link').forEach(l => l.classList.remove('active'));
    
    document.getElementById(viewId).classList.add('active');
    
    if (el) el.classList.add('active');
};

// Configura a URL para os garçons conectarem
const configUrl = document.getElementById('url-garcom');
if (configUrl) {
    configUrl.innerText = window.location.origin + "/garcom.html";
}

// GESTÃO FINANCEIRA E REAL-TIME ---
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

document.getElementById('data-hoje').innerText = new Date().toLocaleDateString('pt-BR', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });

let chartLinhaInstance = null;
let chartRoscaInstance = null;

window.atualizarDashboard = (totalDePedidos = 0) => {
    if (!statsDiv) return;

    const totalGeral = faturamentoFinalizado + faturamentoMesasAberto;
    
    statsDiv.innerHTML = `
        <div class="kpi-card" style="padding: 20px; border-top: 3px solid #3b82f6;">
            <span class="kpi-label">Faturamento Geral</span>
            <span class="kpi-value" style="color: #f8fafc; font-size: 1.6rem;">R$ ${totalGeral.toFixed(2).replace('.', ',')}</span>
        </div>
        <div class="kpi-card" style="padding: 20px; border-top: 3px solid #8b5cf6;">
            <span class="kpi-label">Pedidos Hoje</span>
            <span class="kpi-value" style="color: #f8fafc; font-size: 1.6rem;">${totalDePedidos}</span>
        </div>
        <div class="kpi-card" style="padding: 20px; border-top: 3px solid #f59e0b;">
            <span class="kpi-label">Em Mesa</span>
            <span class="kpi-value" style="color: #f59e0b; font-size: 1.6rem;">R$ ${faturamentoMesasAberto.toFixed(2).replace('.', ',')}</span>
        </div>
        <div class="kpi-card" style="padding: 20px; border-top: 3px solid #10b981;">
            <span class="kpi-label">Delivery / Caixa</span>
            <span class="kpi-value" style="color: #10b981; font-size: 1.6rem;">R$ ${faturamentoFinalizado.toFixed(2).replace('.', ',')}</span>
        </div>
    `;

    const ctxRosca = document.getElementById('chartRosca');
    if (ctxRosca) {
        if (chartRoscaInstance) chartRoscaInstance.destroy();

        const totalVendas = faturamentoMesasAberto + faturamentoFinalizado;
        const temVenda = totalVendas > 0;

        chartRoscaInstance = new Chart(ctxRosca, {
            type: 'doughnut',
            data: {
                labels: temVenda ? ['Mesa', 'Delivery/Caixa'] : ['Aguardando Vendas'],
                datasets: [{
                    data: temVenda ? [faturamentoMesasAberto, faturamentoFinalizado] : [1],
                    backgroundColor: temVenda ? ['#f59e0b', '#10b981'] : ['#334155'],
                    borderWidth: 0,
                    hoverOffset: 4
                }]
            },
            options: { 
                cutout: '75%', 
                maintainAspectRatio: false,
                plugins: { 
                    legend: { position: 'bottom', labels: { color: '#94a3b8' } },
                    tooltip: { enabled: temVenda } 
                } 
            }
        });
        
        ctxRosca.style.height = '180px';
    }

    // Inicializar Gráfico de Linha
    const ctxLinha = document.getElementById('chartLinha');
    if (ctxLinha && !chartLinhaInstance) {
        chartLinhaInstance = new Chart(ctxLinha, {
            type: 'line',
            data: {
                labels: ['18:00', '19:00', '20:00', '21:00', '22:00', '23:00'],
                datasets: [{
                    label: 'Vendas',
                    data: [120, 350, 480, 200, 150, 90], 
                    borderColor: '#3b82f6',
                    backgroundColor: 'rgba(59, 130, 246, 0.2)',
                    fill: true,
                    tension: 0.4
                }]
            },
            options: { responsive: true, maintainAspectRatio: false, scales: { y: { display: false }, x: { grid: { display: false }, ticks: { color: '#64748b' } } }, plugins: { legend: { display: false } } }
        });
    }
};

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
    select.selectedIndex = 0; 
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
    const pagamento = document.getElementById('pagamento-balcao').value;
    
    
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
            pagamento: pagamento
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

// GESTÃO DE MESAS (SUPER ADMIN) ---

window.renderMesaAdmin = (id, mesa) => {
    const div = document.createElement('div');
    const corBorda = mesa.status === 'ocupada' ? '#ef4444' : '#10b981';
    const corFundo = mesa.status === 'ocupada' ? 'rgba(239, 68, 68, 0.1)' : 'rgba(16, 185, 129, 0.1)';
    
    div.style.cssText = `
        background: ${corFundo}; border: 2px solid ${corBorda}; border-radius: 12px; 
        height: 120px; display: flex; flex-direction: column; align-items: center; 
        justify-content: center; color: #f8fafc; cursor: pointer; transition: transform 0.2s;
    `;
    div.innerHTML = `
        <span style="font-size: 1.5rem; font-weight: bold;">MESA ${mesa.numero}</span>
        <span style="font-size: 0.8rem; text-transform: uppercase; color: ${corBorda};">${mesa.status}</span>
        ${mesa.status === 'ocupada' ? `<span style="color: #f59e0b; margin-top: 5px; font-weight: bold;">R$ ${(mesa.total || 0).toFixed(2).replace('.', ',')}</span>` : ''}
    `;
    
    div.onmouseover = () => div.style.transform = 'scale(1.05)';
    div.onmouseout = () => div.style.transform = 'scale(1)';
    div.onclick = () => abrirMesaAdmin(id, mesa);
    
    const grid = document.getElementById('mesa-grid-admin');
    if (grid) grid.appendChild(div);
};

let mesaAdminAtualId = null;

window.abrirMesaAdmin = (id, mesa) => {
    mesaAdminAtualId = id;
    document.getElementById('modal-mesa-admin').style.display = 'block';
    
    // botões de Editar e Excluir Mesa
    document.getElementById('titulo-mesa-admin').innerHTML = `
        <div style="display: flex; justify-content: space-between; align-items: center; width: 100%;">
            <span>MESA ${mesa.numero}</span>
            <div style="display: flex; gap: 8px;">
                <button onclick="editarMesaAdmin()" style="background: #f59e0b; border: none; padding: 6px 12px; border-radius: 6px; color: white; cursor: pointer; font-size: 0.8rem; font-weight: bold;">✏️ Editar</button>
                <button onclick="excluirMesaAdmin()" style="background: #ef4444; border: none; padding: 6px 12px; border-radius: 6px; color: white; cursor: pointer; font-size: 0.8rem; font-weight: bold;">🗑️ Excluir</button>
            </div>
        </div>
    `;

    const consumoContainer = document.getElementById('consumo-mesa-admin');
    const areaProdutos = document.getElementById('area-produtos-mesa-admin');
    const areaAcoes = document.getElementById('area-acoes-mesa-admin');

    let htmlConsumo = `<p style="color: #94a3b8; font-size: 0.85rem; margin-bottom: 10px;">ITENS NA MESA:</p><div style="font-size: 0.95rem; margin-bottom: 15px;">`;
    if (mesa.itens && mesa.itens.length > 0) {
        mesa.itens.forEach(item => htmlConsumo += `<div style="margin-bottom: 5px; color: #f8fafc;">• ${item}</div>`);
    } else {
        htmlConsumo += `<div style="color: #64748b;">Nenhum item lançado</div>`;
    }
    htmlConsumo += `</div><div style="border-top: 1px solid #334155; padding-top: 10px; text-align: right; font-size: 1.2rem;">Total: <b style="color: #f59e0b;">R$ ${(mesa.total || 0).toFixed(2).replace('.', ',')}</b></div>`;
    consumoContainer.innerHTML = htmlConsumo;

    if (mesa.status === 'ocupada') {
        areaProdutos.style.display = 'block';
        areaAcoes.innerHTML = `
            <select id="pagamento-mesa-admin" style="width: 100%; padding: 12px; background: #0f172a; color: white; border: 1px solid #334155; border-radius: 8px; margin-bottom: 10px;">
                <option value="Dinheiro">💵 Dinheiro</option>
                <option value="Pix">💠 Pix</option>
                <option value="Cartão de Crédito">💳 Cartão de Crédito</option>
                <option value="Cartão de Débito">💳 Cartão de Débito</option>
            </select>
            <button onclick="fecharContaMesaAdmin()" class="finalize-order-btn" style="background: #ef4444; width: 100%; padding: 15px; border-radius: 8px; border: none; color: white; font-weight: bold; cursor: pointer;">Encerrar Mesa e Liberar</button>
        `;
    } else {
        areaProdutos.style.display = 'none';
        areaAcoes.innerHTML = `<button onclick="ocuparMesaAdmin()" class="finalize-order-btn" style="background: #10b981; width: 100%; padding: 15px; border-radius: 8px; border: none; color: white; font-weight: bold; cursor: pointer;">Ocupar Mesa Agora</button>`;
    }
};

window.fecharModalMesaAdmin = () => document.getElementById('modal-mesa-admin').style.display = 'none';

window.ocuparMesaAdmin = async () => {
    try { await updateDoc(doc(db, "mesas", mesaAdminAtualId), { status: "ocupada" }); fecharModalMesaAdmin(); } 
    catch (e) { console.error(e); }
};

window.fecharContaMesaAdmin = async () => {
    if (!confirm("Tem certeza que deseja fechar a conta e liberar a mesa? (O valor irá para o caixa)")) return;
    const mesaRef = doc(db, "mesas", mesaAdminAtualId);
    const pagamento = document.getElementById('pagamento-mesa-admin').value; 
    try {
        const snap = await getDoc(mesaRef);
        const dadosMesa = snap.data();
        if (dadosMesa.total > 0) {
            await addDoc(collection(db, "pedidos"), {
                cliente: `Fechamento: Mesa ${dadosMesa.numero}`,
                status: "Finalizado",
                data: serverTimestamp(),
                total: dadosMesa.total,
                itens: dadosMesa.itens ? dadosMesa.itens.map(nome => ({ name: nome, price: 0 })) : [],
                metodo: "Salão (Mesa)",
                pagamento: pagamento 
            });
        }
        await updateDoc(mesaRef, { status: "livre", total: 0, itens: [] });
        fecharModalMesaAdmin();
        alert("Conta fechada! O valor foi adicionado ao seu Caixa.");
    } catch (e) { console.error("Erro ao fechar mesa:", e); }
};

window.adicionarItemMesaAdmin = async () => {
    const select = document.getElementById('select-produto-mesa-admin');
    const valor = parseFloat(select.value);
    const texto = select.options[select.selectedIndex].text;
    if (!valor) return alert("Selecione um produto!");

    const mesaRef = doc(db, "mesas", mesaAdminAtualId);
    try {
        const snap = await getDoc(mesaRef);
        const dados = snap.data();
        
        //Atualiza a mesa financeira
        await updateDoc(mesaRef, {
            total: (dados.total || 0) + valor,
            itens: [...(dados.itens || []), texto]
        });

        // Envia a Comanda para a Cozinha 
        await addDoc(collection(db, "pedidos"), {
            cliente: `MESA ${dados.numero}`,
            status: "Pendente",
            data: serverTimestamp(),
            total: 0, 
            itens: [{ name: texto, price: 0 }],
            metodo: "Consumo na Mesa",
            pagamento: "Comanda Cozinha"
        });

        select.selectedIndex = 0;
        alert("Item adicionado e enviado para a cozinha!");
        fecharModalMesaAdmin();
    } catch (e) { console.error(e); }
};

// --- FUNÇÕES DE AUTONOMIA DA MESA ---
window.adicionarNovaMesa = async () => {
    const numeroStr = prompt("Qual é o número da nova mesa que deseja adicionar?");
    if (!numeroStr) return; 
    const numeroMesa = parseInt(numeroStr);
    if (isNaN(numeroMesa) || numeroMesa <= 0) return alert("Por favor, digite um número válido.");
    try {
        await addDoc(collection(db, "mesas"), { numero: numeroMesa, status: "livre", total: 0, itens: [] });
    } catch (e) { console.error("Erro ao adicionar mesa:", e); }
};

window.editarMesaAdmin = async () => {
    const novoNumero = prompt("Digite o novo número para esta mesa:");
    if (!novoNumero) return;
    try {
        await updateDoc(doc(db, "mesas", mesaAdminAtualId), { numero: parseInt(novoNumero) });
        fecharModalMesaAdmin();
    } catch (e) { console.error(e); }
};

window.excluirMesaAdmin = async () => {
    if (!confirm("⚠️ ATENÇÃO: Tem a certeza que deseja excluir esta mesa do sistema? Esta ação não pode ser desfeita.")) return;
    try {
        await deleteDoc(doc(db, "mesas", mesaAdminAtualId));
        fecharModalMesaAdmin();
    } catch (e) { console.error(e); }
};