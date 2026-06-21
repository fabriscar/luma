package com.lapanita.luma.model;

import jakarta.persistence.*;
import java.math.BigDecimal;

@Entity
@Table(name = "filamentos")
public class Filamento {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "id_filamento")
    private Integer id;

    @Column(nullable = false, length = 30)
    private String tipo; // PLA, PETG, ABS, etc.

    @Column(nullable = false, length = 50)
    private String marca;

    @Column(nullable = false, length = 50)
    private String color;

    @Column(name = "cantidad_gramos", nullable = false)
    private Integer cantidadGramos;

    @Column(name = "precio_compra", nullable = false, precision = 10, scale = 2)
    private BigDecimal precioCompra;

    public Filamento() {}

    public Filamento(String tipo, String marca, String color, Integer cantidadGramos, BigDecimal precioCompra) {
        this.tipo = tipo;
        this.marca = marca;
        this.color = color;
        this.cantidadGramos = cantidadGramos;
        this.precioCompra = precioCompra;
    }

    // --- GETTERS Y SETTERS ---
    public Integer getId() { return id; }
    public void setId(Integer id) { this.id = id; }

    public String getTipo() { return tipo; }
    public void setTipo(String tipo) { this.tipo = tipo; }

    public String getMarca() { return marca; }
    public void setMarca(String marca) { this.marca = marca; }

    public String getColor() { return color; }
    public void setColor(String color) { this.color = color; }

    public Integer getCantidadGramos() { return cantidadGramos; }
    public void setCantidadGramos(Integer cantidadGramos) { this.cantidadGramos = cantidadGramos; }

    public BigDecimal getPrecioCompra() { return precioCompra; }
    public void setPrecioCompra(BigDecimal precioCompra) { this.precioCompra = precioCompra; }
}
