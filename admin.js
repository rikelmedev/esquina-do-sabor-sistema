import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { getFirestore, collection, query, orderBy, onSnapshot, doc, updateDoc, deleteDoc, addDoc, serverTimestamp, getDoc } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

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

window.switchView = (viewId, el) => {
    document.querySelectorAll('.view-section').forEach(s => s.classList.remove('active'));
    document.querySelectorAll('.nav-link').forEach(l => l.classList.remove('active'));
    document.getElementById(viewId).classList.add('active');
    if (el) el.classList.add('active');
};

const configUrl = document.getElementById('url-garcom');
if (configUrl) configUrl.innerText = window.location.origin + "/garcom.html";

// --- GESTÃO FINANCEIRA E DASHBOARD ---
let faturamentoFinalizado = 0;
let faturamentoMesasAberto = 0;
let totalDinheiro = 0, totalPix = 0, totalCredito = 0, totalDebito = 0, totalPedidosDia = 0;

onSnapshot(query(collection(db, "pedidos"), orderBy("data", "desc")), (snapshot) => {
    if(colPendente) colPendente.innerHTML = "";
    if(colPreparando) colPreparando.innerHTML = "";
    if(colFinalizado) colFinalizado.innerHTML = "";
    
    faturamentoFinalizado = totalDinheiro = totalPix = totalCredito = totalDebito = totalPedidosDia = 0;

    snapshot.forEach((docSnap) => {
        const pedido = docSnap.data();
        if (pedido.status === "Finalizado") {
            faturamentoFinalizado += (pedido.total || 0);
            totalPedidosDia++;
            
            if (pedido.pagamento === "Misto" && pedido.split) {
                totalDinheiro += (pedido.split.dinheiro || 0);
                totalPix += (pedido.split.pix || 0);
                totalCredito += (pedido.split.credito || 0);
                totalDebito += (pedido.split.debito || 0);
            } else {
                const pag = pedido.pagamento ? pedido.pagamento.toLowerCase() : "";
                if (pag.includes("dinheiro")) totalDinheiro += pedido.total;
                else if (pag.includes("pix")) totalPix += pedido.total;
                else if (pag.includes("crédito") || pag.includes("credito")) totalCredito += pedido.total;
                else if (pag.includes("débito") || pag.includes("debito")) totalDebito += pedido.total;
            }
        }
        renderCard(docSnap.id, pedido);
    });
    atualizarDashboard();
});

onSnapshot(collection(db, "mesas"), (snapshot) => {
    faturamentoMesasAberto = 0;
    const mesaGridAdmin = document.getElementById('mesa-grid-admin');
    if (mesaGridAdmin) mesaGridAdmin.innerHTML = "";

    snapshot.forEach((docSnap) => {
        const mesa = docSnap.data();
        if (mesa.status === "ocupada") faturamentoMesasAberto += (mesa.total || 0);
        if (mesaGridAdmin) renderMesaAdmin(docSnap.id, mesa);
    });
    atualizarDashboard();
});

const elData = document.getElementById('data-hoje');
if(elData) elData.innerText = new Date().toLocaleDateString('pt-BR', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });

let chartLinhaInstance = null, chartRoscaInstance = null;

window.atualizarDashboard = () => {
    const statsDiv = document.getElementById('stats');
    if (!statsDiv) return;

    const totalGeral = faturamentoFinalizado + faturamentoMesasAberto;
    const ticketMedio = totalPedidosDia > 0 ? (faturamentoFinalizado / totalPedidosDia) : 0;

    statsDiv.innerHTML = `
        <div class="kpi-card" style="padding: 20px; border-top: 3px solid #3b82f6;">
            <span class="kpi-label">Faturamento Geral</span><span class="kpi-value" style="color: #f8fafc; font-size: 1.6rem;">R$ ${totalGeral.toFixed(2).replace('.', ',')}</span>
        </div>
        <div class="kpi-card" style="padding: 20px; border-top: 3px solid #8b5cf6;">
            <span class="kpi-label">Pedidos Hoje</span><span class="kpi-value" style="color: #f8fafc; font-size: 1.6rem;">${totalPedidosDia}</span>
        </div>
        <div class="kpi-card" style="padding: 20px; border-top: 3px solid #f59e0b;">
            <span class="kpi-label">Ticket Médio</span><span class="kpi-value" style="color: #f59e0b; font-size: 1.6rem;">R$ ${ticketMedio.toFixed(2).replace('.', ',')}</span>
        </div>
        <div class="kpi-card" style="padding: 20px; border-top: 3px solid #10b981;">
            <span class="kpi-label">Caixa (Finalizados)</span><span class="kpi-value" style="color: #10b981; font-size: 1.6rem;">R$ ${faturamentoFinalizado.toFixed(2).replace('.', ',')}</span>
        </div>
    `;

    const ctxRosca = document.getElementById('chartRosca');
    if (ctxRosca) {
        if (chartRoscaInstance) chartRoscaInstance.destroy();
        const totalVendas = totalDinheiro + totalPix + totalCredito + totalDebito;
        const temVenda = totalVendas > 0;
        chartRoscaInstance = new Chart(ctxRosca, {
            type: 'doughnut',
            data: { labels: temVenda ? ['Pix', 'Dinheiro', 'Crédito', 'Débito'] : ['Aguardando'], datasets: [{ data: temVenda ? [totalPix, totalDinheiro, totalCredito, totalDebito] : [1], backgroundColor: temVenda ? ['#8b5cf6', '#10b981', '#3b82f6', '#f59e0b'] : ['#334155'], borderWidth: 0 }] },
            options: { cutout: '75%', maintainAspectRatio: false, plugins: { legend: { position: 'bottom', labels: { color: '#94a3b8' } } } }
        });
    }
    if(typeof atualizarBotoesCaixa === "function") atualizarBotoesCaixa(); // Garante atualização real-time da aba Caixa
};

