//
//  BacchusNativeModules.m
//  Bacchus
//
//  Created by Bacchus App on 2025.
//

#import <React/RCTBridgeModule.h>

@interface RCT_EXTERN_MODULE(BacchusNativeModules, NSObject)

// Widget methods
RCT_EXTERN_METHOD(updateWidget:(NSDictionary *)bacData
                  resolver:(RCTPromiseResolveBlock)resolve
                  rejecter:(RCTPromiseRejectBlock)reject)

RCT_EXTERN_METHOD(clearWidget:(RCTPromiseResolveBlock)resolve
                  rejecter:(RCTPromiseRejectBlock)reject)

// Live Activity methods
RCT_EXTERN_METHOD(startLiveActivity:(NSDictionary *)bacData
                  resolver:(RCTPromiseResolveBlock)resolve
                  rejecter:(RCTPromiseRejectBlock)reject)

RCT_EXTERN_METHOD(updateLiveActivity:(NSDictionary *)bacData
                  resolver:(RCTPromiseResolveBlock)resolve
                  rejecter:(RCTPromiseRejectBlock)reject)

RCT_EXTERN_METHOD(endLiveActivity:(RCTPromiseResolveBlock)resolve
                  rejecter:(RCTPromiseRejectBlock)reject)

@end
