package com.lapanita.luma.model;

import jakarta.persistence.*;
import com.fasterxml.jackson.annotation.JsonManagedReference;
import java.math.BigDecimal;
import java.util.ArrayList;
import java.util.List;

@Entity
@Table(name = "productos")
public class Producto {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "id_producto")
    private Integer id;

    @Column(nullable = false, unique = true, length = 100)
    private String nombre;

    @Column(name = "peso_gramos", nullable = false)
    private Integer pesoGramos;

    @Column(name = "precio_base", nullable = false, precision = 10, scale = 2)
    private BigDecimal precioBase;

    @Column(name = "ruta_foto")
    private String rutaFoto;

    // Relación uno-a-muchos: un producto puede tener varios archivos .stl asociados
    @OneToMany(mappedBy = "producto", cascade = CascadeType.ALL, orphanRemoval = true)
    @JsonManagedReference  // "Lado padre" — Jackson serializa esta lista normalmente
    private List<ProductoStl> stlFiles = new ArrayList<>();

    // Constructor vacío requerido por JPA
    public Producto() {}

    public Producto(String nombre, Integer pesoGramos, BigDecimal precioBase, String rutaFoto) {
        this.nombre = nombre;
        this.pesoGramos = pesoGramos;
        this.precioBase = precioBase;
        this.rutaFoto = rutaFoto;
    }

    // --- GETTERS Y SETTERS ---
    public Integer getId() { return id; }
    public void setId(Integer id) { this.id = id; }

    public String getNombre() { return nombre; }
    public void setNombre(String nombre) { this.nombre = nombre; }

    public Integer getPesoGramos() { return pesoGramos; }
    public void setPesoGramos(Integer pesoGramos) { this.pesoGramos = pesoGramos; }

    public BigDecimal getPrecioBase() { return precioBase; }
    public void setPrecioBase(BigDecimal precioBase) { this.precioBase = precioBase; }

    public String getRutaFoto() { return rutaFoto; }
    public void setRutaFoto(String rutaFoto) { this.rutaFoto = rutaFoto; }

    public List<ProductoStl> getStlFiles() { return stlFiles; }
    public void setStlFiles(List<ProductoStl> stlFiles) { this.stlFiles = stlFiles; }
}
