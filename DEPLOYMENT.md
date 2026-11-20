# Publicar Villa Shop gratis con HTTPS

El proyecto es un sitio estático, así que no requiere servidor propio ni dominio para empezar. Netlify puede asignarle una dirección pública `*.netlify.app` y HTTPS automáticamente.

## Antes de publicarlo

1. En Supabase, ejecutá `supabase-pyg-migration.sql` si ya habías ejecutado la configuración inicial anterior. La tienda muestra una advertencia y bloquea pedidos mientras detecta los precios antiguos.
2. Entrá a `admin.html`, verificá que ya no aparezca esa advertencia y reemplazá los artículos, precios, fotos y ofertas de demostración por tu catálogo real. Consultá disponibilidad y envío antes de compartir la web.
3. Probá un pedido de prueba por WhatsApp y verificá que aparezca en la pestaña **Pedidos** del panel. Eliminá ese pedido de prueba desde Supabase si fuera necesario; el panel no borra pedidos para evitar eliminar registros por accidente.
4. Nunca publiques una clave `service_role` ni una contraseña de Supabase. `supabase-config.js` lleva solo la clave pública `anon`/publishable, protegida por las políticas RLS incluidas.

## Crear el sitio

1. Ingresá a [Netlify Drop](https://app.netlify.com/drop) y arrastrá la carpeta `Villa-Shop` completa.
2. Netlify mostrará la dirección pública asignada. Compartí con tus clientes la dirección base, por ejemplo `https://villa-shop.netlify.app/`. No agregues `/admin.html`: esa página es solo para la administración. Los clientes pueden ver productos y pedir sin crear una cuenta ni iniciar sesión.
3. En Supabase, abrí **Authentication → URL Configuration** y configurá esa dirección como **Site URL**. Agregá también la URL de administración como redirección permitida si la pantalla lo requiere. No cambies las políticas de acceso de la base.
4. El panel del administrador está en `https://TU-SITIO.netlify.app/admin.html`. No lo compartas con los clientes. Aunque alguien conozca esa dirección, debe iniciar sesión con una cuenta cuyo rol sea `admin`; solo ese rol puede modificar productos o consultar pedidos.

Un dominio propio es opcional: más adelante podés conectarlo desde la configuración de dominios del proveedor de hosting. Actualizá el enlace a WhatsApp y cualquier información de contacto si cambia.