// --- GESTÃO DE ESTOQUE COMPLETA ---
onSnapshot(collection(db, "estoque"), (snapshot) => {
    const listaEstoque = document.getElementById('lista-estoque');
    const elValorTotal = document.getElementById('valor-total-estoque');
    if (!listaEstoque) return;

    listaEstoque.innerHTML = "";
    let patrimonyValue = 0;

    snapshot.forEach(docSnap => {
        const item = docSnap.data();
        const corStatus = item.quantidade < 10 ? '#ef4444' : '#10b981'; 
        const custo = item.custo || 0;
        const subtotal = item.quantidade * custo;
        patrimonyValue += subtotal;
        
        listaEstoque.innerHTML += `
            <div class="kpi-card" style="position: relative;">
                <button onclick="excluirInsumo('${docSnap.id}')" style="position: absolute; top: 15px; right: 15px; background: transparent; border: none; color: #ef4444; cursor: pointer; font-size: 1.2rem;">🗑️</button>
                <button onclick="editarInsumo('${docSnap.id}', '${item.nome}', ${item.quantidade}, ${custo}, '${item.unidade || 'un'}')" style="position: absolute; top: 15px; right: 45px; background: transparent; border: none; color: #f59e0b; cursor: pointer; font-size: 1.2rem;">✏️</button>

                <span class="kpi-label">${item.nome}</span>
                <span class="kpi-value" style="color: ${corStatus}; font-size: 1.8rem;">${item.quantidade} ${item.unidade || 'un'}</span>
                
                <div style="font-size: 0.85rem; color: #94a3b8; margin-top: 10px;">Custo Un: R$ ${custo.toFixed(2).replace('.', ',')}</div>
                <div style="font-size: 0.95rem; color: #3b82f6; font-weight: bold; margin-bottom: 10px;">Total: R$ ${subtotal.toFixed(2).replace('.', ',')}</div>

                <div style="margin-top: 15px; display: flex; gap: 5px;">
                    <button onclick="ajustarEstoque('${docSnap.id}', 1)" style="flex: 1; background: #334155; border: none; color: white; padding: 10px; border-radius: 5px; cursor: pointer; font-weight: bold;">+1</button>
                    <button onclick="ajustarEstoque('${docSnap.id}', -1)" style="flex: 1; background: #334155; border: none; color: white; padding: 10px; border-radius: 5px; cursor: pointer; font-weight: bold;">-1</button>
                </div>
            </div>
        `;
    });
    if(elValorTotal) elValorTotal.innerText = `R$ ${patrimonyValue.toFixed(2).replace('.', ',')}`;
});

window.ajustarEstoque = async (id, mudanca) => {
    const ref = doc(db, "estoque", id);
    const snap = await getDoc(ref);
    await updateDoc(ref, { quantidade: snap.data().quantidade + mudanca });
};

window.adicionarInsumo = async () => {
    const nome = prompt("Nome do Insumo (ex: Pão de Hambúrguer):");
    if (!nome) return;
    const qtd = Number(prompt("Quantidade inicial:"));
    if (isNaN(qtd)) return alert("Quantidade inválida.");
    const unidade = prompt("Unidade de medida (ex: un, kg, L):") || "un";
    const custoStr = prompt("Custo unitário em R$ (ex: 1.50):");
    const custo = parseFloat(custoStr?.replace(',', '.') || 0);

    await addDoc(collection(db, "estoque"), { nome, quantidade: qtd, unidade, custo });
};

window.editarInsumo = async (id, nomeAtual, qtdAtual, custoAtual, uniAtual) => {
    const nome = prompt("Nome do Insumo:", nomeAtual) || nomeAtual;
    const qtdStr = prompt("Quantidade:", qtdAtual);
    const qtd = qtdStr !== null ? Number(qtdStr) : qtdAtual;
    const unidade = prompt("Unidade de medida:", uniAtual) || uniAtual;
    const custoStr = prompt("Custo unitário em R$:", custoAtual);
    const custo = custoStr !== null ? parseFloat(custoStr.replace(',', '.')) : custoAtual;

    await updateDoc(doc(db, "estoque", id), { nome, quantidade: qtd, unidade, custo });
};

