
import { Controller } from "../controller/controller";
import { CartView } from "./cartView/cartView";
// import { AddSubButton } from "./addandSubButton";
export class ContainerView{
    constructor(data){
        this.data = data;
        this.itemList = document.querySelector(".item-list")
        this.typeList = document.querySelector(".type-list")
        this.sectionTitle = document.getElementById('sectionTitle')
        this.cartCount = document.getElementById('cartCount')
        this.controller =  new Controller(this.data)
        this.elementList = this.controller.categories(this.data);
        this.cartView = new CartView(this.data);
        this.setupTheme();
        this.setupSearch();
        this.setupCartModal();
    }
    init(){
        this.renderItems(this.data);
        this.renderCategories(this.elementList);    
        
    }

    renderItems(data){
        this.itemList.innerHTML = ""
        data.forEach(element => {
        const itemDiv = document.createElement("div");                        
        itemDiv.classList.add("itemName");  
        itemDiv.innerHTML = `
            <div class="product-image-container">
                <img class="itemImage" src="${element.src}" alt="${element.name}">
                <div class="discount-badge">${Math.round((element.price - element.discount_price) / element.price * 100)}% OFF</div>
            </div>
            <div class="product-content">
                <div class="product-info">
                    <h3 class="product-title">${element.name}</h3>
                    <p class="product-unit">${element.unit}</p>
                    <div class="price-section">
                        <span class="current-price">₹${element.discount_price}</span>
                        <span class="original-price">₹${element.price}</span>
                    </div>
                </div>
                <div class="product-actions">
                    ${element.quantity === 0 ? 
                        `<button class="add-btn">Add</button>` :
                        `<div class="quantity-controls">
                            <button class="qty-btn subtract">−</button>
                            <span class="quantity-display">${element.quantity}</span>
                            <button class="qty-btn add">+</button>
                        </div>`
                    }
                </div>
            </div>
        `;
                                
        this.itemList.appendChild(itemDiv)                    
        this.bindEventOnItem(itemDiv,element);          
       });
       this.addButtonFunction(data);
       this.updateCartCount();
    } 
      
    renderCategories(data){
        // Add "All" category at the beginning
        const allCategory = document.createElement("div");
        allCategory.classList.add("typeName", "active");
        allCategory.innerHTML = `🛒 All`;
        this.typeList.appendChild(allCategory);
        this.bindEventOnCategory(allCategory, "All");
        
        // Add category icons
        const categoryIcons = {
            'Fresh Fruits': '🍎',
            'Fresh Vegetables': '🥕', 
            'leafy Herbs': '🌿',
            'Flowers': '🌸',
            'Exotic': '🥒',
            'Kitchen': '🥛',
            'House Hold': '🧽'
        };
        
        data.forEach((value)=>{
            const typeName = document.createElement("div");                    
            typeName.classList.add("typeName");
            const icon = categoryIcons[value] || '📦';
            typeName.innerHTML = `${icon} ${value}`;                                
            this.typeList.appendChild(typeName);        
            this.bindEventOnCategory(typeName, value);
        })
    }  

    bindEventOnItem(itemDiv,element){  
        const imageContainer = itemDiv.querySelector(".product-image-container");
        imageContainer.addEventListener("click",() =>{
                this.popUpDescription(element); 
                });  
    }

