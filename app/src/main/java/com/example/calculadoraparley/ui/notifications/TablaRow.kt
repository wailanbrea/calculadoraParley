package com.example.calculadoraparley.ui.notifications

data class TablaRow(
    val tipo: String,
    val hora: String,
    val equipos: List<String>,          // [visit, casa]
    val ml: List<String>,               // [visit, casa] JC
    val rl: List<String> = emptyList(),
    val total: String = "",
    val solo: List<String> = emptyList(),   // [visit, casa]
    val pa: List<String> = emptyList(),     // [visit, casa]
    val sino: List<String> = emptyList(),   // [Sí, No]
    val tipoSino: String? = null,           // "O" | "U" | "P"
    val lineaSino: String? = null,          // ej: "-115"
    val paLineaCasa: String? = null,        // token ML 1H casa para PA
    val paLineaVisit: String? = null,       // token ML 1H visit para PA

    // 1ª mitad (H) para TERCIO
    val hTotal: Double? = null,             // p.ej. 4.5
    val hTipo: String? = null,              // "O" | "U" | "PK"
    val hLinea: String? = null,             // p.ej. "-115"

    // Resultados TERCIO (opcional, para futuro)
    val tercioMl: List<String?> = emptyList(), // [visit, casa]
    val tercio: Double? = null,
    val tercioTipo: String? = null,           // "O" | "U" | "PK" | ""
    val tercioLinea: String? = null,          // p.ej. "-130"

    val rl_total: List<String>? = null
)
