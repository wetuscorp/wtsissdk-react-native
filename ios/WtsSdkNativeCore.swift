import Foundation
import React
import WtsSDK

@objcMembers
public final class WtsSdkNativeCore: NSObject {
    public var onExperienceAvailable: (([String: Any]) -> Void)?
    public var onExperienceAction: (([String: Any]) -> Void)?

    public func configure(
        _ appKey: String,
        apiBaseUrl: String?,
        collectorBaseUrl: String?,
        experienceOptions: [String: Any],
        resolve: @escaping RCTPromiseResolveBlock,
        reject: @escaping RCTPromiseRejectBlock
    ) {
        Task {
            do {
                var options = WtsOptions()
                if let apiBaseUrl, let url = URL(string: apiBaseUrl) { options.apiBaseURL = url }
                if let collectorBaseUrl, let url = URL(string: collectorBaseUrl) {
                    options.collectorBaseURL = url
                }
                options.experiences = WtsExperienceOptions(
                    enabled: experienceOptions["enabled"] as? Bool ?? false,
                    renderMode: experienceOptions["renderMode"] as? String == "manual"
                        ? .manual
                        : .automatic,
                    allowedInternalRoutes: Set(
                        experienceOptions["allowedInternalRoutes"] as? [String] ?? []
                    ),
                    allowedCallbackKeys: Set(
                        experienceOptions["allowedCallbackKeys"] as? [String] ?? []
                    ),
                    allowedDeepLinkHosts: Set(
                        experienceOptions["allowedDeepLinkHosts"] as? [String] ?? []
                    ),
                    allowedDeepLinkSchemes: Set(
                        experienceOptions["allowedDeepLinkSchemes"] as? [String] ?? []
                    ),
                    allowedWebOrigins: Set(
                        experienceOptions["allowedWebOrigins"] as? [String] ?? []
                    )
                )
                try await WtsSDK.shared.configure(appKey: appKey, options: options)
                await WtsSDK.shared.onExperienceAvailable { [weak self] experience in
                    self?.onExperienceAvailable?(experience.dictionary)
                }
                await WtsSDK.shared.onExperienceAction { [weak self] experience, action in
                    self?.onExperienceAction?([
                        "experience": experience.dictionary,
                        "action": action.dictionary,
                    ])
                    return false
                }
                resolve(nil)
            } catch { rejectWts(error, reject) }
        }
    }

    public func handle(
        _ url: String,
        resolve: @escaping RCTPromiseResolveBlock,
        reject: @escaping RCTPromiseRejectBlock
    ) {
        Task {
            do {
                guard let url = URL(string: url) else { throw WtsSDKError.invalidURL(fallbackURL: nil) }
                resolve(try await WtsSDK.shared.handle(url: url).dictionary)
            } catch { rejectWts(error, reject) }
        }
    }

    public func getDeferredDeepLink(
        _ resolve: @escaping RCTPromiseResolveBlock,
        reject: @escaping RCTPromiseRejectBlock
    ) {
        Task { resolve(await WtsSDK.shared.getDeferredDeepLink()?.dictionary) }
    }

    public func setProfileConsent(
        _ granted: Bool,
        resolve: @escaping RCTPromiseResolveBlock,
        reject: @escaping RCTPromiseRejectBlock
    ) {
        Task {
            do {
                try await WtsSDK.shared.setProfileConsent(granted ? .granted : .denied)
                resolve(nil)
            } catch { rejectWts(error, reject) }
        }
    }

    public func identify(
        _ externalUserId: String,
        attributes: [String: Any],
        resolve: @escaping RCTPromiseResolveBlock,
        reject: @escaping RCTPromiseRejectBlock
    ) {
        Task {
            do {
                try await WtsSDK.shared.identify(
                    externalUserId,
                    attributes: try attributes.mapValues(WtsUserValue.init(nativeValue:))
                )
                resolve(nil)
            } catch { rejectWts(error, reject) }
        }
    }

    public func updateUser(
        _ set: [String: Any],
        setOnce: [String: Any],
        unset: [String],
        increment: [String: NSNumber],
        resolve: @escaping RCTPromiseResolveBlock,
        reject: @escaping RCTPromiseRejectBlock
    ) {
        Task {
            do {
                try await WtsSDK.shared.updateUser(
                    WtsUserUpdate(
                        set: try set.mapValues(WtsUserValue.init(nativeValue:)),
                        setOnce: try setOnce.mapValues(WtsUserValue.init(nativeValue:)),
                        unset: unset,
                        increment: increment.mapValues(\.doubleValue)
                    )
                )
                resolve(nil)
            } catch { rejectWts(error, reject) }
        }
    }

