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

    // Endpoint para descargar el archivo .stl binario real redirigiendo a Cloudinary
    @GetMapping("/descargar/{id}")
    public ResponseEntity<Void> descargarStl(@PathVariable Integer id) {
        ProductoStl metadata = productoStlService.obtenerPorId(id);

        if (metadata.getRutaArchivo() == null) {
            return ResponseEntity.notFound().build();
        }
        
        return ResponseEntity.status(org.springframework.http.HttpStatus.FOUND)
                .location(java.net.URI.create(metadata.getRutaArchivo()))
                .build();
    }
}
