import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { getFirestore, collection, addDoc, serverTimestamp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

const firebaseConfig = {
  apiKey: "AIzaSyDdDYKgcxXOr2hlkWYdmMM6P6_3HPrz1Io",
  authDomain: "esquinadosabor-erp.firebaseapp.com",
  projectId: "esquinadosabor-erp",
  storageBucket: "esquinadosabor-erp.firebasestorage.app",
  messagingSenderId: "924407371283",
  appId: "1:924407371283:web:95a149da9ad781b3a311e6"
};

// Inicializa o Firebase e o Banco de Dados
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

// ---------------------------------------------------------

// 2. ANIMAÇÃO 
const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
        if (entry.isIntersecting) entry.target.classList.add('visible');
    });
}, { threshold: 0.1 });

document.querySelectorAll('.fade-in').forEach(el => observer.observe(el));

// ---------------------------------------------------------

// 3. CARRINHO
let cart = [];
const cartModal = document.getElementById('cart-modal');
const cartItemsContainer = document.getElementById('cart-items');
const cartTotalValue = document.getElementById('cart-total-value');
const clientName = document.getElementById('client-name');
const deliveryMethod = document.getElementById('delivery-method');
const addressContainer = document.getElementById('address-container');
const clientAddress = document.getElementById('client-address');
const paymentMethod = document.getElementById('payment-method');
const orderObservations = document.getElementById('order-observations');

// Evento: Seleção Entrega/Retirada
deliveryMethod.addEventListener('change', () => {
    if (deliveryMethod.value === 'entrega') {
        addressContainer.classList.remove('hidden');
    } else {
        addressContainer.classList.add('hidden');
        clientAddress.value = "";
    }
});

// Botão Adicionar ao Carrinho
document.querySelectorAll('.add-to-cart-btn').forEach(btn => {
    btn.addEventListener('click', () => {
        const name = btn.getAttribute('data-name');
        const price = parseFloat(btn.getAttribute('data-price'));
        cart.push({ name, price });
        updateCart();
    });
});

function updateCart() {
    cartItemsContainer.innerHTML = '';
    let total = 0;
    cart.forEach((item, index) => {
        total += item.price;
        const div = document.createElement('div');
        div.classList.add('cart-item');
        div.innerHTML = `
            <span>${item.name} - R$ ${item.price.toFixed(2).replace('.', ',')}</span>
            <button class="remove-item-btn" onclick="window.removeItem(${index})">❌</button>
        `;
        cartItemsContainer.appendChild(div);
    });
    cartTotalValue.innerText = `R$ ${total.toFixed(2).replace('.', ',')}`;
    cartModal.classList.toggle('hidden', cart.length === 0);
}

// Função de remover global
window.removeItem = (index) => {
    cart.splice(index, 1);
    updateCart();
};

// ---------------------------------------------------------

// 4. ENVIO DE PEDIDO (SALVAR NO SISTEMA)
document.getElementById('checkout-btn').addEventListener('click', async () => {
    if (!clientName.value) return alert("Por favor, preencha seu nome!");
    if (deliveryMethod.value === 'entrega' && !clientAddress.value) return alert("Preencha o endereço!");
    if (cart.length === 0) return;

    // Criar o objeto do pedido para salvar no Banco de Dados
    const novoPedido = {
        cliente: clientName.value,
        metodo: deliveryMethod.value,
        endereco: deliveryMethod.value === 'entrega' ? clientAddress.value : "Retirada no Local",
        pagamento: paymentMethod.value,
        obs: orderObservations.value,
        itens: cart,
        total: parseFloat(cartTotalValue.innerText.replace('R$ ', '').replace(',', '.')),
        status: "Pendente",
        data: serverTimestamp() 
    };

    try {
        // SALVA NO FIREBASE
        await addDoc(collection(db, "pedidos"), novoPedido);
        
        // MENSAGEM PARA O WHATSAPP 
        let msg = `🍔 *PEDIDO RECEBIDO - ESQUINA DO SABOR*\n\n👤 *Cliente:* ${novoPedido.cliente}\n🛵 *Método:* ${novoPedido.metodo}\n📍 *Endereço:* ${novoPedido.endereco}\n💳 *Pagto:* ${novoPedido.pagamento}\n\n🛒 *Itens:*\n`;
        novoPedido.itens.forEach(i => msg += `• ${i.name}\n`);
        msg += `\n💰 *Total: ${cartTotalValue.innerText}*`;
        
        window.open(`https://api.whatsapp.com/send?phone=5517992079103&text=${encodeURIComponent(msg)}`);

        // Limpa tudo
        alert("Pedido registrado com sucesso no sistema!");
        cart = [];
        clientName.value = "";
        clientAddress.value = "";
        orderObservations.value = "";
        updateCart();

    } catch (e) {
        console.error("Erro ao salvar:", e);
        alert("Erro ao enviar pedido. Tente novamente.");
    }
});

document.getElementById('close-cart').addEventListener('click', () => cartModal.classList.add('hidden'));