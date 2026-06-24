package com.lapanita.luma.service;

import com.lapanita.luma.model.CompraFilamento;
import com.lapanita.luma.model.Filamento;
import com.lapanita.luma.repository.CompraFilamentoRepository;
import com.lapanita.luma.repository.FilamentoRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Service
public class CompraFilamentoService {

    @Autowired
    private CompraFilamentoRepository compraFilamentoRepository;

    @Autowired
    private FilamentoRepository filamentoRepository;

    @Transactional(readOnly = true)
    public List<CompraFilamento> obtenerTodas() {
        return compraFilamentoRepository.findAll();
    }

    @Transactional
    public CompraFilamento registrarCompra(CompraFilamento compra) {
        CompraFilamento guardada = compraFilamentoRepository.save(compra);

        // Si se vinculó a un filamento específico, aumentar su stock
        if (compra.getFilamentoId() != null && compra.getCantidadGramos() != null && compra.getCantidadGramos() > 0) {
            filamentoRepository.findById(compra.getFilamentoId()).ifPresent(filamento -> {
                filamento.setCantidadGramos(filamento.getCantidadGramos() + compra.getCantidadGramos());
                filamentoRepository.save(filamento);
            });
        }

        return guardada;
    }

    @Transactional
    public void eliminar(Integer id) {
        compraFilamentoRepository.findById(id).ifPresent(compra -> {
            // Si borramos la compra, restamos el stock (opcional, pero buena práctica si fue un error)
            if (compra.getFilamentoId() != null && compra.getCantidadGramos() != null && compra.getCantidadGramos() > 0) {
                filamentoRepository.findById(compra.getFilamentoId()).ifPresent(filamento -> {
                    filamento.setCantidadGramos(filamento.getCantidadGramos() - compra.getCantidadGramos());
                    filamentoRepository.save(filamento);
                });
            }
            compraFilamentoRepository.delete(compra);
        });
    }
}