window.excluirInsumo = async (id) => {
    if(!confirm("Tem certeza que deseja excluir este insumo do estoque?")) return;
    await deleteDoc(doc(db, "estoque", id));
};

// --- PAGAMENTO MISTO (FUNÇÕES AUXILIARES) ---
window.toggleMisto = (tipo) => {
    const select = document.getElementById(`pagamento-${tipo}`);
    const divMisto = document.getElementById(`misto-${tipo}`);
    if(select && divMisto) divMisto.style.display = select.value === 'Misto' ? 'block' : 'none';
};

window.obterDadosPagamento = (tipo, totalEsperado) => {
    const pagamento = document.getElementById(`pagamento-${tipo}`).value;
    let split = null;
    if (pagamento === 'Misto') {
        const din = parseFloat(document.getElementById(`misto-dinheiro-${tipo}`).value) || 0;
        const pix = parseFloat(document.getElementById(`misto-pix-${tipo}`).value) || 0;
        const cred = parseFloat(document.getElementById(`misto-credito-${tipo}`).value) || 0;
        const deb = parseFloat(document.getElementById(`misto-debito-${tipo}`).value) || 0;
        const soma = din + pix + cred + deb;

        if (Math.abs(soma - totalEsperado) > 0.05) {
            alert(`ERRO: A soma do pagamento (R$ ${soma.toFixed(2)}) não bate com o Total (R$ ${totalEsperado.toFixed(2)}).`);
            return { erro: true };
        }
        split = { dinheiro: din, pix: pix, credito: cred, debito: deb };
    }
    return { pagamento, split, erro: false };
};

// --- PDV BALCÃO ---
let carrinhoBalcao = [];
let totalBalcao = 0;

window.lancarPedidoManual = () => { document.getElementById('modal-balcao').style.display = 'block'; carrinhoBalcao = []; totalBalcao = 0; atualizarCarrinhoBalcao(); };
window.fecharModalBalcao = () => document.getElementById('modal-balcao').style.display = 'none';

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
        lista.innerHTML += `<div style="display: flex; justify-content: space-between; margin-bottom: 5px;"><span>• ${item.name}</span><button onclick="removerItemBalcao(${index})" style="background: transparent; color: #ef4444; border: none; cursor: pointer;">❌</button></div>`;
    });
    document.getElementById('total-balcao').innerText = totalBalcao.toFixed(2).replace('.', ',');
}

window.removerItemBalcao = (index) => { totalBalcao -= carrinhoBalcao[index].price; carrinhoBalcao.splice(index, 1); atualizarCarrinhoBalcao(); };

window.finalizarPedidoBalcao = async () => {
    const cliente = document.getElementById('input-cliente-balcao').value;
    if (!cliente) return alert("Preencha o nome do cliente!");
    if (carrinhoBalcao.length === 0) return alert("A comanda está vazia!");

    const dadosPagamento = obterDadosPagamento('balcao', totalBalcao);
    if (dadosPagamento.erro) return;

    try {
        await addDoc(collection(db, "pedidos"), {
            cliente: cliente, status: "Preparando", data: serverTimestamp(),
            total: totalBalcao, itens: carrinhoBalcao, metodo: "Balcão", 
            pagamento: dadosPagamento.pagamento, split: dadosPagamento.split
        });
        imprimirContaCliente(cliente, carrinhoBalcao, totalBalcao, dadosPagamento.pagamento);
        setTimeout(() => imprimirComandaCozinha(cliente, carrinhoBalcao), 1500);

        fecharModalBalcao();
        document.getElementById('input-cliente-balcao').value = "";
        toggleMisto('balcao');
    } catch (e) { console.error(e); }
};

// --- GESTÃO DE MESAS (SUPER ADMIN) ---
let mesaAdminAtualId = null;
let mesaSubtotalAtual = 0;
let mesaTotalFinalAtual = 0;

window.calcularTotaisMesa = () => {
    const subtotal = mesaSubtotalAtual || 0;
    const desconto = parseFloat(document.getElementById('mesa-input-desconto').value) || 0;
    const pessoas = parseInt(document.getElementById('mesa-input-pessoas').value) || 1;

    mesaTotalFinalAtual = Math.max(0, subtotal - desconto); 
    const valorPorPessoa = mesaTotalFinalAtual / pessoas;

    document.getElementById('mesa-subtotal').innerText = `R$ ${subtotal.toFixed(2).replace('.', ',')}`;
    document.getElementById('mesa-total-final').innerText = `R$ ${mesaTotalFinalAtual.toFixed(2).replace('.', ',')}`;
    document.getElementById('mesa-valor-pessoa').innerText = `R$ ${valorPorPessoa.toFixed(2).replace('.', ',')}`;
};

