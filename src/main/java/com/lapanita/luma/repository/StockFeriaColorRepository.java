package com.lapanita.luma.repository;

import com.lapanita.luma.model.StockFeriaColor;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface StockFeriaColorRepository extends JpaRepository<StockFeriaColor, Integer> {
}
