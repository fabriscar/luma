package com.lapanita.luma.controller;

import com.lapanita.luma.model.ProductoStl;
import com.lapanita.luma.service.ProductoStlService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.core.io.Resource;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/stl")
@CrossOrigin(origins = "*")
public class ProductoStlController {

    @Autowired
    private ProductoStlService productoStlService;

    // Endpoint para descargar el archivo .stl binario real por su ID
    @GetMapping("/descargar/{id}")
    public ResponseEntity<Resource> descargarStl(@PathVariable Integer id) {
        ProductoStl metadata = productoStlService.obtenerPorId(id);
        Resource archivoFisico = productoStlService.cargarComoRecurso(id);

        return ResponseEntity.ok()
                .contentType(MediaType.APPLICATION_OCTET_STREAM) // Indica que viaja un archivo binario puro
                .header(HttpHeaders.CONTENT_DISPOSITION, "attachment; filename=\"" + metadata.getNombreArchivo() + "\"")
                .body(archivoFisico);
    }
}
