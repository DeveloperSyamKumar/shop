import './style.css';

// Notification permission request
if ('Notification' in window && Notification.permission !== 'granted') {
    Notification.requestPermission();
}

let lastOrderCount = 0;

document.addEventListener('DOMContentLoaded', () => {
    // Initial load
    const orders = JSON.parse(localStorage.getItem('quickkart_orders') || '[]');
    lastOrderCount = orders.length; // Initialize count preventing instant notification on load
    
    // Inject Notification CSS
    const style = document.createElement('style');
    style.innerHTML = `
        .notification-toast {
            position: fixed;
            bottom: 20px;
            right: 20px;
            background: var(--bg);
            border-left: 4px solid var(--secondary);
            padding: 16px 20px;
            border-radius: var(--radius);
            box-shadow: var(--shadow-lg);
            display: flex;
            align-items: center;
            gap: 12px;
            transform: translateX(120%);
            transition: transform 0.3s ease;
            z-index: 2000;
            max-width: 350px;
        }
        .notification-toast.show {
            transform: translateX(0);
        }
        .notification-icon {
            font-size: 24px;
        }
        .notification-content {
            flex: 1;
        }
        .notification-title {
            font-weight: 700;
            margin-bottom: 4px;
            color: var(--text);
        }
        .notification-msg {
            font-size: 13px;
            color: var(--text-light);
        }
    `;
    document.head.appendChild(style);

    loadDashboard();
    
    document.getElementById('refreshBtn').addEventListener('click', loadDashboard);

    // Start Polling
    setInterval(checkForNewOrders, 3000);
});

function checkForNewOrders() {
    const orders = JSON.parse(localStorage.getItem('quickkart_orders') || '[]');
    const currentCount = orders.length;

    if (currentCount > lastOrderCount) {
        const newOrdersCount = currentCount - lastOrderCount;
        const latestOrder = orders[0];
        
        // Update Dashboard
        loadDashboard();
        
        // Show Notifications
        showToast(`New Order Received!`, `Order #${latestOrder.id} for ₹${latestOrder.amount.toFixed(2)}`);
        
        // Browser Notification
        if (Notification.permission === 'granted') {
            new Notification('New QuickKart Order!', {
                body: `Order #${latestOrder.id} received for ₹${latestOrder.amount.toFixed(2)}`,
                icon: '/javascript.svg'
            });
        }
        
        lastOrderCount = currentCount;
    }
}

function showToast(title, message) {
    const toast = document.createElement('div');
    toast.className = 'notification-toast';
    toast.innerHTML = `
        <div class="notification-icon">🔔</div>
        <div class="notification-content">
            <div class="notification-title">${title}</div>
            <div class="notification-msg">${message}</div>
        </div>
    `;
    document.body.appendChild(toast);
    
    // Trigger animation
    setTimeout(() => toast.classList.add('show'), 100);
    
    // Remove after 5 seconds
    setTimeout(() => {
        toast.classList.remove('show');
        setTimeout(() => document.body.removeChild(toast), 300);
    }, 5000);
}

function loadDashboard() {
    const orders = JSON.parse(localStorage.getItem('quickkart_orders') || '[]');
    renderStats(orders);
    renderTable(orders);
}

function renderStats(orders) {
    const totalOrders = orders.length;
    const totalRevenue = orders.reduce((sum, order) => sum + order.amount, 0);
    
    // Check for today's orders
    const today = new Date().toLocaleDateString();
    const todayOrders = orders.filter(order => new Date(order.date).toLocaleDateString() === today).length;

    document.getElementById('totalOrders').textContent = totalOrders;
    document.getElementById('totalRevenue').textContent = '₹' + totalRevenue.toFixed(2);
    document.getElementById('todayOrders').textContent = todayOrders;
}

function renderTable(orders) {
    const tbody = document.getElementById('ordersBody');
    tbody.innerHTML = '';

    if (orders.length === 0) {
        tbody.innerHTML = '<tr><td colspan="7" style="text-align: center; padding: 40px; color: var(--text-light);">No orders found</td></tr>';
        return;
    }

    orders.forEach(order => {
        const date = new Date(order.date).toLocaleString();
        const itemCount = order.items.reduce((sum, item) => sum + item.quantity, 0);
        const status = order.status || 'Confirmed';
        
        let statusColor = '#dcfce7';
        let statusTextColor = '#16a34a';
        

        if(status === 'Pending') { statusColor = '#fef9c3'; statusTextColor = '#854d0e'; }
        if(status === 'Shipped') { statusColor = '#dbeafe'; statusTextColor = '#1e40af'; }
        if(status === 'Delivered') { statusColor = '#dcfce7'; statusTextColor = '#16a34a'; }
        if(status === 'Cancelled') { statusColor = '#fee2e2'; statusTextColor = '#991b1b'; }

        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td style="font-family: monospace; font-weight: 600;">${order.id}</td>
            <td>${date}</td>
            <td>${itemCount} items</td>
            <td style="font-weight: 600;">₹${order.amount.toFixed(2)}</td>
            <td>${order.paymentMethod || 'UPI'}</td>
            <td><span class="status-badge" style="background: ${statusColor}; color: ${statusTextColor};">${status}</span></td>
            <td>
                <button class="view-btn" data-id="${order.id}">Edit / Verify</button>
                <button class="delete-btn-table" data-id="${order.id}" style="margin-left: 5px; padding: 6px 12px; background: #fee2e2; border: 1px solid #fca5a5; border-radius: 4px; color: #991b1b; cursor: pointer; font-size: 12px;">Delete</button>
            </td>
        `;
        tbody.appendChild(tr);
    });

    // Add event listeners to view buttons
    document.querySelectorAll('.view-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const orderId = e.target.dataset.id;
            showOrderDetails(orders.find(o => o.id === orderId));
        });
    });

    // Add event listeners to delete buttons
    document.querySelectorAll('.delete-btn-table').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const orderId = e.target.dataset.id;
            if(confirm(`Are you sure you want to delete Order #${orderId}?`)) {
                deleteOrder(orderId);
            }
        });
    });
}

