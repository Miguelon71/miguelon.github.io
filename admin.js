const API_BASE_URL = "https://tareaweb1.onrender.com/api"; // Ensure this matches your API URL

document.addEventListener("DOMContentLoaded", () => {
    const token = localStorage.getItem('authToken');
    if (!token) {
        window.location.href = 'Login.html'; // Redirect to login if no token
        return;
    }

    fetchOrders();
    
    const filterStatus = document.getElementById("filter-status");
    const filterClient = document.getElementById("filter-client");
    const logoutButton = document.getElementById("logout_button");

    if (filterStatus) {
        filterStatus.addEventListener("change", () => fetchOrders(filterStatus.value, filterClient ? filterClient.value : ''));
    }
    if (filterClient) {
        filterClient.addEventListener("input", () => fetchOrders(filterStatus ? filterStatus.value : 'todos', filterClient.value));
    }

    if (logoutButton) {
        logoutButton.addEventListener("click", logout);
    }

    // Poll for new orders every 30 seconds
    setInterval(() => fetchOrders(filterStatus ? filterStatus.value : 'todos', filterClient ? filterClient.value : ''), 30000);
});

function logout() {
    localStorage.removeItem('authToken');
    window.location.href = 'index.html'; // Or Login.html if preferred after logout
}

async function fetchOrders(statusFilter = 'todos', clientFilter = '') {
    const token = localStorage.getItem('authToken');
    if (!token) {
        window.location.href = 'Login.html';
        return;
    }

    try {
        const response = await fetch(`${API_BASE_URL}/ordenes/`, {
            headers: {
                'Authorization': `Token ${token}`
            }
        });
        if (response.status === 401 || response.status === 403) {
            localStorage.removeItem('authToken'); // Remove invalid token
            window.location.href = 'Login.html'; // Redirect to login
            return;
        }
        if (!response.ok) {
            throw new Error(`Error HTTP: ${response.status}`);
        }
        const orders = await response.json();
        renderOrders(orders, statusFilter, clientFilter);
    } catch (error) {
        console.error("Error al obtener las órdenes:", error);
        const tbody = document.getElementById("orders-tbody");
        if (tbody) {
            tbody.innerHTML = `<tr><td colspan="7">Error al cargar las órdenes: ${error.message}</td></tr>`;
        }
    }
}

function renderOrders(orders, statusFilter = 'todos', clientFilter = '') {
    const tbody = document.getElementById("orders-tbody");
    if (!tbody) {
        console.error("Elemento tbody con id 'orders-tbody' no encontrado.");
        return;
    }
    tbody.innerHTML = ""; // Clear existing rows

    const normalizedClientFilter = clientFilter.trim().toLowerCase();

    const filteredOrders = orders.filter(order => {
        let statusMatch = false;
        if (statusFilter === 'todos') {
            statusMatch = true;
        } else if (statusFilter === 'pendientes') {
            statusMatch = order.state.toLowerCase() === 'pendiente';
        } else if (statusFilter === 'atendidos') {
            statusMatch = order.state.toLowerCase() === 'atendido';
        } else {
            statusMatch = true; // Fallback for unknown status filters
        }

        let clientMatch = true;
        if (normalizedClientFilter) {
            clientMatch = order.name.toLowerCase().includes(normalizedClientFilter);
        }

        return statusMatch && clientMatch;
    });

    if (filteredOrders.length === 0) {
        tbody.innerHTML = '<tr><td colspan="7">No hay órdenes para mostrar.</td></tr>';
        return;
    }

    filteredOrders.forEach(order => {
        const tr = document.createElement("tr");

        const productsList = order.products.map(op => {
            const productName = op.product ? op.product.name : 'Producto Desconocido';
            return `${productName} (x${op.quantity})`;
        }).join(', ');

        tr.innerHTML = `
            <td>${order.name}</td>
            <td>${order.phone}</td>
            <td>${order.address}</td>
            <td>${productsList}</td>
            <td>$${parseFloat(order.total).toFixed(2)}</td>
            <td>
                <select class="order-status-select" data-order-id="${order.id}">
                    <option value="Pendiente" ${order.state === 'Pendiente' ? 'selected' : ''}>Pendiente</option>
                    <option value="Atendido" ${order.state === 'Atendido' ? 'selected' : ''}>Atendido</option>
                    <option value="Cancelado" ${order.state === 'Cancelado' ? 'selected' : ''}>Cancelado</option>
                </select>
            </td>
            <td>
                <button class="action-button update-status-btn" data-order-id="${order.id}">Actualizar</button>
            </td>
        `;
        tbody.appendChild(tr);
    });

    // Add event listeners to "Actualizar" buttons
    document.querySelectorAll('.update-status-btn').forEach(button => {
        button.addEventListener('click', async (event) => {
            const orderId = event.target.dataset.orderId;
            const selectElement = document.querySelector(`.order-status-select[data-order-id="${orderId}"]`);
            const newStatus = selectElement.value;
            await updateOrderStatus(orderId, newStatus);
        });
    });
}

async function updateOrderStatus(orderId, newStatus) {
    const token = localStorage.getItem('authToken');
    if (!token) {
        window.location.href = 'Login.html';
        return;
    }

    try {
        const response = await fetch(`${API_BASE_URL}/ordenes/${orderId}/`, {
            method: "PUT",
            headers: {
                "Content-Type": "application/json",
                'Authorization': `Token ${token}`
            },
            body: JSON.stringify({ state: newStatus }),
        });

        if (response.status === 401 || response.status === 403) {
            localStorage.removeItem('authToken'); // Remove invalid token
            window.location.href = 'Login.html'; // Redirect to login
            return;
        }
        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(`Error HTTP: ${response.status}, ${JSON.stringify(errorData)}`);
        }
        
        console.log(`Order ${orderId} status updated to ${newStatus}`);
        alert(`Estado de la orden #${orderId} actualizado a ${newStatus}.`);
        
        // Refresh the orders list to show the change
        const filterStatusEl = document.getElementById("filter-status");
        const filterClientEl = document.getElementById("filter-client");
        fetchOrders(filterStatusEl ? filterStatusEl.value : 'todos', filterClientEl ? filterClientEl.value : '');

    } catch (error) {
        console.error("Error al actualizar el estado de la orden:", error);
        alert(`Error al actualizar el estado de la orden: ${error.message}`);
    }
}
