import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { getFirestore, collection, addDoc, serverTimestamp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

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

// 1. ANIMAÇÃO
const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
        if (entry.isIntersecting) entry.target.classList.add('appear'); 
    });
}, { threshold: 0.1 });

document.querySelectorAll('.fade-in').forEach(el => observer.observe(el));

// 1B. CONTAGEM REAL DE ITENS POR CATEGORIA (cards de "Explore por Categoria")
document.querySelectorAll('.categoria-count').forEach(span => {
    const section = document.getElementById(span.getAttribute('data-count-for'));
    if (section) {
        const count = section.querySelectorAll('.menu-card').length;
        span.textContent = `${count} ${count === 1 ? 'item' : 'itens'}`;
    }
});

// 2. CARRINHO
let cart = [];
const cartModal = document.getElementById('order-modal');
const cartItemsContainer = document.getElementById('cart-items-container');
const cartTotalValue = document.getElementById('cart-total');
const clientName = document.getElementById('customer-name');
const deliveryMethod = document.getElementById('order-type');
const clientAddress = document.getElementById('customer-address');
const paymentMethod = document.getElementById('payment-method');
const orderObservations = document.getElementById('order-notes');

// SINCRONIZAÇÃO DOS DOIS BOTÕES DE CARRINHO (PC E MOBILE)
const bottomCartBar = document.getElementById('bottom-cart-bar');
if (bottomCartBar) {
    bottomCartBar.addEventListener('click', () => cartModal.style.display = 'block');
}

const cartFab = document.getElementById('cart-fab');
if (cartFab) {
    cartFab.addEventListener('click', () => cartModal.style.display = 'block');
}

document.querySelector('.close-button').addEventListener('click', () => {
    cartModal.style.display = 'none';
});

// Entrega/Retirada
deliveryMethod.addEventListener('change', () => {
    if (deliveryMethod.value === 'Entrega') { 
        clientAddress.classList.remove('hidden');
    } else {
        clientAddress.classList.add('hidden');
        clientAddress.value = "";
    }
});

// Adicionar ao Carrinho
document.querySelectorAll('.add-to-cart-btn').forEach(btn => {
    btn.addEventListener('click', () => {
        const name = btn.getAttribute('data-name');
        const price = parseFloat(btn.getAttribute('data-price'));
        cart.push({ name, price });
        updateCart();
    });
});

// Agrupa o carrinho (que guarda 1 entrada por unidade) em linhas por produto, só para exibição.
function getGroupedCart() {
    const grouped = [];
    cart.forEach(item => {
        const existing = grouped.find(g => g.name === item.name && g.price === item.price);
        if (existing) existing.qty++;
        else grouped.push({ name: item.name, price: item.price, qty: 1 });
    });
    return grouped;
}

function updateCart() {
    cartItemsContainer.innerHTML = '';
    let total = 0;
    const grouped = getGroupedCart();

    if (grouped.length === 0) {
        cartItemsContainer.innerHTML = '<p class="cart-empty">Seu carrinho está vazio.</p>';
    }

    grouped.forEach((item, index) => {
        const subtotalItem = item.price * item.qty;
        total += subtotalItem;
        const div = document.createElement('div');
        div.classList.add('cart-item');
        div.innerHTML = `
            <div class="cart-item-info">
                <span class="cart-item-name">${item.name}</span>
                <span class="cart-item-unit">R$ ${item.price.toFixed(2).replace('.', ',')} cada</span>
            </div>
            <div class="cart-item-controls">
                <button class="qty-btn" data-index="${index}" data-action="dec">−</button>
                <span class="qty-value">${item.qty}</span>
                <button class="qty-btn" data-index="${index}" data-action="inc">+</button>
                <span class="cart-item-subtotal">R$ ${subtotalItem.toFixed(2).replace('.', ',')}</span>
            </div>
        `;
        cartItemsContainer.appendChild(div);
    });

    const formatTotal = total.toFixed(2).replace('.', ',');
    cartTotalValue.innerText = formatTotal;

    const count = cart.length;

    // Atualiza a Barra Mobile
    if (document.getElementById('cart-count-bottom')) {
        document.getElementById('cart-count-bottom').innerText = count;
        document.getElementById('cart-total-bottom').innerText = formatTotal;
    }

    // Atualiza a Bolinha do PC
    if (document.getElementById('cart-count')) {
        document.getElementById('cart-count').innerText = count;
    }

    // Mostra ou esconde a barra no Mobile
    if (count > 0 && bottomCartBar) {
        bottomCartBar.classList.remove('hidden');
    } else if (bottomCartBar) {
        bottomCartBar.classList.add('hidden');
    }
}