function showOrderDetails(order) {
    if (!order) return;
    
    const modalBody = document.getElementById('modalBody');
    const currentStatus = order.status || 'Confirmed';

    modalBody.innerHTML = `
        <div style="margin-bottom: 20px; border-bottom: 1px solid var(--border); padding-bottom: 10px;">
            <div style="display: flex; justify-content: space-between; align-items: start;">
                <div>
                    <div style="font-size: 14px; color: var(--text-light);">Order ID</div>
                    <div style="font-weight: 600; font-size: 18px;">${order.id}</div>
                    <div style="font-size: 14px; color: var(--text-light); margin-top: 4px;">${new Date(order.date).toLocaleString()}</div>
                </div>
                
                <!-- Status Editor -->
                <div style="text-align: right;">
                    <label style="font-size: 12px; color: var(--text-light); display: block; margin-bottom: 4px;">Order Status</label>
                    <div style="display: flex; gap: 8px;">
                        <select id="statusSelect" style="padding: 6px; border: 1px solid var(--border); border-radius: 4px;">

                            <option value="Confirmed" ${currentStatus === 'Confirmed' ? 'selected' : ''}>Confirmed</option>
                            <option value="Processing" ${currentStatus === 'Processing' ? 'selected' : ''}>Processing</option>
                            <option value="Shipped" ${currentStatus === 'Shipped' ? 'selected' : ''}>Shipped</option>
                            <option value="Delivered" ${currentStatus === 'Delivered' ? 'selected' : ''}>Delivered</option>
                            <option value="Cancelled" ${currentStatus === 'Cancelled' ? 'selected' : ''}>Cancelled</option>
                        </select>
                        <button id="saveStatusBtn" style="padding: 6px 12px; background: var(--primary); color: white; border: none; border-radius: 4px; cursor: pointer;">Save</button>
                    </div>
                </div>
            </div>
        </div>


        
        <h3 style="font-size: 16px; margin-bottom: 12px;">Items</h3>
        <div style="display: flex; flex-direction: column; gap: 12px; margin-bottom: 20px;">
            ${order.items.map(item => `
                <div style="display: flex; gap: 12px; align-items: start;">
                    <img src="${item.src}" style="width: 50px; height: 50px; object-fit: cover; border-radius: 4px; background: #eee;">
                    <div style="flex: 1;">
                        <div style="font-weight: 500;">${item.name}</div>
                        <div style="font-size: 12px; color: var(--text-light);">${item.unit}</div>
                        <div style="font-size: 13px;">Qty: ${item.quantity} × ₹${item.discount_price}</div>
                    </div>
                    <div style="font-weight: 600;">₹${(item.quantity * item.discount_price).toFixed(2)}</div>
                </div>
            `).join('')}
        </div>
        
        <div style="border-top: 1px solid var(--border); padding-top: 16px;">
            <div style="display: flex; justify-content: space-between; margin-bottom: 8px;">
                <span>Subtotal</span>
                <span>₹${(order.amount / 1.18).toFixed(2)}</span>
            </div>
            <div style="display: flex; justify-content: space-between; margin-bottom: 12px;">
                <span>Tax (18%)</span>
                <span>₹${(order.amount - (order.amount / 1.18)).toFixed(2)}</span>
            </div>
            <div style="display: flex; justify-content: space-between; font-weight: 700; font-size: 18px; color: var(--primary);">
                <span>Total Amount</span>
                <span>₹${order.amount.toFixed(2)}</span>
            </div>
        </div>
        
        <div style="margin-top: 20px; padding-top: 20px; border-top: 1px solid var(--border); text-align: right;">
             <button id="deleteOrderBtn" style="padding: 8px 16px; background: #fee2e2; color: #991b1b; border: none; border-radius: 4px; cursor: pointer;">Delete Order</button>
        </div>
    `;
    
    document.getElementById('orderModal').style.display = 'flex';

    // Event Listeners for Edit Actions
    document.getElementById('saveStatusBtn').addEventListener('click', () => {
        const newStatus = document.getElementById('statusSelect').value;
        updateOrderStatus(order.id, newStatus);
    });

    document.getElementById('deleteOrderBtn').addEventListener('click', () => {
        if(confirm('Are you sure you want to delete this order?')) {
            deleteOrder(order.id);
        }
    });
}

function updateOrderStatus(orderId, newStatus) {
    const orders = JSON.parse(localStorage.getItem('quickkart_orders') || '[]');
    const orderIndex = orders.findIndex(o => o.id === orderId);
    
    if (orderIndex !== -1) {
        orders[orderIndex].status = newStatus;
        localStorage.setItem('quickkart_orders', JSON.stringify(orders));
        loadDashboard();
        showToast('Status Updated', `Order #${orderId} marked as ${newStatus}`);
        document.getElementById('orderModal').style.display = 'none';
    }
}

function deleteOrder(orderId) {
    let orders = JSON.parse(localStorage.getItem('quickkart_orders') || '[]');
    orders = orders.filter(o => o.id !== orderId);
    localStorage.setItem('quickkart_orders', JSON.stringify(orders));
    
    loadDashboard();
    showToast('Order Deleted', `Order #${orderId} has been removed`);
    document.getElementById('orderModal').style.display = 'none';
}
