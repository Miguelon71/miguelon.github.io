let cart = [];
const API_BASE_URL = "http://127.0.0.1:8000/api"; // Assuming Django runs on port 8000

document.addEventListener("DOMContentLoaded", () => {
    fetchMenu();
    const orderForm = document.getElementById("order-form");

    if (orderForm) {
        orderForm.addEventListener("submit", submitOrder);
        console.log("Formulario vinculado correctamente.");
    } else {
        console.error("No se encontró el formulario de pedido.");
    }
});

async function fetchMenu() {
    try {
        const response = await fetch(`${API_BASE_URL}/productos/`);
        
        if (!response.ok) throw new Error(`Error HTTP: ${response.status}`);
        
        const data = await response.json();
        renderMenu(data);
    } catch (error) {
        console.error("Error al obtener el menú:", error);
    }
}

function renderMenu(items) {
    console.log("Datos recibidos:", items);
    
    const menuContainer = document.getElementById("menu");
    menuContainer.innerHTML = ""; // Limpiar el menú antes de cargar los datos
    
    const categories = {};

    items.forEach((item) => {
        const categoryKey = item.category || 'General'; 
        if (!categories[categoryKey]) {
            categories[categoryKey] = [];
        }
        categories[categoryKey].push(item);
    });

    for (const categoryName in categories) {
        const section = document.createElement("div");
        section.classList.add("menu-section");
        section.id = categoryName.toLowerCase().replace(/\s+/g, '-'); // Create a valid ID

        const title = document.createElement("h2");
        title.textContent = `🍽️ ${categoryName}`;
        section.appendChild(title);

        categories[categoryName].forEach((item) => {
            const card = document.createElement("div");
            card.classList.add("card", "menu-item-container");

            const img = document.createElement("img");
            img.src = item.image || "placeholder.jpg"; // Use item.image
            img.alt = item.name; // Use item.name
            img.classList.add("menu-image");

            const nameEl = document.createElement("h2"); // Renamed to avoid conflict with item.name
            nameEl.className = "menu-name";
            nameEl.textContent = item.name; // Use item.name

            const desc = document.createElement("p");
            desc.className = "overlay-text";
            desc.textContent = item.description; // Use item.description

            const price = document.createElement("p");
            price.className = "menu-price";
            price.textContent = `$${parseFloat(item.price).toFixed(2)}`; // Use item.price

            const btn = document.createElement("button");
            btn.textContent = "Agregar al Carrito";
            btn.onclick = () => addToCart(item); 

            card.appendChild(img);
            card.appendChild(nameEl);
            card.appendChild(desc);
            card.appendChild(price);
            card.appendChild(btn);

            section.appendChild(card);
        });

        menuContainer.appendChild(section);
    }
}


// Funciones del carrito de compras
function addToCart(item) {
    cart.push({ id: item.id, name: item.name, price: parseFloat(item.price) });
    updateCart();
}

function updateCart() {
    const cartItems = document.getElementById("cart-items");
    const cartTotal = document.getElementById("cart-total");
    cartItems.innerHTML = "";
    let total = 0;

    cart.forEach((item, index) => {
        const li = document.createElement("li");
        li.textContent = `${item.name} - $${item.price.toFixed(2)}`;
        const removeBtn = document.createElement("button");
        removeBtn.textContent = "X";
        removeBtn.onclick = () => removeFromCart(index);
        li.appendChild(removeBtn);
        cartItems.appendChild(li);
        total += item.price;
    });

    cartTotal.textContent = `Total: $${total.toFixed(2)}`;
}

function removeFromCart(index) {
    cart.splice(index, 1);
    updateCart();
}

function clearCart() {
    cart = [];
    updateCart();
}

// Función para realizar la compra
function purchaseCart() {
    if (cart.length === 0) {
        document.getElementById("purchase-summary").innerHTML = "<p>El carrito está vacío. No hay nada para comprar.</p>";
        return;
    }

    let summaryHTML = "<h2>Resumen de tu compra</h2><ul>";
    let total = 0;

    cart.forEach((item) => {
        summaryHTML += `<li>${item.name} - $${item.price.toFixed(2)}</li>`;
        total += item.price;
    });

    summaryHTML += `</ul><p><strong>Total: $${total.toFixed(2)}</strong></p>`;
    summaryHTML += `<button onclick="closeSummary()">Cerrar</button>`;

    document.getElementById("purchase-summary").innerHTML = summaryHTML;
    document.getElementById("purchase-summary").style.display = "block";
    document.getElementById("delivery-form-section").style.display = "block"; // Corrected ID
}

