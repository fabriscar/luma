package com.lapanita.luma.repository;

import com.lapanita.luma.model.ProductoStl;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface ProductoStlRepository extends JpaRepository<ProductoStl, Integer> {
}