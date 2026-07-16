package co.wetus.sdk.reactnative

import android.net.Uri
import co.wetus.sdk.WtsDeepLink
import co.wetus.sdk.WtsOptions
import co.wetus.sdk.WtsProfileConsent
import co.wetus.sdk.WtsRevenue
import co.wetus.sdk.WtsReportedAttribution
import co.wetus.sdk.WtsSdk
import co.wetus.sdk.WtsSdkException
import co.wetus.sdk.WtsUserUpdate
import co.wetus.sdk.WtsUserValue
import co.wetus.sdk.WtsValue
import com.facebook.react.bridge.Promise
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReadableArray
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
        }.fold({ promise.resolve(null) }, { promise.reject(it.wtsCode(), it) })
    }

    override fun handle(url: String, promise: Promise) = launch(promise) {
        WtsSdk.shared().handle(Uri.parse(url)).toWritableMap()
    }

    override fun getDeferredDeepLink(promise: Promise) = launch(promise) {
        WtsSdk.shared().getDeferredDeepLink()?.toWritableMap()
    }

    override fun setProfileConsent(granted: Boolean, promise: Promise) {
        runCatching {
            WtsSdk.shared().setProfileConsent(
                if (granted) WtsProfileConsent.GRANTED else WtsProfileConsent.DENIED,
            )
        }.fold({ promise.resolve(null) }, { promise.reject(it.wtsCode(), it) })
    }

    override fun identify(
        externalUserId: String,
        attributes: ReadableMap,
        promise: Promise,
    ) = launch(promise) {
        WtsSdk.shared().identify(
            externalUserId,
            attributes.toHashMap().mapValues { (_, value) -> value.toWtsUserValue() },
        )
        null
    }

    override fun updateUser(
        set: ReadableMap,
        setOnce: ReadableMap,
        unset: ReadableArray,
        increment: ReadableMap,
        promise: Promise,
    ) = launch(promise) {
        WtsSdk.shared().updateUser(
            WtsUserUpdate(
                set = set.toHashMap().mapValues { (_, value) -> value.toWtsUserValue() },
                setOnce = setOnce.toHashMap()
                    .mapValues { (_, value) -> value.toWtsUserValue() },
                unset = unset.toArrayList().map { requireNotNull(it) as String },
                increment = increment.toHashMap()
                    .mapValues { (_, value) -> (value as Number).toDouble() },
            ),
        )
        null
    }

    override fun setReportedAttribution(
        source: String,
        medium: String?,
        campaign: String?,
        externalRef: String?,
        promise: Promise,
    ) = launch(promise) {
        WtsSdk.shared().setReportedAttribution(
            WtsReportedAttribution(source, medium, campaign, externalRef),
        )
        null
    }

    override fun resetIdentity(promise: Promise) = launch(promise) {
        WtsSdk.shared().resetIdentity()
        null
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
        scope.launch {
            runCatching { block() }
                .fold(promise::resolve) { promise.reject(it.wtsCode(), it) }
        }
    }

    private fun Any?.toWtsValue(): WtsValue = when (this) {
        is Boolean -> WtsValue.of(this)
        is Number -> WtsValue.of(this)
        is String -> WtsValue.of(this)
        else -> throw IllegalArgumentException("Event properties must be scalar values.")
    }

    private fun Any?.toWtsUserValue(): WtsUserValue {
        val encoded = this as? Map<*, *>
            ?: throw IllegalArgumentException("User attributes must use the typed bridge contract.")
        val kind = encoded["kind"] as? String
            ?: throw IllegalArgumentException("User attribute kind is missing.")
        val value = encoded["value"]
        return when (kind) {
            "string" -> WtsUserValue.of(value as? String ?: invalidProfileValue())
            "number" -> WtsUserValue.of(value as? Number ?: invalidProfileValue())
            "boolean" -> WtsUserValue.of(value as? Boolean ?: invalidProfileValue())
            "date" -> WtsUserValue.date(value as? String ?: invalidProfileValue())
            "string_array" -> WtsUserValue.strings(
                (value as? List<*>)?.map {
                    it as? String ?: invalidProfileValue()
                } ?: invalidProfileValue(),
            )
            else -> invalidProfileValue()
        }
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
        private fun invalidProfileValue(): Nothing =
            throw IllegalArgumentException("The typed user attribute bridge payload is invalid.")
    }
}

private fun Throwable.wtsCode(): String =
    (this as? WtsSdkException)?.code ?: "NATIVE_ERROR"
