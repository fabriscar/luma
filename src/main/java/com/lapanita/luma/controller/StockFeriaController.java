package com.lapanita.luma.controller;

import com.lapanita.luma.model.ItemStockFeria;
import com.lapanita.luma.model.StockFeriaColor;
import com.lapanita.luma.service.StockFeriaService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.math.BigDecimal;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/stock-feria")
@CrossOrigin(origins = "*")
public class StockFeriaController {

    @Autowired
    private StockFeriaService stockFeriaService;

    @GetMapping
    public List<ItemStockFeria> listar() {
        return stockFeriaService.obtenerTodos();
    }

    @GetMapping("/{id}")
    public ResponseEntity<ItemStockFeria> obtenerPorId(@PathVariable Integer id) {
        return ResponseEntity.ok(stockFeriaService.obtenerPorId(id));
    }

    @PostMapping
    public ResponseEntity<ItemStockFeria> crear(@RequestBody Map<String, Object> body) {
        try {
            ItemStockFeria guardado = parsearYGuardar(null, body);
            return new ResponseEntity<>(guardado, HttpStatus.CREATED);
        } catch (Exception e) {
            return new ResponseEntity<>(HttpStatus.BAD_REQUEST);
        }
    }

    @PutMapping("/{id}")
    public ResponseEntity<ItemStockFeria> actualizar(@PathVariable Integer id, @RequestBody Map<String, Object> body) {
        try {
            ItemStockFeria actualizado = parsearYGuardar(id, body);
            return ResponseEntity.ok(actualizado);
        } catch (RuntimeException e) {
            return new ResponseEntity<>(HttpStatus.NOT_FOUND);
        }
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> eliminar(@PathVariable Integer id) {
        stockFeriaService.eliminar(id);
        return ResponseEntity.noContent().build();
    }

    // ----------------------------------------------------------------
    // Helper: parsea el body JSON y delega al service
    // ----------------------------------------------------------------
    @SuppressWarnings("unchecked")
    private ItemStockFeria parsearYGuardar(Integer id, Map<String, Object> body) {
        String nombre      = (String) body.get("nombre");
        String descripcion = (String) body.getOrDefault("descripcion", null);
        BigDecimal precio  = new BigDecimal(body.get("precioVenta").toString());

        List<Map<String, Object>> rawColores = (List<Map<String, Object>>) body.getOrDefault("colores", new ArrayList<>());
        List<StockFeriaColor> colores = new ArrayList<>();
        for (Map<String, Object> c : rawColores) {
            String colorNombre = (String) c.get("color");
            Integer cantidad   = Integer.valueOf(c.get("cantidad").toString());
            colores.add(new StockFeriaColor(colorNombre, cantidad, null));
        }

        if (id == null) {
            return stockFeriaService.guardar(nombre, descripcion, precio, colores);
        } else {
            return stockFeriaService.actualizar(id, nombre, descripcion, precio, colores);
        }
    }
}
