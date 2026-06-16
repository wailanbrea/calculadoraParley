package com.example.calculadoraparley.ui.notifications

data class JuegoSoloAnalizado(
    val row: TablaRow, // deja el original para mostrar textos y ML/PA/H tal cual vienen

    // SOLO
    val soloCalcCasa: String,
    val soloCalcVisit: String,
    val coincideCasa: Boolean,
    val coincideVisit: Boolean,
    val soloJsonVisit: String? = null,
    val soloJsonCasa: String? = null,

    // SI/NO (JC)
    val sinoCalcSi: Int? = null,
    val sinoCalcNo: Int? = null,
    val coincideSi: Boolean = false,
    val coincideNo: Boolean = false,
    val sinoJsonSi: String? = null,
    val sinoJsonNo: String? = null,

    // PA (1ª mitad)
    val paCalcCasa: Int? = null,
    val paCalcVisit: Int? = null,
    val coincidePaCasa: Boolean = false,
    val coincidePaVisit: Boolean = false,
    val paJsonVisit: String? = null,
    val paJsonCasa: String? = null,

    // TERCIO - JSON del feed
    val tercioJsonMlVisit: String? = null,
    val tercioJsonMlCasa: String? = null,
    val tercioJsonTotal: Double? = null,
    val tercioJsonTipo: String? = null,
    val tercioJsonLinea: String? = null,

    // TERCIO - calculado
    val tercioMlCalcVisit: String? = null,
    val tercioMlCalcCasa: String? = null,
    val tercioFavCalc: String? = null,
    val tercioOuCalcTotal: Double? = null,
    val tercioOuCalcTipo: String? = null,
    val tercioOuCalcLinea: String? = null,

    // Otros
    val diagnostico: String = "",
    val favorito: String = ""
)
