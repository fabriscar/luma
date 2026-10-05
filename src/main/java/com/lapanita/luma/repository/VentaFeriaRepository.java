package com.lapanita.luma.repository;

import com.lapanita.luma.model.VentaFeria;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

@Repository
public interface VentaFeriaRepository extends JpaRepository<VentaFeria, Integer> {

    /** Desvincula las ventas de un ítem para poder borrarlo (las ventas guardan el nombre en texto) */
    @Modifying
    @Query("update VentaFeria v set v.itemStockFeria = null where v.itemStockFeria.id = :itemId")
    void desvincularDeItem(@Param("itemId") Integer itemId);
}
