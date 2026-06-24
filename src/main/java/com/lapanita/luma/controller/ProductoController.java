package com.lapanita.luma.controller;

import com.lapanita.luma.model.Producto;
import com.lapanita.luma.service.ProductoService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.core.io.Resource;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.math.BigDecimal;
import java.util.List;

@RestController
@RequestMapping("/api/productos")
@CrossOrigin(origins = "*")
public class ProductoController {

    @Autowired
    private ProductoService productoService;

    @GetMapping
    public List<Producto> listar() {
        return productoService.obtenerTodos();
    }

    @GetMapping("/{id}")
    public ResponseEntity<Producto> obtenerPorId(@PathVariable Integer id) {
        return ResponseEntity.ok(productoService.obtenerPorId(id));
    }

    /**
     * Endpoint para servir la foto de un producto redirigiendo a Cloudinary.
     * El frontend puede seguir usando <img src="/api/productos/{id}/foto">.
     */
    @GetMapping("/{id}/foto")
    public ResponseEntity<Void> servirFoto(@PathVariable Integer id) {
        Producto producto = productoService.obtenerPorId(id);
        if (producto.getRutaFoto() == null) {
            return ResponseEntity.notFound().build();
        }
        return ResponseEntity.status(HttpStatus.FOUND)
                .location(java.net.URI.create(producto.getRutaFoto()))
                .build();
    }

    @PostMapping(consumes = {"multipart/form-data"})
    public ResponseEntity<Producto> registrar(
            @RequestParam("nombre") String nombre,
            @RequestParam("pesoGramos") Integer pesoGramos,
            @RequestParam("precioBase") BigDecimal precioBase,
            @RequestParam(value = "foto", required = false) MultipartFile foto,
            @RequestParam(value = "stlFiles", required = false) List<MultipartFile> stlFiles) {
        try {
            Producto producto = new Producto(nombre, pesoGramos, precioBase, null);
            Producto guardado = productoService.guardar(producto, foto, stlFiles);
            return new ResponseEntity<>(guardado, HttpStatus.CREATED);
        } catch (IOException e) {
            return new ResponseEntity<>(HttpStatus.INTERNAL_SERVER_ERROR);
        }
    }

    @PutMapping(value = "/{id}", consumes = {"multipart/form-data"})
    public ResponseEntity<Producto> actualizar(
            @PathVariable Integer id,
            @RequestParam("nombre") String nombre,
            @RequestParam("pesoGramos") Integer pesoGramos,
            @RequestParam("precioBase") BigDecimal precioBase,
            @RequestParam(value = "foto", required = false) MultipartFile foto,
            @RequestParam(value = "stlFiles", required = false) List<MultipartFile> stlFiles) {
        try {
            Producto actualizado = productoService.actualizar(id, nombre, pesoGramos, precioBase, foto, stlFiles);
            return ResponseEntity.ok(actualizado);
        } catch (IOException e) {
            return new ResponseEntity<>(HttpStatus.INTERNAL_SERVER_ERROR);
        } catch (RuntimeException e) {
            return new ResponseEntity<>(HttpStatus.NOT_FOUND);
        }
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> eliminar(@PathVariable Integer id) {
        productoService.eliminar(id);
        return ResponseEntity.noContent().build();
    }
}
