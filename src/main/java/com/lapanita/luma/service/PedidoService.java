package com.lapanita.luma.service;

import com.lapanita.luma.model.Pedido;
import com.lapanita.luma.model.EstadoProduccion;
import com.lapanita.luma.repository.PedidoRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.lapanita.luma.model.PedidoFilamento;
import com.lapanita.luma.model.Filamento;
import com.lapanita.luma.repository.FilamentoRepository;
import java.util.List;

@Service
public class PedidoService {

    @Autowired
    private PedidoRepository pedidoRepository;

    @Autowired
    private FilamentoRepository filamentoRepository;

    public List<Pedido> obtenerTodos() {
        return pedidoRepository.findAll();
    }

    public Pedido obtenerPorId(Integer id) {
        return pedidoRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Pedido no encontrado con ID: " + id));
    }

    @Transactional
    public Pedido guardar(Pedido pedido) {
        if (pedido.getFilamentos() != null) {
            for (PedidoFilamento pf : pedido.getFilamentos()) {
                pf.setPedido(pedido);
                if (pf.getFilamento() != null && pf.getFilamento().getId() != null) {
                    Filamento f = filamentoRepository.findById(pf.getFilamento().getId())
                            .orElseThrow(() -> new RuntimeException("Filamento no encontrado"));
                    f.setCantidadGramos(f.getCantidadGramos() - pf.getGramosUsados());
                    filamentoRepository.save(f);
                }
            }
        }
        return pedidoRepository.save(pedido);
    }

    @Transactional
    public Pedido actualizar(Integer id, Pedido pedidoActualizado) {
        Pedido pedido = obtenerPorId(id);

        // 1. Restaurar stock de los filamentos anteriores
        if (pedido.getFilamentos() != null) {
            for (PedidoFilamento pf : pedido.getFilamentos()) {
                if (pf.getFilamento() != null && pf.getFilamento().getId() != null) {
                    Filamento f = filamentoRepository.findById(pf.getFilamento().getId()).orElse(null);
                    if (f != null) {
                        f.setCantidadGramos(f.getCantidadGramos() + pf.getGramosUsados());
                        filamentoRepository.save(f);
                    }
                }
            }
            pedido.getFilamentos().clear();
        }

        // 2. Descontar stock de los nuevos filamentos
        if (pedidoActualizado.getFilamentos() != null) {
            for (PedidoFilamento pf : pedidoActualizado.getFilamentos()) {
                pf.setPedido(pedido);
                if (pf.getFilamento() != null && pf.getFilamento().getId() != null) {
                    Filamento f = filamentoRepository.findById(pf.getFilamento().getId())
                            .orElseThrow(() -> new RuntimeException("Filamento no encontrado"));
                    f.setCantidadGramos(f.getCantidadGramos() - pf.getGramosUsados());
                    filamentoRepository.save(f);
                }
                pedido.getFilamentos().add(pf);
            }
        }

        // 3. Actualizar demás campos
        pedido.setCliente(pedidoActualizado.getCliente());
        pedido.setFechaEntrega(pedidoActualizado.getFechaEntrega());
        pedido.setTotalPedido(pedidoActualizado.getTotalPedido());
        pedido.setEstadoPago(pedidoActualizado.getEstadoPago());
        pedido.setMontoSena(pedidoActualizado.getMontoSena());
        pedido.setNombreProducto(pedidoActualizado.getNombreProducto());
        pedido.setCantidad(pedidoActualizado.getCantidad());
        pedido.setMaterialColor(pedidoActualizado.getMaterialColor());
        pedido.setDetalles(pedidoActualizado.getDetalles());

        return pedidoRepository.save(pedido);
    }

    // Cambiar el estado en el Kanban (Ej: pasar de PENDIENTE_HACER a EN_PRODUCCION)
    @Transactional
    public Pedido actualizarEstadoProduccion(Integer id, EstadoProduccion nuevoEstado) {
        Pedido pedido = obtenerPorId(id);
        pedido.setEstadoProduccion(nuevoEstado);
        return pedidoRepository.save(pedido);
    }

    @Transactional
    public void eliminar(Integer id) {
        Pedido pedido = obtenerPorId(id);
        if (pedido.getFilamentos() != null) {
            for (PedidoFilamento pf : pedido.getFilamentos()) {
                if (pf.getFilamento() != null && pf.getFilamento().getId() != null) {
                    Filamento f = filamentoRepository.findById(pf.getFilamento().getId()).orElse(null);
                    if (f != null) {
                        f.setCantidadGramos(f.getCantidadGramos() + pf.getGramosUsados());
                        filamentoRepository.save(f);
                    }
                }
            }
        }
        pedidoRepository.deleteById(id);
    }
}
