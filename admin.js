const config = window.VILLA_SHOP_SUPABASE || {};
const storeSettings = window.VILLA_SHOP_SETTINGS || {};
const client = window.supabase?.createClient && config.url && config.anonKey
  ? window.supabase.createClient(config.url, config.anonKey)
  : null;
const notice = document.querySelector("#admin-notice");
const loginForm = document.querySelector("#login-form");
const adminLogin = document.querySelector("#admin-login");
const adminApp = document.querySelector("#admin-app");
const signoutButton = document.querySelector("#admin-signout");
const productForm = document.querySelector("#product-form");
const productList = document.querySelector("#product-list");
const ordersList = document.querySelector("#orders-list");
const toast = document.querySelector("#toast");
let products = [];
let orders = [];
let needsPriceMigration = false;
let toastTimer;

function escapeHTML(value) {
  return String(value ?? "").replace(/[&<>"']/g, (character) => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"
  })[character]);
}

function formatPrice(value) {
  return new Intl.NumberFormat(storeSettings.locale || "es-PY", {
    style: "currency",
    currency: storeSettings.currency || "PYG",
    maximumFractionDigits: 0
  }).format(value);
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

function showNotice(message, isError = false) {
  notice.textContent = message;
  notice.classList.toggle("notice-error", isError);
  notice.hidden = !message;
}

function showToast(message) {
  toast.textContent = message;
  toast.classList.add("visible");
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => toast.classList.remove("visible"), 2600);
}

function setAuthenticated(user) {
  adminLogin.hidden = Boolean(user);
  adminApp.hidden = !user;
  signoutButton.hidden = !user;
  if (user) {
    showNotice(`Sesión iniciada: ${user.email}`);
    loadAdminData();
  }
}

async function loadAdminData() {
  const [{ data: productData, error: productError }, { data: orderData, error: orderError }] = await Promise.all([
    client.from("products").select("*").order("name"),
    client.from("orders").select("*").order("created_at", { ascending: false })
  ]);
  if (productError) {
    console.error("No se pudo cargar el catálogo de administración.", productError);
    productList.innerHTML = '<p class="orders-empty">No se pudo cargar el catálogo. Revisá la conexión y los permisos de Supabase.</p>';
  } else {
    needsPriceMigration = false;
    products = (productData || []).map((product) => {
      const normalized = window.normalizeVillaProductPrice?.(product) || product;
      if (normalized !== product) needsPriceMigration = true;
      return normalized;
    });
    renderProducts();
    if (needsPriceMigration) {
      showNotice("Los precios de demostración se muestran en guaraníes, pero aún no se actualizaron en la base de datos. Ejecutá supabase-pyg-migration.sql antes de vender.");
    }
  }
  if (orderError) {
    console.error("No se pudieron cargar los pedidos de administración.", orderError);
    ordersList.innerHTML = '<p class="orders-empty">No se pudieron cargar los pedidos. Revisá la conexión y los permisos de Supabase.</p>';
  } else {
    orders = orderData || [];
    renderOrders();
  }
}

function renderProducts() {
  if (!products.length) {
    productList.innerHTML = '<p class="orders-empty">Todavía no hay productos. Usá el formulario para agregar el primero.</p>';
    return;
  }
  productList.innerHTML = products.map((product) => {
    const imageUrl = safeImageUrl(product.image_url);
    const color = /^#[\da-f]{6}$/i.test(product.color) ? product.color : "#392e12";
    const isOffer = Number(product.original_price) > Number(product.price);
    return `
      <article class="admin-product-card">
        <div class="admin-product-thumb" style="background:${color}">
          ${imageUrl
            ? `<img src="${escapeHTML(imageUrl)}" alt="" loading="lazy">`
            : `<span>${escapeHTML(product.emoji || "✿")}</span>`}
        </div>
        <div class="admin-product-details">
          <p class="product-category">${escapeHTML(product.category)}${isOffer ? " · EN OFERTA" : ""}</p>
          <h3>${escapeHTML(product.name)}</h3>
          <p>${formatPrice(product.price)}${isOffer ? ` <del>${formatPrice(product.original_price)}</del>` : ""}</p>
        </div>
        <div class="admin-product-actions">
          <button type="button" class="button button-outline" data-edit-product="${escapeHTML(product.id)}">Editar</button>
          <button type="button" class="button button-outline" data-delete-product="${escapeHTML(product.id)}">Eliminar</button>
        </div>
      </article>
    `;
  }).join("");
}

