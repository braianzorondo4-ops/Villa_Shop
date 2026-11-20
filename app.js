const DEFAULT_PRODUCTS = [
  { id: "taza-calma", name: "Taza Calma", category: "Hogar", price: 129000, original_price: null, emoji: "☕", color: "#392e12", badge: "Más vendido", description: "Una taza especial para disfrutar tus momentos de pausa.", image_url: "https://images.unsplash.com/photo-1514228742587-6b1558fcca3d?auto=format&fit=crop&w=800&q=85" },
  { id: "vela-botanica", name: "Vela Botánica", category: "Hogar", price: 89000, original_price: 109000, emoji: "🕯️", color: "#8a6c22", badge: "Oferta", description: "Aroma suave y luz cálida para acompañar tus tardes.", image_url: "https://images.unsplash.com/photo-1603006905003-be475563bc59?auto=format&fit=crop&w=800&q=85" },
  { id: "cuaderno-ideas", name: "Cuaderno de ideas", category: "Papelería", price: 76000, original_price: null, emoji: "📔", color: "#211c11", badge: "", description: "Un espacio para tus listas, planes e ideas nuevas.", image_url: "https://images.unsplash.com/photo-1544816155-12df9643f363?auto=format&fit=crop&w=800&q=85" },
  { id: "bolso-nube", name: "Bolso Nube", category: "Accesorios", price: 189000, original_price: 229000, emoji: "👜", color: "#6d531b", badge: "Oferta", description: "Liviano y práctico para acompañarte todos los días.", image_url: "https://images.unsplash.com/photo-1553062407-98eeb64c6a62?auto=format&fit=crop&w=800&q=85" },
  { id: "set-pausa", name: "Set Pausa", category: "Bienestar", price: 155000, original_price: null, emoji: "🌿", color: "#30260f", badge: "", description: "Un pequeño ritual para regalarte un momento de calma.", image_url: "https://images.unsplash.com/photo-1611930022073-b7a4ba5fcccd?auto=format&fit=crop&w=800&q=85" },
  { id: "botella-dia", name: "Botella de todos los días", category: "Accesorios", price: 112000, original_price: null, emoji: "🧴", color: "#a17c20", badge: "", description: "Tu compañera práctica para hidratarte donde estés.", image_url: "https://images.unsplash.com/photo-1602143407151-7111542de6e8?auto=format&fit=crop&w=800&q=85" },
  { id: "florero-sol", name: "Florero Sol", category: "Hogar", price: 143000, original_price: null, emoji: "🏺", color: "#332910", badge: "Favorito", description: "Un detalle cálido para darle vida a cualquier rincón.", image_url: "https://images.unsplash.com/photo-1578500494198-246f612d3b3d?auto=format&fit=crop&w=800&q=85" },
  { id: "kit-creativo", name: "Kit creativo", category: "Papelería", price: 78000, original_price: 98000, emoji: "🎨", color: "#72571c", badge: "Oferta", description: "Todo lo necesario para dejar volar la imaginación.", image_url: "https://images.unsplash.com/photo-1513364776144-60967b0f800f?auto=format&fit=crop&w=800&q=85" }
];

const STORAGE_KEYS = { cart: "villa-shop-cart" };
const storeSettings = window.VILLA_SHOP_SETTINGS || {};
const whatsappPhone = String(storeSettings.whatsappPhone || "").replace(/\D/g, "");
const supabaseConfig = window.VILLA_SHOP_SUPABASE || {};
const supabaseClient = window.supabase?.createClient && supabaseConfig.url && supabaseConfig.anonKey
  ? window.supabase.createClient(supabaseConfig.url, supabaseConfig.anonKey)
  : null;
