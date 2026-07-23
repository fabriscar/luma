package com.lapanita.luma.repository;

import com.lapanita.luma.model.VentaFeria;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface VentaFeriaRepository extends JpaRepository<VentaFeria, Integer> {
}