    public func setReportedAttribution(
        _ source: String,
        medium: String?,
        campaign: String?,
        externalRef: String?,
        resolve: @escaping RCTPromiseResolveBlock,
        reject: @escaping RCTPromiseRejectBlock
    ) {
        Task {
            do {
                try await WtsSDK.shared.setReportedAttribution(
                    WtsReportedAttribution(
                        source: source,
                        medium: medium,
                        campaign: campaign,
                        externalRef: externalRef
                    )
                )
                resolve(nil)
            } catch { rejectWts(error, reject) }
        }
    }

    public func resetIdentity(
        _ resolve: @escaping RCTPromiseResolveBlock,
        reject: @escaping RCTPromiseRejectBlock
    ) {
        Task {
            do {
                try await WtsSDK.shared.resetIdentity()
                resolve(nil)
            } catch { rejectWts(error, reject) }
        }
    }

    public func track(
        _ eventKey: String,
        properties: [String: Any],
        amount: String?,
        currency: String?,
        linkId: String?,
        resolve: @escaping RCTPromiseResolveBlock,
        reject: @escaping RCTPromiseRejectBlock
    ) {
        Task {
            do {
                try await WtsSDK.shared.track(
                    eventKey: eventKey,
                    properties: try properties.mapValues(WtsValue.init(nativeValue:)),
                    revenue: amount.flatMap { value in currency.map { WtsRevenue(amount: value, currency: $0) } },
                    linkId: linkId
                )
                resolve(nil)
            } catch { rejectWts(error, reject) }
        }
    }

    public func screen(
        _ name: String,
        properties: [String: Any],
        resolve: @escaping RCTPromiseResolveBlock,
        reject: @escaping RCTPromiseRejectBlock
    ) {
        Task {
            do {
                try await WtsSDK.shared.screen(
                    name,
                    properties: try properties.mapValues(WtsValue.init(nativeValue:))
                )
                resolve(nil)
            } catch { rejectWts(error, reject) }
        }
    }

    public func setExperienceConsent(
        _ consent: String,
        resolve: @escaping RCTPromiseResolveBlock,
        reject: @escaping RCTPromiseRejectBlock
    ) {
        Task {
            do {
                guard let value = WtsExperienceConsent(rawValue: consent) else {
                    throw WtsSDKError.invalidEvent(reason: "Invalid experience consent.")
                }
                let result = try await WtsSDK.shared.setExperienceConsent(value)
                resolve(String(describing: result))
            } catch { rejectWts(error, reject) }
        }
    }

    public func presentNextExperience(
        _ resolve: @escaping RCTPromiseResolveBlock,
        reject: @escaping RCTPromiseRejectBlock
    ) {
        Task { resolve(await WtsSDK.shared.presentNextExperience() != nil) }
    }

    public func dismissCurrentExperience(
        _ resolve: @escaping RCTPromiseResolveBlock,
        reject: @escaping RCTPromiseRejectBlock
    ) {
        Task {
            await WtsSDK.shared.dismissCurrentExperience()
            resolve(true)
        }
    }

    public func getExperienceDiagnostics(
        _ resolve: @escaping RCTPromiseResolveBlock,
        reject: @escaping RCTPromiseRejectBlock
    ) {
        Task {
            let value = await WtsSDK.shared.getExperienceDiagnostics()
            resolve([
                "enabled": value.enabled,
                "consent": value.consent.rawValue,
                "queued": value.queued,
                "presenting": value.presenting,
                "testDeviceToken": value.testDeviceToken,
                "lastErrorCode": value.lastErrorCode as Any,
            ])
        }
    }

    public func joinTestSession(
        _ pairing: String,
        resolve: @escaping RCTPromiseResolveBlock,
        reject: @escaping RCTPromiseRejectBlock
    ) {
        Task {
            do {
                let result = await WtsSDK.shared.joinTestSession(
                    try WtsTestSessionPairing.parse(pairing),
                    sdkFamily: .reactNative
                )
                resolve(result.dictionary)
            } catch { rejectWts(error, reject) }
        }
    }

    public func leaveTestSession(
        _ resolve: @escaping RCTPromiseResolveBlock,
        reject: @escaping RCTPromiseRejectBlock
    ) {
        Task { resolve(await WtsSDK.shared.leaveTestSession()) }
    }

    public func getTestSessionDiagnostics(
        _ resolve: @escaping RCTPromiseResolveBlock,
        reject: @escaping RCTPromiseRejectBlock
    ) {
        Task { resolve(await WtsSDK.shared.getTestSessionDiagnostics().dictionary) }
    }