const productGrid = document.querySelector("#product-grid");
const cartDrawer = document.querySelector("#cart-drawer");
const overlay = document.querySelector("#overlay");
const checkoutDialog = document.querySelector("#checkout-dialog");
const toast = document.querySelector("#toast");
const catalogStatus = document.querySelector("#catalog-status");
let selectedCategory = "Todos";
let searchQuery = "";
let products = [...DEFAULT_PRODUCTS];
let cart = readStorage(STORAGE_KEYS.cart, []);
let catalogConnected = false;
let needsPriceMigration = false;
let toastTimer;

function readStorage(key, fallback) {
  try {
    const stored = JSON.parse(localStorage.getItem(key));
    return Array.isArray(stored) ? stored : fallback;
  } catch (error) {
    console.error(`No se pudo leer ${key} del almacenamiento local.`, error);
    return fallback;
  }
}

function saveStorage(key, value) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch (error) {
    console.error(`No se pudo guardar ${key} en el almacenamiento local.`, error);
    showToast("No pudimos guardar los cambios en este navegador.");
  }
}

function formatPrice(value) {
  return new Intl.NumberFormat(storeSettings.locale || "es-PY", {
    style: "currency",
    currency: storeSettings.currency || "PYG",
    maximumFractionDigits: 0
  }).format(value);
}

function escapeHTML(value) {
  return String(value).replace(/[&<>"']/g, (character) => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"
  })[character]);
}

function renderFilters() {
  const categories = ["Todos", ...new Set(products.map((product) => product.category))];
  document.querySelector("#category-filters").innerHTML = categories.map((category) => `
    <button class="filter-button ${category === selectedCategory ? "active" : ""}" type="button" data-category="${escapeHTML(category)}">${escapeHTML(category)}</button>
  `).join("");
}

function renderProducts() {
  const categoryProducts = selectedCategory === "Todos"
    ? products
    : products.filter((product) => product.category === selectedCategory);
  const query = searchQuery.trim().toLocaleLowerCase("es");
  const visibleProducts = query
    ? categoryProducts.filter((product) => `${product.name} ${product.category} ${product.description || ""}`.toLocaleLowerCase("es").includes(query))
    : categoryProducts;

  productGrid.innerHTML = renderProductCards(visibleProducts);
  const count = document.querySelector("#catalog-count");
  count.textContent = visibleProducts.length
    ? `${visibleProducts.length} ${visibleProducts.length === 1 ? "producto" : "productos"}`
    : "";
  if (!visibleProducts.length) {
    productGrid.innerHTML = `<div class="catalog-empty"><span aria-hidden="true">⌕</span><h3>No encontramos ese producto</h3><p>Probá con otro nombre o elegí una categoría diferente.</p><button class="text-button" type="button" id="clear-search">Limpiar búsqueda</button></div>`;
  }
  const offers = products.filter((product) => Number(product.original_price) > Number(product.price));
  document.querySelector("#offer-grid").innerHTML = renderProductCards(offers);
  document.querySelector("#ofertas").hidden = !offers.length;
}

function renderProductCards(items) {
  return items.map((product) => {
    const discount = Number(product.original_price) > Number(product.price)
      ? Math.round((1 - Number(product.price) / Number(product.original_price)) * 100)
      : 0;
    const imageUrl = safeImageUrl(product.image_url);
    const color = /^#[\da-f]{6}$/i.test(product.color) ? product.color : "#392e12";
    return `
      <article class="product-card">
        <div class="product-image" style="background:${color}">
          ${product.badge ? `<span class="product-badge">${escapeHTML(product.badge)}</span>` : ""}
          ${discount ? `<span class="discount-badge">-${discount}%</span>` : ""}
          ${imageUrl
            ? `<img class="product-photo" src="${escapeHTML(imageUrl)}" alt="${escapeHTML(product.name)}" loading="lazy">`
            : `<span class="art" role="img" aria-label="${escapeHTML(product.name)}">${escapeHTML(product.emoji || "✿")}</span>`}
          <button class="quick-add" type="button" data-add="${escapeHTML(product.id)}" aria-label="Agregar ${escapeHTML(product.name)} al carrito">+</button>
        </div>
        <div class="product-info">
          <p class="product-category">${escapeHTML(product.category)}</p>
          <h3 class="product-name">${escapeHTML(product.name)}</h3>
          ${product.description ? `<p class="product-description">${escapeHTML(product.description)}</p>` : ""}
          <div class="product-bottom">
            <span class="product-price">${formatPrice(product.price)}${discount ? `<del>${formatPrice(product.original_price)}</del>` : ""}</span>
            <span class="product-stock">Consultar disponibilidad</span>
          </div>
        </div>
      </article>
    `;
  }).join("");
}

