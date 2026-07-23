package com.lapanita.luma.service;

import com.lapanita.luma.model.ItemStockFeria;
import com.lapanita.luma.model.StockFeriaColor;
import com.lapanita.luma.repository.ItemStockFeriaRepository;
import com.lapanita.luma.repository.StockFeriaColorRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.util.List;

@Service
public class StockFeriaService {

    @Autowired
    private ItemStockFeriaRepository itemRepository;

    @Autowired
    private StockFeriaColorRepository colorRepository;

    public List<ItemStockFeria> obtenerTodos() {
        return itemRepository.findAll();
    }

    public ItemStockFeria obtenerPorId(Integer id) {
        return itemRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Ítem de stock no encontrado con ID: " + id));
    }

    @Transactional
    public ItemStockFeria guardar(String nombre, String descripcion, BigDecimal precioVenta, List<StockFeriaColor> colores) {
        ItemStockFeria item = new ItemStockFeria(nombre, descripcion, precioVenta);
        for (StockFeriaColor c : colores) {
            c.setItemStockFeria(item);
        }
        item.setColores(colores);
        return itemRepository.save(item);
    }

    @Transactional
    public ItemStockFeria actualizar(Integer id, String nombre, String descripcion, BigDecimal precioVenta, List<StockFeriaColor> colores) {
        ItemStockFeria item = obtenerPorId(id);
        item.setNombre(nombre);
        item.setDescripcion(descripcion);
        item.setPrecioVenta(precioVenta);

        // Limpiar colores anteriores y reemplazar (orphanRemoval se encarga de eliminar los viejos)
        item.getColores().clear();
        for (StockFeriaColor c : colores) {
            c.setItemStockFeria(item);
            item.getColores().add(c);
        }
        return itemRepository.save(item);
    }

    @Transactional
    public void eliminar(Integer id) {
        itemRepository.deleteById(id);
    }
}
