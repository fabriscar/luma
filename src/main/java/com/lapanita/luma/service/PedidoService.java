package com.lapanita.luma.service;

import com.lapanita.luma.model.Pedido;
import com.lapanita.luma.model.EstadoProduccion;
import com.lapanita.luma.repository.PedidoRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Service
public class PedidoService {

    @Autowired
    private PedidoRepository pedidoRepository;

    public List<Pedido> obtenerTodos() {
        return pedidoRepository.findAll();
    }

    public Pedido obtenerPorId(Integer id) {
        return pedidoRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Pedido no encontrado con ID: " + id));
    }

    @Transactional
    public Pedido guardar(Pedido pedido) {
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
        pedidoRepository.deleteById(id);
    }
}