function safeImageUrl(value) {
  if (!value) return "";
  try {
    const url = new URL(value);
    return ["https:", "http:"].includes(url.protocol) ? url.href : "";
  } catch (error) {
    return "";
  }
}

async function loadCatalog() {
  if (!supabaseClient) {
    catalogStatus.hidden = false;
    catalogStatus.textContent = "Vista previa del catálogo. Para consultar disponibilidad y coordinar tu compra, escribinos por WhatsApp.";
    renderFilters();
    renderProducts();
    return;
  }

  const { data, error } = await supabaseClient.from("products").select("*").order("name");
  if (error) {
    console.error("No se pudo cargar el catálogo de Supabase.", error);
    catalogStatus.hidden = false;
    catalogStatus.textContent = "No se pudo actualizar el catálogo en este momento. Mostramos una selección de ejemplo; consultá disponibilidad por WhatsApp.";
    renderFilters();
    renderProducts();
    return;
  }
  needsPriceMigration = false;
  products = (data || []).map((product) => {
    const normalized = window.normalizeVillaProductPrice?.(product) || product;
    if (normalized !== product) needsPriceMigration = true;
    return normalized;
  });
  catalogConnected = true;
  if (needsPriceMigration) {
    catalogConnected = false;
    catalogStatus.hidden = false;
    catalogStatus.textContent = "Actualizamos los precios de muestra a guaraníes en esta vista. La tienda está temporalmente en modo consulta: ejecutá supabase-pyg-migration.sql para habilitar pedidos.";
  } else {
    catalogStatus.hidden = true;
  }
  if (!products.some((product) => product.category === selectedCategory)) selectedCategory = "Todos";
  renderFilters();
  renderProducts();
  renderCart();
}

function cartQuantity() {
  return cart.reduce((total, item) => total + item.quantity, 0);
}

function cartTotal() {
  return cart.reduce((total, item) => {
    const product = products.find((entry) => entry.id === item.id);
    return total + (product ? product.price * item.quantity : 0);
  }, 0);
}

function renderCart() {
  cart = cart.filter((item) => products.some((product) => product.id === item.id) && Number.isInteger(item.quantity) && item.quantity > 0);
  document.querySelector("#cart-count").textContent = cartQuantity();
  document.querySelector("#drawer-count").textContent = `(${cartQuantity()})`;
  document.querySelector("#cart-subtotal").textContent = formatPrice(cartTotal());
  document.querySelector("#checkout-total").textContent = formatPrice(cartTotal());
  const empty = cart.length === 0;
  document.querySelector("#cart-empty").hidden = !empty;
  document.querySelector("#cart-footer").hidden = empty;
  document.querySelector("#cart-items").innerHTML = cart.map((item) => {
    const product = products.find((entry) => entry.id === item.id);
    const imageUrl = safeImageUrl(product.image_url);
    return `
      <div class="cart-item">
        <div class="cart-thumb" style="background:${/^#[\da-f]{6}$/i.test(product.color) ? product.color : "#392e12"}" aria-hidden="true">${imageUrl ? `<img src="${escapeHTML(imageUrl)}" alt="">` : escapeHTML(product.emoji || "✿")}</div>
        <div>
          <p class="cart-item-name">${escapeHTML(product.name)}</p>
          <span class="cart-item-price">${formatPrice(product.price)}</span>
          <div class="quantity-control">
            <button type="button" data-quantity="${product.id}" data-change="-1" aria-label="Quitar una unidad de ${escapeHTML(product.name)}">−</button>
            <span>${item.quantity}</span>
            <button type="button" data-quantity="${product.id}" data-change="1" aria-label="Agregar una unidad de ${escapeHTML(product.name)}">+</button>
          </div>
        </div>
        <button class="remove-item" type="button" data-remove="${product.id}" aria-label="Eliminar ${escapeHTML(product.name)}">×</button>
      </div>
    `;
  }).join("");
  saveStorage(STORAGE_KEYS.cart, cart);
}

