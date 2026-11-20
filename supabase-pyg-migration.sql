update public.products as product
set
  price = seed.price,
  original_price = seed.original_price
from (
  values
    ('taza-calma', 12900, null::integer, 129000, null::integer),
    ('vela-botanica', 8900, 10900, 89000, 109000),
    ('cuaderno-ideas', 7600, null::integer, 76000, null::integer),
    ('bolso-nube', 18900, 22900, 189000, 229000),
    ('set-pausa', 15500, null::integer, 155000, null::integer),
    ('botella-dia', 11200, null::integer, 112000, null::integer),
    ('florero-sol', 14300, null::integer, 143000, null::integer),
    ('kit-creativo', 7800, 9800, 78000, 98000)
) as seed(id, old_price, old_original_price, price, original_price)
where product.id = seed.id
  and product.price = seed.old_price
  and product.original_price is not distinct from seed.old_original_price;
