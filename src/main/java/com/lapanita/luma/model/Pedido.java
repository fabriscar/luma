package com.lapanita.luma.model;

import jakarta.persistence.*;
import java.math.BigDecimal;
import java.time.LocalDateTime;

@Entity
@Table(name = "pedidos")
public class Pedido {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "id_pedido")
    private Integer id;

    @Column(nullable = false, length = 100)
    private String cliente;

    @Column(name = "fecha_pedido", insertable = false, updatable = false)
    private LocalDateTime fechaPedido;

    @Column(name = "fecha_entrega", nullable = false)
    private java.time.LocalDate fechaEntrega;

    @Column(name = "total_pedido", nullable = false, precision = 10, scale = 2)
    private BigDecimal totalPedido;

    @Enumerated(EnumType.STRING)
    @Column(name = "estado_pago", nullable = false)
    private EstadoPago estadoPago = EstadoPago.NO_PAGADO;

    @Column(name = "monto_sena", precision = 10, scale = 2)
    private BigDecimal montoSena = BigDecimal.ZERO;

    @Enumerated(EnumType.STRING)
    @Column(name = "estado_produccion", nullable = false)
    private EstadoProduccion estadoProduccion = EstadoProduccion.PENDIENTE_HACER;

    public Pedido() {}

    public Pedido(String cliente, java.time.LocalDate fechaEntrega, BigDecimal totalPedido, EstadoPago estadoPago, BigDecimal montoSena) {
        this.cliente = cliente;
        this.fechaEntrega = fechaEntrega;
        this.totalPedido = totalPedido;
        this.estadoPago = estadoPago;
        this.montoSena = montoSena;
    }

    // --- GETTERS Y SETTERS ---
    public Integer getId() { return id; }
    public void setId(Integer id) { this.id = id; }

    public String getCliente() { return cliente; }
    public void setCliente(String cliente) { this.cliente = cliente; }

    public LocalDateTime getFechaPedido() { return fechaPedido; }
    public void setFechaPedido(LocalDateTime fechaPedido) { this.fechaPedido = fechaPedido; }

    public java.time.LocalDate getFechaEntrega() { return fechaEntrega; }
    public void setFechaEntrega(java.time.LocalDate fechaEntrega) { this.fechaEntrega = fechaEntrega; }

    public BigDecimal getTotalPedido() { return totalPedido; }
    public void setTotalPedido(BigDecimal totalPedido) { this.totalPedido = totalPedido; }

    public EstadoPago getEstadoPago() { return estadoPago; }
    public void setEstadoPago(EstadoPago estadoPago) { this.estadoPago = estadoPago; }

    public BigDecimal getMontoSena() { return montoSena; }
    public void setMontoSena(BigDecimal montoSena) { this.montoSena = montoSena; }

    public EstadoProduccion getEstadoProduccion() { return estadoProduccion; }
    public void setEstadoProduccion(EstadoProduccion estadoProduccion) { this.estadoProduccion = estadoProduccion; }
}
