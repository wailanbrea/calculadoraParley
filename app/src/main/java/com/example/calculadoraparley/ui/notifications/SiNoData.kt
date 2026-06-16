package com.example.calculadoraparley.ui.notifications

data class SiNoPrecio(
    val total: Double,
    val tipo: String,   // "O", "U" o "P"
    val linea: String,  // p.ej. "-120"
    val precioSi: Int,
    val precioNo: Int
)

object SiNoData {

    private fun canonHalf(x: Double): Double = kotlin.math.round(x * 2.0) / 2.0
    private fun canonTipo(t: String): String = t.trim().uppercase()
    private fun canonLinea(l: String): String {
        val s = l.trim().replace(" ", "")
        if (s.isEmpty()) return s
        // Asegura signo explícito. Si no hay, asume "-".
        val withSign = if (s[0] == '+' || s[0] == '-') s else "-$s"
        // Normaliza a forma "+/-ddd" exacta
        val m = Regex("^([+-]?)(\\d{2,3})$").find(withSign) ?: return withSign
        val sign = m.groupValues[1].ifEmpty { "-" }  // por tabla trabajamos con vig negativo por defecto
        val num  = m.groupValues[2]
        return "$sign$num"
    }

    private fun eq(a: Double, b: Double) = kotlin.math.abs(a - b) < 1e-9

    // ----- TABLA -----
    private val precios = listOf(
        // Totales 6.0 a 9.0 (lado izquierdo)
        SiNoPrecio(6.0, "O", "-120", 140, -170),
        SiNoPrecio(6.0, "P", "-110", 145, -175),
        SiNoPrecio(6.0, "U", "-120", 150, -180),

        SiNoPrecio(6.5, "O", "-115", 130, -160),
        SiNoPrecio(6.5, "O", "-120", 125, -155),
        SiNoPrecio(6.5, "P", "-110", 130, -160),
        SiNoPrecio(6.5, "U", "-120", 135, -165),

        SiNoPrecio(7.0, "O", "-120", 115, -145),
        SiNoPrecio(7.0, "P", "-110", 115, -145),
        SiNoPrecio(7.0, "U", "-120", 120, -150),
        SiNoPrecio(7.0, "O", "-125", 115, -145),

        SiNoPrecio(7.5, "O", "-115", 105, -135),
        SiNoPrecio(7.5, "O", "-120", 100, -130),
        SiNoPrecio(7.5, "P", "-110", 105, -135),
        SiNoPrecio(7.5, "U", "-115", 110, -140),
        SiNoPrecio(7.5, "U", "-120", 115, -145),

        SiNoPrecio(8.0, "O", "-115", 105, -125),
        SiNoPrecio(8.0, "P", "-110", 100, -130),
        SiNoPrecio(8.0, "U", "-115", 100, -130),
        SiNoPrecio(8.0, "U", "-120", 105, -135),

        SiNoPrecio(8.5, "O", "-115", 120, -120),
        SiNoPrecio(8.5, "O", "-120", 120, -120),
        SiNoPrecio(8.5, "O", "-125", 120, -120),
        SiNoPrecio(8.5, "P", "-110", 120, -120),
        SiNoPrecio(8.5, "U", "-115", 105, -125),
        SiNoPrecio(8.5, "U", "-120", 110, -110),

        SiNoPrecio(9.0, "O", "-120", 100, -130),
        SiNoPrecio(9.0, "P", "-110", 120, -120),
        SiNoPrecio(9.0, "U", "-115", 120, -120),
        SiNoPrecio(9.0, "U", "-120", 120, -120),

        // Totales 9.5 a 14.0 (lado derecho)
        SiNoPrecio(9.5, "O", "-115", 140, 110),
        SiNoPrecio(9.5, "O", "-120", 140, 110),
        SiNoPrecio(9.5, "P", "-110", 135, 105),
        SiNoPrecio(9.5, "U", "-115", 135, 105),
        SiNoPrecio(9.5, "U", "-120", 130, 100),

        SiNoPrecio(10.0, "O", "-120", 155, 125),
        SiNoPrecio(10.0, "O", "-115", 150, 120),
        SiNoPrecio(10.0, "P", "-110", 150, 120),
        SiNoPrecio(10.0, "U", "-115", 145, 115),

        SiNoPrecio(10.5, "O", "-115", 155, 125),
        SiNoPrecio(10.5, "P", "-110", 155, 125),
        SiNoPrecio(10.5, "U", "-120", 155, 125),

        SiNoPrecio(11.0, "O", "-120", 170, 140),
        SiNoPrecio(11.0, "P", "-110", 170, 140),
        SiNoPrecio(11.0, "U", "-120", 160, 130),

        SiNoPrecio(11.5, "O", "-120", 180, 145),
        SiNoPrecio(11.5, "O", "-115", 175, 145),
        SiNoPrecio(11.5, "P", "-110", 175, 145),
        SiNoPrecio(11.5, "U", "-120", 170, 140),

        SiNoPrecio(12.0, "O", "-120", 190, 160),
        SiNoPrecio(12.0, "P", "-110", 185, 155),
        SiNoPrecio(12.0, "U", "-115", 180, 150),

        SiNoPrecio(12.5, "O", "-120", 205, 165),
        SiNoPrecio(12.5, "O", "-115", 200, 160),
        SiNoPrecio(12.5, "P", "-110", 200, 160),
        SiNoPrecio(12.5, "U", "-115", 200, 160),

        SiNoPrecio(14.0, "U", "-115", 220, 170),
        SiNoPrecio(14.0, "O", "-115", 220, 170),
        SiNoPrecio(14.0, "P", "-110", 220, 170)
    )

    // ----- LOOKUPS -----

    fun buscarPrecio(total: Double, tipo: String, linea: String): Pair<Int, Int>? {
        val t = canonHalf(total)
        val tp = canonTipo(tipo)
        val ln = canonLinea(linea)
        return precios.firstOrNull { eq(it.total, t) && it.tipo == tp && it.linea == ln }
            ?.let { it.precioSi to it.precioNo }
    }

    /**
     * Flexible solo por "juice" dentro del MISMO total y tipo.
     * Si no hay coincidencia exacta, usa la línea más cercana.
     */
    fun buscarPrecioFlexible(total: Double, tipo: String, linea: String): Pair<Int, Int>? {
        buscarPrecio(total, tipo, linea)?.let { return it }
        val t = canonHalf(total)
        val tp = canonTipo(tipo)
        val ln = canonLinea(linea)
        val target = ln.dropWhile { it == '+' || it == '-' }.toIntOrNull() ?: return null

        val candidatos = precios.filter { eq(it.total, t) && it.tipo == tp }
        if (candidatos.isEmpty()) return null

        val best = candidatos.minByOrNull {
            val n = it.linea.dropWhile { c -> c == '+' || c == '-' }.toIntOrNull() ?: 0
            kotlin.math.abs(n - target)
        } ?: return null

        return best.precioSi to best.precioNo
    }
}
