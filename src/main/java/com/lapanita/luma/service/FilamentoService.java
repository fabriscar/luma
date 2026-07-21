package com.lapanita.luma.service;

import com.lapanita.luma.model.Filamento;
import com.lapanita.luma.repository.FilamentoRepository;
import com.lapanita.luma.repository.PedidoFilamentoRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Service
public class FilamentoService {

    @Autowired
    private FilamentoRepository filamentoRepository;

    @Autowired
    private PedidoFilamentoRepository pedidoFilamentoRepository;

    public List<Filamento> obtenerTodos() {
        return filamentoRepository.findAll();
    }

    public Filamento obtenerPorId(Integer id) {
        return filamentoRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Material no encontrado con ID: " + id));
    }

    @Transactional
    public Filamento guardar(Filamento filamento) {
        return filamentoRepository.save(filamento);
    }

    @Transactional
    public void eliminar(Integer id) {
        // Verificar si algún pedido usa este filamento antes de eliminar
        if (pedidoFilamentoRepository.existsByFilamentoId(id)) {
            throw new RuntimeException(
                "No se puede eliminar este filamento porque está siendo usado en uno o más pedidos. " +
                "Primero eliminá o editá los pedidos que lo usan."
            );
        }
        filamentoRepository.deleteById(id);
    }
}