    popUpDescription(element) {
        // Create modal overlay
        const overlay = document.createElement("div");
        overlay.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background: rgba(0,0,0,0.5);
            z-index: 1000;
            display: flex;
            align-items: center;
            justify-content: center;
            padding: 16px;
        `;
        
        const itemDetails = document.createElement("div");
        itemDetails.id = "itemDetails";
        itemDetails.innerHTML = `
            <img src="${element.src}" alt="${element.name}">
            <div>
                <h3>${element.name}</h3>
                <div>Price: ₹${element.discount_price} / ${element.unit}</div>
                <div>MRP: ₹${element.price} / ${element.unit}</div>
                <div>${Math.round((element.price - element.discount_price) / element.price * 100)}% Off</div>
                <div>Country of Origin: ${element.countryoforigin}</div>
                <div class="addClass" style="margin-top: 16px;">
                    ${element.quantity === 0 ? 
                        `<div class="add">Add to Cart</div>` :
                        `<div class="quantityDiv">
                            <div class="subtract">-</div>
                            <div class="quantity">${element.quantity}</div>
                            <div class="add">+</div>
                        </div>`
                    }
                </div>
            </div>
        `;
        
        overlay.appendChild(itemDetails);
        document.body.appendChild(overlay);
        
        // Close on overlay click
        overlay.addEventListener('click', (e) => {
            if (e.target === overlay) {
                document.body.removeChild(overlay);
                this.renderItems(this.data);
            }
        });
        
        this.addButtonFunction([element]);
    }

    bindEventOnCategory(typeName, categoryName){
        typeName.addEventListener("click", (event)=> {   
            // Remove active class from all categories
            document.querySelectorAll('.typeName').forEach(cat => cat.classList.remove('active'));
            // Add active class to clicked category
            typeName.classList.add('active');
            
            // Update section title
            this.sectionTitle.textContent = categoryName === 'All' ? 'All Products' : categoryName;
            
            const filteredData = categoryName === 'All' ? this.data : this.controller.filterItems(categoryName);
            this.renderItems(filteredData); 
        });               
      } 
    
      addButtonFunction(data) {
        const addButtonList = document.querySelectorAll(".add, .add-btn");
        addButtonList.forEach((addButton) => {
            addButton.addEventListener("click", () => {
                const itemName = addButton.closest(".itemName").querySelector(".product-title").textContent;
                const selectedItem = Array.isArray(data) ? 
                    data.find(item => item.name === itemName) :
                    this.data.find(item => item.name === itemName);
                
                if (selectedItem) {
                    selectedItem.quantity = (selectedItem.quantity || 0) + 1;
                    this.updateCartCount();
                    
                    // Check if we're in popup mode
                    if (document.getElementById('itemDetails')) {
                        // Update popup
                        const popup = document.getElementById('itemDetails');
                        const quantityDiv = popup.querySelector('.addClass');
                        quantityDiv.innerHTML = `
                            <div class="quantityDiv">
                                <div class="subtract">-</div>
                                <div class="quantity">${selectedItem.quantity}</div>
                                <div class="add">+</div>
                            </div>
                        `;
                        this.addButtonFunction([selectedItem]);
                        this.quantityManager([selectedItem]);
                    } else {
                        // Update main view
                        this.renderItems(this.data);
                        this.quantityManager(this.data);
                    }
                }
            });
        });
        return data;
    }
    quantityManager(data) {
        const quantityControls = document.querySelectorAll(".quantity-controls, .quantityDiv");
        
        quantityControls.forEach((control) => {
            const addButton = control.querySelector(".add, .qty-btn:last-child");
            const subButton = control.querySelector(".subtract, .qty-btn:first-child");
            const quantity = control.querySelector(".quantity, .quantity-display");
            const itemName = control.closest(".itemName").querySelector(".product-title, h3").textContent;
    
            if (subButton) {
                subButton.addEventListener("click", () => {
                    const selectedItem = data.find(item => item.name === itemName);
                    
                    if (selectedItem && selectedItem.quantity > 0) {
                        selectedItem.quantity -= 1;
                        this.updateCartCount();
                        if (selectedItem.quantity < 1) {
                            this.renderItems(this.data);
                        } else {
                            quantity.textContent = selectedItem.quantity;
                        }
                    }
                });
            }
        });
    }
    
    updateCartCount() {
        const totalItems = this.data.reduce((sum, item) => sum + (item.quantity || 0), 0);
        this.cartCount.textContent = totalItems;
        this.cartCount.style.display = totalItems > 0 ? 'flex' : 'none';
    }
    
    setupTheme() {
        const themeToggle = document.getElementById('themeToggle');
        const savedTheme = localStorage.getItem('quickkart-theme');
        const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
        const theme = savedTheme || (prefersDark ? 'dark' : 'light');
        document.documentElement.setAttribute('data-theme', theme);
        
        themeToggle.addEventListener('click', () => {
            const currentTheme = document.documentElement.getAttribute('data-theme');
            const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
            document.documentElement.setAttribute('data-theme', newTheme);
            localStorage.setItem('quickkart-theme', newTheme);
        });
    }
    
    setupSearch() {
        const searchInput = document.getElementById('searchInput');
        searchInput.addEventListener('input', (e) => {
            const query = e.target.value.toLowerCase();
            if (query.trim()) {
                const filteredData = this.data.filter(item => 
                    item.name.toLowerCase().includes(query) ||
                    item.type.toLowerCase().includes(query)
                );
                this.sectionTitle.textContent = `Search: "${e.target.value}"`;
                this.renderItems(filteredData);
            } else {
                this.sectionTitle.textContent = 'All Products';
                this.renderItems(this.data);
            }
        });
    }
    
    setupCartModal() {
        const cartButton = document.getElementById('cartButton');
        const cartModal = document.getElementById('cartModal');
        const closeCart = document.getElementById('closeCart');
        
        cartButton.addEventListener('click', () => {
            this.openCartModal();
        });
        
        closeCart.addEventListener('click', () => {
            cartModal.style.display = 'none';
        });
        
        cartModal.addEventListener('click', (e) => {
            if (e.target === cartModal) {
                cartModal.style.display = 'none';
            }
        });
    }
    
    openCartModal() {
        const cartItems = this.data.filter(item => item.quantity > 0);
        const cartItemsContainer = document.getElementById('cartItems');
        const cartFooter = document.getElementById('cartFooter');
        const cartModal = document.getElementById('cartModal');
        
        if (cartItems.length === 0) {
            cartItemsContainer.innerHTML = `
                <div class="empty-cart">
                    <div class="empty-cart-icon">🛒</div>
                    <p>Your cart is empty</p>
                </div>
            `;
            cartFooter.innerHTML = '';
        } else {
            cartItemsContainer.innerHTML = cartItems.map(item => `
                <div class="cart-item">
                    <img src="${item.src}" alt="${item.name}" class="cart-item-image">
                    <div class="cart-item-info">
                        <div class="cart-item-name">${item.name}</div>
                        <div class="cart-item-details">${item.unit}</div>
                        <div class="cart-item-price">₹${item.discount_price} × ${item.quantity}</div>
                    </div>
                    <div class="quantityDiv">
                        <div class="subtract" data-name="${item.name}">-</div>
                        <div class="quantity">${item.quantity}</div>
                        <div class="add" data-name="${item.name}">+</div>
                    </div>
                </div>
            `).join('');
            
            const subtotal = cartItems.reduce((sum, item) => sum + (item.discount_price * item.quantity), 0);
            const tax = subtotal * 0.18;
            const total = subtotal + tax;
            
            cartFooter.innerHTML = `
                <div class="total-row">
                    <span>Subtotal:</span>
                    <span>₹${subtotal.toFixed(2)}</span>
                </div>
                <div class="total-row">
                    <span>Tax (18%):</span>
                    <span>₹${tax.toFixed(2)}</span>
                </div>
                <div class="total-row final">
                    <span>Total:</span>
                    <span>₹${total.toFixed(2)}</span>
                </div>
                <button class="checkout-button">Proceed to Payment</button>
            `;

            // Checkout button event listener
            const checkoutBtn = cartFooter.querySelector('.checkout-button');
            checkoutBtn.addEventListener('click', () => {
                this.showPaymentGateway(total);
            });
            
            // Add event listeners for cart quantity controls
            cartItemsContainer.querySelectorAll('.subtract, .add').forEach(btn => {
                btn.addEventListener('click', (e) => {
                    const itemName = e.target.dataset.name;
                    const item = this.data.find(i => i.name === itemName);
                    if (item) {
                        if (e.target.classList.contains('subtract')) {
                            item.quantity = Math.max(0, item.quantity - 1);
                        } else {
                            item.quantity += 1;
                        }
                        this.updateCartCount();
                        this.renderItems(this.data); // Update main screen
                        this.openCartModal(); // Refresh cart display
                    }
                });
            });
        }
        
        cartModal.style.display = 'flex';
    }
    showPaymentGateway(totalAmount) {
        const paymentModal = document.createElement("div");
        paymentModal.className = "cart-modal";
        paymentModal.style.display = "flex";
        paymentModal.style.zIndex = "1001"; 
        
        // UPI Intent Links
        // Note: Specific schemes (tez://, phonepe://) work best on mobile. 
        // We use a fallback to generic upi:// if specific ones fail or for 'Other'.
        const upiBase = `upi://pay?pa=gorlisyam111@ybl&pn=SatyakiranaStore&am=${totalAmount.toFixed(2)}&cu=INR`;
        
        const renderPaymentOptions = () => `
            <div class="cart-content" style="max-height: 80vh; height: auto;">
                <div class="cart-header">
                    <h2 class="cart-title">Select Payment App</h2>
                    <button class="close-button">&times;</button>
                </div>
                <div class="cart-items" style="display: flex; flex-direction: column; gap: 20px; text-align: center;">
                    <div style="font-size: 1.2rem; font-weight: bold; margin-bottom: 10px;">Pay ₹${totalAmount.toFixed(2)}</div>
                    
                    <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 16px;">
                        <a href="${upiBase}" class="pay-app-btn" data-app="GPay" style="text-decoration: none;">
                            <div style="background: #fff; border: 1px solid #e5e7eb; border-radius: 12px; padding: 16px; display: flex; flex-direction: column; align-items: center; gap: 8px; transition: all 0.2s;">
                                <div style="font-size: 24px;">🔵</div>
                                <span style="color: var(--text); font-weight: 600; font-size: 14px;">Google Pay</span>
                            </div>
                        </a>
                        <a href="${upiBase}" class="pay-app-btn" data-app="PhonePe" style="text-decoration: none;">
                            <div style="background: #fff; border: 1px solid #e5e7eb; border-radius: 12px; padding: 16px; display: flex; flex-direction: column; align-items: center; gap: 8px; transition: all 0.2s;">
                                <div style="font-size: 24px;">🟣</div>
                                <span style="color: var(--text); font-weight: 600; font-size: 14px;">PhonePe</span>
                            </div>
                        </a>
                         <a href="${upiBase}" class="pay-app-btn" data-app="Paytm" style="text-decoration: none;">
                            <div style="background: #fff; border: 1px solid #e5e7eb; border-radius: 12px; padding: 16px; display: flex; flex-direction: column; align-items: center; gap: 8px; transition: all 0.2s;">
                                <div style="font-size: 24px;">💠</div>
                                <span style="color: var(--text); font-weight: 600; font-size: 14px;">Paytm</span>
                            </div>
                        </a>
                         <a href="${upiBase}" class="pay-app-btn" data-app="UPI" style="text-decoration: none;">
                            <div style="background: #fff; border: 1px solid #e5e7eb; border-radius: 12px; padding: 16px; display: flex; flex-direction: column; align-items: center; gap: 8px; transition: all 0.2s;">
                                <div style="font-size: 24px;">📲</div>
                                <span style="color: var(--text); font-weight: 600; font-size: 14px;">Any UPI App</span>
                            </div>
                        </a>
                    </div>

                    <div style="margin-top: 10px; font-size: 12px; color: var(--text-light);">
                        Redirecting to secure payment...
                    </div>
                </div>
                <div class="cart-footer">
                    <button class="checkout-button" id="cancelPayment" style="background: #ef4444;">Cancel Transaction</button>
                </div>
            </div>
        `;

        const renderVerification = () => `
             <div class="cart-content" style="max-height: 80vh; height: auto; text-align: center;">
                <div class="cart-items" style="display: flex; flex-direction: column; gap: 24px; padding: 40px 20px;">
                    <div style="font-size: 40px;">🛡️</div>
                    <div>
                        <h2 style="font-size: 20px; margin-bottom: 8px;">Verify Payment</h2>
                        <p style="color: var(--text-light); font-size: 14px;">To prevent fraud, please enter the 12-digit <br><strong>UTR / API Reference No.</strong> from your UPI App.</p>
                    </div>
                    
                    <div style="text-align: left;">
                        <label style="font-size: 12px; font-weight: 600; color: var(--text-light); margin-bottom: 8px; display: block;">Enter Transaction/UTR Number</label>
                        <input type="text" id="utrInput" placeholder="e.g. 304512345678" maxlength="12" 
                            style="width: 100%; padding: 12px; border: 1px solid var(--border); border-radius: 8px; font-size: 16px; outline: none;">
                        <p id="utrError" style="color: #ef4444; font-size: 12px; margin-top: 4px; display: none;">Please enter a valid 12-digit UTR number</p>
                    </div>

                    <div style="display: flex; flex-direction: column; gap: 12px;">
                        <button class="checkout-button" id="submitUtrBtn" style="background: #10b981; opacity: 0.7; pointer-events: none;">Verify & Place Order</button>
                        <button class="checkout-button" id="retryPayment" style="background: var(--bg); color: var(--text); border: 1px solid var(--border);">Back to Payment Options</button>
                    </div>
                </div>
            </div>
        `;

        paymentModal.innerHTML = renderPaymentOptions();
        document.body.appendChild(paymentModal);

        // Hover Effect specific to this modal
        const addHoverEffects = () => {
            paymentModal.querySelectorAll('.pay-app-btn div').forEach(div => {
                div.addEventListener('mouseenter', () => {
                    div.style.borderColor = 'var(--primary)';
                    div.style.background = 'var(--bg-light)';
                    div.style.transform = 'translateY(-2px)';
                });
                div.addEventListener('mouseleave', () => {
                    div.style.borderColor = '#e5e7eb';
                    div.style.background = '#fff';
                    div.style.transform = 'none';
                });
            });
        };
        addHoverEffects();

        // Handlers
        const setupHandlers = () => {
            // Close
            const closeBtn = paymentModal.querySelector('.close-button');
            const cancelBtn = paymentModal.querySelector('#cancelPayment');
            
            const closePayment = () => {
                document.body.removeChild(paymentModal);
            };

            if(closeBtn) closeBtn.addEventListener('click', closePayment);
            if(cancelBtn) cancelBtn.addEventListener('click', closePayment);

            // Verify Flow
            paymentModal.querySelectorAll('.pay-app-btn').forEach(btn => {
                btn.addEventListener('click', () => {
                    // Wait a moment for the user to "leave", then show verification screen
                    setTimeout(() => {
                        paymentModal.innerHTML = renderVerification();
                        
                        // UTR Validation Logic
                        const utrInput = paymentModal.querySelector('#utrInput');
                        const submitBtn = paymentModal.querySelector('#submitUtrBtn');
                        const errorMsg = paymentModal.querySelector('#utrError');

                        utrInput.addEventListener('input', (e) => {
                            const value = e.target.value.replace(/[^0-9]/g, ''); // Only numbers
                            e.target.value = value;
                            
                            if (value.length === 12) {
                                submitBtn.style.opacity = '1';
                                submitBtn.style.pointerEvents = 'auto';
                                errorMsg.style.display = 'none';
                            } else {
                                submitBtn.style.opacity = '0.7';
                                submitBtn.style.pointerEvents = 'none';
                            }
                        });

                        // Submit Handler with Simulation
                        submitBtn.addEventListener('click', () => {
                           const utrNumber = utrInput.value;
                           if(utrNumber.length === 12) {
                               // Show Simulating Loading
                               paymentModal.innerHTML = `
                                    <div class="cart-content" style="max-height: 80vh; height: auto; text-align: center; padding: 40px;">
                                        <div class="spinner" style="
                                            border: 4px solid #f3f3f3; 
                                            border-top: 4px solid var(--primary); 
                                            border-radius: 50%; 
                                            width: 40px; 
                                            height: 40px; 
                                            animation: spin 1s linear infinite; 
                                            margin: 0 auto 20px;"></div>
                                        <h2 style="font-size: 20px; margin-bottom: 8px;">Verifying Transaction...</h2>
                                        <p style="color: var(--text-light);">Connecting to Bank Server...</p>
                                    </div>
                                    <style>@keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }</style>
                               `;

                               // Simulate Delay
                               setTimeout(() => {
                                    handleSuccess(utrNumber);
                               }, 2500);

                           } else {
                               errorMsg.style.display = 'block';
                           }
                        });
                        
                        paymentModal.querySelector('#retryPayment').addEventListener('click', () => {
                            paymentModal.innerHTML = renderPaymentOptions();
                            addHoverEffects();
                            setupHandlers();
                        });

                    }, 2000);
                });
            });
        };

        const handleSuccess = (utrNumber) => {
            const orderId = 'ORD' + Math.floor(Math.random() * 1000000).toString().padStart(6, '0');
            
            // Create Order Object (Same as before)
            const order = {
                id: orderId,
                date: new Date().toISOString(),
                amount: totalAmount,
                items: this.data.filter(item => item.quantity > 0).map(item => ({
                    name: item.name,
                    quantity: item.quantity,
                    price: item.price,
                    discount_price: item.discount_price,
                    unit: item.unit,
                    src: item.src
                })),
                paymentMethod: 'UPI',
                paymentUTR: utrNumber,
                status: 'Confirmed' // Auto-verified
            };

            // Save Order logic
            try {
                const orders = JSON.parse(localStorage.getItem('quickkart_orders') || '[]');
                orders.unshift(order);
                localStorage.setItem('quickkart_orders', JSON.stringify(orders));
            } catch (e) { console.error(e); }

            document.body.removeChild(paymentModal);
            this.showOrderSuccess(totalAmount, orderId);
            
            // Clear cart logic
            this.data.forEach(item => item.quantity = 0);
            this.updateCartCount();
            this.renderItems(this.data);
            document.getElementById('cartModal').style.display = 'none'; 
        };

        setupHandlers();
    }

