#import <React/RCTBridgeModule.h>

// MARK: - Widget Module Bridge
@interface RCT_EXTERN_MODULE(BacchusWidgetModule, NSObject)

RCT_EXTERN_METHOD(updateWidget:(NSDictionary *)data)
RCT_EXTERN_METHOD(clearWidgets)

@end

// MARK: - Live Activity Module Bridge  
@interface RCT_EXTERN_MODULE(BacchusLiveActivityModule, NSObject)

RCT_EXTERN_METHOD(startActivity:(NSDictionary *)data
                  resolver:(RCTPromiseResolveBlock)resolve
                  rejecter:(RCTPromiseRejectBlock)reject)

RCT_EXTERN_METHOD(updateActivity:(NSString *)activityId
                  data:(NSDictionary *)data)

RCT_EXTERN_METHOD(endActivity:(NSString *)activityId)

@end
