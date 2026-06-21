package com.lapanita.luma.service;

import com.lapanita.luma.model.Filamento;
import com.lapanita.luma.repository.FilamentoRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Service
public class FilamentoService {

    @Autowired
    private FilamentoRepository filamentoRepository; // <-- El repositorio inyectado correctamente

    // CORREGIDO: Usamos obtenerTodos() para que coincida con el FilamentoController
    public List<Filamento> obtenerTodos() {
        return filamentoRepository.findAll(); // <-- Cambiado de filamentosStock a filamentoRepository
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
        filamentoRepository.deleteById(id);
    }
}