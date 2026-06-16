package com.example.calculadoraparley.ui.notifications

/**
 * Data class para precios de TERCIO basados en H (total H) y su linea.
 */
data class TercioPrecio(
    val total: Double,
    val tipoH: String,
    val lineaH: String,
    val tercio: Double,
    val tipoT: String,
    val lineaT: String
)

/**
 * Resultado ML calculado para TERCIO a partir del ML de 1ra mitad (H).
 */
data class TercioMl(
    val visit: String,
    val casa: String,
    val favSide: String
)

object TercioData {

    private fun canonH(x: Double): Double = kotlin.math.round(x * 2.0) / 2.0

    private fun sanitize(raw: String?): String =
        raw.orEmpty()
            .replace('\u00A0', ' ')
            .replace(" ", "")
            .replace('−', '-')
            .replace('–', '-')
            .replace('—', '-')
            .replace('＋', '+')

    private fun normLinea(raw: String?): String? {
        val s = sanitize(raw)
        val m = Regex("""^([+-])?(\d{2,3})$""").matchEntire(s) ?: return null
        val sign = m.groupValues[1].ifEmpty { "-" }
        return sign + m.groupValues[2]
    }

    private fun normTipo(raw: String?): String? {
        val t = raw?.trim()?.uppercase() ?: return null
        return if (t == "O" || t == "U" || t == "PK") t else null
    }

    private fun parseMlToken(s: String?): Int? =
        Regex("([+-]?\\d{2,3})(?!\\d)").find(sanitize(s))?.groupValues?.get(1)?.toIntOrNull()

    private fun fmtMl(n: Int): String = if (n > 0) "+$n" else n.toString()

    val precios = listOf(
        TercioPrecio(7.0, "PK", "-110", 4.5, "O", "-140"),
        TercioPrecio(7.0, "U", "-120", 4.5, "O", "-130"),

        TercioPrecio(6.5, "O", "-120", 4.5, "PK", "-120"),
        TercioPrecio(6.5, "O", "-115", 4.5, "U", "-120"),
        TercioPrecio(6.5, "PK", "-110", 4.0, "PK", "-130"),
        TercioPrecio(6.5, "U", "-115", 4.0, "PK", "-120"),
        TercioPrecio(6.5, "U", "-120", 3.5, "O", "-150"),

        TercioPrecio(6.0, "O", "-120", 3.5, "O", "-130"),
        TercioPrecio(6.0, "O", "-115", 3.5, "O", "-145"),
        TercioPrecio(6.0, "PK", "-110", 3.5, "O", "-150"),
        TercioPrecio(6.0, "U", "-115", 3.5, "O", "-135"),
        TercioPrecio(6.0, "U", "-120", 3.5, "O", "-130"),
        TercioPrecio(6.0, "U", "-125", 3.5, "O", "-145"),

        TercioPrecio(5.5, "O", "-120", 3.5, "PK", "-120"),
        TercioPrecio(5.5, "O", "-115", 3.5, "U", "-120"),
        TercioPrecio(5.5, "PK", "-110", 3.0, "O", "-150"),
        TercioPrecio(5.5, "PK", "-110", 3.5, "U", "-130"),
        TercioPrecio(5.5, "U", "-115", 3.0, "O", "-140"),
        TercioPrecio(5.5, "U", "-115", 3.5, "U", "-135"),
        TercioPrecio(5.5, "U", "-120", 3.0, "O", "-135"),
        TercioPrecio(5.5, "U", "-120", 3.5, "U", "-140"),

        TercioPrecio(5.0, "O", "-125", 3.0, "O", "-130"),
        TercioPrecio(5.0, "O", "-120", 3.0, "O", "-130"),
        TercioPrecio(5.0, "O", "-115", 3.0, "O", "-125"),
        TercioPrecio(5.0, "PK", "-110", 3.0, "PK", "-120"),
        TercioPrecio(5.0, "U", "-110", 3.0, "O", "-125"),
        TercioPrecio(5.0, "U", "-115", 3.0, "U", "-135"),
        TercioPrecio(5.0, "U", "-120", 3.0, "U", "-130"),
        TercioPrecio(5.0, "U", "-120", 2.5, "O", "-150"),

        TercioPrecio(4.5, "O", "-125", 2.5, "O", "-135"),
        TercioPrecio(4.5, "O", "-120", 2.5, "O", "-130"),
        TercioPrecio(4.5, "O", "-115", 2.5, "O", "-125"),
        TercioPrecio(4.5, "PK", "-110", 2.5, "U", "-115"),
        TercioPrecio(4.5, "U", "-115", 2.5, "U", "-125"),
        TercioPrecio(4.5, "U", "-120", 2.5, "U", "-130"),

        TercioPrecio(4.0, "U", "-125", 2.0, "U", "-140"),
        TercioPrecio(4.0, "O", "-125", 2.5, "U", "-125"),
        TercioPrecio(4.0, "O", "-115", 2.5, "U", "-135"),
        TercioPrecio(4.0, "O", "-120", 2.5, "U", "-130"),
        TercioPrecio(4.0, "PK", "-110", 2.0, "O", "-150"),
        TercioPrecio(4.0, "U", "-110", 2.0, "O", "-150"),
        TercioPrecio(4.0, "U", "-115", 2.0, "O", "-145"),
        TercioPrecio(4.0, "U", "-120", 2.0, "O", "-140"),
        TercioPrecio(4.0, "U", "-125", 2.0, "U", "-140"),

        TercioPrecio(3.5, "U", "-125", 2.0, "U", "-135"),
        TercioPrecio(3.5, "U", "-120", 2.0, "U", "-130"),
        TercioPrecio(3.5, "O", "-120", 2.0, "O", "-130"),
        TercioPrecio(3.5, "O", "-115", 2.0, "O", "-125"),
        TercioPrecio(3.5, "PK", "-110", 2.0, "U", "-120")
    )

