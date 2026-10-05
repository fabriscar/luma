package com.lapanita.luma.service;

import com.lapanita.luma.model.Producto;
import com.lapanita.luma.model.ProductoStl;
import com.lapanita.luma.repository.ProductoRepository;
import com.lapanita.luma.repository.ProductoStlRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.util.List;
import java.util.zip.ZipEntry;
import java.util.zip.ZipOutputStream;

@Service
public class ProductoService {

    @Autowired
    private ProductoRepository productoRepository;

    @Autowired
    private ProductoStlRepository productoStlRepository;

    @Autowired
    private AlmacenamientoService almacenamientoService;

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

    /** Guardar un producto nuevo con su foto y sus archivos STL */
    @Transactional
    public Producto guardar(Producto producto, MultipartFile foto, List<MultipartFile> archivosStl) throws IOException {
        // 1. Procesar la foto si el usuario subió una
        if (foto != null && !foto.isEmpty()) {
            producto.setRutaFoto(almacenamientoService.guardarFoto(foto));
        }

        // 2. Guardar el producto principal en la BD para generar su ID
        Producto productoGuardado = productoRepository.save(producto);

        // 3. Procesar la lista de archivos .STL si existen
        if (archivosStl != null && !archivosStl.isEmpty()) {
            ProductoStl nuevoStl = subirStlsComoZip(productoGuardado, archivosStl);
            if (nuevoStl != null) {
                productoStlRepository.save(nuevoStl);
            }
        }

        return productoGuardado;
    }

    /** Actualizar un producto existente */
    @Transactional
    public Producto actualizar(Integer id, String nombre, Integer pesoGramos, java.math.BigDecimal precioBase, String detalles, MultipartFile foto, List<MultipartFile> archivosStl) throws IOException {
        Producto producto = obtenerPorId(id);
        producto.setNombre(nombre);
        producto.setPesoGramos(pesoGramos);
        producto.setPrecioBase(precioBase);
        producto.setDetalles(detalles);

        // Si se sube una nueva foto, se reemplaza la anterior (sin borrar el archivo viejo por simplicidad)
        if (foto != null && !foto.isEmpty()) {
            producto.setRutaFoto(almacenamientoService.guardarFoto(foto));
        }

        // Si se suben nuevos archivos STL, se reemplazan los anteriores
        if (archivosStl != null && !archivosStl.isEmpty()) {
            // Borrar de BD
            productoStlRepository.deleteAll(producto.getStlFiles());
            producto.getStlFiles().clear();

            ProductoStl nuevoStl = subirStlsComoZip(producto, archivosStl);
            if (nuevoStl != null) {
                productoStlRepository.save(nuevoStl);
                producto.getStlFiles().add(nuevoStl);
            }
        }

        return productoRepository.save(producto);
    }

    /** Comprime los STLs en un .zip, lo sube y devuelve la entidad (sin guardar). Null si no había archivos. */
    private ProductoStl subirStlsComoZip(Producto producto, List<MultipartFile> archivosStl) throws IOException {
        boolean hasFiles = false;
        java.io.File tempFile = java.io.File.createTempFile("stls_", ".zip");
        try {
            try (java.io.FileOutputStream fos = new java.io.FileOutputStream(tempFile);
                 ZipOutputStream zos = new ZipOutputStream(fos)) {
                for (MultipartFile stl : archivosStl) {
                    if (!stl.isEmpty()) {
                        hasFiles = true;
                        ZipEntry entry = new ZipEntry(stl.getOriginalFilename());
                        zos.putNextEntry(entry);
                        stl.getInputStream().transferTo(zos);
                        zos.closeEntry();
                    }
                }
            }

            if (!hasFiles) {
                return null;
            }
            String zipName = producto.getNombre().replaceAll("\\s+", "_") + "_stls.zip";
            String url = almacenamientoService.guardarZipStl(tempFile, zipName);
            return new ProductoStl(zipName, url, producto);
        } finally {
            tempFile.delete();
        }
    }

    /** Eliminar un producto (no borramos los archivos subidos para mantenerlo simple) */
    @Transactional
    public void eliminar(Integer id) {
        // Eliminar el registro definitivo de la BD (por cascada borra la tabla productos_stl)
        productoRepository.deleteById(id);
    }
}