    showOrderSuccess(totalAmount, orderId) {
        const successModal = document.createElement("div");
        successModal.className = "cart-modal";
        successModal.style.display = "flex";
        successModal.style.zIndex = "1002"; // Highest z-index
        
        const successModalId = 'ORD' + Math.floor(Math.random() * 1000000).toString().padStart(6, '0');
        // If orderId is passed, use it, otherwise generate one (fallback)
        const displayOrderId = orderId || successModalId;
        
        successModal.innerHTML = `
            <div class="cart-content" style="max-width: 400px; text-align: center; padding: 40px 20px;">
                <div style="width: 80px; height: 80px; background: #dcfce7; color: #16a34a; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 40px; margin: 0 auto 20px;">
                    ✓
                </div>
                <h2 style="font-size: 24px; font-weight: 700; margin-bottom: 10px; color: var(--text);">Order Confirmed!</h2>
                <p style="color: var(--text-light); margin-bottom: 20px;">Thank you for your purchase.</p>
                
                <div style="background: var(--bg-light); padding: 16px; border-radius: 8px; margin-bottom: 24px; text-align: left;">
                    <div style="display: flex; justify-content: space-between; margin-bottom: 8px;">
                        <span style="color: var(--text-light);">Order ID:</span>
                        <span style="font-weight: 600;">#${displayOrderId}</span>
                    </div>
                    <div style="display: flex; justify-content: space-between;">
                        <span style="color: var(--text-light);">Amount Paid:</span>
                        <span style="font-weight: 600; color: var(--primary);">₹${totalAmount.toFixed(2)}</span>
                    </div>
                </div>
                
                <button class="checkout-button" id="continueShopping">Continue Shopping</button>
            </div>
        `;

        document.body.appendChild(successModal);

        const continueBtn = successModal.querySelector('#continueShopping');
        continueBtn.addEventListener('click', () => {
            document.body.removeChild(successModal);
            document.getElementById('cartModal').style.display = 'none';
        });
    }
}