package com.lapanita.luma.repository;

import com.lapanita.luma.model.ItemStockFeria;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface ItemStockFeriaRepository extends JpaRepository<ItemStockFeria, Integer> {
}