function renderOrders() {
  const pending = orders.filter((order) => order.status === "pending").length;
  const accepted = orders.filter((order) => order.status === "accepted").length;
  document.querySelector("#admin-stats").innerHTML = `
    <div class="stat-card"><span>Pedidos en espera</span><strong>${pending}</strong></div>
    <div class="stat-card"><span>Pedidos aceptados</span><strong>${accepted}</strong></div>
    <div class="stat-card"><span>Total de pedidos</span><strong>${orders.length}</strong></div>
  `;
  if (!orders.length) {
    ordersList.innerHTML = '<div class="orders-empty">Todavía no hay pedidos. Cuando alguien compre, aparecerán acá.</div>';
    return;
  }
  const statusLabels = { pending: "Pendiente", accepted: "Aceptado", rejected: "Rechazado" };
  ordersList.innerHTML = orders.map((order) => {
    const date = new Date(order.created_at);
    const formattedDate = Number.isNaN(date.getTime()) ? "" : date.toLocaleString(storeSettings.locale || "es-PY", { dateStyle: "medium", timeStyle: "short" });
    const customer = order.customer || {};
    const items = Array.isArray(order.items) ? order.items : [];
    const itemText = items.map((item) => `${item.quantity} × ${escapeHTML(item.name)} — ${formatPrice(item.price * item.quantity)}`).join("<br>");
    return `
      <article class="order-card">
        <div class="order-topline">
          <div><p class="order-id">Pedido #${escapeHTML(order.id)}</p><span class="order-date">${escapeHTML(formattedDate)}</span></div>
          <span class="status status-${escapeHTML(order.status)}">${statusLabels[order.status] || "Pendiente"}</span>
        </div>
        <div class="order-details">
          <p><strong>Cliente</strong>${escapeHTML(customer.name)}<br>${escapeHTML(customer.phone)}</p>
          <p><strong>Entrega</strong>${escapeHTML(customer.address)}</p>
          ${customer.note ? `<p><strong>Nota</strong>${escapeHTML(customer.note)}</p>` : ""}
        </div>
        <div class="order-products">${itemText}</div>
        <div class="order-bottom">
          <span class="order-total">Total: ${formatPrice(order.total)}</span>
          <div class="order-actions">
            <button class="accept-order" type="button" data-order="${escapeHTML(order.id)}" data-status="accepted" ${order.status !== "pending" ? "disabled" : ""}>Aceptar pedido</button>
            <button type="button" data-order="${escapeHTML(order.id)}" data-status="rejected" ${order.status !== "pending" ? "disabled" : ""}>Rechazar</button>
          </div>
        </div>
      </article>
    `;
  }).join("");
}

function resetProductForm() {
  productForm.reset();
  productForm.elements.id.value = "";
  productForm.elements.emoji.value = "✿";
  productForm.elements.color.value = "#392e12";
  document.querySelector("#product-form-title").textContent = "Agregar un producto";
  document.querySelector("#product-save").innerHTML = "Guardar producto <span>→</span>";
  document.querySelector("#product-cancel").hidden = true;
}

function fillProductForm(product) {
  productForm.elements.id.value = product.id;
  productForm.elements.name.value = product.name;
  productForm.elements.category.value = product.category;
  productForm.elements.price.value = product.price;
  productForm.elements.original_price.value = product.original_price || "";
  productForm.elements.emoji.value = product.emoji || "✿";
  productForm.elements.color.value = /^#[\da-f]{6}$/i.test(product.color) ? product.color : "#392e12";
  productForm.elements.badge.value = product.badge || "";
  productForm.elements.description.value = product.description || "";
  productForm.elements.image_url.value = product.image_url || "";
  productForm.elements.image.value = "";
  document.querySelector("#product-form-title").textContent = "Editar producto";
  document.querySelector("#product-save").textContent = "Guardar cambios";
  document.querySelector("#product-cancel").hidden = false;
  productForm.scrollIntoView({ behavior: "smooth", block: "start" });
}