window.renderMesaAdmin = (id, mesa) => {
    const div = document.createElement('div');
    
    // LÓGICA DE CORES (Verde=Livre, Vermelho=Ocupada, Amarelo=Fechando)
    let corBorda = '#10b981'; 
    let corFundo = 'rgba(16, 185, 129, 0.1)';
    let textoStatus = mesa.status;

    if (mesa.status === 'ocupada') {
        corBorda = '#ef4444';
        corFundo = 'rgba(239, 68, 68, 0.1)';
    } else if (mesa.status === 'fechando') {
        corBorda = '#f59e0b'; // Amarelo
        corFundo = 'rgba(245, 158, 11, 0.2)';
        textoStatus = 'AGUARDANDO PAGTO'; 
    }
    
    div.style.cssText = `background: ${corFundo}; border: 2px solid ${corBorda}; border-radius: 12px; height: 120px; display: flex; flex-direction: column; align-items: center; justify-content: center; color: #f8fafc; cursor: pointer; transition: transform 0.2s;`;
    
    div.innerHTML = `<span style="font-size: 1.5rem; font-weight: bold;">MESA ${mesa.numero}</span><span style="font-size: 0.8rem; text-transform: uppercase; color: ${corBorda}; font-weight: bold; text-align: center;">${textoStatus}</span>${(mesa.status === 'ocupada' || mesa.status === 'fechando') ? `<span style="color: #f59e0b; margin-top: 5px; font-weight: bold;">R$ ${(mesa.total || 0).toFixed(2).replace('.', ',')}</span>` : ''}`;
    
    div.onclick = () => abrirMesaAdmin(id, mesa);
    const grid = document.getElementById('mesa-grid-admin');
    if (grid) grid.appendChild(div);
};

window.abrirMesaAdmin = (id, mesa) => {
    mesaAdminAtualId = id;
    mesaSubtotalAtual = mesa.total || 0; 
    document.getElementById('modal-mesa-admin').style.display = 'block';
    
    document.getElementById('titulo-mesa-admin').innerHTML = `<div style="display: flex; justify-content: space-between; align-items: center; width: 100%;"><span>MESA ${mesa.numero}</span><div style="display: flex; gap: 8px;"><button onclick="editarMesaAdmin()" style="background: #f59e0b; border: none; padding: 6px 12px; border-radius: 6px; color: white; cursor: pointer; font-size: 0.8rem;">✏️ Editar</button><button onclick="excluirMesaAdmin()" style="background: #ef4444; border: none; padding: 6px 12px; border-radius: 6px; color: white; cursor: pointer; font-size: 0.8rem;">🗑️ Excluir</button></div></div>`;

    const consumoContainer = document.getElementById('consumo-mesa-admin');
    const calculoFinanceiro = document.getElementById('calculo-financeiro-mesa');
    const areaProdutos = document.getElementById('area-produtos-mesa-admin');
    const areaAcoes = document.getElementById('area-acoes-mesa-admin');

    document.getElementById('mesa-input-desconto').value = "0";
    document.getElementById('mesa-input-pessoas').value = "1";

    let htmlConsumo = `<p style="color: #94a3b8; font-size: 0.85rem; margin-bottom: 10px;">ITENS NA MESA:</p><div style="font-size: 0.95rem;">`;
    
    if (mesa.itens && mesa.itens.length > 0) {
        mesa.itens.forEach(item => {
            const nomeExibicao = typeof item === 'object' ? (item.nome || item.name) : item;
            htmlConsumo += `<div style="margin-bottom: 5px; color: #f8fafc;">• ${nomeExibicao}</div>`;
        });
    } else {
        htmlConsumo += `<div style="color: #64748b;">Nenhum item lançado</div>`;
    }
    consumoContainer.innerHTML = htmlConsumo + `</div>`;

    if (mesa.status === 'ocupada') {
        calculoFinanceiro.style.display = 'block';
        areaProdutos.style.display = 'block';
        calcularTotaisMesa(); 
        areaAcoes.innerHTML = `
            <select id="pagamento-mesa-admin" onchange="toggleMisto('mesa-admin')" style="width: 100%; padding: 12px; background: #0f172a; color: white; border: 1px solid #334155; border-radius: 8px; margin-bottom: 10px;">
                <option value="Dinheiro">💵 Dinheiro</option><option value="Pix">💠 Pix</option><option value="Cartão de Crédito">💳 Cartão de Crédito</option><option value="Cartão de Débito">💳 Cartão de Débito</option><option value="Misto">🔀 Pagamento Misto</option>
            </select>
            <div id="misto-mesa-admin" style="display: none; background: #0f172a; padding: 10px; border-radius: 8px; margin-bottom: 15px; border: 1px solid #334155;">
                <div style="display: flex; gap: 5px; margin-bottom: 5px;"><input type="number" id="misto-dinheiro-mesa-admin" placeholder="Dinheiro" style="flex: 1; padding: 8px; background: #1e293b; color: white; border: 1px solid #334155; border-radius: 4px;"><input type="number" id="misto-pix-mesa-admin" placeholder="Pix" style="flex: 1; padding: 8px; background: #1e293b; color: white; border: 1px solid #334155; border-radius: 4px;"></div>
                <div style="display: flex; gap: 5px;"><input type="number" id="misto-credito-mesa-admin" placeholder="Crédito" style="flex: 1; padding: 8px; background: #1e293b; color: white; border: 1px solid #334155; border-radius: 4px;"><input type="number" id="misto-debito-mesa-admin" placeholder="Débito" style="flex: 1; padding: 8px; background: #1e293b; color: white; border: 1px solid #334155; border-radius: 4px;"></div>
            </div>
            <button onclick="fecharContaMesaAdmin()" class="finalize-order-btn" style="background: #ef4444; width: 100%; padding: 15px; border-radius: 8px; border: none; color: white; font-weight: bold; cursor: pointer;">Encerrar Mesa e Imprimir Conta</button>
        `;
    } else {
        calculoFinanceiro.style.display = 'none'; areaProdutos.style.display = 'none';
        areaAcoes.innerHTML = `<button onclick="ocuparMesaAdmin()" class="finalize-order-btn" style="background: #10b981; width: 100%; padding: 15px; border-radius: 8px; border: none; color: white; font-weight: bold; cursor: pointer;">Ocupar Mesa Agora</button>`;
    }
};

