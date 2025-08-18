#import <React/RCTBridgeModule.h>

// BAC Live Activity Module
@interface RCT_EXTERN_MODULE(BACLiveActivity, NSObject)

RCT_EXTERN_METHOD(startActivity:(NSDictionary *)data
                  resolver:(RCTPromiseResolveBlock)resolver
                  rejecter:(RCTPromiseRejectBlock)rejecter)

RCT_EXTERN_METHOD(updateActivity:(NSString *)activityId
                  data:(NSDictionary *)data  
                  resolver:(RCTPromiseResolveBlock)resolver
                  rejecter:(RCTPromiseRejectBlock)rejecter)

RCT_EXTERN_METHOD(endActivity:(NSString *)activityId
                  resolver:(RCTPromiseResolveBlock)resolver
                  rejecter:(RCTPromiseRejectBlock)rejecter)

@end

// BAC Widget Module  
@interface RCT_EXTERN_MODULE(BACWidget, NSObject)

RCT_EXTERN_METHOD(updateWidget:(NSDictionary *)data
                  resolver:(RCTPromiseResolveBlock)resolver
                  rejecter:(RCTPromiseRejectBlock)rejecter)

RCT_EXTERN_METHOD(reloadAllTimelines:(RCTPromiseResolveBlock)resolver
                  rejecter:(RCTPromiseRejectBlock)rejecter)

@end
