package com.lapanita.luma.service;

import com.lapanita.luma.model.Producto;
import com.lapanita.luma.model.ProductoStl;
import com.lapanita.luma.repository.ProductoRepository;
import com.lapanita.luma.repository.ProductoStlRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.core.io.Resource;
import org.springframework.core.io.UrlResource;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.net.MalformedURLException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.nio.file.StandardCopyOption;
import java.util.List;
import java.util.UUID;

@Service
public class ProductoService {

    @Autowired
    private ProductoRepository productoRepository;

    @Autowired
    private ProductoStlRepository productoStlRepository;

    // Directorio raíz donde se guardan los archivos en el servidor
    private final Path rootFolder = Paths.get("uploads");

    /** Traer todos los productos cargados */
    @Transactional(readOnly = true)
    public List<Producto> obtenerTodos() {
        return productoRepository.findAll();
    }

    /** Buscar un producto por su ID */
    @Transactional(readOnly = true)
    public Producto obtenerPorId(Integer id) {
        return productoRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Producto no encontrado con el ID: " + id));
    }

    /**
     * Cargar la foto de un producto como recurso descargable.
     * Permite al frontend mostrar la imagen a través de un endpoint HTTP.
     */
    public Resource cargarFotoComoRecurso(Integer id) {
        Producto producto = obtenerPorId(id);
        if (producto.getRutaFoto() == null) {
            throw new RuntimeException("El producto no tiene foto asociada.");
        }
        try {
            Path ruta = Paths.get(producto.getRutaFoto());
            Resource recurso = new UrlResource(ruta.toUri());
            if (recurso.exists() && recurso.isReadable()) {
                return recurso;
            }
            throw new RuntimeException("No se puede leer la foto del producto.");
        } catch (MalformedURLException e) {
            throw new RuntimeException("Error al construir la URL de la foto: " + e.getMessage());
        }
    }

    /** Guardar o actualizar un producto con sus archivos físicos */
    @Transactional
    public Producto guardar(Producto producto, MultipartFile foto, List<MultipartFile> archivosStl) throws IOException {
        // 1. Crear la carpeta uploads si no existe
        if (!Files.exists(rootFolder)) {
            Files.createDirectories(rootFolder);
        }

        // 2. Procesar la foto si el usuario subió una
        if (foto != null && !foto.isEmpty()) {
            String nombreFoto = UUID.randomUUID().toString() + "_" + foto.getOriginalFilename();
            Path rutaFoto = this.rootFolder.resolve(nombreFoto);
            Files.copy(foto.getInputStream(), rutaFoto, StandardCopyOption.REPLACE_EXISTING);
            producto.setRutaFoto(rutaFoto.toString());
        }

        // 3. Guardar el producto principal en la BD para generar su ID
        Producto productoGuardado = productoRepository.save(producto);

        // 4. Procesar la lista de archivos .STL si existen
        if (archivosStl != null && !archivosStl.isEmpty()) {
            for (MultipartFile stl : archivosStl) {
                if (!stl.isEmpty()) {
                    String nombreStl = UUID.randomUUID().toString() + "_" + stl.getOriginalFilename();
                    Path rutaStl = this.rootFolder.resolve(nombreStl);
                    Files.copy(stl.getInputStream(), rutaStl, StandardCopyOption.REPLACE_EXISTING);

                    // Crear la entidad ProductoStl y asociarla al producto padre
                    ProductoStl nuevoStl = new ProductoStl(stl.getOriginalFilename(), rutaStl.toString(), productoGuardado);
                    productoStlRepository.save(nuevoStl);
                }
            }
        }

        return productoGuardado;
    }

    /** Eliminar un producto y limpiar sus archivos del disco */
    @Transactional
    public void eliminar(Integer id) {
        Producto producto = obtenerPorId(id);

        // Borrar el archivo de la foto del disco antes de eliminar el registro
        if (producto.getRutaFoto() != null) {
            try {
                Files.deleteIfExists(Paths.get(producto.getRutaFoto()));
            } catch (IOException e) {
                System.err.println("No se pudo eliminar el archivo físico de la foto: " + e.getMessage());
            }
        }

        // Borrar todos los archivos .STL asociados del disco
        for (ProductoStl stl : producto.getStlFiles()) {
            try {
                Files.deleteIfExists(Paths.get(stl.getRutaArchivo()));
            } catch (IOException e) {
                System.err.println("No se pudo eliminar el archivo físico STL: " + e.getMessage());
            }
        }

        // Eliminar el registro definitivo de la BD (por cascada borra la tabla productos_stl)
        productoRepository.deleteById(id);
    }
}