window.fecharModalMesaAdmin = () => document.getElementById('modal-mesa-admin').style.display = 'none';
window.ocuparMesaAdmin = async () => { try { await updateDoc(doc(db, "mesas", mesaAdminAtualId), { status: "ocupada" }); fecharModalMesaAdmin(); } catch (e) { console.error(e); } };

window.fecharContaMesaAdmin = async () => {
    if (!confirm("Tem certeza que deseja fechar a conta e liberar a mesa?")) return;
    const dadosPagamento = obterDadosPagamento('mesa-admin', mesaTotalFinalAtual);
    if (dadosPagamento.erro) return;

    const mesaRef = doc(db, "mesas", mesaAdminAtualId);
    try {
        const snap = await getDoc(mesaRef);
        const dadosMesa = snap.data();
        if (mesaTotalFinalAtual > 0) {
           await addDoc(collection(db, "pedidos"), {
        cliente: `Fechamento: Mesa ${dadosMesa.numero}`, 
        status: "Finalizado", 
        data: serverTimestamp(),
        total: mesaTotalFinalAtual, 
        itens: dadosMesa.itens ? dadosMesa.itens.map(item => ({ 
            name: typeof item === 'object' ? (item.nome || item.name) : item, 
            price: typeof item === 'object' ? (item.preco || item.price || 0) : 0 
        })) : [],
        metodo: "Salão (Mesa)", 
        pagamento: dadosPagamento.pagamento, 
        split: dadosPagamento.split 
    });

            imprimirContaCliente(`Mesa ${dadosMesa.numero}`, dadosMesa.itens ? dadosMesa.itens.map(nome => ({ name: nome })) : [], mesaTotalFinalAtual, dadosPagamento.pagamento);
        }
        await updateDoc(mesaRef, { status: "livre", total: 0, itens: [] });
        fecharModalMesaAdmin();
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
        await updateDoc(mesaRef, { total: (dados.total || 0) + valor, itens: [...(dados.itens || []), texto] });
        await addDoc(collection(db, "pedidos"), {
            cliente: `MESA ${dados.numero}`, status: "Preparando", data: serverTimestamp(),
            total: 0, itens: [{ name: texto, price: 0 }], metodo: "Consumo na Mesa", pagamento: "Comanda Cozinha"
        });
        imprimirComandaCozinha(`MESA ${dados.numero}`, [{ name: texto }]);
        select.selectedIndex = 0; fecharModalMesaAdmin();
    } catch (e) { console.error(e); }
};

window.adicionarNovaMesa = async () => {
    const numeroStr = prompt("Qual é o número da nova mesa que deseja adicionar?");
    if (!numeroStr) return; 
    const numeroMesa = parseInt(numeroStr);
    if (isNaN(numeroMesa) || numeroMesa <= 0) return alert("Por favor, digite um número válido.");
    await addDoc(collection(db, "mesas"), { numero: numeroMesa, status: "livre", total: 0, itens: [] });
};
window.editarMesaAdmin = async () => {
    const novoNumero = prompt("Digite o novo número para esta mesa:");
    if (!novoNumero) return;
    await updateDoc(doc(db, "mesas", mesaAdminAtualId), { numero: parseInt(novoNumero) }); fecharModalMesaAdmin();
};
window.excluirMesaAdmin = async () => {
    if (!confirm("⚠️ Tem a certeza que deseja excluir esta mesa?")) return;
    await deleteDoc(doc(db, "mesas", mesaAdminAtualId)); fecharModalMesaAdmin();
};

