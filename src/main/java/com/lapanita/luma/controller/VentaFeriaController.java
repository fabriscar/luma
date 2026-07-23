package com.lapanita.luma.controller;

import com.lapanita.luma.model.VentaFeria;
import com.lapanita.luma.service.VentaFeriaService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/ventas-feria")
@CrossOrigin(origins = "*")
public class VentaFeriaController {

    @Autowired
    private VentaFeriaService ventaFeriaService;

    @GetMapping
    public List<VentaFeria> listar() {
        return ventaFeriaService.obtenerTodas();
    }

    @PostMapping
    @SuppressWarnings("unchecked")
    public ResponseEntity<?> registrarVenta(@RequestBody Map<String, Object> body) {
        try {
            Integer itemId   = Integer.valueOf(body.get("itemId").toString());
            Integer colorId  = Integer.valueOf(body.get("colorId").toString());
            Integer cantidad = Integer.valueOf(body.get("cantidad").toString());
            BigDecimal precio = new BigDecimal(body.get("precioUnit").toString());
            LocalDate fecha = body.get("fecha") != null && !body.get("fecha").toString().isBlank()
                    ? LocalDate.parse(body.get("fecha").toString())
                    : LocalDate.now();

            VentaFeria venta = ventaFeriaService.vender(itemId, colorId, cantidad, precio, fecha);
            return new ResponseEntity<>(venta, HttpStatus.CREATED);
        } catch (RuntimeException e) {
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        }
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> eliminar(@PathVariable Integer id) {
        ventaFeriaService.eliminar(id);
        return ResponseEntity.noContent().build();
    }
}
