# Configuración del panel de Villa Shop

El panel y la tienda usan Supabase para compartir productos y pedidos entre dispositivos. No se debe poner una clave `service_role` en el sitio.

1. Creá un proyecto en Supabase y ejecutá `supabase-setup.sql` desde el SQL Editor. El script crea el catálogo, pedidos, imágenes y carga ocho productos de ejemplo; tres aparecen en la sección **Ofertas**.
2. En **Authentication → Users**, creá el usuario que administrará la tienda. Luego, desde el SQL Editor, otorgale el rol de administrador reemplazando el correo:

   ```sql
   update auth.users
   set raw_app_meta_data = coalesce(raw_app_meta_data, '{}'::jsonb) || '{"role":"admin"}'::jsonb
   where email = 'admin@tudominio.com';
   ```

   El usuario debe cerrar e iniciar sesión después de asignar el rol. Las políticas de la base de datos bloquean la administración a usuarios sin ese rol.
3. En **Project Settings → API**, copiá la Project URL y la clave pública `anon`/publishable en `supabase-config.js` (`url` y `anonKey`). Esa clave pública está diseñada para usarse en el navegador; nunca uses `service_role`.
4. Esta tienda está configurada para Paraguay: `store-config.js` usa guaraníes (PYG) y pedidos por WhatsApp. Si ya ejecutaste la versión anterior del SQL con precios de ejemplo en pesos, ejecutá una sola vez `supabase-pyg-migration.sql`. La migración solo cambia los ocho ejemplos que conserven sus precios originales; no modifica productos personalizados ni pedidos existentes. Revisá y ajustá los precios de ejemplo antes de vender.
5. Publicá todos los archivos del proyecto bajo el mismo sitio web HTTPS. Abrí `admin.html` para ingresar, crear/editar/eliminar productos y revisar pedidos.

El campo de imagen permite subir un archivo de hasta 5 MB o pegar una URL HTTPS. El precio anterior activa automáticamente la etiqueta y la sección de ofertas. Los clientes envían sus pedidos mediante WhatsApp; el pedido también queda registrado en Supabase para que puedas revisarlo en el panel. El envío y el pago se coordinan personalmente.

Los ocho artículos y sus precios son datos de demostración: reemplazalos por productos, imágenes, precios y disponibilidad reales antes de compartir la tienda con clientes. La tienda no confirma stock automáticamente.
