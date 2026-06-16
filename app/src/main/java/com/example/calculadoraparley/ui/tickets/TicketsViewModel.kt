package com.example.calculadoraparley.ui.tickets

import androidx.lifecycle.LiveData
import androidx.lifecycle.MutableLiveData
import androidx.lifecycle.ViewModel
import java.text.NumberFormat
import java.util.Locale
import kotlin.math.abs
import kotlin.math.ceil

class TicketsViewModel : ViewModel() {

    private val _resultado = MutableLiveData<String>()
    val resultado: LiveData<String> get() = _resultado

    private val _detalle = MutableLiveData<String>()
    val detalle: LiveData<String> get() = _detalle

    private fun formatear(num: Int): String {
        return "RD$ " + NumberFormat.getIntegerInstance(Locale.GERMANY).format(num)
    }

    fun calcularMontoApostar(
        gananciaDeseada: Double,
        linea: Double,
        tieneCodigo: Boolean
    ) {
        val limite = if (tieneCodigo) 250_000 else 170_000
        val L = abs(linea)
        val totalApostado = ceil(gananciaDeseada * (L / 100.0)).toInt()

        var tickets = 1
        var montoPorTicket = 0
        var gananciaPorTicket = 0.0
        var encontrado = false

        while (tickets <= 100) {
            tickets++
            if (totalApostado % tickets == 0) {
                montoPorTicket = totalApostado / tickets
                gananciaPorTicket = montoPorTicket / (L / 100.0)
                if ((montoPorTicket + gananciaPorTicket) <= limite) {
                    encontrado = true
                    break
                }
            }
        }

        val gananciaPorTicketDecimal = montoPorTicket / (L / 100.0)
        val gananciaPorTicketEntero = gananciaPorTicket.toInt()
        val diferenciaRedondeo = gananciaPorTicketDecimal - gananciaPorTicketEntero
        val totalGananciaReal = (gananciaPorTicketEntero * tickets)
        val faltante = gananciaDeseada.toInt() - totalGananciaReal
        val totalRedondeado = ((gananciaPorTicketDecimal - gananciaPorTicketEntero) * tickets).toInt()

        // RESUMEN BÁSICO
        val resumen = StringBuilder()
        if (encontrado) {
            resumen.append("🎟️ TICKETS NECESARIOS: $tickets\n")
            resumen.append("Apostado: ${formatear(montoPorTicket)}\n")
            resumen.append("Ganancia mostrada: ${formatear(gananciaPorTicketEntero)}\n\n")
            resumen.append("💰 Total apostado: ${formatear(montoPorTicket * tickets)}\n")
            resumen.append("🏆 Total a ganar (deseado): ${formatear(gananciaDeseada.toInt())}")
        } else {
            resumen.append("No es posible dividir esta jugada en tickets exactos que cumplan el límite de monto + ganancia.")
        }
        _resultado.value = resumen.toString()

        // DETALLE COMPLETO
        val detalleMsg = StringBuilder()
        if (encontrado) {
            detalleMsg.append("🎟️ TICKETS NECESARIOS: $tickets\n")
            detalleMsg.append("Apostado: ${formatear(montoPorTicket)}\n")
            detalleMsg.append("Ganancia real por ticket: RD$ ${"%,.2f".format(gananciaPorTicketDecimal)}\n")
            detalleMsg.append("Ganancia mostrada: ${formatear(gananciaPorTicketEntero)}\n")
            detalleMsg.append("Redondeo por ticket: RD$ ${"%,.2f".format(diferenciaRedondeo)}\n\n")
            detalleMsg.append("💰 Total apostado: ${formatear(montoPorTicket * tickets)}\n")
            detalleMsg.append("🏆 Total a ganar (deseado): ${formatear(gananciaDeseada.toInt())}")
            detalleMsg.append("\n\n⚠️ Realmente se ganan: ${formatear(totalGananciaReal)}")
            if (faltante > 0) {
                detalleMsg.append(" (faltan ${formatear(faltante)} para llegar a la ganancia deseada)")
            }
        } else {
            detalleMsg.append("No es posible dividir esta jugada en tickets exactos que cumplan el límite de monto + ganancia.")
        }
        _detalle.value = detalleMsg.toString()
    }
}
