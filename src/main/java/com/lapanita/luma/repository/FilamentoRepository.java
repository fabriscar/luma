package com.lapanita.luma.repository;

import com.lapanita.luma.model.Filamento;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface FilamentoRepository extends JpaRepository<Filamento, Integer> {
}
