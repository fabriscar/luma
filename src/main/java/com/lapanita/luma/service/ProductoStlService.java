package com.lapanita.luma.service;

import com.lapanita.luma.model.ProductoStl;
import com.lapanita.luma.repository.ProductoStlRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.core.io.Resource;
import org.springframework.core.io.UrlResource;
import org.springframework.stereotype.Service;

import java.net.MalformedURLException;
import java.nio.file.Path;
import java.nio.file.Paths;

@Service
public class ProductoStlService {

    @Autowired
    private ProductoStlRepository productoStlRepository;

    // Buscar los metadatos del archivo en la base de datos
    public ProductoStl obtenerPorId(Integer id) {
        return productoStlRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Archivo STL no encontrado con ID: " + id));
    }

    // Cargar el archivo físico del disco para permitir la descarga desde otra PC
    public Resource cargarComoRecurso(Integer id) {
        ProductoStl archivoStl = obtenerPorId(id);
        try {
            Path rutaArchivo = Paths.get(archivoStl.getRutaArchivo());
            Resource recurso = new UrlResource(rutaArchivo.toUri());

            if (recurso.exists() && recurso.isReadable()) {
                return recurso;
            } else {
                throw new RuntimeException("No se puede leer o no existe el archivo físico: " + archivoStl.getNombreArchivo());
            }
        } catch (MalformedURLException e) {
            throw new RuntimeException("Error al estructurar la ruta del archivo para descarga: " + e.getMessage());
        }
    }
}
