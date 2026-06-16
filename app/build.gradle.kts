import com.android.build.gradle.internal.api.ApkVariantOutputImpl

plugins {
    alias(libs.plugins.android.application)
    alias(libs.plugins.kotlin.android)
}


        android {
            namespace = "com.example.calculadoraparley"
            compileSdk = 36

            defaultConfig {
                applicationId = "com.example.calculadoraparley"
                minSdk = 26
                targetSdk = 36
                versionCode = 1
                versionName = "1.0"
                testInstrumentationRunner = "androidx.test.runner.AndroidJUnitRunner"
            }

            buildTypes {
                release {
                    isMinifyEnabled = false
                    proguardFiles(
                        getDefaultProguardFile("proguard-android-optimize.txt"),
                        "proguard-rules.pro"
                    )
                }
            }
            compileOptions {
                sourceCompatibility = JavaVersion.VERSION_11
                targetCompatibility = JavaVersion.VERSION_11
            }
            kotlinOptions {
                jvmTarget = "11"
            }
            buildFeatures {
                viewBinding = true
            }

            // 👇 Aquí el renombrado para Kotlin DSL
            applicationVariants.all {
                outputs.all {
                    if (this is ApkVariantOutputImpl) {
                        if (name.contains("debug")) {
                            outputFileName = "CalculadoraParley-debug.apk"
                        }
                        if (name.contains("release")) {
                            outputFileName = "CalculadoraParley-v${versionName}.apk"
                        }
                    }
                }
            }
        }

dependencies {
    implementation(libs.androidx.core.ktx)
    implementation(libs.androidx.appcompat)
    implementation(libs.material)
    implementation(libs.androidx.constraintlayout)
    implementation(libs.androidx.lifecycle.livedata.ktx)
    implementation(libs.androidx.lifecycle.viewmodel.ktx)
    implementation(libs.androidx.navigation.fragment.ktx)
    implementation(libs.androidx.navigation.ui.ktx)
    implementation(libs.firebase.crashlytics.buildtools)
    testImplementation(libs.junit)
    androidTestImplementation(libs.androidx.junit)
    androidTestImplementation(libs.androidx.espresso.core)
    implementation(libs.androidx.material3)

    // Para parsear JSON con Gson
    implementation(libs.gson)
}