function renderCard(id, pedido) {
    const card = document.createElement('div');
    card.classList.add('order-card');
    if (pedido.status === "Preparando") card.classList.add('preparando');
    if (pedido.status === "Finalizado") card.classList.add('finalizado');
    
    let metodoVisual = "Retirada", iconeMetodo = "🥡"; 
    const metodoDB = pedido.metodo ? pedido.metodo.toLowerCase() : "";
    if (metodoDB.includes('entrega')) { metodoVisual = "Entrega"; iconeMetodo = "🛵"; } 
    else if (metodoDB.includes('mesa') || metodoDB.includes('salão')) { metodoVisual = "Consumo na Mesa"; iconeMetodo = "🍽️"; }

    let itensHtml = "";
    pedido.itens.forEach(i => itensHtml += `• ${i.name}<br>`);

    card.innerHTML = `
        <div class="order-header"><span>👤 ${pedido.cliente}</span><span>💰 R$ ${pedido.total.toFixed(2).replace('.', ',')}</span></div>
        <div style="font-size: 0.8rem; color: #94a3b8; margin-bottom: 5px; font-weight: bold;">${iconeMetodo} ${metodoVisual} | 💳 ${pedido.pagamento}</div>
        ${metodoVisual === "Entrega" && pedido.endereco ? `<div style="font-size: 0.8rem; color: #cbd5e1; margin-bottom: 8px;">📍 ${pedido.endereco}</div>` : ''}
        <div class="order-items">${itensHtml}</div>
        ${pedido.obs ? `<div style="color: #f59e0b; font-size: 0.8rem; margin-top: 5px;">📝 <b>Obs:</b> ${pedido.obs}</div>` : ''}
        <div class="admin-btns" style="margin-top: 15px;">
            ${pedido.status === "Pendente" ? `<button class="btn-accept" onclick="alterarStatus('${id}', 'Preparando')">Aceitar</button>` : ''}
            ${pedido.status === "Preparando" ? `<button class="btn-done" onclick="alterarStatus('${id}', 'Finalizado')">Concluir</button>` : ''}
            <button class="btn-cancel" onclick="excluirPedido('${id}')">Excluir</button>
        </div>
    `;

    if (pedido.status === "Pendente" && colPendente) colPendente.appendChild(card);
    else if (pedido.status === "Preparando" && colPreparando) colPreparando.appendChild(card);
    else if (pedido.status === "Finalizado" && colFinalizado) colFinalizado.appendChild(card);
}
window.alterarStatus = async (id, novoStatus) => { await updateDoc(doc(db, "pedidos", id), { status: novoStatus }); };
window.excluirPedido = async (id) => { if (confirm("Tem certeza que deseja excluir este pedido?")) await deleteDoc(doc(db, "pedidos", id)); };


// --- MÓDULO DE CAIXA DEDICADO ---
let valorAberturaCaixa = parseFloat(localStorage.getItem('esquina_valorAbertura')) || 0;
let totalSangriaCaixa = parseFloat(localStorage.getItem('esquina_totalSangria')) || 0;
let totalSuprimentoCaixa = parseFloat(localStorage.getItem('esquina_totalSuprimento')) || 0;
let caixaAberto = localStorage.getItem('esquina_caixaAberto') === 'true';

window.atualizarBotoesCaixa = () => {
    const btnAbrir = document.getElementById('btn-abrir-caixa-page');
    const btnFechar = document.getElementById('btn-fechar-caixa-page');
    const btnSup = document.getElementById('btn-suprimento-page');
    const btnSan = document.getElementById('btn-sangria-page');
    const statusDiv = document.getElementById('status-caixa-atual');

    if (caixaAberto) {
        if(btnAbrir) btnAbrir.style.display = 'none';
        if(btnFechar) btnFechar.style.display = 'block';
        if(btnSup) btnSup.style.display = 'block';
        if(btnSan) btnSan.style.display = 'block';

        const esperado = valorAberturaCaixa + totalDinheiro + totalSuprimentoCaixa - totalSangriaCaixa;
        if(statusDiv) {
            statusDiv.innerHTML = `
                <div style="background: #0f172a; padding: 15px; border-radius: 8px; border: 1px solid #334155;"><span style="color: #94a3b8; font-size: 0.85rem;">Fundo Inicial</span><br><b style="color: #f8fafc; font-size: 1.4rem;">R$ ${valorAberturaCaixa.toFixed(2).replace('.', ',')}</b></div>
                <div style="background: #0f172a; padding: 15px; border-radius: 8px; border: 1px solid #334155;"><span style="color: #94a3b8; font-size: 0.85rem;">Vendas (Dinheiro)</span><br><b style="color: #10b981; font-size: 1.4rem;">R$ ${totalDinheiro.toFixed(2).replace('.', ',')}</b></div>
                <div style="background: #0f172a; padding: 15px; border-radius: 8px; border: 1px solid #334155;"><span style="color: #94a3b8; font-size: 0.85rem;">Movimentações</span><br><b style="color: #3b82f6; font-size: 1.1rem;">+R$ ${totalSuprimentoCaixa.toFixed(2)}</b> | <b style="color: #ef4444; font-size: 1.1rem;">-R$ ${totalSangriaCaixa.toFixed(2)}</b></div>
                <div style="background: #0f172a; padding: 15px; border-radius: 8px; border: 1px solid #f59e0b;"><span style="color: #f59e0b; font-size: 0.85rem;">Esperado na Gaveta</span><br><b style="color: #f59e0b; font-size: 1.6rem;">R$ ${esperado.toFixed(2).replace('.', ',')}</b></div>
            `;
        }
    } else {
        if(btnAbrir) btnAbrir.style.display = 'block';
        if(btnFechar) btnFechar.style.display = 'none';
        if(btnSup) btnSup.style.display = 'none';
        if(btnSan) btnSan.style.display = 'none';
        if(statusDiv) statusDiv.innerHTML = `<div style="color: #ef4444; font-weight: bold; font-size: 1.1rem; grid-column: span 4;">Caixa Fechado. Abra o caixa para iniciar as operações.</div>`;
    }
};