// Enviar pedido a la hoja "Pedidos" con POST
async function submitOrder(event) {
    event.preventDefault();

    const name = document.getElementById("name").value;
    const address = document.getElementById("address").value;
    const phone = document.getElementById("phone").value;

    if (!name || !address || !phone) {
        alert("Por favor, completa todos los campos.");
        return;
    }

    const orderProducts = cart.map(item => ({
        id: item.id, // Django OrderProduct expects product ID
        quantity: 1 // Default quantity
    }));
    
    const calculatedTotal = cart.reduce((acc, item) => acc + item.price, 0);

    const orderData = {
        name: name,
        phone: phone,
        address: address,
        total: calculatedTotal.toFixed(2),
        state: "Pendiente", // Default state for new orders
        products: orderProducts 
    };

    try {
        const response = await fetch(`${API_BASE_URL}/ordenes/`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(orderData)
        });
        
        if (response.ok) {
            const result = await response.json();
            console.log("Pedido enviado:", result);
            showConfirmation(name, address, phone); 
            clearCart(); 
            document.getElementById("purchase-summary").style.display = "none"; // Hide summary
        } else {
            const errorData = await response.json(); // Assuming error response is JSON
            console.error("Error enviando pedido:", response.status, errorData);
            let errorMessage = "Hubo un error al enviar tu pedido.";
            if (errorData && typeof errorData === 'object') {
                const messages = Object.values(errorData).flat().join("\n");
                if (messages) errorMessage += `\nDetalles: ${messages}`;
            }
            alert(errorMessage);
        }

    } catch (error) {
        console.error("Error enviando pedido (catch):", error);
        alert("Hubo un error al enviar tu pedido. Por favor, inténtalo de nuevo más tarde.");
    }
}

// Mostrar confirmación de pedido
function showConfirmation(name, address, phone) {
    let confirmationHTML = `
        <h2>Pedido Confirmado</h2>
        <p>Gracias, <strong>${name}</strong>.</p>
        <p>Tu pedido será enviado a: <strong>${address}</strong></p>
        <p>Nos pondremos en contacto al <strong>${phone}</strong>.</p>
        <p>Tu pedido ha sido procesado por nuestro sistema.</p>
        <button onclick="closeConfirmation()">Cerrar</button>
    `;

    document.getElementById("order-confirmation").innerHTML = confirmationHTML;
    document.getElementById("order-confirmation").style.display = "flex";
    document.getElementById("delivery-form-section").style.display = "none"; // Corrected ID
    document.getElementById("order-form").reset();
}

// Funciones de cierre de resumen y confirmación
function closeConfirmation() {
    document.getElementById("order-confirmation").style.display = "none";
}

function closeSummary() {
    document.getElementById("purchase-summary").style.display = "none";
}

function scrollToSection(sectionId) {
    if (sectionId === 'all') {
        document.querySelectorAll('.menu-section').forEach(section => {
            section.style.display = 'block';
        });
        // Optionally scroll to the top of the menu container or a general menu heading
        const menuContainer = document.getElementById('menu-section');
        if (menuContainer) {
            menuContainer.scrollIntoView({ behavior: 'smooth' });
        }
    } else {
        // Hide all sections first
        document.querySelectorAll('.menu-section').forEach(section => {
            section.style.display = 'none';
        });
        // Show the target section
        const targetSection = document.getElementById(sectionId);
        if (targetSection) {
            targetSection.style.display = 'block';
            targetSection.scrollIntoView({ behavior: 'smooth' });
        } else {
            // If a specific category section doesn't exist (e.g. 'platos', 'bebidas'),
            // it might be because categories are dynamically generated.
            // This part assumes IDs like 'entradas', 'platos-principales' etc. are set on .menu-section divs
            // If sectionId corresponds to a category name like "Entradas", "Platos Principales"
            // we need to find the section with that ID (e.g. id="entradas", id="platos-principales")
            const dynamicSectionId = sectionId.toLowerCase().replace(/\s+/g, '-');
            const dynamicTargetSection = document.getElementById(dynamicSectionId);
            if (dynamicTargetSection) {
                dynamicTargetSection.style.display = 'block';
                dynamicTargetSection.scrollIntoView({ behavior: 'smooth' });
            } else {
                console.warn(`Section with ID '${sectionId}' or '${dynamicSectionId}' not found.`);
                // Fallback: show all if specific section not found
                 document.querySelectorAll('.menu-section').forEach(section => {
                    section.style.display = 'block';
                });
            }
        }
    }
}
