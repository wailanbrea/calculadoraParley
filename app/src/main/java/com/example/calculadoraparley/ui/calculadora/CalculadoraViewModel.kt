package com.example.calculadoraparley.ui.calculadora

import androidx.lifecycle.LiveData
import androidx.lifecycle.MutableLiveData
import androidx.lifecycle.ViewModel
import java.text.NumberFormat
import java.util.Locale

class CalculadoraViewModel : ViewModel() {

    private val _montoTotal = MutableLiveData<Int>()
    val montoTotal: LiveData<Int> = _montoTotal

    private val _ganancia = MutableLiveData<Int>()
    val ganancia: LiveData<Int> = _ganancia

    fun calcularParley(monto: Double, logros: List<Pair<Double?, Boolean>>) {
        if (monto <= 0) {
            _montoTotal.value = 0
            _ganancia.value = 0
            return
        }

        var resultado = monto
        for ((valor, negativo) in logros) {
            if (valor != null) {
                val decimal = if (negativo) {
                    1 + (100.0 / valor)
                } else {
                    1 + (valor / 100.0)
                }
                resultado *= decimal
            }
        }

        val montoTotalInt = kotlin.math.ceil(resultado).toInt()
        val gananciaInt = montoTotalInt - monto.toInt()

        _montoTotal.value = montoTotalInt
        _ganancia.value = gananciaInt
    }

    fun limpiar() {
        _montoTotal.value = 0
        _ganancia.value = 0
    }

    fun formatear(num: Int): String {
        return NumberFormat.getIntegerInstance(Locale.GERMANY).format(num)
    }
}
