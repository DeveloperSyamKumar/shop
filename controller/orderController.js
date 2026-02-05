export const saveOrder = (order) => {
    const orders = JSON.parse(localStorage.getItem('quickkart_orders') || '[]');
    orders.unshift(order); // Add new order to top
    localStorage.setItem('quickkart_orders', JSON.stringify(orders));
};
