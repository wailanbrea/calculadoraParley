package com.example.calculadoraparley.ui.notifications

import android.util.Log

object SoloData {
    // Rangos corregidos (ascendentes). OJO: -115..-105 en vez de -105..-115
    private val casaAdjustRanges = listOf(
        -350..-300 to 3.0,
        -299..-276 to 2.5,
        -275..-250 to 2.0,
        -249..-200 to 1.5,
        -195..-155 to 1.0,
        -150..-120 to 0.5,
        -115..-105 to 0.0,   // <-- FIX
        -110..-110 to 0.0
    )

    private val visitAdjustRanges = listOf(
        -280..-251 to 2.5,
        -250..-200 to 2.0,
        -195..-171 to 1.5,
        -170..-140 to 1.0,
        -139..-120 to 0.5,
        -115..-115 to 0.0,
        -110..-110 to 0.0
    )

    // --- Parsing flexible para ML y total ---
    fun String?.toCleanInt(): Int? {
        val match = Regex("-?\\d+").find(this ?: "")
        return match?.value?.toIntOrNull()
    }

    fun String?.toCleanDouble(): Double? {
        val match = Regex("(\\d+(?:[.,½]?\\d*)?)").find(this ?: "")
        return match?.value
            ?.replace("½", ".5")
            ?.replace(",", ".")
            ?.replace(" ", "")
            ?.toDoubleOrNull()
    }

    fun calcularSolo(
        totalStr: String?,   // String original del total (puede traer '½', espacios, etc.)
        mlCasaStr: String?,  // String crudo ML casa
        mlVisitStr: String?  // String crudo ML visitante
    ): Pair<String, String> {
        val mlCasa = mlCasaStr.toCleanInt()
        val mlVisit = mlVisitStr.toCleanInt()
        val total = totalStr.toCleanDouble()

        if (total == null || mlCasa == null || mlVisit == null) {
            Log.d("SoloData", "Datos insuficientes (parseados): total=$total, mlCasa=$mlCasa, mlVisit=$mlVisit")
            return "--" to "--"
        }

        val esEmpate = mlCasa == mlVisit

        // Detectar favorito y ajuste
        val (ajuste, esCasaFav) = when {
            esEmpate -> 0.0 to false
            mlCasa < mlVisit -> { // Casa favorito (más negativo)
                val a = casaAdjustRanges.firstOrNull { it.first.contains(mlCasa) }?.second ?: 0.0
                a to true
            }
            else -> { // Visitante favorito
                val a = visitAdjustRanges.firstOrNull { it.first.contains(mlVisit) }?.second ?: 0.0
                a to false
            }
        }

        // Z = TOTAL - ajuste (lado no favorito)
        val z = total - ajuste
        val esEntero = (z % 1.0 == 0.0)
        val esDecimal = (z % 1.0 == 0.5)

        val (soloCasa, soloVisit) = when {
            esEmpate -> {
                if (total % 1.0 == 0.0) {
                    val v = total / 2.0
                    v to v
                } else {
                    val v = (total - 0.5) / 2.0
                    v to v
                }
            }
            esEntero -> {
                if (esCasaFav) {
                    ((z / 2.0) + ajuste) to (z / 2.0)
                } else {
                    (z / 2.0) to ((z / 2.0) + ajuste)
                }
            }
            esDecimal -> {
                if (esCasaFav) {
                    (((z - 0.5) / 2.0) + ajuste) to ((z - 0.5) / 2.0)
                } else {
                    ((z - 0.5) / 2.0) to (((z - 0.5) / 2.0) + ajuste)
                }
            }
            else -> {
                val v = total / 2.0
                v to v
            }
        }

        fun Double.roundToHalf() = kotlin.math.round(this * 2) / 2.0
        fun Double.pretty() = if (this % 1.0 == 0.0) this.toInt().toString() else "${this.toInt()}½"

        val roundedCasa = soloCasa.roundToHalf()
        val roundedVisit = soloVisit.roundToHalf()
        val result = roundedCasa.pretty() to roundedVisit.pretty()

        Log.d("SoloData", "Resultado Solo: casa=${result.first}, visit=${result.second} | [ajuste:$ajuste, favoritoCasa:$esCasaFav]")
        return result
    }
}
