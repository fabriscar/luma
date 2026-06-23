document.addEventListener('DOMContentLoaded', () => {

    // --- CONFIGURACIÓN BASE DEL BACKEND ---
    const API_BASE = "/api";  // URL relativa: funciona desde cualquier PC en la red

    // --- MANEJO DE TOKEN JWT ---
    let jwtToken = localStorage.getItem('luma_jwt') || null;

    async function fetchAuth(url, options = {}) {
        if (!options.headers) options.headers = {};
        if (jwtToken) {
            options.headers['Authorization'] = `Bearer ${jwtToken}`;
        }
        const response = await fetch(url, options);
        if (response.status === 401 || response.status === 403) {
            cerrarSesion(true);
            throw new Error('Sesión expirada o inválida');
        }
        return response;
    }

    // --- ELEMENTOS DE CONTROL ---
    const loginForm = document.getElementById('login-form');
    const loginContainer = document.getElementById('login-container');
    const dashboardContainer = document.getElementById('dashboard-container');
    const logoutBtn = document.getElementById('logout-btn');
    const loginError = document.getElementById('login-error');
    const navButtons = document.querySelectorAll('.nav-btn');
    const sections = document.querySelectorAll('.content-section');

    // --- FORMULARIOS Y TABLAS ---
    const productoForm = document.getElementById('producto-form');
    const tablaProductosBody = document.getElementById('tabla-productos-body');
    const filamentoForm = document.getElementById('filamento-form');
    const tablaFilamentosBody = document.getElementById('tabla-filamentos-body');
    const ventaForm = document.getElementById('venta-form');
    const selectProducto = document.getElementById('venta-producto');
    const selectMaterial = document.getElementById('venta-material');
    const selectEstadoPago = document.getElementById('venta-estado-pago');
    const groupMontoSena = document.getElementById('group-monto-sena');
    const inputMontoSena = document.getElementById('venta-monto-sena');
    const tablaVentasBody = document.getElementById('tabla-ventas-body');
    const cardsPendiente = document.getElementById('cards-pendiente');
    const cardsProgreso = document.getElementById('cards-progreso');
    const cardsEntrega = document.getElementById('cards-entrega');

    // --- VARIABLES DE ESTADO LOCAL ---
    let productosCargados = [];
    let filamentosCargados = [];
    let pedidosCargados = [];   // Guardamos todos los pedidos para filtrar sin re-fetch
    let filtroHistorial = { cliente: '', estadoPago: '' };

    // --- ESTADO DE FILTROS ---
    let filtroProductos   = { nombre: '', pesoMax: '', precioMax: '' };
    let filtroFilamentos  = { buscar: '', tipo: '' };
    let filtroPedidos     = { cliente: '', estadoPago: '', estadoProduccion: '' };
    let filtroKanban      = { cliente: '' };

    // =======================================================
    // --- FUNCIONES DE FILTRADO ---
    // =======================================================
    function aplicarFiltroProductos(lista) {
        return lista.filter(p => {
            const matchNombre  = !filtroProductos.nombre   || p.nombre.toLowerCase().includes(filtroProductos.nombre.toLowerCase());
            const matchPeso    = !filtroProductos.pesoMax  || p.pesoGramos <= parseFloat(filtroProductos.pesoMax);
            const matchPrecio  = !filtroProductos.precioMax || parseFloat(p.precioBase) <= parseFloat(filtroProductos.precioMax);
            return matchNombre && matchPeso && matchPrecio;
        });
    }

    function aplicarFiltroFilamentos(lista) {
        const buscar = filtroFilamentos.buscar.toLowerCase();
        return lista.filter(f => {
            const matchBuscar = !buscar ||
                f.tipo.toLowerCase().includes(buscar) ||
                f.marca.toLowerCase().includes(buscar) ||
                f.color.toLowerCase().includes(buscar);
            const matchTipo = !filtroFilamentos.tipo || f.tipo.toUpperCase() === filtroFilamentos.tipo.toUpperCase();
            return matchBuscar && matchTipo;
        });
    }

    function aplicarFiltroPedidos(lista) {
        return lista.filter(p => {
            const matchCliente = !filtroPedidos.cliente        || p.cliente.toLowerCase().includes(filtroPedidos.cliente.toLowerCase());
            const matchPago    = !filtroPedidos.estadoPago     || p.estadoPago === filtroPedidos.estadoPago;
            const matchProd    = !filtroPedidos.estadoProduccion || p.estadoProduccion === filtroPedidos.estadoProduccion;
            return matchCliente && matchPago && matchProd;
        });
    }

    function aplicarFiltroKanban(lista) {
        if (!filtroKanban.cliente) return lista;
        return lista.filter(p => p.cliente.toLowerCase().includes(filtroKanban.cliente.toLowerCase()));
    }

    // Muestra un contador de resultados
    function actualizarContador(elementId, filtrados, total) {
        const el = document.getElementById(elementId);
        if (!el) return;
        if (filtrados === total) {
            el.textContent = `${total} registro${total !== 1 ? 's' : ''}`;
            el.className = 'filtro-contador';
        } else {
            el.textContent = `${filtrados} de ${total} resultado${filtrados !== 1 ? 's' : ''}`;
            el.className = 'filtro-contador filtro-activo';
        }
    }

    // =======================================================
    // --- SISTEMA DE TOASTS (Notificaciones visuales) ---
    // =======================================================
    function mostrarToast(mensaje, tipo = 'success') {
        const container = document.getElementById('toast-container');
        const toast = document.createElement('div');
        toast.className = `toast toast-${tipo}`;
        const iconos = { success: '✔', error: '✖', warning: '⚠' };
        toast.innerHTML = `<span class="toast-icon">${iconos[tipo] || '✔'}</span><span>${mensaje}</span>`;
        container.appendChild(toast);
        requestAnimationFrame(() => toast.classList.add('toast-visible'));
        setTimeout(() => {
            toast.classList.remove('toast-visible');
            toast.addEventListener('transitionend', () => toast.remove());
        }, 3500);
    }

    // =======================================================
    // --- MODAL DE CONFIRMACIÓN PERSONALIZADO ---
    // =======================================================
    const confirmModal   = document.getElementById('confirm-modal');
    const confirmMessage = document.getElementById('confirm-message');
    const confirmOkBtn   = document.getElementById('confirm-ok');
    const confirmCancelBtn = document.getElementById('confirm-cancel');

    function confirmar(mensaje) {
        return new Promise((resolve) => {
            confirmMessage.textContent = mensaje;
            confirmModal.classList.remove('hidden');

            const onOk = () => { cleanup(); resolve(true); };
            const onCancel = () => { cleanup(); resolve(false); };
            const onOverlay = (e) => { if (e.target === confirmModal) { cleanup(); resolve(false); } };

            function cleanup() {
                confirmModal.classList.add('hidden');
                confirmOkBtn.removeEventListener('click', onOk);
                confirmCancelBtn.removeEventListener('click', onCancel);
                confirmModal.removeEventListener('click', onOverlay);
            }

            confirmOkBtn.addEventListener('click', onOk);
            confirmCancelBtn.addEventListener('click', onCancel);
            confirmModal.addEventListener('click', onOverlay);
        });
    }

    // =======================================================
    // --- SPINNER DE CARGA EN TABLAS ---
    // =======================================================
    function mostrarSpinner(tbody, colSpan = 6) {
        if (!tbody) return;
        tbody.innerHTML = `<tr><td colspan="${colSpan}" class="spinner-cell"><div class="spinner"></div></td></tr>`;
    }

    // =======================================================
    // --- MANEJO DE SEÑA DINÁMICA ---
    // =======================================================
    if (selectEstadoPago) {
        selectEstadoPago.addEventListener('change', () => {
            if (selectEstadoPago.value === 'SENADO') {
                groupMontoSena.classList.remove('hidden');
                inputMontoSena.required = true;
            } else {
                groupMontoSena.classList.add('hidden');
                inputMontoSena.required = false;
                inputMontoSena.value = '';
            }
        });
    }

    // =======================================================
    // --- LLENAR DESPLEGABLES DE VENTA ---
    // =======================================================
    function actualizarSelectoresVenta() {
        if (!selectProducto || !selectMaterial) return;

        selectProducto.innerHTML = '<option value="">-- Seleccioná --</option>';
        productosCargados.forEach(p => {
            const opt = document.createElement('option');
            opt.value = p.id;
            opt.textContent = `${p.nombre} ($${p.precioBase})`;
            selectProducto.appendChild(opt);
        });

        selectMaterial.innerHTML = '<option value="">-- Seleccioná --</option>';
        filamentosCargados.forEach(f => {
            const opt = document.createElement('option');
            opt.value = `${f.tipo} - ${f.color}`;
            opt.textContent = `${f.tipo} (${f.color}) - ${f.marca}`;
            selectMaterial.appendChild(opt);
        });
    }

    // =======================================================
    // --- CONEXIÓN HTTP 1: PRODUCTOS ---
    // =======================================================
    async function cargarProductos() {
        mostrarSpinner(tablaProductosBody, 6);
        try {
            const res = await fetchAuth(`${API_BASE}/productos`);
            if (!res.ok) throw new Error(`Error del servidor: ${res.status}`);
            productosCargados = await res.json();
            renderizarTablaProductos();
            actualizarSelectoresVenta();
        } catch (err) {
            console.error("Error al traer productos del backend:", err);
            mostrarToast("No se pudieron cargar los productos.", 'error');
            if (tablaProductosBody) tablaProductosBody.innerHTML = `<tr><td colspan="6" style="text-align:center;color:var(--danger)">Error al cargar datos.</td></tr>`;
        }
    }

    function renderizarTablaProductos() {
        if (!tablaProductosBody) return;
        tablaProductosBody.innerHTML = '';

        const filtrados = aplicarFiltroProductos(productosCargados);
        actualizarContador('contador-prod', filtrados.length, productosCargados.length);

        if (filtrados.length === 0) {
            const msg = productosCargados.length === 0
                ? 'No hay productos registrados.'
                : 'Ningún producto coincide con los filtros aplicados.';
            tablaProductosBody.innerHTML = `<tr><td colspan="6" class="sin-resultados">${msg}</td></tr>`;
            return;
        }

        filtrados.forEach(p => {
            const imgTag = p.rutaFoto
                ? `<img src="${API_BASE}/productos/${p.id}/foto" class="prod-thumb" alt="${p.nombre}" onerror="this.style.display='none';this.nextSibling.style.display='flex'">`
                : '';
            const sinFotoDiv = `<div class="prod-thumb sin-foto" style="${p.rutaFoto ? 'display:none' : ''}">Sin foto</div>`;

            const stlBadges = p.stlFiles && p.stlFiles.length > 0
                ? p.stlFiles.map(stl => `<a href="${API_BASE}/stl/descargar/${stl.id}" class="stl-tag" style="text-decoration:none;">📥 ${stl.nombreArchivo}</a>`).join('')
                : '<small style="color:var(--text-muted)">Ninguno</small>';

            const row = document.createElement('tr');
            row.innerHTML = `
                <td>${imgTag}${sinFotoDiv}</td>
                <td><strong>${p.nombre}</strong></td>
                <td>${p.pesoGramos} g</td>
                <td>$${p.precioBase}</td>
                <td>${stlBadges}</td>
                <td class="td-actions">
                    <button class="btn-danger btn-del-prod" data-id="${p.id}" style="padding:0.4rem 0.8rem;font-size:0.8rem;">🗑 Borrar</button>
                </td>
            `;
            tablaProductosBody.appendChild(row);
        });
    }

    // Delegación de eventos para eliminar productos
    if (tablaProductosBody) {
        tablaProductosBody.addEventListener('click', async (e) => {
            const btn = e.target.closest('.btn-del-prod');
            if (!btn) return;
            const id = btn.getAttribute('data-id');
            const ok = await confirmar('¿Seguro que querés borrar este producto? Se eliminarán sus archivos físicos del servidor.');
            if (!ok) return;
            try {
                const res = await fetchAuth(`${API_BASE}/productos/${id}`, { method: 'DELETE' });
                if (!res.ok) throw new Error(`Error ${res.status}`);
                mostrarToast('Producto eliminado correctamente.');
                cargarProductos();
            } catch (err) {
                mostrarToast(`No se pudo eliminar: ${err.message}`, 'error');
            }
        });
    }

    if (productoForm) {
        productoForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const btnSubmit = document.getElementById('btn-submit-producto');
            btnSubmit.disabled = true;
            btnSubmit.textContent = 'Guardando...';

            const formData = new FormData();
            formData.append('nombre', document.getElementById('prod-nombre').value);
            formData.append('pesoGramos', document.getElementById('prod-peso').value);
            formData.append('precioBase', document.getElementById('prod-precio').value);

            const fotoInput = document.getElementById('prod-foto').files[0];
            if (fotoInput) formData.append('foto', fotoInput);

            const stlInput = document.getElementById('prod-stl').files;
            for (let i = 0; i < stlInput.length; i++) formData.append('stlFiles', stlInput[i]);

            try {
                const res = await fetchAuth(`${API_BASE}/productos`, { method: 'POST', body: formData });
                if (!res.ok) {
                    const err = await res.json().catch(() => ({}));
                    throw new Error(err.error || `Error ${res.status}`);
                }
                productoForm.reset();
                mostrarToast("Producto guardado exitosamente.");
                cargarProductos();
            } catch (err) {
                mostrarToast(err.message || "Error al guardar el producto.", 'error');
            } finally {
                btnSubmit.disabled = false;
                btnSubmit.textContent = 'Guardar Producto';
            }
        });
    }

    // =======================================================
    // --- CONEXIÓN HTTP 2: FILAMENTOS ---
    // =======================================================
    async function cargarFilamentos() {
        mostrarSpinner(tablaFilamentosBody, 6);
        try {
            const res = await fetchAuth(`${API_BASE}/filamentos`);
            if (!res.ok) throw new Error(`Error del servidor: ${res.status}`);
            filamentosCargados = await res.json();
            renderizarTablaFilamentos();
            actualizarSelectoresVenta();
        } catch (err) {
            console.error("Error al traer filamentos:", err);
            mostrarToast("No se pudieron cargar los filamentos.", 'error');
            if (tablaFilamentosBody) tablaFilamentosBody.innerHTML = `<tr><td colspan="6" style="text-align:center;color:var(--danger)">Error al cargar datos.</td></tr>`;
        }
    }

    function renderizarTablaFilamentos() {
        if (!tablaFilamentosBody) return;
        tablaFilamentosBody.innerHTML = '';

        const filtrados = aplicarFiltroFilamentos(filamentosCargados);
        actualizarContador('contador-fil', filtrados.length, filamentosCargados.length);

        if (filtrados.length === 0) {
            const msg = filamentosCargados.length === 0
                ? 'No hay filamentos registrados.'
                : 'Ningún filamento coincide con los filtros aplicados.';
            tablaFilamentosBody.innerHTML = `<tr><td colspan="6" class="sin-resultados">${msg}</td></tr>`;
            return;
        }

        filtrados.forEach(f => {
            const row = document.createElement('tr');
            row.innerHTML = `
                <td><strong>${f.tipo}</strong></td>
                <td>${f.marca}</td>
                <td>
                    <span style="display:inline-flex;align-items:center;gap:0.4rem;">
                        <span class="color-dot" style="background:${colorToHex(f.color)}" title="${f.color}"></span>
                        ${f.color}
                    </span>
                </td>
                <td>${f.cantidadGramos} g</td>
                <td>$${f.precioCompra}</td>
                <td class="td-actions">
                    <button class="btn-danger btn-del-fil" data-id="${f.id}" style="padding:0.4rem 0.8rem;font-size:0.8rem;">🗑 Borrar</button>
                </td>
            `;
            tablaFilamentosBody.appendChild(row);
        });
    }

    // Mapeo de nombre de color en español a hex (bonus visual)
    function colorToHex(color) {
        const mapa = {
            rojo: '#ef4444', red: '#ef4444', azul: '#3b82f6', blue: '#3b82f6',
            verde: '#22c55e', green: '#22c55e', amarillo: '#eab308', yellow: '#eab308',
            negro: '#18181b', black: '#18181b', blanco: '#f4f4f5', white: '#f4f4f5',
            naranja: '#f97316', orange: '#f97316', violeta: '#a855f7', purple: '#a855f7',
            gris: '#6b7280', gray: '#6b7280', grey: '#6b7280', rosa: '#ec4899', pink: '#ec4899',
            celeste: '#38bdf8', cyan: '#06b6d4', marron: '#92400e', brown: '#92400e',
        };
        return mapa[color.toLowerCase().split(' ')[0]] || '#71717a';
    }

    // Delegación de eventos para eliminar filamentos
    if (tablaFilamentosBody) {
        tablaFilamentosBody.addEventListener('click', async (e) => {
            const btn = e.target.closest('.btn-del-fil');
            if (!btn) return;
            const id = btn.getAttribute('data-id');
            const ok = await confirmar('¿Seguro que querés borrar este filamento del stock?');
            if (!ok) return;
            try {
                const res = await fetchAuth(`${API_BASE}/filamentos/${id}`, { method: 'DELETE' });
                if (!res.ok) throw new Error(`Error ${res.status}`);
                mostrarToast('Filamento eliminado correctamente.');
                cargarFilamentos();
            } catch (err) {
                mostrarToast(`No se pudo eliminar: ${err.message}`, 'error');
            }
        });
    }

    if (filamentoForm) {
        filamentoForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const btnSubmit = document.getElementById('btn-submit-filamento');
            btnSubmit.disabled = true;
            btnSubmit.textContent = 'Guardando...';

            const payload = {
                tipo: document.getElementById('fil-tipo').value,
                marca: document.getElementById('fil-marca').value,
                color: document.getElementById('fil-color').value,
                cantidadGramos: parseInt(document.getElementById('fil-cantidad').value),
                precioCompra: parseFloat(document.getElementById('fil-precio').value)
            };

            try {
                const res = await fetchAuth(`${API_BASE}/filamentos`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(payload)
                });
                if (!res.ok) {
                    const err = await res.json().catch(() => ({}));
                    throw new Error(err.error || `Error ${res.status}`);
                }
                filamentoForm.reset();
                mostrarToast("Filamento guardado exitosamente.");
                cargarFilamentos();
            } catch (err) {
                mostrarToast(err.message || "Error al guardar el filamento.", 'error');
            } finally {
                btnSubmit.disabled = false;
                btnSubmit.textContent = 'Guardar Filamento';
            }
        });
    }

    // =======================================================
    // --- CONEXIÓN HTTP 3: PEDIDOS Y KANBAN ---
    // =======================================================
    async function cargarPedidos() {
        mostrarSpinner(tablaVentasBody, 6);
        try {
            const res = await fetchAuth(`${API_BASE}/pedidos`);
            if (!res.ok) throw new Error(`Error del servidor: ${res.status}`);
            pedidosCargados = await res.json();
            actualizarKanban(pedidosCargados);
            actualizarTablaVentas(pedidosCargados);
            renderizarHistorial();
        } catch (err) {
            console.error("Error al traer pedidos:", err);
            mostrarToast("No se pudieron cargar los pedidos.", 'error');
        }
    }

    function actualizarKanban(pedidos) {
        cardsPendiente.innerHTML = '';
        cardsProgreso.innerHTML = '';
        cardsEntrega.innerHTML = '';

        const filtrados = aplicarFiltroKanban(pedidos).filter(p => p.estadoProduccion !== 'ENTREGADO');

        if (filtrados.length === 0) {
            const msg = filtroKanban.cliente
                ? `<p style="color:var(--text-muted);font-size:0.85rem;text-align:center;padding:1rem;">Sin coincidencias para "<strong>${filtroKanban.cliente}</strong>"</p>`
                : '<p style="color:var(--text-muted);font-size:0.85rem;text-align:center;padding:1rem;">Sin pedidos activos</p>';
            cardsPendiente.innerHTML = msg;
            return;
        }

        filtrados.forEach(pedido => {
            const card = document.createElement('div');
            card.className = 'kanban-card';

            const badgeClass = pedido.estadoPago === 'PAGADO' ? 'badge-pagado' : (pedido.estadoPago === 'SENADO' ? 'badge-sena' : 'badge-debe');
            const textoPago = pedido.estadoPago === 'SENADO' ? `SEÑADO ($${pedido.montoSena})` : pedido.estadoPago.replace('_', ' ');

            let botonAccion = '';
            if (pedido.estadoProduccion === 'PENDIENTE_HACER')
                botonAccion = `<button class="btn-action" data-id="${pedido.id}" data-next="EN_PRODUCCION">Imprimir ▶</button>`;
            else if (pedido.estadoProduccion === 'EN_PRODUCCION')
                botonAccion = `<button class="btn-action" data-id="${pedido.id}" data-next="PENDIENTE_ENTREGA">Terminar ✔</button>`;
            else if (pedido.estadoProduccion === 'PENDIENTE_ENTREGA')
                botonAccion = `<button class="btn-action" data-id="${pedido.id}" data-next="ENTREGADO">Entregar 📦</button>`;

            card.innerHTML = `
                <div class="card-header">
                    <span class="card-title">${pedido.cliente}</span>
                    <span class="badge ${badgeClass}">${textoPago}</span>
                </div>
                <div class="card-body">
                    <p><strong>Entrega:</strong> ${pedido.fechaEntrega}</p>
                </div>
                <div class="card-footer">
                    <span class="card-price">$${pedido.totalPedido}</span>
                    <div class="card-actions">${botonAccion}</div>
                </div>
            `;

            if (pedido.estadoProduccion === 'PENDIENTE_HACER') cardsPendiente.appendChild(card);
            else if (pedido.estadoProduccion === 'EN_PRODUCCION') cardsProgreso.appendChild(card);
            else if (pedido.estadoProduccion === 'PENDIENTE_ENTREGA') cardsEntrega.appendChild(card);
        });
    }

    // Delegación de eventos en el Kanban
    const kanbanBoard = document.querySelector('.kanban-board');
    if (kanbanBoard) {
        kanbanBoard.addEventListener('click', async (e) => {
            const btn = e.target.closest('.btn-action');
            if (!btn) return;
            const id = btn.getAttribute('data-id');
            const nextState = btn.getAttribute('data-next');
            try {
                const res = await fetchAuth(`${API_BASE}/pedidos/${id}/estado?nuevoEstado=${nextState}`, { method: 'PATCH' });
                if (!res.ok) throw new Error();
                const textos = { EN_PRODUCCION: 'pasado a Producción', PENDIENTE_ENTREGA: 'listo para entregar', ENTREGADO: 'marcado como Entregado' };
                mostrarToast(`Pedido ${textos[nextState] || 'actualizado'}.`);
                cargarPedidos();
            } catch {
                mostrarToast("Error al actualizar el estado del pedido.", 'error');
            }
        });
    }

    function actualizarTablaVentas(pedidos) {
        if (!tablaVentasBody) return;
        tablaVentasBody.innerHTML = '';

        const filtrados = aplicarFiltroPedidos(pedidos);
        actualizarContador('contador-ven', filtrados.length, pedidos.length);

        if (filtrados.length === 0) {
            const msg = pedidos.length === 0
                ? 'No hay pedidos registrados.'
                : 'Ningún pedido coincide con los filtros aplicados.';
            tablaVentasBody.innerHTML = `<tr><td colspan="6" class="sin-resultados">${msg}</td></tr>`;
            return;
        }

        filtrados.forEach(p => {
            const row = document.createElement('tr');
            const textoPago = p.estadoPago === 'SENADO' ? `SEÑADO ($${p.montoSena})` : p.estadoPago.replace('_', ' ');
            const badgeClass = p.estadoPago === 'PAGADO' ? 'badge-pagado' : (p.estadoPago === 'SENADO' ? 'badge-sena' : 'badge-debe');
            const estadoProdLabel = p.estadoProduccion.replace(/_/g, ' ');

            row.innerHTML = `
                <td><strong>${p.cliente}</strong></td>
                <td>${p.fechaEntrega || '-'}</td>
                <td>$${p.totalPedido}</td>
                <td><span class="badge ${badgeClass}">${textoPago}</span></td>
                <td><span class="badge" style="background-color:var(--bg-input)">${estadoProdLabel}</span></td>
                <td class="td-actions">
                    <button class="btn-danger btn-del-venta" data-id="${p.id}" style="padding:0.4rem 0.8rem;font-size:0.8rem;">🗑 Borrar</button>
                </td>
            `;
            tablaVentasBody.appendChild(row);
        });
    }

    // Delegación de eventos para eliminar pedidos
    if (tablaVentasBody) {
        tablaVentasBody.addEventListener('click', async (e) => {
            const btn = e.target.closest('.btn-del-venta');
            if (!btn) return;
            const id = btn.getAttribute('data-id');
            const ok = await confirmar('¿Seguro que querés borrar este pedido?');
            if (!ok) return;
            try {
                const res = await fetchAuth(`${API_BASE}/pedidos/${id}`, { method: 'DELETE' });
                if (!res.ok) throw new Error(`Error ${res.status}`);
                mostrarToast('Pedido eliminado correctamente.');
                cargarPedidos();
            } catch (err) {
                mostrarToast(`No se pudo eliminar: ${err.message}`, 'error');
            }
        });
    }

    // =======================================================
    // --- HISTORIAL DE PEDIDOS ENTREGADOS ---
    // =======================================================
    function renderizarHistorial() {
        const grid = document.getElementById('historial-grid');
        if (!grid) return;

        const entregados = pedidosCargados.filter(p => p.estadoProduccion === 'ENTREGADO');

        // Actualizar resumen
        const totalFacturado = entregados.reduce((sum, p) => sum + parseFloat(p.totalPedido || 0), 0);
        const totalCobrado = entregados
            .filter(p => p.estadoPago === 'PAGADO')
            .reduce((sum, p) => sum + parseFloat(p.totalPedido || 0), 0)
            + entregados
            .filter(p => p.estadoPago === 'SENADO')
            .reduce((sum, p) => sum + parseFloat(p.montoSena || 0), 0);

        const elTotalPed = document.getElementById('hist-total-pedidos');
        const elFacturado = document.getElementById('hist-total-facturado');
        const elCobrado   = document.getElementById('hist-total-cobrado');
        if (elTotalPed)  elTotalPed.textContent  = entregados.length;
        if (elFacturado) elFacturado.textContent = `$${totalFacturado.toFixed(2)}`;
        if (elCobrado)   elCobrado.textContent   = `$${totalCobrado.toFixed(2)}`;

        // Aplicar filtros
        const filtrados = entregados.filter(p => {
            const matchCliente = !filtroHistorial.cliente || p.cliente.toLowerCase().includes(filtroHistorial.cliente.toLowerCase());
            const matchPago    = !filtroHistorial.estadoPago || p.estadoPago === filtroHistorial.estadoPago;
            return matchCliente && matchPago;
        });

        actualizarContador('contador-hist', filtrados.length, entregados.length);

        grid.innerHTML = '';

        if (filtrados.length === 0) {
            grid.innerHTML = `<p style="color:var(--text-muted);font-style:italic;padding:1rem;">${
                entregados.length === 0 ? 'Todavía no hay pedidos entregados.' : 'Sin resultados para los filtros aplicados.'
            }</p>`;
            return;
        }

        filtrados.forEach(p => {
            const textoPago = p.estadoPago === 'SENADO' ? `Señado ($${p.montoSena})` : p.estadoPago.replace('_', ' ');
            const badgeClass = p.estadoPago === 'PAGADO' ? 'badge-pagado' : (p.estadoPago === 'SENADO' ? 'badge-sena' : 'badge-debe');

            const card = document.createElement('div');
            card.className = 'historial-card';
            card.innerHTML = `
                <div class="hc-cliente">${p.cliente}</div>
                <div class="hc-info">
                    <span>📅 Entregado: ${p.fechaEntrega || '-'}</span>
                    <span>🧵 Material: ${p.materialColor || '-'}</span>
                </div>
                <div class="hc-footer">
                    <span class="hc-total">$${p.totalPedido}</span>
                    <span class="badge ${badgeClass}">${textoPago}</span>
                </div>
            `;
            grid.appendChild(card);
        });
    }

    if (ventaForm) {
        ventaForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const btnSubmit = document.getElementById('btn-submit-venta');
            btnSubmit.disabled = true;
            btnSubmit.textContent = 'Creando...';

            const prodId = parseInt(selectProducto.value);
            const prodRef = productosCargados.find(p => p.id === prodId);
            const cantidad = parseInt(document.getElementById('venta-cantidad').value) || 1;
            const totalCalculado = prodRef ? (parseFloat(prodRef.precioBase) * cantidad).toFixed(2) : 0;

            const payload = {
                cliente: document.getElementById('venta-cliente').value,
                fechaEntrega: document.getElementById('venta-entrega').value,
                totalPedido: parseFloat(totalCalculado),
                estadoPago: selectEstadoPago.value,
                montoSena: selectEstadoPago.value === 'SENADO' ? parseFloat(inputMontoSena.value) || 0 : 0,
                estadoProduccion: 'PENDIENTE_HACER'
            };

            try {
                const res = await fetchAuth(`${API_BASE}/pedidos`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(payload)
                });
                if (!res.ok) {
                    const err = await res.json().catch(() => ({}));
                    throw new Error(err.error || `Error ${res.status}`);
                }
                ventaForm.reset();
                groupMontoSena.classList.add('hidden');
                mostrarToast(`Pedido para ${payload.cliente} creado. Total: $${totalCalculado}`);
                cargarPedidos();
            } catch (err) {
                mostrarToast(err.message || "Error al crear el pedido.", 'error');
            } finally {
                btnSubmit.disabled = false;
                btnSubmit.textContent = 'Crear Pedido';
            }
        });
    }

    // =======================================================
    // --- CONFIGURACIÓN DE FILTROS (setup de event listeners) ---
    // =======================================================
    function setupFiltros() {
        const el = (id) => document.getElementById(id);

        const onInput = (id, fn) => { const e = el(id); if (e) e.addEventListener('input', fn); };
        const onChange = (id, fn) => { const e = el(id); if (e) e.addEventListener('change', fn); };
        const onClick = (id, fn) => { const e = el(id); if (e) e.addEventListener('click', fn); };

        // --- FILTROS: PRODUCTOS ---
        onInput('filtro-prod-nombre', () => {
            filtroProductos.nombre = el('filtro-prod-nombre').value;
            renderizarTablaProductos();
        });
        onInput('filtro-prod-peso-max', () => {
            filtroProductos.pesoMax = el('filtro-prod-peso-max').value;
            renderizarTablaProductos();
        });
        onInput('filtro-prod-precio-max', () => {
            filtroProductos.precioMax = el('filtro-prod-precio-max').value;
            renderizarTablaProductos();
        });
        onClick('btn-limpiar-prod', () => {
            filtroProductos = { nombre: '', pesoMax: '', precioMax: '' };
            ['filtro-prod-nombre', 'filtro-prod-peso-max', 'filtro-prod-precio-max'].forEach(id => { if (el(id)) el(id).value = ''; });
            renderizarTablaProductos();
        });

        // --- FILTROS: FILAMENTOS ---
        onInput('filtro-fil-buscar', () => {
            filtroFilamentos.buscar = el('filtro-fil-buscar').value;
            renderizarTablaFilamentos();
        });
        onChange('filtro-fil-tipo', () => {
            filtroFilamentos.tipo = el('filtro-fil-tipo').value;
            renderizarTablaFilamentos();
        });
        onClick('btn-limpiar-fil', () => {
            filtroFilamentos = { buscar: '', tipo: '' };
            if (el('filtro-fil-buscar')) el('filtro-fil-buscar').value = '';
            if (el('filtro-fil-tipo')) el('filtro-fil-tipo').value = '';
            renderizarTablaFilamentos();
        });

        // --- FILTROS: VENTAS / PEDIDOS ---
        onInput('filtro-ven-cliente', () => {
            filtroPedidos.cliente = el('filtro-ven-cliente').value;
            actualizarTablaVentas(pedidosCargados);
        });
        onChange('filtro-ven-pago', () => {
            filtroPedidos.estadoPago = el('filtro-ven-pago').value;
            actualizarTablaVentas(pedidosCargados);
        });
        onChange('filtro-ven-produccion', () => {
            filtroPedidos.estadoProduccion = el('filtro-ven-produccion').value;
            actualizarTablaVentas(pedidosCargados);
        });
        onClick('btn-limpiar-ven', () => {
            filtroPedidos = { cliente: '', estadoPago: '', estadoProduccion: '' };
            ['filtro-ven-cliente'].forEach(id => { if (el(id)) el(id).value = ''; });
            if (el('filtro-ven-pago')) el('filtro-ven-pago').value = '';
            if (el('filtro-ven-produccion')) el('filtro-ven-produccion').value = '';
            actualizarTablaVentas(pedidosCargados);
        });

        // --- FILTROS: KANBAN ---
        onInput('filtro-kan-cliente', () => {
            filtroKanban.cliente = el('filtro-kan-cliente').value;
            actualizarKanban(pedidosCargados);
        });
        onClick('btn-limpiar-kan', () => {
            filtroKanban = { cliente: '' };
            if (el('filtro-kan-cliente')) el('filtro-kan-cliente').value = '';
            actualizarKanban(pedidosCargados);
        });

        // --- FILTROS: HISTORIAL ---
        onInput('filtro-hist-cliente', () => {
            filtroHistorial.cliente = el('filtro-hist-cliente').value;
            renderizarHistorial();
        });
        onChange('filtro-hist-pago', () => {
            filtroHistorial.estadoPago = el('filtro-hist-pago').value;
            renderizarHistorial();
        });
        onClick('btn-limpiar-hist', () => {
            filtroHistorial = { cliente: '', estadoPago: '' };
            if (el('filtro-hist-cliente')) el('filtro-hist-cliente').value = '';
            if (el('filtro-hist-pago')) el('filtro-hist-pago').value = '';
            renderizarHistorial();
        });
    }

    setupFiltros();

    // =======================================================
    // --- GESTIÓN DE LOGIN (CON JWT Y BACKEND) ---
    // =======================================================
    loginForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const user = document.getElementById('username').value;
        const pass = document.getElementById('password').value;
        
        loginError.classList.add('hidden');
        
        try {
            const res = await fetch(`${API_BASE}/auth/login`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ username: user, password: pass })
            });

            if (!res.ok) {
                loginError.classList.remove('hidden');
                return;
            }

            const data = await res.json();
            jwtToken = data.token;
            localStorage.setItem('luma_jwt', jwtToken);
            localStorage.setItem('luma_user', data.username);
            
            iniciarSesionUI();
        } catch (error) {
            console.error("Error en login:", error);
            loginError.classList.remove('hidden');
        }
    });

    function iniciarSesionUI() {
        loginContainer.classList.add('hidden');
        dashboardContainer.classList.remove('hidden');
        loginForm.reset();
        cargarProductos();
        cargarFilamentos();
        cargarPedidos();
    }

    function cerrarSesion(expirado = false) {
        jwtToken = null;
        localStorage.removeItem('luma_jwt');
        localStorage.removeItem('luma_user');
        
        loginContainer.classList.remove('hidden');
        dashboardContainer.classList.add('hidden');
        productosCargados = [];
        filamentosCargados = [];
        pedidosCargados = [];
        
        if (expirado) {
            mostrarToast("Tu sesión ha expirado", 'warning');
        }
    }

    logoutBtn.addEventListener('click', () => cerrarSesion());

    // --- RESTAURAR SESIÓN AL RECARGAR PÁGINA ---
    if (jwtToken) {
        // Intentamos cargar la UI, si el token está vencido, fetchAuth cerrará la sesión.
        iniciarSesionUI();
    }

    navButtons.forEach(button => button.addEventListener('click', () => {
        navButtons.forEach(btn => btn.classList.remove('active'));
        sections.forEach(sec => sec.classList.add('hidden'));
        button.classList.add('active');
        document.getElementById(`section-${button.getAttribute('data-section')}`).classList.remove('hidden');
    }));
});
