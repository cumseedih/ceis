package io.github.ceis.ui.newsession

import android.content.Context
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.serialization.Serializable
import kotlinx.serialization.encodeToString
import kotlinx.serialization.json.Json

enum class NetworkAccess { TRUSTED, NONE, FULL, CUSTOM }

@Serializable
data class CeisEnvironment(
    val id: String,
    val name: String,
    val networkAccess: NetworkAccess,
    val envVars: String = "",
    val provider: String = "Anthropic cloud",
)

object EnvironmentStore {
    private const val PREFS = "ceis_environments"
    private const val KEY_LIST = "environments"
    private const val KEY_SEL = "selected"

    private val _environments = MutableStateFlow<List<CeisEnvironment>>(emptyList())
    val environments: StateFlow<List<CeisEnvironment>> = _environments.asStateFlow()

    private val _selected = MutableStateFlow<String?>(null)
    val selectedId: StateFlow<String?> = _selected.asStateFlow()

    private val json = Json { ignoreUnknownKeys = true }

    fun init(context: Context) {
        val prefs = context.getSharedPreferences(PREFS, Context.MODE_PRIVATE)
        val raw = prefs.getString(KEY_LIST, null)
        val list: List<CeisEnvironment>? = raw?.let {
            runCatching { json.decodeFromString<List<CeisEnvironment>>(it) }.getOrNull()
        }
        _environments.value = list ?: listOf(
            CeisEnvironment(
                id = "default",
                name = "Default",
                networkAccess = NetworkAccess.TRUSTED,
                provider = "Anthropic cloud",
            )
        )
        _selected.value = prefs.getString(KEY_SEL, _environments.value.firstOrNull()?.id)
    }

    fun save(context: Context, env: CeisEnvironment) {
        val current = _environments.value.toMutableList()
        val idx = current.indexOfFirst { it.id == env.id }
        if (idx >= 0) current[idx] = env else current.add(env)
        _environments.value = current
        context.getSharedPreferences(PREFS, Context.MODE_PRIVATE).edit()
            .putString(KEY_LIST, json.encodeToString(current)).apply()
    }

    fun select(context: Context, id: String) {
        _selected.value = id
        context.getSharedPreferences(PREFS, Context.MODE_PRIVATE).edit()
            .putString(KEY_SEL, id).apply()
    }

    fun selected(): CeisEnvironment? =
        _environments.value.firstOrNull { it.id == _selected.value }
}
