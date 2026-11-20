window.VILLA_SHOP_SETTINGS = {
  whatsappPhone: "595982030023",
  locale: "es-PY",
  currency: "PYG",
  legacyDemoPrices: {
    "taza-calma": { name: "Taza Calma", oldPrice: 12900, oldOriginalPrice: null, price: 129000, originalPrice: null },
    "vela-botanica": { name: "Vela Botánica", oldPrice: 8900, oldOriginalPrice: 10900, price: 89000, originalPrice: 109000 },
    "cuaderno-ideas": { name: "Cuaderno de ideas", oldPrice: 7600, oldOriginalPrice: null, price: 76000, originalPrice: null },
    "bolso-nube": { name: "Bolso Nube", oldPrice: 18900, oldOriginalPrice: 22900, price: 189000, originalPrice: 229000 },
    "set-pausa": { name: "Set Pausa", oldPrice: 15500, oldOriginalPrice: null, price: 155000, originalPrice: null },
    "botella-dia": { name: "Botella de todos los días", oldPrice: 11200, oldOriginalPrice: null, price: 112000, originalPrice: null },
    "florero-sol": { name: "Florero Sol", oldPrice: 14300, oldOriginalPrice: null, price: 143000, originalPrice: null },
    "kit-creativo": { name: "Kit creativo", oldPrice: 7800, oldOriginalPrice: 9800, price: 78000, originalPrice: 98000 }
  }
};

window.normalizeVillaProductPrice = function (product) {
  const sample = window.VILLA_SHOP_SETTINGS.legacyDemoPrices[product.id];
  if (!sample
    || product.name !== sample.name
    || Number(product.price) !== sample.oldPrice
    || (product.original_price == null ? null : Number(product.original_price)) !== sample.oldOriginalPrice) {
    return product;
  }
  return { ...product, price: sample.price, original_price: sample.originalPrice };
};