function showToast(message) {
  toast.textContent = message;
  toast.classList.add("visible");
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => toast.classList.remove("visible"), 3400);
}

function openCart() {
  cartDrawer.classList.add("open");
  cartDrawer.setAttribute("aria-hidden", "false");
  cartDrawer.removeAttribute("inert");
  overlay.hidden = false;
  document.body.style.overflow = "hidden";
  document.querySelector("#cart-close").focus();
}

function closeCart() {
  cartDrawer.classList.remove("open");
  cartDrawer.setAttribute("aria-hidden", "true");
  cartDrawer.setAttribute("inert", "");
  overlay.hidden = true;
  document.body.style.overflow = "";
  document.querySelector("#cart-open").focus();
}

function addToCart(productId) {
  if (!products.some((product) => product.id === productId)) return;
  const item = cart.find((entry) => entry.id === productId);
  if (item) item.quantity += 1;
  else cart.push({ id: productId, quantity: 1 });
  renderCart();
  showToast("Agregado a tu bolsa.");
}

document.querySelector("#category-filters").addEventListener("click", (event) => {
  const button = event.target.closest("[data-category]");
  if (!button) return;
  selectedCategory = button.dataset.category;
  renderFilters();
  renderProducts();
});

document.querySelector("#product-search").addEventListener("input", (event) => {
  searchQuery = event.currentTarget.value;
  renderProducts();
});

productGrid.addEventListener("click", (event) => {
  if (event.target.closest("#clear-search")) {
    searchQuery = "";
    document.querySelector("#product-search").value = "";
    selectedCategory = "Todos";
    renderFilters();
    renderProducts();
    document.querySelector("#product-search").focus();
  }
});

function handleProductGridClick(event) {
  const button = event.target.closest("[data-add]");
  if (button) addToCart(button.dataset.add);
}

productGrid.addEventListener("click", handleProductGridClick);
document.querySelector("#offer-grid").addEventListener("click", handleProductGridClick);

document.querySelector("#cart-items").addEventListener("click", (event) => {
  const quantityButton = event.target.closest("[data-quantity]");
  const removeButton = event.target.closest("[data-remove]");
  if (quantityButton) {
    const item = cart.find((entry) => entry.id === quantityButton.dataset.quantity);
    if (item) item.quantity += Number(quantityButton.dataset.change);
    cart = cart.filter((entry) => entry.quantity > 0);
    renderCart();
  }
  if (removeButton) {
    cart = cart.filter((item) => item.id !== removeButton.dataset.remove);
    renderCart();
  }
});

document.querySelector("#cart-open").addEventListener("click", openCart);
document.querySelector("#cart-close").addEventListener("click", closeCart);
overlay.addEventListener("click", closeCart);
document.addEventListener("keydown", (event) => {
  if (event.key === "Escape" && cartDrawer.classList.contains("open")) closeCart();
});

document.querySelector("#checkout-open").addEventListener("click", () => {
  if (!cart.length) return;
  checkoutDialog.showModal();
});
document.querySelector("#checkout-close").addEventListener("click", () => checkoutDialog.close());

