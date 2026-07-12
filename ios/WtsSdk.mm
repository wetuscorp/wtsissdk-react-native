#import "WtsSdk.h"
#import "WtsSdkReactNative-Swift.h"

@implementation WtsSdk {
  WtsSdkNativeCore *_core;
}

RCT_EXPORT_MODULE()

+ (BOOL)requiresMainQueueSetup {
  return NO;
}

- (instancetype)init {
  self = [super init];
  if (self) {
    _core = [WtsSdkNativeCore new];
  }
  return self;
}

- (void)configure:(NSString *)appKey
       apiBaseUrl:(NSString * _Nullable)apiBaseUrl
          resolve:(RCTPromiseResolveBlock)resolve
           reject:(RCTPromiseRejectBlock)reject {
  [_core configure:appKey apiBaseUrl:apiBaseUrl resolve:resolve reject:reject];
}

- (void)handle:(NSString *)url
       resolve:(RCTPromiseResolveBlock)resolve
        reject:(RCTPromiseRejectBlock)reject {
  [_core handle:url resolve:resolve reject:reject];
}

- (void)getDeferredDeepLink:(RCTPromiseResolveBlock)resolve
                     reject:(RCTPromiseRejectBlock)reject {
  [_core getDeferredDeepLink:resolve reject:reject];
}

- (void)track:(NSString *)eventKey
   properties:(NSDictionary *)properties
       amount:(NSString * _Nullable)amount
     currency:(NSString * _Nullable)currency
       linkId:(NSString * _Nullable)linkId
      resolve:(RCTPromiseResolveBlock)resolve
       reject:(RCTPromiseRejectBlock)reject {
  [_core track:eventKey
      properties:properties
          amount:amount
        currency:currency
          linkId:linkId
         resolve:resolve
          reject:reject];
}

- (void)flush:(RCTPromiseResolveBlock)resolve reject:(RCTPromiseRejectBlock)reject {
  [_core flush:resolve reject:reject];
}

- (std::shared_ptr<facebook::react::TurboModule>)getTurboModule:
    (const facebook::react::ObjCTurboModule::InitParams &)params {
  return std::make_shared<facebook::react::NativeWtsSdkSpecJSI>(params);
}

@end
