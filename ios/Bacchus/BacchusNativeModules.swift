import Foundation
import WidgetKit
import ActivityKit
import React

// MARK: - Widget Native Module
@objc(BacchusNativeModules)
class BacchusNativeModules: NSObject {
    
    @objc
    static func requiresMainQueueSetup() -> Bool {
        return false
    }
    
    // MARK: - Widget Methods
    @objc
    func updateWidget(_ data: NSDictionary, resolver resolve: @escaping RCTPromiseResolveBlock, rejecter reject: @escaping RCTPromiseRejectBlock) {
        guard let userDefaults = UserDefaults(suiteName: "group.com.bacchusapp.app.widget") else {
            reject("WIDGET_ERROR", "Cannot access app group", nil)
            return
        }
        
        let widgetData = [
            "currentBAC": data["currentBAC"] as? Double ?? 0.0,
            "sessionActive": data["sessionActive"] as? Bool ?? false,
            "userName": data["userName"] as? String ?? "User",
            "timeToSober": data["timeToSober"] as? String ?? "0min"
        ]
        
        do {
            let jsonData = try JSONSerialization.data(withJSONObject: widgetData)
            userDefaults.set(jsonData, forKey: "BacchusWidgetData")
            
            // Richiedi aggiornamento widget
            WidgetCenter.shared.reloadAllTimelines()
            
            print("✅ Widget data updated: BAC \(widgetData["currentBAC"] ?? 0.0)")
            resolve(true)
        } catch {
            print("❌ Widget data encoding error: \(error)")
            reject("WIDGET_ERROR", "Failed to update widget data", error)
        }
    }
    
    @objc
    func clearWidget(_ resolve: @escaping RCTPromiseResolveBlock, rejecter reject: @escaping RCTPromiseRejectBlock) {
        guard let userDefaults = UserDefaults(suiteName: "group.com.bacchusapp.app.widget") else {
            reject("WIDGET_ERROR", "Cannot access app group", nil)
            return
        }
        
        userDefaults.removeObject(forKey: "BacchusWidgetData")
        WidgetCenter.shared.reloadAllTimelines()
        
        print("🗑️ Widget data cleared")
        resolve(true)
    }
    
    // MARK: - Live Activity Methods
    @objc
    func startLiveActivity(_ data: NSDictionary, resolver resolve: @escaping RCTPromiseResolveBlock, rejecter reject: @escaping RCTPromiseRejectBlock) {
        
        if #available(iOS 16.1, *) {
            let attributes = BacchusActivityAttributes(
                userName: data["userName"] as? String ?? "User"
            )
            
            let contentState = BacchusActivityAttributes.ContentState(
                currentBAC: data["currentBAC"] as? Double ?? 0.0,
                timeToSober: data["timeToSober"] as? String ?? "0min",
                targetBAC: data["targetBAC"] as? Double ?? 0.0,
                lastUpdated: Date()
            )
            
            do {
                let activity = try Activity<BacchusActivityAttributes>.request(
                    attributes: attributes,
                    content: .init(state: contentState, staleDate: nil),
                    pushType: nil
                )
                
                print("✅ Live Activity started: \(activity.id)")
                resolve(activity.id)
                
            } catch {
                print("❌ Live Activity start error: \(error)")
                reject("LIVE_ACTIVITY_ERROR", "Failed to start Live Activity", error)
            }
        } else {
            reject("LIVE_ACTIVITY_UNAVAILABLE", "Live Activities require iOS 16.1+", nil)
        }
    }
    
    @objc
    func updateLiveActivity(_ data: NSDictionary, resolver resolve: @escaping RCTPromiseResolveBlock, rejecter reject: @escaping RCTPromiseRejectBlock) {
        if #available(iOS 16.1, *) {
            let contentState = BacchusActivityAttributes.ContentState(
                currentBAC: data["currentBAC"] as? Double ?? 0.0,
                timeToSober: data["timeToSober"] as? String ?? "0min",
                targetBAC: data["targetBAC"] as? Double ?? 0.0,
                lastUpdated: Date()
            )
            
            Task {
                for activity in Activity<BacchusActivityAttributes>.activities {
                    await activity.update(.init(state: contentState, staleDate: nil))
                    print("✅ Live Activity updated: BAC \(contentState.currentBAC)")
                    break
                }
                resolve(true)
            }
        } else {
            reject("LIVE_ACTIVITY_UNAVAILABLE", "Live Activities require iOS 16.1+", nil)
        }
    }
    
    @objc
    func endLiveActivity(_ resolve: @escaping RCTPromiseResolveBlock, rejecter reject: @escaping RCTPromiseRejectBlock) {
        if #available(iOS 16.1, *) {
            Task {
                for activity in Activity<BacchusActivityAttributes>.activities {
                    await activity.end(nil, dismissalPolicy: .immediate)
                    print("⏹️ Live Activity ended")
                    break
                }
                resolve(true)
            }
        } else {
            reject("LIVE_ACTIVITY_UNAVAILABLE", "Live Activities require iOS 16.1+", nil)
        }
    }
}
