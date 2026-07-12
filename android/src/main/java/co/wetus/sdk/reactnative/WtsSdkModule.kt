package co.wetus.sdk.reactnative

import android.net.Uri
import co.wetus.sdk.WtsDeepLink
import co.wetus.sdk.WtsOptions
import co.wetus.sdk.WtsRevenue
import co.wetus.sdk.WtsSdk
import co.wetus.sdk.WtsValue
import com.facebook.react.bridge.Promise
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReadableMap
import com.facebook.react.bridge.WritableNativeMap
import com.facebook.react.module.annotations.ReactModule
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.SupervisorJob
import kotlinx.coroutines.launch

@ReactModule(name = WtsSdkModule.NAME)
class WtsSdkModule(context: ReactApplicationContext) : NativeWtsSdkSpec(context) {
    private val scope = CoroutineScope(SupervisorJob() + Dispatchers.Main.immediate)

    override fun getName() = NAME

    override fun configure(appKey: String, apiBaseUrl: String?, promise: Promise) {
        runCatching {
            WtsSdk.configure(
                reactApplicationContext,
                appKey,
                WtsOptions(apiBaseUrl = apiBaseUrl ?: "https://api.wts.is/api/v1"),
            )
        }.fold({ promise.resolve(null) }, { promise.reject(ERROR_CODE, it) })
    }

    override fun handle(url: String, promise: Promise) = launch(promise) {
        WtsSdk.shared().handle(Uri.parse(url)).toWritableMap()
    }

    override fun getDeferredDeepLink(promise: Promise) = launch(promise) {
        WtsSdk.shared().getDeferredDeepLink()?.toWritableMap()
    }

    override fun track(
        eventKey: String,
        properties: ReadableMap,
        amount: String?,
        currency: String?,
        linkId: String?,
        promise: Promise,
    ) = launch(promise) {
        WtsSdk.shared().track(
            eventKey,
            properties.toHashMap().mapValues { (_, value) -> value.toWtsValue() },
            if (amount != null && currency != null) WtsRevenue(amount, currency) else null,
            linkId,
        )
        null
    }

    override fun flush(promise: Promise) = launch(promise) {
        WtsSdk.shared().flush()
        null
    }

    private fun launch(promise: Promise, block: suspend () -> Any?) {
        scope.launch { runCatching { block() }.fold(promise::resolve) { promise.reject(ERROR_CODE, it) } }
    }

    private fun Any?.toWtsValue(): WtsValue = when (this) {
        is Boolean -> WtsValue.of(this)
        is Number -> WtsValue.of(this)
        is String -> WtsValue.of(this)
        else -> throw IllegalArgumentException("Event properties must be scalar values.")
    }

    private fun WtsDeepLink.toWritableMap() = WritableNativeMap().apply {
        putString("path", path)
        putMap("parameters", WritableNativeMap().apply {
            parameters.forEach { (key, value) -> when (value) {
                is WtsValue.StringValue -> putString(key, value.value)
                is WtsValue.NumberValue -> putDouble(key, value.value)
                is WtsValue.BooleanValue -> putBoolean(key, value.value)
            } }
        })
        putString("linkId", linkId)
        putString("attributionId", attributionId)
        putBoolean("isDeferred", isDeferred)
    }

    companion object {
        const val NAME = "WtsSdk"
        private const val ERROR_CODE = "wts_sdk"
    }
}
