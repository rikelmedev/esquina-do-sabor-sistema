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

// BARRA INFERIOR 
const bottomCartBar = document.getElementById('bottom-cart-bar');
bottomCartBar.addEventListener('click', () => {
    cartModal.style.display = 'block';
});

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
    
    const formatTotal = total.toFixed(2).replace('.', ',');
    cartTotalValue.innerText = formatTotal;
    
    const count = cart.length;
    document.getElementById('cart-count-bottom').innerText = count;
    document.getElementById('cart-total-bottom').innerText = formatTotal;
    
    if (count > 0) {
        bottomCartBar.classList.remove('hidden');
    } else {
        bottomCartBar.classList.add('hidden');
    }
}

window.removeItem = (index) => {
    cart.splice(index, 1);
    updateCart();
};

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
        novoPedido.itens.forEach(i => msg += `• ${i.name}\n`);
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