window.abrirCaixaManha = () => {
    const valorStr = prompt("Qual o valor do Fundo de Troco que está na gaveta agora? (Ex: 50.00)");
    if (valorStr === null) return; 
    const valor = parseFloat(valorStr.replace(',', '.'));
    if (isNaN(valor) || valor < 0) return alert("Valor inválido.");

    valorAberturaCaixa = valor; totalSangriaCaixa = 0; totalSuprimentoCaixa = 0; caixaAberto = true;
    localStorage.setItem('esquina_valorAbertura', valorAberturaCaixa);
    localStorage.setItem('esquina_totalSangria', '0');
    localStorage.setItem('esquina_totalSuprimento', '0');
    localStorage.setItem('esquina_caixaAberto', 'true');
    atualizarBotoesCaixa(); alert(`Caixa aberto com sucesso!`);
};

window.registrarSangria = () => {
    const val = prompt("RETIRAR da gaveta (Ex: 20.00):"); if (!val) return;
    const valor = parseFloat(val.replace(',', '.')); if (isNaN(valor) || valor <= 0) return alert("Inválido.");
    const motivo = prompt("Motivo:");
    totalSangriaCaixa += valor; localStorage.setItem('esquina_totalSangria', totalSangriaCaixa);
    atualizarBotoesCaixa(); alert(`Sangria de R$ ${valor.toFixed(2)} registada! (${motivo})`);
};

window.registrarSuprimento = () => {
    const val = prompt("COLOCAR na gaveta (Ex: 100.00):"); if (!val) return;
    const valor = parseFloat(val.replace(',', '.')); if (isNaN(valor) || valor <= 0) return alert("Inválido.");
    const motivo = prompt("Motivo:");
    totalSuprimentoCaixa += valor; localStorage.setItem('esquina_totalSuprimento', totalSuprimentoCaixa);
    atualizarBotoesCaixa(); alert(`Suprimento de R$ ${valor.toFixed(2)} registado! (${motivo})`);
};

window.abrirModalFechoCaixa = () => {
    document.getElementById('fecho-troco').innerText = valorAberturaCaixa.toFixed(2).replace('.', ',');
    document.getElementById('fecho-dinheiro').innerText = totalDinheiro.toFixed(2).replace('.', ',');
    document.getElementById('fecho-suprimento').innerText = totalSuprimentoCaixa.toFixed(2).replace('.', ',');
    document.getElementById('fecho-sangria').innerText = totalSangriaCaixa.toFixed(2).replace('.', ',');
    const esperadoGaveta = valorAberturaCaixa + totalDinheiro + totalSuprimentoCaixa - totalSangriaCaixa;
    document.getElementById('fecho-esperado-gaveta').innerText = esperadoGaveta.toFixed(2).replace('.', ',');
    document.getElementById('fecho-pix').innerText = totalPix.toFixed(2).replace('.', ',');
    const cartoes = totalCredito + totalDebito;
    document.getElementById('fecho-cartoes').innerText = cartoes.toFixed(2).replace('.', ',');
    const totalFaturado = totalDinheiro + totalPix + cartoes;
    document.getElementById('fecho-total').innerText = totalFaturado.toFixed(2).replace('.', ',');
    document.getElementById('modal-fecho-caixa').style.display = 'flex';
};
window.fecharModalFechoCaixa = () => document.getElementById('modal-fecho-caixa').style.display = 'none';