function fileExtension(file) {
  const extension = file.name.split(".").pop().toLowerCase();
  return ["jpg", "jpeg", "png", "webp", "gif"].includes(extension) ? extension : "jpg";
}

async function uploadProductImage(file) {
  if (!["image/jpeg", "image/png", "image/webp", "image/gif"].includes(file.type)) {
    throw new Error("Elegí una imagen JPG, PNG, WebP o GIF.");
  }
  if (file.size > 5 * 1024 * 1024) throw new Error("La imagen debe pesar 5 MB o menos.");
  const path = `${crypto.randomUUID()}.${fileExtension(file)}`;
  const { error } = await client.storage.from("product-images").upload(path, file, {
    contentType: file.type,
    upsert: false
  });
  if (error) throw error;
  const { data } = client.storage.from("product-images").getPublicUrl(path);
  return { path, url: data.publicUrl };
}

document.querySelector("#current-year").textContent = new Date().getFullYear();

if (!client) {
  showNotice("Falta conectar Supabase. Seguí los pasos de ADMIN-SETUP.md para habilitar el panel, publicar el catálogo y recibir pedidos.", true);
  loginForm.querySelector("button[type=submit]").disabled = true;
} else {
  client.auth.getSession().then(({ data, error }) => {
    if (error) {
      console.error("No se pudo recuperar la sesión del administrador.", error);
      showNotice("No se pudo verificar la sesión. Volvé a ingresar.", true);
      return;
    }
    const user = data.session?.user;
    if (user?.app_metadata?.role === "admin") setAuthenticated(user);
    else if (user) client.auth.signOut().then(({ error: signoutError }) => {
      if (signoutError) console.error("No se pudo cerrar una sesión sin permisos.", signoutError);
      showNotice("Esta cuenta no tiene permisos de administración.", true);
    });
    else showNotice("Ingresá con la cuenta autorizada para administrar la tienda.");
  });
}

loginForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  if (!client) return;
  const button = loginForm.querySelector("button[type=submit]");
  button.disabled = true;
  const formData = new FormData(loginForm);
  const { data, error } = await client.auth.signInWithPassword({
    email: String(formData.get("email")).trim(),
    password: String(formData.get("password"))
  });
  button.disabled = false;
  if (error) {
    console.error("No se pudo iniciar sesión en el panel.", error);
    showNotice("No se pudo iniciar sesión. Revisá el correo y la contraseña.", true);
    return;
  }
  if (data.user?.app_metadata?.role !== "admin") {
    const { error: signoutError } = await client.auth.signOut();
    if (signoutError) console.error("No se pudo cerrar una sesión sin permisos.", signoutError);
    showNotice("La cuenta ingresada no tiene permisos de administración.", true);
    return;
  }
  loginForm.reset();
  setAuthenticated(data.user);
});

signoutButton.addEventListener("click", async () => {
  const { error } = await client.auth.signOut();
  if (error) {
    console.error("No se pudo cerrar la sesión de administración.", error);
    showNotice("No se pudo cerrar la sesión. Intentá nuevamente.", true);
    return;
  }
  adminApp.hidden = true;
  signoutButton.hidden = true;
  adminLogin.hidden = false;
  showNotice("Sesión cerrada.");
});

document.querySelector(".admin-tabs").addEventListener("click", (event) => {
  const tab = event.target.closest("[data-tab]");
  if (!tab) return;
  document.querySelectorAll(".admin-tab").forEach((button) => {
    const isSelected = button === tab;
    button.classList.toggle("active", isSelected);
    button.setAttribute("aria-selected", String(isSelected));
  });
  document.querySelector("#products-panel").hidden = tab.dataset.tab !== "products";
  document.querySelector("#orders-panel").hidden = tab.dataset.tab !== "orders";
});

productForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  const saveButton = document.querySelector("#product-save");
  saveButton.disabled = true;
  const formData = new FormData(productForm);
  const price = Number(formData.get("price"));
  const originalPrice = Number(formData.get("original_price")) || null;
  if (!Number.isSafeInteger(price) || price <= 0 || (originalPrice && (!Number.isSafeInteger(originalPrice) || originalPrice <= price))) {
    showToast("Revisá los precios: el precio anterior debe ser mayor al precio actual.");
    saveButton.disabled = false;
    return;
  }

  const imageFile = formData.get("image");
  let imageUrl = String(formData.get("image_url") || "").trim();
  const productId = String(formData.get("id") || crypto.randomUUID());
  const previousProduct = products.find((product) => product.id === productId);
  if (!imageUrl && previousProduct) imageUrl = previousProduct.image_url || "";
  if (imageUrl && !safeImageUrl(imageUrl)) {
    showToast("Ingresá un enlace de imagen válido (http o https).");
    saveButton.disabled = false;
    return;
  }

  let uploadedImage;
  try {
    if (imageFile instanceof File && imageFile.size) {
      uploadedImage = await uploadProductImage(imageFile);
      imageUrl = uploadedImage.url;
    }
    const product = {
      id: productId,
      name: String(formData.get("name")).trim(),
      category: String(formData.get("category")).trim(),
      price,
      original_price: originalPrice,
      emoji: String(formData.get("emoji") || "✿").trim() || "✿",
      color: String(formData.get("color")),
      badge: String(formData.get("badge") || "").trim(),
      description: String(formData.get("description") || "").trim(),
      image_url: imageUrl
    };
    const { error } = await client.from("products").upsert(product);
    if (error) {
      if (uploadedImage) {
        const { error: cleanupError } = await client.storage.from("product-images").remove([uploadedImage.path]);
        if (cleanupError) console.error("No se pudo quitar la imagen que quedó sin producto.", cleanupError);
      }
      throw error;
    }
    showToast(previousProduct ? "Producto actualizado y publicado." : "Producto agregado a la tienda.");
    resetProductForm();
    await loadAdminData();
  } catch (error) {
    console.error("No se pudo guardar el producto.", error);
    showToast(error.message === "La imagen debe pesar 5 MB o menos." || error.message === "Elegí una imagen JPG, PNG, WebP o GIF."
      ? error.message
      : "No se pudo guardar el producto. Revisá la conexión y los permisos.");
  } finally {
    saveButton.disabled = false;
  }
});

document.querySelector("#product-cancel").addEventListener("click", resetProductForm);

productList.addEventListener("click", async (event) => {
  const editButton = event.target.closest("[data-edit-product]");
  const deleteButton = event.target.closest("[data-delete-product]");
  if (editButton) {
    const product = products.find((entry) => entry.id === editButton.dataset.editProduct);
    if (product) fillProductForm(product);
  }
  if (deleteButton) {
    const product = products.find((entry) => entry.id === deleteButton.dataset.deleteProduct);
    if (!product || !window.confirm(`¿Querés eliminar "${product.name}" de la tienda?`)) return;
    const { error } = await client.from("products").delete().eq("id", product.id);
    if (error) {
      console.error("No se pudo eliminar el producto.", error);
      showToast("No se pudo eliminar el producto. Intentá nuevamente.");
      return;
    }
    showToast("Producto eliminado de la tienda.");
    await loadAdminData();
  }
});

ordersList.addEventListener("click", async (event) => {
  const button = event.target.closest("[data-order][data-status]");
  if (!button || button.disabled) return;
  button.disabled = true;
  const { error } = await client.from("orders").update({ status: button.dataset.status }).eq("id", button.dataset.order);
  if (error) {
    console.error("No se pudo actualizar el estado del pedido.", error);
    showToast("No se pudo actualizar el pedido. Intentá nuevamente.");
    button.disabled = false;
    return;
  }
  showToast(button.dataset.status === "accepted" ? "Pedido aceptado." : "Pedido rechazado.");
  await loadAdminData();
});
