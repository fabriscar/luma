package com.lapanita.luma.repository;

import com.lapanita.luma.model.CompraFilamento;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface CompraFilamentoRepository extends JpaRepository<CompraFilamento, Integer> {
}
