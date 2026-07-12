import Foundation
import React
import WtsSDK

@objcMembers
public final class WtsSdkNativeCore: NSObject {
    public func configure(
        _ appKey: String,
        apiBaseUrl: String?,
        resolve: @escaping RCTPromiseResolveBlock,
        reject: @escaping RCTPromiseRejectBlock
    ) {
        Task {
            do {
                var options = WtsOptions()
                if let apiBaseUrl, let url = URL(string: apiBaseUrl) { options.apiBaseURL = url }
                try await WtsSDK.shared.configure(appKey: appKey, options: options)
                resolve(nil)
            } catch { reject("wts_sdk", error.localizedDescription, error) }
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
            } catch { reject("wts_sdk", error.localizedDescription, error) }
        }
    }

    public func getDeferredDeepLink(
        _ resolve: @escaping RCTPromiseResolveBlock,
        reject: @escaping RCTPromiseRejectBlock
    ) {
        Task { resolve(await WtsSDK.shared.getDeferredDeepLink()?.dictionary) }
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
            } catch { reject("wts_sdk", error.localizedDescription, error) }
        }
    }

    public func flush(_ resolve: @escaping RCTPromiseResolveBlock, reject: @escaping RCTPromiseRejectBlock) {
        Task { await WtsSDK.shared.flush(); resolve(nil) }
    }
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
