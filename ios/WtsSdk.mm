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
    __weak WtsSdk *weakSelf = self;
    _core.onExperienceAvailable = ^(NSDictionary *experience) {
      dispatch_async(dispatch_get_main_queue(), ^{
        [weakSelf emitOnExperienceAvailable:experience];
      });
    };
    _core.onExperienceAction = ^(NSDictionary *payload) {
      dispatch_async(dispatch_get_main_queue(), ^{
        [weakSelf emitOnExperienceAction:payload];
      });
    };
  }
  return self;
}

- (void)configure:(NSString *)appKey
       apiBaseUrl:(NSString * _Nullable)apiBaseUrl
  collectorBaseUrl:(NSString * _Nullable)collectorBaseUrl
 experienceOptions:(NSDictionary *)experienceOptions
          resolve:(RCTPromiseResolveBlock)resolve
           reject:(RCTPromiseRejectBlock)reject {
  [_core configure:appKey
         apiBaseUrl:apiBaseUrl
   collectorBaseUrl:collectorBaseUrl
  experienceOptions:experienceOptions
            resolve:resolve
             reject:reject];
}

- (void)screen:(NSString *)name
    properties:(NSDictionary *)properties
       resolve:(RCTPromiseResolveBlock)resolve
        reject:(RCTPromiseRejectBlock)reject {
  [_core screen:name properties:properties resolve:resolve reject:reject];
}

- (void)setExperienceConsent:(NSString *)consent
                     resolve:(RCTPromiseResolveBlock)resolve
                      reject:(RCTPromiseRejectBlock)reject {
  [_core setExperienceConsent:consent resolve:resolve reject:reject];
}

- (void)presentNextExperience:(RCTPromiseResolveBlock)resolve
                       reject:(RCTPromiseRejectBlock)reject {
  [_core presentNextExperience:resolve reject:reject];
}

- (void)dismissCurrentExperience:(RCTPromiseResolveBlock)resolve
                          reject:(RCTPromiseRejectBlock)reject {
  [_core dismissCurrentExperience:resolve reject:reject];
}

- (void)getExperienceDiagnostics:(RCTPromiseResolveBlock)resolve
                          reject:(RCTPromiseRejectBlock)reject {
  [_core getExperienceDiagnostics:resolve reject:reject];
}

- (void)acknowledgeExperienceRender:(NSString *)exposureId
                             resolve:(RCTPromiseResolveBlock)resolve
                              reject:(RCTPromiseRejectBlock)reject {
  [_core acknowledgeExperienceRender:exposureId resolve:resolve reject:reject];
}

- (void)acknowledgeExperienceImpression:(NSString *)exposureId
                                 resolve:(RCTPromiseResolveBlock)resolve
                                  reject:(RCTPromiseRejectBlock)reject {
  [_core acknowledgeExperienceImpression:exposureId resolve:resolve reject:reject];
}

- (void)reportExperienceAction:(NSString *)exposureId
                       actionId:(NSString *)actionId
                        resolve:(RCTPromiseResolveBlock)resolve
                         reject:(RCTPromiseRejectBlock)reject {
  [_core reportExperienceAction:exposureId actionId:actionId resolve:resolve reject:reject];
}

- (void)dismissExperience:(NSString *)exposureId
                   reason:(NSString *)reason
              failureCode:(NSString * _Nullable)failureCode
                  resolve:(RCTPromiseResolveBlock)resolve
                   reject:(RCTPromiseRejectBlock)reject {
  [_core dismissExperience:exposureId
                    reason:reason
               failureCode:failureCode
                   resolve:resolve
                    reject:reject];
}

- (void)joinTestSession:(NSString *)pairing
                 resolve:(RCTPromiseResolveBlock)resolve
                  reject:(RCTPromiseRejectBlock)reject {
  [_core joinTestSession:pairing resolve:resolve reject:reject];
}

- (void)leaveTestSession:(RCTPromiseResolveBlock)resolve
                  reject:(RCTPromiseRejectBlock)reject {
  [_core leaveTestSession:resolve reject:reject];
}

- (void)getTestSessionDiagnostics:(RCTPromiseResolveBlock)resolve
                           reject:(RCTPromiseRejectBlock)reject {
  [_core getTestSessionDiagnostics:resolve reject:reject];
}

- (void)probeTestSessionUrl:(NSString *)url
                    resolve:(RCTPromiseResolveBlock)resolve
                     reject:(RCTPromiseRejectBlock)reject {
  [_core probeTestSessionUrl:url resolve:resolve reject:reject];
}

- (void)runTestSessionProbes:(RCTPromiseResolveBlock)resolve
                      reject:(RCTPromiseRejectBlock)reject {
  [_core runTestSessionProbes:resolve reject:reject];
}

- (void)reportTestSessionExperienceInteraction:(NSString *)interaction
                                       resolve:(RCTPromiseResolveBlock)resolve
                                        reject:(RCTPromiseRejectBlock)reject {
  [_core reportTestSessionExperienceInteraction:interaction resolve:resolve reject:reject];
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

- (void)setProfileConsent:(BOOL)granted
                  resolve:(RCTPromiseResolveBlock)resolve
                   reject:(RCTPromiseRejectBlock)reject {
  [_core setProfileConsent:granted resolve:resolve reject:reject];
}

- (void)identify:(NSString *)externalUserId
      attributes:(NSDictionary *)attributes
         resolve:(RCTPromiseResolveBlock)resolve
          reject:(RCTPromiseRejectBlock)reject {
  [_core identify:externalUserId attributes:attributes resolve:resolve reject:reject];
}

- (void)updateUser:(NSDictionary *)set
           setOnce:(NSDictionary *)setOnce
             unset:(NSArray<NSString *> *)unset
         increment:(NSDictionary *)increment
           resolve:(RCTPromiseResolveBlock)resolve
            reject:(RCTPromiseRejectBlock)reject {
  [_core updateUser:set
            setOnce:setOnce
              unset:unset
          increment:increment
            resolve:resolve
             reject:reject];
}

- (void)setReportedAttribution:(NSString *)source
                        medium:(NSString * _Nullable)medium
                      campaign:(NSString * _Nullable)campaign
                   externalRef:(NSString * _Nullable)externalRef
                       resolve:(RCTPromiseResolveBlock)resolve
                        reject:(RCTPromiseRejectBlock)reject {
  [_core setReportedAttribution:source
                         medium:medium
                       campaign:campaign
                    externalRef:externalRef
                        resolve:resolve
                         reject:reject];
}

- (void)resetIdentity:(RCTPromiseResolveBlock)resolve
               reject:(RCTPromiseRejectBlock)reject {
  [_core resetIdentity:resolve reject:reject];
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