    public func probeTestSessionUrl(
        _ url: String,
        resolve: @escaping RCTPromiseResolveBlock,
        reject: @escaping RCTPromiseRejectBlock
    ) {
        Task {
            do {
                guard let value = URL(string: url) else {
                    throw WtsSDKError.invalidURL(fallbackURL: nil)
                }
                resolve(try await WtsSDK.shared.probeTestSessionURL(value).dictionary)
            } catch { rejectWts(error, reject) }
        }
    }

    public func runTestSessionProbes(
        _ resolve: @escaping RCTPromiseResolveBlock,
        reject: @escaping RCTPromiseRejectBlock
    ) {
        Task {
            do { resolve(try await WtsSDK.shared.runTestSessionProbes().dictionary) }
            catch { rejectWts(error, reject) }
        }
    }

    public func reportTestSessionExperienceInteraction(
        _ interaction: String,
        resolve: @escaping RCTPromiseResolveBlock,
        reject: @escaping RCTPromiseRejectBlock
    ) {
        Task {
            let parsed: WtsTestSessionExperienceInteraction? = interaction == "impression"
                ? .impression
                : interaction == "action" ? .action : nil
            guard let value = parsed else {
                reject("INVALID_TEST_EXPERIENCE_INTERACTION", "Unsupported test Experience interaction.", nil)
                return
            }
            resolve(await WtsSDK.shared.reportTestSessionExperienceInteraction(value))
        }
    }

    public func flush(_ resolve: @escaping RCTPromiseResolveBlock, reject: @escaping RCTPromiseRejectBlock) {
        Task { await WtsSDK.shared.flush(); resolve(nil) }
    }
}

private func rejectWts(_ error: Error, _ reject: RCTPromiseRejectBlock) {
    guard let error = error as? WtsSDKError else {
        reject("NATIVE_ERROR", error.localizedDescription, error)
        return
    }
    reject(error.code, error.localizedDescription, error)
}

private extension WtsDeepLink {
    var dictionary: [String: Any] {
        [
            "path": path,
            "parameters": parameters.mapValues(\.foundationValue),
            "linkId": linkId,
            "attributionId": attributionId,
            "isDeferred": isDeferred,
        ]
    }
}

private extension WtsExperience {
    var dictionary: [String: Any] {
        var result: [String: Any] = [
            "campaignId": campaignId,
            "campaignVersionId": campaignVersionId,
            "assignmentId": assignmentId,
            "variantId": variantId,
            "exposureId": exposureId,
            "placement": placement.rawValue,
            "priority": priority,
            "translations": content.translations.map { locale, value in
                var translation: [String: Any] = [
                    "locale": locale,
                    "title": value.title,
                    "description": value.description,
                ]
                if let action = value.primaryAction {
                    translation["primaryAction"] = action.dictionary
                }
                if let action = value.secondaryAction {
                    translation["secondaryAction"] = action.dictionary
                }
                return translation
            },
            "closeable": content.closeable,
            "themePreset": content.themePreset,
            "delaySeconds": content.delaySeconds,
        ]
        if let autoCloseSeconds = content.autoCloseSeconds {
            result["autoCloseSeconds"] = autoCloseSeconds
        }
        if let assetURL {
            result["assetUrl"] = assetURL.absoluteString
        }
        return result
    }
}

private extension WtsExperienceAction {
    var dictionary: [String: Any] {
        var result: [String: Any] = [
            "id": id,
            "label": label,
            "type": type.rawValue,
        ]
        if let target { result["target"] = target }
        return result
    }
}

private extension WtsTestSessionJoinResult {
    var dictionary: [String: Any] {
        var result: [String: Any] = [
            "accepted": accepted,
            "joined": joined,
            "compatible": compatible,
            "checks": checks.map(\.dictionary),
        ]
        if let requiredSDKVersion { result["requiredSdkVersion"] = requiredSDKVersion }
        if let sessionId { result["sessionId"] = sessionId }
        if let expiresAt { result["expiresAt"] = expiresAt }
        if let testProfileExternalUserId { result["testProfileExternalUserId"] = testProfileExternalUserId }
        if let errorCode { result["errorCode"] = errorCode }
        return result
    }
}

