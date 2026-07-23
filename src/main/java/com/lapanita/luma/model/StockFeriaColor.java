package com.lapanita.luma.model;

import jakarta.persistence.*;
import com.fasterxml.jackson.annotation.JsonBackReference;

@Entity
@Table(name = "stock_feria_colores")
public class StockFeriaColor {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "id_color")
    private Integer id;

    @Column(nullable = false, length = 80)
    private String color;

    @Column(nullable = false)
    private Integer cantidad;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "id_stock_feria", nullable = false)
    @JsonBackReference
    private ItemStockFeria itemStockFeria;

    public StockFeriaColor() {}

    public StockFeriaColor(String color, Integer cantidad, ItemStockFeria itemStockFeria) {
        this.color = color;
        this.cantidad = cantidad;
        this.itemStockFeria = itemStockFeria;
    }

    // --- GETTERS Y SETTERS ---
    public Integer getId() { return id; }
    public void setId(Integer id) { this.id = id; }

    public String getColor() { return color; }
    public void setColor(String color) { this.color = color; }

    public Integer getCantidad() { return cantidad; }
    public void setCantidad(Integer cantidad) { this.cantidad = cantidad; }

    public ItemStockFeria getItemStockFeria() { return itemStockFeria; }
    public void setItemStockFeria(ItemStockFeria itemStockFeria) { this.itemStockFeria = itemStockFeria; }
}