document.querySelector("#checkout-form").addEventListener("submit", async (event) => {
  event.preventDefault();
  const form = event.currentTarget;
  if (!cart.length) {
    checkoutDialog.close();
    showToast("Tu bolsa está vacía.");
    return;
  }
  const formData = new FormData(form);
  const items = cart.map((item) => {
    const product = products.find((entry) => entry.id === item.id);
    if (!product) return null;
    return { id: product.id, name: product.name, price: product.price, quantity: item.quantity };
  }).filter(Boolean);
  if (!items.length || items.length !== cart.length) {
    showToast("Actualizamos el catálogo. Revisá tu bolsa antes de continuar.");
    renderCart();
    return;
  }
  if (!whatsappPhone) {
    showToast("La tienda todavía no tiene configurado su WhatsApp de contacto.");
    return;
  }
  if (!catalogConnected || !supabaseClient) {
    showToast(needsPriceMigration
      ? "Falta actualizar los precios de muestra. Ejecutá supabase-pyg-migration.sql para habilitar pedidos."
      : "No pudimos conectar con la tienda. Intentá nuevamente en unos minutos.");
    return;
  }
  const whatsappWindow = window.open("about:blank", "_blank");
  if (whatsappWindow) whatsappWindow.opener = null;
  const submitButton = form.querySelector('button[type="submit"]');
  submitButton.disabled = true;
  const order = {
    id: `${Date.now().toString(36).toUpperCase()}${Math.random().toString(36).slice(2, 5).toUpperCase()}`,
    created_at: new Date().toISOString(),
    status: "pending",
    customer: {
      name: String(formData.get("name")).trim(),
      phone: String(formData.get("phone")).trim(),
      address: String(formData.get("address")).trim(),
      note: String(formData.get("note")).trim()
    },
    items,
    total: items.reduce((total, item) => total + item.price * item.quantity, 0)
  };
  const shipping = "Costo y forma de entrega a coordinar por WhatsApp.";
  const message = [
    "¡Hola, Villa Shop! Quiero consultar por este pedido:",
    `Pedido: #${order.id}`,
    `Nombre: ${order.customer.name}`,
    `Mi teléfono: ${order.customer.phone}`,
    "",
    "Productos:",
    ...items.map((item) => `• ${item.quantity} × ${item.name} — ${formatPrice(item.price * item.quantity)}`),
    "",
    `Subtotal: ${formatPrice(order.total)}`,
    `Envío: ${shipping}`,
    `Dirección: ${order.customer.address}`,
    order.customer.note ? `Nota: ${order.customer.note}` : ""
  ].filter(Boolean).join("\n");
  const whatsappUrl = `https://wa.me/${whatsappPhone}?text=${encodeURIComponent(message)}`;
  try {
    const { error } = await supabaseClient.from("orders").insert(order);
    if (error) {
      console.error("No se pudo registrar el pedido en Supabase.", error);
      if (whatsappWindow) whatsappWindow.close();
      showToast("No pudimos registrar el pedido. Revisá tu conexión e intentá nuevamente.");
      return;
    }
    cart = [];
    renderCart();
    form.reset();
    form.hidden = true;
    document.querySelector("#whatsapp-order-link").href = whatsappUrl;
    document.querySelector("#checkout-result").hidden = false;
    showToast("Pedido registrado. Confirmalo por WhatsApp.");
    if (whatsappWindow) {
      whatsappWindow.location.replace(whatsappUrl);
      checkoutDialog.close();
      closeCart();
    }
  } catch (error) {
    console.error("Falló la comunicación al registrar el pedido.", error);
    if (whatsappWindow) whatsappWindow.close();
    showToast("No pudimos registrar el pedido. Revisá tu conexión e intentá nuevamente.");
  } finally {
    submitButton.disabled = false;
  }
});

checkoutDialog.addEventListener("close", () => {
  const form = document.querySelector("#checkout-form");
  form.hidden = false;
  document.querySelector("#checkout-result").hidden = true;
  form.reset();
});
document.querySelector("#checkout-finish").addEventListener("click", () => checkoutDialog.close());

document.querySelector("#current-year").textContent = new Date().getFullYear();
document.querySelector("#checkout-finish").addEventListener("click", closeCart);
renderFilters();
renderProducts();
renderCart();
loadCatalog();
