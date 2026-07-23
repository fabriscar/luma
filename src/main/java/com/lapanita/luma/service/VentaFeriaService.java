package com.lapanita.luma.service;

import com.lapanita.luma.model.ItemStockFeria;
import com.lapanita.luma.model.StockFeriaColor;
import com.lapanita.luma.model.VentaFeria;
import com.lapanita.luma.repository.ItemStockFeriaRepository;
import com.lapanita.luma.repository.StockFeriaColorRepository;
import com.lapanita.luma.repository.VentaFeriaRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;

@Service
public class VentaFeriaService {

    @Autowired
    private VentaFeriaRepository ventaFeriaRepository;

    @Autowired
    private ItemStockFeriaRepository itemRepository;

    @Autowired
    private StockFeriaColorRepository colorRepository;

    public List<VentaFeria> obtenerTodas() {
        return ventaFeriaRepository.findAll();
    }

    /**
     * Registra una venta de feria:
     * - Descuenta la cantidad del color correspondiente en el stock.
     * - Crea el registro de VentaFeria para el historial financiero.
     */
    @Transactional
    public VentaFeria vender(Integer itemId, Integer colorId, Integer cantidad, BigDecimal precioUnit, LocalDate fecha) {
        ItemStockFeria item = itemRepository.findById(itemId)
                .orElseThrow(() -> new RuntimeException("Ítem de stock no encontrado: " + itemId));

        StockFeriaColor colorEntry = colorRepository.findById(colorId)
                .orElseThrow(() -> new RuntimeException("Color no encontrado: " + colorId));

        if (colorEntry.getCantidad() < cantidad) {
            throw new RuntimeException("Stock insuficiente. Disponible: " + colorEntry.getCantidad());
        }

        // Descontar del stock
        colorEntry.setCantidad(colorEntry.getCantidad() - cantidad);
        colorRepository.save(colorEntry);

        // Registrar la venta
        VentaFeria venta = new VentaFeria();
        venta.setItemStockFeria(item);
        venta.setNombreProducto(item.getNombre());
        venta.setColor(colorEntry.getColor());
        venta.setCantidad(cantidad);
        venta.setPrecioUnit(precioUnit);
        venta.setPrecioTotal(precioUnit.multiply(BigDecimal.valueOf(cantidad)));
        venta.setFechaVenta(fecha != null ? fecha : LocalDate.now());

        return ventaFeriaRepository.save(venta);
    }

    @Transactional
    public void eliminar(Integer id) {
        ventaFeriaRepository.deleteById(id);
    }
}
