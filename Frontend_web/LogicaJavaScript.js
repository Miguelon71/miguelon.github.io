let cart = [];

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
        const response = await fetch("https://tareaweb1.onrender.com/api/menu");
        
        if (!response.ok) throw new Error(`Error HTTP: ${response.status}`);
        
        const data = await response.json();
        renderMenu(data.data);
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
        if (!categories[item.Plato]) {
            categories[item.Plato] = [];
        }
        categories[item.Plato].push(item);
    });

    for (const category in categories) {
        const section = document.createElement("div");
        section.classList.add("menu-section");
        section.id = category;

        const title = document.createElement("h2");
        title.textContent = `🍽️ ${category}`;
        section.appendChild(title);

        categories[category].forEach((item) => {
            const card = document.createElement("div");
            card.classList.add("card", "menu-item-container");

            const img = document.createElement("img");
            img.src = item.imagen || "placeholder.jpg";
            img.alt = item["Nombre "]; // Corregido el acceso a la clave con espacio
            img.classList.add("menu-image");

            const name = document.createElement("h2");
            name.className = "menu-name";
            name.textContent = item["Nombre "]; // Corregido el acceso a la clave con espacio

            const desc = document.createElement("p");
            desc.className = "overlay-text";
            desc.textContent = item.Descripcion;

            const price = document.createElement("p");
            price.className = "menu-price";
            price.textContent = `$${parseFloat(item["Precio "]).toFixed(2)}`; // Corregido el acceso a la clave con espacio

            const btn = document.createElement("button");
            btn.textContent = "Agregar al Carrito";
            btn.onclick = () => addToCart(item["Nombre "], parseFloat(item["Precio "]));

            card.appendChild(img);
            card.appendChild(name);
            card.appendChild(desc);
            card.appendChild(price);
            card.appendChild(btn);

            section.appendChild(card);
        });

        menuContainer.appendChild(section);
    }
}


// Funciones del carrito de compras
function addToCart(name, price) {
    cart.push({ name, price });
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
    document.getElementById("delivery-form").style.display = "block";
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

    const orderData = {
        nombre: name,
        telefono: phone,
        direccion: address,
        items: cart.map(item => `${item.name} (${item.price.toFixed(2)})`).join(", "),
        total: cart.reduce((acc, item) => acc + item.price, 0).toFixed(2)
    };

    try {
        // When using mode: "no-cors", we cannot inspect the response.
        // We assume success if the fetch call itself does not throw an error.
        await fetch("https://script.google.com/macros/s/AKfycbxeYg6D1Rbe5udMH_1z5RS0Tv8c70skfWITrW7lFWsS-5Tzw0QK_xR09z6XjZA2RkudEg/exec?sheet=Pedidos", {
            method: "POST",
            headers: { "Content-Type": "application/json" }, // Note: Some services might have issues with Content-Type and no-cors. Often, text/plain is used.
            body: JSON.stringify(orderData),
            mode: "no-cors" 
        });
        
        // If fetch completes without throwing, assume data was sent.
        console.log("Pedido enviado (modo no-cors, respuesta no disponible).");

        showConfirmation(name, address, phone); // Shows confirmation, resets form, hides delivery form
        clearCart(); // Clears the cart data and updates UI
        // purchase-summary is not explicitly hidden here, relies on its own close button or user navigating away.
        // delivery-form is hidden by showConfirmation.

    } catch (error) {
        // This catch block handles network errors or if fetch itself fails.
        console.error("Error enviando pedido:", error);
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
        <button onclick="closeConfirmation()">Cerrar</button>
    `;

    document.getElementById("order-confirmation").innerHTML = confirmationHTML;
    document.getElementById("order-confirmation").style.display = "flex";
    document.getElementById("delivery-form").style.display = "none";
    document.getElementById("order-form").reset();
}

// Funciones de cierre de resumen y confirmación
function closeConfirmation() {
    document.getElementById("order-confirmation").style.display = "none";
}

function closeSummary() {
    document.getElementById("purchase-summary").style.display = "none";
}
