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
    const selectEstadoPago = document.getElementById('venta-estado-pago');
    const groupMontoSena = document.getElementById('group-monto-sena');
    const inputMontoSena = document.getElementById('venta-monto-sena');
    const filamentosContainer = document.getElementById('venta-filamentos-container');
    const btnAddFilamento = document.getElementById('btn-add-filamento');
    const tablaVentasBody = document.getElementById('tabla-ventas-body');
    const cardsPendiente = document.getElementById('cards-pendiente');
    const cardsProgreso = document.getElementById('cards-progreso');
    const cardsEntrega = document.getElementById('cards-entrega');

    const compraForm = document.getElementById('compra-form');
    const selectCompraFilamento = document.getElementById('compra-filamento');
    const tablaComprasBody = document.getElementById('tabla-compras-body');

    // --- VARIABLES DE ESTADO LOCAL ---
    let productosCargados = [];
    let filamentosCargados = [];
    let pedidosCargados = [];   // Guardamos todos los pedidos para filtrar sin re-fetch
    let comprasCargadas = [];
    let filtroHistorial = { cliente: '', estadoPago: '' };

    // --- ESTADO DE FILTROS ---
    let filtroProductos   = { nombre: '', pesoMax: '', precioMax: '' };
    let filtroFilamentos  = { buscar: '', tipo: '' };
    let filtroPedidos     = { cliente: '', estadoPago: '', estadoProduccion: '' };
    let filtroKanban      = { cliente: '' };

    // --- ESTADO DE EDICIÓN ---
    let editProductoId = null;
    let editFilamentoId = null;
    let editPedidoId = null;

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

    if (selectProducto) {
        selectProducto.addEventListener('change', () => {
            const groupNombre = document.getElementById('group-venta-producto-custom');
            const groupPrecio = document.getElementById('group-venta-precio-custom');
            const inputNombre = document.getElementById('venta-producto-custom');
            const inputPrecio = document.getElementById('venta-precio-custom');
            
            if (selectProducto.value === 'custom') {
                if (groupNombre) groupNombre.classList.remove('hidden');
                if (groupPrecio) groupPrecio.classList.remove('hidden');
                if (inputNombre) inputNombre.required = true;
                if (inputPrecio) inputPrecio.required = true;
            } else {
                if (groupNombre) groupNombre.classList.add('hidden');
                if (groupPrecio) groupPrecio.classList.add('hidden');
                if (inputNombre) {
                    inputNombre.required = false;
                    inputNombre.value = '';
                }
                if (inputPrecio) {
                    inputPrecio.required = false;
                    inputPrecio.value = '';
                }
            }
        });
    }

    // =======================================================
    // --- LLENAR DESPLEGABLES DE VENTA ---
    // =======================================================
    function actualizarSelectoresVenta() {
        if (!selectProducto) return;

        selectProducto.innerHTML = '<option value="">-- Seleccioná --</option>';
        productosCargados.forEach(p => {
            const opt = document.createElement('option');
            opt.value = p.id;
            opt.textContent = `${p.nombre} ($${p.precioBase})`;
            selectProducto.appendChild(opt);
        });
        selectProducto.innerHTML += '<option value="custom">-- 🌟 Producto Personalizado --</option>';

        if (filamentosContainer && filamentosContainer.children.length === 0) {
            agregarFilaFilamentoVenta();
        }

        if (selectCompraFilamento) {
            const optgroup = document.getElementById('compra-optgroup-existentes');
            if (optgroup) {
                optgroup.innerHTML = '';
                filamentosCargados.forEach(f => {
                    const opt = document.createElement('option');
                    opt.value = f.id;
                    opt.textContent = `${f.tipo} ${f.marca} (${f.color})`;
                    optgroup.appendChild(opt);
                });
            }
        }
    }

    function agregarFilaFilamentoVenta(filId = "", gramos = "") {
        if (!filamentosContainer) return;
        const row = document.createElement('div');
        row.style.display = 'flex';
        row.style.gap = '5px';
        
        const sel = document.createElement('select');
        sel.className = 'venta-fil-select';
        sel.required = true;
        sel.style.flex = '1';
        sel.innerHTML = '<option value="">-- Elegir Filamento --</option>';
        filamentosCargados.forEach(f => {
            const opt = document.createElement('option');
            opt.value = f.id;
            opt.textContent = `${f.tipo} ${f.marca} (${f.color}) - Stock: ${f.cantidadGramos}g`;
            if (f.id == filId) opt.selected = true;
            sel.appendChild(opt);
        });

        const inputGramos = document.createElement('input');
        inputGramos.type = 'number';
        inputGramos.className = 'venta-fil-gramos';
        inputGramos.required = true;
        inputGramos.placeholder = 'Gramos';
        inputGramos.style.width = '80px';
        inputGramos.min = '1';
        inputGramos.value = gramos;

        const btnDel = document.createElement('button');
        btnDel.type = 'button';
        btnDel.className = 'btn-danger btn-inline';
        btnDel.style.padding = '0.3rem 0.6rem';
        btnDel.textContent = '✖';
        btnDel.onclick = () => {
            if (filamentosContainer.children.length > 1) {
                row.remove();
            } else {
                mostrarToast('El pedido debe tener al menos un filamento', 'warning');
            }
        };

        row.appendChild(sel);
        row.appendChild(inputGramos);
        row.appendChild(btnDel);
        filamentosContainer.appendChild(row);
    }

    if (btnAddFilamento) {
        btnAddFilamento.addEventListener('click', () => agregarFilaFilamentoVenta());
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

            const detallesHTML = p.detalles ? `<br><small style="color:var(--text-muted);font-style:italic;display:block;margin-top:4px;">💬 ${p.detalles}</small>` : '';

            const row = document.createElement('tr');
            row.innerHTML = `
                <td>${imgTag}${sinFotoDiv}</td>
                <td><strong>${p.nombre}</strong>${detallesHTML}</td>
                <td>${p.pesoGramos} g</td>
                <td>$${p.precioBase}</td>
                <td>${stlBadges}</td>
                <td class="td-actions">
                    <button class="btn-warning btn-edit-prod" data-id="${p.id}" style="padding:0.4rem 0.8rem;font-size:0.8rem;">✏️ Editar</button>
                    <button class="btn-danger btn-del-prod" data-id="${p.id}" style="padding:0.4rem 0.8rem;font-size:0.8rem;">🗑 Borrar</button>
                </td>
            `;
            tablaProductosBody.appendChild(row);
        });
    }

    // Delegación de eventos para eliminar o editar productos
    if (tablaProductosBody) {
        tablaProductosBody.addEventListener('click', async (e) => {
            const btnDel = e.target.closest('.btn-del-prod');
            if (btnDel) {
                const id = btnDel.getAttribute('data-id');
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
                return;
            }

            const btnEdit = e.target.closest('.btn-edit-prod');
            if (btnEdit) {
                const id = btnEdit.getAttribute('data-id');
                const prod = productosCargados.find(p => p.id == id);
                if (prod) editarProducto(prod);
            }
        });
    }

    function editarProducto(prod) {
        editProductoId = prod.id;
        document.getElementById('prod-nombre').value = prod.nombre;
        document.getElementById('prod-peso').value = prod.pesoGramos;
        document.getElementById('prod-precio').value = prod.precioBase;
        if (document.getElementById('prod-detalles')) document.getElementById('prod-detalles').value = prod.detalles || '';
        
        const btnSubmit = document.getElementById('btn-submit-producto');
        btnSubmit.textContent = 'Actualizar Producto';
        
        // Agregar botón cancelar si no existe
        let btnCancel = document.getElementById('btn-cancel-producto');
        if (!btnCancel) {
            btnCancel = document.createElement('button');
            btnCancel.id = 'btn-cancel-producto';
            btnCancel.type = 'button';
            btnCancel.className = 'btn-secondary btn-inline';
            btnCancel.textContent = 'Cancelar';
            btnCancel.style.marginLeft = '10px';
            btnCancel.onclick = cancelarEdicionProducto;
            btnSubmit.parentNode.appendChild(btnCancel);
        }
        btnCancel.style.display = 'inline-block';

        window.scrollTo({ top: 0, behavior: 'smooth' });
    }

    function cancelarEdicionProducto() {
        editProductoId = null;
        productoForm.reset();
        document.getElementById('btn-submit-producto').textContent = 'Guardar Producto';
        const btnCancel = document.getElementById('btn-cancel-producto');
        if (btnCancel) btnCancel.style.display = 'none';
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
            if (document.getElementById('prod-detalles')) {
                formData.append('detalles', document.getElementById('prod-detalles').value);
            }

            const fotoInput = document.getElementById('prod-foto').files[0];
            if (fotoInput) formData.append('foto', fotoInput);

            const stlInput = document.getElementById('prod-stl').files;
            for (let i = 0; i < stlInput.length; i++) formData.append('stlFiles', stlInput[i]);

            try {
                let url = `${API_BASE}/productos`;
                let method = 'POST';
                if (editProductoId) {
                    url = `${API_BASE}/productos/${editProductoId}`;
                    method = 'PUT';
                }

                const res = await fetchAuth(url, { method: method, body: formData });
                if (!res.ok) {
                    const err = await res.json().catch(() => ({}));
                    throw new Error(err.error || `Error ${res.status}`);
                }
                
                cancelarEdicionProducto(); // Resetea el form y variables
                mostrarToast(editProductoId ? "Producto actualizado." : "Producto guardado exitosamente.");
                cargarProductos();
            } catch (err) {
                mostrarToast(err.message || "Error al guardar el producto.", 'error');
            } finally {
                btnSubmit.disabled = false;
                btnSubmit.textContent = editProductoId ? 'Actualizar Producto' : 'Guardar Producto';
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
                    <button class="btn-warning btn-edit-fil" data-id="${f.id}" style="padding:0.4rem 0.8rem;font-size:0.8rem;">✏️ Editar</button>
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

    // Delegación de eventos para eliminar o editar filamentos
    if (tablaFilamentosBody) {
        tablaFilamentosBody.addEventListener('click', async (e) => {
            const btnDel = e.target.closest('.btn-del-fil');
            if (btnDel) {
                const id = btnDel.getAttribute('data-id');
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
                return;
            }

            const btnEdit = e.target.closest('.btn-edit-fil');
            if (btnEdit) {
                const id = btnEdit.getAttribute('data-id');
                const fil = filamentosCargados.find(f => f.id == id);
                if (fil) editarFilamento(fil);
            }
        });
    }

    function editarFilamento(fil) {
        editFilamentoId = fil.id;
        document.getElementById('fil-tipo').value = fil.tipo;
        document.getElementById('fil-marca').value = fil.marca;
        document.getElementById('fil-color').value = fil.color;
        document.getElementById('fil-cantidad').value = fil.cantidadGramos;
        document.getElementById('fil-precio').value = fil.precioCompra;

        const btnSubmit = document.getElementById('btn-submit-filamento');
        btnSubmit.textContent = 'Actualizar Filamento';

        let btnCancel = document.getElementById('btn-cancel-filamento');
        if (!btnCancel) {
            btnCancel = document.createElement('button');
            btnCancel.id = 'btn-cancel-filamento';
            btnCancel.type = 'button';
            btnCancel.className = 'btn-secondary btn-inline';
            btnCancel.textContent = 'Cancelar';
            btnCancel.style.marginLeft = '10px';
            btnCancel.onclick = cancelarEdicionFilamento;
            btnSubmit.parentNode.appendChild(btnCancel);
        }
        btnCancel.style.display = 'inline-block';

        window.scrollTo({ top: 0, behavior: 'smooth' });
    }

    function cancelarEdicionFilamento() {
        editFilamentoId = null;
        filamentoForm.reset();
        document.getElementById('btn-submit-filamento').textContent = 'Guardar Filamento';
        const btnCancel = document.getElementById('btn-cancel-filamento');
        if (btnCancel) btnCancel.style.display = 'none';
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
                let url = `${API_BASE}/filamentos`;
                let method = 'POST';
                if (editFilamentoId) {
                    url = `${API_BASE}/filamentos/${editFilamentoId}`;
                    method = 'PUT';
                }

                const res = await fetchAuth(url, {
                    method: method,
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(payload)
                });
                if (!res.ok) {
                    const err = await res.json().catch(() => ({}));
                    throw new Error(err.error || `Error ${res.status}`);
                }
                
                cancelarEdicionFilamento();
                mostrarToast(editFilamentoId ? "Filamento actualizado." : "Filamento guardado exitosamente.");
                cargarFilamentos();
            } catch (err) {
                mostrarToast(err.message || "Error al guardar el filamento.", 'error');
            } finally {
                btnSubmit.disabled = false;
                btnSubmit.textContent = editFilamentoId ? 'Actualizar Filamento' : 'Guardar Filamento';
            }
        });
    }

    // =======================================================
    // --- CONEXIÓN HTTP 2.5: COMPRAS DE FILAMENTOS ---
    // =======================================================
    async function cargarCompras() {
        try {
            const res = await fetchAuth(`${API_BASE}/compras-filamentos`);
            if (!res.ok) throw new Error(`Error del servidor: ${res.status}`);
            comprasCargadas = await res.json();
            renderizarTablaCompras();
            renderizarHistorial(); // Actualiza el historial con el nuevo gasto
        } catch (err) {
            console.error("Error al traer compras:", err);
            if (tablaComprasBody) tablaComprasBody.innerHTML = `<tr><td colspan="5" style="text-align:center;color:var(--danger)">Error al cargar compras.</td></tr>`;
        }
    }

    function renderizarTablaCompras() {
        if (!tablaComprasBody) return;
        tablaComprasBody.innerHTML = '';

        if (comprasCargadas.length === 0) {
            tablaComprasBody.innerHTML = `<tr><td colspan="5" class="sin-resultados">No hay compras registradas.</td></tr>`;
            return;
        }

        // Ordenamos por fecha descendente
        const ordenadas = [...comprasCargadas].sort((a, b) => new Date(b.fechaCompra) - new Date(a.fechaCompra));

        ordenadas.forEach(c => {
            const row = document.createElement('tr');
            let descStr = c.descripcion;
            if (c.filamentoId) {
                const f = filamentosCargados.find(fil => fil.id === c.filamentoId);
                if (f) descStr = `<strong>${f.tipo} ${f.marca} (${f.color})</strong><br><small>${c.descripcion}</small>`;
            }
            const gramosStr = c.cantidadGramos > 0 ? `${c.cantidadGramos} g` : '-';
            row.innerHTML = `
                <td>${c.fechaCompra}</td>
                <td>${descStr}</td>
                <td>${gramosStr}</td>
                <td><strong>$${c.montoTotal}</strong></td>
                <td class="td-actions">
                    <button class="btn-danger btn-del-compra" data-id="${c.id}" style="padding:0.4rem 0.8rem;font-size:0.8rem;">🗑 Borrar</button>
                </td>
            `;
            tablaComprasBody.appendChild(row);
        });
    }

    // Delegación para borrar compras
    if (tablaComprasBody) {
        tablaComprasBody.addEventListener('click', async (e) => {
            const btnDel = e.target.closest('.btn-del-compra');
            if (btnDel) {
                const id = btnDel.getAttribute('data-id');
                const ok = await confirmar('¿Seguro que querés borrar esta compra? Se restará el stock que había sumado.');
                if (!ok) return;
                try {
                    const res = await fetchAuth(`${API_BASE}/compras-filamentos/${id}`, { method: 'DELETE' });
                    if (!res.ok) throw new Error(`Error ${res.status}`);
                    mostrarToast('Compra eliminada correctamente.');
                    cargarCompras();
                    cargarFilamentos(); // Recargar stock
                } catch (err) {
                    mostrarToast(`No se pudo eliminar: ${err.message}`, 'error');
                }
            }
        });
    }

    // Toggle de campos para "Nuevo Filamento" en compras
    if (selectCompraFilamento) {
        selectCompraFilamento.addEventListener('change', () => {
            const isNuevo = selectCompraFilamento.value === 'nuevo';
            const isGenerico = selectCompraFilamento.value === 'generico';
            
            document.querySelectorAll('.compra-nuevo-fields').forEach(el => {
                if (isNuevo) el.classList.remove('hidden');
                else el.classList.add('hidden');
                
                // Hacer requeridos los campos solo si es nuevo
                const input = el.querySelector('input');
                if (input) input.required = isNuevo;
            });

            const groupCantidad = document.getElementById('group-compra-cantidad');
            const inputCantidad = document.getElementById('compra-cantidad');
            if (groupCantidad && inputCantidad) {
                if (isGenerico) {
                    groupCantidad.classList.add('hidden');
                    inputCantidad.required = false;
                    inputCantidad.value = 0;
                } else {
                    groupCantidad.classList.remove('hidden');
                    inputCantidad.required = true;
                    if (inputCantidad.value == 0) inputCantidad.value = 1000;
                }
            }
        });
    }

    // Submit de nueva compra
    if (compraForm) {
        compraForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const btnSubmit = document.getElementById('btn-submit-compra');
            btnSubmit.disabled = true;
            btnSubmit.textContent = 'Registrando...';

            let filamentoIdFinal = null;
            const selectValue = selectCompraFilamento.value;

            try {
                // Si eligió "Nuevo Filamento", primero lo creamos en el backend
                if (selectValue === 'nuevo') {
                    const filPayload = {
                        tipo: document.getElementById('compra-nuevo-tipo').value,
                        marca: document.getElementById('compra-nuevo-marca').value,
                        color: document.getElementById('compra-nuevo-color').value,
                        cantidadGramos: 0, // Se sumará automáticamente al registrar la compra
                        precioCompra: parseFloat(document.getElementById('compra-monto').value) || 0
                    };
                    const resFil = await fetchAuth(`${API_BASE}/filamentos`, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify(filPayload)
                    });
                    if (!resFil.ok) throw new Error("Error al crear el nuevo filamento.");
                    const filGuardado = await resFil.json();
                    filamentoIdFinal = filGuardado.id;
                } else if (selectValue !== 'generico') {
                    filamentoIdFinal = parseInt(selectValue);
                }

                const payload = {
                    fechaCompra: document.getElementById('compra-fecha').value,
                    filamentoId: filamentoIdFinal,
                    descripcion: document.getElementById('compra-desc').value || 'Compra de Insumos',
                    cantidadGramos: parseInt(document.getElementById('compra-cantidad').value) || 0,
                    montoTotal: parseFloat(document.getElementById('compra-monto').value) || 0
                };

                const res = await fetchAuth(`${API_BASE}/compras-filamentos`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(payload)
                });
                if (!res.ok) throw new Error(`Error al registrar compra: ${res.status}`);
                
                compraForm.reset();
                document.getElementById('compra-fecha').value = new Date().toISOString().split('T')[0];
                selectCompraFilamento.dispatchEvent(new Event('change')); // ocultar campos
                
                mostrarToast("Compra registrada correctamente.");
                cargarCompras();
                if (payload.filamentoId) cargarFilamentos(); // Recargar stock si se asoció
            } catch (err) {
                mostrarToast(err.message || "Error al registrar compra.", 'error');
            } finally {
                btnSubmit.disabled = false;
                btnSubmit.textContent = 'Registrar Compra';
            }
        });
    }

    // =======================================================
    // --- CONEXIÓN HTTP 3: PEDIDOS Y KANBAN ---
    // =======================================================
    async function cargarPedidos() {
        mostrarSpinner(tablaVentasBody, 7);
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
            card.dataset.id = pedido.id;

            const badgeClass = pedido.estadoPago === 'PAGADO' ? 'badge-pagado' : (pedido.estadoPago === 'SENADO' ? 'badge-sena' : 'badge-debe');
            const textoPago = pedido.estadoPago === 'SENADO' ? `SEÑADO ($${pedido.montoSena})` : pedido.estadoPago.replace('_', ' ');

            let botonAccion = '';
            if (pedido.estadoProduccion === 'PENDIENTE_HACER')
                botonAccion += `<button class="btn-action" data-id="${pedido.id}" data-next="EN_PRODUCCION">Imprimir ▶</button>`;
            else if (pedido.estadoProduccion === 'EN_PRODUCCION')
                botonAccion += `<button class="btn-action" data-id="${pedido.id}" data-next="PENDIENTE_ENTREGA">Terminar ✔</button>`;
            else if (pedido.estadoProduccion === 'PENDIENTE_ENTREGA')
                botonAccion += `<button class="btn-action" data-id="${pedido.id}" data-next="ENTREGADO">Entregar 📦</button>`;

            let botonPagar = '';
            if (pedido.estadoPago !== 'PAGADO') {
                botonPagar = `<button class="btn-action btn-pagar" data-id="${pedido.id}" data-pago="PAGADO" style="background-color: var(--success-color); margin-left: 5px;">Pagar 💰</button>`;
            }

            let listaProductos = '';
            if (pedido.nombreProducto) {
                listaProductos = `<div class="kanban-producto"><span class="kanban-prod-qty">${pedido.cantidad || 1}x</span> ${pedido.nombreProducto}<span class="kanban-prod-mat">${pedido.materialColor || ''}</span></div>`;
            } else {
                listaProductos = `<div class="kanban-producto kanban-prod-vacio">Sin producto asignado</div>`;
            }
            if (pedido.detalles) {
                listaProductos += `<div style="font-size: 0.8rem; color: var(--text-muted); margin-top: -5px; margin-bottom: 10px; padding-left: 5px;">💬 ${pedido.detalles}</div>`;
            }

            card.innerHTML = `
                <div class="card-header">
                    <span class="card-title">${pedido.cliente}</span>
                    <span class="badge ${badgeClass}">${textoPago}</span>
                </div>
                <div class="card-body">
                    <p><strong>Entrega:</strong> ${pedido.fechaEntrega}</p>
                    ${listaProductos}
                </div>
                <div class="card-footer">
                    <span class="card-price">$${pedido.totalPedido}</span>
                    <div class="card-actions">
                        ${botonAccion}
                        ${botonPagar}
                    </div>
                </div>
            `;

            if (pedido.estadoProduccion === 'PENDIENTE_HACER') cardsPendiente.appendChild(card);
            else if (pedido.estadoProduccion === 'EN_PRODUCCION') cardsProgreso.appendChild(card);
            else if (pedido.estadoProduccion === 'PENDIENTE_ENTREGA') cardsEntrega.appendChild(card);
        });
        initSortableKanban();
    }

    // Delegación de eventos en el Kanban
    const kanbanBoard = document.querySelector('.kanban-board');
    if (kanbanBoard) {
        kanbanBoard.addEventListener('click', async (e) => {
            const btnProd = e.target.closest('.btn-action:not(.btn-pagar)');
            const btnPagar = e.target.closest('.btn-pagar');
            
            if (btnProd) {
                const id = btnProd.getAttribute('data-id');
                const nextState = btnProd.getAttribute('data-next');
                try {
                    const res = await fetchAuth(`${API_BASE}/pedidos/${id}/estado?nuevoEstado=${nextState}`, { method: 'PATCH' });
                    if (!res.ok) throw new Error();
                    const textos = { EN_PRODUCCION: 'pasado a Producción', PENDIENTE_ENTREGA: 'listo para entregar', ENTREGADO: 'marcado como Entregado' };
                    mostrarToast(`Pedido ${textos[nextState] || 'actualizado'}.`);
                    cargarPedidos();
                } catch {
                    mostrarToast("Error al actualizar el estado de producción.", 'error');
                }
            } else if (btnPagar) {
                const id = btnPagar.getAttribute('data-id');
                const estadoPago = btnPagar.getAttribute('data-pago');
                try {
                    const res = await fetchAuth(`${API_BASE}/pedidos/${id}/pago?nuevoEstado=${estadoPago}`, { method: 'PATCH' });
                    if (!res.ok) throw new Error();
                    mostrarToast(`Pedido marcado como Pagado.`);
                    cargarPedidos();
                } catch {
                    mostrarToast("Error al actualizar el estado de pago.", 'error');
                }
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
            tablaVentasBody.innerHTML = `<tr><td colspan="7" class="sin-resultados">${msg}</td></tr>`;
            return;
        }

        filtrados.forEach(p => {
            const row = document.createElement('tr');
            const textoPago = p.estadoPago === 'SENADO' ? `SEÑADO ($${p.montoSena})` : p.estadoPago.replace('_', ' ');
            const badgeClass = p.estadoPago === 'PAGADO' ? 'badge-pagado' : (p.estadoPago === 'SENADO' ? 'badge-sena' : 'badge-debe');
            const estadoProdLabel = p.estadoProduccion.replace(/_/g, ' ');

            const detallesHTML = p.detalles ? `<br><small style="color:var(--text-muted);font-style:italic;">💬 ${p.detalles}</small>` : '';

            const productoTexto = p.nombreProducto
                ? `<strong>${p.cantidad || 1}x</strong> ${p.nombreProducto}<br><small style="color:var(--text-muted)">${p.materialColor || '-'}</small>${detallesHTML}`
                : `<span style="color:var(--text-muted);font-style:italic">—</span>${detallesHTML}`;

            row.innerHTML = `
                <td><strong>${p.cliente}</strong></td>
                <td>${productoTexto}</td>
                <td>${p.fechaEntrega || '-'}</td>
                <td>$${p.totalPedido}</td>
                <td><span class="badge ${badgeClass}">${textoPago}</span></td>
                <td><span class="badge" style="background-color:var(--bg-input)">${estadoProdLabel}</span></td>
                <td class="td-actions">
                    <button class="btn-warning btn-edit-venta" data-id="${p.id}" style="padding:0.4rem 0.8rem;font-size:0.8rem;">✏️ Editar</button>
                    <button class="btn-danger btn-del-venta" data-id="${p.id}" style="padding:0.4rem 0.8rem;font-size:0.8rem;">🗑 Borrar</button>
                </td>
            `;
            tablaVentasBody.appendChild(row);
        });
    }

    // Delegación de eventos para eliminar o editar pedidos
    if (tablaVentasBody) {
        tablaVentasBody.addEventListener('click', async (e) => {
            const btnDel = e.target.closest('.btn-del-venta');
            if (btnDel) {
                const id = btnDel.getAttribute('data-id');
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
                return;
            }

            const btnEdit = e.target.closest('.btn-edit-venta');
            if (btnEdit) {
                const id = btnEdit.getAttribute('data-id');
                const pedido = pedidosCargados.find(p => p.id == id);
                if (pedido) editarPedido(pedido);
            }
        });
    }

    function editarPedido(pedido) {
        editPedidoId = pedido.id;
        document.getElementById('venta-cliente').value = pedido.cliente;
        document.getElementById('venta-entrega').value = pedido.fechaEntrega;
        
        let foundProd = productosCargados.find(p => p.nombre === pedido.nombreProducto);
        if (foundProd) {
            document.getElementById('venta-producto').value = foundProd.id;
            if (selectProducto) selectProducto.dispatchEvent(new Event('change'));
        } else if (pedido.nombreProducto) {
            document.getElementById('venta-producto').value = 'custom';
            if (selectProducto) selectProducto.dispatchEvent(new Event('change'));
            document.getElementById('venta-producto-custom').value = pedido.nombreProducto;
            document.getElementById('venta-precio-custom').value = (parseFloat(pedido.totalPedido) / (pedido.cantidad || 1)).toFixed(2);
        } else {
            document.getElementById('venta-producto').value = "";
            if (selectProducto) selectProducto.dispatchEvent(new Event('change'));
        }
        
        if (document.getElementById('venta-detalles')) document.getElementById('venta-detalles').value = pedido.detalles || '';
        
        // Llenar filamentos dinámicos
        filamentosContainer.innerHTML = '';
        if (pedido.filamentos && pedido.filamentos.length > 0) {
            pedido.filamentos.forEach(pf => {
                if (pf.filamento) agregarFilaFilamentoVenta(pf.filamento.id, pf.gramosUsados);
            });
        } else {
            agregarFilaFilamentoVenta();
        }

        selectEstadoPago.value = pedido.estadoPago;
        if (pedido.estadoPago === 'SENADO') {
            groupMontoSena.classList.remove('hidden');
            inputMontoSena.value = pedido.montoSena;
        } else {
            groupMontoSena.classList.add('hidden');
            inputMontoSena.value = '';
        }

        const btnSubmit = document.getElementById('btn-submit-venta');
        btnSubmit.textContent = 'Actualizar Pedido';

        let btnCancel = document.getElementById('btn-cancel-venta');
        if (!btnCancel) {
            btnCancel = document.createElement('button');
            btnCancel.id = 'btn-cancel-venta';
            btnCancel.type = 'button';
            btnCancel.className = 'btn-secondary btn-inline';
            btnCancel.textContent = 'Cancelar';
            btnCancel.style.marginLeft = '10px';
            btnCancel.onclick = cancelarEdicionPedido;
            btnSubmit.parentNode.appendChild(btnCancel);
        }
        btnCancel.style.display = 'inline-block';

        window.scrollTo({ top: 0, behavior: 'smooth' });
    }

    function cancelarEdicionPedido() {
        editPedidoId = null;
        ventaForm.reset();
        if (selectProducto) selectProducto.dispatchEvent(new Event('change'));
        filamentosContainer.innerHTML = '';
        agregarFilaFilamentoVenta();
        groupMontoSena.classList.add('hidden');
        document.getElementById('btn-submit-venta').textContent = 'Crear Pedido';
        const btnCancel = document.getElementById('btn-cancel-venta');
        if (btnCancel) btnCancel.style.display = 'none';
    }

    // =======================================================
    // --- HISTORIAL DE PEDIDOS ENTREGADOS ---
    // =======================================================
    function renderizarHistorial() {
        const grid = document.getElementById('historial-grid');
        if (!grid) return;

        const entregados = pedidosCargados.filter(p => p.estadoProduccion === 'ENTREGADO');

        // Actualizar resumen
        const SALDO_INICIAL = 81000; // Ajuste manual por pedidos viejos no registrados
        
        const totalFacturado = entregados.reduce((sum, p) => sum + parseFloat(p.totalPedido || 0), 0) + SALDO_INICIAL;
        const totalCobrado = entregados
            .filter(p => p.estadoPago === 'PAGADO')
            .reduce((sum, p) => sum + parseFloat(p.totalPedido || 0), 0)
            + entregados
            .filter(p => p.estadoPago === 'SENADO')
            .reduce((sum, p) => sum + parseFloat(p.montoSena || 0), 0)
            + SALDO_INICIAL;
            
        const totalGastos = comprasCargadas.reduce((sum, c) => sum + parseFloat(c.montoTotal || 0), 0);
        const saldoNeto = totalCobrado - totalGastos;

        const elTotalPed = document.getElementById('hist-total-pedidos');
        const elFacturado = document.getElementById('hist-total-facturado');
        const elCobrado   = document.getElementById('hist-total-cobrado');
        const elGastos    = document.getElementById('hist-total-gastos');
        const elSaldoNeto = document.getElementById('hist-saldo-neto');
        
        if (elTotalPed)  elTotalPed.textContent  = entregados.length;
        if (elFacturado) elFacturado.textContent = `$${totalFacturado.toFixed(2)}`;
        if (elCobrado)   elCobrado.textContent   = `$${totalCobrado.toFixed(2)}`;
        if (elGastos)    elGastos.textContent    = `$${totalGastos.toFixed(2)}`;
        if (elSaldoNeto) elSaldoNeto.textContent = `$${saldoNeto.toFixed(2)}`;

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

            let listaProductos = '';
            if (p.nombreProducto) {
                listaProductos = '<ul style="margin: 5px 0 0 15px; padding: 0; font-size: 0.85rem; color: var(--text-muted);">';
                listaProductos += `<li>${p.cantidad || 1}x ${p.nombreProducto}</li>`;
                listaProductos += '</ul>';
            }

            const card = document.createElement('div');
            card.className = 'historial-card';
            card.innerHTML = `
                <div class="hc-cliente">${p.cliente}</div>
                <div class="hc-info">
                    <span>📦 Entregado: ${p.fechaEntrega || '-'}</span>
                    <span>🎨 Material: ${p.materialColor || '-'}</span>
                    ${listaProductos}
                </div>
                <div class="hc-footer">
                    <span class="hc-total">$${p.totalPedido}</span>
                    <span class="badge ${badgeClass}">${textoPago}</span>
                </div>
                <div class="hc-actions">
                    <button class="btn-pdf btn-hist-pdf" data-id="${p.id}">📄 PDF</button>
                    <button class="btn-danger btn-hist-del" data-id="${p.id}" style="padding:0.4rem 0.8rem;font-size:0.8rem;">🗑 Borrar</button>
                </div>
            `;
            grid.appendChild(card);
        });

        // Delegación de eventos para borrar y PDF en el historial
        grid.querySelectorAll('.btn-hist-del').forEach(btn => {
            btn.addEventListener('click', async () => {
                const id = btn.getAttribute('data-id');
                const ok = await confirmar('¿Seguro que querés eliminar este pedido del historial? Esta acción no se puede deshacer.');
                if (!ok) return;
                try {
                    const res = await fetchAuth(`${API_BASE}/pedidos/${id}`, { method: 'DELETE' });
                    if (!res.ok) throw new Error(`Error ${res.status}`);
                    mostrarToast('Pedido eliminado del historial.');
                    cargarPedidos();
                } catch (err) {
                    mostrarToast(`No se pudo eliminar: ${err.message}`, 'error');
                }
            });
        });

        grid.querySelectorAll('.btn-hist-pdf').forEach(btn => {
            btn.addEventListener('click', () => {
                const id = parseInt(btn.getAttribute('data-id'));
                const pedido = filtrados.find(p => p.id === id);
                if (pedido) generarPdfPedido(pedido);
            });
        });
    }

    // =======================================================
    // --- GENERADOR DE PDF (comprobante para el cliente) ---
    // =======================================================
    function generarPdfPedido(pedido) {
        const textoPago = pedido.estadoPago === 'SENADO'
            ? `Señado ($${pedido.montoSena})`
            : pedido.estadoPago === 'PAGADO'
            ? 'Pagado Total'
            : 'No Pagado';

        const fechaPedidoStr = pedido.fechaPedido
            ? new Date(pedido.fechaPedido).toLocaleDateString('es-AR', { day: '2-digit', month: '2-digit', year: 'numeric' })
            : '-';

        const printArea = document.getElementById('print-area');
        printArea.innerHTML = `
            <div class="comprobante">
                <div class="comp-header">
                    <h1>LUMA</h1>
                    <p class="comp-subtitle">Impresión 3D Personalizada</p>
                </div>
                <div class="comp-divider"></div>
                <div class="comp-section">
                    <p><span class="comp-label">Cliente:</span> ${pedido.cliente}</p>
                    <p><span class="comp-label">Fecha del pedido:</span> ${fechaPedidoStr}</p>
                    <p><span class="comp-label">Fecha de entrega:</span> ${pedido.fechaEntrega || '-'}</p>
                </div>
                <div class="comp-divider"></div>
                <div class="comp-section">
                    <p><span class="comp-label">Material / Color:</span> ${pedido.materialColor || '-'}</p>
                    <p><span class="comp-label">Estado de producción:</span> Entregado ✔</p>
                </div>
                <div class="comp-divider"></div>
                <div class="comp-section comp-totales">
                    <p><span class="comp-label">Estado de pago:</span> ${textoPago}</p>
                    <p class="comp-total-linea"><span class="comp-label">TOTAL:</span> <strong>$${pedido.totalPedido}</strong></p>
                </div>
                <div class="comp-footer">
                    <p>¡Gracias por tu compra!</p>
                </div>
            </div>
        `;
        window.print();
    }

    if (ventaForm) {
        ventaForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const btnSubmit = document.getElementById('btn-submit-venta');
            btnSubmit.disabled = true;
            btnSubmit.textContent = 'Creando...';

            const esCustom = selectProducto.value === 'custom';
            const prodId = parseInt(selectProducto.value);
            const prodRef = productosCargados.find(p => p.id === prodId);
            const cantidad = parseInt(document.getElementById('venta-cantidad').value) || 1;
            
            let totalCalculado = 0;
            let nombreProdFinal = null;

            if (esCustom) {
                const precioUnidad = parseFloat(document.getElementById('venta-precio-custom').value) || 0;
                totalCalculado = (precioUnidad * cantidad).toFixed(2);
                nombreProdFinal = document.getElementById('venta-producto-custom').value;
            } else {
                totalCalculado = prodRef ? (parseFloat(prodRef.precioBase) * cantidad).toFixed(2) : 0;
                nombreProdFinal = prodRef ? prodRef.nombre : null;
            }

            const filamentosPayload = [];
            const nombresMateriales = [];
            document.querySelectorAll('.venta-fil-select').forEach((sel, i) => {
                const gramosInput = document.querySelectorAll('.venta-fil-gramos')[i];
                const filId = parseInt(sel.value);
                const gramos = parseInt(gramosInput.value) || 0;
                if (filId && gramos > 0) {
                    filamentosPayload.push({
                        filamento: { id: filId },
                        gramosUsados: gramos
                    });
                    const optText = sel.options[sel.selectedIndex].text.split(' - ')[0]; // Tomar el nombre base
                    nombresMateriales.push(optText);
                }
            });

            const payload = {
                cliente: document.getElementById('venta-cliente').value,
                fechaEntrega: document.getElementById('venta-entrega').value,
                totalPedido: parseFloat(totalCalculado),
                estadoPago: selectEstadoPago.value,
                montoSena: selectEstadoPago.value === 'SENADO' ? parseFloat(inputMontoSena.value) || 0 : 0,
                estadoProduccion: 'PENDIENTE_HACER',
                nombreProducto: nombreProdFinal,
                cantidad: cantidad,
                materialColor: nombresMateriales.join(' + '),
                filamentos: filamentosPayload,
                detalles: document.getElementById('venta-detalles') ? document.getElementById('venta-detalles').value : ''
            };

            try {
                let url = `${API_BASE}/pedidos`;
                let method = 'POST';
                if (editPedidoId) {
                    url = `${API_BASE}/pedidos/${editPedidoId}`;
                    method = 'PUT';
                    // Conservamos el estado de produccion anterior en modo edicion
                    const pedidoOrig = pedidosCargados.find(p => p.id === editPedidoId);
                    if (pedidoOrig) payload.estadoProduccion = pedidoOrig.estadoProduccion;
                }

                const res = await fetchAuth(url, {
                    method: method,
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(payload)
                });
                if (!res.ok) {
                    const err = await res.json().catch(() => ({}));
                    throw new Error(err.error || `Error ${res.status}`);
                }
                
                cancelarEdicionPedido();
                mostrarToast(editPedidoId ? "Pedido actualizado." : `Pedido para ${payload.cliente} creado. Total: $${totalCalculado}`);
                cargarPedidos();
            } catch (err) {
                mostrarToast(err.message || "Error al guardar el pedido.", 'error');
            } finally {
                btnSubmit.disabled = false;
                btnSubmit.textContent = editPedidoId ? 'Actualizar Pedido' : 'Crear Pedido';
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
        cargarCompras();
        
        connectWebSocket();
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
        comprasCargadas = [];
        
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

        if (button.getAttribute('data-section') === 'estadisticas') {
            renderCharts();
        }

        // Responsive: Cerrar sidebar al hacer clic en móvil
        const sidebarEl = document.getElementById('sidebar');
        const overlayEl = document.getElementById('sidebar-overlay');
        if (sidebarEl && sidebarEl.classList.contains('open')) {
            sidebarEl.classList.remove('open');
            if (overlayEl) overlayEl.classList.remove('active');
        }
    }));

    // --- RESPONSIVE MOBILE MENU ---
    const mobileMenuBtn = document.getElementById('mobile-menu-btn');
    const sidebarEl = document.getElementById('sidebar');
    const overlayEl = document.getElementById('sidebar-overlay');

    if (mobileMenuBtn && sidebarEl && overlayEl) {
        mobileMenuBtn.addEventListener('click', () => {
            sidebarEl.classList.add('open');
            overlayEl.classList.add('active');
        });
        overlayEl.addEventListener('click', () => {
            sidebarEl.classList.remove('open');
            overlayEl.classList.remove('active');
        });
    }

    // --- FUNCIONES EXTRA (DRAG&DROP, CHARTS, WS) ---
    let sortables = [];
    function initSortableKanban() {
        if (typeof Sortable === 'undefined') return;
        sortables.forEach(s => s.destroy());
        sortables = [];
        const opts = {
            group: 'kanban',
            animation: 150,
            onEnd: async function (evt) {
                const itemEl = evt.item;
                const pedidoId = itemEl.dataset.id;
                const toListId = evt.to.id;

                let nuevoEstado = '';
                if (toListId === 'cards-pendiente') nuevoEstado = 'PENDIENTE_HACER';
                else if (toListId === 'cards-progreso') nuevoEstado = 'EN_PRODUCCION';
                else if (toListId === 'cards-entrega') nuevoEstado = 'PENDIENTE_ENTREGA';

                if (!nuevoEstado) return;
                const pedido = pedidosCargados.find(p => p.id == pedidoId);
                if (pedido && pedido.estadoProduccion !== nuevoEstado) {
                    try {
                        pedido.estadoProduccion = nuevoEstado;
                        const res = await fetchAuth(`${API_BASE}/pedidos/${pedidoId}/estado?nuevoEstado=${nuevoEstado}`, { method: 'PATCH' });
                        if (!res.ok) throw new Error();
                    } catch (e) {
                        cargarPedidos();
                    }
                }
            }
        };
        sortables.push(Sortable.create(cardsPendiente, opts));
        sortables.push(Sortable.create(cardsProgreso, opts));
        sortables.push(Sortable.create(cardsEntrega, opts));
    }

    let chartVentas = null;
    let chartProduccion = null;
    function renderCharts() {
        if (typeof Chart === 'undefined') return;
        const ctxVentas = document.getElementById('chart-ventas');
        const ctxProd = document.getElementById('chart-produccion');
        if (!ctxVentas || !ctxProd) return;

        let pagado = 0, senado = 0, nopagado = 0;
        let pending = 0, prod = 0, entrega = 0, entregado = 0;

        pedidosCargados.forEach(p => {
            if(p.estadoPago === 'PAGADO') pagado++;
            else if(p.estadoPago === 'SENADO') senado++;
            else nopagado++;

            if(p.estadoProduccion === 'PENDIENTE_HACER') pending++;
            else if(p.estadoProduccion === 'EN_PRODUCCION') prod++;
            else if(p.estadoProduccion === 'PENDIENTE_ENTREGA') entrega++;
            else entregado++;
        });

        if (chartVentas) chartVentas.destroy();
        chartVentas = new Chart(ctxVentas, {
            type: 'doughnut',
            data: {
                labels: ['Pagado', 'Señado', 'No Pagado'],
                datasets: [{ data: [pagado, senado, nopagado], backgroundColor: ['#22c55e', '#f59e0b', '#ef4444'], borderWidth: 0 }]
            },
            options: { plugins: { legend: { labels: { color: '#f4f4f5' } } } }
        });

        if (chartProduccion) chartProduccion.destroy();
        chartProduccion = new Chart(ctxProd, {
            type: 'bar',
            data: {
                labels: ['Pendiente', 'En Prod.', 'P. Entrega', 'Entregado'],
                datasets: [{ label: 'Pedidos', data: [pending, prod, entrega, entregado], backgroundColor: '#3b82f6', borderRadius: 4 }]
            },
            options: { scales: { y: { beginAtZero: true, ticks: { color: '#f4f4f5' } }, x: { ticks: { color: '#f4f4f5' } } }, plugins: { legend: { labels: { color: '#f4f4f5' } } } }
        });
    }

    let stompClient = null;
    function connectWebSocket() {
        if (typeof SockJS === 'undefined' || typeof window.Stomp === 'undefined') return;
        const socket = new SockJS('/ws');
        stompClient = window.Stomp.over(socket);
        stompClient.debug = null;
        stompClient.connect({}, function (frame) {
            stompClient.subscribe('/topic/pedidos', function (mensaje) {
                cargarPedidos();
            });
        }, function(err) {
            setTimeout(connectWebSocket, 5000);
        });
    }
});
