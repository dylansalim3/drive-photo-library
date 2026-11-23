package com.dylan.drivephotolibrary.data.network

import android.content.Context
import android.content.SharedPreferences
import okhttp3.Cookie
import okhttp3.CookieJar
import okhttp3.HttpUrl
import java.util.concurrent.ConcurrentHashMap

class PersistentCookieJar(context: Context) : CookieJar {
    private val prefs: SharedPreferences =
        context.getSharedPreferences("drive_session_cookies", Context.MODE_PRIVATE)
    private val memoryStore = ConcurrentHashMap<String, MutableMap<String, Cookie>>()

    init {
        // Load persisted cookies on startup
        prefs.all.forEach { (key, value) ->
            if (value is String) {
                // key format: host|cookieName
                val parts = key.split("|", limit = 2)
                if (parts.size == 2) {
                    val host = parts[0]
                    val cookie = parseCookieString(host, value)
                    if (cookie != null && !cookie.hasExpired()) {
                        memoryStore.getOrPut(host) { ConcurrentHashMap() }[cookie.name] = cookie
                    }
                }
            }
        }
    }

    override fun saveFromResponse(url: HttpUrl, cookies: List<Cookie>) {
        val host = url.host
        val hostCookies = memoryStore.getOrPut(host) { ConcurrentHashMap() }
        val editor = prefs.edit()

        cookies.forEach { cookie ->
            hostCookies[cookie.name] = cookie
            val prefKey = "$host|${cookie.name}"
            if (cookie.hasExpired()) {
                editor.remove(prefKey)
                hostCookies.remove(cookie.name)
            } else {
                editor.putString(prefKey, serializeCookie(cookie))
            }
        }
        editor.apply()
    }

    override fun loadForRequest(url: HttpUrl): List<Cookie> {
        val host = url.host
        val hostCookies = memoryStore[host] ?: return emptyList()
        val validCookies = mutableListOf<Cookie>()
        val editor = prefs.edit()
        var hasRemoved = false

        hostCookies.values.forEach { cookie ->
            if (cookie.hasExpired()) {
                hostCookies.remove(cookie.name)
                editor.remove("$host|${cookie.name}")
                hasRemoved = true
            } else {
                validCookies.add(cookie)
            }
        }

        if (hasRemoved) {
            editor.apply()
        }

        return validCookies
    }

    fun clear() {
        memoryStore.clear()
        prefs.edit().clear().apply()
    }

    private fun serializeCookie(cookie: Cookie): String {
        return "${cookie.value}|${cookie.expiresAt}|${cookie.domain}|${cookie.path}|${cookie.secure}|${cookie.httpOnly}"
    }

    private fun parseCookieString(host: String, str: String): Cookie? {
        val parts = str.split("|")
        if (parts.size < 6) return null
        return try {
            val builder = Cookie.Builder()
                .name(parts[0].let { host }) // fallback name parsed from key
                .value(parts[0])
                .expiresAt(parts[1].toLongOrNull() ?: System.currentTimeMillis() + 86400000)
                .domain(parts[2])
                .path(parts[3])
            if (parts[4].toBoolean()) builder.secure()
            if (parts[5].toBoolean()) builder.httpOnly()
            builder.build()
        } catch (_: Exception) {
            null
        }
    }

    private fun Cookie.hasExpired(): Boolean {
        return expiresAt < System.currentTimeMillis()
    }
}
