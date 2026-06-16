package com.example.calculadoraparley.ui.notifications

data class PaPrecio(
    val linea: String,      // token EXACTO: "+120" o "-130"
    val precioSi: Int,
    val precioNo: Int,
    val side: String        // "Casa" o "Visitante"
)

object PaData {

    // Tabla cerrada. Solo valores listados son válidos.
    val precios = listOf(
        // CASA (abajo)
        PaPrecio("-110", -160, +120, "Casa"),
        PaPrecio("-115", -155, +115, "Casa"),
        PaPrecio("-120", -150, +110, "Casa"),
        PaPrecio("-125", -150, +110, "Casa"),
        PaPrecio("-130", -150, +110, "Casa"),
        PaPrecio("-135", -145, +105, "Casa"),
        PaPrecio("-140", -145, +105, "Casa"),
        PaPrecio("-145", -145, +105, "Casa"),
        PaPrecio("-150", -140, +100, "Casa"),
        PaPrecio("-155", -140, +100, "Casa"),
        PaPrecio("-160", -135, -105, "Casa"),
        PaPrecio("-165", -135, -105, "Casa"),
        PaPrecio("-170", -130, -110, "Casa"),
        PaPrecio("-175", -130, -110, "Casa"),
        PaPrecio("-180", -120, -120, "Casa"),
        PaPrecio("-185", -120, -120, "Casa"),
        PaPrecio("-190", -120, -120, "Casa"),
        PaPrecio("-195", -120, -120, "Casa"),
        PaPrecio("-200", -120, -120, "Casa"),
        PaPrecio("-205", -110, -130, "Casa"),
        PaPrecio("-210", -110, -130, "Casa"),
        PaPrecio("-215", -105, -135, "Casa"),
        PaPrecio("-220", -105, -135, "Casa"),
        PaPrecio("-225", -105, -135, "Casa"),
        PaPrecio("-240", +100, -140, "Casa"),
        PaPrecio("-265", +120, -160, "Casa"),

        // VISITANTE (arriba)
        PaPrecio("-230", -300, +220, "Visitante"),
        PaPrecio("-225", -300, +220, "Visitante"),
        PaPrecio("-220", -300, +220, "Visitante"),
        PaPrecio("-215", -290, +210, "Visitante"),
        PaPrecio("-210", -280, +200, "Visitante"),
        PaPrecio("-205", -280, +200, "Visitante"),
        PaPrecio("-200", -270, +195, "Visitante"),
        PaPrecio("-195", -270, +195, "Visitante"),
        PaPrecio("-190", -265, +190, "Visitante"),
        PaPrecio("-185", -260, +190, "Visitante"),
        PaPrecio("-180", -250, +180, "Visitante"),
        PaPrecio("-175", -245, +175, "Visitante"),
        PaPrecio("-170", -240, +170, "Visitante"),
        PaPrecio("-165", -230, +165, "Visitante"),
        PaPrecio("-160", -220, +160, "Visitante"),
        PaPrecio("-155", -210, +155, "Visitante"),
        PaPrecio("-150", -210, +155, "Visitante"),
        PaPrecio("-145", -200, +150, "Visitante"),
        PaPrecio("-140", -195, +145, "Visitante"),
        PaPrecio("-135", -180, +140, "Visitante"),
        PaPrecio("-130", -175, +135, "Visitante"),
        PaPrecio("-125", -170, +130, "Visitante"),
        PaPrecio("-120", -165, +125, "Visitante"),
        PaPrecio("-115", -165, +125, "Visitante")

    )

    // Normaliza el token de línea: quita espacios y normaliza el signo.
    // Requiere signo explícito (+ o -). Si no hay signo, no es válido.
    private fun normalizeLinea(raw: String?): String? {
        if (raw.isNullOrBlank()) return null
        val s = raw.replace("\\s+".toRegex(), "")
            .replace('−', '-') // posible guion unicode
        // Acepta exactamente +NNN o -NNN
        val m = Regex("^[+-]\\d{2,3}$").matchEntire(s) ?: return null
        return m.value
    }

    // Normaliza el side a "Casa" o "Visitante"
    private fun normalizeSide(side: String?): String? =
        when (side?.trim()?.lowercase()) {
            "casa" -> "Casa"
            "visitante" -> "Visitante"
            else -> null
        }

    /**
     * Búsqueda EXACTA contra la tabla. Si no existe, retorna null.
     * No hay búsqueda flexible.
     */
    fun buscarPrecio(linea: String?, side: String?): Pair<Int, Int>? {
        val ln = normalizeLinea(linea) ?: return null
        val sd = normalizeSide(side) ?: return null
        return precios.firstOrNull { it.linea == ln && it.side == sd }
            ?.let { it.precioSi to it.precioNo }
    }
}
