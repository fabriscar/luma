package com.lapanita.luma.model;

import jakarta.persistence.*;
import java.math.BigDecimal;

@Entity
@Table(name = "compras_filamentos")
public class CompraFilamento {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "id_compra")
    private Integer id;

    @Column(name = "fecha_compra", nullable = false)
    private java.time.LocalDate fechaCompra;

    // Podría ser una relación, pero para mantenerlo flexible lo dejamos como string
    // Opcionalmente el ID del filamento si se vincula al stock
    @Column(name = "filamento_id")
    private Integer filamentoId;

    @Column(name = "descripcion", length = 200, nullable = false)
    private String descripcion;

    @Column(name = "cantidad_gramos", nullable = false)
    private Integer cantidadGramos;

    @Column(name = "monto_total", nullable = false, precision = 10, scale = 2)
    private BigDecimal montoTotal;

    public CompraFilamento() {}

    public CompraFilamento(java.time.LocalDate fechaCompra, Integer filamentoId, String descripcion, Integer cantidadGramos, BigDecimal montoTotal) {
        this.fechaCompra = fechaCompra;
        this.filamentoId = filamentoId;
        this.descripcion = descripcion;
        this.cantidadGramos = cantidadGramos;
        this.montoTotal = montoTotal;
    }

    public Integer getId() { return id; }
    public void setId(Integer id) { this.id = id; }

    public java.time.LocalDate getFechaCompra() { return fechaCompra; }
    public void setFechaCompra(java.time.LocalDate fechaCompra) { this.fechaCompra = fechaCompra; }

    public Integer getFilamentoId() { return filamentoId; }
    public void setFilamentoId(Integer filamentoId) { this.filamentoId = filamentoId; }

    public String getDescripcion() { return descripcion; }
    public void setDescripcion(String descripcion) { this.descripcion = descripcion; }

    public Integer getCantidadGramos() { return cantidadGramos; }
    public void setCantidadGramos(Integer cantidadGramos) { this.cantidadGramos = cantidadGramos; }

    public BigDecimal getMontoTotal() { return montoTotal; }
    public void setMontoTotal(BigDecimal montoTotal) { this.montoTotal = montoTotal; }
}
