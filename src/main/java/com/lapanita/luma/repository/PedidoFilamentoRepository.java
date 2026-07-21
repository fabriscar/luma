package com.lapanita.luma.repository;

import com.lapanita.luma.model.PedidoFilamento;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface PedidoFilamentoRepository extends JpaRepository<PedidoFilamento, Integer> {

    /**
     * Verifica si existe algún registro en pedidos_filamentos que referencie al filamento dado.
     * Se usa antes de eliminar un filamento para evitar FK constraint violations.
     */
    boolean existsByFilamentoId(Integer filamentoId);
}