window.confirmarFechoCaixa = async () => {
    if (!confirm("Tem a certeza que deseja encerrar o caixa de hoje?")) return;
    try {
        const totalVendas = totalDinheiro + totalPix + totalCredito + totalDebito;
        const esperadoGaveta = valorAberturaCaixa + totalDinheiro + totalSuprimentoCaixa - totalSangriaCaixa;
        await addDoc(collection(db, "caixa"), {
            data: serverTimestamp(), valorAbertura: valorAberturaCaixa, sangrias: totalSangriaCaixa,
            suprimentos: totalSuprimentoCaixa, esperadoEmGaveta: esperadoGaveta, valorFechamentoVendas: totalVendas,
            vendasPorTipo: { dinheiro: totalDinheiro, pix: totalPix, credito: totalCredito, debito: totalDebito }
        });
        caixaAberto = false; valorAberturaCaixa = totalSangriaCaixa = totalSuprimentoCaixa = 0;
        localStorage.removeItem('esquina_caixaAberto'); localStorage.removeItem('esquina_valorAbertura');
        localStorage.removeItem('esquina_totalSangria'); localStorage.removeItem('esquina_totalSuprimento');
        atualizarBotoesCaixa(); fecharModalFechoCaixa(); alert("Caixa encerrado com sucesso!");
    } catch (e) { console.error("Erro:", e); alert("Erro ao encerrar."); }
};

// Leitura do Histórico de Caixa
onSnapshot(query(collection(db, "caixa"), orderBy("data", "desc")), (snapshot) => {
    const historico = document.getElementById('historico-caixa');
    if (!historico) return;
    historico.innerHTML = "";
    snapshot.forEach(docSnap => {
        const cx = docSnap.data();
        const dataStr = cx.data ? cx.data.toDate().toLocaleString('pt-BR') : "Data desconhecida";
        historico.innerHTML += `
            <div style="background: #0f172a; border: 1px solid #334155; padding: 15px; border-radius: 8px; display: flex; justify-content: space-between; align-items: center;">
                <div>
                    <div style="color: #f8fafc; font-weight: bold; margin-bottom: 5px;">Fechamento: ${dataStr}</div>
                    <div style="color: #94a3b8; font-size: 0.85rem;">
                        Gaveta Fechada: R$ ${(cx.esperadoEmGaveta || cx.valorFechamento || 0).toFixed(2).replace('.', ',')} | 
                        Total Faturado: R$ ${(cx.valorFechamentoVendas || cx.valorFechamento || 0).toFixed(2).replace('.', ',')}
                    </div>
                </div>
            </div>
        `;
    });
});

// --- SISTEMA DE IMPRESSÃO ---
window.imprimirComandaCozinha = (cliente, itens, obs = "") => {
    const area = document.getElementById('area-impressao');
    const dataHora = new Date().toLocaleString('pt-BR');
    let htmlItens = itens.map(i => `<div style="margin-bottom: 5px;">[ ] ${i.name || i}</div>`).join('');
    area.innerHTML = `<div style="text-align: center; border-bottom: 1px dashed #000; padding-bottom: 5px; margin-bottom: 10px;"><h2 style="margin: 0; font-size: 16px;">COMANDA DE PRODUÇÃO</h2><p style="margin: 0; font-size: 12px;">${dataHora}</p></div><h3 style="margin: 5px 0 10px 0; font-size: 18px; text-transform: uppercase;">${cliente}</h3><div style="border-bottom: 1px dashed #000; margin-bottom: 10px; padding-bottom: 10px;"><b>ITENS:</b><br><br>${htmlItens}</div>${obs ? `<div style="margin-top: 5px;"><b>OBS:</b> ${obs}</div>` : ''}<div style="text-align: center; margin-top: 20px;">*** FIM ***</div>`;
    window.print();
};

window.imprimirContaCliente = (cliente, itens, total, pagamento) => {
    const area = document.getElementById('area-impressao');
    const dataHora = new Date().toLocaleString('pt-BR');
    let htmlItens = itens.map(i => `<div style="display: flex; justify-content: space-between; margin-bottom: 3px;"><span>1x ${i.name || i}</span></div>`).join('');
    area.innerHTML = `<div style="text-align: center; margin-bottom: 15px;"><h2 style="margin: 0; font-size: 18px;">ESQUINA DO SABOR</h2><p style="margin: 0; font-size: 12px;">Data: ${dataHora}</p></div><div style="border-bottom: 1px dashed #000; margin-bottom: 10px; padding-bottom: 5px;"><b>CLIENTE/MESA:</b> ${cliente}</div><div style="border-bottom: 1px dashed #000; margin-bottom: 10px; padding-bottom: 10px;"><b>CUPOM NÃO FISCAL</b><br><br>${htmlItens}</div><div style="font-size: 16px; font-weight: bold; text-align: right; margin-top: 10px;">TOTAL: R$ ${parseFloat(total).toFixed(2).replace('.', ',')}</div><div style="text-align: right; margin-top: 5px; font-size: 12px;">Pgto: ${pagamento}</div><div style="text-align: center; margin-top: 30px; font-size: 12px;">Obrigado pela preferência!<br>Volte sempre!</div>`;
    window.print();
    setTimeout(() => { area.innerHTML = ""; }, 1000);
};