private extension WtsTestSessionDiagnostics {
    var dictionary: [String: Any] {
        var result: [String: Any] = [
            "joined": joined,
            "compatible": compatible,
            "checks": checks.map(\.dictionary),
            "pendingSignals": pendingSignals,
        ]
        if let sessionId { result["sessionId"] = sessionId }
        if let expiresAt { result["expiresAt"] = expiresAt }
        if let requiredSDKVersion { result["requiredSdkVersion"] = requiredSDKVersion }
        if let lastErrorCode { result["lastErrorCode"] = lastErrorCode }
        return result
    }
}

private extension WtsTestSessionCheck {
    var dictionary: [String: Any] {
        var result: [String: Any] = ["key": key, "status": status]
        if let code { result["code"] = code }
        if let message { result["message"] = message }
        return result
    }
}

private extension WtsTestSessionProbeLink {
    var dictionary: [String: Any] {
        [
            "id": id,
            "path": path,
            "parametersJson": testSessionJSONString(parameters.mapValues(\.foundationValue)),
        ]
    }
}

private extension WtsTestSessionProbeResult {
    var dictionary: [String: Any] {
        var result: [String: Any] = [
            "match": match,
            "status": status,
            "code": code,
            "originalUrl": originalURL.absoluteString,
            "fallbackUrl": fallbackURL.absoluteString,
        ]
        if let link { result["link"] = link.dictionary }
        return result
    }
}

private extension WtsTestSessionProbeRunResult {
    var dictionary: [String: Any] {
        var result: [String: Any] = [
            "accepted": accepted,
            "emitted": emitted,
            "skipped": skipped,
            "pendingSignals": pendingSignals,
        ]
        if let experienceDecision {
            result["experienceDecisionJson"] = testSessionJSONString(experienceDecision.dictionary)
        }
        return result
    }
}

private extension WtsTestSessionExperienceDecision {
    var dictionary: [String: Any] {
        [
            "outcome": outcome,
            "reason": reason ?? NSNull(),
            "testGrant": testGrant.map { ["fixtureId": $0.fixtureId, "expiresAt": $0.expiresAt] }
                ?? NSNull(),
            "decision": decision.map { campaign in
                [
                    "campaignId": campaign.campaignId,
                    "campaignVersionId": campaign.campaignVersionId,
                    "placement": campaign.placement,
                    "defaultLocale": campaign.defaultLocale,
                    "variant": campaign.variant.map { variant in
                        [
                            "id": variant.id,
                            "key": variant.key,
                            "content": variant.content.foundationValue,
                            "asset": variant.assetURL.map { ["url": $0.absoluteString] } ?? NSNull(),
                        ]
                    } ?? NSNull(),
                ]
            } ?? NSNull(),
        ]
    }
}

private extension WtsTestSessionJSONValue {
    var foundationValue: Any {
        switch self {
        case .object(let value): value.mapValues(\.foundationValue)
        case .array(let value): value.map(\.foundationValue)
        case .string(let value): value
        case .number(let value): value
        case .bool(let value): value
        case .null: NSNull()
        }
    }
}

private func testSessionJSONString(_ value: Any) -> String {
    guard JSONSerialization.isValidJSONObject(value),
          let data = try? JSONSerialization.data(withJSONObject: value, options: [.sortedKeys]),
          let text = String(data: data, encoding: .utf8)
    else { return "{}" }
    return text
}

private extension WtsValue {
    init(nativeValue: Any) throws {
        switch nativeValue {
        case let value as Bool: self = .boolean(value)
        case let value as NSNumber: self = .number(value.doubleValue)
        case let value as String: self = .string(value)
        default: throw WtsSDKError.invalidEvent(reason: "Event properties must be scalar values.")
        }
    }
}

private extension WtsUserValue {
    init(nativeValue: Any) throws {
        guard let encoded = nativeValue as? [String: Any],
              let kind = encoded["kind"] as? String,
              let value = encoded["value"] else {
            throw WtsSDKError.invalidProfile(
                reason: "User attributes must use the generated typed bridge contract."
            )
        }
        switch kind {
        case "string":
            guard let value = value as? String else { throw invalidProfileValue() }
            self = .string(value)
        case "number":
            guard let value = value as? NSNumber else { throw invalidProfileValue() }
            self = .number(value.doubleValue)
        case "boolean":
            guard let value = value as? Bool else { throw invalidProfileValue() }
            self = .boolean(value)
        case "date":
            guard let value = value as? String else { throw invalidProfileValue() }
            self = .date(value)
        case "string_array":
            guard let values = value as? [String] else { throw invalidProfileValue() }
            self = .stringArray(values)
        default:
            throw invalidProfileValue()
        }
    }
}

private func invalidProfileValue() -> WtsSDKError {
    .invalidProfile(reason: "The typed user attribute bridge payload is invalid.")
}