// Delegação: um clique nos botões +/- do carrinho ajusta a quantidade daquele produto
cartItemsContainer.addEventListener('click', (e) => {
    const btn = e.target.closest('.qty-btn');
    if (!btn) return;
    const grouped = getGroupedCart();
    const item = grouped[Number(btn.dataset.index)];
    if (!item) return;

    if (btn.dataset.action === 'inc') {
        cart.push({ name: item.name, price: item.price });
    } else {
        const idx = cart.findIndex(i => i.name === item.name && i.price === item.price);
        if (idx > -1) cart.splice(idx, 1);
    }
    updateCart();
});

// 3. ENVIO DE PEDIDO 
document.getElementById('finalize-order-btn').addEventListener('click', async () => {
    if (!clientName.value) return alert("Por favor, preencha seu nome!");
    if (deliveryMethod.value === 'Entrega' && !clientAddress.value) return alert("Preencha o endereço!");
    if (cart.length === 0) return alert("Seu carrinho está vazio!");

    const novoPedido = {
        cliente: clientName.value,
        metodo: deliveryMethod.value,
        endereco: deliveryMethod.value === 'Entrega' ? clientAddress.value : "Retirada no Local",
        pagamento: paymentMethod.value,
        obs: orderObservations.value,
        itens: cart,
        total: parseFloat(cartTotalValue.innerText.replace(',', '.')),
        status: "Pendente",
        data: serverTimestamp() 
    };

    try {
        await addDoc(collection(db, "pedidos"), novoPedido);
        
        let msg = `🍔 *PEDIDO RECEBIDO - ESQUINA DO SABOR*\n\n👤 *Cliente:* ${novoPedido.cliente}\n🛵 *Método:* ${novoPedido.metodo}\n📍 *Endereço:* ${novoPedido.endereco}\n💳 *Pagto:* ${novoPedido.pagamento}\n\n🛒 *Itens:*\n`;
        getGroupedCart().forEach(i => msg += `• ${i.qty}x ${i.name}\n`);
        msg += `\n💰 *Total: R$ ${cartTotalValue.innerText}*`;
        
        window.open(`https://api.whatsapp.com/send?phone=5517992079103&text=${encodeURIComponent(msg)}`);

        alert("Pedido enviado com sucesso!");
        cart = [];
        clientName.value = "";
        clientAddress.value = "";
        orderObservations.value = "";
        updateCart();
        cartModal.style.display = 'none';

    } catch (e) {
        console.error("Erro ao salvar:", e);
        alert("Erro ao enviar. Verifique sua conexão.");
    }
});

// 4. MENU INTELIGENTE CORRIGIDO (SCROLL SPY)
const navLinks = document.querySelectorAll('.nav-list li a');
// Só considera as seções que têm link no menu (ignora hero/categorias/destaques)
const sections = Array.from(navLinks)
    .map(link => document.querySelector(link.getAttribute('href')))
    .filter(Boolean);

function updateScrollSpy() {
    let current = 'lanches'; 
    sections.forEach(section => {
        const sectionTop = section.offsetTop;
        if (pageYOffset >= (sectionTop - 160)) { 
            current = section.getAttribute('id');
        }
    });

    navLinks.forEach(link => {
        link.classList.remove('active');
        if (current && link.getAttribute('href') === `#${current}`) {
            link.classList.add('active');
        }
    });
}
window.addEventListener('scroll', updateScrollSpy);
updateScrollSpy(); 

// 5. LÓGICA DO MENU LATERAL (MOBILE)
const hamburgerBtn = document.getElementById('hamburger-btn');
const closeSidebarBtn = document.getElementById('close-sidebar');
const sidebarNav = document.getElementById('sidebar-nav');
const sidebarOverlay = document.getElementById('sidebar-overlay');

if (hamburgerBtn && sidebarNav) {
    hamburgerBtn.addEventListener('click', () => {
        sidebarNav.classList.add('open');
        if (sidebarOverlay) sidebarOverlay.classList.add('open');
    });

    closeSidebarBtn.addEventListener('click', () => {
        sidebarNav.classList.remove('open');
        if (sidebarOverlay) sidebarOverlay.classList.remove('open');
    });

    if (sidebarOverlay) {
        sidebarOverlay.addEventListener('click', () => {
            sidebarNav.classList.remove('open');
            sidebarOverlay.classList.remove('open');
        });
    }

    // Fecha o menu automaticamente quando o cliente escolhe uma categoria
    document.querySelectorAll('.nav-list li a').forEach(link => {
        link.addEventListener('click', () => {
            sidebarNav.classList.remove('open');
            if (sidebarOverlay) sidebarOverlay.classList.remove('open');
        });
    });
}