    fun buscarTercio(total: Double, tipo: String, linea: String): TercioPrecio? {
        val tCanon = canonH(total)
        val tipoOk = normTipo(tipo) ?: return null
        val lineaOk = normLinea(linea) ?: return null
        return precios.firstOrNull {
            it.total == tCanon && it.tipoH == tipoOk && it.lineaH == lineaOk
        }
    }

    /**
     * Nueva regla del ML de Tercio:
     *
     * - Favorito H = -130: ambos lados -115
     * - Favorito H = -135: favorito tercio -120 y el otro lado -110
     * - Favorito H en -140: favorito tercio -125, contrario +105
     * - Favorito H en -150: favorito tercio -130, contrario +100
     * - Favorito H mas fuerte que -150: se toma la hembra del H
     *   (el positivo) y se convierte en macho en el tercio.
     *   El otro lado se arma con regla de 30.
     *
     * Nota:
     * Para el tramo de -140 tomamos -125 como default operativo.
     */
    fun calcularMlDesdeH(mlVisitH: String?, mlCasaH: String?): TercioMl? {
        val v = parseMlToken(mlVisitH) ?: return null
        val c = parseMlToken(mlCasaH) ?: return null

        val favHSide = when {
            v < 0 && c >= 0 -> "Visitante"
            c < 0 && v >= 0 -> "Casa"
            v < 0 && c < 0 -> if (kotlin.math.abs(v) >= kotlin.math.abs(c)) "Visitante" else "Casa"
            else -> return null
        }

        val dogHSide = if (favHSide == "Visitante") "Casa" else "Visitante"
        val favAbs = kotlin.math.abs(if (favHSide == "Visitante") v else c)
        val dogAbs = kotlin.math.abs(if (dogHSide == "Visitante") v else c)

        val (favT, dogT, tercioFavSide) = when {
            favAbs <= 130 -> Triple(-115, -115, favHSide)
            favAbs == 135 -> Triple(-120, -110, favHSide)
            favAbs <= 145 -> Triple(-125, +105, favHSide)
            favAbs <= 150 -> Triple(-130, +100, favHSide)
            else -> Triple(-dogAbs, +(dogAbs - 30), favHSide)
        }

        return if (tercioFavSide == "Visitante") {
            TercioMl(
                visit = fmtMl(favT),
                casa = fmtMl(dogT),
                favSide = "Visitante"
            )
        } else {
            TercioMl(
                visit = fmtMl(dogT),
                casa = fmtMl(favT),
                favSide = "Casa"
            )
        }
    }
}
